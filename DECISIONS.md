# Decisions — the standing rulings

Every open question in the system, ruled. **Ruled 8 Aug 2026 by Utsav.**

Each ruling has an ID. Export files point here rather than restating the reasoning, so there is
one place to change a decision and one place to read it.

A ruling is not a measurement. **Where Figma has a value, the value wins and there is nothing to
rule** — that is the lesson of `button.md`, where three hovers were ruled by hand and all three
turned out to be sitting in Figma already. Everything below is either a genuine gap in the
source, a conflict the source cannot resolve on its own, or a defect in the source that a build
must not reproduce.

---

## R0 — Figma outranks the spec document, always

**Where `RECONCILIATION.md` records a conflict between a measured component and the written
spec, the measurement wins.** This resolves §2.1, §2.2, §2.3 and §2.4 at once and any future
conflict of the same kind.

**Why.** The spec describes an intended system; the file *is* the system. Building to the spec
produces screens that do not match the components anyone opens in Figma. The four recorded
conflicts are not near-misses — the navbar differs in variant count, prop names and fill; the
dashboard button spec proposes a blue style that does not exist.

**In particular, variant keys keep their irregular spacing** — `Outlined/ black`,
`Outlined / white`, `Text/ black`. These are identifiers. The spec's tidied forms do not resolve.

**What this does not mean.** A measurement that is *wrong on its own terms* — off-palette,
failing contrast, internally inconsistent — is still a defect. R6, R7, R9 and R10 below all
override a measured value. R0 settles spec-vs-Figma, not Figma-vs-sense.

---

## R1 — `input/text-field` is a shared atom

**`input/text-field` `1562:705` moves to `foundation/text-field.md`. Both skills read it.**

**Why.** It is drawn in the web library, but `dashboard-login-screen` instantiates it, and the
dashboard library has no field of its own. The two live options were to promote it or to
duplicate it into the dashboard set; duplicating creates two sources of truth for one control
and guarantees drift, which is the exact failure the system exists to prevent. A text input has
no marketing-versus-product character to justify two of them.

**Consequence.** `foundation/` is now the home for anything both surfaces use — badge, logo,
icons, and this. **If a second dashboard component turns out to reach into `exports/web/`,
promote it here too** rather than letting the boundary blur one exception at a time.

---

## R2 — the text field has no hover state

**`State=Hover` is byte-identical to `State=Default`. Build no hover treatment on a text field.**

**Why.** This is measured, not missing: same `neutral/50` fill, same type, same everything. The
field's affordance is the caret (`cursor: text`), and its feedback is `Selected`. An earlier pass
ruled `neutral/100` here — that was a third answer Figma does not support, and it is withdrawn.

**This is the one exception to** *"every interactive element has a hover state"* in
`exports/dashboard/states.md`. That rule is about **click targets**. A text input is not one.

**`:focus-visible` remains mandatory** — more so here, because the fill does not move either, so
without it a keyboard user gets no signal at all.

---

## R3 — the Google button is 48 / radius 12 / no arrow

**`dashboard-login-screen` renders its Google button at 48 tall, `--gw-radius-12`, with the
Google mark leading and no trailing arrow — in both variants that carry it.**

Figma disagrees with itself: `Type=Google` draws 72 / radius 16 / with a trailing arrow;
`Type=Google + Email` draws 48 / radius 12 / none. Two variants of one component, two buttons.

**Why 48/12/none wins.**

- **Radius 12 matches the black button** it stacks with. At 16 the two buttons in
  `Google + Email` would not agree with each other, which is visible and wrong.
- **72 is out of scale with the whole system.** `Button Large` is 48; nothing else in either
  surface is 72 tall. The 72 is not a considered size, it is an untouched draft.
- **The trailing arrow is misleading on this button.** On the black primary, `ArrowRight` means
  "proceed". Repeating it on a secondary OAuth button says the same thing twice and gives two
  controls the same weight of promise.
- The `Type=Google` button is alone on its screen, so it has nothing to differentiate itself
  *from* — the size difference buys nothing.

**Report the drift when you build it.** Fixing `Type=Google` in Figma is a maintainer task.

---

## R4 — titles use `--gw-color-neutral-black`, never raw `#000000`

**`dashboardTitle` in `dashboard-login-screen` binds a raw `black`. Build
`--gw-color-neutral-black` `#0d0d0d`.**

**Why.** Every other title in both surfaces uses the token. A raw `#000000` is invisible to a
palette change and is a full shade off the black actually used everywhere else — it does not
match the panel beside it. This generalises: **any raw hex that has a token is a binding bug in
the source; build the token and report it.**

---

## R5 — sub-pixel borders round to 1px

**Build `1px`. A `0.81px` border is a 1px border on an instance Figma has scaled.**

Both Google buttons report `0.81px`; the login logo tile reports `spacing/8` while rendering 15
for the same reason. **A non-integer border or radius is an artifact of scale, not a design
value** — no one specified 0.81. Round to the nearest integer and say you did.

---

## R6 — `Yellow Warning` builds `--gw-color-yellow-500`

**`input/text-field`'s `Feedback=Yellow Warning` binds `#c18c0b`, which is in no ramp. Build
`--gw-color-yellow-500` `#d97706`.**

**Why.** `Red Warning` binds `#e11d48`, which is exactly `red-500`. Yellow should mirror it.
`#c18c0b` is nearest `yellow-500` by a wide margin — the alternative, `yellow-600` `#b45309`, is
roughly twice as far. An off-palette hex means a palette change misses this field.

---

## R7 — avatar backgrounds are the `-25` step of their own hue

**Normalise: Blue → `--gw-color-primary-25`, Orange → `--gw-color-orange-25`.**

Measured, the backgrounds are inconsistent in two different ways — Blue uses the `-50` step where
Red, Yellow and Green use `-25`, and Orange abandons its hue entirely for `neutral-50`. Bodies
are consistently the `-300` step in all five.

**Why.** Three of five agree on `-25`, so `-25` is the pattern and the other two are the
exceptions. Orange on `neutral-50` is plainly a mistake — every other avatar tints its background
with its own hue, and a grey-backed orange avatar reads as a different component. Both
replacement tokens exist. Report the drift.

---

## R8 — the `image` typos are a documentation bug; build the correct spellings

**Use `image/strategy-and-pages` and `image/product-&-service-cards`. There is nothing to
preserve and no mapping to carry.**

The unresolved bracket in the Rules of Usage — *"[decide before handoff: fix the typos … in Figma
now, or keep them exactly as-is permanently]"* — **asks a question about a situation that does not
exist.** `exports/web/images.md` checked the canvas: **the actual variant keys are spelled
correctly.** The misspellings `startegy` and `serivce` appear only in the structure documentation
blob `2065:15565`, which also names the typo'd form as the property default.

So there is no key-renaming risk, because there is no misspelled key. **The doc is wrong, not the
component.** Correcting the blob is a maintainer task with nothing bound to it.

**Where two of our own files disagree, the one that measured the canvas wins** — the same rule as
set-over-instance. `exports/web/component-library.md` read the typos out of the doc blob and
reported them as keys; `images.md` read the canvas. `images.md` is right, and
`component-library.md` has been corrected.

The same blob states three different totals for one property — 47, 46, and per-category tables
summing to 45. **The canvas has 46.**

---

## R9 — on dark surfaces, body text is at most `--gw-color-neutral-400`

**`--gw-color-neutral-400` `#959ba4` is the darkest neutral permitted for text on
`--gw-color-neutral-black` or `--gw-color-neutral-900`.**

The footer currently sets its copyright in `neutral-700` on black — about **2.3:1**, against a
4.5:1 floor — and its legal links in `neutral-600`, about **3.9:1**. Both fail.

Measured contrast on `neutral/black` `#0d0d0d`:

| | Ratio | |
|---|---|---|
| `neutral-700` `#535a61` | ~2.3:1 | ✗ |
| `neutral-600` `#6a7077` | ~3.9:1 | ✗ |
| `neutral-500` `#878b94` | ~5.7:1 | ✓ on black, **✗ 4.2:1 on `neutral-900`** |
| `neutral-400` `#959ba4` | **~6.9:1** | ✓ on both (5.1:1 on `neutral-900`) |

`neutral-400` is the only step that clears the floor on **both** dark surfaces, so it is the
single rule rather than two conditional ones. It is also already what the login panel uses for
its description and creator line — this makes the rest of the system consistent with that.

**This overrides the measured value.** Contrast is a floor, not a preference.

---

## R10 — errors do not auto-dismiss; the timer pauses on hover

**`toast` `State=Error` stays until dismissed. Every other state auto-dismisses at 4s. The 4s
timer pauses while the pointer is over the toast, and resumes on leave.**

**Why.** An error the user did not see is an error that did not happen — and errors are exactly
the toasts that carry something the user must act on. Success and info are confirmations; losing
one costs nothing. Pausing on hover is the general fix for "it vanished while I was reading it",
and it costs nothing on toasts nobody looks at.

---

## R11 — the categorical chart palette

**Three series, and the blocker was narrower than recorded.** `Graph Type=Line` is
**single-series by design** — what an earlier pass read as "a second series with no colour" is
the gradient area fill under the one line. Only `Grouped Bar` needs categorical colours, and it
binds three raw hexes.

| Series | Measured | Build | |
|---|---|---|---|
| 1 | `#a1cdfe` | **`--gw-color-primary-200`** `#99c6ff` | unbound token |
| 2 | `#9784ff` | **`--gw-color-chart-violet`** `#9784ff` — **new token** | genuine gap |
| 3 | `#fed14a` | **`--gw-color-yellow-200`** `#fcd34d` | unbound token |

**Why two map and one does not.** Series 1 and 3 sit within ~11 and ~4 units of an existing ramp
step across 765 — differences no one can see, and far too close to be deliberate choices. They
are almost certainly those tokens, unbound. Series 2 is a violet, and **the system has no violet
or purple ramp at all**, so there is nothing to map it to and rounding it into blue would destroy
the categorical distinction that is the entire point.

