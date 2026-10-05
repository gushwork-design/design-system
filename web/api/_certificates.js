/* ============================================================================
   _certificates.js — the award certificate tool's shared saved list.

   Served as /api/certificates, a module behind gw.js like its neighbours, so it costs no new
   function against the Hobby plan's 12.

   WHO. Whoever the gate lets open the tool. The check is the gate's own decide() on the tool's
   path, so the list and the page can never disagree: limit the tool to HR in Access Control and
   the list is limited with it. middleware.js gates /internal/* pages, not /api/*, so this is
   checked here on every request.

   WHAT IT STORES. One hash, `gw:certs`: id -> {id, data, savedBy, savedAt, updatedBy, updatedAt}.
   `data` is only the certificate's own text fields, whitelisted and length-capped below; nothing
   else a browser sends is kept. savedBy is the verified session's work email.

   HOW MUCH. Capped at MAX_ITEMS certificates; a save past the cap is refused, not trimmed, so
   nobody's saved work disappears without them deleting it.
   ========================================================================= */

import { COOKIE, verify, readCookie, sessionSecret } from './_session.js';
import { loadRules, decide } from './_access.js';

const KEY = 'gw:certs';
const MAX_ITEMS = 1000;
/* Staging today; the live path is listed now so moving the tool needs no change here. */
const TOOL_PATHS = ['/internal/staging/award-certificate', '/internal/award-certificate'];
const FIELDS = {
  preset: 40, name: 80, headline: 200, before: 400, award: 120, after: 400,
  period: 40, signature: 60, signedBy: 120,
};

function store() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url, token } : null;
}

async function pipe(cfg, cmds) {
  const r = await fetch(`${cfg.url}/pipeline`, {
    method: 'POST',
    headers: { authorization: `Bearer ${cfg.token}`, 'content-type': 'application/json' },
    body: JSON.stringify(cmds),
  });
  if (!r.ok) throw new Error(`kv ${r.status}`);
  return r.json();
}

function json(res, status, body) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, private');
  res.status(status).end(JSON.stringify(body));
}

function clean(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const out = {};
  for (const [k, max] of Object.entries(FIELDS)) {
    const v = raw[k];
    out[k] = typeof v === 'string' ? v.slice(0, max) : '';
  }
  out.nameOwnLine = raw.nameOwnLine === true;
  return out;
}

function newId() {
  const b = new Uint8Array(9);
  crypto.getRandomValues(b);
  return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
}

export default async function handler(req, res) {
  const session = await verify(readCookie(req.headers.cookie, COOKIE), sessionSecret());
  if (!session) return json(res, 401, { error: 'Not signed in.' });
  const rules = await loadRules();
  if (!TOOL_PATHS.some((p) => decide(p, session, rules) === 'allow')) {
    return json(res, 403, { error: 'This list is limited to the people who can open the tool.' });
  }
  const cfg = store();
  if (!cfg) return json(res, 503, { error: 'The store is not connected.' });
  const who = session.email ? String(session.email).toLowerCase() : '(shared password)';

  try {
    if (req.method === 'GET') {
      const r = await pipe(cfg, [['HVALS', KEY]]);
      const items = ((r[0] && r[0].result) || [])
        .map((s) => { try { return JSON.parse(s); } catch { return null; } })
        .filter(Boolean)
        .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
      return json(res, 200, { items });
    }

    if (req.method === 'POST') {
      let body = req.body;
      if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = null; } }
      const data = clean(body && body.data);
      if (!data) return json(res, 400, { error: 'Nothing to save.' });
      const now = new Date().toISOString();
      const asked = body && typeof body.id === 'string' && /^[a-f0-9]{18}$/.test(body.id) ? body.id : '';
      let item;
      if (asked) {
        const r = await pipe(cfg, [['HGET', KEY, asked]]);
        const prev = r[0] && r[0].result ? JSON.parse(r[0].result) : null;
        if (!prev) return json(res, 404, { error: 'That certificate was deleted.' });
        item = { ...prev, data, updatedBy: who, updatedAt: now };
      } else {
        const r = await pipe(cfg, [['HLEN', KEY]]);
        if ((r[0] && r[0].result) >= MAX_ITEMS) return json(res, 507, { error: 'The list is full. Delete some old certificates first.' });
        item = { id: newId(), data, savedBy: who, savedAt: now, updatedBy: who, updatedAt: now };
      }
      await pipe(cfg, [['HSET', KEY, item.id, JSON.stringify(item)]]);
      return json(res, 200, { item });
    }

    if (req.method === 'DELETE') {
      const id = String((req.query && req.query.id) || '');
      if (!/^[a-f0-9]{18}$/.test(id)) return json(res, 400, { error: 'Bad id.' });
      await pipe(cfg, [['HDEL', KEY, id]]);
      return json(res, 200, { ok: true, id });
    }

    res.setHeader('Allow', 'GET, POST, DELETE');
    return json(res, 405, { error: 'Method not allowed.' });
  } catch {
    return json(res, 502, { error: 'The store did not answer. Try again.' });
  }
}
