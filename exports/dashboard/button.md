# Dashboard Button

> ## ⚠ SUPERSEDED — 13 Aug 2026
>
> **The dashboard button is now `control` `Kind=button` — see
> [`v2/controls.md`](v2/controls.md).**
>
> | | This file (`Button` `2203:931`) | v2 (`control` `267:1810`) |
> |---|---|---|
> | Height | 28 · 44 · 48 | **36** (28/32 for dense rows) |
> | Radius | 8 (12 at `Large`) | **12** at 36 |
> | Gap | 8 | **4** |
> | Styles | `Primary` · `Outline` · `Ghost` | `outlined` · `primary` · `plain` |
>
> The dashboard screens render 36h at `radius/12` with gap 4, and Utsav ruled the screens
> authoritative on 13 Aug 2026. This component set is still what is **published in the library**,
> so it remains correct for anything instancing from Figma — but new dashboard output should
> follow v2.
>
> **Still authoritative here:** the `Disabled` treatments (they differ by `Style`), and the
> **measured** hover fills — `Primary` `neutral/850`, `Outline` `neutral/35`, `Ghost`
> `neutral/50`. v2 does not define hover or disabled states at all, so read them from this file.

## Which button?

**This is the dashboard/product button.** There is a *different* component with the
same name for marketing web.

| Surface | Component | Node | `Style` values |
|---|---|---|---|
| **Dashboard / product** | `Button` — this file | `2203:931` | `Primary`, `Outline`, `Ghost` |
| Marketing web | `Button` — see `exports/web/button.md` | `1457:668` | `Blue`, `Black`, `Outlined/ black`, `Outlined / white`, `Text/ black`, `Special/ With People`, `Special/ Glowing`, `White` |

**Both component sets are literally named `Button`, and both expose a property named
`Style` whose value sets are disjoint.** `Style=Primary` is valid here and invalid on
web. `Style=Blue` is valid on web and invalid here. If you are on a dashboard, the only
legal styles are the three below. Neither component's own rule text states its scope —
that is why this block exists.

Figma: group `button` (`2205:15680`), set `2203:931`.

---

## Variant properties — 108 variants (3 × 3 × 3 × 4), complete

| Property | Values | Default |
|---|---|---|
| `Style` | `Primary`, `Outline`, `Ghost` | `Primary` |
| `State` | `Default`, `Hover`, `Disabled` | `Default` |
| `Size` | `Small`, `Medium`, `Large` | `Small` |
| `Type` | `Text Only`, `Trailing Icon`, `Leading Icon`, `Icon Only` | `Text Only` |

Every combination exists. Variant names take the form
`Style=Primary, State=Default, Size=Small, Type=Text Only`.

## Action hierarchy — maps to `Style`

| Action | Style | Appearance |
|---|---|---|
| Primary | `Primary` | Black filled |
| Secondary | `Outline` | Outlined / black |
| Third, lowest emphasis | `Ghost` | Text only |

**Never use a blue fill on dashboards.** The tiers here are black / outlined / text
only.

**The general rule, ruled 7 Aug 2026 — blue carries data and status; black carries interaction
state.** The older phrasing banned blue *button fills* only, which left control states
unclassified and let blue leak into selected dates and toggles.

| Carries | Colour | Examples |
|---|---|---|
| Data and status | blue | `section/progress-bar` fill, chart series, Info toasts, blue badges, focus rings |
| Interaction state | black | selected calendar date, `controls/toggle` `State=On`, any selected / active / pressed state |

Full statement in `exports/dashboard/controls.md`.

## Size

**Match the size of surrounding elements** (controls, table toolbars). Usually `Small`
or `Medium`. `Large` only when the context calls for it.

| Size | Dimensions (Text Only) | Icon size |
|---|---|---|
| `Small` | 88 × 28 | 16 × 16 |
| `Medium` | 115 × 44 | 18 × 18 |
| `Large` | 134 × 48 | 18 × 18 |

Width grows with content. Reference widths per `Type` at each size:

| Size | Text Only | Trailing / Leading Icon | Icon Only |
|---|---|---|---|
| `Small` | 88 | 112 | 28 × 28 |
| `Medium` | 115 | 141 | 44 × 44 |
| `Large` | 134 | 156 | 48 × 48 |

## Type

Pick by icon need: `Text Only`, `Leading Icon`, `Trailing Icon`, or `Icon Only`.

`Icon Only` + `Ghost` is the established pattern for table pagination arrows — see
`section-elements.md`.

## State

`Default` / `Hover` / `Disabled` are **interaction states, not a choice.** The component
handles them. Don't pick a state when composing; pick `Style`, `Size`, and `Type`.

### Hover values — MEASURED

