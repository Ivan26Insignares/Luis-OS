// Gimnasio: plan semanal, rutinas, registro de entrenos, récords y peso corporal.
// Rutinas: las crea Luis con «Nueva rutina».
function defaultGym() {
  return {
    version: 2,
    weeklyGoal: 4,
    routines: [],
    // 0 = lunes … 6 = domingo
    plan: [null, null, null, null, null, null, null],
    sessions: [],
    weights: []
  };
}

// Pasa los datos de la versión anterior a la rutina real sin perder entrenos ni pesos.
function migrateGym(g) {
  if (g.version >= 2) return g;
  const fresh = defaultGym();
  return { ...fresh, sessions: g.sessions || [], weights: g.weights || [] };
}

const GYM_DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

// "60x8, 60x8, 55x10" → [{kg:60,reps:8}, …]
function parseSets(txt) {
  return String(txt || '').replace(/(?<![x×*]\s*\d*)(\d+),(\d+)(?=\s*(?:kg)?\s*[x×*])/gi, '$1.$2').split(/[,;]+/).map(p => {
    const t = p.trim().replace(',', '.');
    const m = t.match(/^(\d+(?:\.\d+)?)\s*(?:kg)?\s*[x×*]\s*(\d+)/i);
    if (m) return { kg: +m[1], reps: +m[2] };
    const bw = t.match(/^(\d+)\s*(?:reps?)?$/i); // calistenia: solo repeticiones
    return bw ? { kg: 0, reps: +bw[1] } : null;
  }).filter(Boolean);
}

function weekStart(d) { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; }

function gymStats() {
  const g = state.gym;
  const days = new Set(g.sessions.map(s => s.date));
  const now = new Date();
  const ws = dayKey(weekStart(now));
  const thisWeek = g.sessions.filter(s => s.date >= ws).length;
  const thisMonth = g.sessions.filter(s => s.date.startsWith(dayKey(now).slice(0, 7))).length;
  // Racha: semanas seguidas (hasta la actual o la anterior) en las que cumpliste el objetivo semanal.
  let streak = 0;
  const w = weekStart(now);
  const countWeek = start => { const a = dayKey(start), e = new Date(start); e.setDate(e.getDate() + 7); const b = dayKey(e); return g.sessions.filter(s => s.date >= a && s.date < b).length; };
  if (countWeek(w) < g.weeklyGoal) w.setDate(w.getDate() - 7);
  while (countWeek(w) >= g.weeklyGoal && streak < 200) { streak++; w.setDate(w.getDate() - 7); }
  const prs = {};
  for (const s of g.sessions) for (const e of s.exercises || []) for (const set of parseSets(e.sets)) {
    const cur = prs[e.name];
    if (!cur || set.kg > cur.kg || (set.kg === cur.kg && set.reps > cur.reps)) prs[e.name] = { ...set, date: s.date };
  }
  return { days, thisWeek, thisMonth, streak, prs };
}

