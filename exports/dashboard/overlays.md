# Overlays

Everything that sits above the page: tooltips, popovers, modals, the destructive confirm, the drawer, the docked panel, coachmarks and the command palette. Dialogs are native `<dialog>` elements (`showModal()` gives the focus trap, Esc, inert background and a `::backdrop` scrim for free). Layering follows the owner's brief: scrim 80, drawer and modal 90, popover 60, toast 100. Native dialogs live in the browser top layer, where z-index is ignored and the last opened is on top; the toast host, tooltip and coachmark are manual popovers that `60-feedback.js` re-promotes so they stay above an open dialog. Dialogs opened by other code through plain `showModal()` are not re-promoted over toasts; open them with `GD.feedback.open(el)` or `data-gd-modal-open`. Behaviour lives in `js/60-feedback.js`.

## Choosing an overlay

| | Tooltip | Popover | Modal | Drawer | Docked panel |
|---|---|---|---|---|---|
| Blocks the page | No | No | Yes (scrim, inert) | Yes (scrim, inert) | No |
| Dismiss | Leave, blur, Esc | Esc, outside click, focus out | Esc, scrim, buttons | Esc, scrim, close | Collapse only, Esc does nothing |
| Holds | A label or definition | Small content, a few controls | One short task or decision | A record to inspect or review, long | Settings or properties used while looking at the page |
| Width | Content, max 280 | Content, max 360 | 400 / 480 / 640 | 560, wide up to 1280 | 280 to 640, resizable |
| Focus | Stays on trigger | Stays on trigger | Moves in, returns | Moves in, returns | Never moves |

Rules of thumb. If the user must answer before anything else, Modal (Confirm dialog if it destroys). If the user is inspecting a record and the list behind it matters, Drawer. If they are changing settings and watching the page react, Docked panel. If it is a few controls hanging off one button, Popover. If it is only words, Tooltip. A tooltip never holds an action, and any overlay that holds an action must be reachable by keyboard.

## Tooltip

**Purpose.** A short label or definition for a control or figure. Use it for icon-only buttons and metric definitions. Not for essential information (it is hidden on touch and until hover or focus), not for actions.

**Anatomy.** One shared `.gd-tooltip` element (`role="tooltip"`) is created by JS and positioned next to the trigger. Short form is text only. **Rich form** adds `__title`, `__body` and `__meta` (a formula or a source) for a metric definition.

```html
<button class="gd-iconbtn" aria-label="Refresh" data-gd-tooltip="Refresh">…</button>
<span data-gd-tooltip-title="Qualified rate" data-gd-tooltip-body="Share of new leads a rep accepted within 7 days." data-gd-tooltip-meta="accepted / new leads" tabindex="0">Qualified rate</span>
```

**Variants.** Short (max 240, 12 medium) and rich (max 280). Placement `data-gd-tooltip-placement="top|bottom|left|right"`; it flips when there is no room. The bubble is Neutral/900 with a white label in light and white with a Neutral/900 label in dark (`--gd-tip-bg`, `--gd-tip-fg`), a 10 by 6 arrow centred on the trigger.

**Behaviour.** Shows after 300ms of hover (immediately when moving between triggers) and at once on keyboard focus (`:focus-visible` only). Hides on leave, blur, Esc, scroll and pointer down. It is hoverable, so rich content can be read (WCAG 1.4.13). Ignored on touch. Disabled buttons fire no events: put the tooltip on a wrapper.

**Accessibility.** The trigger gets `aria-describedby`. Icon-only controls still need an `aria-label`; the tooltip is an addition, not the name. Charts use their own tooltip in `charts.md`; `info-hint` in `actions.md` draws the hub's `data-tip` pseudo-element bubble and should move onto this component.

**Tokens.** `--gd-tip-bg/-fg/-fg-muted`, `--gw-radius-8`, `--gw-text-body-12-*`. z-index 60.

**Provenance.** Extracted from `web/shell.css:1881-1899` (`.gw-iconbtn[data-tip]`). Surface changed to Neutral/900 by the owner; now a real element so it works on any control and inside clipped parents (table cells). Rich variant NEW, pending library review.

## Popover

**Purpose.** Non-menu content hung off a trigger: a few column toggles, a how-it-works note, a small form. Not a menu (use `.gd-menu` in `actions.md`), and not for anything long (use a drawer).

**Anatomy.** `.gd-popover-wrap` (position anchor) holding the trigger `[data-gd-popover="#id"]` and a `.gd-popover[hidden]` with `__title`, content and optional `__foot`.

**Variants.** `data-placement="bottom-start|bottom-end|top-start|top-end"`; flips to the top or the other edge when it would leave the viewport.

**States.** Closed (`hidden`), open (`aria-expanded="true"` on the trigger).

