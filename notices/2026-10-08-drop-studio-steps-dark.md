# Drop Studio: steps header, new-bundle icon, dark-mode contrast

Built 8 Oct 2026. Files: `web/internal/staging/drop-studio/index.html`, `exports/web/drop-studio.md`,
`web/previews/web/drop-stepper.frag`, one entry in `exports/web/component-registry.json`.

## Created
One element, pending review: `drop-stepper`, three round marks in a row (done, now, next) joined by a hairline, for the
create / review dialog's header. The library has no stepper. Spec in `exports/web/drop-studio.md`.

## Modified
The page only. The Add a new bundle option has a plus icon. The dialog grows with its content (up to the viewport)
instead of capping at the library modal's 640px, so the new-bundle field no longer makes it scroll. Dark mode: page
edges, secondary text and the dialog's fields were nearly the same grey; they now have visible separation. Light mode is unchanged.

## Worth a decision
Whether the library's `gd-modal` should cap at 640px when a form inside it can grow. Whether a stepper belongs in the
dashboard library.
