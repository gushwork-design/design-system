# Shared components

Atoms used on **both** surfaces. Referenced by both skills; restated in neither.

Everything else is surface-specific — see `exports/web/` and `exports/dashboard/`.
Three components look shared but are not: **Buttons, Avatars, and Logos each exist
separately per surface.** The Logo section below covers both, because one component
serves marketing and a different one serves product chrome. For Buttons and Avatars,
go to the per-surface exports.

**The text field is shared and has its own file — `foundation/text-field.md`.**
`input/text-field` `1562:705`, 14 variants. It is drawn in the web library, but
`dashboard-login-screen` instantiates it and the dashboard has no field of its own, so it
was promoted here rather than duplicated. `DECISIONS.md` → **R1**. It is the only
component that crossed the surface boundary; **if a second one does, promote it too**
rather than letting the boundary blur one exception at a time.

---

## Badge

The status/label pill. Used by web cards and tables, and by dashboard kpi-cards and
dropdowns.

**Component set** `badge` · node `1582:628` · **108 variants** (complete).

| Property | Values |
|---|---|
| `Theme` | `Light`, `Dark` |
| `Color` | `Neutral`, `Red`, `Green`, `Yellow`, `Blue`, `Black` |
| `Icon` | `no`, `trailing`, `leading` |
| `Size` | `Small`, `Medium`, `Large` |

### Colour carries meaning — pick by what you are signalling

| Colour | Signals |
|---|---|
| `Neutral` | No signal. **The default** when nothing is specified. |
| `Red` | Bad / error / negative. |
| `Green` | Good / success / positive. |
| `Yellow` | Okay / warning / in-between. |
| `Black` | Neutral, but higher emphasis than `Neutral`. Use when a neutral badge needs to stand out. |
| `Blue` | **Undefined.** The rule never says what blue signals. Do not reach for it to mean "info" — ask first. |

Never use colour decoratively. A green badge on a falling metric is a bug.

### Icons

- **Leading icon** supports or clarifies the label. Optional.
- **Trailing icon** carries the signal as an arrow: up-arrow on green (positive),
  down-arrow on red (negative). On `Neutral`, `Blue`, or `Black` the arrow direction
  depends on context.

### Surface treatment

Each colour has a light and a dark treatment. **Match the surface the badge sits
on** — light badge on a light surface, dark on dark. Do not mix.

**Light labels are the `/600` step — see `DECISIONS.md` R18.** The `/500` label this file used
to imply fails WCAG AA at `body-12-med` on all three signal colours (red 4.28:1, yellow
3.07:1, green 3.15:1 against a 4.5:1 threshold). Fills are unchanged. **Figma still ships the
`/500` label**, so an instance pulled from the file will disagree with this line until the set
is updated. The dark treatment (`{Colour}/Alpha/10` + `/300` label) has not been measured and
is still open.

### Notes on the source

- The rule (`1979:10774`) calls the default colour **"Grey"**; the actual variant
  value is **`Neutral`**. "Grey" appears nowhere in the component. Use `Neutral`.
- The rule defines five signals but the component ships six colours — `Blue` is
  undocumented, then referenced later in the rule's own Icons paragraph as though it
  had been defined.
- The badge description claims support for **"counts"**. There is no count or
  numeric variant. Do not build one.
- **Provenance:** Badge physically lives on the *web* component-library page, and its
  rule text is surface-agnostic — it never says web, dashboard, or both. Treating it
  as shared is a deliberate decision recorded here, matching how it is actually used
  (dashboard kpi-cards and dropdowns instance it). The Figma file does not state it.

---

## Gushwork Logo

Two different components. Pick by surface first, then by background.

### Which one?

| Surface | Use | Node |
|---|---|---|
| Marketing web — navbar, footer, hero, any brand or ad page | `gushwork-logo` | `1670:30247` |
| Dashboard / product chrome — the rail mark | `gushwork-logo-(internal-use)` | `2102:13508` |

Never use the internal-use tile on a marketing surface. Never use the marketing logo
as the dashboard rail mark.

### Marketing — `gushwork-logo`

**40 variants** (complete).

| Property | Values |
|---|---|
| `Size` | `16 px`, `20 px`, `24 px`, `40 px`, `80 px` — **note the space before `px`** |
| `Type` | `Original`, `White`, `Dark`, `Blue Icon + White text` |
| `Only Symbol` | `yes`, `no` |

The variant keys carry a space (`16 px`). The rule prose writes them without one
(`16px`). Copying sizes out of the prose produces keys Figma will not resolve — use
the keys above.

**Pick `Size` by context, at a step.** Never render below `16 px` and never at an
in-between size.

