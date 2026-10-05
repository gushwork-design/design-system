# Project memory — Gushwork design hub

Short, stable facts so a fresh session can pick up cold. Update as we go. No secrets here (repo is public).

## How we work (lead + threads)
- Project chat = main feed. Lead acknowledges each ask in one line, starts one thread per task (short plain title).
- Threads do the work and report back in-thread. Main chat only for: done, blocked, needs a decision (one-word answer, recommended option first).
- Reversible work (branches, draft PRs, scratch) = no asking. Irreversible (production/publish/deploy, deleting, messages outside the project) = wait for Utsav.
- Every PR opens as **draft**; thread watches it and fixes CI + review comments until green. **Utsav merges.**
- Brief explanations unless asked. Recurring things become scheduled routines, and Utsav is told.

## Repo and stack
- Repo: `gushwork-design/design-system` (public). Dev branch for this project: `claude/jolly-pasteur-jwbati`. Default: `main`.
- It is a Claude Code plugin (`gushwork-design`, v2.0.0, marketplace `gushwork`) and the source of the design hub site, **design.gushwork.ai**.
- Plugin: 6 skills in `skills/` (web, dashboard, tools, lead-magnet, slides, brand) over `foundation/` (tokens, voice).
- Measured specs in `exports/` (from Figma; Figma edits change nothing until measured into the repo). Component registries: `exports/*/component-registry.json`.
- Site: `web/` (static pages + `web/api/*.js` serverless, Vercel). Previews: `web/previews/**/*.frag`. Review library built by `bash scripts/library-site.sh` into `preview/library/`.
- Checks: `scripts/check-*.sh`, `node scripts/*.test.mjs`, `bash scripts/check-update.test.sh`.
- Publish: GitHub Action `publish-site.yml` deploys to Vercel on every merge to `main` (needs `VERCEL_*` secrets). Releases: `scripts/release.sh` (no push; Utsav decides when a release reaches teammates, R51).
- Docs to read before design work: `CONTRIBUTING.md`, `DECISIONS.md` (rulings R1–R51, latest at the bottom), `REVIEW-LOOP.md`, `README.md`.
- Note: no `CLAUDE.md` in the repo. The existing routines refer to one that doesn't exist.

## Existing routines (already running, created before this project)
- **Nightly: reworks and missing drawings** — daily 15:30 UTC. Opens `nightly/*` PRs (max 3 reworks + 3 drawings), DMs Utsav a report via Slack app "bruce".
- **Rework** — API-triggered when Utsav sends an item back on the Design System page. Opens one `rework/*` PR.
- **System health: repo checks** — Mon and Thu 04:00 UTC. Read-only; posts a snapshot to the hub's System health page.
- Those routines: open PRs only; never merge, publish or touch Vercel; may edit only `web/previews/**`, `web/admin/**`, `web/*.css/js`, `scripts/**`. Not allowed: `foundation/`, `exports/`, `skills/`, `DECISIONS.md`, `templates/`, any `component-registry.json`.

## Utsav's preferences
- Owner and design decision-maker (utsav.singh@gushwork.ai). He decides design and taste calls and does the merging. Bots make no design decisions.
- Commit trailers and PR footers as the session instructs. Never fabricate client logos, photos, quotes or reviews. Tokens only, no invented hex values.

## State as of 2026-10-05
- `main` head: `8e1db63` (PR #187). Skill drift: 0 wrong, 7 unverifiable (need Figma). Missing drawing: `slides/title-bar`.
- Open PRs by Utsav: #91 "Foundations: hide secondary-500 from the library" (Oct 1), #19 "Add AI services ad landing page (Meta) — staged" (Sep 23). Both non-draft.

## Decisions made in this project
- 2026-10-05: memory lives at `.claude/PROJECT-MEMORY.md`, committed on the dev branch (no PR until asked).
- 2026-10-05: `mods/design-hub` v0.2 adds `/hub` (memory + threads pane) and `/thread <title>: <task>` (parallel subagent threads, one JSON file each under `.claude/hub/threads/`, see `.claude/hub/README.md`). Load locally with `claude --plugin-dir mods/design-hub`; it draws only in terminal and Desktop, not cloud sessions. Not part of the plugin. Not yet run end to end.

## Open draft PRs from this project (Utsav merges)
- #191 Add CLAUDE.md (+ the memory file). #194 Draw: slides/title-bar. #196 Fix library build on Python 3.11.
- Closed 2026-10-05 at Utsav's yes: #19 (superseded; branch ad-page/ai-services-lander kept).
- Closed 2026-10-05 at Utsav's yes: #91 (obsolete: ruling R34 deleted secondary-500, nothing left to hide).

## Where things are
- Memory: this file (on `main` once #191 merges; until then on the dev branch).
- Threads of 2026-10-05 (triage, title-bar, CLAUDE.md, py311, #91 redo) ran as subagents from the lead session: their results are in PRs #191, #194, #196 and the lead chat. No thread registry files exist for them (`.claude/hub/threads/` is only written by the `/thread` mod, which hasn't been run).
- Routines: Routines list in the Claude Code sidebar. They were created through the API, so an agent cannot edit their prompts; Utsav pastes `.claude/hub/routine-memory-snippet.md` into each. Pending.

## Merged through this project
- (none yet)
