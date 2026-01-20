require('dotenv').config();
const nodemailer = require('nodemailer');
const express = require("express");
const fs = require("fs");
const path = require("path");
const os = require("os");
const app = express();
const PORT = 3000;
const VIDEO_DIR_ROOT = path.join(__dirname, '..', 'videos');
const VIDEO_DIR_LOCAL = path.join(__dirname, 'videos');
const VIDEO_EXTS = new Set(['.mp4', '.webm', '.mov', '.mkv', '.avi']);

// Configuração de transporte de email
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

async function sendVideoEmail(order, req) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log('Credenciais de email ausentes. Pulando envio.');
    return;
  }
  
  // Tenta usar o campo 'user' como email, ou usa o email do admin como fallback para teste
  const recipient = order.user.includes('@') ? order.user : process.env.EMAIL_USER;
  const downloadLink = `${req.protocol}://${req.get('host')}/videos/${encodeURIComponent(order.video)}?download=1`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; color: #333;">
      <h1 style="color: #d4a017;">Olha o Replay - Seu vídeo chegou!</h1>
      <p>Olá, <strong>${order.user}</strong>!</p>
      <p>Confirmamos o pagamento do seu vídeo: <strong>${order.video}</strong></p>
      <p>Clique no botão abaixo para baixar ou assistir:</p>
      <p>
        <a href="${downloadLink}" style="display: inline-block; background-color: #ffd54f; color: #000; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          ACESSAR VÍDEO
        </a>
      </p>
      <p>Ou copie este link: <br><a href="${downloadLink}">${downloadLink}</a></p>
      <hr>
      <p><small>Este é um email automático de Olha o Replay.</small></p>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: `"Olha o Replay" <${process.env.EMAIL_USER}>`,
      to: recipient,
      subject: `Seu vídeo está pronto: ${order.video}`,
      html: html
    });
    console.log(`Email enviado com sucesso para ${recipient}`);
  } catch (err) {
    console.error('Erro ao enviar email:', err);
  }
}

function filterVideos(files){
  return files.filter(f => VIDEO_EXTS.has(path.extname(f).toLowerCase()));
}

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
// Serve também a pasta static no nível superior do repositório para que
// arquivos como /static/css/style.css e /static/js/main.js fiquem disponíveis
app.use('/static', express.static(path.join(__dirname, '..', 'static')));

// Servir todas as páginas HTML do repositório por rotas estáticas
app.use('/inicio', express.static(path.join(__dirname, '..', 'inicio')));
app.use('/login', express.static(path.join(__dirname, '..', 'login')));
app.use('/registrar', express.static(path.join(__dirname, '..', 'registrar')));
app.use('/historico', express.static(path.join(__dirname, '..', 'historico')));
app.use('/buscar-videos', express.static(path.join(__dirname, '..', 'buscar-videos')));

// Algumas páginas referenciam diretamente /meu-servidor/public/index.html
app.use('/meu-servidor/public', express.static(path.join(__dirname, 'public')));

// Rota raiz: redireciona para a página inicial
app.get('/', (req, res) => {
  res.redirect('/inicio/index.html');
});

// Expor nome do usuário do computador
app.get('/api/user', (req, res) => {
  try {
    const username = os.userInfo().username;
    res.json({ username });
  } catch (e) {
    res.json({ username: process.env.USERNAME || process.env.USER || 'Usuário' });
  }
});

app.get("/api/videos", (req, res) => {
  let rootFiles = [];
  let localFiles = [];
  try { rootFiles = filterVideos(fs.readdirSync(VIDEO_DIR_ROOT)); } catch {}
  try { localFiles = filterVideos(fs.readdirSync(VIDEO_DIR_LOCAL)); } catch {}
  const all = Array.from(new Set([ ...rootFiles, ...localFiles ]));
  
  // Retornar array de objetos com nome e data do arquivo (preferir mtime, sem fallback aleatório)
  const videos = [];
  for (const fileName of all) {
    // Determinar caminho real do arquivo (root primeiro, depois local)
    let videoPath = path.join(VIDEO_DIR_ROOT, fileName);
    if (!fs.existsSync(videoPath)) {
      videoPath = path.join(VIDEO_DIR_LOCAL, fileName);
    }

    // Se o arquivo não existir em nenhum dos dois lugares, pular
    if (!fs.existsSync(videoPath)) continue;

    try {
      const stat = fs.statSync(videoPath);
      // Em alguns sistemas, birthtime pode não refletir a criação original; mtime tende a ser mais confiável.
      const fileTime = stat.mtime || stat.birthtime;
      videos.push({
        name: fileName,
        birthtime: fileTime
      });
    } catch (e) {
      // Se não conseguimos obter stat, não incluir este arquivo para evitar datas incorretas
      continue;
    }
  }
  
  res.json(videos);
});

