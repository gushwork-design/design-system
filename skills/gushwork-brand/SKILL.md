---
name: gushwork-brand
description: The catch-all for anything that shows the Gushwork name, logo or brand blue but is not a landing page, dashboard, deck or lead-magnet PDF — games and demos, animations, social posts, posters and banners, emails, internal tools, one-off pages, prototypes, small apps and widgets. Use this whenever Gushwork is named in the request or the output will carry the Gushwork logo, name or blue and no surface skill fits. "a game for the team", "a launch poster", "a LinkedIn banner", "a little tool", "a logo animation", "a countdown page". Not for a marketing page, a product screen, a deck or a PDF asset — those have their own skill and it wins.
---

# Gushwork brand

You are making **something that shows the Gushwork name, logo or blue, and no surface skill covers
it.** A game, a poster, a countdown, a one-off tool. These get built quickly and get shared widely —
a public artifact link, a Slack post, a screenshot — so they are how the brand is actually seen.
They are also where it drifts: a pixel font, a redrawn logo, a blue that is nearly the blue.

Announce at the start: **"Using the Gushwork brand skill — v1.57.0, updated 30 Sep 2026."**

## First: is there a better skill?

Hand off, and stop reading this one, when the thing is:

| It is | Use |
|---|---|
| a landing page, ad lander, hero, pricing page, case study, site navbar or footer | `gushwork-web` |
| a dashboard, app screen, KPI card, data table, product settings page | `gushwork-dashboard` |
| a deck, pitch, QBR, one slide | `gushwork-slides` |
| a downloadable PDF behind an ad | `gushwork-lead-magnet` |

Everything else is this skill's. The four surface skills stay disjoint on purpose — this one exists
so that *nothing falls between them*, not to overlap them.

## What is fixed, even for a toy

These do not bend for a game, a joke or a quick prototype. The fun is in the idea and the layout,
never in swapping the brand's parts.

1. **Colours are tokens.** Read `foundation/tokens.css` and use `--gw-*` variables: blue is
   `--gw-color-primary-500`, ink is `--gw-color-black`, the light ground is `--gw-color-neutral-25`,
   muted text is `--gw-color-neutral-600`. Do not type a hex that has a token, and do not invent a
   "close" blue. A dark or retro treatment is built from the **neutral ramp plus that one blue**,
   not from new colours.
2. **Two typefaces, and no third.** Headings: **Vert Grotesk Display**. Everything else: **Inter**.
   Both are in `fonts/` and declared by `foundation/tokens.css`. A pixel, script, mono-display or
   Google Font for the sake of a theme is off-brand. The only sanctioned substitute is **Plus Jakarta
   Sans Bold for headings, when Vert cannot load** (a sandbox, Canva, Google Slides) — say when you
   used it. Vert loads as Light until its weight is set, so set Bold for headings explicitly.
3. **The logo is a file.** Use the real one from `assets/logo/`: `gushwork-logo-original.svg` on
   light, `gushwork-logo-white.svg` on blue or dark, `gushwork-symbol-original.svg` /
   `gushwork-symbol-white.svg` for the mark alone. Never redraw, trace, recolour, tint, outline,
   shadow, blur, stretch or split it, and never set the wordmark in type — the wordmark is shapes
   inside the file. Scale uniformly from one height: **16, 20, 24, 40 or 80 px**, width from the
   file's own ratio (full logo 421 : 80, symbol 1 : 1). Clear space of at least half its height on
   every side. **One** logo, uncropped, inside the margin. Details: `foundation/shared-components.md`.
4. **Voice.** Sentence case. No exclamation marks, no emoji. The button reads exactly `Book a Demo`.
   Lead with a number, not an adjective. Banned words are in `foundation/voice.md` — read it.
5. **Flat.** No gradients or decorative shadows unless a token provides the shadow.

## What is yours to choose

The concept, the layout, the motion, the copy (within voice), the illustration. A game can be a game.
An animation can be wild. What it cannot do is use a different logo, a different typeface or a
different blue while doing it.

If the person **explicitly asks** for a look that breaks these — "make it pixel-art", "use a neon
palette" — do it, and say plainly in one line that it is off the Gushwork system. Do not apply an
off-system look on your own initiative, and do not treat the name in the title as permission.

## How to build it

- **Web output** (HTML, an artifact, a small app): paste or link `foundation/tokens.css`, then set
  type with the text tokens (`font: var(--gw-text-h2)`, `font: var(--gw-text-body-16-reg)`), never a
  family, size or weight by hand. Inline the logo SVG or load the file; do not approximate it.
  `foundation/output-targets.md` covers what differs between a hosted page, an artifact and a file.
- **Posters, banners, social images:** do not have an image generator draw text or a logo — it
  repaints them. Build from HTML or SVG so the real fonts and file are used, then export. Image
  generation is for illustration that contains no text and no logo.
- **Sandboxes with no fonts or internet:** ask for the brand-assets zip (the "Download all" button at
  design.gushwork.ai/downloads) rather than approximating. If you cannot get the files, say so; do not
  substitute quietly.
- **Layout on a fixed canvas:** 80 px outer margin, one job per level (logo, headline, subhead, one
  action), headline the largest thing, nothing overlapping. The worked rules and a runnable
  `check_layout` are in the Style Guide's copy-for-AI kit at design.gushwork.ai/style-guide.

## Before you hand it over

Check, and say in a line what you checked:

- Every colour is a token or the one blue. No stray hex.
- Only Vert Grotesk Display and Inter (or the named Plus Jakarta fallback, flagged).
- The logo is the real file, at a size step, not squashed, once.
- Copy is sentence case with no exclamation marks or emoji.
- If anything is off-system because it was asked for, it is named.

If a check fails, fix it before showing the result. If you cannot fix it (no font, no file), show the
result **and** say which part is not on-brand and why.
