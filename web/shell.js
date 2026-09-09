/* ============================================================================
   shell.js — injects the topbar and sidebar into whatever page loads it.

   Written this way so the GENERATED sheets (changelog, install, review sheet,
   catalogue) can wear the chrome without their generators having to know how
   the chrome is built. A sheet adds two tags and nothing else changes:

     <link rel="stylesheet" href="/shell.css">
     <script src="/shell.js" defer></script>

   What it does, in order:
     1. moves the page's existing body children into <main class="gw-main">
     2. prepends the topbar and sidebar
     3. marks the active nav item from location.pathname
     4. asks /api/auth/me who is signed in, and re-renders the gated bits
     5. wires the theme toggle and the login modal

   The theme itself is set by a tiny blocking snippet in each page's <head>
   (see PAGE_THEME_SNIPPET at the bottom of this file) so there is no flash.
   ========================================================================= */
(function () {
  'use strict';

  /* -- icons -------------------------------------------------------------
     Phosphor, at the weights measured in Figma: nav icons Regular 16,
     MagnifyingGlass / SunDim / Moon / LockSimple Bold. All 0 0 256 256.  */
  var ICON = {
    'check-circle':        'M173.66,98.34a8,8,0,0,1,0,11.32l-56,56a8,8,0,0,1-11.32,0l-24-24a8,8,0,0,1,11.32-11.32L112,148.69l50.34-50.35A8,8,0,0,1,173.66,98.34ZM232,128A104,104,0,1,1,128,24,104.11,104.11,0,0,1,232,128Zm-16,0a88,88,0,1,0-88,88A88.1,88.1,0,0,0,216,128Z',
    'swatches':            'M88,180a12,12,0,1,1-12-12A12,12,0,0,1,88,180Zm152-23.81V208a16,16,0,0,1-16,16H76a46.36,46.36,0,0,1-7.94-.68,44,44,0,0,1-35.43-50.95l25-143.13a15.94,15.94,0,0,1,18.47-13L130.84,26a16,16,0,0,1,12.92,18.52l-12.08,69L199.49,89a16,16,0,0,1,20.45,9.52L239,150.69A18.35,18.35,0,0,1,240,156.19ZM103,184.87,128,41.74,73.46,32l-25,143.1A28,28,0,0,0,70.9,207.57,27.29,27.29,0,0,0,91.46,203,27.84,27.84,0,0,0,103,184.87ZM116.78,195,224,156.11,204.92,104,128.5,131.7l-9.78,55.92A44.63,44.63,0,0,1,116.78,195ZM224,173.12,127.74,208H224Z',
    'download-simple':     'M224,144v64a8,8,0,0,1-8,8H40a8,8,0,0,1-8-8V144a8,8,0,0,1,16,0v56H208V144a8,8,0,0,1,16,0Zm-101.66,5.66a8,8,0,0,0,11.32,0l40-40a8,8,0,0,0-11.32-11.32L136,124.69V32a8,8,0,0,0-16,0v92.69L93.66,98.34a8,8,0,0,0-11.32,11.32Z',
    'sparkle':             'M197.58,129.06,146,110l-19-51.62a15.92,15.92,0,0,0-29.88,0L78,110l-51.62,19a15.92,15.92,0,0,0,0,29.88L78,178l19,51.62a15.92,15.92,0,0,0,29.88,0L146,178l51.62-19a15.92,15.92,0,0,0,0-29.88ZM137,164.22a8,8,0,0,0-4.74,4.74L112,223.85,91.78,169A8,8,0,0,0,87,164.22L32.15,144,87,123.78A8,8,0,0,0,91.78,119L112,64.15,132.22,119a8,8,0,0,0,4.74,4.74L191.85,144ZM144,40a8,8,0,0,1,8-8h16V16a8,8,0,0,1,16,0V32h16a8,8,0,0,1,0,16H184V64a8,8,0,0,1-16,0V48H152A8,8,0,0,1,144,40ZM248,88a8,8,0,0,1-8,8h-8v8a8,8,0,0,1-16,0V96h-8a8,8,0,0,1,0-16h8V72a8,8,0,0,1,16,0v8h8A8,8,0,0,1,248,88Z',
    'toolbox':             'M224,64H176V56a24,24,0,0,0-24-24H104A24,24,0,0,0,80,56v8H32A16,16,0,0,0,16,80V192a16,16,0,0,0,16,16H224a16,16,0,0,0,16-16V80A16,16,0,0,0,224,64ZM96,56a8,8,0,0,1,8-8h48a8,8,0,0,1,8,8v8H96ZM224,80v32H192v-8a8,8,0,0,0-16,0v8H80v-8a8,8,0,0,0-16,0v8H32V80Zm0,112H32V128H64v8a8,8,0,0,0,16,0v-8h96v8a8,8,0,0,0,16,0v-8h32v64Z',
    'stack-overflow-logo': 'M216,152.09V216a8,8,0,0,1-8,8H48a8,8,0,0,1-8-8V152.09a8,8,0,0,1,16,0V208H200V152.09a8,8,0,0,1,16,0Zm-128,32h80a8,8,0,1,0,0-16H88a8,8,0,1,0,0,16Zm4.88-53,77.27,20.68a7.89,7.89,0,0,0,2.08.28,8,8,0,0,0,2.07-15.71L97,115.61A8,8,0,1,0,92.88,131Zm18.45-49.93,69.28,40a8,8,0,0,0,10.93-2.93,8,8,0,0,0-2.93-10.91L119.33,67.27a8,8,0,1,0-8,13.84Zm87.33,13A8,8,0,1,0,210,82.84l-56.57-56.5a8,8,0,0,0-11.32,11.3Z',
    'checks':              'M149.61,85.71l-89.6,88a8,8,0,0,1-11.22,0L10.39,136a8,8,0,1,1,11.22-11.41L54.4,156.79l84-82.5a8,8,0,1,1,11.22,11.42Zm96.1-11.32a8,8,0,0,0-11.32-.1l-84,82.5-18.83-18.5a8,8,0,0,0-11.21,11.42l24.43,24a8,8,0,0,0,11.22,0l89.6-88A8,8,0,0,0,245.71,74.39Z',
    'squares-four':        'M104,40H56A16,16,0,0,0,40,56v48a16,16,0,0,0,16,16h48a16,16,0,0,0,16-16V56A16,16,0,0,0,104,40Zm0,64H56V56h48v48Zm96-64H152a16,16,0,0,0-16,16v48a16,16,0,0,0,16,16h48a16,16,0,0,0,16-16V56A16,16,0,0,0,200,40Zm0,64H152V56h48v48Zm-96,32H56a16,16,0,0,0-16,16v48a16,16,0,0,0,16,16h48a16,16,0,0,0,16-16V152A16,16,0,0,0,104,136Zm0,64H56V152h48v48Zm96-64H152a16,16,0,0,0-16,16v48a16,16,0,0,0,16,16h48a16,16,0,0,0,16-16V152A16,16,0,0,0,200,136Zm0,64H152V152h48v48Z',
    'magnifying-glass':    'M232.49,215.51,185,168a92.12,92.12,0,1,0-17,17l47.53,47.54a12,12,0,0,0,17-17ZM44,112a68,68,0,1,1,68,68A68.07,68.07,0,0,1,44,112Z',
    'sun-dim':             'M116,36V32a12,12,0,0,1,24,0v4a12,12,0,0,1-24,0Zm80,92a68,68,0,1,1-68-68A68.07,68.07,0,0,1,196,128Zm-24,0a44,44,0,1,0-44,44A44.05,44.05,0,0,0,172,128ZM51.51,68.49a12,12,0,1,0,17-17l-4-4a12,12,0,0,0-17,17Zm0,119-4,4a12,12,0,0,0,17,17l4-4a12,12,0,1,0-17-17ZM196,72a12,12,0,0,0,8.49-3.51l4-4a12,12,0,0,0-17-17l-4,4A12,12,0,0,0,196,72Zm8.49,115.51a12,12,0,0,0-17,17l4,4a12,12,0,0,0,17-17ZM48,128a12,12,0,0,0-12-12H32a12,12,0,0,0,0,24h4A12,12,0,0,0,48,128Zm80,80a12,12,0,0,0-12,12v4a12,12,0,0,0,24,0v-4A12,12,0,0,0,128,208Zm96-92h-4a12,12,0,0,0,0,24h4a12,12,0,0,0,0-24Z',
    'moon':                'M236.37,139.4a12,12,0,0,0-12-3A84.07,84.07,0,0,1,119.6,31.59a12,12,0,0,0-15-15A108.86,108.86,0,0,0,49.69,55.07,108,108,0,0,0,136,228a107.09,107.09,0,0,0,64.93-21.69,108.86,108.86,0,0,0,38.44-54.94A12,12,0,0,0,236.37,139.4Zm-49.88,47.74A84,84,0,0,1,68.86,69.51,84.93,84.93,0,0,1,92.27,48.29Q92,52.13,92,56A108.12,108.12,0,0,0,200,164q3.87,0,7.71-.27A84.79,84.79,0,0,1,186.49,187.14Z',
    'lock-simple':         'M208,76H180V56A52,52,0,0,0,76,56V76H48A20,20,0,0,0,28,96V208a20,20,0,0,0,20,20H208a20,20,0,0,0,20-20V96A20,20,0,0,0,208,76ZM100,56a28,28,0,0,1,56,0V76H100ZM204,204H52V100H204Z',
    'sign-out':            'M124,216a12,12,0,0,1-12,12H48a12,12,0,0,1-12-12V40A12,12,0,0,1,48,28h64a12,12,0,0,1,0,24H60V204h52A12,12,0,0,1,124,216Zm108.49-96.49-40-40a12,12,0,0,0-17,17L195,116H112a12,12,0,0,0,0,24h83l-19.52,19.51a12,12,0,0,0,17,17l40-40A12,12,0,0,0,232.49,119.51Z',
    'x':                   'M208.49,191.51a12,12,0,0,1-17,17L128,145,64.49,208.49a12,12,0,0,1-17-17L111,128,47.51,64.49a12,12,0,0,1,17-17L128,111l63.51-63.52a12,12,0,0,1,17,17L145,128Z',
    'list':                'M224,128a8,8,0,0,1-8,8H40a8,8,0,0,1,0-16H216A8,8,0,0,1,224,128ZM40,72H216a8,8,0,0,0,0-16H40a8,8,0,0,0,0,16ZM216,184H40a8,8,0,0,0,0,16H216a8,8,0,0,0,0-16Z'
  };

  /* The mark, from assets/logo/gushwork-symbol-white.svg */
  var MARK = '<svg viewBox="0 0 80 80" fill="none" aria-hidden="true">' +
    '<path d="M76.6088 4.56344C77.5025 2.36058 75.8495 0 73.4723 0H9.14286C4.0934 0 0 4.0934 0 9.14286V66.7778C0 72.018 5.17081 75.6829 9.9603 73.5568C40.8494 59.8449 64.3785 34.7075 76.6088 4.56344Z" fill="currentColor"/>' +
    '<path d="M32.5161 80C31.4022 80 30.9357 78.5531 31.8259 77.8835C54.9007 60.5265 71.4338 35.8047 78.7658 8.0522C78.9403 7.39154 80 7.51618 80 8.19951V70.8571C80 75.9066 75.9066 80 70.8571 80H32.5161Z" fill="currentColor"/></svg>';

  /* Google's mark, from assets/brand/google-g.svg */
  var GOOGLE_G = '<svg viewBox="0 0 17.64 18" fill="none" aria-hidden="true">' +
    '<path d="M8.99986 7.36361V10.8491H13.8435C13.6308 11.97 12.9925 12.9191 12.0353 13.5573L14.9562 15.8237C16.658 14.2528 17.6398 11.9455 17.6398 9.20461C17.6398 8.56644 17.5826 7.95274 17.4762 7.36371L8.99986 7.36361Z" fill="#4285F4"/>' +
    '<path d="M3.95601 10.713L3.29723 11.2173L0.965378 13.0336C2.44628 15.9709 5.48151 18 8.99967 18C11.4296 18 13.4669 17.1982 14.956 15.8237L12.0351 13.5573C11.2333 14.0973 10.2105 14.4246 8.99967 14.4246C6.65968 14.4246 4.67156 12.8455 3.95969 10.7182L3.95601 10.713Z" fill="#34A853"/>' +
    '<path d="M0.965384 4.96636C0.351781 6.17722 0 7.54361 0 8.99994C0 10.4563 0.351781 11.8227 0.965384 13.0335C0.965384 13.0417 3.95998 10.7099 3.95998 10.7099C3.77998 10.1699 3.67359 9.5972 3.67359 8.99985C3.67359 8.4025 3.77998 7.82981 3.95998 7.28981L0.965384 4.96636Z" fill="#FBBC05"/>' +
    '<path d="M8.99985 3.58363C10.3253 3.58363 11.5035 4.0418 12.4444 4.92545L15.0216 2.34821C13.4589 0.891874 11.4299 0 8.99985 0C5.4817 0 2.44628 2.02091 0.965378 4.96637L3.95988 7.29001C4.67166 5.16271 6.65986 3.58363 8.99985 3.58363Z" fill="#EA4335"/></svg>';

  function icon(name) {
    return '<svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="' +
      (ICON[name] || '') + '"/></svg>';
  }

  /* -- nav model ---------------------------------------------------------
     Labels, order and icons are what the Figma sidebar actually contains
     (478:14805). `tier` decides who sees the row and whether it is locked.
       public   — everyone
       internal — any signed-in @gushwork.ai account
       admin    — only the ADMIN_EMAILS allowlist                          */
  var GROUPS = [
    {
      label: 'Getting Started',
      tier: 'public',
      items: [
        { label: 'Overview',      href: '/',                       icon: 'check-circle' },
        { label: 'Style Guide',   href: '/style-guide',            icon: 'swatches' },
        { label: 'Downloads',     href: '/downloads',              icon: 'download-simple' }
      ]
    },
    {
      label: 'For internal use',
      tier: 'internal',
      items: [
        { label: 'Claude Plugin', href: '/internal/claude-plugin', icon: 'sparkle' },
        { label: 'Mini Tools',    href: '/internal/mini-tools',    icon: 'toolbox' },
        { label: 'Change Log',    href: '/internal/changelog',     icon: 'stack-overflow-logo' },
        { label: 'Staging',       href: '/internal/staging',       icon: 'squares-four' }
      ]
    }
  ];

  /* Pinned to the bottom of the rail, the way the dashboard keeps admin and
     the user card there (audit line 424). Rendered only for admins. */
  var ADMIN_GROUP = {
    label: 'Admin',
    tier: 'admin',
    items: [
      { label: 'Review Sheet', href: '/admin/review-sheet', icon: 'checks' },
      { label: 'Catalogue',    href: '/admin/catalogue',    icon: 'squares-four' }
    ]
  };

  /* `modes` says which doors are open. Until the Google OAuth client exists
     the site runs on a shared password, so the modal has to be able to render
     either form — or both, once Google is configured alongside it. */
  var session = { signedIn: false, admin: false, email: null, name: null,
                  picture: null, modes: { google: false, password: true },
                  gate: false };

  /* Mac reads ⌘K, everything else Ctrl K. navigator.platform is deprecated but is still the
     only thing that answers this everywhere; userAgentData is Chromium-only, so it is tried
     first and platform is the fallback rather than the other way round. */
  var IS_MAC = (function () {
    try {
      var p = (navigator.userAgentData && navigator.userAgentData.platform) ||
              navigator.platform || '';
      return /mac|iphone|ipad/i.test(p);
    } catch (e) { return false; }
  })();
  var SHORTCUT = IS_MAC ? '\u2318K' : 'Ctrl K';

  /* -- helpers ----------------------------------------------------------- */
  function el(html) {
    var t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  /* /internal/changelog, /internal/changelog/ and /internal/changelog.html
     are the same page as far as the rail is concerned. */
  function normalise(p) {
    p = (p || '/').replace(/\/index\.html$/, '/').replace(/\.html$/, '');
    if (p.length > 1) p = p.replace(/\/+$/, '');
    return p || '/';
  }
  function isCurrent(href) { return normalise(location.pathname) === normalise(href); }

  /* -- markup ------------------------------------------------------------ */
  function topbarHTML() {
    return '' +
      '<header class="gw-topbar">' +
        '<a class="gw-brand" href="/">' +
          '<span class="gw-brand__chip" style="color:var(--gw-color-white)">' + MARK + '</span>' +
          '<span class="gw-brand__name">Gushwork Design</span>' +
        '</a>' +
        '<div class="gw-topbar__right">' +
          /* The field is the affordance; the palette is where typing happens. Keeping the
             input non-interactive means one input to manage and one place results can be,
             and the field keeps its measured 400x36 without growing a list underneath. */
          '<div class="gw-search" data-search-open role="button" tabindex="0" ' +
               'aria-haspopup="dialog" title="Search  ⌘K">' +
            icon('magnifying-glass') +
            '<input type="search" placeholder="Search any keyword..." tabindex="-1" ' +
                   'aria-hidden="true">' +
            /* aria-hidden: the shortcut is a visual affordance, and the field already
               announces itself. A screen reader reading "Command K" here would be
               describing decoration. */
            '<span class="gw-search__key" aria-hidden="true">' + esc(SHORTCUT) + '</span>' +
          '</div>' +
          /* Phone: the 400px field does not fit at 375, so search collapses to the icon
             the field already leads with. Same [data-search-open] hook, so it opens the
             same palette — the affordance changes shape, not behaviour. Rendered at every
             width and hidden by CSS, so a resize never leaves the bar without it. */
          '<button class="gw-searchbtn" type="button" data-search-open ' +
                  'aria-haspopup="dialog" aria-label="Search">' +
            icon('magnifying-glass') +
          '</button>' +
          '<div class="gw-theme" role="group" aria-label="Colour theme">' +
            '<button class="gw-theme__btn" data-theme-set="light" type="button" ' +
                    'aria-label="Light theme">' + icon('sun-dim') + '</button>' +
            '<button class="gw-theme__btn" data-theme-set="dark" type="button" ' +
                    'aria-label="Dark theme">' + icon('moon') + '</button>' +
          '</div>' +
          /* Phone only, per the navbar's `Collapsed` variant. Hidden by CSS
             above the Phone breakpoint rather than conditionally rendered, so
             a resize never leaves the page without its only nav affordance. */
          '<button class="gw-burger" type="button" data-nav-toggle ' +
                  'aria-expanded="false" aria-controls="gw-rail" ' +
                  'aria-label="Menu">' + icon('list') + '</button>' +
        '</div>' +
      '</header>';
  }

  function itemHTML(item, tier) {
    /* No gate, no locks. Drawing a padlock on a page that opens fine is worse than drawing
       nothing: the row becomes a button that pops a sign-in modal instead of a link that
       goes where it says, so the chrome actively blocks a page the server is serving. */
    var locked = session.gate &&
                 ((tier === 'internal' && !session.signedIn) ||
                  (tier === 'admin'    && !session.admin));
    var cur = isCurrent(item.href) ? ' aria-current="page"' : '';
    var inner = icon(item.icon) +
      '<span class="gw-navitem__text">' + esc(item.label) + '</span>' +
      (locked ? '<span class="gw-lock">' + icon('lock-simple') + '</span>' : '');

    /* A locked row is a button, not a link — it opens the modal instead of
       walking into a redirect. */
    return locked
      ? '<button class="gw-navitem" type="button" data-locked="' + esc(item.href) + '"' + cur + '>' + inner + '</button>'
      : '<a class="gw-navitem" href="' + esc(item.href) + '"' + cur + '>' + inner + '</a>';
  }

  function groupHTML(g) {
    return '<nav class="gw-navgroup" aria-label="' + esc(g.label) + '">' +
      '<div class="gw-navlabel">' + esc(g.label) + '</div>' +
      g.items.map(function (i) { return itemHTML(i, g.tier); }).join('') +
      '</nav>';
  }

  function footerHTML() {
    /* Nothing to sign in to while the gate is off. */
    if (!session.gate && !session.signedIn) return '';
    if (!session.signedIn) {
      return '<button class="gw-signin" type="button" data-open-modal>' +
        GOOGLE_G + '<span>Sign in</span></button>';
    }
    var initial = (session.name || session.email || '?').trim().charAt(0).toUpperCase();
    var avatar = session.picture
      ? '<img src="' + esc(session.picture) + '" alt="" referrerpolicy="no-referrer">'
      : esc(initial);
    return '<div class="gw-user">' +
        '<span class="gw-user__av">' + avatar + '</span>' +
        '<span class="gw-user__txt">' +
          '<span class="gw-user__name">' + esc(session.name || session.email) + '</span>' +
          '<span class="gw-user__role">' + (session.admin ? 'Admin' : 'Gushwork') + '</span>' +
        '</span>' +
        '<button class="gw-user__out" type="button" data-signout aria-label="Sign out">' +
          icon('sign-out') + '</button>' +
      '</div>';
  }

  function sidebarHTML() {
    var groups = GROUPS.map(groupHTML).join('');
    var end = (session.admin ? '<div class="gw-navgroups">' + groupHTML(ADMIN_GROUP) + '</div>' : '') +
              footerHTML();
    return '<aside class="gw-sidebar" id="gw-rail">' +
        '<div class="gw-navgroups">' + groups + '</div>' +
        '<div class="gw-navend">' + end + '</div>' +
      '</aside>';
  }

  function modalHTML() {
    var m = session.modes || {};
    var body = '';

    if (m.google) {
      body += '<a class="gw-modal__btn" data-google-btn href="/api/auth/login">' +
        GOOGLE_G + '<span>Continue with Google</span></a>';
    }
    if (m.google && m.password) {
      body += '<div class="gw-modal__or"><span>or</span></div>';
    }
    if (m.password) {
      body += '<form class="gw-modal__form" data-pw-form>' +
        '<label class="gw-modal__label" for="gw-pw">Team password</label>' +
        '<input class="gw-modal__input" id="gw-pw" name="password" type="password" ' +
               'autocomplete="current-password" required ' +
               'placeholder="Enter the team password">' +
        '<p class="gw-modal__err" data-pw-err hidden role="alert"></p>' +
        '<button class="gw-modal__btn gw-modal__btn--primary" type="submit">' +
          '<span>Continue</span></button>' +
      '</form>';
    }

    var note = m.google
      ? 'You need a @gushwork.ai account.'
      : 'Google sign-in is not switched on yet, so the team password is the way in ' +
        'for now.';

    return '<div class="gw-modal" hidden role="dialog" aria-modal="true" ' +
                'aria-labelledby="gw-modal-title">' +
        '<div class="gw-modal__box">' +
          '<button class="gw-modal__x" type="button" data-close-modal aria-label="Close">' +
            icon('x') + '</button>' +
          '<span class="gw-modal__chip" style="color:var(--gw-color-white)">' + MARK + '</span>' +
          '<h2 class="gw-modal__title" id="gw-modal-title">Sign in to continue</h2>' +
          '<p class="gw-modal__sub">This part of the design system is for the Gushwork ' +
             'team.</p>' +
          body +
          '<p class="gw-modal__note">' + note + '</p>' +
        '</div>' +
      '</div>';
  }

  /* Where to land after a successful password sign-in. */
  var pendingNext = '/';

  function submitPassword(form) {
    var input = form.querySelector('input[name="password"]');
    var err = form.querySelector('[data-pw-err]');
    var btn = form.querySelector('button[type="submit"]');
    err.hidden = true;
    btn.disabled = true;

    fetch('/api/auth/password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ password: input.value, next: pendingNext })
    })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (res) {
        btn.disabled = false;
        if (res.ok && res.j.ok) { location.href = res.j.next || pendingNext; return; }
        err.textContent = (res.j && res.j.error) || 'That did not work.';
        err.hidden = false;
        input.select();
      })
      .catch(function () {
        btn.disabled = false;
        err.textContent = 'Could not reach the server.';
        err.hidden = false;
      });
  }

  /* -- theme ---------------------------------------------------------------
     Modelled on the postmortem artifact. The important part is what it does
     NOT do: with no stored preference it writes no attribute at all, leaving
     the CSS `prefers-color-scheme` block to decide. Writing data-theme on
     every load — which this used to do — pins the page to whatever the OS said
     at first paint and makes it deaf to a live OS change.

     Every [data-theme-set] is kept in sync, not just the one that was clicked,
     because the toggle is duplicated for the phone dock: CSS cannot move a
     node between parents, so there are two of them and both must agree. */
  var MQ = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

  function storedTheme() {
    try { return localStorage.getItem('gw-theme'); } catch (e) { return null; }
  }
  function effectiveTheme() {
    return storedTheme() || (MQ && MQ.matches ? 'dark' : 'light');
  }
  function syncThemeControls(t) {
    var c = document.querySelectorAll('[data-theme-set]');
    for (var i = 0; i < c.length; i++) {
      var on = c[i].getAttribute('data-theme-set') === t;
      c[i].classList.toggle('is-on', on);
      c[i].setAttribute('aria-pressed', on ? 'true' : 'false');
    }
  }
  function applyTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    try { localStorage.setItem('gw-theme', t); } catch (e) {}
    syncThemeControls(t);
  }
  function initTheme() {
    var s = storedTheme();
    if (s) applyTheme(s); else syncThemeControls(effectiveTheme());
    /* Follow the OS for as long as the user has expressed no preference. */
    if (MQ && MQ.addEventListener) {
      MQ.addEventListener('change', function () {
        if (!storedTheme()) syncThemeControls(effectiveTheme());
      });
    }
  }

  /* -- modal -------------------------------------------------------------- */
  var lastFocus = null;
  function openModal(next) {
    var m = document.querySelector('.gw-modal');
    if (!m) return;
    pendingNext = next || location.pathname;
    var btn = m.querySelector('[data-google-btn]');
    if (btn) {
      btn.setAttribute('href', '/api/auth/login?next=' + encodeURIComponent(pendingNext));
    }
    lastFocus = document.activeElement;
    m.hidden = false;
    /* Focus the password field when that is the only way in, otherwise the
       Google button. */
    var pw = m.querySelector('input[name="password"]');
    if (btn) btn.focus(); else if (pw) pw.focus();
  }
  function closeModal() {
    var m = document.querySelector('.gw-modal');
    if (!m) return;
    m.hidden = true;
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  /* -- phone drawer --------------------------------------------------------
     The navbar's Phone variants are `Collapsed` (logo + hamburger) and `Menu`
     (a full-screen overlay). The rail is that overlay here. */
  function setNav(open) {
    document.documentElement.classList.toggle('gw-nav-open', open);
    var b = document.querySelector('[data-nav-toggle]');
    if (b) {
      b.setAttribute('aria-expanded', open ? 'true' : 'false');
      b.setAttribute('aria-label', open ? 'Close menu' : 'Menu');
      b.innerHTML = icon(open ? 'x' : 'list');
    }
  }
  function toggleNav() {
    setNav(!document.documentElement.classList.contains('gw-nav-open'));
  }

  /* -- scale to fit --------------------------------------------------------
     exports/dashboard/build-rules.md: "1440 is the minimum width. Below it,
     SCALE the canvas." Reflow is a rejected attempt there, so nothing here
     rearranges — the 1440 layout is held and shrunk to fit.

     min(1, ...) because the rule says it never scales UP: on a 2560 display
     the canvas stays 1440 and the surface shows through.

     The `|| DESIGN_W` guard is from the same rule. A tab that has not been
     laid out yet reports innerWidth as 0, which makes the factor 0 and
     collapses the page to nothing — it renders blank rather than broken,
     which is easy to misread as a build failure. */
  var DESIGN_W = 1440;
  /* The Breakpoint collection's own Phone threshold — tokens.css already swaps
     the whole --gw-bp-* set at this width. Below it the page REFLOWS to the
     phone token set instead of scaling, so the factor has to go neutral or the
     reflowed layout would be shrunk on top of reflowing. */
  var PHONE_MAX = 767;
  function fit() {
    var w = window.innerWidth || DESIGN_W;
    var f = w <= PHONE_MAX ? 1 : Math.min(1, w / DESIGN_W);
    document.documentElement.style.setProperty('--gw-fit', String(f));
    document.documentElement.classList.toggle('gw-phone', w <= PHONE_MAX);
  }

  /* -- build -------------------------------------------------------------- */
  function renderSidebar() {
    var old = document.querySelector('.gw-sidebar');
    var next = el(sidebarHTML());
    if (old) old.replaceWith(next); else document.body.insertBefore(next, document.body.firstChild);
  }

  /* The modal is built before /api/auth/me answers, so which doors it offers
     is a guess until then. Rebuild it once we know — but never while it is
     open, or the field the user is typing into disappears. */
  function renderModal() {
    var old = document.querySelector('.gw-modal');
    if (old && !old.hidden) return;
    var next = el(modalHTML());
    if (old) old.replaceWith(next); else document.body.appendChild(next);
  }

  /* -- search palette ------------------------------------------------------
     The index is fetched once, on first open, and only then: it is 36KB and most
     visits never search. Every failure path leaves the palette usable and silent —
     a search box that cannot reach its index says so rather than hanging. */
  var palIndex = null, palState = { rows: [], sel: 0, loading: false };

  function palHTML() {
    return '<div class="gw-pal" data-open="false" role="dialog" aria-modal="true" ' +
                'aria-label="Search">' +
      '<div class="gw-pal__scrim" data-pal-close></div>' +
      '<div class="gw-pal__box">' +
        '<div class="gw-pal__top">' + icon('magnifying-glass') +
          '<input type="search" placeholder="Search the design system\u2026" ' +
                 'aria-label="Search" autocomplete="off" spellcheck="false">' +
          /* Phone only. Desktop closes with esc and the footer says so; on a phone the
             footer is hidden and the scrim narrows to a 40px strip with a full result
             list — under the 44 the system asks of a hit target, and unlabelled. */
          '<button class="gw-pal__x" type="button" data-pal-close aria-label="Close search">' +
            icon('x') +
          '</button>' +
        '</div>' +
        '<div class="gw-pal__list" role="listbox"></div>' +
        '<div class="gw-pal__foot">' +
          '<span><b>\u2191</b><b>\u2193</b> Select</span>' +
          '<span><b>\u21a9</b> Open</span>' +
          '<span><b>esc</b> Close</span>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  function palOpen(open) {
    var pal = document.querySelector('.gw-pal');
    if (!pal) return;
    pal.setAttribute('data-open', open ? 'true' : 'false');
    if (!open) return;
    var input = pal.querySelector('.gw-pal__top input');
    input.value = ''; palRender('');
    input.focus();
    if (!palIndex && !palState.loading) {
      palState.loading = true;
      fetch('/search-index.json')
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (j) { palIndex = j || []; palState.loading = false; palRender(input.value); })
        .catch(function () { palIndex = []; palState.loading = false; palRender(input.value); });
    }
  }

  /* EVERY term has to appear somewhere, or "dark mode" only matches that exact phrase and
     finds nothing — which is what it did. Terms are scored independently and summed, so a
     heading match still outranks a body match without needing the words adjacent. */
  function palScore(e, terms) {
    var t = e.t.toLowerCase(), s = (e.s || '').toLowerCase(), total = 0;
    for (var k = 0; k < terms.length; k++) {
      var q = terms[k], i = t.indexOf(q), n = 0;
      if (i === 0) n = 100;
      else if (i > 0) n = 70;
      else if (s.indexOf(q) >= 0) n = 30;
      if (!n) return 0;               /* a term nobody has disqualifies the entry */
      total += n;
    }
    return total;
  }

  function palMark(text, q) {
    var i = text.toLowerCase().indexOf(q);
    if (i < 0) return esc(text);
    return esc(text.slice(0, i)) + '<mark>' + esc(text.slice(i, i + q.length)) +
           '</mark>' + esc(text.slice(i + q.length));
  }

  /* Show the sentence the match is IN, not the first sentence of the section. A snippet
     that does not contain the query reads as a wrong result. */
  function palSnippet(e, q) {
    var s = e.s || '';
    var i = s.toLowerCase().indexOf(q);
    if (i < 0) return esc(e.p);
    var from = Math.max(0, i - 40);
    return esc(e.p) + ' \u203a \u2026' + palMark(s.slice(from, from + 110), q) + '\u2026';
  }

  function palRender(qRaw) {
    var pal = document.querySelector('.gw-pal');
    var list = pal.querySelector('.gw-pal__list');
    var q = (qRaw || '').trim().toLowerCase();

    if (!q) {
      palState.rows = [];
      list.innerHTML = '<div class="gw-pal__empty">' +
        (palState.loading ? 'Loading\u2026' : 'Type to search pages, sections and releases.') +
        '</div>';
      return;
    }
    var terms = q.split(/\s+/).filter(Boolean);
    var hits = (palIndex || []).map(function (e) { return { e: e, n: palScore(e, terms) }; })
      .filter(function (x) { return x.n > 0; })
      .sort(function (a, b) { return b.n - a.n; })
      .slice(0, 12);

    palState.rows = hits.map(function (x) { return x.e; });
    palState.sel = 0;
    if (!hits.length) {
      list.innerHTML = '<div class="gw-pal__empty">No matches for \u201c' + esc(qRaw) + '\u201d</div>';
      return;
    }
    list.innerHTML = hits.map(function (x, i) {
      var e = x.e, tl = e.t.toLowerCase(), sl = (e.s || '').toLowerCase();
      /* mark whichever term this row actually matched on, per field */
      var inT = terms.filter(function (w) { return tl.indexOf(w) >= 0; })[0] || terms[0];
      var inS = terms.filter(function (w) { return sl.indexOf(w) >= 0; })[0] || terms[0];
      return '<a class="gw-pal__row" role="option" aria-selected="' + (i === 0) + '" ' +
                'href="' + esc(e.u + (e.a || '')) + '">' +
        '<span class="gw-pal__hash">#</span>' +
        '<span><span class="gw-pal__t">' + palMark(e.t, inT) + '</span>' +
        '<span class="gw-pal__crumb">' + palSnippet(e, inS) + '</span></span>' +
      '</a>';
    }).join('');
  }

  function palMove(d) {
    var pal = document.querySelector('.gw-pal');
    var rows = pal.querySelectorAll('.gw-pal__row');
    if (!rows.length) return;
    palState.sel = (palState.sel + d + rows.length) % rows.length;
    rows.forEach(function (r, i) { r.setAttribute('aria-selected', i === palState.sel); });
    rows[palState.sel].scrollIntoView({ block: 'nearest' });
  }

  function palWire() {
    document.body.appendChild(el(palHTML()));
    var pal = document.querySelector('.gw-pal');
    var input = pal.querySelector('.gw-pal__top input');

    input.addEventListener('input', function () { palRender(input.value); });
    pal.addEventListener('click', function (ev) {
      if (ev.target.closest('[data-pal-close]')) palOpen(false);
    });
    document.addEventListener('click', function (ev) {
      if (ev.target.closest('[data-search-open]')) { ev.preventDefault(); palOpen(true); }
    });
    document.addEventListener('keydown', function (ev) {
      var open = pal.getAttribute('data-open') === 'true';
      if ((ev.metaKey || ev.ctrlKey) && ev.key.toLowerCase() === 'k') {
        ev.preventDefault(); palOpen(!open); return;
      }
      if (!open) {
        /* The field is a button, so it has to answer to the keyboard like one. */
        if ((ev.key === 'Enter' || ev.key === ' ') &&
            document.activeElement && document.activeElement.closest('[data-search-open]')) {
          ev.preventDefault(); palOpen(true);
        }
        return;
      }
      if (ev.key === 'Escape') { ev.preventDefault(); palOpen(false); }
      else if (ev.key === 'ArrowDown') { ev.preventDefault(); palMove(1); }
      else if (ev.key === 'ArrowUp') { ev.preventDefault(); palMove(-1); }
      else if (ev.key === 'Enter') {
        var row = pal.querySelectorAll('.gw-pal__row')[palState.sel];
        if (row) { ev.preventDefault(); row.click(); }
      }
    });
  }

  function mount() {
    document.documentElement.classList.add('gw-shell-ready');

    /* Move whatever the page already had into <main>, so the sheets keep
       their own layout and only gain a margin. */
    var main = document.createElement('main');
    main.className = 'gw-main';
    while (document.body.firstChild) main.appendChild(document.body.firstChild);
    document.body.appendChild(main);

    /* One wrapper around the whole canvas, so the scale-to-fit ruling has
       something to zoom. The modal stays OUTSIDE it — an overlay should cover
       the real viewport, not a scaled copy of it. */
    var shell = document.createElement('div');
    shell.className = 'gw-shell';
    document.body.insertBefore(shell, main);
    shell.appendChild(el(topbarHTML()));
    shell.appendChild(el(sidebarHTML()));
    shell.appendChild(main);
    /* The phone dock. The artifact notes why this is a duplicate rather than a
       move: "CSS cannot move a node between parents — the theme JS already
       keeps every [data-theme-set] in sync." Hidden above the phone
       breakpoint; the topbar copy is hidden below it. */
    shell.appendChild(el(
      '<div class="gw-phone-dock">' +
        '<div class="gw-theme" role="group" aria-label="Colour theme">' +
          '<button class="gw-theme__btn" data-theme-set="light" type="button" ' +
                  'aria-label="Light theme">' + icon('sun-dim') + '</button>' +
          '<button class="gw-theme__btn" data-theme-set="dark" type="button" ' +
                  'aria-label="Dark theme">' + icon('moon') + '</button>' +
        '</div>' +
      '</div>'));
    document.body.appendChild(el(modalHTML()));

    initTheme();
    fit();

    /* One delegated listener for everything the chrome does. */
    document.addEventListener('click', function (ev) {
      var t = ev.target.closest ? ev.target.closest(
        '[data-theme-set],[data-locked],[data-open-modal],[data-close-modal],[data-signout],' +
        '[data-nav-toggle],.gw-navitem') : null;
      if (!t) {
        /* click on the backdrop closes */
        if (ev.target.classList && ev.target.classList.contains('gw-modal')) closeModal();
        return;
      }
      if (t.hasAttribute('data-nav-toggle')) { toggleNav(); return; }
      if (t.hasAttribute('data-theme-set')) { applyTheme(t.getAttribute('data-theme-set')); return; }
      if (t.hasAttribute('data-locked'))    { ev.preventDefault(); openModal(t.getAttribute('data-locked')); return; }
      if (t.hasAttribute('data-open-modal')){ ev.preventDefault(); openModal(location.pathname); return; }
      if (t.hasAttribute('data-close-modal')){ closeModal(); return; }
      if (t.classList && t.classList.contains('gw-navitem')) { setNav(false); }
      if (t.hasAttribute('data-signout')) {
        ev.preventDefault();
        location.href = '/api/auth/logout?next=' + encodeURIComponent('/');
      }
    });

    document.addEventListener('submit', function (ev) {
      if (ev.target && ev.target.hasAttribute && ev.target.hasAttribute('data-pw-form')) {
        ev.preventDefault();
        submitPassword(ev.target);
      }
    });

    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape') { closeModal(); setNav(false); }
    });

    /* ResizeObserver, not just the resize event. The event does not reliably
       fire for every way a viewport can change — device emulation and some
       embedded panes reconfigure the viewport without one, which left the
       factor stale at a width it had passed through rather than the one it
       landed on. The observer watches the element itself, so it cannot miss. */
    var fitTick = false;
    function scheduleFit() {
      if (fitTick) return;
      fitTick = true;
      requestAnimationFrame(function () {
        fitTick = false;
        fit();
        /* Growing past the phone breakpoint with the drawer open would leave
           the rail stuck in its overlay state on a desktop layout. */
        if (window.innerWidth > PHONE_MAX) setNav(false);
      });
    }
    if (window.ResizeObserver) {
      new ResizeObserver(scheduleFit).observe(document.documentElement);
    }
    window.addEventListener('resize', scheduleFit, { passive: true });

    /* Who is signed in? On a local static preview there is no API, so this
       fails and the page stays in its signed-out state, which is correct. */
    fetch('/api/auth/me', { credentials: 'same-origin' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (s) {
        if (!s) return;
        session = s;
        /* Redraw both: the sidebar for the locks and the ADMIN group, the
           modal because only now do we know which doors are open. */
        renderSidebar();
        renderModal();
      })
      .catch(function () { /* no API — stay signed out, password form shown */ });

    /* Arriving back from a gated route with ?signin=required pops the modal. */
    if (/[?&]signin=required/.test(location.search)) {
      var params = new URLSearchParams(location.search);
      openModal(params.get('next') || '/');
    }

    palWire();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();

/* PAGE_THEME_SNIPPET — put this in every page's <head>, before the
   stylesheets, so the theme is set before first paint. Defaults to light,
   not the OS preference — see scripts/_add_shell.py's THEME_SNIPPET for why:

   <script>try{var t=localStorage.getItem('gw-theme')||'light';document.documentElement.setAttribute('data-theme',t)}catch(e){}</script>
*/
