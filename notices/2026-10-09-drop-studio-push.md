# Gushwork Agent Studio: push notification when a picture is ready

Built 9 Oct 2026. Files: `web/api/_drop-push.js` (new), `web/api/_drop-studio.js` (hook, subscribe, requester),
`web/internal/staging/drop-studio/sw.js` (new) and `index.html`, `web/package.json` (adds `web-push`),
`scripts/drop-studio.test.mjs` (83 checks), `exports/web/drop-studio.md`.

## Created
Nothing for the library: the Notify me control is an `action-button` in the dialog footer.

## Modified
The Studio API gains `pushkey`, `subscribe`, `unsubscribe` and `hook`. The `hook` op is answered without a session, by
design: GitHub calls it. It needs the key in its address, it re-reads the issue from GitHub instead of trusting what it
was sent, and a repeated event is dropped. Each issue now carries a `### Requested by` line (the person's email); the
ChatGPT task ignores it. No new function (it rides the existing `gw.js`).

## To switch on (nothing sends until this is done)
1. In Vercel, set `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` and `DROP_WEBHOOK_KEY` (Production), then redeploy.
2. Add a webhook on `drop-reference`: events `Issues` only, content type JSON, address
   `https://design.gushwork.ai/api/drop-studio?op=hook&key=<DROP_WEBHOOK_KEY>`.

## Worth a decision
- Requests made before this change carry no requester, so they never notify.
- Someone who answers ChatGPT's question is not re-notified until its next comment.
- iPhone: web push needs the page on the Home Screen, and no manifest is shipped yet, so that path is unconfirmed.
- Whether to also send a Slack message as a fallback for people who block notifications.

## Known gaps
The testing browser could not register a service worker, so permission, subscription and a real delivery were not
exercised. The sender was exercised against a local stand-in push service (encrypted body, VAPID header, TTL) and the
worker's handlers against a fake worker scope.
