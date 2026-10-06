# Support operations app template

A nine-page product app built from the Gushwork dashboard components, behind one flat rail, with underline tabs for the views inside a page: Overview,
Reports (three), Explorer, Tickets (a filtered list with five views), Ticket (one record), Customers (companies, people),
Help center (articles, categories), Team (agents, workload) and Settings. Static HTML, no build step. Every figure, name and ticket is invented sample data, and every
page says so with a `Sample data` Badge.

Use it as the start for an app that has a list of things, a page per thing, and settings. For a single report page use
`../analytics-overview/` instead. The spec, what each page contains and what was verified are in
`exports/dashboard/templates.md`.

## Using it

Copy this folder and edit the copy. Do not reference another built dashboard.

1. Point the two stylesheet links and `dashboard.js` in each page at your project's `foundation/tokens.css`,
   `exports/dashboard/dashboard.css` and `exports/dashboard/dashboard.js`.
2. Replace `data.js` with your data layer. The pages read only `window.SUP`.
3. Replace the handlers that say nothing is stored (each page's script) with calls to your API.
4. Keep the `Sample data` Badge until real data replaces the sample.
5. Set each page's `gushwork-build` stamp so `components` lists exactly what that page uses.
6. Delete a page you do not need together with its rail row.

The rail, topbar and account row are the same markup in every page, so a change to them is made in each file. The views inside a page (the three reports, companies and people, ...) are underline tabs in its header, not rail submenus;
`app.js` `bindTabs` keeps the address in step with the tab.

## Run it

```bash
python3 -m http.server 8000   # from the repo root
# open http://localhost:8000/skills/gushwork-dashboard/templates/support-ops-app/index.html
```

Density is comfortable by default. Compact is for when the person asks for it (R57).
