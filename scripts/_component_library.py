#!/usr/bin/env python3
"""Render preview/component-library.html — the visual library.

DERIVED. Every value, every usage rule and every caveat on the page is parsed out of
the files the skills already build from. Nothing here is typed by hand:

    foundation/tokens.css                  tokens, their group notes, the gap list
    foundation/*.md                        the written rules
    fonts/*.ttf                            the faces themselves
    exports/<surface>/component-registry.json   the component inventory + review state
    skills/*/SKILL.md                      which components each surface actually offers

WHY DERIVED AND NOT AUTHORED. The repo already had four pages describing the library --
style-guide, catalogue, component-sheet, review-sheet -- and they disagreed, because each
one restated values a human had copied across. A fifth hand-written page would be a fifth
copy to drift. This one cannot disagree with tokens.css, because it has no values of its own.

TWO AXES, KEPT SEPARATE. The old review sheet conflated them and that is why it could not
close the 15 Sep gate:

    provenance  where the value came from  -- DERIVED from the source's own notes
                measured | transcribed | ruled
    review      whether Utsav has passed it -- READ from the registry's `foundations` block
                passed | pending

A thing can be measured and unreviewed, or ruled and passed. They are not the same question.

THE GOTCHA THAT EATS GENERATORS. tokens.css note 11: some names are declared twice, once in
:root and again inside a media query. `dict(re.findall(...))` takes the last and silently
emits --gw-motion-fast: 0ms for everyone. FIRST occurrence wins here; the media-query values
are kept alongside as named contexts, which is also what makes the Desktop/Phone
breakpoint table possible.

Usage:  python3 scripts/_component_library.py            # writes preview/component-library.html
"""

import hashlib
import json
import os
import re
import sys
from datetime import date

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.environ.get("OUT", os.path.join(ROOT, "preview", "component-library.html"))


# ---------------------------------------------------------------------------
# 1. Parse tokens.css
# ---------------------------------------------------------------------------

class Token:
    __slots__ = ("name", "value", "comment", "context", "group", "sub")

    def __init__(self, name, value, comment, context, group, sub):
        self.name, self.value, self.comment = name, value, comment
        self.context, self.group, self.sub = context, group, sub


class Sub:
    def __init__(self, title, note):
        self.title, self.note, self.tokens = title, note, []


class Group:
    def __init__(self, title, note):
        self.title, self.note, self.subs = title, note, []

    def sub(self, title, note=""):
        for s in self.subs:
            if s.title == title:
                return s
        s = Sub(title, note)
        self.subs.append(s)
        return s


DECL = re.compile(r"^\s*(--gw-[a-z0-9-]+)\s*:\s*(.+?);\s*(?:/\*(.*?)\*/)?\s*$")
BIG = re.compile(r"^\s*/\*\s*={10,}")
SUBH = re.compile(r"^\s*/\*\s*-{3}\s*(.+?)\s*-{3,}\s*(\*/)?\s*$")
MEDIA = re.compile(r"^\s*@media\s+(.+?)\s*\{")


def read_comment(lines, i):
    """Read a block comment starting at lines[i]. Returns (body_lines, next_i).

    Scans for the FIRST `*/` and stops. CSS comments do not nest, and counting
    `/*` openers is actively wrong here: Figma variable paths inside the prose
    -- `Colors/Primary/*`, `Heading/*`, `shadows/*` -- each read as an opener and
    send the scan past the end of the block, swallowing the rest of the file.
    """
    body = []
    while i < len(lines):
        body.append(lines[i])
        if "*/" in lines[i]:
            return body, i + 1
        i += 1
    return body, i


def clean_block(body):
    """Strip comment delimiters and rule lines; return (title, note)."""
    out = []
    for ln in body:
        s = ln.strip()
        s = re.sub(r"^/\*+", "", s)
        s = re.sub(r"\*+/$", "", s)
        s = s.strip()
        if not s or set(s) <= set("=-"):
            continue
        out.append(s)
    if not out:
        return "", ""
    return out[0], "\n".join(out[1:]).strip()


def parse_tokens_css(path):
    src = open(path, encoding="utf-8").read()
    lines = src.split("\n")
    groups, faces = [], []
    cur = Group("Preamble", "")
    groups.append(cur)
    cur_sub = None
    context = None          # None == :root
    brace_ctx = []          # stack of (depth_at_open, context)
    depth = 0
    seen = set()
    i = 0

    while i < len(lines):
        ln = lines[i]

        # @font-face — capture the declaration verbatim
        if ln.strip().startswith("@font-face"):
            blk, j = [], i
            while j < len(lines) and "}" not in lines[j]:
                blk.append(lines[j]); j += 1
            blk.append(lines[j] if j < len(lines) else "}")
            faces.append("\n".join(blk))
            i = j + 1
            continue

        m = MEDIA.match(ln)
        if m:
            brace_ctx.append((depth, context))
            context = m.group(1)
            depth += ln.count("{") - ln.count("}")
            cur_sub = None
            i += 1
            continue

        if BIG.match(ln):
            body, i = read_comment(lines, i)
            title, note = clean_block(body)
            cur = Group(title, note)
            groups.append(cur)
            cur_sub = None
            continue

        sm = SUBH.match(ln)
        if sm:
            title = sm.group(1).strip()
            if sm.group(2):                       # one-line  /* --- Radius --- */
                note = ""
            else:
                body, i2 = read_comment(lines, i)
                keep = []
                for raw in body[1:]:
                    t = raw.strip()
                    t = re.sub(r"^/\*+", "", t)
                    t = re.sub(r"\*+/$", "", t).strip()
                    if t and not set(t) <= set("=- "):
                        keep.append(t)
                note = "\n".join(keep).strip()
                i = i2
                cur_sub = cur.sub(title, note)
                continue
            cur_sub = cur.sub(title, note)
            i += 1
            continue

        if ln.strip().startswith("/*"):
            body, i = read_comment(lines, i)
            title, note = clean_block(body)
            if title and cur_sub is None and len(cur.subs) == 0 and not cur.note:
                cur.note = (title + "\n" + note).strip()
            continue

        dm = DECL.match(ln)
        if dm:
            name, value = dm.group(1), dm.group(2).strip()
            comment = (dm.group(3) or "").strip()
            sub = cur_sub or cur.sub("", "")
            key = (name, context)
            if key not in seen:
                seen.add(key)
                sub.tokens.append(Token(name, value, comment, context, cur, sub))
            i += 1
            continue

        depth += ln.count("{") - ln.count("}")
        while brace_ctx and depth <= brace_ctx[-1][0]:
            _, context = brace_ctx.pop()
        i += 1

    groups = [g for g in groups
              if (any(s.tokens for s in g.subs) or g.note) and g.title != "Preamble"]
    return groups, faces, src


# ---------------------------------------------------------------------------
# 2. Colour maths — so the page can state contrast instead of asserting it
# ---------------------------------------------------------------------------

def parse_hex(h):
    """#rgb | #rrggbb | #rrggbbaa -> (r, g, b, a). None if not a hex."""
    h = h.strip()
    if not h.startswith("#"):
        return None
    h = h[1:]
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
    if len(h) == 6:
        h += "ff"
    if len(h) != 8:
        return None
    try:
        return tuple(int(h[k:k + 2], 16) for k in (0, 2, 4, 6))
    except ValueError:
        return None


def composite(rgba, bg):
    r, g, b, a = rgba
    f = a / 255.0
    return tuple(round(c * f + d * (1 - f)) for c, d in zip((r, g, b), bg))


def luminance(rgb):
    def ch(c):
        c = c / 255.0
        return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
    r, g, b = (ch(c) for c in rgb)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def contrast(a, b):
    la, lb = luminance(a), luminance(b)
    hi, lo = max(la, lb), min(la, lb)
    return (hi + 0.05) / (lo + 0.05)


WHITE, BLACK = (255, 255, 255), (13, 13, 13)


def resolve(value, lookup, depth=0):
    """Resolve var() chains to a literal. Bounded, so a cycle cannot hang the build."""
    if depth > 8:
        return value
    m = re.fullmatch(r"var\((--gw-[a-z0-9-]+)\)", value.strip())
    if m and m.group(1) in lookup:
        return resolve(lookup[m.group(1)], lookup, depth + 1)
    return value


# ---------------------------------------------------------------------------
# 3. Provenance — DERIVED from what the source says about itself, never restated
# ---------------------------------------------------------------------------

