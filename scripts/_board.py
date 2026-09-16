#!/usr/bin/env python3
"""Render BACKLOG.md as preview/board.html — the task board and shipped timeline.

Reads BACKLOG.md on stdin, writes HTML to stdout. Never run directly;
`scripts/board.sh` is the entry point and holds the usage notes.

WHY THIS ONE IS BACKWARDS FROM THE REST. Every other generator here derives from something
machine-truthful — `_releases.sh` reads the version field out of plugin.json at each commit,
so the changelog cannot lie. A backlog has no such source: priorities are human input, so
BACKLOG.md *is* the source and this script only renders it. The one-directional flow is what
keeps the file and the board from disagreeing; there is no writing back.

STATE IS THE SECTION, not a field. `## P0` / `## Waiting on you` / `## Completed` are the
states, and a card's position in the file is its priority. Nothing here reads a status key,
because a status key next to a section heading is two truths waiting to diverge.

NO STATE IS CARRIED BY COLOUR ALONE. Utsav's editor theme is dark-daltonized, so every
status that has a colour also has a word: an overdue card says "6 days", a flagged card says
"needs detail", a priority pill says "P0". Removing all colour from this page should lose
emphasis and no information. Check that before adding a swatch.

LIGHT THEME ONLY, matching preview/changelog-sheet.html by the same instruction. There is no
prefers-color-scheme block. Do not add one without asking.

Every value in the CSS is a token from foundation/tokens.css. Where a rule is new but its
values are not, it is marked ADDED — reported per foundation/new-component-notice.md.
"""

import datetime as dt
import html
import os
import re
import sys

# The board's states, in the order they appear on the page. Anything else under a `##` in
# BACKLOG.md is prose — the file explains its own format in two such sections, and the
# `- [ ]` line inside its fenced example must not be mistaken for a real card.
QUEUE = "Waiting on you"
COLUMNS = ["P0", "P1", "P2", "Icebox"]
DONE = "Completed"
SECTIONS = [QUEUE] + COLUMNS + [DONE]

# Keys a card may carry. Anything else on an indented line renders as a plain note rather
# than being dropped, so a typo is visible instead of silent.
KEYS = ["surface", "constraint", "done", "added", "since", "options", "rec", "shipped",
        "blocked", "needs"]

# A card in an open column is only pickable unattended if it says where to work and what
# finished looks like. Missing either, it is flagged and skipped rather than guessed at.
REQUIRED = ["surface", "done"]

TODAY = dt.date.today()


# ── parse ─────────────────────────────────────────────────────────────────────────────
CARD = re.compile(r"^-\s+\[[ xX?]\]\s+(.+?)\s*$")
KEYLINE = re.compile(r"^([a-z][a-z-]*):\s*(.*)$")
# `- [x] 2026-08-15 · Title` — the date leads a completed card and is what the timeline
# groups on. The separator may be ·, - or em dash; all three get typed by hand.
DATED = re.compile(r"^(\d{4}-\d{2}-\d{2})\s*[·\-—]?\s*(.*)$")


def parse(text):
    """BACKLOG.md -> {section: [card]}. Cards outside a known section are ignored."""
    out = {name: [] for name in SECTIONS}
    section, card, fenced = None, None, False

    for raw in text.split("\n"):
        line = raw.rstrip()

        # Fenced blocks hold the format example, which contains a card-shaped line.
        if line.lstrip().startswith("```"):
            fenced = not fenced
            continue
        if fenced:
            continue

        head = re.match(r"^##\s+(.+?)\s*$", line)
        if head:
            name = head.group(1).strip()
            section = name if name in out else None
            card = None
            continue

        if section is None:
            continue

        m = CARD.match(line)
        if m:
            title = m.group(1).strip()
            date = ""
            d = DATED.match(title)
            if d:
                date, title = d.group(1), d.group(2).strip()
            card = dict(title=title, date=date, keys={}, notes=[])
            out[section].append(card)
            continue

        # Continuation lines are indented under their card.
        if card is not None and raw[:1] in (" ", "\t") and line.strip():
            body = line.strip()
            k = KEYLINE.match(body)
            if k and k.group(1) in KEYS:
                card["keys"][k.group(1)] = k.group(2).strip()
            else:
                card["notes"].append(body)
            continue

        if not line.strip():
            card = None

    return out


def age_days(card, *keys):
    """Whole days since the first of `keys` that holds a date. None if undated."""
    for k in keys:
        v = card["keys"].get(k) or (card["date"] if k == "date" else "")
        if not v:
            continue
        try:
            return (TODAY - dt.date.fromisoformat(v[:10])).days
        except ValueError:
            continue
    return None


def age_label(days):
    """Words first — this is the accessible half of every status on the page."""
    if days is None:
        return "undated"
    if days <= 0:
        return "today"
    if days == 1:
        return "1 day"
    return "%d days" % days


def flags(card, section):
    """Non-colour status words attached to a card."""
    out = []
    if section in COLUMNS and section != "Icebox":
        missing = [k for k in REQUIRED if not card["keys"].get(k)]
        if missing:
            out.append("needs detail")
    if card["keys"].get("blocked"):
        out.append("blocked")
    return out


# ── page ────────────────────────────────────────────────────────────────────────────────
# LAYOUT taken from a Taskk screenshot Utsav supplied, 27 Aug 2026: breadcrumb over a page
# title over a toolbar (tabs · divider · actions), then columns as tinted SURFACES carrying an
# accent bar, a count and a per-column add, with four-tier cards and a stat footer, scrolling
# horizontally so the last column is visibly cut off.
#
# STRUCTURE AND CONTENT ONLY. Per the ruling in the dashboard skill, a supplied reference does
# not define visual treatment: every colour, type style, radius and spacing below is a Gushwork
# token, and the components are the measured v2 set. The reference's own palette, type and
# card chrome were not imported.
#
# WHAT THE REFERENCE HAS THAT THIS DELIBERATELY DOES NOT. `Import`, `+ New Board` and the
# per-column `⋮` are drawn there and do nothing here, because a static file generated from a
# markdown source cannot create a board or import anything. Drawing an affordance whose
# function does not exist is the trap this repo has shipped four times. Every control below is
# wired: the tabs switch views, the filter filters, the sort sorts, and `+ Add new` copies a
# card template for that lane to the clipboard — which is genuinely the next thing you do.
STALE, OVERDUE = 3, 7

LANES = [QUEUE] + COLUMNS

# The accent bar on each column header. This is a RAMP, not decoration: it reads left to right
# as descending claim on your attention, and it is redundant with the lane name beside it, so
# no information lives in the colour. `Waiting on you` is neutral/black because it is a state
# that wants you; P0-P2 walk down the primary steps because priority is data, and blue carries
# data on this surface; Icebox is neutral/200 because it is parked.
LANE_ACCENT = {
    QUEUE:    "var(--gw-color-black)",
    "P0":     "var(--gw-color-primary-500)",
    "P1":     "var(--gw-color-primary-400)",
    "P2":     "var(--gw-color-primary-300)",
    "Icebox": "var(--gw-color-neutral-300)",
}

