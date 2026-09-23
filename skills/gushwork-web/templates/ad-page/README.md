# Ad page template

**This is the placeholder template. Copy it — do not read it for worked copy.**
Every fillable string is a `{{TOKEN}}`; `bash scripts/check-placeholders.sh <file>` fails
while any remain, and the pre-push hook warns about them.

A worked, fully-filled instance lives at `skills/gushwork-web/examples/ai-crm/` — read that
to see what "filled in" looks like. Copying the example instead of this template is the
mistake this split exists to prevent: you inherit that campaign's headline, its named
customers and their quotes, and they look like copy you wrote until someone checks.

A paid-ad landing page: form-first hero, proof ticks, logo ticker, testimonial, a media
fold, four alternating feature rows, the agent marquee, a four-step timeline, a comparison
table, FAQs with an ask-anything row, and the closing CTA.

```bash
cp -r skills/gushwork-web/templates/ad-page skills/gushwork-web/examples/<campaign-slug>
```

Open `ad-page.html` in a browser. Nothing to build and no dependencies — fonts resolve out
of the repo by relative path, so the template owns no copies of them.

## Source of truth

| Part | Measured from |
|---|---|
| Every fold, phone and desktop | Figma **GW Meta/Google Ads** `O6g05YAT980r85VaDQha4h` — desktop `1890:42045`, phone `1890:43786` |
| Accordion, ask-anything row, thinking state | Figma **GW Ads Library** `t9rRxJODIVZ4N6CnrGdMhC` — `43:29915`, `43:30388` |
| Favicon and social card | GW Ads Library `↳ web/ads/og-image` — favicon `5:46605`, card `5:36` |

**Figma wins over anything already built.** Where the two ads files disagree, the Ads
Library is the newer of the two — the accordion's `neutral/50` rim is the live example.

## What you replace, and what you leave alone

The tokens cover the **campaign** copy. The rest of the page is **product truth** — the
eight agents, the four onboarding steps, the comparison rows, the six FAQs — and it is
correct as written. Edit it when the offer changes, not by reflex per campaign.

| Token | Is |
|---|---|
| `{{PAGE_TITLE}}` | Title, ` \| Gushwork` is appended for you. Under 60 chars total |
| `{{META_DESCRIPTION}}` | 120–155 chars. Reused verbatim as `og:description` and `twitter:description` |
| `{{OG_TITLE}}` | The H1 **without** the ` \| Gushwork` suffix — `og:site_name` already says it |
| `{{PAGE_URL}}` `{{OG_IMAGE_URL}}` | Absolute, both. Scrapers do not honour `<base href>` |
| `{{HERO_EYEBROW}}` `{{HERO_H1}}` `{{HERO_SUB}}` | The hero. H1 wraps to 3 lines at 375 |
| `{{PROOF_1..3}}` | The three ticks. Also used in the closing CTA note |
| `{{FORM_HEADING}}` `{{FORM_CTA}}` | Form CTAs stay action-specific — do **not** normalise to `Book a Demo` |
| `{{EXPERT_VIDEO}}` | The talking-head avatar in the form. A real file, not a data URI — inlining it cost 650KB |
| `{{QUOTE}}` `{{QUOTE_NAME}}` `{{QUOTE_ROLE}}` | Hero testimonial |
| `{{CTA_HEADING}}` `{{CTA_SUB}}` `{{CTA_NOTE}}` | Closing CTA |
| `{{CTA_QUOTE}}` `{{CTA_QUOTE_NAME}}` `{{CTA_QUOTE_ROLE}}` | The card inside the closing CTA |
| `{{OG_HEADLINE}}` | In `og-source.html` only |

**Never fabricate a client logo, name or quote.** The ticker ships gushwork.ai's own set,
sized by measured ink area rather than a flat height — a flat height makes a compact badge
read half the size of a long wordmark.

## Before it goes anywhere

1. **Title and description go past whoever asked for the page.** Derived copy is a
   proposal. See the rule in `SKILL.md`.
2. **Render the social card** — substitute `{{OG_HEADLINE}}` in `og-source.html` and
   screenshot at exactly 1200 × 630 into `og.png`. Never export Figma `5:36` directly;
   its headline is `Lorem ipsum dolor sit amet…`.
3. **Ship the icons** — `favicon.svg`, `favicon-32.png`, `apple-touch-icon.png` are in
   this folder already.
4. `bash scripts/check-placeholders.sh <your file>` must pass.

## Things that will bite

- **`/api/faq`.** The ask-anything row posts to a serverless endpoint that spends API
  credit per question. It reads the page's own FAQ text out of the DOM, so the answers
  cannot drift from the copy — but the scrapers keyed off `.faq-list details`, `.agent
  b/span`, `.step h3/p`, `.split-text`, `.checks li`. **Rename those classes and the
  context silently empties.** The endpoint is rate-limited at 8/IP/5min, per instance.
- **`.spark` is already taken** by the decorative twinkles, which are absolutely
  positioned at negative offsets. The ask-anything icon is `.ask-spark` for that reason.
- **A `<details name>` set to `open` before insertion loses the exclusivity race** and
  lands closed. Insert first, then open.
- **`--gw-content-width` is 343 on phone.** It is Figma's phone column, not a cap — the
  `.wrap` max-width is removed on phone so the column grows past a 375 viewport. Put it
  back and every phone wider than 375 gets dead side padding.
- **Marquees**: spacing is on the item (`margin-right`), not the track (`gap`) — a flex
  `gap` leaves half a gap unaccounted for at `translateX(-50%)` and the loop stutters. On
  phone they become real scrollers driven by `scrollLeft`, tracked as a float because
  sub-pixel increments round away.

## Off-token values it carries

| Value | Where | Why |
|---|---|---|
| `#94c3ff` | the heading gradient's far stop | Between primary/200 and /300, no token exists |
| `700 16px/24px` | comparison table header | No bold-16 body token in the ramp |
| `--gw-text-h7-sem` `--gw-text-h8` | added in-file | Figma needs 600 at 22 and 18; the display ramp has 500 and 700 only. Pending `foundation/tokens.css` |
| 10px | step-card gap | Figma `1890:42722` — not on the spacing scale |

## Stamp

`ad-page.html` carries a `gushwork-build:` comment. Update `createdBy` and `createdAt`
when you copy it; leave `components` alone unless you add or remove a fold —
`scripts/check-drift.sh` reads it to tell you when one of them moves.
