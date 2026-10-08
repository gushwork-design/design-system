# Changing the design system

**This file is for maintainers.** If you are building a screen, you do not need it, and you do
not need Figma — everything measured is in `exports/`. Stop here.

Read on only if you are adding a component, correcting a measurement, or re-pulling tokens.

## Adding a staging page (anyone on a lane, from the plugin)

A page you want to show the team goes at `design.gushwork.ai/internal/staging/<lane>/<page>`, behind the
sign-in. The owner does not review it and you do not need repo access.

A **lane** is a team's folder (`gtm`, `customer-success`). The owner creates it, and lists who may publish into it, in
Access Control, Staging lanes. Everyone in the organisation can open the pages.

**You tell your Claude:** "publish this to the gtm lane". With the design plugin installed, it scaffolds the page
(`scripts/new-staging-page.sh`), runs the checks (`scripts/publish-staging.sh --check`) and publishes it.

**The first time on a computer** it connects itself: the script prints a code and opens
`/internal/staging/connect`. You sign in as yourself, type the code, press Connect. That is the only step you do;
it is remembered for 90 days (`publish-staging.sh logout` disconnects).

The page is live a minute or two after it says Committed, and the Staging index lists it under Team pages by
itself, from the `staging.json` the script writes. Publishing the same name again replaces its files.

What keeps it safe, all in `web/api/_staging-rules.js` and `_publish.js`: the person must be on the lane (read live
from Access Control on every call, so removing them stops their token at once); it writes only under
`web/internal/staging/<lane>/<page>/` and never into a folder that is already a page of its own; it deletes
nothing; static files only, 3 MB in all; no key-shaped strings; no reference to the hub's `/api/` or `/admin/`
(a page there runs on the hub's domain with the viewer's session; this is a scan, not a sandbox); the same font
rule the deploy enforces. The connect code is typed rather than linked, and the token is minted when the script
collects it, so the store only ever holds hashes. Anything beyond that (deleting a page, a bigger file, a new lane)
is the owner's. `node scripts/staging-publish.test.mjs` runs the tests, including the font rule against `check-fonts.sh`.

## The one rule that has cost the most

**Read the component *set*, or a variant `<symbol>` inside it. Never an instance.**

An instance read misreports type weight. Instances inside `dashboard-build` return `Inter:Bold`
for text the component set defines as `Inter:Medium` or `Inter:Semi_Bold`. This shipped a wrong
nav rail **twice** before it was understood.

How to tell them apart in `get_metadata`:

| | Is | Trust it? |
|---|---|---|
| `<symbol>` | a definition — one per variant | **yes** |
| `<instance>` | a use of a definition | no, for anything but position |

## Two checks, every time

Each of these caught a real error that eyeballing had passed.

**Compare geometry numerically.** Read Figma's `x/y/w/h` from `get_metadata` and assert against
`getBoundingClientRect()`. A screenshot comparison approved a rail that was 9px out per nav
group — three times over, and it still looked fine.

**Sample the render for colour.** `get_screenshot`, then read the pixel. Annotation text does
not carry fills, and inference is unreliable: a nav icon that obviously "should" be muted grey
is in fact the same `neutral-900` as its label. Two other examples — `kpi-card` at `Mode=light`
renders a **dark** card, and `side-panel` has no fill at all despite being drawn as a white card.

**When an annotation and the component disagree, the component wins** and the disagreement is a
finding to record. `dashboard-build`'s annotation claims `gap:8` where its own coordinates prove
0. Same rule one level up: **a structure blob is documentation, not the component** — the
`image` "typos" were only ever in the doc; the canvas keys were correct all along.

## Before you rule, confirm the silence

**A ruling fills a gap in the source. Prove the gap is there first.**

All three `Button` hover fills were ruled by hand on 7 Aug on the belief that the `State=Hover`
symbols carried no fill. **They carried them the whole time**, and all three rulings were wrong —
`neutral/850`, `neutral/35`, `neutral/50`, not the values invented for them. A day of builds
shipped slightly wrong hovers that no screenshot would show.

So: **open the symbol.** Not the parent, not a sibling, not the variant next to it — the exact one
whose value you are about to rule. If it has the value, there is nothing to rule.