An earlier pass ruled these by hand, on the belief that the `State=Hover` symbols carried no
fill. **They do.** Read off `2203:839`, `2203:875` and `2203:911` on 8 Aug 2026 — all three ruled
values were wrong:

| `Style` | Hover — measured | Node | Was ruled | Delta |
|---|---|---|---|---|
| `Primary` | **`--gw-color-neutral-850` `#2e3338`** | `2203:839` | `neutral-900` `#262a2e` | one step lighter |
| `Outline` | **`--gw-color-neutral-35` `#f5f5f5`** fill | `2203:875` | `neutral-25` `#f7f8f9` | one step darker |
| `Ghost` | **`--gw-color-neutral-50` `#f1f2f3`** | `2203:911` | `neutral-25` `#f7f8f9` | two steps darker |

The gaps are small in hex and consistent in direction: **Figma's hovers are one step stronger
than the guess, every time.** Two more corrections that fall out of the same read:

- `Outline` keeps its **2px `--gw-color-neutral-100` border across both states** — confirmed
  against `2203:863`. Hover adds a fill and changes nothing else.
- `Ghost` and `Outline` do **not** share a hover value. The ruling assumed they did.

Transition with `--gw-motion-fast`. Focus follows `exports/dashboard/states.md` — a
`--gw-focus-ring` on `:focus-visible` (keyboard only, never `:focus`), which is **required**,
because a restyled `<button>` otherwise gives keyboard users nothing.

> The lesson is the one already in `CONTRIBUTING.md`: *a value you ruled is a value you did not
> read.* Ruling is for what Figma genuinely leaves blank. Check that it is blank first.

## Structure

```
Type=Text Only        COMPONENT (HORIZONTAL auto-layout)
                      └── TEXT "Button text"

Type=Trailing Icon    ├── TEXT "Button text"
                      └── INSTANCE "Trailing Icon" → VECTOR

Type=Leading Icon     ├── INSTANCE "Icon" → VECTOR
                      └── TEXT "Button text"

Type=Icon Only        └── INSTANCE "Icon" → VECTOR
```

- All variants use horizontal auto-layout.
- Icons are **swappable instances** (instance swap) — any Phosphor icon. Use `Bold`
  weight inside buttons.
- `Style` controls fill/stroke appearance (solid, outlined, transparent).
- `State` controls interaction feedback.

## Label copy

Sentence case. Placeholder is `Button text` — replace it. Dashboard buttons are action
labels for the product, not marketing CTAs: `Export`, `Add campaign`, `Save changes`.
The `Book a Demo` rule in `foundation/voice.md` governs marketing CTAs and does not
apply to product actions.

## Type token

Button labels use the `Button/*` type ramp, not the Body ramp —
`--gw-text-button-12` / `-14` / `-16` from `foundation/tokens.css`. Line-height 1,
tracking 0; vertical centring comes from padding.

---

## Re-measured off the set, 7 Aug 2026

Earlier values here came from instances. Read off `2203:931`, symbol by symbol.

| | Fill / border | Label |
|---|---|---|
| `Primary` | **`--gw-color-neutral-black` `#0d0d0d`** — not `neutral-900` | `--gw-color-neutral-white` |
| `Outline` | **2px `--gw-color-neutral-100`**, no fill | `--gw-color-neutral-black` |
| `Ghost` | none | `--gw-color-neutral-black` |

**`Disabled` is three different treatments, not one.**

| | Disabled |
|---|---|
| `Primary` | fill swaps to **`--gw-color-neutral-200`**; the label stays **white** |
| `Outline` | border unchanged; label → **`--gw-color-neutral-250`** |
| `Ghost` | still no fill; label → **`--gw-color-neutral-250`** |

### Geometry — padding depends on `Size` **and** `Type`

| `Size` | Height | Radius | `Text Only` | With an icon | Label |
|---|---|---|---|---|---|
| `Small` | 28 | 8 | `px-12 py-8` | — | 12, leading 1 |
| `Medium` | 44 | 8 | `px-20 py-16` | `px-20 py-16` — **still symmetric** | `body-14-med` 14/20 |
| `Large` | 48 | **12** | `px-24 py-16` | **`pl-24 pr-20 py-16`** | 16, leading 1 |

**The asymmetry is `Large` + icon only.** `Large` `Text Only` is symmetric `px-24`, and `Medium`
stays symmetric even with an icon. Widths: `Small` 88 / 112 / 28□, `Medium` 115 / 141 / 44□,
`Large` 134 / 156 / 48□. Icon is 16 at `Small`, 18 above it; `gap-8`.

> An earlier revision of this section claimed Large was always asymmetric and that Disabled
> simply dimmed the label. Both were extrapolated from a single `Ghost` symbol and both were
> wrong — caught before shipping by reading `Primary` and `Outline` too.
