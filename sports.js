// Deportes: partidos, resultados en vivo, estadísticas, clasificación y alineaciones de tus equipos.
// Los datos vienen de la API pública de ESPN (sin cuenta ni clave).
const ESPN = 'https://site.api.espn.com/apis/site/v2/sports';
const ESPN2 = 'https://site.api.espn.com/apis/v2/sports';

const SPORT_TEAMS = [
  { key: 'gb', name: 'Green Bay Packers', short: 'Packers', sport: 'football', leagues: ['nfl'], id: '', match: ['green bay packers', 'packers'], emoji: '🏈', color: '#203731' },
  { key: 'liv', name: 'Liverpool FC', short: 'Liverpool', sport: 'soccer', leagues: ['eng.1', 'uefa.champions', 'eng.fa', 'eng.league_cup'], id: '', match: ['liverpool'], emoji: '⚽', color: '#c8102e' },
  { key: 'mil', name: 'Milwaukee Brewers', short: 'Brewers', sport: 'baseball', leagues: ['mlb'], id: '', match: ['milwaukee brewers', 'brewers'], emoji: '⚾', color: '#ffc52f' },
  { key: 'bucks', name: 'Milwaukee Bucks', short: 'Bucks', sport: 'basketball', leagues: ['nba'], id: '', match: ['milwaukee bucks', 'bucks'], emoji: '🏀', color: '#00471b' },
  { key: 'chivas', name: 'Chivas (Guadalajara)', short: 'Chivas', sport: 'soccer', leagues: ['mex.1', 'concacaf.champions'], id: '', match: ['guadalajara', 'chivas'], emoji: '🐐', color: '#e30613' },
  { key: 'f1', name: 'Fórmula 1', short: 'F1', sport: 'racing', leagues: ['f1'], id: 'f1', match: [], emoji: '🏎️', color: '#e10600' }
];

const LEAGUE_NAMES = {
  nba: 'NBA', nfl: 'NFL', mlb: 'MLB', f1: 'Fórmula 1', 'eng.1': 'Premier League', 'eng.fa': 'FA Cup', 'eng.league_cup': 'Carabao Cup', 'concacaf.champions': 'Concacaf Champions Cup', 'uefa.europa': 'Europa League', 'esp.1': 'LaLiga', 'esp.2': 'LaLiga Hypermotion', 'mex.1': 'Liga MX',
  'uefa.champions': 'Champions League', 'esp.copa_del_rey': 'Copa del Rey', 'esp.super_cup': 'Supercopa', 'fifa.cwc': 'Mundial de Clubes'
};

const STAT_ES = {
  'Possession': 'Posesión', 'Shots': 'Tiros', 'Shots on Target': 'Tiros a puerta', 'On Goal': 'Tiros a puerta', 'On Target': 'Tiros a puerta', 'Fouls': 'Faltas', 'Corner Kicks': 'Córners', 'Corners': 'Córners',
  'Yellow Cards': 'Amarillas', 'Red Cards': 'Rojas', 'Offsides': 'Fueras de juego', 'Saves': 'Paradas', 'Passes': 'Pases', 'Accurate Passes': 'Pases buenos', 'Pass Completion %': '% pases', 'Tackles': 'Entradas',
  'Field Goal %': '% tiros de campo', 'FG%': '% tiros de campo', 'Three Point %': '% triples', '3PT%': '% triples', 'Free Throw %': '% tiros libres', 'Rebounds': 'Rebotes', 'Assists': 'Asistencias', 'Steals': 'Robos',
  'Blocks': 'Tapones', 'Turnovers': 'Pérdidas', 'Fast Break Points': 'Puntos al contraataque', 'Points in Paint': 'Puntos en la pintura', 'Largest Lead': 'Máxima ventaja',
  'Hits': 'Hits', 'Runs': 'Carreras', 'Errors': 'Errores', 'Home Runs': 'Jonrones', 'Strikeouts': 'Ponches', 'Batting Average': 'Promedio de bateo', 'ERA': 'Efectividad (ERA)',
  '1st Downs': 'Primeros downs', 'Total Yards': 'Yardas totales', 'Passing': 'Yardas por pase', 'Rushing': 'Yardas por tierra', 'Penalties': 'Castigos', 'Possession Time': 'Tiempo de posesión', 'Third Down Efficiency': 'Eficiencia en 3.º down', 'Sacks-Yards Lost': 'Capturas'
};

const Sports = {
  data: {}, timer: null, loading: {}, standings: {},
  team(key) { return SPORT_TEAMS.find(t => t.key === key); },
  st() { return state.sports; },
  get(key) {
    if (!this.data[key]) {
      const snap = (state.sports.snap || {})[key];
      this.data[key] = snap ? { games: snap.games || [], info: snap.info || null, at: 0, snapAt: snap.at } : { games: [], info: null, at: 0 };
    }
    return this.data[key];
  }
};

const getJ = url => httpJSON(url);

function teamLogo(t) { return (t && ((t.logos && t.logos[0] && t.logos[0].href) || t.logo)) || ''; }
function scoreOf(s) {
  if (s == null) return '';
  if (typeof s === 'object') return s.displayValue != null ? String(s.displayValue) : s.value != null ? String(s.value) : '';
  return String(s);
}

