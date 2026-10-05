# Charts

Charts for heavy analytics screens, drawn by hand with no library: SVG for paths, HTML for grid lines, bars, dots and labels. A builder never computes a path. It passes arrays to `GD.charts` (`js/55-charts.js`) and gets markup back, or puts `data-gd-chart="line" data-gd-spec='{...}'` on a host element. Colour comes only from `--gw-color-chart-1/2/3` for categories (R11: three is the ceiling), `--gd-accent` for a single series, `--gd-good/warn/danger` for status, and neutrals for grid and axes. See "Palette finding" at the end: the owner needs to rule on it before heavy screens can plot more than three series. Every chart has a text alternative, a keyboard path, and a no-data state that removes the figure instead of drawing zeros. Preview frags for every key sit in `web/previews/dashboard/`.

## Palette finding

**Decision needed.** R11 caps categorical series at three: `chart-1` (primary-200), `chart-2` (violet), `chart-3` (yellow-200). Mixpanel, Amplitude and Peec routinely plot 5 to 8. Nothing was invented.

**Default behaviour.** `GD.charts` draws at most 3 categorical series. A fourth is not drawn, a footnote says "Showing 3 of N series", and the console warns once. Donuts and ranked lists fold everything past the third into a neutral "Other". Comparison series (dashed, neutral-400) and status-toned series do not use a slot.

**Opt-in, PENDING RULING.** `{palette:'extended'}` (or `GD.charts.config.palette = 'extended'`) switches to `--gd-series-x1…x8`, declared in `55-charts.css` and labelled pending. Ruling it in means changing those eight lines, nothing else.

**Recommended 8-hue ordered list, existing tokens only**

| # | Token | Hex |
|---|---|---|
| 1 | `--gw-color-chart-1` (primary-200) | #99c6ff |
| 2 | `--gw-color-chart-2` (violet) | #9784ff |
| 3 | `--gw-color-chart-3` (yellow-200) | #fcd34d |
| 4 | `--gw-color-green-500` | #16a34a |
| 5 | `--gw-color-neutral-700` | #535a61 |
| 6 | `--gw-color-yellow-500` | #d97706 |
| 7 | `--gw-color-primary-600` | #0061e0 |
| 8 | `--gw-color-neutral-500` | #878b94 |

**The check that was run.** Pairwise CIELAB distance (dE76, D65) over every pair in the list, under normal vision and under protanopia, deuteranopia and tritanopia simulated with the Machado et al. 2009 matrices at full severity. The ordering is greedy: each next colour maximises the worst-case distance to those already chosen, drawn from primary, green, yellow, red and neutral steps 200 to 800 plus chart-violet. Results, worst pair across all four vision types: first 3 = 25.8 (20.0 deutan, 16.8 protan, 16.2 tritan for the full 8); 4 = 25.8; 5 = 22.2; 6 = 16.8; 8 = 16.2. Rule of thumb: above about 20 is easy to separate, 10 to 20 is separable side by side but not at a glance, below 10 is not safe. Series 7 and 8 are in the second band. Red is left out deliberately so it keeps meaning "bad", and green-500 (series 4) is the one place status colour leaks into categories; the owner may prefer to drop it for green-600.

**Three more findings**
1. The ruled three fail 3:1 non-text contrast on a white card: chart-1 1.77, chart-2 2.97, chart-3 1.44. They are pastel by design. On black they pass. Light-theme lines in these colours rely on position, the legend and the tooltip rather than on the hue alone. Options: darker steps for lines (primary-500, violet-ish none exists, yellow-500), or keep the pastels for fills and bars only.
2. The hub's own donut does not use the palette: it uses primary-500, primary-300, neutral-850, primary-200, neutral-400, neutral-200 (`web/admin/analytics.html:1459`). The generaliser follows R11 and the hub is the inconsistency.
3. Beyond about five series, colour stops being the answer. Prefer direct labels, the legend table with per-row toggling, small multiples, or top N plus "Other".

## Chart frame

Purpose. The shell every cartesian chart sits in: header (title, description, switcher, action, export menu), legend, body at 280, 400 or 456 tall, footnote. Use it for any chart that needs a title or controls. A sparkline, breakdown bar or ranked list inside a card does not need it and renders bare.

Anatomy. `.gd-chart` (`--sm|--md|--lg`, `--card` adds the surface) > `__head` (`__titles`: `__title`, `__desc`; `__tools`: `__switch`, `__actions`, `__menu`; `__legend` of `__key` buttons) + `__body` (`__body--xy` fixes the height) + `__foot`.

