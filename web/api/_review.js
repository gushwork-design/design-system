/* ============================================================================
   review.js — the owner's Pass / Rework / Reject buttons.

   WHAT A BUTTON CAN AND CANNOT DO. A pass is recorded in the repo's registry with a fingerprint of
   what was reviewed (scripts/review-pass.sh), and the repo's main branch needs a reviewed PR. A
   serverless function can do neither of those, and the fingerprint check has to happen where the
   source is. So a button does what the Slack ✅ does: it QUEUES the decision here, and the next
   Claude session applies it (scripts/check-approvals.sh reads the queue at session start).

   Two keys in the store:
     gw:review-decisions   list   every decision, newest first; what a session drains
     gw:review-state       hash   "scope/key" -> the latest decision, so the page can show "approved,
                                  being recorded" the moment the button is pressed, and an UNDO can
                                  withdraw it: a queued row only counts while its `at` is still the
                                  one in this hash.

   With GW_GITHUB_TOKEN set (see _review-github.js) a Pass, Rework or Reject is committed to ONE open pull request
   (`review/decisions`) by the site itself, and the row carries the pull request's number. Without the token, or if
   GitHub fails, it falls back to the queue above, so a decision is never lost.

   GET   owner  -> { state }                       what is queued or sent back right now
   POST  owner  {scope,key,action,note,fp}         action: pass | reject | rework | undo
                  reject and rework need a note, because the note is the whole point of both.

   Owners only: the session cookie is verified here, since middleware does not run on /api/*. JSON
   bodies only, so a cross-site form cannot send one without a preflight.
   ========================================================================= */

import { COOKIE, verify, readCookie, sessionSecret } from './_session.js';
import { isOwner } from './_access.js';
import { recordViaGithub } from './_review-github.js';

const LIST_KEY = 'gw:review-decisions';
const STATE_KEY = 'gw:review-state';
const MAX_LIST = 500;
const ACTIONS = ['pass', 'reject', 'rework', 'undo'];

function store() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url, token } : null;
}

async function redis(cfg, commands) {
  const r = await fetch(`${cfg.url}/pipeline`, {
    method: 'POST',
    headers: { authorization: `Bearer ${cfg.token}`, 'content-type': 'application/json' },
    body: JSON.stringify(commands),
  });
  if (!r.ok) throw new Error(`kv ${r.status}`);
  return r.json();
}

function json(res, status, body) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, private');
  res.status(status).end(JSON.stringify(body));
}

async function ownerEmail(req, res) {
  const session = await verify(readCookie(req.headers.cookie, COOKIE), sessionSecret());
  if (!session || !session.email) { json(res, 401, { error: 'Not signed in.' }); return ''; }
  if (!isOwner(session.email)) { json(res, 403, { error: 'Owners only.' }); return ''; }
  return String(session.email);
}

/* Parse the HGETALL pairs Upstash returns ([field, value, field, value, ...]). */
export function parseState(flat) {
  const out = {};
  for (let i = 0; i + 1 < (flat || []).length; i += 2) {
    try { out[flat[i]] = typeof flat[i + 1] === 'string' ? JSON.parse(flat[i + 1]) : flat[i + 1]; } catch { /* skip a bad row */ }
  }
  return out;
}

/* Validate a POST body. Returns { ok, row } or { ok: false, error }. Pure, so it can be tested. */
export function checkDecision(body, email, now = new Date()) {
  const b = body && typeof body === 'object' ? body : {};
  const scope = String(b.scope || ''), key = String(b.key || ''), action = String(b.action || '');
  const note = String(b.note || '').trim().slice(0, 500), fp = String(b.fp || '');
  if (!/^[a-z0-9-]{1,32}$/.test(scope) || !/^[a-z0-9-]{1,80}$/.test(key)) return { ok: false, error: 'Bad item.' };
  if (!ACTIONS.includes(action)) return { ok: false, error: 'Bad action.' };
  if ((action === 'reject' || action === 'rework') && !note) return { ok: false, error: 'Say what is wrong: a note is required.' };
  if (fp && !/^[0-9a-f]{8,64}$/.test(fp)) return { ok: false, error: 'Bad fingerprint.' };
  return { ok: true, row: { at: now.toISOString(), scope, key, action, note, fp, by: email } };
}

export default async function handler(req, res) {
  const email = await ownerEmail(req, res);
  if (!email) return;
  const cfg = store();
  if (!cfg) return json(res, 503, { error: 'The store is not connected.' });

  if (req.method === 'GET') {
    try {
      const [{ result }] = await redis(cfg, [['HGETALL', STATE_KEY]]);
      return json(res, 200, { state: parseState(result) });
    } catch { return json(res, 502, { error: 'Could not read.' }); }
  }
  if (req.method !== 'POST') return json(res, 405, { error: 'GET or POST only' });
  if (!String(req.headers['content-type'] || '').includes('application/json')) return json(res, 415, { error: 'JSON only.' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = null; } }
  const v = checkDecision(body, email);
  if (!v.ok) return json(res, 400, { error: v.error });
  const { row } = v;
  const field = `${row.scope}/${row.key}`;
  const token = process.env.GW_GITHUB_TOKEN || '';
  const today = row.at.slice(0, 10);
  try {
    if (row.action === 'undo') {
      let note = '';
      if (token) {
        // An undo of something that went to GitHub has to come out of the pull request too, or it would merge anyway.
        const [{ result }] = await redis(cfg, [['HGET', STATE_KEY, field]]);
        let prev = null;
        try { prev = result ? JSON.parse(result) : null; } catch { /* none */ }
        if (prev && prev.via === 'github') {
          try { await recordViaGithub(token, { scope: row.scope, key: row.key }, email, today, true); }
          catch { return json(res, 502, { error: 'Could not take it out of the pull request. Nothing was changed.' }); }
          note = 'reverted in the pull request';
        }
      }
      await redis(cfg, [['HDEL', STATE_KEY, field]]);
      return json(res, 200, { ok: true, undone: field, note });
    }

    let githubError = '';
    if (token && row.fp) {
      try {
        const out = await recordViaGithub(token, row, email, today);
        row.via = 'github'; row.pr = out.pr;
      } catch (e) { githubError = e && e.status ? `GitHub said ${e.status}` : 'GitHub could not be reached'; }
    }
    row.via = row.via || 'queue';
    // Recorded in a pull request: only the state is kept, for the page. A rework is ALSO queued, because the next session
    // needs the note as its brief (it will not record it again; the hook knows `via` is github).
    const cmds = [['HSET', STATE_KEY, field, JSON.stringify(row)]];
    if (row.via === 'queue' || row.action === 'rework') {
      cmds.unshift(['LTRIM', LIST_KEY, '0', String(MAX_LIST - 2)]);
      cmds.unshift(['LPUSH', LIST_KEY, JSON.stringify(row)]);
    }
    await redis(cfg, cmds);
    return json(res, 200, { ok: true, decision: row, mode: row.via, githubError });
  } catch { return json(res, 502, { error: 'Could not save the decision.' }); }
}
