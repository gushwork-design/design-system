/* ============================================================================
   _publish.js — publish a page into a team's staging lane.

   Served as /api/publish, a module behind gw.js like its neighbours, so it costs no new function against the Hobby
   plan's 12.

   WHAT IT DOES. A person who may publish into a lane (Access Control → Staging lanes) sends a page, as JSON
   { lane, page, title, blurb, owner, files: [{ path, b64 }] }, from the Publish tool in the browser or from their own
   Claude with a personal token. The page is checked (_staging-rules.js) and written to
   web/internal/staging/<lane>/<page>/ in the design-system repo, and the deploy that follows a push to main
   (publish-site.yml) puts it live behind the hub's sign-in. The Staging index lists it from the staging.json this
   module writes; nobody edits a shared file.

   WHO. Two doors, one gate. A signed-in session, or a personal token minted by a signed-in person (hashed in KV, 90
   days, revocable). Either way the person is then judged by canPublish() against the LIVE rules, so taking someone
   off a lane stops their token on the next call. Owners can publish anywhere; an admin is not automatically a
   publisher.

   WHAT IT NEVER DOES. It writes only under web/internal/staging/<lane>/<page>/ and only for a lane that is in the
   rules. It refuses a lane whose folder already holds a page of its own (a legacy page, which stays the owner's). It
   deletes nothing. staging.json is written here, never taken from the browser.

   THE TOKEN. GW_GITHUB_TOKEN, as the review loop uses. The commit goes straight to main when the token's account may
   bypass the pull-request rule (R46) and falls back to an open pull request for the owner when it may not, so a
   publish is never lost, only queued.
   ========================================================================= */

import { COOKIE, verify, readCookie, sessionSecret, isInternal } from './_session.js';
import { loadRules, canPublish, lanesFor, isOwner } from './_access.js';
import { checkSubmission, STAGING_ROOT, LIMITS } from './_staging-rules.js';
import { createHash, randomBytes } from 'node:crypto';

const OWNER = 'gushwork-design';
const REPO = 'design-system';
const BASE = 'main';
const TOKEN_DAYS = 90;
const MAX_TOKENS = 5;
const PER_HOUR = 30;

const ghToken = () => process.env.GW_GITHUB_TOKEN || '';
const sha256 = (s) => createHash('sha256').update(s).digest('hex');

function json(res, status, body) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, private');
  res.status(status).end(JSON.stringify(body));
}

/* ── KV (the same store the visit log uses) ─────────────────────────────────────────────────────────────────────── */

function store() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url, token } : null;
}
async function kv(cmds) {
  const cfg = store();
  if (!cfg) throw new Error('no store');
  const r = await fetch(`${cfg.url}/pipeline`, {
    method: 'POST', headers: { authorization: `Bearer ${cfg.token}`, 'content-type': 'application/json' }, body: JSON.stringify(cmds),
  });
  if (!r.ok) throw new Error(`kv ${r.status}`);
  return (await r.json()).map((x) => x.result);
}

/* ── personal tokens ────────────────────────────────────────────────────────────────────────────────────────────── */

export const tokenKey = (hash) => `gw:pt:${hash}`;
const userKey = (email) => `gw:ptu:${email}`;

async function mintToken(email, label) {
  const mine = await listTokens(email);
  if (mine.length >= MAX_TOKENS) return { error: `You already have ${MAX_TOKENS} tokens. Revoke one first.` };
  const plain = 'gwp_' + randomBytes(24).toString('base64url');
  const hash = sha256(plain);
  const rec = { email, label: String(label || 'Claude').slice(0, 40), at: new Date().toISOString() };
  await kv([['SET', tokenKey(hash), JSON.stringify(rec), 'EX', String(TOKEN_DAYS * 86400)], ['SADD', userKey(email), hash]]);
  return { token: plain, id: hash.slice(0, 8), ...rec };
}

async function listTokens(email) {
  const [hashes] = await kv([['SMEMBERS', userKey(email)]]);
  if (!hashes || !hashes.length) return [];
  const vals = await kv(hashes.map((h) => ['GET', tokenKey(h)]));
  const live = [], dead = [];
  hashes.forEach((h, i) => {
    if (!vals[i]) { dead.push(h); return; }          // expired: the key is gone, the set entry is stale
    try { live.push({ id: h.slice(0, 8), ...JSON.parse(vals[i]) }); } catch { dead.push(h); }
  });
  if (dead.length) await kv(dead.map((h) => ['SREM', userKey(email), h])).catch(() => {});
  return live.sort((a, b) => String(b.at).localeCompare(String(a.at)));
}

async function revokeToken(email, id) {
  const [hashes] = await kv([['SMEMBERS', userKey(email)]]);
  const hash = (hashes || []).find((h) => h.startsWith(String(id)) && String(id).length >= 8);
  if (!hash) return false;
  await kv([['DEL', tokenKey(hash)], ['SREM', userKey(email), hash]]);
  return true;
}

