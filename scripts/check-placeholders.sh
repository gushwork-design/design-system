#!/usr/bin/env bash
#
# Fails when a page still carries unreplaced {{TOKEN}} placeholders.
#
#   bash scripts/check-placeholders.sh skills/gushwork-web/templates/acme/case-study.html
#   bash scripts/check-placeholders.sh            # every page outside templates/
#
# WHY THIS EXISTS
# ----------------
# templates/ holds PLACEHOLDER pages you copy; examples/ holds worked, filled-in
# instances you read. The failure this guards against is shipping a copy with the
# stubs still in it — "Client name", an empty stat, a quote nobody gave. Those read
# as real copy to everyone except the person who wrote them.
#
# Placeholders are deliberately {{LOUD}} rather than plausible prose, so this check
# is a substring match and cannot miss one by being clever.
#
# templates/ is SKIPPED by design — a template that failed its own check would make
# the check useless noise. Pass a path explicitly to check one anyway.
set -uo pipefail
cd "$(dirname "$0")/.."

if [ $# -gt 0 ]; then
  FILES="$*"
else
  FILES="$(find skills -name '*.html' -not -path '*/templates/*' 2>/dev/null)"
fi

[ -n "$FILES" ] || { echo "check-placeholders: nothing to check."; exit 0; }

FAILED=0
for f in $FILES; do
  [ -f "$f" ] || { echo "check-placeholders: no such file: $f" >&2; FAILED=1; continue; }
  # Unique token names, so a token used five times is reported once.
  HITS="$(grep -o '{{[^}]*}}' "$f" 2>/dev/null | sed 's/{{\([A-Z0-9_]*\).*/{{\1}}/' | sort -u)"
  if [ -n "$HITS" ]; then
    COUNT="$(printf '%s\n' "$HITS" | wc -l | tr -d ' ')"
    echo "✘ $f — $COUNT unreplaced placeholder(s):"
    printf '%s\n' "$HITS" | sed 's/^/    /'
    FAILED=1
  else
    echo "✔ $f — no placeholders left"
  fi
done

if [ "$FAILED" -ne 0 ]; then
  echo
  echo "  Replace every token above before this page goes anywhere public."
  echo "  A worked example: skills/gushwork-web/examples/cutting-edge-plasma/"
  exit 1
fi
