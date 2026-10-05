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

   STRAIGHT TO MAIN, THEN A ROUTINE (R46). With the token, a decision is committed straight to main (see _review-github.js),
   falling back to the pull request if main refuses it. A rework also fires the rework routine (GW_REWORK_TRIGGER_URL and
   GW_REWORK_TRIGGER_TOKEN: a routine's API trigger), which reads the note, fixes the drawing and opens a pull request; it never
   merges or publishes. If the trigger is not set or fails, the nightly run picks the rework up anyway.

   GET   signed in -> { state }                    what has been decided and not yet published; an owner also gets notes and who
   GET   owner  -> { state }                       what is queued or sent back right now
   POST  owner  {scope,key,action,note,fp}         action: pass | reject | rework | undo
                  reject and rework need a note, because the note is the whole point of both.

   Owners only: the session cookie is verified here, since middleware does not run on /api/*. JSON
   bodies only, so a cross-site form cannot send one without a preflight.
   ========================================================================= */

import { COOKIE, verify, readCookie, sessionSecret } from './_session.js';
import { isOwner } from './_access.js';
import { recordViaGithub, recordDirect, explain, checkGithub, refPath, commitRef } from './_review-github.js';
import { ensureThread, findThread, postComment, ownerComment, readThread, threadTitle, ALFRED } from './_review-thread.js';

const LIST_KEY = 'gw:review-decisions';
const STATE_KEY = 'gw:review-state';
const THREAD_KEY = 'gw:review-threads';   // scope/key -> the GitHub issue number of its thread, so it is looked up once
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

/* Any signed-in session: the page reads the decisions to show an approval live before the next publish. */
async function signedInEmail(req, res) {
  const session = await verify(readCookie(req.headers.cookie, COOKIE), sessionSecret());
  if (!session || !session.email) { json(res, 401, { error: 'Not signed in.' }); return ''; }
  return String(session.email);
}

/* What a reader who is not the owner may see of a decision: the item, the action, when, and the fingerprint it was made against. */
export function publicState(state) {
  const out = {};
  for (const [k, r] of Object.entries(state || {})) out[k] = { action: r.action, at: r.at, fp: r.fp, pfp: r.pfp, via: r.via };
  return out;
}

/* Fire the rework routine. Never throws: a rework is already recorded, and the nightly run is the fallback. */
/* The brief's line about attached reference files: they are in the repo, so the session reads them from its checkout. */
export function refsBrief(refs) {
  return refs && refs.length ? `\nHe attached ${refs.length} reference file${refs.length === 1 ? '' : 's'}; look at ${refs.length === 1 ? 'it' : 'them'} before you start (paths in the repo): ${refs.join(', ')}` : '';
}

/* What Alfred is started with. A send-back names the item, the note and its files; a reply (row.reply) carries Utsav's
   answer. Either way the thread is named, so the run reads the whole conversation first. Pure, so it can be tested. */
export function reworkText(row) {
  const thread = row.thread ? `\nThread: GitHub issue #${row.thread} ("${threadTitle(row.scope, row.key)}"). Read every comment in it first, and end the run with one comment there as ${ALFRED}.` : '';
  if (row.reply) return `REPLY on ${row.scope}/${row.key}. Utsav answered in the thread: ${row.reply}` + thread;
  return `Rework ${row.scope}/${row.key}. Utsav's note: ${row.note}\nThe fingerprint he reviewed: ${row.fp}.` + refsBrief(row.refs) + thread;
}

/* The item's thread number: from the store, else found on GitHub (and made when `make`), then remembered. */
async function threadNumber(cfg, token, scope, key, make) {
  const field = `${scope}/${key}`;
  try { const [{ result }] = await redis(cfg, [['HGET', THREAD_KEY, field]]); if (result) return Number(result); } catch { /* look it up */ }
  const n = make ? await ensureThread(token, scope, key) : await findThread(token, scope, key);
  if (n) { try { await redis(cfg, [['HSET', THREAD_KEY, field, String(n)]]); } catch { /* found again next time */ } }
  return n;
}

export async function fireRework(row, env = process.env, f = fetch) {
  const url = env.GW_REWORK_TRIGGER_URL || '', token = env.GW_REWORK_TRIGGER_TOKEN || '';
  if (!url || !token) return { fired: false, why: 'not set' };
  try {
    const r = await f(url, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', 'anthropic-beta': 'experimental-cc-routine-2026-04-01', 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ text: reworkText(row) }),
    });
    return r.ok ? { fired: true } : { fired: false, why: `status ${r.status}` };
  } catch { return { fired: false, why: 'unreachable' }; }
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
  const note = String(b.note || '').trim().slice(0, 500), fp = String(b.fp || ''), pfp = String(b.pfp || '');
  if (!/^[a-z0-9-]{1,32}$/.test(scope) || !/^[a-z0-9-]{1,80}$/.test(key)) return { ok: false, error: 'Bad item.' };
  if (!ACTIONS.includes(action)) return { ok: false, error: 'Bad action.' };
  if ((action === 'reject' || action === 'rework') && !note) return { ok: false, error: 'Say what is wrong: a note is required.' };
  if (fp && !/^[0-9a-f]{8,64}$/.test(fp)) return { ok: false, error: 'Bad fingerprint.' };
  if (pfp && !/^[0-9a-f]{8,64}$/.test(pfp)) return { ok: false, error: 'Bad fingerprint.' };
  // Reference files must already be in this item's own refs folder (the attach step put them there).
  const refs = Array.isArray(b.refs) ? b.refs.map(String) : [];
  const own = `web/previews/${scope}/refs/${key}/`;
  if (refs.length > MAX_REFS || refs.some((r) => !r.startsWith(own) || !/^[a-z0-9-]+\.?[a-z0-9]*$/.test(r.slice(own.length)) || r.includes('..'))) return { ok: false, error: 'Bad attachment.' };
  if (refs.length && action !== 'rework' && action !== 'reject') return { ok: false, error: 'Attachments go with a send-back or a reject.' };
  const row = { at: now.toISOString(), scope, key, action, note, fp, pfp, by: email };
  if (refs.length) row.refs = refs;
  return { ok: true, row };
}

