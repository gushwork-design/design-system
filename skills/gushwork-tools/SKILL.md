---
name: gushwork-tools
description: Builds and changes Gushwork's internal tools — the small single-purpose apps hosted on the design hub under /internal, like the email signature creator and the employee ID card generator. Use this whenever the request is a new hub tool, a change to an existing one (a new field, a new output, a new control), a tool's card on the Tools page, or making a tool match the hub: "build a tool that makes…", "add an option to the ID card tool", "a generator for…", "redo this tool's panel". Not for a marketing page or ad lander (use gushwork-web), a logged-in product dashboard (use gushwork-dashboard), a deck (gushwork-slides) or a downloadable PDF (gushwork-lead-magnet).
---

# Gushwork tools

You are building or changing **a hub tool**: a small app that lives at `/internal/<tool>` on
design.gushwork.ai and does one job for the team. Two exist, the **email signature creator** and the
**employee ID card generator**. They were redesigned together on 1–3 Oct 2026 into one shell, and
every decision from that work is written down so the next tool does not re-decide it.

Announce at the start: **"Using the Gushwork tools skill — v2.1.0, updated 9 Oct 2026."**

## First: is there a better skill?

| It is | Use |
|---|---|
| a landing page, ad lander, hero, pricing page, site navbar or footer | `gushwork-web` |
| a logged-in product screen, KPI card, data table (not a tool the team opens from the hub) | `gushwork-dashboard` |
| a report: a one-page read with data and charts | `gushwork-reports` |
| a deck, pitch, one slide | `gushwork-slides` |
| a downloadable PDF behind an ad | `gushwork-lead-magnet` |
| a hub tool, or a change to the email signature or ID card tool | this skill |

## Before you build: size it, then shape it

The shell was drawn for **small, single-purpose tools**: one panel of controls, one artefact, one or
two outputs. Before you write anything, and again whenever the request pulls against the shell
(a second page, accounts, saved work, a list, a dashboard-like view), **ask the owner, as options**.
Four questions fit one `AskUserQuestion` call; the second round follows the answers.

**Round 1: size and shape.** Infer what you can from the request and offer your reading as the first option.

| Ask | Options | What the answer decides |
|---|---|---|
| **Is this a mini tool for a light use case, or will it have heavy integrations and many use cases?** | `Mini tool` — one job, no sign-in, nothing saved · `Light, with one integration` — one external service or one saved list · `Heavy` — several integrations, accounts, many use cases | `Mini tool`: build it here, on the shell. `Light, with one integration`: still a hub tool, but name the integration and who can reach it before building. `Heavy`: stop. The shell may not hold it, and it may belong on `gushwork-dashboard` or its own app. Say so in one line and let the owner decide |
| **What is the one job: what goes in, and what comes out?** | in: `Typed fields` · `An upload (image, file)` · `A pasted list or CSV` · `A link or an account` — out: `A preview only` · `Something to copy` · `A file to download` · `Something sent elsewhere` | the panel's controls, the artefact on the canvas, and which actions the pill carries |
| **Does it keep anything?** | `Nothing, it resets` · `Remembers on this device` · `Saves a list others can see` | whether it needs storage and sign-in at all, and whether it is still a mini tool |
| **Who is it for?** | `Anyone on the team` · `One team or a few people` · `The owner only` | the access rule, and whether its card says it is restricted |

**Round 2: functionality, once the shape is known.** Ask only what the answers left open:

- **Options and modes.** Which fields are essential, which are optional, and are there presets or
  templates to pick from? Does it ever need a second output or mode (then tabs from the start, not later)?
- **Defaults and examples.** What does it show before anyone types (sample content, never an empty
  canvas), and what is the default for each control?
- **The result.** What exactly is copied or downloaded (format, size, file name)? Does it need a
  light and a dark version, a mobile view, a print version?
- **Edge cases.** What if the upload is huge or the wrong type, a field is empty, or the job fails?
  The failure copy is yours to draft, the behaviour is theirs to choose.
- **Later.** Anything they already know will come (a second tool that shares a piece), so it is built once.

Skip a question the request already answers, and drop round 2 for a small change ("add a field").
Do not decide "heavy" or "mini" yourself, and do not guess a tool's functionality from its name.
A tool that quietly grows past the shell is the usual way a hub tool ends up rebuilt, so the questions
come first. State your read in two or three lines before building: the job, the panel's groups in order,
the outputs, who can reach it.

## Read these first, in this order

1. `web/internal/tool-shell.css` — the whole shell. **Its comments carry the numbers and the reasons**
   (every value is a token; anything chosen rather than measured is marked `CHOSEN`). Do not restate
   a value from memory.
2. `web/internal/tool-chrome.js` — Appearance (System, Light, Dark) and Help, top-right.
3. `decisions.md` in this folder — each decision, who made it, and why.
4. One existing tool end to end: `web/internal/employee-id-card/` (index.html, app.jsx, styles.css).
5. `foundation/tokens.css`, `foundation/voice.md`, `DECISIONS.md` (R41 on focus, R16 on the dark toggle).
6. `foundation/motion.md` (R64). A tool page loads `tool-shell.css`, **not** `shell.css`, so it does not
   get the hub's entrance and press rules for free: add the ones it needs from that file, keep to
   `opacity` and `transform`, 8px and 320ms, inside `prefers-reduced-motion: no-preference`. A tool
   that already slides its panels keeps that.

