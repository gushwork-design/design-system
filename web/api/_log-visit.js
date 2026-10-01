/* ============================================================================
   _log-visit.js — record who signs in to the design hub and which pages they open.

   FOR THE OWNER ONLY, read back by _visits.js and /admin/visits. Nothing here is shown to the
   person it records, and nothing outside the owner check can read it.

   WHAT IT STORES. One row per event in the `gw:visits` list: when, who (the work email on the
   verified session), which page, and whether it was a sign-in or a page view. For the shared
   password door there is no identity, so the row says so rather than guessing. It does NOT
   store an IP address, a user agent, a referrer, or anything the person typed.

   HOW MUCH. A page view is written at most once per person per page per 30 minutes (an NX key
   with a TTL), so refreshing or clicking back and forth is one row, not twenty. The list is
   trimmed to the newest 5000 rows, the same bound as the usage log, and the cost is two or three
   KV commands per new view, inside the free tier for a team this size.

   NEVER BLOCKS A PAGE. Callers hand the promise to waitUntil, or await it inside a try; a KV
   outage means a missing row and nothing else.
   ========================================================================= */

export const LIST_KEY = 'gw:visits';
export const MAX_ROWS = 5000;
export const SHARED_PASSWORD = '(shared password)';
const DEDUPE_SECONDS = 1800;

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

/* '/internal/tools/' and '/internal/tools' are one page. */
export function cleanPath(p) {
  const s = String(p || '/').split('?')[0].split('#')[0].replace(/\/index\.html$/, '').replace(/\.html$/, '');
  return (s.length > 1 ? s.replace(/\/+$/, '') : s).slice(0, 200) || '/';
}

/* kind: 'view' (a page opened) or 'signin' (a session was issued). via: 'google' | 'password'. */
export async function recordVisit({ email, path, kind = 'view', via = '' }) {
  try {
    const cfg = store();
    if (!cfg) return;
    const who = email ? String(email).trim().toLowerCase().slice(0, 120) : SHARED_PASSWORD;
    const p = cleanPath(path);
    if (kind === 'view') {
      const res = await pipe(cfg, [['SET', `gw:v:${who}:${p}`, '1', 'NX', 'EX', String(DEDUPE_SECONDS)]]);
      if (!res || !res[0] || res[0].result !== 'OK') return;   // seen in the last 30 minutes
    }
    const row = { at: new Date().toISOString(), email: who, path: p, kind };
    if (via) row.via = via;
    await pipe(cfg, [['LPUSH', LIST_KEY, JSON.stringify(row)], ['LTRIM', LIST_KEY, '0', String(MAX_ROWS - 1)]]);
  } catch {
    /* A missing row is the whole cost of a failure here. */
  }
}
