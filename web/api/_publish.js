/* ============================================================================
   _publish.js — publish a page into a team's staging lane, from the plugin.

   Served as /api/publish, a module behind gw.js like its neighbours, so it costs no new function against the Hobby
   plan's 12.

   THE FLOW. A person on a lane (Access Control, Staging lanes) tells their own Claude "publish this to the gtm lane".
   The plugin's scripts/publish-staging.sh does the rest:
     1. FIRST TIME ONLY: it connects, like a command-line tool signing in. op=device-start gives it a code; the person
        opens /internal/staging/connect, signs in as themselves and types the code; op=device-approve mints a personal
        token for them; the script collects it with op=device-poll and keeps it in ~/.config/gushwork.
     2. EVERY TIME: it posts { lane, page, title, blurb, owner, files: [{ path, b64 }] } with that token. op=check runs
        the checks (_staging-rules.js) and writes nothing; op=publish runs them again and writes the page to
        web/internal/staging/<lane>/<page>/ in the design-system repo. The deploy that follows a push to main
        (publish-site.yml) puts it live behind the hub's sign-in, and the Staging index lists it from the staging.json
        written here.

   ONE GATE. The token only says who; whether they may publish to a lane is canPublish() against the LIVE rules, on
   every call, so taking someone off a lane stops their token at once. Owners can publish anywhere; an admin is not
   automatically a publisher.

   THE CODE IS TYPED, NOT LINKED. Approving a code lets whoever holds it collect a token as the approver, so an attacker
   could send a victim a link carrying the attacker's own code. The approval page therefore asks the person to type the
   code their Claude showed them, which they only have if they started it. Approving stores no token: it marks the code
   approved for that person, and the token is minted at the moment the waiting script collects it, then forgotten, so
   the store never holds a usable token (only hashes of them).

   WHAT IT NEVER DOES. Writes outside web/internal/staging/<lane>/<page>/, writes into a lane folder that already holds
   a page of its own (a legacy page, which stays the owner's), deletes anything, or takes staging.json from the caller.

   GITHUB. GW_GITHUB_TOKEN, as the review loop uses. The commit goes straight to main when that account may bypass the
   pull-request rule (R46) and falls back to an open pull request for the owner when it may not, so a publish is never
   lost, only queued.
   ========================================================================= */

import { COOKIE, verify, readCookie, sessionSecret, isInternal } from './_session.js';
import { loadRules, canPublish, lanesFor } from './_access.js';
import { checkSubmission, STAGING_ROOT } from './_staging-rules.js';
import { createHash, randomBytes, randomInt } from 'node:crypto';

const OWNER = 'gushwork-design';
const REPO = 'design-system';
const BASE = 'main';
const TOKEN_DAYS = 90;
const MAX_TOKENS = 5;
const PER_HOUR = 30;
const DEVICE_SECONDS = 600;
const POLL_SECONDS = 3;
const CODE_ALPHABET = 'BCDFGHJKLMNPQRSTVWXZ';    // consonants only: no vowels to spell a word, no 0/O or 1/I to misread

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

/* A counter that expires: true once n goes past max within the window. */
async function over(key, max, seconds) {
  try {
    const [n] = await kv([['INCR', key]]);
    if (n === 1) await kv([['EXPIRE', key, String(seconds)]]);
    return n > max;
  } catch { return false; }       // a counter outage is not a reason to refuse
}

const ipOf = (req) => String((req.headers && (req.headers['x-forwarded-for'] || req.headers['x-real-ip'])) || '').split(',')[0].trim().slice(0, 64) || 'unknown';

/* ── personal tokens ────────────────────────────────────────────────────────────────────────────────────────────── */

export const tokenKey = (hash) => `gw:pt:${hash}`;
const userKey = (email) => `gw:ptu:${email}`;

/* A new token for this person. At five, the oldest is retired, so signing in again on a new laptop never fails. */
async function mintToken(email, label) {
  const [hashes] = await kv([['SMEMBERS', userKey(email)]]);
  if (hashes && hashes.length) {
    const vals = await kv(hashes.map((h) => ['GET', tokenKey(h)]));
    const live = hashes.map((h, i) => { try { return vals[i] ? { h, at: JSON.parse(vals[i]).at } : { h, at: '' }; } catch { return { h, at: '' }; } })
      .sort((a, b) => String(a.at).localeCompare(String(b.at)));
    const drop = live.slice(0, Math.max(0, live.length - (MAX_TOKENS - 1)));
    if (drop.length) await kv(drop.flatMap((d) => [['DEL', tokenKey(d.h)], ['SREM', userKey(email), d.h]]));
  }
  const plain = 'gwp_' + randomBytes(24).toString('base64url');
  const hash = sha256(plain);
  const rec = { email, label: String(label || 'Claude').slice(0, 40), at: new Date().toISOString() };
  await kv([['SET', tokenKey(hash), JSON.stringify(rec), 'EX', String(TOKEN_DAYS * 86400)], ['SADD', userKey(email), hash]]);
  return plain;
}

