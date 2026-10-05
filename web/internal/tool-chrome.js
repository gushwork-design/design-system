/* ============================================================================
   tool-chrome.js — the two controls the design hub keeps in the top-right of
   its bar, worn by every internal tool: Appearance and Help.

   Same placement, same glyphs, same menus as /shell.js (themeHTML + helpHTML).
   It is a small copy rather than an import because shell.js builds the whole
   hub frame (sidebar, search, palette) and the tools are full-bleed.

   Appearance is the hub's own: System, Light or Dark, stored under the hub's keys so the
   choice follows you between the hub and the tools — gw-theme-choice (what you picked,
   written only when you pick) and gw-theme (the resolved light|dark). With no choice the
   page follows the machine, and keeps following it while System is selected.
   Mirrors web/shell.js as live on 2 Oct 2026 (themeHTML / syncThemeControls / initTheme).

   THE LOGO TILE (Utsav, 5 Oct 2026). A click on the panel's logo does nothing; a right click (or
   the keyboard's context-menu key) opens a menu: Design Hub, then every tool, the current one
   checked, any this person cannot open locked and inert, then All tools. Locks come from
   /api/tools, the gate's own decide() for this viewer, so the menu and a 403 cannot disagree.
   Delegated on the document, so it works for logos React renders after this script runs.

   THE PROFILE (Utsav, 5 Oct 2026: "showing user profile is missing in the tool"). The hub's own
   profile mark, copied from /shell.js (avatarSVG, displayName): colour is the level (owner and
   admin black, team Primary/300), the 3x3 dot pattern is the person, from a hash of the address.
   It sits beside Appearance and Help; its menu carries the name, role and address, and Sign out.
   window.gwProfile lets a tool draw the same mark elsewhere (the Certificate Creator's right panel
   while its corner is clear) and open the same menu.
   ========================================================================= */
