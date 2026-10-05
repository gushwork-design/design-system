/* ============================================================================
   Gushwork dashboard — 55 charts   (GD.charts)
   Dependency-free. A builder passes arrays; this returns HTML/SVG. Extracted and generalised from the
   hub's hand-built charts (web/admin/analytics.html:1294-1370 line, :1395-1405 split, :1445-1475 donut).

   API (window.GD.charts)
     render(type, spec, opt)   -> HTML string. Pure (no DOM), so it also runs in Node for static previews.
     mount(host, type, spec)   -> renders into host and wires measuring (tick thinning, decimation).
     update(host, patch)       -> merge into the spec and redraw.
     state(host, name, o)      -> 'ready' | 'loading' | 'empty' | 'error'. o = {title, message}.
     toggle(host, i[, on])     -> show/hide series i.   zoom(host, [from, to] | null)  -> zoom to a slice.
     init(scope)               -> mount every [data-gd-chart] under scope (runs on DOMContentLoaded).
     niceScale(min, max, n)    -> {min, max, step, ticks}.   format(spec) -> {axis(v, step, max), full(v)}.
     tipHTML({head, rows, total}) -> the chart-tooltip markup.   config -> {palette, locale, maxPoints}.
   types: line, area, bar, hbar, donut, breakdown, spark, heatmap, funnel, uptime, legend-table.

   Spec (shared): {title, description, size:'sm'|'md'|'lg', card, frame:false, id, legend:true|false|'table'|'static',
     actions, switcher, menu (trusted HTML strings), footnote, state, error, palette:'default'|'extended',
     format:'number'|'compact'|'percent'|fn, prefix, unit, alt, table:false}
   Spec (line / area / bar): {labels:[...], titles:[...], series:[{name, data:[...], tone, comparison, forecastFrom,
     axis:'y2', dashed}], smooth, fill, mode:'stack'|'grouped'|'waterfall', diverging, scale:'log', zero:false,
     refs:[{value, label, tone}], incomplete:{from, label}, events:[{at, label, detail, tone}], brush:false, maxPoints}

   data-gd-* hooks (all delegated on document, so they survive a slot being replaced):
     data-gd-chart="<type>" + data-gd-spec='{json}'   declarative mount.
     data-gd-chart-root                               the element a chart renders into (set by mount/render).
     data-gd-series="<i>"                             a legend key or a legend-table checkbox: toggles series i.
     data-gd-for="#id"                                on a legend-table: the chart it drives.
     data-gd-chart-reset                              button: leave a brush zoom.   data-gd-chart-retry: error state, fires gd:chart-retry.
     data-gd-tip, data-gd-tip-body, data-gd-tip-c     element that shows a tooltip in its closest [data-gd-tipbox] on hover/focus.
   Events (on the chart root, bubbling): gd:range {from,to,fromLabel,toLabel,labels} (cancelable: preventDefault
     to zoom yourself), gd:chart-retry, gd:series {index, on}.
   Keyboard: plot is focusable; Left/Right move the crosshair, Home/End jump, PageUp/PageDown move 10%, Esc hides it.
     Shift+Left/Right selects a range, Enter commits it (gd:range). Heatmap: arrows in 2D. Uptime bar: Left/Right.
   Motion: only hover transitions and the loading pulse, both switched off by 00-base under reduced motion.
   ============================================================================ */

const GD = (window.GD = window.GD || {});
const C = (GD.charts = {});
const DOC = typeof document !== 'undefined' ? document : null;
C.config = { palette: 'default', locale: 'en-US', maxPoints: 0 };

const PAL = { default: 3, extended: 8 };
const TONE = { accent: 'var(--gd-accent)', good: 'var(--gd-good)', warn: 'var(--gd-warn)', danger: 'var(--gd-danger)', neutral: 'var(--gw-color-neutral-400)', ink: 'var(--gd-text)', muted: 'var(--gd-text-muted)' };
const specs = new WeakMap(), models = new WeakMap(), ui = new WeakMap();
let uid = 0, warned = {};

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = (v) => typeof v === 'number' && isFinite(v);
const f1 = (n) => Math.round(n * 10) / 10;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const warnOnce = (k, m) => { if (!warned[k]) { warned[k] = 1; if (typeof console !== 'undefined') console.warn('GD.charts: ' + m); } };
const nid = (p) => p + (++uid).toString(36);

/* ---- palette ---------------------------------------------------------------- */
const palName = (spec) => (spec.palette || C.config.palette) === 'extended' ? 'extended' : 'default';
const ceilOf = (spec) => PAL[palName(spec)];
const slotColor = (k, spec) => 'var(--gd-series-' + (palName(spec) === 'extended' ? 'x' : '') + (k + 1) + ')';
const toneColor = (t) => TONE[t] || t;

/* ---- number formatting ------------------------------------------------------ */
const grp = (v, dec, min) => Number(v).toLocaleString(C.config.locale, { maximumFractionDigits: dec == null ? 2 : dec, minimumFractionDigits: min || 0 });
const compact = (v) => {
  const a = Math.abs(v), u = a >= 1e9 ? [1e9, 'B'] : a >= 1e6 ? [1e6, 'M'] : a >= 1e3 ? [1e3, 'k'] : null;
  if (!u) return grp(v, a < 10 && a % 1 ? 1 : 0);
  const s = v / u[0];
  return (Math.abs(s) >= 100 ? s.toFixed(0) : s.toFixed(1)).replace(/\.0$/, '') + u[1];
};
const decOf = (step) => { const s = String(Math.round(step * 1e6) / 1e6), k = s.indexOf('.'); return k < 0 ? 0 : s.length - k - 1; };
function mkFmt(spec) {
  const f = spec.format, pre = spec.prefix || '', suf = spec.unit != null ? spec.unit : (f === 'percent' ? '%' : '');
  if (typeof f === 'function') return { axis: (v) => f(v), full: (v) => f(v) };
  const wrap = (v, body) => (v < 0 ? '-' : '') + pre + body + suf;
  return {
    axis: (v, step, max) => v === 0 ? pre + '0' : wrap(v, (f === 'compact' || (!f && max >= 1e4)) ? compact(Math.abs(v)) : grp(Math.abs(v), decOf(step || 1), decOf(step || 1))),
    full: (v) => wrap(v, f === 'compact' && Math.abs(v) >= 1e6 ? compact(Math.abs(v)) : grp(Math.abs(v), 2)),
  };
}
C.format = mkFmt;

/* ---- 'nice' axis ticks: exactly `count` intervals so a second axis lines up --------------------- */
function niceScale(min, max, count) {
  count = count || 5;
  if (!(max > min)) { if (max > 0) min = 0; else if (max < 0) max = 0; else max = 1; }
  const raw = (max - min) / count, mag = Math.pow(10, Math.floor(Math.log10(raw)));
  let step = 0, lo = 0;
  for (const m of [1, 2, 2.5, 5, 10, 20, 25, 50, 100]) {
    step = m * mag; lo = Math.floor(min / step + 1e-9) * step;
    if (lo + count * step >= max - 1e-9) break;
  }
  const r = (x) => +x.toFixed(10), ticks = [];
  for (let i = 0; i <= count; i++) ticks.push(r(lo + i * step));
  return { min: r(lo), max: r(lo + count * step), step: r(step), ticks };
}
C.niceScale = niceScale;

function mkAxis(vals, o) {
  let lo = Infinity, hi = -Infinity;
  vals.forEach((v) => { if (num(v)) { if (v < lo) lo = v; if (v > hi) hi = v; } });
  if (lo === Infinity) { lo = 0; hi = 1; }
  if (o.log) {
    const pos = vals.filter((v) => num(v) && v > 0), mn = pos.length ? Math.min(...pos) : 1, mx = pos.length ? Math.max(...pos) : 10;
    let a = Math.floor(Math.log10(mn) + 1e-9), b = Math.ceil(Math.log10(mx) - 1e-9);
    if (b <= a) b = a + 1;
    const ticks = []; for (let e = a; e <= b; e++) ticks.push(Math.pow(10, e));
    const L = Math.log10;
    return { lo: ticks[0], hi: ticks[ticks.length - 1], ticks, step: 1, log: true, pos: (v) => v > 0 ? clamp((L(v) - a) / (b - a), 0, 1) : 0 };
  }
  if (o.zero) { lo = Math.min(lo, 0); hi = Math.max(hi, 0); }
  const s = niceScale(lo, hi, o.count || 5);
  return { lo: s.min, hi: s.max, ticks: s.ticks, step: s.step, log: false, pos: (v) => (v - s.min) / (s.max - s.min) };
}

/* ---- paths ------------------------------------------------------------------ */
const P = (p) => Math.round(p.x) + ' ' + Math.round(p.y);        // the viewBox is 1000 wide: integers are sub-pixel accurate
function straight(seg) { if (seg.length === 1) return 'M' + P(seg[0]) + 'l0 0'; return 'M' + seg.map(P).join('L'); }
function mono(seg) {            // monotone cubic (Fritsch-Carlson): smooth without overshoot
  const n = seg.length; if (n < 3) return straight(seg);
  const dx = [], m = [], t = [];
  for (let k = 0; k < n - 1; k++) { dx[k] = seg[k + 1].x - seg[k].x; m[k] = dx[k] ? (seg[k + 1].y - seg[k].y) / dx[k] : 0; }
  t[0] = m[0]; t[n - 1] = m[n - 2];
  for (let k = 1; k < n - 1; k++) t[k] = m[k - 1] * m[k] <= 0 ? 0 : (m[k - 1] + m[k]) / 2;
  for (let k = 0; k < n - 1; k++) {
    if (m[k] === 0) { t[k] = t[k + 1] = 0; continue; }
    const a = t[k] / m[k], b = t[k + 1] / m[k], s = a * a + b * b;
    if (s > 9) { const tau = 3 / Math.sqrt(s); t[k] = tau * a * m[k]; t[k + 1] = tau * b * m[k]; }
  }
  let d = 'M' + P(seg[0]);
  for (let k = 0; k < n - 1; k++) d += 'C' + Math.round(seg[k].x + dx[k] / 3) + ' ' + Math.round(seg[k].y + t[k] * dx[k] / 3) + ' ' + Math.round(seg[k + 1].x - dx[k] / 3) + ' ' + Math.round(seg[k + 1].y - t[k + 1] * dx[k] / 3) + ' ' + P(seg[k + 1]);
  return d;
}
const pathOf = (seg, smooth) => (smooth ? mono(seg) : straight(seg));
function segments(pts) { const out = []; let cur = []; pts.forEach((p) => { if (p.y == null) { if (cur.length) out.push(cur); cur = []; } else cur.push(p); }); if (cur.length) out.push(cur); return out; }

/* min/max-per-bucket decimation: keeps every peak, drops what a pixel cannot show */
function decimate(data, max) {
  const n = data.length; if (n <= max) return null;
  const nb = Math.max(1, Math.floor(max / 2)), size = n / nb, keep = [0];
  for (let b = 0; b < nb; b++) {
    const a = Math.floor(b * size), z = Math.min(n, Math.floor((b + 1) * size)); let lo = -1, hi = -1, nul = -1;
    for (let i = a; i < z; i++) {
      const v = data[i];
      if (!num(v)) { if (nul < 0) nul = i; continue; }
      if (lo < 0 || v < data[lo]) lo = i; if (hi < 0 || v > data[hi]) hi = i;
    }
    const s = [lo, hi, nul].filter((x) => x >= 0).sort((x, y) => x - y);
    s.forEach((x, k) => { if (x !== keep[keep.length - 1] && (k === 0 || x !== s[k - 1])) keep.push(x); });
  }
  if (keep[keep.length - 1] !== n - 1) keep.push(n - 1);
  return keep;
}

/* ---- text alternative helpers ------------------------------------------------ */
const svgIcon = { bars: '<svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" aria-hidden="true"><rect x="2" y="8" width="3" height="6" rx="1"/><rect x="6.5" y="3" width="3" height="11" rx="1"/><rect x="11" y="6" width="3" height="8" rx="1"/></svg>',
  warn: '<svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" aria-hidden="true"><rect x="7" y="2" width="2" height="8" rx="1"/><rect x="7" y="12" width="2" height="2" rx="1"/></svg>' };

/* ============================================================================
   chart-tooltip
   ============================================================================ */
