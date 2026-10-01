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

# What the owner pressed on the Design System page (Pass, Rework, Reject), queued by web/api/_review.js. A
# separate read from the ✅ queue so an old deploy without it cannot silence the Slack approvals.
DECISIONS="$(curl -fsS --max-time 3 -H "x-gushwork-token: $GUSHWORK_NOTICE_TOKEN" \
  "$URL?kind=decisions&peek=1" 2>/dev/null || true)"
[ -n "$JSON$DECISIONS" ] || exit 0
# Not "${JSON:-{}}": the first } closes the expansion and the second is appended to a real answer.
[ -n "$JSON" ] || JSON='{}'
[ -n "$DECISIONS" ] || DECISIONS='{}'

APPROVALS_JSON="$JSON" DECISIONS_JSON="$DECISIONS" python3 <<'PY' 2>/dev/null || exit 0
import json, os

try:
    rows = json.loads(os.environ["APPROVALS_JSON"]).get("approvals") or []
except Exception:
    rows = []
try:
    decisions = json.loads(os.environ["DECISIONS_JSON"]).get("decisions") or []
except Exception:
    decisions = []

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

# Button decisions. Each carries the fingerprint the owner was looking at, so the apply command refuses if the
# source has moved since. One decision per item, newest wins (the endpoint already de-duplicates).
def q(t):
    return "'" + str(t).replace("'", "'\\''") + "'"

dec_cmds, rework, dec_names = [], [], []
for d in decisions:
    if not isinstance(d, dict) or not d.get("scope") or not d.get("key"):
        continue
    sc, k, act, note, fp = d["scope"], d["key"], d.get("action"), d.get("note") or "", d.get("fp") or ""
    exp = f" --expect {fp}" if fp else ""
    base = f"bash scripts/review-pass.sh {sc} {k}"
    if act == "pass":
        dec_cmds.append(base + exp)
    elif act == "reject":
        dec_cmds.append(base + " --reject --note " + q(note) + exp)
    elif act == "rework":
        dec_cmds.append(base + " --rework --note " + q(note) + exp)
        rework.append((sc, k, note))
    else:
        continue
    dec_names.append(f"{act} {sc}/{k}")

if dec_cmds:
    sysmsg = f"{len(dec_cmds)} review decision{'s' if len(dec_cmds) != 1 else ''} made on the site, not yet recorded: " + ", ".join(dec_names)
    ctx = (
        "The owner made these decisions on the Design System page, and they are NOT recorded in the repo yet: "
        + ", ".join(dec_names) + ". To record them, from the design-system repo: " + " ; ".join(dec_cmds) + ". "
        "Each command carries --expect with the fingerprint the owner was looking at: if it refuses because the "
        "source moved, do not force it; say so. After recording, regenerate with bash scripts/library-site.sh, commit, "
        "and open a PR (main needs a reviewed PR), then drain the queue with "
        "GET /api/approvals?kind=decisions using x-gushwork-token. "
    )
    if rework:
        ctx += ("REWORK: the owner sent these back with a note. After recording each one, fix it as the note says, "
                "then tell the owner it is ready to look at again: "
                + " | ".join(f"{sc}/{k}: {n}" for sc, k, n in rework) + ". ")
    if not items:
        print(json.dumps({"systemMessage": sysmsg, "hookSpecificOutput": {"hookEventName": "SessionStart", "additionalContext": ctx}}))
        raise SystemExit(0)
else:
    sysmsg, ctx = "", ""

if not items:
    raise SystemExit(0)

names = ", ".join(f"{s}/{k}" for s, k in items)
cmds = " ; ".join(f"bash scripts/review-pass.sh {s} {k}" for s, k in items)
n = len(items)

# systemMessage is a top-level field; inside hookSpecificOutput it is ignored.
print(json.dumps({"systemMessage": (
        f"{n} component{'s' if n != 1 else ''} approved in Slack, not yet recorded: {names}"
        + (" · " + sysmsg if sysmsg else "")
    ), "hookSpecificOutput": {
    "hookEventName": "SessionStart",
    "additionalContext": (
        f"These were approved by ✅ reaction in Slack but the pass is NOT recorded yet: {names}. "
        f"To apply, from the design-system repo: {cmds}. "
        "BEFORE applying, re-check that each component's source has not moved since it was "
        "approved — review-pass.sh stores a fingerprint, and an approval given days ago may be "
        "for a version the reviewer never actually saw. If it moved, do not apply it; say so "
        "and re-post the notice instead." + (" " + ctx if ctx else "")
    ),
}}))
PY
exit 0
