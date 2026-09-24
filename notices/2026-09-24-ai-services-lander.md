# AI services ad lander — new elements and deviations

> **WITHDRAWN 24 Sep 2026.** `stat-strip`, `slot-icon` and `form-microcopy` have been removed
> from `exports/ad-page/component-registry.json` and `built-here.json`, and their pages are
> gone from the generated library. Ruled by Utsav: the skill should not be offering these.
> All three were invented for this lander and measured off a rendered page rather than
> derived from Figma, and a review pass made them look like library components. The promote
> commands below no longer apply. This notice is kept as the historical record of how they
> got there. The CSS still lives inline in this lander's own file; nothing about this page
> changed.

Built 23–24 Sep 2026. Files: `web/internal/staging/ai-services-lander/index.html`
(+ `favicon.svg`, `favicon-32.png`, `apple-touch-icon.png`, `og.png`)

**Registry state.** The three created elements are now recorded in
`exports/ad-page/component-registry.json` as `provenance: built-here` with **no review
entry — i.e. pending**:

| Key | Kind |
|---|---|
| `stat-strip` | fold-element |
| `slot-icon` | fold-element |
| `form-microcopy` | fold-element |

`bash scripts/review-pass.sh --check` reports them as 3 of 14 waiting. Per the citability
rule now in `SKILL.md`, they may be **read** (including for a dedup check by a later session)
but not cited as settled, and any build using them has to disclose that until they pass.

Promote with:

```bash
bash scripts/review-pass.sh ad-page stat-strip
bash scripts/review-pass.sh ad-page slot-icon
bash scripts/review-pass.sh ad-page form-microcopy
```

A dedup check was run before registering them: nothing in the ad-page registry covered these
gaps (nearest matches: none), and no prior notice proposed them.

Built from `gushwork-ai-services-ad-page-copy.docx`, using
`web/internal/staging/ai-crm-lander/index.html` as the literal template —
copied byte-for-byte, then edited in place. This is the second pass: the
first attempt recomposed the page from extracted fragments plus a new
tab-switcher component, which was correct but an unnecessary departure from
the actual template. Utsav asked for the literal-copy approach instead, which
this supersedes.

Because it starts from a full copy, **CSS, JS, and markup are untouched
except where listed below** — no separate stylesheet, no rebuilt component
set, no server dependency (fonts and the hero's avatar video are inlined in
the file exactly as they were in the reference, so this page opens directly
from disk with no dev server needed, same as the reference).

## Created

### Stat strip (hero)
Three-stat row (Companies / Leads generated per month / Revenue influenced)
under the hero's trust bullets. Not in the reference hero. Composed from
`--gw-text-h6` + `--gw-text-body-12-med` + existing space tokens.

### Form microcopy + secondary CTA link
`.form-legal` (privacy line) and `.form-alt` ("Talk to an expert" text link)
under the hero form's submit button. The reference form had neither; the
brief specifies both. Tokens only.

### Simplified `.slot--icon` (FEATURES fold)
The reference's four `.split` rows each pair with an elaborate animated CRM
mockup (fake deal names, invoice line items, live UI simulation) in `.slot`.
No equivalent exists for ERP/CSM/lead-management without inventing product
detail the brief never supplied. Kept the exact `.split`/`.split-text`/
`.ticks` markup and CSS (same alternating-row layout, same 4-row order as the
reference — **not** a new tab-switcher, per Utsav's instruction to use the
template literally), and replaced each `.slot`'s content with one large
reused Phosphor icon on the same neutral-50 card. No fabricated specifics,
no new visual language.

### Placeholder-quote styling
`.placeholder-name` (italic, neutral-500) marks the two testimonial
placeholders described below.

## Modified

