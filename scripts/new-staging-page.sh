#!/usr/bin/env bash
#
# Start a staging page. Creates web/internal/staging/<name>/ with a page that already passes
# the lane check, so you only have to replace the body.
#
#   bash scripts/new-staging-page.sh <name> "<Title>" "<one-line blurb>" "<your name>"
#   bash scripts/new-staging-page.sh gtm "GTM" "The new Agent Store mock-up." "Swapnil"
#
# The page lives at design.gushwork.ai/internal/staging/<name> behind the sign-in, and appears
# on the Staging index by itself once it is merged (from staging.json). Drop a thumb.png next to
# index.html to give it a preview picture. See CONTRIBUTING.md, "Adding a staging page".
set -euo pipefail
cd "$(dirname "$0")/.."

NAME="${1:-}"; TITLE="${2:-}"; BLURB="${3:-}"; OWNER="${4:-}"
if [ -z "$NAME" ] || [ -z "$TITLE" ] || [ -z "$BLURB" ] || [ -z "$OWNER" ]; then
  sed -n '2,10p' "$0" | sed 's/^# \{0,1\}//' >&2; exit 2
fi
[[ "$NAME" =~ ^[a-z0-9]+(-[a-z0-9]+)*$ ]] || { echo "name must be lowercase-kebab-case, e.g. gtm" >&2; exit 2; }
DIR="web/internal/staging/$NAME"
[ ! -e "$DIR" ] || { echo "$DIR already exists — pick another name, or edit it in place" >&2; exit 1; }
mkdir -p "$DIR"

python3 - "$DIR" "$NAME" "$TITLE" "$BLURB" "$OWNER" <<'PY'
import json, sys, html
d, name, title, blurb, owner = sys.argv[1:]
json.dump({"title": title, "blurb": blurb, "owner": owner}, open(f"{d}/staging.json", "w"), indent=2, ensure_ascii=False)
open(f"{d}/staging.json", "a").write("\n")
open(f"{d}/index.html", "w").write(f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<base href="/internal/staging/{name}/">
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
echo "Created $DIR/ (index.html, staging.json)."
echo "Next: build the page in index.html, then run  bash scripts/check-staging-lane.sh"
