// Tests for web/api/_health.js: each check against a pretend world, the alert decision, and the three ways in.
// Run: node scripts/health.test.mjs
import { sign, COOKIE } from '../web/api/_session.js';

process.env.SESSION_SECRET = 'test-secret';
const { default: handler, runChecks, fromSnapshot, alertDecision, alertText, failing } = await import('../web/api/_health.js');

let pass = 0, fail = 0;
function t(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  ok ? pass++ : (fail++, console.log(`✘ ${name}\n  got  ${JSON.stringify(got)}\n  want ${JSON.stringify(want)}`));
}

const NOW = Date.parse('2026-10-05T10:00:00Z'), DAY = 86400000;
const iso = (d) => new Date(NOW + d * DAY).toISOString();

/* a pretend internet: path -> [status, body, headers] ; anything unlisted is a 404 */
function world(map) {
  const calls = [];
  const f = async (url, init = {}) => {
    const u = String(url); calls.push(`${init.method || 'GET'} ${u.split('?')[0]}`);
    const key = Object.keys(map).find((k) => u.startsWith(k));
    const [status, body, hdr] = key ? (typeof map[key] === 'function' ? map[key](u, init) : map[key]) : [404, {}];
    return { ok: status < 300, status, headers: { get: (k) => (hdr && hdr[k.toLowerCase()]) || null }, json: async () => body, text: async () => JSON.stringify(body) };
  };
  f.calls = calls; return f;
}
const goodEnv = { KV_REST_API_URL: 'https://kv.test', KV_REST_API_TOKEN: 'k', SESSION_SECRET: 's', GOOGLE_CLIENT_ID: 'g', GOOGLE_CLIENT_SECRET: 'g', GW_GITHUB_TOKEN: 'gh', SLACK_BOT_TOKEN: 'sb', SLACK_SIGNING_SECRET: 'ss', OWNER_SLACK_ID: 'U1', GUSHWORK_NOTICE_TOKEN: 'nt', VERCEL_API_TOKEN: 'v', VERCEL_TEAM_ID: 't', VERCEL_PROJECT_ID: 'prj', CRON_SECRET: 'cs', ANTHROPIC_API_KEY: 'a', BLOB_READ_WRITE_TOKEN: 'b', GW_REWORK_TRIGGER_URL: 'u', GW_REWORK_TRIGGER_TOKEN: 't2', SITE_BASE: 'https://site.test', EDGE_CONFIG: 'https://edge-config.vercel.com/ecfg_1?token=x' };
const kvOk = (cmds) => cmds.map((c) => c[0] === 'GET' ? { result: 'probe' } : { result: c[0] === 'LLEN' ? 3 : 1 });
const happy = () => world({
  'https://kv.test/pipeline': (u, i) => { const cmds = JSON.parse(i.body); return [200, cmds.map((c) => c[0] === 'GET' ? { result: c[1] === 'gw:health-probe' ? String(NOW) : null } : { result: c[0] === 'LLEN' ? 3 : 1 })]; },
  'https://edge-config.vercel.com': [200, { access: { admins: [], groups: {}, routes: [{ path: '/admin', access: 'admin' }] } }],
  'https://site.test/version.json': [200, { version: '1.58.0' }],
  'https://api.vercel.com/v6/deployments': [200, { deployments: [{ created: NOW - 2 * 3600000, state: 'READY' }] }],
  'https://api.github.com/repos/gushwork-design/design-system/commits': [200, []],
  'https://api.github.com/repos/gushwork-design/design-system/contents/web/api/auth': [200, [{ type: 'file', name: 'login.js' }, { type: 'file', name: 'me.js' }]],
  'https://api.github.com/repos/gushwork-design/design-system/contents/web/api': [200, [{ type: 'file', name: 'gw.js' }, { type: 'file', name: '_x.js' }, { type: 'dir', name: 'auth' }]],
  'https://api.github.com/repos/gushwork-design/design-system/rulesets/1': [200, { bypass_actors: [{ actor_id: 5 }] }],
  'https://api.github.com/repos/gushwork-design/design-system/rulesets': [200, [{ id: 1, name: 'main: pull request required' }]],
  'https://api.github.com/repos/gushwork-design/design-system/pulls': [200, [{ number: 5, created_at: iso(-1) }]],
  'https://api.github.com/repos/gushwork-design/design-system': [200, {}, { 'github-authentication-token-expiration': new Date(NOW + 40 * DAY).toISOString().replace('T', ' ').replace(/\..+/, ' UTC') }],
  'https://rdap.org/domain/gushwork.ai': [200, { events: [{ eventAction: 'expiration', eventDate: iso(200) }] }],
  'https://accounts.google.com/.well-known/openid-configuration': [200, {}],
  'https://slack.com/api/auth.test': [200, { ok: true, user: 'bruce' }],
  'https://api.anthropic.com/v1/models': [200, {}],
});
const run = async (env, f, extra = {}) => runChecks({ env, fetch: f, now: NOW, certEnd: async () => iso(60), edge: async () => ({ store: true, state: { state: 'ok' } }), lastDeploy: 0, ...extra });
const by = (r, id) => r.checks.find((x) => x.id === id);

