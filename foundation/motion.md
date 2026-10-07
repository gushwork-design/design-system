# Motion — how a Gushwork surface moves

The rules for the small movements that make an interface feel responsive: a page arriving, a button
pressing in, a tab line gliding, a menu opening, a number counting up. They are **ruled, not
measured**: Figma draws none of them. Asked for by Utsav on 8 Oct 2026 ("subtle micro animations …
to elevate the user experience"), built and audited across every hub page, recorded as **R64**.

The system has one motion token, `--gw-motion-fast` (120ms), for colour changes. Everything below is
for *movement*, and lives in the hub's own sheet, `web/shell.css` (the block headed MICRO MOTION) and
`web/shell.js` (the block headed Micro motion), so a page inside the hub gets all of it for free.
**Do not add it again to a page that loads `shell.css`.**

## The rules

1. **Only `opacity` and `transform` move.** Nothing that reflows: no `width`, `height`, `top`, `left`,
   `margin`. (The tab line is the one thing that looks like a width change. It is a 1px bar that is
   `scaleX`-ed, so it is still a transform.)
2. **Travel 8px or less. Duration 320ms or less.** One easing: `--hub-ease`.
3. **Everything sits inside `@media (prefers-reduced-motion: no-preference)`**, and any script
   stands down when `matchMedia('(prefers-reduced-motion: reduce)')` matches. Someone who asks their
   system for less motion gets none of it, not a shorter version.
4. **Things arrive; they do not leave.** Menus, modals and dialogs animate in. Closing hides them at
   once. An exit animation needs the element kept alive after it is "closed", which is a bug surface.
5. **Nothing loops** except the loading skeleton pulse (`gw-ghost-pulse`, already ruled).
6. **Leave nothing behind.** An entrance uses `animation-fill-mode: backwards`, so no `transform`
   stays on the element afterwards. A lingering transform makes it a containing block and breaks
   `position: sticky` and `position: fixed` inside it.

## Tokens

Defined in `web/shell.css`. A page that does not load `shell.css` copies these three lines and the
rules it needs from below; it does not invent others.

```css
:root { --hub-ease: cubic-bezier(.2, .7, .2, 1); --hub-dur: 200ms; --hub-dur-enter: 320ms; }
```

| Token | Value | Used for |
|---|---|---|
| `--gw-motion-fast` | 120ms ease | colour, background, border, shadow, opacity changes |
| `--hub-dur` | 200ms | press and release (transform) |
| `--hub-dur-enter` | 320ms | entrances and the tab line |
| `--hub-ease` | `cubic-bezier(.2, .7, .2, 1)` | every transform and entrance |

## The five moments

| Moment | What it does | Values |
|---|---|---|
| **Entrance** | Page content, and a newly shown tab panel, rises and fades in. The first blocks stagger. | `hub-rise`: from `opacity 0; translateY(8px)`, 320ms, `backwards`. Blocks 2, 3, 4 and 5+ delayed 40, 80, 120 and 160ms. Starts when the shell reveals the page (`html.gw-shell-ready`), not behind the hidden body. A hero fades only (`hub-fade`), so its background grid does not shift. |
| **Press and hover** | A button or tab goes in on press. A rail row's label leans in on hover. | Icon buttons and close buttons `scale(.92)`, buttons `scale(.97)`, tabs and pills `scale(.96)`, rail row `scale(.985)` and its label `translateX(2px)`, 200ms. |
| **Tab line** | The underline glides to the open tab instead of jumping. | One `.gw-tab-ind` bar per underlined tab row, `translateX` + `scaleX`, 320ms. Added by `shell.js` to any `[role="tablist"]` whose open tab draws a thin line along its bottom edge; takes the page's own underline colour. |
| **Overlays** | Menus, modals, the search palette and dialogs arrive. | Menu `hub-pop` (4px rise, `scale(.98)`, 160ms); modal, palette box and dialog `hub-modal` (8px rise, `scale(.97)`, 320ms); scrims `hub-fade` 200ms. |
| **Numbers** | A whole-number KPI (`.ul-num`) counts up once. | 600ms, ease-out cubic, `tabular-nums`. A redraw with the same figure (a search keystroke) shows at once; a changed figure counts from the old one. Only plain whole numbers move. |

## Press is a list, not a global

`button:active { transform: scale(.97) }` is **wrong**. A button that positions itself with
`transform` (a centred pill, an absolutely placed close icon) would jump the moment it is pressed.
Press feedback is given to controls by name. A control with no transition at all still gets an eased
colour change from a zero-specificity default:

```css
:where(button, a[href], [role="button"], [role="tab"], summary) {
  transition: background-color var(--gw-motion-fast), border-color var(--gw-motion-fast),
              color var(--gw-motion-fast), box-shadow var(--gw-motion-fast), opacity var(--gw-motion-fast);
}
```

`:where()` has no specificity, so a component that sets its own `transition` keeps it. A new
button that should press in joins the named list in `shell.css` (both the `transition` and the
`:active` rule); it does not get its own one-off.

## What not to do

- **Do not stagger rows of a table or list that redraws.** Sort, page and search keystrokes redraw
  the rows, and rows re-animating while someone types reads as flicker.
- **Do not animate on every keystroke or refresh.** Entrances are for arriving, not for updating.
- **Do not slide a filled pill's selected background.** Pill groups (period pills, segmented
  controls) cross-fade the fill with the colour transition; only underlined rows get the line.
