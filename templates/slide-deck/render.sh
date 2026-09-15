#!/usr/bin/env bash
# Render deck.html to PDF and per-slide PNGs at true 1920x1080.
#
# Needs Google Chrome. Needs a network connection on the first run only, for
# the Phosphor icon CSS; everything else (fonts, images, tokens) is local.
#
# The deck is served over HTTP rather than opened as a file:// URL, because
# Chrome's headless renderer will not load local fonts across a file origin
# and the deck silently falls back to a system face — which looks exactly
# like the Plus Jakarta Sans substitution described in R21 and gets
# misdiagnosed as that.

set -euo pipefail
cd "$(dirname "$0")"

CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
[ -x "$CHROME" ] || { echo "Chrome not found. Set CHROME=/path/to/chrome" >&2; exit 1; }

REPO="$(cd ../.. && pwd)"
REL="templates/$(basename "$PWD")/deck.html"
PORT="${PORT:-8951}"
OUT="${OUT:-out}"
mkdir -p "$OUT"

python3 -m http.server "$PORT" --directory "$REPO" >/dev/null 2>&1 &
SRV=$!
trap 'kill $SRV 2>/dev/null || true' EXIT
for _ in $(seq 30); do
  curl -sf "http://localhost:$PORT/$REL" -o /dev/null && break
  sleep 0.2
done

URL="http://localhost:$PORT/$REL"

echo "PDF -> $OUT/deck.pdf"
"$CHROME" --headless --disable-gpu --no-pdf-header-footer \
  --print-to-pdf="$OUT/deck.pdf" "$URL?export=1" 2>/dev/null

# One PNG per slide. ?export=1&slide=N renders that slide alone at true 1:1,
# so a 1920x1080 window captures it exactly — no scrolling, no fit maths.
COUNT=$(grep -c '<div class="frame"' deck.html)
echo "PNGs -> $OUT/slide-NN.png  ($COUNT slides)"
for i in $(seq 1 "$COUNT"); do
  n=$(printf "%02d" "$i")
  "$CHROME" --headless --disable-gpu --hide-scrollbars \
    --window-size=1920,1080 \
    --screenshot="$OUT/slide-$n.png" \
    --virtual-time-budget=4000 \
    "$URL?export=1&slide=$i" 2>/dev/null
done

echo "Done. $OUT/"
echo
echo "Both outputs keep Vert Grotesk Display. The .pptx and Google Slides"
echo "paths do not — they substitute Plus Jakarta Sans, which is correct."
echo "See R21 in DECISIONS.md before reporting it as a bug."
