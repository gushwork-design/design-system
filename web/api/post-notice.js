/* ============================================================================
   post-notice.js — post a new-component notice to Slack, and remember what it was about.

   WHY THE SERVER POSTS AND NOT THE SESSION. The ✅ loop needs to know which component a
   reaction refers to, and a reaction event identifies its message only by timestamp. So
   something has to record `ts → component` at the moment of posting — and only
   chat.postMessage returns a ts (an Incoming Webhook does not).

   That could have been done locally, but it would have put a Slack bot token AND Redis
   credentials on every machine that ever files a notice. Doing it here instead means the
   bot token never leaves Vercel, and the local side holds exactly one shared secret whose
   worst case is "someone can post a notice".

   FLOW
     session → POST here {secret, surface, key, fingerprint, text, notice}
            → chat.postMessage into the review channel
            → SET gw:notice:<ts> = {surface, key, fingerprint, notice}  (90 day TTL)
     reaction ✅ → slack-events.js looks that key up

   WHY A SHARED SECRET AND NOT SIGNATURE VERIFICATION. This endpoint is called BY us, not by
   Slack, so there is no Slack signature to check. A bearer secret is the honest minimum;
   it is not in the plugin (which is public), it is set per-machine by whoever files notices.
   Compromise means junk messages in one Slack channel — annoying, bounded, rotatable.

   OFF UNTIL CONFIGURED: missing SLACK_BOT_TOKEN, GUSHWORK_NOTICE_TOKEN or a KV store all
   return 204 and do nothing, so this is inert rather than broken before setup.
   ========================================================================= */

import crypto from 'node:crypto';

const TTL_SECONDS = 60 * 60 * 24 * 90;   // 90 days — a notice unanswered that long is dead
const MAX_BODY = 8192;

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

/* Constant-time compare so the secret cannot be recovered by timing the 401. */
function secretOk(given) {
  const want = process.env.GUSHWORK_NOTICE_TOKEN || '';
  if (!want || !given) return false;
  const a = Buffer.from(String(given));
  const b = Buffer.from(want);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function clean(v, max = 200) {
  return String(v ?? '').replace(/[\r\n\t]/g, ' ').trim().slice(0, max);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const botToken = process.env.SLACK_BOT_TOKEN;
  const channel = process.env.SLACK_REVIEW_CHANNEL;
  const cfg = store();
  if (!botToken || !channel || !cfg || !process.env.GUSHWORK_NOTICE_TOKEN) {
    return res.status(204).end();           // unconfigured is normal, not an error
  }

  let body = req.body;
  if (typeof body === 'string') {
    if (body.length > MAX_BODY) return res.status(413).json({ error: 'too large' });
    try { body = JSON.parse(body); } catch { return res.status(400).json({ error: 'bad json' }); }
  }
  if (!body || typeof body !== 'object') return res.status(400).json({ error: 'bad body' });

  if (!secretOk(body.secret)) return res.status(401).json({ error: 'nope' });

  const text = String(body.text ?? '').slice(0, 3000);
  if (!text.trim()) return res.status(400).json({ error: 'no text' });

  try {
    const posted = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: { authorization: `Bearer ${botToken}`, 'content-type': 'application/json' },
      body: JSON.stringify({ channel, text, unfurl_links: false }),
    }).then((r) => r.json());

    // Slack answers 200 with {ok:false} on failure — status alone is not the check.
    if (!posted.ok) return res.status(502).json({ error: `slack: ${posted.error}` });

    // Only worth remembering if there is something to approve.
    if (body.key && body.surface) {
      await redis(cfg, [[
        'SET', `gw:notice:${posted.ts}`,
        JSON.stringify({
          surface: clean(body.surface, 40),
          key: clean(body.key, 80),
          fingerprint: clean(body.fingerprint, 64),
          notice: clean(body.notice, 200),
          at: new Date().toISOString(),
        }),
        'EX', String(TTL_SECONDS),
      ]]);
    }

    return res.status(200).json({ ok: true, ts: posted.ts });
  } catch {
    return res.status(502).json({ error: 'could not post' });
  }
}
