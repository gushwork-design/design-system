---
name: gushwork-reports
description: Builds Gushwork reports on-brand — a short, light, mostly one-page read with data and analytics, shared as a link or a PDF. Campaign and growth reports, weekly readouts, backtests, audits, postmortems, "what happened and what to do" pages. Use this whenever the deliverable is a report someone reads rather than works in: "a report", "a weekly readout", "a one-page analytics summary", "a performance report for the client", "turn this analysis into a page", "a report with numbers and charts". Built from the dashboard components, on one scrolling page with no sidebar. Not for a logged-in screen people work in (use gushwork-dashboard), a landing page (gushwork-web), a deck (gushwork-slides) or a downloadable multi-page PDF asset behind an ad (gushwork-lead-magnet).
---

# Gushwork reports

You are building a **report**: one scrolling page that tells a reader what happened, how big it was and what to do,
with the numbers and charts that prove it. It is shorter and lighter than a dashboard. It is read, shared as a link
or a PDF, and never edited in place. It looks like the Gushwork design hub because it is built from the same
components, minus the app shell.

Announce at the start: **"Using the Gushwork reports skill — v2.0.3, updated 7 Oct 2026."**

That version and date are stamped into this file, so **a stale copy reports its own stale date**. If the user asks
whether they are up to date, check for real:

```bash
cd ~/.claude/plugins/marketplaces/gushwork && git fetch -q && git log --oneline HEAD..origin/main
```

Any commits listed means they are behind: tell them to run
`claude plugin marketplace update gushwork && claude plugin update gushwork-design@gushwork`,
then `/reload-plugins` in the chat.

## Report or dashboard?

They look alike and are not the same job. If you are unsure, **ask**; do not guess.

| | Report (this skill) | Dashboard (`gushwork-dashboard`) |
|---|---|---|
| Reader | Reads it, once, then shares it | Works in it, every day |
| Shape | One scrolling page, no rail, no top bar | App shell: rail, content panel, many pages |
| Data | A snapshot, with its sources and an as-of date | Live, filterable, with time controls |
| Length | One page; tabs only when sections each carry weight | As many pages as the product has |
| Leaves as | A link or a PDF | Nothing; it is the product |

A report that needs filters, a live time range, row selection or editing is a dashboard screen. Say so in one line
and use `gushwork-dashboard`.

## Read these first

| For | Read |
|---|---|
| **The four things a report adds, and how to print** | **`exports/dashboard/reports.md`** |
| **A verified starting point** | **`skills/gushwork-reports/templates/growth-report/`**. Copy the folder and edit the copy; never reference another built report. |
| Which component, and how to use it | `exports/dashboard/README.md`, then the doc it points to for each component you use |
| Charts, stat cards, tables, banners | `charts.md`, `data-display.md`, `tables.md`, `feedback.md` under `exports/dashboard/` |
| Every colour, size, radius, shadow, type style | `foundation/tokens.css` |
| Voice, casing, banned words | `foundation/voice.md` |
| Logo, shared Badge, icons | `foundation/shared-components.md` |
| Declaring anything you had to build yourself | `foundation/new-component-notice.md` |

**Never restate a token value or a voice rule here or in your output.** Reference the token. The rules that decide
whether a dashboard component is right (blue is data and status, black is interaction; destructive is a red label;
small text never takes the raw status colours; numbers that change are tabular; no emoji; sentence case) apply to a
report unchanged. They are in `skills/gushwork-dashboard/SKILL.md` under *Rules that decide whether it is right*.
Do not hand-build what the dashboard export already has: no bespoke stat card, chart, table or banner.

## The build sequence — in this order, every time

1. **Read.** `reports.md` first, then the docs for the components you will use.
2. **Ask with options and wait.** One `AskUserQuestion` call, never a paragraph and never across several turns.
3. **State your read in a few lines before building**: the verdict, the headline numbers, the sections in order.
4. **Copy the template** and fill it in. Do not start from memory of what a report looks like.
5. **Verify** (below).
6. **Stamp it** (`exports/dashboard/notice.md`), and **notify** if you created or changed anything.

## Before building — ask with options, don't assume

A report is a claim with evidence. Guessing the claim produces a page that looks right and says nothing.

| Ask | Options to offer | What the answer decides |
|---|---|---|
| **What is it for?** (ask first) | `Tell someone what happened` · `Make a case for a decision` · `A regular readout` · `Explain an analysis` | The verdict, the order of sections, whether the last tab is a method |
| **What is the one-line verdict?** | the verdict you inferred from the data, as the first option | The banner and the chart titles |
| **One page or tabs?** | `One page` (recommended) · `Tabs, because sections carry their own weight` | Whether the header has a tab row |
| **Is there real data yet?** | `Yes, connected` · `Yes, I'll paste it` · `Not yet, use samples` | Whether the header carries a `Sample data` Badge |
| **PDF too?** | `Link only` · `Link and PDF` | Whether you run `render.sh` |

**Infer before you ask.** A pasted analysis already contains its verdict; offer it. Skip any question the request
already answers, and drop the interview for a small change.

## What a report contains, in this order

