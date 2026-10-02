# `↳ web/ component-library` — the measured inventory

Figma page `112:414`. **Read 7 Aug 2026.** This page had never been read before: whole-page
metadata calls were failing, and the working assumption was that a second navbar and a second
button set lived here. Neither is true — see *What this resolves* below.

**23 component sets · 525 variants**, in 11 groups.

## The sets

| Group | Set | Node | Variants |
|---|---|---|---|
| `button` | **`Button`** | `1457:668` | **220** |
| `badge` | `badge` | `1582:628` | **108** |
| `image` | `image` | `1815:8655` | **46** |
| `inline-input` | `input/inline-input` | `1584:1579` | 24 |
| `ai-agents` | `agent-icon` | `1606:581` | 20 |
| `card` | `Card / Information` | `1647:734` | 14 |
| `input-fields` | `input/text-field` | `1562:705` | 14 |
| `input-fields` | `input/phone-field` | `1562:5506` | 14 |
| `clients` | `client/avatar` | `1619:722` | 12 |
| `tooltip` | `tooltip` | `1554:348` | 9 |
| `eyebrow` | `eyebrow` | `1516:410` | 6 |
| `card` | `Card / Testimonial` | `1647:720` | 5 |
| `input-fields` | `input/ dropdown-options` | `1490:3488` | 5 |
| `card` | `Card / Pricing` | `1647:743` | 4 |
| `input-fields` | `input/dropdown` | `1562:5769` | 4 |
| `card` | `Card / Announcement` | `1647:738` | 3 |
| `input-fields` | `input/card` | `1562:5807` | 3 |
| `input-fields` | `input/checkbox` | `1977:4776` | 3 |
| `input-fields` | **`Frame 2147259995`** | `1553:3350` | 3 |
| `card` | `Card / Review` | `1647:726` | 2 |
| `card` | `Card / Case Study and Blog` | `1647:746` | 2 |
| `card` | `Card / Other` | `1647:723` | 2 |
| `input-fields` | **`Frame 2147259996`** | `1553:3351` | 2 |

## What this resolves

**Utsav's ruling of 6 Aug — "there is no second component library" — is now confirmed by
measurement**, where before it rested on his say-so against the README's standing hypothesis that
a second navbar and button set would explain the conflicts.

Counted off the page: exactly one `Button` (`1457:668`, the 220-variant set already documented),
and **no navbar at all** — navbar and footer live on `↳ web/ pattern-library`.

So the conflicts between the measured exports and the Master Specification are **real
disagreements, not two components mistaken for one.** The exports follow the measured node, which
is what renders. The README's "the likeliest explanation is a second set" note is wrong and
should be struck.

**`image` has 46 variants.** The docs variously claim 47, then 46, and their tables sum to 45.
**46 is correct** — counted off the set.

**`agent-icon` has 20 variants**, consistent with 10 agents × `add emphasis [false, true]`.

## Newly surfaced — not in any earlier inventory

- **`badge` carries 108 variants.** Its rule documents six colours. 108 is a much larger matrix
  than anything written down, and it is the component both surfaces share. Needs its own pass.
- **`Card / Announcement` (`1647:738`)** and **`Card / Other` (`1647:723`)** complete the seven
  card sets; earlier notes named only five by name.
- **`input/card` (`1562:5807`)**, 3 variants — an input type absent from the input-fields rule.
- **Two unnamed component sets inside `input-fields`** — `Frame 2147259995` (`1553:3350`, 3
  variants) and `Frame 2147259996` (`1553:3351`, 2 variants). Figma auto-names shipped as real
  sets. They are the icon sets whose sibling frames both read `Label: Processing`.

## Page hygiene, confirmed

**21 stray hidden `Frame 2147223955` nodes** sit at the page root, each 149 × 40, ahead of the 11
real groups. They are the "21 component sets" figure that earlier inventories reported — the
count was right, the interpretation was not. They are empty leftovers, not components.

---

# Measured sets

## `badge` — `1582:628` · 108 variants, measured

**Four axes, and the matrix is complete** — 2 × 6 × 3 × 3 = 108, no missing combinations.

| Axis | Values |
|---|---|
| `Theme` | `Light` · `Dark` |
| `Color` | `Neutral` · `Red` · `Green` · `Yellow` · `Blue` · `Black` |
| `Icon` | `no` · `leading` · `trailing` |
| `Size` | `Small` · `Medium` · `Large` |

### Measured geometry

| `Size` | Height | Width, no icon | Width, with icon |
|---|---|---|---|
| `Small` | **24** | 47 | 61 |
| `Medium` | **33** | 49 | 65 |
| `Large` | **45** | 63 | 81 |