def provenance(group, sub):
    """measured | transcribed | ruled, read out of the group's own note text.

    The rule is the file's own vocabulary, not a table kept here:
      * a group under the RULED banner, or whose note says 'Ruled by', is `ruled`
      * a note carrying a SOURCE NOTE about transcription is `transcribed`
      * everything else came out of the bound Figma variables -- `measured`
    """
    blob = f"{group.title}\n{group.note}\n{sub.title}\n{sub.note}"
    low = blob.lower()
    if group.title.startswith("RULED") or "ruled by" in low or "added by ruling" in low \
            or group.title.startswith("RESOLVED"):
        return "ruled"
    if "transcribed from" in low or "same caveat as breakpoint" in low:
        return "transcribed"
    return "measured"


PROV_RULE = {
    "measured": "Read off the bound Figma variables. Safe to build from.",
    "transcribed": "Taken from the master specification, not read back through the variable "
                   "API. A good first draft — verify before you rely on an exact figure.",
    "ruled": "Decided by the design owner because Figma had no answer. Authoritative, and "
             "to be mirrored into Figma when someone next opens the file.",
}


# ---------------------------------------------------------------------------
# 4. Review state — READ from the registry, never inferred
# ---------------------------------------------------------------------------

SURFACES = ["shared", "web", "dashboard", "lead-magnet", "slides", "ad-page"]


def load_registries():
    out = {}
    for s in SURFACES:
        p = os.path.join(ROOT, "exports", s, "component-registry.json")
        if os.path.isfile(p):
            try:
                out[s] = json.load(open(p, encoding="utf-8"))
            except json.JSONDecodeError as e:
                sys.stderr.write(f"  ! {s} registry is not valid JSON: {e}\n")
    return out


def slug(s):
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")[:60] or "x"


def review_of(block, key):
    """The registry's word on one entry. Absent means pending — never 'fine'."""
    r = (block or {}).get(key) or {}
    state = r.get("reviewed", "pending")
    if state not in ("passed", "pending", "rejected"):
        state = "pending"
    return {
        "state": state,
        "by": r.get("reviewedBy", ""),
        "on": r.get("reviewedOn", ""),
        "at": r.get("reviewedAt", ""),
        "note": r.get("note", ""),
    }


# ---------------------------------------------------------------------------
# 5. The page's own CSS. Written entirely in --gw-* and the shell's --s-*, so
#    this page obeys the same tokens it documents. No literal colour here.
# ---------------------------------------------------------------------------

