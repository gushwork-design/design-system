/* ============================================================================
   _visits.js — read the visit log back out, for the owner only.

   The other half of _log-visit.js, and a module behind gw.js for the same reason as its
   neighbours (Hobby allows 12 functions). Same posture as _usage-log.js: the session cookie is
   verified and compared to the owner list on EVERY request, because middleware.js does not
   match /api/*. A shared-password session has no address, so it is refused.

   READ-ONLY. It never writes, trims or deletes a row.
   ========================================================================= */

import { COOKIE, verify, readCookie, sessionSecret } from './_session.js';
import { isOwner } from './_access.js';
import { LIST_KEY, MAX_ROWS } from './_log-visit.js';

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
    const rows = [];
    for (const raw of result || []) {
      try {
        const o = JSON.parse(raw);
        if (o && typeof o.at === 'string' && typeof o.path === 'string') rows.push(o);
      } catch { /* skip a malformed row */ }
    }
    return json(res, 200, { configured: true, rows, capped: (result || []).length >= MAX_ROWS });
  } catch {
    return json(res, 502, { error: 'Could not read the log.' });
  }
}
