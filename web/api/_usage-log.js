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

   IT NEVER WRITES, TRIMS OR DELETES A USAGE ROW. The one thing POST records is a verdict on an
   output (approved / needs changes), kept in its own hash keyed by the row's timestamp, so the
   log itself stays append-only.
   ========================================================================= */

import { COOKIE, verify, readCookie, sessionSecret } from './_session.js';
import { isOwner } from './_access.js';

const LIST_KEY = 'gw:usage';
const OUTCOME_KEY = 'gw:outcome';   // hash: row timestamp -> approved | changes
const STATUSES = ['approved', 'changes'];
const FILES_KEY = 'gw:files';        // hash: "<sess>|<file>" -> where the kept copy is (see _log-output.js)
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

/* Reading a verdict and writing one are the same owner-checked door, so both live here. */
async function owner(req, res) {
  const session = await verify(readCookie(req.headers.cookie, COOKIE), sessionSecret());
  if (!session || !session.email) { json(res, 401, { error: 'Not signed in.' }); return false; }
  if (!isOwner(session.email)) { json(res, 403, { error: 'Owners only.' }); return false; }
  return true;
}

/* POST {at, status}: record whether an output was approved or needs changes, or clear the verdict
   with an empty status. Keyed by the row's own timestamp, which the log endpoint stamps
   server-side to the millisecond. The verdict lives in its own hash, so a usage row is never
   rewritten and the log stays append-only. */
async function setOutcome(req, res) {
  if (!(await owner(req, res))) return;
  const cfg = store();
  if (!cfg) return json(res, 503, { error: 'The log store is not connected.' });
  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = null; } }
  const at = body && typeof body.at === 'string' ? body.at : '';
  const status = body && typeof body.status === 'string' ? body.status : '';
  if (!/^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/.test(at) || (status && !STATUSES.includes(status))) {
    return json(res, 400, { error: 'Bad verdict.' });
  }
  try {
    const cmd = status ? ['HSET', OUTCOME_KEY, at, status] : ['HDEL', OUTCOME_KEY, at];
    const r = await fetch(`${cfg.url}/pipeline`, {
      method: 'POST',
      headers: { authorization: `Bearer ${cfg.token}`, 'content-type': 'application/json' },
      body: JSON.stringify([cmd]),
    });
    if (!r.ok) throw new Error(`kv ${r.status}`);
    return json(res, 200, { ok: true, at, status });
  } catch {
    return json(res, 502, { error: 'Could not save the verdict.' });
  }
}

/* GET ?file=<sess>|<name>: hand the owner the kept copy of an output. The same owner check as
   the log. A type that a browser would RUN on our origin (html, svg) is sent as a download, never
   rendered, and every response is marked no-sniff and sandboxed, so a file a stranger managed
   to get in cannot execute here. */
const SERVE = {
  pdf: ['application/pdf', 'inline'], png: ['image/png', 'inline'],
  pptx: ['application/vnd.openxmlformats-officedocument.presentationml.presentation', 'attachment'],
  html: ['application/octet-stream', 'attachment'], svg: ['application/octet-stream', 'attachment'],
};
async function serveFile(req, res, key) {
  const cfg = store();
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!cfg || !token) return json(res, 404, { error: 'No kept copy.' });
  try {
    const r = await fetch(`${cfg.url}/pipeline`, {
      method: 'POST',
      headers: { authorization: `Bearer ${cfg.token}`, 'content-type': 'application/json' },
      body: JSON.stringify([['HGET', FILES_KEY, key]]),
    });
    const [{ result }] = await r.json();
    if (!result) return json(res, 404, { error: 'No kept copy.' });
    const entry = JSON.parse(result);
    const { get } = await import('@vercel/blob');
    const blob = await get(entry.p, { access: 'private', token });
    if (!blob || !blob.stream) return json(res, 404, { error: 'No kept copy.' });
    const name = key.split('|').slice(1).join('|');
    const ext = (name.split('.').pop() || '').toLowerCase();
    const [type, disp] = SERVE[ext] || ['application/octet-stream', 'attachment'];
    res.setHeader('Content-Type', type);
    res.setHeader('Content-Disposition', `${disp}; filename="${name.replace(/[^A-Za-z0-9 _.()\-]/g, '_')}"`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', 'sandbox');
    res.setHeader('Cache-Control', 'no-store, private');
    const { Readable } = await import('node:stream');
    res.status(200);
    Readable.fromWeb(blob.stream).pipe(res);
  } catch {
    return json(res, 502, { error: 'Could not open the kept copy.' });
  }
}

export default async function handler(req, res) {
  if (req.method === 'POST') return setOutcome(req, res);
  if (req.method !== 'GET') return json(res, 405, { error: 'GET or POST only' });

  const session = await verify(readCookie(req.headers.cookie, COOKIE), sessionSecret());
  if (!session || !session.email) return json(res, 401, { error: 'Not signed in.' });
  if (!isOwner(session.email)) return json(res, 403, { error: 'Owners only.' });

  const wanted = req.query && req.query.file;
  if (wanted) return serveFile(req, res, String(wanted).slice(0, 200));

  const cfg = store();
  if (!cfg) return json(res, 200, { configured: false, rows: [] });

  try {
    const r = await fetch(`${cfg.url}/pipeline`, {
      method: 'POST',
      headers: { authorization: `Bearer ${cfg.token}`, 'content-type': 'application/json' },
      body: JSON.stringify([['LRANGE', LIST_KEY, '0', String(MAX_ROWS - 1)], ['HGETALL', OUTCOME_KEY], ['HKEYS', FILES_KEY]]),
    });
    if (!r.ok) throw new Error(`kv ${r.status}`);
    const [{ result }, { result: flat }, { result: fileKeys }] = await r.json();

    /* HGETALL comes back as a flat [field, value, field, value, ...] array. */
    const outcomes = {};
    for (let i = 0; i + 1 < (flat || []).length; i += 2) {
      if (STATUSES.includes(flat[i + 1])) outcomes[flat[i]] = flat[i + 1];
    }

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
    return json(res, 200, { configured: true, rows, outcomes, files: fileKeys || [], skipped, capped: (result || []).length >= MAX_ROWS });
  } catch {
    // No stack, no credential detail — same posture as log-usage.js.
    return json(res, 502, { error: 'Could not read the log.' });
  }
}