async function revokeToken(plain) {
  const hash = sha256(plain);
  const [raw] = await kv([['GET', tokenKey(hash)]]);
  if (!raw) return false;
  let email = '';
  try { email = JSON.parse(raw).email; } catch { /* leave empty */ }
  await kv([['DEL', tokenKey(hash)], ...(email ? [['SREM', userKey(email), hash]] : [])]);
  return true;
}

/* Who is asking by token. Null when it is missing, wrong or revoked. */
async function whoByToken(req) {
  const m = /^Bearer (gwp_[A-Za-z0-9_-]{20,})$/.exec(String((req.headers && req.headers.authorization) || ''));
  if (!m) return null;
  try {
    const [raw] = await kv([['GET', tokenKey(sha256(m[1]))]]);
    const rec = raw ? JSON.parse(raw) : null;
    return rec && rec.email ? { email: rec.email, token: m[1] } : null;
  } catch { return null; }
}

/* Who is signed in to the hub in this browser. Used only by the connect page. */
async function whoByCookie(req) {
  const session = await verify(readCookie(req.headers.cookie, COOKIE), sessionSecret());
  return session && session.email ? { email: String(session.email).toLowerCase(), name: String(session.name || '') } : null;
}

/* ── connecting a Claude (the device flow) ──────────────────────────────────────────────────────────────────────── */

const devKey = (deviceHash) => `gw:dev:${deviceHash}`;
const codeKey = (userCode) => `gw:devc:${userCode}`;
export const cleanCode = (s) => String(s || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 8);
export const showCode = (c) => `${c.slice(0, 4)}-${c.slice(4)}`;

