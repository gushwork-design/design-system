# Agent Store elements

**Status: pending review.** Six elements for the Agent Store at `web/internal/staging/agent-store/`.
The layout, the card, the rail, the section header and every state follow Utsav's Figma file
`1m3ozYgQqR6KFYGb8eVRy3`, node `136:9794` ("AI-Agent---Nugget", version 1.0), measured from the node's
properties on 6 Oct 2026. The listing panel, package bar and package builder are not in that file; they
are composed from tokens. Until the six pass in Design System → Review, any page that uses one must say
it is unreviewed.

The page has no template, by Utsav's call.

## Page frame (from the Figma, not registered separately)

A 60px navbar in a 1240 column with the logo and a `Login` button. It is **transparent over the hero** (white logo, white button) and, once the page has scrolled 32px, fades over 0.4s to the ad-page navbar: `--gw-color-neutral-25` with a 1px `--gw-color-neutral-100` bottom stroke, the original logo and a `Black` button. It is the page's only navigation. A 460px hero with a
photo, a left shade of 863px (`--gw-color-neutral-alpha-50-black` to transparent; Figma binds a raw 60% black
with no token) over a PROGRESSIVE blur (Figma radius 8, about 4px in CSS, easing to 0 by 82% across; built as
four masked copies of the photo) and `Heading/h1` plus `Body/body-20-med`, rounded `--gw-radius-20` at the bottom. The page ends with the short ad-page footer: a black bar, `--gw-radius-8` top corners, padding `--gw-space-16`, one centred line `© 2026 Gushwork | All Rights Reserved` in `--gw-text-body-12-med`, `--gw-color-neutral-600` (as the ad pages ship it; R9 asks for neutral-400). Below the hero a 1200 column of
a 240 rail, a 48 gap and a 912 main area, 80px under the hero, on `--gw-color-neutral-50`.

## `agent-card`

296 × auto. White, 1px `--gw-color-neutral-100`, `--gw-radius-12`, padding `--gw-space-16`, gap 16.
Top row: a 60px mascot tile (`--gw-radius-8`, 0.5px `--gw-color-neutral-100`, the image at 70px, centred and
clipped) then the name (`--gw-text-body-16-sem`) over a one-liner (`--gw-text-body-12-med`,
`--gw-color-neutral-400`). Below: the description, `--gw-text-body-14-reg` in `--gw-color-neutral-600`, three
lines, never a fourth. A 24px add button sits at top 12, right 12: `--gw-color-neutral-25`, 0.5px stroke, a 12px plus.

- **Selected:** only the button changes, to `--gw-color-primary-500` with a white check. The card does not.
- **Premium:** border `--gw-color-primary-100` and `--gw-shadow-s2`, and the one-liner slot carries the price,
  `From $1,000 / mo`, in `--gw-color-primary-500`.

Off-token, reported: the button radius is 5.33px in Figma (built as `--gw-radius-4`).

## `agent-section-header`

`--gw-text-h7` heading, `--gw-space-12` gap, an optional `Premium` pill (`--gw-color-primary-25` fill, 0.5px
`--gw-color-primary-100` stroke, `--gw-text-body-12-med` in `--gw-color-primary-500`, 24px, full radius), and
the bundle button on the right. The button is 36px, `--gw-radius-8`, `--gw-text-button-14`, with a 1.5px
`--gw-color-neutral-100` stroke and a plus (`Add whole bundle`). When every agent in the bundle is selected it
becomes `--gw-color-primary-500` with white text and a check, reading `Added`; clicking it again removes them.

## `agent-filter-rail`

A 240px sticky column. The industry picker is a **custom dropdown**, not the browser's: the trigger is the 44px `--gw-color-neutral-25` field, and the list is a white `--gw-radius-12` panel with `--gw-shadow-s4`, 36px rows in `--gw-text-body-14-med`, a hover fill of `--gw-color-neutral-50`, a check on the selected industry and unavailable industries in `--gw-color-neutral-400`. Arrow keys, Enter and Escape work. The page has **no focus styling**, by Utsav's call. **Rows are tabs that scroll to their section; every section stays on the page, so there is no "All agents" row.** The row of the section in view is highlighted as you scroll. Search filters the cards across all sections and drops empty sections. An `Industry` label (`--gw-text-body-12-med`, `--gw-color-neutral-600`) over a 44px
select (`--gw-color-neutral-25`, 1px `--gw-color-neutral-100`, `--gw-radius-8`). Then `Category`: 36px rows,
`--gw-text-body-14-med`, a 16px icon and a count in `--gw-color-neutral-500`. The selected row is white with a
1px `--gw-color-neutral-100` stroke and `--gw-shadow-s2`; the others carry a `--gw-color-neutral-50` stroke so
they are invisible on the ground. The last row, `Build your own agent`, is coming soon and shows `Soon`
where the count would be. On phone the rail sits behind a `Filters` button.

## `agent-listing-panel`

A store-style **quick view**: a centered modal, 820px wide at most, over a `--gw-color-neutral-alpha-50-black`
backdrop (a bottom sheet at 94vh on phone). The header holds the bundle `badge`, the position (`4 of 31`) and
close. **Previous and next are 44px round white buttons outside the modal's left and right edges on desktop**
(`--gw-shadow-s3`); below 1000px they move into the header. They step through the agents in page order,
respect the search and wrap round; left and right arrow keys do the same.

