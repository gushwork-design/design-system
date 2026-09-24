#!/usr/bin/env python3
"""Render the release records as preview/changelog-sheet.html.

Reads records on stdin from `scripts/_releases.sh` — one per line, fields split on US
(0x1f), body newlines encoded as RS (0x1e). Writes HTML to stdout. Never run directly;
`scripts/changelog-sheet.sh` is the entry point and holds the usage notes.

LAYOUT, redesigned 11 Aug 2026 after Utsav pointed at code.claude.com/docs/en/changelog.
The table became a reading page: a version pill and date in a left rail, the change on the
right, whitespace instead of rules, and a sticky version index. What that page gets right is
that a changelog is READ, not scanned like data — so each release leads with a sentence and
holds its detail in a disclosure rather than a cell.

LIGHT THEME ONLY, by instruction. There is no dark variant and no prefers-color-scheme block.
Do not add one without asking.

Every value in the CSS is a token from foundation/tokens.css. Lines marked ADDED are new
rules, not new values, and are reported per foundation/new-component-notice.md.
"""

import html
import os
import re
import sys

REPO = os.environ.get("REPO", "")


# ── records ───────────────────────────────────────────────────────────────────────────
def read_rows():
    rows = []
    for line in sys.stdin.read().split("\n"):
        if not line.strip():
            continue
        f = line.split("\x1f")
        if len(f) < 5:
            continue
        version, sha, date, summary, session = f[:5]
        body = f[5] if len(f) > 5 else ""
        rows.append(
            dict(
                version=version,
                sha=sha,
                date=date,
                summary=summary,
                session=session,
                body=body.replace("\x1e", "\n").strip("\n"),
            )
        )
    return rows


def anchor(v):
    return "v" + v.replace(".", "-")


# ── markdown-lite ─────────────────────────────────────────────────────────────────────
# Commit bodies are prose with backticks, ** emphasis and bare URLs. Nothing more is
# supported on purpose: a changelog that needs a full markdown engine is a changelog whose
# commit messages have stopped being commit messages.
URL = re.compile(r"(https?://[^\s<>()]+)")

# Anything that navigates AWAY opens in a new tab, so a reader never loses their place in a
# 40-release page. Two deliberate exceptions: the index's `#v1-30-0` anchors, which are the
# same page, and the `claude://resume` links, where the protocol handler takes over and a
# new tab would just be left blank. `rel` is not optional — `target="_blank"` without
# `noopener` hands the opened page a live handle on this one.
NEWTAB = ' target="_blank" rel="noopener noreferrer"'


def inline(text):
    out = html.escape(text)
    out = re.sub(r"`([^`]+)`", r"<code>\1</code>", out)
    out = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", out)
    out = URL.sub(
        lambda m: '<a class="lnk" href="%s"%s>%s</a>' % (m.group(1), NEWTAB, m.group(1)), out
    )
    return out


def blocks(body):
    """Split a commit body into paragraphs and bullet lists, in order."""
    out, para, items = [], [], []

    def flush_para():
        if para:
            out.append(("p", " ".join(para)))
            del para[:]

    def flush_list():
        if items:
            out.append(("ul", list(items)))
            del items[:]

    for raw in body.split("\n"):
        line = raw.rstrip()
        if not line.strip():
            flush_para()
            flush_list()
            continue
        if re.match(r"^\s*[-*]\s+", line):
            flush_para()
            items.append(re.sub(r"^\s*[-*]\s+", "", line))
        elif items and raw.startswith(("  ", "\t")):
            items[-1] += " " + line.strip()  # wrapped bullet continuation
        else:
            flush_list()
            para.append(line.strip())
    flush_para()
    flush_list()
    return out


def render(bs):
    parts = []
    for kind, val in bs:
        if kind == "p":
            parts.append("<p>%s</p>" % inline(val))
        else:
            lis = "".join("<li>%s</li>" % inline(i) for i in val)
            parts.append("<ul>%s</ul>" % lis)
    return "".join(parts)


def session_cell(raw):
    if not raw:
        return '<span class="none">no session recorded</span>'
    uuid, _, title = raw.partition(" ")
    if re.match(r"^[0-9a-f]+-[0-9a-f]+-", uuid):
        return (
            '<a class="meta__l" href="claude://resume/%s">'
            '<svg class="gl"><use href="#i-chat"/></svg>%s</a>' % (uuid, html.escape(title))
        )
    return '<span class="none">%s</span>' % html.escape(raw)


