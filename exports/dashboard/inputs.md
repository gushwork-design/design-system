# Inputs — fields, choices, settings, ranges, queries

Scope: everything a person types, picks or configures in a dashboard or web app, from a single field up to the time-range bar and query builder that heavy analytics screens are built around. CSS is `css/30-inputs.css`, behaviour is `js/30-inputs.js` (`GD.inputs`, needs `20-actions.js`). Text-field rules come from `foundation/text-field.md`: a field has **no hover state**, its fill never changes, and focus is a 1px edge (`--gd-border-focus`) instead of a ring (R41); errors are a red edge plus a message, never a tinted fill. Interactive state is black (`--gd-ink`), never blue: a toggle that is On, a selected date and a checked box are all ink. Every height flows from `--gd-control-h`, so `data-density="compact"` gives 28px controls. Custom listboxes keep DOM focus on the trigger or input and use `aria-activedescendant`.

## Text input

**Use** for one line of free text. **Not** for long text (textarea), a fixed set of choices (select) or search (search field).

Anatomy: `.gd-input` (the shell that draws the edge) > optional `.gd-input__icon`, `input.gd-input__el`, optional trailing slot.
```html
<div class="gd-input"><input class="gd-input__el" type="email" aria-label="Work email" placeholder="name@company.com"></div>
```
Variants: `--sm` (28px), `--auto` (hugs), leading icon, trailing spinner (`.gd-input__spin`). States: rest, filled, focus (edge), `aria-invalid="true"` (red edge), `--warn` / `data-state="warn"` (yellow edge), disabled (`--gd-sunken-bg`). Tokens: `--gd-field-bg`, `--gd-border-strong`, `--gd-border-focus`, `--gd-danger`, `--gd-warn`, `--gd-placeholder`, `--gd-control-h`. Accessibility: every field needs a label (visible via form field, or `aria-label`); give the message an id and point `aria-describedby` at it. Provenance: extracted `analytics.html:282-289` (`.ul-input`), `access-control.html:158-185` (`.ac-field`).

## Textarea

**Use** for notes and descriptions. Anatomy: `textarea.gd-textarea`, radius 12, resizes vertically, min height 96, 14px/1.5. States as text input (focus edge, `aria-invalid`, disabled). Provenance: extracted `design-system.html:751-753` (`.rv-ta`).

## Select

**Use** to pick one of roughly 3 to 15 known options. **Not** for long lists (combobox) or multiple values (multi select); for 2 to 5 views use a segmented control.

Anatomy: `.gd-select[data-gd-select]` > `button.gd-input` (`.gd-select__value`, caret) + `.gd-menu[role=listbox]` of `[role=option][data-value][aria-selected]` + a hidden input carrying the value.
```html
<div class="gd-select" data-gd-select><button type="button" class="gd-input" aria-haspopup="listbox"><span class="gd-select__value">Google Ads</span><svg class="gd-input__caret" …/></button>
<div class="gd-menu" role="listbox" hidden><button class="gd-menu__item" role="option" data-value="google" aria-selected="true">…</button></div><input type="hidden" name="platform"></div>
```
Variants: `--sm` and `.gd-select--auto` for toolbars, placeholder (`data-empty`). States: rest, hover (button edge firms up), open (edge + flipped caret), disabled. Behaviour: click, Enter, Space or Arrow opens with the selected option active; arrows, Home/End, type-ahead move; Enter or click chooses, Esc closes; the menu is `position:fixed`, matches the trigger width and flips up near the bottom. Emits `gd:change {value,label}` on the wrapper and a native `change` on the hidden input. Provenance: extracted `analytics.html:290-356` (`.ul-select`, `.ul-menu`) and `access-control.html:261-308` (`.ac-dd`); the hub's blue check is ink here.

## Multi select

**Use** to pick several values (channels, countries). Anatomy: `.gd-multi-wrap[data-gd-multi]` > `.gd-input.gd-input--multi` holding `.gd-input__chip` items (label + remove button) and the typeahead `input.gd-input__el`, plus a `.gd-menu[aria-multiselectable]` and a hidden input (comma-separated).

Behaviour: typing filters; click or Enter toggles an option and the menu stays open; the chip X removes; Backspace on an empty input removes the last chip; chips wrap. Emits `gd:change {value:[…],labels:[…]}`. Tokens as text input; chips use `--gd-sunken-bg` and `--gd-border-strong`. Provenance: NEW, not in the hub; reference Mobbin Linear and Notion property pickers; pending library review.

## Combobox

