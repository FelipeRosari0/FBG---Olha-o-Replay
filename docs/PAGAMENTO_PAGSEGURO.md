# Pagamento com PagSeguro (PIX)

Este projeto tem uma integração simples com PagSeguro (PagBank) usando PIX.
Funciona em dois modos:

- Live: quando `PAGSEGURO_TOKEN` está configurado, cria uma cobrança PIX real.
- Mock: quando o token não está presente, gera um QR "falso" apenas para testes de fluxo.

## Como configurar (Sandbox)

1. Crie uma conta de desenvolvedor no PagBank e habilite o Sandbox.
2. Obtenha o token de acesso (Bearer Token) no painel de desenvolvedor.
3. Defina as variáveis de ambiente no Windows (PowerShell):

   ```powershell
   $env:PAGSEGURO_TOKEN = "SEU_TOKEN_SANDBOX_AQUI"
   $env:PAGSEGURO_ENV = "sandbox"
   ```

4. Instale as dependências do backend e inicie os servidores:

   ```powershell
   pip install -r server/requirements.txt
   python server/app.py   # backend em http://localhost:5000
   python -m http.server 8000   # site estático em http://localhost:8000
   ```

## Fluxo de compra

- A página `buscar-videos/search.html` possui o botão "Comprar".
- Ao confirmar o email, o frontend cria uma cobrança via `POST /pay/pagseguro/start`.
- Abre um modal com QR PIX (imagem quando disponível) e o código em texto para copiar.
- O frontend faz polling de `GET /pay/pagseguro/status/{charge_id}`.
- Quando o status retornar "PAID", a compra é registrada localmente e o download é habilitado.

## Webhook (opcional)

Para produção, é recomendado configurar uma URL pública e receber notificações do PagSeguro.
Neste MVP não habilitamos webhook, apenas polling de status.

## Observações

- Sem o token, o backend opera em modo mock para testes.
- Para cartões/boleto, use as variantes do endpoint de `charges` com `payment_method` adequado.
- Não publique o token em repositórios públicos.