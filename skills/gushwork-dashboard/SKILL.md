---
name: gushwork-dashboard
description: Builds Gushwork product and dashboard interfaces on-brand — dashboards, app screens, product UI, KPI cards, analytics panels, data tables, side navigation, section headers, filters, tabs, toggles, toasts, and user/account chrome. Use this whenever the request is a logged-in product surface for Gushwork: "build a dashboard", "add a KPI row", "a leads table", "an analytics screen", "the app's side nav", "a settings page". Not for marketing pages — use gushwork-web for landing pages, heroes, folds, and any public-facing site work.
---

# Gushwork dashboard

You are building a **logged-in product surface** for Gushwork. Dense, gray-canvas,
black-and-outline actions, blue reserved for signals. This is not the marketing site.

Announce at the start: **"Using the Gushwork dashboard skill — v1.45.0, updated 7 Sep 2026."**

That version and date are stamped into this file, so **a stale copy reports its own stale date**
rather than claiming to be current. If the user asks whether they are up to date, or the output
disagrees with Figma, check for real:

```bash
cd ~/.claude/plugins/marketplaces/gushwork && git fetch -q && git log --oneline HEAD..origin/main
```

Any commits listed means they are behind: tell them to run
`claude plugin marketplace update gushwork` and restart Claude Code.

## Read these first

| For | Read |
|---|---|
| **The v2 dashboard components — buttons, selects, tabs, tables, cards, chrome** | **`exports/dashboard/v2/README.md`** |
| Every colour, size, radius, shadow, type style | `foundation/tokens.css` |
| **Every standing ruling — R0 to R16** | `DECISIONS.md` |
| Voice, casing, banned words, CTA copy | `foundation/voice.md` |
| Badge, Gushwork logo, Phosphor icons | `foundation/shared-components.md` |
| **Text fields — shared with web, all 14 variants** | `foundation/text-field.md` |
| Declaring anything you had to build yourself | `foundation/new-component-notice.md` |
| **What to emit — React or static HTML** | `foundation/output-targets.md` |
| Shell, scrolling, fill and responsive detail | `exports/dashboard/build-rules.md` |
| The sign-in gate | `exports/dashboard/login-screen.md` |

**Never restate a token value or a voice rule here or in your output.** Reference the token.

Three tiers, because "never invent a number" is unfollowable for page layout and a rule
that can't be followed gets ignored where it matters:

1. **Colour, type, radius, shadow, spacing — always a token. No exceptions.** If one of
   these has no token, that is a finding to report, never a value to invent.
2. **Layout dimensions documented in `exports/`** — the 260 rail, 1164 container, 32px logo
   tile, 28px small button — use the documented figure exactly.
3. **A layout dimension with no documented figure**: choose sensibly, but **say in one line
   that you chose it.** Don't pass your own number off as coming from the system.

## The v2 component set — read the supersession map before you pick a component

**13 Aug 2026.** The dashboard screens in the GW Dashbords file were built by detaching library
components and overriding them — `list-item` detached 34 times into nine different jobs. The
library's dashboard components **did not match what shipped**. A measured component sheet now
documents what actually renders, and **the screens were ruled authoritative** where the two
disagreed.

**Do not reason about which is newer. Use this table.**

| Need | Use | Read |
|---|---|---|
| Button | `control` `Kind=button` — **36h, `radius/12`, gap 4** | `v2/controls.md` |
| Select / filter dropdown | `control` `Kind=select` — outlined (white + `neutral/400`) or filled | `v2/controls.md` |
| Tabs | `tab-group` + `tab-item` — **36h, `radius/12`, gap 4** | `v2/controls.md` |
| Nav row · account row | `control` `Kind=nav` · `Kind=user` | `v2/controls.md` |
| Headline / supporting metric card | `stat-card` · `metric-card` | `v2/cards-and-chrome.md` |
| Data table | `table-row` + `table-cell` — **56h data rows, 12/16 text** | `v2/data-table.md` |
| Topbar · sidebar (incl. collapsed) | `topbar` · `sidebar` | `v2/cards-and-chrome.md` |
| Page title block · section title | `page-header` · `section-header` | `v2/cards-and-chrome.md` |
| Empty state · skeleton · tooltip · modal | new components | `v2/feedback.md` |
| Inline search / dense text field | `input` | `v2/controls.md` |
| **Circular progress · dashboard switcher · date-range picker** | `ring` · `dashboard-switcher` · `date-range-picker` | **`v2/overlays.md`** |
| **The phone shell — topbar, right-hand drawer, bottom dock** | measured 26 Aug 2026 | **`v2/phone.md`** |

**Still the old files — v2 does not cover these:**

| Need | Use | Read |
|---|---|---|
| **Any chart** | `Graph` — v2 has no chart at all | `section-elements.md` |
| **Toast** | the library `toast` — ⚠ a duplicate exists on the sheet with renamed props; use the library one | `toast.md` |
| **Focus rings, hover derivation** | the rulings — v2 defines hover only on `table-row` | `states.md` |

> **`tooltip` has a correction.** `feedback.md` binds the light bubble to an invert alias, which
> resolves to `Neutral/black`. Measured, it is **`Neutral/900`** — see `v2/overlays.md`.
| **Button hover and disabled** | measured values — v2 defines neither | `button.md` |
| **The page shell and composition ladder** | `dashboard-build`, Sections | `dashboard-build.md`, `sections.md` |
| **Login screen · Avatar · scroll and fill rules** | untouched by v2 | `login-screen.md`, `avatar.md`, `build-rules.md` |
| **Open dropdown menu** | 160 wide vs a 144 trigger — v2 has no open state | `controls.md` |

Two things to carry into every v2 build:

- **The display type ramp has no tokens.** The five `Dashboard/display-*` styles (44/36/28/22/20)
  match no `--gw-text-*` custom property — 44 is Semibold where `h3` is Bold, and 22 is
  line-height 1.0 where `h7` is 1.4. Use the literal spec from `v2/README.md` **and comment that
  it has no token.** Never silently substitute `h3` or `h7`.
- **Dark is a `Theme` variant, not a mode.** The `Brand` collection has one mode. Only
  surface-bearing components carry `Theme`; `badge`, `status-dot`, `progress-bar`, `divider`,
  `legend` and `table-cell` inherit, and their dark overrides are listed per file. `table-row`,
  `icon-button`, `input`, `tab-group` have **no dark variants yet** — that is a known gap.

## The build sequence — in this order, every time

Skipping a step here is what produced every rebuild. **1 and 2 come before any markup.**

1. **Read.** `v2/README.md` **first**, then `tokens.css`, `build-rules.md`, `sections.md`,
   `section-elements.md`. Do not start from memory of what a Gushwork dashboard looks like.
2. **Ask with options and wait** — one `AskUserQuestion` call, not a paragraph. See below. A
   dashboard is a set of decisions about what matters; guessing produces a screen that looks
   right and answers nothing.
3. **Name the KPIs and the sections, in order, before building.** One line each. Cheap to
   correct now, expensive after markup.
4. **Pick the `card-layout` variant** from how many numbers genuinely lead — not by habit.
5. **Build the shell first and verify it alone.** `dashboard-build`, locked to the viewport,
   one scroller. Confirm the rail does not scroll before you put anything in the slot.
6. **Fill the slot section by section**, each a Section from `sections.md`.
7. **Verify numerically, not by eye** — the measured widths in `exports/` against
   `getBoundingClientRect()`, colour by sampling the render. Eyeballing approved a rail that
   was 9px out per nav group, three times running.
8. **Notify if you created or changed anything** — one four-line Slack block. Never silently.

## You do not need Figma to build

Everything measured is in `exports/`. **Do not open Figma to build a screen.** It is slower and
it is a trap: an instance read misreports type weight — instances inside `dashboard-build`
return `Inter:Bold` for text the component set defines as `Medium` or `Semi_Bold`, which shipped
a wrong nav rail twice.

Figma is a **maintainer** activity — adding a component, correcting a measurement, re-pulling
tokens. That procedure lives in `CONTRIBUTING.md`, and it is not part of building.

If a value you need isn't in `exports/`, that is a **gap to report**, not a reason to go
measuring. Use tier 3 above — choose sensibly, say in one line that you chose it — and put it
in the notice.

## Values a sensible guess gets wrong

Read off the component sets, 7–8 Aug 2026. **All nineteen dashboard components have now been
checked, and seventeen had been recorded wrong.** Every line below is a value that was built incorrectly at
least once. Reach for this before you reach for intuition.

| Component | The trap |
|---|---|
| `controls/dropdown` | **The open menu is wider than its trigger** — 160 vs 144, right-aligned. Menu border is `neutral/50`, options are `button-12-med`, option hover is `neutral/50`. **There is no selected checkmark** — an earlier ruling invented one. |
| `Graph` | **Three sizes, not interchangeable** — 280 / 400 / 456 tall. `Line` is **single-series**; its "second series" is a gradient fill. `Grouped Bar`'s three colours are raw hex — use `--gw-color-chart-1/2/3`. |
| `section/With Dropdown` | Metric value is **Vert Grotesk Display 18**, not 20. **10 metrics then 6**, not 6+2 then 9. Its data card has **no border** — `section/Container`'s does. Its header dropdown is `2142:583`, not `controls/dropdown`. |
| `section/table` | **The collapse caret is 12px off centre** against its title, and overflows the header box. `section/Container` centres it correctly. Build it centred. |
| `kpi-card` | **The `Mode` names are inverted.** `Mode=light`, `Mode4`, `Mode6` render on **`neutral/900`** — a dark card. `Mode=dark`, `Mode3`, `Mode5` render on `neutral/25`. Height is content-driven; there is no fixed 198. |
| `list-item` | Nav rows are **Inter Medium 500 / 14**; group labels **Inter Semi Bold 600 / 10** on `neutral/400`. The instance inside `dashboard-build` reports Bold for both — it is wrong. |
| `controls/toggle` | `On` is **`neutral/900`**, not blue. |
| `controls/tab` | **Five tabs, not three.** `gap-8`, and **every label is `neutral/900`** — inactive tabs are not greyed. |
| `toast` | **8 variants** (`Mode` × `State`). Padding is **`px-16 py-8`**. `Mode=Dark` collapses all four fills to `neutral/900` and carries the state in the icon alone. |
| `user-card` | **No background fill on any state.** Only the menu tile changes — `neutral/50` on Hover and Clicked. |
| `analytics-card` | `p-12` and `gap-20`. |
| `table-row` | **`Selected` and `Hover` are the same fill**, `neutral/25` — a selected row is marked *only* by a 16px black checkbox. First column (`col-price`) is a fixed **200**, the other five **120**, in a `flex-1` group with `gap-40`. Cell text binds a raw `#6a7077`. |
| `section/header` | **1164 × 146**, not the 164 in the rules text. Title is Vert Grotesk Semibold 32 on **`neutral/900`**. |
| `dashboard-build` | **The shell gap is 0.** 8 + 260 + 1164 + 8 = 1440; the annotation's `gap:8` would give 1448. Rail **880**, container **872** — the rail runs 8px lower. |

### `Button` — padding depends on Size **and** Type, and Disabled differs by Style

