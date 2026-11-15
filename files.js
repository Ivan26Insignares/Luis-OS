// Archivero: accesos a las carpetas de Luis, con su contenido y acciones rápidas.
const folderStatus = {};

VIEWS.files = {
  render(main, opts) {
    const sel = opts.id || VIEWS.files.selected || (state.folders[0] && state.folders[0].id);
    VIEWS.files.selected = sel;
    main.innerHTML = `<div class="page">
      <div class="view-head"><div><h1>🗂️ Archivero</h1><p class="muted">Tus carpetas a un clic.</p></div>
        <div class="row"><button class="btn primary" id="addFolder">＋ Añadir carpeta</button></div></div>
      ${Platform.canOpenFolders ? '' : `<div class="notice">📱 En el celular las carpetas no se pueden abrir: viven en el disco de tu PC (Windows no las comparte con el teléfono). Aquí ves la lista como referencia; ábrelas desde la app de Windows.</div>`}
      <div class="files-layout">
        <div class="gallery big" id="folderGrid"></div>
        <aside class="folder-detail" id="folderDetail"></aside>
      </div></div>`;
    $('#addFolder').onclick = () => editFolder(null);
    const grid = $('#folderGrid');
    grid.innerHTML = state.folders.map((f, i) => folderCardHTML(f, i, f.id === sel)).join('') ||
      '<p class="muted">No hay carpetas. Añade una con el botón de arriba.</p>';
    bindFolderCards(grid, id => {
      VIEWS.files.selected = id;
      $$('.fcard', grid).forEach(c => c.classList.toggle('sel', c.dataset.folder === id));
      renderFolderDetail($('#folderDetail'), state.folders.find(f => f.id === id));
    });
    renderFolderDetail($('#folderDetail'), state.folders.find(f => f.id === sel));
  }
};

function folderCardHTML(f, i, selected) {
  const st = folderStatus[f.id];
  const badge = !Platform.canOpenFolders ? '' : !st ? '<span class="fstat">…</span>'
    : st.exists ? '<span class="fstat ok">● lista</span>' : '<span class="fstat bad">● no encontrada</span>';
  return `<div class="fcard ${selected ? 'sel' : ''}" data-folder="${f.id}" tabindex="0">
    <div class="fcard-art" style="background-image:url('${cardArtURL(f.color, hashStr(f.name) + i)}')"><span class="fcard-icon">${esc(f.icon)}</span></div>
    <div class="fcard-body">
      <div class="fcard-title">${esc(f.name)}</div>
      <div class="fcard-tags"><span class="tag" style="--c:${f.color}">${esc(f.tag || 'Carpeta')}</span>${badge}</div>
      <div class="fcard-desc">${esc(f.desc || '')}</div>
    </div></div>`;
}

// Un clic abre la carpeta (en el PC); en el archivero, un clic la selecciona y doble clic la abre.
function bindFolderCards(el, onSelect) {
  $$('[data-folder]', el).forEach(card => {
    const f = state.folders.find(x => x.id === card.dataset.folder);
    card.onclick = () => {
      if (onSelect) onSelect(f.id);
      else if (Platform.canOpenFolders) openFolder(f);
      else go('files', { id: f.id });
    };
    card.ondblclick = () => { if (onSelect && Platform.canOpenFolders) openFolder(f); };
    card.onkeydown = e => { if (e.key === 'Enter') openFolder(f); };
  });
  refreshFolderStatus(el);
}

async function refreshFolderStatus(el) {
  if (!Platform.canOpenFolders) return;
  for (const f of state.folders) {
    const st = await Platform.folders.resolveFolder(f.path);
    const prev = folderStatus[f.id];
    folderStatus[f.id] = st;
    if (!prev || prev.exists !== st.exists) {
      const card = el.querySelector(`[data-folder="${f.id}"] .fcard-tags`);
      if (card) {
        const old = $('.fstat', card);
        if (old) old.outerHTML = st.exists ? '<span class="fstat ok">● lista</span>' : '<span class="fstat bad">● no encontrada</span>';
      }
    }
  }
}

// En la primera ejecución en Windows, intenta encontrar solo las carpetas si la ruta supuesta no existe.
async function autoDetectFolders() {
  if (!Platform.canOpenFolders || state.settings.foldersChecked) return;
  let fixed = 0;
  for (const f of state.folders) {
    const st = await Platform.folders.resolveFolder(f.path);
    if (st.exists || !f.find) continue;
    const found = await Platform.folders.findFolder(f.find);
    if (found) { f.path = found; fixed++; }
  }
  state.settings.foldersChecked = true;
  save();
  if (fixed) toast(`Encontré ${fixed} carpeta${fixed > 1 ? 's' : ''} en tu PC y actualicé la ruta`);
}

