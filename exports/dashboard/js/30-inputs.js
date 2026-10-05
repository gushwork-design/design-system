/* ============================================================================
   Gushwork dashboard — 30 inputs (select, multi-select, combobox, search clear, unsaved-changes bar,
   date-range-picker, time-range-bar, query-builder). Vanilla ES2020, delegated on document. Exposes GD.inputs.
   Needs 20-actions.js (GD.actions.place / .current).

   Hooks
     data-gd-select | data-gd-combo | data-gd-multi   on the wrapper (.gd-select / .gd-combo / .gd-multi-wrap).
        Parts: .gd-input (shell: a button for select, holds <input class="gd-input__el"> for combo/multi), .gd-menu[role=listbox]
        > [role=option][data-value], and an <input type="hidden" name> that carries the value (multi: comma-separated).
        DOM focus stays on the trigger/input; the highlighted option is aria-activedescendant + .is-active.
        Event on the wrapper: gd:change {value, label} (multi: {value:[...], labels:[...]}); a native "change" is also fired on the hidden input.
     data-gd-clear              on a button inside a search field: empties the input, fires "input", refocuses. Esc in the field does the same.
     data-indeterminate         on input[type=checkbox]: sets the .indeterminate property (CSS cannot).
     data-gd-form               on a container: tracks dirty state; shows its [data-gd-savebar] while any control differs from its default.
        [data-gd-reset] restores defaults (event gd:reset). [data-gd-save] fires cancelable gd:save {form}; unless prevented the current values become the new defaults.
     data-gd-drp                on .gd-drp: attrs data-from, data-to (ISO), data-gd-preset, data-max="today"|ISO, data-today (test override).
        data-gd-drp-trigger     on the trigger button (a .gd-drp--pop sibling opens). [data-preset] buttons, [data-gd-drp-nav="-1|1"], [data-gd-drp-apply], [data-gd-drp-cancel].
        Event on the picker (bubbles): gd:range {preset, from, to, days} (inside a time range bar it is gd:range-pick and the bar emits the combined gd:range)
     data-gd-rangebar           on .gd-rangebar: radiogroup of presets (data-value today|yesterday|7d|30d|3m|6m|12m|custom),
        [data-gd-key=granularity|compare] selects, [data-gd-key=live] checkbox. Event gd:range {preset, from, to, granularity, compare, live}
     data-gd-qb                 on .gd-qb: sections .gd-qb__sec[data-gd-qb-sec="name"][data-max]; triggers data-gd-menu open the section menu.
        [data-gd-qb-action=save|compare] buttons. Events: gd:query {query}, gd:query-action {action, query}
   ============================================================================ */
