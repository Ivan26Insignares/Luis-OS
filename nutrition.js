// Comida: necesidades diarias según peso, altura, edad y objetivo; registro de lo que comes y plan para mañana.
// Valores nutricionales aproximados por 100 g (tablas BEDCA/USDA redondeadas).
// [nombre, grupo, porción, gramos por porción, kcal, proteína, carbohidratos, grasa, fibra, vit C mg, calcio mg, hierro mg, magnesio mg, potasio mg, vit D µg, B12 µg]
const FOODS = {
  pollo: ['Pechuga de pollo (cocinada)', 'Proteína', 'filete', 150, 165, 31, 0, 3.6, 0, 0, 15, 1, 29, 256, 0.1, 0.3],
  pavo: ['Pechuga de pavo (fiambre)', 'Proteína', 'loncha', 15, 104, 18, 2, 2, 0, 0, 10, 0.8, 20, 300, 0, 0.4],
  huevo: ['Huevo', 'Proteína', 'huevo', 60, 143, 12.6, 0.7, 9.5, 0, 0, 56, 1.8, 12, 138, 2, 0.9],
  claras: ['Claras de huevo', 'Proteína', 'clara', 33, 52, 11, 0.7, 0.2, 0, 0, 7, 0.1, 11, 163, 0, 0.1],
  atun: ['Atún al natural (escurrido)', 'Proteína', 'lata', 56, 116, 26, 0, 1, 0, 0, 11, 1.3, 27, 237, 1.7, 2.5],
  salmon: ['Salmón', 'Proteína', 'filete', 125, 208, 20, 0, 13, 0, 0, 9, 0.3, 27, 363, 11, 3.2],
  merluza: ['Merluza', 'Proteína', 'filete', 150, 90, 18, 0, 1.5, 0, 0, 30, 0.5, 30, 350, 1, 1],
  ternera: ['Ternera magra', 'Proteína', 'filete', 125, 170, 26, 0, 7, 0, 0, 12, 2.6, 22, 330, 0.1, 2.5],
  picada: ['Carne picada mixta', 'Proteína', 'ración', 125, 250, 17, 0, 20, 0, 0, 18, 2, 18, 270, 0.1, 2],
  jamon: ['Jamón serrano', 'Proteína', 'loncha', 15, 241, 31, 0, 13, 0, 0, 12, 2.3, 18, 400, 0.5, 0.8],
  skyr: ['Skyr / yogur proteico', 'Lácteos', 'tarrina', 150, 63, 11, 4, 0.2, 0, 0, 120, 0.1, 12, 150, 0, 0.5],
  yogur: ['Yogur natural', 'Lácteos', 'yogur', 125, 61, 3.5, 4.7, 3.3, 0, 0.5, 121, 0.1, 12, 155, 0.1, 0.4],
  leche: ['Leche semidesnatada', 'Lácteos', 'vaso', 250, 46, 3.3, 4.8, 1.6, 0, 1, 120, 0, 11, 150, 0.1, 0.4],
  quesofresco: ['Queso fresco batido 0 %', 'Lácteos', 'tarrina', 125, 46, 8, 3.5, 0.2, 0, 0, 100, 0.1, 10, 130, 0, 0.5],
  queso: ['Queso curado', 'Lácteos', 'loncha', 20, 400, 25, 0, 33, 0, 0, 800, 0.5, 40, 90, 0.3, 1.5],
  whey: ['Proteína whey', 'Proteína', 'cazo', 30, 380, 75, 8, 5, 0, 0, 400, 1, 100, 500, 0, 1],
  tofu: ['Tofu', 'Proteína', 'ración', 150, 144, 15, 2, 8.7, 2, 0, 350, 2.7, 58, 237, 0, 0],
  garbanzos: ['Garbanzos cocidos', 'Legumbres', 'plato', 200, 139, 7, 18, 2.6, 7.6, 1.3, 49, 2.9, 48, 291, 0, 0],
  lentejas: ['Lentejas cocidas', 'Legumbres', 'plato', 250, 116, 9, 16, 0.4, 8, 1.5, 19, 3.3, 36, 369, 0, 0],
  arroz: ['Arroz blanco (cocido)', 'Cereales', 'plato', 200, 130, 2.7, 28, 0.3, 0.4, 0, 10, 0.2, 12, 35, 0, 0],
  arrozint: ['Arroz integral (cocido)', 'Cereales', 'plato', 200, 123, 2.7, 25, 1, 1.6, 0, 10, 0.5, 44, 86, 0, 0],
  pasta: ['Pasta (cocida)', 'Cereales', 'plato', 200, 158, 5.8, 31, 0.9, 1.8, 0, 7, 0.5, 18, 44, 0, 0],
  quinoa: ['Quinoa (cocida)', 'Cereales', 'plato', 180, 120, 4.4, 21, 1.9, 2.8, 0, 17, 1.5, 64, 172, 0, 0],
  panint: ['Pan integral', 'Cereales', 'rebanada', 35, 247, 13, 41, 3.4, 7, 0, 107, 2.5, 75, 250, 0, 0],
  pan: ['Pan blanco (barra)', 'Cereales', '¼ de barra', 60, 265, 9, 49, 3.2, 2.7, 0, 50, 1.2, 25, 115, 0, 0],
  avena: ['Copos de avena', 'Cereales', 'puñado', 40, 389, 16.9, 56, 6.9, 10.6, 0, 54, 4.7, 177, 429, 0, 0],
  tortitas: ['Tortitas de arroz', 'Cereales', 'tortita', 8, 387, 8, 81, 2.8, 4, 0, 11, 1.5, 130, 290, 0, 0],
  patata: ['Patata cocida', 'Cereales', 'patata', 200, 87, 1.9, 20, 0.1, 1.8, 13, 5, 0.3, 22, 379, 0, 0],
  boniato: ['Boniato asado', 'Cereales', 'boniato', 200, 90, 2, 21, 0.2, 3.3, 20, 38, 0.7, 27, 475, 0, 0],
  platano: ['Plátano', 'Fruta', 'plátano', 120, 89, 1.1, 23, 0.3, 2.6, 8.7, 5, 0.3, 27, 358, 0, 0],
  manzana: ['Manzana', 'Fruta', 'manzana', 180, 52, 0.3, 14, 0.2, 2.4, 4.6, 6, 0.1, 5, 107, 0, 0],
  naranja: ['Naranja', 'Fruta', 'naranja', 180, 47, 0.9, 12, 0.1, 2.4, 53, 40, 0.1, 10, 181, 0, 0],
  kiwi: ['Kiwi', 'Fruta', 'kiwi', 75, 61, 1.1, 15, 0.5, 3, 93, 34, 0.3, 17, 312, 0, 0],
  fresas: ['Fresas', 'Fruta', 'taza', 150, 32, 0.7, 7.7, 0.3, 2, 59, 16, 0.4, 13, 153, 0, 0],
  arandanos: ['Arándanos', 'Fruta', 'puñado', 100, 57, 0.7, 14, 0.3, 2.4, 9.7, 6, 0.3, 6, 77, 0, 0],
  brocoli: ['Brócoli', 'Verdura', 'ración', 150, 34, 2.8, 7, 0.4, 2.6, 89, 47, 0.7, 21, 316, 0, 0],
  espinacas: ['Espinacas', 'Verdura', 'ración', 100, 23, 2.9, 3.6, 0.4, 2.2, 28, 99, 2.7, 79, 558, 0, 0],
  ensalada: ['Ensalada (lechuga y tomate)', 'Verdura', 'plato', 150, 18, 1, 3.5, 0.2, 1.4, 15, 15, 0.4, 11, 240, 0, 0],
  pimiento: ['Pimiento rojo', 'Verdura', 'pimiento', 150, 31, 1, 6, 0.3, 2.1, 128, 7, 0.4, 12, 211, 0, 0],
  zanahoria: ['Zanahoria', 'Verdura', 'zanahoria', 80, 41, 0.9, 10, 0.2, 2.8, 6, 33, 0.3, 12, 320, 0, 0],
  tomate: ['Tomate', 'Verdura', 'tomate', 150, 18, 0.9, 3.9, 0.2, 1.2, 14, 10, 0.3, 11, 237, 0, 0],
  aceite: ['Aceite de oliva', 'Grasas', 'cucharada', 10, 884, 0, 0, 100, 0, 0, 1, 0.6, 0, 1, 0, 0],
  aguacate: ['Aguacate', 'Grasas', 'medio', 70, 160, 2, 8.5, 14.7, 6.7, 10, 12, 0.6, 29, 485, 0, 0],
  nueces: ['Nueces', 'Grasas', 'puñado', 30, 654, 15, 14, 65, 6.7, 1.3, 98, 2.9, 158, 441, 0, 0],
  almendras: ['Almendras', 'Grasas', 'puñado', 30, 579, 21, 22, 50, 12.5, 0, 269, 3.7, 270, 733, 0, 0],
  cacahuete: ['Crema de cacahuete', 'Grasas', 'cucharada', 15, 588, 25, 20, 50, 6, 0, 43, 1.9, 154, 649, 0, 0],
  chocolate: ['Chocolate negro 85 %', 'Otros', 'onza', 10, 600, 10, 30, 46, 11, 0, 70, 12, 230, 715, 0, 0],
  cafeleche: ['Café con leche', 'Bebidas', 'taza', 200, 40, 2, 3.5, 1.6, 0, 0, 80, 0, 10, 140, 0, 0.2],
  cerveza: ['Cerveza', 'Bebidas', 'caña', 200, 43, 0.5, 3.6, 0, 0, 0, 4, 0, 6, 27, 0, 0],
  refresco: ['Refresco azucarado', 'Bebidas', 'lata', 330, 42, 0, 10.6, 0, 0, 0, 2, 0, 0, 2, 0, 0],
  pizza: ['Pizza', 'Comida rápida', 'porción', 120, 266, 11, 33, 10, 2.3, 1, 188, 2.5, 24, 172, 0, 0.4],
  hamburguesa: ['Hamburguesa completa', 'Comida rápida', 'hamburguesa', 220, 254, 13, 30, 9, 1.5, 1, 60, 2.2, 22, 220, 0, 1],
  fritas: ['Patatas fritas', 'Comida rápida', 'ración', 120, 312, 3.4, 41, 15, 3.8, 5, 18, 0.8, 35, 579, 0, 0],
  kebab: ['Kebab / durum', 'Comida rápida', 'unidad', 350, 215, 12, 20, 10, 1.5, 3, 40, 1.5, 20, 200, 0, 0.8],
  galletas: ['Galletas', 'Otros', 'galleta', 8, 480, 6, 68, 20, 2, 0, 30, 2, 20, 120, 0, 0],
  croissant: ['Croissant / bollería', 'Otros', 'unidad', 60, 406, 8, 46, 21, 2.6, 0, 37, 2, 16, 118, 0, 0.2]
};
const NUTRIENTS = [
  ['kcal', 'Energía', 'kcal'], ['p', 'Proteína', 'g'], ['c', 'Carbohidratos', 'g'], ['f', 'Grasas', 'g'], ['fib', 'Fibra', 'g'],
  ['vc', 'Vitamina C', 'mg'], ['ca', 'Calcio', 'mg'], ['fe', 'Hierro', 'mg'], ['mg', 'Magnesio', 'mg'], ['k', 'Potasio', 'mg'], ['vd', 'Vitamina D', 'µg'], ['b12', 'Vitamina B12', 'µg']
];
const MEALS = [['desayuno', '🌅 Desayuno'], ['comida', '🍽️ Comida'], ['merienda', '🍎 Merienda'], ['cena', '🌙 Cena'], ['snack', '🍫 Snacks / extra']];
const BODY_GOALS = {
  definir: { name: 'Definir (perder grasa marcando músculo)', kcal: -0.18, protein: 2.2 },
  recomp: { name: 'Recomposición (más músculo, misma grasa)', kcal: -0.05, protein: 2.0 },
  musculo: { name: 'Ganar músculo (volumen limpio)', kcal: 0.10, protein: 1.8 },
  mantener: { name: 'Mantener', kcal: 0, protein: 1.6 }
};

