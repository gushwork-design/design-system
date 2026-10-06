# Agent Store layout pass: new elements

Built 6 Oct 2026. Files: `web/internal/staging/agent-store/`, `exports/web/agent-store.md`,
`web/previews/web/agent-*.frag`, five entries in `exports/web/component-registry.json`.

## Created
Five elements, all pending review: `agent-card`, `agent-filter-rail`, `agent-listing-panel`,
`agent-package-bar`, `agent-package-builder`. The library has no marketplace listing, filter rail,
side panel or cart pattern. Specs in `exports/web/agent-store.md`. Composed from tokens plus the existing
`badge`, `button`, `eyebrow`, Brand `navbar` and `footer` (footer with CTA and marquee off).

## Modified
None. No measured component was changed.

## Worth a decision
- Whether the Vercel-style rail and card grid becomes a library pattern, or stays specific to this page.
- `Featured` is an editorial pick the data does not make.

## Tokens
Colour, type, radius, shadow and spacing are all `--gw-*` tokens. Nothing new was added to the palette
or ramps. The page links `/foundation/tokens.css` and uses only Vert Grotesk Display and Inter.
Not on a token: layout dimensions (232px rail, 520px panel, 104px and 168px mascot tiles, 640px bar),
which have no documented figure and are the builder's choice.
