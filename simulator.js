// סימולטור מצלמה וירטואלית: חשיפה, תנועה, עומק שדה, רעש ומדידת אור.
// הכל מצויר בקנבס, בלי תמונות חיצוניות.

const W = 800, H = 500;

export const SHUTTERS = [1/4000, 1/2000, 1/1000, 1/500, 1/250, 1/125, 1/60, 1/30, 1/15, 1/8, 1/4, 1/2, 1, 2, 4, 8, 15, 30];
export const APERTURES = [1.8, 2.8, 4, 5.6, 8, 11, 16, 22];
export const ISOS = [100, 200, 400, 800, 1600, 3200, 6400, 12800];
export const FOCALS = [18, 35, 50, 85, 135, 200];
const ND_STOPS = 6;

const SHUT_DISPLAY = [1/4000,1/3200,1/2500,1/2000,1/1600,1/1250,1/1000,1/800,1/640,1/500,1/400,1/320,1/250,1/200,1/160,1/125,1/100,1/80,1/60,1/50,1/40,1/30,1/25,1/20,1/15,1/13,1/10,1/8,1/6,1/5,1/4,1/3,1/2.5,1/2,1/1.6,1/1.3,1,1.3,1.6,2,2.5,3.2,4,5,6,8,10,13,15,20,25,30];
const AP_DISPLAY = [1.8,2,2.2,2.5,2.8,3.2,3.5,4,4.5,5,5.6,6.3,7.1,8,9,10,11,13,14,16,18,20,22];

export const SCENES = {
  park:     { name: `כלב בפארק`,    icon: '🐕', bgEV: 15, subjEV: 15, subject: 'dog',    speed: 700, bg: 'park',   bgDist: 1.0, desc: `יום שמש. הכלב רץ מהר.` },
  portrait: { name: `פורטרט בגינה`, icon: '🌿', bgEV: 13, subjEV: 13, subject: 'person', speed: 0,   bg: 'garden', bgDist: 1.3, desc: `צל פתוח בגינה, שיחים ופרחים מאחור.` },
  backlit:  { name: `אור אחורי`,    icon: '🌤️', bgEV: 15, subjEV: 12, subject: 'person', speed: 0,   bg: 'bright', bgDist: 1.0, desc: `המצולמת עומדת בצל, הרחוב מאחוריה מוצף שמש.` },
  night:    { name: `רחוב בלילה`,   icon: '🌃', bgEV: 5,  subjEV: 5,  subject: 'car',    speed: 450, bg: 'night',  bgDist: 1.0, desc: `לילה בעיר. מכונית חולפת.` }
};

const METERING = {
  evaluative: { name: `ממוצעת`,   w: 0.3 },
  center:     { name: `מרכז`,     w: 0.6 },
  partial:    { name: `חלקית`,    w: 0.8 },
  spot:       { name: `נקודתית`,  w: 1.0 }
};

const MODES = {
  P:  { name: `P`,  long: `Program – המצלמה קובעת תריס וצמצם` },
  Tv: { name: `Tv/S`, long: `עדיפות תריס – אתם בוחרים תריס` },
  Av: { name: `Av/A`, long: `עדיפות צמצם – אתם בוחרים צמצם` },
  M:  { name: `M`,  long: `ידני – אתם קובעים הכל` }
};

export const CHALLENGES = [
  { id: 'c-meter0', scene: 'park', lessonOnly: true, init: { mode: 'M', si: 7 }, title: `סמן על 0`, desc: `במצב M, חשיפה נכונה.`, hint: `עברו ל-M ושנו תריס, צמצם או ISO עד שהסמן על 0.`,
    check: r => r.mode === 'M' && Math.abs(r.subjOff) <= 0.5 },
  { id: 'c-recip', scene: 'park', lessonOnly: true, init: { mode: 'M', si: 3 }, title: `חוק הגומלין`, desc: `במצב M, צמצם f/4 וחשיפה נכונה.`, hint: `קבעו f/4, ואז קצרו את התריס עד שהסמן חוזר ל-0.`,
    check: r => r.mode === 'M' && Math.abs(r.N - 4) < 0.01 && Math.abs(r.subjOff) <= 0.5 },
  { id: 'c-freeze', scene: 'park', title: `להקפיא את הכלב`, desc: `כלב חד ומוקפא, בחשיפה נכונה.`, hint: `עדיפות תריס (Tv/S) ותריס ‎1/1000 או מהיר יותר.`,
    check: r => r.t <= 1/1000 + 1e-9 && Math.abs(r.subjOff) <= 0.7 && !r.shake },
  { id: 'c-landscape', scene: 'park', title: `הכל חד`, desc: `עדשה רחבה וחדות מהקדמה עד העצים.`, hint: `אורך מוקד 35 מ״מ ומטה, צמצם f/8 ומעלה.`,
    check: r => r.N >= 8 - 1e-6 && r.focal <= 35 && Math.abs(r.bgOff) <= 0.7 && !r.shake },
  { id: 'c-motion', scene: 'park', title: `למרוח תנועה באור יום`, desc: `כלב מרוח בתנועה, רקע חד, חשיפה נכונה.`, hint: `צריך תריס איטי באור חזק: חצובה + פילטר ND + צמצם סגור.`,
    check: r => r.L >= 60 && r.tripod && Math.abs(r.subjOff) <= 0.7 },
  { id: 'c-bokeh', scene: 'portrait', title: `רקע רך ומטושטש`, desc: `פורטרט עם בוקה ופנים בחשיפה נכונה.`, hint: `צמצם f/2.8 או פתוח יותר, ואורך מוקד 85 מ״מ ומעלה.`,
    check: r => r.N <= 2.8 + 1e-6 && r.focal >= 85 && Math.abs(r.subjOff) <= 0.7 && !r.shake },
  { id: 'c-backlit', scene: 'backlit', title: `להציל את הפנים`, desc: `פנים מוארות נכון למרות האור האחורי.`, hint: `מדידה נקודתית, פיצוי חשיפה חיובי, או מצב M.`,
    check: r => Math.abs(r.subjOff) <= 0.5 && !r.shake },
  { id: 'c-night-clean', scene: 'night', title: `לילה נקי`, desc: `חשיפה נכונה ב-ISO‏ 400 ומטה.`, hint: `בלי ISO גבוה צריך תריס איטי – ולכן חצובה.`,
    check: r => r.tripod && r.iso <= 400 && Math.abs(r.bgOff) <= 0.7 },
  { id: 'c-trails', scene: 'night', title: `פסי אור`, desc: `חשיפה של 2 שניות ומעלה, עם פסי אור של המכונית.`, hint: `חצובה, תריס 2 שניות ומעלה, צמצם סגור ו-ISO נמוך.`,
    check: r => r.tripod && r.t >= 2 - 1e-6 && Math.abs(r.bgOff) <= 1 },
  { id: 'c-handheld', scene: 'night', title: `לילה ביד`, desc: `בלי חצובה, בלי רעד, בחשיפה נכונה.`, hint: `תריס לפחות ‎1 חלקי אורך המוקד, צמצם פתוח – ו-ISO גבוה.`,
    check: r => !r.tripod && !r.shake && Math.abs(r.bgOff) <= 0.7 }
];

