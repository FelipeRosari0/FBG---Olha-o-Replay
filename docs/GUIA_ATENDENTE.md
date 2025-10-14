# Guia do Atendente (Servidor da Quadra)

Não precisa saber programar. É 1 clique ou início automático.

Passo a passo bem simples para iniciar o sistema no computador onde ficam os vídeos.

## O que este computador faz
- Guarda os vídeos das quadras.
- Roda o **site** para os clientes acessarem.
- Roda o **backend** que recebe os clips e prepara o download.

## Antes de começar (apenas uma vez)
1) Instalar o Python (versão 3.10 ou superior) em Windows.
2) Abrir a pasta do projeto no computador.
3) Instalar as dependências do backend:
   - Abra o PowerShell dentro da pasta do projeto.
   - Execute: `pip install -r server/requirements.txt`

## Iniciar todo dia (duas opções)

### Opção A — 1 clique (recomendado)
- Na pasta `scripts`, dê duplo clique em `iniciar_servidor_windows.bat`.
- Ele abre duas janelas:
  - Site (porta `8000`)
  - Backend (porta `5000`)
- Pronto! Os clientes conseguem acessar.

### Opção B — manual (se preferir)
- Abra 2 janelas do PowerShell na pasta do projeto:
  - Janela 1 (site): `python -m http.server 8000`
  - Janela 2 (backend): `python server/app.py`

## Como saber que está funcionando
- No próprio computador:
  - Abra `http://localhost:8000/search.html` (site abre).
  - Abra `http://localhost:5000/health` (deve mostrar `{"status":"ok"}`).
- Em outro celular/notebook na mesma rede (Wi‑Fi da quadra):
  - Descubra o IP do computador (Windows):
    - Abra o PowerShell e digite `ipconfig`.
    - Pegue o endereço IPv4 (ex.: `192.168.0.20`).
  - Acesse:
    - Site: `http://SEU_IP:8000/search.html` (ex.: `http://192.168.0.20:8000/search.html`).

## Como chegam os vídeos
- O sistema das câmeras/gravador salva os vídeos.
- Quando acontece um lance, o seu sistema envia o **clip de 30s** para o backend (no mesmo computador) em `http://localhost:5000/clips`.
- O site mostra esses clips automaticamente para compra.

## Problemas comuns e solução
- Porta já em uso (erro ao iniciar):
  - Feche janelas antigas do site/backend e tente de novo.
- Site não abre em outros aparelhos:
  - Use `http://SEU_IP:8000/search.html` em vez de `localhost`.
  - Permita o Python no Firewall do Windows quando aparecer o aviso.
  - Verifique se o computador e o celular estão na mesma rede.
- Download não começa:
  - Confirme se o backend está rodando (`http://localhost:5000/health`).
  - Tente novamente após comprar.

## Parar no fim do dia
- Feche as duas janelas (site e backend).

---
Dúvidas? Veja também o `docs/GUIA_CLIENTE.md` (guia simples para o cliente) e `docs/TESTE_EXPORTACAO.md` (teste rápido).
