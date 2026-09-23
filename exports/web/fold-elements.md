# Fold elements

Figma: section `fold-elements` (`2089:23401`) on `↳ web/ pattern-library`.

The reusable sub-components Folds are built from. The web analog of dashboard
section-elements: the small parts a Fold assembles, rather than Folds themselves.

**These are building blocks, not standalone sections.** Reach for them through the Fold
that contains them. Never place one directly in a Page Build slot.

## Inventory — 13 sets

| Name | Node | Type | Properties | Variants |
|---|---|---|---|---|
| `fold/fold-element/heading` | `1732:3751` | SET | `Breakpoint` [`Desktop`, `Phone`] × `Length` [`Large`, `Small`, `Default`] · bools `Show subtext` (true), `Show badge` (true) | 4 |
| `fold/fold-element/form` | `1836:7735` | SET | `Type` [`Check Lead Potential`, `Lead Form`] × `Size` [`Small`, `Large`] × `Breakpoint` [`Desktop`, `Phone`] | 5 |
| `fold/fold-element/accordion` | `1775:5866` | SET | `Breakpoint` [`Desktop`, `Phone`] × `State` [`default`, `hover`, `open`] · text props `Question`, `Answer` | 6 |
| `fold/fold-element/table-row` | `1824:6638` | SET | `State` [`Default`, `Hover`] | 2 |
| `fold/fold-element/table-header` | `1824:6639` | COMPONENT | none | 1 |
| `fold/fold-element/table-toggle` | `1809:97472` | SET | `Switch` [`no`, `yes`] | 2 |
| `fold/fold-element/table-phone-card` | `1824:6658` | COMPONENT | none | 1 |
| `fold/fold-element/timeline-tab` | `1808:20888` | SET | `State` [`default`, `Hover`] | 2 |
| `fold/fold-element/progress-bar` | `1678:1707` | SET | `Height` [`4 px`, `8 px`, `12 px`] | 3 |
| `fold/fold-element/client-logo-card` | `1833:107612` | SET | **`Property 1`** [`hover`, `default`] · bool `Show Arrow` (true) · slot `Slot` | 2 |
| `Client Logos` | `1860:7959` | SET | `Color` [`Dark`, `Light`] × `Logo` (24 client names) | 48 |
| `talking-guy` | `1658:24852` | SET | **`Property 1`** [`Frame 2147259587`, `Frame 2147259588`] | 2 |
| `Agent Card` | `1921:1132` | SET | `Breakpoint` [`Desktop`, `Phone`] × `State` [`Default`, `Hover`] × `Agent` (9 agents) | 27 |

**Three sets break the `fold/fold-element/*` namespace** — `Client Logos`, `talking-guy`,
`Agent Card`. They live in the fold-elements section but carry no prefix.

**`Agent Card` has no Info Frame at all** — no title, no description, no rules.

---

## `fold/fold-element/heading`

The fold heading block. Used by nearly every Fold.

`Length` [`Large`, `Small`, `Default`] sizes the heading. Only 4 variants exist:
Desktop × all three lengths, plus Phone at `Default` only. **There is no Phone/Large or
Phone/Small** — on phone the heading is always `Default`.

`Show subtext` (default **true**) toggles the supporting line.
`Show badge` (default **true**) toggles a Badge. **This is the only route by which Badge
enters a Fold** — Cards do not use it. Badge rules live in
`foundation/shared-components.md`.

Observed sizes: 580×266 and 580×310 in a split fold; 620×213 and 620×106 centred in a
1240 container.

## `fold/fold-element/form`

`Type` picks the form's purpose: `Check Lead Potential` (the shorter qualifier) or
`Lead Form` (the full capture). `Size` [`Small`, `Large`].

**5 variants — `Size=Large` exists only at `Desktop` + `Lead Form`.** Every other
combination is `Small`.

CTAs observed inside it: `Check my lead potential`, `Pick a time`, and
`Get a 20-min demo with our team`. These are action-specific and stay as written — do not
normalise them to `Book a Demo`. See `foundation/voice.md`.

The heading text node `1833:104960` contains a raw U+2028 LINE SEPARATOR where a line
break belongs (`Get a 20-min demo⁠with our team`). Render it as a break.

Fields inside come from `input-fields` — see `atoms.md`.

## `fold/fold-element/accordion`

`State` [`default`, `hover`, `open`] — all lowercase. Interaction states, not a choice.

Text properties `Question` and `Answer` carry the content. Used by `fold/ FAQs`.

### Measured — 19 Sep 2026

Measured off **GW Ads Library `t9rRxJODIVZ4N6CnrGdMhC`**, `43:29915` (collapsed) and
`43:30008` (open). This is the current treatment; see the disagreement note below.

| | Value |
|---|---|
| Rim | 1px `--gw-color-neutral-50` |
| Radius | `--gw-radius-12` |
| Padding | `--gw-space-12`, all sides |
| Header → answer gap | `--gw-space-12` |
| Question | `--gw-text-body-18-sem`, `--gw-color-neutral-800` |
| Answer | `--gw-text-body-16-med`, `--gw-color-neutral-600` |
| Caret tile | 32 × 32, `--gw-color-neutral-50`, `--gw-radius-8`, CaretDown at 16 |
| Collapsed height | **58** (12 + 32 + 12 + 2 rim) |
| Row pitch in a list | 66 — i.e. rows stack on an `--gw-space-8` gap |

Header is `space-between`, full width: question left (flexes), caret tile right. The
answer is `overflow: clip`-ed rather than removed, so the collapsed row keeps its height.

