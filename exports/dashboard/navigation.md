# Dashboard navigation

The parts people use to get around: the rows and groups in the rail, the account row, the workspace switcher, breadcrumbs, the secondary navigation for settings-style pages, the theme menu and the search trigger. They live inside the shell (`shell.md`) and use `css/10-shell.css` and `js/10-shell.js`. Rows are links to places; a row that runs a command is a menu item or a button, not a nav item. Every one of them takes the same states: rest, hover, focus-visible (keyboard only, R41), current or selected, disabled. Hover is forced in docs with `is-hover`.

## Nav item

**Purpose.** One destination in the rail. Use it for a page or a top-level section. Do not use it for an action (use a button or menu item) or for a destination inside a page (use sub-nav or tabs).

**Anatomy.**
```html
<a class="gd-nav-item" href="/leads" aria-current="page">
  <svg>…</svg><span class="gd-nav-item__text">Leads</span><span class="gd-nav-item__meta">128</span>
</a>
```
`__meta` is an optional trailing count. The icon is a 16px Phosphor glyph, `fill="currentColor"`, with explicit width and height. A row that is a button (an expandable group head) uses `<button type="button">` with the same class.

**States.** Rest; hover (`--gd-nav-hover`, a step between the rail ground and the selected fill, because the rail ground is itself neutral-50 and a plain hover would not show); `aria-current="page"` (`--gd-selected-bg`, and hovering the current page does not change it); focus-visible (ring drawn inside the row); `aria-disabled="true"` (dimmed, not focusable by pointer). Label and icon share one colour.

**Tokens.** `--gd-nav-label`, `--gd-nav-fg-on` (label of the open page and of a hovered row), `--gd-nav-hover`, `--gd-selected-bg`, `--gd-nav-disabled`, `--gd-text-muted`. Height is `--gd-control-h - 4` (32 comfortable, 24 compact); the label has a 20px line height so descenders are not clipped.

**Accessibility.** The open page carries `aria-current="page"`. In the collapsed rail the visible text is removed and a Tooltip (`data-gd-tooltip`, placed right) supplies the name on hover and focus. Arrow Up and Down, Home and End move between rows.

**Provenance.** extracted: `web/shell.css:581-623`.

## Nav group

**Purpose.** A labelled set of nav items, and, new, a group a person can expand to reveal nested items. Use the labelled group to divide a rail into areas. Use the expandable group for a destination that has sub-pages (Reports with its own reports); keep it to one level. Hub groups are flat, with one use of the expandable group (R59): the Design System row opens to Library, Review and Workflow while its page is open, because that page has underlined tabs of its own and a page never stacks two underlined rows.

**Anatomy.**
```html
<div class="gd-nav-group" role="group" aria-label="Workspace">
  <div class="gd-nav-group__label">Workspace</div> …nav-items…
</div>

<div class="gd-nav-group">
  <button class="gd-nav-item gd-nav-group__head" type="button" data-gd-group-toggle aria-expanded="true" aria-controls="rep">
    <svg>…</svg><span class="gd-nav-item__text">Reports</span><svg class="gd-nav-group__caret">…</svg></button>
  <div class="gd-nav-group__items" id="rep"> …nav-items without icons… </div>
</div>
```
Children sit under a 1px guide line and carry no icon.

**Behaviour.** `data-gd-group-toggle` toggles `aria-expanded` and `hidden` on the controlled list. Enter and Space toggle; Arrow Right opens and Arrow Left closes the focused head. On load, a group holding the current page opens itself. The caret turns 90 degrees from the state. In the collapsed rail the children are hidden and a click expands the rail first.

**Tokens.** `--gd-text-muted` (label), `--gd-border-strong` (guide), the nav item tokens. The label is 12px medium, sentence case. Groups are `--gd-gap - 4` apart.

**Provenance.** flat group extracted: `web/shell.css:564-579, 1819-1826`. Expandable group NEW: reference Mobbin Linear, Notion; first used in the hub rail for Design System (`web/shell.js` `children`, `web/shell.css` `.gw-navsub`). Pending library review.

## Account row

**Purpose.** Who is signed in, pinned at the foot of the rail. Use it for the signed-in person with their role and one action (sign out). Do not use it as a navigation row or for a team list.

**Anatomy.**
```html
<div class="gd-account">
  <span class="gd-account__av"><svg>…</svg></span>
  <span class="gd-account__txt"><span class="gd-account__name">Utsav Singh</span><span class="gd-account__role">Admin</span></span>
  <button class="gd-account__act" data-gd-signout aria-label="Sign out"><svg>…</svg></button>
</div>
```
The avatar is the hub's 40px rounded-square tile with a dot pattern chosen from a hash of the email, so the same person draws the same mark. Name and role come from the session; when there is no real name, derive one from the address and keep the address in `title`. A long name stays on one line and truncates with an ellipsis; the full name is in `title`.

