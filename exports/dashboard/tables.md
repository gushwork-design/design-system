# Tables

Tables for heavy analytics screens: dense, scrolling, sortable, selectable. Everything here is a div grid (not a `<table>`), because every row is its own grid and a content-sized track would resolve per row. Styles are `css/40-tables.css`, behaviour is `js/40-tables.js` (hooks listed in its header). Toolbar, filters and saved views are in [filtering.md](filtering.md). Density follows `--gd-row-h`, `--gd-head-h`, `--gd-cell-px` and `--gd-control-h`, so `data-density="compact"` on any ancestor tightens the whole table. Menus (column menu, row actions, items per page) are the `gd-menu` of 20-actions, opened by its `data-gd-menu` trigger; this file only listens for the `gd:menu` event they emit.

## Data table

**Purpose.** A sortable grid of records: leads, sessions, campaigns, channels. Use it for 5 or more comparable rows with several attributes. Do not use it for a handful of label/value pairs (use key-value-list), for a single metric (stat-card), or for a form (rows with inputs belong to the settings pattern, not here).

**Anatomy.**

```html
<div class="gd-tview">                                  <!-- bordered frame; --flush inside a card -->
  <div class="gd-table-wrap" style="--gd-table-max-h:480px">   <!-- the scroller; sticky header needs a max height -->
    <div class="gd-table gd-table--sticky-first" role="table" aria-label="Leads"
         style="--gd-cols:minmax(180px,1.6fr) 100px 80px 120px; --gd-table-min:720px">
      <div class="gd-table__row gd-table__row--head" role="row">
        <div class="gd-table__th" role="columnheader" aria-sort="ascending" data-gd-col="lead">
          <button class="gd-table__sort" type="button" data-gd-sort>Lead <svg>…</svg></button></div>
        <div class="gd-table__th gd-table__th--num" role="columnheader">Score</div> …
      </div>
      <div class="gd-table__body" role="rowgroup">
        <div class="gd-table__row" role="row" data-gd-id="lead_1">
          <div class="gd-table__cell gd-table__cell--strong" role="cell">Acme Roofing</div>
          <div class="gd-table__cell gd-table__cell--num" role="cell">92</div> …
```

Columns come from one custom property, `--gd-cols`, set on the table. Use a fixed first track and `minmax(floor, 1fr)` for the rest so every row resolves identically. `--gd-table-min` is the width below which the wrapper scrolls sideways.