# ── page ──────────────────────────────────────────────────────────────────────────────
CSS = """
  /* LIGHT THEME ONLY, by instruction — there is no prefers-color-scheme block below.
     Every value is a token. Lines marked ADDED are new rules, not new values.

     TYPE. Follows the site type scale — see web/shell.css section 1b, which is the
     contract. This sheet had drifted off it: body at 14/reg and the lede at 16/reg while
     the styleguide and install page read at 18/med, so the page people read most was set
     two steps smaller and a weight lighter than the rest of the site.

     THEMING. Colours are `var(--s-x, <the light token>)`. Served inside the shell, --s-*
     supplies light and dark; opened straight out of preview/ with no shell, the fallback
     resolves and the sheet is light — which is all it ever was.

     It was NOT all it ever was on the deploy. This sheet had no theming at all: 43 raw
     colour tokens and no dark handling, while the shell it is served in has a dark toggle.
     In dark the h1 rendered neutral-900 on the shell's near-black page — a luminance gap of
     ZERO, an invisible title — and every release title sat at 28. The page was unreadable
     and nothing said so, because the sheet renders perfectly on its own.

     Muted greys (neutral-300..500) and the brand blue are left raw on purpose: they read on
     either ground, and routing them through semantics would flatten them into body text. */
  *,*::before,*::after{box-sizing:border-box}
  html{scroll-behavior:smooth}
  body{margin:0;background:var(--s-page-bg, var(--gw-color-white));
       font:var(--gw-text-body-18-med);letter-spacing:var(--gw-text-body-18-med-tracking);
       color:var(--s-heading, var(--gw-color-neutral-900));-webkit-font-smoothing:antialiased}
  /* Two families only — the browser's default <code> face would be a third. Size and
     line-height are INHERITED rather than set: binding a 14px token here made every chip
     render small inside the 16px lede and knocked the line off its baseline. Weight and
     family are the only type properties a chip owns. */
  code{font-family:var(--gw-font-body);font-weight:500;color:var(--s-heading, var(--gw-color-neutral-900));
       background:var(--s-chrome-bg, var(--gw-color-neutral-35));border-radius:var(--gw-radius-4);
       padding:0 var(--gw-space-4)}

  /* Column split measured off the styleguide page (478:15070 → Frame
     2147260130): 40 pad, main column 800, gutter 60, TOC rail 260, 40 pad —
     1200 across, which is the content column beside the 240 sidebar. */
  /* 60 top and 40 sides are the measured page padding; the 120 at the bottom
     is deliberate and Utsav's call — a long scrolling page wants run-out room
     under the last release. */
  .page{max-width:1200px;margin:0 auto;
        padding:var(--gw-space-60) var(--gw-space-40) var(--gw-space-120);
        /* `auto` for the rail, not a fixed 260 — collapsing it to 48 widens the
           main column to the measured 1012 with no second rule. */
        display:grid;grid-template-columns:minmax(0,1fr) auto;
        /* Column gap 60 is the measured gutter. Row gap is 32, NOT 60 — the
           styleguide puts 32 between the header rule and the body
           (header ends 93, line 125, body 157). */
        column-gap:var(--gw-space-60);row-gap:var(--gw-space-32)}

  /* ── header ──
     Measured off the styleguide header (Frame 2147260129): the block is
     inset 40 left and right while the rule below it runs the full column
     width, stack gap 20, and the divider is 2px Neutral/200 — not the 1px
     Neutral/100 this sheet used to draw. */
  /* Column 1 only. `grid-column:1 / -1` was left over from the old layout,
     where the header spanned a narrow 168px index — under the styleguide's
     split it ran the rule 1120 wide, straight under the TOC. The measured
     line (478:15076) is 800: the main column, and nothing past the gutter. */
  .hd{grid-column:1;grid-row:1;
      display:flex;flex-direction:column;gap:var(--gw-space-20);
      padding:0 var(--gw-space-40) var(--gw-space-32);
      /* DOTTED, not solid. Line 14 (478:15076) measures strokeWeight 2,
         strokeCap ROUND, dashPattern [0.1, 4] — a zero-length dash with a
         round cap is a 2px dot, repeating every 4.1px. Drawn as a gradient
         because a CSS `dotted` border leaves dot size and spacing to the UA.
         The style guide carries the same rule; change both together. */
      border-bottom:0;
      background-image:radial-gradient(circle closest-side,
                       var(--s-card-border, var(--gw-color-neutral-200)) 100%, transparent 100%);
      background-size:4.1px 2px;
      background-position:left bottom;
      background-repeat:repeat-x}
  main{grid-column:1;grid-row:2;min-width:0}
  /* The rail top-aligns with the header, not with the body — in Figma both
     the main column and the rail start at y=60. */
  /* `1 / -1` does NOT work here: with no explicit rows, -1 resolves to the end
     of the explicit grid (line 1), so the rail landed in row 1 alone and its
     ~760px height forced that row open, shoving the body down to y=972.
     `span 2` spans both rows for real, so its height is satisfied across them. */
  .idx{grid-column:2;grid-row:1 / span 2;align-self:start}
  /* Styleguide page title, measured: Vert Grotesk Display Semibold 44/120%,
     ls 0, Neutral/black. No text style is bound in Figma, and --gw-text-h3 is
     the wrong weight (700), so the ramp is spelled out. */
  h1{margin:0;font:600 44px/1.2 var(--gw-font-display);
     letter-spacing:0;color:var(--s-heading, var(--gw-color-black))}
  /* The styleguide's "Last updated" line: Body/body-14-med, Neutral/400,
     sitting 20 under the title. */
  .hd__meta{margin:0;font:var(--gw-text-body-14-med);
            letter-spacing:var(--gw-text-body-14-med-tracking);
            color:var(--gw-color-neutral-400)}
  /* One sentence saying what this is, then the housekeeping as separate lines. They were
     one dense paragraph and nobody reads a description that also explains its own
     derivation. */
  .lede{margin:0;max-width:64ch;font:var(--gw-text-body-18-med);
        letter-spacing:var(--gw-text-body-18-med-tracking);color:var(--s-body, var(--gw-color-neutral-600))}
  .hd__note{margin:0;max-width:72ch;
            font:var(--gw-text-body-14-med);
            letter-spacing:var(--gw-text-body-14-med-tracking);
            color:var(--s-body, var(--gw-color-neutral-600))}

  /* The page's one-sentence description. It sits BELOW the header rule, in the slot
     the styleguide and downloads pages put their intro prose in — the header itself is
     just title, date and rule on every page now. */
  .intro{padding:0 var(--gw-space-40) var(--gw-space-32)}

  /* ── release list ── */
  .rel{display:grid;grid-template-columns:152px minmax(0,1fr);gap:var(--gw-space-40);
       padding:0 var(--gw-space-40) var(--gw-space-32);
       scroll-margin-top:var(--gw-space-24)}
  /* Top padding travels WITH the border, because it exists to sit below one. On .rel it left
     the first release padded away from the header rule with nothing in between — 64px from
     the rule to the first title where the styleguide has 20. */
  .rel + .rel{border-top:1px solid var(--s-card-border, var(--gw-color-neutral-50));
              padding-top:var(--gw-space-32)}
  .rail{display:flex;flex-direction:column;align-items:flex-start;gap:var(--gw-space-4)}
  .pill{display:inline-flex;align-items:center;padding:var(--gw-space-4) var(--gw-space-8);
        border-radius:var(--gw-radius-4);font:var(--gw-text-body-12-med);
        font-variant-numeric:tabular-nums;background:var(--s-chrome-bg, var(--gw-color-neutral-50));
        color:var(--s-heading, var(--gw-color-neutral-900));white-space:nowrap;margin-bottom:var(--gw-space-4)}
  /* ADDED: a primary pill. New rule, no new colour — the primary-alpha-10 /
     primary-500 pairing the section icon tile already uses. */
  .pill--now{background:var(--gw-color-primary-alpha-10);color:var(--gw-color-primary-500)}
  .when{font:var(--gw-text-body-12-reg);color:var(--gw-color-neutral-500);
        font-variant-numeric:tabular-nums}
  .tag{margin-top:var(--gw-space-4);font:500 10px/1.6 var(--gw-font-body);
       text-transform:uppercase;color:var(--gw-color-neutral-400)}

  .body__sum{margin:0;font:var(--gw-text-body-18-sem);
             letter-spacing:var(--gw-text-body-18-sem-tracking);
             color:var(--s-heading, var(--gw-color-neutral-900));max-width:64ch}
  .prose{margin-top:var(--gw-space-12);color:var(--s-body, var(--gw-color-neutral-600))}
  .prose p{margin:0 0 var(--gw-space-8);font:var(--gw-text-body-18-med);
           letter-spacing:var(--gw-text-body-18-med-tracking);max-width:72ch}
  .prose ul{margin:0 0 var(--gw-space-8);padding-left:var(--gw-space-20);max-width:72ch}
  .prose li{margin-bottom:var(--gw-space-4);font:var(--gw-text-body-18-med);
            letter-spacing:var(--gw-text-body-18-med-tracking)}
  .prose li::marker{color:var(--gw-color-neutral-300)}
  .prose > :last-child{margin-bottom:0}
  .prose strong{font-weight:600;color:var(--s-heading, var(--gw-color-neutral-800))}

  /* disclosure — bodies run past twenty lines, so only the lede is open by default.
     The caret follows the label and points DOWN at rest, flipping to up when open:
     it describes what the control will do, and a chevron after the text is the
     affordance people already read as "expand". `CaretDown` at Bold, per the icon
     weight table in foundation/shared-components.md — nav-style carets are Bold, and
     a text glyph is never a substitute for the real one. */
  details{margin-top:var(--gw-space-12)}
  summary{display:inline-flex;align-items:center;gap:var(--gw-space-4);cursor:pointer;
          font:var(--gw-text-body-12-med);color:var(--gw-color-primary-500);
          list-style:none;width:fit-content;border-radius:var(--gw-radius-4)}
  summary::-webkit-details-marker{display:none}
  summary:focus-visible{outline:var(--gw-focus-ring);outline-offset:var(--gw-focus-offset)}
  summary .gl{width:12px;height:12px;transition:transform var(--gw-motion-fast)}
  details[open] summary .gl{transform:rotate(180deg)}
  details[open] summary{margin-bottom:var(--gw-space-8)}

  .meta{margin-top:var(--gw-space-16);display:flex;flex-wrap:wrap;
        gap:var(--gw-space-8) var(--gw-space-20)}
  .meta__l{display:inline-flex;align-items:center;gap:var(--gw-space-4);
           font:var(--gw-text-body-12-med);color:var(--gw-color-neutral-500);
           text-decoration:none;border-radius:var(--gw-radius-4)}
  .meta__l:hover{color:var(--gw-color-primary-500)}
  .meta__l:focus-visible{outline:var(--gw-focus-ring);outline-offset:var(--gw-focus-offset)}
  .gl{width:14px;height:14px;flex:none;display:block}
  .none{font:var(--gw-text-body-12-med);color:var(--gw-color-neutral-300)}
  .lnk{color:var(--gw-color-primary-500);text-decoration:none;word-break:break-word}
  .lnk:hover{text-decoration:underline}

  /* ── version index ── */
  /* `padding-right` is the gutter the scrollbar sits in. Without it the row highlights run
     underneath the thumb — on macOS the scrollbar is an OVERLAY and floats above content,
     so it is not enough to let the classic scrollbar reserve its own width.
     `scrollbar-gutter:stable` keeps the column from shifting when the bar appears. */
  /* ── on this page ──
     Measured off the styleguide TOC rail (478:15070 → Frame 2147260252):
     260 wide, stack gap 16; a 22x22 r8 caret button filled Neutral/100 with a
     1px Neutral/200 stroke, then a 16px List icon and the label at
     Button/button-14-med Neutral/900; the links indented 32, gap 16, at
     Button/button-14-med Neutral/700, and the active one Primary/500-main.
     Kept from the old rail: sticky, its own scroll, and the gutter — the
     styleguide lists 7 sections and this lists 46 releases. */
  .idx{position:sticky;top:var(--gw-space-40);align-self:start;
       max-height:calc(100vh - 80px);overflow-y:auto;overscroll-behavior:contain;
       scrollbar-gutter:stable;
       display:flex;flex-direction:column;gap:var(--gw-space-16)}
  .idx__t{display:flex;align-items:center;gap:var(--gw-space-8);
          font:var(--gw-text-button-14);letter-spacing:0;
          color:var(--s-heading, var(--gw-color-neutral-900));
          padding-bottom:var(--gw-space-8);
          /* PAGE bg, not card: this is a sticky mask over the scrolling list, so it has to
             be the colour it sits on. --s-card-bg is white, which showed as a slab. */
          position:sticky;top:0;z-index:1;background:var(--s-page-bg, var(--gw-color-white))}
  .idx__ico{width:16px;height:16px;flex:none;display:block}
  /* The caret button, measured 22x22 with 4 padding around a 12px glyph. It
     collapses the rail; the styleguide draws it, so it is drawn here. */
  .idx__col{width:22px;height:22px;flex:none;display:grid;place-items:center;
            padding:var(--gw-space-4);border-radius:var(--gw-radius-8);
            background:var(--s-lock-bg, var(--gw-color-neutral-100));
            border:1px solid var(--s-card-border, var(--gw-color-neutral-200));
            color:var(--s-heading, var(--gw-color-neutral-800));cursor:pointer}
  .idx__col svg{width:12px;height:12px;display:block;
                transition:transform var(--gw-motion-fast)}
  .idx__col:focus-visible{outline:var(--gw-focus-ring);outline-offset:var(--gw-focus-offset)}
  /* The indented link list — pad-left 32 on the group, not on each row. */
  .idx__list{display:flex;flex-direction:column;gap:var(--gw-space-16);
             padding-left:var(--gw-space-32)}
  .idx a{font:var(--gw-text-button-14);letter-spacing:0;
         font-variant-numeric:tabular-nums;
         color:var(--s-body, var(--gw-color-neutral-700));text-decoration:none}
  .idx a:hover{color:var(--s-nav-label, var(--gw-color-neutral-900))}
  .idx a:focus-visible{outline:var(--gw-focus-ring);outline-offset:var(--gw-focus-offset)}
  /* The release currently at the top of the page. The styleguide marks its
     active entry with colour alone — Primary/500-main, no tint, no weight
     change. `font-variant-numeric` is re-declared because the `font`
     shorthand resets it, and losing tabular figures makes the column jitter. */
  .idx a.now{color:var(--gw-color-primary-500);font-variant-numeric:tabular-nums}
  /* Collapsed state, measured against frame 478:15652 — the same page with the
     rail collapsed. Not just "hide the links": the rail goes 260 -> 48, the
     main column and its divider go 800 -> 1012, the label is hidden, and the
     22x22 caret button becomes a 48x26 pill with the List glyph inside it.
     The column rule above turns the rail's width into the split, so 1012 is
     arithmetic rather than another declaration. */
  .idx{width:260px}
  .idx[data-collapsed="true"]{width:48px}
  .idx[data-collapsed="true"] .idx__list{display:none}
  .idx[data-collapsed="true"] .idx__col svg{transform:rotate(90deg)}
  .idx[data-collapsed="true"] .idx__t{
    width:48px;height:26px;padding:var(--gw-space-4);
    gap:var(--gw-space-8);justify-content:center;
    border-radius:var(--gw-radius-8);background:var(--s-lock-bg, var(--gw-color-neutral-100))}
  .idx[data-collapsed="true"] .idx__col{
    width:12px;height:12px;padding:0;background:none;border:0}
  .idx[data-collapsed="true"] .idx__t > span{display:none}

  /* Slim rounded scrollbar, thumb only — the default chrome is heavy next to 12px rows.
     Both properties are needed: `scrollbar-width`/`-color` is the standard and covers
     Firefox, `::-webkit-scrollbar` covers Safari and Chrome, and neither is a fallback
     for the other. Applied to the page as well so the two never disagree. */
  html{scrollbar-width:thin;scrollbar-color:var(--gw-color-neutral-200) transparent}
  .idx{scrollbar-width:thin;scrollbar-color:var(--gw-color-neutral-200) transparent}
  html::-webkit-scrollbar,.idx::-webkit-scrollbar{width:8px;height:8px}
  html::-webkit-scrollbar-track,.idx::-webkit-scrollbar-track{background:transparent}
  html::-webkit-scrollbar-thumb,.idx::-webkit-scrollbar-thumb{
    background:var(--s-card-border, var(--gw-color-neutral-200));border-radius:var(--gw-radius-full);
    border:2px solid transparent;background-clip:content-box}
  html::-webkit-scrollbar-thumb:hover,.idx::-webkit-scrollbar-thumb:hover{
    background:var(--s-card-border, var(--gw-color-neutral-300));background-clip:content-box}

  /* No narrow-viewport reflow here. exports/dashboard/build-rules.md rules that
     below 1440 the canvas SCALES rather than rearranges — reflow is listed there
     as a rejected attempt. shell.js sets --gw-fit and .gw-shell zooms the whole
     1440 layout, so this page keeps its 800 / 60 / 260 split at every width. */

  /* Phone — reflow to one column. See shell.css section 10 for why this page
     reflows while `dashboard-build` scales. */
  @media (max-width:767px){
    .page{max-width:none;grid-template-columns:minmax(0,1fr);
          column-gap:0;row-gap:var(--gw-bp-content-gap);
          padding:var(--gw-bp-pad-section-v) var(--gw-bp-pad-page-h)}
    .hd,main{grid-column:1;grid-row:auto}
    .hd{padding-left:0;padding-right:0}
    h1{font-size:var(--gw-bp-type-h1)}
    .idx{display:none}
    .rel{grid-template-columns:minmax(0,1fr);gap:var(--gw-space-12);
         padding-left:0;padding-right:0}
    .rail{flex-direction:row;align-items:center;gap:var(--gw-space-12)}
    .pill,.tag{margin:0}
  }
"""