**States.** Rest; hover on the action; `data-state="loading"` draws the avatar and two text lines as pulsing blocks (`gd-pulse`) until the session answers, so nothing shoves its neighbours. Collapsed: avatar only.

**Behaviour.** `data-gd-signout` fires `gd:signout`; the app ends the session.

**Tokens.** `--gd-card-bg`, `--gd-border`, `--gd-ink` (tile), `--gd-ink-fg` (dots), `--gd-nav-label`, `--gd-text-muted`, `--gd-selected-bg` (loading blocks). The avatar is `--gd-control-h + 4` square.

**Provenance.** extracted: `web/shell.css:645-714`, `web/shell.js:437-493`.

## Workspace switcher

**Purpose.** Switch between workspaces or organisations from the top of the rail. Use it when a person can belong to two or more; with one workspace use the plain brand. Do not use it to switch pages.

**Anatomy.**
```html
<div class="gd-ws" data-gd-pop>
  <button class="gd-ws__trigger" data-gd-pop-trigger aria-haspopup="menu" aria-expanded="false">
    <span class="gd-ws__tile">GW</span>
    <span class="gd-ws__txt"><span class="gd-ws__name">Gushwork</span><span class="gd-ws__sub">Growth plan</span></span>
    <svg class="gd-ws__chev">…</svg></button>
  <div class="gd-menu gd-ws__menu" role="menu" data-gd-pop-menu hidden>
    <div class="gd-menu__label">Workspaces</div>
    <button class="gd-menu__item" role="menuitemradio" aria-checked="true" data-gd-workspace="gw" data-name="Gushwork" data-sub="Growth plan" data-initials="GW">…</button> …
    <div class="gd-menu__sep" role="separator"></div> <button class="gd-menu__item" role="menuitem">Create workspace</button>
  </div>
</div>
```
The list is the shared `.gd-menu`; this component only anchors it.

**States.** Rest; hover; open (`aria-expanded="true"`, selected fill); `aria-disabled`. Collapsed: the tile only, no card; the menu opens wider than the rail.

**Behaviour.** The up-down chevron is a working affordance: click, Enter, Space or Arrow Down open the menu and focus the checked item; Arrow keys, Home and End move; Enter selects, updates the trigger and fires `gd:workspace-change {id, name}`; Esc closes and returns focus; Tab and an outside click close it.

**Tokens.** `--gd-card-bg`, `--gd-border`, `--gd-border-strong`, `--gd-nav-hover`, `--gd-selected-bg`, `--gd-ink`, `--gd-ink-fg`. The trigger is `--gd-control-h + 8` tall.

**Provenance.** NEW: not in the hub, reference Mobbin Clerk, Vercel. Pending library review.

## Breadcrumbs

**Purpose.** Where the page sits in a hierarchy, with a way back up. Use it above a page title on detail and nested pages (Reports, Online, Purchase funnel). Do not use it on top-level pages, and do not use it as the only way back; the rail still shows where you are.

**Anatomy.**
```html
<nav class="gd-crumbs" aria-label="Breadcrumb"><ol>
  <li><a href="/reports">Reports</a></li>
  <li><a href="/reports/online">Online</a></li>
  <li><span aria-current="page">Purchase funnel</span></li>
</ol></nav>
```
The separator is drawn by CSS and is not read out. The current item is text, not a link.

**Behaviour and responsive.** Middle items truncate with an ellipsis at 24 characters before they wrap; the current item never truncates. At 767 and narrower only the parent and the current item remain, which is the "up one level" a phone needs.

**States.** Rest, hover (link darkens with a `--gd-hover-bg` fill), focus-visible, disabled link.

**Tokens.** `--gd-text-muted`, `--gd-text`, `--gd-placeholder` (separator), `--gd-hover-bg`.

**Provenance.** NEW: not in the hub, reference Mobbin Linear, Stripe. Pending library review.

## Sub nav

**Purpose.** A secondary navigation down the left of a page, for settings-style areas with many sibling pages (Profile, Security, Notifications, API keys), and, new, a two-level tree for report families (Reports, Online, Purchase funnel). Use it beside the content in a page layout split. Do not use it for the app's top-level destinations, and do not nest deeper than two levels.

