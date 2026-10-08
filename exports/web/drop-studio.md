# Drop Studio elements

**Status: pending review.** Two new elements, `drop-agent-card` and `drop-stepper`, for Drop Studio at `web/internal/staging/drop-studio/`. The create / review dialog is built from library pieces, and the rest is built from library pieces, listed below.
The page was drawn first as wireframes (Version C chosen by Utsav on 8 Oct 2026, placements taken from Blush,
Unsplash and unDraw). Nothing here is measured from a Figma file; sizes are tokens and the builder's choice. Until
`drop-agent-card` or `drop-stepper` passes in Design System → Review, any page that uses it must say it is unreviewed.

The page has no template. It is open to everyone in the organisation while it is staged (an `internal` rule, from 9 Oct 2026). Anyone signed in can browse, download, make a picture request and answer ChatGPT's question; accepting, changing or discarding a picture is the owner's alone, checked by the API.

## What the page reuses (and so does not register)

An audit on 8 Oct 2026 found that most of the first build duplicated pieces the library already has. These were
replaced, and two elements first registered for this page (`drop-bundle-rail`, `drop-quick-view`) were withdrawn.

| Part of the page | Library piece it uses |
|---|---|
| Search at the top | dashboard `search-field` (`gd-input--search`, with its own clear button). The `⌘K` hint is the `search-trigger`'s key cap (`gd-search__key`); it reads `Ctrl K` off a Mac, hides while the field is focused or has text, and is hidden on touch. The page sets `data-gd-palette-off`, so the library's own `⌘K` command palette does not open over the page's search. |
| Create new agent, Download picture, Copy link, Request new picture | dashboard `action-button` (`gd-btn`, primary and outline) |
| Copy link and Download on a card, the close button | dashboard `icon-button` (`gd-iconbtn--outline`, `data-tip`) |
| Status filter, and the bundle strip on a phone | dashboard `tabs-pill`, with counts |
| Status chips on a card | shared `badge` (`--good`, `--solid`, `--warn`) |
| Messages (download, next-phase notes, a failed copy) | dashboard `toast` (`GD.toast`), which sits above an open dialog |
| Appearance (System, Light, Dark) | dashboard `theme-menu` |
| Help | the hub's own Help: the question-mark button with a two-row menu, `Send an email` (design@gushwork.ai) and `Message on Slack`, as `shell.js` and `tool-chrome.js` draw it, built here from the library's `gd-pop` and `menu` |
| Bundle rail on desktop | follows `agent-filter-rail`'s category rows: a 240px sticky column, 36px rows in `--gw-text-body-14-med`, the count in `--gw-color-neutral-500`, the selected row white with a 1px stroke and `--gw-shadow-s2`, the others bare on the ground. Here the rows filter in place instead of scrolling to a section. |
| Create new agent, New picture for an agent, ChatGPT has a question, Review the new picture | dashboard `modal` (`gd-modal--lg`) with `form-field`, `text-input`, `textarea`, `select` and `segmented-control` for the brief, and `activity-timeline` for the ChatGPT progress, and `drop-stepper` for the three-step header. The small grey lines ("Saved as a request in drop-reference…") are 10px `--gw-text-body-10-reg` in `--gw-color-neutral-500`, the same reference text the wireframes use. |
| Quick view | follows `agent-listing-panel`'s shell: a centered modal 820px at most, previous and next as 44px round buttons outside the edges (`--gw-shadow-s3`), a bottom sheet on a phone, a header with the bundle badge, the position (`2 of 33`) and close. It holds a large picture with Download and Copy link instead of the package controls. |

The quick view's previous and next arrows are the marketplace's own: 44px round, 60px outside the modal's edges, the bold arrow glyphs, moving into the header below 1000px. The Premium tag (card and quick view) is the marketplace's `pill-prem` (24px, `--gw-color-primary-25` fill, a half-pixel `--gw-color-primary-100` edge, `--gw-text-body-12-med` in `--gw-color-primary-500`), shown on the three agents in its Generate more leads bundle. It is the same pill in light and dark; the marketplace does not draw a dark variant.

The rail and the quick view are page-local CSS, the same as their Agent Store originals. If the library later pulls
either into a shared piece, this page should move to it.

## `drop-agent-card`

A picture-first card for a character gallery. Width follows the grid column. White, 1px `--gw-color-neutral-100`,
`--gw-radius-16`, padding `--gw-space-8`, gap `--gw-space-12`. The picture is a square, `--gw-radius-8`, `object-fit:
cover`, so outer 16 = inner 8 + padding 8. Below it: the name (`--gw-text-body-16-sem`, one line, ellipsis) with an
optional status `badge` on the right, then a one-line description of what the agent does in `--gw-text-body-12-reg`
(sentence case, no full stop, one line with an ellipsis; the bundle lives in the rail and the quick view).

