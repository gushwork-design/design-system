# Agents

The agents that run the design hub, recorded in git. Bruce leads; Alfred and Doc work with him. The hub's **Agents** page (`/admin/agents`, in the Owner section) reads this folder.

```
agents/
  registry.json        who the agents are, who leads, how the lead hands work over
  <id>/agent.json      who it is, how it is reached, what it does and never does, its limits and where its memory lives
  <id>/memory.md       rulings and facts that should outlive any one chat, changed by pull request
```

`node scripts/agents-build.mjs` turns these into `web/admin/agents-data.json`, the one file the page reads. `node scripts/agents.test.mjs` checks the structure, that nothing looks like a secret, and that the generated file is current.

## What is not here, on purpose

- **Prompts.** An agent's prompt lives in its routine in claude.ai. The repo is **public**, so the prompts and their guardrails are not committed yet. Each `agent.json` says so (`prompt.inGit: false`). When that is decided, `prompt.md` goes in each folder and the build and the test pick it up.
- **Secrets.** A trigger's address and token stay in the site's environment (`GW_BRUCE_TRIGGER_URL`, `GW_BRUCE_TRIGGER_TOKEN`, ...). The test fails on anything that looks like a key.
- **Per-person notes.** Bruce keeps short notes about each person, privately, in the hub's store. They are not memory in the sense of this folder.

## Memory, in three layers

| Layer | Lives in | Written by | Why there |
|---|---|---|---|
| Project memory | `.claude/PROJECT-MEMORY.md` | the lead session only | one writer, so no conflicts |
| An agent's durable memory | `agents/<id>/memory.md` | a pull request | reviewed, dated, and revertable |
| Notes about a person | the hub's private store | Bruce, through `/api/bruce-memory` | private, and about people |

## Adding an agent

1. Create the routine in claude.ai with its trigger and the fewest tools it needs.
2. Add `agents/<id>/agent.json` and `memory.md`.
3. List it in `registry.json`, with a `routing` line if the lead should hand work to it.
4. `node scripts/agents-build.mjs && node scripts/agents.test.mjs`, then open the pull request.

## Changing an agent

Its record and memory change here, by pull request. Its prompt, for now, changes in claude.ai (or through the routine API from a Claude session), and the change is noted in `memory.md` with a date so there is a trail.

## Not yet

- The lead's routing is still written into `web/api/_concierge.js` (Alfred only). `registry.json` already describes it; reading it from the registry is the next step, so adding an agent needs no code.
- One run log for every agent. Today only Bruce's turns are logged (Analytics, Bruce).
