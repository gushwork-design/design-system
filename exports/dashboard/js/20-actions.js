/* ============================================================================
   Gushwork dashboard — 20 actions (behaviour for menu, split-button, tabs, segmented-control, data-tip)
   Vanilla ES2020, delegated on document so it survives a page swap. Exposes GD.actions only.

   Hooks
     data-gd-menu[="menu-id"]   on a trigger. Opens the .gd-menu with that id, or the next .gd-menu sibling.
                                Sets aria-expanded, aria-haspopup="menu". Menu closes on Esc, Tab, outside press, scroll, resize.
     role="menuitem|menuitemcheckbox|menuitemradio" on .gd-menu__item. Checkbox/radio items flip aria-checked.
     data-value                 on an item: delivered in the gd:menu event.
     data-gd-keep               on an item or menu: stay open after activation.
     role="tablist" > role="tab"       tabs-pill / tabs-underline. aria-controls -> a .gd-tabs__panel. Event: gd:tab
     role="radiogroup" > role="radio"  segmented-control, period-select. Event: gd:change
     (tablists inside [data-gd-metric-strip] are skipped: that component has its own handler)
     [data-tip]                 Esc hides the bubble while the control is focused or hovered (WCAG 1.4.13).
   GD.actions.current() returns the open { trigger, menu } (read it inside a gd:menu handler to know which trigger opened the menu).
   Events (bubble, on the menu / tablist / group): gd:menu {item,value,checked}, gd:tab {tab,value}, gd:change {item,value}
   ============================================================================ */
