/* ============================================================================
   approvals.js — hand queued ✅ approvals back to a session, so it can apply them.

   The last leg of the loop in REVIEW-LOOP.md. slack-events.js writes approvals into
   `gw:approvals` when a reviewer reacts; this is where the next session reads them.

   WHY THE SESSION APPLIES THE PASS AND NOT THE SERVER. Applying means running
   review-pass.sh against a git repo on someone's machine, whose main branch requires a
   reviewed PR. A serverless function cannot do that and should not try. It also cannot
   re-check the fingerprint, because the source it would compare against lives in that same
   local repo. So the server queues, the session applies — and the fingerprint check happens
   where the source actually is.

   ?peek=1  read without draining — what the SessionStart hook uses, so a hook that is killed
            mid-run cannot swallow an approval.
   default  read AND drain, for when the session is actually going to act on them.

   Same bearer secret as post-notice.js: this is called by us, not by Slack, so there is no
   signature to verify. Reading the queue leaks nothing worse than "which components were
   approved", but draining it is destructive, hence the auth.
   ========================================================================= */

import crypto from 'node:crypto';

const QUEUE_KEY = 'gw:approvals';

function store() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url, token } : null;
}

async function redis(cfg, commands) {
  const res = await fetch(`${cfg.url}/pipeline`, {
    method: 'POST',
    headers: { authorization: `Bearer ${cfg.token}`, 'content-type': 'application/json' },
    body: JSON.stringify(commands),
  });
  if (!res.ok) throw new Error(`kv ${res.status}`);
  return res.json();
}

function secretOk(given) {
  const want = process.env.GUSHWORK_NOTICE_TOKEN || '';
  if (!want || !given) return false;
  const a = Buffer.from(String(given));
  const b = Buffer.from(want);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export default async function handler(req, res) {
  const cfg = store();
  if (!cfg || !process.env.GUSHWORK_NOTICE_TOKEN) {
    // Unconfigured: an empty queue is the honest answer, and keeps callers branch-free.
    return res.status(200).json({ approvals: [] });
  }

  const given = req.headers['x-gushwork-token']
    || (req.query && req.query.token)
    || (typeof req.body === 'object' && req.body ? req.body.secret : null);
  if (!secretOk(given)) return res.status(401).json({ error: 'nope' });

  const peek = String((req.query && req.query.peek) || '') === '1';

  try {
    if (peek) {
      const [{ result }] = await redis(cfg, [['LRANGE', QUEUE_KEY, '0', '99']]);
      return res.status(200).json({ approvals: (result || []).map(safe).filter(Boolean) });
    }
    // Read and clear in one round trip. Not atomic against a simultaneous LPUSH — an
    // approval landing between the two would be dropped. At one reviewer and a handful of
    // approvals a week that is theoretical; RENAME-and-read would fix it if it ever bites.
    const [{ result }] = await redis(cfg, [['LRANGE', QUEUE_KEY, '0', '99']]);
    await redis(cfg, [['DEL', QUEUE_KEY]]);
    return res.status(200).json({ approvals: (result || []).map(safe).filter(Boolean) });
  } catch {
    return res.status(502).json({ error: 'could not read' });
  }
}

function safe(row) {
  try { return typeof row === 'string' ? JSON.parse(row) : row; } catch { return null; }
}
