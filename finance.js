// Finanzas: movimientos de tu cuenta, análisis por mes, gastos por tipo y objetivos mensuales.
const EXPENSE_TYPES = {
  fijo:      { name: 'Fijos y recurrentes', color: '#60a5fa', desc: 'Gimnasio, suscripciones, comisiones' },
  necesario: { name: 'Necesarios', color: '#34d399', desc: 'Súper, transporte, estudios, trámites, hogar' },
  ocio:      { name: 'Ocio y comida fuera', color: '#f472b6', desc: 'Cafés, bares, comer fuera, caprichos' },
  compras:   { name: 'Compras personales', color: '#f5a524', desc: 'Tecnología, decoración, regalos, otros' }
};
const DEFAULT_CAT_TYPES = {
  'Deporte y gimnasio': 'fijo', 'Suscripciones': 'fijo', 'Comisiones': 'fijo',
  'Supermercado': 'necesario', 'Transporte': 'necesario', 'Trámites': 'necesario', 'Material de estudio': 'necesario', 'Formación': 'necesario', 'Hogar y bricolaje': 'necesario',
  'Cafés y bares': 'ocio', 'Comida fuera': 'ocio', 'Caprichos': 'ocio',
  'Tecnología / PC': 'compras', 'Decoración y compras': 'compras', 'Regalos': 'compras', 'Otros': 'compras'
};
const INCOME_CATS = ['Ingreso familiar', 'Bonificaciones e intereses', 'Nómina', 'Trabajo', 'Ingreso extra'];

function defaultFinance() {
  return {
    movements: (typeof TR_SEED !== 'undefined' ? TR_SEED : []).map(r => ({ id: uid(), date: r[0], type: r[1], concept: r[2], category: r[3], ant: !!r[4], in: r[5], out: r[6] })),
    catTypes: { ...DEFAULT_CAT_TYPES },
    // Objetivos de cada mes (0 = sin objetivo; se editan en la app).
    goals: { incomeMin: 0, spendMax: 0, investMin: 0, antMax: 0, saveRate: 20, types: { fijo: 0, necesario: 0, ocio: 0, compras: 0 } },
    month: ''
  };
}

const money = (n, dec = 2) => (n < 0 ? '−' : '') + Math.abs(n).toLocaleString('es-ES', { minimumFractionDigits: dec, maximumFractionDigits: dec }) + ' €';
const isInvest = m => /^Inversi/i.test(m.category);
const isIncomeMov = m => m.in > 0;
const monthName = k => { const [y, mo] = k.split('-'); return `${MONTHS[+mo - 1]} ${y}`; };
const catType = c => state.finance.catTypes[c] || 'compras';

// Resumen de un conjunto de movimientos.
function finSummary(list) {
  const s = { income: 0, spend: 0, invest: 0, ant: 0, antN: 0, byCat: {}, byType: {}, byIncome: {}, byAsset: {}, byInvKind: {} };
  for (const k of Object.keys(EXPENSE_TYPES)) s.byType[k] = 0;
  for (const m of list) {
    if (m.in) { s.income += m.in; s.byIncome[m.category] = (s.byIncome[m.category] || 0) + m.in; }
    if (!m.out) continue;
    if (isInvest(m)) {
      s.invest += m.out;
      const asset = m.concept.replace(/\(.*\)/, '').replace(/^(Plan de ahorro|Compra)\s+/i, '').replace(/\s*-\s*saveback/i, '').trim();
      s.byAsset[asset] = (s.byAsset[asset] || 0) + m.out;
      const kind = m.category.replace(/^Inversi[oó]n\s*-\s*/i, '');
      s.byInvKind[kind] = (s.byInvKind[kind] || 0) + m.out;
      continue;
    }
    s.spend += m.out;
    s.byCat[m.category] = (s.byCat[m.category] || 0) + m.out;
    s.byType[catType(m.category)] = (s.byType[catType(m.category)] || 0) + m.out;
    if (m.ant) { s.ant += m.out; s.antN++; }
  }
  s.net = s.income - s.spend - s.invest;
  s.saveRate = s.income ? (s.income - s.spend) / s.income * 100 : 0;
  return s;
}

