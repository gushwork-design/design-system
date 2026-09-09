# Declaring a new or modified element

When you build something the library does not have, or deviate from a measured component,
you say so in the same reply — as **one message block the user copies straight into Slack.**

Both skills reference this. Neither restates it.

## Why this exists

A governed design system only works if drift is **visible**. An undeclared component is
worse than a refusal — it inherits the credibility of everything around it while nobody has
reviewed it.

So the trade is: you may build the missing thing, and in exchange you always declare it, in
a form short enough that someone actually reads it and sends it on.

## One block. Not two.

Do not write a summary for the user and a separate message for Slack. **The message to Utsav
is the only artefact.** The user's job is copy, click, paste, send — four actions, no editing,
no deciding what to include.

Everything long goes in a file and gets linked.

| | Where | Length |
|---|---|---|
| **The detail** | `notices/YYYY-MM-DD-<slug>.md`, committed | as long as it needs to be |
| **The message** | one fenced block in your reply | **four lines** |

## 1. Write the detail file

`notices/YYYY-MM-DD-<slug>.md` — one per piece of work, not one per element.

```markdown
# <what you were building> — new elements and deviations

Built <date>. Files: <paths>

## Created
### <element name>
What it does, why the library had no equivalent, tokens used, where it lives.

## Modified
### <component> — <measured value> → <what you used>
Why, and whether the measured value is still reachable (e.g. it is the clamp maximum).

## Worth a decision
The one or two items that are genuine judgement calls rather than obvious adaptations.

## Tokens
Every token used. Confirm no new colour, type, radius, shadow or spacing value was
introduced. List any value in use that has no token — that is a gap to report, not an
invention.
```

The **"Worth a decision"** section is the point. Most entries are routine adaptations; one or
two are you overriding a measured value because it produced a bad result. Saying which is
which turns a list into a review.

Commit and push the file **before** you give the message — the link must resolve. An
uncommitted path is a dead link.

## 2. Give exactly this, and nothing more

One short lead-in line, one fenced block, one link:

> Built 1 new element and 8 deviations — copy this to Utsav:
>
> ```
> Hi Utsav — built 1 new element + 8 deviations while making the Meta Ads dashboard.
> All token-safe, nothing new added to the palette or type ramp.
> Detail: https://github.com/gushwork-design/design-system/blob/main/notices/2026-08-06-meta-ads.md
> Worth your eye: the card-layout KPI cap — I overrode a measured split.
> ```
>
> → https://gushwork.slack.com/team/U06UAR183TR

The four lines are always the same shape:

1. **What** — counts, and what you were building
2. **Token safety** — one clause, so the reviewer knows the palette is intact
3. **The link**
4. **The one thing worth their attention** — never a list

If nothing was created or modified, **say nothing.** Never print an empty notice; it trains
people to ignore the real ones.

## Getting it to Slack

**Works today, no setup:** the block copies in one action and
`https://gushwork.slack.com/team/U06UAR183TR` opens the DM.

**Be straight about the limit.** Slack has no URL parameter that pre-fills DM text —
`?text=` works for some share flows but not direct messages. Do not promise single-click
send with a plain link; promise copy-and-paste, which is what it delivers.

**In an HTML artifact**, make the copy genuinely one click — but use three tiers, because
`navigator.clipboard` fails silently in two common cases: it needs a **secure context** (so
not `file://`, which is what happens when someone double-clicks the file) and **real user
activation**.

1. `await navigator.clipboard.writeText(MSG)`
2. on failure, a hidden `<textarea>` + `document.execCommand('copy')` — works on `file://`
3. on failure, select the text and tell them the keyboard shortcut, platform-correct

Working implementation: `preview/notice-card.html`.

```html
<a href="https://gushwork.slack.com/team/U06UAR183TR">Open Slack DM</a>
```

**For a real one-click send**, Slack needs an incoming webhook:

- The URL **must not** be committed — this repo is public. Use `GUSHWORK_SLACK_WEBHOOK`.
- Only post when the variable is set; otherwise fall back to copy-and-paste silently. Never
  ask the user for a webhook URL.
- Posting sends a message on the user's behalf — **ask before the first send in a session**,
  and don't treat one approval as standing permission.

```bash
# only if GUSHWORK_SLACK_WEBHOOK is set
curl -sS -X POST -H 'Content-Type: application/json' \
  --data "$(jq -Rn --arg t "$MESSAGE" '{text:$t}')" "$GUSHWORK_SLACK_WEBHOOK"
```

## Reviewing a notice — for whoever receives it

The notice is only half the loop. **A decision that doesn't land in the repo gets re-made
next time**, by a different session, probably differently.

### 1. Open the link and read "Worth a decision" first

Everything else in the file is a record. That section is the ask. If you have two minutes,
read only that.

### 2. Each item gets one of four verdicts

| Verdict | What it means | What lands in the repo |
|---|---|---|
| **Add** | the element earns a place in the library | draw it in Figma, then someone measures it into `exports/` and it stops being a deviation |
| **Replace** | something already covers this — here's what | a pointer in the relevant `exports/` file so the next session finds it instead of rebuilding |
| **Promote** | the deviation is right and should become part of the spec | the value moves into Figma (e.g. a min/max on the component) and `exports/` records it as measured |
| **Revert** | no — use the measured value and accept the consequence | a line in `exports/` saying so, and why, so it isn't retried |

**"Promote" is the one people forget.** If a deviation was correct across nine pages and
three viewport heights, the component is what's wrong, not the deviation.

### 3. Reply in the thread, then land it

Verdict in Slack is enough to unblock. But it isn't done until it's in Figma or in
`exports/` — until then the next build hits the same gap and files the same notice.

### 4. Close the notice

Add a short `## Resolved` block at the bottom of the notice file with the date and the
verdicts. It becomes the record of why the system looks the way it does, which is worth more
than the original notice.

## What never goes in a new element

- A colour, type style, radius, shadow or spacing value that is not already a token. Needing
  one is a **finding to report**, not a value to invent.
- A component that already exists under a different name. Check the exports first —
  `section/Container` is called `section/Other` in the rules, and that kind of mismatch is
  common in this file.
- A whole surface or deliverable type. Those still fall back — see the skill.