States: rest; a status `badge` for work in flight (**Requested**, **To review**, **Needs answer**; an approved agent from /agents shows none); a picture not drawn yet is a dashed square with a clock and `Waiting for ChatGPT` (or `ChatGPT has a question`); hover or keyboard focus-within (two `icon-button`s appear at the picture's top right, **Copy link** and
**Download picture**, on a raised surface with `--gw-shadow-s2`; on touch screens they are always visible). Copy link
confirms on the button itself: the glyph becomes a check and the tooltip reads `Link copied` for two seconds. A
selected card, if one is needed, is a black ring, never blue. The whole card opens the quick view.

Not the same as `agent-card` (the Agent Store listing): that one is a 60px tile with a blurb and an add button; this one
exists to show the picture and let someone take it. Whether the two should become one card with a picture-first variant
is a decision for review.

## Tokens and deviations

Colour, type, radius, shadow and spacing are `--gw-*` tokens, and the page's own surfaces are `light-dark()` aliases so
they follow the library's theme handling. The library's tab pills use its ink selected state, so the status filter and
the phone strip are black when selected. Not on a token: the 240px rail, the 820px quick view and the 560px search
column, which are layout choices with no documented figure.

## Phase 2: how the page talks to drop-reference

`/api/drop-studio` (`web/api/_drop-studio.js`) is the only thing that holds the GitHub token. The browser never sees it,
and the private pictures are streamed through `?op=image`, limited to `masters/agent-portrait-*.png` and
`explorations/agents/<id>-v<N>.png`. It is gated by the page's own Access Control rule, so adding marketing there
carries over. Anyone the gate lets in can make a request and answer ChatGPT's question; accepting, asking for changes
and discarding are the owner's, because accepting writes into `masters/`. With no `DROP_REFERENCE_TOKEN` the page works
exactly as in phase 1 and the create and request controls say it is not connected.

The library's `select` does not open inside `gd-modal`: the modal's `scale` makes it the containing block of the
select's fixed menu, which is then clipped and scrolls the dialog shut. The page overrides `scale` and `overflow` on its
own dialog. This is worth fixing in the library.

The Bundle select lists the page's bundles, `Not sure yet`, and below a separator `Add a new bundle`, which reveals a text field for the name. A name that matches an existing bundle (any case) uses that bundle. A created agent's bundle that the page did not have is added to the rail and the phone strip after the next refresh.

## `drop-stepper`

A row of three steps for a short flow (here Brief, ChatGPT, Review), under a modal's title. Each step is a 20px round mark and a label in `--gw-text-body-12-med`, joined by a 32px hairline (16px on a phone). The marks are the setup checklist's: **done** is a filled ink circle with a check, **now** is an ink ring with the step's number and an ink label, **next** is a grey ring (`--gw-color-neutral-200`, `--gw-color-neutral-700` in dark) with the number and a muted label. The hairline is ink up to the current step and grey after it. The current step carries `aria-current="step"`; the list is labelled `Steps`. It shows where you are, not a control: steps are not clickable.

The library has no stepper, only the checklist's vertical list and `activity-timeline`. The spacing, marks and states are the checklist's; if the library adds a stepper this should move to it.

## Dark mode

In dark the page's surfaces were one grey: card, modal, field and edge within a few points of each other. Page edges are now `--gw-color-neutral-800`, the secondary text `--gw-color-neutral-300`, and the dialog's fields are wells (`--gw-color-black`) on the raised modal with a `--gw-color-neutral-700` edge. Light mode is unchanged.

## Notifications

When a request is sent, the progress view offers **Notify me when it's ready**. The browser asks once for permission, then
Studio keeps that device against the person's email. When ChatGPT finishes a picture, or asks a question, that person gets
a push on each of their devices: "Your picture is ready" or "ChatGPT has a question", with the agent's name; tapping it opens
the agent in Studio. Nothing about GitHub appears in it. The control is a library `action-button` in the dialog footer;
once on, the footer says so in the 10px reference text, and where notifications are blocked or the device needs the page on
its Home Screen (iPhone) it says that instead. No new element.

How it works: GitHub calls `/api/drop-studio?op=hook` when an issue changes; the hub re-reads the issue itself (it never
trusts the call), finds who requested it from the issue's `Requested by` line, and sends through the standard Web Push
service with the hub's own keys. A repeat of the same event sends nothing. Keys and the store: `VAPID_PUBLIC_KEY`,
`VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `DROP_WEBHOOK_KEY`, and the hub's Upstash store. The service worker is
`drop-studio/sw.js`, scoped to the Studio folder only.

Not verified in a real browser on a real device at the time of writing: the browser pane used for testing cannot register
service workers. On iPhone, web push only works once the page is on the Home Screen.

