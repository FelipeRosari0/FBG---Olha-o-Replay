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

## Aplicativo Android (WebView)

Este repositório inclui um projeto Android nativo em `android/` que carrega o site dentro de um WebView.

- Abra `android/` no Android Studio (versão recente).
- Aguarde o sync do Gradle e instale as dependências.
- Atualize a URL inicial em `android/app/src/main/res/values/strings.xml` (chave `initial_url`) para o seu domínio HTTPS em produção, por exemplo: `https://seu-dominio.com/inicio/index.html`.
- Rode em um dispositivo/emulador Android para validar.

### Publicação na Play Store

- Gere um App Bundle assinando via Android Studio: `Build > Generate Signed Bundle / APK...` (AAB).
- Crie um keystore e guarde com segurança as credenciais.
- No Play Console, crie o app, preencha a listagem, políticas e envie o AAB.
- A permissão `android.permission.INTERNET` já está configurada no Manifest.
- Se o seu site usar apenas HTTPS, nenhuma configuração extra de segurança é necessária.

### Dicas

- Para suporte offline, você pode copiar todo o conteúdo do site para `android/app/src/main/assets/` e alterar a URL inicial para `file:///android_asset/index.html`. Lembre-se de levar também as imagens, CSS e JS mantendo a mesma estrutura de pastas.