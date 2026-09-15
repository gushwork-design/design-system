#!/usr/bin/env python3
"""Stamp the review sheet with how much of the library it actually draws.

    python3 scripts/_sheet_coverage.py --report                # print, change nothing
    python3 scripts/_sheet_coverage.py <file.html> [...]        # inject, in place

WHY THIS EXISTS
---------------
The sheet has always been honest about being partial — one group is literally headed
"the other 19 sets" and the inventory beneath it lists them with node ids. What it never
said was *how* partial. "Partial" is a word, and a word cannot tell you whether you are
looking at most of the library or half of it, so the sheet could be read with false
confidence by anyone who did not scroll to that one group.

This counts and says it at the top, where it is read first.

It matters more since the 15 Sep 2026 ruling. The sheet is no longer a display — work is
measured, drawn here, and enters skills/ only once it has been reviewed and passed. A gate
that can only hold part of the library is a throughput limit, not a cosmetic gap: a set the
sheet cannot draw is a set nobody can pass.

COUNTED, NEVER TYPED. A hand-written "24 of 43" is one more number that goes stale the
first time a group is added, which is the whole failure this file exists to stop.

WHAT IT CAN AND CANNOT KNOW
---------------------------
It counts against THIS SHEET'S OWN INVENTORY — the groups it holds and the sets it names as
missing. It cannot count against Figma, because nothing pulls Figma to compare against yet
(gap 1). So a set that exists in Figma and that the sheet has never heard of is invisible
here, and the real coverage can only be LOWER than what this prints. The banner says so
rather than implying a completeness it cannot verify.

INJECTED INTO THE STAGED COPY, like scripts/_add_shell.py, so preview/review-sheet.html
stays byte-identical to what its author wrote. Idempotent — running twice does nothing the
second time.
"""

import re
import sys

MARKER = "gw-coverage-injected"

SECTION = re.compile(r'<section id="([^"]+)"')
NOTDRAWN = re.compile(r'<section id="g-notdrawn".*?</section>', re.S)
ROW = re.compile(r'<tr><th scope="row">')


def count(html: str):
    """Return (rendered, groups, named_but_undrawn).

    A group "renders" when it contains at least one .stage or .cell — the two wrappers every
    drawn specimen sits in. A group with neither is a heading over an explanation, which is
    what "not drawn" looks like in this sheet.
    """
    parts = re.split(r'(?=<section id=")', html)
    rendered = groups = 0
    for part in parts:
        if not SECTION.match(part):
            continue
        groups += 1
        if 'class="stage' in part or 'class="cell' in part:
            rendered += 1

    m = NOTDRAWN.search(html)
    named = len(ROW.findall(m.group(0))) if m else 0
    return rendered, groups, named


def banner(rendered: int, groups: int, named: int) -> str:
    return (
        f'<!-- {MARKER} — counted at publish time by scripts/_sheet_coverage.py -->\n'
        '<div style="margin:0 0 20px;padding:14px 18px;background:#fff;'
        'border:1px solid #e1e3e8;border-left:3px solid #0070ff;border-radius:10px;'
        'font:14px/1.55 Inter,system-ui,-apple-system,sans-serif;color:#535a61">'
        f'<b style="color:#0d0d0d">Coverage — {rendered} of {groups} groups rendered.</b> '
        f'{named} further component sets are named in the inventory below and not drawn. '
        '<span style="color:#959ba4">Counted against this sheet&rsquo;s own inventory, not '
        'against Figma — nothing compares the two yet, so the true figure can only be '
        'lower than this.</span></div>'
    )


def patch(path: str) -> str:
    with open(path, encoding="utf-8") as fh:
        html = fh.read()

    if MARKER in html:
        return "already had it"

    rendered, groups, named = count(html)
    if not groups:
        return "SKIPPED — no <section id> groups found"

    # After </header>, so it sits under the title and above the existing "What is here"
    # banner, which explains scope within a group rather than across the sheet.
    at = html.find("</header>")
    if at < 0:
        return "SKIPPED — no </header> to anchor to"
    at += len("</header>")

    html = html[:at] + "\n\n" + banner(rendered, groups, named) + html[at:]
    with open(path, "w", encoding="utf-8") as fh:
        fh.write(html)
    return f"stamped — {rendered}/{groups} groups rendered, {named} sets named and undrawn"


if __name__ == "__main__":
    args = sys.argv[1:]
    if not args:
        sys.exit(__doc__)

    if args[0] == "--report":
        target = args[1] if len(args) > 1 else "preview/review-sheet.html"
        rendered, groups, named = count(open(target, encoding="utf-8").read())
        print(f"{target}")
        print(f"  {rendered} of {groups} groups rendered")
        print(f"  {named} component sets named in the inventory and not drawn")
        print(f"  not compared against Figma — real coverage can only be lower")
        sys.exit(0)

    for p in args:
        print(f"  {p}: {patch(p)}")
