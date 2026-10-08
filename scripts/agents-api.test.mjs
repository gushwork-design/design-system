// What Alfred is up to, read from his GitHub threads (web/api/_agents.js). Run: node scripts/agents-api.test.mjs
process.env.SESSION_SECRET = 'test-secret';
const M = await import('../web/api/_agents.js');
const gw = await import('../web/api/gw.js');
const { sign, COOKIE } = await import('../web/api/_session.js');
let pass = 0, fail = 0; const ok = (n, c, d = '') => (c ? pass++ : (fail++, console.log(`✘ ${n} ${d}`)));
const now = Date.parse('2026-10-08T12:00:00Z'), iso = (h) => new Date(now - h * 3600e3).toISOString();
const c = (who, h, text, tag = '') => ({ id: Math.random(), created_at: iso(h), body: `<!-- gw-hub:${who}${tag ? ' ' + tag : ''} -->\n${text}`, user: { login: 'bot' } });

ok('state: Alfred finished', M.stateOf({ who: 'alfred', blocked: false }) === 'ready');
ok('state: Alfred is stuck', M.stateOf({ who: 'alfred', blocked: true }) === 'stuck');
ok('state: Utsav spoke last, or nobody has', M.stateOf({ who: 'owner' }) === 'queued' && M.stateOf(null) === 'queued');

const issues = [
  { number: 11, title: 'Rework thread: web/agent-card', html_url: 'https://github.com/gushwork-design/design-system/issues/11', updated_at: iso(2) },
  { number: 12, title: 'Rework thread: slides/media-well', html_url: 'https://github.com/gushwork-design/design-system/issues/12', updated_at: iso(30) },
  { number: 13, title: 'Rework thread: web/footer', html_url: 'https://github.com/gushwork-design/design-system/issues/13', updated_at: iso(50) },
  { number: 14, title: 'Fix the build', html_url: 'x', updated_at: iso(1) },
  { number: 15, title: 'Rework thread: web/image', pull_request: {}, html_url: 'x', updated_at: iso(1) },
];
const comments = {
  11: [c('owner', 40, 'send back', 'rework'), c('alfred', 30, 'First pass'), c('owner', 26, 'closer'), c('alfred', 2, 'Done: lighter border  with   spaces')],
  12: [c('owner', 40, 'send back', 'rework'), c('alfred', 30, 'I need the real photo', 'blocked')],
  13: [c('alfred', 800, 'old run'), c('owner', 50, 'again', 'rework')],
};
const calls = [];
const ghFn = async (token, path) => { calls.push(path); if (path.startsWith('/issues?')) return issues; const m = path.match(/^\/issues\/(\d+)\/comments/); return m ? comments[m[1]] || [] : []; };
const a = await M.alfredActivity({ token: 't', now, days: 30, ghFn });
ok('only rework threads are read: not other issues, not pull requests', a.threads.length === 3 && !a.threads.some((t) => t.number === 14 || t.number === 15), JSON.stringify(a.threads.map((t) => t.number)));
ok('their comments are fetched, one call per thread', calls.filter((p) => p.includes('/comments')).length === 3);
const by = Object.fromEntries(a.threads.map((t) => [t.number, t]));
ok('finished, stuck and queued come from the last comment', by[11].state === 'ready' && by[12].state === 'stuck' && by[13].state === 'queued', JSON.stringify([by[11].state, by[12].state, by[13].state]));
ok('the item reference is split into scope and key', by[11].scope === 'web' && by[11].key === 'agent-card');
ok('counts add up', a.counts.ready === 1 && a.counts.stuck === 1 && a.counts.queued === 1);
ok('runs are Alfred comments inside the window; an old one does not count', a.runs === 3 && by[13].runs === 0, a.runs);
ok('the last run is the newest Alfred comment', a.lastRunAt === iso(2));
ok('runs are counted by day', Object.values(a.byDay).reduce((x, y) => x + y, 0) === 3);
ok('the note is the last comment, squashed and short', by[11].note === 'Done: lighter border with spaces' && by[11].note.length <= 160);
ok('newest thread first', a.threads[0].number === 11);

// the endpoint
const call = async (method, email, query) => { let status = 0, out = null; await gw.default({ method, query: { action: 'agents', ...(query || {}) }, headers: { cookie: email ? `${COOKIE}=${encodeURIComponent(await sign({ email, exp: Math.floor(Date.now() / 1000) + 600 }, 'test-secret'))}` : '' }, url: '/api/gw?action=agents' }, { setHeader() {}, status(s) { status = s; return this; }, json(o) { out = o; return this; } }); return { status, out }; };
ok('routed through gw: signed out is 401', (await call('GET', null)).status === 401);
ok('a teammate is 403', (await call('GET', 'sam@gushwork.ai')).status === 403);
ok('POST is refused', (await call('POST', 'utsav.singh@gushwork.ai')).status === 405);
delete process.env.GW_GITHUB_TOKEN;
const noTok = await call('GET', 'utsav.singh@gushwork.ai');
ok('without a GitHub token the owner is told it is not configured, not given an error', noTok.status === 200 && noTok.out.configured === false);
process.env.GW_GITHUB_TOKEN = 'ghp_fake_for_test';
globalThis.fetch = async () => { throw new Error('network down with ghp_fake_for_test inside'); };
const bad = await call('GET', 'utsav.singh@gushwork.ai');
ok('a GitHub failure is a 502 that leaks nothing', bad.status === 502 && !JSON.stringify(bad.out).includes('ghp_'), JSON.stringify(bad.out));
const vj = JSON.parse((await import('node:fs')).readFileSync(new URL('../web/vercel.json', import.meta.url), 'utf8'));
ok('/api/agents is a rewrite onto gw', vj.rewrites.some((x) => x.source === '/api/agents' && x.destination === '/api/gw?action=agents'));
console.log(`${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
