# Dashboard shell and page layout

The frame every dashboard screen sits in, and the way a page lays itself out inside it: the app shell (rail, optional phone topbar, floating content panel), the sidebar in its two widths, the page header, the page layout grid, and two layouts for heavy tools, the widget grid and the explorer layout. Page chrome is built from these components only; a screen never hand-builds its own rail, header or sticky strip. Source is the design hub (`web/shell.css`, `web/shell.js`, `web/admin/analytics.html`, `web/admin/access-control.html`); where a component is not in the hub it is marked NEW and is pending library review. CSS is `css/10-shell.css`, behaviour is `js/10-shell.js`. The navigation parts that live inside the rail are in `navigation.md`.

Everything is scoped by `class="gd"` on `<html>` or `<body>` and themed by `color-scheme` (no `data-theme` follows the OS; `light` and `dark` force it). Density is set once with `data-density="compact"` and every height here follows `--gd-control-h`, `--gd-row-h`, `--gd-head-h`, `--gd-cell-px`, `--gd-gap` and `--gd-card-pad`.

## App shell

**Purpose.** The outer frame: the rail on the page ground at the left, and the content panel floating on that ground at the right (12px clear on the top, right and bottom). It owns the viewport, the scale rule, the phone reflow and the single scroll region. Use it once per app. Do not use it for a login screen, an empty marketing page or a full-screen tool with no navigation.

**Anatomy.**
```html
<div class="gd-app">                                  <!-- the size container, named gd-app -->
  <aside class="gd-sidebar" id="gd-rail">…</aside>     <!-- sidebar -->
  <div class="gd-app__main">
    <header class="gd-topbar">…</header>               <!-- phone only -->
    <section class="gd-panel">…</section>              <!-- content panel -->
  </div>
</div>
```
`gd-app--embed` makes the shell fill a bounded frame (no viewport height, no zoom); it is for docs, previews and tests. Below 768 wide an embed renders the phone layout, so a desktop embed needs 768 or more.

**Responsive (R17 as the hub ships it).** The shell is a container query on its own width, so the rules follow the box and not only the window.
- **1440 and wider:** the measured layout, scale 1. It never scales up.
- **768 to 1439:** the whole shell is scaled with `zoom`, factor `width / 1440`, and nothing reflows. `js/10-shell.js` writes `--gd-fit` on `<html>`; the shell's height is `100dvh / --gd-fit` because viewport units are not divided back by zoom. Type paints smaller than the ramp; that is the accepted price.
- **767 and narrower:** scale is 1 and the layout reflows. The topbar appears, the panel bar is dropped, the panel loses its radius and shadow, the page gutter becomes 20, spans collapse (see Page layout), and the rail becomes a drawer that slides in from the left, full width, under the topbar.
`DECISIONS.md` R17 still describes a reflow below 1280; the shipped code scales to 768. This document follows the code.

**One scroll region.** `.gd-panel__body` is the only element that scrolls. The rail never moves; its nav list scrolls internally while the account row stays pinned. The hub scrolled the document on phone; here the panel body scrolls at every width, so sticky offsets are the same everywhere.

**States.** `data-nav-open="true"` on `.gd-app` is the phone drawer open. There is no loading state of its own; the account row and page content carry theirs.

**Accessibility.** The rail is `<aside aria-label="Primary">`, the panel is a `<section>`. The drawer is not in the tab order while closed (`visibility: hidden`). Esc closes it and returns focus to the burger.

**Behaviour.** `data-gd-nav-toggle` opens and closes the drawer, Esc closes it, following a rail link closes it, widening past 767 closes it. Scale is automatic.

**Tokens.** `--gd-page-bg`, `--gd-panel-bg`, `--gd-panel-edge` (NEW alias: a hairline on the dark panel, which is the same black as the ground), `--gw-radius-16`, `--gw-shadow-s3`, `--gw-motion-fast`. **Provenance.** extracted: `web/shell.css:262-286, 1566-1593, 1658-1733`.

## Sidebar

**Purpose.** The primary navigation rail, 260 wide. Use it for the app's top-level destinations, grouped. Do not put page actions, filters or a second level of in-page tabs in it; those belong to the page header and sub-nav.

**Anatomy.**
```html
<aside class="gd-sidebar" id="gd-rail" data-collapsed="false" aria-label="Primary">
  <div class="gd-sidebar__top">
    <a class="gd-sidebar__brand" href="/"><span class="gd-sidebar__chip">…</span><span class="gd-sidebar__name">Gushwork</span></a>
    <button class="gd-sidebar__toggle" data-gd-rail-toggle aria-expanded="true" aria-controls="gd-rail" aria-label="Collapse sidebar">…</button>
  </div>
  <nav class="gd-sidebar__nav" aria-label="Main"> …nav-groups… </nav>
  <div class="gd-sidebar__foot"> …account-row… </div>
</aside>
```
The top block holds the brand, or a workspace switcher when the person belongs to more than one workspace. The nav list holds every group and scrolls on its own. The foot is pinned.