CSS = """
.cl{--cl-gap:var(--gw-space-40)}
.cl h2{font:var(--gw-text-h5);color:var(--s-heading);margin:0}
.cl h3{font:var(--gw-text-h7);color:var(--s-heading);margin:0}
.cl h4{font:var(--gw-text-body-16-sem);color:var(--s-heading);margin:0}
.cl p{font:var(--gw-text-body-14-reg);letter-spacing:var(--gw-text-body-14-reg-tracking);
      color:var(--s-body);margin:0;max-width:78ch}
.cl code,.cl .mono{font-family:ui-monospace,"SF Mono",Menlo,monospace;font-size:12px}

/* --- page head ------------------------------------------------------------ */
.cl-head{display:flex;flex-direction:column;gap:var(--gw-space-16)}
.cl-head h1{font:var(--gw-text-h4);color:var(--s-heading);margin:0}
.cl-lede{font:var(--gw-text-body-18-reg);letter-spacing:var(--gw-text-body-18-reg-tracking);
         color:var(--s-body);margin:0;max-width:72ch}

/* --- the tally ------------------------------------------------------------ */
.cl-tally{display:flex;flex-wrap:wrap;gap:var(--gw-space-12)}
.cl-stat{flex:1 1 150px;background:var(--s-card-bg);border:1px solid var(--s-card-border);
         border-radius:var(--gw-radius-12);padding:var(--gw-space-16) var(--gw-space-20);
         display:flex;flex-direction:column;gap:var(--gw-space-4)}
.cl-stat b{font:var(--gw-text-h6);color:var(--s-heading);font-feature-settings:"tnum" 1}
.cl-stat span{font:var(--gw-text-body-12-med);color:var(--gw-color-neutral-400);
              text-transform:uppercase;letter-spacing:.06em}

/* --- review queue --------------------------------------------------------- */
.cl-queue{background:var(--s-card-bg);border:1px solid var(--gw-color-yellow-300);
          border-left:3px solid var(--gw-color-yellow-400);border-radius:var(--gw-radius-12);
          padding:var(--gw-space-20) var(--gw-space-24);display:flex;flex-direction:column;
          gap:var(--gw-space-12)}
.cl-queue h2{font:var(--gw-text-h7)}
.cl-queue ul{margin:0;padding-left:var(--gw-space-20);display:flex;flex-direction:column;
             gap:var(--gw-space-4)}
.cl-queue li{font:var(--gw-text-body-14-reg);color:var(--s-body)}
.cl-queue a{color:var(--gw-color-primary-600);text-decoration:none}
.cl-queue a:hover{text-decoration:underline}
.cl-pass{background:var(--s-card-bg);border:1px solid var(--gw-color-green-300);
         border-left:3px solid var(--gw-color-green-400)}

/* --- controls ------------------------------------------------------------- */
.cl-bar{position:sticky;top:0;z-index:5;background:var(--s-page-bg);
        padding:var(--gw-space-12) 0;display:flex;flex-wrap:wrap;gap:var(--gw-space-8);
        align-items:center;border-bottom:1px solid var(--s-chrome-border)}
.cl-find{flex:1 1 220px;min-width:180px;background:var(--s-field-bg);
         border:1px solid var(--s-field-border);border-radius:var(--gw-radius-10);
         padding:var(--gw-space-8) var(--gw-space-12);font:var(--gw-text-body-14-reg);
         color:var(--s-heading)}
.cl-find::placeholder{color:var(--s-placeholder)}
.cl-find:focus{outline:var(--gw-focus-ring);outline-offset:var(--gw-focus-offset)}
.cl-filter{display:flex;gap:var(--gw-space-4);flex-wrap:wrap}
.cl-f{font:var(--gw-text-body-12-med);color:var(--s-body);background:transparent;
      border:1px solid var(--s-field-border);border-radius:var(--gw-radius-full);
      padding:6px var(--gw-space-12);cursor:pointer}
.cl-f:hover{border-color:var(--gw-color-primary-500)}
.cl-f[aria-pressed="true"]{background:var(--gw-color-black);color:var(--gw-color-white);
                           border-color:var(--gw-color-black)}
.cl-f:focus-visible{outline:var(--gw-focus-ring);outline-offset:var(--gw-focus-offset)}
.cl-count{font:var(--gw-text-body-12-reg);color:var(--gw-color-neutral-400);margin-left:auto}

/* --- sections ------------------------------------------------------------- */
.cl-sec{display:flex;flex-direction:column;gap:var(--gw-space-20);
        scroll-margin-top:var(--gw-space-80)}
.cl-sec[hidden]{display:none}
.cl-sechead{display:flex;flex-wrap:wrap;align-items:baseline;gap:var(--gw-space-12)}
.cl-note{font:var(--gw-text-body-14-reg);letter-spacing:var(--gw-text-body-14-reg-tracking);
         color:var(--s-body);background:var(--gw-color-neutral-25);
         border:1px solid var(--s-card-border);border-left:3px solid var(--gw-color-neutral-300);
         border-radius:var(--gw-radius-8);padding:var(--gw-space-12) var(--gw-space-16);
         white-space:pre-wrap;max-width:88ch}
:root[data-theme="dark"] .cl-note{background:var(--gw-color-neutral-900)}
.cl-sub{display:flex;flex-direction:column;gap:var(--gw-space-12)}
.cl-sub[hidden]{display:none}

/* --- chips ---------------------------------------------------------------- */
.cl-chip{display:inline-flex;align-items:center;gap:6px;font:var(--gw-text-body-12-med);
         border-radius:var(--gw-radius-full);padding:3px var(--gw-space-8);white-space:nowrap}
.cl-chip--measured{background:var(--gw-color-green-50);color:var(--gw-color-green-700)}
.cl-chip--transcribed{background:var(--gw-color-yellow-50);color:var(--gw-color-yellow-700)}
.cl-chip--ruled{background:var(--gw-color-primary-50);color:var(--gw-color-primary-700)}
.cl-chip--passed{background:var(--gw-color-green-500);color:var(--gw-color-white)}
.cl-chip--pending{background:var(--gw-color-neutral-100);color:var(--gw-color-neutral-700)}
.cl-chip--rejected{background:var(--gw-color-red-500);color:var(--gw-color-white)}
.cl-chip--gap{background:var(--gw-color-red-50);color:var(--gw-color-red-700)}
:root[data-theme="dark"] .cl-chip--measured{background:var(--gw-color-green-900);
                                            color:var(--gw-color-green-200)}
:root[data-theme="dark"] .cl-chip--transcribed{background:var(--gw-color-yellow-900);
                                               color:var(--gw-color-yellow-100)}
:root[data-theme="dark"] .cl-chip--ruled{background:var(--gw-color-primary-900);
                                         color:var(--gw-color-primary-200)}
:root[data-theme="dark"] .cl-chip--pending{background:var(--gw-color-neutral-800);
                                           color:var(--gw-color-neutral-300)}
:root[data-theme="dark"] .cl-chip--gap{background:var(--gw-color-red-900);
                                       color:var(--gw-color-red-200)}

/* --- colour --------------------------------------------------------------- */
.cl-ramp{display:grid;grid-template-columns:repeat(auto-fill,minmax(132px,1fr));
         gap:var(--gw-space-8)}
.cl-sw{background:var(--s-card-bg);border:1px solid var(--s-card-border);
       border-radius:var(--gw-radius-10);overflow:hidden;display:flex;flex-direction:column}
.cl-sw[hidden]{display:none}
.cl-sw__chip{height:64px;border-bottom:1px solid var(--s-card-border);
             background-image:linear-gradient(45deg,var(--gw-color-neutral-100) 25%,transparent 25%),
                              linear-gradient(-45deg,var(--gw-color-neutral-100) 25%,transparent 25%),
                              linear-gradient(45deg,transparent 75%,var(--gw-color-neutral-100) 75%),
                              linear-gradient(-45deg,transparent 75%,var(--gw-color-neutral-100) 75%);
             background-size:12px 12px;
             background-position:0 0,0 6px,6px -6px,-6px 0}
.cl-sw__fill{width:100%;height:100%}
.cl-sw__body{padding:var(--gw-space-8) var(--gw-space-12);display:flex;
             flex-direction:column;gap:3px}
.cl-sw__name{font-family:ui-monospace,"SF Mono",Menlo,monospace;font-size:11px;
             color:var(--s-heading);word-break:break-all;line-height:1.35}
.cl-sw__hex{font-family:ui-monospace,"SF Mono",Menlo,monospace;font-size:11px;
            color:var(--gw-color-neutral-400);text-transform:uppercase}
.cl-sw__ac{display:flex;gap:4px;margin-top:2px}
.cl-ac{font-size:9.5px;font-weight:600;letter-spacing:.04em;border-radius:var(--gw-radius-4);
       padding:1px 4px;line-height:1.5}
.cl-ac--ok{background:var(--gw-color-green-50);color:var(--gw-color-green-700)}
.cl-ac--no{background:var(--gw-color-red-50);color:var(--gw-color-red-700)}
:root[data-theme="dark"] .cl-ac--ok{background:var(--gw-color-green-900);color:var(--gw-color-green-200)}
:root[data-theme="dark"] .cl-ac--no{background:var(--gw-color-red-900);color:var(--gw-color-red-200)}

/* --- type ----------------------------------------------------------------- */
.cl-types{display:flex;flex-direction:column;gap:2px}
.cl-t{display:grid;grid-template-columns:minmax(0,1fr) 240px;gap:var(--gw-space-20);
      align-items:start;background:var(--s-card-bg);border:1px solid var(--s-card-border);
      border-radius:var(--gw-radius-10);padding:var(--gw-space-16) var(--gw-space-20)}
.cl-t[hidden]{display:none}
.cl-t__spec{color:var(--s-heading);min-width:0;overflow-wrap:anywhere}
.cl-t__meta{display:flex;flex-direction:column;gap:2px;text-align:right}
.cl-t__name{font-family:ui-monospace,"SF Mono",Menlo,monospace;font-size:11.5px;
            color:var(--gw-color-primary-600)}
.cl-t__val{font-family:ui-monospace,"SF Mono",Menlo,monospace;font-size:10.5px;
           color:var(--gw-color-neutral-400);line-height:1.5}
@media (max-width:860px){.cl-t{grid-template-columns:1fr}.cl-t__meta{text-align:left}}

/* --- faces ---------------------------------------------------------------- */
.cl-faces{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));
          gap:var(--gw-space-16)}
.cl-face{background:var(--s-card-bg);border:1px solid var(--s-card-border);
         border-radius:var(--gw-radius-12);padding:var(--gw-space-24);
         display:flex;flex-direction:column;gap:var(--gw-space-12)}
.cl-face__aa{font-size:52px;line-height:1.05;color:var(--s-heading)}
.cl-face__wt{display:flex;flex-direction:column;gap:2px}
.cl-face__wt span{color:var(--s-heading);font-size:19px;line-height:1.45}

/* --- space / radius / shadow ---------------------------------------------- */
.cl-rows{display:flex;flex-direction:column;gap:6px}
.cl-row{display:grid;grid-template-columns:132px minmax(0,1fr) 60px;gap:var(--gw-space-16);
        align-items:center;background:var(--s-card-bg);border:1px solid var(--s-card-border);
        border-radius:var(--gw-radius-8);padding:var(--gw-space-8) var(--gw-space-16)}
.cl-row[hidden]{display:none}
.cl-row__n{font-family:ui-monospace,"SF Mono",Menlo,monospace;font-size:11.5px;
           color:var(--gw-color-primary-600);word-break:break-all}
.cl-row__v{font-family:ui-monospace,"SF Mono",Menlo,monospace;font-size:11.5px;
           color:var(--gw-color-neutral-400);text-align:right}
.cl-bararea{min-height:18px;display:flex;align-items:center}
.cl-barfill{height:16px;background:var(--gw-color-primary-500);border-radius:var(--gw-radius-2);
            max-width:100%}
.cl-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(118px,1fr));
         gap:var(--gw-space-12)}
.cl-tile{background:var(--s-card-bg);border:1px solid var(--s-card-border);
         border-radius:var(--gw-radius-10);padding:var(--gw-space-16);display:flex;
         flex-direction:column;align-items:center;gap:var(--gw-space-8)}
.cl-tile[hidden]{display:none}
.cl-tile__demo{width:72px;height:72px;background:var(--gw-color-primary-100);
               border:1.5px solid var(--gw-color-primary-500)}
.cl-tile__sh{width:100%;height:64px;background:var(--gw-color-white);
             border-radius:var(--gw-radius-8)}
:root[data-theme="dark"] .cl-tile__sh{background:var(--gw-color-neutral-800)}
/* The alpha checker is drawn in neutral-100, which is near-white and shouts on a
   black ground. Same job, quieter, in dark. */
:root[data-theme="dark"] .cl-sw__chip{
  background-image:linear-gradient(45deg,var(--gw-color-neutral-800) 25%,transparent 25%),
                   linear-gradient(-45deg,var(--gw-color-neutral-800) 25%,transparent 25%),
                   linear-gradient(45deg,transparent 75%,var(--gw-color-neutral-800) 75%),
                   linear-gradient(-45deg,transparent 75%,var(--gw-color-neutral-800) 75%)}

/* --- tables --------------------------------------------------------------- */
.cl-tbl{width:100%;border-collapse:collapse;background:var(--s-card-bg);
        border:1px solid var(--s-card-border);border-radius:var(--gw-radius-10);
        overflow:hidden;font:var(--gw-text-body-14-reg)}
.cl-tblwrap{overflow-x:auto}
.cl-tbl th{text-align:left;font:var(--gw-text-body-12-med);text-transform:uppercase;
           letter-spacing:.06em;color:var(--gw-color-neutral-400);
           padding:var(--gw-space-8) var(--gw-space-16);
           border-bottom:1px solid var(--s-card-border);white-space:nowrap}
.cl-tbl td{padding:var(--gw-space-8) var(--gw-space-16);color:var(--s-body);
           border-bottom:1px solid var(--s-card-border);vertical-align:top}
.cl-tbl tr:last-child td{border-bottom:none}
.cl-tbl tr[hidden]{display:none}
.cl-tbl .mono{color:var(--gw-color-primary-600)}
.cl-tbl .num{font-feature-settings:"tnum" 1;white-space:nowrap}

/* --- gaps ----------------------------------------------------------------- */
.cl-gaps{display:flex;flex-direction:column;gap:var(--gw-space-8)}
.cl-gap{display:grid;grid-template-columns:28px minmax(0,1fr);gap:var(--gw-space-12);
        background:var(--s-card-bg);border:1px solid var(--s-card-border);
        border-left:3px solid var(--gw-color-red-400);border-radius:var(--gw-radius-8);
        padding:var(--gw-space-12) var(--gw-space-16)}
.cl-gap__n{font:var(--gw-text-body-14-sem);color:var(--gw-color-red-500);
           font-feature-settings:"tnum" 1}
.cl-gap__t{font:var(--gw-text-body-14-reg);letter-spacing:var(--gw-text-body-14-reg-tracking);
           color:var(--s-body);white-space:pre-wrap;margin:0}

/* --- use-case cards ------------------------------------------------------- */
.cl-cases{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));
          gap:var(--gw-space-12)}
.cl-case{background:var(--s-card-bg);border:1px solid var(--s-card-border);
         border-radius:var(--gw-radius-12);padding:var(--gw-space-20);
         display:flex;flex-direction:column;gap:var(--gw-space-8)}
.cl-case__n{display:flex;align-items:baseline;justify-content:space-between;gap:var(--gw-space-8)}
.cl-case__list{margin:0;padding:0;list-style:none;display:flex;flex-wrap:wrap;gap:4px}
.cl-case__list li{font-family:ui-monospace,"SF Mono",Menlo,monospace;font-size:10.5px;
                  color:var(--gw-color-neutral-600);background:var(--gw-color-neutral-25);
                  border:1px solid var(--s-card-border);border-radius:var(--gw-radius-4);
                  padding:1px 5px}
:root[data-theme="dark"] .cl-case__list li{background:var(--gw-color-neutral-900)}

/* --- misc ----------------------------------------------------------------- */
.cl-src{display:flex;flex-wrap:wrap;gap:var(--gw-space-8)}
.cl-src code{background:var(--s-code-bg);border:1px solid var(--s-code-border);
             color:var(--s-code-fg);border-radius:var(--gw-radius-4);padding:2px 7px}
.cl-empty{font:var(--gw-text-body-14-reg);color:var(--gw-color-neutral-400);
          border:1px dashed var(--s-field-border);border-radius:var(--gw-radius-10);
          padding:var(--gw-space-24);text-align:center}
.cl-jump{display:flex;flex-wrap:wrap;gap:6px}
.cl-jump a{font:var(--gw-text-body-12-med);color:var(--s-body);text-decoration:none;
           border:1px solid var(--s-field-border);border-radius:var(--gw-radius-full);
           padding:5px var(--gw-space-12)}
.cl-jump a:hover{border-color:var(--gw-color-primary-500);color:var(--gw-color-primary-600)}
@media print{.cl-bar,.cl-jump{display:none}}
"""


