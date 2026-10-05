/* Gushwork dashboard — 50 cards & data display behaviour. Vanilla ES2020, delegated on document.
   Hooks:
     data-gd-toggle            on a <button aria-expanded aria-controls="id">: flips aria-expanded and the [hidden] of #id.
                               Used by collapsible card, status-list, timeline comment, checklist step.
                               data-gd-accordion="<group>" on the button: opening it closes other open toggles with the same group.
     data-gd-legend            on the .gd-legend list: its button.gd-legend__item[aria-pressed] toggle a series. Fires
                               "gd:legend-toggle" on the list {detail:{key, on}}. The last visible series cannot be hidden.
                               data-key on the button names the series.
     data-gd-metric-strip      on the .gd-metric-strip (role=tablist): arrows/Home/End move, Enter/Space/click select.
                               Fires "gd:metric-select" {detail:{id}}. Items with aria-controls show/hide that panel.
     data-gd-tag-remove        on the remove button inside .gd-tag: removes the tag. Fires cancelable "gd:tag-remove"
                               {detail:{label}} on the tag first (preventDefault keeps it).
     data-gd-step-done         on a button inside a checklist step detail: marks the step done, opens the next undone
                               step, updates [data-gd-checklist-count] ("2 of 5 complete") and the progress bar --gd-pct.
     data-gd-avatar="seed"     on .gd-avatar (optionally data-level="team|admin|owner"): renders the generated 3x3 mark.
   Exposes window.GD.data = { renderAvatars(root), avatarSVG(seed) }. */
