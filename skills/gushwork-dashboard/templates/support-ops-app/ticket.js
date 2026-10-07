/* Ticket: one record in full. The id comes from the address (ticket.html?id=SUP-1048); an id that matches nothing is a
   not-found page, because here the route itself failed. Changes live in memory only. Replace with calls to your own API. */
(function () {
  'use strict';
  var S = SUP, U = SUPUI, ME = S.agentById('a1'), TARGET = 60;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var NOW = S.END + 17 * S.HOUR;

  var t = S.ticketById(new URLSearchParams(location.search).get('id') || '');
  if (!t) { $('#not-found').hidden = false; document.title = 'Ticket not found - Gushwork'; return; }
  $('#detail').hidden = false;

  var local = [];                       // events added during this visit, newest last
  var ICON = { chat: 'chat-circle', tag: 'tag', user: 'user', send: 'paper-plane-tilt', note: 'note-pencil', clock: 'clock', check: 'check-circle', undo: 'arrow-counter-clockwise' };

  /* ---- header and properties --------------------------------------------------------------------- */
  function renderHead() {
    var a = S.agentById(t.assignee);
    document.title = t.id + ' ' + t.subject + ' - Gushwork';
    $('#crumb-id').textContent = t.id;
    $('#t-subject').textContent = t.subject;
    $('#t-status').innerHTML = U.statusBadge(t.status, true);
    $('#t-desc').innerHTML = 'Opened by ' + U.esc(t.requester) + ' at ' + U.esc(t.company) + ' by ' + t.channel.toLowerCase() + ', ' + S.stamp(t.created) + (a ? '. Assigned to ' + U.esc(a.name) + '.' : '. Not assigned yet.');
    var rb = $('#resolve-btn'), done = t.status === 'Resolved';
    rb.lastChild.nodeValue = done ? 'Reopen ticket' : 'Resolve ticket';
    rb.classList.toggle('gd-btn--primary', !done); rb.classList.toggle('gd-btn--outline', done);
    $('#props').innerHTML = U.kv(U.ticketProps(t));
  }

  /* ---- first response target --------------------------------------------------------------------- */
  function renderSla() {
    var bar = $('#sla-bar'), fill = t.frt ? t.frt : Math.round((NOW - t.created) / 60000), over = fill > TARGET;
    bar.style.setProperty('--gd-pct', Math.min(100, Math.round(fill / TARGET * 100)));
    bar.setAttribute('aria-valuenow', Math.min(100, Math.round(fill / TARGET * 100)));
    if (over) bar.dataset.state = 'over'; else delete bar.dataset.state;
    $('#sla-desc').textContent = t.frt
      ? 'Replied in ' + S.minutes(t.frt) + ', ' + (over ? S.minutes(t.frt - TARGET) + ' over' : S.minutes(TARGET - t.frt) + ' under') + ' the ' + TARGET + ' minute target.'
      : 'No reply yet. Waiting ' + S.minutes(fill) + ' against the ' + TARGET + ' minute target.';
  }

  /* ---- activity ------------------------------------------------------------------------------------ */
  function renderTimeline() {
    var ev = S.activity(t).concat(local).sort(function (x, y) { return y.t - x.t; }), groups = [], key = function (ms) { return Math.floor(ms / S.DAY); };
    ev.forEach(function (e) { var k = key(e.t), g = groups[groups.length - 1]; if (!g || g.k !== k) { g = { k: k, ev: [] }; groups.push(g); } g.ev.push(e); });
    $('#timeline').innerHTML = groups.map(function (g) {
      var label = g.k === key(NOW) ? 'Today' : g.k === key(NOW) - 1 ? 'Yesterday' : S.long(g.ev[0].t);
      return '<li class="gd-timeline__group"><h4 class="gd-timeline__date">' + label + '</h4><ol class="gd-timeline">' + g.ev.map(function (e) {
        return '<li class="gd-timeline__item' + (e.tone ? ' gd-timeline__item--' + e.tone : '') + '"><span class="gd-timeline__node">' + SUPICON(ICON[e.icon]) + '</span><div class="gd-timeline__body"><span><b>' + U.esc(e.who) + '</b> ' + e.text + '</span>' +
          (e.comment ? '<p class="gd-timeline__comment">' + U.esc(e.comment) + '</p>' : '') + '</div><time class="gd-timeline__time" datetime="' + S.iso(e.t) + '" title="' + S.stamp(e.t) + '">' + S.ago(e.t) + '</time></li>';
      }).join('') + '</ol></li>';
    }).join('');
  }

  /* ---- related tickets ------------------------------------------------------------------------------ */
  function renderRelated() {
    var rows = S.TICKETS.filter(function (x) { return x.company === t.company && x.id !== t.id; }), view = $('#rel-view'), body = $('#related .gd-table__body');
    $('#rel-desc').textContent = 'Other tickets from ' + t.company;
    body.innerHTML = rows.map(function (x) {
      return '<div class="gd-table__row" role="row" data-gd-id="' + x.id + '">' +
        '<div class="gd-table__cell gd-table__cell--strong" role="cell" title="' + U.esc(x.subject) + '"><a class="gd-table__link" href="' + U.ticketHref(x.id) + '">' + U.esc(x.subject) + '</a></div>' +
        '<div class="gd-table__cell gd-table__cell--flex" role="cell">' + U.priorityBadge(x.priority) + '</div>' +
        '<div class="gd-table__cell gd-table__cell--flex" role="cell">' + U.statusBadge(x.status) + '</div>' +
        '<div class="gd-table__cell" role="cell">' + U.esc(x.queue) + '</div>' +
        '<div class="gd-table__cell gd-table__cell--num" role="cell">' + S.short(x.created) + '</div></div>';
    }).join('');
    GD.tables.setState(view, rows.length ? null : 'empty');
  }

  /* ---- actions ------------------------------------------------------------------------------------- */
  function addEvent(e) { local.push(Object.assign({ t: NOW }, e)); renderTimeline(); }
  $('#resolve-btn').addEventListener('click', function () {
    if (t.status === 'Resolved') {
      t.status = 'Open'; t.resolvedAt = null; addEvent({ tone: 'info', icon: 'undo', who: ME.name, text: 'reopened the ticket' }); renderHead();
      U.toast('Ticket reopened', 'success'); return;
    }
    var before = { status: t.status, resolvedAt: t.resolvedAt }, n = local.length;
    t.status = 'Resolved'; t.resolvedAt = NOW; addEvent({ tone: 'good', icon: 'check', who: ME.name, text: 'marked the ticket <b>Resolved</b>' }); renderHead();
    U.toast('Ticket resolved', 'success', { action: { label: 'Undo', onClick: function () { t.status = before.status; t.resolvedAt = before.resolvedAt; local.length = n; renderTimeline(); renderHead(); } } });
  });

  var send = $('#send-btn'), text = $('#reply-text');
  function syncSend() { send.setAttribute('aria-disabled', text.value.trim() ? 'false' : 'true'); }
  text.addEventListener('input', syncSend); syncSend();
  send.addEventListener('click', function () {
    var v = text.value.trim(); if (!v) { text.focus(); return; }
    var note = $('#reply-kind [aria-checked="true"]').dataset.value === 'note';
    addEvent(note ? { tone: '', icon: 'note', who: ME.name, text: 'added an internal note', comment: v } : { tone: 'info', icon: 'send', who: ME.name, text: 'replied to ' + U.esc(t.requester), comment: v });
    text.value = ''; syncSend(); U.toast(note ? 'Note added' : 'Reply sent', 'success');
  });

  document.addEventListener('click', function (e) {
    var m = e.target.closest('[data-more]'); if (!m) return;
    var k = m.dataset.more;
    if (k === 'assign') { t.assignee = ME.id; addEvent({ tone: '', icon: 'user', who: ME.name, text: 'assigned the ticket to <b>themselves</b>' }); renderHead(); U.toast('Assigned to you', 'success'); }
    else if (k === 'copy') (navigator.clipboard ? navigator.clipboard.writeText(location.href) : Promise.reject()).then(function () { U.toast('Link copied', 'success'); }, function () { U.toast('Could not copy the link', 'error'); });
    else if (k === 'remove') GD.confirm({ title: 'Delete "' + t.subject + '"?', message: 'The conversation and its notes are removed. This sample stores nothing, so reloading the page brings the ticket back.', confirmLabel: 'Delete ticket', danger: true })
      .then(function (ok) { if (ok) { S.TICKETS.splice(S.TICKETS.indexOf(t), 1); U.toast('Ticket deleted', 'success'); setTimeout(function () { location.href = 'tickets.html'; }, 900); } });
  });

  renderHead(); renderSla(); renderTimeline(); renderRelated();
})();
