const express = require("express");
const fs = require("fs");
const path = require("path");
const os = require("os");
const app = express();
const PORT = 3000;
const VIDEO_DIR_ROOT = path.join(__dirname, '..', 'videos');
const VIDEO_DIR_LOCAL = path.join(__dirname, 'videos');
const VIDEO_EXTS = new Set(['.mp4', '.webm', '.mov', '.mkv', '.avi']);

function filterVideos(files){
  return files.filter(f => VIDEO_EXTS.has(path.extname(f).toLowerCase()));
}

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
// Serve também a pasta static no nível superior do repositório para que
// arquivos como /static/css/style.css e /static/js/main.js fiquem disponíveis
app.use('/static', express.static(path.join(__dirname, '..', 'static')));

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
  
  // Retornar array de objetos com nome e data de criação (birthtime)
  const videos = all.map(fileName => {
    let videoPath = path.join(VIDEO_DIR_ROOT, fileName);
    if (!fs.existsSync(videoPath)) {
      videoPath = path.join(VIDEO_DIR_LOCAL, fileName);
    }
    
    let birthtime = null;
    try {
      const stat = fs.statSync(videoPath);
      birthtime = stat.birthtime; // Data de criação do arquivo
    } catch (e) {
      birthtime = new Date(); // Fallback
    }
    
    return {
      name: fileName,
      birthtime: birthtime
    };
  });
  
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

app.get('/payments/confirm', (req, res) => {
  const { order_id } = req.query;
  const data = loadOrders();
  const order = data.orders.find(o => o.id === order_id);
  if (!order) return res.status(404).send('Pedido não encontrado');
  order.status = 'paid';
  order.paid_at = new Date().toISOString();
  saveOrders(data);
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
