/* ============================================================================
   _plugin-access.js — who may USE the plugin, decided here and asked at every session start (R67, 9 Oct 2026).

   WHY. The plugin repo is public, so anyone can install it, and on 1 Oct 2026 three personal addresses did (none of
   them known to the team). The install itself is two Claude Code commands we do not control, so the check cannot
   run during install: it runs at the plugin's first session start, which the plugin owns and already knows the
   email from (scripts/check-access.sh). Utsav's ruling, 9 Oct: keep the repo public; an address outside the
   company is stopped before the skills load and offered two things, uninstall or request access; a request is a
   DM from Bruce to Utsav, and shows on Access Control and Analytics, and can be answered from any of the three.

   STATES, per address
     allowed   the skills load. Every address on the company domain is allowed without a record here.
     pending   asked, not yet answered. The skills stay off; the person is told who will answer.
     denied    answered no, or revoked. The skills stay off and the plugin removes itself on that machine.
     (none)    never seen by this file. The skills stay off and the two options are offered.

   GRANDFATHERED. "Existing outsiders at rollout: allow them" (Utsav, 9 Oct). An address with a usage row from before
   GATE_SINCE is allowed the first time it asks, and recorded as such, so the people who were already using it on the
   day the gate shipped are not interrupted. They can be revoked from Access Control like anyone else.

   WHO CAN DECIDE. Admins and owners, from Access Control or Analytics (session cookie, live rules). From Slack, only
   the owner, because only the owner gets the DM — "admins can too, but slack message only to me".

   WHAT THE PUBLIC HALF TRUSTS. Nothing. The address is self-reported (read from the person's own Claude config), so
   this stops casual outsiders and the install-by-accident, not someone who edits a file. Shape checks, a body cap
   and a per-IP limit, the same honest position _log-usage.js takes.

   FAIL OPEN. No store, or a store that cannot be reached, answers "allowed": a KV outage must not lock the company
   out of its own design system. The plugin side does the same with a network failure.
   ========================================================================= */

import crypto from 'node:crypto';
import { COOKIE, verify, readCookie, sessionSecret } from './_session.js';
import { loadRules, isAdmin, allowedDomain } from './_access.js';

const KEY = 'gw:plugin-access';                 // one hash, field = address, value = JSON record
const USAGE_KEY = 'gw:usage';                   // read once per unknown address, for grandfathering
const SEEN_TTL = 3600;                          // a "not grandfathered" answer is remembered this long
const MAX_BODY = 2048;
const HOURLY_CAP = 6;
const SITE = (process.env.SITE_BASE || 'https://design.gushwork.ai').replace(/\/$/, '');

/* The day the gate shipped. Anyone with a usage row before this is let in without asking. */
export function gateSince() {
  const t = Date.parse(process.env.GW_PLUGIN_GATE_SINCE || '2026-10-10T00:00:00.000Z');
  return Number.isFinite(t) ? t : 0;
}

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
const sha = (s) => crypto.createHash('sha1').update(s).digest('hex').slice(0, 16);

function json(res, status, body) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, private');
  res.status(status).end(JSON.stringify(body));
}

