# Feedback and views

How the product tells the user what just happened, what is loading, what is missing and what could not be read: toasts, banners, the four empty variants, skeletons, the unavailable treatment, and the board view. Everything here is `gd-` prefixed, themed with `light-dark()` aliases from `00-base.css` and sized from the density tokens, so it works in comfortable and compact. Behaviour lives in `js/60-feedback.js` (`GD.feedback`, `GD.toast`). Overlays (modal, drawer, tooltip and the rest) are in `overlays.md`; page recipes and the page-state matrix are in `patterns.md`.

Aliases added in `60-feedback.css`: `--gd-fb-{info,success,warning,error}-{bg,line,icon}`, `--gd-skel`, `--gd-tip-bg`, `--gd-tip-fg`, `--gd-tip-fg-muted`, `--gd-fb-kbd-bg`.

## Toast

**Purpose.** A short confirmation or failure that does not block: "Export ready, 40 pages", "Could not save the report". Use it for the result of an action the user just took. Do not use it for page-level conditions (use a banner), for anything the user must read before continuing (use a dialog), or for validation (put it on the field).

**Anatomy.** `.gd-toasts` is the host (created by JS, bottom-centre, a manual popover so it stays above an open dialog). Each `.gd-toast.gd-toast--{success|info|warning|error}` holds `__icon`, `__msg`, optional `__action`, and a `.gd-fb-close`.

```html
<div class="gd-toast gd-toast--success" role="status">
  <span class="gd-toast__icon"><svg width="20" height="20">…</svg></span>
  <span class="gd-toast__msg">Export ready, 40 pages</span>
  <button class="gd-fb-close" aria-label="Dismiss notification">…</button>
</div>
```

**Variants.** Success, Info, Warning, Error. In light the surface is tinted per state; in dark all four collapse to one neutral surface and the **icon carries the state** (check, info, triangle, circle-alert). Warning and error use different glyphs on purpose: the hub's old rule reused one glyph and left colour as the only signal. **Undo variant:** `GD.toast('Row deleted', {type:'success', action:{label:'Undo', onClick}})` adds one underlined text action. It is for destructive-but-reversible actions only; it is not a general call-to-action slot (this supersedes the old "no action slot" note).

**States.** Entering (fade and rise over `--gw-motion-fast`), visible, paused (hover or focus inside), leaving. Close hover mixes the text colour in, so it separates from tinted and dark surfaces.

**Behaviour (R10).** 4 seconds, read from `--gw-toast-dismiss`. Errors never auto-dismiss and carry a reachable close. The timer pauses on pointer hover and on keyboard focus and resumes on leave. A new toast gives every auto-dismissing toast a fresh 4 seconds, so the first is never eaten by the second; an identical message replaces rather than stacks. Dismissing by hand clears the timer. At most 4 are shown (the oldest non-error goes first). Finding for the owner: 4 seconds is short for Undo; the token is unchanged, hover or focus pauses it.

**Copy.** The message column is 360 minus padding, icon, close and gaps: about 274px, roughly 32 characters at 16/24 medium. Write to it; it wraps rather than widens. With an Undo action keep the message under about 22 characters.

**Tokens.** `--gd-fb-*`, `--gd-text`, `--gw-radius-8`, `--gw-text-body-16-med`, `--gw-motion-fast`, `--gw-toast-dismiss`. z-index 100.

**Accessibility.** `role="status"` for success, info, warning; `role="alert"` for errors. The region is labelled "Notifications". Toasts with an action stay reachable by Tab and pause while focused.

**Provenance.** Extracted from `web/internal/design-system.html:765-766` (`.rv-toast`, a page-local black pill) and promoted; geometry from the measured Figma toast (360, r8, 8x16).

## Banner

**Purpose.** A dismissible callout above content for a condition that persists: connect an integration, a source is behind, a read-only notice. Use it for page or section scope. Not for the result of an action (toast), not for field errors (field help), not for a blocking decision (dialog).

