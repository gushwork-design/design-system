# Reports

A report is **one scrolling page with no rail**: a title, the headline numbers, the charts that prove them and the tables behind. It is shorter and lighter than a dashboard and is read, shared and printed, not worked in. It is built from the dashboard components; this file covers only the six things a report adds, and the one action a dashboard adds to offer a report. Everything else (stat cards, charts, tables, banners, tabs) is in the other docs. The `gushwork-reports` skill says when to build a report and how to ask for it.

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

## Summary block

**Purpose.** A report's verdict, stated once, at the top: whether it is good or bad news, the one-line finding, a paragraph that says why, and the two or three facts that prove it. It replaces the banner, which is for a condition that persists (a source is behind, a read-only notice), not for a finding. Use it once per report, first. Not for a headline number (that is a stat card) and not for a recommendation list at the end.

**Anatomy.** A `card` with `gd-summary` added: `gd-summary__head` (a Badge in the status tone, then the headline as `gd-summary__title`, an `h2`), `gd-summary__text` (one paragraph), `gd-summary__points` (a list of `gd-summary__point` rows, each with a 16 px icon and one sentence).

```html
<section class="gd-card gd-summary gd-span-12" aria-labelledby="sum-title">
  <div class="gd-summary__head"><span class="gd-badge gd-badge--md gd-badge--good">On track</span><h2 class="gd-summary__title" id="sum-title">Cost per trial fell 14% while trials grew 24%</h2></div>
  <p class="gd-summary__text">Meta ads carried the gain. The Missed leads counter creative now takes 33% of Meta spend…</p>
  <ul class="gd-summary__points">
    <li class="gd-summary__point" data-tone="good"><svg>check-circle</svg><span>Trials grew 24% to 612 on 6% more spend.</span></li>
    <li class="gd-summary__point" data-tone="warn"><svg>warning</svg><span>Google Ads costs $110.85 a trial, 43% above Meta.</span></li>
  </ul>
</section>
```

**Rules.** The Badge says the verdict in two or three words and takes the matching status tone (`good`, `warn`, `bad`, or `info` when the report neither praises nor warns). The headline is the finding with its number, not the report's subject: "Cost per trial fell 14%", not "Cost per trial". Two or three points, each a fact with a number; the icon carries the tone with `data-tone` (`good` check-circle, `warn` warning, `bad` x-circle, none for a neutral fact) and is never the only carrier, because the sentence says it too. Do not repeat the headline in the description or in a chart title.

**Tokens.** `--gw-text-h7-bold`, `--gw-text-body-16-reg`, `--gw-text-body-14-med`, `--gd-text`, `--gd-text-body`, `--gd-text-muted`, `--gd-border`, `--gd-tone-good-fg`, `--gd-tone-warn-fg`, `--gd-tone-bad-fg`, `--gw-space-12`. **Accessibility.** The card is labelled by its headline; the icons are decorative. **Print.** It does not split across a page. **Provenance.** NEW, pending library review: the owner chose this form on 7 Oct 2026; Mobbin Sprig ("AI Insights" summary), Arcade (the chart title that states the finding).

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

## Generate report

**Purpose.** A dashboard that has a report offers to make one: a snapshot of what is on the screen, as a page with its own link. It is **only for a dashboard that has a report to make**; do not add it to every dashboard, and do not draw it unless the page is wired to produce the report (below). The report itself is built from the `growth-report` template and the `gushwork-reports` skill.

**Where.** One outline `action-button` in the page header, labelled `Generate report`, beside the page's other actions. Not inside an Export menu: a report is not a file export.

