# Comparison ad page template — build record

Built 8 Oct 2026. `skills/gushwork-web/templates/ad-page-comparison/`.

## What it is

The third ad-page template: Gushwork against one named competitor. Source is Figma GW Meta/Google Ads
`O6g05YAT980r85VaDQha4h`, section `2356:19338`, desktop `1971:61604`. Navbar, hero, logo ticker, FAQs and
footer come from `templates/ad-page/`; the seven comparison folds and the closing CTA's card are new.
**Every string is a token** (167). Fold heights match Figma to the pixel on two folds and within 3px on the rest.

## Created or modified

| Element | Status |
|---|---|
| Two-up comparison card, picture card with header strip (`.vs`, `.card`, `.card--shot`) | **New** |
| Competitor metrics grid (`.metrics`, `.tile`, `.notrep`) | **New** |
| Coverage diagram (`.diag`, `.stop`, `.cursor`, `.tip`) | **New** |
| Trustpilot star row driven by the rating (`.tp`) | **New** — third-party colours, see README |
| Review card (`.card--reviews`, `.prof`, `.rv`) | **New** |
| Row-by-row table (`.cmp3`) | **New**, and not the ad-page comparison table |
| Pricing / fit cards (`.card--pad`, `.ticks`, `.price`), black bar (`.bar`), footer comparison card (`.ccard`) | **New** |
| Hero | Ad-page hero without the testimonial; second headline line takes the heading gradient |
| FAQ heading | h4 on this page (Figma `1971:62319`) |

All are pending library review. **Not yet done: the R43 registration** (registry entries, drawn
`.frag` previews, `library-site.sh`, `check-previews.sh`) — the elements are declared here and in the
README but will not show in Design System → Review until that is run.

## Worth a decision

1. **No phone frame exists in Figma for this page.** Phone is derived from the ad-page phone rules.
   Hero headline drops to h4 and loses its hand break; the proof ticks sit 243px apart (asked for by value, off the scale).
2. **Trustpilot colours** and the **69px** diagram gap have no token.
3. **`Book a Demo`** on the bar and footer: Figma says `Book a demo`; the brand string won.
4. **The ask-anything FAQ row stays**, though the Figma frame does not draw it.
5. **Pictures are 1× exports** (586 × 377) of generic "Your Brand" mocks; a 2× export is to do.
6. **Figma's copy is a mock** (a made-up competitor, reviewer names, ratings). Nothing in it is a source.
