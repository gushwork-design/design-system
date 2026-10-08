# Task board components

The pieces a task board is made of, drawn for the task board at `web/internal/staging/tasks`: board lanes and task cards, a grouped list, a timeline, an inbox for triage, property pickers (priority, status, assignee, dates), a filter popover, and an assistant panel with a composer, a tag picker and an approve-a-plan card. Wireframes: `task-board-wireframes/index.html` (sections 1 to 12). Mobbin references, from the wireframe notes: Asana board, Linear board, Linear inbox, Linear task, Qatalog task, Todoist upcoming, Attio grouped list. Source is NEW for every component here; none of it is in the hub. CSS is `css/57-tasks.css`. These components are CSS only: nothing was added to `js/`, because the behaviour (drag, pickers, the assistant's conversation) belongs to the page that uses them, and each section says what that behaviour is so a second page can repeat it.

Everything is scoped by `class="gd"` and themed by `color-scheme` (light and dark come from the `--gd-*` aliases in `base.md`). Heights and gaps follow the density tokens, so `data-density="compact"` works; comfortable is what is built. Blue carries data and status only (a today line, a Working run chip); black carries interaction (ink fills, selected edges). Destructive is a red label on a neutral shape (the page uses the library's confirm dialog). No component here introduces a colour, type, radius, shadow or spacing value. Values with no token are named under each component's Tokens as gaps.

## Assignee avatar

**Purpose.** Shows who owns a task. People are circles; agents are rounded squares, so agent work reads at a glance. Use it in cards, list rows, pickers and feeds. Do not use it for an account or workspace mark (use `avatar`, the generated profile mark).

**Anatomy.** `span.gd-av` holding initials (two letters for a person, one for an agent). `.gd-av-stack` overlaps several with a ring in the surface colour. `button.gd-av.gd-av--btn` is the interactive form.
```html
<span class="gd-av" role="img" aria-label="Utsav Singh">US</span>
<span class="gd-av gd-av--agent gd-av--ink" role="img" aria-label="Bruce">B</span>
<div class="gd-av-stack"><span class="gd-av">US</span><span class="gd-av gd-av--agent gd-av--ink">B</span><span class="gd-av gd-av--agent gd-av--outline">A</span></div>
```

**Variants.** Size `--sm` (20), default (24), `--lg` (32). Shape: circle (person) or `--agent` (rounded square, radius 8, 4 at `--sm`). Agent fill: `--ink` (Bruce, ink fill) or `--outline` (Alfred, 1px ink edge). `--ghost`: an unassigned slot, dashed edge, no fill.

**States.** Rest. The button form has hover (ink edge), pressed (`aria-pressed="true"`, 2px ink edge) and the keyboard ring.

**Behaviour.** None. The button form is used as a filter toggle: pressing it narrows the board to that assignee.

**Tokens.** `--gd-selected-bg`, `--gd-text`, `--gd-ink`, `--gd-ink-fg`, `--gd-card-bg`, `--gd-border-strong`, `--gd-panel-bg` (stack ring), `--gw-radius-full`, `--gw-radius-8`, `--gw-radius-4`, `--gw-text-body-10-sem`, `--gw-text-body-12-sem`, `--gw-motion-fast`. Gap: avatar sizes 20, 24 and 32 are literals.

**Accessibility.** `role="img"` with the person's or agent's name, or a real button with the same `aria-label`. Initials are decorative beside the name.

**Provenance.** NEW, reference Mobbin Linear board and Asana board, wireframe sections 1 and 10, pending library review.

## Priority bars

**Purpose.** A tiny glyph for a task's priority: three bars filled by level. Use it wherever priority is a property of a row. Urgent is not drawn here: it is a solid Badge, so the one level that needs attention is a filled shape.

**Anatomy.** `span.gd-prio[data-level="0|1|2|3"] > i i i`, with `role="img"` and an `aria-label` such as "High priority".
```html
<span class="gd-prio" data-level="3" role="img" aria-label="High priority"><i></i><i></i><i></i></span>
```

**Variants.** `data-level` 3 is High, 2 Medium, 1 Low, 0 none (every bar quiet).

**States.** Static.

**Behaviour.** None.

**Tokens.** `--gd-ink` (filled bar), `--gd-border-strong` (quiet bar), `--gw-space-2`, `--gw-space-4`, `--gw-space-8`, `--gw-space-12`, `--gw-radius-2`. The bar width is 1.5 times the 2px space token (3px), a gap with no token.

**Accessibility.** The level is carried by the label, never by the glyph alone.

**Provenance.** NEW, reference Mobbin Linear board and Linear task, wireframes 1, 6 and 7, pending library review.

## Run status chip

**Purpose.** Where an agent has got to on a task: Queued, Working, Needs you, Ready for review, Failed. Use it beside an agent-assigned task only. An agent never marks a task done; Ready for review is where it stops.

**Anatomy.** `.gd-run[data-state="queued|working|needs|review|failed"]` holding a `gd-status-dot` and the label, drawn like a Badge (20 tall, radius 4). Failed with a retry is a button, `button.gd-run.gd-run--btn`, reading "Failed, Retry".
```html
<span class="gd-run" data-state="working"><span class="gd-status-dot gd-status-dot--info gd-status-dot--live"></span>Working</span>
<button type="button" class="gd-run gd-run--btn" data-state="failed"><span class="gd-status-dot gd-status-dot--bad"></span>Failed · Retry</button>
```

**Variants.** The five states. Tone follows the state: neutral, info (blue, status), warn, good, bad.

**States.** Rest. The button form has hover and the keyboard ring. The Working dot pulses and stands still under reduced motion.

**Behaviour.** The page owns it: Retry sets the run back to queued.

**Tokens.** `--gd-tone-{neutral,info,warn,good,bad}-bg` and `-fg`, `--gw-radius-4`, `--gw-space-4`, `--gw-space-8`, `--gw-text-body-12-med`, `--gw-motion-fast`.

**Accessibility.** Colour is never the only carrier: the dot sits beside a word. The retry button's label names the task.

**Provenance.** NEW, reference Mobbin Asana board and Qatalog task, wireframe section 10, pending library review.

## Board lane

**Purpose.** One column of a board: a name, a count and the cards in it. Lanes share the width instead of scrolling sideways. Use it for work grouped by stage. Do not use it where the user compares many columns (a table is better).

**Anatomy.** `.gd-lanes > section.gd-lane[.gd-lane--suggested] > header.gd-lane__head (h2.gd-lane__name, .gd-lane__count, optional .gd-lane__by) + .gd-lane__list + .gd-lane__add`. `.gd-lane__empty` is the quiet line in an empty lane. `.gd-lane__quick` is the inline field the add button turns into.
```html
<div class="gd-lanes" style="--gd-lanes:4"><section class="gd-lane" aria-label="To do, 2"><header class="gd-lane__head"><h2 class="gd-lane__name">To do</h2><span class="gd-lane__count gd-num">2</span></header><div class="gd-lane__list">…cards…</div><button type="button" class="gd-lane__add">Add task</button></section></div>
```

**Variants.** `--suggested`: dashed edge and a tinted ground, so work an assistant found never reads as committed. `--gd-lanes` sets how many lanes share the row (3 or 4 here).

**States.** Drop target (`data-over="true"`: hover ground and a focus edge). Empty (dashed line of text). Add button hover.

**Behaviour.** The page owns it: cards move between lanes by native drag, or with Alt and the arrow keys on the card's title button; a drop changes the task's status. The Suggested lane accepts no drops.

**Tokens.** `--gd-sunken-bg`, `--gd-hover-bg`, `--gd-border-strong`, `--gd-border-focus`, `--gd-text`, `--gd-text-muted`, `--gd-card-bg`, `--gd-control-h`, `--gw-space-*`, `--gw-radius-8`, `--gw-radius-12`, `--gw-text-body-12-med`, `--gw-text-body-14-sem`, `--gw-text-body-14-med`, `--gw-motion-fast`.

**Accessibility.** Each lane is a labelled region; the heading is the lane name. Dragging has a keyboard path.

**Phone.** One lane shows at a time, chosen with the library's pill tabs; the lane heads are hidden and the Suggested lane keeps its dashed frame.

**Provenance.** NEW, reference Mobbin Linear board and Asana board, wireframe section 1, pending library review. Not the stock `board`: lanes share the width and the card is flat.

## Task card

**Purpose.** One task on a board: its title, what matters about it (priority, run state, due date, source) and who has it. Use it inside a board lane. Open the full record in a drawer.

**Anatomy.** `article.gd-taskcard > button.gd-taskcard__open (the title) + .gd-pop.gd-taskcard__more (a menu trigger that shows on hover and focus) + .gd-taskcard__meta (chips, then `.gd-taskcard__spacer`, then the assignee avatar)`. A suggested card adds `.gd-taskcard__quote` and `.gd-taskcard__acts` (Accept, Dismiss).
```html
<article class="gd-taskcard" data-id="t1"><button type="button" class="gd-taskcard__open">Review the conversations tab PR</button>
<div class="gd-taskcard__meta"><span class="gd-prio" data-level="3">…</span><span class="gd-badge gd-badge--warn">Today</span><span class="gd-badge">#design-hub</span><span class="gd-taskcard__spacer"></span><span class="gd-av">US</span></div></article>
```

**Variants.** `--suggested` (quote and Accept and Dismiss), `--dismissed` (muted, Restore). `draggable="true"` on a card that can move.

**States.** Rest, hover, selected (`data-selected="true"`: ink edge), dragging (`data-dragging`), done (`data-done`: title struck, muted), focus ring on the title.

**Behaviour.** The page owns it: the title button opens the record; clicking the card body does too; Cmd-click selects (for tagging in the assistant). The quote is clamped to three lines.

**Tokens.** `--gd-card-bg`, `--gd-hover-bg`, `--gd-selected-bg`, `--gd-border`, `--gd-border-strong`, `--gd-text`, `--gd-text-muted`, `--gw-radius-8`, `--gw-radius-4`, `--gw-space-*`, `--gw-text-body-12-reg`, `--gw-text-body-14-med`, `--gw-motion-fast`.

**Accessibility.** The title is a real button whose label includes the task number. The menu trigger has a label naming the task. The menu is the library `menu`.

**Provenance.** NEW, reference Mobbin Linear board and Asana board, wireframe section 1, pending library review.

## Task list

**Purpose.** The same tasks as a grouped list, for "what is due today" faster than a board answers it. Use it for 10 or more tasks grouped by a property. Do not use it for comparing numeric columns (use `data-table`).

**Anatomy.** `.gd-tasklist > .gd-tasklist__head (column labels) + .gd-tasklist__group[data-collapsed] (button.gd-tasklist__group-head with a caret, name and count; rows) > .gd-tasklist__row (cells: check, title cell, priority and run, source, due, assignee)`. The title cell is `.gd-tasklist__cell--main` holding `.gd-tasklist__line` (button.gd-tasklist__open and an optional badge) and a phone-only `.gd-tasklist__sub`.
```html
<div class="gd-tasklist" role="list"><div class="gd-tasklist__group" role="group" aria-label="Today"><button type="button" class="gd-tasklist__group-head" aria-expanded="true">Today <span class="gd-tasklist__n">2</span></button>
<div class="gd-tasklist__row" role="listitem"><div class="gd-tasklist__cell"><button type="button" class="gd-tasklist__check" role="checkbox" aria-checked="false" aria-label="Mark done: TSK-2"></button></div>…</div></div></div>
```

**Variants.** Group by due date, status, priority, assignee or nothing; the Done group collapses by default.

**States.** Row hover, selected, done (struck); check unchecked, hover, checked (ink fill); group expanded or collapsed (the caret turns).

**Behaviour.** The page owns it: the check toggles done; a group head toggles its rows.

**Tokens.** `--gd-hover-bg`, `--gd-selected-bg`, `--gd-border`, `--gd-border-focus`, `--gd-ink`, `--gd-ink-fg`, `--gd-text`, `--gd-text-muted`, `--gd-row-h`, `--gw-space-*`, `--gw-radius-4`, `--gw-text-body-12-med`, `--gw-text-body-14-med`, `--gw-text-body-14-sem`, `--gw-motion-fast`. Gap: the priority, source and due column widths (176, 140, 120) are chosen.

**Accessibility.** `role="list"` with grouped `role="group"` and `listitem` rows; the check is a real checkbox-role button with a label; the group head is a disclosure button with `aria-expanded`.

**Phone.** The priority, source and due columns are hidden and the due date moves under the title.

**Provenance.** NEW, reference Mobbin Attio grouped list and Todoist upcoming, wireframe section 2, pending library review.

## Property row

**Purpose.** A label and a value you can change, one per row: status, priority, assignee, start, due. A quiet button for the value keeps a drawer with six properties calm. Use it in a record's drawer or pane. For read-only facts use `key-value-list`.

**Anatomy.** `dl.gd-props > div.gd-props__row > dt + dd > button.gd-prop` (a glyph, the value, optionally `.gd-prop__tag` such as "guessed"). The button opens a popover (`gd-popover`) that holds a `list-picker` or a `date-picker`.
```html
<dl class="gd-props"><div class="gd-props__row"><dt>Priority</dt><dd><div class="gd-popover-wrap"><button type="button" class="gd-prop" aria-haspopup="dialog" aria-expanded="false"><span class="gd-prio" data-level="3">…</span><span>High</span></button>…</div></dd></div></dl>
```

**Variants.** `gd-prop--empty` reads as a placeholder ("Set due date").

**States.** Rest (no edge), hover and expanded (selected ground), keyboard ring.

**Behaviour.** The page opens the popover on click or the down arrow.

**Tokens.** `--gd-selected-bg`, `--gd-text`, `--gd-text-muted`, `--gd-control-h`, `--gw-space-*`, `--gw-radius-8`, `--gw-text-body-12-med`, `--gw-text-body-14-med`, `--gw-motion-fast`. Gap: the 96px label column is chosen.

**Accessibility.** The value is a real button with `aria-haspopup` and `aria-expanded`; the `dt` names the property.

**Provenance.** NEW, reference Mobbin Linear task and Qatalog task, wireframe section 5, pending library review.

## List picker

**Purpose.** Pick one value from a short list inside a popover, with room for a one-line description, a number key, a note and a suggestion with a reason. Use it for priority, status and assignee. For a long list use `combobox`.

**Anatomy.** `.gd-picker` (inside a `gd-popover`) > `.gd-picker__label` (a group name), `button.gd-picker__row[role=menuitemradio][aria-checked]` (a glyph, `.gd-picker__text` with a bold name and a `small` description, `.gd-picker__key`, `.gd-picker__check`), `.gd-picker__sep`, `.gd-picker__note`, and `.gd-picker__suggest` (an assistant's suggestion: a heading, the reason, Apply and Ignore).
```html
<div class="gd-popover"><div class="gd-picker" role="menu" aria-label="Priority"><button type="button" class="gd-picker__row" role="menuitemradio" aria-checked="true"><span class="gd-prio" data-level="3">…</span><span class="gd-picker__text"><b>High</b></span><span class="gd-picker__key">2</span></button>…</div></div>
```

**Variants.** `gd-picker__row--quiet` for rows that open something else (Invite someone, Add an agent).

**States.** Row hover and focus (menu hover ground; keyboard adds a 2px ink edge), checked (weight and a tick), disabled (`aria-disabled`).

**Behaviour.** The page owns it: the up and down arrows move between rows, number keys choose a priority, a pick closes the popover and returns focus to the trigger.

**Tokens.** `--gd-menu-hover`, `--gd-text`, `--gd-text-muted`, `--gd-ink`, `--gd-sunken-bg`, `--gd-border`, `--gd-disabled-ink`, `--gd-control-h`, `--gw-space-*`, `--gw-radius-8`, `--gw-text-body-12-med`, `--gw-text-body-12-reg`, `--gw-text-body-14-med`, `--gw-text-body-14-sem`, `--gw-motion-fast`.

**Accessibility.** `role="menu"` with radio menu items; arrow keys move; the checked row carries `aria-checked`; Esc closes and returns focus.

**Provenance.** NEW, reference Mobbin Linear task and Qatalog task, wireframes 7 and 10, pending library review.

## Date picker

**Purpose.** Set a start and a due date in one place: two fields, a typed field that understands words, quick picks and a month calendar with the range drawn. Use it when a record has a start and an end. For an analytics range with presets and a compare use `date-range-picker`.

**Anatomy.** `.gd-datepick` (inside a `gd-popover`) > `.gd-datepick__fields` (two `button.gd-datepick__field[aria-pressed]`, each a small label and the value), `input.gd-datepick__type`, `.gd-datepick__hint`, `.gd-datepick__quicks` (`button.gd-datepick__quick`), `.gd-datepick__nav` (previous, month, next) and `.gd-datepick__grid` (`.gd-datepick__dow` labels, `button.gd-datepick__day`).
```html
<div class="gd-popover"><div class="gd-datepick" role="group" aria-label="Dates"><div class="gd-datepick__fields"><button type="button" class="gd-datepick__field" aria-pressed="false"><small>Start</small>Thu 8 Oct</button><button type="button" class="gd-datepick__field" aria-pressed="true"><small>Due</small>Fri 9 Oct</button></div>…</div></div>
```

**Variants.** Day `data-range`: `start`, `mid`, `end` or `only`. `data-today` marks today; `data-out` dims days of the next or previous month.

**States.** Day hover, today (a dot), range band with ink end caps, field active (ink edge), typed field focus (edge) and invalid (`aria-invalid`, red edge).

**Behaviour.** The page owns it: a click on a day sets the active field and moves on to Due after Start; the typed field parses "fri", "next week", "in 3 days", "oct 12"; quick picks (Today, Tomorrow, This weekend, Next week, In 2 weeks, No date); the range never runs backwards, so setting one end clears the other if it would cross. No time of day.

**Tokens.** `--gd-selected-bg`, `--gd-ink`, `--gd-ink-fg`, `--gd-border-strong`, `--gd-border-focus`, `--gd-danger`, `--gd-text`, `--gd-text-muted`, `--gd-disabled-ink`, `--gd-placeholder`, `--gd-card-bg`, `--gd-control-h`, `--gw-space-*`, `--gw-radius-8`, `--gw-text-body-10-med`, `--gw-text-body-12-med`, `--gw-text-body-14-med`, `--gw-motion-fast`. Gap: the 320px width is chosen.

**Accessibility.** Each day is a button labelled with its full date; the fields are toggle buttons; the typed field has a label and a live hint.

**Provenance.** NEW, reference Mobbin Linear task and Todoist upcoming, wireframe section 7, pending library review.

## Filter popover

**Purpose.** Filter by several fields at once with "any of" values: pick a field on the left, tick its values on the right. Use it where a filter has few fields and fixed value lists. For free operators ("greater than") use `filter-builder`.

**Anatomy.** `.gd-filterpop` (inside a `gd-popover`) > `.gd-filterpop__fields` (buttons with `aria-current`, each with a count of ticked values) + `.gd-filterpop__values` (`.gd-filterpop__title`, then `label.gd-filterpop__value` rows holding a library checkbox, the text and `.gd-filterpop__n`, the number of tasks) + `.gd-filterpop__foot` (Clear, Save as view).
```html
<div class="gd-popover"><div class="gd-filterpop"><div class="gd-filterpop__fields"><button type="button" class="gd-filterpop__field" aria-current="true">Priority<span class="gd-tbar__n">2</span></button>…</div><div class="gd-filterpop__values"><div class="gd-filterpop__title">Priority is any of</div>…</div><div class="gd-filterpop__foot">…</div></div></div>
```

**Variants.** None.

**States.** Field hover and current, value hover, checked.

**Behaviour.** The page owns it: each tick applies at once and adds a removable chip (`filter-chip`); the count beside a field is the ticked values; Save as view hands the filters to `saved-views`.

**Tokens.** `--gd-menu-hover`, `--gd-selected-bg`, `--gd-border`, `--gd-text`, `--gd-text-muted`, `--gd-control-h`, `--gw-space-*`, `--gw-radius-8`, `--gw-text-body-12-med`, `--gw-text-body-14-med`, `--gw-motion-fast`. Gap: the 440px width and the 160px field column are chosen.

**Accessibility.** The groups are labelled ("Filter by", "Priority is any of"); checkboxes are real inputs; Esc closes and returns focus to the Filter button.

**Phone.** The popover docks to the bottom as a sheet and the field column narrows.

**Provenance.** NEW, reference Mobbin Linear board and Asana board, wireframe section 6, pending library review.

## Task timeline

**Purpose.** Tasks as bars from start to due date on a day grid, so a week or a quarter reads at a glance. A task with only a due date is a diamond. Use it for work with dates; undated work waits in a tray so nothing is invisible. For a flat schedule of events use a table.

**Anatomy.** `.gd-gantt[style="--gd-tl-days:28;--gd-tl-today:3"] > .gd-gantt__head (.gd-gantt__corner + .gd-gantt__scale of .gd-gantt__day[data-we][data-today] and .gd-gantt__week labels) + .gd-gantt__body (.gd-gantt__today line, .gd-gantt__group rows, .gd-gantt__row > .gd-gantt__label + .gd-gantt__cells > button.gd-gantt__bar) + .gd-gantt__tray (button.gd-gantt__chip)`. A bar's place is two custom properties, `--gd-tl-start` and `--gd-tl-len`, in days. `.gd-gantt__grip` are the two edges that resize a bar. `.gd-gantt__tools` and `.gd-gantt__legend` sit above it.
```html
<div class="gd-gantt" style="--gd-tl-days:28;--gd-tl-today:3"><div class="gd-gantt__head">…</div><div class="gd-gantt__body"><div class="gd-gantt__today"></div><div class="gd-gantt__row"><div class="gd-gantt__label">…</div><div class="gd-gantt__cells"><button type="button" class="gd-gantt__bar" data-level="high" style="--gd-tl-start:2;--gd-tl-len:3">Review the PR</button></div></div></div></div>
```

**Variants.** Bar shade by priority (`data-level` urgent, high, med, low, none), `data-suggested` (dashed, not committed), `data-kind="diamond"` (due date only). Zoom is the day count: 28 (week) or 84 (month); the range always starts on a Monday, which the weekend shading relies on.

**States.** Bar hover and keyboard ring; dragging (`data-dragging`); a tray chip is draggable; the drop day is shaded (`.gd-gantt__drop`). Weekends are shaded, today is a blue line (status) and a blue day number.

**Behaviour.** The page owns it: drag a bar to move it, drag an edge to resize, drag a tray chip onto the grid to date it; Left and Right arrows move a focused bar by a day and Shift with an arrow resizes it. No time of day.

**Tokens.** `--gd-ink`, `--gd-ink-fg`, `--gd-card-bg`, `--gd-sunken-bg`, `--gd-border`, `--gd-border-focus`, `--gd-accent` (today, status), `--gd-text`, `--gd-text-muted`, `--gd-selected-bg`, `--gw-space-*`, `--gw-radius-2`, `--gw-radius-4`, `--gw-radius-8`, `--gw-radius-12`, `--gw-text-body-10-med`, `--gw-text-body-12-med`, `--gw-text-body-12-sem`, `--gw-text-body-14-med`. Bar shades are `color-mix` of `--gd-ink` and the card ground, which are tokens. Gap: the 280px label column is chosen.

**Accessibility.** Every bar is a button whose label gives the task, the dates and the arrow-key hint, so the whole timeline works without a pointer. Colour is paired with the legend and the label; the dashed edge marks a suggestion.

**Phone.** Not drawn: the task board's phone bar has no Timeline.

**Provenance.** NEW, reference Mobbin Linear board and Asana board, wireframe section 3, pending library review.

## Inbox triage

**Purpose.** Work through suggested items one at a time from the keyboard: a list on the left, the selected item on the right with its source message, why it was suggested, editable properties and Accept or Dismiss. Use it for a queue of things to accept or reject.

**Anatomy.** `.gd-inbox > .gd-inbox__list (button.gd-inbox__row[aria-current] with a title and `.gd-inbox__meta`, then `.gd-inbox__foot`) + .gd-inbox__pane (`.gd-inbox__head`, a `quoted-message`, a library banner for the reason, `textarea.gd-inbox__title`, `property-row`s, `.gd-inbox__acts`)`.
```html
<div class="gd-inbox"><div class="gd-inbox__list"><button type="button" class="gd-inbox__row" aria-current="true"><span>Check the CTA copy</span><span class="gd-inbox__meta">…</span></button></div><div class="gd-inbox__pane">…</div></div>
```

**Variants.** None.

**States.** Row hover and current (selected ground and an ink bar on the left). Title field hover and focus (edge).

**Behaviour.** The page owns it: J and K move, A accepts, D dismisses, and Undo last restores the last dismissed item. The shortcut is shown on its button as a `shortcut-key`.

**Tokens.** `--gd-card-bg`, `--gd-hover-bg`, `--gd-selected-bg`, `--gd-ink`, `--gd-border`, `--gd-border-focus`, `--gd-text`, `--gd-text-muted`, `--gw-space-*`, `--gw-radius-8`, `--gw-radius-12`, `--gw-text-body-12-med`, `--gw-text-body-14-med`, `--gw-text-h7-bold`, `--gw-motion-fast`. Gap: the 360px list column is chosen.

**Accessibility.** The list is labelled; the current row has `aria-current`; every shortcut also has a button.

**Phone.** The two columns stack.

**Provenance.** NEW, reference Mobbin Linear inbox, wireframe section 4, pending library review.

## Quoted message

**Purpose.** The original message a record came from, quoted with its source, so you can see why the record exists. Use it where a record was created from a message.

**Anatomy.** `figure.gd-quote > .gd-quote__label + blockquote + figcaption` (who it was from and a link to the source).
```html
<figure class="gd-quote"><span class="gd-quote__label">From Slack · #growth</span><blockquote>Can you check the CTA copy before it goes out?</blockquote><figcaption>Aarav · <a href="#">Open in Slack</a></figcaption></figure>
```

**Variants.** None.

**States.** Static.

**Behaviour.** None.

**Tokens.** `--gd-border-strong`, `--gd-text`, `--gd-text-muted`, `--gw-space-*`, `--gw-text-body-12-med`, `--gw-text-body-14-reg`.

**Accessibility.** A real `figure` with a caption; the link opens in a new tab with `rel="noopener noreferrer"`.

**Provenance.** NEW, reference Mobbin Linear inbox and Linear task, wireframes 4 and 5, pending library review.

## Assistant launcher

**Purpose.** A floating pill that opens the assistant from any screen, bottom right, with its shortcut. It has a second button, a status dot, that opens the assistant's settings. Use it for one assistant per product.

**Anatomy.** `.gd-launch > button.gd-launch__main (an agent avatar, the label, a `.gd-launch__key` cap) + button.gd-launch__status (a `status-dot`)`.
```html
<div class="gd-launch"><button type="button" class="gd-launch__main"><span class="gd-av gd-av--agent gd-av--sm">B</span>Ask Bruce<kbd class="gd-launch__key">⌘K</kbd></button><button type="button" class="gd-launch__status" aria-label="Bruce settings"><span class="gd-status-dot gd-status-dot--neutral"></span></button></div>
```

**Variants.** None. The dot is neutral when its state cannot be read; a quantity that cannot be read is not drawn.

**States.** Hover (ink hover fill), keyboard ring, hidden while the panel is open.

**Behaviour.** The page owns it: click or the shortcut opens the panel; the dot opens settings. Hidden under 768 wide, where the bottom bar carries it.

**Tokens.** `--gd-ink`, `--gd-ink-fg`, `--gd-ink-hover`, `--gw-shadow-s3`, `--gw-radius-full`, `--gw-space-*`, `--gw-text-button-14`, `--gw-text-body-10-med`, `--gw-motion-fast`. Gap: it sits 24px from the corner and is 40px tall.

**Accessibility.** Both buttons are native with labels; the shortcut is on the main button as `aria-keyshortcuts`.

**Provenance.** NEW, reference Mobbin Linear, Ferndesk and Fireflies (assistant parked bottom right), wireframe section 1, pending library review.

## Bottom bar

**Purpose.** The phone's view switcher: a row of text items fixed to the bottom of the screen. Use it where the desktop has a segmented control and a launcher.

**Anatomy.** `nav.gd-bottomnav > button.gd-bottomnav__item[aria-current]` (label and an optional count).
```html
<nav class="gd-bottomnav" aria-label="Views"><button type="button" class="gd-bottomnav__item" aria-current="true">Board</button><button type="button" class="gd-bottomnav__item">List</button><button type="button" class="gd-bottomnav__item">Ask Bruce</button></nav>
```

**Variants.** None.

**States.** Item rest, current (text colour and weight), keyboard ring.

**Behaviour.** Drawn only at 767 and narrower; the page switches views or opens the assistant.

**Tokens.** `--gd-panel-bg`, `--gd-border`, `--gd-text`, `--gd-text-muted`, `--gd-control-h`, `--gw-space-*`, `--gw-text-body-12-med`, `--gw-motion-fast`.

**Accessibility.** A labelled `nav`; the current item has `aria-current`.

**Provenance.** NEW, reference Mobbin Linear and Todoist (phone bottom bars), wireframe section 11, pending library review.

## Floating add button

**Purpose.** The one primary action on a phone, always in reach: a square button with a glyph, above the bottom bar.

**Anatomy.** `button.gd-btn.gd-btn--primary.gd-fab` with one glyph and an `aria-label`, inside a positioned container.
```html
<button type="button" class="gd-btn gd-btn--primary gd-fab" aria-label="New task"><svg width="16" height="16" aria-hidden="true">…</svg></button>
```

**Variants.** None.

**States.** As a primary button (hover, press, keyboard ring).

**Behaviour.** Not drawn above 767 wide.

**Tokens.** `--gw-radius-16`, `--gw-shadow-s3`, `--gw-space-16`, `--gw-space-48`, `--gd-control-h`, plus the primary button's own.

**Accessibility.** Glyph only, so the label is mandatory.

**Provenance.** NEW, reference Mobbin Asana and Todoist (phone add button), wireframe section 11, pending library review.

## Assistant panel

**Purpose.** A chat with an assistant that can see the page: a thread of questions and answers, answers that list the tasks they mention, and plans to approve. It opens over the page from the right (a full-screen sheet on a phone) and does not block it, so cards can still be tagged. Use it for one assistant per product.

**Anatomy.** `aside.gd-ask[role=dialog][aria-modal=false] > header.gd-ask__head (agent avatar, h2.gd-ask__title, p.gd-ask__sub, actions) + .gd-ask__thread[role=log] + footer.gd-composer`. In the thread: `.gd-ask__msg--me` and `.gd-ask__msg--bruce` holding `.gd-ask__bubble`, `.gd-ask__mini` (a mentioned task with an at-tag button `.gd-ask__tag`), `.gd-ask__tags`, an `assistant-plan-card`; `.gd-ask__empty` with `.gd-ask__starters` when the thread is empty.
```html
<aside class="gd-ask" role="dialog" aria-label="Ask Bruce"><header class="gd-ask__head">…</header><div class="gd-ask__thread" role="log"><div class="gd-ask__msg gd-ask__msg--me"><div class="gd-ask__bubble">What is due this week?</div></div><div class="gd-ask__msg gd-ask__msg--bruce"><div class="gd-ask__bubble">Four tasks are due by Friday.</div></div></div><footer class="gd-composer">…</footer></aside>
```

**Variants.** Your message is an ink bubble, the assistant's a quiet ground; `gd-ask__bubble--error` is a plain one-line error.

**States.** Open or hidden; empty thread; message pending (a quiet "Looking" line).

**Behaviour.** The page owns it: open with the launcher, the command key or a card's menu; Esc or the close button closes it and returns focus; the thread keeps itself scrolled to the newest message; errors read as one plain line.

**Tokens.** `--gd-raised-bg`, `--gd-sunken-bg`, `--gd-card-bg`, `--gd-ink`, `--gd-ink-fg`, `--gd-border`, `--gd-border-strong`, `--gd-text`, `--gd-text-body`, `--gd-text-muted`, `--gw-shadow-s4`, `--gw-radius-4`, `--gw-radius-8`, `--gw-radius-12`, `--gw-radius-16`, `--gw-space-*`, `--gw-text-body-10-med`, `--gw-text-body-12-reg`, `--gw-text-body-12-med`, `--gw-text-body-14-reg`, `--gw-text-body-16-sem`, `--gw-motion-fast`. Gap: the 480px width is chosen.

**Accessibility.** A named, non-modal dialog; the thread is a polite live region; Esc closes.

**Provenance.** NEW, reference Mobbin Linear and Ferndesk (assistant panels), wireframes 8, 9 and 11, pending library review.

## Tag chip

**Purpose.** A reference to something the assistant should look at: a task, a person, a channel, or a group such as "this view". Use it in the composer and in the message that was sent.

**Anatomy.** `span.gd-tagchip[data-kind="task|person|channel|group"] > b (TSK-14 or @Name) + span (a title) + optional button.gd-tagchip__x`.
```html
<span class="gd-tagchip" data-kind="task"><b>TSK-14</b><span>Check the CTA copy</span><button type="button" class="gd-tagchip__x" aria-label="Remove tag TSK-14"><svg width="10" height="10">…</svg></button></span>
```

**Variants.** Inside your own message bubble it recolours for the ink ground.

**States.** Rest; the remove mark has hover and the keyboard ring.

**Behaviour.** The page owns it: the remove mark takes the chip out of the composer.

**Tokens.** `--gd-selected-bg`, `--gd-border-strong`, `--gd-text`, `--gd-text-muted`, `--gd-ctl-hover`, `--gd-ink-fg`, `--gw-radius-4`, `--gw-radius-8`, `--gw-space-*`, `--gw-text-body-12-med`.

**Accessibility.** The remove button names the tag. The title truncates; the key stays whole.

**Provenance.** NEW, reference Mobbin Linear (mentions), wireframe section 8, pending library review.

## Assistant composer

**Purpose.** Where you write to the assistant: tag chips above a text box, with buttons for tagging, commands and the context, and a send button. Use it at the foot of the assistant panel.

**Anatomy.** `footer.gd-composer > .gd-mention + .gd-composer__box (.gd-composer__tags, textarea.gd-composer__input, .gd-composer__tools with button.gd-composer__tool and a primary `.gd-composer__send`)`.
```html
<footer class="gd-composer"><div class="gd-composer__box"><div class="gd-composer__tags"></div><textarea class="gd-composer__input" rows="1" aria-label="Message to Bruce"></textarea><div class="gd-composer__tools"><button type="button" class="gd-composer__tool">Tag</button><button type="button" class="gd-btn gd-btn--primary gd-btn--sm gd-composer__send" aria-label="Send">…</button></div></div></footer>
```

**Variants.** None.

**States.** Box focus (the edge firms up, not a ring, R41), send disabled while empty, tool hover.

**Behaviour.** The page owns it: Enter sends, Shift and Enter adds a line, `@` opens the tag picker, `/` as the first character opens commands (which only insert text), Backspace in an empty box removes the last chip.

**Tokens.** `--gd-card-bg`, `--gd-border`, `--gd-border-strong`, `--gd-border-focus`, `--gd-text`, `--gd-text-muted`, `--gd-placeholder`, `--gd-selected-bg`, `--gd-card-pad`, `--gw-space-*`, `--gw-radius-8`, `--gw-radius-12`, `--gw-text-body-12-med`, `--gw-text-body-14-reg`, `--gw-motion-fast`.

**Accessibility.** The textarea has a label; the focused edge replaces the ring on a text field.

**Provenance.** NEW, reference Mobbin Linear and Ferndesk, wireframes 8 and 9, pending library review.

## Tag picker

**Purpose.** Choose what to tag: tasks, people or channels, plus shortcuts to tag everything on the view or the selected cards. It also lists the assistant's commands. Use it above the composer.

**Anatomy.** `.gd-mention > .gd-mention__tabs` (the library segmented control) `+ .gd-mention__list > button.gd-mention__row[role=option][aria-selected] (a bold key, text, a small hint)`, `.gd-mention__sep`, `.gd-mention__none`.
```html
<div class="gd-mention"><div class="gd-seg">…</div><div class="gd-mention__list" role="listbox"><button type="button" class="gd-mention__row" role="option" aria-selected="true"><b>TSK-14</b><span>Check the CTA copy</span><small>To do · Fri</small></button></div></div>
```

**Variants.** The command list has no tabs and its rows are a command and its description.

**States.** Row hover and selected, disabled row (`aria-disabled`, for an empty shortcut).

**Behaviour.** The page owns it: typing after `@` filters; the arrows move, Enter or Tab chooses, Esc closes the picker first and the panel second.

**Tokens.** `--gd-raised-bg`, `--gd-menu-hover`, `--gd-border`, `--gd-text`, `--gd-text-muted`, `--gd-disabled-ink`, `--gd-control-h`, `--gw-shadow-s3`, `--gw-radius-8`, `--gw-radius-12`, `--gw-space-*`, `--gw-text-body-12-reg`, `--gw-text-body-12-med`, `--gw-text-body-14-med`. Gap: the 320px height cap is chosen.

**Accessibility.** A listbox of options with `aria-selected`; the input keeps focus.

**Provenance.** NEW, reference Mobbin Linear (mentions and slash commands), wireframes 8 and 9, pending library review.

## Assistant plan card

**Purpose.** What the assistant is about to do, for you to approve: ticked steps you can untick, a badge saying whose things each step touches, and anything that leaves the app drafted but never sent from here. After approval a result card says how much changed and offers Undo. Use it for any assistant action that changes data.

**Anatomy.** `.gd-plan > .gd-plan__step (a library checkbox, `.gd-plan__label` with the step and a Badge, `.gd-plan__detail` of tag chips, or `.gd-plan__draft`) … + .gd-plan__note + .gd-plan__foot (Approve all, Tasks only, Cancel)`. `.gd-donecard` is the result: a tick, text and an Undo button.
```html
<div class="gd-plan"><div class="gd-plan__step"><label class="gd-check"><input type="checkbox" checked><span class="gd-check__box"></span></label><div><div class="gd-plan__label"><span>Move 2 tasks to Doing</span><span class="gd-badge">your tasks</span></div><div class="gd-plan__detail"><span class="gd-tagchip">…</span></div></div></div><div class="gd-plan__foot"><button type="button" class="gd-btn gd-btn--primary gd-btn--sm">Approve all</button>…</div></div>
<div class="gd-donecard"><svg>…</svg><span><b>Done.</b> 2 tasks changed.</span><button type="button" class="gd-btn gd-btn--outline gd-btn--sm">Undo</button></div>
```

**Variants.** Steps are "your tasks" (run on approval) or "visible to others" (a warn Badge; never run from here, shown as a draft beside a disabled send button and a line saying why).

**States.** Step ticked or unticked (the label strikes), approving (`aria-busy`), done, undone, cancelled.

**Behaviour.** The page owns it: only the ticked "your tasks" steps run, through the same operations as the board; the previous values are kept so Undo can put them back.

**Tokens.** `--gd-card-bg`, `--gd-sunken-bg`, `--gd-text`, `--gd-text-muted`, `--gd-border-focus`, `--gd-border-strong`, `--gw-radius-8`, `--gw-radius-12`, `--gw-space-*`, `--gw-text-body-12-reg`, `--gw-text-body-14-reg`, `--gw-text-body-14-med`.

**Accessibility.** Each checkbox has a screen-reader label naming its step; busy and result states are announced by the thread's live region.

**Provenance.** NEW, reference Mobbin Linear and Ferndesk (assistant actions), wireframe section 9, pending library review.

## Removable view

**Purpose.** A remove mark beside a saved view the person made, so it can be deleted. Built-in views have none. Use it inside `saved-views`.

**Anatomy.** `button.gd-views__x` placed right after the view's tab (a tab cannot hold a button).
```html
<div class="gd-views" role="tablist"><button type="button" class="gd-views__tab" role="tab">Design hub</button><button type="button" class="gd-views__x" aria-label="Delete view Design hub"><svg width="10" height="10">…</svg></button></div>
```

**Variants.** None.

**States.** Hover, keyboard ring.

**Behaviour.** The page deletes the view.

**Tokens.** `--gd-text-muted`, `--gd-text`, `--gd-ctl-hover`, `--gw-space-4`, `--gw-space-20`, `--gw-radius-4`, `--gw-motion-fast`.

**Accessibility.** The label names the view.

**Provenance.** NEW, reference Mobbin Aboard (saved views), pending library review. It extends `saved-views`.
