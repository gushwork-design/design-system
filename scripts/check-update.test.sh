#!/usr/bin/env bash
#
# Tests for the SessionStart hook. Run before you touch scripts/check-update.sh.
#
#   bash scripts/check-update.test.sh
#
# Why this file exists at all: the hook runs on every session start on every teammate's machine,
# before anyone can type. The failure that matters is not "it printed the wrong number" — it is
# "it printed a hook error every session", or "it hung", or "it rewrote a marketplace config it
# should have left alone". None of those are visible from reading the script, and all of them are
# cheap to assert. Two real bugs were caught here on the first pass: an ERR trap that swallowed
# the git fallback, and a backgrounded timeout that held stdout open for the full timeout.
#
# Nothing here touches the real ~/.claude — payloads are file:// fixtures and the marketplace
# config is a copy.

set -uo pipefail
cd "$(dirname "$0")/.."
HOOK="scripts/check-update.sh"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
pass=0; fail=0

ck() { if [ "$1" = ok ]; then pass=$((pass+1)); printf '  ✔ %s\n' "$2"; else fail=$((fail+1)); printf '  ✘ %s\n' "$2"; fi; }

fake() {                      # fake <version> -> prints a plugin root running that version
  local d="$TMP/plugin-$1"; mkdir -p "$d/.claude-plugin"
  printf '{"name":"gushwork-design","version":"%s"}' "$1" > "$d/.claude-plugin/plugin.json"
  printf '%s' "$d"
}

run() {                       # run <plugin-root> <payload-url>
  GW_FORCE_CHECK=1 GW_VERSION_URL="$2" CLAUDE_PLUGIN_ROOT="$1" bash "$HOOK" 2>"$TMP/err"
}

bash scripts/version-json.sh > "$TMP/v.json"
CUR="$(python3 -c "import json;print(json.load(open('$TMP/v.json'))['version'])")"
# Every speaking case below is FLAGGED at the current version (R50): the live notify.json may
# well point at an older release, and then "behind" is silent by design, not by accident.
# unflagged.json is the same payload with the flag removed — the night-release case.
python3 - "$TMP/v.json" "$CUR" "$TMP/unflagged.json" <<'PY'
import json, sys
p, cur, unflagged = sys.argv[1:4]
d = json.load(open(p))
json.dump({**d, "notify": None}, open(unflagged, "w"))
d["notify"] = {"version": cur, "summary": "a new template",
               "links": ["https://example.test/ad-page"]}
json.dump(d, open(p, "w"))
PY
OLD="$(python3 -c "
v=[int(x) for x in '$CUR'.split('.')]; v[1]-=1; print('.'.join(map(str,v)))")"

# The ENVELOPE comes from the real generator, so a change to version.json's shape is caught.
# The component MAP must not: a scenario named "nothing moved" has to actually have nothing
# moving in it, whatever the live registry holds that day. Both fixtures below therefore pin
# every real component at OLD and add only what the case is about.
#
# This is not hypothetical tidiness. Tests 2 and 3 were derived from the live registry and
# passed until v1.42.0 moved metric-card and stat-card — after which "nothing moved" had two
# components moving in it, and "1 changed" was three. Two tests went red without the hook
# changing at all.
python3 - "$TMP/v.json" "$OLD" "$CUR" "$TMP/quiet.json" "$TMP/breaking.json" <<'PY'
import json, sys
src, old, top, quiet_p, breaking_p = sys.argv[1:6]
d = json.load(open(src))

# nothing above OLD — the "the plugin moved but no component did" release
d["components"] = {k: {"version": old, "breaking": False} for k in d["components"]}
json.dump(d, open(quiet_p, "w"))

# exactly two breaking and one not, all above OLD
d["components"]["badge"] = {"version": top, "breaking": True}
d["components"]["data-table"] = {"version": top, "breaking": True}
d["components"]["card-shell"] = {"version": top, "breaking": False}
json.dump(d, open(breaking_p, "w"))
PY

echo "current=$CUR  simulated-stale=$OLD"

# 1 · behind → speaks, exits 0, emits the documented JSON envelope
out="$(run "$(fake "$OLD")" "file://$TMP/v.json")"; rc=$?
[ "$rc" = 0 ] && ck ok "behind: exit 0" || ck no "behind: exit 0 (got $rc)"
printf '%s' "$out" | python3 -c "
import json,sys
o=json.load(sys.stdin); d=o['hookSpecificOutput']
assert d['hookEventName']=='SessionStart'
assert 'systemMessage' not in d, 'systemMessage inside hookSpecificOutput is ignored by Claude Code'
assert '$CUR' in o['systemMessage'] and '$OLD' in o['systemMessage']
assert d['additionalContext'] and 'first reply' in d['additionalContext']
assert 'reload-plugins' in d['additionalContext'] and 'reload-plugins' in o['systemMessage']
assert 'then restart' not in o['systemMessage'], 'the restart claim is stale since /reload-plugins'
" 2>/dev/null && ck ok "behind: names both versions in a valid envelope" \
                || ck no "behind: envelope malformed"

# 1b · behind, but the newest FLAGGED release is one this copy already has → silent. This is the
#      R50 case: a bump that changes nothing a teammate builds with must not wake anyone.
out="$(run "$(fake "$OLD")" "file://$TMP/unflagged.json")"; rc=$?
[ "$rc" = 0 ] && [ -z "$out" ] && ck ok "behind, not flagged: silent, exit 0" \
                              || ck no "behind, not flagged: spoke (rc=$rc) $out"
