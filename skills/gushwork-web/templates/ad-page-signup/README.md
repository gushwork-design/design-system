# Sign-up ad page template

**This is the placeholder template. Copy it — do not read it for worked copy.**
Every fillable string is a `{{TOKEN}}`; `bash scripts/check-placeholders.sh <file>` fails
while any remain, and the pre-push hook warns about them.

A worked, fully-filled instance lives at `skills/gushwork-web/examples/followups/` — read
that to see what "filled in" looks like. Copying the example instead of this template is the
mistake this split exists to prevent: you inherit that campaign's headline, its invented
customers and their words.

A paid-ad landing page with an **illustrated hero** and a **one-click Google sign-up**: hero
with the sign-up button and two ticks, a picture card, the logo ticker, then — inside one white
frame — the problem fold, a heading and three alternating feature rows, a black call to action
with a phone, four reassurance cards, a comparison table, FAQs, and the closing blue call to
action with a testimonial.

```bash
cp -r skills/gushwork-web/templates/ad-page-signup skills/gushwork-web/examples/<campaign-slug>
```

Open `ad-page-signup.html` in a browser. Nothing to build and no dependencies — fonts resolve out
of the repo by relative path, so the template owns no copies of them.

## Choosing between this and `templates/ad-page/`

**Ask the user which hero they want before building** (DECISIONS.md R27). Start from the
template whose hero matches, then fill the other folds by what the content needs — from either
template. Nothing here is locked to this template's fold list.

| Fold | Here | In `ad-page/` |
|---|---|---|
| Hero | Illustrated: headline, Google sign-up, picture card | Form-first: headline, proof ticks, demo form |
| Logo ticker, navbar, footer CTA with quote, white frame around the folds | yes, identical | yes, identical |
| Problem cards (3) | yes | — |
| Feature rows with a picture slot (3) | yes | four rows, different shape |
| Black call to action with a phone | yes — **new to this template** | — |
| Reassurance cards (4) | yes | — |
| Comparison table | yes, two variations (see below) | yes, plain, competitors first |
| FAQs | plain accordion, one open at a time | with the ask-anything row |
| Media fold, agent marquee, timeline | — | yes |

## Source of truth

| Part | Measured from |
|---|---|
| Every fold, desktop | Figma **GW Ads Library** `t9rRxJODIVZ4N6CnrGdMhC` — section `95:20276`, desktop frame `87:9662` |
| Navbar, footer CTA, logo ticker, white frame, FAQ accordion, plain comparison table | **`templates/ad-page/`** — taken from it unchanged, so the two never drift |
| Favicon and social card | GW Ads Library `↳ web/ads/og-image` — favicon `5:46605`, card `5:36`, via `og-source.html` |