function parseGame(e, lg) {
  const c = (e.competitions || [])[0];
  if (!c) return null;
  const st = ((c.status || e.status || {}).type) || {};
  const side = ha => {
    const x = (c.competitors || []).find(k => k.homeAway === ha) || {};
    const t = x.team || {};
    return { id: String(t.id || x.id || ''), name: t.displayName || t.name || '?', short: t.shortDisplayName || t.displayName || t.abbreviation || '?', abbr: t.abbreviation || '', logo: teamLogo(t), score: scoreOf(x.score), winner: x.winner === true, so: x.shootoutScore != null ? String(x.shootoutScore) : '' };
  };
  const lgSlug = e.league && (e.league.slug || e.league.midsizeName);
  return {
    id: String(e.id), league: lg,
    comp: LEAGUE_NAMES[lgSlug] || LEAGUE_NAMES[lg] || (e.league && (e.league.shortName || e.league.name)) || lg,
    date: e.date || c.date || '', state: st.state || 'pre', done: !!st.completed, status: st.name || '',
    detail: st.shortDetail || st.detail || st.description || '',
    home: side('home'), away: side('away'), venue: (c.venue && c.venue.fullName) || ''
  };
}

function parseInfo(t) {
  const items = (t.record && t.record.items) || [];
  const total = items.find(i => i.type === 'total') || items[0] || {};
  const stats = {};
  (total.stats || []).forEach(s => { stats[s.name] = s.value; });
  return {
    name: t.displayName || '', logo: teamLogo(t), color: t.color ? '#' + t.color : '',
    record: total.summary || '', home: (items.find(i => i.type === 'home') || {}).summary || '', road: (items.find(i => i.type === 'road' || i.type === 'away') || {}).summary || '',
    standing: (t.standingSummary || '').replace(/(\d+)(st|nd|rd|th) in /i, '$1.º en ').replace(/^Tied for /i, 'Empatado en '),
    stats
  };
}

// Encuentra el id de ESPN de un equipo (y en qué liga está) buscando por nombre; se guarda para la próxima vez.
async function resolveTeam(team) {
  const known = state.sports.ids[team.key];
  if (known && known.id) return known;
  if (team.id) return { id: team.id, league: team.leagues[0] };
  let reached = false, lastErr = null;
  for (const lg of team.leagues) {
    try {
      const j = await getJ(`${ESPN}/${team.sport}/${lg}/teams`);
      reached = true;
      const list = (((j.sports || [])[0] || {}).leagues || [])[0];
      const hit = ((list && list.teams) || []).map(x => x.team).find(t => team.match.some(m => `${t.displayName} ${t.name} ${t.location}`.toLowerCase().includes(m)));
      if (hit) {
        const r = { id: String(hit.id), league: lg };
        state.sports.ids[team.key] = r; save();
        return r;
      }
    } catch (e) { lastErr = e; }
  }
  throw reached ? new Error(`no encontré a ${team.name} en ESPN`) : lastErr;
}

async function loadTeam(team, force = false) {
  if (team.sport === 'racing') return loadF1(team, force);
  const S = Sports.get(team.key);
  if (!force && S.at && Date.now() - S.at < 5 * 6e4) return S;
  if (Sports.loading[team.key]) return Sports.loading[team.key];
  const job = (async () => {
    try {
      const { id, league } = await resolveTeam(team);
      S.id = id; S.league = league;
      const leagues = [league, ...team.leagues.filter(l => l !== league)];
      const games = new Map();
      const add = (j, lg) => (j.events || []).forEach(e => {
        const g = parseGame(e, lg);
        if (!g) return;
        const old = games.get(g.id);
        games.set(g.id, old ? { ...g, league: old.league, comp: old.comp } : g);
      });
      const jobs = [];
      for (const lg of leagues) {
        const base = `${ESPN}/${team.sport}/${lg}/teams/${id}/schedule`;
        jobs.push(getJ(base).then(j => add(j, lg)));
        if (team.sport === 'soccer') jobs.push(getJ(base + '?fixture=true').then(j => add(j, lg)));
      }
      jobs.push(getJ(`${ESPN}/${team.sport}/${league}/teams/${id}`).then(j => { S.info = parseInfo(j.team || {}); }));
      const res = await Promise.allSettled(jobs);
      if (res.every(r => r.status === 'rejected')) throw res[0].reason;
      if (games.size) S.games = [...games.values()].sort((a, b) => a.date.localeCompare(b.date));
      S.at = Date.now(); S.err = null;
      snapshotTeam(team);
    } catch (e) {
      console.error(team.key, e);
      S.err = /HTTP 0|Failed to fetch|host|Unable|timeout/i.test(e.message) ? 'Sin conexión con ESPN' : e.message;
    } finally { delete Sports.loading[team.key]; }
    return S;
  })();
  Sports.loading[team.key] = job;
  return job;
}

// Guarda un resumen pequeño para ver algo al abrir la app sin internet y para los avisos de partidos.
function snapshotTeam(team) {
  const S = Sports.get(team.key);
  const now = Date.now();
  const past = S.games.filter(g => g.state === 'post' || new Date(g.date) < now - 4 * 36e5).slice(-6);
  const next = S.games.filter(g => !past.includes(g)).slice(0, 10);
  state.sports.snap[team.key] = { at: now, info: S.info, games: [...past, ...next] };
  save();
}

