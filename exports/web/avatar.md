# Web Avatar — Client Avatars

## Which avatar?

| Surface | Component | Node | What it is |
|---|---|---|---|
| **Marketing web** | `client/avatar` — this file | `1619:722` | A grayscale squircle holding a **real photo** of a client or author. |
| Dashboard / product | `Avatar` — see `exports/dashboard/avatar.md` | `1658:24023` | A generated character representing an **app user**. |

Never put a client photo in dashboard chrome, and never put the generated character on
the website.

**Three names for one thing.** The Figma group frame is named `clients` (`1649:22470`),
its on-canvas title reads **"Client Avatars"**, and the component set is
`client/avatar`. The dashboard rule refers to it as "Client Avatars", which matches only
the display title. The resolvable name is **`client/avatar`**.

Figma: group `clients` (`1649:22470`), set `1619:722`.

---

## Variant properties — 12 variants (3 × 4), complete

| Property | Values |
|---|---|
| `size` | `small`, `medium`, `large` |
| `client` | `Fraxtional`, `Source Equipment`, `Midwest Power Products`, `other` |

**`size` is lowercase here** while every other component in the file uses `Size`. Same
concept, different key. Copy it as written.

## Appearance — from design context (`1619:711`, `size=large, client=Fraxtional`)

**The rule and the component disagree about the single thing the rule calls "the key rule".**

| Part | Measured value |
|---|---|
| box | **64 × 48** at `large` · 56 × 40 `medium` · 48 × 32 `small` — all **4:3 landscape, never square** |
| radius | **100px** — clamps to half the height, so it renders as a horizontal **stadium/pill** |
| placeholder fill | `--gw-color-neutral-200` |
| photo | 72 × 48 inside the 64 × 48 clip, centre-anchored, `object-position: bottom` |
| transform | the photo carries `rotate(180deg)` + `scaleY(-1)` — a net horizontal mirror |

### The shape conflict — read this before drawing one

The rule (`2003:10788`) says: *"the shape is the key rule — a squircle (rounded-corner
square, not a full circle)."* The component is a **4:3 landscape box with a 100px radius**,
which is neither a squircle nor a square. It is a pill.

**Draw what the component does — a horizontal stadium at 4:3.** A rounded square is wrong
even though the rule asks for one. This is an open finding against the file: either the rule
text is stale or the component drifted. Do not silently pick the rule.

### Grayscale — weaker than previously recorded

An earlier pass here asserted grayscale was a hard requirement, inferred from the canvas
render. **The component carries no filter.** If the built-in client photos read as
desaturated, that is baked into the image assets, not applied by the component. So:
match the surrounding folds, and don't add a `filter: grayscale()` on the assumption the
component has one.

## Rules

**Where to use:** testimonial cards and folds, author bylines, case-study credits — any
client or author avatar.

**Shape is the key rule: a squircle** — a rounded-corner square, **not a full circle**.
Use it for every client/author avatar so the treatment stays uniform across the system.

**Pick `size` by surface:** `small` for inline bylines, `large` for spotlight
testimonials, `medium` between.

**`client`** ships with widely-used clients built in — `Fraxtional`,
`Source Equipment`, `Midwest Power Products`. Use **`other`** for anyone not already in
the set; it is an editable slot that accommodates a new avatar or variant.

**Empty / fallback:** when there is no photo, render the plain grey squircle placeholder.

## Grayscale

Photos render **desaturated black-and-white**. This is visually true of all nine client
photos in the component and of the placeholder.

**It is not stated in the rule text** (`2003:10788`), which documents shape, sizes, the
client list, and the grey empty-state placeholder — but never that photos are
desaturated. The dashboard's cross-reference to "the grayscale squircle" depends on a
treatment the owning component doesn't document.

**Treat grayscale as a requirement.** If you drop a photo into the `other` slot, desaturate
it. A full-colour client photo is off-system even though no written rule forbids it. This
is an open finding against the Figma file.

## Never

- A circular client avatar. The squircle is the rule.
- A colour client photo.
- A generated character avatar on a marketing page.
- A fabricated client logo or photo. Use the built-in clients, or `other` with a supplied
  asset.

## Naming collision to be aware of

The `ai-agents` description (`1584:2046`) calls `agent-icon` "the **avatar** for a
Gushwork AI agent". Two unrelated components are described as avatars. `agent-icon`
represents an AI agent, not a person — see `atoms.md`.