# What "complete" means differs by lane. An open card is pickable when it says where the work
# is, what rule holds, and what finished looks like. A card in the decision queue is answerable
# when it says where to look, what Claude would do, and since when it has been waiting.
COMPLETE_KEYS = {QUEUE: ["options", "rec", "since"]}
COMPLETE_DEFAULT = ["surface", "constraint", "done"]

BUILD_COMPONENTS = ["badge", "card-shell", "empty-state", "input", "page-header",
                    "section-header", "tab-group", "tab-item", "table-cell", "table-row"]

CSS = """
  /* LIGHT THEME ONLY, matching preview/changelog-sheet.html by the same instruction. No
     prefers-color-scheme block: table-row, tab-group and input have no dark variants in v2, so
     a dark board would need values that do not exist. Do not add one without asking.

     Every value is a token. Rules marked ADDED are new rules, not new values.

     NO STATE IS CARRIED BY COLOUR ALONE. Utsav's editor theme is dark-daltonized, so every
     status that has a colour also has a word, and the column accent ramp is redundant with the
     column name beside it. Strip every colour from this page and it loses emphasis, not
     information. */
  *,*::before,*::after{box-sizing:border-box}
  body{margin:0;background:var(--gw-color-neutral-25);
       font:var(--gw-text-body-14-reg);letter-spacing:var(--gw-text-body-14-reg-tracking);
       color:var(--gw-color-neutral-900);-webkit-font-smoothing:antialiased}
  code{font-family:var(--gw-font-body);font-weight:500;color:var(--gw-color-neutral-900);
       background:var(--gw-color-neutral-35);border-radius:var(--gw-radius-4);
       padding:0 var(--gw-space-4)}
  [hidden]{display:none !important}
  :focus-visible{outline:var(--gw-focus-ring);outline-offset:var(--gw-focus-offset)}
  svg{flex:none;display:block}

  /* Three surface steps, so a card reads as sitting ON a column rather than beside it:
     canvas neutral/25 → column neutral/50 → card white. The reference does the same thing;
     the values are Gushwork's. */
  .wrap{max-width:1376px;margin:0 auto;padding:var(--gw-space-32) 0 var(--gw-space-80)}
  /* The header and the non-board views hold the measured 1120 column. The board does not —
     see the note on .board below. The 32px side padding is CHOSEN. */
  .col-1120{max-width:1120px;padding:0 var(--gw-space-32)}

  /* ── breadcrumb ── a LOCATION display, not navigation: there is nothing to click in a
     generated file, so it carries no link, no hover and no pointer. Styled as a path with the
     current leaf as a pill, per the reference's shape. */
  .crumb{display:flex;align-items:center;gap:var(--gw-space-8);flex-wrap:wrap;
         margin-bottom:var(--gw-space-20);
         font:var(--gw-text-body-12-med);
         letter-spacing:var(--gw-text-body-12-med-tracking);
         color:var(--gw-color-neutral-500)}
  .crumb svg{width:12px;height:12px;color:var(--gw-color-neutral-300)}
  .crumb__leaf{display:inline-flex;align-items:center;height:24px;
                padding:0 var(--gw-space-8);border-radius:var(--gw-radius-8);
                background:var(--gw-color-neutral-50);color:var(--gw-color-neutral-900)}

  /* ── page-header (278:567) — vertical, gap spacing/24, no fill ── */
  .ph{display:flex;flex-direction:column;gap:var(--gw-space-24)}
  /* Dashboard/display-44-sem. ⚠ NO TOKEN — the five Dashboard/display-* styles match no
     --gw-text-* property (44 is Semibold where h3 is Bold). Literal spec per R15. */
  .ph__t{margin:0;font:600 44px/1.2 var(--gw-font-display);letter-spacing:0;
         color:var(--gw-color-black)}
  /* The subtitle under the title: what this is and the one number that matters. Not in the
     toolbar — a toolbar holding both controls and prose wraps into a hole at narrow widths. */
  .ph__sub{margin:var(--gw-space-8) 0 0;font:var(--gw-text-body-14-reg);
           letter-spacing:var(--gw-text-body-14-reg-tracking);
           color:var(--gw-color-neutral-600)}
  /* toolbar: tabs, a rule, then the actions — the reference's arrangement. Controls only.
     `.bar__r` does not push right with margin-left:auto; it sits in flow so a wrap puts it
     on the next line at the LEFT edge instead of stranded against the right. */
  .bar{display:flex;align-items:center;gap:var(--gw-space-12);flex-wrap:wrap}
  .bar__sep{width:1px;height:24px;background:var(--gw-color-neutral-100);flex:none}
  .bar__r{display:flex;align-items:center;gap:var(--gw-space-8);flex-wrap:wrap}

  /* ── tab-group (356:913) — 36h, radius/12, padding spacing/4, gap spacing/4, fill
     neutral/50, 1px neutral/100. Gap is 4, NOT 8: the v1 controls/tab used 8, the screens
     won. ── */
  .tabs{display:inline-flex;align-items:center;height:36px;padding:var(--gw-space-4);
        gap:var(--gw-space-4);border-radius:var(--gw-radius-12);
        background:var(--gw-color-neutral-50);
        border:1px solid var(--gw-color-neutral-100)}
  /* tab-item (268:408) — 28h, radius/8, px-12, button-12-med. Inactive labels are NOT
     greyed; they are neutral/900. Active is a neutral/black fill with a white label — black
     carries interaction state here, blue would be wrong. */
  .tab{display:inline-flex;align-items:center;gap:var(--gw-space-4);height:28px;
       padding:0 var(--gw-space-12);border:0;border-radius:var(--gw-radius-8);
       background:none;color:var(--gw-color-neutral-900);
       font:var(--gw-text-button-12);cursor:pointer;white-space:nowrap}
  .tab[aria-selected="true"]{background:var(--gw-color-black);color:var(--gw-color-white)}
  .tab__n{font-variant-numeric:tabular-nums;opacity:.6}
  .tab[aria-selected="true"] .tab__n{opacity:.7}

  /* ── control Kind=select (v2) — 36h, radius/12, gap 4. Outlined is white with a
     neutral/400 border. Never a blue fill: blue is data and status on this surface. ── */
  .sel{position:relative;display:inline-block}
  .sel__t{display:inline-flex;align-items:center;gap:var(--gw-space-4);height:36px;
          min-width:144px;padding:0 var(--gw-space-12);border-radius:var(--gw-radius-12);
          cursor:pointer;font:var(--gw-text-button-12);white-space:nowrap;
          background:var(--gw-color-white);color:var(--gw-color-neutral-900);
          border:1px solid var(--gw-color-neutral-400)}
  /* Hover on a control moves ONE step toward its selected state. */
  .sel__t:hover{background:var(--gw-color-neutral-35)}
  .sel__t svg{width:14px;height:14px;color:var(--gw-color-neutral-600)}
  .sel__t .cd{width:12px;height:12px;margin-left:auto;
              transition:transform var(--gw-motion-fast)}
  .sel__t[aria-expanded="true"] .cd{transform:rotate(180deg)}

  /* controls/dropdown, open menu. THE MENU IS WIDER THAN ITS TRIGGER — 160 against 144 —
     and right-aligned. Border neutral/50, options button-12-med, option hover neutral/50.
     THERE IS NO SELECTED CHECKMARK: an earlier ruling invented one; the component has none.
     The current value is carried by the trigger's label instead. */
  .menu{position:absolute;top:calc(100% + var(--gw-space-4));right:0;z-index:20;width:160px;
        padding:var(--gw-space-4);border-radius:var(--gw-radius-12);
        background:var(--gw-color-white);border:1px solid var(--gw-color-neutral-50);
        box-shadow:var(--gw-shadow-s3)}
  .menu button{display:block;width:100%;text-align:left;border:0;background:none;
               cursor:pointer;padding:var(--gw-space-8);border-radius:var(--gw-radius-8);
               font:var(--gw-text-button-12);color:var(--gw-color-neutral-900);
               white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .menu button:hover{background:var(--gw-color-neutral-50)}
  .menu button[aria-selected="true"]{background:var(--gw-color-neutral-50)}

  /* ── control Kind=button (v2) — 36h, radius/12, gap 4. `outlined` is white with a
     neutral/400 border. Never a blue fill: blue is data and status on this surface. ── */
  .btn{display:inline-flex;align-items:center;gap:var(--gw-space-4);height:36px;
       padding:0 var(--gw-space-12);border-radius:var(--gw-radius-12);cursor:pointer;
       font:var(--gw-text-button-12);white-space:nowrap;
       background:var(--gw-color-white);color:var(--gw-color-neutral-900);
       border:1px solid var(--gw-color-neutral-400)}
  /* Hover is MEASURED, not ruled — Outline goes to neutral/35 (button.md). */
  .btn:hover{background:var(--gw-color-neutral-35)}
  .btn svg{width:14px;height:14px}

  /* ── board ── the columns scroll sideways, as in the reference, where the last column is
     visibly cut off. That cut-off edge is the affordance. Lanes hold a 288px floor so a card
     stays readable: five fitted lanes inside the measured 1120 came out at 198px, which is
     not a card. Horizontal measured values are never clamped, so this widens the container
     rather than shrinking anything.

     This is a SECOND scroll region, on the other axis from the page. Build-rule 1 ("exactly
     one region scrolls") governs the 260-rail app shell; this is a single surface with no
     rail, and a sideways-scrolling column set is what a Kanban board is. Stated, not assumed.
     Lane width and the breakpoints are CHOSEN — no Kanban lane exists in the system. */
  .board{display:flex;gap:var(--gw-space-16);align-items:flex-start;
         overflow-x:auto;overflow-y:hidden;
         padding:0 var(--gw-space-32) var(--gw-space-12);
         scroll-snap-type:x proximity}
  .lane{flex:0 0 288px;min-width:0;scroll-snap-align:start;
        /* card-shell Size=lg radius — the column is the OUTER container, so 16; cards nested
           inside it are 12. Two tiers, ruled 13 Aug 2026. */
        border-radius:var(--gw-radius-16);background:var(--gw-color-neutral-50);
        padding:var(--gw-space-12);display:flex;flex-direction:column;gap:var(--gw-space-12)}
  .lane__hd{display:flex;align-items:center;gap:var(--gw-space-8);
            padding:0 var(--gw-space-4)}
  /* ADDED: the column accent bar. New rule, existing values — see LANE_ACCENT. 2px wide,
     radius/full, matching the reference's leading mark. */
  .lane__bar{width:2px;height:14px;border-radius:var(--gw-radius-full);flex:none}
  .lane__t{font:var(--gw-text-body-12-sem);
           letter-spacing:var(--gw-text-body-12-sem-tracking);
           color:var(--gw-color-neutral-900)}
  .lane__n{display:inline-flex;align-items:center;justify-content:center;min-width:18px;
           height:18px;padding:0 var(--gw-space-4);border-radius:var(--gw-radius-full);
           background:var(--gw-color-neutral-100);color:var(--gw-color-neutral-600);
           font:var(--gw-text-body-10-med);
           letter-spacing:var(--gw-text-body-10-med-tracking);
           font-variant-numeric:tabular-nums}
  .lane__list{display:flex;flex-direction:column;gap:var(--gw-space-8)}

  /* ── card ── card-shell Size=md: radius/12, spacing/12, white + 1px neutral/100.
     Four tiers, from the reference: area meta · title · badges · stat footer. */
  .card{padding:var(--gw-space-12);border-radius:var(--gw-radius-12);
        background:var(--gw-color-white);border:1px solid var(--gw-color-neutral-100)}
  /* tier 1 — the reference's `Client: Stellar` line. Here it is which area of the repo the
     work sits in, derived from the leading directory of every path in `surface:`. */
  .card__area{display:flex;align-items:baseline;gap:var(--gw-space-4);
              margin-bottom:var(--gw-space-8);
              font:var(--gw-text-body-10-med);
              letter-spacing:var(--gw-text-body-10-med-tracking)}
  .card__area i{font-style:normal;color:var(--gw-color-neutral-400)}
  .card__area b{font-weight:500;color:var(--gw-color-neutral-600)}
  /* tier 2 */
  .card__t{margin:0;font:var(--gw-text-body-14-sem);
           letter-spacing:var(--gw-text-body-14-sem-tracking);
           color:var(--gw-color-neutral-900)}
  /* tier 3 */
  .card__b{display:flex;flex-wrap:wrap;gap:var(--gw-space-4);margin-top:var(--gw-space-8)}
  /* tier 4 — the reference's stat strip, above a divider. Every number here is DERIVED from
     the card, not invented: how many paths it touches, how much of it is filled in, how old
     it is. No assignee row: there is no assignee in this system, and drawing an avatar would
     be fake data. */
  .card__ft{display:flex;align-items:center;gap:var(--gw-space-12);
            margin-top:var(--gw-space-12);padding-top:var(--gw-space-8);
            border-top:1px solid var(--gw-color-neutral-50)}
  .stat{display:inline-flex;align-items:center;gap:var(--gw-space-4);
        font:var(--gw-text-body-10-med);
        letter-spacing:var(--gw-text-body-10-med-tracking);
        color:var(--gw-color-neutral-500);font-variant-numeric:tabular-nums}
  .stat svg{width:12px;height:12px;color:var(--gw-color-neutral-400)}
  .stat--r{margin-left:auto}
  /* An overdue age is the one stat that changes colour, and it keeps its number and unit, so
     the word is still doing the work. /600 per R18. */
  .stat--od{color:var(--gw-color-red-600)}
  .stat--od svg{color:var(--gw-color-red-600)}

  /* `+ Add new`, per the reference. Real: it copies a card template for THIS lane. */
  .add{display:flex;align-items:center;gap:var(--gw-space-4);width:100%;
       padding:var(--gw-space-8) var(--gw-space-4);border:0;background:none;cursor:pointer;
       border-radius:var(--gw-radius-8);text-align:left;
       font:var(--gw-text-body-12-med);
       letter-spacing:var(--gw-text-body-12-med-tracking);
       color:var(--gw-color-neutral-500)}
  .add:hover{background:var(--gw-color-neutral-100);color:var(--gw-color-neutral-900)}
  .add svg{width:12px;height:12px}
  .lane__none{padding:var(--gw-space-8) var(--gw-space-4);
              font:var(--gw-text-body-12-med);color:var(--gw-color-neutral-300)}

  /* ── badge (1582:628) Size=Small — 24h, px-8, radius/8, body-12-med. One size only: the set
     ships Small/Medium/Large and interpolating a smaller step is how a build drifts.
     Blue is UNDEFINED in the badge rule, so it is unused rather than pressed into "info".
     Labels are the /600 step per DECISIONS.md R18 — the documented /500 fails WCAG AA at
     body-12-med on all three signal colours (red 4.28:1, yellow 3.07:1, green 3.15:1). ── */
  .bdg{display:inline-flex;align-items:center;height:24px;padding:0 var(--gw-space-8);
       border-radius:var(--gw-radius-8);font:var(--gw-text-body-12-med);
       letter-spacing:var(--gw-text-body-12-med-tracking);white-space:nowrap;
       background:var(--gw-color-neutral-50);color:var(--gw-color-neutral-700)}
  .bdg--black{background:var(--gw-color-neutral-900);color:var(--gw-color-white)}
  .bdg--red{background:var(--gw-color-red-25);color:var(--gw-color-red-600)}
  .bdg--yellow{background:var(--gw-color-yellow-25);color:var(--gw-color-yellow-600)}
  .bdg--green{background:var(--gw-color-green-25);color:var(--gw-color-green-600)}

  /* ── section-header (276:560) — px-8, SPACE_BETWEEN, gap spacing/8. The qualifier states
     what the section covers; it is part of the pattern, not decoration. ── */
  .sh{display:flex;align-items:baseline;justify-content:space-between;gap:var(--gw-space-8);
      padding:0 var(--gw-space-8);margin:0 0 var(--gw-space-16)}
  .sh__t{font:var(--gw-text-body-16-sem);letter-spacing:var(--gw-text-body-16-sem-tracking);
         color:var(--gw-color-black)}
  .sh__q{font:var(--gw-text-body-16-reg);letter-spacing:var(--gw-text-body-16-reg-tracking);
         color:var(--gw-color-neutral-500)}

  /* ── list ── table-row (272:583) inside a card-shell Size=sm wrapper (radius/8, the inner
     surface tier). header 44h on neutral/25, bottom 1px neutral/100; data rows no fill,
     bottom 1px neutral/25; hover neutral/25. Padding px-24, and the row FILLS its slot rather
     than being pinned to the measured 1092. */
  .grid{border-radius:var(--gw-radius-8);overflow:hidden;
        border:1px solid var(--gw-color-neutral-100);background:var(--gw-color-white)}
  table{width:100%;border-collapse:collapse}
  thead tr{height:44px;background:var(--gw-color-neutral-25)}
  thead th{text-align:left;padding:0 var(--gw-space-12);
           border-bottom:1px solid var(--gw-color-neutral-100)}
  thead th:first-child{padding-left:var(--gw-space-24)}
  thead th:last-child{padding-right:var(--gw-space-24)}
  /* table-cell Type=header — body-12-med on neutral/700, UPPERCASE, with a 12px ArrowsDownUp
     sort affordance. Drawn ONLY because sorting is wired below. */
  .th{display:inline-flex;align-items:center;gap:var(--gw-space-4);background:none;border:0;
      padding:0;cursor:pointer;font:var(--gw-text-body-12-med);
      letter-spacing:var(--gw-text-body-12-med-tracking);text-transform:uppercase;
      color:var(--gw-color-neutral-700);border-radius:var(--gw-radius-4)}
  .th svg{width:12px;height:12px;color:var(--gw-color-neutral-600)}
  .th[aria-sort="ascending"] svg,.th[aria-sort="descending"] svg{color:var(--gw-color-black)}
  /* Type=data is measured at 56h. These rows carry the full card anatomy, so 56 is the FLOOR
     and the row grows — a vertical measured value is the ceiling of a clamp against
     compression, not a cap on content. Stated because it is a deviation. */
  tbody tr{min-height:56px;border-bottom:1px solid var(--gw-color-neutral-25)}
  tbody tr:hover{background:var(--gw-color-neutral-25)}
  tbody tr:last-child{border-bottom:0}
  tbody td{padding:var(--gw-space-12);vertical-align:top}
  tbody td:first-child{padding-left:var(--gw-space-24)}
  tbody td:last-child{padding-right:var(--gw-space-24)}
  .td-label{font:var(--gw-text-body-12-med);
            letter-spacing:var(--gw-text-body-12-med-tracking);color:var(--gw-color-black)}
  .td-num{font:var(--gw-text-body-12-med);color:var(--gw-color-neutral-600);
          font-variant-numeric:tabular-nums;white-space:nowrap}
  .td-sub{display:block;margin-top:var(--gw-space-4);font:var(--gw-text-body-10-med);
          letter-spacing:var(--gw-text-body-10-med-tracking);
          color:var(--gw-color-neutral-500);overflow-wrap:anywhere;max-width:64ch}
  .td-sub b{font-weight:600;color:var(--gw-color-neutral-700);text-transform:uppercase}

  /* ── shipped ── the 152px rail matches the release rail on changelog-sheet.html, so the two
     pages read as one system. */
  .tl__m{margin-top:var(--gw-space-24)}
  .tl__mt{margin:0 0 var(--gw-space-8);padding:0 var(--gw-space-8);
          font:var(--gw-text-body-10-med);
          letter-spacing:var(--gw-text-body-10-med-tracking);
          text-transform:uppercase;color:var(--gw-color-neutral-400)}
  .tl__r{display:grid;grid-template-columns:152px minmax(0,1fr);gap:var(--gw-space-24);
         padding:var(--gw-space-12) var(--gw-space-8)}
  .tl__r + .tl__r{border-top:1px solid var(--gw-color-neutral-50)}
  .tl__d{font:var(--gw-text-body-12-med);color:var(--gw-color-neutral-500);
         font-variant-numeric:tabular-nums}
  .tl__t{margin:0;font:var(--gw-text-body-14-med);
         letter-spacing:var(--gw-text-body-14-med-tracking);color:var(--gw-color-neutral-900)}
  /* A `shipped:` value too long for a pill. */
  .tl__s{margin:var(--gw-space-4) 0 0;font:var(--gw-text-body-12-reg);
         letter-spacing:var(--gw-text-body-12-reg-tracking);
         color:var(--gw-color-neutral-500);max-width:72ch}

  /* ── empty-state (283:889) — 480 wide, padding spacing/40, gap spacing/16, centred.
     icon-circle 40x40 radius/full on neutral/50 holding a 16px glyph on neutral/400. The
     action is optional and omitted: there is nothing to click when a queue is empty. */
  .empty{max-width:480px;margin:0 auto;padding:var(--gw-space-40);display:flex;
         flex-direction:column;align-items:center;gap:var(--gw-space-16);text-align:center}
  .empty__c{width:40px;height:40px;border-radius:var(--gw-radius-full);
            background:var(--gw-color-neutral-50);display:flex;align-items:center;
            justify-content:center}
  .empty__c svg{width:16px;height:16px;color:var(--gw-color-neutral-400)}
  .empty__t{font:var(--gw-text-body-16-sem);
            letter-spacing:var(--gw-text-body-16-sem-tracking);color:var(--gw-color-black)}
  .empty__b{font:var(--gw-text-body-12-med);
            letter-spacing:var(--gw-text-body-12-med-tracking);color:var(--gw-color-neutral-500)}



  @media (max-width:640px){
    .wrap{padding:var(--gw-space-20) 0 var(--gw-space-56)}
    .col-1120{padding:0 var(--gw-space-16)}
    .board{padding-left:var(--gw-space-16);padding-right:var(--gw-space-16)}
    .ph__t{font-size:32px}
    .find input{width:120px}
    .tl__r{grid-template-columns:minmax(0,1fr);gap:var(--gw-space-4)}
    .grid{overflow-x:auto}
  }
"""

