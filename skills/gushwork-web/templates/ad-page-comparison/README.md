# Comparison ad page template

**This is the placeholder template. Copy it — do not read it for worked copy.**
Every fillable string is a `{{TOKEN}}`; `bash scripts/check-placeholders.sh <file>` fails
while any remain, and the pre-push hook warns about them.

A paid-ad landing page that puts Gushwork against **one named competitor**, fold by fold:
a form-first hero, the logo ticker, seven comparison folds, FAQs and the closing call to
action. It is the third ad-page template (`ad-page`, `ad-page-signup`, this one) and
DECISIONS.md **R27** applies: ask for the hero first, then take folds from whichever
template carries them.

```bash
cp -r skills/gushwork-web/templates/ad-page-comparison skills/gushwork-web/examples/<campaign-slug>
```

Open `ad-page-comparison.html` in a browser. Nothing to build and no dependencies — fonts
resolve out of the repo by relative path, and the three illustrations sit in `img/`.

## Source of truth

| Part | Measured from |
|---|---|
| The whole page, desktop | Figma **GW Meta/Google Ads** `O6g05YAT980r85VaDQha4h` — section `2356:19338`, desktop `1971:61604`, social card `2217:11540` |
| Navbar, hero, logo ticker, FAQ accordion, ask-anything row, footer CTA | **`templates/ad-page/`**, unchanged apart from the copy and the CTA card |
| The seven comparison folds and the CTA's comparison card | This Figma — **new**, see "Created here" below |

**There is no phone frame in the Figma for this page.** The phone layout is derived from the
ad-page template's phone rules (`1890:43786`); every phone value for the seven folds is a
choice, not a measurement. Said again in the notice.

## The page, top to bottom

| # | Fold | Figma | What it is |
|---|---|---|---|
| — | Navbar | `1971:61606` | `Type=Ads`: logo and a blue **Book a Demo** |
| 1 | Hero | `1971:61608` | Eyebrow, two-line headline whose second line is the blue gradient, three ticks, the demo form. No testimonial under it |
| — | Logo ticker | `1971:61661` | Gushwork's own client set, shipped by the ad-page template |
| 2 | **Page depth** | `1971:61687` | Two cards, a 586 × 377 picture each, and a black call-to-action bar |
| 3 | **Coverage** | `1971:69495` | Two diagrams on a dot grid: a dashed line to a dead end, a blue line to a lead |
| 4 | **Outcome** | `1971:70105` | The competitor's metrics, drawn in HTML, against a Gushwork lead dashboard. No button |
| 5 | **Reviews** | `1971:70271` | Two Trustpilot cards, four reviews each, driven by the rating |
| 6 | **Head to head** | `1971:62247` | Nine rows, three columns. On phone, the ad-page template's row cards: the feature on a strip, a Gushwork pair, a competitor pair |
| 7 | **Pricing** | `2071:3021` | Two 40-padding cards: what the competitor will not publish, what Gushwork charges |
| 8 | **Fit check** | `2071:2947` | "May suit you if you" against "Choose Gushwork if you" |
| 9 | FAQs | `1971:62318` | Four questions from the template's accordion, **plus the ask-anything row** — see below |
| 10 | Closing CTA | `1971:62342` | Blue CTA; the card on the right is a scaled comparison, clipped by the frame |

Folds 2–8 sit in the one white frame the ad-page template draws, 180 apart. Each opens with an
eyebrow, a heading and (where Figma has one) a subtext; the content is 60 below, and so is the
closing **Book a Demo** button. Fold heights match the Figma frame to the pixel on Page depth
(942) and Coverage (1072), and to within 3px on the others, measured with the Figma copy
filled in (the reviews fold is 3px short on wrapping). The FAQ fold is 74px taller than
Figma's, because of the ask-anything row.

## What you replace, and what you leave alone

167 tokens. They fall in groups, so a fill is a pass per fold rather than a pass per token.
**Where Figma breaks a line by hand, put a space then `<br>` in the token** — a bare `<br>`
fuses the words on phone, where the break is hidden.