function defaultHealth() {
  return { profile: { sex: '', age: null, height: null, weight: null, goal: 'recomp', activity: 1.65 }, log: {}, custom: [], tab: 'gym', foodDay: '' };
}

function foodNutrients(key, g) {
  const f = FOODS[key];
  const k = g / 100;
  const n = {};
  ['kcal', 'p', 'c', 'f', 'fib', 'vc', 'ca', 'fe', 'mg', 'k', 'vd', 'b12'].forEach((name, i) => { n[name] = +(f[4 + i] * k).toFixed(2); });
  return n;
}

function currentWeight() {
  const w = [...state.gym.weights].sort((a, b) => a.date.localeCompare(b.date));
  return w.length ? w[w.length - 1].kg : state.health.profile.weight;
}

function isTrainingDay(dateKey) {
  const d = new Date(dateKey + 'T12:00');
  return !!state.gym.plan[(d.getDay() + 6) % 7];
}

// Objetivos diarios: Mifflin-St Jeor × actividad, ajustado al objetivo físico. Los días sin gym bajan los carbohidratos.
function nutritionTargets(dateKey) {
  const p = state.health.profile;
  const w = currentWeight();
  if (!w || !p.height || !p.age || !p.sex) return null;
  const bmr = 10 * w + 6.25 * p.height - 5 * p.age + (p.sex === 'mujer' ? -161 : 5);
  const train = isTrainingDay(dateKey);
  const goal = BODY_GOALS[p.goal] || BODY_GOALS.recomp;
  const activity = train ? p.activity : Math.max(1.3, p.activity - 0.25);
  const kcal = Math.round(bmr * activity * (1 + goal.kcal) / 10) * 10;
  const prot = Math.round(w * goal.protein);
  const fat = Math.round(Math.max(w * 0.9, kcal * 0.25 / 9));
  const carbs = Math.max(80, Math.round((kcal - prot * 4 - fat * 9) / 4));
  const male = p.sex !== 'mujer';
  return {
    train, bmr: Math.round(bmr),
    kcal: prot * 4 + fat * 9 + carbs * 4, p: prot, c: carbs, f: fat, fib: Math.round(kcal / 1000 * 14),
    vc: male ? 90 : 75, ca: 1000, fe: male ? 8 : 18, mg: male ? 400 : 310, k: 3500, vd: 15, b12: 2.4,
    water: Math.round((w * 35 + (train ? 500 : 0)) / 250) * 250
  };
}

