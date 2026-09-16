# Slides — the deck shell

Every slide is the same four things stacked: the **ground**, the **title bar**, the **logo
mark**, and the **content card**. Layouts differ only in what goes inside the card. Get the
shell right and a new layout is half an hour; get it wrong and every slide is wrong at once.

**Slide is 1920 × 1080.** Do not change it unless asked.

---

## Where these numbers come from, and how much to trust them

Three tiers. They are not equally reliable and the spec says which is which, because a
transcribed number presented as a measured one is how the dashboard surface shipped a dozen
wrong values.

| Tier | Source | Trust |
|---|---|---|
| **Figma-measured** | Read off node properties in `GW-Slides` (`R9JgCTytCKSgyBL4efP7hz`) | Authoritative. R0 — Figma outranks everything |
| **Export-derived** | Read off the shape tree of the Manufacturing deck's Google Slides `.pptx` export at 960 × 540, then doubled | Good. The export IS that Figma file two conversions downstream, and where both exist they agree — but Slides re-fits text, so type is the weak spot |
| **Authored** | Built from tokens because neither source has it | A first draft. Marked `AUTHORED` wherever it appears |

The one place the two known sources disagree is type, and it disagrees for a knowable reason —
see *Why your export looks wrong* below.

---

## The ground

`assets/slides/slide-ground.svg` — Figma node `1137:614`, **Figma-measured**.

Three layers:

| Layer | Value |
|---|---|
| Base | `--gw-color-primary-500`, full frame |
| Lattice | 40px pitch, 1px line, drawn on half-pixel offsets so it stays crisp; `opacity: 0.3` |
| Lattice fill | Radial gradient, `--gw-color-primary-500` at centre → `white` at edge. Centre `(922.746, 540)`, elliptical radii `1951.42 × 1881.56` |

**The gradient is on the grid, not behind it.** So the lines are `primary-500` on `primary-500`
mid-frame — invisible — and ramp toward white as they approach the corners. The grid appears to
emerge from the edges. At the far corner the gradient is ~55% of the way to white, giving the
lines an effective alpha of ~0.17.

Rebuild it in CSS from `--gw-slide-grid-*`; a masked grid is exact here:

```css
.slide-ground { background: var(--gw-color-primary-500); position: relative; }
.slide-ground::before {
  content: ""; position: absolute; inset: 0;
  background-image:
    linear-gradient(to right,  #fff var(--gw-slide-grid-line), transparent var(--gw-slide-grid-line)),
    linear-gradient(to bottom, #fff var(--gw-slide-grid-line), transparent var(--gw-slide-grid-line));
  background-size: var(--gw-slide-grid-pitch) var(--gw-slide-grid-pitch);
  background-position: -0.5px -0.5px;
  opacity: var(--gw-slide-grid-opacity);
  mask-image: radial-gradient(
    var(--gw-slide-grid-radius-x) var(--gw-slide-grid-radius-y)
    at var(--gw-slide-grid-origin-x) var(--gw-slide-grid-origin-y),
    transparent 0%, #000 100%);
}
```

The SVG exists for the `.pptx` path, which has no CSS. **Keep the two in step** — if you change
the pitch or the gradient, change both, or a deck and its export stop matching.

The radial centre is `922.746`, not `960`. It is off-centre by 37px in the source and that is
deliberate; do not tidy it to centre.

---

## The title bar

**Export-derived.** The title sits directly on the ground, outside the card.

| | 1 line | 2 lines |
|---|---|---|
| x | 40 | 40 |
| y | 38.2 | 38.2 |
| w | 1723.2 | 1523.2 |
| h | 86 | 205.4 |

Type: `--gw-text-slide-title` — 72px/1.2, weight 700, white. Left-aligned, always.

**A two-line title pushes the card down**, it does not overlap it. See the card table below.
There is no three-line case in either source; if a title needs three lines the title is too long.

---

## The logo mark

**Export-derived.** `assets/logo/gushwork-symbol-white.svg`, 38.7 × 38.7 at `x=1815.6 y=61.8`.

That leaves a 65.7px right margin, which does **not** match the 40px the title uses. Both
sources agree on it, so it is intentional, not drift — the mark is optically aligned to the
title's cap height rather than to the title's box.

The mark appears on every slide **except the cover**, where the wordmark is used instead.

---

## The content card

**Export-derived.** A white `roundRect` on the ground. This is where all content lives.

| Variant | x | y | w | h | Radius |
|---|---|---|---|---|---|
| Standard | 20 | 178.2 | 1880 | 884 | `--gw-radius-36` |
| Below a 2-line title | 20 | 282.8 | 1880 | 777.3 | `--gw-radius-36` |
| Case study (full-bleed inner image) | 20 | 176 | 1880 | 884 | `--gw-radius-32` |

Fill `--gw-color-white`. Border `--gw-slide-card-border` (1.3px) `--gw-color-neutral-200`.

Every variant insets **20px from the left, right and bottom slide edges** — the y and h are what
move. The 1.3px border is measured, not a rounding artefact of a 1px stroke; keep it.

