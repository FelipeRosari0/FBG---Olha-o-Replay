# Teste de Exportação/Download de Vídeo

Este guia explica, passo a passo, como validar se a funcionalidade de exportar/baixar vídeo está funcionando no projeto “Olha o Replay”. Há três formas de testar:

- A) Somente frontend com um arquivo local (recomendado)
- B) Somente frontend usando o link externo de teste
- C) Opcional: com backend Flask para servir mídia


## Guia rápido (do zero)

Siga este passo a passo simples para ver a compra e o download funcionando.

1) Abra o PowerShell na pasta do projeto:

```powershell
cd c:\Users\Usuário\OneDrive\Documentos\GitHub\FBG---Olha-o-Replay
```

2) Baixe um vídeo de exemplo para a pasta local do site:

```powershell
Invoke-WebRequest "https://www.w3schools.com/html/mov_bbb.mp4" -OutFile static/media/exemplo.mp4
```

3) Inicie os servidores (dois terminais):

Em um terminal, o backend Flask (clips e mídia):
```powershell
python server/app.py
```

Em outro terminal, o site estático:
```powershell
python -m http.server 8000
```

4) Envie um clip de 30s para o backend (exemplo usando `curl`):

```powershell
curl -F "clip_file=@static/media/exemplo.mp4" -F "court_id=C1" -F "device_id=PC-QUADRA-01" -F "start_ms=300000" -F "duration_ms=30000" -F "event_type=gol" http://localhost:5000/clips
```

5) Abra o site: `http://localhost:8000/buscar-videos/search.html`.

6) Compre o clip que apareceu na lista e clique em “Download”.

- Resultado esperado: baixa um arquivo chamado `replay.mp4` (servido pelo backend).
- Se você não estiver logado, informe seu e‑mail no modal; a compra fica salva no `localStorage`.


## Visão geral da implementação

- O site é estático (HTML/CSS/JS) e o botão "Download" só aparece após uma compra simulada, usando `localStorage`.
- O código cliente (arquivo `static/js/main.js`) cria um link dinâmico e dispara um clique para iniciar o download:
  - Se o vídeo tiver `hasMedia: true`, usa `video.mediaUrl` (se definido) ou o arquivo local `static/media/exemplo.mp4`.
  - Caso não exista mídia, o sistema exibe um alerta informando.
- Observação importante: navegadores podem ignorar o atributo `download` quando o arquivo está em outro domínio (cross-origin). Por isso, para testar de forma confiável, recomenda-se usar um arquivo local servido pelo próprio site (mesma origem).


## Pré-requisitos

- Navegador (Chrome ou Edge).
- Python 3 instalado (apenas se optar por iniciar um servidor HTTP simples ou usar o backend Flask).
- Um arquivo MP4 pequeno para teste.


## A) Teste somente frontend com arquivo local (recomendado)

1. Crie a pasta de mídia (se ainda não existir): `static/media/`.
2. Baixe um MP4 de teste para `static/media/exemplo.mp4`. No PowerShell (Windows), dentro da pasta do projeto:

   ```powershell
   Invoke-WebRequest "https://www.w3schools.com/html/mov_bbb.mp4" -OutFile static/media/exemplo.mp4
   ```

3. Inicie um servidor HTTP simples na raiz do projeto (para evitar restrições de `file://`):

   ```powershell
   python -m http.server 8000
   ```

4. Abra no navegador: `http://localhost:8000/buscar-videos/search.html`.
5. Localize o vídeo “Final 7x7 - Arena Centro”.
6. Clique em “Comprar”.
   - Se não estiver logado, informe um email no modal. A compra será registrada em `localStorage` e o botão “Download” aparecerá.
7. Clique em “Download”.
   - Resultado esperado: o navegador baixa um arquivo chamado `replay.mp4` (conteúdo é o `static/media/exemplo.mp4`).

Validações:
- Sem compra, o botão “Download” não aparece e/ou um alerta informa que é necessário comprar.
- Se `static/media/exemplo.mp4` não existir, aparece um alerta informativo.
- Com o arquivo presente e mesma origem (`http://localhost:8000`), o download inicia corretamente.


## B) Teste usando o link externo de mídia