```html
<div class="gd-chart gd-chart--sm gd-chart--card" data-state="ready" id="sessions">
  <header class="gd-chart__head"><div class="gd-chart__titles"><h3 class="gd-chart__title">Sessions</h3><p class="gd-chart__desc">Per day</p></div>
    <div class="gd-chart__tools"><div class="gd-chart__switch">…gd-seg…</div></div>
    <ul class="gd-chart__legend"><li><button class="gd-chart__key" data-gd-series="0" aria-pressed="true">…</button></li></ul></header>
  <div class="gd-chart__body gd-chart__body--xy">…figure…</div><p class="gd-chart__foot">Extrapolated from 9k samples</p></div>
```

Slots (trusted HTML strings in the spec): `switcher` (the `gd-seg` control), `actions`, `menu`, `footnote`. Compare entries appear as dashed legend keys.

States via `data-state`: `ready`, `loading` (ghost bars, `aria-busy`), `empty` (rounded-square badge, message, no figure), `error` (alert, "Try again"). Retry sets loading and fires `gd:chart-retry` on the root; the builder reloads and calls `GD.charts.state(host,'ready')` or `update`. Compact density scales the 280/400/456 heights by 0.8 and trims the card padding.

Tokens: `--gd-card-pad`, `--gd-gap`, `--gd-control-h`, `--gd-border`, `--gd-text`, `--gd-text-muted`, `--gd-chart-scale`.

Accessibility. Title is an `h3`; legend keys are real toggle buttons (`aria-pressed`); states use `role="status"`/`alert`. At least one series must stay visible.

Behaviour. Legend key click toggles a series, hover or focus isolates it. `GD.charts.mount|update|state|toggle|zoom`.

Provenance. Extracted: `web/admin/analytics.html:228-236`, `:1296-1313`. Slots, empty and error states: NEW (Mobbin Mixpanel, Amplitude, Peec AI), pending library review.

## Line chart

Purpose. Change over time; one to three series (more only with the extended palette, once ruled). Not for categories (use bar) or part-to-whole.

Anatomy. `.gd-xy` grid of y labels, `.gd-plot`, optional second y axis, x labels. Inside the plot: `.gd-gl` grid lines (HTML), one SVG with `preserveAspectRatio="none"` and `vector-effect: non-scaling-stroke` so the 2px line stays 2px, `.gd-dot` HTML dots (an SVG circle would be squashed), `.gd-cross`, `.gd-tip`.

Variants and options: single series (accent, 30% to 0% gradient); multi-series (chart-1/2/3); `smooth` (monotone cubic, no overshoot) or straight; comparison series (`comparison:true`, dashed neutral, takes no palette slot); forecast (`forecastFrom:i`, same hue, dotted, lower contrast); incomplete period (`incomplete:{from,label}`, hatched, "Data still arriving", noted in the tooltip); reference line (`refs:[{value,label,tone}]`); event flags (`events:[{at,label,detail}]`, buttons on the baseline with their own tooltip); brush to zoom; dual y axis (max two, each axis coloured to its series, tick counts matched so grid lines align); log scale (`scale:'log'`); `format:'compact'` gives 1.2k and 3.4M, plus `prefix`/`unit`. Y ticks use "nice" rounding. Missing values (`null`) break the line.

States: rest, hover (crosshair, dot per series, tooltip), focus-visible (same, via keyboard), series hidden, brushing, zoomed ("Reset zoom" appears), loading, empty, error.

Tokens: `--gd-series-1/2/3`, `--gd-series-compare`, `--gd-accent`, `--gd-border`, `--gd-border-strong`, `--gd-tip-line`, `--gd-warn`.

Accessibility. Plot is `role="img"` with an `aria-label` that states title, kind, range, per-series low, high and latest, events, and the arrow-key hint; it is focusable. A live region announces the active point. A visually hidden table carries all values (omitted automatically above 400 cells, or with `table:false`). Ticks are tabular and thinned to the measured width so labels never collide.

Behaviour. Pointer: crosshair snaps to the nearest point; drag selects a range and emits `gd:range {from,to,fromLabel,toLabel,labels}` (cancelable; if not cancelled the chart zooms itself). Keyboard: Left/Right, Home/End, PageUp/PageDown, Esc; Shift+arrows select a range, Enter commits. Performance: more points than pixels are decimated per bucket keeping every min and max; 8 series by 2,000 points mounts in about 16 ms and toggles in about 6 ms.

Provenance. Extracted: `web/admin/analytics.html:238-267`, `:1294-1370`. Everything past one series: NEW (Mobbin Mixpanel, Amplitude, Peec AI).

## Area chart

Purpose. Volume over time, or composition over time when stacked. Use overlaid only for two or three series that rarely cross; otherwise use lines.

