#!/usr/bin/env bash
#
# Prints a short Slack message describing what changed since the last release.
#
#   bash scripts/release-notes.sh              # since the last tag, or last 10 commits
#   bash scripts/release-notes.sh v1.1.0       # since a specific ref
#
# Review it before posting. It is built from commit subjects, so it is only as
# good as those — and it cannot know which changes people actually care about.

set -euo pipefail

ROOT="$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
cd "$ROOT"

VERSION="$(python3 -c "import json;print(json.load(open('.claude-plugin/plugin.json'))['version'])")"
SINCE="${1:-$(git describe --tags --abbrev=0 2>/dev/null || true)}"

if [ -n "$SINCE" ]; then
  RANGE="$SINCE..HEAD"
  BASIS="since $SINCE"
else
  RANGE="-10"
  BASIS="last 10 commits — no tag found, so this may overreach"
fi

COMMITS="$(git log --no-merges --format='%s' $RANGE)"
[ -n "$COMMITS" ] && COUNT="$(printf '%s\n' "$COMMITS" | wc -l | tr -d ' ')" || COUNT=0

if [ "$COUNT" -eq 0 ]; then
  echo "Nothing new $BASIS — no release to announce." >&2
  exit 1
fi

# Which surfaces moved? Skills matter to people; docs and scripts mostly don't.
CHANGED="$(git diff --name-only $RANGE 2>/dev/null || git diff --name-only HEAD~10..HEAD)"
SURFACES=""
printf '%s\n' "$CHANGED" | grep -q '^skills/gushwork-dashboard/' && SURFACES="dashboard"
printf '%s\n' "$CHANGED" | grep -q '^skills/gushwork-lead-magnet/\|^templates/lead-magnet/\|^exports/lead-magnet/' && SURFACES="lead-magnet"
printf '%s\n' "$CHANGED" | grep -q '^skills/gushwork-web/' && SURFACES="${SURFACES:+$SURFACES and }web"
printf '%s\n' "$CHANGED" | grep -q '^foundation/tokens.css' && SURFACES="${SURFACES:+$SURFACES, plus }tokens"

cat <<EOF
──────── copy from here ────────
*Gushwork Design System v$VERSION* is out.

$(printf '%s\n' "$COMMITS" | sed 's/^/• /')
EOF

if [ -n "$SURFACES" ]; then
  echo
  echo "Affects the **$SURFACES** side."
fi

cat <<'EOF'

If you have auto-update on it arrives at your next start. To take it now:
`claude plugin marketplace update gushwork && claude plugin update gushwork-design@gushwork`
then type /reload-plugins in the chat — no restart.

Check what you're on: the skill says its version when it fires.
──────── to here ────────
EOF

echo
echo "($COUNT commit(s) $BASIS. Trim anything nobody needs to read before posting.)" >&2
