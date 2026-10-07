/* ============================================================================
   Gushwork dashboard — 40 tables, filtering and logs (behaviour)
   Vanilla ES2020, delegated on document so it survives a page swap. Exposes GD.tables only.
   Menus (column menu, row-actions menu, items-per-page) ride 20-actions.js: its data-gd-menu trigger opens them
   and this file listens for the gd:menu event they emit. Only the filter-builder popover has its own open/close.

   Finding the table: an element with data-gd-for="#id" targets that table; otherwise the nearest .gd-tview's .gd-table / .gd-logs.

   Hooks
     data-gd-sort                     button in a [role=columnheader]; cycles aria-sort. th data-gd-type="number|text"; cell data-gd-value overrides text.
                                      table data-gd-sort-mode="server" only emits gd:sort and leaves the rows alone.
     data-gd-select-row / -all        checkboxes. Shift-click selects a range; the header box is tri-state. Rows get aria-selected. Esc clears.
     data-gd-bulk (+data-gd-for)      the bulk bar: shown while >0 selected. [data-gd-bulk-count] gets the number; [data-gd-bulk-clear] clears.
     data-gd-expand                   a row (group toggle or tree row). aria-expanded flips; group detail [hidden]; tree children data-gd-collapsed.
     data-gd-colmenu (+data-gd-for)   a .gd-menu whose items carry data-gd-col="key"; header/cells carry data-gd-col too. The last visible column cannot be unchecked.
     data-gd-table-flag="sparklines"  a menuitemcheckbox that sets data-gd-sparklines="off" on the table.
     data-gd-row-menu                 one shared .gd-menu for all rows; items carry data-gd-action. Fires gd:rowaction {action,row,id}.
     data-gd-pager (+data-gd-for)     data-gd-page / -per / -total. [data-gd-range] [data-gd-pages] [data-gd-page-first|prev|next|last] [data-gd-page-input].
                                      With data-gd-for the pager slices the table's rows itself; without it, it only emits gd:page.
     data-gd-per-menu                 .gd-menu of menuitemradio data-value=N for the pager. The trigger's [data-gd-value] shows the choice.
     data-gd-search (+data-gd-for)    input. Filters rows client-side by text; emits gd:search. [data-gd-search-clear] clears it.
     data-gd-chips / data-gd-fbuilder chips container and builder popover (data-gd-chips-for="#id" on the builder). data-gd-fields='[{key,label,type,values}]'.
     data-gd-pop="id"                 trigger for the filter-builder popover. [data-gd-add] [data-gd-clear] [data-gd-apply] inside it.
     data-gd-chip-remove / data-gd-chips-clear / data-gd-filter-count
     data-gd-views-save               button in a tablist: turns into a name field and adds a segment. Tabs themselves are 20-actions' role=tab.
     data-gd-emit="name"              any click fires gd:name (export, retry, clear-filters ...).
     data-gd-logs                     the log viewer root: data-live="on|paused|off", data-wrap="on|off".
       [data-gd-logs-live] [data-gd-logs-wrap] [data-gd-logs-expandall] [data-gd-logs-older] [data-gd-logs-jump]; rows [data-gd-expand] aria-expanded.
     data-gd-hist                     histogram. Drag (or Shift+Arrow, Enter) selects a range and fires gd:range {from,to,fromIndex,toIndex}. Esc or [data-gd-hist-clear] clears.
   Events (bubble): gd:sort gd:selection gd:expand gd:columns gd:rowaction gd:page gd:search gd:filters gd:viewsave gd:range gd:logs gd:<data-gd-emit>
   API: GD.tables.setState(view, 'loading|empty|error|noresults'|null) · .setFilters(chipsEl, [{id,field,label,op,value}]) · .refresh(table) · .selected(table) · .clearSelection(table)
   ============================================================================ */
