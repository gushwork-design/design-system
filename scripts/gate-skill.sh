#!/usr/bin/env bash
#
# PreToolUse hook on Skill — refuses the gushwork-* skills while this account is not allowed (R67, 9 Oct 2026).
#
# scripts/check-access.sh decides at session start and writes its answer to one small file. This reads
# that file on every Skill call and answers "deny" for a Gushwork skill when the answer is not
# "allowed". It is the part that makes the gate real: a note in Claude's context is advice, a denied
# tool call is not.
#
# FAIL OPEN. No state file, an unreadable one, or a skill that is not ours: exit 0 and say nothing.
# The hook input arrives on stdin as JSON; only tool_input.skill is read from it.
#
#   echo '{"tool_name":"Skill","tool_input":{"skill":"gushwork-design:gushwork-web"}}' \
#     | GW_ACCESS_STATE=/tmp/s.json CLAUDE_PLUGIN_ROOT=. bash scripts/gate-skill.sh

set -u
command -v python3 >/dev/null 2>&1 || exit 0
STATE="${GW_ACCESS_STATE:-$HOME/.claude/gushwork/access.json}"
ROOT="${CLAUDE_PLUGIN_ROOT:-$(cd "$(dirname "$0")/.." && pwd)}"

# No state, or a stale one: decide now, quietly, before the skill runs. The SessionStart hook only runs at
# session start, and a plugin installed mid-session (the usual path in a cloud container, which never
# restarts) has had no session start since. 9 Oct 2026: a personal account installed and ran gushwork-web
# in the same session, straight past the gate, because this file did not exist yet and the gate let the
# missing file through. Now the missing file is the cue to go and look. Still fails open on any error.
STALE=1
if [ -f "$STATE" ]; then
  GW_F="$STATE" python3 -c '
import json, os, sys, time
try: d = json.load(open(os.environ["GW_F"]))
except Exception: sys.exit(1)
sys.exit(0 if time.time() - float(d.get("checkedAt", 0)) < 3600 else 1)' 2>/dev/null && STALE=0
fi
CHECK="$(cd "$(dirname "$0")" && pwd)/check-access.sh"          # its sibling, wherever this copy lives
if [ "$STALE" = 1 ] && [ -f "$CHECK" ]; then
  GW_ACCESS_QUIET=1 GW_ACCESS_STATE="$STATE" CLAUDE_PLUGIN_ROOT="$ROOT" bash "$CHECK" </dev/null >/dev/null 2>&1 || true
fi
[ -f "$STATE" ] || exit 0
INPUT=""
[ -t 0 ] || IFS= read -r -t 2 -d '' INPUT 2>/dev/null || true
GW_IN="$INPUT" GW_F="$STATE" GW_R="$ROOT" python3 -c '
import json, os, re, sys
try:
    skill = str((json.loads(os.environ["GW_IN"] or "{}").get("tool_input") or {}).get("skill") or "")
except Exception:
    sys.exit(0)
if not re.search(r"(^|:)gushwork-", skill):
    sys.exit(0)
try:
    d = json.load(open(os.environ["GW_F"]))
except Exception:
    sys.exit(0)
state = d.get("state")
if state in (None, "", "allowed"):
    sys.exit(0)
who = d.get("email") or "this account"
root = os.environ.get("GW_R", "")
why = {
    "none": "The Gushwork design-system plugin is for Gushwork accounts, and " + who + " is outside the company. Offer the person two options: uninstall the plugin (`claude plugin uninstall gushwork-design@gushwork`), or request access (run `bash \"" + root + "/scripts/request-access.sh\" \"<optional one-line note>\"` and read its answer back).",
    "pending": "An access request for " + who + " is waiting for Utsav at Gushwork. The Gushwork skills stay off until it is granted; the plugin unlocks by itself at the next session.",
    "denied": "Access to the Gushwork design system was not granted for " + who + ", and the plugin is removing itself. Say so in one sentence.",
}.get(state, "The Gushwork skills are switched off for " + who + ".")
print(json.dumps({"hookSpecificOutput": {"hookEventName": "PreToolUse", "permissionDecision": "deny", "permissionDecisionReason": why}}))' 2>/dev/null
exit 0
