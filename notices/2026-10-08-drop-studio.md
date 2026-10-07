# Drop Studio phase 1: new elements

Built 8 Oct 2026. Files: `web/internal/staging/drop-studio/`, `exports/web/drop-studio.md`,
`web/previews/web/drop-*.frag`, three entries in `exports/web/component-registry.json`, an owner rule in
`web/api/_access.js`, a row on `web/internal/staging.html` and its preview `web/assets/staging/drop-studio.png`.

## Created
Three elements, all pending review: `drop-agent-card`, `drop-bundle-rail`, `drop-quick-view`. The library has no
picture-first gallery card with hover actions, no sticky vertical tab group, and no quick view with a link that
reopens it. Specs in `exports/web/drop-studio.md`. Layout is Version C of the Drop Studio wireframes, chosen by Utsav.

## Modified
`web/api/_access.js`: one new compiled rule, `/internal/staging/drop-studio` at `owner`. `web/internal/staging.html`:
one new row. No measured component was changed.

## Worth a decision
- Marketing access. The page is owner-only for now; marketing joins through Access Control (named people or a group)
  once the accounts are known. Nothing in code needs to change for that.
- Phase 2 (creating agents, requesting pictures from ChatGPT, accepting candidates) is not built. The "Create new agent"
  and "Request new picture" controls are visible and say so when pressed.
- Pictures are the ones already public on `/agents`, copied into the page folder. The newer portraits in the private
  `drop-reference` repo are deliberately not committed here, because this repo is public.

## Tokens
Colour, type, radius, shadow and spacing are `--gw-*` tokens (checked: every token the page names exists). Dark mode
follows the hub's `gw-theme-choice` key. Not on a token: the 240px rail, the 960px quick view and the 560px search.

## Known gaps
No Help control (the wireframe drew one). Focus rings are the hub's keyboard-only ring, not removed. The dialog's
`close` event did not fire in the preview browser, so cleanup also runs from the close button and from `cancel`;
Escape was not exercised in a real browser.
