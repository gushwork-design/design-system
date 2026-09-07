# Case-study page template

One customer story, told as a page. Hero with the outcome numbers, a prose column with a
sticky rail CTA, and the closing CTA fold.

```bash
cp -r skills/gushwork-web/templates/case-study skills/gushwork-web/templates/<client-slug>
```

Open `case-study.html` in a browser. Nothing to build, no dependencies — tokens, fonts and
brand assets all resolve out of the repo by relative path, so the template owns no copies.

## Source of truth — read this before changing a number

Three sources, and which one wins is a **ruling**, not a preference:

| Part | Measured from |
|---|---|
| Hero, article, stats, prose, TL;DR geometry | Figma `case-study-with-image` — `2PbNu2kGHalHhMUfFyFoeG` / `495:3382` |
| Pull quote | Figma `testimonial-card-web` — `1060:7647` |
| CTA fold and its glass testimonial | Figma — `495:3478` / `495:3516` / `495:3534` |
| Navbar behaviour, rail CTA card, footer | **The live site** — `gushwork.link/case-study/doug-machines` |

**Ruled 7 Sep 2026: Figma wins where Figma and the live site disagree** — except for the
three parts named above, which Utsav asked to take from live, and the TL;DR block. Do not
generalise those exceptions to anything else.

Where Figma and live disagree and Figma won:

| | Figma — built | Live — not built |
|---|---|---|
| Hero title | `--gw-text-h3` 44/1.2, `neutral/black` | 38/1.2, `secondary-500`, max-w 858 |
| Hero split | text fills + media 580, gap 64 | 608 + 608, gap 64 |
| Hero media | four slots, `--gw-radius-12`, one 80px corner | one image, radius 0 |
| Stat number | `--gw-text-h5` 32/1.2 | 22/1.6 |
| Stat label | `--gw-text-body-16-med` | 14/1.6 |
| Stats rule | 1px, gap 224 | 2.5px, gap 100 |
| Stats position | inside the hero | its own block below it |
| Meta row | Inter Medium 18/1.6 | 16px |

## Structure

```
navbar          navbar/navbar · Type=Brand · FIXED, transparent, white-80% once scrolled
hero            fold/ Hero · Layout=Split · neutral-50 FULL-BLEED, bottom corners 20, min-height 920
  ├ breadcrumb  Customers > Client name (a third level is built and hidden in Figma)
  ├ title       h3, no full stop — ever
  ├ meta        Industry · Country
  ├ media       four image slots; the 80px corner belongs on the bottom-right one
  └ stats       three numbers, 1px rule above
article         fold/ other · prose 720 + rail 280, gap 40, in a 1040 column
  ├ blocks      h4 + 18/1.6 body
  ├ TL;DR       OPTIONAL — Problem / Challenge / Solution
  ├ figure      720 × 374, radius 16
  ├ quote       testimonial-card-web, inline
  └ rail        one sticky CTA card, flush with the prose top
cta             fold/ CTA · neutral-50 ground FULL-BLEED · card 1400 × 600 on primary-500
footer          measured off the live site · neutral/black FULL-BLEED
```

**Every section ground is full-bleed; only the content column is capped.** The Figma frame is
1440, but a fixed 1440 shell leaves white gutters on a wider display. `.cs-shell` has no
max-width; `.cs-inner` caps the content at `--cs-content-w` (1280) and centres it.

## The rules that came with this template

**Do not add a related-stories carousel.** It was removed on 7 Sep 2026 and does not come
back until Utsav asks. When it is asked for, it has to **actually function and use real
stories** — real thumbnails, real titles, real industries, working prev/next. A row of
placeholder cards behind a scroll shim is not the deliverable.

**The navbar is fixed.** Transparent over the hero; it takes
`--gw-color-neutral-alpha-80-white` once scrolled past `--cs-nav-solid-at` (32px, chosen — the
live site flips somewhere between 20 and 40), transitioning `background-color` over 0.4s. No
blur, no shadow, no border — the live site has none of those. The logo does not swap; the
light/white logo pair exists for dark heroes, and this page has a light one.

**The rail is one card, not two.** The proof-list and capture-form cards from the Figma frame
were replaced with the live site's rail CTA on Utsav's call. It sits flush with the prose top
— no leading offset — and sticks at `--cs-sticky-top` (80px, chosen: navbar 60 + space-20).

## Filling it in

**Replace every placeholder.** `Client name`, `Industry`, `Country`, `Role, Company, Country`
and the slot labels are all stubs. Copy guidance is in `foundation/voice.md`; the two that
catch people here:

- **Lead with the outcome and the number.** "Client name gets 25 qualified leads in the first
  30 days of AI search" — not "A case study in digital transformation".
- **No full stops in headings.** Not trailing, and not internal either — rework a staccato
  heading with a comma or an em-dash.