async function loadStandings(team) {
  if (team.sport === 'racing') return loadF1Standings(team);
  const S = Sports.get(team.key);
  if (S.table && Date.now() - S.tableAt < 30 * 6e4) return S.table;
  const league = S.league || team.leagues[0];
  const j = await getJ(`${ESPN2}/${team.sport}/${league}/standings`);
  const groups = [];
  const walk = n => {
    if (n.standings && n.standings.entries) groups.push({ name: n.name || n.abbreviation || '', entries: n.standings.entries });
    (n.children || []).forEach(walk);
  };
  walk(j);
  const id = S.id || team.id;
  const g = groups.find(gr => gr.entries.some(en => String((en.team || {}).id) === String(id))) || groups[0];
  if (!g) throw new Error('sin clasificación');
  const stat = (en, name) => { const s = (en.stats || []).find(x => x.name === name || x.type === name); return s ? (s.displayValue != null ? s.displayValue : String(s.value)) : ''; };
  const num = (en, name) => { const s = (en.stats || []).find(x => x.name === name); return s && s.value != null ? +s.value : NaN; };
  const rows = g.entries.map(en => ({ en, id: String((en.team || {}).id), name: (en.team || {}).shortDisplayName || (en.team || {}).displayName || '?', logo: teamLogo(en.team) }));
  const rankKey = team.sport === 'soccer' ? 'rank' : 'playoffSeed';
  rows.sort((a, b) => {
    const ra = num(a.en, rankKey), rb = num(b.en, rankKey);
    if (!isNaN(ra) && !isNaN(rb) && ra !== rb) return ra - rb;
    return (num(b.en, team.sport === 'soccer' ? 'points' : 'winPercent') || 0) - (num(a.en, team.sport === 'soccer' ? 'points' : 'winPercent') || 0);
  });
  const cols = team.sport === 'soccer' ? [['PJ', 'gamesPlayed'], ['G', 'wins'], ['E', 'ties'], ['P', 'losses'], ['DG', 'pointDifferential'], ['Pts', 'points']]
    : team.sport === 'basketball' || team.sport === 'baseball' ? [['G', 'wins'], ['P', 'losses'], ['%', 'winPercent'], ['Dif', 'gamesBehind'], ['Racha', 'streak']]
      : [['G', 'wins'], ['P', 'losses'], ['E', 'ties'], ['%', 'winPercent'], ['Racha', 'streak']];
  S.table = { name: g.name, cols: cols.map(c => c[0]), rows: rows.map((r, i) => ({ id: r.id, name: r.name, logo: r.logo, pos: i + 1, vals: cols.map(c => stat(r.en, c[1]) || '—') })) };
  S.tableAt = Date.now();
  return S.table;
}

// ---------- Utilidades de presentación ----------
function ourSide(g, team) {
  const id = String(Sports.get(team.key).id || (state.sports.ids[team.key] || {}).id || team.id || '');
  if (id && g.away.id === id) return 'away';
  if (id && g.home.id === id) return 'home';
  return team.match.some(m => g.away.name.toLowerCase().includes(m)) ? 'away' : 'home';
}

function gameResult(g, team) {
  if (g.state !== 'post' || team.sport === 'racing') return '';
  const us = ourSide(g, team), them = us === 'home' ? 'away' : 'home';
  if (g[us].winner) return 'G';
  if (g[them].winner) return 'P';
  const a = parseFloat(g[us].score), b = parseFloat(g[them].score);
  if (isNaN(a) || isNaN(b)) return '';
  return a > b ? 'G' : a < b ? 'P' : 'E';
}

function liveDetail(g) {
  return (g.detail || '').replace(/Halftime|^HT$/i, 'Descanso').replace(/^End of (\d)(st|nd|rd|th)/i, 'Fin del $1.º').replace(/(\d)(st|nd|rd|th) Quarter/i, '$1.º cuarto').replace(/(\d)(st|nd|rd|th) Half/i, '$1.ª parte').replace(/ - (\d)(st|nd|rd|th)/, ' · $1.º');
}

function gameWhen(g) {
  if (g.state === 'in') return `<span class="live-dot"></span>${esc(liveDetail(g)) || 'En vivo'}`;
  if (/POSTPONED/.test(g.status)) return 'Aplazado';
  if (/CANCELED|CANCELLED/.test(g.status)) return 'Cancelado';
  const d = new Date(g.date);
  if (isNaN(d)) return '';
  if (g.state === 'post') {
    const extra = /Pen|SO/i.test(g.detail) ? ' (pen.)' : /AET|OT/i.test(g.detail) ? ' (pró.)' : '';
    return `${WEEKDAYS[d.getDay()].slice(0, 3)} ${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)} · Final${extra}`;
  }
  const today = dayKey(new Date()), tomorrow = dayKey(new Date(Date.now() + 864e5)), k = dayKey(d);
  const day = k === today ? 'Hoy' : k === tomorrow ? 'Mañana' : `${WEEKDAYS[d.getDay()].slice(0, 3)} ${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}`;
  return `${day} · ${fmtTime(d)}`;
}

const logoImg = (src, cls = 'tl') => src ? `<img class="${cls}" src="${esc(src)}" alt="" loading="lazy">` : `<span class="${cls} ph">●</span>`;

function gameRowHTML(g, team) {
  if (team.sport === 'racing') return raceRowHTML(g, team);
  const res = gameResult(g, team);
  const score = g.state === 'pre' ? '<span class="vs">vs</span>' : `${esc(g.home.score)}<i>-</i>${esc(g.away.score)}`;
  const onCal = state.events.some(ev => ev.gameId === g.id);
  return `<div class="gm-row ${g.state}" data-game="${g.id}" data-team="${team.key}" role="button" tabindex="0">
    <span class="gm-when">${gameWhen(g)}</span>
    <span class="gm-teams">
      <span class="gm-t home ${g.home.winner ? 'win' : ''}">${esc(g.home.short)} ${logoImg(g.home.logo)}</span>
      <b class="gm-score">${score}</b>
      <span class="gm-t away ${g.away.winner ? 'win' : ''}">${logoImg(g.away.logo)} ${esc(g.away.short)}</span>
    </span>
    <span class="gm-comp">${esc(g.comp)}</span>
    ${res ? `<span class="res res-${res}">${res}</span>` : g.state === 'pre' ? `<button class="gm-cal ${onCal ? 'on' : ''}" data-cal="${g.id}" data-team="${team.key}" title="${onCal ? 'Ya está en tu calendario' : 'Añadir al calendario'}">${onCal ? '✓' : '📅'}</button>` : '<span></span>'}
  </div>`;
}

