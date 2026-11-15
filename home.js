// Inicio: portada, reloj, acciones, archivero, entregas y widgets de pomodoro y Spotify.
let clockTimer = null;

VIEWS.home = {
  render(main) {
    const p = state.profile;
    const cover = p.coverImage || coverURL(p.cover);
    main.innerHTML = `
      <div class="cover" style="background-image:url('${cover}')">
        <button class="cover-btn" id="coverBtn">🖼️ Cambiar portada</button>
      </div>
      <div class="page home">
        <div class="page-icon">${esc(p.emoji)}</div>
        <h1 class="page-title" contenteditable="true" spellcheck="false" id="homeTitle">${esc(p.title)}</h1>
        <p class="page-sub">Hola, <b>${esc(p.name)}</b> 👋 · ${esc(greeting())}</p>
        <div class="home-grid">
          <div class="col-left">
            <div class="clock-card">${clockSVG()}<div class="clock-digital" id="clockDigital"></div><div class="clock-date" id="clockDate"></div></div>
            <section class="block">
              <div class="block-head brown">⏻ Acciones</div>
              <div class="actions">
                <button data-act="note">📝 Nuevo apunte</button>
                <button data-act="task">✅ Nueva tarea</button>
                <button data-act="event">📅 Nuevo evento</button>
                <button data-act="board">🖍️ Nuevo pizarrón</button>
                <button data-act="money">💶 Añadir gasto</button>
                <button data-act="gym">🏋️ Registrar entreno</button>
                <button data-act="food">🍽️ Registrar comida</button>
                <button data-act="folder">📁 Añadir carpeta</button>
                ${Platform.canOpenFolders ? '<button data-act="vscode">💠 Abrir VS Code</button>' : ''}
                ${Platform.canOpenFolders ? '<button data-act="xampp">🐘 Abrir localhost</button>' : ''}
              </div>
            </section>
            <section class="block">
              <div class="block-head brown">👤 Personal <button class="mini-edit" id="editProfile" title="Editar">✎</button></div>
              <dl class="personal">
                <dt>Nombre</dt><dd>${esc(p.name)}</dd>
                <dt>Programa</dt><dd>${esc(p.program || '—')}</dd>
                ${p.school ? `<dt>Centro</dt><dd>${esc(p.school)}</dd>` : ''}
                <dt>Pomodoros hoy</dt><dd>🍅 ${state.pomodoro.day === dayKey(new Date()) ? state.pomodoro.today : 0}</dd>
                <dt>Entregas pendientes</dt><dd>${state.tasks.filter(t => t.status !== 'done').length}</dd>
              </dl>
            </section>
          </div>
          <div class="col-mid">
            <section class="block">
              <div class="block-head brown">🗂️ Mi archivero <button class="link-btn" data-go="files">Ver todo →</button></div>
              <div class="gallery" id="homeFolders"></div>
            </section>
            <section class="block">
              <div class="block-head brown">📌 Próximas entregas <button class="link-btn" data-go="tasks">Ver tareas →</button></div>
              <div id="homeTasks"></div>
            </section>
            <section class="block">
              <div class="block-head brown">📅 Próximos eventos <button class="link-btn" data-go="calendar">Ver calendario →</button></div>
              <div id="homeEvents"></div>
            </section>
            <section class="block" id="homeSportsBlock" hidden>
              <div class="block-head brown">🏆 Mis equipos <button class="link-btn" data-go="sports">Ver deportes →</button></div>
              <div id="homeSports"></div>
            </section>
            <section class="block">
              <div class="block-head brown">🕘 Apuntes recientes <button class="link-btn" data-go="notes">Ver apuntes →</button></div>
              <div class="recent-notes" id="homeNotes"></div>
            </section>
          </div>
          <div class="col-right">
            <div id="pomoSlot"></div>
            <div id="spotifySlot"></div>
          </div>
        </div>
      </div>`;

    $('#homeTitle').addEventListener('input', e => { state.profile.title = e.target.textContent.trim() || 'My Dev OS'; save(); });
    $('#homeTitle').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); e.target.blur(); } });
    $('#coverBtn').onclick = pickCover;
    $('#editProfile').onclick = editProfile;
    $$('[data-go]', main).forEach(b => b.onclick = () => go(b.dataset.go));
    $$('[data-act]', main).forEach(b => b.onclick = () => homeAction(b.dataset.act));

    renderHomeFolders($('#homeFolders'));
    renderHomeTasks($('#homeTasks'));
    renderHomeNotes($('#homeNotes'));
    renderHomeEvents($('#homeEvents'));
    renderHomeSports($('#homeSports'), $('#homeSportsBlock'));
    mountPomodoro($('#pomoSlot'));
    mountSpotify($('#spotifySlot'));
    startClock();
  },
  leave() { clearInterval(clockTimer); Pomo.tickers.clear(); }
};

