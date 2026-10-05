#!/usr/bin/env bash
#
# Prints version.json — what a machine reads to find out the design system moved.
#
#   bash scripts/version-json.sh              # print it
#   bash scripts/version-json.sh --check      # verify the versions it is built from agree
#
# publish-sheets.sh writes this to the root of the deploy, so it lands at
# https://gushwork-design.vercel.app/version.json — public, no git, no auth, and it keeps
# working after the repo goes private. Same reasoning that already puts component-registry.json
# on that deploy: the thing that TELLS you that you are behind must not require the access that
# being behind might have cost you.
#
# GENERATED, NEVER COMMITTED. It is a pure projection of marketplace.json and
# component-registry.json, so a committed copy could only ever be a second thing to go stale.
#
# It carries a compact components map — name -> {version, breaking} — rather than making the
# hook fetch the full registries too. The reader needs one round trip and only two fields of it;
# the full registries stay where the builds already read them.
#
# The map is every surface's registry merged flat. That is safe for readers already deployed:
# check-update.sh iterates whatever names it is handed and compares versions, so names from a new
# surface simply appear in the notice. Renaming or reshaping existing keys would NOT be safe, and
# is why nothing here is namespaced by surface.

set -euo pipefail
cd "$(dirname "$0")/.."

MODE="${1:-}"

python3 - "$MODE" <<'PY'
import json, sys, subprocess

mode = sys.argv[1]
mk = json.load(open(".claude-plugin/marketplace.json"))
pl = json.load(open(".claude-plugin/plugin.json"))
# The newest release flagged to reach people (R50). Absent or unparseable → null, and the hook
# stays silent for everyone: a notice nobody asked for is exactly what this field exists to stop.
try:
    nf = json.load(open(".claude-plugin/notify.json"))
    notify = {"version": nf.get("version"), "summary": nf.get("summary") or "",
              "links": [l for l in (nf.get("links") or []) if isinstance(l, str) and l.startswith("http")][:4]}
except Exception:
    notify = None
# Every surface's registry, merged flat. Names are unique across surfaces — the only one that
# ever appeared twice was `badge`, and that was one shared component listed twice rather than a
# collision, which is why it now lives in exports/shared/ alone. If two surfaces ever do want the
# same NAME for different components, this merge is where it must be resolved, and the duplicate
# check below is what will say so.
SURFACES = ("shared", "dashboard", "web", "lead-magnet")
components, seen_in = {}, {}
for surface in SURFACES:
    try:
        part = json.load(open(f"exports/{surface}/component-registry.json"))
    except FileNotFoundError:
        continue
    for name, c in (part.get("components") or {}).items():
        if name in components:
            print(f"component '{name}' is in both the {seen_in[name]} and {surface} registries — "
                  f"a name must mean one thing across surfaces or a reader cannot tell them apart. "
                  f"Move it to exports/shared/ if it is genuinely shared.", file=sys.stderr)
            sys.exit(1)
        components[name], seen_in[name] = c, surface

reg = {"components": components,
       "registryVersion": json.load(
           open("exports/dashboard/component-registry.json")).get("registryVersion")}

mk_meta = mk.get("metadata", {}).get("version")
mk_entry = (mk.get("plugins") or [{}])[0].get("version")
pl_v = pl.get("version")
reg_v = reg.get("registryVersion")

# The guard that would have caught v1.40.0. That release moved plugin.json and both SKILL.md
# announce lines but not marketplace.json — stamp-release.sh writes all of them, so it had not
# been run — and the marketplace served 1.39.0 while the plugin called itself 1.40.0 for ten
# days. A publish is the last place that can still notice.
disagree = len({mk_meta, mk_entry, pl_v}) != 1
if disagree:
    print(
        "version fields disagree — run  bash scripts/stamp-release.sh <version>  first\n"
        f"  .claude-plugin/plugin.json       {pl_v}\n"
        f"  .claude-plugin/marketplace.json  metadata={mk_meta} entry={mk_entry}",
        file=sys.stderr,
    )
    sys.exit(1)

def semver(v):
    try:
        return tuple(int(x) for x in str(v).split("."))
    except Exception:
        return ()

# A LAGGING registry is normal and silent — a release that touches no component doc has no reason
# to bump it, and warning about it every time only teaches people to ignore warnings. What is
# never legitimate is the registry, or any component in it, claiming to be NEWER than the plugin
# that ships it: a reader would compute "you are behind" against a version nobody can install.
ahead = [n for n, c in (reg.get("components") or {}).items()
         if semver(c.get("version")) > semver(pl_v)]
if semver(reg_v) > semver(pl_v) or ahead:
    print(
        f"registry is ahead of the plugin — nothing could satisfy it\n"
        f"  plugin version   {pl_v}\n"
        f"  registryVersion  {reg_v}"
        + (f"\n  components ahead {', '.join(sorted(ahead))}" if ahead else ""),
        file=sys.stderr,
    )
    sys.exit(1)

if mode == "--check":
    print(f"✔ version fields agree at {pl_v}")
    sys.exit(0)

# The date the version field last MOVED, which is the last commit that touched marketplace.json.
# If that file is dirty the stamp has not been committed yet, and the last commit's date would be
# the PREVIOUS release's — off by however long ago that was. Publishing an uncommitted stamp is
# not the normal path, so say today rather than something confidently wrong.
def sh(*args):
    return subprocess.run(args, capture_output=True, text=True).stdout.strip()

dirty = bool(sh("git", "status", "--porcelain", "--", ".claude-plugin/marketplace.json"))
released = (sh("date", "+%Y-%m-%d") if dirty
            else sh("git", "log", "-1", "--format=%cs", "--", ".claude-plugin/marketplace.json")) or None

print(json.dumps({
    "$comment": "Generated by scripts/version-json.sh — do not edit, do not commit.",
    "version": pl_v,
    "released": released,
    "notify": notify,
    "notice": "https://gushwork-design.vercel.app/preview/changelog-sheet.html",
    "install": "https://gushwork-design.vercel.app/preview/install.html",
    "components": {
        name: {"version": c.get("version"), "breaking": bool(c.get("breaking"))}
        for name, c in sorted(components.items())
    },
}, indent=2))
PY