function bindGames(el) {
  $$('[data-cal]', el).forEach(b => b.onclick = e => {
    e.stopPropagation();
    const team = Sports.team(b.dataset.team);
    const g = Sports.get(team.key).games.find(x => x.id === b.dataset.cal);
    if (g) addGameToCalendar(g, team);
  });
  $$('[data-game]', el).forEach(r => {
    const open = () => {
      const team = Sports.team(r.dataset.team);
      const g = Sports.get(team.key).games.find(x => x.id === r.dataset.game);
      if (g) openGame(g, team);
    };
    r.onclick = open;
    r.onkeydown = e => { if (e.key === 'Enter') open(); };
  });
}

function addGameToCalendar(g, team) {
  if (state.events.some(ev => ev.gameId === g.id)) { toast('Ese partido ya está en tu calendario'); return; }
  const d = new Date(g.date);
  state.events.push({
    id: uid(), created: Date.now(), gameId: g.id, kind: 'partido', title: team.sport === 'racing' ? `${team.emoji} ${g.home.name}` : `${team.emoji} ${g.home.short} vs ${g.away.short}`,
    date: dayKey(d), time: fmtTime(d), repeat: 'none', remind: true, skip: [], notes: [g.comp, g.venue].filter(Boolean).join(' · ')
  });
  save(); checkReminders();
  toast(team.sport === 'racing' ? '📅 Carrera añadida al calendario · te aviso 1 día antes y ese día' : '📅 Partido añadido al calendario · te aviso 1 día antes y ese día');
  rerender();
}

const formHTML = (games, team) => games.filter(g => g.state === 'post').slice(-5).map(g => { const r = gameResult(g, team); return r ? `<span class="res res-${r}" title="${esc(g.home.short)} ${esc(g.home.score)}-${esc(g.away.score)} ${esc(g.away.short)}">${r}</span>` : ''; }).join('');