| Size | Height | Radius | Padding | Label |
|---|---|---|---|---|
| `Small` | 28 | 8 | `px-12 py-8` | 12, leading 1 |
| `Medium` | 44 | 8 | `px-20 py-16` — symmetric even with an icon | `body-14-med` |
| `Large` | 48 | **12** | `px-24` — but **`pl-24 pr-20` when it carries an icon** | 16, leading 1 |

`Primary` is **`neutral/black` `#0d0d0d`**, not `neutral/900`. `Outline` is a **2px
`neutral/100`** border with no fill.

**`Disabled` is not one treatment.** `Primary` swaps its fill to **`neutral/200`** and keeps
white text; `Outline` and `Ghost` keep their shape and drop the label to **`neutral/250`**.

**When two files in `exports/` disagree, the one written from the component *set* wins.** That is
how the nav rail shipped bold twice — `dashboard-build.md` had been written from an instance and
contradicted `section-elements.md`, which was right. If you cannot tell which is which, say so
rather than picking.

## Before building a dashboard — ask with options, don't assume

A dashboard is a set of decisions about what matters. Guessing produces a screen that looks
right and answers nothing.

**Use `AskUserQuestion`, not a paragraph of questions.** Options are far easier to answer than
open prose — the user clicks instead of composing, and every option you offer teaches them what
the system can actually do. They can always write their own answer instead.

Ask in **one** call with all the questions at once. Never interrogate across several turns.

| Ask | Options to offer | What the answer decides |
|---|---|---|
| **What is this screen accountable for?** | the two or three metrics you inferred from their request, each as an option | which numbers become kpi-cards; everything else drops to supporting |
| **What will they do with it?** | `Monitor` — is it on track · `Diagnose` — why is it off · `Act` — work a list | the Sections you reach for. Monitor → headline + trend. Diagnose → breakdowns + filters. Act → table with row actions |
| **One page or many?** | `A single page` — one scrolling surface, no nav · `A few pages` · `A full app` — grouped nav rail | **ask this FIRST.** It decides whether the rail is navigation or just chrome, and it is the most expensive thing to get wrong |
| **How many numbers genuinely lead?** | `One north-star` · `A natural pair` · `Three co-equal` | the `card-layout` variant — 1, 2 or 3 |
| **Is there real data yet?** | `Yes, connected` · `Yes, I'll paste it` · `Not yet — use samples` | whether the header carries a `Sample data` badge |

**Infer before you ask.** "Show-ups over the week" already tells you the metric is a show rate
and the grain is daily — so offer that as the first option rather than asking from scratch. A
question that ignores what they just told you reads as not listening.

**Skip any question the request already answers**, and drop the whole thing for a small
change — "add a KPI row" needs no interview. Two or three answers beat a screen rebuilt three
times; four questions on a one-card change is friction.

Then **state your read in two or three lines before building** — the KPI, the sections in
order, the variant. Cheap to correct as a sentence, expensive after markup.

### A supplied reference defines CONTENT and STRUCTURE. It does not define visual treatment.

**If the user supplies a reference — an artifact, a screenshot, a URL, an existing tool — take
its content AND its information architecture. Take none of its styling.**

| From the reference | From this design system |
|---|---|
| the KPIs, labels, figures, wording | every colour, type style, radius, shadow, spacing |
| **how many pages it is** | the Sections each page is built from |
| **its section order and grouping** | card arrangement within a section |
| what it chooses to lead with | the `card-layout` variant |

**Not everything is an app.** A postmortem, a closeout, a weekly readout — plenty of real
dashboards are **one scrolling page** with no navigation at all. If the reference is one page,
build one page.

**Ruled by Utsav, 26 Aug 2026, after this went wrong.** A one-page billboard postmortem was
rebuilt as a nine-page dashboard with a grouped nav rail. Every number was faithful and every
component was on-system, and it was still the wrong deliverable — the source was a document you
read top to bottom, and it came back as an app you navigate. Re-architecting a reference is a
**proposal to raise**, never a default. If you think it should be split into pages, say so in one
line and let them decide.

Importing their *styling*, on the other hand, remains wrong for the original reason: it produces
something that looks Gushwork-ish while being off-system. Map the content onto the Sections and
say what you changed.

## Choosing a `section/card-layout` variant

`KPI cards` is a real decision, not a default. **Pick by how many numbers genuinely lead.**

| Variant | Use when | Layout |
|---|---|---|
| `KPI cards=1` | One north-star metric. The strongest choice — one big number, six supports. | 1 KPI left + 6 analytics right |
| `KPI cards=2` | A natural pair — volume and cost, leads and conversion. | 2 KPIs left + 6 analytics right |
| `KPI cards=3` | Three genuinely co-equal headlines. | 3 KPIs on top + 6 analytics below |

**Reaching for `3` every time is the common failure.** If two of the three are supporting
detail, they belong in the analytics row and the variant is `1`. There is no variant above 3
— a fourth headline metric means the page is trying to do two jobs.

**Cards fill the section, they do not sit at their intrinsic width.** `card-layout` is 1084
wide (the 1164 container less its 40px slot padding). At `KPI cards=3` that is three cards at
356 and six analytics at 174. The 286 and 160 in `section-elements.md` are the components'
own widths — a floor, not a fixed size. A row of cards that stops short of the section edge
is wrong.

## Build rules — the five non-negotiables

Full detail, tables and reasoning: `exports/dashboard/build-rules.md`. Reference
implementation: `preview/meta-ads-app.html`.

1. **Exactly one region scrolls — the Slot.** `html, body { overflow: hidden }`, shell locked
   to the viewport, rail `overflow: hidden` with only its nav list scrolling so the user-card
   stays pinned. If the document scrolls, the rail scrolls away with it.
2. **`.slot > * { flex: 0 0 auto }`.** Sections are flex items in a fixed-height column and
   will otherwise be *compressed* instead of the slot scrolling — this collapsed a 228px
   chart body to 56px.