O vídeo de exemplo `v1` já está configurado com `mediaUrl = https://www.w3schools.com/html/mov_bbb.mp4`.

Passos:
1. Inicie o servidor HTTP simples:

   ```powershell
   python -m http.server 8000
   ```

2. Abra `http://localhost:8000/buscar-videos/search.html` e efetue a compra do vídeo “Final 7x7 - Arena Centro”.
3. Clique em “Download”.

Observações:
- Por ser um arquivo em outro domínio (cross-origin), alguns navegadores podem abrir o vídeo em uma aba ao invés de baixar diretamente, ignorando o atributo `download`. Isso é comportamento esperado.
- Para garantir download direto, prefira o método A (arquivo local, mesma origem).


## C) Teste opcional com backend Flask (servir mídia local)

Este projeto inclui um servidor Flask para ingestão e listagem de clips (30s). Você pode usá-lo para hospedar um arquivo e testar acesso via `http://localhost:5000/media/...`.

1. Instale dependências do backend:

   ```powershell
   pip install -r server/requirements.txt
   ```

2. Inicie o servidor Flask (porta 5000):

   ```powershell
   python server/app.py
   ```

3. Envie um arquivo de teste para o servidor. Com PowerShell (Windows), usando `curl` ou `Invoke-RestMethod`:

   Usando `curl`:
   ```powershell
   curl -F "clip_file=@static/media/exemplo.mp4" -F "court_id=C1" -F "device_id=PC-QUADRA-01" -F "start_ms=300000" -F "duration_ms=30000" -F "event_type=gol" http://localhost:5000/clips
   ```

   Usando `Invoke-RestMethod` (somente URL):
   ```powershell
   $body = @{ court_id="C1"; device_id="PC-QUADRA-01"; source_video_id="full_2025_10_14_02"; start_ms=150000; duration_ms=30000; event_type="gol"; uploader_email="op@quadra.local"; clip_url="http://localhost:5000/media/exemplo.mp4" } | ConvertTo-Json
   Invoke-RestMethod -Uri http://localhost:5000/clips -Method POST -ContentType "application/json" -Body $body
   ```

4. O servidor responderá com `id`, `clip_url` e (quando upload) `clip_path`. Valide abrindo `clip_url` no navegador.

5. (Opcional) Para testar o fluxo do site com esse arquivo, você pode alterar temporariamente o `mediaUrl` do vídeo `v1` em `static/js/main.js` para o `clip_url` retornado. Lembre-se: como o site estará em `http://localhost:8000` e a mídia em `http://localhost:5000`, isso é cross-origin e pode abrir em nova aba ao invés de baixar direto.


## Casos de teste e resultados esperados

- Download habilitado somente após compra (alerta de sucesso exibido).
- Sem compra: alerta “Você precisa comprar antes de baixar.”
- Sem arquivo local (A): alerta “Arquivo placeholder não disponível…”.
- Com arquivo local e mesma origem: arquivo `replay.mp4` é baixado (tamanho igual ao arquivo fonte).
- Preview: ao clicar “Preview”, um modal exibe o vídeo (se houver mídia) ou uma imagem.
- Persistência: `localStorage` contém as chaves `or_purchases` e `or_anon_email` após compra anônima.


## Dicas e solução de problemas

- Se abrir os arquivos diretamente via `file://`, o comportamento de download pode variar. Prefira o servidor HTTP simples (`python -m http.server`).
- Se o download não iniciar, verifique:
  - Se o arquivo `static/media/exemplo.mp4` existe.
  - Se você está acessando via `http://localhost:8000` (mesma origem).
  - Se algum bloqueio do navegador está ativo (raro para cliques simulados).
- Limpar estado de testes: apague dados do `localStorage` no DevTools (Application → Local Storage) ou execute no console:

  ```javascript
  localStorage.clear()
  ```

- Bootstrap/Modal: certifique-se de que os CDNs do Bootstrap e Font Awesome estão carregados (ver `index.html`).


## Referências úteis

- Frontend: `static/js/main.js` — lógica de compra, preview e download.
- Páginas: `buscar-videos/search.html`, `historico/purchases.html`, `inicio/index.html`.
- Backend (opcional): `server/app.py`, endpoints `/clips` e `/media/<filename>`.
- README do projeto: detalhes sobre estrutura e APIs.