app.get("/videos/:video", (req, res) => {
  const requested = path.basename(req.params.video);
  let videoPath = path.join(VIDEO_DIR_ROOT, requested);
  if (!fs.existsSync(videoPath)) {
    videoPath = path.join(VIDEO_DIR_LOCAL, requested);
  }
  fs.access(videoPath, fs.constants.F_OK, (err) => {
    if (err) return res.status(404).send("Vídeo não encontrado.");

    const stat = fs.statSync(videoPath);
    const fileSize = stat.size;
    const range = req.headers.range;
    
    // Se download=1, forçar download como anexo
    if (req.query.download === '1') {
      res.setHeader('Content-Type', 'video/mp4');
      res.setHeader('Content-Disposition', `attachment; filename="${req.params.video}"`);
      fs.createReadStream(videoPath).pipe(res);
      return;
    }

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = (end - start) + 1;
      const file = fs.createReadStream(videoPath, { start, end });
      const head = {
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": chunkSize,
        "Content-Type": "video/mp4",
      };
      res.writeHead(206, head);
      file.pipe(res);
    } else {
      const head = {
        "Content-Length": fileSize,
        "Content-Type": "video/mp4",
      };
      res.writeHead(200, head);
      fs.createReadStream(videoPath).pipe(res);
    }
  });
});

const DATA_DIR = path.join(__dirname, 'data');
const ORDERS_PATH = path.join(DATA_DIR, 'orders.json');

function ensureData(){
  try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch {}
  if (!fs.existsSync(ORDERS_PATH)) {
    try { fs.writeFileSync(ORDERS_PATH, JSON.stringify({ orders: [] }, null, 2)); } catch {}
  }
}
function loadOrders(){
  ensureData();
  try {
    const raw = fs.readFileSync(ORDERS_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return { orders: [] };
  }
}
function saveOrders(data){
  try { fs.writeFileSync(ORDERS_PATH, JSON.stringify(data, null, 2)); } catch {}
}

app.post('/payments/checkout', (req, res) => {
  const { video, user, price_cents } = req.body || {};
  if (!video || !user) return res.status(400).json({ error: 'video e user são obrigatórios' });
  const data = loadOrders();
  const id = Math.random().toString(36).slice(2);
  const now = new Date().toISOString();
  const order = { id, video, user, price_cents: price_cents || 1000, status: 'pending', created_at: now };
  data.orders.push(order);
  saveOrders(data);
  const redirect_url = `/payments/checkout-page?order_id=${id}`;
  res.json({ order_id: id, redirect_url });
});

app.get('/payments/checkout-page', (req, res) => {
  const { order_id } = req.query;
  const data = loadOrders();
  const order = data.orders.find(o => o.id === order_id);
  if (!order) return res.status(404).send('Pedido não encontrado');
  res.send(`<!doctype html><html lang="pt-br"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Pagamento</title><link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet"></head><body class="p-4"><div class="container" style="max-width:560px"><h3 class="mb-3">Pagamento do vídeo</h3><div class="card mb-3"><div class="card-body"><p class="mb-2"><strong>Vídeo:</strong> ${order.video}</p><p class="mb-2"><strong>Usuário:</strong> ${order.user}</p><p class="mb-3"><strong>Valor:</strong> R$ ${(order.price_cents/100).toFixed(2)}</p><p class="text-muted">Simulação de checkout. Aqui você integrará PagSeguro futuramente.</p><a class="btn btn-success" href="/payments/confirm?order_id=${order.id}">Pagar</a></div></div><a class="btn btn-outline-secondary" href="/meu-servidor/public/index.html">Voltar</a></div></body></html>`);
});

app.get('/payments/confirm', async (req, res) => {
  const { order_id } = req.query;
  const data = loadOrders();
  const order = data.orders.find(o => o.id === order_id);
  if (!order) return res.status(404).send('Pedido não encontrado');
  
  if (order.status !== 'paid') {
    order.status = 'paid';
    order.paid_at = new Date().toISOString();
    saveOrders(data);
    
    // Dispara envio de email (sem travar a resposta, ou await se preferir garantir)
    await sendVideoEmail(order, req);
  }
  
  res.redirect(`/payments/thankyou?order_id=${order.id}`);
});

app.get('/payments/thankyou', (req, res) => {
  const { order_id } = req.query;
  const data = loadOrders();
  const order = data.orders.find(o => o.id === order_id);
  if (!order) return res.status(404).send('Pedido não encontrado');
  res.send(`<!doctype html><html lang="pt-br"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Pagamento concluído</title><link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet"></head><body class="p-4"><div class="container text-center" style="max-width:560px"><h3 class="mb-3">Pagamento concluído</h3><p class="mb-3">Pronto! Agora você pode assistir: <strong>${order.video}</strong></p><a class="btn btn-primary" href="/meu-servidor/public/index.html">Voltar aos vídeos</a></div></body></html>`);
});

app.get('/payments/status', (req, res) => {
  const { video, user } = req.query;
  if (!video || !user) return res.status(400).json({ error: 'video e user são obrigatórios' });
  const data = loadOrders();
  const last = data.orders.filter(o => o.video === video && o.user === user).slice(-1)[0];
  const paid = !!(last && last.status === 'paid');
  res.json({ paid, order_id: last ? last.id : null, status: last ? last.status : null });
});

app.post('/payments/webhook', (req, res) => {
  res.status(200).json({ ok: true });
});

app.listen(PORT, () => console.log(`Servidor rodando em http://localhost:${PORT}`));