SPRITE = """
<svg width="0" height="0" style="position:absolute" aria-hidden="true">
  <!-- Phosphor. `fill` is re-applied to the symbol: it lives on the source <svg>, and
       stripping that wrapper drops it, which renders every path black. -->
  <symbol id="i-commit" viewBox="0 0 256 256" fill="currentColor"><path d="M248,120H183.42a56,56,0,0,0-110.84,0H8a8,8,0,0,0,0,16H72.58a56,56,0,0,0,110.84,0H248a8,8,0,0,0,0-16ZM128,168a40,40,0,1,1,40-40A40,40,0,0,1,128,168Z"/></symbol>
  <symbol id="i-chat" viewBox="0 0 256 256" fill="currentColor"><path d="M128,24A104,104,0,0,0,36.18,176.88L24.83,210.93a16,16,0,0,0,20.24,20.24l34.05-11.35A104,104,0,1,0,128,24Zm0,192a87.87,87.87,0,0,1-44.06-11.81,8,8,0,0,0-6.54-.67L40,216,52.47,178.6a8,8,0,0,0-.66-6.54A88,88,0,1,1,128,216Z"/></symbol>
  <symbol id="i-caret" viewBox="0 0 256 256" fill="currentColor"><path d="M216.49,104.49l-80,80a12,12,0,0,1-17,0l-80-80a12,12,0,0,1,17-17L128,159l71.51-71.52a12,12,0,0,1,17,17Z"/></symbol>
  <!-- The styleguide TOC rail draws List at Regular 16 and CaretRight at Bold 12. -->
  <symbol id="i-list" viewBox="0 0 256 256" fill="currentColor"><path d="M224,128a8,8,0,0,1-8,8H40a8,8,0,0,1,0-16H216A8,8,0,0,1,224,128ZM40,72H216a8,8,0,0,0,0-16H40a8,8,0,0,0,0,16ZM216,184H40a8,8,0,0,0,0,16H216a8,8,0,0,0,0-16Z"/></symbol>
  <symbol id="i-caret-right" viewBox="0 0 256 256" fill="currentColor"><path d="M184.49,136.49l-80,80a12,12,0,0,1-17-17L159,128,87.51,56.49a12,12,0,1,1,17-17l80,80A12,12,0,0,1,184.49,136.49Z"/></symbol>
</svg>
"""

