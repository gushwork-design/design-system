#!/usr/bin/env python3
"""Split the old full review sheet (preview/review-sheet.html) into one drawn FAMILY per file.

    python3 scripts/_extract_previews.py

Writes web/previews/_families/<id>.html. The review drawer in the Design System page frames these, so the
drawings the sheet held are shown beside the decision instead of on a page of their own. Each family is a
self-contained page: the sheet's own CSS, tokens.css, and one section. A component that belongs to a family
(see FAMILY in scripts/_library_site.py) is shown with it; a component with its own drawing is
web/previews/<surface>/<key>.html and wins.

This is a one-time lift of what the sheet drew, not a build step: the files are committed, and new drawings
are added as web/previews/<surface>/<key>.html. Run it again only to refresh the lift from an older sheet.
"""
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "preview", "review-sheet.html")
OUT = os.path.join(ROOT, "web", "previews", "_families")

FAMILIES = {   # id in the sheet -> the name shown in the drawer
    "g-button": "Button", "g-badge": "Badge", "g-atoms": "Eyebrow and clients", "g-field": "Text field",
    "g-folds": "Folds", "g-cta": "Closing CTA and footer", "d-comps": "Dashboard components", "d-login": "Dashboard login screen",
    "v2-primitives": "Dashboard primitives", "v2-controls": "Dashboard controls", "v2-data-table": "Dashboard data table",
    "v2-cards": "Dashboard cards and chrome", "v2-feedback": "Dashboard feedback",
}


# Named in each file as well as in tokens.css: scripts/check-fonts.sh reads the page itself, not what it links.
FONTS = ("<style>@font-face{font-family:'Vert Grotesk Display';src:url(/fonts/Vert_Grotesk_Display_VF.ttf) format('truetype');font-weight:100 900}"
         "@font-face{font-family:'Inter';src:url(/fonts/Inter-VariableFont_opsz_wght.ttf) format('truetype');font-weight:100 900}"
         "body{font-family:'Inter',ui-sans-serif,system-ui,sans-serif}"
         "h1,h2,h3{font-family:'Vert Grotesk Display',ui-sans-serif,system-ui,sans-serif}</style>")


def section(s, sid):
    m = re.search(r'<section[^>]*id="%s"' % re.escape(sid), s)
    if not m:
        return None
    pos, depth = m.start(), 0
    for t in re.finditer(r"<(/?)section\b", s[pos:]):
        depth += -1 if t.group(1) else 1
        if depth == 0:
            return s[pos:s.index(">", pos + t.start() + 1) + 1]
    return None


def main():
    s = open(SRC, encoding="utf-8").read()
    # The sheet's own stylesheet, written once and linked, so each family is its drawing and not 86 KB of CSS again.
    css = "\n".join(re.sub(r"^<style[^>]*>|</style>$", "", b) for b in re.findall(r"<style[^>]*>.*?</style>", s, re.S))
    os.makedirs(OUT, exist_ok=True)
    with open(os.path.join(OUT, "_sheet.css"), "w", encoding="utf-8") as fh:
        fh.write(css)
    wrote = 0
    for sid, title in FAMILIES.items():
        body = section(s, sid)
        if not body:
            print(f"  ! {sid} not found in the sheet", file=sys.stderr)
            continue
        html = ('<!doctype html>\n<html lang="en"><head><meta charset="utf-8">'
                '<meta name="viewport" content="width=device-width, initial-scale=1">'
                f"<title>{title}</title>\n"
                '<link rel="stylesheet" href="/foundation/tokens.css"><link rel="stylesheet" href="/previews/_families/_sheet.css">' + FONTS +
                '\n</head><body style="margin:0"><div class="page" style="padding:16px">\n' + body + "\n</div></body></html>\n")
        with open(os.path.join(OUT, sid + ".html"), "w", encoding="utf-8") as fh:
            fh.write(html)
        wrote += 1
    print(f"  web/previews/_families/ — {wrote} families")


if __name__ == "__main__":
    main()
