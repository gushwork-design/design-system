# The dashboard system rebuilt from the design hub — new elements and decisions

Built 4 Oct 2026 for heavy analytics dashboards and web apps. Files: `exports/dashboard/` (`css/`,
`js/`, `registry-parts/`, 14 docs, built `dashboard.css`, `dashboard.js`, `component-registry.json`),
`web/previews/dashboard/*.frag` (110), `skills/gushwork-dashboard/SKILL.md` (rewritten),
`foundation/states.md` (new), `scripts/build-dashboard-css.sh` (new). Ruling: **R43**.

The Figma-measured dashboard set (the skill, `exports/dashboard/*.md` and `v2/`, 29 Library pages,
the GTM and Meta Ads builds) is removed. Nothing in it applies now.

## Created

**Extracted from the hub, generalised.** Shell, sidebar, nav item and group, account row, topbar, page
header, theme menu, search trigger, page layout, content panel; button, icon button, split button, menu,
text input, textarea, select, search field, checkbox, toggle, both tab styles, period select; data table,
cell types, pagination, table states; card, stat card, progress bar, ring, legend, status dot, avatar;
line chart, ranked bars, donut, breakdown bar, chart tooltip; toast, empty state, skeleton, tooltip,
popover, modal, drawer, command palette; login screen, Google button, sign-in modal. The hub's four tab
styles, six primary buttons and three paginations are consolidated to one each (tabs: both pill and
underline, by job).

**NEW, no hub source (each marked `NEW` in its CSS and doc, each pending review).** From a Mobbin sweep of
analytics and web-app dashboards and from your four picks:
- *Layout:* sidebar-collapsed, expandable nav group, workspace switcher, breadcrumbs, sub-nav, 12-column
  grid, widget grid with edit mode, explorer layout with resizable splitters, editable page title.
- *Inputs:* segmented control, multi-select, combobox, radio, form field, setting row, form section,
  unsaved-changes bar, date-range picker, time-range bar, datetime and timezone fields, query builder, info hint.
- *Tables and filtering:* row selection, bulk-action bar, column menu, row-actions menu, filter chip,
  filter builder, saved views, log viewer, histogram, plus sticky first column, totals row, tree rows,
  grouped headers and heat cells inside the table.
- *Data display:* metric strip, delta pill, key-value list, activity timeline, checklist, avatar group, tag,
  status banner, status list, incident row, issue summary, detail-view recipe.
- *Charts:* area, bar (vertical, grouped, stacked, waterfall), horizontal bar, sparkline, heatmap, funnel,
  uptime bar, legend table, chart frame; forecast, annotations, brush and dual axis; `GD.charts` helper.
- *Feedback and overlays:* banner, confirm dialog, docked panel, coachmark, board, undo toast, rich tooltip,
  unavailable state.
- *Auth:* access-denied screen, session-expired.
- *Infrastructure:* build notice (the old drift notice, now a component), compact density, `light-dark()` theming.

## Modified
- **Theme.** Hub: each alias in three blocks. Here: one `light-dark()` declaration per alias, driven by
  `color-scheme`, so a missed block cannot keep the other theme's value. Browsers from 2024.
- **Toast.** Hub: page-local at z-index 90, colliding with the palette. Here: shared, 100; R10 holds.
- **Empty state.** Hub: circular badge. Here: rounded square.
- **Drawer.** Hub: a 22s width transition. Here: `--gw-motion-fast`, reduced-motion aware.
- **Toggle.** Hub: 28×16, off the ramp. Here: 36×20 and 44×24. **Menu check:** hub blue, here ink.
- **Google button dark hover.** R3 has none and the hub's shadow-only hover is invisible on black; a
  neutral-50 fill step was added, still unthemed.
- **Names.** `action-button` and `activity-timeline` (the names `button` and `timeline` are web's). The
  dashboard Badge is the shared Badge; its CSS is `gd-badge`.

## Worth a decision
1. **Ship it as v2.0.0.** Every component is registered at 2.0.0. A component version above its plugin's is
   reported as drift by every build stamped with that plugin, so a 1.5x release would break the notice.
2. **The Library's dashboard section is empty until you pass the reviews** (R38). 110 components start pending.
3. **Chart series past three.** R11 caps at three; heavy analytics plots five to eight. `charts.md` proposes
   an 8-colour list from existing tokens (worst pair under colour-blind simulation: distance 16.2) behind an
   opt-in `{palette:'extended'}` labelled PENDING RULING. The ruled three also fail 3:1 on white
   (1.77, 2.97, 1.44), fine for fills, not for thin lines.
4. **Tag hues.** Only four hues are free of status meaning (blue, orange, violet, neutral). A screen with ten
   categories (a source-types breakdown) cannot be served without new colours. Violet has no ramp and is
   derived with `color-mix`.
5. **Placeholder grey.** The hub's neutral-400 on white is 2.8:1; four components inherit it.
6. **Selected-row fill.** The tables author kept a blue tint from the old ruling; the system says blue is data
   and black is state.
7. **The admin avatar** is black in the hub and vanishes on a dark ground; neutral-800 in dark here.
8. **No monospace token** exists; the log viewer uses the hub's `ui-monospace` stack as `--gd-font-mono`.
9. **The hub still has its own copies.** `analytics.html` and `design-system.html` duplicate a ~480-line `ul-*`
   stylesheet and four tab, six button and three pagination versions. This change documents the consolidated
   set but does not refactor the hub onto it.

## Tokens
Every value is a `--gw-*` token or a `--gd-*` alias of one, declared with `light-dark()` in `css/`. No new
colour, type, radius, shadow or spacing value was introduced. Gaps reported, not invented: monospace font,
a 24px body token, a type token for the 28px KPI number and 44px page title (R15 literals), `space-6`, the
series palette past three, the tag hues.
