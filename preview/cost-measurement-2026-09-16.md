# Design-system cost — measured, not estimated

Prep for the P0 card "Measure what the design system actually costs you each week."
Scratch file, not committed. Three options below, each from a different recorded
source. Pick one (or a combination) and say so on the BACKLOG card.

## Source 1 — git history (full coverage: all 190 commits, 2026-06-29 → today)

Commits whose subject signals rework — `fix|correct|wrong|revert|undo` or an explicit
re-measure — vs. the total:

- **30 / 190 commits (15.8%)** are corrections or re-measurements of something already
  shipped, not new work. Examples straight from `git log`:
  - "Re-measure six dashboard components off their sets — **all six were wrong**" (v1.15.0)
  - "Re-measure dashboard Button, progress-bar and user-card — **nine of nine wrong**" (v1.16.0)
  - "Correct three of my own statements that the deep link made stale"
  - "Fix toast: padding was inverted, error fill wrong, half the set missing"

This is a *rate*, not a time figure — it says how much of the shipped output was redoing
something, but not how many hours that took.

## Source 2 — session transcripts (partial coverage: 2026-06-29 → 2026-08-12 only)

The repo has lived at three paths; transcripts exist for the first two:
`~/Downloads/Gushwork Design System (2)` and `~/Gushwork Design`. **No local transcript
directory matches the current path** (`~/Downloads/gushwork-design`), so every session
since roughly 2026-08-14 (v1.38 onward, ~5 weeks) is invisible to this method — any
number from transcripts is an undercount of the current run rate, not a full accounting.

19 sessions found in that window. Two ways to turn timestamps into hours:

| Method | Result | What it means |
|---|---|---|
| **A — raw span** (last ts − first ts, summed per session) | **476 hours** | Meaningless as "time spent" — three sessions were resumed after 1–2 day gaps (sleep, days away), which counts as active time under this method. |
| **B — active time** (sum of inter-message gaps, each gap capped at 15 min to drop idle/away stretches) | **21.1 hours** over ~6.4 weeks ≈ **3.3 hr/week** | The defensible reading: time the chat was actually being worked, not left open. |

Per-session detail (Option B) is in the run log if useful, biggest single sessions were
~5.3 hr and ~8.8 hr (both dashboard-component re-measurement passes — consistent with
the git-log finding above).

## Recommendation

Report **Option B's 3.3 hr/week** as the headline number, with the caveat printed next
to it that it excludes the last ~5 weeks (no transcript directory for the current path)
— so the true current cost is higher, not lower. Cross-reference Source 1's 15.8%
rework rate as corroborating evidence this isn't a one-off measurement artifact.

Not done here, on purpose: reordering the P2 tooling cards by this number. That's the
"actually decide priority" half of the card and belongs to Utsav, not to prep.
