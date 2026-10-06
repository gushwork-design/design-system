# Gushwork dashboard components

The components for logged-in Gushwork products: heavy analytics dashboards and web apps. Dense
tables, many charts, filters, settings, detail pages, sign-in. **Extracted from the design hub**
(`web/`, the site people use every day), generalised, and documented. It replaces the earlier
Figma-measured dashboard set; nothing from that set applies here.

You build with a stylesheet, a script and a registry. The docs say which component to reach for.

| File | What it is |
|---|---|
| `dashboard.css` | Every component, built from `css/`. Link it or inline it. |
| `dashboard.js` | Behaviour and `GD.charts`, built from `js/`. Optional, but a drawn affordance without it is a dead control. |
| `component-registry.json` | One entry per component: version, `breaking`, doc. Built from `registry-parts/`. |
| `css/`, `js/`, `registry-parts/` | The sources. **Edit these, never the built files.** `bash scripts/build-dashboard-css.sh` rebuilds; `--check` fails when a built file is stale. |

## A page, from nothing

```html
<!doctype html>
<html lang="en">                       <!-- no data-theme = follows the OS; "light" / "dark" forces one -->
<head>
  <meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
  <script>try{var c=localStorage.getItem('gw-theme-choice');if(c==='light'||c==='dark')document.documentElement.setAttribute('data-theme',c)}catch(e){}</script>
  <link rel="stylesheet" href="/foundation/tokens.css">        <!-- tokens first -->
  <link rel="stylesheet" href="/exports/dashboard/dashboard.css">
  <!-- gushwork-build:{…the stamp, see notice.md…} -->
</head>
<body class="gd">
  <div class="gd-app">…</div>          <!-- app-shell: sidebar + content panel, see shell.md -->
  <script src="/exports/dashboard/dashboard.js"></script>
</body>
</html>
```

Fonts (Vert Grotesk Display, Inter) and icons come from the plugin, not from this folder; see
`foundation/shared-components.md`. Never redraw the logo.

## The components, by file

| Doc | Components |
|---|---|
| [`shell.md`](shell.md) | app-shell, sidebar, sidebar-collapsed, topbar, content-panel, page-header, page-layout, widget-grid, explorer-layout |
| [`navigation.md`](navigation.md) | nav-item, nav-group, account-row, workspace-switcher, breadcrumbs, sub-nav, theme-menu, search-trigger |
| [`actions.md`](actions.md) | action-button, icon-button, split-button, menu, segmented-control, tabs-pill, tabs-underline, period-select, info-hint |
| [`inputs.md`](inputs.md) | text-input, textarea, select, multi-select, combobox, search-field, checkbox, radio, toggle, form-field, form-section, setting-row, unsaved-changes-bar, date-range-picker, time-range-bar, datetime-field, timezone-select, query-builder |
| [`tables.md`](tables.md) | data-table, table-cell-types, row-selection, bulk-action-bar, column-menu, row-actions-menu, pagination, table-states, log-viewer, histogram |
| [`filtering.md`](filtering.md) | table-toolbar, filter-chip, filter-builder, saved-views |
| [`data-display.md`](data-display.md) | card, stat-card, metric-strip, delta-pill, badge, status-dot, progress-bar, ring, legend, key-value-list, activity-timeline, checklist, avatar, avatar-group, tag, status-banner, status-list, incident-row, issue-summary |
| [`charts.md`](charts.md) | chart-frame, line-chart, area-chart, bar-chart, horizontal-bar-chart, donut-chart, breakdown-bar, sparkline, heatmap, funnel, uptime-bar, legend-table, chart-tooltip |
| [`feedback.md`](feedback.md) | toast, banner, empty-state, skeleton, unavailable-state, board |
| [`overlays.md`](overlays.md) | tooltip, popover, modal, confirm-dialog, drawer, docked-panel, coachmark, command-palette |
| [`detail.md`](detail.md) | detail-view (a composition of the above) |
| [`auth.md`](auth.md) | login-screen, google-button, sign-in-modal, access-denied-screen, session-expired |
| [`base.md`](base.md) | theme-and-density: the colour aliases, `light-dark()` theming, the density switch, focus and motion |
| [`templates.md`](templates.md) | analytics-overview-template: a whole verified page to copy |
| [`notice.md`](notice.md) | build-notice, and the build stamp every dashboard carries |
| [`patterns.md`](patterns.md) | How the screens are put together: analytics overview, list with filters, explorer, log, monitoring, settings, detail, customisable home, and what each does while loading, empty, partly failed, stale or off limits |

## Rules that hold everywhere

- **Tokens only.** Colour, type, radius, shadow and spacing come from `foundation/tokens.css` or an
  alias of one declared in `css/`. A value with no token is a finding to report, never one to invent.
- **Theme.** `color-scheme` plus `light-dark()`: each alias is declared once, and there is no
  per-theme block to forget. A component never hard-codes a theme.
- **Density.** Comfortable is the default. `data-density="compact"` on `.gd` (or any region) is used only
  when the user asks for it, never recommended and never chosen for a screen because it is dense (R57).
  Heights, paddings and gaps flow from `--gd-control-h`, `--gd-row-h`, `--gd-head-h`,
  `--gd-cell-px`, `--gd-gap` and `--gd-card-pad`, so both work.
- **Blue carries data and status; black carries interaction state.** A button is never a blue fill.
- **Destructive is a red label on a neutral shape.** The same outlined button or menu row with red
  text. Never a red fill. A confirm dialog names exactly what will be lost and focuses Cancel.
- **Keyboard focus is a ring** (`:focus-visible`); **a text field shows its edge instead**
  ([`foundation/states.md`](../../foundation/states.md), R41).
- **A drawn affordance must work** (R19). A chevron, a sort arrow, a close mark, a copy button is
  either wired in `dashboard.js` or left out. Handlers are delegated, so they survive a page swap.
- **A quantity that cannot be read is removed, never zeroed** ([`feedback.md`](feedback.md)).
- **Invented numbers are marked.** `Sample data` in the page header until real data lands.
- **Charts stop at three series by default** (R11). `GD.charts` can take an `extended` palette, which
  is **pending a ruling**; see [`charts.md`](charts.md).
- **Small text never takes `--gd-good`, `--gd-warn` or `--gd-danger`.** Those are fills and edges. Text
  uses the `--gd-tone-*-fg` steps, which are checked for contrast.

## Changing a component

Edit its partial in `css/` (and `js/`), update its spec in the doc, bump its entry in
`registry-parts/` in the same commit, set `breaking: true` when an existing build renders wrong until
updated, run `bash scripts/build-dashboard-css.sh`, and publish with `scripts/publish-sheets.sh`. A
change nobody registered is a change nobody is told about. A new component is declared the same way
as anything built outside the library: [`foundation/new-component-notice.md`](../../foundation/new-component-notice.md).
