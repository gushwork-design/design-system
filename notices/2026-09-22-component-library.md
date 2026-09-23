# Component library and the review-pass gate — new elements and deviations

Built 22 September 2026. Files:

- `scripts/_component_library.py` — parser and renderer
- `scripts/component-library.sh` — runner, with `--check`
- `scripts/_review.py`, `scripts/review-pass.sh` — the pass record and the gate
- `preview/component-library.html` — generated output, published to `/admin/component-library`
- `scripts/publish-sheets.sh`, `web/shell.js`, `scripts/hooks/pre-push` — wiring
- `exports/shared/component-registry.json` — documented the new `foundations` block

## Created

Nothing in the UI kit. Everything below is documentation chrome on one internal admin page,
not a component any build should instance. None of it belongs in `skills/`.

### State chip (`.cl-chip`)
Two chips per section: where a value came from, and whether it has been passed. Badge was the
obvious candidate and was rejected — Badge's variants are status semantics (success, warning,
danger), and provenance is not a status. Using it would have made `transcribed` read as a
warning when it is a fact about sourcing. Tints come from the existing ramps at their
documented steps.

### Swatch card (`.cl-sw`)
Colour tile, token name, resolved hex, and the computed contrast of that colour used as text
on white and on black. The contrast figures are computed at build time from the token values,
not typed. They reproduce R9 independently: neutral-700 on black lands at 2.5:1 and
neutral-600 at 3.9:1, both under the 4.5:1 floor, which is the ruling's own reasoning arrived
at from the tokens alone.

R9 quotes neutral-700 as ~2.3:1; this page computes 2.5:1. The difference is the ground —
the ruling appears to have measured against pure `#000`, this measures against
`--gw-color-black` (`#0d0d0d`), which is the token a page actually paints. Both fail; the
conclusion is unchanged.

### Specimen row (`.cl-t`)
Each type token rendered as live text at its own `font` shorthand and tracking. Specimens wrap
rather than truncate, deliberately: line-height is half of what a type token asserts and it
cannot be seen on one line.

### Review queue (`.cl-queue`)
The delta, not the inventory — only what has not been passed, each row carrying the command
that passes it.

## Modified

None. No measured component was changed, overridden or re-specified.

## Worth a decision

**1. This page duplicates four existing surfaces, and only replaces them if you retire them.**
`web/style-guide.html`, `preview/catalogue.html`, `preview/component-sheet.html` and
`preview/review-sheet.html` all still exist and still say overlapping things. The ruling to
absorb all four was given; the deletions were not made, because `/style-guide` is public and
in the Getting Started nav, and folding it into an admin page removes it for everyone outside
the allowlist. That trade is yours to make, not mine.

**2. The gate is a WARN, not a block.** `scripts/hooks/pre-push` reports unreviewed and
expired items and never fails the push. This matches `check-fonts.sh` and
`check-placeholders.sh`, and it is the only sane setting while 97 of 97 items are unpassed —
a block today would train everyone to use `--no-verify`, which would also disable the
main-branch guard sharing that hook.

**3. Provenance is derived, review state is stored.** Whether a value is measured,
transcribed or ruled is read out of what `tokens.css` says about itself at build time, so it
cannot be set wrong by hand. Only the review pass is written down. The two were one field on
the old sheet, which is why the sheet could not tell "we have not measured this" from "you
have not looked at this".

## Tokens

No new colour, type style, radius, shadow or spacing value was introduced. The page's CSS was
checked mechanically for raw hex and for colour properties bypassing a token: zero of each.
Surface colours come from `web/shell.css`'s `--s-*` layer, which is itself token-only.

Two values on the page are not tokens and are declared as such:

- the monospace stack (`ui-monospace, "SF Mono", Menlo, monospace`) for token names and
  values. The system has no mono face; this is the same stack `web/internal/tools.html`,
  `catalogue.html` and the changelog sheet already use. **A mono token is a real gap** — four
  surfaces now hardcode the same stack.