**Pick `Type` by background:**

| Type | When |
|---|---|
| `Original` | Blue icon + dark wordmark. **The default.** All white and light backgrounds. |
| `White` | Dark backgrounds. The default choice for dark surfaces. |
| `Dark` | Near-black icon + wordmark. When brand blue can't be used or is being avoided — monochrome and single-colour contexts. |
| `Blue Icon + White text` | Dark backgrounds, **only when asked**. The alternative to `White`. |

**`Only Symbol = yes`** gives the icon-only mark with no wordmark. Use where space is
tight or the wordmark would be redundant.

### Committed assets — use these, never redraw the mark

| File | Variant |
|---|---|
| `assets/logo/gushwork-logo-original.svg` | `Type=Original` lockup — blue symbol + dark wordmark |
| `assets/logo/gushwork-logo-white.svg` | `Type=White` lockup |
| `assets/logo/gushwork-logo-dark.svg` | `Type=Dark` lockup |
| `assets/logo/gushwork-symbol-original.svg` | `Only Symbol=yes`, blue |

Exported from Figma at `Size=80 px` and stripped of the swatch-frame chrome Figma bakes
into a node export. They carry a `viewBox` and no fixed width/height, so scale them with
CSS to the `Size` step you need.

**The wordmark's dark is `#111827`, and it has no token.** `--gw-color-secondary-500` was that
value and was removed on 1 Oct 2026 (page text and surfaces that used it now use `--gw-color-black`).
The logo files keep their own `#111827`: it is deliberately *not* `--gw-color-neutral-900`
(`#262a2e`) or `--gw-color-black` (`#0d0d0d`), and a logo file is not recoloured to match a token.
The blue symbol is `#0070ff` — `--gw-color-primary-500`.

### Dashboard — `gushwork-logo-(internal-use)`

A fixed **32×32** tile, radius 8, padding 8, wrapping
`gushwork-logo (Size=16 px, Type=White, Only Symbol=yes)`. No variants, no choices.
It is the rail mark in `dashboard-build` and nothing else.

**Conflict to be aware of:** 32px is exactly an in-between size, which the marketing
logo's own rule forbids. The internal-use tile is therefore forbidden by the shared
rule while simultaneously being the mandated dashboard asset. Two components, two
scopes — the rule text just doesn't say so. Follow the "which one?" table above.

### Never

- Redraw, recolour, restretch, or rebuild the logo. Use the component.
- Place `Original` on a dark surface or `White` on a light one.
- Add a tagline, container, or effect the component doesn't have.

---

## Icons — Phosphor

The icon library is Phosphor, published into the file as **1,248 component sets**, each
with the same matrix:

| Property | Values |
|---|---|
| `Weight` | `Thin`, `Light`, `Regular`, `Bold`, `Fill`, `Duotone` |
| `Size` | `12`, `16`, `20`, `24`, `28`, `32`, `36`, `40` |

48 variants per icon. Plus a `Social Icons` set (`228:2205`) covering 26 platforms in
`Original` and `Negative` at `Size=32`.

The icon group carries **no weight or size guidance** in Figma — its description says
nothing about which of the 48 to use. The conventions below are drawn from how the
components actually instance icons, and are the defaults to follow:

- **`Regular`** for inline and navigational icons.
- **`Bold`** inside buttons and for the small icon tiles in dashboard section headers.
- **`Fill`** for filled glyphs — a badge glyph, a caret in a dropdown trigger.
- Colour via `currentColor` only. Never hardcode an icon fill.

### Weight per context — verified, not inferred

The weight an instance uses is recoverable from the node id it reports. Inside a set,
`Regular, Size=32` is `set+1`, then `Thin`, `Light`, `Bold`, `Fill`, `Duotone` at +2 each,
and every variant's `vector-element` child sits at `variant+1`. Decoding what each measured
component actually instances:

| Context | Icon | Weight |
|---|---|---|
| Button trailing icon — navbar CTA, `Special/*` | `ArrowUpRight` | **Bold** |
| navbar nav-item caret — Platform, Solutions | `CaretDown` | **Bold** |
| `section/header` refresh control | `ArrowClockwise` | **Bold** |
| `controls/dropdown` trigger caret | `CaretDown` | **Fill** |
| `eyebrow` `Color=Default` leading glyph | `SealQuestion` | **Fill** |
| `eyebrow` `Color=Blue` leading glyph | `Handshake` | `Regular` |
| `section/progress-bar` header tile | `Target` | `Regular` |