(function () {
  'use strict';
  window.GD = window.GD || {};
  var doc = document;

  /* ---- avatar: same patterns and FNV-1a hash as web/shell.js ------------- */
  var TONES = ['blue', 'red', 'yellow', 'orange', 'green'];
  var PATTERNS = [190, 341, 151, 403, 186, 149, 343, 189, 179, 307, 95, 159];
  function idx(seed) {
    var h = 2166136261, s = String(seed || '').toLowerCase();
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = (h + (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24)) >>> 0; }
    return h % PATTERNS.length;
  }
  function avatarSVG(seed) {
    var m = PATTERNS[idx(seed)], d = '';
    for (var i = 0; i < 9; i++) if (m >> i & 1) d += '<rect class="gd-avatar__dot" x="' + (11 + (i % 3) * 7) + '" y="' + (11 + Math.floor(i / 3) * 7) + '" width="5" height="5" rx="1.5"/>';
    return '<svg viewBox="0 0 40 40" aria-hidden="true" focusable="false"><rect class="gd-avatar__tile" width="40" height="40"/>' + d + '</svg>';
  }
  function renderAvatars(root) {
    (root || doc).querySelectorAll('.gd-avatar[data-gd-avatar]').forEach(function (el) {
      if (el.querySelector('svg')) return;
      var lv = el.getAttribute('data-level');
      if (lv) el.classList.add('gd-avatar--' + lv);
      /* a person outside a group gets a stable tone from their seed; inside a group the CSS hands them out in order */
      if (!el.hasAttribute('data-tone') && (!lv || lv === 'team') && !(el.parentNode && el.parentNode.classList && el.parentNode.classList.contains('gd-avatar-group'))) el.setAttribute('data-tone', TONES[idx(el.getAttribute('data-gd-avatar')) % TONES.length]);
      el.insertAdjacentHTML('afterbegin', avatarSVG(el.getAttribute('data-gd-avatar')));
    });
  }
  window.GD.data = { renderAvatars: renderAvatars, avatarSVG: avatarSVG };
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', function () { renderAvatars(); }); else renderAvatars();
  if (window.MutationObserver) new MutationObserver(function (ms) {
    for (var i = 0; i < ms.length; i++) if (ms[i].addedNodes.length) { renderAvatars(); break; }
  }).observe(doc.documentElement, { childList: true, subtree: true });

  /* ---- disclosure --------------------------------------------------------- */
  function setOpen(btn, open) {
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    var t = btn.getRootNode().getElementById(btn.getAttribute('aria-controls'));
    if (t) t.hidden = !open;
  }
  /* ---- checklist ---------------------------------------------------------- */
  function updateChecklist(list) {
    var steps = list.querySelectorAll('.gd-checklist__step'), n = 0;
    steps.forEach(function (s) { if (s.getAttribute('data-state') === 'done') n++; });
    var root = list.closest('.gd-checklist') || list.parentNode;
    var c = root.querySelector('[data-gd-checklist-count]');
    if (c) c.textContent = n + ' of ' + steps.length + ' complete';
    var bar = root.querySelector('.gd-progress-bar');
    if (bar) { var p = Math.round(n / steps.length * 100); bar.style.setProperty('--gd-pct', p); bar.setAttribute('aria-valuenow', p); }
  }

  doc.addEventListener('click', function (e) {
    var t = e.composedPath ? e.composedPath()[0] : e.target, b;
    if (!t.closest) t = t.parentNode;   /* composedPath()[0] sees inside shadow roots (the library renders previews in one) */

    if ((b = t.closest('[data-gd-toggle]'))) {
      var open = b.getAttribute('aria-expanded') !== 'true', g = b.getAttribute('data-gd-accordion');
      if (open && g) b.getRootNode().querySelectorAll('[data-gd-toggle][data-gd-accordion="' + g + '"][aria-expanded="true"]').forEach(function (o) { if (o !== b) setOpen(o, false); });
      setOpen(b, open);
      return;
    }

    if ((b = t.closest('.gd-legend[data-gd-legend] button.gd-legend__item'))) {
      var list = b.closest('.gd-legend'), on = b.getAttribute('aria-pressed') !== 'true';
      if (!on && list.querySelectorAll('button.gd-legend__item[aria-pressed="true"]').length < 2) return;
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      list.dispatchEvent(new CustomEvent('gd:legend-toggle', { bubbles: true, detail: { key: b.getAttribute('data-key'), on: on } }));
      return;
    }

    if ((b = t.closest('[data-gd-metric-strip] [role="tab"]'))) { selectMetric(b); return; }

    if ((b = t.closest('.gd-tag [data-gd-tag-remove]'))) {
      var tag = b.closest('.gd-tag'), lab = tag.querySelector('.gd-tag__label');
      var ev = new CustomEvent('gd:tag-remove', { bubbles: true, cancelable: true, detail: { label: lab ? lab.textContent : '' } });
      if (tag.dispatchEvent(ev)) tag.remove();
      return;
    }

    if ((b = t.closest('[data-gd-step-done]'))) {
      var step = b.closest('.gd-checklist__step'), steps = step.parentNode;
      step.setAttribute('data-state', 'done');
      var th = step.querySelector('[data-gd-toggle]'); if (th) setOpen(th, false);
      var next = steps.querySelector('.gd-checklist__step:not([data-state="done"])');
      steps.querySelectorAll('.gd-checklist__step[data-state="current"]').forEach(function (s) { s.setAttribute('data-state', 'todo'); });
      if (next) { next.setAttribute('data-state', 'current'); var nt = next.querySelector('[data-gd-toggle]'); if (nt) setOpen(nt, true); }
      updateChecklist(steps);
    }
  });

  /* ---- metric strip ------------------------------------------------------- */
  function selectMetric(tab) {
    var strip = tab.closest('[data-gd-metric-strip]');
    strip.querySelectorAll('[role="tab"]').forEach(function (x) {
      var on = x === tab;
      x.setAttribute('aria-selected', on ? 'true' : 'false');
      x.tabIndex = on ? 0 : -1;
      var p = x.getAttribute('aria-controls') && x.getRootNode().getElementById(x.getAttribute('aria-controls'));
      if (p) p.hidden = !on;
    });
    strip.dispatchEvent(new CustomEvent('gd:metric-select', { bubbles: true, detail: { id: tab.id || tab.getAttribute('data-id') } }));
  }
  doc.addEventListener('keydown', function (e) {
    var o = e.composedPath ? e.composedPath()[0] : e.target;
    var tab = o.closest && o.closest('[data-gd-metric-strip] [role="tab"]');
    if (!tab) return;
    var tabs = Array.prototype.slice.call(tab.parentNode.querySelectorAll('[role="tab"]:not([aria-disabled="true"])')), i = tabs.indexOf(tab), n;
    if (e.key === 'ArrowRight') n = tabs[(i + 1) % tabs.length];
    else if (e.key === 'ArrowLeft') n = tabs[(i - 1 + tabs.length) % tabs.length];
    else if (e.key === 'Home') n = tabs[0];
    else if (e.key === 'End') n = tabs[tabs.length - 1];
    else return;
    e.preventDefault(); n.focus(); selectMetric(n);
  });
})();
