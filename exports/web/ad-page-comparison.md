# Comparison ad page elements

**Status: pending review.** Nine new elements, built for `skills/gushwork-web/templates/ad-page-comparison/`
(PR #403). Measured from Figma GW Meta/Google Ads `O6g05YAT980r85VaDQha4h`, section `2356:19338`, desktop
`1971:61604`. **There is no phone frame in that Figma**; every phone value is derived from the ad-page template's
phone rules and is a choice, not a measurement. Until an element passes in Design System → Review, a page that
uses it must say it is unreviewed.

The page reuses, and so does not register: the navbar, the hero, the logo ticker, the FAQ accordion with its
ask-anything row, the footer CTA frame, `eyebrow`, `button`, and the gushwork logo — all from `templates/ad-page/`.
On phone, `comparison-rows` hands over to the ad-page template's own row cards (`.cmp-row`, `.cmp-pair`).

Every card is white with its 2px stroke drawn **inside** the frame, so each is an inset ring and the padding is
Figma's padding from the outer edge. The Gushwork side takes `--gw-color-neutral-100` and `--gw-shadow-s3`; the
competitor side `--gw-color-neutral-50`.

## `comparison-card`

Two cards, competitor left and Gushwork right (`.vs`, `.card`, `.card--shot`). Padding 12, a 79-high header strip
(padding 24: the wordmark, and an `eyebrow` pill), then a 586 × 377 display at radius 16 on `--gw-color-neutral-25`.
Used in Page depth (`1971:61687`) and Outcome (`1971:70105`). The competitor's mark is its name in the display
face; Figma draws it in a face the system does not own, so a real logo replaces the name.

**Variants**
- `Picture=Screenshot` (default): the picture from the table above.
- `Picture=Drawn page`: a web page drawn in HTML in the well (`.pgmock`, `.pg-bar`, `.pg-body`, `.pg-blk`): a `neutral-50` browser bar with three dots and the address, a title in `h8-bold`, then 36-high blocks in `primary-25` with a `primary-100` ring and `primary-600` labels in `body-12-sem`, each with a 14px icon. One block may end in a small `primary-500` button. 84% of the well wide (92% on phone), 24 below the top, clipped at the bottom by the well. Every size is a ramp step.
- `Picture=Drawn report, Footer=Chips`: the competitor's report in the well from `metrics-grid` (four tiles and the dashed bar), with two `eyebrow` chips in a row under the picture (`.chips`: padding 16 12 4, gap 8).
- Motion for the drawn variants, once and never looped: the blocks rise in turn, each icon scales in behind its block, and the button arrives and is pressed once; a block leans 2px on hover. The report's tiles rise in turn, whole numbers count up over 600ms, then the bar and the chips follow. See `foundation/motion.md`, Comparison landers.

## `coverage-diagram`

Two 610 × 666 cards (`.diag`, `.stop`, `.cursor`, `.tip`), Coverage (`1971:69495`). A dot grid (3px dots, 22px
pitch, `--gw-color-neutral-100`), a 2px centre line (dashed `--gw-color-neutral-500` for the competitor, solid
`--gw-color-primary-500` for Gushwork) and five stops in a column. Stops are 40-radius pills; the search stop is
353 wide and lifted (S3); a dead end is red-25 / red-100; a conversion is primary-500 / primary-600.
**Off-token:** every gap between stops measures 69px (one measures 71); the scale has 60 and 80. Figma pins the stops
by hand; here they flow, which measures the same and lets phone reuse the markup.

**Variants**
- `Label=Column, Align=Top, Highlight=Third-last stop` (default): the table above.
- `Label=Corner tag, Highlight=Last stop, Align=Centre`: the "With ..." label is a tag in the card's top-left corner (`.stop--tag`, 24 from the edges, padding 8 16, `body-14-med`, the logo at 16 high), out of the column, so the card has four stops and is about 100px shorter. Top padding 72; the blue highlight sits on the last stop; the Gushwork card's stops are centred vertically with equal top and bottom padding (70) on desktop. On phone the tag sits 12 from the corner and the top padding is 72.

## `metrics-grid`

The competitor's numbers, drawn in HTML so they stay tokens (`.metrics`, `.tile`, `.notrep`): a 2-column grid of
white tiles (label `body-12`, value `h6-bold`, one optional trend in green-500) and a dashed `neutral-200` bar for
the number they do not report. An illustration at 0.75 of the page, so type and padding are the nearest ramp steps
and not Figma's fractional 11.178 / 24.219 / 14.904.

## `rating-stars`

Five squares, 2px apart, a white star on each (`.tp`), at 20 or 24px. The rating, a bare number, sets the fill (4.2
fills four squares and a fifth by 20%) and, from its first digit, the colour. **Off-token:** `#E01C47`, `#91D868`
and `#00B975` are Trustpilot's, measured off Figma's assets; `#FF8622` (2 stars) and `#FFCE00` (3 stars) are
Trustpilot's published colours and **not measured**, since no 2- or 3-star review is drawn. The unfilled part is
`--gw-color-neutral-200`.

## `review-card`

A Trustpilot card (`.card--reviews`, `.prof`, `.rv`), Reviews (`1971:70271`): padding 8 8 40, a profile strip
(72 tile, `h7-bold` title, a 24-high star row and the score at `body-18-sem`) and four reviews (`rating-stars` at
20, the topic at 16 medium, the quote at `body-18-med`, a `body-14-reg` line). A 2px `neutral-50` divider sits between
reviews and takes no room: 20 above, 20 below. Reviews are quoted from the public page and never invented.

**Variants**
- `Layout=Stack` (default): the card above, the four reviews under one profile strip.
- `Layout=Rail and grid`: the reviews as a rail beside a grid (`.rv-layout`, `.rv-rail`, `.rv-cards`, `.rv-card`). The rail is a `card--gw` 300 wide, sticky under the navbar while the cards are read: the source tile and name, the rating in `h3`, the star row, the review count and the `rating-breakdown`. The reviews are four `card`s in two columns, each a star row with its topic, the quote in `body-18-med` and the reviewer line in `body-14-reg`. One column on phone, the rail first. It links nowhere: the source is named, not linked.

## `comparison-rows`

Nine rows, three equal columns (`.cmp3`), Head to head (`1971:62247`): 64-high rows, padding 20, a `neutral-25`
label column, a white competitor column with a 20px minus-circle, a `primary-25` Gushwork column with a 20px
check-circle in `primary-500`. A 1px `neutral-200` frame at radius 24. **Off-token:** each cell's ring is 0.75px so
the join reads 1.5px; Figma strokes 1.5px inside each cell, which would draw 3px. This is not the ad-page
template's comparison table: that one compares three columns and needs a 700 16px style this one does not.

## `plan-card`

A 40-padding card (`.card--pad`, `.ticks`, `.price`), Pricing (`2071:3021`) and Fit check (`2071:2947`): a header
strip or a title, a 2px divider, then a price (`h4`) or a list of 24px ticks at `body-18-med`. The icon carries the
colour (primary-500, red-500 or neutral-500); the text stays `neutral-900` or `neutral-500`.

**Variants**
- `Content=Price or ticks` (default): the card above.
- `Content=Steps` (`.steps-card`, `.steps`, `.steps-h`, `.eyebrow--green`): who does each step. The `card--pad` shell with a header, a divider, a `body-14-med` caption and 64-high rows, each a `body-18-med` step and a pill naming who does it: `eyebrow` for the competitor side, `primary-25` for Gushwork, `green-50` for the reader. Rows are split by a 2px `neutral-50` rule.

## `rating-breakdown`

Five rows beside a review rating (`.dist`): the star level in `body-12-med`, a bar 8 high on `neutral-100` filled to the share in a ramp colour (`green-500`, `green-400`, `yellow-500`, `orange-500`, `red-500`), and the percentage right-aligned. 280 wide on desktop, full width on phone. The bar grows with a `scaleX` as the card arrives. New on the Gushwork vs Athena page, pending review.

Used by the `Rail and grid` variant of `review-card`.

## `competitor-mark`

The competitor's name used as its logo (`.mark`): in a card's header strip, the table header, a coverage stop, a card top. Every `.mark` on a comparison page is the competitor's name.

**Variants**
- `Face=Display` (default): the name in the page's display face, `h6-bold` at the size of its context (`h7-bold` and `h8-bold` smaller). A real logo, if one is cleared, replaces it.
- `Face=Wordmark`: **off-system**, a third typeface, used only when a page asks for it. The name in a face close to the competitor's own logotype (for Athena, Space Grotesk Light), weight 300, at the same size as the default. Self-hosted: one latin woff2 in the page's folder (SIL Open Font License), never a call to a font service. Only the name is set in it; the words around it ("With", "Starter") keep the display face.

## `cta-bar`

Black (`--gw-color-black`), 1240 × 136, radius 20, padding 40 (`.bar`); the line is `h5-bold` in white, the
button is the Large blue one at 56 high. Inside Page depth.

## `cta-comparison-card`

A scaled copy of the table inside the closing CTA (`.ccard`), clipped by the frame: Figma `1971:62352`, drawn at
0.729 of 1:1. **Off-token:** 20px display, 13px / 18px Inter, a 11px outer ring, radius 15, padding 44 — that scale,
rounded. None is a ramp step.

**Variants**
- `Entrance=Clipped` (default): the card sits in the frame.
- `Entrance=Slides up`: as the closing call to action scrolls into view the card rises about 48px from beneath the frame's clip over 480ms, once, then its rows follow in turn. It keeps its own centring (`translateX(-50%)`) in the keyframes. This is a deliberate exception to the 8px and 320ms in `foundation/motion.md`, because the card has to cross its own clip; only opacity and transform move.

## Dark mode

None of these has a dark form. The page is a marketing page on a white ground, as the ad-page template is.
