#!/usr/bin/env bash
#
# Adds the Gushwork design system to the current repo, so anyone who opens it
# gets the plugin installed automatically — no commands for them to run.
#
#   bash scripts/enable-in-repo.sh          # in the repo you want it in
#
# Safe to re-run. Merges into an existing .claude/settings.json rather than
# overwriting it, and refuses to touch the file if it is not valid JSON.

set -euo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
TARGET="$ROOT/.claude/settings.json"
mkdir -p "$(dirname "$TARGET")"

python3 - "$TARGET" <<'PY'
import json, os, sys

path = sys.argv[1]
data = {}

if os.path.exists(path):
    text = open(path).read().strip()
    if text:
        try:
            data = json.loads(text)
        except json.JSONDecodeError as e:
            sys.exit(f"refusing to touch {path}\n  it is not valid JSON: {e}")
    if not isinstance(data, dict):
        sys.exit(f"refusing to touch {path}\n  top level is not a JSON object")

before = json.dumps(data, sort_keys=True)

data.setdefault("extraKnownMarketplaces", {})["gushwork"] = {
    "source": {"source": "github", "repo": "gushwork-design/design-system"}
}
data.setdefault("enabledPlugins", {})["gushwork-design@gushwork"] = True

if json.dumps(data, sort_keys=True) == before:
    print(f"already enabled — {path} unchanged")
    sys.exit(0)

with open(path, "w") as f:
    json.dump(data, f, indent=2)
    f.write("\n")
print(f"updated {path}")
PY

cat <<EOF

Next:
  git add .claude/settings.json && git commit -m "Add Gushwork design system plugin"

Anyone who opens this repo after that gets both skills automatically. They will
need to restart Claude Code once for the skills to load.
EOF
