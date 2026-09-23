#!/usr/bin/env bash
# Record that you have reviewed and passed something — the gate the 15 Sep ruling needs.
#
#   bash scripts/review-pass.sh --list                 what can be passed
#   bash scripts/review-pass.sh --check                what is waiting on you
#   bash scripts/review-pass.sh foundation color       pass a foundation group
#   bash scripts/review-pass.sh web button             pass a component
#   bash scripts/review-pass.sh web button --reject --note "labels bind raw white"
#
# The pass is written onto the registry check-drift.sh already reads, alongside a
# fingerprint of what was reviewed — so when the source moves, the pass expires on its
# own and the row goes back to pending. Logic lives in scripts/_review.py.
set -euo pipefail
cd "$(dirname "$0")/.."
exec python3 scripts/_review.py "$@"