**Variants.** Brand or switcher on top. The collapse toggle is optional; omit it for a fixed rail.

**States.** Expanded, collapsed (own entry below), and as a phone drawer. The collapse button is a real control: it flips `data-collapsed`, `aria-expanded` and its label. Persist with `data-gd-persist` (stored in `localStorage` as `gd-rail`).

**Tokens.** `--gd-gap`, `--gd-control-h`, `--gd-text-muted`, `--gd-border-strong`, `--gd-icon` (NEW alias), `--gw-motion-fast`. Rail padding is 32 / 16 / 16; the top block is `--gd-control-h` tall, which centres the brand on the panel bar.

**Accessibility.** One landmark per nav list; groups carry their own label. Arrow keys, Home and End move between rows. **Provenance.** extracted: `web/shell.css:522-562, 1798-1804`.

## Sidebar collapsed

**Purpose.** The same sidebar at 64 wide, icons only, for people who want the room. Use it when the content is wide (tables, the explorer layout); keep expanded as the default because labels are how people find things.

**What changes.** Labels, counts, carets, the switcher text and the account text are removed visually but stay in the accessibility tree; each row gets a Tooltip (`data-gd-tooltip`, placement right, set by JS) so the name shows on hover and keyboard focus. Group labels become a hairline. Expandable groups hide their children: clicking a group head in the collapsed rail expands the rail first, then opens the group. The account row shows the avatar only and the sign-out action is dropped. The toggle's glyph flips.

**Behaviour.** `data-gd-rail-toggle`. The collapsed rules apply only at 768 wide and above; the phone drawer is always expanded.

**Accessibility.** `aria-expanded` on the toggle, `aria-label` flips to "Expand sidebar". Focus is never lost on toggle. **Provenance.** NEW: not in the hub, reference Mobbin Linear, Vercel, Clerk. Pending library review.

## Topbar

**Purpose.** The phone bar: brand on the left, then the two actions that have no other home on a phone (search icon, theme menu), then the menu button at the right end. It exists only because on a phone the rail is the thing the burger opens. At 768 and wider it is not drawn; the content panel bar carries search and theme instead. Use `gd-topbar--always` only for a phone-only app or to show it in docs.

**Anatomy.** `.gd-topbar > .gd-topbar__start (burger + brand) + .gd-topbar__acts (search-trigger icon, theme-menu)`. The bar draws the burger last, at the right end (CSS `order`, the markup keeps it first). The burger is `.gd-topbar__btn` with `data-gd-nav-toggle`, `aria-expanded` and `aria-controls` pointing at the rail; its glyph swaps list and close from the state.

**Tokens.** Height is `--gd-control-h + 24` (60 comfortable, 52 compact). **Provenance.** extracted: `web/shell.css:355-405, 1624-1704, 1828-1835`.

## Content panel

**Purpose.** The white panel floating on the grey ground. It holds an optional bar (search trigger left, utility actions right) fixed above the one scroll region. Use it as the body of the app shell. Do not nest panels.

**Anatomy.**
```html
<section class="gd-panel" aria-label="Content">
  <div class="gd-panel__bar"> <button class="gd-search">…</button> <div class="gd-panel__acts">theme-menu, …</div> </div>
  <div class="gd-panel__body"> <div class="gd-page">…</div> </div>
</section>
```
`<div class="gd-panel__body" data-fill>` stops the body scrolling and lets a fill layout (the explorer) scroll its own panes; that is the one deliberate exception to a single scroller.

**Tokens.** `--gd-panel-bg`, `--gd-panel-edge`, `--gw-radius-16`, `--gw-shadow-s3`. The bar is `--gd-control-h + 40` tall (76 comfortable, 68 compact) with the page gutter on each side. The scrollbar is hidden, as in the hub. **Provenance.** extracted: `web/shell.css:262-295, 1843-1858`.

## Page layout

**Purpose.** The grid and rhythm of a page inside the panel: gutter, section gap, the 12-column grid, the sticky strips, and the settings split. Use `.gd-page` as the single child of the panel body. Do not scroll anything else.

