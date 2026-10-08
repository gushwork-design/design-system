/* ============================================================================
   _access-request.js — "Request access" on the restricted page, and Approve / Decline from Slack (R66, 8 Oct 2026).

   FLOW
     restricted page → POST /api/access-request {path}
                    → a DM from Bruce (the hub's Slack app) to the owner, with Approve and Decline
     Approve        → the person is added to a rule for THAT page only (grantPage in _access.js), saved through the
                      same writer the Access Control page uses, the message is updated, and the person gets a Slack
                      DM if their address can be looked up
     the page polls GET /api/access-request?path= and opens itself when the answer is yes

   WHO CAN DO WHAT
     · Asking needs a signed-in Google session. The person is read from the session cookie, never from the body, so
       nobody can ask for access in someone else's name.
     · Only a Slack user in BRUCE_USER_IDS (falling back to OWNER_SLACK_ID) can press the buttons. Slack signs every
       interactive request and _slack-events.js checks that before anything here runs.
     · An owners-only page cannot be granted (owners come from the environment, not the rules): the page offers no
       request, and a request for one is refused here as well.

   A PAGE PRIVATE TO A STAGING LANE (the publisher chose "only my team", rule access 'lane'). The request goes to the lane's
     team as well as the owner: Bruce DMs every member he can find in Slack, with the same Approve and Decline. Any one of them
     can answer, and the others' messages then change to say who did. A lane member is recognised by their Slack email being on
     the lane (canPublish), read live, so pressing the button needs no allow-list entry; the owner can always answer.

   WHAT KEEPS IT QUIET
     · One open request per person per page for 24 hours, and at most ten requests an hour per person. A repeat gets
       the old answer back and sends nothing.
     · The button carries only a random id; the email and the page come from the stored request, not from Slack.

   OFF UNTIL CONFIGURED: with no Slack bot token, owner Slack ID or KV store it answers 503 and the page falls back to a
   plain "Ask the owner" link, so a missing secret is a quieter page, not a broken one.
   ========================================================================= */

import crypto from 'node:crypto';
import { COOKIE, verify, readCookie, sessionSecret } from './_session.js';
import { loadRules, decide, ruleFor, describeAccess, grantPage, saveRules, invalidate, canPublish, laneMembers } from './_access.js';
import { titleFor } from './_restricted-page.js';

export { titleFor };

const SITE = (process.env.SITE_BASE || 'https://design.gushwork.ai').replace(/\/$/, '');
const REQUEST_TTL = 60 * 60 * 24 * 14;     // the record, so a late Approve still works and the page can show the answer
const ASK_TTL = 60 * 60 * 24;              // one open request per person per page per day
const HOURLY_CAP = 10;

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

/* A path as the gate sees it: a clean absolute path, no query, no hash, nothing exotic. Null when it is not one. */
export function normPath(raw) {
  let p = String(raw || '').split('#')[0].split('?')[0].trim();
  if (!p.startsWith('/') || p.startsWith('//') || p.length > 200 || !/^[A-Za-z0-9/_\-.%]+$/.test(p)) return null;
  p = p.replace(/\/+$/, '') || '/';
  return p;
}

/* The DM to the owner. Pure. */
export function requestBlocks({ id, email, path, title, label, at, lane }) {
  const when = new Date(at || Date.now()).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' });
  const who = lane ? `\nIt is private to the *${lane}* team, so anyone on the team (or the owner) can answer.` : '';
  return [
    { type: 'section', text: { type: 'mrkdwn', text: `*Access request*\n*${email}* wants to open *${title}* (\`${path}\`).${who}` } },
    { type: 'context', elements: [{ type: 'mrkdwn', text: `The page is set to: ${label} · signed in with Google · ${when} IST` }] },
    {
      type: 'actions', block_id: `acc:${id}`,
      elements: [
        { type: 'button', action_id: 'gw_access_approve', style: 'primary', value: id, text: { type: 'plain_text', text: 'Approve' },
          confirm: { title: { type: 'plain_text', text: 'Give access?' },
            text: { type: 'mrkdwn', text: `${email} will be able to open *${title}* and nothing else. You can remove them in Access Control.` },
            confirm: { type: 'plain_text', text: 'Approve' }, deny: { type: 'plain_text', text: 'Cancel' } } },
        { type: 'button', action_id: 'gw_access_decline', value: id, text: { type: 'plain_text', text: 'Decline' } },
        { type: 'button', action_id: 'gw_open', text: { type: 'plain_text', text: 'Access Control' }, url: `${SITE}/admin/access-control` },
      ],
    },
  ];
}

/* The message after an answer: the buttons give way to one line. Pure. */
export function answeredBlocks(blocks, id, line) {
  return (blocks || []).map((b) => (b.block_id === `acc:${id}`
    ? { type: 'context', block_id: `done:${id}`, elements: [{ type: 'mrkdwn', text: line }] }
    : b));
}

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

