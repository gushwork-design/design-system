#!/usr/bin/env bash
#
# SessionStart hook — opens every NEW chat with a one-line greeting by name.
#
# WHY. A teammate had no way to tell the plugin was active until a skill fired, and the skills
# fire only when a request matches one. A session that opens with "Hey Swapnil, new chat. Gushwork
# design system v1.59.0 is on." says three things at once: the plugin is loaded, which version it
# is, and that this is a fresh chat rather than a resumed one. Ruled by Utsav, 5 Oct 2026 (R48).
#
# WHAT IT CAN AND CANNOT DO. A hook cannot make Claude speak before the person types; it can only
# hand Claude context. So the greeting rides on Claude's FIRST reply. It is additionalContext, not
# systemMessage: the desktop app does not reliably show systemMessage (1 Oct 2026), and one line
# said once is the whole point.
#
# NEW CHATS ONLY. `startup` and `clear` begin a conversation; `resume` and `compact` continue one,
# and "new chat" would be wrong there. The hook reads `source` from the hook input on stdin.
#
# THE NAME comes from the signed-in Claude account (~/.claude.json → oauthAccount.displayName,
# honouring CLAUDE_CONFIG_DIR), then the account's full name on this Mac, then git's user.name.
# First word only, letters only, or no name at all — never a guess.
#
# HARD RULES, same as every hook here — this runs on someone else's machine before they can type:
#   · always exit 0      · never block      · no network      · say nothing on resume/compact
#
# Test it by hand:
#   echo '{"source":"startup"}' | CLAUDE_PLUGIN_ROOT=. bash scripts/greet.sh | python3 -m json.tool
#   echo '{"source":"resume"}'  | CLAUDE_PLUGIN_ROOT=. bash scripts/greet.sh        # prints nothing
#   GW_GREET_NAME=Swapnil GW_GREET_SOURCE=startup CLAUDE_PLUGIN_ROOT=. bash scripts/greet.sh

set -u
command -v python3 >/dev/null 2>&1 || exit 0

# Read only when stdin is a pipe, so running this from a terminal does not wait for input.
HOOK_IN=""
[ -t 0 ] || IFS= read -r -t 2 -d '' HOOK_IN 2>/dev/null || true

GW_HOOK_IN="$HOOK_IN" GW_ROOT="${CLAUDE_PLUGIN_ROOT:-}" \
GW_GIT_NAME="$(git config --get user.name 2>/dev/null || true)" \
GW_GECOS="$(id -F 2>/dev/null || true)" \
python3 - <<'PY' 2>/dev/null || true
import json, os, re

def source():
    forced = os.environ.get("GW_GREET_SOURCE")
    if forced:
        return forced
    try:
        return str(json.loads(os.environ.get("GW_HOOK_IN") or "{}").get("source") or "startup")
    except Exception:
        return "startup"

if source() not in ("startup", "clear"):
    raise SystemExit(0)

def first_word(s):
    s = re.sub(r"[^A-Za-zÀ-ɏ' -]", "", str(s or "")).strip()
    return s.split()[0][:24] if s.split() else ""

def account_name():
    for base in (os.environ.get("CLAUDE_CONFIG_DIR"), os.path.expanduser("~")):
        if not base:
            continue
        try:
            with open(os.path.join(base, ".claude.json")) as f:
                acct = json.load(f).get("oauthAccount") or {}
            for key in ("displayName", "fullName"):
                n = first_word(acct.get(key))
                if n:
                    return n
        except Exception:
            pass
    return ""

name = first_word(os.environ.get("GW_GREET_NAME")) or account_name() \
    or first_word(os.environ.get("GW_GECOS")) or first_word(os.environ.get("GW_GIT_NAME"))

version = ""
try:
    with open(os.path.join(os.environ["GW_ROOT"], ".claude-plugin", "plugin.json")) as f:
        version = str(json.load(f).get("version") or "")
except Exception:
    pass

who = f"Hey {name}," if name else "Hey there,"
what = f"Gushwork design system v{version} is on." if version else "Gushwork design system is on."
line = f"{who} new chat. {what} What are we making?"

ctx = (
    "Gushwork design-system plugin — new-chat greeting. This is a new chat, not a resumed one. "
    f"Open your FIRST reply in this chat with exactly this line, on its own, before anything else: \"{line}\" "
    "Then answer what the user asked. If their first message already contains a request, drop the "
    "closing question and keep the rest of the line as it is. Say it once: never repeat it later in the "
    "chat, never add an emoji, never pad it into a paragraph. If an update notice elsewhere in this "
    "context says a newer version is available, put its update step directly under the greeting, "
    "then carry on."
)
print(json.dumps({"hookSpecificOutput": {"hookEventName": "SessionStart", "additionalContext": ctx}}))
PY
exit 0
