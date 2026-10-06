/* ============================================================================
   _tools.js — what each hosted tool's access badge should say, and whether THIS viewer can
   open it. Served as GET /api/tools (a module behind gw.js, so it costs no new function on
   the Hobby plan's 12).

   Why it is not /api/access: that endpoint is admin-only and returns the whole ruleset,
   including named people's addresses. The Tools and Templates pages are read by everyone at the company, and
   all it needs is a phrase and a yes or no per tool — so that is all this returns.

   THE LIST BELOW MUST STAY IN STEP with the cards on /internal/tools and /internal/templates
   (data-tool) and the TOOLS and TEMPLATES arrays in /admin/access-control. A tool missing here simply keeps no live badge.
   ========================================================================= */

import { COOKIE, verify, readCookie, sessionSecret } from './_session.js';
import { loadRules, ruleFor, decide, describeAccess } from './_access.js';

const TOOLS = [
  '/internal/email-signature', '/internal/employee-id-card', '/internal/certificate-creator',
  /* The five templates. Each is the preview page under /internal/templates/, so a rule set on
     one gates that preview, and a rule on /internal/templates gates the list and all five. */
  '/internal/templates/ad-page', '/internal/templates/ad-page-signup', '/internal/templates/support-ops-app', '/internal/templates/case-study',
  '/internal/templates/lead-magnet', '/internal/templates/slide-deck'
];

function json(res, status, body) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, private');
  res.status(status).end(JSON.stringify(body));
}

export default async function handler(req, res) {
  const session = await verify(readCookie(req.headers.cookie, COOKIE), sessionSecret());
  if (!session) return json(res, 401, { error: 'Not signed in.' });

  const rules = await loadRules();
  const tools = {};
  for (const path of TOOLS) {
    tools[path] = {
      ...describeAccess(ruleFor(path, rules)),
      /* Evaluated for THIS viewer by the same function the gate uses, so a locked card
         and a 403 can never disagree. */
      canOpen: decide(path, session, rules) === 'allow'
    };
  }
  return json(res, 200, { tools });
}