/* The person's Slack DM, best effort: it needs the users:read.email scope, and a person who is not in Slack, or an
   app without that scope, just does not get one. The page still opens by itself when the answer is yes. */
async function tell(token, email, text) {
  try {
    const u = await slack(token, 'users.lookupByEmail', { email }, true);
    await slack(token, 'chat.postMessage', { channel: u.user.id, text });
  } catch { /* nothing to do about it */ }
}

/* Who a Slack user is, by email, best effort. Used to tell whether someone who pressed a button is on the lane. */
async function emailOfSlackUser(token, id) {
  try {
    const r = await fetch(`https://slack.com/api/users.info?user=${encodeURIComponent(id)}`, { headers: { authorization: `Bearer ${token}` } });
    const j = await r.json();
    return j.ok && j.user && j.user.profile && j.user.profile.email ? String(j.user.profile.email).toLowerCase() : '';
  } catch { return ''; }
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
  const session = await sessionOf(req);
  if (!session) return json(res, 401, { error: 'Sign in first.' });
  const email = String(session.email).toLowerCase();

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = null; } }
  const path = normPath(req.method === 'GET' ? (req.query && req.query.path) : (body && body.path));
  if (!path) return json(res, 400, { error: 'That is not a page on this site.' });

  const rules = await loadRules();
  const rule = ruleFor(path, rules);
  if (decide(path, session, rules) !== 'forbid') return json(res, 200, { state: 'allowed' });
  if (!rule || rule.access === 'owner') return json(res, 200, { state: 'none', canRequest: false });

  const cfg = store();
  const token = process.env.SLACK_BOT_TOKEN;
  const owner = String(process.env.OWNER_SLACK_ID || '').split(',')[0].trim();
  const lane = rule.access === 'lane' ? rule.lane : '';
  const by = `gw:accreq:by:${sha(email + '|' + path)}`;

  /* What the page asks on a timer: where does my request stand. */
  if (req.method === 'GET') {
    if (!cfg) return json(res, 200, { state: 'none', canRequest: false });
    try {
      const [g] = await redis(cfg, [['GET', by]]);
      const id = g && g.result;
      if (!id) return json(res, 200, { state: 'none', canRequest: !!(token && owner) });
      const [r] = await redis(cfg, [['GET', `gw:accreq:${id}`]]);
      const rec = r && r.result ? JSON.parse(r.result) : null;
      const state = rec ? ({ open: 'pending', approved: 'approved', declined: 'declined' }[rec.status] || 'none') : 'none';
      return json(res, 200, { state, canRequest: state === 'none' && !!(token && owner) });
    } catch { return json(res, 200, { state: 'none', canRequest: false }); }
  }

  if (!cfg || !token || !owner) return json(res, 503, { error: 'Requests are not set up yet.' });

  try {
    const n = `gw:accreq:n:${sha(email)}`;
    const [count] = await redis(cfg, [['INCR', n], ['EXPIRE', n, 3600, 'NX']]);
    if (count && Number(count.result) > HOURLY_CAP) return json(res, 429, { error: 'That is a lot of requests. Try again in an hour.' });

    const id = crypto.randomBytes(9).toString('hex');
    /* NX: only the first ask of the day goes through; a repeat is told where the first one stands. */
    const [claim] = await redis(cfg, [['SET', by, id, 'EX', ASK_TTL, 'NX']]);
    if (!claim || claim.result !== 'OK') {
      const [g] = await redis(cfg, [['GET', by]]);
      const [r] = await redis(cfg, [['GET', `gw:accreq:${g && g.result}`]]);
      const rec = r && r.result ? JSON.parse(r.result) : null;
      return json(res, 200, { state: rec && rec.status === 'declined' ? 'declined' : 'pending' });
    }

    const at = Date.now();
    const title = titleFor(path);
    const blocks = requestBlocks({ id, email, path, title, label: describeAccess(rule).label, at, lane });
    const text = `Access request: ${email} wants to open ${title}.`;

    /* Who is told: the owner always, and for a lane's page every member Bruce can find in Slack (never the person asking). */
    const dms = [];
    const post = async (channel) => {
      try { const m = await slack(token, 'chat.postMessage', { channel, text, blocks }); dms.push({ channel: m.channel || channel, ts: m.ts }); return true; }
      catch { return false; }
    };
    const ownerOk = await post(owner);
    if (lane) {
      const seen = new Set([owner]);
      for (const member of laneMembers(rules, lane).filter((e) => e !== email).slice(0, 12)) {
        try {
          const u = await slack(token, 'users.lookupByEmail', { email: member }, true);
          if (u.user && u.user.id && !seen.has(u.user.id)) { seen.add(u.user.id); await post(u.user.id); }
        } catch { /* not in Slack, or no email scope: they are simply not told */ }
      }
    }
    if (!dms.length) {
      /* Nothing reached anyone, so nothing is waiting: release the slot and say so. */
      await redis(cfg, [['DEL', by]]).catch(() => {});
      return json(res, 502, { error: 'The request did not reach Slack.' });
    }
    await redis(cfg, [['SET', `gw:accreq:${id}`, JSON.stringify({ email, path, title, at, status: 'open', lane, dms }), 'EX', REQUEST_TTL]]);
    void ownerOk;
    return json(res, 200, { state: 'pending' });
  } catch (e) {
    return json(res, 502, { error: 'The request did not go through.' });
  }
}

