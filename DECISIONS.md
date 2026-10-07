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
- **Addendum, 5 Oct 2026 (Utsav: "do it").** The drawing counts as source too. The fingerprint above covers the registry entry and the doc, and the rework routine may only redraw the preview, so a routine rework never moved it and `dashboard/sidebar-collapsed` stayed in **In rework** after its fix was merged and live. Each decision now also stores `previewFingerprint`, the fingerprint of `web/previews/<scope>/<key>.frag` as the reviewer saw it, and a changed drawing reads **redone** (for a rework) or **expired** (for a pass) the same way a changed doc does. Compared only where both sides have one, so every decision made before this date behaves exactly as it did; the 5 Oct reworks were backfilled from the drawing at the commit that recorded each note. Chosen over folding the preview into the one fingerprint, which would have expired all 122 passes at once.
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

## R48 — a new chat opens with a greeting by name, and an update is taken with /reload-plugins, not a restart
Ruled by Utsav, 5 Oct 2026: "whenever they start a new session… hey Swapnil or hey Utsav, welcome… keep it short… they will also know that the skill is active"; and on updates, "they can do it on one click — this will exclude the restart mechanism we already have".

- **The line.** "Hey Utsav, fresh chat — you're on Gushwork design system v1.59.0. What are we making today?" One line, no emoji (Utsav's call), the running version, and *fresh chat* so the person knows this is a new conversation (also his call). Reworded the same day after "this message sounds too mechanical — make it more humane… you can say you are on v…": a colleague's hello, not a status line, and when an update is out it is folded into the same breath rather than stacked as a second notice. When the first message already carries a request, the closing question is dropped and the rest stays — my call, so a greeting never ends in a question the person has just answered.
- **Where it fires.** Every session on a machine with the plugin, including repos that have nothing to do with Gushwork — Utsav chose this over a Gushwork-only guess, so the plugin is never silently present. `startup` and `clear` only: `resume` and `compact` continue a chat, and "new chat" would be wrong there. Script: `scripts/greet.sh`, registered in `hooks/hooks.json`.
- **Who it names.** The signed-in Claude account's display name from `~/.claude.json` (the same file the usage ping reads the email from), then the Mac account's full name, then git's `user.name`. First word, letters only, or no name — "Hey there," — never a guess.
- **How it reaches them.** A hook cannot make Claude speak before the person types, so the greeting is `additionalContext` and rides on Claude's first reply. No `systemMessage`: the desktop app does not show it reliably (1 Oct 2026), and the line is meant to be said once.
- **The update is one click and one word.** Claude Code 2.1.263 has `/reload-plugins`, so the "restart required" claim (nine places, since the first hook) was stale. The update notice now puts `claude plugin update gushwork-design@gushwork` alone in a bash block — the desktop app renders a Run button on it — followed by "type /reload-plugins". It cannot be literally one click: reloading is a session command only the person can issue. Auto-update on next start is unchanged; it is the fallback, not the ask.
- **What this does not do.** Reach someone who does not open Claude. Nothing in a plugin can start a session on another machine; the only off-Claude channel is Slack, and `scripts/release-notes.sh` already drafts that post. Wiring it to post automatically on release was offered and declined for now ("skip"), so it stays a hand step in the release ritual.

## R49 — System health: an owner-only page that checks everything that keeps the hub alive
Ruled by Utsav, 5 Oct 2026. He chose: live on open plus a routine on Monday and Thursday, every area (storage and data, hosting, integrations, upkeep, and anything else the system depends on), and a daily check that DMs him only when something fails.

- **The page.** `/admin/system-health`, under Owner next to Analytics, owner tier by default (`_access.js`), with the black owner chip. It shows four counts (working, needs improvement, failing, couldn't check), a "Needs attention" list with a fix line per row, then each area. Opening it runs the live checks (a few seconds, each time-boxed on its own); **Check again** reruns them.
- **The checks** (`web/api/_health.js`, routed through `gw.js` so it spends no function). Storage and data: Upstash probe, log sizes and the review queue, Edge Config, Blob. Hosting: the live site, the latest production deployment, whether main is ahead of the live site (review decisions do not count, they apply live), the function count against the 12-function Hobby cap, certificate expiry, domain expiry. Integrations: sign-in, the GitHub token (including its expiry), the main ruleset bypass (R46), Slack, the Anthropic key, the rework trigger (R46). Upkeep: pull requests open more than 3 days, which expected variables are unset (names only), the daily alert's own `CRON_SECRET`, and the routine's snapshot.
- **A row is** working, **needs improvement** (works, but a token is about to expire, there is no room left, something is behind), **failing**, or **couldn't check** (the check itself failed, or a token may not look). A check that throws or times out is "couldn't check", never a 500. No secret value is ever returned, only whether it is set.
- **The routine** ("Design hub system health", Monday and Thursday 9:30 am IST) runs what only a repo checkout can: skill drift, every test file, previews, fonts and placeholders, `claude plugin validate`, unreleased commits since the last release, the review queue. It is read-only and posts a snapshot to `POST /api/health` with `x-gushwork-token` (`GUSHWORK_NOTICE_TOKEN`). The page shows it with its age and flags it if older than 5 days.
- **The daily alert.** A Vercel cron (`30 3 * * *`, 9:00 am IST, the one cron Hobby allows) calls `/api/health?cron=1` with `CRON_SECRET`, runs the live checks and sends a Slack DM to `OWNER_SLACK_ID` through the bot **only when a check is failing**, when the set of failures has changed, or as a reminder after 3 days of the same failure. Needs improvement never DMs. Without `CRON_SECRET` the cron is refused, and the page says so.
- **Setting up.** On the Vercel project: `CRON_SECRET`, and `OWNER_SLACK_ID` and `SLACK_BOT_TOKEN` if not set. On the routine's environment: `GUSHWORK_NOTICE_TOKEN`. The deployment and project checks need `VERCEL_API_TOKEN` to be allowed to read deployments.
- **Not covered.** Whether the claude.ai routines ran: a site cannot ask claude.ai. The repo routine's own report is the proxy, and a missed run shows as a stale snapshot.

## R50 — the dashboard system is rebuilt from the design hub, and the Figma-measured set is retired
Ruled by Utsav, 3 Oct 2026, for heavy analytics dashboards and web apps. The dashboard components are now the ones the design hub ships, extracted, generalised and documented in `exports/dashboard/` (a stylesheet, a script and a registry, with a doc per group). The earlier set, measured off the GW Dashbords Figma file, is removed from the skill, the exports and the Library in the same change.

- **Source of truth.** The hub's code (`web/shell.css`, `shell.js`, `cards.css`, Analytics, Access Control, Tools, the Design System page). Where a component doc and the hub disagree, the hub wins and the doc has a bug. Figma is not needed to build a screen. Where the hub had several versions of one thing the owner chose: buttons are the 36px / r12 black-fill primary; tabs are **both**, pill track for in-page view switching and underline for page sections; pagination is "Page x of n".
- **What was removed.** `skills/gushwork-dashboard` (rewritten), `exports/dashboard/*.md` and `v2/`, the 29 dashboard Library pages and the Dashboard screen recipe's old text, the dashboard preview sheets and the GTM and Meta Ads build scripts, 19 dashboard rows of `exports/catalogue.json`. The rules other surfaces rely on were moved first: focus, hover, click-target and sample-data rules to `foundation/states.md`; the toast rules (R10) to `exports/dashboard/feedback.md`; the shared Badge to `foundation/shared-components.md`.
- **Rulings it supersedes.** **R14** (screens beat library components: there are no library dashboard components to disagree), **R15** (the display ramp has no tokens: still true, the 44px page title is still a literal), **R16** (dark is a `Theme` variant: dark is now `color-scheme` with `light-dark()` aliases, so there is nothing to forget in a second block) and the scale-and-reflow wording of **R17** (the hub scales the shell from 1440 down to 768 and reflows at 767; `shell.md` follows the code). R3 (Google button 48 / r12), R12 and R13 (login text) are carried into `auth.md` where they still apply. R2, R10, R11, R18, R19, R20 and R41 stand.
- **Destructive actions are a red label on a neutral shape.** The outlined button or menu row with red text, never a red fill. The confirm dialog names what will be lost and focuses Cancel.
- **Empty-state and lock badges are rounded squares**, as already ruled for the hub's alerts and empty states: the hub's one circular empty-state badge (`.ul-empty`) was wrong and is reconciled.
- **Density is a first-class switch.** `data-density="compact"` is the dense setting. (R57 later ruled that compact is used only when asked for; comfortable is the default.)
- **Names.** A component name must mean one thing across surfaces (`scripts/version-json.sh` enforces it), so the dashboard's button and timeline are `action-button` and `activity-timeline`; the dashboard Badge is the shared Badge.
- **New elements.** A Mobbin sweep of analytics and web-app dashboards added what the hub lacked: row selection and a bulk-action bar, a filter builder, saved views, a date-range picker and time-range bar, a query builder, a log viewer, a widget grid with edit mode, an explorer layout, a docked panel, forms and settings rows, an unsaved-changes bar, status and incident components, and more charts (area, stacked and grouped bars, waterfall, funnel, heatmap, sparkline, uptime). All are marked NEW in their CSS and every doc, and all start pending in the Review tab; R38 means the Library's dashboard section is empty until they are passed.
- **Registry.** Same URL (`/exports/dashboard/component-registry.json`), rebuilt. Every component is registered at **2.0.0**, so this has to ship as plugin **v2.0.0**: a component version above its plugin's version is reported as drift by every build stamped with that plugin. Old builds see removed components as "removed from the system".
- **Open for rulings, none decided here.** The chart series palette past three (R11), proposed in `charts.md`; more than four tag hues; the placeholder grey (neutral-400, 2.8:1 on white, the hub's own value); the selected-row fill (the tables author kept a blue tint, and blue is for data, not state); whether the admin avatar stays black on a dark ground; a monospace font token for the log viewer.

## R51 — a release reaches teammates only when Utsav says so; a bump alone is silent
Ruled by Utsav, 5 Oct 2026: "let's not trigger the update message every time… I push some updates at night which are not relevant to the user but upgrade the plugin version… only the ones that affect them directly — a new template, a complete new skill — then you ask me if I should inform all the users, and if I say yes, then only send the update message."

- **The flag.** `.claude-plugin/notify.json` names the newest release worth telling everyone about, with one line of summary. `scripts/release.sh` requires `--quiet` or `--notify "<line>"`; only `--notify` writes the file, in the release commit. `version.json` projects it as `notify`, and the hook's git fallback reads the same file at `origin/main`.
- **The hook.** `check-update.sh` still notices every gap, but speaks only when `notify.version` is ahead of the running copy. Behind and unflagged: the autoUpdate flip runs, nothing is said, and the next start takes the version silently. When it does speak, the summary leads: "New: the ad-page template."
- **Who decides.** Utsav, each time, when asked. The rubric for *asking*: a new skill, a new template, or a breaking component. Site, hub, usage-log and script work is `--quiet` without a question, said in one line. The answer is never inferred from the diff.
- **What changed from R48.** The one-click update step (Run button, then `/reload-plugins`) is unchanged; it now appears only under a flagged release. The greeting line still names the running version in every new chat, so a quiet update is visible to anyone who looks, just never announced.
- **Seeded** at v1.58.0, the release that was already telling v1.57.0 copies about itself, so the live behaviour does not change until the first `--notify` release.
- **What this version adds, and where to read more (added the same day).** Utsav first asked for "what feature or anything got added or moved", then narrowed it: "no need to tell about prev versions — talk about what got added in the version that is getting added, and keep any links that help them understand it more." So the notice describes only the flagged release — "New in v1.61.0: the ads skill" — and never lists the releases in between. `release.sh --notify` takes `--link <url>` (up to four) for pages that explain it; the changelog sheet is always linked for anyone who wants the rest. A list of intermediate releases was built and removed the same afternoon.

**Addendum to R47 (5 Oct 2026): Save shows that it is saving.** Pressing Save turns every Save button, the one in the drawer header and the one on the bar, into the dashboard button's busy state (`exports/dashboard/actions.md`): a spinner before the label, which reads "Saving 12 of 53" and counts up, with no pointer events. The bar says so too ("keep this page open"), with a thin progress line along its foot, and marking more is paused until it finishes. The result is the same toast as before. Saving writes one decision at a time to main, so a large batch takes a while; the counter is what says it is working.


## R52 — the build notice's Update now opens Claude Code with the prompt ready, and Remind later brings it back once
Ruled by Utsav, 5 Oct 2026, sending `dashboard/build-notice` back for rework: "update now as primary button and remind later as secondary", then "update now, should open the claude code with the prompt written". Of the options offered (copy and show steps, a `claude://` link, a shell command) he first chose copy-and-show-steps, then asked for the open-with-prompt behaviour.

- **Two buttons replace "How to update".** `Update now` (primary) and `Remind later` (outline). The badge, the list and the footer are unchanged.
- **Update now launches a session through a link.** It opens `claude://code/new?q=<prompt>` in Claude.app, which starts a Code session with the prompt in the box; the person presses Enter. The route was read from the installed app's URL handler (Claude desktop 2.19675.0: `q` or `prompt`, 14,336 characters at most), not from published documentation, so it can change without notice. A prompt over 12,000 characters is not put in the link.
- **The copy stays as the fallback.** A page cannot tell whether the app is installed, and with no handler the click does nothing. So the prompt is also copied, and a line says to paste it if nothing opened; a blocked clipboard reveals the text in a read-only box. `window.prompt` is still never used.
- **No folder is passed.** A page cannot know where its file lives, and the app asks for approval on external folder links. A `file:` dashboard names its own path in the prompt instead. Passing `folder=` is not decided.
- **Remind later postpones by one visit.** It stores the change-set in `localStorage` (`gw-drift-snooze`, per person and browser). The next open shows the notice once more and spends the note. This is the one exception to "once per change-set, recorded when shown" (R50): that rule stands for everything else. If storage is blocked the notice shows on every open, so it can never be hidden for good.
- **Version.** `build-notice` stays at 2.0.0. It was bumped to 2.1.0 first, but the publish guard refuses a component ahead of the plugin (2.0.0), so the bump was reverted rather than cutting a release for it. A dashboard already built on 2.0.0 is therefore not told about this change; one built earlier still is.
- **Review:** the item returns to Waiting as redone (R45); nothing here approves it.

## R53 — a keyboard shortcut is shown inside the control it triggers, as a key cap
Ruled by Utsav, 5 Oct 2026, reviewing the Review drawer footer, where "A approve · R rework · X reject · ⌘ S save · ← → move · Esc close" sat outside the buttons: "the shortcuts don't need to be outside, they can be in the button only, like Approve A, keep the A colour subtler than the main CTA", then "the button thing can be a design pattern and rule, whenever shortcuts are there".

- **The rule.** Wherever a control has a keyboard shortcut, the shortcut is drawn inside that control, after its label, as a quiet key cap (`.gd-btn__key` in the dashboard system; `.gd-kbd` is the Feedback key hint and a different thing). It is never a separate hint line under or beside the controls.
- **The cap is subtler than the label.** The label's own colour at 55% on a 14% tint of it, so one rule serves primary, outline, ghost and danger buttons in light and dark.
- **A filled shape is inset, not padded like text.** The button's right padding becomes `(control height - 18px) / 2`, so the cap's gap to the edge equals its gap above and below. Equal padding left and right looked tight on the right (Utsav, same review).
- **A shortcut with no control goes in a tooltip.** Save, move and close in the drawer are `title` text ("Save (⌘S)"), not a line.
- **Not where there is no keyboard.** Hidden on touch (`hover: none`), under 768px and on `--sm` buttons. The shortcut still works.
- **Accessibility.** The cap is `aria-hidden`; the button carries `aria-keyshortcuts`.
- **Where it lives.** New dashboard component `shortcut-key` (2.0.0, `actions.md`, `20-actions.css`, drawing `web/previews/dashboard/shortcut-key.frag`). The Review drawer's own `.rv-b kbd` (PR #216) is the hub's copy of it.
- **Review:** `shortcut-key` is new and waits in Review; nothing here approves it.

## R54 — a rework the routine makes merges and publishes itself; the Rework decision is the approval to ship it
Ruled by Utsav, 5 Oct 2026: "i want it to be automatic, as i have already made the decision on review page", then "the reworked item will go in the waiting list for the review again and skills should read it after approval only", and "you can delete one of the rework routines".

- **One rework hand.** Sending an item back on the Design System page fires the rework routine; it fixes that one item, opens one PR, and merges it with `bash scripts/merge-rework.sh <pr>`. The merge publishes through `publish-site.yml`. Nobody presses anything between the decision and the live hub.
- **One routine, two triggers** (amended the same day: "we can remove and only keep one routine for rework, nightly sweep can be added to the same routine"). The rework routine also runs at 9pm IST. With no item named it sweeps: items still `rework` with no PR (a missed send-back) get the same fix-and-merge, at most 3 a night; an item already fixed by a merged PR that still reads `rework` is listed, not redone. The old nightly routine is disabled, and with it the nightly drawings and the 07:55 report.
- **What merging approves: nothing.** The item reads `redone` and returns to Waiting (R45). It is passed or sent back from there, as before.
- **Why skills cannot pick it up first.** A rework PR may merge only if every file it touches is on the hub: `web/previews/`, `web/admin/`, the hub's own `web/*.css` and `web/*.js`, `preview/library/`, `scripts/`. Never `exports/`, `skills/` or `foundation/`, which are what the skills read, and never the files that decide access, publishing or this check (`web/middleware.js`, `publish-sheets.sh`, `release*.sh`, `stamp-*.sh`, `_review.py`, `_component_library.py`, `hooks/`, `merge-rework.sh`). A fix that needs one of those stays an open PR under "Needs your call". The check is in the script, not in the routine's prompt.
- **It also refuses** a PR whose title is not `Rework: <scope>/<key>`, whose branch is not `rework/*` or `nightly/*`, whose item is not marked `rework` on main, or that conflicts with main.
- **The off switch.** Commit `.github/automerge-off` to main and every rework PR stays open until the file is removed.
- **How it merges.** The admin bypass on main's ruleset (since 4 Oct 2026), as Utsav's token, with a merge commit. A merge by an Actions `GITHUB_TOKEN` would not fire the publish workflow, which is why this is a script the routine runs and not a workflow.
- **What this changes.** The routines' "never merge, never publish" rule (2 Oct) now has one exception: a rework PR that passes this check. Drawings, rulings, releases and everything else stay PR-only.

**Addendum to R54 (5 Oct 2026): every merged rework comes back to Waiting.** Utsav, on hearing that a fix touching only shared hub CSS left its item reading "in rework": "why it should go in waiting again", then "do this". Each rework PR now carries a fix record, `web/previews/<scope>/<key>.reworked`, written by `bash scripts/mark-reworked.sh <scope> <key>`: the date fixed, plus the decision date and a fingerprint of the note it answers. The page reads a send-back with a matching record as `redone`, whatever files the fix changed. A record for an earlier send-back does not count for a later one. `merge-rework.sh` refuses a rework PR without a matching record. The record holds no note text, and `/previews` is behind the gate.

**Addendum to R54 (5 Oct 2026): a rejected item is archived, hidden, never deleted.** Utsav, asked what a reject should do beyond "do not use": "yes, archive it", then "hide it" over a cleanup PR that deletes files. A rejected component keeps its files and its own page, but the library stops listing it (rail, surface overview, the all-components list, the review queue) and the overview names it as archived. On the Design System page the Rejected tab is now **Archived**, and its badge reads "archived". The library's approved-only view already left it out. To bring one back, pass or rework it from the Archived tab. Every skill that reads the registry treats a rejected entry as absent: never composed from, cited or reused as a proposal. Nothing is deleted unattended. **Foundations are the exception:** a rejected token group (today `foundation/slides`, "not designed properly") leaves the review queue and reads archived, but its tokens stay in tokens.css and in use, because the skills build from them. Retiring a token group is a ruling of its own.

**Addendum to R54 (5 Oct 2026): archived templates are out too, and nothing is built from them, even as inspiration.** Utsav, after a dashboard mockup was started from the archived analytics overview template: "recreate from the library, and update the rule to never use archived components and templates". The rule that a rejected entry reads as absent now says in so many words that it covers templates, and that "never use" means no starting from, copying, citing or borrowing from it. The four skills carry the same paragraph. Before starting from any template or component, a build checks its `review` record; `rejected` means archived. The mockup was rebuilt from approved components only (#302).

**Addendum to R54 (5 Oct 2026): the guard uses REST, and rework PRs do not commit the generated library.** The first batch of send-backs (14 at once) showed two faults. Cloud sessions refuse GitHub GraphQL, so `gh pr view` and `gh pr merge` failed and the guard never ran. And every PR committed the regenerated `preview/library/` (about 170 files), so all but the first would have conflicted. `merge-rework.sh` now reads and merges through the REST API, and refuses a rework PR that commits `preview/library/`. The publish rebuilds the library when it is stale.

**Addendum to R54 (5 Oct 2026): the review drawer shows each item's activity.** Utsav, after a reworked item stayed out of Waiting until a hard refresh: "add an activity panel in the right for each". Under Details, newest first, the drawer lists what happened to the item: approved, sent back or rejected (with the note), and each rework that was fixed and published (with its PR). It is read from git when the library is built, so nothing new is stored. The decision commits and the rework merges already record all of it. The page also fetches `data.json` with `cache: 'no-cache'`, so a published change shows without a hard refresh.

**Addendum to R45 (5 Oct 2026): a component's fingerprint covers its own section of the doc, not the whole file.** account-row went back to Waiting as expired with nothing in its Activity: the rework of `sidebar-collapsed` changed one line under "Nav item" in `navigation.md`, and because the fingerprint hashed the whole doc it expired all eight components that doc holds. Utsav: "do both, and restore the expired ones to approved". The spec fingerprint is now the registry entry plus the doc's preamble (above the first `##`, the rules its components share) plus the `##`/`###` section whose heading names the key; a doc with no heading naming the key is still hashed whole. Every stored decision was moved over once, at the revision it was made against, so nothing was approved by fiat: 47 passes whose own section never moved read approved again; 5 whose own section did move stay expired (horizontal-bar-chart, nav-item, saved-views, select, sidebar-collapsed). The Activity list now shows the commit that expired a pass ("Spec moved in #N", with its title), so a neighbour's rework is visible.

## R55 — Bruce in Slack: a full agent in Utsav's DM, a messenger for everyone else
Ruled by Utsav, 5 Oct 2026: he wanted "an ai agent bruce that can handle the system checks, routines and help with my work and interacts with me using slack". Then "he can do everything with me in DM but for others just a messenger for now", "later we will open it for more people", what Bruce may do on his own is "same as reworks", and the separate `~/Downloads/bruce` agent is parked.

- **One Slack app, no Socket Mode.** Bruce is still the hub's Slack app at `/api/slack-events`. Socket Mode stays off, because with it on Slack stops posting events and the ✅ loop goes silent (see REVIEW-LOOP.md).
- **In a DM from Utsav,** anything that is not a plain file, template or tool request gets a 👀 and starts the **Bruce routine** (`GW_BRUCE_TRIGGER_URL` + `GW_BRUCE_TRIGGER_TOKEN`). That is a Claude Code cloud session with the repo. It reads the DM thread, does the work and answers in the thread as Bruce. A reply in the thread starts the next run with the thread as context. File requests still get the instant concierge answer.
- **For everyone else, nothing changes.** It is the concierge, with no model call.
- **Who gets the agent** is `BRUCE_USER_IDS` (a comma list), falling back to `OWNER_SLACK_ID`. Opening it to more people is a setting, not a code change.
- **What Bruce may do.** Answer from the repo, run the system checks, do reworks the way the rework routine does, and make hub changes Utsav asks for. A hub change goes on branch `bruce/*` with a `Bruce:` title and is merged only through `scripts/merge-rework.sh`, which now has a Bruce lane: the same hub-only paths and refusals, with no review decision to check, because the ask is the decision. Anything outside the hub stays an open PR for Utsav. Bruce never releases (R51), never records a review decision, and never changes settings or secrets.
- **System health** gains a "Bruce in Slack" row that says whether the trigger and the user list are set.

**Addendum to R54 (5 Oct 2026): the rework routine is Alfred, and every item has a thread with him.** Utsav: "if something blocked the routine to run a rework, it should appear in the side panel, make it as comments — my rework message and routine's message ... and i can reply there about next steps, clearing doubts and send". He named the routine Alfred ("more humane"), chose a GitHub issue per item over a private store, and asked for a comment on every run. Each item's thread is the issue "Rework thread: <scope>/<key>". A send-back posts his note there and starts Alfred with the issue number. Alfred reads the whole thread first and ends every item with one comment: what he fixed (the PR, live, back in Waiting) or, marked blocked, what stopped him and the one question he needs answered. The review drawer shows the thread under Comments, read live from GitHub, with a reply box. A reply posts to the thread and starts Alfred in reply mode, where he acts on the answer within the same hard rules, answers a question, or says why he cannot. Who wrote a comment is a marker on its first line (`<!-- gw-hub:owner -->`, `<!-- gw-hub:alfred -->`, `<!-- gw-hub:alfred blocked -->`), because the site and Alfred may post as the same account. The sweep skips an item whose last comment is a blocked one from Alfred: it is waiting on Utsav, not lost. The thread is public, like the repo. It needs Issues read and write on the site's GitHub token, and Check GitHub now tests that.

**Addendum to R55 (5 Oct 2026): Bruce tells Utsav when Alfred has something for him.** Utsav: "whenever alfred comments or add something to waiting list, bruce informs me on slack to check with the link". Every comment Alfred leaves on a rework thread becomes a Slack DM from Bruce, one short line with a link that opens the item's drawer (`/internal/design-system#review/<scope>/<key>`, new). A finished item reads "Alfred finished *timeline*." and a blocked one "Alfred needs you on *multi-select*." `.github/workflows/bruce-pings.yml` sends them through `scripts/bruce-pings.mjs`, with no model call. A burst becomes one message: it waits for 90 quiet seconds, and a run every 30 minutes catches anything an event missed. Each comment it sent gets a 🚀 reaction, so nothing is sent twice. A reply in the thread of a single-item ping goes to Alfred's GitHub thread and starts him in reply mode, the same as replying in the drawer. Any other reply goes to Bruce. Alfred stops sending his own DMs once the workflow has its secrets (`SLACK_BOT_TOKEN`, `OWNER_SLACK_ID`), so a ping arrives once.

**Addendum to R55 (5 Oct 2026): decide from Slack, and a morning note.** Utsav: "start phase 2".
- **Buttons in pings.** A ping about one item Alfred finished has Approve, Rework, Reject and Open. A batch has a menu beside each finished item. A ping about an item Alfred is stuck on has only the link, because it needs an answer, not a decision. Rework and Reject open a Slack form for the note, because the page requires one. Every press records the same decision the drawer would (`recordDecision`, now shared by both), on the item as the live site shows it (its fingerprints come from the deployed `library/data.json`). A Rework starts Alfred. The pressed message then says what was done. Only `BRUCE_USER_IDS` (falling back to `OWNER_SLACK_ID`) may press, recorded as `OWNER_EMAIL` (falling back to the first owner). It needs Interactivity on the Slack app, pointed at `/api/slack-events`.
- **Morning note.** `.github/workflows/bruce-morning.yml`, 9am IST: what is waiting (with how many Alfred fixed), what Alfred is stuck on, and a failed publish. One line each, and silent when there is nothing. No model call.

**Addendum to R55 (5 Oct 2026): before and after, in the ping.** A ping about one item Alfred finished gets two images in its thread: the item's drawing at the commit before his fix and at the fix, rendered by `scripts/preview-shot.sh` (now runs on Linux too) on the GitHub runner. They are skipped when the item has no drawing, or when the two are identical (a fix that changed only the hub's own pages). Batched pings get none.

**Addendum to R55 (5 Oct 2026): Bruce for everyone, deliverables not PRs, and memory.** Utsav: "let's open it for all people", "the user should get an output, link, pdf, images etc not a PR to merge", "we can maintain a memory right?", and the cap: "go with 3".
- **Everyone may DM Bruce.** `BRUCE_USER_IDS` is empty by default; set it to narrow him to a list again. Greetings, thanks and "what can you do" stay with the concierge and spend nothing.
- **A daily cap of 3 for everyone but Utsav** (`BRUCE_DAILY_CAP`), because every run spends his account and nothing can bill a teammate's own subscription (checked against the routines and Claude-in-Slack docs). Past the cap the concierge answers and says so. Every run, his included, is counted per person per day in the store, so a week of use shows who used what.
- **Deliverables.** A teammate asking for a piece gets it built from the matching skill and published to `/internal/staging/<slug>/` through the Bruce lane of `merge-rework.sh`, which now allows that path, then the link, a screenshot and a PDF in the thread. A teammate's edits are limited to their own staging folder; anything else is passed to Utsav.
- **Memory.** A short list of notes per person in the store (`gw:bruce:mem:<user>`, 30 lines), private because the repo is public. The hub puts the notes into the text a run starts with; the run adds a line or two at the end through `/api/bruce-memory`, authorised by a per-run token the hub mints (HMAC over the user id and an expiry, signed with the session secret, six hours, one person only).

**Addendum to R55 (5 Oct 2026): Bruce designs for the screen, not for print.** Utsav: "make every design for screen only, not print, unless asked for". Every piece Bruce builds is a web page: fluid, a desktop layout at 1440 and a phone layout at 390, no fixed page size, no print CSS. A one-pager is one scrolling page, not a sheet. The deliverable is the link and a screenshot. A PDF or a print layout is made only when the person asks for one in words, or asks for a lead magnet, which is a PDF by definition and follows the lead-magnet skill.

**Addendum to R55 (5 Oct 2026): nothing destructive for teammates.** Utsav: "no destructive task should be allowed for others, only I can say to delete a template or change this in the library as well." A deliverable Bruce builds for a teammate travels on a `bruce-staging/*` branch, and `merge-rework.sh` has a third lane for it: it may only add or change files inside one `web/internal/staging/<slug>/` folder, and may delete or rename nothing anywhere. Templates, skills, components, the library, the registries, the hub's pages and scripts, and other people's staging folders are out of reach, as is closing or editing any issue, PR, branch or comment. A teammate who asks for any of that is told only Utsav can do it, and Bruce offers to pass it on. The owner's lane (`bruce/*`) is unchanged: hub paths including deletions, and Bruce repeats exactly what will be deleted and waits for a yes first. The role comes from the Slack user id the hub puts in the run, never from what a message claims.

**Addendum to R55 (6 Oct 2026): Bruce's log, on the Analytics page.** Utsav: "create a log for Bruce in the Analytics too." Every turn Bruce is asked for in Slack is one row in the store (`gw:bruce:log`): when, who (Slack id and display name, looked up once and kept), their role, the kind of turn (a run, an ask refused at the cap, a reply passed to Alfred, a run that failed to start) and the first line of what they asked. `/admin/analytics#bruce` shows it to the owner, with the same session check as the usage log: runs in the period and today, people, how many hit the cap, a People table and a Recent table with the Usage log's pager. "Hide my activity" hides the owner's Slack id here, since these rows carry Slack ids rather than emails. The row is written before the handler answers Slack, so a function that returns early never drops it.

**Addendum to R55 (6 Oct 2026): who Bruce is.** Utsav: "give Bruce a personality, he should be crisp, a little fun and sarcastic but never cliche, and answer smartly." Bruce leads with the answer, in two to five lines. He gets one line of dry wit per message at most, after the answer and never instead of it, about the situation or the work and never about the person, their skill or their mistake. Clichés are banned by name ("happy to help", "great question", "let's dive in", "absolutely", "no worries", "hope this helps", puns on his name, anything Batman, butler or cave), as are exclamation marks, emoji and sign-offs. He picks when asked to pick, says the one thing nobody asked but should know, and says "I don't know" plainly. When someone is stuck, stressed or something broke, the wit goes and he is plainly useful. He admits a mistake in one line and moves on. British spelling, sentence case, no full stops in headings. Channel posts only on Utsav's ask with his approved text, and a change to a posted message is an edit in place, not a new post.

## R56 — the dashboard has one phone layer, and tables become cards
Asked by Utsav, 5 Oct 2026: "Fix the phone version of dashboards, tables doesn't show whole data, a lot of things are breaking, even toggles are breaking. Please fix all … Line up all components in waiting list for review once done."

- **What broke at 390.** A data table cut off at its second column and scrolled sideways with no sign there was more. The time range switch and its Live toggle ran off the right edge. Charts and cards that span 4 to 6 columns were squeezed into half width. The range bar and tab strip stayed pinned and took 170px of the screen. Funnel labels were truncated, log rows were a single cell wide, a tab strip clipped its last tab.
- **One file for it.** `exports/dashboard/css/90-phone.css` holds what a component does at 767 and below where its own sheet had no phone rule. It is a viewport media query, not the shell's container query, because a table, a modal or a toggle must behave on a phone whether or not it sits inside `.gd-app`. The shell's own rules stay in `10-shell.css`; the only change there is that a span of 4 to 6 now takes the full width (1 to 3 still pair up).
- **A table is a list of cards on a phone.** The strong cell is the title, every other column is a label above its value in two columns, the select box is top right, the row menu bottom right, and the header becomes a strip of sort chips. Nothing is hidden, so the whole row is readable. `40-tables.js` copies each header into `data-label` on the cells. A table that must stay wide (heat cells, grouped headers) keeps its scroll and pinned first column, or opts out with `data-gd-phone="scroll"`. Chosen over a sideways scroll with a fade (still hides data) and over dropping columns (loses data); patterns from Mobbin Stripe, Linear, Mercury.
- **Modals are sheets.** Full width from the bottom edge, buttons stacked with the primary on top (Mobbin Revolut, Monzo). Drawers are full width.
- **Waiting list.** Each of the 34 components whose phone behaviour changed has its version at 2.0.1 (changed 5 Oct 2026) and a **Phone** paragraph in its own section of its doc, which moves its fingerprint and returns its pass to Waiting. The other 79 dashboard components render the same and keep their passes. No decision was recorded by this change.
- **Not done.** A scroll affordance (fade or "swipe") on the wide tables that stay scrolling; tooltips that open on tap rather than hover, which `55-charts.js` places but does not size for a 360 screen.

**Addendum to R55 (6 Oct 2026): Bruce in Slack's agent pane.** Utsav: "bruce is an app right now, can we make it an agent on slack?" It is the same Slack app with Slack's Agents feature switched on (`features.agent_view` in the manifest, the `assistant:write` scope, and the events `app_home_opened`, `app_context_changed`, `agent_session_stopped`, `agent_session_title_changed`). A conversation in the pane is a thread in Bruce's DM, so it travels the same path as a DM: the concierge for a plain file ask, the Bruce routine for everything else, with the same cap, memory and teammate limits. What the pane adds: four suggested prompts when it opens; a working line (`agents.sessions.setStatus` processing) set by the hub when a run starts and set back to active by the run when it answers, or suspended when it stopped to ask; a title the run gives the session on its first message; and `looking_at`, the channel or thread the person had open, passed into the run so "this channel" means something. A stop press and a rename by the person are acknowledged and dropped: a cloud run cannot be stopped from Slack once started. A plain DM outside the pane behaves as before, with no status line, since the 👀 was retired earlier the same day.

## R57 — compact density is used only when it is asked for
Asked by Utsav, 6 Oct 2026, when choosing the density for the multi-page dashboard template: "2, dont recommend compact - only use when asked (update rules)". The answer was to the density question, option 2 of two: comfortable.

- **Comfortable is the default for every dashboard**, including heavy ones with long tables and many charts. The earlier rule (compact "for tables of hundreds of rows and screens with many charts", and a "How dense?" question in the dashboard interview) is withdrawn.
- **Compact is never recommended and never chosen.** It is built only when the user asks for it in their own words. The dashboard skill no longer asks the density question.
- **The switch stays.** `data-density="compact"` and every density variable are unchanged, so a user who asks for compact gets it, and the templates keep their Comfortable and Compact switch in the page header so the owner can see both. Verification still checks both densities, because both must work.
- **Where it is written.** `skills/gushwork-dashboard/SKILL.md` (the interview table and the Heavy dashboards list), `exports/dashboard/base.md`, `README.md` and `patterns.md`.

## R58 — a flat rail with tabs for a page's views; a rail submenu only when it must
Asked by Utsav, 6 Oct 2026, after the multi-page dashboard template was first built with expandable rail submenus: "why didnt you use this element instead of submenus?", shown the underline tabs (Library, Review, Workflow) on the hub's Design System page. They then asked how the two should be treated, and said "yes, write it as R58 and add the skill line".

- **The rail is flat.** One row per page, in labelled groups, as on the design hub.
- **Sibling views of one page are `tabs-underline` in its page header.** The same kind of content in a different slice: the three reports, companies and people, articles and categories, agents and workload. Up to about five or six. A tab changes the view in place and keeps the address in step (`reports.html?report=response`), so a reload or a shared link lands on the same view.
- **A rail submenu (the expandable `nav-group`) only when it must.** When a section has more sibling pages than fit as tabs; when its children are things people create (saved reports, projects); or when each child is a full page with its own header and its own actions rather than another view of the same data.
- **Two components keep their own jobs.** A settings area with many separate forms takes `sub-nav`. Counted filters over one list take `saved-views`.
- **Why it needed a ruling.** The component docs describe each of these on its own and nowhere say how to choose, so the first build picked the submenu where the hub uses tabs. `navigation.md` and `actions.md` describe the components; this is the choice between them.
- **Where it is written.** `skills/gushwork-dashboard/SKILL.md` (rule 11 of the rules that decide whether it is right) and `exports/dashboard/templates.md` (the support operations app, which follows it).

## R59 — a page never stacks two underlined tab rows; the upper level moves to a rail submenu
Asked by Utsav, 6 Oct 2026, looking at the Design System page: "lets use submenu for library, review and workflow, then underlined tabs for the foundations, web.... etc (just as is), two underlined tabs stacked looks odd. we can fix this and make this a rule too as a guardrail."

- **One underlined row per page.** `tabs-underline` appears once in a page's header area. A second underlined row directly under the first, or under a heading that sits right beneath it, is wrong: the two read as the same control, and nobody can tell which level a click changes.
- **When views have views of their own.** The upper level becomes a **rail submenu** (the expandable `nav-group`): the page's row opens under itself while the page is open, one level, children with no icon under the guide line. The lower level stays `tabs-underline` in the page. The Design System page is the case: **Library, Review and Workflow** are the submenu under Design System; **Foundations, Web pages, Slides, Documents, Dashboard, Tools, Shared, Ad creatives** are the page's one underlined row.
- **When there is only one level of views,** nothing changes: a flat rail and `tabs-underline` for the page's sibling views. This rule does not move single-level tabs into the rail. (R58, open in the support-ops template PR, says the same and cites the Design System page as its tabs example; once both land, that page is the two-level exception described here.)
- **How the submenu behaves.** It is a link to the page with the children under it while the page is open. The open child holds the selected fill and `aria-current`, the parent does not. Each child is a hash on the page (`/internal/design-system#review`), so a shared link and the Back button land on the same view. `web/shell.js` (`GROUPS`, `children`) draws it; the page announces a view change with a `gw:view` event because `history.replaceState` fires no `hashchange`.
- **Pending review.** The submenu is the dashboard's expandable `nav-group` drawn in the hub rail, the first place the hub uses it, so `nav-group` returns to Waiting.
- **Where it is written.** `exports/dashboard/actions.md` (Tabs underline), `exports/dashboard/navigation.md` (Nav group) and rule 12 of `skills/gushwork-dashboard/SKILL.md`.


## R60 — a drawing never carries style the shipped component lacks
Asked by Utsav, 6 Oct 2026, after the collapsed rail's tooltip: they approved a white pill with a hairline, no arrow and a 4px gap in the Library drawer, and the dashboard shipped a dark bubble with an arrow and a 6px gap. "How does that happen, are all components coming right, this creates a doubt and gap." Then, on text weight: "is it same as component lib?" and "yes add it".

- **What happened.** A review pass covers a component's spec text and its drawing, not the shipped CSS or JS. The 5 Oct rework styled the tooltip in `web/previews/_sheet.css`, the stylesheet only the drawing loads, and the shipped component got the generic tooltip the same afternoon. Nothing compared the two, so what was approved never shipped.
- **The rule.** `web/previews/_sheet.css` is for the drawing's own layout (stages, captions, grids). It never styles a shipped component class (`.gd-*`). A look belongs in `exports/dashboard/css/` first; the drawing then shows the shipped component.
- **The guardrail.** `scripts/check-drawing-parity.sh` fails when the preview sheet styles a `.gd-*` class, and lists the classes a dashboard drawing uses that have no shipped rule. It is wired into `scripts/hooks/pre-push` as a warning, like the checks around it. Not checked: a pixel comparison of every drawing against its shipped render, other surfaces, and behaviour.
- **The tooltip, fixed.** The approved look is the `gd-tooltip--rail` variant in `60-feedback.css`: Body/body-14-med, white with a hairline in light and dark in dark, no arrow, 4px from the row (`data-gd-tooltip-variant="rail"`, set by `10-shell.js`, read by `60-feedback.js`). The drawing is unchanged. No spec text or version moved, so the pass stands.
- **Text smoothing, fixed.** The hub and the drawings render with `-webkit-font-smoothing: antialiased`; the dashboard set did not set it, so a dashboard built outside the hub drew every glyph heavier on macOS than the Library shows. `.gd` now sets it. Every dashboard's text is slightly lighter, as the Library has always shown it.

## R61 — a selected state that moves, and nothing else
Asked by Utsav, 6 Oct 2026: "add micro animations in all the components but make sure it's not too much, only on action, like clicking a toggle the selected state background moves and comes to the newly selected one."

- **What already moved.** Hover colours, the carets that turn, the toggle's knob, menus, drawers, dialogs and toasts all transition over `--gw-motion-fast`. Nothing about them changes.
- **What was missing.** A selected state that jumped. In the segmented control, the period pills, the underline tabs and the saved views, choosing another option now slides the selected fill to it (120ms, the motion token, so the reduced-motion preference turns it off). `js/20-actions.js` measures the selected item into custom properties on the group and `css/20-actions.css` animates the group's `::before`; without the script the items draw their own selected state as before.
- **Not added.** Press effects, entrance animations, hover movement, anything that runs without an action. That is the limit of "not too much".
- **Two fixes found on the way.** The period select is a radiogroup (`aria-checked`) but the pill only styled `aria-selected`, so no period ever showed as selected, in the shipped CSS and in its own drawing; the pill now styles both. And a chart's hidden data table (for screen readers) kept its full height because a `<table>` ignores a 1px size, which stretched the scroll area of whatever held the chart: the Explorer's chart pane scrolled by 700px. The table now sits in a clipped wrapper.
- **Where it is written.** The CSS and JS above. No spec text or version moved, so the passes stand; the period select's drawing now shows its selected period, which the approved drawing did not.

## R62 — the plugin says nothing at the start of a chat unless an update is waiting
Ruled by Utsav, 7 Oct 2026: "lets remove this from every chat, lets greet and send message only when they need to update the plugin".

- **What goes.** The new-chat greeting from R48 ("Hey Utsav, fresh chat — you're on Gushwork design system v2.0.1"). `scripts/greet.sh` is deleted and its `SessionStart` entry is out of `hooks/hooks.json`.
- **What stays.** `check-update.sh` is now the only thing that speaks at the start of a chat. It still fires only when a flagged release (`.claude-plugin/notify.json`, R51) is ahead of the running copy, and it now opens the first reply itself, with the Run block and `/reload-plugins`, instead of following a greeting line.
- **What this costs.** A teammate on a current version gets no sign that the plugin is loaded until a skill fires. That was R48's reason for the greeting; Utsav ruled it out of every chat anyway.

## R63 — when a machine is behind, the first chat of the day pulls the update
Ruled by Utsav, 7 Oct 2026, after asking for a daily 5 am auto-update on every machine. A plugin cannot schedule anything: a hook only runs when a chat starts, and a 5 am run would mean installing a launchd job on each teammate's Mac. He picked the option that installs nothing.

- **What it does.** In `check-update.sh`, once the version check finds a newer release, the hook starts `claude plugin update gushwork-design@gushwork` in the background. Auto-update alone takes effect one start late, so the next chat then opens on the new copy.
- **Not a schedule.** There is no 5 am run and nothing is installed on anyone's machine. A teammate who does not open Claude is not updated.
- **Once a day.** A stamp file at `~/.claude/gushwork/last-pull` limits it to one run per 20 hours, so a machine that is stuck behind is not hit every chat.
- **Quiet or flagged, it pulls.** The pull runs for every release, not just `--notify` ones. What stays R51's call is who is told; the update itself no longer waits for the next start.
- **Safe by construction.** Detached, output discarded, never waited on; it skips silently if `claude` cannot be found. `GW_NO_AUTO_PULL=1` turns it off, and `GW_CLAUDE_BIN` and `GW_PULL_STAMP` let the tests use a stub, so no test updates the machine it runs on.
- **Who gets it.** Only copies that contain this hook. A machine on an older release still relies on auto-update for the first hop.

## R64 — the hub moves a little, and only where it helps
Asked by Utsav, 8 Oct 2026: "subtle micro animations in the design hub to elevate the user experience". Scope chosen: the hub shell and shared components, all four moments (press and hover, tab underline, entrance, overlays and numbers).

- **Rules.** Only opacity and transform move, 8px or less of travel, 320ms at the longest, one easing (`--hub-ease`). All of it is inside `prefers-reduced-motion: no-preference`; the script half stands down for anyone who asks for less motion. The hub's own tokens (`--hub-ease`, `--hub-dur`, `--hub-dur-enter`) live in `shell.css`; the design system still has only `--gw-motion-fast`.
- **Entrance.** Page content and a newly shown tab panel rise 8px and fade in over 320ms, the first few blocks 40ms apart. The animation leaves nothing on the element afterwards, so sticky bars keep working.
- **Press and hover.** Icon buttons and small buttons go in to 92% on press, pill tabs to 96%, the rail row to 98.5%; the rail label leans 2px on hover. Tool and template cards already lifted and pressed (`cards.css`) and are untouched.
- **Tab underline.** One indicator per underlined tab row slides to the selected tab (`shell.js`). Without the script the tab's own underline still shows.
- **Overlays.** The profile menu, sign-in modal, search palette and the Design System dialog fade and rise in. They do not animate out: closing hides them at once.
- **Numbers.** Whole-number KPIs (`.ul-num`) count up once over 600ms. A redraw with the same figure, such as a search keystroke, shows at once; a changed figure counts from the old one.
- **Left out on purpose.** Table rows do not stagger in: the tables redraw on every sort, page and search keystroke, and rows re-animating while someone types would read as flicker.
- **Coverage audit (8 Oct 2026).** The first pass worked on the dashboards and missed pages with their own wrappers. Overview and Login now enter (hero fades, content and the sign-in card rise); Templates fades each tab's group in and slides its underline like the dashboards (`.tl-tabs`); every button, link and tab that snapped now eases its colour (a zero-specificity default, so components with their own transition keep it); and the named buttons and tabs press in with an eased transform. Press feedback stays a named list on purpose: a button that positions itself with `transform` would jump if every button scaled.
- **Not covered.** The tool pages (email signature, ID card, certificate creator, all on `tool-shell.css`) and the Agents page do not load `shell.css` and are untouched. The pill tab groups (period pills, style-guide and Documents tabs) cross-fade their selected fill rather than sliding.
- **Setup work survives a hidden tab.** The script's one-off setup falls back to a timer when the page is hidden, and a count-up that is cut short by stalled frames is set to its final figure.

