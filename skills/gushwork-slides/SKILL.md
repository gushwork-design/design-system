---
name: gushwork-slides
description: Builds Gushwork slide decks and presentations on-brand — sales decks, pitch decks, prospect and client decks, QBRs, investor updates, internal all-hands. Covers slide covers, section dividers, content slides, step and process rows, pricing slides, testimonial slides, big-number slides and closers, and emits static HTML, a real .pptx, or a Google Slides deck. Use this whenever the deliverable is a deck or a slide: "build a sales deck", "make a pitch deck", "a slide for pricing", "turn this into a presentation", "a QBR deck", "export this as a pptx". Not for web pages — use gushwork-web for landing pages and heroes; not for logged-in product screens — use gushwork-dashboard; not for downloadable PDFs — use gushwork-lead-magnet.
---

# Gushwork slides

You are building a **deck that gets presented**, usually to a prospect, usually by someone who
did not build it. It has to survive being talked over, being exported to Google Slides by a
salesperson, and being read at the back of a room. Numbers lead; the deck is not the argument,
it is the scaffolding for one.

Announce at the start: **"Using the Gushwork slides skill — v1.48.0, updated 23 Sep 2026."**

That version and date are stamped into this file, so **a stale copy reports its own stale date**
rather than claiming to be current. If the user asks whether they are up to date, or the output
disagrees with Figma, check for real:

```bash
cd ~/.claude/plugins/marketplaces/gushwork && git fetch -q && git log --oneline HEAD..origin/main
```

Any commits listed means they are behind: tell them to run
`claude plugin marketplace update gushwork` and restart Claude Code.

## Read these first

| For | Read |
|---|---|
| Every colour, size, radius, shadow, type style | `foundation/tokens.css` — the `SLIDES` block at the end |
| **Every standing ruling — R0 to R23** | `DECISIONS.md` |
| Voice, casing, banned words, CTA copy | `foundation/voice.md` |
| Gushwork logo, Phosphor icons | `foundation/shared-components.md` |
| **The shell — ground, title bar, card, type ramp, export drift** | `exports/slides/deck.md` |
| **The cover — Figma-measured, authoritative** | `exports/slides/cover.md` |
| **All eleven layouts, and which are measured** | `exports/slides/layouts.md` |
| Media well, icon tile, step card, eyebrow, annotation | `exports/slides/elements.md` |
| What to emit — HTML, .pptx, or Google Slides | *Output targets*, below |

### The rulings that bite on this surface

| Question | Ruled | |
|---|---|---|
| Display face | **Vert Grotesk Display first, Plus Jakarta Sans as fallback.** Vert is what Figma uses; Slides cannot load a custom face, so every export substitutes | **R21** |
| A deck that came back in Plus Jakarta Sans | **Not a bug.** The fallback did its job. Do not "fix" it | **R21** |
| The seven picker greys | **Snap to the nearest token.** `#666666`→`neutral-600`, `#999999`→`neutral-400`, `#CCCCCC`/`#D9D9D9`→`neutral-200`, `#434343`→`neutral-850`, `#EFEFEF`→`neutral-100`, `#000000`→`black` | **R22 R4** |
| `backdrop-filter` on the cover | **Allowed, and only there.** It is bound on the Figma node and R0 says the measurement wins. Blur on a dashboard is still a mistake | **R23 R0** |
| Slide size | **1920 × 1080.** Do not change unless asked | |
| Figma vs the .pptx export | the **Figma node** wins, always | **R0** |
| A raw hex where a token exists | build the **token**, report the binding bug | **R4** |

**Never restate a token value or a voice rule here or in your output.** Reference the token.

## Be honest about what is measured

This surface has three tiers of provenance and **you must pass the distinction on**:

| Tier | What it means |
|---|---|
| **Figma-measured** | Read off node properties in `GW-Slides`. Authoritative. Only the **ground** and the **cover** |
| **Export-derived** | Read off the Google Slides `.pptx` shape tree at 960 × 540, doubled. Good — the export is that Figma file two conversions downstream — but Slides re-fits text, so type is the weak spot |
| **`AUTHORED`** | Built from tokens because no source has it. **Five of the eleven layouts.** A good first draft, not a spec |