**Anatomy.** `.gd-banner.gd-banner--{neutral|info|success|warning|error}` with `__icon`, `__body` (`__title`, text), optional `__actions` (small buttons), and `.gd-fb-close[data-gd-dismiss]`.

```html
<div class="gd-banner gd-banner--info" data-gd-banner-key="connect-gmail">
  <span class="gd-banner__icon">…</span>
  <div class="gd-banner__body"><span class="gd-banner__title">Connect your inbox</span><span>Link Gmail so replies show on each lead.</span></div>
  <div class="gd-banner__actions"><button class="gd-btn gd-btn--outline gd-btn--sm">Connect Gmail</button></div>
  <button class="gd-fb-close" data-gd-dismiss aria-label="Dismiss">…</button>
</div>
```

**Variants.** Neutral is the hub's `.ac-note`. Tinted kinds follow the toast rule (tinted in light, neutral with a coloured icon in dark). Omit the close button for a banner that must stay (a read-only or permissions notice). The actions sit under the text, in line with it, at every width.

**States.** Rest; close hover; hidden after dismiss. With `data-gd-banner-key` the dismissal persists in localStorage and the banner is hidden on load.

**Tokens.** Padding `--gd-gap` / `--gd-card-pad`, `--gw-radius-12`, `--gd-fb-*`.

**Accessibility.** `role="status"`; use `role="alert"` for error. The close has a label. A banner never moves focus.

**Provenance.** NEW: not in the hub, reference Mobbin Calendly "Connect Gmail", pending library review. Colour and shape from hub `.ac-note` (`access-control.html:313-323`) and `.rv-note` (`design-system.html:729-731`).

## Empty state

**Purpose.** What a region shows when it has nothing to show. Say what is missing and what to do, in that order. Never "No data" alone, never blame the user, and do not repeat the section name the header already carries.

**Anatomy.** `.gd-empty.gd-empty--{first-use|no-results|no-access|error}`: `__badge`, `__copy` (`__title`, `__text`), optional `__actions`.

**Variants.** First use (explain, one primary CTA); No results (a filter or search removed everything: offer Clear filters); No access (admin required: say who to ask, no action); Error or unavailable (a source could not be read: say which, offer Try again only if wired).

**The badge is a rounded square.** 40px, `--gw-radius-12`, never a circle. The hub's `.ul-empty__c` uses `--gw-radius-full` (a circle); that is wrong and is reconciled here. Lock badges follow the same rule.

**States.** Static. It is a page-state, so it fills the region it replaces and is `max-width: 480` with horizontal padding (R20: never a fixed 480). Padding is `2 x --gd-card-pad`, so compact tightens it. It cannot sit inside a stat card; for a card use the unavailable treatment.

**Tokens.** `--gd-selected-bg`, `--gd-text-muted`, `--gd-danger` (error badge), `--gw-text-body-16-sem`, `--gw-text-body-12-med`.

**Accessibility.** Title is a heading at the page's current level. If it replaces content after a filter change, announce it in an `aria-live="polite"` wrapper.

**Provenance.** Extracted from `web/admin/analytics.html:464-470`; badge shape changed.

## Skeleton

**Purpose.** Loading placeholders for a region whose final layout is known. The rule: **draw the real layout**. One ghost per real element (label, value, chart, row), at the real size and in the real place, so nothing jumps when data arrives. Never one grey rectangle for a card, and never a `0`, a dash or a plausible number while data is in flight.

**Anatomy.** `.gd-ghost` plus `--title`, `--value`, `--block`, `--chart`, `--avatar`, `--icon`; `.gd-ghost-stack` for text lines; `.gd-ghost-row` for a table row (height and padding from `--gd-row-h` and `--gd-cell-px`). Mark the region `aria-busy="true"`.

**States.** Pulse (1.6s, opacity 1 to .55), none under reduced motion (base rule). On load, replace the ghost and clear `aria-busy`.