/* An address as this file keys it. Null when it is not one. */
export function normEmail(raw) {
  const e = String(raw || '').trim().toLowerCase();
  if (e.length > 160 || !/^[^\s@"'<>]+@[^\s@"'<>]+\.[a-z]{2,}$/.test(e)) return null;
  return e;
}
export function onDomain(email, domain = allowedDomain()) {
  return !!email && email.slice(email.lastIndexOf('@') + 1) === String(domain).toLowerCase();
}
function clean(value, max = 120) {
  return String(value ?? '').replace(/[\r\n\t]/g, ' ').trim().slice(0, max);
}

/* Best-effort, per-instance, like _log-usage.js. */
const HITS = new Map();
function rateLimited(ip, per, windowMs) {
  const now = Date.now();
  const fresh = (HITS.get(ip) || []).filter((t) => now - t < windowMs);
  fresh.push(now);
  HITS.set(ip, fresh);
  if (HITS.size > 500) for (const [k, v] of HITS) if (!v.some((t) => now - t < windowMs)) HITS.delete(k);
  return fresh.length > per;
}

/* ── records ─────────────────────────────────────────────────────────────── */
async function getRecord(cfg, email) {
  const [r] = await redis(cfg, [['HGET', KEY, email]]);
  if (!r || !r.result) return null;
  try { return JSON.parse(r.result); } catch { return null; }
}
async function putRecord(cfg, email, rec) {
  await redis(cfg, [['HSET', KEY, email, JSON.stringify(rec)]]);
}
export async function listRecords(cfg) {
  const [r] = await redis(cfg, [['HGETALL', KEY]]);
  const flat = (r && r.result) || [];
  const out = [];
  for (let i = 0; i + 1 < flat.length; i += 2) {
    try { out.push({ email: flat[i], ...JSON.parse(flat[i + 1]) }); } catch { /* skip a bad row */ }
  }
  return out.sort((a, b) => (b.at || 0) - (a.at || 0));
}

/* "Seen, not asked" (9 Oct 2026, Utsav: "make the plugin tab also show seen but not asked"): every outside address in
   the usage log that has no record here yet, so the owner can decide before the person ever asks. Pure, so it is
   tested without a store. `since` marks who would be let in on first ask (the grandfather rule). */
export function seenNotAsked(records, usageRows, domain, since = gateSince(), now = Date.now()) {
  const known = new Set(records.map((r) => r.email));
  const by = new Map();
  for (const raw of usageRows || []) {
    let r; try { r = typeof raw === 'string' ? JSON.parse(raw) : raw; } catch { continue; }
    const email = normEmail(r && r.email);
    if (!email || onDomain(email, domain) || known.has(email)) continue;
    const at = Date.parse(r.at); if (!Number.isFinite(at)) continue;
    const u = by.get(email) || { email, state: 'seen', first: at, last: at, version: '', sessions: 0, before: false };
    if (at < u.first) u.first = at;
    if (at >= u.last) { u.last = at; if (r.version) u.version = clean(r.version, 32); }
    if ((r.event || 'session-start') === 'session-start') u.sessions++;
    if (since && at < since) u.before = true;
    by.set(email, u);
  }
  return [...by.values()].filter((u) => now - u.last < 1000 * 60 * 60 * 24 * 90).sort((a, b) => b.last - a.last);
}

/* Was this address using the plugin before the gate shipped? One scan of the usage log, then remembered. */
async function grandfathered(cfg, email) {
  const since = gateSince();
  if (!since) return false;
  const seen = `${KEY}:seen:${sha(email)}`;
  const [s] = await redis(cfg, [['GET', seen]]);
  if (s && s.result) return false;
  const [rows] = await redis(cfg, [['LRANGE', USAGE_KEY, '0', '-1']]);
  const hit = ((rows && rows.result) || []).some((raw) => {
    try {
      const r = JSON.parse(raw);
      return String(r.email || '').trim().toLowerCase() === email && Date.parse(r.at) < since;
    } catch { return false; }
  });
  if (!hit) await redis(cfg, [['SET', seen, '1', 'EX', SEEN_TTL]]).catch(() => {});
  return hit;
}

/* The one answer the plugin needs. */
export async function statusOf(cfg, email, { version = '' } = {}) {
  if (onDomain(email)) return { state: 'allowed', why: 'domain' };
  if (!cfg) return { state: 'allowed', why: 'unconfigured' };
  const rec = await getRecord(cfg, email);
  if (rec && rec.state) return { state: rec.state, why: rec.by || '' };
  if (await grandfathered(cfg, email)) {
    await putRecord(cfg, email, { state: 'allowed', at: Date.now(), by: 'grandfathered', version: clean(version, 32) });
    return { state: 'allowed', why: 'grandfathered' };
  }
  return { state: 'none' };
}

/* ── Slack ───────────────────────────────────────────────────────────────── */
async function slack(token, method, body, form = false) {
  const r = await fetch(`https://slack.com/api/${method}`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': form ? 'application/x-www-form-urlencoded' : 'application/json; charset=utf-8' },
    body: form ? new URLSearchParams(body).toString() : JSON.stringify(body),
  });
  const j = await r.json().catch(() => ({}));
  if (!j.ok) throw new Error(`slack ${method}: ${j.error || r.status}`);
  return j;
}

/* The DM to the owner. Pure. */
export function pluginRequestBlocks({ id, email, version, note, at, sessions }) {
  const when = new Date(at || Date.now()).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' });
  const facts = [`Plugin ${version || 'unknown version'}`, sessions ? `${sessions} session${sessions === 1 ? '' : 's'} so far` : 'first session', `${when} IST`].join(' · ');
  return [
    { type: 'section', text: { type: 'mrkdwn', text: `*Plugin access request*\n*${email}* is outside the company and wants to use the design system plugin.${note ? `\n> ${note}` : ''}` } },
    { type: 'context', elements: [{ type: 'mrkdwn', text: facts }] },
    {
      type: 'actions', block_id: `plug:${id}`,
      elements: [
        { type: 'button', action_id: 'gw_plugin_approve', style: 'primary', value: id, text: { type: 'plain_text', text: 'Allow' },
          confirm: { title: { type: 'plain_text', text: 'Allow the plugin?' },
            text: { type: 'mrkdwn', text: `${email} will be able to use the skills on their machine. You can revoke it in Access Control.` },
            confirm: { type: 'plain_text', text: 'Allow' }, deny: { type: 'plain_text', text: 'Cancel' } } },
        { type: 'button', action_id: 'gw_plugin_deny', style: 'danger', value: id, text: { type: 'plain_text', text: 'Deny' },
          confirm: { title: { type: 'plain_text', text: 'Deny and remove?' },
            text: { type: 'mrkdwn', text: `The plugin will uninstall itself on ${email}'s machine at their next session.` },
            confirm: { type: 'plain_text', text: 'Deny' }, deny: { type: 'plain_text', text: 'Cancel' } } },
        { type: 'button', action_id: 'gw_open', text: { type: 'plain_text', text: 'Access Control' }, url: `${SITE}/admin/access-control#plugin` },
      ],
    },
  ];
}
export function pluginAnsweredBlocks(blocks, id, line) {
  return (blocks || []).map((b) => (b.block_id === `plug:${id}`
    ? { type: 'context', block_id: `done:${id}`, elements: [{ type: 'mrkdwn', text: line }] }
    : b));
}

/* Every DM this request went out in says the same thing once it is answered. */
async function settleMessages(token, rec, id, line) {
  if (!token || !rec || !Array.isArray(rec.dms)) return;
  for (const d of rec.dms) {
    const b = pluginRequestBlocks({ id, email: rec.email, version: rec.version, note: rec.note, at: rec.at, sessions: rec.sessions });
    await slack(token, 'chat.update', { channel: d.channel, ts: d.ts, text: line, blocks: pluginAnsweredBlocks(b, id, line) }).catch(() => {});
  }
}

/* One decision, from anywhere. `by` is who decided (an email, or 'slack'). */
export async function decideAccess(cfg, email, decision, by, token) {
  const rec = (await getRecord(cfg, email)) || { at: Date.now() };
  const id = rec.id || sha(email);
  if (decision === 'clear') {
    await redis(cfg, [['HDEL', KEY, email]]);
    await settleMessages(token, { ...rec, email }, id, `Forgotten · ${email} will be asked again next time.`);
    return { state: 'none' };
  }
  const state = decision === 'allow' ? 'allowed' : 'denied';
  const { email: _own, ...rest } = rec;                 // the address is the hash field, not part of the value
  await putRecord(cfg, email, { ...rest, id, state, decidedAt: Date.now(), by, at: rec.at || Date.now() });
  const line = state === 'allowed'
    ? `Allowed by ${by} · ${email} can use the plugin. Revoke it any time in <${SITE}/admin/access-control#plugin|Access Control>.`
    : `Denied by ${by} · the plugin removes itself on ${email}'s machine at their next session.`;
  await settleMessages(token, { ...rec, email }, id, line);
  return { state };
}

/* ── Approve and Deny from Slack, called by _slack-actions.js once the sender is known to be the owner ─────── */
export async function answerPluginRequest(payload, approve, token) {
  const act = (payload.actions || [])[0] || {};
  const id = String(act.value || '');
  if (!/^[a-f0-9]{16}$/.test(id)) return;
  const channel = payload.channel && payload.channel.id, ts = payload.message && payload.message.ts;
  const cfg = store();
  const complain = (text) => slack(token, 'chat.postMessage', { channel, thread_ts: ts, text }).catch(() => {});
  if (!cfg) return complain('The store is not connected, so I could not record that.');
  const [m] = await redis(cfg, [['GET', `${KEY}:id:${id}`]]);
  const email = m && m.result ? String(m.result) : '';
  const blocks = (payload.message && payload.message.blocks) || [];
  if (!email) return slack(token, 'chat.update', { channel, ts, text: 'That request has expired.', blocks: pluginAnsweredBlocks(blocks, id, 'That request has expired.') }).catch(() => {});
  const rec = await getRecord(cfg, email);
  if (rec && rec.state !== 'pending') {
    const line = `Already ${rec.state}${rec.by ? ' by ' + rec.by : ''}.`;
    return slack(token, 'chat.update', { channel, ts, text: line, blocks: pluginAnsweredBlocks(blocks, id, line) }).catch(() => {});
  }
  const name = (payload.user && (payload.user.name || payload.user.username)) || 'the owner';
  await decideAccess(cfg, email, approve ? 'allow' : 'deny', name, token);
}

/* ── sessions for the DM's context line: how many session rows this address has ─────────────────────────── */
async function sessionCount(cfg, email) {
  try {
    const [rows] = await redis(cfg, [['LRANGE', USAGE_KEY, '0', '-1']]);
    return ((rows && rows.result) || []).reduce((n, raw) => {
      try { const r = JSON.parse(raw); return n + (String(r.email || '').toLowerCase() === email && (r.event || 'session-start') === 'session-start' ? 1 : 0); }
      catch { return n; }
    }, 0);
  } catch { return 0; }
}

async function sessionOf(req) {
  const s = await verify(readCookie(req.headers.cookie, COOKIE), sessionSecret());
  return s && s.email ? s : null;
}

/* ── the endpoint ─────────────────────────────────────────────────────── */
export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return json(res, 405, { error: 'Use GET or POST.' });
  }
  const cfg = store();
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  const q = req.query || {};

  /* ADMIN HALF: the list, and decisions. Needs a signed-in admin, checked against the live rules. */
  if (q.list !== undefined || (req.method === 'POST' && q.decide !== undefined)) {
    const session = await sessionOf(req);
    if (!session) return json(res, 401, { error: 'Sign in first.' });
    const me = String(session.email).toLowerCase();
    const rules = await loadRules();
    if (!isAdmin(me, rules)) return json(res, 403, { error: 'Admins only.' });
    if (!cfg) return json(res, 200, { configured: false, domain: allowedDomain(), since: gateSince(), people: [] });
    if (req.method === 'GET') {
      try {
        const people = await listRecords(cfg);
        const [rows] = await redis(cfg, [['LRANGE', USAGE_KEY, '0', '-1']]);
        const seen = seenNotAsked(people, (rows && rows.result) || [], allowedDomain());
        return json(res, 200, { configured: true, domain: allowedDomain(), since: gateSince(), people: people.concat(seen) });
      } catch { return json(res, 502, { error: 'Could not read the list.' }); }
    }
    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = null; } }
    const email = normEmail(body && body.email);
    const decision = String((body && body.decision) || '');
    if (!email || !['allow', 'deny', 'clear'].includes(decision)) return json(res, 400, { error: 'Say who, and allow, deny or clear.' });
    if (onDomain(email)) return json(res, 400, { error: 'Everyone at ' + allowedDomain() + ' is allowed already.' });
    try {
      const out = await decideAccess(cfg, email, decision, me, process.env.SLACK_BOT_TOKEN);
      return json(res, 200, { ok: true, email, ...out });
    } catch { return json(res, 502, { error: 'Could not save that.' }); }
  }

  /* PUBLIC HALF: the plugin asking where it stands, and asking for access. */
  if (req.method === 'GET') {
    if (rateLimited(ip, 120, 5 * 60 * 1000)) return json(res, 429, { error: 'slow down' });
    const email = normEmail(q.email);
    if (!email) return json(res, 400, { error: 'bad email' });
    try {
      const out = await statusOf(cfg, email, { version: q.v });
      return json(res, 200, { email, state: out.state, domain: allowedDomain() });
    } catch {
      /* Fail open, and say so: the plugin treats this like a network failure. */
      return json(res, 200, { email, state: 'allowed', why: 'unreachable', domain: allowedDomain() });
    }
  }

  if (rateLimited(ip, HOURLY_CAP, 60 * 60 * 1000)) return json(res, 429, { error: 'That is a lot of requests. Try again in an hour.' });
  let body = req.body;
  if (typeof body === 'string') {
    if (body.length > MAX_BODY) return json(res, 413, { error: 'too large' });
    try { body = JSON.parse(body); } catch { return json(res, 400, { error: 'bad json' }); }
  }
  if (!body || typeof body !== 'object') return json(res, 400, { error: 'bad body' });
  const email = normEmail(body.email);
  if (!email) return json(res, 400, { error: 'bad email' });
  if (onDomain(email)) return json(res, 200, { email, state: 'allowed' });
  const token = process.env.SLACK_BOT_TOKEN;
  const owner = String(process.env.OWNER_SLACK_ID || '').split(',')[0].trim();
  if (!cfg) return json(res, 200, { email, state: 'allowed' });              // nowhere to record a request: fail open
  try {
    const current = await statusOf(cfg, email, { version: body.version });
    if (current.state !== 'none') return json(res, 200, { email, state: current.state });
    const id = sha(email + '|' + Date.now());
    const rec = {
      state: 'pending', id, at: Date.now(),
      version: clean(body.version, 32), note: clean(body.note, 280),
      sessions: await sessionCount(cfg, email), dms: [],
    };
    if (token && owner) {
      const blocks = pluginRequestBlocks({ id, email, version: rec.version, note: rec.note, at: rec.at, sessions: rec.sessions });
      try {
        const m = await slack(token, 'chat.postMessage', { channel: owner, text: `Plugin access request from ${email}.`, blocks });
        rec.dms.push({ channel: m.channel || owner, ts: m.ts });
      } catch { /* the request still stands: it shows on Access Control and Analytics */ }
    }
    await redis(cfg, [['HSET', KEY, email, JSON.stringify(rec)], ['SET', `${KEY}:id:${id}`, email, 'EX', 60 * 60 * 24 * 30]]);
    return json(res, 200, { email, state: 'pending', told: rec.dms.length > 0 });
  } catch {
    return json(res, 502, { error: 'The request did not go through.' });
  }
}