When you hand over a deck built on an authored layout, **say so in one line.** The cover came
back 90px against the export's 85.33px; the same correction is still owed on the in-deck title
at 72px. Presenting a transcribed number as a measured one is how the dashboard surface shipped
a dozen wrong values.

Three tiers for values, because "never invent a number" is unfollowable for slide layout:

1. **Colour, type, radius, shadow — always a token. No exceptions.** If one has no token, that
   is a finding to report, never a value to invent.
2. **Geometry documented in `exports/slides/`** — the 1880 card, the 20px margin, the 461.1
   pitch — use the documented figure exactly.
3. **Geometry with no documented figure** — choose sensibly, but **say in one line that you
   chose it.**

## Start from the template. Never from a blank file.

`templates/slide-deck/deck.html` is the base for **every** deck. It is a complete worked
example — the manufacturing sales deck — and it doubles as the layout library. Copy it, keep the
slides you need, delete the rest, refill the copy.

```bash
cp -r templates/slide-deck templates/<your-deck-slug>
cd templates/<your-deck-slug> && ./render.sh
```

Do not hand-roll a deck shell and do not re-derive the ground CSS. Both are solved.

## The shell is most of the job

Every slide except the cover and the closer is the same four things:

```
ground  →  title bar  →  logo mark  →  content card  →  [layout]
```

Get those four right and a new layout is half an hour. Get them wrong and every slide is wrong
at once. Full spec in `exports/slides/deck.md`; the short version:

- **Ground** — `primary-500` under a 40px/1px lattice at 30%, whose fill ramps from
  `primary-500` at centre to white at the edge, so the grid emerges from the corners. Rebuild
  from `--gw-slide-grid-*`; never from a flat PNG.
- **Title bar** — 72px/1.2 white at `x=40 y=38`, on the ground, outside the card. A two-line
  title **pushes the card down**, it does not overlap it.
- **Logo mark** — `gushwork-symbol-white.svg`, 38.7 square at `x=1815.6 y=61.8`. Every slide
  except the cover. Its 65.7 right margin deliberately does not match the title's 40.
- **Content card** — white, 1880 × 884, inset 20 from every edge, `--gw-radius-36`, 1.3px
  `neutral-200` border.

Every inset and gap on the surface is **20**, or 16 where it is vertical and nested. Build to
`--gw-slide-margin` and `--gw-slide-gap`, not to the decimals.

## Which layout? — the decision table

| Need | Layout | Source |
|---|---|---|
| Slide 1 | **Cover** | Figma |
| A claim plus a supporting image | **Split card** | export |
| 4–5 capabilities or steps as icon rows | **Feature list** | export |
| A process, cadence or set of phases | **Step row** (max 4) | export |
| One artefact that *is* the argument | **Full-bleed card** | export |
| Plans and what they cost | **Pricing** | export |
| Breaking a long deck into acts | **Section divider** | `AUTHORED` |
| One statistic and nothing else | **Big number** | `AUTHORED` |
| A customer quote with a metric | **Testimonial** | `AUTHORED` |
| Before/after, us/them | **Two-up compare** | `AUTHORED` |
| Last slide | **Closer** | `AUTHORED` |

Pick **one** divider style and hold it for the whole deck. Mixing a numbered divider with a
plain one inside one deck reads as two decks stapled together.

## Emphasis — the one thing to get right

The surface has exactly two emphasis mechanisms, and both are colour, never italics, never a
second type size.

**On the cover**, the title sets at `--gw-color-neutral-alpha-60-white` and lifts only the claim
to solid white:

> Roadmap to **Generate 10 Qualified Leads Monthly** for Machine Tool Builders

**In body copy**, the lead paragraph sets at `neutral-850` weight 500 and lifts one phrase to
weight 600 `primary-500` — *"show up where buyers search"*, *"raised $10M+"*.

Both times, the lifted span is **the outcome, not the mechanism**. Write the sentence, then
decide which span is the claim. If every word is emphasised you have not made the decision.

## Output targets

