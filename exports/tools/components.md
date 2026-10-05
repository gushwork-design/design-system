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
| Header | the 32 Gushwork logo (radius 8; a 1px `neutral/800` ring in dark) as a link back to Tools, the tool's name in Vert Grotesk Display 16, collapse button right; padding 12 12 12 16, a hairline beneath |
| Collapse button | 24 square, radius 4, 12 icon |
| Reopen button | 36 square, radius 12, 16 icon; shown only when the panel is collapsed |

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

A **Save and share panel on the right**, a full-height mirror of the editor panel (Utsav, 5 Oct
2026). First used by the award certificate generator (`web/internal/award-certificate/`), where HR's
saved certificates are shared through `/api/certificates`. **New, pending review.**

| Property | Value |
|---|---|
| Panel | a second `tool-panel` on the right: inset 12, 360 wide, radius 20, the same border and shadow, full height; the preview and the action pill centre between the two panels; Appearance and Help move left of it; both collapse together |
| Header | "Save and share" in the panel title style (Vert 16 semibold), the same 57 row and hairline as the editor; "New certificate" (28, outlined) right while an item is open |
| This certificate | a card on `--t-field-bg` with a `--t-field-border` hairline, radius 12: name, award, then Created (who, date), Last edited (who, date and time), Status (Saved, Unsaved changes, Not saved yet) |
| Actions | Save (control button 36, radius 12, black; white in dark) and Copy link (outlined), side by side; a line under them says what the link opens |
| Delete | "Delete this certificate" (danger text, 28), and a trash icon on each row on hover. Neither deletes: each opens a confirm |
| Confirm | an inline block on `--t-danger-bg` with a `--t-danger` hairline, radius 12 (8 in a row): the question in words ("Delete Ajith's certificate? It is removed for everyone…"), then Cancel (outlined) and Delete (danger), 32 tall |
| Saved list | rows: name (`body-14-med`), award, "Saved by who, date", and "Edited by who, date" when it was edited; padding 4, radius 12; current on the field fill; hover neutral; search past 5 items |

Source: `web/internal/award-certificate/styles.css`, the "Save and share" block.
