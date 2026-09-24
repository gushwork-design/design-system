/* ============================================================================
   log-usage.js — record one row per plugin session in the project's KV store.

   WHY THIS EXISTS. ROLLOUT.md names the gap in its own words: the one-line install
   "does not scale, and it is invisible — you cannot tell who ran it." Adoption was
   unmeasurable, so nobody could tell a quiet rollout from a failed one. The SessionStart
   hook that already runs every session (scripts/check-update.sh) fires one fire-and-forget
   ping here, and this appends a row.

   WHAT IT DELIBERATELY DOES NOT COLLECT. Identity, plugin version, timestamp. Not the
   prompt, not the output, not the repo, not file paths. Anything richer than "somebody used
   version X on day Y" is a different product with a different consent conversation.

   WHY KV AND NOT A GOOGLE SHEET. The Sheet route needs a service-account JSON key, and
   Google now blocks key creation by default on newer Workspace orgs
   (iam.disableServiceAccountKeyCreation) — it was blocked on this org when we tried. KV is
   provisioned inside this Vercel project, which means Vercel injects the credentials itself
   and nobody ever copies a secret by hand. That is a real security win, not just convenience:
   the credential that is never handled is the credential that never leaks.

   ZERO DEPENDENCIES, deliberately. web/package.json says "no build step and no dependencies",
   and one telemetry row is not worth being the change that gives this deploy a node_modules.
   Redis is spoken over its REST API with plain fetch.

   IT IS OFF UNTIL A STORE EXISTS. With no KV env vars present this returns 204 and does
   nothing — the normal state before setup, and not an error. Nothing depends on it working.

   SETUP: Vercel dashboard → the gushwork-design project → Storage → create/connect a
   Redis (KV) store → connect it to this project → redeploy. That is the whole setup; the
   env vars below arrive on their own.

   THIS ENDPOINT IS PUBLIC, and so is spammable — the same honest position faq.js takes about
   itself. Mitigations are shape validation, a body cap, and a best-effort per-IP limit; the
   worst case is junk rows in an internal list, which is why it does not justify a shared
   secret that would have to ship inside a public plugin to be usable.
   ========================================================================= */

const LIST_KEY = 'gw:usage';
const MAX_ROWS = 5000;          // keep the list bounded; ~3 years at current team size
const MAX_BODY = 2048;

/* Vercel names these differently depending on how the store was created — a first-party KV
   store injects KV_REST_API_*, a Marketplace Upstash integration injects UPSTASH_REDIS_REST_*.
   Accept either rather than making the setup depend on which button someone clicked. */
function store() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url, token } : null;
}

/* Best-effort, per-instance, same as faq.js. Serverless instances come and go, so this
   throttles a casual loop rather than a determined one — which is the honest claim. */
const HITS = new Map();
const WINDOW_MS = 5 * 60 * 1000;
const PER_WINDOW = 12;

function rateLimited(ip) {
  const now = Date.now();
  const fresh = (HITS.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  fresh.push(now);
  HITS.set(ip, fresh);
  if (HITS.size > 500) for (const [k, v] of HITS) if (!v.some((t) => now - t < WINDOW_MS)) HITS.delete(k);
  return fresh.length > PER_WINDOW;
}

function clean(value, max = 120) {
  return String(value ?? '').replace(/[\r\n\t]/g, ' ').trim().slice(0, max);
}

/* Redis over REST: POST a command array. Pipelining both commands in one round trip keeps
   this inside the fire-and-forget budget the caller allows it. */
async function redis(cfg, commands) {
  const res = await fetch(`${cfg.url}/pipeline`, {
    method: 'POST',
    headers: { authorization: `Bearer ${cfg.token}`, 'content-type': 'application/json' },
    body: JSON.stringify(commands),
  });
  if (!res.ok) throw new Error(`kv ${res.status}`);
  return res.json();
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const cfg = store();
  // Unconfigured is the normal state, not a failure. 204 so the caller stays silent too.
  if (!cfg) return res.status(204).end();

  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  if (rateLimited(ip)) return res.status(429).json({ error: 'slow down' });

  let body = req.body;
  if (typeof body === 'string') {
    if (body.length > MAX_BODY) return res.status(413).json({ error: 'too large' });
    try { body = JSON.parse(body); } catch { return res.status(400).json({ error: 'bad json' }); }
  }
  if (!body || typeof body !== 'object') return res.status(400).json({ error: 'bad body' });

  const row = JSON.stringify({
    at: new Date().toISOString(),
    email: clean(body.email, 160),
    version: clean(body.version, 32),
    event: clean(body.event || 'session-start', 40),
    surface: clean(body.surface, 40),
  });

  try {
    await redis(cfg, [
      ['LPUSH', LIST_KEY, row],
      ['LTRIM', LIST_KEY, '0', String(MAX_ROWS - 1)],
    ]);
    return res.status(204).end();
  } catch {
    // Never surface a stack or a credential error to a public caller.
    return res.status(502).json({ error: 'could not record' });
  }
}