function dayLog(k) {
  const L = state.health.log;
  if (!L[k]) L[k] = { water: 0, items: [] };
  return L[k];
}

function dayTotals(k) {
  const t = {};
  NUTRIENTS.forEach(([n]) => t[n] = 0);
  for (const it of (state.health.log[k] || { items: [] }).items) for (const n in t) t[n] += it.n[n] || 0;
  return t;
}

function shiftDay(k, d) { const x = new Date(k + 'T12:00'); x.setDate(x.getDate() + d); return dayKey(x); }

// ---------- Vista Salud personal ----------
VIEWS.health = {
  render(main) {
    const h = state.health;
    main.innerHTML = `<div class="page">
      <div class="view-head"><div><h1>❤️ Salud personal</h1><p class="muted">Gimnasio y alimentación en un solo sitio.</p></div>
        <div class="seg big"><button data-ht="gym" class="${h.tab === 'gym' ? 'on' : ''}">🏋️ Gimnasio</button><button data-ht="food" class="${h.tab === 'food' ? 'on' : ''}">🍽️ Comida</button></div></div>
      <div id="healthBody"></div></div>`;
    $$('[data-ht]', main).forEach(b => b.onclick = () => { h.tab = b.dataset.ht; save(); rerender(); });
    if (h.tab === 'food') renderFood($('#healthBody')); else renderGym($('#healthBody'));
  }
};

