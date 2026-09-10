# Generated hero icon + figure cards for the case-study template — new elements

Built 2026-09-07. Files: `skills/gushwork-web/templates/case-study/case-study.html`,
`assets/case-study/sample/cutting-edge-plasma-cnc-milling.jpg`

## Superseded within this same build

The sector-icon hero (below) was the first answer to "no client photography exists," built
and shipped. The user then asked for real stock photography instead — Unsplash or Envato
Elements (their premium account) or, failing those, a cheap AI image-gen model.

Envato needs a login this session won't perform (entering credentials is off-limits
regardless of who's asking). An AI-gen tool (Weave) is available but spends real credits
and needs per-run cost approval. **Unsplash needed neither** — publicly searchable with no
login, one photo ("A machine that is cutting a piece of metal," free under the Unsplash
License) matched "CNC Equipment" on the first search. That's now the hero's actual `<img>`,
via the plain `.cs-slot` path this template already had before any of this build started.

`.cs-hero-media--icon` stays in the file as the **documented fallback** for a case whose
industry doesn't turn up a decent stock photo — not because it's still in use here.

### `.cs-hero-media--icon` — sector-icon hero, for bulk case studies with no photography

A large duotone Phosphor icon, chosen from the case's own industry text against the
1512 icons already vendored at `assets/icons/`. No image-generation call, no per-client
asset to source — fully deterministic from data already on hand (company name, industry,
the three headline numbers, a logo fetched from the client's own site).

Duotone icons are two `<path>`s sharing one `fill="currentColor"` (one full opacity, one
at 20%), so setting CSS `color` on the wrapper tints both automatically — no per-icon
color logic needed. Keeps the hero slot's own frame (radius 12, 80px "tell" corner) as
the outer silhouette; only the icon inside is chosen per case.

Demonstrated with `gear` for "CNC Equipment." Keyword table for extending this to new
industries (manufacturing/CNC → `gear`/`factory`; healthcare/medical → `stethoscope`/
`heart`; packaging → `package`; consulting/compliance → `shield`/`briefcase`; logistics/
distribution → `warehouse`/`truck`; generic fallback → `buildings`) is in the CSS comment
directly above the rule.

### `.cs-figure--generated` + `.cs-growth-card` — the article's inline result image

Same no-photography case, different slot: the article's existing "Dashboard or result
image" placeholder (720×374) now renders two dashboard-style number+chart cards built
from the case's own stats, instead of requiring a screenshot to source per client.

Chart styling — stroke, gradient fill, grid lines — is `exports/dashboard/sections.md`'s
measured `Graph, Type=Line` verbatim. That doc states the reading is "CURRENT — not
superseded" with no scoping to the dashboard surface, so it's the one dashboard spec
reused here rather than invented fresh for web. Card shell (white, radius-16, shadow-s2,
padding-16) and all type are `gushwork-web`'s own existing tokens.

First card's line is green (`--gw-color-green-500`), second is blue
(`--gw-color-primary-500`) — matches the user's own reference frame exactly.

## Corrected mid-build

The first pass of this work put the growth-chart cards in the **hero**, not the article
figure — a genuine misread of which "in-between image" the user's Figma reference
(`1675:12236`) was for. Caught and moved before it shipped anywhere. The hero instead
got its own, different treatment (the sector icon above), per a separate follow-up
instruction once the mistake was pointed out.

## Worth a decision

**The hero photo is a stock image, not client-supplied.** Free-licensed (Unsplash License —
no attribution legally required, credited here anyway: photo by zhengjialuminum), but it is
a photo of *a* CNC mill, not *Cutting Edge Plasma's own* equipment. Fine for a bulk-generated
placeholder; worth Utsav deciding whether stock photography is acceptable to ship on a real
published case study, or whether it should stay fallback-only until real client photography
exists.

**Both growth curves are illustrative, not plotted time series.** Each SVG `path` draws a
smooth upward curve landing on the case's real headline number — it does not encode real
day-by-day data, because no case study in this system has that granularity available.
Same convention the reference frame itself uses (a stylised curve, not a data table
rendered as SVG). Worth confirming this reads as intentional design language rather than
a claim about the underlying numbers.

**Reused a dashboard-only spec (`Graph, Type=Line`'s three CSS values) on the web
surface**, which `gushwork-web`'s SKILL.md says keeps separate component sets from
dashboard by design (Button, Avatar, Logo are named examples). This is narrower than
that — three measured values, not the `kpi-card` component itself — but it's a real
judgment call worth a second look if the rule is meant to be absolute rather than
per-component.

## Tokens

`--gw-color-primary-25`, `--gw-color-primary-500` (`#0070ff` inline in the SVG `stroke`/
`stop-color` — CSS custom properties aren't readable from static SVG presentation
attributes, so the hex is the token's own documented value, not invented), `--gw-color
-green-500` (`#16a34a`, same reasoning), `--gw-color-white`, `--gw-color-black`,
`--gw-color-neutral-100` (`#e7e8e9`, SVG grid lines), `--gw-color-neutral-600`,
`--gw-radius-12/16`, `--gw-shadow-s2`, `--gw-text-h5`, `--gw-text-body-12-med/reg`,
`--gw-space-8/16/24`. No new colour, type step, radius, shadow, or spacing value.
`--cs-radius-80` is this template's own pre-existing off-token custom property (the tell
corner), not new here.

Not yet committed/pushed — local-only per the session's own instruction to hold
everything until credits are back, so the notice has no working GitHub link yet.
