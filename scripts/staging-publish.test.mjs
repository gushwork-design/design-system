/* Tests for staging lanes: web/api/_staging-rules.js (what a page must satisfy), the lane model in _access.js,
   and web/api/_publish.js (the endpoint, run against a faked GitHub and KV). Run it:
     node scripts/staging-publish.test.mjs

   The font rule is a PORT of scripts/check-fonts.sh --target hosted. A port that drifts would let a page through
   that makes publish-sheets.sh refuse the whole deploy, so section 2 runs the real script and the port over the
   same fixtures and requires the same answer. */

import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

process.env.SESSION_SECRET = 'test-secret-test-secret-test-secret';
process.env.OWNER_EMAILS = 'owner@gushwork.ai';
process.env.GW_GITHUB_TOKEN = 'ghp_faketokenfaketokenfaketokenfaketoken1234';
process.env.KV_REST_API_URL = 'https://kv.test';
process.env.KV_REST_API_TOKEN = 'kv-token';
process.env.VERCEL_API_TOKEN = 'vercel-token';
process.env.SLACK_BOT_TOKEN = 'xoxb-test';
process.env.OWNER_SLACK_ID = 'UOWNER';

const { checkSubmission, fontProblems, isSlug, cleanPath } = await import('../web/api/_staging-rules.js');
const { normalise, canPublish, lanesFor, decide, setPageVisibility, laneMembers, grantPage, describeAccess, invalidate: invalidateRules } = await import('../web/api/_access.js');
const { sign, COOKIE } = await import('../web/api/_session.js');
const publish = (await import('../web/api/_publish.js')).default;
const accessApi = (await import('../web/api/access.js')).default;
const accessReq = (await import('../web/api/_access-request.js')).default;
const { answerRequest } = await import('../web/api/_access-request.js');
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

let pass = 0, fail = 0;
const t = (name, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (ok) pass++; else { fail++; console.log('FAIL', name, '\n  got ', JSON.stringify(got), '\n  want', JSON.stringify(want)); }
};
const has = (name, list, frag) => t(name, list.some((x) => x.includes(frag)), true);

/* ── 1. the rules ───────────────────────────────────────────────────────────────────────────────────────── */

const page = (extra = '') => `<!doctype html><html><head><meta charset="utf-8">
<base href="/internal/staging/gtm/agent-store/"><meta name="robots" content="noindex, nofollow">
<link rel="stylesheet" href="/foundation/tokens.css"><style>body{font:var(--gw-text-body-16-reg)}</style></head><body>hi${extra}</body></html>`;
const sub = (over = {}) => ({
  lane: 'gtm', page: 'agent-store', title: 'Agent store', blurb: 'The new mock-up.', owner: 'Swapnil', visibility: 'org',
  files: [{ path: 'index.html', bytes: Buffer.from(page()) }], ...over,
});

t('a clean page passes', checkSubmission(sub()).problems, []);
t('staging.json from the browser is dropped, not trusted', checkSubmission(sub({ files: [...sub().files, { path: 'staging.json', bytes: Buffer.from('{"owner":"x"}') }] })).files.map((f) => f.path), ['index.html']);
has('no index.html', checkSubmission(sub({ files: [{ path: 'a.css', bytes: Buffer.from('a{}') }] })).problems, 'index.html is missing');
has('wrong base href', checkSubmission(sub({ files: [{ path: 'index.html', bytes: Buffer.from(page().replace('/gtm/agent-store/', '/x/y/')) }] })).problems, '<base href');
has('missing noindex', checkSubmission(sub({ files: [{ path: 'index.html', bytes: Buffer.from(page().replace('noindex, nofollow', 'all')) }] })).problems, 'noindex');
has('api call', checkSubmission(sub({ files: [{ path: 'index.html', bytes: Buffer.from(page('<script>fetch("/api/access")</script>')) }] })).problems, '/api/');
has('admin link', checkSubmission(sub({ files: [{ path: 'index.html', bytes: Buffer.from(page('<a href="/admin/analytics">x</a>')) }] })).problems, '/admin/');
has('a key-shaped string', checkSubmission(sub({ files: [...sub().files, { path: 'a.js', bytes: Buffer.from('k="sk-ant-api03-abcdefghijkl"') }] })).problems, 'secret');
has('a script file', checkSubmission(sub({ files: [...sub().files, { path: 'run.sh', bytes: Buffer.from('x') }] })).problems, 'not an allowed type');
has('vercel.json', checkSubmission(sub({ files: [...sub().files, { path: 'vercel.json', bytes: Buffer.from('{}') }] })).problems, 'not allowed here');
has('a dotfile', checkSubmission(sub({ files: [...sub().files, { path: '.env', bytes: Buffer.from('x') }] })).problems, 'not allowed here');
has('a path that climbs out', checkSubmission(sub({ files: [...sub().files, { path: '../x.html', bytes: Buffer.from('x') }] })).problems, 'not an allowed file path');
has('an absolute path', checkSubmission(sub({ files: [...sub().files, { path: '/etc/x.txt', bytes: Buffer.from('x') }] })).problems, 'not an allowed file path');
has('a backslash path', checkSubmission(sub({ files: [...sub().files, { path: 'a\\b.txt', bytes: Buffer.from('x') }] })).problems, 'not an allowed file path');
has('a file over the limit', checkSubmission(sub({ files: [...sub().files, { path: 'big.png', bytes: Buffer.alloc(4 * 1024 * 1024) }] })).problems, 'MB');
has('the same file twice', checkSubmission(sub({ files: [...sub().files, { path: 'INDEX.html', bytes: Buffer.from('x') }] })).problems, 'twice');
has('a reserved page name', checkSubmission(sub({ page: 'admin' })).problems, 'page name');
has('an upper-case page name', checkSubmission(sub({ page: 'Agent' })).problems, 'page name');
has('an empty title', checkSubmission(sub({ title: '  ' })).problems, 'title');
has('a title that is too long', checkSubmission(sub({ title: 'x'.repeat(61) })).problems, 'title');
t('slug: ok', isSlug('agent-store'), true);
t('slug: trailing hyphen', isSlug('agent-'), false);
t('slug: reserved', isSlug('publish'), false);
t('cleanPath: nested ok', cleanPath('img/hero.png'), 'img/hero.png');
t('cleanPath: dot segment', cleanPath('a/./b.png'), null);