The mirror case is just as important. `input/text-field`'s `State=Hover` really *is* identical to
`Default` — measured, across all 14 variants. That made "the field has no hover" a finding about
the design rather than a gap to paper over. **Silence you have verified is data.** Silence you
assumed is a guess wearing a ruling's clothes.

Every ruling lives in `DECISIONS.md` with its reasoning, and withdrawn ones stay listed there
with why. If you overturn one, overturn it there.

## Two places a value hides from you

Both cost a rebuild on 8 Aug 2026.

**The parent holds what the child cannot show you.** Every one of the login lattice's 400 cells
reports a full-strength `1px dashed neutral/800`; the `opacity: 0.3` that makes it subtle is on
the frame above them. Read the frame, then the children, then check the two agree.

**The gaps between children are not in any child.** Node CSS gives you each part; only the
coordinates give you the 40 between the header and the field group, or the 16 between the field
and its button. `get_metadata` on the parent, then do the arithmetic — and check it sums to the
parent's own height.

## Tokens come from variables, never the canvas

`foundation/tokens.css` is generated from the Figma **variables**. The canvas swatch labels have
drifted badly — all 12 Neutral hexes and 7 of 12 Primary are from a superseded palette, and 10
of 31 typography rows contradict their own variables.

Re-pull by unioning `get_variable_defs` across many component nodes on every page. The
building-blocks showcase frames are **not** a complete source: of 23 radius swatches only two
are bound, and the swatches labelled 60px and 160px are both bound to `Spacing/56`.

**Never hand-edit `tokens.css`.** If a value has no variable, that is a gap to raise in Figma,
not a line to add here.

## Never rename a Figma variant

Renaming is a breaking change for everything keyed to it. Several keys are Figma
auto-generated and load-bearing — `Property 1`, `Variant4`, `Mode3`–`Mode6` — and irregular
spacing is significant: `Outlined/ black` vs `Outlined / white`, `Size=16 px` with the space.
Copy them exactly. Document reality; don't tidy it.

`RECONCILIATION.md` holds every place the measured exports and the Master Specification
disagree, and which one each export follows. Add to it rather than silently picking a side.

## Never work inside the installed plugin

`~/.claude/plugins/marketplaces/gushwork` is a **read-only mirror**. The repo you edit is your own
clone. They are not the same directory and they must never both have commits.

On 8 Aug 2026 a session wrote a notice, committed it **into the mirror**, and never pushed. That
one commit made the mirror diverge from `origin/main`, so it could no longer fast-forward — and
the plugin sat frozen while a second session, reading it, correctly reported that the design
system *has no sign-in screen* and hand-built one. The component had been in `main` for hours.

The failure is silent in both directions: the stale session has no way to know it is stale beyond
the announce line, and the mirror gives no warning that it has diverged.

**If a session ever edits or commits inside the mirror, recover it:**

```bash
cd ~/.claude/plugins/marketplaces/gushwork
git tag -f rescue HEAD          # keep anything unpushed, just in case
git reset --hard origin/main
claude plugin update gushwork-design@gushwork
```

Then restart Claude Code. Check with `claude plugin list` — and trust the skill's announce line
over any memory of having updated.

## Who may push

**Only Utsav pushes `main` — or an agent session with his explicit say-so for that push.**

Two things make this less obvious than it sounds, so both are written down:

**Using the plugin grants nobody write access.** `claude plugin marketplace add` clones
read-only. Installing, updating and reading the skills all work without a single write
permission, and the repo has one collaborator. A teammate cannot push a plugin version even by
accident. If someone wants a change in, they fork and open a PR, or they ask.

**GitHub cannot tell an agent apart from you.** A session running in your clone pushes with
your credentials, so any rule that lets you push lets it push. Server-side permissions cannot
express "only the human". Two things narrow the gap:

| Guard | What it stops | Applies to |
|---|---|---|
| Branch protection on `main`, `enforce_admins` — no force-push, no deletion | History can never be rewritten and the branch never removed | **everyone, Utsav included** |
| Ruleset *“main: pull request required (write role bypasses)”* | A direct push is rejected; changes must arrive as a reviewed PR | **everyone except the `write` role** |
| `scripts/hooks/pre-push` — `bash scripts/hooks/install.sh` | A plain `git push origin main` is refused locally. Authorise one: `GW_PUSH=1 git push origin main` | this clone |

