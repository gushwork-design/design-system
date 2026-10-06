---
name: gushwork-dashboard
description: Builds Gushwork product, analytics and web-app interfaces on-brand — dashboards, analytics screens, data tables, charts, filters and query builders, log and event viewers, settings pages, detail pages, forms, side navigation, sign-in screens, toasts and dialogs. Use this whenever the request is a logged-in product surface for Gushwork: "build a dashboard", "add a KPI row", "a leads table", "an analytics screen", "an explorer", "a settings page", "the app's side nav", "a login screen". Components come from the Gushwork design hub, so a screen built here looks like the hub. Not for marketing pages — use gushwork-web for landing pages, heroes, folds, and any public-facing site work.
---

# Gushwork dashboard

You are building a **logged-in product surface** for Gushwork: heavy analytics dashboards and web apps.
Dense, calm, grey ground with a white working panel, black-and-outline actions, blue reserved for data
and status. It is the same look as the Gushwork design hub, because the components were extracted from it.
This is not the marketing site.

Announce at the start: **"Using the Gushwork dashboard skill — v2.0.1, updated 6 Oct 2026."**

That version and date are stamped into this file, so **a stale copy reports its own stale date** rather
than claiming to be current. If the user asks whether they are up to date, check for real:

```bash
cd ~/.claude/plugins/marketplaces/gushwork && git fetch -q && git log --oneline HEAD..origin/main
```

Any commits listed means they are behind: tell them to run
`claude plugin marketplace update gushwork && claude plugin update gushwork-design@gushwork`,
then `/reload-plugins` in the chat.

## Read these first

| For | Read |
|---|---|
| **Which component, and how to use it** | **`exports/dashboard/README.md`**, then the doc it points to for each component you use |
| How screens are put together, and their loading / empty / error states | `exports/dashboard/patterns.md` |
| **A verified starting point for an overview screen** | **`skills/gushwork-dashboard/templates/analytics-overview/`** (see `exports/dashboard/templates.md`): shell, time range, KPIs, charts, funnel, filtered and selectable table, toast, confirm dialog, stamp. **Copy the folder and edit the copy; never reference another built dashboard.** |
| Every colour, size, radius, shadow, type style | `foundation/tokens.css`; the dashboard's theme and density aliases are in `exports/dashboard/base.md` |
| Standing rulings | `DECISIONS.md` |
| Voice, casing, banned words | `foundation/voice.md` |
| Focus, hover, click targets, sample data | `foundation/states.md` |
| Text fields (shared with web) | `foundation/text-field.md` |
| Icons, Gushwork logo, shared Badge | `foundation/shared-components.md` |
| Declaring anything you had to build yourself | `foundation/new-component-notice.md` |
| React or static HTML | `foundation/output-targets.md` |

**Never restate a token value or a voice rule here or in your output.** Reference the token.

The components are `exports/dashboard/dashboard.css` and `dashboard.js`: one stylesheet, one script, 100+
components under `gd-` classes. **Do not hand-build what is in them** — no bespoke sidebar, table, chart,
dialog or toast. Copy the markup from the doc's *Anatomy* and fill it.

Three tiers of numbers, because "never invent a number" is unfollowable for page layout:

1. **Colour, type, radius, shadow, spacing: always a token.** No exceptions. A value with no token is a
   finding to report, never one to invent.
2. **Layout dimensions documented in the component docs** (260 rail, 12-column grid, 36px control): use
   the documented figure exactly.
3. **A layout dimension with no documented figure:** choose sensibly, and **say in one line that you
   chose it.** Do not pass your own number off as coming from the system.

## The build sequence — in this order, every time

1. **Read.** `exports/dashboard/README.md` first, then `patterns.md`, then the docs for the components you
   will use. Do not start from memory of what a Gushwork dashboard looks like.
2. **Ask with options and wait.** One `AskUserQuestion` call, never a paragraph and never across several turns.
3. **State your read in a few lines before building**: the headline numbers, the sections in order, which
   recipe in `patterns.md` you are following, density. Cheap to correct as a sentence, expensive after markup.
4. **Build the shell first and verify it alone.** `app-shell`, locked to the viewport, one scroll region.
   Confirm the rail does not scroll away before anything goes in the panel.
5. **Fill the page from the recipe, component by component.**
6. **Verify, numerically and in both themes and both densities** (see below).
7. **Stamp it** (`exports/dashboard/notice.md`), and **notify** if you created or changed anything.

## Before building — ask with options, don't assume

A dashboard is a set of decisions about what matters. Guessing produces a screen that looks right and
answers nothing. Options are far easier to answer than prose, and every option teaches them what the
system can do.

| Ask | Options to offer | What the answer decides |
|---|---|---|
| **One page or many?** (ask first) | `A single page` · `A few pages` · `A full app` with a grouped rail | Whether the rail is navigation or just chrome, the most expensive thing to get wrong |
| **What will they do with it?** | `Monitor` — is it on track · `Explore` — slice and compare · `Act` — work a list · `Configure` — settings and records | The recipe: overview, explorer, list with filters, settings or detail |
| **What is it accountable for?** | the two or three metrics you inferred, each as an option | Which numbers lead; everything else is supporting |
| **How dense?** | `Comfortable` · `Compact` for heavy analytics | `data-density` on the page |
| **Is there real data yet?** | `Yes, connected` · `Yes, I'll paste it` · `Not yet, use samples` | Whether the header carries a `Sample data` Badge |

