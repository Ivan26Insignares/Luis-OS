// Apuntes: lista por materia + editor enriquecido con bloques de código.
VIEWS.notes = {
  q: '',
  subject: '',
  render(main, opts) {
    const v = VIEWS.notes;
    if (opts.newNote) { newNote(); return; }
    if (opts.id) state.settings.noteId = opts.id;
    let note = state.notes.find(n => n.id === state.settings.noteId);
    if (!note && state.notes.length) note = sortedNotes()[0];
    main.innerHTML = `<div class="notes-layout">
      <aside class="notes-side">
        <div class="ns-top"><h2>📝 Apuntes</h2><button class="btn primary sm" id="nNew" title="Ctrl+N">＋</button></div>
        <input class="search" id="nSearch" placeholder="Buscar… (Ctrl+K)" value="${esc(v.q)}">
        <div class="chips small" id="nSubjects"><button class="chip ${!v.subject ? 'on' : ''}" data-s="">Todas</button>${state.subjects.map(s => `<button class="chip ${v.subject === s.name ? 'on' : ''}" data-s="${esc(s.name)}" style="--c:${s.color}">${esc(s.name)}</button>`).join('')}</div>
        <div class="note-list" id="nList"></div>
      </aside>
      <section class="note-editor" id="nEditor"></section></div>`;
    $('#nNew').onclick = newNote;
    $('#nSearch').oninput = e => { v.q = e.target.value; drawNoteList(); };
    $$('#nSubjects [data-s]').forEach(b => b.onclick = () => { v.subject = b.dataset.s; rerender(); });
    drawNoteList();
    renderEditor(note);
  },
  leave() { commitEditor(); }
};

function sortedNotes() {
  return [...state.notes].sort((a, b) => (b.pinned - a.pinned) || (b.updated - a.updated));
}

function drawNoteList() {
  const v = VIEWS.notes;
  const q = v.q.trim().toLowerCase();
  const list = sortedNotes().filter(n => (!v.subject || n.subject === v.subject) &&
    (!q || n.title.toLowerCase().includes(q) || htmlToText(n.html).toLowerCase().includes(q)));
  const el = $('#nList');
  if (!el) return;
  el.innerHTML = list.map(n => `<button class="note-item ${n.id === state.settings.noteId ? 'sel' : ''}" data-id="${n.id}">
      <span class="ni-title">${n.pinned ? '📌 ' : ''}${esc(n.title || 'Sin título')}</span>
      <span class="ni-snip">${esc(htmlToText(n.html).slice(0, 80))}</span>
      <span class="ni-meta">${n.subject ? `<i style="background:${subjectColor(n.subject)}"></i>${esc(n.subject)} · ` : ''}${timeAgo(n.updated)}</span></button>`).join('')
    || `<p class="muted small pad">${q ? 'Nada coincide con la búsqueda.' : 'Sin apuntes aquí todavía.'}</p>`;
  $$('[data-id]', el).forEach(b => b.onclick = () => {
    commitEditor();
    state.settings.noteId = b.dataset.id;
    renderEditor(state.notes.find(n => n.id === b.dataset.id));
    drawNoteList();
  });
}

function htmlToText(html) {
  const d = document.createElement('div');
  d.innerHTML = html || '';
  return (d.textContent || '').replace(/\s+/g, ' ').trim();
}

function newNote() {
  const n = { id: uid(), title: '', subject: VIEWS.notes.subject || '', pinned: false, created: Date.now(), updated: Date.now(), html: '<p><br></p>' };
  state.notes.push(n);
  state.settings.noteId = n.id;
  save();
  if (currentView !== 'notes') go('notes', {}); else rerender();
  setTimeout(() => { const t = $('#nTitle'); if (t) t.focus(); }, 30);
}

let editorNote = null;
let editorTimer = null;

function commitEditor() {
  clearTimeout(editorTimer);
  const body = $('#nBody');
  if (!editorNote || !body) return;
  const html = body.innerHTML;
  if (html !== editorNote.html) { editorNote.html = html; editorNote.updated = Date.now(); save(); }
}

const TOOLS = [
  ['h1', 'T1', 'Título'], ['h2', 'T2', 'Subtítulo'], ['p', '¶', 'Texto normal'], ['|'],
  ['bold', '<b>B</b>', 'Negrita (Ctrl+B)'], ['italic', '<i>I</i>', 'Cursiva (Ctrl+I)'], ['underline', '<u>U</u>', 'Subrayado (Ctrl+U)'], ['strike', '<s>S</s>', 'Tachado'], ['mark', '🖍️', 'Resaltar'], ['|'],
  ['ul', '•', 'Viñetas'], ['ol', '1.', 'Lista numerada'], ['check', '☑', 'Lista de pendientes'], ['|'],
  ['code', '&lt;/&gt;', 'Código en línea'], ['pre', '{ }', 'Bloque de código'], ['quote', '❝', 'Cita'], ['link', '🔗', 'Enlace'], ['hr', '―', 'Separador']
];