function tipHTML(o) {
  o = o || {};
  const rows = (o.rows || []).map((r) => '<div class="gd-tip__r">' + (r.color ? '<i class="gd-sw' + (r.dashed ? ' gd-sw--dash' : '') + '" style="--c:' + r.color + '"></i>' : '') +
    '<span class="gd-tip__k">' + esc(r.name) + '</span><span class="gd-tip__v gd-num">' + esc(r.value) + '</span></div>').join('');
  return '<div class="gd-tip__h">' + (o.head ? '<b>' + esc(o.head) + '</b>' : '') + (o.note ? ' <span class="gd-tip__n">' + esc(o.note) + '</span>' : '') + '</div>' + rows +
    (o.total != null ? '<div class="gd-tip__t"><span>' + esc(o.totalLabel || 'Total') + '</span><span class="gd-tip__v gd-num">' + esc(o.total) + '</span></div>' : '');
}
C.tipHTML = tipHTML;
function renderTip(spec) { return '<div class="gd-tip gd-tip--static" role="presentation">' + tipHTML(spec) + '</div>'; }

/* ============================================================================
   chart-frame
   ============================================================================ */
function stateHTML(spec, kind) {
  if (kind === 'loading') return '<div class="gd-chart__ghost" role="status" aria-label="Loading chart"><i style="height:45%"></i><i style="height:70%"></i><i style="height:55%"></i><i style="height:85%"></i><i style="height:60%"></i><i style="height:75%"></i><i style="height:40%"></i></div>';
  const err = kind === 'error';
  return '<div class="gd-chart__state" role="' + (err ? 'alert' : 'status') + '"><span class="gd-chart__badge">' + (err ? svgIcon.warn : svgIcon.bars) + '</span>' +
    '<p class="gd-chart__state-t">' + esc(err ? (spec.errorTitle || 'Could not load this chart') : (spec.emptyTitle || 'No data for this period')) + '</p>' +
    '<p class="gd-chart__state-d">' + esc(err ? (spec.error || 'Something went wrong while fetching the numbers.') : (spec.empty || 'Try a wider date range or a different filter.')) + '</p>' +
    (err && spec.retry !== false ? '<button type="button" class="gd-btn gd-btn--outline gd-btn--sm" data-gd-chart-retry>Try again</button>' : '') + '</div>';
}
function legendHTML(items, spec) {
  if (!items.length) return '';
  const live = spec.legend !== 'static';
  return '<ul class="gd-chart__legend" aria-label="Series">' + items.map((s) => {
    const sw = '<i class="gd-sw' + (s.dash ? ' gd-sw--dash' : s.line ? ' gd-sw--line' : '') + '" style="--c:' + s.color + '"></i>';
    const body = sw + '<span>' + esc(s.name) + '</span>' + (s.value != null ? '<span class="gd-chart__key-v gd-num">' + esc(s.value) + '</span>' : '');
    return '<li>' + (live && s.i != null ? '<button type="button" class="gd-chart__key" data-gd-series="' + s.i + '" aria-pressed="' + (s.on !== false) + '">' + body + '</button>'
      : '<span class="gd-chart__key">' + body + '</span>') + '</li>';
  }).join('') + '</ul>';
}
/* wrap a body in the frame. `b` = {html, xy, legend, foot, extra} */
function frame(spec, b, extraCls) {
  const st = b.state || 'ready';
  const size = spec.size || 'sm';
  const tools = (spec.switcher ? '<div class="gd-chart__switch">' + spec.switcher + '</div>' : '') + (spec.actions ? '<div class="gd-chart__actions">' + spec.actions + '</div>' : '') +
    (b.reset ? '<button type="button" class="gd-btn gd-btn--outline gd-btn--sm" data-gd-chart-reset>Reset zoom</button>' : '') + (spec.menu ? '<div class="gd-chart__menu">' + spec.menu + '</div>' : '');
  const head = (spec.title || spec.description || tools || b.legend)
    ? '<header class="gd-chart__head"><div class="gd-chart__titles">' + (spec.title ? '<h3 class="gd-chart__title">' + esc(spec.title) + '</h3>' : '') +
      (spec.description ? '<p class="gd-chart__desc">' + esc(spec.description) + '</p>' : '') + '</div>' + (tools ? '<div class="gd-chart__tools">' + tools + '</div>' : '') + (b.legend || '') + '</header>' : '';
  const foot = [spec.footnote, b.foot].filter(Boolean).map(esc).join(' · ');
  const body = '<div class="gd-chart__body' + (b.xy && st === 'ready' ? ' gd-chart__body--xy' : '') + '"' + (st === 'loading' ? ' aria-busy="true"' : '') + '>' + b.html + '</div>';
  return { cls: 'gd-chart gd-chart--' + size + (spec.card ? ' gd-chart--card' : '') + (extraCls ? ' ' + extraCls : ''), attrs: { 'data-state': st }, html: head + body + (b.after || '') + (foot ? '<p class="gd-chart__foot">' + foot + '</p>' : '') };
}

/* ============================================================================
   line-chart, area-chart, bar-chart  (shared cartesian engine)
   ============================================================================ */
function hasData(spec) { return (spec.series || []).some((s) => (s.data || []).some(num)); }

function cart(type, spec, opt) {
  const hidden = opt.hidden || [], width = opt.width || 640;
  const isBar = type === 'bar', wf = isBar && spec.mode === 'waterfall';
  const stack = (type === 'area' && spec.mode === 'stack') || (isBar && spec.mode === 'stack');
  const max = ceilOf(spec), list = []; let cat = 0, dropped = 0, extra = 0;
  (spec.series || []).forEach((s, i) => {
    const o = Object.assign({}, s, { i });
    if (s.comparison) { o.cmp = true; list.push(o); } else if (cat < max) { o.slot = cat++; list.push(o); } else dropped++;
  });
  if (dropped) warnOnce('cap' + palName(spec), 'a chart has more than ' + max + ' series; the ' + (max === 3 ? 'default palette stops at 3 (R11). Pass palette:"extended" once the owner has ruled on it' : 'extended palette stops at 8') + '. Extra series are not drawn.');
  list.forEach((s) => { s.color = s.tone ? toneColor(s.tone) : s.cmp ? 'var(--gd-series-compare)' : cat === 1 ? TONE.accent : slotColor(s.slot, spec); s.on = hidden.indexOf(s.i) < 0; });
  let labels = spec.labels ? spec.labels.slice() : [];
  let n = labels.length; list.forEach((s) => { n = Math.max(n, (s.data || []).length); });
  for (let i = labels.length; i < n; i++) labels.push(String(i + 1));
  const vis = list.filter((s) => s.on);
  const dual = vis.some((s) => s.axis === 'y2') && vis.some((s) => s.axis !== 'y2');
  const log = spec.scale === 'log' && !stack && !wf;
  if (spec.scale === 'log' && (stack || wf)) warnOnce('log', 'log scale is ignored for stacked and waterfall charts.');
  const V = (s, i) => { const v = (s.data || [])[i]; return num(v) && !(log && v <= 0) ? v : null; };

  /* waterfall: running totals, floating bars */
  let wfRows = null;
  if (wf) {
    const items = spec.items || labels.map((l, i) => ({ label: l, value: (list[0] && list[0].data || [])[i] }));
    let cum = 0; wfRows = items.map((it) => {
      const v = num(it.value) ? it.value : 0; let a, b, kind;
      if (it.total) { if (num(it.value)) cum = it.value; a = 0; b = cum; kind = 'total'; } else { a = cum; b = cum + v; cum = b; kind = v >= 0 ? 'good' : 'danger'; }
      return { label: it.label, v, a, b, cum, kind };
    });
    labels = wfRows.map((r) => r.label); n = wfRows.length;
  }
  /* bar charts bucket past what the plot can hold */
  let bucket = 1;
  if (isBar && !wf && n > Math.max(60, Math.floor(width / 4))) {
    bucket = Math.ceil(n / Math.max(60, Math.floor(width / 4)));
    warnOnce('bkt', 'a bar chart has ' + n + ' categories; bucketing by ' + bucket + ' (' + (spec.bucket || 'avg') + '). Use a line or area chart for long ranges.');
    const nl = [], ns = list.map((s) => Object.assign({}, s, { data: [] }));
    for (let a = 0; a < n; a += bucket) {
      nl.push(labels[a]);
      list.forEach((s, k) => { const sl = (s.data || []).slice(a, a + bucket).filter(num); ns[k].data.push(!sl.length ? null : spec.bucket === 'sum' ? sl.reduce((x, y) => x + y, 0) : spec.bucket === 'max' ? Math.max(...sl) : sl.reduce((x, y) => x + y, 0) / sl.length); });
    }
    labels = nl; n = nl.length; ns.forEach((s, k) => { list[k].data = s.data; });
  }

  /* axes */
  const mk = mkFmt(spec), axes = {}, pools = { y: [], y2: [] };
  const axOf = (s) => (dual && s.axis === 'y2' ? 'y2' : 'y');
  const top = {};                                    // stack tops per axis
  if (wf) { wfRows.forEach((r) => pools.y.push(r.a, r.b)); }
  else if (stack) {
    const tp = new Array(n).fill(0), bt = new Array(n).fill(0);
    vis.forEach((s) => { for (let i = 0; i < n; i++) { const v = V(s, i) || 0; if (v >= 0) tp[i] += v; else bt[i] += v; } });
    pools.y.push(...tp, ...bt);
    if (type === 'area' && bt.some((x) => x < 0)) { warnOnce('stk', 'stacked area needs non-negative data; falling back to overlaid areas.'); }
  } else vis.forEach((s) => { for (let i = 0; i < n; i++) pools[axOf(s)].push(V(s, i)); });
  (spec.refs || []).forEach((r) => { if (num(r.value)) pools[dual && r.axis === 'y2' ? 'y2' : 'y'].push(r.value); });
  const zero = spec.zero !== false && !log;
  axes.y = mkAxis(pools.y, { zero, log });
  if (dual) axes.y2 = mkAxis(pools.y2, { zero, log, count: axes.y.ticks.length - 1 });
  const axisColor = (ax) => { const ss = vis.filter((s) => axOf(s) === ax); return ss.length === 1 ? ss[0].color : null; };
  axes.y.color = dual ? axisColor('y') : null; if (dual) axes.y2.color = axisColor('y2');

  const band = isBar;
  const xf = band ? (i) => (i + 0.5) / n : (n === 1 ? () => 0.5 : (i) => i / (n - 1));
  const titles = spec.titles || labels;
  const events = (spec.events || []).filter((e) => e.at >= 0 && e.at < n);
  const m = { type, spec, list, vis, n, labels, titles, axes, dual, stack: stack && !(type === 'area' && pools.y.some((x) => x < 0)), wf, wfRows, band, xf, mk, V, axOf, dropped, events, log, bucket, width,
    fill: type === 'area' ? (spec.mode === 'stack' ? 'stack' : 'grad') : (spec.fill === false ? null : (spec.fill === true || (spec.fill == null && list.filter((s) => !s.cmp).length === 1 && !dual) ? 'grad' : null)) };
  if (type === 'area' && stack && !m.stack) m.fill = 'grad';
  return m;
}

