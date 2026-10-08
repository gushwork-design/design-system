/* ============================================================================
   _drop-studio.js — Drop Studio's link to the private drop-reference repo.

   Served as /api/drop-studio, a module behind gw.js like its neighbours, so it costs no new function against the
   Hobby plan's 12.

   WHAT IT DOES. Drop Studio asks ChatGPT for a Drop picture by opening an ISSUE in the private drop-reference repo.
   A scheduled ChatGPT task reads open `image-request` issues, generates the picture from the repo's masters, commits it
   to explorations/agents/<agent-id>-v<N>.png, comments, labels the issue `image-ready` and closes it. This module is the
   Studio half of that contract (drop-studio/image-request-contract.md): it writes the requests, reads the answers, and
   promotes an accepted picture into masters/. It has no state of its own: every status is derived from the issues and
   the repo's file tree, so the repo stays the source of truth.

   ONE TOKEN. DROP_REFERENCE_TOKEN is a fine-grained token for that one repository with Contents and Issues set to Read
   and write. DROP_REFERENCE_REPO overrides the default owner/name. With no token every read answers
   {configured:false} and every write is refused with 503, so the page works exactly as it did before phase 2.

   WHO. The same gate as the page: decide() on the tool's path, so adding marketing in Access Control carries over to
   this API with no code change. Making a request and answering ChatGPT's question are open to everyone the gate lets
   in; accepting, changing or discarding a picture is the owner's alone, because accepting writes into masters/ and
   AGENTS.md says masters change only on explicit approval.

   THE PICTURES ARE PRIVATE. The repo is private, so the browser cannot load them. `op=image` streams one file, and only
   from two folders and only a .png (masters/agent-portrait-*, explorations/agents/<id>-v<N>), never the 7 MB material
   master or anything else in the repo.
   ========================================================================= */

import { COOKIE, verify, readCookie, sessionSecret } from './_session.js';
import { loadRules, decide, isOwner } from './_access.js';
import { timingSafeEqual } from 'node:crypto';
import * as push from './_drop-push.js';

/* One path, the one that has an Access Control rule. A second path with no rule of its own would inherit the broad
   /internal rule and let every internal account in. When the page goes live, move the rule and change this together. */
const TOOL_PATH = '/internal/staging/drop-studio';
const WORK_LABELS = ['image-request', 'image-ready', 'needs-input', 'accepted', 'discarded', 'revision'];
const POSES = ['standing', 'hovering', 'seated', 'auto'];
const ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const IMG_RE = /^(?:masters\/agent-portrait-[a-z0-9]+(?:-[a-z0-9]+)*|explorations\/agents\/[a-z0-9]+(?:-[a-z0-9]+)*-v\d+)\.png$/;
const CAND_RE = /^explorations\/agents\/([a-z0-9]+(?:-[a-z0-9]+)*)-v(\d+)\.png$/;
const MASTER_RE = /^masters\/agent-portrait-([a-z0-9]+(?:-[a-z0-9]+)*)\.png$/;
const MAX = { name: 80, does: 400, bundle: 60, prop: 60, notes: 600, answer: 800 };

/* The repo moved from gushwork-design-id/drop-reference to the org on or before 9 Oct 2026; a token scoped to the old owner gets 404 from the new address. */
const repo = () => process.env.DROP_REFERENCE_REPO || 'gushwork-design/drop-reference';
const token = () => process.env.DROP_REFERENCE_TOKEN || '';

/* ── pure pieces (tested in scripts/drop-studio.test.mjs) ─────────────────────────────────────────────────────────── */

export const slug = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40).replace(/-+$/g, '');
/* masters/agent-portrait-seo.png belongs to seo-agent: the role is the id without a trailing -agent. */
export const roleOf = (id) => String(id).replace(/-agent$/, '');
export const approvedPath = (id) => `masters/agent-portrait-${roleOf(id)}.png`;