function renderFood(el) {
  const h = state.health;
  const today = dayKey(new Date());
  if (!h.foodDay) h.foodDay = today;
  const k = h.foodDay;
  const T = nutritionTargets(k);
  if (!T) {
    el.innerHTML = `<section class="fin-card setup-card"><h3>👋 Primero, tus datos</h3>
      <p class="muted">Con tu peso, altura, edad y el físico que quieres calculo cuántas calorías, proteína, carbohidratos, grasas, fibra y vitaminas necesitas cada día.</p>
      <button class="btn primary" id="hSetup">Completar mis datos</button></section>`;
    $('#hSetup').onclick = editHealthProfile;
    return;
  }
  const tot = dayTotals(k);
  const log = dayLog(k);
  const d = new Date(k + 'T12:00');
  const label = k === today ? 'Hoy' : k === shiftDay(today, 1) ? 'Mañana' : k === shiftDay(today, -1) ? 'Ayer' : `${WEEKDAYS[d.getDay()]} ${fmtDate(d)}`;
  const pct = (n) => T[n] ? Math.round(tot[n] / T[n] * 100) : 0;
  const macro = (n, name, color) => `<div class="macro"><div class="goal-top"><span>${name}</span><span class="goal-v"><b>${Math.round(tot[n])}</b> / ${T[n]} g</span></div>
    <div class="goal-bar"><i style="width:${Math.min(100, pct(n))}%;background:${color}"></i></div><div class="goal-s ${pct(n) > 115 ? 'over' : ''}">${T[n] - tot[n] > 0 ? `faltan ${Math.round(T[n] - tot[n])} g` : pct(n) > 115 ? `te pasaste ${Math.round(tot[n] - T[n])} g` : 'objetivo cumplido ✓'}</div></div>`;
  const kcalPct = Math.min(1, tot.kcal / T.kcal);
  const R = 52, C = 2 * Math.PI * R;
  el.innerHTML = `
    <div class="food-top">
      <div class="day-nav"><button class="btn ghost sm" id="fdPrev">‹</button><b class="day-label">${label}</b><button class="btn ghost sm" id="fdNext">›</button>${k !== today ? '<button class="btn ghost sm" id="fdToday">Hoy</button>' : ''}</div>
      <span class="pill ${T.train ? 'train' : ''}">${T.train ? `🏋️ Día de gym: ${esc((state.gym.routines.find(r => r.id === state.gym.plan[(d.getDay() + 6) % 7]) || {}).name || '')}` : '😌 Día de descanso (menos carbohidratos)'}</span>
      <button class="btn ghost sm" id="hProfile">⚙️ Mis datos</button>
    </div>
    <div class="fin-grid">
      <section class="fin-card"><h3>🔥 Energía y macros</h3>
        <div class="kcal-wrap"><svg viewBox="0 0 120 120" class="ring"><circle cx="60" cy="60" r="${R}" class="ring-bg"/><circle cx="60" cy="60" r="${R}" class="ring-fg" style="stroke-dasharray:${C};stroke-dashoffset:${C * (1 - kcalPct)}"/></svg>
          <div class="kcal-txt"><b>${Math.round(tot.kcal)}</b><span>de ${T.kcal} kcal</span></div></div>
        ${macro('p', 'Proteína', '#f472b6')}${macro('c', 'Carbohidratos', '#22d3ee')}${macro('f', 'Grasas', '#f5a524')}${macro('fib', 'Fibra', '#34d399')}
        <div class="water"><span>💧 Agua <b>${log.water / 1000} / ${T.water / 1000} L</b></span><div class="glasses">${Array.from({ length: Math.ceil(T.water / 250) }, (_, i) => `<button class="glass ${i < log.water / 250 ? 'on' : ''}" data-glass="${i}" title="${(i + 1) * 250} ml"></button>`).join('')}</div></div>
      </section>
      <section class="fin-card"><h3>🧪 Vitaminas y minerales</h3>
        <div class="micros">${NUTRIENTS.slice(5).map(([n, name, u]) => `<div class="micro"><div class="goal-top"><span>${name}</span><span class="goal-v"><b>${tot[n] < 10 ? tot[n].toFixed(1) : Math.round(tot[n])}</b> / ${T[n]} ${u}</span></div><div class="goal-bar"><i style="width:${Math.min(100, pct(n))}%;background:${pct(n) >= 100 ? '#34d399' : pct(n) >= 60 ? '#f5a524' : '#fb7185'}"></i></div></div>`).join('')}</div>
        <p class="muted small">Valores aproximados de los alimentos de la lista. La vitamina D sale sobre todo del sol y del pescado azul.</p>
        <div class="targets-info small muted">Metabolismo basal ≈ ${T.bmr} kcal · Objetivo: ${esc(BODY_GOALS[h.profile.goal].name)} · Peso ${currentWeight()} kg</div>
      </section>
      <section class="fin-card span2"><div class="goals-head"><h3>📝 Lo que comí</h3><button class="btn primary sm" id="fAddFood">＋ Añadir comida</button></div>
        <div class="meals">${MEALS.map(([m, name]) => {
          const items = log.items.filter(i => i.meal === m);
          const kc = items.reduce((a, i) => a + i.n.kcal, 0);
          return `<div class="meal"><div class="meal-h"><b>${name}</b><span class="muted small">${Math.round(kc)} kcal</span><button class="mini-btn" data-addmeal="${m}">＋</button></div>
            ${items.map(i => `<div class="food-item"><span>${esc(i.name)} <small class="muted">${i.g} g</small></span><span class="small muted">P ${Math.round(i.n.p)} · C ${Math.round(i.n.c)} · G ${Math.round(i.n.f)}</span><span class="small">${Math.round(i.n.kcal)} kcal</span><button class="mini-btn" data-delfood="${i.id}">✕</button></div>`).join('') || '<div class="muted small food-empty">—</div>'}</div>`;
        }).join('')}</div></section>
      <section class="fin-card span2" id="planCard"></section>
    </div>`;
  $('#fdPrev').onclick = () => { h.foodDay = shiftDay(k, -1); rerender(); };
  $('#fdNext').onclick = () => { h.foodDay = shiftDay(k, 1); rerender(); };
  const td = $('#fdToday'); if (td) td.onclick = () => { h.foodDay = today; rerender(); };
  $('#hProfile').onclick = editHealthProfile;
  $('#fAddFood').onclick = () => addFood(k, defaultMeal());
  $$('[data-addmeal]', el).forEach(b => b.onclick = () => addFood(k, b.dataset.addmeal));
  $$('[data-delfood]', el).forEach(b => b.onclick = () => { log.items = log.items.filter(i => i.id !== b.dataset.delfood); save(); rerender(); });
  $$('[data-glass]', el).forEach(b => b.onclick = () => { const v = (+b.dataset.glass + 1) * 250; log.water = log.water === v ? v - 250 : v; save(); rerender(); });
  renderPlan($('#planCard'), k);
}

