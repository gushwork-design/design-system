/* ============================================================================
   Gushwork dashboard — 60 feedback, overlays and views (behaviour)
   Vanilla ES2020, no dependencies. Delegated listeners on document, so everything survives a page swap.
   Exposes window.GD.feedback (and GD.toast, GD.confirm as shortcuts).

   HOOKS
   toast          GD.toast(message, {type:'success|info|warning|error', action:{label,onClick}, duration})
   banner         [data-gd-dismiss]  inside .gd-banner; .gd-banner[data-gd-banner-key] stays dismissed (localStorage)
   dialogs        [data-gd-modal-open="#id"]  opens a <dialog class="gd-modal|gd-drawer">;  [data-gd-close] closes the
                  nearest dialog;  dialog[data-gd-static] ignores a click on the scrim;  [data-gd-drawer-wide] toggles
                  the drawer between 560 and wide (aria-pressed kept in sync)
   confirm        GD.confirm({title, message, items, confirmLabel, cancelLabel, danger}) -> Promise<boolean>;
                  [data-gd-confirm="Title"] [data-gd-confirm-body] [data-gd-confirm-label] on a button intercepts its click
   tooltip        [data-gd-tooltip="text"]  or rich: [data-gd-tooltip-title] [data-gd-tooltip-body] [data-gd-tooltip-meta];
                  [data-gd-tooltip-placement="top|bottom|left|right"]  [data-gd-tooltip-variant="rail"] (the collapsed sidebar's plain pill, 4px away)
   popover        [data-gd-popover="#id"] on the trigger toggles a .gd-popover (hidden attr); Esc, outside click, focus-out close
   (dock sections use [data-gd-toggle] + aria-controls, handled by 50-data.js)
   docked panel   .gd-dock[data-gd-dock="id"] (+ data-gd-min / data-gd-max), [data-gd-dock-resize] (role=separator),
                  [data-gd-dock-toggle] collapse, [data-gd-dock-apply] / [data-gd-dock-reset]; events gd:dock-apply, gd:dock-reset
   coachmark      [data-gd-tour="id"] [data-gd-coach-step="1"] [data-gd-coach-title] [data-gd-coach-body] [data-gd-coach-image]
                  on the targets;  GD.feedback.tour('id', {force}) or GD.feedback.tour(id, steps[])
   palette        [data-gd-palette-open], Cmd/Ctrl+K;  GD.feedback.palette.setItems([{group,title,hint,href,icon,run}])
   board          [data-gd-board="drag"] on .gd-board enables drag and Alt+Arrow moves; event gd:board-move
   ============================================================================ */
