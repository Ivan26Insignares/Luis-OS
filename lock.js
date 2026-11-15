// PIN de acceso: pantalla de bloqueo al abrir la app y al volver tras un rato fuera.

// SHA-256 en JS puro (síncrono, funciona igual en Windows, Android y navegador).
function sha256(str) {
  const bytes = new TextEncoder().encode(str);
  const K = [0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2];
  const H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
  const l = bytes.length, total = Math.ceil((l + 9) / 64) * 64;
  const m = new Uint8Array(total);
  m.set(bytes); m[l] = 0x80;
  const dv = new DataView(m.buffer);
  dv.setUint32(total - 4, l * 8); dv.setUint32(total - 8, Math.floor(l / 0x20000000));
  const W = new Uint32Array(64);
  const rotr = (x, n) => (x >>> n) | (x << (32 - n));
  for (let o = 0; o < total; o += 64) {
    for (let i = 0; i < 16; i++) W[i] = dv.getUint32(o + i * 4);
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(W[i - 15], 7) ^ rotr(W[i - 15], 18) ^ (W[i - 15] >>> 3);
      const s1 = rotr(W[i - 2], 17) ^ rotr(W[i - 2], 19) ^ (W[i - 2] >>> 10);
      W[i] = (W[i - 16] + s0 + W[i - 7] + s1) >>> 0;
    }
    let [a, b, c, d, e, f, g, h] = H;
    for (let i = 0; i < 64; i++) {
      const t1 = (h + (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + W[i]) >>> 0;
      const t2 = ((rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) >>> 0;
      h = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
    }
    [a, b, c, d, e, f, g, h].forEach((v, i) => { H[i] = (H[i] + v) >>> 0; });
  }
  return H.map(x => x.toString(16).padStart(8, '0')).join('');
}

const pinHash = pin => sha256('luisos:' + pin);

const Lock = {
  el: null, entry: '', fails: 0, until: 0, hiddenAt: 0,
  enabled() { return !!(state.security && state.security.pinHash); },
  show() {
    if (!this.enabled() || this.el) return;
    this.entry = '';
    this.el = document.createElement('div');
    this.el.className = 'lock';
    this.el.innerHTML = `<div class="lock-box">
      <span class="brand-logo big">L</span>
      <h2>Hola, ${esc(state.profile.name)}</h2><p class="muted" id="lockMsg">Introduce tu PIN</p>
      <div class="pin-dots" id="pinDots">${'<i></i>'.repeat(6)}</div>
      <div class="keypad">${[1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0, '⌫'].map(k => k === '' ? '<span></span>' : `<button data-k="${k}">${k}</button>`).join('')}</div></div>`;
    document.body.appendChild(this.el);
    document.body.classList.add('locked');
    $$('[data-k]', this.el).forEach(b => b.onclick = () => this.press(String(b.dataset.k)));
    this.keyHandler = e => {
      if (/^\d$/.test(e.key)) this.press(e.key);
      else if (e.key === 'Backspace') this.press('⌫');
      e.stopPropagation(); e.preventDefault();
    };
    document.addEventListener('keydown', this.keyHandler, true);
  },
  press(k) {
    if (Date.now() < this.until) return;
    if (k === '⌫') this.entry = this.entry.slice(0, -1);
    else if (this.entry.length < 6) this.entry += k;
    $$('#pinDots i', this.el).forEach((d, i) => d.classList.toggle('on', i < this.entry.length));
    if (this.entry.length === 6) setTimeout(() => this.check(), 120);
  },
  check() {
    if (pinHash(this.entry) === state.security.pinHash) { this.fails = 0; this.hide(); return; }
    this.fails++;
    this.entry = '';
    const box = $('.lock-box', this.el);
    box.classList.remove('shake'); void box.offsetWidth; box.classList.add('shake');
    $$('#pinDots i', this.el).forEach(d => d.classList.remove('on'));
    const msg = $('#lockMsg', this.el);
    if (this.fails >= 5) {
      this.until = Date.now() + 30000;
      msg.textContent = 'Demasiados intentos. Espera 30 segundos.';
      setTimeout(() => { if (this.el) msg.textContent = 'Introduce tu PIN'; }, 30000);
    } else msg.textContent = 'PIN incorrecto';
  },
  hide() {
    if (!this.el) return;
    document.removeEventListener('keydown', this.keyHandler, true);
    this.el.classList.add('out');
    const el = this.el;
    this.el = null;
    document.body.classList.remove('locked');
    setTimeout(() => el.remove(), 250);
  },
  init() {
    this.show();
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { this.hiddenAt = Date.now(); return; }
      const mins = state.security.lockAfter;
      if (this.hiddenAt && mins >= 0 && Date.now() - this.hiddenAt >= mins * 60000) this.show();
    });
  }
};

function changePin() {
  modal({
    title: 'Cambiar PIN',
    body: `${Lock.enabled() ? '<label>PIN actual<input type="password" inputmode="numeric" maxlength="6" id="pOld"></label>' : ''}
      <label>PIN nuevo (6 números)<input type="password" inputmode="numeric" maxlength="6" id="pNew"></label>
      <label>Repite el PIN nuevo<input type="password" inputmode="numeric" maxlength="6" id="pRep"></label>`,
    onOk(w) {
      const old = $('#pOld', w);
      if (old && pinHash(old.value) !== state.security.pinHash) { toast('El PIN actual no es correcto'); return false; }
      const n = $('#pNew', w).value;
      if (!/^\d{6}$/.test(n)) { toast('El PIN debe tener 6 números'); return false; }
      if (n !== $('#pRep', w).value) { toast('Los PIN no coinciden'); return false; }
      state.security.pinHash = pinHash(n);
      save(); toast('PIN cambiado ✓');
    }
  });
}
