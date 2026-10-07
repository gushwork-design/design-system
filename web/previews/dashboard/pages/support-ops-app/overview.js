/* Support overview: one date range drives the cards and charts; the backlog and the attention table read the current tickets.
   All figures come from data.js, so they are invented, stable between loads and consistent with the Tickets page. */
(function () {
  'use strict';
  var S = SUP, U = SUPUI, DAY = S.DAY;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var pct1 = function (n) { return n.toFixed(1) + '%'; };

  var st = { from: S.END - 29 * DAY, to: S.END, granularity: 'day', compare: 'prev' };
  var mounted = {};

  function period() {
    var days = Math.round((st.to - st.from) / DAY) + 1, cur = S.recs(st.from, st.to), prev = null, prevName = '';
    if (st.compare === 'prev') { prev = S.recs(st.from - days * DAY, st.from - DAY); prevName = 'Previous period'; }
    if (st.compare === 'year') { prev = S.recs(st.from - 364 * DAY, st.to - 364 * DAY); prevName = 'Same period last year'; }
    return { days: days, cur: cur, prev: prev, prevName: prevName, s: S.sum(cur), p: prev ? S.sum(prev) : null };
  }
  function put(host, type, spec) { if (mounted[host.id]) GD.charts.update(host, spec); else { GD.charts.mount(host, type, spec); mounted[host.id] = 1; } }

  /* ---- stat cards ---------------------------------------------------------------------------------- */
  var openTickets = function () { return S.TICKETS.filter(function (t) { return t.status !== 'Resolved'; }); };
  var METRICS = {
    'sc-created': { val: function (s) { return S.nf(s.created); }, num: function (s) { return s.created; }, day: function (r) { return r.created; }, good: 1, name: 'Tickets created per day' },
    'sc-frt': { val: function (s) { return Math.round(s.frt) + ' min'; }, num: function (s) { return s.frt; }, day: function (r) { return r.frt; }, good: -1, name: 'Median first response per day, in minutes' },
    'sc-csat': { val: function (s) { return pct1(s.csat); }, num: function (s) { return s.csat; }, day: function (r) { return r.csat; }, pts: true, good: 1, name: 'Satisfaction per day, as a percentage' }
  };
  function deltaHTML(m, s, p, name) {
    if (!p) return '<span class="gd-stat-card__compare">No comparison selected</span>';
    var a = m.num(s), b = m.num(p), ch = m.pts ? a - b : (b ? (a - b) / b * 100 : 0), dir = Math.abs(ch) < 0.05 ? 'flat' : ch > 0 ? 'up' : 'down';
    var tone = dir === 'flat' ? 'neutral' : (ch * m.good > 0 ? 'good' : 'bad'), txt = Math.abs(ch).toFixed(1) + (m.pts ? ' pts' : '%');
    var sr = dir === 'flat' ? 'No change' : (dir === 'up' ? 'Up ' : 'Down ') + txt.replace('%', ' percent') + ', ' + (tone === 'good' ? 'better' : 'worse') + ' than ' + name;
    return '<span class="gd-delta gd-delta--' + tone + '"><span class="gd-delta__arrow" data-dir="' + dir + '"></span><span class="gd-delta__value">' + txt + '</span><span class="gd-sr">' + sr + '</span></span><span class="gd-stat-card__compare">vs ' + name + '</span>';
  }
  function renderCards(P) {
    var nm = st.compare === 'year' ? 'same period last year' : 'previous period';
    Object.keys(METRICS).forEach(function (id) {
      var m = METRICS[id], card = $('#' + id), vals = P.cur.map(m.day);
      $('[data-v]', card).textContent = m.val(P.s);
      $('[data-meta]', card).innerHTML = deltaHTML(m, P.s, P.p, nm);
      var host = $('[data-spark]', card), spec = { values: vals.map(function (v) { return Math.round(v * 10) / 10; }), tone: 'accent', alt: m.name + ', ' + S.short(st.from) + ' to ' + S.short(st.to) + '. Low ' + Math.round(Math.min.apply(null, vals)) + ', high ' + Math.round(Math.max.apply(null, vals)) + '.' };
      if (host._m) GD.charts.update(host, spec); else { GD.charts.mount(host, 'spark', spec); host._m = 1; }
    });
    // the backlog is "right now", not a range, so it carries no comparison and no sparkline
    var b = $('#sc-backlog');
    $('[data-v]', b).textContent = S.nf(openTickets().length);
    $('[data-spark]', b).hidden = true;
    $('[data-meta]', b).innerHTML = '<span class="gd-stat-card__compare">Open and pending, all queues</span>';
  }

  /* ---- charts -------------------------------------------------------------------------------------- */
  function bucketize(a, n) { var out = []; for (var i = 0; i < a.length; i += n) out.push(a.slice(i, i + n)); return out; }
  function lineSpec(P) {
    var g = st.granularity, n = g === 'week' ? 7 : g === 'month' ? 30 : 1, note = '';
    if (n > 1 && P.days < n * 2) { n = 1; note = (g === 'week' ? 'Weekly' : 'Monthly') + ' grouping needs at least ' + (g === 'week' ? 14 : 60) + ' days, so this range is shown by day.'; }
    var cb = bucketize(P.cur, n), pb = P.prev ? bucketize(P.prev, n) : null, tot = function (k) { return function (b) { return b.reduce(function (a, r) { return a + r[k]; }, 0); }; };
    var labels = cb.map(function (b) { return S.short(b[0].t); }), titles = cb.map(function (b) { return n === 1 ? S.DOW[new Date(b[0].t).getUTCDay()] + ', ' + S.short(b[0].t) : S.short(b[0].t) + ' to ' + S.short(b[b.length - 1].t); });
    var series = [{ name: 'Created', data: cb.map(tot('created')) }, { name: 'Resolved', data: cb.map(tot('resolved')) }];
    if (pb) series.push({ name: 'Created, ' + P.prevName.toLowerCase(), data: pb.map(tot('created')).slice(0, cb.length), comparison: true });
    return { title: 'Tickets created and resolved per ' + (n === 1 ? 'day' : n === 7 ? 'week' : '30 days'), description: S.long(st.from) + ' to ' + S.long(st.to), size: 'sm', card: true, legend: true, labels: labels, titles: titles, series: series, footnote: note };
  }
  function renderCharts(P) {
    put($('#ch-line'), 'line', lineSpec(P));
    var byQ = {}; S.QUEUES.forEach(function (q) { byQ[q] = 0; });
    P.cur.forEach(function (r) { S.QUEUES.forEach(function (q) { byQ[q] += r.queue[q]; }); });
    put($('#ch-queue'), 'hbar', { title: 'Tickets by queue', description: 'Created in the range', size: 'sm', card: true, items: S.QUEUES.map(function (q) { return { label: q, value: byQ[q] }; }) });
  }

  /* ---- needs attention ---------------------------------------------------------------------------------- */
  var waiting = function (t) { var h = (S.END + 17 * S.HOUR - t.created) / S.HOUR; return h < 24 ? Math.round(h) + ' h' : Math.round(h / 24) + ' d'; };
  function renderAttention() {
    var rank = { Urgent: 0, High: 1 };
    var rows = openTickets().filter(function (t) { return t.priority in rank; }).sort(function (a, b) { return rank[a.priority] - rank[b.priority] || a.created - b.created; }).slice(0, 6);
    $('#attn .gd-table__body').innerHTML = rows.map(function (t) {
      var a = S.agentById(t.assignee);
      return '<div class="gd-table__row" role="row" data-gd-id="' + t.id + '">' +
        '<div class="gd-table__cell gd-table__cell--strong" role="cell" title="' + U.esc(t.subject) + '"><a class="gd-table__link" href="' + U.ticketHref(t.id) + '">' + U.esc(t.subject) + '</a></div>' +
        '<div class="gd-table__cell gd-table__cell--flex" role="cell">' + U.priorityBadge(t.priority) + '</div>' +
        '<div class="gd-table__cell" role="cell">' + U.esc(t.queue) + '</div>' +
        '<div class="gd-table__cell gd-table__cell--num" role="cell">' + waiting(t) + '</div>' +
        '<div class="gd-table__cell gd-table__cell--flex" role="cell">' + (a ? '<span class="gd-table__avatar" aria-hidden="true">' + U.initials(a.name) + '</span><span class="gd-table__who"><b class="gd-table__trunc">' + U.esc(a.name) + '</b></span>' : '<span class="gd-table__cell--muted">Unassigned</span>') + '</div>' +
        '</div>';
    }).join('');
  }

  function renderAll() { var P = period(); renderCards(P); renderCharts(P); }
  renderAttention();
  renderAll();

  /* ---- range bar: the one control for time. Chart brushes emit gd:range too, so only the bar's own event counts. ---- */
  document.addEventListener('gd:range', function (e) {
    var bar = e.target.closest && e.target.closest('[data-gd-rangebar]'); if (!bar || e.target !== bar) return;
    var d = e.detail; st.from = S.parseISO(d.from); st.to = S.parseISO(d.to); st.granularity = d.granularity; st.compare = d.compare; renderAll();
  });

  /* ---- export the daily series for the range ---- */
  $('#export-btn').addEventListener('click', function () {
    var P = period(), head = ['Date', 'Created', 'Resolved', 'Median first response (min)', 'Satisfaction (%)'];
    var lines = [head].concat(P.cur.map(function (r) { return [S.iso(r.t).slice(0, 10), r.created, r.resolved, Math.round(r.frt), r.csat.toFixed(1)]; }));
    var url = URL.createObjectURL(new Blob([lines.map(function (l) { return l.join(','); }).join('\n')], { type: 'text/csv' })), a = document.createElement('a');
    a.href = url; a.download = 'support-' + S.iso(st.from).slice(0, 10) + '-to-' + S.iso(st.to).slice(0, 10) + '.csv';
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    U.toast('Export ready, ' + P.days + ' days', 'success');
  });
})();
