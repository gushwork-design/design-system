/* ============================================================================
   _bruce-memory.js — what Bruce remembers about each person, and how many runs they have had today (R55 addendum,
   5 Oct 2026).

   MEMORY. Utsav: "we can maintain a memory right?" Each person has a short list of notes in the hub's store
   ("prefers the original logo colour on one-pagers"). The hub puts the notes into the text a Bruce run starts with, and
   the run adds a line or two at the end through this endpoint. The store is private; the repo is public, which is why the
   notes do not live in a GitHub issue the way Alfred's threads do.

   THE TOKEN. The cloud run holds no secret for the store. The hub mints it one: an HMAC over the Slack user id and an
   expiry, signed with the site's session secret, good for a few hours, and only for that one person's notes. Nothing in
   it can read or write anyone else's.

   THE CAP. Everyone may DM Bruce (Utsav: "let's open it for all people"), every run spends his account, so each person
   other than him gets BRUCE_DAILY_CAP runs a day (default 3, his call). The count is per person per day, kept here too.
   ========================================================================= */

import crypto from 'node:crypto';
import { sessionSecret } from './_session.js';

const MAX_NOTES = 30;
const TOKEN_HOURS = 6;

function store() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url, token } : null;
}

async function redis(cfg, commands, f = fetch) {
  const r = await f(`${cfg.url}/pipeline`, { method: 'POST', headers: { authorization: `Bearer ${cfg.token}`, 'content-type': 'application/json' }, body: JSON.stringify(commands) });
  if (!r.ok) throw new Error(`kv ${r.status}`);
  return r.json();
}

/* ---- the per-run token ---- */
export function mintToken(user, now = Date.now(), secret = sessionSecret()) {
  const exp = now + TOKEN_HOURS * 3600e3;
  const sig = crypto.createHmac('sha256', secret).update(`${user}.${exp}`).digest('base64url');
  return `${user}.${exp}.${sig}`;
}

export function readToken(token, now = Date.now(), secret = sessionSecret()) {
  const [user, exp, sig] = String(token || '').split('.');
  if (!user || !exp || !sig || Number(exp) < now) return null;
  const want = crypto.createHmac('sha256', secret).update(`${user}.${exp}`).digest('base64url');
  const a = Buffer.from(sig), b = Buffer.from(want);
  return a.length === b.length && crypto.timingSafeEqual(a, b) ? user : null;
}

/* ---- notes ---- */
export async function readNotes(user, f = fetch) {
  const cfg = store(); if (!cfg) return [];
  const [{ result }] = await redis(cfg, [['LRANGE', `gw:bruce:mem:${user}`, '0', String(MAX_NOTES - 1)]], f);
  return Array.isArray(result) ? result.map(String) : [];
}

export async function addNotes(user, lines, f = fetch) {
  const cfg = store(); if (!cfg) return 0;
  const clean = (lines || []).map((l) => String(l).replace(/\s+/g, ' ').trim().slice(0, 240)).filter(Boolean).slice(0, 5);
  if (!clean.length) return 0;
  const key = `gw:bruce:mem:${user}`, day = new Date().toISOString().slice(0, 10);
  await redis(cfg, [...clean.map((l) => ['LPUSH', key, `${day}: ${l}`]), ['LTRIM', key, '0', String(MAX_NOTES - 1)]], f);
  return clean.length;
}

/* ---- the daily cap ---- */
export function dailyCap() {
  const n = Number(process.env.BRUCE_DAILY_CAP);
  return Number.isFinite(n) && n >= 0 ? n : 3;
}

/* Counts this run. Returns { allowed, used, cap }. With no store, nothing is counted and everyone is allowed. */
export async function takeRun(user, { uncapped = false, f = fetch, now = new Date() } = {}) {
  const cap = dailyCap();
  const cfg = store(); if (!cfg) return { allowed: true, used: 0, cap };
  const day = now.toISOString().slice(0, 10), key = `gw:bruce:runs:${day}`;
  if (uncapped) { await redis(cfg, [['HINCRBY', key, user, '1'], ['EXPIRE', key, '2592000']], f); return { allowed: true, used: 0, cap }; }
  const [{ result }] = await redis(cfg, [['HGET', key, user]], f);
  const used = Number(result) || 0;
  if (used >= cap) return { allowed: false, used, cap };
  await redis(cfg, [['HINCRBY', key, user, '1'], ['EXPIRE', key, '2592000']], f);
  return { allowed: true, used: used + 1, cap };
}

/* ---- the endpoint: GET reads the caller's notes, POST { notes: [...] } adds to them. Bearer = the per-run token. ---- */
export default async function handler(req, res) {
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const user = readToken(token);
  if (!user) return res.status(401).json({ error: 'bad or expired token' });
  try {
    if (req.method === 'GET') return res.status(200).json({ user, notes: await readNotes(user) });
    if (req.method === 'POST') {
      let body = req.body; if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
      const n = await addNotes(user, Array.isArray(body && body.notes) ? body.notes : []);
      return res.status(200).json({ ok: true, added: n });
    }
    return res.status(405).json({ error: 'GET or POST' });
  } catch (e) { return res.status(502).json({ error: String(e.message || e).slice(0, 120) }); }
}
