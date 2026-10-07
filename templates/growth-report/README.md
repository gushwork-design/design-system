# Growth report template

A report: one scrolling page with no rail, shared as a link or a PDF. A verdict, four headline numbers with their
changes, the charts that explain them, a table by channel, a second tab for one breakdown and a last tab that defines
the terms. Invented sample data: every figure is sample, and the page says so with a `Sample data` badge. Static HTML,
no build step.

Source: the Gushwork dashboard system (`exports/dashboard/`) plus the three report pieces in `exports/dashboard/reports.md`
(`report-frame`, `report-source-line`, `definition-tile`). The `gushwork-reports` skill says when to build one.

**This folder is a generated copy.** The source is `skills/gushwork-reports/templates/growth-report/growth-report.html`;
`bash scripts/build-dashboard-css.sh` re-bases its links for this depth and `--check` fails if the two differ. Edit the
skill's copy, never this one. The README here is the only hand-written file. `render.sh` lives only in the skill's folder,
because it needs that folder's depth.

## Using it

```bash
cp -r skills/gushwork-reports/templates/growth-report ../<your-report>
```

Then in the copy: point the two stylesheet links and the script at your project's `foundation/tokens.css`,
`exports/dashboard/dashboard.css` and `dashboard.js`, replace the sample copy and figures, keep the `Sample data` badge
until real data replaces them, name the real sources and the as-of date in the source line, change the stamp's
`components` list to what the page uses, and delete the tabs and sections the report does not need.

## PDF

`bash render.sh` in the skill's folder prints every tab on one 1200 px page. Do not print the page from a browser:
Chrome applies the dashboard's phone breakpoint when it prints and stacks the tables (`reports.md`, *Printing and PDF*).
