/* ============================================================================
   usage-log.js — read the session log back out, for the owner only.

   The other half of log-usage.js. That endpoint appends one row per plugin session to the
   `gw:usage` list; this one returns them to /admin/usage-log. It is a module behind gw.js,
   not a route of its own, for the same reason as its neighbours: Hobby allows 12 functions.

   OWNER, NOT ADMIN. The rows carry work emails, and the collection notice says "identity +
   version + timestamp". Admins can edit who may open a page; they have no need to see who
   opens a session, so this is checked against OWNER_EMAILS and nothing wider.

   CHECKED HERE, NOT IN MIDDLEWARE. middleware.js matches /admin/* and /internal/* pages, not
   /api/*, so the gate on the page would not protect this. The session cookie is verified and
   the address compared to the owner list on every request. A password-door session has no
   address, so it is refused: "owner" is a person, and one shared key cannot be one.

   READ-ONLY. It never writes, trims or deletes a row.
   ========================================================================= */

import { COOKIE, verify, readCookie, sessionSecret } from './_session.js';
import { isOwner } from './_access.js';

const LIST_KEY = 'gw:usage';
const MAX_ROWS = 5000;        // log-usage.js trims the list to this, so it is also the read bound

function store() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url, token } : null;
}

function json(res, status, body) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, private');
  res.status(status).end(JSON.stringify(body));
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return json(res, 405, { error: 'GET only' });

  const session = await verify(readCookie(req.headers.cookie, COOKIE), sessionSecret());
  if (!session || !session.email) return json(res, 401, { error: 'Not signed in.' });
  if (!isOwner(session.email)) return json(res, 403, { error: 'Owners only.' });

  const cfg = store();
  if (!cfg) return json(res, 200, { configured: false, rows: [] });

  try {
    const r = await fetch(`${cfg.url}/pipeline`, {
      method: 'POST',
      headers: { authorization: `Bearer ${cfg.token}`, 'content-type': 'application/json' },
      body: JSON.stringify([['LRANGE', LIST_KEY, '0', String(MAX_ROWS - 1)]]),
    });
    if (!r.ok) throw new Error(`kv ${r.status}`);
    const [{ result }] = await r.json();

    /* Rows were written by a public endpoint, so a malformed one is possible. Skip it
       rather than fail the whole read, and say how many were skipped. */
    const rows = [];
    let skipped = 0;
    for (const raw of result || []) {
      try {
        const o = JSON.parse(raw);
        if (o && typeof o.at === 'string') rows.push(o); else skipped++;
      } catch { skipped++; }
    }
    return json(res, 200, { configured: true, rows, skipped, capped: (result || []).length >= MAX_ROWS });
  } catch {
    // No stack, no credential detail — same posture as log-usage.js.
    return json(res, 502, { error: 'Could not read the log.' });
  }
}