**Infer before you ask.** "Show-ups over the week" already says the metric is a show rate and the grain is
daily; offer that as the first option rather than asking from scratch. **Skip any question the request
already answers**, and drop the whole interview for a small change: "add a KPI row" needs none of it.

### A supplied reference defines CONTENT and STRUCTURE. It does not define visual treatment.

If the user supplies a reference — an artifact, a screenshot, a URL, an existing tool — take its content
**and its information architecture**. Take none of its styling.

| From the reference | From this design system |
|---|---|
| the numbers, labels, wording | every colour, type style, radius, shadow, spacing |
| **how many pages it is** | the components each page is built from |
| **its section order and grouping** | the layout within a section |

Not everything is an app. A postmortem, a closeout, a weekly readout: plenty of real dashboards are **one
scrolling page** with no navigation. If the reference is one page, build one page. Re-architecting a
reference is a proposal to raise in one line, never a default (ruled 26 Aug 2026, after a one-page
postmortem came back as a nine-page app).

## Which component?

`exports/dashboard/README.md` is the full list. By need:

| Need | Component(s) | Doc |
|---|---|---|
| The page frame | `app-shell`, `sidebar`, `content-panel`, `page-header`, `page-layout` | `shell.md` |
| A customisable home, or an explorer with a query panel | `widget-grid`, `explorer-layout` | `shell.md` |
| Rail rows, groups, account, workspace, breadcrumbs, settings sub-nav | `nav-item`, `nav-group`, `account-row`, `workspace-switcher`, `breadcrumbs`, `sub-nav` | `navigation.md` |
| Buttons, menus, view switchers, tabs | `action-button`, `menu`, `segmented-control`, `tabs-pill` (in-page views), `tabs-underline` (page sections) | `actions.md` |
| Fields, selects, ranges, settings, queries | `text-input`, `select`, `combobox`, `form-field`, `setting-row`, `date-range-picker`, `time-range-bar`, `query-builder` | `inputs.md` |
| A data table, selectable and sortable | `data-table` + `table-cell-types`, `row-selection`, `bulk-action-bar`, `pagination`, `table-states` | `tables.md` |
| Event or log stream | `log-viewer`, `histogram` | `tables.md` |
| Filters above a table | `table-toolbar`, `filter-chip`, `filter-builder`, `saved-views` | `filtering.md` |
| Headline number, comparison, status | `stat-card`, `metric-strip`, `delta-pill`, `badge`, `progress-bar` | `data-display.md` |
| Lists, properties, activity | `key-value-list`, `activity-timeline`, `checklist`, `status-list`, `incident-row` | `data-display.md` |
| Any chart | `chart-frame` + `line-chart`, `bar-chart`, `donut-chart`, `heatmap`, `funnel`, … via `GD.charts` | `charts.md` |
| Status feedback, empty and unavailable states | `toast`, `banner`, `empty-state`, `skeleton`, `unavailable-state` | `feedback.md` |
| Dialogs, drawers, side panels | `modal`, `confirm-dialog`, `drawer`, `docked-panel`, `popover`, `tooltip`, `command-palette` | `overlays.md` |
| One record in full | `detail-view` | `detail.md` |
| Behind a login | `login-screen`, `google-button`, `access-denied-screen` | `auth.md` |

**Charts are drawn by `GD.charts` from arrays.** Never hand-compute a path and never reach for a charting
library. **Three series is the ceiling** by default (R11); more is a finding, and the `extended` palette is
pending a ruling.

## Rules that decide whether it is right

1. **Blue carries data and status. Black carries interaction state.** A button is never a blue fill. Before
   filling anything blue, ask which of the two it is.
2. **Destructive is a red label on a neutral shape**, never a red fill. A confirm dialog names exactly what
   will be lost and focuses Cancel.
3. **Exactly one region scrolls: the content panel body.** The rail never scrolls away. A sticky header is
   sticky against that region. `html, body { overflow: hidden }` with `100dvh` in an Artifact frame (see
   `foundation/output-targets.md`).
4. **Every interactive element has a keyboard ring; text fields show their edge instead.** Nothing that is
   not interactive gets a hover, a cursor or a ring (`foundation/states.md`).
5. **A drawn affordance must work.** Every `data-gd-*` hook in your markup must have a handler in
   `dashboard.js`; every `<button>` must do something. Ship the affordance only if the function exists.
6. **A quantity that cannot be read is removed, never zeroed.** A `0` that means "not loaded" reads as "we
   got no leads". Loading is a skeleton of the real layout; failure is per card, with a retry, never a
   page-level wipe. See `feedback.md`.