**So `#9784ff` becomes a token rather than a hex.** It is added as `--gw-color-chart-violet`
under a new `chart` group — deliberately *not* as `violet-300` in a full ramp, because one
colour is not a ramp and inventing nine steps nobody drew would be worse than the problem.

**Three series is the ceiling.** That is what the palette supports and what `Grouped Bar` draws.
A fourth category is a finding to report, not a colour to pick.

**Line and Bar stay `--gw-color-primary-500`.** Single-series charts do not touch this palette.

---

## R12 — the login screen's text props are not free copy

`dashboard-login-screen` exposes six text props. They read like open slots, and two of them are
not: they have fixed jobs, and a build that treats them as somewhere to put a value proposition
gets the screen wrong. That is not hypothetical — it is what happened the first time this screen
was built from the export alone.

**`creatorInfo` is attribution.** It always reads:

```
Created and owned by {creator first name} on {created date} at {created time}.
```

Both values come off the dashboard record. Never a tagline, a feature line, or marketing copy.

**The stamp carries a date *and* a time**, formatted `D MMM YYYY at h:mm am/pm`:

```
Created and owned by Utsav on 8 Aug 2026 at 5:47 pm.
```

No leading zero on the day or the hour, three-letter month, **lowercase meridiem**. This is the
one place the system writes a timestamp, so the format is fixed here rather than left to each
build. Ruled by Utsav, 8 Aug 2026.

**`welcomeDescription` says what the dashboard is and how to use it.** The title already greets;
the subtext orients someone landing on the product for the first time. It is **not** a status
report on what happened while they were away.

> ✓ `Track how your site performs across AI search and Google, and use the page table to find
> what is worth fixing next.`
> ✗ `Your AI marketing team has been researching and publishing while you were away.`

The second reads well and tells a new user nothing about the screen they are looking at.

**Why this is a ruling and not a copy note:** every one of the six props is documented by
*type* and by *measurement*, and none by *purpose*. A prop whose purpose is undocumented gets
filled with whatever sounds good. Where a prop has a fixed job, say so.

---

## R13 — `welcomeDescription` is always exactly two lines, and the gap above it is 24

Two changes to the left panel, both ruled 8 Aug 2026.

**The gap is 24, not the measured 32.** Figma draws the text block at `gap-32`; build **24**.
That moves `welcomeDescription` from y 104 to **y 96**. The 600 × 355 block, `creatorInfo` at
405, and the panel tiling are unchanged. A Figma-side fix to report.

**The subtext always occupies exactly two lines.** `body-20-reg` is 20/1.4, so two lines is
**56px** — reserve it and clamp at two:

```css
min-height: 56px;
display: -webkit-box; -webkit-box-orient: vertical;
-webkit-line-clamp: 2; line-clamp: 2; overflow: hidden;
```

The left panel is a tiling that only closes if each block holds its height —
`40 + 355 + 10 + 355 + 40 = 800`. A one-line subtext collapses the rhythm; a three-line one
pushes `creatorInfo` out of its measured box. **A one-line subtext is a bug, not a short string.**

**The clamp is a backstop, not a licence.** Write to two full lines. At the measured 600px column
the practical ceiling is about **121 characters**, and it is sensitive to punctuation — 121 chars
with a comma wraps to two lines, while the same sentence at 122 with an em-dash wraps to three
and silently truncates. Measure the copy; do not eyeball it.

---

## R14 — where the dashboard screens and the library's dashboard components disagree, the screens win

Ruled 13 Aug 2026, component by component.

The GW Dashbords screens (`Q9L6q38dEj3Qu1JkjiT13y`) were built by **detaching library components
and overriding them** — `list-item` detached 34 times into nine different jobs. That was not
carelessness: the library's dashboard components did not fit. `Button` is 28/44h at `radius/8` with
gap 8; the screens render **36h at `radius/12` with gap 4**. `table-row` is 44h with 14/20 text;
the screens render **56h with 12/16**. `controls/dropdown` sits on `neutral/50` with a `neutral/50`
stroke; the screens use **white with a `neutral/400` border**.

So the measured screens become the dashboard spec — `exports/dashboard/v2/` — and the v1 exports
stay in place, banner-flagged, because they are **what is published in the library** and remain
correct for anything instancing from Figma.

**This does not extend past what was replaced.** `Graph`, `toast`, `dashboard-build`,
`login-screen`, `avatar`, `build-rules`, the Sections composition ladder, and every hover / focus /
disabled ruling are untouched and still authoritative. Read the supersession map in
`exports/dashboard/v2/README.md` rather than assuming v2 covers a component.

Note R0 still governs: this is measurement beating measurement, resolved by **which surface
actually ships**, not by measurement beating a spec document.

---

## R15 — the dashboard display ramp has no tokens; use the literal spec and comment it

The dashboard's display type is five styles created 13 Aug 2026, local to the product file:
44/120% Semibold, 36/120% Medium, 28/120% Medium, 22/100% Medium, 20/100% Semibold.

**None maps to a `--gw-text-*` custom property.** `--gw-text-h3` is 44 at **700**, not 600.
`--gw-text-h7` is 22 at line-height **1.4**, not 1.0 — a ~9px difference per card title. There is
no 36, 28 or 20 display step at all.

**Never silently substitute `h3` or `h7`.** Per `CONTRIBUTING.md`, a value with no variable is a
gap to raise in Figma, not a line to add to `tokens.css`. Until these exist as library variables:
emit the literal spec from `exports/dashboard/v2/README.md` and **comment that it has no token**,
so a later reader cannot mistake it for a bound value.

This is the highest-risk item in v2 because it fails quietly — the output looks right and is
unbound.

---

## R16 — dark is a `Theme` variant, and only surface-bearing components carry it

The `Brand` collection has **one mode, `Gushwork`**. There is no dark mode in variables, so the
dark screens work by pointing each layer at a *different* token. Ruled 13 Aug 2026: encode that as
a `Theme=light｜dark` variant, and **only on components that carry a fill or a border**.

Components with no `Theme` variant — `badge`, `status-dot`, `progress-bar`, `divider`, `legend`,
`table-cell` — inherit, and their dark overrides are listed per file. The alternative, a `Theme`
on all 27, roughly doubles the sheet for no gain on components that are text and fills only.

Two dark values a sensible guess gets wrong, both measured:

- **The stat-card sub-line and percentage do not change.** They stay `neutral/500` in both themes.
  Only the label steps (`neutral/700` → `neutral/400`) and the value inverts.
- **The status dot does not step down.** It stays `green/400` where the progress bar it sits above
  goes to `green/300`.

And one inversion that is consistent everywhere: **dark primary is a white fill with a dark
label** — the active tab, the checked checkbox and the primary button all do this. Never carry
`neutral/black` into dark.

---

## Withdrawn

| Ruling | Why |
|---|---|
| `Button` hover fills — `Primary` `neutral-900`, `Outline`/`Ghost` `neutral-25` | **All three were measured in Figma the whole time**, and all three were wrong: `neutral/850`, `neutral/35`, `neutral/50`. See `exports/dashboard/button.md`. |
| Text field hover `neutral-100` | Figma's `State=Hover` is identical to `Default`. Superseded by **R2**. |

Both were ruled on the belief that the source was silent. **Confirm the silence before you fill
it** — that is now a maintainer rule in `CONTRIBUTING.md`.

---

## Still genuinely open

Not ruled, because ruling them needs a decision no measurement supports and no default is
obviously right:

- **`section/Container` empty and loading states** are ruled *pending Figma* in
  `exports/dashboard/states.md`. They stay provisional until the component exists.
- **`controls/toggle` `Size=X-Small`** at 36 × 20 is likewise ruled pending Figma.
- **`Solutions` labels differ between navbar and footer** — `AI Search` vs `AI Search Agent`.
  Same destination, two names. A copy decision, not a system one.
- **`dropdown-options` `Style=Calendar` has no range affordance.** Building one means designing
  it; report the gap rather than inventing a range picker.
- **Whether the v2 components get promoted into the library.** They live in the product file
  (`Q9L6q38dEj3Qu1JkjiT13y`) and are unpublished, so they cannot be instanced from any other Figma
  file. Fine for generating code, wrong for anyone told to find them in the Assets panel. Promoting
  them is a write to a shared library; accepting the split means saying so plainly. See
  `notices/2026-08-13-dashboard-component-sheet-v2.md`.
- ~~**The duplicated `toast`.**~~ **RESOLVED 14 Aug 2026 — renamed, not deleted.** The copy's keys
  are now `Mode` × `State`, matching the library, and it is renamed `toast (local copy of the library
  set)`. Deleting it was the first instinct, but the library's dashboard page is unpublished, so its
  set cannot be imported into the product file — deleting would have left the Feedback section with
  no toast and no way to instance the real one.
- **`table-row` `Selected`.** v1 measures `Selected` ≡ `Hover` ≡ `neutral/25`, with selection shown
  only by the checkbox. v2 rules `primary/alpha-10`, because no selected row exists in the screens
  to measure. Two tables in the wild will disagree until this is settled.
- ~~**Missing dark variants.**~~ **RESOLVED 14 Aug 2026.** `table-row` (14 variants), `table-cell`
  (10), `icon-button` (6), `input` (12), `tab-group` (2) and `icon-toggle-group` (2) all carry
  `Theme` now, and every dark composite points at dark children. 21 of 26 sets are themed; only
  `status-dot`, `progress-bar`, `badge`, `divider` and `legend` inherit, per **R16**.
  One value corrected in the process: dark table header text is **`neutral/100`**, not the
  `neutral/400` first recorded. `input` dark is **derived** from the measured dark select, not
  measured — the dark screen has no input.

---

## R17 — Dashboards reflow below 1280. The scale rule is NARROWED, not withdrawn.

**Ruled by Utsav, 26 Aug 2026.** Supersedes the "1440 is the minimum width, below it SCALE, never
reflow" section of `build-rules.md` **for viewports under 1280 only**. Above 1280 that ruling is
unchanged and still binding.

