# Drop Studio phase 1: one new element, the rest reused

Built 8 Oct 2026. Files: `web/internal/staging/drop-studio/`, `exports/web/drop-studio.md`,
`web/previews/web/drop-agent-card.frag`, one entry in `exports/web/component-registry.json`, an owner rule in
`web/api/_access.js`, a row on `web/internal/staging.html` and its preview `web/assets/staging/drop-studio.png`.

## Created
One element, pending review: `drop-agent-card`, a picture-first gallery card with Copy link and Download on hover. The
library has no card that leads with the picture and offers a take-away action. Spec in `exports/web/drop-studio.md`.

## Reused, not created
The first build of this PR registered three elements. An audit the same day found two duplicates and withdrew them:
`drop-quick-view` repeated `agent-listing-panel`, and `drop-bundle-rail` repeated the category rows of
`agent-filter-rail`. The page also redrew the search, buttons, icon buttons, chips, toast and theme control that the
dashboard library has; those now use `search-field`, `action-button`, `icon-button`, `tabs-pill`, `badge`, `toast` and
`theme-menu`. The page links `/exports/dashboard/dashboard.css` and `dashboard.js`, so a library change reaches it.

## Modified
`web/api/_access.js`: one new compiled rule, `/internal/staging/drop-studio` at `owner`. `web/internal/staging.html`:
one new row. No measured component was changed.

## Worth a decision
- Marketing access. Owner-only for now; marketing joins through Access Control once the accounts are known.
- Phase 2 (creating agents, requesting pictures from ChatGPT, accepting candidates) is not built. The "Create new agent"
  and "Request new picture" controls are visible and say so when pressed.
- Whether `agent-card` and `drop-agent-card` should become one card with a picture-first variant.
- The library's tab pills are black when selected, so the status filter reads heavier than the wireframe drew it.
- Pictures are the ones already public on `/agents`, copied into the page folder. The newer portraits in the private
  `drop-reference` repo are not committed, because this repo is public.

## Tokens
Colour, type, radius, shadow and spacing are `--gw-*` tokens (every token the page names exists). Not on a token: the
240px rail, the 820px quick view and the 560px search column.

## Known gaps
The quick view's `close` event did not fire in the preview browser, so cleanup also runs from the close
button and from `cancel`; Escape was not exercised in a real browser.
