# Decisions: the hub tools redesign

The email signature creator and the employee ID card generator were redesigned into one shell on
1–3 Oct 2026. This is the record: what was decided, by whom, and why, so a new tool starts from it.
**Utsav** = ruled by the owner. **Chosen** = a judgement call made while building, flagged in
`web/internal/tool-shell.css` and open to change. **Measured** = read off the library or the hub.

## Direction (Utsav)

1. **Both tools and the Tools index, in place.** Full-bleed canvas, hub-styled, replacing the live
   tools at their own URLs, not a v2 beside them.
2. **Keep the floating side panel.** It was the one pattern he liked from the old tools and asked to
   keep. Inset 12 from the edges (his number), collapsible.
3. **No white container box** around the email preview; the artefact sits straight on the canvas.
4. **Black for the elevated panel in dark**, like the hub's own dark panel (neutral/900 hairline,
   neutral/100 text), not a grey one.
5. **Dark login gate: grid at 30% opacity** (the sign-in screen the tools sit behind).
6. **Use the hub's own patterns, not near-copies.** He asked for placement of Appearance and Help
   exactly as on the hub, then, after seeing a second round of drift, for an audit of the whole
   chrome against the library and the hub. Dropdowns and toggles "should be similar, even if not
   the same".

## Controls (Utsav, then measured)

7. **One switch, not two toggles.** The two-tab Yes / No was removed for a switch; he asked "why 2
   toggles?" Then the switch was too big: the library's **X-Small 36 x 20** is the dense-row size.
   **On is Neutral/900, never blue** (measured); dark inverts to a white track (R16, chosen, the
   library draws no dark toggle).
