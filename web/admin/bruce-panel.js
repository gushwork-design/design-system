/* Bruce's analytics, on the Agents page (9 Oct 2026). Moved here from the Bruce tab of /admin/analytics, unchanged in what it shows: the
   conversations, what people use him for, how they talk to him, what it costs and the asks worth a look. agents.html mounts it into the
   Bruce tab with mountBrucePanel(element); the styles are bruce-panel.css. "Hide my activity" is the same preference Analytics keeps. */
(function () {
  'use strict';
  var SKELETON = "    <div class=\"ul-bar\" id=\"br-bar\">\n      <div class=\"vs-areas\">\n        <div class=\"ul-tabs\" role=\"tablist\" aria-label=\"Period\">\n          <button class=\"ul-tab\" role=\"tab\" data-period=\"today\" aria-selected=\"false\">Today</button>\n          <button class=\"ul-tab\" role=\"tab\" data-period=\"7\"  aria-selected=\"false\">7 days</button>\n          <button class=\"ul-tab\" role=\"tab\" data-period=\"30\" aria-selected=\"true\">30 days</button>\n          <button class=\"ul-tab\" role=\"tab\" data-period=\"all\" aria-selected=\"false\">All time</button>\n        </div>\n      </div>\n      <div class=\"ul-refresh\">\n        <span class=\"ul-refresh__t\" id=\"br-updated\" aria-live=\"polite\"></span>\n        <button class=\"gw-iconbtn\" id=\"br-refresh\" type=\"button\" aria-label=\"Refresh\" data-tip=\"Refresh\" data-tip-end></button>\n      </div>\n    </div>\n\n    <div id=\"br-blocked\" hidden></div>\n\n    <div id=\"br-app\">\n      <section class=\"ul-sec\" aria-labelledby=\"br-h-conv\">\n        <div class=\"ul-sh\"><div class=\"ul-sh__t\"><h2 id=\"br-h-conv\">Conversations</h2><span class=\"ul-sh__q\" id=\"br-q-conv\"></span></div></div>\n        <div id=\"br-convs\"></div>\n      </section>\n\n      <section class=\"ul-sec\" style=\"margin-top: var(--gw-space-24)\" aria-labelledby=\"br-h-new\">\n        <div class=\"ul-sh\"><div class=\"ul-sh__t\"><h2 id=\"br-h-new\">New on Bruce</h2><span class=\"ul-sh__q\" id=\"br-q-new\"></span></div></div>\n        <div id=\"br-new\"></div>\n      </section>\n\n      <section class=\"ul-sec\" style=\"margin-top: var(--gw-space-24)\" aria-labelledby=\"br-h-cost\">\n        <div class=\"ul-sh\"><div class=\"ul-sh__t\"><h2 id=\"br-h-cost\">Usage and tokens</h2><span class=\"ul-sh__q\" id=\"br-q-cost\"></span></div></div>\n        <div class=\"ul-metrics br-m4\" id=\"br-cost\"></div>\n        <details class=\"br-how\"><summary>How the estimate works</summary><div id=\"br-how\"></div></details>\n      </section>\n\n      <section class=\"ul-sec\" style=\"margin-top: var(--gw-space-24)\" aria-labelledby=\"br-h-work\">\n        <div class=\"ul-sh\"><div class=\"ul-sh__t\"><h2 id=\"br-h-work\">What he worked on</h2><span class=\"ul-sh__q\" id=\"br-q-work\"></span></div></div>\n        <div class=\"br-lks\" id=\"br-work\"></div>\n      </section>\n\n      <section class=\"ul-sec\" style=\"margin-top: var(--gw-space-24)\" aria-labelledby=\"br-h-look\">\n        <div class=\"ul-sh\"><div class=\"ul-sh__t\"><h2 id=\"br-h-look\">Needs from you</h2><span class=\"ul-sh__q\" id=\"br-q-look\"></span></div></div>\n        <div class=\"br-what\"><p class=\"br-note\">Asks that may not have gone well. Open one to read the whole conversation. If most of them are your own tests, turn on Hide my activity.</p><dl><dt>No clear lane</dt><dd>The words did not match any of his topics (brand files, build a page, access, status and so on). Topics are sorted by plain keywords, so this does <b>not</b> mean he failed, and he still answered. Read it: if it is real work he should own, ask for a lane to be added; if it is chat or a test, leave it.</dd><dt>Failed</dt><dd>His run did not start. Check Bruce on Doc's tab, then ask again.</dd><dt>Hit the daily cap</dt><dd>That person used up their runs for the day. Nothing to fix unless the cap is too low.</dd></dl></div>\n        <div class=\"br-lks\" id=\"br-look\"></div>\n      </section>\n\n      <div class=\"br-scrim\" id=\"br-scrim\" hidden></div>\n      <aside class=\"br-rv\" id=\"br-drawer\" role=\"dialog\" aria-modal=\"true\" aria-labelledby=\"br-d-t\" tabindex=\"-1\" hidden>\n        <div class=\"br-h\">\n          <div class=\"br-h__t\"><div class=\"br-h__s\" id=\"br-d-s\">Conversation</div><h2 id=\"br-d-t\">Conversation</h2></div>\n          <div class=\"br-h__r\">\n            <button type=\"button\" class=\"br-x\" id=\"br-d-prev\" aria-label=\"Previous conversation\" title=\"Previous (\u2190)\">\u2039</button>\n            <button type=\"button\" class=\"br-x\" id=\"br-d-next\" aria-label=\"Next conversation\" title=\"Next (\u2192)\">\u203a</button>\n            <button type=\"button\" class=\"br-ex\" id=\"br-d-ex\" aria-expanded=\"false\" aria-keyshortcuts=\"E\"></button>\n            <button type=\"button\" class=\"br-x\" id=\"br-d-x\" aria-label=\"Close\" title=\"Close (Esc)\">&times;</button>\n          </div>\n        </div>\n        <div class=\"br-dtabs\"><div class=\"ul-tabs\" role=\"tablist\" aria-label=\"Conversation views\">\n          <button class=\"ul-tab\" role=\"tab\" data-dt=\"chat\" aria-selected=\"true\">Conversation</button>\n          <button class=\"ul-tab\" role=\"tab\" data-dt=\"shared\" aria-selected=\"false\" id=\"br-t-shared\">Shared</button>\n          <button class=\"ul-tab\" role=\"tab\" data-dt=\"log\" aria-selected=\"false\">Log</button></div></div>\n        <div class=\"br-body\" id=\"br-d-b\" aria-live=\"polite\"></div>\n      </aside>\n    </div>";
  window.anMe = window.anMe || { on: false, pub: false, email: '', shared: ['design@gushwork.ai'], ready: Promise.resolve() };
  try { window.anMe.on = localStorage.getItem('gw-analytics-hide-me') === '1'; } catch (e) { /* off */ }
  window.mountBrucePanel = function (mountEl) {
    var api = {};
    mountEl.innerHTML = SKELETON;
    /* Hide my activity lives in the page's sticky bar (agents.html), which calls setHide and refilter. */
    api.setHide = function (v) { window.anMe.on = !!v; };
    var up = mountEl.querySelector('#br-updated'), rf = mountEl.querySelector('#br-refresh');
    if (up && rf) {
      var sync = function () { var t = up.textContent.trim(); rf.setAttribute('data-tip', t ? t + ' \u00b7 click to refresh' : 'Refresh'); };
      new MutationObserver(sync).observe(up, { childList: true, characterData: true, subtree: true }); sync();
    }
(function () {
  'use strict';
  var ROOT = mountEl;
  var API = '/api/bruce-memory?log=1';
  var ICON = { 'arrow-clockwise': '<path d="M240,56v48a8,8,0,0,1-8,8H184a8,8,0,0,1,0-16H211.4L184.81,71.64l-.25-.24a80,80,0,1,0-1.67,114.78,8,8,0,0,1,11,11.63A95.44,95.44,0,0,1,128,224h-1.32A96,96,0,1,1,195.75,60L224,85.8V56a8,8,0,1,1,16,0Z"/>' };
  function icon(n) { return '<svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">' + (ICON[n] || '') + '</svg>'; }
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
  function $(id) { return document.getElementById(id); }
  function plural(n, w, many) { return n + ' ' + (n === 1 ? w : (many || w + 's')); }
  var DAY = 86400000;
  function ago(ms) {
    var s = Math.max(0, Math.round(ms / 1000));
    if (s < 60) return s + 's ago';
    var m = Math.round(s / 60); if (m < 60) return m + ' min ago';
    var h = Math.round(m / 60); if (h < 48) return h + ' h ago';
    return Math.round(h / 24) + ' days ago';
  }
  function fmtWhen(d) { return d.toLocaleString(undefined, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }); }
  function fmtDay(d) { return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }); }
  function fmtTime(d) { return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }); }
  function clip(t, n) { t = String(t || ''); return t.length > n ? t.slice(0, n - 1) + '…' : t; }
  var KIND = { run: 'Run', chat: 'Chat', capped: 'Capped', 'to-alfred': 'To Alfred', failed: 'Failed', sent: 'Sent' };
  var TOPIC = { 'pass-on': 'Pass on to Utsav', status: 'Status check', access: 'Access', brand: 'Brand files', build: 'Build a page', template: 'Templates and tools', hub: 'Hub and system', about: 'About Bruce', other: 'No clear lane' };
  /* What a Bruce session costs, ESTIMATED. Nothing here is measured: run records carry no token counts and the hub cannot read the plan's
     usage card. The first figure is measured from the repo files (about 4 characters a token); the other two are assumptions to tune. */
  var TOK = { start: 29000, chat: 4000, run: 90000 };
  function tokensOf(r) { return r.kind === 'run' ? TOK.start + TOK.run : r.kind === 'chat' ? TOK.start + TOK.chat : 0; }   /* capped, failed and passed-to-Alfred start no Bruce session */
  function tok(n) { return n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? Math.round(n / 1e3) + 'k' : String(Math.round(n)); }
  var S = { status: 'loading', rows: [], rowsAll: [], period: '30', busy: false, fetchedAt: 0, owner: '', cap: 3, topic: '', convs: [], dm: {}, seq: 0, openUser: '', tab: 'chat', order: [], i: -1, wide: false, usage: null };

  function parse(raw) {
    var out = [];
    raw.forEach(function (r) {
      var d = new Date(r.at); if (isNaN(d.getTime())) return;
      var kind = KIND[r.kind] ? r.kind : 'run';
      out.push({ at: d, user: String(r.user || ''), name: String(r.name || r.user || ''), role: r.role === 'owner' ? 'owner' : 'teammate', kind: kind, thread: !!r.thread,
        text: String(r.text || ''), topic: TOPIC[r.topic] ? r.topic : (kind === 'sent' ? '' : 'other'), to: String(r.toName || ''), ch: String(r.ch || ''), ts: String(r.ts || '') });
    });
    return out;
  }
  function hideMe(rows) { return window.anMe.on && S.owner ? rows.filter(function (r) { return r.user !== S.owner; }) : rows; }
  function isAsk(r) { return r.kind !== 'sent'; }
  function scoped() {
    var cut = S.period === 'all' ? 0 : S.period === 'today' ? new Date().setHours(0, 0, 0, 0) : Date.now() - (+S.period) * DAY;
    return S.rows.filter(function (r) { return r.at.getTime() >= cut; });
  }
  function conversations(rows) {
    var by = {};
    rows.forEach(function (r) {
      var c = by[r.user] || (by[r.user] = { user: r.user, name: r.name, role: r.role, asks: [], topics: {}, last: r.at, ask: null });
      if (isAsk(r)) { c.asks.push(r); c.topics[r.topic] = (c.topics[r.topic] || 0) + 1; if (!c.ask || r.at > c.ask.at) c.ask = r; }
      if (r.at > c.last) c.last = r.at; if (r.role === 'owner') c.role = 'owner';
    });
    return Object.keys(by).map(function (k) { return by[k]; }).filter(function (c) { return c.asks.length; }).sort(function (a, b) { return b.last - a.last; });
  }
  function topTopics(c, n) { return Object.keys(c.topics).sort(function (a, b) { return c.topics[b] - c.topics[a]; }).slice(0, n); }
  function metric(label, value, note) {
    return '<div class="ul-metric"><span class="ul-lab">' + esc(label) + '</span><div class="ul-metric__body"><span class="ul-num">' + esc(value) +
      '</span><span class="ul-note">' + esc(note) + '</span></div></div>';
  }
  function initial(n) { return esc(String(n || '?').trim().charAt(0).toUpperCase() || '?'); }
  function tag(t, n) { return '<span class="br-tag' + (t === 'other' ? ' br-tag--gap' : '') + '">' + esc(TOPIC[t] || t) + (n > 1 ? ' ×' + n : '') + '</span>'; }
  function badge(k) { var cls = k === 'capped' ? ' ul-badge--warn' : k === 'failed' ? ' ul-badge--bad' : k === 'run' ? ' ul-badge--ok' : ''; return '<span class="ul-badge' + cls + '">' + esc(KIND[k]) + '</span>'; }
  function median(a) { if (!a.length) return 0; a = a.slice().sort(function (x, y) { return x - y; }); var m = a.length >> 1; return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2; }
  function pct(n, d) { return d ? Math.round(n / d * 100) + '%' : '—'; }

  function renderAll() {
    var rows = scoped(), asks = rows.filter(isAsk), convs = conversations(rows); S.convs = convs;
    /* conversations, newest first, optionally narrowed to one topic */
    var shown = S.topic ? convs.filter(function (c) { return c.topics[S.topic]; }) : convs;
    S.order = shown.map(function (c) { return c.user; });
    $('br-q-conv').textContent = plural(shown.length, 'conversation') + ', latest first' + (S.topic ? ', about ' + TOPIC[S.topic].toLowerCase() : '');
    $('br-convs').innerHTML = shown.length ? '<ul class="br-cl">' + shown.map(function (c) {
      var tags = topTopics(c, 3).map(function (t) { return tag(t, c.topics[t]); }).join('');
      return '<li><button type="button" class="br-ci" data-u="' + esc(c.user) + '" aria-label="Open the conversation with ' + esc(c.name) + '"><span class="br-av" aria-hidden="true">' + initial(c.name) + '</span>' +
        '<span><span class="br-ci__top"><b>' + esc(c.name) + '</b>' + (c.role === 'owner' ? '<span class="ul-badge">Owner</span>' : '') + '</span>' +
        '<span class="br-ci__last">' + (c.ask.thread ? '↳ ' : '') + esc(c.ask.text || '—') + '</span><span class="br-ci__tags">' + tags + '</span></span>' +
        '<span class="br-ci__meta"><time datetime="' + c.last.toISOString() + '" title="' + esc(fmtWhen(c.last)) + '">' + esc(ago(Date.now() - c.last.getTime())) + '</time><span>' + esc(plural(c.asks.length, 'ask')) + '</span></span></button></li>';
    }).join('') + '</ul>' : '<p class="br-empty">' + (S.topic ? 'Nobody asked about this in the period.' : 'Nobody has talked to Bruce in this period.') + '</p>';

    /* new people: whose first ask in the log falls in the period (everyone, newest first, when the period is all time) */
    var firstBy = {};
    S.rows.filter(isAsk).forEach(function (r) { var f = firstBy[r.user]; if (!f || r.at < f.at) firstBy[r.user] = r; });
    var cut = S.period === 'all' ? 0 : S.period === 'today' ? new Date().setHours(0, 0, 0, 0) : Date.now() - (+S.period) * DAY;
    var fresh = Object.keys(firstBy).map(function (k) { return firstBy[k]; }).filter(function (r) { return r.at.getTime() >= cut; }).sort(function (a, b) { return b.at - a.at; });
    $('br-q-new').textContent = fresh.length ? plural(fresh.length, 'person', 'people') + ' asked him for the first time' : '';
    $('br-new').innerHTML = fresh.length ? '<ul class="br-cl">' + fresh.slice(0, 8).map(function (r) {
      return '<li><button type="button" class="br-ci" data-u="' + esc(r.user) + '" aria-label="Open the conversation with ' + esc(r.name) + '"><span class="br-av" aria-hidden="true">' + initial(r.name) + '</span>' +
        '<span><span class="br-ci__top"><b>' + esc(r.name) + '</b>' + (r.role === 'owner' ? '<span class="ul-badge">Owner</span>' : '') + '</span><span class="br-ci__last">' + esc(r.text || '—') + '</span></span>' +
        '<span class="br-ci__meta"><time datetime="' + r.at.toISOString() + '" title="' + esc(fmtWhen(r.at)) + '">' + esc(ago(Date.now() - r.at.getTime())) + '</time><span>first ask</span></span></button></li>';
    }).join('') + '</ul>' + (fresh.length > 8 ? '<p class="br-note">And ' + (fresh.length - 8) + ' more. Counted from the start of the log, which keeps his most recent turns.</p>' : '')
      : '<p class="br-empty">Nobody new has asked him in this period.</p>';

    /* what he worked on: the runs (real work), newest first */
    var work = asks.filter(function (r) { return r.kind === 'run'; }).sort(function (a, b) { return b.at - a.at; });
    $('br-q-work').textContent = work.length ? plural(work.length, 'run') + (work.length > 8 ? ', latest 8' : '') + ', newest first' : '';
    $('br-work').innerHTML = work.length ? work.slice(0, 8).map(function (r) {
      return '<button type="button" class="br-lk" data-u="' + esc(r.user) + '"><span>' + esc(fmtWhen(r.at)) + '</span><span>' + esc(r.name) + '</span>' + tag(r.topic, 0) + '<span>' + (r.thread ? '↳ ' : '') + esc(r.text || '—') + '</span></button>';
    }).join('') : '<p class="br-empty">He has not built or changed anything in this period.</p>';

    /* what it costs: an estimate, per the TOK constants above */
    var u = S.usage, resetAt = u && u.weekly && Date.parse(u.weekly.resetsAt) ? Date.parse(u.weekly.resetsAt) : 0;
    var weekFrom = resetAt ? resetAt - 7 * DAY : Date.now() - 7 * DAY;
    var periodTok = asks.reduce(function (n, r) { return n + tokensOf(r); }, 0);
    var weekTok = S.rows.filter(function (r) { return isAsk(r) && r.at.getTime() >= weekFrom; }).reduce(function (n, r) { return n + tokensOf(r); }, 0);
    var started = asks.filter(function (r) { return tokensOf(r) > 0; }).length;
    var snapAge = u && Date.parse(u.at) ? Date.now() - Date.parse(u.at) : 0;
    $('br-q-cost').textContent = 'estimated, not measured';
    $('br-cost').innerHTML =
      metric('Tokens, this period', started ? '≈ ' + tok(periodTok) : '—', started ? 'about ' + tok(periodTok / started) + ' for each of ' + plural(started, 'session') + ' he started' : 'no sessions yet') +
      metric('Tokens, this week', '≈ ' + tok(weekTok), resetAt ? 'since the weekly limit reset on ' + new Date(weekFrom).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }) : 'the last 7 days') +
      metric('Your weekly limit', u && u.weekly ? u.weekly.percentUsed + '% used' : '—', u && u.weekly ? 'everything on your account, as of ' + fmtWhen(new Date(u.at)) + (snapAge > 2 * DAY ? ' (' + Math.round(snapAge / DAY) + ' days old)' : '') + '. Resets in ' + Math.max(0, Math.round((resetAt - Date.now()) / DAY * 10) / 10) + ' days' : 'no snapshot found');
    $('br-how').innerHTML = '<ul>' +
      '<li><b>' + tok(TOK.start) + ' tokens to start, measured.</b> Before he does anything, every DM makes him read his instructions (4.5k), CONTRIBUTING.md (5.1k), DECISIONS.md from R45 on (18.1k) and voice.md (1.3k). Sizes are taken from the repo files at about 4 characters a token. This is most of what a chat costs.</li>' +
      '<li><b>+' + tok(TOK.chat) + ' for a chat, assumed.</b> Reading the thread, one reply, a memory note.</li>' +
      '<li><b>+' + tok(TOK.run) + ' for a run, assumed.</b> A skill, a template, the page itself, a screenshot. Builds vary a lot; change TOK in this page to match what you see.</li>' +
      '<li><b>Nothing</b> for capped, failed and passed-to-Alfred asks: they start no Bruce session.</li>' +
      '<li><b>Not a bill.</b> Re-reads of the same context are cached and weigh less on a plan. Use it to compare weeks, and chats against runs.</li>' +
      '<li><b>Your weekly limit</b> comes from a dated snapshot of the plan’s usage card (<code>admin/bruce-usage.json</code>), because the hub cannot read it live. Refresh the file to update it.</li></ul>';

    /* worth a look */
    var gaps = asks.filter(function (r) { return r.topic === 'other' || r.kind === 'failed' || r.kind === 'capped'; }).sort(function (a, b) { return b.at - a.at; }).slice(0, 8);
    $('br-q-look').textContent = gaps.length ? plural(gaps.length, 'ask') + ', newest first' : '';
    $('br-look').innerHTML = gaps.length ? gaps.map(function (r) {
      return '<button type="button" class="br-lk" data-u="' + esc(r.user) + '"><span>' + esc(fmtWhen(r.at)) + '</span><span>' + esc(r.name) + '</span>' +
        (r.kind === 'run' || r.kind === 'chat' ? tag(r.topic, 0) : badge(r.kind)) + '<span>' + (r.thread ? '↳ ' : '') + esc(r.text || '—') + '</span></button>';
    }).join('') : '<p class="br-empty">Nothing to fix. Every ask landed in a lane.</p>';
  }

  /* ---------- the drawer: the same shape as the Design System review drawer ---------- */
  var drawer = $('br-drawer'), scrim = $('br-scrim'), lastFocus = null;
  var EXPAND_SVG = '<svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M216,48V96a8,8,0,0,1-16,0V67.31l-42.34,42.35a8,8,0,0,1-11.32-11.32L188.69,56H160a8,8,0,0,1,0-16h48A8,8,0,0,1,216,48ZM98.34,146.34,56,188.69V160a8,8,0,0,0-16,0v48a8,8,0,0,0,8,8H96a8,8,0,0,0,0-16H67.31l42.35-42.34a8,8,0,0,0-11.32-11.32Z"/></svg>', COLLAPSE_SVG = '<svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M152,104V56a8,8,0,0,1,16,0V84.69l42.34-42.35a8,8,0,0,1,11.32,11.32L179.31,96H208a8,8,0,0,1,0,16H160A8,8,0,0,1,152,104ZM96,152H48a8,8,0,0,0,0,16H76.69L34.34,210.34a8,8,0,0,0,11.32,11.32L88,179.31V208a8,8,0,0,0,16,0V160A8,8,0,0,0,96,152Z"/></svg>';
  function personRows(user) { return S.rowsAll.filter(function (r) { return r.user === user; }).sort(function (a, b) { return b.at - a.at; }); }
  function note(title, text) { return '<p class="br-empty"><b>' + esc(title) + '</b><br>' + esc(text) + '</p>'; }
  function linkify(t) {
    /* Slack's own light formatting, read back: *bold*, _italic_ and `code`, and every link live. Links are cut before the
       punctuation that follows them, and only http(s) is ever made a link. */
    return String(t).split(/(https?:\/\/[^\s<]+)/g).map(function (p, i) {
      if (i % 2) {
        var m = p.match(/^(.*?)([.,;:!?)\]'"]*)$/), u = m[1], tail = m[2];
        return '<a href="' + esc(u) + '" target="_blank" rel="noopener noreferrer">' + esc(u) + '</a>' + esc(tail);
      }
      return esc(p).replace(/`([^`\n]+)`/g, '<code>$1</code>').replace(/\*([^*\n]+)\*/g, '<strong>$1</strong>').replace(/(^|[\s(])_([^_\n]+)_(?=$|[\s).,;:!?])/g, '$1<em>$2</em>');
    }).join('');
  }
  function kb(n) { return n >= 1048576 ? (n / 1048576).toFixed(1) + ' MB' : n >= 1024 ? Math.round(n / 1024) + ' KB' : n ? n + ' B' : ''; }
  function fileChip(f) {
    var label = esc(f.name) + (f.type ? ' · ' + esc(f.type) : '');
    return f.url && /^https:\/\//.test(f.url) ? '<a class="br-fc" href="' + esc(f.url) + '" target="_blank" rel="noopener noreferrer">' + label + '</a>' : '<span class="br-fc">' + label + '</span>';
  }
  function pic(m, ghost) {
    return m.from === 'bruce' ? '<span class="br-pic br-pic--bruce' + (ghost ? ' br-pic--ghost' : '') + '" role="img" aria-label="Bruce"></span>'
      : '<span class="br-pic' + (ghost ? ' br-pic--ghost' : '') + '" aria-hidden="true">' + initial(m.name) + '</span>';
  }
  function bubble(m, prev, newDay) {
    var ghost = !!prev && !newDay && prev.from === m.from;     /* the same sender again: no second picture */
    return '<div class="br-msg br-msg--' + (m.from === 'bruce' ? 'bruce' : 'person') + '">' + pic(m, ghost) + '<div class="br-msg__c"><span class="br-msg__who">' + esc(m.name) + ' · ' + esc(fmtTime(new Date(m.at))) +
      (m.reply ? ' · <span class="br-thr">↳ in a thread</span>' : '') + '</span>' +
      (m.text ? '<p class="br-msg__t">' + linkify(m.text) + '</p>' : '') + (m.files && m.files.length ? '<span class="br-msg__f">' + m.files.map(fileChip).join('') + '</span>' : '') + '</div></div>';
  }
  function host(u) { try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return u; } }
  function sharedOf(j) {
    var files = [], links = [], seen = {};
    j.messages.forEach(function (m) {
      (m.files || []).forEach(function (f) { files.push({ f: f, m: m }); });
      (m.links || []).forEach(function (l) { if (!seen[l.url]) { seen[l.url] = 1; links.push({ l: l, m: m }); } });
    });
    return { files: files.reverse(), links: links.reverse() };
  }
  function setShared(j) { var n = j && j.ok ? (function (x) { return x.files.length + x.links.length; })(sharedOf(j)) : 0; $('br-t-shared').textContent = 'Shared' + (n ? ' ' + n : ''); }
  function dRow(k, v) { return '<div class="br-d"><span>' + esc(k) + '</span><b>' + v + '</b></div>'; }
  function detailsHtml(c, all) {
    var asks = all.filter(isAsk), first = all.length ? all[all.length - 1].at : c.last, tc = {};
    asks.forEach(function (r) { tc[r.topic] = (tc[r.topic] || 0) + 1; });
    var runs = asks.filter(function (r) { return r.kind === 'run'; }).length, chats = asks.filter(function (r) { return r.kind === 'chat'; }).length;
    var tags = Object.keys(tc).sort(function (a, b) { return tc[b] - tc[a]; }).map(function (t) { return tag(t, tc[t]); }).join('') || '<span class="br-d"><span>None yet</span></span>';
    return '<section class="br-sec br-sec--det"><h3>Details</h3><div class="br-dl">' +
      dRow('First asked', esc(fmtWhen(first))) + dRow('Last asked', esc(fmtWhen(c.last)) + ' <span>(' + esc(ago(Date.now() - c.last.getTime())) + ')</span>') +
      dRow('Asks', esc(plural(asks.length, 'ask')) + ' <span>(' + runs + ' run' + (runs === 1 ? '' : 's') + ', ' + chats + ' chat' + (chats === 1 ? '' : 's') + ')</span>') +
      dRow('Tokens (est.)', '\u2248 ' + esc(tok(asks.reduce(function (n, r) { return n + tokensOf(r); }, 0)))) +
      dRow('Role', c.role === 'owner' ? 'Owner' : 'Teammate') + '<div class="br-d br-d--text"><span>Topics</span><div class="br-tags">' + tags + '</div></div></div></section>';
  }
  function cur() { var u = S.openUser; return { c: S.convs.filter(function (x) { return x.user === u; })[0] || { user: u, name: (S.rowsAll.filter(function (r) { return r.user === u; })[0] || {}).name || u, role: 'teammate', last: new Date(), asks: [], topics: {} }, all: personRows(u) }; }
  function drawerHead() {
    var x = cur(), n = S.order.length, i = S.i;
    $('br-d-s').textContent = 'Conversation' + (i >= 0 && n > 1 ? ' · ' + (i + 1) + ' of ' + n : '');
    $('br-d-t').innerHTML = esc(x.c.name) + (x.c.role === 'owner' ? ' <span class="ul-badge">Owner</span>' : '');
    $('br-d-prev').disabled = !(i > 0); $('br-d-next').disabled = !(i >= 0 && i < n - 1);
  }
  function syncWide() {
    drawer.classList.toggle('br-rv--wide', !!S.wide);
    var b = $('br-d-ex'); b.innerHTML = (S.wide ? COLLAPSE_SVG + 'Collapse' : EXPAND_SVG + 'Expand') + '<kbd aria-hidden="true">E</kbd>';
    b.setAttribute('aria-expanded', String(!!S.wide)); b.title = S.wide ? 'Collapse the drawer (E)' : 'Open the drawer out (E)';
  }
  function renderThread(j) {
    var b = $('br-thread'); if (!b) return;
    if (!j) { b.innerHTML = '<p class="br-empty">Reading the DM from Slack…</p>'; return; }
    if (!j.ok) {
      b.innerHTML = j.reason === 'scope' ? note('Slack won’t let the site read this yet', 'Bruce’s Slack app is missing a permission' + (j.needed ? ' (' + j.needed + ')' : '') + '. Add it in the app’s settings, reinstall the app, then open this again. The Log tab still works.')
        : note('Could not read this conversation', j.detail || j.error || 'Try again in a moment. The Log tab still works.');
      return;
    }
    if (!j.messages.length) { b.innerHTML = note('Nothing in this DM', 'Slack returned no messages.'); return; }
    var html = '<div class="br-msgs">', day = '', prev = null;
    if (j.truncated) html += '<p class="br-dnote">Showing the newest ' + j.messages.length + ' messages. Older ones are in Slack.</p>';
    j.messages.forEach(function (m) {
      var dl = fmtDay(new Date(m.at)), nd = dl !== day; if (nd) { day = dl; html += '<span class="br-day">' + esc(dl) + '</span>'; }
      html += bubble(m, prev, nd); prev = m;
    });
    b.innerHTML = html + '</div>';
    var body = $('br-d-b'); body.scrollTop = body.scrollHeight;       /* the newest message, like a DM */
  }
  function renderShared(j) {
    var b = $('br-d-b');
    if (!j) { b.innerHTML = '<p class="br-empty">Reading the DM from Slack…</p>'; return; }
    if (!j.ok) { b.innerHTML = '<section class="br-sec"><h3>Shared</h3><div id="br-thread"></div></section>'; renderThread(j); return; }
    var sh = sharedOf(j);
    if (!sh.files.length && !sh.links.length) { b.innerHTML = '<section class="br-sec"><h3>Shared</h3>' + note('No links or files yet', 'Nothing has been shared in this DM.') + '</section>'; return; }
    function who(x) { return esc(x.m.name) + ' · ' + esc(fmtWhen(new Date(x.m.at))); }
    var html = '';
    if (sh.files.length) html += '<section class="br-sec"><h3>Files (' + sh.files.length + ')</h3><div class="br-dl">' + sh.files.map(function (x) {
      return '<div class="br-sh"><div><b>' + esc(x.f.name) + '</b><small>' + who(x) + (x.f.type ? ' · ' + esc(x.f.type) : '') + (x.f.size ? ' · ' + esc(kb(x.f.size)) : '') + '</small></div>' +
        (x.f.url && /^https:\/\//.test(x.f.url) ? '<a href="' + esc(x.f.url) + '" target="_blank" rel="noopener noreferrer">Open in Slack</a>' : '') + '</div>';
    }).join('') + '</div></section>';
    if (sh.links.length) html += '<section class="br-sec"><h3>Links (' + sh.links.length + ')</h3><div class="br-dl">' + sh.links.map(function (x) {
      return '<div class="br-sh"><div><b>' + esc(x.l.label || host(x.l.url)) + '</b><small>' + who(x) + ' · ' + esc(host(x.l.url)) + '</small></div>' +
        '<a href="' + esc(x.l.url) + '" target="_blank" rel="noopener noreferrer">Open</a></div>';
    }).join('') + '</div></section>';
    b.innerHTML = html; b.scrollTop = 0;
  }
  function renderLog() {
    var x = cur(), b = $('br-d-b');
    b.innerHTML = '<section class="br-sec"><h3>Log</h3>' + (x.all.length ? '<div class="br-log">' + x.all.map(function (r) {
      return '<div class="br-lr"><time datetime="' + r.at.toISOString() + '">' + esc(fmtWhen(r.at)) + '</time><span>' + (r.kind === 'sent' ? '<span class="ul-badge">Sent</span>' : badge(r.kind) + ' ' + tag(r.topic, 0)) + '</span>' +
        '<p>' + (r.kind === 'sent' ? '→ ' + esc(r.to || 'someone') + ': ' : (r.thread ? '↳ ' : '')) + esc(r.text || '—') + '</p></div>';
    }).join('') + '</div><p class="br-dnote">Everything the log holds for this person: the first 200 characters of each ask, and each message Bruce reported sending. What he answered is in the Conversation tab, and what was shared is in Shared.</p>' : '<p class="br-empty">No logged turns.</p>') + '</section>';
    b.scrollTop = 0;
  }
  function showTab(t) {
    S.tab = t;
    drawer.querySelectorAll('.ul-tab[data-dt]').forEach(function (x) { x.setAttribute('aria-selected', String(x.getAttribute('data-dt') === t)); });
    var x = cur(), b = $('br-d-b');
    if (t === 'log') renderLog();
    else if (t === 'shared') renderShared(S.dm[S.openUser] || null);
    else { b.innerHTML = '<div class="br-cols">' + detailsHtml(x.c, x.all) + '<section class="br-sec br-sec--thread"><h3>Conversation</h3><div id="br-thread"></div></section></div>'; renderThread(S.dm[S.openUser] || null); }
  }
  function loadDM(user, all) {
    if (S.dm[user]) { setShared(S.dm[user]); return; }
    var seq = ++S.seq, ch = (all.filter(function (r) { return r.ch; })[0] || {}).ch || '';
    fetch('/api/bruce-memory?dm=1&user=' + encodeURIComponent(user) + (ch ? '&ch=' + encodeURIComponent(ch) : ''), { credentials: 'same-origin', cache: 'no-store' })
      .then(function (res) { return res.json().catch(function () { return { ok: false, reason: 'slack', detail: 'Unexpected answer.' }; }); })
      .then(function (j) { if (j && j.ok) S.dm[user] = j; if (seq !== S.seq || S.openUser !== user) return; setShared(j); if (S.tab === 'chat') renderThread(j); else if (S.tab === 'shared') renderShared(j); })
      .catch(function () { if (seq === S.seq && S.openUser === user && S.tab !== 'log') renderThread({ ok: false, detail: 'Try again in a moment.' }); });
  }
  function openConv(user) {
    if (drawer.hidden) { lastFocus = document.activeElement; drawer.hidden = false; scrim.hidden = false; document.documentElement.classList.add('br-open'); S.wide = false; syncWide(); }
    S.openUser = user; S.i = S.order.indexOf(user);
    drawerHead(); setShared(S.dm[user]); showTab('chat'); drawer.focus();
    loadDM(user, personRows(user));
  }
  function closeConv() {
    drawer.hidden = true; scrim.hidden = true; document.documentElement.classList.remove('br-open'); S.openUser = ''; S.seq++;
    if (lastFocus && lastFocus.focus) { try { lastFocus.focus(); } catch (e) {} }
  }
  function step(d) { var n = S.order[S.i + d]; if (n) openConv(n); }
  drawer.querySelectorAll('.ul-tab[data-dt]').forEach(function (b) { b.addEventListener('click', function () { showTab(b.getAttribute('data-dt')); }); });
  $('br-d-x').addEventListener('click', closeConv);
  scrim.addEventListener('click', closeConv);
  $('br-d-prev').addEventListener('click', function () { step(-1); });
  $('br-d-next').addEventListener('click', function () { step(1); });
  $('br-d-ex').addEventListener('click', function () { S.wide = !S.wide; syncWide(); });
  document.addEventListener('keydown', function (ev) {
    if (drawer.hidden) return;
    var typing = /^(TEXTAREA|INPUT)$/.test((ev.target || {}).tagName || ''), mod = ev.metaKey || ev.ctrlKey || ev.altKey;
    if (ev.key === 'Escape') { closeConv(); return; }
    if (typing || mod) return;
    if (ev.key === 'ArrowLeft') { ev.preventDefault(); step(-1); }
    else if (ev.key === 'ArrowRight') { ev.preventDefault(); step(1); }
    else if (ev.key.toLowerCase() === 'e') { ev.preventDefault(); $('br-d-ex').click(); }
  });
  ROOT.addEventListener('click', function (e) {
    var t = e.target.closest && e.target.closest('[data-u], [data-t]'); if (!t || !ROOT.contains(t)) return;
    if (t.hasAttribute('data-u')) { openConv(t.getAttribute('data-u')); return; }
    var topic = t.getAttribute('data-t'); S.topic = S.topic === topic ? '' : topic; renderAll();
  });
  syncWide();

  function renderBlocked(kind) {
    var copy = { signin: ['Sign in to see this', 'Bruce’s log is for the owner.'], forbidden: ['Owners only', 'Bruce’s log shows who asked him what. Only an owner can see it.'],
      unconfigured: ['No store connected', 'The site has no KV store, so nothing is logged yet.'], error: ['Could not load the log', 'Try again in a moment.'] }[kind];
    $('br-blocked').innerHTML = '<div class="ul-empty"><div class="ul-empty__copy"><h2>' + esc(copy[0]) + '</h2><p>' + esc(copy[1]) + '</p></div></div>';
    $('br-blocked').hidden = false; $('br-app').hidden = true;
  }
  function render() {
    if (S.status === 'ready' || S.status === 'empty' || S.status === 'loading') { $('br-blocked').hidden = true; $('br-app').hidden = false; renderAll(); }
    else renderBlocked(S.status);
    ROOT.querySelectorAll('.ul-tab[data-period]').forEach(function (b) { b.setAttribute('aria-selected', String(b.getAttribute('data-period') === S.period)); });
    updated();
  }
  function updated() { $('br-updated').textContent = S.fetchedAt ? 'Updated ' + ago(Date.now() - S.fetchedAt) : ''; }
  function loadUsage() { return fetch('/admin/bruce-usage.json', { credentials: 'same-origin', cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (j) { S.usage = j && j.weekly ? j : null; }).catch(function () { S.usage = null; }); }
  function load() {
    if (S.busy) return; S.busy = true; S.dm = {}; $('br-refresh').setAttribute('aria-busy', 'true');
    fetch(API, { credentials: 'same-origin', cache: 'no-store' }).then(function (r) {
      if (r.status === 401) { S.status = 'signin'; return null; }
      if (r.status === 403) { S.status = 'forbidden'; return null; }
      if (!r.ok) throw new Error('http ' + r.status);
      return r.json();
    }).then(function (j) {
      if (!j) return;
      if (!j.configured) { S.status = 'unconfigured'; return; }
      S.owner = String(j.owner || ''); S.cap = Number(j.cap) || 3;
      S.rowsAll = parse(j.rows || []); S.rows = hideMe(S.rowsAll); S.fetchedAt = Date.now();
      S.status = S.rowsAll.length ? 'ready' : 'empty';
    }).catch(function () { S.status = 'error'; }).then(loadUsage).then(function () { S.busy = false; $('br-refresh').removeAttribute('aria-busy'); render(); });
  }
  $('br-refresh').innerHTML = icon('arrow-clockwise');
  ROOT.querySelectorAll('.ul-tab[data-period]').forEach(function (b) { b.addEventListener('click', function () { S.period = b.getAttribute('data-period'); render(); }); });
  $('br-refresh').addEventListener('click', load);
  setInterval(updated, 10000);
  api.start = function () { render(); load(); };
  api.refilter = function () { S.rows = hideMe(S.rowsAll || []); render(); };
  api.owner = function () { return S.owner; };
  api.rows = function () { return S.rowsAll || []; };
})();
    return api;
  };
})();