// ---------- חישובי חשיפה ----------
const log2 = Math.log2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export function computeExposure(s) {
  const sc = SCENES[s.scene];
  const iso = ISOS[s.ii];
  const focal = FOCALS[s.fi];
  const nd = s.nd ? ND_STOPS : 0;
  const isoTerm = log2(iso / 100);
  const w = METERING[s.metering].w;
  const metered = w * sc.subjEV + (1 - w) * sc.bgEV;
  const target = metered - nd - (s.mode === 'M' ? 0 : s.comp);
  const need = target + isoTerm; // log2(N²/t)
  let t = SHUTTERS[s.si], N = APERTURES[s.ai];
  let warn = null;

  if (s.mode === 'Av') {
    t = N * N / Math.pow(2, need);
    if (t < 1/4000) { t = 1/4000; warn = 'shutter'; }
    if (t > 30) { t = 30; warn = 'shutter'; }
  } else if (s.mode === 'Tv') {
    N = Math.sqrt(Math.pow(2, need) * t);
    if (N < 1.8) { N = 1.8; warn = 'aperture'; }
    if (N > 22) { N = 22; warn = 'aperture'; }
  } else if (s.mode === 'P') {
    const AV = clamp(1.7 + (need - 6) * 0.5, log2(1.8 * 1.8), log2(22 * 22));
    N = Math.sqrt(Math.pow(2, AV));
    t = 1 / Math.pow(2, need - AV);
    if (t < 1/4000) { t = 1/4000; warn = 'shutter'; }
    if (t > 30) { t = 30; warn = 'shutter'; }
  }
  const evSet = log2(N * N / t) - isoTerm;
  const subjOff = (sc.subjEV - nd) - evSet;
  const bgOff = (sc.bgEV - nd) - evSet;
  const meterOff = (metered - nd) - evSet;
  const z = Math.pow(focal / 50, 0.55);
  const shake = !s.tripod && t * focal > 1.0001;
  const L = Math.min(sc.speed * t * z, W * 3);
  const blurPx = clamp(6 * Math.pow(focal / 50, 1.3) * (2.8 / N) * sc.bgDist, 0, 60);
  return { mode: s.mode, t, N, iso, focal, nd: s.nd, tripod: s.tripod, subjOff, bgOff, meterOff, z, shake, L, blurPx, warn, metered };
}

export function fmtShutter(t) {
  let best = SHUT_DISPLAY[0];
  for (const v of SHUT_DISPLAY) if (Math.abs(log2(v / t)) < Math.abs(log2(best / t))) best = v;
  if (best < 0.99) { const d = 1 / best; return '1/' + (d < 3 ? +d.toFixed(1) : Math.round(d)); }
  return (Math.round(best * 10) / 10) + '″';
}
export function fmtAperture(n) {
  let best = AP_DISPLAY[0];
  for (const v of AP_DISPLAY) if (Math.abs(v - n) < Math.abs(best - n)) best = v;
  return 'f/' + best;
}

