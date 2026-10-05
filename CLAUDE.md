# CLAUDE.md

Orientation for any Claude session in this repo. It points at the rules; it does not restate them.

## What this is

`gushwork-design/design-system` is two things in one repo:

- A Claude Code **plugin** (`gushwork-design`, marketplace `gushwork`) that makes anything generated for Gushwork come out on-brand.
- The source of the **design hub site**, design.gushwork.ai.

Owner and design decision-maker: Utsav Singh. He makes design and taste calls and does the merging. Bots make no design decisions.

## Key directories

- `foundation/` - tokens (`tokens.css` is generated, never hand-edited), voice, states, shared rules.
- `skills/` - the plugin's skills (`gushwork-web`, `-dashboard`, `-tools`, `-lead-magnet`, `-slides`, `-brand`).
- `exports/` - measured specs per surface, each with a `component-registry.json`.
- `templates/` - starter templates. `notices/` - records of components a session had to invent.
- `web/` - the hub site: static pages, `web/api/*.js` serverless functions, `web/admin/`, `web/previews/**` (`.frag` previews).
- `preview/` - generated output; `preview/library/` is rebuilt by `scripts/library-site.sh`.
- `scripts/` - checks, tests, release and site build tooling. `hooks/`, `.claude-plugin/`, `.github/workflows/` - plugin hooks, manifests, CI.

## Where the rules live (read these, do not copy them)

- `CONTRIBUTING.md` - how to change the system (maintainers).
- `DECISIONS.md` - numbered rulings; latest at the bottom. A ruling is changed there, not around it.
- `REVIEW-LOOP.md` - how a component a skill invented gets reviewed, passed or rejected.
- `README.md` - install and how an edit reaches everyone. `ONBOARDING.md`, `ROLLOUT.md` - for users and teams.
- `.claude/PROJECT-MEMORY.md` - stable project facts and working preferences. It lives on the project dev branch, so it may not be in your checkout; read it if it is.

## Checks

Run what is relevant before opening a PR:

- `bash scripts/check-<name>.sh` - one script per check (approvals, drift, fonts, placeholders, previews, site, skill drift, version).
- `node scripts/*.test.mjs` - Node tests (access, concierge, health, review-*). `bash scripts/check-update.test.sh` for the update hook.
- `bash scripts/library-site.sh` - rebuild the Library site in `preview/library/`.

## Never

- Never merge, approve, publish, deploy, or touch Vercel. Never run `scripts/publish-sheets.sh`. Utsav merges and decides what ships.
- Never edit `foundation/`, `exports/`, `skills/`, `DECISIONS.md`, `templates/`, or any `component-registry.json` unless the task is explicitly that.
- Colours come from tokens only. No invented hex values.
- Never fabricate client logos, photos, quotes or reviews.
- Never print or commit tokens or secrets; the repo is public.

## Working here

- Open PRs as drafts, on a branch; never push to `main`.
- Scheduled routines (nightly, rework, health) open PRs only and may edit only `web/previews/**`, `web/admin/**`, `web/*.css`, `web/*.js` and `scripts/**`.
- If unsure whether something is allowed, stop and ask rather than guess.