1. **The top bar**: logo left, `Created <date>` right. Part of `report-frame`; do not rebuild it.
2. **The title**, a `Sample data` Badge when the numbers are invented, a one-sentence description with the period,
   then the **source line**: what the numbers came from and the date the data runs to. **Required, every report.**
3. **The verdict**, first, in plain words. The template uses a `banner`; see *Gaps*.
4. **Three or four headline numbers** as `stat-card`s, each with its change against a stated comparison. A fifth
   number means the report is doing two jobs.
5. **The charts that prove the verdict**, each with a **title that states the finding it proves**, not its subject:
   "Cost per trial fell every week", not "Cost per trial by week". Three series at most. A chart that does not say its
   range is wrong.
6. **The tables behind the charts.** Real rows, sorted, with a total row when the rows add up.
7. **Definitions, sources and limits last**, as `definition-tile`s and a short list. A reader checks them; nobody
   reads them first.

Tabs are `tabs-underline` in the header, one row only (R59), and only when a section has enough in it to deserve its
own screen. Default to one page.

## Rules that are specific to reports

1. **A report names its sources and its as-of date.** It is a snapshot; a reader must see what it was made from.
2. **The two dates are different.** `Created` in the top bar is when the report was made. The as-of date in the
   source line is where the data ends. Add `Updated` beside `Created` only when the report was regenerated.
3. **Invented numbers are visibly marked.** `Sample data` in a Badge in the title row, and one line saying which
   numbers are illustrative. The dashboard rule applies unchanged. Remove it the moment real data lands.
4. **The numbers reconcile.** Channel rows add to the total; a share of a total is that share; a change matches the two
   figures it compares. Check the sums before you ship.
5. **A report has no controls that do nothing.** No filter, no range picker and no "Export" button unless it works. A
   PDF is made by `render.sh`, not by a button that prints the page.
6. **The logo is grey on the ground above the sheet.** That is the frame's rule, set by the owner. Do not recolour a
   logo anywhere else.
7. **One verdict, stated once.** Do not repeat it in the description, the banner and a chart title.

## Printing and PDF

Run `bash render.sh` from the template's folder (needs Google Chrome). It prints every tab on one continuous page,
1200 px wide. **Do not print the page from a browser:** Chrome applies the dashboard's phone breakpoint when it
prints, so tables stack into phone-style rows. `reports.md` says why.

## When the library is missing something

**Fall back: a whole deliverable the system does not cover**, such as a long editorial PDF with its own cover, or a
report that must live inside someone else's tool. Do not build it here. Tell the user plainly it is not in the
Gushwork design system yet and point them at Utsav on Slack: `https://gushwork.slack.com/team/U06UAR183TR`.

**Build it: a small element missing from an otherwise buildable report.** Compose from what exists first, build from
tokens only, mark it in the code as new and pending library review, and declare it (below).

**Gaps in this skill today.** Say so rather than hiding them:

- **A summary block.** The verdict is a `banner`, which is meant for a condition that persists, not a finding. A
  headline plus a paragraph, optionally key points, is the missing element. Flag it in the notice.
- **Generate a report from a dashboard.** Dashboards will offer a `Generate report` action, but it is not built or
  designed yet (where the action lives, which sections go in, who can see the result). If asked, say it is planned and
  raise it with Utsav; do not draw a button for it.
- **A report with a rail, or a live range.** That is a dashboard.

**Archived components and templates are not part of the system.** A registry entry whose `review` record says
`"reviewed": "rejected"` was rejected and archived. Never use one: do not compose from it, start from it, copy its
markup, cite it or take inspiration from it. Check its `review` record in the registry before starting from any
template or component.

**Then notify, every time, without being asked.** If you created or modified any element, tell the user before you
finish, as one four-line message block linking a `notices/YYYY-MM-DD-<slug>.md` you commit and push. The format, and
the **Worth a decision** section that makes it a review rather than a list, is in `foundation/new-component-notice.md`.
If the person you are talking to is the reviewer, skip the block and say directly what is new and where the notice
is. Register what is new for review on the hub (the registry entry and a drawing); the notice does not replace that.

## Verify

A report is shared, so check what a stranger will see, in the browser:

- **Both themes** and **comfortable density** (compact only when the user asks for it, R57).
- **Widths with `getBoundingClientRect()`** at 1440, 1280 and 390. At 390 the stat tiles pair up two to a row and
  nothing overflows sideways; the logo and the date line up with the content edges at every width.
- **The sums**: every total, share and change recomputed from the rows.
- **The source line and the as-of date are present**, and the as-of date is not later than the data.
- **Tabs**: each opens, and arrow keys move between them.
- **The PDF**, if asked for: run `render.sh`, open it, and check the tables are tables, not stacked rows.
- **Icons are sized** and inherit colour; **no emoji**; **sentence case** throughout.

## Stamp every report you build

A report is a static file that outlives the session that made it. Every build carries a `gushwork-build:{…}` comment
naming the plugin version, who built it, when and the components it uses, exactly as for a dashboard
(`exports/dashboard/notice.md`). List only components the file really uses.

## Source of truth

A report adds four things to the dashboard export (`exports/dashboard/reports.md`); everything else is the dashboard's.
Where `reports.md` and the template disagree, the template's page is the source and the doc has a bug to report.
Changing a component is a maintainer task; building a report never needs Figma.
