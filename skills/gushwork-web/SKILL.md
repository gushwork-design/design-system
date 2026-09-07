---
name: gushwork-web
description: Builds Gushwork marketing and public-website pages on-brand — landing pages, ad landing pages, heroes, folds, CTA sections, pricing pages, comparison tables, testimonials, case studies, FAQ sections, navbars, footers, and marketing forms. Use this whenever the request is a public-facing Gushwork web surface: "build a landing page", "a hero fold", "a pricing page", "a testimonial section", "the site nav", "an ad lander". Not for logged-in product surfaces — use gushwork-dashboard for dashboards, app screens, KPI cards, and data tables.
---

# Gushwork web

You are building a **public-facing marketing surface** for Gushwork. Spacious,
white-on-black with a blue accent, numbers leading every claim. This is not the product UI.

Announce at the start: **"Using the Gushwork web skill — v1.44.0, updated 1 Sep 2026."**

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
| Every colour, size, radius, shadow, type style | `foundation/tokens.css` |
| **Every standing ruling — R0 to R13** | `DECISIONS.md` |
| Voice, casing, banned words, CTA copy | `foundation/voice.md` |
| Badge, Gushwork logo, Phosphor icons | `foundation/shared-components.md` |
| **Text fields — shared with dashboard, all 14 variants** | `foundation/text-field.md` |
| Declaring anything you had to build yourself | `foundation/new-component-notice.md` |
| **What to emit — React or static HTML** | `foundation/output-targets.md` |
| **Page templates — start here before composing from scratch** | `templates/` |

### The rulings that bite on this surface

| Question | Ruled | |
|---|---|---|
| Text fields | `input/text-field` is a **shared atom** in `foundation/`, not web-only. **No hover state** — `State=Hover` ≡ `Default`. `Yellow Warning` builds `--gw-color-yellow-500`, not the off-palette `#c18c0b` | **R1 R2 R6** |
| Footer legal text | **`--gw-color-neutral-400`**. `neutral-700` on black is ~2.3:1 and `neutral-600` ~3.9:1 — both fail the 4.5:1 floor | **R9** |
| The `image` typos | a **documentation** bug, not a key bug. The canvas keys are spelled correctly — build `strategy` and `service` | **R8** |
| Variant key spacing | keep it irregular — `Outlined/ black`, `Outlined / white`, `Text/ black` are **identifiers**; the spec's tidied forms do not resolve | **R0** |
| Spec vs Figma | the **measurement** wins, always | **R0** |
| A raw hex where a token exists | build the **token**, report the binding bug | **R4** |

**Never restate a token value or a voice rule here or in your output.** Reference the token.

**You do not need Figma to build.** Everything measured is in `exports/`. Figma is a maintainer
activity — see `CONTRIBUTING.md`. A value missing from `exports/` is a gap to report, not a
reason to go measuring.

**Be honest about this surface's state.** Button, eyebrow, navbar, footer and `client/avatar`
are measured. The rest — folds, card types, inputs, images — are transcribed from Figma
annotations and **not** yet verified against the rendered components, which is how the dashboard
surface got a dozen values wrong before it was measured. Treat an unmeasured value as a good
first draft and say so rather than presenting it as a spec.

Three tiers, because "never invent a number" is unfollowable for page layout and a rule
that can't be followed gets ignored where it matters:

1. **Colour, type, radius, shadow, spacing — always a token. No exceptions.** If one of
   these has no token, that is a finding to report, never a value to invent.
2. **Layout dimensions documented in `exports/`** — the 1240 column, 100px margins, 60px
   navbar — use the documented figure exactly.
3. **A layout dimension with no documented figure** (a media well's height, a prose
   max-width): choose sensibly, but **say in one line that you chose it.** Don't pass your
   own number off as coming from the system.

## The composition ladder — compose downward, never sideways

```
atoms  →  fold-elements  →  Folds  →  Page Build
```

