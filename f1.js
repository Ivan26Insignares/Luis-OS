// Fórmula 1: calendario, horarios de cada sesión, resultados y Mundial de pilotos y constructores.
// Datos de la API pública Jolpica-F1 (sucesora de Ergast, sin cuenta ni clave).
const F1API = 'https://api.jolpi.ca/ergast/f1';

const F1_NAMES = {
  'Australian': 'Australia', 'Chinese': 'China', 'Japanese': 'Japón', 'Bahrain': 'Baréin', 'Saudi Arabian': 'Arabia Saudí', 'Miami': 'Miami',
  'Emilia Romagna': 'Emilia-Romaña', 'Monaco': 'Mónaco', 'Spanish': 'España', 'Barcelona-Catalunya': 'Barcelona', 'Canadian': 'Canadá',
  'Austrian': 'Austria', 'British': 'Gran Bretaña', 'Belgian': 'Bélgica', 'Hungarian': 'Hungría', 'Dutch': 'Países Bajos', 'Italian': 'Italia',
  'Madrid': 'Madrid', 'Azerbaijan': 'Azerbaiyán', 'Singapore': 'Singapur', 'United States': 'Estados Unidos', 'Mexico City': 'Ciudad de México',
  'São Paulo': 'São Paulo', 'Las Vegas': 'Las Vegas', 'Qatar': 'Catar', 'Abu Dhabi': 'Abu Dabi'
};
const F1_SESSIONS = [['FirstPractice', 'Libres 1'], ['SecondPractice', 'Libres 2'], ['ThirdPractice', 'Libres 3'], ['SprintQualifying', 'Clasificación sprint'], ['SprintShootout', 'Clasificación sprint'], ['Sprint', 'Sprint'], ['Qualifying', 'Clasificación']];

const f1Name = n => { const b = String(n || '').replace(/\s*Grand Prix\s*/i, '').trim(); return 'GP de ' + (F1_NAMES[b] || b); };
const f1Date = o => o && o.date ? `${o.date}T${o.time || '12:00:00Z'}` : '';
const f1Driver = d => d ? `${d.givenName || ''} ${d.familyName || ''}`.trim() : '';

function parseRace(r, winners) {
  const date = f1Date(r);
  const t = new Date(date).getTime();
  const key = `${r.season}-${r.round}`;
  const win = winners[key];
  const now = Date.now();
  const state = win || now > t + 3 * 36e5 ? 'post' : now >= t ? 'in' : 'pre';
  const loc = (r.Circuit || {}).Location || {};
  const sessions = F1_SESSIONS.filter(([k]) => r[k]).map(([k, n]) => ({ name: n, date: f1Date(r[k]) }));
  sessions.push({ name: 'Carrera', date });
  return {
    id: 'f1-' + key, league: 'f1', season: r.season, round: r.round, comp: `F1 · Ronda ${r.round}`,
    date, state, done: state === 'post', status: '', detail: state === 'in' ? 'Carrera en curso' : '', sprint: !!r.Sprint,
    home: { id: '', name: f1Name(r.raceName), short: f1Name(r.raceName), abbr: '', logo: '', score: '', winner: false },
    away: { id: '', name: win ? win.driver : '', short: win ? win.driver : '', abbr: '', logo: '', score: '', winner: false },
    winner: win || null,
    venue: [(r.Circuit || {}).circuitName, [...new Set([loc.locality, loc.country].filter(Boolean))].join(', ')].filter(Boolean).join(' · '),
    sessions
  };
}

