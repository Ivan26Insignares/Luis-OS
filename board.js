// Pizarrón virtual: dibujo a mano alzada, formas, flechas y texto sobre un lienzo oscuro.
const BOARD_W = 2400, BOARD_H = 1600;
const BOARD_COLORS = ['#f4f4f6', '#22d3ee', '#a78bfa', '#f472b6', '#facc15', '#34d399', '#fb7185', '#60a5fa'];
const BOARD_SIZES = [2, 4, 8, 14];
const BOARD_TOOLS = [
  ['pen', '✏️', 'Lápiz (P)'], ['hl', '🖍️', 'Marcador'], ['line', '╱', 'Línea (L)'], ['arrow', '➝', 'Flecha (A)'],
  ['rect', '▭', 'Rectángulo (R)'], ['ellipse', '◯', 'Elipse (E)'], ['text', 'T', 'Texto (T)'], ['eraser', '🧽', 'Borrador (X)'], ['hand', '✋', 'Mover el lienzo (H)']
];

const Board = { tool: 'pen', color: '#f4f4f6', size: 4, undo: [], redo: [], drawing: null, base: null, ctx: null, canvas: null, board: null };

VIEWS.board = {
  render(main, opts) {
    if (opts.newBoard) {
      const b = { id: uid(), name: `Pizarrón ${state.boards.length + 1}`, bg: 'dots', shapes: [], updated: Date.now() };
      state.boards.push(b); state.settings.boardId = b.id; save();
    }
    if (!state.boards.length) state.boards.push({ id: uid(), name: 'Pizarrón 1', bg: 'dots', shapes: [], updated: Date.now() });
    let board = state.boards.find(b => b.id === state.settings.boardId) || state.boards[0];
    state.settings.boardId = board.id;
    Board.board = board; Board.undo = []; Board.redo = [];
    main.innerHTML = `<div class="board-view">
      <div class="board-top">
        <div class="board-tabs">${state.boards.map(b => `<button class="btab ${b.id === board.id ? 'on' : ''}" data-b="${b.id}">${esc(b.name)}</button>`).join('')}
          <button class="btab add" id="bNew" title="Nuevo pizarrón">＋</button></div>
        <div class="row">
          <select id="bBg" class="sel">${[['dots', 'Puntos'], ['grid', 'Cuadrícula'], ['lines', 'Renglones'], ['plain', 'Liso']].map(([k, v]) => `<option value="${k}" ${board.bg === k ? 'selected' : ''}>${v}</option>`).join('')}</select>
          <button class="btn ghost sm" id="bRename">✎ Renombrar</button>
          <button class="btn ghost sm" id="bExport">⬇ PNG</button>
          <button class="btn ghost sm" id="bClear">Limpiar</button>
          <button class="btn ghost sm danger-text" id="bDel">🗑</button></div></div>
      <div class="board-tools">
        <div class="tool-group">${BOARD_TOOLS.map(t => `<button class="tool ${Board.tool === t[0] ? 'on' : ''}" data-tool="${t[0]}" title="${t[2]}">${t[1]}</button>`).join('')}</div>
        <div class="tool-group">${BOARD_COLORS.map(c => `<button class="swatch ${Board.color === c ? 'on' : ''}" data-color="${c}" style="background:${c}"></button>`).join('')}<input type="color" id="bColor" value="${Board.color}" title="Otro color"></div>
        <div class="tool-group">${BOARD_SIZES.map(s => `<button class="size ${Board.size === s ? 'on' : ''}" data-size="${s}"><i style="width:${s + 2}px;height:${s + 2}px"></i></button>`).join('')}</div>
        <div class="tool-group"><button class="tool" id="bUndo" title="Deshacer (Ctrl+Z)">↶</button><button class="tool" id="bRedo" title="Rehacer (Ctrl+Y)">↷</button></div>
      </div>
      <div class="board-scroll" id="bScroll"><div class="board-paper bg-${board.bg}" style="width:${BOARD_W}px;height:${BOARD_H}px"><canvas id="bCanvas"></canvas></div></div></div>`;

    $$('[data-b]', main).forEach(b => b.onclick = () => { state.settings.boardId = b.dataset.b; save(); rerender(); });
    $('#bNew').onclick = () => go('board', { newBoard: true });
    $('#bBg').onchange = e => { board.bg = e.target.value; save(); $('.board-paper').className = 'board-paper bg-' + board.bg; };
    $('#bRename').onclick = () => modal({
      title: 'Nombre del pizarrón', body: `<input id="bn" value="${esc(board.name)}">`,
      onOk(w) { board.name = $('#bn', w).value.trim() || board.name; save(); rerender(); }
    });
    $('#bExport').onclick = () => exportBoard(board);
    $('#bClear').onclick = () => { if (!board.shapes.length) return; pushUndo(); board.shapes = []; boardChanged(); };
    $('#bDel').onclick = async () => {
      if (await confirmBox('Eliminar pizarrón', `¿Eliminar "${board.name}" y todo lo dibujado?`)) {
        state.boards = state.boards.filter(b => b !== board); state.settings.boardId = null; save(); rerender();
      }
    };
    $$('[data-tool]', main).forEach(b => b.onclick = () => setTool(b.dataset.tool));
    $$('[data-color]', main).forEach(b => b.onclick = () => setColor(b.dataset.color));
    $('#bColor').oninput = e => setColor(e.target.value);
    $$('[data-size]', main).forEach(b => b.onclick = () => { Board.size = +b.dataset.size; $$('[data-size]').forEach(x => x.classList.toggle('on', x === b)); });
    $('#bUndo').onclick = undoBoard;
    $('#bRedo').onclick = redoBoard;
    setupCanvas();
  },
  leave() { document.removeEventListener('keydown', boardKeys); }
};

