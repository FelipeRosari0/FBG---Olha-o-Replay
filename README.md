# Olha o Replay

Site estático (HTML/CSS/JS puro) sem qualquer backend.

- Abra `index.html` diretamente no navegador (file://).
- Não há servidor, rotas ou dependências (apenas Bootstrap 5 e Font Awesome via CDN).
- Login, cadastro e compras são simulados e persistidos com `localStorage`.

Estrutura:

- `index.html`, `login.html`, `register.html`, `search.html`
- `static/css/style.css`
- `static/js/main.js`
- `static/img/logo.svg`
- `static/media/exemplo.mp4` (opcional; não incluído neste pacote)

Observações:
- Botão "Download" aparece após compra e tenta baixar o placeholder se existir.
- Caso o placeholder não esteja presente, será exibido um alerta informativo.

## Banco de dados (clips de 30s)

Este projeto agora inclui um banco SQLite para registrar clips de 30 segundos gerados nos computadores da quadra e hospedados pelo servidor Python.

- Local do banco: `server/data/replay.db` (configurável via `REPLAY_DB_PATH`).
- Schema: `server/db/schema.sql` (tabela `clips`).
- Utilitário Python: `server/db/clip_store.py` com funções `init_db`, `insert_clip`, `get_clip`, `list_clips`, `update_clip_status`.

### Teste rápido

Execute o script de ingestão de demonstração para criar o banco e inserir um clip:

```
python server/ingest_demo.py
```

Saída esperada: ID inserido e listagem dos últimos clips.

### Integração com seu servidor Python

No seu serviço que recebe os clips (30s), importe e use:

```python
from server.db.clip_store import init_db, insert_clip

init_db()  # apenas uma vez na inicialização do serviço

clip_id = insert_clip(
    court_id="C1",
    device_id="PC-QUADRA-01",
    source_video_id="full_2025_10_14_01",
    start_ms=120000,
    duration_ms=30000,
    clip_path="server/data/clips/clip_01.mp4",  # ou use clip_url
    uploader_email="op@quadra.local",
    event_type="gol",
    metadata={"note": "Extraído via botão 30s"},
)
```

- `clip_path` deve apontar para o arquivo salvo localmente pelo servidor.
- `clip_url` pode ser usado se o arquivo estiver em armazenamento externo acessível via HTTP.

## API Flask (ingestão de clips)

Automatiza a ingestão e listagem via HTTP.

- Dependências: `pip install -r server/requirements.txt`
- Executar: `python server/app.py` (porta `5000`)
- Endpoints:
  - `POST /clips`: aceita `multipart/form-data` com `clip_file` (arquivo) e/ou JSON com `clip_url`. Campos úteis: `court_id`, `device_id`, `source_video_id`, `start_ms`, `duration_ms`, `event_type`, `uploader_email`, `metadata`.
  - `GET /clips`: lista clips com filtros opcionais `court_id`, `device_id`, `limit`, `offset`.
  - `GET /clips/<id>`: retorna um clip específico.
  - `PATCH /clips/<id>`: atualiza `status` do clip.

Exemplos (PowerShell):

Listar últimos clips:

```
Invoke-RestMethod -Uri http://localhost:5000/clips -Method GET
```

Inserir via JSON (sem arquivo, usando uma URL):

```
$body = @{ court_id="C1"; device_id="PC-QUADRA-01"; source_video_id="full_2025_10_14_02"; start_ms=150000; duration_ms=30000; event_type="gol"; uploader_email="op@quadra.local"; clip_url="https://exemplo.com/clip_02.mp4" } | ConvertTo-Json
Invoke-RestMethod -Uri http://localhost:5000/clips -Method POST -ContentType "application/json" -Body $body
```

Upload de arquivo com `curl` (caso tenha um mp4 de teste):

```
curl -F "clip_file=@server/data/clips/clip_teste.mp4" -F "court_id=C1" -F "device_id=PC-QUADRA-01" -F "start_ms=300000" -F "duration_ms=30000" -F "event_type=gol" http://localhost:5000/clips
```

Observações:
- Arquivos enviados são salvos em `server/data/clips/` e ganham uma URL local `http://localhost:5000/media/<arquivo>`.
- O banco é criado automaticamente na primeira execução.

## Publicar no GitHub

1. Crie um repositório público no GitHub (ex.: `olha-o-replay`).
2. No diretório do projeto, inicialize o Git e faça o primeiro commit:

```
git init
git add .
git commit -m "Initial commit: Olha o Replay"
git branch -M main
```

3. Adicione o remoto e envie:

```
git remote add origin https://github.com/<seu-usuario>/olha-o-replay.git
git push -u origin main
```

4. (Opcional) Ative o GitHub Pages:
   - Vá em `Settings` > `Pages`.
   - Em "Build and deployment" → "Source", escolha `Deploy from a branch`.
   - Selecione `Branch: gh-pages` e `Folder: / (root)` e salve. A branch `gh-pages` já foi publicada neste repositório.
   - Alternativamente, selecione `Branch: main` e `Folder: / (root)` se preferir.
   - A URL pública esperada para este projeto: `https://FelipeRosari0.github.io/FBG---Olha-o-Replay/`. [1]

Este projeto é um site estático com `index.html` na raiz, compatível com GitHub Pages.

## Referências

- [1] Configurar fonte de publicação do GitHub Pages: https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site#publishing-from-a-branch