# The internal mark: the Gushwork symbol knocked out in white on a black rounded square,
# which is the app-icon form Utsav uses — not the bare brand-blue symbol, which disappears
# against a light browser chrome at 16px. Composed from assets/logo/gushwork-symbol-white.svg
# with its five nested Figma <g> layer wrappers stripped; the two paths are untouched, the
# square is --gw-color-black at --gw-radius-20, and the symbol sits at 52% centred.
# Inlined as a data URI rather than linked so it cannot 404 on a host that did not copy
# assets/. scripts/_favicon.txt holds the same string for the hand-maintained sheets.
FAVICON = (
    "data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%"
    "22%20viewBox%3D%220%200%2080%2080%22%3E%3Crect%20width%3D%2280%22%20height%3"
    "D%2280%22%20rx%3D%2220%22%20fill%3D%22%230d0d0d%22%2F%3E%3Cg%20transform%3D%"
    "22translate%2819.2%2019.2%29%20scale%280.52%29%22%3E%3Cpath%20d%3D%22M76.608"
    "8%204.56344C77.5025%202.36058%2075.8495%200%2073.4723%200H9.14286C4.0934%200"
    "%200%204.0934%200%209.14286V66.7778C0%2072.018%205.17081%2075.6829%209.9603%"
    "2073.5568C40.8494%2059.8449%2064.3785%2034.7075%2076.6088%204.56344Z%22%20fi"
    "ll%3D%22%23FFFFFF%22%2F%3E%3Cpath%20d%3D%22M32.5161%2080C31.4022%2080%2030.9"
    "357%2078.5531%2031.8259%2077.8835C54.9007%2060.5265%2071.4338%2035.8047%2078"
    ".7658%208.0522C78.9403%207.39154%2080%207.51618%2080%208.19951V70.8571C80%20"
    "75.9066%2075.9066%2080%2070.8571%2080H32.5161Z%22%20fill%3D%22%23FFFFFF%22%2"
    "F%3E%3C%2Fg%3E%3C%2Fsvg%3E"
)