### Why the old ruling existed, and why it still holds above 1280

`card-layout` has no responsive specification and no slack anywhere in it. At `KPI cards=2` the
580/496 split gives 2 KPIs at exactly the 286 floor and 6 analytics at exactly the 160 floor, and
the section width only reaches 1084 at a 1440 viewport. Reflow, shrink and sideways-scroll were
each tried in Aug 2026 and each broke something specific — a layout matching none of the three
variants, cards measured at 242.9 under their floor, and clipped sections with a wrapping header
toolbar. Scaling was the only option that deformed nothing.

None of that changed. What changed is that the documented cost of scaling — type painting smaller
than the ramp — becomes unacceptable before the viewport gets small enough to matter.

### The regimes

| Viewport | Mode |
|---|---|
| ≥ 2200 | scale · slot padding `clamp(40px, 4vw, 96px)` |
| ≥ 1800 | scale · analytics 3 → 6 across, KPI area capped at 480 |
| 1440 – 1800 | scale · the measured baseline, `--fit` = 1 |
| **1280 – 1440** | **SCALE** — composition preserved exactly, type pays the documented cost |
| **600 – 1280** | **FLOW** — `card-layout` stacks; rail pinned to the measured 64 collapsed state |
| **< 600** | **FLOW** — nav becomes an off-canvas drawer; see `v2/phone.md` |

The ≥1800 and ≥2200 rules were **already specified** in `build-rules.md` and had simply never
been built. They are not new.

### Why 1280 is the hinge

At 1280 the scale factor is 1280/1440 = **0.889**, so 14px paints ~12.4px — the cost
`build-rules.md` already documents, and still legible. Below that it falls under 12px, which is
where scaling stops being acceptable and reflow is worth what it breaks.

**1280 is a judgement call, not a measurement.** It is chosen because it is the widest common
laptop viewport that still renders the measured composition intact.

### What flow mode must do

- Drop the shell's `min-width: 1440px`, or the page scrolls sideways forever.
- Keep the measured **floors** as floors: 2-across analytics still clears 160 at 375.
- Step the display ramp **down its documented steps** (44 → 36 → 28). Do not interpolate.
- Keep exactly one scroller. The slot still scrolls; the page still does not.

### The trade

Two layouts now exist where there was one, and the measured composition is only guaranteed at
1280 and above. That is the price of the dashboards working on a phone at all. Below 600 the
chrome is measured (`v2/phone.md`); the content reflow is ruled.

## R18 — badge light labels are the `/600` step, not `/500`

**A light badge pairs a `{Colour}/25` fill with a `{Colour}/600` label.** The previously
documented `/500` label fails WCAG AA at the component's own `body-12-med`. **Ruled 27 Aug 2026
by Utsav**, as a Promote on `notices/2026-08-27-backlog-board.md`.

**Why.** Measured against the 4.5:1 threshold for small text:

| Pair | Ratio | AA |
|---|---|---|
| `red-25` / `red-500` | 4.28:1 | fail |
| `yellow-25` / `yellow-500` | 3.07:1 | fail |
| `green-25` / `green-500` | 3.15:1 | fail |
| `red-25` / `red-600` | 5.72:1 | pass |
| `yellow-25` / `yellow-600` | 4.84:1 | pass |
| `green-25` / `green-600` | 4.79:1 | pass |

All three signal colours failed as documented — this was not a near miss on one hue. The fills
are unchanged; only the label moves one step darker.

**What this does not change.** `Neutral` (`neutral-50` / `neutral-700`, 6.24:1) and `Black`
(`neutral-900` / white, 14.45:1) already passed and are untouched. The dark treatment is
separate: it pairs `{Colour}/Alpha/10` with a `{Colour}/300` label and was not measured here —
**that is still open.**

**Still to land in Figma.** This is recorded ahead of the component. Until the `badge` set is
updated, an instance pulled from Figma will still carry the `/500` label and disagree with this
file. R0 says the measurement wins over the spec — that does not apply here, because this is a
*defect* in the source rather than a conflict, and R0's own carve-out is for a measurement that
is "wrong on its own terms".

## R19 — a drawn affordance must work, or it does not ship

> **Numbering reconciled 1 Sep 2026.** `main`'s R17 (responsive reflow) and this branch's R18
> (badge labels) were written in parallel and never collided, so all three rulings kept their
> numbers when the branches merged.

**Ruled by Utsav, 1 Sep 2026,** after `Compare` shipped on the GTM Command Center drawn in full,
styled `cursor: pointer`, and bound to nothing at all.

### The rule

**If a control is visible, it does something. If it does nothing, it is not in the build.**

No inert buttons, no decorative menus, no toggles that toggle nothing. This holds even when the
Figma frame draws the affordance — see the R14 boundary below.

### Why this needed to become a ruling rather than stay advice

**It was already advice and it was already broken.** The dashboard skill has carried a "dead
controls" trap since 26 Aug 2026, written after three shipped at once, and it names the exact
check that would have caught this: *every `<button>` must be reachable by a selector something
binds to.* `Compare` shipped anyway, on a build that passed 206 assertions.

**A rule that is not mechanically checked is a rule that gets ignored.** That is the whole
finding. The remedy is not a more strongly worded paragraph.

### The enforceable form

Advice cannot be verified; a convention can. So:

> **Every interactive control carries a `data-*` hook that the JavaScript references, or it
> matches a documented delegated selector.**

That makes deadness *detectable* rather than a matter of review attention, and it is asserted in
`preview/_verify_gtm_command_center.py` as a **hard build failure**, not a warning. A warning
nobody reads is how this shipped.

Two checks cover the class:

1. every `data-*` hook on an interactive element is referenced by the JS — literal,
   `dataset.camelCase`, `getAttribute`, or an `[attr]` selector;
2. every control with no hook matches a delegated selector named in the check.

**Validate the check by breaking it on purpose.** A check that has never failed is not known to
work. Stripping `Compare`'s hook must turn the build red — confirmed 1 Sep 2026.

Two traps in writing that check, both hit on the first attempt:

- **Strip `<style>` as well as `<script>` before scanning for controls.** A CSS comment reading
  "It is an `<input>` so the range…" was parsed as a control and reported dead.
- **A shared class is not evidence of a binding.** `.btn` matches every button on the page, so
  `.topbar .btn` in the JS "proves" that any `.btn` anywhere is wired. Only a *specific* class
  counts — and a control whose classes are all generic needs a real hook.

### Where this sits against R14

**R14 is unchanged. The frame still wins on APPEARANCE; this ruling governs FUNCTION.**

Where a frame draws an affordance that nothing implements, there are two honest outcomes — build
the function, or drop the control. Shipping it inert is not a third. On the GTM Command Center,
`Compare` was **built**: period-over-period deltas on every stat and metric card, composed from
existing tokens and declared as a created element, because no compare pattern exists anywhere in
the system.

### What this does NOT ban

**A genuinely disabled control is fine** — when disabled-ness is the truth and it is drawn in the
measured disabled treatment (`button.md`: `Primary` swaps to `neutral/200`; `Outline` and `Ghost`
drop the label to `neutral/250`). A pagination arrow disabled at the end of a list is honest. An
enabled-looking button that silently does nothing is not.

## R20 — a state is still the page

> ⚠ **PROVISIONAL NUMBER**, for the same reason as R19 — the sequence has diverged between this
> branch and `origin/main`. Renumber both on merge.

**Ruled by Utsav, 1 Sep 2026,** on seeing the loading screen at 375: the title clipped at both
edges, the progress bar running bezel to bezel, and `40%` cut off the right side.

### The rule

**A state that replaces page content carries the page's own layout — its horizontal padding, and
its behaviour in every responsive regime.** A measured desktop width caps itself below 1280,
where R17 says the page flows.

### The finding underneath it

**Reflowing the default view is not reflowing the page.** The R17 pass reflowed the shell, the
cards, the tables and the chrome, verified all three regimes, and passed 221 assertions — while
three separate elements kept desktop-only fixed widths and zero horizontal padding, because none
of them is *visible* in the default view:

| Element | Fixed width | At 375 |
|---|---|---|
| `.load-box` | 442 | 67px wider than the viewport, clipped both sides |
| `.es` (empty state) | 480 | 105px wider |
| `.dp` (date range panel) | 560 | **hung 201px off-screen** |

A state is invisible until something triggers it, so it is invisible to a review that scrolls the
page. **Check every state in every regime, not the default view in every regime.**

### The enforceable form

Asserted in `preview/_verify_gtm_command_center.py` as a **hard failure**, per R19's principle
that an unchecked rule is an ignored rule:

1. **No fixed width greater than the narrowest supported viewport ships without `max-width`.**
   Written as the pattern rather than the three known elements, so anything added later is
   covered too.
2. **Every full-page state declares horizontal padding**, like the page it replaces.

### Three traps, all hit while fixing this

- **Capping the container is not reflowing the layout.** `max-width` on `.dp` made the *panel*
  fit while its two measured panes (228 + 332, both `flex:none`) still hung off-screen. Measure
  the CHILDREN, not just the box.
- **Reflow a control; never drop it.** The picker's preset pane became a horizontal scrolling
  chip row rather than being hidden on phone — hiding is a control lost, which is R19 in the
  other direction. Its `overflow-x` is also deliberate: a fourth `overflow-y` would break the
  measured three-scroller invariant.
- **Strip CSS comments before parsing rules.** A `/* … */` block above a rule is captured as part
  of that rule's selector, so an exact-match check silently never fires. This one reported
  `.loading-page` as unpadded while the padding sat two lines below it.

### Where the measured value still governs

**Unchanged above 1280.** `max-width:100%` costs nothing wherever there is room for the measured
width, so 442, 480 and 560 still render exactly as drawn at every width the exactness rule in
`build-rules.md` applies to. This governs only the flow regimes R17 opened.

---

## R21 — Vert Grotesk first, Plus Jakarta Sans as the export fallback

