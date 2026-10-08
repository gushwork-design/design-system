#!/usr/bin/env bash
#
# Start a page for a team's staging lane. Makes ./<page>/ with a starter index.html that already
# passes the Publish checks, and a staging.json naming it.
#
#   bash new-staging-page.sh <lane> <page> "<Title>" "<one-line blurb>" "<your name>" <team|everyone>
#   bash new-staging-page.sh gtm agent-store "Agent store" "The new Agent Store mock-up." "Swapnil" team
#
# The last word is who can open the page: `team` (only the people on your lane) or `everyone` (everyone at Gushwork).
# Ask, do not guess. Publishing again with the other word changes it.
#
# Then build the page in that folder and publish it with publish-staging.sh, which sits beside this script.
set -euo pipefail

LANE="${1:-}"; PAGE="${2:-}"; TITLE="${3:-}"; BLURB="${4:-}"; OWNER="${5:-}"; WHO="${6:-}"
if [ -z "$LANE" ] || [ -z "$PAGE" ] || [ -z "$TITLE" ] || [ -z "$BLURB" ] || [ -z "$OWNER" ] || [ -z "$WHO" ]; then
  sed -n '2,13p' "$0" | sed 's/^# \{0,1\}//' >&2; exit 2
fi
for v in "$LANE" "$PAGE"; do
  [[ "$v" =~ ^[a-z0-9]+(-[a-z0-9]+)*$ ]] || { echo "'$v' must be lowercase words joined by hyphens, e.g. agent-store" >&2; exit 2; }
done
[ ! -e "$PAGE" ] || { echo "./$PAGE already exists" >&2; exit 1; }
case "$WHO" in team) VIS=lane ;; everyone) VIS=org ;; *) echo "the last word must be team or everyone" >&2; exit 2 ;; esac
mkdir -p "$PAGE"

python3 - "$PAGE" "$LANE" "$TITLE" "$BLURB" "$OWNER" "$VIS" <<'PY'
import json, sys, html
d, lane, title, blurb, owner, vis = sys.argv[1:]
with open(f"{d}/staging.json", "w") as f:
    json.dump({"title": title, "blurb": blurb, "owner": owner, "visibility": vis}, f, indent=2, ensure_ascii=False)
    f.write("\n")
open(f"{d}/index.html", "w").write(f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<base href="/internal/staging/{lane}/{d}/">
<title>{html.escape(title)} | Gushwork</title>
<meta name="robots" content="noindex, nofollow">
<link rel="stylesheet" href="/foundation/tokens.css">
<style>
*,*::before,*::after{{box-sizing:border-box}}
body{{margin:0;background:var(--gw-color-neutral-25);color:var(--gw-color-neutral-900);font:var(--gw-text-body-16-reg);letter-spacing:var(--gw-text-body-16-reg-tracking)}}
h1{{margin:0 0 var(--gw-space-12);font:var(--gw-text-h1);letter-spacing:var(--gw-text-h1-tracking)}}
.wrap{{max-width:1240px;margin:0 auto;padding:var(--gw-space-48) var(--gw-space-24)}}
</style>
</head>
<body>
<main class="wrap">
  <h1>{html.escape(title)}</h1>
  <p>{html.escape(blurb)}</p>
</main>
</body>
</html>
''')
PY
echo "Created ./$PAGE/ (index.html, staging.json)."
echo "Publish it:  bash \"$(dirname "$0")/publish-staging.sh\" $LANE $PAGE ./$PAGE"