function renderCart(type, spec, opt) {
  const hasD = type === 'bar' && spec.mode === 'waterfall' ? (spec.items || []).some((i) => num(i.value)) : hasData(spec);
  const stt = spec.state || (hasD ? 'ready' : 'empty');
  const id = opt.id || spec.id || nid('gdc');
  if (stt !== 'ready') return Object.assign(frame(spec, { state: stt, html: stateHTML(spec, stt), xy: false }), { model: null, kind: type });
  const m = cart(type, spec, opt), { n, axes } = m;
  m.id = id;
  const ax = axes.y, yPct = (v, a) => f1((1 - (a || ax).pos(v)) * 100);
  const sing = m.list.filter((s) => !s.cmp).length === 1;

  /* y labels */
  const ylabels = (a, side) => {
    const longest = a.ticks.reduce((w, t) => { const s = m.mk.axis(t, a.step, Math.max(Math.abs(a.hi), Math.abs(a.lo))); return s.length > w.length ? s : w; }, '');
    return '<div class="gd-xy__' + side + ' gd-num" aria-hidden="true"' + (a.color ? ' style="--c:' + a.color + '"' : '') + '><span class="gd-yl gd-yl--sizer">' + esc(longest) + '</span>' +
      a.ticks.map((t) => '<span class="gd-yl" style="top:' + yPct(t, a) + '%">' + esc(m.mk.axis(t, a.step, Math.max(Math.abs(a.hi), Math.abs(a.lo)))) + '</span>').join('') + '</div>';
  };
  /* x labels, thinned for the estimated width; mount() re-thins from the measured one */
  const lstep = n > 80 ? Math.ceil(n / 60) : 1, plotW = Math.max(120, m.width - 60);
  const mw = Math.max(...m.labels.map((l) => String(l).length)) * 6.6 + 8, pitch = plotW / (m.band ? n : Math.max(1, n - 1));
  let stride = Math.max(1, Math.ceil((mw + 12) / pitch)); stride = Math.ceil(stride / lstep) * lstep;
  let xl = '';
  for (let i = 0; i < n; i += lstep) {
    const edge = !m.band && n > 1 ? (i === 0 ? ' data-edge="start"' : i === n - 1 ? ' data-edge="end"' : '') : '';
    if (opt.static && i % stride) continue;                     // static markup (previews) has no JS to re-thin, so unused labels are dropped
    xl += '<span class="gd-xl' + (i % stride ? ' is-off' : '') + '" data-i="' + i + '"' + edge + ' style="left:' + f1(m.xf(i) * 100) + '%">' + esc(m.labels[i]) + '</span>';
  }
  /* grid */
  let grid = ax.ticks.map((t) => '<div class="gd-gl' + (!ax.log && t === 0 && ax.lo < 0 ? ' gd-gl--zero' : '') + '" style="top:' + yPct(t) + '%"></div>').join('');
  /* incomplete period */
  let inc = '';
  if (spec.incomplete && num(spec.incomplete.from) && spec.incomplete.from < n) {
    const a = m.band ? spec.incomplete.from / n : m.xf(spec.incomplete.from);
    inc = '<div class="gd-inc" style="left:' + f1(a * 100) + '%"><span class="gd-inc__l">' + esc(spec.incomplete.label || 'Data still arriving') + '</span></div>';
  }
  /* refs */
  const refs = (spec.refs || []).filter((r) => num(r.value)).map((r) => {
    const a = m.dual && r.axis === 'y2' ? axes.y2 : ax;
    return '<div class="gd-ref' + (r.tone ? ' gd-ref--tone-' + r.tone : '') + '" style="top:' + yPct(r.value, a) + '%"><span class="gd-ref__l">' + esc(r.label || m.mk.full(r.value)) + '</span></div>';
  }).join('');
  let layer = '', dots = '';
  const HI = num(opt.hover) ? clamp(opt.hover, 0, n - 1) : null, HX = HI == null ? 0 : f1(m.xf(HI) * 100);
  const defs = [];
  if (!m.band) {
    const maxPts = spec.maxPoints || C.config.maxPoints || Math.max(120, Math.round(m.width));
    let svg = '';
    const stackTops = new Array(n).fill(0); const base = (1 - clamp(ax.pos(0), 0, 1)) * 1000;
    const draw = (s) => {
      const a = m.axOf(s), A = axes[a];
      const raw = (s.data || []);
      let idx = m.stack ? (n > maxPts ? Array.from({ length: Math.ceil(n / Math.ceil(n / maxPts)) }, (_, k) => k * Math.ceil(n / maxPts)).concat([n - 1]) : null) : decimate(raw, maxPts);
      const ys = (i) => { const v = m.V(s, i); return v == null ? null : (1 - A.pos(m.stack ? stackTops[i] : v)) * 1000; };
      const mkpts = (ids) => ids.map((i) => ({ i, x: m.xf(i) * 1000, y: ys(i) }));
      const ids = idx || Array.from({ length: n }, (_, i) => i);
      const cls = (s.cmp ? ' gd-line--cmp' : s.dashed ? ' gd-line--cmp' : '');
      const sty = ' style="--c:' + s.color + '"';
      let out = '', fc = num(s.forecastFrom) ? s.forecastFrom : null;
      if (m.stack) { for (let i = 0; i < n; i++) stackTops[i] += m.V(s, i) || 0; }
      const main = fc == null ? ids : ids.filter((i) => i <= fc), proj = fc == null ? [] : ids.filter((i) => i >= fc);
      const segs = segments(mkpts(main));
      if (m.fill) {
        segs.forEach((seg) => {
          let d;
          if (m.stack) {
            const lower = seg.map((p) => ({ x: p.x, y: (1 - A.pos(stackTops[p.i] - (m.V(s, p.i) || 0))) * 1000 })).reverse();
            d = pathOf(seg, spec.smooth) + pathOf(lower, spec.smooth).replace(/^M/, 'L') + 'Z';
          } else d = pathOf(seg, spec.smooth) + 'L' + Math.round(seg[seg.length - 1].x) + ' ' + Math.round(base) + 'L' + Math.round(seg[0].x) + ' ' + Math.round(base) + 'Z';
          if (m.fill === 'grad') { const gid = id + 'g' + s.i; if (!defs.some((x) => x.indexOf('id="' + gid + '"') > 0)) defs.push('<linearGradient id="' + gid + '" x1="0" y1="0" x2="0" y2="1" style="--c:' + s.color + '"><stop offset="0" style="stop-color:var(--c);stop-opacity:.3"/><stop offset="1" style="stop-color:var(--c);stop-opacity:0"/></linearGradient>'); out += '<path class="gd-area" d="' + d + '" style="fill:url(#' + gid + ')"/>'; } else out += '<path class="gd-area gd-area--stack" d="' + d + '"' + sty + '/>';
        });
      }
      segs.forEach((seg) => { out += '<path class="gd-line' + cls + '" d="' + pathOf(seg, spec.smooth) + '"' + sty + '/>'; });
      if (proj.length > 1) segments(mkpts(proj)).forEach((seg) => { out += '<path class="gd-line gd-line--fc" d="' + pathOf(seg, spec.smooth) + '"' + sty + '/>'; });
      return '<g class="gd-s" data-s="' + s.i + '">' + out + '</g>';
    };
    const order = m.stack ? m.vis.filter((s) => !s.cmp) : m.vis;
    order.forEach((s) => { svg += draw(s); });
    if (m.stack) m.vis.filter((s) => s.cmp).forEach((s) => { svg += draw(s); });
    layer = '<svg class="gd-plot__svg" viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-hidden="true" focusable="false">' + (defs.length ? '<defs>' + defs.join('') + '</defs>' : '') + svg + '</svg>';
    /* HTML dots: one per visible series, moved by the crosshair. An SVG circle would be squashed by preserveAspectRatio="none" */
    m.vis.forEach((s) => { const v = HI == null ? null : m.V(s, HI); dots += '<i class="gd-dot gd-s" data-s="' + s.i + '" style="--c:' + s.color + (v == null ? '' : ';display:block;left:' + HX + '%;top:' + yPct(m.stack ? 0 : v, axes[m.axOf(s)]) + '%') + '"></i>'; });
    if (n <= 40 && spec.points) m.vis.forEach((s) => { if (!s.cmp) for (let i = 0; i < n; i++) { const v = m.V(s, i); if (v != null) layer += '<i class="gd-pt gd-s" data-s="' + s.i + '" style="--c:' + s.color + ';left:' + f1(m.xf(i) * 100) + '%;top:' + yPct(m.stack ? 0 : v, axes[m.axOf(s)]) + '%"></i>'; } });
  } else if (m.wf) {
    const bw = 100 / n; let conn = '', bars = '';
    m.wfRows.forEach((r, i) => {
      const lo = Math.min(r.a, r.b), hi = Math.max(r.a, r.b), top = ax.pos(hi), bot = ax.pos(lo);
      bars += '<div class="gd-cat" style="left:' + f1(i * bw) + '%;width:' + f1(bw) + '%"><div class="gd-cat__in"><div class="gd-slot"><div class="gd-bar gd-bar--mid gd-bar--tone-' + (r.kind === 'total' ? 'total' : r.kind) + '" style="bottom:' + f1(bot * 100) + '%;height:' + f1((top - bot) * 100) + '%"></div></div></div></div>';
      if (i < n - 1) conn += '<div class="gd-conn" style="left:' + f1(m.xf(i) * 100) + '%;width:' + f1(bw) + '%;bottom:' + f1(ax.pos(r.cum) * 100) + '%"></div>';
    });
    layer = '<div class="gd-bars" aria-hidden="true">' + conn + bars + '</div>';
  } else {
    const bw = 100 / n, zeroPos = clamp(ax.pos(ax.log ? ax.lo : 0), 0, 1);
    const div = spec.diverging; let bars = '';
    const stk = m.stack;
    for (let i = 0; i < n; i++) {
      let slots = '', up = zeroPos, dn = zeroPos;
      const mkbar = (s, v, a, b) => {
        const lo = Math.min(a, b), hi = Math.max(a, b);
        const tone = div ? ' gd-bar--tone-' + (v < 0 ? (spec.negTone || 'neutral') : (spec.posTone || 'accent')) : '';
        const st = (div ? '' : '--c:' + s.color + ';') + 'bottom:' + f1(lo * 100) + '%;height:' + f1((hi - lo) * 100) + '%';
        return '<div class="gd-bar gd-s' + (v < 0 ? ' gd-bar--neg' : '') + (stk ? ' gd-bar--mid' : '') + tone + '" data-s="' + s.i + '" style="' + st + '"></div>';
      };
      if (stk) {
        let inner = '';
        m.vis.forEach((s) => {
          const v = m.V(s, i); if (v == null || v === 0) return;
          const d = ax.pos(v) - ax.pos(0), from = v >= 0 ? up : dn, to = from + d;
          inner += mkbar(s, v, from, to); if (v >= 0) up = to; else dn = to;
        });
        slots = '<div class="gd-slot">' + inner + '</div>';
      } else m.vis.forEach((s) => { const v = m.V(s, i); slots += '<div class="gd-slot">' + (v == null ? '' : mkbar(s, v, zeroPos, ax.pos(v))) + '</div>'; });
      bars += '<div class="gd-cat" style="left:' + f1(i * bw) + '%;width:' + f1(bw) + '%"><div class="gd-cat__in">' + slots + '</div></div>';
    }
    layer = '<div class="gd-bars" aria-hidden="true">' + bars + '</div>';
  }
  const flags = m.events.map((e, k) => '<button type="button" class="gd-evt gd-evt--tone-' + esc(e.tone || 'accent') + '" data-gd-tip="' + esc(e.label) + '" data-gd-tip-body="' + esc(e.detail || m.titles[e.at]) + '" style="left:' + f1(m.xf(e.at) * 100) + '%" aria-label="Event: ' + esc(e.label) + ', ' + esc(m.titles[e.at]) + '"></button>').join('');
  const alt = spec.alt || altText(m);
  const brushOn = spec.brush !== false;
  /* static hover state for previews: opt.hover = point index */
  let crossH = m.band ? '<div class="gd-band"></div>' : '<div class="gd-cross"></div>', tipH = '<div class="gd-tip"></div>';
  if (HI != null) {
    crossH = m.band ? '<div class="gd-band" style="left:' + f1(HI / n * 100) + '%;width:' + f1(100 / n) + '%"></div>' : '<div class="gd-cross" style="left:' + HX + '%"></div>';
    const rowsH = m.wf ? (m.wfRows[HI].kind === 'total' ? [{ name: 'Total', value: m.mk.full(m.wfRows[HI].b), color: 'var(--gd-text-muted)' }] : [{ name: m.wfRows[HI].v >= 0 ? 'Increase' : 'Decrease', value: m.mk.full(m.wfRows[HI].v), color: m.wfRows[HI].kind === 'good' ? 'var(--gd-good)' : 'var(--gd-danger)' }, { name: 'Running total', value: m.mk.full(m.wfRows[HI].cum) }]) : m.vis.map((s) => { const v = m.V(s, HI); return { name: s.name || 'Series', value: v == null ? 'No data' : m.mk.full(v), color: s.color, dashed: s.cmp }; });
    const tot = m.stack ? m.mk.full(m.vis.reduce((a, s) => a + (m.V(s, HI) || 0), 0)) : null;
    tipH = '<div class="gd-tip" style="' + (HX > 55 ? 'right:calc(' + f1(100 - HX) + '% + 12px)' : 'left:calc(' + HX + '% + 12px)') + ';top:8%">' + tipHTML({ head: m.titles[HI], rows: rowsH, total: tot }) + '</div>';
  }
  const plot = '<div class="gd-plot' + (sing ? ' gd-plot--single' : '') + '" tabindex="0" role="img" aria-label="' + esc(alt) + '" data-gd-plot data-brush="' + (brushOn ? 'on' : 'off') + '"' + (HI != null ? ' data-on' : '') + '>' +
    inc + grid + refs + layer + crossH + dots + '<div class="gd-brush"></div>' + tipH + '</div>' + (flags ? '<div class="gd-evts" data-gd-tipbox>' + flags + '<div class="gd-tip"></div></div>' : '');
  const fig = '<figure class="gd-chart__fig"><div class="gd-xy"' + (m.dual ? ' style="grid-template-columns:auto minmax(0,1fr) auto"' : ' style="grid-template-columns:auto minmax(0,1fr)"') + '>' + ylabels(ax, 'y') + plot + (m.dual ? ylabels(axes.y2, 'y2') : '') +
    '<div class="gd-xy__x gd-num" aria-hidden="true" data-n="' + n + '" data-k="' + lstep + '" data-mode="' + (m.band ? 'band' : 'line') + '">' + xl + '</div></div>' +
    '<p class="gd-sr" aria-live="polite" data-gd-live></p>' + dataTable(m) + '</figure>';
  /* legend */
  const items = [];
  if (spec.legend === 'table') { /* below */ } else if (spec.legend !== false && (m.list.length > 1 || spec.legend === true)) {
    if (m.wf) [['Increase', 'var(--gd-good)'], ['Decrease', 'var(--gd-danger)'], ['Total', 'var(--gd-text-muted)']].forEach((k) => items.push({ name: k[0], color: k[1], on: true }));
    else m.list.forEach((s) => items.push({ i: s.i, name: s.name || ('Series ' + (s.i + 1)), color: s.color, on: s.on, dash: !!s.cmp || !!s.dashed, line: !m.band && !s.cmp && !s.dashed }));
    if (m.list.some((s) => num(s.forecastFrom)) ) items.push({ name: 'Forecast', color: 'var(--gd-text-muted)', dash: true });
  }
  const zoomed = !!opt.zoom;
  const foots = [];
  if (m.dropped) foots.push('Showing ' + m.list.filter((s) => !s.cmp).length + ' of ' + (m.list.filter((s) => !s.cmp).length + m.dropped) + ' series');
  if (m.bucket > 1) foots.push('Grouped by ' + m.bucket + ' (' + (spec.bucket || 'average') + ')');
  const after = spec.legend === 'table' ? '<div class="gd-chart__ltable">' + legendTable(Object.assign({}, spec.legendTable || {}, { series: m.list.map((s) => ({ i: s.i, name: s.name, color: s.color, on: s.on, data: s.data, dash: s.cmp })), for: '#' + id, format: spec.format, prefix: spec.prefix, unit: spec.unit })) + '</div>' : '';
  const fr = frame(spec, { state: 'ready', html: fig, after, xy: true, legend: legendHTML(items, spec), foot: foots.join(' · '), reset: zoomed });
  fr.model = m; fr.id = id; fr.attrs.id = id;
  return fr;
}