# ---------------------------------------------------------------------------
# 6. Renderers
# ---------------------------------------------------------------------------

def esc(s):
    return (str(s).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
            .replace('"', "&quot;"))


def kind(name):
    if name.startswith("--gw-color-"):
        return "color"
    if name.startswith("--gw-font-"):
        return "family"
    if name.startswith("--gw-text-"):
        return "tracking" if name.endswith("-tracking") else "type"
    if name.startswith("--gw-space-"):
        return "space"
    if name.startswith("--gw-radius-"):
        return "radius"
    if name.startswith("--gw-shadow-"):
        return "shadow"
    if name.startswith("--gw-bp-") or name.startswith("--gw-content-"):
        return "bp"
    return "value"


# Specimen copy. Sentence case, no full stops in headings -- the same rule the
# skill applies to every Gushwork surface, applied to its own documentation.
SAMPLE = {
    "h": "The AI marketing team that ranks",
    "body": "Gushwork researches, writes and publishes content that ranks across AI search "
            "and traditional search, then pipes qualified leads to your inbox.",
    "button": "Book a Demo",
    "link": "Calculate ROI with Gushwork",
    "slide": "Where the pipeline comes from",
}


def sample_for(name):
    if "-slide-" in name:
        return SAMPLE["slide"]
    if "-button-" in name:
        return SAMPLE["button"]
    if "-link-" in name:
        return SAMPLE["link"]
    if re.search(r"--gw-text-h\d", name):
        return SAMPLE["h"]
    return SAMPLE["body"]


def chip(cls, label, title=""):
    t = f' title="{esc(title)}"' if title else ""
    return f'<span class="cl-chip cl-chip--{cls}"{t}>{esc(label)}</span>'


def state_chips(prov, rev):
    out = chip(prov, prov, PROV_RULE[prov])
    st = rev["state"]
    who = ""
    if st == "passed":
        who = f'passed {rev["on"]}'.strip()
        if rev["by"]:
            who += f' by {rev["by"]}'
    label = "passed" if st == "passed" else ("rejected" if st == "rejected" else "not reviewed")
    return out + chip(st, label, who or "Has not been through a review pass")


def render_color(tokens, lookup):
    cells = []
    for t in tokens:
        lit = resolve(t.value, lookup)
        rgba = parse_hex(lit)
        if rgba:
            ow = composite(rgba, WHITE)
            ob = composite(rgba, BLACK)
            cw, cb = contrast(ow, WHITE), contrast(ob, BLACK)
            # Contrast of the colour used AS TEXT, on white and on black grounds.
            ac = (f'<span class="cl-ac cl-ac--{"ok" if cw >= 4.5 else "no"}">'
                  f'{cw:.1f}:1 on white</span>'
                  f'<span class="cl-ac cl-ac--{"ok" if cb >= 4.5 else "no"}">'
                  f'{cb:.1f}:1 on black</span>')
            shown = lit.upper()
        else:
            ac, shown = "", esc(lit)
        q = f"{t.name} {shown} {t.comment}".lower()
        cells.append(
            f'<div class="cl-sw" data-q="{esc(q)}">'
            f'<div class="cl-sw__chip"><div class="cl-sw__fill" '
            f'style="background:{esc(t.value)}"></div></div>'
            f'<div class="cl-sw__body"><span class="cl-sw__name">{esc(t.name)}</span>'
            f'<span class="cl-sw__hex">{esc(shown)}</span>'
            f'<span class="cl-sw__ac">{ac}</span></div></div>')
    return '<div class="cl-ramp">' + "".join(cells) + "</div>"


def render_type(tokens, tracking):
    rows = []
    for t in tokens:
        tr = tracking.get(t.name + "-tracking")
        style = f"font:{t.value};"
        if tr:
            style += f"letter-spacing:{tr};"
        q = f"{t.name} {t.value} {tr or ''}".lower()
        trline = (f'<span class="cl-t__val">letter-spacing {esc(tr)}</span>' if tr else
                  '<span class="cl-t__val">no tracking token</span>')
        rows.append(
            f'<div class="cl-t" data-q="{esc(q)}">'
            f'<div class="cl-t__spec" style="{esc(style)}">{esc(sample_for(t.name))}</div>'
            f'<div class="cl-t__meta"><span class="cl-t__name">{esc(t.name)}</span>'
            f'<span class="cl-t__val">{esc(t.value)}</span>{trline}</div></div>')
    return '<div class="cl-types">' + "".join(rows) + "</div>"


def render_space(tokens):
    px = []
    for t in tokens:
        m = re.match(r"([\d.]+)px", t.value)
        px.append(float(m.group(1)) if m else 0.0)
    top = max(px) or 1.0
    rows = []
    for t, v in zip(tokens, px):
        w = max(2.0, v / top * 100.0)
        q = f"{t.name} {t.value}".lower()
        rows.append(
            f'<div class="cl-row" data-q="{esc(q)}">'
            f'<span class="cl-row__n">{esc(t.name)}</span>'
            f'<span class="cl-bararea"><span class="cl-barfill" '
            f'style="width:{w:.2f}%"></span></span>'
            f'<span class="cl-row__v">{esc(t.value)}</span></div>')
    return '<div class="cl-rows">' + "".join(rows) + "</div>"


def render_radius(tokens):
    tiles = []
    for t in tokens:
        q = f"{t.name} {t.value}".lower()
        tiles.append(
            f'<div class="cl-tile" data-q="{esc(q)}">'
            f'<div class="cl-tile__demo" style="border-radius:{esc(t.value)}"></div>'
            f'<span class="cl-row__n">{esc(t.name)}</span>'
            f'<span class="cl-row__v">{esc(t.value)}</span></div>')
    return '<div class="cl-grid">' + "".join(tiles) + "</div>"


def render_shadow(tokens):
    tiles = []
    for t in tokens:
        q = f"{t.name} {t.value} {t.comment}".lower()
        note = (f'<span class="cl-row__v">{esc(t.comment)}</span>' if t.comment else "")
        tiles.append(
            f'<div class="cl-tile" data-q="{esc(q)}" style="min-width:190px">'
            f'<div class="cl-tile__sh" style="box-shadow:{esc(t.value)}"></div>'
            f'<span class="cl-row__n">{esc(t.name)}</span>'
            f'<span class="cl-row__v" style="font-size:10px;text-align:center">'
            f'{esc(t.value)}</span>{note}</div>')
    return ('<div class="cl-grid" style="grid-template-columns:'
            'repeat(auto-fill,minmax(200px,1fr))">' + "".join(tiles) + "</div>")