function renderHomeEvents(el) {
  const list = upcomingEvents(30, 4);
  el.innerHTML = list.length ? `<div class="ev-list">${list.map(o => eventRowHTML(o.ev, o.key)).join('')}</div>`
    : '<p class="muted small">Sin eventos próximos. Añade exámenes, pagos o cumpleaños con <b>📅 Nuevo evento</b>.</p>';
  bindEventButtons(el);
}

function greeting() {
  const h = new Date().getHours();
  const late = state.tasks.filter(t => t.status !== 'done' && t.due && parseDue(t.due) - Date.now() < 2 * 864e5 && parseDue(t.due) > Date.now()).length;
  const base = h < 6 ? 'programando de madrugada 🌙' : h < 13 ? 'buenos días ☀️' : h < 20 ? 'buenas tardes 🌤️' : 'buenas noches 🌙';
  return late ? `${base} · tienes ${late} entrega${late > 1 ? 's' : ''} en menos de 48 h` : base;
}

function homeAction(act) {
  if (act === 'note') { go('notes', { newNote: true }); }
  else if (act === 'task') { editTask(null); }
  else if (act === 'event') { editEvent(null); }
  else if (act === 'board') { go('board', { newBoard: true }); }
  else if (act === 'folder') { editFolder(null); }
  else if (act === 'money') { editMovement(null); }
  else if (act === 'food') { state.health.tab = 'food'; state.health.foodDay = dayKey(new Date()); go('health'); if (nutritionTargets(dayKey(new Date()))) addFood(dayKey(new Date()), defaultMeal()); }
  else if (act === 'gym') { const d = (new Date().getDay() + 6) % 7; editSession(null, state.gym.plan[d]); }
  else if (act === 'vscode') { Platform.folders.openVSCode(null); toast('Abriendo VS Code…'); }
  else if (act === 'xampp') { Platform.openExternal('http://localhost/'); }
}

function clockSVG() {
  let ticks = '';
  for (let i = 0; i < 60; i++) {
    const a = i * 6 * Math.PI / 180, big = i % 5 === 0;
    const r1 = big ? 78 : 84, r2 = 90;
    ticks += `<line x1="${100 + r1 * Math.sin(a)}" y1="${100 - r1 * Math.cos(a)}" x2="${100 + r2 * Math.sin(a)}" y2="${100 - r2 * Math.cos(a)}" stroke="${big ? '#e5e5ea' : '#4a4a55'}" stroke-width="${big ? 2.4 : 1.2}" stroke-linecap="round"/>`;
  }
  return `<svg class="clock" viewBox="0 0 200 200">${ticks}
    <line id="hHand" x1="100" y1="100" x2="100" y2="52" stroke="#f4f4f6" stroke-width="5" stroke-linecap="round"/>
    <line id="mHand" x1="100" y1="100" x2="100" y2="30" stroke="#f4f4f6" stroke-width="3.2" stroke-linecap="round"/>
    <line id="sHand" x1="100" y1="114" x2="100" y2="24" stroke="#f472b6" stroke-width="1.6" stroke-linecap="round"/>
    <circle cx="100" cy="100" r="4.5" fill="#f472b6"/></svg>`;
}

function startClock() {
  clearInterval(clockTimer);
  const upd = () => {
    const d = new Date();
    const s = d.getSeconds() + d.getMilliseconds() / 1000, m = d.getMinutes() + s / 60, h = (d.getHours() % 12) + m / 60;
    const set = (id, deg) => { const el = document.getElementById(id); if (el) el.setAttribute('transform', `rotate(${deg} 100 100)`); };
    set('hHand', h * 30); set('mHand', m * 6); set('sHand', Math.floor(s) * 6);
    const dg = $('#clockDigital'), dd = $('#clockDate');
    if (dg) dg.textContent = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    if (dd) { const w = WEEKDAYS[d.getDay()]; dd.textContent = `${w[0].toUpperCase() + w.slice(1)}, ${d.getDate()} de ${MONTHS[d.getMonth()]}`; }
  };
  upd();
  clockTimer = setInterval(upd, 1000);
}