- swatch, tile and specimen dimensions (64px chip height, 72px radius tile, 132px grid
  minimum). Layout geometry for a documentation page, chosen here, with no documented figure
  to defer to.

## Restructured the same day — three tiers

Utsav's call: the library is several libraries, one per use case. Implemented as three tiers
and fifteen views, one library per view, switched in-page with a two-level hash
(`#parts/web`, `#foundations/f-color`).

- **Foundations** — one, shared. Built.
- **Parts** — components, **by surface**. Six shelves: web 28, dashboard 29, slides 22,
  lead-magnet 4, shared 3, ad creatives 0. This is the axis the registries and
  `check-drift.sh` already use, so it does not move.
- **Recipes** — assemblies, **by deliverable**. Seven shelves, none derived yet.

**Ad pages and brand pages are two recipes over one parts bin, not two libraries.** They draw
on the same 28 web components; the only difference is `page-build.Type`, one page-level
property that cascades to the navbar, footer and primary button. Two bins would mean 28
components duplicated, two review states each, for one boolean — and the web skill's rule
("never set button colours per-button to achieve this") depends on that cascade being the
single mechanism. Ruled by Utsav.

### Also created

- **Library nav (`.cl-nav`)** — grouped pills, tier as the grouping. A tier is a category of
  libraries, never a destination: there is no "Parts" page, only Parts → Web.
- **Parts shelf** — the catalogue's job, absorbed. Component, version, when the spec last
  moved, whether that move is breaking, the doc, and the review state. Five columns, all five
  read from the registry.
- **Recipe shelf (`.cl-pin`)** — states the parts surface it draws on and the page-level
  decision it pins. Marked `not derived`, with the reason in place of content: writing the
  fold order by hand here would make the page the fifth place it is written down.

### Worth a decision (added)

**4. Tools are not in the library.** The employee ID card and email signature generators are
finished products, not parts. They stay at `/internal/tools`; mixing products into a parts
library makes both harder to read.

**5. Ad creatives is an empty shelf, deliberately.** The Figma file exists
(`O6g05YAT980r85VaDQha4h`) but nothing has been measured out of it. An absent section would
read as "we do not build ads", which is wrong — the shelf is there saying the gap out loud.

## Rebuilt as a site — same day, third revision

Utsav's direction, after the shadcn/ui reference: **rail · centre · on-this-page**, one URL
per thing. The pill-nav single page and the standalone ad-page sheet are both retired;
`/admin/component-library` and `/admin/ad-page-sheet` redirect into the tree.

`bash scripts/library-site.sh` → **122 pages** under `preview/library/`, staged to `/library`.

- `/library` — banner, stats, a card per library
- `/library/foundations/<group>` — 11
- `/library/parts/<surface>` + `/<component>` — 95 across 7 surfaces
- `/library/recipes/<recipe>` — 7
- `/library/review` — the queue, admin only

### Created

- **`scripts/_md.py`** — a small Markdown renderer. The repo is dependency-free and the
  publish path has no install step, so a package for nine spec docs would put a dependency
  in front of a build that has none. Covers exactly what `exports/` uses; anything else
  renders as literal text, which is visible rather than silently swallowed. Verified across
  all 27 docs: balanced tags on every one.
- **`scripts/_library_site.py`** — the site builder. `_component_library.py` is now the
  primitives module it imports; its own `main()` is retired with a pointer.
- **Its own chrome** — topbar, no left rail, because the left rail is the library's
  inventory. Shares the site's two localStorage theme keys so a dark choice carries across.

### Modified

- **`web/api/_access.js`** — `/library` internal, `/library/review` admin, plus
  `withFallbacks()`. **That second part is a real bug fix**: a stored Edge Config ruleset
  *replaces* the compiled routes, so a gated prefix shipped in code after the store was
  written had no rule, `ruleFor()` returned null, `decide()` answered `allow`, and the page
  was public despite the matcher — silently. Latent for `/internal`; live the moment
  `/library/review` existed. Tested against a stale ruleset: `forbid`.