function finMonths() {
  return [...new Set(state.finance.movements.map(m => m.date.slice(0, 7)))].sort();
}

function finBalance(upTo) {
  return state.finance.movements.filter(m => !upTo || m.date <= upTo).reduce((a, m) => a + (m.in || 0) - (m.out || 0), 0);
}

VIEWS.finance = {
  q: '',
  render(main) {
    const f = state.finance;
    const months = finMonths();
    if (!f.month || (f.month !== 'all' && !months.includes(f.month))) f.month = months[months.length - 1] || 'all';
    const sel = f.month;
    const list = f.movements.filter(m => sel === 'all' || m.date.startsWith(sel));
    const s = finSummary(list);
    const nMonths = sel === 'all' ? Math.max(1, months.length) : 1;
    main.innerHTML = `<div class="page">
      <div class="view-head"><div><h1>💶 Finanzas</h1><p class="muted">Tu dinero · saldo actual <b class="white">${money(finBalance())}</b></p></div>
        <div class="row wrap"><button class="btn ghost" id="fImport">⬆ Importar CSV</button><button class="btn primary" id="fAdd">＋ Movimiento</button></div></div>
      <div class="chips month-chips">${months.map(k => `<button class="chip ${k === sel ? 'on' : ''}" data-month="${k}">${monthName(k)}</button>`).join('')}<button class="chip ${sel === 'all' ? 'on' : ''}" data-month="all">Todo</button></div>
      
      <div class="kpis">
        ${kpi('Ingresos', money(s.income), '#34d399', Object.entries(s.byIncome).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}: ${money(v)}`).join(' · '))}
        ${kpi('Gastos', money(s.spend), '#fb7185', `${list.filter(m => m.out && !isInvest(m)).length} movimientos${nMonths > 1 ? ' · ' + money(s.spend / nMonths) + '/mes' : ''}`)}
        ${kpi('Invertido', money(s.invest), '#a78bfa', `${Object.keys(s.byAsset).length} valores`)}
        ${kpi('Gastos hormiga', money(s.ant), '#f5a524', `${s.antN} compras pequeñas`)}
        ${kpi('Ahorro sobre ingresos', s.income ? Math.round(s.saveRate) + ' %' : '—', '#22d3ee', 'lo que no gastaste (incluye lo invertido)')}
      </div>
      <div class="fin-grid">
        <section class="fin-card span2" id="goalsCard"></section>
        <section class="fin-card"><h3>🧩 Gastos por tipo</h3>${typeBreakdown(s)}</section>
        <section class="fin-card"><h3>📊 Por categoría</h3>${catBars(s)}</section>
        <section class="fin-card"><h3>📈 Mes a mes</h3>${monthBars()}</section>
        <section class="fin-card"><h3>📌 Inversiones</h3>${investBlock(s)}</section>
        <section class="fin-card span2"><h3>🔍 Análisis</h3><ul class="insights">${insights(s, sel, list).map(t => `<li>${t}</li>`).join('')}</ul></section>
        <section class="fin-card span2"><div class="fin-mov-head"><h3>🧾 Movimientos</h3><input class="search" id="fSearch" placeholder="Buscar concepto o categoría…" value="${esc(VIEWS.finance.q)}"></div><div id="movList"></div></section>
      </div></div>`;
    $$('[data-month]', main).forEach(b => b.onclick = () => { f.month = b.dataset.month; save(); rerender(); });
    $('#fAdd').onclick = () => editMovement(null);
    $('#fImport').onclick = importCSV;
    $('#fSearch').oninput = e => { VIEWS.finance.q = e.target.value; drawMovements(list); };
    renderGoals($('#goalsCard'), sel === 'all' ? (months[months.length - 1] || dayKey(new Date()).slice(0, 7)) : sel);
    drawMovements(list);
    $$('[data-cattype]', main).forEach(s2 => s2.onchange = () => { f.catTypes[s2.dataset.cattype] = s2.value; save(); rerender(); });
  }
};

function kpi(label, value, color, sub) {
  return `<div class="kpi" style="--c:${color}"><span class="kpi-l">${label}</span><span class="kpi-v">${value}</span><span class="kpi-s">${esc(sub || '')}</span></div>`;
}

function typeBreakdown(s) {
  const total = s.spend || 1;
  const bar = Object.entries(EXPENSE_TYPES).map(([k, t]) => s.byType[k] ? `<i style="width:${s.byType[k] / total * 100}%;background:${t.color}" title="${t.name}"></i>` : '').join('');
  const rows = Object.entries(EXPENSE_TYPES).map(([k, t]) => {
    const cats = Object.entries(s.byCat).filter(([c]) => catType(c) === k).sort((a, b) => b[1] - a[1]);
    return `<details class="type-row" ${s.byType[k] ? '' : 'data-empty'}><summary><span class="dot" style="background:${t.color}"></span><b>${t.name}</b><span class="muted small">${Math.round((s.byType[k] || 0) / total * 100)} %</span><span class="amt">${money(s.byType[k] || 0)}</span></summary>
      <div class="type-cats">${cats.length ? cats.map(([c, v]) => `<div><span>${esc(c)}</span><select class="mini-sel" data-cattype="${esc(c)}" title="Cambiar el tipo de esta categoría">${Object.entries(EXPENSE_TYPES).map(([k2, t2]) => `<option value="${k2}" ${k2 === k ? 'selected' : ''}>${t2.name}</option>`).join('')}</select><span>${money(v)}</span></div>`).join('') : `<div class="muted small">${t.desc}</div>`}</div></details>`;
  }).join('');
  return `<div class="stack-bar">${bar}</div>${rows}<p class="muted small">Toca un tipo para ver sus categorías. Puedes mover una categoría a otro tipo.</p>`;
}

function catBars(s) {
  const entries = Object.entries(s.byCat).sort((a, b) => b[1] - a[1]);
  if (!entries.length) return '<p class="muted">Sin gastos en este periodo.</p>';
  const max = entries[0][1];
  return `<div class="hbars">${entries.map(([c, v]) => `<div class="hbar"><span class="hb-l">${esc(c)}</span><span class="hb-t"><i style="width:${v / max * 100}%;background:${EXPENSE_TYPES[catType(c)].color}"></i></span><span class="hb-v">${money(v)}</span></div>`).join('')}</div>`;
}

function monthBars() {
  const months = finMonths();
  const data = months.map(k => ({ k, s: finSummary(state.finance.movements.filter(m => m.date.startsWith(k))) }));
  const max = Math.max(1, ...data.flatMap(d => [d.s.income, d.s.spend, d.s.invest]));
  const g = state.finance.goals;
  const series = [['income', '#34d399', 'Ingresos'], ['spend', '#fb7185', 'Gastos'], ['invest', '#a78bfa', 'Invertido']];
  return `<div class="mbars">${data.map(d => `<div class="mb-col"><div class="mb-bars">${series.map(([k, c, n]) => `<i style="height:${d.s[k] / max * 100}%;background:${c}" title="${n}: ${money(d.s[k])}"><b>${Math.round(d.s[k])}</b></i>`).join('')}
      ${g.spendMax ? `<span class="mb-goal" style="bottom:${Math.min(100, g.spendMax / max * 100)}%" title="Límite de gasto ${money(g.spendMax)}"></span>` : ''}</div><span class="mb-l">${MONTHS[+d.k.slice(5) - 1].slice(0, 3)}</span></div>`).join('')}</div>
    <div class="legend">${series.map(([, c, n]) => `<span><i style="background:${c}"></i>${n}</span>`).join('')}${g.spendMax ? '<span><i class="dash"></i>Límite de gasto</span>' : ''}</div>`;
}

function investBlock(s) {
  const entries = Object.entries(s.byAsset).sort((a, b) => b[1] - a[1]);
  if (!entries.length) return '<p class="muted">Sin inversiones en este periodo.</p>';
  const kinds = Object.entries(s.byInvKind).sort((a, b) => b[1] - a[1]);
  const colors = { 'acciones': '#a78bfa', 'ETF': '#22d3ee', 'derivados (turbo)': '#fb7185' };
  return `<div class="stack-bar">${kinds.map(([k, v]) => `<i style="width:${v / s.invest * 100}%;background:${colors[k] || '#f5a524'}" title="${esc(k)}"></i>`).join('')}</div>
    <div class="legend">${kinds.map(([k, v]) => `<span><i style="background:${colors[k] || '#f5a524'}"></i>${esc(k)} ${Math.round(v / s.invest * 100)} %</span>`).join('')}</div>
    <div class="asset-list">${entries.map(([a, v]) => `<div><span>${esc(a)}</span><span>${money(v)}</span></div>`).join('')}</div>
    <p class="muted small">Es lo que aportaste, no el valor actual de mercado.</p>`;
}

function insights(s, sel, list) {
  const out = [];
  const months = finMonths();
  const full = months.filter(k => k !== '2026-08');
  const avgSpend = full.length ? full.reduce((a, k) => a + finSummary(state.finance.movements.filter(m => m.date.startsWith(k))).spend, 0) / full.length : s.spend;
  const all = finSummary(state.finance.movements);
  const fam = all.byIncome['Ingreso familiar'] || 0;
  if (sel === 'all') {
    out.push(`Entre agosto y octubre entraron <b>${money(all.income)}</b>, gastaste <b>${money(all.spend)}</b> e invertiste <b>${money(all.invest)}</b>. Te quedan <b>${money(finBalance())}</b> en cuenta.`);
  }
  if (all.income) out.push(`El <b>${Math.round(fam / all.income * 100)} %</b> de tus ingresos son transferencias familiares; los intereses y el saveback suman ${money((all.byIncome['Bonificaciones e intereses'] || 0))}. Un ingreso propio (clases, freelance web, prácticas) te daría más margen.`);
  out.push(`En un mes completo gastas de media <b>${money(avgSpend)}</b> (septiembre ${money(finSummary(state.finance.movements.filter(m => m.date.startsWith('2026-09'))).spend)}, octubre ${money(finSummary(state.finance.movements.filter(m => m.date.startsWith('2026-10'))).spend)} hasta el día 23).`);
  const top = Object.entries(s.byType).sort((a, b) => b[1] - a[1])[0];
  if (top && top[1]) out.push(`Tu tipo de gasto más grande ${sel === 'all' ? 'en total' : 'este mes'} es <b>${EXPENSE_TYPES[top[0]].name.toLowerCase()}</b>: ${money(top[1])} (${Math.round(top[1] / (s.spend || 1) * 100)} %).`);
  if (all.ant) out.push(`Los <b>gastos hormiga</b> (cafés, bici, snacks) suman ${money(all.ant)} en ${all.antN} compras, unos ${money(all.ant / all.antN)} cada una. Al ritmo de septiembre serían ~${money(finSummary(state.finance.movements.filter(m => m.date.startsWith('2026-09'))).ant * 12, 0)} al año.`);
  const big = state.finance.movements.filter(m => m.out && !isInvest(m) && m.out >= 45).sort((a, b) => b.out - a.out);
  if (big.length) out.push(`Las compras grandes explican la mayor parte del gasto: ${big.slice(0, 4).map(m => `${esc(m.concept)} (${money(m.out)})`).join(', ')}. Si planeas una así, apártala con un mes de antelación.`);
  const subs = state.finance.movements.filter(m => m.out && (m.category === 'Suscripciones' || m.category === 'Deporte y gimnasio'));
  if (subs.length) {
    const last = {};
    for (const m of subs) last[m.concept.replace(/\s*\(.*\)/, '')] = m.out;
    out.push(`Gastos fijos y suscripciones detectados: ${Object.entries(last).map(([k, v]) => `${esc(k)} (${money(v)})`).join(', ')}. Revisa cada mes si los sigues usando.`);
  }
  if (all.invest) out.push(`Invertiste el <b>${Math.round(all.invest / (all.income || 1) * 100)} %</b> de lo que entró: muy buen hábito. Los planes de ahorro en el Vanguard All-World y Berkshire son la base diversificada; el <b>turbo sobre Alphabet</b> (${money(all.byAsset['Turbo sobre Alphabet A'] || 0)}) es un derivado apalancado que puede perder todo su valor, así que conviene que sea una parte pequeña.`);
  if (sel !== 'all' && !list.length) out.push('No hay movimientos en este periodo.');
  return out;
}

// ---------- Objetivos mensuales ----------
function renderGoals(el, month) {
  const g = state.finance.goals;
  const s = finSummary(state.finance.movements.filter(m => m.date.startsWith(month)));
  const today = new Date();
  const [y, mo] = month.split('-').map(Number);
  const daysIn = new Date(y, mo, 0).getDate();
  const isCurrent = today.getFullYear() === y && today.getMonth() + 1 === mo;
  const dayFrac = isCurrent ? today.getDate() / daysIn : 1;
  // "más" = queremos llegar al objetivo; "menos" = no pasarnos del límite.
  const rows = [
    ['Ingresos', s.income, g.incomeMin, 'min', '#34d399'],
    ['Gasto total', s.spend, g.spendMax, 'max', '#fb7185'],
    ['Invertir', s.invest, g.investMin, 'min', '#a78bfa'],
    ['Gastos hormiga', s.ant, g.antMax, 'max', '#f5a524'],
    ...Object.entries(EXPENSE_TYPES).map(([k, t]) => [t.name, s.byType[k] || 0, g.types[k] || 0, 'max', t.color])
  ];
  const saveOk = s.saveRate >= g.saveRate;
  el.innerHTML = `<div class="goals-head"><h3>🎯 Objetivos de ${monthName(month)}</h3>
      ${isCurrent ? `<span class="muted small">Vas por el día ${today.getDate()} de ${daysIn} (${Math.round(dayFrac * 100)} % del mes)</span>` : ''}
      <button class="btn ghost sm" id="goalEdit">✎ Editar objetivos</button></div>
    <div class="goals">${rows.map(([n, v, goal, mode, c]) => {
      if (!goal) return '';
      const pct = v / goal * 100;
      const status = mode === 'max' ? (pct > 100 ? 'over' : pct > dayFrac * 100 + 10 ? 'warn' : 'ok') : (pct >= 100 ? 'ok' : pct >= dayFrac * 100 - 10 ? 'warn' : 'over');
      const label = mode === 'max'
        ? (pct > 100 ? `te pasaste ${money(v - goal)}` : `te quedan ${money(goal - v)}`)
        : (pct >= 100 ? 'conseguido 🎉' : `faltan ${money(goal - v)}`);
      return `<div class="goal ${status}"><div class="goal-top"><span>${mode === 'max' ? '≤' : '≥'} ${n}</span><span class="goal-v"><b>${money(v)}</b> / ${money(goal, 0)}</span></div>
        <div class="goal-bar"><i style="width:${Math.min(100, pct)}%;background:${c}"></i>${mode === 'max' && isCurrent ? `<span class="pace" style="left:${dayFrac * 100}%" title="Ritmo ideal a día de hoy"></span>` : ''}</div>
        <div class="goal-s">${label}</div></div>`;
    }).join('')}
    <div class="goal ${saveOk ? 'ok' : 'over'}"><div class="goal-top"><span>≥ Ahorro sobre ingresos</span><span class="goal-v"><b>${s.income ? Math.round(s.saveRate) : 0} %</b> / ${g.saveRate} %</span></div>
      <div class="goal-bar"><i style="width:${Math.max(0, Math.min(100, s.saveRate / g.saveRate * 100))}%;background:#22d3ee"></i></div><div class="goal-s">${saveOk ? 'conseguido 🎉' : 'gasta menos o ingresa más'}</div></div></div>`;
  $('#goalEdit', el).onclick = editGoals;
}

function editGoals() {
  const g = state.finance.goals;
  modal({
    title: 'Objetivos mensuales', wide: true,
    body: `<p class="muted small">Propuestos a partir de tus movimientos de agosto a octubre. Se aplican a cada mes.</p>
      <div class="row3"><label>Ingresos mínimos (€)<input type="number" id="gIn" value="${g.incomeMin}"></label>
      <label>Gasto total máximo (€)<input type="number" id="gSp" value="${g.spendMax}"></label>
      <label>Invertir al menos (€)<input type="number" id="gInv" value="${g.investMin}"></label></div>
      <div class="row3"><label>Gastos hormiga máx. (€)<input type="number" id="gAnt" value="${g.antMax}"></label>
      <label>Ahorro mínimo (% ingresos)<input type="number" id="gSave" value="${g.saveRate}"></label></div>
      <div class="lbl">Límite por tipo de gasto (€)</div>
      <div class="row2">${Object.entries(EXPENSE_TYPES).map(([k, t]) => `<label>${t.name}<input type="number" data-gt="${k}" value="${g.types[k] || 0}"></label>`).join('')}</div>`,
    onOk(w) {
      const n = id => Math.max(0, parseFloat($(id, w).value) || 0);
      g.incomeMin = n('#gIn'); g.spendMax = n('#gSp'); g.investMin = n('#gInv'); g.antMax = n('#gAnt'); g.saveRate = n('#gSave');
      $$('[data-gt]', w).forEach(i => g.types[i.dataset.gt] = Math.max(0, parseFloat(i.value) || 0));
      save(); rerender();
    }
  });
}

// ---------- Movimientos ----------
function drawMovements(list) {
  const el = $('#movList');
  if (!el) return;
  const q = VIEWS.finance.q.trim().toLowerCase();
  const rows = [...list].filter(m => !q || (m.concept + ' ' + m.category).toLowerCase().includes(q)).sort((a, b) => b.date.localeCompare(a.date));
  el.innerHTML = `<div class="mov-list">${rows.map(m => {
    const inv = isInvest(m), t = inv ? null : EXPENSE_TYPES[catType(m.category)];
    return `<div class="mov" data-mov="${m.id}">
      <span class="mov-date">${+m.date.slice(8)} ${MONTHS[+m.date.slice(5, 7) - 1].slice(0, 3)}</span>
      <span class="mov-main"><b>${esc(m.concept)}</b><small>${esc(m.category)}${m.out && !inv ? ` · <i style="color:${t.color}">${t.name}</i>` : ''}${m.ant ? ' · 🐜 hormiga' : ''}</small></span>
      <span class="mov-amt ${m.in ? 'pos' : inv ? 'inv' : ''}">${m.in ? '+' + money(m.in) : '−' + money(m.out)}</span></div>`;
  }).join('') || '<p class="muted">Nada que mostrar.</p>'}</div>`;
  $$('[data-mov]', el).forEach(r => r.onclick = () => editMovement(state.finance.movements.find(m => m.id === r.dataset.mov)));
}

function editMovement(m) {
  const isNew = !m;
  const cur = m || { date: dayKey(new Date()), type: 'Tarjeta', concept: '', category: 'Cafés y bares', ant: false, in: 0, out: 0 };
  const cats = [...new Set([...Object.keys(state.finance.catTypes), ...INCOME_CATS, 'Inversión - acciones', 'Inversión - ETF', ...state.finance.movements.map(x => x.category)])];
  modal({
    title: isNew ? 'Nuevo movimiento' : 'Editar movimiento',
    body: `<div class="seg" id="mDir"><button type="button" data-d="out" class="${cur.in ? '' : 'on'}">Gasto / salida</button><button type="button" data-d="in" class="${cur.in ? 'on' : ''}">Ingreso</button></div>
      <label>Concepto<input id="mConcept" value="${esc(cur.concept)}" placeholder="Ej. Bar de Chema"></label>
      <div class="row2"><label>Importe (€)<input type="number" step="0.01" id="mAmt" value="${cur.in || cur.out || ''}"></label>
      <label>Fecha<input type="date" id="mDate" value="${cur.date}"></label></div>
      <label>Categoría<input id="mCat" list="catList" value="${esc(cur.category)}"><datalist id="catList">${cats.map(c => `<option value="${esc(c)}">`).join('')}</datalist></label>
      <label class="check"><input type="checkbox" id="mAnt" ${cur.ant ? 'checked' : ''}> Es un gasto hormiga 🐜</label>
      ${isNew ? '' : '<button type="button" class="btn ghost danger-text" id="mDel">🗑 Eliminar movimiento</button>'}`,
    onOpen(w, close) {
      $$('#mDir [data-d]', w).forEach(b => b.onclick = () => $$('#mDir [data-d]', w).forEach(x => x.classList.toggle('on', x === b)));
      const del = $('#mDel', w);
      if (del) del.onclick = () => { state.finance.movements = state.finance.movements.filter(x => x !== m); save(); close(); rerender(); };
    },
    onOk(w) {
      const amt = Math.abs(parseFloat($('#mAmt', w).value) || 0);
      const concept = $('#mConcept', w).value.trim();
      if (!amt || !concept) { toast('Pon concepto e importe'); return false; }
      const dirIn = $('#mDir [data-d="in"]', w).classList.contains('on');
      const category = $('#mCat', w).value.trim() || 'Otros';
      const data = { concept, date: $('#mDate', w).value || dayKey(new Date()), category, ant: $('#mAnt', w).checked, in: dirIn ? amt : 0, out: dirIn ? 0 : amt };
      if (!dirIn && !isInvest(data) && !state.finance.catTypes[category]) state.finance.catTypes[category] = 'compras';
      if (isNew) state.finance.movements.push({ id: uid(), type: dirIn ? 'Transferencia' : 'Manual', ...data });
      else Object.assign(m, data);
      save(); rerender();
    }
  });
}

// Importa un CSV con el mismo formato (fecha;tipo;concepto;categoria;gasto_hormiga;entrada;salida;saldo) sin duplicar.
async function importCSV() {
  const text = await Platform.pickText('.csv,text/csv,text/plain');
  if (!text) return;
  const lines = text.replace(/^﻿/, '').split(/\r?\n/).filter(Boolean);
  const head = lines.shift().toLowerCase().split(';');
  const idx = n => head.indexOf(n);
  if (idx('fecha') < 0 || idx('concepto') < 0) { toast('El CSV debe tener columnas fecha;tipo;concepto;categoria;gasto_hormiga;entrada;salida'); return; }
  const num = v => parseFloat(String(v || '').replace(/\./g, '').replace(',', '.')) || 0;
  const key = m => [m.date, m.concept, m.in, m.out].join('|');
  const have = new Set(state.finance.movements.map(key));
  let added = 0;
  for (const l of lines) {
    const c = l.split(';');
    const m = { id: uid(), date: c[idx('fecha')], type: c[idx('tipo')] || '', concept: c[idx('concepto')], category: c[idx('categoria')] || 'Otros', ant: /^s[ií]/i.test(c[idx('gasto_hormiga')] || ''), in: num(c[idx('entrada')]), out: num(c[idx('salida')]) };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(m.date) || have.has(key(m))) continue;
    have.add(key(m));
    state.finance.movements.push(m);
    if (m.out && !isInvest(m) && !state.finance.catTypes[m.category]) state.finance.catTypes[m.category] = 'compras';
    added++;
  }
  save(); rerender();
  toast(added ? `Importé ${added} movimientos nuevos ✓` : 'No había movimientos nuevos');
}