function renderHomeFolders(el) {
  el.innerHTML = state.folders.slice(0, 6).map((f, i) => folderCardHTML(f, i)).join('') ||
    '<p class="muted">Aún no hay carpetas.</p>';
  bindFolderCards(el);
}

function renderHomeTasks(el) {
  const list = state.tasks.filter(t => t.status !== 'done')
    .sort((a, b) => (a.due || '9').localeCompare(b.due || '9')).slice(0, 6);
  if (!list.length) { el.innerHTML = '<p class="empty-line">🎉 No tienes entregas pendientes.</p>'; return; }
  el.innerHTML = `<div class="due-list">${list.map(taskRowHTML).join('')}</div>`;
  bindTaskRows(el);
}

function renderHomeNotes(el) {
  const list = [...state.notes].sort((a, b) => b.updated - a.updated).slice(0, 4);
  el.innerHTML = list.map(n => `<button class="recent-note" data-note="${n.id}">
      <span class="rn-title">${esc(n.title || 'Sin título')}</span>
      <span class="rn-meta">${n.subject ? `<i style="background:${subjectColor(n.subject)}"></i>${esc(n.subject)} · ` : ''}${timeAgo(n.updated)}</span></button>`).join('')
    || '<p class="muted">Sin apuntes todavía.</p>';
  $$('[data-note]', el).forEach(b => b.onclick = () => go('notes', { id: b.dataset.note }));
}

function pickCover() {
  const opts = Object.entries(COVERS).map(([k, v]) =>
    `<button class="cover-opt ${state.profile.cover === k && !state.profile.coverImage ? 'sel' : ''}" data-cover="${k}" style="background-image:url('${coverURL(k)}')"><span>${v}</span></button>`).join('');
  modal({
    title: 'Portada', ok: null, cancel: 'Cerrar', wide: true,
    body: `<div class="cover-grid">${opts}</div>
      <div class="row" style="margin-top:14px"><label class="btn ghost">📷 Usar una imagen mía<input type="file" accept="image/*" id="coverFile" hidden></label>
      ${state.profile.coverImage ? '<button class="btn ghost" id="coverClear">Quitar imagen</button>' : ''}</div>`,
    onOpen(w, close) {
      $$('[data-cover]', w).forEach(b => b.onclick = () => { state.profile.cover = b.dataset.cover; state.profile.coverImage = null; save(); close(); rerender(); });
      $('#coverFile', w).onchange = e => {
        const f = e.target.files[0];
        if (!f) return;
        shrinkImage(f, 1800).then(url => { state.profile.coverImage = url; save(); close(); rerender(); });
      };
      const c = $('#coverClear', w);
      if (c) c.onclick = () => { state.profile.coverImage = null; save(); close(); rerender(); };
    }
  });
}

// Reduce la imagen para que el archivo de datos no crezca demasiado.
function shrinkImage(file, maxW) {
  return new Promise(resolve => {
    const r = new FileReader();
    r.onload = () => {
      const img = new Image();
      img.onload = () => {
        const sc = Math.min(1, maxW / img.width);
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * sc); c.height = Math.round(img.height * sc);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL('image/jpeg', 0.85));
      };
      img.src = r.result;
    };
    r.readAsDataURL(file);
  });
}

function editProfile() {
  const p = state.profile;
  modal({
    title: 'Datos personales',
    body: `<label>Nombre<input id="pName" value="${esc(p.name)}"></label>
      <label>Programa / curso<input id="pProg" value="${esc(p.program)}"></label>
      <label>Centro de estudios<input id="pSchool" value="${esc(p.school)}" placeholder="Opcional"></label>
      <label>Ícono de la página<input id="pEmoji" value="${esc(p.emoji)}" maxlength="4"></label>`,
    onOk(w) {
      p.name = $('#pName', w).value.trim() || 'Luis';
      p.program = $('#pProg', w).value.trim();
      p.school = $('#pSchool', w).value.trim();
      p.emoji = $('#pEmoji', w).value.trim() || '💻';
      save(); rerender();
    }
  });
}

