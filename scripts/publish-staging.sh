#!/usr/bin/env bash
#
# Publish a page into a team's staging lane from your own machine, or from Claude.
#
#   bash scripts/publish-staging.sh <lane> <page> <folder>
#   bash scripts/publish-staging.sh gtm agent-store ./agent-store
#   bash scripts/publish-staging.sh --check gtm agent-store ./agent-store    # checks only, publishes nothing
#
# It posts the folder to the hub's Publish API as you. You need a personal token: sign in at
# design.gushwork.ai/internal/staging/publish, open "From Claude", press New token, and either
#     export GW_PUBLISH_TOKEN=gwp_...
# or save it in ~/.config/gushwork/publish-token. The token is yours, lasts 90 days and can be
# revoked on that page. Whether you may publish to the lane is decided by Access Control, live,
# so being removed from a lane stops the token at once.
#
# The folder needs an index.html and a staging.json {"title","blurb","owner"}; scripts/new-staging-page.sh
# makes both. Up to 3 MB in all. The page is live a minute or two after it says "Committed".
set -euo pipefail

OP=publish
[ "${1:-}" = "--check" ] && { OP=check; shift; }
LANE="${1:-}"; PAGE="${2:-}"; DIR="${3:-}"
if [ -z "$LANE" ] || [ -z "$PAGE" ] || [ ! -d "$DIR" ]; then
  sed -n '2,19p' "$0" | sed 's/^# \{0,1\}//' >&2; exit 2
fi
TOKEN="${GW_PUBLISH_TOKEN:-}"
[ -n "$TOKEN" ] || { [ -f "$HOME/.config/gushwork/publish-token" ] && TOKEN="$(tr -d '[:space:]' < "$HOME/.config/gushwork/publish-token")"; }
[ -n "$TOKEN" ] || { echo "No token. Get one at https://design.gushwork.ai/internal/staging/publish (From Claude), then export GW_PUBLISH_TOKEN." >&2; exit 1; }
HOST="${GW_HUB:-https://design.gushwork.ai}"

python3 - "$HOST" "$OP" "$LANE" "$PAGE" "$DIR" "$TOKEN" <<'PY'
import base64, json, os, sys, urllib.request, urllib.error
host, op, lane, page, root, token = sys.argv[1:]
try:
    meta = json.load(open(os.path.join(root, "staging.json")))
except (OSError, ValueError):
    sys.exit('staging.json is missing or not valid JSON: {"title","blurb","owner"}')
files = []
for dp, dn, fn in os.walk(root):
    dn[:] = [d for d in dn if d != "__pycache__"]
    for f in sorted(fn):
        if f in ("staging.json", ".DS_Store"):
            continue
        full = os.path.join(dp, f)
        files.append({"path": os.path.relpath(full, root).replace(os.sep, "/"),
                      "b64": base64.b64encode(open(full, "rb").read()).decode()})
body = json.dumps({"lane": lane, "page": page, "title": meta.get("title"), "blurb": meta.get("blurb"),
                   "owner": meta.get("owner"), "files": files}).encode()
if len(body) > 4_300_000:
    sys.exit(f"That is {len(body)//1048576} MB once encoded. The limit is about 3 MB of files. Ask the owner for anything bigger.")
req = urllib.request.Request(f"{host}/api/publish?op={op}", data=body, method="POST",
                             headers={"authorization": f"Bearer {token}", "content-type": "application/json"})
try:
    r = urllib.request.urlopen(req, timeout=60)
    out, status = json.load(r), r.status
except urllib.error.HTTPError as e:
    status = e.code
    try: out = json.load(e)
    except ValueError: out = {"error": f"HTTP {e.code}"}
except urllib.error.URLError as e:
    sys.exit(f"Could not reach {host}: {e.reason}")
for p in out.get("problems", []):
    print(f"  ✘ {p}")
if status >= 400 or out.get("ok") is False:
    if out.get("error"): print(out["error"])
    sys.exit(1)
if op == "check":
    print(f"✔ Passes: {len(out.get('files', []))} files. Nothing was published.")
else:
    print(f"✔ {out.get('note', 'Published.')}\n  {host}{out.get('path', '')}" + (f"\n  {out['url']}" if out.get("url") else ""))
PY