`Radius/8` and `Spacing/8` throughout. `leading` and `trailing` produce the same width — the icon
swaps sides, it does not change the box.

### Type scales with size

`body-12-med` → `body-14-sem` → `body-18-sem`. Note the **weight changes too**, Medium at Small
and Semi Bold above it; it is not one style at three sizes.

### Colour is theme-paired, fill and text from different steps

| | Fill | Text |
|---|---|---|
| **Light** | `{Color}/Alpha/10` | `{Color}/500` |
| **Dark** | `{Color}/Alpha/20` | `{Color}/300` |

Bound values: `Red/500` `#e11d48` · `Green/500` `#16a34a` · `Yellow/500` `#d97706` ·
`Primary/500-main` `#0070ff`; dark text uses `Red/300` `#fb7185` · `Green/300` `#4ade80` ·
`Yellow/300` `#fbbf24` · `Primary/200` `#99c6ff`. Neutral uses `Neutral/100`, `Neutral/300`,
`Neutral/600` and `Neutral/Alpha/20-white`; Black uses `Neutral/black` `#0d0d0d`.

### Three findings

1. **The rule says badge has six colours and calls the default "Grey".** Six colours is right;
   the value is `Neutral`, and **`Blue` and `Black` are both real and both undocumented.**
2. **`Colors/Green/Alpha/20` is not bound** where `Red/Alpha/20` and `Yellow/Alpha/20` are — so
   dark-theme Green appears to reach for a different fill than its siblings. Worth a look.
3. **`_Helper/Purple` `#8427DE` is bound inside this set.** A scaffolding variable from the
   helper collection, shipping in the component both surfaces share. It is not in `tokens.css`
   and should not be — reported, not adopted.

## `Button` — `1457:668` · 220 variants, measured

Four axes. **Six styles carry the full 3 × 3 × 4 matrix (36 each = 216); the two `Special/*`
styles carry 2 each.** 216 + 4 = 220, exactly.

| Axis | Values |
|---|---|
| `Style` | `Blue` · `Black` · `Outlined/ black` · `Outlined / white` · `Text/ black` · `White` · `Special/ With People` · `Special/ Glowing` |
| `State` | `Active` · `Hover` · `Disabled` |
| `Size` | `Small` · `Medium` · `Large` |
| `Icon Placement` | `None` · `Leading` · `Trailing` · `Icon Only` |

Copy the keys exactly. `Outlined/ black` has the space **after** the slash; `Outlined / white`
has one on **both** sides. They are not typos to normalise.

### Measured geometry — identical across all six full styles

| `Size` | Height | `None` | `Leading` / `Trailing` | `Icon Only` |
|---|---|---|---|---|
| `Small` | **36** | 99 | 123 | 36 |
| `Medium` | **44** | 126 | 151 | 44 |
| `Large` | **56** | 144 | 166 | **58** |

**`Large` + `Icon Only` is 58 × 58, not 56 × 56.** Every other `Icon Only` is a square matching
its row height. Large is 2px larger in both directions. Measured on all six styles, so it is
consistent — but it is the one break in an otherwise perfectly regular table. Build it as 58 and
report it.

`Leading` and `Trailing` are the same width — the icon swaps sides without changing the box.

### The two `Special/*` styles are barely built

| Style | Variants | Width |
|---|---|---|
| `Special/ With People` | 2 — `Active`, `Hover` | 250 |
| `Special/ Glowing` | 2 — `Active`, `Hover` | 182 |

Both exist **only** at `Size=Large, Icon Placement=Trailing`, and **neither has a `Disabled`
state.** The rule tells you to use Special buttons "usually in forms" and "Medium in all folds" —
the component cannot satisfy either instruction. Asking for `Special/ Glowing` at Medium, or at
Small, or disabled, resolves to nothing.

### Bound tokens

Type is `button-14-med` / `button-16-med` / `button-18-med` — one per size, all `lineHeight: 1`.
Fills and borders come from `Primary/500-main` and `Primary/600` (hover), `Neutral/black`,
`Neutral/850` `#2e3338`, `Neutral/35` `#f5f5f5`, `Neutral/50`, `100`, `200`, `250`, `300`,
`Alpha/10-black`, `Alpha/10-white`, `Alpha/50-white`, `White`. Elevation is `Shadows/S2` and
`Shadows/S3`. Spacing is `Spacing/8`.

