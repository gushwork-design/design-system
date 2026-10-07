# AI Marketplace (staging): new elements

Built 7 Oct 2026. Files: `web/internal/staging/ai-marketplace/` (own assets), `exports/web/agent-store.md`
(section "AI Marketplace"), six `web/previews/web/*.frag`, six entries in `exports/web/component-registry.json`.
Versions 1 to 3 of the Agent Store are unchanged.

## Created
Six elements, all pending review: `agent-checkout-panel`, `agent-picker`, `agent-saving-line`,
`agent-step-timeline`, `agent-store-hero`, `shortcut-key-cap`. From Utsav's Figma (`1m3ozYgQqR6KFYGb8eVRy3`,
nodes `215:15115`, `323:21368`, `325:22087`, `337:22102`). The library has no checkout-style panel, popover
agent picker or parallax banner. `shortcut-key-cap` is the dashboard's R53 key cap brought to the web surface.

## Modified
`agent-category-toggle` (now a segmented control), `agent-package-builder` (two columns, fixed summary),
`agent-listing-panel` (folded lower section). Dates bumped; specs updated in `agent-store.md`.

## Worth a decision
- The saving figure is "what filling the next plan costs less than the same agents as $175 extras": $25 on
  Starter, $50 on Growth. Upgrading always costs more today, so the line shows both numbers.
- Whether the key cap becomes a shared web element next to the dashboard's.
- The Paid Ad Agent description and the Distributor popular picks are my drafts.

## Tokens
Colour, type, radius, shadow and spacing are `--gw-*` tokens. Off-token: the 80px hero title (the ramp ends at
60px), the 40% black hero gradient (no 40% token), 360px and 320px panel widths, 10px step labels.

## Deviations from the Figma
- Figma's upgrade bar says "Save $150"; with the real prices that figure cannot be true, so the line computes it.
- Only SEO, Paid Ad and Email Marketing have art; every other tile is the gray placeholder.
- Page column is 1240px to line up with the navbar; the Figma body is 1260px.
- Focus rings are removed on this page (Utsav's earlier call); keyboard users get no visible focus.