(function () {
  var ICON = {
    'desktop': 'M208,40H48A24,24,0,0,0,24,64V176a24,24,0,0,0,24,24h72v16H96a8,8,0,0,0,0,16h64a8,8,0,0,0,0-16H136V200h72a24,24,0,0,0,24-24V64A24,24,0,0,0,208,40ZM48,56H208a8,8,0,0,1,8,8v80H40V64A8,8,0,0,1,48,56ZM208,184H48a8,8,0,0,1-8-8V160H216v16A8,8,0,0,1,208,184Z',
    'sun': 'M120,40V16a8,8,0,0,1,16,0V40a8,8,0,0,1-16,0Zm72,88a64,64,0,1,1-64-64A64.07,64.07,0,0,1,192,128Zm-16,0a48,48,0,1,0-48,48A48.05,48.05,0,0,0,176,128ZM58.34,69.66A8,8,0,0,0,69.66,58.34l-16-16A8,8,0,0,0,42.34,53.66Zm0,116.68-16,16a8,8,0,0,0,11.32,11.32l16-16a8,8,0,0,0-11.32-11.32ZM192,72a8,8,0,0,0,5.66-2.34l16-16a8,8,0,0,0-11.32-11.32l-16,16A8,8,0,0,0,192,72Zm5.66,114.34a8,8,0,0,0-11.32,11.32l16,16a8,8,0,0,0,11.32-11.32ZM48,128a8,8,0,0,0-8-8H16a8,8,0,0,0,0,16H40A8,8,0,0,0,48,128Zm80,80a8,8,0,0,0-8,8v24a8,8,0,0,0,16,0V216A8,8,0,0,0,128,208Zm112-88H216a8,8,0,0,0,0,16h24a8,8,0,0,0,0-16Z',
    'moon': 'M236.37,139.4a12,12,0,0,0-12-3A84.07,84.07,0,0,1,119.6,31.59a12,12,0,0,0-15-15A108.86,108.86,0,0,0,49.69,55.07,108,108,0,0,0,136,228a107.09,107.09,0,0,0,64.93-21.69,108.86,108.86,0,0,0,38.44-54.94A12,12,0,0,0,236.37,139.4Zm-49.88,47.74A84,84,0,0,1,68.86,69.51,84.93,84.93,0,0,1,92.27,48.29Q92,52.13,92,56A108.12,108.12,0,0,0,200,164q3.87,0,7.71-.27A84.79,84.79,0,0,1,186.49,187.14Z',
    'question': 'M140,180a12,12,0,1,1-12-12A12,12,0,0,1,140,180ZM128,72c-22.06,0-40,16.15-40,36v4a8,8,0,0,0,16,0v-4c0-11,10.77-20,24-20s24,9,24,20-10.77,20-24,20a8,8,0,0,0-8,8v8a8,8,0,0,0,16,0v-.72c18.24-3.35,32-17.9,32-35.28C168,88.15,150.06,72,128,72Zm104,56A104,104,0,1,1,128,24,104.11,104.11,0,0,1,232,128Zm-16,0a88,88,0,1,0-88,88A88.1,88.1,0,0,0,216,128Z',
    'envelope': 'M224,48H32a8,8,0,0,0-8,8V192a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A8,8,0,0,0,224,48Zm-96,85.15L52.57,64H203.43ZM98.71,128,40,181.81V74.19Zm11.84,10.85,12,11.05a8,8,0,0,0,10.82,0l12-11.05,58,53.15H52.57ZM157.29,128,216,74.18V181.82Z',
    'house': 'M219.31,108.68l-80-80a16,16,0,0,0-22.62,0l-80,80A15.87,15.87,0,0,0,32,120v96a8,8,0,0,0,8,8h64a8,8,0,0,0,8-8V160h32v56a8,8,0,0,0,8,8h64a8,8,0,0,0,8-8V120A15.87,15.87,0,0,0,219.31,108.68ZM208,208H160V152a8,8,0,0,0-8-8H104a8,8,0,0,0-8,8v56H48V120l80-80,80,80Z',
    'squares': 'M104,40H56A16,16,0,0,0,40,56v48a16,16,0,0,0,16,16h48a16,16,0,0,0,16-16V56A16,16,0,0,0,104,40Zm0,64H56V56h48v48Zm96-64H152a16,16,0,0,0-16,16v48a16,16,0,0,0,16,16h48a16,16,0,0,0,16-16V56A16,16,0,0,0,200,40Zm0,64H152V56h48v48Zm-96,32H56a16,16,0,0,0-16,16v48a16,16,0,0,0,16,16h48a16,16,0,0,0,16-16V152A16,16,0,0,0,104,136Zm0,64H56V152h48v48Zm96-64H152a16,16,0,0,0-16,16v48a16,16,0,0,0,16,16h48a16,16,0,0,0,16-16V152A16,16,0,0,0,200,136Zm0,64H152V152h48v48Z',
    'lock': 'M208,80H176V56a48,48,0,0,0-96,0V80H48A16,16,0,0,0,32,96V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V96A16,16,0,0,0,208,80ZM96,56a32,32,0,0,1,64,0V80H96ZM208,208H48V96H208V208Z',
    'check': 'M229.66,77.66l-128,128a8,8,0,0,1-11.32,0l-56-56a8,8,0,0,1,11.32-11.32L96,188.69,218.34,66.34a8,8,0,0,1,11.32,11.32Z',
    'pen': 'M227.31,73.37,182.63,28.68a16,16,0,0,0-22.63,0L36.69,152A15.86,15.86,0,0,0,32,163.31V208a16,16,0,0,0,16,16H92.69A15.86,15.86,0,0,0,104,219.31L227.31,96a16,16,0,0,0,0-22.63ZM92.69,208H48V163.31l88-88L180.69,120ZM192,108.68,147.31,64l24-24L216,84.68Z',
    'id': 'M200,112a8,8,0,0,1-8,8H152a8,8,0,0,1,0-16h40A8,8,0,0,1,200,112Zm-8,24H152a8,8,0,0,0,0,16h40a8,8,0,0,0,0-16Zm40-80V200a16,16,0,0,1-16,16H40a16,16,0,0,1-16-16V56A16,16,0,0,1,40,40H216A16,16,0,0,1,232,56ZM216,200V56H40V200H216Zm-80.26-34a8,8,0,1,1-15.5,4c-2.63-10.26-13.06-18-24.25-18s-21.61,7.74-24.25,18a8,8,0,1,1-15.5-4,39.84,39.84,0,0,1,17.19-23.34,32,32,0,1,1,45.12,0A39.76,39.76,0,0,1,135.75,166ZM96,136a16,16,0,1,0-16-16A16,16,0,0,0,96,136Z',
    'certificate': 'M128,136a8,8,0,0,1-8,8H72a8,8,0,0,1,0-16h48A8,8,0,0,1,128,136Zm-8-40H72a8,8,0,0,0,0,16h48a8,8,0,0,0,0-16Zm112,65.47V224A8,8,0,0,1,220,231l-24-13.74L172,231A8,8,0,0,1,160,224V200H40a16,16,0,0,1-16-16V56A16,16,0,0,1,40,40H216a16,16,0,0,1,16,16V86.53a51.88,51.88,0,0,1,0,74.94ZM160,184V161.47A52,52,0,0,1,216,76V56H40V184Zm56-12a51.88,51.88,0,0,1-40,0v38.22l16-9.16a8,8,0,0,1,7.94,0l16,9.16Zm16-48a36,36,0,1,0-36,36A36,36,0,0,0,232,124Z',
    'sign-out': 'M120,216a8,8,0,0,1-8,8H48a8,8,0,0,1-8-8V40a8,8,0,0,1,8-8h64a8,8,0,0,1,0,16H56V208h56A8,8,0,0,1,120,216Zm109.66-93.66-40-40a8,8,0,0,0-11.32,11.32L204.69,120H112a8,8,0,0,0,0,16h92.69l-26.35,26.34a8,8,0,0,0,11.32,11.32l40-40A8,8,0,0,0,229.66,122.34Z',
    'slack-logo': 'M221.13,128A32,32,0,0,0,184,76.31V56a32,32,0,0,0-56-21.13A32,32,0,0,0,76.31,72H56a32,32,0,0,0-21.13,56A32,32,0,0,0,72,179.69V200a32,32,0,0,0,56,21.13A32,32,0,0,0,179.69,184H200a32,32,0,0,0,21.13-56ZM72,152a16,16,0,1,1-16-16H72Zm48,48a16,16,0,0,1-32,0V152a16,16,0,0,1,16-16h16Zm0-80H56a16,16,0,0,1,0-32h48a16,16,0,0,1,16,16Zm0-48H104a16,16,0,1,1,16-16Zm16-16a16,16,0,0,1,32,0v48a16,16,0,0,1-16,16H136Zm16,160a16,16,0,0,1-16-16V184h16a16,16,0,0,1,0,32Zm48-48H152a16,16,0,0,1-16-16V136h64a16,16,0,0,1,0,32Zm0-48H184V104a16,16,0,1,1,16,16Z'
  };
  function icon(n) {
    return '<svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="' + ICON[n] + '"/></svg>';
  }

  var THEMES = [
    { id: 'system', label: 'System', icon: 'desktop' },
    { id: 'light',  label: 'Light',  icon: 'sun' },
    { id: 'dark',   label: 'Dark',   icon: 'moon' }
  ];
  var CHOICE_KEY = 'gw-theme-choice', RESOLVED_KEY = 'gw-theme';

  function pref() {
    try {
      var v = localStorage.getItem(CHOICE_KEY);
      if (v === 'light' || v === 'dark' || v === 'system') return v;
    } catch (e) { /* no storage: fall through to the default */ }
    return 'system';
  }
  function machineIsDark() {
    try { return !!(window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches); } catch (e) { return false; }
  }
  function resolve(p) { return p === 'dark' ? 'dark' : p === 'light' ? 'light' : (machineIsDark() ? 'dark' : 'light'); }
  /* remember = true only when a person picks from the menu; applying the default must not write a choice. */
  function apply(p, remember) {
    var r = resolve(p);
    document.documentElement.setAttribute('data-theme', r);
    try { localStorage.setItem(RESOLVED_KEY, r); if (remember) localStorage.setItem(CHOICE_KEY, p); } catch (e) { /* attribute took */ }
  }

  var wrapRef = null;
  /* the trigger shows the ACTIVE theme's glyph, as on the hub (changed there 30 Sep 2026) */
  function sync(p) {
    if (!wrapRef) return;
    [].forEach.call(wrapRef.querySelectorAll('[data-t-theme]'), function (o) {
      var on = o.getAttribute('data-t-theme') === p;
      o.classList.toggle('is-on', on);
      o.setAttribute('aria-checked', on ? 'true' : 'false');
    });
    var chosen = THEMES.filter(function (t) { return t.id === p; })[0] || THEMES[0];
    var trig = wrapRef.querySelector('[data-t-theme-trigger]');
    if (trig) { trig.innerHTML = icon(chosen.icon); trig.setAttribute('aria-label', 'Colour theme: ' + chosen.label); }
  }
  function setTheme(p) { apply(p, true); sync(p); }

  function build() {
    var cur = pref();
    var curTheme = THEMES.filter(function (t) { return t.id === cur; })[0] || THEMES[0];
    var wrap = document.createElement('div');
    wrap.className = 't-acts';
    wrap.innerHTML =
      '<div class="t-pop" data-t-pop>' +
        '<button class="t-iconbtn" type="button" data-t-trigger data-tip="Appearance" aria-haspopup="menu" aria-expanded="false" data-t-theme-trigger aria-label="Colour theme: ' + curTheme.label + '">' + icon(curTheme.icon) + '</button>' +
        '<div class="t-menu" role="menu" hidden>' +
          THEMES.map(function (t) {
            return '<button type="button" role="menuitemradio" aria-checked="' + (t.id === cur) + '" class="t-menu__opt' + (t.id === cur ? ' is-on' : '') + '" data-t-theme="' + t.id + '">' +
                     icon(t.icon) + '<span>' + t.label + '</span></button>';
          }).join('') +
        '</div>' +
      '</div>' +
      '<div class="t-pop" data-t-pop>' +
        '<button class="t-iconbtn" type="button" data-t-trigger data-tip="Help" data-tip-end aria-haspopup="menu" aria-expanded="false" aria-label="Help">' + icon('question') + '</button>' +
        '<div class="t-menu t-menu--help" role="menu" hidden>' +
          '<a class="t-menu__row" role="menuitem" href="mailto:design@gushwork.ai">' + icon('envelope') + '<span>Send an email</span></a>' +
          '<a class="t-menu__row" role="menuitem" href="https://gushwork.slack.com/team/U06UAR183TR" target="_blank" rel="noopener">' + icon('slack-logo') + '<span>Message on Slack</span></a>' +
        '</div>' +
      '</div>' +
      '<button class="t-iconbtn t-iconbtn--prof" type="button" data-t-profile hidden aria-haspopup="menu" aria-expanded="false" data-tip-end></button>';
    document.body.appendChild(wrap);
    wrapRef = wrap;
    drawProfiles();

    function closeAll(except) {
      [].forEach.call(wrap.querySelectorAll('[data-t-pop]'), function (p) {
        if (p === except) return;
        p.querySelector('.t-menu').hidden = true;
        p.querySelector('[data-t-trigger]').setAttribute('aria-expanded', 'false');
      });
    }
    wrap.addEventListener('click', function (e) {
      var trig = e.target.closest('[data-t-trigger]');
      if (trig) {
        var pop = trig.closest('[data-t-pop]');
        var menu = pop.querySelector('.t-menu');
        var open = menu.hidden;
        closeAll(pop);
        menu.hidden = !open;
        trig.setAttribute('aria-expanded', open ? 'true' : 'false');
        return;
      }
      var opt = e.target.closest('[data-t-theme]');
      if (opt) {
        setTheme(opt.getAttribute('data-t-theme'));
        closeAll();
      }
    });
    document.addEventListener('click', function (e) { if (!wrap.contains(e.target)) closeAll(); });
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      var openTrig = wrap.querySelector('[aria-expanded="true"]');
      closeAll();
      if (openTrig) openTrig.focus();
    });
  }

  /* ── the logo tile's menu ─────────────────────────────────────────────── */
  var TOOLS = [
    { path: '/internal/email-signature',     label: 'Email signature creator',    icon: 'pen' },
    { path: '/internal/employee-id-card',    label: 'Employee ID card generator', icon: 'id' },
    { path: '/internal/certificate-creator', label: 'Certificate Creator',        icon: 'certificate' }
  ];
  var access = null;            // path -> {canOpen}, from /api/tools; null until read, {} if it failed
  function readAccess() {
    if (access) return Promise.resolve(access);
    return fetch('/api/tools', { credentials: 'same-origin' })
      .then(function (r) { return r.ok ? r.json() : {}; })
      .then(function (j) { access = (j && j.tools) || {}; return access; })
      .catch(function () { access = {}; return access; });
  }
  var here = location.pathname.replace(/\/+$/, '');
  var logoMenu = null;
  function closeLogoMenu() { if (logoMenu) { logoMenu.remove(); logoMenu = null; } }
  function logoMenuHTML(acc) {
    var rows = '<a class="t-menu__row" role="menuitem" href="/">' + icon('house') + '<span>Design Hub</span></a>' +
      '<div class="t-menu__label">Tools</div>';
    rows += TOOLS.map(function (t) {
      var a = acc[t.path];
      var locked = a && a.canOpen === false;
      var on = here === t.path || here.indexOf(t.path + '/') === 0;
      if (locked) {
        return '<span class="t-menu__row is-locked" role="menuitem" aria-disabled="true" title="Restricted. Ask an admin for access.">' +
          icon(t.icon) + '<span>' + t.label + '</span><span class="t-menu__end">' + icon('lock') + '</span></span>';
      }
      return '<a class="t-menu__row' + (on ? ' is-on' : '') + '" role="menuitem" href="' + t.path + '"' + (on ? ' aria-current="page"' : '') + '>' +
        icon(t.icon) + '<span>' + t.label + '</span>' + (on ? '<span class="t-menu__end">' + icon('check') + '</span>' : '') + '</a>';
    }).join('');
    rows += '<div class="t-menu__sep"></div><a class="t-menu__row" role="menuitem" href="/internal/tools">' + icon('squares') + '<span>All tools</span></a>';
    return rows;
  }
  function openLogoMenu(x, y) {
    closeLogoMenu();
    var m = document.createElement('div');
    m.className = 't-menu t-menu--logo';
    m.setAttribute('role', 'menu');
    m.setAttribute('aria-label', 'Design Hub and tools');
    m.innerHTML = logoMenuHTML(access || {});
    document.body.appendChild(m);
    logoMenu = m;
    var place = function () {
      var w = m.offsetWidth, h = m.offsetHeight;
      m.style.left = Math.max(8, Math.min(x, innerWidth - w - 8)) + 'px';
      m.style.top = Math.max(8, Math.min(y, innerHeight - h - 8)) + 'px';
    };
    place();
    if (!access) readAccess().then(function (acc) { if (logoMenu === m) { m.innerHTML = logoMenuHTML(acc); place(); } });
    var first = m.querySelector('a.t-menu__row');
    if (first) first.focus();
  }
  document.addEventListener('click', function (e) {
    if (e.target.closest && e.target.closest('.brand-link')) { e.preventDefault(); return; }   // the logo goes nowhere on a click
    if (logoMenu && !logoMenu.contains(e.target)) closeLogoMenu();
  }, true);
  document.addEventListener('contextmenu', function (e) {
    var logo = e.target.closest && e.target.closest('.brand-link');
    if (!logo) { closeLogoMenu(); return; }
    e.preventDefault();
    var r = logo.getBoundingClientRect();
    // a pointer opens it at the pointer; the keyboard's menu key opens it under the logo
    var x = e.clientX || r.left, y = e.clientY || r.bottom + 4;
    if (!e.clientX && !e.clientY) { x = r.left; y = r.bottom + 4; }
    openLogoMenu(x, y);
  });
  document.addEventListener('keydown', function (e) {
    if (!logoMenu) return;
    if (e.key === 'Escape') { closeLogoMenu(); return; }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      var items = [].slice.call(logoMenu.querySelectorAll('a.t-menu__row'));
      var i = items.indexOf(document.activeElement);
      var n = e.key === 'ArrowDown' ? Math.min(items.length - 1, i + 1) : Math.max(0, i - 1);
      if (items[n]) { items[n].focus(); e.preventDefault(); }
    }
  });
  addEventListener('blur', closeLogoMenu);
  addEventListener('resize', closeLogoMenu);
  readAccess();    // early, so the first right click already knows the locks

  /* ── the profile: the hub's mark, the hub's session ─────────────────────── */
  var session = null;
  var AVATAR_PATTERNS = [190, 341, 151, 403, 186, 149, 343, 189, 179, 307, 95, 159];
  var LEVELS = {
    owner: { fill: 'var(--gw-color-black)', label: 'Owner' },
    admin: { fill: 'var(--gw-color-black)', label: 'Admin' },
    team:  { fill: 'var(--gw-color-primary-300)', label: 'Gushwork team' }
  };
  function level() { return !session ? 'team' : session.owner ? 'owner' : session.admin ? 'admin' : 'team'; }
  function avatarIndex(seed) {
    var h = 2166136261, str = String(seed || '').toLowerCase();
    for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = (h + (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24)) >>> 0; }
    return h % AVATAR_PATTERNS.length;
  }
  function avatarSVG() {
    var mask = AVATAR_PATTERNS[avatarIndex(session && (session.email || session.name))];
    var dots = '';
    for (var i = 0; i < 9; i++) {
      if (!(mask >> i & 1)) continue;
      var r = Math.floor(i / 3), c = i % 3;
      dots += '<rect x="' + (11 + c * 7) + '" y="' + (11 + r * 7) + '" width="5" height="5" rx="1.5" fill="var(--gw-color-white)"/>';
    }
    return '<svg viewBox="0 0 40 40" aria-hidden="true" focusable="false"><rect width="40" height="40" rx="8" fill="' + LEVELS[level()].fill + '"/>' + dots + '</svg>';
  }
  function displayName() {
    var n = String((session && session.name) || '').trim(), e = String((session && session.email) || '').trim();
    if (n && n.indexOf('@') === -1 && n.toLowerCase() !== e.toLowerCase()) return n;
    var local = (e || n).split('@')[0];
    return local.split(/[._\-+]+/).filter(Boolean).map(function (w) { return w.charAt(0).toUpperCase() + w.slice(1); }).join(' ') || n || e;
  }
  function esc(v) { return String(v || '').replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  var profMenu = null;
  function closeProfile() { if (profMenu) { profMenu.remove(); profMenu = null; document.querySelectorAll('[data-t-profile][aria-expanded="true"]').forEach(function (b) { b.setAttribute('aria-expanded', 'false'); }); } }
  function openProfile(anchor) {
    if (profMenu) { closeProfile(); return; }
    if (!session || !session.signedIn) return;
    var m = document.createElement('div');
    m.className = 't-menu t-menu--profile';
    m.setAttribute('role', 'menu');
    m.innerHTML =
      '<div class="t-prof">' +
        '<span class="t-prof__av">' + avatarSVG() + '</span>' +
        '<span class="t-prof__txt"><span class="t-prof__name">' + esc(displayName()) + '</span>' +
        '<span class="t-prof__role">' + LEVELS[level()].label + '</span></span>' +
      '</div>' +
      (session.email ? '<div class="t-prof__mail" title="' + esc(session.email) + '">' + esc(session.email) + '</div>' : '') +
      '<div class="t-menu__sep"></div>' +
      '<a class="t-menu__row" role="menuitem" href="/api/auth/logout?next=' + encodeURIComponent('/') + '">' + icon('sign-out') + '<span>Sign out</span></a>';
    document.body.appendChild(m);
    profMenu = m;
    var r = anchor.getBoundingClientRect();
    m.style.top = (r.bottom + 8) + 'px';
    m.style.left = Math.max(8, Math.min(r.right - m.offsetWidth, innerWidth - m.offsetWidth - 8)) + 'px';
    anchor.setAttribute('aria-expanded', 'true');
  }
  /* The mark alone reads as a random icon to anyone who has not met it (Utsav, 5 Oct 2026), so the
     button carries the person's first name beside it. */
  function profileButtonHTML() {
    var first = displayName().split(' ')[0];
    return '<span class="t-prof__mini">' + avatarSVG() + '</span><span class="t-prof__label">' + esc(first) + '</span>';
  }
  function drawProfiles() {
    document.querySelectorAll('[data-t-profile]').forEach(function (b) {
      b.hidden = !(session && session.signedIn);
      b.innerHTML = profileButtonHTML();
      b.setAttribute('aria-label', 'Account: ' + displayName());
      b.removeAttribute('data-tip');   // the name is on the button now
    });
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-t-profile]');
    if (b) { e.preventDefault(); openProfile(b); return; }
    if (profMenu && !profMenu.contains(e.target)) closeProfile();
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeProfile(); });
  addEventListener('resize', closeProfile);
  fetch('/api/auth/me', { credentials: 'same-origin' })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (j) {
      session = j;
      drawProfiles();
      window.dispatchEvent(new CustomEvent('gw:session', { detail: j }));
    })
    .catch(function () { session = null; drawProfiles(); });
  window.gwProfile = {
    get session() { return session; },
    avatarSVG: function () { return avatarSVG(); },
    name: displayName,
    draw: drawProfiles,
    open: openProfile
  };

  window.gwSetTheme = setTheme;
  apply(pref(), false);
  /* While the choice is System the page follows the machine as it changes, for example at sunset. */
  try {
    var mq = matchMedia('(prefers-color-scheme: dark)');
    var follow = function () { if (pref() === 'system') apply('system', false); };
    if (mq.addEventListener) mq.addEventListener('change', follow); else if (mq.addListener) mq.addListener(follow);
  } catch (e) { /* an old browser: the theme is whatever it was at load */ }
  if (document.body) build(); else document.addEventListener('DOMContentLoaded', build);
})();
