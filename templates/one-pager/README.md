# One-pager template

A single-page company overview, 640 × 1036 px (the Figma frame size, screen-first). Text-selectable PDF.

Source: Figma **GW-Document** (`m12fa6VMdgFsQ0KS4uszXr`), node `319:337` `gushwork-one-pager`.

```bash
./render.sh          # -> one-pager.pdf
```

Needs Google Chrome. Fonts, tokens and logo come from the repo; the icons, investor logos and
grid are in `assets/` (exported from the Figma node).

## Using it

```bash
cp -r templates/one-pager templates/<your-doc-slug>
```

Copy is the live Gushwork overview. Swap the strings, keep the structure: hero, "Why customers
trust us" (two cards + backers strip), "What we believe" (three tiles), "by the numbers" (three
stat cards), industry pills.

## Gotchas

- The grid is `assets/grid.png`, rasterised from the Figma vector: the vector's per-square
  gradients rendered as grey bands in the PDF.
- "business partner" is inline SVG text, not `background-clip:text`, which prints as a solid
  blue block in the PDF.
- One fixed-height sheet with `overflow:hidden`: overflow is silent. After a copy change, check
  the lowest ink against the card's bottom edge.
