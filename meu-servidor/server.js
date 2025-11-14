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
  res.json(all);
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

app.listen(PORT, () => console.log(`Servidor rodando em http://localhost:${PORT}`));
