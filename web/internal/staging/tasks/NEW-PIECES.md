# New pieces on the task board

These now live in the library: CSS in `exports/dashboard/css/57-tasks.css`, specs in `exports/dashboard/tasks.md`, entries in `exports/dashboard/registry-parts/tasks.json` (22 keys, pending review) and drawings in `web/previews/dashboard/<key>.frag`. The class names below map to registry keys as listed in `tasks.md`. Each block is headed `NEW ... Pending library review` with its markup shape above it. Wireframe references are sections of `task-board-wireframes/index.html`; Mobbin references are the ones listed on that page (Asana board, Linear board, Linear inbox, Linear task, Qatalog task, Todoist upcoming, Attio grouped list).

| Name | What it is for | Where in the page | Reference |
|---|---|---|---|
| `gd-av`, `gd-av-stack` | Assignee avatar: people are circles, agents are rounded squares (Bruce ink, Alfred outlined), ghost for unassigned; button form filters by assignee | Top bar stack, cards, list rows, timeline rows, pickers, drawer feed | Wireframes 1, 10 |
| `gd-prio` | Priority bars glyph (3 bars, filled by level; Urgent is a solid Badge) | Cards, list, pickers, drawer | Wireframes 1, 6, 7; Linear |
| `gd-run` | Agent run-status chip (Queued, Working, Needs you, Ready for review, Failed with Retry); composes the status dot and Badge tones | Cards, list, drawer header | Wireframe 10 |
| `gd-lanes`, `gd-lane`, `gd-taskcard` | Board lanes that share the width, flat task card with title button, meta row, quote, accept and dismiss, hover menu; Suggested lane is dashed and tinted | Board view | Wireframe 1; Linear, Asana boards |
| `gd-tasklist` | Grouped list with check, title, priority, source, due, assignee; collapsible groups; phone second line | List view | Wireframe 2; Attio, Todoist |
| `gd-props`, `gd-prop` | Property rows with quiet button values | Drawer, inbox pane | Wireframe 5; Linear, Qatalog task |
| `gd-picker` | List popover rows (radio rows, keys, descriptions, notes, a suggestion block) for priority, status, assignee | Property pickers, bar "+" menu | Wireframes 7, 10 |
| `gd-datepick` | Start and due fields, typed words, quick picks, month calendar with range band | Start and Due properties | Wireframe 7 |
| `gd-filterpop` | Two-pane filter popover (fields left, any-of values right) | Filter button | Wireframe 6 |
| `gd-gantt` | Timeline: bars, diamonds, today line, weekend shading, drag and resize, unscheduled tray | Timeline view | Wireframe 3; Linear, Asana |
| `gd-inbox` | Two-pane triage list and pane with J, K, A, D | Inbox view | Wireframe 4; Linear inbox |
| `gd-quote` | Quoted source message with label and caption | Drawer, inbox pane | Wireframes 4, 5 |
| `gd-launch` | Floating assistant launcher with a status button that opens settings | Bottom right of every view | Wireframe 1 |
| `gd-bottomnav` | Phone bottom bar | Phone only | Wireframe 11 |
| `gd-fab` | Floating add button above the bottom bar | Phone Board and List | Wireframe 11 |
| `gd-ask` | Assistant chat panel (right panel, full-screen sheet on phone) with thread, messages, mini task rows with an at-tag action | Opened by the launcher, the command key or a card menu | Wireframes 8, 9, 11 |
| `gd-tagchip` | Tag chip for tasks, people, channels and groups | Composer, sent messages, plan card | Wireframe 8 |
| `gd-composer` | Assistant composer: chips row, textarea, tag, command and context tools, send | Inside `gd-ask` | Wireframes 8, 9 |
| `gd-mention` | Tag and command picker above the composer (tabs Tasks, People, Channels, tag the view, tag the selected cards) | Inside `gd-ask` | Wireframes 8, 9 |
| `gd-plan`, `gd-donecard` | Plan card (ticked steps, whose tasks each touches, drafts that wait for a separate send) and the result card with Undo | Inside `gd-ask` | Wireframe 9 |
| `gd-views__x` | Remove mark beside a user-made saved view | Saved views row | Extension of the library saved views |

## Library parts used as they are

Segmented control (view switcher, zoom, direction), saved views, filter chip, popover, select, toggle, checkbox, drawer (task), modal (new task, not-switched-on notice, Bruce settings), confirm dialog (delete), toast with Undo, menu (card actions), activity timeline (drawer feed), banner, empty state (first use, no results, error, no access), skeleton, status dot, Badge, tabs pill (phone lane chips), shortcut key, tooltip, app shell and content panel.

## Page glue (app.css, not pieces)

The light top bar, the sticky strip under it, the editable drawer title, the read-only Bruce settings rows and the phone reflow of those. No rail and no phone topbar: a one-row rail would be chrome, and the topbar exists only to open the rail.

## Token and library gaps found

- The 20 px display title in the bar has no display token (`--gw-text-h*` start at 22); written as a literal with a comment, as the rail brand does.
- The stock library has no circle avatar: `gd-avatar` is a rounded square at 20 percent, so people-as-circles is new.
- `badge` has no entry in `component-registry.json`, so a stamp that lists it is reported as removed; the stamp omits it.
- Fixed sizes with no token: avatar sizes (20, 24, 32), the 3 px bar width in `gd-prio` (1.5 times the 2 px space token), 16 px glyphs, the 280 px timeline label column, the 480 px chat panel, the 160 px filter field column, the 360 px inbox list column.
