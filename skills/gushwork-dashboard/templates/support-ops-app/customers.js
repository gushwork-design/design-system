/* Customers: companies or people, chosen by the rail (customers.html?view=people). Both are read from the tickets in data.js, so
   a company's open count is the number you would get by filtering Tickets. Nothing here is stored. */
(function () {
  'use strict';
  var S = SUP, U = SUPUI;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var view = U.param('view') === 'people' ? 'people' : 'companies';
  var table = $('#cust'), tview = table.closest('.gd-tview'), HEALTH = { Healthy: 'good', Stable: 'neutral', 'At risk': 'bad' };
  var avg = function (a) { a = a.filter(function (v) { return v != null; }); return a.length ? a.reduce(function (t, v) { return t + v; }, 0) / a.length : null; };
  var rating = function (v) { return v == null ? '<span class="gd-table__cell--muted">—</span>' : v.toFixed(1); };
  var last = [];

  function companies() {
    var cs = S.companies().sort(function (a, b) { return b.open - a.open || b.tickets - a.tickets; });
    $('#c-title').textContent = 'Companies'; $('#c-desc').textContent = 'The accounts the desk works for, with how much help each is asking for. Every name and figure is invented sample data.';
    $('#c-list-title').textContent = 'All companies'; $('#c-list-desc').textContent = cs.length + ' companies, most open tickets first';
    U.statCards($('#c-cards'), [
      { name: 'Companies', value: cs.length, meta: '<span class="gd-stat-card__compare">With at least one ticket</span>' },
      { name: 'Open tickets', value: cs.reduce(function (t, c) { return t + c.open; }, 0), meta: '<span class="gd-stat-card__compare">Open and pending</span>' },
      { name: 'At risk', value: cs.filter(function (c) { return c.health === 'At risk'; }).length, meta: '<span class="gd-stat-card__compare">Four or more open, or a low rating</span>' },
      { name: 'Average satisfaction', value: (avg(cs.map(function (c) { return c.satisfaction; })) || 0).toFixed(1), meta: '<span class="gd-stat-card__compare">Out of five</span>' }
    ]);
    var cols = [['name', 'Company', 'minmax(200px,2fr)', 'ascending'], ['plan', 'Plan', '110px'], ['seats', 'Seats', '90px', 'num'], ['health', 'Health', '110px', 'nosort'], ['open', 'Open', '90px', 'num'], ['tickets', 'Tickets', '100px', 'num'], ['owner', 'Owner', 'minmax(160px,1.2fr)'], ['last', 'Last contact', '130px', 'num']];
    $('#cust').style.cssText = '--gd-cols:' + cols.map(function (c) { return c[2]; }).join(' ') + '; --gd-table-min:900px';
    $('#cust').setAttribute('aria-label', 'Companies');
    $('#cust').innerHTML = '<div class="gd-table__row gd-table__row--head" role="row">' + cols.map(function (c) { return U.th(c[0], c[1], { num: c[3] === 'num', sort: c[3] === 'nosort' ? false : undefined, sorted: c[3] === 'ascending' ? 'ascending' : undefined }); }).join('') + '</div><div class="gd-table__body" role="rowgroup">' +
      cs.map(function (c) {
        var o = S.agentById(c.owner);
        return '<div class="gd-table__row" role="row" data-gd-id="' + U.esc(c.name) + '">' + U.cell('strong', 'name', U.esc(c.name), ' title="' + U.esc(c.name) + '"') + U.cell('', 'plan', c.plan) + U.cell('num', 'seats', c.seats) +
          U.cell('flex', 'health', U.badge(c.health, HEALTH[c.health]), ' data-gd-value="' + c.health + '"') + U.cell('num', 'open', c.open) + U.cell('num', 'tickets', c.tickets) + U.cell('flex', 'owner', U.who(o.name), ' data-gd-value="' + U.esc(o.name) + '"') +
          U.cell('num', 'last', c.last ? U.date(c.last) : '—', ' data-gd-value="' + c.last + '"') + '</div>';
      }).join('') + '</div>';
    last = [['Company', 'Plan', 'Seats', 'Health', 'Open tickets', 'Tickets', 'Owner', 'Last contact']].concat(cs.map(function (c) { return [c.name, c.plan, c.seats, c.health, c.open, c.tickets, S.agentById(c.owner).name, c.last ? S.iso(c.last) : '']; }));
    $('[data-gd-search]').setAttribute('placeholder', 'Search companies');
  }
  function people() {
    var ps = S.people().sort(function (a, b) { return b.last - a.last; });
    $('#c-title').textContent = 'People'; $('#c-desc').textContent = 'The individuals who write in. Every name and figure is invented sample data.';
    $('#c-list-title').textContent = 'All people'; $('#c-list-desc').textContent = ps.length + ' people, most recent first';
    U.statCards($('#c-cards'), [
      { name: 'People', value: ps.length, meta: '<span class="gd-stat-card__compare">Who have written in</span>' },
      { name: 'Companies', value: S.companies().length, meta: '<span class="gd-stat-card__compare">Across all people</span>' },
      { name: 'With an open ticket', value: ps.filter(function (p) { return p.open; }).length, meta: '<span class="gd-stat-card__compare">Open or pending</span>' },
      { name: 'Average satisfaction', value: (avg(ps.map(function (p) { return p.satisfaction; })) || 0).toFixed(1), meta: '<span class="gd-stat-card__compare">Out of five</span>' }
    ]);
    var cols = [['name', 'Person', 'minmax(200px,2fr)', 'ascending'], ['email', 'Email', 'minmax(220px,2fr)'], ['company', 'Company', 'minmax(150px,1.2fr)'], ['tickets', 'Tickets', '100px', 'num'], ['open', 'Open', '90px', 'num'], ['sat', 'Rating', '100px', 'num'], ['last', 'Last ticket', '130px', 'num']];
    $('#cust').style.cssText = '--gd-cols:' + cols.map(function (c) { return c[2]; }).join(' ') + '; --gd-table-min:900px';
    $('#cust').setAttribute('aria-label', 'People');
    $('#cust').innerHTML = '<div class="gd-table__row gd-table__row--head" role="row">' + cols.map(function (c) { return U.th(c[0], c[1], { num: c[3] === 'num', sorted: c[3] === 'ascending' ? 'ascending' : undefined }); }).join('') + '</div><div class="gd-table__body" role="rowgroup">' +
      ps.map(function (p) {
        return '<div class="gd-table__row" role="row" data-gd-id="' + U.esc(p.email) + '">' + U.cell('flex', 'name', U.who(p.name), ' data-gd-value="' + U.esc(p.name) + '"') + U.cell('', 'email', U.esc(p.email), ' title="' + U.esc(p.email) + '"') + U.cell('', 'company', U.esc(p.company)) +
          U.cell('num', 'tickets', p.tickets) + U.cell('num', 'open', p.open) + U.cell('num', 'sat', rating(p.satisfaction), ' data-gd-value="' + (p.satisfaction || '') + '"') + U.cell('num', 'last', p.last ? U.date(p.last) : '—', ' data-gd-value="' + p.last + '"') + '</div>';
      }).join('') + '</div>';
    last = [['Person', 'Email', 'Company', 'Tickets', 'Open', 'Rating', 'Last ticket']].concat(ps.map(function (p) { return [p.name, p.email, p.company, p.tickets, p.open, p.satisfaction ? p.satisfaction.toFixed(1) : '', p.last ? S.iso(p.last) : '']; }));
    $('[data-gd-search]').setAttribute('placeholder', 'Search people');
  }

  function show(v) {
    view = v; (view === 'people' ? people : companies)();
    document.title = (view === 'people' ? 'People' : 'Companies') + ' - Customers - Gushwork';
    var s = $('[data-gd-search]'); s.value = ''; $('[data-gd-search-clear]').hidden = true;
    var pg = $('[data-gd-pager]'); pg.dataset.gdPage = 1; pg.dataset.gdTotal = table.querySelectorAll('[data-gd-id]').length;
    GD.tables.refresh(table);
  }
  show(U.bindTabs('view', view, 'companies', show));
  document.addEventListener('gd:export', function () { U.csv('customers-' + view + '.csv', last); U.toast('Export ready, ' + (last.length - 1) + (view === 'people' ? ' people' : ' companies'), 'success'); });
  document.addEventListener('gd:clear-filters', function () { var i = $('[data-gd-search]'); i.value = ''; i.dispatchEvent(new Event('input', { bubbles: true })); $('[data-gd-search-clear]').hidden = true; i.focus(); });
})();
