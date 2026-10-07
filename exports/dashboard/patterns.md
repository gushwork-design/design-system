# Patterns

Composition recipes that tie the dashboard set together: which components, in which order, for the screens a heavy analytics tool or web app is made of, and what each screen does when it is loading, empty, partly broken, stale, filtered to nothing or off limits. This is guidance, not code. Component names are the registry keys; the doc that owns each is in brackets (`shell.md`, `navigation.md`, `actions.md`, `inputs.md`, `tables.md`, `filtering.md`, `data-display.md`, `detail.md`, `charts.md`, `feedback.md`, `overlays.md`). Every recipe is built comfortable and holds in both densities; compact is set on the page region only when the user asks for it (R57).

## Ground rules for every page

1. The shell (`app-shell`, `sidebar`, `topbar`) renders first and never changes shape because a widget failed.
2. A state is still the page (R20): loading, empty, error and no-access carry the page's horizontal padding and reflow like the page does. Check each state at each width, not only the default view.
3. Loading draws the real layout as ghosts (`skeleton`). Never a `0`, a dash or a plausible number while data is in flight.
4. A quantity that cannot be read is removed, never zeroed (`unavailable-state`).
5. Failure is scoped to the smallest region that failed: the card, then the section, then (only for the route itself) the page.
6. Destructive actions are a red label on the neutral shape, confirmed in a `confirm-dialog`; reversible ones act at once and offer Undo in a `toast`.
7. Feedback goes where the user is looking: field errors on the field, action results in a toast, standing conditions in a `banner`.

## Recipes

### Analytics overview

Order: `page-header` (title, `period-select` or `time-range-bar`, refresh, export menu) → optional `banner` (standing condition: a source is behind) → `metric-strip` or a row of `stat-card` (4 to 6 headline numbers with `delta-pill`) → `widget-grid` of chart cards (`card` + `section-header` + chart from `charts.md`, `legend`) → one `data-table` for the breakdown with `table-toolbar` and `pagination`.

Rules. One date range governs the page and is shown once, in the header. Every card names its unit and its range if it differs from the page. A card that fails shows `unavailable-state` alone. Keep the chart palette to three series.

### Table with filters (list page)

Order: `page-header` (title, count, primary action) → `saved-views` or `tabs-underline` for the main slices → `table-toolbar` (`search-field`, `filter-chip`s, `filter-builder` for the advanced case, column menu) → `data-table` with `row-selection` → `bulk-action-bar` when rows are selected → `pagination` ("Page x of n").

Row click opens a `drawer` (inspect, list stays) or navigates to a detail page; row actions live in `row-actions-menu`, with destructive rows labelled red and confirmed. Filters live in the URL so a view can be shared and restored.

### Settings page

Order: `page-header` → `tabs-underline` for sections (General, Members, Billing, Integrations) → per section a `form-section` of `setting-row`s (label and help left, control right: `toggle`, `select`, `text-input`) → `unsaved-changes-bar` pinned when anything is dirty (Discard, Save). Integration problems use a `banner`; saving gives a `toast`; removing a member or disconnecting a source uses `confirm-dialog`.

Rules. One save model per page: either each row saves on change (then it toasts) or the page has the unsaved bar, never both. A field that cannot be changed by this user is disabled with the reason beside it, or the section shows the no-access state.

### Detail page

Order: `page-header` with `breadcrumbs`, title, status (`badge` or `status-dot`) and actions → `tabs-underline` (Overview, Activity, Related) → body in two columns: the main column (`timeline` or `content-panel`s, related `data-table`) and a side column of `key-value-list` properties → optional `docked-panel` or `drawer` for editing. The same record shown in a `drawer` is the same content in a narrower frame, not a second design.

Loading ghosts the header, the properties list and the first panel. A record that does not exist or is not allowed is a page-level empty state (not found, no access), because here the route itself failed.

### Getting-started home

Order: `page-header` (greeting, no date range) → `checklist` of setup steps with progress → `card`s for the three most useful next actions (each with one primary button) → optional `banner` for the most important missing connection → a short list of recent items with a real empty state ("Nothing here yet, connect a form to start capturing leads"). Hide the checklist when complete. A first-run `coachmark` tour is allowed here and only here, once.

### Explorer (query panel, chart, table)

Order: `explorer-layout` with a left query panel (`query-builder`, `filter-builder`, `period-select`; Run is the primary action) → results header (`segmented-control` for chart type, `time-range-bar`, export) → one chart → `data-table` of the same data below it → optional `docked-panel` for chart options (axes, series, smoothing) that applies live.