3. **Horizontal measured values are exact; never clamp them.** 260 rail, 1084 section, the
   `card-layout` splits, table data columns. On wide screens change the **column count**, not
   the sizes. Cards *fill* their section — 286 and 160 are floors.
4. **Vertical measured values are the ceiling of a clamp.** A tall viewport renders the
   component exactly as drawn; a short one compresses rather than pushing content below the
   fold.
5. **Align charts by grid, not by matching gaps.** Each bar label shares a grid row with its
   bar. Two independent columns accumulate ~2px of drift per row — measured at 14px.

And one habit: **anything not measured gets a comment saying so** — the fluid shell, hidden
scrollbars, every clamp minimum. A later reader must never mistake a judgement call for a
Figma value.

## The composition ladder — compose downward, never sideways

```
section-elements  →  Sections  →  Dashboard Build
```

| Tier | What it is | Where |
|---|---|---|
| **Dashboard Build** | The page shell. 260px nav rail + content container. **Every dashboard page is this component.** | `exports/dashboard/dashboard-build.md` |
| **Sections** | Self-contained rows and panels that drop into the shell's slot. | `exports/dashboard/sections.md` |
| **section-elements** | The parts a Section assembles — kpi-card, analytics-card, table-row, dropdown, list-item, user-card. | `exports/dashboard/section-elements.md` |

Three hard rules:

1. **Start from Dashboard Build.** Never hand-build dashboard chrome — no bespoke sidebar,
   no custom page frame. Fill its slot.
2. **The slot takes Sections only.** Never place a section-element or loose content
   directly in the slot. If nothing fits, use `section/Container` and put custom content
   in *its* slot.
3. **Reach for a section-element through the Section that contains it.** Don't place one
   standalone.

## Which component? — the decision table

| Need | Use | Read |
|---|---|---|
| Any dashboard page | `dashboard-build` | `dashboard-build.md` |
| **A dashboard behind a login** | `dashboard-login-screen` — `Type` = `Password` / `Google` / `Google + Email` | `login-screen.md` |
| Page title + tabs + filters + refresh | `section/header` — one per page, sticky | `sections.md` |
| Headline metrics + supporting metrics | `section/card-layout`, `KPI cards` = 1, 2, or 3 | `sections.md` |
| A goal / progress readout | `section/progress-bar` | `sections.md` |
| Metric data that needs filtering in place | `section/With Dropdown` | `sections.md` |
| Browsable product data — leads, campaigns, entries | `section/table` | `sections.md` |
| A chart | `section/section-element/Graph` — `Bar` compares items, `Line` shows change over time, `Grouped Bar` shows several measures per item | `sections.md` |
| Anything else, or custom content | `section/Container` **(the rules call it `section/Other` — the real name is `Container`)** | `sections.md` |
| A button | **`control` `Kind=button`** — `outlined` / `primary` (black) / `plain`, 36h `radius/12` — **never a blue fill**. Hover and disabled from `button.md` | `v2/controls.md` |
| Tabs | **`tab-group` + `tab-item`**, 36h `radius/12` gap 4 | `v2/controls.md` |
| Filter dropdown | **`control` `Kind=select`** — outlined or filled. Open menu still `controls.md` | `v2/controls.md` |
| A toggle | `controls/toggle` — **unchanged**, `State=On` is `neutral/900` not blue | `controls.md` |
| Status feedback after an action | `toast` — `Error` / `Warning` / `Success` / `Info` | `toast.md` |
| A status pill anywhere | **Badge** | `foundation/shared-components.md` |
| A metric's direction | kpi-card `Type` = `Positive` / `Negative` / `Neutral` | `section-elements.md` |
| Nav rail grouping | `list-item` with `Property 1=Variant4, Label=yes` for the uppercase group header | `section-elements.md` |
| **Focus, hover, empty, loading and unavailable states** | ruled values for all of them | **`states.md`** |
| **An account / sign-out menu** | `user-card` `State=Clicked` → `dropdown-options` `Style=Icon` | `section-elements.md` |
| **A date range on a header** | `dropdown-options` `Style=Calendar` — single-select; no range affordance exists | `controls.md` |
| **A toggle in a dense row** | `controls/toggle` `Size=X-Small` (36×20) | `controls.md` |

## Cross-surface: which one?

Three components exist **separately per surface**. Getting this wrong is the most common
way dashboard output goes off-system.

| | Use on a dashboard | Not this — that's web |
|---|---|---|
| **Button** | `Button` (`2203:931`) — `Style` = `Primary` / `Outline` / `Ghost` | The web `Button` (`1457:668`) — `Blue` / `Black` / `Outlined/ black` / … |
| **Avatar** | `Avatar` (`1658:24023`) — generated character, app users | `client/avatar` — grayscale squircle, real client photos |
| **Logo** | `gushwork-logo-(internal-use)` (`2102:13508`) — 32×32 symbol tile | `gushwork-logo` — the full marketing wordmark |

**Web and dashboard use two different button component sets by design** — this is
intentional, not a Figma bug to be tidied away. Both are literally named `Button`, and
both expose a `Style` property whose values are completely disjoint:

| | `Style` values |
|---|---|
| **Dashboard** `2203:931` | `Primary` · `Outline` · `Ghost` |
| **Web** `1457:668` | `Blue` · `Black` · `Outlined/ black` · `Outlined / white` · `Text/ black` · `White` · `Special/ With People` · `Special/ Glowing` |

`Style=Primary` is dashboard-only. `Style=Blue` is web-only and invalid here. If you find
yourself reaching for a blue filled button, you have picked up the wrong component. Never
merge, alias, or substitute the two sets.

