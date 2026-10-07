#!/bin/bash
# Renders one-pager.html -> one-pager.pdf (640 x 1036 px, 1pp). Run from this folder.
set -e
cd "$(dirname "$0")"
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless=new --disable-gpu --no-pdf-header-footer \
  --allow-file-access-from-files --run-all-compositor-stages-before-draw \
  --virtual-time-budget=20000 --hide-scrollbars \
  --print-to-pdf="one-pager.pdf" "file://$PWD/one-pager.html" 2>/dev/null
echo "wrote one-pager.pdf"
