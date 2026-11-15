// Eventos del calendario (un solo día, cada mes o cada año) y recordatorios de tareas, eventos y partidos.
const EVENT_KINDS = {
  evento: { name: 'Evento', icon: '📌', color: '#22d3ee' },
  importante: { name: 'Importante', icon: '⭐', color: '#f472b6' },
  examen: { name: 'Examen', icon: '📝', color: '#facc15' },
  pago: { name: 'Pago', icon: '💳', color: '#34d399' },
  cumple: { name: 'Cumpleaños', icon: '🎂', color: '#fb923c' },
  partido: { name: 'Partido', icon: '🏆', color: '#a78bfa' }
};
const REPEATS = { none: 'Solo ese día', monthly: 'Cada mes', yearly: 'Cada año' };

const daysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
const evKind = ev => EVENT_KINDS[ev.kind] || EVENT_KINDS.evento;

// ¿El evento cae en ese día (AAAA-MM-DD)? Los mensuales del 31 caen el último día de los meses cortos.
function eventOn(ev, key) {
  if (!ev.date || key < ev.date) return false;
  if (ev.skip && ev.skip.includes(key)) return false;
  if (!ev.repeat || ev.repeat === 'none') return key === ev.date;
  const [y, m, d] = key.split('-').map(Number);
  const [, em, ed] = ev.date.split('-').map(Number);
  if (ev.repeat === 'yearly' && m !== em) return false;
  return d === Math.min(ed, daysInMonth(y, m - 1));
}

function eventsOn(key) {
  return state.events.filter(ev => eventOn(ev, key)).sort((a, b) => (a.time || '').localeCompare(b.time || ''));
}

// Próximas ocurrencias de todos los eventos desde hoy.
function upcomingEvents(days = 30, max = 8) {
  const out = [];
  const d0 = new Date();
  for (let i = 0; i <= days && out.length < max; i++) {
    const key = dayKey(new Date(d0.getFullYear(), d0.getMonth(), d0.getDate() + i));
    for (const ev of eventsOn(key)) {
      if (i === 0 && ev.time && new Date(`${key}T${ev.time}`) < d0 - 36e5) continue;
      if (out.some(o => o.ev === ev)) continue;
      out.push({ ev, key });
    }
  }
  return out.slice(0, max);
}

function eventWhen(ev, key) {
  const d = new Date(key + 'T12:00');
  const today = dayKey(new Date()), tomorrow = dayKey(new Date(Date.now() + 864e5));
  const day = key === today ? 'Hoy' : key === tomorrow ? 'Mañana' : `${WEEKDAYS[d.getDay()].slice(0, 3)} ${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}`;
  return ev.time ? `${day} · ${ev.time}` : `${day} · todo el día`;
}

function eventChipHTML(ev, key) {
  const k = evKind(ev);
  return `<button class="cal-chip ev" data-ev="${ev.id}" data-occ="${key}" style="--c:${ev.color || k.color}">${k.icon} ${ev.time ? ev.time + ' ' : ''}${esc(ev.title)}</button>`;
}

function eventRowHTML(ev, key) {
  const k = evKind(ev);
  return `<button class="ev-row" data-ev="${ev.id}" data-occ="${key}" style="--c:${ev.color || k.color}">
    <span class="ev-ico">${k.icon}</span><span class="ev-main"><b>${esc(ev.title)}</b><small>${eventWhen(ev, key)}${ev.repeat && ev.repeat !== 'none' ? ` · 🔁 ${REPEATS[ev.repeat].toLowerCase()}` : ''}</small></span></button>`;
}

function bindEventButtons(el) {
  $$('[data-ev]', el).forEach(b => b.onclick = e => {
    e.stopPropagation();
    const ev = state.events.find(x => x.id === b.dataset.ev);
    if (ev) editEvent(ev, { date: b.dataset.occ });
  });
}