**Cell modifiers.** `--strong` (value colour, the row's label), `--muted`, `--num` (right-aligned, tabular numerals; add `gd-table__th--num` on its header), `--flex` (inline content: badge, avatar), `--check`, `--rank`, `--actions`, `--heat`. Plain cells truncate with an ellipsis; put the full text in `title`.

**Variants.**
- **Sticky first column.** `gd-table--sticky-first` pins column 1; `gd-table--sticky-select` pins the checkbox column and column 2 (first track `var(--gd-sel-w)`). The header stays pinned by default.
- **Sorting.** `aria-sort` on the header and a `data-gd-sort` button. The glyph is the hub's arrows-down-up; the active direction brightens and turns primary/500.
- **Expandable row groups** (hub `.ul-grp`). `.gd-table__group` wraps a `data-gd-expand` row and a `.gd-table__detail`; the caret rotates, the open group takes the sunken fill. The hub dims closed groups while one is open; that effect is dropped because it needs `:has()` over every row.
- **Tree rows.** `role="treegrid"` on the table; rows carry `data-level`, `aria-level`, `aria-expanded`, `data-gd-expand`, and the first cell holds `.gd-table__tree` with `--lvl` (indent 16px per level) and a `.gd-table__caret`. Leaves keep an empty caret slot so labels align. Collapsing a row hides its descendants (`data-gd-collapsed`) and remembers collapsed children.
- **Totals row.** `.gd-table__row--total` plus `--pin-bottom` (sticky foot, in its own rowgroup) or `--pin-top` (under the header). Bold, tabular, strong rule on the inner edge.
- **Grouped column headers.** Two header rows: the second has `gd-table__row--head2` and sticks below the first; the spanning cell is `gd-table__th--group` with `grid-column: span N`.
- **Rank column.** `gd-table__cell--rank`, header `#`.
- **Trend delta cell.** A `.gd-delta.gd-delta--sm` (delta-pill, owned by the data author) in a `--flex --num` cell.
- **Header hint.** A `.gd-hint` (owned by the actions author) in place of the plain label, so the definition lives on the header. Hint and sort button are siblings; do not nest.
- **Inset** (`gd-table--inset`). The hub's look: rows inset 8, hover radius 12, hairlines as pseudo-elements. Not compatible with sticky columns.
- **Lazy** (`gd-table--lazy`). `content-visibility: auto` on rows for hundreds of rows. Keep rows light: no per-row shadow, transition or `:has()`.

**States.** Row: rest, hover (`--gd-row-hover`), selected (`aria-selected="true"`, `--gd-row-selected`), active (a row whose actions menu is open, `data-gd-active`). Header: rest, sort hover, sorted. Group: closed, open. Loading, empty, error and no-results are table-states.

**Tokens.** `--gd-row-h`, `--gd-head-h`, `--gd-cell-px`, `--gd-card-bg`, `--gd-border`, `--gd-border-strong`, `--gd-text`, `--gd-text-body`, `--gd-text-muted`, `--gd-accent`, `--gd-sunken-bg`, plus `--gd-row-hover` and `--gd-row-selected` declared in 40-tables.css. The hub's header has no fill (its last rule wins over the earlier grey one), so the sticky header is the card colour with a firmer rule; 00-base documents the table header as sunken, which the hub no longer draws.

**Accessibility.** `role="table"` (or `treegrid`), `row`, `columnheader`, `cell`, `rowgroup`. `aria-sort` only on sortable columns. A sort button is a real button. Rows with an expander are focusable (`tabindex="0"`) and respond to Enter and Space. Hover is never the only carrier of information.

**Behaviour.** Sort reorders the rows client-side by `data-gd-value` or cell text (`data-gd-type="number"` on the header for numeric), blanks last, stable; `data-gd-sort-mode="server"` only fires `gd:sort`. Group and tree toggles flip `aria-expanded`.

**Provenance.** Extracted: `web/admin/analytics.html:362-428,457`, `access-control.html:105-157`. New: sticky header and first column, `--gd-cols`, totals, tree, grouped headers, rank, lazy. Mobbin: Semrush, Causal, Substack, Mixpanel. Pending library review.

## Table cell types

**Purpose.** The cell shapes a data table uses, with exact markup so every table prints them identically. Use these; do not invent a cell per screen.

| Type | Markup |
|---|---|
| Text | `<div class="gd-table__cell" role="cell">Dallas, TX</div>`; `--strong` for the row label, `--muted` for secondary |
| Number | `<div class="gd-table__cell gd-table__cell--num" role="cell">1,204</div>` with a `gd-table__th--num` header |
| Badge | `<div class="gd-table__cell gd-table__cell--flex" role="cell"><span class="gd-badge gd-badge--good">Active</span></div>` (badge is the data author's) |
| Avatar and name | `--flex` cell with `<span class="gd-table__avatar">PN</span><span class="gd-table__who"><b class="gd-table__trunc">Priya Nair</b><small>Account lead</small></span>` |
| Progress | `--flex gd-table__prog` cell with `<span class="gd-table__meter"><i style="--v:72%"></i></span><span>72%</span>`; the number is always printed |
| Sparkline | `--flex` cell with `<svg class="gd-table__spark gd-table__spark--up" viewBox="0 0 72 20" role="img" aria-label="…"><path d="…"/></svg>`; `--up`, `--down`, `--flat` pick good, danger, muted; default accent |
| Link | `<a class="gd-table__link" href>`, underlined in the value colour (hub `.ul-c--out a`) |
| Actions | `--actions` cell holding one `.gd-table__more` (see Row actions menu) |
| Heat | `gd-table__cell--heat` with `data-heat="0..5"`; fill is the charts author's `--gd-seq-1…5` ramp, 0 is empty |
| Rank, delta | see Data table |

**Rules.** The sparkline takes its direction word into the `aria-label` and is never the only carrier of the trend: pair it with the number. Heat cells always print the value; colour never stands alone, and level 4 and 5 swap the text to the inverse so the ratio holds in both themes. A cell with no value shows an em dash in muted text, not 0. `data-gd-sparklines="off"` on the table hides sparklines (the column menu's "Show sparklines" item sets it).

**Tokens.** `--gd-accent`, `--gd-good`, `--gd-danger`, `--gd-border-strong` (meter track), `--gd-selected-bg` (avatar), `--gd-seq-1…5`, text aliases.

**Accessibility.** Decorative avatars are `aria-hidden`; the name carries the meaning. Meters are `aria-hidden` because the number is printed beside them.

**Provenance.** Extracted: `.ul-c`, `.ul-badge`, `.ul-c--who`, `.ul-c--out a` (analytics.html:378-397). New: avatar and name, progress, sparkline, heat. Mobbin: Mixpanel, Fresha.

## Row selection

**Purpose.** Pick rows to act on in bulk. Use it when a table has bulk actions. Do not add a checkbox column to a read-only table.

**Anatomy.** First track `var(--gd-sel-w)`; header cell `.gd-table__cell--check` holds `<label class="gd-check"><input type="checkbox" data-gd-select-all aria-label="Select all rows"><span class="gd-check__box"></span></label>`; each row holds the same with `data-gd-select-row`. Combine with `gd-table--sticky-select`.

**States.** Header: unchecked, checked (all selectable visible rows), indeterminate (some). Row: `aria-selected="true"` gives the primary/alpha-10 fill; a disabled row's checkbox is skipped by select-all and by ranges.

**Behaviour.** Click toggles. Shift-click selects the range from the last clicked row to this one, applying this row's new state. The header box selects or clears every visible, enabled row (hidden rows on other pages are untouched; the bulk count counts them). `gd:selection {count, ids}` fires on every change. Esc clears the selection when focus is in the table or bar and not in a text field. The header box also carries `aria-checked="mixed"` while indeterminate so the checkbox styling matches.

**Accessibility.** Every checkbox has a label naming its row. The selected state is carried by the checkbox and `aria-selected`, never colour alone.

**Tokens.** `--gd-row-selected`, `--gd-sel-w`. **Provenance.** NEW, Mobbin Calendly, Midday. The old data-table ruling (primary/alpha-10) is kept; the hub draws no selected row.

## Bulk action bar

**Purpose.** The floating bar that appears while one or more rows are selected: "N selected", the actions, and a clear control. Do not use it as a general toolbar.

**Anatomy.**

```html
<div class="gd-bulk" data-gd-bulk data-gd-for="#leads" role="toolbar" aria-label="Bulk actions" hidden>
  <span class="gd-bulk__n" aria-live="polite"><span data-gd-bulk-count>0</span> selected</span>
  <button class="gd-bulk__btn" type="button">Export</button>
  <button class="gd-bulk__btn gd-bulk__btn--danger" type="button">Delete</button>
  <button class="gd-bulk__btn gd-bulk__btn--icon" type="button" aria-label="Clear selection" data-gd-bulk-clear>…</button>
</div>
```

It is an ink pill (`--gd-ink` fill, inverts in dark). Default is `position: sticky` at the bottom of its scroller so it floats without leaving the layout; `gd-bulk--fixed` pins it to the viewport. Destructive actions take the red label (`--gd-bulk-danger`), never a red fill; the confirm dialog carries the weight.

**States.** Rest, hover (`--gd-bulk-hover`), focus (ink-fg outline). Hidden at zero.

**Behaviour.** Shown and counted by selection; Clear unchecks everything and returns focus to the header checkbox. The count is announced politely.

**Finding.** The brief's z-index list has no layer for a floating bar; it uses `z-index: 1` inside its scroller. A page-level floating bar would need a ruling.

**Provenance.** NEW, Mobbin Calendly, Midday, Aboard.

## Column menu

**Purpose.** Show and hide columns. Use it on tables with more than about six columns. Do not use it to reorder.

**Anatomy.** A `gd-btn` triggers (`data-gd-menu="id"`), a `gd-menu` with `data-gd-colmenu data-gd-keep data-gd-for="#table"` holds `gd-menu__item role="menuitemcheckbox" aria-checked data-gd-col="key"` per column; the header cell and every row cell carry the same `data-gd-col` positions. Optional item `data-gd-table-flag="sparklines"` ("Show sparklines").

**Behaviour.** Toggling writes `--gd-cols` (the original tracks are read once, hidden ones dropped) and sets `hidden` on that column's cells in every row. Paired-control guard: when one column is left, its item becomes `aria-disabled="true"` and cannot be unchecked, so the table is never empty. Fixed columns (checkbox, actions) have no item. `gd:columns {visible}` fires.

**Tokens.** From `gd-menu`. **Accessibility.** `menuitemcheckbox` with `aria-checked`; keyboard from 20-actions. **Provenance.** NEW, Mobbin Midday, Neon.

## Row actions menu

**Purpose.** The per-row overflow menu. Use it for 3 or more row actions; one or two actions are buttons.

**Anatomy.** A `.gd-table__more` button per row (`data-gd-menu="row-menu"`, `aria-haspopup="menu"`, `aria-label="Actions for <row>"`) and ONE shared `gd-menu` with `data-gd-row-menu` outside the table. Items carry `data-gd-action`; the destructive item is `gd-menu__item--danger` (red label, same shape) and sits last after a separator. One menu for the whole table keeps hundreds of rows light.

**States.** Trigger: rest, hover, expanded. The row stays lit (`data-gd-active`) while its menu is open.

**Behaviour.** The menu is placed fixed by 20-actions so the scroller never clips it. Choosing an item fires `gd:rowaction {action, row, id}` on the row (`id` from the row's `data-gd-id`).

**Accessibility.** 44px hit area (a pseudo-element) without growing the row; Esc closes and returns focus. **Provenance.** Extracted: `.ac-icbtn` (access-control.html:188-196), menu from 20-actions.

## Pagination

**Purpose.** Move through a long result set. Use it below a table; infinite scroll belongs to the log viewer.

**Anatomy.** `.gd-pager` with left side (`[data-gd-range]` "1–25 of 482", "Items per page" and a `gd-btn gd-btn--sm gd-pager__per` trigger with a `[data-gd-value]`) and right side (`[data-gd-pages]` "Page 3 of 20", prev and next as 28px `.gd-pager__btn`). Variant: add first and last buttons and replace the text with `Page <input class="gd-pager__jump" data-gd-page-input> of <span data-gd-page-of>`.

**States.** Button: rest, hover, disabled (opacity .4, on page 1 for first/prev and on the last page for next/last). The jump input shows a 1px edge on focus, not a ring (R41).

**Behaviour.** `data-gd-pager` with `data-gd-page`, `data-gd-per`, `data-gd-total`. With `data-gd-for="#table"` it slices the table's rows itself and counts what survives a search; without it, it only maintains labels and fires `gd:page {page, per, pages}` for server paging. The jump input commits on Enter or blur and clamps to the range. The per-page menu is a `gd-menu` of `menuitemradio` items with `data-value`; changing it returns to page 1.

**Tokens.** `--gd-border-strong`, `--gd-ctl-hover`, text aliases. A quantity that cannot be read is removed: the pager is hidden while loading or in error, never shown as "0 of 0".

**Provenance.** Extracted: `.ul-pg` (analytics.html:459-461), `.ac-pg` (access-control.html:82-91). New: items per page, first and last, jump input. Mobbin Semrush.

## Table states

**Purpose.** What a table shows when it has no rows to show: loading, empty, error, no results for the current filter. Each is a state of the same frame, not a separate screen.

**Anatomy.** Put `data-state="loading|empty|error|noresults"` on the `.gd-tview`. Inside: the table with a ghost body (`.gd-table__body--ghost`, rows of `.gd-ghost` bars), and one `.gd-tstate--empty|--error|--noresults` per state wrapping a `.gd-empty` (the feedback author's; `--error` for the failure). The header stays so the shape of the data is known; the live body is hidden.

**Copy.** Empty: what will appear and the one action. Error: what failed and Retry (`data-gd-emit="retry"`); the data is not claimed lost. No results: names the filter and offers Clear filters (`data-gd-emit="clear-filters"`, which also clears chips).

**Rules.** Loading sets `aria-busy="true"` on the table. Counts and the pager are removed in loading and error (`[data-gd-count]`), never zeroed. A zero that was actually read ("Archived 0") stays. The empty and error badges are rounded squares. Error is `role="alert"`.

**Behaviour.** `GD.tables.setState(view, state)`; a search that hides every row switches to `noresults` automatically when that block exists. **Provenance.** Extracted: loading rows (analytics.html:1585-1586), empty (`.ul-empty`). New: error, no-results.

## Log viewer

**Purpose.** Dense, monospace, scannable log lines for services and jobs: time, level, service, message, with a live tail. Use it for event streams you read top to bottom. Do not use it for records you sort and compare (data table).

**Anatomy.**

```html
<div class="gd-logs" data-gd-logs data-live="on" data-wrap="off" role="table" aria-label="Application logs" aria-rowcount="1284">
  <div class="gd-logs__bar"> Live · Wrap lines · Expand logs · count </div>
  <div class="gd-logs__scroll" tabindex="0">
    <div class="gd-logs__older"><button class="gd-btn gd-btn--sm" data-gd-logs-older>Load older</button></div>
    <div class="gd-logs__head" role="row">…</div>
    <div class="gd-logs__row" role="row" aria-rowindex="1" data-level="error" tabindex="0" data-gd-expand aria-expanded="false">
      <div class="gd-logs__c gd-logs__c--time" role="cell">…</div> <!-- level badge, service, message -->
    </div>
    <div class="gd-logs__detail" role="row" hidden><dl class="gd-logs__kv" role="cell"><dt>request_id</dt><dd>…</dd></dl></div>
```

A 4px severity bar is the row's first grid track, coloured by `data-level` (`debug` border-strong, `info` placeholder grey, `ok` good, `warn` warn, `error` and `fatal` danger); the level badge repeats it in words so colour is never alone. Rows are fixed height (`--gd-log-h` = half of `--gd-row-h`, 28px comfortable, 20 compact), which is what makes the list virtualisation-friendly: keep `aria-rowcount` on the container and `aria-rowindex` on each rendered row, and render only the window. Rows use `content-visibility: auto` meanwhile. `gd-logs--select` adds a checkbox column (same selection hooks as the table).

**Variants.** Wrap (`data-wrap="on"`, rows grow, message pre-wraps; incompatible with fixed-height virtualisation, so it is a toggle and off by default). Expand logs (every row opens its key/value detail). Load older (button at the top; busy while the host loads, `gd:logs {older, done}`).

**Live tailing.** `data-live="on"` keeps the view at the bottom as rows are appended. Scrolling up pauses it (`paused`, amber dot, "Jump to latest" button, no jumping when rows arrive); returning to the bottom or pressing Live resumes. Pressing Live while on turns it off. `gd:logs {live}` fires.

**States.** Row: rest, hover, expanded (`aria-expanded`), selected, focus. Bar button: pressed. Empty: `.gd-logs__empty`.

**Tokens.** `--gd-font-mono` (declared in 40-tables.css), `--gd-good`, `--gd-warn`, `--gd-danger`, `--gd-placeholder`, `--gd-row-hover`, `--gd-sunken-bg`. **Finding:** `tokens.css` has no monospace token; the hub's `ui-monospace, Menlo, monospace` stack is used and flagged, not added as a token.

**Accessibility.** Rows are focusable and open with Enter or Space; the scroller is focusable for keyboard scrolling; live state is a labelled toggle button.

**Provenance.** NEW, Mobbin Railway, Cloudflare, Supabase, Modal, Okta, Sentry.

## Histogram

**Purpose.** Event volume over time, stacked by level, above a log or table, with a brush to pick a time range. A thin companion to the log viewer, not a general chart: use the bar-chart for anything else.

**Anatomy.** `.gd-hist[data-gd-hist][data-gd-bucket="600000"]` with a `.gd-hist__plot` (focusable group) of `.gd-hist__bar` elements, one per bucket: `data-t` (epoch ms or ISO), `title`, and `style="--h:62%; --i:70; --w:20"` where `--h` is the bar's height share, `--i` and `--w` the info and warn percentages of that bar (the remainder is error). One element per bucket keeps 500 buckets cheap. Then `.gd-hist__brush`, `.gd-hist__axis`, a legend and a range readout (`[data-gd-hist-range]` with `[data-gd-hist-label]` and a Clear range button `data-gd-hist-clear`).

**Colour.** Info `--gd-accent`, warn `--gd-warn`, error `--gd-danger`: status colours, not categorical series, so R11's ceiling of three does not apply. The legend names them.

**Behaviour.** Drag across the plot to select; releasing fires `gd:range {fromIndex, toIndex, from, to}` (`to` is the end of the last bucket). A click without a drag, Esc, or Clear range clears it (`from` and `to` null). Keyboard: Left and Right move a cursor, Shift plus arrows extends a range, Enter commits, Esc clears.

**Finding.** The charts author's bar-chart is rendered from data by `GD.charts`, with no static markup to reuse, so this ships its own minimal bars. Fold it into bar-chart if the owner wants one component.

**Accessibility.** The plot is `role="group"` with a label that says how to select; each bar has a `title` with its time and counts; the range is also printed as text.

**Provenance.** NEW, Mobbin Sentry, Datadog log explorer.