async function loadF1(team, force = false) {
  const S = Sports.get(team.key);
  if (!force && S.at && Date.now() - S.at < 5 * 6e4) return S;
  if (Sports.loading[team.key]) return Sports.loading[team.key];
  const job = (async () => {
    try {
      const [sched, wins, ds] = await Promise.allSettled([
        getJ(`${F1API}/current.json?limit=100`),
        getJ(`${F1API}/current/results/1.json?limit=100`),
        getJ(`${F1API}/current/driverStandings.json`)
      ]);
      if (sched.status === 'rejected') throw sched.reason;
      const winners = {};
      if (wins.status === 'fulfilled') {
        for (const r of ((wins.value.MRData || {}).RaceTable || {}).Races || []) {
          const x = (r.Results || [])[0];
          if (x) winners[`${r.season}-${r.round}`] = { driver: f1Driver(x.Driver), team: (x.Constructor || {}).name || '', time: (x.Time || {}).time || '' };
        }
      }
      const races = ((sched.value.MRData || {}).RaceTable || {}).Races || [];
      S.games = races.map(r => parseRace(r, winners)).sort((a, b) => a.date.localeCompare(b.date));
      S.id = 'f1'; S.league = 'f1';
      const info = { name: 'Fórmula 1', logo: '', color: '', record: '', standing: '', stats: {} };
      if (ds.status === 'fulfilled') {
        const list = (((ds.value.MRData || {}).StandingsTable || {}).StandingsLists || [])[0];
        const lead = list && (list.DriverStandings || [])[0];
        if (lead) info.standing = `Líder: ${f1Driver(lead.Driver)} (${lead.points} pts)`;
        if (list) info.record = `Temporada ${list.season} · ${list.round} carreras`;
      }
      S.info = info;
      S.at = Date.now(); S.err = null;
      snapshotTeam(team);
    } catch (e) {
      console.error('f1', e);
      S.err = /HTTP 0|Failed to fetch|host|Unable|timeout/i.test(e.message) ? 'Sin conexión con la API de F1' : e.message;
    } finally { delete Sports.loading[team.key]; }
    return S;
  })();
  Sports.loading[team.key] = job;
  return job;
}

async function loadF1Standings(team) {
  const S = Sports.get(team.key);
  if (S.table && Date.now() - S.tableAt < 30 * 6e4) return S.table;
  const [d, c] = await Promise.all([getJ(`${F1API}/current/driverStandings.json`), getJ(`${F1API}/current/constructorStandings.json`)]);
  const dl = ((((d.MRData || {}).StandingsTable || {}).StandingsLists || [])[0] || {}).DriverStandings || [];
  const cl = ((((c.MRData || {}).StandingsTable || {}).StandingsLists || [])[0] || {}).ConstructorStandings || [];
  S.table = {
    drivers: dl.map(x => ({ pos: x.position || x.positionText, name: f1Driver(x.Driver), team: ((x.Constructors || [])[0] || {}).name || '', pts: x.points, wins: x.wins })),
    teams: cl.map(x => ({ pos: x.position || x.positionText, name: (x.Constructor || {}).name || '', pts: x.points, wins: x.wins }))
  };
  S.tableAt = Date.now();
  return S.table;
}

function raceRowHTML(g, team) {
  const onCal = state.events.some(ev => ev.gameId === g.id);
  const right = g.state === 'post' && g.winner ? `<span class="gm-t rc-win">🏆 ${esc(g.winner.driver)}</span>` : `<span class="gm-t rc-place muted">${esc((g.venue || '').split(' · ').pop())}</span>`;
  return `<div class="gm-row race ${g.state}" data-game="${g.id}" data-team="${team.key}" role="button" tabindex="0">
    <span class="gm-when">${gameWhen(g)}</span>
    <span class="gm-teams"><span class="gm-t rc-name">🏁 ${esc(g.home.short)}${g.sprint ? ' <small class="tag">Sprint</small>' : ''}</span>${right}</span>
    <span class="gm-comp">${esc(g.comp)}</span>
    ${g.state === 'pre' ? `<button class="gm-cal ${onCal ? 'on' : ''}" data-cal="${g.id}" data-team="${team.key}" title="${onCal ? 'Ya está en tu calendario' : 'Añadir al calendario'}">${onCal ? '✓' : '📅'}</button>` : '<span></span>'}
  </div>`;
}

function f1CardLines(S, last, next) {
  return `${last ? `<div class="tc-line"><span class="muted">Última</span> ${esc(last.home.short)}${last.winner ? ` · 🏆 <b>${esc(last.winner.driver)}</b>` : ''}</div>` : ''}
    ${next ? `<div class="tc-line"><span class="muted">Próxima</span> ${esc(next.home.short)} · ${gameWhen(next)}</div>` : ''}`;
}

