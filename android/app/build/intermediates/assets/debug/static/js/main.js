// Olha o Replay - Client-side app (sem backend)
(function () {
  const API_BASE = '';
  const LS_KEYS = {
    users: 'or_users',
    currentUser: 'or_currentUser',
    purchases: 'or_purchases',
    anonEmail: 'or_anon_email',
    clips: 'or_clips',
  };

  const state = {
    courts: [
      { id: 'c1', name: 'Canhoto Sports', logo: '../static/img/canchas/logo_canhoto.jpg' },
      { id: 'c2', name: 'Bola de Ouro Arena', logo: '../static/img/canchas/logo_boladeouro.jpg' },
      { id: 'c3', name: 'Arena MVP • Society & Beach', logo: '../static/img/canchas/logo_arena_mvp.jpg' },
      { id: 'c4', name: 'Cancha Ivanoski', logo: '../static/img/canchas/logo_ivanoski.jpg' },
      { id: 'c5', name: 'Paraíso da Bola', logo: '../static/img/canchas/logo_paraiso_da_bola.jpg' },
      { id: 'c6', name: 'Complexo Esportivo Continental', logo: '../static/img/canchas/complexo esportivo continental.jpg' },
    ],
    serverVideos: [],
    videos: [
      {
        id: 'v1',
        title: 'Final 7x7 - Arena Centro',
        courtId: 'c1',
        date: formatDateOffset(0),
        start: '18:00',
        end: '19:00',
        duration: '60 min',
        price: 9.9,
        thumb: '../static/img/OLHA O REPLAY.jpg',
        hasMedia: true,
        mediaUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
      },
      {
        id: 'v2',
        title: 'Clássico 5x5 - Quadra Norte',
        courtId: 'c2',
        date: formatDateOffset(-1),
        start: '20:00',
        end: '21:00',
        duration: '60 min',
        price: 7.5,
        thumb: '../static/img/OLHA O REPLAY.jpg',
        hasMedia: false,
      },
      {
        id: 'v3',
        title: 'Amistoso - Quadra Sul',
        courtId: 'c3',
        date: formatDateOffset(-2),
        start: '17:30',
        end: '18:30',
        duration: '60 min',
        price: 5.0,
        thumb: '../static/img/OLHA O REPLAY.jpg',
        hasMedia: false,
      },
      {
        id: 'v4',
        title: 'Semifinal 7x7 - Quadra Leste',
        courtId: 'c4',
        date: formatDateOffset(-3),
        start: '19:00',
        end: '20:00',
        duration: '60 min',
        price: 8.5,
        thumb: '../static/img/OLHA O REPLAY.jpg',
        hasMedia: true,
        mediaUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
      },
      {
        id: 'v5',
        title: 'Treino - Arena Centro',
        courtId: 'c1',
        date: formatDateOffset(-4),
        start: '21:00',
        end: '22:00',
        duration: '60 min',
        price: 4.9,
        thumb: '../static/img/OLHA O REPLAY.jpg',
        hasMedia: false,
      },
      {
        id: 'v6',
        title: 'Clássico - Quadra Oeste',
        courtId: 'c5',
        date: formatDateOffset(-1),
        start: '18:30',
        end: '19:30',
        duration: '60 min',
        price: 6.9,
        thumb: '../static/img/OLHA O REPLAY.jpg',
        hasMedia: false,
      },
      {
        id: 'v7',
        title: 'Final 5x5 - Quadra Norte',
        courtId: 'c2',
        date: formatDateOffset(0),
        start: '17:00',
        end: '18:00',
        duration: '60 min',
        price: 9.0,
        thumb: '../static/img/OLHA O REPLAY.jpg',
        hasMedia: true,
        mediaUrl: 'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/720/Big_Buck_Bunny_720_10s_1MB.mp4',
      },
      {
        id: 'v8',
        title: 'Amistoso - Quadra Leste',
        courtId: 'c4',
        date: formatDateOffset(-5),
        start: '16:00',
        end: '17:00',
        duration: '60 min',
        price: 5.0,
        thumb: '../static/img/OLHA O REPLAY.jpg',
        hasMedia: false,
      },
      {
        id: 'v9',
        title: 'Copa Bairro - Arena Centro',
        courtId: 'c1',
        date: formatDateOffset(-6),
        start: '20:00',
        end: '21:30',
        duration: '90 min',
        price: 12.0,
        thumb: '../static/img/OLHA O REPLAY.jpg',
        hasMedia: true,
        mediaUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
      },
      {
        id: 'v10',
        title: 'Pelada - Quadra Sul',
        courtId: 'c3',
        date: formatDateOffset(-2),
        start: '22:00',
        end: '23:00',
        duration: '60 min',
        price: 3.5,
        thumb: '../static/img/OLHA O REPLAY.jpg',
        hasMedia: false,
      },
    ],
  };

  // Utils
  function formatDateOffset(daysOffset) {
    const d = new Date();
    d.setDate(d.getDate() + daysOffset);
    return d.toISOString().slice(0, 10);
  }
  function formatDateLabel(dateStr) {
    try {
      if (!dateStr) return '';
      const d = new Date(`${dateStr}T00:00:00`);
      return d.toLocaleDateString('pt-BR');
    } catch {
      return dateStr;
    }
  }
  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
  function minutes(hhmm) {
    if (!hhmm) return null;
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + m;
  }
  function overlap(startA, endA, startB, endB) {
    if (startB == null || endB == null) return true; // sem filtro
    return startA <= endB && endA >= startB;
  }
  function getLS(key, fallback) { return fallback; }
  function setLS(key, value) { /* desativado: sem persistência */ }

  // Anonymous buyer helpers
  function getAnonEmail() {
    return getLS(LS_KEYS.anonEmail, null);
  }
  function setAnonEmail(email) {
    if (!email) return;
    setLS(LS_KEYS.anonEmail, email);
  }

  // Courts helper (global)
  function findCourt(id) {
    return state.courts.find(c => c.id === id);
  }

  // Map server clip to UI video model
  function clipToVideo(clip) {
    const dateStr = (clip.recorded_at || '').slice(0, 10);
    const durMs = Number(clip.duration_ms || 0);
    const durLabel = durMs ? `${Math.round(durMs/1000)} s` : '30 s';
    const courtId = (clip.court_id || '').toLowerCase();
    const mediaUrl = clip.clip_url || null;
    return {
      id: `srv_${clip.id}`,
      title: clip.event_type ? `Clip ${clip.event_type} • ${courtId}` : `Clip ${courtId || '#'+clip.id}`,
      courtId: courtId,
      date: dateStr || formatDateOffset(0),
      start: null,
      end: null,
      duration: durLabel,
      price: 5.0,
      thumb: 'static/img/OLHA O REPLAY.jpg',
      hasMedia: !!mediaUrl,
      mediaUrl: mediaUrl,
    };
  }

  async function loadServerClips(limit = 50) {
    if (!API_BASE) {
      const items = getLS(LS_KEYS.clips, []);
      state.serverVideos = Array.isArray(items) ? items : [];
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/clips?limit=${limit}`);
      const json = await res.json();
      const items = Array.isArray(json.items) ? json.items : [];
      state.serverVideos = items.map(clipToVideo);
    } catch (e) {
      console.warn('Falha ao buscar clips do servidor:', e);
      state.serverVideos = [];
    }
  }

  // Bootstrap alert helper
  function showAlert(container, msg, type = 'success') {
    const html = `<div class="alert alert-${type} alert-dismissible fade show" role="alert">${msg}<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button></div>`;
    container.innerHTML = html;
  }

  // Auth helpers
  function getCurrentUser() { return null; }
  function setCurrentUser(user) { /* desativado */ }
  function logout() { /* desativado */ }

  function ensureSeed() {
    /* desativado: sem seed de usuários ou compras */
  }

  function updateNavbar() {
    const navLogin = document.getElementById('navLogin');
    const navRegister = document.getElementById('navRegister');
    // desativado no modo simplificado
    if (navLogin) navLogin.style.display = 'none';
    if (navRegister) navRegister.style.display = 'none';
  }

  function renderVideoCard(v) {
    const court = findCourt(v.courtId);
    const label = `${court?.name || v.courtId || ''}`;
    return `
      <div class="col-12 col-md-6 col-lg-4 mb-4">
        <div class="card h-100 shadow-sm">
          <img src="${v.thumb}" class="video-thumb" alt="Thumb do vídeo">
          <div class="card-body d-flex flex-column">
            <h5 class="card-title">${v.title}</h5>
            <p class="card-text">
              <span class="badge bg-primary me-2">${label}</span>
              <span class="text-muted">${v.date} • ${v.duration}</span>
            </p>
            <div class="mt-auto d-flex justify-content-between align-items-center">
              <div class="btn-group">
                <button class="btn btn-brand-dark btn-sm" data-action="preview" data-id="${v.id}"><i class="fa-regular fa-circle-play me-1"></i>Preview</button>
                <button class="btn btn-brand-green btn-sm" data-action="download" data-id="${v.id}" ${v.hasMedia ? '' : 'disabled'}><i class="fa-solid fa-download me-1"></i>Download</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function attachSearchHandlers() {
    const listEl = document.getElementById('videoList');
    if (!listEl) return;
    listEl.addEventListener('click', (ev) => {
      const btn = ev.target.closest('button[data-action]');
      if (!btn) return;
      const id = btn.getAttribute('data-id');
      const action = btn.getAttribute('data-action');
      const v = state.videos.concat(state.serverVideos).find(x => x.id === id);
      if (!v) return;
      if (action === 'preview') {
        showPreview(v);
      } else if (action === 'download') {
        triggerDownload(v);
      }
    });
  }

  function renderVideoList() {
    const listEl = document.getElementById('videoList');
    if (!listEl) return;
    const all = state.serverVideos.concat(state.videos);
    listEl.innerHTML = all.map(renderVideoCard).join('');
  }

  function applyFilters() {
    // No-op simplificado
    renderVideoList();
  }

  function clearFilters() {
    const dateEl = document.getElementById('filterDate');
    const startEl = document.getElementById('filterStart');
    const endEl = document.getElementById('filterEnd');
    if (dateEl) dateEl.value = '';
    if (startEl) startEl.value = '';
    if (endEl) endEl.value = '';
    renderVideoList();
  }

  function triggerDownload(v) {
    const alertContainer = document.getElementById('alertContainer');
    if (!v.hasMedia) {
      showAlert(alertContainer, 'Este vídeo está indisponível para download no momento.', 'warning');
      return;
    }
    try {
      const a = document.createElement('a');
      a.href = v.mediaUrl;
      a.download = '';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      showAlert(alertContainer, 'Download iniciado. Verifique a barra de downloads.', 'success');
    } catch (e) {
      showAlert(alertContainer, 'Falha ao iniciar o download.', 'danger');
    }
  }

  function showPreview(v) {
    const modalEl = document.getElementById('previewModal');
    const contentEl = document.getElementById('previewContent');
    if (!modalEl || !contentEl) return;
    const hasMedia = !!v.mediaUrl;
    contentEl.innerHTML = hasMedia ? `
      <video controls style="width:100%; border-radius:.5rem; background:#000">
        <source src="${v.mediaUrl}" type="video/mp4" />
        Seu navegador não suporta vídeo.
      </video>
    ` : `
      <div class="alert alert-info">Este vídeo não possui mídia disponível para preview.</div>
    `;
    const modal = new bootstrap.Modal(modalEl);
    modal.show();
  }

  // Search page
  function initSearch() {
    const params = new URLSearchParams(location.search);
    const showDemo = params.get('demo') === '1';
    if (!showDemo) { state.videos = []; }
    const courtSel = document.getElementById('filterCourt');
    if (courtSel) {
      const opts = ['<option value="">Todas</option>'].concat(
        state.courts.map(c => `<option value="${c.id}">${c.name}</option>`)
      );
      courtSel.innerHTML = opts.join('');
    }
    const applyBtn = document.getElementById('applyFilters');
    const clearBtn = document.getElementById('clearFilters');
    if (applyBtn) applyBtn.addEventListener('click', applyFilters);
    if (clearBtn) clearBtn.addEventListener('click', clearFilters);
    loadServerClips(50).then(renderVideoList);
    attachSearchHandlers();
  }

  // Init
  function init() {
    updateNavbar();
    initSearch();
  }

  document.addEventListener('DOMContentLoaded', init);
})();

// Fallback inteligente para logos na home (tenta outras extensões)
window.logoFallback = function (img) {
  try {
    const base = img.getAttribute('data-logo-base');
    const exts = (img.getAttribute('data-exts') || 'png,jpg,jpeg,webp').split(',');
    const attempt = parseInt(img.getAttribute('data-attempt') || '0', 10);
    if (!base) { img.src = '../static/img/OLHA O REPLAY.jpg'; return; }
    if (attempt < exts.length) {
      img.setAttribute('data-attempt', String(attempt + 1));
      img.src = `../static/img/canchas/${base}.${exts[attempt]}`;
    } else {
      img.src = '../static/img/OLHA O REPLAY.jpg';
    }
  } catch (e) {
    img.src = '../static/img/OLHA O REPLAY.jpg';
  }
};