# Scroll-spy for the release index. The version whose release sits at the top of the page
# goes semibold, and the index scrolls to keep it in view — at thirty-eight entries the
# active row is otherwise often off its own scroll box.
SPY = """
<script>
(function () {
  var links = Array.prototype.slice.call(document.querySelectorAll('.idx a'));
  if (!links.length) return;
  var idx = document.querySelector('.idx');
  var arts = links.map(function (a) { return document.getElementById(a.getAttribute('href').slice(1)); });
  var active = 0;

  function update() {
    // Releases are in DOM order, newest first, so the last one whose top has passed the
    // band is the one being read. Once one fails, every later one fails too.
    var best = 0;
    for (var i = 0; i < arts.length; i++) {
      if (arts[i] && arts[i].getBoundingClientRect().top <= 80) best = i; else break;
    }
    if (best === active && links[active].classList.contains('now')) return;
    links[active].classList.remove('now');
    links[best].classList.add('now');
    active = best;

    var l = links[best].getBoundingClientRect(), box = idx.getBoundingClientRect();
    if (l.top < box.top + 24) idx.scrollTop -= (box.top + 24 - l.top);
    else if (l.bottom > box.bottom - 8) idx.scrollTop += (l.bottom - box.bottom + 8);
  }

  var ticking = false;
  addEventListener('scroll', function () {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () { ticking = false; update(); });
  }, { passive: true });
  addEventListener('resize', update, { passive: true });
  update();

  /* The styleguide draws a collapse caret on the rail, so it works here.
     Collapsed, the rail keeps its header row and drops the 46 anchors. */
  var col = document.querySelector('[data-idx-collapse]');
  if (col && idx) {
    col.addEventListener('click', function () {
      var next = idx.getAttribute('data-collapsed') !== 'true';
      idx.setAttribute('data-collapsed', next ? 'true' : 'false');
      col.setAttribute('aria-expanded', next ? 'false' : 'true');
      col.setAttribute('aria-label',
        next ? 'Expand the release list' : 'Collapse the release list');
    });
  }
})();
</script>
"""