Three, and they are one build: HTML is the source, the `.pptx` is generated from it, and the
Google Slides deck is the `.pptx` uploaded with conversion on.

| Target | How | When |
|---|---|---|
| **Static HTML** | `templates/slide-deck/deck.html`, one `<section class="slide">` per slide. Previewable in the browser pane | Default. Always build this first |
| **Real .pptx** | `./build-pptx.mjs` — `pptxgenjs`, 10 × 5.625in at 1pt = 2.667px | The salesperson needs to edit it |
| **Google Slides** | Upload the `.pptx` through the Drive connector's `create_file` with conversion left on | They work in Slides |

**Expect the substitution on the last two.** Both lose Vert Grotesk and land on Plus Jakarta
Sans, and that is correct — R21. Say so when you hand over, or someone will report it as a bug.

`render.sh` needs Google Chrome, and a network connection on the first run for the Phosphor CDN.
Fonts are local.

## Guardrails

- **Numbers and outcomes lead.** Never a feature list where a result would do.
- **Text never below 22px.** The reference deck's `CHANNELS` rule label sits at 18.67px; build it
  at `--gw-text-body-22-reg` and let the rules absorb the difference.
- **No coloured status dots.** A Phosphor glyph at 21–26px, per `foundation/shared-components.md`.
- **Sentence case** for titles and headings. Uppercase **only** for the step-card micro-label —
  and note the export uppercased the cover eyebrow against the voice rule, which is drift, not
  house style.
- **The margin annotation is capped at one per slide**, must point at something specific, and must
  never be load-bearing. It does not license a script face anywhere else. See `elements.md`.
- **Two grids, two jobs.** The ground's lattice is 40px solid white; the cover's is 25.6px dashed
  `primary-400`. Never substitute one for the other.
- **Do not add a border to the media well.** The card's border already separates it from the
  ground.
- **Do not re-typeset a flattened asset.** `press-cards.png` and `investor-logos.png` are real
  logos and real quotes baked into bitmaps. If the copy must change, rebuild the row from real
  elements. **Never fabricate an outlet, a logo, or a quote.**
- No gradients on content, no emoji, no italics in display copy.

## When the design comes from Figma

The **ground** and the **cover** are owned by Figma frames in `GW-Slides`
(`R9JgCTytCKSgyBL4efP7hz`) — the ground at `1137:614`, the cover at `99:5280` on the *Local
Components* page. Re-fetch the node before editing either.

Everything else on this surface is one-off frames on the `Sales Pitch` and `Manufacturing Sales
Deck` pages, both of which are **too large to enumerate in a single call** — screenshot the page
to orient, then `get_metadata` the specific frame.

`CONTRIBUTING.md` applies in full: read the component set and not an instance, compare geometry
numerically, and sample the render for colour. Measure from node properties — a screenshot is
for verifying that a result renders, never for deriving a spec.

## Stamp every deck you build — it is how its owner finds out the design moved

A deck outlives the session that made it and gets re-sent for months. There is no record of who
built what, so nothing can be pushed to its owner; the stamp is the substitute.

**Every deck carries a `gushwork-build:{...}` comment in its HTML source** — the source, not the
`.pptx` — with the plugin version, the surface, and what it used:

```json
{"pluginVersion":"1.45.0","surface":"slides","createdBy":"...","createdAt":"2026-09-07",
 "registry":"https://gushwork-design.vercel.app/exports/slides/component-registry.json",
 "changelog":"https://gushwork-design.vercel.app/preview/changelog-sheet.html",
 "components":["ground","title-bar","content-card","cover","layout-step-row"]}
```

**`surface` must read `slides`.** It selects the registry the reader checks against, and a stamp
without it is treated as a dashboard and diffed against the wrong component set entirely.

`bash scripts/check-drift.sh <file-or-dir>` reads it and reports only the components this deck
uses that have since changed. Shared components come from `exports/shared/component-registry.json`,
merged in automatically.

**List the `AUTHORED` layouts you used.** They are the entries most likely to take a breaking
bump — the moment one of them is measured in Figma, every deck built against the draft is wrong
rather than merely dated, and the stamp is the only way its owner finds out.