def render_bp(tokens, phone):
    """Desktop beside Phone. Every --gw-bp-* has both modes; that IS the system."""
    rows = []
    for t in tokens:
        ph = phone.get(t.name)
        q = f"{t.name} {t.value} {ph or ''}".lower()
        note = f'<br><span class="cl-row__v">{esc(t.comment)}</span>' if t.comment else ""
        rows.append(
            f'<tr data-q="{esc(q)}"><td class="mono">{esc(t.name)}</td>'
            f'<td class="num">{esc(t.value)}{note}</td>'
            f'<td class="num">{esc(ph) if ph else "&mdash;"}</td></tr>')
    return ('<div class="cl-tblwrap"><table class="cl-tbl"><thead><tr>'
            '<th>Token</th><th>Desktop</th><th>Phone &lt;768</th>'
            "</tr></thead><tbody>" + "".join(rows) + "</tbody></table></div>")


def render_value(tokens):
    rows = []
    for t in tokens:
        q = f"{t.name} {t.value} {t.comment}".lower()
        note = f'<td>{esc(t.comment)}</td>' if any(x.comment for x in tokens) else ""
        rows.append(f'<tr data-q="{esc(q)}"><td class="mono">{esc(t.name)}</td>'
                    f'<td class="num">{esc(t.value)}</td>{note}</tr>')
    head = ("<th>Token</th><th>Value</th>" +
            ("<th>Note</th>" if any(x.comment for x in tokens) else ""))
    return ('<div class="cl-tblwrap"><table class="cl-tbl"><thead><tr>' + head +
            "</tr></thead><tbody>" + "".join(rows) + "</tbody></table></div>")


def render_family(tokens):
    cards = []
    for t in tokens:
        q = f"{t.name} {t.value}".lower()
        cards.append(
            f'<div class="cl-face" data-q="{esc(q)}">'
            f'<div class="cl-face__aa" style="font-family:{esc(t.value)}">Aa Gg 0123</div>'
            f'<span class="cl-row__n">{esc(t.name)}</span>'
            f'<span class="cl-row__v" style="text-align:left">{esc(t.value)}</span></div>')
    return '<div class="cl-faces">' + "".join(cards) + "</div>"


def parse_faces(face_blocks):
    """family -> {weights, styles, files} straight out of the @font-face rules."""
    out = {}
    for blk in face_blocks:
        fam = re.search(r"font-family:\s*'([^']+)'", blk)
        src = re.search(r"url\('([^']+)'\)", blk)
        wt = re.search(r"font-weight:\s*(\d+)\s+(\d+)", blk)
        st = re.search(r"font-style:\s*(\w+)", blk)
        if not fam:
            continue
        e = out.setdefault(fam.group(1), {"lo": None, "hi": None, "styles": [], "files": []})
        if wt:
            e["lo"], e["hi"] = int(wt.group(1)), int(wt.group(2))
        if st:
            e["styles"].append(st.group(1))
        if src:
            e["files"].append(os.path.basename(src.group(1)))
    return out


def render_faces(faces, note):
    """Specimens at the real axis range. The clamp is SHOWN, not asserted:
    a row is drawn at each weight the axis actually carries."""
    cards = []
    for fam, e in faces.items():
        lo, hi = e["lo"] or 400, e["hi"] or 400
        steps = [w for w in (100, 200, 300, 400, 500, 600, 700, 800, 900) if lo <= w <= hi]
        rows = "".join(
            f'<span style="font-family:\'{esc(fam)}\',sans-serif;font-weight:{w}">'
            f'{w} &mdash; {esc(SAMPLE["h"])}</span>' for w in steps)
        files = ", ".join(e["files"])
        italic = "roman + italic" if "italic" in e["styles"] else "roman only"
        q = f"{fam} {files} {lo} {hi}".lower()
        cards.append(
            f'<div class="cl-face" data-q="{esc(q)}">'
            f'<div class="cl-face__aa" style="font-family:\'{esc(fam)}\',sans-serif;'
            f'font-weight:{hi}">{esc(fam)}</div>'
            f'<p>Variable, weight {lo}&ndash;{hi} &middot; {esc(italic)}</p>'
            f'<div class="cl-face__wt">{rows}</div>'
            f'<span class="cl-row__v" style="text-align:left">{esc(files)}</span></div>')
    body = '<div class="cl-faces">' + "".join(cards) + "</div>"
    return body


GAP_RE = re.compile(r"^\s*(\d+)\.\s+(.*)$")


def parse_gaps(note):
    """The numbered list inside KNOWN GAPS. Kept in file order, which is not
    numeric order -- 11 is written before 10 -- and that is preserved rather
    than tidied, because the numbers are referred to elsewhere by value."""
    items, cur = [], None
    for ln in note.split("\n"):
        m = GAP_RE.match(ln)
        if m:
            if cur:
                items.append(cur)
            cur = [m.group(1), m.group(2).strip()]
        elif cur is not None:
            t = ln.strip()
            if t:
                cur[1] += " " + t
    if cur:
        items.append(cur)
    return items


def render_gaps(items):
    out = []
    for num, text in items:
        out.append(f'<div class="cl-gap" data-q="{esc(text.lower())}">'
                   f'<span class="cl-gap__n">{esc(num)}</span>'
                   f'<p class="cl-gap__t">{esc(text)}</p></div>')
    return '<div class="cl-gaps">' + "".join(out) + "</div>"


# ---------------------------------------------------------------------------
# 7. Use cases — the component inventory, read from the registries
# ---------------------------------------------------------------------------

USE_CASES = [
    ("web", "Landing pages", "Public marketing surfaces — heroes, folds, pricing, "
                             "case studies, ad landers.", "gushwork-web"),
    ("dashboard", "Dashboards", "Logged-in product screens — KPI rows, tables, side nav, "
                                "filters, toasts.", "gushwork-dashboard"),
    ("lead-magnet", "Lead magnets", "The downloadable PDF behind an ad lander — covers, "
                                    "interiors, closers.", "gushwork-lead-magnet"),
    ("slides", "Slide decks", "Sales and discovery decks, 1920×1080.", "gushwork-slides"),
    ("shared", "Shared", "Held once and merged into every surface, so a change is "
                         "reported once rather than per surface.",
     "foundation/shared-components.md"),
]


def render_cases(reg):
    cards = []
    for key, title, what, owner in USE_CASES:
        block = reg.get(key) or {}
        comps = block.get("components") or {}
        passed = sum(1 for k in comps if review_of(block.get("review"), k)["state"] == "passed")
        names = sorted(comps)
        pills = "".join(f"<li>{esc(n)}</li>" for n in names[:18])
        more = (f'<li>+{len(names) - 18} more</li>' if len(names) > 18 else "")
        if not names:
            pills = '<li>no registry on this machine</li>'
        cards.append(
            f'<div class="cl-case" data-q="{esc((title + " " + what + " " + " ".join(names)).lower())}">'
            f'<div class="cl-case__n"><h4>{esc(title)}</h4>'
            f'<span class="cl-row__v">{len(names)} components</span></div>'
            f'<p>{esc(what)}</p>'
            f'<div>{chip("passed" if passed else "pending", f"{passed}/{len(names)} passed")}</div>'
            f'<ul class="cl-case__list">{pills}{more}</ul>'
            f'<span class="cl-row__v" style="text-align:left">{esc(owner)}</span></div>')
    return '<div class="cl-cases">' + "".join(cards) + "</div>"


# ---------------------------------------------------------------------------
# 9. Fingerprints — what makes a pass expire on its own
# ---------------------------------------------------------------------------

def fingerprint(text):
    """Whitespace-insensitive, so a reflowed comment does not expire a pass but a
    changed value does. Short: this is a change detector, not a signature."""
    return hashlib.sha256(re.sub(r"\s+", " ", text).strip().encode("utf-8")).hexdigest()[:16]


def group_fingerprints(groups=None):
    """key -> fingerprint of everything that group asserts.

    Covers the tokens AND their notes, because a usage rule is as reviewable as a
    hex: 'three series is the ceiling' is the reviewable part of the chart palette,
    not the three values under it.
    """
    if groups is None:
        groups, _, _ = parse_tokens_css(os.path.join(ROOT, "foundation", "tokens.css"))
    out = {}
    for g in groups:
        key = foundation_key(g.title)
        if not key:
            continue
        parts = [g.title, g.note]
        for s in g.subs:
            parts += [s.title, s.note]
            for t in s.tokens:
                parts.append(f"{t.name}:{t.value}:{t.context or ''}:{t.comment}")
        out[key] = fingerprint("\n".join(parts))
    return out


