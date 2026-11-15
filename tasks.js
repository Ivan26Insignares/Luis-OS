// Tareas (tabla y tablero por status) y calendario de entregas y eventos.
VIEWS.tasks = {
  mode: 'table',
  filter: '',
  render(main) {
    const v = VIEWS.tasks;
    const subjects = [...new Set(state.tasks.map(t => t.subject).filter(Boolean))];
    main.innerHTML = `<div class="page">
      <div class="view-head"><div><h1>✅ Tareas</h1><p class="muted">${summaryLine()}</p></div>
        <div class="row">
          <select id="tFilter" class="sel"><option value="">Todas las materias</option>${subjects.map(s => `<option ${s === v.filter ? 'selected' : ''}>${esc(s)}</option>`).join('')}</select>
          <div class="seg"><button data-m="table" class="${v.mode === 'table' ? 'on' : ''}">☰ Tabla</button><button data-m="board" class="${v.mode === 'board' ? 'on' : ''}">▦ Tablero</button></div>
          <button class="btn primary" id="newTask">＋ Nueva tarea</button></div></div>
      <div id="taskArea"></div></div>`;
    $('#tFilter').onchange = e => { v.filter = e.target.value; rerender(); };
    $$('[data-m]', main).forEach(b => b.onclick = () => { v.mode = b.dataset.m; rerender(); });
    $('#newTask').onclick = () => editTask(null);
    const list = state.tasks.filter(t => !v.filter || t.subject === v.filter);
    if (v.mode === 'board') renderBoard($('#taskArea'), list); else renderTable($('#taskArea'), list);
  }
};

function summaryLine() {
  const c = s => state.tasks.filter(t => t.status === s).length;
  const late = state.tasks.filter(taskIsLate).length;
  return `${c('todo')} sin empezar · ${c('doing')} en progreso · ${c('review')} en revisión · ${c('done')} entregadas${late ? ` · <span class="late">${late} atrasada${late > 1 ? 's' : ''}</span>` : ''}`;
}

function sortTasks(list) {
  return [...list].sort((a, b) => ((a.status === 'done') - (b.status === 'done')) || (a.due || '9').localeCompare(b.due || '9'));
}

function statusSelect(t) {
  return `<select class="status-sel" data-status="${t.id}" style="--c:${STATUSES[t.status].color}">${Object.entries(STATUSES).map(([k, s]) => `<option value="${k}" ${k === t.status ? 'selected' : ''}>${s.icon} ${s.name}</option>`).join('')}</select>`;
}

function dueHTML(t) {
  if (!t.due) return '<span class="muted">Sin fecha</span>';
  const d = parseDue(t.due);
  const late = taskIsLate(t), soon = !late && t.status !== 'done' && d - Date.now() < 2 * 864e5;
  return `<span class="due ${late ? 'late' : soon ? 'soon' : ''}"><b>${fmtDate(d)} · ${fmtTime(d)}</b>${t.status !== 'done' ? `<small>${relDue(d)}</small>` : ''}</span>`;
}

function renderTable(el, list) {
  if (!list.length) { el.innerHTML = '<div class="empty">No hay tareas. Crea una con <b>＋ Nueva tarea</b>.</div>'; return; }
  el.innerHTML = `<div class="table-wrap"><table class="tasks-table">
    <thead><tr><th>Status</th><th>Tarea</th><th>Materia</th><th>Entrega</th><th>Prioridad</th><th></th></tr></thead>
    <tbody>${sortTasks(list).map(t => `<tr class="${t.status === 'done' ? 'is-done' : ''}">
      <td>${statusSelect(t)}</td>
      <td><button class="task-title" data-edit="${t.id}">${esc(t.title)}</button>${t.notes ? `<div class="muted small clamp">${esc(t.notes)}</div>` : ''}</td>
      <td><span class="tag" style="--c:${subjectColor(t.subject)}">${esc(t.subject || '—')}</span></td>
      <td>${dueHTML(t)}</td>
      <td class="small">${PRIORITIES[t.priority] || ''}</td>
      <td><button class="mini-btn" data-del="${t.id}" title="Eliminar">🗑</button></td></tr>`).join('')}</tbody></table></div>`;
  bindTaskControls(el);
}