# Phosphor, Regular weight — the icons the components actually specify, not stand-ins.
ICONS = """<svg width="0" height="0" style="position:absolute" aria-hidden="true">
<symbol id="i-caret" viewBox="0 0 256 256"><path fill="none" stroke="currentColor"
 stroke-width="20" stroke-linecap="round" stroke-linejoin="round" d="m96 48 80 80-80 80"/></symbol>
<symbol id="i-plus" viewBox="0 0 256 256"><path fill="none" stroke="currentColor"
 stroke-width="20" stroke-linecap="round" stroke-linejoin="round" d="M40 128h176M128 40v176"/></symbol>
<symbol id="i-funnel" viewBox="0 0 256 256"><path fill="none" stroke="currentColor"
 stroke-width="20" stroke-linecap="round" stroke-linejoin="round"
 d="M32 48h192l-72 88v72l-48-24v-48Z"/></symbol>
<symbol id="i-down" viewBox="0 0 256 256"><path fill="none" stroke="currentColor"
 stroke-width="24" stroke-linecap="round" stroke-linejoin="round" d="m208 96-80 80-80-80"/></symbol>
<symbol id="i-search" viewBox="0 0 256 256"><path fill="none" stroke="currentColor"
 stroke-width="20" stroke-linecap="round" stroke-linejoin="round"
 d="M112 176a64 64 0 1 0 0-128 64 64 0 0 0 0 128ZM160 160l48 48"/></symbol>
<symbol id="i-sort" viewBox="0 0 256 256"><path fill="none" stroke="currentColor"
 stroke-width="20" stroke-linecap="round" stroke-linejoin="round"
 d="M80 224V32M32 176l48 48 48-48M176 32v192M128 80l48-48 48 48"/></symbol>
<symbol id="i-files" viewBox="0 0 256 256"><path fill="none" stroke="currentColor"
 stroke-width="18" stroke-linecap="round" stroke-linejoin="round"
 d="M168 32H72a8 8 0 0 0-8 8v152a8 8 0 0 0 8 8h112a8 8 0 0 0 8-8V56Zm0 0v32h24"/></symbol>
<symbol id="i-half" viewBox="0 0 256 256"><path fill="none" stroke="currentColor"
 stroke-width="18" stroke-linecap="round" stroke-linejoin="round"
 d="M128 32a96 96 0 1 0 0 192 96 96 0 0 0 0-192Zm0 0v192"/></symbol>
<symbol id="i-clock" viewBox="0 0 256 256"><path fill="none" stroke="currentColor"
 stroke-width="18" stroke-linecap="round" stroke-linejoin="round"
 d="M128 32a96 96 0 1 0 0 192 96 96 0 0 0 0-192Zm0 48v48h40"/></symbol>
</svg>"""