**Flow.** The button opens a dialog first, so nothing is generated by surprise. The dialog asks for a **time range** (a select; the first option is the dashboard's own range, then 7, 30 and 90 days) and the **sections** to include (one checkbox per section of the dashboard, all checked), and has Cancel and `Generate report`. At least one section must stay checked. It then shows *working*, then *ready* with the report's link in a read-only field, `Copy link` and `Open report`; or *error* with `Try again`. The output is a link only. A PDF is made separately with the template's `render.sh`.

```html
<button class="gd-btn gd-btn--outline" data-gd-modal-open="#gen-report">Generate report</button>

<dialog class="gd-modal gd-modal--md" id="gen-report" aria-labelledby="gen-report-t" data-gd-gr>
  <div class="gd-modal__head"><div><h2 class="gd-modal__title" id="gen-report-t">Generate report</h2><p class="gd-modal__desc">A report page you can share as a link. It is a snapshot of the data as it is now.</p></div><button type="button" class="gd-fb-close" data-gd-close aria-label="Close"><svg viewBox="0 0 256 256" width="16" height="16" fill="currentColor" aria-hidden="true" focusable="false"><path d="M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z"/></svg></button></div>
  <div class="gd-modal__body">
    <div class="gd-gr__fields" data-gd-gr="form">
      <div class="gd-field"><span class="gd-field__label" id="gen-report-range">Time range</span>
        <div class="gd-select" data-gd-select><button type="button" class="gd-input" aria-haspopup="listbox" aria-labelledby="gen-report-range"><span class="gd-select__value">This dashboard&rsquo;s range</span><svg class="gd-input__caret" viewBox="0 0 256 256" fill="currentColor" width="12" height="12" aria-hidden="true"><path d="M216.49,104.49l-80,80a12,12,0,0,1-17,0l-80-80a12,12,0,0,1,17-17L128,159l71.51-71.52a12,12,0,0,1,17,17Z"/></svg></button>
          <div class="gd-menu" role="listbox" hidden><button type="button" class="gd-menu__item" role="option" data-value="dashboard" aria-selected="true"><span class="gd-menu__text"><span>This dashboard&rsquo;s range</span></span><svg class="gd-menu__check" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M232.49,80.49l-128,128a12,12,0,0,1-17,0l-56-56a12,12,0,1,1,17-17L96,183,215.51,63.51a12,12,0,0,1,17,17Z"/></svg></button><button type="button" class="gd-menu__item" role="option" data-value="7d" aria-selected="false"><span class="gd-menu__text"><span>Last 7 days</span></span><svg class="gd-menu__check" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M232.49,80.49l-128,128a12,12,0,0,1-17,0l-56-56a12,12,0,1,1,17-17L96,183,215.51,63.51a12,12,0,0,1,17,17Z"/></svg></button><button type="button" class="gd-menu__item" role="option" data-value="30d" aria-selected="false"><span class="gd-menu__text"><span>Last 30 days</span></span><svg class="gd-menu__check" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M232.49,80.49l-128,128a12,12,0,0,1-17,0l-56-56a12,12,0,1,1,17-17L96,183,215.51,63.51a12,12,0,0,1,17,17Z"/></svg></button><button type="button" class="gd-menu__item" role="option" data-value="90d" aria-selected="false"><span class="gd-menu__text"><span>Last 90 days</span></span><svg class="gd-menu__check" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M232.49,80.49l-128,128a12,12,0,0,1-17,0l-56-56a12,12,0,1,1,17-17L96,183,215.51,63.51a12,12,0,0,1,17,17Z"/></svg></button></div><input type="hidden" name="range" value="dashboard"></div>
        <p class="gd-field__help">The report names its range and compares it with the period before.</p></div>
      <fieldset class="gd-field gd-gr__set"><legend class="gd-field__label">Sections</legend>
        <div class="gd-gr__list"><label class="gd-check"><input type="checkbox" name="section" value="numbers" checked><span class="gd-check__box"></span><span class="gd-check__label">Headline numbers</span></label><label class="gd-check"><input type="checkbox" name="section" value="trends" checked><span class="gd-check__box"></span><span class="gd-check__label">Trends over time</span></label><label class="gd-check"><input type="checkbox" name="section" value="breakdown" checked><span class="gd-check__box"></span><span class="gd-check__label">Breakdown by channel</span></label><label class="gd-check"><input type="checkbox" name="section" value="table" checked><span class="gd-check__box"></span><span class="gd-check__label">Tables</span></label></div>
        <p class="gd-field__error" role="alert" data-gd-gr-need hidden>Pick at least one section.</p></fieldset>
    </div>
    <div data-gd-gr="working" hidden role="status" aria-live="polite"><p class="gd-gr__msg">Making your report&hellip;</p></div>
    <div data-gd-gr="ready" hidden>
      <div class="gd-field"><label class="gd-field__label" for="gen-report-url">Link to the report</label><div class="gd-input"><input id="gen-report-url" class="gd-input__el" data-gd-gr-url readonly></div>
        <p class="gd-field__help">Anyone who can open the link sees the report as it is now. It does not update.</p></div>
    </div>
    <div data-gd-gr="error" hidden><p class="gd-gr__msg" role="alert" data-gd-gr-message>The report could not be made.</p></div>
  </div>
  <div class="gd-modal__foot">
    <button type="button" class="gd-btn gd-btn--outline" data-gd-close data-gd-gr="form working error">Cancel</button>
    <button type="button" class="gd-btn gd-btn--primary" data-gd-gr-submit data-gd-gr="form working">Generate report</button>
    <button type="button" class="gd-btn gd-btn--outline" data-gd-gr-retry data-gd-gr="error">Try again</button>
    <button type="button" class="gd-btn gd-btn--outline" data-gd-gr-copy data-gd-gr="ready">Copy link</button>
    <a class="gd-btn gd-btn--primary" data-gd-gr-open data-gd-gr="ready" href="#" target="_blank" rel="noopener">Open report</a>
  </div>
</dialog>
```

**Behaviour.** `js/57-report.js`. Opening the dialog resets it to the form. Choosing `Generate report` fires one cancelable event on the dialog, `gd:generate-report`, with `detail = { range, sections }` (the select's value and the checked section values). **The page claims the request and answers it:**

```js
dialog.addEventListener('gd:generate-report', (e) => {
  e.preventDefault();                      // "I will handle this"
  makeReport(e.detail).then(
    (r) => GD.report.ready(dialog, { url: r.url }),
    (err) => GD.report.fail(dialog, { message: err.message }));
});
```

An event nobody claims with `preventDefault()` is shown at once as an error, "This dashboard is not connected to a report service yet", so the button is never a control that does nothing. `GD.report.ready` fires `gd:report-ready` with the url.

**What the design system does not do.** It does not make the report, store it or decide who can open the link. That is the product's: the page has the data, so it renders the report (from the `growth-report` template or its own) and returns a URL. Say in the build which of those it has wired, and who the link is shared with.

**States.** form, working (the submit button is disabled and `aria-busy`), ready, error. Esc, the close button and the scrim close it; the dialog returns focus to the button.

**Tokens.** The modal's, plus `--gd-gap` and `--gw-space-12` for the form. **Accessibility.** The dialog is labelled by its title; the working message is a polite live region and the error is an alert; the checkboxes are native. **Provenance.** NEW, pending library review: composed from the modal, form field, select, checkbox and action button; the owner chose the header button, the dialog first and a link only on 7 Oct 2026.

## A short list in a card

The system has no list component. `gd-report__list` is the one rule for a short bulleted list inside a card (limits, notes): 20 px indent, 8 px between items. It is part of the report frame and is not registered separately.

## Printing and PDF

A report is often shared as a PDF. The frame has print rules: every tab prints one after another on one 1200 px wide page, the tab strip and anything marked `data-gd-print="hide"` drop out, a tab's name (`data-gd-title`) prints as its heading, and cards, charts and banners do not split.

**Chrome applies the dashboard's phone breakpoint (`max-width: 767px`) when it prints, even on a 1200 px page.** A plain browser print therefore stacks tables into phone-style rows. `skills/gushwork-reports/templates/growth-report/render.sh` prints from a throwaway copy of the stylesheet with that breakpoint switched off and finds the page height that holds the report on one page. Use it for any PDF; do not offer a button that calls `window.print()`.

## Growth report template

**Purpose.** A whole report to copy and fill in: a verdict banner, four headline numbers with changes, the charts that explain them, a table by channel, a second tab for one breakdown and a last tab that defines the terms. The sample is a growth report (trials, cost per trial, show rate) because it uses every part a report needs; the structure is not specific to growth.

**Files.** `skills/gushwork-reports/templates/growth-report/growth-report.html` (static, no build step; links `foundation/tokens.css`, `exports/dashboard/dashboard.css` and `dashboard.js`) and `render.sh`. A generated copy of the page sits in `templates/growth-report/` and another is served to the review drawer at `/previews/dashboard/pages/growth-report.html`, with its links made absolute and the stamp's registry URL blanked. Both are rebuilt by `scripts/build-dashboard-css.sh`; edit the skill's copy.

**How to use.** Copy the folder to the new project and edit the copy. Keep the `Sample data` Badge until real data replaces the figures, change the stamp's `components` list to what the page uses, and delete the tabs and sections the report does not need.

**What it contains, in order.** `report-frame` with the top bar → `page-header` (title, `Sample data` Badge, `report-source-line`) → `tabs-underline` (Summary, Creatives, About this report) → Summary: `summary-block` (the verdict), four `stat-card`s with `delta-pill`s, a `line-chart` against the previous period, a `breakdown-bar`, a `funnel` beside a `bar-chart`, a `data-table` → Creatives: a `banner`, a `horizontal-bar-chart`, a `data-table` with Badges → About: four `definition-tile`s, a `data-table` of sources, a short list → a footnote.

**Provenance.** NEW, pending library review. Layout from Swapnil Sinha's report; components from this system; references Mobbin Toggl Track, Fresha, Gumloop, Arcade, Sprig.