| Tokens | Is |
|---|---|
| `{{PAGE_TITLE}}` `{{META_DESCRIPTION}}` `{{OG_TITLE}}` `{{PAGE_URL}}` `{{OG_IMAGE_URL}}` | As on the ad page. Title under 60 chars (` \| Gushwork` is appended), description 120–155. URLs absolute. **Derived copy is a proposal** — put it past whoever asked for the page |
| `{{COMPETITOR}}` | The competitor's name, used 18 times: the wordmark in every card, the table header, the review title, the closing card. A real logo goes over it, see "Things that will bite" |
| `{{HERO_EYEBROW}}` `{{HERO_H1_A}}` `{{HERO_H1_B}}` `{{HERO_SUB}}` | The hero. `H1_A` is black, `H1_B` carries the gradient |
| `{{PROOF_1..3}}` `{{FORM_HEADING}}` `{{FORM_CTA}}` `{{EXPERT_VIDEO}}` | As on the ad page. Form CTAs stay action-specific |
| `{{D_*}}` `{{BAR_TEXT}}` | Page depth: eyebrow, heading, subtext, the two header pills, the bar's line |
| `{{C_*}}` | Coverage. `C_L1..4` are the competitor's four stops, `C_R1..4` Gushwork's, `C_QUERY` the search both diagrams type, `C_TIP` the cursor's label |
| `{{O_*}}` | Outcome. `O_T1..6_LABEL/VALUE` are the six metric tiles, `O_T1_TREND` the one trend arrow, `O_NOT_REPORTED` the dashed bar |
| `{{R_*}}` | Reviews. `R_COMP_1..4_*` and `R_GW_1..4_*`, each with `_TOPIC`, `_STARS`, `_QUOTE`, `_META`. `_STARS` and `R_*_RATING` are **numbers** — they set both the fill and the colour of the star row |
| `{{T_1..9_LABEL/COMP/GW}}` `{{T_EYEBROW}}` `{{T_H}}` | The table: nine rows |
| `{{P_*}}` | Pricing |
| `{{F_*}}` | Fit check |
| `{{FAQ_H}}` `{{FAQ_Q1..4}}` `{{FAQ_A1..4}}` | FAQs |
| `{{CTA_HEADING}}` `{{CTA_SUB}}` `{{CTA_NOTE}}` `{{CTA_CARD_TITLE}}` `{{CTA_ROW_1..5_*}}` | Closing CTA and its card |

**Never fabricate a review, a reviewer's name, a rating or a competitor's metrics.** Figma's
copy here is a mock built around a made-up competitor ("mega-made-up-logo" is the layer's own
name), so none of it is a source. Reviews and ratings are quoted from the live Trustpilot page,
the metrics tiles from the competitor's own public numbers, and each one is someone's to
verify before the page runs. The primary button reads **Book a Demo** everywhere — Figma sets
the bar and the footer button in lowercase `Book a demo`, and the brand string wins.

## Created here — new, pending library review

None of these is in the library. Each is registered as new in `notices/2026-10-08-ad-page-comparison-template.md`.

