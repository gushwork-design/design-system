# Slide-deck template

The base for every Gushwork deck. Eleven layouts at 1920 × 1080, on the blue blueprint ground.
The reference build is the manufacturing sales deck, and it doubles as the layout library.

```bash
./render.sh          # -> out/deck.pdf and out/slide-01..11.png at true 1920x1080
npm install          # once
node build-pptx.mjs  # -> out/deck.pptx, editable
```

`render.sh` needs Google Chrome and, on the first run, a network connection: Phosphor icons load
from the jsDelivr CDN. Fonts, tokens and assets all come from the repo — the template owns no
copies.

## Using it

Copy the folder, keep the slides you need, delete the rest, refill the copy:

```bash
cp -r templates/slide-deck templates/<your-deck-slug>
```

**Two things to swap on every new deck:**

1. **The cover's site ghost.** `.cover-ghost` loads a screenshot of the *prospect's* homepage.
   The example is Machine Tool Builders'. Shipping another company's site on a new deck is a
   real error, not a cosmetic one — replace it, or delete the layer.
2. **The build stamp.** The `gushwork-build:{...}` comment at the top lists the components used.
   Trim it to what your deck actually uses, and keep the `AUTHORED` layouts in the list — they
   are the entries most likely to take a breaking bump.

## The three output paths are one build

HTML is the source. The `.pptx` is generated from the same measured geometry. The Google Slides
deck is that `.pptx` uploaded through the Drive connector with conversion left on.

| Path | Face | Notes |
|---|---|---|
| HTML, PDF, PNG | Vert Grotesk Display | Exact. Use for anything you present or send as a PDF |
| `.pptx` | **Plus Jakarta Sans** | 55 real text runs — editable, not flattened |
| Google Slides | **Plus Jakarta Sans** | Upload the `.pptx`; Slides converts it natively |

**The substitution on the last two is correct.** Vert Grotesk is a custom face and neither
PowerPoint nor Google Slides will load one. See R21 in `DECISIONS.md` before reporting it.

## Viewer chrome vs the design

The body padding, the drop shadow on each frame, and the fit-to-viewport scale are **viewer
chrome**, not design. `?export=1` drops all of it and renders 1:1; `?export=1&slide=N` isolates
one slide, which is how `render.sh` gets exact 1920 × 1080 PNGs.

Never scale the slide's own units to fit something. Only the `--s` transform changes.

## Coordinates — the one trap

`exports/slides/` records every number in **slide** coordinates. The elements inside `.card` are
positioned **card-relative**, so they carry the card's content origin subtracted:

```
x - 21.3        y - 179.5   (standard card)
                y - 284.1   (below a two-line title)
```

Paste a slide coordinate straight into a card-relative property and the whole card's contents
shift down and right together — which looks plausible enough to survive a screenshot. It was
caught here by comparing computed geometry against the spec, not by looking.

## What comes from where

| | |
|---|---|
| Colour, radius, type, slide geometry | `foundation/tokens.css` — the `SLIDES` block |
| Fonts | `../../fonts/` — Vert Grotesk, Plus Jakarta Sans, Caveat, Inter |
| Ground, well texture, cutouts, logos | `../../assets/slides/` |
| Gushwork mark and wordmark | `../../assets/logo/` |
| Icons | Phosphor via CDN; `../../assets/icons/` for the local set |
| Measured specs | `exports/slides/` |
| Standing rulings | `DECISIONS.md` — R21, R22, R23 are this surface's |

## Before you call an edit done

- **Six layouts are measured; five are `AUTHORED`.** `exports/slides/layouts.md` says which.
  Say which you used when you hand the deck over.
- **The media well is a texture-filled frame, not an image slot.** A rectangular photo dropped
  in as the fill loses the texture and reads flat. Use the full-bleed card instead.
- **Max four step cards.** Five will not fit at the measured pitch.
- **Check nothing overflows the slide.** The cover's texture layers overflow deliberately and
  are clipped by `.cover-frame`; nothing else should. Setting an image's width and letting the
  height run natural is how the pricing table first overran the slide by 185px.
- The ground exists twice — CSS in the HTML, SVG for the `.pptx`. **Change one, change both.**
