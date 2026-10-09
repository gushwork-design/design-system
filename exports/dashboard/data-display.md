# Cards and data display

Everything that holds or labels a figure, a status or a person on a dashboard: cards, KPI cards, badges, deltas, progress, legends, property lists, activity feeds, checklists, avatars, tags and the status-page set. CSS is `css/50-data.css`; behaviour is `js/50-data.js` (`data-gd-*` hooks, delegated on `document`, safe inside shadow roots). Every colour comes from an alias in `00-base.css` or the `--gd-tone-*` pairs declared at the top of `50-data.css`; no component hard-codes a theme. Heights and padding flow from `--gd-control-h`, `--gd-row-h`, `--gd-cell-px`, `--gd-gap`, `--gd-card-pad`. Light badge labels follow R18 (`/600` step on a `/25` fill); dark pairs `{Colour}/Alpha/10` with a `/300` label.

Rules that apply to the whole set: a figure that can change carries `gd-num` (tabular). A value that cannot be read shows a dash, never a zero (R20). Colour carries meaning; a green badge on a falling metric is a bug. Direction and meaning are independent (a falling cost is down and good).

## Card

**Purpose.** The container for a section of a screen: a chart, a table, a form group. Use it to group related content under one title. Do not nest a card inside a card; use a bordered well or the key value list inside.

**Anatomy.** `.gd-card` > `.gd-card__head` (`__titles` > `__title`, `__desc`; `__actions`), `.gd-card__body`, optional `.gd-card__foot`. `__actions` sit at the top right of the head (inside the card padding, in compact too); they drop under the title only when the card is too narrow for both.
```html
<section class="gd-card"><div class="gd-card__head"><div class="gd-card__titles"><h3 class="gd-card__title">Lead sources</h3><p class="gd-card__desc">Last 30 days</p></div><div class="gd-card__actions">…</div></div><div class="gd-card__body">…</div></section>
```
**Variants.** `--flush` (head and body padded individually, so `__body--bleed` lets a table touch the edges); `--interactive` (the whole card is a link or a focusable region); collapsible: the title becomes `<button class="gd-card__toggle" data-gd-toggle aria-expanded aria-controls>` with a chevron, and the body carries the id and `hidden` when closed.

**States.** Rest. Hover and active only on `--interactive` (edge darkens to `--gd-border-strong` plus `--gw-shadow-s3`; the edge carries the separation in dark where the shadow is invisible). Selected (`aria-selected` or `aria-current`): 1px `--gd-ink` edge. Disabled (`aria-disabled`): 50%. Loading (`aria-busy`): body at 55%; put the Feedback ghost blocks in the body.

**Tokens.** `--gd-card-bg`, `--gd-border`, `--gd-border-strong`, `--gd-text`, `--gd-text-muted`, `--gd-card-pad`, `--gd-gap`, radius 16.

**Accessibility.** Heading level is the consumer's. An interactive card needs `tabindex="0"` (or be an `<a>`) and shows the keyboard-only ring. The toggle is a real button; Enter and Space work.

**Behaviour.** `data-gd-toggle` flips `aria-expanded` and the target's `hidden`. **Provenance.** extracted: `web/admin/analytics.html:228-236`, `web/cards.css:99-113`; collapsible is NEW (Mobbin Squarespace), pending library review.

## Stat card

**Purpose.** One KPI: label, big number, change, optional sparkline or progress. Use for 3 to 6 headline figures at the top of a screen. Use a metric strip when the figures also switch a chart.

**Anatomy.** `.gd-stat-card` > `__label` (status dot, `__name`, optional `__hint`) and `__body` (`__row` > `__value`, `__spark`; `__meta` > delta pill, `__compare`; optional progress bar). `__hint` is a slot for `.gd-hint` (owned by Inputs): the definition of the metric. `__compare` is the comparison line ("vs previous period"). The label dot is a series key, the one place besides a badge or legend a dot appears.

**Variants.** Plain, with sparkline, with progress, unavailable (`data-state="unavailable"`: value is a dash and the compare line says why). As `<button>` or `<a>` it is interactive (hover, `aria-pressed` selected).

**Tokens.** Padding is `--gd-card-pad` minus 4 (16 comfortable, the hub metric card; 12 compact, the hub stat card); min height `--gd-row-h` x 2 + 12; value is 500 28px display, no token (R15), kept at 28 in compact. **Accessibility.** Give the delta pill its screen-reader text (see Delta pill); put the spark's meaning in `aria-label` or hide it with `aria-hidden`. **Provenance.** extracted: `analytics.html:198-216`; comparison and hint slots NEW.

