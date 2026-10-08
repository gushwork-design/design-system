#!/usr/bin/env bash
#
# Will this branch's staging page merge without the owner? Run it before you open the PR.
#
#   bash scripts/check-staging-lane.sh              compare against origin/main
#   bash scripts/check-staging-lane.sh --base <ref>
#
# The rules are in scripts/_staging_lane.py. The PR workflow runs the same thing.
set -euo pipefail
cd "$(dirname "$0")/.."
git fetch -q origin main 2>/dev/null || true
exec python3 scripts/_staging_lane.py "$@"
