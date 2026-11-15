// Arranque: barra lateral, atajos, autoguardado y recordatorios.
const NAV = [
  ['home', '🏠', 'Inicio'],
  ['files', '🗂️', 'Archivero'],
  ['notes', '📝', 'Apuntes'],
  ['board', '🖍️', 'Pizarrón'],
  ['tasks', '✅', 'Tareas'],
  ['calendar', '📆', 'Calendario'],
  ['finance', '💶', 'Finanzas'],
  ['health', '❤️', 'Salud personal'],
  ['sports', '🏆', 'Deportes'],
  ['settings', '⚙️', 'Ajustes']
];

function renderShell() {
  document.body.classList.add('platform-' + Platform.kind);
  $('#app').innerHTML = `
    <nav class="sidebar">
      <div class="brand"><span class="brand-logo">L</span><div><b>Luis OS</b><small>mi espacio</small></div><button class="lock-btn" id="lockNow" title="Bloquear (PIN)">🔒</button></div>
      <div class="nav">${NAV.map(([k, i, n]) => `<button data-nav="${k}"><span class="ni">${i}</span><span class="nl">${n}</span></button>`).join('')}</div>
      <div class="side-bottom">
        <button class="mini-pomo" id="miniPomo" title="Pomodoro"><span class="mini-dot"></span><span class="mini-time">25:00</span><span class="mini-mode">pomodoro en pausa</span></button>
        <div id="saveState" class="save-state">Todo guardado</div>
      </div>
    </nav>
    <main id="main"></main>`;
  $$('[data-nav]').forEach(b => b.onclick = () => go(b.dataset.nav));
  $('#lockNow').onclick = () => Lock.show();
  $('#miniPomo').onclick = () => { if (currentView !== 'home') go('home'); else Pomo.toggle(); };
}

function shortcuts(e) {
  const mod = e.ctrlKey || e.metaKey;
  if (!mod) return;
  const k = e.key.toLowerCase();
  if (k === 'n') { e.preventDefault(); go('notes', { newNote: true }); }
  else if (k === 'k') { e.preventDefault(); if (currentView !== 'notes') go('notes'); setTimeout(() => $('#nSearch')?.focus(), 30); }
  else if (k === 's') { e.preventDefault(); commitEditor(); flushSave(); setSaveIndicator('saved'); }
}

async function start() {
  await loadState();
  Spotify.checkCallback();
  renderShell();
  Lock.init();
  Pomo.init();
  document.addEventListener('keydown', shortcuts);
  Platform.onFlush(() => { commitEditor(); flushSave(); });
  Platform.onGoto(v => go(v));
  window.addEventListener('beforeunload', () => { commitEditor(); flushSave(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) { commitEditor(); flushSave(); } });
  go(NAV.some(n => n[0] === state.settings.lastView) ? state.settings.lastView : 'home');
  SpotDock.ensure();
  save(true);
  autoDetectFolders().then(() => { if (currentView === 'files' || currentView === 'home') rerender(); });
  checkReminders();
  setInterval(checkReminders, 60000);
}

start();
