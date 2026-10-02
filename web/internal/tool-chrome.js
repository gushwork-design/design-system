/* ============================================================================
   tool-chrome.js — the two controls the design hub keeps in the top-right of
   its bar, worn by every internal tool: Appearance and Help.

   Same placement, same glyphs, same menus as /shell.js (themeHTML + helpHTML).
   It is a small copy rather than an import because shell.js builds the whole
   hub frame (sidebar, search, palette) and the tools are full-bleed.

   Appearance writes the hub's own two keys, so the choice follows you between
   the hub and the tools:  gw-theme (resolved)  and  gw-theme-pref (chosen).
   ========================================================================= */
(function () {
  var ICON = {
    'desktop': 'M208,40H48A24,24,0,0,0,24,64V176a24,24,0,0,0,24,24h72v16H96a8,8,0,0,0,0,16h64a8,8,0,0,0,0-16H136V200h72a24,24,0,0,0,24-24V64A24,24,0,0,0,208,40ZM48,56H208a8,8,0,0,1,8,8v80H40V64A8,8,0,0,1,48,56ZM208,184H48a8,8,0,0,1-8-8V160H216v16A8,8,0,0,1,208,184Z',
    'sun-dim': 'M116,36V32a12,12,0,0,1,24,0v4a12,12,0,0,1-24,0Zm80,92a68,68,0,1,1-68-68A68.07,68.07,0,0,1,196,128Zm-24,0a44,44,0,1,0-44,44A44.05,44.05,0,0,0,172,128ZM51.51,68.49a12,12,0,1,0,17-17l-4-4a12,12,0,0,0-17,17Zm0,119-4,4a12,12,0,0,0,17,17l4-4a12,12,0,1,0-17-17ZM196,72a12,12,0,0,0,8.49-3.51l4-4a12,12,0,0,0-17-17l-4,4A12,12,0,0,0,196,72Zm8.49,115.51a12,12,0,0,0-17,17l4,4a12,12,0,0,0,17-17ZM48,128a12,12,0,0,0-12-12H32a12,12,0,0,0,0,24h4A12,12,0,0,0,48,128Zm80,80a12,12,0,0,0-12,12v4a12,12,0,0,0,24,0v-4A12,12,0,0,0,128,208Zm96-92h-4a12,12,0,0,0,0,24h4a12,12,0,0,0,0-24Z',
    'moon': 'M236.37,139.4a12,12,0,0,0-12-3A84.07,84.07,0,0,1,119.6,31.59a12,12,0,0,0-15-15A108.86,108.86,0,0,0,49.69,55.07,108,108,0,0,0,136,228a107.09,107.09,0,0,0,64.93-21.69,108.86,108.86,0,0,0,38.44-54.94A12,12,0,0,0,236.37,139.4Zm-49.88,47.74A84,84,0,0,1,68.86,69.51,84.93,84.93,0,0,1,92.27,48.29Q92,52.13,92,56A108.12,108.12,0,0,0,200,164q3.87,0,7.71-.27A84.79,84.79,0,0,1,186.49,187.14Z',
    'question': 'M140,180a12,12,0,1,1-12-12A12,12,0,0,1,140,180ZM128,72c-22.06,0-40,16.15-40,36v4a8,8,0,0,0,16,0v-4c0-11,10.77-20,24-20s24,9,24,20-10.77,20-24,20a8,8,0,0,0-8,8v8a8,8,0,0,0,16,0v-.72c18.24-3.35,32-17.9,32-35.28C168,88.15,150.06,72,128,72Zm104,56A104,104,0,1,1,128,24,104.11,104.11,0,0,1,232,128Zm-16,0a88,88,0,1,0-88,88A88.1,88.1,0,0,0,216,128Z',
    'envelope': 'M224,48H32a8,8,0,0,0-8,8V192a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A8,8,0,0,0,224,48Zm-96,85.15L52.57,64H203.43ZM98.71,128,40,181.81V74.19Zm11.84,10.85,12,11.05a8,8,0,0,0,10.82,0l12-11.05,58,53.15H52.57ZM157.29,128,216,74.18V181.82Z',
    'slack-logo': 'M221.13,128A32,32,0,0,0,184,76.31V56a32,32,0,0,0-56-21.13A32,32,0,0,0,76.31,72H56a32,32,0,0,0-21.13,56A32,32,0,0,0,72,179.69V200a32,32,0,0,0,56,21.13A32,32,0,0,0,179.69,184H200a32,32,0,0,0,21.13-56ZM72,152a16,16,0,1,1-16-16H72Zm48,48a16,16,0,0,1-32,0V152a16,16,0,0,1,16-16h16Zm0-80H56a16,16,0,0,1,0-32h48a16,16,0,0,1,16,16Zm0-48H104a16,16,0,1,1,16-16Zm16-16a16,16,0,0,1,32,0v48a16,16,0,0,1-16,16H136Zm16,160a16,16,0,0,1-16-16V184h16a16,16,0,0,1,0,32Zm48-48H152a16,16,0,0,1-16-16V136h64a16,16,0,0,1,0,32Zm0-48H184V104a16,16,0,1,1,16,16Z'
  };
  function icon(n) {
    return '<svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="' + ICON[n] + '"/></svg>';
  }

  var THEMES = [
    { id: 'light', label: 'Light', icon: 'sun-dim' },
    { id: 'dark',  label: 'Dark',  icon: 'moon' }
  ];
  var PREF_KEY = 'gw-theme-pref', RESOLVED_KEY = 'gw-theme';

  function pref() {
    try {
      var v = localStorage.getItem(PREF_KEY);
      if (v === 'light' || v === 'dark') return v;
      var old = localStorage.getItem(RESOLVED_KEY);
      if (old === 'dark' || old === 'light') return old;
    } catch (e) { /* private window */ }
    return 'light';
  }
  function apply(p) {
    document.documentElement.setAttribute('data-theme', p);
    try { localStorage.setItem(PREF_KEY, p); localStorage.setItem(RESOLVED_KEY, p); } catch (e) { /* attribute took */ }
  }

  function build() {
    var cur = pref();
    var wrap = document.createElement('div');
    wrap.className = 't-acts';
    wrap.innerHTML =
      '<div class="t-pop" data-t-pop>' +
        '<button class="t-iconbtn" type="button" data-t-trigger data-tip="Appearance" aria-haspopup="menu" aria-expanded="false" aria-label="Appearance">' + icon('desktop') + '</button>' +
        '<div class="t-menu" role="menu" hidden>' +
          THEMES.map(function (t) {
            return '<button class="t-menu__opt" type="button" role="menuitemradio" aria-checked="' + (t.id === cur) + '" data-t-theme="' + t.id + '">' +
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
      '</div>';
    document.body.appendChild(wrap);

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
        apply(opt.getAttribute('data-t-theme'));
        [].forEach.call(wrap.querySelectorAll('[data-t-theme]'), function (o) {
          o.setAttribute('aria-checked', String(o === opt));
        });
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

  window.gwSetTheme = apply;   // the email tool's sun/moon calls this so both controls stay one setting
  apply(pref());
  if (document.body) build(); else document.addEventListener('DOMContentLoaded', build);
})();
