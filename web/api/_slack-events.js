/* ============================================================================
   slack-events.js — the ✅ that closes the review loop.

   Reacting ✅ on a notice records an approval. The next session drains it and applies the
   pass. Full design, and why a reaction rather than a button or a reply, is in
   REVIEW-LOOP.md.

   WHAT THIS DOES NOT DO: it does not apply the pass itself. It records the approval and
   stops. Writing to the registry means editing a git repo that lives on someone's machine
   and whose main branch requires a reviewed PR — a webhook has no business doing that. The
   next session picks it up, re-checks the fingerprint, and runs review-pass.sh.

   IT ALSO CANNOT MESSAGE CLAUDE. There is no persistent Claude to message; a session exists
   only while it runs. By the time a reaction arrives, the session that built the thing is
   gone. So this is a queue, not a conversation — which is also why the whole loop needs no
   always-on agent and no inference.

   ── THE THREE GUARDS, none optional ──────────────────────────────────────────────────
   1. VERIFY SLACK'S SIGNATURE. Without it this is a public URL that approves components for
      anyone who finds it. HMAC-SHA256 over `v0:timestamp:rawBody`, compared in constant
      time, with a 5-minute window so a captured request cannot be replayed tomorrow.
   2. VERIFY THE REACTOR. Anyone in the channel can add ✅. Without an allowlist, channel
      membership IS review authority.
   3. THE FINGERPRINT IS RE-CHECKED LATER, not here — at apply time, by the session, because
      the component may have moved between the tap and the next session. Recorded here so
      there is something to compare against.

   Slack retries on any non-2xx, so every handled path answers 200 — including "ignored".
   A 500 on an emoji we do not care about would have Slack redeliver it three times.
   ========================================================================= */

import crypto from 'node:crypto';

const APPROVE_EMOJI = new Set(['white_check_mark', 'heavy_check_mark', 'ballot_box_with_check']);
const QUEUE_KEY = 'gw:approvals';
const MAX_QUEUE = 500;
const SKEW_SECONDS = 60 * 5;

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

/* Vercel parses JSON bodies for us, but the signature is over the RAW bytes — a re-serialised
   object will not match (key order, spacing). Read the stream ourselves. */
async function rawBody(req) {
  if (typeof req.body === 'string') return req.body;
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

function signatureValid(req, raw) {
  const secret = process.env.SLACK_SIGNING_SECRET;
  const sig = req.headers['x-slack-signature'];
  const ts = req.headers['x-slack-request-timestamp'];
  if (!secret || !sig || !ts) return false;

  // Reject replays before spending a hash on them.
  if (Math.abs(Math.floor(Date.now() / 1000) - Number(ts)) > SKEW_SECONDS) return false;

  const mine = 'v0=' + crypto.createHmac('sha256', secret)
    .update(`v0:${ts}:${raw}`).digest('hex');
  const a = Buffer.from(mine);
  const b = Buffer.from(String(sig));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function isReviewer(userId) {
  const allow = (process.env.SLACK_REVIEWER_IDS || '')
    .split(',').map((s) => s.trim()).filter(Boolean);
  return allow.length > 0 && allow.includes(userId);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const raw = await rawBody(req);

  let payload;
  try { payload = JSON.parse(raw); } catch { return res.status(400).json({ error: 'bad json' }); }

  /* Slack calls this once when you save the Request URL. It is the ONLY unsigned request
     Slack sends, so it is handled before the signature check — which is safe because the
     only thing it can do is echo back a challenge string. */
  if (payload.type === 'url_verification') {
    return res.status(200).json({ challenge: payload.challenge });
  }

  if (!signatureValid(req, raw)) return res.status(401).json({ error: 'bad signature' });

  const event = payload.event || {};
  // Anything that is not an approval reaction is ignored — quietly, and with a 200 so Slack
  // does not retry it. reaction_removed is deliberately not handled: the reverse of a pass
  // is an explicit --reject with a note, not a silently removed emoji.
  if (event.type !== 'reaction_added' || !APPROVE_EMOJI.has(event.reaction)) {
    return res.status(200).json({ ok: true, ignored: true });
  }

  if (!isReviewer(event.user)) {
    // Not an error — someone in the channel reacted who is not a reviewer. Ignore it, but
    // answer 200: a 403 would make Slack retry a reaction that will never be authorised.
    return res.status(200).json({ ok: true, ignored: 'not a reviewer' });
  }

  const cfg = store();
  if (!cfg) return res.status(200).json({ ok: true, ignored: 'no store' });

  const ts = event.item && event.item.ts;
  if (!ts) return res.status(200).json({ ok: true, ignored: 'no message ts' });

  try {
    const [{ result: mapped }] = await redis(cfg, [['GET', `gw:notice:${ts}`]]);
    if (!mapped) {
      // A ✅ on something that was never a notice — ordinary channel chatter.
      return res.status(200).json({ ok: true, ignored: 'unknown message' });
    }

    const notice = typeof mapped === 'string' ? JSON.parse(mapped) : mapped;
    await redis(cfg, [
      ['LPUSH', QUEUE_KEY, JSON.stringify({
        ...notice,
        approvedBy: event.user,
        approvedAt: new Date().toISOString(),
        slackTs: ts,
      })],
      ['LTRIM', QUEUE_KEY, '0', String(MAX_QUEUE - 1)],
    ]);

    return res.status(200).json({ ok: true, queued: `${notice.surface}/${notice.key}` });
  } catch {
    // 500 so Slack retries — a lost approval is worse than a duplicate one, and the drain
    // side is idempotent (passing an already-passed component is a no-op).
    return res.status(500).json({ error: 'could not record' });
  }
}