**The slides display face is `Vert Grotesk Display`. `Plus Jakarta Sans` is the sanctioned
fallback, used only where a custom face cannot load.** `--gw-font-slide-display` names both, in
that order. **Ruled 7 Sep 2026 by Utsav**, when the slides surface was built.

**Why this needed a ruling.** The evidence pointed both ways, and only one direction is real.
The `.pptx` export of the manufacturing deck sets its display copy in Plus Jakarta Sans — 318
runs of it against 125 of Inter — which reads like a deliberate second display face for the
deck surface. It is not. The Figma cover node (`99:5280`) is set in `Vert Grotesk Display`
Semibold, and Plus Jakarta Sans appears **nowhere** in the source.

The substitution happens because Google Slides cannot load a custom font. Every deck that has
been through a Slides or `.pptx` round-trip comes back in Plus Jakarta Sans, which is why so
many circulating decks look like they were designed that way.

**What this means in practice.**

- Build in Vert Grotesk. It is in `fonts/` and it is what Figma uses.
- **A deck that came back from an export in Plus Jakarta Sans is not a bug.** Do not "fix" it,
  do not re-set it, do not file it. The fallback did its job.
- Say so when handing over a `.pptx` or a Slides deck, or someone will report it.
- `Plus Jakarta Sans` ships in `fonts/` under OFL for this purpose only. It is **not** a second
  display face for web, dashboard or lead-magnet surfaces.

**The same round-trip is why R22 exists**, and it also uppercased the cover eyebrow against the
sentence-case voice rule. Treat an export as a rendering of the design, never as the design.

## R22 — the seven picker greys snap to the nearest token

**The slides export's seven tokenless greys are drift and must be snapped.** **Ruled 7 Sep 2026
by Utsav.**

| Export | Build | |
|---|---|---|
| `#666666` | `--gw-color-neutral-600` | |
| `#999999` | `--gw-color-neutral-400` | |
| `#CCCCCC` | `--gw-color-neutral-200` | |
| `#D9D9D9` | `--gw-color-neutral-200` | same target — never distinguishable |
| `#434343` | `--gw-color-neutral-850` | |
| `#EFEFEF` | `--gw-color-neutral-100` | |
| `#000000` | `--gw-color-black` | **R4** |

**Why.** All seven are swatches from the Google Slides colour picker — someone reached for the
colour grid instead of the palette. This is the same mechanism as R21: an artefact of working
downstream of the design, not a decision.

The other nine colours in the export were already exact tokens — `white`, `black`,
`primary-500`, `primary-600`, `neutral-700`, `neutral-200`, `primary-25`, `neutral-50` and
`secondary-500`. The palette was mostly being followed; it was the greys that slipped. So this
is a defect in the source, which is R4's case, not R0's.

**The cost, accepted.** Snapping shifts colours slightly against decks already in circulation.
Recorded in `exports/slides/deck.md` so the next person can see why their old deck differs.

Also drop the 16 stray `Calibri` runs. A default leaking through is not a typeface choice.

## R23 — the cover's blur is measured; it does not reopen glass anywhere else

**`backdrop-filter: blur(12px)` is correct on the slide cover and nowhere else.** **Ruled 7 Sep
2026 by Utsav.**

**Why this looks like a contradiction and is not.** The no-glass rule is a *product-surface*
rule: on a dashboard, blur costs paint time, fails on cheap hardware and hides the layer
underneath. None of that applies to a static 1920 × 1080 slide with one decorative layer behind
a text column.

And the value is not a preference. It is bound on the Figma cover node (`99:5280`), alongside a
4px `neutral-alpha-20-white` border and `--gw-radius-32`. **R0 says the measurement wins.**

**The enforceable form.** Blur is allowed where it is measured on a slide cover node. Reaching
for `backdrop-filter` on a dashboard, a web fold or a lead-magnet page is still a mistake, and
"the slide cover does it" is not an argument — that node is the licence, and it only licenses
itself.

The cover's two other carve-outs are scoped the same way: its **40px** inner inset against the
content card's 20, and its **25.6px dashed `primary-400`** lattice against the ground's 40px
solid white one. Neither generalises to another layout.

---

## R24 — a sample-data case study may exist; it may never carry the marks of a real endorsement

**A case-study page built on invented numbers is a legitimate internal artefact — for a vertical
mockup, a pitch of the format, a layout review. It must never carry an invented named person, a
real person's photograph, or a real client's logo.** **Ruled 15 Sep 2026 by Utsav.**

**Why.** The line between a mockup and a fabricated testimonial is not the numbers. Numbers with
no name attached read as illustrative, and everyone treats them that way. What converts a mockup
into a fabrication is the apparatus of endorsement: a named human, their face, their employer's
mark. Those say *this person vouched for this*, and if the page escapes — forwarded, screenshotted,
pasted into a deck — there is no walking it back, because the claim was never about the number.
It was about the person.

The asymmetry matters. A wrong number is corrected with a better number. An invented quote
attributed to a named engineer at a real company is a thing you have to apologise for, possibly
to them.

**The four clauses.**

1. **Sample outcome figures are permitted**, provided the page says so in a comment block at the
   top of the file *and* in its README. Hero stats, chart values and the numbers inside headline
   copy all count.
2. **The byline stays a token.** `{{QUOTE_NAME}}` and `{{QUOTE_TITLE}}` are not filled with a
   plausible-sounding person. Bracketed placeholders are not a rough edge to tidy — they are the
   ruling, rendered.
3. **No real client logo above sample numbers.** A logo reads as participation. The hero logo
   slot's `onerror` handler hides it, which is the correct behaviour for an unresolved mark;
   leave it unresolved.
4. **Never move a real person's photograph onto a quote they did not give.** An empty byline slot
   is better than a borrowed face. This is the clause most likely to be violated by convenience,
   because the photo is already sitting in `assets/` from the last case study.

**Scope.** A sample-data page may live in `skills/gushwork-web/examples/`, may be shown
internally, and may be sent to a client as a format proposal. It may not be published to a public
URL, embedded in a sales asset, or linked from the site.

**The enforceable form.** `scripts/check-placeholders.sh` is the mechanism, not a reminder. A
sample-data page keeps its byline tokens, so the check fails, so the page cannot pass a clean
push — and clearing it requires deliberately replacing a token with a real cleared name. The
failure is the feature. `skills/gushwork-web/examples/electrocraft/` is the worked instance:
real company facts, sample numbers, tokens still in the byline, and it fails the check on purpose.

**What this does not license.** Sample numbers in anything a prospect sees as a claim — an ad, a
lander, a deck slide, a proposal. This ruling covers the case-study *page format*, not the
practice of inventing results.

---

## R25 — access is data, and the tier that grants it is not editable from inside

**Who can open which page is a runtime rule, stored in Edge Config and changed from
`/admin/access-control` without a deploy. The owner tier is the exception: it lives in the
environment, it is not editable through that page, and only an owner may change who is an
admin.** **Ruled 15 Sep 2026 by Utsav.**

**Why.** Until now the gate was two prefixes compiled into `middleware.js` — `/internal/*` for
anyone at the domain, `/admin/*` for whatever `ADMIN_EMAILS` happened to say. That has no way to
express the thing actually being asked for: staging belongs to the GTM team, a particular tool
belongs to two named people, and someone needs to be able to say so on a Tuesday afternoon
without a redeploy and without asking an engineer. A permission model you cannot change is one
people route around — by sharing a login, or by asking for the gate to come off entirely.

**Why the owner tier is not in the store.** A self-serve access page that can rewrite who is
allowed to use it is not a gate. The first admin to open it could promote anyone, demote the
owner, and lock the building from the inside — not necessarily maliciously; one wrong bulk edit
does it. Owners come from `OWNER_EMAILS`, default `utsav.singh@gushwork.ai,design@gushwork.ai`,
and `isAdmin()` treats them as admins whether or not the stored list agrees. Emptying `admins`
cannot shut the owner out, which is what makes the store safe to hand to a page.

**The clauses.**

1. **The most specific path wins.** A rule on `/internal/staging` overrides the one on
   `/internal`. Prefixes match on segment boundaries, so `/internal/stagingzzz` is not covered
   by the staging rule.
2. **An unreachable store changes nothing.** If Edge Config is missing, unreachable, or returns
   something that does not validate, `_access.js` falls back to the compiled two-tier behaviour.
   It does not fail open, and it does not fail closed and strand the owner.
3. **The decision is live, never the cookie's claim.** The session cookie is signed for twelve
   hours and carries an `admin` flag from sign-in time. Both `middleware.js` and
   `/api/auth/me` evaluate against the current rules instead, because a revoked admin holding a
   valid cookie must lose access now, not at midnight.
4. **The write token never reaches the browser.** `VERCEL_API_TOKEN` can rewrite the store that
   decides who is an admin. The page proposes a ruleset to `/api/access`, which verifies the
   session first and is the only thing that talks to the Vercel API.
5. **Only an owner changes the admin list.** An admin who submits a changed `admins` array is
   refused in full — their other edits are not partially applied.

**The enforceable form.** `web/api/_access.js` is the single decision function, imported by both
the Edge middleware and the Node API routes, so the padlock in the sidebar, the page the edge
serves, and the answer `/api/auth/me` gives cannot disagree. Its `normalise()` treats everything
read from the store as untrusted input.

**Still open.** The catalogue and the review sheet are to be merged into one page; Access Control
is a third, separate page and does not absorb either of them. The Figma rail (683:5282) draws
three admin rows because it assumed a rename — the rail has four until that merge happens.

---

## R26 — build from `templates/`, never from another built page

**Every Gushwork page starts as a `cp -r` of the matching folder in `templates/`. Never copy,
open, or take structure from a page that has already shipped — not a sibling lander, not a
worked example, however close a match it looks.** **Ruled 24 Sep 2026 by Utsav.**

| Deliverable | Template |
|---|---|
| Ad landing page | `skills/gushwork-web/templates/ad-page/` or `skills/gushwork-web/templates/ad-page-signup/` — see R27 |
| Case study | `skills/gushwork-web/templates/case-study/` |
| Lead magnet PDF | `templates/lead-magnet/` |
| Slide deck | `templates/slide-deck/` |

