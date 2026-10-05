# Build stamp and build notice

A dashboard is a static file that outlives the session that made it. There is no server and no record
of who built what, so nothing can be pushed to its owner when the design moves. The **stamp** and the
**notice** are the substitute. Both ship in the dashboard set: include `dashboard.js` and the notice
exists; write one comment and it knows what to check.

## Build notice

**Purpose.** On load, tell a dashboard's owner that components the dashboard uses have changed or been
removed since it was built, and give them the exact instruction to paste into Claude to update it. Do
not use it for anything else: it is not a toast, and it never reports on data.

**Stamp.** Every dashboard carries one comment, anywhere in the document:

```html
<!-- gushwork-build:{"pluginVersion":"2.0.0","createdBy":"name","createdAt":"4 Oct 2026","surface":"dashboard",
  "registry":"https://gushwork-design.vercel.app/exports/dashboard/component-registry.json",
  "changelog":"https://gushwork-design.vercel.app/changelog-sheet","components":["app-shell","data-table","line-chart"]} -->
```

`components` lists the registry keys the build actually uses, and only those: the notice and
`scripts/check-drift.sh` report the intersection of what the build uses and what has changed. When a
component is removed from the build, remove it from the stamp too, or the notice reports on a part the
file no longer has.

**Anatomy.** `.gd-drift` (created if absent; or write `<aside class="gd-drift" data-gd-drift>`) with a
head (Badge, title, dismiss icon button), a list of up to three changed components with the registry's
one-line note, two buttons (`Update now`, primary, and `Remind later`, outline), and a footer (built date and version, changelog link).

**Variants.** *Out of date* (Badge bad): a component the build uses is `breaking`, or is gone from the
registry. *Update available* (Badge warn): only improvements.

**Behaviour.** Fetches the published registry after load (1.2s, so it never delays first paint),
compares each stamped component's version with the plugin version it was built on, and shows once per
change-set (recorded when shown, not when dismissed; a later change is a new signature). `Update now`
opens Claude Code with the update instruction already in the prompt box, using Claude.app's
`claude://code/new?q=<prompt>` link (the person presses Enter to send). It also copies the instruction
and shows a short line saying so, because a browser cannot tell whether the app is installed: with no
handler the click does nothing, and the copy is the way through. If the clipboard is blocked, the text
is revealed in place in a read-only text area. It never uses `window.prompt`. A prompt over 12,000
characters is copied but not put in the link (the app cuts it at 14,336). The link route was read from
the app's URL handler (Claude desktop 2.19675.0), not from public documentation, so recheck it if the
app changes. It does not choose a folder: a page cannot know where its own file lives, so the person
opens the session in the dashboard's folder; a local `file:` dashboard names its path in the prompt.

`Remind later` hides the notice and leaves a note in `localStorage` (`gw-drift-snooze`, per person and
browser) holding the change-set. The next time the dashboard opens, the notice shows once more and the
note is spent; asking again postpones it one more visit. It cannot hide the notice for good: if storage
is blocked, the notice simply shows on every open. The dismiss icon button still closes it for this view
only. Both buttons are native buttons, reachable by Tab, with the base keyboard focus ring (R41).

**Must never break the dashboard.** Offline, private host, blocked CORS, malformed JSON: every failure
ends in silence. The registry URL is the public deploy, not `raw.githubusercontent.com`, so the check
keeps working after the repo goes private.

**Tokens.** `--gd-raised-bg`, `--gd-border-strong`, `--gw-shadow-s3`, `--gw-radius-12`, text and Badge
aliases. Sits at z-index 70, under the modal and drawer (90) and the toast (100).

**Provenance.** NEW as a component; the behaviour is the old `DRIFT_JS` block, rewritten as vanilla
JS in `js/80-drift.js` (no longer embedded in a Python string, which removes the raw-string trap the
old build had). Pending library review.

**Publishing is part of shipping.** `scripts/publish-sheets.sh` deploys the registry. Until it runs,
every dashboard checks against the old one and nobody is told anything. When you change a component's
spec, bump its version in `registry-parts/` in the same commit, and set `breaking: true` when an
existing build renders wrong until updated.