/* A brief from the browser, or the reason it is refused. Nothing from the browser is trusted past this. */
export function cleanBrief(raw, existing) {
  if (!raw || typeof raw !== 'object') return { error: 'Bad request.' };
  const str = (v, max) => (typeof v === 'string' ? v.replace(/\r/g, '').trim().slice(0, max) : '');
  const name = str(raw.name, MAX.name);
  const does = str(raw.does, MAX.does);
  if (!name) return { error: 'Give the agent a name.' };
  if (!does) return { error: 'Say what the agent does.' };
  const agentId = str(raw.agentId, 60) || slug(name);
  if (!agentId || !ID_RE.test(agentId)) return { error: 'That name cannot make an agent id.' };
  const bundle = str(raw.bundle, MAX.bundle);
  const props = (Array.isArray(raw.props) ? raw.props : []).map((p) => str(p, MAX.prop)).filter(Boolean);
  if (props.length && (props.length < 2 || props.length > 4)) return { error: 'Give 2 to 4 props, or none and ChatGPT will choose.' };
  const pose = POSES.includes(raw.pose) ? raw.pose : 'standing';
  const notes = str(raw.notes, MAX.notes);
  const revisionOf = str(raw.revisionOf, 80);
  if (revisionOf && !/^[a-z0-9]+(?:-[a-z0-9]+)*-v\d+\.png$/.test(revisionOf)) return { error: 'Bad revision.' };
  if (!revisionOf && existing && existing.has(agentId)) return { error: 'There is already a request for this agent.' };
  return { brief: { agentId, name, does, bundle, props, pose, notes, revisionOf } };
}

export const issueTitle = (b) => `Image request: ${b.name}${b.revisionOf ? ` (revision of ${b.revisionOf})` : ''}`;

/* The body the ChatGPT task parses: the contract's headings, in the contract's order. */
export function issueBody(b) {
  const one = (s) => String(s).replace(/\n+/g, ' ');
  return [
    ['Agent id', b.agentId], ['Agent name', one(b.name)], ['What it does', one(b.does)],
    ['Props', b.props.length ? b.props.map((p) => `- ${one(p)}`).join('\n') : 'none'],
    ['Pose', b.pose], ['Notes', b.notes || 'none'], ['Revision of', b.revisionOf || 'none'],
    ['Bundle', b.bundle || 'none'], ['Requested by', b.requestedBy || 'none'],
  ].map(([h, v]) => `### ${h}\n\n${v}`).join('\n\n') + '\n';
}