async function openFolder(f) {
  if (!Platform.canOpenFolders) { toast('Esta carpeta se abre desde la app del PC'); return; }
  const st = await Platform.folders.resolveFolder(f.path);
  if (!st.exists) {
    modal({
      title: `No encuentro "${f.name}"`,
      body: `<p class="muted">Busqué en <code>${esc(st.path)}</code> y no existe.</p><p>¿Dónde está esa carpeta en tu PC?</p>`,
      ok: '📂 Elegir carpeta', cancel: 'Ahora no',
      onOk: async () => { await pickFolderPath(f); }
    });
    return;
  }
  const err = await Platform.folders.openFolder(f.path);
  if (err) toast(err); else toast(`Abriendo ${f.name}…`, 1400);
}

async function pickFolderPath(f) {
  const p = await Platform.folders.pickFolder(f.path);
  if (!p) return false;
  f.path = p;
  delete folderStatus[f.id];
  save(); rerender();
  toast('Ruta actualizada ✓');
  return true;
}

async function renderFolderDetail(el, f) {
  if (!f) { el.innerHTML = '<p class="muted">Elige una carpeta.</p>'; return; }
  const canOpen = Platform.canOpenFolders;
  const st = canOpen ? await Platform.folders.resolveFolder(f.path) : { path: f.path, exists: false };
  el.innerHTML = `
    <div class="fd-head"><span class="fd-icon" style="background:${f.color}">${esc(f.icon)}</span>
      <div><h2>${esc(f.name)}</h2><div class="muted small">${esc(f.desc || '')}</div></div></div>
    <div class="fd-path ${canOpen ? (st.exists ? 'ok' : 'bad') : ''}"><code>${esc(st.path)}</code></div>
    <div class="fd-actions">
      ${canOpen ? `<button class="btn primary" data-a="open">📂 Abrir carpeta</button>
      <button class="btn" data-a="code">💠 Abrir en VS Code</button>` : ''}
      ${f.url ? `<button class="btn" data-a="url">🌐 Abrir ${esc(f.url.replace(/^https?:\/\//, '').replace(/\/$/, ''))}</button>` : ''}
      ${canOpen ? `<button class="btn ghost" data-a="pick">📍 Cambiar ruta</button>` : ''}
      <button class="btn ghost" data-a="edit">✎ Editar</button>
      <button class="btn ghost danger-text" data-a="del">🗑</button>
    </div>
    ${canOpen && !st.exists ? `<div class="notice warn">No encuentro esta carpeta. Pulsa <b>Cambiar ruta</b> y elígela, o <button class="link-btn" data-a="mk">créala aquí</button>.</div>` : ''}
    <div class="fd-list" id="fdList">${canOpen && st.exists ? '<p class="muted small">Cargando…</p>' : ''}</div>`;

  const act = {
    open: () => openFolder(f),
    code: async () => { const ok = await Platform.folders.openVSCode(f.path); toast(ok ? 'Abriendo en VS Code…' : 'No encontré VS Code instalado'); },
    url: () => Platform.openExternal(f.url),
    pick: () => pickFolderPath(f),
    edit: () => editFolder(f),
    mk: async () => { await Platform.folders.createFolder(f.path); delete folderStatus[f.id]; rerender(); toast('Carpeta creada ✓'); },
    del: async () => {
      if (await confirmBox('Quitar del archivero', `Se quita "${f.name}" del archivero. La carpeta de tu PC NO se borra.`, 'Quitar')) {
        state.folders = state.folders.filter(x => x.id !== f.id);
        VIEWS.files.selected = null;
        save(); rerender();
      }
    }
  };
  $$('[data-a]', el).forEach(b => b.onclick = act[b.dataset.a]);

  if (!canOpen || !st.exists) return;
  const res = await Platform.folders.listFolder(f.path);
  const list = $('#fdList', el);
  if (!list) return;
  if (!res.items.length) { list.innerHTML = '<p class="muted small">La carpeta está vacía.</p>'; return; }
  list.innerHTML = `<div class="fd-list-head">Contenido · ${res.items.length}${res.items.length >= 80 ? '+' : ''} elementos (más recientes primero)</div>` +
    res.items.map((it, i) => `<div class="fd-item" data-i="${i}">
      <span class="fd-ico">${it.dir ? '📁' : fileIcon(it.name)}</span>
      <span class="fd-name">${esc(it.name)}</span>
      <span class="fd-date">${it.mtime ? timeAgo(it.mtime) : ''}</span>
      ${it.dir ? `<button class="mini-btn" data-code="${i}" title="Abrir en VS Code">💠</button>` : ''}
    </div>`).join('');
  $$('.fd-item', list).forEach(row => {
    const it = res.items[+row.dataset.i];
    row.onclick = e => {
      if (e.target.closest('[data-code]')) { Platform.folders.openVSCode(it.path); toast('Abriendo en VS Code…'); return; }
      Platform.folders.openFolder(it.path);
    };
  });
}

function fileIcon(name) {
  const ext = (name.split('.').pop() || '').toLowerCase();
  return { java: '☕', php: '🐘', html: '🌐', htm: '🌐', css: '🎨', js: '🟨', ts: '🔷', json: '🧾', sql: '🗄️', py: '🐍', md: '📝', txt: '📄', pdf: '📕', zip: '📦', rar: '📦', jar: '☕', png: '🖼️', jpg: '🖼️', xml: '🧾', docx: '📘' }[ext] || '📄';
}

function editFolder(f) {
  const isNew = !f;
  const cur = f || { name: '', desc: '', tag: '', icon: '📁', color: FOLDER_COLORS[state.folders.length % FOLDER_COLORS.length], path: '', url: '' };
  modal({
    title: isNew ? 'Nueva carpeta en el archivero' : 'Editar carpeta',
    body: `<label>Nombre<input id="fName" value="${esc(cur.name)}" placeholder="Ej. Proyectos Python"></label>
      <label>Ruta en tu PC<div class="row"><input id="fPath" value="${esc(cur.path)}" placeholder="C:\\Users\\Luis\\Documents\\...">
        ${Platform.canOpenFolders ? '<button class="btn ghost" id="fPick" type="button">📂</button>' : ''}</div></label>
      <p class="muted small">Puedes escribir <code>{documents}</code> para tu carpeta Documentos (aunque esté en OneDrive).</p>
      <div class="row2"><label>Etiqueta<input id="fTag" value="${esc(cur.tag)}" placeholder="Ej. Clase · Trabajos"></label>
      <label>Descripción<input id="fDesc" value="${esc(cur.desc)}"></label></div>
      <label>Enlace web (opcional)<input id="fUrl" value="${esc(cur.url || '')}" placeholder="http://localhost/mi-proyecto/"></label>
      <div class="lbl">Ícono</div><div class="pick-row" id="fIcons">${FOLDER_ICONS.map(i => `<button type="button" class="pick ${i === cur.icon ? 'sel' : ''}" data-v="${i}">${i}</button>`).join('')}</div>
      <div class="lbl">Color</div><div class="pick-row" id="fColors">${FOLDER_COLORS.map(c => `<button type="button" class="pick dot ${c === cur.color ? 'sel' : ''}" data-v="${c}" style="background:${c}"></button>`).join('')}</div>`,
    onOpen(w) {
      for (const id of ['#fIcons', '#fColors']) {
        $$(id + ' .pick', w).forEach(b => b.onclick = () => { $$(id + ' .pick', w).forEach(x => x.classList.remove('sel')); b.classList.add('sel'); });
      }
      const pick = $('#fPick', w);
      if (pick) pick.onclick = async () => {
        const p = await Platform.folders.pickFolder($('#fPath', w).value);
        if (p) { $('#fPath', w).value = p; if (!$('#fName', w).value) $('#fName', w).value = p.split(/[\\/]/).pop(); }
      };
    },
    onOk(w) {
      const name = $('#fName', w).value.trim();
      if (!name) { toast('Ponle un nombre'); return false; }
      const data = {
        name, path: $('#fPath', w).value.trim(), tag: $('#fTag', w).value.trim(), desc: $('#fDesc', w).value.trim(),
        url: $('#fUrl', w).value.trim(),
        icon: $('#fIcons .sel', w)?.dataset.v || '📁', color: $('#fColors .sel', w)?.dataset.v || '#3b82f6'
      };
      if (isNew) { const nf = { id: uid(), ...data }; state.folders.push(nf); VIEWS.files.selected = nf.id; }
      else { Object.assign(f, data); delete folderStatus[f.id]; }
      save();
      if (currentView === 'files') rerender(); else go('files', { id: VIEWS.files.selected });
    }
  });
}
