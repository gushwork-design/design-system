# Drop Studio elements

**Status: pending review.** Three elements for Drop Studio at `web/internal/staging/drop-studio/`, drawn first as
wireframes (Version C chosen by Utsav on 8 Oct 2026, placements taken from Blush, Unsplash and unDraw). Nothing here
is measured from a Figma file; sizes are tokens and the builder's choice. Until the three pass in Design System →
Review, any page that uses one must say it is unreviewed.

The page has no template. It is owner-only while it is staged.

## `drop-agent-card`

A picture-first card for a character gallery. Width follows the grid column. White, 1px `--gw-color-neutral-100`,
`--gw-radius-16`, padding `--gw-space-8`, gap `--gw-space-12`. The picture is a square, `--gw-radius-8`, `object-fit:
cover`, so outer 16 = inner 8 + padding 8. Below it: the name (`--gw-text-body-16-sem`, one line, ellipsis) with an
optional status chip on the right, then the bundle in `--gw-text-body-12-reg`.

States: rest; hover or keyboard focus-within (two 32px actions appear at the picture's top right, **Copy link** and
**Download picture**, each `--gw-radius-8`, a 1px `--gw-color-neutral-200` edge and `--gw-shadow-s2`, with a short
tooltip; on touch screens they are always visible); a status chip. The chips are `Approved` (green), `To review`
(black, white in dark) and `Requested` (orange). A selected card is a black ring, never blue.

A card with no picture yet shows a dashed placeholder, "Waiting for ChatGPT". The whole card opens the quick view.

Not the same as `agent-card` (the Agent Store listing): that one is a 60px tile with a blurb and an add button; this one
exists to show the picture and let someone take it.

## `drop-bundle-rail`

A vertical tab group, 240px, sticky under the top bar so it stays in view while the grid scrolls. Container
`--gw-color-neutral-100`, `--gw-radius-16`, padding `--gw-space-4`; rows 36px, `--gw-radius-12`, label in
`--gw-text-body-14-med`, count right-aligned in `--gw-text-body-12-med` on `--gw-color-neutral-500`. The selected row is
white with a 1px `--gw-color-neutral-200` ring. Counts follow the search and the status filter, so a bundle with no
match reads 0. Keyboard: up and down move and select.

The same pattern, horizontal, is the status filter (`All`, `Approved`, `To review`, `Requested`): container radius 12,
padding 4, items 28px at radius 8. A tab with no agents is dimmed and cannot be chosen. Below 1000px the rail is
replaced by a horizontally scrolling strip of the same tabs.

Not the same as `tab-group` in the tools shell (36px, black active) or `agent-filter-rail` (the Agent Store rail that
scrolls to sections).

## `drop-quick-view`

A dialog for one agent's picture. 960px wide at most, `--gw-radius-24`, `--gw-shadow-s4`, padding `--gw-space-16`. Left:
the picture, square, up to 528px. Right: a close button, the name in `--gw-text-h4`, the bundle, the blurb, a short
definition list (the picture's source and its file name and size), then the actions: **Download picture** (primary),
**Copy link**, and **Request new picture** (disabled until the next phase). Previous and next sit outside the dialog on
desktop (44px round, `--gw-shadow-s3`) and are hidden on a phone, where the dialog stacks to one column.

Behaviour: opens from a card or from `?agent=<id>` in the address, so a copied link opens the same agent; the address
follows the agent shown and clears on close; left and right arrows step through the filtered list; Escape closes. A
link to an unknown agent opens nothing and clears itself.

## Tokens and deviations

Colour, type, radius, shadow and spacing are `--gw-*` tokens. Dark mode follows the hub's `gw-theme-choice` key and
re-points the surfaces (page black, card `--gw-color-neutral-900`, edges `--gw-color-neutral-850`). The primary button
inverts in dark. Not on a token: the 240px rail, the 960px and 528px quick view and the 560px search, which are layout
choices with no documented figure. The status chip tints in dark use `color-mix` on the green and orange ramps.
