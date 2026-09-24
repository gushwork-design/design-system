/* ============================================================================
   gw.js — one function, four jobs.

   WHY THIS EXISTS AND IS NOT FOUR FILES. Vercel's Hobby plan allows 12 serverless
   functions per deployment. This project already spends 8 on the auth gate and the
   existing endpoints; the review loop's four would have made 12 plus middleware, and the
   deploy was refused outright — it built, then died at the upload step.

   So the four live as `_`-prefixed MODULES, which Vercel treats as ordinary files rather
   than routes (the same reason _session.js and _access.js have always been shaped that
   way), and this single function dispatches to them.

   THE URLS DID NOT CHANGE. web/vercel.json rewrites /api/log-usage, /api/post-notice,
   /api/slack-events and /api/approvals onto this handler. Callers — the session hooks, and
   Slack's Request URL — still use the clean paths and cannot tell the difference. That
   matters most for Slack: its Request URL is configured once and verified on save, so it
   must not depend on an implementation detail that might get refactored again.

   If this project ever moves to Pro, splitting these back into four routes is a rename and
   a vercel.json edit — nothing in the modules themselves knows about this arrangement.
   ========================================================================= */

import logUsage from './_log-usage.js';
import postNotice from './_post-notice.js';
import slackEvents from './_slack-events.js';
import approvals from './_approvals.js';

const ROUTES = {
  'log-usage': logUsage,
  'post-notice': postNotice,
  'slack-events': slackEvents,
  'approvals': approvals,
};

export default async function handler(req, res) {
  /* The rewrite supplies ?action=; a direct call can too. Fall back to reading the path so
     that hitting /api/gw/log-usage also works — one less way for a caller to be subtly
     wrong at 2am. */
  const fromQuery = req.query && req.query.action;
  const fromPath = (req.url || '').split('?')[0].split('/').filter(Boolean).pop();
  const action = String(fromQuery || fromPath || '');

  const route = ROUTES[action];
  if (!route) {
    return res.status(404).json({ error: 'unknown action', known: Object.keys(ROUTES) });
  }
  return route(req, res);
}