/* ── Approve and Decline, called by _slack-actions.js once the sender is known to be the owner ─────────────────── */
/* `owners` is the set of Slack ids that may always answer. Left out, the caller has already checked the sender. */
export async function answerRequest(payload, approve, token, owners = null) {
  const act = (payload.actions || [])[0] || {};
  const id = String(act.value || '');
  if (!/^[a-f0-9]{18}$/.test(id)) return;
  const channel = payload.channel && payload.channel.id, ts = payload.message && payload.message.ts;
  const cfg = store();
  const complain = (text) => slack(token, 'chat.postMessage', { channel, thread_ts: ts, text }).catch(() => {});
  if (!cfg) return complain('The store is not connected, so I could not record that.');

  const [r] = await redis(cfg, [['GET', `gw:accreq:${id}`]]);
  const rec = r && r.result ? JSON.parse(r.result) : null;
  const clicker = payload.user && payload.user.id;
  const blocks = (payload.message && payload.message.blocks) || [];
  /* Every message this request went out in changes together, so nobody else is left holding live buttons. */
  const updateAll = async (line) => {
    const targets = [{ channel, ts }, ...((rec && rec.dms) || []).filter((d) => !(d.channel === channel && d.ts === ts))];
    for (const d of targets) {
      const b = d.channel === channel && d.ts === ts ? blocks
        : requestBlocks({ id, email: rec.email, path: rec.path, title: rec.title, label: '', at: rec.at, lane: rec.lane });
      await slack(token, 'chat.update', { channel: d.channel, ts: d.ts, text: line, blocks: answeredBlocks(b, id, line) }).catch(() => {});
    }
  };
  if (!rec) return slack(token, 'chat.update', { channel, ts, text: 'That request has expired.', blocks: answeredBlocks(blocks, id, 'That request has expired.') }).catch(() => {});

  /* Who may answer: the owner, or (for a lane's page) anyone on that lane, recognised by the email on their Slack account. */
  let who = '';
  if (owners && !owners.has(clicker)) {
    const mail = rec.lane ? await emailOfSlackUser(token, clicker) : '';
    invalidate();
    if (!rec.lane || !mail || !canPublish(mail, rec.lane, await loadRules())) {
      return slack(token, 'chat.postEphemeral', { channel, user: clicker, text: rec.lane ? `Only the ${rec.lane} team can answer this.` : 'Only the owner can answer this.' }).catch(() => {});
    }
    who = mail;
  }
  const byWhom = who ? ` by ${who}` : '';
  if (rec.status !== 'open') return updateAll(`Already ${rec.status}${rec.answeredBy ? ' by ' + rec.answeredBy : ''}.`);

  const set = (status) => redis(cfg, [['SET', `gw:accreq:${id}`, JSON.stringify({ ...rec, status, by: clicker, answeredBy: who || 'the owner', answered: Date.now() }), 'EX', REQUEST_TTL]]);
  const askWho = rec.lane ? `the ${rec.lane} team` : 'Utsav';

  if (!approve) {
    await set('declined');
    await updateAll(`Declined${byWhom} · ${rec.email} was not given ${rec.title}.`);
    await tell(token, rec.email, `Your request to open ${rec.title} on the Gushwork design hub wasn’t approved this time. If you still need it, ask ${askWho}.`);
    return;
  }

  invalidate();
  const rules = await loadRules();
  const grant = grantPage(rules, rec.path, rec.email);
  if (!grant) {
    await set('declined');
    return updateAll(`Not granted · ${rec.title} can’t be opened up this way (it is owners-only or already public).`);
  }
  if (!grant.already) {
    const saved = await saveRules(grant.rules);
    if (!saved.ok) return complain(`That didn’t save: ${saved.error} Nothing changed; you can press Approve again, or add them in <${SITE}/admin/access-control|Access Control>.`);
  }
  await set('approved');
  await updateAll(`Approved${byWhom} · ${rec.email} can open ${rec.title}. They can be removed any time in Access Control.`);
  await tell(token, rec.email, `You can open ${rec.title} on the Gushwork design hub now: ${SITE}${rec.path}`);
}
