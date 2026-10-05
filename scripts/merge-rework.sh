#!/usr/bin/env bash
#
# Merges one rework PR, and through publish-site.yml publishes it, with nobody pressing a button.
# The rework routines call it as their last step (R54).
#
#   bash scripts/merge-rework.sh <pr-number>             check, then merge
#   bash scripts/merge-rework.sh <pr-number> --dry-run   check only, say what it would do
#
# WHY THIS MAY MERGE AT ALL. Utsav's Rework decision on the Design System page is the decision.
# What the routine makes from his note is not approved by merging it: the item reads `redone`
# and goes back to Waiting (R45), and it is passed or sent back again from there. Skills never
# see the routine's work, because a rework PR may only touch the hub (previews, admin pages,
# hub css/js, the generated library), never exports/, skills/ or foundation/, which is what the
# skills read. This script is where that is enforced, not the routine's prompt: a prompt can be
# talked out of a rule, a path check cannot.
#
# WHAT IT REFUSES, each with a reason, and the PR stays open for Utsav:
#   - the switch is off: .github/automerge-off exists on origin/main
#   - not a rework: title is not "Rework: <scope>/<key>", or the branch is not rework/* or nightly/*
#   - not decided: the registry on origin/main does not say `rework` for that item
#   - no fix record: the PR does not add web/previews/<scope>/<key>.reworked answering that send-back
#     (bash scripts/mark-reworked.sh writes it), so the item could not come back to Waiting
#   - a file outside the hub paths, or one of the files that govern merging, publishing and access
#   - generated preview/library files (the publish rebuilds them; committed in parallel they always conflict)
#   - a conflict with main
#
# Merging uses the admin bypass on main's ruleset (since 4 Oct 2026), so it works only for a
# token whose user is a repo admin. A merge by that user's token fires publish-site.yml; a merge
# by an Actions GITHUB_TOKEN would not, which is why this is not a workflow.
set -euo pipefail
cd "$(dirname "$0")/.."

PR="${1:-}"; DRY=0
[ "${2:-}" = "--dry-run" ] && DRY=1
[[ "$PR" =~ ^[0-9]+$ ]] || { echo "usage: bash scripts/merge-rework.sh <pr-number> [--dry-run]" >&2; exit 2; }

refuse() { echo "✘ not merged: $*" >&2; echo "  PR #$PR stays open for Utsav." >&2; exit 1; }

git fetch -q origin main

if git cat-file -e origin/main:.github/automerge-off 2>/dev/null; then
  refuse "auto-merge is switched off (.github/automerge-off is on main)"
fi

# REST only. Claude Code cloud sessions refuse GitHub GraphQL (HTTP 403), and `gh pr view` / `gh pr merge` use it.
REPO="${GW_REPO:-gushwork-design/design-system}"
PULL="$(gh api "repos/$REPO/pulls/$PR")"
FILES="$(gh api --paginate "repos/$REPO/pulls/$PR/files?per_page=100" --jq '.[].filename')"
INFO="$(PULL="$PULL" FILES="$FILES" python3 -c '
import json, os
p = json.loads(os.environ["PULL"])
state = "MERGED" if p.get("merged") else p["state"].upper()
m = p.get("mergeable")
print(json.dumps({"state": state, "baseRefName": p["base"]["ref"], "headRefName": p["head"]["ref"],
                  "title": p["title"], "headRefOid": p["head"]["sha"],
                  "mergeable": "CONFLICTING" if m is False else ("MERGEABLE" if m else "UNKNOWN"),
                  "files": [{"path": f} for f in os.environ["FILES"].splitlines() if f]}))')"

PR_JSON="$INFO" python3 - <<'PY' || exit 1
import fnmatch, importlib.util, json, os, re, subprocess, sys
_spec = importlib.util.spec_from_file_location("_cl", os.path.join("scripts", "_component_library.py"))
CL = importlib.util.module_from_spec(_spec); _spec.loader.exec_module(CL)

pr = json.loads(os.environ["PR_JSON"])
def refuse(why):
    print(f"✘ not merged: {why}", file=sys.stderr)
    sys.exit(1)

if pr["state"] != "OPEN":
    refuse(f"the PR is {pr['state'].lower()}")
if pr["baseRefName"] != "main":
    refuse(f"it targets {pr['baseRefName']}, not main")
if not re.match(r"^(rework|nightly)/", pr["headRefName"]):
    refuse(f"branch {pr['headRefName']} is not rework/* or nightly/*")
