#!/usr/bin/env bash
#
# SessionStart hook — tells this machine when the design system has moved, and turns on
# auto-update if nobody ever did.
#
# WHY THIS IS A HOOK AND NOT A DOCUMENTED STEP
# -------------------------------------------
# Two facts made every earlier approach leak:
#
#   1. `autoUpdate` lives per-machine in known_marketplaces.json and cannot be set from a repo's
#      .claude/settings.json. So it was a manual step — and manual steps get skipped, after which
#      a teammate runs a stale version indefinitely, emitting last month's colours with full
#      confidence. No error, no warning.
#   2. Auto-update, when it IS on, refreshes at startup but only takes effect on the NEXT start.
#      So the one session that could have told you is the one that doesn't know yet.
#
# A hook that ships INSIDE the plugin arrives with the plugin. It runs whether or not anyone
# flipped a flag, and it runs at the start of the session that is about to use the stale copy.
# It also names the components that changed, which the generic "plugin updated" line cannot.
#
# HARD RULES, because this runs on every session start on someone else's machine:
#   · always exit 0 — a non-zero exit prints a hook-error notice every single session
#   · never block — every network call is time-boxed, every failure is silent
#   · say nothing when there is nothing to say
#
# Not to be confused with scripts/hooks/ — those are git hooks. This one is Claude Code's.
#
# Test it by hand:
#   CLAUDE_PLUGIN_ROOT=. bash scripts/check-update.sh | python3 -m json.tool
#   GW_FORCE_CHECK=1 CLAUDE_PLUGIN_ROOT=. bash scripts/check-update.sh   # ignore the cache

# Overridable so the hook can be exercised against a local payload before it is deployed:
#   GW_VERSION_URL="file://$PWD/version.json" GW_FORCE_CHECK=1 CLAUDE_PLUGIN_ROOT=. \
#     bash scripts/check-update.sh
VERSION_URL="${GW_VERSION_URL:-https://gushwork-design.vercel.app/version.json}"
CACHE_DIR="$HOME/.claude/gushwork"
CACHE="$CACHE_DIR/update-check.json"
TTL=21600                     # 6h — the network call, not the notice, is what gets cached
KNOWN="$HOME/.claude/plugins/known_marketplaces.json"

# Fail open, everywhere. There is deliberately no `set -e` and no ERR trap: an ERR trap fires on
# any non-zero simple command, so the first failing curl would exit before the git fallback ran.
# Every step below either guards its own failure or falls through to an explicit exit 0.
set -u

# ── a portable timeout ────────────────────────────────────────────────────────────────────
# macOS ships no `timeout`, and a hook that hangs on a VPN is a hook that gets ripped out.
# Prefer the real thing when coreutils is present, else box it ourselves.
run_capped() {
  local secs="$1"; shift
  if command -v timeout >/dev/null 2>&1;  then timeout  "$secs" "$@"; return $?; fi
  if command -v gtimeout >/dev/null 2>&1; then gtimeout "$secs" "$@"; return $?; fi
  "$@" & local pid=$!
  # >/dev/null matters: the subshell inherits stdout, and a command substitution waits for every
  # writer to close it — without this, every capped call would stall for the whole timeout.
  ( sleep "$secs"; kill -9 "$pid" 2>/dev/null ) >/dev/null 2>&1 & local killer=$!
  wait "$pid" 2>/dev/null; local rc=$?
  kill -9 "$killer" 2>/dev/null; wait "$killer" 2>/dev/null
  return "$rc"
}

command -v python3 >/dev/null 2>&1 || exit 0

# ── what is running right now ──────────────────────────────────────────────────────────────
# CLAUDE_PLUGIN_ROOT is the INSTALLED copy (…/plugins/cache/<market>/<plugin>/<version>/), which
# is an extracted tree, not a git clone. Its own plugin.json is the only honest answer to "what
# version is this session actually using".
ROOT="${CLAUDE_PLUGIN_ROOT:-}"
[ -n "$ROOT" ] && [ -f "$ROOT/.claude-plugin/plugin.json" ] || exit 0
LOCAL_VERSION="$(python3 -c "
import json,sys
try: print(json.load(open('$ROOT/.claude-plugin/plugin.json'))['version'])
except Exception: pass
" 2>/dev/null)"
[ -n "$LOCAL_VERSION" ] || exit 0