So the release flow below works for Utsav — the `write` role bypasses the PR rule.

**Two things about that were wrong here until 1 Sep 2026, and are worth recording.** The table
said the bypass was *repository admin*, and the ruleset was named for it. `bypass_actors` was in
fact EMPTY: nobody bypassed, admins included, which is why v1.44.0 had to go to `main` as a
reviewed PR. And the transfer to design@gushwork.ai made the admin route moot anyway — a
user-owned repo has exactly one admin, its owner, so Utsav is a `write` collaborator now and
could not have been an admin bypass even if one had existed.

**The bypass is the `write` ROLE, not a person.** GitHub rulesets cannot name an individual user
on a user-owned repo, so this is the only granularity available. Today that is Utsav alone and
the effect is what was intended. The moment a second collaborator is added with write, they get
the same direct push — this rule stops being insurance at that point, and the decision has to be
revisited rather than assumed.

**The hook is a guard rail, not a boundary.** Anything that can run git in this clone can also
set `GW_PUSH=1` — that happened during the very commit that added it, when a force-push test
turned out to be an ordinary fast-forward and pushed. If you want a push to `main` to be
genuinely impossible without review **including by an agent using your token**, empty
`bypass_actors` again. That is a deliberate trade: it makes every release a PR someone approves
in the GitHub UI.

## Shipping the change

See the propagation table in [`README.md`](README.md). The short version:

1. Change Figma **and** measure it into the repo in the same sitting. Figma alone ships nothing.
2. **`bash scripts/release.sh 1.2.0 "what changed, in one line" --quiet --session "<uuid> <title>"`**

   `--quiet` or `--notify "<one line for teammates>"` is required, and the default answer is
   quiet. A bump no longer wakes anyone: the session-start notice fires only when the newest
   release flagged with `--notify` is ahead of the copy a teammate runs (R51). **Claude asks Utsav
   before passing `--notify`** — a new skill, a new template or a breaking component is worth
   asking about; site, hub, log and script work is quiet without asking, said in one line.

   One command, because the steps below were written down, were correct, and still got done
   wrong. v1.40.0 moved `plugin.json` and both announce lines but not `marketplace.json` —
   `stamp-release.sh` writes all of them, so it had simply not been run — and the marketplace
   served 1.39.0 while the plugin called itself 1.40.0 for ten days. Nothing failed. Nothing
   said anything.

   It stamps, makes the release commit, regenerates the logs as a **second** commit, then
   checks the three things that have each been wrong at some point: the version fields agree,
   the derived logs agree with their generator, and the new version really did become a
   changelog row. It stops at the first disagreement. `--publish` deploys as well.

   **It does not push.** `scripts/hooks/pre-push` makes a push to `main` a deliberate act on
   purpose, and a release script that pushed would route around the guard this repo installed.

   What it is doing, and what to know if you ever drive it by hand:

   - `stamp-release.sh` writes the version and today's date into both manifests and every
     skill's announce line at once.
   - **The commit subject is the summary** in both release logs.
   - The trailer is `<session-uuid> <title>` and becomes a `claude://resume/<uuid>` link in the
     `Session` column. Get the uuid from the transcript filename in `~/.claude/projects/<project>/`.

     It **must sit in the last paragraph of the message.** Git parses trailers only there, so a
     `Session:` line with a blank line between it and a following `Co-Authored-By:` is not a
     trailer at all: the column comes out blank and nothing says why. `release.sh` reads the
     trailer back after committing and refuses to go on if it did not parse.
   - `release-log.sh` regenerates **both** renderings — `CHANGELOG.md` and
     `preview/changelog-sheet.html` — from one derivation in `scripts/_releases.sh`, so they
     cannot disagree. Neither is ever edited by hand. `--check` exits non-zero if either is
     stale.
   - The log commit is **never an amend**: the logs record the release commit's sha, and
     amending changes it.

   **A release is a commit that moves the `version` field in `.claude-plugin/plugin.json`** —
   the field `plugin update` compares. It is *not* a commit whose subject starts `vX.Y.Z`. That
   was the old rule, and because the subject convention only started at v1.19.0 it dropped 23 of
   34 releases, including **v1.20.0, the login screen**. Write the subject well anyway: a
   release with a badly-formed subject now appears in the log with a bad summary rather than not
   appearing at all.
