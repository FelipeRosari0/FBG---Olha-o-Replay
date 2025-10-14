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
   - Em `Source`, escolha `Deploy from a branch`.
   - Selecione `main` e `/(root)`.
   - Salve; a página será publicada em `https://<seu-usuario>.github.io/olha-o-replay/`.

Este projeto é um site estático com `index.html` na raiz, compatível com GitHub Pages.