**Badge is genuinely shared** — same component, both surfaces. See
`foundation/shared-components.md`.

## Surface defaults

These sit above the individual component rules.

- **Blue carries data and status. Black carries interaction state.** Action tiers stay black /
  outlined / text-only — never a blue button fill. Blue is right for the progress-bar fill,
  chart series, Info toasts, blue badges and focus rings. Black is right for a selected calendar
  date, `controls/toggle` `State=On` (measured `neutral/900`), and any selected / active /
  pressed state. **Before filling anything blue, ask which of the two it is.** Full rule in
  `controls.md`.
- **Every interactive element has hover and focus; nothing else does.** Values are ruled per
  component. The focus ring is mandatory — no component in Figma defines one, so without it
  keyboard users get nothing. Anything non-interactive gets no hover, cursor or ring. See
  `states.md`.
- **1440 is the minimum dashboard width.** Below it, scale the shell — never reflow, shrink or
  clip. See `build-rules.md`.
- **`section/header` is sticky** at the top of every page unless explicitly asked
  otherwise.
- **Collapsible Sections default to expanded.** Collapse exists so users can manage a
  dense dashboard — not to hide primary content by default.
- **The Admin avatar is only for owners and admins.** Everyone else gets a standard avatar,
  assigned freely.
- **Match `Mode` to the surrounding Section** on kpi-cards and analytics-cards; match
  Badge and toast light/dark treatment to the surface they sit on.
- **Button and control sizes match their neighbours** — usually `Small` or `Medium` on a
  dashboard.
- No emoji. No bare coloured status dots — use a Badge. See
  `foundation/shared-components.md`.

## Copy

Dashboard buttons are **product action labels**, not marketing CTAs — `Export`,
`Add campaign`, `Save changes`. The `Book a Demo` rule in `foundation/voice.md` governs
marketing CTAs and does not apply here. Sentence case still does.

Replace every placeholder. The components ship `List Item 1`, `Card title`,
`Column Header`, `Entry name`, `Dropdown option 01`, `Bruce Wayne`. None of it is real
copy.

### Invented numbers must be visibly marked

Most requests arrive without data. You will fill a dashboard with plausible figures, and a
plausible figure in a real-looking dashboard **is indistinguishable from a measurement** —
someone will screenshot it into a deck.

So when the numbers are yours: put `Sample data` in a Badge in the `section/header`, and say
in one line which numbers are illustrative. Remove it the moment real data lands. This costs
nothing and prevents the one failure that outlives the build.

Never invent a number that implies a business outcome — revenue, conversion rate, pipeline —
without that marker.

## Settled — do not re-decide these

Each of these was an open question a build had to answer, answered differently every time, and
cost a review round. **They are ruled. Follow the file.**

| Question | Ruled | Where |
|---|---|---|
| Screens vs the library's dashboard components | the **screens** win, component by component — but only for what was actually replaced | **R14**, `v2/README.md` |
| Dashboard display type | **no tokens exist.** Use the literal spec and comment it; never substitute `h3` or `h7` | **R15** |
| Dark theme | a `Theme` variant on **surface-bearing components only**; dark primary is a **white fill with a dark label** | **R16** |
| Toast auto-dismiss | **4s**, resets on a new toast, clears on manual dismiss | `toast.md` |
| Toast message length | must fit the **276px** column — ~32 characters. Never widen the 360 | `toast.md` |
| Blue vs black | blue = data/status, black = interaction state | `controls.md` |
| Focus states | `--gw-focus-ring` on `:focus-visible`, everywhere. Mandatory | `states.md` |
| `Button` hover fills | **MEASURED, not ruled** — Primary `neutral/850`, Outline `neutral/35`, Ghost `neutral/50`. The three hand-ruled values were all wrong | `button.md` |
| Other hover fills | ruled per control; hover moves ONE step toward the element's selected state | `controls.md`, `section-elements.md` |
| Text fields | a **shared atom**, used by both surfaces. **No hover state** — `State=Hover` ≡ `Default` | `foundation/text-field.md`, **R1 R2** |
| Toast on `State=Error` | **never auto-dismisses**; the 4s timer pauses on hover and focus | `toast.md`, **R10** |
| Login `creatorInfo` | fixed attribution — `Created and owned by {first name} on 8 Aug 2026 at 5:47 pm.` Date **and** time, never marketing copy | `login-screen.md`, **R12** |
| Login `welcomeDescription` | says **what the dashboard is and how to use it** — not a greeting, not a status report | `login-screen.md`, **R12** |
| Login subtext height | **always exactly two lines** (56px, clamped). Ceiling ~121 chars at the 600 column | `login-screen.md`, **R13** |
| Login title→subtext gap | **24**, not the measured 32 — puts the subtext at y 96 | `login-screen.md`, **R13** |
| Login screen scaling | fixed **1440 × 840** — scale on **both** axes, and guard the factor against a zero viewport | `build-rules.md` |
| Avatar backgrounds | the **`-25`** step of the variant's own hue — Blue and Orange are drifted | `avatar.md`, **R7** |
| Text on a dark surface | at most **`--gw-color-neutral-400`**; `neutral-600` and `-700` fail contrast | **R9** |
| A raw hex where a token exists | build the **token**, report the binding bug | **R4** |
| A sub-pixel border or radius | round to **1px** — it is a scaled instance, not a design value | **R5** |
| Spec vs Figma | the **measurement** wins, always | `RECONCILIATION.md`, **R0** |
| Motion | `--gw-motion-fast` (120ms), reduced-motion guarded | `tokens.css` |
| Below 1440 | **NARROWED by R17** — scale to 1280, reflow below, drawer below 600 | **R17**, `build-rules.md`, `v2/phone.md` |
| `card-layout` responsiveness | variants are **never** rearranged | `build-rules.md` |
| Toggle in a dense row | `Size=X-Small` 36×20 | `controls.md` |
| Nav group label | not a target — no hover, cursor or focus | `section-elements.md` |
| user-card row | not a target — only the menu tile, `neutral/50` | `section-elements.md` |
| Rail `Dashboard title` | the dashboard's name, not the company's | `dashboard-build.md` |
| Empty, loading and unavailable states | ruled. A quantity that cannot be read is **removed, never zeroed** | `states.md` |

