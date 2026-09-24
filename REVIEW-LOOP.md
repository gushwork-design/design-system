# The review loop

How something a skill had to invent gets from "built in a session" to "part of the system" —
or gets rejected — without anyone having to remember to chase it.

**Two halves, and only the first is built.** Everything under *Today* works now. Everything
under *Next* is specified but not implemented; it is written down here so it can be picked up
without re-deriving the design, and so the parts that are easy to get subtly wrong (who is
allowed to approve, what a stale approval means) are decided before code exists rather than
after.

---

## Why a loop at all

`foundation/new-component-notice.md` is blunt about the trade: a skill **may** build something
the library lacks, and in exchange it **always** declares it. That only works if declarations
reach a human and come back as a decision. A declaration nobody answers is worse than a
refusal, because it looks official — it inherits the credibility of everything around it while
nobody has reviewed it.

The loop closes when a component is either **citable without disclosure** (passed) or **gone**
(rejected). Anything in between is a component in use that nobody signed off, which is the
state this whole mechanism exists to make visible and temporary.

---

## Today — one way

```
session builds something the library lacks
        ↓
writes it into exports/<surface>/component-registry.json  (review: pending)
writes notices/YYYY-MM-DD-<slug>.md                        (the full record)
        ↓
posts to Slack via scripts/notify-slack.sh                 (GUSHWORK_SLACK_WEBHOOK)
  — or, when the person in the session IS the reviewer, just says so directly
        ↓
reviewer reads it, runs:  bash scripts/review-pass.sh <surface> <key>
        ↓
registry records passed + reviewedBy + reviewedOn + fingerprint
/library/review drops the row · the component becomes citable
```

### The message

Everything in it is already known at build time — git email, surface, registry key, notice
path. Nothing new has to be collected:

```
🧩 New element pending review

Created:    stat strip (fold-element) · form-legal, form-alt (atoms)
While:      building the AI-services ad lander (surface: web · ad-page)
For:        utsav.singh@gushwork.ai
At:         24 Sep 2026, 4:12pm IST
Token-safe: yes — nothing new in the palette, type ramp, radius or spacing

Review:     https://design.gushwork.ai/library/review
Detail:     …/notices/2026-09-24-ai-services-lander.md

Promote:    bash scripts/review-pass.sh ad-page stat-strip
Reject:     bash scripts/review-pass.sh ad-page stat-strip --reject --note "…"
```

Five lines, not the four `new-component-notice.md` specifies for the copy-paste path. The
four-line limit exists because a human was relaying it by hand and brevity was the cost of
compliance; a webhook has no such constraint, and the fifth line is what turns a notification
into something actionable by copying one line.

### Identity

`For:` is `git config --get user.email` — the same value that attributes every commit in this
repo. It is self-reported local config, not a verified identity. That is fine for "who was
building when this came up" and is **not** fine as an authorisation signal; see the reviewer
allowlist below.

---

## Next — the ✅ comes back

The goal: the reviewer taps one reaction on the Slack message and the pass gets recorded, with
no one running a command.

### Why a reaction rather than a button or a reply

| | Needs | Cost |
|---|---|---|
| Reply "approved" | `message.channels` — **every message in the channel** streamed to the endpoint, then parsed | noisy, broad scope, NL parsing |
| Button (Block Kit) | Interactivity + request URL | fine, but a heavier payload to build and render |
| **Reaction ✅** | `reaction_added` only — emoji, who, and a message timestamp. **Never message content.** | narrowest scope of the three; one tap, works on mobile |

### What it forces

A `reaction_added` event identifies the message by timestamp (`item.ts`), not content — so the
system must already know which component that timestamp refers to. An Incoming Webhook does not
return the `ts` it created. **So the reaction loop requires posting with a bot token via
`chat.postMessage` (which does return `ts`) instead of a webhook**, and recording
`ts → {surface, key, fingerprint}` at post time.

The alternative — fetching the message back with `conversations.history` and parsing the key out
of the text — trades a small store for a much broader scope (`channels:history`). Store the
mapping.

### Flow

```
post notice via chat.postMessage        → record ts → {surface, key, fingerprint, notice}
        ↓
reviewer reacts ✅ on that message
        ↓
Slack POSTs reaction_added → web/api/slack-events.js
        ↓  verify signature · verify reactor · look up ts
records "approved: <surface>/<key> by <user> at <T>" in the queue
        ↓
next session: the SessionStart hook drains the queue
        ↓  re-check fingerprint still matches what was approved
runs review-pass.sh → registry records the pass
```

