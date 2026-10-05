# Web atoms

Figma: `↳ web/ component-library` (`112:414`).

The smallest tier of the web ladder. Atoms compose into fold-elements, which compose into
Folds, which stack into Page Build. Never place an atom directly on a page — put it inside
a fold-element or a Fold.

Covered elsewhere: **Button** → `button.md` · **client/avatar** → `avatar.md` ·
**Cards** → `cards.md` · **image** → `images.md` · **Badge** and **Logo** →
`foundation/shared-components.md`.

---

## `eyebrow`

Group `1530:2190` · set `1516:410` · **6 variants** (2 × 2 × 2), complete.

| Property | Values |
|---|---|
| `Type` | `Default`, `Trustpilot` |
| `Color` | `Default`, `Blue` |
| `State` | `Default`, `Hover` |

A small pill label that sits above a heading.

**`Type`:**
- `Default` — the standard eyebrow. e.g. "What's happening?", "Referred by Jacob". Used
  widely.
- `Trustpilot` — the rating variant. e.g. "Rated 4.5 on Trustpilot". For social-proof and
  rating callouts.

**`Color`** (Default type only):
- `Default` (black) — **the default.** Use widely.
- `Blue` — **only when asked.**

### Appearance — from design context (`1516:410`)

**There are five props, not three.** The variant matrix is `Type` × `Color` × `State`, plus
two booleans the annotation never mentions:

| Prop | Type | Default |
|---|---|---|
| `icon` | BOOLEAN | **`true`** — the leading glyph is on by default |
| `clickable` | BOOLEAN | `false` — adds a trailing caret chip |

| Part | `Color=Default` | `Color=Blue` |
|---|---|---|
| pill | `--gw-color-white` | **`--gw-color-primary-25`** |
| stroke | `--gw-color-neutral-100` at **0.5px** | **none** |
| label | `--gw-text-body-12-med` · **`--gw-color-neutral-900`** | `--gw-text-body-12-med` · `--gw-color-primary-500` |
| leading icon | **`SealQuestion`** (`112:648`) | **`Handshake`** (`112:3301`) |

Shared: height **24 fixed**, `--gw-radius-full` (100px), `padding: 4px 8px`, gap
`--gw-space-4`. **Icons are 14×14** — not the 12 or 16 the master spec claims.

`State=Hover` widens the gap from `--gw-space-4` to `--gw-space-8`. Nothing else changes.

**`clickable=true`** appends a chip: `padding: --gw-space-4`, **`--gw-radius-60`**, holding
`CaretRight` (`112:4326`) at **10px**. Chip fill is `--gw-color-neutral-50` at rest and
`--gw-color-neutral-900` on hover.

**`Type=Trustpilot`** is a different composition: white pill, 0.5px stroke, asymmetric
`padding: 4px 4px 4px 8px`, label `Rated 4.5 on` + the Trustpilot mark (14.848 × 14) +
the word `Trustpilot`, and the caret chip is always present.

All three glyphs are in the library: `assets/icons/regular/seal-question.svg`,
`handshake.svg`, `caret-right.svg`.

### Corrections this measurement forced

1. **The eyebrow has a real leading icon, on by default.** Earlier passes rendered a plain
   CSS circle. It is `SealQuestion` on Default and `Handshake` on Blue.
2. **`Color=Default` labels are `neutral-900`, not `neutral-700`.** The master spec says
   `#535A61`; the component says `#262a2e`. The spec is wrong.
3. **The Blue pill is `primary-25`, not `primary-50`** — and it carries **no stroke**, unlike
   Default.
4. **Icons are 14px.** Not a token step, and not what the spec says.
5. **Two boolean props exist** — `icon` and `clickable` — neither of which was documented.
6. The 0.5px stroke is what makes the white pill read on a white fold, not a shadow. An
   even earlier pass guessed `--gw-shadow-s2`; also wrong.

**There is no on-blue or on-black eyebrow.** All 6 variants are `Type` × `Color` × `State`.
For a label on a full-bleed coloured fold, report the gap; don't improvise a
translucent-white pill.

The Trustpilot type keeps its own rating style; the black/blue rule does not apply to it.

**Leading icon** is optional on default eyebrows — turn it on or off as the design needs.

**Clickable:** the `Default` type can be made clickable (toggle). When on, an
arrow-with-background appears at the end. `Trustpilot` is non-clickable by default; add
the clickable appearance only when asked.

**Where a clickable eyebrow links is subjective — ask for the destination.** Do not assume
one.

Use an eyebrow, never a coloured dot, for a label above a heading.

---

## `tooltip`

Group `1530:2709` · set `1554:348` · **9 variants** (3 × 3), complete.

| Property | Values |
|---|---|
| `Color` | `Neutral`, `Dark`, `Blue` |
| `Position` | `Left`, `Right`, `Center` |