GD.actions = GD.actions || {};
(() => {
  const A = GD.actions;
  let open = null; // { trigger, menu }
  const items = (m) => [...m.querySelectorAll('.gd-menu__item:not([aria-disabled="true"])')].filter((e) => !e.hidden);
  const emit = (el, name, detail) => el.dispatchEvent(new CustomEvent(name, { bubbles: true, detail }));

  // Place a menu with position:fixed under (or over) an anchor, clamped to the viewport.
  A.place = (menu, anchor, o = {}) => {
    const r = anchor.getBoundingClientRect();
    Object.assign(menu.style, { position: 'fixed', top: '0px', left: '0px', right: 'auto', bottom: 'auto' });
    if (o.matchWidth) menu.style.minWidth = r.width + 'px';
    const mh = menu.offsetHeight, mw = menu.offsetWidth, vh = innerHeight, vw = innerWidth;
    const below = vh - r.bottom, up = below < mh + 12 && r.top > below;
    const end = o.end ?? menu.classList.contains('gd-menu--end');
    const left = end ? r.right - mw : r.left;
    menu.style.left = Math.max(8, Math.min(left, vw - mw - 8)) + 'px';
    menu.style.top = (up ? Math.max(8, r.top - mh - 4) : r.bottom + 4) + 'px';
    if (!up && r.bottom + 4 + mh > vh - 8) menu.style.maxHeight = Math.max(120, vh - r.bottom - 12) + 'px';
    menu.classList.toggle('is-up', up);
  };
  A.unplace = (menu) => {
    ['position', 'top', 'left', 'right', 'bottom', 'minWidth', 'maxHeight'].forEach((k) => (menu.style[k] = ''));
    menu.classList.remove('is-up');
  };

  const menuFor = (t) => {
    const id = t.getAttribute('data-gd-menu');
    return (id && document.getElementById(id)) || t.parentElement.querySelector(':scope > .gd-menu') || t.closest('.gd-pop, .gd-split')?.querySelector('.gd-menu');
  };

  A.closeMenu = (refocus) => {
    if (!open) return;
    const { trigger, menu } = open; open = null;
    menu.hidden = true; A.unplace(menu);
    trigger.setAttribute('aria-expanded', 'false');
    items(menu).forEach((i) => i.classList.remove('is-active'));
    if (refocus && document.contains(trigger)) trigger.focus();
  };
  A.openMenu = (trigger, focusFirst) => {
    const menu = menuFor(trigger); if (!menu) return;
    A.closeMenu(false);
    menu.hidden = false; menu.setAttribute('role', menu.getAttribute('role') || 'menu');
    trigger.setAttribute('aria-expanded', 'true'); trigger.setAttribute('aria-haspopup', 'menu');
    A.place(menu, trigger);
    open = { trigger, menu };
    if (focusFirst) { const i = items(menu); (menu.querySelector('[aria-checked="true"]:not([aria-disabled])') || i[0])?.focus(); }
  };

  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-gd-menu]');
    if (t && !t.matches('[aria-disabled="true"], :disabled')) {
      const wasOpen = open && open.trigger === t;
      if (wasOpen) A.closeMenu(false); else A.openMenu(t, e.detail === 0); // detail 0 = keyboard activation
      return;
    }
    const it = e.target.closest('.gd-menu__item');
    if (it && open && open.menu.contains(it) && it.getAttribute('aria-disabled') !== 'true') {
      const role = it.getAttribute('role'); let checked;
      if (role === 'menuitemcheckbox') { checked = it.getAttribute('aria-checked') !== 'true'; it.setAttribute('aria-checked', checked); }
      else if (role === 'menuitemradio') {
        open.menu.querySelectorAll('[role="menuitemradio"]').forEach((r) => r.setAttribute('aria-checked', r === it));
        checked = true;
      }
      const m = open.menu;
      emit(m, 'gd:menu', { item: it, value: it.dataset.value ?? (it.querySelector('.gd-menu__text > :first-child') || it).textContent.trim(), checked });
      if (!(it.hasAttribute('data-gd-keep') || m.hasAttribute('data-gd-keep'))) A.closeMenu(true);
    }
  });
  document.addEventListener('mousedown', (e) => { if (open && !open.menu.contains(e.target) && !open.trigger.contains(e.target)) A.closeMenu(false); }, true);
  addEventListener('resize', () => A.closeMenu(false));
  addEventListener('scroll', (e) => { if (open && !open.menu.contains(e.target)) A.closeMenu(false); }, true);

  document.addEventListener('keydown', (e) => {
    const k = e.key;
    if (k === 'Escape') {
      if (open) { e.preventDefault(); A.closeMenu(true); return; }
      const tip = e.target.closest?.('[data-tip]') || document.querySelector('[data-tip]:hover');
      if (tip) tip.setAttribute('data-tip-dismissed', '');
      return;
    }
    // a closed trigger opens on ArrowDown / ArrowUp
    const trig = e.target.closest?.('[data-gd-menu]');
    if (trig && !open && (k === 'ArrowDown' || k === 'ArrowUp')) { e.preventDefault(); A.openMenu(trig, true); return; }
    if (open) {
      const list = items(open.menu), i = list.indexOf(document.activeElement);
      if (k === 'Tab') { A.closeMenu(false); return; }
      const go = (n) => { e.preventDefault(); list.forEach((x) => x.classList.remove('is-active')); list[n]?.focus(); };
      if (k === 'ArrowDown') go((i + 1) % list.length);
      else if (k === 'ArrowUp') go((i - 1 + list.length) % list.length);
      else if (k === 'Home') go(0);
      else if (k === 'End') go(list.length - 1);
      else if (k.length === 1 && /\S/.test(k)) { // type-ahead
        const n = list.findIndex((x, j) => j > i && x.textContent.trim().toLowerCase().startsWith(k.toLowerCase()));
        const m = n < 0 ? list.findIndex((x) => x.textContent.trim().toLowerCase().startsWith(k.toLowerCase())) : n;
        if (m >= 0) go(m);
      }
      return;
    }
    // tablist / radiogroup roving
    const item = e.target.closest?.('[role="tab"], [role="radio"]'); if (!item || item.closest('[data-gd-metric-strip]')) return;
    const group = item.closest('[role="tablist"], [role="radiogroup"]'); if (!group) return;
    const role = item.getAttribute('role');
    const all = [...group.querySelectorAll(`[role="${role}"]:not([aria-disabled="true"])`)], i = all.indexOf(item);
    const vert = group.getAttribute('aria-orientation') === 'vertical';
    const next = vert ? 'ArrowDown' : 'ArrowRight', prev = vert ? 'ArrowUp' : 'ArrowLeft';
    let n = -1;
    if (k === next) n = (i + 1) % all.length; else if (k === prev) n = (i - 1 + all.length) % all.length;
    else if (k === 'Home') n = 0; else if (k === 'End') n = all.length - 1;
    if (n >= 0) { e.preventDefault(); all[n].focus(); select(all[n]); }
    else if ((k === ' ' || k === 'Enter') && role === 'radio') { e.preventDefault(); select(item); }
  });
  document.addEventListener('pointerleave', (e) => e.target.removeAttribute?.('data-tip-dismissed'), true);
  document.addEventListener('focusout', (e) => e.target.removeAttribute?.('data-tip-dismissed'));

  function select(item) {
    if (item.closest('[data-gd-metric-strip]')) return; // the metric strip has its own handler
    if (item.getAttribute('aria-disabled') === 'true' || item.disabled) return;
    const group = item.closest('[role="tablist"], [role="radiogroup"]'); if (!group) return;
    const tab = item.getAttribute('role') === 'tab', attr = tab ? 'aria-selected' : 'aria-checked';
    if (item.getAttribute(attr) === 'true') return;
    group.querySelectorAll(`[role="${item.getAttribute('role')}"]`).forEach((x) => { x.setAttribute(attr, x === item); x.tabIndex = x === item ? 0 : -1; });
    const value = item.dataset.value ?? item.id ?? item.textContent.trim();
    if (tab) {
      group.querySelectorAll('[role="tab"][aria-controls]').forEach((t) => { const p = document.getElementById(t.getAttribute('aria-controls')); if (p) p.hidden = t !== item; });
      emit(group, 'gd:tab', { tab: item, value });
    } else emit(group, 'gd:change', { item, value });
  }
  document.addEventListener('click', (e) => {
    const item = e.target.closest('[role="tab"], [role="radio"]');
    if (item && item.closest('.gd [role="tablist"], .gd [role="radiogroup"]')) select(item);
  });
  A.select = select;
  A.current = () => open;
})();
