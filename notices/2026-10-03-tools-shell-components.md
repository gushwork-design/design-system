# Tools shell — new elements for review

Registered 3 Oct 2026 under a new **Tools** surface (`exports/tools/`), drawn at `web/previews/tools/`,
specified in `exports/tools/components.md`. They come from the redesign of the email signature creator
and the employee ID card generator (1–3 Oct 2026); the decisions are in `skills/gushwork-tools/decisions.md`.
R43 is the ruling that says new pieces are registered for review.

## Created

| Element | What it is |
|---|---|
| `tool-panel` | The floating, collapsible panel a tool keeps its controls in, with its collapse icon and the reopen button. 360 wide, 12 inset, radius/20, shadow s3 |
| `tool-action-pill` | One floating pill of a tool's actions: view switch, Download outlined, one strong primary. Radius 12 around 32-high radius-8 items |
| `tool-chrome` | Appearance and Help menus, top-right. `web/internal/tool-chrome.js`, a **copy** of the hub's |
| `tool-progress` | A long job's progress beside the control it belongs to: spinner, percentage, Done, Failed |

Not registered, on purpose: the switch, tab group, dropdown, field and button are the library's own
controls and keep their own specs.

## Worth a decision

- **Are the panel and the pill patterns the library wants?** Both are new. The panel was the one
  pattern Utsav asked to keep from the old tools; the pill follows a Framer canvas toolbar reference.
  Approve to make them the pattern for every tool, or send them back for rework.
- **Field height, 36 or 40.** The tools' fields are 36; the library's text field is 40. Left open.
- **`tool-chrome` is a copy.** It can drift from `shell.js`. Keep the copy and change both together,
  or move the menus to one shared file.
- **Plus Jakarta Sans** sits in the signature preview (an artefact, not chrome). Not registered; an
  open call for the owner.
- **Focus rings.** Off inside tools (ruled 2 Oct), on elsewhere (R41). Confirm the split stands.

## Tokens

Every value is a `--gw-*` token. The preview drawings use the tokens' literal hexes because the
drawer renders fragments without the page's variables; `check-previews.sh` passes.
