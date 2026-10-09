#!/usr/bin/env bash
#
# Tests for the plugin access gate: scripts/check-access.sh, scripts/gate-skill.sh and the quiet path in
# scripts/brand-rule.sh. Run before you touch any of them.
#
#   bash scripts/check-access.test.sh
#
# Same reasoning as check-update.test.sh: these run on every session start on every teammate's machine.
# The failures that matter are "it printed a hook error", "it hung", "it locked a company address out",
# and "it uninstalled the plugin on a machine it should have left alone". Nothing here touches the real
# ~/.claude: the hub is a file:// fixture, the state file is in a temp dir, and `claude` is a stub.
set -uo pipefail
cd "$(dirname "$0")/.."
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
pass=0; fail=0
ck() { if [ "$1" = ok ]; then pass=$((pass+1)); printf '  ✔ %s\n' "$2"; else fail=$((fail+1)); printf '  ✘ %s\n' "$2"; fi; }

ROOT="$TMP/plugin"; mkdir -p "$ROOT/.claude-plugin"
printf '{"name":"gushwork-design","version":"2.1.0"}' > "$ROOT/.claude-plugin/plugin.json"
STUB="$TMP/claude-stub"; CALLS="$TMP/calls"
printf '#!/bin/sh\necho "$@" >> "%s"\n' "$CALLS" > "$STUB"; chmod +x "$STUB"
fixture() { printf '{"email":"x","state":"%s"}' "$1" > "$TMP/hub-$1.json"; printf 'file://%s/hub-%s.json' "$TMP" "$1"; }

run() {   # run <email> <hub-url> <state-file>
  GW_ACCESS_EMAIL="$1" GW_ACCESS_URL="$2" GW_ACCESS_STATE="$3" GW_CLAUDE_BIN="$STUB" GW_FORCE_CHECK=1 \
    CLAUDE_PLUGIN_ROOT="$ROOT" bash scripts/check-access.sh 2>"$TMP/err"
}
state_of() { python3 -c "import json,sys; print(json.load(open(sys.argv[1])).get('state',''))" "$1" 2>/dev/null; }
gate() {  # gate <skill> <state-file>
  printf '{"tool_name":"Skill","tool_input":{"skill":"%s"}}' "$1" | GW_ACCESS_STATE="$2" CLAUDE_PLUGIN_ROOT="$ROOT" bash scripts/gate-skill.sh 2>/dev/null
}

echo "company address"
S="$TMP/s1.json"; OUT="$(run utsav.singh@gushwork.ai "$(fixture denied)" "$S")"
ck "$([ -z "$OUT" ] && echo ok)" "says nothing"
ck "$([ "$(state_of "$S")" = allowed ] && echo ok)" "state is allowed, without asking the hub (fixture said denied)"
ck "$([ -z "$(gate gushwork-design:gushwork-web "$S")" ] && echo ok)" "gate lets a Gushwork skill through"
ck "$([ ! -s "$TMP/err" ] && echo ok)" "nothing on stderr"

echo "outsider, never seen"
S="$TMP/s2.json"; OUT="$(run someone@gmail.com "$(fixture none)" "$S")"
ck "$(printf '%s' "$OUT" | python3 -c 'import json,sys; d=json.load(sys.stdin); assert d["hookSpecificOutput"]["hookEventName"]=="SessionStart"; assert "request-access.sh" in d["hookSpecificOutput"]["additionalContext"]; assert "plugin uninstall" in d["hookSpecificOutput"]["additionalContext"]; print("ok")' 2>/dev/null)" "one JSON envelope naming both options"
ck "$([ "$(state_of "$S")" = none ] && echo ok)" "state is none"
G="$(gate gushwork-design:gushwork-web "$S")"
ck "$(printf '%s' "$G" | python3 -c 'import json,sys; d=json.load(sys.stdin)["hookSpecificOutput"]; assert d["permissionDecision"]=="deny" and d["hookEventName"]=="PreToolUse"; print("ok")' 2>/dev/null)" "gate refuses a Gushwork skill"
ck "$([ -z "$(gate anthropic-skills:pdf "$S")" ] && echo ok)" "gate ignores another plugin's skill"
ck "$([ -z "$(GW_ACCESS_STATE="$S" bash scripts/brand-rule.sh 2>/dev/null)" ] && echo ok)" "brand rule stays quiet"
ck "$([ ! -f "$CALLS" ] && echo ok)" "nothing was uninstalled"

