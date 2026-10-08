/* FORJA — lógica de la app */
'use strict';

/* ================= Utilidades ================= */
const $ = (s, el = document) => el.querySelector(s);
const STORE_KEY = 'forja.v1';
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const round = (v, d = 1) => Math.round(v * 10 ** d) / 10 ** d;
const fmtNum = (v, d = 1) => (v == null || isNaN(v) ? '—' : round(v, d).toLocaleString('es-ES', { maximumFractionDigits: d }));
const fmtKg = (v) => fmtNum(v, 2);

const todayISO = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };
const parseISO = (iso) => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d); };
const fmtDate = (iso, o = { weekday: 'short', day: 'numeric', month: 'short' }) => parseISO(iso).toLocaleDateString('es-ES', o);
const fmtShort = (iso) => parseISO(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }).replace('.', '');
const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1);
const daysAgo = (iso) => Math.round((parseISO(todayISO()) - parseISO(iso)) / 864e5);
const agoText = (iso) => { const d = daysAgo(iso); return d <= 0 ? 'hoy' : d === 1 ? 'ayer' : d < 7 ? `hace ${d} días` : d < 30 ? `hace ${Math.round(d / 7)} sem` : fmtShort(iso); };

const svg = (inner, cls = '') => `<svg class="ico ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
const ui = (n, cls) => svg(UI_ICONS[n], cls);
const exIcon = (n, cls) => svg(EX_ICONS[n] || EX_ICONS.dumbbell, cls);

/* ================= Estado ================= */
function defaults() {
  return {
    v: 1,
    profile: { name: '', height: null, age: null, weight: null, bodyFat: null, waist: null, arm: null },
    bodyLog: [],
    prs: [],
    prefs: { inc: 2.5, maxW: 200 },
    days: JSON.parse(JSON.stringify(DEFAULT_DAYS)),
    library: DEFAULT_LIBRARY.map((e) => ({ ...e })),
    workouts: [],
    draft: null,
  };
}
function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return defaults();
    const d = Object.assign(defaults(), JSON.parse(raw));
    d.prefs = Object.assign(defaults().prefs, d.prefs);
    d.profile = Object.assign(defaults().profile, d.profile);
    return d;
  } catch (e) { return defaults(); }
}
let S = load();
let saveT;
function save(now) {
  clearTimeout(saveT);
  const w = () => { try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); } catch (e) { toast('No se pudo guardar'); } };
  now ? w() : (saveT = setTimeout(w, 250));
}
window.addEventListener('pagehide', () => save(true));
document.addEventListener('visibilitychange', () => document.hidden && save(true));

const exById = (id) => S.library.find((e) => e.id === id) || { id, name: 'Ejercicio eliminado', muscle: 'Otro', icon: 'dumbbell' };

/* UI state (no persistido salvo pestaña) */
const U = { tab: 'log', filter: 'all', chartEx: null, metric: 'max', routineDay: 'push', bodyMetric: 'weight' };
try { U.tab = sessionStorage.getItem('forja.tab') || (S.draft ? 'log' : S.workouts.length ? 'progress' : 'log'); } catch (e) {}

/* ================= Métricas ================= */
const e1rm = (w, r) => (r <= 1 ? w : w * (1 + r / 30));
function exStats(ex) {
  let max = 0, best = 0, vol = 0, reps = 0;
  ex.sets.forEach((s) => { max = Math.max(max, s.w); best = Math.max(best, e1rm(s.w, s.r)); vol += s.w * s.r; reps += s.r; });
  return { max, e1rm: best, vol, reps, sets: ex.sets.length };
}
const wVolume = (w) => w.ex.reduce((a, e) => a + exStats(e).vol, 0);
const sortedWorkouts = () => [...S.workouts].sort((a, b) => (a.date === b.date ? a.start - b.start : a.date < b.date ? -1 : 1));
function bestFor(exId, excludeId) {
  let best = { w: 0, r: 0, e: 0 };
  S.workouts.forEach((w) => { if (w.id === excludeId) return; w.ex.forEach((e) => { if (e.exId !== exId) return; e.sets.forEach((s) => { if (s.w > best.w || (s.w === best.w && s.r > best.r)) best = { w: s.w, r: s.r, date: w.date }; }); }); });
  S.prs.forEach((p) => { if (p.exId === exId && (p.w > best.w || (p.w === best.w && p.r > best.r))) best = { w: p.w, r: p.r, date: p.date, manual: true }; });
  return best;
}
function lastSessionFor(exId) {
  const ws = sortedWorkouts();
  for (let i = ws.length - 1; i >= 0; i--) { const e = ws[i].ex.find((x) => x.exId === exId); if (e && e.sets.length) return { date: ws[i].date, sets: e.sets }; }
  return null;
}
function weekStreak() {
  if (!S.workouts.length) return 0;
  const wk = (iso) => { const d = parseISO(iso); const day = (d.getDay() + 6) % 7; d.setDate(d.getDate() - day); return d.getTime(); };
  const set = new Set(S.workouts.map((w) => wk(w.date)));
  let cur = wk(todayISO()), n = 0;
  if (!set.has(cur)) cur -= 7 * 864e5;
  while (set.has(cur)) { n++; cur -= 7 * 864e5; }
  return n;
}

/* ================= Gráficos SVG ================= */
function lineChart(pts, { unit = 'kg', h = 170, id = 'c' } = {}) {
  const W = 340, H = h, pl = 30, pr = 12, pt = 14, pb = 24;
  if (!pts.length) return '';
  const ys = pts.map((p) => p.y);
  let lo = Math.min(...ys), hi = Math.max(...ys);
  if (lo === hi) { lo -= Math.max(1, lo * 0.1); hi += Math.max(1, hi * 0.1); }
  const pad = (hi - lo) * 0.15; lo = Math.max(0, lo - pad); hi += pad;
  const n = pts.length;
  const X = (i) => (n === 1 ? (pl + W - pr) / 2 : pl + (i * (W - pl - pr)) / (n - 1));
  const Y = (v) => pt + (1 - (v - lo) / (hi - lo)) * (H - pt - pb);
  const P = pts.map((p, i) => [X(i), Y(p.y)]);
  let d = `M${P[0][0]},${P[0][1]}`;
  for (let i = 1; i < P.length; i++) { const [x0, y0] = P[i - 1], [x1, y1] = P[i], cx = (x0 + x1) / 2; d += ` C${cx},${y0} ${cx},${y1} ${x1},${y1}`; }
  const area = `${d} L${P[n - 1][0]},${H - pb} L${P[0][0]},${H - pb} Z`;
  const grid = [0, 0.5, 1].map((t) => { const v = lo + (hi - lo) * t, y = Y(v); return `<line class="grid" x1="${pl}" x2="${W - pr}" y1="${y}" y2="${y}"/><text x="${pl - 6}" y="${y + 3}" text-anchor="end">${fmtNum(v, 0)}</text>`; }).join('');
  const lbl = (i, anchor) => `<text x="${X(i)}" y="${H - 6}" text-anchor="${anchor}">${fmtShort(pts[i].date)}</text>`;
  const xl = n === 1 ? lbl(0, 'middle') : lbl(0, 'start') + lbl(n - 1, 'end');
  const showDots = n <= 30;
  const dots = P.map(([x, y], i) => `${showDots || i === n - 1 ? `<circle class="pt ${i === n - 1 ? 'last' : ''}" cx="${x}" cy="${y}" r="${i === n - 1 ? 4.5 : 3.2}"/>` : ''}<circle class="hit" data-act="pt" data-id="${id}" data-label="${esc(fmtDate(pts[i].date, { day: 'numeric', month: 'short', year: '2-digit' }))} · <b>${fmtNum(pts[i].y, 1)} ${unit}</b>${pts[i].note ? ' · ' + esc(pts[i].note) : ''}" cx="${x}" cy="${y}" r="14"/>`).join('');
  return `<svg class="chart" viewBox="0 0 ${W} ${H}"><defs><linearGradient id="g${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff5722" stop-opacity=".28"/><stop offset="1" stop-color="#ff5722" stop-opacity="0"/></linearGradient></defs>${grid}<path d="${area}" fill="url(#g${id})"/><path class="ln" d="${d}"/>${dots}${xl}</svg><div class="readout" id="ro-${id}">Toca un punto para ver el detalle</div>`;
}
function barChart(pts, { unit = 'kg', h = 140, id = 'b' } = {}) {
  const W = 340, H = h, pl = 30, pr = 6, pt = 10, pb = 22;
  if (!pts.length) return '';
  const hi = Math.max(...pts.map((p) => p.y)) * 1.1 || 1;
  const n = pts.length, slot = (W - pl - pr) / n, bw = Math.min(26, slot * 0.62);
  const Y = (v) => pt + (1 - v / hi) * (H - pt - pb);
  const grid = [0, 0.5, 1].map((t) => { const v = hi * t, y = Y(v); return `<line class="grid" x1="${pl}" x2="${W - pr}" y1="${y}" y2="${y}"/><text x="${pl - 6}" y="${y + 3}" text-anchor="end">${v >= 1000 ? fmtNum(v / 1000, 1) + 'k' : fmtNum(v, 0)}</text>`; }).join('');
  const bars = pts.map((p, i) => { const x = pl + i * slot + (slot - bw) / 2, y = Y(p.y), bh = H - pb - y; return `<rect class="bar ${i === n - 1 ? 'last' : ''}" x="${x}" y="${y}" width="${bw}" height="${Math.max(2, bh)}" rx="5"/><rect class="hit" data-act="pt" data-id="${id}" data-label="${esc(fmtShort(p.date))} · ${esc(p.note || '')} · <b>${fmtNum(p.y, 0)} ${unit}</b>" x="${pl + i * slot}" y="${pt}" width="${slot}" height="${H - pt - pb}"/>`; }).join('');
  const xl = `<text x="${pl + slot / 2}" y="${H - 6}" text-anchor="${n === 1 ? 'middle' : 'start'}">${fmtShort(pts[0].date)}</text>` + (n > 1 ? `<text x="${W - pr - slot / 2}" y="${H - 6}" text-anchor="end">${fmtShort(pts[n - 1].date)}</text>` : '');
  return `<svg class="chart" viewBox="0 0 ${W} ${H}">${grid}${bars}${xl}</svg><div class="readout" id="ro-${id}">Toca una barra para ver el detalle</div>`;
}

/* ================= Render principal ================= */
const app = $('#app');
function render() {
  try { sessionStorage.setItem('forja.tab', U.tab); } catch (e) {}
  const titles = { progress: ['Progreso', ''], log: ['Entreno', ''], routines: ['Rutinas', ''] };
  const body = U.tab === 'progress' ? viewProgress() : U.tab === 'log' ? viewLog() : viewRoutines();
  const greet = S.profile.name ? `Hola, ${esc(S.profile.name.split(' ')[0])}` : 'FORJA';
  app.innerHTML = `
    <header class="top">
      <div class="brand"><h1>${titles[U.tab][0]}</h1><small>${U.tab === 'progress' ? greet : ''}</small></div>
      <button class="icon-btn" data-act="settings" aria-label="Ajustes">${ui('gear')}</button>
    </header>
    <main><div class="view">${body}</div></main>
    <nav class="nav"><div class="nav-inner">
      <button class="nav-btn ${U.tab === 'progress' ? 'on' : ''}" data-act="tab" data-tab="progress">${ui('chart')}Progreso</button>
      <button class="nav-plus ${U.tab === 'log' ? 'on' : ''} ${S.draft ? 'live' : ''}" data-act="tab" data-tab="log" aria-label="Nuevo entreno">${ui('plus')}</button>
      <button class="nav-btn ${U.tab === 'routines' ? 'on' : ''}" data-act="tab" data-tab="routines">${ui('list')}Rutinas</button>
    </div></nav>`;
  if (U.tab === 'log' && S.draft) startTimer(); else stopTimer();
}

/* ================= Vista: Progreso ================= */
function viewProgress() {
  const ws = sortedWorkouts();
  if (!ws.length) {
    return `<div class="empty">${ui('chart')}<h3>Sin datos todavía</h3><p>Registra tu primer entreno con el botón <b class="accent">+</b> y aquí verás tu progresión.</p><button class="btn primary" data-act="tab" data-tab="log">${ui('plus')}Empezar entreno</button></div>${bodySection()}`;
  }
  const fw = U.filter === 'all' ? ws : ws.filter((w) => w.day === U.filter);
  const last30 = ws.filter((w) => daysAgo(w.date) < 30).length;
  const weekVol = ws.filter((w) => daysAgo(w.date) < 7).reduce((a, w) => a + wVolume(w), 0);
  const streak = weekStreak();

  // ejercicios con datos en el filtro
  const exCount = {};
  fw.forEach((w) => w.ex.forEach((e) => { if (e.sets.length) exCount[e.exId] = (exCount[e.exId] || 0) + 1; }));
  const exIds = Object.keys(exCount).sort((a, b) => exCount[b] - exCount[a]);
  if (!exIds.includes(U.chartEx)) U.chartEx = exIds[0] || null;

  const filterChips = `<div class="chips">${[['all', 'Todo'], ...DAY_ORDER.map((k) => [k, S.days[k].name])].map(([k, n]) => `<button class="chip ${U.filter === k ? 'on' : ''}" data-act="filter" data-v="${k}">${n}</button>`).join('')}</div>`;

  let exCard = '';
  if (U.chartEx) {
    const series = [];
    fw.forEach((w) => { const e = w.ex.find((x) => x.exId === U.chartEx); if (e && e.sets.length) { const st = exStats(e); series.push({ date: w.date, max: st.max, e1rm: st.e1rm, vol: st.vol, note: e.sets.map((s) => `${fmtKg(s.w)}×${s.r}`).join(' ') }); } });
    const m = U.metric;
    const pts = series.map((s) => ({ date: s.date, y: s[m], note: m === 'max' ? '' : '' }));
    const cur = pts[pts.length - 1].y, first = pts[0].y;
    const delta = first ? ((cur - first) / first) * 100 : 0;
    const best = bestFor(U.chartEx);
    const ex = exById(U.chartEx);
    exCard = `
      <div class="section-title">Progresión por ejercicio</div>
      <div class="chips" style="margin-bottom:10px">${exIds.map((id) => { const e = exById(id); return `<button class="chip ${U.chartEx === id ? 'on' : ''}" data-act="chartEx" data-v="${id}">${exIcon(e.icon)}${esc(e.name)}</button>`; }).join('')}</div>
      <div class="card">
        <div class="chart-head">
          <div><h3>${esc(ex.name)}</h3><p>${series.length} sesiones · ${esc(ex.muscle)}</p></div>
          <div><div class="big-num">${fmtNum(cur, m === 'vol' ? 0 : 1)}<small>kg</small></div>${pts.length > 1 ? `<span class="delta ${delta >= 0 ? 'up' : 'down'}">${delta >= 0 ? '▲' : '▼'} ${fmtNum(Math.abs(delta), 1)}%</span>` : ''}</div>
        </div>
        <div class="seg" style="margin-bottom:12px">${[['max', 'Peso máx.'], ['e1rm', '1RM est.'], ['vol', 'Volumen']].map(([k, n]) => `<button class="${m === k ? 'on' : ''}" data-act="metric" data-v="${k}">${n}</button>`).join('')}</div>
        ${lineChart(series.map((s) => ({ date: s.date, y: s[m], note: s.note })), { id: 'ex' })}
        <div class="mini-stats">
          <div><b class="accent">${fmtKg(best.w)}</b><span>PR kg${best.r ? ' ×' + best.r : ''}</span></div>
          <div><b>${fmtKg(Math.max(...series.map((s) => s.e1rm)))}</b><span>Mejor 1RM</span></div>
          <div><b>${fmtNum(series.reduce((a, s) => a + s.vol, 0) / 1000, 1)}t</b><span>Vol. total</span></div>
        </div>
      </div>`;
  }

  const volPts = fw.slice(-14).map((w) => ({ date: w.date, y: wVolume(w), note: S.days[w.day]?.name || 'Libre' }));
  const volCard = volPts.length ? `<div class="section-title">Volumen por sesión</div><div class="card">${barChart(volPts, { id: 'vol' })}</div>` : '';

  const hist = [...fw].reverse().slice(0, U.histAll ? 500 : 8).map((w) => {
    const sets = w.ex.reduce((a, e) => a + e.sets.length, 0);
    return `<button class="row" data-act="workout" data-id="${w.id}"><div class="ex-ico acc">${exIcon(S.days[w.day]?.icon || 'dumbbell')}</div><div class="grow"><div class="t">${esc(S.days[w.day]?.name || 'Libre')}${w.challenge ? ` <span class="reto-tag">${ui('flame', 'inl')}Reto</span>` : ''} <span class="muted" style="font-weight:500;text-transform:capitalize">· ${fmtDate(w.date)}</span></div><div class="s">${w.ex.length} ejercicio${w.ex.length === 1 ? '' : 's'} · ${sets} serie${sets === 1 ? '' : 's'}${w.end && w.start ? ' · ' + Math.round((w.end - w.start) / 60000) + ' min' : ''}</div></div><div class="val">${fmtNum(wVolume(w) / 1000, 1)}<span class="muted" style="font-size:13px">t</span></div></button>`;
  }).join('');

  return `
    <div class="stats">
      <div class="stat hot"><b>${last30}</b><span>Últ. 30 días</span></div>
      <div class="stat"><b>${fmtNum(weekVol / 1000, 1)}<em>t</em></b><span>Volumen 7d</span></div>
      <div class="stat"><b>${streak}<em>sem</em></b><span>Racha</span></div>
    </div>
    <div style="margin-top:16px">${filterChips}</div>
    ${exCard || `<div class="card" style="margin-top:14px"><p class="muted" style="margin:0">No hay entrenos de este tipo todavía.</p></div>`}
    ${volCard}
    ${bodySection()}
    <div class="section-title">Historial · ${fw.length}${fw.length > 8 ? `<button data-act="histAll">${U.histAll ? 'Ver menos' : 'Ver todo'}</button>` : ''}</div>
    ${hist || '<p class="muted">—</p>'}`;
}

function bodySection() {
  const log = [...S.bodyLog].sort((a, b) => (a.date < b.date ? -1 : 1));
  const m = U.bodyMetric;
  const pts = log.filter((l) => l[m] != null && l[m] !== '').map((l) => ({ date: l.date, y: +l[m] }));
  const labels = { weight: ['Peso', 'kg'], bodyFat: ['Grasa', '%'], waist: ['Cintura', 'cm'] };
  if (!log.length) {
    return `<div class="section-title">Cuerpo</div><button class="row" data-act="settings">${'<div class="ex-ico">' + ui('scale') + '</div>'}<div class="grow"><div class="t">Registra tus medidas</div><div class="s">Peso, % de grasa y más desde Ajustes</div></div>${ui('chev', 'end')}</button>`;
  }
  const cur = pts.length ? pts[pts.length - 1].y : null;
  const d = pts.length > 1 ? cur - pts[0].y : null;
  return `<div class="section-title">Cuerpo <button data-act="settings">Registrar</button></div>
    <div class="card">
      <div class="chart-head"><div><h3>${labels[m][0]} corporal</h3><p>${pts.length} mediciones</p></div>
        <div><div class="big-num">${fmtNum(cur, 1)}<small>${labels[m][1]}</small></div>${d != null ? `<span class="delta ${d <= 0 ? 'up' : 'down'}" style="color:var(--muted)">${d > 0 ? '+' : ''}${fmtNum(d, 1)} ${labels[m][1]}</span>` : ''}</div></div>
      <div class="seg" style="margin-bottom:12px">${Object.entries(labels).map(([k, [n]]) => `<button class="${m === k ? 'on' : ''}" data-act="bodyMetric" data-v="${k}">${n}</button>`).join('')}</div>
      ${pts.length ? lineChart(pts, { unit: labels[m][1], id: 'body', h: 140 }) : '<p class="muted" style="margin:0">Sin datos de esta medida.</p>'}
    </div>`;
}

/* ================= Vista: Entreno (+) ================= */
function viewLog() {
  if (!S.draft) {
    const lastByDay = {};
    S.workouts.forEach((w) => { if (!lastByDay[w.day] || lastByDay[w.day] < w.date) lastByDay[w.day] = w.date; });
    const cards = DAY_ORDER.map((k, i) => {
      const d = S.days[k];
      return `<button class="day-card" data-act="startDay" data-day="${k}">${lastByDay[k] ? `<span class="last">${agoText(lastByDay[k])}</span>` : ''}${exIcon(d.icon)}<div><h4>${esc(d.name)}</h4><p>${d.ex.length} ejercicios · ${esc(d.desc || '')}</p></div></button>`;
    }).join('');
    return `
      <div class="today-line">${ui('calendar')}${cap(fmtDate(todayISO(), { weekday: 'long', day: 'numeric', month: 'long' }))}</div>
      <div class="hero-title">¿Qué toca<br><span>hoy?</span></div>
      <div class="day-grid">${cards}
        <button class="day-card" data-act="startDay" data-day="free">${exIcon('dumbbell')}<div><h4>Libre</h4><p>Empieza vacío y añade lo que hagas</p></div></button>
      </div>`;
  }
  const D = S.draft;
  const day = S.days[D.day];
  const totalTarget = D.ex.reduce((a, e) => a + (e.target || 0), 0);
  const done = D.ex.reduce((a, e) => a + Math.min(e.sets.length, e.target || e.sets.length), 0);
  const pct = totalTarget ? done / totalTarget : 0;
  const C = 2 * Math.PI * 22;
  const ring = `<svg class="progress-ring" viewBox="0 0 54 54"><circle cx="27" cy="27" r="22" fill="none" stroke="#2a2e33" stroke-width="3"/><circle cx="27" cy="27" r="22" fill="none" stroke="#ff5722" stroke-width="3" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - pct)}" transform="rotate(-90 27 27)"/><text x="27" y="32" text-anchor="middle">${Math.round(pct * 100)}%</text></svg>`;
  return `
    <div class="session-head">
      <div><span class="day-badge">${D.editing ? 'Edición' : 'En curso'}</span>${D.challenge ? ` <span class="day-badge reto">${ui('flame', 'inl')} Reto</span>` : ''}<h2 style="margin-top:8px">${esc(day ? day.name : 'Libre')}</h2>
        <div class="session-meta"><button data-act="editDate">${ui('calendar')}${fmtDate(D.date)}</button>${D.editing ? `<span>${ui('edit')}Editando</span>` : `<span>${ui('clock')}<span id="timer">0:00</span></span>`}</div></div>
      ${ring}
    </div>
    ${D.ex.map((e, i) => exCardHTML(e, i)).join('') || '<div class="card"><p class="muted" style="margin:0">Añade tu primer ejercicio.</p></div>'}
    <div class="session-actions">
      <button class="btn ghost" data-act="addExtra">${ui('plus')}Añadir ejercicio extra</button>
      <button class="btn primary" data-act="finish">${ui('check')}Finalizar entreno</button>
      <button class="btn danger sm" data-act="discard">Descartar</button>
    </div>`;
}

