# Actions — buttons, menus, switchers

Scope: the controls that make something happen or switch what is shown, for dense analytics dashboards and web apps. Source of truth is the design hub (`web/shell.css`, `web/admin/analytics.html`, `web/admin/access-control.html`, `web/internal/design-system.html`), consolidated from its duplicated `ul-*`/`ac-*`/`rv-*` blocks into one set. CSS is `css/20-actions.css`, behaviour is `js/20-actions.js` (`GD.actions`). Everything is scoped under the `gd` root class and takes its colours from `--gd-*` aliases, so light and dark come from `color-scheme` alone. Every height flows from `--gd-control-h` (36px comfortable, 28px under `data-density="compact"`). Blue is data and status; black (`--gd-ink`) is interaction state, so no button, selected tab or toggle is ever blue. Destructive is a red label and red edge on the neutral shape, never a red fill; a confirm dialog carries the weight.

## Action button

**Use** for any action a person triggers: save, export, add, apply. **Not** for navigation between pages (a link or tab) or for a single glyph with no label (icon button).

Anatomy: `.gd-btn` with an optional leading or trailing 16px glyph and a label.
```html
<button type="button" class="gd-btn gd-btn--primary"><svg …/>Add campaign</button>
```
Variants: `--primary` (ink fill, one per view), default outline (1px edge), `--ghost` (no edge), `--danger` (red label + red edge), `--link` (inline, underlined on hover). Sizes: default `--gd-control-h`, `--sm` 28px (toolbars, table footers). Radius 12 (8 at 28px and in compact). The 1px edge is an inset `box-shadow`, so a button hugs its content and is never 2px wider than it.

States: rest, hover (primary `--gd-ink-hover`; others `--gd-ctl-hover`), `:focus-visible` ring (keyboard only, R41), `aria-disabled="true"` or `:disabled` (primary: `--gd-ink-disabled-bg/fg`; others: `--gd-disabled-ink` label), `aria-busy="true"` (spinner replaces the glyph, pointer events off, label stays). Force hover in previews with `.is-hover`.

Tokens: `--gd-control-h`, `--gd-ink`, `--gd-ink-fg`, `--gd-ink-hover`, `--gd-ctl-hover`, `--gd-border-strong`, `--gd-danger`, `--gd-link`, `--gd-disabled-ink`, `--gw-text-button-14/12`, `--gw-motion-fast`.

Accessibility: use a real `<button>` (or `<a class="gd-btn">` for a link); disabled buttons keep `aria-disabled` so they stay discoverable; set `aria-busy` while loading and keep the accessible name. Behaviour: none in JS; the consumer owns click handling. Provenance: extracted `web/admin/analytics.html:357-359` (`.ul-btn`), `design-system.html:754-764` (`.rv-b`); hover from old button.md (neutral-850) where the hub agrees; `.rv-b--bad` red fill replaced by the ruled danger outline.

## Icon button

**Use** for a compact action whose meaning a glyph carries: more actions, copy, close, refresh, pager arrows. **Not** when the action is the primary one on screen (use a labelled button).

