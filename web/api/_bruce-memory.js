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

   THE LOG (Utsav, 5 Oct 2026: "create a log for Bruce in the Analytics too"). Every run Bruce is asked for, and every
   ask that hit the cap, is one row in `gw:bruce:log`: when, who (Slack id and display name), their role, what kind of
   turn it was, and the first line of what they asked. The owner reads it on /admin/analytics#bruce, with the same
   session check as the usage log. Slack display names are looked up once and kept in `gw:slack:names`.

   THE CAP. Everyone may DM Bruce (Utsav: "let's open it for all people"), every run spends his account, so each person
   other than him gets BRUCE_DAILY_CAP runs a day (default 3, his call). The count is per person per day, kept here too.
   ========================================================================= */

import crypto from 'node:crypto';
import { sessionSecret, COOKIE, verify, readCookie } from './_session.js';
import { isOwner } from './_access.js';

const MAX_NOTES = 30;
const LOG_KEY = 'gw:bruce:log';
const MAX_LOG = 3000;
const NAMES_KEY = 'gw:slack:names';
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

/* ---- the run log ---- */
/* A person's Slack display name, looked up once with the bot token and kept. Falls back to the id. */
export async function slackName(token, user, f = fetch) {
  const cfg = store();
  if (cfg) {
    try { const [{ result }] = await redis(cfg, [['HGET', NAMES_KEY, user]], f); if (result) return String(result); } catch { /* look it up */ }
  }
  let name = '';
  if (token) {
    try {
      const r = await f(`https://slack.com/api/users.info?user=${encodeURIComponent(user)}`, { headers: { authorization: `Bearer ${token}` } });
      const j = await r.json();
      const u = j && j.ok && j.user;
      name = u ? String((u.profile && (u.profile.display_name || u.profile.real_name)) || u.real_name || u.name || '') : '';
    } catch { /* fall back to the id */ }
  }
  if (name && cfg) { try { await redis(cfg, [['HSET', NAMES_KEY, user, name]], f); } catch { /* fine */ } }
  return name || user;
}

/* One row per turn Bruce was asked for. `kind`: run (a Bruce run started), capped (refused at the daily cap),
   to-alfred (a reply passed to Alfred's thread), failed (the trigger did not fire). Never throws. */
export async function logRun(row, f = fetch) {
  const cfg = store(); if (!cfg) return false;
  const r = { at: new Date().toISOString(), user: String(row.user || ''), name: String(row.name || row.user || ''), role: row.role === 'owner' ? 'owner' : 'teammate',
    kind: String(row.kind || 'run'), thread: row.thread ? 1 : 0, text: String(row.text || '').replace(/\s+/g, ' ').trim().slice(0, 200), used: Number(row.used) || 0 };
  try { await redis(cfg, [['LPUSH', LOG_KEY, JSON.stringify(r)], ['LTRIM', LOG_KEY, '0', String(MAX_LOG - 1)]], f); return true; } catch { return false; }
}

export async function readLog(f = fetch) {
  const cfg = store(); if (!cfg) return null;
  const [{ result }] = await redis(cfg, [['LRANGE', LOG_KEY, '0', String(MAX_LOG - 1)]], f);
  const rows = [];
  for (const raw of result || []) { try { const o = JSON.parse(raw); if (o && o.at) rows.push(o); } catch { /* skip */ } }
  return rows;
}

/* ---- the endpoint: GET reads the caller's notes, POST { notes: [...] } adds to them. Bearer = the per-run token. ---- */
export default async function handler(req, res) {
  // ?log=1: the owner's view of every Bruce turn, for /admin/analytics#bruce. Session cookie, owner only, like the usage log.
  if (req.method === 'GET' && req.query && req.query.log) {
    const session = await verify(readCookie(req.headers.cookie, COOKIE), sessionSecret());
    if (!session || !session.email) return res.status(401).json({ error: 'Not signed in.' });
    if (!isOwner(session.email)) return res.status(403).json({ error: 'Owners only.' });
    try {
      const rows = await readLog();
      if (rows === null) return res.status(200).json({ configured: false, rows: [] });
      return res.status(200).json({ configured: true, rows, owner: String(process.env.OWNER_SLACK_ID || ''), cap: dailyCap() });
    } catch { return res.status(502).json({ error: 'Could not read the log.' }); }
  }
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
