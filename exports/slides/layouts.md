# Slides — the layout catalogue

Eleven layouts. Six are measured from a real deck; five are authored from tokens because no
source has them. **The table says which, and you must repeat that distinction to whoever you
hand the deck to.** An authored layout is a good first draft, not a spec.

Every layout except the cover and the closer is the same shell — ground, title bar, logo mark,
content card — differing only in the card's contents. Read `deck.md` first; it is most of the
work.

| # | Layout | Source | Use it for |
|---|---|---|---|
| 1 | **Cover** | Figma-measured | Slide 1. Own spec: `cover.md` |
| 2 | **Split card** | Export-derived | Lead paragraph left, media well right. The workhorse |
| 3 | **Feature list** | Export-derived | 4–5 icon rows against a media well |
| 4 | **Step row** | Export-derived | 3–4 equal cards across. Process, cadence, phases |
| 5 | **Full-bleed card** | Export-derived | One image filling the card. Case studies, screenshots |
| 6 | **Pricing** | Export-derived | Heading, subhead, wide table, footer stat |
| 7 | **Section divider** | `AUTHORED` | Breaking a long deck into acts |
| 8 | **Big number** | `AUTHORED` | One statistic, nothing else |
| 9 | **Testimonial** | `AUTHORED` | A customer quote with a metric |
| 10 | **Two-up compare** | `AUTHORED` | Before/after, us/them |
| 11 | **Closer** | `AUTHORED` | "Thank you". Last slide |

The closer is marked authored, but a *"Thank You!"* slide does exist on the `Sales Pitch` page
of `GW-Slides` — it has simply not been measured yet. **Measure it before building one**; it is
the cheapest upgrade available in this folder.

---

## 1. Cover — Figma-measured

See `cover.md`. Own geometry, own texture stack, own emphasis rule. Nothing about it
generalises.

## 2. Split card — export-derived

The default content slide. Lead paragraph on the left, media on the right.

| Element | x | y | w | h |
|---|---|---|---|---|
| Media well | 40 | 194 | 779 | 852.3 |
| Lead paragraph | 69 | 227.5 | 694.6 | 122.8 |

Media well: `--gw-radius-28`, inset 20 horizontal / 16 vertical from the card edge.

Lead paragraph type is `--gw-text-h6` (26px) at weight 500, `--gw-color-neutral-850`, with the
key phrase in weight 600 `--gw-color-primary-500`. Line-height 1.4.

**That inline blue phrase is the body-copy counterpart to the cover's white-on-60%-white
emphasis.** One phrase per paragraph. The reference deck uses it twice and both times it is the
outcome, not the mechanism: *"show up where buyers search"*, *"raised $10M+"*.

## 3. Feature list — export-derived

Icon rows to the right of a media well. The reference slide runs five.

| Element | x | y | w | h |
|---|---|---|---|---|
| Icon tile | 893.4 | 253.7 | 86 | 86 |
| Row heading | 985.3 | 247.1 | 735.1 | 35.5 |
| Row body | 986.3 | 293 | 735.1 | 25.8 |

Icon tile: `--gw-radius-16`, 1px `--gw-color-neutral-200` border, no fill, glyph 45.6 × 45.6
centred (inset 20.2). All five tiles share `x=893.4`.

**There is no row pitch — and that is a finding, not a spec.** The five tiles sit at y 253.7,
410.9, 588.1, 774.5, 922.5, giving pitches of 157.2, 177.2, 186.4, 148.0. Someone spaced them
by eye around wrapping copy.

Do not reproduce those four numbers. Lay the rows out as a flex column with a **fixed 40px gap**
and let each row take its natural height — that is what the irregular pitches were approximating.
Say in one line that you regularised it.

Heading `--gw-text-h5` (snapped from 29.33 — say so). Body `--gw-text-body-22-reg` in
`--gw-color-neutral-600`, line-height 1.15.

**The tile is a hairline square, not a filled circle.** No blue chip, no coloured disc.

## 4. Step row — export-derived

