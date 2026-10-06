/* Explorer: the query is the source of truth. Pick a metric, group it, filter it, press Run query. Editing the query marks the
   result as out of date instead of silently redrawing; running shows the chart and table at their real size while they load.
   The data is generated from data.js, so the totals match the Overview for the same range. */
(function () {
  'use strict';
  var S = SUP, U = SUPUI, DAY = S.DAY;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  var METRIC = {
    created: { label: 'Tickets created', unit: '', fmt: function (v) { return S.nf(v); }, agg: 'sum', day: function (r) { return r.created; } },
    resolved: { label: 'Tickets resolved', unit: '', fmt: function (v) { return S.nf(v); }, agg: 'sum', day: function (r) { return r.resolved; } },
    frt: { label: 'First response time', unit: ' min', fmt: function (v) { return Math.round(v) + ' min'; }, agg: 'mean', day: function (r) { return r.frt; } },
    csat: { label: 'Satisfaction', unit: '%', fmt: function (v) { return v.toFixed(1) + '%'; }, agg: 'mean', day: function (r) { return r.csat; } }
  };
  var GROUP = {
    queue: { label: 'Queue', keys: S.QUEUES, share: [0.24, 0.31, 0.17, 0.16, 0.12], tilt: [1.2, 0.9, 1.0, 0.8, 1.1] },
    priority: { label: 'Priority', keys: S.PRIORITIES, share: [0.12, 0.24, 0.48, 0.16], tilt: [0.7, 0.85, 1.0, 1.3] },
    channel: { label: 'Channel', keys: S.CHANNELS, share: [0.46, 0.28, 0.18, 0.08], tilt: [1.0, 0.8, 1.2, 1.4] }
  };
  /* a filter narrows the volume (and nudges rates), the way a real filter would; the factors are illustrative */
  var FILTER = { queue: { label: 'Queue is Billing', value: 'Billing', f: 0.24, rate: 1.18 }, priority: { label: 'Priority is Urgent', value: 'Urgent', f: 0.12, rate: 0.7 }, channel: { label: 'Channel is Email', value: 'Email', f: 0.46, rate: 1.05 } };

  var q = { visualize: 'line', metric: 'created', group: 'queue', filter: [], days: 30 };
  var applied = null, charts = {};

  function readQuery() {
    var qb = $('#qb'), one = function (sec) { var c = $('[data-gd-qb-sec="' + sec + '"] .gd-qb__chip', qb); return c ? c.dataset.value : null; };
    var vis = $('[data-gd-qb-sec="visualize"] [aria-checked="true"]', qb);
    return { visualize: vis ? vis.dataset.value : 'line', metric: one('metric'), group: one('group'), filter: $$('[data-gd-qb-sec="filter"] .gd-qb__chip', qb).map(function (c) { return c.dataset.value; }), days: q.days };
  }
  var sig = function (x) { return JSON.stringify([x.visualize, x.metric, x.group, x.filter, x.days]); };

  /* ---- the result for a query -------------------------------------------------------------------------- */
  function compute(x) {
    var m = METRIC[x.metric], end = S.END, from = end - (x.days - 1) * DAY, recs = S.recs(from, end);
    // a filter on the dimension you group by keeps only that group; the group's own share already carries the narrowing
    var own = x.filter.filter(function (k) { return k === x.group; }), others = x.filter.filter(function (k) { return k !== x.group; });
    var f = others.reduce(function (a, k) { return a * FILTER[k].f; }, 1), rate = others.reduce(function (a, k) { return a * FILTER[k].rate; }, 1);
    var val = function (r) { var v = m.day(r); return m.agg === 'sum' ? v * f : Math.min(m.unit === '%' ? 99 : 1e9, v * rate); };
    var out = { m: m, from: from, end: end, labels: recs.map(function (r) { return S.short(r.t); }), titles: recs.map(function (r) { return S.DOW[new Date(r.t).getUTCDay()] + ', ' + S.short(r.t); }) };
    if (x.group) {
      var g = GROUP[x.group];
      var keep = own.length ? [FILTER[own[0]].value] : g.keys;
      out.series = g.keys.map(function (k, i) {
        return { name: k, data: recs.map(function (r, d) { var w = 1 + (S.hash(d * 7 + i * 3 + 11) - 0.5) * 0.2; var v = val(r); return m.agg === 'sum' ? Math.round(v * g.share[i] * w) : Math.round(v * g.tilt[i] * w * 10) / 10; }) };
      }).filter(function (sr) { return keep.indexOf(sr.name) > -1; });
    } else out.series = [{ name: m.label, data: recs.map(function (r) { return Math.round(val(r) * 10) / 10; }) }];
    out.rows = out.series.map(function (s) {
      var total = s.data.reduce(function (a, v) { return a + v; }, 0), value = m.agg === 'sum' ? total : total / s.data.length;
      return { label: s.name, value: value, peak: Math.max.apply(null, s.data), low: Math.min.apply(null, s.data) };
    });
    return out;
  }
  var title = function (x) { return METRIC[x.metric].label + (x.group ? ' by ' + GROUP[x.group].label.toLowerCase() : ''); };

  /* ---- drawing ------------------------------------------------------------------------------------------ */
  /* a chart stops at three series (R11). More groups than that fold into Other, so nothing is dropped; the table lists every group. */
  function fold(r) {
    if (r.series.length <= 3) return { series: r.series, note: '' };
    var total = function (s) { return s.data.reduce(function (a, v) { return a + v; }, 0); }, ord = r.series.slice().sort(function (a, b) { return total(b) - total(a); });
    var top = ord.slice(0, 2), rest = ord.slice(2), mean = r.m.agg === 'mean';
    var other = { name: 'Other', data: top[0].data.map(function (_, d) { var t = rest.reduce(function (a, s) { return a + s.data[d]; }, 0); return Math.round((mean ? t / rest.length : t) * 10) / 10; }) };
    return { series: top.concat(other), note: 'Showing the top 2 of ' + r.series.length + ' groups, with the rest folded into Other. The table lists every group.' };
  }
  function drawChart(x, r) {
    if (x.visualize === 'table') return;
    var host = $('#ex-chart'), f = fold(r);
    var spec = { size: 'sm', card: false, legend: x.group ? true : false, labels: r.labels, titles: r.titles, series: f.series, format: 'number', footnote: f.note };
    var type = x.visualize === 'bar' ? 'bar' : 'line';
    if (charts.type && charts.type !== type) { host.innerHTML = ''; charts.type = null; charts.mounted = false; }
    if (charts.mounted) GD.charts.update(host, spec); else { GD.charts.mount(host, type, spec); charts.mounted = true; charts.type = type; }
  }
  function drawTable(x, r) {
    var m = r.m, g = x.group ? GROUP[x.group].label : 'Series';
    $('#ex-results').innerHTML = '<div class="gd-tview gd-tview--flush"><div class="gd-table-wrap"><div class="gd-table" role="table" aria-label="Results" style="--gd-cols:minmax(160px,2fr) minmax(110px,1fr) minmax(110px,1fr) minmax(110px,1fr); --gd-table-min:520px">' +
      '<div class="gd-table__row gd-table__row--head" role="row"><div class="gd-table__th" role="columnheader">' + g + '</div><div class="gd-table__th gd-table__th--num" role="columnheader">' + (m.agg === 'sum' ? 'Total' : 'Average') + '</div><div class="gd-table__th gd-table__th--num" role="columnheader">Highest day</div><div class="gd-table__th gd-table__th--num" role="columnheader">Lowest day</div></div>' +
      '<div class="gd-table__body" role="rowgroup">' + r.rows.map(function (row) {
        return '<div class="gd-table__row" role="row"><div class="gd-table__cell gd-table__cell--strong" role="cell">' + U.esc(row.label) + '</div><div class="gd-table__cell gd-table__cell--num" role="cell">' + m.fmt(row.value) + '</div><div class="gd-table__cell gd-table__cell--num" role="cell">' + m.fmt(row.peak) + '</div><div class="gd-table__cell gd-table__cell--num" role="cell">' + m.fmt(row.low) + '</div></div>';
      }).join('') + '</div></div></div></div>';
    $('#ex-count').textContent = r.rows.length + (r.rows.length === 1 ? ' row' : ' rows');
  }
  function render(x) {
    var r = compute(x);
    $('#ex-title').textContent = title(x);
    $('#ex-range').textContent = S.long(r.from) + ' to ' + S.long(r.end) + (x.filter.length ? ' · ' + x.filter.map(function (k) { return FILTER[k].label; }).join(', ') : '');
    drawChart(x, r); drawTable(x, r);
    var asTable = x.visualize === 'table';           // Table means the results alone: the chart pane and its splitter step aside
    $('#ex-c').hidden = asTable; $('[data-gd-resizer="chart"]').hidden = asTable;
    applied = x; hint();
    return r;
  }
  function hint() { var stale = !applied || sig(readQuery()) !== sig(applied); $('#qb-hint').textContent = stale ? 'Query changed. Run it to update.' : ''; }

  /* ---- running shows the layout while it loads --------------------------------------------------------------- */
  var running = false;
  function run() {
    if (running) return; running = true;
    var x = readQuery(), h = $('#ex-chart'), c = h.closest('.gd-explorer__pane');
    if (!x.metric) { U.toast('Pick a metric to run the query', 'warning'); running = false; return; }
    c.setAttribute('aria-busy', 'true'); GD.charts.state && charts.mounted && GD.charts.state(h, 'loading');
    setTimeout(function () { c.removeAttribute('aria-busy'); if (charts.mounted) GD.charts.state(h, 'ready'); q = Object.assign(q, x); render(x); running = false; }, 350);
  }

  document.addEventListener('gd:query-action', function (e) { if (e.detail.action === 'run') run(); });
  document.addEventListener('gd:query', function () { hint(); });
  document.addEventListener('gd:change', function (e) {
    if (e.target.id === 'period') { q.days = +e.detail.value; hint(); }
  });
  $('#export-btn').addEventListener('click', function () {
    var x = applied || readQuery(), r = compute(x), lines = [['Date'].concat(r.series.map(function (s) { return s.name; }))];
    r.labels.forEach(function (l, i) { lines.push([l].concat(r.series.map(function (s) { return s.data[i]; }))); });
    var url = URL.createObjectURL(new Blob([lines.map(function (l) { return l.join(','); }).join('\n')], { type: 'text/csv' })), a = document.createElement('a');
    a.href = url; a.download = 'explorer-' + x.metric + '.csv'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    U.toast('Export ready, ' + (lines.length - 1) + ' days', 'success');
  });

  render(readQuery());
})();