Rules. The query is the source of truth and is shown in full above the chart. Running shows ghosts for the chart and table at their real sizes; the previous result stays until the new one lands only if it is marked stale. A query that returns nothing is the no-results empty state with the filters named, not an empty chart.

### Log and events screen

Order: `page-header` → `time-range-bar` and `filter-builder` → `histogram` (events over time; brushing sets the range) → `log-viewer` (dense monospace-feeling rows, newest first, expandable) → `docked-panel` showing the selected event's properties (non-modal, so the list stays scrollable) with Copy and a link to the full record.

Rules. Live tail is an explicit toggle and says when it is on. A paused or stale stream says "Updated 3m ago" with a refresh. Row selection is `aria-selected`, and the docked panel follows it.

### Monitoring and status screen

Order: `page-header` with overall status → `status-banner` (the headline: all systems normal, or the incident) → `status-list` or a `widget-grid` of `status-dot` + `metric-card` per service → `incident-row` list → `timeline` of recent changes.

Rules. Status is never colour alone: the dot sits beside a word. "Unknown" is its own state and is not drawn as "healthy" or as zero. When a check cannot run, that service shows `unavailable-state` with the source named while the others stay live.

### Customisable home (widget grid, edit mode)

Order: `page-header` with an Edit button → `widget-grid` of `card`s (each a stat, chart or list) → in edit mode a `docked-panel` or a `popover` to add widgets, per-card remove and resize handles, and an `unsaved-changes-bar` (Done, Cancel).

Rules. Edit mode is visible: a banner-less but clear change of header ("Editing home", Done), grips and handles drawn only because dragging works (R19). Each widget loads and fails on its own; a widget the user can no longer access is replaced by a no-access card, not removed silently. Reset to default is a confirm.

### Cohort and retention report

Order: `page-header` → `time-range-bar` and `period-select` (cohort size: day, week, month) → `filter-builder` for the cohort definition → a retention grid (`charts.md` heatmap) with a `legend` and `tooltip`s carrying the definition ("Week 3 retention: users active in week 3 / users in the cohort") → a line chart of the average curve → `data-table` of cohorts with their sizes.

Rules. Cells with too few users are removed, not shown as 0%. Incomplete periods are visibly marked as incomplete. The cohort size is shown beside every row.

## Page-state matrix for heavy screens

| State | What the user sees | Built from | Rule |
|---|---|---|---|
| Initial load | The shell, then a ghost of the real layout: header, cards, chart and table rows at their true sizes | `skeleton`, `aria-busy="true"` on each region | One ghost per real element; row ghosts use `--gd-row-h`. No numbers, no spinners over content |
| Partial load | Some widgets fine, some failed | Per card: `unavailable-state` (value removed, source named); per section: `empty-state` error variant | Error is per card, with retry on the section header only if wired. Never a page-level wipe because one source failed |
| Stale data | Last good figures with "Updated 3m ago" and a refresh | A muted timestamp in `section-header`, refresh `iconbtn` with `tooltip`; `banner` warning if older than the expected cadence | Stale is shown, not hidden. Refreshing shows a busy refresh button, not a ghost over the content |
| Empty for this filter | The table or chart region replaced by a message that names the filter | `empty-state` no-results variant with "Clear filters" | Keep the toolbar and filters in place so the user can undo the filter. Say how many filters are active |
| Empty for the account | Nothing has happened yet | `empty-state` first-use variant, one CTA | Explain what will appear and the first step. No fake data |
| No access | The region or page explains who can open it | `empty-state` no-access variant | Say who to ask. Do not show the figures dimmed behind it |
| Error (the route) | The page cannot be shown at all | `empty-state` error variant at page level, with Try again | Only when the route itself failed. The shell stays |
| Sample data | Illustrative figures | A "Sample data" `badge` (`gd-badge--warn`) in the page or section header | See below |

### The Sample data rule

When the numbers are illustrative (a demo workspace, a preview before real data exists, a template), the header carries a **Sample data** badge and the figures are never presented as real: no business outcome (revenue, conversion, pipeline) appears without it. The badge sits in the header's title row, not the toolbar, so it cannot scroll out of view; it is removed the moment real data lands. A control that turns example data on and off (reference Xero "Preview with example data") is a `toggle` in the header and is off by default once real data exists.

### Checking the matrix

For each screen, drive it into every row of the table at 1280, 768 and 375, in light and dark and in both densities. A state that is invisible in the default view is the one that ships broken.