function altText(m) {
  const kind = { line: 'Line chart', area: m.stack ? 'Stacked area chart' : 'Area chart', bar: m.wf ? 'Waterfall chart' : m.stack ? 'Stacked bar chart' : m.spec.diverging ? 'Diverging bar chart' : 'Bar chart' }[m.type];
  if (m.wf) { const r = m.wfRows, last = r[r.length - 1]; return (m.spec.title ? m.spec.title + '. ' : '') + kind + ', ' + r.length + ' steps ending at ' + m.mk.full(last.cum) + '.'; }
  const parts = m.vis.map((s) => {
    const vals = []; for (let i = 0; i < m.n; i++) { const v = m.V(s, i); if (v != null) vals.push([i, v]); }
    if (!vals.length) return (s.name || 'Series') + ': no data';
    let lo = vals[0], hi = vals[0]; vals.forEach((p) => { if (p[1] < lo[1]) lo = p; if (p[1] > hi[1]) hi = p; });
    const last = vals[vals.length - 1];
    return (s.name || 'Series') + ': low ' + m.mk.full(lo[1]) + ' on ' + m.titles[lo[0]] + ', high ' + m.mk.full(hi[1]) + ' on ' + m.titles[hi[0]] + ', latest ' + m.mk.full(last[1]);
  });
  const ev = m.events.length ? ' Events: ' + m.events.map((e) => e.label + ' on ' + m.titles[e.at]).join('; ') + '.' : '';
  return (m.spec.title ? m.spec.title + '. ' : '') + kind + ', ' + m.n + ' points from ' + m.titles[0] + ' to ' + m.titles[m.n - 1] + '. ' + parts.join('. ') + '.' + ev + ' Arrow keys move between points.';
}
function dataTable(m) {
  if (m.spec.table === false || m.n * (m.wf ? 3 : m.vis.length) > 400) return '';
  if (m.wf) return '<table class="gd-sr"><caption>' + esc(m.spec.title || 'Waterfall') + '</caption><thead><tr><th>Step</th><th>Change</th><th>Running total</th></tr></thead><tbody>' +
    m.wfRows.map((r) => '<tr><th>' + esc(r.label) + '</th><td>' + esc(m.mk.full(r.kind === 'total' ? r.b : r.v)) + '</td><td>' + esc(m.mk.full(r.cum)) + '</td></tr>').join('') + '</tbody></table>';
  let t = '<table class="gd-sr"><caption>' + esc(m.spec.title || 'Chart data') + '</caption><thead><tr><th>' + esc(m.spec.xTitle || 'Period') + '</th>' + m.vis.map((s) => '<th>' + esc(s.name || 'Series') + '</th>').join('') + '</tr></thead><tbody>';
  for (let i = 0; i < m.n; i++) t += '<tr><th>' + esc(m.titles[i]) + '</th>' + m.vis.map((s) => { const v = m.V(s, i); return '<td>' + (v == null ? 'no data' : esc(m.mk.full(v))) + '</td>'; }).join('') + '</tr>';
  return t + '</tbody></table>';
}

/* ============================================================================
   horizontal-bar-chart
   ============================================================================ */
function renderHbar(spec) {
  const items = (spec.items || []).filter((i) => num(i.value));
  if (spec.state === 'loading' || spec.state === 'error' || !items.length) return frameless(spec, spec.state || 'empty');
  let rows = items.slice(); if (spec.sort !== false) rows.sort((a, b) => b.value - a.value);
  const topN = spec.top || 0; if (topN && rows.length > topN) { const rest = rows.slice(topN).reduce((a, r) => a + r.value, 0); rows = rows.slice(0, topN).concat([{ label: 'Other', value: rest, tone: 'neutral' }]); }
  const mk = mkFmt(spec), total = spec.total != null ? spec.total : items.reduce((a, r) => a + Math.abs(r.value), 0);
  const div = !!spec.diverging || rows.some((r) => r.value < 0);
  const mx = Math.max(...rows.map((r) => Math.abs(r.value))) || 1, mn = Math.min(0, ...rows.map((r) => r.value)), span = div ? Math.max(Math.abs(mn), Math.max(...rows.map((r) => r.value))) * 2 || 1 : mx;
  const share = spec.share !== false;
  const li = rows.map((r) => {
    const col = r.tone ? ' style="--c:' + toneColor(r.tone) + (div ? '' : '') + '"' : '';
    let bar;
    if (div) { const w = Math.abs(r.value) / span * 100, left = r.value < 0 ? 50 - w : 50; bar = '<span class="gd-hbar__bar' + (r.value < 0 ? ' gd-hbar__bar--neg' : '') + '" style="left:' + f1(left) + '%;width:' + f1(w) + '%' + (r.tone ? ';--c:' + toneColor(r.tone) : r.value < 0 ? ';--c:' + TONE[spec.negTone || 'neutral'] : '') + '"></span>'; }
    else bar = '<span class="gd-hbar__bar" style="width:' + f1(r.value / mx * 100) + '%' + (r.tone ? ';--c:' + toneColor(r.tone) : '') + '"></span>';
    const inner = '<span class="gd-hbar__label" title="' + esc(r.label) + '">' + esc(r.label) + '</span><span class="gd-hbar__track" aria-hidden="true">' + bar + '</span><span class="gd-hbar__val gd-num">' + esc(mk.full(r.value)) + '</span>' +
      (share ? '<span class="gd-hbar__share gd-num">' + Math.round(Math.abs(r.value) / total * 100) + '%</span>' : '');
    return '<li>' + (r.href ? '<a class="gd-hbar__row" href="' + esc(r.href) + '">' + inner + '</a>' : '<div class="gd-hbar__row">' + inner + '</div>') + '</li>';
  }).join('');
  const html = '<ol class="gd-hbar' + (div ? ' gd-hbar--div' : '') + '" aria-label="' + esc(spec.alt || spec.title || 'Ranked values') + '">' + li + '</ol>';
  return frameless(spec, 'ready', html);
}
/* types that read well bare (no frame) get one only when a title, description or slot asks */
function frameless(spec, st, html, cls) {
  const wantsFrame = spec.frame !== false && (spec.title || spec.description || spec.actions || spec.switcher || spec.menu || spec.footnote || spec.card);
  const inner = st === 'ready' ? html : stateHTML(spec, st);
  if (!wantsFrame) return { cls: st === 'ready' ? (cls || '') : 'gd-chart', attrs: { 'data-state': st }, html: inner, bare: true };
  return frame(spec, { state: st, html: inner }, cls);
}

/* ============================================================================
   donut-chart
   ============================================================================ */
function renderDonut(spec) {
  let items = (spec.items || []).filter((i) => num(i.value) && i.value > 0);
  if (spec.state === 'loading' || spec.state === 'error' || !items.length) return frameless(spec, spec.state || 'empty');
  const max = spec.max || ceilOf(spec), tot = items.reduce((a, r) => a + r.value, 0);
  const untoned = items.filter((i) => !i.tone);
  if (untoned.length > max) {
    warnOnce('donut' + palName(spec), 'a donut has more than ' + max + ' categories; the rest are folded into Other (neutral).');
    const keep = untoned.slice().sort((a, b) => b.value - a.value).slice(0, max), rest = untoned.filter((i) => keep.indexOf(i) < 0);
    items = items.filter((i) => i.tone || keep.indexOf(i) >= 0).concat([{ label: 'Other', value: rest.reduce((a, r) => a + r.value, 0), tone: 'neutral' }]);
  }
  let k = 0; const cnt = items.filter((i) => !i.tone).length;
  items.forEach((it) => { it.color = it.tone ? toneColor(it.tone) : cnt === 1 ? TONE.accent : slotColor(k++, spec); });
  const mk = mkFmt(spec), R = 70, Cc = 2 * Math.PI * R; let off = 0;
  const arcs = items.map((it, i) => {
    const len = it.value / tot * Cc, gap = items.length > 1 ? 2 : 0, d = Math.max(0, len - gap);
    const el = '<circle class="gd-donut__arc" data-i="' + i + '" cx="84" cy="84" r="' + R + '" style="--c:' + it.color + '" stroke-dasharray="' + d.toFixed(2) + ' ' + (Cc - d).toFixed(2) + '" stroke-dashoffset="' + (-off).toFixed(2) + '"/>';
    off += len; return el;
  }).join('');
  const label = spec.totalLabel || 'total';
  const legend = items.map((it, i) => '<li class="gd-donut__item" data-i="' + i + '" tabindex="0" data-l="' + esc(it.label) + '" data-v="' + esc(mk.full(it.value)) + '"><i class="gd-sw" style="--c:' + it.color + '"></i><span title="' + esc(it.label) + '">' + esc(it.label) + '</span><span class="gd-num">' + esc(mk.full(it.value)) + '</span><span class="gd-num">' + Math.round(it.value / tot * 100) + '%</span></li>').join('');
  const alt = spec.alt || ((spec.title || 'Breakdown') + ': ' + mk.full(tot) + ' ' + label + '. ' + items.map((it) => it.label + ' ' + mk.full(it.value) + ' (' + Math.round(it.value / tot * 100) + '%)').join(', ') + '.');
  const html = '<div class="gd-donut" data-tv="' + esc(mk.full(tot)) + '" data-tl="' + esc(label) + '"><figure class="gd-donut__fig" role="img" aria-label="' + esc(alt) + '"><svg viewBox="0 0 168 168" aria-hidden="true" focusable="false">' + arcs + '</svg>' +
    '<div class="gd-donut__centre" aria-hidden="true"><b class="gd-num">' + esc(mk.full(tot)) + '</b><span>' + esc(label) + '</span></div></figure><ul class="gd-donut__legend" aria-label="Legend">' + legend + '</ul></div>';
  return frameless(spec, 'ready', html);
}

