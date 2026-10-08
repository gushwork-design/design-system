/* =========================================================================
   Gushwork Agent Studio: browser push notifications.

   Not a function of its own (Hobby's 12-function cap): _drop-studio.js imports this, and gw.js dispatches.

   FLOW. A person who made a request taps "Notify me" in Studio; the browser makes a push subscription and the page
   sends it to op=subscribe, which keeps it under their email. When ChatGPT finishes (or asks a question) GitHub calls
   op=hook; the hub re-reads the issue from GitHub itself, finds who requested it, and sends one push to each of that
   person's devices. The page's service worker (drop-studio/sw.js) shows it and opens the agent when it is tapped.

   KEYS. VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY (a pair made once, `npx web-push generate-vapid-keys`), and
   VAPID_SUBJECT (a mailto: address, default design@gushwork.ai). With no keys the page hides the button and every
   op here answers "not configured" rather than failing.

   STORE. The hub's Upstash store (the same one the other modules use): one hash per person, `drop:push:<email>`,
   field = the browser's endpoint, value = the subscription. A device whose push service says 404 or 410 (gone) is
   dropped on the next send. At most 5 devices per person; the oldest is replaced.

   web-push is imported inside the send, the same way @vercel/blob is elsewhere, so a failure to load it cannot take
   other routes down.
   ========================================================================= */

const MAX_DEVICES = 5;
const DEDUPE_SECONDS = 7 * 24 * 3600;

const store = () => {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url, token } : null;
};

async function pipe(cmds) {
  const cfg = store();
  if (!cfg) throw new Error('no store');
  const r = await fetch(`${cfg.url}/pipeline`, {
    method: 'POST',
    headers: { authorization: `Bearer ${cfg.token}`, 'content-type': 'application/json' },
    body: JSON.stringify(cmds),
  });
  if (!r.ok) throw new Error(`kv ${r.status}`);
  return r.json();
}

export const publicKey = () => process.env.VAPID_PUBLIC_KEY || '';
export const configured = () => !!(publicKey() && process.env.VAPID_PRIVATE_KEY && store());

const hashKey = (email) => `drop:push:${String(email).toLowerCase()}`;

/* A subscription from the browser, or null. Nothing else from the browser is kept. */
export function cleanSubscription(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const endpoint = typeof raw.endpoint === 'string' ? raw.endpoint : '';
  const k = raw.keys || {};
  if (!/^https:\/\/[^\s]{8,600}$/.test(endpoint)) return null;
  if (typeof k.p256dh !== 'string' || typeof k.auth !== 'string') return null;
  if (k.p256dh.length > 200 || k.auth.length > 60) return null;
  return { endpoint, keys: { p256dh: k.p256dh, auth: k.auth } };
}

export async function saveSubscription(email, sub) {
  const key = hashKey(email);
  const all = (await pipe([['HGETALL', key]]))[0].result;
  const fields = [];
  for (let i = 0; i < (all || []).length; i += 2) fields.push(all[i]);
  const cmds = [];
  if (!fields.includes(sub.endpoint) && fields.length >= MAX_DEVICES) cmds.push(['HDEL', key, ...fields.slice(0, fields.length - MAX_DEVICES + 1)]);
  cmds.push(['HSET', key, sub.endpoint, JSON.stringify(sub)]);
  await pipe(cmds);
}

export async function removeSubscription(email, endpoint) {
  await pipe([['HDEL', hashKey(email), String(endpoint)]]);
}

async function subscriptionsOf(email) {
  const all = (await pipe([['HGETALL', hashKey(email)]]))[0].result;
  const out = [];
  for (let i = 1; i < (all || []).length; i += 2) { try { out.push(JSON.parse(all[i])); } catch { /* skip a bad row */ } }
  return out;
}

/* True the first time a key is seen in a week. GitHub can send the same event twice. */
export async function firstTime(key) {
  const set = (await pipe([['SET', key, '1', 'NX', 'EX', DEDUPE_SECONDS]]))[0].result;
  return set === 'OK';
}

/* The text of a notification. Plain words: no GitHub, no issue numbers. */
export function message(kind, name, agentId) {
  const url = `/internal/staging/drop-studio/?agent=${encodeURIComponent(agentId)}`;
  if (kind === 'needs-input') return { title: 'ChatGPT has a question', body: `${name} needs an answer before the picture can be made.`, url, tag: `drop-${agentId}` };
  return { title: 'Your picture is ready', body: `${name} is ready to review.`, url, tag: `drop-${agentId}` };
}

let sender = async (sub, payload) => {
  const webpush = (await import('web-push')).default;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:design@gushwork.ai', publicKey(), process.env.VAPID_PRIVATE_KEY);
  return webpush.sendNotification(sub, JSON.stringify(payload), { TTL: 24 * 3600, urgency: 'normal' });
};
export const _setSender = (fn) => { sender = fn; };

/* Sends to every device of one person. Returns how many were delivered. */
export async function notifyUser(email, payload) {
  const subs = await subscriptionsOf(email);
  let sent = 0;
  for (const sub of subs) {
    try { await sender(sub, payload); sent++; }
    catch (e) {
      if (e && (e.statusCode === 404 || e.statusCode === 410)) await removeSubscription(email, sub.endpoint).catch(() => {});
    }
  }
  return sent;
}