echo "outsider, request pending"
S="$TMP/s3.json"; OUT="$(run someone@gmail.com "$(fixture pending)" "$S")"
ck "$(printf '%s' "$OUT" | grep -q 'waiting for Utsav' && echo ok)" "says the request is waiting"
ck "$([ "$(state_of "$S")" = pending ] && echo ok)" "state is pending"
ck "$([ -n "$(gate gushwork-design:gushwork-slides "$S")" ] && echo ok)" "gate still refuses"

echo "outsider, denied"
S="$TMP/s4.json"; OUT="$(run someone@gmail.com "$(fixture denied)" "$S")"
# The uninstall is detached (nohup + &), so it lands a moment after the hook has already returned.
for i in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20; do [ -f "$CALLS" ] && break; sleep 0.1; done
ck "$(printf '%s' "$OUT" | grep -q 'removing itself' && echo ok)" "says the plugin is removing itself"
ck "$([ -f "$CALLS" ] && grep -q 'plugin uninstall gushwork-design@gushwork' "$CALLS" && echo ok)" "ran claude plugin uninstall, detached"
ck "$([ "$(state_of "$S")" = denied ] && echo ok)" "state is denied"

echo "outsider, allowed"
rm -f "$CALLS"; S="$TMP/s5.json"; OUT="$(run someone@gmail.com "$(fixture allowed)" "$S")"
ck "$([ -z "$OUT" ] && echo ok)" "says nothing"
ck "$([ "$(state_of "$S")" = allowed ] && echo ok)" "state is allowed"
ck "$([ -z "$(gate gushwork-design:gushwork-web "$S")" ] && echo ok)" "gate lets the skill through"
ck "$([ -n "$(GW_ACCESS_STATE="$S" bash scripts/brand-rule.sh 2>/dev/null)" ] && echo ok)" "brand rule speaks again"
OUT="$(GW_ACCESS_EMAIL=someone@gmail.com GW_ACCESS_URL="$(fixture denied)" GW_ACCESS_STATE="$S" GW_CLAUDE_BIN="$STUB" CLAUDE_PLUGIN_ROOT="$ROOT" bash scripts/check-access.sh 2>/dev/null)"
ck "$([ -z "$OUT" ] && [ "$(state_of "$S")" = allowed ] && [ ! -f "$CALLS" ] && echo ok)" "a fresh allowed answer is cached for the hour (the hub was not asked)"

echo "hub unreachable"
S="$TMP/s6.json"; OUT="$(run someone@gmail.com "file://$TMP/does-not-exist.json" "$S")"
ck "$([ -z "$OUT" ] && echo ok)" "says nothing"
ck "$([ "$(state_of "$S")" = allowed ] && echo ok)" "fails open"
S="$TMP/s7.json"; printf '{"email":"someone@gmail.com","state":"pending","checkedAt":0}' > "$S"
OUT="$(run someone@gmail.com "file://$TMP/does-not-exist.json" "$S")"
ck "$([ -z "$OUT" ] && [ "$(state_of "$S")" = pending ] && echo ok)" "keeps what it knew when the hub is down"

echo "no identity"
S="$TMP/s8.json"; OUT="$(GW_ACCESS_URL="$(fixture denied)" GW_ACCESS_STATE="$S" GW_CLAUDE_BIN="$STUB" GW_FORCE_CHECK=1 CLAUDE_PLUGIN_ROOT="$ROOT" HOME="$TMP" GIT_CONFIG_GLOBAL=/dev/null bash scripts/check-access.sh 2>/dev/null)"
ck "$([ -z "$OUT" ] && [ "$(state_of "$S")" = allowed ] && echo ok)" "no address at all → allowed, silent"

