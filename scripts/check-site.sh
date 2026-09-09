#!/usr/bin/env bash
# Tells you when web/ or preview/ has changed since the last deploy — the "did I forget to
# publish" check nothing else in this repo provides.
#
#   bash scripts/check-site.sh
#
# WHY THIS EXISTS
# ----------------
# publish-sheets.sh is the only thing that puts a change live (see its own header comment).
# A `git push` moves `main`; it does not touch gushwork-design.vercel.app / design.gushwork.ai
# at all — there is no git integration on that Vercel project. So a `web/` edit can sit
# committed, reviewed, even merged, and still not be what a visitor sees.
#
# This compares the site-hash a publish would produce right now (scripts/_site_hash.sh, over
# the working tree — publish deploys the tree, not a commit) against the one the live deploy
# actually shipped with (version.json's "siteHash", stamped by publish-sheets.sh). Reads the
# deployed version.json fresh every time, with a cache-busting query and no-cache header — see
# the site-deploys note about the CDN serving stale content for hours otherwise. No local
# record of "what did I last publish" is kept; the live site IS that record.
set -uo pipefail
cd "$(dirname "$0")/.."

. scripts/_site_hash.sh

URL="${GW_VERSION_URL:-https://gushwork-design.vercel.app/version.json}"
LIVE="$(curl -fsS -H 'Cache-Control: no-cache' "$URL?cb=$(date +%s)" 2>/dev/null)"
if [ -z "$LIVE" ]; then
  echo "check-site: could not reach $URL — skipping (network, or the site is down)" >&2
  exit 0
fi

LIVE_HASH="$(python3 -c "import json,sys; print(json.load(sys.stdin).get('siteHash') or '')" <<<"$LIVE" 2>/dev/null)"
LIVE_VERSION="$(python3 -c "import json,sys; print(json.load(sys.stdin).get('version') or '')" <<<"$LIVE" 2>/dev/null)"
LOCAL_HASH="$(site_hash)"

if [ -z "$LIVE_HASH" ]; then
  echo "check-site: live version.json has no siteHash yet — it predates this check. Publish once to seed it."
  exit 0
fi

if [ "$LOCAL_HASH" = "$LIVE_HASH" ]; then
  echo "✔ web/ and preview/ match what's live (v$LIVE_VERSION)."
  exit 0
fi

echo "✘ web/ or preview/ differ from what's live right now (currently live: v$LIVE_VERSION)." >&2
echo "  Could be uncommitted edits, or committed changes nobody has published yet." >&2
echo "  Run: bash scripts/publish-sheets.sh" >&2
exit 1