// ---------- ציור ----------
function rng(seed) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function circle(ctx, x, y, r, color) { ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
function pick(r, arr) { return arr[Math.floor(r() * arr.length)]; }

function drawBackground(ctx, type, z) {
  const hl = []; // נקודות אור לבוקה
  const cx = W / 2, cy = type === 'garden' ? 280 : 330;
  ctx.save();
  ctx.translate(cx, cy); ctx.scale(z, z); ctx.translate(-cx, -cy);
  const r = rng(type.length * 977);
  const X0 = -400, X1 = 1200, Y0 = -300, Y1 = 900; // מרווח לזום-אאוט

  if (type === 'park') {
    let g = ctx.createLinearGradient(0, 0, 0, 300);
    g.addColorStop(0, '#5fa6df'); g.addColorStop(1, '#cbe5f6');
    ctx.fillStyle = g; ctx.fillRect(X0, Y0, X1 - X0, 300 - Y0);
    for (let i = 0; i < 7; i++) { const x = X0 + r() * (X1 - X0), y = 40 + r() * 120; ctx.globalAlpha = 0.85; for (let j = 0; j < 4; j++) circle(ctx, x + j * 28, y + (j % 2) * 8, 24 + r() * 14, '#f4f8fb'); ctx.globalAlpha = 1; }
    ctx.fillStyle = '#86a97c'; ctx.beginPath(); ctx.moveTo(X0, 290);
    for (let x = X0; x <= X1; x += 80) ctx.lineTo(x, 240 + Math.sin(x / 140) * 22);
    ctx.lineTo(X1, 300); ctx.lineTo(X0, 300); ctx.fill();
    for (let i = 0; i < 70; i++) { const x = X0 + r() * (X1 - X0), y = 255 + r() * 45; circle(ctx, x, y, 22 + r() * 26, pick(r, ['#3d6d38', '#4b8042', '#5a9150', '#36612f'])); }
    for (let i = 0; i < 18; i++) { const x = X0 + r() * (X1 - X0), y = 245 + r() * 40; circle(ctx, x, y, 2.5, '#fff8dc'); hl.push([x, y, '#fff6d0']); }
    g = ctx.createLinearGradient(0, 295, 0, 520);
    g.addColorStop(0, '#86c160'); g.addColorStop(1, '#4b8a35');
    ctx.fillStyle = g; ctx.fillRect(X0, 295, X1 - X0, Y1 - 295);
    for (let i = 0; i < 260; i++) { const x = X0 + r() * (X1 - X0), y = 300 + r() * 520; ctx.strokeStyle = pick(r, ['#5f9c43', '#79b257', '#3f7a2e']); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (r() - 0.5) * 6, y - 8 - r() * 8); ctx.stroke(); }
    for (let i = 0; i < 70; i++) { const x = X0 + r() * (X1 - X0), y = 310 + r() * 500; circle(ctx, x, y, 3 + r() * 2, pick(r, ['#ffe35a', '#ffffff', '#f6a5c0'])); }
  }

  if (type === 'garden') {
    let g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#355f30'); g.addColorStop(1, '#22422a');
    ctx.fillStyle = g; ctx.fillRect(X0, Y0, X1 - X0, Y1 - Y0);
    for (let i = 0; i < 380; i++) circle(ctx, X0 + r() * (X1 - X0), Y0 + r() * (Y1 - Y0), 10 + r() * 30, pick(r, ['#3f7b3a', '#4f8f45', '#2b5a2a', '#68a553', '#335f2f']));
    for (let i = 0; i < 110; i++) circle(ctx, X0 + r() * (X1 - X0), Y0 + r() * (Y1 - Y0), 6 + r() * 9, pick(r, ['#e48fb4', '#c55a8f', '#f2cf4a', '#f3eeee', '#b98ae0']));
    for (let i = 0; i < 70; i++) { const x = X0 + r() * (X1 - X0), y = Y0 + r() * (Y1 - Y0); circle(ctx, x, y, 3, '#fff7da'); hl.push([x, y, pick(r, ['#fff3c4', '#ffe0ef', '#e7ffd6'])]); }
  }

  if (type === 'bright') {
    let g = ctx.createLinearGradient(0, 0, 0, 340);
    g.addColorStop(0, '#a9d4fb'); g.addColorStop(1, '#eef7ff');
    ctx.fillStyle = g; ctx.fillRect(X0, Y0, X1 - X0, 340 - Y0);
    let x = X0;
    while (x < X1) {
      const w = 90 + r() * 120, h = 140 + r() * 160, top = 330 - h;
      ctx.fillStyle = pick(r, ['#f3dfb6', '#ead2a4', '#f7ead0', '#efd9c0']); ctx.fillRect(x, top, w, h + 10);
      ctx.fillStyle = '#c9ae86';
      for (let wy = top + 18; wy < 310; wy += 38) for (let wx = x + 14; wx < x + w - 24; wx += 32) ctx.fillRect(wx, wy, 16, 22);
      x += w + 6;
    }
    g = ctx.createLinearGradient(0, 330, 0, 600);
    g.addColorStop(0, '#f1e6cf'); g.addColorStop(1, '#ddcfb4');
    ctx.fillStyle = g; ctx.fillRect(X0, 330, X1 - X0, Y1 - 330);
    for (let i = 0; i < 14; i++) { const hx = X0 + r() * (X1 - X0), hy = 120 + r() * 200; circle(ctx, hx, hy, 2.5, '#ffffff'); hl.push([hx, hy, '#ffffff']); }
  }

  if (type === 'night') {
    let g = ctx.createLinearGradient(0, 0, 0, 330);
    g.addColorStop(0, '#060d22'); g.addColorStop(1, '#1d2b52');
    ctx.fillStyle = g; ctx.fillRect(X0, Y0, X1 - X0, 330 - Y0);
    let x = X0;
    while (x < X1) {
      const w = 70 + r() * 110, h = 110 + r() * 170, top = 335 - h;
      ctx.fillStyle = pick(r, ['#141a29', '#1b2236', '#10151f']); ctx.fillRect(x, top, w, h);
      for (let wy = top + 12; wy < 320; wy += 24) for (let wx = x + 10; wx < x + w - 14; wx += 20) {
        if (r() < 0.4) { const c = pick(r, ['#f7c66b', '#ffd98f', '#bfe0ff']); ctx.fillStyle = c; ctx.fillRect(wx, wy, 10, 13); if (r() < 0.25) hl.push([wx + 5, wy + 6, c]); }
      }
      x += w + 4;
    }
    ctx.fillStyle = '#1c1f2b'; ctx.fillRect(X0, 330, X1 - X0, Y1 - 330);
    ctx.fillStyle = '#2b2f3d'; ctx.fillRect(X0, 330, X1 - X0, 22);
    ctx.fillStyle = '#b9b79e';
    for (let lx = X0; lx < X1; lx += 90) ctx.fillRect(lx, 468, 46, 5);
    for (const px of [110, 400, 690]) {
      ctx.strokeStyle = '#2d3349'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(px, 340); ctx.lineTo(px, 170); ctx.lineTo(px + 26, 165); ctx.stroke();
      const rg = ctx.createRadialGradient(px + 26, 172, 2, px + 26, 172, 60);
      rg.addColorStop(0, 'rgba(255,226,160,0.95)'); rg.addColorStop(0.2, 'rgba(255,210,130,0.45)'); rg.addColorStop(1, 'rgba(255,200,120,0)');
      ctx.fillStyle = rg; ctx.fillRect(px - 40, 105, 140, 140);
      circle(ctx, px + 26, 172, 7, '#fff3cf'); hl.push([px + 26, 172, '#ffe7b0']);
      const pool = ctx.createRadialGradient(px + 26, 350, 4, px + 26, 350, 90);
      pool.addColorStop(0, 'rgba(255,214,140,0.28)'); pool.addColorStop(1, 'rgba(255,214,140,0)');
      ctx.fillStyle = pool; ctx.fillRect(px - 70, 330, 200, 80);
    }
  }
  ctx.restore();
  return hl.map(([x, y, c]) => [cx + (x - cx) * z, cy + (y - cy) * z, c]);
}

