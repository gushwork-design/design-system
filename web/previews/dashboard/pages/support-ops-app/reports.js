/* Reports: three saved reports on one page, chosen by the rail (reports.html?report=response). Each is a row of headline figures,
   two charts and a table, for the period picked above. Figures come from data.js, so they agree with the Overview. */
(function () {
  'use strict';
  var S = SUP, U = SUPUI, DAY = S.DAY, TARGET = 60;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var key = U.param('report'); if (['weekly', 'response', 'satisfaction'].indexOf(key) < 0) key = 'weekly';
  key = U.bindTabs('report', key, 'weekly', function (v) { key = v; render(); });
  var days = 30, mounted = {};

  var sumOf = function (a, k) { return a.reduce(function (t, r) { return t + r[k]; }, 0); };
  var meanOf = function (a, k) { return a.length ? sumOf(a, k) / a.length : 0; };
  var periods = function () { var cur = S.recs(S.END - (days - 1) * DAY, S.END), prev = S.recs(S.END - (2 * days - 1) * DAY, S.END - days * DAY); return { cur: cur, prev: prev }; };
  function put(id, type, spec) { var h = $('#' + id); if (mounted[id] === type) GD.charts.update(h, spec); else { h.innerHTML = ''; GD.charts.mount(h, type, spec); mounted[id] = type; } }
  function table(cols, rows, label) {
    var tpl = cols.map(function (c) { return c.w; }).join(' ');
    $('#rt').style.cssText = '--gd-cols:' + tpl + '; --gd-table-min:640px';
    $('#rt').setAttribute('aria-label', label);
    $('#rt').innerHTML = '<div class="gd-table__row gd-table__row--head" role="row">' + cols.map(function (c) { return U.th(c.key, c.label, { num: c.num, sort: false }); }).join('') + '</div><div class="gd-table__body" role="rowgroup">' + rows.join('') + '</div>';
  }
  var row = function (cells) { return '<div class="gd-table__row" role="row">' + cells.join('') + '</div>'; };
  var QW = [1.18, 1.0, 0.9, 0.8, 1.05];                     // how much slower or faster each queue is than the desk median, illustrative

  var REPORTS = {
    weekly: function (P) {
      var c = P.cur, p = P.prev, bucket = function (a) { var o = []; for (var i = 0; i < a.length; i += 7) o.push(a.slice(i, i + 7)); return o; }, wk = bucket(c.slice(c.length - Math.floor(c.length / 7) * 7));   // whole weeks only, counted back from today, so the last bar is never a part-week
      U.statCards($('#r-cards'), [
        { name: 'Tickets created', value: S.nf(sumOf(c, 'created')), meta: U.delta(sumOf(c, 'created'), sumOf(p, 'created'), { good: 1 }) },
        { name: 'Tickets resolved', value: S.nf(sumOf(c, 'resolved')), meta: U.delta(sumOf(c, 'resolved'), sumOf(p, 'resolved'), { good: 1 }) },
        { name: 'Backlog change', value: (sumOf(c, 'created') - sumOf(c, 'resolved') >= 0 ? '+' : '') + S.nf(sumOf(c, 'created') - sumOf(c, 'resolved')), meta: '<span class="gd-stat-card__compare">Created minus resolved</span>' },
        { name: 'Customer satisfaction', value: meanOf(c, 'csat').toFixed(1) + '%', meta: U.delta(meanOf(c, 'csat'), meanOf(p, 'csat'), { good: 1, pts: true }) }
      ]);
      put('ch-a', 'bar', { title: 'Tickets per week', description: 'Whole weeks, ' + S.long(wk[0][0].t) + ' to ' + S.long(S.END), size: 'sm', card: true, legend: true, labels: wk.map(function (b) { return S.short(b[0].t); }), titles: wk.map(function (b) { return S.short(b[0].t) + ' to ' + S.short(b[b.length - 1].t); }), series: [{ name: 'Created', data: wk.map(function (b) { return sumOf(b, 'created'); }) }, { name: 'Resolved', data: wk.map(function (b) { return sumOf(b, 'resolved'); }) }] });
      var byQ = S.QUEUES.map(function (q) { return { label: q, value: c.reduce(function (t, r) { return t + r.queue[q]; }, 0) }; });
      put('ch-b', 'hbar', { title: 'Created by queue', description: 'Share of all tickets in the period', size: 'sm', card: true, items: byQ });
      $('#rt-title').textContent = 'By queue'; $('#rt-desc').textContent = 'Each queue this period against the one before it';
      table([{ key: 'q', label: 'Queue', w: 'minmax(160px,2fr)' }, { key: 'c', label: 'Created', num: true, w: '110px' }, { key: 'r', label: 'Resolved', num: true, w: '110px' }, { key: 'rate', label: 'Resolution rate', w: 'minmax(180px,1.4fr)' }, { key: 'd', label: 'Change in created', num: true, w: '150px' }],
        S.QUEUES.map(function (q, i) {
          var cr = byQ[i].value, pr = p.reduce(function (t, r) { return t + r.queue[q]; }, 0), re = Math.round(cr * sumOf(c, 'resolved') / sumOf(c, 'created')), rate = Math.min(100, Math.round(re / cr * 100));
          return row([U.cell('strong', 'q', q), U.cell('num', 'c', S.nf(cr)), U.cell('num', 'r', S.nf(re)), U.cell('flex gd-table__prog', 'rate', U.meter(rate)), U.cell('flex num', 'd', U.delta(cr, pr, { good: -1, sm: true }))]);
        }), 'Tickets by queue');
      return [['Date', 'Created', 'Resolved'], c.map(function (r) { return [S.iso(r.t).slice(0, 10), r.created, r.resolved]; })];
    },
    response: function (P) {
      var c = P.cur, p = P.prev, within = function (a) { return a.filter(function (r) { return r.frt <= TARGET; }).length / a.length * 100; };
      U.statCards($('#r-cards'), [
        { name: 'Median first response', value: Math.round(meanOf(c, 'frt')) + ' min', meta: U.delta(meanOf(c, 'frt'), meanOf(p, 'frt'), { good: -1 }) },
        { name: 'Days within target', value: Math.round(within(c)) + '%', meta: U.delta(within(c), within(p), { good: 1, pts: true }) },
        { name: 'Days over target', value: String(c.filter(function (r) { return r.frt > TARGET; }).length), meta: '<span class="gd-stat-card__compare">Target is ' + TARGET + ' minutes</span>' },
        { name: 'Slowest day', value: Math.round(Math.max.apply(null, c.map(function (r) { return r.frt; }))) + ' min', meta: '<span class="gd-stat-card__compare">Highest daily median</span>' }
      ]);
      put('ch-a', 'line', { title: 'Median first response per day', description: 'In minutes, against the ' + TARGET + ' minute target', size: 'sm', card: true, legend: false, labels: c.map(function (r) { return S.short(r.t); }), titles: c.map(function (r) { return S.DOW[new Date(r.t).getUTCDay()] + ', ' + S.short(r.t); }), series: [{ name: 'Median first response', data: c.map(function (r) { return Math.round(r.frt); }) }], refs: [{ value: TARGET, label: 'Target ' + TARGET + ' min', tone: 'warn' }] });
      var m = meanOf(c, 'frt');
      put('ch-b', 'hbar', { title: 'By queue', description: 'Median first response, in minutes', size: 'sm', card: true, share: false, unit: ' min', items: S.QUEUES.map(function (q, i) { return { label: q, value: Math.round(m * QW[i]) }; }) });
      $('#rt-title').textContent = 'By priority'; $('#rt-desc').textContent = 'Urgent tickets are held to a faster target than the rest';
      var T = { Urgent: [15, 0.35], High: [30, 0.7], Normal: [60, 1.0], Low: [240, 2.4] };
      table([{ key: 'p', label: 'Priority', w: 'minmax(140px,1.4fr)' }, { key: 't', label: 'Target', num: true, w: '110px' }, { key: 'm', label: 'Median', num: true, w: '110px' }, { key: 'w', label: 'Within target', w: 'minmax(180px,1.4fr)' }, { key: 'b', label: 'Breaches', num: true, w: '110px' }],
        S.PRIORITIES.map(function (pr, i) {
          var med = Math.round(m * T[pr][1]), pct = Math.max(40, Math.min(99, Math.round(100 - (med / T[pr][0] - 0.8) * 60 + (S.hash(i + 9) - 0.5) * 6))), n = Math.round(sumOf(c, 'created') * [0.12, 0.24, 0.48, 0.16][i]);
          return row([U.cell('flex', 'p', U.priorityBadge(pr)), U.cell('num', 't', T[pr][0] + ' min'), U.cell('num', 'm', med + ' min'), U.cell('flex gd-table__prog', 'w', U.meter(pct)), U.cell('num', 'b', S.nf(Math.round(n * (100 - pct) / 100)))]);
        }), 'First response by priority');
      return [['Date', 'Median first response (min)'], c.map(function (r) { return [S.iso(r.t).slice(0, 10), Math.round(r.frt)]; })];
    },
    satisfaction: function (P) {
      var c = P.cur, p = P.prev, n = Math.round(sumOf(c, 'resolved') * 0.31), np = Math.round(sumOf(p, 'resolved') * 0.31), cs = meanOf(c, 'csat');
      var five = Math.round(cs - 14), four = Math.round((100 - five) * 0.62), three = Math.round((100 - five - four) * 0.6), low = 100 - five - four - three;
      U.statCards($('#r-cards'), [
        { name: 'Customer satisfaction', value: cs.toFixed(1) + '%', meta: U.delta(cs, meanOf(p, 'csat'), { good: 1, pts: true }) },
        { name: 'Survey responses', value: S.nf(n), meta: U.delta(n, np, { good: 1 }) },
        { name: 'Five-star share', value: five + '%', meta: '<span class="gd-stat-card__compare">Of rated tickets</span>' },
        { name: 'Low ratings', value: low + '%', meta: '<span class="gd-stat-card__compare">One or two stars</span>' }
      ]);
      put('ch-a', 'line', { title: 'Satisfaction per day', description: 'Share of rated tickets scored four or five', size: 'sm', card: true, legend: false, labels: c.map(function (r) { return S.short(r.t); }), titles: c.map(function (r) { return S.DOW[new Date(r.t).getUTCDay()] + ', ' + S.short(r.t); }), series: [{ name: 'Satisfaction', data: c.map(function (r) { return Math.round(r.csat * 10) / 10; }) }], zero: false, unit: '%' });
      put('ch-b', 'breakdown', { title: 'Ratings', description: 'Every rated ticket in the period', size: 'sm', card: true, segments: [{ label: 'Five stars', value: five, tone: 'good' }, { label: 'Four stars', value: four, tone: 'accent' }, { label: 'Three stars', value: three, tone: 'warn' }, { label: 'One or two', value: low, tone: 'danger' }] });
      $('#rt-title').textContent = 'By agent'; $('#rt-desc').textContent = 'Average rating out of five, from every rated ticket in the sample';
      var st = S.agentStats().filter(function (a) { return a.csat; }).sort(function (a, b) { return b.csat - a.csat; });
      table([{ key: 'a', label: 'Agent', w: 'minmax(200px,2fr)' }, { key: 'r', label: 'Resolved', num: true, w: '110px' }, { key: 's', label: 'Average rating', num: true, w: '150px' }, { key: 'v', label: 'Rating', w: 'minmax(180px,1.4fr)' }],
        st.map(function (a) { return row([U.cell('flex', 'a', U.who(a.agent.name, a.agent.role)), U.cell('num', 'r', a.resolved), U.cell('num', 's', a.csat.toFixed(1)), U.cell('flex gd-table__prog', 'v', U.meter(Math.round(a.csat / 5 * 100), ''))]); }), 'Satisfaction by agent');
      return [['Date', 'Satisfaction (%)'], c.map(function (r) { return [S.iso(r.t).slice(0, 10), r.csat.toFixed(1)]; })];
    }
  };
  var META = {
    weekly: ['Weekly summary', 'What came in, what went out, and how each queue moved. Every figure on this page is invented sample data.'],
    response: ['Response times', 'How quickly the desk makes a first reply, against the ' + TARGET + ' minute target. Every figure on this page is invented sample data.'],
    satisfaction: ['Satisfaction', 'How customers rate the help they got. Every figure on this page is invented sample data.']
  };
  var last;
  function render() { $('#r-title').textContent = META[key][0]; $('#r-desc').textContent = META[key][1]; document.title = META[key][0] + ' - Reports - Gushwork'; last = REPORTS[key](periods()); }
  document.addEventListener('gd:change', function (e) { if (e.target.id === 'period') { days = +e.detail.value; render(); } });
  $('#export-btn').addEventListener('click', function () { U.csv(key + '-report.csv', [last[0]].concat(last[1])); U.toast('Export ready, ' + META[key][0].toLowerCase(), 'success'); });
  render();
})();