def component_fingerprint(surface, key, reg=None):
    """A component's spec doc plus its registry entry. Re-measuring the doc, or
    bumping the version, expires the pass."""
    reg = reg or load_registries()
    block = (reg.get(surface) or {})
    entry = (block.get("components") or {}).get(key) or {}
    base = "foundation" if surface == "shared" else os.path.join("exports", surface)
    doc = entry.get("doc", "")
    path = os.path.join(ROOT, base, doc) if doc else ""
    body = open(path, encoding="utf-8").read() if path and os.path.isfile(path) else ""
    return fingerprint(f"{key}|{entry.get('version','')}|{entry.get('changed','')}|{body}")


# ---------------------------------------------------------------------------
# 8. The shape of the library
# ---------------------------------------------------------------------------
#
# THREE TIERS, and the middle one is the only one the registries know about.
#
#   Foundations   one, shared. Tokens, faces, the gap list.
#   Parts         components, BY SURFACE -- where a thing renders and how it is
#                 versioned. This is the registry axis and it does not move.
#   Recipes       assemblies, BY DELIVERABLE -- what someone is actually making.
#
# WHY RECIPES ARE NOT LIBRARIES. An ad landing page and a brand page draw on the
# SAME 28 web components. The only difference is `page-build.Type`, one page-level
# property that cascades to the navbar, the footer and the primary button. Giving
# each its own component list would put 28 components in two bins, with two review
# states, for one boolean -- and the web skill's rule ("never set button colours
# per-button to achieve this") depends on that cascade being the single mechanism.
#
# So a recipe names parts, it never owns them. A part is reviewed once and is
# passed everywhere it appears. A recipe is reviewed separately, because "an ad
# lander opens with Hero/Form" is a different claim from "the button is 44px".

# Stable review keys for the foundation groups. A key is an ADDRESS, not a value
# -- it is what `scripts/review-pass.sh` writes against and what survives a
# retitled section, so it is written here rather than slugged off a heading that
# can be reworded.
# Anchors for the two sections that are not reviewable. They still need a stable
# id -- the jump nav and the deep links point at it -- so they are named here
# rather than slugged off a CSS banner nobody should have to read.
UNREVIEWABLE_IDS = {
    "KNOWN GAPS": "gaps",
    "Gushwork design tokens": "how-to-read",
}

FOUNDATION_KEYS = [
    ("KNOWN GAPS", None),                 # a findings list; nothing to pass
    ("Gushwork design tokens", None),     # the file preamble; nothing to pass
    ("FONT FACES", "typefaces"),
    ("COLOR", "color"),
    ("SPACING", "spacing"),
    ("RADIUS", "radius"),
    ("ELEVATION", "elevation"),
    ("TYPE — Links", "type-links"),
    ("TYPE", "type"),
    ("BREAKPOINT", "breakpoint"),
    ("RESOLVED", "content-width"),
    ("RULED", "ruled"),
    ("SLIDES", "slides"),
]


def foundation_key(title):
    for prefix, key in FOUNDATION_KEYS:
        if title.startswith(prefix):
            return key
    return slug(title)


# tokens.css writes its section banners in caps because they are banners in a CSS
# file. On a page they are headings, and Gushwork headings are sentence case with no
# full stop. These are presentational renames of a structural heading -- no claim is
# added or dropped, and where the banner itself carries the ruling (the content
# column, the ruled values) the substance is kept.
DISPLAY_TITLE = {
    "typefaces": "Typefaces",
    "color": "Color",
    "spacing": "Spacing",
    "radius": "Radius",
    "elevation": "Elevation",
    "type": "Type",
    "type-links": "Type — links",
    "breakpoint": "Breakpoints",
    "content-width": "Content column — 1240, not --gw-bp-content-width",
    "ruled": "Ruled — decided by the design owner, not harvested from Figma",
    "slides": "Slides",
}


def display_title(group):
    key = foundation_key(group.title)
    return DISPLAY_TITLE.get(key, group.title)


# --- Parts -----------------------------------------------------------------
# One entry per surface that has, or will have, its own registry. `skill` is where
# the usage rules live; the shelf points at it rather than paraphrasing it.
PARTS = [
    ("web", "Web", "Public marketing surfaces. Ad landers and brand pages both draw "
                   "from this one set — the difference is page-build's Type property, "
                   "not a different component.", "skills/gushwork-web"),
    ("dashboard", "Dashboard", "Logged-in product screens. A separate Button and Avatar "
                               "set from web, by design — never substitute one for the "
                               "other.", "skills/gushwork-dashboard"),
    ("slides", "Slides", "Sales and discovery decks, 1920×1080.", "skills/gushwork-slides"),
    ("lead-magnet", "Lead magnet", "The downloadable PDF behind an ad lander.",
     "skills/gushwork-lead-magnet"),
    ("shared", "Shared", "Held once and merged into every surface, so a change is "
                         "reported once rather than per surface.",
     "foundation/shared-components.md"),
    ("ads", "Ad creatives", "Paid social and display creative. The Figma file exists "
                            "(O6g05YAT980r85VaDQha4h) but nothing has been measured out "
                            "of it, so ads currently build on the foundations alone.",
     None),
]

# --- Recipes ---------------------------------------------------------------
# (key, title, parts surface, what pins it, what it is, where the rule lives)
# `pins` is the page-level decision a recipe fixes. It is the whole reason ad and
# brand are two recipes and not two libraries.
RECIPES = [
    ("ad-landing-page", "Ad landing page", "web", "page-build Type=Ads",
     "Paid-ad destination. Navbar drops to logo + blue CTA, footer to a copyright "
     "line, primary button goes Blue.", "skills/gushwork-web"),
    ("brand-page", "Brand page", "web", "page-build Type=Brand",
     "Main-website page. Full nav and footer, primary button Black.",
     "skills/gushwork-web"),
    ("case-study", "Case study", "web", "measured page template",
     "One customer story. A measured template, not a composition — copy it and fill "
     "it in rather than rebuilding it from folds.",
     "skills/gushwork-web/templates/case-study"),
    ("dashboard-screen", "Dashboard screen", "dashboard", "—",
     "A logged-in product surface — KPI rows, tables, side nav, filters.",
     "skills/gushwork-dashboard"),
    ("lead-magnet-doc", "Lead magnet", "lead-magnet", "print output",
     "The gated PDF itself — cover, interior, closer.", "skills/gushwork-lead-magnet"),
    ("sales-deck", "Sales deck", "slides", "1920×1080",
     "A deck an AE drives on a call.", "skills/gushwork-slides"),
    ("ad-creative", "Ad creative", "ads", "—",
     "Paid social and display units. Blocked on the ad surface being measured.",
     None),
]


def render_sub(sub, group, lookup, phone, tracking):
    """One sub-group, rendered by whichever kind of thing it actually holds."""
    toks = [t for t in sub.tokens if kind(t.name) != "tracking" and t.context is None]
    if not toks:
        return ""
    kinds = {}
    for t in toks:
        kinds[kind(t.name)] = kinds.get(kind(t.name), 0) + 1
    dominant = max(kinds, key=kinds.get)

    if dominant == "color":
        body = render_color(toks, lookup)
    elif dominant == "type":
        body = render_type(toks, tracking)
    elif dominant == "space":
        body = render_space(toks)
    elif dominant == "radius":
        body = render_radius(toks)
    elif dominant == "shadow":
        body = render_shadow(toks)
    elif dominant == "bp":
        body = render_bp(toks, phone)
    elif dominant == "family":
        body = render_family(toks)
    else:
        body = render_value(toks)

    head = f"<h3>{esc(sub.title)}</h3>" if sub.title else ""
    note = f'<div class="cl-note">{esc(sub.note)}</div>' if sub.note else ""
    return f'<div class="cl-sub">{head}{note}{body}</div>'