7. **Invented numbers are visibly marked.** Most requests arrive without data. A plausible figure in a
   real-looking dashboard is indistinguishable from a measurement and gets screenshotted into a deck. Put
   `Sample data` in a Badge in the page header's title row, say in one line which numbers are illustrative,
   and remove it when real data lands. Never invent a number implying a business outcome (revenue,
   conversion, pipeline) without it.
8. **Small text never takes `--gd-good`, `--gd-warn` or `--gd-danger`**; use the `--gd-tone-*-fg` steps.
9. **Numbers that can change are tabular** (`gd-num`), so a column of figures aligns.
10. **No emoji. No bare coloured status dots; use a Badge.** Sentence case. Product action labels are plain
    verbs (`Export`, `Add campaign`, `Save changes`); the `Book a Demo` marketing rule does not apply.
    Replace every placeholder with real copy.

## Heavy dashboards

The target is analytics and web apps with a lot on the screen. So:

- **Pick density deliberately.** `data-density="compact"` for tables of hundreds of rows and screens with
  many charts; comfortable for settings and detail. Do not mix within a region.
- **One page, one job.** If a fourth headline metric appears, the page is trying to do two jobs; propose a
  second page in one line.
- **Filters are state.** A filtered-to-nothing table says so and offers to clear (`table-states`); the active
  filters are always visible as chips.
- **Time is a first-class control**: `time-range-bar`, with the range, granularity and comparison visible.
  A chart that does not say its range is wrong.
- **Partial failure is normal.** Each card loads, fails and retries on its own.

## Verify — numerically, in the browser

A static check cannot see computed colour, scroll, density or parsing. Run the page and check:

- **Both themes** (set `data-theme` explicitly, assert it in what you read back; a read right after a flip
  can be the old theme, and transitions in a background tab stall mid-way, so switch them off).
- **Both densities.** Heights change (`--gd-control-h`, `--gd-row-h`), nothing clips.
- **Contrast of text you sampled from the rendered glyph**, not a wrapper's `color`.
- **Icons are sized** (an `<svg>` with no width and height renders 300 × 150 and blows out its row) and
  **inherit colour** (`fill="currentColor"`).
- **Widths with `getBoundingClientRect()`** at more than one viewport (1440, 1280, 390). Below 1440 the shell
  scales; at 767 and narrower it reflows (`shell.md`).
- **Navigate away and back.** Handlers are delegated, so they should survive; test it.
- **Keyboard**: tab through the page, open and close every overlay with Esc, and confirm focus returns.

## When the library is missing something

Two different situations. Do not confuse them.

**Fall back: a whole deliverable or surface the system does not cover.** A slide deck, a flyer, a standalone
tool, a marketing page (that is `gushwork-web`), or a surface with no dashboard components at all. Do not
build these here. Tell the user plainly it is not in the Gushwork design system yet and point them at Utsav
on Slack: `https://gushwork.slack.com/team/U06UAR183TR`.

**Build it: a small element missing from an otherwise buildable screen.** A screen that needs a component
the set almost covers. Build it, then declare it. Three conditions, all required:

1. **Compose from what exists first.** Most missing things are a `card` with the right contents, or a
   component you have not considered. Check `README.md` before concluding anything is absent.
2. **Build it from tokens only.** A new element may combine existing values in a new shape; it may never
   introduce a new value. A needed value with no token is a finding to report.
3. **Mark it in the code**: a comment saying it is new, what it was needed for, and that it is pending
   library review.

**Archived components and templates are not part of the system.** A registry entry whose `review` record says `"reviewed": "rejected"` was rejected and archived (R54 addendum); a template is a registry entry too, so an archived template is out as well. Never use one: do not compose from it, start from it, copy its markup, cite it, or reuse its spec as a proposal, and do not "take inspiration" from it either. Build from the approved library as if it did not exist, and if the screen needs that thing, treat it as a missing element and say so. Before starting from any template or component, check its `review` record in the registry; if it reads `rejected`, it is archived.

**Then notify, every time, without being asked.** If you created or modified any element, tell the user
before you finish, as **one four-line message block they copy straight into Slack** linking a
`notices/YYYY-MM-DD-<slug>.md` you commit and push. The format, and the **Worth a decision** section that
makes it a review rather than a list, is in `foundation/new-component-notice.md`. Never let a created
element pass silently: an undeclared component is worse than a refusal, because it looks official.

## Stamp every dashboard you build

A dashboard is a static file that outlives the session that made it, so nothing can be pushed to its owner
when the design moves. Every build carries a `gushwork-build:{…}` comment naming the plugin version, who
built it, when, and the components it uses. `dashboard.js` reads it and shows its owner a notice when those
components change; `bash scripts/check-drift.sh <file-or-dir>` reads it for agents. Format, rules and
the publishing step are in `exports/dashboard/notice.md`. List only components the file really uses, and
drop one from the stamp when you drop it from the build.

## Source of truth

The components are extracted from the design hub (`web/`), the site the team uses every day. Where a
component doc and the hub disagree, the hub is the source and the doc has a bug to report. Changing a
component is a maintainer task, described in `exports/dashboard/README.md`; building a screen never
needs Figma.