- **Do not animate layout** to make something "grow": use a transform on a fixed-size element.
- **Do not add a motion library.** Everything here is CSS plus about 100 lines of script.

## Where it applies

| Surface | Motion |
|---|---|
| **Hub pages and any page in the hub shell** (Library, Analytics, Access Control, Templates, Tools, Downloads, Overview, Login) | All of it, already, from `web/shell.css` and `web/shell.js`. Build with the shell's classes and add nothing. |
| **Dashboards built from `dashboard.css` and `dashboard.js`** (the analytics-overview and support-ops-app templates, and anything made from them) | The same values, already, under the `.gd` classes: `css/95-motion.css` (the children of `.gd-page` rise in, `.gd-btn`, icon buttons and tabs press, `.gd-menu` opens from its corner) and `js/90-motion.js` (stat-card and metric-strip figures count up; prefixes, suffixes and decimals are kept). The sliding selected fill (R61) and the arriving dialogs and drawers were already there. Add nothing. |
| **Ad landers and web pages (`gushwork-web`)** | Entrance, hover and press on buttons and cards, and menu/modal arrival. No count-up unless a stats block asks for it. Copy the tokens and the rules you use; keep rule 3. |
| **Hub tools (`gushwork-tools`)** | The tool's own page uses `tool-shell.css`, which does not load `shell.css`: add the press and entrance rules you need from this file. A tool that already slides its panels (the editor tools do) keeps that. |
| **Slides, lead-magnet PDFs, reports** | None. They are static output. |
| **Games, posters, one-offs (`gushwork-brand`)** | Yours to choose. If it reuses product UI (a button, a tab row), the product rules above apply to that UI. |

## Checking it works

A screenshot cannot show motion, and a hidden browser tab stops animation frames, so verify with
numbers:

- **It is applied:** `getComputedStyle(el).animationName` is `hub-rise` (entrance) and
  `transitionProperty` includes `transform` (press) on the real page, in light and dark.
- **The tab line lands:** click every tab, finish the transition
  (`ind.getAnimations().forEach(a => a.finish())`), and compare the bar's rect with the open tab's.
- **A redraw glides:** if the page rebuilds its tab buttons on click, the new bar must start at the
  previous tab, not at the left edge. `shell.js` remembers the last position for exactly this.
- **Reduced motion:** emulate `prefers-reduced-motion: reduce` and confirm nothing moves.
- **Cache:** after changing `shell.css` or `shell.js`, bump the `?v=` on every page that links it
  (`scripts/_add_shell.py` holds the current value), or returning visitors keep the old sheet.
