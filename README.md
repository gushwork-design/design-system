# Gushwork Design System

A governed design system for **Gushwork**, packaged as a Claude Code plugin.

Gushwork is the AI Marketing Team that researches, writes, publishes, and ranks content
across AI search engines — ChatGPT, Perplexity, Gemini — and traditional search, then pipes
qualified inbound leads to your inbox.

This repo exists so that anything Claude generates for Gushwork comes out on-brand by
default: the right components for the right surface, real tokens instead of guessed hexes,
and a hard stop rather than an invented component when something genuinely doesn't exist yet.

## Install

**Easiest — paste this into Claude Code** and approve the commands it runs:

```
Set up the Gushwork Design System plugin for me:

1. Run: claude plugin marketplace add gushwork-design/design-system
2. Run: claude plugin install gushwork-design@gushwork
3. In ~/.claude/plugins/known_marketplaces.json, set "autoUpdate": true on the
   "gushwork" entry. Leave everything else in that file alone.
4. Verify with: claude plugin list

Then tell me to restart Claude Code, and give me three lines on how to use it.
```

By hand, if you prefer: `claude plugin install` resolves a plugin **name from a marketplace**, not
a git URL. This repo is its own single-plugin marketplace, so add it once, then install:

```bash
claude plugin marketplace add gushwork-design/design-system && claude plugin install gushwork-design@gushwork
```

`scripts/install.sh` does all three steps and is safe to re-run.

New to it? Read [`ONBOARDING.md`](ONBOARDING.md) first — five minutes, and it covers the four
ways output goes off-system.

**Rolling it out to a team or the whole org?** Don't send these commands around — commit a
`.claude/settings.json` and it installs itself. See [`ROLLOUT.md`](ROLLOUT.md).

Then just describe what you're building. The skills trigger on the work, not on being named:

- *"Build a pricing page for Gushwork"* → `gushwork-web`
- *"Add a KPI row to the leads dashboard"* → `gushwork-dashboard`

## Changing the system — how an edit reaches everyone

A design system change has two halves, and only one of them ships.

**Editing Figma changes nothing for anyone.** The repo is what the plugin serves. Nothing
watches Figma, so a colour changed there and not here means every session keeps emitting the
old value with full confidence — the most expensive failure mode in the system, because it is
silent. Measure it into `exports/` or `tokens.css` in the same sitting.

The chain, end to end:

| Step | Who | What |
|---|---|---|
| 1 | maintainer | change it in Figma |
| 2 | maintainer | measure it into `exports/` or re-pull `tokens.css` — see [`CONTRIBUTING.md`](CONTRIBUTING.md) |
| 3 | maintainer | `bash scripts/release.sh 1.2.0 "<summary>" --session "<uuid> <title>"` — stamps version + date into both manifests and every skill's announce line, makes the release commit, rebuilds [`CHANGELOG.md`](CHANGELOG.md) **and** `preview/changelog-sheet.html` as a second commit, then verifies the three agree. Add `--publish` to deploy too |
| 4 | maintainer | `GW_PUSH=1 git push origin main` — `release.sh` deliberately does not push |
| 5 | maintainer | `bash scripts/release-notes.sh`, then post it in Slack — there is no push notification |
| 6 | everyone | nothing, if `autoUpdate` is on — the session-start hook takes it at the next start and names what changed. Otherwise `claude plugin marketplace update gushwork && claude plugin update gushwork-design@gushwork`, then **restart** |

Three things worth knowing:

- **Content propagates without a version bump.** The marketplace clone *is* the plugin, so a
  refresh is a `git pull` and whatever is on `main` becomes live. Versions are how people tell
  you what they're running, not the delivery mechanism.
- **`claude plugin list` lags.** A marketplace refresh updates the skills but leaves the reported
  version at whatever was last installed — verified: skills at 1.2.0 while `list` still said
  1.1.0 until `claude plugin update gushwork-design@gushwork` ran. The **skill's own announce
  line** is the trustworthy figure, which is why it's stamped.
- **`plugin update` needs the full `plugin@marketplace` form.** Bare `gushwork-design` fails with
  "Plugin not found".
- **Auto-update is off by default for third-party marketplaces.** Set `autoUpdate: true` and
  step 6 happens on startup; leave it and a teammate runs whatever they installed, indefinitely,
  with no warning. Either way **a restart is required** — updating without one leaves the old
  skills loaded. See [`ROLLOUT.md`](ROLLOUT.md).

