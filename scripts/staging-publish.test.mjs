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

const { checkSubmission, fontProblems, isSlug, cleanPath } = await import('../web/api/_staging-rules.js');
const { normalise, canPublish, lanesFor } = await import('../web/api/_access.js');
const { sign, COOKIE } = await import('../web/api/_session.js');
const publish = (await import('../web/api/_publish.js')).default;
const accessApi = (await import('../web/api/access.js')).default;
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
  lane: 'gtm', page: 'agent-store', title: 'Agent store', blurb: 'The new mock-up.', owner: 'Swapnil',
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

const kvData = new Map(), kvSets = new Map(), vercelWrites = [];
let gh = null, calls = [];
const rulesJson = { access: { admins: [], groups: { gtm: ['sam@gushwork.ai'] }, routes: [{ path: '/internal', access: 'internal' }], lanes: { gtm: { groups: ['gtm'], people: ['swapnil@gushwork.ai'] } } } };
process.env.GLOBAL_CONFIG = 'https://edge-config.test/ecfg_x?token=t';

globalThis.fetch = async (url, init = {}) => {
  const u = String(url), body = init.body ? JSON.parse(init.body) : null;
  const ok = (b, s = 200) => ({ ok: s < 400, status: s, text: async () => JSON.stringify(b), json: async () => b, headers: { get: () => '' } });
  if (u.startsWith('https://edge-config.test')) return ok(rulesJson);
  if (u.startsWith('https://api.vercel.com/v1/edge-config/')) { vercelWrites.push(JSON.parse(init.body).items[0].value); return ok({ status: 'ok' }); }
  if (u === 'https://kv.test/pipeline') {
    return ok(body.map((c) => {
      const [op, k, ...r] = c;
      if (op === 'GET') return { result: kvData.get(k) ?? null };
      if (op === 'SET') { kvData.set(k, r[0]); return { result: 'OK' }; }
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
const call = async ({ method = 'POST', op, body, headers = {}, email = 'swapnil@gushwork.ai', anon = false }) => {
  const h = { ...(anon ? {} : { cookie: await cookie(email) }), ...headers };
  const out = { status: 0, body: null, setHeader() {}, };
  const res = { setHeader() {}, status(s) { out.status = s; return this; }, end(b) { out.body = JSON.parse(b); } };
  await publish({ method, query: { op }, headers: h, body }, res);
  return out;
};
const payload = (over = {}) => ({
  lane: 'gtm', page: 'agent-store', title: 'Agent store', blurb: 'The new mock-up.', owner: 'Swapnil',
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
  if (m === 'PATCH' && path === '/git/refs/heads/main') return ok({});
  return ok({ message: 'unexpected ' + m + ' ' + path }, 500);
};
const H = { 'x-gw-publish': '1' };

t('no session: 401', (await call({ op: 'publish', anon: true, body: payload() })).status, 401);
t('a cross-site POST without the header: 400', (await call({ op: 'publish', body: payload() })).status, 400);
t('not on the lane: 403', (await call({ op: 'publish', headers: H, email: 'nobody@gushwork.ai', body: payload() })).status, 403);
t('a non-work account: 403', (await call({ op: 'publish', headers: H, email: 'a@gmail.com', body: payload() })).status, 403);

let r = await call({ method: 'GET', op: 'state', email: 'sam@gushwork.ai' });
t('state lists my lanes (a group member)', [r.status, r.body.lanes], [200, ['gtm']]);
r = await call({ method: 'GET', op: 'state', email: 'swapnil@gushwork.ai' });
t('state lists my lanes (a named person)', r.body.lanes, ['gtm']);

r = await call({ op: 'check', headers: H, body: payload({ files: [] }) });
t('check reports problems without writing', [r.status, r.body.ok, calls.length], [200, false, 0]);

gh = happyGh(); calls = [];
r = await call({ op: 'publish', headers: H, body: payload() });
t('publish to main', [r.status, r.body.mode, r.body.path], [200, 'main', '/internal/staging/gtm/agent-store']);
t('the writes are blobs, a tree, a commit and a ref update, in that order', calls.filter((c) => !c.includes('/contents/') && !c.includes('/git/ref/') && !c.includes('/git/commits/head1')).map((c) => c),
  ['POST /git/blobs', 'POST /git/blobs', 'POST /git/trees', 'POST /git/commits', 'PATCH /git/refs/heads/main']);

let sentTree = null;
gh = happyGh((path, m, body, ok) => { if (m === 'POST' && path === '/git/trees') { sentTree = body; return ok({ sha: 'tree1' }); } return null; });
calls = [];
await call({ op: 'publish', headers: H, body: payload() });
t('only files under the lane and page are written', sentTree.tree.map((x) => x.path).sort(), ['web/internal/staging/gtm/agent-store/index.html', 'web/internal/staging/gtm/agent-store/staging.json']);
t('nothing is deleted', sentTree.tree.every((x) => x.sha), true);

gh = happyGh((path, m, body, ok) => (m === 'GET' && path.startsWith('/contents/') ? ok({ name: 'index.html' }) : null)); calls = [];
r = await call({ op: 'publish', headers: H, body: payload() });
t('a lane folder that already holds a page is refused', [r.status, calls.some((c) => c.includes('/git/blobs'))], [409, false]);

gh = happyGh((path, m, body, ok) => {
  if (m === 'PATCH' && path === '/git/refs/heads/main') return ok({ message: 'Repository rule violations found' }, 422);
  if (m === 'POST' && path === '/git/refs') return ok({});
  if (m === 'POST' && path === '/pulls') return ok({ html_url: 'https://github.com/x/pull/9' });
  return null;
}); calls = [];
r = await call({ op: 'publish', headers: H, body: payload() });
t('when main refuses the account it falls back to a pull request', [r.status, r.body.mode, r.body.url], [200, 'pr', 'https://github.com/x/pull/9']);

let patches = 0;
gh = happyGh((path, m, body, ok) => {
  if (m === 'PATCH' && path === '/git/refs/heads/main') { patches++; return patches === 1 ? ok({ message: 'Update is not a fast forward' }, 422) : ok({}); }
  return null;
}); calls = [];
r = await call({ op: 'publish', headers: H, body: payload() });
t('when main moves it retries on the new head', [r.status, r.body.mode, patches], [200, 'main', 2]);

gh = happyGh((path, m, body, ok) => (m === 'POST' && path === '/git/trees' ? ok({ message: 'boom' }, 500) : null));
r = await call({ op: 'publish', headers: H, body: payload() });
t('a GitHub failure says nothing was published', [r.status, /Nothing was published/.test(r.body.error)], [502, true]);

// tokens
r = await call({ op: 'token-mint', headers: H, body: { label: 'My Claude' } });
const tok = r.body.token;
t('mint returns the token once', [r.status, /^gwp_/.test(tok)], [200, true]);
t('only the hash is stored', [...kvData.keys()].some((k) => k.includes(tok)), false);
r = await call({ method: 'GET', op: 'state' });
t('the list shows the token without its value', [r.body.tokens.length, JSON.stringify(r.body.tokens).includes(tok)], [1, false]);
gh = happyGh(); calls = [];
r = await call({ op: 'publish', anon: true, headers: { authorization: `Bearer ${tok}` }, body: payload() });
t('a token publishes with no cookie and no header', [r.status, r.body.mode], [200, 'main']);
r = await call({ op: 'publish', anon: true, headers: { authorization: `Bearer ${tok}` }, body: payload({ lane: 'ops' }) });
t('a token cannot publish to a lane its owner is not on', r.status, 403);
r = await call({ op: 'token-mint', anon: true, headers: { authorization: `Bearer ${tok}` }, body: {} });
t('a token cannot mint another', r.status, 403);
r = await call({ op: 'publish', anon: true, headers: { authorization: 'Bearer gwp_notarealtokennotarealtoken' }, body: payload() });
t('a wrong token: 401', r.status, 401);
// removing the person from the lane stops the token at once
rulesJson.access.lanes.gtm.people = []; rulesJson.access.groups.gtm = [];
const { invalidate } = await import('../web/api/_access.js');
invalidate();   // the rules are cached for 10 s; a real revoke is seen on the next read after that
const out = await call({ op: 'publish', anon: true, headers: { authorization: `Bearer ${tok}` }, body: payload() });
t('taking someone off the lane stops their token on the next call', out.status, 403);
r = await call({ op: 'token-revoke', headers: H, body: { id: tok.slice(0, 4) } });
t('a short id cannot revoke by prefix', r.body.ok, false);
r = await call({ op: 'token-revoke', headers: H, body: { id: tok } });
t('the full token is not an id', r.body.ok, false);
const id = (await call({ method: 'GET', op: 'state' })).body.tokens[0].id;
r = await call({ op: 'token-revoke', headers: H, body: { id } });
t('revoking by id works even after leaving every lane', r.body.ok, true);
r = await call({ method: 'GET', op: 'state' });
t('the list is empty after', r.body.tokens, []);


// Access Control: only an owner changes who publishes to a lane
rulesJson.access.admins = ['boss@gushwork.ai'];
rulesJson.access.lanes = { gtm: { groups: ['gtm'], people: ['swapnil@gushwork.ai'] } };
rulesJson.access.groups = { gtm: ['sam@gushwork.ai'] };
invalidate();
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
invalidate();
w = await putRules('boss@gushwork.ai', (c) => { c.routes.push({ path: '/internal/x', access: 'internal', groups: [], people: [] }); });
t('but an admin can still edit a page rule, and the lanes ride along untouched', [w.status, Object.keys(vercelWrites.at(-1).lanes)], [200, ['gtm']]);
invalidate();
w = await putRules('owner@gushwork.ai', (c) => { c.lanes.ops = { groups: [], people: ['x@gushwork.ai'] }; });
t('an owner can add a lane', [w.status, Object.keys(vercelWrites.at(-1).lanes).sort()], [200, ['gtm', 'ops']]);

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