**Figma wins over anything already built**, except where the ad-page template already carries a
measured version of the same fold — the navbar, the frame and the plain table are the template's
on purpose (Utsav's instruction, 30 Sep 2026: the same fold is built the same way on every ad page; only its text and destination change).

**There is no phone frame in the Figma for this page.** The phone layout uses the ad-page
template's phone rules (Figma `1890:43786`); the sticky sign-up button, the hint under the button
and the phone hiding of the black CTA's picture are chosen, not measured.

## What you replace, and what you leave alone

104 tokens. Every string on the page is one, so this template does not carry any product's
claims — write the campaign's.

| Token | Is |
|---|---|
| `{{PAGE_TITLE}}` `{{META_DESCRIPTION}}` `{{OG_TITLE}}` `{{PAGE_URL}}` `{{OG_IMAGE_URL}}` | The meta block. Title gets ` \| Gushwork` appended. Description 120–155 chars, reused as `og:description`. URLs absolute. **Derived copy goes past whoever asked for the page** |
| `{{NAV_CTA_LABEL}}` `{{CTA_LABEL}}` `{{CTA_HREF}}` `{{CTA_HINT}}` | The navbar button, the Google sign-up button (hero, black CTA, footer CTA and phone sticky bar), where it goes, and the handwritten note beside it. Text and destination are the campaign's; the design is not |
| `{{HERO_EYEBROW}}` `{{HERO_H1}}` `{{HERO_SUB}}` `{{HERO_TICK_1..2}}` | The hero |
| `{{HERO_ILLUSTRATION}}` `{{HERO_ILLUSTRATION_LABEL}}` `{{HERO_ILLUSTRATION_CAPTION}}` | The picture card — see **Slots**. Caption: say "Illustrative example" when the picture shows invented data; leave it empty otherwise |
| `{{PAIN_EYEBROW}}` `{{PAIN_H}}` `{{PAIN_1..3_T}}` `{{PAIN_1..3_P}}` | The problem fold and its three cards |
| `{{FEATURES_EYEBROW}}` `{{FEATURES_H}}` `{{FEATURES_SUB}}` | The heading above the rows |
| `{{ROW_1..3_EYEBROW}}` `_H` `_P` `_TICK_1` `_TICK_2` | Each row. The row eyebrow icons are the campaign's to swap |
| `{{FEATURE_1..3_VISUAL}}` | The picture in each row — see **Slots** |
| `{{MID_CTA_H}}` `{{MID_CTA_P}}` `{{PHONE_NOTIF_TITLE}}` `{{PHONE_NOTIF_SUB}}` `{{PHONE_PILL}}` | The black call to action and the phone in it |
| `{{TRUST_EYEBROW}}` `{{TRUST_H}}` `{{TRUST_1..4_T}}` `{{TRUST_1..4_P}}` | The four reassurance cards |
| `{{CMP_EYEBROW}}` `{{CMP_H}}` `{{CMP_COL_A}}` `{{CMP_COL_B}}` `{{CMP_1..4_LABEL}}` `_GW` `_A` `_B` | The comparison table. Four rows, two competitors |
| `{{FAQ_EYEBROW}}` `{{FAQ_H}}` `{{FAQ_SUB}}` `{{FAQ_1..7_Q}}` `{{FAQ_1..7_A}}` | The FAQs. Delete a `<details>` you do not need; the first one opens by default |
| `{{FOOTER_CTA_H}}` `{{FOOTER_CTA_P}}` `{{FOOTER_CTA_NOTE}}` | The closing blue call to action |
| `{{CTA_QUOTE}}` `{{CTA_QUOTE_NAME}}` `{{CTA_QUOTE_ROLE}}` | The card inside it. **The avatar is Ryan Cimo's** — cleared for any ad lander with his own quote and byline (DECISIONS.md R24 clause 4). Never put another person's words under his photo |
| `{{OG_HEADLINE}}` | In `og-source.html` only |

**Never fabricate a client logo, name or quote.** The ticker ships gushwork.ai's own set,
sized by measured ink area rather than a flat height.

## Slots — the campaign's pictures

| Slot | Size | Holds |
|---|---|---|
| `{{HERO_ILLUSTRATION}}` | 1080 × 480 frame, radius 20, 2px `neutral-100` border, shadow S2, `overflow: hidden` | An image, a video, or built markup with its own CSS and script. Give the frame a `role="img"` label in `{{HERO_ILLUSTRATION_LABEL}}` |
| `{{FEATURE_1..3_VISUAL}}` | 580 × 480 slot on `neutral-50`, radius 20, 32 padding | A mock, a screenshot or a short loop |

The template carries none of the campaign pictures' CSS or script. `examples/followups/` shows an
animated pair: a wiring illustration and three mocks that replay while on screen. Add
`data-loop="<ms>"` to an element and the template's small helper adds `.play`, holds, resets and
repeats while it is in view; with reduced motion it shows the end state instead.

## Before it goes anywhere

1. **Title and description go past whoever asked for the page.**
2. **Render the social card** — substitute `{{OG_HEADLINE}}` in `og-source.html` and screenshot at
   exactly 1200 × 630 into `og.png`. Never export Figma `5:36` directly.
3. **Ship the icons** — `favicon.svg`, `favicon-32.png`, `apple-touch-icon.png` are in this folder.
4. **The phone notification is an illustration.** Write it for the campaign, and do not name a real person.
5. `bash scripts/check-placeholders.sh <your file>` must pass.

## Things that will bite

- **The comparison table has two variations.** `<table class="cmp cmp--checks">` is this page's
  (a check on every answer, answers left-aligned, radius 24). Remove the modifier — and the
  `cmp-mobile--checks` on its phone twin — for the plain table the ad-page template uses.
  Keep a check-mark answer to a few words; the column is 292 wide.
- **The Google sign-up button is one component in four places** (hero, black CTA, footer CTA, phone
  sticky bar). The hero one is 56 tall with a 12 radius; the two on solid grounds are 44 with a 10.
  Text and destination change per campaign; the design does not.
- **"Try for free" is Caveat**, loaded from `fonts/`. It is not in the token subset the page
  carries, so the face is named directly. Its arrow is the Figma's own vector, tilted 2.75 degrees.
- **UTMs** on the landing URL are carried onto every `a[data-cta]` link. Keep `data-cta` on new buttons.
- **Rows are fixed at four** in the comparison table and **seven** FAQs. Delete rows you do not
  need in both the table and its phone twin.
- **A `<details name>` set to `open` before insertion loses the exclusivity race.** Insert first,
  then open.
- **The white frame** (`.section--shell` > `.fold-shell`) owns the spacing between folds (180) and
  its own 120 top and bottom. Do not add padding to the folds inside it. The frame starts flush under
  the hero here; the ad-page template leaves a 20px band above it.
- **Marquee**: spacing is on the item (`margin-right`), not the track (`gap`), so the loop does not stutter.

## Off-token values it carries

| Value | Where | Why |
|---|---|---|
| `rgba(0,112,255,.32)` → `--gw-color-primary-alpha-40` | hero button glow | Figma is a 32% blue; the ramp has 10, 20 and 40. Nearest used |
| `#111827` and `#e3efff` → `--gw-color-neutral-900` and `--gw-color-primary-50` | phone gradient stops | Raw in Figma; nearest tokens used |
| 11 and 58 | phone bezel and lock-screen clock | Figma is 11.179 and 58.36; rounded (R5) |
| 4 | notification logo tile radius | Figma is 5.669; no token between 4 and 8 |
| `700 16px/24px` | comparison table header | No bold-16 body token in the ramp |
| 40 | lattice pitch | Measured on the CTA image; no spacing token |
| 400 | CTA image column below 1100 | Not in the Figma — chosen so the text keeps a readable measure |
| `'Caveat'` | "try for free" | The token subset carries no script-face name |

## Stamp

`ad-page-signup.html` carries a `gushwork-build:` comment. Update `createdBy` and `createdAt`
when you copy it; leave `components` alone unless you add or remove a fold —
`scripts/check-drift.sh` reads it to tell you when one of them moves.