m = re.match(r"^Rework: ([a-z0-9-]+)/([a-z0-9-]+)$", pr["title"].strip())
if not m:
    refuse(f"title {pr['title']!r} is not 'Rework: <scope>/<key>'")
scope, key = m.groups()
if pr["mergeable"] == "CONFLICTING":
    refuse("it conflicts with main")

# The decision has to be on main, not just named in a title.
surface, block = ("shared", "foundations") if scope == "foundation" else (scope, "review")
try:
    raw = subprocess.run(["git", "show", f"origin/main:exports/{surface}/component-registry.json"],
                         capture_output=True, text=True, check=True).stdout
    rec = (json.loads(raw).get(block) or {}).get(key) or {}
except Exception:
    refuse(f"no registry for '{scope}' on main")
if rec.get("reviewed") != "rework":
    refuse(f"{scope}/{key} is {rec.get('reviewed', 'pending')!r} on main, not 'rework'")

# The hub, and only the hub. Skills read exports/, skills/ and foundation/; none of it is here.
ALLOW = ["web/previews/*", "web/admin/*", "web/*.css", "web/*.js", "scripts/*"]
# Inside those, the files that decide who sees the site, what ships, and this check itself.
DENY = ["web/middleware.js", "scripts/merge-rework.sh", "scripts/publish-sheets.sh",
        "scripts/release*.sh", "scripts/stamp-*.sh", "scripts/_review.py",
        "scripts/_component_library.py", "scripts/_library_site.py", "scripts/mark-reworked.sh", "scripts/hooks/*"]
def top_level_web(p):  # web/*.css and web/*.js mean the hub's own files, not web/api/x.js
    return not (p.startswith("web/") and p.count("/") > 1 and not p.startswith(("web/previews/", "web/admin/")))
# preview/library is generated, and the publish regenerates it. Committed from parallel reworks it is the
# same 170 files in every PR, so the second one to merge always conflicts. Name it on its own.
gen = [x["path"] for x in pr["files"] if x["path"].startswith("preview/library/")]
if gen:
    refuse(f"it commits {len(gen)} generated preview/library file(s); drop them "
           "(git checkout origin/main -- preview/library), the publish rebuilds the library")
bad = []
for f in (x["path"] for x in pr["files"]):
    ok = any(fnmatch.fnmatch(f, a) for a in ALLOW) and top_level_web(f)
    if not ok or any(fnmatch.fnmatch(f, d) for d in DENY):
        bad.append(f)
if not pr["files"]:
    refuse("it changes no files")
if bad:
    refuse("it touches files a rework may not merge on its own: " + ", ".join(bad))
# The fix record, read from the PR's own head, has to answer the send-back that is on main now.
record_path = os.path.relpath(CL.rework_record_path(scope, key), CL.ROOT)
if record_path not in [x["path"] for x in pr["files"]]:
    refuse(f"it has no fix record ({record_path}); run bash scripts/mark-reworked.sh {scope} {key} and commit it")
try:
    subprocess.run(["git", "fetch", "-q", "origin", pr["headRefOid"]], capture_output=True)  # may already be local
    record = json.loads(subprocess.run(["git", "show", f"{pr['headRefOid']}:{record_path}"],
                                       capture_output=True, text=True, check=True).stdout)
except Exception:
    refuse(f"could not read {record_path} from the PR")
if not CL.rework_fixed(scope, key, rec, record):
    refuse(f"{record_path} does not answer the send-back on main (decided {rec.get('reviewedOn', '?')}); re-run mark-reworked.sh")
print(f"✔ {scope}/{key}: decided rework on main, fix record matches, {len(pr['files'])} hub file(s), no conflict")
PY

if [ "$DRY" = 1 ]; then
  echo "dry run: would merge #$PR now (merge commit, admin bypass), and publish-site.yml would publish it"
  exit 0
fi

HEAD_REF="$(PULL="$PULL" python3 -c 'import json,os;print(json.loads(os.environ["PULL"])["head"]["ref"])')"
# A merge through REST by an admin passes main's ruleset by its bypass; same as `gh pr merge --admin`.
gh api -X PUT "repos/$REPO/pulls/$PR/merge" -f merge_method=merge >/dev/null
gh api -X DELETE "repos/$REPO/git/refs/heads/$HEAD_REF" >/dev/null 2>&1 || true
echo "✔ merged #$PR. publish-site.yml publishes it; the item returns to Waiting as redone."