/* Who is asking, by whichever door. Null when neither is valid. */
async function whoIs(req) {
  const bearer = /^Bearer (gwp_[A-Za-z0-9_-]{20,})$/.exec(String((req.headers && req.headers.authorization) || ''));
  if (bearer) {
    try {
      const [raw] = await kv([['GET', tokenKey(sha256(bearer[1]))]]);
      const rec = raw ? JSON.parse(raw) : null;
      if (rec && rec.email) return { email: rec.email, via: 'token', name: '' };
    } catch { /* fall through to no */ }
    return null;
  }
  const session = await verify(readCookie(req.headers.cookie, COOKIE), sessionSecret());
  if (!session || !session.email) return null;
  return { email: String(session.email).toLowerCase(), via: 'cookie', name: String(session.name || '') };
}

/* ── GitHub ─────────────────────────────────────────────────────────────────────────────────────────────────────── */

async function gh(path, init = {}) {
  const r = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${ghToken()}`, accept: 'application/vnd.github+json', 'x-github-api-version': '2022-11-28',
      'user-agent': 'gushwork-design-hub', 'content-type': 'application/json',
    },
  });
  const text = await r.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { /* leave null */ }
  if (!r.ok) { const e = new Error(`github ${r.status}`); e.status = r.status; e.body = body; throw e; }
  return body;
}

/* Write the page to main in one commit. Returns { mode: 'main', commit } or, when the token's account may not push to
   main, { mode: 'pr', url } with the same files on a branch. Retries when main moves under it. */
async function writePage({ lane, page, files, manifest, email, via }) {
  const dir = `${STAGING_ROOT}/${lane}/${page}`;
  const stamp = { ...manifest, lane, publishedBy: email, publishedAt: new Date().toISOString() };
  const all = [...files, { path: 'staging.json', bytes: Buffer.from(JSON.stringify(stamp, null, 2) + '\n') }];

  for (let attempt = 0; attempt < 3; attempt++) {
    const ref = await gh(`/git/ref/heads/${BASE}`);
    const head = ref.object.sha;
    const commit = await gh(`/git/commits/${head}`);

    // A lane folder that already holds an index.html is a page, not a lane: it stays the owner's.
    const clash = await gh(`/contents/${STAGING_ROOT}/${lane}/index.html?ref=${BASE}`).then(() => true).catch((e) => { if (e.status === 404) return false; throw e; });
    if (clash) { const e = new Error('lane is a page'); e.status = 409; e.code = 'lane-is-page'; throw e; }

    const blobs = [];
    for (let i = 0; i < all.length; i += 8) {
      blobs.push(...await Promise.all(all.slice(i, i + 8).map((f) =>
        gh('/git/blobs', { method: 'POST', body: JSON.stringify({ content: f.bytes.toString('base64'), encoding: 'base64' }) })
          .then((b) => ({ path: `${dir}/${f.path}`, mode: '100644', type: 'blob', sha: b.sha })))));
    }
    const tree = await gh('/git/trees', { method: 'POST', body: JSON.stringify({ base_tree: commit.tree.sha, tree: blobs }) });
    const message = `Staging: ${lane}/${page}, published by ${email}${via === 'token' ? ' from Claude' : ''}`;
    const made = await gh('/git/commits', { method: 'POST', body: JSON.stringify({ message, tree: tree.sha, parents: [head] }) });
    try {
      await gh(`/git/refs/heads/${BASE}`, { method: 'PATCH', body: JSON.stringify({ sha: made.sha, force: false }) });
      return { mode: 'main', commit: made.sha };
    } catch (e) {
      if (e.status === 422 && attempt < 2 && /fast.?forward|not a fast/i.test(JSON.stringify(e.body || ''))) continue;   // main moved: redo on the new head
      if (e.status === 403 || e.status === 422 || e.status === 409) {
        // The account may not write to main. Same commit, on a branch, as a pull request the owner can merge.
        const branch = `lane/${lane}-${page}-${Date.now().toString(36)}`;
        await gh('/git/refs', { method: 'POST', body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: made.sha }) });
        const pr = await gh('/pulls', { method: 'POST', body: JSON.stringify({
          title: message, head: branch, base: BASE,
          body: `Published to the ${lane} lane through the hub's Publish tool by ${email}. The token could not write to main, so it is waiting here.\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)`,
        }) });
        return { mode: 'pr', url: pr.html_url };
      }
      throw e;
    }
  }
  const e = new Error('main kept moving'); e.status = 409; throw e;
}

/* ── the endpoint ───────────────────────────────────────────────────────────────────────────────────────────────── */