The case-study variant's `--gw-radius-32` against the standard `--gw-radius-36` is a 4px
difference nobody will see, and it is in the source. Use 36 unless you are reproducing that
slide specifically.

### Radii — all five map onto existing tokens

Google Slides stores a roundRect radius as a proportion of the shorter side, so these arrive as
opaque `adj` values. Resolved:

| Element | `adj` | Resolves to | Token |
|---|---|---|---|
| Content card | 4035 | 35.7px | `--gw-radius-36` |
| Case-study card | 3511 | 31.0px | `--gw-radius-32` |
| Media well | 3456 | 26.9px | `--gw-radius-28` |
| Step card | 9314 | 41.2px | `--gw-radius-40` |
| Icon tile | 16667 | 14.3px | `--gw-radius-16` |

**Nothing here needed a new radius token.** The deck was on-system all along; the values were
just wearing an export's clothing. Use the token, never the resolved decimal.

---

## The 20px grid

Every inset and gap in the deck is 20, or 16 where it is vertical and inside another box:

- Card inset from slide edge: **20** on all four sides
- Media well inset from card edge: **20** horizontal, **16** vertical
- Gap between step cards: **19.4** → use `--gw-slide-gap` (20)
- Cover inner frame inset: **40** (Figma-measured, and genuinely different — see `cover.md`)

Build to the tokens, not the decimals.

---

## Type — the ramp, and the one gap in it

Google Slides works in points at 960 × 540. At 1920 the conversion is `1pt = 2.667px`. Doubling
that way lands most steps exactly on the shared ramp:

| Deck | → px | Token |
|---|---|---|
| 8.25pt | 22 | `--gw-text-body-22-*` — exact |
| 12pt | 32 | `--gw-text-h5` — exact |
| 8pt | 21.33 | `--gw-text-body-22-*`, off by 0.67 |
| 10pt | 26.67 | `--gw-text-h6`, off by 0.67 |
| 16pt | 42.67 | `--gw-text-h3`, off by 1.3 |
| 11pt | 29.33 | **no token** — nearest is `h5` (32), off by 2.7 |
| 9pt | 24 | **no token** — nearest is `h6` (26), off by 2 |
| 27pt | 72 | `--gw-text-slide-title` — added for this surface |
| 32pt | 85.33 | superseded — Figma measures the cover at **90px** |

**Snap to the token.** The sub-pixel differences are Slides' rounding, not design intent.

The two real gaps — 11pt and 9pt — are **findings, not licences to hardcode**. Both sit between
existing steps. Until they are measured in Figma, use `--gw-text-h5` for the 11pt row heading
and `--gw-text-h6` for the 9pt footnote, and say in one line that you snapped.

`--gw-text-slide-title` at 72px is **export-derived and still owes a Figma measurement** — it is
the one number in the shell that has not been read off a node. The cover, which has been, came
back 90px against the export's 85.33px, so expect 72 to move too.

---

## Why your export looks wrong (it isn't)

A deck built here renders in **Vert Grotesk Display**. Push it through `.pptx` or Google Slides
and it renders in **Plus Jakarta Sans**.

That is correct behaviour. Vert Grotesk is a custom face; Google Slides cannot load one, so the
export substitutes. `--gw-font-slide-display` names both in that order for exactly this reason.

**Do not "fix" a deck that came back in Plus Jakarta Sans.** It is the fallback doing its job.
The Figma cover node proves the direction of travel: it is set in `Vert Grotesk Display`
Semibold, and Plus Jakarta Sans appears nowhere in the source — only downstream of an export.

The same round-trip is what introduced the grey drift below, and it flipped the cover eyebrow to
uppercase against the voice rule. Treat the export as a rendering of the design, never as the
design.

---

## The grey drift — snap all seven

The export carries seven colours with no token. All seven are swatches from the Google Slides
colour picker: someone reached for the colour grid instead of the palette.

| Export | Build instead | Note |
|---|---|---|
| `#666666` | `--gw-color-neutral-600` | |
| `#999999` | `--gw-color-neutral-400` | |
| `#CCCCCC` | `--gw-color-neutral-200` | |
| `#D9D9D9` | `--gw-color-neutral-200` | Same target as `#CCCCCC` — they were never distinguishable |
| `#434343` | `--gw-color-neutral-850` | |
| `#EFEFEF` | `--gw-color-neutral-100` | |
| `#000000` | `--gw-color-black` | **R4** — never raw black |

Ruled by Utsav, 7 Sep 2026. Snapping shifts colours slightly against decks already in
circulation; that is accepted, and the drift is recorded here so the next person can see why
their old deck differs.

The other nine colours in the export were already exact tokens — `white`, `black`,
`primary-500`, `primary-600`, `neutral-700`, `neutral-200`, `primary-25`, `neutral-50`, and
`secondary-500`. The palette was mostly being followed. It was the greys that slipped.

Also drop the 16 stray `Calibri` runs. They are a default leaking through, not a typeface choice.