- **`web/middleware.js`** — matcher takes `/library` and `/library/:path*` separately; a
  one-segment path does not match the `:path*` form, and without both the index of the whole
  library is the one page in it that is public.
- **`exports/ad-page/`** — new surface. `folds.json` is the measurement, `component-registry.json`
  makes it first-class for `check-drift.sh` and `review-pass.sh`. 106 reviewable items now, was 97.

### Three bugs I put in and took out

Worth recording because they share one cause — reusing `_component_library`'s renderers
without the stylesheet and the surface layer they assume:

1. **Chips rendered unstyled.** `CL.chip()` emits `cl-chip`; this site's CSS defines `.chip`.
   No visual difference between `measured` and `not reviewed` — the one thing they exist for.
2. **Swatches rendered as raw text.** `.cl-ramp` / `.cl-sw` live in `_component_library.CSS`,
   which the new pages did not include. 92 colour tokens came out as a wall of hex strings.
3. **`--s-*` resolved to nothing.** The surface layer is defined in `shell.css`, which these
   pages do not load, having their own chrome. White page, invisible cards, a dark-mode note
   on a light body. Fixed by linking `shell.css` for the token layer only — its chrome rules
   are all gated on `.gw-shell-ready` or on elements these pages do not have.

A fourth, same shape as one from the first revision: a page with no rail put `<main>` in the
240px rail track, squeezing the review sheet to a ribbon. `grid-column:2`.

## Worth a decision (added)

**6. `/admin/review-sheet` is NOT redirected.** It still renders every variant, which
`/library/review` does not reproduce — that is a queue, not a variant renderer. Retiring it
means either porting the variant rendering or accepting the loss; both are yours to call.

**7. The banner lattice is a slides token on a non-slides surface.** Rebuilt in CSS from
`--gw-slide-grid-pitch` / `-line` / `-opacity`, which `tokens.css` documents as the way to
rebuild that ground. It is still a cross-surface borrow, declared rather than done quietly.

## Ad-page appearance measured — same day

Utsav confirmed `ready-for-claude` (`43:34411`) IS the ad-page library, not a subset, and
asked for appearance next. Measured with the Figma **variable API**, not by parsing generated
code — a binding says what a node is *attached* to, so it answers "is this on-system?" rather
than "does it happen to look right?".

`exports/ad-page/variables.json` — 9 components, 181 bindings, 54 distinct variables.

**178 of 181 map to a `--gw-*` token and agree with `tokens.css`. None disagree.** The three
exceptions are all the same thing: the bare legacy `White` variable, bound on `hero-primary`,
`hero-alternate` and `footer-with-cta`. `tokens.css` gap 9 already says to prefer
`Colors/Neutral/white`. That is the only off-system binding in the whole ad-page set.

The check is **re-run on every build** rather than recorded once, so a token that moves in
`tokens.css` but not in Figma — or the reverse — surfaces on the component page without
anyone remembering to look. The counts on the recipe page are computed, not typed.

These folds are chipped `measured` now rather than `structure measured`, and three claims
that said appearance was unmeasured were corrected: the per-component note, the recipe
finding, and `folds.json`'s own header. What is still *not* measured is the layout that
arranges the tokens, which is why a fold is shown as its Figma render rather than rebuilt —
and the note now says exactly that rather than overclaiming in either direction.

### Still open

**The two lander-only folds are not measured.** `fold/AI Agents` and `fold/Comparison Table`
are built in `ai-crm-lander` and drawn nowhere in GW-Ads-Library. Their source of truth is the
shipped page, which makes them **built-here** rather than measured-from-Figma — a different
provenance, and the one the 15 Sep ruling is actually about. Measuring them means reading
computed styles off the rendered page, and they should carry a `built-here` chip rather than
`measured`, because nothing in Figma backs them.