**Why.** A shipped page carries the previous campaign's real client content — named customers,
their photographs, their quotes — and none of it announces itself. It reads as copy you wrote
until somebody checks. Building the AEO lander from `ai-crm-lander/` on 24 Sep 2026 meant
hand-stripping a real testimonial, and its avatar came within one step of shipping under a
different company's byline: exactly the failure R24 clause 4 names, arrived at from a different
direction. R24 forbids the outcome. R26 removes the opportunity.

The second reason is drift. Copying the nearest lander means each page inherits the last one's
divergences as well as its structure, and the template stops being the thing anyone builds from.
A template nobody copies is documentation, not a template.

**The tax, and why it is not an argument against this rule.**

`templates/ad-page/` tokenises its **campaign layer only** — 23 tokens covering the meta block,
the hero, the form, both testimonials and the closing CTA. Everything between them is literal
AI CRM copy that ships as written: the problem fold's heading, the four feature rows, the eight
agents, the four onboarding steps, the comparison table's two competitor columns, and the six
FAQs. Its README calls this "product truth — correct as written," which is true **for another
campaign against the CRM offer** and false for any other product.

So a non-CRM lander rewrites those folds. The AEO page rewrote three of them and dropped the
other three. **That cost is expected and is not grounds for going back to copying a lander** —
copying one costs the same rewrite *plus* the client-content hazard. Budget for it.

The real conclusion is that a **product-agnostic ad template**, one that tokenises the body
folds too, does not exist and should. Until it does, expect the body rewrite on every lander
that is not selling the CRM.

> **Update, 30 Sep 2026:** `templates/ad-page-signup/` is that template. It tokenises every string,
> so a page built from it carries no product's claims. The body rewrite described above still
> applies to `templates/ad-page/` against a non-CRM offer. See R27.

**The carve-out: cleared content, never structure.** Testimonials for an ad lander are taken
from `web/internal/staging/ai-crm-lander` and stay the same unless Utsav asks otherwise —
Stephanie Snyder (hero) and Ryan Cimo (closing CTA), each with the avatar that belongs to that
byline. Utsav cleared that content on 24 Sep 2026. Taking cleared *content* from a shipped page
is permitted; taking its structure or layout as reference is not. R24 clause 4 still governs:
never move a photograph onto a quote its subject did not give.

**Scope.** `skills/gushwork-web/examples/` exists to be **read**, not copied — that split is the
whole point of it. `check-placeholders.sh` checks `examples/` and skips `templates/`, which is
how a half-filled copy is caught before it ships.

**On discoverability, and a correction.** This ruling was first drafted claiming the skill file
did not document `templates/ad-page/`. That was wrong. `skills/gushwork-web/SKILL.md` names it
in the decision table, in the templates table, in the copy command, and tells you outright:
*"Before you reach for the fold set at all, check `templates/ad-page/`."* All of it landed in
`fd458cb`, alongside the template itself. The session that drafted this was reading a **stale
v1.47.0 plugin cache**, cut before that commit, and mistook its own staleness for a hole in the
system.

Two things follow. **Check the plugin version before reporting a gap in the system** — a missing
row is far more often a stale cache than a real omission, and `claude plugin update` is cheaper
than a wrong ruling. And **the repo is the source; the cache is a copy** — when they disagree,
read the repo.

One real gap does remain: `scripts/_search_index.py` points at a non-existent
`internal/mini-tools.html`, so the Tools & Templates page is absent from the site's search index
and no template name is findable in it.

## R27 — ad pages: ask for the hero, then fill the folds from either template

**Every ad landing page starts by asking what kind of hero the user wants. Start from the ad-page
template whose hero matches, then fill the remaining folds by what the content needs, taking
folds from either template. The same holds for every ad-page template added later.**
**Ruled 30 Sep 2026 by Utsav.**

| Template | Hero |
|---|---|
| `skills/gushwork-web/templates/ad-page/` | Form-first: headline, proof ticks, demo form |
| `skills/gushwork-web/templates/ad-page-signup/` | Illustrated: headline, one-click Google sign-up, a picture card |

**What it changes.** R26 said every page starts as a `cp -r` of the matching template and that a
non-CRM lander pays a rewrite of the body folds. That stays true for copying from a template
rather than from a shipped page. What R27 adds is that the templates are a **shared pool of folds**,
not two separate starting points: the navbar, the white frame around the folds, the logo ticker,
the FAQs and the closing call to action are built the same way in both, so a fold from one drops
into a page started from the other.

**Rules that go with it.**

1. **One question up front, and it is the hero.** Everything else is decided from the content.
2. **A fold is built the same way wherever it appears.** Text and destination change per page (a
   button can say and do something different); the design does not. Utsav, 30 Sep 2026: "the design
   build should be the same." When a fold exists in a template, take it from there rather than
   rebuilding it from the Figma. A fold that has two Figma designs is a **variation** of that fold,
   named in the template — the comparison table is the first: plain (ad-page) and with check marks
   (`.cmp--checks`, ad-page-signup).
3. **Name the source of each fold** when stating the layout, and keep the stamp's `components` list true.
4. **R26 still holds.** Folds come from templates, never from another shipped page, and the cleared
   testimonials are the only content taken from one.
5. **Adding an ad-page template means adding a row here**, a card on `/internal/templates`, an entry
   in `scripts/template-previews.py`, and the hero question in `SKILL.md` gains an option.

**Why.** The follow-ups lander needed the ad-page template's navbar, frame, ticker, FAQs and
footer, and its own hero, problem cards, feature rows and a black call to action the ad-page
template did not have. Building it as a copy of one template meant rewriting the other's folds,
and building it from a page meant carrying that page's content. Treating the folds as a pool
avoids both, and turns the second template into a source of folds for the first.

---

## R28 — the brand has a floor that does not depend on a skill triggering

*Ruled by Utsav, 30 Sep 2026.*

A teammate with the plugin installed, and in the habit of using it, built a small game titled
"Gushwork Corner Watch" and published it as a public Claude artifact. It carried the name and
`#0070FF` and nothing else: a pixel font from Google Fonts, no `--gw-*` tokens, no real logo, no
`gushwork-build` stamp. No skill loaded.

**Why it happened.** A skill loads when the request matches its `description`, and the four surface
skills each name a specific deliverable (landing page, dashboard, deck, PDF) and each says "not for"
the others. A game is none of them. The descriptions were written to be disjoint, and disjoint
vocabularies have gaps.

**Ruling.** Two changes, both shipped together:

1. **`gushwork-brand`**, a fifth skill that catches anything carrying the name, logo or blue that no
   surface skill covers, and hands off to a surface skill when one fits.
2. **`scripts/brand-rule.sh`**, a SessionStart hook that hands Claude the floor at the start of every
   session (and after `clear` and `compact`, which drop it), independent of what is asked.

**Why not loosen the four descriptions instead.** They are disjoint on purpose. Widening each to
"or anything Gushwork" makes all four match the same request, and the wrong one wins: the web
skill firing on a dashboard applies a blue primary button where the product uses black-and-outline,
and loads a long rule set for the wrong surface. A miss is recoverable — the floor still holds — and
a wrong-surface hit is not obvious. A separate catch-all keeps the four sharp.

**What stays fixed, even for a toy:** tokens, Vert Grotesk Display and Inter (Plus Jakarta Sans
Bold only where Vert cannot load, R21), the real logo file, the voice rules. **What stays free:** the
idea, layout, motion and copy. An explicit request for an off-system look is honoured and named.

**Not solved.** Nothing in the plugin can stop someone building the same thing in a session where
the plugin is not installed, or on a surface where its hooks and skills are not loaded. This narrows the gap for
everyone who has it installed; it does not close it.

---

## R29 — measure what the skills make, from flags computed on the machine, not from the files

*Ruled by Utsav, 30 Sep 2026.*

The usage log said who ran which skill and named the files. It could not say whether the output
was on-brand, where it was, or what became of it (the Corner Watch game, R28, was found by accident).

**Ruling.** Three additions, none of which uploads a file:

1. **Four flags, computed locally.** On an HTML or SVG output, or a published artifact, the hook
   reads the text on the person's machine and sends `stamp`, `tokens`, `fonts` (`ok`, `foreign` or
   `none`) and `logo` instead of the text. "On-brand" is defined as: uses the `--gw-*` tokens and
   names no typeface outside Vert Grotesk Display, Inter and the Plus Jakarta fallback. It is a
   measurement, not a review.
2. **The artifact link.** A published artifact's claude.ai link is logged, only in that exact shape.
   Artifacts are private by default, so the link alone opens nothing for anyone without access.
3. **A verdict, kept apart.** The owner marks an output Approved or Needs changes on the Usage Logs
   page. It is stored in its own hash keyed by the row's timestamp, so a usage row is never
   rewritten and the log stays append-only.

A short one-way hash of the session id (`sess`) ties an output to the skill that ran in the same
session. It cannot be reversed.

**Why the verdict is not the Slack ✅.** The ✅ loop (REVIEW-LOOP.md) reviews *new components* a
skill had to invent: a message the plugin posts, a mapping from its timestamp to a registry key.
An output made in a teammate's session is never posted to Slack, so there is no message for a ✅ to
land on. Tying the two together would need every output posted there, which is a larger decision.

**Script-made outputs (added 30 Sep 2026).** A lead magnet PDF or a deck is made by a script through
Bash, not a Write, so the hook could not see it. After each Bash call in a session where a Gushwork
skill has run, it now scans the working directory (four folders deep, at most 5,000 entries, skipping
`node_modules`, `.git`, virtualenvs and hidden folders) for PDF, PPTX, PNG and HTML files written since
the last look, and logs their basenames, at most five per call (an HTML file is also measured for the four
flags, locally, as one the Write tool made would be). The session-start ping now carries the same
one-way session hash, so a chat's start, skills and outputs group exactly on the Usage Logs page. A Bash call on a machine with no Gushwork
session marker exits before starting Python, so unrelated work pays nothing. It names what appeared,
not what made it: a PDF dropped into the folder by another tool would be named too.

