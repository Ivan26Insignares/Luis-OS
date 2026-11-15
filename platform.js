// Adaptador de plataforma: la misma interfaz corre en Windows (Electron), como app nativa de iPhone/iPad (Capacitor) y en el navegador.
const Platform = (() => {
  const d = window.desktop;
  const a = window.AndroidBridge;
  const LS_KEY = 'luisos-datos';

  const lsLoad = () => { try { return localStorage.getItem(LS_KEY); } catch (e) { return null; } };
  const lsSave = json => { try { localStorage.setItem(LS_KEY, json); } catch (e) { /* sin espacio */ } };

  function downloadFile(name, text) {
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = Object.assign(document.createElement('a'), { href: url, download: name });
    document.body.appendChild(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return true;
  }

  function downloadDataURL(name, url) {
    const link = Object.assign(document.createElement('a'), { href: url, download: name });
    document.body.appendChild(link); link.click(); link.remove();
    return true;
  }

  function pickTextFile(accept) {
    return new Promise(resolve => {
      const input = Object.assign(document.createElement('input'), { type: 'file', accept: typeof accept === 'string' ? accept : '.json,application/json,text/plain,*/*' });
      input.onchange = () => {
        const f = input.files[0];
        if (!f) return resolve(null);
        const r = new FileReader();
        r.onload = () => resolve(String(r.result));
        r.onerror = () => resolve(null);
        r.readAsText(f);
      };
      input.click();
    });
  }

  if (d) {
    return {
      kind: 'desktop',
      canOpenFolders: true,
      load: () => d.load(),
      save: json => d.save(json),
      saveSync: json => d.saveSync(json),
      exportData: json => d.exportData(json),
      importData: () => d.importData(),
      openDataFolder: () => d.openDataFolder(),
      notify: (t, b, view) => d.notify(t, b, view),
      openExternal: url => d.openExternal(url),
      setLoginItem: v => d.setLoginItem(v),
      onFlush: cb => d.onFlush(cb),
      onGoto: cb => d.onGoto(cb),
      saveImage: downloadDataURL,
      pickText: pickTextFile,
      http: req => d.http(req),
      spotifyAuth: (url, redirect) => d.spotifyAuth(url, redirect),
      folders: d
    };
  }

  const backupName = () => `LuisOS-copia-${new Date().toISOString().slice(0, 10)}.json`;

  if (a) {
    return {
      kind: 'android',
      canOpenFolders: false,
      load: async () => a.load() || lsLoad(),
      save: async json => { a.save(json); return true; },
      saveSync: json => { a.save(json); return true; },
      exportData: async json => { a.saveText(backupName(), 'application/json', json); return true; },
      importData: pickTextFile,
      openDataFolder: null,
      notify: async (t, b) => { try { a.notify(t, b); } catch (e) { /* versión vieja */ } },
      openExternal: url => a.openExternal(url),
      setLoginItem: null,
      onFlush: cb => window.addEventListener('pagehide', cb),
      onGoto: () => {},
      pickText: pickTextFile,
      http: req => new Promise(resolve => {
        const id = 'h' + Math.random().toString(36).slice(2);
        window.__httpCbs = window.__httpCbs || {};
        window.__httpCbs[id] = resolve;
        a.httpFetch(id, req.url, req.method || 'GET', JSON.stringify(req.headers || {}), req.body || '');
      }),
      // En Android el inicio de sesión ocurre dentro de la app; al volver, start() termina el proceso.
      spotifyAuth: url => { location.href = url; return new Promise(() => {}); },
      // Avisos programados en el sistema: llegan aunque la app esté cerrada.
      scheduleReminders: typeof a.scheduleReminders === 'function' ? json => { try { a.scheduleReminders(json); return true; } catch (e) { return false; } } : null,
      saveImage: (name, url) => { a.saveBase64(name, 'image/png', url.split(',')[1]); return true; },
      folders: null
    };
  }

  // App nativa de iPhone/iPad (Capacitor).
  const cap = window.Capacitor && typeof window.Capacitor.isNativePlatform === 'function' && window.Capacitor.isNativePlatform() ? window.Capacitor : null;
  if (cap) {
    const P = n => cap.registerPlugin(n);
    const FS = P('Filesystem'), Browser = P('Browser'), CapApp = P('App'), LN = P('LocalNotifications'), Share = P('Share');
    const FILE = { path: 'luisos-datos.json', directory: 'LIBRARY', encoding: 'utf8' };
    const writeFile = json => FS.writeFile({ ...FILE, data: json, recursive: true });
    let notifOk = null;
    const askNotif = async () => {
      if (notifOk !== null) return notifOk;
      try { const r = await LN.requestPermissions(); notifOk = r.display === 'granted'; } catch (e) { notifOk = false; }
      return notifOk;
    };
    const shareFile = async (name, data, b64) => {
      const r = await FS.writeFile({ path: name, data, directory: 'CACHE', ...(b64 ? {} : { encoding: 'utf8' }) });
      await Share.share({ title: name, url: r.uri, dialogTitle: 'Guardar copia' });
      return true;
    };
    const gotoCbs = [];
    try { LN.addListener('localNotificationActionPerformed', a => { const v = a && a.notification && a.notification.extra && a.notification.extra.view; if (v) gotoCbs.forEach(cb => cb(v)); }); } catch (e) { /* sin avisos */ }
    return {
      kind: 'ios',
      canOpenFolders: false,
      load: async () => { try { const r = await FS.readFile(FILE); if (r && r.data) return r.data; } catch (e) { /* primera vez */ } return lsLoad(); },
      save: async json => { lsSave(json); await writeFile(json); return true; },
      saveSync: json => { lsSave(json); writeFile(json).catch(() => {}); return true; },
      exportData: json => shareFile(backupName(), json),
      importData: pickTextFile,
      openDataFolder: null,
      notify: async (t, b, view) => {
        if (!await askNotif()) return;
        await LN.schedule({ notifications: [{ id: Math.floor(Math.random() * 2e9), title: t, body: b, extra: { view: view || '' } }] });
      },
      // Avisos del calendario y de partidos programados en iOS: llegan aunque la app esté cerrada.
      scheduleReminders: json => {
        (async () => {
          if (!await askNotif()) return;
          const pend = await LN.getPending();
          if (pend.notifications && pend.notifications.length) await LN.cancel({ notifications: pend.notifications.map(n => ({ id: n.id })) });
          const list = JSON.parse(json).slice(0, 60);
          if (list.length) await LN.schedule({ notifications: list.map((r, i) => ({ id: 1000 + i, title: r.title, body: r.body, schedule: { at: new Date(r.at), allowWhileIdle: true } })) });
        })().catch(e => console.error('avisos', e));
        return true;
      },
      openExternal: url => Browser.open({ url }),
      setLoginItem: null,
      onFlush: cb => { window.addEventListener('pagehide', cb); try { CapApp.addListener('pause', cb); } catch (e) { /* */ } },
      onGoto: cb => gotoCbs.push(cb),
      saveImage: (name, url) => shareFile(name, url.split(',')[1], true),
      pickText: pickTextFile,
      // Con CapacitorHttp activado, fetch pasa por el sistema y no hay bloqueos CORS.
      http: async req => { try { const r = await fetch(req.url, { method: req.method || 'GET', headers: req.headers, body: req.body }); return { status: r.status, text: await r.text() }; } catch (e) { return { status: 0, text: String(e) }; } },
      // Login de Spotify: se abre en Safari dentro de la app y vuelve con luisos://callback?code=…
      spotifyAuth: url => new Promise(resolve => {
        let done = false;
        const subs = [];
        const end = v => { if (done) return; done = true; subs.forEach(h => h && h.then ? h.then(x => x.remove()) : h && h.remove && h.remove()); resolve(v); };
        subs.push(CapApp.addListener('appUrlOpen', e => { if (e.url && e.url.startsWith('luisos://callback')) { Browser.close().catch(() => {}); end(e.url); } }));
        subs.push(Browser.addListener('browserFinished', () => setTimeout(() => end(null), 800)));
        Browser.open({ url, presentationStyle: 'popover' });
      }),
      folders: null
    };
  }

  return {
    kind: 'web',
    canOpenFolders: false,
    load: async () => lsLoad(),
    save: async json => { lsSave(json); return true; },
    saveSync: json => { lsSave(json); return true; },
    exportData: async json => downloadFile(backupName(), json),
    importData: pickTextFile,
    openDataFolder: null,
    notify: async (t, b) => {
      if (!('Notification' in window)) return;
      if (Notification.permission === 'default') await Notification.requestPermission();
      if (Notification.permission !== 'granted') return;
      // En iPhone/iPad los avisos solo funcionan con la app añadida a la pantalla de inicio y a través del service worker.
      try {
        const reg = navigator.serviceWorker && await navigator.serviceWorker.getRegistration();
        if (reg) { await reg.showNotification(t, { body: b, icon: 'icon-192.png' }); return; }
      } catch (e) { /* sin service worker */ }
      try { new Notification(t, { body: b }); } catch (e) { /* no soportado */ }
    },
    openExternal: url => window.open(url, '_blank', 'noopener'),
    setLoginItem: null,
    onFlush: cb => window.addEventListener('pagehide', cb),
    onGoto: () => {},
    saveImage: downloadDataURL,
    pickText: pickTextFile,
    http: async req => { try { const r = await fetch(req.url, { method: req.method || 'GET', headers: req.headers, body: req.body }); return { status: r.status, text: await r.text() }; } catch (e) { return { status: 0, text: String(e) }; } },
    spotifyAuth: location.protocol === 'https:' ? url => { location.href = url; return new Promise(() => {}); } : null,
    folders: null
  };
})();

// Versión web instalable (iPhone/iPad): funciona sin internet una vez abierta.
if (Platform.kind === 'web' && 'serviceWorker' in navigator && location.protocol === 'https:') {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}

// Respuesta de las peticiones hechas por Android.
window.__httpDone = (id, status, text) => { const cb = window.__httpCbs && window.__httpCbs[id]; if (cb) { delete window.__httpCbs[id]; cb({ status, text }); } };

async function httpJSON(url, opts = {}) {
  const r = await Platform.http({ url, ...opts });
  if (!r || r.status < 200 || r.status >= 300) throw new Error(`HTTP ${r ? r.status : 0}: ${(r && r.text || '').slice(0, 120)}`);
  return JSON.parse(r.text);
}