function renderGym(main) {
  {
    const g = state.gym;
    const st = gymStats();
    const today = (new Date().getDay() + 6) % 7;
    const todayRoutine = g.routines.find(r => r.id === g.plan[today]);
    const gymMovs = state.finance ? state.finance.movements.filter(m => m.category === 'Deporte y gimnasio' && m.out).sort((a, b) => a.date.localeCompare(b.date)) : [];
    const lastFee = gymMovs[gymMovs.length - 1];
    const firstLog = g.sessions.map(s => s.date).sort()[0];
    main.innerHTML = `<div>
      <div class="sub-head"><p class="muted">${todayRoutine ? `Hoy toca: <b class="white">${esc(todayRoutine.name)}</b> + 15 min de abdominales` : 'Hoy es día de descanso 😌'}</p>
        <div class="row"><button class="btn ghost" id="gWeight">⚖️ Peso</button><button class="btn primary" id="gLog">＋ Registrar entreno</button></div></div>
      <div class="kpis">
        ${kpi('Esta semana', `${st.thisWeek} / ${g.weeklyGoal}`, st.thisWeek >= g.weeklyGoal ? '#34d399' : '#f5a524', st.thisWeek >= g.weeklyGoal ? '¡objetivo cumplido! 💪' : `te faltan ${g.weeklyGoal - st.thisWeek}`)}
        ${kpi('Racha', `${st.streak} sem.`, '#a78bfa', 'semanas seguidas cumpliendo')}
        ${kpi('Este mes', `${st.thisMonth}`, '#22d3ee', 'entrenos')}
        ${kpi('Total', `${g.sessions.length}`, '#f472b6', 'entrenos registrados')}
        ${kpi('Último pago gym', lastFee ? money(lastFee.out) : '—', '#60a5fa', lastFee ? `${lastFee.concept} · ${fmtDate(new Date(lastFee.date + 'T12:00'))}` : 'según Finanzas')}
      </div>
      <div class="fin-grid">
        <section class="fin-card span2"><div class="goals-head"><h3>📅 Mi semana</h3><label class="small muted">Objetivo <input type="number" min="1" max="7" id="gGoal" value="${g.weeklyGoal}" class="tiny-in"> días/semana</label></div>
          <div class="week-plan">${GYM_DAYS.map((d, i) => {
            const r = g.routines.find(x => x.id === g.plan[i]);
            const date = new Date(weekStart(new Date())); date.setDate(date.getDate() + i);
            const done = st.days.has(dayKey(date));
            return `<div class="wp-day ${i === today ? 'today' : ''} ${done ? 'done' : ''}" style="--c:${r ? r.color : '#3a3a44'}">
              <span class="wp-d">${d} ${date.getDate()}</span>
              <select data-plan="${i}"><option value="">Descanso</option>${g.routines.map(x => `<option value="${x.id}" ${x.id === g.plan[i] ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select>
              <span class="wp-s">${done ? '✅ hecho' : i < today && r && firstLog && firstLog <= dayKey(date) ? '— no fuiste' : ''}</span></div>`;
          }).join('')}</div></section>
        <section class="fin-card span2"><h3>🟩 Asistencia (últimas 16 semanas)</h3>${heatmap(st.days)}</section>
        <section class="fin-card"><div class="goals-head"><h3>📋 Rutinas</h3><button class="btn ghost sm" id="gNewR">＋ Rutina</button></div>
          <div class="routines">${g.routines.map(r => `<div class="routine" style="--c:${r.color}"><div class="routine-h"><b>${esc(r.name)}</b><button class="mini-btn" data-edr="${r.id}">✎</button></div>
            <ul>${r.exercises.map(e => `<li><span>${esc(e.name)}</span><span class="muted">${esc(e.target)}</span></li>`).join('')}</ul>
            <button class="btn sm" data-start="${r.id}">▶ Registrar esta rutina</button></div>`).join('')}</div></section>
        <section class="fin-card"><h3>🏆 Récords personales</h3>${Object.keys(st.prs).length ? `<div class="asset-list">${Object.entries(st.prs).sort((a, b) => b[1].kg - a[1].kg).map(([n, p]) => `<div><span>${esc(n)}</span><span><b>${p.kg ? p.kg + ' kg' : 'peso corporal'}</b> × ${p.reps} <small class="muted">${fmtDate(new Date(p.date + 'T12:00'))}</small></span></div>`).join('')}</div>` : '<p class="muted">Registra tus series como <code>40x12, 45x10</code> (máquina) o <code>12, 10, 8</code> (calistenia) y aquí aparecerán tus mejores marcas.</p>'}
          <h3 style="margin-top:18px">⚖️ Peso corporal</h3>${weightChart()}</section>
        <section class="fin-card span2"><h3>🗒️ Historial</h3><div id="gHist">${history()}</div></section>
      </div></div>`;
    $('#gLog').onclick = () => editSession(null, todayRoutine && todayRoutine.id);
    $('#gWeight').onclick = addWeight;
    $('#gNewR').onclick = () => editRoutine(null);
    $('#gGoal').onchange = e => { g.weeklyGoal = Math.max(1, Math.min(7, +e.target.value || 4)); save(); rerender(); };
    $$('[data-plan]', main).forEach(s => s.onchange = () => { g.plan[+s.dataset.plan] = s.value || null; save(); rerender(); });
    $$('[data-edr]', main).forEach(b => b.onclick = () => editRoutine(g.routines.find(r => r.id === b.dataset.edr)));
    $$('[data-start]', main).forEach(b => b.onclick = () => editSession(null, b.dataset.start));
    $$('[data-sess]', main).forEach(b => b.onclick = () => editSession(g.sessions.find(s => s.id === b.dataset.sess)));
  }
}

function heatmap(days) {
  const start = weekStart(new Date()); start.setDate(start.getDate() - 15 * 7);
  const todayK = dayKey(new Date());
  let cols = '';
  for (let w = 0; w < 16; w++) {
    let cells = '';
    for (let d = 0; d < 7; d++) {
      const x = new Date(start); x.setDate(x.getDate() + w * 7 + d);
      const k = dayKey(x);
      cells += `<i class="${days.has(k) ? 'on' : ''} ${k > todayK ? 'future' : ''}" title="${fmtDate(x)}"></i>`;
    }
    cols += `<div class="hm-col">${cells}</div>`;
  }
  return `<div class="heatmap"><div class="hm-days">${GYM_DAYS.map((d, i) => `<span>${i % 2 ? '' : d}</span>`).join('')}</div>${cols}</div>`;
}

function weightChart() {
  const w = [...state.gym.weights].sort((a, b) => a.date.localeCompare(b.date));
  if (!w.length) return '<p class="muted small">Añade tu peso con ⚖️ para ver cómo cambia.</p>';
  const last = w[w.length - 1];
  if (w.length < 2) return `<p><b>${last.kg} kg</b> <span class="muted small">el ${fmtDate(new Date(last.date + 'T12:00'))}</span></p>`;
  const min = Math.min(...w.map(x => x.kg)) - 1, max = Math.max(...w.map(x => x.kg)) + 1;
  const pts = w.map((x, i) => `${(i / (w.length - 1) * 300).toFixed(1)},${(80 - (x.kg - min) / (max - min) * 80).toFixed(1)}`).join(' ');
  const diff = last.kg - w[0].kg;
  return `<svg class="spark" viewBox="-4 -4 308 88"><polyline points="${pts}" fill="none" stroke="#22d3ee" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/></svg>
    <p class="small"><b>${last.kg} kg</b> · <span class="muted">${diff >= 0 ? '+' : ''}${diff.toFixed(1)} kg desde ${fmtDate(new Date(w[0].date + 'T12:00'))}</span></p>`;
}

function history() {
  const list = [...state.gym.sessions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 40);
  if (!list.length) return '<p class="muted">Aún no hay entrenos. Pulsa <b>＋ Registrar entreno</b> al salir del gym.</p>';
  return `<div class="mov-list">${list.map(s => {
    const r = state.gym.routines.find(x => x.id === s.routine);
    const vol = (s.exercises || []).reduce((a, e) => a + parseSets(e.sets).reduce((b, x) => b + x.kg * x.reps, 0), 0);
    return `<div class="mov" data-sess="${s.id}"><span class="mov-date">${fmtDate(new Date(s.date + 'T12:00'))}</span>
      <span class="mov-main"><b>${esc(r ? r.name : s.title || 'Entreno')}</b><small>${(s.exercises || []).filter(e => e.sets).map(e => esc(e.name)).join(' · ') || esc(s.notes || '')}</small></span>
      <span class="mov-amt">${s.minutes ? s.minutes + ' min' : ''}${vol ? ` · ${Math.round(vol).toLocaleString('es-ES')} kg` : ''}</span></div>`;
  }).join('')}</div>`;
}

function editSession(sess, routineId) {
  const g = state.gym;
  const isNew = !sess;
  const cur = sess || { date: dayKey(new Date()), routine: routineId || '', minutes: 60, notes: '', feel: 3, exercises: [] };
  const exFor = rid => {
    const r = g.routines.find(x => x.id === rid);
    if (!r) return cur.exercises.length ? cur.exercises : [{ name: '', sets: '' }];
    // Pre-rellena con lo que hiciste la última vez en ese ejercicio.
    return r.exercises.map(e => {
      const prev = [...g.sessions].sort((a, b) => b.date.localeCompare(a.date)).flatMap(s => s.exercises || []).find(x => x.name === e.name && x.sets);
      return { name: e.name, sets: '', hint: prev ? `última vez: ${prev.sets}` : `objetivo ${e.target}` };
    });
  };
  const rows = list => list.map((e, i) => `<div class="ex-row"><input data-exn="${i}" value="${esc(e.name)}" placeholder="Ejercicio"><input data-exs="${i}" value="${esc(e.sets || '')}" placeholder="${esc(e.hint || 'ej. 40x12 o 12, 10')}"></div>`).join('');
  modal({
    title: isNew ? 'Registrar entreno' : 'Editar entreno', wide: true,
    body: `<div class="row3"><label>Fecha<input type="date" id="sDate" value="${cur.date}"></label>
      <label>Rutina<select id="sRoutine"><option value="">Libre</option>${g.routines.map(r => `<option value="${r.id}" ${r.id === cur.routine ? 'selected' : ''}>${esc(r.name)}</option>`).join('')}</select></label>
      <label>Duración (min)<input type="number" id="sMin" value="${cur.minutes || ''}"></label></div>
      <div class="lbl">Máquina: <code>kg×reps</code> separadas por comas (ej. <code>40x12, 45x10</code>). Calistenia: solo las reps (ej. <code>12, 10, 8</code>). Abdominales: escribe lo que hiciste.</div>
      <div id="exRows">${rows(isNew ? exFor(cur.routine) : cur.exercises)}</div>
      <button type="button" class="btn ghost sm" id="exAdd">＋ Ejercicio</button>
      <label>¿Cómo te sentiste?<div class="feel" id="sFeel">${['😩', '😕', '🙂', '😄', '🔥'].map((e, i) => `<button type="button" data-f="${i + 1}" class="${cur.feel === i + 1 ? 'on' : ''}">${e}</button>`).join('')}</div></label>
      <label>Notas<textarea id="sNotes" rows="2">${esc(cur.notes || '')}</textarea></label>
      ${isNew ? '' : '<button type="button" class="btn ghost danger-text" id="sDel">🗑 Eliminar entreno</button>'}`,
    onOpen(w, close) {
      $('#sRoutine', w).onchange = e => { $('#exRows', w).innerHTML = rows(exFor(e.target.value)); };
      $('#exAdd', w).onclick = () => { const n = $$('[data-exn]', w).length; $('#exRows', w).insertAdjacentHTML('beforeend', rows([{ name: '', sets: '' }]).replace(/data-ex([ns])="0"/g, `data-ex$1="${n}"`)); };
      $$('#sFeel [data-f]', w).forEach(b => b.onclick = () => $$('#sFeel [data-f]', w).forEach(x => x.classList.toggle('on', x === b)));
      const del = $('#sDel', w);
      if (del) del.onclick = () => { g.sessions = g.sessions.filter(x => x !== sess); save(); close(); rerender(); };
    },
    onOk(w) {
      const exercises = $$('[data-exn]', w).map((inp, i) => ({ name: inp.value.trim(), sets: ($$('[data-exs]', w)[i] || {}).value?.trim() || '' })).filter(e => e.name);
      const data = { date: $('#sDate', w).value || dayKey(new Date()), routine: $('#sRoutine', w).value, minutes: +$('#sMin', w).value || 0, notes: $('#sNotes', w).value.trim(), feel: +($('#sFeel .on', w)?.dataset.f || 3), exercises };
      if (isNew) { g.sessions.push({ id: uid(), ...data }); celebrateGym(); }
      else Object.assign(sess, data);
      save(); rerender();
    }
  });
}

function celebrateGym() {
  const st = gymStats();
  toast(st.thisWeek >= state.gym.weeklyGoal ? `💪 ¡Objetivo semanal cumplido! (${st.thisWeek}/${state.gym.weeklyGoal})` : `💪 Entreno guardado · llevas ${st.thisWeek} esta semana`);
}

function editRoutine(r) {
  const isNew = !r;
  const cur = r || { name: '', color: SUBJECT_COLORS[state.gym.routines.length % SUBJECT_COLORS.length], exercises: [] };
  modal({
    title: isNew ? 'Nueva rutina' : 'Editar rutina',
    body: `<label>Nombre<input id="rName" value="${esc(cur.name)}" placeholder="Ej. Torso"></label>
      <label>Ejercicios (uno por línea, con el objetivo tras un guion)<textarea id="rEx" rows="7" placeholder="Press banca - 4×8">${esc(cur.exercises.map(e => `${e.name} - ${e.target}`).join('\n'))}</textarea></label>
      <div class="lbl">Color</div><div class="pick-row" id="rColors">${SUBJECT_COLORS.map(c => `<button type="button" class="pick dot ${c === cur.color ? 'sel' : ''}" data-v="${c}" style="background:${c}"></button>`).join('')}</div>
      ${isNew ? '' : '<button type="button" class="btn ghost danger-text" id="rDel">🗑 Eliminar rutina</button>'}`,
    onOpen(w, close) {
      $$('#rColors .pick', w).forEach(b => b.onclick = () => { $$('#rColors .pick', w).forEach(x => x.classList.remove('sel')); b.classList.add('sel'); });
      const del = $('#rDel', w);
      if (del) del.onclick = () => { state.gym.routines = state.gym.routines.filter(x => x !== r); state.gym.plan = state.gym.plan.map(p => p === r.id ? null : p); save(); close(); rerender(); };
    },
    onOk(w) {
      const name = $('#rName', w).value.trim();
      if (!name) { toast('Ponle nombre a la rutina'); return false; }
      const exercises = $('#rEx', w).value.split('\n').map(l => l.trim()).filter(Boolean).map(l => { const [n, ...t] = l.split(/\s+-\s+/); return { name: n.trim(), target: t.join(' - ').trim() }; });
      const data = { name, exercises, color: $('#rColors .sel', w)?.dataset.v || cur.color };
      if (isNew) state.gym.routines.push({ id: uid(), ...data }); else Object.assign(r, data);
      save(); rerender();
    }
  });
}

function addWeight() {
  modal({
    title: 'Peso corporal',
    body: `<div class="row2"><label>Peso (kg)<input type="number" step="0.1" id="wKg" placeholder="70.5"></label><label>Fecha<input type="date" id="wDate" value="${dayKey(new Date())}"></label></div>`,
    onOk(w) {
      const kg = parseFloat($('#wKg', w).value);
      if (!kg) { toast('Escribe tu peso'); return false; }
      const date = $('#wDate', w).value || dayKey(new Date());
      state.gym.weights = state.gym.weights.filter(x => x.date !== date).concat({ date, kg });
      save(); rerender();
    }
  });
}