**Tokens.** `--gd-skel`, `--gw-radius-4/8`, density tokens.

**Accessibility.** Ghosts are decorative; the busy region carries `aria-busy`. Do not announce each ghost.

**The pre-shell ghost stays hub-internal.** The hub's pre-shell sidebar ghost in `shell.css:2373-2404` (time-boxed, removed after 5s) is a site-shell concern and is not part of this set.

**Provenance.** Extracted from `web/shell.css:2412-2426` (`.gw-ghost`) and `web/admin/analytics.html:220-223` (`.sk`).

## Unavailable state

**Purpose.** A card or section whose source could not be read. Distinct from empty (we read it and it held nothing) and loading. The state belongs to the card or section that failed, never to the page: a page reading five stores can have one fail while four are fine.

**The ruling still stands (28 Aug 2026, `old-dashboard-exports/states.md`, and R20): a quantity that cannot be read is REMOVED, never zeroed.** A bar at 0%, `0%`, `of 0` or a value of dash each say "we looked and the answer is nothing", which is a different claim from "we could not look".

**Anatomy.** The card keeps its surface, radius, padding, label and footprint, so the page does not change shape. Set `data-state="unavailable"` on the card; every element marked `data-gd-quantity` (value, sub-line, percentage, progress bar) is removed by CSS. Add `.gd-unavail`: `__dot` (the "behind" status dot), `__value` reading `Unavailable` in 14 medium muted (the display size announces a measurement), and one `.gd-badge.gd-badge--bad` naming the source that failed (`HubSpot`, `Postgres`, `Search Console`).

**Copy.** Name the source, not the symptom. Never "Error", never a dash, never a number, avoid "Could not compute".

**Retry.** Not inside the card; there is no room and a dead control is worse. It goes on the section header, only if wired. If one card failed, the section's refresh is the retry.

**Section level.** A section that cannot be read at all uses the `Empty state` error variant with the same copy rule. A state is still the page (R20): it keeps the page's horizontal padding and reflows like the page.

**What changed from the old rulings.** The source badge is `.gd-badge--bad` (the old `Color=Red`); the empty-state component is real now; everything else is kept.

**Provenance.** Ruling carried from `old-dashboard-exports/states.md`; CSS NEW.

## Board

**Purpose.** Work items grouped by stage: tasks, deals, reviews. Use it when the stage is the main question. A table is better when the user compares many columns. The view switcher (board, table) is the `segmented-control` in `actions.md`.

**Anatomy.** `.gd-board[data-gd-board="drag"]` of `.gd-board__col` (`__head` with a name and `__count`, `__list`) holding `.gd-board__card` (`__grip`, `__main` with `__title` and `__meta`). Cards are `tabindex="0"` and `draggable="true"` on a drag board.

**Drag.** The grip and the grab cursor are drawn only when `data-gd-board="drag"`, because only then does drag work (R19). Pointer drag moves the card live between columns and reorders; keyboard moves with Alt+Arrow Left/Right (column) and Alt+Arrow Up/Down (order). Counts update and a polite live region announces "Moved to In review, position 2 of 5". The `gd:board-move` event carries `{card, from, to, index}`; persisting is the page's job. A read-only board omits the attribute and the grip.

**States.** Card rest, hover, selected (`aria-selected="true"`), disabled (`aria-disabled`), dragging (reduced opacity), empty column ("Drop cards here" on drag boards only).

**Tokens.** `--gd-sunken-bg` column, `--gd-card-bg` card, `--gd-border`, `--gd-gap`, `--gd-control-h` (column head), `--gd-row-h` (empty drop target).

**Accessibility.** Cards are focusable; the move shortcuts are listed in the page help. A column is a labelled region.

**Provenance.** NEW: not in the hub, reference Mobbin Trello, ClickUp, Wrike, pending library review.

**Phone.** Columns are about 85% of the screen wide and snap, so the next column peeks in.
