#!/usr/bin/env bash
# Warn when skills/, foundation/, or exports/ changed since the last release commit but
# .claude-plugin/plugin.json's version field did not move along with them.
#
#   bash scripts/check-version.sh
#
# WHY THIS EXISTS
# ----------------
# CONTRIBUTING.md is explicit that a version bump is NOT required for content to reach
# teammates — a marketplace refresh pulls whatever is on `main`, bump or not. So this is not
# a "will it ship" gate; it exists for the OTHER cost of skipping the bump: nothing tells
# anyone it happened. Every skill's announce line keeps reporting the last release's date,
# CHANGELOG.md and the changelog sheet gain no row, and the SessionStart update-check hook
# has nothing to compare against (it diffs version numbers) — so a real change to what Claude
# builds from goes out with zero signal anywhere. See CONTRIBUTING.md, "Always stamp."
set -euo pipefail
cd "$(dirname "$0")/.."

MANIFEST=".claude-plugin/plugin.json"
. scripts/_releases.sh

# Newest release commit — the last time the version field actually moved.
IFS=$'\x1f' read -r _V LAST_SHA _D _S _SESSION _BODY < <(releases)
[ -n "${LAST_SHA:-}" ] || { echo "check-version: no releases found — is this a git checkout?" >&2; exit 1; }

CHANGED="$(git diff --name-only "$LAST_SHA" -- skills/ foundation/ exports/)"
if [ -z "$CHANGED" ]; then
  echo "check-version: no plugin-surface changes since the last release."
  exit 0
fi

CURRENT_VERSION="$(sed -n 's/.*"version"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$MANIFEST" | head -1)"
RELEASE_VERSION="$(git show "$LAST_SHA:$MANIFEST" | sed -n 's/.*"version"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -1)"

if [ "$CURRENT_VERSION" != "$RELEASE_VERSION" ]; then
  echo "check-version: version already moved ($RELEASE_VERSION -> $CURRENT_VERSION) — fine."
  exit 0
fi

echo "✘ plugin surface changed since v$RELEASE_VERSION but the version is still v$CURRENT_VERSION:" >&2
echo "$CHANGED" | sed 's/^/    /' >&2
echo >&2
echo "  Content will still reach anyone who refreshes — but nothing will tell them it" >&2
echo "  happened: no changelog row, no updated announce date, no update-check notice." >&2
echo "  Run: bash scripts/release.sh <next-version> \"what changed, in one line\"" >&2
exit 1