/* ── 2. the font rule against the real script ───────────────────────────────────────────────────────────── */

const FONT_CASES = {
  'tokens-linked':   { 'index.html': '<link rel="stylesheet" href="/foundation/tokens.css"><style>h1{font:var(--gw-text-h1)}</style>' },
  'arial-only':      { 'index.html': '<style>body{font-family:Arial}</style>' },
  'names-no-load':   { 'index.html': '<style>h1{font-family:"Vert Grotesk Display"}</style>' },
  'tokens-unlinked': { 'index.html': '<style>h1{font:var(--gw-text-h1)}</style>' },
  'missing-face':    { 'index.html': '<style>@font-face{font-family:"Vert Grotesk Display";src:url(fonts/v.ttf)}h1{font-family:"Vert Grotesk Display"}</style>' },
  'face-present':    { 'index.html': '<style>@font-face{font-family:"Vert Grotesk Display";src:url(fonts/v.ttf)}h1{font-family:"Vert Grotesk Display"}</style>', 'fonts/v.ttf': 'x' },
  'linked-local-css': { 'index.html': '<link rel="stylesheet" href="s.css"><p>x</p>', 's.css': '@font-face{font-family:"Vert Grotesk Display";src:url(/fonts/v.ttf)}h1{font-family:"Vert Grotesk Display"}' },
  'css-fragment':    { 'index.html': '<link rel="stylesheet" href="/foundation/tokens.css">', 's.css': 'h1{font:var(--gw-text-h1)}' },
  'no-fonts':        { 'index.html': '<p>nothing about type</p>' },
};
for (const [name, files] of Object.entries(FONT_CASES)) {
  const dir = mkdtempSync(join(tmpdir(), 'fontcase-'));
  for (const [p, c] of Object.entries(files)) { mkdirSync(dirname(join(dir, p)), { recursive: true }); writeFileSync(join(dir, p), c); }
  let real = 'pass';
  try { execFileSync('bash', [join(ROOT, 'scripts/check-fonts.sh'), dir + '/', '--target', 'hosted'], { stdio: 'pipe', cwd: ROOT }); } catch { real = 'fail'; }
  const mine = fontProblems(Object.entries(files).filter(([p]) => /\.(html?|css)$/.test(p)).map(([path, text]) => ({ path, text })), Object.keys(files));
  t(`font rule agrees with check-fonts.sh: ${name}`, mine.length ? 'fail' : 'pass', real);
}

/* ── 3. the lane model ──────────────────────────────────────────────────────────────────────────────────── */

const rules = normalise({
  admins: ['boss@gushwork.ai'],
  groups: { gtm: ['sam@gushwork.ai'] },
  routes: [{ path: '/internal', access: 'internal' }],
  lanes: { GTM: { groups: ['gtm'], people: ['Swapnil@gushwork.ai'] }, 'Bad Name!': { people: ['x@gushwork.ai'] }, ops: { people: ['ops@gushwork.ai'] } },
});
t('lane names are slugs; bad ones are dropped', Object.keys(rules.lanes).sort(), ['gtm', 'ops']);
t('a listed person can publish', canPublish('swapnil@gushwork.ai', 'gtm', rules), true);
t('a group member can publish', canPublish('sam@gushwork.ai', 'gtm', rules), true);
t('not on another lane', canPublish('sam@gushwork.ai', 'ops', rules), false);
t('an admin is not automatically a publisher', canPublish('boss@gushwork.ai', 'gtm', rules), false);
t('an owner can publish anywhere', canPublish('owner@gushwork.ai', 'ops', rules), true);
t('an unknown lane', canPublish('owner@gushwork.ai', 'nope', { ...rules, lanes: {} }), true);
t('no email, no publish', canPublish('', 'gtm', rules), false);
t('lanesFor lists only mine', lanesFor('sam@gushwork.ai', rules), ['gtm']);
t('rules with no lanes key normalise to none', normalise({ routes: [{ path: '/internal', access: 'internal' }] }).lanes, {});

/* ── 4. the endpoint, against a faked GitHub and KV ─────────────────────────────────────────────────────── */

const kvData = new Map(), kvSets = new Map(), kvHashes = new Map(), vercelWrites = [];
let gh = null, calls = [];
const rulesJson = { access: { admins: [], groups: { gtm: ['sam@gushwork.ai'] }, routes: [{ path: '/internal', access: 'internal' }], lanes: { gtm: { groups: ['gtm'], people: ['swapnil@gushwork.ai'] } } } };
process.env.GLOBAL_CONFIG = 'https://edge-config.test/ecfg_x?token=t';