Steps 5 and 6 disappear entirely if you deploy via committed `.claude/settings.json` or managed
settings, which is what [`ROLLOUT.md`](ROLLOUT.md) recommends.

Verdicts from a [`notices/`](notices/) review are exactly what feeds step 1. That is the loop
closing: a deviation someone hit in a real build becomes a measured value everyone gets.

## Two surfaces, two skills

The system covers two surfaces that look and behave differently, so they are two skills with
disjoint trigger vocabularies. They are deliberately **not** merged.

| Skill | Surface | Fires on |
|---|---|---|
| [`gushwork-web`](skills/gushwork-web/SKILL.md) | Public marketing site | landing page, ad lander, hero, fold, CTA section, pricing, comparison table, testimonial, case study, FAQ, navbar, footer |
| [`gushwork-dashboard`](skills/gushwork-dashboard/SKILL.md) | Logged-in product | dashboard, app screen, KPI card, analytics panel, data table, side nav, filters, tabs, toasts |

Spacious white-and-blue marketing surfaces on one side; dense gray-canvas product surfaces
with black-and-outline actions on the other. Blue is a primary action on the website and a
signal-only colour in the product.

## Foundation — referenced, never duplicated

Both skills point at these. Neither restates them, and neither should.

| File | Holds |
|---|---|
| [`foundation/tokens.css`](foundation/tokens.css) | 188 custom properties — colour, type, spacing, radii, shadows — pulled from the Figma **variables** |
| [`foundation/voice.md`](foundation/voice.md) | Voice, casing, punctuation, the primary-CTA ruling, banned words |
| [`foundation/shared-components.md`](foundation/shared-components.md) | The atoms genuinely shared across both surfaces — Badge, Gushwork logo, Phosphor icons |
| [`foundation/new-component-notice.md`](foundation/new-component-notice.md) | How a skill declares anything it had to build itself, and routes it to review |

## Rules in the skill, structure in the exports

Each `SKILL.md` holds only **usage rules** — default → exception, which component when, what
never to do — and stays short enough to load cheaply on every invocation. The bulky variant
enumerations, dimensions, and node IDs live in `exports/`, which the skills reference by
filename.

```
gushwork-design/
├── README.md
├── .claude-plugin/plugin.json
├── foundation/
│   ├── tokens.css
│   ├── voice.md
│   ├── shared-components.md
│   └── new-component-notice.md
├── skills/
│   ├── gushwork-web/SKILL.md
│   └── gushwork-dashboard/SKILL.md
├── notices/          declared elements and deviations, one file per piece of work
└── exports/
    ├── web/          page-shell · folds · fold-elements · atoms · cards · button · avatar · images
    └── dashboard/    dashboard-build · sections · section-elements · button · avatar · controls · toast · build-rules
```

## The composition ladder

Both surfaces mirror each other. Compose downward; never place a lower tier directly into a
page shell's slot.

```
web         atoms  →  fold-elements  →  Folds     →  Page Build
dashboard          section-elements  →  Sections  →  Dashboard Build
```

## Three components exist separately per surface

Buttons, Avatars, and Logos are **not** shared, and mixing them is the most common way output
goes off-system. Both skills carry a "which one?" pointer.

| | Web | Dashboard |
|---|---|---|
| **Button** | `Button` `1457:668` — `Blue` / `Black` / `Outlined/ black` / … | `Button` `2203:931` — `Primary` / `Outline` / `Ghost` |
| **Avatar** | `client/avatar` — grayscale squircle, real client photos | `Avatar` `1658:24023` — generated character, app users |
| **Logo** | `gushwork-logo` — full marketing wordmark | `gushwork-logo-(internal-use)` — 32×32 symbol tile |

The two button sets are **both literally named `Button`** and expose a `Style` property whose
values are completely disjoint. This is intentional and permanent — never merge or alias
them.

**Badge is genuinely shared**, same component on both surfaces — web cards and tables,
dashboard KPI cards.

## When the library is missing something

Both skills compose from existing components first. What happens next depends on the size of
the gap.

**A whole deliverable or surface** — slides, a flyer, a tool, a page type with no folds —
**falls back.** The skill says it isn't in the system yet and points at Utsav on Slack rather
than inventing something plausible.

**A small element inside an otherwise buildable screen** — a stat tile, a segmented toggle,
an empty state — **gets built, then declared.** Refusing a whole screen over one missing chip
is worse than building the chip and saying so. Three conditions: compose from what exists
first, use tokens only (a new element may combine existing values in a new shape but never
introduce a new one), and comment it in the code as pending review.

