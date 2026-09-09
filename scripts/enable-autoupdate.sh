#!/usr/bin/env bash
#
# Turns on auto-update for the Gushwork marketplace on THIS machine, so new
# versions of the design system arrive on their own.
#
#   bash scripts/enable-autoupdate.sh
#
# Why this is a separate script: autoUpdate lives per-machine in
# ~/.claude/plugins/known_marketplaces.json and cannot be set from a repo's
# .claude/settings.json — extraKnownMarketplaces entries only carry `source`
# and `installLocation`. So each person runs this once, or an MDM writes it.
#
# Run the plugin install first; this only flips a flag on an existing entry.

set -euo pipefail

python3 - <<'PY'
import json, pathlib, sys

path = pathlib.Path.home() / ".claude" / "plugins" / "known_marketplaces.json"

if not path.exists():
    sys.exit("no marketplaces installed yet — run the plugin install first")

try:
    data = json.loads(path.read_text())
except json.JSONDecodeError as e:
    sys.exit(f"refusing to touch {path}\n  it is not valid JSON: {e}")

entry = data.get("gushwork")
if entry is None:
    sys.exit(
        "the 'gushwork' marketplace is not installed on this machine.\n"
        "  run this first, then re-run:\n"
        "    claude plugin marketplace add gushwork-design/design-system\n"
        "    claude plugin install gushwork-design@gushwork"
    )

if entry.get("autoUpdate") is True:
    print("already on — nothing to do")
    sys.exit(0)

entry["autoUpdate"] = True
path.write_text(json.dumps(data, indent=2) + "\n")
print("auto-update is on for the gushwork marketplace")
PY

cat <<'EOF'

From now on Claude Code refreshes the marketplace and updates the plugin at
startup, and tells you what changed. New versions land during one session and
take effect the next time you start it.
EOF
