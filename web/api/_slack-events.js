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
import { handleMessage } from './_concierge.js';
import { handleAction } from './_slack-actions.js';

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

  /* BUTTONS AND FORMS (R55 addendum). Slack posts interactive payloads form-encoded, as payload=<json>, to this same URL
     (the app's Interactivity Request URL). Signed like events, so the signature is checked first. */
  if (raw.startsWith('payload=')) {
    if (!signatureValid(req, raw)) return res.status(401).json({ error: 'bad signature' });
    let ip;
    try { ip = JSON.parse(new URLSearchParams(raw).get('payload') || ''); } catch { return res.status(400).json({ error: 'bad payload' }); }
    const allowed = new Set(String(process.env.BRUCE_USER_IDS || process.env.OWNER_SLACK_ID || '').split(',').map((x) => x.trim()).filter(Boolean));
    const { ownerEmails } = await import('./_access.js');
    const { recordDecision } = await import('./_review.js');
    const cfg = store();
    const email = String(process.env.OWNER_EMAIL || ownerEmails()[0] || '');
    let out;
    try {
      out = await handleAction(ip, { token: process.env.SLACK_BOT_TOKEN, allowed, email, root: process.cwd(),
        record: (body, who) => (cfg ? recordDecision(cfg, body, who) : [503, { error: 'the store is not connected' }]) });
    } catch (e) { console.warn('[slack-actions]', String(e.message || e).slice(0, 200)); }
    return out ? res.status(200).json(out) : res.status(200).end();
  }

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

  /* AGENT MODE (R55 addendum, 6 Oct 2026). With Slack's Agents feature on, Bruce also lives in the agent pane. Each
     conversation there is a thread in his DM, so the message.im path below already carries it; these are the extra events.
     Opening the pane (app_home_opened, tab messages) gets the suggested prompts. The rest are acknowledged and dropped:
     a stop button press cannot stop a cloud run that has already started, and a renamed session needs nothing from us. */
  if (event.type === 'app_home_opened') {
    if (req.headers['x-slack-retry-num']) return res.status(200).json({ ok: true, ignored: 'retry' });
    const token = process.env.SLACK_BOT_TOKEN;
    if (!token || event.tab !== 'messages' || !event.channel) return res.status(200).json({ ok: true, ignored: 'not the agent pane' });
    const { suggestPrompts } = await import('./_concierge.js');
    const did = await suggestPrompts(token, event.channel);
    return res.status(200).json({ ok: true, prompts: did });
  }
  if (event.type === 'app_context_changed' || event.type === 'agent_session_stopped' || event.type === 'agent_session_title_changed') {
    return res.status(200).json({ ok: true, ignored: event.type });
  }

  /* BRUCE THE CONCIERGE (see _concierge.js). The same Slack app answers people who @Bruce in a channel or DM him: it hands
     over brand assets and points at templates and tools. No model is called. Slack redelivers an event it thinks was not
     acknowledged in 3 seconds, so retries are acknowledged and dropped, and the event id is remembered for an hour. */
  if (event.type === 'app_mention' || (event.type === 'message' && event.channel_type === 'im')) {
    if (req.headers['x-slack-retry-num']) return res.status(200).json({ ok: true, ignored: 'retry' });
    const token = process.env.SLACK_BOT_TOKEN;
    if (!token) return res.status(200).json({ ok: true, ignored: 'no bot token' });
    const cfg = store();
    if (cfg && payload.event_id) {
      try {
        const [{ result }] = await redis(cfg, [['SET', `gw:slack:ev:${payload.event_id}`, '1', 'NX', 'EX', '3600']]);
        if (result !== 'OK') return res.status(200).json({ ok: true, ignored: 'duplicate' });
      } catch { /* no dedupe is better than no answer */ }
    }
    const owners = new Set((process.env.SLACK_REVIEWER_IDS || '').split(',').map((x) => x.trim()).filter(Boolean));
    // Who gets Bruce proper in a DM. Utsav only for now; BRUCE_USER_IDS opens it to more people later without a code change.
    // Empty = everyone may DM Bruce (5 Oct 2026). A list narrows it.
    const bruceUsers = new Set(String(process.env.BRUCE_USER_IDS || '').split(',').map((x) => x.trim()).filter(Boolean));
    const memory = await import('./_bruce-memory.js');
    const out = await handleMessage(event, { token, root: process.cwd(), owners, bruceUsers, ownerId: String(process.env.OWNER_SLACK_ID || '').trim(), memory, agent: true });
    if (out.did === 'error') console.warn('[concierge]', out.error);
    return res.status(200).json({ ok: true, concierge: out.did });
  }

  // A thumbs-up (or ✅, 🙏) on one of Bruce's messages in a DM ends that conversation (6 Oct 2026). Review notices live in
  // channels, so a DM reaction never collides with the ✅ loop below.
  if (event.type === 'reaction_added' && event.item && /^D/.test(event.item.channel || '')) {
    const token = process.env.SLACK_BOT_TOKEN;
    if (!token || req.headers['x-slack-retry-num']) return res.status(200).json({ ok: true, ignored: 'dm reaction' });
    const { closeOnReaction } = await import('./_concierge.js');
    const memory = await import('./_bruce-memory.js');
    let closed = false;
    try { closed = await closeOnReaction(token, event, memory); } catch { /* a missed close is harmless */ }
    return res.status(200).json({ ok: true, concierge: closed ? 'closed' : 'ignored' });
  }

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
