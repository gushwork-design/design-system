#!/usr/bin/env bash
#
# PostToolUse hook — records WHICH Gushwork skill ran and the NAMES of the output files it
# produced, so the usage log can answer "what is being made", not only "who started a session".
#
# WHAT IT SENDS, exactly. To the same endpoint as the session-start ping (log-usage), one row:
#   · when a Gushwork skill is invoked:  who, version, event "skill", the skill name
#   · after that, when a web/document output is written in the SAME session:
#                                        who, version, event "file", the file's BASENAME
# A basename, never a path, never the contents, never the prompt. Nothing else is read from the
# hook's input.
#
# WHY IT IS GATED ON A SKILL HAVING RUN. This hook fires on every Write in every project on a
# teammate's machine. Without the gate it would log the name of every file they touch in unrelated
# work. The gate is a small marker file per session, written only when a Gushwork skill runs, and
# a file event needs it. A Write before any Gushwork skill has run in that session is ignored.
#
# WHAT IT CANNOT SEE. Only files written with the Write tool. A PDF or deck produced by a script
# through Bash is not a Write, so it is not logged. That is a limit of the hook, not an oversight.
#
# HARD RULES, same as check-update.sh, because this runs after tool calls on someone else's machine:
#   · always exit 0 — a non-zero exit prints a hook error
#   · silent on every path, and never blocks: the request is detached and capped at 3s
#   · OPT-OUT: GW_NO_USAGE_PING=1 turns it off completely, the same switch as the session ping
#
# Test it by hand:
#   echo '{"session_id":"t","tool_name":"Skill","tool_input":{"skill":"gushwork-design:gushwork-web"}}' \
#     | GW_USAGE_URL=http://localhost:9999/ CLAUDE_PLUGIN_ROOT=. bash scripts/log-activity.sh
set -u

[ -z "${GW_NO_USAGE_PING:-}" ] || exit 0
command -v python3 >/dev/null 2>&1 || exit 0
command -v curl    >/dev/null 2>&1 || exit 0

ROOT="${CLAUDE_PLUGIN_ROOT:-$(cd "$(dirname "$0")/.." 2>/dev/null && pwd)}"
USAGE_URL="${GW_USAGE_URL:-https://gushwork-design.vercel.app/api/log-usage}"

# The hook's input arrives on stdin and can be large (a Write carries the whole file), so it is read
# by python from stdin directly rather than being passed through an environment variable.
BODY="$(GW_GIT_EMAIL="$(git config --get user.email 2>/dev/null || true)" GW_ROOT="$ROOT" \
  python3 -c '
import json, os, re, sys, time

try:
    d = json.load(sys.stdin)
except Exception:
    sys.exit(0)

tool = d.get("tool_name") or ""
inp = d.get("tool_input") or {}
sid = re.sub(r"[^A-Za-z0-9_-]", "", str(d.get("session_id") or ""))[:64]
if not sid:
    sys.exit(0)

state_dir = os.path.expanduser("~/.claude/gushwork")
marker = os.path.join(state_dir, "active-" + sid + ".json")

# Output types worth naming. Deliberately narrow: what a design skill hands back.
OUTPUT_EXT = (".html", ".svg", ".pdf", ".pptx", ".png")

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

def version():
    try:
        with open(os.path.join(os.environ.get("GW_ROOT", ""), ".claude-plugin", "plugin.json")) as f:
            return str(json.load(f).get("version", ""))[:32]
    except Exception:
        return ""

def out(event, **extra):
    row = {"email": (account_email() or os.environ.get("GW_GIT_EMAIL", ""))[:160],
           "version": version(), "event": event}
    row.update(extra)
    print(json.dumps(row))

def load():
    try:
        with open(marker) as f:
            return json.load(f)
    except Exception:
        return None

if tool == "Skill":
    name = str(inp.get("skill") or "")
    if "gushwork" not in name.lower():
        sys.exit(0)
    os.makedirs(state_dir, exist_ok=True)
    st = load() or {"files": []}
    with open(marker, "w") as f:
        json.dump(st, f)
    # Old markers are dead weight; drop any not touched for a week.
    try:
        for n in os.listdir(state_dir):
            p = os.path.join(state_dir, n)
            if n.startswith("active-") and time.time() - os.path.getmtime(p) > 7 * 86400:
                os.remove(p)
    except Exception:
        pass
    out("skill", skill=name[:80])

elif tool == "Write":
    st = load()
    if st is None:
        sys.exit(0)                      # no Gushwork skill has run in this session
    path = str(inp.get("file_path") or "")
    base = os.path.basename(path)
    if not base.lower().endswith(OUTPUT_EXT):
        sys.exit(0)
    if base in st.get("files", []):
        sys.exit(0)                      # once per file per session, not once per rewrite
    st.setdefault("files", []).append(base)
    with open(marker, "w") as f:
        json.dump(st, f)
    out("file", file=base[:120])
' 2>/dev/null)"

if [ -n "$BODY" ]; then
  ( nohup curl -fsS --max-time 3 -X POST \
      -H 'content-type: application/json' \
      --data "$BODY" "$USAGE_URL" >/dev/null 2>&1 & ) >/dev/null 2>&1
fi
exit 0
