# Base layer

The layer under every dashboard component: the colour aliases and how they follow the theme, the density
switch, the keyboard focus ring and the motion rules. It is `css/00-base.css`. A builder never writes it;
it is why every other component can be themed and densified by one attribute.

## Theme and density

**Purpose.** One place that decides what a surface, a line, a piece of text and an interaction fill look
like in light and dark, and how tall a control, a row and a header are. Put `class="gd"` on `<body>` and
every `gd-` component follows. Do not use it to restyle a single component; if a component needs a value
the aliases do not give it, add an alias in that component's partial and report it.

**Anatomy.**
```html
<html lang="en">                  <!-- no data-theme = follows the OS, live; "light" or "dark" forces one -->
<body class="gd">                 <!-- data-density="compact" here, or on any region, switches density -->
```

**Theme.** `color-scheme` is set on `:root` (`light dark`, or the forced value from `data-theme`), and every
alias is one `light-dark(light value, dark value)` declaration. There is no second block to forget: the hub
declares each alias three times (bare, `prefers-color-scheme`, `[data-theme="dark"]`), and an alias missed in
one silently keeps the other theme's value. Needs a browser from 2024 or later, which the hub already requires.
The theme choice is stored by the hub as `gw-theme-choice` (`system`, `light`, `dark`; R37). Pages read it in an
inline script before first paint so there is no flash.

| Group | Aliases |
|---|---|
| Surfaces | `--gd-page-bg`, `--gd-panel-bg`, `--gd-card-bg`, `--gd-raised-bg` (popover, drawer, dialog), `--gd-sunken-bg` |
| Lines | `--gd-border` (hairline), `--gd-border-strong` (a control's edge), `--gd-border-focus` (a text field's focused edge) |
| Text | `--gd-text`, `--gd-text-body`, `--gd-text-muted`, `--gd-placeholder`, `--gd-link` |
| Interaction | `--gd-hover-bg`, `--gd-selected-bg`, `--gd-nav-label`, `--gd-ink` / `--gd-ink-fg` / `--gd-ink-hover` (the primary action: black in light, inverted in dark), `--gd-disabled-fg`, `--gd-scrim` |
| Signal | `--gd-accent`, `--gd-good`, `--gd-warn`, `--gd-danger` (fills and edges; small text uses `--gd-tone-*-fg`) |

**Density.** The single switch for heavy dashboards. Comfortable is the default.

| Variable | Comfortable | Compact | Drives |
|---|---|---|---|
| `--gd-control-h` | 36px | 28px | buttons, inputs, selects |
| `--gd-row-h` | 56px | 40px | table rows |
| `--gd-head-h` | 44px | 36px | table headers |
| `--gd-cell-px` | 16px | 12px | cell padding |
| `--gd-gap` | 16px | 12px | gaps between cards and controls |
| `--gd-card-pad` | 20px | 16px | card padding |

Use compact for tables of hundreds of rows and screens with many charts; comfortable for settings and
detail. Do not mix them inside one region. Set it on a region (`<section data-density="compact">`) to
densify only that region.

**Focus and motion.** Keyboard focus is a ring (`--gw-focus-ring`) on `:focus-visible` only; a text field
shows a 1px edge (`--gd-border-focus`) instead, because a browser counts a click into a text field as keyboard
focus (R41, `foundation/states.md`). `--gw-motion-fast` is declared once in `tokens.css` and is never
re-declared here; `prefers-reduced-motion` switches transitions and animations off for the whole `.gd` tree.
`.gd-num` turns on tabular numerals for any figure that can change.

**States.** Not applicable; this is a layer. A component's own states are in its doc.

**Accessibility.** Both themes are held to the contrast rules in the component docs; the aliases are
the reason a component cannot pick a text colour that fails on its own surface. Reduced motion is honoured by
default.

**Tokens.** `--gw-color-*`, `--gw-space-*`, `--gw-text-*`, `--gw-focus-ring`, `--gw-focus-offset`,
`--gw-motion-fast`. No value is introduced. Gaps reported, not invented: a type token for the 44px page title
and the 28px KPI figure (R15), a monospace font token.

**Provenance.** NEW as a layer. The aliases are the hub's `--s-*` (`web/shell.css`) and `--ul-*`
(`web/admin/analytics.html`) layers, consolidated and re-declared with `light-dark()`. Density has no hub
equivalent. Pending library review.
