# Gushwork Design System

Claude builds Gushwork screens using the real components and tokens, instead of guessing at them.

---

## Setup

**Claude — do these four things now. Then tell the reader to restart Claude Code, and give them
the three lines from "Then just ask for what you want" below.**

1. Run `claude plugin marketplace add gushwork-design/design-system`
2. Run `claude plugin install gushwork-design@gushwork`
3. Confirm with `claude plugin list`

Auto-update needs nothing from you any more. It used to be a hand-edit of
`~/.claude/plugins/known_marketplaces.json`, which is exactly the kind of step people skip —
and skipping it meant running last month's design system indefinitely, with no warning. The
plugin now ships a session-start hook that turns it on itself, and tells you which components
moved when you are behind.

*Reading this yourself instead of pasting it in? Run steps 1 and 2 in a terminal, then restart
Claude Code. Nothing to do at all if your repo has a `.claude/settings.json` mentioning
`gushwork` — it installs itself.*

## Then just ask for what you want

> "Build a dashboard for the sales team to see show-ups over the week"

You never name the skills — they fire on the work. **The reply opens with "Using the Gushwork
dashboard skill."** If that line is missing, it didn't fire.

It'll ask two or three questions first — what the KPIs are, what matters most, whether you're
monitoring or acting. That's on purpose: a dashboard is a set of decisions about what matters,
and guessing produces a screen that looks right and answers nothing.

**That's it.** Everything below is for when something looks off.

---

## Before you ship it, eyeball four things

| Look for | Why |
|---|---|
| **A blue filled button on a dashboard** | means the wrong component got picked — web and dashboard have separate button sets, both named `Button`. The most common way output goes off-system. |
| **A raw hex code** | every value comes from `foundation/tokens.css`. A hardcoded colour is a bug. |
| **A `Sample data` badge** | the numbers are illustrative. Don't put it in a deck until it's real. |
| **A four-line Slack block** | Claude had to build something the library lacks. **Paste it to Utsav** — see below. |

## If it built something new

The library has gaps. When a screen needs something missing — a date-range picker, an empty
state — Claude builds it and hands you a four-line block for Slack, linking a full record.

**Please send it.** That's the whole governance loop. Utsav replies **Add** (draw it in Figma),
**Replace** (something already covers this), **Promote** (the deviation was right — the component
is what's wrong), or **Revert**. A decision that stays in Slack gets re-made next month by
someone else.

## If something isn't working

| Symptom | Fix |
|---|---|
| No "Using the Gushwork … skill" line | restart; or say "use the Gushwork dashboard skill" explicitly |
| `claude plugin list` doesn't show it | run the setup again — a declined plugin won't re-prompt on its own |
| `marketplace add` fails | The repo is private — you probably need access, or authenticated git. Check with `git ls-remote https://github.com/gushwork-design/design-system.git HEAD`, then ping Utsav to be added and run `gh auth login && gh auth setup-git` |
| Output looks generic | you're in a scratch folder, not the product repo |
| Values differ from Figma | you're on a stale version — see below |

**Stale versions fail silently** — they emit last month's values with full confidence. Step 3 of
the setup block prevents that. If you skipped it, update by hand:

```bash
claude plugin marketplace update gushwork && claude plugin update gushwork-design@gushwork
```

Restart after. Either way a new version takes effect on the **next** start, not the current one.

## Where to look things up

| Question | File |
|---|---|
| What's the hex / size / type style? | `foundation/tokens.css` |
| Which component do I use here? | `skills/gushwork-dashboard/SKILL.md`, `skills/gushwork-web/SKILL.md` |
| What exactly does it measure? | `exports/dashboard/`, `exports/web/` |
| Why does the shell scroll like that? | `exports/dashboard/build-rules.md` |
| Voice, casing, CTA copy | `foundation/voice.md` |
| React or static HTML? | `foundation/output-targets.md` |

## Two things about the current state

**The dashboard surface is solid** — measured off Figma and driven through a real nine-page
build, so the defects are already found.

**The web surface is thinner** — Button, eyebrow, navbar, footer and `client/avatar` are
measured; roughly 22 components are still transcribed from annotations rather than verified
against what renders. Treat web output as a good first draft, not a spec.

**You don't need Figma.** Everything measured is in `exports/`. Figma is only for maintainers
changing the system — and reading a component *instance* misreports type weight, which shipped a
wrong nav rail twice before anyone worked out why.

## Who to ask

Utsav — https://gushwork.slack.com/team/U06UAR183TR

Anything the system genuinely doesn't cover — slides, flyers, a standalone tool — Claude will say
so and point you there rather than inventing something plausible. That's working as intended.