3. **`claude plugin list`** before you push — not `claude plugin validate .`. Validate passes on
   a `plugin.json` broken badly enough that the plugin never loads; `list` is what shows you it
   actually resolved. v1.41.1 exists because of that gap.
4. Push to `main`. Anyone with `autoUpdate` on gets it at their next start.

**What the Session link is, and is not.** `Claude.app` registers a `claude://` scheme whose
`resume` route reopens a CLI session by uuid. The link therefore **only resolves on the machine
holding the transcript** — it is a pointer for the maintainer, not something a teammate can
follow. Everyone else uses the commit link.

A uuid and a chat title are opaque and safe in a public repo. **Chat content is not — never put
a transcript, an excerpt, or a quote from one in here.**

**Attribute from first-hand knowledge, not from grepping transcripts.** Forked sessions duplicate
each other's history, so a session that merely *mentions* a version reads as its author. Two
different greps produced two different, both-wrong attributions before that was noticed. If you
cannot vouch for a release, leave its cell blank.

Several chats push here. On 8 Aug 2026 two of them shipped versions within ten minutes of each
other, and a third built a component that already existed because its plugin copy was stale. The
log exists so "what changed, when, and from where" is answerable without reading git.

**Always stamp.** The announce line is how a teammate finds out they're stale without checking —
their copy reports *its own* date, not today's. If you edit a skill without stamping, that signal
silently lies. It costs one command.

You do **not** need a version bump for content to propagate — the marketplace clone *is* the
plugin, so a refresh is a `git pull` and whatever is on `main` becomes live. The version is how
people tell you what they're running, not the delivery mechanism.

5. **Announce it.** `bash scripts/release-notes.sh` prints a Slack message built from the commit
   subjects since the last tag. Trim it — it cannot know which changes people care about — then
   post it. An unannounced release only reaches the people with auto-update on.

Tag the release so the next run has a clean starting point: `git tag v1.2.0 && git push --tags`.

## Every new component gets a drawing — before it counts as done

A component's drawing is `web/previews/<surface>/<key>.frag`: a small piece of HTML, drawn from its measured values with
`foundation/tokens.css`, that the review drawer in the Design System page shows beside Pass, Rework and Reject. Utsav
confirms it against Figma there. **A measurement that has not been drawn has not been checked.** The export file and the
drawing move together; adding one without the other is half the job. `bash scripts/check-previews.sh` lists what is missing.

So when you add or correct a component, element or pattern:

1. **Render it on the sheet** from the values you measured — not from the annotations, and not
   from a screenshot.
2. **File it under its Figma page and group**, because the sheet mirrors the file's own
   hierarchy and that is what makes it checkable side by side:

   ```
   01 · Core                 building-blocks · shared-components
   02 · Web                  ↳ web/ component-library      112:414
   02 · Web                  ↳ web/ pattern-library        1658:22673
   03 · Dashboard            ↳ dashboard/ component+pattern-library   1658:24112   (retired as the dashboard source, 4 Oct 2026)
   ```

   Inside a page, the section is the **Figma group name** — `button`, `badge`, `card`,
   `input-fields`, `fold`, `footer/footer-elements` — not a name of your own. Add a nav entry for
   any new group.
3. **Put the node id in the header** so it can be opened in Figma in one click.
4. **Say what is not rendered.** If you measured `Active` but not `Hover`, draw `Active` and state
   that the rest is unmeasured. Leave the gap visible.
5. **Tell Utsav it is there**, in the same message as the notice.

**Never render from a guess.** Two CTA errors came from exactly that — a layout inferred from
aggregate token counts, and a square count from a regex that silently dropped a column. A
plausible render is worse than an empty slot, because it gets approved. If you did not read the
component's structure, say so and leave the slot empty.

## Closing a notice

When a build hits a gap it files `notices/YYYY-MM-DD-<slug>.md` and sends a four-line Slack
block. Each item in its **"Worth a decision"** section gets one of four verdicts — **Add**,
**Replace**, **Promote**, **Revert** — and the verdict is not done until it is in Figma or in
`exports/`. Format and the full review procedure:
[`foundation/new-component-notice.md`](foundation/new-component-notice.md).

**Promote is the one people forget.** If a deviation held up across nine pages and three
viewport heights, the component is what's wrong, not the deviation.