function editEvent(ev, preset = {}) {
  const isNew = !ev;
  const cur = ev || { title: '', kind: preset.kind || 'evento', date: preset.date || dayKey(new Date()), time: preset.time || '', repeat: 'none', notes: '', remind: true };
  const occ = preset.date || cur.date;
  const recurring = !isNew && cur.repeat && cur.repeat !== 'none';
  modal({
    title: isNew ? 'Nuevo evento' : 'Editar evento',
    body: `<label>¿Qué pasa?<input id="eTitle" value="${esc(cur.title)}" placeholder="Ej. Examen de Bases de Datos, pagar el gym, cumple de mamá…"></label>
      <div class="ev-kinds">${Object.entries(EVENT_KINDS).map(([k, v]) => `<button type="button" class="chip ${k === cur.kind ? 'on' : ''}" data-kind="${k}" style="--c:${v.color}">${v.icon} ${v.name}</button>`).join('')}</div>
      <div class="row2"><label>${recurring ? 'Primera fecha' : 'Fecha'}<input type="date" id="eDate" value="${cur.date}"></label>
      <label>Hora (opcional)<input type="time" id="eTime" value="${cur.time || ''}"></label></div>
      <label>Se repite<div class="seg full" id="eRepeat">${Object.entries(REPEATS).map(([k, v]) => `<button type="button" data-rep="${k}" class="${k === (cur.repeat || 'none') ? 'on' : ''}">${v}</button>`).join('')}</div></label>
      <p class="muted small" id="eRepHint">Sin hora = todo el día.</p>
      <label class="check"><input type="checkbox" id="eRemind" ${cur.remind !== false ? 'checked' : ''}> Avisarme 1 día antes y el mismo día</label>
      <label>Notas<textarea id="eNotes" rows="2" placeholder="Lugar, enlace, qué llevar…">${esc(cur.notes || '')}</textarea></label>
      ${isNew ? '' : `<div class="ev-del">${recurring ? `<button type="button" class="btn ghost" id="eSkip">Quitar solo el ${fmtDate(new Date(occ + 'T12:00'))}</button>` : ''}<button type="button" class="btn danger-ghost" id="eDel">🗑 Eliminar ${recurring ? 'toda la serie' : 'evento'}</button></div>`}`,
    onOpen(w, close) {
      let kind = cur.kind || 'evento', repeat = cur.repeat || 'none';
      const hint = () => {
        const v = $('#eDate', w).value;
        const d = v ? new Date(v + 'T12:00') : null;
        $('#eRepHint', w).textContent = !d ? '' : repeat === 'monthly' ? `Se repetirá el día ${d.getDate()} de cada mes${d.getDate() > 28 ? ' (o el último día en los meses más cortos)' : ''}.`
          : repeat === 'yearly' ? `Se repetirá cada ${d.getDate()} de ${MONTHS[d.getMonth()]}.` : 'Solo ese día. Si no pones hora, cuenta como todo el día.';
      };
      $$('[data-kind]', w).forEach(b => b.onclick = () => { kind = b.dataset.kind; $$('[data-kind]', w).forEach(x => x.classList.toggle('on', x === b)); });
      $$('[data-rep]', w).forEach(b => b.onclick = () => { repeat = b.dataset.rep; $$('[data-rep]', w).forEach(x => x.classList.toggle('on', x === b)); hint(); });
      $('#eDate', w).onchange = hint;
      hint();
      w._get = () => ({ kind, repeat });
      const del = $('#eDel', w);
      if (del) del.onclick = () => { state.events = state.events.filter(x => x !== ev); save(); close(); rerender(); checkReminders(); toast('Evento eliminado'); };
      const skip = $('#eSkip', w);
      if (skip) skip.onclick = () => { ev.skip = [...(ev.skip || []), occ]; save(); close(); rerender(); toast('Quitado solo ese día'); };
    },
    onOk(w) {
      const title = $('#eTitle', w).value.trim();
      const date = $('#eDate', w).value;
      if (!title) { toast('Escribe qué pasa ese día'); return false; }
      if (!date) { toast('Elige la fecha'); return false; }
      const { kind, repeat } = w._get();
      const data = { title, kind, date, time: $('#eTime', w).value, repeat, notes: $('#eNotes', w).value.trim(), remind: $('#eRemind', w).checked };
      if (isNew) state.events.push({ id: uid(), created: Date.now(), skip: [], ...data });
      else Object.assign(ev, data);
      save(); rerender(); checkReminders();
      toast(isNew ? `${EVENT_KINDS[kind].icon} Evento guardado${data.remind ? ' · te aviso 1 día antes y ese día' : ''}` : 'Evento actualizado');
    }
  });
}