Either way the skill **tells you** — as one four-line block you copy straight into Slack,
carrying a link to the full record in [`notices/`](notices/). One artefact, not a summary plus
a message: copy, click, paste, send. Format in
[`foundation/new-component-notice.md`](foundation/new-component-notice.md).

Each notice ends with a **"Worth a decision"** section naming the one or two items that are
real judgement calls rather than routine adaptations — see
[the Meta Ads notice](notices/2026-08-06-meta-ads.md) for a worked example.

The point isn't to prevent drift — it's to make drift **visible**. An undeclared component is
worse than a refusal, because it looks official.

Slides, flyers, and tools are planned; the structure above absorbs them as additional skills
without touching the foundation.

## Two sources, and where they disagree

Everything in `exports/` is **measured** — read off specific Figma nodes and traceable to a
node ID. A separate *Master Specification* generated by the Figma agent also describes the
system, and the two conflict in about a dozen places, including one governance rule (whether
a blue button fill is allowed on dashboards).

**[`RECONCILIATION.md`](RECONCILIATION.md)** records every conflict, which source each export
follows, and the six questions that need a ruling. Read it before trusting either source on
the navbar, the dashboard button, the dashboard avatar, toasts, or content width.

The short version: where they disagree, the exports follow the measured node, because that is
what actually renders.

**`↳ web/ component-library` has now been read** — see
[`exports/web/component-library.md`](exports/web/component-library.md). It holds **23 component
sets and 525 variants**, and it contains **no second navbar and no second button set**. The old
hypothesis here — that a second set would dissolve most of the conflicts into "two components,
document both" — is disproven, and Utsav's 6 Aug ruling to the same effect is now confirmed by
measurement rather than assertion. The conflicts are real disagreements; measured wins.

The "21 component sets" figure repeated in earlier inventories was counting **21 stray hidden
`Frame 2147223955` nodes** at the page root. The count was right; the interpretation was not.

## Known issues in the Figma source

The Figma file is the source of truth, and it contradicts itself in places. Every one of
these is flagged inline where it matters rather than silently smoothed over — the exports
document **what the component actually renders**, since that's what ships.

- **Canvas swatch labels have drifted from the variables.** All 12 Neutral and 7 of 12
  Primary hex labels are from a superseded palette, and 10 of 31 typography spec rows
  contradict their own variables. `tokens.css` is generated from the **variables**, which are
  authoritative. Never read a value off the canvas.
- **The primary CTA appears three different ways** — `Book a demo` (51 nodes), `Book a call`
  (42 nodes), `Book a Demo` (3 nodes). Ruled: **`Book a Demo`**, a fixed capitalised string
  and an explicit exception to sentence case. See [`foundation/voice.md`](foundation/voice.md).
- **Variant keys carry irregular spacing and are load-bearing** — `Outlined/ black` vs
  `Outlined / white`, nine folds prefixed `fold/ ` and three not, `size` lowercase on
  `client/avatar`, Figma auto-generated `Property 1` / `Variant4` / `Mode3`–`Mode6`. Copied
  exactly, never normalised.
- **Rules that disagree with their own components** — `fold/ Cards Grid (small)` documents 3
  cards and renders 4; the `Special/*` button rule asks for sizes the set doesn't contain;
  kpi-card has 6 of 18 `Mode × Type` combinations; Avatar has one `Admin=true` variant.
- **Mismatched and missing descriptions** — `talking-guy` carries a description copied from a
  different component; `Agent Card` has no Info Frame at all; no fold-element has its own
  Rules of Usage.
- **Structural defects** — `footer/…/list-item` is a broken component set; stray U+2028 LINE
  SEPARATOR characters in three rule blobs break Figma MCP serialization and are why
  whole-page metadata reads fail.

Renaming Figma variants is a breaking change for anything keyed to them, so none were renamed
in building this. The list above is the fix queue, not a changelog.

## Source of truth

Figma — **Gush Design System v2.0**, file key `VKcb4fgVyOHKfQonMgN772`. Marketing components
on `↳ web/ pattern-library` with worked pages on `↳ web/ template-library`; product components
on `↳ dashboard/ component+pattern-library` (`1658:24112`).

When the Figma file changes, update the affected `exports/` file and re-check the rule in the
matching `SKILL.md`. Tokens come from the variables — re-pull them, don't hand-edit.