const order = [], slackLog = [];
const SLACK_USERS = { 'swapnil@gushwork.ai': 'USWAP', 'sam@gushwork.ai': 'USAM', 'priya@gushwork.ai': 'UPRIYA', 'nobody@gushwork.ai': 'UNOBODY' };
globalThis.fetch = async (url, init = {}) => {
  const u = String(url);
  let body = null;
  try { body = init.body ? JSON.parse(init.body) : null; } catch { body = init.body ? Object.fromEntries(new URLSearchParams(init.body)) : null; }
  const ok = (b, s = 200) => ({ ok: s < 400, status: s, text: async () => JSON.stringify(b), json: async () => b, headers: { get: () => '' } });
  if (u.startsWith('https://edge-config.test')) return ok(rulesJson);
  if (u.startsWith('https://slack.com/api/')) {
    const method = u.split('/api/')[1].split('?')[0];
    slackLog.push({ method, body, url: u });
    if (method === 'users.lookupByEmail') { const id = SLACK_USERS[body.email]; return ok(id ? { ok: true, user: { id } } : { ok: false, error: 'users_not_found' }); }
    if (method === 'users.info') { const id = new URL(u).searchParams.get('user'); const email = Object.keys(SLACK_USERS).find((e) => SLACK_USERS[e] === id); return ok(email ? { ok: true, user: { id, profile: { email } } } : { ok: false, error: 'user_not_found' }); }
    if (method === 'chat.postMessage') return ok({ ok: true, channel: 'D' + body.channel, ts: String(1000 + slackLog.length) });
    return ok({ ok: true });
  }
  if (u.startsWith('https://api.vercel.com/v1/edge-config/')) { const v = JSON.parse(init.body).items[0].value; vercelWrites.push(v); rulesJson.access = v; order.push('rules'); return ok({ status: 'ok' }); }
  if (u === 'https://kv.test/pipeline') {
    return ok(body.map((c) => {
      const [op, k, ...r] = c;
      if (op === 'GET') return { result: kvData.get(k) ?? null };
      if (op === 'SET') { if (r.includes('NX') && kvData.has(k)) return { result: null }; kvData.set(k, r[0]); return { result: 'OK' }; }
      if (op === 'HSET') { (kvHashes.get(k) || kvHashes.set(k, new Map()).get(k)).set(r[0], r[1]); return { result: 1 }; }
      if (op === 'HDEL') { (kvHashes.get(k) || new Map()).delete(r[0]); return { result: 1 }; }
      if (op === 'HGETALL') return { result: [...(kvHashes.get(k) || new Map())].flat() };
      if (op === 'DEL') { kvData.delete(k); return { result: 1 }; }
      if (op === 'SADD') { (kvSets.get(k) || kvSets.set(k, new Set()).get(k)).add(r[0]); return { result: 1 }; }
      if (op === 'SREM') { (kvSets.get(k) || new Set()).delete(r[0]); return { result: 1 }; }
      if (op === 'SMEMBERS') return { result: [...(kvSets.get(k) || [])] };
      if (op === 'INCR') { const n = (kvData.get(k) || 0) + 1; kvData.set(k, n); return { result: n }; }
      return { result: 1 };
    }));
  }
  if (u.startsWith('https://api.github.com/repos/gushwork-design/design-system')) {
    const path = u.replace('https://api.github.com/repos/gushwork-design/design-system', '');
    calls.push(`${init.method || 'GET'} ${path.split('?')[0]}`);
    return gh(path, init, body, ok);
  }
  throw new Error('unexpected fetch ' + u);
};

const cookie = async (email) => `${COOKIE}=${encodeURIComponent(await sign({ email, name: 'Test', exp: Math.floor(Date.now() / 1000) + 3600 }, process.env.SESSION_SECRET))}`;
const call = async ({ method = 'POST', op, body, headers = {}, token, email, ip = '1.1.1.1' }) => {
  const h = { 'x-forwarded-for': ip, host: 'design.gushwork.ai', ...(token ? { authorization: `Bearer ${token}` } : {}), ...(email ? { cookie: await cookie(email) } : {}), ...headers };
  const out = { status: 0, body: null };
  const res = { setHeader() {}, status(s) { out.status = s; return this; }, end(b) { out.body = JSON.parse(b); } };
  await publish({ method, query: { op }, headers: h, body }, res);
  return out;
};
const payload = (over = {}) => ({
  lane: 'gtm', page: 'agent-store', title: 'Agent store', blurb: 'The new mock-up.', owner: 'Swapnil', visibility: 'org',
  files: [{ path: 'index.html', b64: Buffer.from(page()).toString('base64') }], ...over,
});
const happyGh = (patch = () => null) => async (path, init, body, ok) => {
  const m = init.method || 'GET';
  const x = patch(path, m, body, ok); if (x) return x;
  if (m === 'GET' && path === '/git/ref/heads/main') return ok({ object: { sha: 'head1' } });
  if (m === 'GET' && path === '/git/commits/head1') return ok({ tree: { sha: 'tree0' } });
  if (m === 'GET' && path.startsWith('/contents/')) return ok({ message: 'Not Found' }, 404);
  if (m === 'POST' && path === '/git/blobs') return ok({ sha: 'blob' + calls.length });
  if (m === 'POST' && path === '/git/trees') return ok({ sha: 'tree1', _sent: body });
  if (m === 'POST' && path === '/git/commits') return ok({ sha: 'commit1', _sent: body });
  if (m === 'PATCH' && path === '/git/refs/heads/main') { order.push('commit'); return ok({}); }
  return ok({ message: 'unexpected ' + m + ' ' + path }, 500);
};
const H = { 'x-gw-publish': '1' };