Anatomy: `.gd-iconbtn` holding one 16px SVG, always with `aria-label`. Optional `data-tip="Copy link"` draws a tooltip from the attribute on hover and keyboard focus; `data-tip-end` right-aligns it near a viewport edge. The bubble is clipped by an `overflow:hidden` ancestor; in tables use the Feedback tooltip instead.
```html
<button type="button" class="gd-iconbtn" aria-label="Copy link" data-tip="Copy link"><svg …/></button>
```
Variants: default (no edge), `--outline` (1px edge, the hub's `.ul-ib`), `--sm` (28px, 14px glyph). States: hover/open (`aria-expanded="true"` keeps the hover look while its menu is down), disabled, `aria-busy` (glyph spins). Tokens: `--gd-control-h`, `--gd-ctl-hover`, `--gd-text-muted`, `--gd-text`, `--gd-raised-bg` (bubble). Accessibility: Esc hides the tooltip (WCAG 1.4.13), `aria-label` is mandatory. Behaviour: Esc handler in `20-actions.js`. Provenance: extracted `web/shell.css:1861-1899` (`.gw-iconbtn` + `data-tip`), `analytics.html:187-193` (`.ul-ib`). The hub's 24px and 44px sizes are replaced by the density-driven square.

## Split button

**Use** when one action is the default and a few related ones sit behind it (Copy page / Open in…). **Not** for unrelated actions; use a menu button.

Anatomy: `.gd-split` > `.gd-split__main` (a `.gd-btn`) + `.gd-split__tog` (a `.gd-btn` with caret, `data-gd-menu`) + a `.gd-menu`.
```html
<div class="gd-split"><button class="gd-btn gd-split__main">Copy page</button>
<button class="gd-btn gd-split__tog" data-gd-menu aria-label="More page options"><svg …/></button><div class="gd-menu" hidden>…</div></div>
```
Variants: default, `--primary` (ink fill, hairline divider). States as button; the toggle shows hover while open and the caret flips. Menu right-aligns under the toggle and flips up when there is no room. Accessibility: toggle has an accessible name, `aria-haspopup="menu"`, `aria-expanded`. Behaviour: the menu engine (see Menu). Provenance: extracted `web/shell.css:2229-2260` (`.pa__split`, `.pa__main`, `.pa__tog`).

## Menu

**Use** for a list of actions or checkable options anchored to a trigger. **Not** for choosing a form value (select) or for navigation (nav). Shared primitive: Tables, Data and Feedback reference these class names.

Anatomy: `.gd-menu` (role `menu`) > `.gd-menu__item` (role `menuitem`, `menuitemcheckbox` or `menuitemradio`), `.gd-menu__sep`, `.gd-menu__label`, `.gd-menu__check`, `.gd-menu__text`, `.gd-menu__desc`.
```html
<div class="gd-pop"><button class="gd-btn" data-gd-menu aria-haspopup="menu" aria-expanded="false">Actions</button>
<div class="gd-menu" hidden><button class="gd-menu__item" role="menuitem"><svg …/><span>Edit</span></button>
<div class="gd-menu__sep"></div><button class="gd-menu__item gd-menu__item--danger" role="menuitem">Delete</button></div></div>
```
Variants: `--danger` (red label), `aria-checked="true"` (check mark and weight, in ink not blue), `aria-disabled="true"`, `--end` (right-aligned), description line, compact density (12px type). Hover and keyboard highlight use `--gd-menu-hover`.

Behaviour (JS): `data-gd-menu` on the trigger opens the menu with that id or the next sibling; the menu is placed `position:fixed` under the trigger, clamped to the viewport, and flips up when below-space is short. Esc closes and refocuses, ArrowUp/Down/Home/End move focus, type-ahead jumps, Tab closes, outside press, scroll and resize close. Checkable items flip `aria-checked`; every activation emits `gd:menu {item,value,checked}`; `data-gd-keep` keeps it open. Layering: z-index 60 (popover). Provenance: extracted `shell.css:1910-1937` (`.gw-pop`), `analytics.html:344-352` (`.ul-menu`), `access-control.html:283-308` (`.ac-dd`). The hub's blue check is dropped: selection is ink.

**Phone.** Rows are 44 tall and the menu is never wider than the screen minus 32.

## Segmented control

**Use** to set a value of the same data, usually a view: table / board / list, line / bar / table. **Not** to switch page sections (tabs) or for more than about seven options (select).

Anatomy: `.gd-seg[role=radiogroup]` > `.gd-seg__item[role=radio][aria-checked][data-value]`; `--icon` items carry only a glyph and need `aria-label`. Roving tabindex: the checked item is `tabindex="0"`.
```html
<div class="gd-seg" role="radiogroup" aria-label="View"><button class="gd-seg__item gd-seg__item--icon" role="radio" aria-checked="true" tabindex="0" data-value="table" aria-label="Table"><svg …/></button>…</div>
```
Selected is a soft fill (`--gd-selected-bg`) inside an edged track, which is what tells it from the black tabs-pill. States: hover, checked, disabled. Behaviour: arrows, Home/End move and select; emits `gd:change {item,value}`.

**Chart type switcher** is this component with icons and labels (Line, Bar, Table); there is no separate component. Provenance: NEW, not in the hub; reference Mobbin Linear and Mixpanel view switchers; pending library review.

**Phone.** The control spans its row and every option shares the width; if there are too many to fit it scrolls inside itself. Inside the page header's action row it keeps its own size.

## Tabs pill

**Use** for in-page view switching (Insights / Usage / Visits, or a period). **Not** for page-level sections (tabs underline) or for setting a value (segmented control).

Anatomy: `.gd-tabs.gd-tabs--pill[role=tablist]` > `.gd-tabs__tab[role=tab][aria-selected][aria-controls]`, optional `.gd-tabs__count`; panels are `.gd-tabs__panel`.
```html
<div class="gd-tabs gd-tabs--pill" role="tablist" aria-label="Analytics"><button class="gd-tabs__tab" role="tab" aria-selected="true" tabindex="0">Insights</button>…</div>
```
Track `--gd-track-bg` with a 1px inset edge so 28px tabs still fit; selected is ink fill (white text, inverts in dark); hover `--gd-track-hover`; disabled `aria-disabled`. Compact density tightens padding so the track is 28px. Behaviour: click and arrows activate (automatic activation), toggles `hidden` on `aria-controls` panels, emits `gd:tab {tab,value}`; tablists inside `[data-gd-metric-strip]` are skipped. Provenance: extracted `analytics.html:177-181` (`.ul-tabs`, `.ul-tab`).

**Phone.** The pill row scrolls inside itself rather than overflowing the page.

## Tabs underline

**Use** for page-level sections (Overview / Members / Billing), sticky under the page header. **Not** for in-page view switches.

**One row per page (R59).** Never stack two underlined rows. If a page's sections each have sections of their own, the upper level is a rail submenu (`nav-group`, see `navigation.md`) and only the lower level is `tabs-underline`. The hub's Design System page does this: Library, Review and Workflow are the submenu, Foundations, Web pages, Slides and the rest are the one underlined row.

Anatomy: same roles as tabs pill with `.gd-tabs--underline`; a hairline runs full width and a 2px ink bar sits under the selected tab. Overflow scrolls horizontally with the scrollbar hidden. States: rest `--gd-text-muted`, hover and selected `--gd-text`, focus ring inside the tab, disabled. Same JS and events as tabs pill. Provenance: extracted `web/admin/access-control.html:24-32` (`.ac-tabbar`, `.ac-tab`).

## Period select

**Use** for the common "how far back" control on a chart or table: 7 days / 30 days / All time. For a full range with custom dates and compare, use time range bar. 

Anatomy: a tabs-pill track used as a radiogroup inside `.gd-period`, optional `.gd-period__t` caption.
```html
<div class="gd-period"><div class="gd-tabs gd-tabs--pill" role="radiogroup" aria-label="Period"><button class="gd-tabs__tab" role="radio" aria-checked="true" tabindex="0" data-value="30">30 days</button>…</div></div>
```
States and tokens as tabs pill. Behaviour: emits `gd:change {item,value}`. Provenance: extracted `analytics.html:555-559` (the Period `.ul-tabs`); it is a composition, kept as its own key because it is the pattern teams reach for first.

## Shortcut key

**Use** whenever a control has a keyboard shortcut: the shortcut is shown inside that control, after its label, as a quiet key cap. **Not** as a separate hint line under or beside a group of buttons (R53), and not for a shortcut with no control to carry it: that goes in the control's tooltip (`title`), as in "Save (⌘S)".

Anatomy: `.gd-btn__key` as the last child of a `.gd-btn`, `aria-hidden="true"`, with `aria-keyshortcuts` on the button so assistive tech still gets the key.
```html
<button type="button" class="gd-btn gd-btn--primary" aria-keyshortcuts="A">Approve<kbd class="gd-btn__key" aria-hidden="true">A</kbd></button>
```
The cap is the label's own colour at 55% on a 14% tint of it, 18px tall with a 4px radius, 8px after the label. It is a filled shape, so the button's right padding is inset to `(control height - 18) / 2`, which makes the cap's gap to the right edge equal its gap above and below. Keys read as they appear on the keyboard: `A`, `Esc`, `⌘↵`. Not drawn at `--sm` (28px buttons are too tight), on touch (`hover: none`) or under 768px: there is no keyboard to press, and the shortcut still works.

States: it follows its button (hover, focus, disabled, busy); the cap has none of its own. Tokens: `--gd-control-h`, `--gw-space-4`, `--gw-space-8`, `--gw-radius-4`, `--gw-text-body-12-med`. Provenance: NEW (R53, from Utsav's review of the Review drawer footer, 5 Oct 2026); the drawer's own `.rv-b kbd` is the hub's copy of the same pattern. Pending library review. Not `.gd-kbd`: that class is the Feedback key hint (tooltips, the command palette) and has its own colours.

## Info hint

**Use** beside a metric or column name to define it (bounce rate, cost per lead). **Not** for errors, or for text people must read to proceed.

Anatomy: `.gd-hint` > `.gd-hint__label` (plain text, no underline: the glyph is the cue) + `.gd-hint__btn` (info glyph, `data-tip` carries the definition, `aria-label` names it). The bubble opens centred under the label and glyph together, not under the glyph alone.
```html
<span class="gd-hint"><span class="gd-hint__label">Bounce rate</span><button class="gd-hint__btn" aria-label="About bounce rate" data-tip="Share of sessions that ended on the first page."><svg …/></button></span>
```
States: rest muted, hover/focus darker and the bubble opens (max 240px, wraps), Esc dismisses. The bubble here is CSS from `data-tip`; Feedback owns the real tooltip, so inside scrollers and sticky table headers where `overflow` would clip it, point `aria-describedby` at the Feedback tooltip instead. Provenance: NEW, not in the hub; reference Mobbin Square, Google Analytics and Fresha; pending library review.
