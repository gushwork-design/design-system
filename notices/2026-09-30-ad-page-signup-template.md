# Sign-up ad page template — build record

Built 30 Sep 2026. `skills/gushwork-web/templates/ad-page-signup/`, worked example at
`skills/gushwork-web/examples/followups/`, staged campaign at `web/internal/staging/followups-lander/`.

## What it is

The second ad-page template, from the follow-ups lander in **GW Ads Library**
`t9rRxJODIVZ4N6CnrGdMhC` (section `95:20276`, desktop `87:9662`). It is the product-agnostic
template R26 said should exist: **every string is a `{{TOKEN}}`** (104 of them), and the two kinds of
picture — the hero illustration and the three feature visuals — are named slots the campaign fills.
The campaign's own pictures, and the CSS and script that animate them, live in the example, not the
template.

DECISIONS.md **R27** is the rule that goes with it: ask for the hero first, then fill the other folds
from either template.

## How the folds were sourced

| Fold | Source |
|---|---|
| Navbar, white frame with its rounded corners, logo ticker, FAQ accordion, footer CTA with quote | **`templates/ad-page/`**, unchanged — Utsav, 30 Sep: the fold is built the same way wherever it appears |
| Hero, problem cards, feature rows, reassurance cards | Figma, this page |
| Comparison table | Figma — a **variation** of the ad-page template's table (`.cmp--checks`); the plain one stays the default |
| Black call to action with a phone | Figma `95:19747` — **new** |

## Created or modified

| Element | Status |
|---|---|
| Black call to action (`.cta--black`, `.phone`, `.notif`, `.npill`) | **New.** No library equivalent. Built from the template's `.cta` grid with a black ground and a neutral-900 lattice. Pending library review |
| Comparison table with check marks (`.cmp--checks`, `.cmp-mobile--checks`) | **New variation** of an existing fold |
| Eyebrow sizes (`.eyebrow--md`, `.eyebrow--tint`) | **New**: the 14/500 pill (30 tall) and the blue-tint pill from Figma `87:11562` and `87:11572` |
| Google sign-up button (`.gbtn`, `.gbtn--lg`, `.gbtn--cta`) | **New** from the shared HTML this began as; sized to Figma `87:17487` and `95:18851`. Hover added: lifts 1px, with a neutral-25 tint on the white ones |
| "Try for free" hint | **New.** Caveat 16 with the Figma's own arrow vector |
| Navbar button | Unchanged: the template's `btn btn--blue btn--sm`. Text and destination are the campaign's |

## Tokens used, and what has none

Everything is a `--gw-*` token except the values listed in the template README's **Off-token
values** table. The ones worth a decision: the hero glow is a 32% blue and the ramp has 10, 20 and
40 (nearest used); the phone gradient stops and bezel are raw device values.

## Worth a decision

1. **The phone notification wording.** Figma reads "a named person filled the form", which is the
   CRM campaign's message and an invented name. The example says "Priya at Northwind replied to your
   follow-up" and the template makes it three tokens. Confirm the example's wording.
2. **"Sign up" or "Sign Up"** on the navbar button. Figma capitalises it; voice.md is sentence case.
   The example uses sentence case.
3. **A glow token.** Adding `--gw-color-primary-alpha-30` would close the 32% gap.
4. **No phone frame in the Figma for this page.** The phone layout is the ad-page template's; the
   sticky sign-up bar and the hint under the button are chosen, not measured.