function renderBoard(el, list) {
  el.innerHTML = `<div class="kanban">${Object.entries(STATUSES).map(([k, s]) => {
    const items = sortTasks(list.filter(t => t.status === k));
    return `<div class="kcol" data-col="${k}"><div class="kcol-head"><span style="color:${s.color}">${s.icon}</span> ${s.name} <span class="count">${items.length}</span></div>
      ${items.map(t => `<div class="kcard" draggable="true" data-id="${t.id}">
        <div class="kcard-sub"><i style="background:${subjectColor(t.subject)}"></i>${esc(t.subject || 'Sin materia')}</div>
        <button class="task-title" data-edit="${t.id}">${esc(t.title)}</button>
        <div class="kcard-foot">${dueHTML(t)}</div>
        <div class="kcard-status">${statusSelect(t)}</div></div>`).join('')}
      <button class="kadd" data-add="${k}">＋ Añadir</button></div>`;
  }).join('')}</div>`;
  bindTaskControls(el);
  $$('.kcard', el).forEach(c => c.ondragstart = e => { e.dataTransfer.setData('text/plain', c.dataset.id); c.classList.add('drag'); });
  $$('.kcol', el).forEach(col => {
    col.ondragover = e => { e.preventDefault(); col.classList.add('over'); };
    col.ondragleave = () => col.classList.remove('over');
    col.ondrop = e => {
      e.preventDefault();
      const t = state.tasks.find(x => x.id === e.dataTransfer.getData('text/plain'));
      if (t) setStatus(t, col.dataset.col);
    };
  });
  $$('[data-add]', el).forEach(b => b.onclick = () => editTask(null, { status: b.dataset.add }));
}

function setStatus(t, status) {
  const was = t.status;
  t.status = status;
  if (status === 'done' && was !== 'done') { t.doneAt = Date.now(); celebrate(); }
  save(); rerender();
}

function bindTaskControls(el) {
  $$('[data-status]', el).forEach(s => s.onchange = () => setStatus(state.tasks.find(t => t.id === s.dataset.status), s.value));
  $$('[data-edit]', el).forEach(b => b.onclick = () => editTask(state.tasks.find(t => t.id === b.dataset.edit)));
  $$('[data-del]', el).forEach(b => b.onclick = async () => {
    const t = state.tasks.find(x => x.id === b.dataset.del);
    if (await confirmBox('Eliminar tarea', `¿Eliminar "${t.title}"?`)) { state.tasks = state.tasks.filter(x => x !== t); save(); rerender(); }
  });
}

// Filas compactas para el inicio.
function taskRowHTML(t) {
  return `<div class="due-row ${taskIsLate(t) ? 'late' : ''}">
    <span class="due-bar" style="background:${subjectColor(t.subject)}"></span>
    <div class="due-main"><div class="due-sub">${esc(t.subject || 'Sin materia')}</div><button class="task-title" data-edit="${t.id}">${esc(t.title)}</button></div>
    <div class="due-when">${dueHTML(t)}</div>
    <div>${statusSelect(t)}</div></div>`;
}
function bindTaskRows(el) { bindTaskControls(el); }

function celebrate() {
  toast('🎉 ¡Entregado! Bien hecho, ' + state.profile.name + '');
  const box = document.createElement('div');
  box.className = 'confetti';
  const colors = ['#a78bfa', '#22d3ee', '#f472b6', '#facc15', '#34d399'];
  box.innerHTML = Array.from({ length: 60 }, (_, i) => `<i style="left:${Math.random() * 100}%;background:${colors[i % 5]};animation-delay:${Math.random() * .4}s;animation-duration:${1.4 + Math.random()}s"></i>`).join('');
  document.body.appendChild(box);
  setTimeout(() => box.remove(), 2800);
}

