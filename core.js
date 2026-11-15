// Estado, guardado automático y utilidades compartidas.
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = n => String(n).padStart(2, '0');

const STATUSES = {
  todo:   { name: 'Sin empezar', color: '#8b8b98', icon: '⚪' },
  doing:  { name: 'En progreso', color: '#f5a524', icon: '🟡' },
  review: { name: 'En revisión', color: '#a78bfa', icon: '🟣' },
  done:   { name: 'Entregado',   color: '#22c55e', icon: '🟢' }
};
const PRIORITIES = { alta: '🔥 Alta', media: '⚡ Media', baja: '🌱 Baja' };

const SUBJECT_COLORS = ['#a78bfa', '#22d3ee', '#f472b6', '#f5a524', '#34d399', '#60a5fa', '#fb7185', '#facc15'];
const FOLDER_COLORS = ['#f97316', '#a855f7', '#3b82f6', '#22c55e', '#ec4899', '#06b6d4', '#eab308', '#ef4444', '#8b5cf6', '#14b8a6'];
const FOLDER_ICONS = ['☕', '🐘', '💠', '🧪', '📁', '🗄️', '🌐', '🐍', '⚛️', '🧩', '🛠️', '🎮', '📦', '🔐', '🖥️', '📝'];
const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const WEEKDAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

function defaultState() {
  const now = Date.now();
  return {
    version: 1,
    profile: { name: 'Luis', title: 'Mi espacio', program: '', school: '', cover: 'bosque', coverImage: null, emoji: '🚀' },
    subjects: [],
    folders: [],
    tasks: [],
    notes: [
      { id: uid(), title: 'Bienvenido a Luis OS 👋', subject: '', pinned: true, created: now, updated: now, html: NOTE_WELCOME }
    ],
    boards: [{ id: uid(), name: 'Pizarrón 1', bg: 'dots', shapes: [], updated: now }],
    pomodoro: { work: 25, short: 5, long: 15, theme: 'nebula', today: 0, day: '', total: 0, autoNext: false },
    spotify: { url: 'https://open.spotify.com/playlist/0vvXsWCC9xrXsKd4FyS8kM', clientId: '', token: null, user: null, playlists: [], saved: [], recent: [], pending: null, syncedAt: 0 },
    events: [],
    sports: { notify: {}, snap: {}, ids: {}, team: 'all' },
    settings: { openAtLogin: false, reminders: true, lastView: 'home', boardId: null, noteId: null, foldersChecked: false },
    finance: defaultFinance(),
    gym: defaultGym(),
    health: defaultHealth(),
    security: { pinHash: null, lockAfter: 5 },
    reminded: {}
  };
}

const NOTE_WELCOME = `<h1>Luis OS 🚀</h1>
<p>Todo lo que escribas aquí se guarda solo, en tu dispositivo.</p>
<h2>Atajos</h2>
<ul><li><b>Ctrl + N</b>: nuevo apunte</li><li><b>Ctrl + K</b>: buscar en apuntes</li><li><b>Ctrl + B / I / U</b>: negrita, cursiva, subrayado</li><li><b>Tab</b> dentro de un bloque de código: sangría</li></ul>
<h2>Ideas</h2>
<ul class="checklist"><li>Poner mi nombre, portada y materias en Inicio</li><li>Añadir mis carpetas al Archivero (en la PC)</li><li>Apuntar mis tareas y exámenes</li><li>Conectar mi Spotify</li><li>Elegir un PIN en Ajustes si quiero bloquear la app</li></ul>`;

let state = null;
let saveTimer = null;
let saveIndicatorTimer = null;

async function loadState() {
  let raw = null;
  try { raw = await Platform.load(); } catch (e) { console.error(e); }
  let data = null;
  if (raw) { try { data = typeof raw === 'string' ? JSON.parse(raw) : raw; } catch (e) { console.error('Datos dañados', e); } }
  state = data && data.version ? migrate(data) : defaultState();
}

// Completa campos que falten si los datos vienen de una versión anterior o de otra copia.
function migrate(data) {
  const def = defaultState();
  for (const k of Object.keys(def)) if (data[k] === undefined) data[k] = def[k];
  data.profile = { ...def.profile, ...data.profile };
  data.pomodoro = { ...def.pomodoro, ...data.pomodoro };
  data.settings = { ...def.settings, ...data.settings };
  data.spotify = { ...def.spotify, ...data.spotify };
  data.finance = { ...def.finance, ...data.finance, goals: { ...def.finance.goals, ...(data.finance || {}).goals, types: { ...def.finance.goals.types, ...((data.finance || {}).goals || {}).types } } };
  data.gym = data.gym ? migrateGym({ ...data.gym }) : def.gym;
  data.health = { ...def.health, ...data.health, profile: { ...def.health.profile, ...(data.health || {}).profile } };
  if (data.settings.lastView === 'gym') data.settings.lastView = 'health';
  data.security = { ...def.security, ...data.security };
  data.sports = { ...def.sports, ...data.sports };
  return data;
}

