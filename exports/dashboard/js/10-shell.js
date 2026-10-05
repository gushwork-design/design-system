/* ============================================================================
   Gushwork dashboard — 10 shell and navigation behaviour. Vanilla ES2020, no dependencies.
   Every listener is delegated on document, so it keeps working after a page swap replaces
   the slot. Exposes window.GD.shell only.

   HOOKS (data-gd-*)
     data-gd-fit-app              (automatic) .gd-app gets --gd-fit on <html>: min(1, width/1440), 1 at <=767
     data-gd-rail-toggle          button in .gd-sidebar: collapse / expand to icons. aria-expanded kept in sync.
     data-gd-persist              on .gd-sidebar: remember the collapsed state in localStorage (gd-rail)
     data-gd-nav-toggle           burger in .gd-topbar: opens / closes the phone rail (data-nav-open on .gd-app)
     data-gd-group-toggle         button with aria-controls: expands a nav-group or a sub-nav branch
     data-gd-pop                  wrapper of a trigger + menu; trigger = [data-gd-pop-trigger], menu = [data-gd-pop-menu]
     data-gd-theme="system|light|dark"   menu item of the theme-menu (R37)
     data-gd-workspace="<id>"     menu item of the workspace-switcher (data-name, data-sub, data-initials)
     data-gd-search-open          search-trigger; Cmd/Ctrl+K does the same
     data-gd-signout              account-row action
     data-gd-sticky-head          .gd-page-header--sticky: its height is written to --gd-s-head on .gd-page
     data-gd-widgets              widget-grid root. data-editing="true|false"
       data-gd-widgets-edit="start|done|cancel"   buttons
       data-gd-widget-id / data-size="s|m|l|full" on .gd-widget-grid__item
       data-gd-widget-handle | data-gd-widget-size="s|m|l|full" | data-gd-widget-remove | data-gd-widget-add="<id>"
     data-gd-explorer             explorer-layout root; panes [data-gd-pane="query|chart|results|dock"]
       data-gd-resizer="query|chart|dock" on role=separator; data-gd-explorer-collapse="query|dock" on the toggle
     data-gd-edit                 editable page-header title / description input (Enter commits, Esc reverts)

   EVENTS (bubble from the element; detail in brackets)
     gd:rail-toggle {collapsed}   gd:theme-change {pref, resolved}   gd:workspace-change {id,name}
     gd:search-open (cancelable)  gd:signout   gd:layout {widgets:[{id,size}], reason}
     gd:widget-add {id} (cancelable; if not prevented, a <template data-gd-widget-template="id"> is cloned)
     gd:split {name, value}       gd:title-change {field, value}
   ========================================================================== */