**Anatomy and parts.**
- `.gd-page` is a flex column, gutter `--gd-gap * 2.5` (40 / 30), section gap `--gd-gap * 1.5`. `--measure` caps it at 800 for forms and settings; `--fill` removes gutters and gap for the explorer.
- `.gd-grid` is 12 columns with `--gd-gap`. Children span 12 by default; `gd-span-1` to `gd-span-12` set the span. KPI rows are `gd-span-3`, a chart beside a list is `gd-span-8` and `gd-span-4`.
- Sticky strips, in order: the optional sticky page header (`gd-page-header--sticky`), the tab strip (`gd-page-header__tabs`, `--gd-control-h + 4` tall) and the filter bar slot `.gd-page__filters`. Each sticks under the one above. CSS knows the tab height; only a sticky header's height is measured, by JS, into `--gd-s-head`. Every sticky strip has a hairline under it (`--gd-border`): the tab strip's own rule, the page header's rule when it has no tabs, and, since 6 Oct 2026, an inset shadow under the filter bar slot, so content scrolling beneath a strip reads as separate from it. The shadow adds no height. On a phone the filter bar is static and scrolls away, so it has no line there.
- `.gd-page__split` is a 220 column plus content for settings: put a sub-nav in the first cell, it sticks under the strips.

**Responsive.** At 767 and narrower the gutter is 20, spans of 6 or fewer become 6 (two across, so KPI cards keep two columns), larger spans become 12, and the split stacks with the sub-nav as a horizontal strip.

**Accessibility.** The filter bar slot needs a name from its contents; do not make the sticky strips cover focused content: scroll-padding is the consumer's to set if rows are tall. **Provenance.** extracted: `web/shell.css:2005-2008, 2124-2220` and the sticky strips from `analytics.html:499` and `access-control.html:24`; the 12-column grid is NEW (the hub has fixed 800 + 220 and 1120 columns).

**Phone.** In a 12 column grid a span of 1 to 3 pairs up two to a row (stat tiles); anything spanning 4 or more takes the full width. Until 6 Oct 2026 spans 4 to 6 also went half width, which squeezed charts and cards into a column of 150. The sticky filter bar scrolls away with the page.

## Page header

**Purpose.** The title block of a page: title, description, actions and, optionally, breadcrumbs above and a tab strip below. Use one per page. Do not use it for a section inside a page; that is a section header (cards).

**Anatomy.**
```html
<header class="gd-page-header">
  <div class="gd-page-header__main">
    <div class="gd-page-header__titles">
      <div class="gd-page-header__crumbs"> breadcrumbs </div>   <!-- optional -->
      <h1 class="gd-page-header__title">Lead analytics</h1>
      <p class="gd-page-header__desc">Where leads come from and how fast agents reply</p>
    </div>
    <div class="gd-page-header__actions"> buttons </div>
  </div>
  <div class="gd-tabs gd-tabs--underline gd-page-header__tabs" role="tablist"> … </div>   <!-- optional -->
</header>
```
The header is `display: contents` so the tab strip is a child of `.gd-page` and can stay stuck for the whole page.

**Variants.** Default (44px display title; 26 in compact density); `--sm` for detail pages; `--sticky` keeps the title block stuck; with tabs the header's own rule gives way to the strip's hairline (one line, not two); **editable** (NEW): the title and description are inputs.

**Editable title.** `<input class="gd-page-header__title-input" data-gd-edit="title" data-initial="…">` and `<textarea class="gd-page-header__desc-input" data-gd-edit="description" placeholder="Add description…">`. The fields are invisible until hovered (a hover fill); focus shows the 1px `--gd-border-focus` edge, not a ring (R41). Enter commits a title, Esc reverts both, the description grows with its text, change fires `gd:title-change`. A status badge goes in `.gd-page-header__status` inside the title (a `gd-badge gd-badge--neutral` "Draft"), and share and save are normal actions; the primary action is Save.

**Tokens.** `--gd-text`, `--gd-text-muted`, `--gd-border`, `--gd-hover-bg`, `--gd-border-focus`, `--gd-placeholder`, `--gd-gap`. 44px has no type token: a token gap.

**Accessibility.** The title is the page's one `<h1>`; editable inputs carry an `aria-label`. **Provenance.** extracted: `web/shell.css:2174-2203`, `analytics.html:499-520`. Editable variant NEW: reference Mobbin Amplitude, Mixpanel.

## Widget grid

**Purpose.** A dashboard canvas the person can arrange: widgets of four sizes on the 12-column grid, an Edit layout mode, and an add-widget panel. Use it for home and overview dashboards where different roles want different things. Do not use it for a fixed report; use `gd-grid` with cards.