printf '%s' "$(run "$(fake "$OLD")" "file://$TMP/v.json")" | grep -q 'a new template' \
  && ck ok "flagged: the summary is in the notice" || ck no "flagged: summary missing"
run "$(fake "$OLD")" "file://$TMP/v.json" | python3 -c "
import json,sys
o=json.load(sys.stdin); m=o['systemMessage']; c=o['hookSpecificOutput']['additionalContext']
assert 'on Gushwork design system v$OLD' in m and 'a new template' in m, m
assert 'https://example.test/ad-page' in m and 'https://example.test/ad-page' in c, 'links missing'
assert 'changelog-sheet' in m, 'the changelog sheet must always be linked'
assert 'do not list earlier releases' in c and 'colleague' in c, c
" 2>/dev/null && ck ok "flagged: names the flagged version, its links and the changelog" \
              || ck no "flagged: version/links/changelog wrong"

# 2 · the plugin moved but no component did → must not point at a list that is not
#     there. Its own payload: the live registry normally DOES have components above OLD.
out="$(run "$(fake "$OLD")" "file://$TMP/quiet.json")"
printf '%s' "$out" | grep -q "components named above" \
  && ck no "behind, nothing moved: dangling 'components named above'" \
  || ck ok "behind, nothing moved: no dangling reference"

# 3 · breaking components are named, and counted separately from the rest
run "$(fake "$OLD")" "file://$TMP/breaking.json" | python3 -c "
import json,sys
m=json.load(sys.stdin)['systemMessage']
assert '2 breaking' in m and 'badge' in m and 'data-table' in m, m
assert '1 changed' in m, m
" 2>/dev/null && ck ok "breaking: counted and named" || ck no "breaking: not reported"

# 4 · current → silent. The common case, and the one that must produce no output at all.
out="$(run "$(fake "$CUR")" "file://$TMP/v.json")"
[ -z "$out" ] && ck ok "current: silent" || ck no "current: spoke when it should not ($out)"

# 5 · ahead of the published version (a maintainer's own clone) → silent, never negative news
V_NEXT="$(python3 -c "
v=[int(x) for x in '$CUR'.split('.')]; v[1]+=1; print('.'.join(map(str,v)))")"
out="$(run "$(fake "$V_NEXT")" "file://$TMP/v.json")"
[ -z "$out" ] && ck ok "ahead: silent" || ck no "ahead: spoke ($out)"

# 6 · unparseable payload → silent, not a crash
echo 'not json' > "$TMP/bad.json"
out="$(run "$(fake "$OLD")" "file://$TMP/bad.json")"; rc=$?
[ "$rc" = 0 ] && [ -z "$out" ] && ck ok "malformed payload: silent, exit 0" \
                              || ck no "malformed payload: rc=$rc out=$out"

# 7 · no CLAUDE_PLUGIN_ROOT → silent. Belt and braces: it is always set in practice.
out="$(GW_FORCE_CHECK=1 bash "$HOOK" 2>/dev/null)"; rc=$?
[ "$rc" = 0 ] && [ -z "$out" ] && ck ok "no plugin root: silent, exit 0" \
                              || ck no "no plugin root: rc=$rc out=$out"

# 8 · dead endpoint → must fail open FAST. A hook that hangs is a hook that gets removed.
#     The git fallback may or may not fire here depending on the clone; either way it is capped.
t0=$(python3 -c 'import time;print(time.time())')
run "$(fake "$OLD")" "https://127.0.0.1:9/version.json" >/dev/null; rc=$?
python3 - "$t0" "$rc" <<'PY'
import sys, time
el = time.time() - float(sys.argv[1])
ok = sys.argv[2] == "0" and el < 12
print(("  ✔ " if ok else "  ✘ ") + f"dead endpoint: exit {sys.argv[2]} in {el:.1f}s (cap 12s)")
sys.exit(0 if ok else 1)
PY
[ $? = 0 ] && pass=$((pass+1)) || fail=$((fail+1))

# 9 · the autoUpdate flip, on a COPY. Idempotent, and refuses a file it cannot parse.
FLIP="$TMP/flip.py"
sed -n '/^FLIPPED="\$(python3 - "\$KNOWN"/,/^PY$/p' "$HOOK" | sed '1d;$d' > "$FLIP"
cat > "$TMP/km.json" <<'JSON'
{ "gushwork": { "source": { "source": "github", "repo": "x/y" } } }
JSON
[ "$(python3 "$FLIP" "$TMP/km.json")" = "yes" ] && ck ok "flip: sets autoUpdate" || ck no "flip: did not set it"
python3 -c "
import json;assert json.load(open('$TMP/km.json'))['gushwork']['autoUpdate'] is True" \
  && ck ok "flip: value is true" || ck no "flip: value wrong"
[ -z "$(python3 "$FLIP" "$TMP/km.json")" ] && ck ok "flip: idempotent" || ck no "flip: not idempotent"
echo 'nope' > "$TMP/km-bad.json"
before="$(cat "$TMP/km-bad.json")"
python3 "$FLIP" "$TMP/km-bad.json" >/dev/null 2>&1
[ "$(cat "$TMP/km-bad.json")" = "$before" ] && ck ok "flip: leaves malformed config alone" \
                                            || ck no "flip: touched a malformed config"

echo
if [ "$fail" = 0 ]; then echo "✔ $pass passed"; else echo "✘ $fail failed, $pass passed"; exit 1; fi