Anatomy and options as line chart. `mode:'stack'` stacks in series order from the baseline with a 30% flat fill and a line on each edge, and the tooltip adds a total. Stacked areas need non-negative data (otherwise the chart falls back to overlaid and warns). Overlaid uses the gradient fill per series.

States, tokens, accessibility, behaviour: as line chart.

Provenance. NEW: not in the hub (reference Mobbin Mixpanel, Amplitude); the gradient is the hub's.

## Bar chart

Purpose. Compare values per category or period; one to three series. Not for dozens of categories (it buckets and says so in the footnote; use line or area).

Anatomy. Bars are HTML positioned from the zero line, so negatives hang below it. `.gd-cat` > `.gd-slot` > `.gd-bar` (2px radius on the outer end only). Hover shows a column band and a tooltip instead of a crosshair.

Variants: grouped (default, 2px gap); `mode:'stack'` (1px card-coloured seam, positives up and negatives down); `mode:'waterfall'` (`items:[{label,value,total?}]`: increase green, decrease red, total muted, dashed connectors; the legend names the three); `diverging:true` (positive accent, negative neutral). Axis ticks, formats, thinning as line chart.

Tokens: `--gd-series-*`, `--gd-accent/good/danger`, `--gd-hover-bg`, `--gd-card-bg`.

Accessibility and behaviour as line chart (arrows move between categories). The hidden table for a waterfall lists change and running total.

Provenance. Bar geometry extracted: `web/admin/analytics.html:268-279`; vertical, grouped, stacked, waterfall, diverging are NEW (Mobbin Zoho "Revenue breakdown", Mixpanel).

## Horizontal bar chart

Purpose. Ranked list: label, bar, value, share. Use for top pages, top keywords, any "which is biggest".

Anatomy. `ol.gd-hbar` > `li` > `.gd-hbar__row` (`label`, `track` > `bar`, `val`, `share`). Bars are 10px (8 compact) with the trailing corners rounded. Rows become `<a>` when an item has `href`.

Options: `top:n` folds the rest into a neutral "Other"; `share:false`; `diverging` (zero axis at 50%); `tone` per item; sorted descending unless `sort:false`.

States: rest, link row hover (surface and edge), focus-visible, empty, loading, error.

Accessibility. A native ordered list: the text of every row is the alternative, so it carries `aria-label` rather than `role="img"` (which would hide the rows). Bars are decorative.

Provenance. Extracted: `web/admin/analytics.html:268-279`, `:1385`. Share column, diverging, link rows: NEW.

## Donut chart

Purpose. Part-to-whole with up to three categories plus "Other". More slices than that read badly in any palette; use a ranked list.

Anatomy. `.gd-donut` > `figure.gd-donut__fig` (SVG circles with `stroke-dasharray`, 2px gaps, centre total) + `ul.gd-donut__legend` (swatch, name, value, share). Compact density scales the ring from 160 to 128.

Options: items beyond three untoned are folded into "Other" in neutral; `tone` gives status colours; `totalLabel`.

States: rest, hover or focus on a slice or legend row (others dim to 30%, the centre shows that slice), loading, empty, error.

Accessibility. The figure is `role="img"` with every slice and percentage in its label; legend rows are focusable and mirror the hover.

Provenance. Extracted: `web/admin/analytics.html:330-345`, `:1445-1475`. Palette follows R11 (the hub does not; see finding 2).

## Breakdown bar

Purpose. One horizontal bar split into proportions, read at a glance: a split, a status mix. Use when there are two to four parts and no axis is needed.

Anatomy. `figure.gd-brk` > `.gd-brk__bar` (12px pill, 2px gaps, flex weights) + `ul.gd-brk__key` (percent, label). `.gd-brk--lg` is 16px.

Variants: two segments accent plus neutral (the hub); three categorical segments; status tones. Segment tones are set per segment.

Accessibility. The bar is `role="img"` with every value and percentage; the key repeats them as text.

Provenance. Extracted: `web/admin/analytics.html:301-305`, `:1395-1405`. Three or more segments: NEW (Mobbin AirOps).

## Sparkline

Purpose. A trend inside a table cell, stat card or list row. No axes, no tooltip. Not for reading values.

Anatomy. `span.gd-spark` (80px wide, `--gd-control-h` minus 12 tall; `--lg` 160) with an SVG line (1.5px, non-scaling) and an HTML last-point dot. Options: `tone` (accent, good, danger, neutral), `fill`, `smooth`, `size`.

Accessibility. `role="img"` with a label giving first, last, low and high. It is inline and non-interactive, so it never takes focus.

Provenance. NEW: not in the hub (Mobbin Fresha, Mixpanel).