**Phone.** Tiles pair up two to a row. The sparkline drops under the figure, and a long name wraps to two lines instead of truncating.

## Metric strip

**Purpose.** A row of KPIs that are also tabs: selecting one changes the chart below. Use when 3 to 6 metrics share one chart area. Do not use for unrelated KPIs (use stat cards).

**Anatomy.** `.gd-metric-strip[role=tablist][data-gd-metric-strip]` > `button.gd-metric-strip__item[role=tab]` (`__label`, `__value`, `__meta` with a small delta). The chart is a `role=tabpanel`; items point at it with `aria-controls`.

**States.** Rest, hover, selected (`aria-selected`: sunken fill plus 2px `--gd-ink` underline), disabled (`aria-disabled`). Overflows horizontally below 144px per item.

**Behaviour.** Click, Left/Right (wrapping), Home, End select and move focus; roving `tabindex`; fires `gd:metric-select {id}`; shows and hides panels named by `aria-controls`. **Accessibility.** Standard tabs pattern. **Provenance.** NEW: reference Mobbin Squarespace, Fresha; pending library review.

**Phone.** The strip scrolls sideways and snaps; each metric is about 44% wide so the next one peeks in.

## Delta pill

**Purpose.** The change in a figure against a comparison, as arrow and value. Use on KPI cards and in table cells. Class is `.gd-delta`.

**Anatomy.** `.gd-delta.gd-delta--good|--bad|--neutral` > `__arrow[data-dir=up|down|flat]` + `__value`; optional `.gd-delta__vs` ("vs last 30 days") placed after it, 4px (`--gw-space-4`) from the pill. **Direction and tone are independent:** `data-dir` is what happened, the modifier is whether that is good. Cost per lead down 3.2% is `data-dir="down"` with `--good`.

**Variants.** Default 20h (KPI card); `--sm` 16h at 12px (table cell, fits compact rows); `--arrow` arrow only, with the figure beside it or in `gd-sr` text; `--ghost` no tint, coloured text only for dense tables.

**Accessibility.** Colour and arrow are not the only carrier: add `<span class="gd-sr">Up 12.4 percent, better than last period</span>`. Tokens: `--gd-tone-good|bad|neutral-bg/-fg`. **Provenance.** NEW: the hub prints the change as plain text; reference Mobbin Fresha, Mixpanel; pending library review.

## Badge

**Purpose.** A status or label pill. The spec of record is the shared Badge doc (`foundation/shared-components.md`); this entry is the dashboard CSS and a pointer. When the hub and the doc disagree, R18 decides.

**Anatomy.** `.gd-badge` + one tone: `--neutral` (default), `--good`, `--warn`, `--bad`, `--info`, `--solid` (Black, high emphasis), `--orange`, `--violet` (categorical only, see Tag). Optional leading `.gd-status-dot` or 12px icon, trailing arrow. `--md` is 24h, radius 8, 12px semibold; default is 20h, radius 4, 12px medium. Badges do not follow density.

**Tokens.** `--gd-tone-<tone>-bg/-fg`: light `/25` fill and `/600` label, dark `Alpha/10` fill and `/300` label. **Findings.** The hub's `.ul-badge--ok` uses a `green-500` label and `.ul-badge--bad` an alpha-10 fill, both against R18; `.bdg--on` in `cards.css` uses `green-500`. This set follows R18. The dark pairs are not yet contrast-measured (open in R18). **Provenance.** extracted: `analytics.html:384-394`, `cards.css:42-53`.

## Status dot

**Purpose.** An 8px key that says which series or state a label belongs to. Only inside a badge or a legend (and the stat card label, which is a series key). Never bare on a row; use a badge. **Anatomy.** `.gd-status-dot` + `--good|--warn|--bad|--info|--neutral`; `--live` pulses (off under reduced motion). A legend key sets `style="--gd-dot:…"`. Decorative: `aria-hidden`; the adjacent text carries the meaning. **Provenance.** extracted: `analytics.html:204-205`.

## Progress bar

**Purpose.** How far a value is toward a target. Use for budgets, quotas, completion. **Anatomy.** `.gd-progress-bar[role=progressbar][aria-valuenow]` with `style="--gd-pct:62"` and one `<i>` fill. `--sm` is 2px (in a cell), default 4px (the hub). Tones `--warn`, `--bad`, `--info`, `--neutral`; default green. **Over target:** `data-state="over"` makes the fill full and red; add `.gd-progress-bar__target` with `--gd-target:85` for a tick. The optional `.gd-progress-bar-wrap` adds a label and value row. Track is `--gd-track`. **Behaviour.** The consumer updates `--gd-pct` and `aria-valuenow`. **Provenance.** extracted: `analytics.html:217-218`; over-target and tick NEW.

