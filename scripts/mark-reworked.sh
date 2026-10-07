#!/usr/bin/env bash
#
# Writes the fix record for one rework: web/previews/<scope>/<key>.reworked (R54 addendum).
#
#   bash scripts/mark-reworked.sh <scope> <key>
#
# The rework routine runs it once its fix is made, and commits the file in the same PR. It is what puts the
# item back in Waiting as "redone": a fix that changed only shared hub CSS moves neither review fingerprint,
# so without it the item would read "in rework" for good. scripts/merge-rework.sh refuses a rework PR that
# does not carry a record matching the send-back on main.
#
# It reads the decision from the registry in this checkout, so run it on a branch cut from origin/main.
set -euo pipefail
cd "$(dirname "$0")/.."
[ $# -eq 2 ] || { echo "usage: bash scripts/mark-reworked.sh <scope> <key>" >&2; exit 2; }

python3 - "$1" "$2" <<'PY'
import importlib.util, json, os, sys
from datetime import date
spec = importlib.util.spec_from_file_location("_cl", os.path.join("scripts", "_component_library.py"))
CL = importlib.util.module_from_spec(spec); spec.loader.exec_module(CL)
scope, key = sys.argv[1], sys.argv[2]
surface, block = ("shared", "foundations") if scope == "foundation" else (scope, "review")
reg = os.path.join("exports", surface, "component-registry.json")
if not os.path.isfile(reg):
    sys.exit(f"no registry for '{scope}'")
rec = (json.load(open(reg, encoding="utf-8")).get(block) or {}).get(key) or {}
if rec.get("reviewed") != "rework":
    sys.exit(f"{scope}/{key} is {rec.get('reviewed', 'pending')!r}, not 'rework': nothing to mark")
path = CL.rework_record_path(scope, key)
os.makedirs(os.path.dirname(path), exist_ok=True)
with open(path, "w", encoding="utf-8") as fh:
    json.dump(CL.rework_record_for(rec, date.today().isoformat()), fh, indent=2)
    fh.write("\n")
print(f"✔ wrote {os.path.relpath(path)}; commit it with the fix")
PY
