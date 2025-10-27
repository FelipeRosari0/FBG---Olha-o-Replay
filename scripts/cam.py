import cv2
import time
import os
import threading
import pygame
import shutil
from collections import deque
from datetime import datetime
import psutil
from queue import Queue
import sys
import traceback
import numpy as np

# =========================
# CONFIGURAÇÕES
# =========================
SEGUNDOS = 30
DURACAO_PARTE = 10  # blocos temporários de 10s
PASTA_VIDEOS = r"D:"   # <<< ALTERE AQUI O LOCAL DE SALVAMENTO
PASTA_TEMP = r"C:\gravacao_quadras\videos_temp"       # <<< ALTERE AQUI O LOCAL TEMPORÁRIO
EXIBIR_TELA = False
REDUZ_RESOLUCAO = True
LARGURA_SAIDA = 1280
ALTURA_SAIDA = 720
TEMPO_EXPIRACAO_TEMP = 15 * 60  # <<< 15 minutos
INTERVALO_LIMPEZA = 60        # <<< limpeza a cada 60s

# =========================
# MODO TESTE (ignora joystick e pode usar captura dummy)
# Ative com variáveis de ambiente:
#  - MODO_TESTE=1 para ativar o modo de teste
#  - DUMMY_CAPTURE=1 para gerar frames sintéticos (sem RTSP)
#  - SEGUNDOS, DURACAO_PARTE para ajustar janela/partes
#  - AUTO_DISPARO_TESTE=1 para disparo automático após aquecimento
# =========================
MODO_TESTE = os.getenv("MODO_TESTE", "0") == "1"
DUMMY_CAPTURE = os.getenv("DUMMY_CAPTURE", "0") == "1"
AUTO_DISPARO_TESTE = os.getenv("AUTO_DISPARO_TESTE", "1") == "1"

# Permite sobrescrever janela/partes via env (útil no teste)
try:
    SEGUNDOS = int(os.getenv("SEGUNDOS", SEGUNDOS))
except Exception:
    pass
try:
    DURACAO_PARTE = int(os.getenv("DURACAO_PARTE", DURACAO_PARTE))
except Exception:
    pass

# =========================
# CONFIGURAÇÕES DA LOGO
# =========================
LOGO_PATH = r"C:\gravacao_quadras\logo.png"
LOGO_ESCALA = 0.18
LOGO_POSICAO = "inferior_direito"  # opções: "superior_esquerdo", "superior_direito", "inferior_esquerdo", "inferior_direito"

# =========================
# MAPEAMENTO DE BOTÕES
# =========================
QUADRAS = {
    9: [{"nome": "areia_descoberta", "url": "rtsp://admin:1a2b3c4d@192.168.1.131:554//cam/realmonitor?channel=1&subtype=0"}],
    8: [{"nome": "areia_coberta", "url": "rtsp://admin:1a2b3c4d@192.168.1.130:554//cam/realmonitor?channel=1&subtype=0"}],
    11: [{"nome": "futebol_lado_trilho", "url": "rtsp://admin:1a2b3c4d@192.168.1.129:554/Streaming/Channels/101"}],
    10: [
        {"nome": "futebol_lado_areia_meio_campo", "url": "rtsp://admin:1a2b3c4d@192.168.1.128:554/Streaming/Channels/101"},
        {"nome": "futebol_lado_areia_auxiliar_areia", "url": "rtsp://admin:1a2b3c4d@192.168.1.126:554//cam/realmonitor?channel=1&subtype=0"}
    ],
}
# Em modo teste, redireciona pastas para locais seguros dentro do projeto
if MODO_TESTE:
    PASTA_VIDEOS = os.path.join(os.getcwd(), "videos_test")
    PASTA_TEMP = os.path.join(os.getcwd(), "videos_temp_test")

# Permitir forçar captura por USB (webcam/virtual cam) via variável de ambiente
# Exemplos:
#  - USB_DEVICE=0 (índice do dispositivo)
#  - USB_DEVICE=video=DroidCam Source 3 (nome DirectShow)
USB_DEVICE_ENV = os.getenv("USB_DEVICE")
if USB_DEVICE_ENV is not None and USB_DEVICE_ENV != "":
    try:
        dev = int(USB_DEVICE_ENV)
    except Exception:
        dev = USB_DEVICE_ENV  # string, ex.: 'video=OBS Virtual Camera' ou 'video=DroidCam Source 3'
    QUADRAS = {
        10: [
            {"nome": "usb_phone", "url": dev}
        ]
    }
    print(f"🔌 Modo USB ativado via env USB_DEVICE={USB_DEVICE_ENV}")