function exCardHTML(e, i) {
  const ex = exById(e.exId);
  const open = S.draft.open === i;
  const full = e.target && e.sets.length >= e.target;
  const best = bestFor(e.exId);
  let body = '';
  if (open) {
    const prev = lastSessionFor(e.exId);
    const ed = e.ed;
    const max = Math.max(S.prefs.maxW, Math.ceil(ed.w / 50) * 50);
    const p = (ed.w / max) * 100;
    body = `<div class="ex-body">
      ${e.ch ? `<div class="reto-banner">${ui('flame')}<div><b>Reto: ${e.ch.bw ? `${e.ch.r}+ repeticiones` : `${fmtKg(e.ch.w)} kg × ${e.ch.r}+`}</b><span>${e.target || 3} series al fallo · ${e.sets.filter((s) => beatChallenge(s, e.ch)).length}/${e.target || 3} superadas</span></div><button class="link-btn" data-act="loadCh" data-i="${i}">Cargar</button></div>` : ''}
      ${prev ? `<div class="prev">${ui('clock')}<span>Última vez (${agoText(prev.date)}): <b>${prev.sets.map((s) => `${fmtKg(s.w)}×${s.r}`).join(' · ')}</b></span></div>` : ''}
      ${e.sets.length ? `<div class="sets">${e.sets.map((s, j) => `<button class="set-chip ${e.sel === j ? 'sel' : ''} ${s.pr ? 'pr' : ''} ${e.ch ? (beatChallenge(s, e.ch) ? 'win' : 'miss') : ''}" data-act="selSet" data-i="${i}" data-j="${j}"><i>${j + 1}</i>${fmtKg(s.w)} kg × ${s.r}</button>`).join('')}</div>` : ''}
      <div class="editor">
        <div class="ed-label"><span>Peso</span><span>±${fmtKg(S.prefs.inc)} kg</span></div>
        <div class="ed-value">
          <button class="step-btn" data-act="w" data-i="${i}" data-d="-1" aria-label="Menos peso">${ui('minus')}</button>
          <button class="num" data-act="typeW" data-i="${i}"><span id="wv-${i}">${fmtKg(ed.w)}</span><small>kg</small></button>
          <button class="step-btn" data-act="w" data-i="${i}" data-d="1" aria-label="Más peso">${ui('plus')}</button>
        </div>
        <input type="range" min="0" max="${max}" step="${S.prefs.inc}" value="${ed.w}" data-range="${i}" style="--p:${p}%" aria-label="Peso">
        <div class="range-scale"><span>0</span><span>${max / 2}</span><span>${max}</span></div>
        <div class="ed-divider"></div>
        <div class="ed-label"><span>Repeticiones</span><span>${e.targetReps ? 'Objetivo ' + e.targetReps : ''}</span></div>
        <div class="ed-value">
          <button class="step-btn" data-act="r" data-i="${i}" data-d="-1" aria-label="Menos reps">${ui('minus')}</button>
          <div class="num" id="rv-${i}">${ed.r}</div>
          <button class="step-btn" data-act="r" data-i="${i}" data-d="1" aria-label="Más reps">${ui('plus')}</button>
        </div>
        <div class="quick">${[5, 8, 10, 12, 15].map((n) => `<button data-act="rq" data-i="${i}" data-v="${n}">${n}</button>`).join('')}</div>
      </div>
      <div class="btn-row" style="margin-top:12px">
        ${e.sel != null
          ? `<button class="btn sm danger" data-act="delSet" data-i="${i}">${ui('trash')}Borrar</button><button class="btn sm primary" data-act="saveSet" data-i="${i}">${ui('check')}Actualizar serie ${e.sel + 1}</button>`
          : `<button class="btn sm primary" data-act="saveSet" data-i="${i}">${ui('plus')}Registrar serie ${e.sets.length + 1}</button>`}
      </div>
      <div style="display:flex;justify-content:space-between;margin-top:10px">
        <button class="link-btn" style="color:var(--muted)" data-act="rmEx" data-i="${i}">Quitar ejercicio</button>
        ${best.w ? `<span class="muted" style="font-size:12.5px">${ui('trophy', 'inl')} PR ${fmtKg(best.w)} kg × ${best.r}</span>` : ''}
      </div>
    </div>`;
  }
  return `<div class="ex-card ${open ? 'open' : ''} ${full ? 'done' : ''}" id="exc-${i}">
    <button class="ex-top" data-act="toggleEx" data-i="${i}">
      <div class="ex-ico">${exIcon(ex.icon)}</div>
      <div class="grow"><div class="t">${esc(ex.name)}</div><div class="s">${e.ch ? `<span class="accent" style="font-weight:500">${ui('flame', 'inl')} ${e.ch.bw ? `${e.ch.r}+ reps` : `${fmtKg(e.ch.w)} kg × ${e.ch.r}+`}</span>` : e.target ? `${e.target} × ${e.targetReps}` : 'Extra'} · ${esc(ex.muscle)}</div></div>
      <span class="set-count ${full ? 'full' : ''}">${e.sets.length}${e.target ? '/' + e.target : ''}</span>
      ${ui('chev', 'chev')}
    </button>${body}</div>`;
}