function defaultMeal() {
  const hr = new Date().getHours();
  return hr < 11 ? 'desayuno' : hr < 16 ? 'comida' : hr < 19 ? 'merienda' : hr < 23 ? 'cena' : 'snack';
}

function editHealthProfile() {
  const p = state.health.profile;
  modal({
    title: 'Mis datos de salud',
    body: `<div class="row3"><label>Peso (kg)<input type="number" step="0.1" id="hpW" value="${currentWeight() || ''}" placeholder="70"></label>
      <label>Altura (cm)<input type="number" id="hpH" value="${p.height || ''}" placeholder="175"></label>
      <label>Edad<input type="number" id="hpA" value="${p.age || ''}" placeholder="20"></label></div>
      <label>Sexo (cambia la fórmula del metabolismo)<select id="hpS"><option value="">Elige…</option><option value="hombre" ${p.sex === 'hombre' ? 'selected' : ''}>Hombre</option><option value="mujer" ${p.sex === 'mujer' ? 'selected' : ''}>Mujer</option></select></label>
      <label>Físico que quieres<select id="hpG">${Object.entries(BODY_GOALS).map(([k, g]) => `<option value="${k}" ${p.goal === k ? 'selected' : ''}>${g.name}</option>`).join('')}</select></label>
      <label>Actividad en días de gym<select id="hpAct">${[[1.55, 'Moderada (máquinas, ritmo tranquilo)'], [1.65, 'Alta (6 días, máquinas + calistenia)'], [1.75, 'Muy alta (gym + mucho caminar o deporte)']].map(([v, n]) => `<option value="${v}" ${p.activity === v ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
      <p class="muted small">Es una estimación orientativa (fórmula de Mifflin-St Jeor), no sustituye a un nutricionista. Ajusta si en 2–3 semanas tu peso no va en la dirección que quieres.</p>`,
    onOk(w) {
      const kg = parseFloat($('#hpW', w).value), hgt = parseFloat($('#hpH', w).value), age = parseInt($('#hpA', w).value, 10), sex = $('#hpS', w).value;
      if (!kg || !hgt || !age || !sex) { toast('Completa peso, altura, edad y sexo'); return false; }
      p.weight = kg; p.height = hgt; p.age = age; p.sex = sex; p.goal = $('#hpG', w).value; p.activity = +$('#hpAct', w).value;
      if (kg !== currentWeight()) state.gym.weights = state.gym.weights.filter(x => x.date !== dayKey(new Date())).concat({ date: dayKey(new Date()), kg });
      save(); rerender();
    }
  });
}

function addFood(k, meal) {
  const recent = [...new Set(Object.values(state.health.log).flatMap(d => d.items.map(i => i.key)).filter(Boolean).reverse())].slice(0, 8);
  const all = [...Object.entries(FOODS).map(([key, f]) => ({ key, name: f[0], group: f[1], unit: f[2], ug: f[3] })), ...state.health.custom.map(c => ({ key: 'c:' + c.id, name: c.name, group: 'Mis comidas', unit: 'ración', ug: c.g }))];
  modal({
    title: 'Añadir comida', wide: true,
    body: `<div class="row2"><label>Comida del día<select id="afMeal">${MEALS.map(([m, n]) => `<option value="${m}" ${m === meal ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
      <label>Buscar<input id="afQ" placeholder="pollo, arroz, plátano…"></label></div>
      ${recent.length ? `<div class="chips small">${recent.map(r => { const f = all.find(x => x.key === r); return f ? `<button type="button" class="chip" data-pick="${r}">${esc(f.name)}</button>` : ''; }).join('')}</div>` : ''}
      <div class="food-results" id="afList"></div>
      <div id="afSel" class="af-sel muted small">Elige un alimento de la lista.</div>
      <details class="custom-food"><summary>➕ Crear un alimento o plato propio</summary>
        <div class="row3"><label>Nombre<input id="cfN" placeholder="Ej. Bocadillo de la cafetería"></label><label>Ración (g)<input type="number" id="cfG" value="100"></label><label>kcal por ración<input type="number" id="cfK"></label></div>
        <div class="row3"><label>Proteína (g)<input type="number" id="cfP"></label><label>Carbohidratos (g)<input type="number" id="cfC"></label><label>Grasas (g)<input type="number" id="cfF"></label></div>
        <button type="button" class="btn sm" id="cfSave">Guardar y elegir</button></details>`,
    ok: 'Añadir',
    onOpen(w) {
      let picked = null;
      const draw = () => {
        const q = $('#afQ', w).value.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
        const list = all.filter(f => !q || f.name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').includes(q) || f.group.toLowerCase().includes(q)).slice(0, 40);
        $('#afList', w).innerHTML = list.map(f => `<button type="button" class="food-opt ${picked && picked.key === f.key ? 'on' : ''}" data-pick="${f.key}"><span>${esc(f.name)}</span><small>${esc(f.group)}</small></button>`).join('') || '<p class="muted small">Nada. Créalo abajo.</p>';
        $$('#afList [data-pick]', w).forEach(b => b.onclick = () => pick(b.dataset.pick));
      };
      const pick = key => {
        picked = all.find(f => f.key === key);
        draw();
        $('#afSel', w).innerHTML = `<b class="white">${esc(picked.name)}</b><div class="row wrap" style="margin-top:8px">
          <label class="inline">Cantidad (g)<input type="number" id="afG" value="${picked.ug}" style="width:100px"></label>
          ${[0.5, 1, 2].map(m => `<button type="button" class="chip" data-units="${m}">${m === 0.5 ? '½' : m} ${esc(picked.unit)}${m === 2 ? 's' : ''} (${Math.round(picked.ug * m)} g)</button>`).join('')}</div>`;
        $$('[data-units]', w).forEach(b => b.onclick = () => { $('#afG', w).value = Math.round(picked.ug * +b.dataset.units); });
        w.picked = picked;
      };
      $('#afQ', w).oninput = draw;
      $$('.chips [data-pick]', w).forEach(b => b.onclick = () => pick(b.dataset.pick));
      $('#cfSave', w).onclick = () => {
        const name = $('#cfN', w).value.trim(); const g = +$('#cfG', w).value || 100;
        if (!name) { toast('Ponle nombre'); return; }
        const c = { id: uid(), name, g, kcal: +$('#cfK', w).value || 0, p: +$('#cfP', w).value || 0, c: +$('#cfC', w).value || 0, f: +$('#cfF', w).value || 0 };
        state.health.custom.push(c); save();
        all.push({ key: 'c:' + c.id, name, group: 'Mis comidas', unit: 'ración', ug: g });
        $('.custom-food', w).open = false;
        pick('c:' + c.id);
      };
      draw();
    },
    onOk(w) {
      const f = w.picked;
      if (!f) { toast('Elige un alimento'); return false; }
      const g = Math.max(1, Math.round(+$('#afG', w).value || f.ug));
      let n;
      if (f.key.startsWith('c:')) {
        const c = state.health.custom.find(x => 'c:' + x.id === f.key);
        const r = g / c.g;
        n = { kcal: c.kcal * r, p: c.p * r, c: c.c * r, f: c.f * r, fib: 0, vc: 0, ca: 0, fe: 0, mg: 0, k: 0, vd: 0, b12: 0 };
      } else n = foodNutrients(f.key, g);
      dayLog(k).items.push({ id: uid(), meal: $('#afMeal', w).value, key: f.key, name: f.name, g, n });
      save(); rerender();
    }
  });
}

// ---------- Plan recomendado para el día siguiente ----------
// Cada plantilla: [alimento, gramos base, papel] (P = proteína, C = carbohidrato, F = grasa, V = fruta/verdura fija).
const MEAL_TEMPLATES = {
  desayuno: [
    [['avena', 60, 'C'], ['leche', 250, 'P'], ['platano', 120, 'V'], ['cacahuete', 15, 'F']],
    [['panint', 70, 'C'], ['huevo', 120, 'P'], ['aguacate', 50, 'F'], ['naranja', 180, 'V']],
    [['skyr', 150, 'P'], ['avena', 40, 'C'], ['arandanos', 100, 'V'], ['nueces', 20, 'F']]
  ],
  comida: [
    [['arroz', 200, 'C'], ['pollo', 150, 'P'], ['brocoli', 150, 'V'], ['aceite', 10, 'F']],
    [['lentejas', 250, 'C'], ['huevo', 60, 'P'], ['ensalada', 150, 'V'], ['aceite', 10, 'F']],
    [['pasta', 200, 'C'], ['atun', 112, 'P'], ['tomate', 150, 'V'], ['aceite', 10, 'F']],
    [['patata', 250, 'C'], ['salmon', 125, 'P'], ['espinacas', 100, 'V'], ['aceite', 5, 'F']],
    [['arrozint', 200, 'C'], ['ternera', 125, 'P'], ['pimiento', 150, 'V'], ['aceite', 10, 'F']]
  ],
  merienda: [
    [['skyr', 150, 'P'], ['kiwi', 150, 'V'], ['almendras', 20, 'F']],
    [['tortitas', 32, 'C'], ['pavo', 60, 'P'], ['manzana', 180, 'V']],
    [['whey', 30, 'P'], ['leche', 250, 'C'], ['platano', 120, 'V']]
  ],
  cena: [
    [['merluza', 150, 'P'], ['boniato', 200, 'C'], ['ensalada', 150, 'V'], ['aceite', 10, 'F']],
    [['huevo', 120, 'P'], ['claras', 100, 'P'], ['panint', 60, 'C'], ['pimiento', 100, 'V'], ['aceite', 5, 'F']],
    [['pollo', 150, 'P'], ['quinoa', 150, 'C'], ['zanahoria', 80, 'V'], ['aguacate', 50, 'F']],
    [['tofu', 150, 'P'], ['arrozint', 150, 'C'], ['espinacas', 100, 'V'], ['aceite', 10, 'F']]
  ]
};
const BOOSTERS = {
  p: ['skyr', 150, 'proteína'], fib: ['avena', 40, 'fibra'], vc: ['kiwi', 150, 'vitamina C'], ca: ['yogur', 125, 'calcio'], fe: ['lentejas', 200, 'hierro'],
  mg: ['almendras', 30, 'magnesio'], k: ['platano', 120, 'potasio'], vd: ['salmon', 125, 'vitamina D'], b12: ['atun', 56, 'vitamina B12']
};

function buildPlan(forDay, prevDay) {
  const T = nutritionTargets(forDay);
  const seed = Math.floor(new Date(forDay + 'T12:00').getTime() / 864e5);
  const meals = Object.entries(MEAL_TEMPLATES).map(([m, opts], i) => ({ meal: m, items: opts[(seed + i * 2) % opts.length].map(([key, g, role]) => ({ key, g, role })) }));
  // Refuerzos: lo que ayer quedó corto (si registraste algo) entra en el plan de mañana.
  const prev = dayTotals(prevDay), prevT = nutritionTargets(prevDay);
  const boosts = [];
  if (prevT && (state.health.log[prevDay] || { items: [] }).items.length) {
    for (const [n, [key, g, why]] of Object.entries(BOOSTERS)) {
      if (prev[n] < prevT[n] * 0.7 && !meals.some(m => m.items.some(i => i.key === key)) && boosts.length < 2) {
        boosts.push(why);
        meals.find(m => m.meal === 'merienda').items.push({ key, g, role: 'V', boost: why });
      }
    }
  }
  const items = meals.flatMap(m => m.items);
  const sum = (n, filter) => items.filter(filter || (() => true)).reduce((a, i) => a + FOODS[i.key][4 + ['kcal', 'p', 'c', 'f'].indexOf(n)] * i.g / 100, 0);
  // Ajusta las cantidades de las fuentes principales para acercarse a proteína, carbohidratos y grasas.
  for (let it = 0; it < 4; it++) {
    for (const [role, n] of [['P', 'p'], ['C', 'c'], ['F', 'f']]) {
      const own = sum(n, i => i.role === role), rest = sum(n, i => i.role !== role);
      if (own <= 0) continue;
      const s = Math.max(0.5, Math.min(2.2, (T[n] - rest) / own));
      items.filter(i => i.role === role).forEach(i => { i.g = i.g * s; });
    }
  }
  items.forEach(i => { i.g = Math.max(5, Math.round(i.g / 5) * 5); i.n = foodNutrients(i.key, i.g); });
  const tot = {};
  ['kcal', 'p', 'c', 'f', 'fib'].forEach(n => tot[n] = items.reduce((a, i) => a + i.n[n], 0));
  return { T, meals, tot, boosts };
}

function renderPlan(el, k) {
  const tomorrow = shiftDay(dayKey(new Date()), 1);
  const forDay = k >= tomorrow ? k : tomorrow;
  const prevDay = shiftDay(forDay, -1);
  const plan = buildPlan(forDay, prevDay);
  const d = new Date(forDay + 'T12:00');
  const units = i => { const f = FOODS[i.key]; const u = i.g / f[3]; return Math.abs(u - Math.round(u * 2) / 2) < 0.15 && u <= 6 ? ` (≈ ${(Math.round(u * 2) / 2).toLocaleString('es-ES')} ${f[2]}${u > 1.25 ? 's' : ''})` : ''; };
  el.innerHTML = `<div class="goals-head"><h3>🥗 Te recomiendo para ${forDay === tomorrow ? 'mañana' : 'el'} ${WEEKDAYS[d.getDay()]} ${d.getDate()}</h3>
      <span class="pill ${plan.T.train ? 'train' : ''}">${plan.T.train ? '🏋️ día de gym' : '😌 descanso'}</span>
      <button class="btn ghost sm" id="planUse">📋 Copiar al registro de ese día</button></div>
    ${plan.boosts.length ? `<p class="small">${prevDay === dayKey(new Date()) ? 'Hoy vas corto' : 'El día anterior te quedaste corto'} de <b>${plan.boosts.join(' y ')}</b>, así que lo reforcé en la merienda.</p>` : ''}
    <div class="plan">${plan.meals.map(m => `<div class="plan-meal"><b>${MEALS.find(x => x[0] === m.meal)[1]}</b>
      <ul>${m.items.map(i => `<li><span>${esc(FOODS[i.key][0])}${i.boost ? `<small class="boost">↑ ${i.boost}</small>` : ''}</span><span class="muted">${i.g} g${units(i)}</span></li>`).join('')}</ul>
      <small class="muted">${Math.round(m.items.reduce((a, i) => a + i.n.kcal, 0))} kcal · P ${Math.round(m.items.reduce((a, i) => a + i.n.p, 0))} g</small></div>`).join('')}</div>
    <p class="small muted">Total ≈ <b class="white">${Math.round(plan.tot.kcal)} kcal</b> · proteína ${Math.round(plan.tot.p)} g · carbohidratos ${Math.round(plan.tot.c)} g · grasas ${Math.round(plan.tot.f)} g · fibra ${Math.round(plan.tot.fib)} g
      (objetivo ${plan.T.kcal} kcal · ${plan.T.p} / ${plan.T.c} / ${plan.T.f} g). Cambia cada día; si algo no te gusta, sustitúyelo por otro del mismo grupo.</p>`;
  $('#planUse', el).onclick = () => {
    const log = dayLog(forDay);
    for (const m of plan.meals) for (const i of m.items) log.items.push({ id: uid(), meal: m.meal, key: i.key, name: FOODS[i.key][0], g: i.g, n: i.n });
    save();
    state.health.foodDay = forDay;
    toast('Plan copiado. Quita o cambia lo que no comas.');
    rerender();
  };
}
