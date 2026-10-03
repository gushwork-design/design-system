# States — focus, hover, empty, loading, unavailable

> ## ⚠ PARTLY SUPERSEDED — 13 Aug 2026
>
> | Ruling | Status |
> |---|---|
> | **Focus** — `--gw-focus-ring` on `:focus-visible`, mandatory everywhere | **CURRENT, narrowed by R41 (3 Oct 2026):** keyboard only, and text fields show their own edge instead of the ring. No v2 component defines a focus ring; this ruling is the only thing that gives keyboard users anything |
> | **Empty** — "compose from `section/Container`" | **Superseded** — there is now a real `empty-state` component. [`v2/feedback.md`](v2/feedback.md) |
> | **Loading** — ruled per surface | **Partly superseded** — a `skeleton` component now exists for in-place table and card loading. The whole-screen `Loading & fetching data…` + progress bar pattern here is still current |
> | **Hover** — "moves ONE step toward the selected state" | **CURRENT.** v2 defines hover only on `table-row` (`neutral/25`); for every other component this ruling is still how you derive it |
>
> v2 adds components for two of these states; it does not overturn the reasoning.

**Everything in this file is RULED, not measured.** Figma defines none of it, and that absence
was producing a different answer on every build. These are the answers. Use them; do not
re-decide them.

Ruled by Utsav, 7 Aug 2026. **Unavailable** ruled by Utsav, 28 Aug 2026.

**Scope: dashboard / product.** The same focus rule applies on web.

---

## Focus — every focusable element, both surfaces

**No component in the Figma file defines a focus state.** Not `Button`, not `controls/*`, not
`list-item`, not `table-row`, not `user-card`. Keyboard users were getting whatever the browser
happened to do, which on a restyled `<button>` is often nothing at all.

```css
:is(button, a, [tabindex], select, summary):focus-visible {
  outline: var(--gw-focus-ring);
  outline-offset: var(--gw-focus-offset);
  border-radius: var(--gw-radius-4);
}
```

**Keyboard only (R41).** The ring shows when something is reached by keyboard and never after a
click. **Text fields (`input`, `textarea`) are not in that list on purpose:** a browser treats a
click into a text field as keyboard focus, so the ring would show on every click. A text field
shows its own edge instead (the dashboard `input`'s 1px black `focus` border, or `neutral/400` on
the hub), which is also visible when it is reached by keyboard.

- `--gw-focus-ring` and `--gw-focus-offset` are in `foundation/tokens.css`. They compose from
  `--gw-color-primary-alpha-40` and introduce no new colour.
- **`:focus-visible`, not `:focus`** — a mouse click should not leave a ring behind. A rule that puts the ring on `:focus` is a bug.
- **Never `outline: none` without a replacement.** This is the one rule in this file that is an
  accessibility requirement rather than a preference. For a text field the replacement is its
  edge, as above.
- Blue is correct here. A focus ring is a **signal**, not a control state — see the
  data-vs-control-state rule in `controls.md`.

## Interactive targets must be real controls

A row that looks pressable and is not is worse than a missing hover.

- Anything clickable is a `<button>` or an `<a>` — never a `<div>` with a click handler.
- Anything **not** clickable never gets a hover, a pointer cursor, or a focus ring. The nav
  group label is the worked example: see `list-item` in `section-elements.md`.

## Hover

Per-control values live with their components — `controls.md` for tabs, dropdowns, toggle and
buttons; `section-elements.md` for `list-item`, `table-row` and `user-card`. Two rules sit
above them:

1. **Every *click target* has a hover state.** If a variant exists in Figma without a
   measured fill, the value is in the component's export file. Do not invent a third answer.
2. **Hover moves one step, in the direction of the element's own selected state.** A tab moves
   toward white because `Selected` is white. A grey trigger moves to `neutral-100`. It never
   jumps two steps or changes hue.
3. **Check that Figma is actually silent before you fill the silence.** All three `Button` hover
   fills were ruled by hand on the belief that the `State=Hover` symbols carried none. They
   carried them the whole time, and all three rulings were wrong — see `button.md`.

**The one exception to rule 1 is the text field.** `input/text-field`'s `State=Hover` is
byte-identical to `State=Default` across all 14 variants — measured, not missing. A text input's
affordance is the caret, not a fill, and its feedback is `Selected`. `DECISIONS.md` → **R2**,
`foundation/text-field.md`. Rule 1 is about **click targets**; a field is not one.

All hover transitions use `--gw-motion-fast`, guarded by `prefers-reduced-motion`.

---

## Empty state — RULED, pending Figma

`foundation/output-targets.md` requires an empty state per Section and records that the library
ships none. It ships one now.

**Compose from `section/Container`.** The Section keeps its normal header — icon tile, title,
caret — so the page structure does not change shape when data is missing. The empty content
goes in the body:

| Part | Value |
|---|---|
| container | the Section's normal `sec__body` — white, 1px `--gw-color-neutral-50`, `--gw-radius-8` |
| layout | vertical, centred, gap `--gw-space-8`, padding `--gw-space-48` block / `--gw-space-20` inline |
| title | `--gw-text-body-16-sem` · `--gw-color-neutral-900` |
| body | `--gw-text-body-14-reg` · `--gw-color-neutral-600` · max-width 420 |
| action | one `Button` — `Primary` if there is an obvious next step, otherwise omit it |

**Copy rule: say what is missing and what to do, in that order.** "No leads yet — connect a
form to start capturing them." Never "No data" alone, and never blame the user.

**Do not repeat the page or section name in the body** — the Section header already carries it,
and it reads badly for plural names ("Leads is not part of this sample").

## Loading state — RULED, pending Figma

Same provenance: required by `output-targets.md`, drawn nowhere. `Skeleton` and `Spinner` are
named in `foundation/shared-components.md` as *intended* components and do not exist.

**Skeleton, not spinner.** The shell renders before the numbers arrive on every page, so the
layout is already known — hold its shape rather than covering it.

| Part | Value |
|---|---|
| block | `--gw-color-neutral-100`, `--gw-radius-4`, sized to the text or number it replaces |
| animation | a gentle opacity pulse, `--gw-motion-fast` × 8, or none under `prefers-reduced-motion` |
| structure | one block per real element — do not collapse a kpi-card to a single grey rectangle |

**The rule that matters more than the styling:** never render a `0`, a `—`, or a plausible
number while data is in flight. A `0` that means "not loaded" reads as "we got no leads", and
that misreading is expensive. This restates `output-targets.md`; it is repeated here because
it is the failure that actually ships.

## Unavailable state — RULED, pending Figma

**Ruled by Utsav, 28 Aug 2026.** Empty and loading were ruled on 7 Aug; *failed* was not, and it
is a third condition rather than a shade of either. **Empty** means we read the source and it
held nothing. **Unavailable** means we could not read it at all. A page reading five stores can
have one fail while the other four are fine, so the state belongs to **the card or section that
failed**, never to the page.

**The whole ruling in one line: an element that encodes a quantity is REMOVED, never zeroed.**
A progress bar at 0%, a percentage reading `0%`, a sub-line reading `of 0`, a value of `—` —
each of those is a measurement. Each says "we looked, and the answer is nothing." That is a
different claim from "we could not look", and it is the one the reader will act on. This is the
loading rule above, extended: a `0` that means *not loaded* and a `0` that means *not readable*
mislead identically.

**Scope: any data-bearing card or section** — `stat-card`, `metric-card`, `kpi-card`,
`analytics-card`, `Graph`, `section/table`, and any `section/Container` holding a figure.

### The card treatment

The card keeps its surface, radius, padding, label and footprint. **The page must not change
shape because a store went down** — the same reasoning that keeps the Section header on an empty
state. Only the parts carrying a quantity change:

| Part | Unavailable |
|---|---|
| Surface, radius, padding, label, footprint | **unchanged**, light and dark exactly as measured |
| `status-dot` | `Status=behind` |
| Value | drops from the display ramp to `--gw-text-body-14-med` · `--gw-color-neutral-500`. Display 28 announces a measurement; this is not one |
| Sub-line, percentage | **removed** — not zeroed, not dashed |
| `progress-bar` | **removed** — not drawn at 0%. The clearest case of a quantity that cannot be drawn honestly |
| Source | one `Badge`, `Color=Red`, `Size=Small`, naming what failed |

`Badge` has **no `Tone` property.** It is `Theme · Color · Icon · Size`, and the value here is
`Color=Red`. On a dark card use the standard dark pairing from
`foundation/shared-components.md` — `Red/Alpha/10` fill with a `Red/300` label — and do not
carry the light `/25` + `/500` pair onto it.

### Copy — name the source, not the symptom

The reader can already see the number is missing. What they cannot see is **which** of five
stores went down, and that is the only fact that tells them whether the rest of the page is
trustworthy.

- Value slot: `Unavailable`
- Badge: the source that failed — `HubSpot`, `Postgres`, `Search Console`

Never `Error`, never `—`, never a number. Avoid `Could not compute`: it names our failure rather
than their problem, and it costs the same room as a source name that would actually help.

### The retry does not go inside the card

`stat-card` is 218 × 132 and every part of it is spoken for. A retry belongs on the
`section/header`, where the refresh control already lives — and **only if it is wired**. Drawing
a control that does nothing is the dead-control trap, and that has shipped three times. If one
card in a section failed, the section's existing refresh **is** the retry.

### Section level

A section that cannot be read at all uses `empty-state` (`v2/feedback.md`) with the same copy
rule, not the card treatment. **`empty-state` cannot be used inside a card** — it is 480 wide
against a 218 card, and section-level by construction.

---

## Sample and placeholder data

When the numbers are yours rather than measured, the `Sample data` marker is **not optional**.

- A `Badge`, `Color=Yellow`, in the `section/header` — see the title row in `sections.md`.
- It sits in the header's **title row**, not the toolbar, so it cannot scroll out of view.
- Remove it the moment real data lands.

Never invent a number implying a business outcome — revenue, conversion, pipeline — without it.