/* ================= Modo Reto =================
   Calcula, a partir del historial, un peso exigente para llevar cada serie al fallo.
   - Necesita ≥2 sesiones previas del ejercicio.
   - Toma el mejor 1RM estimado (Epley) de las últimas 3 sesiones.
   - Lo sube un 2 % (3 % si vienes en tendencia ascendente) y lo traduce al peso
     para las repeticiones objetivo, redondeado al incremento configurado.
   - Siempre por encima de lo que ya moviste a esas reps la última vez.
   - Ejercicios sin peso (dominadas, fondos con peso corporal): reto de repeticiones. */
const CH_MIN_SESSIONS = 2;
function sessionsFor(exId, excludeId) {
  const out = [];
  sortedWorkouts().forEach((w) => { if (w.id === excludeId) return; const e = w.ex.find((x) => x.exId === exId); if (e && e.sets.length) out.push({ date: w.date, sets: e.sets }); });
  return out;
}
function challengeFor(exId, targetReps) {
  const ss = sessionsFor(exId, S.draft?.editing);
  if (ss.length < CH_MIN_SESSIONS) return null;
  const recent = ss.slice(-3);
  const last = recent[recent.length - 1];
  const inc = S.prefs.inc;
  const topW = Math.max(...last.sets.map((x) => x.w));
  if (topW <= 0) {
    // Peso corporal: superar tu mejor serie reciente en repeticiones
    const bestR = Math.max(...recent.flatMap((x) => x.sets.map((y) => y.r)));
    return { w: 0, r: bestR + 1, bw: true };
  }
  const bests = recent.map((x) => Math.max(...x.sets.map((y) => e1rm(y.w, Math.min(y.r, 20)))));
  const base = Math.max(...bests);
  const rising = bests.length >= 2 && bests[bests.length - 1] >= bests[0];
  const boost = rising ? 0.03 : 0.02;
  const reps = targetReps || last.sets[0].r;
  let w = Math.floor(((base * (1 + boost)) / (1 + reps / 30)) / inc) * inc;
  const doneAtReps = Math.max(0, ...last.sets.filter((x) => x.r >= reps).map((x) => x.w));
  if (w <= doneAtReps) w = doneAtReps + inc;
  if (w <= 0) w = inc;
  const topSet = last.sets.reduce((m, x) => (x.w > m.w || (x.w === m.w && x.r > m.r) ? x : m), last.sets[0]);
  return { w: round(w, 2), r: reps, base: round(base, 1), from: topSet };
}
function challengeInfo(dayKey) {
  const d = S.days[dayKey];
  if (!d || !d.ex.length) return { ok: false, list: [], ready: 0, need: 1 };
  const list = d.ex.map((r) => ({ exId: r.exId, sets: r.sets, reps: r.reps, ch: challengeFor(r.exId, r.reps), n: sessionsFor(r.exId).length }));
  const ready = list.filter((x) => x.ch).length;
  const need = Math.max(1, Math.ceil(d.ex.length / 2));
  return { ok: ready >= need, list, ready, need };
}
const beatChallenge = (s, ch) => ch && s.w >= ch.w && s.r >= ch.r;