# ── usage ping ─────────────────────────────────────────────────────────────────────────────
# One row per session in a private Sheet, answering the question ROLLOUT.md admits it cannot:
# "you cannot tell who ran it". Identity, version, timestamp — nothing about the work itself.
# See the header of web/api/log-usage.js for what is and is not collected, and why it goes to
# a Sheet rather than into this public repo.
#
# Three properties it must keep, all for the same reason the update check has them — a hook
# that costs anything is a hook someone rips out:
#   · DETACHED. nohup + & so the session never waits on it, capped at 3s regardless.
#   · SILENT. No output on any path, success or failure. Nothing here is worth a line.
#   · OPT-OUT. GW_NO_USAGE_PING=1 turns it off completely, no questions asked.
# The endpoint itself answers 204 and does nothing until it is configured, so this is inert
# for anyone who has not set up the Sheet.
USAGE_URL="${GW_USAGE_URL:-https://gushwork-design.vercel.app/api/log-usage}"
if [ -z "${GW_NO_USAGE_PING:-}" ]; then
  # git's own identity: the same value that attributes every commit in this repo. Built with
  # python3 rather than string-concatenation so a stray quote cannot produce invalid JSON.
  USAGE_BODY="$(GW_EMAIL="$(git config --get user.email 2>/dev/null || true)" \
    GW_VER="$LOCAL_VERSION" python3 -c '
import json, os
print(json.dumps({
    "email": os.environ.get("GW_EMAIL", "")[:160],
    "version": os.environ.get("GW_VER", "")[:32],
    "event": "session-start",
}))' 2>/dev/null)"
  if [ -n "$USAGE_BODY" ]; then
    ( nohup curl -fsS --max-time 3 -X POST \
        -H 'content-type: application/json' \
        --data "$USAGE_BODY" "$USAGE_URL" >/dev/null 2>&1 & ) >/dev/null 2>&1
  fi
fi

# Pending ✅ approvals are a SEPARATE hook — scripts/check-approvals.sh. One hook emits one
# JSON envelope, and two `print(json.dumps(...))` from the same script would concatenate into
# a malformed document. Registering them separately in hooks/hooks.json means each speaks for
# itself and one failing cannot silence the other.

# ── is the cache still warm? ───────────────────────────────────────────────────────────────
# The CHECK is cached, not the notice. Someone who is behind is told at every session start
# until they update; we just do not re-hit the network for it.
mkdir -p "$CACHE_DIR" 2>/dev/null || exit 0
PAYLOAD=""
if [ -z "${GW_FORCE_CHECK:-}" ] && [ -f "$CACHE" ]; then
  PAYLOAD="$(python3 - "$CACHE" "$TTL" <<'PY' 2>/dev/null
import json, sys, time
try:
    d = json.load(open(sys.argv[1]))
except Exception:
    sys.exit(0)
if time.time() - float(d.get("checkedAt", 0)) < float(sys.argv[2]):
    print(json.dumps(d.get("payload") or {}))
PY
)"
fi

# ── otherwise go and look ──────────────────────────────────────────────────────────────────
if [ -z "$PAYLOAD" ]; then
  # 1 · the public deploy. No auth, no git, and it keeps working after the repo goes private —
  #     the same reason publish-sheets.sh puts component-registry.json there.
  PAYLOAD="$(curl -fsS --max-time 3 "$VERSION_URL" 2>/dev/null || true)"

  # 2 · fall back to the marketplace clone. installLocation is where Claude Code put it; never
  #     hardcode that path. Needs repo access, which is exactly why it is the fallback.
  if [ -z "$PAYLOAD" ] && [ -f "$KNOWN" ]; then
    CLONE="$(python3 -c "
import json
try: print(json.load(open('$KNOWN')).get('gushwork',{}).get('installLocation',''))
except Exception: pass
" 2>/dev/null)"
    if [ -n "$CLONE" ] && [ -d "$CLONE/.git" ]; then
      run_capped 8 git -C "$CLONE" fetch -q origin main >/dev/null 2>&1
      PAYLOAD="$(python3 - "$CLONE" <<'PY' 2>/dev/null
import json, subprocess, sys
clone = sys.argv[1]
def at_head(path):
    return subprocess.run(["git","-C",clone,"show",f"origin/main:{path}"],
                          capture_output=True, text=True, timeout=5).stdout
try:
    mk = json.loads(at_head(".claude-plugin/marketplace.json"))
    reg = json.loads(at_head("exports/dashboard/component-registry.json"))
except Exception:
    sys.exit(0)
print(json.dumps({
    "version": mk.get("metadata", {}).get("version"),
    "components": {k: {"version": v.get("version"), "breaking": bool(v.get("breaking"))}
                   for k, v in reg.get("components", {}).items()},
}))
PY
)"
    fi
  fi

  [ -n "$PAYLOAD" ] || exit 0
  python3 - "$CACHE" "$PAYLOAD" <<'PY' 2>/dev/null || true
import json, os, sys, time, tempfile
cache, payload = sys.argv[1], sys.argv[2]
try:
    body = json.loads(payload)