| Element | Class | Note |
|---|---|---|
| Two-up comparison card | `.vs`, `.card`, `.card--gw` | White, a 2px ring drawn **inside** the frame (so padding is Figma's), the Gushwork side heavier and lifted |
| Picture card with a header strip | `.card--shot`, `.shot-head`, `.shot` | 586 × 377 display under a 79-high strip: wordmark left, pill right |
| Competitor metrics grid | `.metrics`, `.tile`, `.notrep` | Six tiles and a dashed "not reported" bar |
| Coverage diagram | `.diag`, `.stop`, `.cursor`, `.tip` | Dot grid, centre line, five stops in a column |
| Trustpilot star row | `.tp` | Five squares; the **rating** fills and colours them (4.2 fills four and a fifth by 20%) |
| Review card | `.card--reviews`, `.prof`, `.rv` | Profile strip, then four reviews with hairline dividers |
| Row-by-row table | `.cmp3` | Three equal columns, 64-high rows. **Not** the ad-page template's comparison table — a different fold with one competitor |
| Pricing and fit cards | `.card--pad`, `.ticks`, `.price` | |
| Black call-to-action bar | `.bar` | Inside fold 2 |
| Comparison card in the footer CTA | `.ccard` | A scaled copy of the table, clipped by the CTA frame |

## Off-token values it carries

| Value | Where | Why |
|---|---|---|
| `#E01C47` `#91D868` `#00B975` | `.tp` star colours | Trustpilot's own, measured off the Figma assets. `#FF8622` (2 stars) and `#FFCE00` (3 stars) are Trustpilot's published colours, **not measured** — no 2- or 3-star review is drawn |
| `69px` | `.diag` gap | Every gap between the coverage stops measures 69 (one measures 71). The spacing scale has 60 and 80 |
| `0.75px` | `.cmp3` cell ring | Figma strokes each cell 1.5px inside, which would draw a 3px join. The screenshot reads as a 1.5px line, so each cell carries half |
| `20px` display, `13px` Inter, `11px`, `15px`, `44px`, `18px` | `.ccard` | Figma draws the closing card at 0.729 of 1:1; these are that scale, rounded. None is a ramp step |
| `#94c3ff` | gradient's far stop | Inherited from the ad-page template; between primary/200 and /300, no token |
| `--gw-text-h7-sem` `--gw-text-h8` | added in-file | Inherited. Pending `foundation/tokens.css` |
| `700 16px/24px` | — | Not used here. The ad-page template's comparison table needs it; this one does not |

## Where it differs from Figma, and why

- **No hero testimonial.** The ad-page template puts a quote card under the ticker; this
  Figma has none, and Figma wins.
- **The competitor's mark is the name in the display face**, not a drawn logo. Figma uses a
  face the system does not own for a placeholder; a real logo should be dropped over it.
- **FAQ heading is h4 (38).** `1971:62319` sets it so; the ad-page template's FAQ heading is
  h3. This page follows its own Figma.
- **FAQs keep the ask-anything row.** The Figma frame shows four collapsed rows and no ask
  row. A fold is built the same way wherever it appears, so the row stays. Delete the
  `<form class="ask-row">` and the script block that drives it if the campaign should not
  carry it — see the first thing below.
- **Fold 4 has no button**, as in Figma. Fold 1's button is inside its black bar.
- **The coverage stops flow** (a column with a 69 gap) rather than being pinned at Figma's
  coordinates. It measures the same and is what lets phone reuse the markup.

## Before it goes anywhere

1. **Title and description go past whoever asked for the page.**
2. **Render the social card** — substitute `{{OG_HEADLINE}}` in `og-source.html` and
   screenshot at exactly 1200 × 630 into `og.png`. Figma has its own card at `2217:11540`;
   do not export it, render from the page's real H1.
3. **Replace the three pictures in `img/`** with the campaign's own if the generic "Your
   Brand" page and dashboard are not what you want to show. They are 1024 × 659 renders (1.75×
   the 586 × 377 display) of Figma `1971:69578`, `1971:70029` and `1971:70129`, and are sharp
   up to a 2× screen at full width. Figma only serves 1024 wide, so a true 2× needs the node
   exported from Figma itself.
4. **A real competitor logo**, if there is one the client has cleared: replace the
   `<span class="mark">` in the header strips, the table header and the review tile with an
   `<img>` — `.mark img{height:24px}` is already there for it.
5. `bash scripts/check-placeholders.sh <your file>` must pass.

## Things that will bite

- **`/api/faq`.** The ask-anything row posts to a serverless endpoint that spends API credit
  per question. It reads the page's own FAQ text out of the DOM, so the answers cannot drift
  from the copy — but it keys off `.faq-list details`, so **rename that class and the context
  silently empties.** Rate-limited at 8/IP/5min per instance.
- **`<br>` in a token needs a space before it.** The base hides `.heading br`, `.faq-head br`
  and `.cta-body br` on phone, and an unspaced break fuses the two words.
- **Stars read the rating, so the rating must be a bare number** (`4.5`, not `4.5/5`). Colour
  comes from the first digit — `1…` red, `4…` light green, `4.5`–`5` green.
- **The diagrams' cursor and tooltip are hidden on phone.** They are positioned against a
  353-wide search bar and would hang off a 343 column.
- **`--gw-content-width` is 343 on phone** — it is Figma's phone column, not a cap. The
  `.wrap` max-width is removed on phone; do not put it back.
- **Marquees**: spacing is on the item (`margin-right`), not the track (`gap`), and on phone
  they become real scrollers. See the ad-page README.

## Stamp

`ad-page-comparison.html` carries a `gushwork-build:` comment. Update `createdBy` and
`createdAt` when you copy it; leave `components` alone unless you add or remove a fold —
`scripts/check-drift.sh` reads it to tell you when one of them moves.