8. **Dropdowns open on click**, with the hub's border and check. The hover-open version was a drift.
9. **The check is a plain white icon**, not a coloured one on a fill ("just a regular white icon").
10. **No focus rings anywhere in the tools** ("focus state is not needed anywhere", then "keep it
    subtle" where one slipped through). Ruled 2 Oct; supersedes the dashboard ring for the tools. R41
    later made the ring keyboard-only on the rest of the hub.
11. **Appearance has System, Light and Dark**, as on the live hub, with the active theme's glyph on
    the trigger and the OS preference followed live. A copy taken from a stale local checkout missed
    System; the fix was to copy from the live `shell.js`.
12. **Help (email, Slack) joins Appearance top-right.** The old sun/moon in the bar was removed.

## The floating bar (Utsav, with a Mobbin reference)

13. **One pill**, after "this floating bar doesn't look right, take reference from Framer on Mobbin":
    a single rounded container, every control the same height, a subtle fill for the current view,
    one strong control (the primary) at the end. 32-high items in a 40-high pill (chosen). Inside the
    pill the current view is neutral/100, because black is reserved for the primary.
14. **Download outlined, Copy HTML black.** Both are `control Kind=button`.
15. **Concentric radii** after "corners are not visually right": outer = inner + padding (8 + 4 = 12).

## Fields and surfaces

16. **One field family.** The select takes the field fill so a column of controls reads as one
    (the hub's own forms draw them differently). Fields are 36 high, not the hub's 40 (chosen, density).
17. **Open and hover borders stay neutral**, never blue; a dropdown that is open is not asking for
    attention. Dark uses neutral/700.
18. **Rings on dark tiles that match the dark panel.** The logo tile gets a Neutral/800 ring; the
    email banner (#0D0D0D, same as the canvas) gets a ring in the preview only, never in the copied
    HTML ("the banner colour is black, so it is not visible").
19. **Number spinners removed**; the slider is the stepper and the arrow keys still work.

## The artefacts

20. **The ID card uses the print palette from the brand guidelines**: Brandeis Blue #0072CE
    (Pantone 285 C), Full White, Flat Black #0D0D0D, plus tints derived from black. "Use colours for
    print, take from brand guidelines", then "colours for the ID cards, the rest is fine": only the
    card's colours, not the panel's. The photo mat is #CFCFCF.
21. **Photos show whole**, letterboxed on the neutral tile (`contain`), not cropped. "The image is
    coming zoomed in" was a `cover`. A new upload **resets the framing** (x, y, zoom), in both tools.
22. **The preview centres in the space right of the panel**, the same centre the bar uses; an inline
    padding in the JSX had pushed the card off centre ("design is not centred").
23. **Remove BG** is the label (it was "Polish", then "Remove background", then shortened to fit one
    line): "Remove BG". The progress, a spinner and a percentage, sits to the **right of the switch**,
    not under it, and ends in Done or "Failed. Try again".

## Loading and the Tools page (Utsav)

24. **Ghost states**: the hub's pages first, then inside the data areas, then the tools
    themselves (`#root:empty`, panel and bar at real geometry, pulse only, 20-second fail-safe).
25. **Tools page cards** get the hover lift and tilt, window dots coloured at rest, and the same on
    Templates; the Templates filter bar is **sticky**. Card images are regenerated at 1200 x 750.
26. **The Tools page opens with a description**: what tools are, that more will come, that some are
    limited to a team or to people. It names the two as examples and does not list them.

27. **Size the tool, then shape it, before building, and whenever a request conflicts with the shell.**
    Is this a mini tool for a light use case, or will it have heavy integrations and many use cases?
    Then, as options: the one job and its input and output, what it keeps, who it is for, and the
    options, defaults, result and edge cases. Utsav, 3 Oct 2026 (the size question first, the shape
    and functionality questions in a second message). The shell is drawn for small single-purpose
    tools; a heavy one may belong elsewhere, and the owner decides, not the builder.

28. **The panel header wears the Gushwork logo, never a stand-in.** The `tool-panel` drawing in Review
    used a blue pencil tile; Utsav, 3 Oct 2026: "use gushwork logo as in email sig and the other tool".
    The black logo tile at 32px, a link to Tools, with a neutral/800 ring in dark, the same on every
    tool and in every drawing of one. R44.

29. **Collapsed, the panel keeps its header.** "In collapsed, show logo and name too; this is a
    component change" (Utsav, 5 Oct 2026). The bare 36 reopen button became `.panel-mini`: the logo
    tile, the tool's name and the reopen button, in the panel's own surface, on every tool.

30. **The logo tile is brand blue on every tool.** "Keep the gushwork logo frame blue in all tools
    (component change in library)" (Utsav, 5 Oct 2026). The tile's fill is `--gw-color-primary-500`
    through `.brand-icon__bg`; the dark-theme ring went with the black.
31. **A tool's work can be a file of pages.** Certificate Creator (renamed from the award
    certificate generator) keeps certificates as files, each a set of pages, made from a template
    band and opened from a Files home after Google Docs. The page strip sits under the sheet after
    Canva's; downloads live in the right panel (PDF, JPG, PSD; all, this or chosen pages; quality);
    the file's other actions sit behind ⋯ so Delete is not loud (Utsav, 5 Oct 2026).

32. **Borrow from the dashboard library, do not redraw.** "The search box and other components can
    be taken from the dashboard lib, which aren't there in tools but there in dashboard" (Utsav,
    5 Oct 2026). Certificate Creator's home, menus, list and dialogs are the dashboard's own
    search field, select, menu, data table, empty state, modal and confirm dialog.
33. **A template is a design, not its copy.** The four award certificates are one design with
    different text: one Award template, with the copy offered as Starter text. The home's first tile
    is Create new, not a blank (Utsav, 5 Oct 2026).

## Left open (the owner's call)

- **A third typeface in the signature preview** (Plus Jakarta Sans). In the artefact, not the chrome.
- **Vert Grotesk Display at 14 and 16** has no token (the display ramp starts at 20); literals are
  used and commented.
- **Primary button colour**: black, per the dashboard rules; the hub's admin pages use blue.
- **Inter from Google Fonts**, not the repo's `/fonts`.
- **New, not in the library**: the floating collapsible panel, its collapse icon, and
  `tool-chrome.js` (a copy of the hub's menus that can drift from `shell.js`).

## How the work was checked

The email tool's chrome was read with `getComputedStyle`, about 170 elements, in light and dark, and
compared with `foundation/tokens.css`, the dashboard v2 specs and the hub's own pages. Off-system
values before: 7 colours, 3 type sizes, 3 gaps, 1 shadow. After: none in the chrome. Screenshots
were taken at 1440 x 900 in both themes after each change.