// ── connecting: the device flow ──
t('publishing with no token: 401', (await call({ op: 'publish', body: payload() })).status, 401);
t('publishing with a made-up token: 401', (await call({ op: 'publish', token: 'gwp_notarealtokennotarealtoken', body: payload() })).status, 401);
t('a cookie alone cannot publish', (await call({ op: 'publish', email: 'swapnil@gushwork.ai', headers: H, body: payload() })).status, 401);

let st = await call({ op: 'device-start', body: {} });
t('device-start gives a code, a device code and where to go', [st.status, /^[BCDFGHJKLMNPQRSTVWXZ]{4}-[BCDFGHJKLMNPQRSTVWXZ]{4}$/.test(st.body.userCode), st.body.verifyUrl, st.body.interval], [200, true, 'https://design.gushwork.ai/internal/staging/connect', 3]);
const dev = st.body;
t('the device code is not stored, only its hash', [...kvData.keys()].some((k) => k.includes(dev.deviceCode)), false);
let pl = await call({ op: 'device-poll', body: { deviceCode: dev.deviceCode } });
t('polling before approval says pending', [pl.status, pl.body.status], [200, 'pending']);
t('a malformed device code: 400', (await call({ op: 'device-poll', body: { deviceCode: 'x' } })).status, 400);
t('an unknown device code has expired: 410', (await call({ op: 'device-poll', body: { deviceCode: 'A'.repeat(43) } })).status, 410);

t('the connect page needs a sign-in: 401', (await call({ op: 'device-approve', headers: H, body: { code: dev.userCode } })).status, 401);
t('me needs a sign-in: 401', (await call({ method: 'GET', op: 'me' })).status, 401);
let me = await call({ method: 'GET', op: 'me', email: 'sam@gushwork.ai' });
t('me lists the lanes of a group member', [me.status, me.body.lanes], [200, ['gtm']]);
me = await call({ method: 'GET', op: 'me', email: 'nobody@gushwork.ai' });
t('me lists no lanes for someone on none', me.body.lanes, []);
t('a cross-site POST without the header: 400', (await call({ op: 'device-approve', email: 'swapnil@gushwork.ai', body: { code: dev.userCode } })).status, 400);
t('someone on no lane cannot approve: 403', (await call({ op: 'device-approve', email: 'nobody@gushwork.ai', headers: H, body: { code: dev.userCode } })).status, 403);
t('a non-work account cannot approve: 403', (await call({ op: 'device-approve', email: 'a@gmail.com', headers: H, body: { code: dev.userCode } })).status, 403);
t('a short code: 400', (await call({ op: 'device-approve', email: 'swapnil@gushwork.ai', headers: H, body: { code: 'BCDF' } })).status, 400);
t('a wrong code: 404', (await call({ op: 'device-approve', email: 'swapnil@gushwork.ai', headers: H, body: { code: 'ZZZZ-ZZZZ' } })).status, 404);
pl = await call({ op: 'device-poll', body: { deviceCode: dev.deviceCode } });
t('a wrong code approves nothing', pl.body.status, 'pending');

let ap = await call({ op: 'device-approve', email: 'swapnil@gushwork.ai', headers: H, body: { code: dev.userCode.toLowerCase().replace('-', ' ') } });
t('the right code, typed loosely, approves', [ap.status, ap.body.ok, ap.body.lanes], [200, true, ['gtm']]);
t('approving stores no token', [...kvData.entries()].some(([k, v]) => k.startsWith('gw:pt:')), false);
pl = await call({ op: 'device-poll', body: { deviceCode: dev.deviceCode } });
const tok = pl.body.token;
t('the script collects a token, once', [pl.status, pl.body.status, /^gwp_/.test(tok), pl.body.email, pl.body.lanes], [200, 'approved', true, 'swapnil@gushwork.ai', ['gtm']]);
t('the token is stored only as a hash', [...kvData.keys()].some((k) => k.includes(tok)) || [...kvData.values()].some((v) => String(v).includes(tok)), false);
t('collecting it again: 410', (await call({ op: 'device-poll', body: { deviceCode: dev.deviceCode } })).status, 410);
t('the code is used up', (await call({ op: 'device-approve', email: 'swapnil@gushwork.ai', headers: H, body: { code: dev.userCode } })).status, 404);

// the person is removed from the lane between approving and collecting
{
  const d2 = (await call({ op: 'device-start', body: {} })).body;
  await call({ op: 'device-approve', email: 'swapnil@gushwork.ai', headers: H, body: { code: d2.userCode } });
  rulesJson.access.lanes.gtm.people = []; invalidateRules();
  const r = await call({ op: 'device-poll', body: { deviceCode: d2.deviceCode } });
  t('removed from every lane before collecting: no token', [r.status, r.body.token], [403, undefined]);
  rulesJson.access.lanes.gtm.people = ['swapnil@gushwork.ai']; invalidateRules();
}

// one address cannot start unlimited codes
{
  let last = 0;
  for (let n = 0; n < 22; n++) last = (await call({ op: 'device-start', body: {}, ip: '9.9.9.9' })).status;
  t('device-start is limited per address: 429', last, 429);
}