**What is still not seen.** Sessions without the plugin; files made outside the working directory or
deeper than four folders; and whether an output was *good*, which only the verdict records.

**Kept copies (added 30 Sep 2026, ruled by Utsav): the exception to "no file contents".** The log could
name an output but not open it, which made it a list of things nobody could check. A finished PDF, PNG,
PPTX, HTML or SVG up to 4 MB is now also sent to `/api/log-output` and stored as a private copy, so an
owner can open it from the Usage Logs page.

- **Private.** A Blob store created with private access. Nothing is reachable by URL. The only way
  out is `/api/usage-log?file=…`, behind the same session and owner check as the log. HTML and SVG
  are sent as a download, never rendered on our origin; every response is marked no-sniff and sandboxed.
- **Bounded.** Five types only, 4 MB, the declared type must match the bytes, a per-IP limit, and a
  cap of 300 copies a day across everyone. The endpoint is public (the plugin has no secret to keep),
  so these are what stand between it and a flood. 4 MB and not 5 because a Vercel function rejects any
  request body over 4.5 MB; the file is sent raw, not base64, to get that close. 5 MB would need the
  client-upload route.
- **No automatic expiry.** ONBOARDING tells people copies are deleted "after a few weeks"; in fact
  nothing deletes them. Utsav will clear them by hand in the Vercel dashboard when storage becomes a
  problem. A daily purge (list, delete older than 30 days) was written and then removed at his call,
  to keep the surface small. The daily cap is the only bound on growth until then.
- **Off switches.** `GW_NO_USAGE_PING=1` stops the whole hook; `GW_NO_OUTPUT_COPIES=1` keeps the
  log and skips only the copy.
- **Dormant until a store exists.** With no `BLOB_READ_WRITE_TOKEN` the endpoint answers 204 and
  does nothing, so the code shipped ahead of the store.

**Disclosure.** ONBOARDING.md says it. There is deliberately no in-session notice: Utsav's call
("if someone notices, we will see then"). A teammate who never read ONBOARDING will not know their
outputs are copied. The decision is recorded so it can be revisited.

**A dependency, and what a copy can hold.** This is the site's first dependency (`@vercel/blob`),
imported inside the two routes that use it rather than at the top, so a failure there cannot take
`log-usage` or `usage-log` down. A copy can hold client copy and pricing; owners are the only readers.


## R30 — the hub records who signs in and which pages they open, for the owner

Ruled by Utsav, 1 Oct 2026: track who logs in to the design hub and to any staging or tool page, visible to the owner only.

- **What a row holds.** When, the work email on the verified session, the page path, and whether it was a sign-in or a page view. The shared-password door has no identity, so its rows say `(shared password)` instead of guessing a person. No IP address, user agent, referrer or anything typed.
- **Where it is written.** `middleware.js` (every gated page view: `GET`, a document request, not an image/script/fetch/prefetch, never the analytics page itself) and the two sign-in routes, through `api/_log-visit.js`. The write is handed to `waitUntil` so it cannot slow or break a page; a store outage means a missing row.
- **How much.** One row per person per page per 30 minutes (an NX key with a TTL), the list trimmed to 5000, about two or three KV commands per new view.
- **Who reads it.** the Visits tab of `/admin/analytics`, fed by `api/_visits.js` behind `gw.js` (no new function), owner-checked on every request like the usage log. The public ad landers are not in the matcher and are not recorded.
- **Disclosure.** ONBOARDING.md says it in the same section as the plugin usage ping. There is deliberately no on-page notice, matching R29.


## R31 — the plugin reports how many tokens a Gushwork session used, as three numbers

Ruled by Utsav, 1 Oct 2026: add Claude tokens consumed to the usage log, and report how the system is doing on it in Insights.

- **What leaves the machine.** `tok: {i, o, c}` on the skill, file and artifact rows, and on one `session-end` row from a new `SessionEnd` hook: i = input plus cache-written tokens, o = output tokens, c = tokens re-read from the cache, all for the session so far. `scripts/log-activity.sh` reads them from the `usage` fields in Claude Code's own transcript (`transcript_path` in the hook input) and sends nothing else from it: no text, no tool input.
- **Gate.** The same one as every other row: nothing is recorded for a session in which no Gushwork skill ran, so unrelated work in other projects reports no tokens.
- **Cost.** The read is incremental (a byte offset and the running sums live in the session marker), capped at 5 s per call, and a message streamed more than once in the transcript counts once (largest figures win).
- **What "used" means.** Input plus output, including context written to the cache. Cache re-reads are about 90% of the raw total in a long session and are cheap, so they are shown apart and never added in.
- **Where it shows.** Usage tab: Tokens used, Per session, Re-read from cache, a tokens badge on each chat. Insights tab: tokens per session, tokens to first output and tokens used, each compared with the previous period, a Tokens-to-output column per skill, and findings (costliest skill to a first output, a 10%+ move in tokens per session).
- **Not retroactive.** Only sessions on a plugin that ships this hook have figures; the pages say so rather than showing zeros.
- **Disclosure.** ONBOARDING.md, in the usage-ping paragraph. `GW_NO_USAGE_PING=1` turns it off with everything else.


## R32 — the Component Library, the Catalogue, the Review Gate and the Workflow are one admin page

Ruled by Utsav, 1 Oct 2026, the same shape as Analytics. A first pass framed the existing pages inside the tabs; it looked wrong and was replaced the same day, so every tab is built on the page itself.