(function () {
  'use strict';
  window.GD = window.GD || {};
  var DESIGN_W = 1440, PHONE_MAX = 767;
  var doc = document, root = doc.documentElement;
  function $(s, r) { return (r || doc).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || doc).querySelectorAll(s)); }
  function emit(el, name, detail, cancelable) {
    var ev = new CustomEvent(name, { bubbles: true, cancelable: !!cancelable, detail: detail || {} });
    el.dispatchEvent(ev); return ev;
  }
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }

  /* -- scale to fit (R17): hold the 1440 layout and shrink it, 1 at phone ------------------- */
  function fit() {
    if (!$('.gd-app:not(.gd-app--embed)')) return;
    var w = window.innerWidth || DESIGN_W;
    root.style.setProperty('--gd-fit', String(w <= PHONE_MAX ? 1 : Math.min(1, w / DESIGN_W)));
    if (w > PHONE_MAX) setNav(false);
  }
  function fitValue() { return parseFloat(getComputedStyle(root).getPropertyValue('--gd-fit')) || 1; }

  /* -- theme (R37): System follows the machine, Light and Dark stick ------------------------- */
  var CHOICE = 'gw-theme-choice', RESOLVED = 'gw-theme';
  function pref() { var v = store(CHOICE); return v === 'light' || v === 'dark' ? v : 'system'; }
  function resolve(p) { return p === 'system' ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : p; }
  function applyTheme(p, remember) {
    if (p === 'system') root.removeAttribute('data-theme'); else root.setAttribute('data-theme', p);   // no attribute = the OS decides, live
    store(RESOLVED, resolve(p)); if (remember) store(CHOICE, p);
    $$('[data-gd-theme]').forEach(function (o) { var on = o.getAttribute('data-gd-theme') === p; o.setAttribute('aria-checked', String(on)); });
    $$('.gd-theme__trigger').forEach(function (t) { t.setAttribute('data-pref', p); t.setAttribute('aria-label', 'Colour theme: ' + p.charAt(0).toUpperCase() + p.slice(1)); });
  }
  function setTheme(p) { applyTheme(p, true); emit(root, 'gd:theme-change', { pref: p, resolved: resolve(p) }); }

  /* -- phone rail ---------------------------------------------------------------------------- */
  function setNav(open) {
    $$('.gd-app').forEach(function (app) {
      if ((app.getAttribute('data-nav-open') === 'true') === open) return;
      app.setAttribute('data-nav-open', String(open));
      var b = $('[data-gd-nav-toggle]', app);
      if (b) { b.setAttribute('aria-expanded', String(open)); b.setAttribute('aria-label', open ? 'Close menu' : 'Open menu'); }
      var rail = $('.gd-sidebar', app);
      if (open && rail) requestAnimationFrame(function () {          // after the rail is visible: a hidden element cannot take focus
        var f = $$('a[href], button:not([disabled])', rail).filter(function (x) { return x.offsetParent !== null; })[0]; if (f) f.focus();
      });
    });
  }

  /* -- collapsed rail ------------------------------------------------------------------------ */
  function setCollapsed(rail, c, remember) {
    rail.setAttribute('data-collapsed', String(c));
    var t = $('[data-gd-rail-toggle]', rail);
    if (t) { t.setAttribute('aria-expanded', String(!c)); t.setAttribute('aria-label', c ? 'Expand sidebar' : 'Collapse sidebar'); }
    titles(rail);
    if (remember && rail.hasAttribute('data-gd-persist')) store('gd-rail', c ? 'collapsed' : 'expanded');
    emit(rail, 'gd:rail-toggle', { collapsed: c });
  }
  /* icon-only rows lose their text, so the label moves into a Tooltip (the Feedback component), shown to the right of the
     rail on hover and keyboard focus. Not a native title: that waits a second, is unstyled and never reaches a screenshot. */
  function titles(rail) {
    var c = rail.getAttribute('data-collapsed') === 'true';
    $$('.gd-nav-item, .gd-ws__trigger, .gd-account__av, .gd-search', rail).forEach(function (el) {
      var txt = $('.gd-nav-item__text, .gd-ws__name, .gd-account__name, .gd-search__label', el.closest('.gd-account') || el);
      if (!txt) return;
      var label = txt.textContent.trim();
      if (c) { el.setAttribute('data-gd-tooltip', label); el.setAttribute('data-gd-tooltip-placement', 'right'); el.removeAttribute('title'); }
      else if (el.getAttribute('data-gd-tooltip') === label) { el.removeAttribute('data-gd-tooltip'); el.removeAttribute('data-gd-tooltip-placement'); }
    });
  }

  /* -- groups (nav-group, sub-nav) ----------------------------------------------------------- */
  function setGroup(btn, open) {
    var panel = doc.getElementById(btn.getAttribute('aria-controls'));
    btn.setAttribute('aria-expanded', String(open));
    if (panel) panel.hidden = !open;
  }
  function openCurrent() {
    $$('[aria-current="page"]').forEach(function (cur) {
      var p = cur.closest('.gd-nav-group__items, .gd-subnav__children');
      while (p) { var b = $('[aria-controls="' + p.id + '"]'); if (b) setGroup(b, true); p = p.parentElement && p.parentElement.closest('.gd-nav-group__items, .gd-subnav__children'); }
    });
  }

  /* -- popovers: theme-menu and workspace-switcher ------------------------------------------- */
  function items(menu) { return $$('[role^="menuitem"]:not([aria-disabled="true"])', menu); }
  function closePops(except) {
    $$('[data-gd-pop]').forEach(function (p) {
      if (p === except) return;
      var m = $('[data-gd-pop-menu]', p), t = $('[data-gd-pop-trigger]', p);
      if (m && !m.hidden) { m.hidden = true; if (t) t.setAttribute('aria-expanded', 'false'); }
    });
  }
  function openPop(p) {
    var m = $('[data-gd-pop-menu]', p), t = $('[data-gd-pop-trigger]', p);
    closePops(p); m.hidden = false; t.setAttribute('aria-expanded', 'true');
    var list = items(m), on = list.filter(function (i) { return i.getAttribute('aria-checked') === 'true'; })[0] || list[0];
    if (on) on.focus();
  }
  function closePop(p, refocus) {
    var m = $('[data-gd-pop-menu]', p), t = $('[data-gd-pop-trigger]', p);
    m.hidden = true; t.setAttribute('aria-expanded', 'false'); if (refocus) t.focus();
  }

  /* -- sticky stack: only the sticky page-header's height is unknown to CSS ------------------ */
  var ro = window.ResizeObserver ? new ResizeObserver(function (es) {
    es.forEach(function (e) { var pg = e.target.closest('.gd-page'); if (pg) pg.style.setProperty('--gd-s-head', e.target.offsetHeight + 'px'); });
  }) : null;
  function stack() {
    $$('.gd-page-header--sticky .gd-page-header__main').forEach(function (m) {
      if (m.__gdSeen) return; m.__gdSeen = true;
      var pg = m.closest('.gd-page'); if (pg) pg.style.setProperty('--gd-s-head', m.offsetHeight + 'px'); if (ro) ro.observe(m);
    });
  }

  /* -- widget-grid --------------------------------------------------------------------------- */
  var SIZES = ['s', 'm', 'l', 'full'], widgetState = new WeakMap();
  function wItems(g) { return $$('.gd-widget-grid__item', g); }
  function layout(g, reason) {
    emit(g, 'gd:layout', { reason: reason, widgets: wItems(g).map(function (i) { return { id: i.getAttribute('data-gd-widget-id'), size: i.getAttribute('data-size') || 'm' }; }) });
  }
  function live(g, msg) { var l = $('.gd-widget-grid__live', g); if (l) l.textContent = msg; }
  function wTitle(i) { var t = $('.gd-widget-grid__title', i); return t ? t.textContent.trim() : 'widget'; }
  function setSize(i, s) {
    i.setAttribute('data-size', s);
    $$('[data-gd-widget-size]', i).forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-gd-widget-size') === s)); });
  }
  function palette(g) { return $$('[data-gd-widget-add]', g); }
  function syncPalette(g) {
    var placed = wItems(g).map(function (i) { return i.getAttribute('data-gd-widget-id'); });
    palette(g).forEach(function (o) { o.hidden = placed.indexOf(o.getAttribute('data-gd-widget-add')) !== -1; });
    var e = $('.gd-widget-grid__empty', g); if (e) e.hidden = wItems(g).length > 0;
  }
  function editing(g, on) {
    g.setAttribute('data-editing', String(on));
    $$('[data-gd-widgets-edit="start"]', g).forEach(function (b) { b.hidden = on; });
    $$('.gd-widget-grid__banner', g).forEach(function (b) { b.hidden = !on; });
    var pal = $('.gd-widget-grid__palette', g); if (pal) pal.hidden = !on;
    var slot = $('.gd-widget-grid__slot', g); if (slot) slot.hidden = !on;
    syncPalette(g);
  }
  function move(g, item, dir) {
    var list = wItems(g), i = list.indexOf(item), j = i + dir;
    if (j < 0 || j >= list.length) return false;
    var ref = list[j]; if (dir > 0) ref.after(item); else ref.before(item);
    item.classList.add('is-moved'); live(g, wTitle(item) + ' moved to position ' + (j + 1) + ' of ' + list.length); return true;
  }
  var drag = null;
  function dragMove(e) {
    if (!drag) return;
    drag.item.classList.add('is-dragging');
    var under = doc.elementFromPoint(e.clientX, e.clientY), over = under && under.closest('.gd-widget-grid__item');
    if (over && over !== drag.item && drag.grid.contains(over)) {
      var r = over.getBoundingClientRect(), after = e.clientY > r.top + r.height / 2 && e.clientX > r.left || e.clientY > r.bottom;
      if (after) over.after(drag.item); else over.before(drag.item);
    }
  }
  function dragEnd() {
    if (!drag) return;
    doc.removeEventListener('pointermove', dragMove); doc.removeEventListener('pointerup', dragEnd); doc.removeEventListener('pointercancel', dragEnd);
    drag.item.classList.remove('is-dragging'); live(drag.grid, wTitle(drag.item) + ' dropped'); layout(drag.grid, 'move'); drag = null;
  }

  /* -- explorer-layout ----------------------------------------------------------------------- */
  var SPLIT = {   // var, axis, min, max, default, sign (+1 grows with pointer, -1 shrinks)
    query: { v: '--gd-ex-left',  axis: 'x', min: 200, max: 560, def: 280, sign: 1,  pane: 'query' },
    dock:  { v: '--gd-ex-right', axis: 'x', min: 240, max: 640, def: 320, sign: -1, pane: 'dock' },
    chart: { v: '--gd-ex-chart', axis: 'y', min: 120, max: 720, def: 300, sign: 1,  pane: 'chart' }
  };
  function splitValue(ex, name) { var c = SPLIT[name]; return parseFloat(getComputedStyle(ex).getPropertyValue(c.v)) || c.def; }
  function setSplit(ex, sep, name, val) {
    var c = SPLIT[name], max = c.max;
    var main = $('.gd-explorer__main', ex);
    if (name === 'chart' && main) max = Math.max(c.min, Math.min(c.max, main.getBoundingClientRect().height / fitValue() - 120));
    val = Math.round(Math.max(c.min, Math.min(max, val)));
    ex.style.setProperty(c.v, val + 'px');
    sep.setAttribute('aria-valuemin', c.min); sep.setAttribute('aria-valuemax', Math.round(max)); sep.setAttribute('aria-valuenow', val);
    emit(ex, 'gd:split', { name: name, value: val });
  }
  function paneCollapse(ex, name, c) {
    var pane = $('[data-gd-pane="' + name + '"]', ex), sep = $('[data-gd-resizer="' + name + '"]', ex), b = $('[data-gd-explorer-collapse="' + name + '"]', ex);
    if (!pane) return;
    pane.setAttribute('data-collapsed', String(c)); if (sep) sep.hidden = c;
    if (b) { b.setAttribute('aria-expanded', String(!c)); b.setAttribute('aria-label', (c ? 'Expand ' : 'Collapse ') + (name === 'query' ? 'query panel' : 'details panel')); }
  }
  var sdrag = null;
  function sMove(e) {
    if (!sdrag) return;
    var d = ((sdrag.c.axis === 'x' ? e.clientX : e.clientY) - sdrag.start) / fitValue();
    setSplit(sdrag.ex, sdrag.sep, sdrag.name, sdrag.base + d * sdrag.c.sign);
  }
  function sEnd() {
    if (!sdrag) return;
    doc.removeEventListener('pointermove', sMove); doc.removeEventListener('pointerup', sEnd); doc.removeEventListener('pointercancel', sEnd);
    sdrag.sep.removeAttribute('data-dragging'); sdrag = null;
  }

  /* -- editable page-header ------------------------------------------------------------------ */
  function autosize(t) { if (t.tagName === 'TEXTAREA') { t.style.height = 'auto'; t.style.height = t.scrollHeight + 'px'; } }

  /* -- shortcuts shown per platform ---------------------------------------------------------- */
  var MAC = /mac|iphone|ipad/i.test((navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || '');
  function keys() {
    $$('[data-gd-keys]').forEach(function (k) { k.innerHTML = MAC ? '<span>⌘</span><span>K</span>' : '<span>Ctrl</span><span>K</span>'; });
  }

  /* -- delegated events ---------------------------------------------------------------------- */
  doc.addEventListener('click', function (e) {
    var t = e.target, el;
    if ((el = t.closest('[data-gd-rail-toggle]'))) { var rail = el.closest('.gd-sidebar'); setCollapsed(rail, rail.getAttribute('data-collapsed') !== 'true', true); return; }
    if ((el = t.closest('[data-gd-nav-toggle]'))) { var app = el.closest('.gd-app'); setNav(app.getAttribute('data-nav-open') !== 'true'); return; }
    if ((el = t.closest('.gd-sidebar a[href]')) && $('.gd-app[data-nav-open="true"]')) setNav(false);
    if ((el = t.closest('[data-gd-group-toggle]'))) {
      var r = el.closest('.gd-sidebar');
      if (r && r.getAttribute('data-collapsed') === 'true' && getComputedStyle($('.gd-sidebar__toggle', r) || r).display !== 'none') { setCollapsed(r, false, true); setGroup(el, true); }
      else setGroup(el, el.getAttribute('aria-expanded') !== 'true');
      return;
    }
    if ((el = t.closest('[data-gd-theme]'))) { setTheme(el.getAttribute('data-gd-theme')); closePop(el.closest('[data-gd-pop]'), true); return; }
    if ((el = t.closest('[data-gd-workspace]'))) {
      var wp = el.closest('[data-gd-pop]'), tr = $('[data-gd-pop-trigger]', wp);
      $$('[data-gd-workspace]', wp).forEach(function (i) { i.setAttribute('aria-checked', String(i === el)); });
      var n = $('.gd-ws__name', tr), s = $('.gd-ws__sub', tr), tile = $('.gd-ws__tile', tr);
      if (n && el.dataset.name) n.textContent = el.dataset.name; if (s && el.dataset.sub != null) s.textContent = el.dataset.sub; if (tile && el.dataset.initials) tile.textContent = el.dataset.initials;
      closePop(wp, true); emit(wp, 'gd:workspace-change', { id: el.getAttribute('data-gd-workspace'), name: el.dataset.name }); return;
    }
    if ((el = t.closest('[data-gd-pop-trigger]'))) { var p = el.closest('[data-gd-pop]'); if ($('[data-gd-pop-menu]', p).hidden) openPop(p); else closePop(p, false); return; }
    if (!t.closest('[data-gd-pop-menu]')) closePops();
    if ((el = t.closest('[data-gd-search-open]'))) { emit(el, 'gd:search-open', {}, true); return; }
    if ((el = t.closest('[data-gd-signout]'))) { emit(el, 'gd:signout'); return; }

    /* widget-grid */
    if ((el = t.closest('[data-gd-widgets-edit]'))) {
      var g = el.closest('[data-gd-widgets]'), act = el.getAttribute('data-gd-widgets-edit');
      if (act === 'start') { widgetState.set(g, { nodes: wItems(g).map(function (i) { return { n: i, size: i.getAttribute('data-size') }; }) }); editing(g, true); }
      else if (act === 'cancel') {
        var st = widgetState.get(g), canvas = $('.gd-widget-grid__canvas', g), slot = $('.gd-widget-grid__slot', g);
        if (st) { st.nodes.forEach(function (o) { setSize(o.n, o.size); o.n.classList.remove('is-moved'); canvas.insertBefore(o.n, slot || null); }); wItems(g).forEach(function (i) { if (!st.nodes.some(function (o) { return o.n === i; })) i.remove(); }); }
        editing(g, false); layout(g, 'cancel');
      } else { wItems(g).forEach(function (i) { i.classList.remove('is-moved'); }); editing(g, false); layout(g, 'done'); }
      return;
    }
    if ((el = t.closest('[data-gd-widget-size]'))) { var it = el.closest('.gd-widget-grid__item'); setSize(it, el.getAttribute('data-gd-widget-size')); live(it.closest('[data-gd-widgets]'), wTitle(it) + ' size ' + el.getAttribute('data-gd-widget-size')); layout(it.closest('[data-gd-widgets]'), 'resize'); return; }
    if ((el = t.closest('[data-gd-widget-remove]'))) {
      var item = el.closest('.gd-widget-grid__item'), gr = item.closest('[data-gd-widgets]'), nx = item.nextElementSibling;
      var rid = item.getAttribute('data-gd-widget-id');
      (gr.__removed = gr.__removed || {})[rid] = item; item.remove();
      if (!$('[data-gd-widget-add="' + rid + '"]', gr)) {            // a removed widget must be addable again
        var opt = doc.createElement('button'), pal = $('.gd-widget-grid__palette', gr);
        opt.type = 'button'; opt.className = 'gd-widget-grid__option'; opt.setAttribute('data-gd-widget-add', rid);
        opt.innerHTML = '<b></b><span>Removed from this layout</span>'; opt.firstChild.textContent = wTitle(item);
        if (pal) pal.appendChild(opt);
      }
      syncPalette(gr);
      live(gr, wTitle(item) + ' removed'); layout(gr, 'remove'); var f = $('.gd-widget-grid__handle', gr); if (f) f.focus(); return;
    }
    if ((el = t.closest('[data-gd-widget-add]'))) {
      var gg = el.closest('[data-gd-widgets]'), id = el.getAttribute('data-gd-widget-add'), ev = emit(el, 'gd:widget-add', { id: id }, true);
      if (!ev.defaultPrevented) {
        var node = gg.__removed && gg.__removed[id], tpl = $('template[data-gd-widget-template="' + id + '"]', gg);
        if (!node && tpl) node = tpl.content.firstElementChild.cloneNode(true);
        if (node) { var cv = $('.gd-widget-grid__canvas', gg); cv.insertBefore(node, $('.gd-widget-grid__slot', gg) || null); syncPalette(gg); live(gg, wTitle(node) + ' added'); layout(gg, 'add'); }
      }
      return;
    }
    /* explorer-layout */
    if ((el = t.closest('[data-gd-explorer-collapse]'))) {
      var ex = el.closest('[data-gd-explorer]'), nm = el.getAttribute('data-gd-explorer-collapse'), pn = $('[data-gd-pane="' + nm + '"]', ex);
      paneCollapse(ex, nm, pn.getAttribute('data-collapsed') !== 'true');
    }
  });

  doc.addEventListener('keydown', function (e) {
    var t = e.target, el;
    if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
      var s = $('[data-gd-search-open]'); if (s) { e.preventDefault(); emit(s, 'gd:search-open', {}, true); } return;
    }
    if (e.key === 'Escape') {
      var pop = t.closest && t.closest('[data-gd-pop]') || $$('[data-gd-pop]').filter(function (p) { return !$('[data-gd-pop-menu]', p).hidden; })[0];
      if (pop) { closePop(pop, true); return; }
      var app = $('.gd-app[data-nav-open="true"]'); if (app) { setNav(false); var b = $('[data-gd-nav-toggle]', app); if (b) b.focus(); return; }
      var g = t.closest && t.closest('[data-gd-widgets][data-editing="true"]');
      if (g && !t.closest('input, textarea')) { var c = $('[data-gd-widgets-edit="cancel"]', g); if (c) c.click(); return; }
    }
    if ((el = t.closest && t.closest('[data-gd-edit]'))) {
      if (e.key === 'Escape') { el.value = el.getAttribute('data-initial') || ''; autosize(el); el.blur(); }
      else if (e.key === 'Enter' && el.tagName !== 'TEXTAREA') { e.preventDefault(); el.blur(); }
      return;
    }
    /* menus: arrows, Home/End, Tab closes */
    var menu = t.closest && t.closest('[data-gd-pop-menu]');
    if (menu) {
      var list = items(menu), i = list.indexOf(t);
      if (e.key === 'ArrowDown') { e.preventDefault(); list[(i + 1) % list.length].focus(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); list[(i - 1 + list.length) % list.length].focus(); }
      else if (e.key === 'Home') { e.preventDefault(); list[0].focus(); }
      else if (e.key === 'End') { e.preventDefault(); list[list.length - 1].focus(); }
      else if (e.key === 'Tab') closePop(menu.closest('[data-gd-pop]'), false);
      return;
    }
    if ((el = t.closest && t.closest('[data-gd-pop-trigger]')) && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) { e.preventDefault(); openPop(el.closest('[data-gd-pop]')); return; }
    /* nav: arrows move between rows, Left / Right collapse and expand a group head */
    var nav = t.closest && t.closest('.gd-sidebar__nav, .gd-subnav');
    if (nav && (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Home' || e.key === 'End')) {
      var rows = $$('.gd-nav-item, .gd-subnav__item', nav).filter(function (r) { return r.getAttribute('aria-disabled') !== 'true' && r.offsetParent !== null; });
      var k = rows.indexOf(t); if (k === -1) return; e.preventDefault();
      var n = e.key === 'Home' ? 0 : e.key === 'End' ? rows.length - 1 : Math.max(0, Math.min(rows.length - 1, k + (e.key === 'ArrowDown' ? 1 : -1)));
      rows[n].focus(); return;
    }
    if (t.matches && t.matches('[data-gd-group-toggle]') && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) { e.preventDefault(); setGroup(t, e.key === 'ArrowRight'); return; }
    /* widget handle: arrows move, + / - resize */
    if ((el = t.closest && t.closest('[data-gd-widget-handle]'))) {
      var item = el.closest('.gd-widget-grid__item'), gr = item.closest('[data-gd-widgets]'), moved = false;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { moved = true; move(gr, item, -1); }
      else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { moved = true; move(gr, item, 1); }
      else if (e.key === '+' || e.key === '=' || e.key === '-' || e.key === '_') {
        var si = SIZES.indexOf(item.getAttribute('data-size') || 'm'), ns = Math.max(0, Math.min(3, si + (e.key === '+' || e.key === '=' ? 1 : -1)));
        setSize(item, SIZES[ns]); live(gr, wTitle(item) + ' size ' + SIZES[ns]); layout(gr, 'resize'); e.preventDefault(); return;
      }
      if (moved) { e.preventDefault(); el.focus(); layout(gr, 'move'); }
      return;
    }
    /* separators: arrows resize, Shift = big step, Home / End = min / max, Enter = collapse or reset */
    if ((el = t.closest && t.closest('[data-gd-resizer]'))) {
      var ex = el.closest('[data-gd-explorer]'), name = el.getAttribute('data-gd-resizer'), c = SPLIT[name], step = e.shiftKey ? 64 : 16, v = splitValue(ex, name), nv = null;
      var up = c.axis === 'x' ? 'ArrowRight' : 'ArrowDown', dn = c.axis === 'x' ? 'ArrowLeft' : 'ArrowUp';
      if (e.key === up) nv = v + step * c.sign; else if (e.key === dn) nv = v - step * c.sign;
      else if (e.key === 'Home') nv = c.min; else if (e.key === 'End') nv = c.max;
      else if (e.key === 'Enter') { if (name === 'chart') nv = c.def; else paneCollapse(ex, name, true); }
      if (nv !== null) { e.preventDefault(); setSplit(ex, el, name, nv); }
    }
  });

  doc.addEventListener('pointerdown', function (e) {
    var h = e.target.closest('[data-gd-widget-handle]');
    if (h && e.button === 0) {
      var item = h.closest('.gd-widget-grid__item'); drag = { item: item, grid: item.closest('[data-gd-widgets]') };
      e.preventDefault(); doc.addEventListener('pointermove', dragMove); doc.addEventListener('pointerup', dragEnd); doc.addEventListener('pointercancel', dragEnd); return;
    }
    var s = e.target.closest('[data-gd-resizer]');
    if (s && e.button === 0) {
      var ex = s.closest('[data-gd-explorer]'), name = s.getAttribute('data-gd-resizer'), c = SPLIT[name];
      sdrag = { ex: ex, sep: s, name: name, c: c, start: c.axis === 'x' ? e.clientX : e.clientY, base: splitValue(ex, name) };
      s.setAttribute('data-dragging', ''); e.preventDefault(); s.focus();
      doc.addEventListener('pointermove', sMove); doc.addEventListener('pointerup', sEnd); doc.addEventListener('pointercancel', sEnd);
    }
  });
  doc.addEventListener('dblclick', function (e) {
    var s = e.target.closest('[data-gd-resizer]'); if (!s) return;
    var ex = s.closest('[data-gd-explorer]'), name = s.getAttribute('data-gd-resizer'); setSplit(ex, s, name, SPLIT[name].def);
  });
  doc.addEventListener('input', function (e) { if (e.target.matches && e.target.matches('[data-gd-edit]')) { autosize(e.target); var h = e.target.closest('.gd-page-header'); if (h) h.setAttribute('data-dirty', 'true'); } });
  doc.addEventListener('change', function (e) {
    var el = e.target.closest && e.target.closest('[data-gd-edit]'); if (!el) return;
    el.setAttribute('data-initial', el.value); emit(el, 'gd:title-change', { field: el.getAttribute('data-gd-edit'), value: el.value });
  });
  doc.addEventListener('focusout', function (e) {
    var p = e.target.closest && e.target.closest('[data-gd-pop]');
    if (p && !$('[data-gd-pop-menu]', p).hidden && e.relatedTarget && !p.contains(e.relatedTarget)) closePop(p, false);
  });
  window.addEventListener('resize', fit);
  try { matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () { if (pref() === 'system') applyTheme('system', false); }); } catch (e) { /* old browser */ }

  /* -- init, and again after any page swap --------------------------------------------------- */
  function refresh() {
    fit(); keys(); openCurrent(); stack();
    $$('.gd-sidebar').forEach(function (r) {
      if (!r.__gdInit) { r.__gdInit = true; if (r.hasAttribute('data-gd-persist') && store('gd-rail') === 'collapsed') r.setAttribute('data-collapsed', 'true'); }
      var t = $('[data-gd-rail-toggle]', r); if (t) t.setAttribute('aria-expanded', String(r.getAttribute('data-collapsed') !== 'true'));
      titles(r);
    });
    $$('[data-gd-edit]').forEach(autosize);
    $$('[data-gd-explorer]').forEach(function (ex) {
      $$('[data-gd-resizer]', ex).forEach(function (s) { var n = s.getAttribute('data-gd-resizer'); if (!s.hasAttribute('aria-valuenow')) setSplit(ex, s, n, splitValue(ex, n)); });
    });
    $$('[data-gd-widgets]').forEach(function (g) { syncPalette(g); });
  }
  GD.shell = { fit: fit, refresh: refresh, setTheme: setTheme, setNav: setNav, setCollapsed: setCollapsed, stack: stack, layout: layout };
  function boot() {
    if ($('.gd-theme, [data-gd-theme]')) applyTheme(pref(), false);
    refresh();
    if (window.MutationObserver) { var q = 0; new MutationObserver(function () { clearTimeout(q); q = setTimeout(refresh, 50); }).observe(doc.body, { childList: true, subtree: true }); }
  }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', boot); else boot();
})();