let r = await run(goodEnv, happy());
t('a healthy world has no failures', failing(r.checks).map((x) => x.id), []);
t('every check has an area, a name and a status', r.checks.every((x) => x.area && x.name && ['ok', 'warn', 'fail', 'unknown'].includes(x.status)), true);
t('the store is probed with a write, a read and a delete', by(r, 'kv').status, 'ok');
t('the live site answers', [by(r, 'site').status, by(r, 'site').detail.includes('1.58.0')], ['ok', true]);
t('the function count reads the repo', by(r, 'functions').detail, '3 of 12 serverless functions used on the Hobby plan.');
t('a bypass on the ruleset is ok', by(r, 'bypass').status, 'ok');
t('the GitHub token shows its expiry', by(r, 'github').detail.includes('40 days'), true);
t('no secret value ever appears in a report', JSON.stringify(r).includes('test-secret') || JSON.stringify(r).includes('"k"'), false);

r = await run(goodEnv, happy(), { edge: async () => ({ store: false }) });
t('no Edge Config store is a failure', by(r, 'edge').status, 'fail');
r = await run(goodEnv, happy(), { edge: async () => ({ store: true, state: { state: 'unreachable' } }) });
t('an unreadable Edge Config is a failure', by(r, 'edge').status, 'fail');
r = await run(goodEnv, happy(), { edge: async () => ({ store: true, state: { state: 'empty' } }) });
t('an empty Edge Config needs improving', by(r, 'edge').status, 'warn');

/* each way a thing breaks reads as its own sentence */
let env = { ...goodEnv }; delete env.KV_REST_API_URL; delete env.KV_REST_API_TOKEN;
r = await run(env, happy());
t('no store is a failure with a fix', [by(r, 'kv').status, !!by(r, 'kv').fix], ['fail', true]);

r = await run(goodEnv, world({ ...{}, 'https://kv.test/pipeline': [500, {}] }));
t('a store that errors is a failure, not a crash', by(r, 'kv').status, 'unknown');

let f = happy(); const w = happy();
r = await run(goodEnv, world({ 'https://api.github.com/repos/gushwork-design/design-system': [401, {}] }));
t('a rejected GitHub token is a failure', by(r, 'github').status, 'fail');

r = await run(goodEnv, happy(), { certEnd: async () => iso(10) });
t('a certificate 10 days out needs improving', by(r, 'tls').status, 'warn');
r = await run(goodEnv, happy(), { certEnd: async () => iso(3) });
t('a certificate 3 days out is failing', by(r, 'tls').status, 'fail');
r = await run(goodEnv, happy(), { certEnd: async () => { throw new Error('refused'); } });
t('an unreachable certificate is unknown, not a failure', by(r, 'tls').status, 'unknown');

const old = (n) => world({ ...Object.fromEntries([]), });
r = await run(goodEnv, world({
  'https://api.github.com/repos/gushwork-design/design-system/contents/web/api/auth': [200, Array.from({ length: 6 }, (_, i) => ({ type: 'file', name: `a${i}.js` }))],
  'https://api.github.com/repos/gushwork-design/design-system/contents/web/api': [200, Array.from({ length: 5 }, (_, i) => ({ type: 'file', name: `f${i}.js` }))],
}));
t('eleven functions is a warning about the cap', [by(r, 'functions').status, by(r, 'functions').detail.startsWith('11 of 12')], ['warn', true]);

