// Olha o Replay - Client-side app (sem backend)
(function () {
  const API_BASE = 'http://localhost:5000';
  const LS_KEYS = {
    users: 'or_users',
    currentUser: 'or_currentUser',
    purchases: 'or_purchases',
    anonEmail: 'or_anon_email',
  };

  const state = {
    courts: [
      { id: 'c1', name: 'Arena Centro' },
      { id: 'c2', name: 'Quadra Norte' },
      { id: 'c3', name: 'Quadra Sul' },
      { id: 'c4', name: 'Quadra Leste' },
      { id: 'c5', name: 'Quadra Oeste' },
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
        thumb: '../static/img/thumb_futebol.svg',
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
        thumb: '../static/img/thumb_futebol.svg',
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
        thumb: '../static/img/thumb_futebol.svg',
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
        thumb: '../static/img/thumb_futebol.svg',
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
        thumb: '../static/img/thumb_futebol.svg',
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
        thumb: '../static/img/thumb_futebol.svg',
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
        thumb: '../static/img/thumb_futebol.svg',
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
        thumb: '../static/img/thumb_futebol.svg',
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
        thumb: '../static/img/thumb_futebol.svg',
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
        thumb: '../static/img/thumb_futebol.svg',
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
  function getLS(key, fallback) {
    try {
      const v = localStorage.getItem(key);
      return v ? JSON.parse(v) : fallback;
    } catch { return fallback; }
  }
  function setLS(key, value) { localStorage.setItem(key, JSON.stringify(value)); }

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
    const courtId = clip.court_id || '';
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
      thumb: 'static/img/thumb_futebol.svg',
      hasMedia: !!mediaUrl,
      mediaUrl: mediaUrl,
    };
  }

  async function loadServerClips(limit = 50) {
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
  function getCurrentUser() { return getLS(LS_KEYS.currentUser, null); }
  function setCurrentUser(user) { setLS(LS_KEYS.currentUser, user); }
  function logout() { localStorage.removeItem(LS_KEYS.currentUser); }

  function ensureSeed() {
    // Seed users if empty
    const users = getLS(LS_KEYS.users, null);
    if (!users) {
      setLS(LS_KEYS.users, [
        { username: 'Ana', email: 'ana@exemplo.com', password: '123456' },
      ]);
    }
    // Seed purchases
    const purchases = getLS(LS_KEYS.purchases, null);
    if (!purchases) setLS(LS_KEYS.purchases, {});
  }

  function updateNavbar() {
    const user = getCurrentUser();
    const navLogin = document.getElementById('navLogin');
    const navRegister = document.getElementById('navRegister');
    const navUser = document.getElementById('navUser');
    const userName = document.getElementById('userName');
    const logoutBtn = document.getElementById('logoutBtn');
    if (!navUser) return; // not loaded

    if (user) {
      navLogin?.classList.add('d-none');
      navRegister?.classList.add('d-none');
      navUser?.classList.remove('d-none');
      if (userName) userName.textContent = user.username || user.email;
      logoutBtn?.addEventListener('click', () => {
        logout();
        location.href = '../inicio/index.html';
      });
    } else {
      navLogin?.classList.remove('d-none');
      navRegister?.classList.remove('d-none');
      navUser?.classList.add('d-none');
    }

    // Index hero CTA
    const heroCta = document.getElementById('heroCtaRegister');
    if (heroCta) {
      if (user) heroCta.classList.add('d-none');
      else heroCta.classList.remove('d-none');
    }
  }

  // Login page
  function initLogin() {
    const form = document.getElementById('loginForm');
    if (!form) return;
    const emailEl = document.getElementById('loginEmail');
    const passEl = document.getElementById('loginPassword');
    const toggleBtn = document.getElementById('toggleLoginPassword');
    const alertContainer = document.getElementById('alertContainer');

    toggleBtn?.addEventListener('click', () => {
      if (passEl.type === 'password') { passEl.type = 'text'; toggleBtn.innerHTML = '<i class="fa-regular fa-eye-slash"></i>'; }
      else { passEl.type = 'password'; toggleBtn.innerHTML = '<i class="fa-regular fa-eye"></i>'; }
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = emailEl.value.trim();
      const password = passEl.value;
      if (!email || !password) { showAlert(alertContainer, 'Preencha email e senha.', 'warning'); return; }
      if (!isValidEmail(email)) { showAlert(alertContainer, 'Email inválido.', 'danger'); return; }
      const users = getLS(LS_KEYS.users, []);
      const user = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
      if (!user) { showAlert(alertContainer, 'Credenciais inválidas.', 'danger'); return; }
      setCurrentUser(user);
      showAlert(alertContainer, 'Login realizado com sucesso! Redirecionando...', 'success');
      setTimeout(() => location.href = '../inicio/index.html', 800);
    });
  }

  // Register page
  function initRegister() {
    const form = document.getElementById('registerForm');
    if (!form) return;
    const usernameEl = document.getElementById('regUsername');
    const emailEl = document.getElementById('regEmail');
    const passEl = document.getElementById('regPassword');
    const confirmEl = document.getElementById('regConfirm');
    const alertContainer = document.getElementById('alertContainer');

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const username = usernameEl.value.trim();
      const email = emailEl.value.trim();
      const password = passEl.value;
      const confirm = confirmEl.value;
      if (!username || !email || !password || !confirm) { showAlert(alertContainer, 'Preencha todos os campos.', 'warning'); return; }
      if (!isValidEmail(email)) { showAlert(alertContainer, 'Email inválido.', 'danger'); return; }
      if (password !== confirm) { showAlert(alertContainer, 'As senhas não coincidem.', 'danger'); return; }
      const users = getLS(LS_KEYS.users, []);
      if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) { showAlert(alertContainer, 'Email já cadastrado.', 'danger'); return; }
      const newUser = { username, email, password };
      users.push(newUser);
      setLS(LS_KEYS.users, users);
      setCurrentUser(newUser);
      showAlert(alertContainer, 'Cadastro concluído! Redirecionando...', 'success');
      setTimeout(() => location.href = '../inicio/index.html', 800);
    });
  }

  // Purchases helpers
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
    const user = getCurrentUser();
    const anon = getAnonEmail();
    if (user && isPurchased(user.email, videoId)) return true;
    if (anon && isPurchased(anon, videoId)) return true;
    return false;
  }

  function getPurchases(email) {
    const purchases = getLS(LS_KEYS.purchases, {});
    return purchases[email?.toLowerCase()] || [];
  }

  function initPurchases() {
    const listEl = document.getElementById('purchaseList');
    if (!listEl) return;
    const alertContainer = document.getElementById('alertContainer');
    const contextEl = document.getElementById('purchaseContext');
    const user = getCurrentUser();
    const anon = getAnonEmail();
    const email = user?.email || anon;

    if (!email) {
      showAlert(alertContainer, 'Nenhum comprador identificado. Faça uma compra ou informe email ao comprar.', 'info');
      listEl.innerHTML = '';
      return;
    }

    if (contextEl) {
      const who = user ? (user.username || user.email) : anon;
      contextEl.textContent = `Exibindo compras de: ${who}`;
    }

    const ids = getPurchases(email);
    if (!ids.length) {
      showAlert(alertContainer, 'Você ainda não possui compras.', 'warning');
      listEl.innerHTML = '';
      return;
    }

    listEl.innerHTML = '';
    ids.forEach(id => {
      const v = [...state.videos, ...state.serverVideos].find(x => x.id === id);
      if (!v) return;
      const col = document.createElement('div');
      col.className = 'col-md-4 mb-4';
      col.innerHTML = `
        <div class="card h-100 shadow-sm">
          <img src="${v.thumb}" alt="thumb" class="video-thumb">
          <div class="card-body d-flex flex-column">
            <h5 class="card-title">${v.title}</h5>
            <p class="card-text mb-2">
              <span class="badge bg-primary me-2">${findCourt(v.courtId)?.name || v.courtId || ''}</span>
              <span class="text-muted">${v.date} • ${v.duration}</span>
            </p>
            <div class="mt-auto d-flex justify-content-between align-items-center">
              <span class="price-tag">R$ ${v.price.toFixed(2)}</span>
              <div class="btn-group">
                <button class="btn btn-brand-dark btn-sm" data-action="preview" data-id="${v.id}"><i class="fa-regular fa-circle-play me-1"></i>Preview</button>
                <button class="btn btn-brand-green btn-sm" data-action="download" data-id="${v.id}"><i class="fa-solid fa-download me-1"></i>Download</button>
              </div>
            </div>
          </div>
        </div>
      `;
      listEl.appendChild(col);
    });

    // Delegate actions within purchases page
    listEl.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;
      const id = btn.getAttribute('data-id');
      const action = btn.getAttribute('data-action');
      const video = [...state.videos, ...state.serverVideos].find(v => v.id === id);
      if (!video) return;

      if (action === 'preview') {
        const modalBody = document.getElementById('previewContent');
        if (modalBody) {
          if (video.hasMedia) {
            const src = video.mediaUrl || '../static/media/exemplo.mp4';
            modalBody.innerHTML = `<video controls style="width:100%" src="${src}" poster="${video.thumb}"></video>`;
          } else {
            modalBody.innerHTML = `<img src="${video.thumb}" alt="preview" style="width:100%; border-radius:.5rem">`;
          }
          const modalEl = document.getElementById('previewModal');
          if (modalEl) { const modal = new bootstrap.Modal(modalEl); modal.show(); }
        }
      }

      if (action === 'download') {
        if (!video.hasMedia) { showAlert(alertContainer, 'Arquivo placeholder não disponível no projeto (opcional).', 'info'); return; }
        const a = document.createElement('a');
        a.href = video.mediaUrl || '../static/media/replay.mp4';
        a.download = 'replay.mp4';
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
    });
  }

  // Search page
  function initSearch() {
    const form = document.getElementById('searchForm');
    if (!form) return;
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

    // PIX modal elements
    const pixModalEl = document.getElementById('pixModal');
    const pixModal = pixModalEl ? new bootstrap.Modal(pixModalEl) : null;
    const pixQrImageEl = document.getElementById('pixQrImage');
    const pixCodeTextEl = document.getElementById('pixCodeText');
    const pixStatusEl = document.getElementById('pixStatus');
    const pixCopyBtn = document.getElementById('pixCopy');
    let pixPollTimer = null;
    let currentChargeId = null;

    // Populate courts
    state.courts.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id; opt.textContent = c.name; courtSel.appendChild(opt);
    });

    function render(videos) {
      listEl.innerHTML = '';
      if (!videos.length) {
        listEl.innerHTML = '<p class="text-muted">Nenhum vídeo encontrado com os filtros selecionados.</p>';
        return;
      }
      videos.forEach(v => {
        const col = document.createElement('div');
        col.className = 'col-md-4 mb-4';
        const purchased = isPurchasedByAny(v.id);
        col.innerHTML = `
          <div class="card h-100 shadow-sm">
            <img src="${v.thumb}" alt="thumb" class="video-thumb">
            <div class="card-body d-flex flex-column">
              <h5 class="card-title">${v.title}</h5>
              <p class="card-text mb-2">
                <span class="badge bg-primary me-2">${findCourt(v.courtId)?.name || v.courtId || ''}</span>
                <span class="text-muted">${v.date} • ${v.duration}</span>
              </p>
              <div class="mt-auto d-flex justify-content-between align-items-center">
                <span class="price-tag">R$ ${v.price.toFixed(2)}</span>
                <div class="btn-group">
                  <button class="btn btn-brand-dark btn-sm" data-action="preview" data-id="${v.id}"><i class="fa-regular fa-circle-play me-1"></i>Preview</button>
                  ${purchased ? `
                    <button class="btn btn-brand-green btn-sm" data-action="download" data-id="${v.id}"><i class="fa-solid fa-download me-1"></i>Download</button>
                  ` : `
                    <button class="btn btn-brand-yellow btn-sm" data-action="buy" data-id="${v.id}"><i class="fa-solid fa-cart-shopping me-1"></i>Comprar</button>
                  `}
                </div>
              </div>
            </div>
          </div>
        `;
        listEl.appendChild(col);
      });
    }

    function findCourt(id) { return state.courts.find(c => c.id === id); }

    function apply() {
      const selCourt = courtSel.value;
      const selDate = dateEl.value;
      const selStart = minutes(startEl.value);
      const selEnd = minutes(endEl.value);
      const pool = [...state.videos, ...state.serverVideos];
      const filtered = pool.filter(v => {
        const okCourt = !selCourt || v.courtId === selCourt;
        const okDate = !selDate || v.date === selDate;
        const vStart = minutes(v.start); const vEnd = minutes(v.end);
        const okTime = overlap(vStart, vEnd, selStart, selEnd);
        return okCourt && okDate && okTime;
      });
      render(filtered);
    }

    applyBtn.addEventListener('click', apply);
    clearBtn.addEventListener('click', () => { courtSel.value=''; dateEl.value=''; startEl.value=''; endEl.value=''; apply(); });
    (async () => {
      await loadServerClips(50);
      apply(); // initial render after fetching server clips
    })();

    // Delegated actions
    listEl.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;
      const id = btn.getAttribute('data-id');
      const action = btn.getAttribute('data-action');
      const video = [...state.videos, ...state.serverVideos].find(v => v.id === id);
      const user = getCurrentUser();

      if (action === 'preview') {
        const modalBody = document.getElementById('previewContent');
        if (video.hasMedia) {
          const src = video.mediaUrl || '../static/media/exemplo.mp4';
          modalBody.innerHTML = `<video controls style="width:100%" src="${src}" poster="${video.thumb}"></video>`;
        } else {
          modalBody.innerHTML = `<img src="${video.thumb}" alt="preview" style="width:100%; border-radius:.5rem">`;
        }
        const modal = new bootstrap.Modal(document.getElementById('previewModal'));
        modal.show();
      }

      if (action === 'buy') {
        if (!user) {
          pendingBuyId = video.id;
          const cachedEmail = getAnonEmail();
          if (buyEmailEl && cachedEmail) buyEmailEl.value = cachedEmail;
          if (buyModal) buyModal.show();
          else {
            const email = prompt('Informe seu email para receber o comprovante:');
            if (!email) return;
            if (!isValidEmail(email)) { showAlert(alertContainer, 'Email inválido.', 'danger'); return; }
            setAnonEmail(email);
            startPagSeguroPix(video, email);
            }
          return;
        }
        // Usuário logado: iniciar PagSeguro também
        startPagSeguroPix(video, user.email);
      }

      if (action === 'download') {
        const canDownload = isPurchasedByAny(video.id);
        if (!canDownload) { showAlert(alertContainer, 'Você precisa comprar antes de baixar.', 'danger'); return; }
        if (!video.hasMedia) { showAlert(alertContainer, 'Arquivo placeholder não disponível no projeto (opcional).', 'info'); return; }
        const a = document.createElement('a');
        a.href = video.mediaUrl || '../static/media/exemplo.mp4';
        a.download = 'replay.mp4';
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
    });

    // Confirm purchase in modal (anonymous)
    buyConfirmBtn?.addEventListener('click', () => {
      const email = buyEmailEl?.value.trim();
      if (!email) return;
      if (!isValidEmail(email)) { showAlert(alertContainer, 'Email inválido.', 'danger'); return; }
      if (!pendingBuyId) return;
      setAnonEmail(email);
      const video = [...state.videos, ...state.serverVideos].find(v => v.id === pendingBuyId);
      pendingBuyId = null;
      buyModal?.hide();
      startPagSeguroPix(video, email);
    });

    // Copy PIX code
    pixCopyBtn?.addEventListener('click', async () => {
      const text = pixCodeTextEl?.value || '';
      if (!text) return;
      try { await navigator.clipboard.writeText(text); } catch {}
      pixStatusEl && (pixStatusEl.textContent = 'Código copiado. Aguarde a confirmação do pagamento...');
    });

    // Start payment via PagSeguro (PIX)
    async function startPagSeguroPix(video, email) {
      if (!video || !email) return;
      try {
        const res = await fetch(`${API_BASE}/pay/pagseguro/start`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ video_id: video.id, title: video.title, price: video.price, email })
        });
        if (!res.ok) throw new Error(`Erro ao iniciar pagamento: ${res.status}`);
        const data = await res.json();
        // Show PIX modal
        if (pixCodeTextEl) pixCodeTextEl.value = data?.qr_code?.text || '';
        if (pixQrImageEl && data?.qr_code?.image) {
          pixQrImageEl.src = data.qr_code.image;
          pixQrImageEl.style.display = 'block';
        } else if (pixQrImageEl) {
          pixQrImageEl.style.display = 'none';
        }
        if (pixStatusEl) pixStatusEl.textContent = 'Aguardando pagamento...';
        pixModal?.show();

        currentChargeId = data.charge_id;
        // Poll status
        clearInterval(pixPollTimer);
        pixPollTimer = setInterval(async () => {
          try {
            const sres = await fetch(`${API_BASE}/pay/pagseguro/status/${currentChargeId}`);
            if (!sres.ok) return;
            const sdata = await sres.json();
            const status = (sdata.status || '').toUpperCase();
            if (pixStatusEl) pixStatusEl.textContent = `Status: ${status}`;
            if (status === 'PAID' || status === 'PAID_OUT' || status === 'PAID_CONFIRMED') {
              clearInterval(pixPollTimer);
              // Mark purchase locally
              const user = getCurrentUser();
              const who = user?.email || getAnonEmail();
              if (who) addPurchase(who, video.id);
              showAlert(alertContainer, 'Pagamento confirmado! O download foi habilitado para este vídeo.', 'success');
              apply();
              // Auto-close modal after a moment
              setTimeout(() => { pixModal?.hide(); }, 1200);
            }
          } catch {}
        }, 4000);
      } catch (err) {
        console.error(err);
        showAlert(alertContainer, 'Falha ao iniciar pagamento. Compra simulada foi concluída para teste.', 'warning');
        const user = getCurrentUser();
        const who = user?.email || getAnonEmail();
        if (who && video?.id) {
          addPurchase(who, video.id);
          apply();
        }
      }
    }
  }

  // Payment page (form-based PIX)
  function initPayment() {
    const form = document.getElementById('payForm');
    if (!form) return;
    const emailEl = document.getElementById('payEmail');
    const descEl = document.getElementById('payDescription');
    const valueEl = document.getElementById('payValue');
    const videoIdEl = document.getElementById('payVideoId');
    const alertContainer = document.getElementById('alertContainer');
    const pixQrImageEl = document.getElementById('pixQrImagePay');
    const pixCodeTextEl = document.getElementById('pixCodeTextPay');
    const pixStatusEl = document.getElementById('pixStatusPay');
    const pixCopyBtn = document.getElementById('pixCopyPay');
    const pixCancelBtn = document.getElementById('pixCancelPay');
    const pixQrPlaceholderEl = document.getElementById('pixQrPlaceholder');
    const summaryTitleEl = document.getElementById('paySummaryTitle');
    const summaryPriceEl = document.getElementById('paySummaryPrice');
    const summaryCourtEl = document.getElementById('paySummaryCourt');
    const summaryDateEl = document.getElementById('paySummaryDate');
    let pollTimer = null;
    let chargeId = null;

    // Prefill from query string and current user
    const params = new URLSearchParams(location.search);
    const vid = params.get('video_id');
    videoIdEl.value = vid || '';
    const user = getCurrentUser();
    const cachedEmail = getAnonEmail();
    if (user?.email) emailEl.value = user.email; else if (cachedEmail) emailEl.value = cachedEmail;
    if (vid) {
      const v = [...state.videos, ...state.serverVideos].find(x => x.id === vid);
      if (v) {
        descEl.value = v.title;
        valueEl.value = v.price.toFixed(2);
        // Update summary fields
        summaryTitleEl && (summaryTitleEl.textContent = v.title);
        summaryPriceEl && (summaryPriceEl.textContent = `R$ ${v.price.toFixed(2)}`);
        summaryCourtEl && (summaryCourtEl.textContent = v.court || 'Quadra');
        summaryDateEl && (summaryDateEl.textContent = v.date || 'Data');
      } else {
        summaryTitleEl && (summaryTitleEl.textContent = `Replay #${vid}`);
        summaryPriceEl && (summaryPriceEl.textContent = `R$ ${parseFloat(valueEl.value || '0').toFixed(2)}`);
      }
    } else {
      // No video: reflect current form values
      summaryTitleEl && (summaryTitleEl.textContent = descEl.value || 'Replay');
      summaryPriceEl && (summaryPriceEl.textContent = `R$ ${(parseFloat(valueEl.value || '0')||0).toFixed(2)}`);
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = emailEl.value.trim();
      const desc = descEl.value.trim();
      const value = parseFloat(valueEl.value);
      if (!email || !desc || !value) { showAlert(alertContainer, 'Preencha todos os campos.', 'warning'); return; }
      if (!isValidEmail(email)) { showAlert(alertContainer, 'Email inválido.', 'danger'); return; }
      setAnonEmail(email); // salva para compras futuras

      // UI: start loading state
      const submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) { submitBtn.disabled = true; submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Gerando PIX...'; }
      pixStatusEl && (pixStatusEl.textContent = 'Gerando PIX...');

      try {
        const res = await fetch(`${API_BASE}/pay/pagseguro/start`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ video_id: vid, title: desc, price: value, email })
        });
        if (!res.ok) throw new Error(`Erro ao iniciar pagamento: ${res.status}`);
        const data = await res.json();
        // Render QR/code
        const qrText = data?.qr_code?.text || '';
        const qrImage = data?.qr_code?.image || '';
        if (pixCodeTextEl) pixCodeTextEl.value = qrText;
        if (pixQrImageEl && qrImage) {
          pixQrImageEl.src = qrImage;
          pixQrImageEl.style.display = 'block';
          pixQrPlaceholderEl && (pixQrPlaceholderEl.style.display = 'none');
        } else if (pixQrImageEl) {
          pixQrImageEl.style.display = 'none';
          // Show placeholder if we at least have text
          if (pixQrPlaceholderEl) pixQrPlaceholderEl.style.display = qrText ? 'none' : 'block';
        }
        if (pixStatusEl) pixStatusEl.textContent = 'Aguardando pagamento...';
        chargeId = data.charge_id;

        clearInterval(pollTimer);
        pollTimer = setInterval(async () => {
          try {
            const sres = await fetch(`${API_BASE}/pay/pagseguro/status/${chargeId}`);
            if (!sres.ok) return;
            const sdata = await sres.json();
            const status = (sdata.status || '').toUpperCase();
            if (pixStatusEl) pixStatusEl.textContent = `Status: ${status}`;
            if (status.startsWith('PAID')) {
              clearInterval(pollTimer);
              const who = user?.email || getAnonEmail();
              const v = vid || null;
              if (who && v) addPurchase(who, v);
              showAlert(alertContainer, 'Pagamento confirmado! Seu download foi habilitado em "Compras".', 'success');
            }
          } catch {}
        }, 4000);
      } catch (err) {
        console.error(err);
        showAlert(alertContainer, 'Falha ao iniciar pagamento. Você pode tentar novamente.', 'danger');
      }
      // UI: end loading state
      if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = '<i class="fa-solid fa-qrcode me-2"></i>Gerar PIX'; }
    });

    // Copy PIX code
    pixCopyBtn?.addEventListener('click', async () => {
      const text = pixCodeTextEl?.value || '';
      if (!text) return;
      try { await navigator.clipboard.writeText(text); } catch {}
      pixStatusEl && (pixStatusEl.textContent = 'Código copiado. Aguarde a confirmação do pagamento...');
    });

    // Cancel polling
    pixCancelBtn?.addEventListener('click', () => {
      clearInterval(pollTimer);
      pollTimer = null;
      chargeId = null;
      pixStatusEl && (pixStatusEl.textContent = 'Pagamento cancelado. Gere um novo PIX para tentar novamente.');
    });
  }

  // Init
  function init() {
    ensureSeed();
    updateNavbar();
    initLogin();
    initRegister();
    initSearch();
    initPurchases();
    initPayment();
  }

  document.addEventListener('DOMContentLoaded', init);
})();