**The two ads files disagree, and this one is newer.** `O6g05YAT980r85VaDQha4h/1890:42758`
draws the same component with **no rim** and a 56 collapsed height. The Ads Library rim is
the later of the two. If you are building against a page composed in the older file, match
the page you were given and note it, rather than silently mixing the two.

### Ask-anything rows

The ask-anything pattern lets a visitor add their own question to the list. It has three
states, all measured off `t9rRxJODIVZ4N6CnrGdMhC`: `43:30376` (composer), `43:35127`
(thinking), `43:30008` (answered).

**The composer** is an accordion row whose question slot is an input placeheld
`Ask anything else...`, keeping the caret tile in place.

**A visitor's row** is an ordinary accordion row with two differences:

| | Value |
|---|---|
| Rim | 1px `--gw-color-neutral-100` — a step stronger than the `neutral-50` of authored rows |
| Marker | `Sparkle` 14 × 14 in `--gw-color-primary-500`, before the question |
| Gap, marker → question | `--gw-space-8` |
| Question | `--gw-text-body-18-sem`, `--gw-color-neutral-800`, capped at 480 |

An earlier revision used a `Your Question` badge in `--gw-color-primary-alpha-10` instead
of the Sparkle. **Superseded 19 Sep 2026** — the Sparkle replaced it; don't build the badge.

**The thinking state** (`65:1265`) replaces the answer while the row waits:

| | Value |
|---|---|
| Bars | 3, stacked, `--gw-space-8` apart |
| Bar | 12 tall, `--gw-radius-full`, `--gw-color-neutral-100` at **45% opacity** |
| Widths | 420 / 520 / 360 on a 634 content column — i.e. 66% / 82% / 57% |
| Row height | 122 while thinking |

Figma shows it static. Whether the bars pulse is a build decision, not a spec.

## Table elements

Four components make up `fold/Comparison Table`:

| Element | Role |
|---|---|
| `table-header` | The header row. No variants. |
| `table-row` | A comparison row. `State` [`Default`, `Hover`]. |
| `table-toggle` | The row-expand control. `Switch` [`no`, `yes`]. |
| `table-phone-card` | The phone-breakpoint replacement for a table row. No variants. |

On phone, the comparison table becomes a stack of `table-phone-card`s rather than a
scrolling grid.

**These are the marketing comparison table, not a data grid.** For browsable product data
use the dashboard's `section/table` — see `exports/dashboard/sections.md`.

## `fold/fold-element/timeline-tab`

`State` [`default`, `Hover`] — note the **mixed casing**, lowercase `default` and
capitalised `Hover`. Both are literal keys.

Used by `fold/Timeline` for the week-based step tabs.

## `fold/fold-element/progress-bar`

`Height` [`4 px`, `8 px`, `12 px`] — **note the space before `px`**, same convention as
the logo's `Size`.

Used inside `Card / Testimonial` (at `4 px`, 492 wide) as the auto-advance indicator.

**This is the one documented violation of the composition ladder**: an atom
(`Card / Testimonial`) instances a fold-element. The fold rule says atoms compose into
fold-elements, not the reverse. It is how the file is built — don't replicate the pattern
in new work.

## `fold/fold-element/client-logo-card`

`Property 1` [`hover`, `default`] — the property name is Figma's auto-generated default
and is the literal key. Boolean `Show Arrow` (default true). Slot `Slot`.

Its documenting group is named **`component-7`** (`1948:8212`) with the placeholder
description *"Miscellaneous component variant."*, while its title reads "Client Logo Card".
The fold Component Structure blob also lists `component-7` as though it were a real fold
element. It is not — it is this component's group.

## `Client Logos`

`Color` [`Dark`, `Light`] × `Logo` (24 client names) = **48 variants**.

Pick `Color` by the surface: `Light` logos on dark backgrounds, `Dark` on light.

**Never fabricate a client logo.** If a client isn't in the set of 24, that is a finding —
see the fallback in the skill.

## `talking-guy`

A decorative illustration set. `Property 1` [`Frame 2147259587`, `Frame 2147259588`] —
both the property name **and** its values are Figma auto-generated. Unusable as semantic
keys; pick by looking at the two variants.

**Its description is copied from a different component entirely** (`1658:24827`):

> "The Checkbox component supports multiple styles, states, sizes, and label
> configurations, providing a flexible and consistent selection element across the
> interface."

That is the Checkbox description on a decorative illustration. Ignore it. There is no real
rule for this component.

## `Agent Card`

`Breakpoint` [`Desktop`, `Phone`] × `State` [`Default`, `Hover`] × `Agent` (9 agents) =
**27 variants** — Phone exists at `Default` only.

The 9 agents match `agent-icon`'s fixed set minus `other`. Used by `fold/AI Agents` as the
marquee tiles. Agent naming and glyph rules live in `atoms.md` under `ai-agents`.

No Info Frame, so no written rules exist for this component.

---

## Coverage gap in the source

**No fold-element has its own Rules of Usage.** Each has a one-line generic description
only — "Accordion expand/collapse element variants", "Progress bar indicator element
variants", and so on. The guidance above is derived from the shared fold rules
(`2089:23406`), the fold Component Structure blob (`2089:23403`), and how the Folds and
Cards actually instance these elements.

Where a decision isn't covered here, it isn't covered in Figma either. Ask rather than
invent.

## Property-naming inconsistencies across these elements

| Concept | Keys in use |
|---|---|
| Interaction state | `default\|hover\|open` · `default\|Hover` · `Default\|Hover` |
| Boolean | `no\|yes` (`Switch`) · `false\|true` (booleans) |
| Unnamed property | `Property 1` on `client-logo-card` and `talking-guy` |
| Size with unit | `4 px` / `8 px` / `12 px` — space before unit |
