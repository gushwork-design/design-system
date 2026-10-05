#!/usr/bin/env bash
#
# Tests for scripts/welcome.sh and the one-click block in scripts/check-update.sh (R48).
#
#   bash scripts/welcome.test.sh
#
# Nothing here touches the real ~/.claude: HOME and CLAUDE_CONFIG_DIR point at a temp directory.

set -uo pipefail
cd "$(dirname "$0")/.."
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
pass=0; fail=0
ck() { if [ "$1" = ok ]; then pass=$((pass+1)); printf '  ✔ %s\n' "$2"; else fail=$((fail+1)); printf '  ✘ %s\n' "$2"; fi; }

ROOT="$TMP/plugin"; mkdir -p "$ROOT/.claude-plugin"; printf '{"name":"gushwork-design","version":"9.8.7"}' > "$ROOT/.claude-plugin/plugin.json"
ctx() { python3 -c "import sys,json;print(json.load(sys.stdin)['hookSpecificOutput']['additionalContext'])" 2>/dev/null; }
run() { # run <account json> [git name]
  mkdir -p "$TMP/home"; printf '%s' "$1" > "$TMP/home/.claude.json"
  HOME="$TMP/home" CLAUDE_CONFIG_DIR="$TMP/home" GIT_CONFIG_GLOBAL="$TMP/gitconfig" GIT_CONFIG_SYSTEM=/dev/null CLAUDE_PLUGIN_ROOT="$ROOT" bash scripts/welcome.sh
}
: > "$TMP/gitconfig"

out="$(run '{"oauthAccount":{"displayName":"Utsav Singh","emailAddress":"utsav.singh@gushwork.ai"}}' | ctx)"
case "$out" in *"first name is Utsav"*) ck ok "the first name comes from the account display name";; *) ck no "name from display name: $out";; esac
case "$out" in *"(v9.8.7)"*) ck ok "it names the version that is running";; *) ck no "version missing";; esac
case "$out" in *"FIRST reply"*"once only"*|*"Say it once only"*) ck ok "it asks for one greeting, once";; *) ck no "once-only rule missing";; esac
case "$out" in *"they/them"*) ck ok "it keeps the they/them default";; *) ck no "pronoun rule missing";; esac

out="$(run '{"oauthAccount":{"displayName":"swapnil","emailAddress":"s@x.com"}}' | ctx)"
case "$out" in *"first name is Swapnil"*) ck ok "a lower-case name is capitalised";; *) ck no "capitalise: $out";; esac

out="$(run '{"oauthAccount":{"emailAddress":"meera.nair+claude@gushwork.ai"}}' | ctx)"
case "$out" in *"first name is Meera"*) ck ok "with no name it falls back to the email's first part";; *) ck no "email fallback: $out";; esac

out="$(run '{}' | ctx)"
case "$out" in *"greet without one"*) ck ok "with no name at all it greets without one";; *) ck no "no-name case: $out";; esac

out="$(run '{"oauthAccount":{"displayName":"<script>x</script> Ana"}}' | ctx)"
case "$out" in *"<"*|*">"*) ck no "markup got through the name: $out";; *) ck ok "markup is stripped from a name";; esac

out="$(GW_NO_WELCOME=1 run '{"oauthAccount":{"displayName":"Utsav"}}')"
[ -z "$out" ] && ck ok "GW_NO_WELCOME=1 says nothing" || ck no "opt-out still printed"

out="$(HOME="$TMP/none" CLAUDE_CONFIG_DIR="$TMP/none" CLAUDE_PLUGIN_ROOT="$TMP/missing" bash scripts/welcome.sh; echo "rc=$?")"
case "$out" in *"rc=0"*) ck ok "a missing config and plugin root still exits 0";; *) ck no "non-zero exit: $out";; esac

python3 -c "
import json
h=json.load(open('hooks/hooks.json'))['hooks']['SessionStart']
w=[x for x in h if any('welcome.sh' in y['command'] for y in x['hooks'])]
assert len(w)==1 and w[0]['matcher']=='startup|clear', w
" 2>/dev/null && ck ok "hooks.json runs it on startup and clear only" || ck no "hooks.json wiring"

# the one-click block in the update notice
bash scripts/version-json.sh > "$TMP/v.json" 2>/dev/null
OLD="$TMP/old"; mkdir -p "$OLD/.claude-plugin"; printf '{"name":"gushwork-design","version":"0.0.1"}' > "$OLD/.claude-plugin/plugin.json"
upd="$(GW_NO_USAGE_PING=1 GW_FORCE_CHECK=1 GW_VERSION_URL="file://$TMP/v.json" HOME="$TMP/home" CLAUDE_PLUGIN_ROOT="$OLD" bash scripts/check-update.sh | ctx)"
case "$upd" in *'```bash'*'claude plugin update gushwork-design@gushwork'*'```'*) ck ok "the update notice asks for the command in its own bash block";; *) ck no "no bash block: $upd";; esac

printf '\n%s passed, %s failed\n' "$pass" "$fail"; [ "$fail" -eq 0 ]