| Tier | What it is | Where |
|---|---|---|
| **Page Build** | The page shell. navbar + content + footer. **Every marketing page is this component.** | `exports/web/page-shell.md` |
| **Folds** | Full-width sections that stack inside the shell's `container` slot. | `exports/web/folds.md` |
| **fold-elements** | The parts a Fold assembles — heading, form, accordion, table rows, timeline tabs, client logos, Agent Card. | `exports/web/fold-elements.md` |
| **atoms** | eyebrow, tooltip, input-fields, inline-input, agent-icon. Cards, Button, Avatar, images have their own files. | `exports/web/atoms.md` |

Four hard rules:

1. **Start from Page Build.** Never hand-build page chrome — no bespoke navbar, no custom
   footer, no hand-rolled page frame. Fill its slots.
2. **The `container` slot takes Folds only.** Never place an atom or a fold-element directly
   in it. If no fold fits, use `fold/ other` and put custom content in *its* container.
3. **A fold reuses atoms by instance.** Don't hand-build a card, button, eyebrow, or heading
   inside a fold — instance them.
4. **Don't rearrange the shell.** navbar → hero → extra-container-1 → below-fold container →
   extra-container-2 → footer is a fixed vertical order.

## `Type` — the one page-level decision that governs everything

`page-build` carries `Type` = **`Brand`** | **`Ads`**. Set it **once at the page level** and
let every component inherit it.

| | `Brand` | `Ads` |
|---|---|---|
| For | Main-website pages | Paid-ad landing pages |
| navbar | Full nav links + black CTA | Logo + blue CTA only, no nav, no hamburger |
| footer | Full footer — CTA + links | Copyright line only |
| Primary button | `Black` | `Blue` |
| Secondary button | `Outlined/ black` | `Outlined/ black` |

**Never set button colours per-button to achieve this.** Set `Type` and let it cascade. A
blue primary on a Brand page means you set the wrong page type.

**Background beats page type.** Work down in order — this is the full button decision:

1. **On a blue surface** → primary `White`, secondary `Outlined / white`
2. **On a black surface** → primary `Blue`
3. **Otherwise** → by page type, per the table above

Full detail in `exports/web/button.md`.

## Which component? — the decision table

| Need | Use | Read |
|---|---|---|
| Any marketing page | `page-build` | `page-shell.md` |
| An empty page to compose freely | `page-build` with `Blank=yes` | `page-shell.md` |
| A customer case study | **`templates/case-study/`** — a measured page, not a fold | `templates/case-study/README.md` |
| Top nav | `navbar/navbar` — `Type` inherits from the page | `page-shell.md` |
| Bottom of page | `footer/footer` — `Type` inherits | `page-shell.md` |
| The opening fold | `fold/ Hero` — `Layout` = `Home` / `Centered` / `Split` / `Form` | `folds.md` |
| Client proof | `fold/ Testimonial` — `Style=Video` or `Single` | `folds.md` |
| Feature / benefit grid, up to 6 cards | `fold/ Cards Grid` | `folds.md` |
| One row of cards | `fold/ Cards Grid (small)` | `folds.md` |
| Accordion / question list | `fold/ FAQs` — 5 by default, up to 10 | `folds.md` |
| Text one side, image the other | `fold/ With image` | `folds.md` |
| Week-based steps | `fold/Timeline` — dark theme | `folds.md` |
| Feature comparison vs competitors | `fold/Comparison Table` — 4 columns | `folds.md` |
| Video player section | `fold/ Video` | `folds.md` |
| Marquee of AI agents | `fold/AI Agents` | `folds.md` |
| Closing conversion section | `fold/ CTA` — wraps the footer CTA | `folds.md` |
| Anything else, or custom content | `fold/ other` | `folds.md` |
| A button | `Blue` / `Black` / `Outlined/ black` / … — **never `Primary`** | `button.md` |
| A card | `Card / Information`, `Card / Testimonial`, `Card / Review`, `Card / Case Study and Blog` | `cards.md` |
| A label above a heading | `eyebrow` — **`Color=Default` (black). `Blue` only when asked** | `atoms.md` |
| A form | `fold/fold-element/form`, or `input-fields` for individual fields | `fold-elements.md`, `atoms.md` |
| One field that moves the user forward | `inline-input` | `atoms.md` |
| A client photo or author byline | `client/avatar` — grayscale squircle | `avatar.md` |
| A client logo | `Client Logos` — **never fabricate one** | `fold-elements.md` |
| Stock / product imagery | `image` — pick `category` first | `images.md` |
| A status pill anywhere | **Badge** | `foundation/shared-components.md` |

