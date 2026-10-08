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

## `coverage-diagram`

Two 610 × 666 cards (`.diag`, `.stop`, `.cursor`, `.tip`), Coverage (`1971:69495`). A dot grid (3px dots, 22px
pitch, `--gw-color-neutral-100`), a 2px centre line (dashed `--gw-color-neutral-500` for the competitor, solid
`--gw-color-primary-500` for Gushwork) and five stops in a column. Stops are 40-radius pills; the search stop is
353 wide and lifted (S3); a dead end is red-25 / red-100; a conversion is primary-500 / primary-600.
**Off-token:** every gap between stops measures 69px (one measures 71); the scale has 60 and 80. Figma pins the stops
by hand; here they flow, which measures the same and lets phone reuse the markup.

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

## `page-mock`

A web page drawn in HTML inside the picture well, in place of a screenshot (`.pgmock`, `.pg-bar`, `.pg-body`, `.pg-blk`): a `neutral-50` browser bar with three dots and the address, a title in `h8-bold`, then 36-high blocks in `primary-25` with a `primary-100` ring and `primary-600` labels in `body-12-sem`, each with a 14px icon. One block may end in a small `primary-500` button. It is 84% of the well wide (92% on phone), starts 24 below the top and is clipped at the bottom by the well, as the pictures were. Every size is a ramp step; no value is off-token. New on the Gushwork vs Athena page, pending review.

## `steps-card`

Who does each step, as a card (`.steps-card`, `.steps`, `.steps-h`, `.eyebrow--green`): the `card--pad` shell with a header, a divider, a `body-14-med` caption and 64-high rows, each a `body-18-med` step and a pill naming who does it (grey pill for the competitor side, `primary-25` for Gushwork, `green-50` for the reader). Rows are split by a 2px `neutral-50` rule. New on the Gushwork vs Athena page, pending review.

## `rating-breakdown`

Five rows beside a review rating (`.dist`): the star level in `body-12-med`, a bar 8 high on `neutral-100` filled to the share in a ramp colour (`green-500`, `green-400`, `yellow-500`, `orange-500`, `red-500`), and the percentage right-aligned. 280 wide on desktop, full width on phone. The bar grows with a `scaleX` as the card arrives. New on the Gushwork vs Athena page, pending review.

## `cta-bar`

Black (`--gw-color-black`), 1240 × 136, radius 20, padding 40 (`.bar`); the line is `h5-bold` in white, the
button is the Large blue one at 56 high. Inside Page depth.

## `cta-comparison-card`

A scaled copy of the table inside the closing CTA (`.ccard`), clipped by the frame: Figma `1971:62352`, drawn at
0.729 of 1:1. **Off-token:** 20px display, 13px / 18px Inter, a 11px outer ring, radius 15, padding 44 — that scale,
rounded. None is a ramp step.

## Dark mode

None of these has a dark form. The page is a marketing page on a white ground, as the ad-page template is.