function editTask(t, preset = {}) {
  const isNew = !t;
  const cur = t || { title: '', subject: state.subjects[0]?.name || '', due: preset.due || `${dayKey(new Date(Date.now() + 864e5))}T23:59`, status: preset.status || 'todo', priority: 'media', notes: '' };
  const [dDate, dTime] = (cur.due || 'T').split('T');
  modal({
    title: isNew ? 'Nueva tarea' : 'Editar tarea',
    body: `<label>Tarea<input id="tTitle" value="${esc(cur.title)}" placeholder="Ej. PROYECTO 5: Gestión de biblioteca"></label>
      <label>Materia<input id="tSubj" list="subjList" value="${esc(cur.subject)}" placeholder="Ej. Matemáticas">
        <datalist id="subjList">${state.subjects.map(s => `<option value="${esc(s.name)}">`).join('')}</datalist></label>
      <div class="row2"><label>Fecha de entrega<input type="date" id="tDate" value="${dDate}"></label>
      <label>Hora<input type="time" id="tTime" value="${dTime || '23:59'}"></label></div>
      <div class="row2"><label>Status<select id="tStatus">${Object.entries(STATUSES).map(([k, s]) => `<option value="${k}" ${k === cur.status ? 'selected' : ''}>${s.icon} ${s.name}</option>`).join('')}</select></label>
      <label>Prioridad<select id="tPrio">${Object.entries(PRIORITIES).map(([k, v]) => `<option value="${k}" ${k === cur.priority ? 'selected' : ''}>${v}</option>`).join('')}</select></label></div>
      <label>Notas<textarea id="tNotes" rows="3" placeholder="Enlace al enunciado, requisitos, qué falta…">${esc(cur.notes)}</textarea></label>`,
    onOk(w) {
      const title = $('#tTitle', w).value.trim();
      if (!title) { toast('Escribe el nombre de la tarea'); return false; }
      const subject = $('#tSubj', w).value.trim();
      if (subject && !state.subjects.some(s => s.name === subject)) {
        state.subjects.push({ name: subject, color: SUBJECT_COLORS[state.subjects.length % SUBJECT_COLORS.length] });
      }
      const date = $('#tDate', w).value;
      const data = { title, subject, due: date ? `${date}T${$('#tTime', w).value || '23:59'}` : '', priority: $('#tPrio', w).value, notes: $('#tNotes', w).value.trim() };
      const status = $('#tStatus', w).value;
      if (isNew) state.tasks.push({ id: uid(), created: Date.now(), status, ...data });
      else { Object.assign(t, data); if (t.status !== status) { if (status === 'done') celebrate(); t.status = status; } }
      save(); rerender();
    }
  });
}