async function deviceStart(req, res, host) {
  if (await over(`gw:dev:rl:${ipOf(req)}:${Math.floor(Date.now() / 3600000)}`, 20, 3700)) {
    return json(res, 429, { error: 'Too many attempts from here. Try again in an hour.' });
  }
  const code = Array.from({ length: 8 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join('');
  const deviceCode = randomBytes(32).toString('base64url');
  const h = sha256(deviceCode);
  try {
    await kv([['SET', devKey(h), JSON.stringify({ code, status: 'pending' }), 'EX', String(DEVICE_SECONDS)], ['SET', codeKey(code), h, 'EX', String(DEVICE_SECONDS)]]);
  } catch { return json(res, 503, { error: 'Connecting is not available yet: the store is not attached.' }); }
  return json(res, 200, { deviceCode, userCode: showCode(code), verifyUrl: `${host}/internal/staging/connect`, interval: POLL_SECONDS, expiresIn: DEVICE_SECONDS });
}

async function devicePoll(req, res, body) {
  const deviceCode = String((body && body.deviceCode) || '');
  if (!/^[A-Za-z0-9_-]{30,64}$/.test(deviceCode)) return json(res, 400, { error: 'Bad request.' });
  const h = sha256(deviceCode);
  if (await over(`gw:dev:pl:${h}`, 400, DEVICE_SECONDS)) return json(res, 429, { error: 'Slow down.' });
  const [raw] = await kv([['GET', devKey(h)]]);
  if (!raw) return json(res, 410, { status: 'expired' });
  const rec = JSON.parse(raw);
  if (rec.status !== 'approved') return json(res, 200, { status: 'pending' });
  await kv([['DEL', devKey(h)], ['DEL', codeKey(rec.code)]]);      // a connection is collected once
  const rules = await loadRules();
  const lanes = lanesFor(rec.email, rules);
  if (!lanes.length) return json(res, 403, { status: 'denied', error: 'You are not on a staging lane any more. Ask the owner.' });
  const token = await mintToken(rec.email, rec.label);
  return json(res, 200, { status: 'approved', token, email: rec.email, lanes, tokenDays: TOKEN_DAYS });
}

/* The person typed the code their Claude showed them. Mark it approved for them; the token is minted when it is collected. */
async function approve(res, who, body, rules) {
  if (!lanesFor(who.email, rules).length) return json(res, 403, { error: 'You are not on a staging lane yet. Ask the owner to add you in Access Control.' });
  if (await over(`gw:dev:ap:${who.email}`, 10, DEVICE_SECONDS)) return json(res, 429, { error: 'Too many wrong codes. Wait a few minutes and try again.' });
  const code = cleanCode(body && body.code);
  if (code.length !== 8) return json(res, 400, { error: 'The code is 8 letters, like BCDF-GHJK.' });
  const [h] = await kv([['GET', codeKey(code)]]);
  const [raw] = h ? await kv([['GET', devKey(h)]]) : [null];
  const rec = raw ? JSON.parse(raw) : null;
  if (!rec || rec.status !== 'pending') return json(res, 404, { error: 'That code is not right, or it has expired. Check it in Claude.' });
  const ttl = DEVICE_SECONDS;
  await kv([['SET', devKey(h), JSON.stringify({ code, status: 'approved', email: who.email, label: 'Claude' }), 'EX', String(ttl)]]);
  return json(res, 200, { ok: true, email: who.email, lanes: lanesFor(who.email, rules) });
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
async function writePage({ lane, page, files, manifest, email }) {
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
    const message = `Staging: ${lane}/${page}, published by ${email} from Claude`;
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
          body: `Published to the ${lane} lane by ${email}. The token could not write to main, so it is waiting here.\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)`,
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
  const op = String((req.query && req.query.op) || '');
  const proto = String((req.headers && req.headers['x-forwarded-proto']) || 'https').split(',')[0].trim() === 'http' ? 'http' : 'https';   // Vercel sets it
  const host = `${proto}://${String((req.headers && req.headers.host) || 'design.gushwork.ai')}`;
  const body = typeof req.body === 'string' ? (() => { try { return JSON.parse(req.body); } catch { return null; } })() : req.body;
  const configured = !!ghToken() && !!store();

  /* Doors that need no token: the script asking to be connected, and waiting for the answer. */
  if (op === 'device-start' || op === 'device-poll') {
    if (req.method !== 'POST') return json(res, 405, { error: 'POST only.' });
    try { return op === 'device-start' ? await deviceStart(req, res, host) : await devicePoll(req, res, body); }
    catch { return json(res, 502, { error: 'Could not do that. Try again.' }); }
  }

  /* The connect page, signed in to the hub as a person (me also answers to a token, so the script can ask who it is). */
  if (op === 'me' || op === 'device-approve') {
    const who = (await whoByCookie(req).catch(() => null)) || (op === 'me' ? await whoByToken(req) : null);
    if (!who) return json(res, 401, { error: op === 'me' && req.headers.authorization ? 'Not connected. Run publish-staging.sh login.' : 'Not signed in.' });
    if (!isInternal(who.email)) return json(res, 403, { error: 'Work accounts only.' });
    const rules = await loadRules();
    if (op === 'me') return json(res, 200, { email: who.email, name: who.name || '', lanes: lanesFor(who.email, rules), configured });
    if (req.method !== 'POST') return json(res, 405, { error: 'POST only.' });
    if (!req.headers['x-gw-publish']) return json(res, 400, { error: 'Bad request.' });     // a custom header: a cross-site page cannot send it
    try { return await approve(res, who, body, rules); } catch { return json(res, 502, { error: 'Could not do that. Try again.' }); }
  }

  /* Everything else is the script, with its token. */
  const who = await whoByToken(req);
  if (!who) return json(res, 401, { error: 'Not connected. Run publish-staging.sh login to connect this computer.' });
  if (!isInternal(who.email)) return json(res, 403, { error: 'Work accounts only.' });
  const rules = await loadRules();

  if (op === 'logout') {
    if (req.method !== 'POST') return json(res, 405, { error: 'POST only.' });
    try { return json(res, 200, { ok: await revokeToken(who.token) }); } catch { return json(res, 502, { error: 'Could not do that. Try again.' }); }
  }
  if (req.method !== 'POST') return json(res, 405, { error: 'POST only.' });
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
  if (await over(`gw:pub:rl:${who.email}:${Math.floor(Date.now() / 3600000)}`, PER_HOUR, 3700)) {
    return json(res, 429, { error: `That is more than ${PER_HOUR} publishes in an hour. Try again later.` });
  }

  try {
    const out = await writePage({ lane: sub.lane, page: sub.page, files: checked.files, manifest: checked.manifest, email: who.email });
    return json(res, 200, { ok: true, ...out, path: `/internal/staging/${sub.lane}/${sub.page}`, note: out.mode === 'main'
      ? 'Committed. The page is live in a minute or two, after the deploy.'
      : 'Queued for the owner: this publisher account could not write to main, so a pull request is waiting.' });
  } catch (e) {
    if (e.code === 'lane-is-page') return json(res, 409, { error: `The ${sub.lane} folder already holds a page of its own, so it cannot be a lane. Ask the owner.` });
    return json(res, 502, { error: 'GitHub did not accept that. Nothing was published. Try again in a minute.' });
  }
}