**No `Radius/*` variable is bound anywhere in the set** — the 8px and 12px corners are raw values
on the shapes. A radius change in the variables would not reach the most-used component in the
system. Reported, not corrected.

`Text/ black` is fully built at 36 variants and is **documented nowhere** in the rules.

---

# Rules of Usage — all ten groups

Transcribed from each group's Info Frame. **Where a rule and the component disagree, the
component wins** and the disagreement is called out.

## `button` — `1972:4146`

- **`Blue` and `Black` are the primary CTAs.** Brand pages → `Black` primary. Ad pages → `Blue`
  primary. `Outlined/ black` is secondary throughout.
- **On a blue background** → `White` primary, `Outlined / white` secondary.
  **On a black background** → `Blue` primary.
- **`Medium` in all folds.** `Large` only when asked. `Small` in navbars and per design direction.
- Special buttons only when asked; `Special/ Glowing` "usually in forms or to add emphasis".
- **Phone: buttons go full-width.** A primary + secondary pair **stacks vertically, primary on
  top, 12px gap.**

**Two conflicts.** The rule says *"The primary button should always say 'Book a call'"* —
`foundation/voice.md` rules **`Book a Demo`**, and the card rule below claims "Book a demo, same
as the system-wide button rule", which is provably false. And the Special instructions cannot be
followed: both Special styles exist **only** at `Large` + `Trailing`, so "Medium in all folds"
and any disabled state are unbuildable. `Text/ black` — 36 built variants — is not mentioned at
all.

## `badge` — `1979:10774`

- **Where:** tables, cards, compact surfaces.
- **Colour encodes meaning:** Red = bad/error · Green = good/success · Yellow = warning/in-between
  · Black = neutral at higher emphasis than grey.
- **Surface treatment:** each colour has light and dark modifications — match the surface.
- **Icons:** leading clarifies the label; **trailing shows the signal** — up-arrow on green,
  down-arrow on red. On grey/blue/black the arrow can point either way.

**Two conflicts.** The rule calls the default **"Grey"**; the variant value is **`Neutral`** and
"Grey" appears nowhere. And the rule lists five colours — **`Blue` is a real, built colour and is
undocumented.**

## `input-fields` — `1972:4771`

- **Required by default.** Append `" (Optional)"` to the label when it isn't. Never mark required.
- **Pick by input type:** single-line text → `input/text-field` · phone → `input/phone-field` ·
  single-select few options → `input/card` · single-select long list or tight space →
  `input/dropdown` · multi-select → `input/checkbox`.
- **Never hand-roll a radio button** — single-select is only ever a Card or a Dropdown.
- **States:** Default (no message) · **Error, red, blocks submission** — *"Oops! That does not
  look right. Do you wanna try again?"* · **Warning, yellow, does not block** — *"Heads up! Please
  double-check this field."* · Success (green check, no message) · Loading (spinner).
- **Label behaviour:** at rest the label sits **inside** the field; on focus or fill it shrinks
  and floats to the top and the placeholder appears **below** it. The placeholder never replaces
  the label. Placeholder is a lowercase example of the value — `name@company.com`.

**Two conflicts.** The rule's dropdown names — Plain / Suggested / Recent / Type-and-add / With
descriptions — match **none** of the actual values (`Basic`, `With Recent/ Suggestions`,
`With Add Other Item`, `With Description`). And "Success (green check)" is the value `Verified`.

## `card` — `2003:10795`

- **Pick by what it holds:** `testimonial` (our own captured proof — video, or quote with photo
  and signature) · `review` (**third-party**, Trustpilot or G2) · `information` (the default for
  arbitrary content) · `announcement` (product update — chips + title + body) · `pricing`
  (name + impact tag + price + features + CTA) · `case-study-and-blog` (image + category +
  headline) · `other` (blank editable).
- **testimonial vs review is decided by source**, not by looks.
- **Compose, don't rebuild** — cards instance eyebrows, the CTA button and client avatars. Don't
  restyle them inside the card.
- **Phone:** multi-column grids collapse to one column; side-by-side internals stack.

**Conflict.** *"'Book a demo,' sentence case — same as the system-wide button rule"* — the button
rule says "Book a call". The cross-reference is false. Also, `Card / Case Study and Blog` has no
`Device` property, so "breakpoints are built-in properties" is not true of all seven.

## `inline-input` — `1979:4803`

- **Only when a single input moves the user forward** — one field, one CTA, one step. Anything
  longer is a full form.
- **Labels ask a question** — *"What's your work email?"* — where standard input-field labels stay
  noun-style (*"Work email"*). This is the distinguishing copy rule.