## Templates — a measured page beats a composed one

`templates/` holds whole pages already measured off Figma and rendered. When one matches the
request, **copy it and fill it in** — do not recompose the page from folds. The template
carries the geometry, the off-token flags and the build stamp, and re-deriving those by hand
is how a page ends up plausible but wrong.

| Template | For | Base |
|---|---|---|
| `templates/case-study/` | One customer story as a page — hero with outcome numbers, prose column with a sticky rail CTA, closing CTA | Figma `case-study-with-image`, `2PbNu2kGHalHhMUfFyFoeG` / `495:3382`, with the navbar, rail card and footer from the live site |

```bash
cp -r skills/gushwork-web/templates/case-study skills/gushwork-web/templates/<client-slug>
```

Each template's README records what it was measured from, **where the live site disagrees with
that source and which one won**, and every off-token value it carries. Read it before editing
— the disagreements are the part you would otherwise rediscover.

### Standing rules from the case-study review — 7 Sep 2026

These came out of a correction pass on the case-study template and apply to any page on this
surface, not just that one.

1. **No related-stories carousel unless it is asked for.** Removed from the case-study
   template on 7 Sep 2026. When one is requested it must **function and use real stories** —
   real thumbnails, titles and industries, working prev/next. Placeholder cards behind a
   scroll shim are not the deliverable.
2. **Section grounds are full-bleed; only the content column is capped.** Never put a
   `max-width` on the page shell. The Figma frame is 1440, but a 1440 shell leaves white
   gutters on a wider display. Cap the content at `--gw-content-width` and centre it.
3. **The navbar is fixed, not absolute.** Transparent over a light hero, taking
   `--gw-color-neutral-alpha-80-white` once scrolled, `background-color` transitioning over
   0.4s. No blur, no shadow, no border — the live site has none.
4. **Verify at 1440 *and* a wider viewport.** A 1440-only check cannot catch a re-introduced
   width cap, which is the thing most likely to regress.
5. **A sticky rail starts flush with the prose.** No leading offset; the sticky top only needs
   to clear the fixed navbar.

The lead-magnet document template is at repo-root `templates/lead-magnet/` and belongs to
`gushwork-lead-magnet`, not this skill.

## Cross-surface: which one?

Three components exist **separately per surface**. Getting this wrong is the most common way
web output goes off-system.

| | Use on web | Not this — that's dashboard |
|---|---|---|
| **Button** | `Button` (`1457:668`) — `Style` = `Blue` / `Black` / `Outlined/ black` / … | The dashboard `Button` (`2203:931`) — `Primary` / `Outline` / `Ghost` |
| **Avatar** | `client/avatar` — grayscale squircle, real client photos | `Avatar` (`1658:24023`) — generated character, app users |
| **Logo** | `gushwork-logo` — the full marketing wordmark | `gushwork-logo-(internal-use)` — 32×32 symbol tile |

**Web and dashboard use two different button component sets by design** — intentional, not a
Figma bug to be tidied away. Both are literally named `Button`, and both expose a `Style`
property whose values are completely disjoint. `Style=Blue` is web-only. `Style=Primary` is
dashboard-only and invalid here. Never merge, alias, or substitute the two sets.

**Badge is genuinely shared** — same component, both surfaces. See
`foundation/shared-components.md`.

## Surface defaults

These sit above the individual component rules.

- **Content column is `--gw-content-width` (1240) inside a 1440 page**, centred with
  `--gw-content-margin` (100px). Not `--gw-bp-content-width` — that variable holds 1400 and is
  not the content column. Ruled 6 Aug 2026; see `RECONCILIATION.md`.
- **Eyebrows are black by default.** `Color=Default` is black and is what you use.
  `Color=Blue` is **only when asked** — do not reach for the blue eyebrow because it looks
  better against a heading. Blue accents are earned, not decorative.
- **`Size=Medium` is the button default in all folds.** `Small` for navbars. `Large` only
  when asked.