## Two traps when you measure

Before the build traps, the two that corrupt the *numbers* — both hit `login-screen.md` on
8 Aug 2026, and neither is visible from the element you are reading.

1. **The parent holds what the child cannot show you.** The login lattice reads as a solid
   `1px dashed neutral/800` on every one of its 400 cells; the `opacity: 0.3` that makes it subtle
   is on the frame *above* them. Same shape as the scaled logo tile, which reports `spacing/8`
   while rendering 15. **Read the frame, then the children, then check the two agree.**
2. **A "no value here" is a claim, and it needs checking.** All three `Button` hover fills were
   ruled by hand on the belief that Figma left them blank. Figma had them. Ruling is for what the
   source genuinely omits — confirm the omission before you fill it.

And one that only shows up once you render: **Figma centre-aligns strokes, CSS puts borders
inside the box.** A tiled grid of bordered cells doubles every shared edge. Draw one border per
grid line.

## Four traps that survive a screenshot

The table above catches wrong *values*. These four are wrong *behaviour* — each has shipped at
least once, and none is visible in a screenshot. Check them before calling a build done.

0. **Dead controls.** A measured component's anatomy is not a checklist. `page-header` has a
   button in its action slot, `control Kind=user` has a sign-out tile, `dashboard-switcher` has a
   menu — and a static build can honour all three while none of them does anything. Three shipped
   at once on 26 Aug 2026 for exactly that reason: the component drew the affordance, so the build
   reproduced it. **Ship the affordance only if the function exists.** Two checks catch the whole
   class: every `data-*` hook in the markup must also appear in the JS, and every `<button>` must
   be reachable by a selector something binds to. And when you drop a component, drop it from the
   build stamp too, or the drift notice reports on something the file no longer uses.

1. **Black icons.** Building a `<symbol>` sprite drops the `fill="currentColor"` that sits on the
   source file's outer `<svg>`. Sample the computed colour; don't eyeball it.
2. **300 × 150 icons.** An `<svg>` with no width/height renders at the SVG default and blows out
   its row's scrollWidth, hidden by an ancestor's `overflow: hidden`.
3. **Dead controls after a page swap.** Handlers bound once at load detach when the header and
   slot are replaced. Test by navigating **away and back**.
4. **Cards under their floor.** `kpi-card` 286 and `analytics-card` 160 are floors. Measure with
   `getBoundingClientRect()`, at more than one viewport.

## Six traps from measuring a real screen — 15 Aug 2026

Every one of these shipped in `preview/gtm-command-center.html` and had to be reported by the
designer before it was found. None is visible in a screenshot, and four of them **read as correct
when you sample the wrong node**.

1. **Sample the rendered glyph, not the wrapper's `color`.** `.theme-toggle span` also matched the
   nested `.ic` span that the icon helper emits — and a rule applied *directly* to an element beats
   colour *inherited* from its parent. The active glyph painted the inactive colour in both themes
   and was invisible on its own pill. `getComputedStyle(cell).color` said white the whole time;
   `getComputedStyle(cell.querySelector('svg path')).fill` said otherwise. **Descendant selectors
   inside a component leak onto its icon — scope to `>`.**

2. **An icon is bound to the same variable as its label.** Confirmed on all 11 sidebar nav items
   and on both topbar buttons in both frames. There *is* a muted icon colour in the system
   (`Neutral/600`) but it belongs to standalone affordances like a caret — never to a glyph sitting
   next to text. Default to `color: inherit`.

3. **A hover fill must be a theme alias, never a literal.** Baking a measured *light* value in as an
   absolute is correct in light and broken the moment the theme flips: it put white-on-near-white
   (1.23:1) and `Neutral/50`-on-`Neutral/50` (1.00:1) into dark mode. Related: **an absolute fill
   does not invert.** A button filled `Neutral/black` is black in *both* themes, so its hover stays
   dark — do not rule it a light value because the surrounding theme went dark.

4. **`arcData.innerRadius` defines a donut's band, not `strokeWeight`.** `innerRadius 0.8` on a 20px
   ellipse is a 2px band. A 5px `INSIDE` stroke on a shape 2px thick cannot widen it. Reading the
   stroke as the band drew it 2.5× too heavy.

5. **`preserveAspectRatio="none"` scales stroke widths with the viewBox.** A measured 2px line
   rendered under 1px and read as "too faint". Add `vector-effect: non-scaling-stroke` to every
   stroked path in a stretched SVG — and position round things (dots, pills) as HTML, because a
   `<circle>` in a stretched viewBox becomes an ellipse.

6. **Figma merges consecutive cells in a range.** A calendar band is one wide fill, not seven
   adjacent ones — so `space-between` on the day cells renders the range as strips. Contiguous
   `1fr` columns, half-column bands at the endpoints, pill drawn on top.

### And the one that moves every number by 2px

**`strokesIncludedInLayout`.** It is a per-frame boolean and it decides whether a stroke is layout
or paint. Read it — do not infer it from the numbers.

- **`true`** — the stroke participates. A 1px `INSIDE` stroke eats FILL width and adds to a hug:
  `dropdown-options` is 207 wide with `pad 4`, and its **FILL** rows come out **197**, not 199;
  it hugs to **102** for 100 of content. → CSS `border` under `border-box`.