def esc(s):
    return html.escape(s or "")


def badge(text, tone=""):
    """The badge component at Size=Small — the only size this page uses."""
    return '<span class="bdg%s">%s</span>' % ((" bdg--" + tone) if tone else "", esc(text))


def ico(name):
    return '<svg aria-hidden="true"><use href="#i-%s"/></svg>' % name


# `surface:` is free prose with paths embedded in it, not a clean comma-separated list —
# real values include "scripts/_board.py, copy the DRIFT_JS block from preview/_build_x.py"
# and "badge set 1582:628 in Gush Design System v2.0". Splitting on commas turned the prose
# into areas called "patterned on preview" and "copy the DRIFT_JS block from preview".
# So paths are EXTRACTED, never split out.
PATH = re.compile(r"\b[A-Za-z_][\w.-]*(?:/[\w.-]+)+")      # a/b or a/b/c.ext
FILE = re.compile(r"\b[A-Za-z_][\w-]*\.[A-Za-z]{2,4}\b")     # DECISIONS.md, tokens.css
BARE_DIR = re.compile(r"\b([A-Za-z_][\w.-]*)/(?![\w.-])")     # "web/" with no tail


def areas(card):
    """The TOP-LEVEL directory of every path in `surface:`, deduped, order preserved.

    The reference's `Client: Stellar` slot, filled with something real: which area of the repo
    a card touches. A surface naming no directory at all — "this file", a Figma node id —
    yields nothing and the line is omitted rather than guessed at.

    Top-level only: matching every segment before a slash turned
    `skills/gushwork-dashboard/SKILL.md` into two areas, "skills" and "gushwork-dashboard".
    """
    raw = card["keys"].get("surface", "")
    out = []
    for path in PATH.findall(raw):
        seg = path.split("/")[0]
        if seg and seg not in out:
            out.append(seg)
    # A bare directory with nothing after the slash — "web/ (16 untracked)" — is still a real
    # surface, and PATH requires a tail segment, so it needs its own pass.
    for seg in BARE_DIR.findall(raw):
        if seg not in out:
            out.append(seg)
    return out