function renderEditor(note) {
  editorNote = note;
  const el = $('#nEditor');
  if (!el) return;
  if (!note) { el.innerHTML = '<div class="empty big">Crea tu primer apunte con <b>＋</b></div>'; return; }
  el.innerHTML = `<div class="ne-top">
      <select id="nSubj" class="sel"><option value="">Sin materia</option>${state.subjects.map(s => `<option ${s.name === note.subject ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select>
      <span class="muted small">Editado ${timeAgo(note.updated)}</span>
      <span class="grow"></span>
      <button class="btn ghost sm" id="nPin">${note.pinned ? '📌 Fijado' : '📍 Fijar'}</button>
      <button class="btn ghost sm" id="nDel">🗑 Eliminar</button></div>
    <input class="ne-title" id="nTitle" value="${esc(note.title)}" placeholder="Título del apunte">
    <div class="toolbar" id="nTools">${TOOLS.map(t => t[0] === '|' ? '<span class="sep"></span>' : `<button data-cmd="${t[0]}" title="${t[2]}">${t[1]}</button>`).join('')}</div>
    <div class="ne-body" id="nBody" contenteditable="true" spellcheck="true">${note.html}</div>`;

  const body = $('#nBody');
  const changed = () => { clearTimeout(editorTimer); editorTimer = setTimeout(() => { commitEditor(); drawNoteList(); }, 600); };
  $('#nTitle').oninput = e => { note.title = e.target.value; note.updated = Date.now(); save(); clearTimeout(editorTimer); editorTimer = setTimeout(drawNoteList, 400); };
  $('#nTitle').onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); body.focus(); } };
  $('#nSubj').onchange = e => { note.subject = e.target.value; save(); drawNoteList(); };
  $('#nPin').onclick = () => { note.pinned = !note.pinned; save(); renderEditor(note); drawNoteList(); };
  $('#nDel').onclick = async () => {
    if (await confirmBox('Eliminar apunte', `¿Eliminar "${note.title || 'Sin título'}"? No se puede deshacer.`)) {
      state.notes = state.notes.filter(n => n !== note);
      editorNote = null; state.settings.noteId = null; save(); rerender();
    }
  };
  $$('#nTools [data-cmd]').forEach(b => b.onmousedown = e => { e.preventDefault(); runTool(b.dataset.cmd); changed(); });

  body.addEventListener('input', () => { ensureTrailingParagraph(body); changed(); });
  body.addEventListener('keydown', e => {
    const pre = closestInEditor('pre');
    if (pre && e.key === 'Tab') { e.preventDefault(); document.execCommand('insertText', false, '    '); }
    else if (pre && e.key === 'Enter' && !e.ctrlKey) { e.preventDefault(); document.execCommand('insertLineBreak'); }
    else if (pre && e.key === 'Enter' && e.ctrlKey) { e.preventDefault(); exitBlock(pre); }
  });
  body.addEventListener('click', e => {
    const li = e.target.closest('.checklist > li');
    if (li && e.offsetX < 26) { li.toggleAttribute('data-done'); if (li.hasAttribute('data-done')) li.setAttribute('data-done', '1'); changed(); }
    const a = e.target.closest('a[href]');
    if (a && (e.ctrlKey || e.metaKey)) { e.preventDefault(); Platform.openExternal(a.href); }
  });
  body.addEventListener('paste', e => {
    const text = e.clipboardData.getData('text/plain');
    const html = e.clipboardData.getData('text/html');
    e.preventDefault();
    if (closestInEditor('pre') || !html) document.execCommand('insertText', false, text);
    else document.execCommand('insertHTML', false, cleanHTML(html));
  });
  ensureTrailingParagraph(body);
}

function closestInEditor(tag) {
  const sel = window.getSelection();
  if (!sel.rangeCount) return null;
  let n = sel.anchorNode;
  const body = $('#nBody');
  while (n && n !== body) { if (n.nodeName === tag.toUpperCase()) return n; n = n.parentNode; }
  return null;
}

function ensureTrailingParagraph(body) {
  const last = body.lastElementChild;
  if (!last || ['PRE', 'BLOCKQUOTE', 'HR', 'UL', 'OL'].includes(last.nodeName)) body.insertAdjacentHTML('beforeend', '<p><br></p>');
}

function exitBlock(block) {
  let next = block.nextElementSibling;
  if (!next || next.nodeName !== 'P') { next = document.createElement('p'); next.innerHTML = '<br>'; block.after(next); }
  const r = document.createRange();
  r.setStart(next, 0); r.collapse(true);
  const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r);
}

function runTool(cmd) {
  const body = $('#nBody');
  body.focus();
  const ex = (c, v) => document.execCommand(c, false, v);
  switch (cmd) {
    case 'h1': case 'h2': case 'p': ex('formatBlock', cmd); break;
    case 'bold': case 'italic': case 'underline': ex(cmd); break;
    case 'strike': ex('strikeThrough'); break;
    case 'mark': {
      const sel = window.getSelection();
      if (sel.rangeCount && !sel.isCollapsed) {
        const inMark = closestInEditor('mark');
        if (inMark) inMark.replaceWith(...inMark.childNodes);
        else ex('insertHTML', `<mark>${esc(sel.toString())}</mark>`);
      }
      break;
    }
    case 'ul': ex('insertUnorderedList'); break;
    case 'ol': ex('insertOrderedList'); break;
    case 'check': {
      ex('insertUnorderedList');
      const ul = closestInEditor('ul');
      if (ul) ul.classList.toggle('checklist');
      break;
    }
    case 'code': {
      const sel = window.getSelection();
      const inCode = closestInEditor('code');
      if (inCode) inCode.replaceWith(document.createTextNode(inCode.textContent));
      else if (sel.rangeCount && !sel.isCollapsed) ex('insertHTML', `<code>${esc(sel.toString())}</code>&#8203;`);
      break;
    }
    case 'pre': {
      const pre = closestInEditor('pre');
      if (pre) { ex('formatBlock', 'p'); break; }
      const sel = window.getSelection();
      const lang = 'código';
      if (sel.rangeCount && !sel.isCollapsed) ex('insertHTML', `<pre data-lang="${lang}">${esc(sel.toString())}</pre><p><br></p>`);
      else { ex('formatBlock', 'pre'); const p2 = closestInEditor('pre'); if (p2) p2.dataset.lang = lang; }
      break;
    }
    case 'quote': ex('formatBlock', closestInEditor('blockquote') ? 'p' : 'blockquote'); break;
    case 'hr': ex('insertHorizontalRule'); break;
    case 'link': {
      const sel = window.getSelection();
      const text = sel.toString();
      const range = sel.rangeCount ? sel.getRangeAt(0).cloneRange() : null;
      modal({
        title: 'Insertar enlace',
        body: `<label>Dirección<input id="lnk" placeholder="https://..."></label><p class="muted small">Ctrl + clic sobre un enlace lo abre en el navegador.</p>`,
        ok: 'Insertar',
        onOk(w) {
          let url = $('#lnk', w).value.trim();
          if (!url) return;
          if (!/^https?:\/\//.test(url)) url = 'https://' + url;
          body.focus();
          if (range) { const s = window.getSelection(); s.removeAllRanges(); s.addRange(range); }
          ex('insertHTML', `<a href="${esc(url)}">${esc(text || url)}</a>`);
          commitEditor();
        }
      });
      break;
    }
  }
  if (cmd === 'pre' || cmd === 'quote' || cmd === 'hr') ensureTrailingParagraph(body);
  const pre = closestInEditor('pre');
  if (pre && !pre.dataset.lang) pre.dataset.lang = 'código';
}

// Limpia el HTML pegado: sin estilos ni scripts, solo estructura.
function cleanHTML(html) {
  const t = document.createElement('template');
  t.innerHTML = html;
  const allowed = new Set(['P', 'BR', 'B', 'STRONG', 'I', 'EM', 'U', 'S', 'MARK', 'CODE', 'PRE', 'H1', 'H2', 'H3', 'UL', 'OL', 'LI', 'BLOCKQUOTE', 'A', 'HR', 'TABLE', 'THEAD', 'TBODY', 'TR', 'TD', 'TH', 'IMG']);
  const walk = node => {
    for (const child of [...node.children]) {
      if (['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'META', 'LINK'].includes(child.nodeName)) { child.remove(); continue; }
      walk(child);
      if (!allowed.has(child.nodeName)) { child.replaceWith(...child.childNodes); continue; }
      for (const attr of [...child.attributes]) {
        const keep = (attr.name === 'href' && /^https?:/.test(attr.value)) || (attr.name === 'src' && /^data:image\//.test(attr.value));
        if (!keep) child.removeAttribute(attr.name);
      }
    }
  };
  walk(t.content);
  const d = document.createElement('div');
  d.appendChild(t.content);
  return d.innerHTML;
}
