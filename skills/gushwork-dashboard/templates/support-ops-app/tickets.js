/* Tickets: a list with views as underline tabs, search, filters, columns, selection, bulk actions, a quick-view drawer and a new-ticket
   dialog. Rows are drawn from data.js. Nothing is stored: a reload brings every ticket back, and the page says so wherever
   it matters. Replace render and the actions with calls to your own API. */
(function () {
  'use strict';
  var S = SUP, U = SUPUI, ME = S.agentById('a1');
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var table = $('#tickets'), body = $('.gd-table__body', table), tview = table.closest('.gd-tview');
  var DOTS = '<svg width="16" height="16" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true" focusable="false"><path d="M144,128a16,16,0,1,1-16-16A16,16,0,0,1,144,128ZM60,112a16,16,0,1,0,16,16A16,16,0,0,0,60,112Zm136,0a16,16,0,1,0,16,16A16,16,0,0,0,196,112Z"/></svg>';
  var cell = function (cls, col, html, extra) { return '<div class="gd-table__cell' + (cls ? ' gd-table__cell--' + cls : '') + '" role="cell" data-gd-col="' + col + '"' + (extra || '') + '>' + html + '</div>'; };
  var dash = '<span class="gd-table__cell--muted">—</span>';

  /* ---- rows ---------------------------------------------------------------------------------------- */
  function rowHTML(t) {
    var a = S.agentById(t.assignee), who = a ? a.name : 'Unassigned';
    return '<div class="gd-table__row" role="row" data-gd-id="' + t.id + '" data-name="' + U.esc(t.subject) + '" data-priority="' + t.priority + '" data-status="' + t.status + '" data-queue="' + U.esc(t.queue) + '" data-assignee="' + U.esc(who) + '">' +
      '<div class="gd-table__cell gd-table__cell--check" role="cell"><label class="gd-check"><input type="checkbox" data-gd-select-row aria-label="Select ' + U.esc(t.subject) + '"><span class="gd-check__box"></span></label></div>' +
      cell('flex', 'subject', '<span class="gd-table__who"><b class="gd-table__trunc"><a class="gd-table__link" href="' + U.ticketHref(t.id) + '">' + U.esc(t.subject) + '</a></b><small>' + t.id + '</small></span>', ' title="' + U.esc(t.subject) + '" data-gd-value="' + U.esc(t.subject) + '"') +
      cell('flex', 'requester', '<span class="gd-table__avatar" aria-hidden="true">' + U.initials(t.requester) + '</span><span class="gd-table__who"><b class="gd-table__trunc">' + U.esc(t.requester) + '</b><small>' + U.esc(t.company) + '</small></span>') +
      cell('flex', 'priority', U.priorityBadge(t.priority)) +
      cell('flex', 'status', U.statusBadge(t.status)) +
      cell('', 'queue', U.esc(t.queue)) +
      cell('flex', 'assignee', a ? '<span class="gd-table__avatar" aria-hidden="true">' + U.initials(a.name) + '</span><span class="gd-table__who"><b class="gd-table__trunc">' + U.esc(a.name) + '</b></span>' : dash, ' data-gd-value="' + U.esc(who) + '"') +
      cell('num', 'created', S.short(t.created) + ', ' + S.clock(t.created), ' data-gd-value="' + t.created + '"') +
      cell('num', 'frt', t.frt ? S.minutes(t.frt) : dash, ' data-gd-value="' + (t.frt || '') + '"') +
      '<div class="gd-table__cell gd-table__cell--actions" role="cell"><button class="gd-table__more" type="button" data-gd-menu="row-menu" aria-haspopup="menu" aria-expanded="false" aria-label="Actions for ' + U.esc(t.subject) + '">' + DOTS + '</button></div>' +
      '</div>';
  }
  function renderRows() {
    body.innerHTML = S.TICKETS.slice().sort(function (a, b) { return b.created - a.created; }).map(rowHTML).join('');
    $('[data-gd-pager]').dataset.gdTotal = S.TICKETS.length;
    resort(); applyAll();
  }
  function refreshRow(t) {
    var old = $('[data-gd-id="' + t.id + '"]', body); if (!old) return;
    var tmp = document.createElement('div'); tmp.innerHTML = rowHTML(t); old.replaceWith(tmp.firstChild);
    applyAll();
  }
  /* sorted tables keep their order when rows are added or edited */
  function resort() {
    var th = $('[role="columnheader"][aria-sort="ascending"], [role="columnheader"][aria-sort="descending"]', table); if (!th) return;
    var key = th.dataset.gdCol, num = th.dataset.gdType === 'number', k = th.getAttribute('aria-sort') === 'ascending' ? 1 : -1;
    var val = function (r) { var c = $('[data-gd-col="' + key + '"]', r); return c ? (c.hasAttribute('data-gd-value') ? c.getAttribute('data-gd-value') : c.textContent.trim()) : ''; };
    var rows = $$('[data-gd-id]', body).map(function (r, n) { return { r: r, v: val(r), n: n }; });
    rows.sort(function (a, b) { return k * (num ? (parseFloat(a.v) || 0) - (parseFloat(b.v) || 0) : a.v.localeCompare(b.v)) || a.n - b.n; });
    rows.forEach(function (x) { body.appendChild(x.r); });
  }
  var ticketOf = function (row) { return S.ticketById(row.dataset.gdId); };

  /* ---- view + search + filter chips, applied together --------------------------------------------- */
  var view = 'all';
  var VIEWS = { all: function () { return true; }, Open: function (r) { return r.dataset.status === 'Open'; }, Pending: function (r) { return r.dataset.status === 'Pending'; }, Resolved: function (r) { return r.dataset.status === 'Resolved'; }, Urgent: function (r) { return r.dataset.priority === 'Urgent'; } };
  function chipFilters() { return $$('#chips .gd-chip').map(function (c) { return { field: c.dataset.field, op: c.dataset.op, value: c.dataset.value }; }); }
  function matches(row, f) { var v = row.dataset[f.field]; return f.op === 'is not' ? v !== f.value : v === f.value; }
  function applyAll() {
    var q = ($('[data-gd-search]').value || '').trim().toLowerCase(), fs = chipFilters(), inView = VIEWS[view] || VIEWS.all;
    $$('[data-gd-id]', body).forEach(function (r) {
      var ok = inView(r) && fs.every(function (f) { return matches(r, f); }) && (!q || (r.textContent || '').toLowerCase().indexOf(q) > -1);
      if (ok) delete r.dataset.gdOut; else r.dataset.gdOut = '';
    });
    GD.tables.refresh(table);
    var all = $$('[data-gd-id]', body).length;
    if (!all) GD.tables.setState(tview, 'empty'); else if (tview.dataset.state === 'empty') GD.tables.setState(tview, null);
    var rows = $$('[data-gd-id]', body), cnt = { all: rows.length, Open: 0, Pending: 0, Resolved: 0, Urgent: 0 };
    rows.forEach(function (r) { cnt[r.dataset.status]++; if (r.dataset.priority === 'Urgent') cnt.Urgent++; });
    $$('#viewtabs [data-view]').forEach(function (b) { var n = $('[data-n]', b); if (n && cnt[b.dataset.view] != null) n.textContent = cnt[b.dataset.view]; });
  }
  document.addEventListener('gd:search', function () { setTimeout(applyAll, 0); });
  document.addEventListener('gd:filters', function () { setTimeout(applyAll, 0); });
  document.addEventListener('gd:clear-filters', function () {
    $$('#chips [data-gd-chip-remove]').forEach(function (b) { b.click(); });
    var i = $('[data-gd-search]'); i.value = ''; $('[data-gd-search-clear]').hidden = true;
    view = 'all'; $('#viewtabs [data-view="all"]').click();
    applyAll();
  });
  /* ---- export -------------------------------------------------------------------------------------- */
  function csv(rows) {
    var head = ['ID', 'Subject', 'Requester', 'Company', 'Priority', 'Status', 'Queue', 'Assignee', 'Created', 'First response (min)'];
    var lines = [head].concat(rows.map(function (r) { var t = ticketOf(r), a = S.agentById(t.assignee); return [t.id, t.subject, t.requester, t.company, t.priority, t.status, t.queue, a ? a.name : '', S.iso(t.created), t.frt || '']; }));
    return lines.map(function (l) { return l.map(function (v) { return '"' + String(v).replace(/"/g, '""') + '"'; }).join(','); }).join('\n');
  }
  function download(rows) {
    var url = URL.createObjectURL(new Blob([csv(rows)], { type: 'text/csv' })), a = document.createElement('a');
    a.href = url; a.download = 'tickets.csv'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    U.toast('Export ready, ' + rows.length + (rows.length === 1 ? ' ticket' : ' tickets'), 'success');
  }
  var visibleRows = function () { return $$('[data-gd-id]', body).filter(function (r) { return !('gdOut' in r.dataset); }); };
  document.addEventListener('gd:export', function () { download(visibleRows()); });

  /* ---- changing tickets ---------------------------------------------------------------------------- */
  var selected = function () { return GD.tables.selected(table); };
  var plural = function (n, one, many) { return n + ' ' + (n === 1 ? one : many); };
  function removeRows(rows) {
    var next = null;
    rows.forEach(function (r) { if (!next) next = r.nextElementSibling || r.previousElementSibling; S.TICKETS.splice(S.TICKETS.indexOf(ticketOf(r)), 1); r.remove(); });
    GD.tables.clearSelection(table); $('[data-gd-pager]').dataset.gdTotal = S.TICKETS.length; applyAll();
    var f = (next && next.isConnected && $('.gd-table__more', next)) || $('[data-gd-id] .gd-table__more', body) || $('[data-gd-search]'); if (f) f.focus();
  }
  function confirmRemove(rows, label) {
    var one = rows.length === 1, t = one && ticketOf(rows[0]);
    return GD.confirm({
      title: one ? 'Delete "' + t.subject + '"?' : 'Delete ' + plural(rows.length, 'ticket', 'tickets') + '?',
      message: 'The conversation and its notes are removed from this list. This sample stores nothing, so reloading the page brings them back.',
      items: one ? null : rows.map(function (r) { return r.dataset.name; }), confirmLabel: one ? 'Delete ticket' : 'Delete ' + plural(rows.length, 'ticket', 'tickets'), danger: true
    }).then(function (ok) { if (ok) { removeRows(rows); U.toast(one ? 'Ticket deleted' : plural(rows.length, 'ticket', 'tickets') + ' deleted', 'success'); } });
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-bulk]'); if (!b) return;
    var rows = selected(), kind = b.dataset.bulk;
    if (kind === 'export') { download(rows); return; }
    if (kind === 'assign') { rows.forEach(function (r) { var t = ticketOf(r); t.assignee = ME.id; refreshRow(t); }); GD.tables.clearSelection(table); U.toast(plural(rows.length, 'ticket', 'tickets') + ' assigned to you', 'success'); return; }
    if (kind === 'resolve') { rows.forEach(function (r) { var t = ticketOf(r); if (t.status !== 'Resolved') { t.status = 'Resolved'; t.resolvedAt = S.END + 17 * S.HOUR; } refreshRow(t); }); GD.tables.clearSelection(table); U.toast(plural(rows.length, 'ticket', 'tickets') + ' marked resolved', 'success'); return; }
    confirmRemove(rows);
  });

  /* ---- row actions ---------------------------------------------------------------------------------- */
  document.addEventListener('gd:rowaction', function (e) {
    var d = e.detail, row = d.row, t = ticketOf(row);
    if (d.action === 'quick') openQuick(t, $('.gd-table__more', row));
    else if (d.action === 'open') location.href = U.ticketHref(t.id);
    else if (d.action === 'copy') (navigator.clipboard ? navigator.clipboard.writeText(t.id) : Promise.reject()).then(function () { U.toast('Ticket ID copied', 'success'); }, function () { U.toast('Could not copy the ID', 'error'); });
    else if (d.action === 'remove') confirmRemove([row]);
  });

  /* ---- quick view drawer ---------------------------------------------------------------------------- */
  function openQuick(t, opener) {
    $('#qv-sub').textContent = t.id + ' · ' + t.queue;
    $('#qv-title').textContent = t.subject;
    $('#qv-props').innerHTML = U.kv(U.ticketProps(t));
    $('#qv-open').href = U.ticketHref(t.id);
    var dlg = $('#quick');
    // the row menu has already closed by now, so the dialog would remember nothing useful: send focus back to the row's own button
    dlg.addEventListener('close', function () { if (opener && opener.isConnected) opener.focus(); }, { once: true });
    GD.feedback.open(dlg);
  }

  /* ---- new ticket ------------------------------------------------------------------------------------ */
  var form = $('#nt-form'), dlg = $('#new-ticket');
  function fail(id, msg) { var f = $('#' + id + '-f'), er = $('#' + id + '-err'), inp = $('#' + id); f.dataset.state = 'error'; er.textContent = msg; er.hidden = false; inp.setAttribute('aria-invalid', 'true'); inp.setAttribute('aria-describedby', id + '-err'); return inp; }
  function clearFail(id) { var f = $('#' + id + '-f'); if (!f) return; delete f.dataset.state; $('#' + id + '-err').hidden = true; $('#' + id).removeAttribute('aria-invalid'); }
  ['nt-subject', 'nt-email'].forEach(function (id) { $('#' + id).addEventListener('input', function () { clearFail(id); }); });
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var subject = $('#nt-subject').value.trim(), email = $('#nt-email').value.trim(), first = null;
    if (!subject) first = fail('nt-subject', 'Enter what the customer is asking.');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { var f2 = fail('nt-email', 'Enter a full email address, like name@company.com.'); first = first || f2; }
    if (first) { first.focus(); return; }
    var num = Math.max.apply(null, S.TICKETS.map(function (t) { return t.num; })) + 1, name = email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
    var t = { id: 'SUP-' + num, num: num, subject: subject, queue: $('#nt-queue input[type="hidden"]').value, priority: $('#nt-priority input[type="hidden"]').value, status: 'Open', channel: 'Web form', requester: name, company: email.split('@')[1], email: email, assignee: null, created: S.END + 17 * S.HOUR, frt: null, resolvedAt: null, csat: null };
    S.TICKETS.unshift(t); renderRows();
    dlg.close(); form.reset(); ['nt-subject', 'nt-email'].forEach(clearFail);
    U.toast(t.id + ' created', 'success');
  });
  dlg.addEventListener('close', function () { ['nt-subject', 'nt-email'].forEach(clearFail); });
  document.addEventListener('gd:new-ticket', function () { GD.feedback.open(dlg); });

  renderRows();
  // The tabs choose the view and keep the address in step (tickets.html?view=Open), so a reload or a shared link lands on it.
  var want = U.param('view'); if (!VIEWS[want]) want = 'all';
  view = U.bindTabs('view', want, 'all', function (v) { view = v; $('[data-gd-pager]').dataset.gdPage = 1; applyAll(); });
  applyAll();
})();
