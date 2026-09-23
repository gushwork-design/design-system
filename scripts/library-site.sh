#!/usr/bin/env bash
# Regenerate preview/library/ — the component library as a site, one page per thing.
#
# DERIVED from foundation/tokens.css, exports/*/component-registry.json, the spec docs
# those entries point at, and exports/ad-page/folds.json. Rendering lives in
# scripts/_library_site.py, primitives in _component_library.py, markdown in _md.py.
# Edit the SOURCE, never the HTML — the next run deletes the tree and rebuilds it.
#
# Publishes to /library: the index and every library page are `internal` (any signed-in
# @gushwork.ai), /library/review is `admin`. Both rules live in web/api/_access.js.
#
# Usage:  bash scripts/library-site.sh          # rebuild
#         bash scripts/library-site.sh --check  # exit 1 if out of date
#         bash scripts/library-site.sh --serve  # rebuild, then serve it locally
#         bash scripts/library-site.sh --open   # rebuild, then open the raw index
#
# --open is the RAW file and will render unstyled: the tree's hrefs point at the deploy
# root, and on disk it sits under preview/ with shell.css over in web/. Use --serve.
set -euo pipefail
cd "$(dirname "$0")/.."
OUT="preview/library"
case "${1:-}" in
  --check)
    tmp="$(mktemp -d)"; trap 'rm -rf "$tmp"' EXIT
    OUTDIR="$tmp/library" python3 scripts/_library_site.py 2>/dev/null
    if ! diff -rq "$tmp/library" "$OUT" >/dev/null 2>&1; then
      echo "$OUT is out of date — run: bash scripts/library-site.sh" >&2
      exit 1
    fi
    echo "$OUT is current." ;;
  --serve)
    # The tree's hrefs are relative to the DEPLOY root, where it is mounted at /library
    # with tokens.css, shell.css, fonts/ and assets/ beside it. On disk it sits one level
    # deeper under preview/, and shell.css is in web/ — so opening index.html directly
    # loads no stylesheet and no fonts. This assembles the real layout and serves it.
    python3 scripts/_library_site.py
    stage="$(mktemp -d)"
    trap 'rm -rf "$stage"' EXIT
    cp -R preview/library "$stage/library"
    mkdir -p "$stage/foundation" "$stage/fonts"
    cp foundation/tokens.css "$stage/foundation/"
    cp web/shell.css "$stage/"
    cp fonts/*.ttf "$stage/fonts/"
    [ -d assets/ad-page ] && mkdir -p "$stage/assets/ad-page" \
      && cp assets/ad-page/*.png "$stage/assets/ad-page/"
    # Find a port that is actually free before advertising one. Stale http.server
    # processes from earlier sessions sit on these ports for days, and the failure
    # mode was the worst kind: the URL printed, then a traceback under it, so the
    # line you were told to open was wrong by the time you read it.
    want="${2:-8799}"
    port="$(python3 - "$want" <<'PORT'
import socket, sys
start = int(sys.argv[1])
for p in range(start, start + 40):
    with socket.socket() as s:
        try:
            s.bind(("127.0.0.1", p))
        except OSError:
            continue
        print(p); break
else:
    sys.exit("no free port in range")
PORT
)"
    [ -n "$port" ] || { echo "could not find a free port" >&2; exit 1; }
    [ "$port" = "$want" ] || echo "  (port $want was busy — using $port)"
    echo
    echo "  Serving the deploy layout — this is what /library will look like."
    echo "  → http://localhost:$port/library/"
    echo "  Ctrl-C to stop."
    echo
    python3 -m http.server "$port" --directory "$stage" >/dev/null
    ;;
  --open) python3 scripts/_library_site.py && open "$OUT/index.html" ;;
  "")     python3 scripts/_library_site.py ;;
  *) echo "unknown flag: $1" >&2; exit 2 ;;
esac