function drawF1(el, team, view) {
  const S = Sports.get(team.key);
  const info = S.info || {};
  const now = Date.now();
  const next = S.games.filter(g => g.state !== 'post' && new Date(g.date) > now - 3 * 36e5);
  const past = S.games.filter(g => g.state === 'post').reverse();
  const notify = !!state.sports.notify[team.key];
  el.innerHTML = `<div class="team-hero" style="--c:${team.color}">
      <span class="th-logo ph">${team.emoji}</span>
      <div class="th-main"><h2>${esc(team.name)}</h2><div class="muted">${esc([info.standing, info.record].filter(Boolean).join(' · ') || 'Fórmula 1')}</div></div>
      <button class="btn ${notify ? 'primary' : 'ghost'}" id="spBell">${notify ? '🔔 Te aviso de cada carrera' : '🔕 Avisarme de las carreras'}</button>
    </div>
    ${S.err && !S.games.length ? `<div class="empty">⚠️ ${esc(S.err)}. Revisa tu conexión y pulsa <b>↻ Actualizar</b>.</div>` : ''}
    <div class="sports-cols">
      <div>
        <section class="block"><div class="block-head brown">🗓️ Próximas carreras</div>${next.length ? next.slice(0, 8).map(g => raceRowHTML(g, team)).join('') : `<p class="muted">${S.games.length ? 'La temporada ha terminado. El calendario nuevo aparece en cuanto se publique.' : 'Cargando…'}</p>`}</section>
        <section class="block"><div class="block-head brown">🏁 Resultados</div>${past.length ? past.slice(0, 12).map(g => raceRowHTML(g, team)).join('') : '<p class="muted">Aún no hay carreras disputadas esta temporada.</p>'}</section>
      </div>
      <div>
        <section class="block"><div class="block-head brown">🏆 Mundial de pilotos</div><div id="f1Drivers"><p class="muted small">Cargando…</p></div></section>
        <section class="block"><div class="block-head brown">🔧 Constructores</div><div id="f1Teams"><p class="muted small">Cargando…</p></div></section>
      </div>
    </div>`;
  $('#spBell').onclick = () => {
    state.sports.notify[team.key] = !notify; save(); checkReminders();
    toast(!notify ? '🔔 Te aviso 1 hora antes de cada carrera' : 'Avisos desactivados');
    view.draw();
  };
  loadF1Standings(team).then(tb => {
    const d = $('#f1Drivers'), c = $('#f1Teams');
    if (!d || state.sports.team !== team.key) return;
    d.innerHTML = tb.drivers.length ? `<div class="table-wrap"><table class="st-table"><thead><tr><th>#</th><th>Piloto</th><th>Equipo</th><th>Vic.</th><th>Pts</th></tr></thead>
      <tbody>${tb.drivers.map(r => `<tr><td>${esc(r.pos)}</td><td class="st-team">${esc(r.name)}</td><td class="muted">${esc(r.team)}</td><td>${esc(r.wins)}</td><td><b>${esc(r.pts)}</b></td></tr>`).join('')}</tbody></table></div>` : '<p class="muted small">Sin datos todavía.</p>';
    c.innerHTML = tb.teams.length ? `<div class="table-wrap"><table class="st-table"><thead><tr><th>#</th><th>Equipo</th><th>Vic.</th><th>Pts</th></tr></thead>
      <tbody>${tb.teams.map(r => `<tr><td>${esc(r.pos)}</td><td class="st-team">${esc(r.name)}</td><td>${esc(r.wins)}</td><td><b>${esc(r.pts)}</b></td></tr>`).join('')}</tbody></table></div>` : '<p class="muted small">Sin datos todavía.</p>';
  }).catch(e => { const d = $('#f1Drivers'); if (d) d.innerHTML = `<p class="muted small">No se pudo cargar el Mundial (${esc(e.message)}).</p>`; const c = $('#f1Teams'); if (c) c.innerHTML = ''; });
}

