# Agent Store elements

**Status: pending review.** Five elements built for the Agent Store layout pass
(`web/internal/staging/agent-store/`, 6 Oct 2026). None is measured from Figma: they are composed from
tokens and the existing `badge`, `button` and `eyebrow`, so every value is a token. Until they pass in
Design System → Review, any page that uses one must say it is unreviewed.

The page follows the Vercel Marketplace layout (filter rail, search, featured block, tagged card grids)
by Utsav's choice. It carries no template, also by his call.

## `agent-card`

A marketplace listing. Padding `--gw-space-16`, radius `--gw-radius-16`, 1px `--gw-color-neutral-100`
stroke, `--gw-shadow-s2` at rest and `--gw-shadow-card` on hover. Top row: a bundle `badge` and a 28px
round add control. Centre: the mascot as a 104px tile with `--gw-radius-16`. Then name
(`--gw-text-body-16-sem`), a three-line description (`--gw-text-body-14-reg`, `--gw-color-neutral-700`)
and a cost `badge`. **Selected** swaps the stroke to `--gw-color-primary-500` (plus a 1px ring) and
fills the add control blue with a check. Blue marks selection only.

`Featured` is the same card laid out horizontally, with a 168px mascot tile beside the text.

## `agent-filter-rail`

A 232px sticky left rail on desktop, behind a `Filters` button on phone. Groups: an industry select
(44px, `--gw-radius-8`), Type, Category, and a rep-mode switch. Each row is 36px,
`--gw-text-body-14-med`, `--gw-radius-8`, with a Phosphor `Regular` icon and a count in
`--gw-color-neutral-500`. The selected row lifts to white with a `--gw-color-neutral-100` inset stroke.
Group titles are `--gw-text-body-12-med` in `--gw-color-neutral-600`.

## `agent-listing-panel`

A 520px side panel (bottom sheet at 92vh on phone) that opens over the grid. Header with the bundle
`badge` and a close control; body with the mascot, price line, blurb, the five-step list, a rep block
and a facts grid; a white footer holding one full-width `Black` button, `Add to package`. The rep block
is `--gw-color-primary-25` with a `--gw-color-primary-100` stroke and only appears in rep mode.
A dashed "proof slot" is reserved for real customer results and is empty on purpose.

## `agent-package-bar`

A fixed bar, `--gw-color-black`, `--gw-radius-16`, `--gw-shadow-s4`, centred 24px above the bottom
edge, 640px wide at most. A stack of up to four mascots (32px, round) with a `+N` overflow, the count,
the recommended tier and monthly price, `Clear`, and a white `Small` button `Build package`. It slides
in when the first agent is added and out when the package empties.

## `agent-package-builder`

A modal sheet (bottom sheet on phone). Three figures (monthly, agents, credits), an upgrade nudge, a
tier comparison with the best price marked, an optional "priced separately" list, and a credit
estimator with one volume field per agent. **The pricing maths is the original file's, unchanged:**
Starter 3 agents $600 / 1,000 credits, Growth 6 / $1,100 / 2,500, Scale 12 / $2,100 / 6,000; $175 and
350 credits per extra agent; credit packs $150 per 1,000; lead-gen agents priced alone from $1,000.
`Send proposal` is not wired, as in the original.

## Known gaps

- The five elements are drawn and registered; none is in Figma.
- `Featured` picks (Front Desk, Quote Builder) are the builder's choice, not data.
- `access` codes (M, R, W, D, P) and the `day1` flag are in the data and deliberately not shown until
  their meaning is confirmed.
- The page `<title>` and description are proposals awaiting sign-off.
- No favicon-set or social card yet: layout pass only, and `/internal/*` cannot be scraped anyway.