/* Attachments (5 Oct 2026, Utsav: "add images and files for ref and also allow image paste"). One file per request, so a
   request stays under the function's 4.5 MB body limit; the page shrinks big images first. Kinds a reviewer would attach as
   a reference and that the site can serve safely: images (no SVG, which can carry script), PDFs and plain text. */
export const MAX_REFS = 6;
export const MAX_REF_BYTES = 3 * 1024 * 1024;
const REF_TYPES = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif', 'application/pdf': 'pdf',
  'text/plain': 'txt', 'text/markdown': 'md', 'text/csv': 'csv', 'application/json': 'json' };
export function checkAttachment(body, now = new Date()) {
  const b = body && typeof body === 'object' ? body : {};
  const scope = String(b.scope || ''), key = String(b.key || ''), type = String(b.type || ''), data = String(b.data || '');
  if (!/^[a-z0-9-]{1,32}$/.test(scope) || !/^[a-z0-9-]{1,80}$/.test(key)) return { ok: false, error: 'Bad item.' };
  if (!REF_TYPES[type]) return { ok: false, error: 'Images, PDFs and text files only.' };
  if (!/^[A-Za-z0-9+/]+=*$/.test(data)) return { ok: false, error: 'Bad file.' };
  const bytes = Math.floor(data.length * 3 / 4) - (data.endsWith('==') ? 2 : data.endsWith('=') ? 1 : 0);
  if (!bytes) return { ok: false, error: 'The file is empty.' };
  if (bytes > MAX_REF_BYTES) return { ok: false, error: 'Files over 3 MB are too big.' };
  const n = Math.max(1, Math.min(MAX_REFS, parseInt(b.n, 10) || 1));
  const stamp = now.toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15);
  let name = String(b.name || 'file').replace(/\.[^.]*$/, '') + '.' + REF_TYPES[type];
  return { ok: true, path: refPath(scope, key, stamp, n, name), data, scope, key };
}