function serialize() { return JSON.stringify(state); }

function save(immediate = false) {
  clearTimeout(saveTimer);
  setSaveIndicator('saving');
  const run = async () => {
    try { await Platform.save(serialize()); setSaveIndicator('saved'); }
    catch (e) { console.error(e); setSaveIndicator('error'); }
  };
  if (immediate) run(); else saveTimer = setTimeout(run, 500);
}

function flushSave() {
  clearTimeout(saveTimer);
  try { Platform.saveSync(serialize()); } catch (e) { console.error(e); }
}

function setSaveIndicator(kind) {
  const el = $('#saveState');
  if (!el) return;
  clearTimeout(saveIndicatorTimer);
  el.className = 'save-state ' + kind;
  el.textContent = kind === 'saving' ? 'Guardando…' : kind === 'error' ? 'No se pudo guardar' : 'Guardado ✓';
  if (kind === 'saved') saveIndicatorTimer = setTimeout(() => { el.className = 'save-state'; el.textContent = 'Todo guardado'; }, 1800);
}

// ---------- Fechas ----------
function parseDue(s) { return s ? new Date(s) : null; }
function fmtDate(d, withYear = false) {
  return `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}${withYear ? ' ' + d.getFullYear() : ''}`;
}
function fmtTime(d) { return `${pad(d.getHours())}:${pad(d.getMinutes())}`; }
function dayKey(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function relDue(due) {
  const ms = due - Date.now();
  const abs = Math.abs(ms);
  const h = Math.floor(abs / 3600000), m = Math.floor((abs % 3600000) / 60000), d = Math.floor(h / 24);
  const txt = d >= 2 ? `${d} días` : h >= 1 ? `${h} h ${m} min` : `${m} min`;
  return ms >= 0 ? `faltan ${txt}` : `venció hace ${txt}`;
}
function taskIsLate(t) { return t.status !== 'done' && t.due && parseDue(t.due) < new Date(); }
function subjectColor(name) {
  const s = state.subjects.find(x => x.name === name);
  return s ? s.color : '#8b8b98';
}
function timeAgo(ts) {
  const m = Math.round((Date.now() - ts) / 60000);
  if (m < 1) return 'ahora';
  if (m < 60) return `hace ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? 'ayer' : `hace ${d} días`;
}

// ---------- Interfaz común ----------
function toast(msg, ms = 2600) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  $('#toasts').appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 300); }, ms);
}

// Ventana modal sencilla. body puede ser HTML; onOk recibe el contenedor y devuelve false para no cerrar.
function modal({ title, body, ok = 'Guardar', cancel = 'Cancelar', danger = false, onOk, onOpen, wide = false }) {
  const wrap = document.createElement('div');
  wrap.className = 'modal-wrap';
  wrap.innerHTML = `<div class="modal ${wide ? 'wide' : ''}" role="dialog">
    <h3>${esc(title)}</h3><div class="modal-body">${body}</div>
    <div class="modal-actions">${cancel ? `<button class="btn ghost" data-x>${esc(cancel)}</button>` : ''}${ok ? `<button class="btn ${danger ? 'danger' : 'primary'}" data-ok>${esc(ok)}</button>` : ''}</div></div>`;
  document.body.appendChild(wrap);
  const close = () => { wrap.remove(); document.removeEventListener('keydown', onKey); };
  const submit = async () => { if (onOk && (await onOk(wrap)) === false) return; close(); };
  const onKey = e => {
    if (e.key === 'Escape') close();
    if (e.key === 'Enter' && !e.shiftKey && e.target.tagName !== 'TEXTAREA') { e.preventDefault(); submit(); }
  };
  document.addEventListener('keydown', onKey);
  wrap.addEventListener('mousedown', e => { if (e.target === wrap) close(); });
  $$('[data-x]', wrap).forEach(b => b.onclick = close);
  const okBtn = $('[data-ok]', wrap);
  if (okBtn) okBtn.onclick = submit;
  if (onOpen) onOpen(wrap, close);
  const first = $('input, textarea, select', wrap);
  if (first) setTimeout(() => first.focus(), 30);
  return close;
}

function confirmBox(title, text, okLabel = 'Eliminar') {
  return new Promise(resolve => {
    modal({ title, body: `<p class="muted">${esc(text)}</p>`, ok: okLabel, danger: true, onOk: () => resolve(true) });
    // Si se cierra sin confirmar, la promesa simplemente no se resuelve en true.
  });
}

// ---------- Navegación ----------
const VIEWS = {};
let currentView = 'home';

function go(view, opts) {
  if (!VIEWS[view]) view = 'home';
  if (VIEWS[currentView] && VIEWS[currentView].leave) VIEWS[currentView].leave();
  currentView = view;
  state.settings.lastView = view;
  $$('[data-nav]').forEach(b => { b.classList.toggle('active', b.dataset.nav === view); if (b.dataset.nav === view && b.scrollIntoView) b.scrollIntoView({ block: 'nearest', inline: 'nearest' }); });
  const main = $('#main');
  main.scrollTop = 0;
  main.dataset.view = view;
  document.body.dataset.view = view;
  VIEWS[view].render(main, opts || {});
  save();
}

function rerender() {
  const v = VIEWS[currentView];
  if (!v) return;
  if (v.leave) v.leave();
  v.render($('#main'), {});
}

// ---------- Pomodoro (sigue corriendo aunque cambies de vista) ----------
const Pomo = {
  mode: 'work',
  running: false,
  endsAt: 0,
  remaining: 25 * 60 * 1000,
  tickers: new Set(),
  modes: { work: 'pomodoro', short: 'descanso corto', long: 'descanso largo' },
  length(mode) { return (state.pomodoro[mode] || 25) * 60 * 1000; },
  init() { this.remaining = this.length(this.mode); setInterval(() => this.tick(), 250); },
  setMode(mode) { this.mode = mode; this.running = false; this.remaining = this.length(mode); this.emit(); },
  toggle() {
    if (this.running) { this.remaining = Math.max(0, this.endsAt - Date.now()); this.running = false; }
    else { if (this.remaining <= 0) this.remaining = this.length(this.mode); this.endsAt = Date.now() + this.remaining; this.running = true; unlockAudio(); }
    this.emit();
  },
  reset() { this.running = false; this.remaining = this.length(this.mode); this.emit(); },
  left() { return this.running ? Math.max(0, this.endsAt - Date.now()) : this.remaining; },
  tick() {
    if (this.running && this.left() <= 0) this.finish();
    this.emit();
  },
  finish() {
    this.running = false;
    this.remaining = 0;
    const p = state.pomodoro;
    const today = dayKey(new Date());
    if (this.mode === 'work') {
      if (p.day !== today) { p.day = today; p.today = 0; }
      p.today++; p.total++;
      save();
    }
    chime();
    const wasWork = this.mode === 'work';
    Platform.notify(wasWork ? '🍅 ¡Pomodoro terminado!' : '⏰ Fin del descanso',
      wasWork ? 'Buen trabajo. Tómate un descanso.' : 'A seguir programando 💻', 'home');
    const next = wasWork ? ((p.day === today && p.today % 4 === 0) ? 'long' : 'short') : 'work';
    this.setMode(next);
    if (p.autoNext) this.toggle();
  },
  fmt() {
    const s = Math.ceil(this.left() / 1000);
    return `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;
  },
  emit() {
    const txt = this.fmt();
    for (const fn of this.tickers) fn(txt);
    const mini = $('#miniPomo');
    if (mini) {
      mini.classList.toggle('on', this.running);
      $('.mini-time', mini).textContent = txt;
      $('.mini-mode', mini).textContent = this.running ? this.modes[this.mode] : 'pomodoro en pausa';
    }
    document.title = this.running ? `${txt} · Luis OS` : 'Luis OS';
  }
};

let audioCtx = null;
function unlockAudio() {
  try { if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)(); audioCtx.resume(); } catch (e) { /* sin audio */ }
}
function chime() {
  try {
    unlockAudio();
    const t0 = audioCtx.currentTime;
    [659.25, 783.99, 1046.5, 783.99, 1046.5].forEach((f, i) => {
      const o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.type = 'sine'; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t0 + i * 0.18);
      g.gain.exponentialRampToValueAtTime(0.25, t0 + i * 0.18 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + i * 0.18 + 0.5);
      o.connect(g).connect(audioCtx.destination);
      o.start(t0 + i * 0.18); o.stop(t0 + i * 0.18 + 0.55);
    });
  } catch (e) { /* sin audio */ }
  if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
}