**Anatomy.**
```html
<nav class="gd-subnav" aria-label="Settings">
  <div class="gd-subnav__label">Account</div>
  <a class="gd-subnav__item" href="#" aria-current="page"><span class="gd-subnav__text">Notifications</span></a>
  <button class="gd-subnav__item" data-gd-group-toggle aria-expanded="true" aria-controls="on"><span class="gd-subnav__text">Online</span><svg class="gd-subnav__caret">…</svg></button>
  <div class="gd-subnav__children" id="on"> …items… </div>
</nav>
```
A branch is a button; leaves are links. Only leaves are `aria-current`.

**Behaviour.** Same as nav group: `data-gd-group-toggle`, Left and Right collapse and expand a branch, Up and Down, Home and End move, and a branch holding the current page opens on load. On a phone the nav becomes a horizontal strip of leaves.

**States.** Rest, hover (`--gd-hover-bg`, it sits on the white panel and not on the grey rail), current (`--gd-selected-bg`), disabled, focus-visible.

**Tokens.** `--gd-text-muted`, `--gd-text`, `--gd-hover-bg`, `--gd-selected-bg`, `--gd-border`, `--gd-nav-disabled`. Rows are `--gd-control-h - 4` tall.

**Provenance.** NEW: not in the hub, reference Mobbin Clerk, Squarespace; tree reference Mobbin Square Reports. Pending library review.

## Theme menu

**Purpose.** Choose System, Light or Dark (R37). Use it in the panel bar and in the phone topbar. With no choice made the site follows the machine, live; picking Light or Dark sticks until System is picked again.

**Anatomy.** A trigger and a menu of three radio items.
```html
<div class="gd-theme" data-gd-pop>
  <button class="gd-theme__trigger" data-gd-pop-trigger data-pref="system" aria-haspopup="menu" aria-expanded="false" aria-label="Colour theme: System">
    <span data-gd-ico="system">…</span><span data-gd-ico="light">…</span><span data-gd-ico="dark">…</span></button>
  <div class="gd-menu gd-menu--end gd-theme__menu" role="menu" data-gd-pop-menu hidden>
    <button class="gd-menu__item" role="menuitemradio" aria-checked="true" data-gd-theme="system">…System</button> …
  </div>
</div>
```
The trigger shows the glyph of the active choice (monitor, sun, moon) from `data-pref`; it is bare, 24px, with no fill until hover or open. `gd-theme--up` opens the menu upward.

**Behaviour.** Choosing writes `gw-theme-choice` (`light`, `dark` or `system`, written only when a person picks) and `gw-theme` (the resolved value). System removes `data-theme` from `<html>` so `color-scheme` follows the OS live; Light and Dark set it. `gd:theme-change {pref, resolved}` fires. Put the inline first-paint script from the hub in the page head so System does not flash light. Keyboard as the workspace switcher.

**Tokens.** `--gd-icon`, `--gd-text`, `--gd-nav-hover`; the menu is the shared `.gd-menu`.

**Provenance.** extracted: `web/shell.css:451-514`, `web/shell.js:204-232, 1408-1462`.

## Search trigger

**Purpose.** The field that opens the command palette, with its shortcut shown. Use it in the panel bar, at the top of the rail, or as an icon on a phone or in the collapsed rail. It is a button that looks like a field, not a text input; typing happens in the palette.

**Anatomy.**
```html
<button class="gd-search" type="button" data-gd-search-open aria-haspopup="dialog" aria-keyshortcuts="Control+K Meta+K">
  <svg class="gd-search__icon">…</svg><span class="gd-search__label">Search or jump to…</span><kbd class="gd-search__key" aria-hidden="true" data-gd-keys></kbd></button>
```
`gd-search--icon` is the square icon-only form with an `aria-label`. The key chip is filled by script: the command symbol and K on a Mac, Ctrl and K elsewhere.

**Behaviour.** A click, or Cmd or Ctrl and K anywhere, fires a cancelable `gd:search-open`; the palette listens and opens. The component does not draw a palette; a screen that ships the trigger must ship something that handles the event, otherwise the affordance is dead (R19).

**States.** Rest (light: `--gd-search-bg`, no edge, as measured in the hub; dark: black with a `--gd-search-edge` hairline), hover (`--gd-search-hover`), open (`aria-expanded`), disabled, focus-visible.

**Tokens.** `--gd-search-bg`, `--gd-search-hover`, `--gd-search-edge`, `--gd-kbd-bg` (all NEW, light-dark), `--gd-placeholder`, `--gd-text-muted`. Height is `--gd-control-h`.

**Provenance.** extracted: `web/shell.css:407-449, 1640-1656`.
