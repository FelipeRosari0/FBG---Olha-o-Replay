// Olha o Replay - Android App Client
(function () {
  // Tenta conectar usando o IP da rede local para maior compatibilidade com emuladores externos ou dispositivos físicos na mesma rede
  // const API_BASE = 'http://10.0.2.2:3000'; // IP padrão do emulador Android Studio
  const API_BASE = 'http://192.168.100.65:3000'; // Seu IP local detectado (mais robusto)
  
  const LS_KEYS = {
    users: 'or_users', // Legacy
    purchases: 'or_purchases',
    anonEmail: 'or_anon_email'
  };

  const state = {
    videos: [],
    courts: [] // Will be populated from static list or inferred
  };

  // Helper: Date manipulation
  function formatDateOffset(days) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  }
  function minutes(timeStr) {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  }
  function overlap(s1, e1, s2, e2) {
    if (!s2 && !e2) return true;
    if (!s2) return e1 <= e2;
    if (!e2) return s1 >= s2;
    return Math.max(s1, s2) < Math.min(e1, e2);
  }

  // Helper: Storage
  function getLS(key, def) { try { return JSON.parse(localStorage.getItem(key)) || def; } catch { return def; } }
  function setLS(key, val) { localStorage.setItem(key, JSON.stringify(val)); }
  function getAnonEmail() { return getLS(LS_KEYS.anonEmail, ''); }
  function setAnonEmail(val) { setLS(LS_KEYS.anonEmail, val); }
  function isValidEmail(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }

  // Helper: UI
  function showAlert(container, msg, type) {
    if (!container) return;
    container.innerHTML = `<div class="alert alert-${type} alert-dismissible fade show" role="alert">${msg}<button type="button" class="btn-close" data-bs-dismiss="alert"></button></div>`;
  }

  // Purchases
  function isPurchased(email, videoId) {
    const purchases = getLS(LS_KEYS.purchases, {});
    const list = purchases[email?.toLowerCase()] || [];
    return list.includes(videoId);
  }
  function addPurchase(email, videoId) {
    const purchases = getLS(LS_KEYS.purchases, {});
    const key = email.toLowerCase();
    purchases[key] = purchases[key] || [];
    if (!purchases[key].includes(videoId)) purchases[key].push(videoId);
    setLS(LS_KEYS.purchases, purchases);
  }
  function isPurchasedByAny(videoId) {
    const anon = getAnonEmail();
    if (anon && isPurchased(anon, videoId)) return true;
    return false;
  }

  // Fetch Videos from Server
  async function loadVideos() {
    try {
      const res = await fetch(`${API_BASE}/api/videos`);
      if (!res.ok) throw new Error('Falha ao carregar vídeos');
      state.videos = await res.json();
      
      // Process videos to ensure full URLs for thumbs/media if relative
      state.videos.forEach(v => {
        // Se o caminho for relativo, prepend API_BASE
        // O servidor retorna relativePath. A rota de acesso é /videos/:folder/:video ou /videos/:video
        // Vamos construir a URL de media baseada nisso
        if (v.relativePath) {
             v.mediaUrl = `${API_BASE}/videos/${v.relativePath.replace(/\\/g, '/')}`;
             // Thumb placeholder
             v.thumb = '../static/img/OLHA O REPLAY.jpg'; 
             v.hasMedia = true;
             
             // Preço padrão se não vier do server
             if (!v.price) v.price = 10.0;
             if (!v.duration) v.duration = '60 min';
             
             // Extrair data/hora do nome do arquivo se possível (ex: 2023-10-10_18-00.mp4)
             // Fallback para birthtime
             if (!v.date && v.birthtime) {
               v.date = v.birthtime.split('T')[0];
             }
        }
      });
      
    } catch (e) {
      console.error(e);
      // Fallback para dados vazios ou erro
      const container = document.getElementById('alertContainer');
      showAlert(container, 'Não foi possível conectar ao servidor. Verifique se ele está rodando.', 'danger');
    }
  }

  // Init Search Page
  async function initSearch() {
    const form = document.getElementById('searchForm');
    if (!form) return;
    
    await loadVideos();

    const courtSel = document.getElementById('filterCourt');
    const dateEl = document.getElementById('filterDate');
    const startEl = document.getElementById('filterStart');
    const endEl = document.getElementById('filterEnd');
    const applyBtn = document.getElementById('applyFilters');
    const clearBtn = document.getElementById('clearFilters');
    const listEl = document.getElementById('videoList');
    const alertContainer = document.getElementById('alertContainer');
    
    const buyModalEl = document.getElementById('buyModal');
    const buyEmailEl = document.getElementById('buyEmail');
    const buyConfirmBtn = document.getElementById('buyConfirm');
    const buyModal = buyModalEl ? new bootstrap.Modal(buyModalEl) : null;
    let pendingBuyId = null;

    // Populate Courts (Static List matching Server/Web)
    const ALL_COURTS = [
        'Complexo Esportivo Continental',
        'Arena M10',
        'Bola de Ouro',
        'Canhoto',
        'Ivanoski',
        'Paraíso da Bola',
        'Arena DFC',
        'Outros'
    ];
    
    // Clear existing options (except "Todas")
    while(courtSel.options.length > 1) { courtSel.remove(1); }
    
    ALL_COURTS.forEach(courtName => {
        const opt = document.createElement('option');
        opt.value = courtName;
        opt.textContent = courtName;
        courtSel.appendChild(opt);
    });

    function render(videos) {
      listEl.innerHTML = '';
      if (!videos.length) {
        listEl.innerHTML = '<p class="text-muted">Nenhum vídeo encontrado.</p>';
        return;
      }
      videos.forEach(v => {
        const col = document.createElement('div');
        col.className = 'col-md-4 mb-4';
        const purchased = isPurchasedByAny(v.id || v.name); // Use name as ID if ID missing
        const vidId = v.id || v.name;
        
        col.innerHTML = `
          <div class="card h-100 shadow-sm">
            <img src="${v.thumb}" alt="thumb" class="video-thumb" style="height:180px; object-fit:cover; width:100%">
            <div class="card-body d-flex flex-column">
              <h5 class="card-title">${v.name || v.title}</h5>
              <p class="card-text mb-2">
                <span class="badge bg-primary me-2">${v.court}</span>
                <span class="text-muted">${v.date || ''}</span>
              </p>
              <div class="mt-auto d-flex justify-content-between align-items-center">
                <span class="price-tag">R$ ${(v.price || 10).toFixed(2)}</span>
                <div class="btn-group">
                  <button class="btn btn-brand-dark btn-sm" data-action="preview" data-id="${vidId}"><i class="fa-regular fa-circle-play me-1"></i>Preview</button>
                  ${purchased ? `
                    <button class="btn btn-brand-green btn-sm" data-action="download" data-id="${vidId}"><i class="fa-solid fa-download me-1"></i>Download</button>
                  ` : `
                    <button class="btn btn-brand-yellow btn-sm" data-action="buy" data-id="${vidId}"><i class="fa-solid fa-cart-shopping me-1"></i>Comprar</button>
                  `}
                </div>
              </div>
            </div>
          </div>
        `;
        listEl.appendChild(col);
      });
    }

    function apply() {
      const selCourt = courtSel.value;
      const selDate = dateEl.value;
      const selStart = minutes(startEl.value);
      const selEnd = minutes(endEl.value);
      
      const filtered = state.videos.filter(v => {
        const okCourt = !selCourt || v.court === selCourt;
        // Simple date match (string equality)
        const okDate = !selDate || (v.date && v.date === selDate);
        // Time filtering is complex without explicit start/end in video data, skipping for now or using defaults
        return okCourt && okDate;
      });
      render(filtered);
    }

    applyBtn.addEventListener('click', apply);
    clearBtn.addEventListener('click', () => { courtSel.value=''; dateEl.value=''; startEl.value=''; endEl.value=''; apply(); });
    apply();

    // Actions
    listEl.addEventListener('click', async (e) => {
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;
      const id = btn.getAttribute('data-id');
      const action = btn.getAttribute('data-action');
      const video = state.videos.find(v => (v.id || v.name) === id);
      if (!video) return;

      if (action === 'preview') {
         // Show simple preview
         const modalBody = document.getElementById('previewContent');
         modalBody.innerHTML = `<video controls style="width:100%" src="${video.mediaUrl}" poster="${video.thumb}"></video>`;
         const modal = new bootstrap.Modal(document.getElementById('previewModal'));
         modal.show();
      }
      
      if (action === 'download') {
         // Open browser for download
         const link = document.createElement('a');
         link.href = video.mediaUrl + '?download=1';
         link.download = video.name;
         document.body.appendChild(link);
         link.click();
         link.remove();
      }

      if (action === 'buy') {
          pendingBuyId = id;
          const cachedEmail = getAnonEmail();
          if (buyEmailEl && cachedEmail) buyEmailEl.value = cachedEmail;
          if (buyModal) buyModal.show();
      }
    });

    // Buy Confirm
    buyConfirmBtn?.addEventListener('click', async () => {
      const email = buyEmailEl?.value.trim();
      if (!email) return;
      if (!isValidEmail(email)) { showAlert(alertContainer, 'Email inválido.', 'danger'); return; }
      if (!pendingBuyId) return;
      
      const video = state.videos.find(v => (v.id || v.name) === pendingBuyId);
      if (!video) return;

      setAnonEmail(email);
      
      // 1. Optimistic local purchase
      addPurchase(email, pendingBuyId);
      
      // 2. Call Server Checkout to send Email
      try {
        const res = await fetch(`${API_BASE}/payments/checkout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                video: video.name,
                user: email,
                email: email,
                price_cents: (video.price || 10) * 100
            })
        });
        
        if (res.ok) {
            const data = await res.json();
            // Redirect to payment page (Server)
            if (data.redirect_url) {
                window.location.href = API_BASE + data.redirect_url;
            } else {
                showAlert(alertContainer, 'Erro ao iniciar pagamento.', 'danger');
            }
        } else {
            showAlert(alertContainer, 'Erro de comunicação com o servidor.', 'danger');
        }
      } catch (e) {
         showAlert(alertContainer, 'Erro de rede: ' + e.message, 'danger');
      }

      buyModal?.hide();
    });
  }

  function init() {
    // Only init search if we are on the search page
    if (document.getElementById('searchForm')) {
        initSearch();
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