### Agent grid — names/descriptions swapped, glyphs unchanged
The reference's six agents (Reminders, Reports, Migration, Renewal,
Collections, Invoice) don't match the brief's six (Setup, Follow-up,
Re-engagement, Collections, Renewals, Data). Reused all six glyphs
byte-for-byte (abstract icon-set rects, not semantically tied to a name —
per this fold's own note in `exports/ad-page/built-here.json`) — only
swapped the `<b>`/`<span>` text pairs to the brief's six.

### Comparison table — 3 columns, brief's copy, mobile switcher KEPT
Reference: Off-the-shelf CRM / CRM + implementation partner / Gushwork.
This page: Off-the-shelf software / Software + implementation partner /
Gushwork — same shape, generalized wording. Row label "Changes later" →
"Who manages it" per the brief. Unlike the first pass, the phone
card-switcher (`.cmp-mobile`/`.cmp-switch`) is kept fully populated and
working — the brief's table is the same 2-competitor + Gushwork shape as
the reference's, so nothing needed to be dropped here after all.

### Timeline — 3 steps, not 4
Brief's "Onboarding" specifies exactly 3 steps. Dropped the reference's
step 1 ("Demo call"), kept steps 2–4 verbatim (icons + structure),
renumbered 01–03, retexted to the brief's copy. `.steps` grid overridden
from 4 to 3 columns (one-line CSS change).

### Hero form button
Submit button relabelled from "Pick a time" to the brief's exact primary
CTA text, "Book a 30-minute demo". The B2B/B2C/Mixed qualifier radio and the
"book a call with a real person" expert-avatar video are **kept exactly as
in the reference** — generically applicable to any B2B service, not CRM-
specific, so not a deviation this time.

## Dropped (not one of the brief's 9 numbered sections)

- The "mess → one system" video fold — its video (`ai-crm-flow.mp4`) depicts
  the AI CRM product specifically; no equivalent asset exists for the
  4-service umbrella, and the brief doesn't ask for this fold.
- The FAQ fold and its "ask anything else" `/api/faq` integration — that
  endpoint's system prompt is hardcoded to the AI CRM pitch and its pricing
  ("$800/month"); reusing it here would answer AI-CRM-specific things to an
  AI-services visitor. The brief has no FAQ section either. Its script IIFE
  and the "PREVIEW ONLY ?h=1..5" copy-swap block (the reference's own
  comment says "remove before launch") were both removed from `<script>`;
  everything else in the script (nav-scroll shadow, UTM/fbclid passthrough,
  CTA-scrolls-to-form, phone marquee drag, comparison-table phone switcher,
  agents-row hover-ease) is untouched.
- Both real client testimonials (Stephanie Snyder in the hero, Ryan Cimo in
  the footer CTA) — replaced in place with an explicit, visibly-marked
  placeholder (no fabricated quote, no real photo). The brief flags this
  slot as "pull from an existing SMB customer; do not fabricate a quote,"
  and a real customer's CRM-specific quote shouldn't be re-attributed to a
  different pitch without asking them.
- The customer video wall the brief mentions for Social proof — no such
  assets exist; not fabricated. (This page keeps the reference's structure
  of one testimonial inside the closing CTA fold, rather than the first
  pass's separate Social-proof section — brief doesn't require a standalone
  section, and the template doesn't have one.)

## Worth a decision

**The stat strip and "trusted by 1,000+" count are unconfirmed placeholders,**
live on the page (not blanked out) per the brief's own flag — need real
figures before this ships. Same for both testimonial placeholders.

**`<title>` and meta description are derived, not brief-supplied** — per
gushwork-web's "derived copy is a proposal, not a decision" rule, need
sign-off before this goes anywhere public.

## Tokens

All new CSS (stat strip, form-legal/form-alt, `.slot--icon`,
`.placeholder-name`) uses only existing `--gw-*` custom properties already
in the reference page's own `<style>` block. No new colour, type, radius,
shadow, or spacing value introduced. No token gaps found.

## Resolved

Superseded the fragment-composed first pass (same date) after Utsav asked
for the literal-template approach — see git history for that version if
useful as a reference, but this file is the current state.