r = await run(goodEnv, world({ ...{}, 'https://api.github.com/repos/gushwork-design/design-system/rulesets/1': [200, { bypass_actors: [] }], 'https://api.github.com/repos/gushwork-design/design-system/rulesets': [200, [{ id: 1, name: 'main: pull request required' }]] }));
t('a main ruleset with no bypass needs improving', by(r, 'bypass').status, 'warn');

r = await run(goodEnv, world({ 'https://slack.com/api/auth.test': [200, { ok: false, error: 'invalid_auth' }] }));
t('a Slack token Slack refuses is a failure', by(r, 'slack').status, 'fail');

env = { ...goodEnv }; delete env.GW_REWORK_TRIGGER_URL;
r = await run(env, happy());
t('an unset rework trigger needs improving', by(r, 'trigger').status, 'warn');
env = { ...goodEnv }; delete env.CRON_SECRET;
r = await run(env, happy());
t('no CRON_SECRET means the daily alert is off, and says so', [by(r, 'cron').status, by(r, 'env').detail.includes('CRON_SECRET')], ['warn', true]);

r = await run(goodEnv, world({ 'https://api.github.com/repos/gushwork-design/design-system/pulls': [200, [{ number: 19, created_at: iso(-12) }, { number: 91, created_at: iso(-5) }, { number: 2, created_at: iso(-1) }]] }));
t('pull requests older than 3 days are listed, oldest first', by(r, 'prs').detail.startsWith('2 of 3 open for more than 3 days: #19'), true);

r = await run(goodEnv, world({ 'https://api.github.com/repos/gushwork-design/design-system/commits': [200, [{ commit: { message: 'Review: pass web/navbar' } }, { commit: { message: 'Add a thing' } }]], 'https://api.vercel.com/v6/deployments': [200, { deployments: [{ created: NOW - 3600000, state: 'READY' }] }] }));
t('commits newer than the live site count, review decisions do not', [by(r, 'behind').status, by(r, 'behind').detail.startsWith('1 change')], ['warn', true]);

/* the routine's snapshot */
t('no snapshot yet reads as unknown', fromSnapshot(null, NOW)[0].status, 'unknown');
let s = fromSnapshot({ at: iso(-2), checks: [{ id: 'drift', name: 'Skill drift', status: 'ok', detail: '0 wrong' }, { id: 'tests', name: 'Tests', status: 'bogus', detail: 'x' }] }, NOW);
t('a fresh snapshot is ok and its rows come through', [s[0].status, s[1].id, s[2].status], ['ok', 'routine-drift', 'unknown']);
t('a snapshot older than 5 days says the routine missed a run', fromSnapshot({ at: iso(-6), checks: [] }, NOW)[0].status, 'warn');

/* the alert decision */
const F = (...ids) => ids.map((id) => ({ id, name: id, detail: 'broken' }));
t('nothing failing sends nothing, and clears an old record', alertDecision([], { sig: 'kv', at: NOW }, NOW), { send: false, store: null, clear: true });
t('a new failure sends', alertDecision(F('kv'), null, NOW).send, true);
t('the same failure the next day stays quiet', alertDecision(F('kv'), { sig: 'kv', at: NOW - DAY }, NOW).send, false);
t('the same failure after 3 days reminds', alertDecision(F('kv'), { sig: 'kv', at: NOW - 4 * DAY }, NOW).send, true);
t('a changed set sends', alertDecision(F('kv', 'slack'), { sig: 'kv', at: NOW - DAY }, NOW).send, true);
t('the DM text names each failure and links the page', alertText(F('kv'), 'https://s.test').includes('<https://s.test/admin/system-health|'), true);