## Ring

**Purpose.** One value as a circle, for completion or a score. Use when a bar is too wide; not for part-of-whole (that is a chart). **Anatomy.** `.gd-ring` (`--sm` 32, default 48, `--lg` 96) > svg with `__track` and `__fill` circles (`pathLength="100"`, `r=15.9155`) + `__label`; set `style="--gd-pct:72"`. Tones as progress bar. Same ARIA as progress bar. **Provenance.** extracted geometry from `analytics.html:331-337`.

## Legend

**Purpose.** Names the series in a chart: swatch, label, value. Clickable, it hides and shows a series. **Anatomy.** `.gd-legend[data-gd-legend]` > `button.gd-legend__item[aria-pressed][data-key]` (`__swatch`, `__label`, `__value`); a static legend uses `div` items. `--inline` lays out in a row. Swatch colour: `--gd-swatch`, or `__swatch--1|2|3` for the chart palette (R11 ceiling is three series; a fourth is a finding, not a colour).

**States.** On, hover, off (hollow swatch, struck label), disabled. **Behaviour.** Click toggles `aria-pressed` and fires `gd:legend-toggle {key, on}` on the list; the chart listens. The last visible series cannot be hidden. **Accessibility.** Buttons with `aria-pressed`; group labelled. **Provenance.** extracted: `analytics.html:338-342`; toggle NEW.

## Key value list

**Purpose.** A read-only properties panel: label on the left, value on the right. Use on detail pages and drawers. For editing use form fields; for many records use a table. **Anatomy.** `<dl class="gd-key-value-list">` > `__row` > `dt.__key`, `dd.__value` (text, badge, avatar and name, link, tags). Missing value: `<span class="gd-key-value-list__empty">—</span>`. Variants `--ruled` (hairlines) and `--stacked` (label above value, for narrow panels). Row height is `--gd-control-h`. **Provenance.** NEW: reference Mobbin Twenty, Rox; pending library review.

## Activity timeline

**Purpose.** A chronological feed of events on a record, grouped by date. **Anatomy.** `ol.gd-timeline` > `li.gd-timeline__group` (`__date`, inner list) > `li.gd-timeline__item[--good|--warn|--bad|--info]` > `__node` (24px rounded square with icon or avatar), `__body` (actor in bold; optional `__comment`), `<time class="gd-timeline__time">` right-aligned relative time with the absolute time in `datetime` and `title`.

**Incident variant** (`.gd-timeline--incident`): the node is the actor's small avatar, or a status icon for system events; each event may carry an expandable comment: `button.gd-timeline__more[data-gd-toggle]` + `p.gd-timeline__comment[hidden]`. **Behaviour.** The comment toggle is the shared disclosure. **Provenance.** NEW: reference Mobbin Twenty, Zoho; incident variant Better Stack; pending library review.

## Checklist

**Purpose.** Getting-started steps with a progress count. Use for onboarding and setup; not for task management. **Anatomy.** `.gd-checklist` > `__head` (`__title`, `__count[data-gd-checklist-count]`, a progress bar) and `ul.__steps` > `li.__step[data-state=done|current|todo]` > `button.__toggle[data-gd-toggle data-gd-accordion]` (`__mark`, title, chevron) and `__detail[hidden]` (copy plus an action; a `data-gd-step-done` button completes the step).

**States.** Todo (empty ring), current (ink ring), done (filled mark, muted title), hover on the toggle. **Behaviour.** One step open at a time; completing a step opens the next and updates "2 of 5 complete" and the bar. **Accessibility.** Toggle is a button with `aria-expanded`; the mark is decorative, state is in the title's text or `gd-sr`. **Provenance.** NEW: reference Mobbin Squarespace, HoneyBook, Vanta; pending library review.

## Avatar

