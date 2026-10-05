# Filtering

The controls that sit above a table or log and narrow it: the toolbar, the active-filter chips, the filter builder, and saved views. Tables are in [tables.md](tables.md); styles are `css/40-tables.css`, behaviour `js/40-tables.js`. The pieces share one flow: the builder edits a draft, Apply turns it into chips, chips are the applied state, and every change fires `gd:filters` with the full list so the host can re-query. The table itself is not filtered by the builder; the host owns the query (only the search box filters rows client-side, and only when asked to).

## Table toolbar

**Purpose.** The single row above a table: search, filter, columns, view switch, export. Use it on any table the user will narrow or reshape. Omit the controls the table cannot honour; do not draw a disabled Export.

**Anatomy.**

```html
<div class="gd-tbar">
  <div class="gd-tbar__g">
    <label class="gd-tbar__search"><svg>…</svg><input type="search" placeholder="Search leads" aria-label="Search leads" data-gd-search data-gd-for="#leads"><button class="gd-tbar__clear" aria-label="Clear search" data-gd-search-clear hidden>…</button></label>
    <button class="gd-btn" data-gd-pop="filters">Filter <span class="gd-tbar__n" data-gd-filter-count>2</span></button>
  </div>
  <div class="gd-tbar__g">
    <button class="gd-btn" data-gd-menu="columns">Columns</button>
    <div class="gd-seg" role="radiogroup" aria-label="View">…</div>
    <button class="gd-btn" data-gd-emit="export">Export</button>
  </div>
</div>
```

Buttons are `gd-btn` and the view switcher is the actions author's `gd-seg`; the toolbar only lays them out. The search field is a text field: it shows a 1px `--gd-border-focus` edge when focused, not a ring (R41). Heights flow from `--gd-control-h`.

**States.** Search: rest, focus, filled (clear control appears). Filter button: the count badge shows the number of applied filters and is removed at zero, never shown as 0. Columns: hover, expanded.

**Behaviour.** Search with `data-gd-for` hides non-matching rows client-side after 150ms (case-insensitive, whole row text) and fires `gd:search {value}`; Esc or the clear control empties it. When every row is hidden and the table has a no-results block, that state shows. Export and any `data-gd-emit="name"` button fire `gd:name`; the host does the work.

**Tokens.** `--gd-border-strong`, `--gd-border-focus`, `--gd-placeholder`, `--gd-ink`, `--gd-ctl-hover`.

**Provenance.** Extracted: `.ul-tools`, `.ul-input` (analytics.html:281-290). New: the columns, view-switcher and export slots, filter count.

## Filter chip

