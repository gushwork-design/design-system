# Tools — components

The four patterns the hub tools (email signature creator, employee ID card generator) add to the
library. **Only what is new is here.** The tools use the library's own switch, tab group, dropdown,
field and button, and those keep their own specs.

Every number below is read from `web/internal/tool-shell.css`, where each value is a token and
anything chosen rather than measured is marked `CHOSEN`. There is no Figma node; the shell was built
in code and is shown here so it can be reviewed. How a tool is built from these: `skills/gushwork-tools`.

---

## tool-panel

The floating, collapsible panel a tool keeps its controls in.

| Property | Value |
|---|---|
| Position | fixed, left, 12 in from the top, left and bottom (`--t-inset`) |
| Width | 360 (`--t-panel-w`) |
| Radius | `--gw-radius-20` |
| Shadow | `--gw-shadow-s3` |
| Border | 1px `--t-panel-border` |
| Light fill | white |
| Dark fill | black, hairline `neutral/900` |
| Header | the 32 Gushwork logo on **Brand Blue** (`--gw-color-primary-500`, radius 8; blue since 5 Oct 2026) as a link back to Tools, the tool's name in Vert Grotesk Display 16, collapse button right; padding 12 12 12 16, a hairline beneath |
| Collapse button | 24 square, radius 4, 12 icon |
| Collapsed | the panel folds to its own header, `.panel-mini`: the logo tile (linked to Tools), the tool's name and the reopen button (28, outlined), floating where the panel was, inset 12; padding 12 12 12 16, gap 12, radius 20 (8 + 12), the panel's fill, border and `s3`. Utsav, 5 Oct 2026: the tool keeps its logo and name while the preview has the screen |

**Rules (R44).** The header mark is always the Gushwork logo tile, the same SVG the tools carry in
`.brand-card`, linked back to Tools. Never a per-tool icon or a stand-in, in the tool or in any drawing
of it.

---

## tool-action-pill

One floating pill for a tool's actions, centred over the free canvas, 24 from the bottom.

| Property | Value |
|---|---|
| Pill | radius 12, padding 4, gap 4, shadow `s2`, white (light) / black (dark) |
| Items | 32 tall in a 40 tall pill, radius 8 (concentric: 8 + 4 = 12) |
| View switch | a `neutral/50` track; the current view is white with a `neutral/200` border (`neutral/800` on a black track in dark); black is kept for the primary |
| Download | outlined |
| Primary (Copy HTML) | black fill, white label; white fill in dark (R16) |

## tool-chrome

Appearance (System, Light, Dark) and Help (Send an email, Message on Slack), top-right.

| Property | Value |
|---|---|
| Triggers | 24 square, radius 4, 16 icon |
| Menu | 176 wide, radius 12, padding 4, shadow `s3` |
| Row | 32 tall, radius 8, `body-14-med` |

Source: `web/internal/tool-chrome.js`, **a copy of the hub's menus** in `web/shell.js`. It uses the
same theme storage keys, so the choice follows the person between pages. A copy can drift: when the
hub's menus change, change this one in the same pull request.

## tool-progress

How a tool shows a job that takes time, such as removing a photo background.

| State | Reads |
|---|---|
| Loading | 14 spinner, "Loading…" |
| Working | 14 spinner, a percentage in `body-12-med` |
| Done | check, "Done" |
| Failed | warning icon, "Failed. Try again" |

The progress sits **beside** the control it belongs to, to the right of its switch on the same line (switch first, then the status), never to its left and never beneath it. **The switch holds one place in every state**: the label takes a fixed column, the switch sits at the start of the control column, and the status trails it, so it never moves when the status appears, changes width or goes. This is how the ID card's `.polish-line` is laid out (an 84px label column, the switch first, then the status)
and never as an unlabelled wait.

---

## tool-saved-list

The **right panel of a file-keeping tool** (Save, share, download), a full-height mirror of the
editor panel. First used by Certificate Creator (`web/internal/certificate-creator/`). Simplified
5 Oct 2026 (Utsav): only the file and its download show; everything else sits behind ⋯. **New, pending review.**

| Property | Value |
|---|---|
| Panel | a second `tool-panel` on the right: inset 12, 360 wide, radius 20, full height; the preview centres between the panels; both collapse together |
| Header | "All files" (28, outlined, back arrow) left; a 28 ⋯ button right opening the file menu |
| File menu | the hub menu shape (radius 12, padding 4, 32 rows, `s3`): New certificate, Make a copy, Manage access, a hairline, Delete file in the danger colour. Owner-only rows hide for others |
| File | File name (a field), then one status line in `body-12-reg` `--t-label`: "Saved · edited by Utsav, 22:29 · Everyone can edit" (or Not saved yet, or View only · owned by …); a clash notice when someone saved first (Load theirs, Keep mine) |
| Actions | Save and Copy link, side by side, outlined (36, radius 12) |
| Download | a section: File type (dropdown: PDF A4 vector, JPG, PSD layered), Quality for JPG (Print 300 dpi / Screen 150 dpi), Pages (All · This page · Choose, then page chips), one line on what arrives, and Download (36, black; white in dark, full width) |
| Share dialog / delete | the library modal and confirm dialog, unchanged |

