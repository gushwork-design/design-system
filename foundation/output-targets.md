# What to actually emit

Both skills reference this. Neither restates it.

A design system that only produces screenshots is a mood board. Gushwork ships on **Vercel and
Railway, deployed from GitHub**, so the output has to be code that lands in one of those
repos — not a standalone file someone has to translate first.

## The default: React, in the repo you are already in

| | Choice | Why |
|---|---|---|
| **Framework** | **Next.js App Router**, React function components | What Vercel deploys with no configuration |
| **Language** | TypeScript if the repo has it, otherwise JS | Never introduce TS into a JS repo to satisfy this file |
| **Styling** | **Plain CSS + the `tokens.css` custom properties** | The tokens already *are* CSS custom properties |
| **Components** | **None shipped** — build each from its measured spec in `exports/` | The React set was intended and never built; see *Where the pieces live* |
| **Fonts** | self-hosted from `fonts/`, via `next/font/local` | No network font fetch; both faces are committed |

### Not Tailwind — and this is a decision, not an oversight

`foundation/tokens.css` is the single source of truth for every colour, size, radius, shadow
and type style, generated from the Figma **variables**. A `tailwind.config` would be a second
copy of those same values, and the moment Figma changes, one of the two copies is wrong and
nothing tells you which.

If the target repo already uses Tailwind, **don't fight it** — map the utilities to the token
custom properties (`bg-[var(--gw-color-neutral-900)]`) rather than to raw hexes, and say in one
line that you did. What is banned is a parallel palette, not the utility syntax.

## Read the repo before choosing — it decides for you

Do this before writing a line. It takes one look and prevents the single most wasteful
outcome: a correct design delivered in a form the codebase cannot accept.

| What you find | Emit |
|---|---|
| `package.json` with `next` | React components in the repo's own conventions, its directory layout, its import style |
| `package.json` with React but not Next | Plain React components, no `next/*` imports, no `'use client'` |
| A repo in another stack (Vue, Django, Rails) | Its templates, using `tokens.css`. Say that the measured components are React and that you translated them |
| No repo — a mockup, a review, "show me what it'd look like" | **A single static HTML file.** Correct and much faster; nobody merges it |

**When you genuinely can't tell, ask.** It is one question and it saves a rebuild.

## Where the pieces live

```
foundation/tokens.css          import once, in the root layout
exports/dashboard/**.md        the measured specs — build components from these
fonts/                         both variable faces, committed, licensed
preview/*.html                 static reference builds, not importable
```

**There is no `components/dashboard/` in this repo.** Until 28 Aug 2026 this file told every
build to import from it before writing a component. The folder was never built — there is not
one `.tsx` or `.jsx` in the plugin — so that instruction sent people looking for something that
does not exist. Reported by a teammate on 28 Aug 2026 and corrected the same day.

Build each component from its **measured spec** instead: `exports/dashboard/v2/*.md` for the v2
set, `exports/dashboard/*.md` for what v2 does not cover. Those specs are the source of truth in
either case — a components folder would only ever have been the specs, compiled once.

The reason the old line gave still stands, and it is why the specs are not optional: a
hand-rolled kpi-card that looks right is the exact failure this repo exists to prevent.

## Deploying — the two that bite

**Fonts.** `Vert_Grotesk_Display_VF.ttf` and the two Inter variable faces are committed here
and licensed for our use. Load them with `next/font/local` pointed at the committed files.
Never load a Gushwork face from a CDN, and never let a build fall back to `system-ui` — the
display face is the brand and a fallback is silently off-brand. Verify by **measuring rendered
text width**, not with `document.fonts.check()`, which returns true for a face that is merely
*declared* and 404s.

### Which face you may actually use, per target

The paragraph above was written for the React target and read as absolute everywhere, which is
why "it rendered in Inter" keeps getting reported as drift. Sometimes it *is* drift and
sometimes it is the only legal outcome, and nothing said which — so the rule was followed at
random. It is absolute in every target that can reach the files, and a target that cannot
reach them cannot be held to it.