Do not copy one tool into another. A new tool starts from the shell and a blank `app.jsx`, the same
rule the web templates follow.

## What every tool is

- **A floating, collapsible panel on the left** (360 wide, 12 in from every edge, radius 20, black
  in dark like the hub's panel) that holds every control. A header with the **Gushwork logo tile**,
  the tool's name and a collapse icon. Collapsed, it folds to that same header (`.panel-mini`: logo tile, name, reopen), never to a bare icon. Below 900px it overlays
  the preview.
- **The header mark is always the Gushwork logo (R44).** Copy the SVG from the ID card's `.brand-card`:
  the symbol on Brand Blue (`--gw-color-primary-500`, via `.brand-icon__bg`) at 32px, radius 8. A click on it does nothing; a right click opens the
  logo menu from `tool-chrome.js` (Design Hub, every tool with the current one checked and the ones
  this person cannot open locked, All tools). Blue since 5 Oct 2026 (it was Flat Black with a ring in dark). Never a per-tool icon, a generic icon in a coloured tile, or the coloured symbol, and
  the same in any drawing, mock or card that shows a tool's panel.
- **A full-bleed canvas** with the thing being made on it, centred in the space to the right of the
  panel. No white container box around the artefact.
- **One floating pill at the bottom** for the actions: views on the left, Download (outlined) and
  the primary action (black, "Copy HTML") at the end. One rounded container, every control the
  same height, a hairline between groups.
- **The hub's own Appearance and Help** top-right, from `tool-chrome.js`. The tool has no theme
  control of its own, and the theme follows the hub (`gw-theme-choice`, `gw-theme`).
- **React 18 and Babel in the browser**, loaded from a CDN, so the page is blank for a couple of
  seconds. The shell paints a **ghost** of the finished tool while `#root` is empty (see below).
- **Replace a live tool in place.** Keep its URL; do not ship a v2 beside it.

## The control family

Use these, and do not draw a new one. Sizes are in `tool-shell.css`. **Where the tools family has
no piece, take the dashboard library's** (`exports/dashboard`: search field, select, menu, data table,
empty state, modal, confirm dialog, segmented control, tag): its own `gd-` classes inside a `.gd`
scope (`display: contents` as a wrapper), with `dashboard.css` linked after `tokens.css`. Do not
redraw a dashboard component in tool classes (Utsav, 5 Oct 2026). Place its menus in a fixed layer
under the trigger, as `dashboard.js` does, so a card or table never clips them.

| For | Use |
|---|---|
| a yes / no | the **switch**: `<button role="switch" class="gw-switch">`, X-Small 36 x 20, **On = Neutral/900, never blue**; in dark the track inverts to white (R16). Never a two-tab Yes / No |
| choosing between views (Desktop / Mobile) | `tab-group`: 36 high, radius 12, black active (white in dark) |
| a dropdown | **opens on click**, never on hover; the open and hover borders step up one neutral strength; the selected row carries a plain white check |
| a text field | the hub's `.ac-field` look: field fill, hairline, radius 10, 36 high (the hub's forms are 40: 36 was chosen for density) |
| a number | no browser spin arrows; the slider beside it is the stepper, and the arrow keys still step |
| a button | outlined for Download, black for the primary (Copy). Never a blue primary in a tool |
| an image slot | the dropzone; thumbnails show the **whole** image (`contain`), letterboxed |

## What is fixed

1. **Tokens only.** Colour, radius, spacing (4, 8, 12, 16), type and shadow all come from
   `foundation/tokens.css`. A hex with a token is a bug. The chrome is Inter, with Vert Grotesk
   Display for the panel title and section titles.
2. **Concentric corners.** Outer radius = inner radius + the padding between them (12 around 8 with
   4 of padding). Check it whenever a container holds rounded items.
3. **No blue for state.** Open, hover and selected are neutral. Blue is a signal, not a control state.
4. **No focus rings in the tools.** Ruled 2 Oct 2026; it supersedes the dashboard's ring for these
   tools only. Open states (a dropdown's border) are not focus and stay. (The rest of the hub uses
   the keyboard-only ring of R41.)
5. **The artefact is not the chrome.** The shell styles the editor; the signature and the card keep
   their own inline styles on purpose. Never let a shell rule reach into what is being made.
6. **Both themes, always declared.** An alias defined in only one theme silently keeps the other's
   value. Write the light and the dark block together.
7. **Sentence case, no exclamation marks, no emoji.** Labels are short: "Remove BG", not "Polish".

## The artefacts

- **The ID card is printed, so it uses the print palette**, not the screen palette: Brandeis Blue
  `#0072CE` (Pantone 285 C), Full White, Flat Black `#0D0D0D`, and tints derived from Flat Black.
  Take them from the Style Guide's "for prints" section, not from a screenshot.