- **CTA colour:** Black by default; **Blue when the inline-input sits on a black background.**
- States are inherited from the input fields — don't redefine them.
- **Phone:** field on top, CTA full-width below, 12px gap.

## `eyebrow` — `1979:10736`

- **Types:** `Default` (used widely) and `Trustpilot` (the rating variant, for social proof).
- **Colour:** Black is the default, use widely. **Blue only when asked.** The black/blue rule does
  not apply to Trustpilot, which keeps its own rating style.
- Leading icon is optional on Default eyebrows.
- **Clickable is a toggle.** When on, an arrow-with-background appears at the end. Trustpilot is
  non-clickable by default. **Where a clickable eyebrow links to is subjective — ask for the
  destination rather than assuming one.**

## `ai-agents` — `1994:10783`

- **Where:** in cards, or wherever an agent needs visual representation.
- **Fixed set, snake_case:** `research` `refresh` `authority` `paid_boost` `strategy` `content`
  `follow_up` `memory` `design_&_development`.
- **Construction:** each icon is a **4 × 4 grid of rounded-corner squares**. Don't hand-draw new
  patterns, and **don't swap an agent's glyph** — each pattern is fixed.
- **Emphasis:** Default (lighter blue) is resting; Emphasis (brighter blue) is hover, or a static
  spotlight.

**Conflict.** The rule names nine agents, but the set has **20 variants** — nine agents × two
emphasis states is 18. The extra pair is almost certainly the undocumented `other`.

## `clients` — `2003:10788`

- **Where:** testimonial cards and folds, author bylines, case-study credits.
- **The shape is the rule** — a **squircle**, not a circle. Use it for every client and author
  avatar so the treatment stays uniform.
- **Sizes:** small for inline bylines, large for spotlight testimonials.
- Ships real clients built in — Fraxtional, Source Equipment, Midwest Power Products. **Use
  `other` for anyone not in the set** — it is an editable slot.
- **No photo → the plain grey squircle placeholder.**

## `tooltip` — `1979:10758`

- **Colour by contrast with the background:** Neutral (light pill) on dark, Dark pill on light,
  Blue to draw attention.
- Leading icon toggles on/off and can be swapped; default is the info icon.
- **Arrow position has no default** — pick by placement so the box never clips. A tooltip near the
  left edge uses `Left`.

**Conflict.** The rule calls the property *"Arrow position"*; it is **`Position`**.

## `image` — `2066:15571` and `2065:15565`

- **Pick the category first:** `image` (product/feature screenshots — small cards ~407×214 for
  agent features, wide panels ~610×345 for dashboards) · `solution-image` and `problem-image`
  (larger illustration **pairs** for hero and comparison folds) · `+ Create New` (a slot for a
  custom illustration).
- **Match the closest keyword** — a keyword-ranking fold takes `image/keyword-ranking`. Match
  against the component's list rather than inventing names.
- **Pair problem and solution visuals** — they mirror each other.
- **Sizes are not uniform. The parent layout must handle flexible sizing** — never force a fixed
  aspect ratio.
- **Variant names are the keys. Renaming one breaks it.**

**Three conflicts, all now settled.** The structure blob says `variant` has *"47 total options"*
then lists *"All Variants (46 total)"* — in the same blob. **46 is correct.**

**The typos are in the blob, not in the components — and this file said otherwise.** It reported
`image/startegy-and-pages` and `image/product-&-serivce-cards` as variant *keys*, read out of the
structure doc. `exports/web/images.md` checked the canvas: **the real keys are spelled
correctly**, `image/strategy-and-pages` and `image/product-&-service-cards`. The doc is wrong and
also sets the typo'd form as the property default.

**RULED — build the correct spellings.** `DECISIONS.md` → **R8**. The `[decide before handoff]`
bracket asks whether to rename keys or keep them; there is nothing to rename. Correcting the blob
is a maintainer task with nothing bound to it.

**Where two of our own files disagree, the one that measured the canvas wins.** Same rule as
set-over-instance — a structure blob is documentation, not the component.

## Where there are no rules at all

`info-note` (`2009:10824`) carries no Rules of Usage blob, and neither do the two unnamed sets
inside `input-fields`. `Card / Announcement` and `Card / Other` are named in the card rule but
have no individual guidance.

## Still unmeasured here

`badge` and `Button` are measured — 328 of the 525 variants — and **all ten groups now have their
usage rules transcribed.** What remains is appearance for the other 21 sets: `image` (46, though
its full variant list and sizes are captured above), `input/inline-input` (24), `agent-icon` (20),
and the rest.
