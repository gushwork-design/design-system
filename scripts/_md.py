#!/usr/bin/env python3
"""A small Markdown renderer for the component library's spec docs.

WHY NOT A LIBRARY. This repo is dependency-free on purpose — scripts/ runs on a bare
python3 and web/ on a bare Node, and the publish path has no install step. Pulling in a
markdown package to render nine spec docs would put a dependency in front of a build that
currently has none.

WHAT IT COVERS, because the docs in exports/ use exactly this and nothing more:
ATX headings, pipe tables, fenced code, unordered and ordered lists, blockquotes,
horizontal rules, paragraphs, and inline code / bold / italic / links.

WHAT IT DOES NOT: nested lists, reference links, HTML passthrough, footnotes. If a doc
starts using one, it renders as literal text, which is visible and fixable — rather than
silently swallowing the line.
"""

import re

_ESC = {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"}


def esc(s):
    return "".join(_ESC.get(c, c) for c in str(s))


def inline(s):
    """Inline spans. Code FIRST and stashed, so `**` inside a code span is not read
    as bold — which is exactly what `--gw-text-**` style token globs would trigger."""
    stash = []

    def keep(m):
        stash.append(m.group(1))
        return f"\x00{len(stash) - 1}\x00"

    s = re.sub(r"`([^`]+)`", keep, s)
    s = esc(s)
    s = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", r'<a href="\2">\1</a>', s)
    s = re.sub(r"\*\*([^*]+)\*\*", r"<b>\1</b>", s)
    s = re.sub(r"(?<![\w*])\*([^*\n]+)\*(?![\w*])", r"<i>\1</i>", s)
    return re.sub(r"\x00(\d+)\x00",
                  lambda m: f"<code>{esc(stash[int(m.group(1))])}</code>", s)


def _row(line):
    cells = line.strip().strip("|").split("|")
    return [c.strip() for c in cells]


def render(text):
    lines = text.replace("\r\n", "\n").split("\n")
    out, i = [], 0
    while i < len(lines):
        ln = lines[i]

        if ln.startswith("```"):
            body, i = [], i + 1
            while i < len(lines) and not lines[i].startswith("```"):
                body.append(lines[i]); i += 1
            i += 1
            out.append(f'<pre class="md-pre"><code>{esc(chr(10).join(body))}</code></pre>')
            continue

        m = re.match(r"^(#{1,6})\s+(.*)$", ln)
        if m:
            lv = min(len(m.group(1)) + 1, 6)   # doc h1 becomes page h2
            out.append(f"<h{lv}>{inline(m.group(2))}</h{lv}>")
            i += 1
            continue

        # A table is a header row, a delimiter row, then body rows.
        if ln.strip().startswith("|") and i + 1 < len(lines) \
                and re.match(r"^\s*\|[\s:|-]+\|\s*$", lines[i + 1]):
            head = _row(ln)
            i += 2
            body = []
            while i < len(lines) and lines[i].strip().startswith("|"):
                body.append(_row(lines[i])); i += 1
            th = "".join(f"<th>{inline(c)}</th>" for c in head)
            tr = "".join("<tr>" + "".join(f"<td>{inline(c)}</td>" for c in r) + "</tr>"
                         for r in body)
            out.append(f'<div class="md-tblwrap"><table class="md-tbl"><thead><tr>{th}'
                       f"</tr></thead><tbody>{tr}</tbody></table></div>")
            continue

        if re.match(r"^\s*([-*_])\1{2,}\s*$", ln):
            out.append('<hr class="md-hr">'); i += 1
            continue

        m = re.match(r"^\s*[-*+]\s+(.*)$", ln)
        if m:
            items = []
            while i < len(lines):
                mm = re.match(r"^\s*[-*+]\s+(.*)$", lines[i])
                if not mm:
                    break
                items.append(mm.group(1)); i += 1
            out.append("<ul>" + "".join(f"<li>{inline(x)}</li>" for x in items) + "</ul>")
            continue

        m = re.match(r"^\s*\d+[.)]\s+(.*)$", ln)
        if m:
            items = []
            while i < len(lines):
                mm = re.match(r"^\s*\d+[.)]\s+(.*)$", lines[i])
                if not mm:
                    break
                items.append(mm.group(1)); i += 1
            out.append("<ol>" + "".join(f"<li>{inline(x)}</li>" for x in items) + "</ol>")
            continue

        if ln.startswith(">"):
            quote = []
            while i < len(lines) and lines[i].startswith(">"):
                quote.append(lines[i].lstrip("> ").rstrip()); i += 1
            out.append(f'<blockquote class="md-q">{inline(" ".join(quote))}</blockquote>')
            continue

        if not ln.strip():
            i += 1
            continue

        para = []
        while i < len(lines) and lines[i].strip() and not lines[i].startswith(("#", ">", "```")) \
                and not lines[i].strip().startswith("|") \
                and not re.match(r"^\s*([-*+]\s|\d+[.)]\s)", lines[i]) \
                and not re.match(r"^\s*([-*_])\1{2,}\s*$", lines[i]):
            para.append(lines[i].strip()); i += 1
        if para:
            out.append(f"<p>{inline(' '.join(para))}</p>")
        else:
            i += 1
    return "\n".join(out)


def headings(text):
    """(level, text, slug) for the on-this-page rail. h2 and h3 only — deeper is noise."""
    out = []
    for ln in text.split("\n"):
        m = re.match(r"^(#{1,3})\s+(.*)$", ln)
        if m:
            t = re.sub(r"[`*]", "", m.group(2)).strip()
            slug = re.sub(r"[^a-z0-9]+", "-", t.lower()).strip("-")[:60]
            out.append((len(m.group(1)), t, slug))
    return out
