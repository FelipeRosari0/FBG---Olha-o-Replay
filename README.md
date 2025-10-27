# Olha o Replay

Site estático (HTML/CSS/JS puro) sem backend.

- Abra `inicio/index.html` diretamente no navegador (file://) ou via servidor local `http://localhost:8000/inicio/index.html`.
- Não há servidor, rotas ou dependências (apenas Bootstrap 5 e Font Awesome via CDN).
- Sem login, cadastro, compras, pagamentos ou banco de dados.

## Estrutura

- `inicio/index.html`, `buscar-videos/search.html`
- (opcionais) `login/login.html`, `registrar/register.html` — páginas desativadas e sem fluxo de autenticação
- `static/css/style.css`
- `static/js/main.js`
- `static/img/logo.svg`
- `static/media/exemplo.mp4` (opcional; não incluído neste pacote)

## Observações

- Os cards de busca exibem somente “Preview” e “Download”.
- O botão "Download" tenta baixar o placeholder se existir (`static/media/exemplo.mp4`).
- Caso o placeholder não esteja presente, será exibido um alerta informativo.
- Recursos de compras/pagamentos e qualquer persistência (localStorage, banco) foram removidos.

## Executar localmente

Via Python (Windows/PowerShell):

```
python -m http.server 8000
```

Acesse `http://localhost:8000/inicio/index.html`.