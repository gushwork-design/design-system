# Reports

A report is **one scrolling page with no rail**: a title, the headline numbers, the charts that prove them and the tables behind. It is shorter and lighter than a dashboard and is read, shared and printed, not worked in. It is built from the dashboard components; this file covers only the four things a report adds. Everything else (stat cards, charts, tables, banners, tabs) is in the other docs. The `gushwork-reports` skill says when to build a report and how to ask for it.

A report is not an app. It has no sidebar, no top bar and no account row, so the shell docs (`shell.md`) do not apply, and nothing in it edits data.

## Report frame

**Purpose.** The ground, the top bar and the white sheet a report sits on. Use it for every report. Do not use it for a logged-in screen (that is `app-shell`) or for a downloadable multi-page PDF (that is `gushwork-lead-magnet`).

**Anatomy.**

```html
<body class="gd" data-density="comfortable">          <!-- and html, body { margin: 0 }: the browser's 8 px body margin would sit above the top bar -->
<div class="gd-report">                                  <!-- the grey ground; also the size container the phone reflow reads -->
  <div class="gd-report__bar">                            <!-- on the ground, above the sheet, like the one-pager -->
    <span class="gd-report__logo" role="img" aria-label="Gushwork"></span>
    <div class="gd-report__end">
      <span class="gd-report__date">Created 7 Oct 2026</span>
      <div class="gd-theme" data-gd-pop data-gd-print="hide">…</div>   <!-- theme-menu, see navigation.md -->
    </div>
  </div>
  <div class="gd-report__sheet">                          <!-- the white sheet -->
    <div class="gd-page"> page-header, tabs, content, footnote </div>
  </div>
</div>
```

The logo is the real `assets/logo/gushwork-logo-dark.svg`, used as a mask on `--gw-color-neutral-500`, so it renders grey, the same grey as the date and the one-pager's footer mark. Recolouring a logo file is off-system (`shared-components.md`); this was asked for by the owner on 7 Oct 2026 and is a single CSS rule to undo. The logo is 20 px high, one of the logo's own size steps, and 105 wide, its 421:80 aspect.

**Spacing.** The bar and the sheet share one inset: the page gutter (`--gd-gap` x 2.5, 40 comfortable) plus the sheet's 1px edge, so the logo lines up with the title and the date with the right edge of the content. The bar sits 22 above the logo and 22 below to the sheet (the 24 px theme menu sets the bar's height, the logo is centred in it). The title's inset from the sheet's top equals the side gutter, at every width. On a phone the gutter is 20, as everywhere else.

**Measure.** The sheet is 1120 wide at most. That figure is not in any other doc; it was chosen for this component.

**Phone.** The frame takes the shell's container name (`gd-app`), so the dashboard's phone reflow applies: `gd-span-3` tiles pair up two to a row, charts and tables take the full width, the title drops to 32, actions go full width.

**Light and dark.** The frame carries the dashboard's `theme-menu` (System, Light, Dark) at the right end of the top bar, after the date. It is the existing component, unchanged, and `dashboard.js` already drives it: with no choice made the report follows the machine, live; picking Light or Dark sticks, in the same `gw-theme-choice` key every dashboard uses, until System is picked again. Keep the `<script>` at the top of `<head>` that reads that key, or the page flashes the wrong theme on load. It is hidden when the report prints (`data-gd-print="hide"`), and a PDF is made in light.

**Date.** `Created` is the date the report was made. When the report is regenerated, add `Updated` beside it only when it differs. Never put a time of day here.

**Print.** See *Printing and PDF* below.

**Tokens.** `--gd-page-bg`, `--gd-panel-bg`, `--gd-border`, `--gw-radius-16`, `--gw-color-neutral-500`, `--gw-text-body-12-med`, `--gw-space-*`, `--gd-gap`. **Accessibility.** The logo is `role="img"` with a label, the date is plain text. **Provenance.** NEW, pending library review: the one-pager's top bar (`templates/one-pager`) and Swapnil Sinha's report, 7 Oct 2026.

## Report source line

**Purpose.** Says where the numbers came from and how fresh they are, directly under the title. A report is a snapshot, so a reader has to be able to see which data it was made from. Use it on every report.

**Anatomy.** `p.gd-report__source` inside `gd-page-header__titles`, after the description: `Sources: Meta Ads, Google Ads, product database · Data as of 5 Oct 2026`. Each part is its own `span`; the separator is a `·` with `aria-hidden`.