**Purpose.** A person or account mark. The hub's generated mark: a rounded square with a 3x3 dot profile chosen by hashing a seed (email), the same on every device. **Anatomy.** `.gd-avatar` (24 `--sm`, 32 default, 40 `--lg`) containing the svg, or `data-gd-avatar="seed"` and JS renders it. Level: `--team` (primary-300), `--admin` and `--owner` (black in light; neutral-800 in dark, an added alias `--gd-avatar-admin`, because black vanishes on the dark ground). Team avatars take one of five tones, all at the `-300` step: blue (default), red, yellow, orange, green. `data-tone="red|yellow|orange|green"` sets it; with `data-gd-avatar` outside a group JS picks a stable tone from the seed. Admin and owner stay black. `--initials` is the fallback when no seed exists. Radius is 20% of the size. **Accessibility.** `role=img` with the person's name. **Provenance.** extracted: `web/shell.js:407-455`; initials NEW.

## Avatar group

**Purpose.** Several people at once, stacked with an overflow count. **Anatomy.** `.gd-avatar-group` (`--sm`, `--lg`) > avatars + `.gd-avatar-group__more` ("+3"). Overlap is 25%, with a 2px ring in the card colour. Show at most 4 and count the rest. Neighbours take the next tone in turn (blue, red, yellow, orange, green) so they read as different people; a `data-tone` on one avatar overrides. **Accessibility.** `role=group` with a label giving the total. **Provenance.** NEW; pending library review.

## Tag

**Purpose.** A user-facing category or filter chip, optionally removable. Not status (that is a badge). **Anatomy.** `.gd-tag` (`__label`, optional `button.__remove[data-gd-tag-remove][aria-label="Remove X"]`). Height is `--gd-control-h` minus 8 (28 comfortable, 20 compact). Outlined by default; add a tone for a tinted category chip. As `<button>` it is a filter: hover, `aria-pressed` selected (ink fill), disabled.

**Categorical hues.** Tones `--info` (blue), `--orange`, `--violet`, `--good`, `--warn`, `--bad`, `--neutral`, plus the solid black badge. **Finding: the token set supports 7 tinted hues, but only 4 are free of status meaning (blue, orange, violet, neutral); green, yellow and red mean good, warn and bad and collide with signal use. Orange and yellow sit close, and orange and red are close at 12px. A heavy analytics screen wanting 8 or more distinguishable category colours (Peec AI shows about 10) cannot be served by the tokens; do not invent colours. Violet has no ramp (one token), so its tint and light label are derived with `color-mix` from `--gw-color-chart-violet` (label contrast about 6.9:1 light).** Owner decision needed: add a violet ramp and more hues, or cap categories at 7 and use the neutral tag for the rest.

**Behaviour.** The remove button deletes the tag and fires cancelable `gd:tag-remove {label}` first. **Provenance.** NEW: reference Mobbin Peec AI; pending library review.

## Agent status card

**Purpose.** One agent on a team overview: who it is, how it is doing, what it is doing now and whether it wants something from you. Use it where each member of a small team (about three to eight) needs a glance and a way in. Not for people (avatar and name in a table), not for a metric (stat card), not for a list of records (data table).

