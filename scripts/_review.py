#!/usr/bin/env python3
"""Record and check review passes — step 4 of the chain in preview/workflow.html.

    Figma -> measure -> exports/*.md -> drawn on the page -> YOU PASS -> skills/

Ruled 15 September 2026. The ruling's own words were "a mechanism — both steps are
manual today": measuring and drawing already happened by hand, and what was missing was
somewhere to RECORD a pass and something to GATE on it. This is that record.

WHERE IT LIVES. On the registries check-drift.sh already reads, not a fourth file per
surface — per the backlog's Option B. Two blocks, both siblings of `components`, so
check-drift.sh (which reads only `["components"]`) is untouched:

    exports/shared/component-registry.json   "foundations": { <group key>: {...} }
    exports/<surface>/component-registry.json  "review": { <component>: {...} }

WHY A PASS EXPIRES BY ITSELF. Each record stores a fingerprint of what was reviewed. When
the source moves, the stored fingerprint stops matching and the row goes back to pending
with no one having to remember. That is the re-open-the-gate behaviour the ruling wants,
and it is the whole reason the pass is tied to the same object as the version.

A PASS IS NOT A BLOCK. `--check` reports and returns 1 only under --strict; the pre-push
hook calls it as a WARN, matching check-fonts.sh and check-placeholders.sh.
"""

import importlib.util
import json
import os
import subprocess
import sys
from datetime import date

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

_spec = importlib.util.spec_from_file_location(
    "_cl", os.path.join(ROOT, "scripts", "_component_library.py"))
CL = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(CL)

FOUNDATION = "foundation"


def registry_path(scope):
    surface = "shared" if scope == FOUNDATION else scope
    return os.path.join(ROOT, "exports", surface, "component-registry.json")


def block_name(scope):
    return "foundations" if scope == FOUNDATION else "review"


def load(scope):
    p = registry_path(scope)
    if not os.path.isfile(p):
        sys.exit(f"no registry for '{scope}' at {os.path.relpath(p, ROOT)}")
    with open(p, encoding="utf-8") as fh:
        return json.load(fh)


def save(scope, data):
    p = registry_path(scope)
    with open(p, "w", encoding="utf-8") as fh:
        json.dump(data, fh, indent=2, ensure_ascii=False)
        fh.write("\n")
    return os.path.relpath(p, ROOT)


def who():
    for cmd in (["git", "config", "user.name"], ["git", "config", "user.email"]):
        try:
            v = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True,
                               timeout=5).stdout.strip()
            if v:
                return v
        except Exception:
            pass
    return os.environ.get("USER", "unknown")


def keys_for(scope):
    """Everything reviewable in this scope, and its current fingerprint."""
    if scope == FOUNDATION:
        return CL.group_fingerprints()
    reg = CL.load_registries()
    comps = (reg.get(scope) or {}).get("components") or {}
    return {k: CL.component_fingerprint(scope, k, reg) for k in sorted(comps)}


def scopes():
    out = [FOUNDATION]
    for s in CL.SURFACES:
        if os.path.isfile(registry_path(s)):
            out.append(s)
    return out


def status(scope):
    """(key, state, stale, record) for every reviewable thing in a scope."""
    data = load(scope)
    block = data.get(block_name(scope)) or {}
    rows = []
    for key, fp in keys_for(scope).items():
        rec = block.get(key) or {}
        state = rec.get("reviewed", "pending")
        stale = state == "passed" and rec.get("fingerprint") != fp
        rows.append((key, state, stale, rec))
    return rows


def record(scope, key, state, note=""):
    fps = keys_for(scope)
    if key not in fps:
        known = ", ".join(sorted(fps)) or "(nothing)"
        sys.exit(f"'{key}' is not a reviewable {scope} key.\nKnown: {known}")
    data = load(scope)
    block = data.setdefault(block_name(scope), {})
    rec = block.setdefault(key, {})
    rec["reviewed"] = state
    rec["reviewedBy"] = who()
    rec["reviewedOn"] = date.today().isoformat()
    rec["fingerprint"] = fps[key]
    if note:
        rec["note"] = note
    elif "note" in rec and state == "passed":
        rec.pop("note")
    where = save(scope, data)
    print(f"✔ {scope}/{key} → {state} ({rec['reviewedBy']}, {rec['reviewedOn']})")
    print(f"  written to {where}")
    print("  regenerate the page:  bash scripts/component-library.sh")


def report(strict=False):
    pend = stale = passed = 0
    for scope in scopes():
        rows = status(scope)
        bad = [r for r in rows if r[1] != "passed" or r[2]]
        passed += sum(1 for r in rows if r[1] == "passed" and not r[2])
        if not bad:
            print(f"✔ {scope} — all {len(rows)} reviewed and current")
            continue
        print(f"\n{scope} — {len(bad)} of {len(rows)} need you")
        for key, state, is_stale, _ in bad:
            if is_stale:
                stale += 1
                print(f"  ~ {key:22} passed, but the source has moved since — re-pass it")
            else:
                pend += 1
                print(f"  · {key:22} {state}")
    print(f"\n{passed} current · {pend} never reviewed · {stale} expired by a source change")
    if pend or stale:
        print("Pass one with:  bash scripts/review-pass.sh <scope> <key>")
        return 1 if strict else 0
    return 0


def main(argv):
    if not argv or argv[0] in ("-h", "--help"):
        print(__doc__)
        return 0
    if argv[0] == "--check":
        return report(strict="--strict" in argv)
    if argv[0] == "--list":
        for scope in scopes():
            print(f"{scope}: " + " ".join(sorted(keys_for(scope))))
        return 0
    if len(argv) < 2:
        sys.exit("usage: review-pass.sh <scope> <key> [--reject] [--note TEXT]")
    scope, key = argv[0], argv[1]
    if scope not in scopes():
        sys.exit(f"unknown scope '{scope}'. One of: {', '.join(scopes())}")
    state = "rejected" if "--reject" in argv else "passed"
    note = ""
    if "--note" in argv:
        i = argv.index("--note")
        note = argv[i + 1] if i + 1 < len(argv) else ""
    record(scope, key, state, note)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
