// Portadas e ilustraciones generadas en SVG (no necesitan internet).
const COVERS = {
  bosque: 'Bosque nocturno',
  synth: 'Synthwave',
  aurora: 'Aurora',
  code: 'Código'
};

function seeded(seed) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

function mountains(rand, baseY, amp, step, w) {
  let d = `M0 ${baseY}`;
  for (let x = 0; x <= w; x += step) d += ` L${x} ${baseY - rand() * amp}`;
  return d + ` L${w} 400 L0 400 Z`;
}

function pines(rand, count, y0, hMin, hMax, color, w) {
  let out = '';
  for (let i = 0; i < count; i++) {
    const x = rand() * w, h = hMin + rand() * (hMax - hMin), bw = h * 0.28, y = y0 + rand() * 18;
    out += `<path d="M${x} ${y - h} L${x - bw} ${y} L${x + bw} ${y} Z" fill="${color}"/>`;
    out += `<path d="M${x} ${y - h * 1.12} L${x - bw * .7} ${y - h * .45} L${x + bw * .7} ${y - h * .45} Z" fill="${color}"/>`;
  }
  return out;
}

function coverSVG(name) {
  const W = 1600, H = 400;
  const rand = seeded(7);
  let stars = '';
  for (let i = 0; i < 90; i++) stars += `<circle cx="${rand() * W}" cy="${rand() * 210}" r="${rand() * 1.4 + .3}" fill="#fff" opacity="${.3 + rand() * .7}"/>`;

  if (name === 'synth') {
    let grid = '';
    for (let i = -20; i <= 20; i++) grid += `<line x1="${800 + i * 40}" y1="270" x2="${800 + i * 160}" y2="400" stroke="#f472b6" stroke-opacity=".55" stroke-width="1.5"/>`;
    for (let i = 0; i < 8; i++) { const y = 270 + Math.pow(i / 7, 1.8) * 130; grid += `<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="#f472b6" stroke-opacity=".5" stroke-width="1.5"/>`; }
    let stripes = '';
    for (let i = 0; i < 6; i++) stripes += `<rect x="600" y="${190 + i * 14}" width="400" height="${3 + i * 1.3}" fill="#1a0b2e"/>`;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">
      <defs><linearGradient id="sk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0b0420"/><stop offset=".6" stop-color="#3b0d5c"/><stop offset="1" stop-color="#c026d3"/></linearGradient>
      <linearGradient id="sun" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fde047"/><stop offset="1" stop-color="#ec4899"/></linearGradient></defs>
      <rect width="${W}" height="${H}" fill="url(#sk)"/>${stars}
      <circle cx="800" cy="200" r="140" fill="url(#sun)"/>${stripes}
      <path d="${mountains(seeded(3), 270, 70, 60, W)}" fill="#12061f"/>
      <rect y="270" width="${W}" height="130" fill="#12061f"/>${grid}</svg>`;
  }

  if (name === 'aurora') {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">
      <defs><linearGradient id="sk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#020617"/><stop offset="1" stop-color="#0f172a"/></linearGradient>
      <linearGradient id="a1" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#22d3ee" stop-opacity="0"/><stop offset=".4" stop-color="#22d3ee" stop-opacity=".7"/><stop offset=".7" stop-color="#a78bfa" stop-opacity=".6"/><stop offset="1" stop-color="#a78bfa" stop-opacity="0"/></linearGradient>
      <filter id="bl"><feGaussianBlur stdDeviation="26"/></filter></defs>
      <rect width="${W}" height="${H}" fill="url(#sk)"/>${stars}
      <path d="M-50 180 C 300 40, 600 260, 900 120 S 1400 60, 1700 160" stroke="url(#a1)" stroke-width="90" fill="none" filter="url(#bl)"/>
      <path d="M-50 230 C 400 120, 700 300, 1100 170 S 1500 200, 1700 120" stroke="url(#a1)" stroke-width="50" fill="none" filter="url(#bl)" opacity=".7"/>
      <path d="${mountains(seeded(11), 300, 120, 80, W)}" fill="#0b1324"/>
      <path d="${mountains(seeded(5), 340, 60, 50, W)}" fill="#060b16"/>
      ${pines(seeded(9), 60, 392, 30, 80, '#03060d', W)}</svg>`;
  }

  if (name === 'code') {
    const r2 = seeded(21);
    const words = ['public class', 'for (int i = 0;', 'SELECT * FROM', '<?php echo', 'const app =', 'git commit -m', '</div>', 'System.out.println', 'array.length', 'return true;', 'import java.util.*;', 'npm run dev', '$_POST', 'try { } catch', 'new ArrayList<>()'];
    let txt = '';
    for (let i = 0; i < 42; i++) {
      const c = ['#22d3ee', '#a78bfa', '#f472b6', '#34d399', '#64748b'][Math.floor(r2() * 5)];
      txt += `<text x="${r2() * W}" y="${20 + r2() * 380}" fill="${c}" opacity="${.15 + r2() * .45}" font-family="Consolas, monospace" font-size="${12 + r2() * 14}">${esc(words[Math.floor(r2() * words.length)])}</text>`;
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">
      <defs><radialGradient id="g" cx=".7" cy=".3" r=".9"><stop offset="0" stop-color="#312e81"/><stop offset="1" stop-color="#050509"/></radialGradient></defs>
      <rect width="${W}" height="${H}" fill="url(#g)"/>${txt}</svg>`;
  }

  // Bosque nocturno con lago (inspirado en la portada de "My Academic OS").
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">
    <defs><linearGradient id="sk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0c1630"/><stop offset=".55" stop-color="#2b3a67"/><stop offset="1" stop-color="#f3a46b"/></linearGradient>
    <linearGradient id="lk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2b3a67"/><stop offset="1" stop-color="#0c1630"/></linearGradient>
    <linearGradient id="snow" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e8eefc"/><stop offset=".5" stop-color="#7d8fbf"/><stop offset="1" stop-color="#3a4a7a"/></linearGradient>
    <filter id="mist"><feGaussianBlur stdDeviation="14"/></filter></defs>
    <rect width="${W}" height="${H}" fill="url(#sk)"/>${stars}
    <circle cx="1240" cy="90" r="34" fill="#fff4d6" opacity=".95"/><circle cx="1240" cy="90" r="70" fill="#fff4d6" opacity=".12"/>
    <path d="M150 300 L520 70 L640 150 L760 40 L1020 250 L1200 150 L1500 300 Z" fill="url(#snow)"/>
    <path d="${mountains(seeded(17), 300, 90, 70, W)}" fill="#24305a"/>
    <ellipse cx="800" cy="292" rx="900" ry="26" fill="#cbd5f5" opacity=".18" filter="url(#mist)"/>
    <rect y="300" width="${W}" height="100" fill="url(#lk)"/>
    <ellipse cx="1240" cy="335" rx="12" ry="50" fill="#fff4d6" opacity=".18" filter="url(#mist)"/>
    ${pines(seeded(4), 40, 306, 50, 140, '#101a33', W)}
    ${pines(seeded(8), 26, 400, 120, 230, '#070c1c', W)}
    <path d="M0 360 C 300 330, 500 400, 800 380 S 1300 350, 1600 390 L1600 400 L0 400 Z" fill="#070c1c"/></svg>`;
}

function coverURL(name) { return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(coverSVG(name)); }

// Ilustración de las tarjetas del archivero: degradado del color de la carpeta con líneas de "código".
function cardArtSVG(color, seed) {
  const r = seeded(seed || 1);
  let lines = '';
  for (let i = 0; i < 9; i++) {
    const indent = Math.floor(r() * 3) * 22, w = 60 + r() * 160;
    lines += `<rect x="${24 + indent}" y="${18 + i * 15}" width="${w}" height="6" rx="3" fill="#fff" opacity="${.08 + r() * .14}"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 160" preserveAspectRatio="xMidYMid slice">
    <defs><linearGradient id="c" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${color}" stop-opacity=".95"/><stop offset="1" stop-color="#0d0d12"/></linearGradient></defs>
    <rect width="320" height="160" fill="url(#c)"/>${lines}
    <circle cx="270" cy="30" r="60" fill="#fff" opacity=".06"/></svg>`;
}
function cardArtURL(color, seed) { return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(cardArtSVG(color, seed)); }
function hashStr(s) { let h = 7; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) % 2147483646; return h + 1; }