The body has **two stacked parts**. The **upper part** is the picture (a 240px square) beside the name, cost line
(blue for premium), blurb, the **monthly volume stepper** (for agents with a credit cost: minus, a typed number
and plus, in steps of 50, with "about N credits"; the value is the same one the package builder's estimator
uses) and a full-width `Black` `Add to package`. Premium agents show a "Priced alone, outside the package tiers"
note in place of the stepper; the free agent has neither. The **lower part** sits on white, under a 1px
`--gw-color-neutral-100` rule: `How it works` as a `details` element (open on desktop, closed on phone) on the
left, and on the right the `Talk track` block (`--gw-color-primary-25`, always visible), a `Fits` row and the
dashed proof slot. Nothing is stated twice: the unit appears in the cost line only, and the bundle appears in the
header only. On phone the parts stack into one column.

## `agent-package-bar`

The package bag, in two forms that read the same selection. **Desktop: a summary card** in the sticky rail,
under the categories (chosen from the package bar wireframes, option P2). White, 1px `--gw-color-neutral-100`,
`--gw-radius-12`, `--gw-shadow-s2`, padding `--gw-space-12`. It holds: `Your package` and the agent count; a
row of mascots (28px, round, white ring, `+N` after seven); a 6px meter in `--gw-color-primary-500` showing the
tier's slots, with a line under it ("All slots used", "2 slots still open" or "2 extra agents at $175 each");
the recommended tier and its monthly price; "Priced separately" with the premium agents' total when any are
selected; a `Small` `Black` button `Build package`; and a `Clear` link. It appears with the first agent and
leaves when the package is empty. **Phone and narrow screens (1000px and below): a bottom bar**, `--gw-color-black`,
`--gw-radius-16`, `--gw-shadow-s4`, with the count, the tier and price, `Clear` and a white `Build package`
button. `Clear` empties the package and shows a five-second `Undo` toast that restores it.

## `agent-package-builder`

A modal sheet (bottom sheet on phone). Three figures (monthly, agents, credits), an upgrade nudge, a tier
comparison with the best price marked, an optional "priced separately" list and a credit estimator with one
volume field per agent. **The pricing maths is the original file's, unchanged:** Starter 3 agents $600 /
1,000 credits, Growth 6 / $1,100 / 2,500, Scale 12 / $2,100 / 6,000; $175 and 350 credits per extra agent;
credit packs $150 per 1,000; lead-gen agents priced alone from $1,000. `Send proposal` is not wired, as in
the original.

## Version 2 (`/internal/staging/agent-store-v2`)

Same page, cards, modal and builder; a different frame, at Utsav's request. Version 1 stays live beside it. Both versions use **100px page margins** (a 1240px column on 1440) and the right-hand package panel is **320px wide** with larger type, 32px mascots, 36px tier rows and a 44px `Build package` button. The "Build your own agent" tab and section are removed from version 2 and version 3.

### `agent-category-tabs`

One sticky bar across the whole 1200 column (`top: 0`, on the page ground, 1px `--gw-color-neutral-100` underneath).
The **navbar is not sticky**: it sits over the hero and scrolls away with the page, so the bar is the only thing
that stays. On the left, **every category as an underlined tab**, all visible with no sideways scrolling at 1440:
48px high, `--gw-text-body-14-med`, `--gw-color-neutral-600`, a count in `--gw-color-neutral-400`, and a 2px
`--gw-color-black` underline on the tab in view. Tabs scroll to their section and every section stays on the page;
the active tab follows you as you scroll. On the right of the bar sits the **industry dropdown** (184px, the same
custom list as version 1, with an inline "Industry" label). **Search is hidden** in this version; the markup is
kept so it can come back. On phone the industry picker and the tab strip stack and the strip stays sticky, with a
fade when it scrolls sideways.

### `agent-package-panel`

The package builder, **sticky in the right column** (`top: 72px`, under the bar), always visible: empty at first
("Add agents to build a package. The tier and price update as you go.") with a disabled `Build package`. With
agents it lists them (24px round mascot, name, a remove control), then the slots meter and note, a **tier ladder**
(Starter, Growth, Scale with their base prices, the best price lit in `--gw-color-primary-25` with a
`--gw-color-primary-100` stroke), the recommended tier and monthly total in `--gw-text-h6-bold`, "Priced
separately" for premium agents, `Build package` and `Clear` (with the same Undo toast). Hidden on phone, where
the bottom bar takes over.

## Version 3 (`/internal/staging/agent-store-v3`)

Version 2 with one change: the category tabs become a **pill toggle**, `agent-category-toggle`. A white capsule
(1px `--gw-color-neutral-100` stroke, `--gw-radius-full`, `--gw-shadow-s2`, 4px padding) holds a pill per category:
36px high, 12px side padding, `--gw-text-body-14-med` in `--gw-color-neutral-700`, a count in
`--gw-color-neutral-400`. **The pill in view is `--gw-color-black` with white text.** Pills still scroll to their
section and the active one follows you down the page. The industry dropdown sits at the right end of the bar, above
the package panel, with a white fill. From the pill toggle on the Agent Store idea board.

## Known gaps

- None of the six is a Figma component yet.
- The 33 one-liners are drafted from each blurb and are not in the source data. They need review.
- `access` codes (M, R, W, D, P) and the `day1` flag are in the data and deliberately not shown.
- The category list in Figma ends with `Build your own agent` and a count of 4. The 4 has no data behind it,
  so the row shows `Soon`.
- Figma writes `All Agents`, `Add Whole Bundle` and `Build Your Own Agent` in title case; the page uses
  sentence case per `foundation/voice.md`.
- The page `<title>` and description are proposals awaiting sign-off.
- No favicon set or social card yet: layout pass only, and `/internal/*` cannot be scraped anyway.