except Exception:
    sys.exit(0)
fd, tmp = tempfile.mkstemp(dir=os.path.dirname(cache))
with os.fdopen(fd, "w") as f:
    json.dump({"checkedAt": time.time(), "payload": body}, f)
os.replace(tmp, cache)
PY
fi

# ── behind or not? ─────────────────────────────────────────────────────────────────────────
VERDICT="$(python3 - "$LOCAL_VERSION" "$PAYLOAD" <<'PY' 2>/dev/null
import json, sys

def semver(v):
    try:
        return tuple(int(x) for x in str(v).split("."))
    except Exception:
        return ()

local, raw = sys.argv[1], sys.argv[2]
try:
    d = json.loads(raw)
except Exception:
    sys.exit(0)

remote = d.get("version")
lv, rv = semver(local), semver(remote)
if not lv or not rv or rv <= lv:
    sys.exit(0)                                    # current, or unparseable — say nothing

# Which components moved since the copy this session is running, and which of those break a
# build that used them. Same comparison check-drift.sh makes against a stamped artifact.
must, also = [], []
for name, c in (d.get("components") or {}).items():
    cv = semver(c.get("version"))
    if cv and cv > lv:
        (must if c.get("breaking") else also).append(name)

print(json.dumps({"remote": remote, "breaking": sorted(must), "changed": sorted(also)}))
PY
)"
[ -n "$VERDICT" ] || exit 0

# ── turn on auto-update, once ──────────────────────────────────────────────────────────────
# The step people skip. Idempotent, refuses to touch the file if it is not valid JSON, and
# writes atomically so a killed hook cannot leave a half-written marketplace config.
FLIPPED="$(python3 - "$KNOWN" <<'PY' 2>/dev/null
import json, os, sys, tempfile
path = sys.argv[1]
if not os.path.exists(path):
    sys.exit(0)
try:
    d = json.load(open(path))
except Exception:
    sys.exit(0)                                    # malformed: leave it alone, stay silent
e = d.get("gushwork")
if not isinstance(e, dict) or e.get("autoUpdate") is True:
    sys.exit(0)
e["autoUpdate"] = True
fd, tmp = tempfile.mkstemp(dir=os.path.dirname(path))
with os.fdopen(fd, "w") as f:
    f.write(json.dumps(d, indent=2) + "\n")
os.replace(tmp, path)
print("yes")
PY
)"

# ── say it ─────────────────────────────────────────────────────────────────────────────────
# systemMessage reaches the person; additionalContext reaches Claude, so it can answer "am I
# current?" without re-deriving any of this. Plain stdout would land in both, unstructured.
FLIPPED="$FLIPPED" LOCAL_VERSION="$LOCAL_VERSION" VERDICT="$VERDICT" python3 <<'PY'
import json, os

v = json.loads(os.environ["VERDICT"])
local, remote = os.environ["LOCAL_VERSION"], v["remote"]
breaking, changed = v["breaking"], v["changed"]
flipped = os.environ.get("FLIPPED") == "yes"

head = f"Gushwork design system v{remote} is out — this session is on v{local}."
bits = []
if breaking:
    bits.append(f"{len(breaking)} breaking: " + ", ".join(breaking[:6])
                + (f" +{len(breaking) - 6} more" if len(breaking) > 6 else ""))
if changed:
    bits.append(f"{len(changed)} changed")
if bits:
    head += " " + " · ".join(bits) + "."

if flipped:
    tail = ("Auto-update was off on this machine — it is on now, so the next start picks this up. "
            "To take it now: claude plugin update gushwork-design@gushwork, then restart.")
else:
    tail = ("Auto-update is on, so this lands at your next start. To take it now: "
            "claude plugin update gushwork-design@gushwork, then restart.")

print(json.dumps({"hookSpecificOutput": {
    "hookEventName": "SessionStart",
    "systemMessage": head + " " + tail,
    "additionalContext": (
        f"Gushwork design system: running v{local}, v{remote} is available. "
        + (f"Breaking since v{local}: {', '.join(breaking)}. " if breaking else "")
        + (f"Also changed: {', '.join(changed)}. " if changed else "")
        + "If the user asks whether they are current, they are not. "
        # Only claim components moved when some actually did. A release can bump the plugin
        # without touching a component doc, and pointing at "the components listed above" when
        # nothing was listed reads as a bug and costs the whole notice its credibility.
        + ("Anything you build with this version may use superseded specs for the components "
           "named above; say so rather than silently building. " if (breaking or changed) else "")
        + "Update with: claude plugin update gushwork-design@gushwork "
          "(a restart is required either way)."
    ),
}}))
PY
exit 0
