#!/usr/bin/env bash
#
# Ask Gushwork for access to the plugin, from an account outside the company (R67, 9 Oct 2026).
#
# Claude runs this when the person chooses "request access" after scripts/check-access.sh stopped
# the skills. It posts the address, the plugin version and an optional one-line note to the hub; the
# hub DMs Utsav from Bruce with Allow and Deny, and lists the request on Access Control and Analytics.
# The plugin unlocks by itself on the next session once the answer is yes — nothing to reinstall.
#
#   bash scripts/request-access.sh ["a one-line note about who you are"]
#
# Prints exactly one line, for Claude to read back. Exit 0 on every path: a failure here is a line of
# text, not a stack.

set -u
NOTE="${1:-}"
ROOT="${CLAUDE_PLUGIN_ROOT:-$(cd "$(dirname "$0")/.." && pwd)}"
ACCESS_URL="${GW_ACCESS_URL:-https://gushwork-design.vercel.app/api/plugin-access}"
STATE="${GW_ACCESS_STATE:-$HOME/.claude/gushwork/access.json}"

command -v python3 >/dev/null 2>&1 || { echo "python3 is needed to send the request."; exit 0; }
command -v curl    >/dev/null 2>&1 || { echo "curl is needed to send the request."; exit 0; }

VERSION="$(python3 -c "
import json
try: print(json.load(open('$ROOT/.claude-plugin/plugin.json'))['version'])
except Exception: pass
" 2>/dev/null)"

EMAIL="${GW_ACCESS_EMAIL:-}"
[ -n "$EMAIL" ] || EMAIL="$(GW_GIT_EMAIL="$(git config --get user.email 2>/dev/null || true)" python3 -c '
import json, os
def account_email():
    for base in (os.environ.get("CLAUDE_CONFIG_DIR"), os.path.expanduser("~")):
        if not base:
            continue
        try:
            with open(os.path.join(base, ".claude.json")) as f:
                e = (json.load(f).get("oauthAccount") or {}).get("emailAddress")
            if isinstance(e, str) and "@" in e:
                return e.strip()
        except Exception:
            pass
    return ""
print((account_email() or os.environ.get("GW_GIT_EMAIL", "")).strip().lower()[:160])' 2>/dev/null)"
[ -n "$EMAIL" ] || { echo "No signed-in account was found, so there is nobody to request access for."; exit 0; }

BODY="$(GW_E="$EMAIL" GW_V="$VERSION" GW_N="$NOTE" python3 -c '
import json, os
print(json.dumps({"email": os.environ["GW_E"], "version": os.environ["GW_V"], "note": os.environ["GW_N"][:280]}))' 2>/dev/null)"

ANSWER="$(curl -sS --max-time 8 -X POST -H 'content-type: application/json' --data "$BODY" "$ACCESS_URL" 2>/dev/null || true)"

GW_A="$ANSWER" GW_E="$EMAIL" GW_F="$STATE" python3 -c '
import json, os, time
e = os.environ["GW_E"]
try:
    d = json.loads(os.environ["GW_A"])
except Exception:
    d = {}
s = d.get("state")
if s in ("allowed", "pending", "denied"):
    try:
        os.makedirs(os.path.dirname(os.environ["GW_F"]), exist_ok=True)
        json.dump({"email": e, "state": s, "why": "request", "checkedAt": time.time()}, open(os.environ["GW_F"], "w"))
    except Exception:
        pass
if s == "pending":
    print("Request sent. Utsav at Gushwork will see it" + (" in Slack" if d.get("told") else "") + "; the plugin unlocks by itself at your next session once it is granted.")
elif s == "allowed":
    print("Good news: this account is already allowed. Start a new session and the skills will be on.")
elif s == "denied":
    print("Access was not granted for this account. If you think that is a mistake, ask Utsav at Gushwork.")
else:
    print("The request did not go through" + (": " + str(d["error"]) if d.get("error") else "") + ". Try again in a minute, or ask Utsav at Gushwork directly.")' 2>/dev/null \
  || echo "The request did not go through. Try again in a minute, or ask Utsav at Gushwork directly."
exit 0