/* ============================================================================
   breakdown-bar
   ============================================================================ */
function renderBreakdown(spec) {
  let segs = (spec.segments || []).filter((s) => num(s.value) && s.value > 0);
  if (spec.state === 'loading' || spec.state === 'error' || !segs.length) return frameless(spec, spec.state || 'empty');
  const tot = segs.reduce((a, s) => a + s.value, 0), cnt = segs.filter((s) => !s.tone).length; let k = 0;
  segs = segs.map((s) => Object.assign({}, s, { color: s.tone ? toneColor(s.tone) : cnt === 1 ? TONE.accent : slotColor(Math.min(k++, ceilOf(spec) - 1), spec) }));
  if (cnt > ceilOf(spec)) warnOnce('brk', 'a breakdown bar has more than ' + ceilOf(spec) + ' untoned segments; colours repeat the last slot. Give extra segments tone:"neutral".');
  const mk = mkFmt(spec);
  const alt = spec.alt || segs.map((s) => mk.full(s.value) + ' ' + s.label + ' (' + Math.round(s.value / tot * 100) + '%)').join(', ');
  const html = '<figure class="gd-brk"><div class="gd-brk__bar" role="img" aria-label="' + esc(alt) + '">' + segs.map((s) => '<i class="gd-brk__seg" style="--c:' + s.color + ';flex:' + s.value + '"></i>').join('') + '</div>' +
    '<ul class="gd-brk__key">' + segs.map((s) => '<li><i class="gd-sw" style="--c:' + s.color + '"></i><span><b class="gd-num">' + Math.round(s.value / tot * 100) + '%</b> ' + esc(s.label) + '</span></li>').join('') + '</ul></figure>';
  return frameless(spec, 'ready', html);
}

/* ============================================================================
   sparkline
   ============================================================================ */
function renderSpark(spec) {
  const vals = spec.values || [], pts = []; let lo = Infinity, hi = -Infinity;
  vals.forEach((v) => { if (num(v)) { lo = Math.min(lo, v); hi = Math.max(hi, v); } });
  if (lo === Infinity) return { cls: '', attrs: {}, html: '<span class="gd-spark" role="img" aria-label="' + esc(spec.alt || 'No data') + '"></span>', bare: true, plainSpark: true };
  if (hi === lo) { lo -= 1; hi += 1; }
  const n = vals.length, col = toneColor(spec.tone || 'accent');
  const X = (i) => (n === 1 ? 0.5 : i / (n - 1)), Y = (v) => (hi - v) / (hi - lo);
  vals.forEach((v, i) => pts.push({ i, x: X(i) * 100, y: num(v) ? (0.06 + Y(v) * 0.88) * 100 : null }));
  const segs = segments(pts); let d = '', area = '';
  segs.forEach((s) => { d += pathOf(s, spec.smooth); if (spec.fill) area += pathOf(s, spec.smooth) + 'L' + f1(s[s.length - 1].x) + ' 100L' + f1(s[0].x) + ' 100Z'; });
  const lastI = (() => { for (let i = n - 1; i >= 0; i--) if (num(vals[i])) return i; return -1; })();
  const last = pts[lastI], id = nid('gds');
  const first = vals.find(num), end = vals[lastI], mkf = mkFmt(spec);
  const alt = spec.alt || ((spec.label ? spec.label + ': ' : 'Trend: ') + 'from ' + mkf.full(first) + ' to ' + mkf.full(end) + ' over ' + n + ' points, low ' + mkf.full(Math.min(...vals.filter(num))) + ', high ' + mkf.full(Math.max(...vals.filter(num))) + '.');
  const html = '<span class="gd-spark' + (spec.size === 'lg' ? ' gd-spark--lg' : '') + '" role="img" aria-label="' + esc(alt) + '" style="--c:' + col + '"><svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" focusable="false">' +
    (spec.fill ? '<defs><linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--c);stop-opacity:.3"/><stop offset="1" style="stop-color:var(--c);stop-opacity:0"/></linearGradient></defs><path class="gd-area" d="' + area + '" style="fill:url(#' + id + ')"/>' : '') +
    '<path class="gd-line" d="' + d + '"/></svg><i class="gd-dot" style="left:' + f1(last.x) + '%;top:' + f1(last.y) + '%"></i></span>';
  return { cls: '', attrs: {}, html, bare: true };
}

/* ============================================================================
   heatmap (grid and calendar)
   ============================================================================ */
function levelsOf(vals, spec) {
  const pos = vals.filter((v) => num(v) && v > 0).sort((a, b) => a - b); if (!pos.length) return () => 0;
  const hi = spec.max != null ? spec.max : pos[pos.length - 1], lo = spec.min != null ? spec.min : pos[0];
  if (spec.bins === 'quantile') return (v) => { if (!num(v) || v <= 0) return 0; let k = 0; while (k < pos.length && pos[k] <= v) k++; return clamp(Math.ceil(k / pos.length * 5), 1, 5); };
  return (v) => { if (!num(v) || v <= 0) return 0; return hi === lo ? 5 : clamp(1 + Math.floor((v - lo) / (hi - lo) * 5 - 1e-9), 1, 5); };
}
function renderHeat(spec) {
  const cal = spec.layout === 'calendar';
  if (spec.state === 'loading' || spec.state === 'error') return frameless(spec, spec.state);
  const mk = mkFmt(spec), unit = spec.noun || 'value';
  let rows = [], cols = [], grid = [], rowLabels = [], colLabels = [], months = {};
  if (cal) {
    const start = new Date(spec.start + 'T00:00:00Z'), ws = spec.weekStart == null ? 1 : spec.weekStart, vals = spec.values || [];
    if (!vals.some(num)) return frameless(spec, 'empty');
    const lead = (start.getUTCDay() - ws + 7) % 7, total = lead + vals.length, weeks = Math.ceil(total / 7);
    grid = Array.from({ length: 7 }, () => new Array(weeks).fill(undefined)); colLabels = new Array(weeks).fill('');
    const dn = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], mn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    rowLabels = Array.from({ length: 7 }, (_, r) => ((r % 2) === 0 ? dn[(ws + r) % 7] : ''));
    let lastM = -1;
    vals.forEach((v, i) => {
      const d = new Date(start.getTime() + i * 864e5), slot = lead + i, r = slot % 7, c = Math.floor(slot / 7);
      grid[r][c] = { v: num(v) ? v : null, t: dn[d.getUTCDay()] + ' ' + d.getUTCDate() + ' ' + mn[d.getUTCMonth()] + ' ' + d.getUTCFullYear() };
      if (d.getUTCMonth() !== lastM && r < 7) { if (c === 0 || d.getUTCDate() <= 7) { colLabels[c] = mn[d.getUTCMonth()]; } lastM = d.getUTCMonth(); }
    });
    const at = colLabels.map((l, i) => (l ? i : -1)).filter((i) => i >= 0);
    at.forEach((i, k) => { if (k < at.length - 1 && at[k + 1] - i < 3) colLabels[i] = ''; });      // two month names never overlap
    rows = rowLabels; cols = colLabels;
  } else {
    rowLabels = spec.rows || []; colLabels = spec.cols || [];
    const vv = spec.values || []; if (!vv.some((r) => (r || []).some(num))) return frameless(spec, 'empty');
    grid = rowLabels.map((rl, r) => colLabels.map((cl, c) => { const v = (vv[r] || [])[c]; return { v: num(v) ? v : null, t: rl + ', ' + cl }; }));
  }
  const flat = []; grid.forEach((r) => r.forEach((c) => c && flat.push(c.v)));
  const lv = levelsOf(flat, spec), nC = colLabels.length, id = nid('gdh');
  const colTh = (l, c) => '<span class="gd-heat__lab gd-heat__lab--col' + (cal ? ' gd-heat__lab--month' : '') + '" role="columnheader"' + (cal && !l ? ' aria-hidden="true"' : '') + '>' + esc(l) + '</span>';
  let head = '<div class="gd-heat__row" role="row" style="--cols:' + nC + '"><span class="gd-heat__lab" role="presentation"></span>';
  if (cal) { let c = 0; while (c < nC) { if (colLabels[c]) { head += '<span class="gd-heat__lab gd-heat__lab--month" style="grid-column:' + (c + 2) + ' / span 4" role="columnheader">' + esc(colLabels[c]) + '</span>'; c += 4; } else c++; } }
  else head += colLabels.map((l, c) => colTh(l, c)).join('');
  head += '</div>';
  let first = true;
  const body = grid.map((r, ri) => '<div class="gd-heat__row" role="row" style="--cols:' + nC + '"><span class="gd-heat__lab" role="rowheader"' + (cal && !rowLabels[ri] ? ' aria-hidden="true"' : '') + '>' + esc(rowLabels[ri]) + '</span>' +
    r.map((c, ci) => {
      if (!c) return '<span class="gd-heat__cell" data-l="x" role="presentation"></span>';
      const l = lv(c.v), txt = c.v == null ? 'no data' : mk.full(c.v) + ' ' + unit + (c.v === 1 ? '' : 's');
      const tab = first ? 0 : -1; first = false;
      return '<span class="gd-heat__cell' + (spec.hover && spec.hover[0] === ri && spec.hover[1] === ci ? ' is-hover' : '') + '" role="gridcell" tabindex="' + tab + '" data-l="' + l + '" data-gd-tipcell aria-label="' + esc(c.t + ': ' + txt) + '"></span>';
    }).join('') + '</div>').join('');
  const key = '<div class="gd-heat__key" aria-hidden="true"><span>' + esc(spec.lowLabel || 'Less') + '</span><i data-l="0"></i><i data-l="1"></i><i data-l="2"></i><i data-l="3"></i><i data-l="4"></i><i data-l="5"></i><span>' + esc(spec.highLabel || 'More') + '</span></div>';
  const html = '<div class="gd-heat' + (cal ? ' gd-heat--cal' : '') + '" data-gd-tipbox data-gd-heat><div class="gd-heat__scroll"><div class="gd-heat__grid" role="grid" aria-label="' + esc(spec.alt || spec.title || 'Heatmap') + '">' + head + body + '</div></div>' + (spec.key === false ? '' : key) + (spec.hover && grid[spec.hover[0]] && grid[spec.hover[0]][spec.hover[1]] ? '<div class="gd-tip" data-on style="left:calc(var(--gd-heat-lw,40px) + ' + f1((spec.hover[1] + 0.5) / nC * 80) + '%);top:calc((var(--gd-heat-cell) + 3px) * ' + (spec.hover[0] + 1) + ' + 8px)">' + tipHTML({ head: grid[spec.hover[0]][spec.hover[1]].t, rows: [{ name: String(grid[spec.hover[0]][spec.hover[1]].v == null ? 'No data' : mk.full(grid[spec.hover[0]][spec.hover[1]].v) + ' ' + unit + (grid[spec.hover[0]][spec.hover[1]].v === 1 ? '' : 's')), value: '' }] }).replace(/<span class="gd-tip__v gd-num"><\/span>/g, '') + '</div>' : '<div class="gd-tip"></div>') + '</div>';
  void id; void rows; void cols;
  return frameless(spec, 'ready', html);
}

/* ============================================================================
   funnel
   ============================================================================ */