`skills/gushwork-slides` already rules this way for its own surface (**R21**: Vert first, Plus
Jakarta as fallback, because Slides cannot load a custom face and every export substitutes).
This is that same ruling generalised.

| Target | Display face | May it fall back? |
|---|---|---|
| **React in a repo** | `next/font/local` → `fonts/Vert_Grotesk_Display_VF.ttf` | **No.** The files are committed; a fallback is a bug |
| **Standalone HTML on this machine** | `@font-face` with a relative path into `fonts/` | **No.** The files are one directory away |
| **Hosted on the design site** | `@font-face` → `/fonts/…` on the deploy | **No.** `publish-sheets.sh` copies the faces and `vercel.json` already sets `Access-Control-Allow-Origin` on `/fonts/` |
| **A published Artifact or other sandboxed page** | Inter, from Google Fonts | **Yes — and it is the only option.** The sandbox admits stylesheets only from `fonts.googleapis.com` and font files only from `fonts.gstatic.com`, so a licensed local face cannot load at all. Name Vert first in the stack anyway, so it resolves on a machine that has it |
| **Slides export** | Vert first, Plus Jakarta as fallback | **Yes** — R21. Every export substitutes |

**How to report it.** A build in one of the two fallback rows is not drifting and should not be
filed as such. A build in the top three rows that renders in Inter or `system-ui` *is* drifting,
and the fix is to load the committed face rather than to relax this table. Say which row a build
sits in when you report it, and the report answers itself.

Check a file against this table with `bash scripts/check-fonts.sh <file> --target <row>`.

**Railway holds the data; Vercel holds the screen.** Which means the shell renders before the
numbers arrive — always. So:

- **Every Section needs a loading state and an empty state.** Not optional in a deployed app.
- **The library has neither.** No skeleton, no spinner, no empty state. `Skeleton` and
  `Spinner` appear in `shared-components.md` only as *intended* components; nothing is drawn.
- So they are **build-then-declare**: compose from `section/Container` and tokens, comment
  them as pending review, and put them in the notice. See
  `foundation/new-component-notice.md`.

Never render a zero, a dash, or a plausible-looking number while data is in flight. A `0` that
means "not loaded yet" is read as "we got no leads", and that misreading is expensive.

## Publishing a dashboard as a hosted Artifact

A static file is often shared as an Artifact rather than deployed. Three things bite, all found
26 Aug 2026 and none visible until the page is actually in the frame.

**The wrapper is supplied.** The host wraps the file in its own `<!doctype html><head></head>
<body>`, so the file must contain none of those tags. Guard the check with a boundary — a bare
`<head` search also matches `<header class="topbar">`, and a comment containing a literal tag
name will trip it too.

**A viewport-relative height inside a content-sized frame resolves to ZERO.** The host sizes the
frame from the content height the page reports. A dashboard shell locks `html, body { overflow:
hidden }` and derives its height from `100vh`, which is circular there: reported height is 0, the
frame collapses, and the page renders **blank rather than broken** — easy to misread as a build
failure. Use `100dvh`, which resolves against the frame's own viewport, and keep a fixed canvas
only as a fallback applied by MEASUREMENT (`root.clientHeight < 200`). Do **not** pin a fixed
height unconditionally: in any frame shorter than it, the overflow sits outside the viewport with
`overflow: hidden` and is both clipped and unreachable.

**The host owns `data-theme`.** It stamps that attribute on the root element to carry the reader's
light/dark preference. Any dashboard using the same attribute for its own theme toggle collides
with it. Read the host's attribute as one input, write your own under a different name, and
declare both directions so the in-page control can still override — with the in-page selector
LAST, since the two have equal specificity.

## What stays out of scope

The design system covers **what a screen looks like**. It has no opinion on data fetching,
auth, state management, or API shape — those are the app's, and inventing a convention here
would be a rule nobody agreed to. Build the surface; leave the plumbing to the repo.