**Use** for a long list the person narrows by typing (countries, owners). Anatomy: `.gd-combo[data-gd-combo]` > `.gd-input` with `input.gd-input__el` and a caret, `.gd-menu[role=listbox]`, hidden input. Behaviour: typing filters (shows "No matches"), arrows move, Enter chooses, free text is discarded on blur and the chosen label returns. Emits `gd:change`. Same states as select. Provenance: NEW, not in the hub; reference Mobbin Linear and Notion; pending library review.

## Search field

**Use** to filter the content in view. Anatomy: `.gd-input.gd-input--search` with a leading magnifier, `input[type=search]` and a `button.gd-input__clear[data-gd-clear]`. The clear X shows only while there is text and empties the field (R19: it works); Esc does the same. Default width 240px; `--sm` and compact supported. Provenance: extracted `analytics.html:282-289` (`.ul-input` with its search glyph).

## Checkbox

**Use** for independent yes/no choices and row selection. **Not** for a single setting that takes effect immediately (toggle) or one-of-many (radio).

Anatomy: `label.gd-check` > native `input[type=checkbox]` (visually hidden, kept for forms and keyboard) + `.gd-check__box` + optional `.gd-check__label` and `.gd-check__help`. A bare label with just the box is the table row-select form and needs `aria-label` on the input.
States: unchecked (edge), hover (edge darkens), checked and indeterminate (ink fill, tick or dash in `--gd-ink-fg`; inverts in dark), focus ring on the box, disabled. Set indeterminate with `data-indeterminate` on the input (JS applies the property) or the native property. Size 20px, 16px in compact. Provenance: extracted from old `v2/primitives.md` checkbox (24px/radius 8 there; resized for density); the hub draws no checkbox.

## Radio

**Use** for choosing one option from a short visible set. Anatomy: `label.gd-radio` > native radio + `.gd-radio__box` (circle, ink fill and dot when checked) + label. Same states, sizes and keyboard as native radios (arrows move within a `name` group). Provenance: NEW, not in the hub; reference Mobbin Clerk and Squarespace settings; pending library review.

## Toggle

**Use** for a setting that applies immediately (Hide my activity, Weekly summary). **Not** for choices submitted with a form (checkbox).

Anatomy: `label.gd-toggle` > `input[type=checkbox][role=switch]` + `.gd-toggle__track` + optional label text. Sizes: 44x24 default; `--xs` 36x20 for section headers, table rows and toolbars (and automatic in compact density). On is `--gd-ink`, never blue; Off is `--gd-track-off`; the knob is `--gd-knob` and turns `--gd-ink-fg` when On. States: hover, focus ring on the track, disabled. Provenance: extracted `analytics.html:503-512` (`.an-me`, drawn 28x16 there, which is off the 36x20 / 44x24 ramp; the ramp wins), sizes from old controls.md.

## Form field

**Use** to give any control a label, help text, an optional marker and an error. Anatomy: `.gd-field[data-state=error|warn]` > `.gd-field__label` (with `.gd-field__req` or `.gd-field__opt`), the control, `.gd-field__help`, `.gd-field__error[role=alert]`.
```html
<div class="gd-field" data-state="error"><label class="gd-field__label" for="e">Work email <span class="gd-field__req" aria-hidden="true">*</span></label>
<div class="gd-input"><input id="e" class="gd-input__el" aria-invalid="true" aria-describedby="e-err"></div><p class="gd-field__error" id="e-err" role="alert">Enter a full address.</p></div>
```
`data-state` colours the control's edge; the error replaces the help text. The message wraps and the field grows; do not clip it. Provenance: NEW, not in the hub; reference Mobbin Clerk; pending library review.

## Setting row

**Use** for one preference: label and description on the left, the control on the right. Anatomy: `.gd-setting` > `.gd-setting__text` (`.gd-setting__label`, `.gd-setting__desc`) + `.gd-setting__control`. Rows divide with a hairline; `--top` aligns the control to the first line; below 640px the control stacks under the text. Controls inside get a 240px field width. Provenance: NEW, not in the hub; reference Mobbin Clerk and Squarespace settings; pending library review.

## Form section

**Use** to group settings or fields under a title on a settings page. Anatomy: `.gd-formsec` > `.gd-formsec__head` (`__title`, `__desc`), `.gd-formsec__body` (setting rows, or `--fields` for stacked form fields), optional `.gd-formsec__foot` (note, Reset, Save). Card surface with a hairline edge, padding from `--gd-card-pad`. Provenance: NEW, not in the hub; reference Mobbin Clerk and Squarespace; pending library review.

## Unsaved changes bar

**Use** at the bottom of a settings form that saves explicitly. Anatomy: `.gd-savebar[data-gd-savebar]` (hidden by default) > `.gd-savebar__msg` + `.gd-savebar__acts` (Reset outline, Save primary), inside a container marked `data-gd-form`.