- **One page, four tabs.** `/admin/design-system`: Library (the library's counts, then foundations, each surface's components and the recipes as lists), Catalogue (every component with variants and how far it is verified, filterable), Review (the waiting list with copy-able pass commands, and the known gaps) and Workflow (the three diagrams that were `/admin/workflow`). The lists read `/library/data.json`, which `scripts/_library_site.py` writes next to the 125 generated pages; names in the lists link to those pages for the full spec. A tab loads the first time it is opened.
- **Who.** Admins only for the Library and the Catalogue: `/library` moves from the internal tier to admin, so teammates who are not admins lose it. Review is owner-only: `/admin/review-sheet` gets a compiled owner rule, and the Review tab shows a locked card with "Sign in with an owner account" (Google's account chooser, then back to the tab) instead of loading anything for anyone who is not an owner. The visual review sheet itself is still its own page, linked from the tab.
- **Sidebar.** Admin: Access Control, Design System. Owner: Analytics. Review Gate and Design Workflow are no longer their own rows; `/admin/catalogue`, `/admin/component-library`, `/admin/review` and `/admin/workflow` redirect to their tabs.

## R33 — the Catalogue tab is removed, and the Library is rebuilt natively, starting with the Foundations
Ruled by Utsav, 1 Oct 2026. The Catalogue listed every Figma component with its variants and how far it had been verified, which the library's "All components" page already shows from the same file (`exports/catalogue.json`), so it was a third view of one list. `/admin/catalogue`, `/preview/catalogue.html` and `#catalogue` now go to `#library`, and the hand-written sheet is no longer deployed.

- **Foundations are drawn in the page, not linked.** Design System, Library, Foundations shows Color, Typography, Spacing, Radius, Elevation, Layout and Motion and focus as seven sub-tabs with token counts, read live from `/foundation/tokens.json`, so a token change appears with no second copy to edit. Layout after the token pages in Arcade, MagicPath and AirOps on Mobbin: grouped swatch cards (click copies the custom property), a type-scale table with a live specimen, drawn-to-scale spacing bars, radii and shadows.
- **What is not rebuilt yet.** The surfaces (Web, Ad page, Dashboard, Slides, Lead magnet, Shared, Ad creatives) and the recipes are still the earlier lists, and the standalone `/library` pages still exist and are linked from each foundation. Slide tokens (17) and the ruled and type-links groups have no view of their own yet.

**Library structure (same day).** One row of categories, and a plain list of sub-categories beside the content, not a second row of pills: Foundations (Color, Typography, Spacing, Radius, Elevation, Layout, Motion and focus), Web pages (Brand pages, Ad pages), Slides, Documents (Lead magnet, One-pagers), then Dashboard, Shared and Ad creatives. Each sub-category shows its templates first with a Preview button, then its components, then its recipes. The Templates page under Internal still exists for everyone who is not an admin. Dashboard, Shared and Ad creatives were not placed in the new grouping; they keep their own categories until that is decided.

**Recipes are templates (same day).** The reader sees one word. In the library a recipe and a template are both "a template": four recipes share a card with the template they describe (Preview, and How it is built), three have no built template yet (a card with no preview, Open), and two templates have no recipe. The separate Recipes tables and the Recipes metric are gone. The standalone `/library/recipes` pages keep their own wording. The category bar is now an underline tab bar like Library / Review / Workflow and sticks under it.

**Components view (same day).** Components are cards grouped by the doc that describes them (Folds, Cards, Atoms, Fold elements and Page shell on the web; Cards and chrome, Primitives, Controls, Overlays, Feedback, Phone and Data table on the dashboard), each with its name (opens the spec page), version, when the spec moved, review state and doc (opens it on GitHub). A surface whose components each have their own doc is not grouped. A filter shows above eight components. The spec pages are still the standalone ones, and stay linked.

## R34 — `--gw-color-secondary-500` is removed; its uses are `--gw-color-black`
Ruled by Utsav, 1 Oct 2026. The single-step Secondary (`#111827`, Figma `Colors/Secondary/500-main`) was a second near-black beside `--gw-color-black` (`#0d0d0d`). The token is deleted from `tokens.css`, `tokens.json`, `tokens.scss` and `tailwind-theme.js`, every `var()` of it is `--gw-color-black` (the ad-page templates' white button text and form headings, the staging landers, the component sheets), and the pages that re-declared it locally no longer do.

- **Not changed, on purpose.** The logo files (`assets/logo/*.svg`, the email and ID-card copies) keep their own `#111827`; a logo is not recoloured to match a token, and the wordmark's dark now has no token. The palette downloads (`assets/color/*.clr`, `.ase`, `.pdf`) and the two colour sheets still list it until they are regenerated. `exports/ad-page/variables.json` still records the Figma binding `Colors/Secondary/500-main`, which is now a binding with no token, the same kind of gap as the bare legacy `White`.
- **The visible change** is `#111827` to `#0d0d0d` on the text and surfaces that used it: barely perceptible, a touch darker.

## R35 — reviewing happens in a drawer in the Design System page, with buttons; the standalone sheets are gone
Ruled by Utsav, 1 Oct 2026. The Review tab listed 97 commands to copy and the visual review sheet lived on another page, so judging something and recording the decision were two separate trips. The sheets are no longer a destination; the Review tab is an inbox and each item opens in a side drawer with its visual and three buttons.

- **Pass, Rework, Reject.** Rework sends an item back with a note. Reject and Rework need a note. Pass moves on to the next item waiting.
- **Recorded by the next session, not by the button** (Utsav's choice over an instant site-only record or a button that opens a PR). The button queues the decision with the fingerprint that was on screen; the session records it with `--expect`, so a decision on something that has since changed is refused. Until then the row reads "being recorded", and Undo withdraws it.
- **A component must have a visual, and it is shown by itself.** The drawer draws the component, not a frame onto a shared sheet: its own `web/previews/<surface>/<key>.frag`, or its Figma render. Nothing scrolls inside the drawer and nothing is embedded.
- **Standalone sheets.** `/admin/review-sheet`, `/library`, `/library/review` and `/library/components` redirect to the Design System page. The generated `/library/**` pages remain only as the source of `data.json`.

**The old review sheet is deleted (same day, Utsav's call).** `preview/review-sheet.html`, which held the drawings, was split into one fragment per component (43 of them) and removed along with `_sheet_coverage.py` and the publish step that stamped it. `check-previews.sh` now reports 52 of 97 components with a visual (43 drawings and 9 Figma renders) and 45 without. The 5 dashboard components the sheet only drew as part of a general page (dashboard-switcher, date-range-picker, icon-toggle-group, legend, ring) lost their stand-in and now read "No visual yet" until they get a drawing. `/admin/review-sheet` still redirects to the Review tab.

## R36 — a review button writes a pull request itself, instead of waiting for a Claude session
Ruled by Utsav, 1 Oct 2026, after asking why a pass is not simply saved. A pass has to end up in the repo's registry (the skills and checks read it there) and `main` needs a reviewed PR, so the site cannot save it directly; it can open the pull request. Pass, Rework and Reject are now commits on one standing pull request, `review/decisions`, made with a fine-grained GitHub token (`GW_GITHUB_TOKEN`, this repository only, Contents and Pull requests). The session-queue path stays as the fallback when the token is missing or GitHub fails.

- **What does not change.** Nothing reaches `main` without another person approving the pull request. The pass carries the fingerprint the owner saw, so a pass on something that has since changed reads "expired".
- **Cost.** The site holds a token that can write to the repository. It is scoped to this repository's contents and pull requests and nothing else, and it can only write to its own branch; `main` is protected.
- **Side effect on publishing.** `publish-sheets.sh` regenerates a stale library instead of refusing, since a merged decision changes a registry and nothing else.

## R37 — System is back as a theme, and it is the default
Ruled by Utsav, 2 Oct 2026, reversing the 18 Sep 2026 ruling (System dropped, default Light). The theme menu offers System, Light and Dark. With no choice made the site follows the machine, and keeps following it while open (at sunset, say). Explicitly picking Light or Dark sticks until System is picked again.

- **A new storage key.** `gw-theme-choice` holds light, dark or system and is written only when someone picks. The old `gw-theme-pref` was written for everyone on every load while Light was the default, so it could not tell "never chose" from "chose Light" and is no longer read. `gw-theme` still holds the resolved light or dark.
- **Everyone is reset once.** Because the old key cannot be trusted, anyone who had picked Dark before is on System after this deploy. If their machine is light, so is the site, until they pick Dark again.
- **No flash.** Every page's inline first-paint script reads the choice and asks the machine itself, so System does not paint light first. The library's own toggle follows the same keys; it toggles light and dark, which counts as a choice.
- **The trigger glyph** shows a monitor for System, a sun for Light, a moon for Dark.

**All eleven foundation groups are drawn (2 Oct 2026).** Type links, the ruled values (motion, focus, timing) and slides had been left as "Nothing drawn for this group yet". Links are drawn as links in each link token; motion shows a hover transition, a focused button and a bar filling over the toast's lifetime; slides shows the 1920 × 1080 frame to scale with its margin, title box and cover inset marked, then its type, ground lattice and surfaces. The Library's Foundations list gained a Slides tab, and Typography now includes the links. 45 of 97 *components* still have no visual (`bash scripts/check-previews.sh`).

## R38 — the Library shows only what has been approved; everything else is in Review
Ruled by Utsav, 2 Oct 2026. The Library is the system as it stands, so a foundation group or a component appears in it only when its review state is passed and its source has not moved since. Pending, in rework, rejected and expired items are not listed; they are in the Review tab, which is where they are decided. Templates are not reviewed items and still show.

- **What changes on the page.** A foundation tab appears only if at least one of its groups is approved (Typography can show its typefaces and not its type scale); a category lists only its approved components, with "N not yet" beside the count, and says "No component here is approved yet" when it has none. The top tiles count approved against total.
- **The owner sees one more thing:** a Pass they have just pressed and not yet had recorded, so their own work does not vanish while it waits to be merged. Everyone else sees what the registry holds.
- **Consequence today:** with few items passed in the registry, the Library is nearly empty until reviews are recorded and merged. That is the gate working, not a fault.

## R39 — neutral-850 is retinted to sit inside the grey family
Ruled by Utsav, 2 Oct 2026. `neutral-850` was `#333333`, a pure grey with no hue, between `800` `#4d545c` and `900` `#262a2e`, which are cool blue-greys. Anywhere it was used next to them (the dark hub's lines and hovers, the dashboard's Primary button hover, slide body copy) it read as off-colour.

- **New value `#2e3338`.** Same lightness as before (20%), with the hue (about 211°) and saturation (about 9–10%) interpolated from 800 and 900, so nothing gets lighter or darker, only less neutral.
- **Figma is the source and moves first.** The variable `Colors/Neutral/850` in the library file is changed to `#2e3338`; this change in code follows it, so the two never disagree. Until the variable is changed in Figma, do not merge this.
- **What moved with it:** `tokens.css`, `tokens.json`, `tokens.scss`, `tailwind-theme.js`, the four page templates and examples that copy the ramp, the preview and colour sheets, the slide deck builder, and the two docs that quote the hex. Everything that uses the variable follows without edits.
- **Review:** Colour in the Foundations library re-expires and has to be approved again. The dashboard Primary button doc (`button.md`) quotes the new hex for its hover; the measurement in Figma changes with the variable.
- **Not changed:** `35` (`#f5f5f5`, pure grey) and `250` (`#bcbec2`, a near-twin of `300`) are also outside the family; flagged for a later ruling.

## R40 — Bruce is one Slack app, and the concierge lives in the site
Ruled by Utsav, 2 Oct 2026. Bruce does three things and no design work: hands over brand assets (logos, color sheet, swatches, fonts, tokens), points at the right template or tool with its "Use with Claude" prompt, and delivers the nightly design-hub report and ticks Utsav's replies. The earlier agent that generated designs was too expensive and is off.

- **One app.** The existing Slack app "Bruce" also closes the ✅ review loop over HTTP events at `/api/slack-events`. A second app, or Socket Mode, would have split or swallowed those events, so the concierge runs in the same handler (`web/api/_concierge.js`) with no server and no model call.
- **The assets are bundled with the function** (`vercel.json` `includeFiles`), uploaded into the Slack thread, and every one is checked by `scripts/concierge.test.mjs`. Slides answers "coming soon", matching the Library.
- **Replies to the report** are read by the nightly cloud run (Slack API), not handled by Bruce; he only ticks them.
- The manifest is `slack/bruce-app-manifest.yml`.

## R41 — the focus ring is keyboard only, and a text field shows its edge instead
Ruled by Utsav, 3 Oct 2026. He sent the "Ruled" group back for rework on 2 Oct with the note "remove focus ring, we dont need it", and chose "keyboard only" over removing it altogether. This narrows the 7 Aug 2026 focus ruling; it does not delete it.

- **The ring is for keyboard focus only.** `--gw-focus-ring` goes on `:focus-visible`, never `:focus`, so a click leaves nothing behind. Buttons, links, tabs, rows, selects and anything with a `tabindex` keep it.
- **Text fields do not take the ring.** A browser counts a click into a `<input>` or `<textarea>` as keyboard focus, so the ring would show on every click. A field shows its own edge instead, which is also visible when it is reached by keyboard: a 1px `neutral/400` on the hub and library, the dashboard `input`'s black `focus` border on dashboard pages.
- **`outline: none` still needs a replacement.** For a text field the replacement is its edge. This stays the one accessibility requirement in the focus rule.
- **What moved:** the ring is off text fields on the dashboard pages (`analytics.html`, `design-system.html`) and the login modal field; the search fields on the Library pages and the GTM command center preview had it on `:focus` and now show an edge. The tools and the Access Control page already worked this way (30 Sep). The token values and the ring itself are unchanged, so every keyboard ring is as it was.
- **Review:** the "Ruled" group (motion, focus, timing) stays in rework until Utsav approves it again; nothing here approves it.

## R42 — the Design System moves to For Internal Use; Review and Workflow ask for an admin
Ruled by Utsav, 3 Oct 2026. The Library is for everyone who uses the system, so the Design System page moves out of Admin into **For Internal Use** and opens to everyone internal. Its Review and Workflow tabs stay where they are but show no content to anyone who is not an admin, only an "Admin access required" alert.

- **New home: `/internal/design-system`.** `/admin/design-system` redirects to it (and so do the old `/preview/review-sheet` and `/preview/catalogue` redirects, straight, in `web/vercel.json`). The nav entry moved from the Admin group to For Internal Use in `shell.js`.
- **Tiers.** `/library` and `/previews` (the Library's data and drawings) go from admin to internal in `_access.js`, so the Library tab works for any @gushwork.ai account. `/library/review` stays admin. `access.test.mjs` is updated to match.
- **Review tab.** Admins see it read-only; only the owner acts. Anyone else gets the alert. The tab always shows in the row.
- **Workflow tab.** Admins see it; anyone else gets the alert, and the content is not drawn.
- **What this is not.** The alert is a courtesy, not a lock: the Workflow drawing is part of the page's HTML and `/library/data.json` (which includes items that are not approved yet) is readable by anyone internal, because the Library tab needs it. Nothing in either is secret. If either ever should be, it moves to its own path under the admin tier.
- **If a config store holds rules.** The tier changes above are the *defaults*. A store that already has explicit `/library` or `/previews` rules overrides them: change those two to Internal in Access Control → Pages.

## R43 — anything new goes to the design hub for review, and a tool is sized before it is built
Ruled by Utsav, 3 Oct 2026, while the tools skill was being written. Two rules, one ruling.

- **New pieces are registered, not shipped silently.** When a piece of work creates something the library does not have (a component, a pattern, a new way a measured one is used), it is registered in that surface's `exports/<surface>/component-registry.json` as pending, with a drawn preview at `web/previews/<surface>/<name>.frag` and a spec in the surface's doc. It then appears in **Design System → Review**, where the owner approves or reworks it, and the Library lists it once approved (R38). A new surface gets its own registry and its own Library category. Only what is **new** is registered: the library's own switch, field, button and the rest are not registered again by the tool or page that uses them.
- **The notice file still goes with it** (`foundation/new-component-notice.md`). Registering is what makes it reviewable; the notice is what says why it was built.
- **A tool is sized and shaped before it is built.** Before a hub tool is started, and again whenever a request pulls against the tool shell, the owner is asked as options: is it a **mini tool for a light use case**, **light with one integration**, or **heavy**, with several integrations and many use cases? Then its shape: the one job and its input and output, what it keeps, who it is for, and afterwards its options, defaults, result and edge cases. Heavy is not built on the shell by default; it may belong on the dashboard surface or its own app, and the owner decides. See `skills/gushwork-tools`.
- **First use.** The tool shell's four new pieces are the first surface registered this way: `tool-panel`, `tool-action-pill`, `tool-chrome`, `tool-progress`, under a new **Tools** surface (`exports/tools/`).

## R44 — a tool's panel header wears the Gushwork logo, never a stand-in
Ruled by Utsav, 3 Oct 2026, on seeing the `tool-panel` drawing in Review with a blue pencil tile where the tools have the logo ("use gushwork logo as in email sig and the other tool").

- **The mark is the Gushwork logo tile**: the 160×160 symbol on Flat Black `#0D0D0D` (`rx` 20, drawn at 32px with `--gw-radius-8`), the same SVG the email signature creator and the employee ID card generator carry in `.brand-card`. It is the product-chrome tile, not the marketing lockup (`foundation/shared-components.md`).
- **Every tool has the same mark.** Never a per-tool icon, a generic icon in a coloured tile, or the coloured symbol. The tool's name is what tells tools apart.
- **It is a link back to Tools** (`/internal/tools`, `title` and `aria-label` "Back to Tools"), with the tool's name beside it in Vert Grotesk Display 16 Semibold, in a header padded 12 12 12 16 with a hairline beneath.
- **In dark it takes a 1px `neutral/800` ring**, because a black tile on a black panel disappears otherwise.
- **Drawings of the shell follow the same rule.** A library preview of a tool's panel, a mock, or a card for the Tools page draws the real SVG from the tools, never a placeholder. A drawing that shows the wrong mark is rejected in Review, not approved with a note.
- **Where it lives.** `tool-panel` in `exports/tools/components.md`; `skills/gushwork-tools` (What every tool is, decision 28).

## R45 — a reworked item goes back to Waiting tagged "redone", and the Review drawer has keys
Ruled by Utsav, 4 Oct 2026.

- **Redone.** An item sent back for rework whose source has changed since the note was written reads **redone** and is listed under **Waiting**, with a `redone` tag and the original note in the drawer. It is derived, not stored: the rework record keeps the fingerprint the owner was looking at, and a different current fingerprint means someone has had a go at it. The registry still says `rework` until the owner decides again, and a new decision replaces it. A rework with no stored fingerprint cannot be compared and stays in **In rework**. An unrelated edit to a shared doc (such as `exports/tools/components.md`) moves the fingerprint too, the same way it expires a pass.
- **Keys in the Review drawer.** **A** approve, **R** rework (opens the note), **X** reject (opens the note), **U** undo a queued decision, **⌘/Ctrl + Enter** sends the note, **Esc** backs out of the note first and closes the drawer second, **← → / J K** move, **E** expands. Letters are ignored while typing and with ⌘, Ctrl or Alt held, so reload and find still work. Owner only, because the buttons are not drawn for anyone else.

## R46 — a decision lands on main and is live at once; a rework starts a routine
Ruled by Utsav, 4 Oct 2026, after asking for approve and reject to work without the GitHub step, and for a rework to trigger a routine. He chose "write straight to main" over keeping the pull request, and "fire a routine at once" over waiting for the nightly run. He also chose that a reworked item comes back to Waiting **when its fix is on the hub** (R45), not when the pull request opens.

- **Approve, reject and rework are committed straight to main**, one commit per decision, touching only that item's registry file (`web/api/_review-github.js`, `recordDirect`). They are on record at once, with no pull request to approve and merge. Undo is a commit that puts the earlier record back.
- **They are live on the hub before the next publish.** `GET /api/review` is now readable by any signed-in session and returns each decision's action, time, fingerprint and `via`, without the note or the reviewer's name (the owner still gets the whole row). The Library and Review apply a decision with `via: main` over the published data, so an approved item appears in the Library for everyone straight away. If the item's source has changed since the decision, the published data is the truth.
- **This weakens the one gate on main, on purpose.** The ruleset "main: pull request required" has no bypass actor today, so GitHub refuses a direct commit and the decision falls back to the old pull request (`review/decisions`); nothing is lost. The direct path starts working when the account behind `GW_GITHUB_TOKEN` is allowed to bypass that rule for pushes. Nothing else changes about main: every other change still needs a reviewed pull request. The token can write only the registry JSON for the item being decided.
- **A rework starts a routine.** Sending an item back POSTs to the rework routine's API trigger (`GW_REWORK_TRIGGER_URL`, `GW_REWORK_TRIGGER_TOKEN`) with the item, the note and the fingerprint. The routine ("Design hub rework", created 4 Oct 2026) fixes the item, **opens a pull request and stops**: it never merges, publishes or decides, and it may not edit `exports/**` or any registry, so a fix that needs a spec change comes back under "Needs your call". If the trigger is unset or fails, the nightly run picks the rework up, as before. The nightly run now skips an item the library marks `redone`.
- **Back to Waiting is automatic once the fix is published.** The fix changes the item's fingerprint, so after the pull request is merged and the site published the item reads `redone` (R45).
- **Not built.** Deploy on merge. A publish is still a separate act, so a rework's fix reaches the hub only when someone merges and publishes.

## R47 — a Review decision is staged, and applies when the owner presses Save
Ruled by Utsav, 4 Oct 2026: "add a save option, once anything approved, rejected or sent to rework, then take the relevant action".

- **Marking is not applying.** Approve, Rework and Reject (and the keys A, R, X) now stage a decision: the item moves to its tab with a `not saved` tag, the drawer moves on to the next item, and nothing is sent. The drafts live in this browser (`localStorage`, key `gw-review-drafts`), so a reload keeps them. The Library, main and the routine do not change.
- **Save applies them all.** A bar at the top of Review ("3 not saved · 2 to approve, 1 to send back") and a `Save N` button in the drawer header. ⌘/Ctrl+S saves from anywhere on the Review tab. Save sends the decisions one after another: each is a commit on main (R46), and each rework starts the rework routine. A decision that fails stays staged and the toast says why; the rest still go.
- **Discard or Undo throws a draft away.** Nothing was sent, so there is nothing to revert. Undo on a saved decision still reverts it (a commit that restores the earlier record).
- **A draft goes stale if the item changes.** When the Review data loads, a draft for an item whose source has moved since it was marked is dropped, because it no longer describes what is on screen.
- **Counts.** The tab counts include staged decisions, since the rows move; the `not saved` tag and the bar say which are not applied yet.

## R48 — a session opens with a short hello, and an update is one click
Ruled by Utsav, 5 Oct 2026: a warm, short greeting by name when a session starts, so people know the skills are active and it builds a connection; and a one-click way to take a new version.

- **The hello.** `scripts/welcome.sh` is a SessionStart hook on `startup` and `clear` (a new conversation), not on `resume` or `compact`. It gives Claude one instruction: open the first reply with one or two short, warm sentences, by first name, saying the Gushwork design skills are on and which version, then carry straight on with the work. No list, no emoji, said once. A skill's own "Using the Gushwork … skill" line may follow it. It is a hook, not a line in each skill, because a skill loads only when the request matches it and the greeting must reach everyone.
- **The name** is the Claude account's display name, then the git `user.name`, then the part of the account email before the first dot or plus sign. It stays on the machine, is cleaned of anything but letters, apostrophes and hyphens, and is never used to guess anything about the person (they/them stays the default). `GW_NO_WELCOME=1` turns it off on a machine.
- **One-click update.** When a newer version is out, the existing update notice now asks Claude to show the command in its own fenced `bash` block, so the desktop app gives it a Run button. In a terminal it is copy and paste. A restart is still needed to take the new version; this does not replace the auto-update flag.
- **What this cannot do.** Nothing in a plugin runs while Claude is closed, so a plugin cannot start a session or message someone who has not opened Claude. Reaching them is a message outside Claude (Slack), which this ruling does not add.