def surface_count(card):
    """How many distinct files or paths the card names. Paths first, then bare filenames that
    were not already counted inside a path."""
    raw = card["keys"].get("surface", "")
    paths = PATH.findall(raw)
    seen = set(paths)
    for f in FILE.findall(raw):
        if not any(f in p for p in paths):
            seen.add(f)
    return len(seen)


def completeness(card, lane):
    keys = COMPLETE_KEYS.get(lane, COMPLETE_DEFAULT)
    have = sum(1 for k in keys if card["keys"].get(k))
    return int(round(100.0 * have / len(keys))), have, len(keys)


def card_badges(card, lane):
    """Only what the column cannot already say.

    No lane badge: on a board the column IS the state, and a "P2" chip on every card in the
    P2 column made all of them look flagged — which is exactly when a real flag stops being
    visible. The age is not repeated here either; the footer clock carries it.
    """
    out = []
    if lane == QUEUE:
        out.append(badge("awaiting decision"))
        d = age_days(card, "since", "added", "date")
        if d is not None and d >= OVERDUE:
            out.append(badge("overdue", "red"))
        elif d is not None and d >= STALE:
            out.append(badge("ageing", "yellow"))
    for f in flags(card, lane):
        out.append(badge(f, "yellow" if f == "needs detail" else "red"))
    return ('<div class="card__b">%s</div>' % "".join(out)) if out else ""