function initialEditor(exId, targetReps) {
  const prev = lastSessionFor(exId);
  if (prev) return { w: prev.sets[0].w, r: prev.sets[0].r };
  return { w: 20, r: targetReps || 10 };
}
function newDraftEx(exId, target = 0, targetReps = 0) {
  return { exId, target, targetReps, sets: [], ed: initialEditor(exId, targetReps), sel: null };
}

/* Temporizador de sesión */
let timerI;
function startTimer() {
  stopTimer();
  const tick = () => { const el = $('#timer'); if (!el || !S.draft) return; const s = Math.floor((Date.now() - S.draft.start) / 1000); el.textContent = s >= 3600 ? `${Math.floor(s / 3600)}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}` : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
  tick(); timerI = setInterval(tick, 1000);
}
function stopTimer() { clearInterval(timerI); }

/* ================= Vista: Rutinas ================= */
function viewRoutines() {
  const k = U.routineDay;
  const d = S.days[k];
  const rows = d.ex.map((r, i) => {
    const ex = exById(r.exId);
    return `<div class="row"><div class="ex-ico">${exIcon(ex.icon)}</div>
      <button class="grow" style="text-align:left" data-act="editTarget" data-i="${i}"><div class="t">${esc(ex.name)}</div><div class="s"><span class="accent" style="font-weight:500">${r.sets} × ${r.reps}</span> · ${esc(ex.muscle)}</div></button>
      <button class="tiny-btn" data-act="mv" data-i="${i}" data-d="-1" ${i === 0 ? 'disabled' : ''} aria-label="Subir">${ui('up')}</button>
      <button class="tiny-btn" data-act="mv" data-i="${i}" data-d="1" ${i === d.ex.length - 1 ? 'disabled' : ''} aria-label="Bajar">${ui('down')}</button>
      <button class="tiny-btn danger" data-act="rmRoutine" data-i="${i}" aria-label="Quitar">${ui('x')}</button></div>`;
  }).join('');
  return `
    <div class="chips">${DAY_ORDER.map((key) => `<button class="chip ${k === key ? 'on' : ''}" data-act="routineDay" data-v="${key}">${exIcon(S.days[key].icon)}${esc(S.days[key].name)}</button>`).join('')}</div>
    <div class="card" style="margin-top:14px;display:flex;align-items:center;gap:14px">
      <div class="ex-ico acc" style="width:56px;height:56px;border-radius:16px">${exIcon(d.icon)}</div>
      <div style="flex:1;min-width:0"><div style="font-family:var(--display);font-size:26px;font-weight:300;letter-spacing:-0.03em;line-height:1">${esc(d.name)}</div><div class="muted" style="font-size:13px;margin-top:4px">${esc(d.desc || '')}</div></div>
      <button class="tiny-btn" data-act="editDay" aria-label="Editar día">${ui('edit')}</button>
    </div>
    <div class="section-title">Ejercicios · ${d.ex.length} <button data-act="addRoutine">+ Añadir</button></div>
    ${rows || '<p class="muted">Este día no tiene ejercicios. Añade algunos.</p>'}
    <button class="btn ghost" style="margin-top:12px" data-act="addRoutine">${ui('plus')}Añadir ejercicio</button>
    <p class="note">Toca un ejercicio para cambiar series × repeticiones. Estos ejercicios aparecerán automáticamente al elegir <b>${esc(d.name)}</b> en el +.</p>
    <div class="section-title">Biblioteca <button data-act="newEx">+ Crear</button></div>
    <button class="row" data-act="library"><div class="ex-ico">${exIcon('dumbbell')}</div><div class="grow"><div class="t">Todos los ejercicios</div><div class="s">${S.library.length} ejercicios · crea y edita los tuyos</div></div>${ui('chev', 'end')}</button>`;
}

/* ================= Hojas (bottom sheets) ================= */
let sheetEl = null, scrimEl = null, sheetOnClose = null;
function openSheet(title, html, onClose) {
  closeSheet(true);
  scrimEl = document.createElement('div'); scrimEl.className = 'scrim'; scrimEl.dataset.act = 'closeSheet';
  sheetEl = document.createElement('div'); sheetEl.className = 'sheet';
  sheetEl.innerHTML = `<div class="grab"></div><div class="sheet-head"><h3>${title}</h3><button class="icon-btn" data-act="closeSheet" aria-label="Cerrar">${ui('x')}</button></div><div class="sheet-body">${html}</div>`;
  document.body.append(scrimEl, sheetEl);
  sheetOnClose = onClose || null;
  pushOverlay();
  requestAnimationFrame(() => { scrimEl.classList.add('show'); sheetEl.classList.add('show'); });
  return sheetEl;
}
function closeSheet(instant) {
  if (!sheetEl) return;
  const s = sheetEl, c = scrimEl, cb = sheetOnClose;
  sheetEl = scrimEl = sheetOnClose = null;
  if (instant) { s.remove(); c.remove(); } else { s.classList.remove('show'); c.classList.remove('show'); setTimeout(() => { s.remove(); c.remove(); }, 300); }
  cb && cb();
  if (!instant) popOverlay();
}
/* Botón "atrás" de Android cierra hojas y ajustes */
let ovPushed = false, ignorePop = false, fromPop = false;
function pushOverlay() { if (!ovPushed) { try { history.pushState({ ov: 1 }, ''); ovPushed = true; } catch (e) {} } }
function popOverlay() { if (fromPop || sheetEl || pageEl || !ovPushed) return; ovPushed = false; ignorePop = true; history.back(); }

/* Selector de ejercicios de la biblioteca */
let pickerCb = null, pickerMode = 'pick';
function openPicker(title, cb, mode = 'pick') {
  openSheet(title, `<div class="search">${ui('search')}<input id="pk-q" placeholder="Buscar ejercicio" autocomplete="off"></div>
    <div class="chips" id="pk-m" style="margin:0 -18px 10px;padding:2px 18px">${['Todos', ...MUSCLES].map((m, i) => `<button class="chip ${i === 0 ? 'on' : ''}" data-act="pkMuscle" data-v="${m}">${m}</button>`).join('')}</div>
    <div id="pk-list"></div>
    <button class="btn ghost" style="margin-top:12px" data-act="newEx">${ui('plus')}Crear ejercicio nuevo</button>`, () => { pickerCb = null; });
  pickerCb = cb; pickerMode = mode;
  pkMuscle = 'Todos';
  renderPickerList();
  $('#pk-q').addEventListener('input', renderPickerList);
}
let pkMuscle = 'Todos';
function renderPickerList() {
  const el = $('#pk-list'); if (!el) return;
  const q = ($('#pk-q')?.value || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const list = S.library.filter((e) => (pkMuscle === 'Todos' || e.muscle === pkMuscle) && e.name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').includes(q));
  el.innerHTML = list.map((e) => `<button class="row" data-act="pkPick" data-id="${e.id}"><div class="ex-ico">${exIcon(e.icon)}</div><div class="grow"><div class="t">${esc(e.name)}</div><div class="s">${esc(e.muscle)}${e.custom ? ' · personalizado' : ''}</div></div>${pickerMode === 'manage' ? ui('edit', 'end') : ui('plus', 'end')}</button>`).join('') || '<p class="muted">Sin resultados.</p>';
}

/* Crear / editar ejercicio */
function openExerciseEditor(id, after) {
  const e = id ? exById(id) : { name: '', muscle: 'Pecho', icon: 'dumbbell' };
  let icon = e.icon;
  const sh = openSheet(id ? 'Editar ejercicio' : 'Nuevo ejercicio', `
    <div class="fields">
      <label class="field full text"><span>Nombre</span><input id="ne-name" value="${esc(e.name)}" placeholder="Ej. Press Arnold" autocomplete="off"></label>
      <label class="field full text"><span>Grupo muscular</span><select id="ne-muscle">${MUSCLES.map((m) => `<option ${m === e.muscle ? 'selected' : ''}>${m}</option>`).join('')}</select></label>
    </div>
    <div class="section-title">Icono</div>
    <div class="icon-grid" id="ne-icons">${ICON_LIST.map((n) => `<button data-ic="${n}" class="${n === icon ? 'on' : ''}">${exIcon(n)}</button>`).join('')}</div>
    <div class="btn-row" style="margin-top:16px">
      ${id && e.custom ? `<button class="btn danger" id="ne-del">${ui('trash')}Eliminar</button>` : ''}
      <button class="btn primary" id="ne-save">${ui('check')}Guardar</button>
    </div>
    ${id && !e.custom ? '<p class="note">Los ejercicios predeterminados se pueden renombrar pero no eliminar.</p>' : ''}`);
  $('#ne-icons', sh).addEventListener('click', (ev) => { const b = ev.target.closest('[data-ic]'); if (!b) return; icon = b.dataset.ic; sh.querySelectorAll('[data-ic]').forEach((x) => x.classList.toggle('on', x === b)); });
  $('#ne-save', sh).addEventListener('click', () => {
    const name = $('#ne-name', sh).value.trim(); if (!name) { toast('Ponle un nombre'); return; }
    const muscle = $('#ne-muscle', sh).value;
    let newId = id;
    if (id) Object.assign(exById(id), { name, muscle, icon });
    else { newId = 'c_' + uid(); S.library.push({ id: newId, name, muscle, icon, custom: true }); }
    save(); closeSheet(); render(); toast(id ? 'Ejercicio actualizado' : 'Ejercicio creado');
    after && after(newId);
  });
  $('#ne-del', sh)?.addEventListener('click', () => {
    const used = S.workouts.some((w) => w.ex.some((x) => x.exId === id));
    if (used) { toast('Tiene entrenos registrados: no se puede eliminar'); return; }
    S.library = S.library.filter((x) => x.id !== id);
    Object.values(S.days).forEach((d) => (d.ex = d.ex.filter((x) => x.exId !== id)));
    save(); closeSheet(); render(); toast('Ejercicio eliminado');
  });
}

/* Confirmación sin diálogos del navegador */
function confirmSheet(title, text, okLabel, onOk, danger = true) {
  const sh = openSheet(title, `<p class="muted" style="margin:0 0 18px">${text}</p><div class="btn-row"><button class="btn" data-act="closeSheet">Cancelar</button><button class="btn ${danger ? 'danger' : 'primary'}" id="cf-ok">${okLabel}</button></div>`);
  $('#cf-ok', sh).addEventListener('click', () => { closeSheet(); onOk(); });
}

/* Entrada numérica */
function numberSheet(title, value, unit, onOk, step = 'any') {
  const sh = openSheet(title, `<label class="field"><span>${unit}</span><input id="ns-v" type="number" inputmode="decimal" step="${step}" value="${value}"></label><button class="btn primary" style="margin-top:14px" id="ns-ok">${ui('check')}Aceptar</button>`);
  const inp = $('#ns-v', sh);
  setTimeout(() => { inp.focus(); inp.select(); }, 320);
  const go = () => { const v = parseFloat(String(inp.value).replace(',', '.')); if (!isNaN(v)) { closeSheet(); onOk(v); } };
  $('#ns-ok', sh).addEventListener('click', go);
  inp.addEventListener('keydown', (e) => e.key === 'Enter' && go());
}

/* Detalle de un entreno */
function openWorkout(id) {
  const w = S.workouts.find((x) => x.id === id); if (!w) return;
  const html = `<p class="muted" style="margin:-4px 0 8px">${cap(fmtDate(w.date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }))}</p>
    <div class="kv" style="margin-bottom:6px"><div><b>${fmtNum(wVolume(w), 0)}</b><span>Volumen kg</span></div><div><b>${w.ex.reduce((a, e) => a + e.sets.length, 0)}</b><span>Series</span></div></div>
    ${w.ex.map((e) => { const ex = exById(e.exId); const st = exStats(e); return `<div class="detail-ex"><div class="h">${exIcon(ex.icon)}<span style="flex:1">${esc(ex.name)}</span><span class="muted" style="font-size:12.5px">1RM ~${fmtKg(st.e1rm)}</span></div>${e.ch ? `<div class="s accent" style="font-size:12.5px;margin:-4px 0 8px;font-weight:500">${ui('flame', 'inl')} Reto ${e.ch.bw ? `${e.ch.r}+ reps` : `${fmtKg(e.ch.w)} kg × ${e.ch.r}+`} · ${e.sets.filter((s) => beatChallenge(s, e.ch)).length}/${e.sets.length} series superadas</div>` : ''}<div class="sets" style="margin:0">${e.sets.map((s, j) => `<span class="set-chip ${e.ch ? (beatChallenge(s, e.ch) ? 'win' : 'miss') : ''}"><i>${j + 1}</i>${fmtKg(s.w)} kg × ${s.r}</span>`).join('')}</div></div>`; }).join('')}
    <div class="btn-row" style="margin-top:16px"><button class="btn danger" id="wd-del">${ui('trash')}Eliminar</button><button class="btn" id="wd-edit">${ui('edit')}Editar</button></div>`;
  const sh = openSheet(esc(S.days[w.day]?.name || 'Libre'), html);
  $('#wd-del', sh).addEventListener('click', () => confirmSheet('Eliminar entreno', 'Se borrará este entreno y sus series. No se puede deshacer.', 'Eliminar', () => { S.workouts = S.workouts.filter((x) => x.id !== id); save(); render(); toast('Entreno eliminado'); }));
  $('#wd-edit', sh).addEventListener('click', () => {
    if (S.draft) { closeSheet(); toast('Termina o descarta el entreno en curso primero'); return; }
    S.draft = { day: w.day, date: w.date, start: w.start || Date.now(), editing: w.id, open: 0, ex: w.ex.map((e) => ({ exId: e.exId, target: 0, targetReps: 0, sets: e.sets.map((s) => ({ w: s.w, r: s.r })), ed: { w: e.sets[e.sets.length - 1].w, r: e.sets[e.sets.length - 1].r }, sel: null, ...(e.ch ? { ch: { ...e.ch } } : {}) })), challenge: !!w.challenge };
    const d = S.days[w.day]; if (d) S.draft.ex.forEach((e) => { const t = d.ex.find((x) => x.exId === e.exId); if (t) { e.target = t.sets; e.targetReps = t.reps; } });
    save(); closeSheet(); U.tab = 'log'; render();
  });
}

/* ================= Elegir modo (Normal / Reto) ================= */
function beginSession(k, challenge) {
  const d = S.days[k];
  S.draft = { day: k, date: todayISO(), start: Date.now(), open: 0, challenge: !!challenge, ex: [] };
  if (d) S.draft.ex = d.ex.map((r) => {
    const e = newDraftEx(r.exId, r.sets, r.reps);
    if (challenge) { const ch = challengeFor(r.exId, r.reps); if (ch) { e.ch = ch; e.ed = { w: ch.w, r: ch.r }; } }
    return e;
  });
  save(); render(); window.scrollTo(0, 0);
  if (!d) A.addExtra();
  if (challenge) toast('Modo Reto activado. A por el fallo', 'flame');
}
function openModeSheet(k) {
  const d = S.days[k];
  const info = challengeInfo(k);
  const preview = info.list.map((x) => {
    const ex = exById(x.exId);
    const right = x.ch
      ? (x.ch.bw ? `<div class="val accent">${x.ch.r}<span class="muted" style="font-size:12px"> reps+</span></div>` : `<div class="val"><span class="muted" style="font-size:12px;font-weight:500">${fmtKg(x.ch.from.w)}×${x.ch.from.r} →</span> <span class="accent">${fmtKg(x.ch.w)}</span><span class="muted" style="font-size:12px">×${x.ch.r}+</span></div>`)
      : `<span class="muted" style="font-size:12px;white-space:nowrap">${x.n}/${CH_MIN_SESSIONS} sesiones</span>`;
    return `<div class="row ${x.ch ? '' : 'dim'}"><div class="ex-ico">${exIcon(ex.icon)}</div><div class="grow"><div class="t">${esc(ex.name)}</div><div class="s">${x.ch ? (x.ch.bw ? 'Peso corporal · bate tu récord de reps' : `1RM est. ${fmtKg(x.ch.base)} kg`) : 'Sin datos suficientes · modo normal'}</div></div>${right}</div>`;
  }).join('');
  openSheet(esc(d.name), `
    <button class="mode-card" data-act="beginNormal" data-day="${k}">
      <div class="ex-ico">${ui('list')}</div>
      <div class="grow"><h4>Normal</h4><p>Tu rutina con los pesos de la última vez.</p></div>${ui('chev', 'end')}
    </button>
    <button class="mode-card reto ${info.ok ? '' : 'locked'}" ${info.ok ? `data-act="beginChallenge" data-day="${k}"` : 'disabled'}>
      <div class="ex-ico acc">${ui('flame')}</div>
      <div class="grow"><h4>Reto</h4><p>${info.ok ? 'Pesos calculados para llevarte al fallo, un paso por encima de tu mejor marca reciente.' : `Se desbloquea con ${CH_MIN_SESSIONS} sesiones de al menos ${info.need} ejercicios de este día. Llevas ${info.ready}/${info.need}.`}</p></div>
      ${info.ok ? ui('chev', 'end') : `<span class="lock">${info.ready}/${info.need}</span>`}
    </button>
    ${info.ok ? '' : `<div class="meter"><i style="width:${(info.ready / info.need) * 100}%"></i></div>`}
    <div class="section-title">${info.ok ? 'Pesos del reto' : 'Progreso del reto'}</div>
    ${preview}
    <p class="note">Cada serie del reto se hace al fallo: llega como mínimo a las repeticiones indicadas y, si puedes, haz más. Si una serie te queda grande, baja el peso en el momento.</p>`);
}

/* ================= Ajustes ================= */
let pageEl = null;
function openSettings() {
  pageEl?.remove();
  pageEl = document.createElement('div'); pageEl.className = 'page';
  document.body.append(pageEl);
  renderSettings();
  pushOverlay();
  requestAnimationFrame(() => pageEl.classList.add('show'));
}
function closeSettings() { if (!pageEl) return; const p = pageEl; pageEl = null; p.classList.remove('show'); setTimeout(() => p.remove(), 300); render(); popOverlay(); }
function kvHTML() {
  const P = S.profile;
  const bmi = P.weight && P.height ? P.weight / (P.height / 100) ** 2 : null;
  const lean = P.weight && P.bodyFat ? P.weight * (1 - P.bodyFat / 100) : null;
  const ffmi = lean && P.height ? lean / (P.height / 100) ** 2 : null;
  return `<div><b>${fmtNum(bmi, 1)}</b><span>IMC</span></div>
      <div><b>${fmtNum(lean, 1)}<small class="muted" style="font-size:13px"> kg</small></b><span>Masa magra</span></div>
      <div><b>${fmtNum(ffmi, 1)}</b><span>FFMI</span></div>
      <div><b>${S.bodyLog.length}</b><span>Mediciones</span></div>`;
}
function renderSettings() {
  if (!pageEl) return;
  const P = S.profile;
  const f = (key, label, unit, full) => `<label class="field ${full ? 'full' : ''}"><span>${label}</span><div class="field-row"><input type="number" inputmode="decimal" step="any" data-field="${key}" value="${P[key] ?? ''}" placeholder="—"><span class="unit">${unit}</span></div></label>`;

  // PRs: auto + manuales
  const autoPR = {};
  S.workouts.forEach((w) => w.ex.forEach((e) => e.sets.forEach((s) => { const c = autoPR[e.exId]; if (!c || s.w > c.w || (s.w === c.w && s.r > c.r)) autoPR[e.exId] = { w: s.w, r: s.r, date: w.date }; })));
  const manual = [...S.prs].sort((a, b) => (a.date < b.date ? 1 : -1));
  const log = [...S.bodyLog].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 8);

  pageEl.innerHTML = `<div class="page-inner">
    <header class="top"><button class="icon-btn" data-act="closeSettings" aria-label="Volver">${ui('back')}</button><h1>Ajustes</h1></header>

    <div class="section-title">Perfil</div>
    <div class="fields">
      <label class="field full text"><span>Nombre</span><input data-field="name" data-text="1" value="${esc(P.name)}" placeholder="Tu nombre" autocomplete="off"></label>
      ${f('height', 'Altura', 'cm')}${f('age', 'Edad', 'años')}
    </div>

    <div class="section-title">Medidas corporales</div>
    <div class="fields">
      ${f('weight', 'Peso', 'kg')}${f('bodyFat', 'Grasa', '%')}${f('waist', 'Cintura', 'cm')}${f('arm', 'Brazo', 'cm')}
    </div>
    <div class="kv" id="kv">${kvHTML()}</div>
    <button class="btn primary" style="margin-top:12px" data-act="logBody">${ui('scale')}Guardar medición de hoy</button>
    <p class="note">Cada medición se guarda con fecha y aparece en la gráfica de "Cuerpo" en Progreso.</p>
    ${log.length ? `<div style="margin-top:10px">${log.map((l) => `<div class="row"><div class="grow"><div class="t" style="text-transform:capitalize">${fmtDate(l.date)}</div><div class="s">${[l.weight != null ? fmtNum(l.weight) + ' kg' : '', l.bodyFat != null ? fmtNum(l.bodyFat) + '% grasa' : '', l.waist != null ? 'cintura ' + fmtNum(l.waist) : '', l.arm != null ? 'brazo ' + fmtNum(l.arm) : ''].filter(Boolean).join(' · ')}</div></div><button class="tiny-btn danger" data-act="rmBody" data-id="${l.id}">${ui('trash')}</button></div>`).join('')}</div>` : ''}

    <div class="section-title">Mis PRs <button data-act="addPR">+ Añadir</button></div>
    ${manual.map((p) => { const ex = exById(p.exId); return `<div class="row"><div class="ex-ico acc">${exIcon(ex.icon)}</div><div class="grow"><div class="t">${esc(ex.name)}</div><div class="s">Manual · ${fmtShort(p.date)}</div></div><div class="val">${fmtKg(p.w)}<span class="muted" style="font-size:13px"> ×${p.r}</span></div><button class="tiny-btn danger" data-act="rmPR" data-id="${p.id}">${ui('trash')}</button></div>`; }).join('')}
    ${Object.entries(autoPR).map(([id, p]) => { const ex = exById(id); return `<div class="row"><div class="ex-ico">${exIcon(ex.icon)}</div><div class="grow"><div class="t">${esc(ex.name)}</div><div class="s">Registrado · ${fmtShort(p.date)}</div></div><div class="val">${fmtKg(p.w)}<span class="muted" style="font-size:13px"> ×${p.r}</span></div></div>`; }).join('')}
    ${!manual.length && !Object.keys(autoPR).length ? '<p class="muted">Añade tus marcas personales o se detectarán solas al entrenar.</p>' : ''}

    <div class="section-title">Preferencias</div>
    <div class="fields">
      <label class="field text"><span>Incremento de peso</span><select data-pref="inc">${[0.5, 1, 1.25, 2.5, 5].map((v) => `<option value="${v}" ${S.prefs.inc === v ? 'selected' : ''}>${fmtKg(v)} kg</option>`).join('')}</select></label>
      <label class="field text"><span>Máximo de la barra</span><select data-pref="maxW">${[100, 150, 200, 250, 300, 400].map((v) => `<option value="${v}" ${S.prefs.maxW === v ? 'selected' : ''}>${v} kg</option>`).join('')}</select></label>
    </div>

    <div class="section-title">Datos</div>
    <button class="row" data-act="export"><div class="ex-ico">${ui('download')}</div><div class="grow"><div class="t">Exportar copia de seguridad</div><div class="s">Descarga un archivo .json con todo</div></div></button>
    <button class="row" data-act="import"><div class="ex-ico">${ui('upload')}</div><div class="grow"><div class="t">Importar copia</div><div class="s">Restaura desde un archivo .json</div></div></button>
    <button class="row" data-act="reset"><div class="ex-ico" style="color:var(--accent-2)">${ui('trash')}</div><div class="grow"><div class="t" style="color:var(--accent-2)">Borrar todos los datos</div><div class="s">Entrenos, medidas, rutinas y PRs</div></div></button>
    <p class="note">Todo se guarda solo en este dispositivo (almacenamiento local del navegador). Exporta una copia de vez en cuando.</p>
    <p class="note" style="text-align:center;margin-top:24px">FORJA · v1.0</p>
  </div>`;
}

/* ================= Acciones ================= */
const A = {
  tab(el) { U.tab = el.dataset.tab; render(); window.scrollTo(0, 0); },
  settings() { openSettings(); },
  closeSettings() { closeSettings(); },
  closeSheet() { closeSheet(); },
  filter(el) { U.filter = el.dataset.v; render(); },
  chartEx(el) { U.chartEx = el.dataset.v; render(); },
  metric(el) { U.metric = el.dataset.v; render(); },
  bodyMetric(el) { U.bodyMetric = el.dataset.v; render(); },
  pt(el) { const ro = $('#ro-' + el.dataset.id); if (ro) ro.innerHTML = el.dataset.label; },
  workout(el) { openWorkout(el.dataset.id); },
  histAll() { U.histAll = !U.histAll; render(); },

  /* --- sesión --- */
  startDay(el) {
    const k = el.dataset.day;
    if (!S.days[k]) { beginSession(k, false); return; }
    openModeSheet(k);
  },
  beginNormal(el) { closeSheet(); beginSession(el.dataset.day, false); },
  beginChallenge(el) { closeSheet(); beginSession(el.dataset.day, true); },
  toggleEx(el) { const i = +el.dataset.i; S.draft.open = S.draft.open === i ? null : i; save(); render(); setTimeout(() => $('#exc-' + i)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 30); },
  w(el) { const e = S.draft.ex[+el.dataset.i]; e.ed.w = clamp(round(e.ed.w + +el.dataset.d * S.prefs.inc, 2), 0, 1000); syncEditor(+el.dataset.i); vibrate(); },
  r(el) { const e = S.draft.ex[+el.dataset.i]; e.ed.r = clamp(e.ed.r + +el.dataset.d, 0, 100); syncEditor(+el.dataset.i); vibrate(); },
  loadCh(el) { const e = S.draft.ex[+el.dataset.i]; if (!e.ch) return; e.ed = { w: e.ch.w, r: e.ch.r }; e.sel = null; save(); render(); },
  rq(el) { const e = S.draft.ex[+el.dataset.i]; e.ed.r = +el.dataset.v; syncEditor(+el.dataset.i); },
  typeW(el) { const i = +el.dataset.i, e = S.draft.ex[i]; numberSheet('Peso', e.ed.w, 'Kilos', (v) => { e.ed.w = clamp(round(v, 2), 0, 1000); save(); render(); }); },
  selSet(el) { const i = +el.dataset.i, j = +el.dataset.j, e = S.draft.ex[i]; if (e.sel === j) { e.sel = null; } else { e.sel = j; e.ed = { w: e.sets[j].w, r: e.sets[j].r }; } save(); render(); },
  saveSet(el) {
    const i = +el.dataset.i, e = S.draft.ex[i];
    if (e.ed.r <= 0) { toast('Indica las repeticiones'); return; }
    const set = { w: e.ed.w, r: e.ed.r };
    const best = bestFor(e.exId, S.draft.editing);
    const draftBest = e.sets.reduce((m, s, j) => (j === e.sel ? m : Math.max(m, s.w)), 0);
    const isPR = best.w > 0 && set.w > best.w && set.w > draftBest;
    if (isPR) set.pr = true;
    if (e.sel != null) { e.sets[e.sel] = set; e.sel = null; toast('Serie actualizada'); }
    else {
      e.sets.push(set);
      if (isPR) toast('¡Nuevo PR! ' + fmtKg(set.w) + ' kg', 'flame');
      else if (e.ch && beatChallenge(set, e.ch)) toast(`Reto superado · ${fmtKg(set.w)} kg × ${set.r}`, 'flame');
      else if (e.ch) toast(`Serie ${e.sets.length} · ${set.r}/${e.ch.r} reps del reto`, 'check');
      else toast(`Serie ${e.sets.length} · ${fmtKg(set.w)} kg × ${set.r}`, 'check');
    }
    // Al completar el objetivo, abre el siguiente ejercicio pendiente
    if (e.target && e.sets.length === e.target) {
      const next = S.draft.ex.findIndex((x, k) => k > i && x.sets.length < (x.target || 1));
      if (next >= 0) { S.draft.open = next; save(); render(); setTimeout(() => $('#exc-' + next)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60); return; }
    }
    save(); render();
  },
  delSet(el) { const e = S.draft.ex[+el.dataset.i]; if (e.sel == null) return; e.sets.splice(e.sel, 1); e.sel = null; save(); render(); },
  rmEx(el) { const i = +el.dataset.i; const e = S.draft.ex[i]; const go = () => { S.draft.ex.splice(i, 1); S.draft.open = null; save(); render(); }; e.sets.length ? confirmSheet('Quitar ejercicio', 'Tiene series registradas en esta sesión. ¿Quitarlo?', 'Quitar', go) : go(); },
  addExtra() { openPicker('Añadir ejercicio', (id) => { S.draft.ex.push(newDraftEx(id)); S.draft.open = S.draft.ex.length - 1; save(); closeSheet(); render(); setTimeout(() => $('#exc-' + S.draft.open)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60); }); },
  editDate() { const sh = openSheet('Fecha del entreno', `<label class="field text"><span>Fecha</span><input type="date" id="dt" value="${S.draft.date}" max="${todayISO()}"></label><button class="btn primary" style="margin-top:14px" id="dt-ok">${ui('check')}Aceptar</button>`); $('#dt-ok', sh).addEventListener('click', () => { const v = $('#dt', sh).value; if (v) S.draft.date = v; save(); closeSheet(); render(); }); },
  finish() {
    const D = S.draft;
    const ex = D.ex.filter((e) => e.sets.length).map((e) => ({ exId: e.exId, sets: e.sets.map((s) => ({ w: s.w, r: s.r })), ...(e.ch ? { ch: { w: e.ch.w, r: e.ch.r, bw: !!e.ch.bw } } : {}) }));
    if (!ex.length) { toast('Registra al menos una serie'); return; }
    const prs = ex.filter((e) => { const b = bestFor(e.exId, D.editing); return Math.max(...e.sets.map((s) => s.w)) > b.w && b.w > 0; }).length;
    const w = { id: D.editing || uid(), date: D.date, day: D.day, start: D.start, end: D.editing ? (S.workouts.find((x) => x.id === D.editing)?.end || Date.now()) : Date.now(), ex, ...(D.challenge ? { challenge: true } : {}) };
    const chEx = ex.filter((e) => e.ch), chWon = chEx.filter((e) => e.sets.some((s) => beatChallenge(s, e.ch))).length;
    if (D.editing) S.workouts = S.workouts.map((x) => (x.id === D.editing ? w : x)); else S.workouts.push(w);
    S.draft = null; save(true);
    U.tab = 'progress'; U.filter = 'all'; render(); window.scrollTo(0, 0);
    if (chEx.length) toast(`Reto: ${chWon}/${chEx.length} ejercicios superados${prs ? ` · ${prs} PR${prs > 1 ? 's' : ''}` : ''}`, 'flame');
    else toast(prs ? `Entreno guardado · ${prs} PR${prs > 1 ? 's' : ''} nuevos` : `Entreno guardado · ${fmtNum(wVolume(w), 0)} kg`, prs ? 'flame' : 'check');
  },
  discard() { confirmSheet(S.draft.editing ? 'Descartar cambios' : 'Descartar entreno', S.draft.editing ? 'Se mantendrá la versión guardada.' : 'Se perderán las series de esta sesión.', 'Descartar', () => { S.draft = null; save(true); render(); }); },

  /* --- rutinas --- */
  routineDay(el) { U.routineDay = el.dataset.v; render(); },
  mv(el) { const d = S.days[U.routineDay].ex, i = +el.dataset.i, j = i + +el.dataset.d; if (j < 0 || j >= d.length) return; [d[i], d[j]] = [d[j], d[i]]; save(); render(); },
  rmRoutine(el) { S.days[U.routineDay].ex.splice(+el.dataset.i, 1); save(); render(); },
  addRoutine() { openPicker('Añadir a ' + S.days[U.routineDay].name, (id) => { const d = S.days[U.routineDay]; if (d.ex.some((x) => x.exId === id)) { toast('Ya está en este día'); return; } d.ex.push({ exId: id, sets: 3, reps: 10 }); save(); render(); toast(exById(id).name + ' añadido'); }); },
  editTarget(el) {
    const i = +el.dataset.i, r = S.days[U.routineDay].ex[i], ex = exById(r.exId);
    const sh = openSheet(esc(ex.name), `<div class="fields"><label class="field"><span>Series</span><input type="number" inputmode="numeric" id="tg-s" value="${r.sets}"></label><label class="field"><span>Repeticiones</span><input type="number" inputmode="numeric" id="tg-r" value="${r.reps}"></label></div><button class="btn primary" style="margin-top:14px" id="tg-ok">${ui('check')}Guardar</button><button class="btn" style="margin-top:8px" id="tg-ex">${ui('edit')}Editar ejercicio</button>`);
    $('#tg-ok', sh).addEventListener('click', () => { r.sets = clamp(parseInt($('#tg-s', sh).value) || 1, 1, 20); r.reps = clamp(parseInt($('#tg-r', sh).value) || 1, 1, 100); save(); closeSheet(); render(); });
    $('#tg-ex', sh).addEventListener('click', () => openExerciseEditor(r.exId));
  },
  editDay() {
    const d = S.days[U.routineDay]; let icon = d.icon;
    const sh = openSheet('Editar día', `<div class="fields"><label class="field full text"><span>Nombre</span><input id="ed-n" value="${esc(d.name)}"></label><label class="field full text"><span>Descripción</span><input id="ed-d" value="${esc(d.desc || '')}"></label></div><div class="section-title">Icono</div><div class="icon-grid" id="ed-ic">${ICON_LIST.map((n) => `<button data-ic="${n}" class="${n === icon ? 'on' : ''}">${exIcon(n)}</button>`).join('')}</div><button class="btn primary" style="margin-top:16px" id="ed-ok">${ui('check')}Guardar</button>`);
    $('#ed-ic', sh).addEventListener('click', (ev) => { const b = ev.target.closest('[data-ic]'); if (!b) return; icon = b.dataset.ic; sh.querySelectorAll('[data-ic]').forEach((x) => x.classList.toggle('on', x === b)); });
    $('#ed-ok', sh).addEventListener('click', () => { d.name = $('#ed-n', sh).value.trim() || d.name; d.desc = $('#ed-d', sh).value.trim(); d.icon = icon; save(); closeSheet(); render(); });
  },
  library() { openPicker('Biblioteca', (id) => openExerciseEditor(id, () => {}), 'manage'); },
  newEx() { const cb = pickerCb, mode = pickerMode; openExerciseEditor(null, (id) => { if (cb && mode === 'pick') cb(id); }); },
  pkMuscle(el) { pkMuscle = el.dataset.v; $('#pk-m').querySelectorAll('.chip').forEach((c) => c.classList.toggle('on', c === el)); renderPickerList(); },
  pkPick(el) { pickerCb && pickerCb(el.dataset.id); },

  /* --- ajustes --- */
  logBody() {
    const P = S.profile;
    if (P.weight == null && P.bodyFat == null && P.waist == null && P.arm == null) { toast('Introduce al menos una medida'); return; }
    const date = todayISO();
    S.bodyLog = S.bodyLog.filter((l) => l.date !== date);
    S.bodyLog.push({ id: uid(), date, weight: P.weight, bodyFat: P.bodyFat, waist: P.waist, arm: P.arm });
    save(); renderSettings(); toast('Medición guardada', 'check');
  },
  rmBody(el) { S.bodyLog = S.bodyLog.filter((l) => l.id !== el.dataset.id); save(); renderSettings(); },
  addPR() {
    let exId = null;
    const sh = openSheet('Nuevo PR', `<button class="row" id="pr-ex"><div class="ex-ico">${exIcon('dumbbell')}</div><div class="grow"><div class="t">Elige ejercicio</div><div class="s">Toca para seleccionar</div></div>${ui('chev', 'end')}</button>
      <div class="fields" style="margin-top:10px"><label class="field"><span>Peso (kg)</span><input type="number" inputmode="decimal" step="any" id="pr-w"></label><label class="field"><span>Reps</span><input type="number" inputmode="numeric" id="pr-r" value="1"></label><label class="field full text"><span>Fecha</span><input type="date" id="pr-d" value="${todayISO()}" max="${todayISO()}"></label></div>
      <button class="btn primary" style="margin-top:14px" id="pr-ok">${ui('trophy')}Guardar PR</button>`);
    const state = { w: '', r: '1', d: todayISO() };
    const bind = (s) => {
      $('#pr-ex', s).addEventListener('click', () => {
        state.w = $('#pr-w', s).value; state.r = $('#pr-r', s).value; state.d = $('#pr-d', s).value;
        openPicker('Ejercicio del PR', (id) => { exId = id; reopen(); });
      });
      $('#pr-ok', s).addEventListener('click', () => {
        const w = parseFloat(String($('#pr-w', s).value).replace(',', '.')), r = parseInt($('#pr-r', s).value) || 1;
        if (!exId) { toast('Elige un ejercicio'); return; } if (!(w > 0)) { toast('Indica el peso'); return; }
        S.prs.push({ id: uid(), exId, w, r, date: $('#pr-d', s).value || todayISO() }); save(); closeSheet(); renderSettings(); toast('PR guardado', 'trophy');
      });
    };
    const reopen = () => {
      const ex = exById(exId);
      const s = openSheet('Nuevo PR', `<button class="row" id="pr-ex"><div class="ex-ico acc">${exIcon(ex.icon)}</div><div class="grow"><div class="t">${esc(ex.name)}</div><div class="s">${esc(ex.muscle)}</div></div>${ui('chev', 'end')}</button>
        <div class="fields" style="margin-top:10px"><label class="field"><span>Peso (kg)</span><input type="number" inputmode="decimal" step="any" id="pr-w" value="${esc(state.w)}"></label><label class="field"><span>Reps</span><input type="number" inputmode="numeric" id="pr-r" value="${esc(state.r)}"></label><label class="field full text"><span>Fecha</span><input type="date" id="pr-d" value="${esc(state.d)}" max="${todayISO()}"></label></div>
        <button class="btn primary" style="margin-top:14px" id="pr-ok">${ui('trophy')}Guardar PR</button>`);
      bind(s);
    };
    bind(sh);
  },
  rmPR(el) { S.prs = S.prs.filter((p) => p.id !== el.dataset.id); save(); renderSettings(); },
  export() {
    const blob = new Blob([JSON.stringify(S, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `forja-backup-${todayISO()}.json`;
    document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    toast('Copia exportada', 'download');
  },
  import() {
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'application/json,.json';
    inp.onchange = () => { const f = inp.files[0]; if (!f) return; f.text().then((t) => { try { const d = JSON.parse(t); if (!d || !Array.isArray(d.workouts)) throw 0; confirmSheet('Importar copia', `Se reemplazarán tus datos actuales por los del archivo (${d.workouts.length} entrenos).`, 'Importar', () => { S = Object.assign(defaults(), d); save(true); renderSettings(); render(); toast('Datos importados', 'check'); }, false); } catch (e) { toast('Archivo no válido'); } }); };
    inp.click();
  },
  reset() { confirmSheet('Borrar todo', 'Se eliminarán entrenos, medidas, PRs y rutinas personalizadas de este dispositivo.', 'Borrar todo', () => { S = defaults(); save(true); renderSettings(); render(); toast('Datos borrados'); }); },
};

function syncEditor(i) {
  const e = S.draft.ex[i];
  const wv = $('#wv-' + i), rv = $('#rv-' + i), rg = document.querySelector(`[data-range="${i}"]`);
  if (wv) wv.textContent = fmtKg(e.ed.w);
  if (rv) rv.textContent = e.ed.r;
  if (rg) { if (e.ed.w > +rg.max) { render(); return; } rg.value = e.ed.w; rg.style.setProperty('--p', (e.ed.w / rg.max) * 100 + '%'); }
  save();
}
function vibrate() { try { navigator.vibrate && navigator.vibrate(8); } catch (e) {} }

/* ================= Eventos ================= */
document.addEventListener('click', (ev) => {
  const el = ev.target.closest('[data-act]');
  if (!el || el.disabled) return;
  const fn = A[el.dataset.act];
  if (fn) { ev.preventDefault(); fn(el); }
});
document.addEventListener('input', (ev) => {
  const t = ev.target;
  if (t.dataset.range != null && S.draft) {
    const i = +t.dataset.range, e = S.draft.ex[i];
    e.ed.w = +t.value;
    t.style.setProperty('--p', (t.value / t.max) * 100 + '%');
    const wv = $('#wv-' + i); if (wv) wv.textContent = fmtKg(e.ed.w);
    save();
  }
});
document.addEventListener('change', (ev) => {
  const t = ev.target;
  if (t.dataset.field) {
    const k = t.dataset.field;
    if (t.dataset.text) S.profile[k] = t.value.trim();
    else { const v = parseFloat(String(t.value).replace(',', '.')); S.profile[k] = isNaN(v) ? null : v; }
    save(); const kv = $('#kv'); if (kv) kv.innerHTML = kvHTML();
  } else if (t.dataset.pref) {
    S.prefs[t.dataset.pref] = parseFloat(t.value); save(); renderSettings();
  }
});
window.addEventListener('popstate', () => {
  if (ignorePop) { ignorePop = false; return; }
  ovPushed = false; fromPop = true;
  if (sheetEl) closeSheet(); else if (pageEl) closeSettings();
  fromPop = false;
  if (sheetEl || pageEl) pushOverlay();
});

/* ================= Toast ================= */
let toastT;
function toast(msg, icon) {
  let el = $('.toast');
  if (!el) { el = document.createElement('div'); el.className = 'toast'; document.body.append(el); }
  el.innerHTML = (icon ? ui(icon) : '') + esc(msg);
  requestAnimationFrame(() => el.classList.add('show'));
  clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('show'), 2200);
}

/* ================= Inicio ================= */
render();
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