def main():
    rows = read_rows()
    if not rows:
        sys.exit("no releases on stdin")

    # The meta line, in the install page's shape: version, then when it shipped, to the
    # minute. `date` arrives as "01 Sep 2026 19:53" (scripts/_releases.sh formats it), so the
    # comma is inserted rather than the time re-derived. total / first_date went with the
    # facts strip they were computed for.
    current = rows[0]["version"]
    _d, _t = rows[0]["date"].rsplit(" ", 1)
    last_stamp = "%s, %s" % (_d, _t)

    P = []
    w = P.append

    w("<!doctype html>")
    w('<html lang="en"><head><meta charset="utf-8">')
    w('<meta name="viewport" content="width=device-width, initial-scale=1">')
    w("<title>Gushwork design system — changelog</title>")
    w('<link rel="icon" type="image/svg+xml" href="%s">' % FAVICON)
    w('<link rel="stylesheet" href="../foundation/tokens.css">')
    w("<style>%s</style></head>" % CSS)
    w("<body>")
    w(SPRITE.strip())
    w('<div class="page">')
    w('  <header class="hd">')
    w("    <h1>Changelog</h1>")
    # One paragraph: what the page is and where it comes from — they are the same thought,
    # and splitting them made the header a list of one-line paragraphs. The Claude Code changelog has a
    # third — "run claude --version to check your installed version" — and we dropped ours.
    # It needs that line because nothing tells you otherwise; since v1.41.0 the session-start
    # hook tells you when you are behind and names what changed, so a manual check is not the
    # reader's job any more. Verifying an install is the install page's subject, and it covers
    # it properly there; the `claude plugin list` caveat is in README.md.

    # "Last updated" sits LAST, above the rule — the install page's order: title, then the
    # prose, then the small print. On the styleguide it follows the title directly, but that
    # header is only a title and a date; here it would interrupt three lines that read as one.
    w('    <p class="hd__meta"><strong>v%s</strong> · last updated %s</p>'
      % (html.escape(current), html.escape(last_stamp)))
    w("  </header>")
    w("  <main>")
    w('    <section class="intro"><p class="lede">Release notes for the Gushwork design system, including new')
    # Only the FILENAME is the link. "CHANGELOG.md on GitHub" as one anchor is a 234px
    # unbreakable unit — it cannot split at the line end, so it was pushed onto a line of its
    # own every time, which is the separate line folding it in was meant to remove.
    w("       components, corrected measurements, and rulings by version. This page is")
    w('       generated from <a class="lnk" href="%s/blob/main/CHANGELOG.md"%s>CHANGELOG.md</a>'
      % (REPO, NEWTAB))
    w("       on GitHub.</p></section>")


    for i, r in enumerate(rows):
        bs = blocks(r["body"])
        lead, rest = (bs[:1], bs[1:]) if bs else ([], [])
        day, _, clock = r["date"].rpartition(" ")

        if i == 0:
            pill_cls, tag = "pill pill--now", '<span class="tag">current</span>'
        else:
            pill_cls = "pill"
            tag = "" if r["version"].endswith(".0") else '<span class="tag">patch</span>'

        w('    <article class="rel" id="%s">' % anchor(r["version"]))
        w('      <div class="rail">')
        w('        <span class="%s">v%s</span>' % (pill_cls, html.escape(r["version"])))
        w('        <span class="when">%s</span>' % html.escape(day))
        w('        <span class="when">%s</span>' % html.escape(clock))
        if tag:
            w("        %s" % tag)
        w("      </div>")
        w('      <div class="body">')
        w('        <p class="body__sum">%s</p>' % inline(r["summary"]))
        if lead:
            w('        <div class="prose">%s</div>' % render(lead))
        if rest:
            w("        <details>")
            w('          <summary>Full notes<svg class="gl"><use href="#i-caret"/></svg></summary>')
            w('          <div class="prose">%s</div>' % render(rest))
            w("        </details>")
        w('        <div class="meta">')
        w(
            '          <a class="meta__l" href="%s/commit/%s"%s>'
            '<svg class="gl"><use href="#i-commit"/></svg>%s</a>'
            % (REPO, r["sha"], NEWTAB, r["sha"][:7])
        )
        w("          %s" % session_cell(r["session"]))
        w("        </div>")
        w("      </div>")
        w("    </article>")

    w("  </main>")
    # The styleguide's "On this page" rail: a collapse caret, the List glyph,
    # the label, then the indented list of anchors.
    w('  <nav class="idx" aria-label="Releases" data-collapsed="false">')
    w('    <div class="idx__t">')
    w('      <button class="idx__col" type="button" data-idx-collapse')
    w('              aria-expanded="true" aria-controls="idx-list"')
    w('              aria-label="Collapse the release list">')
    w('        <svg><use href="#i-caret-right"/></svg></button>')
    w('      <svg class="idx__ico"><use href="#i-list"/></svg>')
    w("      <span>On this page</span>")
    w("    </div>")
    w('    <div class="idx__list" id="idx-list">')
    for i, r in enumerate(rows):
        w(
            '      <a class="%s" href="#%s">v%s</a>'
            % ("now" if i == 0 else "", anchor(r["version"]), html.escape(r["version"]))
        )
    w("    </div>")
    w("  </nav>")

    # No footer note. It explained the sheet's own derivation to an audience that came here
    # to read what changed, and its lead sentence went stale the moment changelog.sh was
    # fixed — both logs now carry the same count, so it read "carried 39 of them and
    # silently dropped v1.20.0", which is nonsense. That history belongs in CONTRIBUTING.md,
    # where maintainers look, and it is there.
    w("</div>")
    w(SPY.strip())
    w("</body></html>")

    sys.stdout.write("\n".join(P) + "\n")


if __name__ == "__main__":
    main()