Behaviour: it appears while any control differs from its loaded value (inputs, checkboxes, selects, custom listboxes) and hides when they match. Reset restores every value and emits `gd:reset`; Save emits a cancelable `gd:save {form}` and, unless prevented, takes the current values as the new baseline (`GD.inputs.markSaved`). Set `aria-busy="true"` on Save while a request runs. Sticky at the bottom with a 160ms rise (off under reduced motion), z-index 50. Provenance: NEW, not in the hub (`access-control.html:923` has inline Discard/Save); reference Mobbin Clerk and Etsy; pending library review.

## Date range picker

**Use** to choose an arbitrary date range with presets. Anatomy: `.gd-drp[data-gd-drp]` > presets list (`.gd-drp__preset[data-preset]`), start and end fields, two months (`.gd-drp__month`, rendered by JS), footer with summary, Cancel and Apply. `data-from`, `data-to` (ISO), `data-gd-preset`, `data-max="today"`. As a popover add `.gd-drp--pop` and `hidden`, with a trigger `button.gd-input.gd-drp__trigger[data-gd-drp-trigger]` (the inline compact trigger is `--sm`, showing the range in `.gd-drp__label`).

Range drawing: seven contiguous 1fr columns; the fill is a band behind the cells, with half-column bands (`data-range="start|end"`) so it joins the black endpoint pills; mid cells carry a full band; a single-day range has no band. Endpoints are `--gd-ink`; the band is `--gd-range-band`; today has an edge; days after `data-max` are disabled. Behaviour: preset click sets the range; first day click starts, hover previews, second ends; typing in the fields parses dates; arrows move by day or week; Apply updates the trigger and emits `gd:range {preset,from,to,days}`, Cancel and Esc discard edits and close. Below 760px presets become a row and one month shows. Provenance: NEW, not in the hub; geometry from old `v2/overlays.md` date-range-picker; reference Mobbin Mixpanel and Stripe; pending library review.

## Time range bar

**Use** as the single time control of an analytics screen. Anatomy: `.gd-rangebar[data-gd-rangebar]` holding a segmented radiogroup of presets (`data-value` today, yesterday, 7d, 30d, 3m, 6m, 12m, custom), a granularity select and a compare select (`data-gd-key`), a Live toggle (`data-gd-key="live"`, X-Small), and a date range picker popover that Custom opens.

Behaviour: any change emits `gd:range {preset,from,to,days,granularity,compare,live}` on the bar (the one event the screen listens to). Hour granularity disables above 7 days and falls back to Day; Cancel on the picker returns to the previous preset. Wraps on narrow widths. Provenance: NEW, composite, not in the hub; reference Mixpanel, Amplitude, Square, Hotjar, Cloudflare and Railway; pending library review.

## Datetime field

**Use** where an exact moment is needed (event filters, scheduled sends). Anatomy: `.gd-datetime` > a date `.gd-input` (native `input[type=date]`), a time `.gd-input` (`input[type=time]`) and a timezone select. Native inputs keep the platform pickers and keyboard entry; the shell gives them the field edge, so they follow density and theme. Provenance: NEW, not in the hub; reference Mobbin Okta system log; pending library review.

## Timezone select

**Use** to pick a time zone from a long list. A combobox whose options read `GMT+05:30  Kolkata`; type a city or an offset to filter. Same anatomy, behaviour and events as combobox. Provenance: NEW, not in the hub; reference Mobbin Okta system log; pending library review.

## Query builder

**Use** to let people compose an analysis: what to chart, which metrics, filters, grouping, sorting. **Not** for a table's row filter (Tables owns the "where field op value" filter builder).

Anatomy: `.gd-qb[data-gd-qb]` > `.gd-qb__sec[data-gd-qb-sec=name][data-max]` rows (Visualize, Metric, Filter, Group by, Sort by), each with `.gd-qb__label` and `.gd-qb__body` holding `.gd-qb__chip` select chips (`.gd-qb__val` opens the section's menu, `.gd-qb__x` removes) and a ghost Add button (`data-gd-qb-add`, `data-gd-menu`) next to the section's `.gd-menu`. The Visualize row is a segmented control (the chart type switcher). Footer: Save as…, Compare queries, Run query (`data-gd-qb-action`).

Behaviour: picking from the menu adds a chip or replaces the one that opened it; chosen values are disabled in the menu; `data-max` hides Add at the limit. Emits `gd:query {query}` (`{visualize:[…],metric:[…],…}`) on every change and `gd:query-action {action,query}` for the footer. Provenance: NEW, not in the hub; reference Mobbin Sentry, Mixpanel, Amplitude and Google Analytics Explorations; pending library review.
