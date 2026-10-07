# The reports skill: a new skill, three new elements and one template

Built 7 Oct 2026 after Swapnil Sinha made a report with the design skills and nothing covered it. A report is a
short, light, mostly one-page read with data and analytics, shared as a link or a PDF. It is built from the dashboard
components on one scrolling page with no rail. Files: `skills/gushwork-reports/` (the skill and the growth-report
template), `exports/dashboard/css/56-report.css`, `registry-parts/reports.json`, `reports.md`,
`web/previews/dashboard/` (four drawings and the template page), `templates/growth-report/` (generated copy),
`scripts/build-dashboard-css.sh`, and the six plugin lists that name the skills.

## Created

**A skill, `gushwork-reports`.** Report or dashboard, the questions to ask first, the order a report follows (top bar,
title and source line, verdict, three or four numbers, charts titled with the finding they prove, tables, definitions
last), seven report-specific rules, printing, verification. It points to the dashboard docs for every component and
restates none of them.

**Three new elements, each marked NEW in its CSS and in `reports.md`, each registered pending review, each drawn.**
- `report-frame`: the grey ground, the one-pager's top bar lifted above the white sheet (logo left, `Created` date
  and the existing `theme-menu` right, so a report switches between System, Light and Dark), and the sheet. Takes the
  shell's container name so the dashboard's phone reflow applies.
- `report-source-line`: sources and as-of date under the title (Mobbin Gumloop, Fresha).
- `definition-tile`: an icon badge, a definition, a formula chip and a Badge on a card (Mobbin Sprig).

**One template, `growth-report-template`.** A verdict banner, four stat cards, a line chart, a breakdown bar, a funnel,
a bar chart, tables, three tabs, a definitions tab. Invented sample data, marked. `render.sh` makes the PDF.

## Modified
- **`scripts/build-dashboard-css.sh`** also builds the reports template's review copy and its `templates/` copy, and
  `--check` covers both.
- **`plugin.json`, `README.md`, `stamp-release.sh`, `brand-rule.sh`, `release-notes.sh`** name the new skill, so it is
  stamped with the version and date and the session hook lists it. Without the `stamp-release.sh` line it would never
  be stamped.
- **The brand, tools and dashboard skills** each gain one line sending a report to `gushwork-reports`.

## Worth a decision
1. **The logo is grey on purpose, and it is off-system.** `shared-components.md` says a logo file is not recoloured.
   You asked for it on 7 Oct 2026 for the report frame, and for both one-pagers (a separate PR). It is a CSS mask of
   the real file on `--gw-color-neutral-500`, so it is one rule to undo.
2. **The verdict is a `banner`, which is the wrong element.** A banner is for a condition that persists; a verdict is a
   finding. A summary block (headline, paragraph, optional key points) would fit. It is not built and not ruled on.
3. **Printing is a workaround.** Chrome applies the dashboard's phone breakpoint when it prints, even on a 1200 px page,
   so a plain browser print stacks tables. `render.sh` prints from a copy of the stylesheet with that breakpoint
   switched off. A proper fix is a print-safe breakpoint in the dashboard CSS; that touches every component, so it is
   not done here, and there is deliberately no Export button.
4. **Versions.** The four components are registered at 2.0.3, the current plugin version, so builds stamped at 2.0.3
   do not report drift. If this ships as 2.1.0 (a new skill), say so and I will bump them with it.
5. **"Generate report" from a dashboard is not built.** Where the action lives, which sections go in and who sees the
   result are undecided. The skill says so rather than drawing a button.
6. **A short list inside a card** has no component, so `gd-report__list` is one rule inside `report-frame`. If you
   want a real list component, it should be its own entry.

Token safety: no value was added to the palette, type ramp or radii. The two sizes with no token (the logo's 20 px
step and the 1120 px measure) are said so in `reports.md`.