(function () {
  'use strict';
  window.GD = window.GD || {};
  const doc = document;
  const $$ = (s, r) => Array.from((r || doc).querySelectorAll(s));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const emit = (el, name, detail) => el.dispatchEvent(new CustomEvent(name, { bubbles: true, detail }));
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* private mode */ } }
  };
  const ICON = {
    x: 'M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z',
    info: 'M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm16-40a8,8,0,0,1-8,8,16,16,0,0,1-16-16V128a8,8,0,0,1,0-16,16,16,0,0,1,16,16v40A8,8,0,0,1,144,176ZM112,84a12,12,0,1,1,12,12A12,12,0,0,1,112,84Z',
    'warning-circle': 'M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm-8-80V80a8,8,0,0,1,16,0v56a8,8,0,0,1-16,0Zm20,36a12,12,0,1,1-12-12A12,12,0,0,1,140,172Z',
    warning: 'M236.8,188.09,149.35,36.22h0a24.76,24.76,0,0,0-42.7,0L19.2,188.09a23.51,23.51,0,0,0,0,23.72A24.35,24.35,0,0,0,40.55,224h174.9a24.35,24.35,0,0,0,21.33-12.19A23.51,23.51,0,0,0,236.8,188.09ZM222.93,203.8a8.5,8.5,0,0,1-7.48,4.2H40.55a8.5,8.5,0,0,1-7.48-4.2,7.59,7.59,0,0,1,0-7.72L120.52,44.21a8.75,8.75,0,0,1,15,0l87.45,151.87A7.59,7.59,0,0,1,222.93,203.8ZM120,144V104a8,8,0,0,1,16,0v40a8,8,0,0,1-16,0Zm20,36a12,12,0,1,1-12-12A12,12,0,0,1,140,180Z',
    'check-circle': 'M173.66,98.34a8,8,0,0,1,0,11.32l-56,56a8,8,0,0,1-11.32,0l-24-24a8,8,0,0,1,11.32-11.32L112,148.69l50.34-50.35A8,8,0,0,1,173.66,98.34ZM232,128A104,104,0,1,1,128,24,104.11,104.11,0,0,1,232,128Zm-16,0a88,88,0,1,0-88,88A88.1,88.1,0,0,0,216,128Z',
    search: 'M229.66,218.34l-50.07-50.06a88.11,88.11,0,1,0-11.31,11.31l50.06,50.07a8,8,0,0,0,11.32-11.32ZM40,112a72,72,0,1,1,72,72A72.08,72.08,0,0,1,40,112Z'
  };
  const svg = (n, px) => '<svg viewBox="0 0 256 256" width="' + (px || 16) + '" height="' + (px || 16) + '" fill="currentColor" aria-hidden="true"><path d="' + ICON[n] + '"/></svg>';
  const msOf = (v) => { v = String(v || '').trim(); return v.endsWith('ms') ? parseFloat(v) : v.endsWith('s') ? parseFloat(v) * 1000 : NaN; };
  const motionMs = (el) => { const d = getComputedStyle(el).transitionDuration.split(',')[0]; return msOf(d) || 0; };
  // the element that carries the .gd scope, so created nodes inherit the aliases
  const root = () => (doc.documentElement.classList.contains('gd') ? doc.body : (doc.querySelector('.gd') || doc.body));
  const toTop = (el) => { try { if (el.matches(':popover-open')) el.hidePopover(); el.showPopover(); } catch (e) { /* no popover support: z-index fallback */ } };
  const mkPop = (el) => { el.setAttribute('popover', 'manual'); return el; };

  /* ---------------- placement shared by tooltip and coachmark ---------------- */
  function place(pop, target, pref, gap, arrowAxisProp) {
    const t = target.getBoundingClientRect(), vw = innerWidth, vh = innerHeight, m = 8;
    const w = pop.offsetWidth, h = pop.offsetHeight;
    const fits = { top: t.top - gap - h >= m, bottom: t.bottom + gap + h <= vh - m, left: t.left - gap - w >= m, right: t.right + gap + w <= vw - m };
    let side = pref;
    if (!fits[side]) { const alt = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' }[side]; side = fits[alt] ? alt : (fits.bottom ? 'bottom' : fits.top ? 'top' : side); }
    let left, top;
    if (side === 'top' || side === 'bottom') {
      left = Math.min(Math.max(m, t.left + t.width / 2 - w / 2), vw - m - w);
      top = side === 'top' ? t.top - gap - h : t.bottom + gap;
      pop.style.setProperty('--gd-arrow-x', Math.round(t.left + t.width / 2 - left) + 'px');
    } else {
      top = Math.min(Math.max(m, t.top + t.height / 2 - h / 2), vh - m - h);
      left = side === 'left' ? t.left - gap - w : t.right + gap;
      pop.style.setProperty('--gd-arrow-y', Math.round(t.top + t.height / 2 - top) + 'px');
    }
    pop.style.left = Math.round(left) + 'px'; pop.style.top = Math.round(top) + 'px';
    pop.dataset.placement = side;
  }

  /* ======================= toast ======================= */
  const toasts = [];
  let host = null;
  const dismissMs = () => { const v = msOf(getComputedStyle(doc.documentElement).getPropertyValue('--gw-toast-dismiss')); return v > 0 ? v : 4000; };
  function toastHost() {
    if (host && host.isConnected) return host;
    host = doc.createElement('div');
    host.className = 'gd-toasts'; host.setAttribute('role', 'region'); host.setAttribute('aria-label', 'Notifications');
    mkPop(host); root().appendChild(host);
    return host;
  }
  function schedule(t) {
    clearTimeout(t.timer); t.timer = null;
    if (t.type === 'error' || !(t.remaining > 0) || t.held) return;   // R10: errors never auto-dismiss
    t.started = Date.now(); t.timer = setTimeout(() => dismissToast(t), t.remaining);
  }
  function hold(t, on) {
    if (on && !t.held) { if (t.timer) { clearTimeout(t.timer); t.timer = null; t.remaining -= Date.now() - t.started; } t.held = true; }
    else if (!on && t.held && !t.el.matches(':hover') && !t.el.contains(doc.activeElement)) { t.held = false; schedule(t); }
  }
  function dismissToast(t, instant) {
    const i = toasts.indexOf(t); if (i < 0) return;
    toasts.splice(i, 1); clearTimeout(t.timer);
    const done = () => { t.el.remove(); if (!toasts.length && host) { try { host.hidePopover(); } catch (e) { /* noop */ } } };
    if (instant) return done();
    t.el.dataset.state = 'leaving';
    const ms = motionMs(t.el); ms ? setTimeout(done, ms) : done();
  }
  function toast(message, opts) {
    opts = opts || {};
    const type = ['success', 'info', 'warning', 'error'].includes(opts.type) ? opts.type : 'info';
    const h = toastHost();
    // an identical toast is replaced, not stacked
    toasts.filter((t) => t.msg === message && t.type === type).forEach((t) => dismissToast(t, true));
    const el = doc.createElement('div');
    el.className = 'gd-toast gd-toast--' + type;
    el.setAttribute('role', type === 'error' ? 'alert' : 'status');
    const icon = { success: 'check-circle', info: 'info', warning: 'warning', error: 'warning-circle' }[type];
    el.innerHTML = '<span class="gd-toast__icon">' + svg(icon, 20) + '</span><span class="gd-toast__msg"></span>' +
      (opts.action ? '<button type="button" class="gd-toast__action" data-gd-toast-action></button>' : '') +
      '<button type="button" class="gd-fb-close" data-gd-toast-close aria-label="Dismiss notification">' + svg('x') + '</button>';
    const t = { el, type, msg: message, remaining: opts.duration != null ? opts.duration : dismissMs(), held: false, timer: null, started: 0 };
    if (opts.action) { const b = el.querySelector('[data-gd-toast-action]'); b.textContent = opts.action.label || 'Undo'; t.action = opts.action; }
    el.addEventListener('pointerenter', () => hold(t, true));
    el.addEventListener('pointerleave', () => hold(t, false));
    el.addEventListener('focusin', () => hold(t, true));
    el.addEventListener('focusout', () => setTimeout(() => hold(t, false), 0));
    el._t = t;
    // a new toast gives the ones already on screen a fresh 4s, so the first is never eaten by the second
    toasts.forEach((o) => { if (o.type !== 'error') { o.remaining = dismissMs(); if (!o.held) schedule(o); } });
    toasts.push(t);
    while (toasts.length > 4) dismissToast(toasts.find((o) => o.type !== 'error') || toasts[0], true);
    h.appendChild(el); toTop(h);
    el.querySelector('.gd-toast__msg').textContent = message;
    schedule(t);
    return { dismiss: () => dismissToast(t) };
  }
  doc.addEventListener('click', (ev) => {
    const c = ev.target.closest('[data-gd-toast-close]'), a = ev.target.closest('[data-gd-toast-action]');
    const el = (c || a) && (c || a).closest('.gd-toast'); if (!el || !el._t) return;
    const t = el._t; dismissToast(t);                      // manual dismiss clears the timer
    if (a && t.action && typeof t.action.onClick === 'function') t.action.onClick();
  });

  /* ======================= banner ======================= */
  function scan(r) {
    if (r.matches && r.matches('.gd-banner[data-gd-banner-key]')) { if (store.get('gd-banner:' + r.dataset.gdBannerKey) === '1') r.hidden = true; }
    if (r.matches && r.matches('.gd-dock[data-gd-dock]')) initDock(r);
    $$('.gd-banner[data-gd-banner-key]', r).forEach((b) => { if (store.get('gd-banner:' + b.dataset.gdBannerKey) === '1') b.hidden = true; });
    $$('.gd-dock[data-gd-dock]', r).forEach(initDock);
  }
  doc.addEventListener('click', (ev) => {
    const x = ev.target.closest('[data-gd-dismiss]'); if (!x) return;
    const b = x.closest('.gd-banner'); if (!b) return;
    b.hidden = true; if (b.dataset.gdBannerKey) store.set('gd-banner:' + b.dataset.gdBannerKey, '1');
    emit(b, 'gd:dismiss', { key: b.dataset.gdBannerKey || null });
  });

  /* ======================= dialogs: modal, drawer ======================= */
  const lastFocus = new WeakMap();
  function openDialog(d) {
    if (!d || d.open) return;
    lastFocus.set(d, doc.activeElement);
    d.showModal(); if (host) toTop(host);
    emit(d, 'gd:open', {});
  }
  function closeDialog(d, v) { if (d && d.open) d.close(v); }
  doc.addEventListener('click', (ev) => {
    const o = ev.target.closest('[data-gd-modal-open]');
    if (o) { ev.preventDefault(); openDialog(doc.querySelector(o.getAttribute('data-gd-modal-open'))); return; }
    const c = ev.target.closest('[data-gd-close]');
    if (c) { const d = c.closest('dialog'); if (d) { ev.preventDefault(); closeDialog(d); } return; }
    const w = ev.target.closest('[data-gd-drawer-wide]');
    if (w) { const d = w.closest('.gd-drawer'); const wide = d.dataset.size !== 'wide'; d.dataset.size = wide ? 'wide' : ''; w.setAttribute('aria-pressed', String(wide)); return; }
    // a click that lands on the dialog itself (it has no padding) is a click on the scrim
    const t = ev.target;
    if (t.matches && t.matches('dialog.gd-modal, dialog.gd-drawer, dialog.gd-palette') && !t.hasAttribute('data-gd-static')) closeDialog(t, 'cancel');
  });
  doc.addEventListener('close', (ev) => {                      // 'close' does not bubble: capture it
    const d = ev.target; if (!d.matches || !d.matches('dialog.gd-modal, dialog.gd-drawer, dialog.gd-palette')) return;
    const f = lastFocus.get(d);
    if (f && f.isConnected && (doc.activeElement === doc.body || !doc.activeElement)) f.focus();
    emit(d, 'gd:close', { returnValue: d.returnValue });
  }, true);

  /* ======================= confirm dialog ======================= */
  function confirmDialog(o) {
    o = o || {};
    return new Promise((resolve) => {
      const d = doc.createElement('dialog');
      d.className = 'gd-modal gd-modal--sm gd-confirm';
      const id = 'gd-confirm-' + Math.random().toString(36).slice(2, 8);
      d.setAttribute('role', 'alertdialog'); d.setAttribute('aria-labelledby', id + '-t'); d.setAttribute('aria-describedby', id + '-d');
      const items = (o.items || []).map((i) => '<li>' + esc(i) + '</li>').join('');
      const danger = o.danger !== false;
      d.innerHTML = '<div class="gd-modal__head"><h2 class="gd-modal__title" id="' + id + '-t">' + esc(o.title || 'Are you sure?') + '</h2></div>' +
        '<div class="gd-modal__body" id="' + id + '-d"><p style="margin:0">' + esc(o.message || '') + '</p>' + (items ? '<ul class="gd-confirm__lost">' + items + '</ul>' : '') + '</div>' +
        '<div class="gd-modal__foot"><form method="dialog">' +
        '<button type="submit" value="cancel" class="gd-btn gd-btn--outline" autofocus>' + esc(o.cancelLabel || 'Cancel') + '</button>' +
        '<button type="submit" value="confirm" class="gd-btn ' + (danger ? 'gd-btn--danger' : 'gd-btn--primary') + '">' + esc(o.confirmLabel || 'Confirm') + '</button></form></div>';
      root().appendChild(d);
      d.addEventListener('close', () => { const ok = d.returnValue === 'confirm'; d.remove(); resolve(ok); });
      lastFocus.set(d, doc.activeElement); d.showModal(); if (host) toTop(host);
    });
  }
  doc.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-gd-confirm]'); if (!b) return;
    if (b.dataset.gdConfirmed) { delete b.dataset.gdConfirmed; return; }
    ev.preventDefault(); ev.stopImmediatePropagation();
    confirmDialog({ title: b.dataset.gdConfirm, message: b.dataset.gdConfirmBody, confirmLabel: b.dataset.gdConfirmLabel }).then((ok) => {
      if (ok) { b.dataset.gdConfirmed = '1'; b.click(); }
    });
  }, true);

  /* ======================= tooltip ======================= */
  let tip = null, tipTarget = null, tipTimer = null, tipHide = null;
  const tipSel = '[data-gd-tooltip],[data-gd-tooltip-title]';
  function tipEl() {
    if (tip && tip.isConnected) return tip;
    tip = doc.createElement('div'); tip.id = 'gd-tooltip'; tip.className = 'gd-tooltip'; tip.setAttribute('role', 'tooltip');
    mkPop(tip); root().appendChild(tip);
    tip.addEventListener('pointerenter', () => clearTimeout(tipHide));   // hoverable, so rich content can be read
    tip.addEventListener('pointerleave', hideTip);
    return tip;
  }
  function showTip(t) {
    clearTimeout(tipTimer); clearTimeout(tipHide);
    const el = tipEl(), title = t.getAttribute('data-gd-tooltip-title'), body = t.getAttribute('data-gd-tooltip-body'), meta = t.getAttribute('data-gd-tooltip-meta');
    const rich = !!(title || body || meta);
    const variant = t.getAttribute('data-gd-tooltip-variant');          // 'rail': the collapsed sidebar's own tooltip
    el.className = 'gd-tooltip' + (rich ? ' gd-tooltip--rich' : '') + (variant ? ' gd-tooltip--' + variant : '');
    el.innerHTML = rich
      ? (title ? '<span class="gd-tooltip__title">' + esc(title) + '</span>' : '') + (body ? '<span class="gd-tooltip__body">' + esc(body) + '</span>' : '') + (meta ? '<span class="gd-tooltip__meta">' + esc(meta) + '</span>' : '')
      : esc(t.getAttribute('data-gd-tooltip'));
    if (tipTarget && tipTarget !== t) tipTarget.removeAttribute('aria-describedby');
    tipTarget = t; t.setAttribute('aria-describedby', el.id);
    toTop(el);
    place(el, t, t.getAttribute('data-gd-tooltip-placement') || 'top', variant === 'rail' ? 4 : 6);
  }
  function hideTip() {
    clearTimeout(tipTimer); clearTimeout(tipHide);
    tipHide = setTimeout(() => { if (tip) { try { tip.hidePopover(); } catch (e) { /* noop */ } } if (tipTarget) { tipTarget.removeAttribute('aria-describedby'); tipTarget = null; } }, 100);
  }
  const tipOpen = () => tip && tip.isConnected && tip.matches(':popover-open');
  doc.addEventListener('pointerover', (ev) => {
    if (ev.pointerType === 'touch') return;
    const t = ev.target.closest && ev.target.closest(tipSel); if (!t || t === tipTarget && tipOpen()) return;
    clearTimeout(tipTimer); clearTimeout(tipHide);
    tipTimer = setTimeout(() => showTip(t), tipOpen() ? 0 : 300);
  });
  doc.addEventListener('pointerout', (ev) => { const t = ev.target.closest && ev.target.closest(tipSel); if (t && !t.contains(ev.relatedTarget)) hideTip(); });
  doc.addEventListener('focusin', (ev) => { const t = ev.target.closest && ev.target.closest(tipSel); if (t && t.matches(':focus-visible')) showTip(t); });
  doc.addEventListener('focusout', (ev) => { if (ev.target.closest && ev.target.closest(tipSel)) hideTip(); });
  doc.addEventListener('pointerdown', () => { if (tipOpen()) hideTip(); }, true);
  doc.addEventListener('scroll', () => { if (tipOpen()) hideTip(); }, true);
  doc.addEventListener('keydown', (ev) => { if (ev.key === 'Escape' && tipOpen()) hideTip(); });

  /* ======================= popover ======================= */
  function popClose(p, back) {
    if (!p || p.hidden) return;
    p.hidden = true;
    const tr = doc.querySelector('[data-gd-popover][aria-expanded="true"][aria-controls="' + p.id + '"]');
    if (tr) { tr.setAttribute('aria-expanded', 'false'); if (back) tr.focus(); }
  }
  function popOpen(tr, p) {
    $$('.gd-popover:not([hidden])').forEach((o) => { if (o !== p) popClose(o); });
    p.hidden = false; tr.setAttribute('aria-expanded', 'true'); tr.setAttribute('aria-controls', p.id);
    const r = p.getBoundingClientRect(); let pl = p.dataset.placement || 'bottom-start';
    if (pl.startsWith('bottom') && r.bottom > innerHeight - 8 && tr.getBoundingClientRect().top > r.height) pl = pl.replace('bottom', 'top');
    if (pl.endsWith('start') && r.right > innerWidth - 8) pl = pl.replace('start', 'end');
    p.dataset.placement = pl;
  }
  doc.addEventListener('click', (ev) => {
    const tr = ev.target.closest('[data-gd-popover]');
    if (tr) { const p = doc.querySelector(tr.getAttribute('data-gd-popover')); if (!p) return; p.hidden ? popOpen(tr, p) : popClose(p, true); return; }
    $$('.gd-popover:not([hidden])').forEach((p) => { if (!p.contains(ev.target)) popClose(p); });
  });
  doc.addEventListener('keydown', (ev) => {
    if (ev.key !== 'Escape') return;
    const open = $$('.gd-popover:not([hidden])'); if (!open.length) return;
    ev.stopPropagation(); open.forEach((p) => popClose(p, true));
  }, true);
  doc.addEventListener('focusin', (ev) => {
    $$('.gd-popover:not([hidden])').forEach((p) => { const w = p.closest('.gd-popover-wrap'); if (!(w || p).contains(ev.target)) popClose(p); });
  });

  /* ======================= docked panel ======================= */
  function setDockW(d, w, save) {
    const min = +d.dataset.gdMin || 280, max = Math.min(+d.dataset.gdMax || 640, innerWidth * 0.6);
    w = Math.round(Math.min(Math.max(min, w), Math.max(min, max)));
    d.style.setProperty('--gd-dock-w', w + 'px');
    const h = d.querySelector('[data-gd-dock-resize]');
    if (h) { h.setAttribute('aria-valuenow', w); h.setAttribute('aria-valuemin', min); h.setAttribute('aria-valuemax', Math.round(max)); }
    if (save && d.dataset.gdDock) store.set('gd-dock-w:' + d.dataset.gdDock, String(w));
    return w;
  }
  function initDock(d) {
    if (d.dataset.gdInit) return; d.dataset.gdInit = '1';
    const id = d.dataset.gdDock, w = parseFloat(store.get('gd-dock-w:' + id));
    if (w) setDockW(d, w); else setDockW(d, d.getBoundingClientRect().width || 360);
    if (store.get('gd-dock-c:' + id) === '1') setCollapsed(d, true);
    syncDirty(d, false);
  }
  function setCollapsed(d, c) {
    d.dataset.collapsed = String(c);
    const b = d.querySelector('[data-gd-dock-toggle]');
    if (b) { b.setAttribute('aria-expanded', String(!c)); b.setAttribute('aria-label', c ? 'Expand panel' : 'Collapse panel'); }
    store.set('gd-dock-c:' + d.dataset.gdDock, c ? '1' : '0');
  }
  function syncDirty(d, dirty) {
    d.toggleAttribute('data-dirty', dirty);
    $$('[data-gd-dock-apply],[data-gd-dock-reset]', d).forEach((b) => { b.disabled = !dirty; });
  }
  doc.addEventListener('click', (ev) => {
    const d = ev.target.closest('.gd-dock'); if (!d) return;
    if (ev.target.closest('[data-gd-dock-toggle]')) setCollapsed(d, d.dataset.collapsed !== 'true');
    else if (ev.target.closest('[data-gd-dock-apply]')) { emit(d, 'gd:dock-apply', {}); syncDirty(d, false); }
    else if (ev.target.closest('[data-gd-dock-reset]')) { const f = d.querySelector('form'); if (f) f.reset(); emit(d, 'gd:dock-reset', {}); syncDirty(d, false); }
  });
  ['input', 'change'].forEach((n) => doc.addEventListener(n, (ev) => { const d = ev.target.closest && ev.target.closest('.gd-dock'); if (d && d.querySelector('[data-gd-dock-apply]') && ev.target.closest('.gd-dock__body')) syncDirty(d, true); }));
  doc.addEventListener('pointerdown', (ev) => {
    const h = ev.target.closest('[data-gd-dock-resize]'); if (!h) return;
    const d = h.closest('.gd-dock'), left = d.dataset.side === 'left';
    ev.preventDefault(); d.setAttribute('data-dragging', ''); h.setPointerCapture(ev.pointerId);
    const move = (e) => { const r = d.getBoundingClientRect(); setDockW(d, left ? e.clientX - r.left : r.right - e.clientX); };
    const up = () => { h.removeEventListener('pointermove', move); h.removeEventListener('pointerup', up); h.removeEventListener('pointercancel', up); d.removeAttribute('data-dragging'); setDockW(d, d.getBoundingClientRect().width, true); };
    h.addEventListener('pointermove', move); h.addEventListener('pointerup', up); h.addEventListener('pointercancel', up);
  });
  doc.addEventListener('keydown', (ev) => {
    const h = ev.target.closest && ev.target.closest('[data-gd-dock-resize]'); if (!h) return;
    const d = h.closest('.gd-dock'), left = d.dataset.side === 'left', cur = d.getBoundingClientRect().width, step = ev.shiftKey ? 48 : 16;
    let w = null;
    if (ev.key === 'ArrowLeft') w = cur + (left ? -step : step); else if (ev.key === 'ArrowRight') w = cur + (left ? step : -step);
    else if (ev.key === 'Home') w = 0; else if (ev.key === 'End') w = 9999;
    if (w == null) return; ev.preventDefault(); setDockW(d, w, true);
  });
  // Esc deliberately does nothing on a docked panel: it is not modal.

  /* ======================= coachmark ======================= */
  let tour = null;
  function endTour(done) {
    if (!tour) return; const t = tour; tour = null;
    t.el.remove(); t.steps.forEach((s) => s.el.removeAttribute('data-gd-coach-active'));
    if (t.id) store.set('gd-tour:' + t.id, '1');
    doc.removeEventListener('keydown', t.key, true); removeEventListener('resize', t.pos); doc.removeEventListener('scroll', t.pos, true);
    if (t.from && t.from.isConnected) t.from.focus();
    emit(doc, 'gd:tour-end', { id: t.id, completed: !!done });
  }
  function startTour(id, steps, o) {
    o = o || {};
    if (!o.force && id && store.get('gd-tour:' + id) === '1') return false;
    if (tour) endTour(false);
    if (!steps) steps = $$('[data-gd-tour="' + id + '"][data-gd-coach-step]').sort((a, b) => a.dataset.gdCoachStep - b.dataset.gdCoachStep)
      .map((el) => ({ el, title: el.dataset.gdCoachTitle, body: el.dataset.gdCoachBody, image: el.dataset.gdCoachImage }));
    steps = steps.filter((s) => s.el && s.el.isConnected); if (!steps.length) return false;
    const el = doc.createElement('div'); el.className = 'gd-coach'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Guided tour');
    mkPop(el); root().appendChild(el);
    const t = tour = { id, steps, i: 0, el, from: doc.activeElement };
    t.pos = () => { const s = steps[t.i]; if (s) place(el, s.el, s.placement || 'bottom', 12); };
    t.key = (ev) => { if (ev.key === 'Escape') { ev.stopPropagation(); endTour(false); } };
    doc.addEventListener('keydown', t.key, true); addEventListener('resize', t.pos); doc.addEventListener('scroll', t.pos, true);
    el.addEventListener('click', (ev) => {
      if (ev.target.closest('[data-gd-coach-skip]')) endTour(false);
      else if (ev.target.closest('[data-gd-coach-next]')) { t.i + 1 >= steps.length ? endTour(true) : show(t.i + 1); }
    });
    function show(i) {
      t.i = i; const s = steps[i], last = i === steps.length - 1;
      steps.forEach((x) => x.el.removeAttribute('data-gd-coach-active')); s.el.setAttribute('data-gd-coach-active', '');
      s.el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      el.innerHTML = (s.image ? '<div class="gd-coach__media"><img alt="" src="' + esc(s.image) + '"></div>' : '') +
        '<div class="gd-coach__body"><h2 class="gd-coach__title" id="gd-coach-t">' + esc(s.title) + '</h2><p class="gd-coach__text" id="gd-coach-d">' + esc(s.body) + '</p></div>' +
        '<div class="gd-coach__foot"><span class="gd-coach__count" aria-live="polite">' + (i + 1) + ' of ' + steps.length + '</span>' +
        (last ? '' : '<button type="button" class="gd-btn gd-btn--ghost gd-btn--sm" data-gd-coach-skip>Skip</button>') +
        '<button type="button" class="gd-btn gd-btn--primary gd-btn--sm" data-gd-coach-next>' + (last ? 'Done' : 'Next') + '</button></div>';
      el.setAttribute('aria-labelledby', 'gd-coach-t'); el.setAttribute('aria-describedby', 'gd-coach-d');
      toTop(el); t.pos(); el.querySelector('[data-gd-coach-next]').focus({ preventScroll: true });
    }
    show(0); return true;
  }

  /* ======================= command palette ======================= */
  const pal = { el: null, items: [], rows: [], sel: 0, q: '' };
  function palBuild() {
    if (pal.el && pal.el.isConnected) return pal.el;
    const d = doc.createElement('dialog'); d.className = 'gd-palette'; d.setAttribute('aria-label', 'Command palette'); d.setAttribute('data-rows', '0');
    d.innerHTML = '<div class="gd-palette__top">' + svg('search', 20) +
      '<input class="gd-palette__input" type="search" role="combobox" aria-expanded="true" aria-controls="gd-pal-list" aria-autocomplete="list" placeholder="Search or jump to…" aria-label="Search" autocomplete="off" spellcheck="false">' +
      '<button class="gd-fb-close gd-palette__x" type="button" data-gd-close aria-label="Close search">' + svg('x') + '</button></div>' +
      '<div class="gd-palette__list" id="gd-pal-list" role="listbox"></div>' +
      '<div class="gd-palette__foot"><span><kbd class="gd-kbd">↑</kbd><kbd class="gd-kbd">↓</kbd>Select</span><span><kbd class="gd-kbd">↩</kbd>Open</span><span><kbd class="gd-kbd">esc</kbd>Close</span></div>';
    root().appendChild(d); pal.el = d;
    d.querySelector('input').addEventListener('input', (e) => palRender(e.target.value));
    d.addEventListener('keydown', (ev) => {
      if (ev.key === 'ArrowDown') { ev.preventDefault(); palMove(1); }
      else if (ev.key === 'ArrowUp') { ev.preventDefault(); palMove(-1); }
      else if (ev.key === 'Enter') { const r = pal.rows[pal.sel]; if (r) { ev.preventDefault(); r.click(); } }
    });
    d.addEventListener('click', (ev) => {
      const r = ev.target.closest('.gd-palette__row'); if (!r) return;
      const it = pal.items[+r.dataset.i];
      emit(d, 'gd:palette-select', { item: it });
      if (it && typeof it.run === 'function') { ev.preventDefault(); it.run(it); }
      closeDialog(d, 'select');
    });
    d.addEventListener('pointermove', (ev) => { const r = ev.target.closest('.gd-palette__row'); if (r) palSelect(pal.rows.indexOf(r), false); });
    return d;
  }
  const palMark = (text, terms) => {
    const low = text.toLowerCase(); let best = -1, len = 0;
    terms.forEach((t) => { const i = low.indexOf(t); if (i >= 0 && (best < 0 || i < best)) { best = i; len = t.length; } });
    return best < 0 ? esc(text) : esc(text.slice(0, best)) + '<mark>' + esc(text.slice(best, best + len)) + '</mark>' + esc(text.slice(best + len));
  };
  function palRender(q) {
    const d = pal.el, list = d.querySelector('.gd-palette__list'), terms = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const scored = pal.items.map((it, i) => {
      if (!terms.length) return { it, i, n: 1 };
      const t = it.title.toLowerCase(), h = ((it.hint || '') + ' ' + (it.group || '')).toLowerCase(); let n = 0;
      for (const w of terms) { const p = t.indexOf(w); const s = p === 0 ? 100 : p > 0 ? 70 : h.indexOf(w) >= 0 ? 30 : 0; if (!s) return { it, i, n: 0 }; n += s; }
      return { it, i, n };
    }).filter((x) => x.n > 0);
    if (terms.length) scored.sort((a, b) => b.n - a.n);
    const hits = scored.slice(0, 20);
    d.setAttribute('data-rows', String(hits.length));
    if (!hits.length) { list.innerHTML = terms.length ? '<div class="gd-palette__empty">No matches for “' + esc(q) + '”</div>' : ''; pal.rows = []; return; }
    let html = '', last = null;
    hits.forEach((x, k) => {
      const g = x.it.group || '';
      if (!terms.length && g !== last) { html += '<div class="gd-palette__group" role="presentation">' + esc(g) + '</div>'; last = g; }
      const tag = x.it.href ? 'a href="' + esc(x.it.href) + '"' : 'button type="button"';
      html += '<' + tag.split(' ')[0] + ' ' + tag.slice(tag.indexOf(' ') + 1) + ' class="gd-palette__row" role="option" id="gd-pal-' + k + '" data-i="' + x.i + '" aria-selected="false">' +
        '<span class="gd-palette__icon">' + (x.it.icon && ICON[x.it.icon] ? svg(x.it.icon) : '') + '</span><span><span class="gd-palette__title">' + palMark(x.it.title, terms) + '</span>' +
        (x.it.hint ? '<span class="gd-palette__hint">' + esc(x.it.hint) + '</span>' : '') + '</span></' + tag.split(' ')[0] + '>';
    });
    list.innerHTML = html; pal.rows = $$('.gd-palette__row', list); palSelect(0, true);
  }
  function palSelect(i, scroll) {
    if (!pal.rows.length) return; pal.sel = (i + pal.rows.length) % pal.rows.length;
    pal.rows.forEach((r, k) => r.setAttribute('aria-selected', String(k === pal.sel)));
    pal.el.querySelector('input').setAttribute('aria-activedescendant', pal.rows[pal.sel].id);
    if (scroll) pal.rows[pal.sel].scrollIntoView({ block: 'nearest' });
  }
  const palMove = (d) => palSelect(pal.sel + d, true);
  function palOpen() { const d = palBuild(); if (d.open) return; const i = d.querySelector('input'); i.value = ''; palRender(''); openDialog(d); i.focus(); }
  doc.addEventListener('click', (ev) => { const o = ev.target.closest('[data-gd-palette-open]'); if (o) { ev.preventDefault(); palOpen(); } });
  doc.addEventListener('keydown', (ev) => {
    if ((ev.metaKey || ev.ctrlKey) && ev.key.toLowerCase() === 'k' && !doc.querySelector('[data-gd-palette-off]')) {
      ev.preventDefault(); if (pal.el && pal.el.open) closeDialog(pal.el); else palOpen();
    }
  });

  /* ======================= board ======================= */
  let live = null, dragEl = null;
  const announce = (m) => { if (!live) { live = doc.createElement('div'); live.className = 'gd-sr'; live.setAttribute('aria-live', 'polite'); root().appendChild(live); } live.textContent = ''; setTimeout(() => { live.textContent = m; }, 30); };
  const boardOf = (n) => n.closest('[data-gd-board="drag"]');
  function recount(b) { $$('.gd-board__col', b).forEach((c) => { const n = c.querySelectorAll('.gd-board__card').length, k = c.querySelector('.gd-board__count'); if (k) k.textContent = String(n); }); }
  function moved(card, from) {
    const b = boardOf(card), list = card.parentElement, col = list.closest('.gd-board__col'); recount(b);
    const idx = Array.from(list.children).indexOf(card);
    emit(card, 'gd:board-move', { card, from, to: col.dataset.gdCol || col.id || null, index: idx });
    const h = col.querySelector('.gd-board__head');
    return h && h.firstElementChild ? h.firstElementChild.textContent : '';
  }
  doc.addEventListener('dragstart', (ev) => {
    const c = ev.target.closest && ev.target.closest('.gd-board__card'); if (!c || !boardOf(c)) return;
    dragEl = c; c.setAttribute('data-dragging', ''); ev.dataTransfer.effectAllowed = 'move'; try { ev.dataTransfer.setData('text/plain', c.textContent.trim().slice(0, 80)); } catch (e) { /* noop */ }
    c._from = c.closest('.gd-board__col').dataset.gdCol || null;
  });
  doc.addEventListener('dragover', (ev) => {
    if (!dragEl) return; const l = ev.target.closest('.gd-board__list'); if (!l || boardOf(l) !== boardOf(dragEl)) return;
    ev.preventDefault(); ev.dataTransfer.dropEffect = 'move';
    const after = Array.from(l.querySelectorAll('.gd-board__card:not([data-dragging])')).find((c) => { const r = c.getBoundingClientRect(); return ev.clientY < r.top + r.height / 2; });
    after ? l.insertBefore(dragEl, after) : l.appendChild(dragEl);
  });
  doc.addEventListener('dragend', () => { if (!dragEl) return; const c = dragEl; dragEl = null; c.removeAttribute('data-dragging'); moved(c, c._from); });
  doc.addEventListener('keydown', (ev) => {
    const c = ev.target.closest && ev.target.closest('.gd-board__card'); if (!c || !ev.altKey || !boardOf(c) || !ev.key.startsWith('Arrow')) return;
    const list = c.parentElement, cols = $$('.gd-board__col', boardOf(c)), ci = cols.indexOf(list.closest('.gd-board__col')), from = cols[ci].dataset.gdCol || null;
    if (ev.key === 'ArrowLeft' || ev.key === 'ArrowRight') { const n = cols[ci + (ev.key === 'ArrowLeft' ? -1 : 1)]; if (!n) return; n.querySelector('.gd-board__list').appendChild(c); }
    else { const sib = ev.key === 'ArrowUp' ? c.previousElementSibling : c.nextElementSibling; if (!sib) return; ev.key === 'ArrowUp' ? list.insertBefore(c, sib) : list.insertBefore(sib, c); }
    ev.preventDefault(); c.focus();
    const name = moved(c, from), pos = Array.from(c.parentElement.children).indexOf(c) + 1;
    announce('Moved to ' + name + ', position ' + pos + ' of ' + c.parentElement.children.length);
  });

  /* ======================= init ======================= */
  GD.feedback = {
    toast, confirm: confirmDialog, open: openDialog, close: closeDialog, tour: startTour, scan,
    palette: { open: palOpen, close: () => pal.el && closeDialog(pal.el), setItems: (a) => { pal.items = a || []; } }
  };
  GD.toast = toast; GD.confirm = confirmDialog;
  const init = () => { scan(doc); new MutationObserver((ms) => ms.forEach((m) => m.addedNodes.forEach((n) => n.nodeType === 1 && scan(n)))).observe(doc.body, { childList: true, subtree: true }); };
  doc.readyState === 'loading' ? doc.addEventListener('DOMContentLoaded', init) : init();
})();
