#!/usr/bin/env python3
"""
Builds admin/pages.json: every page the deploy serves, for the page search in Access Control.

    python3 scripts/_pages_index.py <stage-dir> > <stage-dir>/admin/pages.json

Read from the STAGED copy, like search-index.json, so each entry is a URL that exists on this deploy. It sits under /admin, so the
admin gate covers it; the rules it is matched against are read live by the page. An entry is {"u": "/internal/staging/foo", "t": "Foo"}.
The library's generated pages and the template previews are collapsed or left out: they are gated as a block, not one by one.
"""
import json
import os
import re
import sys

SKIP_TOP = {"assets", "fonts", "foundation", "api", "previews", "downloads-files", "exports", "skills"}
COLLAPSE = {"library": "/library"}


def title_of(path):
    try:
        head = open(path, encoding="utf-8", errors="ignore").read(6000)
    except OSError:
        return ""
    m = re.search(r"<title[^>]*>(.*?)</title>", head, re.S | re.I)
    t = re.sub(r"\s+", " ", m.group(1)).strip() if m else ""
    return re.sub(r"\s*[—|-]\s*Gushwork.*$", "", t).strip()


def main(stage):
    pages = {}
    for root, dirs, files in os.walk(stage):
        rel = os.path.relpath(root, stage)
        top = rel.split(os.sep)[0] if rel != "." else ""
        if top in SKIP_TOP:
            dirs[:] = []
            continue
        for f in files:
            if not f.endswith(".html"):
                continue
            parts = [] if rel == "." else rel.split(os.sep)
            if f != "index.html":
                parts.append(f[:-5])
            route = "/" + "/".join(parts)
            if parts and parts[0] in COLLAPSE:
                route = COLLAPSE[parts[0]]
            if route in pages:
                continue
            pages[route] = title_of(os.path.join(root, f))
    out = [{"u": u, "t": pages[u]} for u in sorted(pages)]
    json.dump(out, sys.stdout, separators=(",", ":"))


if __name__ == "__main__":
    main(sys.argv[1])