- **`false`** — the stroke is paint only. `date-range-dropdown` carries the same 1px `INSIDE`
  stroke and its panes still measure 228 + 332 = **560**. → CSS **inset box-shadow**.

Both of those frames are *fixed width, hugging height* — identical sizing, opposite results. I
first read this as "INSIDE consumes on HUG, not on FIXED", which fits the numbers and is wrong;
building the component from that rule reproduced neither frame. **When two frames with the same
sizing disagree, the difference is a property you have not read yet.**

Buttons are the everyday case: a Figma button hugs label + padding, so a CSS `border` under
`border-box` makes every one of them 2px wide. Use an inset shadow there.

## Dark mode: five ways it breaks that light mode never shows

All five shipped in the GTM build and all five were reported by the designer, not caught by me.

1. **A theme alias declared in only one theme silently keeps the other's value.** `--tone-good-bg`
   and `--tone-warn-bg` had no dark override, so green and amber badges painted their **light**
   `/25` tints on a dark surface for weeks. Assert that every alias is declared in *both* blocks —
   an omission is invisible in review because the light theme is correct.

2. **Dark label tints are the `Alpha/10` steps, not the light solids.** Measured: `Behind` in dark
   is `Colors/Red/Alpha/10` fill with a `Colors/Red/300` label. The pattern holds across tones —
   light `/25`–`/50` solid + `/500` label, dark `<Tone>/Alpha/10` + `/300` label.

3. **A hover needs two things: contrast against its text, AND separation from its surface.**
   Checking only the first misses the hover that equals the surface it lands on and renders as *no
   hover at all* — four of those shipped, three in dark. Check both, every time.

4. **An absolute fill does not invert, and "keep it dark" is not one colour.** `Neutral/900` is
   correct for the `Show both` track in light and vanishes in dark, because the card behind it *is*
   `Neutral/900`. Same intent, two values: light `/900`, dark `Neutral/black`.

5. **Measuring right after a theme flip reads the OLD theme.** Two separate false conclusions came
   from this — once from a CSS transition still running, once from the page already being in dark
   when the "light" sample was taken. **Disable transitions, set the theme explicitly rather than
   toggling, and assert `data-theme` in the returned payload** so a stale read is obvious.

## Three build-side guards the frames will never tell you about

A static frame draws states, not rules. These are the rules.

1. **A paired control must not reach a zero state.** Two column-group checkboxes that can both be
   off collapse the table to one column showing no data — indistinguishable from a load failure.
   Unchecking the last one hands the check to its pair.
2. **A content column FILLS its slot; it is never pinned to the measured width.** The measured 1200
   is what the slot happens to be with the sidebar open. Pinned, collapsing the rail leaves the
   freed 176px as dead space instead of giving it to the content. Padding is the measured margin;
   width is a result.
3. **Do not reproduce a mark whose coordinates come from different geometry than your render.** The
   two chart marker dots are measured as fractions of the design's plot box; the built curve is a
   traced approximation, so the dots floated above the line marking nothing. Either derive the mark
   from your own curve or leave it out.

## Stamp every dashboard you build — it is how its owner finds out the design moved

A dashboard is a static file that outlives the session that made it. There is no server and no
record of who built what, so nothing can be *pushed* to its owner. The stamp is the substitute.

**Every dashboard you build gets a `gushwork-build:{...}` comment** carrying the plugin version, who
built it, when, the components it used, and the registry URL. `preview/_build_gtm_command_center.py`
is the reference implementation — copy its `BUILD_STAMP` / `DRIFT_JS` block.

Two things read it:

- **`bash scripts/check-drift.sh <file-or-dir>`** — the agent path. Reports only the intersection of
  *components that build uses* and *components that have changed*, split into MUST (renders wrong)
  and MAY (improved).
- **The page itself, on load** — the human path. Fetches
  `exports/dashboard/component-registry.json` from the public Vercel deploy, and if anything drifted
  shows its owner a notice naming what changed, with a `How to update` button that copies a
  ready-to-paste prompt and a link to the changelog sheet.

**When you change a component's spec, bump it in the registry in the same commit.** A change that is
not registered is a change nobody is told about. Set `breaking: true` when an existing build renders
*wrong* until updated, as opposed to merely missing an improvement — that is the difference between
a red notice and an amber one.

### Rules the notice must keep

1. **It must never break the dashboard.** Offline, private host, blocked CORS, malformed JSON — every
   failure path ends in silence. A dashboard that cannot phone home is still a working dashboard.
2. **It fires once per change-set**, recorded when shown, not when dismissed. A notice is not a nag.
   A *later* change is a different signature and earns one fresh showing.
3. **Never `window.prompt`** as a clipboard fallback — it is modal and freezes the page. Reveal the
   text in place, pre-selected.
4. **The registry URL points at the public deploy, not `raw.githubusercontent.com`** — the check has
   to keep working after the repo goes private.
5. **Publishing is part of shipping.** `scripts/publish-sheets.sh` deploys the registry; until it
   runs, every dashboard checks against the old one and nobody is told anything.

### A trap that cost a silent failure

`DRIFT_JS` is a **raw** Python string (`r"""`). Without the prefix, a JavaScript `\n` inside a string
literal is interpreted by Python and written out as a real newline, which breaks the JS at parse
time. The script then never runs — no error in the build, no notice on the page, nothing to see.
Any time you embed JS in a Python builder, make the literal raw and run `node --check` on the
extracted block.

## Lock a measured build behind a verifier

`preview/_verify_gtm_command_center.py` is the pattern. A build measured from Figma regresses
**silently** — it still renders, it is just no longer the design — so assert the measurements as
strings against the built file and re-run on every change:

```bash
python3 preview/_build_gtm_command_center.py && python3 preview/_verify_gtm_command_center.py
```

Two things make it worth the effort:

- **Assert the pattern, not just the value.** "every hover fill resolves through a theme alias" is
  one check that would have caught all three contrast bugs above; three separate colour assertions
  would not have caught the fourth.
- **A static check cannot see computed colour, contrast, scroll or parsing.** Verify those in the
  browser against the live DOM, and write the numbers into the audit so the next pass can diff them.

## Known gaps in the source — do not paper over these

Encoded so you don't silently invent an answer:

- **`dropdown-options` `Style=Calendar` has no range affordance** — no start/end cell, no
  in-between fill, no two-month view. Single-select only; a date *range* is a finding.
- **There is no destructive treatment** — no destructive `Button` style, no red menu row. Sign
  out and delete stay neutral.
- ~~**There is no categorical chart palette.**~~ **RULED — `DECISIONS.md` R11.** The blocker was
  narrower than recorded: `Line` is **single-series by design** (the "second series" is the
  gradient fill under the one line). Only `Grouped Bar` needs categorical colours — use
  `--gw-color-chart-1/2/3`. **Three series is the ceiling**; a fourth is a finding.
- ~~**Toast auto-dismiss on `State=Error`.**~~ **RULED — R10.** Errors never auto-dismiss; the
  4s timer pauses on hover and focus.
- **`controls/dropdown` has no `Color=White, State=Open` variant.**
- **kpi-card has only 6 of 18 `Mode × Type` combinations.** Check `section-elements.md`
  before specifying one.
- **Avatar has only one `Admin=true` variant** (`Style=1, Color=Blue`). Any other admin
  combination resolves to nothing.
- Several keys are Figma auto-generated and load-bearing — `Property 1`, `Variant4`,
  `Mode3`–`Mode6`. Use them exactly as written; don't tidy them.
- **The dashboard and web secondary-button keys differ by two letters** — dashboard is
  `Outline`, web is `Outlined/ black`. Close enough that a careless find-and-replace or a
  substring match silently crosses surfaces. Match the whole key, not a prefix.

If a request needs a value or variant that doesn't exist, say so. Don't interpolate a
radius, invent a Mode, or guess a timeout.

## When the library is missing something

Two different situations. Do not confuse them.

### Fall back — a whole deliverable or surface the system does not cover

A slide deck, a flyer, a standalone tool, a marketing page (that is `gushwork-web`), or a
surface with no Sections at all. **Do not build these.** Tell the user plainly that it is
not in the Gushwork design system yet and point them at Utsav on Slack to get it added:
`https://gushwork.slack.com/team/U06UAR183TR`. Say it in your own words.

### Build it — a small element missing from an otherwise buildable screen

A dashboard that needs a stat tile, a segmented toggle, an empty state, a stepper, a
date-range picker — something the Sections almost cover but not quite. **Build it, then
declare it.** Refusing to render a whole screen over one missing chip is worse than
building the chip and saying so.

Three conditions, all required:

1. **Compose from what exists first.** Most "missing" things are a `section/Container` with
   the right contents, or a Section you have not considered. Check `sections.md` and
   `section-elements.md` before concluding anything is absent.
2. **Build it from tokens only.** Colour, type, radius, shadow and spacing come from
   `foundation/tokens.css`. A new element may combine existing values in a new shape; it
   may never introduce a new value. If it needs a value with no token, that is a finding —
   report it, do not invent the value.
3. **Mark it in the code.** A comment at the element saying it is new, what it was needed
   for, and that it is pending library review. Anyone reading the file later must be able to
   tell your element from a measured one.

### Then notify — every time, without being asked

**If you created or modified any element, you must tell the user before you finish** — as
**one message block they copy straight into Slack.** Not a summary plus a message; the
message to Utsav is the only artefact.

Write the full record to `notices/YYYY-MM-DD-<slug>.md`, **commit and push it** so the link
resolves, then give a **four-line** block that links to it. Exact format:
**`foundation/new-component-notice.md`**. Nobody reads a twenty-line Slack message on a phone,
and nobody sends one they have to edit first.

The notice file must state: what was **created** and why the library had no equivalent, what
was **modified** with the exact measured value you deviated from, the **tokens** used so
review can confirm nothing was invented, and **where** each lives.

It must also carry a **"Worth a decision"** section naming the one or two items that are
genuine judgement calls rather than obvious adaptations. That section is what makes it a
review rather than a list.

**Never let a created element pass silently.** The whole point of a governed system is that
drift is visible. An undeclared component is worse than a refusal, because it looks
official.

## Source of truth

**Two files, and they are not equivalent.**

| Set | File | Page | Published? |
|---|---|---|---|
| v1 — everything in `exports/dashboard/*.md` | Gush Design System v2.0 · `VKcb4fgVyOHKfQonMgN772` | `03 · Dashboard → ↳ dashboard/ component+pattern-library` (`1658:24112`) | **yes** |
| **v2 — `exports/dashboard/v2/*.md`** | **GW Dashbords · `Q9L6q38dEj3Qu1JkjiT13y`** | `Dashboard Components` (`257:371`) | **no** |

The v1 exports are transcribed from that page's annotations, with the inconsistencies flagged
inline. Where a rule and the actual component disagree, the exports document **the component** and
note the discrepancy — the component is what renders.

The v2 set was measured directly off node properties — paddings, gaps, radii, strokes and type
read from the nodes, not from annotations and not from screenshots. **It is not in the published
library**, so its components cannot be instanced from another Figma file. For generating code that
does not matter; for telling someone where to find them in Figma it does. Promoting them into the
library is an open item — see `notices/2026-08-13-dashboard-component-sheet-v2.md`.
