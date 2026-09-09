# Rolling this out to the org

Three ways to get the plugin onto people's machines, from least to most automatic. Pick by how
many people and whether you can push config to laptops.

Everything below was verified against Claude Code **2.1.23**. Settings keys come from the
binary's own schema, not from guesswork.

| Approach | Who it fits | Effort for the teammate |
|---|---|---|
| **1. Two commands** | one or two people, ad hoc | runs two commands |
| **2. Commit `.claude/settings.json`** | a team working in known repos — **the default** | **nothing** |
| **3. Managed settings via MDM** | everyone in the org, including repos we don't control | **nothing** |

## 1. One command

```bash
curl -fsSL https://raw.githubusercontent.com/gushwork-design/design-system/main/scripts/install.sh | bash
```

Marketplace, plugin, and auto-update in one idempotent pass — `scripts/install.sh` checks the two
prerequisites up front and names the missing one instead of failing three steps later. The
underlying commands, if you'd rather run them yourself:

```bash
claude plugin marketplace add gushwork-design/design-system && claude plugin install gushwork-design@gushwork
```

Fine for a handful of people. It does not scale, and it is invisible — you cannot tell who ran
it. You *can* now tell whether they are stale, though: from v1.41.0 their own session tells them,
which is the closest this gets to a report you don't have to chase.

## 2. Commit `.claude/settings.json` to the product repos — start here

Claude Code installs marketplaces and plugins declared in settings **automatically in the
background** on startup. So this file, committed to a repo, means anyone who opens that repo
gets the design system with no commands and no instructions to follow.

**One command per repo.** Run this from the root of the repo you want it in:

```bash
gh api repos/gushwork-design/design-system/contents/scripts/enable-in-repo.sh \
  -H "Accept: application/vnd.github.raw" | bash
```

That form works whether the repo is public or private, because `gh` sends your credentials.
The shorter `curl … raw.githubusercontent.com/…` version only works while the repo is public —
it returns 404, not a permission error, the moment it isn't.

It merges into an existing `.claude/settings.json` rather than overwriting it, is safe to re-run,
and refuses to touch the file if it isn't valid JSON. Then commit the result.

Or write it by hand — `.claude/settings.json` in each product repo:

```json
{
  "extraKnownMarketplaces": {
    "gushwork": {
      "source": {
        "source": "github",
        "repo": "gushwork-design/design-system"
      }
    }
  },
  "enabledPlugins": {
    "gushwork-design@gushwork": true
  }
}
```

That is the whole file. Commit it.

**Why this is the right default for a design system:** the plugin matters exactly where the
product code lives. Scoping it to those repos means a designer opening the marketing site gets
`gushwork-web`, and nobody carries it around in unrelated work.

- Pin a version with `"gushwork-design@gushwork": ["1.1.0"]` — the array form takes version
  constraints. Plain `true` tracks the marketplace's current version.
- `"source"` also accepts `{"source": "git", "url": "...git", "ref": "main"}` and
  `{"source": "url", "url": "https://.../marketplace.json"}` if you ever move off GitHub.
- A teammate who declines the prompt is recorded in `skippedPlugins` and won't be asked again —
  so if someone says it isn't loading, check that first.

## 3. Managed settings — org-wide, admin-deployed

This applies everywhere on the machine regardless of repo, and users cannot turn it off. Same
keys as above, in a file your MDM (Jamf, Kandji, Intune) drops on each laptop:

| OS | Path |
|---|---|
| **macOS** | `/Library/Application Support/ClaudeCode/managed-settings.json` |
| **Linux** | `/etc/claude-code/managed-settings.json` |
| **Windows** | `C:\Program Files\ClaudeCode\managed-settings.json` |

On Windows, `C:\ProgramData\ClaudeCode\managed-settings.json` still works but is **deprecated** —
Claude Code shows a warning and a future version will stop reading it. Use `Program Files`.

Writing to these paths needs admin rights, so this one is IT's to do, not yours.

### Two lockdown keys that only work here

Both are read **only** from managed settings — set them in user or project settings and they do
nothing.

```json
{
  "strictKnownMarketplaces": [
    { "source": "github", "repo": "gushwork-design/design-system" }
  ],
  "blockedMarketplaces": []
}
```

`strictKnownMarketplaces` is an allow-list: **only** these exact sources can be added as
marketplaces, and the check happens *before* download, so a blocked source never touches the
filesystem.

**Be careful with it.** Setting it to only Gushwork also blocks
`anthropics/claude-plugins-official` and every other plugin anyone uses. If you want the
allow-list, list both.

## Keeping everyone current

**Auto-update exists, and it is off by default for third-party marketplaces.** Official Anthropic
marketplaces auto-update; yours does not until the flag is set. Without it, a teammate runs
whatever version they installed, indefinitely, with no warning.

