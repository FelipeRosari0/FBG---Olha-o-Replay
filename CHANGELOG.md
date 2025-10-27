# Changelog — Olha o Replay

Data: 2025-10-27

Este documento registra, de forma detalhada, todas as alterações realizadas recentemente para simplificar o projeto, remover funcionalidades de pagamento, banco de dados e autenticação, e ajustar a experiência para o padrão brasileiro.

## Remoções
- Pagamentos e histórico:
  - Removidos: `pagamento/pagseguro.html`, `historico/purchases.html`.
  - Removida toda a lógica de compra/PIX e botões de compra nos resultados.
- Backend/Servidor e Banco de Dados (SQLite/Flask):
  - Removidos: `server/app.py`, `server/db/`, `server/ingest_demo.py`, `server/requirements.txt`, `server/pagseguro.py`.
  - Removida seção do README que descrevia banco e API.
- Scripts e documentação obsoletos:
  - Removidos: `scripts/iniciar_servidor_windows.bat`, `scripts/instalar_tarefas_agendadas.bat`, `docs/PAGAMENTO_PAGSEGURO.md`, `docs/TESTE_EXPORTACAO.md`.

## Alterações no Frontend
- Desativação de persistência e autenticação (`static/js/main.js`):
  - `getLS` agora retorna fallback e `setLS` é no-op (sem `localStorage`).
  - Neutralizados: `getCurrentUser`, `setCurrentUser`, `logout`.
  - Comentada `ensureSeed`; removidos inicializadores de compra/pagamento.
  - `updateNavbar` simplificado para esconder itens de usuário.
  - `initLogin`/`initRegister` desativados no `init()`.
- Limpeza de navegação e páginas:
  - Removidos links de Login/Registrar e dropdown de usuário em:
    - `inicio/index.html`, `buscar-videos/search.html`, `login/login.html`, `registrar/register.html`.
  - Mantida navegação mínima com “Vídeos”.
- Ajustes de conteúdo e estilos:
  - `static/css/style.css` atualizado para refletir remoções (nav e componentes sem compra/login).

## Internacionalização (pt-BR)
- Input de data na busca (`buscar-videos/search.html`):
  - Adicionado `lang="pt-BR"` e placeholder `dd/mm/aaaa`; filtro segue em ISO (`YYYY-MM-DD`).
- Datas dos cards (`static/js/main.js`):
  - Adicionada `formatDateLabel(dateStr)` para exibir datas em `dd/mm/aaaa` usando `toLocaleDateString('pt-BR')`.
  - Cards exibem datas no padrão brasileiro.

## Documentação
- `README.md` revisado:
  - Agora descreve o site como estático (HTML/CSS/JS), sem backend, login/cadastro, compras/pagamentos, ou banco de dados.
  - Instruções atualizadas para execução local simples.

## Validação
- Verificação via preview local:
  - `inicio/index.html` e `buscar-videos/search.html` sem erros.
  - Nenhum modal de compra/PIX aparece; nav simplificada.
  - Datas renderizam em `pt-BR` nos cards; input mostra orientação brasileira.

## Observações
- Diretório `static/img/canchas/` incluído no repositório (era não rastreado).
- Caso precise restaurar qualquer funcionalidade removida (login/pagamentos/banco), será necessário reintroduzir código e dependências correspondentes.