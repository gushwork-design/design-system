# Hub shared memory

How threads and routines share one picture without stepping on each other.

- `../PROJECT-MEMORY.md` — stable facts, preferences, decisions, what is merged. Everyone reads it first. Only the lead edits it (one writer, so no conflicts).
- `threads/<id>.json` — one file per thread: `{ id, title, task, status, agentId, startedAt, result }`. Each thread owns exactly one file, so any number can run in parallel. The `/thread` command in `mods/design-hub` writes and updates these. They are gitignored: they are live state on the machine running the session.
- Routines run in fresh clones of `main`, so they see only what is committed there. They read `PROJECT-MEMORY.md` once it is on `main`; they do not read `threads/`. Their prompts also forbid editing `.claude/`, so they stay read-only here until Utsav decides otherwise.
