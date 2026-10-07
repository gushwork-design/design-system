# Drop Studio elements

**Status: pending review.** One new element, `drop-agent-card`, for Drop Studio at `web/internal/staging/drop-studio/`.
The page was drawn first as wireframes (Version C chosen by Utsav on 8 Oct 2026, placements taken from Blush,
Unsplash and unDraw). Nothing here is measured from a Figma file; sizes are tokens and the builder's choice. Until
`drop-agent-card` passes in Design System → Review, any page that uses it must say it is unreviewed.

The page has no template. It is owner-only while it is staged.

## What the page reuses (and so does not register)

An audit on 8 Oct 2026 found that most of the first build duplicated pieces the library already has. These were
replaced, and two elements first registered for this page (`drop-bundle-rail`, `drop-quick-view`) were withdrawn.

| Part of the page | Library piece it uses |
|---|---|
| Search at the top | dashboard `search-field` (`gd-input--search`, with its own clear button). The `⌘K` hint is the `search-trigger`'s key cap (`gd-search__key`); it reads `Ctrl K` off a Mac, hides while the field is focused or has text, and is hidden on touch. The page sets `data-gd-palette-off`, so the library's own `⌘K` command palette does not open over the page's search. |
| Create new agent, Download picture, Copy link, Request new picture | dashboard `action-button` (`gd-btn`, primary and outline) |
| Copy link and Download on a card, the close button | dashboard `icon-button` (`gd-iconbtn--outline`, `data-tip`) |
| Status filter, and the bundle strip on a phone | dashboard `tabs-pill`, with counts |
| Status chips on a card | shared `badge` (`--good`, `--solid`, `--warn`) |
| Messages (download, next-phase notes, a failed copy) | dashboard `toast` (`GD.toast`), which sits above an open dialog |
| Appearance (System, Light, Dark) | dashboard `theme-menu` |
| Bundle rail on desktop | follows `agent-filter-rail`'s category rows: a 240px sticky column, 36px rows in `--gw-text-body-14-med`, the count in `--gw-color-neutral-500`, the selected row white with a 1px stroke and `--gw-shadow-s2`, the others bare on the ground. Here the rows filter in place instead of scrolling to a section. |
| Quick view | follows `agent-listing-panel`'s shell: a centered modal 820px at most, previous and next as 44px round buttons outside the edges (`--gw-shadow-s3`), a bottom sheet on a phone, a header with the bundle badge, the position (`2 of 33`) and close. It holds a large picture with Download and Copy link instead of the package controls. |

The rail and the quick view are page-local CSS, the same as their Agent Store originals. If the library later pulls
either into a shared piece, this page should move to it.

## `drop-agent-card`

A picture-first card for a character gallery. Width follows the grid column. White, 1px `--gw-color-neutral-100`,
`--gw-radius-16`, padding `--gw-space-8`, gap `--gw-space-12`. The picture is a square, `--gw-radius-8`, `object-fit:
cover`, so outer 16 = inner 8 + padding 8. Below it: the name (`--gw-text-body-16-sem`, one line, ellipsis) with an
optional status `badge` on the right, then a one-line description of what the agent does in `--gw-text-body-12-reg`
(sentence case, no full stop, one line with an ellipsis; the bundle lives in the rail and the quick view).

States: rest; hover or keyboard focus-within (two `icon-button`s appear at the picture's top right, **Copy link** and
**Download picture**, on a raised surface with `--gw-shadow-s2`; on touch screens they are always visible). Copy link
confirms on the button itself: the glyph becomes a check and the tooltip reads `Link copied` for two seconds. A
selected card, if one is needed, is a black ring, never blue. The whole card opens the quick view.

Not the same as `agent-card` (the Agent Store listing): that one is a 60px tile with a blurb and an add button; this one
exists to show the picture and let someone take it. Whether the two should become one card with a picture-first variant
is a decision for review.

## Tokens and deviations

Colour, type, radius, shadow and spacing are `--gw-*` tokens, and the page's own surfaces are `light-dark()` aliases so
they follow the library's theme handling. The library's tab pills use its ink selected state, so the status filter and
the phone strip are black when selected. Not on a token: the 240px rail, the 820px quick view and the 560px search
column, which are layout choices with no documented figure.