Source: `web/internal/certificate-creator/styles.css`, the "Right panel, simplified" block.

---|---|
| Panel | a second `tool-panel` on the right: inset 12, 360 wide, radius 20, the same border and shadow, full height; the preview and the action pill centre between the two panels; Appearance and Help move left of it; both collapse together |
| Header | "Save and share" in the panel title style (Vert 16 semibold), the same 57 row and hairline as the editor; "New certificate" (28, outlined) right while an item is open |
| This certificate | a card on `--t-field-bg` with a `--t-field-border` hairline, radius 12: name, award, then Created (who, date), Last edited (who, date and time), Status (Saved, Unsaved changes, Not saved yet) |
| Actions | Save (control button 36, radius 12, black; white in dark) and Copy link (outlined), side by side; a line under them says what the link opens |
| Access row | in the certificate card: "Everyone with the tool can edit / view (· n people added)" or "Only people added (n)"; Status reads "View only" for a viewer |
| Owner actions | Manage access (outlined, people icon) and Delete (the neutral outlined shape with a red label), shown only to the owner and hub admins; others see "Owned by …" |
| Share dialog | the library's **modal** (dashboard `overlays.md`), md 480, on the tool tokens: Add people (work email, View / Edit, Add), People with access (owner first, each with View / Edit and remove), General access (Everyone with the tool / Only people added; with a View / Edit for the first). Cancel, then Save access |
| Delete | never on one click: opens the library's **confirm dialog** (sm 400, alertdialog): the title names it ("Delete Ajith's certificate?"), a sentence on the consequence, the lost item listed, Cancel focused by default, then "Delete certificate" (red label and edge, no fill) |
| Saved list | rows: name (`body-14-med`) with a Restricted or View only tag (20 tall pill), award, "Saved by who, date", and "Edited by who, date" when it was edited; padding 4, radius 12; current on the field fill; hover neutral; search past 5 items |

Source: `web/internal/certificate-creator/styles.css`, the "Save and share" block.

---

## tool-files-home

A file-keeping tool's **home**, after Google Docs' home (Utsav, 5 Oct 2026). **New, pending review.**

| Property | Value |
|---|---|
| Top | the 32 blue logo tile linked to Tools, the tool's name (Vert 16 semibold), a 44 tall pill search (field fill, radius full, max 720) centred |
| Template band | full width on the panel fill with hairlines: "Start a new certificate" (`body-16-sem`), then tiles 144 wide: a 144 × 204 live thumbnail (radius 8, hover: heading-colour edge and `s3`), the name (`body-14-med`) and the family (`body-12-reg`). The first tile is Blank (the layout faded, a blue + on a white disc). Future template families join this row |
| Recent | "Recent certificates", then Owned by (anyone / me / not me), sort (Last edited, Oldest first, Name A to Z) and one grid / list toggle (36 icon button) |
| Card | radius 16, the panel fill and border; a 240 tall well with the live file at 0.25; the title; one meta line: shared or lock icon, "3 pages · 2 min ago", and a ⋮ menu (Open, Make a copy, Manage access, Delete) |
| List | a table: a mini live thumbnail, title, page count and award; Owner; Last edited; the ⋮ menu |
| Empty | "No certificates yet" and "Select a blank certificate or choose a template above to get started" |

Source: `web/internal/certificate-creator/` (`FilesHome` and `CardMenu` in app.jsx, "Files home v2" in styles.css).

---

## tool-page-strip

The **page strip** under the sheet when a file has pages, after Canva's (Mobbin). **New, pending review.**

| Property | Value |
|---|---|
| Place | fixed 12 above the bottom, between the two panels, centred, scrolling sideways past the width |
| Page | a 72 × 102 live thumbnail (radius 4, `s2`) in a 2px frame (radius 8): clear, `--t-border-strong` on hover, `--t-heading` when current; the page number in a small panel-coloured tag bottom-left |
| Current page | Duplicate and Delete as 24 icon buttons on its top-right corner; Delete asks first (the confirm dialog, sm) |
| Add | a 76 × 106 dashed tile with a + ; a new page takes the default template and keeps the period and the signatory |
| Order | drag a page onto another to move it |
| Count | "2 / 4 · A4" in `body-12-med` `--t-label` |

Source: `web/internal/certificate-creator/` (the page strip in app.jsx, "Page strip" in styles.css).