GD.inputs = GD.inputs || {};
(() => {
  const I = GD.inputs, A = GD.actions;
  const $$ = (r, s) => [...r.querySelectorAll(s)];
  const emit = (el, name, detail, cancelable) => el.dispatchEvent(new CustomEvent(name, { bubbles: true, cancelable: !!cancelable, detail }));
  const CHECK = '<svg class="gd-menu__check" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M232.49,80.49l-128,128a12,12,0,0,1-17,0l-56-56a12,12,0,1,1,17-17L96,183,215.51,63.51a12,12,0,0,1,17,17Z"/></svg>';
  const XICON = '<svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true" width="10" height="10"><path d="M208.49,191.51a12,12,0,0,1-17,17L128,145,64.49,208.49a12,12,0,0,1-17-17L111,128,47.51,64.49a12,12,0,0,1,17-17L128,111l63.51-63.52a12,12,0,0,1,17,17L145,128Z"/></svg>';
  const CARET = '<svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true" width="12" height="12"><path d="M213.66,101.66l-80,80a8,8,0,0,1-11.32,0l-80-80A8,8,0,0,1,53.66,90.34L128,164.69l74.34-74.35a8,8,0,0,1,11.32,11.32Z"/></svg>';
  let uid = 0;

  /* ---------------------------------------------------------------- listbox: select / combobox / multi */
  const ROOTS = '[data-gd-select],[data-gd-combo],[data-gd-multi]';
  const kind = (r) => (r.hasAttribute('data-gd-multi') ? 'multi' : r.hasAttribute('data-gd-combo') ? 'combo' : 'select');
  const parts = (r) => ({
    menu: r.querySelector('.gd-menu'), shell: r.querySelector('.gd-input'), hidden: r.querySelector('input[type="hidden"]'),
    ctl: r.querySelector('button.gd-input, input.gd-input__el, .gd-input input.gd-input__el'), value: r.querySelector('.gd-select__value'),
  });
  const opts = (r, all) => $$(parts(r).menu, '[role="option"]').filter((o) => all || (!o.hidden && o.getAttribute('aria-disabled') !== 'true'));
  const isOpen = (r) => !parts(r).menu.hidden;

  function prep(r) {
    if (r._ready) return; r._ready = true;
    const p = parts(r);
    p.menu.setAttribute('role', 'listbox'); if (kind(r) === 'multi') p.menu.setAttribute('aria-multiselectable', 'true');
    if (!p.menu.id) p.menu.id = 'gd-lb-' + (++uid);
    p.ctl.setAttribute('role', 'combobox'); p.ctl.setAttribute('aria-controls', p.menu.id); p.ctl.setAttribute('aria-expanded', 'false'); p.ctl.setAttribute('aria-haspopup', 'listbox');
    if (kind(r) !== 'select') p.ctl.setAttribute('aria-autocomplete', 'list');
    opts(r, true).forEach((o, i) => { if (!o.id) o.id = p.menu.id + '-o' + i; if (!o.querySelector('.gd-menu__check')) o.insertAdjacentHTML('beforeend', CHECK); });
    if (p.hidden) p.hidden.dataset.gdInitial = p.hidden.value;
    r._initial = I.getValue(r);
  }
  I.getValue = (r) => {
    const sel = opts(r, true).filter((o) => o.getAttribute('aria-selected') === 'true');
    return kind(r) === 'multi' ? sel.map((o) => o.dataset.value) : (sel[0]?.dataset.value ?? '');
  };
  function render(r) {
    const p = parts(r), sel = opts(r, true).filter((o) => o.getAttribute('aria-selected') === 'true'), k = kind(r);
    const label = (o) => o.querySelector('.gd-menu__text > :first-child, .gd-menu__label-text')?.textContent.trim() || o.dataset.label || o.textContent.trim();
    if (k === 'select') {
      const v = p.value; if (v) { if (sel[0]) { v.textContent = label(sel[0]); v.removeAttribute('data-empty'); } else { v.textContent = r.dataset.placeholder || 'Select'; v.setAttribute('data-empty', ''); } }
    } else if (k === 'combo') { if (document.activeElement !== p.ctl || !isOpen(r)) p.ctl.value = sel[0] ? label(sel[0]) : ''; }
    else {
      $$(p.shell, '.gd-input__chip').forEach((c) => c.remove());
      sel.forEach((o) => p.ctl.insertAdjacentHTML('beforebegin', `<span class="gd-input__chip" data-value="${o.dataset.value}"><span>${label(o)}</span><button type="button" tabindex="-1" aria-label="Remove ${label(o)}" data-gd-chip-x>${XICON}</button></span>`));
      p.ctl.placeholder = sel.length ? '' : (r.dataset.placeholder || '');
    }
    if (p.hidden) p.hidden.value = k === 'multi' ? sel.map((o) => o.dataset.value).join(',') : (sel[0]?.dataset.value ?? '');
  }
  I.setValue = (r, v, quiet) => {
    prep(r); const k = kind(r), want = k === 'multi' ? [].concat(v) : [v];
    opts(r, true).forEach((o) => o.setAttribute('aria-selected', want.includes(o.dataset.value)));
    render(r);
    if (!quiet) fire(r);
  };
  function fire(r) {
    const p = parts(r), sel = opts(r, true).filter((o) => o.getAttribute('aria-selected') === 'true');
    const lab = (o) => o.querySelector('.gd-menu__text > :first-child')?.textContent.trim() || o.textContent.trim();
    emit(r, 'gd:change', kind(r) === 'multi' ? { value: sel.map((o) => o.dataset.value), labels: sel.map(lab) } : { value: sel[0]?.dataset.value ?? '', label: sel[0] ? lab(sel[0]) : '' });
    p.hidden?.dispatchEvent(new Event('change', { bubbles: true }));
  }
  function setActive(r, o) {
    const p = parts(r); opts(r, true).forEach((x) => x.classList.toggle('is-active', x === o));
    if (o) { p.ctl.setAttribute('aria-activedescendant', o.id); o.scrollIntoView({ block: 'nearest' }); } else p.ctl.removeAttribute('aria-activedescendant');
  }
  function openLB(r, focusSel) {
    prep(r); const p = parts(r); if (isOpen(r) || p.ctl.disabled || p.ctl.getAttribute('aria-disabled') === 'true') return;
    closeAll(r);
    p.menu.hidden = false; p.ctl.setAttribute('aria-expanded', 'true'); r.classList.add('is-open');
    if (kind(r) !== 'select') filter(r, '');
    A.place(p.menu, p.shell, { matchWidth: true });
    const list = opts(r); setActive(r, (focusSel !== false && list.find((o) => o.getAttribute('aria-selected') === 'true')) || list[0]);
  }
  function closeLB(r) {
    if (!r._ready || !isOpen(r)) return; const p = parts(r);
    p.menu.hidden = true; A.unplace(p.menu); p.ctl.setAttribute('aria-expanded', 'false'); r.classList.remove('is-open'); setActive(r, null);
    if (kind(r) === 'combo') render(r); if (kind(r) === 'multi') p.ctl.value = '';
  }
  function closeAll(except) { $$(document, ROOTS).forEach((r) => { if (r !== except) closeLB(r); }); }
  function filter(r, q) {
    const p = parts(r); q = q.trim().toLowerCase();
    opts(r, true).forEach((o) => { o.hidden = !!q && !o.textContent.toLowerCase().includes(q); });
    $$(p.menu, '.gd-menu__sep, .gd-menu__label').forEach((x) => (x.hidden = !!q));
    let empty = p.menu.querySelector('.gd-menu__empty');
    if (!empty) { empty = document.createElement('div'); empty.className = 'gd-menu__empty'; empty.textContent = 'No matches'; p.menu.append(empty); }
    empty.hidden = opts(r).length > 0;
    A.place(p.menu, p.shell, { matchWidth: true });
    setActive(r, opts(r)[0]);
  }
  function choose(r, o) {
    if (!o || o.getAttribute('aria-disabled') === 'true') return; const p = parts(r), k = kind(r);
    if (p.hidden && !p.hidden.dataset.gdInitial) p.hidden.dataset.gdInitial = p.hidden.value;
    if (k === 'multi') { o.setAttribute('aria-selected', o.getAttribute('aria-selected') !== 'true'); p.ctl.value = ''; filter(r, ''); setActive(r, o); }
    else { opts(r, true).forEach((x) => x.setAttribute('aria-selected', x === o)); }
    render(r); fire(r);
    if (k !== 'multi') { closeLB(r); p.ctl.focus(); }
  }

  document.addEventListener('mousedown', (e) => {
    const r = e.target.closest(ROOTS);
    if (r && e.target.closest('.gd-menu')) { e.preventDefault(); return; }
    closeAll(r);
  }, true);
  document.addEventListener('click', (e) => {
    const x = e.target.closest('[data-gd-chip-x]');
    if (x) { const r = x.closest(ROOTS); const v = x.closest('.gd-input__chip').dataset.value; r.querySelector(`[role="option"][data-value="${CSS.escape(v)}"]`).setAttribute('aria-selected', 'false'); render(r); fire(r); return; }
    const r = e.target.closest(ROOTS); if (!r) return; prep(r);
    const o = e.target.closest('[role="option"]');
    if (o && parts(r).menu.contains(o)) { choose(r, o); return; }
    const p = parts(r);
    if (e.target.closest('.gd-combo__toggle')) { isOpen(r) ? closeLB(r) : (p.ctl.focus(), openLB(r)); return; }
    if (e.target.closest('.gd-input')) { if (kind(r) === 'select') (isOpen(r) ? closeLB(r) : openLB(r)); else { p.ctl.focus(); if (!isOpen(r)) openLB(r, kind(r) === 'combo'); } }
  });
  document.addEventListener('input', (e) => {
    const r = e.target.closest?.('[data-gd-combo],[data-gd-multi]'); if (!r || e.target.type === 'hidden') return;
    prep(r); if (!isOpen(r)) openLB(r, false); filter(r, e.target.value);
  });
  document.addEventListener('focusout', (e) => {
    const r = e.target.closest?.(ROOTS); if (r && r._ready && !r.contains(e.relatedTarget)) closeLB(r);
  });
  addEventListener('resize', () => closeAll());
  addEventListener('scroll', (e) => { if (!e.target.closest?.('.gd-menu')) closeAll(); }, true);

  document.addEventListener('keydown', (e) => {
    const r = e.target.closest?.(ROOTS); if (!r) return;
    prep(r); const p = parts(r); if (e.target !== p.ctl) return;
    const k = e.key, open = isOpen(r), list = opts(r), cur = list.findIndex((o) => o.classList.contains('is-active'));
    const move = (n) => { e.preventDefault(); const l = opts(r); setActive(r, l[(n + l.length) % l.length]); };
    if ((k === 'ArrowDown' || k === 'ArrowUp') && !open) { e.preventDefault(); openLB(r); }
    else if (k === 'ArrowDown') move(cur + 1);
    else if (k === 'ArrowUp') move(cur - 1);
    else if (k === 'Home' && open && kind(r) === 'select') move(0);
    else if (k === 'End' && open && kind(r) === 'select') move(list.length - 1);
    else if (k === 'Escape') { if (open) { e.preventDefault(); closeLB(r); } }
    else if (k === 'Tab') closeLB(r);
    else if (k === 'Enter' || (k === ' ' && kind(r) === 'select')) {
      if (open) { e.preventDefault(); choose(r, list[cur]); } else if (kind(r) === 'select') { e.preventDefault(); openLB(r); }
    } else if (k === 'Backspace' && kind(r) === 'multi' && !p.ctl.value) {
      const last = opts(r, true).filter((o) => o.getAttribute('aria-selected') === 'true').pop(); if (last) { last.setAttribute('aria-selected', 'false'); render(r); fire(r); }
    } else if (kind(r) === 'select' && k.length === 1 && /\S/.test(k)) { // type-ahead
      const l = opts(r), n = l.findIndex((o, j) => j > cur && o.textContent.trim().toLowerCase().startsWith(k.toLowerCase()));
      const m = n < 0 ? l.findIndex((o) => o.textContent.trim().toLowerCase().startsWith(k.toLowerCase())) : n; if (m >= 0) { if (!open) openLB(r); setActive(r, l[m]); }
    }
  });

  /* ---------------------------------------------------------------- search clear, indeterminate */
  document.addEventListener('click', (e) => {
    const c = e.target.closest('[data-gd-clear]'); if (!c) return;
    const el = c.closest('.gd-input').querySelector('.gd-input__el'); el.value = ''; el.dispatchEvent(new Event('input', { bubbles: true })); el.focus();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || !e.target.matches?.('.gd-input--search .gd-input__el') || !e.target.value) return;
    e.preventDefault(); e.target.value = ''; e.target.dispatchEvent(new Event('input', { bubbles: true }));
  });
  const syncIndet = (root = document) => $$(root, 'input[data-indeterminate]').forEach((i) => (i.indeterminate = true));
  I.sync = syncIndet; syncIndet();
  new MutationObserver((ms) => { if (ms.some((m) => m.type === 'childList' || m.attributeName === 'data-indeterminate')) syncIndet(); })
    .observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ['data-indeterminate'] });

  /* ---------------------------------------------------------------- unsaved changes bar */
  const ctls = (f) => $$(f, 'input,textarea,select').filter((c) => !c.closest('.gd-savebar') && !c.closest('.gd-drp') && c.type !== 'button' && c.type !== 'submit' && !c.matches('.gd-combo input.gd-input__el, .gd-multi-wrap input.gd-input__el'));
  const differs = (c) => c.type === 'checkbox' || c.type === 'radio' ? c.checked !== c.defaultChecked
    : c.type === 'hidden' ? (c.dataset.gdInitial !== undefined && c.value !== c.dataset.gdInitial)
    : c.tagName === 'SELECT' ? [...c.options].some((o) => o.selected !== o.defaultSelected) : c.value !== c.defaultValue;
  const dirty = (f) => ctls(f).some(differs);
  const paint = (f) => { const b = f.querySelector('[data-gd-savebar]'); if (b) b.hidden = !dirty(f); };
  const track = (e) => { const f = e.target.closest?.('[data-gd-form]'); if (f) paint(f); };
  document.addEventListener('input', track); document.addEventListener('change', track);
  document.addEventListener('click', (e) => {
    const f = e.target.closest('[data-gd-form]'); if (!f) return;
    if (e.target.closest('[data-gd-reset]')) {
      ctls(f).forEach((c) => { if (c.type === 'hidden') { if (c.dataset.gdInitial !== undefined) I.setValue(c.closest(ROOTS), kind(c.closest(ROOTS)) === 'multi' ? (c.dataset.gdInitial ? c.dataset.gdInitial.split(',') : []) : c.dataset.gdInitial, true); } });
      (f.tagName === 'FORM' ? f : null)?.reset();
      ctls(f).filter((c) => c.type !== 'hidden').forEach((c) => { if (c.type === 'checkbox' || c.type === 'radio') c.checked = c.defaultChecked; else if (c.tagName !== 'SELECT') c.value = c.defaultValue; else [...c.options].forEach((o) => (o.selected = o.defaultSelected)); });
      paint(f); emit(f, 'gd:reset', { form: f });
    } else if (e.target.closest('[data-gd-save]')) {
      if (emit(f, 'gd:save', { form: f }, true) === false) return; I.markSaved(f);
    }
  });
  I.markSaved = (f) => { ctls(f).forEach((c) => { if (c.type === 'checkbox' || c.type === 'radio') c.defaultChecked = c.checked; else if (c.type === 'hidden') c.dataset.gdInitial = c.value; else if (c.tagName === 'SELECT') [...c.options].forEach((o) => (o.defaultSelected = o.selected)); else c.defaultValue = c.value; }); paint(f); };
  I.isDirty = dirty;

  /* ---------------------------------------------------------------- dates */
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const parse = (s) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ''); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; };
  const addD = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  const addM = (d, n) => new Date(d.getFullYear(), d.getMonth() + n, d.getDate());
  const fmt = (d, y) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', ...(y ? { year: 'numeric' } : {}) });
  const days = (a, b) => Math.round((b - a) / 864e5) + 1;
  const label = (a, b) => (iso(a) === iso(b) ? fmt(a, 1) : a.getFullYear() === b.getFullYear() ? `${fmt(a)} – ${fmt(b, 1)}` : `${fmt(a, 1)} – ${fmt(b, 1)}`);
  I.rangeFor = (preset, today = new Date()) => {
    const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    switch (preset) {
      case 'today': return [t, t]; case 'yesterday': return [addD(t, -1), addD(t, -1)];
      case '7d': return [addD(t, -6), t]; case '14d': return [addD(t, -13), t]; case '28d': return [addD(t, -27), t]; case '30d': return [addD(t, -29), t]; case '90d': return [addD(t, -89), t];
      case '3m': return [addD(addM(t, -3), 1), t]; case '6m': return [addD(addM(t, -6), 1), t]; case '12m': return [addD(addM(t, -12), 1), t];
      case 'qtd': return [new Date(t.getFullYear(), Math.floor(t.getMonth() / 3) * 3, 1), t];
      default: return null;
    }
  };
  const todayOf = (r) => parse(r.dataset.today) || new Date();
  const chev = (n) => `<svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true" width="16" height="16"><path d="${n < 0 ? 'M165.66,202.34a8,8,0,0,1-11.32,11.32l-80-80a8,8,0,0,1,0-11.32l80-80a8,8,0,0,1,11.32,11.32L91.31,128Z' : 'M181.66,133.66l-80,80a8,8,0,0,1-11.32-11.32L164.69,128,90.34,53.66a8,8,0,0,1,11.32-11.32l80,80A8,8,0,0,1,181.66,133.66Z'}"/></svg>`;

  function drp(r) {
    if (r._s) return r._s;
    const t = todayOf(r), from = parse(r.dataset.from) || addD(t, -29), to = parse(r.dataset.to) || t;
    const s = r._s = { from, to, preset: r.dataset.gdPreset || 'custom', pending: null, hover: null, view: new Date(to.getFullYear(), to.getMonth() - 1, 1), t };
    return s;
  }
  function maxOf(r) { const m = r.dataset.max; return m === 'today' ? todayOf(r) : parse(m); }
  function drpRender(r) {
    const s = drp(r), mx = maxOf(r); let lo = s.from, hi = s.to;
    if (s.pending && s.hover) { lo = s.pending < s.hover ? s.pending : s.hover; hi = s.pending < s.hover ? s.hover : s.pending; }
    const months = $$(r, '.gd-drp__month');
    months.forEach((el, i) => {
      const v = new Date(s.view.getFullYear(), s.view.getMonth() + i, 1), n = new Date(v.getFullYear(), v.getMonth() + 1, 0).getDate();
      let h = `<div class="gd-drp__mh"><button type="button" class="gd-iconbtn gd-iconbtn--sm gd-drp__nav${i === 0 ? ' is-on' : ''}" data-gd-drp-nav="-1" aria-label="Previous month">${chev(-1)}</button><div class="gd-drp__mt" aria-live="polite">${v.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</div><button type="button" class="gd-iconbtn gd-iconbtn--sm gd-drp__nav${i === months.length - 1 ? ' is-on' : ''}" data-gd-drp-nav="1" aria-label="Next month">${chev(1)}</button></div><div class="gd-drp__grid" role="group" aria-label="${v.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}">`;
      h += 'SMTWTFS'.split('').map((c, k) => `<div class="gd-drp__dow" aria-hidden="true" title="${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][k]}">${c}</div>`).join('');
      h += '<div class="gd-drp__day" aria-hidden="true"></div>'.repeat(v.getDay());
      for (let d = 1; d <= n; d++) {
        const dt = new Date(v.getFullYear(), v.getMonth(), d), k = iso(dt); let rg = '';
        if (dt >= lo && dt <= hi) rg = +lo === +hi ? 'single' : +dt === +lo ? 'start' : +dt === +hi ? 'end' : 'mid';
        const today = +dt === +s.t;
        h += `<div class="gd-drp__day"${rg ? ` data-range="${rg}"` : ''}><button type="button" data-date="${k}"${today ? ' aria-current="date"' : ''}${rg && rg !== 'mid' ? ' aria-pressed="true"' : ''}${mx && dt > mx ? ' disabled' : ''} aria-label="${dt.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}">${d}</button></div>`;
      }
      el.innerHTML = h + '</div>';
    });
    const fl = $$(r, '.gd-drp__fields input'); if (fl[0]) { fl[0].value = fmt(lo, 1); fl[1].value = fmt(hi, 1); }
    const sum = r.querySelector('.gd-drp__sum'); if (sum) sum.textContent = `${label(lo, hi)} · ${days(lo, hi)} day${days(lo, hi) > 1 ? 's' : ''}`;
    $$(r, '[data-preset]').forEach((b) => { b.setAttribute('aria-pressed', b.dataset.preset === s.preset); });
  }
  function drpOpen(r, anchor) {
    drp(r); drpRender(r); r._anchor = anchor; r.hidden = false; A.place(r, anchor, { end: false });
    anchor.setAttribute('aria-expanded', 'true');
    (r.querySelector('[data-preset][aria-pressed="true"]') || r.querySelector('[data-preset]'))?.focus();
  }
  function drpClose(r, refocus, applied) {
    if (!r.classList.contains('gd-drp--pop') || r.hidden) return; r.hidden = true; A.unplace(r);
    r._anchor?.setAttribute('aria-expanded', 'false'); if (refocus) r._anchor?.focus();
    delete r._s; // discard uncommitted edits
    if (!applied) emit(r, 'gd:range-cancel', {});
  }
  function drpApply(r) {
    const s = drp(r); if (s.pending) s.pending = null;
    r.dataset.from = iso(s.from); r.dataset.to = iso(s.to); r.dataset.gdPreset = s.preset;
    const lbl = r.parentElement.querySelector('.gd-drp__label'); if (lbl) lbl.textContent = label(s.from, s.to);
    const detail = { preset: s.preset, from: iso(s.from), to: iso(s.to), days: days(s.from, s.to) };
    drpClose(r, true, true); emit(r, r.closest('[data-gd-rangebar]') ? 'gd:range-pick' : 'gd:range', detail); // inside a time range bar the bar re-emits one combined gd:range
  }
  document.addEventListener('click', (e) => {
    const tr = e.target.closest('[data-gd-drp-trigger]');
    if (tr) { const r = tr.parentElement.querySelector('.gd-drp'); if (r.hidden) drpOpen(r, tr); else drpClose(r, false); return; }
    const r = e.target.closest('[data-gd-drp]'); if (!r) return; const s = drp(r);
    const pr = e.target.closest('[data-preset]'), day = e.target.closest('[data-date]'), nav = e.target.closest('[data-gd-drp-nav]');
    if (pr) {
      if (pr.dataset.preset !== 'custom') { const x = I.rangeFor(pr.dataset.preset, s.t); s.from = x[0]; s.to = x[1]; s.view = new Date(s.to.getFullYear(), s.to.getMonth() - 1, 1); }
      s.preset = pr.dataset.preset; s.pending = null; drpRender(r);
    } else if (day) {
      const d = parse(day.dataset.date); s.preset = 'custom';
      if (!s.pending) { s.pending = d; s.from = s.to = d; s.hover = null; }
      else { s.from = s.pending < d ? s.pending : d; s.to = s.pending < d ? d : s.pending; s.pending = null; s.hover = null; }
      drpRender(r);
      r.querySelector(`[data-date="${day.dataset.date}"]`)?.focus();
    } else if (nav) { s.view = new Date(s.view.getFullYear(), s.view.getMonth() + +nav.dataset.gdDrpNav, 1); drpRender(r); }
    else if (e.target.closest('[data-gd-drp-apply]')) drpApply(r);
    else if (e.target.closest('[data-gd-drp-cancel]')) { if (r.classList.contains('gd-drp--pop')) drpClose(r, true); else { delete r._s; drpRender(r); emit(r, 'gd:range-cancel', {}); } }
  });
  document.addEventListener('mouseover', (e) => {
    const day = e.target.closest?.('.gd-drp [data-date]'); if (!day) return; const r = day.closest('[data-gd-drp]'), s = r._s;
    if (s && s.pending) { s.hover = parse(day.dataset.date); drpRender(r); }
  });
  document.addEventListener('change', (e) => {
    const f = e.target.closest?.('.gd-drp__fields input'); if (!f) return; const r = f.closest('[data-gd-drp]'), s = drp(r), v = $$(r, '.gd-drp__fields input').map((i) => new Date(Date.parse(i.value)));
    if (v.every((d) => !isNaN(d))) { const [a, b] = v.map((d) => new Date(d.getFullYear(), d.getMonth(), d.getDate())); s.from = a <= b ? a : b; s.to = a <= b ? b : a; s.preset = 'custom'; s.view = new Date(s.to.getFullYear(), s.to.getMonth() - 1, 1); }
    drpRender(r);
  });
  document.addEventListener('keydown', (e) => {
    const r = e.target.closest?.('[data-gd-drp]'); if (!r) return;
    if (e.key === 'Escape' && r.classList.contains('gd-drp--pop') && !r.hidden) { e.preventDefault(); e.stopPropagation(); drpClose(r, true); return; }
    if (e.key === 'Enter' && e.target.matches('.gd-drp__fields input')) { e.preventDefault(); e.target.dispatchEvent(new Event('change', { bubbles: true })); return; }
    const day = e.target.closest('[data-date]'), pr = e.target.closest('[data-preset]');
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
    if (day && step) {
      e.preventDefault(); const s = drp(r), d = addD(parse(day.dataset.date), step), mx = maxOf(r); if (mx && d > mx) return;
      const shown = $$(r, '.gd-drp__month').length; const first = s.view, last = new Date(first.getFullYear(), first.getMonth() + shown, 0);
      if (d < first || d > last) { s.view = new Date(d.getFullYear(), d.getMonth() - (d < first ? 0 : shown - 1), 1); drpRender(r); }
      r.querySelector(`[data-date="${iso(d)}"]`)?.focus();
    } else if (pr && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      e.preventDefault(); const l = $$(r, '[data-preset]'), i = l.indexOf(pr); l[(i + (e.key === 'ArrowDown' ? 1 : -1) + l.length) % l.length].focus();
    }
  }, true);
  document.addEventListener('mousedown', (e) => { $$(document, '.gd-drp--pop:not([hidden])').forEach((r) => { if (!r.contains(e.target) && !r._anchor?.contains(e.target) && !e.target.closest('[data-gd-rangebar] [data-value="custom"]')) drpClose(r, false); }); }, true);
  I.drp = { open: drpOpen, close: drpClose };

  /* ---------------------------------------------------------------- time range bar */
  function barState(b) {
    const seg = b.querySelector('[role="radiogroup"]'), pr = seg.querySelector('[aria-checked="true"]')?.dataset.value || '30d', pick = b.querySelector('[data-gd-drp]');
    let a, z; const t = pick ? todayOf(pick) : new Date();
    if (pr === 'custom' && pick) { a = parse(pick.dataset.from); z = parse(pick.dataset.to); } else { [a, z] = I.rangeFor(pr, t); }
    const val = (k) => b.querySelector(`[data-gd-key="${k}"] input[type="hidden"]`)?.value;
    return { preset: pr, from: iso(a), to: iso(z), days: days(a, z), granularity: val('granularity') || 'day', compare: val('compare') || 'none', live: !!b.querySelector('[data-gd-key="live"]')?.checked };
  }
  function barFire(b) {
    const st = barState(b), g = b.querySelector('[data-gd-key="granularity"]');
    if (g) { prep(g); const hour = g.querySelector('[data-value="hour"]'); if (hour) { hour.setAttribute('aria-disabled', st.days > 7); if (st.days > 7 && st.granularity === 'hour') { I.setValue(g, 'day', true); st.granularity = 'day'; } } }
    emit(b, 'gd:range', st);
  }
  document.addEventListener('gd:change', (e) => {
    const b = e.target.closest?.('[data-gd-rangebar]'); if (!b) return;
    const seg = e.target.closest('[role="radiogroup"]');
    if (seg) {
      if (b._silent) return; const pick = b.querySelector('[data-gd-drp]');
      if (e.detail.value === 'custom' && pick) { b._prev = b._prev || '30d'; drpOpen(pick, e.detail.item); return; }
      b._prev = e.detail.value; if (pick) drpClose(pick, false);
    }
    barFire(b);
  });
  document.addEventListener('change', (e) => { const b = e.target.closest?.('[data-gd-rangebar]'); if (b && e.target.matches('[data-gd-key="live"]')) barFire(b); });
  document.addEventListener('gd:range-pick', (e) => {
    const pick = e.target.closest?.('[data-gd-drp]'), b = pick?.closest('[data-gd-rangebar]'); if (!b || e.target !== pick) return;
    const seg = b.querySelector('[role="radiogroup"]'), c = seg.querySelector('[data-value="custom"]'), preset = e.detail.preset;
    const match = seg.querySelector(`[data-value="${preset}"]`);
    b._silent = true; A.select(match && preset !== 'custom' ? match : c); b._silent = false;
    c.dataset.range = `${e.detail.from}/${e.detail.to}`; b._prev = preset === 'custom' ? 'custom' : preset; barFire(b);
  });
  document.addEventListener('gd:range-cancel', (e) => {
    const b = e.target.closest?.('[data-gd-rangebar]'); if (!b) return; const seg = b.querySelector('[role="radiogroup"]');
    const back = seg.querySelector(`[data-value="${b._prev || '30d'}"]`); if (back && seg.querySelector('[aria-checked="true"]') !== back) A.select(back);
  });
  document.addEventListener('click', (e) => {
    const c = e.target.closest?.('[data-gd-rangebar] [data-value="custom"]'); if (!c) return; const pick = c.closest('[data-gd-rangebar]').querySelector('[data-gd-drp]');
    if (pick && pick.hidden) drpOpen(pick, c);
  });

  /* ---------------------------------------------------------------- query builder */
  const qbQuery = (q) => Object.fromEntries($$(q, '[data-gd-qb-sec]').map((s) => [s.dataset.gdQbSec, s.querySelector('[role="radiogroup"]') ? [s.querySelector('[aria-checked="true"]')?.dataset.value] : $$(s, '.gd-qb__chip').map((c) => c.dataset.value)]));
  document.addEventListener('click', (e) => { const q = e.target.closest('[data-gd-qb]'); if (q && e.target.closest('[data-gd-menu]')) qbSync(q); }, true);
  document.addEventListener('gd:change', (e) => { const q = e.target.closest?.('[data-gd-qb]'); if (q) emit(q, 'gd:query', { query: qbQuery(q) }); });
  function qbSync(q) {
    $$(q, '[data-gd-qb-sec]').forEach((s) => {
      const used = $$(s, '.gd-qb__chip').map((c) => c.dataset.value), add = s.querySelector('[data-gd-qb-add]'), max = +s.dataset.max || 99;
      $$(s, '.gd-menu__item').forEach((i) => { if (!('dup' in s.dataset)) i.setAttribute('aria-disabled', used.includes(i.dataset.value)); });
      if (add) add.hidden = used.length >= max;
    });
  }
  const chipHTML = (v, l, m) => `<span class="gd-qb__chip" data-value="${v}"><button type="button" class="gd-qb__val" data-gd-menu="${m}" aria-haspopup="menu" aria-expanded="false"><span>${l}</span>${CARET}</button><button type="button" class="gd-qb__x" data-gd-qb-x aria-label="Remove ${l}">${XICON}</button></span>`;
  document.addEventListener('gd:menu', (e) => {
    const s = e.target.closest?.('[data-gd-qb-sec]'), q = s?.closest('[data-gd-qb]'); if (!q) return;
    const cur = A.current(), trig = cur && cur.trigger, it = e.detail.item, v = it.dataset.value, l = it.querySelector('.gd-menu__text > :first-child')?.textContent.trim() || it.textContent.trim();
    if (trig.closest('.gd-qb__chip')) { const c = trig.closest('.gd-qb__chip'); c.dataset.value = v; trig.querySelector('span').textContent = l; c.querySelector('.gd-qb__x')?.setAttribute('aria-label', 'Remove ' + l); }
    else trig.insertAdjacentHTML('beforebegin', chipHTML(v, l, e.target.id));
    qbSync(q); emit(q, 'gd:query', { query: qbQuery(q) });
  });
  document.addEventListener('click', (e) => {
    const x = e.target.closest('[data-gd-qb-x]'), q = e.target.closest('[data-gd-qb]'); if (!q) return;
    if (x) { const s = x.closest('[data-gd-qb-sec]'); x.closest('.gd-qb__chip').remove(); qbSync(q); (s.querySelector('[data-gd-qb-add]:not([hidden])') || s).focus?.(); emit(q, 'gd:query', { query: qbQuery(q) }); return; }
    const a = e.target.closest('[data-gd-qb-action]'); if (a) emit(q, 'gd:query-action', { action: a.dataset.gdQbAction, query: qbQuery(q) });
  });
  I.query = qbQuery;
})();
