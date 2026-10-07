# Reports: a summary block, and Generate report from a dashboard

Built 7 Oct 2026, after the reports skill (#355) shipped with two gaps it named: the verdict was a banner, and a dashboard
could not offer a report. Your picks: a card for the verdict; a header button, only on dashboards that have a report to make;
a dialog first (range and sections); a link as the output. Files: `exports/dashboard/css/56-report.css`, `js/57-report.js`,
`registry-parts/reports.json`, `reports.md`, `web/previews/dashboard/` (two drawings), the template, and both skills.

## Created

**`summary-block`, NEW, pending review, drawn.** A card with a status Badge, the finding as a headline, one paragraph and two
or three key points (a toned icon and a sentence each). The template now opens with it, in place of the banner.

**`generate-report-dialog`, NEW, pending review, drawn in form, ready and error.** Composed from the modal, form field, select,
checkbox and action button: a time range and the sections, then a link with Copy link and Open report. The behaviour is one new
file, `js/57-report.js`: it opens reset to the form, blocks an empty selection, fires one cancelable event
(`gd:generate-report`, `{ range, sections }`) and shows the page's answer (`GD.report.ready` or `.fail`). An event nobody claims
with `preventDefault()` shows at once as "This dashboard is not connected to a report service yet", so the button is never a
control that does nothing. Tested in the browser: success, failure and retry, an unclaimed request, the empty selection,
a reopen resets it, and the range the select shows is the range the event carries.

## Modified
- **The growth-report template** opens with the summary block. Its stamp lists the new component. The banner stays on the
  Creatives tab, where the paused creative is a condition.
- **`reports.md`** gains two sections, and the template's "Gap, not built" note is gone.
- **The reports skill** says how to write a verdict and how to offer Generate report; **the dashboard skill** gains one routing
  row: add it only if the dashboard has a report to make.

## Worth a decision
1. **There is no report service behind the button.** The design system draws the dialog and the states; the product has to render
   the report, store it and decide who can open the link. `reports.md` says what to wire. Until a page wires it, the button is
   not drawn.
2. **Where it goes first.** The support operations app's Reports page is the obvious home. It is not changed here.
3. **No PDF in the dialog.** The output is a link; a PDF stays a `render.sh` job. If people ask for "download as PDF" from the
   dashboard, that needs a server that can print a page.
4. **Versions** are 2.0.3, the current plugin version, so builds stamped at 2.0.3 do not report drift.
5. **Until this is published** the live registry has no entry for these two, so the template's own build notice reports
   `summary-block` as removed from the system when it is opened outside the hub. It clears on publish.

Token safety: no value was added to the palette, type ramp or radii; `--gw-text-h7-bold`, `--gd-tone-*-fg` and the space
tokens are existing.
