// Spotify: inicio de sesión con tu cuenta (PKCE, sin guardar contraseña) para buscar entre tus playlists,
// y como respaldo playlists guardadas a mano con su enlace.
// En Windows el login vuelve a un puerto local; en la versión web (iPhone/iPad) vuelve a la propia página.
const SP_WEB = Platform.kind === 'web' && location.protocol === 'https:';
const SP_REDIRECT = Platform.kind === 'ios' ? 'luisos://callback' : SP_WEB ? location.origin + location.pathname.replace(/index\.html$/, '') : 'http://127.0.0.1:8888/callback';
const SP_SCOPES = 'playlist-read-private playlist-read-collaborative';

const Spotify = {
  results: [],
  connected() { return !!(state.spotify.token && state.spotify.token.refresh); },

  b64url(bytes) {
    let s = '';
    bytes.forEach(b => { s += String.fromCharCode(b); });
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  },
  random(n) { const a = new Uint8Array(n); crypto.getRandomValues(a); return this.b64url(a).slice(0, n); },
  challenge(verifier) {
    const hex = sha256(verifier);
    const bytes = new Uint8Array(32);
    for (let i = 0; i < 32; i++) bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
    return this.b64url(bytes);
  },

  async login() {
    const id = (state.spotify.clientId || '').trim();
    if (!/^[0-9a-f]{32}$/i.test(id)) { toast('Pega primero tu Client ID de Spotify (32 letras y números)'); return false; }
    if (!Platform.spotifyAuth) { toast('Para conectar Spotify abre la app instalada (Windows o la web en el iPhone/iPad)'); return false; }
    const verifier = this.random(64), st = this.random(16);
    state.spotify.pending = { verifier, state: st, at: Date.now() };
    flushSave();
    const url = 'https://accounts.spotify.com/authorize?' + new URLSearchParams({
      client_id: id, response_type: 'code', redirect_uri: SP_REDIRECT, code_challenge_method: 'S256',
      code_challenge: this.challenge(verifier), scope: SP_SCOPES, state: st
    });
    const back = await Platform.spotifyAuth(url, SP_REDIRECT);
    if (!back) { toast('Inicio de sesión cancelado'); return false; }
    return this.finish(back.split('?')[1] || '');
  },

  // Recibe ?code=…&state=… del regreso de Spotify (Windows: ventana de login; Android: #spcb= al recargar).
  async finish(query) {
    const p = new URLSearchParams(query);
    const pend = state.spotify.pending;
    state.spotify.pending = null;
    if (p.get('error')) { toast('Spotify: ' + (p.get('error') === 'access_denied' ? 'no diste permiso' : p.get('error'))); save(); return false; }
    if (!pend || p.get('state') !== pend.state || !p.get('code')) { toast('No se pudo completar el inicio de sesión. Inténtalo otra vez.'); save(); return false; }
    try {
      await this.tokenRequest({ grant_type: 'authorization_code', code: p.get('code'), redirect_uri: SP_REDIRECT, client_id: state.spotify.clientId.trim(), code_verifier: pend.verifier });
      const me = await this.api('/me');
      state.spotify.user = { name: me.display_name || me.id, id: me.id };
      await this.syncPlaylists();
      toast(`✅ Spotify conectado: ${state.spotify.playlists.length} playlists de ${state.spotify.user.name}`, 4000);
      if (currentView === 'home') rerender();
      return true;
    } catch (e) {
      console.error(e);
      toast('Spotify no aceptó el inicio de sesión: ' + e.message, 6000);
      return false;
    }
  },

  async tokenRequest(params) {
    const r = await Platform.http({ url: 'https://accounts.spotify.com/api/token', method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(params).toString() });
    let j = {};
    try { j = JSON.parse(r.text); } catch (e) { /* respuesta no JSON */ }
    if (!r || r.status !== 200 || !j.access_token) {
      if (j.error === 'invalid_grant' && params.grant_type === 'refresh_token') { state.spotify.token = null; save(); }
      throw new Error(j.error_description || j.error || `sin conexión (HTTP ${r ? r.status : 0})`);
    }
    const old = state.spotify.token || {};
    state.spotify.token = { access: j.access_token, refresh: j.refresh_token || old.refresh, exp: Date.now() + (j.expires_in || 3600) * 1000 };
    save();
  },

  async access() {
    const t = state.spotify.token;
    if (!t) throw new Error('no has iniciado sesión');
    if (Date.now() > t.exp - 60000) await this.tokenRequest({ grant_type: 'refresh_token', refresh_token: t.refresh, client_id: (state.spotify.clientId || '').trim() });
    return state.spotify.token.access;
  },

  async api(path, retry = true) {
    const url = path.startsWith('http') ? path : 'https://api.spotify.com/v1' + path;
    const r = await Platform.http({ url, headers: { Authorization: 'Bearer ' + await this.access() } });
    if (r.status === 401 && retry) { state.spotify.token.exp = 0; return this.api(path, false); }
    if (r.status === 429) throw new Error('Spotify pide esperar un momento');
    if (r.status < 200 || r.status >= 300) throw new Error(`HTTP ${r.status}`);
    return JSON.parse(r.text);
  },

  item(p, kind = 'playlist') {
    if (!p || !p.id) return null;
    const imgs = p.images || [];
    const count = p.tracks ? p.tracks.total : p.items ? p.items.total : p.total_tracks;
    const by = kind === 'album' ? (p.artists || []).map(a => a.name).join(', ') : (p.owner && (p.owner.display_name || p.owner.id)) || '';
    return {
      id: p.id, kind, name: p.name || 'Sin nombre', by,
      img: (imgs[imgs.length - 1] || imgs[0] || {}).url || '',
      count: count == null ? null : count,
      url: (p.external_urls && p.external_urls.spotify) || `https://open.spotify.com/${kind}/${p.id}`
    };
  },

  async syncPlaylists() {
    const out = [];
    let next = '/me/playlists?limit=50';
    for (let i = 0; next && i < 10; i++) {
      const j = await this.api(next);
      (j.items || []).forEach(p => { const it = this.item(p); if (it) out.push(it); });
      next = j.next;
    }
    state.spotify.playlists = out;
    state.spotify.syncedAt = Date.now();
    save();
    return out;
  },

  async search(q) {
    const j = await this.api('/search?type=playlist,album&limit=10&q=' + encodeURIComponent(q));
    return [
      ...((j.playlists || {}).items || []).map(p => this.item(p)),
      ...((j.albums || {}).items || []).map(a => this.item(a, 'album'))
    ].filter(Boolean);
  },

  disconnect() {
    Object.assign(state.spotify, { token: null, user: null, playlists: [], pending: null });
    save();
  },

  choose(it) {
    state.spotify.url = it.url;
    state.spotify.recent = [{ name: it.name, url: it.url, img: it.img || '' }, ...(state.spotify.recent || []).filter(r => r.url !== it.url)].slice(0, 8);
    save();
    SpotDock.update();
    if (currentView === 'home') rerender();
  },

  // Al volver del login en Android la página se recarga con #spcb=<respuesta>.
  checkCallback() {
    const qs = new URLSearchParams(location.search);
    if (SP_WEB && qs.get('state') && (qs.get('code') || qs.get('error'))) {
      const q = location.search.slice(1);
      history.replaceState(null, '', location.pathname);
      setTimeout(() => this.finish(q), 300);
      return;
    }
    const h = location.hash || '';
    if (!h.startsWith('#spcb=')) return;
    const q = decodeURIComponent(h.slice(6));
    history.replaceState(null, '', location.pathname);
    setTimeout(() => this.finish(q), 300);
  }
};

