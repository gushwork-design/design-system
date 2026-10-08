# Drop Studio phase 2: creating agents and reviewing pictures

Built 8 Oct 2026, on top of phase 1. Files: `web/api/_drop-studio.js`, its route in `web/api/gw.js` and a rewrite in
`web/vercel.json`, `scripts/drop-studio.test.mjs`, the dialogs in `web/internal/staging/drop-studio/index.html`.

## Created
Nothing new for the library. The create, request, question and review dialog is a `modal` with `form-field`, `text-input`,
`textarea`, `select`, `segmented-control` and `activity-timeline`. `drop-agent-card` gained three states (Requested, To
review and Needs answer, plus a dashed waiting square); its spec in `exports/web/drop-studio.md` and its drawing in
`web/previews/web/drop-agent-card.frag` say so.

## Modified
`web/api/gw.js` (one route), `web/vercel.json` (one rewrite). Hobby's 12-function cap is respected: the module is an
`_name.js` file dispatched by `gw.js`.

## To switch on (nothing works until this is done)
1. In GitHub, create a fine-grained token for `gushwork-design/drop-reference` only, with Contents and Issues set to
   read and write. Add it in Vercel as `DROP_REFERENCE_TOKEN`. `DROP_REFERENCE_REPO` is optional (default
   `gushwork-design/drop-reference`).
2. Add the labels `image-request`, `image-ready`, `needs-input`, `accepted`, `discarded` and `revision` to the repo.
3. The scheduled ChatGPT task must be the one in `image-request-contract.md`, which now also reads an optional
   `### Bundle` heading.

## Worth a decision
- Accept writes the picture into `masters/` from the page, with the token. The alternative is that you copy it by hand.
- A newly accepted picture is saved in drop-reference only. Showing it on /agents is a later phase.
- Marketing access: add their accounts in Access Control; the API follows the same rule.
- Whether ChatGPT can run unattended (read issues, push, generate) is still untested. Until the dry run passes, requests
  will sit as Requested.

## Known gaps
Cancelling a request from the page is not built. The visual checks ChatGPT lists in its comment are not shown in the
review dialog. Not exercised against real GitHub: the endpoint is tested against a pretend one
(`node scripts/drop-studio.test.mjs`, 55 checks).
