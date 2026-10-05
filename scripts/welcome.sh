#!/usr/bin/env bash
#
# SessionStart hook — a short, warm hello when a session starts, by first name, so the person knows the
# Gushwork design skills are on.  (R48)
#
# WHY A HOOK. A skill loads only when the request matches its description, so a rule written inside a
# skill cannot greet anyone who starts with something else. This runs at the start of every new session,
# whatever they type first, the same way brand-rule.sh does.
#
# WHAT IT DOES. It works out a first name and hands Claude one instruction: open the first reply with one
# short greeting that says the skills are on, then carry straight on with the work. It prints nothing on
# screen itself. It fires on `startup` and `clear` (a new conversation), never on `resume` or `compact`,
# where someone is already mid-conversation and a second hello would read as a bug.
#
# WHERE THE NAME COMES FROM, in order: the Claude account's display name, the git user.name, the part of
# the account email before the first dot or plus sign. Nothing is sent anywhere, and a name is never used
# to guess anything about the person (pronouns included).
#
# HARD RULES, as for every hook that runs on someone else's machine before they can type:
#   · always exit 0 · never block · say nothing when there is nothing to say
# Opt out for one machine with GW_NO_WELCOME=1.
#
# Test it by hand:   CLAUDE_PLUGIN_ROOT=. bash scripts/welcome.sh | python3 -m json.tool

[ -z "${GW_NO_WELCOME:-}" ] || exit 0
command -v python3 >/dev/null 2>&1 || exit 0

GW_GIT_NAME="$(git config --get user.name 2>/dev/null || true)" \
GW_GIT_EMAIL="$(git config --get user.email 2>/dev/null || true)" \
GW_ROOT="${CLAUDE_PLUGIN_ROOT:-}" python3 - <<'PY' 2>/dev/null || true
import json, os, re

def account():
    for base in (os.environ.get("CLAUDE_CONFIG_DIR"), os.path.expanduser("~")):
        if not base:
            continue
        try:
            with open(os.path.join(base, ".claude.json")) as f:
                return json.load(f).get("oauthAccount") or {}
        except Exception:
            pass
    return {}

def first_name(s):
    s = (s or "").strip()
    if not s:
        return ""
    tok = re.split(r"[\s,]+", s)[0]
    tok = re.sub(r"[^A-Za-zÀ-ɏ'\-]", "", tok)[:30]
    if not tok:
        return ""
    return tok.capitalize() if tok.islower() or tok.isupper() else tok

acc = account()
name = (first_name(acc.get("displayName")) or first_name(acc.get("fullName"))
        or first_name(os.environ.get("GW_GIT_NAME"))
        or first_name(re.split(r"[.+_@]", (acc.get("emailAddress") or os.environ.get("GW_GIT_EMAIL") or ""))[0]))

version = ""
root = os.environ.get("GW_ROOT")
if root:
    try:
        version = json.load(open(os.path.join(root, ".claude-plugin", "plugin.json"))).get("version", "")
    except Exception:
        pass

who = f"the user's first name is {name}" if name else "the user's name is not known, so greet without one"
on = f"the Gushwork design skills are on (v{version})" if version else "the Gushwork design skills are on"
ctx = (
    "Welcome rule (R48). In your FIRST reply of this session, open with one short, warm greeting line: "
    f"{who}; say that {on}; then go straight on with whatever they asked. "
    "If they have not asked for anything yet, end the line by asking what they would like to make. "
    "Keep it to one or two short sentences: no list, no emoji, no summary of the plugin. Vary the wording a "
    f"little, for example 'Hi {name or 'there'}, the Gushwork design skills are on. What are we making?'. "
    "A skill's own 'Using the Gushwork ... skill' line may follow the greeting: keep the two together and short. "
    "Say it once only: do not greet again later in the session. Never guess anything about the person "
    "from their name, and if you must refer to them in the third person use they/them."
)
print(json.dumps({"hookSpecificOutput": {"hookEventName": "SessionStart", "additionalContext": ctx}}))
PY
exit 0