def build_foundations(groups, faces, reg, counts):
    """The foundations tier. Unchanged in substance -- it now lives inside a view."""
    # First occurrence in :root is the canonical value -- tokens.css note 11.
    lookup, phone = {}, {}
    for g in groups:
        for s in g.subs:
            for t in s.tokens:
                if t.context is None:
                    lookup.setdefault(t.name, t.value)
                else:
                    phone.setdefault(t.name, t.value)
    tracking = {n: v for n, v in lookup.items() if n.endswith("-tracking")}

    fblock = (reg.get("shared") or {}).get("foundations") or {}
    sections, queue, intro = [], [], ""

    for g in groups:
        key = foundation_key(g.title)
        anchor = key or next((v for k, v in UNREVIEWABLE_IDS.items()
                              if g.title.startswith(k)), slug(g.title))
        sid = "f-" + anchor
        title = display_title(g)
        n = sum(len(s.tokens) for s in g.subs)
        unit = "tokens"
        counts["tokens"] += n
        if g.title.startswith("FONT FACES"):
            # This group holds @font-face rules, not custom properties. Reporting
            # "0 tokens" beside it is true and reads as a bug.
            n, unit = len(parse_faces(faces)), "faces"

        if g.title.startswith("Gushwork design tokens"):
            # The file preamble is the "how to read this" text, and it belongs in
            # the overview rather than as a section nobody scrolls back up to.
            intro = f'<div class="cl-note">{esc(g.note)}</div>'
            continue

        prov_attr = rev_attr = ""
        if g.title.startswith("KNOWN GAPS"):
            items = parse_gaps(g.note)
            counts["gaps"] = len(items)
            body, note = render_gaps(items), ""
            chips = chip("gap", f"{len(items)} open")
            title = "Known gaps and conflicts in the source"
        else:
            prov = provenance(g, g.subs[0] if g.subs else Sub("", ""))
            rev = review_of(fblock, key)
            counts[prov] = counts.get(prov, 0) + 1
            counts["rev_" + rev["state"]] = counts.get("rev_" + rev["state"], 0) + 1
            chips = state_chips(prov, rev)
            prov_attr = f' data-prov="{prov}"'
            rev_attr = f' data-rev="{rev["state"]}"'
            if rev["state"] != "passed":
                queue.append((title, "foundations", sid, "foundation", key, n, unit))
            note = f'<div class="cl-note">{esc(g.note)}</div>' if g.note else ""
            if g.title.startswith("FONT FACES"):
                body = render_faces(parse_faces(faces), g.note)
            else:
                body = "".join(render_sub(s, g, lookup, phone, tracking) for s in g.subs)

        count = f'<span class="cl-row__v">{n} {unit}</span>' if n else ""
        sections.append(
            f'<section class="cl-sec" id="{sid}"{prov_attr}{rev_attr}>'
            f'<div class="cl-sechead"><h2>{esc(title)}</h2>{chips}{count}</div>'
            f"{note}{body}</section>")

    return sections, queue, intro, lookup


def render_parts(surface, title, what, skill, reg, counts):
    """One parts shelf: what the registry holds, and how far each entry has got.

    The catalogue's job, absorbed. It reports version, when the spec last moved,
    whether that move renders an existing build WRONG, and the review state --
    all four read from the registry, none of them retyped.
    """
    block = reg.get(surface) or {}
    comps = block.get("components") or {}
    rblock = block.get("review") or {}
    rows = []
    for key in sorted(comps):
        e = comps[key]
        rev = review_of(rblock, key)
        counts["components"] += 1
        if rev["state"] == "passed":
            counts["comp_passed"] += 1
        brk = ('<span class="cl-chip cl-chip--gap">breaking</span>'
               if e.get("breaking") else "")
        note = (f'<br><span class="cl-row__v" style="text-align:left">'
                f'{esc(e["note"])}</span>' if e.get("note") else "")
        q = f'{key} {e.get("doc","")} {e.get("version","")} {e.get("note","")}'.lower()
        rows.append(
            f'<tr data-q="{esc(q)}"><td class="mono">{esc(key)}{note}</td>'
            f'<td class="num">{esc(e.get("version", "—"))}</td>'
            f'<td class="num">{esc(e.get("changed", "—"))} {brk}</td>'
            f'<td class="mono">{esc(e.get("doc", "—"))}</td>'
            f'<td>{state_chips_review(rev)}</td></tr>')

    if rows:
        table = ('<div class="cl-tblwrap"><table class="cl-tbl"><thead><tr>'
                 "<th>Component</th><th>Version</th><th>Spec last moved</th>"
                 "<th>Doc</th><th>Review</th></tr></thead><tbody>"
                 + "".join(rows) + "</tbody></table></div>")
        shelf = ('<div class="cl-note">Listed, not yet drawn. Specimens for this '
                 'surface are the next pass — until then this shelf reports what the '
                 'registry holds, and the doc column is where the measured spec lives.'
                 "</div>")
    else:
        table = ""
        shelf = ('<div class="cl-empty">Nothing measured yet. This shelf is here rather '
                 'than absent so the gap is visible — an absent surface reads as one we '
                 'do not build for.</div>')

    src = (f'<div class="cl-src"><code>{esc(skill)}</code></div>' if skill else "")
    return (f'<section class="cl-sec" id="p-{esc(surface)}">'
            f'<div class="cl-sechead"><h2>{esc(title)}</h2>'
            f'<span class="cl-row__v">{len(comps)} components</span></div>'
            f'<p>{esc(what)}</p>{src}{shelf}{table}</section>')


def state_chips_review(rev):
    st = rev["state"]
    label = "passed" if st == "passed" else ("rejected" if st == "rejected" else "not reviewed")
    who = f'{rev["on"]} {rev["by"]}'.strip()
    return chip(st, label, who or "Has not been through a review pass")


def render_recipe(key, title, surface, pins, what, where, reg):
    """One recipe shelf. It names the parts surface it draws on and the page-level
    decision it pins -- the two things that make it a recipe rather than a library."""
    block = reg.get(surface) or {}
    n = len((block.get("components") or {}))
    pin = (f'<div class="cl-pin"><span class="cl-pin__k">pins</span>'
           f'<code>{esc(pins)}</code></div>' if pins and pins != "—" else "")
    src = f'<div class="cl-src"><code>{esc(where)}</code></div>' if where else ""
    parts = (f'<p>Draws on <b>{esc(surface)}</b> — {n} components, one shared set. '
             f'This recipe names them; it does not own a copy.</p>' if n else
             f'<p>Would draw on <b>{esc(surface)}</b>, which has nothing measured yet.</p>')
    return (f'<section class="cl-sec" id="r-{esc(key)}">'
            f'<div class="cl-sechead"><h2>{esc(title)}</h2>'
            f'{chip("pending", "not derived")}</div>'
            f'<p>{esc(what)}</p>{pin}{parts}{src}'
            f'<div class="cl-empty">The composition — which folds, in what order, with '
            f'which defaults — is derived from the skill in the next pass. Declaring the '
            f'order by hand here would make this the fifth place it is written down.'
            f"</div></section>")


def render_queue(queue, reg):
    """The review sheet's actual job: what has NOT been passed. Scoped to the
    delta, not the whole library -- a list of 1,302 variants is not a review,
    it is a wall, which is why the old sheet was scanned rather than read."""
    rows = []
    for title, view, sid, scope, key, n, unit in queue:
        rows.append(
            f'<li><a href="#{esc(view)}/{esc(sid)}">{esc(title)}</a> &mdash; {n} {unit} '
            f'&middot; <code class="mono">bash scripts/review-pass.sh {esc(scope)} '
            f'{esc(key)}</code></li>')
    for surface, block in reg.items():
        comps = (block.get("components") or {})
        rblock = block.get("review") or {}
        pend = [k for k in sorted(comps) if review_of(rblock, k)["state"] != "passed"]
        if pend:
            rows.append(
                f'<li><a href="#parts/{esc(surface)}"><b>{esc(surface)}</b></a> &mdash; '
                f'{len(pend)} of {len(comps)} components not passed &middot; '
                f'<code class="mono">bash scripts/review-pass.sh {esc(surface)} '
                f'&lt;component&gt;</code></li>')
    if not rows:
        return ('<div class="cl-queue cl-pass"><h2>Nothing is waiting on you</h2>'
                '<p>Every foundation group and every registered component has been through '
                'a review pass.</p></div>')
    return ('<div class="cl-queue"><h2>Waiting on your review</h2>'
            '<p>Marking something passed is what lets it into <code>skills/</code>. Run the '
            'command beside a row, then regenerate this page. A re-measurement resets the '
            'row to pending on its own.</p><ul>' + "".join(rows) + "</ul></div>")


# ---------------------------------------------------------------------------
# 9. Navigation — one view per library
# ---------------------------------------------------------------------------

def render_nav(views):
    """Grouped pills, one per library. Tier is the grouping, not a clickable level:
    'Parts' is a category of libraries, never a destination of its own."""
    out = []
    for tier, items in views:
        pills = "".join(
            f'<button class="cl-v" data-view="{esc(k)}" aria-pressed="false">{esc(t)}'
            f'{f"<span>{n}</span>" if n else ""}</button>' for k, t, n in items)
        label = (f'<span class="cl-tier__l">{esc(tier)}</span>' if tier else "")
        out.append(f'<div class="cl-tier">{label}<div class="cl-tier__p">{pills}</div></div>')
    return '<nav class="cl-nav">' + "".join(out) + "</nav>"


