# Slides — elements

The parts layouts assemble from. Read `deck.md` for the shell and `layouts.md` for where these
sit. Everything here is **export-derived** unless marked otherwise.

---

## Media well

**A texture-filled frame, not an image slot.** This is the easiest thing to get wrong on the
surface, and the first pass at this spec got it wrong.

| Property | Value |
|---|---|
| Box | 779 × 852.3 at `x=40 y=194` |
| Radius | `--gw-radius-28` |
| Inset from card | 20 horizontal, 16 vertical |
| Frame fill | `none` on the roundRect itself |
| Texture | `assets/slides/well-texture.png` — pale dashed graph paper on a `primary-25`-ish ground, filling the frame |
| Content | a **transparent cutout** over the texture, `object-fit: contain`, never cropped |

The source's roundRect carries `fill=none` and the texture PNG sits inside it, with the content
cutout layered on top. `assets/slides/phone-serp.png` is the worked example: a hand holding a
phone showing a SERP where *Your Brand* ranks first, cut out on transparency.

**Drop a rectangular photo straight in as the fill and you lose the texture**, and the slide
reads flat — the well stops looking like a frame and starts looking like a pasted screenshot. If
all you have is a rectangular image, use the full-bleed card layout instead.

The texture is the **third** grid in the system, after the ground's 40px solid white lattice and
the cover's 25.6px dashed `primary-400` one. Pale, dashed, roughly 28px pitch. Three grids,
three jobs; never substitute one for another.

No border, no shadow. The card's own border already separates it from the ground; a second
outline on the well makes the slide look like a form.

---

## Icon tile

| Property | Value |
|---|---|
| Box | 86 × 86 |
| Radius | `--gw-radius-16` |
| Border | 1px `--gw-color-neutral-200` |
| Fill | none |
| Glyph | 45.6 × 45.6, centred (inset 20.2) |

A **hairline square with no fill.** Not a blue chip, not a filled circle, not a coloured disc.
Glyphs are Phosphor from `assets/icons/` — regular weight at this size, not fill.

---

## Step card

| Property | Value |
|---|---|
| Box | 441.7 × 463.8 |
| Radius | `--gw-radius-40` |
| Fill | `--gw-color-primary-25` |
| Border | none |
| Eyebrow | x 78.6, y 344.7 — inset 27.3 from card edge |
| Heading | x 78.6, y 401.9, w 351.6 |
| Footnote | x 81, y 630.3, w 388.7 |

The largest radius on the surface, on the palest fill. Nothing else in the deck is
`primary-25`, which is what makes a step row read as one unit.

Internal order is **eyebrow → heading → footnote**, and the footnote sits low with a deliberate
gap above it — 228 from the heading's top. Do not close that gap up; it is what stops four
cards reading as four paragraphs.

---

## Eyebrow (micro-label)

`--gw-text-body-22-sem`, **UPPERCASE**, `--gw-color-primary-500`, line-height 1.4.

Uppercase is correct here and nowhere else on this surface. It is a micro-label — `MONTHLY`,
`BEGINNING`, `QUARTERLY`, `ONGOING UPDATES` — not a heading. The standing sentence-case rule
governs headings, titles and buttons; a token-sheet-style micro-label is the documented
exception.

**No coloured dot, ever.** If a label needs status, it takes a Phosphor glyph at 21–26px in the
matching weight: `ph-fill ph-broadcast` live, `ph-fill ph-sparkle` new, `ph-fill ph-check-circle`
shipped.

---

## Feature row

Icon tile, then a two-line text block to its right.

| Part | Type | Colour |
|---|---|---|
| Heading | `--gw-text-h5` — snapped from 29.33, say so | `--gw-color-black` |
| Body | `--gw-text-body-22-reg`, line-height 1.15 | `--gw-color-neutral-600` |

Heading box `x=985.3 w=735.1`, body `x=986.3 w=735.1`. The 1px x difference is export noise —
align both to 985.

Lay rows out as a flex column with a **40px gap**, not on the reference deck's irregular
pitches. See `layouts.md`.

---

## Lead paragraph

The left-hand block on a split card. `--gw-text-h6` (26px) weight 500,
`--gw-color-neutral-850`, line-height 1.4, box `694.6` wide.

**One phrase inside it goes weight 600 `--gw-color-primary-500`.** That is the body-copy
emphasis mechanism, mirroring the cover's white-on-60%-white. One phrase per paragraph, and it
must be the outcome rather than the mechanism — the reference deck lifts *"show up where buyers
search"* and *"raised $10M+"*, not *"automated AI SEO engine"*.

---

## Rule label

A centred micro-label with a hairline running out to each side. Used under a step row to name
the group.

| Part | Value |
|---|---|
| Label | `--gw-text-body-22-reg`, centred, `--gw-color-neutral-400` |
| Rules | 1px `--gw-color-neutral-200`, 814.8 long each side |
| Gap | Label box 153.2 wide, centred at x 883.4 |
| Baseline | Rules at y 892.8, label at y 880.2 |

The reference deck sets this label at 18.67px, below the 22px floor. **Build it at
`--gw-text-body-22-reg` and let the rules absorb the difference.**

---

## Press card row

`assets/slides/press-cards.png` — CB Insights, The Economic Times, TechCrunch, Financial
Express. Real mentions, flattened into one image in the source.

Each card is white, `--gw-radius-16`-ish, with the outlet's logo above a two-line quote in which
the claim is bold. One card is rotated ~2° out of line, which is the only playful geometry in
the deck.

It ships as a flat PNG, so **it cannot be re-typeset.** If the copy needs to change, rebuild the
row as four real cards from the `elements` above rather than editing the bitmap. Do not
fabricate an outlet or a quote.

---

## Investor logo strip

`assets/slides/investor-logos.png` — Lightspeed, Sparrow, BEENEXT, Seaborne Capital Partners,
B Capital Group. Real, and again flattened.

Five logos in a row, each in its own white box, at consistent optical height rather than
consistent bounding box.

**Never redraw or invent a logo.** If a new investor or client needs adding, get the real file.

---

## Margin annotation — kept by ruling, 7 Sep 2026

The handwritten callout. `--gw-text-slide-annotation` — Caveat SemiBold 27px/1,
`--gw-color-primary-500`, rotated **4.6°**, paired with a hand-drawn arc: 1px
`--gw-color-primary-500`, box 66.8 × 204, rotated **68.8°**, pointing at what it annotates.

Ruled in: it is the one warm, human mark in an otherwise rigid deck. `Caveat` is in `fonts/`
under OFL for this purpose and this purpose only.

Three constraints, because this is the element most likely to be overused:

1. **One per slide. Never two.**
2. **It annotates something specific** — it points at a diagram, a number, a row. An annotation
   floating in white space is a decoration, and decorations are not in this system.
3. **It is never load-bearing.** If the deck fails without it, the point belongs in the lead
   paragraph.

It does not license a script face anywhere else — not on web, not on dashboard, not in a lead
magnet, and not for headings on this surface.