function setTool(t) {
  Board.tool = t;
  $$('[data-tool]').forEach(x => x.classList.toggle('on', x.dataset.tool === t));
  const c = $('#bCanvas');
  if (c) { c.dataset.tool = t; c.style.touchAction = t === 'hand' ? 'auto' : 'none'; }
}
function setColor(c) {
  Board.color = c;
  $$('[data-color]').forEach(x => x.classList.toggle('on', x.dataset.color === c));
  if (Board.tool === 'eraser' || Board.tool === 'hand') setTool('pen');
}

function setupCanvas() {
  const canvas = $('#bCanvas');
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  canvas.width = BOARD_W * dpr; canvas.height = BOARD_H * dpr;
  canvas.style.width = BOARD_W + 'px'; canvas.style.height = BOARD_H + 'px';
  Board.canvas = canvas;
  Board.ctx = canvas.getContext('2d');
  Board.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  Board.base = document.createElement('canvas');
  Board.base.width = canvas.width; Board.base.height = canvas.height;
  Board.base.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0);
  setTool(Board.tool);
  redrawBase();

  const pos = e => { const r = canvas.getBoundingClientRect(); return [Math.round(e.clientX - r.left), Math.round(e.clientY - r.top)]; };
  canvas.onpointerdown = e => {
    if (Board.tool === 'hand' || e.button === 2) return;
    const [x, y] = pos(e);
    if (Board.tool === 'text') { placeText(x, y); return; }
    canvas.setPointerCapture(e.pointerId);
    pushUndo();
    if (Board.tool === 'eraser') { Board.drawing = { t: 'eraser' }; eraseAt(x, y); return; }
    Board.drawing = { t: Board.tool, c: Board.color, w: Board.size, pts: [x, y] };
    if (Board.tool !== 'pen' && Board.tool !== 'hl') Board.drawing.pts.push(x, y);
  };
  canvas.onpointermove = e => {
    const d = Board.drawing;
    if (!d) return;
    const [x, y] = pos(e);
    if (d.t === 'eraser') { eraseAt(x, y); return; }
    if (d.t === 'pen' || d.t === 'hl') {
      const n = d.pts.length;
      if (Math.hypot(x - d.pts[n - 2], y - d.pts[n - 1]) >= 1.5) d.pts.push(x, y);
    } else { d.pts[2] = x; d.pts[3] = y; }
    drawPreview();
  };
  const end = () => {
    const d = Board.drawing;
    Board.drawing = null;
    if (!d) return;
    if (d.t === 'eraser') { boardChanged(); return; }
    if (d.pts.length === 2) d.pts.push(d.pts[0] + .1, d.pts[1] + .1);
    Board.board.shapes.push(d);
    boardChanged();
  };
  canvas.onpointerup = end;
  canvas.onpointercancel = end;
  document.removeEventListener('keydown', boardKeys);
  document.addEventListener('keydown', boardKeys);
}