function renderFunnel(spec) {
  const st = (spec.steps || []).filter((s) => num(s.value));
  if (spec.state === 'loading' || spec.state === 'error' || !st.length) return frameless(spec, spec.state || 'empty');
  const mk = mkFmt(spec), first = st[0].value || 1, vert = spec.layout === 'vertical', pct = (x) => (x * 100 >= 10 ? Math.round(x * 100) : Math.round(x * 1000) / 10) + '%';
  const rows = st.map((s, i) => { const prev = i ? st[i - 1].value : s.value; return { s, i, comp: s.value / first, drop: i ? (prev ? 1 - s.value / prev : 0) : 0, lost: i ? prev - s.value : 0, cont: i ? (prev ? s.value / prev : 0) : 1 }; });
  const lastR = rows[rows.length - 1], lostAll = first - lastR.s.value;
  const alt = spec.alt || ((spec.title || 'Funnel') + ': ' + rows.map((r) => r.s.label + ' ' + mk.full(r.s.value) + ' (' + pct(r.comp) + ' of the first step)').join(', ') + '.');
  let list;
  if (vert) {
    list = '<ol class="gd-funnel__list" aria-label="' + esc(spec.title || 'Funnel steps') + '">' + rows.map((r) => '<li class="gd-funnel__col"><div class="gd-funnel__plot" aria-hidden="true">' + (r.i ? '<span class="gd-funnel__ghost" style="height:' + f1(rows[r.i - 1].comp * 100) + '%"></span>' : '') + '<span class="gd-funnel__fill" style="height:' + f1(r.comp * 100) + '%"></span></div>' +
      '<span class="gd-funnel__val gd-num">' + esc(mk.full(r.s.value)) + '</span><span class="gd-funnel__label" title="' + esc(r.s.label) + '">' + esc(r.s.label) + '</span>' +
      '<span class="gd-funnel__meta gd-num"><span>' + (r.i ? '<b>' + pct(r.cont) + '</b> continue' : pct(r.comp) + ' of start') + '</span>' + (r.i ? '<span>' + mk.full(r.lost) + ' left (' + pct(r.drop) + ')</span>' : '') + '</span></li>').join('') + '</ol>';
  } else {
    list = '<ol class="gd-funnel__list" aria-label="' + esc(spec.title || 'Funnel steps') + '">' + rows.map((r) => (r.i ? '<li class="gd-funnel__step"><div class="gd-funnel__conv gd-num"><span><b>' + pct(r.cont) + '</b> continue</span><span>' + mk.full(r.lost) + ' left (' + pct(r.drop) + ' drop-off)</span></div></li>' : '') +
      '<li class="gd-funnel__row"><span class="gd-funnel__label" title="' + esc(r.s.label) + '">' + esc(r.s.label) + '</span><span class="gd-funnel__track" aria-hidden="true"><span class="gd-funnel__fill" style="width:' + f1(r.comp * 100) + '%"></span></span><span class="gd-funnel__val gd-num">' + esc(mk.full(r.s.value)) + '</span><span class="gd-funnel__pct gd-num">' + pct(r.comp) + '</span></li>').join('') + '</ol>';
  }
  const aband = spec.abandonment === false ? '' : '<p class="gd-funnel__aband gd-num"><span>Abandoned before ' + esc(lastR.s.label) + '</span><span><b>' + esc(mk.full(lostAll)) + '</b> (' + pct(first ? lostAll / first : 0) + ')</span></p>';
  const table = spec.table ? '<table class="gd-funnel__table"><caption class="gd-sr">' + esc(spec.title || 'Funnel') + ' by step</caption><thead><tr><th scope="col">Step</th><th scope="col">Count</th><th scope="col">Completion</th><th scope="col">Drop-off</th></tr></thead><tbody>' +
    rows.map((r) => '<tr><th scope="row">' + esc(r.s.label) + '</th><td>' + esc(mk.full(r.s.value)) + '</td><td>' + pct(r.comp) + '</td><td>' + (r.i ? pct(r.drop) : '-') + '</td></tr>').join('') + '</tbody></table>' : '';
  return frameless(spec, 'ready', '<div class="gd-funnel' + (vert ? ' gd-funnel--v' : '') + '">' + list + aband + table + '</div>');
}

/* ============================================================================
   uptime-bar
   ============================================================================ */
function renderUptime(spec) {
  const segs = spec.segments || [];
  if (spec.state === 'loading' || spec.state === 'error' || !segs.length) return frameless(spec, spec.state || 'empty');
  const known = segs.filter((s) => s.status !== 'none'), up = known.filter((s) => s.status === 'up').length, deg = known.filter((s) => s.status === 'degraded').length, down = known.filter((s) => s.status === 'down').length;
  const pctv = spec.percent != null ? spec.percent : known.length ? Math.round((known.length - down) / known.length * 10000) / 100 : null; void up;
  const nm = { up: 'Operational', degraded: 'Degraded', down: 'Down', none: 'No data' };
  const alt = spec.alt || ((spec.title || 'Uptime') + ': ' + (pctv != null ? pctv + '% ' : '') + 'over ' + segs.length + ' ' + (spec.unit || 'days') + '; ' + down + ' down, ' + deg + ' degraded.');
  const bar = '<div class="gd-uptime__bar" role="img" tabindex="0" aria-label="' + esc(alt + ' Arrow keys step through each period.') + '" data-gd-uptime>' + segs.map((s, i) => '<span class="gd-uptime__seg' + (spec.hover === i ? ' is-hover' : '') + '" data-st="' + esc(s.status || 'up') + '" data-i="' + i + '" data-gd-tip="' + esc(s.label) + '" data-gd-tip-body="' + esc(nm[s.status || 'up'] + (s.detail ? '\n' + s.detail : '')) + '" data-gd-tip-c="' + ({ up: 'var(--gd-good)', degraded: 'var(--gd-warn)', down: 'var(--gd-danger)', none: 'var(--gd-border-strong)' }[s.status || 'up']) + '"></span>').join('') + '</div>';
  const html = '<figure class="gd-uptime" data-gd-tipbox style="margin:0"><div class="gd-uptime__head"><span>' + esc(spec.name || '') + '</span><b class="gd-num">' + (pctv != null ? pctv + '% uptime' : 'No data') + '</b></div>' + bar +
    '<div class="gd-uptime__foot"><span>' + esc(spec.startLabel || segs[0].label) + '</span><span>' + esc(spec.endLabel || 'Today') + '</span></div>' +
    (spec.hover != null && segs[spec.hover] ? '<div class="gd-tip" data-on style="left:' + f1((spec.hover + 0.5) / segs.length * 100) + '%;top:auto;bottom:calc(100% - var(--gd-control-h) - 24px);transform:translateX(-50%)">' + tipHTML({ head: segs[spec.hover].label, rows: String(nm[segs[spec.hover].status || 'up'] + (segs[spec.hover].detail ? '\n' + segs[spec.hover].detail : '')).split('\n').map((t, k) => ({ name: t, value: '', color: k ? null : ({ up: 'var(--gd-good)', degraded: 'var(--gd-warn)', down: 'var(--gd-danger)', none: 'var(--gd-border-strong)' }[segs[spec.hover].status || 'up']) })) }).replace(/<span class="gd-tip__v gd-num"><\/span>/g, '') + '</div>' : '<div class="gd-tip"></div>') + '</figure>';
  return frameless(spec, 'ready', html);
}

/* ============================================================================
   legend-table
   ============================================================================ */
const STAT = { sum: (a) => a.reduce((x, y) => x + y, 0), avg: (a) => a.reduce((x, y) => x + y, 0) / a.length, min: (a) => Math.min(...a), max: (a) => Math.max(...a), last: (a) => a[a.length - 1] };
function legendTable(spec) {
  const mk = mkFmt(spec), cols = spec.columns || [{ label: 'Total', stat: 'sum' }, { label: 'Average', stat: 'avg' }, { label: 'Latest', stat: 'last' }];
  const head = '<thead><tr><th class="gd-ltable__sel" scope="col"><span class="gd-sr">Show series</span></th><th class="gd-ltable__name" scope="col">' + esc(spec.nameLabel || 'Series') + '</th>' + cols.map((c) => '<th scope="col">' + esc(c.label) + '</th>').join('') + '</tr></thead>';
  const body = (spec.series || []).map((s, k) => {
    const nums = (s.data || []).filter(num);
    const cells = cols.map((c) => { const v = s.values && c.key != null ? s.values[c.key] : (c.stat && nums.length ? STAT[c.stat](nums) : null); return '<td>' + esc(v == null ? '-' : typeof v === 'number' ? mk.full(v) : v) + '</td>'; }).join('');
    const i = s.i != null ? s.i : k;
    return '<tr data-gd-series-row="' + i + '"' + (s.on === false ? ' data-off' : '') + '><td class="gd-ltable__sel"><label class="gd-check"><input type="checkbox" data-gd-series="' + i + '"' + (s.on === false ? '' : ' checked') + ' aria-label="Show ' + esc(s.name) + '"><span class="gd-check__box" aria-hidden="true"></span></label></td>' +
      '<th class="gd-ltable__name" scope="row"><span><i class="gd-sw' + (s.dash ? ' gd-sw--dash' : '') + '" style="--c:' + s.color + '"></i>' + esc(s.name) + '</span></th>' + cells + '</tr>';
  }).join('');
  return '<table class="gd-ltable"' + (spec.for ? ' data-gd-for="' + esc(spec.for) + '"' : '') + '>' + (spec.caption ? '<caption class="gd-sr">' + esc(spec.caption) + '</caption>' : '') + head + '<tbody>' + body + '</tbody></table>';
}
function renderLegendTable(spec) {
  const list = (spec.series || []).map((s, i) => { const k = Object.assign({ i }, s); k.color = s.tone ? toneColor(s.tone) : s.color || slotColor(Math.min(i, ceilOf(spec) - 1), spec); return k; });
  return frameless(Object.assign({}, spec, { frame: spec.frame }), list.length ? 'ready' : 'empty', legendTable(Object.assign({}, spec, { series: list })));
}

/* ============================================================================
   render / mount
   ============================================================================ */
const KINDS = { line: 'line', 'line-chart': 'line', area: 'area', 'area-chart': 'area', bar: 'bar', 'bar-chart': 'bar', hbar: 'hbar', 'horizontal-bar-chart': 'hbar', 'horizontal-bar': 'hbar', donut: 'donut', 'donut-chart': 'donut',
  breakdown: 'breakdown', 'breakdown-bar': 'breakdown', spark: 'spark', sparkline: 'spark', heatmap: 'heatmap', funnel: 'funnel', uptime: 'uptime', 'uptime-bar': 'uptime', 'legend-table': 'ltable', tip: 'tip', 'chart-tooltip': 'tip' };
function build(type, spec, opt) {
  const k = KINDS[type]; if (!k) throw new Error('GD.charts: unknown chart type "' + type + '"');
  spec = spec || {}; opt = opt || {};
  if (k === 'line' || k === 'area' || k === 'bar') return renderCart(k, spec, opt);
  return ({ hbar: renderHbar, donut: renderDonut, breakdown: renderBreakdown, spark: renderSpark, heatmap: renderHeat, funnel: renderFunnel, uptime: renderUptime, ltable: renderLegendTable, tip: (s) => ({ cls: '', attrs: {}, html: renderTip(s), bare: true }) })[k](spec, opt);
}
const attrStr = (a) => Object.keys(a || {}).map((k) => ' ' + k + '="' + esc(a[k]) + '"').join('');
C.render = function (type, spec, opt) {
  const b = build(type, spec, opt);
  if (b.bare && !b.cls) return b.html;
  return '<div class="' + b.cls + '" data-gd-chart-root data-gd-type="' + esc(KINDS[type]) + '"' + attrStr(b.attrs) + (opt && opt.embed ? " data-gd-spec='" + esc(JSON.stringify(spec)) + "'" : '') + '>' + b.html + '</div>';
};