def render_card(card, lane):
    """Four tiers, from the reference: area · title · badges · derived stat footer."""
    a = areas(card)
    area = ('<p class="card__area"><i>Area</i><b>%s</b></p>'
            % esc(" · ".join(a[:3]))) if a else ""

    n = surface_count(card)
    pct, have, total = completeness(card, lane)
    d = age_days(card, "since", "added", "date") if lane == QUEUE else \
        age_days(card, "added", "date")
    od = d is not None and d >= OVERDUE

    stats = []
    if n:
        stats.append('<span class="stat" title="files or surfaces this card touches">'
                     '%s%d</span>' % (ico("files"), n))
    stats.append('<span class="stat" title="%d of %d required keys filled in">%s%d%%</span>'
                 % (have, total, ico("half"), pct))
    stats.append('<span class="stat stat--r%s" title="age">%s%s</span>'
                 % (" stat--od" if od else "", ico("clock"),
                    esc(age_label(d).replace(" days", "d").replace(" day", "d"))))

    return ('<article class="card" data-areas="%s">%s<h3 class="card__t">%s</h3>%s'
            '<div class="card__ft">%s</div></article>'
            % (esc("|".join(a) if a else "—"),
               area, esc(card["title"]), card_badges(card, lane), "".join(stats)))


def render_filter(sections):
    """Icon + dropdown over Area — the derived top-level directory a card touches.

    Options are only the areas that exist on this board, so the menu can never offer a filter
    that returns nothing. Cards whose `surface:` names no directory at all are reachable under
    "No area".
    """
    present, has_none = [], False
    for name in LANES:
        for c in sections[name]:
            a = areas(c)
            if not a:
                has_none = True
            for seg in a:
                if seg not in present:
                    present.append(seg)
    present.sort()

    opts = [("", "All areas")] + [(s, s) for s in present]
    if has_none:
        opts.append(("—", "No area"))

    return ('<div class="sel">'
            '<button class="sel__t" type="button" data-fx-trigger aria-haspopup="listbox"'
            ' aria-expanded="false">%s<span data-fx-label>All areas</span>'
            '<svg class="cd" aria-hidden="true"><use href="#i-down"/></svg></button>'
            '<div class="menu" data-fx-menu role="listbox" aria-label="Filter by area" hidden>'
            '%s</div></div>'
            % (ico("funnel"),
               "".join('<button type="button" role="option" data-fx="%s" aria-selected="%s">'
                       '%s</button>' % (esc(v), "true" if v == "" else "false", esc(l))
                       for v, l in opts)))


def render_board(sections):
    # `+ Add new` carries no function, by instruction. It is a <p>, not a <button>: a control
    # announced to a screen reader that does nothing when activated is worse than a label
    # which never claimed to be one.
    lanes = []
    for name in LANES:
        cards = sections[name]
        body = ("".join(render_card(c, name) for c in cards)
                + '<p class="lane__none"%s data-none>Nothing here</p>'
                % (" hidden" if cards else ""))
        lanes.append(
            '<section class="lane" data-lane="%s" aria-label="%s">'
            '<div class="lane__hd"><span class="lane__bar" style="background:%s"></span>'
            '<span class="lane__t">%s</span><span class="lane__n">%d</span></div>'
            '<div class="lane__list">%s</div>'
            '<p class="add">%sAdd new</p>'
            '</section>'
            % (esc(name), esc(name), LANE_ACCENT[name], esc(name), len(cards), body,
               ico("plus")))
    return '<div class="board">%s</div>' % "".join(lanes)


def empty(title, body):
    return ('<div class="empty"><div class="empty__c">%s</div><div>'
            '<span class="empty__t">%s</span><br><span class="empty__b">%s</span>'
            '</div></div>' % (ico("search"), esc(title), esc(body)))


LIST_COLS = [("task", "Task"), ("state", "State"), ("age", "Age"), ("status", "Status")]
ROW_DETAIL = ["surface", "constraint", "done", "options", "rec", "blocked", "needs"]


def render_list(sections):
    rows = []
    for name in LANES:
        for c in sections[name]:
            d = age_days(c, "since", "added", "date") if name == QUEUE else \
                age_days(c, "added", "date")
            fl = flags(c, name)
            status = "".join(badge(f, "yellow" if f == "needs detail" else "red") for f in fl)
            if name == QUEUE:
                # The word, not the tint. A red "awaiting decision" with no "overdue" beside
                # it puts the state in the colour alone — the one thing this page must not do.
                q = [badge("awaiting decision")]
                if d is not None and d >= OVERDUE:
                    q.append(badge("overdue", "red"))
                elif d is not None and d >= STALE:
                    q.append(badge("ageing", "yellow"))
                status = "".join(q) + status
            detail = "".join(
                '<span class="td-sub"><b>%s</b> %s</span>' % (esc(k), esc(c["keys"][k]))
                for k in ROW_DETAIL if c["keys"].get(k))
            rows.append(
                '<tr data-age="%d" data-lane="%d" data-areas="%s">'
                '<td><span class="td-label">%s</span>%s</td><td>%s</td>'
                '<td><span class="td-num">%s</span></td><td>%s</td></tr>'
                % (-1 if d is None else d, LANES.index(name),
                   esc("|".join(areas(c)) or "—"),
                   esc(c["title"]), detail,
                   badge(name, "black" if name == "P0" else ""),
                   esc(age_label(d)), status or '<span class="td-num">—</span>'))
    if not rows:
        return empty("Nothing open",
                     "Every card is shipped or iced. Add one to BACKLOG.md and rerun "
                     "scripts/board.sh.")
    head = "".join(
        '<th><button class="th" type="button" data-sort="%s" aria-sort="none">%s%s</button></th>'
        % (k, esc(l), ico("sort")) for k, l in LIST_COLS)
    return ('<div class="grid"><table><thead><tr>%s</tr></thead>'
            '<tbody data-rows>%s</tbody></table></div>' % (head, "".join(rows)))