// ── publishing with the token ──
me = await call({ method: 'GET', op: 'me', token: tok });
t('me by token', [me.status, me.body.email, me.body.lanes], [200, 'swapnil@gushwork.ai', ['gtm']]);
let r = await call({ op: 'check', token: tok, body: payload({ files: [] }) });
t('check reports problems without writing', [r.status, r.body.ok, calls.length], [200, false, 0]);
t('not on the lane: 403', (await call({ op: 'publish', token: tok, body: payload({ lane: 'ops' }) })).status, 403);

gh = happyGh(); calls = [];
r = await call({ op: 'publish', token: tok, body: payload() });
t('publish to main', [r.status, r.body.mode, r.body.path], [200, 'main', '/internal/staging/gtm/agent-store']);
t('the writes are blobs, a tree, a commit and a ref update, in that order', calls.filter((c) => !c.includes('/contents/') && !c.includes('/git/ref/') && !c.includes('/git/commits/head1')),
  ['POST /git/blobs', 'POST /git/blobs', 'POST /git/trees', 'POST /git/commits', 'PATCH /git/refs/heads/main']);

let sentTree = null;
gh = happyGh((path, m, body, ok) => { if (m === 'POST' && path === '/git/trees') { sentTree = body; return ok({ sha: 'tree1' }); } return null; });
await call({ op: 'publish', token: tok, body: payload() });
t('only files under the lane and page are written', sentTree.tree.map((x) => x.path).sort(), ['web/internal/staging/gtm/agent-store/index.html', 'web/internal/staging/gtm/agent-store/staging.json']);

gh = happyGh((path, m, body, ok) => (m === 'GET' && path.startsWith('/contents/') ? ok({ name: 'index.html' }) : null)); calls = [];
r = await call({ op: 'publish', token: tok, body: payload() });
t('a lane folder that already holds a page is refused', [r.status, calls.some((c) => c.includes('/git/blobs'))], [409, false]);

gh = happyGh((path, m, body, ok) => {
  if (m === 'PATCH' && path === '/git/refs/heads/main') return ok({ message: 'Repository rule violations found' }, 422);
  if (m === 'POST' && path === '/git/refs') return ok({});
  if (m === 'POST' && path === '/pulls') return ok({ html_url: 'https://github.com/x/pull/9' });
  return null;
});
r = await call({ op: 'publish', token: tok, body: payload() });
t('when main refuses the account it falls back to a pull request', [r.status, r.body.mode, r.body.url], [200, 'pr', 'https://github.com/x/pull/9']);

let patches = 0;
gh = happyGh((path, m, body, ok) => {
  if (m === 'PATCH' && path === '/git/refs/heads/main') { patches++; return patches === 1 ? ok({ message: 'Update is not a fast forward' }, 422) : ok({}); }
  return null;
});
r = await call({ op: 'publish', token: tok, body: payload() });
t('when main moves it retries on the new head', [r.status, r.body.mode, patches], [200, 'main', 2]);

gh = happyGh((path, m, body, ok) => (m === 'POST' && path === '/git/trees' ? ok({ message: 'boom' }, 500) : null));
r = await call({ op: 'publish', token: tok, body: payload() });
t('a GitHub failure says nothing was published', [r.status, /Nothing was published/.test(r.body.error)], [502, true]);

// ── leaving ──
{
  const sets = () => (kvSets.get('gw:ptu:swapnil@gushwork.ai') || new Set()).size;
  for (let n = 0; n < 6; n++) {
    const d = (await call({ op: 'device-start', body: {}, ip: `7.7.7.${n}` })).body;
    await call({ op: 'device-approve', email: 'swapnil@gushwork.ai', headers: H, body: { code: d.userCode } });
    await call({ op: 'device-poll', body: { deviceCode: d.deviceCode } });
  }
  t('five tokens at most: connecting a sixth retires the oldest', sets() <= 5, true);
  t('and the very first token no longer works', (await call({ method: 'GET', op: 'me', token: tok })).status, 401);
}
{
  const d = (await call({ op: 'device-start', body: {}, ip: '6.6.6.6' })).body;
  await call({ op: 'device-approve', email: 'sam@gushwork.ai', headers: H, body: { code: d.userCode } });
  const t2 = (await call({ op: 'device-poll', body: { deviceCode: d.deviceCode } })).body.token;
  t('logout revokes the token', (await call({ op: 'logout', token: t2, body: {} })).body.ok, true);
  t('and it stops working', (await call({ method: 'GET', op: 'me', token: t2 })).status, 401);
  const d3 = (await call({ op: 'device-start', body: {}, ip: '6.6.6.7' })).body;
  await call({ op: 'device-approve', email: 'sam@gushwork.ai', headers: H, body: { code: d3.userCode } });
  const t3 = (await call({ op: 'device-poll', body: { deviceCode: d3.deviceCode } })).body.token;
  rulesJson.access.groups.gtm = []; invalidateRules();
  t('taking someone off the lane stops their token on the next call', (await call({ op: 'publish', token: t3, body: payload() })).status, 403);
  rulesJson.access.groups.gtm = ['sam@gushwork.ai']; invalidateRules();
}