**Anatomy.**
```html
<section class="gd-widget-grid" data-gd-widgets data-editing="false">
  <div class="gd-widget-grid__bar"> title + [Add widget] [Edit layout]  (data-gd-widgets-edit="start") </div>
  <div class="gd-widget-grid__banner" hidden> Customize your layout … [Cancel] [Done] </div>
  <div class="gd-widget-grid__stage">
    <div class="gd-widget-grid__canvas">
      <article class="gd-widget-grid__item" data-gd-widget-id="src" data-size="m">
        <button class="gd-widget-grid__remove" data-gd-widget-remove aria-label="Remove Leads by source">…</button>
        <div class="gd-widget-grid__head"> handle, title, size group </div>
        <div class="gd-widget-grid__body"> … </div>
      </article>
      <div class="gd-widget-grid__slot" hidden>Drop a widget here</div>
    </div>
    <aside class="gd-widget-grid__palette" hidden> options with data-gd-widget-add="id" </aside>
  </div>
  <div class="gd-sr gd-widget-grid__live" aria-live="polite"></div>
</section>
```
**Spacing.** A widget's padding is `--gd-card-pad` on the top and both sides and under the body; the heading sits that far from the top and 12px above its chart.

**Sizes.** `data-size` `s` (4 columns), `m` (6), `l` (8), `full` (12). On a phone every widget is full width except `s`, which is half.

**Edit mode.** Entering shows the banner, a drag handle, the size group (S, M, L, XL) and a remove badge on each widget, the drop slot, and the add panel. The remove badge is a rounded square in the ink fill, never a circle, never red. Cancel restores the exact order, sizes and removed widgets from when editing began; Done keeps them. Esc cancels. A removed widget reappears in the add panel.

**Pointer and keyboard (R19).** Drag the handle to reorder. Keyboard path: focus the handle, Arrow keys move the widget earlier or later, plus and minus change its size, and the size buttons do the same by click. Every change is announced in the live region.

**Persistence.** The component stores nothing. Each change fires `gd:layout` with `{reason, widgets: [{id, size}]}` in order; the app saves it. Adding fires a cancelable `gd:widget-add`; if the app does not handle it, a `<template data-gd-widget-template="id">` in the grid is cloned.

**Tokens.** `--gd-card-bg`, `--gd-border`, `--gd-border-strong`, `--gd-border-focus`, `--gd-sunken-bg`, `--gd-ink`, `--gd-ink-fg`, `--gd-card-pad`, `--gd-gap`. **Provenance.** NEW: not in the hub, reference Mobbin Xero, Aboard, Evernote, Zoho CRM, Salesforce. Pending library review.

**Phone.** Every widget is full width except size S, which pairs up.

## Explorer layout

**Purpose.** The analytics tool layout: a collapsible query panel on the left, a chart above a results table in the centre with a horizontal splitter between them, and an optional docked details panel on the right. Use it for open-ended exploration (funnels, event queries, logs). Do not use it for a read-only report.

**Anatomy.**
```html
<div class="gd-page gd-page--fill"> page header
  <div class="gd-explorer" data-gd-explorer>
    <section class="gd-explorer__pane gd-explorer__query" id="ex-q" data-gd-pane="query">
      <div class="gd-explorer__head"> title <button class="gd-explorer__collapse" data-gd-explorer-collapse="query" aria-expanded="true">…</button></div>
      <div class="gd-explorer__body"> query controls </div></section>
    <div class="gd-resizer" role="separator" aria-orientation="vertical" tabindex="0" data-gd-resizer="query" aria-valuemin="200" aria-valuemax="560" aria-valuenow="280" aria-controls="ex-q" aria-label="Resize query panel"></div>
    <div class="gd-explorer__main"> chart pane, horizontal separator (data-gd-resizer="chart"), results pane </div>
    <!-- optional: separator data-gd-resizer="dock" + .gd-explorer__dock -->
  </div>
</div>
```
Put it in a panel body with `data-fill`. The explorer fills the panel; each pane scrolls on its own.

**Resizing.** Separators are `role="separator"` with `aria-valuenow`, `aria-valuemin`, `aria-valuemax` in pixels. Pointer: drag (the delta is divided by the scale factor), double-click resets. Keyboard: Arrow keys move 16px, Shift and Arrow 64, Home and End go to the limits, Enter on the chart separator resets it and on a side separator collapses that panel. Limits: query 200 to 560, dock 240 to 640, chart 120 up to the space left. The sizes live in `--gd-ex-left`, `--gd-ex-right`, `--gd-ex-chart` on the explorer; `gd:split` reports the change.

**Collapse.** The query and dock headers carry a collapse button (a real control): the pane shrinks to a rail (`--gd-control-h + 16`) showing only the button, and its separator is hidden. At 767 and narrower the panes stack, separators are hidden and the chart is 240 tall.

**Tokens.** `--gd-border`, `--gd-border-focus` (separator hover and drag), `--gd-head-h`, `--gd-card-pad`, `--gd-cell-px`. The separator keeps the keyboard focus ring; the hit area is 9px around a 1px line. **Provenance.** NEW: not in the hub, reference Mobbin Sentry, Mixpanel, Amplitude, Google Analytics. Pending library review.
