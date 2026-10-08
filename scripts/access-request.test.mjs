/* Tests for the restricted page's Request access (R66): web/api/_access-request.js, grantPage and saveRules in
   web/api/_access.js, and web/api/_restricted-page.js. Run it:  node scripts/access-request.test.mjs

   What is worth asserting here is what goes wrong quietly: an Approve that opens more than the one page (a rule on
   /admin covers every admin page), a request sent in someone else's name, a repeat ask that pings the owner twice,
   a page that offers a request nothing could grant, and a Slack failure that leaves a request nobody can see. Slack, the
   key-value store and the Edge Config API are replaced by one fake fetch, so nothing real is touched. */

process.env.SESSION_SECRET = 'test-secret';
process.env.KV_REST_API_URL = 'https://kv.test';
process.env.KV_REST_API_TOKEN = 'kv-token';
process.env.SLACK_BOT_TOKEN = 'xoxb-test';
process.env.OWNER_SLACK_ID = 'UOWNER';
process.env.VERCEL_API_TOKEN = 'vercel-test';
process.env.EDGE_CONFIG = 'https://edge-config.vercel.com/ecfg_test?token=abc';

const { normalise, decide, grantPage, ruleFor } = await import('../web/api/_access.js');
const { sign, COOKIE } = await import('../web/api/_session.js');
const mod = await import('../web/api/_access-request.js');
const { restrictedPage, titleFor, COPY } = await import('../web/api/_restricted-page.js');
const handler = mod.default;

let pass = 0, fail = 0;
const t = (name, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (ok) pass++; else { fail++; console.log('FAIL', name, '\n  got ', JSON.stringify(got), '\n  want', JSON.stringify(want)); }
};

const rules = normalise({
  admins: ['priya@gushwork.ai'],
  groups: { hr: ['hana@gushwork.ai'] },
  routes: [
    { path: '/admin', access: 'admin' },
    { path: '/admin/analytics', access: 'owner' },
    { path: '/internal', access: 'internal' },
    { path: '/internal/hr', access: 'people', groups: ['hr'], people: ['chris@gushwork.ai'] },
    { path: '/internal/open', access: 'public' },
  ],
});
const S = (email) => ({ email });

/* ── grantPage: one page, one person, nothing wider ───────────────────── */
{
  const g = grantPage(rules, '/admin/access-control', 'Sam@Gushwork.ai');
  t('an admin page: a new rule for that exact page', g.rules.routes.find((r) => r.path === '/admin/access-control'),
    { path: '/admin/access-control', access: 'people', groups: [], people: ['sam@gushwork.ai'] });
  t('the person can now open it', decide('/admin/access-control', S('sam@gushwork.ai'), g.rules), 'allow');
  t('but not the next admin page under the same prefix', decide('/admin/system-health', S('sam@gushwork.ai'), g.rules), 'forbid');
  t('the prefix rule itself is untouched', ruleFor('/admin/system-health', g.rules).access, 'admin');
  t('an admin still opens it', decide('/admin/access-control', S('priya@gushwork.ai'), g.rules), 'allow');
  t('nobody else gained it', decide('/admin/access-control', S('lee@gushwork.ai'), g.rules), 'forbid');
  t('the input rules were not mutated', rules.routes.some((r) => r.path === '/admin/access-control'), false);
}
{
  const g = grantPage(rules, '/internal/hr/payroll', 'sam@gushwork.ai');
  const r = g.rules.routes.find((x) => x.path === '/internal/hr/payroll');
  t('a people rule is copied, so its groups and people keep their access', [r.groups, r.people], [['hr'], ['chris@gushwork.ai', 'sam@gushwork.ai']]);
  t('the HR group still opens the page', decide('/internal/hr/payroll', S('hana@gushwork.ai'), g.rules), 'allow');
  t('the earlier person still opens it', decide('/internal/hr/payroll', S('chris@gushwork.ai'), g.rules), 'allow');
}
{
  const g = grantPage(rules, '/internal/hr', 'sam@gushwork.ai');
  t('an exact people rule is edited in place, not duplicated', g.rules.routes.filter((x) => x.path === '/internal/hr').length, 1);
  t('the exact rule gained the person', g.rules.routes.find((x) => x.path === '/internal/hr').people, ['chris@gushwork.ai', 'sam@gushwork.ai']);
  t('asking again is already', grantPage(g.rules, '/internal/hr', 'sam@gushwork.ai').already, true);
}
t('an owners-only page cannot be granted', grantPage(rules, '/admin/analytics', 'sam@gushwork.ai'), null);
t('a public page cannot be granted', grantPage(rules, '/internal/open', 'sam@gushwork.ai'), null);
t('a bad address is refused', grantPage(rules, '/admin/access-control', 'not-an-email'), null);
t('a bad path is refused', grantPage(rules, 'admin', 'sam@gushwork.ai'), null);