## Heatmap

Purpose. Intensity across two dimensions: day by hour, cohort by week, or a GitHub-style calendar of activity. One quantity only.

Anatomy. `.gd-heat` > scrollable `.gd-heat__grid` (`role="grid"`, rows of `role="gridcell"` cells) + key (Less to More) + tooltip. Five steps of one hue, `--gd-seq-1…5`: darker means more on light, brighter means more on dark, so "more" always stands out from the ground. Zero and missing are different: empty is the sunken fill with a hairline, missing is `no data` in the label. `layout:'calendar'` runs weeks left to right in square cells with month labels; weeks start Monday (`weekStart`). Bins are linear (`bins:'quantile'` for skewed data).

States: rest, hover (2px ring), focus-visible (a 1px outline, black on light and white on dark, so it reads on every step of the scale), empty, loading, error.

Accessibility. It is a real grid, so it is not `role="img"`: every cell has its own label ("Tue, 14:00: 63 sessions"). One cell is in the tab order; arrows move in two dimensions, Home/End jump to row ends, Esc hides the tip. Colour is never the only carrier: the value is in the label and tooltip.

Provenance. NEW: not in the hub (Mobbin Mixpanel retention, GitHub contributions).

## Funnel

Purpose. Step-to-step conversion. Horizontal for many steps or long labels; vertical for three to six steps where shape matters. A funnel table can be added for exact counts.

Anatomy. `.gd-funnel` > ordered list. Horizontal: label, track with fill, count, percent of first step; between rows "63% continue, 870 left (37% drop-off)". Vertical (`layout:'vertical'`): columns, a hatched ghost of the previous step behind each fill, then count, label, continue and left. An abandonment row ("Abandoned before Paid") closes it. `table:true` adds step, count, completion, drop-off, in the data table's look: no header fill, a small uppercase muted header over a strong rule, a hairline under every row, hover `--gd-row-hover`, first column in `--gd-text`.

Accessibility. A list whose text carries every figure; fills are decorative.

Provenance. NEW: not in the hub (Mobbin Calendly horizontal, Google Analytics vertical steps).

## Chart tooltip

Purpose. The cursor tooltip every chart uses: a header, a row per series, an optional total, an optional note. Not for explaining a control; use the shared tooltip for that.

Anatomy. `.gd-tip` > `__h` (bold head, muted `__n` note), `__r` rows (swatch, `__k`, `__v` tabular), `__t` total after a dashed rule. `GD.charts.tipHTML({head,note,rows,total})` builds it; `.gd-tip--static` places it in flow. The surface is the sunken fill with a 1px `--gd-tip-line` edge and shadow S2, 12px text (the hub used 10).

Behaviour. It flips to the other side of the cursor near the edge and never takes pointer events. `[data-gd-tip]` plus `data-gd-tip-body` on any element in a `[data-gd-tipbox]` gives it a tooltip on hover and focus.

Accessibility. It repeats what the live region announces; it is never the only place a value appears.

Provenance. Extracted: `web/admin/analytics.html:256-267`.

## Legend table

Purpose. A table under a chart, one row per series: checkbox, colour dot, name, value columns (total, average, latest by default). Ticking toggles the series. Use when there are more than three series or exact values matter.

Anatomy. `table.gd-ltable[data-gd-for="#chart"]` > rows with `input[type=checkbox][data-gd-series]` inside `.gd-check` (Actions author), `th` name with `.gd-sw`, `td` values. Row classes are its own, but the look is the data table's: no header fill, a small uppercase muted header over a strong rule, a hairline under every row, hover `--gd-row-hover`, 12px medium cells. `legend:'table'` on a chart renders it below and wires it.

States: rest, row hover (also isolates the series on the chart), hidden (`data-off`, muted, dimmed dot), focus-visible on the checkbox.

Accessibility. The checkbox is labelled "Show <series>"; names are row headers. The last visible series cannot be unticked; the box reverts.

Provenance. NEW: not in the hub (Mobbin Amplitude, Substack).

## Uptime bar

Purpose. Status over a run of days or hours: a strip of segments, green, amber, red, grey for no data, with the percentage.

Anatomy. `figure.gd-uptime` > head (name, percentage), `.gd-uptime__bar` of `.gd-uptime__seg[data-st]`, foot (start, end labels), tooltip. Percentage is periods not down over periods with data, or `percent` when supplied.

States: rest, hover (ring), keyboard (the bar is focusable; Left/Right step, Home/End, Esc hides).

Accessibility. `role="img"` with an overall label; the tooltip names the status in words, so colour is never the only signal.

Provenance. NEW: not in the hub (Mobbin Better Stack, OpenAI status).
