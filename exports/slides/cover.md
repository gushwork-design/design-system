# Slides — the cover

**Figma-measured**, and the only slide in the deck that is a real component rather than a
one-off frame. Node `99:5280` (`cover-main-content`, variant `Image=yes`) in `GW-Slides`
(`R9JgCTytCKSgyBL4efP7hz`), page *Local Components*. A second variant `Image=Image3`
(`225:4022`) shares the shell and swaps the media.

Because this node exists, **the cover outranks every other spec in this folder**. Re-fetch it
before editing rather than trusting the numbers below to still be current.

The cover does not use the shared ground, the shared title bar, or the content card. It is its
own thing. Nothing on this page generalises to the other layouts.

---

## The shell

Frame `1840 × 912`, sitting at `x=40 y=40` — a **40px inset, not the 20px** the content card
uses. This is measured and real; do not normalise it.

| Property | Value | Token |
|---|---|---|
| Background | `#0070ff` | `--gw-color-primary-500` |
| Border | 4px solid `rgba(255,255,255,0.2)` | `--gw-slide-cover-border`, `--gw-color-neutral-alpha-20-white` |
| Radius | 32px | `--gw-radius-32` |
| Backdrop filter | `blur(12px)` | `--gw-slide-cover-blur` |
| Padding | 20px | |
| Layout | `flex column`, `items: start`, `justify: center`, `overflow: clip` | |

### The blur is allowed here, and only here

`backdrop-filter: blur(12px)` is bound on the node. The no-glass rule stands on product
surfaces — see the dashboard skill — but R0 says the measurement wins, and this measurement is
unambiguous. **Reaching for blur on a dashboard is still a mistake; reproducing it on the slide
cover is not.**

---

## The texture stack

Three decorative layers behind the text, in paint order. All three are cosmetic — if you are
short on time, the shell plus the text column already reads as the cover.

**1. Swoosh** — `assets/slides/cover-swoosh.svg`. A blurred vector (`2581.71 × 1754.51`,
carrying its own Gaussian filter), positioned `1892.49 × 1062.39` and centred on
`calc(50% - 57.51px) / calc(50% - 178.88px)`. It overflows the frame; the parent clips it.

**2. Site ghost** — `mix-blend-mode: overlay`, `opacity: 0.2`, `background-size: 3794.99px`,
anchored top-left, box `2156.2 × 1682.06`.

**This layer is a screenshot of the prospect's own website, not a texture.** The example in
`assets/slides/cover-site-ghost-example.png` is Machine Tool Builders' homepage, blurred to
near-abstraction by being scaled from 123 × 512 up to 3795px wide and knocked back to 20%
overlay. At that scale it reads as a faint architectural wash, which is why it is easy to
mistake for grain — the first pass at this spec did.

It is the single most personal thing on the cover: the prospect sees their own site behind
Gushwork's claim. **It is a per-deck slot, and shipping someone else's homepage on a new deck is
a real error, not a cosmetic one.** Replace it, or drop the layer — the cover reads fine without
it.

Screenshot the prospect's homepage at any width, save it small (the source is 123px wide), and
let the upscale do the blurring. Do not pre-blur it.

**3. Dashed lattice** — a wrapping row of `25.634px` squares, each with a `1.068px` **dashed**
border in `--gw-color-primary-400`, the whole layer at `opacity: 0.6`, right-aligned in a
`1538.03px` box centred vertically.

That dashed lattice is **not** the ground's grid — different pitch (25.6 vs 40), different
colour (`primary-400` vs white), dashed rather than solid. Two grids, two jobs. Don't
substitute one for the other.

---

## The text column

`1140px` wide, `padding: 48px`, `flex column`, `gap: 32px`, `items: start`.

### Eyebrow chip

| Property | Value | Token |
|---|---|---|
| Background | `#f7f8f9` | `--gw-color-neutral-25` |
| Border | 1px solid `#f1f2f3` | `--gw-color-neutral-50` |
| Radius | 80px | `--gw-radius-80` |
| Padding | `12px 16px` | |
| Gap | 6px | |
| Shadow | `0 16px 20px rgba(88,92,95,0.16)` | `--gw-shadow-s4` — see below |
| Icon | `SealCheck` 22 × 22 | `assets/icons/fill/seal-check.svg` |
| Type | Inter Medium 20px / 1.4, tracking `-0.32px` | `--gw-color-black` |

The chip is a **light island on a blue field** — neutral-25 on primary-500. It is the only light
element above the fold.

The icon is a Phosphor glyph, which is the system's rule for badging (never a coloured dot), and
`seal-check.svg` is already in `assets/icons/fill/`. Use the repo's copy.

**The drop shadow is `--gw-shadow-s4`, slightly retuned — build the token.** They agree on the
three things that identify a shadow in this system: y-offset 16, colour `#585c5f`, alpha 0.16
(`--gw-shadow-s4` is `0 16px 40px -8px #585c5f29`, and `29` is 0.161). They differ only in blur
(20 vs 40) and spread (0 vs −8), which reads as the chip being tuned tighter for a small pill.

So this is not an off-system shadow — it is `s4` with a shorter blur. Use `--gw-shadow-s4` and
note the substitution in one line. If the tighter blur turns out to be deliberate across small
pills, that is a case for an `s4-tight` step, which is a finding to raise rather than a value to
inline.

### Title

`Vert Grotesk Display` **Semibold**, **90px**, line-height 1.2, tracking `-0.32px`.

| Role | Colour | Token |
|---|---|---|
| Frame words | `rgba(255,255,255,0.6)` | `--gw-color-neutral-alpha-60-white` |
| The claim | `#ffffff` | `--gw-color-white` |

**This is the emphasis mechanism for the whole surface.** The title sets at 60% white and lifts
only the claim to solid white:

> Roadmap to **Generate 10 Qualified Leads Monthly** for Machine Tool Builders

The dimmed words are scaffolding — "Roadmap to", "for Machine Tool Builders". The white words
are what the reader is meant to leave with. It satisfies the standing rule that display copy is
emphasised by weight or colour and **never** by italics, and it does it without a second type
size.

Apply it to every cover: write the sentence, then decide which span is the claim. If every word
is white, you have not made the decision.

**Where opacity is not available, the flat equivalent is a token, not an approximation.** 60%
white over `primary-500` resolves exactly to `--gw-color-primary-200` (`#99c6ff`):

```
r  .6*255 + .4*0x00 = 153 = 0x99
g  .6*255 + .4*112  = 198 = 0xC6
b  .6*255 + .4*255  = 255 = 0xFF
```

`.pptx` has no per-run opacity, so the deck's `.pptx` build sets the dimmed words to
`primary-200` and gets a pixel-identical result. Do not eyeball a light blue for this.

### Note on the export

The `.pptx` export of this cover reads *"Building an Online Lead Generation Funnel with
AI-Powered SEO"* over *"DESIGNED FOR MANUFACTURERS & DISTRIBUTORS"*, in Plus Jakarta Sans at
85.33px, with the eyebrow uppercased.

All four of those are downstream artefacts. Figma has different copy, a different face, 90px,
and a sentence-case eyebrow — and sentence case is what the voice rule asks for. **Figma wins on
all four.** The uppercase eyebrow in circulating decks is drift, not a house style.