// Access Control: only an owner changes who publishes to a lane
rulesJson.access.admins = ['boss@gushwork.ai'];
rulesJson.access.lanes = { gtm: { groups: ['gtm'], people: ['swapnil@gushwork.ai'] } };
rulesJson.access.groups = { gtm: ['sam@gushwork.ai'] };
invalidateRules();
const putRules = async (email, mutate) => {
  // what the page would hold: the rules as the API serves them, compiled owner pages and all
  const got = { body: null };
  await accessApi({ method: 'GET', headers: { cookie: await cookie(email) } }, { setHeader() {}, status() { return this; }, end(b) { got.body = JSON.parse(b); } });
  const cur = got.body.rules;
  mutate(cur);
  const out = { status: 0, body: null };
  await accessApi({ method: 'POST', headers: { cookie: await cookie(email) }, body: { rules: cur } },
    { setHeader() {}, status(st) { out.status = st; return this; }, end(b) { out.body = JSON.parse(b); } });
  return out;
};
let w = await putRules('boss@gushwork.ai', (c) => { c.lanes.ops = { groups: [], people: ['x@gushwork.ai'] }; });
t('an admin who is not an owner cannot add a lane', w.status, 403);
w = await putRules('boss@gushwork.ai', (c) => { c.lanes.gtm.people.push('new@gushwork.ai'); });
t('nor change who is on one', w.status, 403);
invalidateRules();
w = await putRules('boss@gushwork.ai', (c) => { c.routes.push({ path: '/internal/x', access: 'internal', groups: [], people: [] }); });
t('but an admin can still edit a page rule, and the lanes ride along untouched', [w.status, Object.keys(vercelWrites.at(-1).lanes)], [200, ['gtm']]);
invalidateRules();
w = await putRules('owner@gushwork.ai', (c) => { c.lanes.ops = { groups: [], people: ['x@gushwork.ai'] }; });
t('an owner can add a lane', [w.status, Object.keys(vercelWrites.at(-1).lanes).sort()], [200, ['gtm', 'ops']]);


// ── who can open the page ──
const seedRules = () => {
  rulesJson.access = { admins: ['boss@gushwork.ai'], groups: { gtm: ['sam@gushwork.ai'] }, routes: [{ path: '/internal', access: 'internal' }],
    lanes: { gtm: { groups: ['gtm'], people: ['swapnil@gushwork.ai'] } } };
  invalidateRules(); vercelWrites.length = 0; order.length = 0;
};
const connect = async (email, ip) => {
  const d = (await call({ op: 'device-start', body: {}, ip })).body;
  await call({ op: 'device-approve', email, headers: H, body: { code: d.userCode } });
  return (await call({ op: 'device-poll', body: { deviceCode: d.deviceCode } })).body.token;
};
const PAGE_PATH = '/internal/staging/gtm/agent-store';
const live = () => normalise(rulesJson.access);

// the pure rule: only ever narrows, never overrides the owner
{
  const base = normalise({ routes: [{ path: '/internal', access: 'internal' }], lanes: { gtm: { people: ['a@gushwork.ai'] } } });
  let c = setPageVisibility(base, 'gtm', 'p', 'lane');
  t('the creator is recorded when given', setPageVisibility(base, 'gtm', 'p2', 'lane', 'Sam@Gushwork.ai').rules.routes.at(-1).creator, 'sam@gushwork.ai');
  t('private adds one rule for the exact page', [c.changed, c.rules.routes.at(-1)], [true, { path: '/internal/staging/gtm/p', access: 'lane', lane: 'gtm', groups: [], people: [] }]);
  t('asking again changes nothing', setPageVisibility(c.rules, 'gtm', 'p', 'lane').changed, false);
  c = setPageVisibility(c.rules, 'gtm', 'p', 'org');
  t('org removes that same rule', [c.changed, c.rules.routes.some((r) => r.access === 'lane')], [true, false]);
  t('org on a page with no rule changes nothing', setPageVisibility(base, 'gtm', 'p', 'org').changed, false);
  const owned = normalise({ routes: [{ path: '/internal', access: 'internal' }, { path: '/internal/staging/gtm/p', access: 'people', people: ['x@gushwork.ai'] }] });
  c = setPageVisibility(owned, 'gtm', 'p', 'lane');
  t('a rule the owner set is never replaced', [c.changed, /owner/.test(c.note)], [false, true]);
  c = setPageVisibility(owned, 'gtm', 'p', 'org');
  t('and never removed', c.changed, false);
  const laneOwned = normalise({ routes: [{ path: '/internal', access: 'internal' }, { path: '/internal/staging/gtm', access: 'people', people: ['x@gushwork.ai'] }] });
  t('a stricter rule on the lane itself is not loosened by a page in it', setPageVisibility(laneOwned, 'gtm', 'p', 'lane').changed, false);
  const pub = normalise({ routes: [{ path: '/internal', access: 'internal' }, { path: '/internal/staging/gtm', access: 'public' }] });
  t('nor a public rule overridden', setPageVisibility(pub, 'gtm', 'p', 'lane').changed, false);
  t('a lane rule with no real lane fails closed, to admins', normalise({ routes: [{ path: '/x', access: 'lane', lane: 'Bad Lane!' }] }).routes[0].access, 'admin');
  t('its label', describeAccess({ access: 'lane', lane: 'gtm' }).label, 'Only for the gtm team');
  t('lane members are the people plus the group members', laneMembers(normalise({ groups: { gtm: ['s@gushwork.ai'] }, routes: [{ path: '/internal', access: 'internal' }], lanes: { gtm: { groups: ['gtm'], people: ['a@gushwork.ai'] } } }), 'gtm').sort(), ['a@gushwork.ai', 's@gushwork.ai']);
}

