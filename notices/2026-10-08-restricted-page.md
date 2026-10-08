# Restricted page with Request access — new elements and deviations

Built 8 Oct 2026. Files: `web/api/_restricted-page.js`, `web/api/_access-request.js`, `web/api/_access.js`, `web/api/access.js`, `web/api/_slack-actions.js`, `web/api/gw.js`, `web/middleware.js`, `web/vercel.json`, `exports/dashboard/css/70-auth.css`, `exports/dashboard/auth.md`, `web/previews/dashboard/access-denied-screen.frag`

## Created
### `.gd-auth__facts` and `.gd-auth__note` (in `access-denied-screen`)
The row that puts "Signed in as" next to "Page: {name}", and a one-line status under the actions (muted; `--error` in the bad tone). The library had one `.gd-auth__who` chip and no place for a second fact or for a failure. Tokens only: gap, muted and bad-tone text, the 12px medium type style. Pending library review with the component.

### `.gd-empty--sent` badge tone (in `access-denied-screen`)
The lock badge takes the check glyph and the good tone once a request is sent. A glyph, not small text, so `--gd-good` is allowed.

## Modified
### `access-denied-screen` 2.0.0 → 2.1.0
Title "Admin access required" → "Restricted page"; the primary action "Ask the owner" (a link) → "Request access" (a button), with "Ask the owner" kept as the fallback; five states drawn instead of one. The spec text moved, so its review pass expires and it is waiting again.

### `web/api/access.js`: the write moved to `saveRules`
Same behaviour and the same responses; the Edge Config write now lives in `_access.js` so the Slack Approve and the Access Control page cannot drift apart.

## Worth a decision
- **Approve is permanent until someone removes it in Access Control.** You chose "that page, for that person". A 7-day grant would need expiry on the rules and was not built.
- **The restricted page is the only place that asks for access.** A signed-out visitor still goes to sign-in; nothing else changed in the gate.
- **A request is one Slack DM per person per page per day, ten an hour per person.** Chosen by me; easy to move.

## Tokens
No new colour, type, radius, shadow or spacing value. Tokens used: the `--gd-*` aliases already in 70-auth and 60-feedback (`--gd-good`, `--gd-tone-bad-fg`, `--gd-text-muted`, `--gd-auth-field`), `--gw-space-8`, and the `body-12-med` type style.
