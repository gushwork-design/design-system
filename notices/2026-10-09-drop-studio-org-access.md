# Gushwork Agent Studio is open to the organisation

Changed 9 Oct 2026, on Utsav's instruction ("keep permission for everyone in the org"). Files: `web/api/_access.js`,
`scripts/access.test.mjs`, `scripts/drop-studio.test.mjs`, `exports/web/drop-studio.md`, `web/internal/staging.html`.

## Modified
The compiled rule for `/internal/staging/drop-studio` goes from `owner` to `internal`: anyone signed in with a Gushwork
account can open it. The picture API (`/api/drop-studio`) uses the same rule, so the same people can use it.

## What a teammate can and cannot do
Can: browse, copy links, download pictures, make a new-agent or new-picture request, answer ChatGPT's question.
Cannot: accept, ask for changes to, or discard a picture. That check is in `api/_drop-studio.js` (the owner list), not
in the access rule, so it holds whatever the rule says.

## Worth a decision
Every request a teammate makes becomes a GitHub issue that ChatGPT works on, so anyone in the org can queue work on the
owner's ChatGPT plan. If that gets noisy, narrow the rule to a named group in Access Control.

## Also fixed
`scripts/access.test.mjs` was failing on main: its list of compiled routes had not been updated for `/agents` or for
this page. It now names them all.