function boardKeys(e) {
  if (currentView !== 'board' || e.target.closest('input, textarea, [contenteditable]')) return;
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? redoBoard() : undoBoard(); return; }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); redoBoard(); return; }
  const map = { p: 'pen', l: 'line', a: 'arrow', r: 'rect', e: 'ellipse', t: 'text', x: 'eraser', h: 'hand' };
  if (!e.ctrlKey && !e.metaKey && map[e.key.toLowerCase()]) setTool(map[e.key.toLowerCase()]);
}

function pushUndo() {
  Board.undo.push(JSON.stringify(Board.board.shapes));
  if (Board.undo.length > 60) Board.undo.shift();
  Board.redo = [];
}
function undoBoard() {
  if (!Board.undo.length) return;
  Board.redo.push(JSON.stringify(Board.board.shapes));
  Board.board.shapes = JSON.parse(Board.undo.pop());
  boardChanged();
}
function redoBoard() {
  if (!Board.redo.length) return;
  Board.undo.push(JSON.stringify(Board.board.shapes));
  Board.board.shapes = JSON.parse(Board.redo.pop());
  boardChanged();
}

function boardChanged() {
  Board.board.updated = Date.now();
  redrawBase();
  save();
}

function redrawBase() {
  const b = Board.base.getContext('2d');
  b.clearRect(0, 0, BOARD_W, BOARD_H);
  for (const s of Board.board.shapes) drawShape(b, s);
  drawPreview();
}

function drawPreview() {
  const c = Board.ctx;
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
  c.clearRect(0, 0, Board.canvas.width, Board.canvas.height);
  c.drawImage(Board.base, 0, 0);
  c.restore();
  if (Board.drawing && Board.drawing.pts) drawShape(c, Board.drawing);
}

function drawShape(c, s) {
  c.save();
  c.strokeStyle = s.c; c.fillStyle = s.c; c.lineWidth = s.w; c.lineCap = 'round'; c.lineJoin = 'round';
  const p = s.pts;
  if (s.t === 'pen' || s.t === 'hl') {
    if (s.t === 'hl') { c.globalAlpha = .35; c.lineWidth = s.w * 3.5; c.lineCap = 'square'; }
    c.beginPath(); c.moveTo(p[0], p[1]);
    for (let i = 2; i < p.length - 2; i += 2) c.quadraticCurveTo(p[i], p[i + 1], (p[i] + p[i + 2]) / 2, (p[i + 1] + p[i + 3]) / 2);
    c.lineTo(p[p.length - 2], p[p.length - 1]);
    c.stroke();
  } else if (s.t === 'line' || s.t === 'arrow') {
    c.beginPath(); c.moveTo(p[0], p[1]); c.lineTo(p[2], p[3]); c.stroke();
    if (s.t === 'arrow') {
      const a = Math.atan2(p[3] - p[1], p[2] - p[0]), h = 10 + s.w * 2.2;
      c.beginPath();
      c.moveTo(p[2], p[3]); c.lineTo(p[2] - h * Math.cos(a - .45), p[3] - h * Math.sin(a - .45));
      c.lineTo(p[2] - h * Math.cos(a + .45), p[3] - h * Math.sin(a + .45)); c.closePath(); c.fill();
    }
  } else if (s.t === 'rect') {
    const r = Math.min(10, Math.abs(p[2] - p[0]) / 2, Math.abs(p[3] - p[1]) / 2);
    c.beginPath(); c.roundRect(Math.min(p[0], p[2]), Math.min(p[1], p[3]), Math.abs(p[2] - p[0]), Math.abs(p[3] - p[1]), r); c.stroke();
  } else if (s.t === 'ellipse') {
    c.beginPath(); c.ellipse((p[0] + p[2]) / 2, (p[1] + p[3]) / 2, Math.abs(p[2] - p[0]) / 2, Math.abs(p[3] - p[1]) / 2, 0, 0, Math.PI * 2); c.stroke();
  } else if (s.t === 'text') {
    c.font = `600 ${s.s}px "Segoe UI", system-ui, sans-serif`; c.textBaseline = 'top';
    s.text.split('\n').forEach((line, i) => c.fillText(line, p[0], p[1] + i * s.s * 1.25));
  }
  c.restore();
}