// ---------- Widget Pomodoro ----------
const POMO_THEMES = {
  nebula: 'nebula kiss',
  midnight: 'midnight purple',
  ocean: 'deep ocean',
  matrix: 'matrix'
};

function mountPomodoro(el) {
  const p = state.pomodoro;
  el.innerHTML = `<div class="pomo pomo-${p.theme}">
    <div class="pomo-blob"></div>
    <select class="pomo-theme" id="pomoTheme">${Object.entries(POMO_THEMES).map(([k, v]) => `<option value="${k}" ${k === p.theme ? 'selected' : ''}>✦ ${v}</option>`).join('')}</select>
    <div class="pomo-time" id="pomoTime">${Pomo.fmt()}</div>
    <div class="pomo-modes">${Object.entries(Pomo.modes).map(([k, v]) => `<button data-mode="${k}" class="${Pomo.mode === k ? 'on' : ''}">${v === 'pomodoro' ? 'pomodoro' : v === 'descanso corto' ? 'short break' : 'long break'}</button>`).join('')}</div>
    <div class="pomo-ctrl"><button id="pomoStart">${Pomo.running ? 'pause' : 'start'}</button><button id="pomoReset">reset</button></div>
    <button class="pomo-cfg" id="pomoCfg" title="Ajustar tiempos">⚙</button>
  </div>`;
  const draw = txt => {
    const t = $('#pomoTime', el); if (!t) return;
    t.textContent = txt;
    $('#pomoStart', el).textContent = Pomo.running ? 'pause' : 'start';
    $$('[data-mode]', el).forEach(b => b.classList.toggle('on', b.dataset.mode === Pomo.mode));
  };
  Pomo.tickers.add(draw);
  $('#pomoTheme', el).onchange = e => { p.theme = e.target.value; save(); mountPomodoro(el); };
  $$('[data-mode]', el).forEach(b => b.onclick = () => Pomo.setMode(b.dataset.mode));
  $('#pomoStart', el).onclick = () => Pomo.toggle();
  $('#pomoReset', el).onclick = () => Pomo.reset();
  $('#pomoCfg', el).onclick = () => modal({
    title: 'Tiempos del pomodoro',
    body: `<div class="row3"><label>Pomodoro (min)<input type="number" min="1" max="120" id="pw" value="${p.work}"></label>
      <label>Descanso corto<input type="number" min="1" max="60" id="ps" value="${p.short}"></label>
      <label>Descanso largo<input type="number" min="1" max="60" id="pl" value="${p.long}"></label></div>
      <label class="check"><input type="checkbox" id="pa" ${p.autoNext ? 'checked' : ''}> Empezar el siguiente automáticamente</label>
      <p class="muted small">Cada 4 pomodoros toca un descanso largo. Al terminar suena un aviso y te llega una notificación.</p>`,
    onOk(w) {
      const n = (id, d) => Math.max(1, Math.min(180, parseInt($(id, w).value, 10) || d));
      p.work = n('#pw', 25); p.short = n('#ps', 5); p.long = n('#pl', 15); p.autoNext = $('#pa', w).checked;
      save();
      if (!Pomo.running) Pomo.reset();
    }
  });
}

// ---------- Widget Spotify ----------
function spotifyEmbed(url) {
  const s = String(url || '').trim();
  let m = s.match(/^spotify:(playlist|album|track|artist|show|episode):([A-Za-z0-9]+)/);
  if (!m) m = s.match(/open\.spotify\.com\/(?:intl-[a-z-]+\/)?(?:embed\/)?(playlist|album|track|artist|show|episode)\/([A-Za-z0-9]+)/);
  return m ? { type: m[1], id: m[2], embed: `https://open.spotify.com/embed/${m[1]}/${m[2]}?utm_source=generator&theme=0`, open: `https://open.spotify.com/${m[1]}/${m[2]}` } : null;
}

