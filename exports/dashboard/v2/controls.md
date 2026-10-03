# Controls — control, icon-button, tabs, input

Page `Dashboard Components` (`257:371`) in **`Q9L6q38dEj3Qu1JkjiT13y`** — the product file, not
the library. See `README.md` in this folder.

**Scope: dashboard / product.**

---

## `control` — one component, four jobs

Set `267:1810` · **32 variants**.

| Property | Values |
|---|---|
| `Kind` | `button` · `select` · `nav` · `user` |
| `Style` | `outlined` · `primary` · `plain` · `filled` · `selected` |
| `Size` | `28` · `32` · `36` |
| `Theme` | `light` · `dark` |

**The matrix is deliberately incomplete** — `Style` and `Size` values are per `Kind`. Valid
combinations only:

| Kind | Styles | Sizes | Variants |
|---|---|---|---|
| `button` | `outlined` · `primary` · `plain` | 28 · 32 · 36 | 18 |
| `select` | `outlined` · `filled` | 28 · 32 | 8 |
| `nav` | `plain` · `selected` | 32 | 4 |
| `user` | `plain` | 32 | 2 |

Why one component: the library `list-item` had been **detached 34 times** across nine sizes to do
all four of these jobs. Utsav ruled one flexible control rather than five named components,
13 Aug 2026.

Stable layer names for overrides: **`icon-leading`** · **`icon-trailing`** (hidden by default) ·
**`identity`** · **`meta`** · **`action`**.

**Component properties:** `Label` (TEXT) · `Leading icon` and `Trailing icon` (BOOLEAN). Layer
names remain stable for anything the properties do not cover.

### Geometry — shared by button and select

| Size | Radius | Padding | Gap | Label | Icon |
|---|---|---|---|---|---|
| `28` | `radius/8` | `py-8 px-12` | `spacing/4` | `button-12-med` | 12 |
| `32` | `radius/8` | `py-8 px-12` | `spacing/4` | `button-14-med` | 16 |
| `36` | **`radius/12`** | `py-8 px-12` | `spacing/4` | `button-14-med` | 16 |

Height is **fixed**, not hugged — 28/32/36 exactly. Width hugs.

### `Kind=button`

**36h at `radius/12` is the dashboard button.** That is what the screens render — the topbar
`Sync Now` (112 × 36) and `Compare` (97 × 36). 28 and 32 are provided for dense rows.

| Style | Theme | Fill | Border | Label | Icon |
|---|---|---|---|---|---|
| `outlined` | light | none | 1px `neutral/200` | `neutral/900` | `neutral/600` |
| `outlined` | dark | none | 1px **`neutral/700`** | **`neutral/50`** | `neutral/300` |
| `primary` | light | `neutral/black` | none | `neutral/white` | `neutral/white` |
| `primary` | dark | **`neutral/white`** | none | **`neutral/900`** | `neutral/900` |
| `plain` | light | none | none | `neutral/900` | `neutral/600` |
| `plain` | dark | none | none | `neutral/50` | `neutral/300` |

**Dark primary is a full inversion** — white fill, dark label. Measured, and consistent with the
dark active tab and the dark checked checkbox. Do not carry `neutral/black` into dark.

`primary` exists because **the screens contain no filled button at all** — only outlined. Utsav
ruled a black primary in, 13 Aug 2026, matching the active tab and checked checkbox rather than
introducing a new colour. **Still never a blue fill** — the standing surface default holds.

⚠ **One unresolved disagreement in the source.** In dark, the two buttons that are identical in
light diverge: `Sync Now` renders no fill + `neutral/700` border + `neutral/50` label, while
`Compare` renders **`neutral/800` fill + `neutral/600` border + white label**. `Style=outlined,
Theme=dark` encodes the `Sync Now` treatment. **The filled dark treatment is not represented** —
if you need it, that is a finding.

### `Kind=select`

`SPACE_BETWEEN`, trailing `CaretDown` **12px Weight=Bold**.

| Style | Theme | Fill | Border | Label |
|---|---|---|---|---|
| `outlined` | light | `neutral/white` | 1px **`neutral/400`** | `neutral/900` |
| `outlined` | dark | **`neutral/800`** | 1px `neutral/600` | `neutral/white` |
| `filled` | light | `neutral/25` | 1px `neutral/200` | `neutral/900` |
| `filled` | dark | `neutral/900` | 1px `neutral/800` | `neutral/white` |

`neutral/400` is the **only** place in the system a border uses that step — it is measured, and it
is what makes a select read as an input rather than a button. Both `outlined` and `filled` were
ruled in as legitimate, 13 Aug 2026: outlined for inline selects, filled for filter selects.

⚠ **There is no open-menu state.** The screens never drew one. For the menu, `controls.md`
(v1) `controls/dropdown` `State=Open` is still the reference — 160 wide vs a 144 trigger,
right-aligned, `neutral/50` border, no selected checkmark.

### `Kind=nav`

**200 × 32**, `radius/8`, padding `spacing/8`, gap `spacing/8`. Leading icon 16, label
`button-14-med`, **label grows** so the row fills the rail.

| Style | Theme | Fill | Label | Icon |
|---|---|---|---|---|
| `plain` | light | none | `neutral/900` | `neutral/600` |
| `selected` | light | `neutral/100` | `neutral/900` | `neutral/600` |
| `plain` | dark | none | `neutral/white` | `neutral/300` |
| `selected` | dark | **`neutral/800`** | `neutral/white` | `neutral/300` |

Group labels are **not** part of this component — see `cards-and-chrome.md` → `sidebar`.

### `Kind=user`

