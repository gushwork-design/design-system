# Gushwork Agent Studio: everyone can look, only the owner can create

Changed 9 Oct 2026, on Utsav's instruction ("all the Gushwork ids will have view access, only I will have create agent
access"). Files: `web/api/_drop-studio.js`, `web/internal/staging/drop-studio/index.html`,
`scripts/drop-studio.test.mjs`, `exports/web/drop-studio.md`.

## Who can do what
- **Everyone signed in with a Gushwork account** (the page's `internal` rule, unchanged): open the page, copy links,
  download pictures, look at pictures waiting for review and at ChatGPT's questions.
- **The owner only:** Create new agent, Request new picture, Answer ChatGPT, and Accept, Request changes or Discard on a
  picture. The API refuses these for anyone else with a 403, so the buttons are a courtesy, not the lock.

## Modified
The two API operations `create` and `answer` now check the owner list, the same check `decide` already had. On the page
the buttons stay visible for everyone; for a non-owner they say "You are not allowed to create a new agent" (a message
at the top, or on the button inside a card) and open nothing.

## Worth a decision
Notifications ("Notify me when it's ready") are only offered after sending a request, so in practice only the owner
sees them. Marketing, when added, would get the same view-only page unless their accounts are added to the owner list
(`OWNER_EMAILS`), which is separate from Access Control.