seedRules();
const samTok = await connect('sam@gushwork.ai', '5.5.5.5');
t('publishing without saying who can open it is refused', [(await call({ op: 'publish', token: samTok, body: payload({ visibility: undefined }) })).status], [422]);

gh = happyGh(); calls = [];
let pv = await call({ op: 'publish', token: samTok, body: payload({ visibility: 'lane' }) });
t('a private publish succeeds and says so', [pv.status, /Private to the gtm team/.test(pv.body.note), pv.body.visibility], [200, true, 'lane']);
t('the rule is written BEFORE the commit', order, ['rules', 'commit']);
{
  const R = live();
  const rule = R.routes.find((r) => r.path === PAGE_PATH);
  t('one rule, for that page, for that lane', [rule && rule.access, rule && rule.lane], ['lane', 'gtm']);
  t('the lane is kept in the rules', Object.keys(R.lanes), ['gtm']);
  t('a person on the lane can open it', decide(PAGE_PATH, { email: 'swapnil@gushwork.ai' }, R), 'allow');
  t('so can a member of a lane group', decide(PAGE_PATH, { email: 'sam@gushwork.ai' }, R), 'allow');
  t('an admin can', decide(PAGE_PATH, { email: 'boss@gushwork.ai' }, R), 'allow');
  t('someone else at the company cannot', decide(PAGE_PATH, { email: 'priya@gushwork.ai' }, R), 'forbid');
  t('the lane\'s other pages stay open to the company', decide('/internal/staging/gtm/other', { email: 'priya@gushwork.ai' }, R), 'allow');
}
t('taking someone off the lane closes the page to them at once', (() => { const R = live(); R.lanes.gtm.people = []; R.groups.gtm = []; return decide(PAGE_PATH, { email: 'swapnil@gushwork.ai' }, R); })(), 'forbid');

// the index shows a private page only to people who can open it
{
  const idx = async (email) => (await call({ method: 'GET', op: 'private-index', email })).body.pages.map((p) => p.path);
  t('the index lists it for the team', await idx('swapnil@gushwork.ai'), [PAGE_PATH]);
  t('and for an admin', await idx('boss@gushwork.ai'), [PAGE_PATH]);
  t('but not for anyone else', await idx('priya@gushwork.ai'), []);
  t('private-index needs a sign-in', (await call({ method: 'GET', op: 'private-index' })).status, 401);
}

// the owner's rules are never overridden by a publisher
{
  seedRules();
  rulesJson.access.routes.push({ path: '/internal/staging/gtm/held', access: 'people', groups: [], people: ['x@gushwork.ai'] }); invalidateRules();
  const r = await call({ op: 'publish', token: samTok, body: payload({ page: 'held', visibility: 'lane', files: [{ path: 'index.html', b64: Buffer.from(page().replace('agent-store', 'held')).toString('base64') }] }) });
  t('a page the owner already restricted is left as the owner set it', [r.status, order.includes('rules'), /owner/.test(r.body.note)], [200, false, true]);
}

// no rules store: a private page is refused, and nothing is published
{
  seedRules(); calls = [];
  const keep = process.env.VERCEL_API_TOKEN; delete process.env.VERCEL_API_TOKEN;
  const r = await call({ op: 'publish', token: samTok, body: payload({ visibility: 'lane' }) });
  process.env.VERCEL_API_TOKEN = keep;
  t('no rules store: a private publish is refused and writes nothing', [r.status, calls.length], [503, 0]);
  const r2 = await call({ op: 'publish', token: samTok, body: payload({ visibility: 'org' }) });
  t('an open page needs no rule, so it still publishes', r2.status, 200);
}

// publishing again as open removes only that rule
seedRules();
await call({ op: 'publish', token: samTok, body: payload({ visibility: 'lane' }) });
order.length = 0;
{
  const r = await call({ op: 'publish', token: samTok, body: payload({ visibility: 'org' }) });
  t('switching to open removes the page rule, then commits', [r.status, order, live().routes.some((x) => x.access === 'lane')], [200, ['rules', 'commit'], false]);
  t('and the company can open it again', decide(PAGE_PATH, { email: 'priya@gushwork.ai' }, live()), 'allow');
}

