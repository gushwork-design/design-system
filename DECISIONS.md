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