function decode(body) {
  if (!body || typeof body !== 'object') return null;
  const files = [];
  for (const f of Array.isArray(body.files) ? body.files : []) {
    if (!f || typeof f.path !== 'string' || typeof f.b64 !== 'string') { files.push({ path: f && f.path, bytes: null }); continue; }
    files.push({ path: f.path, bytes: Buffer.from(f.b64, 'base64') });
  }
  return { lane: String(body.lane || ''), page: String(body.page || ''), title: body.title, blurb: body.blurb, owner: body.owner, files };
}

export default async function handler(req, res) {
  const who = await whoIs(req).catch(() => null);
  if (!who) return json(res, 401, { error: 'Not signed in. From Claude, send your personal token as a Bearer token.' });
  if (!isInternal(who.email)) return json(res, 403, { error: 'Work accounts only.' });
  const rules = await loadRules();
  const op = String((req.query && req.query.op) || (req.method === 'GET' ? 'state' : ''));

  /* A browser call carries a custom header, which a cross-site page cannot send without a preflight we do not grant. */
  if (req.method === 'POST' && who.via === 'cookie' && !req.headers['x-gw-publish']) return json(res, 400, { error: 'Bad request.' });

  const body = typeof req.body === 'string' ? (() => { try { return JSON.parse(req.body); } catch { return null; } })() : req.body;
  const configured = !!ghToken() && !!store();

  if (op === 'state' && req.method === 'GET') {
    let tokens = [];
    if (who.via === 'cookie' && store()) { try { tokens = await listTokens(who.email); } catch { /* the list is optional */ } }
    return json(res, 200, {
      configured, email: who.email, name: who.name, owner: isOwner(who.email),
      lanes: lanesFor(who.email, rules), tokens, tokenDays: TOKEN_DAYS,
      limits: { total: LIMITS.total, file: LIMITS.file, files: LIMITS.files },
    });
  }
  if (req.method !== 'POST') return json(res, 405, { error: 'GET or POST only.' });

  if (op === 'token-mint' || op === 'token-revoke') {
    if (who.via !== 'cookie') return json(res, 403, { error: 'Sign in to the hub to manage tokens. A token cannot mint another.' });
    if (!store()) return json(res, 503, { error: 'Tokens are not available yet: the store is not attached.' });
    if (op === 'token-mint' && !lanesFor(who.email, rules).length) return json(res, 403, { error: 'You are not on any lane yet. Ask the owner to add you.' });
    try {
      if (op === 'token-mint') {
        const made = await mintToken(who.email, body && body.label);
        return made.error ? json(res, 409, { error: made.error }) : json(res, 200, { ok: true, ...made });
      }
      return json(res, 200, { ok: await revokeToken(who.email, body && body.id) });
    } catch { return json(res, 502, { error: 'Could not do that. Try again.' }); }
  }

  if (op !== 'check' && op !== 'publish') return json(res, 404, { error: 'Unknown operation.' });
  const sub = decode(body);
  if (!sub) return json(res, 400, { error: 'Bad request.' });
  if (!canPublish(who.email, sub.lane, rules)) {
    return json(res, 403, { error: sub.lane ? `You cannot publish to the ${sub.lane} lane. Ask the owner to add you.` : 'Choose a lane.' });
  }
  const checked = checkSubmission(sub);
  if (op === 'check') {
    return json(res, 200, { ok: !checked.problems.length, problems: checked.problems, files: checked.files.map((f) => ({ path: f.path, size: f.bytes.length })) });
  }
  if (checked.problems.length) return json(res, 422, { ok: false, problems: checked.problems });
  if (!configured) return json(res, 503, { error: 'Publishing is not connected to GitHub yet.' });

  try {
    const [n] = await kv([['INCR', `gw:pub:rl:${who.email}:${Math.floor(Date.now() / 3600000)}`]]);
    if (n === 1) await kv([['EXPIRE', `gw:pub:rl:${who.email}:${Math.floor(Date.now() / 3600000)}`, '3700']]);
    if (n > PER_HOUR) return json(res, 429, { error: `That is more than ${PER_HOUR} publishes in an hour. Try again later.` });
  } catch { /* a counter outage is not a reason to refuse */ }

  try {
    const out = await writePage({ lane: sub.lane, page: sub.page, files: checked.files, manifest: checked.manifest, email: who.email, via: who.via });
    return json(res, 200, { ok: true, ...out, path: `/internal/staging/${sub.lane}/${sub.page}`, note: out.mode === 'main'
      ? 'Committed. The page is live in a minute or two, after the deploy.'
      : 'Queued for the owner: this publisher account could not write to main, so a pull request is waiting.' });
  } catch (e) {
    if (e.code === 'lane-is-page') return json(res, 409, { error: `The ${sub.lane} folder already holds a page of its own, so it cannot be a lane. Ask the owner.` });
    return json(res, 502, { error: 'GitHub did not accept that. Nothing was published. Try again in a minute.' });
  }
}