The flag lives per-machine in `~/.claude/plugins/known_marketplaces.json`:

```json
{
  "gushwork": {
    "source": { "source": "github", "repo": "gushwork-design/design-system" },
    "autoUpdate": true
  }
}
```

**It is still not settable from repo settings** — `extraKnownMarketplaces` entries only carry
`source` and `installLocation`. What changed in v1.41.0 is that it no longer has to be a step
anyone remembers.

### The plugin now sets it, and tells people when they're behind

`hooks/hooks.json` registers a `SessionStart` hook — `scripts/check-update.sh` — that ships inside
the plugin, so it arrives with the plugin and runs whether or not anyone flipped a flag. On each
start it:

1. reads the version of the copy actually running, from the installed tree's own `plugin.json`;
2. fetches `https://gushwork-design.vercel.app/version.json`, falling back to a `git fetch` in the
   marketplace clone if the deploy is unreachable;
3. if the published version is newer, names the components that changed and which are **breaking**
   for a screen built on the old ones — the same comparison `check-drift.sh` makes against a
   stamped artifact, but for the plugin itself;
4. sets `autoUpdate: true` if it isn't already, atomically, and refuses to touch the file if it
   isn't valid JSON.

Three properties worth knowing before you rely on it:

- **It is silent when there is nothing to say.** No news is the common case and produces no output.
- **It cannot make a session slow.** 10s hook timeout, a 3s cap on the fetch, the network call
  cached for 6h, and every failure path exits 0. A hook that hangs is a hook that gets ripped out.
- **The notice path needs no repo access.** It reads a public URL, so it keeps working for someone
  who has lost — or never had — git access to the source. That is deliberate: the thing that tells
  you that you are behind must not require the access that being behind might have cost you. Same
  reasoning that already puts `component-registry.json` on that deploy.

`version.json` is generated at publish time by `scripts/version-json.sh` and never committed — it
is a projection of `marketplace.json` and `component-registry.json`, so a committed copy could
only be a second thing to go stale. `publish-sheets.sh` refuses to deploy if those version fields
disagree, which is the gate that would have caught v1.40.0 shipping with the marketplace still
advertising 1.39.0.

For an MDM payload, or to set the flag before anyone has started a session, the standalone script
still works:

```bash
gh api repos/gushwork-design/design-system/contents/scripts/enable-autoupdate.sh \
  -H "Accept: application/vnd.github.raw" | bash
```

### What auto-update does and doesn't cover

Verified against the 2.1.23 startup path (`uB0`):

- **Does:** refresh the marketplace, update installed plugins, and report what changed. Covers
  `user` and `managed` scopes, plus project scope when you're in that project.
- **Doesn't:** take effect in the session that pulled it. The refresh is fire-and-forget at
  startup, so a new version lands during one run and loads on the **next**.
- **Doesn't:** run at all if the auto-updater is disabled globally.
- **Doesn't** apply to committed `.claude/settings.json`. That path installs what's **missing** —
  it never updates what's already there. Distribution and updating are separate problems.

Manual update, when someone hasn't:

```bash
claude plugin marketplace update gushwork && claude plugin update gushwork-design@gushwork
```

**A restart is required either way.** Claude Code says so on install and it means it — a
teammate who updates without restarting is still on the old skills.

## Checking what someone is actually running

```bash
claude plugin list
```

The version shown comes from `.claude-plugin/plugin.json`, **not** the marketplace entry. Both
carry a `version` field and nothing keeps them in sync, so bump both — see the propagation table
in [`README.md`](README.md).

## What to send people

If you took approach 2 or 3, there is nothing for them to install, so don't send install
instructions — send this:

> The Gushwork design system is now in `<repo>`. Just describe what you want — "build a dashboard
> for X", "add a KPI row" — and Claude uses the real components and tokens. It'll ask a couple of
> questions first; that's on purpose.
>
> Restart Claude Code once so it loads. Three things to know: if the reply doesn't open with
> "Using the Gushwork … skill" it didn't fire; if a dashboard shows a `Sample data` badge the
> numbers are illustrative — don't put it in a deck yet; and if a session opens by telling you a
> newer version is out, take it before you build, because the components it names have moved.
>
> Detail if you want it: https://github.com/gushwork-design/design-system/blob/main/ONBOARDING.md

[`ONBOARDING.md`](ONBOARDING.md) is the fuller version — three steps and the reference material
for when something looks wrong. It covers the four ways output goes off-system, which is what
actually determines whether the system holds.

## Announcing a release

```bash
bash scripts/release-notes.sh
```

Prints a short Slack message summarising what changed since the last release, built from the git
log. Review it, then post it. There is no push notification, so an unannounced release reaches
only the people with auto-update on.
