// Drives web/api/_review.js end to end with a signed owner cookie, a pretend Upstash and a pretend GitHub.
// Run: node scripts/review-handler.test.mjs
import { sign, COOKIE } from '../web/api/_session.js';

process.env.SESSION_SECRET = 'test-secret';
process.env.KV_REST_API_URL = 'https://kv.test'; process.env.KV_REST_API_TOKEN = 'k';
const { default: handler } = await import('../web/api/_review.js');

let pass = 0, fail = 0;
function t(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  ok ? pass++ : (fail++, console.log(`✘ ${name}\n  got  ${JSON.stringify(got)}\n  want ${JSON.stringify(want)}`));
}

/* pretend Upstash (pipeline) */
const kv = { list: [], hash: {} };
const gh = { fail: 0, allowMain: false, puts: [], calls: [], files: { 'exports/web/component-registry.json': { components: { button: {} } } }, prOpen: false };
globalThis.fetch = async (url, init = {}) => {
  const send = (code, body) => ({ ok: code < 300, status: code, json: async () => body, text: async () => JSON.stringify(body) });
  if (String(url).startsWith('https://trigger.test')) { gh.trigger = { url: String(url), init }; return send(200, {}); }
  if (String(url).startsWith('https://kv.test')) {
    const cmds = JSON.parse(init.body), out = [];
    for (const c of cmds) {
      const [op, key, a, b] = c;
      if (op === 'HSET') { kv.hash[a] = b; out.push({ result: 1 }); }
      else if (op === 'HDEL') { delete kv.hash[a]; out.push({ result: 1 }); }
      else if (op === 'HGET') out.push({ result: kv.hash[a] || null });
      else if (op === 'HGETALL') out.push({ result: Object.entries(kv.hash).flat() });
      else if (op === 'LPUSH') { kv.list.unshift(a); out.push({ result: 1 }); }
      else out.push({ result: 'OK' });
    }
    return send(200, out);
  }
  gh.calls.push((init.method || 'GET') + ' ' + new URL(url).pathname);
  if (gh.fail) return send(gh.fail === 403 ? 403 : 500, gh.fail === 403 ? { message: 'Resource not accessible by personal access token' } : {});
  const p = new URL(url).pathname, m = init.method || 'GET';
  if (p.endsWith('/git/ref/heads/main')) return send(200, { object: { sha: 's' } });
  if (p.includes('/git/ref/heads/review')) return send(200, { object: { sha: 's' } });
  if (p.endsWith('/pulls') && m === 'GET') return send(200, gh.prOpen ? [{ number: 9 }] : []);
  if (p.endsWith('/pulls') && m === 'POST') { gh.prOpen = true; return send(201, { number: 9, html_url: 'https://github.com/x/pull/9' }); }
  if (p.includes('/contents/') && m === 'GET') return send(200, { sha: 'b', content: Buffer.from(JSON.stringify(gh.files['exports/web/component-registry.json'])).toString('base64') });
  if (p.includes('/contents/') && m === 'PUT') {
    const b = JSON.parse(init.body); gh.puts.push(b);
    if (b.branch === 'main' && !gh.allowMain) return send(422, { message: 'Repository rule violations found' });   // main is protected until the account may bypass
    return send(200, { commit: { sha: 'c' + gh.puts.length } });
  }
  return send(200, {});
};

const cookie = COOKIE + '=' + await sign({ email: 'utsav.singh@gushwork.ai', exp: Math.floor(Date.now() / 1000) + 600 }, 'test-secret');
async function call(method, body, headers = {}) {
  const res = { code: 0, body: '', headers: {}, setHeader(k, v) { this.headers[k] = v; }, status(c) { this.code = c; return this; }, end(b) { this.body = b; } };
  await handler({ method, headers: { cookie, 'content-type': 'application/json', ...headers }, body }, res);
  return { code: res.code, json: res.body ? JSON.parse(res.body) : null };
}
const d = { scope: 'web', key: 'button', action: 'pass', fp: 'abcdef0123456789' };

delete process.env.GW_GITHUB_TOKEN;
let r = await call('POST', d);
t('no token: the decision is queued, as before', [r.code, r.json.mode, kv.list.length], [200, 'queue', 1]);

process.env.GW_GITHUB_TOKEN = 'tok'; kv.list.length = 0; kv.hash = {};
r = await call('POST', d);
t('with a token: it goes to a pull request', [r.code, r.json.mode, r.json.decision.pr.number], [200, 'github', 9]);
t('and is not also queued for a session', kv.list.length, 0);
t('the page can read it back', Object.keys((await call('GET')).json.state), ['web/button']);

