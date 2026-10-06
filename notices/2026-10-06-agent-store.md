# Agent Store layout pass: new elements

Built 6 Oct 2026. Files: `web/internal/staging/agent-store/`, `exports/web/agent-store.md`,
`web/previews/web/agent-*.frag`, five entries in `exports/web/component-registry.json`.

## Created
Six elements, all pending review: `agent-card`, `agent-section-header`, `agent-filter-rail`,
`agent-listing-panel`, `agent-package-bar`, `agent-package-builder`. Redesigned on 6 Oct 2026 to Utsav's Figma
(`1m3ozYgQqR6KFYGb8eVRy3`, node `136:9794`); the card, rail and section header are measured from it. The library has no marketplace listing, filter rail,
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

## Deviations from the Figma
- Hero shade: Figma binds a raw 60% black (no token); built with `--gw-color-neutral-alpha-50-black`.
- Card add button radius 5.33px (no token); built as `--gw-radius-4`.
- Title-case labels in Figma are sentence case on the page (voice rule).
- One-liners and the `Soon` marker on Build your own agent are not in the file.

## Update, 6 Oct 2026 (second pass)
Navbar is transparent over the hero and goes to the ad-page neutral-25 with a 1px neutral-100 stroke on scroll. Hero shade has Figma's progressive blur (built from masked photo copies; the blur radius has no token). Rail rows scroll to sections instead of filtering. The agent panel is now a centered modal with previous and next. The Brand footer is replaced by the short ad-page footer (copyright line only, neutral-600 as the ad pages ship it).

## Update, 6 Oct 2026 (quick view)
The agent modal follows store quick-view patterns, drawn first in `agent-store/modal-wireframes.html` and chosen as layout A with edge arrows. New behaviour: a monthly volume stepper that feeds the builder's estimator. The unit and bundle are no longer repeated, and the left column is filled with the talk track, fits and proof slot. The pairs strip is not built: the hand-off order is not in the data.

## Update, 6 Oct 2026 (dropdown)
The industry picker is a styled custom dropdown instead of the native select, and focus rings are removed everywhere on the page at Utsav's request. Keyboard users get no visible focus on this page; flagging it so the next reviewer is not surprised.

## Update, 6 Oct 2026 (two-part modal)
The quick view body is now two parts, at Utsav's request: picture and description with the volume stepper and add button on top, How it works with the talk track, fits and proof slot below.

## Update, 6 Oct 2026 (package card)
The package bag moves from a floating bar to a summary card in the rail on desktop (option P2 of `agent-store/package-bar-wireframes.html`); the floating bar remains on phone. Defaults taken where Utsav only picked P2: slots and tier price shown, premium agents' price shown separately, Clear with a short Undo. The slots meter and Undo are new behaviour.

## Update, 6 Oct 2026 (version 2)
A second page, `/internal/staging/agent-store-v2`, shares the first page's images and data and changes the frame: underlined category tabs with search on the right of the row (`agent-category-tabs`) and an always-visible sticky package builder panel on the left (`agent-package-panel`). Both are new and pending review.

## Update, 6 Oct 2026 (version 2, second pass)
Version 2 now has the package panel on the right, search hidden, a navbar that scrolls away (no sticky navbar) and one sticky bar across the column holding every category tab plus the industry dropdown. Version 1 is unchanged.

## Update, 6 Oct 2026 (version 2 margins, version 3)
Version 2 and 3 use 100px margins and a 320px package panel, with "Build your own agent" removed. Version 3 (`/internal/staging/agent-store-v3`) turns the category tabs into a pill toggle (`agent-category-toggle`, pending review). Version 1 is unchanged.
