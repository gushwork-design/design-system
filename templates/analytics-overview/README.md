# Analytics overview template (archived)

> Archived 5 Oct 2026. Not listed on the hub's Templates page or in the library while a different one is made. The files are kept as they were.

A dashboard screen: how a thing performed over a period, against the previous period, broken down and listed.
Show-ups overview with invented sample data (every figure is sample, and the page says so with a `Sample data`
badge). Static HTML, no build step. Use it as the start for an overview, a campaign report or a weekly readout;
not for a settings page, a detail page or an explorer with a query panel.

Source: the Gushwork dashboard system (`exports/dashboard/`), built from its components. Spec and the list of what it
contains: `exports/dashboard/templates.md`.

**This folder is a generated copy.** The source is
`skills/gushwork-dashboard/templates/analytics-overview/analytics-overview.html`; `bash scripts/build-dashboard-css.sh`
re-bases its links for this depth and `--check` fails if the two differ. Edit the skill's copy, never this one. The
README here is the only hand-written file.

## Using it

```bash
cp -r templates/analytics-overview ../<your-project>/analytics-overview
```

Then in the copy: point the two stylesheet links and the script at your project's `foundation/tokens.css`,
`exports/dashboard/dashboard.css` and `dashboard.js` (or a build of them), replace the sample copy and figures, keep the
`Sample data` badge until real data replaces them, set the build stamp's `components` list to exactly what the page uses,
and delete what the screen does not need. Do not reference another built dashboard.

Preview it live on the hub: `/internal/templates/analytics-overview`.