- **Fold CTAs are opt-in** — `Show CTA` is a boolean, and the worked page examples hide
  every in-fold button. Don't add CTAs to every fold by reflex.
- **Use `Show Card 3`–`Show Card 6` to add or drop cards.** Never delete card instances to
  shorten a grid.
- **Every fold ships Desktop + Phone.** Set `Breakpoint` explicitly — the documented
  default disagrees between blobs. On phone: grids collapse to one column, buttons go
  full-width, and a primary/secondary pair stacks vertically with a 12px gap.
- **Client avatars are grayscale.** Desaturate any photo you place.
- **Never fabricate a client logo or a client name.** The set has 24; if a client isn't in
  it, say so.
- No emoji. No italics in display copy. No bare coloured status dots — use a Badge or an
  eyebrow. See `foundation/shared-components.md`.

## Copy

The primary CTA reads exactly **`Book a Demo`** — a fixed, capitalised brand string and a
deliberate exception to sentence case. Everything else is sentence case. Secondary CTA is
`Calculate ROI with Gushwork`. Form CTAs stay action-specific (`Check my lead potential`,
`Pick a time`) and are **not** normalised to the primary. Full ruling and the Figma
contradictions: `foundation/voice.md`.

Replace every placeholder. The components ship `lorem ipsum` inside `Card / Information`,
plus `Card title`, `Column Header`, `List Item`. None of it is real copy.

## Known gaps in the source — do not paper over these

Encoded so you don't silently invent an answer:

- **`Special/ With People` and `Special/ Glowing` exist only at `Size=Large,
  Icon Placement=Trailing`.** No Small, no Medium, no Disabled, no other icon placement.
  The rule asks for usage the component cannot satisfy.
- **`fold/ Cards Grid (small)` renders 4 cards, not 3.** Both the rule and the structure
  blob say 3. Set the `Show Card` toggles explicitly.
- **`Card / Case Study and Blog` has no `Device` property**, unlike the other card types.
- **`footer/…/list-item` is a broken component set** — both variants share a name and it
  can't be addressed directly.
- **Announcement-banner dismissal persistence is undefined.** Don't invent a rule for
  whether it stays dismissed.
- **`Text/ black`** is fully built at 36 variants and documented nowhere. Treat it as the
  lowest-emphasis tier and confirm before using it as a primary or secondary CTA.
- **Fold name prefixes are inconsistent and literal** — nine use `fold/ ` with a space,
  three don't (`fold/AI Agents`, `fold/Timeline`, `fold/Comparison Table`). Several style
  keys carry irregular spacing (`Outlined/ black` vs `Outlined / white`). Copy them exactly;
  don't tidy them.
- **`size` is lowercase on `client/avatar`** while every other component uses `Size`.
- **No eyebrow variant exists for coloured surfaces.** The set is 6 variants — `Type` ×
  `Color` × `State` — and none of them is an on-blue or on-black treatment. If you need a
  label on a full-bleed blue or black fold, say the variant doesn't exist rather than
  inventing a translucent-white pill.
- **The web and dashboard secondary-button keys differ by two letters** — web is
  `Outlined/ black`, dashboard is `Outline`. Close enough that a careless find-and-replace
  or a substring match silently crosses surfaces. Match the whole key, not a prefix.

If a request needs a value or variant that doesn't exist, say so. Don't interpolate a
radius, invent a variant, or guess a behaviour.

## When the library is missing something

Two situations, handled differently.

### Fall back — a whole deliverable or surface

A slide deck, a flyer, a standalone tool, a dashboard (that is `gushwork-dashboard`), or a
page type with no folds at all. **Do not build these.** Say plainly it is not in the system
yet and point at Utsav on Slack: `https://gushwork.slack.com/team/U06UAR183TR`.

Also fall back for the components a circulating Figma-agent specification documents that are
**not in this file**: `Modal`, `Empty State`, `Dropdown Menu`, `Notification Badge`,
`Segmented Control`, `Breadcrumbs`, `Date Picker`, standalone `Pagination`. That spec's
structural claims were checkable in nine places and wrong in all nine. Treat it as a lead,
never as authority — see `RECONCILIATION.md`.