// El reproductor vive en una capa fija que nunca se recrea, así la música sigue sonando al cambiar de vista.
// En el inicio se coloca sobre su hueco; en las demás vistas queda oculto pero sigue sonando.
const SpotDock = {
  el: null, frame: null, src: '',
  ensure() {
    if (this.el) return;
    this.el = document.createElement('div');
    this.el.id = 'spDock';
    this.el.className = 'sp-dock';
    this.frame = document.createElement('iframe');
    this.frame.setAttribute('allow', 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture');
    this.frame.setAttribute('frameborder', '0');
    this.frame.title = 'Spotify';
    this.el.appendChild(this.frame);
    document.body.appendChild(this.el);
    this.update();
    const loop = () => { this.place(); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  },
  current() { return spotifyEmbed(state.spotify.url) || spotifyEmbed(defaultState().spotify.url); },
  update() {
    const sp = this.current();
    if (this.src !== sp.embed) { this.src = sp.embed; this.frame.src = sp.embed; }
  },
  place() {
    const slots = [$('#spotifyFrameSlot')];
    const target = slots.find(s => s && s.offsetWidth > 0 && s.offsetHeight > 0);
    const st = this.el.style;
    if (!target || document.body.classList.contains('sp-off')) {
      st.visibility = 'hidden'; st.left = '-2000px'; return;
    }
    const r = target.getBoundingClientRect();
    st.visibility = 'visible';
    st.left = r.left + 'px'; st.top = r.top + 'px'; st.width = r.width + 'px'; st.height = r.height + 'px';
    const main = $('#main');
    if (main && main.contains(target)) {
      const m = main.getBoundingClientRect();
      st.clipPath = `inset(${Math.max(0, m.top - r.top)}px 0 ${Math.max(0, r.bottom - m.bottom)}px 0 round 12px)`;
    } else st.clipPath = 'inset(0 round 12px)';
  }
};

function mountSpotify(el) {
  SpotDock.ensure();
  SpotDock.update();
  const recent = (state.spotify.recent || []).filter(r => spotifyEmbed(r.url) && spotifyEmbed(r.url).id !== SpotDock.current().id).slice(0, 4);
  el.innerHTML = `<div class="spotify">
    <div class="spotify-head"><span class="sp-logo">${SPOTIFY_ICON}</span> Mi música
      <button class="sp-pick" id="spEdit" title="Buscar entre tus playlists">🔎 Mis playlists</button></div>
    <div id="spotifyFrameSlot" class="sp-slot"></div>
    ${recent.length ? `<div class="sp-recent">${recent.map(r => `<button class="sp-chip" data-sp="${esc(r.url)}" title="${esc(r.name)}">${r.img ? `<img src="${esc(r.img)}" alt="">` : '🎵'}<span>${esc(r.name)}</span></button>`).join('')}</div>` : ''}
    <div class="sp-foot"><button class="link-btn" id="spOpen">Abrir en Spotify ↗</button><span class="muted small">${Spotify.connected() ? `Conectado como ${esc((state.spotify.user || {}).name || 'tú')}` : 'Inicia sesión en el reproductor para escuchar canciones completas'}</span></div>
  </div>`;
  $('#spOpen', el).onclick = () => Platform.openExternal(SpotDock.current().open);
  $('#spEdit', el).onclick = editSpotify;
  $$('[data-sp]', el).forEach(b => b.onclick = () => Spotify.choose(state.spotify.recent.find(r => r.url === b.dataset.sp)));
}

const SPOTIFY_PRESETS = [
  { name: '🎧 Lofi Girl', url: 'https://open.spotify.com/playlist/0vvXsWCC9xrXsKd4FyS8kM' },
  { name: '🧠 Deep Focus', url: 'https://open.spotify.com/playlist/37i9dQZF1DWZeKCadgRdKQ' },
  { name: '⚡ Brain Food', url: 'https://open.spotify.com/playlist/37i9dQZF1DWXLeA8Omikj7' },
  { name: '🎹 Peaceful Piano', url: 'https://open.spotify.com/playlist/37i9dQZF1DX4sWSpwq3LiO' }
];

const SPOTIFY_ICON = '<svg viewBox="0 0 24 24" width="18" height="18"><circle cx="12" cy="12" r="12" fill="#1ed760"/><path d="M6.5 9.3c3.6-1 7.6-.7 10.9 1.1M7 12.4c3-.8 6.3-.5 9 1M7.6 15.2c2.4-.6 4.8-.4 6.9.8" stroke="#000" stroke-width="1.6" fill="none" stroke-linecap="round"/></svg>';
