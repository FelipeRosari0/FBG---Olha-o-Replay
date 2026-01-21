require('dotenv').config();
console.log("Iniciando servidor...");
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

  // Prioriza o email salvo no pedido, depois tenta o user se for email, por fim o admin (fallback)
  const recipient = order.email || (order.user.includes('@') ? order.user : process.env.EMAIL_USER);
  
  if (!recipient) {
    console.log('Nenhum destinatário de email definido.');
    return;
  }
  
  console.log(`Enviando email do vídeo ${order.video} para ${recipient}...`);
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

const COURT_MAPPING = {
  'continental': 'Complexo Esportivo Continental',
  'arena-m10': 'Arena M10',
  'bola-de-ouro': 'Bola de Ouro',
  'canhoto': 'Canhoto',
  'ivanoski': 'Ivanoski',
  'paraiso': 'Paraíso da Bola',
  'arena-dfc': 'Arena DFC',
  'outros': 'Outros'
};

app.get("/api/videos", (req, res) => {
  const videos = [];
  const processedFiles = new Set();

  function scanDirectory(baseDir, isRoot = false) {
    if (!fs.existsSync(baseDir)) return;
    
    let items;
    try { items = fs.readdirSync(baseDir); } catch(e) { return; }

    for (const item of items) {
      const fullPath = path.join(baseDir, item);
      let stat;
      try { stat = fs.statSync(fullPath); } catch(e) { continue; }

      if (stat.isDirectory() && isRoot) {
        // Se estamos na raiz, entrar nas subpastas (quadras)
        const folderName = item;
        const prettyName = COURT_MAPPING[folderName.toLowerCase()] || folderName;
        
        try {
          const subItems = fs.readdirSync(fullPath);
          for (const subItem of subItems) {
             const subPath = path.join(fullPath, subItem);
             if (VIDEO_EXTS.has(path.extname(subItem).toLowerCase())) {
               // Evitar duplicatas se existirem em ROOT e LOCAL
               const uniqueKey = `${folderName}/${subItem}`;
               if (processedFiles.has(uniqueKey)) continue;
               processedFiles.add(uniqueKey);

               let subStat;
               try { subStat = fs.statSync(subPath); } catch { subStat = { mtime: new Date() }; }

               videos.push({
                 name: subItem,
                 court: prettyName,
                 relativePath: `${folderName}/${subItem}`,
                 birthtime: subStat.mtime || subStat.birthtime
               });
             }
          }
        } catch(e) {}
      } else if (VIDEO_EXTS.has(path.extname(item).toLowerCase())) {
        // Arquivo solto na raiz
        if (processedFiles.has(item)) continue;
        processedFiles.add(item);

        videos.push({
          name: item,
          court: 'Outros',
          relativePath: item,
          birthtime: stat.mtime || stat.birthtime
        });
      }
    }
  }

  // Escanear ROOT primeiro (prioridade)
  scanDirectory(VIDEO_DIR_ROOT, true);
  // Escanear LOCAL depois (fallback)
  scanDirectory(VIDEO_DIR_LOCAL, true);

  res.json(videos);
});

function serveVideoFile(req, res, videoPath) {
  fs.access(videoPath, fs.constants.F_OK, (err) => {
    if (err) return res.status(404).send("Vídeo não encontrado.");

    const stat = fs.statSync(videoPath);
    const fileSize = stat.size;
    const range = req.headers.range;
    const fileName = path.basename(videoPath);
    
    if (req.query.download === '1') {
      res.setHeader('Content-Type', 'video/mp4');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
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
}

// Rota para vídeos em subpastas (ex: /videos/arena-m10/video.mp4)
app.get("/videos/:folder/:video", (req, res) => {
  const { folder, video } = req.params;
  // Segurança básica contra directory traversal
  if (folder.includes('..') || video.includes('..')) return res.status(403).send('Acesso negado.');

  // Tentar no ROOT primeiro
  let videoPath = path.join(VIDEO_DIR_ROOT, folder, video);
  if (!fs.existsSync(videoPath)) {
    videoPath = path.join(VIDEO_DIR_LOCAL, folder, video);
  }
  
  serveVideoFile(req, res, videoPath);
});

// Rota legado/raiz
app.get("/videos/:video", (req, res) => {
  const requested = path.basename(req.params.video);
  
  // Tentar achar na raiz
  let videoPath = path.join(VIDEO_DIR_ROOT, requested);
  if (!fs.existsSync(videoPath)) {
     videoPath = path.join(VIDEO_DIR_LOCAL, requested);
  }

  // Se não achou na raiz, tentar procurar em subpastas (fallback inteligente)
  if (!fs.existsSync(videoPath)) {
     // Tentar encontrar em subpastas do ROOT
     try {
       const subdirs = fs.readdirSync(VIDEO_DIR_ROOT).filter(d => fs.statSync(path.join(VIDEO_DIR_ROOT, d)).isDirectory());
       for (const dir of subdirs) {
         const p = path.join(VIDEO_DIR_ROOT, dir, requested);
         if (fs.existsSync(p)) {
           videoPath = p;
           break;
         }
       }
     } catch {}
  }

  serveVideoFile(req, res, videoPath);
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
  const { video, user, email, price_cents } = req.body || {};
  if (!video || !user) return res.status(400).json({ error: 'video e user são obrigatórios' });
  const data = loadOrders();
  const id = Math.random().toString(36).slice(2);
  const now = new Date().toISOString();
  // Se não vier email, tenta usar o user se parecer um email, senão deixa em branco ou usa o do admin como fallback no envio
  const orderEmail = email || (user.includes('@') ? user : null);
  
  const order = { 
    id, 
    video, 
    user, 
    email: orderEmail, // Salva o email do comprador
    price_cents: price_cents || 1000, 
    status: 'pending', 
    created_at: now 
  };
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

app.listen(PORT, '0.0.0.0', () => console.log(`Servidor rodando em http://0.0.0.0:${PORT}`));
