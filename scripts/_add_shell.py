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

# Apply the theme before first paint, or a dark page flashes light on every load. Has to be blocking, so it cannot
# live in shell.js (which is deferred).
#
# It reads `gw-theme-choice` (written only when someone picks Light, Dark or System). No choice means System, so it asks
# the machine itself rather than leaving the attribute unset. The site follows the OS by default again (2 Oct 2026); it
# had been defaulted to Light on 18 Sep because a dark-OS first visit looked broken before there was a toggle. There
# is a toggle now, with System as one of its three options, so following the OS is the honest default.
THEME_SNIPPET = (
    "<script>"+"try{var c=localStorage.getItem('gw-theme-choice'),t=c==='dark'||c==='light'?c:(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.setAttribute('data-theme',t)}catch(e){document.documentElement.setAttribute('data-theme','light')}"+"</script>"
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