function spItemHTML(it, extra = '') {
  const cur = SpotDock.current();
  const on = cur && it.url && spotifyEmbed(it.url) && spotifyEmbed(it.url).id === cur.id;
  return `<button class="sp-item ${on ? 'on' : ''}" data-url="${esc(it.url)}">
    ${it.img ? `<img src="${esc(it.img)}" alt="" loading="lazy">` : `<span class="sp-ph">${it.emoji || '🎵'}</span>`}
    <span class="sp-it"><b>${esc(it.name)}</b><small>${esc([it.kind === 'album' ? 'Álbum' : '', it.by, it.count != null ? `${it.count} canciones` : ''].filter(Boolean).join(' · '))}</small></span>
    ${on ? '<span class="sp-now">▶ sonando</span>' : ''}${extra}</button>`;
}

function editSpotify() {
  Spotify.results = [];
  const sp = state.spotify;
  modal({
    title: 'Elige qué escuchar',
    wide: true,
    ok: null,
    cancel: 'Cerrar',
    body: `<div class="sp-picker">
      <input id="spQ" class="sp-search" placeholder="🔎 Busca entre tus playlists…" autocomplete="off">
      <div id="spAcct"></div>
      <div id="spList" class="sp-list"></div>
      <details class="sp-manual"><summary>➕ Añadir una playlist con su enlace</summary>
        <div class="row2"><label>Nombre<input id="spName" placeholder="Ej. Para estudiar"></label>
        <label>Enlace<input id="spUrl" placeholder="https://open.spotify.com/playlist/..."></label></div>
        <p class="muted small">En Spotify: ⋯ → Compartir → Copiar enlace. Quedará guardada aquí para buscarla después.</p>
        <button class="btn" id="spAdd">Guardar y poner</button></details>
    </div>`,
    onOpen(w, close) {
      const q = $('#spQ', w);
      const pick = url => {
        const all = [...sp.playlists, ...(sp.saved || []), ...SPOTIFY_PRESETS, ...Spotify.results, ...(sp.recent || [])];
        const it = all.find(x => x.url === url) || { name: 'Spotify', url };
        Spotify.choose(it); close();
        toast('🎵 ' + it.name);
      };
      const acct = () => {
        const el = $('#spAcct', w);
        if (Spotify.connected()) {
          el.innerHTML = `<div class="sp-acct">${SPOTIFY_ICON}<span>Conectado como <b>${esc((sp.user || {}).name || 'tu cuenta')}</b> · ${sp.playlists.length} playlists</span>
            <button class="link-btn" id="spSync">↻ Actualizar</button><button class="link-btn" id="spOut">Desconectar</button></div>`;
          $('#spSync', el).onclick = async () => {
            $('#spSync', el).textContent = 'Actualizando…';
            try { await Spotify.syncPlaylists(); toast('Playlists actualizadas'); } catch (e) { toast('No se pudo actualizar: ' + e.message, 4000); }
            acct(); list();
          };
          $('#spOut', el).onclick = () => { Spotify.disconnect(); acct(); list(); };
          return;
        }
        el.innerHTML = `<div class="sp-connect">
          <div class="sp-connect-head">${SPOTIFY_ICON}<b>Conecta tu cuenta para ver todas tus playlists</b></div>
          <ol class="small">
            <li>Abre <button class="link-btn" id="spDev">developer.spotify.com/dashboard ↗</button> e inicia sesión con tu cuenta de Spotify.</li>
            <li><b>Create app</b> → nombre "Luis OS" → en <b>Redirect URIs</b> pon <code>${SP_REDIRECT}</code> <button class="link-btn" id="spCopy">copiar</button> → marca <b>Web API</b> → <b>Save</b>.</li>
            <li>Copia el <b>Client ID</b> de la app y pégalo aquí:</li></ol>
          <div class="row"><input id="spCid" value="${esc(sp.clientId || '')}" placeholder="Client ID (32 caracteres)" autocomplete="off"><button class="btn primary" id="spLogin">Conectar</button></div>
          ${Platform.spotifyAuth ? (Platform.kind === 'ios' ? '<p class="muted small">En el iPhone/iPad: en la misma app de Spotify Developer añade también esta Redirect URI (puedes tener la de la PC y esta a la vez).</p>' : SP_WEB ? '<p class="muted small">En el iPhone/iPad: en la misma app de Spotify Developer añade también esta Redirect URI (puedes tener la de la PC y esta a la vez). Tras aceptar, vuelves aquí solo.</p>' : '') : '<p class="muted small">Aquí no se puede iniciar sesión: hazlo desde la app instalada.</p>'}
        </div>`;
        $('#spDev', el).onclick = () => Platform.openExternal('https://developer.spotify.com/dashboard');
        $('#spCopy', el).onclick = async () => {
          try { await navigator.clipboard.writeText(SP_REDIRECT); toast('Copiado'); } catch (e) { toast(SP_REDIRECT); }
        };
        $('#spLogin', el).onclick = async () => {
          sp.clientId = $('#spCid', el).value.trim();
          save();
          const b = $('#spLogin', el);
          b.disabled = true; b.textContent = 'Abriendo…';
          const ok = await Spotify.login();
          if (!document.body.contains(w)) return;
          b.disabled = false; b.textContent = 'Conectar';
          if (ok) { acct(); list(); }
        };
      };
      const list = () => {
        const term = q.value.trim().toLowerCase();
        const match = it => !term || `${it.name} ${it.by || ''}`.toLowerCase().includes(term);
        const mine = sp.playlists.filter(match);
        const saved = (sp.saved || []).filter(match);
        const presets = SPOTIFY_PRESETS.filter(match).map(p => ({ ...p, emoji: p.name.split(' ')[0], name: p.name.slice(p.name.indexOf(' ') + 1), by: 'Spotify' }));
        let html = '';
        if (mine.length) html += `<h4>Tus playlists</h4>${mine.map(it => spItemHTML(it)).join('')}`;
        if (saved.length) html += `<h4>Guardadas a mano</h4>${saved.map((it, i) => spItemHTML({ ...it, emoji: '🔗' }, `<span class="sp-del" data-del="${i}" title="Quitar">✕</span>`)).join('')}`;
        if (presets.length) html += `<h4>Para concentrarte</h4>${presets.map(it => spItemHTML(it)).join('')}`;
        if (term && Spotify.connected()) {
          html += Spotify.results.length ? `<h4>En todo Spotify</h4>${Spotify.results.map(it => spItemHTML(it)).join('')}`
            : `<button class="btn ghost full" id="spAll">🔎 Buscar «${esc(q.value.trim())}» en todo Spotify</button>`;
        }
        if (!html) html = `<p class="muted">No encontré nada con «${esc(q.value.trim())}».${Spotify.connected() ? '' : ' Conecta tu cuenta para ver todas tus playlists o añádela con su enlace abajo.'}</p>`;
        const el = $('#spList', w);
        el.innerHTML = html;
        $$('.sp-item', el).forEach(b => b.onclick = e => {
          if (e.target.closest('[data-del]')) return;
          pick(b.dataset.url);
        });
        $$('[data-del]', el).forEach(x => x.onclick = () => {
          const it = saved[+x.dataset.del];
          sp.saved = sp.saved.filter(s => s !== it); save(); list();
        });
        const all = $('#spAll', el);
        if (all) all.onclick = searchAll;
      };
      const searchAll = async () => {
        const term = q.value.trim();
        if (!term || !Spotify.connected()) return;
        const b = $('#spAll', w);
        if (b) { b.disabled = true; b.textContent = 'Buscando…'; }
        try { Spotify.results = await Spotify.search(term); if (!Spotify.results.length) toast('Sin resultados en Spotify'); }
        catch (e) { toast('No se pudo buscar: ' + e.message, 4000); }
        if (document.body.contains(w)) list();
      };
      w._enter = searchAll;
      q.oninput = () => { Spotify.results = []; list(); };
      $('#spAdd', w).onclick = () => {
        const url = $('#spUrl', w).value.trim();
        if (!spotifyEmbed(url)) { toast('Ese enlace no parece de Spotify'); return; }
        const it = { name: $('#spName', w).value.trim() || 'Mi playlist', url };
        sp.saved = [it, ...(sp.saved || []).filter(s => s.url !== url)];
        pick(url);
      };
      acct(); list();
      if (Spotify.connected() && Date.now() - (sp.syncedAt || 0) > 6 * 36e5) Spotify.syncPlaylists().then(() => { if (document.body.contains(w)) { acct(); list(); } }).catch(() => {});
    },
    // Enter en el buscador busca en todo Spotify en vez de cerrar la ventana.
    onOk(w) { if (w._enter && document.activeElement === $('#spQ', w)) w._enter(); return false; }
  });
}
