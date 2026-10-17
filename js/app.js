import { LESSONS } from './data/lessons.js';
import { QUIZZES } from './data/quizzes.js';
import { MISSIONS, GLOSSARY } from './data/extras.js';
import { mountSimulator, CHALLENGES, SCENES } from './simulator.js';

const APP_NAME = 'צילום עם בינה';
const PASS = 0.7, EXAM_PASS = 0.8, EXAM_SIZE = 15;

// ---------- התקדמות (נשמרת רק בדפדפן) ----------
const KEY = 'photo-learning-v1';
const blank = () => ({ name: '', onboarded: false, read: {}, quiz: {}, missions: {}, challenges: {}, review: {}, exam: 0, size: 'm' });
let P = blank();
try { P = Object.assign(blank(), JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { P = blank(); }
function save() { try { localStorage.setItem(KEY, JSON.stringify(P)); } catch (e) { /* אחסון לא זמין */ } }

const qList = id => QUIZZES[id] || [];
const lessonPassed = id => (P.quiz[id] || 0) >= PASS;
const allPassed = () => LESSONS.every(l => lessonPassed(l.id));
const reviewKeys = () => Object.keys(P.review);
const lessonIndex = id => LESSONS.findIndex(l => l.id === id);
function nextLesson() { return LESSONS.find(l => !lessonPassed(l.id)) || null; }

const MAX_XP = LESSONS.length * 50 + MISSIONS.length * 15 + CHALLENGES.length * 25 + 150;
function xp() {
  let x = Object.keys(P.read).length * 10;
  for (const v of Object.values(P.quiz)) x += Math.round(v * 40);
  x += Object.keys(P.missions).length * 15 + Object.keys(P.challenges).length * 25 + Math.round(P.exam * 150);
  return Math.min(x, MAX_XP);
}
const LEVELS = [[0, `מכסה על העדשה`], [0.08, `מסירים את המכסה`], [0.22, `לחיצה ראשונה`], [0.4, `בפוקוס`], [0.6, `שולטים בחשיפה`], [0.8, `צלמים במצב M`], [0.97, `מאסטרים של אור`]];
function level() { const f = xp() / MAX_XP; let l = LEVELS[0][1]; for (const [t, n] of LEVELS) if (f >= t) l = n; return l; }

// ---------- עזרים ----------
const app = document.getElementById('app');
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const hi = () => P.name ? `, ${esc(P.name)}` : '';
const praise = () => shuffle([`נכון`, `מצוין`, `בדיוק`, `כל הכבוד`, `יפה מאוד`])[0] + hi() + '!';

function toast(msg) {
  let box = document.querySelector('.toasts');
  if (!box) { box = document.createElement('div'); box.className = 'toasts'; document.body.appendChild(box); }
  const t = document.createElement('div');
  t.className = 'toast'; t.setAttribute('role', 'status'); t.textContent = msg;
  box.appendChild(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 400); }, 2600);
}

function meterBar(fraction, label) {
  const n = 21, lit = Math.round(fraction * (n - 1));
  let ticks = '';
  for (let i = 0; i < n; i++) ticks += `<i class="${i <= lit && fraction > 0 ? 'on' : ''} ${i % 5 === 0 ? 'major' : ''}"></i>`;
  return `<div class="progress-lcd" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(fraction * 100)}" aria-label="${esc(label)}">
    <div class="ticks">${ticks}</div>
    <div class="lcd-row"><span>${esc(label)}</span><span>${Math.round(fraction * 100)}%</span></div>
  </div>`;
}

function updateReviewBadge() {
  const b = document.querySelector('.nav .badge'), n = reviewKeys().length;
  if (b) { b.textContent = n; b.hidden = n === 0; }
}

// ---------- רכיבי שאלה ----------
// כל רכיב מקבל אלמנט, שאלה ופונקציה done(correct, message) שנקראת אחרי הבדיקה.

function renderChoice(el, q, done) {
  const order = shuffle(q.o.map((t, i) => ({ t, i })));
  el.innerHTML = `<div class="quiz-opts">${order.map((o, k) => `<button type="button" class="opt" data-k="${k}">${o.t}</button>`).join('')}</div>`;
  el.querySelectorAll('.opt').forEach(b => b.addEventListener('click', () => {
    const k = +b.dataset.k, right = order[k].i === q.a;
    el.querySelectorAll('.opt').forEach((x, j) => {
      x.disabled = true;
      if (order[j].i === q.a) x.classList.add('right'); else if (j === k) x.classList.add('wrong');
    });
    done(right, '');
  }));
}

function renderValue(el, q, done) {
  const vals = q.values;
  let start = Math.floor(vals.length / 2);
  if (q.accept.includes(vals[start])) start = vals.findIndex(v => !q.accept.includes(v));
  el.innerHTML = `
    <div class="dial-q" dir="ltr">
      <button type="button" class="dial-step" data-d="-1" aria-label="ערך קודם">‹</button>
      <output class="dial-lcd" aria-live="polite"></output>
      <button type="button" class="dial-step" data-d="1" aria-label="ערך הבא">›</button>
    </div>
    <input type="range" class="dial-range" min="0" max="${vals.length - 1}" step="1" value="${start}" dir="ltr" aria-label="בחירת ערך">
    <div class="row-btns"><button type="button" class="btn check">בדיקה</button></div>`;
  const r = el.querySelector('.dial-range'), out = el.querySelector('.dial-lcd');
  const show = () => { out.textContent = vals[+r.value]; };
  show();
  r.addEventListener('input', show);
  el.querySelectorAll('.dial-step').forEach(b => b.addEventListener('click', () => { r.value = Math.max(0, Math.min(vals.length - 1, +r.value + +b.dataset.d)); show(); }));
  el.querySelector('.check').addEventListener('click', () => {
    const v = vals[+r.value], right = q.accept.includes(v);
    r.disabled = true; el.querySelectorAll('button').forEach(b => b.disabled = true);
    out.classList.add(right ? 'right' : 'wrong');
    const near = !right && q.near && q.near[v];
    const range = q.accept.length > 1 ? `${q.accept[0]} עד ${q.accept[q.accept.length - 1]}` : q.accept[0];
    done(right, right ? '' : (near || `בחרתם ${v}. התשובה: ${range}.`));
  });
}

