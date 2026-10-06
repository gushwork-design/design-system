/* Team: the people on the desk. Agents shows results per person; Workload shows who is carrying what against a capacity of
   12 open tickets each. Both come from the tickets in data.js, so the counts match the Tickets page. */
(function () {
  'use strict';
  var S = SUP, U = SUPUI;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var view = U.param('view') === 'workload' ? 'workload' : 'agents';
  var PRES = { Online: 'good', Away: 'warn', Offline: 'neutral' };
  var st = S.agentStats(), table = $('#team'), last = [];
  var rating = function (v) { return v == null ? '<span class="gd-table__cell--muted">—</span>' : v.toFixed(1); };
  var sum = function (k) { return st.reduce(function (t, a) { return t + a[k]; }, 0); };
  var setTable = function (cols, label) {
    table.style.cssText = '--gd-cols:' + cols.map(function (c) { return c[2]; }).join(' ') + '; --gd-table-min:820px'; table.setAttribute('aria-label', label);
    return '<div class="gd-table__row gd-table__row--head" role="row">' + cols.map(function (c) { return U.th(c[0], c[1], { num: c[3] === 'num', sort: c[3] === 'nosort' ? false : undefined, sorted: c[3] === 'ascending' ? 'ascending' : undefined }); }).join('') + '</div>';
  };

  function agents() {
    $('#t-title').textContent = 'Agents'; $('#t-desc').textContent = 'Who is on the desk and how each person is doing. Every name and figure is invented sample data.';
    $('#tt-title').textContent = 'All agents'; $('#tt-desc').textContent = st.length + ' people. Satisfaction is out of five.';
    var med = st.map(function (a) { return a.frt; }).filter(Boolean).sort(function (a, b) { return a - b; });
    U.statCards($('#t-cards'), [
      { name: 'Online now', value: st.filter(function (a) { return a.presence === 'Online'; }).length + ' of ' + st.length, meta: '<span class="gd-stat-card__compare">Agents who can take a ticket</span>' },
      { name: 'Open tickets', value: sum('open'), meta: '<span class="gd-stat-card__compare">Assigned to someone</span>' },
      { name: 'Median first reply', value: Math.round(med[Math.floor(med.length / 2)]) + ' min', meta: '<span class="gd-stat-card__compare">Across the desk</span>' },
      { name: 'Satisfaction', value: (st.filter(function (a) { return a.csat; }).reduce(function (t, a) { return t + a.csat; }, 0) / st.filter(function (a) { return a.csat; }).length).toFixed(1), meta: '<span class="gd-stat-card__compare">Out of five</span>' }
    ]);
    var head = setTable([['name', 'Agent', 'minmax(200px,2fr)', 'ascending'], ['status', 'Status', '110px', 'nosort'], ['open', 'Open', '90px', 'num'], ['resolved', 'Resolved', '110px', 'num'], ['frt', 'Median reply', '130px', 'num'], ['csat', 'Rating', '100px', 'num'], ['load', 'Workload', 'minmax(170px,1.3fr)', 'num']], 'Agents');
    table.innerHTML = head + '<div class="gd-table__body" role="rowgroup">' + st.map(function (a) {
      return '<div class="gd-table__row" role="row">' + U.cell('flex', 'name', U.who(a.agent.name, a.agent.role), ' data-gd-value="' + U.esc(a.agent.name) + '"') + U.cell('flex', 'status', U.badge(a.presence, PRES[a.presence])) + U.cell('num', 'open', a.open) + U.cell('num', 'resolved', a.resolved) +
        U.cell('num', 'frt', a.frt ? S.minutes(a.frt) : '—', ' data-gd-value="' + (a.frt || '') + '"') + U.cell('num', 'csat', rating(a.csat), ' data-gd-value="' + (a.csat || '') + '"') + U.cell('flex gd-table__prog', 'load', U.meter(a.load), ' data-gd-value="' + a.load + '"') + '</div>';
    }).join('') + '</div>';
    last = [['Agent', 'Role', 'Status', 'Open', 'Resolved', 'Median reply (min)', 'Rating', 'Workload (%)']].concat(st.map(function (a) { return [a.agent.name, a.agent.role, a.presence, a.open, a.resolved, a.frt || '', a.csat ? a.csat.toFixed(1) : '', a.load]; }));
  }
  function workload() {
    $('#t-title').textContent = 'Workload'; $('#t-desc').textContent = 'Open tickets per person against a capacity of ' + S.CAPACITY + ' each. Every figure is invented sample data.';
    $('#tt-title').textContent = 'Capacity'; $('#tt-desc').textContent = 'Anyone above 80% should not be given new tickets';
    var hot = st.filter(function (a) { return a.load > 80; }).length, urgent = st.reduce(function (t, a) { return t + a.byPriority.Urgent + a.byPriority.High; }, 0);
    U.statCards($('#t-cards'), [
      { name: 'Open tickets', value: sum('open'), meta: '<span class="gd-stat-card__compare">Assigned to someone</span>' },
      { name: 'Team capacity used', value: Math.round(sum('open') / (st.length * S.CAPACITY) * 100) + '%', meta: '<span class="gd-stat-card__compare">Of ' + st.length * S.CAPACITY + ' open slots</span>' },
      { name: 'Over 80% loaded', value: hot, meta: '<span class="gd-stat-card__compare">People near capacity</span>' },
      { name: 'Urgent and high', value: urgent, meta: '<span class="gd-stat-card__compare">Open, assigned</span>' }
    ]);
    $('#ch-load').hidden = false; $('#ch-mix').hidden = false;
    GD.charts.mount($('#ch-load'), 'hbar', { title: 'Open tickets by agent', description: 'Right now', size: 'sm', card: true, sort: true, share: false, max: S.CAPACITY, items: st.map(function (a) { return { label: a.agent.name, value: a.open }; }) });
    var mix = { Urgent: 0, High: 0, Normal: 0, Low: 0 }; st.forEach(function (a) { Object.keys(mix).forEach(function (k) { mix[k] += a.byPriority[k]; }); });
    var tone = { Urgent: 'danger', High: 'warn', Normal: 'accent', Low: 'neutral' };
    GD.charts.mount($('#ch-mix'), 'breakdown', { title: 'What the team is carrying', description: 'Open tickets by priority', size: 'sm', card: true, segments: S.PRIORITIES.map(function (p) { return { label: p, value: mix[p], tone: tone[p] }; }) });
    var head = setTable([['name', 'Agent', 'minmax(200px,2fr)', 'ascending'], ['open', 'Open', '90px', 'num'], ['cap', 'Capacity', '110px', 'num'], ['hi', 'Urgent and high', '150px', 'num'], ['load', 'Load', 'minmax(170px,1.3fr)', 'num']], 'Workload');
    table.innerHTML = head + '<div class="gd-table__body" role="rowgroup">' + st.map(function (a) {
      return '<div class="gd-table__row" role="row">' + U.cell('flex', 'name', U.who(a.agent.name, a.presence), ' data-gd-value="' + U.esc(a.agent.name) + '"') + U.cell('num', 'open', a.open) + U.cell('num', 'cap', a.capacity) + U.cell('num', 'hi', a.byPriority.Urgent + a.byPriority.High) + U.cell('flex gd-table__prog', 'load', U.meter(a.load), ' data-gd-value="' + a.load + '"') + '</div>';
    }).join('') + '</div>';
    last = [['Agent', 'Open', 'Capacity', 'Urgent and high', 'Load (%)']].concat(st.map(function (a) { return [a.agent.name, a.open, a.capacity, a.byPriority.Urgent + a.byPriority.High, a.load]; }));
  }

  function show(v) {
    view = v; $('#ch-load').hidden = true; $('#ch-mix').hidden = true; $('#ch-load').innerHTML = ''; $('#ch-mix').innerHTML = '';   // only Workload has charts
    (view === 'workload' ? workload : agents)();
    document.title = (view === 'workload' ? 'Workload' : 'Agents') + ' - Team - Gushwork';
  }
  show(U.bindTabs('view', view, 'agents', show));
  $('#export-btn').addEventListener('click', function () { U.csv('team-' + view + '.csv', last); U.toast('Export ready, ' + (last.length - 1) + ' agents', 'success'); });
})();