echo "installed mid-session: no state file yet when the first skill is called"
S="$TMP/s10.json"
G="$(printf '{"tool_name":"Skill","tool_input":{"skill":"gushwork-design:gushwork-web"}}' | GW_ACCESS_EMAIL=someone@gmail.com GW_ACCESS_URL="$(fixture none)" GW_ACCESS_STATE="$S" GW_CLAUDE_BIN="$STUB" CLAUDE_PLUGIN_ROOT="$ROOT" bash scripts/gate-skill.sh 2>/dev/null)"
ck "$(printf '%s' "$G" | python3 -c 'import json,sys; d=json.load(sys.stdin)["hookSpecificOutput"]; assert d["permissionDecision"]=="deny"; assert "request-access.sh" in d["permissionDecisionReason"]; print("ok")' 2>/dev/null)" "gate asks the hub itself and refuses, naming the request script"
ck "$([ "$(state_of "$S")" = none ] && echo ok)" "and leaves the state file behind for the rest of the session"
S="$TMP/s11.json"
G="$(printf '{"tool_name":"Skill","tool_input":{"skill":"gushwork-design:gushwork-web"}}' | GW_ACCESS_EMAIL=someone@gushwork.ai GW_ACCESS_URL="$(fixture denied)" GW_ACCESS_STATE="$S" GW_CLAUDE_BIN="$STUB" CLAUDE_PLUGIN_ROOT="$ROOT" bash scripts/gate-skill.sh 2>/dev/null)"
ck "$([ -z "$G" ] && [ "$(state_of "$S")" = allowed ] && echo ok)" "a company address passes without the hub"
S="$TMP/s12.json"; printf '{"email":"someone@gmail.com","state":"allowed","checkedAt":0}' > "$S"
G="$(printf '{"tool_name":"Skill","tool_input":{"skill":"gushwork-design:gushwork-web"}}' | GW_ACCESS_EMAIL=someone@gmail.com GW_ACCESS_URL="$(fixture denied)" GW_ACCESS_STATE="$S" GW_CLAUDE_BIN="$STUB" GW_NO_AUTO_PULL=1 CLAUDE_PLUGIN_ROOT="$ROOT" bash scripts/gate-skill.sh 2>/dev/null)"
ck "$([ -n "$G" ] && [ "$(state_of "$S")" = denied ] && echo ok)" "a stale allowed state is re-checked, so a revoke lands without a restart"
OUT="$(GW_ACCESS_QUIET=1 run someone@gmail.com "$(fixture none)" "$TMP/s13.json")"
ck "$([ -z "$OUT" ] && [ "$(state_of "$TMP/s13.json")" = none ] && echo ok)" "quiet mode writes the state and prints nothing"
S="$TMP/s14.json"
OUT="$(GW_ACCESS_URL="$(fixture denied)" GW_ACCESS_STATE="$S" GW_CLAUDE_BIN="$STUB" GW_FORCE_CHECK=1 CLAUDE_PLUGIN_ROOT="$ROOT" HOME="$TMP" GIT_CONFIG_GLOBAL=/dev/null GIT_AUTHOR_EMAIL=cloud@gmail.com bash scripts/check-access.sh 2>/dev/null)"
ck "$([ -n "$OUT" ] && [ "$(state_of "$S")" = denied ] && echo ok)" "GIT_AUTHOR_EMAIL counts as an identity (cloud containers)"

echo "timing"
START=$(date +%s); run someone@gmail.com "$(fixture none)" "$TMP/s9.json" >/dev/null; END=$(date +%s)
ck "$([ $((END-START)) -le 4 ] && echo ok)" "finishes within 4s"

echo
printf '%d passed, %d failed\n' "$pass" "$fail"
[ "$fail" -eq 0 ]