function renderOrder(el, q, done) {
  let cur = shuffle(q.items);
  for (let tries = 0; tries < 6 && cur.every((x, i) => x === q.items[i]); tries++) cur = shuffle(q.items);
  const draw = focusIdx => {
    el.innerHTML = `<ol class="order-list">${cur.map((t, i) => `
      <li class="order-item">
        <span class="order-text">${t}</span>
        <span class="order-btns">
          <button type="button" class="ob" data-mv="-1" data-i="${i}" aria-label="להזיז למעלה: ${esc(t)}" ${i === 0 ? 'disabled' : ''}>▲</button>
          <button type="button" class="ob" data-mv="1" data-i="${i}" aria-label="להזיז למטה: ${esc(t)}" ${i === cur.length - 1 ? 'disabled' : ''}>▼</button>
        </span>
      </li>`).join('')}</ol>
      <div class="row-btns"><button type="button" class="btn check">בדיקה</button></div>`;
    el.querySelectorAll('.ob').forEach(b => b.addEventListener('click', () => {
      const i = +b.dataset.i, j = i + +b.dataset.mv;
      [cur[i], cur[j]] = [cur[j], cur[i]];
      draw([j, b.dataset.mv]);
    }));
    if (focusIdx) {
      const [j, mv] = focusIdx;
      const t = el.querySelector(`.ob[data-i="${j}"][data-mv="${mv}"]`);
      (t && !t.disabled ? t : el.querySelector(`.ob[data-i="${j}"]:not([disabled])`))?.focus();
    }
    el.querySelector('.check').addEventListener('click', () => {
      let wrongs = 0;
      el.querySelectorAll('.order-item').forEach((li, i) => {
        const ok = cur[i] === q.items[i]; if (!ok) wrongs++;
        li.classList.add(ok ? 'right' : 'wrong');
      });
      el.querySelectorAll('button').forEach(b => b.disabled = true);
      done(wrongs === 0, wrongs ? `${wrongs} פריטים לא במקום. הסדר הנכון: ${q.items.join(' ← ')}.` : '');
    });
  };
  draw();
}

function renderSpot(el, q, done) {
  const W = 300, H = 200;
  let targets;
  if (q.kind === 'horizon') {
    targets = [
      { y: H / 3, ok: true, label: 'השליש העליון' },
      { y: H / 2, ok: false, label: 'האמצע', msg: `באמצע התמונה נחצית לשניים ונראית סטטית.` },
      { y: (2 * H) / 3, ok: false, label: 'השליש התחתון', msg: `ככה השמיים המשעממים תופסים את רוב הפריים.` }
    ];
  } else {
    targets = [];
    for (const y of [H / 3, (2 * H) / 3]) for (const x of [W / 3, (2 * W) / 3]) targets.push({ x, y, ok: true });
    targets.push({ x: W / 2, y: H / 2, ok: false, msg: `באמצע התמונה סטטית. נסו נקודת מפגש של קווי השלישים.` });
    for (const [x, y] of [[W / 2, H / 6], [W / 2, (5 * H) / 6], [W / 9, H / 2], [(8 * W) / 9, H / 2]]) targets.push({ x, y, ok: false, msg: `קרוב מדי לשוליים. נסו נקודת מפגש של קווי השלישים.` });
  }
  const sky = `<rect width="${W}" height="${H}" fill="#9fcdf0"/>`;
  const grid = `<g stroke="rgba(255,255,255,.9)" stroke-width="1.2" stroke-dasharray="4 4">
      <line x1="${W / 3}" y1="0" x2="${W / 3}" y2="${H}"/><line x1="${(2 * W) / 3}" y1="0" x2="${(2 * W) / 3}" y2="${H}"/>
      <line x1="0" y1="${H / 3}" x2="${W}" y2="${H / 3}"/><line x1="0" y1="${(2 * H) / 3}" x2="${W}" y2="${(2 * H) / 3}"/></g>`;
  const field = y => `<rect x="0" y="${y}" width="${W}" height="${H - y}" fill="#6fae4f"/>` +
    Array.from({ length: 24 }, (_, i) => `<circle cx="${(i * 37) % W + 8}" cy="${y + 8 + ((i * 53) % Math.max(8, H - y - 12))}" r="3" fill="${['#ffe35a', '#ffffff', '#f6a5c0'][i % 3]}"/>`).join('');
  const svg = inner => `<svg viewBox="0 0 ${W} ${H}" class="spot-svg" role="group" aria-label="תמונה עם רשת שלישים">${inner}</svg>`;
  const base = q.kind === 'horizon' ? sky + field(H / 2) : sky + field(H - 30);
  const tgt = (t, i) => q.kind === 'horizon'
    ? `<g class="spot-t" data-i="${i}" tabindex="0" role="button" aria-label="אופק ב${t.label}"><rect x="0" y="${t.y - 14}" width="${W}" height="28" fill="transparent"/><line x1="0" y1="${t.y}" x2="${W}" y2="${t.y}" stroke="#fff" stroke-width="3" opacity=".6"/></g>`
    : `<g class="spot-t" data-i="${i}" tabindex="0" role="button" aria-label="נקודה ${i + 1}"><circle cx="${t.x}" cy="${t.y}" r="17" fill="transparent"/><circle cx="${t.x}" cy="${t.y}" r="7" fill="#fff" opacity=".8"/></g>`;
  el.innerHTML = `<div class="spot-wrap">${svg(base + grid + targets.map(tgt).join(''))}</div>`;
  const pick = i => {
    const t = targets[i];
    const chosen = q.kind === 'horizon'
      ? sky + field(t.y) + grid
      : base + grid + `<circle cx="${t.x}" cy="${t.y}" r="15" fill="#f5c430" stroke="#9c7a10" stroke-width="2"/>`;
    el.querySelector('.spot-wrap').innerHTML = svg(chosen);
    done(t.ok, t.ok ? '' : t.msg);
  };
  el.querySelectorAll('.spot-t').forEach(g => {
    g.addEventListener('click', () => pick(+g.dataset.i));
    g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(+g.dataset.i); } });
  });
}