export function parseBody(body) {
  const out = {};
  const parts = String(body || '').split(/^### /m).slice(1);
  for (const p of parts) {
    const i = p.indexOf('\n');
    out[p.slice(0, i).trim().toLowerCase()] = p.slice(i + 1).trim();
  }
  const props = !out.props || out.props === 'none' ? [] : out.props.split('\n').map((l) => l.replace(/^[-*]\s*/, '').trim()).filter(Boolean);
  const none = (v) => (!v || v === 'none' ? '' : v);
  return {
    agentId: out['agent id'] || '', name: out['agent name'] || '', does: out['what it does'] || '',
    props, pose: out.pose || 'standing', notes: none(out.notes), revisionOf: none(out['revision of']), bundle: none(out.bundle), requestedBy: none(out['requested by']),
  };
}

const labelsOf = (i) => (i.labels || []).map((l) => (typeof l === 'string' ? l : l.name));

/* Everything the page needs, from the issues and the file tree alone.
   status: needs-input (ChatGPT asked) > requested (waiting) > review (a candidate you have not decided on) > none. */
export function deriveState(issues, tree) {
  const approved = {}, candidates = {};
  for (const f of tree || []) {
    let m = MASTER_RE.exec(f.path);
    if (m) { approved[m[1]] = { path: f.path, sha: f.sha }; continue; }
    m = CAND_RE.exec(f.path);
    if (m) {
      const v = Number(m[2]);
      if (!candidates[m[1]] || v > candidates[m[1]].version) candidates[m[1]] = { path: f.path, version: v, sha: f.sha };
    }
  }
  const work = {}, agents = {};
  const sorted = (issues || []).filter((i) => !i.pull_request).sort((a, b) => b.number - a.number);   // newest first
  for (const i of sorted) {
    const ls = labelsOf(i);
    if (!ls.some((l) => WORK_LABELS.includes(l))) continue;
    const b = parseBody(i.body);
    if (!b.agentId) continue;
    if (!agents[b.agentId]) agents[b.agentId] = { id: b.agentId, name: b.name, does: b.does, bundle: b.bundle, firstIssue: i.number };
    const w = (work[b.agentId] = work[b.agentId] || {});
    const done = ls.includes('accepted') || ls.includes('discarded') || ls.includes('revision');
    if (i.state === 'open' && ls.includes('needs-input')) w.needsInput = w.needsInput || { issue: i.number, url: i.html_url };
    else if (i.state === 'open' && ls.includes('image-request')) w.requested = w.requested || { issue: i.number, url: i.html_url };
    else if (i.state === 'closed' && ls.includes('image-ready') && !done) w.review = w.review || { issue: i.number, url: i.html_url };
  }
  const out = {};
  for (const [id, w] of Object.entries(work)) {
    const cand = candidates[id] || null;
    let status = '';
    if (w.needsInput) status = 'needs-input';
    else if (w.requested) status = 'requested';
    else if (w.review && cand) status = 'review';
    if (status) out[id] = { status, issue: (w.needsInput || w.requested || w.review).issue, url: (w.needsInput || w.requested || w.review).url, candidate: status === 'review' ? cand : null };
  }
  // a created agent (one the Studio list does not seed) stays visible while it has work, a candidate or an approved picture
  const created = Object.values(agents).filter((a) => out[a.id] || candidates[a.id] || approved[roleOf(a.id)]);
  return { work: out, approved, created };
}

/* ── GitHub ──────────────────────────────────────────────────────────────────────────────────────────────────────── */

async function gh(path, opts = {}) {
  const r = await fetch(`https://api.github.com/repos/${repo()}${path}`, {
    method: opts.method || 'GET',
    headers: {
      authorization: `Bearer ${token()}`, accept: 'application/vnd.github+json',
      'x-github-api-version': '2022-11-28', 'user-agent': 'gushwork-drop-studio', 'content-type': 'application/json',
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  if (!r.ok) {
    const e = new Error(`github ${r.status}`); e.status = r.status;
    try { e.detail = (await r.json()).message; } catch { /* no body */ }
    throw e;
  }
  return r.status === 204 ? null : r.json();
}

async function loadAll() {
  const issues = [];
  for (let page = 1; page <= 3; page++) {
    const batch = await gh(`/issues?state=all&per_page=100&sort=updated&page=${page}`);
    issues.push(...batch);
    if (batch.length < 100) break;
  }
  const t = await gh('/git/trees/main?recursive=1');
  const tree = (t.tree || []).filter((n) => n.type === 'blob');
  return { issues, tree };
}

const issueIds = (issues) => new Set(issues.filter((i) => !i.pull_request && i.state === 'open' && labelsOf(i).some((l) => l === 'image-request' || l === 'needs-input')).map((i) => parseBody(i.body).agentId).filter(Boolean));

async function createIssue(brief) {
  return gh('/issues', { method: 'POST', body: { title: issueTitle(brief), body: issueBody(brief), labels: ['image-request'] } });
}
const comment = (n, text) => gh(`/issues/${n}/comments`, { method: 'POST', body: { body: text } });
const addLabels = (n, labels) => gh(`/issues/${n}/labels`, { method: 'POST', body: { labels } });
const dropLabel = (n, l) => gh(`/issues/${n}/labels/${encodeURIComponent(l)}`, { method: 'DELETE' }).catch((e) => { if (e.status !== 404) throw e; });

/* ── the endpoint ────────────────────────────────────────────────────────────────────────────────────────────────── */

function json(res, status, body) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, private');
  res.status(status).end(JSON.stringify(body));
}

const same = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && timingSafeEqual(x, y); };

/* GitHub calls this when an issue changes. It carries no session, so it is answered before the gate; what it may do is
   narrow: it never trusts the payload, it re-reads the issue itself, and the worst a forged call can do is re-send a
   notification the dedupe key then refuses. The key in the URL is DROP_WEBHOOK_KEY. */
async function hook(req, res) {
  const key = process.env.DROP_WEBHOOK_KEY || '';
  if (!key || !same(key, (req.query && req.query.key) || '')) return json(res, 401, { error: 'No.' });
  const ev = String((req.headers && req.headers['x-github-event']) || '');
  if (ev === 'ping') return json(res, 200, { ok: true, pong: true });
  const body = typeof req.body === 'string' ? (() => { try { return JSON.parse(req.body); } catch { return null; } })() : req.body;
  const n = Number(body && body.issue && body.issue.number);
  if (ev !== 'issues' || !n || !['labeled', 'closed'].includes(body.action)) return json(res, 200, { ok: true, ignored: true });
  if (!token() || !push.configured()) return json(res, 200, { ok: true, ignored: 'not configured' });
  try {
    const it = await gh(`/issues/${n}`);
    const ls = labelsOf(it), b = parseBody(it.body);
    if (it.pull_request || !b.requestedBy || !b.agentId) return json(res, 200, { ok: true, ignored: 'no requester' });
    let kind = '';
    if (it.state === 'open' && ls.includes('needs-input')) kind = 'needs-input';
    else if (it.state === 'closed' && ls.includes('image-ready') && !['accepted', 'discarded', 'revision'].some((l) => ls.includes(l))) kind = 'ready';
    if (!kind) return json(res, 200, { ok: true, ignored: 'nothing to tell' });
    if (!(await push.firstTime(`drop:notified:${n}:${kind}:${it.comments || 0}`))) return json(res, 200, { ok: true, duplicate: true });
    const sent = await push.notifyUser(b.requestedBy, push.message(kind, b.name, b.agentId));
    return json(res, 200, { ok: true, kind, sent });
  } catch (e) {
    return json(res, 502, { error: 'Could not read the request.' });
  }
}

export default async function handler(req, res) {
  if (String((req.query && req.query.op) || '') === 'hook') return hook(req, res);
  const session = await verify(readCookie(req.headers.cookie, COOKIE), sessionSecret());
  if (!session) return json(res, 401, { error: 'Not signed in.' });
  const rules = await loadRules();
  if (decide(TOOL_PATH, session, rules) !== 'allow') return json(res, 403, { error: 'This is limited to the people who can open Drop Studio.' });
  const email = session.email ? String(session.email).toLowerCase() : '';
  const owner = isOwner(email);
  const op = String((req.query && req.query.op) || '');
  const body = typeof req.body === 'string' ? (() => { try { return JSON.parse(req.body); } catch { return null; } })() : req.body;

  if (op === 'pushkey') return json(res, 200, { key: push.configured() ? push.publicKey() : '' });
  if (op === 'subscribe' || op === 'unsubscribe') {
    if (req.method !== 'POST') return json(res, 405, { error: 'POST only.' });
    if (!email) return json(res, 400, { error: 'Sign in with your work account first.' });
    if (!push.configured()) return json(res, 503, { error: 'Notifications are not switched on yet.' });
    try {
      if (op === 'subscribe') {
        const sub = push.cleanSubscription(body && body.subscription);
        if (!sub) return json(res, 400, { error: 'That device cannot be notified.' });
        await push.saveSubscription(email, sub);
      } else {
        await push.removeSubscription(email, body && body.endpoint);
      }
      return json(res, 200, { ok: true });
    } catch (e) { return json(res, 502, { error: 'Could not save that. Try again.' }); }
  }

  if (!token()) {
    if (op === 'state' || !op) return json(res, 200, { configured: false, owner, push: push.configured(), work: {}, approved: {}, created: [] });
    return json(res, 503, { error: 'Drop Studio is not connected to drop-reference yet.' });
  }

  try {
    if (req.method === 'GET' && (op === 'state' || !op)) {
      const { issues, tree } = await loadAll();
      const state = deriveState(issues, tree);
      for (const w of Object.values(state.work)) {
        if (w.status !== 'needs-input') continue;
        const cs = await gh(`/issues/${w.issue}/comments?per_page=100`);
        const last = cs[cs.length - 1];
        w.question = last ? String(last.body || '').slice(0, MAX.answer) : '';
      }
      return json(res, 200, { configured: true, owner, push: push.configured(), ...state });
    }

    if (req.method === 'GET' && op === 'image') {
      const path = String(req.query.path || '');
      if (!IMG_RE.test(path)) return json(res, 400, { error: 'Not a picture Drop Studio serves.' });
      const t = await gh('/git/trees/main?recursive=1');
      const f = (t.tree || []).find((n) => n.type === 'blob' && n.path === path);
      if (!f) return json(res, 404, { error: 'No such picture.' });
      const blob = await gh(`/git/blobs/${f.sha}`);
      const bytes = Buffer.from(String(blob.content || '').replace(/\n/g, ''), 'base64');
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'private, max-age=300');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      return res.status(200).end(bytes);
    }

    if (req.method !== 'POST') return json(res, 405, { error: 'GET or POST only.' });
    if (!body) return json(res, 400, { error: 'Bad request.' });

    if (op === 'create') {
      const { issues } = await loadAll();
      const c = cleanBrief(body, issueIds(issues));
      if (c.error) return json(res, 400, { error: c.error });
      const made = await createIssue({ ...c.brief, requestedBy: email });
      return json(res, 200, { ok: true, agentId: c.brief.agentId, issue: made.number, url: made.html_url });
    }

    if (op === 'answer') {
      const n = Number(body.issue), text = String(body.text || '').trim().slice(0, MAX.answer);
      if (!n || !text) return json(res, 400, { error: 'Write an answer first.' });
      const { issues } = await loadAll();
      const it = issues.find((i) => i.number === n && !i.pull_request && labelsOf(i).includes('needs-input'));
      if (!it) return json(res, 404, { error: 'That request is not waiting for an answer.' });
      await comment(n, `Answer from ${email || 'the team'}:\n\n${text}`);
      await dropLabel(n, 'needs-input');
      await addLabels(n, ['image-request']);
      return json(res, 200, { ok: true });
    }

    if (op === 'decide') {
      if (!owner) return json(res, 403, { error: 'Only the owner accepts, changes or discards a picture.' });
      const id = String(body.agentId || ''), action = String(body.action || ''), note = String(body.note || '').trim().slice(0, MAX.notes);
      if (!ID_RE.test(id) || !['accept', 'changes', 'discard'].includes(action)) return json(res, 400, { error: 'Bad request.' });
      const { issues, tree } = await loadAll();
      const st = deriveState(issues, tree);
      const w = st.work[id];
      if (!w || w.status !== 'review' || !w.candidate) return json(res, 409, { error: 'There is no picture waiting for a decision on this agent.' });
      const file = w.candidate.path.split('/').pop();

      if (action === 'accept') {
        const blob = await gh(`/git/blobs/${w.candidate.sha}`);
        const existing = st.approved[roleOf(id)];
        const dest = approvedPath(id);
        await gh(`/contents/${dest}`, {
          method: 'PUT',
          body: { message: `Approve ${id} portrait ${file} (#${w.issue}), accepted in Drop Studio by ${email}`, content: String(blob.content || '').replace(/\n/g, ''), sha: existing ? existing.sha : undefined, branch: 'main' },
        });
        await comment(w.issue, `Accepted by ${email} in Drop Studio. ${file} is now ${dest}.`);
        await addLabels(w.issue, ['accepted']);
        return json(res, 200, { ok: true, approved: dest });
      }
      if (action === 'discard') {
        await comment(w.issue, `Discarded by ${email} in Drop Studio.${note ? `\n\n${note}` : ''}`);
        await addLabels(w.issue, ['discarded']);
        return json(res, 200, { ok: true });
      }
      // changes: a new request, as a revision of this file, with the note as the feedback
      const src = issues.find((i) => i.number === w.issue);
      const prev = parseBody(src && src.body);
      const c = cleanBrief({ ...prev, agentId: id, revisionOf: file, notes: note || prev.notes }, null);
      if (c.error) return json(res, 400, { error: c.error });
      const made = await createIssue({ ...c.brief, requestedBy: email });
      await comment(w.issue, `Changes requested by ${email} in Drop Studio, as #${made.number}.`);
      await addLabels(w.issue, ['revision']);
      return json(res, 200, { ok: true, issue: made.number, url: made.html_url });
    }

    return json(res, 400, { error: 'Unknown op.' });
  } catch (e) {
    // no stack and no token detail, the same posture as the other modules
    const known = e && e.status === 403 ? 'GitHub refused the token. Check its permissions on drop-reference.' : 'Could not reach drop-reference.';
    return json(res, 502, { error: known });
  }
}

export const _test = { WORK_LABELS, IMG_RE };