function hiddenOf(root) { return (root.getAttribute('data-gd-hidden') || '').split(',').filter(Boolean).map(Number); }
function zoomOf(root) { const z = (root.getAttribute('data-gd-zoom') || '').split(',').map(Number); return z.length === 2 && z.every(num) ? z : null; }
function specOf(root) {
  let s = specs.get(root);
  if (!s) { try { s = JSON.parse(root.getAttribute('data-gd-spec') || 'null'); } catch (e) { s = null; } if (s) specs.set(root, s); }
  return s;
}
function sliceSpec(spec, z) {
  if (!z) return spec;
  const [a, b] = z, cut = (arr) => (arr || []).slice(a, b + 1), o = Object.assign({}, spec);
  o.labels = cut(spec.labels); if (spec.titles) o.titles = cut(spec.titles);
  o.series = (spec.series || []).map((s) => Object.assign({}, s, { data: cut(s.data), forecastFrom: num(s.forecastFrom) ? s.forecastFrom - a : s.forecastFrom }));
  o.events = (spec.events || []).filter((e) => e.at >= a && e.at <= b).map((e) => Object.assign({}, e, { at: e.at - a }));
  if (spec.incomplete) o.incomplete = Object.assign({}, spec.incomplete, { from: spec.incomplete.from - a });
  return o;
}
function draw(root) {
  const type = root.getAttribute('data-gd-type'), spec = specOf(root); if (!spec) return;
  const z = zoomOf(root), act = DOC && DOC.activeElement, focusSel = act && root.contains(act) && act.getAttribute && act.hasAttribute('data-gd-series') ? act.tagName + '[data-gd-series="' + act.getAttribute('data-gd-series') + '"]' : null;
  const w = root.clientWidth || 0, b = build(type, sliceSpec(spec, z), { hidden: hiddenOf(root), zoom: z, width: w || undefined, id: root.id || undefined });
  root.className = root.className.split(/\s+/).filter((c) => c && !/^gd-chart(--|$)/.test(c)).concat(b.cls ? b.cls.split(' ') : []).join(' ');
  Object.keys(b.attrs || {}).forEach((k) => root.setAttribute(k, b.attrs[k]));
  root.setAttribute('data-gd-chart-root', ''); root.setAttribute('data-gd-type', KINDS[type] || type);
  if (b.model) models.set(root, b.model); else models.delete(root);
  if (root.getAttribute('data-state') === 'loading') root.setAttribute('aria-busy', 'true'); else root.removeAttribute('aria-busy');
  root.innerHTML = b.html;
  ui.set(root, Object.assign(ui.get(root) || {}, { w, n: b.model ? b.model.n : 0 }));
  post(root);
  syncTables(root);
  if (focusSel) { const el = root.querySelector(focusSel); if (el) el.focus(); }
}
C.mount = function (host, type, spec) {
  specs.set(host, spec || {}); host.setAttribute('data-gd-type', KINDS[type] || type); host.setAttribute('data-gd-chart-root', '');
  if (!host.getAttribute('data-state') || (spec && spec.state)) host.setAttribute('data-state', (spec && spec.state) || 'ready');
  host.removeAttribute('data-gd-hidden'); host.removeAttribute('data-gd-zoom');
  draw(host); observe(host); return host;
};
C.update = function (host, patch) { const s = Object.assign({}, specOf(host) || {}, patch || {}); specs.set(host, s); draw(host); };
C.state = function (host, name, o) { const s = Object.assign({}, specOf(host) || {}, o || {}); if (name === 'ready') delete s.state; else s.state = name; specs.set(host, s); draw(host); host.dispatchEvent(new CustomEvent('gd:chart-state', { bubbles: true, detail: { state: name } })); };
C.toggle = function (host, i, on) {
  const h = hiddenOf(host), cur = h.indexOf(i) < 0, want = on == null ? !cur : !!on;
  if (want === cur) return;
  if (!want) { const m = models.get(host); if (m && m.vis.length <= 1) return; h.push(i); } else h.splice(h.indexOf(i), 1);
  if (h.length) host.setAttribute('data-gd-hidden', h.join(',')); else host.removeAttribute('data-gd-hidden');
  host.dispatchEvent(new CustomEvent('gd:series', { bubbles: true, detail: { index: i, on: want } }));
  draw(host);
};
C.zoom = function (host, z) { if (z) host.setAttribute('data-gd-zoom', z.join(',')); else host.removeAttribute('data-gd-zoom'); draw(host); };
C.init = function (scope) { (scope || DOC).querySelectorAll('[data-gd-chart]').forEach((el) => { let s = {}; try { s = JSON.parse(el.getAttribute('data-gd-spec') || '{}'); } catch (e) { /* keep {} */ } C.mount(el, el.getAttribute('data-gd-chart'), s); }); };

/* ---- measuring: tick thinning and re-decimation ---------------------------------- */
function thin(root) {
  root.querySelectorAll('.gd-xy__x').forEach((x) => {
    const ls = Array.from(x.children); if (!ls.length || !x.clientWidth) return;
    ls.forEach((l) => l.classList.remove('is-off'));
    let mw = 0; ls.forEach((l) => { mw = Math.max(mw, l.offsetWidth); });
    const n = +x.dataset.n || ls.length, k = +x.dataset.k || 1, pitch = x.clientWidth / (x.dataset.mode === 'band' ? n : Math.max(1, n - 1));
    const stride = Math.ceil(Math.max(1, Math.ceil((mw + 20) / pitch)) / k) * k;
    ls.forEach((l) => { if (+l.dataset.i % stride) l.classList.add('is-off'); });
  });
}
function post(root) { thin(root); }
let ro = null; const roW = new WeakMap();
function observe(root) {
  if (typeof ResizeObserver === 'undefined') return;
  ro = ro || new ResizeObserver((es) => es.forEach((e) => {
    const r = e.target, w = Math.round(e.contentRect.width), pw = roW.get(r); roW.set(r, w);
    if (pw == null) { thin(r); return; }
    const u = ui.get(r) || {}, m = models.get(r);
    if (m && m.n > 200 && Math.abs(w - (u.w || w)) / (u.w || w) > 0.2) draw(r); else thin(r);
  }));
  ro.observe(root);
}
C.observe = observe;
if (DOC && DOC.fonts && DOC.fonts.ready) DOC.fonts.ready.then(() => DOC.querySelectorAll('[data-gd-chart-root]').forEach(thin));

/* ============================================================================
   Interaction: delegated on document
   ============================================================================ */