const RENDER = { choice: renderChoice, value: renderValue, order: renderOrder, spot: renderSpot };
const TYPE_LABEL = { choice: 'בחירה', value: 'גלגלת', order: 'סידור', spot: 'לחיצה על התמונה', scenario: 'משימה במצלמה' };

// ---------- מנוע הבוחן – האפליקציה כמורה ----------
// items: [{ q, key, lessonId }] · mode: 'lesson' | 'review' | 'exam'
function runQuiz(el, items, { mode = 'lesson', onFinish } = {}) {
  let idx = 0, score = 0, counted = 0;
  const stops = [];
  const stopAll = () => { while (stops.length) stops.pop()(); };
  const nextLabel = () => idx + 1 < items.length ? 'לשאלה הבאה' : 'לסיכום';

  function card(q, isTwin) {
    return `
      <div class="quiz-card ${isTwin ? 'twin' : ''}">
        <div class="quiz-top"><span>${isTwin ? 'שאלה דומה – עוד ניסיון' : `שאלה ${idx + 1} מתוך ${items.length}`}</span><span>${TYPE_LABEL[q.t || 'choice']}</span></div>
        <h3 class="quiz-q" tabindex="-1">${q.q}</h3>
        <div class="quiz-body"></div>
        <div class="quiz-explain" aria-live="polite"></div>
      </div>`;
  }

  function show() {
    stopAll();
    if (idx >= items.length) return finish();
    const item = items[idx], q = item.q;
    el.innerHTML = card(q, false);
    el.querySelector('.quiz-q').focus({ preventScroll: true });
    el.scrollIntoView({ block: 'nearest' });
    const body = el.querySelector('.quiz-body');
    if (q.t === 'scenario') return scenario(item, body);
    RENDER[q.t || 'choice'](body, q, (right, msg) => afterFirst(item, right, msg));
  }

  function scenario(item, body) {
    const q = item.q;
    body.innerHTML = `<div class="inline-sim"></div><div class="row-btns"><button type="button" class="btn ghost skip">לדלג על המשימה</button></div>`;
    const stop = mountSimulator(body.querySelector('.inline-sim'), {
      challenge: q.challenge, done: new Set(Object.keys(P.challenges)),
      onComplete: id => { P.challenges[id] = 1; save(); },
      onSolved: () => {
        score++; counted++;
        body.querySelector('.skip').hidden = true;
        explain(true, `<b>${praise()}</b> הצלחתם את המשימה.`, [['next', nextLabel()]]);
      }
    });
    stops.push(stop);
    body.querySelector('.skip').addEventListener('click', () => { idx++; show(); });
  }

  function explain(right, html, buttons) {
    const ex = el.querySelector('.quiz-explain');
    ex.innerHTML = `<p class="${right ? 'yes' : 'no'}">${html}</p>
      <div class="row-btns">${buttons.map(([k, t]) => `<button type="button" class="btn ${k === 'section' ? 'ghost' : ''}" data-act="${k}">${t}</button>`).join('')}</div>`;
    ex.querySelectorAll('[data-act]').forEach(b => b.addEventListener('click', () => act(b.dataset.act)));
    const first = ex.querySelector('[data-act]'); if (first) first.focus({ preventScroll: true });
    ex.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  let sectionHref = null;
  function act(a) {
    if (a === 'next') { idx++; show(); }
    else if (a === 'twin') twin();
    else if (a === 'section' && sectionHref) {
      const local = mode === 'lesson' && document.getElementById('sec-' + sectionHref.split('/').pop());
      if (local) { local.scrollIntoView({ behavior: 'smooth' }); local.classList.remove('flash'); void local.offsetWidth; local.classList.add('flash'); }
      else location.hash = sectionHref;
    }
  }

  function solved(item) { if (mode === 'review' && P.review[item.key]) { delete P.review[item.key]; save(); updateReviewBadge(); } }
  function addReview(item) { if (!P.review[item.key]) { P.review[item.key] = 1; save(); updateReviewBadge(); } }

  function afterFirst(item, right, msg) {
    const q = item.q;
    counted++;
    if (right) {
      score++; solved(item);
      return explain(true, `<b>${praise()}</b> ${q.ex}`, [['next', nextLabel()]]);
    }
    const head = `<b>לא בדיוק.</b> ${msg ? esc(msg) + ' ' : ''}${q.ex}`;
    if (mode !== 'exam' && q.twin) return explain(false, head, [['twin', 'לנסות שאלה דומה']]);
    if (mode !== 'exam') addReview(item);
    explain(false, head, [['next', nextLabel()]]);
  }

  function twin() {
    const item = items[idx], parent = item.q;
    const tq = Object.assign({}, parent.twin);
    if (!tq.t) tq.t = parent.t === 'order' ? 'order' : parent.t === 'spot' ? 'spot' : 'choice';
    el.innerHTML = card(tq, true);
    el.querySelector('.quiz-q').focus({ preventScroll: true });
    RENDER[tq.t](el.querySelector('.quiz-body'), tq, (right, msg) => {
      if (right) { solved(item); return explain(true, `<b>עכשיו זה יושב${hi()}!</b> ${tq.ex}`, [['next', nextLabel()]]); }
      addReview(item);
      const l = LESSONS.find(x => x.id === item.lessonId);
      const sec = l && l.sections[parent.sec || 0];
      sectionHref = `#/lesson/${item.lessonId}/${parent.sec || 0}`;
      const hint = sec ? ` כדאי לקרוא שוב את הפסקה ״${sec.h}״.` : '';
      explain(false, `<b>עוד לא.</b> ${msg ? esc(msg) + ' ' : ''}${tq.ex} השאלה נכנסה לרשימת ״כדאי לחזור״.${hint}`,
        [['next', nextLabel()], ...(sec ? [['section', 'לקרוא שוב את הפסקה']] : [])]);
    });
  }

  function finish() {
    stopAll();
    const f = counted ? score / counted : 0;
    let msg;
    if (mode === 'review') msg = reviewKeys().length ? `נשארו ${reviewKeys().length} שאלות לחזרה. אפשר להמשיך עכשיו או בפעם הבאה.` : `ניקיתם את כל רשימת החזרה${hi()}!`;
    else if (mode === 'exam') msg = f >= EXAM_PASS ? `עברת את המבחן${hi()}! התעודה מחכה למטה.` : `צריך ${Math.round(EXAM_PASS * 100)}% כדי לעבור. עברו על ״כדאי לחזור״ ונסו שוב.`;
    else msg = f === 1 ? `מושלם${hi()}! כל התשובות נכונות.` : f >= PASS ? `עברת את השיעור${hi()}!` : `צריך ${Math.round(PASS * 100)}% כדי לעבור. אפשר לקרוא שוב ולנסות – והשאלות הקשות מחכות ב״כדאי לחזור״.`;
    el.innerHTML = `<div class="quiz-card result">
      <p class="big-score">${score}/${counted}</p>
      <p>${msg}</p>
      <div class="row-btns center"><button type="button" class="btn ghost again">${mode === 'review' ? 'לתרגל שוב' : 'לנסות שוב'}</button></div>
    </div>`;
    el.querySelector('.again').addEventListener('click', () => (onFinish && onFinish.again) ? onFinish.again() : runQuiz(el, items, { mode, onFinish }));
    onFinish && onFinish(f, score, counted);
  }

  show();
  return stopAll;
}

const itemsFor = id => qList(id).map((q, i) => ({ q, key: `${id}:${i}`, lessonId: id }));
function itemByKey(k) { const [id, i] = k.split(':'); const q = qList(id)[+i]; return q ? { q, key: k, lessonId: id } : null; }

// ---------- מסכים ----------
function viewWelcome() {
  return `<section class="welcome">
    <h1 tabindex="-1">ברוכים הבאים ל${APP_NAME}</h1>
    <p class="lead">כאן לומדים לצלם צעד אחר צעד: שיעורים קצרים, מצלמה וירטואלית לתרגול, ומשימות לצאת איתן החוצה. האפליקציה בודקת כל תשובה, מסבירה טעויות ומחזירה אותך למה שעוד לא יושב.</p>
    <label class="name-field"><span>איך לקרוא לך?</span>
      <input type="text" id="name-in" maxlength="20" autocomplete="nickname" placeholder="שם פרטי או כינוי"></label>
    <p class="muted small">השם וההתקדמות נשמרים רק במכשיר הזה. שום מידע לא נשלח לשום מקום. מספיק שם פרטי או כינוי.</p>
    <div class="row-btns"><button type="button" class="btn" id="start">להתחיל ללמוד</button><button type="button" class="btn ghost" id="skip-name">להמשיך בלי שם</button></div>
  </section>`;
}

function recommendation() {
  const rk = reviewKeys().length, nl = nextLesson();
  if (rk >= 3) return { href: '#/review', title: `כדאי לחזור על ${rk} שאלות`, sub: `לפני שממשיכים – חיזוק קצר של מה שעוד לא יושב.` };
  if (nl) return { href: `#/lesson/${nl.id}`, title: `${P.read[nl.id] ? 'להמשיך' : 'השיעור הבא'}: ${nl.title}`, sub: nl.summary };
  if (rk) return { href: '#/review', title: `כדאי לחזור על ${rk} שאלות`, sub: `ואחר כך – המבחן המסכם.` };
  if (P.exam < EXAM_PASS) return { href: '#/exam', title: `המבחן המסכם פתוח`, sub: `עברת את כל השיעורים. זה הזמן לתעודה.` };
  return { href: '#/missions', title: `סיימת את הקורס!`, sub: `המשיכו לתרגל במשימות השטח ובמצלמה הווירטואלית.` };
}

function viewHome() {
  if (!P.onboarded) return viewWelcome();
  const doneCount = LESSONS.filter(l => lessonPassed(l.id)).length;
  const rec = recommendation();
  return `
  <section class="hero">
    <div class="hero-text">
      <h1 tabindex="-1">${P.name ? `שלום, ${esc(P.name)}` : `לומדים לצלם`}</h1>
      <p class="lead">מהלחיצה הראשונה ועד מצב ידני – בקצב שלך.</p>
      <a class="rec" href="${rec.href}">
        <span class="rec-label">ההמלצה שלי עכשיו</span>
        <b>${esc(rec.title)}</b>
        <span>${esc(rec.sub)}</span>
      </a>
    </div>
    <div class="hero-panel">
      ${meterBar(xp() / MAX_XP, `הדרגה שלך: ${level()}`)}
      <dl class="stats">
        <div><dt>שיעורים שעברת</dt><dd>${doneCount}/${LESSONS.length}</dd></div>
        <div><dt>אתגרי מצלמה</dt><dd>${Object.keys(P.challenges).length}/${CHALLENGES.length}</dd></div>
        <div><dt>משימות שטח</dt><dd>${Object.keys(P.missions).length}/${MISSIONS.length}</dd></div>
        <div><dt>מבחן</dt><dd>${P.exam ? Math.round(P.exam * 100) + '%' : allPassed() ? 'פתוח' : 'נעול'}</dd></div>
      </dl>
    </div>
  </section>
  <section>
    <h2>מסלול הלימוד</h2>
    ${lessonPath()}
  </section>`;
}

function lessonPath() {
  return `<ol class="path">${LESSONS.map((l, i) => {
    const d = lessonPassed(l.id), r = P.read[l.id];
    return `<li class="${d ? 'done' : r ? 'started' : ''}">
      <a href="#/lesson/${l.id}">
        <span class="path-num">${d ? '✓' : i + 1}</span>
        <span class="path-ico" aria-hidden="true">${l.icon}</span>
        <span class="path-text"><b>${esc(l.title)}</b><span>${esc(l.summary)}</span></span>
        ${P.quiz[l.id] != null ? `<span class="path-score">${Math.round(P.quiz[l.id] * 100)}%</span>` : ''}
      </a></li>`;
  }).join('')}
    <li class="${allPassed() ? (P.exam >= EXAM_PASS ? 'done' : 'started') : 'locked'}">
      <a href="#/exam"><span class="path-num">${P.exam >= EXAM_PASS ? '✓' : allPassed() ? '★' : '🔒'}</span><span class="path-ico" aria-hidden="true">🏅</span>
      <span class="path-text"><b>מבחן מסכם</b><span>${allPassed() ? 'פתוח – 15 שאלות מכל החומר.' : 'נפתח כשכל השיעורים עוברים ב-70%.'}</span></span></a></li>
  </ol>`;
}

function viewLessons() {
  return `<header class="page-head"><h1 tabindex="-1">שיעורים</h1><p class="lead">כל השיעורים פתוחים, ואפשר לקפוץ לכל נושא. שיעור עובר כשהבוחן שלו עובר ב-70% ומעלה.</p></header>${lessonPath()}`;
}

function viewLesson(id) {
  const i = lessonIndex(id);
  if (i < 0) return viewNotFound();
  const l = LESSONS[i];
  if (!P.read[id]) { P.read[id] = 1; save(); }
  const prev = LESSONS[i - 1], next = LESSONS[i + 1];
  const missions = MISSIONS.filter(m => m.lesson === id);
  return `
  <article class="lesson">
    <header class="page-head">
      <p class="crumb"><a href="#/lessons">שיעורים</a> / שיעור ${i + 1} מתוך ${LESSONS.length}</p>
      <h1 tabindex="-1"><span aria-hidden="true">${l.icon}</span> ${esc(l.title)}</h1>
      <p class="lead">${esc(l.summary)}</p>
    </header>
    ${l.sections.map((s, k) => `<section class="lesson-sec" id="sec-${k}"><h2>${s.h}</h2>${s.body}</section>`).join('')}
    <aside class="tip"><b>טיפ</b><p>${l.tip}</p></aside>
    ${l.sim ? `<a class="sim-link" href="#/sim/${l.sim}"><span aria-hidden="true">🎛️</span><span><b>לתרגל במצלמה הווירטואלית</b><span>סצנה: ${SCENES[l.sim].name}</span></span></a>` : ''}
    <section class="lesson-sec" id="quiz-sec">
      <h2>בוחן ${lessonPassed(id) ? `<span class="pill good">עברת · ${Math.round(P.quiz[id] * 100)}%</span>` : ''}</h2>
      <p class="muted">טעית? יופיע הסבר ושאלה דומה לניסיון נוסף.</p>
      <div id="quiz"></div>
    </section>
    ${missions.length ? `<section class="lesson-sec"><h2>משימת שטח</h2>${missions.map(missionCard).join('')}</section>` : ''}
    <nav class="pager">
      ${prev ? `<a class="btn ghost" href="#/lesson/${prev.id}">הקודם: ${esc(prev.title)}</a>` : '<span></span>'}
      ${next ? `<a class="btn ghost" href="#/lesson/${next.id}">הבא: ${esc(next.title)}</a>` : `<a class="btn" href="#/exam">למבחן המסכם</a>`}
    </nav>
  </article>`;
}

function missionCard(m) {
  const choice = P.missions[m.id];
  const done = choice != null;
  return `<div class="mission ${done ? 'done' : ''}" data-m="${m.id}">
    <h3>${esc(m.title)}</h3>
    <p class="muted">${esc(m.goal)}</p>
    <ol>${m.steps.map(s => `<li>${s}</li>`).join('')}</ol>
    <div class="m-sum">
      <p class="m-q"><b>אחרי שביצעת:</b> ${esc(m.sum.q)}</p>
      <div class="chips">${m.sum.o.map((o, i) => `<button type="button" class="chip" data-mopt="${i}" aria-pressed="${choice === i}">${esc(o)}</button>`).join('')}</div>
      <p class="m-r" aria-live="polite">${done ? esc(m.sum.r[choice]) : ''}</p>
    </div>
  </div>`;
}

function viewMissions() {
  return `<header class="page-head"><h1 tabindex="-1">משימות שטח</h1>
    <p class="lead">קחו מצלמה – או טלפון במצב ״מקצועי״ / ״Pro״ – וצאו לתרגל. אחרי כל משימה בחרו מה יצא, ותקבלו טיפ.</p></header>
    <div class="missions">${LESSONS.map(l => {
      const ms = MISSIONS.filter(m => m.lesson === l.id);
      if (!ms.length) return '';
      return `<section><h2 class="mission-group"><span aria-hidden="true">${l.icon}</span> ${esc(l.title)}</h2>${ms.map(missionCard).join('')}</section>`;
    }).join('')}</div>`;
}

function viewSim() {
  return `<header class="page-head"><h1 tabindex="-1">המצלמה הווירטואלית</h1>
    <p class="lead">בחרו סצנה ומצב צילום, שנו ערכים ותראו מיד מה קורה לתמונה. נסו לפתור את האתגרים.</p></header>
    <div id="sim-root"></div>`;
}

function viewReview() {
  const items = reviewKeys().map(itemByKey).filter(Boolean);
  if (!items.length) return `<header class="page-head"><h1 tabindex="-1">כדאי לחזור</h1>
    <p class="lead">הרשימה ריקה${hi()}. כשטועים פעמיים באותו רעיון, השאלה מגיעה לכאן כדי לתרגל אותה שוב.</p>
    <a class="btn" href="${recommendation().href}">להמשיך ללמוד</a></header>`;
  const byLesson = {};
  for (const it of items) (byLesson[it.lessonId] = byLesson[it.lessonId] || []).push(it);
  return `<header class="page-head"><h1 tabindex="-1">כדאי לחזור</h1>
    <p class="lead">${items.length} שאלות שעוד לא ישבו. תשובה נכונה מוציאה שאלה מהרשימה.</p>
    <button type="button" class="btn" id="practice">לתרגל עכשיו</button></header>
    <div id="review-quiz"></div>
    <div class="review-list">${LESSONS.filter(l => byLesson[l.id]).map(l => `
      <section class="review-group"><h2><span aria-hidden="true">${l.icon}</span> ${esc(l.title)}</h2>
        <ul>${byLesson[l.id].map(it => `<li><span>${it.q.q}</span> <a href="#/lesson/${l.id}/${it.q.sec || 0}">לפסקה: ${esc(l.sections[it.q.sec || 0].h)}</a></li>`).join('')}</ul></section>`).join('')}</div>`;
}

function viewExam() {
  if (!allPassed()) {
    const missing = LESSONS.filter(l => !lessonPassed(l.id));
    return `<header class="page-head"><h1 tabindex="-1">מבחן מסכם</h1>
      <p class="lead">המבחן נפתח כשכל ${LESSONS.length} השיעורים עוברים ב-70% ומעלה. נשארו ${missing.length}:</p></header>
      <ul class="missing">${missing.map(l => `<li><a href="#/lesson/${l.id}"><span aria-hidden="true">${l.icon}</span> ${esc(l.title)}</a>${P.quiz[l.id] != null ? ` <span class="muted">(${Math.round(P.quiz[l.id] * 100)}%)</span>` : ''}</li>`).join('')}</ul>`;
  }
  return `<header class="page-head"><h1 tabindex="-1">מבחן מסכם</h1>
    <p class="lead">${EXAM_SIZE} שאלות אקראיות מכל השיעורים. במבחן אין שאלות דומות – רק הסבר אחרי כל תשובה. ציון ${Math.round(EXAM_PASS * 100)}% ומעלה פותח תעודה.${P.exam ? ` הציון הטוב ביותר שלך: ${Math.round(P.exam * 100)}%.` : ''}</p></header>
    <div id="exam"><button type="button" class="btn" id="start-exam">להתחיל את המבחן</button></div>
    <div id="cert"></div>`;
}

function viewGlossary() {
  return `<header class="page-head"><h1 tabindex="-1">מילון מונחים</h1>
    <label class="search"><span class="sr">חיפוש מונח</span><input type="search" id="gsearch" placeholder="חיפוש: צמצם, ISO, בוקה…"></label></header>
    <dl class="glossary">${GLOSSARY.map(([t, d]) => `<div class="g-item"><dt>${esc(t)}</dt><dd>${esc(d)}</dd></div>`).join('')}</dl>
    <p class="muted empty" hidden>לא נמצא מונח. נסו מילה אחרת.</p>`;
}

function viewSettings() {
  return `<header class="page-head"><h1 tabindex="-1">הגדרות</h1></header>
  <section class="settings">
    <div class="set-block">
      <h2>השם שלך</h2>
      <div class="row-btns"><input type="text" id="set-name" maxlength="20" value="${esc(P.name)}" placeholder="שם פרטי או כינוי" aria-label="שם"><button type="button" class="btn" id="save-name">שמירה</button></div>
    </div>
    <div class="set-block">
      <h2>גיבוי והעברה בין מכשירים</h2>
      <p class="muted">ההתקדמות נשמרת רק במכשיר הזה. כדי להעביר אותה: יוצרים קוד גיבוי, שולחים אותו לעצמכם, ומדביקים אותו כאן במכשיר השני.</p>
      <div class="row-btns"><button type="button" class="btn" id="make-code">יצירת קוד גיבוי</button></div>
      <div id="code-out" hidden>
        <textarea id="code-text" readonly rows="4" dir="ltr" aria-label="קוד גיבוי"></textarea>
        <div class="row-btns"><button type="button" class="btn ghost small" id="copy-code">העתקה</button></div>
      </div>
      <label class="restore"><span>שחזור מקוד:</span>
        <textarea id="restore-text" rows="3" dir="ltr" placeholder="הדביקו כאן קוד גיבוי"></textarea></label>
      <div class="row-btns"><button type="button" class="btn ghost" id="restore">שחזור</button></div>
      <p class="restore-msg" aria-live="polite"></p>
    </div>
    <div class="set-block">
      <h2>התחלה מחדש</h2>
      <p class="muted">מוחק את כל ההתקדמות במכשיר הזה.</p>
      <button type="button" class="btn ghost danger" id="reset-progress">מחיקת ההתקדמות</button>
    </div>
  </section>`;
}

function viewNotFound() {
  return `<header class="page-head"><h1 tabindex="-1">העמוד לא נמצא</h1><p><a href="#/">חזרה לדף הבית</a></p></header>`;
}

function certificate() {
  const d = new Date().toLocaleDateString('he-IL');
  return `<div class="certificate">
    <p class="cert-title">תעודת סיום</p>
    <p>${APP_NAME} – יסודות הצילום במצלמת SLR</p>
    <p class="cert-name">${esc(P.name || 'צלם/ת')}</p>
    <p class="muted">ציון: ${Math.round(P.exam * 100)}%, ${d}</p>
    <button type="button" class="btn ghost small" id="print-cert">הדפסת התעודה</button>
  </div>`;
}

// ---------- גיבוי ----------
const enc = o => 'PL1.' + btoa(unescape(encodeURIComponent(JSON.stringify(o))));
function dec(s) {
  s = s.trim().replace(/\s+/g, '');
  if (!s.startsWith('PL1.')) throw new Error('format');
  const o = JSON.parse(decodeURIComponent(escape(atob(s.slice(4)))));
  if (!o || typeof o !== 'object' || typeof o.quiz !== 'object') throw new Error('shape');
  return Object.assign(blank(), o);
}

// ---------- ניתוב ----------
let cleanup = null;
function route() {
  if (cleanup) { cleanup(); cleanup = null; }
  const [page, arg, arg2] = (location.hash.replace(/^#\/?/, '') || '').split('/');
  if (!P.onboarded && page) { location.hash = '#/'; return; }
  const views = { '': viewHome, lessons: viewLessons, lesson: viewLesson, sim: viewSim, missions: viewMissions, review: viewReview, exam: viewExam, glossary: viewGlossary, settings: viewSettings };
  app.innerHTML = (views[page] || viewNotFound)(arg);
  document.querySelectorAll('.nav a').forEach(a => {
    const target = a.getAttribute('href').replace(/^#\/?/, '');
    const active = target === page || (page === 'lesson' && target === 'lessons');
    if (active) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
  document.querySelector('.nav').hidden = !P.onboarded;
  updateReviewBadge();
  window.scrollTo(0, 0);
  const h = app.querySelector('h1'); if (h) h.focus({ preventScroll: true });
  wire(page, arg, arg2);
}

function wire(page, arg, arg2) {
  app.querySelectorAll('[data-mopt]').forEach(b => b.addEventListener('click', () => {
    const box = b.closest('.mission'), m = MISSIONS.find(x => x.id === box.dataset.m), i = +b.dataset.mopt;
    const first = P.missions[m.id] == null;
    P.missions[m.id] = i; save();
    box.classList.add('done');
    box.querySelectorAll('[data-mopt]').forEach(x => x.setAttribute('aria-pressed', x === b));
    box.querySelector('.m-r').textContent = m.sum.r[i];
    if (first) toast(`משימה הושלמה: +15 נקודות`);
  }));

  if (page === '' && !P.onboarded) {
    const start = n => { P.name = n; P.onboarded = true; save(); route(); };
    const inp = document.getElementById('name-in');
    inp.focus();
    document.getElementById('start').addEventListener('click', () => start(inp.value.trim().slice(0, 20)));
    document.getElementById('skip-name').addEventListener('click', () => start(''));
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') start(inp.value.trim().slice(0, 20)); });
  }

  if (page === 'lesson') {
    const l = LESSONS.find(x => x.id === arg);
    if (!l) return;
    if (arg2 != null) { const s = document.getElementById('sec-' + arg2); if (s) { s.scrollIntoView(); s.classList.add('flash'); } }
    const el = document.getElementById('quiz');
    el.innerHTML = `<button type="button" class="btn" id="start-quiz">${P.quiz[l.id] != null ? 'לעשות שוב את הבוחן' : 'להתחיל את הבוחן'}</button>`;
    document.getElementById('start-quiz').addEventListener('click', () => {
      cleanup = runQuiz(el, itemsFor(l.id), { mode: 'lesson', onFinish: f => {
        const before = lessonPassed(l.id);
        P.quiz[l.id] = Math.max(P.quiz[l.id] || 0, f); save();
        if (!before && lessonPassed(l.id)) toast(allPassed() ? `כל השיעורים עברו – המבחן המסכם נפתח!` : `השיעור ״${l.title}״ עבר!`);
      } });
    });
  }

  if (page === 'sim') {
    cleanup = mountSimulator(document.getElementById('sim-root'), {
      scene: arg, done: new Set(Object.keys(P.challenges)),
      onComplete: id => { P.challenges[id] = 1; save(); const c = CHALLENGES.find(x => x.id === id); toast(`אתגר הושלם: ${c.title}`); }
    });
  }

  if (page === 'review') {
    const b = document.getElementById('practice');
    if (b) b.addEventListener('click', () => {
      const run = () => {
        const items = shuffle(reviewKeys().map(itemByKey).filter(Boolean)).slice(0, 10);
        if (!items.length) return route();
        app.querySelector('.review-list').hidden = true; b.hidden = true;
        const fin = () => {}; fin.again = run;
        if (cleanup) cleanup();
        cleanup = runQuiz(document.getElementById('review-quiz'), items, { mode: 'review', onFinish: fin });
      };
      run();
    });
  }

  if (page === 'exam' && allPassed()) {
    const showCert = () => {
      if (P.exam < EXAM_PASS) return;
      document.getElementById('cert').innerHTML = certificate();
      document.getElementById('print-cert').addEventListener('click', () => window.print());
    };
    showCert();
    document.getElementById('start-exam').addEventListener('click', () => {
      const pool = shuffle(LESSONS.flatMap(l => itemsFor(l.id)).filter(it => it.q.t !== 'scenario')).slice(0, EXAM_SIZE);
      cleanup = runQuiz(document.getElementById('exam'), pool, { mode: 'exam', onFinish: f => {
        if (f > P.exam) { P.exam = f; save(); }
        if (f >= EXAM_PASS) { toast('עברת את המבחן!'); showCert(); }
      } });
    });
  }

  if (page === 'glossary') {
    const inp = document.getElementById('gsearch');
    inp.addEventListener('input', () => {
      const q = inp.value.trim().toLowerCase();
      let any = false;
      app.querySelectorAll('.g-item').forEach(it => { const m = !q || it.textContent.toLowerCase().includes(q); it.hidden = !m; any = any || m; });
      app.querySelector('.empty').hidden = any;
    });
  }

  if (page === 'settings') {
    document.getElementById('save-name').addEventListener('click', () => { P.name = document.getElementById('set-name').value.trim().slice(0, 20); save(); toast('השם נשמר'); });
    document.getElementById('make-code').addEventListener('click', () => {
      document.getElementById('code-out').hidden = false;
      const t = document.getElementById('code-text'); t.value = enc(P); t.select();
    });
    document.getElementById('copy-code').addEventListener('click', async () => {
      const t = document.getElementById('code-text');
      try { await navigator.clipboard.writeText(t.value); toast('הקוד הועתק'); } catch (e) { t.select(); toast('סמנו את הקוד והעתיקו ידנית'); }
    });
    document.getElementById('restore').addEventListener('click', () => {
      const msg = app.querySelector('.restore-msg');
      try {
        const o = dec(document.getElementById('restore-text').value);
        if (!confirm('השחזור יחליף את ההתקדמות שבמכשיר הזה. להמשיך?')) return;
        o.onboarded = true; P = o; save(); applySize(); toast('ההתקדמות שוחזרה'); location.hash = '#/';
      } catch (e) { msg.textContent = 'הקוד לא תקין. ודאו שהעתקתם אותו במלואו, כולל PL1. בהתחלה.'; }
    });
    document.getElementById('reset-progress').addEventListener('click', () => {
      if (confirm('למחוק את כל ההתקדמות? אי אפשר לבטל את זה.')) { const size = P.size; P = blank(); P.size = size; save(); location.hash = '#/'; route(); }
    });
  }
}

// ---------- גודל טקסט ----------
function applySize() { document.documentElement.dataset.size = P.size; document.querySelectorAll('[data-size-btn]').forEach(b => b.setAttribute('aria-pressed', b.dataset.sizeBtn === P.size)); }
document.querySelectorAll('[data-size-btn]').forEach(b => b.addEventListener('click', () => { P.size = b.dataset.sizeBtn; save(); applySize(); }));
applySize();

const topbar = document.querySelector('.topbar');
const setTop = () => document.documentElement.style.setProperty('--topbar-h', topbar.offsetHeight + 'px');
setTop();
if ('ResizeObserver' in window) new ResizeObserver(setTop).observe(topbar); else window.addEventListener('resize', setTop);

window.addEventListener('hashchange', route);
route();