// ---------- Calendario ----------
VIEWS.calendar = {
  month: null,
  selected: null,
  render(main) {
    const v = VIEWS.calendar;
    const today = new Date();
    if (!v.month) v.month = new Date(today.getFullYear(), today.getMonth(), 1);
    if (!v.selected) v.selected = dayKey(today);
    const y = v.month.getFullYear(), m = v.month.getMonth();
    const first = new Date(y, m, 1);
    const start = new Date(y, m, 1 - ((first.getDay() + 6) % 7));
    const byDay = {};
    for (const t of state.tasks) if (t.due) (byDay[t.due.slice(0, 10)] = byDay[t.due.slice(0, 10)] || []).push(t);
    let cells = '';
    for (let i = 0; i < 42; i++) {
      const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      const k = dayKey(d);
      const items = sortTasks(byDay[k] || []);
      const evs = eventsOn(k);
      const chips = [...evs.map(ev => eventChipHTML(ev, k)), ...items.map(t => `<button class="cal-chip ${t.status === 'done' ? 'done' : ''} ${taskIsLate(t) ? 'late' : ''}" data-edit="${t.id}" style="--c:${subjectColor(t.subject)}">${fmtTime(parseDue(t.due))} ${esc(t.title)}</button>`)];
      cells += `<div class="cal-day ${d.getMonth() !== m ? 'out' : ''} ${k === dayKey(today) ? 'today' : ''} ${k === v.selected ? 'sel' : ''}" data-day="${k}">
        <span class="cal-num">${d.getDate()}${evs.length ? `<i class="cal-dots">${evs.slice(0, 3).map(ev => `<b style="background:${ev.color || evKind(ev).color}"></b>`).join('')}</i>` : ''}</span>
        ${chips.slice(0, 3).join('')}
        ${chips.length > 3 ? `<span class="cal-more">+${chips.length - 3} más</span>` : ''}</div>`;
    }
    const selItems = sortTasks(byDay[v.selected] || []);
    const selEvents = eventsOn(v.selected);
    const upcoming = upcomingEvents(45, 6);
    const sd = new Date(v.selected + 'T12:00');
    main.innerHTML = `<div class="page">
      <div class="view-head"><div><h1>📆 Calendario</h1><p class="muted">Entregas, eventos y fechas importantes. Toca un día para ver o añadir.</p></div>
        <div class="row"><button class="btn ghost" id="calPrev">‹</button><div class="cal-title">${MONTHS[m]} ${y}</div><button class="btn ghost" id="calNext">›</button><button class="btn ghost" id="calToday">Hoy</button></div></div>
      <div class="cal-layout">
        <div class="cal">
          <div class="cal-head">${['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'].map(d => `<span>${d}</span>`).join('')}</div>
          <div class="cal-grid">${cells}</div>
        </div>
        <aside class="agenda">
          <div class="agenda-date"><span class="ad-num">${sd.getDate()}</span><div><b>${WEEKDAYS[sd.getDay()]}</b><div class="muted small">${MONTHS[sd.getMonth()]} ${sd.getFullYear()}</div></div></div>
          ${selEvents.map(ev => `<div class="agenda-card ev" style="--c:${ev.color || evKind(ev).color}">
            <div class="ag-top"><span class="ag-clock">${evKind(ev).icon}</span><span class="muted small">${evKind(ev).name}${ev.repeat && ev.repeat !== 'none' ? ' · 🔁 ' + REPEATS[ev.repeat].toLowerCase() : ''}</span></div>
            <span class="ag-time">${ev.time || 'Todo el día'}</span>
            <button class="task-title big" data-ev="${ev.id}" data-occ="${v.selected}">${esc(ev.title)}</button>
            ${ev.notes ? `<div class="muted small">${esc(ev.notes)}</div>` : ''}</div>`).join('')}
          ${selItems.length ? selItems.map(t => `<div class="agenda-card" style="--c:${subjectColor(t.subject)}">
            <div class="ag-top"><span class="ag-clock">🕓</span><span class="muted small">${esc(t.subject || 'Sin materia')}</span></div>
            <span class="ag-time">${fmtTime(parseDue(t.due))}</span>
            <button class="task-title big" data-edit="${t.id}">Vencimiento de ${esc(t.title)}</button>
            ${statusSelect(t)}</div>`).join('') : (selEvents.length ? '' : '<p class="muted">Nada para este día. 🎈</p>')}
          <div class="row2 ag-add"><button class="btn primary" id="calAddEv">＋ Evento</button><button class="btn" id="calAdd">＋ Tarea</button></div>
          <div class="ag-up"><h4>Próximos eventos</h4>${upcoming.length ? upcoming.map(o => eventRowHTML(o.ev, o.key)).join('') : '<p class="muted small">Sin eventos en las próximas semanas. Añade exámenes, pagos o cumpleaños con <b>＋ Evento</b>.</p>'}</div>
        </aside>
      </div></div>`;
    $('#calPrev').onclick = () => { v.month = new Date(y, m - 1, 1); rerender(); };
    $('#calNext').onclick = () => { v.month = new Date(y, m + 1, 1); rerender(); };
    $('#calToday').onclick = () => { v.month = null; v.selected = null; rerender(); };
    $('#calAdd').onclick = () => editTask(null, { due: `${v.selected}T23:59` });
    $('#calAddEv').onclick = () => editEvent(null, { date: v.selected });
    $$('[data-day]', main).forEach(c => c.onclick = e => {
      if (e.target.closest('[data-edit],[data-ev]')) return;
      v.selected = c.dataset.day; rerender();
    });
    bindTaskControls(main);
    bindEventButtons(main);
  }
};
