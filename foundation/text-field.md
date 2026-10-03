# `text-field` — the shared input, used by both surfaces

Figma: `input/text-field`, set **`1562:705`**, in `↳ web/ component-library` → `input-fields`.
**14 variants.** Measured symbol by symbol, 8 Aug 2026.

**This is a shared atom.** It lives in the web library because that is where it was drawn, but
`dashboard-login-screen` instantiates it too — so it is read from `foundation/`, like the badge,
the logo and the icon set, and **both skills own it equally**. See `DECISIONS.md` → **R1**.

Nothing else in the dashboard set reaches across the surface boundary. If you add a second
crossing, promote that component here as well rather than letting the boundary blur.

## The variant matrix

Two props. `State` × `Feedback`, **14 of a possible 18** — `Loading` and `Verified` exist only
at `Feedback=None`.

| `State` | `None` | `Red Warning` | `Yellow Warning` |
|---|---|---|---|
| `Default` | `1562:535` | `1562:579` | `1562:631` |
| `Hover` | `1562:546` | `1562:592` | `1562:644` |
| `Selected` | `1562:557` | `1562:605` | `1562:657` |
| `Filled` | `1562:568` | `1562:618` | `1562:670` |
| `Loading` | `1562:683` | — | — |
| `Verified` | `1562:694` | — | — |

`Loading` and `Verified` carrying no warning is deliberate, not a gap: a field cannot be both
"checking" and "already wrong".

## The shell — identical in all 14

| Part | Measured |
|---|---|
| `input-row` | `--gw-color-neutral-50` · **56 tall** · `px-16 py-8` · `--gw-radius-8` · `gap-12` · `overflow: hidden` |
| Inner block | `flex-1`, **40 tall**, column, `gap-8`, `justify-center`, `min-width: 0` |
| Trailing slot | **18 × 18**, always present, empty at `Processing/None` |

**The fill never changes.** Not on hover, not on focus, not on error — `neutral/50` in all 14
variants. Everything the field communicates, it communicates through its *content* and, for
warnings, through a 1px border and a line of text below. Do not add a fill change.

## `State` — a floating-label field

| `State` | Label | Second line | Trailing slot |
|---|---|---|---|
| `Default` | "Work email" at **14**, `--gw-color-neutral-500` | — | empty |
| `Hover` | **identical to `Default`** | — | empty |
| `Selected` | 14, `neutral-500` | caret `\|` in `--gw-color-neutral-900` + placeholder in `--gw-color-neutral-300` | empty |
| `Filled` | shrinks to **12**, `neutral-500` | the value at **14**, `--gw-color-neutral-900` | empty |
| `Loading` | 12, `neutral-500` | the value at 14 | **`CircleNotch` 18px**, `--gw-color-neutral-500` |
| `Verified` | 12, `neutral-500` | the value at 14 | **`CheckCircle` 18px**, `--gw-color-green-500` |

Label type is `--gw-text-button-14-med` at rest and `--gw-text-button-12-med` once filled — both
Inter Medium, **line-height 1**.

**`State=Hover` is byte-identical to `State=Default`.** Not an omission — the field's affordance
is the caret, and its feedback is `Selected`. **The field has no hover treatment.** See
`DECISIONS.md` → **R2**; this is the one documented exception to "every interactive element has a
hover state" in `exports/dashboard/states.md`.

**The label shrinks on `Filled`, not on `Selected`.** A focused-but-empty field still shows its
label at full size, with the caret on the line below. Slightly unusual, and measured — build it.

**Do not animate the label between 14 and 12.** Nothing in the set specifies motion on this
transition, and `font-size` is a poor property to animate — it does not composite, and in
practice it proved unreliable, holding the old size until an unrelated repaint and so reporting
14px on a field that was already `Filled`. Swap the size. The only motion in this component is
the `CircleNotch` spinner below.

## `Feedback` — adds a border and a message, and grows the component to 76

| | `Red Warning` | `Yellow Warning` |
|---|---|---|
| `input-row` border | **1px `--gw-color-red-500`** `#e11d48` | **1px `--gw-color-yellow-500`** — see below |
| Trailing slot | `WarningCircle` **16px** at `left:1, top:1` inside the 18 slot | same |
| Glyph + text | `--gw-color-red-500` | see below |
| Message | `--gw-text-button-12-med`, `h-12`, `px-16`, full width | same |
| Outer gap | **8** between the row and the message | same |

`56 + 8 + 12 = 76`. ✓ **A warning makes the field 20px taller** — reserve the space or accept the
reflow deliberately; do not clip it.

**76 assumes the message fits one line, and that assumption is 400px wide.** The `h-12` message
block holds exactly one line of 12px text. Narrow the field and the real messages wrap — *"Oops!
That does not look right. Do you wanna try again?"* needs about 330px to stay on one line. Below
that the component is taller than 76.

So: **let the message block grow, don't fix its height.** A clipped half-line of error text is
worse than a field that moves. If the layout genuinely cannot absorb the reflow, shorten the
message rather than the box.

The 16px `WarningCircle` in an 18px slot is a **1px inset on all sides**, unlike `CheckCircle`
and `CircleNotch` which fill the slot at 18. Measured, not a rounding artifact.

### `Yellow Warning` binds `#c18c0b`, which is not in the palette — RULED

`Red Warning` uses `#e11d48`, exactly `--gw-color-red-500`. `Yellow Warning` uses **`#c18c0b`,
which appears nowhere in the yellow ramp** — it sits between `yellow-500` `#d97706` and
`yellow-600` `#b45309` and matches neither.

**Build `--gw-color-yellow-500`.** It is the nearest step by a wide margin, and it mirrors what
Red does. See `DECISIONS.md` → **R6**. The drift is a Figma-side fix, reported not silently kept.

## Assets

Harvested from Figma, in `assets/icons/`:

| File | Used by | Fill |
|---|---|---|
| `warning-circle.svg` | both warnings | `#E11D48` = `--gw-color-red-500` |
| `check-circle.svg` | `Verified` | `#16A34A` = `--gw-color-green-500` |
| `circle-notch.svg` | `Loading` | `#878B94` = `--gw-color-neutral-500` |

`CircleNotch` is a spinner — **rotate it**, `--gw-motion-fast` is far too quick; use a ~700ms
linear loop, and stop it entirely under `prefers-reduced-motion`.

## Rules

**Width is yours.** The set is drawn at 400 (399 on the `Hover` symbols — a canvas artifact, not
a design difference). The field is `w-full` inside its own wrapper, so it takes the width it is
given. The login screen gives it 460.

**Focus is mandatory and is not in Figma.** Nothing in these 14 variants draws a focus ring, and
since R41 (3 Oct 2026) a text field does not get one: a browser counts a click into a text field as
keyboard focus, so a ring would show on every click. Show the field's own edge instead — a 1px
`neutral/400` border, or black in the dashboard — so the field never goes without a visible
focus state, whether it is reached by click or by keyboard. `exports/dashboard/states.md` has the rule.

**`Selected` is not `:focus`.** `Selected` is the *design* state for "focused and empty". Once
there is a value, the field is `Filled` whether or not it still has focus. Map them by content,
not by focus alone.

**Never colour the fill to show state.** Red and yellow live in the border, the glyph and the
message. A tinted fill is a third answer the set does not have.

**One warning at a time.** `Feedback` is a single enum — there is no both-at-once variant, and
stacking two messages under one field is not a thing this component does.