### Build it — a small element missing from an otherwise buildable page

A fold that needs a stat strip, a pill group, a small callout — something the folds almost
cover. **Build it, then declare it.** Refusing a whole page over one missing chip is worse
than building the chip and saying so.

Three conditions, all required:

1. **Compose from what exists first.** Most "missing" things are `fold/ other` with the
   right contents, or a fold you have not considered. Check `folds.md` and `atoms.md`.
2. **Tokens only.** A new element may combine existing values in a new shape; it may never
   introduce a new colour, type style, radius, shadow or spacing value. If it needs one,
   that is a finding to report.
3. **Mark it in the code** — a comment saying it is new, what it was for, and that it is
   pending library review.

### Then notify — every time

**If you created or modified any element, say so before you finish** — as **one message block
the user copies straight into Slack**, not a summary plus a message. Write the full record to
`notices/YYYY-MM-DD-<slug>.md`, commit and push it so the link resolves, then give the
four-line block. Format: `foundation/new-component-notice.md`.

**Never let a created element pass silently.** An undeclared component is worse than a
refusal, because it looks official.

## When the request is out of scope

**Always try to fulfil the request by composing existing components first.** Most requests
that sound novel are a `fold/ other` with the right contents, or a fold you haven't
considered. Check `folds.md` and `atoms.md` before concluding anything is missing.

Fall back **only** when the request genuinely needs a component, surface, or deliverable
type that isn't in this skill yet — a slide deck, a flyer, a standalone tool, or a component
with no match in the exports.

When you do fall back, tell the user plainly that the thing they've asked for isn't in the
Gushwork design system yet, and point them at Utsav on Slack to get it added:
`https://gushwork.slack.com/team/U06UAR183TR`. Say it in your own words — don't paste the
same sentence every time.

**Never invent a component or guess at a brand rule to fill a gap.** Falling back is always
better than producing something off-system.

## Source of truth

Figma — Gush Design System v2.0, file `VKcb4fgVyOHKfQonMgN772`, page
`↳ web/ pattern-library`, with worked page compositions on `↳ web/ template-library`
(`1658:24579`).

The exports in `exports/web/` are transcribed from that page's annotations, with the
inconsistencies flagged inline. Where a rule and the actual component disagree, the exports
document **the component** and note the discrepancy — the component is what renders.

## Stamp every page you build — it is how its owner finds out the design moved

A landing page is a file that outlives the session that made it. There is no server and no record
of who built what, so nothing can be *pushed* to its owner. The stamp is the substitute, and it is
the same mechanism the dashboard surface uses.

**Every page you build gets a `gushwork-build:{...}` comment** carrying the plugin version, the
surface, who built it, when, and the components it used:

```json
{"pluginVersion":"1.43.0","surface":"web","createdBy":"...","createdAt":"2026-09-01",
 "registry":"https://gushwork-design.vercel.app/exports/web/component-registry.json",
 "changelog":"https://gushwork-design.vercel.app/preview/changelog-sheet.html",
 "components":["hero","cards-grid","faqs","cta","footer"]}
```

**`surface` is not optional.** It selects which registry the reader checks against, and a stamp
without it is read as a dashboard — so a web page missing the field is silently diffed against the
wrong component set. Component names come from the decision table above, and must match the keys
in `exports/web/component-registry.json` exactly; a name that is not a key is reported as "no
longer in the registry" rather than checked.

`bash scripts/check-drift.sh <file-or-dir>` reads the stamp and reports only the intersection of
*components this page uses* and *components that have changed* — split into MUST (renders wrong)
and MAY (improved). Shared components — `badge`, the logo, the icon set — live in
`exports/shared/component-registry.json` and are merged into every surface, so a change to one is
reported once rather than per surface.

**When you change a component's spec, bump it in the registry in the same commit.** A change that
is not registered is a change nobody is told about. Set `breaking: true` only when an existing
build renders *wrong* until updated, as opposed to merely missing an improvement.

Several web components share a spec doc, so a fold-level change currently moves every fold. That
is the honest starting point rather than a claim of precision the docs cannot support — split an
entry out when its spec genuinely diverges.
