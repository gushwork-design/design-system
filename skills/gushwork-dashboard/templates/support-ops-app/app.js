/* Behaviour every page of the support operations template shares: density, sign out, and the small helpers that turn
   a ticket into the same badge, avatar and date wherever it appears. Page behaviour lives in the page's own file. */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---- density: comfortable by default, compact only when the person picks it. Kept across pages. ---- */
  var KEY = 'sup-density';
  function stored() { try { var v = localStorage.getItem(KEY); return v === 'compact' || v === 'comfortable' ? v : null; } catch (e) { return null; } }
  function setDensity(v, save) {
    document.body.setAttribute('data-density', v);
    $$('#density [role="radio"]').forEach(function (b) { var on = b.dataset.value === v; b.setAttribute('aria-checked', on); b.tabIndex = on ? 0 : -1; });
    if (save) { try { localStorage.setItem(KEY, v); } catch (e) { /* private mode: it still applies for this page */ } }
    window.dispatchEvent(new Event('resize'));       // charts re-measure
  }
  setDensity(stored() || 'comfortable', false);
  document.addEventListener('gd:change', function (e) { if (e.target.id === 'density') setDensity(e.detail.value, true); });

  /* ---- the rail: the row for this page is current, and its group is open. A page may name another page's row with
     data-nav on <body> (a ticket sits under Tickets); a row with a query or hash matches on that too (tickets.html?view=Open). ---- */
  function markNav() {
    // a host with clean URLs serves tickets.html as /tickets, so both sides are compared without .html
    var bare = function (v) { return v.replace(/\.html(?=$|[?#])/, ''); };
    var path = bare(document.body.dataset.nav || location.pathname.split('/').pop() || 'index.html'), links = $$('.gd-sidebar a.gd-nav-item[href]'), best = null;
    var tries = [path + location.search + location.hash, path + location.search, path];
    tries.forEach(function (want) { if (!best) links.forEach(function (a) { if (!best && bare(a.getAttribute('href')) === want) best = a; }); });
    links.forEach(function (a) { if (a === best) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    if (best) { var items = best.closest('.gd-nav-group__items'); if (items && items.hidden) { items.hidden = false; var head = $('[aria-controls="' + items.id + '"]'); if (head) head.setAttribute('aria-expanded', 'true'); } }
  }
  markNav(); window.addEventListener('popstate', markNav); window.addEventListener('hashchange', markNav);

  /* ---- sign out has no destination in a template ---- */
  document.addEventListener('gd:signout', function () { GD.toast('Sign out is not wired in this template', { type: 'info' }); });

  /* ---- shared formatting ---- */
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var PRIORITY_TONE = { Urgent: 'bad', High: 'warn', Normal: 'neutral', Low: 'neutral' };
  var STATUS_TONE = { Open: 'info', Pending: 'warn', Resolved: 'good' };
  var initials = function (name) { return name.split(' ').map(function (p) { return p[0]; }).slice(0, 2).join('').toUpperCase(); };
  window.SUPUI = {
    esc: esc, initials: initials, markNav: markNav,
    priorityBadge: function (p) { return '<span class="gd-badge gd-badge--' + PRIORITY_TONE[p] + '">' + esc(p) + '</span>'; },
    statusBadge: function (s, md) { return '<span class="gd-badge' + (md ? ' gd-badge--md' : '') + ' gd-badge--' + STATUS_TONE[s] + '">' + esc(s) + '</span>'; },
    avatar: function (a, size) { return '<span class="gd-avatar gd-avatar--' + (size || 'sm') + '" data-gd-avatar="' + esc(a.email) + '" role="img" aria-label="' + esc(a.name) + '"></span>'; },
    ticketHref: function (id) { return 'ticket.html?id=' + encodeURIComponent(id); },
    kv: function (rows) { return rows.map(function (r) { return '<div class="gd-key-value-list__row"><dt class="gd-key-value-list__key">' + r[0] + '</dt><dd class="gd-key-value-list__value">' + (r[1] || '<span class="gd-key-value-list__empty">\u2014</span>') + '</dd></div>'; }).join(''); },
    /* the properties every ticket view shows, so the drawer on Tickets and the panel on Ticket never disagree */
    ticketProps: function (t) {
      var S = window.SUP, a = S.agentById(t.assignee);
      return [
        ['Status', window.SUPUI.statusBadge(t.status)], ['Priority', window.SUPUI.priorityBadge(t.priority)], ['Queue', esc(t.queue)], ['Channel', esc(t.channel)],
        ['Assignee', a ? window.SUPUI.avatar(a) + esc(a.name) : ''], ['Requester', esc(t.requester)], ['Company', esc(t.company)],
        ['Created', '<time datetime="' + S.iso(t.created) + '" title="' + S.stamp(t.created) + '">' + S.short(t.created) + ', ' + S.clock(t.created) + '</time>'],
        ['First response', t.frt ? S.minutes(t.frt) : ''], ['Satisfaction', t.csat ? t.csat + ' out of 5' : '']
      ];
    },
    /* table pieces shared by the list pages: the same cell, header and person markup every table prints */
    cell: function (cls, col, html, extra) {
      // cls is a space-separated list of cell modifiers ('flex num'); a token that already starts with gd- is kept as written
      var c = (cls || '').split(' ').filter(Boolean).map(function (t) { return t.indexOf('gd-') === 0 ? t : 'gd-table__cell--' + t; }).join(' ');
      return '<div class="gd-table__cell' + (c ? ' ' + c : '') + '" role="cell" data-gd-col="' + col + '"' + (extra || '') + '>' + html + '</div>';
    },
    th: function (col, label, o) {
      o = o || {};
      var sort = '<button class="gd-table__sort" type="button" data-gd-sort>' + label + ' <svg width="12" height="12" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true" focusable="false"><path d="M117.66,170.34a8,8,0,0,1,0,11.32l-32,32a8,8,0,0,1-11.32,0l-32-32a8,8,0,0,1,11.32-11.32L72,188.69V48a8,8,0,0,1,16,0V188.69l18.34-18.35A8,8,0,0,1,117.66,170.34ZM213.66,85.66a8,8,0,0,1-11.32,0L184,67.31V208a8,8,0,0,1-16,0V67.31l-18.34,18.35a8,8,0,0,1-11.32-11.32l32-32a8,8,0,0,1,11.32,0l32,32A8,8,0,0,1,213.66,85.66Z"/></svg></button>';
      return '<div class="gd-table__th' + (o.num ? ' gd-table__th--num' : '') + '" role="columnheader"' + (o.sort === false ? '' : ' aria-sort="' + (o.sorted || 'none') + '"') + ' data-gd-col="' + col + '"' + (o.num ? ' data-gd-type="number"' : '') + '>' + (o.sort === false ? label : sort) + '</div>';
    },
    who: function (name, sub) { return '<span class="gd-table__avatar" aria-hidden="true">' + initials(name) + '</span><span class="gd-table__who"><b class="gd-table__trunc">' + esc(name) + '</b>' + (sub ? '<small>' + esc(sub) + '</small>' : '') + '</span>'; },
    badge: function (text, tone) { return '<span class="gd-badge gd-badge--' + tone + '">' + esc(text) + '</span>'; },
    meter: function (pct, label) { return '<span class="gd-table__meter"><i style="--v:' + pct + '%"></i></span><span>' + (label || pct + '%') + '</span>'; },
    date: function (t) { var S = window.SUP; return S.short(t) + ', ' + S.clock(t); },
    /* a row of headline figures; delta is optional. Same markup as the Overview's stat cards, without the sparkline. */
    statCards: function (host, cards) {
      host.innerHTML = cards.map(function (c) {
        return '<div class="gd-stat-card gd-span-3"><div class="gd-stat-card__label"><span class="gd-status-dot gd-status-dot--info" aria-hidden="true"></span><span class="gd-stat-card__name">' + esc(c.name) + '</span></div><div class="gd-stat-card__body"><div class="gd-stat-card__row"><div class="gd-stat-card__value gd-num">' + c.value + '</div></div><div class="gd-stat-card__meta">' + (c.meta || '') + '</div></div></div>';
      }).join('');
    },
    /* change against a comparison: a = now, b = before; good = +1 when up is better, -1 when down is better; pts shows points, not percent */
    delta: function (a, b, o) {
      o = o || {};
      var ch = o.pts ? a - b : (b ? (a - b) / b * 100 : 0), dir = Math.abs(ch) < 0.05 ? 'flat' : ch > 0 ? 'up' : 'down';
      var tone = dir === 'flat' ? 'neutral' : (ch * (o.good || 1) > 0 ? 'good' : 'bad'), txt = Math.abs(ch).toFixed(1) + (o.pts ? ' pts' : '%');
      var sr = dir === 'flat' ? 'No change' : (dir === 'up' ? 'Up ' : 'Down ') + txt.replace('%', ' percent') + ', ' + (tone === 'good' ? 'better' : 'worse') + ' than ' + (o.vs || 'the previous period');
      return '<span class="gd-delta' + (o.sm ? ' gd-delta--sm' : '') + ' gd-delta--' + tone + '"><span class="gd-delta__arrow" data-dir="' + dir + '"></span><span class="gd-delta__value">' + txt + '</span><span class="gd-sr">' + sr + '</span></span>' + (o.sm ? '' : '<span class="gd-stat-card__compare">vs ' + (o.vs || 'the previous period') + '</span>');
    },
    csv: function (name, lines) {
      var url = URL.createObjectURL(new Blob([lines.map(function (l) { return l.map(function (v) { return '"' + String(v).replace(/"/g, '""') + '"'; }).join(','); }).join('\n')], { type: 'text/csv' })), a = document.createElement('a');
      a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    },
    /* the underline tabs in a page header: select the one for the address, and on a change keep the address in step (so a reload or a
       shared link lands on the same view) and ask the page to redraw. def is the view that needs no query. */
    bindTabs: function (param, current, def, render) {
      var list = $('#viewtabs'); if (!list) return;
      var tabs = $$('[role="tab"]', list), on = tabs.filter(function (t) { return t.dataset.view === current; })[0] || tabs[0];
      tabs.forEach(function (t) { t.setAttribute('aria-selected', t === on); t.tabIndex = t === on ? 0 : -1; });
      document.addEventListener('gd:tab', function (e) {
        var t = e.detail && e.detail.tab; if (!t || !list.contains(t)) return;
        history.replaceState(null, '', location.pathname.split('/').pop() + (t.dataset.view === def ? '' : '?' + param + '=' + encodeURIComponent(t.dataset.view)));
        render(t.dataset.view);
      });
      return on.dataset.view;
    },
    param: function (k) { return new URLSearchParams(location.search).get(k); },
    toast: function (msg, type, o) { GD.toast(msg, Object.assign({ type: type || 'info' }, o || {})); }
  };
})();