NAV_CSS = """
.cl-nav{display:flex;flex-direction:column;gap:var(--gw-space-12);
        background:var(--s-card-bg);border:1px solid var(--s-card-border);
        border-radius:var(--gw-radius-12);padding:var(--gw-space-16) var(--gw-space-20)}
.cl-tier{display:grid;grid-template-columns:120px minmax(0,1fr);gap:var(--gw-space-16);
         align-items:start}
.cl-tier__l{font:var(--gw-text-body-12-med);text-transform:uppercase;letter-spacing:.06em;
            color:var(--gw-color-neutral-400);padding-top:7px}
.cl-tier__p{grid-column:2;display:flex;flex-wrap:wrap;gap:6px}
.cl-v{display:inline-flex;align-items:center;gap:6px;font:var(--gw-text-body-14-med);
      color:var(--s-body);background:transparent;border:1px solid var(--s-field-border);
      border-radius:var(--gw-radius-full);padding:6px var(--gw-space-12);cursor:pointer}
.cl-v span{font:var(--gw-text-body-12-reg);color:var(--gw-color-neutral-400);
           font-feature-settings:"tnum" 1}
.cl-v:hover{border-color:var(--gw-color-primary-500);color:var(--gw-color-primary-600)}
.cl-v[aria-pressed="true"]{background:var(--gw-color-black);color:var(--gw-color-white);
                           border-color:var(--gw-color-black)}
.cl-v[aria-pressed="true"] span{color:var(--gw-color-neutral-300)}
.cl-v:focus-visible{outline:var(--gw-focus-ring);outline-offset:var(--gw-focus-offset)}
@media (max-width:760px){.cl-tier{grid-template-columns:1fr;gap:var(--gw-space-8)}
                         .cl-tier__l{padding-top:0}}
.cl-view{display:flex;flex-direction:column;gap:var(--gw-space-40)}
.cl-view[hidden]{display:none}
.cl-viewhead{display:flex;flex-direction:column;gap:var(--gw-space-8)}
.cl-viewhead h2{font:var(--gw-text-h6);color:var(--s-heading);margin:0}
.cl-viewhead p{font:var(--gw-text-body-14-reg);
               letter-spacing:var(--gw-text-body-14-reg-tracking);
               color:var(--gw-color-neutral-400);margin:0;max-width:78ch}
.cl-pin{display:flex;align-items:center;gap:var(--gw-space-8);flex-wrap:wrap}
.cl-pin__k{font:var(--gw-text-body-12-med);text-transform:uppercase;letter-spacing:.06em;
           color:var(--gw-color-neutral-400)}
.cl-pin code{background:var(--s-code-bg);border:1px solid var(--s-code-border);
             color:var(--s-code-fg);border-radius:var(--gw-radius-4);padding:2px 7px}
"""


JS = """
(function(){
  var q=document.getElementById('cl-find');
  var fs=[].slice.call(document.querySelectorAll('.cl-f'));
  var vs=[].slice.call(document.querySelectorAll('.cl-v'));
  var out=document.getElementById('cl-count');
  var views=[].slice.call(document.querySelectorAll('.cl-view'));
  var on={prov:null,rev:null};
  var current='overview';

  /* Hash is "<view>" or "<view>/<section-id>". Two levels, because a deep link to
     a section is useless if it cannot also say which library that section is in.
     View keys are themselves paths -- "parts/web" -- so the whole hash is tried as
     a view BEFORE any split, or every parts library resolves to a view named
     "parts" that does not exist. */
  function resolve(h){
    h=(h||'').replace(/^#/,'');
    if(!h)return{view:'overview',sec:null};
    if(document.getElementById('v-'+h))return{view:h,sec:null};
    var i=h.lastIndexOf('/');
    if(i>0){
      var v=h.slice(0,i),sec=h.slice(i+1);
      if(document.getElementById('v-'+v))return{view:v,sec:sec};
    }
    return{view:'overview',sec:null};
  }
  function readHash(){return resolve(location.hash)}

  function show(view,sec,push){
    if(!document.getElementById('v-'+view))view='overview';
    current=view;
    views.forEach(function(v){v.hidden=v.id!=='v-'+view});
    vs.forEach(function(b){b.setAttribute('aria-pressed',
      b.getAttribute('data-view')===view?'true':'false')});
    apply();
    if(push){
      var h='#'+view+(sec?'/'+sec:'');
      if(location.hash!==h)history.replaceState(null,'',h);
    }
    if(sec){
      var el=document.getElementById(sec);
      if(el)el.scrollIntoView();
    }else{window.scrollTo(0,0)}
  }

  function apply(){
    var t=(q.value||'').trim().toLowerCase();
    var view=document.getElementById('v-'+current);
    if(!view)return;
    var items=[].slice.call(view.querySelectorAll('[data-q]'));
    var shown=0;
    items.forEach(function(el){
      var hit=!t||el.getAttribute('data-q').indexOf(t)!==-1;
      el.hidden=!hit;
      if(hit)shown++;
    });
    [].slice.call(view.querySelectorAll('.cl-sec')).forEach(function(s){
      /* A section hides when its own chips are filtered out, or when nothing
         inside it survived the text search. Sub-groups follow their children so
         a heading never floats above an empty grid. */
      var okProv=!on.prov||s.getAttribute('data-prov')===on.prov;
      var okRev=!on.rev||s.getAttribute('data-rev')===on.rev;
      var kids=[].slice.call(s.querySelectorAll('[data-q]'));
      var any=kids.length?kids.some(function(k){return !k.hidden}):!t;
      s.hidden=!(okProv&&okRev&&any);
      [].slice.call(s.querySelectorAll('.cl-sub')).forEach(function(sub){
        var sk=[].slice.call(sub.querySelectorAll('[data-q]'));
        sub.hidden=sk.length>0&&!sk.some(function(k){return !k.hidden});
      });
    });
    var secs=[].slice.call(view.querySelectorAll('.cl-sec'));
    var none=document.getElementById('cl-none');
    none.hidden=!secs.length||secs.some(function(s){return !s.hidden});
    out.textContent=items.length?shown+' shown':'';
  }

  q.addEventListener('input',function(){apply()});
  fs.forEach(function(b){
    b.addEventListener('click',function(){
      var g=b.getAttribute('data-g'),v=b.getAttribute('data-v');
      var nowOn=b.getAttribute('aria-pressed')==='true';
      fs.filter(function(o){return o.getAttribute('data-g')===g})
        .forEach(function(o){o.setAttribute('aria-pressed','false')});
      on[g]=nowOn?null:v;
      b.setAttribute('aria-pressed',nowOn?'false':'true');
      apply();
    });
  });
  vs.forEach(function(b){
    b.addEventListener('click',function(){show(b.getAttribute('data-view'),null,true)});
  });
  /* In-page links carry the two-level hash, so they change view as well as scroll. */
  document.addEventListener('click',function(e){
    var a=e.target.closest&&e.target.closest('a[href^="#"]');
    if(!a)return;
    var h=a.getAttribute('href').slice(1);
    if(!h)return;
    /* Only intercept links that actually name a view. An ordinary in-page anchor
       inside the current view is left to the browser. */
    if(!document.getElementById('v-'+h)&&h.indexOf('/')===-1)return;
    var r=resolve(h);
    e.preventDefault();
    show(r.view,r.sec,true);
  });
  window.addEventListener('hashchange',function(){var r=readHash();show(r.view,r.sec,false)});
  var r=readHash();show(r.view,r.sec,false);
})();
"""


def favicon():
    p = os.path.join(ROOT, "scripts", "_favicon.txt")
    return open(p, encoding="utf-8").read().strip() if os.path.isfile(p) else ""


def view(key, title, lede, body):
    """A library. `title` is for views that have no section heading of their own --
    parts and recipes carry theirs inside, and repeating it reads as a bug."""
    head = ""
    if title:
        head = f'<div class="cl-viewhead"><h2>{esc(title)}</h2><p>{esc(lede)}</p></div>'
    elif lede:
        head = f'<div class="cl-viewhead"><p>{esc(lede)}</p></div>'
    return f'<div class="cl-view" id="v-{esc(key)}" hidden>{head}{body}</div>'


def main():
    """Retired. This module is now the PRIMITIVES — the tokens.css parser, the
    swatch/specimen/table renderers, provenance and review lookups — imported by
    scripts/_library_site.py, which builds the library as a site.

    It used to render one long page at /admin/component-library. That address now
    redirects to /library. Kept as a module rather than deleted because everything
    the site builder draws with lives here."""
    sys.exit("This module is imported, not run. Use: bash scripts/library-site.sh")


if __name__ == "__main__":
    main()
