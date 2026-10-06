/* Settings: three sections behind a sub-nav, switched by the address hash (settings.html#members). One save model for the
   page: General and Notifications save together through the unsaved-changes bar. Members change at once, each behind its own
   confirm. Nothing is stored; a reload brings the sample back. Replace the handlers with calls to your own API. */
(function () {
  'use strict';
  var S = SUP, U = SUPUI;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---- sections ------------------------------------------------------------------------------------ */
  var SECS = ['general', 'members', 'notifications'], TITLES = { general: 'General', members: 'Members', notifications: 'Notifications' };
  function show() {
    var s = (location.hash || '').slice(1); if (SECS.indexOf(s) < 0) s = 'general';
    SECS.forEach(function (k) { $('#sec-' + k).hidden = k !== s; });
    $$('#subnav [data-sec]').forEach(function (a) { if (a.dataset.sec === s) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    document.title = TITLES[s] + ' - Settings - Gushwork';
  }
  window.addEventListener('hashchange', show); show();

  /* ---- saving ---------------------------------------------------------------------------------------- */
  document.addEventListener('gd:save', function () { U.toast('Settings saved', 'success'); });   // not prevented: the current values become the new baseline

  /* ---- members --------------------------------------------------------------------------------------- */
  var MEMBERS = S.AGENTS.map(function (a, i) { return { name: a.name, email: a.email, role: a.role === 'Agent' ? 'Agent' : 'Admin', status: 'Active', active: i === 0 ? 'Now' : S.ago(S.END + 17 * S.HOUR - (i * 3 + 1) * S.HOUR * 5) }; });
  MEMBERS.push({ name: 'Ines Duarte', email: 'ines.duarte@example.com', role: 'Viewer', status: 'Invited', active: '—' });
  var DOTS = '<svg width="16" height="16" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true" focusable="false"><path d="M144,128a16,16,0,1,1-16-16A16,16,0,0,1,144,128ZM60,112a16,16,0,1,0,16,16A16,16,0,0,0,60,112Zm136,0a16,16,0,1,0,16,16A16,16,0,0,0,196,112Z"/></svg>';
  var body = $('#members .gd-table__body'), byEmail = function (e) { for (var i = 0; i < MEMBERS.length; i++) if (MEMBERS[i].email === e) return MEMBERS[i]; };
  function rowHTML(m) {
    return '<div class="gd-table__row" role="row" data-gd-id="' + U.esc(m.email) + '" data-status="' + m.status + '">' +
      '<div class="gd-table__cell gd-table__cell--flex" role="cell" data-gd-col="name" data-gd-value="' + U.esc(m.name) + '"><span class="gd-table__avatar" aria-hidden="true">' + U.initials(m.name) + '</span><span class="gd-table__who"><b class="gd-table__trunc">' + U.esc(m.name) + '</b></span></div>' +
      '<div class="gd-table__cell" role="cell" data-gd-col="email" title="' + U.esc(m.email) + '">' + U.esc(m.email) + '</div>' +
      '<div class="gd-table__cell gd-table__cell--flex" role="cell" data-gd-col="role"><span class="gd-badge gd-badge--neutral">' + m.role + '</span></div>' +
      '<div class="gd-table__cell gd-table__cell--flex" role="cell" data-gd-col="status"><span class="gd-badge gd-badge--' + (m.status === 'Active' ? 'good' : 'warn') + '">' + m.status + '</span></div>' +
      '<div class="gd-table__cell gd-table__cell--num" role="cell" data-gd-col="active">' + m.active + '</div>' +
      '<div class="gd-table__cell gd-table__cell--actions" role="cell"><button class="gd-table__more" type="button" data-gd-menu="row-menu" aria-haspopup="menu" aria-expanded="false" aria-label="Actions for ' + U.esc(m.name) + '">' + DOTS + '</button></div></div>';
  }
  function renderMembers() {
    body.innerHTML = MEMBERS.map(rowHTML).join('');
    var inv = MEMBERS.filter(function (m) { return m.status === 'Invited'; }).length;
    $('#mem-desc').textContent = MEMBERS.length + ' members' + (inv ? ', ' + inv + ' invited' : '') + '. Names and addresses are invented sample data.';
  }
  renderMembers();

  // "Resend invite" only makes sense for someone still invited: the menu is shared, so it is set as the menu opens
  document.addEventListener('click', function (e) {
    var t = e.target.closest('#members .gd-table__more'); if (!t) return;
    var m = byEmail(t.closest('[role="row"]').dataset.gdId), r = $('[data-gd-action="resend"]');
    if (r) r.hidden = !m || m.status !== 'Invited';
  }, true);
  document.addEventListener('gd:rowaction', function (e) {
    var d = e.detail, m = byEmail(d.row.dataset.gdId); if (!m) return;
    if (d.action === 'email') (navigator.clipboard ? navigator.clipboard.writeText(m.email) : Promise.reject()).then(function () { U.toast('Email copied', 'success'); }, function () { U.toast('Could not copy the email', 'error'); });
    else if (d.action === 'resend') U.toast('Invite sent again', 'success');
    else if (d.action === 'remove') GD.confirm({
      title: 'Remove ' + m.name + '?', message: 'They lose access to the workspace at once, and tickets assigned to them become unassigned. This sample stores nothing, so reloading the page brings them back.',
      confirmLabel: 'Remove member', danger: true
    }).then(function (ok) {
      if (!ok) return;
      MEMBERS.splice(MEMBERS.indexOf(m), 1); renderMembers(); U.toast(m.name + ' removed', 'success');
      var f = $('#members .gd-table__more') || $('[data-gd-modal-open="#invite"]'); if (f) f.focus();
    });
  });

  /* ---- invite ------------------------------------------------------------------------------------------ */
  var form = $('#inv-form'), dlg = $('#invite'), email = $('#inv-email');
  function fail(msg) { var f = $('#inv-email-f'), er = $('#inv-email-err'); f.dataset.state = 'error'; er.textContent = msg; er.hidden = false; email.setAttribute('aria-invalid', 'true'); email.setAttribute('aria-describedby', 'inv-email-err'); email.focus(); }
  function clear() { var f = $('#inv-email-f'); delete f.dataset.state; $('#inv-email-err').hidden = true; email.removeAttribute('aria-invalid'); }
  email.addEventListener('input', clear); dlg.addEventListener('close', clear);
  form.addEventListener('submit', function (e) {
    e.preventDefault(); var v = email.value.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) return fail('Enter a full email address, like name@company.com.');
    if (byEmail(v)) return fail('That person is already a member.');
    var name = v.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
    MEMBERS.push({ name: name, email: v, role: $('#inv-role input[type="hidden"]').value, status: 'Invited', active: '—' });
    renderMembers(); dlg.close(); form.reset(); U.toast('Invite sent to ' + v, 'success');
  });
})();
