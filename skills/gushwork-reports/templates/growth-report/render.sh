#!/bin/bash
# Renders growth-report.html -> growth-report.pdf: every tab on one continuous page, 1200 px wide. Run from this folder.
# Needs Google Chrome. Takes about half a minute: it searches for the shortest page height that holds the report on one page.
#
#   bash render.sh [file.html]       default: growth-report.html
#
# Why it is not a plain print. Chrome applies the dashboard's phone breakpoint (max-width: 767px) when it prints, even on a
# 1200 px page, so tables stack into phone-style rows and tiles lose their grid. This prints from a throwaway copy of the
# stylesheet with that breakpoint switched off. The page you ship and the stylesheet in the repo are not touched.
set -euo pipefail
cd "$(dirname "$0")"
FILE="${1:-growth-report.html}"
OUT="${FILE%.html}.pdf"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
[ -x "$CHROME" ] || { echo "Google Chrome not found at $CHROME" >&2; exit 1; }

ROOT="$(cd ../../../.. && pwd)"
TMP="$(mktemp -d)"; TMPHTML=".render-tmp.html"
trap 'rm -rf "$TMP" "$TMPHTML"' EXIT

# the stylesheet copy: the phone breakpoint off, and its repo-relative url() (the logo mask) made absolute
sed -E "s/max-width: *767px/max-width: 0px/g; s#url\(\"\.\./\.\./assets/#url(\"file://$ROOT/assets/#g" \
  "$ROOT/exports/dashboard/dashboard.css" > "$TMP/dashboard.print.css"

pages() { python3 -c "import re,sys; print(len(re.findall(rb'/Type\s*/Page[^s]', open(sys.argv[1],'rb').read())))" "$1"; }

# one run: prints the page at height $1 and says how many pages came out
try() {
  # the page: pointed at the throwaway stylesheet, with this height as its page size (it overrides the stylesheet's default)
  # (the stamp's registry URL is blanked too, so a PDF never carries the "design has moved on" notice)
  sed "s#../../../../exports/dashboard/dashboard.css#file://$TMP/dashboard.print.css#; s#\"registry\":\"https://[^\"]*\"#\"registry\":\"\"#; s#</head>#<style>@page{size:1200px ${1}px;margin:0}</style></head>#" "$FILE" > "$TMPHTML"
  "$CHROME" --headless=new --disable-gpu --no-pdf-header-footer --allow-file-access-from-files \
    --window-size=1280,1000 --run-all-compositor-stages-before-draw --virtual-time-budget=8000 --hide-scrollbars \
    --print-to-pdf="$OUT" "file://$PWD/$TMPHTML" >/dev/null 2>&1
  pages "$OUT"
}

# Binary search for the shortest page that holds the report on one page (a shorter page gives two). Within 20 px.
LO=2000; HI=9000
[ "$(try $HI)" = "1" ] || { echo "the report did not fit one page at $HI px; wrote that attempt to $OUT" >&2; exit 1; }
while [ $((HI - LO)) -gt 20 ]; do
  MID=$(( (LO + HI) / 2 ))
  if [ "$(try $MID)" = "1" ]; then HI=$MID; else LO=$MID; fi
done
try $HI >/dev/null
echo "wrote $OUT (1200 x ${HI} px, one page)"