// ---------- Vista ----------
VIEWS.sports = {
  render(main) {
    const sel = state.sports.team && (state.sports.team === 'all' || Sports.team(state.sports.team)) ? state.sports.team : 'all';
    main.innerHTML = `<div class="page sports">
      <div class="view-head"><div><h1>🏆 Deportes</h1><p class="muted">Tus equipos: partidos, resultados en vivo, clasificación, estadísticas y alineaciones.</p></div>
        <div class="row"><span class="muted small" id="spUpd"></span><button class="btn ghost" id="spRefresh">↻ Actualizar</button></div></div>
      <div class="sp-tabs">
        <button data-tm="all" class="${sel === 'all' ? 'on' : ''}">⭐ Todos</button>
        ${SPORT_TEAMS.map(t => `<button data-tm="${t.key}" class="${sel === t.key ? 'on' : ''}" style="--c:${t.color}">${t.emoji} ${t.short}</button>`).join('')}
      </div>
      <div id="sportsArea"></div>
      <p class="muted small sp-credit">Datos públicos de ESPN (F1: Jolpica-F1) · se actualizan solos cada 30 s mientras hay partidos en vivo.</p>
    </div>`;
    $$('[data-tm]', main).forEach(b => b.onclick = () => { state.sports.team = b.dataset.tm; save(); rerender(); });
    $('#spRefresh').onclick = () => VIEWS.sports.refresh(true);
    this.draw();
    this.refresh(false);
    clearInterval(Sports.timer);
    Sports.timer = setInterval(() => this.poll(), 30000);
  },
  leave() { clearInterval(Sports.timer); Sports.timer = null; },

  async refresh(force) {
    const sel = state.sports.team;
    const teams = sel === 'all' || !Sports.team(sel) ? SPORT_TEAMS : [Sports.team(sel)];
    const upd = $('#spUpd');
    if (upd) upd.textContent = 'Actualizando…';
    await Promise.all(teams.map(t => loadTeam(t, force)));
    if (currentView === 'sports') this.draw();
  },

  // Marcadores en vivo: mientras haya un partido en juego (o a punto de empezar) se consulta el marcador cada 30 s.
  async poll() {
    if (currentView !== 'sports' || document.hidden) return;
    const now = Date.now();
    const jobs = [];
    for (const team of SPORT_TEAMS) {
      if (team.sport === 'racing') continue;
      const S = Sports.get(team.key);
      const hot = S.games.filter(g => g.state === 'in' || (g.state === 'pre' && Math.abs(new Date(g.date) - now) < 20 * 6e4));
      for (const lg of [...new Set(hot.map(g => g.league))]) {
        jobs.push(getJ(`${ESPN}/${team.sport}/${lg}/scoreboard`).then(j => {
          for (const e of j.events || []) {
            const i = S.games.findIndex(g => g.id === String(e.id));
            if (i >= 0) { const g = parseGame(e, lg); if (g) S.games[i] = { ...g, comp: S.games[i].comp }; }
          }
        }).catch(() => {}));
      }
    }
    if (!jobs.length) return;
    await Promise.all(jobs);
    if (currentView === 'sports' && !document.querySelector('.modal-wrap')) this.draw();
  },

  draw() {
    const el = $('#sportsArea');
    if (!el) return;
    const sel = state.sports.team;
    const team = Sports.team(sel);
    if (team) this.drawTeam(el, team); else this.drawAll(el);
    const ats = (team ? [team] : SPORT_TEAMS).map(t => Sports.get(t.key).at || Sports.get(t.key).snapAt || 0).filter(Boolean);
    const upd = $('#spUpd');
    if (upd) upd.textContent = ats.length ? `Actualizado ${fmtTime(new Date(Math.min(...ats)))}` : '';
    bindGames(el);
  },

  drawAll(el) {
    const now = Date.now();
    const live = [], upcoming = [];
    const cards = SPORT_TEAMS.map(team => {
      const S = Sports.get(team.key);
      const last = S.games.filter(g => g.state === 'post').slice(-1)[0];
      const next = S.games.find(g => g.state === 'pre' && new Date(g.date) > now - 3 * 36e5);
      S.games.filter(g => g.state === 'in').forEach(g => live.push({ g, team }));
      S.games.filter(g => g.state === 'pre' && new Date(g.date) > now - 3 * 36e5).slice(0, 4).forEach(g => upcoming.push({ g, team }));
      const info = S.info || {};
      const lr = last ? gameResult(last, team) : '';
      return `<div class="team-card" data-tm="${team.key}" style="--c:${team.color}">
        <div class="tc-head">${info.logo ? logoImg(info.logo, 'tc-logo') : `<span class="tc-logo ph">${team.emoji}</span>`}
          <div><b>${esc(team.name)}</b><small>${esc([info.record, info.standing].filter(Boolean).join(' · ') || LEAGUE_NAMES[team.leagues[0]])}</small></div>
          <span class="tc-form">${formHTML(S.games, team)}</span></div>
        ${S.err && !S.games.length ? `<p class="muted small">⚠️ ${esc(S.err)}</p>` : !S.games.length ? '<p class="muted small">Cargando partidos…</p>' : ''}
        ${team.sport === 'racing' ? f1CardLines(S, last, next) : `${last ? `<div class="tc-line"><span class="muted">Último</span>${lr ? `<span class="res res-${lr}">${lr}</span>` : ''} ${esc(last.home.short)} <b>${esc(last.home.score)}-${esc(last.away.score)}</b> ${esc(last.away.short)}</div>` : ''}
        ${next ? `<div class="tc-line"><span class="muted">Próximo</span> ${esc(ourSide(next, team) === 'home' ? 'vs ' + next.away.short : '@ ' + next.home.short)} · ${gameWhen(next)} <small class="muted">${esc(next.comp)}</small></div>` : ''}`}
      </div>`;
    }).join('');
    upcoming.sort((a, b) => a.g.date.localeCompare(b.g.date));
    el.innerHTML = `${live.length ? `<section class="block live-block"><div class="block-head">🔴 En vivo ahora</div>${live.map(o => gameRowHTML(o.g, o.team)).join('')}</section>` : ''}
      <div class="team-grid">${cards}</div>
      <section class="block"><div class="block-head brown">🗓️ Próximos partidos</div>
        ${upcoming.length ? upcoming.slice(0, 12).map(o => gameRowHTML(o.g, o.team)).join('') : '<p class="muted">Aquí verás los próximos partidos de tus equipos en cuanto carguen.</p>'}</section>`;
    $$('.team-card', el).forEach(c => c.onclick = () => { state.sports.team = c.dataset.tm; save(); rerender(); });
  },

  drawTeam(el, team) {
    if (team.sport === 'racing') return drawF1(el, team, this);
    const S = Sports.get(team.key);
    const info = S.info || {};
    const now = Date.now();
    const live = S.games.filter(g => g.state === 'in');
    const next = S.games.filter(g => g.state === 'pre' && new Date(g.date) > now - 3 * 36e5).slice(0, 8);
    const past = S.games.filter(g => g.state === 'post').slice(-10).reverse();
    const notify = !!state.sports.notify[team.key];
    const statChips = seasonStats(team, info);
    el.innerHTML = `<div class="team-hero" style="--c:${team.color}">
        ${info.logo ? logoImg(info.logo, 'th-logo') : `<span class="th-logo ph">${team.emoji}</span>`}
        <div class="th-main"><h2>${esc(team.name)}</h2>
          <div class="muted">${esc([info.standing, info.record && `Récord ${info.record}`, info.home && `Casa ${info.home}`, info.road && `Fuera ${info.road}`].filter(Boolean).join(' · ') || LEAGUE_NAMES[team.leagues[0]])}</div>
          <div class="th-form">${formHTML(S.games, team) || ''}</div></div>
        <button class="btn ${notify ? 'primary' : 'ghost'}" id="spBell">${notify ? '🔔 Te aviso de sus partidos' : '🔕 Avisarme de sus partidos'}</button>
      </div>
      ${S.err && !S.games.length ? `<div class="empty">⚠️ ${esc(S.err)}. Revisa tu conexión y pulsa <b>↻ Actualizar</b>.</div>` : ''}
      <div class="sports-cols">
        <div>
          ${live.length ? `<section class="block live-block"><div class="block-head">🔴 En vivo</div>${live.map(g => gameRowHTML(g, team)).join('')}</section>` : ''}
          <section class="block"><div class="block-head brown">🗓️ Próximos partidos</div>${next.length ? next.map(g => gameRowHTML(g, team)).join('') : `<p class="muted">${S.games.length ? 'No hay partidos programados por ahora.' : 'Cargando…'}</p>`}</section>
          <section class="block"><div class="block-head brown">📊 Resultados</div>${past.length ? past.map(g => gameRowHTML(g, team)).join('') : '<p class="muted">Aún no hay resultados esta temporada.</p>'}</section>
        </div>
        <div>
          ${statChips ? `<section class="block"><div class="block-head brown">📈 Temporada</div><div class="season-stats">${statChips}</div></section>` : ''}
          <section class="block"><div class="block-head brown">🏅 Clasificación <span class="muted small" id="stName"></span></div><div id="stTable"><p class="muted small">Cargando clasificación…</p></div></section>
        </div>
      </div>`;
    $('#spBell').onclick = () => {
      state.sports.notify[team.key] = !notify; save(); checkReminders();
      toast(!notify ? `🔔 Te aviso 1 hora antes de cada partido de ${team.short}` : 'Avisos desactivados');
      this.draw();
    };
    loadStandings(team).then(tb => {
      const box = $('#stTable');
      if (!box || state.sports.team !== team.key) return;
      $('#stName').textContent = tb.name ? '· ' + tb.name : '';
      const id = String(S.id || team.id);
      box.innerHTML = `<div class="table-wrap"><table class="st-table"><thead><tr><th>#</th><th>Equipo</th>${tb.cols.map(c => `<th>${c}</th>`).join('')}</tr></thead>
        <tbody>${tb.rows.map(r => `<tr class="${r.id === id ? 'me' : ''}"><td>${r.pos}</td><td class="st-team"><span class="st-team-in">${logoImg(r.logo)} ${esc(r.name)}</span></td>${r.vals.map(v => `<td>${esc(v)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
      const me = $('tr.me', box);
      if (me && me.offsetTop > 200) box.querySelector('.table-wrap').scrollTop = me.offsetTop - 120;
    }).catch(e => { const box = $('#stTable'); if (box) box.innerHTML = `<p class="muted small">No se pudo cargar la clasificación (${esc(e.message)}).</p>`; });
  }
};

function seasonStats(team, info) {
  const s = info.stats || {};
  const pick = team.sport === 'soccer'
    ? [['gamesPlayed', 'Partidos'], ['wins', 'Victorias'], ['ties', 'Empates'], ['losses', 'Derrotas'], ['pointsFor', 'Goles a favor'], ['pointsAgainst', 'Goles en contra'], ['points', 'Puntos']]
    : team.sport === 'basketball' || team.sport === 'baseball'
      ? [['wins', 'Victorias'], ['losses', 'Derrotas'], ['avgPointsFor', 'Puntos por partido'], ['avgPointsAgainst', 'Puntos recibidos'], ['winPercent', '% victorias'], ['streak', 'Racha']]
      : [['wins', 'Victorias'], ['losses', 'Derrotas'], ['ties', 'Empates'], ['pointsFor', 'Puntos a favor'], ['pointsAgainst', 'Puntos en contra'], ['streak', 'Racha']];
  const fmt = (k, v) => k === 'winPercent' ? (v * 100).toFixed(1) + '%' : k === 'streak' ? (v > 0 ? `${v} G` : v < 0 ? `${-v} P` : '—') : Number.isInteger(v) ? v : (+v).toFixed(1);
  return pick.filter(([k]) => s[k] != null).map(([k, l]) => `<div class="ss"><b>${fmt(k, s[k])}</b><small>${l}</small></div>`).join('');
}

// ---------- Detalle del partido ----------
async function gameSummary(g, team) {
  let err;
  for (const lg of [g.league, ...team.leagues.filter(l => l !== g.league)]) {
    try { return { j: await getJ(`${ESPN}/${team.sport}/${lg}/summary?event=${g.id}`), lg }; } catch (e) { err = e; }
  }
  throw err;
}

function openGame(g, team) {
  if (team.sport === 'racing') return openRace(g, team);
  let tab = team.sport === 'soccer' && g.state === 'pre' ? 'lineups' : 'sum';
  let data = null, timer = null;
  modal({
    title: `${g.home.short} vs ${g.away.short}`,
    wide: true, ok: null, cancel: 'Cerrar',
    body: '<div class="gm" id="gmBody"><p class="muted">Cargando el partido…</p></div>',
    onOpen(w) {
      const body = $('#gmBody', w);
      const draw = () => {
        const j = data || {};
        const comp = ((j.header || {}).competitions || [])[0];
        const live = comp ? parseGame({ id: g.id, date: comp.date, competitions: [comp], league: null }, g.league) : g;
        if (comp) { live.comp = g.comp; live.venue = live.venue || ((j.gameInfo || {}).venue || {}).fullName || g.venue; }
        Object.assign(g, { home: live.home, away: live.away, state: live.state, detail: live.detail, status: live.status, done: live.done });
        const tabs = [['sum', 'Resumen'], ['stats', 'Estadísticas'], ['lineups', team.sport === 'soccer' ? 'Alineaciones' : 'Jugadores']];
        body.innerHTML = `<div class="gm-head">
            <div class="gm-side">${logoImg(live.home.logo, 'gm-logo')}<b>${esc(live.home.name)}</b><small>Local</small></div>
            <div class="gm-center"><div class="gm-big">${live.state === 'pre' ? 'vs' : `${esc(live.home.score)} <i>-</i> ${esc(live.away.score)}`}</div>
              ${live.home.so || live.away.so ? `<small>Penaltis ${esc(live.home.so)}-${esc(live.away.so)}</small>` : ''}
              <div class="gm-status ${live.state}">${gameWhen(live)}</div>
              <small class="muted">${esc(g.comp)}${live.venue ? ' · ' + esc(live.venue) : ''}</small></div>
            <div class="gm-side">${logoImg(live.away.logo, 'gm-logo')}<b>${esc(live.away.name)}</b><small>Visitante</small></div>
          </div>
          <div class="seg gm-tabs">${tabs.map(([k, n]) => `<button data-gt="${k}" class="${k === tab ? 'on' : ''}">${n}</button>`).join('')}</div>
          <div class="gm-content">${!data ? '<p class="muted">Cargando…</p>' : tab === 'stats' ? gmStats(j) : tab === 'lineups' ? (team.sport === 'soccer' ? gmLineups(j) : gmPlayers(j)) : gmSummary(j, live, team)}</div>
          ${live.state === 'pre' ? `<button class="btn ghost full" id="gmCal">${state.events.some(ev => ev.gameId === g.id) ? '✓ Ya está en tu calendario' : '📅 Añadir al calendario'}</button>` : ''}`;
        $$('[data-gt]', body).forEach(b => b.onclick = () => { tab = b.dataset.gt; draw(); });
        const cal = $('#gmCal', body);
        if (cal) cal.onclick = () => { addGameToCalendar(g, team); draw(); };
      };
      const load = async () => {
        if (!document.body.contains(w)) { clearInterval(timer); return; }
        try { data = (await gameSummary(g, team)).j; }
        catch (e) { if (!data) { body.innerHTML = `<p class="muted">⚠️ No se pudo cargar el partido (${esc(e.message)}).</p>`; return; } }
        draw();
        if (g.state === 'in' && !timer) timer = setInterval(load, 30000);
        if (g.state !== 'in' && timer) { clearInterval(timer); timer = null; }
      };
      draw();
      load();
    }
  });
}

function gmSummary(j, g, team) {
  let html = '';
  const homeId = g.home.id;
  const sideOf = t => t && String(t.id) === homeId ? 'h' : 'a';
  const keyEvents = j.keyEvents || [];
  if (keyEvents.length) {
    const icon = t => /goal|penalty - scored/i.test(t) ? '⚽' : /red/i.test(t) ? '🟥' : /yellow/i.test(t) ? '🟨' : /subst/i.test(t) ? '🔁' : /var/i.test(t) ? '📺' : /half|kickoff|start|end/i.test(t) ? '⏱️' : '•';
    const shown = keyEvents.filter(e => !/^(kickoff|start)/i.test(((e.type || {}).text) || ''));
    html += `<h4>Minuto a minuto</h4><div class="kev">${shown.map(e => {
      const t = (e.type || {}).text || '';
      const who = (e.participants || []).map(p => (p.athlete || {}).displayName).filter(Boolean).join(' → ');
      return `<div class="kev-row ${e.team ? sideOf(e.team) : 'c'}"><span class="kev-min">${esc((e.clock || {}).displayValue || '')}</span><span class="kev-ico">${icon(t)}</span><span>${esc(who || e.shortText || e.text || t)}</span></div>`;
    }).join('')}</div>`;
  }
  const scoring = j.scoringPlays || [];
  if (scoring.length) {
    html += `<h4>Anotaciones</h4><div class="kev">${scoring.map(p => `<div class="kev-row ${sideOf(p.team)}"><span class="kev-min">${p.period ? (p.period.number > 4 ? 'OT' : 'Q' + p.period.number) : ''} ${esc((p.clock || {}).displayValue || '')}</span><span class="kev-ico">🏈</span><span>${esc(p.text || '')} <b>${esc(String(p.homeScore != null ? p.homeScore : ''))}-${esc(String(p.awayScore != null ? p.awayScore : ''))}</b></span></div>`).join('')}</div>`;
  }
  const leaders = (j.leaders || []).filter(l => l.leaders && l.team);
  if (leaders.length) {
    html += `<h4>Líderes</h4><div class="ldr-cols">${leaders.map(l => `<div><b class="ldr-team">${esc(l.team.displayName || l.team.abbreviation || '')}</b>${l.leaders.slice(0, 3).map(c => {
      const top = (c.leaders || [])[0];
      return top ? `<div class="ldr"><small>${esc(STAT_ES[c.displayName] || c.displayName || c.name || '')}</small><span>${esc((top.athlete || {}).displayName || '')}</span><b>${esc(top.displayValue || '')}</b></div>` : '';
    }).join('')}</div>`).join('')}</div>`;
  }
  const inj = (j.injuries || []).filter(i => (i.injuries || []).length);
  if (inj.length && g.state === 'pre') {
    html += `<h4>Bajas</h4><div class="ldr-cols">${inj.map(t => `<div><b class="ldr-team">${esc((t.team || {}).displayName || '')}</b>${t.injuries.slice(0, 8).map(i => `<div class="ldr"><span>${esc((i.athlete || {}).displayName || '')}</span><small>${esc(i.status || '')}</small></div>`).join('')}</div>`).join('')}</div>`;
  }
  if (!html) html = g.state === 'pre' ? '<p class="muted">El partido aún no empieza. Aquí verás goles, tarjetas y cambios en directo.</p>' : '<p class="muted">ESPN no tiene el resumen de este partido.</p>';
  return html;
}

function gmStats(j) {
  const teams = ((j.boxscore || {}).teams || []).filter(t => (t.statistics || []).length);
  if (teams.length < 2) return '<p class="muted">Las estadísticas aparecen cuando empieza el partido.</p>';
  // ESPN lista primero al visitante en muchos deportes: se ordena local / visitante.
  const [h, a] = teams[0].homeAway === 'away' ? [teams[1], teams[0]] : teams;
  const val = (t, s) => (t.statistics || []).find(x => x.name === s.name) || {};
  return `<div class="bx-head"><b>${esc((h.team || {}).shortDisplayName || (h.team || {}).displayName || 'Local')}</b><b>${esc((a.team || {}).shortDisplayName || (a.team || {}).displayName || 'Visitante')}</b></div>
    ${h.statistics.map(s => {
      const hv = s.displayValue, av = val(a, s).displayValue;
      if (hv == null || av == null) return '';
      const hn = parseFloat(hv), an = parseFloat(av);
      const pct = !isNaN(hn) && !isNaN(an) && hn + an > 0 ? Math.round(hn / (hn + an) * 100) : 50;
      const label = STAT_ES[s.label] || STAT_ES[s.displayName] || s.label || s.displayName || s.name;
      return `<div class="bx-row"><span>${esc(hv)}</span><small>${esc(label)}</small><span>${esc(av)}</span><div class="bx-bar"><i style="width:${pct}%"></i></div></div>`;
    }).join('')}`;
}

function gmLineups(j) {
  const rosters = (j.rosters || []).filter(r => (r.roster || []).length);
  if (!rosters.length) return '<p class="muted">Las alineaciones se publican aproximadamente 1 hora antes del partido.</p>';
  const ordered = rosters[0].homeAway === 'away' ? [...rosters].reverse() : rosters;
  const pl = p => `<li><span class="jn">${esc(p.jersey || '')}</span>${esc((p.athlete || {}).displayName || '')} <small class="muted">${esc((p.position || {}).abbreviation || '')}</small>${p.subbedOut ? ' <span title="Sustituido">🔽</span>' : ''}${p.subbedIn ? ' <span title="Entró">🔼</span>' : ''}${(p.stats || []).some(s => /goal/i.test(s.name) && +s.value > 0) ? ' ⚽' : ''}</li>`;
  return `<div class="lu-cols">${ordered.map(r => `<div class="lu">
    <div class="lu-head">${logoImg(teamLogo(r.team))}<b>${esc((r.team || {}).displayName || '')}</b>${r.formation ? `<span class="tag">${esc(r.formation)}</span>` : ''}</div>
    <h5>Titulares</h5><ul>${r.roster.filter(p => p.starter).map(pl).join('') || '<li class="muted">Por confirmar</li>'}</ul>
    <h5>Suplentes</h5><ul>${r.roster.filter(p => !p.starter).map(pl).join('')}</ul></div>`).join('')}</div>`;
}

function gmPlayers(j) {
  const teams = (j.boxscore || {}).players || [];
  if (!teams.length) return '<p class="muted">Las estadísticas de jugadores aparecen cuando empieza el partido.</p>';
  return teams.map(t => `<h4>${logoImg(teamLogo(t.team))} ${esc((t.team || {}).displayName || '')}</h4>${(t.statistics || []).slice(0, 4).map(cat => {
    const labels = cat.labels || cat.names || [];
    const ath = (cat.athletes || []).filter(a => (a.stats || []).length && !a.didNotPlay);
    if (!ath.length) return '';
    return `${cat.text || cat.name ? `<small class="muted">${esc(STAT_ES[cat.text] || cat.text || cat.name)}</small>` : ''}<div class="table-wrap"><table class="bx-table"><thead><tr><th>Jugador</th>${labels.map(l => `<th>${esc(l)}</th>`).join('')}</tr></thead>
      <tbody>${ath.slice(0, 12).map(a => `<tr class="${a.starter ? 'st' : ''}"><td>${esc((a.athlete || {}).shortName || (a.athlete || {}).displayName || '')}</td>${a.stats.map(v => `<td>${esc(v)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  }).join('')}`).join('');
}

// ---------- Inicio y avisos ----------
function renderHomeSports(el, block) {
  const now = Date.now();
  const rows = [];
  for (const team of SPORT_TEAMS) {
    const S = Sports.get(team.key);
    const g = S.games.find(x => x.state === 'in') || S.games.find(x => x.state === 'pre' && new Date(x.date) > now - 3 * 36e5);
    if (g) rows.push({ g, team });
  }
  rows.sort((a, b) => (a.g.state === 'in' ? -1 : 0) - (b.g.state === 'in' ? -1 : 0) || a.g.date.localeCompare(b.g.date));
  if (rows.length) {
    block.hidden = false;
    el.innerHTML = rows.map(o => gameRowHTML(o.g, o.team)).join('');
    bindGames(el);
  }
  // Refresca en segundo plano como mucho cada 30 min y repinta solo este bloque.
  const stale = SPORT_TEAMS.filter(t => Date.now() - (Sports.get(t.key).at || 0) > 30 * 6e4);
  if (stale.length && !renderHomeSports.busy) {
    renderHomeSports.busy = true;
    Promise.all(stale.map(t => loadTeam(t))).finally(() => {
      renderHomeSports.busy = false;
      const e2 = $('#homeSports'), b2 = $('#homeSportsBlock');
      if (currentView === 'home' && e2 && SPORT_TEAMS.some(t => Sports.get(t.key).at)) renderHomeSports(e2, b2);
    });
  }
}

// Aviso 1 hora antes de cada partido de los equipos con la campanita activada.
function sportsReminders() {
  const out = [];
  for (const team of SPORT_TEAMS) {
    if (!state.sports.notify[team.key]) continue;
    for (const g of Sports.get(team.key).games) {
      if (g.state !== 'pre' || /POSTPONED|CANCEL/.test(g.status)) continue;
      const t = new Date(g.date).getTime();
      if (isNaN(t)) continue;
      out.push({ key: `sp:${g.id}:${g.date}`, at: t - 36e5, until: t + 10 * 6e4, title: team.sport === 'racing' ? `${team.emoji} ${g.home.name}` : `${team.emoji} ${g.home.short} vs ${g.away.short}`, body: `Empieza a las ${fmtTime(new Date(t))} · ${g.comp}`, view: 'sports' });
    }
  }
  return out;
}