def render_shipped(cards):
    if not cards:
        return empty("Nothing shipped yet",
                     "Move a card to Completed with a date and it appears here.")
    dated = sorted([c for c in cards if c["date"]], key=lambda c: c["date"], reverse=True)
    undated = [c for c in cards if not c["date"]]
    months, order = {}, []
    for c in dated:
        k = c["date"][:7]
        if k not in months:
            months[k] = []
            order.append(k)
        months[k].append(c)
    out = []
    for k in order:
        label = dt.date.fromisoformat(k + "-01").strftime("%B %Y")
        rows = []
        for c in months[k]:
            when = dt.date.fromisoformat(c["date"]).strftime("%-d %b")
            sh = c["keys"].get("shipped")
            # `shipped:` is usually a short ref (v1.39.0, a sha, a DECISIONS row) but
            # sometimes prose. A badge is a pill: an 80-character one is not a badge. Short
            # refs get the pill; anything longer reads as a line.
            if not sh:
                ref = ""
            elif len(sh) <= 40:
                ref = ('<div style="margin-top:var(--gw-space-4)">%s</div>'
                       % badge(sh, "green"))
            else:
                ref = '<p class="tl__s">%s</p>' % esc(sh)
            rows.append('<div class="tl__r"><div><span class="tl__d">%s</span></div>'
                        '<div><p class="tl__t">%s</p>%s</div></div>'
                        % (esc(when), esc(c["title"]), ref))
        out.append('<div class="tl__m"><p class="tl__mt">%s</p>%s</div>'
                   % (esc(label), "".join(rows)))
    if undated:
        out.append('<div class="tl__m"><p class="tl__mt">No date recorded</p>%s</div>'
                   % "".join('<div class="tl__r"><div><span class="tl__d">no date</span>'
                             '</div><div><p class="tl__t">%s</p></div></div>' % esc(c["title"])
                             for c in undated))
    return "".join(out)


# Every data-* hook in the markup is bound here, and every <button> is reachable by one of
# these selectors. A component's anatomy is not a checklist: the reference's `Import`,
# `+ New Board` and per-column `⋮` are absent precisely because there is nothing behind them.
SCRIPT = r"""
(function () {
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };

  /* ── views ── */
  var tabs = $$('[data-view]'), panels = {};
  $$('[data-panel]').forEach(function (p) { panels[p.getAttribute('data-panel')] = p; });
  function show(name) {
    tabs.forEach(function (t) {
      t.setAttribute('aria-selected', String(t.getAttribute('data-view') === name));
    });
    Object.keys(panels).forEach(function (k) { panels[k].hidden = k !== name; });
    try { localStorage.setItem('gw-board-view', name); } catch (e) {}
  }
  tabs.forEach(function (t) {
    t.addEventListener('click', function () { show(t.getAttribute('data-view')); });
  });
  var saved = null;
  try { saved = localStorage.getItem('gw-board-view'); } catch (e) {}
  show(saved && panels[saved] ? saved : 'kanban');

  /* ── filter ── icon + dropdown over Area. Applies to the board and the list at once.
     Lane counts are NOT rewritten: a count that moves with a filter stops meaning "how much
     work is in this lane". */
  var fxT = $('[data-fx-trigger]'), fxM = $('[data-fx-menu]'), fxL = $('[data-fx-label]');
  var fxValue = '';

  function apply() {
    $$('[data-areas]').forEach(function (el) {
      var list = el.getAttribute('data-areas').split('|');
      el.hidden = fxValue !== '' && list.indexOf(fxValue) === -1;
    });
    /* A lane emptied BY the filter must say so rather than go blank — that reads as broken.
       Every lane carries a placeholder; this reveals it and words it for the case at hand. */
    $$('.lane').forEach(function (lane) {
      var none = $('[data-none]', lane);
      if (!none) return;
      var any = $$('.card', lane).some(function (c) { return !c.hidden; });
      none.hidden = any;
      none.textContent = fxValue === '' ? 'Nothing here' : 'No match';
    });
  }

  function openMenu(on) {
    if (!fxM) return;
    fxM.hidden = !on;
    fxT.setAttribute('aria-expanded', String(on));
    if (on) { var f = $('button', fxM); if (f) f.focus(); }
  }

  if (fxT && fxM) {
    fxT.addEventListener('click', function (e) {
      e.stopPropagation();
      openMenu(fxM.hidden);
    });
    $$('[data-fx]', fxM).forEach(function (opt) {
      opt.addEventListener('click', function () {
        fxValue = opt.getAttribute('data-fx');
        fxL.textContent = opt.textContent;
        $$('[data-fx]', fxM).forEach(function (o) {
          o.setAttribute('aria-selected', String(o === opt));
        });
        apply();
        openMenu(false);
        fxT.focus();
      });
    });
    /* Every way out of an open menu, or it becomes a state you cannot leave. */
    document.addEventListener('click', function (e) {
      if (!fxM.hidden && !fxM.contains(e.target) && e.target !== fxT) openMenu(false);
    });
    document.addEventListener('keydown', function (e) {
      if (fxM.hidden) return;
      var items = $$('[data-fx]', fxM), i = items.indexOf(document.activeElement);
      if (e.key === 'Escape') { openMenu(false); fxT.focus(); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); items[Math.min(i + 1, items.length - 1)].focus(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); items[Math.max(i - 1, 0)].focus(); }
      else if (e.key === 'Home') { e.preventDefault(); items[0].focus(); }
      else if (e.key === 'End') { e.preventDefault(); items[items.length - 1].focus(); }
    });
  }

  /* ── sort ── the ArrowsDownUp affordance exists only because of this. */
  var body = $('[data-rows]'), dir = {};
  if (body) {
    $$('[data-sort]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var key = btn.getAttribute('data-sort');
        dir[key] = dir[key] === 'asc' ? 'desc' : 'asc';
        var sign = dir[key] === 'asc' ? 1 : -1;
        $$('[data-sort]').forEach(function (o) {
          o.setAttribute('aria-sort', o === btn
            ? (dir[key] === 'asc' ? 'ascending' : 'descending') : 'none');
        });
        var rows = $$('tr', body);
        rows.sort(function (a, b) {
          var x, y;
          if (key === 'age') { x = +a.dataset.age; y = +b.dataset.age; }
          else if (key === 'state') { x = +a.dataset.lane; y = +b.dataset.lane; }
          else {
            var i = key === 'task' ? 0 : 3;
            x = (a.cells[i].textContent || '').trim().toLowerCase();
            y = (b.cells[i].textContent || '').trim().toLowerCase();
          }
          return x < y ? -sign : x > y ? sign : 0;
        });
        rows.forEach(function (r) { body.appendChild(r); });
      });
    });
  }

})();
"""


