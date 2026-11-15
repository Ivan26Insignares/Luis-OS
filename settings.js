// Ajustes: perfil, materias, avisos y copias de seguridad.
VIEWS.settings = {
  render(main) {
    const s = state.settings;
    const desk = Platform.kind === 'desktop';
    main.innerHTML = `<div class="page narrow">
      <div class="view-head"><div><h1>⚙️ Ajustes</h1><p class="muted">Todo se guarda solo en ${desk ? 'tu PC' : 'este teléfono'}.</p></div></div>

      <section class="card-sec"><h3>👤 Perfil</h3>
        <div class="row2"><label>Nombre<input id="sName" value="${esc(state.profile.name)}"></label>
        <label>Título de la página<input id="sTitle" value="${esc(state.profile.title)}"></label></div>
        <label>Programa / curso<input id="sProg" value="${esc(state.profile.program)}"></label></section>

      <section class="card-sec"><h3>🎨 Materias</h3>
        <p class="muted small">Se usan en tareas, apuntes y en el calendario.</p>
        <div id="subjList" class="subj-list">${state.subjects.map((x, i) => `<div class="subj-row">
          <input type="color" value="${x.color}" data-sc="${i}"><input value="${esc(x.name)}" data-sn="${i}"><button class="mini-btn" data-sd="${i}" title="Quitar">✕</button></div>`).join('')}</div>
        <button class="btn ghost sm" id="subjAdd">＋ Añadir materia</button></section>

      <section class="card-sec"><h3>🔔 Avisos</h3>
        <label class="check"><input type="checkbox" id="sRem" ${s.reminders ? 'checked' : ''}> Avisarme de entregas (24 h y 3 h antes), eventos (1 día antes y el mismo día) y partidos que sigo</label>
        ${desk ? `<label class="check"><input type="checkbox" id="sLogin" ${s.openAtLogin ? 'checked' : ''}> Abrir Luis OS al encender el PC (en segundo plano, junto al reloj)</label>` : ''}
        <button class="btn ghost sm" id="sTest">Probar notificación</button></section>

      <section class="card-sec"><h3>🔒 PIN de acceso</h3>
        <p class="muted small">Se pide al abrir la app. Es un bloqueo de privacidad: tus datos siguen guardados sin cifrar en ${desk ? 'tu PC' : 'el teléfono'}.</p>
        <label>Volver a pedirlo tras estar fuera de la app<select id="sLockAfter">${[[0, 'Siempre'], [1, '1 minuto'], [5, '5 minutos'], [15, '15 minutos'], [60, '1 hora'], [-1, 'Solo al abrir la app']].map(([v, n]) => `<option value="${v}" ${state.security.lockAfter === v ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
        <div class="row wrap"><button class="btn" id="sPin">🔑 Cambiar PIN</button><button class="btn ghost" id="sLockNow">🔒 Bloquear ahora</button></div></section>

      <section class="card-sec"><h3>💾 Mis datos</h3>
        <p class="muted small">${desk ? 'Se hace una copia automática cada día (se guardan 14).' : 'Los datos viven dentro de la app del teléfono.'}
        Para pasar tus apuntes y tareas entre el PC y el celular: <b>Exportar copia</b> en uno y <b>Restaurar copia</b> en el otro (por ejemplo enviándote el archivo por WhatsApp, Drive o correo).</p>
        <div class="row wrap"><button class="btn" id="dExport">⬆ Exportar copia</button><button class="btn" id="dImport">⬇ Restaurar copia</button>
        ${desk ? '<button class="btn ghost" id="dFolder">📂 Abrir carpeta de datos</button>' : ''}
        ${desk ? '<button class="btn ghost" id="dRescan">🔎 Volver a buscar mis carpetas</button>' : ''}</div></section>

      <p class="muted small center">Luis OS 1.0 · hecho con 💙 para Luis</p></div>`;

    const bind = (id, fn) => { const el = $(id); if (el) el.onchange = fn; };
    bind('#sName', e => { state.profile.name = e.target.value.trim() || 'Luis'; save(); });
    bind('#sTitle', e => { state.profile.title = e.target.value.trim() || 'My Dev OS'; save(); });
    bind('#sProg', e => { state.profile.program = e.target.value.trim(); save(); });
    bind('#sRem', e => { s.reminders = e.target.checked; save(); checkReminders(); });
    bind('#sLogin', async e => { s.openAtLogin = await Platform.setLoginItem(e.target.checked); save(); });
    bind('#sLockAfter', e => { state.security.lockAfter = +e.target.value; save(); });
    $('#sPin').onclick = changePin;
    $('#sLockNow').onclick = () => Lock.show();
    $('#sTest').onclick = () => Platform.notify('👋 Hola, Luis', 'Así se verán tus avisos de entregas y del pomodoro.');

    $$('[data-sc]', main).forEach(inp => inp.onchange = () => { state.subjects[+inp.dataset.sc].color = inp.value; save(); });
    $$('[data-sn]', main).forEach(inp => inp.onchange = () => {
      const sub = state.subjects[+inp.dataset.sn];
      const old = sub.name, nu = inp.value.trim();
      if (!nu) { inp.value = old; return; }
      sub.name = nu;
      for (const t of state.tasks) if (t.subject === old) t.subject = nu;
      for (const n of state.notes) if (n.subject === old) n.subject = nu;
      save();
    });
    $$('[data-sd]', main).forEach(b => b.onclick = () => { state.subjects.splice(+b.dataset.sd, 1); save(); rerender(); });
    $('#subjAdd').onclick = () => { state.subjects.push({ name: 'Nueva materia', color: SUBJECT_COLORS[state.subjects.length % SUBJECT_COLORS.length] }); save(); rerender(); };

    $('#dExport').onclick = async () => { flushSave(); if (await Platform.exportData(serialize())) toast('Copia guardada ✓'); };
    $('#dImport').onclick = async () => {
      const raw = await Platform.importData();
      if (!raw) return;
      let data;
      try { data = JSON.parse(raw); } catch (e) { toast('Ese archivo no es una copia válida'); return; }
      if (!data || !data.version || !Array.isArray(data.tasks)) { toast('Ese archivo no es una copia de Luis OS'); return; }
      if (await confirmBox('Restaurar copia', `Se reemplazará lo que hay ahora por la copia (${data.notes?.length || 0} apuntes, ${data.tasks.length} tareas).`, 'Restaurar')) {
        state = migrate(data);
        if (Platform.kind === 'desktop') state.settings.foldersChecked = false;
        save(true);
        await autoDetectFolders();
        go('home');
        toast('Copia restaurada ✓');
      }
    };
    const df = $('#dFolder'); if (df) df.onclick = () => Platform.openDataFolder();
    const rs = $('#dRescan'); if (rs) rs.onclick = async () => { state.settings.foldersChecked = false; for (const k in folderStatus) delete folderStatus[k]; await autoDetectFolders(); toast('Listo, revisé tus carpetas'); };
  }
};