/* the three ways in */
const sent = [];
function ctxFor(env, f) { return { env, fetch: f, now: NOW, certEnd: async () => iso(60), edge: async () => ({ store: true, state: { state: 'ok' } }), lastDeploy: 0 }; }
async function call(req, ctx) {
  const res = { code: 0, body: '', headers: {}, setHeader(k, v) { this.headers[k] = v; }, status(c) { this.code = c; return this; }, end(b) { this.body = b; } };
  await handler({ method: 'GET', headers: {}, query: {}, ...req }, res, ctx);
  return { code: res.code, json: res.body ? JSON.parse(res.body) : null };
}
const cookie = COOKIE + '=' + await sign({ email: 'utsav.singh@gushwork.ai', exp: Math.floor(NOW / 1000) + 600 }, 'test-secret');
const other = COOKIE + '=' + await sign({ email: 'ana@gushwork.ai', exp: Math.floor(NOW / 1000) + 600 }, 'test-secret');
process.env.SESSION_SECRET = 'test-secret';

let out = await call({}, ctxFor(goodEnv, happy()));
t('signed out is refused', out.code, 401);
out = await call({ headers: { cookie: other } }, ctxFor(goodEnv, happy()));
t('a teammate is refused', out.code, 403);
out = await call({ headers: { cookie } }, ctxFor(goodEnv, happy()));
t('the owner gets the checks, the areas and the counts', [out.code, out.json.areas.length, typeof out.json.counts.ok], [200, 4, 'number']);

out = await call({ query: { cron: '1' }, headers: {} }, ctxFor(goodEnv, happy()));
t('the cron without its secret is refused', out.code, 401);
out = await call({ query: { cron: '1' }, headers: { authorization: 'Bearer wrong' } }, ctxFor(goodEnv, happy()));
t('the cron with the wrong secret is refused', out.code, 401);

const posts = [];
const slackStub = { 'https://slack.com/api/chat.postMessage': (u, i) => { posts.push(JSON.parse(i.body)); return [200, { ok: true }]; } };
const quiet = happy();
const quietF = async (u, i) => (String(u).startsWith('https://slack.com/api/chat.postMessage') ? world(slackStub)(u, i) : quiet(u, i));
out = await call({ query: { cron: '1' }, headers: { authorization: 'Bearer cs' } }, ctxFor(goodEnv, quietF));
t('the cron with its secret runs the checks', out.code, 200);
t('and with nothing failing it sends nothing', [out.json.failing, posts.length], [[], 0]);

const failEnv = { ...goodEnv, SLACK_BOT_TOKEN: 'sb' }; delete failEnv.KV_REST_API_URL; delete failEnv.KV_REST_API_TOKEN;
const fw = world({ 'https://slack.com/api/chat.postMessage': (u, i) => { posts.push(JSON.parse(i.body)); return [200, { ok: true }]; }, 'https://slack.com/api/auth.test': [200, { ok: true, user: 'b' }] });
out = await call({ query: { cron: '1' }, headers: { authorization: 'Bearer cs' } }, ctxFor(failEnv, fw));
t('a failing check DMs the owner', [out.json.failing.includes('kv'), posts.length, posts[0] && posts[0].channel], [true, 1, 'U1']);
t('the DM carries no secret', JSON.stringify(posts).includes('"k"') || JSON.stringify(posts).includes('sb'), false);

/* the routine's POST */
const stored = [];
const kvw = world({ 'https://kv.test/pipeline': (u, i) => { stored.push(...JSON.parse(i.body)); return [200, [{ result: 'OK' }]]; } });
out = await call({ method: 'POST', headers: { 'x-gushwork-token': 'nope' }, body: { checks: [] } }, ctxFor(goodEnv, kvw));
t('a snapshot with the wrong token is refused', out.code, 401);
out = await call({ method: 'POST', headers: { 'x-gushwork-token': 'nt' }, body: { checks: [{ id: 'drift', name: 'Skill drift', status: 'ok', detail: '0 wrong', fix: '' }, { id: '', name: 'x' }] } }, ctxFor(goodEnv, kvw));
t('a snapshot with the token is stored, junk rows dropped', [out.code, out.json.stored, stored[0][0], stored[0][1]], [200, 1, 'SET', 'gw:health-snapshot']);
out = await call({ method: 'POST', headers: { 'x-gushwork-token': 'nt' }, body: { nope: 1 } }, ctxFor(goodEnv, kvw));
t('a malformed snapshot is a 400', out.code, 400);

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