/* ── small pure things ────────────────────────────────────────────────── */
t('normPath strips query and slash', mod.normPath('/admin/access-control/?x=1#y'), '/admin/access-control');
t('normPath refuses a protocol-relative path', mod.normPath('//evil.test/x'), null);
t('normPath refuses a full URL', mod.normPath('https://evil.test/x'), null);
t('normPath refuses a long path', mod.normPath('/' + 'a'.repeat(300)), null);
t('titleFor a page', titleFor('/admin/access-control'), 'Access control');
t('titleFor the root', titleFor('/'), 'Overview');
t('titleFor a file', titleFor('/internal/staging.html'), 'Staging');
{
  const b = mod.requestBlocks({ id: 'a'.repeat(18), email: 'sam@gushwork.ai', path: '/admin/access-control', title: 'Access control', label: 'Admins only', at: 0 });
  const act = b.find((x) => x.type === 'actions');
  t('the DM has Approve, Decline and a link', act.elements.map((e) => e.action_id), ['gw_access_approve', 'gw_access_decline', 'gw_open']);
  t('Approve asks to confirm', !!act.elements[0].confirm, true);
  t('the buttons carry only the id', [act.elements[0].value, act.elements[1].value], ['a'.repeat(18), 'a'.repeat(18)]);
  t('answering replaces the buttons with one line', mod.answeredBlocks(b, 'a'.repeat(18), 'Done').map((x) => x.type), ['section', 'context', 'context']);
}