**200 × 32**, `SPACE_BETWEEN`, gap `spacing/8`, `radius/8`, **no fill in any state** (the v1
`user-card` ruling still holds).

- `identity` → `Avatar` **32 × 32** + `meta`
- `meta` → name `button-12-med` `neutral/black` (dark: `neutral/white`) over role
  `button-10-med` `neutral/400` (dark: unchanged), gap `spacing/4`
- `action` → 24 × 24, `radius/4`, padding `spacing/4`, `SignOut` 16 Weight=Bold `neutral/600`
  (dark: `neutral/300`)

⚠ The library's `user-card` renders its Avatar at **42.7 × 32 — squashed**. This one is a correct
square 32 × 32. Fixing the library instance is a filed finding.

---

## `icon-button`

Set `268:403` · **6 variants** (3 × 2).

| Property | Values |
|---|---|
| `Size` | `20` · `24` · `28` |
| `Theme` | `light` · `dark` |

**Size-driven styling** — this is intentional, ruled 13 Aug 2026:

| Size | Radius | Padding | Icon | Fill | Border |
|---|---|---|---|---|---|
| `20` | `radius/4` | `spacing/4` | 12 | none | none |
| `24` | `radius/4` | `spacing/4` | 16 | none | none |
| `28` | **`radius/8`** | `spacing/8` | 12 | none | **1px `neutral/200`** |

20 and 24 are ghost affordances (24 uses in the screens); **28 is the outlined standalone control**
used by the pagination arrows. Swap the layer named **`icon`**.

**Dark:** icon `neutral/300`; `Size=28`'s border becomes `neutral/700` — the chrome border step
measured on the dark topbar, not the `neutral/800` card border.

---

## `tab-item`

Set `268:408` · **4 variants** (2 × 2), complete.

| Property | Values |
|---|---|
| `State` | `default` · `active` |
| `Theme` | `light` · `dark` |

**28h**, `radius/8`, `py-8 px-12`, gap `spacing/4`, `button-12-med`.

| State | Theme | Fill | Label |
|---|---|---|---|
| `default` | light | none | `neutral/900` |
| `active` | light | `neutral/black` | `neutral/white` |
| `default` | dark | none | `neutral/white` |
| `active` | dark | **`neutral/white`** | **`neutral/black`** |

**Inactive labels are not greyed** — the v1 observation still holds, both themes.

---

## `tab-group`

Set `356:913` · **2 variants** (`Theme` = `light` · `dark`).

**36h**, `radius/12`, padding `spacing/4`, gap **`spacing/4`**, fill `neutral/50`, 1px
`neutral/100`. Holds `tab-item` instances; set exactly one to `State=active`.

Renders 340 wide with four tabs. The screens' date-range row is 413 with five.

⚠ **Gap `spacing/4`, not 8.** The v1 `controls/tab` used `gap-8`; the screens use 4. Screens won.

**Dark (measured):** container `neutral/900` + 1px `neutral/800`; the active item inverts to a white
fill with a `neutral/black` label. Now a variant set, so the dark topbar and page-header point at
the dark variant instead of carrying hand-applied overrides.

---

## `icon-toggle-group`

Set `356:921` · **2 variants** (`Theme`). **66 × 36** — exactly the topbar theme switcher.

`radius/12`, padding `spacing/4`, gap **`spacing/2`**, **no fill**, 1px **`neutral/200`**.
Two 28 × 28 cells at `radius/8`:

| Cell | Fill | Icon |
|---|---|---|
| `toggle-on` | `neutral/black` | 12px `neutral/white` |
| `toggle-off` | none | 12px `neutral/600` |

**This is deliberately not `tab-group`.** Same 36h and `radius/12`, but no fill and a
`neutral/200` border instead of `neutral/50` + `neutral/100`, and gap 2 not 4. Both specs are
measured; Utsav ruled them two components, 13 Aug 2026.

Dark (applied as an override in `topbar Theme=dark`): container border → `neutral/700`,
`toggle-on` → `neutral/white` fill with a `neutral/900` icon, `toggle-off` icon → `neutral/white`.

---

## `input`

Set `269:528` · **12 variants** (2 × 3 × 2).

| Property | Values |
|---|---|
| `Type` | `text` · `search` |
| `State` | `placeholder` · `filled` · `focus` |
| `Theme` | `light` · `dark` |

**NEW — the dashboard screens contain no text input of any kind.** Built from the `select`
`outlined` spec so it sits in the same family. Declared 13 Aug 2026.

**240 × 36**, `radius/8`, `py-8 px-12`, gap `spacing/8`, fill `neutral/white`, 1px `neutral/400`.
Label `button-14-med`, and it grows.

| State | Border | Text | Extra |
|---|---|---|---|
| `placeholder` | 1px `neutral/400` | `neutral/400` | — |
| `filled` | 1px `neutral/400` | `neutral/900` | — |
| `focus` | 1px **`neutral/black`** | `neutral/900` | 1 × 16 caret, `neutral/black` |

`Type=search` prepends `MagnifyingGlass` 16 Weight=Regular, `neutral/400`.

⚠ The `focus` border here is a **fill treatment, not the focus ring** — and since R41 (3 Oct 2026)
it is the field's whole focus state: a text field takes no ring, because a click into it counts as
keyboard focus. See `states.md`.

⚠ **`foundation/text-field.md` is the shared 14-variant text field used by both surfaces, and it
remains authoritative for forms.** This component is the dashboard's dense inline field — a table
toolbar search, a filter box. If you are building a form, use the shared atom.

**Dark is DERIVED, not measured** — the dark screen contains no input. Taken from the measured dark
select: `neutral/800` fill + 1px `neutral/600`, white value, `neutral/400` placeholder, focus border
`neutral/white`.