**Behaviour.** Opens on click or Enter/Space, closes on Esc (focus returns to the trigger), outside click, or focus leaving. Only one is open at a time. Focus stays on the trigger; content follows it in tab order.

**Tokens.** `--gd-raised-bg`, `--gd-border`, `--gw-radius-12`, `--gw-shadow-s3`, `--gd-gap`. z-index 60.

**Provenance.** Extracted from `web/shell.css:1910-1940` (`.gw-pop__menu`), made content-neutral.

## Modal

**Purpose.** One short task or decision that needs the user's full attention: rename, share, create. Not for browsing a record (drawer), not for destruction (confirm dialog), not for long forms (a page).

**Anatomy.** `<dialog class="gd-modal gd-modal--{sm|lg}">` with `__head` (`__title`, `__desc`, close), `__body` (scrolls), `__foot` (right-aligned actions, secondary first, primary last).

```html
<dialog class="gd-modal" aria-labelledby="t">
  <div class="gd-modal__head"><h2 class="gd-modal__title" id="t">Rename dashboard</h2><button class="gd-fb-close" data-gd-close aria-label="Close">…</button></div>
  <div class="gd-modal__body">…</div>
  <div class="gd-modal__foot"><button class="gd-btn gd-btn--outline" data-gd-close>Cancel</button><button class="gd-btn gd-btn--primary">Save</button></div>
</dialog>
```

**Variants.** sm 400, md 480 (default), lg 640; never wider than the viewport minus 32. Max height 640 and the body scrolls.

**States.** Closed, opening (fade and a small scale over `--gw-motion-fast`), open. Add `data-gd-static` to ignore a click on the scrim when there is unsaved input.

**Behaviour.** Open with `data-gd-modal-open="#id"` or `GD.feedback.open(dialog)`. Focus moves in (first control or `[autofocus]`), is trapped natively, and returns to the opener on close. Esc and the scrim close it. The page behind does not scroll.

**Accessibility.** `aria-labelledby` on the dialog. A dialog with a destructive action uses `role="alertdialog"` (see Confirm dialog).

**Tokens.** `--gd-raised-bg`, `--gd-border`, `--gw-radius-16`, `--gw-shadow-s3`, `--gd-scrim`, `--gd-card-pad`.

**Provenance.** Extracted from `web/admin/analytics.html:311-320` (`.ul-dlg`); sizes from the old measured modal (480 wide).

## Confirm dialog

**Purpose.** Confirms a destructive or irreversible action. The weight of the decision sits here, not on the trigger: the trigger button is the neutral outlined shape with a red label (never a red fill).

**Anatomy.** A `gd-modal gd-modal--sm gd-confirm` (`role="alertdialog"`): a title that is a question naming the action ("Delete 3 leads?"), a sentence on the consequence, and, when several things go, `.gd-confirm__lost` listing exactly what is lost. Footer: Cancel (outline) then the confirm button (`.gd-btn--danger`: red label and red edge on the neutral shape) labelled with the verb and the object ("Delete 3 leads", never "OK" or "Yes").

**Behaviour.** Default focus is Cancel (`autofocus`), so Enter does not destroy. `GD.confirm({title, message, items, confirmLabel, danger}) -> Promise<boolean>` builds, opens and removes it. Declaratively: `<button data-gd-confirm="Delete 3 leads?" data-gd-confirm-body="…" data-gd-confirm-label="Delete 3 leads">` intercepts the click and re-fires it on confirm. A non-destructive confirm passes `danger: false` (primary button). Esc and the scrim cancel.

**Copy.** Name exactly what will be lost and whether it can be undone. Reversible actions do not get a dialog: do them and offer Undo in a toast.

**Provenance.** NEW: not in the hub, reference Mobbin Linear and GitHub delete confirmations, pending library review.

## Drawer

**Purpose.** A record the user inspects or reviews from a list, with the list kept behind it: a review queue, a lead, a log entry. Not for a quick decision (modal) and not for settings that should react live (docked panel).

**Anatomy.** `<dialog class="gd-drawer">` pinned right: `__head` (`__sub` eyebrow, `__title` at 22px display, `__tools` with the expand toggle and close), `__body` (scrolls), `__foot` (hint left, actions right).

**Variants.** Default 560 wide; `data-size="wide"` up to 1280 (viewport minus 48), toggled by `[data-gd-drawer-wide]` (`aria-pressed` kept in sync). In wide, `__body--split` becomes content plus a 300px sticky `__aside` for details; under 900px it stacks.

**States.** Closed (offscreen), opening (slides in over `--gw-motion-fast`), open. The hub's hard-coded `.22s` width transition is replaced by `--gw-motion-fast`; reduced motion switches both off.

**Behaviour.** Same as the modal: opened by `data-gd-modal-open`, scrim and Esc close, focus is trapped and returns to the row that opened it. Advancing to the next item should update the drawer content, not close and reopen it.

