#!/usr/bin/env bash
#
# Tells whoever owns a build which of THEIR components have changed since they made it.
#
#   bash scripts/check-drift.sh path/to/build.html
#   bash scripts/check-drift.sh path/to/project/           # scans for stamped files
#   bash scripts/check-drift.sh --unstamped path/to/dir/   # lists builds carrying NO stamp
#
# There is no server and no registry of who built what, so nothing can be *pushed* to a person.
# What this does instead: every build the skills produce carries a stamp listing the components it
# used, the surface it came from, and the plugin version it used them at. This reads that stamp,
# diffs it against that surface's registry, and reports only the intersection — the components
# that build actually uses AND that have changed since.
#
# Every surface has its own registry, at exports/<surface>/component-registry.json, plus a shared
# one merged into all of them for the components that genuinely are shared: badge, the logo, the
# icon set. A stamp with no `surface` is treated as a dashboard, which every stamped build in
# existence was when the field was introduced.
#
# The skills run this automatically whenever a stamped file is in play, so the notice arrives the
# next time anyone opens the build with Claude. That is the closest thing to a notification that a
# plugin distributed as a git clone can honestly offer.
#
# --unstamped inverts the question. Everything above reports on builds that IDENTIFY themselves;
# it can say nothing about work made off-path, which is exactly the work most likely to have
# drifted. A file with no stamp was not built through the skills, or was built before stamping —
# either way nothing here can check it, and that fact is itself the finding. So this flag lists
# the candidates it walked past, turning the absence of a stamp into the alert.
#
# It cannot see beyond the filesystem you point it at. A build living only in someone's Drive or
# in another repo is not absent from this list, it is simply not in it — point the flag at those
# locations too, or the silence reads as a clean bill of health it never gave.

set -uo pipefail

UNSTAMPED=0
ARGS=()
for a in "$@"; do
  case "$a" in
    --unstamped) UNSTAMPED=1 ;;
    *)           ARGS+=("$a") ;;
  esac
done
TARGET="${ARGS[0]:-.}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# One registry per surface, plus a shared one. A build says which surface it came from in its
# stamp; anything without a `surface` predates the split and is a dashboard, which is what every
# stamped build in existence at the time actually was.
[ -f "$ROOT/exports/dashboard/component-registry.json" ] \
  || { echo "✘ no component registry under $ROOT/exports" >&2; exit 1; }
command -v python3 >/dev/null 2>&1 || { echo "✘ python3 is required" >&2; exit 1; }

python3 - "$TARGET" "$ROOT" "$UNSTAMPED" <<'PY'
import json, os, re, sys

target, root = sys.argv[1], sys.argv[2]
want_unstamped = sys.argv[3] == "1"

# Shared components (badge, the logo, icons) live once and are merged into every surface's view,
# so a change to one is reported once rather than per surface — and so a dashboard stamped before
# badge moved out of the dashboard registry still resolves it.
def load(surface):
    p = os.path.join(root, "exports", surface, "component-registry.json")
    try:
        return json.load(open(p))["components"]
    except Exception:
        return {}

SHARED = load("shared")

def has_registry(surface):
    return os.path.isfile(os.path.join(root, "exports", surface, "component-registry.json"))

_registries = {}
def registry_for(surface):
    if surface not in _registries:
        merged = dict(SHARED)
        merged.update(load(surface))          # a surface may override a shared entry
        _registries[surface] = merged
    return _registries[surface]

STAMP = re.compile(r"gushwork-build:(\{.*?\})", re.S)

def stamped_files(path):
    if os.path.isfile(path):
        return [path]
    out = []
    for dirpath, dirnames, filenames in os.walk(path):
        dirnames[:] = [d for d in dirnames if d not in
                       (".git", "node_modules", "dist", "build", "__pycache__")]
        for f in filenames:
            if f.endswith((".html", ".htm", ".jsx", ".tsx", ".vue", ".svelte")):
                out.append(os.path.join(dirpath, f))
    return out

def ver(v):
    return tuple(int(x) for x in v.split("."))

found = 0
drifted_any = False
unstamped = []
for f in stamped_files(target):
    try:
        text = open(f, encoding="utf-8", errors="ignore").read()
    except OSError:
        continue
    m = STAMP.search(text)
    if not m:
        unstamped.append(f)
        continue
    found += 1
    try:
        stamp = json.loads(m.group(1))
    except json.JSONDecodeError:
        print(f"⚠ {f}: stamp present but unreadable"); continue

    built_at = stamp.get("pluginVersion", "0.0.0")
    used = stamp.get("components", [])
    surface = stamp.get("surface", "dashboard")
    if not has_registry(surface):
        print(f"⚠ {os.path.relpath(f)}: stamped surface '{surface}' has no registry at "
              f"exports/{surface}/component-registry.json — cannot check this build")
        continue
    comps = registry_for(surface)
    must, may, gone = [], [], []
    for name in used:
        c = comps.get(name)
        if c is None:
            gone.append(name); continue
        if ver(c["version"]) > ver(built_at):
            (must if c.get("breaking") else may).append((name, c))

    rel = os.path.relpath(f)
    if not (must or may or gone):
        print(f"✔ {rel} — built at v{built_at}, all {len(used)} components current")
        continue

    drifted_any = True
    print(f"\n▸ {rel}")
    print(f"  built with plugin v{built_at} by {stamp.get('createdBy','(unknown)')}"
          f" on {stamp.get('createdAt','(undated)')}")
    if must:
        print(f"\n  MUST UPDATE — {len(must)} component(s) render incorrectly until you do:")
        for name, c in must:
            print(f"    • {name}  v{built_at} → v{c['version']}  ({c['doc']})")
            if c.get("note"):
                print(f"      {c['note']}")
    if may:
        print(f"\n  Worth updating — {len(may)} component(s) improved:")
        for name, c in may:
            print(f"    • {name}  → v{c['version']}  ({c['doc']})"
                  + (f"  — {c['note']}" if c.get("note") else ""))
    if gone:
        print(f"\n  No longer in the registry — check by hand: {', '.join(gone)}")

if want_unstamped:
    if unstamped:
        print(f"\n▸ {len(unstamped)} file(s) carrying NO stamp — nothing here can check these:")
        for f in sorted(unstamped):
            print(f"    • {os.path.relpath(f)}")
        print("\n  A file with no stamp was either built off-path or predates stamping. Neither")
        print("  can be diffed against a registry. Measure it, draw it on the review sheet, and")
        print("  let it back in through the gate — or confirm it is not a Gushwork build at all.")
    else:
        print(f"\n✔ every candidate file under {target} carries a stamp.")

if not found:
    print("No stamped Gushwork builds found under " + target)
    print("A build carries its stamp as a `gushwork-build:{...}` comment. Older builds predate")
    print("stamping and cannot be checked automatically — compare them against the registry")
    print("for their surface under exports/<surface>/component-registry.json by hand.")
    sys.exit(0)

print()
if drifted_any:
    print("To update: re-open the build with Claude and ask it to bring the drifted components")
    print("up to date. It reads the same registry and the docs each entry points at.")
    sys.exit(2)
print(f"✔ {found} stamped build(s), all current.")
PY