- **A photo resets its framing when a new one is uploaded** (position, zoom), and shows whole in its
  slot. A tight crop that looks "zoomed in" is a bug, not a style.
- **A dark tile that matches the dark panel needs a ring.** The logo tile gets a 1px Neutral/800 ring
  in dark; the signature banner gets a ring in the preview only, never in the copied HTML.
- **Work that takes time says so beside the control**: a spinner and a percentage to the right of
  the switch, then Done or "Failed. Try again". The switch never moves between states, so give the
  status the space after it. Never beneath the control, and never an unlabelled wait.

## Loading

While `#root:empty` the shell draws the ghost: the panel with its rows, the preview, the bar, at the
real geometry, pulsing (no shimmer), off under reduced motion, and removed after 20 seconds if
nothing mounts rather than pulsing forever. Do not draw a spinner instead.

## Putting a tool on the hub

1. **A new tool goes live at `/internal/staging/<name>` first** and stays there until the owner says
   it is live. Move it to `/internal/<name>` only on that ask.
2. The page head carries the no-flash theme script (it reads `gw-theme-choice`), loads the shell
   after the tool's own `styles.css`, then `tool-chrome.js`.
3. **Four places must agree**: the card on `web/internal/tools.html` (`data-tool`), the `TOOLS` list
   in `web/api/_tools.js`, the `TOOLS` array in `web/admin/access-control.html`, and the tool's
   own rule. A tool missing from `_tools.js` keeps no live access badge.
4. **The card image** is 1200 x 750, drawn from the real tool in the light theme, versioned with
   `?v=` wherever it is referenced (the edge serves stale files for hours otherwise).
5. **Access.** Some tools are limited to a team or to named people; the card then reads Restricted
   to anyone who cannot open it. Set it in Access Control, not in the tool.
6. Update the Tools page description only if the kind of tool changes; it is written not to list tools.

## Verify with numbers, not by eye

Eyeballing has approved off-scale values here before. Before you hand it over:

- Read every visible chrome element with `getComputedStyle`, in light and dark, and check colour
  against the palette, radius against the scale, type against the ramp, gaps against 4/8/12/16 and
  shadows against the tokens. The email tool's audit read about 170 elements and found 7 colours,
  3 type sizes, 3 gaps and 1 shadow off the system; the target is zero in the chrome.
- Take screenshots at 1440 x 900 in light and dark: panel open and collapsed, a dropdown open, the
  action bar, and the ghost (hold the CDN back to see it).
- Narrow case below 900px, and the printed output for anything printed.
- After a publish, verify the **deployed files**, not the edge: the live site can serve an old file
  for hours.

## Mistakes already made, so do not repeat them

- A `background:` shorthand on an image slot wiped the photo thumbnail; use `background-color`.
- An inline `padding` in the JSX beat the shell's offset and pushed a card off centre. No inline
  layout in the tools' JSX.
- A control built from a stale local copy of the hub's menu was missing System; copy from the live
  `shell.js`, and keep `tool-chrome.js` in step with it (it is a copy and can drift).
- A hover-open dropdown, a 44 x 24 switch and a two-tab Yes / No all drifted from the library;
  the library's own control is the answer, even when a custom one looks fine.
- Earlier button rules outranked the pill rules (the primary lost its black, the menu items squashed
  to 32 high). Check specificity after any change to the bar.
- A third typeface sits in the signature preview (Plus Jakarta Sans). It is in the artefact, not the
  chrome, and is an open call for the owner; do not copy it into a new tool.

## New pieces go to the design hub for review

R43: anything this skill builds that the library does not have is registered for review, not shipped
quietly. The tool shell's own four pieces already are: **`tool-panel`**, **`tool-action-pill`**,
**`tool-chrome`** and **`tool-progress`**, under the **Tools** surface (`exports/tools/`, drawings in
`web/previews/tools/`, Library category *Tools*). When a new tool needs a piece that is not one of
those or the library's own controls (a second kind of panel, a table, a new overlay), follow
`foundation/new-component-notice.md` section 0a: registry entry as pending, a drawing, a line in
`exports/tools/components.md`, then `bash scripts/library-site.sh`. The owner approves it in Design
System → Review. Do not register a control the library already has.

## Ask before choosing

The shell leaves a few calls open. Put them to the owner **as a question with options**, one
call, and do not decide for them: field height 36 or 40, primary button black or blue, where a new
control family is not in the library (the floating panel, its collapse icon and `tool-chrome.js`
are already flagged as new). Anything you chose rather than measured goes in the hand-over.

## Before you hand it over

Say in a few lines what you checked and what you chose:

- Tokens only, in both themes, the chrome measured against them.
- The panel header wears the real Gushwork logo tile, linked back to Tools (R44).
- The controls are the family above; nothing new drawn.
- The ghost shows, the panel collapses, the narrow case works.
- The card, `_tools.js`, Access Control and the staging path all agree.
- Anything off-system that was asked for is named in one line.
- Anything new is registered under Tools and visible in Design System → Review (R43).
- The size and shape questions were asked (mini, light with one integration, or heavy; the job, its
  input and output, what it keeps, who it is for), and the answers are written in the hand-over.