function drawSubject(ctx, type, z, sceneId) {
  const cx = W / 2;
  ctx.save();
  if (type === 'dog') {
    ctx.translate(cx, 420 + (z - 1) * 30); ctx.scale(z, z);
    ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.beginPath(); ctx.ellipse(0, 0, 72, 9, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#6b4423'; ctx.lineWidth = 10; ctx.lineCap = 'round';
    for (const [x1, y1, x2, y2] of [[-38, -42, -66, -6], [-28, -40, -40, -2], [34, -44, 14, -4], [42, -44, 68, -10]]) { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
    ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(50, -60); ctx.quadraticCurveTo(75, -66, 88, -86); ctx.stroke();
    ctx.fillStyle = '#ad6c30'; ctx.beginPath(); ctx.ellipse(0, -52, 58, 23, -0.05, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#c98a4e'; ctx.beginPath(); ctx.ellipse(-30, -44, 22, 13, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ad6c30'; ctx.beginPath(); ctx.ellipse(-50, -66, 14, 20, 0.6, 0, Math.PI * 2); ctx.fill();
    circle(ctx, -66, -80, 21, '#ad6c30');
    ctx.fillStyle = '#8f5726'; ctx.beginPath(); ctx.ellipse(-85, -73, 14, 9, 0, 0, Math.PI * 2); ctx.fill();
    circle(ctx, -97, -76, 4.5, '#1d1d1d');
    ctx.fillStyle = '#6b4423'; ctx.beginPath(); ctx.ellipse(-56, -95, 8, 16, 0.5, 0, Math.PI * 2); ctx.fill();
    circle(ctx, -72, -85, 3.4, '#161616'); circle(ctx, -71, -86, 1, '#ffffff');
    ctx.strokeStyle = '#d63c3c'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(-50, -84); ctx.lineTo(-42, -62); ctx.stroke();
  }
  if (type === 'person') {
    const shirt = sceneId === 'backlit' ? '#c4524d' : '#3d6fb5';
    ctx.translate(cx, H - 40 + (z - 1) * 150); ctx.scale(z, z);
    ctx.fillStyle = shirt; ctx.beginPath(); ctx.moveTo(-170, 120); ctx.lineTo(-138, -95);
    ctx.quadraticCurveTo(-120, -125, -60, -128); ctx.lineTo(60, -128); ctx.quadraticCurveTo(120, -125, 138, -95); ctx.lineTo(170, 120); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#cf9572'; ctx.fillRect(-23, -165, 46, 45);
    ctx.fillStyle = '#e8eef5'; ctx.beginPath(); ctx.moveTo(-30, -128); ctx.lineTo(0, -98); ctx.lineTo(30, -128); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#3b2a1f'; ctx.beginPath(); ctx.ellipse(0, -232, 64, 66, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillRect(-64, -232, 128, 70);
    ctx.fillStyle = '#e2ae8c';
    ctx.beginPath(); ctx.ellipse(-52, -208, 9, 14, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(52, -208, 9, 14, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(0, -210, 50, 60, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#3b2a1f'; ctx.beginPath(); ctx.ellipse(-8, -262, 54, 22, -0.25, 0, Math.PI * 2); ctx.fill();
    circle(ctx, -19, -214, 5, '#2a1d17'); circle(ctx, 19, -214, 5, '#2a1d17');
    circle(ctx, -17, -216, 1.5, '#fff'); circle(ctx, 21, -216, 1.5, '#fff');
    ctx.strokeStyle = '#5a3d2d'; ctx.lineWidth = 3.5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-30, -230); ctx.lineTo(-10, -232); ctx.moveTo(10, -232); ctx.lineTo(30, -230); ctx.stroke();
    ctx.strokeStyle = '#a5524a'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, -190, 16, 0.18 * Math.PI, 0.82 * Math.PI); ctx.stroke();
    ctx.fillStyle = 'rgba(214,120,110,0.25)'; circle(ctx, -30, -195, 10, 'rgba(214,120,110,0.22)'); circle(ctx, 30, -195, 10, 'rgba(214,120,110,0.22)');
  }
  if (type === 'car') {
    ctx.translate(cx, 440 + (z - 1) * 40); ctx.scale(z, z);
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(0, 4, 120, 9, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#a33636'; ctx.beginPath(); ctx.moveTo(-60, -55); ctx.lineTo(-35, -88); ctx.lineTo(42, -88); ctx.lineTo(72, -55); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#7fa0c8'; ctx.beginPath(); ctx.moveTo(-50, -57); ctx.lineTo(-31, -82); ctx.lineTo(2, -82); ctx.lineTo(2, -57); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(8, -57); ctx.lineTo(8, -82); ctx.lineTo(39, -82); ctx.lineTo(62, -57); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#c24141'; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-115, -58, 230, 44, 12) : ctx.rect(-115, -58, 230, 44); ctx.fill();
    for (const wx of [-66, 66]) { circle(ctx, wx, -12, 19, '#121212'); circle(ctx, wx, -12, 8, '#8a8f99'); }
    circle(ctx, -110, -40, 7, '#fffbe6'); circle(ctx, 111, -42, 6, '#ff4040');
  }
  ctx.restore();
}

function makeLUT(off) {
  const g = Math.pow(2, off);
  const lut = new Uint8ClampedArray(256);
  for (let v = 0; v < 256; v++) {
    const lin = Math.pow(v / 255, 2.2) * g;
    lut[v] = lin >= 1 ? 255 : Math.round(Math.pow(lin, 1 / 2.2) * 255);
  }
  return lut;
}
function applyLUT(ctx, lut) {
  const img = ctx.getImageData(0, 0, W, H), d = img.data;
  for (let i = 0; i < d.length; i += 4) { d[i] = lut[d[i]]; d[i + 1] = lut[d[i + 1]]; d[i + 2] = lut[d[i + 2]]; }
  ctx.putImageData(img, 0, 0);
}
function mk() { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; }

let NOISE = null;
function noiseTable() {
  if (NOISE) return NOISE;
  NOISE = new Float32Array(1 << 18);
  for (let i = 0; i < NOISE.length; i++) NOISE[i] = (Math.random() + Math.random() + Math.random() - 1.5) * 1.15;
  return NOISE;
}

export function renderFrame(out, s, r, histCanvas) {
  const sc = SCENES[s.scene];
  const octx = out.getContext('2d', { willReadFrequently: true });
  const bg = mk(), bctx = bg.getContext('2d', { willReadFrequently: true });
  let hl;
  const canFilter = typeof bctx.filter === 'string';

  // עומק שדה: בדפדפנים שתומכים – פילטר טשטוש אמיתי; אחרת הקטנה והגדלה חוזרת
  if (r.blurPx > 0.6 && canFilter) {
    const pad = Math.ceil(r.blurPx * 1.5) + 4;
    const pc = document.createElement('canvas'); pc.width = W + pad * 2; pc.height = H + pad * 2;
    const pctx = pc.getContext('2d'); pctx.translate(pad, pad);
    hl = drawBackground(pctx, sc.bg, r.z);
    bctx.filter = `blur(${(r.blurPx * 0.45).toFixed(2)}px)`;
    bctx.drawImage(pc, -pad, -pad);
    bctx.filter = 'none';
  } else {
    hl = drawBackground(bctx, sc.bg, r.z);
  }
  if (r.blurPx > 0.6 && !canFilter) {
    const f = 1 / (1 + r.blurPx * 0.55);
    const sw = Math.max(4, Math.round(W * f)), sh = Math.max(3, Math.round(H * f));
    const small = document.createElement('canvas'); small.width = sw; small.height = sh;
    const sctx = small.getContext('2d'); sctx.imageSmoothingQuality = 'high'; sctx.drawImage(bg, 0, 0, sw, sh);
    const mid = document.createElement('canvas'); mid.width = Math.min(W, sw * 3); mid.height = Math.min(H, sh * 3);
    const mctx = mid.getContext('2d'); mctx.imageSmoothingQuality = 'high'; mctx.drawImage(small, 0, 0, mid.width, mid.height);
    bctx.clearRect(0, 0, W, H); bctx.imageSmoothingQuality = 'high'; bctx.drawImage(mid, 0, 0, W, H);
  }
  {
    if (r.blurPx > 3) {
      const rad = Math.min(r.blurPx * 0.9, 46);
      for (const [x, y, c] of hl) {
        if (x < -rad || x > W + rad || y < -rad || y > H + rad) continue;
        bctx.globalAlpha = clamp(0.25 + r.blurPx / 80, 0.25, 0.6);
        circle(bctx, x, y, rad, c);
        bctx.globalAlpha = clamp(0.15 + r.blurPx / 120, 0.15, 0.4);
        bctx.strokeStyle = c; bctx.lineWidth = 1.5; bctx.beginPath(); bctx.arc(x, y, rad, 0, Math.PI * 2); bctx.stroke();
      }
      bctx.globalAlpha = 1;
    }
  }
  applyLUT(bctx, makeLUT(r.bgOff));

  const subj = mk(), sctx2 = subj.getContext('2d', { willReadFrequently: true });
  drawSubject(sctx2, sc.subject, r.z, s.scene);
  applyLUT(sctx2, makeLUT(r.subjOff));

  octx.globalAlpha = 1;
  octx.clearRect(0, 0, W, H);
  const k = r.L > 1.5 ? Math.min(40, Math.ceil(r.L / 3) + 1) : 1;
  if (k === 1) {
    octx.drawImage(bg, 0, 0); octx.drawImage(subj, 0, 0);
  } else {
    const fr = mk(), fctx = fr.getContext('2d');
    for (let i = 0; i < k; i++) {
      const dx = -r.L / 2 + (r.L * i) / (k - 1);
      fctx.clearRect(0, 0, W, H); fctx.drawImage(bg, 0, 0); fctx.drawImage(subj, dx, 0);
      octx.globalAlpha = 1 / (i + 1); octx.drawImage(fr, 0, 0);
    }
    octx.globalAlpha = 1;
    if (sc.subject === 'car' && r.L > 20) {
      const a = clamp(0.95 + r.subjOff * 0.18, 0.15, 1);
      const gy = 440 + (r.z - 1) * 40;
      octx.lineCap = 'round';
      for (const [ox, oy, col, lw] of [[-110, -40, '#fff6d8', 7], [111, -42, '#ff4a4a', 6]]) {
        octx.globalAlpha = a; octx.strokeStyle = col; octx.lineWidth = lw * r.z;
        octx.beginPath(); octx.moveTo(W / 2 + ox * r.z - r.L / 2, gy + oy * r.z); octx.lineTo(W / 2 + ox * r.z + r.L / 2, gy + oy * r.z); octx.stroke();
      }
      octx.globalAlpha = 1;
    }
  }

  // רעד מצלמה
  if (r.shake) {
    const S = clamp((log2(r.t * r.focal) + 1) * 4, 2, 32);
    const snap = mk(); snap.getContext('2d').drawImage(out, 0, 0);
    const n = 9;
    octx.clearRect(0, 0, W, H);
    for (let i = 0; i < n; i++) {
      const p = i / (n - 1);
      const dx = Math.sin(p * 5.1) * S * 0.7, dy = (p - 0.5) * S + Math.cos(p * 3.7) * S * 0.25;
      octx.globalAlpha = 1 / (i + 1); octx.drawImage(snap, dx, dy);
    }
    octx.globalAlpha = 1;
  }

  // רעש + היסטוגרמה
  const img = octx.getImageData(0, 0, W, H), d = img.data;
  const sigma = 1.5 + log2(r.iso / 100) * 3.3;
  const nt = noiseTable(), mask = nt.length - 1;
  let o = Math.floor(Math.random() * nt.length);
  const hist = new Uint32Array(64);
  for (let i = 0; i < d.length; i += 4) {
    const lum = (d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11) / 255;
    const amp = sigma * (1.25 - lum * 0.6);
    const n0 = nt[(o++) & mask] * amp;
    const ch = sigma > 8 ? 0.45 : 0.15;
    d[i] = d[i] + n0 + nt[(o += 7) & mask] * amp * ch;
    d[i + 1] = d[i + 1] + n0;
    d[i + 2] = d[i + 2] + n0 + nt[(o += 13) & mask] * amp * ch;
    hist[Math.min(63, (d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11) >> 2)]++;
  }
  octx.putImageData(img, 0, 0);

  if (histCanvas) {
    const hc = histCanvas.getContext('2d'), hw = histCanvas.width, hh = histCanvas.height;
    hc.clearRect(0, 0, hw, hh);
    let max = 0; for (let i = 1; i < 63; i++) max = Math.max(max, hist[i]);
    max = Math.max(max, 1);
    const style = getComputedStyle(histCanvas);
    hc.fillStyle = style.getPropertyValue('--hist').trim() || '#888';
    const bw = hw / 64;
    // ציר ההיסטוגרמה תמיד משמאל (שחור) לימין (לבן), כמו במצלמה
    for (let i = 0; i < 64; i++) { const v = Math.min(1, hist[i] / max); hc.fillRect(i * bw, hh - v * hh, bw + 0.5, v * hh); }
    hc.fillStyle = style.getPropertyValue('--warn').trim() || '#e5483b';
    const total = W * H;
    if (hist[63] / total > 0.02) hc.fillRect(hw - 4, 0, 4, hh);
    if (hist[0] / total > 0.02) hc.fillRect(0, 0, 4, hh);
  }
}

// ---------- ממשק ----------
export function feedback(s, r) {
  const msgs = [];
  const sc = SCENES[s.scene];
  const off = sc.subject === 'car' ? r.bgOff : r.subjOff;
  const fmt = v => Math.abs(v).toFixed(1).replace('.0', '');
  if (off > 0.7) msgs.push(['bad', `התמונה בהירה מדי בכ-${fmt(off)} סטופ (חשיפת יתר).`]);
  else if (off < -0.7) msgs.push(['bad', `התמונה כהה מדי בכ-${fmt(off)} סטופ (חשיפת חסר).`]);
  else msgs.push(['good', `החשיפה של הנושא טובה.`]);
  if (s.scene === 'backlit' && Math.abs(r.bgOff - r.subjOff) > 0.1 && r.subjOff > -0.5 && r.subjOff < 0.5) msgs.push(['info', `הרקע יצא בהיר מאוד – זה המחיר של חשיפה נכונה לפנים. זו החלטה של צלם.`]);
  if (r.warn === 'shutter') msgs.push(['bad', `המצלמה לא הצליחה למצוא מהירות תריס מתאימה – הערך מהבהב. שנו ISO או צמצם.`]);
  if (r.warn === 'aperture') msgs.push(['bad', `המצלמה לא הצליחה למצוא צמצם מתאים – הערך מהבהב. שנו ISO או תריס${r.nd ? '' : ' (או הוסיפו פילטר ND)'}.`]);
  if (r.shake) msgs.push(['bad', `רעד מצלמה: בתריס ${fmtShutter(r.t)} עם ${r.focal} מ״מ צריך חצובה, או תריס של לפחות 1/${r.focal}.`]);
  if (sc.speed > 0 && r.L > 6) msgs.push([s.scene === 'night' ? 'info' : 'info', sc.subject === 'dog' ? `הכלב מרוח בתנועה. להקפאה צריך תריס מהיר יותר.` : `המכונית מרוחה ומשאירה פסי אור.`]);
  if (sc.speed > 0 && r.L <= 6) msgs.push(['good', `התנועה מוקפאת.`]);
  if (r.iso >= 3200) msgs.push(['info', `ISO ${r.iso}: שימו לב לרעש בצללים.`]);
  if (r.blurPx > 12) msgs.push(['info', `עומק שדה רדוד: הרקע מטושטש.`]);
  else if (r.blurPx < 1.5 && s.scene !== 'night') msgs.push(['info', `עומק שדה רחב: כמעט הכל חד.`]);
  return msgs;
}

export function mountSimulator(root, opts = {}) {
  const s = {
    scene: opts.scene && SCENES[opts.scene] ? opts.scene : 'park',
    mode: 'Av', metering: 'evaluative', comp: 0,
    si: 4, ai: 4, ii: 0, fi: 2, tripod: false, nd: false
  };
  const done = opts.done || new Set();
  const only = opts.challenge ? CHALLENGES.find(c => c.id === opts.challenge) : null;
  if (only) { s.scene = only.scene; if (only.init) Object.assign(s, only.init); }

  root.innerHTML = `
  <div class="sim ${only ? 'sim-compact' : ''}">
    <div class="sim-view">
      <div class="vf-block">
      <div class="viewfinder">
        <canvas width="${W}" height="${H}" class="sim-canvas" role="img" aria-label="תצוגה מקדימה של התמונה"></canvas>
        <div class="vf-overlay" aria-hidden="true"><span class="af-point"></span><span class="spot-circle"></span><span class="grid"></span></div>
      </div>
      <div class="lcd" aria-live="polite">
        <span class="lcd-mode"></span>
        <span class="lcd-val lcd-t"></span>
        <span class="lcd-val lcd-f"></span>
        <span class="lcd-val lcd-iso"></span>
        <span class="meter" aria-label="מד-אור">
          <span class="meter-scale"><i>-3</i><i>-2</i><i>-1</i><i>0</i><i>+1</i><i>+2</i><i>+3</i></span>
          <span class="meter-mark"></span>
        </span>
      </div>
      </div>
      <div class="sim-feedback"></div>
      <div class="hist-wrap">
        <span class="hist-label">היסטוגרמה</span>
        <canvas class="hist" width="256" height="70" aria-label="היסטוגרמה"></canvas>
        <div class="hist-axis"><span>שחור</span><span>לבן</span></div>
      </div>
    </div>
    <div class="sim-controls">
      <fieldset class="ctl scene-ctl" ${only ? 'hidden' : ''}>
        <legend>סצנה</legend>
        <div class="chips scene-chips"></div>
        <p class="scene-desc muted"></p>
      </fieldset>
      <fieldset class="ctl">
        <legend>חוגת מצבים</legend>
        <div class="dial mode-dial"></div>
        <p class="mode-desc muted"></p>
      </fieldset>
      <div class="ctl sliders">
        <label class="slider"><span>מהירות תריס <b class="v-t"></b></span><input type="range" class="r-t" min="0" max="${SHUTTERS.length - 1}" step="1" dir="ltr"></label>
        <label class="slider"><span>צמצם <b class="v-f"></b></span><input type="range" class="r-f" min="0" max="${APERTURES.length - 1}" step="1" dir="ltr"></label>
        <label class="slider"><span>ISO <b class="v-iso"></b></span><input type="range" class="r-iso" min="0" max="${ISOS.length - 1}" step="1" dir="ltr"></label>
        <label class="slider"><span>פיצוי חשיפה <b class="v-comp"></b></span><input type="range" class="r-comp" min="-3" max="3" step="0.5" dir="ltr"></label>
        <label class="slider"><span>אורך מוקד <b class="v-fl"></b></span><input type="range" class="r-fl" min="0" max="${FOCALS.length - 1}" step="1" dir="ltr"></label>
      </div>
      <fieldset class="ctl">
        <legend>מדידת אור</legend>
        <div class="chips meter-chips"></div>
      </fieldset>
      <div class="ctl toggles">
        <label class="toggle"><input type="checkbox" class="t-tripod"> <span>חצובה</span></label>
        <label class="toggle"><input type="checkbox" class="t-nd"> <span>פילטר ND (‏6 סטופים)</span></label>
        <button type="button" class="btn ghost reset">איפוס הגדרות</button>
      </div>
    </div>
    <section class="challenges">
      <h3>${only ? 'המשימה' : 'אתגרים בסצנה הזו'}</h3>
      <ul class="ch-list"></ul>
    </section>
  </div>`;

  const $ = sel => root.querySelector(sel);
  const canvas = $('.sim-canvas'), hist = $('.hist');
  const rT = $('.r-t'), rF = $('.r-f'), rI = $('.r-iso'), rC = $('.r-comp'), rFL = $('.r-fl');

  $('.scene-chips').innerHTML = Object.entries(SCENES).map(([id, sc]) => `<button type="button" class="chip" data-scene="${id}"><span aria-hidden="true">${sc.icon}</span> ${sc.name}</button>`).join('');
  $('.mode-dial').innerHTML = Object.entries(MODES).map(([id, m]) => `<button type="button" class="dial-btn" data-mode="${id}" aria-label="${m.long}">${m.name}</button>`).join('');
  $('.meter-chips').innerHTML = Object.entries(METERING).map(([id, m]) => `<button type="button" class="chip" data-meter="${id}">${m.name}</button>`).join('');

  let raf = 0, lastResult = null, solvedNow = false;
  function schedule() { cancelAnimationFrame(raf); raf = requestAnimationFrame(update); }

  function update() {
    const r = computeExposure(s);
    lastResult = r;
    // ממשק
    root.querySelectorAll('[data-scene]').forEach(b => b.setAttribute('aria-pressed', b.dataset.scene === s.scene));
    root.querySelectorAll('[data-mode]').forEach(b => b.setAttribute('aria-pressed', b.dataset.mode === s.mode));
    root.querySelectorAll('[data-meter]').forEach(b => b.setAttribute('aria-pressed', b.dataset.meter === s.metering));
    $('.scene-desc').textContent = SCENES[s.scene].desc;
    $('.mode-desc').textContent = MODES[s.mode].long;
    rT.value = s.si; rF.value = s.ai; rI.value = s.ii; rC.value = s.comp; rFL.value = s.fi;
    rT.disabled = s.mode === 'P' || s.mode === 'Av';
    rF.disabled = s.mode === 'P' || s.mode === 'Tv';
    rC.disabled = s.mode === 'M';
    const tLabel = fmtShutter(r.t), fLabel = fmtAperture(r.N);
    $('.v-t').innerHTML = `<bdi dir="ltr">${tLabel}</bdi>` + (rT.disabled ? ' (אוטומטי)' : '');
    $('.v-f').innerHTML = `<bdi dir="ltr">${fLabel}</bdi>` + (rF.disabled ? ' (אוטומטי)' : '');
    $('.v-iso').textContent = r.iso;
    $('.v-comp').innerHTML = s.mode === 'M' ? 'לא פעיל ב-M' : `<bdi dir="ltr">${(s.comp > 0 ? '+' : '') + s.comp}</bdi>`;
    $('.v-fl').textContent = r.focal + ' מ״מ';
    $('.t-tripod').checked = s.tripod; $('.t-nd').checked = s.nd;
    $('.lcd-mode').textContent = MODES[s.mode].name;
    const lt = $('.lcd-t'), lf = $('.lcd-f');
    lt.textContent = tLabel; lf.textContent = fLabel; $('.lcd-iso').textContent = 'ISO ' + r.iso;
    lt.classList.toggle('blink', r.warn === 'shutter'); lf.classList.toggle('blink', r.warn === 'aperture');
    const m = clamp(r.meterOff, -3.4, 3.4);
    const mark = $('.meter-mark');
    mark.style.setProperty('--pos', ((m + 3.5) / 7 * 100) + '%');
    mark.classList.toggle('over', Math.abs(r.meterOff) > 3);
    root.querySelector('.viewfinder').classList.toggle('spot', s.metering === 'spot');
    $('.sim-feedback').innerHTML = feedback(s, r).map(([k, t]) => `<p class="fb ${k}">${t}</p>`).join('');
    renderFrame(canvas, s, r, hist);
    // אתגרים
    const list = only ? [only] : CHALLENGES.filter(c => c.scene === s.scene && !c.lessonOnly);
    for (const c of list) {
      if (c.check(r)) {
        if (!done.has(c.id)) { done.add(c.id); opts.onComplete && opts.onComplete(c.id); }
        if (only && !solvedNow) { solvedNow = true; opts.onSolved && opts.onSolved(c.id); }
      }
    }
    $('.ch-list').innerHTML = list.map(c => `
      <li class="ch ${done.has(c.id) ? 'done' : ''}">
        <span class="ch-state" aria-hidden="true">${done.has(c.id) ? '✓' : ''}</span>
        <div><b>${c.title}</b><span class="muted"> – ${c.desc}</span>
        ${done.has(c.id) ? `<span class="sr">הושלם</span>` : `<details><summary>רמז</summary><p>${c.hint}</p></details>`}</div>
      </li>`).join('');
  }

  root.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.scene) { s.scene = b.dataset.scene; schedule(); }
    else if (b.dataset.mode) {
      // במעבר ל-M או למצב עדיפות, נשמור על הערכים שהמצלמה חישבה כדי לא ״לקפוץ״
      if (lastResult) {
        const nearest = (arr, v, f) => arr.reduce((bi, x, i) => Math.abs(f(x) - f(v)) < Math.abs(f(arr[bi]) - f(v)) ? i : bi, 0);
        s.si = nearest(SHUTTERS, lastResult.t, Math.log2);
        s.ai = nearest(APERTURES, lastResult.N, Math.log2);
      }
      s.mode = b.dataset.mode; schedule();
    }
    else if (b.dataset.meter) { s.metering = b.dataset.meter; schedule(); }
    else if (b.classList.contains('reset')) { Object.assign(s, { mode: 'Av', metering: 'evaluative', comp: 0, si: 4, ai: 4, ii: 0, fi: 2, tripod: false, nd: false }); schedule(); }
  });
  rT.addEventListener('input', () => { s.si = +rT.value; schedule(); });
  rF.addEventListener('input', () => { s.ai = +rF.value; schedule(); });
  rI.addEventListener('input', () => { s.ii = +rI.value; schedule(); });
  rC.addEventListener('input', () => { s.comp = +rC.value; schedule(); });
  rFL.addEventListener('input', () => { s.fi = +rFL.value; schedule(); });
  $('.t-tripod').addEventListener('change', e => { s.tripod = e.target.checked; schedule(); });
  $('.t-nd').addEventListener('change', e => { s.nd = e.target.checked; schedule(); });

  schedule();
  return () => cancelAnimationFrame(raf);
}