### Why it records rather than "messages Claude back"

There is no persistent Claude to message. A session exists only while it runs; by the time a
reaction arrives the session that built the thing is gone. So the reaction cannot notify
anyone — it can only **record**, and the next session picks it up. This is a queue, not a
conversation, and it is why the loop needs no always-on agent and no inference: a serverless
function fires on a click, writes a row, and stops.

### Three guards, none optional

1. **Verify Slack's signature.** `X-Slack-Signature` + `X-Slack-Request-Timestamp`, HMAC-SHA256
   with the signing secret, reject if the timestamp is more than five minutes old. Without
   this the endpoint is a public URL that approves components for anyone who finds it.
2. **Verify the reactor.** `event.user` must be on an allowlist of Slack user IDs. Anyone in
   the channel can add ✅; without this check, channel membership *is* review authority.
3. **Re-check the fingerprint at apply time.** `review-pass.sh` stores a fingerprint so a pass
   expires when its source moves. An approval recorded Monday and applied Wednesday may be for
   a component that changed in between — apply blind and a tap on an old message silently
   passes something nobody looked at. If it moved: refuse, and re-post the notice.

### Decided, so it isn't discovered later

- **`reaction_removed` is ignored.** The reverse of a pass is not "un-approve" — it is an
  explicit `--reject` with a note saying why, which is a record; a removed emoji is not.
- **Only ✅ counts.** Any other emoji is ordinary channel chatter and must not be interpreted.
- **A second ✅ on an already-passed component is a no-op**, not a re-pass with a new date.

---

## Setup

| Variable | Used by | Where it lives |
|---|---|---|
| `GUSHWORK_SLACK_WEBHOOK` | `scripts/notify-slack.sh` (today) | the reviewer's `~/.claude/settings.json` `env`, or shell profile |
| `KV_REST_API_URL` / `_TOKEN` | the store (both features) | **injected by Vercel** when the store is connected — never hand-copied |
| `SLACK_BOT_TOKEN` | `chat.postMessage` (next) | Vercel project env |
| `SLACK_SIGNING_SECRET` | signature verification (next) | Vercel project env |
| `SLACK_REVIEWER_IDS` | the reactor allowlist (next) | Vercel project env, comma-separated |

### The store — decided 24 Sep 2026: Vercel KV

Both halves need a small shared store: a session writes `ts → {surface, key, fingerprint}`
when it posts, the Slack handler writes approvals server-side, and the next session drains
them. Keys used: `gw:usage` (list), `gw:notice:<ts>` (map), `gw:approvals` (queue).

**A Google Sheet was the first choice and was abandoned on contact with reality.** It needs a
service-account JSON key, and this org blocks key creation outright —
`iam.serviceAccountKeys.create` is denied, which is Google's
`iam.disableServiceAccountKeyCreation` default on newer Workspace orgs. An Apps Script Web App
would have kept Sheets without a key; KV won anyway, for a reason worth keeping in mind
whenever this trade comes up again: **Vercel injects the store's credentials into the project
itself, so nobody ever copies a secret by hand.** The credential that is never handled is the
credential that never leaks.

What was lost: a spreadsheet you can sort and eyeball. Reading the log back is a separate,
still-open question — the provider's data browser, or a small admin-gated page.

**None of these go in the repo.** It is public; a committed token is a rotated token. The
project-level `.claude/settings.json` is committed too — the user-level one is not, which is
the difference that matters.

### Scopes

- Today: Incoming Webhooks only.
- Next: `chat:write` (post and get a `ts` back) and `reactions:read` (receive `reaction_added`).
  Notably **not** `channels:history` — the whole point of reacting rather than replying is that
  message content never needs to be read.

### The app

Bruce — the async junior-designer agent at `~/Downloads/bruce` — is the natural identity for
this rather than a second app: "built something the library doesn't have, needs your eye" is
exactly what a junior designer says, and attribution reads correctly. Bruce is otherwise idle
because running a session per Slack message is expensive; this use costs nothing, because
posting a message and receiving a reaction involve no inference at all.

**The discipline that keeps it that way: this loop is outbound plus a reaction, and nothing
else.** The moment it grows a conversational surface it stops being free, and that is a
decision to make deliberately with the cost in view — not somewhere to drift.