// Borra las figuras que toque el borrador.
function eraseAt(x, y) {
  const r = 8 + Board.size * 2;
  const near = s => {
    const p = s.pts;
    if (s.t === 'text') { const w = Math.max(...s.text.split('\n').map(l => l.length)) * s.s * .55, h = s.text.split('\n').length * s.s * 1.25; return x >= p[0] - r && x <= p[0] + w + r && y >= p[1] - r && y <= p[1] + h + r; }
    if (s.t === 'rect' || s.t === 'ellipse') {
      const x1 = Math.min(p[0], p[2]), x2 = Math.max(p[0], p[2]), y1 = Math.min(p[1], p[3]), y2 = Math.max(p[1], p[3]);
      const inOuter = x >= x1 - r && x <= x2 + r && y >= y1 - r && y <= y2 + r;
      const inInner = x > x1 + r && x < x2 - r && y > y1 + r && y < y2 - r;
      return inOuter && !inInner;
    }
    for (let i = 0; i < p.length - 2; i += 2) if (segDist(x, y, p[i], p[i + 1], p[i + 2], p[i + 3]) < r + s.w / 2) return true;
    return p.length === 2 && Math.hypot(x - p[0], y - p[1]) < r;
  };
  const before = Board.board.shapes.length;
  Board.board.shapes = Board.board.shapes.filter(s => !near(s));
  if (Board.board.shapes.length !== before) redrawBase();
}

function segDist(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1, l = dx * dx + dy * dy;
  const t = l ? Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / l)) : 0;
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

function placeText(x, y) {
  const paper = $('.board-paper');
  const size = 14 + Board.size * 3;
  const ta = document.createElement('textarea');
  ta.className = 'board-text';
  Object.assign(ta.style, { left: x + 'px', top: y + 'px', color: Board.color, fontSize: size + 'px' });
  paper.appendChild(ta);
  setTimeout(() => ta.focus(), 0);
  let done = false;
  const commit = () => {
    if (done) return; done = true;
    const text = ta.value.replace(/\s+$/, '');
    ta.remove();
    if (!text) return;
    pushUndo();
    Board.board.shapes.push({ t: 'text', c: Board.color, s: size, text, pts: [x, y] });
    boardChanged();
  };
  ta.onblur = commit;
  ta.onkeydown = e => { if (e.key === 'Escape') { ta.value = ''; ta.blur(); } if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ta.blur(); } };
}

function exportBoard(board) {
  const out = document.createElement('canvas');
  out.width = BOARD_W; out.height = BOARD_H;
  const c = out.getContext('2d');
  c.fillStyle = '#121216'; c.fillRect(0, 0, BOARD_W, BOARD_H);
  for (const s of board.shapes) drawShape(c, s);
  Platform.saveImage(`${board.name.replace(/[\\/:*?"<>|]/g, '_')}.png`, out.toDataURL('image/png'));
}