**Rules.** Name the real sources, not "internal data". The as-of date is the end of the data, not the day the report was made (that is the top bar's date). A time of day only when the data is intraday or was pulled live; a daily or weekly report ends at a date, and a time such as 23:59 there is noise. On a phone the two parts stack, left aligned, with no separator. With sample data it says so, and the `Sample data` Badge stays in the title row.

**Tokens.** `--gw-text-body-12-med`, `--gd-text-muted`, `--gw-space-4`, `--gw-space-8`. **Provenance.** NEW, pending library review: Mobbin Gumloop ("Snapshot from ... Loaded ..."), Fresha ("Last updated").

## Definition tile

**Purpose.** Defines one term the report uses: a metric, a period, a rule. Use it on the report's last tab or in a footer section so a reader can check what a number means. Not for a feature list, and not for anything with its own number (that is a stat card).

**Anatomy.** A `card` with `gd-def` added: `gd-def__head` (a `gd-def__badge` rounded square holding a 16 px icon, then the card's title and description), then `gd-def__formula` (a `gd-def__label` and the formula or range in the same tabular figures as the tables), then a Badge. The formula chip sits at the bottom, so tiles in one row end level whatever their definition's length. Give every tile in a row a formula and a Badge, or the row stretches and some tiles are half empty.

**Rules.** The icon badge is a rounded square, never a circle. Formulas are in Inter, never a monospace: the system has two typefaces. Use `gd-span-6`, two to a row.

**Tokens.** `--gd-selected-bg`, `--gd-sunken-bg`, `--gw-radius-12`, `--gw-radius-8`, `--gd-text`, `--gd-text-muted`, `--gw-text-body-14-med`, `--gw-text-body-12-med`. **Accessibility.** The icon is decorative (`aria-hidden`); the term is the card's heading. **Provenance.** NEW, pending library review: Mobbin Sprig ("Report details"); the badge geometry is the empty state's.

## A short list in a card

The system has no list component. `gd-report__list` is the one rule for a short bulleted list inside a card (limits, notes): 20 px indent, 8 px between items. It is part of the report frame and is not registered separately.

## Printing and PDF

A report is often shared as a PDF. The frame has print rules: every tab prints one after another on one 1200 px wide page, the tab strip and anything marked `data-gd-print="hide"` drop out, a tab's name (`data-gd-title`) prints as its heading, and cards, charts and banners do not split.

**Chrome applies the dashboard's phone breakpoint (`max-width: 767px`) when it prints, even on a 1200 px page.** A plain browser print therefore stacks tables into phone-style rows. `skills/gushwork-reports/templates/growth-report/render.sh` prints from a throwaway copy of the stylesheet with that breakpoint switched off and finds the page height that holds the report on one page. Use it for any PDF; do not offer a button that calls `window.print()`.

## Growth report template

**Purpose.** A whole report to copy and fill in: a verdict banner, four headline numbers with changes, the charts that explain them, a table by channel, a second tab for one breakdown and a last tab that defines the terms. The sample is a growth report (trials, cost per trial, show rate) because it uses every part a report needs; the structure is not specific to growth.

**Files.** `skills/gushwork-reports/templates/growth-report/growth-report.html` (static, no build step; links `foundation/tokens.css`, `exports/dashboard/dashboard.css` and `dashboard.js`) and `render.sh`. A generated copy of the page sits in `templates/growth-report/` and another is served to the review drawer at `/previews/dashboard/pages/growth-report.html`, with its links made absolute and the stamp's registry URL blanked. Both are rebuilt by `scripts/build-dashboard-css.sh`; edit the skill's copy.

**How to use.** Copy the folder to the new project and edit the copy. Keep the `Sample data` Badge until real data replaces the figures, change the stamp's `components` list to what the page uses, and delete the tabs and sections the report does not need.

**What it contains, in order.** `report-frame` with the top bar → `page-header` (title, `Sample data` Badge, `report-source-line`) → `tabs-underline` (Summary, Creatives, About this report) → Summary: `banner` (the verdict), four `stat-card`s with `delta-pill`s, a `line-chart` against the previous period, a `breakdown-bar`, a `funnel` beside a `bar-chart`, a `data-table` → Creatives: a `banner`, a `horizontal-bar-chart`, a `data-table` with Badges → About: four `definition-tile`s, a `data-table` of sources, a short list → a footnote.

**Gap, not built.** The verdict at the top is a `banner`, which is meant for a condition that persists, not for a finding. A summary block (a headline and a paragraph, optionally key points) would fit better; it is a missing element, flagged here and in the notice, and the owner has not ruled on it.

**Provenance.** NEW, pending library review. Layout from Swapnil Sinha's report; components from this system; references Mobbin Toggl Track, Fresha, Gumloop, Arcade, Sprig.