**`Color` — pick by contrast with the background:**

| Color | Use on |
|---|---|
| `Neutral` (light pill) | Dark backgrounds |
| `Dark` (dark pill) | Light backgrounds |
| `Blue` | When you need to highlight or draw attention to a tooltip |

**`Position`** controls where the arrow/tail sits below the text box. **Pick by the
tooltip's placement so content never clips** — a tooltip near the left edge uses `Left`
so the box doesn't cut off. **There is no default**; position is decided by placement.

The rule calls this property **"Arrow position"**; the actual key is **`Position`**.

**Leading icon** can be turned on or off, and swapped to suit the context (default is the
info icon).

---

## `input-fields`

Group `1485:14897`. Six sets plus five standalone status components.

| Component | Node | Properties | Variants |
|---|---|---|---|
| `input/text-field` | `1562:705` | `State` [`Default`, `Hover`, `Selected`, `Filled`, `Loading`, `Verified`] × `Feedback` [`None`, `Red Warning`, `Yellow Warning`] | 14 of 18 |
| `input/phone-field` | `1562:5506` | same as text-field | 14 of 18 |
| `input/dropdown` | `1562:5769` | `State` [`Default`, `Hover`, `Filled`, `Open`] | 4 |
| `input/card` | `1562:5807` | `State` [`Default`, `Hover`, `Selected`] × `Feedback` [`None`] | 3 |
| `input/ dropdown-options` | `1490:3488` | `Type` [`Basic`, `With Recent/ Suggestions`, `With Add Other Item`, `With Description`] × `State` [`none`, `Default`, `Typing`] | 5 |
| `input/checkbox` | `1977:4776` | `State` [`Default`, `Hover`, `Selected`] | 3 |

Note `input/ dropdown-options` has a **space after the slash**, unlike its five siblings.
`input/card` carries a single-value `Feedback [None]` property — dead weight that must
still be supplied.

### Definitions

- **Single-select** — the user picks exactly one option.
- **Multi-select** — the user can pick more than one.
- **Required by default** — every field is required unless its label ends with
  `" (Optional)"`.

### Pick the component by input type

| Input | Component |
|---|---|
| Single-line text — email, first name, last name, company name, job title, URL | `input/text-field` |
| Phone number | `input/phone-field` |
| Single-select, few options, all visible | `input/card` |
| Single-select, long list or tight space | `input/dropdown` |
| Multi-select | `input/checkbox` |

**Single-select is only ever a Card or a Dropdown — never hand-roll a radio button.**
Cards when the choices are few and worth showing up front (B2B / B2C / Mixed); Dropdown
when the list is long, unknown, or space is tight.

### Dropdown list types

The rule names these `Plain` / `Suggested` / `Recent` / `Type-and-add` /
`With descriptions`. **None of those is a real key.** The actual `Type` values on
`1490:3488`, and what the rule means by each:

| Actual key | Rule calls it | Use for |
|---|---|---|
| `Basic` | "Plain" | Fixed, short list |
| `With Recent/ Suggestions` | "Suggested / Recent" | Frequent or repeated picks surfaced at the top |
| `With Add Other Item` | "Type-and-add" | The list can't be exhaustive; user can type a new value |
| `With Description` | "With descriptions" | Options need a line of explanation to choose between |

Use the left column. Following the prose emits four invalid keys.

### Field states — when each fires, the copy, whether it blocks

| State | Fires when | Copy | Blocks? |
|---|---|---|---|
| `Default` | Untouched or valid | none | no |
| Error (red) — `Feedback=Red Warning` | Hard validation fail: wrong format, missing required | `"Oops! That does not look right. Do you wanna try again?"` | **yes** |
| Warning (yellow) — `Feedback=Yellow Warning` | Value allowed but looks off | `"Heads up! Please double-check this field."` | no |
| `Verified` | Passed a check, e.g. verified email | none — show the check | no |
| `Loading` | Async validation in progress | none — spinner, drawn centred in its 18px slot so it turns on its own centre and does not orbit | no |

The rule calls the success state **"Success (green check)"**; the actual value is
**`Verified`**. There is no `Success` key.

The rule also flattens a two-axis model into one list. States live on `State`
(`Default`, `Hover`, `Selected`, `Filled`, `Loading`, `Verified`) and validation lives on
`Feedback` (`None`, `Red Warning`, `Yellow Warning`). `Hover`, `Selected`, and `Filled`
are undocumented in the prose.

The two error/warning strings above are the exception to the no-exclamation-marks rule in
`foundation/voice.md` — they are the component's shipped copy. Do not write new copy with
exclamation marks.

### Label and placeholder behaviour

