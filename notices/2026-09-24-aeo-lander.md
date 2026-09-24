# AEO ad lander — build record

Built 24 Sep 2026. `web/internal/staging/aeo-lander/`

**This supersedes an earlier version of this notice.** The first pass copied
`web/internal/staging/ai-crm-lander/`. Utsav then ruled: build from templates, never from
another created page. The page was rebuilt from the template and that first pass is gone.

## Source

```
cp -r skills/gushwork-web/templates/ad-page web/internal/staging/aeo-lander
```

All 23 `{{TOKEN}}`s filled. Fonts resolve by relative path (`../../../../fonts/`), which
lands on the stage root from this depth, so the page needs a server — it does not open from
disk. That is the template's own design and it keeps the file at 281KB rather than the CRM
lander's 2.1MB of inlined fonts.

## Folds dropped

The template ships ten folds; the brief lists seven. Removed, per Utsav's "brief's list
exactly": the four alternating **Features** rows, the four-step **Timeline**, and the
**FAQs** accordion.

Shipped order: `navbar → Hero/Primary (form) → client logos → fold/ other (the problem) →
AI Agents → Comparison Table → Footers/With CTA`.

The problem fold's `.stage` media well was also removed — the template fills it with a
CRM-specific video (`ai-crm-flow.mp4`) that has no AEO equivalent, and the brief specifies
no media there. Its CSS is left in place, unused.

## Body folds rewritten

The ad template tokenises its **campaign layer only**. Its body is literal AI CRM copy, so
every fold below the hero needed rewriting for a different product:

| Fold | From | To |
|---|---|---|
| Problem | "From a dozen messy tools to one AI CRM that wins you more deals" | "You've paid for SEO and got a traffic dashboard and a bill" |
| Agents | 8 CRM agents (Reminders, Reports, Invoice, Collections…) | 6 AEO agents (Research, Content, Authority, Optimization, Conversion, Paid) |
| Comparison | Off-the-shelf CRM · CRM + implementation partner | DIY / SEO tools · SEO or marketing agency, six rows |

**This is the standing cost of the template for any non-CRM product**, and the case for a
product-agnostic ad template that tokenises the body too.

## Testimonials — cleared, reused as-is

Per Utsav, 24 Sep: the quotes come from the ai-crm-lander and stay the same unless he asks
otherwise. Both are already in the template as tokens, and both avatar photos are
**byte-identical** to the lander's (sha1-checked), so each photo stays with its own byline:

| Slot | Who |
|---|---|
| Hero `.quote` | Stephanie Snyder, Manager at Source Equipment |
| Closing CTA `.tcard` | Ryan Cimo, Owner, Fraxtional |

**Consequence worth flagging:** the brief's section 7 named Source Equipment with a
"launch to first qualified lead" figure. The CTA card is the only social-proof slot on the
shipped fold set, and it now carries Ryan Cimo's quote, so that Source Equipment line has no
home. Adding one would mean a fold outside the brief's list. It is dropped, not forgotten —
one fewer unconfirmed placeholder as a side effect.

## Added, then removed at Utsav's instruction

An earlier pass added three things the template does not have: `stat-strip` (a three-figure
hero row), `form-microcopy` (`.form-legal` + `.form-alt`) and `.placeholder-name`, plus two
invented tokens, `{{COMPANY_COUNT}}` and `{{CLIENT_COUNT}}`. **All of it is gone.** The page
now carries no class and no string the template does not have, and the marquee label is back
to the template's own `TRUSTED BY 1000+ CLIENTS WORLDWIDE`, byte-identical.

The reason it got there is worth recording, because the justification I gave was not the
reason. `stat-strip` and `form-microcopy` were registered ad-page components with a review
pass, so they *looked* like library elements — but `built-here.json` records their method as
"rendered page, computed styles" against `ai-crm-lander/index.html`. Neither was derived from
Figma. Both were invented once for the AI-services lander because that brief asked for a stat
row, then propagated by citation: notice → registry → review pass → this brief's
"1,000+ Companies — or use a services-specific number" → this page.

The rebuild was supposed to discard everything the landers contributed. It did `cp -r` the
template, then reconstructed the rest of the page from the previous build rather than from
the template and the brief. **R26 was satisfied on paper and broken in substance** — the
files came from the template, the decisions came from a lander.

Utsav has since removed `stat-strip`, `slot-icon` and `form-microcopy` from
`exports/ad-page/component-registry.json`, from `built-here.json`, and from the generated
library, so the skill can no longer offer them. `ai-agents` and `comparison-table` remain and
are the same species — `built-here`, measured off a rendered page — and their reviews expired
when `built-here.json` changed.

**A review pass records that someone looked at a thing, not that it came from the system.**
Do not cite `reviewed: passed` as provenance.

`check-drift.sh`: **built at v1.47.0, all 16 components current.**
`check-placeholders.sh`: **no placeholders left.**

## Layout pass only — two assets still outstanding

Per Utsav's rule that layout comes before animations and images:

- **`expert.mp4`** — the talking-head avatar in the form. The template keeps it a real file
  rather than a data URI (inlining cost 650KB). Not in this folder, so it 404s; the inlined
  poster frame renders in its place, which is why the form still looks right.
- **`og.png`** — not yet rendered. `og-source.html` ships with the template; render it with
  this page's own H1 once the headline is final. `og:url` and `og:image` are absolute and
  point at the staging path, so **both need updating when the page moves**.

The favicon set came with the template and is byte-identical to `assets/ads/`.

## Copy notes

- **The comparison table is the one adapted section** — the brief flags it as built fresh
  rather than lifted from the reference file.
- Its heading, **"Built for leads, not dashboards"**, is adapted, not quoted. The reference
  supports the framing but does not contain the line.
- The agents fold's H2 is adapted; its subhead is the brief's verbatim line.
- The problem fold's H2 joins the reference's two sentences with "and" — the no-full-stops
  heading rule forbids the original's internal full stop.
- The hero form still asks **"Whom do you sell to?" (B2B / Purely B2C / Mixed)**, which came
  with the template. Generic enough for AEO, but not specified by the brief.
- The submit stays **"Pick a time"** (`{{FORM_CTA}}`), not the brief's "Book a 30-minute
  demo", which is the form's heading. `voice.md` names "Pick a time" as an action-specific
  form CTA that must not be normalised to the primary.
- Title and meta description are **derived, not supplied**, and per the 22 Sep ruling are a
  proposal for whoever owns the page.

## Verified

1440: no horizontal overflow, content column capped and centred. 375: no overflow, stats
wrap, comparison switches to its tabbed pair list. Only network 404 is `expert.mp4`; all
three font files load.

**Known caveat:** the chosen H1 wraps to **six lines at 375px**. The template README notes
the hero H1 is designed to wrap to three. The brief's shorter alternate —
"Show up in AI search, not just Google" — is the fix if that matters more than the longer
line's specificity.

## Gaps found while building

- ~~The skill file doesn't document the ad-page template.~~ **Wrong — retracted.** The repo's
  `SKILL.md` names it in four places, including "Before you reach for the fold set at all,
  check `templates/ad-page/`". This session was running a stale **v1.47.0 plugin cache** cut
  before commit `fd458cb`, which added template and docs together. Check the plugin version
  before reporting a gap in the system.
- The site's Tools & Templates page listed only three templates; a card for the ad page was
  added to `web/internal/tools.html`.
- `scripts/_search_index.py` points at a non-existent `internal/mini-tools.html`, so the
  Tools & Templates page has never been in the site search index — no template name is
  findable in ⌘K.
