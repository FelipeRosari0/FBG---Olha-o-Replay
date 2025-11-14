let selectedVideo = null;

async function carregarVideos() {
  const res = await fetch("/api/videos");
  const videos = await res.json();

  const container = document.getElementById("video-list");
  container.innerHTML = "";

  videos.forEach(v => {
    const div = document.createElement("div");
    div.className = "thumb";
    div.innerHTML = `
      <img src="thumbs/${v.replace('.mp4', '.jpg')}" width="100%" alt="${v}">
      <p>${v}</p>
    `;
    div.onclick = () => abrirPopup(v);
    container.appendChild(div);
  });
}

function abrirPopup(video) {
  selectedVideo = video;
  document.getElementById("popup").classList.remove("hidden");
}

document.getElementById("btn-fechar").onclick = () => {
  document.getElementById("popup").classList.add("hidden");
};

document.getElementById("btn-comprar").onclick = () => {
  document.getElementById("popup").classList.add("hidden");
  const playerDiv = document.getElementById("player");
  const videoEl = document.getElementById("video-player");
  videoEl.src = `/videos/${selectedVideo}`;
  playerDiv.classList.remove("hidden");
};

document.getElementById("player").onclick = (e) => {
  if (e.target.id === "player") {
    document.getElementById("player").classList.add("hidden");
    const videoEl = document.getElementById("video-player");
    videoEl.pause();
    videoEl.src = "";
  }
};

carregarVideos();