function openRace(g, team) {
  let tab = g.state === 'post' ? 'race' : 'times';
  const cache = {};
  modal({
    title: `🏎️ ${g.home.name}`,
    wide: true, ok: null, cancel: 'Cerrar',
    body: '<div class="gm" id="gmBody"></div>',
    onOpen(w) {
      const body = $('#gmBody', w);
      const resTable = (rows, quali) => rows.length ? `<div class="table-wrap"><table class="bx-table"><thead><tr><th>#</th><th>Piloto</th><th>Equipo</th>${quali ? '<th>Q1</th><th>Q2</th><th>Q3</th>' : '<th>Tiempo / estado</th><th>Pts</th>'}</tr></thead>
        <tbody>${rows.map(x => `<tr><td>${esc(x.position)}</td><td>${esc(f1Driver(x.Driver))}</td><td class="muted">${esc((x.Constructor || {}).name || '')}</td>${quali ? `<td>${esc(x.Q1 || '')}</td><td>${esc(x.Q2 || '')}</td><td>${esc(x.Q3 || '')}</td>` : `<td>${esc((x.Time || {}).time || x.status || '')}</td><td>${esc(x.points || '0')}</td>`}</tr>`).join('')}</tbody></table></div>` : '<p class="muted">Todavía no hay resultados de esta sesión.</p>';
      const load = async kind => {
        if (cache[kind]) return;
        cache[kind] = 'loading';
        try {
          const path = kind === 'race' ? 'results' : kind === 'sprint' ? 'sprint' : 'qualifying';
          const j = await getJ(`${F1API}/${g.season}/${g.round}/${path}.json`);
          const r = (((j.MRData || {}).RaceTable || {}).Races || [])[0] || {};
          cache[kind] = r.Results || r.SprintResults || r.QualifyingResults || [];
        } catch (e) { cache[kind] = { err: e.message }; }
        if (document.body.contains(w)) draw();
      };
      const draw = () => {
        const tabs = [['times', 'Horarios'], ['quali', 'Clasificación'], ...(g.sprint ? [['sprint', 'Sprint']] : []), ['race', 'Carrera']];
        let content = '';
        if (tab === 'times') {
          content = `<div class="kev">${g.sessions.map(s => { const d = new Date(s.date); const done = d.getTime() < Date.now(); return `<div class="kev-row c"><span class="kev-min">${isNaN(d) ? '' : `${WEEKDAYS[d.getDay()].slice(0, 3)} ${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}`}</span><span class="kev-ico">${done ? '✓' : '⏱️'}</span><span><b>${esc(s.name)}</b> · ${isNaN(d) ? '' : fmtTime(d)}</span></div>`; }).join('')}</div>
            <p class="muted small">Horas en tu zona horaria.</p>`;
        } else {
          const v = cache[tab];
          if (!v) { load(tab); content = '<p class="muted">Cargando…</p>'; }
          else if (v === 'loading') content = '<p class="muted">Cargando…</p>';
          else if (v.err) content = `<p class="muted">⚠️ No se pudieron cargar los resultados (${esc(v.err)}).</p>`;
          else content = resTable(v, tab === 'quali');
        }
        body.innerHTML = `<div class="gm-head"><div class="gm-center" style="grid-column:1/-1">
            <div class="gm-big">🏁 ${esc(g.home.name)}</div>
            <div class="gm-status ${g.state}">${gameWhen(g)}</div>
            <small class="muted">${esc(g.comp)}${g.venue ? ' · ' + esc(g.venue) : ''}</small>
            ${g.winner ? `<div>🏆 <b>${esc(g.winner.driver)}</b> <small class="muted">${esc(g.winner.team)}</small></div>` : ''}</div></div>
          <div class="seg gm-tabs">${tabs.map(([k, n]) => `<button data-gt="${k}" class="${k === tab ? 'on' : ''}">${n}</button>`).join('')}</div>
          <div class="gm-content">${content}</div>
          ${g.state === 'pre' ? `<button class="btn ghost full" id="gmCal">${state.events.some(ev => ev.gameId === g.id) ? '✓ Ya está en tu calendario' : '📅 Añadir la carrera al calendario'}</button>` : ''}`;
        $$('[data-gt]', body).forEach(b => b.onclick = () => { tab = b.dataset.gt; draw(); });
        const cal = $('#gmCal', body);
        if (cal) cal.onclick = () => { addGameToCalendar(g, team); draw(); };
      };
      draw();
    }
  });
}
