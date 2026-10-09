#!/usr/bin/env bash
#
# SessionStart hook — is this account allowed to use the plugin? (R67, 9 Oct 2026)
#
# WHY. The repo is public, so anyone can install the plugin, and three personal addresses did on 1 Oct
# 2026 without anyone on the team knowing who they were. Utsav's ruling: keep the repo public; stop an
# address outside the company before the skills load, and offer two things — uninstall, or request
# access. A request reaches Utsav as a Slack DM from Bruce and shows on Access Control and Analytics;
# a grant lands here on the person's next session with no reinstall.
#
# WHAT IT DOES, in order
#   1. Who is signed in — the Claude account's address, git's user.email as the fallback. The same
#      identity the usage ping sends, so this and the Analytics page always agree on who someone is.
#   2. On the company domain → allowed, nothing to say. Most sessions end here in a millisecond.
#   3. Otherwise ask the hub where the address stands (3s cap, cached 1h when allowed, re-asked every
#      session when not — so a grant lands at once, and a revoke within the hour).
#   4. Write the answer to $STATE. scripts/gate-skill.sh reads it on every Skill call and refuses the
#      Gushwork skills while the answer is not "allowed"; scripts/brand-rule.sh stays quiet too.
#   5. Say something only when there is something to say: the two options (not seen before), where
#      the request stands (pending), or that the plugin is removing itself (denied — "blocked and
#      uninstalled", Utsav, 9 Oct).
#
# WHAT IT IS NOT. The address is read from the person's own machine, so this is a gate against the
# casual outsider and the install-by-accident, not against someone who edits a file. Making the repo
# private is the only thing that stops an old copy updating; this stops a new copy working.
#
# FAIL OPEN. No python3, no curl, no identity, no network, a hub that errors: the answer is "allowed"
# and nothing is printed. A gate that locks the company out of its own design system on a VPN is a
# gate that gets ripped out. Always exit 0 — a non-zero exit prints a hook-error notice every session.
#
# TRY IT
#   GW_ACCESS_EMAIL=someone@gmail.com GW_ACCESS_URL="file://$PWD/fixture.json" \
#     GW_ACCESS_STATE=/tmp/s.json CLAUDE_PLUGIN_ROOT=. bash scripts/check-access.sh
#   bash scripts/check-access.test.sh

set -u
command -v python3 >/dev/null 2>&1 || exit 0

ROOT="${CLAUDE_PLUGIN_ROOT:-}"
[ -n "$ROOT" ] && [ -f "$ROOT/.claude-plugin/plugin.json" ] || exit 0
VERSION="$(python3 -c "
import json
try: print(json.load(open('$ROOT/.claude-plugin/plugin.json'))['version'])
except Exception: pass
" 2>/dev/null)"

CACHE_DIR="$HOME/.claude/gushwork"
STATE="${GW_ACCESS_STATE:-$CACHE_DIR/access.json}"
ACCESS_URL="${GW_ACCESS_URL:-https://gushwork-design.vercel.app/api/plugin-access}"
DOMAIN="${GW_ALLOWED_DOMAIN:-gushwork.ai}"
PLUGIN="gushwork-design@gushwork"
TTL=3600

# ── who ───────────────────────────────────────────────────────────────────────────────────
# GW_ACCESS_EMAIL exists for the tests. Only the address is read from ~/.claude.json, nothing else in it.
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

mkdir -p "$(dirname "$STATE")" 2>/dev/null || exit 0

write_state() {   # write_state <state> <why>
  GW_E="$EMAIL" GW_S="$1" GW_W="${2:-}" GW_V="$VERSION" GW_F="$STATE" python3 -c '
import json, os, time
json.dump({"email": os.environ["GW_E"], "state": os.environ["GW_S"], "why": os.environ["GW_W"],
           "version": os.environ["GW_V"], "checkedAt": time.time()}, open(os.environ["GW_F"], "w"))' 2>/dev/null || true
}

# No identity at all: nothing to gate on. Said once in the state file so gate-skill.sh lets the skills through.
if [ -z "$EMAIL" ] || [ "${EMAIL#*@}" = "$EMAIL" ]; then write_state allowed no-identity; exit 0; fi
case "$EMAIL" in *"@$DOMAIN") write_state allowed domain; exit 0 ;; esac

# ── still fresh? An allowed answer is kept for an hour; anything else is asked again every session. ──
if [ -z "${GW_FORCE_CHECK:-}" ] && [ -f "$STATE" ]; then
  GW_E="$EMAIL" GW_F="$STATE" GW_T="$TTL" python3 -c '
