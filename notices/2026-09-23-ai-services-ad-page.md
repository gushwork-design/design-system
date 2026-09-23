# AI services ad landing page (Meta) — new elements and deviations

Built 2026-09-23. Files: `web/internal/staging/ai-services-lander/index.html`,
`web/internal/staging/ai-services-lander/favicon.svg`, `web/internal/staging/ai-services-lander/og.png`,
`web/internal/staging/ai-services-lander/assets/*`

Page composes the ad-page fold set (`exports/ad-page/folds.json`) per `skills/gushwork-web`'s
"Ad landing pages" section, generalizing the ai-crm lander to an "AI services" umbrella per
`gushwork-ai-services-ad-page-copy.md`. Type=Ads throughout (logo + Blue "Book a Demo" navbar,
copyright-only footer). Static HTML, not React — `web/package.json` declares this repo has "no
build step and no dependencies," matching every other page already in `web/internal/staging/`,
so `foundation/output-targets.md`'s "read the repo before choosing" pointed at static HTML, not
Next.js components.

## Created

### "What's happening" tab switcher (4 tabs: CRM / ERP-invoicing / CSM / Lead management)
The ad-page set's nearest fold is `Folds / Features` (4 alternating text/image rows), which has
no tab affordance. The copy brief explicitly asked for "the same tabbed component as the AI CRM
page," and no tab component exists in `fold-elements.md`, so this is a plain CSS/JS tab bar +
panel switcher, built from existing tokens (button/pill radius, body type scale, primary-500
active state). No new visual language — same shape as the eyebrow/pill and comparison-table
header treatments elsewhere on the page.

### Agent grid, 6 cards
`exports/ad-page/built-here.json` documents the AI CRM lander's own `AI Agents` fold as 8 cards
at an off-ramp `700 18px/25.2px` display style. This brief only supplies 6 agents (Setup,
Follow-up, Re-engagement, Collections, Renewals, Data), so the card count differs by content,
and the title type uses the on-token `--gw-text-h7` (500 22px/1.4) rather than reproducing the
off-ramp 18px value — see "Worth a decision" below.

### Comparison table content
Shape matches `Folds / Comparison Table` (4 columns), but `built-here.json` flags the shipped
AI CRM page's own cell values as off-token (`#efefef` fill, 700 16px Inter, 1px/6px padding —
none on any ramp). This build uses on-token values throughout instead (`--gw-color-neutral-25`,
`--gw-text-body-14-sem`, `--gw-space-*` padding) rather than reproducing the off-ramp original.

### Onboarding "3 steps" row, dark theme
Closest documented equivalent is `Folds / Timeline / CRM Setup` (week-based, dark theme). This
copy is a 3-step process rather than weeks, so the row (numbered circles + connecting line) was
built fresh from tokens rather than instanced, keeping the same dark-surface convention.

### Testimonial placeholder card
Not a build so much as a deliberate non-build: the brief flags the real founder quote + number
as `[placeholder — pull from an existing SMB customer]`. Rather than inventing a quote (or,
worse, attributing one to a real client photo/name already in this repo's asset set), the slot
renders as an explicit dashed-border placeholder saying so. Same reasoning applied to the
customer-video wall — omitted, not stood in with generic stock footage.

## Worth a decision

**Primary CTA casing.** Built to `skills/gushwork-web`'s ruled ad-page exception — the primary
CTA reads "Book a Demo" (capitalised) on the navbar and final-CTA fold. The brief's own copy doc
(`gushwork-ai-services-ad-page-copy.md`) states its voice notes as "CTA copy stays `Book a demo`"
(sentence case) for this specific page. Built to the skill ruling since it's the more recent,
page-type-specific standing rule; the brief's own form CTAs ("Book a 30-minute demo", "Talk to
an expert") are left verbatim per the skill's "form CTAs stay action-specific" clause either way.
Worth a call on whether this page should be a deliberate exception to the exception.

**Placeholder proof numbers shipped as real-looking copy.** Hero stat strip ("1,000+ Companies",
"8,000+ Leads generated/mo", "$10M+ Revenue influenced") and the trust-marquee label ("Trusted by
1,000+ clients worldwide") are the brief's own placeholder figures for the AI-services line
specifically — not fabricated by this build, but not confirmed either. A small caption under the
stat strip says so; worth deciding whether that's enough hedge for a page that may go live as a
real ad.

## Tokens

`--gw-color-primary-25/50/100/500/600`, `--gw-color-neutral-25/50/100/200/400/500/600/700/900`,
`--gw-color-black`, `--gw-color-white`, `--gw-text-h2/h4/h5/h6/h7`, `--gw-text-body-12-med/reg/sem`,
`--gw-text-body-14-med/reg/sem`, `--gw-text-body-16-med/reg`, `--gw-text-body-18-reg`,
`--gw-text-button-14/16`, `--gw-radius-10/12/16/20/full`, `--gw-shadow-card`, `--gw-shadow-s3/s4`,
`--gw-space-*` (4 through 160), `--gw-content-width`, `--gw-motion-fast`. The agent-card hover
asymmetric radius (`24px 24px 60px 24px`, README's documented "card hover tell") is a literal
value, not a token — same standing as the 20px fold-stack radius, since neither is defined as a
`--gw-*` custom property in `foundation/tokens.css`. No new colour, type step, radius, shadow or
spacing value was introduced anywhere on the page.
