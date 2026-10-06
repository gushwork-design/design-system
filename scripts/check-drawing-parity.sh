#!/usr/bin/env bash
#
# Checks that a component's DRAWING is not carrying style the SHIPPED component lacks (R60).
#
#   bash scripts/check-drawing-parity.sh      exit 1 if the preview sheet styles a shipped component
#
# A review pass covers a component's spec text and its drawing (web/previews/<surface>/<key>.frag), not the shipped
# CSS or JS. So a look that exists only in the drawing is approved and never ships: on 5 Oct 2026 the collapsed rail's
# tooltip (white pill, hairline, no arrow, 4px away) was styled in web/previews/_sheet.css, the sheet the review drawer
# loads, while the dashboard shipped the generic tooltip. That sheet is for the drawing's own layout (stages, captions,
# grids). A rule in it that targets a shipped component class (.gd-*) is the same bug waiting to happen.
#
# FAILS on: a rule in web/previews/_sheet.css whose selector names a .gd-* class.
# LISTS (advisory): .gd-* classes used in a dashboard drawing that have no rule in exports/dashboard/dashboard.css. Most are
# modifier names that look the same without a rule; read the list, it is short.
set -euo pipefail
cd "$(dirname "$0")/.."

python3 - <<'PY'
import re, glob, sys, collections
sheet = re.sub(r'/\*.*?\*/', '', open('web/previews/_sheet.css').read(), flags=re.S)
bad = [(s.strip().replace('\n', ' '), d.strip()[:90]) for s, d in re.findall(r'([^{}]+)\{([^{}]*)\}', sheet) if re.search(r'\.gd-[a-z]', s)]
css = open('exports/dashboard/dashboard.css').read()
shipped = set(re.findall(r'\.(gd-[a-z0-9_-]+)', css))
ignore = {'gd-sr', 'gd-num'}
missing = collections.defaultdict(set)
for f in sorted(glob.glob('web/previews/dashboard/*.frag')):
    key = f.split('/')[-1][:-5]
    for cls in re.findall(r'class="([^"]+)"', open(f).read()):
        for c in cls.split():
            if c.startswith('gd-') and c not in shipped and c not in ignore and not c.endswith('--'):
                missing[c].add(key)
if missing:
    print(f"{len(missing)} classes are drawn in a dashboard drawing and have no shipped rule (advisory; most are modifier names):")
    for c, v in sorted(missing.items()):
        print(f"  · {c}  <- {', '.join(sorted(v))[:80]}")
if bad:
    print("\nFAIL: web/previews/_sheet.css styles a shipped component. Move the rule into exports/dashboard/css/ so the component ships it:")
    for s, d in bad:
        print(f"  {s}  {{ {d} }}")
    sys.exit(1)
print("\nOK: the preview sheet styles no shipped component.")
PY