try:
    os.makedirs(PASTA_VIDEOS, exist_ok=True)
except Exception:
    # Fallback local se caminho inválido (ex.: "D:")
    PASTA_VIDEOS = os.path.join(os.getcwd(), "videos")
    os.makedirs(PASTA_VIDEOS, exist_ok=True)

os.makedirs(PASTA_TEMP, exist_ok=True)

# =========================
# LIMPA TEMP ANTIGA
# =========================
def limpar_temp():
    agora = time.time()
    for f in os.listdir(PASTA_TEMP):
        caminho = os.path.join(PASTA_TEMP, f)
        try:
            if os.path.isfile(caminho):
                if agora - os.path.getmtime(caminho) > TEMPO_EXPIRACAO_TEMP:
                    os.remove(caminho)
        except:
            pass

# =========================
# INICIALIZAÇÃO PYGAME
# =========================
pygame.init()
pygame.joystick.init()

joysticks = [pygame.joystick.Joystick(i) for i in range(pygame.joystick.get_count())]
if not joysticks:
    if not MODO_TESTE:
        print("❌ Placa USB não está conectada!")
        input("Pressione ENTER para sair...")
        exit()
    else:
        controle = None
        print("🧪 Modo teste ativo: joystick ignorado. Use tecla 's' para salvar.")
else:
    controle = joysticks[0]
    controle.init()
    print(f"Placa USB: {controle.get_name()} ({controle.get_numbuttons()} botões)")

# =========================
# BUFFERS E THREADS
# =========================
fps_cameras = {}

arquivos_temp = {}
filas_salvamento = {}
salvando = {}
threads_salvamento = {}