**Anatomy.** `a.gd-agent-status` (the whole card is the link to that agent's page; it has no variants) > `__top` (a large `gd-avatar`, `__who` with the name in `b` and the role in `small`, and a state `gd-badge`), `__now` (one or two sentences, clamped to three lines, never an empty box) and `__foot` (a warn badge saying how many things it wants from you, or a quiet "Nothing needed from you"). Lay the cards out in a `gd-grid`, `gd-span-4` each.
```html
<a class="gd-agent-status" href="#bruce"><span class="gd-agent-status__top"><span class="gd-avatar gd-avatar--team gd-avatar--lg" data-gd-avatar="Bruce" role="img" aria-label="Bruce"></span><span class="gd-agent-status__who"><b>Bruce</b><small>Lead, front door</small></span><span class="gd-badge gd-badge--warn">Worth a look</span></span><span class="gd-agent-status__now">Last asked 3 h ago by Punit.</span><span class="gd-agent-status__foot"><span class="gd-badge gd-badge--warn">1 thing for you</span></span></a>
```
**State.** The badge carries the state in words and tone (good "Running well", warn "Worth a look", bad "Needs attention", neutral "Cannot tell yet"); colour never stands alone. Hover darkens the edge and lifts the shadow, as an interactive card does; the keyboard ring is the library's.

**Tokens.** `--gd-card-bg`, `--gd-border`, `--gd-border-strong`, `--gd-card-pad`, `--gd-gap`, `--gd-text`, `--gd-text-body`, `--gd-text-muted`, `--gw-text-body-16-sem`, radius 16. **Accessibility.** One link per card; the avatar has a label; the badge text is real text. **Provenance.** NEW: drawn for the hub's Agents page (9 Oct 2026), composed from the library's card edge, avatar and badge; pending library review.

## Message thread

**Purpose.** A conversation read back the way Slack shows it: who said what and when, in order. Use it where a person reads a DM or a thread (the hub's Bruce drawer). Not for composing (the assistant panel has the composer), not for a chat with bubbles (the assistant panel's thread), and not for a log of events (activity timeline).

**Anatomy.** `.gd-thread[role=log]` > `.gd-thread__day` (a pill on a hairline, one per day) and `.gd-msg` rows: a `gd-avatar`, then `.gd-msg__main` with `.gd-msg__head` (the name in `b`, a `gd-badge gd-badge--neutral` "Agent" for a bot, the time in `time`, an optional `.gd-msg__note` such as "in a thread"), `.gd-msg__text` and `.gd-msg__files` (library tags). A message from the same person straight after one is `.gd-msg--cont`: no picture or name, the time shows on hover (`.gd-msg__time-only`).
```html
<div class="gd-thread" role="log"><div class="gd-thread__day"><span>Thu, 8 Oct</span></div><div class="gd-msg"><span class="gd-avatar gd-avatar--team" data-gd-avatar="Bruce" role="img" aria-label="Bruce"></span><div class="gd-msg__main"><div class="gd-msg__head"><b>Bruce</b><span class="gd-badge gd-badge--neutral">Agent</span><time>5:42 PM</time></div><div class="gd-msg__text">Your mock is up on staging.</div></div></div></div>
```
**States.** Rest; hover tints the row (`--gd-row-hover`). Everyone is on the left; there are no bubbles. **Tokens.** `--gd-row-hover`, `--gd-border`, `--gd-border-strong`, `--gd-text`, `--gd-text-muted`, `--gw-text-body-14-sem/-reg`, `--gw-text-body-12-med/-reg`, radius 8. **Accessibility.** `role="log"`; the time is a `time` element; the avatar carries a label. **Provenance.** NEW: drawn for the hub's Bruce drawer (9 Oct 2026) after Utsav asked for it to look like Slack; composed from the library's avatar, badge and tag; pending library review.

## Status banner

**Purpose.** The headline state of a system: "All systems operational" with icon, a live badge and the period selector. **Anatomy.** `.gd-status-banner[data-status=operational|degraded|outage|maintenance]` > `.gd-status-icon`, `__text` (`__title` with live badge, `__sub`), `__period` (slot for a select from Inputs). A non-operational state tints the whole banner with the status pair. Icons (Phosphor fill): check-circle, warning, x-circle, wrench; always with the text, never colour alone. **Provenance.** NEW: reference Mobbin OpenAI status, Twingate, incident.io, Better Stack; pending library review.

## Status list

**Purpose.** Components or services with a status each, expandable for detail (uptime, last incident). **Anatomy.** `ul.gd-status-list` > `li[data-status]` > `button.__head[data-gd-toggle][aria-expanded][aria-controls]` (status icon, `__name`, `__meta`, `__state`, chevron) and `__panel[hidden]`. A row with nothing to show is `disabled` and hides the chevron. States: rest, hover, expanded, disabled. Row height is `--gd-row-h`. **Behaviour.** shared disclosure. **Provenance.** NEW: reference Mobbin OpenAI platform, incident.io, Better Stack, Vapi; pending library review.

## Incident row

**Purpose.** One entry in an incident history: title, status, duration, relative time. **Anatomy.** `ul.gd-incident-list` > `li.gd-incident-row[data-status][data-state=ongoing|resolved]` > status icon, `__main` (`__title`, `__sub`), a badge ("Investigating", "Resolved"), `__duration`, `<time class="__time">`. With a link title add `--link` for hover. An ongoing incident shows its duration in the status colour; resolved is muted and its badge is green. Columns are fixed so rows align. **Provenance.** NEW; same references as Status list.

**Phone.** Two columns: the status icon, then title, subtitle, badge, duration and time stacked under it.

## Issue summary

**Purpose.** A compact strip of counters: "Critical 0, Warning 0, MTTR —". **Anatomy.** `ul.gd-issue-summary` > `li.__item[data-severity=critical|warning|mttr]` (icon, `__label`, `__value`). `data-count="0"` greys the icon. A counter that cannot be read is `data-state="unavailable"`: the value is a dash with `gd-sr` text "unavailable", never a zero (R20); a true zero shows 0. **Provenance.** NEW; reference Mobbin incident.io, Better Stack; pending library review.
