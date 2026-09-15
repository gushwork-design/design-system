#!/usr/bin/env python3
"""Inject the site chrome into a generated sheet, in place.

Used by publish-sheets.sh on the STAGED copies only. The sheets in preview/
are never edited: they are generated, and `release-log.sh --check` compares
what is committed against what the generator produces. Patching the stage
keeps that check honest while still putting a sidebar on every page.

    python3 scripts/_add_shell.py <file.html> [...]

Idempotent — running it twice does nothing the second time.
"""

import re
import sys

MARKER = "gw-shell-injected"

# Apply a STORED theme choice before first paint, or an explicit dark pick
# flashes light on every load. Has to be blocking, so it cannot live in
# shell.js (which is deferred).
#
# Defaults to 'light' rather than leaving the attribute unset. It used to
# leave nothing stored unset and let the CSS prefers-color-scheme block
# decide — deliberately, so the page followed the OS. That meant a
# first-time visitor on a dark-OS machine got a dark page with no toggle
# ever touched, which read as "the site is broken" rather than "the site
# respected your OS". The site now always opens light until someone
# explicitly picks dark via the toggle; that choice is what persists
# across visits, not the OS setting.
THEME_SNIPPET = (
    "<script>try{var t=localStorage.getItem('gw-theme')||'light';"
    "document.documentElement.setAttribute('data-theme',t)}catch(e){}</script>"
)


def block(needs_tokens: bool) -> str:
    lines = [f"<!-- {MARKER} — chrome added at publish time by scripts/_add_shell.py -->",
             THEME_SNIPPET]
    # Some sheets inline all their own CSS and never link tokens. shell.css is
    # written entirely in --gw-* variables, so those sheets need it now.
    if needs_tokens:
        lines.append('<link rel="stylesheet" href="/foundation/tokens.css">')
    lines.append('<link rel="stylesheet" href="/shell.css">')
    lines.append('<script src="/shell.js" defer></script>')
    return "\n".join(lines)


def patch(path: str) -> str:
    with open(path, encoding="utf-8") as fh:
        html = fh.read()

    if MARKER in html:
        return "already had it"

    # Must be a real stylesheet LINK, not just the string. review-sheet.html
    # mentions "foundation/tokens.css" in its prose, inside a <code> tag; a
    # bare substring test says it already has tokens and shell.css then ships
    # with every --gw-* variable unresolved.
    needs_tokens = not re.search(
        r"<link[^>]+href=[\"'][^\"']*tokens\.css[\"']", html, re.I
    )

    # Insert after the viewport meta where there is one, so the theme snippet
    # runs before any stylesheet. Otherwise fall back to just after <head>.
    m = re.search(r"<meta\s+name=[\"']viewport[\"'][^>]*>", html, re.I)
    if m:
        at = m.end()
    else:
        m = re.search(r"<head[^>]*>", html, re.I)
        if not m:
            return "SKIPPED — no <head>"
        at = m.end()

    html = html[:at] + "\n" + block(needs_tokens) + html[at:]

    with open(path, "w", encoding="utf-8") as fh:
        fh.write(html)
    return "patched" + ("" if needs_tokens else " (already linked tokens)")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    for p in sys.argv[1:]:
        print(f"  {p}: {patch(p)}")
