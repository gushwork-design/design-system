# The review-pass gate — three ways to record it, mechanically

Prep for the P0 card "Build the review-pass gate the 15 Sep ruling depends on."
Scratch file, not committed.

## What already exists (read, not recalled)

- The ruling itself lives in the `preview/workflow.html` diagram, not as a numbered
  `DECISIONS.md` ruling: "measured and created, then drawn on the sheet, then into the
  skill only once you have reviewed and passed it. No side door." The same block says
  what's missing: "a mechanism — both steps are manual today."
- [scripts/_sheet_coverage.py](../scripts/_sheet_coverage.py) already counts, at publish
  time, how many of `preview/review-sheet.html`'s own `<section id="...">` groups
  actually render a `.stage`/`.cell` (11 of 18 today) vs. how many are named in the
  "not drawn" inventory and stop there. It stamps a banner; it does not gate anything.
- `preview/review-sheet.html` is **hand-authored HTML**, not generated from `exports/`.
  Nothing currently builds a sheet section from a spec doc — a human (or Claude) writes
  the section the same way the doc was written.
- Each surface already carries a machine-readable per-component ledger:
  `exports/<surface>/component-registry.json`, e.g. `exports/web/component-registry.json`
  — keyed by component name, carrying `version` / `changed` / `breaking` / `doc`.
  `scripts/check-drift.sh` already reads this file and a build's stamp and reports the
  intersection. This is the one place in the repo that already does "record a fact about
  a component, then have a script read it back."
  - `exports/dashboard/component-registry.json`, `exports/slides/...`,
    `exports/lead-magnet/...`, `exports/shared/...` all follow the same shape.
- `scripts/hooks/pre-push` already runs `check-*.sh` scripts and **warns, never blocks**
  — CONTRIBUTING.md is explicit that a version bump isn't required to push, so a new gate
  check should follow that same warn-not-block convention rather than invent a new one.

So the actual gap is narrower than "build an intake system": measuring and drawing on the
sheet are already things that happen by hand today. What's missing is steps 3 and 4 —
**recording a pass somewhere a script can read, and having something check for it before
a component is treated as safely in `skills/`.**

## Three ways to record the pass

**Option A — a new `review.json` ledger, sibling to `component-registry.json`**
One new file per surface (`exports/dashboard/review.json`, etc.), keyed by component name:
`{"toast": {"status": "passed", "by": "utsav", "date": "2026-09-20"}}`. A new
`scripts/check-review-gate.sh` cross-checks: passed in `review.json` AND the component's
sheet section actually renders (reuse `_sheet_coverage.py`'s `.stage`/`.cell` test) AND it
exists in `skills/`. Mismatches warn on pre-push, same pattern as today.
- *For:* keeps "review status" and "version/drift status" as separate concerns, in
  separate files, so one doesn't get overloaded with the other's meaning.
- *Against:* a fourth JSON file per surface next to `component-registry.json` — one more
  place that can say something different from its neighbor. The backlog already has a P2
  card ("One source per fact, enforced") aimed at reducing exactly this kind of split.

**Option B — extend `component-registry.json` in place with a `reviewed` field**
Same file, one more key per component: `"reviewed": {"status": "passed", "date": ...}`.
`check-drift.sh` (or a small sibling script) reads the same file it already reads.
- *For:* one file, one script family, no new place to keep in sync. And it composes for
  free: if bumping `version`/`changed` also resets `reviewed.status` to `"pending"`, then
  re-measuring a component automatically reopens the gate — which is exactly what the
  ruling asks for ("measured... then into the skill only once reviewed and passed") without
  writing separate logic for "did this get re-measured since it was passed."
- *Against:* conflates two lifecycles in one object — a version bump is a fact about the
  spec, a review pass is a fact about a human's sign-off. Someone reading the registry
  cold has to learn both meanings live in the same file.

**Option C — a marker inside the export doc itself**
e.g. a line at the top of `exports/dashboard/toast.md`:
`<!-- gw-review: passed 2026-09-20 by utsav -->`, parsed by a new script.
- *For:* sits next to the spec a human actually reads; no JSON to open.
- *Against:* scatters the fact across N markdown files instead of one registry a script
  already parses — the opposite direction from the "one source per fact" P2 card, and
  `check-drift.sh` would need a second parser (markdown comment) alongside its existing
  JSON one.

## Recommendation

**Option B.** It reuses the exact mechanism `check-drift.sh` already reads instead of
adding a new file-per-surface, and tying `reviewed` to the same object as `version`
means a re-measurement can auto-reopen the gate as a side effect of the schema, not as
new logic to write and maintain. The pre-push check should warn, not block, matching
`scripts/hooks/pre-push`'s existing convention — CONTRIBUTING.md already says a bump
isn't required to push, and a gate that blocks would invite `--no-verify`.

Not decided here, on purpose: which option, and whether "marked passed by Utsav" means
hand-editing the registry or a small `scripts/pass.sh <surface> <component>` helper.
That's the actual decision this card is waiting on.
