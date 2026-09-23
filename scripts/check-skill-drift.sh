#!/usr/bin/env bash
# Does what each skill CLAIMS still match what the repo HOLDS?
#
# Skills are prose, and prose restates facts — node ids, token names, file paths. Every
# one is a second copy. check-drift.sh compares a BUILT PAGE against the registry;
# nothing compared the skills themselves against anything, so a re-measured component
# moved the exports and left the skill saying whatever was typed the day it was written.
#
#   bash scripts/check-skill-drift.sh           # report
#   bash scripts/check-skill-drift.sh --strict  # exit 1 on a wrong claim
#
# Advisory by default, like check-fonts.sh and check-placeholders.sh. It cannot check
# whether the ADVICE is still good — only a review pass does that.
set -euo pipefail
cd "$(dirname "$0")/.."
exec python3 scripts/_skill_drift.py "$@"