function modelFor(root) {
  let m = models.get(root);
  if (!m) { const s = specOf(root); if (!s) return null; const b = build(root.getAttribute('data-gd-type'), sliceSpec(s, zoomOf(root)), { hidden: hiddenOf(root), width: root.clientWidth || undefined }); m = b.model; if (m) models.set(root, m); }
  return m;
}
const rootOf = (el) => el.closest('[data-gd-chart-root]');
function place(tip, box, x, y, gap) {
  const w = box.clientWidth, h = box.clientHeight, tw = tip.offsetWidth, th = tip.offsetHeight; gap = gap == null ? 12 : gap;
  tip.style.left = clamp(x + gap + tw > w ? x - gap - tw : x + gap, 0, Math.max(0, w - tw)) + 'px';
  tip.style.top = clamp(y - th / 2, 0, Math.max(0, h - th)) + 'px';
}
function showAt(plot, i, kbd) {
  const root = rootOf(plot), m = root && modelFor(root); if (!m) return;
  i = clamp(i, 0, m.n - 1);
  const st = ui.get(plot) || {}; st.i = i; ui.set(plot, st);
  const w = plot.clientWidth, h = plot.clientHeight, x = m.xf(i) * w;
  const cross = plot.querySelector('.gd-cross'), band = plot.querySelector('.gd-band'), tip = plot.querySelector('.gd-tip');
  plot.setAttribute('data-on', '');
  if (cross) cross.style.left = f1(x) + 'px';
  if (band) { band.style.left = f1(i / m.n * 100) + '%'; band.style.width = f1(100 / m.n) + '%'; }
  const rows = []; let tot = 0, y0 = h / 2;
  if (m.wf) {
    const r = m.wfRows[i]; rows.push({ name: r.kind === 'total' ? 'Total' : r.v >= 0 ? 'Increase' : 'Decrease', value: m.mk.full(r.kind === 'total' ? r.b : r.v), color: r.kind === 'good' ? 'var(--gd-good)' : r.kind === 'danger' ? 'var(--gd-danger)' : 'var(--gd-text-muted)' });
    if (r.kind !== 'total') rows.push({ name: 'Running total', value: m.mk.full(r.cum) });
  } else m.vis.forEach((s, k) => {
    const v = m.V(s, i), A = m.axes[m.axOf(s)], d = plot.querySelector('.gd-dot[data-s="' + s.i + '"]');
    if (v != null) tot += v;
    const fc = num(s.forecastFrom) && i > s.forecastFrom;
    rows.push({ name: (s.name || 'Series') + (fc ? ' (forecast)' : ''), value: v == null ? 'No data' : m.mk.full(v), color: s.color, dashed: s.cmp || fc });
    if (d) { if (v == null || m.band) d.style.display = 'none'; else { d.style.display = ''; const yy = m.stack ? 0 : (1 - A.pos(v)) * h; d.style.left = f1(x) + 'px'; d.style.top = f1(yy) + 'px'; if (k === 0) y0 = yy; } }
  });
  if (m.stack && m.band && rows.length) y0 = h * 0.3;
  const inc = m.spec.incomplete && num(m.spec.incomplete.from) && i >= m.spec.incomplete.from;
  const stackTot = m.stack ? m.mk.full(tot) : null;
  tip.innerHTML = tipHTML({ head: m.titles[i], note: inc ? (m.spec.incomplete.label || 'Data still arriving') : '', rows, total: stackTot });
  place(tip, plot, x, y0);
  if (kbd) { const live = root.querySelector('[data-gd-live]'); if (live) live.textContent = m.titles[i] + '. ' + rows.map((r) => r.name + ' ' + r.value).join(', ') + (inc ? '. Data still arriving.' : '') + '.'; }
}
function hide(plot) { plot.removeAttribute('data-on'); const d = plot.querySelectorAll('.gd-dot'); d.forEach((x) => { x.style.display = ''; }); }
function idxAt(plot, clientX) {
  const root = rootOf(plot), m = root && modelFor(root); if (!m) return 0;
  const r = plot.getBoundingClientRect(), f = clamp((clientX - r.left) / r.width, 0, 1);
  return m.band ? clamp(Math.floor(f * m.n), 0, m.n - 1) : (m.n === 1 ? 0 : Math.round(f * (m.n - 1)));
}
function drawBrush(plot, a, b) {
  const root = rootOf(plot), m = modelFor(root), br = plot.querySelector('.gd-brush'); if (!m || !br) return;
  const lo = Math.min(a, b), hi = Math.max(a, b), x0 = m.band ? lo / m.n : m.xf(lo), x1 = m.band ? (hi + 1) / m.n : m.xf(hi);
  br.style.left = f1(x0 * 100) + '%'; br.style.width = f1((x1 - x0) * 100) + '%'; br.setAttribute('data-on', '');
}
function commitBrush(plot, a, b) {
  const root = rootOf(plot), m = modelFor(root), br = plot.querySelector('.gd-brush'); if (br) br.removeAttribute('data-on');
  if (!m || a === b) return false;
  const lo = Math.min(a, b), hi = Math.max(a, b), z = zoomOf(root) || [0, 0], off = z[0];
  const ev = new CustomEvent('gd:range', { bubbles: true, cancelable: true, detail: { from: lo + off, to: hi + off, fromLabel: m.titles[lo], toLabel: m.titles[hi], labels: m.titles.slice(lo, hi + 1) } });
  if (root.dispatchEvent(ev)) { const sp = specOf(root); if (sp && hi - lo >= 1) C.zoom(root, [lo + off, hi + off]); }
  return true;
}
if (DOC) {
  /* pointer: crosshair + brush */
  DOC.addEventListener('pointermove', (e) => {
    const plot = e.target.closest && e.target.closest('[data-gd-plot]'); if (!plot) return;
    const st = ui.get(plot) || {}; if (e.pointerType === 'touch' && !st.drag) return;
    const i = idxAt(plot, e.clientX);
    if (st.drag) { if (Math.abs(e.clientX - st.x0) > 6) { st.moved = true; drawBrush(plot, st.a, i); } return; }
    if (st.raf) return; st.raf = requestAnimationFrame(() => { st.raf = 0; showAt(plot, i); }); ui.set(plot, st);
  });
  DOC.addEventListener('pointerleave', (e) => { const plot = e.target.closest && e.target.closest('[data-gd-plot]'); if (plot && plot === e.target && DOC.activeElement !== plot) hide(plot); }, true);
  DOC.addEventListener('pointerdown', (e) => {
    const plot = e.target.closest && e.target.closest('[data-gd-plot]'); if (!plot || e.button || plot.getAttribute('data-brush') === 'off' || e.target.closest('.gd-evt')) return;
    const st = ui.get(plot) || {}; st.drag = true; st.moved = false; st.x0 = e.clientX; st.a = idxAt(plot, e.clientX); ui.set(plot, st);
    try { plot.setPointerCapture(e.pointerId); } catch (x) { /* synthetic pointer */ }
  });
  DOC.addEventListener('pointerup', (e) => {
    const plot = e.target.closest && e.target.closest('[data-gd-plot]'); if (!plot) return;
    const st = ui.get(plot); if (!st || !st.drag) return; st.drag = false;
    if (st.moved) { st.moved = false; commitBrush(plot, st.a, idxAt(plot, e.clientX)); } else showAt(plot, idxAt(plot, e.clientX));
  });
  DOC.addEventListener('pointercancel', (e) => { const plot = e.target.closest && e.target.closest('[data-gd-plot]'); if (plot) { const st = ui.get(plot); if (st) st.drag = false; const b = plot.querySelector('.gd-brush'); if (b) b.removeAttribute('data-on'); } });
  /* keyboard on the plot */
  DOC.addEventListener('focusin', (e) => { const plot = e.target.matches && e.target.matches('[data-gd-plot]') ? e.target : null; if (plot && e.target.matches(':focus-visible')) { const m = modelFor(rootOf(plot)); const st = ui.get(plot) || {}; showAt(plot, st.i != null ? st.i : (m ? m.n - 1 : 0), true); } });
  DOC.addEventListener('focusout', (e) => { const plot = e.target.matches && e.target.matches('[data-gd-plot]') ? e.target : null; if (plot) { hide(plot); const b = plot.querySelector('.gd-brush'); if (b) b.removeAttribute('data-on'); const st = ui.get(plot); if (st) st.anchor = null; } });
  DOC.addEventListener('keydown', (e) => {
    const plot = e.target.matches && e.target.matches('[data-gd-plot]') ? e.target : null;
    if (plot) {
      const m = modelFor(rootOf(plot)); if (!m) return; const st = ui.get(plot) || {}; let i = st.i != null ? st.i : m.n - 1, nx = null;
      if (e.key === 'ArrowRight') nx = i + 1; else if (e.key === 'ArrowLeft') nx = i - 1; else if (e.key === 'Home') nx = 0; else if (e.key === 'End') nx = m.n - 1;
      else if (e.key === 'PageDown') nx = i + Math.max(1, Math.round(m.n / 10)); else if (e.key === 'PageUp') nx = i - Math.max(1, Math.round(m.n / 10));
      else if (e.key === 'Escape') { hide(plot); st.anchor = null; const b = plot.querySelector('.gd-brush'); if (b) b.removeAttribute('data-on'); return; }
      else if (e.key === 'Enter' && st.anchor != null && st.anchor !== i) { e.preventDefault(); commitBrush(plot, st.anchor, i); st.anchor = null; return; }
      if (nx == null) return; e.preventDefault(); nx = clamp(nx, 0, m.n - 1);
      if (e.shiftKey && plot.getAttribute('data-brush') !== 'off') { if (st.anchor == null) st.anchor = i; drawBrush(plot, st.anchor, nx); } else { st.anchor = null; const b = plot.querySelector('.gd-brush'); if (b) b.removeAttribute('data-on'); }
      ui.set(plot, st); showAt(plot, nx, true); return;
    }
    const up = e.target.matches && e.target.matches('[data-gd-uptime]') ? e.target : null;
    if (up) {
      const segs = Array.from(up.querySelectorAll('.gd-uptime__seg')), cur = segs.findIndex((s) => s.hasAttribute('data-on'));
      let nx = e.key === 'ArrowRight' ? cur + 1 : e.key === 'ArrowLeft' ? (cur < 0 ? segs.length - 1 : cur - 1) : e.key === 'Home' ? 0 : e.key === 'End' ? segs.length - 1 : e.key === 'Escape' ? -2 : null;
      if (nx == null) return; e.preventDefault(); segs.forEach((s) => s.removeAttribute('data-on'));
      if (nx === -2) { tipHide(up); return; } nx = clamp(nx, 0, segs.length - 1); segs[nx].setAttribute('data-on', ''); tipShow(segs[nx], true); return;
    }
    const cell = e.target.matches && e.target.matches('.gd-heat__cell[role="gridcell"]') ? e.target : null;
    if (cell) {
      const g = cell.closest('[data-gd-heat]'), rows = Array.from(g.querySelectorAll('[role="row"]')).map((r) => Array.from(r.querySelectorAll('.gd-heat__cell[role="gridcell"]'))).filter((r) => r.length);
      let r = rows.findIndex((x) => x.indexOf(cell) >= 0), c = rows[r].indexOf(cell);
      if (e.key === 'ArrowRight') c++; else if (e.key === 'ArrowLeft') c--; else if (e.key === 'ArrowDown') r++; else if (e.key === 'ArrowUp') r--;
      else if (e.key === 'Home') c = 0; else if (e.key === 'End') c = 1e6; else if (e.key === 'Escape') { tipHide(g); return; } else return;
      e.preventDefault();
      r = clamp(r, 0, rows.length - 1); const best = rows[r][clamp(c, 0, rows[r].length - 1)];
      if (best && best !== cell) { cell.tabIndex = -1; best.tabIndex = 0; best.focus(); }
    }
  });
  /* generic tooltip: [data-gd-tip] inside [data-gd-tipbox] */
  const tipShow = (el, kbd) => {
    const box = el.closest('[data-gd-tipbox]'), tip = box && box.querySelector(':scope > .gd-tip, .gd-tip'); if (!tip) return;
    let head = el.getAttribute('data-gd-tip'), raw = el.getAttribute('data-gd-tip-body') || '';
    if (head == null) { const al = el.getAttribute('aria-label') || '', k = al.lastIndexOf(': '); head = k < 0 ? al : al.slice(0, k); raw = k < 0 ? '' : al.slice(k + 2); }
    const body = raw.split('\n').filter(Boolean), c = el.getAttribute('data-gd-tip-c');
    tip.innerHTML = tipHTML({ head, rows: body.map((t, k) => ({ name: t, value: '', color: k === 0 ? c : null })) }).replace(/<span class="gd-tip__v gd-num"><\/span>/g, '');
    tip.setAttribute('data-on', '');
    const br = box.getBoundingClientRect(), er = el.getBoundingClientRect(), x = er.left - br.left + er.width / 2, tw = tip.offsetWidth, th = tip.offsetHeight;
    tip.style.left = clamp(x - tw / 2, 0, Math.max(0, box.clientWidth - tw)) + 'px';
    const below = er.top - br.top - th - 8 < -40;                        // flip under when there is no room above
    tip.style.top = (below ? er.bottom - br.top + 8 : er.top - br.top - th - 8) + 'px'; tip.style.bottom = 'auto';
    if (kbd) { const live = box.querySelector('[aria-live]'); if (live) live.textContent = head + '. ' + body.join(', '); }
  };
  const tipHide = (el) => { const box = el.closest('[data-gd-tipbox]'); const tip = box && box.querySelector('.gd-tip'); if (tip) tip.removeAttribute('data-on'); };
  DOC.addEventListener('pointerover', (e) => { const el = e.target.closest && e.target.closest('[data-gd-tip], [data-gd-tipcell]'); if (el) tipShow(el); });
  DOC.addEventListener('pointerout', (e) => { const el = e.target.closest && e.target.closest('[data-gd-tip], [data-gd-tipcell]'); if (el && !(e.relatedTarget && el.contains(e.relatedTarget))) tipHide(el); });
  DOC.addEventListener('focusin', (e) => { const el = e.target.closest && e.target.closest('[data-gd-tip], [data-gd-tipcell]'); if (el && e.target.matches(':focus-visible')) tipShow(el, true); });
  DOC.addEventListener('focusout', (e) => { const el = e.target.closest && e.target.closest('[data-gd-tip], [data-gd-tipcell]'); if (el) tipHide(el); });

  /* legend key / legend-table checkbox -> toggle a series; hover isolates it */
  const targetOf = (el) => {
    const t = el.closest('[data-gd-for]'); if (t) { try { return DOC.querySelector(t.getAttribute('data-gd-for')); } catch (x) { return null; } }
    return rootOf(el);
  };
  DOC.addEventListener('click', (e) => {
    const k = e.target.closest && e.target.closest('button[data-gd-series]');
    if (k) { const r = targetOf(k); if (r) C.toggle(r, +k.getAttribute('data-gd-series')); return; }
    if (e.target.closest && e.target.closest('[data-gd-chart-reset]')) { const r = rootOf(e.target); if (r) C.zoom(r, null); return; }
    const rt = e.target.closest && e.target.closest('[data-gd-chart-retry]');
    if (rt) { const r = rootOf(rt); if (r) { C.state(r, 'loading'); r.dispatchEvent(new CustomEvent('gd:chart-retry', { bubbles: true })); } }
  });
  DOC.addEventListener('change', (e) => {
    const k = e.target.matches && e.target.matches('input[data-gd-series]') ? e.target : null; if (!k) return;
    const r = targetOf(k); if (!r) return; const i = +k.getAttribute('data-gd-series'), before = hiddenOf(r).indexOf(i) < 0;
    C.toggle(r, i, k.checked); if ((hiddenOf(r).indexOf(i) < 0) === before && k.checked !== before) k.checked = before;   // refused: keep one series visible
    const row = k.closest('tr'); if (row) { if (k.checked) row.removeAttribute('data-off'); else row.setAttribute('data-off', ''); }
  });
  const hl = (e, on) => {
    const k = e.target.closest && e.target.closest('[data-gd-series], [data-gd-series-row]'); if (!k) return;
    const i = k.getAttribute('data-gd-series') || k.getAttribute('data-gd-series-row'), r = targetOf(k); if (!r) return;
    if (on) r.setAttribute('data-hl', i); else r.removeAttribute('data-hl');
  };
  DOC.addEventListener('pointerover', (e) => hl(e, true)); DOC.addEventListener('pointerout', (e) => hl(e, false));
  DOC.addEventListener('focusin', (e) => hl(e, true)); DOC.addEventListener('focusout', (e) => hl(e, false));

  /* donut: hover/focus a slice or legend row -> centre shows it */
  const donut = (e, on) => {
    const it = e.target.closest && e.target.closest('.gd-donut__item, .gd-donut__arc'); if (!it) return;
    const d = it.closest('.gd-donut'), i = it.getAttribute('data-i'), c = d.querySelector('.gd-donut__centre');
    d.querySelectorAll('[data-on]').forEach((x) => x.removeAttribute('data-on'));
    if (on) { d.setAttribute('data-active', i); d.querySelectorAll('[data-i="' + i + '"]').forEach((x) => x.setAttribute('data-on', '')); const li = d.querySelector('.gd-donut__item[data-i="' + i + '"]'); c.querySelector('b').textContent = li.dataset.v; c.querySelector('span').textContent = li.dataset.l; }
    else { d.removeAttribute('data-active'); c.querySelector('b').textContent = d.dataset.tv; c.querySelector('span').textContent = d.dataset.tl; }
  };
  DOC.addEventListener('pointerover', (e) => donut(e, true)); DOC.addEventListener('pointerout', (e) => donut(e, false));
  DOC.addEventListener('focusin', (e) => donut(e, true)); DOC.addEventListener('focusout', (e) => donut(e, false));

  /* declarative mount, and re-mount when a page swap inserts new hosts */
  const boot = () => { C.init(DOC); if (typeof MutationObserver !== 'undefined') new MutationObserver((ms) => ms.forEach((m) => m.addedNodes.forEach((n) => { if (n.nodeType === 1) { if (n.matches('[data-gd-chart]')) C.init(n.parentNode); else if (n.querySelector && n.querySelector('[data-gd-chart]')) C.init(n); } }))).observe(DOC.documentElement, { childList: true, subtree: true }); };
  if (DOC.readyState === 'loading') DOC.addEventListener('DOMContentLoaded', boot); else boot();
}
function syncTables(root) {
  if (!root.id || !DOC) return;
  DOC.querySelectorAll('[data-gd-for="#' + root.id + '"] input[data-gd-series]').forEach((c) => { const on = hiddenOf(root).indexOf(+c.getAttribute('data-gd-series')) < 0; c.checked = on; const r = c.closest('tr'); if (r) { if (on) r.removeAttribute('data-off'); else r.setAttribute('data-off', ''); } });
}