window.GD = window.GD || {};
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const emit = (el, name, detail) => el.dispatchEvent(new CustomEvent('gd:' + name, { bubbles: true, detail }));
  const ROOT = '.gd-table, .gd-logs';
  const T = (GD.tables = GD.tables || {});

  const tableFor = (el) => {
    const f = el.closest('[data-gd-for]');
    if (f) return $(f.getAttribute('data-gd-for'));
    const v = el.closest('.gd-tview, .gd-logs');
    return v ? (v.matches(ROOT) ? v : $(ROOT, v)) : el.closest(ROOT);
  };
  const viewOf = (t) => t.closest('.gd-tview') || t;
  const bodyOf = (t) => $('.gd-table__body:not(.gd-table__body--ghost)', t) || $('.gd-logs__scroll', t) || t;
  const units = (t) => [...bodyOf(t).children].filter((c) => c.matches('.gd-table__row, .gd-table__group'));
  const rowsOf = (t) => $$('[role="row"]', t).filter((r) => !r.matches('.gd-table__row--head, .gd-table__row--ghost, .gd-logs__head'));
  const linked = (sel, t) => $$(sel).filter((e) => { const f = e.getAttribute('data-gd-for'); return f ? $(f) === t : viewOf(t).contains(e); });

  /* ------------------------------------------------------------- sorting -- */
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-gd-sort]'); if (!b) return;
    const th = b.closest('[role="columnheader"]'), t = tableFor(b); if (!th || !t) return;
    const dir = th.getAttribute('aria-sort') === 'ascending' ? 'descending' : 'ascending';
    $$('[role="columnheader"][aria-sort]', t).forEach((h) => h.setAttribute('aria-sort', 'none'));
    th.setAttribute('aria-sort', dir);
    const head = th.parentElement, i = [...head.children].indexOf(th), num = th.dataset.gdType === 'number', k = dir === 'ascending' ? 1 : -1;
    if (t.dataset.gdSortMode !== 'server') {
      const cellOf = (u) => (u.matches('.gd-table__group') ? $('.gd-table__row', u) : u).children[i];
      const key = (u) => { const c = cellOf(u); const v = c ? (c.dataset.gdValue ?? c.textContent.trim()) : ''; return num ? (parseFloat(String(v).replace(/[^0-9.\-]/g, ''))) : v; };
      const col = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
      const list = units(t).map((u, n) => ({ u, n, v: key(u) }));
      const blank = (v) => v === '' || v == null || (num && Number.isNaN(v));
      list.sort((a, b2) => (blank(a.v) - blank(b2.v)) || (blank(a.v) ? 0 : k * (num ? a.v - b2.v : col.compare(a.v, b2.v))) || a.n - b2.n);
      const body = bodyOf(t); list.forEach((x) => body.append(x.u));
      refresh(t);
    }
    emit(t, 'sort', { key: th.dataset.gdCol || i, dir });
  });

  /* ----------------------------------------------------------- selection -- */
  const sels = (t) => $$('[data-gd-select-row]', t);
  const visibleSels = (t) => sels(t).filter((c) => !c.disabled && !c.closest('[hidden], [data-gd-collapsed]'));
  const lastClick = new WeakMap();
  T.selected = (t) => sels(t).filter((c) => c.checked).map((c) => c.closest('[role="row"]'));
  function syncSelection(t) {
    sels(t).forEach((c) => { const r = c.closest('[role="row"]'); if (r) r.setAttribute('aria-selected', c.checked); });
    const vis = visibleSels(t), n = vis.filter((c) => c.checked).length, all = $('[data-gd-select-all]', t);
    if (all) { all.checked = vis.length > 0 && n === vis.length; all.indeterminate = n > 0 && n < vis.length; all.toggleAttribute('aria-checked', false); if (all.indeterminate) all.setAttribute('aria-checked', 'mixed'); }
    const total = sels(t).filter((c) => c.checked).length;
    linked('[data-gd-bulk]', t).forEach((b) => { b.hidden = total === 0; const c = $('[data-gd-bulk-count]', b); if (c) c.textContent = total; });
    emit(t, 'selection', { count: total, ids: T.selected(t).map((r) => r.dataset.gdId).filter(Boolean) });
  }
  T.clearSelection = (t) => { sels(t).forEach((c) => (c.checked = false)); syncSelection(t); };
  document.addEventListener('click', (e) => {
    const c = e.target.closest('[data-gd-select-row], [data-gd-select-all]');
    if (c) {
      const t = tableFor(c); if (!t) return;
      if (c.matches('[data-gd-select-all]')) { visibleSels(t).forEach((x) => (x.checked = c.checked)); }
      else {
        const vis = visibleSels(t), last = lastClick.get(t);
        if (e.shiftKey && last && vis.includes(last)) {
          const a = vis.indexOf(last), b = vis.indexOf(c);
          vis.slice(Math.min(a, b), Math.max(a, b) + 1).forEach((x) => (x.checked = c.checked));
        }
        lastClick.set(t, c);
      }
      syncSelection(t); return;
    }
    const clr = e.target.closest('[data-gd-bulk-clear]');
    if (clr) { const t = tableFor(clr); if (t) { T.clearSelection(t); const a = $('[data-gd-select-all]', t); (a || t).focus?.(); } }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || e.defaultPrevented) return;
    const t = tableFor(e.target); if (t && sels(t).some((c) => c.checked) && !e.target.closest('input[type="text"], input[type="search"], [data-gd-fbuilder]')) T.clearSelection(t);
  });

  /* ------------------------------------------------------------ expanding -- */
  function toggleRow(r, force) {
    const open = force ?? r.getAttribute('aria-expanded') !== 'true';
    r.setAttribute('aria-expanded', open);
    const g = r.closest('.gd-table__group');
    if (g) { g.toggleAttribute('data-open', open); const d = $('.gd-table__detail', g); if (d) d.hidden = !open; }
    else if (r.dataset.level != null && r.closest('.gd-table')) {           // tree: hide descendants, honouring collapsed ancestors
      const lvl = +r.dataset.level, rows = $$('[data-level]', r.closest('.gd-table')), at = rows.indexOf(r), closed = [];
      for (let i = at + 1; i < rows.length && +rows[i].dataset.level > lvl; i++) {
        const x = rows[i], xl = +x.dataset.level;
        while (closed.length && closed[closed.length - 1] >= xl) closed.pop();
        const hide = !open || closed.length > 0;
        x.toggleAttribute('data-gd-collapsed', hide);
        if (x.getAttribute('aria-expanded') === 'false') closed.push(xl);
      }
    } else if (r.closest('.gd-logs')) {
      let d = r.nextElementSibling; if (d && d.matches('.gd-logs__detail')) d.hidden = !open;
    }
    emit(r, 'expand', { row: r, open });
  }
  document.addEventListener('click', (e) => {
    const r = e.target.closest('[data-gd-expand]'); if (!r) return;
    if (e.target.closest('a, input, label, [data-gd-menu], .gd-table__more') && !e.target.closest('.gd-table__caret')) return;
    toggleRow(r);
  });
  document.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches?.('[data-gd-expand]')) { e.preventDefault(); toggleRow(e.target); }
  });

  /* -------------------------------------------------------------- columns -- */
  const split = (s) => { const out = []; let d = 0, cur = ''; for (const ch of s.trim()) { if (ch === '(') d++; if (ch === ')') d--; if (/\s/.test(ch) && !d) { if (cur) out.push(cur); cur = ''; } else cur += ch; } if (cur) out.push(cur); return out; };
  function applyColumns(menu) {
    const t = tableFor(menu); if (!t) return;
    const head = $('.gd-table__row--head', t); if (!head) return;
    if (!t._gdTracks) t._gdTracks = split(getComputedStyle(t).getPropertyValue('--gd-cols'));
    if (t._gdTracks.length !== head.children.length) return;
    const items = $$('[data-gd-col]', menu), on = new Set(items.filter((i) => i.getAttribute('aria-checked') === 'true').map((i) => i.dataset.gdCol));
    const lock = on.size <= 1;                                                       // the paired-control guard: never an empty table
    items.forEach((i) => { if (lock && on.has(i.dataset.gdCol)) { i.setAttribute('aria-disabled', 'true'); i.dataset.gdLock = ''; } else if ('gdLock' in i.dataset) { i.removeAttribute('aria-disabled'); delete i.dataset.gdLock; } });
    const cols = [...head.children].map((h) => h.dataset.gdCol), shown = cols.map((k) => !k || !items.some((i) => i.dataset.gdCol === k) || on.has(k));
    t.style.setProperty('--gd-cols', t._gdTracks.filter((_, i) => shown[i]).join(' '));
    $$('[role="row"]', t).forEach((r) => { if (r.children.length === shown.length) [...r.children].forEach((c, i) => (c.hidden = !shown[i])); });
    emit(t, 'columns', { visible: [...on] });
  }
  document.addEventListener('gd:menu', (e) => {
    const m = e.target, d = e.detail || {};
    if (m.matches('[data-gd-colmenu]')) {
      if (d.item.matches('[data-gd-table-flag]')) { const t = tableFor(m); if (t) t.dataset['gd' + d.item.dataset.gdTableFlag.replace(/^./, (c) => c.toUpperCase())] = d.checked ? 'on' : 'off'; }
      else applyColumns(m);
    } else if (m.matches('[data-gd-row-menu]')) {
      const row = lastTrigger && lastTrigger.closest('[role="row"]');
      if (row) emit(row, 'rowaction', { action: d.item.dataset.gdAction || d.value, row, id: row.dataset.gdId });
    } else if (m.matches('[data-gd-per-menu]')) {
      const pg = linkedPager(m); if (!pg) return;
      pg.dataset.gdPer = d.item.dataset.value; pg.dataset.gdPage = 1; const tr = $(`[data-gd-menu="${m.id}"]`); const v = tr && $('[data-gd-value]', tr); if (v) v.textContent = d.item.dataset.value;
      updatePager(pg, true);
    }
  });
  const linkedPager = (m) => { const f = m.closest('[data-gd-pager]') || $(`[data-gd-menu="${m.id}"]`)?.closest('[data-gd-pager]'); return f; };

  /* row-actions: remember which row opened the shared menu; keep that row lit while it is open */
  let lastTrigger = null;
  const unlight = () => setTimeout(() => $$('[data-gd-active]').forEach((r) => { if (!r.querySelector('[aria-expanded="true"]')) r.removeAttribute('data-gd-active'); }));
  document.addEventListener('click', (e) => {
    const tr = e.target.closest('.gd-table [data-gd-menu]');
    if (tr) { lastTrigger = tr; setTimeout(() => tr.closest('[role="row"]')?.toggleAttribute('data-gd-active', tr.getAttribute('aria-expanded') === 'true')); }
    unlight();
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') unlight(); });

  /* ---------------------------------------------- refresh / search / pager -- */
  function pagerFor(t) { return linked('[data-gd-pager][data-gd-for]', t)[0]; }
  function refresh(t) {
    if (!t.matches('.gd-table')) return;
    const list = units(t), pg = pagerFor(t), keep = list.filter((u) => !('gdOut' in u.dataset));
    let shown = keep;
    if (pg) {
      pg.dataset.gdTotal = keep.length;
      const per = +pg.dataset.gdPer || keep.length || 1, pages = Math.max(1, Math.ceil(keep.length / per)), page = Math.min(Math.max(1, +pg.dataset.gdPage || 1), pages);
      pg.dataset.gdPage = page; shown = keep.slice((page - 1) * per, page * per); updatePager(pg, false);
    }
    const set = new Set(shown); list.forEach((u) => { u.hidden = !set.has(u); });
    const v = viewOf(t);
    if (v.matches('.gd-tview') && list.length && $('.gd-tstate--noresults', v)) {
      if (!keep.length) T.setState(v, 'noresults'); else if (v.dataset.state === 'noresults') T.setState(v, null);
    }
    const all = $('[data-gd-select-all]', t); if (all) syncSelection(t);
  }
  T.refresh = refresh;
  const fmt = (n) => Number(n).toLocaleString();
  function updatePager(pg, fire) {
    const total = +pg.dataset.gdTotal, per = +pg.dataset.gdPer || 25;
    if (Number.isNaN(total)) { return; }
    const pages = Math.max(1, Math.ceil(total / per)); let page = Math.min(Math.max(1, +pg.dataset.gdPage || 1), pages); pg.dataset.gdPage = page;
    const from = total ? (page - 1) * per + 1 : 0, to = Math.min(total, page * per);
    const r = $('[data-gd-range]', pg); if (r) r.textContent = `${fmt(from)}–${fmt(to)} of ${fmt(total)}`;
    const p = $('[data-gd-pages]', pg); if (p) p.textContent = `Page ${page} of ${fmt(pages)}`;
    const inp = $('[data-gd-page-input]', pg); if (inp) { inp.value = page; inp.max = pages; const n = $('[data-gd-page-of]', pg); if (n) n.textContent = fmt(pages); }
    $$('[data-gd-page-first], [data-gd-page-prev]', pg).forEach((b) => (b.disabled = page <= 1));
    $$('[data-gd-page-last], [data-gd-page-next]', pg).forEach((b) => (b.disabled = page >= pages));
    if (fire) { const t = pg.dataset.gdFor && $(pg.dataset.gdFor); if (t) refresh(t); emit(pg, 'page', { page, per, pages }); }
  }
  const goto = (pg, p) => { pg.dataset.gdPage = p; updatePager(pg, true); };
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-gd-page-first], [data-gd-page-prev], [data-gd-page-next], [data-gd-page-last]'); if (!b || b.disabled) return;
    const pg = b.closest('[data-gd-pager]'), cur = +pg.dataset.gdPage || 1, pages = Math.max(1, Math.ceil(+pg.dataset.gdTotal / (+pg.dataset.gdPer || 25)));
    goto(pg, b.matches('[data-gd-page-first]') ? 1 : b.matches('[data-gd-page-prev]') ? cur - 1 : b.matches('[data-gd-page-next]') ? cur + 1 : pages);
  });
  const commitJump = (i) => { const pg = i.closest('[data-gd-pager]'), v = parseInt(i.value, 10); goto(pg, Number.isNaN(v) ? +pg.dataset.gdPage : v); };
  document.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.matches?.('[data-gd-page-input]')) commitJump(e.target); });
  document.addEventListener('change', (e) => { if (e.target.matches?.('[data-gd-page-input]')) commitJump(e.target); });

  let st = 0;
  document.addEventListener('input', (e) => {
    const i = e.target.closest?.('[data-gd-search]'); if (!i) return;
    const x = i.parentElement.querySelector('[data-gd-search-clear]'); if (x) x.hidden = !i.value;
    clearTimeout(st); st = setTimeout(() => runSearch(i), 150);
  });
  function runSearch(i) {
    const t = tableFor(i), q = i.value.trim().toLowerCase();
    if (t) { units(t).forEach((u) => { u._gdText = u._gdText ?? u.textContent.toLowerCase(); if (!q || u._gdText.includes(q)) delete u.dataset.gdOut; else u.dataset.gdOut = ''; }); const pg = pagerFor(t); if (pg) pg.dataset.gdPage = 1; refresh(t); }
    emit(i, 'search', { value: i.value });
  }
  document.addEventListener('click', (e) => {
    const x = e.target.closest('[data-gd-search-clear]'); if (!x) return;
    const i = $('[data-gd-search]', x.parentElement); i.value = ''; x.hidden = true; runSearch(i); i.focus();
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && e.target.matches?.('[data-gd-search]') && e.target.value) { e.preventDefault(); e.target.value = ''; e.target.dispatchEvent(new Event('input', { bubbles: true })); } });

  /* --------------------------------------------------------------- states -- */
  T.setState = (v, s) => {
    if (s) v.dataset.state = s; else delete v.dataset.state;
    const t = $('.gd-table', v); if (t) { if (s === 'loading') t.setAttribute('aria-busy', 'true'); else t.removeAttribute('aria-busy'); }
  };

  /* --------------------------------------------- generic emit + view switch -- */
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-gd-emit]'); if (!b) return;
    emit(b, b.dataset.gdEmit, { trigger: b });
    if (b.dataset.gdEmit === 'clear-filters') clearChips(b);
  });

  /* ------------------------------------------------------- filters: chips -- */
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const X = '<svg viewBox="0 0 256 256" width="10" height="10" fill="currentColor" aria-hidden="true"><path d="M208.49,191.51a12,12,0,0,1-17,17L128,145,64.49,208.49a12,12,0,0,1-17-17L111,128,47.51,64.49a12,12,0,0,1,17-17L128,111l63.51-63.52a12,12,0,0,1,17,17L145,128Z"/></svg>';
  const chipsEl = (el) => el.closest('[data-gd-chips]') || $(el.closest('[data-gd-fbuilder]')?.dataset.gdChipsFor || '[data-gd-chips]');
  const filtersOf = (c) => $$('.gd-chip', c).map((x) => ({ id: x.dataset.gdFid, field: x.dataset.field, label: ($('.gd-chip__f', x) || {}).textContent, op: x.dataset.op, value: x.dataset.value }));
  function chipHtml(f) {
    const label = `${f.label || f.field} ${f.op} ${f.value}`;
    return `<span class="gd-chip" data-gd-fid="${esc(f.id)}" data-field="${esc(f.field)}" data-op="${esc(f.op)}" data-value="${esc(f.value)}"><span class="gd-chip__f">${esc(f.label || f.field)}</span><span class="gd-chip__op">${esc(f.op)}</span><span class="gd-chip__v">${esc(f.value)}</span><button class="gd-chip__x" type="button" data-gd-chip-remove aria-label="Remove filter ${esc(label)}">${X}</button></span>`;
  }
  /* The host swaps the filters (a saved segment, a preset): replace every chip with `list` ([{id, field, label, op, value}], the shape
     gd:viewsave carries) and let the rest of the table follow, exactly as if the builder's Apply had been pressed. */
  T.setFilters = (c, list) => {
    if (!c) return;
    $$('.gd-chip', c).forEach((x) => x.remove());
    const clr = $('[data-gd-chips-clear]', c), html = (list || []).map(chipHtml).join('');
    if (html) { clr ? clr.insertAdjacentHTML('beforebegin', html) : c.insertAdjacentHTML('beforeend', html); }
    chipsChanged(c);
  };
  function chipsChanged(c) {
    const n = $$('.gd-chip', c).length; c.hidden = n === 0;
    const clr = $('[data-gd-chips-clear]', c); if (clr) clr.hidden = n < 2;
    $$('[data-gd-filter-count]').forEach((b) => { if (b.dataset.gdFor ? $(b.dataset.gdFor) === c : true) { b.textContent = n; b.hidden = n === 0; } });
    emit(c, 'filters', { filters: filtersOf(c) });
  }
  function clearChips(from) {
    const c = chipsEl(from) || $('[data-gd-chips]'); if (!c) return;
    $$('.gd-chip', c).forEach((x) => x.remove());
    const fb = $$('[data-gd-fbuilder]').find((b) => $(b.dataset.gdChipsFor) === c); if (fb) { $$('[data-gd-frow]', fb).forEach((r) => r.remove()); relabel(fb); }
    chipsChanged(c);
  }
  document.addEventListener('click', (e) => {
    const x = e.target.closest('[data-gd-chip-remove]');
    if (x) {
      const chip = x.closest('.gd-chip'), c = chipsEl(x), id = chip.dataset.gdFid; chip.remove();
      const fb = $$('[data-gd-fbuilder]').find((b) => $(b.dataset.gdChipsFor) === c); if (fb) { $(`[data-gd-fid="${id}"]`, fb)?.remove(); relabel(fb); }
      chipsChanged(c); return;
    }
    const all = e.target.closest('[data-gd-chips-clear]'); if (all) clearChips(all);
  });

  /* ----------------------------------------------- filters: builder rows -- */
  const OPS = { text: ['contains', 'does not contain', 'is', 'is not'], number: ['is', 'is not', 'greater than', 'less than'], enum: ['is', 'is not'] };
  const CHEV = '<svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M216.49,104.49l-80,80a12,12,0,0,1-17,0l-80-80a12,12,0,0,1,17-17L128,159l71.51-71.52a12,12,0,0,1,17,17Z"/></svg>';
  let fid = 0;
  const fieldsOf = (fb) => { try { return JSON.parse(fb.dataset.gdFields || '[]'); } catch { return []; } };
  const sel = (cls, label, opts, val, f) => `<span class="gd-fbuilder__sel"><select class="gd-fbuilder__field" aria-label="${label}" data-gd-f="${f}">${opts.map((o) => `<option value="${esc(o.v)}"${o.v === val ? ' selected' : ''}>${esc(o.t)}</option>`).join('')}</select>${CHEV}</span>`;
  function valueControl(field, val) {
    if (field && field.type === 'enum') return sel('', 'Value', (field.values || []).map((v) => ({ v, t: v })), val, 'value');
    return `<input class="gd-fbuilder__field" aria-label="Value" data-gd-f="value" type="${field && field.type === 'number' ? 'number' : 'text'}" placeholder="Value" value="${esc(val || '')}" autocomplete="off">`;
  }
  function rowHtml(fb, f = {}) {
    const fields = fieldsOf(fb), cur = fields.find((x) => x.key === f.field) || fields[0] || { key: '', type: 'text' }, ops = OPS[cur.type] || OPS.text;
    return `<div class="gd-fbuilder__row" data-gd-frow data-gd-fid="${f.id || 'f' + ++fid}"><span class="gd-fbuilder__lead"></span>` +
      sel('', 'Field', fields.map((x) => ({ v: x.key, t: x.label })), cur.key, 'field') + sel('', 'Operator', ops.map((o) => ({ v: o, t: o })), f.op || ops[0], 'op') + valueControl(cur, f.value) +
      `<button class="gd-fbuilder__x" type="button" data-gd-frow-remove aria-label="Remove filter">${X}</button></div>`;
  }
  function relabel(fb) {
    const rows = $$('[data-gd-frow]', fb); rows.forEach((r, i) => { $('.gd-fbuilder__lead', r).textContent = i ? 'And' : 'Where'; });
    const none = $('[data-gd-fnone]', fb); if (none) none.hidden = rows.length > 0;
  }
  document.addEventListener('change', (e) => {
    const s = e.target.closest?.('[data-gd-f="field"]'); if (!s) return;
    const fb = s.closest('[data-gd-fbuilder]'), row = s.closest('[data-gd-frow]'), cur = fieldsOf(fb).find((x) => x.key === s.value) || { type: 'text' };
    const tmp = document.createElement('div'); tmp.innerHTML = rowHtml(fb, { field: s.value, id: row.dataset.gdFid });
    $('[data-gd-f="op"]', row).closest('.gd-fbuilder__sel').replaceWith($('[data-gd-f="op"]', tmp).closest('.gd-fbuilder__sel'));
    $('[data-gd-f="value"]', row).closest('.gd-fbuilder__sel, input')?.replaceWith($('[data-gd-f="value"]', tmp).closest('.gd-fbuilder__sel') || $('[data-gd-f="value"]', tmp));
  });
  document.addEventListener('click', (e) => {
    const fb = e.target.closest('[data-gd-fbuilder]'); if (!fb) return;
    if (e.target.closest('[data-gd-add]')) {
      const rows = $('.gd-fbuilder__rows', fb); rows.insertAdjacentHTML('beforeend', rowHtml(fb)); relabel(fb); $$('[data-gd-f]', rows).pop()?.focus(); $('[data-gd-frow]:last-child [data-gd-f="value"]', rows)?.focus();
    } else if (e.target.closest('[data-gd-frow-remove]')) {
      e.target.closest('[data-gd-frow]').remove(); relabel(fb);
    } else if (e.target.closest('[data-gd-clear]')) {
      clearChips(fb);
    } else if (e.target.closest('[data-gd-apply]')) {
      const c = $(fb.dataset.gdChipsFor); let bad = null;
      const list = $$('[data-gd-frow]', fb).map((r) => {
        const v = $('[data-gd-f="value"]', r), f = $('[data-gd-f="field"]', r), fld = fieldsOf(fb).find((x) => x.key === f.value);
        const ok = v.value.trim() !== ''; v.setAttribute('aria-invalid', ok ? 'false' : 'true'); if (!ok && !bad) bad = v;
        return { id: r.dataset.gdFid, field: f.value, label: fld ? fld.label : f.value, op: $('[data-gd-f="op"]', r).value, value: v.value.trim() };
      });
      if (bad) { bad.focus(); return; }
      if (c) T.setFilters(c, list);
      closePop(true);
    }
  });
  document.addEventListener('input', (e) => { if (e.target.matches?.('[data-gd-f="value"][aria-invalid]') && e.target.value.trim()) e.target.setAttribute('aria-invalid', 'false'); });

  /* ---------------------------------------------------- filter popover --- */
  let pop = null;
  function openPop(tr) {
    const m = document.getElementById(tr.dataset.gdPop); if (!m) return; closePop(false);
    m.hidden = false; tr.setAttribute('aria-expanded', 'true'); tr.setAttribute('aria-haspopup', 'dialog');
    if (GD.actions && GD.actions.place) GD.actions.place(m, tr); pop = { tr, m };
    ($('[data-gd-f]', m) || $('button', m))?.focus();
  }
  function closePop(refocus) {
    if (!pop) return; const { tr, m } = pop; pop = null; m.hidden = true; tr.setAttribute('aria-expanded', 'false');
    if (GD.actions && GD.actions.unplace) GD.actions.unplace(m); if (refocus) tr.focus();
  }
  document.addEventListener('click', (e) => { const tr = e.target.closest('[data-gd-pop]'); if (!tr) return; if (pop && pop.tr === tr) closePop(false); else openPop(tr); });
  document.addEventListener('mousedown', (e) => { if (pop && !pop.m.contains(e.target) && !pop.tr.contains(e.target)) closePop(false); }, true);
  document.addEventListener('keydown', (e) => { if (pop && e.key === 'Escape') { e.preventDefault(); closePop(true); } else if (pop && e.key === 'Tab' && !pop.m.contains(document.activeElement)) closePop(false); });
  addEventListener('resize', () => closePop(false));

  /* ----------------------------------------------------------- saved views -- */
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-gd-views-save]'); if (!b) return;
    const i = document.createElement('input'); i.className = 'gd-views__input'; i.placeholder = 'Segment name'; i.setAttribute('aria-label', 'Segment name'); i.maxLength = 40;
    b.hidden = true; b.before(i); i.focus(); let done = false;
    const end = (ok) => {
      if (done) return; done = true; const name = i.value.trim(); i.remove(); b.hidden = false;
      if (ok && name) {
        const list = b.closest('[role="tablist"]'), tab = document.createElement('button');
        tab.type = 'button'; tab.className = 'gd-views__tab'; tab.setAttribute('role', 'tab'); tab.setAttribute('aria-selected', 'false'); tab.tabIndex = -1; tab.dataset.value = name.toLowerCase().replace(/\s+/g, '-'); tab.textContent = name;
        b.before(tab); GD.actions && GD.actions.select && GD.actions.select(tab); b.focus();
        const c = $('[data-gd-chips]'); emit(list, 'viewsave', { name, filters: c ? filtersOf(c) : [] });
      } else b.focus();
    };
    i.addEventListener('keydown', (k) => { if (k.key === 'Enter') { k.preventDefault(); end(true); } else if (k.key === 'Escape') { k.stopPropagation(); end(false); } });
    i.addEventListener('blur', () => end(!!i.value.trim()));
  });

  /* ------------------------------------------------------------ log viewer -- */
  const logsOf = (el) => el.closest('[data-gd-logs]');
  const atBottom = (s) => s.scrollHeight - s.scrollTop - s.clientHeight < 8;
  const jump = (L) => { const s = $('.gd-logs__scroll', L); s.scrollTop = s.scrollHeight; };
  function setLive(L, state) {
    L.dataset.live = state; const b = $('[data-gd-logs-live]', L);
    if (b) { b.setAttribute('aria-pressed', state !== 'off'); const l = $('[data-gd-live-label]', b); if (l) l.textContent = state === 'on' ? 'Live' : state === 'paused' ? 'Paused' : 'Live off'; }
    if (state === 'on') jump(L); emit(L, 'logs', { live: state });
  }
  document.addEventListener('click', (e) => {
    const L = logsOf(e.target); if (!L) return;
    if (e.target.closest('[data-gd-logs-live]')) setLive(L, L.dataset.live === 'on' ? 'off' : 'on');
    else if (e.target.closest('[data-gd-logs-jump]')) setLive(L, 'on');
    else if (e.target.closest('[data-gd-logs-wrap]')) { const on = L.dataset.wrap !== 'on'; L.dataset.wrap = on ? 'on' : 'off'; e.target.closest('[data-gd-logs-wrap]').setAttribute('aria-pressed', on); }
    else if (e.target.closest('[data-gd-logs-expandall]')) {
      const b = e.target.closest('[data-gd-logs-expandall]'), open = b.getAttribute('aria-pressed') !== 'true'; b.setAttribute('aria-pressed', open);
      $$('.gd-logs__row[data-gd-expand]', L).forEach((r) => { if ((r.getAttribute('aria-expanded') === 'true') !== open) toggleRow(r, open); });
    } else if (e.target.closest('[data-gd-logs-older]')) {
      const b = e.target.closest('[data-gd-logs-older]'); b.setAttribute('aria-busy', 'true'); b.disabled = true;
      emit(L, 'logs', { older: true, done: () => { b.removeAttribute('aria-busy'); b.disabled = false; } });
    }
  });
  const lastTop = new WeakMap();
  document.addEventListener('scroll', (e) => {
    const s = e.target; if (!s.matches?.('.gd-logs__scroll')) return; const L = logsOf(s); if (!L || !L.dataset.live) return;
    const up = s.scrollTop < (lastTop.get(s) ?? 0); lastTop.set(s, s.scrollTop);
    if (L.dataset.live === 'on' && up && !atBottom(s)) setLive(L, 'paused');
    else if (L.dataset.live === 'paused' && atBottom(s)) setLive(L, 'on');
  }, true);
  const mo = new MutationObserver((list) => { list.forEach((m) => { const L = m.target.closest?.('[data-gd-logs]'); if (L && L.dataset.live === 'on' && m.addedNodes.length) jump(L); }); });
  const watchLogs = () => $$('.gd-logs__scroll').forEach((s) => { if (!s._gdWatch) { s._gdWatch = 1; mo.observe(s, { childList: true }); } });

  /* ------------------------------------------------------------- histogram -- */
  const bars = (H) => $$('.gd-hist__bar', H);
  function showRange(H, a, b) {
    const bs = bars(H), brush = $('.gd-hist__brush', H); if (!bs.length || !brush) return;
    const lo = Math.max(0, Math.min(a, b)), hi = Math.min(bs.length - 1, Math.max(a, b));
    brush.hidden = false; brush.style.setProperty('--l', (lo / bs.length * 100) + '%'); brush.style.setProperty('--w', ((hi - lo + 1) / bs.length * 100) + '%');
    H._range = [lo, hi]; const hm = (b) => b.dataset.label || (/^\d+$/.test(b.dataset.t) ? new Date(+b.dataset.t).toISOString().slice(11, 16) : b.dataset.t), r = $('[data-gd-hist-label]', H); if (r) r.textContent = `${hm(bs[lo])} \u2013 ${hm(bs[hi])}`;
    const w = $('[data-gd-hist-range]', H); if (w) w.hidden = false;
  }
  function commitRange(H) {
    if (!H._range) return; const bs = bars(H), [lo, hi] = H._range, bucket = +H.dataset.gdBucket || 0, t0 = bs[lo].dataset.t, t1 = bs[hi].dataset.t;
    const isNum = (v) => /^\d+$/.test(v), end = (v) => (isNum(v) ? +v + bucket : bucket ? new Date(Date.parse(v) + bucket).toISOString() : v);
    emit(H, 'range', { fromIndex: lo, toIndex: hi, from: isNum(t0) ? +t0 : t0, to: end(t1) });
  }
  function clearRange(H, fire = true) {
    H._range = null; H._anchor = null; const b = $('.gd-hist__brush', H); if (b) b.hidden = true; const w = $('[data-gd-hist-range]', H); if (w) w.hidden = true;
    if (fire) emit(H, 'range', { fromIndex: null, toIndex: null, from: null, to: null });
  }
  const idxAt = (H, x) => { const p = $('.gd-hist__plot', H).getBoundingClientRect(), n = bars(H).length; return Math.max(0, Math.min(n - 1, Math.floor((x - p.left) / p.width * n))); };
  let drag = null;
  document.addEventListener('pointerdown', (e) => {
    const p = e.target.closest('.gd-hist__plot'); if (!p || e.button) return; const H = p.closest('[data-gd-hist]'); if (!H) return;
    drag = { H, a: idxAt(H, e.clientX), moved: false }; p.setPointerCapture?.(e.pointerId); showRange(H, drag.a, drag.a);
  });
  document.addEventListener('pointermove', (e) => { if (!drag) return; const i = idxAt(drag.H, e.clientX); if (i !== drag.a) drag.moved = true; showRange(drag.H, drag.a, i); });
  document.addEventListener('pointerup', () => { if (!drag) return; const { H, moved } = drag; drag = null; if (moved) commitRange(H); else clearRange(H); });
  document.addEventListener('keydown', (e) => {
    const p = e.target.closest?.('.gd-hist__plot'); if (!p) return; const H = p.closest('[data-gd-hist]'), bs = bars(H); if (!bs.length) return;
    if (e.key === 'Escape') { clearRange(H); return; }
    if (e.key === 'Enter') { commitRange(H); return; }
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return; e.preventDefault();
    const cur = H._cursor ?? (e.key === 'ArrowRight' ? -1 : bs.length), next = Math.max(0, Math.min(bs.length - 1, cur + (e.key === 'ArrowRight' ? 1 : -1)));
    if (e.shiftKey) { H._anchor = H._anchor ?? cur; showRange(H, H._anchor, next); } else { H._anchor = null; }
    bs.forEach((b) => b.classList.remove('is-cursor')); bs[next].classList.add('is-cursor'); H._cursor = next;
  });
  document.addEventListener('click', (e) => { const c = e.target.closest('[data-gd-hist-clear]'); if (c) clearRange(c.closest('[data-gd-hist]')); });

  /* ------------------------------------------------ phone: cells carry their column name --
     At 767 and below a data table reads as one card per row (90-phone.css), so each cell needs its column name beside it.
     Copied from the header cell at the same position; a cell that already has data-label keeps it. Idempotent. */
  function labelCells(t) {
    const heads = $$('.gd-table__row--head', t), head = heads[heads.length - 1]; if (!head) return;
    const nameOf = (h) => { if (h.matches('.gd-table__cell--check')) return ''; const c = (h.querySelector('.gd-table__sort') || h).cloneNode(true); $$('.gd-sr, svg', c).forEach((x) => x.remove()); return c.textContent.replace(/\s+/g, ' ').trim(); };
    const names = [...head.children].map(nameOf);
    $$('.gd-table__row:not(.gd-table__row--head)', t).forEach((r) => [...r.children].forEach((c, i) => {
      if (!c.classList.contains('gd-table__cell') || c.hasAttribute('data-label') || !names[i]) return;
      c.setAttribute('data-label', names[i]);
    }));
  }

  /* ------------------------------------------------------------------ init -- */
  T.init = (root = document) => {
    $$('.gd-table', root).forEach(labelCells);
    $$('.gd-table', root).forEach((t) => { if (sels(t).length) syncSelection(t); });
    $$('[data-gd-colmenu]', root).forEach(applyColumns);
    $$('[data-gd-pager][data-gd-for]', root).forEach((pg) => { const t = $(pg.dataset.gdFor); if (t) refresh(t); });
    $$('[data-gd-pager]:not([data-gd-for])', root).forEach((pg) => updatePager(pg, false));
    $$('[data-gd-chips]', root).forEach((c) => { c.hidden = !$('.gd-chip', c); });
    $$('[data-gd-fbuilder]', root).forEach(relabel);
    $$('[data-gd-logs] .gd-logs__scroll', root).forEach((s) => { if (s.closest('[data-gd-logs]').dataset.live === 'on') s.scrollTop = s.scrollHeight; });
    watchLogs();
  };
  let queued = 0;
  const later = () => { if (queued) return; queued = setTimeout(() => { queued = 0; T.init(); }, 0); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', later); else later();
  new MutationObserver((m) => { if (m.some((x) => [...x.addedNodes].some((n) => n.nodeType === 1 && (n.matches?.('.gd-tview, .gd-table, .gd-logs, [data-gd-pager], .gd-table__row, .gd-table__group, .gd-logs__row') || n.querySelector?.('.gd-table, .gd-logs, [data-gd-pager], .gd-table__row'))))) later(); }).observe(document.documentElement, { childList: true, subtree: true });
})();