export default async function handler(req, res) {
  const plainRead = req.method === 'GET' && !(req.query && req.query.check);
  const email = plainRead ? await signedInEmail(req, res) : await ownerEmail(req, res);
  if (!email) return;
  const owner = isOwner(email);
  const cfg = store();
  if (!cfg) return json(res, 503, { error: 'The store is not connected.' });

  if (req.method === 'GET') {
    // ?check=github: can the token on this site do what a decision needs? Owner only (the guard above).
    if (String((req.query && req.query.check) || '') === 'github') {
      try { return json(res, 200, { github: await checkGithub(process.env.GW_GITHUB_TOKEN || '') }); }
      catch { return json(res, 502, { error: 'Could not run the check.' }); }
    }
    // ?thread=scope/key: the item's conversation with Alfred, read live from GitHub so a new comment shows without a publish.
    const tq = String((req.query && req.query.thread) || '');
    if (tq) {
      const m = /^([a-z0-9-]{1,32})\/([a-z0-9-]{1,80})$/.exec(tq);
      if (!m) return json(res, 400, { error: 'Bad item.' });
      const token = process.env.GW_GITHUB_TOKEN || '';
      if (!token) return json(res, 503, { error: 'Comments need the GitHub token on the site.' });
      try {
        const n = await threadNumber(cfg, token, m[1], m[2], false);
        if (!n) return json(res, 200, { number: null, comments: [] });
        const t = await readThread(token, m[1], m[2]);
        return json(res, 200, t);
      } catch (e) { return json(res, 502, { error: e.status === 403 || e.status === 404 ? 'The site\'s GitHub token cannot read issues yet: give it Issues read and write.' : 'Could not read the thread.' }); }
    }
    try {
      const [{ result }] = await redis(cfg, [['HGETALL', STATE_KEY]]);
      const state = parseState(result);
      return json(res, 200, { state: owner ? state : publicState(state) });
    } catch { return json(res, 502, { error: 'Could not read.' }); }
  }
  if (req.method !== 'POST') return json(res, 405, { error: 'GET or POST only' });
  if (!String(req.headers['content-type'] || '').includes('application/json')) return json(res, 415, { error: 'JSON only.' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = null; } }
  if (body && body.action === 'reply') {
    const scope = String(body.scope || ''), key = String(body.key || ''), text = String(body.text || '').trim().slice(0, 2000);
    if (!/^[a-z0-9-]{1,32}$/.test(scope) || !/^[a-z0-9-]{1,80}$/.test(key)) return json(res, 400, { error: 'Bad item.' });
    if (!text) return json(res, 400, { error: 'Write a reply first.' });
    const token = process.env.GW_GITHUB_TOKEN || '';
    if (!token) return json(res, 503, { error: 'Comments need the GitHub token on the site.' });
    let n, comment;
    try { n = await threadNumber(cfg, token, scope, key, true); comment = await postComment(token, n, ownerComment(text)); }
    catch (e) { return json(res, 502, { error: e.status === 403 || e.status === 404 ? 'The site\'s GitHub token cannot write issues yet: give it Issues read and write.' : 'Could not post the reply.' }); }
    const routine = await fireRework({ scope, key, reply: text, thread: n });
    return json(res, 200, { ok: true, comment, number: n, routine });
  }
  if (body && body.action === 'attach') {
    const a = checkAttachment(body);
    if (!a.ok) return json(res, 400, { error: a.error });
    const token = process.env.GW_GITHUB_TOKEN || '';
    if (!token) return json(res, 503, { error: 'Attachments need the GitHub token on the site.' });
    try { return json(res, 200, { ok: true, ...(await commitRef(token, a.path, a.data, `Review: reference for ${a.scope}/${a.key} (${email})`)) }); }
    catch (e) { return json(res, 502, { error: 'Could not store the attachment. ' + explain(e) }); }
  }
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
        if (prev && prev.via === 'main') {
          // Committed straight to main, so the undo is a commit that puts the record back as it was.
          try { await recordDirect(token, { scope: row.scope, key: row.key }, email, today, true, prev.prev || null); }
          catch { return json(res, 502, { error: 'Could not undo it on main. Nothing was changed.' }); }
          note = 'undone on main';
        } else if (prev && prev.via === 'github') {
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
        const out = await recordDirect(token, row, email, today);
        row.via = 'main'; row.prev = out.prev; row.commit = out.sha;
      } catch {
        // Main refused it (it is protected until the account may bypass the rule), so it goes to the pull request instead.
        try {
          const out = await recordViaGithub(token, row, email, today);
          row.via = 'github'; row.pr = out.pr;
        } catch (e) { githubError = explain(e); }
      }
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
    // A send-back opens (or continues) the item's thread with the note, so Alfred's answer has somewhere to go.
    if (row.action === 'rework' && token) {
      try { row.thread = await threadNumber(cfg, token, row.scope, row.key, true); await postComment(token, row.thread, ownerComment(row.note, row.refs)); }
      catch { row.threadError = 'Could not post the note to the thread (the GitHub token needs Issues read and write).'; }
    }
    const routine = row.action === 'rework' ? await fireRework(row) : null;
    return json(res, 200, { ok: true, decision: row, mode: row.via, githubError, routine });
  } catch { return json(res, 502, { error: 'Could not save the decision.' }); }
}