Three or four equal cards across the card. Cadence, phases, process.

| Element | Value |
|---|---|
| Card | 441.7 × 463.8, `--gw-radius-40`, fill `--gw-color-primary-25` |
| Pitch | 461.1 → gap 19.4, build `--gw-slide-gap` |
| First card x | 51.3 |
| Eyebrow | x 78.6, y 344.7 |
| Heading | x 78.6, y 401.9, w 351.6 |
| Footnote | x 81, y 630.3, w 388.7 |

Eyebrow is `--gw-text-body-22-sem` **uppercase** in `--gw-color-primary-500` — the one place
uppercase is correct on this surface, because it is a micro-label, not a heading. Heading
`--gw-text-h5`. Footnote `--gw-text-body-22-reg` in `--gw-color-neutral-700`.

Four cards fit. They sit at x 51.3, 512.4, 973.5, 1434.6, so the last right edge is 1876.3
against a usable inner edge of 1880 — 3.7px to spare. The row is inset 31.3 on the left and
23.7 on the right, so it is very slightly off-centre in the card; both sources agree, so leave it.

Five cards at this pitch would not fit. Four is the maximum.

Below the row the reference deck runs a centred label between two hairlines — see
`elements.md`, *Rule label*.

## 5. Full-bleed card — export-derived

One image filling the card. The card takes `--gw-radius-32` here rather than 36.

| Element | x | y | w | h |
|---|---|---|---|---|
| Image | 40 | 197.8 | 1816.8 | 862.2 |

Inset 20 horizontal, 21.8 top. The image carries its own rounding; do not add a second radius.

Use it when the artefact *is* the argument — a ranked SERP, a dashboard, a chart. Not as a
dumping ground for a screenshot you have not cropped.

## 6. Pricing — export-derived

| Element | x | y | w | h |
|---|---|---|---|---|
| Heading | 134.2 | 294.8 | 801 | 51.8 |
| Subhead | 134.2 | 366 | 1045.4 | 32.4 |
| Table | 42.2 | 418 | 1800.8 | 567.4 |
| Footer stat | 407 | 937.8 | 979.4 | 142.2 |

Heading `--gw-text-h3` (snapped from 42.67). Subhead `--gw-text-h6` — saving in weight 700
`--gw-color-primary-500`, the qualifier in weight 500 `--gw-color-neutral-600`. Footer stat
`--gw-text-h6` weight 700, centred, `--gw-color-black`.

The footer stat is the "650+ businesses" line. **It is the proof, so it goes last and it goes
centred** — the only centred text on any content slide.

## 7. Section divider — `AUTHORED`

Ground only, no card. Centred: an eyebrow, then a heading at `--gw-text-slide-title`, white.

Pick one divider style and hold it for the whole deck. Mixing a numbered divider with a plain
one inside one deck reads as two decks stapled together.

## 8. Big number — `AUTHORED`

Ground only. One figure at `--gw-text-slide-cover` (90px) in white, one line of context beneath
at `--gw-text-h6` in `--gw-color-neutral-alpha-60-white`.

Nothing else on the slide. If it needs a second number it is layout 4.

## 9. Testimonial — `AUTHORED`

Card, with a portrait well left (`--gw-radius-28`) and the quote right at `--gw-text-h3`,
`--gw-color-black`. Attribution beneath at `--gw-text-body-22-med`, `--gw-color-neutral-700`.

Real person, real company, real number — the standing rule. No stock faces, no invented logos.
`assets/slides/investor-logos.png` and `press-cards.png` hold the real ones.

## 10. Two-up compare — `AUTHORED`

Two step cards at double width — 921.4 wide on the same 20px gap — one `--gw-color-primary-25`,
one `--gw-color-neutral-25`. Same internal structure as layout 4.

## 11. Closer — `AUTHORED`, and measurable

Ground only, no card, no logo mark. One centred line at `--gw-text-slide-title` in white.

A real one exists in `GW-Slides` on the `Sales Pitch` page. **Measure it rather than building
from this note.**