// ── a request for a private page goes to the team, and the team can answer ──
seedRules();
await call({ op: 'publish', token: samTok, body: payload({ visibility: 'lane' }) });
const asReq = async (email, path = PAGE_PATH) => {
  const out = { status: 0, body: null };
  await accessReq({ method: 'POST', query: {}, headers: { cookie: await cookie(email) }, body: { path } }, { setHeader() {}, status(st) { out.status = st; return this; }, end(b) { out.body = JSON.parse(b); } });
  return out;
};
const reqId = (email) => { for (const [k, v] of kvData) if (k.startsWith('gw:accreq:') && !k.includes(':by:') && !k.includes(':n:') && String(v).includes(email)) return k.split(':').pop(); return ''; };
let q;
{
  slackLog.length = 0;
  q = await asReq('priya@gushwork.ai');
  const dms = slackLog.filter((c) => c.method === 'chat.postMessage');
  t('the request is accepted', [q.status, q.body.state], [200, 'pending']);
  t('Bruce tells the owner and the page\'s creator, and no one else: not the rest of the lane, not the person asking', dms.map((d) => d.body.channel).sort(), ['UOWNER', 'USAM']);
  t('the message says whose page it is', [JSON.stringify(dms[0].body.blocks).includes('private to the *gtm* team'), JSON.stringify(dms[0].body.blocks).includes('published by *sam@gushwork.ai*')], [true, true]);
  t('and every message carries Approve and Decline', dms.every((d) => JSON.stringify(d.body.blocks).includes('gw_access_approve')), true);
  const id = reqId('priya@gushwork.ai');
  t('the request remembers every message it went out in', JSON.parse(kvData.get(`gw:accreq:${id}`)).dms.length, 2);
  t('the rule remembers who published the page', live().routes.find((r) => r.path === PAGE_PATH).creator, 'sam@gushwork.ai');
}
const press = (id, who, approve) => ({
  user: { id: who }, channel: { id: 'D' + who }, message: { ts: ((JSON.parse(kvData.get(`gw:accreq:${id}`)).dms || []).find((d) => d.channel === 'D' + who) || { ts: '1' }).ts, blocks: [{ block_id: `acc:${id}`, type: 'actions' }] },
  actions: [{ action_id: approve ? 'gw_access_approve' : 'gw_access_decline', value: id }],
});
{
  const id = reqId('priya@gushwork.ai');
  slackLog.length = 0;
  const w0 = vercelWrites.length;
  await answerRequest(press(id, 'UNOBODY', true), true, 'xoxb-test', new Set(['UOWNER']));
  t('someone not on the lane cannot answer', [slackLog.some((c) => c.method === 'chat.postEphemeral'), vercelWrites.length - w0, JSON.parse(kvData.get(`gw:accreq:${id}`)).status], [true, 0, 'open']);
  slackLog.length = 0;
  await answerRequest(press(id, 'USWAP', true), true, 'xoxb-test', new Set(['UOWNER']));
  t('nor can another member of the lane: only the creator and the owner', [slackLog.some((c) => c.method === 'chat.postEphemeral'), vercelWrites.length - w0, JSON.parse(kvData.get(`gw:accreq:${id}`)).status], [true, 0, 'open']);
  slackLog.length = 0;
  slackLog.length = 0;
  await answerRequest(press(id, 'USAM', true), true, 'xoxb-test', new Set(['UOWNER']));
  const rule = live().routes.find((r) => r.path === PAGE_PATH);
  t('the creator can approve', [JSON.parse(kvData.get(`gw:accreq:${id}`)).status, rule.access, rule.people], ['approved', 'lane', ['priya@gushwork.ai']]);
  t('the person can now open it, and nothing else widened', [decide(PAGE_PATH, { email: 'priya@gushwork.ai' }, live()), decide('/internal/staging/gtm/other', { email: 'priya@gushwork.ai' }, live())], ['allow', 'allow']);
  t('everyone who was told sees it is answered, by whom', slackLog.filter((c) => c.method === 'chat.update').map((c) => c.body.channel).sort(), ['DUOWNER', 'DUSAM']);
  t('the line says who approved', slackLog.some((c) => c.method === 'chat.update' && /Approved by sam@gushwork.ai/.test(c.body.text)), true);
  t('the person is told in Slack', slackLog.some((c) => c.method === 'chat.postMessage' && c.body.channel === 'UPRIYA'), true);
  slackLog.length = 0;
  const w1 = vercelWrites.length;
  await answerRequest(press(id, 'UOWNER', true), true, 'xoxb-test', new Set(['UOWNER']));
  t('a second press changes nothing', [vercelWrites.length - w1, slackLog.filter((c) => c.method === 'chat.update').length > 0], [0, true]);
}
{
  // a decline by the owner, on a request from someone else
  slackLog.length = 0;
  q = await asReq('nobody@gushwork.ai');
  const id = reqId('nobody@gushwork.ai');
  await answerRequest(press(id, 'UOWNER', false), false, 'xoxb-test', new Set(['UOWNER']));
  t('the owner can always answer, and a decline grants nothing', [JSON.parse(kvData.get(`gw:accreq:${id}`)).status, decide(PAGE_PATH, { email: 'nobody@gushwork.ai' }, live())], ['declined', 'forbid']);
  t('the decline tells them to ask the person who published it', slackLog.some((c) => c.method === 'chat.postMessage' && c.body.channel === 'UNOBODY' && /ask the person who published it/.test(c.body.text)), true);
}
{
  // an older private page with no recorded creator: the owner alone is told
  seedRules();
  rulesJson.access.routes.push({ path: '/internal/staging/gtm/old', access: 'lane', lane: 'gtm', groups: [], people: [] }); invalidateRules();
  slackLog.length = 0;
  await asReq('priya@gushwork.ai', '/internal/staging/gtm/old');
  t('no recorded creator: only the owner is told', slackLog.filter((c) => c.method === 'chat.postMessage').map((c) => c.body.channel), ['UOWNER']);
}
{
  // an ordinary restricted page is unchanged: only the owner is told
  seedRules();
  rulesJson.access.routes.push({ path: '/admin/secret', access: 'admin', groups: [], people: [] }); invalidateRules();
  slackLog.length = 0;
  await asReq('priya@gushwork.ai', '/admin/secret');
  t('a page with no lane tells only the owner, as before', slackLog.filter((c) => c.method === 'chat.postMessage').map((c) => c.body.channel), ['UOWNER']);
}

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