**Tokens.** `--gd-raised-bg`, `--gd-border`, `--gd-card-pad`, `--gd-scrim`.

**Provenance.** Extracted from `web/internal/design-system.html:664-772` (`.rv`, `.rv-scrim`, `.rv-h`, `.rv-body`, `.rv-foot`).

## Docked panel

**Purpose.** A non-modal inspector beside the page for settings or properties used while looking at the result: chart settings, event properties, query options. The page stays interactive.

**Anatomy.** `<aside class="gd-dock" data-gd-dock="id">` as a flex child of the page layout: `__resize` (a `role="separator"` grip on the inner edge), `__head` (title and collapse button), `__body` of `__sec` sections (`__sechead` button + `__secbody`), `__foot` with Reset and Apply. `data-side="left"` mirrors it.

**States.** Open; section collapsed or expanded (`aria-expanded`, handled by `data-gd-toggle`); collapsed to a rail (`data-collapsed="true"`, the icon button stays); dragging; Apply and Reset disabled until the body changes (`data-dirty`). No scrim and Esc does nothing.

**Behaviour.** Width is the CSS custom property `--gd-dock-w` on the panel (min 280, max 640 or 60% of the viewport; override with `data-gd-min` and `data-gd-max`). It is set by dragging the grip or by Arrow Left/Right (16px, Shift 48; Home and End for the limits), and persists per `data-gd-dock` id in localStorage, as does the collapsed state. Apply fires `gd:dock-apply`; Reset resets a wrapped `<form>` and fires `gd:dock-reset`. Under 768px the panel stacks full width.

**Accessibility.** `aria-label` on the aside; the separator carries `aria-valuenow/min/max`. Focus never moves on its own.

**Tokens.** `--gd-panel-bg`, `--gd-border`, `--gd-head-h`, `--gd-control-h`, `--gd-card-pad`.

**Provenance.** NEW: not in the hub, reference Mobbin Mixpanel, Causal, LangChain, Sentry, pending library review. The section toggle uses the shared `data-gd-toggle` hook (`50-data.js`).

## Coachmark

**Purpose.** A one-time guided tour: a few steps that point at real controls, shown once. Not a replacement for empty states or help text, and never shown again after Done or Skip.

**Anatomy.** `.gd-coach` (a non-modal dialog), optional `__media` image slot (16:9), `__body` (`__title`, `__text`), `__foot` (`__count` "1 of 3", Skip, Next; the last step shows Done only) and a 10px arrow pointing at the target.

**Surface.** `--gd-raised-bg`, the same as every popover. A dark Neutral/900 surface in both themes was considered (reference Square) and rejected: no alias justifies it, and the raised surface already separates from the page by border and shadow in both themes.

**Behaviour.** Mark targets `data-gd-tour="id" data-gd-coach-step="1" data-gd-coach-title data-gd-coach-body data-gd-coach-image`, then `GD.feedback.tour('id')`; or pass a steps array. The target gets an accent outline; the card is placed on the side with room, and follows scroll and resize. Focus moves to Next. Esc skips. Completion is stored (`gd-tour:<id>`) so it does not return; `{force:true}` replays. Fires `gd:tour-end {id, completed}`.

**Accessibility.** `role="dialog"` with `aria-labelledby` and `aria-describedby`; the counter is a polite live region; focus returns to where it was when the tour ends.

**Provenance.** NEW: not in the hub, reference Mobbin Square, pending library review.

## Command palette

**Purpose.** Jump to a page, record or action from the keyboard. Cmd/Ctrl+K opens it; the search field in the top bar opens it too (`[data-gd-palette-open]`).

**Anatomy.** `<dialog class="gd-palette">`: `__top` (magnifier, `role="combobox"` input, a close button on phones), `__list` (`role="listbox"`) of `__group` labels and `__row` options (`__icon`, `__title` with a `<mark>` on the match, `__hint`), `__empty`, and `__foot` with keycaps (`.gd-kbd`) for select, open and close.

**States.** Empty query (all items grouped, capped), results (scored: a title that starts with the term beats one that contains it, which beats a hint match; every term must match), no matches, row hover and selected (a white lift on the grey card, in dark black on the dark card). With no rows the select and open hints dim.

**Behaviour.** `GD.feedback.palette.setItems([{group, title, hint, href, icon, run}])`. Arrow keys move, Enter activates (a link navigates, an item with `run` calls it), Esc closes, pointer move selects. `aria-activedescendant` follows the selection. Fires `gd:palette-select`. On phones the keycap legend is hidden and an explicit close button appears.

**Tokens.** `--gd-sunken-bg` card, `--gd-card-bg` search block and selected row, `--gd-link` for the match, `--gd-fb-kbd-bg`.

**Provenance.** Extracted from `web/shell.css:1094-1260` (`.gw-pal`) and `web/shell.js:1603-1770`; generalised from a site-search index to caller-supplied items.