import json, os, sys, time
try: d = json.load(open(os.environ["GW_F"]))
except Exception: sys.exit(1)
ok = d.get("email") == os.environ["GW_E"] and d.get("state") == "allowed" and time.time() - float(d.get("checkedAt", 0)) < float(os.environ["GW_T"])
sys.exit(0 if ok else 1)' 2>/dev/null && exit 0
fi

# ── ask the hub ───────────────────────────────────────────────────────────────────────────
command -v curl >/dev/null 2>&1 || { write_state allowed no-curl; exit 0; }
case "$ACCESS_URL" in
  file://*) URL="$ACCESS_URL" ;;                                   # the tests hand over a fixture
  *) URL="$ACCESS_URL?email=$(python3 -c 'import sys,urllib.parse; print(urllib.parse.quote(sys.argv[1], safe=""))' "$EMAIL")&v=$VERSION" ;;
esac
ANSWER="$(curl -fsS --max-time 3 -H 'accept: application/json' "$URL" 2>/dev/null || true)"
STATE_NOW="$(GW_A="$ANSWER" python3 -c '
import json, os
try:
    s = json.loads(os.environ["GW_A"]).get("state")
    print(s if s in ("allowed", "pending", "denied", "none") else "")
except Exception:
    print("")' 2>/dev/null)"

# No answer: keep whatever we knew, else fail open. Silent either way.
if [ -z "$STATE_NOW" ]; then
  [ -f "$STATE" ] || write_state allowed unreachable
  exit 0
fi
write_state "$STATE_NOW" hub
[ "$STATE_NOW" = allowed ] && exit 0

# ── denied: the plugin removes itself, detached, so the session never waits on it ────────────
if [ "$STATE_NOW" = denied ] && [ -z "${GW_NO_AUTO_PULL:-}" ]; then
  BIN="${GW_CLAUDE_BIN:-}"
  [ -n "$BIN" ] || BIN="$(command -v claude 2>/dev/null || true)"
  [ -n "$BIN" ] || BIN="${CLAUDE_CODE_EXECPATH:-}"
  [ -n "$BIN" ] || for c in "$HOME/.claude/local/claude" "$HOME/.local/bin/claude" /opt/homebrew/bin/claude /usr/local/bin/claude; do
    [ -x "$c" ] && { BIN="$c"; break; }
  done
  if [ -n "$BIN" ] && [ -x "$BIN" ]; then
    ( nohup "$BIN" plugin uninstall "$PLUGIN" >/dev/null 2>&1 & ) >/dev/null 2>&1
  fi
fi

# ── say it ────────────────────────────────────────────────────────────────────────────────
GW_S="$STATE_NOW" GW_E="$EMAIL" GW_R="$ROOT" GW_P="$PLUGIN" python3 -c '
import json, os
s, e, root, plugin = os.environ["GW_S"], os.environ["GW_E"], os.environ["GW_R"], os.environ["GW_P"]
req = "bash \"" + root + "/scripts/request-access.sh\""
un = "claude plugin uninstall " + plugin
common = ("The Gushwork design-system plugin is for Gushwork accounts. This session is signed in as " + e +
          ", which is outside the company, so the gushwork-* skills are switched off in this session and any call to one is refused. ")
if s == "none":
    msg = "Gushwork design system: this plugin is for Gushwork accounts. Ask Claude to uninstall it, or to request access."
    ctx = (common + "Before anything else, tell the person this in two plain sentences and offer exactly two options: "
           "(1) uninstall the plugin, or (2) request access from Gushwork. If they choose uninstall, run `" + un + "` and tell them "
           "it takes effect at their next session. If they choose request access, ask for an optional one-line note about who they are, "
           "then run `" + req + " \"<note>\"` (or with no argument) and read its one-line answer back to them. Do not use any gushwork-* skill.")
elif s == "pending":
    msg = "Gushwork design system: your access request is waiting for Utsav. The skills stay off until it is granted."
    ctx = (common + "An access request from this account is already waiting for Utsav at Gushwork; the plugin unlocks by itself on the "
           "next session once it is granted. Say so in one sentence if the person asks about it or tries to use the design system, and "
           "offer `" + un + "` if they would rather remove it. Do not use any gushwork-* skill.")
else:
    msg = "Gushwork design system: access was not granted for this account. The plugin is removing itself."
    ctx = (common + "Access was not granted for this account, and the plugin is uninstalling itself now (it is gone at the next "
           "session). If the person asks, say so in one sentence and that they can ask Utsav at Gushwork if they believe this is a "
           "mistake. Do not use any gushwork-* skill.")
print(json.dumps({"systemMessage": msg, "hookSpecificOutput": {"hookEventName": "SessionStart", "additionalContext": ctx}}))' 2>/dev/null
exit 0
