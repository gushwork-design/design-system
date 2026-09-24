#!/usr/bin/env bash
#
# The last leg of the review loop — see REVIEW-LOOP.md.
#
# A reviewer reacted ✅ on a notice in Slack; slack-events.js queued the approval; this is
# where it comes back into a session so the pass can actually be recorded. There is no
# persistent Claude to notify, so the loop closes by the NEXT session asking.
#
# WHY THIS IS NOT PART OF check-update.sh. One hook emits one JSON envelope. Two scripts,
# two envelopes; one script printing twice is a malformed document. Separate hooks also mean
# a broken approvals endpoint cannot silence the "you are on a stale version" notice, which
# is the more important of the two.
#
# WHY IT PEEKS RATHER THAN DRAINS. A hook can be killed mid-run — its 10s timeout, a laptop
# lid, a flaky network. Draining here would let an approval vanish without ever being
# applied, and nobody would know to re-do it. Peeking is idempotent: worst case the same
# notice appears next session too. The queue is drained when the pass is actually recorded.
#
# Silent unless there is something to say. Requires GUSHWORK_NOTICE_TOKEN, so it does nothing
# at all for anyone who is not the reviewer.
set -u

command -v python3 >/dev/null 2>&1 || exit 0
command -v curl    >/dev/null 2>&1 || exit 0
[ -n "${GUSHWORK_NOTICE_TOKEN:-}" ] || exit 0

URL="${GW_APPROVALS_URL:-https://gushwork-design.vercel.app/api/approvals}"

# --max-time so a hanging endpoint cannot hold up a session; every failure exits 0 silently.
JSON="$(curl -fsS --max-time 3 -H "x-gushwork-token: $GUSHWORK_NOTICE_TOKEN" \
  "$URL?peek=1" 2>/dev/null || true)"
[ -n "$JSON" ] || exit 0

APPROVALS_JSON="$JSON" python3 <<'PY' 2>/dev/null || exit 0
import json, os

try:
    rows = json.loads(os.environ["APPROVALS_JSON"]).get("approvals") or []
except Exception:
    raise SystemExit(0)

# De-duplicate: one component reacted to twice is one pass, not two.
seen, items = set(), []
for r in rows:
    if not isinstance(r, dict):
        continue
    surface, key = r.get("surface"), r.get("key")
    if not surface or not key or (surface, key) in seen:
        continue
    seen.add((surface, key))
    items.append((surface, key))

if not items:
    raise SystemExit(0)

names = ", ".join(f"{s}/{k}" for s, k in items)
cmds = " ; ".join(f"bash scripts/review-pass.sh {s} {k}" for s, k in items)
n = len(items)

print(json.dumps({"hookSpecificOutput": {
    "hookEventName": "SessionStart",
    "systemMessage": (
        f"{n} component{'s' if n != 1 else ''} approved in Slack, not yet recorded: {names}"
    ),
    "additionalContext": (
        f"These were approved by ✅ reaction in Slack but the pass is NOT recorded yet: {names}. "
        f"To apply, from the design-system repo: {cmds}. "
        "BEFORE applying, re-check that each component's source has not moved since it was "
        "approved — review-pass.sh stores a fingerprint, and an approval given days ago may be "
        "for a version the reviewer never actually saw. If it moved, do not apply it; say so "
        "and re-post the notice instead."
    ),
}}))
PY
exit 0