**Regular is not a safe default inside a component.** Five of the seven contexts above use
something else. Buttons, nav carets and the refresh control are `Bold`; dropdown triggers
and the Default eyebrow are `Fill`. An earlier pass rendered all seven as Regular and the
glyphs came out visibly too light.

The eyebrow is the sharp case: its two colour variants use **different weights** —
`Fill` on Default, `Regular` on Blue — so you cannot pick one weight per component either.

### Committed icon assets — the complete library

**All 1,512 Phosphor icons, all six weights, are in `assets/icons/`.** Look one up at
`assets/icons/{weight}/{kebab-name}.svg`. Full conventions, provenance and the verification
method: `assets/icons/README.md`.

The Figma library is Phosphor imported. Extracting 1,248 sets node-by-node was not viable
(~2,500 calls per weight), so the upstream package was taken and **verified against Figma** —
four icons harvested directly from the file are kept in `assets/icons/_figma-verified/` and
overlay their upstream counterparts exactly. Re-check with `preview/icon-verify.html`.

Three constraints that bite. **The first two are the same failure — an icon that silently
renders black — and both have shipped.**

- **Inline the SVG.** An `<img src="….svg">` cannot inherit `currentColor` and falls back to
  black. Use an inline `<svg>` or a `<symbol>`/`<use>` sprite.

- **Building a sprite? Carry `fill` onto the `<symbol>`.** The committed files put
  `fill="currentColor"` on the **outer `<svg>`**, and the inner `<path>` has no fill of its
  own:

  ```svg
  <svg xmlns="…" viewBox="0 0 256 256" fill="currentColor"><path d="…"/></svg>
  ```

  Stripping that wrapper to make a `<symbol>` **drops the only `fill` in the file**, so every
  glyph in the sprite paints black. It is not obvious in review — the icons appear, they are
  just the wrong colour, and on a dark kpi-card or inside a blue tile it reads as a design
  choice rather than a bug.

  `fill` is an inherited presentation attribute, so re-apply it to the symbol:

  ```html
  <symbol id="i-chart" viewBox="0 0 256 256" fill="currentColor">…</symbol>
  ```

  **Verify by sampling, not by looking:** read `getComputedStyle` on each icon's host and
  confirm it resolves to the token you expect. Black where you expected `primary-500` or
  `green-300` is this bug.

- **1,512 upstream vs 1,248 in Figma.** ~264 files here are not in the Figma library. Using
  one is off-system even though the file exists. No manifest of the 1,248 exists, so this
  can't be checked automatically — sanity-check an unusual-looking icon against Figma.

### Size the `<svg>`, not just its wrapper

A `<svg>` with no `width`/`height` renders at the SVG default **300 × 150**, regardless of the
size set on the span or button around it. `overflow: hidden` on an ancestor hides the damage
while the element still pushes layout — a 12px caret measured 300px wide and threw its row's
scrollWidth out by 284px.

Every icon holder sizes its own `svg`, without exception:

```css
.some-icon-holder svg { width: 12px; height: 12px; display: block; }
```

**Never substitute a text glyph for an icon.** `⌄` is not `CaretDown`, `⟳` is not
`ArrowClockwise`, `⋮` is not `DotsThreeOutlineVertical`.

### Never

- **No emoji, ever** — not as bullets, decoration, or status. If you need a status
  signal, use a Badge or a Phosphor icon.
- **No bare coloured status dots.** Use a Badge.
- Do not draw an icon by hand. If Phosphor doesn't have it, that is a finding.

### Notes on the source

- Three sets are still named `component_set-element` — `112:12523`, `112:12537`,
  `112:17221`. Figma placeholder names, so they are unsearchable by icon name.
- All 20 icon category labels bind the legacy `paragraph-01/P1Regular` type variable
  rather than a `Body/*` token.
- Two stray `Cloud` instances (`271:1054`, `271:1060`) sit loose in the set grid and
  bind the legacy `gray/900`.

---

## What is *not* shared, despite appearances

The `shared-components` page in Figma (`1658:23895`) contains a plain text layer
(`1658:24152`) listing eleven intended shared components:

> Badge · Avatar · Icon Button · Chip · Divider · Tooltip · Spinner · Progress ·
> Skeleton · Tag · Status Indicator

**None of them is implemented on that page.** It is aspirational scaffolding. The one
component that *is* there — `gushwork-logo` — is not in the list. Of the eleven,
`Badge` and `Tooltip` exist on the web page; the rest do not exist anywhere in the
file.

If a request needs an Icon Button, Chip, Divider, Spinner, Progress, Skeleton, Tag, or
Status Indicator as a shared atom: **it does not exist yet.** Do not build one. Fall
back — see the out-of-scope section in either skill.