for botao, lista_cams in QUADRAS.items():
    for cam in lista_cams:
        key = f"{botao}_{cam['nome']}"
        arquivos_temp[key] = deque(maxlen=max(5, SEGUNDOS // max(1, DURACAO_PARTE) + 3))
        filas_salvamento[key] = Queue()
        salvando[key] = False
        threads_salvamento[key] = []

# =========================
# FUNÇÃO DE CAPTURA
# =========================
def captura_camera(botao_nome, url, botao):
    backend = None
    # Se for dispositivo local (índice) ou string 'video=...'(DirectShow), use backend DSHOW
    if isinstance(url, int):
        backend = cv2.CAP_DSHOW
    elif isinstance(url, str) and url.lower().startswith("video="):
        backend = cv2.CAP_DSHOW

    if backend is not None:
        cap = cv2.VideoCapture(url, backend)
    else:
        # RTSP/HTTP/arquivo: backend padrão (geralmente FFMPEG)
        cap = cv2.VideoCapture(url)
    cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)

    if not cap.isOpened():
        print(f"❌ [{botao_nome}] Falha ao abrir câmera.")
        return

    fps_real = cap.get(cv2.CAP_PROP_FPS)
    if fps_real <= 0:
        fps_real = 30
    else:
        fps_real = round(fps_real)

    fps_cameras[botao_nome] = fps_real
    print(f"✅ [{botao_nome}] Conectado. FPS detectado: {fps_real:.2f}")

    largura = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    altura = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    if REDUZ_RESOLUCAO:
        largura, altura = LARGURA_SAIDA, ALTURA_SAIDA

    parte = 0
    out = None
    seg_t_inicio = None

    while True:
        ret, frame = cap.read()
        if not ret:
            print(f"⚠️ [{botao_nome}] Falha de leitura.")
            break

        if frame is None or len(frame.shape) == 2 or (len(frame.shape) == 3 and frame.shape[2] == 1):
            frame = cv2.cvtColor(frame, cv2.COLOR_GRAY2BGR)

        if REDUZ_RESOLUCAO:
            frame = cv2.resize(frame, (largura, altura))

        if out is None:
            parte += 1
            current_filename = os.path.join(PASTA_TEMP, f"{botao_nome}_parte{parte}.avi")
            out = cv2.VideoWriter(current_filename, cv2.VideoWriter_fourcc(*'XVID'), fps_real, (largura, altura))
            seg_t_inicio = time.time()

        if time.time() - seg_t_inicio >= DURACAO_PARTE:
            out.release()
            seg_t_fim = time.time()
            arquivos_temp[botao_nome].append({
                "path": current_filename,
                "t_inicio": seg_t_inicio,
                "t_fim": seg_t_fim,
                "fps": fps_real,
                "w": largura,
                "h": altura
            })
            parte += 1
            current_filename = os.path.join(PASTA_TEMP, f"{botao_nome}_parte{parte}.avi")
            out = cv2.VideoWriter(current_filename, cv2.VideoWriter_fourcc(*'XVID'), fps_real, (largura, altura))
            seg_t_inicio = time.time()

        out.write(frame)

    cap.release()
    if out:
        out.release()
        seg_t_fim = time.time()
        arquivos_temp[botao_nome].append({
            "path": current_filename,
            "t_inicio": seg_t_inicio,
            "t_fim": seg_t_fim,
            "fps": fps_real,
            "w": largura,
            "h": altura
        })

def captura_camera_dummy(botao_nome, botao):
    try:
        fps_real = 30
        largura, altura = (LARGURA_SAIDA, ALTURA_SAIDA) if REDUZ_RESOLUCAO else (1280, 720)
        parte = 0
        out = None
        seg_t_inicio = None
        px = 0
        direction = 1
        bg_color = (30, 30, 30)
        fps_cameras[botao_nome] = fps_real
        print(f"✅ [DUMMY {botao_nome}] Gerando frames sintéticos a {fps_real} FPS")
        frame_interval = 1.0 / fps_real
        last = time.time()

        while True:
            now = time.time()
            dt = now - last
            if dt < frame_interval:
                time.sleep(frame_interval - dt)
            last = time.time()

            frame = np.full((altura, largura, 3), bg_color, dtype=np.uint8)
            txt = datetime.now().strftime("%H:%M:%S.%f")[:-3]
            cv2.putText(frame, f"{botao_nome} TESTE {txt}", (20, 40), cv2.FONT_HERSHEY_SIMPLEX, 1.0, (200, 200, 50), 2)
            cv2.rectangle(frame, (px, altura//2 - 30), (px + 120, altura//2 + 30), (50, 180, 240), -1)
            px += 10 * direction
            if px < 0 or px + 120 > largura:
                direction *= -1
                px += 10 * direction

            if out is None:
                parte += 1
                current_filename = os.path.join(PASTA_TEMP, f"{botao_nome}_parte{parte}.avi")
                out = cv2.VideoWriter(current_filename, cv2.VideoWriter_fourcc(*'XVID'), fps_real, (largura, altura))
                seg_t_inicio = time.time()

            if time.time() - seg_t_inicio >= DURACAO_PARTE:
                out.release()
                seg_t_fim = time.time()
                arquivos_temp[botao_nome].append({
                    "path": current_filename,
                    "t_inicio": seg_t_inicio,
                    "t_fim": seg_t_fim,
                    "fps": fps_real,
                    "w": largura,
                    "h": altura
                })
                parte += 1
                current_filename = os.path.join(PASTA_TEMP, f"{botao_nome}_parte{parte}.avi")
                out = cv2.VideoWriter(current_filename, cv2.VideoWriter_fourcc(*'XVID'), fps_real, (largura, altura))
                seg_t_inicio = time.time()

            out.write(frame)

    except Exception as e:
        print(f"❌ [DUMMY {botao_nome}] Erro: {e}")
        traceback.print_exc()
    finally:
        try:
            if out:
                out.release()
                seg_t_fim = time.time()
                arquivos_temp[botao_nome].append({
                    "path": current_filename,
                    "t_inicio": seg_t_inicio,
                    "t_fim": seg_t_fim,
                    "fps": fps_real,
                    "w": largura,
                    "h": altura
                })
        except Exception:
            pass

# =========================
# FUNÇÕES DE SALVAMENTO
# =========================
def salvar_video_janela(segments, t_ini, t_fim, largura, altura, filename, fps_out):
    try:
        logo = cv2.imread(LOGO_PATH, cv2.IMREAD_UNCHANGED)
        if logo is not None:
            logo = cv2.resize(logo, (int(logo.shape[1] * LOGO_ESCALA), int(logo.shape[0] * LOGO_ESCALA)))
            if len(logo.shape) == 3 and logo.shape[2] == 4:
                logo_bgr = logo[:, :, :3]
                mask = logo[:, :, 3]
                mask_inv = cv2.bitwise_not(mask)
            else:
                logo_bgr = logo
                mask = None
        else:
            logo = None

        frames_necessarios = int(SEGUNDOS * fps_out)
        frames_gravados = 0
        out = cv2.VideoWriter(filename, cv2.VideoWriter_fourcc(*'mp4v'), fps_out, (largura, altura))
        if not out.isOpened():
            alt_name = os.path.splitext(filename)[0] + ".avi"
            print(f"⚠️ Falha ao abrir writer mp4. Tentando AVI... -> {alt_name}")
            out = cv2.VideoWriter(alt_name, cv2.VideoWriter_fourcc(*'XVID'), fps_out, (largura, altura))
        last_frame = None

        for seg in sorted(segments, key=lambda s: s["t_inicio"]):
            if frames_gravados >= frames_necessarios:
                break
            cap = cv2.VideoCapture(seg["path"])
            fps_in = seg["fps"]
            idx = 0
            while True:
                ret, frame = cap.read()
                if not ret:
                    break
                if frame is None or len(frame.shape) == 2 or (len(frame.shape) == 3 and frame.shape[2] == 1):
                    frame = cv2.cvtColor(frame, cv2.COLOR_GRAY2BGR)
                if REDUZ_RESOLUCAO and (frame.shape[1] != largura or frame.shape[0] != altura):
                    frame = cv2.resize(frame, (largura, altura))

                t_frame = seg["t_inicio"] + (idx / max(1, fps_in))
                idx += 1

                if t_frame < t_ini:
                    continue
                if t_frame > t_fim:
                    break

                if logo is not None:
                    h_logo, w_logo = logo_bgr.shape[:2]
                    x1, y1 = frame.shape[1] - w_logo - 10, frame.shape[0] - h_logo - 10
                    x2, y2 = x1 + w_logo, y1 + h_logo
                    roi = frame[y1:y2, x1:x2]
                    if 'mask' in locals() and mask is not None:
                        bg = cv2.bitwise_and(roi, roi, mask=mask_inv)
                        fg = cv2.bitwise_and(logo_bgr, logo_bgr, mask=mask)
                        dst = cv2.add(bg, fg)
                        frame[y1:y2, x1:x2] = dst
                    else:
                        frame[y1:y2, x1:x2] = logo_bgr

                frame_index_out = int((t_frame - t_ini) * fps_out)
                while frames_gravados <= frame_index_out and frames_gravados < frames_necessarios:
                    out.write(frame)
                    last_frame = frame
                    frames_gravados += 1

                if frames_gravados >= frames_necessarios:
                    break
            cap.release()

        if last_frame is not None:
            while frames_gravados < frames_necessarios:
                out.write(last_frame)
                frames_gravados += 1

        out.release()
        print(f"💾 Vídeo salvo: {filename} ({frames_gravados/fps_out:.1f}s)")
    except Exception as e:
        print("❌ Erro ao salvar vídeo (janela):", e)
        traceback.print_exc()

def salvar_30s_antes_do_clique(botao_nome, t_clique, filename):
    while True:
        segs = list(arquivos_temp[botao_nome])
        if any(s["t_inicio"] <= t_clique <= s["t_fim"] for s in segs):
            break
        time.sleep(0.05)

    t_ini = t_clique - SEGUNDOS
    segs = [s for s in list(arquivos_temp[botao_nome]) if s["t_fim"] >= t_ini and s["t_inicio"] <= t_clique]
    if not segs:
        print(f"⚠️ [{botao_nome}] Sem histórico suficiente para salvar.")
        return

    segs.sort(key=lambda s: s["t_inicio"])
    fps_out = fps_cameras.get(botao_nome, 30)
    largura, altura = LARGURA_SAIDA, ALTURA_SAIDA
    salvar_video_janela(segs, t_ini, t_clique, largura, altura, filename, fps_out)

# =========================
# WORKERS
# =========================
def worker(botao_nome):
    while True:
        req = filas_salvamento[botao_nome].get()
        try:
            if isinstance(req, dict) and req.get("tipo") == "janela":
                thread = threading.Thread(
                    target=salvar_30s_antes_do_clique,
                    args=(botao_nome, req["t_clique"], req["filename"]),
                    daemon=True
                )
                thread.start()
                threads_salvamento[botao_nome].append((thread, time.time()))
                thread.join(timeout=120)
                if thread.is_alive():
                    print(f"⏱️ Timeout: salvamento da câmera {botao_nome} demorou mais de 2min e foi abortado.")
            salvando[botao_nome] = False
        except Exception as e:
            print(f"❌ Erro no worker do botão {botao_nome}:", e)
            salvando[botao_nome] = False

for botao_nome in arquivos_temp.keys():
    t = threading.Thread(target=worker, args=(botao_nome,), daemon=True)
    t.start()

# =========================
# WATCHDOG
# =========================
def watchdog():
    while True:
        agora = time.time()
        for botao_nome, lista in threads_salvamento.items():
            for thread, inicio in list(lista):
                if not thread.is_alive():
                    lista.remove((thread, inicio))
                elif agora - inicio > 130:
                    print(f"⚠️ Watchdog: liberando {botao_nome} após travamento.")
                    salvando[botao_nome] = False
                    lista.remove((thread, inicio))
        time.sleep(10)

threading.Thread(target=watchdog, daemon=True).start()

# =========================
# INICIA THREADS DE CAPTURA
# =========================
for botao, lista_cams in QUADRAS.items():
    for cam in lista_cams:
        botao_nome = f"{botao}_{cam['nome']}"
        if MODO_TESTE and DUMMY_CAPTURE:
            t = threading.Thread(target=captura_camera_dummy, args=(botao_nome, botao), daemon=True)
        else:
            t = threading.Thread(target=captura_camera, args=(botao_nome, cam["url"], botao), daemon=True)
        t.start()

# =========================
# LOOP PRINCIPAL
# =========================
print("⏳ Aguardando inicialização (5s)...")
time.sleep(5)
print("✅ Pronto! Pressione botão da câmera, tecla 's' (teste) ou CTRL+C para sair.")

ultimo_limpeza = time.time()
estado_anterior = {botao: 0 for botao in QUADRAS}
ultimo_disparo = {botao: 0.0 for botao in QUADRAS}
DEBOUNCE = 0.25
inicio_exec = time.time()
auto_disparo_feito = False

try:
    while True:
        pygame.event.pump()
        agora = time.time()

        for botao, lista_cams in QUADRAS.items():
            try:
                estado = controle.get_button(botao)
            except Exception:
                estado = 0

            if estado == 1 and estado_anterior[botao] == 0 and (agora - ultimo_disparo[botao] > DEBOUNCE):
                horario = datetime.now().strftime("%H-%M-%S")
                pasta_dia = os.path.join(PASTA_VIDEOS, datetime.now().strftime("%Y-%m-%d"))
                os.makedirs(pasta_dia, exist_ok=True)

                t_clique = time.time()
                for cam in lista_cams:
                    botao_nome = f"{botao}_{cam['nome']}"
                    if not salvando[botao_nome]:
                        filename = os.path.join(pasta_dia, f"{cam['nome']}_{horario}.mp4")
                        print(f"🎥 Botão {botao} pressionado → salvar 30s anteriores de {cam['nome']}")
                        salvando[botao_nome] = True
                        filas_salvamento[botao_nome].put({
                            "tipo": "janela",
                            "t_clique": t_clique,
                            "filename": filename
                        })

                ultimo_disparo[botao] = agora

            estado_anterior[botao] = estado

        # Modo teste: tecla 's' dispara salvamento para todas as câmeras
        if MODO_TESTE:
            try:
                import msvcrt
                if msvcrt.kbhit():
                    ch = msvcrt.getch()
                    if ch in (b's', b'S'):
                        horario = datetime.now().strftime("%H-%M-%S")
                        pasta_dia = os.path.join(PASTA_VIDEOS, datetime.now().strftime("%Y-%m-%d"))
                        os.makedirs(pasta_dia, exist_ok=True)
                        t_clique = time.time()
                        for b, lista in QUADRAS.items():
                            for cam in lista:
                                bn = f"{b}_{cam['nome']}"
                                if not salvando[bn]:
                                    filename = os.path.join(pasta_dia, f"{cam['nome']}_{horario}.mp4")
                                    print(f"🎥 [Teste] Disparo manual → salvar {SEGUNDOS}s anteriores de {cam['nome']}")
                                    salvando[bn] = True
                                    filas_salvamento[bn].put({
                                        "tipo": "janela",
                                        "t_clique": t_clique,
                                        "filename": filename
                                    })
            except Exception:
                pass

            # Disparo automático após aquecimento
            if AUTO_DISPARO_TESTE and not auto_disparo_feito and (agora - inicio_exec) >= max(SEGUNDOS, 8):
                horario = datetime.now().strftime("%H-%M-%S")
                pasta_dia = os.path.join(PASTA_VIDEOS, datetime.now().strftime("%Y-%m-%d"))
                os.makedirs(pasta_dia, exist_ok=True)
                t_clique = time.time()
                for b, lista in QUADRAS.items():
                    for cam in lista:
                        bn = f"{b}_{cam['nome']}"
                        if not salvando[bn]:
                            filename = os.path.join(pasta_dia, f"{cam['nome']}_{horario}.mp4")
                            print(f"🎥 [Teste] Disparo automático → salvar {SEGUNDOS}s anteriores de {cam['nome']}")
                            salvando[bn] = True
                            filas_salvamento[bn].put({
                                "tipo": "janela",
                                "t_clique": t_clique,
                                "filename": filename
                            })
                auto_disparo_feito = True

        if time.time() - ultimo_limpeza >= INTERVALO_LIMPEZA:
            limpar_temp()
            ultimo_limpeza = time.time()

        time.sleep(0.01)

except KeyboardInterrupt:
    print("\n🛑 Interrompido pelo usuário.")
