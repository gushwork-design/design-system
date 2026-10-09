# States — focus, interactive targets, hover, sample data

The rules every Gushwork surface follows for how an element reports that it can be used. They are
**ruled, not measured**: Figma defines none of them, and that silence was producing a different
answer on every build. Ruled by Utsav, 7 Aug 2026; the focus rule narrowed by **R41** (3 Oct 2026).
Moved here from the dashboard exports on the 2026 dashboard rebuild, because web, slides and the
hub all depend on them. The dashboard's own empty, loading and unavailable states are in
[`exports/dashboard/feedback.md`](../exports/dashboard/feedback.md).

## Focus — keyboard only

```css
:is(button, a, [tabindex], select, summary):focus-visible {
  outline: var(--gw-focus-ring);
  outline-offset: var(--gw-focus-offset);
  border-radius: var(--gw-radius-4);
}
```

- **`:focus-visible`, never `:focus`** — a click must not leave a ring behind. A rule that puts the
  ring on `:focus` is a bug.
- **Text fields (`input`, `textarea`) do not take the ring.** A browser counts a click into a text
  field as keyboard focus, so the ring would show on every click. A text field shows its own **edge**
  instead (1px `neutral/400` on the hub and library; the dashboard input's border token), which is
  also visible when it is reached by keyboard.
- **Never `outline: none` without a replacement.** This is the one accessibility requirement in the
  rule; for a text field the replacement is its edge.
- `--gw-focus-ring` and `--gw-focus-offset` are in `foundation/tokens.css`. They compose from
  `--gw-color-primary-alpha-40` and introduce no new colour. A ring is a **signal**, so blue is correct
  here even on surfaces where blue is never a control fill.

## Interactive targets are real controls

A row that looks pressable and is not is worse than a missing hover.

- Anything clickable is a `<button>` or an `<a>` — never a `<div>` with a click handler.
- Anything **not** clickable never gets a hover, a pointer cursor or a focus ring. A nav group label
  is the worked example.
- A drawn affordance must work (**R19**): a chevron, a sort arrow, a close mark, a copy button either
  does its job or is left out.

## Hover

1. **Every click target has a hover state.** Component docs hold the per-component values.
2. **Hover moves one step toward the element's own selected state.** A tab moves toward white because
   its selected state is white; a grey trigger moves to the next grey. Never two steps, never a change
   of hue.
3. **A hover needs two things:** contrast against its text *and* separation from the surface it lands
   on. Checking only the first lets through a hover equal to its surface, which renders as no hover at
   all. Check both, in both themes.
4. **The text field is the exception** (**R2**, `foundation/text-field.md`): `State=Hover` is identical to
   `State=Default`. A field's affordance is its caret, not a fill; it is not a click target.
5. Hover transitions use `--gw-motion-fast`, switched off under `prefers-reduced-motion`.

## Loading — a ghost, never words

Standing rule for every build (Utsav, 9 Oct 2026: "add a ghost on load, make it a rule for all builds").

- **Anything that waits on data shows a ghost of its real layout while it waits**: a page on first load, a drawer or panel that fetches, a tab, a list, a card. One ghost per real element (picture, name, line, value, row), at the real size and place, so nothing jumps when the data arrives. Never a blank area, a spinner on its own, or a line of text such as "Reading…" or "Loading…".
- A dashboard uses the library's skeleton (`gd-ghost`, `gd-ghost-row`; `feedback.md`). A tool uses the shell's ghost (`gushwork-tools`). A page on another surface draws the same thing from its own tokens: the pulse, no shimmer, none under `prefers-reduced-motion`.
- Mark the waiting region `aria-busy="true"` (or `role="status"` with a label) and give the ghost no text of its own.
- Check the ghost against the surface it sits on, in both themes: the library's ghost colour can equal a drawer's own surface in dark. Use the next stronger token there.
- A failure replaces the ghost with the error state and a retry, never leaves it pulsing.

## Sample and placeholder data

When the numbers are yours rather than measured, the **`Sample data` marker is not optional.**

- A Badge in the page header's **title row**, not the toolbar, so it cannot scroll out of view.
- Remove it the moment real data lands.
- Never invent a number that implies a business outcome — revenue, conversion, pipeline — without it.