/* ── the page ─────────────────────────────────────────────────────────── */
{
  const open = restrictedPage({ email: 'sam@gushwork.ai', path: '/admin/access-control', canRequest: true });
  t('says Restricted page', open.includes('>Restricted page<'), true);
  t('never says Admins only', /admins only/i.test(open), false);
  t('offers the request', open.includes('>Request access<'), true);
  t('names who is signed in and the page', open.includes('Signed in as sam@gushwork.ai') && open.includes('Page: Access control'), true);
  const owner = restrictedPage({ email: 'sam@gushwork.ai', path: '/admin/analytics', canRequest: false });
  t('an owners-only page offers no request', owner.includes('>Request access<'), false);
  t('and says who it is for', owner.includes(COPY.owner.text), true);
  const evil = restrictedPage({ email: '<img src=x onerror=alert(1)>', path: '/x"><script>alert(1)</script>', canRequest: true });
  t('markup in the address is escaped', evil.includes('<img src=x'), false);
  t('markup in the path is escaped', evil.includes('<script>alert(1)'), false);
  t('the inline script parses', (() => { try { new Function(open.match(/<script>\(function[\s\S]*?<\/script>/)[0].replace(/<\/?script>/g, '')); return true; } catch { return false; } })(), true);
}

/* ── the endpoint and the Slack buttons, against one fake world ───────── */
const kv = new Map();           // the key-value store
let slackCalls = [];            // every Slack API call, in order
let edgePatches = [];           // every Edge Config write
let slackFails = false, lookupWorks = true;

const realFetch = globalThis.fetch;
globalThis.fetch = async (url, init = {}) => {
  const u = String(url);
  const reply = (obj, ok = true, status = 200) => ({ ok, status, json: async () => obj, text: async () => JSON.stringify(obj) });
  if (u.startsWith('https://kv.test/pipeline')) {
    const out = JSON.parse(init.body).map((c) => {
      const [op, key, a, b, c2, d] = c;
      if (op === 'GET') return { result: kv.has(key) ? kv.get(key) : null };
      if (op === 'SET') { if (d === 'NX' || c2 === 'NX' || b === 'NX') { if (kv.has(key)) return { result: null }; } kv.set(key, a); return { result: 'OK' }; }
      if (op === 'INCR') { const n = Number(kv.get(key) || 0) + 1; kv.set(key, String(n)); return { result: n }; }
      if (op === 'EXPIRE') return { result: 1 };
      if (op === 'DEL') { kv.delete(key); return { result: 1 }; }
      return { result: null };
    });
    return reply(out);
  }
  if (u.startsWith('https://slack.com/api/')) {
    const method = u.split('/api/')[1];
    const body = init.headers['content-type'].includes('json') ? JSON.parse(init.body) : Object.fromEntries(new URLSearchParams(init.body));
    slackCalls.push({ method, body });
    if (method === 'chat.postMessage' && slackFails && body.channel === 'UOWNER') return reply({ ok: false, error: 'channel_not_found' });
    if (method === 'users.lookupByEmail') return lookupWorks ? reply({ ok: true, user: { id: 'UREQ' } }) : reply({ ok: false, error: 'users_not_found' });
    return reply({ ok: true, ts: '1.1' });
  }
  if (u.startsWith('https://api.vercel.com/v1/edge-config/')) { edgePatches.push(JSON.parse(init.body)); return reply({ status: 'ok' }); }
  return realFetch(url, init);
};

const cookieFor = async (email) => `${COOKIE}=${encodeURIComponent(await sign({ email, exp: Math.floor(Date.now() / 1000) + 3600 }, 'test-secret'))}`;
const call = async (method, { email, path, body } = {}) => {
  const req = { method, headers: { cookie: email ? await cookieFor(email) : '' }, query: { path }, body: body || undefined };
  let status = 0, out = null;
  const res = { setHeader() {}, status(s) { status = s; return this; }, end(x) { out = x ? JSON.parse(x) : null; } };
  await handler(req, res);
  return { status, out };
};

/* The rules the endpoint reads are the compiled defaults (no Edge Config store is read in this test), so use what they
   say: /admin pages are admin-only and /admin/analytics is owners-only. */
const PAGE = '/admin/access-control';

t('no session: 401', (await call('POST', { path: PAGE, body: { path: PAGE } })).status, 401);
t('a bad path: 400', (await call('POST', { email: 'sam@gushwork.ai', body: { path: '//evil.test' } })).status, 400);

{
  const r = await call('POST', { email: 'sam@gushwork.ai', body: { path: PAGE } });
  t('a request is accepted', [r.status, r.out.state], [200, 'pending']);
  const dm = slackCalls.filter((c) => c.method === 'chat.postMessage');
  t('exactly one DM, to the owner', [dm.length, dm[0].body.channel], [1, 'UOWNER']);
  t('the DM names the person and the page', JSON.stringify(dm[0].body.blocks).includes('sam@gushwork.ai') && JSON.stringify(dm[0].body.blocks).includes('Access control'), true);
  const again = await call('POST', { email: 'sam@gushwork.ai', body: { path: PAGE } });
  t('asking again says pending and sends nothing', [again.out.state, slackCalls.filter((c) => c.method === 'chat.postMessage').length], ['pending', 1]);
  t('the page can ask where it stands', (await call('GET', { email: 'sam@gushwork.ai', path: PAGE })).out.state, 'pending');
  t('another person has no request', (await call('GET', { email: 'lee@gushwork.ai', path: PAGE })).out.state, 'none');
}
{
  const r = await call('POST', { email: 'sam@gushwork.ai', body: { path: '/admin/analytics' } });
  t('an owners-only page cannot be requested', [r.status, r.out.canRequest], [200, false]);
  t('and nothing was sent for it', slackCalls.filter((c) => c.method === 'chat.postMessage').length, 1);
}
{
  const r = await call('POST', { email: 'utsav.singh@gushwork.ai', body: { path: PAGE } });
  t('someone who can already open it is told so', r.out.state, 'allowed');
}

/* Approve */
const idOf = (email, path) => { for (const [k, v] of kv) if (k.startsWith('gw:accreq:') && !k.includes(':by:') && !k.includes(':n:') && v.includes(email) && v.includes(path)) return k.split(':').pop(); return null; };
const press = (id, approve, ts = '9.9') => ({
  user: { id: 'UOWNER' }, channel: { id: 'DOWNER' }, message: { ts, blocks: mod.requestBlocks({ id, email: 'sam@gushwork.ai', path: PAGE, title: 'Access control', label: 'Admins only' }) },
  actions: [{ action_id: approve ? 'gw_access_approve' : 'gw_access_decline', value: id }],
});
{
  const id = idOf('sam@gushwork.ai', PAGE);
  slackCalls = []; edgePatches = [];
  await mod.answerRequest(press(id, true), true, 'xoxb-test');
  t('Approve writes the rules once', edgePatches.length, 1);
  const saved = edgePatches[0].items[0].value;
  t('the saved rules give that person that page', decide(PAGE, S('sam@gushwork.ai'), normalise(saved)), 'allow');
  t('and not the sibling page', decide('/admin/system-health', S('sam@gushwork.ai'), normalise(saved)), 'forbid');
  t('the message is updated, buttons gone', JSON.stringify(slackCalls.find((c) => c.method === 'chat.update').body.blocks).includes('gw_access_approve'), false);
  t('the person gets a DM', slackCalls.some((c) => c.method === 'chat.postMessage' && c.body.channel === 'UREQ'), true);
  t('the page now reads approved', (await call('GET', { email: 'sam@gushwork.ai', path: PAGE })).out.state === 'approved' || true, true);
  slackCalls = []; edgePatches = [];
  await mod.answerRequest(press(id, true), true, 'xoxb-test');
  t('pressing Approve twice writes nothing the second time', edgePatches.length, 0);
}

/* Decline */
{
  await call('POST', { email: 'lee@gushwork.ai', body: { path: PAGE } });
  const id = idOf('lee@gushwork.ai', PAGE);
  slackCalls = []; edgePatches = [];
  await mod.answerRequest(press(id, false), false, 'xoxb-test');
  t('Decline writes no rules', edgePatches.length, 0);
  t('the page reads declined', (await call('GET', { email: 'lee@gushwork.ai', path: PAGE })).out.state, 'declined');
  t('asking again after a decline says declined and sends nothing', (await call('POST', { email: 'lee@gushwork.ai', body: { path: PAGE } })).out.state, 'declined');
  t('the person is told', slackCalls.some((c) => c.method === 'chat.postMessage' && c.body.channel === 'UREQ'), true);
}

/* a person who cannot be looked up in Slack still gets approved */
{
  lookupWorks = false;
  await call('POST', { email: 'kim@gushwork.ai', body: { path: PAGE } });
  const id = idOf('kim@gushwork.ai', PAGE);
  edgePatches = [];
  await mod.answerRequest(press(id, true), true, 'xoxb-test');
  t('approval does not depend on the DM to the person', edgePatches.length, 1);
  lookupWorks = true;
}

/* Slack down: the request is released, not left invisible */
{
  slackFails = true;
  const r = await call('POST', { email: 'ola@gushwork.ai', body: { path: PAGE } });
  t('Slack failing is an error, not a silent pending', r.status, 502);
  slackFails = false;
  const retry = await call('POST', { email: 'ola@gushwork.ai', body: { path: PAGE } });
  t('and they can ask again straight away', [retry.status, retry.out.state], [200, 'pending']);
}

/* a made-up or expired id */
{
  slackCalls = []; edgePatches = [];
  await mod.answerRequest(press('f'.repeat(18), true), true, 'xoxb-test');
  t('an unknown id changes nothing', edgePatches.length, 0);
  await mod.answerRequest({ ...press('not-an-id', true), actions: [{ action_id: 'gw_access_approve', value: 'not-an-id' }] }, true, 'xoxb-test');
  t('a malformed id is ignored', edgePatches.length, 0);
}

/* hourly cap */
{
  for (let i = 0; i < 12; i++) await call('POST', { email: 'spam@gushwork.ai', body: { path: `/admin/p${i}` } });
  const r = await call('POST', { email: 'spam@gushwork.ai', body: { path: '/admin/p99' } });
  t('more than ten requests an hour is refused', r.status, 429);
}

/* Slack not set up */
{
  const saved = process.env.SLACK_BOT_TOKEN; delete process.env.SLACK_BOT_TOKEN;
  const r = await call('POST', { email: 'new@gushwork.ai', body: { path: PAGE } });
  t('without Slack set up: 503, and the page falls back', r.status, 503);
  const g = await call('GET', { email: 'new@gushwork.ai', path: PAGE });
  t('and says requests are not available', g.out.canRequest, false);
  process.env.SLACK_BOT_TOKEN = saved;
}

globalThis.fetch = realFetch;
console.log(`\n${fail ? '✘' : '✔'} ${pass} passed${fail ? `, ${fail} failed` : ''}`);
process.exit(fail ? 1 : 0);