**Purpose.** One applied filter, shown as "field operator value" with a remove control. Use it to make the current narrowing visible and individually removable. Do not use it as a tag (tag is the data author's) or as a toggle.

**Anatomy.**

```html
<span class="gd-chip" data-gd-fid="f1" data-field="status" data-op="is" data-value="Active">
  <span class="gd-chip__f">Status</span><span class="gd-chip__op">is</span><span class="gd-chip__v">Active</span>
  <button class="gd-chip__x" type="button" aria-label="Remove filter Status is Active" data-gd-chip-remove>…</button></span>
```

Chips sit in a `.gd-chips` container (`data-gd-chips`) that also holds `Clear filters` (`data-gd-chips-clear`, shown from two chips up). Field and operator are muted, the value is semibold in the value colour. Height `min(28px, --gd-control-h)`, radius 8, 1px strong edge.

**States.** Rest, hover (the chip fills `--gd-row-hover`), remove-hover, focus (ring on the remove button). Long values truncate.

**Behaviour.** Remove deletes the chip and the matching builder row, updates the filter count, hides the container when empty, and fires `gd:filters`. The chip carries its data in `data-field/op/value`, which is what `gd:filters` reports.

**Accessibility.** The remove button's label spells out the whole filter. The chip text reads as a sentence.

**Provenance.** NEW, Mobbin Neon, Aboard. Pending library review.

## Filter builder

**Purpose.** A popover for composing filters: "where field operator value", "and" more. Use it when users combine more than two conditions or need operators; one or two simple dropdown filters do not need it.

**Anatomy.**

```html
<button class="gd-btn" data-gd-pop="filters" aria-expanded="false">Filter</button>
<div class="gd-fbuilder" id="filters" role="dialog" aria-label="Filters" hidden
     data-gd-fbuilder data-gd-chips-for="#chips"
     data-gd-fields='[{"key":"status","label":"Status","type":"enum","values":["Active","Paused"]},{"key":"score","label":"Score","type":"number"}]'>
  <div class="gd-fbuilder__rows">
    <div class="gd-fbuilder__row" data-gd-frow data-gd-fid="f1">
      <span class="gd-fbuilder__lead">Where</span>
      <span class="gd-fbuilder__sel"><select class="gd-fbuilder__field" data-gd-f="field">…</select><svg>…</svg></span>
      <span class="gd-fbuilder__sel"><select … data-gd-f="op">…</select><svg>…</svg></span>
      <input class="gd-fbuilder__field" data-gd-f="value">
      <button class="gd-fbuilder__x" data-gd-frow-remove aria-label="Remove filter">…</button></div></div>
  <p class="gd-fbuilder__none" data-gd-fnone>No filters yet.</p>
  <div class="gd-fbuilder__foot"> Add filter · Clear filters · Apply </div></div>
```

The first row's lead is "Where", the rest "And". Field types are `text` (contains, does not contain, is, is not), `number` (is, is not, greater than, less than, numeric input) and `enum` (is, is not, value becomes a select of `values`). Changing the field rebuilds the operator and value controls. The popover is raised, 12px radius, `gd-menu`'s shadow and edge, and sits on the popover layer (z 60) placed by `GD.actions.place`. The 560px width collapses to the viewport.

**States.** Field: rest, focus (1px edge), invalid (`aria-invalid`, red edge, on an empty value). Row remove: rest, hover. Apply is the primary button; Clear filters is a link button; Add filter is ghost.

**Behaviour.** Add filter appends a row and focuses its value. Remove deletes a row. Apply validates (an empty value marks the field invalid and focuses it, nothing is applied), then replaces the chips with the rows, closes the popover and fires `gd:filters`. Clear filters empties rows and chips immediately and fires `gd:filters`. Esc closes and returns focus to the trigger; an outside press closes without applying. It is its own popover controller (`data-gd-pop`) rather than a `gd-menu`, because arrow keys must move inside selects and fields.

**Tokens.** `--gd-raised-bg`, `--gd-border-strong`, `--gd-border-focus`, `--gd-danger`, `--gd-card-pad`, `--gd-control-h`. Selects are native, so their open list is drawn by the OS; a custom list is a later pass.

**Accessibility.** `role="dialog"`, each control labelled (Field, Operator, Value), Esc to close, focus moves in on open and back on close.

**Provenance.** NEW, Mobbin Neon, Aboard. Pending library review.

## Saved views

**Purpose.** Named, counted segments of one table (All, Hot, Archived) that switch the whole filter state at once, plus a way to save the current filters as a new one. Use it when a table has recurring slices; for a single mode switch use tabs-pill or segmented-control.

**Anatomy.**

```html
<div class="gd-views" role="tablist" aria-label="Saved views">
  <button class="gd-views__tab" role="tab" aria-selected="true" tabindex="0">All leads <span class="gd-views__n">482</span></button>
  <button class="gd-views__tab" role="tab" aria-selected="false" tabindex="-1">Archived <span class="gd-views__n">0</span></button>
  <button class="gd-btn gd-btn--ghost gd-btn--sm" type="button" data-gd-views-save>Save segment</button></div>
```

**Counts.** A count that was read stays, including zero ("Archived 0"). A count that could not be read is removed (the whole `.gd-views__n`), never shown as 0; a loading or error table hides them through `data-gd-count`.

**States.** Tab: rest, hover, selected (`--gd-selected-bg`), focus. Save segment: ghost button; while naming, an input with a 1px focus edge replaces it.

**Behaviour.** Tabs are `role="tab"`, so 20-actions provides roving focus, arrow keys and `aria-selected` and fires `gd:tab`; the host swaps the filters. Save segment turns into a name field: Enter adds and selects the tab (no count, because none is known yet) and fires `gd:viewsave {name, filters}` with the current chips; Esc or blur on an empty field cancels.

**Tokens.** `--gd-selected-bg`, `--gd-ctl-hover`, `--gd-text-muted`, `--gd-control-h`.

**Provenance.** NEW, Mobbin Aboard. Pending library review.