r = await call('POST', { ...d, action: 'rework', note: 'fix labels' });
t('a rework is committed AND queued, because the note is the brief', [r.json.mode, kv.list.length], ['github', 1]);

r = await call('POST', { ...d, action: 'undo' });
t('undo of a github decision reverts it in the pull request', [r.code, r.json.note, Object.keys(kv.hash).length], [200, 'reverted in the pull request', 0]);

gh.fail = 1; kv.list.length = 0;
r = await call('POST', d);
t('GitHub down: falls back to the queue and says why', [r.code, r.json.mode, kv.list.length, r.json.githubError], [200, 'queue', 1, 'GitHub said 500 (GET /git/ref/heads/main)']);
gh.fail = 403; kv.list.length = 0;
r = await call('POST', d);
t('a 403 says what GitHub said and which call', r.json.githubError, 'GitHub said 403: Resource not accessible by personal access token (GET /git/ref/heads/main)');
gh.fail = 0;

/* ---- straight to main, once the account may bypass the rule ---- */
gh.allowMain = true; kv.list.length = 0; kv.hash = {}; gh.puts.length = 0; gh.calls.length = 0;
r = await call('POST', d);
t('main open: a pass is committed straight to main, no pull request', [r.json.mode, r.json.decision.pr, gh.puts.length, gh.puts[0].branch, gh.calls.some((c) => c.includes('/pulls'))], ['main', undefined, 1, 'main', false]);
t('and not queued for a session', kv.list.length, 0);
r = await call('POST', { ...d, action: 'undo' });
t('undo of a main decision is a commit that restores the record', [r.code, r.json.note, gh.puts.length, gh.puts[1].message.startsWith('Review: undo web/button'), Object.keys(kv.hash).length], [200, 'undone on main', 2, true, 0]);

delete process.env.GW_REWORK_TRIGGER_URL; delete process.env.GW_REWORK_TRIGGER_TOKEN; delete gh.trigger;
r = await call('POST', { ...d, action: 'rework', note: 'move the switch' });
t('a rework on main is also queued as the brief, and no routine is fired when none is set', [r.json.mode, kv.list.length, r.json.routine.fired, gh.trigger], ['main', 1, false, undefined]);
process.env.GW_REWORK_TRIGGER_URL = 'https://trigger.test/fire'; process.env.GW_REWORK_TRIGGER_TOKEN = 'rt';
r = await call('POST', { ...d, action: 'rework', note: 'move the switch' });
t('with a trigger set, a rework fires the routine with the note', [r.json.routine.fired, gh.trigger.init.headers.authorization, JSON.parse(gh.trigger.init.body).text.includes('move the switch'), JSON.parse(gh.trigger.init.body).text.includes('web/button')], [true, 'Bearer rt', true, true]);
delete gh.trigger;
await call('POST', d);
t('a pass never fires it', gh.trigger, undefined);
gh.allowMain = false; delete process.env.GW_REWORK_TRIGGER_URL; delete process.env.GW_REWORK_TRIGGER_TOKEN;

/* ---- who can read the decisions ---- */
kv.hash = { 'web/button': JSON.stringify({ action: 'rework', note: 'private note', by: 'utsav.singh@gushwork.ai', fp: 'abcdef0123456789', at: 'now', via: 'main', prev: null }) };
const other = COOKIE + '=' + await sign({ email: 'ana@gushwork.ai', exp: Math.floor(Date.now() / 1000) + 600 }, 'test-secret');
r = await call('GET', undefined, { cookie: other });
t('a signed-in teammate can read the decisions, without the note or who made them', [r.code, r.json.state['web/button']], [200, { action: 'rework', at: 'now', fp: 'abcdef0123456789', via: 'main' }]);
r = await call('GET');
t('the owner still gets the whole row', r.json.state['web/button'].note, 'private note');
r = await call('POST', d, { cookie: other });
t('a teammate still cannot decide', r.code, 403);
r = await call('GET', undefined, { cookie: '' });
t('signed out is refused', r.code, 401);
kv.hash = {};

r = await call('POST', { ...d, fp: '' });
t('no fingerprint: queued, never a blind pass', r.json.mode, 'queue');
r = await call('POST', { ...d, action: 'reject', note: '' });
t('a reject with no note is refused', r.code, 400);
r = await call('POST', d, { 'content-type': 'text/plain' });
t('a non-JSON post is refused', r.code, 415);

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
