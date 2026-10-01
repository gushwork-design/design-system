#!/usr/bin/env bash
#
# Lists the components that have no VISUAL in the review drawer.
#
#   bash scripts/check-previews.sh            the summary, then the list
#   bash scripts/check-previews.sh --count    just the number of components with no visual
#
# A component is drawn in the Design System's review drawer when it has either
#
#   web/previews/<surface>/<key>.html    a small HTML file drawn from its measured values, using
#                                        foundation/tokens.css (shown live, in a frame), or
#   assets/<surface>/<key>-desktop.png   its Figma render (the ad-page folds have these)
#
# Anything else shows "No visual yet", which is honest but not enough: a reviewer cannot pass what
# they cannot see. This is the list of what is still missing. It WARNS (scripts/hooks/pre-push)
# and never blocks, like the other checks: a half-finished branch is a legitimate thing to push.
#
# It reads preview/library/data.json, which scripts/library-site.sh writes, so regenerate that first
# if you have just added a preview (the library-site check in pre-push says when it is stale).
set -euo pipefail
cd "$(dirname "$0")/.."

python3 - "${1:-}" <<'PY'
import json, sys, collections
d = json.load(open("preview/library/data.json"))
comps = [i for i in d.get("items", []) if i["kind"] == "component"]
miss = [i for i in comps if not i.get("preview") and not i.get("figma")]
if sys.argv[1] == "--count":
    print(len(miss)); raise SystemExit(0)
by = collections.OrderedDict()
for i in miss:
    by.setdefault(i["scope"], []).append(i["key"])
have = len(comps) - len(miss)
print(f"{have} of {len(comps)} components have a visual · {len(miss)} do not")
for scope, ks in by.items():
    print(f"\n{scope} — {len(ks)} without")
    for k in ks:
        print(f"  · {k:28} add web/previews/{scope}/{k}.html")
if miss:
    print("\nA preview is plain HTML that links /foundation/tokens.css and draws the component's measured states.")
PY