def waiting_text(sections):
    """The queue as plain text, for the Stop hook and the morning digest.

    Prints nothing when the queue is empty — a notifier that says "nothing to report" every
    morning is a notifier people turn off.
    """
    cards = sections[QUEUE]
    if not cards:
        return ""
    lines = []
    for c in cards:
        days = age_days(c, "since", "added", "date")
        mark = " (OVERDUE)" if days is not None and days >= OVERDUE else ""
        lines.append("%s — waiting %s%s" % (c["title"], age_label(days), mark))
    return "\n".join(lines)


def main():
    sections = parse(sys.stdin.read())

    if "--titles" in sys.argv:
        # `section<TAB>title` per card. The Stop hook diffs two of these to work out what
        # actually changed, so it can say "new in P1: …" rather than "the file changed".
        for name in SECTIONS:
            for c in sections[name]:
                sys.stdout.write("%s\t%s\n" % (name, c["title"]))
        return 0

    if "--waiting" in sys.argv:
        out = waiting_text(sections)
        if out:
            sys.stdout.write(out + "\n")
        return 0 if out else 1

    here = os.path.dirname(os.path.abspath(__file__))
    favicon = ""
    fav = os.path.join(here, "_favicon.txt")
    if os.path.exists(fav):
        with open(fav) as fh:
            favicon = fh.read().strip()

    version = "unknown"
    pj = os.path.join(here, "..", ".claude-plugin", "plugin.json")
    if os.path.exists(pj):
        import json as _json
        with open(pj) as fh:
            version = _json.load(fh).get("version", "unknown")

    waiting = sections[QUEUE]
    open_cards = sum(len(sections[c]) for c in COLUMNS if c != "Icebox")
    shipped = len(sections[DONE])
    on_board = sum(len(sections[n]) for n in LANES)
    oldest = max((age_days(c, "since", "added", "date") or 0)
                 for c in waiting) if waiting else None

    stamp = ('{"pluginVersion":"%s","createdBy":"Utsav Singh","createdAt":"%s",'
             '"registry":"https://gushwork-design.vercel.app/exports/dashboard/'
             'component-registry.json",'
             '"changelog":"https://gushwork-design.vercel.app/preview/changelog-sheet.html",'
             '"components":[%s]}'
             % (version, TODAY.strftime("%-d %b %Y"),
                ",".join('"%s"' % c for c in BUILD_COMPONENTS)))

    bits = ["Generated %s" % TODAY.strftime("%-d %b %Y")]
    if waiting:
        bits.append("oldest decision waiting %s" % age_label(oldest))

    tabs = [("kanban", "Board", on_board), ("list", "List", on_board),
            ("shipped", "Shipped", shipped)]

    print("""<!doctype html>
<html lang="en" data-today="%(today)s">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Backlog — Gushwork Design System</title>
<link rel="icon" type="image/svg+xml" href="%(favicon)s">
<link rel="stylesheet" href="../foundation/tokens.css">
<style>%(css)s</style>
</head>
<body>
<!-- gushwork-build:%(stamp)s -->
%(icons)s
<div class="wrap">

  <header class="ph col-1120">
    <div>
      <nav class="crumb" aria-label="Source">
        <span>gushwork-design</span>%(i_caret)s<span>preview</span>%(i_caret)s
        <span class="crumb__leaf">board.html</span>
      </nav>
      <h1 class="ph__t">Backlog</h1>
      <p class="ph__sub">%(meta)s</p>
    </div>
    <div class="bar">
      <div class="tabs" role="tablist" aria-label="View">%(tabs)s</div>
      <span class="bar__sep" aria-hidden="true"></span>
      <div class="bar__r">%(filter)s</div>
    </div>
  </header>

  <div data-panel="kanban" role="tabpanel" style="margin-top:var(--gw-space-32)">
    %(board)s
  </div>

  <div data-panel="list" role="tabpanel" hidden
       class="col-1120" style="margin-top:var(--gw-space-32)">
    <div class="sh"><div><span class="sh__t">All open work</span>
      <span class="sh__q">every lane, sortable</span></div></div>
    %(list)s
  </div>

  <div data-panel="shipped" role="tabpanel" hidden
       class="col-1120" style="margin-top:var(--gw-space-32)">
    <div class="sh"><div><span class="sh__t">Shipped</span>
      <span class="sh__q">newest first, by month</span></div></div>
    %(shipped)s
  </div>

</div>

<script>%(script)s</script>
</body>
</html>""" % dict(
        today=TODAY.isoformat(),
        favicon=favicon,
        css=CSS,
        stamp=stamp,
        icons=ICONS,
        i_caret=ico("caret"),
        tabs="".join(
            '<button class="tab" type="button" role="tab" data-view="%s" aria-selected="%s">'
            '%s<span class="tab__n">%d</span></button>'
            % (k, "true" if k == "kanban" else "false", esc(label), n)
            for k, label, n in tabs),
        meta=esc(" · ".join(bits)),
        filter=render_filter(sections),
        board=render_board(sections),
        list=render_list(sections),
        shipped=render_shipped(sections[DONE]),
        script=SCRIPT,
    ))

    # Count each flag as itself. This used to total EVERY flag and print the lot as "needing
    # detail", so the first card to carry `blocked:` was reported as missing a key it had — the
    # summary contradicting the board it summarises, which is the one thing this file must not do.
    def count(flag):
        return sum(1 for c in COLUMNS for card in sections[c] if flag in flags(card, c))

    tail = "".join(
        ", %d %s" % (n, label)
        for n, label in ((count("needs detail"), "needing detail"), (count("blocked"), "blocked"))
        if n
    )
    sys.stderr.write(
        "Wrote %s — %d waiting, %d open, %d shipped%s\n"
        % (os.environ.get("OUT", "the board"), len(waiting), open_cards, shipped, tail))
    return 0


if __name__ == "__main__":
    sys.exit(main() or 0)