// ---------- Recordatorios ----------
// Cada aviso: { key, at, until, title, body, view }. Se lanza si ahora está entre at y until y no se avisó antes.
function reminderList(fromMs, toMs) {
  const out = [];
  const add = r => { if (r.until > fromMs && r.at < toMs) out.push(r); };
  for (const t of state.tasks) {
    if (t.status === 'done' || !t.due) continue;
    const due = parseDue(t.due).getTime();
    for (const [key, ms, label] of [['24h', 864e5, 'mañana'], ['3h', 3 * 36e5, 'en menos de 3 horas']]) {
      add({ key: t.id + ':' + key + ':' + t.due, at: due - ms, until: due, title: `📌 Entrega ${label}`, body: `${t.title}${t.subject ? ' · ' + t.subject : ''} (${fmtTime(parseDue(t.due))})`, view: 'tasks' });
    }
  }
  const d0 = new Date(fromMs);
  const days = Math.ceil((toMs - fromMs) / 864e5) + 2;
  for (let i = -1; i <= days; i++) {
    const day = new Date(d0.getFullYear(), d0.getMonth(), d0.getDate() + i);
    const key = dayKey(day);
    for (const ev of eventsOn(key)) {
      if (ev.remind === false) continue;
      const k = evKind(ev);
      const start = day.getTime();
      const at = ev.time ? new Date(`${key}T${ev.time}`).getTime() : null;
      const base = `ev:${ev.id}:${key}:${ev.time || ''}`;
      add({ key: base + ':pre', at: start - 864e5 + 9 * 36e5, until: start, title: `${k.icon} Mañana: ${ev.title}`, body: `${ev.time ? 'A las ' + ev.time : 'Todo el día'} · ${k.name}${ev.notes ? ' · ' + ev.notes.slice(0, 80) : ''}`, view: 'calendar' });
      add({ key: base + ':day', at: Math.max(start, Math.min(start + 8 * 36e5, at ? at - 36e5 : Infinity)), until: at || start + 864e5 - 1, title: `${k.icon} Hoy: ${ev.title}`, body: `${ev.time ? 'A las ' + ev.time : 'Todo el día'} · ${k.name}${ev.notes ? ' · ' + ev.notes.slice(0, 80) : ''}`, view: 'calendar' });
    }
  }
  if (typeof sportsReminders === 'function') sportsReminders().forEach(add);
  return out.sort((a, b) => a.at - b.at);
}

let lastNativeSchedule = '';
function checkReminders() {
  const now = Date.now();
  const list = state.settings.reminders ? reminderList(now - 2 * 864e5, now + 35 * 864e5) : [];
  let changed = false;
  for (const r of list) {
    if (r.at <= now && now < r.until && !state.reminded[r.key]) {
      state.reminded[r.key] = now; changed = true;
      Platform.notify(r.title, r.body, r.view);
    }
  }
  // En Android los avisos futuros se programan en el sistema para que lleguen aunque la app esté cerrada.
  if (Platform.scheduleReminders) {
    const future = list.filter(r => r.at > now).slice(0, 60);
    const json = JSON.stringify(future.map(r => ({ at: r.at, title: r.title, body: r.body })));
    if (json !== lastNativeSchedule && Platform.scheduleReminders(json)) {
      lastNativeSchedule = json;
      for (const r of future) if (!state.reminded[r.key]) { state.reminded[r.key] = r.at; changed = true; }
    }
  }
  for (const [k, v] of Object.entries(state.reminded)) if (typeof v === 'number' && v < now - 60 * 864e5) { delete state.reminded[k]; changed = true; }
  if (changed) save();
}