Three strings are deliberately title case because they ship that way: **"See How This Works
for Your Business"**, **"Have Questions?"** and **"Ask Anything here."** Leave them. The
primary CTA is exactly `Book a Demo` — the live rail button reads `Book a demo`, and
`foundation/voice.md` rules the capitalised form, so the template uses `Book a Demo`.

The footer legal strings are the other way round: the live site ships `All Rights Reserved`,
`Privacy Policy` and `Terms Of Use`, and `exports/web/page-shell.md` finding 3 says write them
corrected. The template does.

The rail card title — "Discover AI agents that help businesses get more qualified leads." —
keeps its **full stop**. Gushwork headings normally carry none, but this is shipped live copy
reproduced verbatim on Utsav's instruction, and the rule governs what you write, not what
already ships. Do not "fix" it.

**Images.** Every grey panel is a slot with its target size in the label. Drop real
photography in; never fabricate a client logo, photo, or quote. Two slots stand in for assets
that exist on the live site but not in this repo, and a maintainer should add them:

| Slot | Live asset |
|---|---|
| Rail card avatar pair (70 × 40) | `cta-peopl.webp` |
| Footer wordmark band (full width) | `updated-footer-bg.webp` |

The client byline photo is `client/avatar` — a real photo, desaturated by CSS. Do not reach
for `assets/avatar/*.svg`; that is the dashboard `Avatar` character, a different component on
a different surface.

**The TL;DR block is optional.** Delete `.cs-tldr` and its markup if the story does not need a
Problem / Challenge / Solution summary. It is the one layout element taken from the live page
rather than the Figma frame.

**The four hero slots are optional too.** Keep one and delete the rest for a single hero
image, but keep the 80px corner on whichever slot ends up bottom-right — that corner is the
Gushwork tell.

## Breakpoints

Desktop and phone, one file, `max-width: 767px`. There is no tablet — `Breakpoint` is
`Desktop | Phone`.

Phone **geometry** is measured off `case-study-page/ mobile` (`495:3559`): 375 wide, padding
120 / 16 / 60 / 16, stack gap 40, media 343 × 237, nav collapses to logo + menu button. Phone
**type steps** are the documented breakpoint rules, not measured — that Figma frame only
covers the hero, so the article, quote, CTA and footer had no phone reference to read.

## Off-token values — all flagged inline, all in the notice

Every colour, type step, radius, shadow and space in this file is a `--gw-*` token except
these, collected in `:root` under an `OFF-TOKEN` comment. None is an invention; each is a
value the component uses that has no variable behind it.

| Value | Where | Nearest token |
|---|---|---|
| `#e1e3e8` | hero stats rule | `neutral-100` `#e7e8e9` — visibly lighter |
| radius 32, 2 | quote card corners | ramp stops at 20, then 60 |
| radius 80 | the asymmetric "tell" corner | — |
| radius 120 | TL;DR Solution card | — |
| radius 40 | CTA glass card | — |
| radius 8.879 | CTA inline button | `radius-8` |
| radius 6 | navbar CTA | `radius-4` / `radius-8` |
| 52px display 700 | CTA heading | h2 56 / h3 44 — nothing between |
| 32px display **500** | CTA glass quote | h5 is 32 at weight **600** |
| 20px display 600/28 | rail card title | h7 is 22/1.4 |

## Three things worth knowing before you edit

**The blue `"` glyph in the pull quote is `visible: false` in the Figma node.** It ships built
but hidden, so the design is recoverable — drop the `is-hidden` class to bring it back. It is
hidden with a **class, not the `hidden` attribute**: the HTML `hidden` attribute does not hide
an SVG element. That was verified in the browser, not assumed.

**The glass card uses `backdrop-filter` and `mix-blend-mode: luminosity`.** Both are measured
off the node (`backdrop-blur-[10px]`, white@10% at luminosity). The general Gushwork guidance
is no glass and no blur; that guidance governs **product surfaces**, and this is a measured
marketing component, so it stands. Do not copy the treatment onto anything else.

**The navbar and footer are hand-built from measured specs.** The skill says never hand-build
page chrome, and for React that stands — but there is no component to instance in a static
HTML file, and `foundation/output-targets.md` is explicit that no React set ships in this repo.
The footer copyright and legal links are `neutral-400`, per **R9**: the live site ships
`neutral-700` there, ~2.3:1 on black, which fails the 4.5:1 floor, and the ruling overrides
the measured value.

## Before you call an edit done

```bash
bash scripts/check-drift.sh skills/gushwork-web/templates/case-study/case-study.html
```

The `gushwork-build:` stamp at the top of the file carries the surface and the component list.
Update `createdBy` and `createdAt` when you copy the folder for a real page — the stamp is how
its owner finds out the design moved.

Verify at **1440 and 1920** as well as 375: the full-bleed grounds are the thing most likely
to regress, and a 1440-only check will not catch a re-introduced width cap.
