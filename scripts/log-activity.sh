#!/usr/bin/env bash
#
# PostToolUse hook — records WHICH Gushwork skill ran and the NAMES of the output files it
# produced, so the usage log can answer "what is being made", not only "who started a session".
#
# WHAT IT SENDS, exactly. To the same endpoint as the session-start ping (log-usage), one row:
#   · when a Gushwork skill is invoked:  who, version, event "skill", the skill name
#   · after that, when a web/document output is written in the SAME session:
#                                        who, version, event "file", the file's BASENAME
#   · when a Claude artifact is published in the same session:
#                                        who, version, event "artifact", its claude.ai link
# Every row also carries `sess`: a short one-way hash of the session id, so an output can be tied
# to the skill that ran in the same session. It cannot be turned back into the id.
#
# On an HTML or SVG output, or a published artifact, the hook ALSO measures the file locally and
# sends four flags, never the text it measured:
#   stamp   the gushwork-build stamp is present (a skill built it, not an approximation)
#   tokens  it uses the --gw-* tokens
#   fonts   "ok" (only Vert Grotesk Display, Inter, or the named Plus Jakarta fallback, plus
#           generic stacks), "foreign" (it names another typeface), or "none" (none declared)
#   logo    the real logo is present (a logo file reference, or the symbol's own path data)
# A basename, a link, four flags. Never a path, never the contents, never the prompt. Nothing else
# is read from the hook's input.
#
# THE PYTHON BELOW LIVES INSIDE A SINGLE-QUOTED SHELL STRING, so it must not contain a single quote
# anywhere, comments included. chr(39) is the quote character where one is needed.
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
import hashlib, json, os, re, sys, time

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

ALLOWED_FONTS = {
    "vert grotesk display", "inter", "plus jakarta sans",
    # generic and system stacks are not a choice of typeface
    "sans-serif", "serif", "system-ui", "ui-sans-serif", "monospace", "ui-monospace", "ui-serif",
    "-apple-system", "blinkmacsystemfont", "segoe ui", "helvetica", "helvetica neue", "arial",
    "sf mono", "sfmono-regular", "menlo", "consolas", "monaco", "courier new", "courier",
    "inherit", "initial", "unset",
}

# Four flags about a file. The text is measured here and never leaves this function.
def flags_for(text):
    families = set()
    for decl in re.findall(r"font-family\s*:\s*([^;}{]+)", text, re.I):
        for part in decl.split(","):
            n = part.strip().strip(" \"" + chr(39)).lower()
            if not n or n.startswith("var(") or (n.startswith("-") and n != "-apple-system"):
                continue
            families.add(n)
    for fam in re.findall(r"fonts\.googleapis\.com/css2?\?[^\"\s)]*?family=([A-Za-z0-9+]+)", text):
        families.add(fam.replace("+", " ").lower())
    foreign = [f for f in families if f not in ALLOWED_FONTS]
    return {
        "stamp": "gushwork-build" in text,
        "tokens": "var(--gw-" in text,
        "fonts": "foreign" if foreign else ("ok" if families else "none"),
        "logo": ("assets/logo/gushwork" in text or "gushwork-logo" in text
                 or "gushwork-symbol" in text or "M76.6088 4.56344" in text),
    }

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

SESS = hashlib.sha256(sid.encode()).hexdigest()[:12]

def out(event, **extra):
    row = {"email": (account_email() or os.environ.get("GW_GIT_EMAIL", ""))[:160],
           "version": version(), "event": event, "sess": SESS}
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
    extra = {}
    # Only text formats can be measured. A Write of a PDF, deck or PNG carries no readable text.
    if base.lower().endswith((".html", ".svg")):
        extra["flags"] = flags_for(str(inp.get("content") or ""))
    out("file", file=base[:120], **extra)

elif tool == "Artifact":
    st = load()
    if st is None:
        sys.exit(0)                      # no Gushwork skill has run in this session
    if str(inp.get("action") or "publish") != "publish" or not inp.get("file_path"):
        sys.exit(0)                      # a read, list or asset upload is not a published page
    blob = json.dumps(d.get("tool_response") or "")
    m = re.search(r"https://claude\.ai/(?:code/)?artifact/[A-Za-z0-9-]+", blob)
    if not m:
        sys.exit(0)                      # nothing was published, so there is no result to record
    url = m.group(0)
    if url in st.get("urls", []):
        sys.exit(0)                      # a republish of the same page is not a new result
    st.setdefault("urls", []).append(url)
    with open(marker, "w") as f:
        json.dump(st, f)
    extra = {}
    try:
        with open(os.path.expanduser(str(inp.get("file_path")))) as f:
            extra["flags"] = flags_for(f.read())
    except Exception:
        pass
    out("artifact", url=url, **extra)
' 2>/dev/null)"

if [ -n "$BODY" ]; then
  ( nohup curl -fsS --max-time 3 -X POST \
      -H 'content-type: application/json' \
      --data "$BODY" "$USAGE_URL" >/dev/null 2>&1 & ) >/dev/null 2>&1
fi
exit 0