At rest (empty, unfocused) the **label sits inside the field**. On focus or fill (the
`Selected` variant) the label **shrinks and floats to the top**, and the example
placeholder appears below it. **Both stay visible — the placeholder never replaces the
label.**

The placeholder is a **lowercase example** of the expected value, hinting at format, not
repeating the field name:

| Field | Placeholder |
|---|---|
| Email | `name@company.com` |
| Company name | `your company name` |
| First name | `first name` |
| Last name | `last name` |

### Optional fields

Fields are required by default. When a field is optional, **append `" (Optional)"` to its
label**. **Never mark required fields** — required is the silent default.

### Status / processing icons

Five standalone slash-named components, not a variant set:
`Processing/None` (`1497:213`), `Processing/Loading` (`1497:214`),
`Processing/Verified` (`1497:216`), `Processing/Red Warning` (`1523:307`),
`Processing/Yellow Warning` (`1523:310`).

Inconsistent with every other multi-state element in the file, which uses variant
properties. Reach for them through the field's `State` / `Feedback`, not directly.

---

## `inline-input`

Group `1584:1059` · set `1584:1579` · **24 variants** (4 × 3 × 2), complete.

| Property | Values |
|---|---|
| `State` | `Default`, `Hover`, `Selected`, `Filled` |
| `Feedback` | `None`, `Red Warning`, `Yellow Warning` |
| `Button Style` | `Primary`, `Dark` |

One field plus an inline CTA in a single row.

**When to use: only when a single piece of input moves the user forward** — capturing a
work email before a demo. One field, one CTA, one step. **For anything longer, build a
full form from the standard input fields.**

### Copy conventions

- **Label is phrased as a question**, not a noun — "What's your work email?" (Standard
  input-field labels stay noun-style, "Work email"; inline-input labels ask.)
- **Placeholder** is a lowercase example of the value — `name@company.com`.
- **Button text is the primary CTA** — `Book a Demo`. See `foundation/voice.md`; the
  rule text here says "Book a call" and is one of the two outliers.

### CTA colour

**Black CTA is the default primary.** Use the **Blue** CTA when the inline-input sits on
a black background, so the CTA keeps emphasis. Same rule as buttons: blue is primary on
black surfaces.

### States

Inline-input carries the same states as the standard input fields — see the field-states
table above. Do not redefine them.

### Phone breakpoint

Field and CTA **stack vertically** — field on top, CTA full-width below, **12px gap**.

`inline-input` is the only group in the web library with no `Wrapper Frame` — an
extractor keyed on that frame name will skip it.

---

## `ai-agents` / `agent-icon`

Group `1584:2041` · set `1606:581` · **20 variants** (10 × 2), complete.

| Property | Values |
|---|---|
| `ai agent` | `research`, `refresh`, `authority`, `paid_boost`, `strategy`, `content`, `follow_up`, `memory`, `design_&_development`, `other` |
| `add emphasis` | `false`, `true` |

Both property names are **lowercase with spaces** — `ai agent`, `add emphasis` — unlike
the Title-Case convention everywhere else. Copy as written.

**Where to use:** in cards, or wherever an agent needs to be represented visually.

**The agent set is fixed.** Each name maps to its own icon. Use snake_case for multi-word
names. The rule lists nine; **the component ships ten — `other` is undocumented** and is
the slot for an agent not in the set.

**Construction:** each icon is a 4×4 grid of rounded-corner squares. **Don't hand-draw
new patterns** — use the ones in the set. **Each agent's pattern is fixed; don't swap an
agent's glyph.**

**Emphasis:** `add emphasis=false` (lighter blue) is the resting state.
`add emphasis=true` (brighter blue) is used on hover, and to statically spotlight an agent
when you want to draw attention to it.

The rule names these states "Default" and "Emphasis" — neither is a resolvable key. Use
`false` / `true`.

---

## Source notes

- **`Label: Dropdown` is stale copy-paste on six of these groups** — `1584:1578` and
  `1979:5345` (inline-input), `1584:2112` (eyebrow), `1607:4014` (ai-agents),
  `1584:2135` (badge), `1584:2124` (tooltip), `1977:4775` (checkbox). Ignore it.
- **Four descriptions share one generated template** ("…providing a flexible and
  consistent … across the interface"): button `1674:37760`, badge `1553:14916`,
  tooltip `1530:2714`, input-fields `1485:14902`. Two make false claims — the badge
  description promises "counts" (no such variant) and input-fields claims "inline CTAs"
  (a separate group).
- The eyebrow and tooltip rules describe icon on/off toggles and a clickable toggle that
  do not appear in variant names. They are most likely boolean or instance-swap component
  properties, which the metadata API does not expose. Treat them as real but verify
  against the component before relying on exact prop names.
- **21 stray hidden `Frame 2147223955` nodes** sit at the root of this page, each holding
  two text nodes named `Text`. Page garbage; ignore.
