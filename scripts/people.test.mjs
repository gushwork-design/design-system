/* Tests for the People work: the Slack-backed directory, and GUESTS (outside people let in to named pages and tools).
   Run it:  node scripts/people.test.mjs

   The guest design is "separate cookie, separate key": a guest holds `gw_guest`, signed with a different key, so every API module
   that reads only `gw_session` is closed to them by default, and a guest cannot move a cookie across. These tests are mostly about
   that being true, and about the two APIs (certificates, Drop Studio) that opt guests in doing so safely. */

import { createHmac } from 'node:crypto';

process.env.SESSION_SECRET = 'test-secret-test-secret-test-secret';
process.env.OWNER_EMAILS = 'owner@gushwork.ai';
process.env.GOOGLE_CLIENT_ID = 'cid'; process.env.GOOGLE_CLIENT_SECRET = 'csecret';
process.env.KV_REST_API_URL = 'https://kv.test'; process.env.KV_REST_API_TOKEN = 'kv';
process.env.SLACK_BOT_TOKEN = 'xoxb-test'; process.env.VERCEL_API_TOKEN = 'vercel-test';
process.env.GLOBAL_CONFIG = 'https://edge-config.test/ecfg_x?token=t';
process.env.DROP_REFERENCE_TOKEN = '';              // Drop Studio answers "not configured" for a signed-in person, which is all we need

const S = await import('../web/api/_session.js');
const A = await import('../web/api/_access.js');
const { sign, verify, COOKIE, GUEST_COOKIE, guestSecret, sessionSecret, readAnySession } = S;
const accessApi = (await import('../web/api/access.js')).default;
const callback = (await import('../web/api/auth/callback.js')).default;
const login = (await import('../web/api/auth/login.js')).default;
const logout = (await import('../web/api/auth/logout.js')).default;
const me = (await import('../web/api/auth/me.js')).default;
const tools = (await import('../web/api/_tools.js')).default;
const certs = (await import('../web/api/_certificates.js')).default;
const drop = (await import('../web/api/_drop-studio.js')).default;
const mw = (await import('../web/middleware.js')).default;
const { fetchSlackPeople } = await import('../web/api/access.js');
const { restrictedPage } = await import('../web/api/_restricted-page.js');

let pass = 0, fail = 0;
const t = (name, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (ok) pass++; else { fail++; console.log('FAIL', name, '\n  got ', JSON.stringify(got), '\n  want', JSON.stringify(want)); }
};

const tomorrow = new Date(Date.now() + 864e5).toISOString().slice(0, 10);
const lastWeek = new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10);
const rulesRaw = () => ({
  admins: ['boss@gushwork.ai', 'outsider-admin@evil.test'],
  groups: { gtm: ['sam@gushwork.ai', 'ally@partner.test'] },
  routes: [
    { path: '/admin', access: 'admin' }, { path: '/internal', access: 'internal' },
    { path: '/internal/staging/social-creative', access: 'people', people: ['guest@partner.test', 'lapsed@partner.test', 'stranger@partner.test'] },
    { path: '/internal/certificate-creator', access: 'people', people: ['guest@partner.test'], groups: ['gtm'] },
    { path: '/internal/staging/drop-studio', access: 'people', people: ['guest@partner.test'] },
    { path: '/internal/email-signature', access: 'internal' },
    { path: '/internal/staging/gtm/page', access: 'lane', lane: 'gtm', people: ['guest@partner.test'] },
  ],
  lanes: { gtm: { groups: ['gtm'], people: ['sam@gushwork.ai'] } },
  guests: {
    'guest@partner.test': { expires: tomorrow, by: 'owner@gushwork.ai' },
    'lapsed@partner.test': { expires: lastWeek, by: 'owner@gushwork.ai' },
    'ally@partner.test': { expires: tomorrow, by: 'owner@gushwork.ai' },
    'sam@gushwork.ai': { expires: tomorrow, by: 'x' },                 // an inside address can never be a guest: dropped
    'bad@partner.test': { expires: 'soon', by: 'x' },                  // not a date: dropped
  },
});

/* ── 1. the model ─────────────────────────────────────────────────────────────────────────────────────────────────────── */
const R = A.normalise(rulesRaw());
t('guests keep only outside addresses with a real date', Object.keys(R.guests).sort(), ['ally@partner.test', 'guest@partner.test', 'lapsed@partner.test']);
t('an active guest is active', A.guestActive('guest@partner.test', R), true);
t('an expired guest is not', A.guestActive('lapsed@partner.test', R), false);
t('an unlisted outside address is not', A.guestActive('stranger@partner.test', R), false);
t('the last day still counts', A.guestActive('guest@partner.test', { guests: { 'guest@partner.test': { expires: new Date().toISOString().slice(0, 10) } } }), true);
t('an outside address in the admin list is not an admin', A.isAdmin('outsider-admin@evil.test', R), false);
t('an inside admin still is', A.isAdmin('boss@gushwork.ai', R), true);
t('a guest cannot publish to a lane, even through a team', [A.canPublish('ally@partner.test', 'gtm', R), A.canPublish('guest@partner.test', 'gtm', R)], [false, false]);
t('a staff member on the lane still can', A.canPublish('sam@gushwork.ai', 'gtm', R), true);

const d = (path, email) => A.decide(path, { email }, R);
t('a guest opens a page that names them', d('/internal/staging/social-creative', 'guest@partner.test'), 'allow');
t('and the tool that names them', d('/internal/certificate-creator', 'guest@partner.test'), 'allow');
t('but not a page that only follows /internal', d('/internal/email-signature', 'guest@partner.test'), 'forbid');
t('not an admin page', d('/admin/access-control', 'guest@partner.test'), 'forbid');
t('not the staging index', d('/internal/staging', 'guest@partner.test'), 'forbid');
t('an expired guest opens nothing, even a page that names them', d('/internal/staging/social-creative', 'lapsed@partner.test'), 'forbid');
t('an outside address that is not a guest opens nothing, even a page that names them', d('/internal/staging/social-creative', 'stranger@partner.test'), 'forbid');
t('a guest in a team opens what names the team', d('/internal/certificate-creator', 'ally@partner.test'), 'allow');
t('but not what the team does not', d('/internal/staging/social-creative', 'ally@partner.test'), 'forbid');
t('a guest named on a lane-private page opens it', d('/internal/staging/gtm/page', 'guest@partner.test'), 'allow');
t('an expired guest does not', d('/internal/staging/gtm/page', 'lapsed@partner.test'), 'forbid');
t('staff are unaffected', [d('/internal/email-signature', 'someone@gushwork.ai'), d('/admin/x', 'boss@gushwork.ai')], ['allow', 'allow']);
t('groupsFor does not include guests the nav would draw for', A.groupsFor('guest@partner.test', R), []);

/* ── 2. the cookies ───────────────────────────────────────────────────────────────────────────────────────────────────── */
const exp = Math.floor(Date.now() / 1000) + 3600;
const staffCookie = await sign({ email: 'sam@gushwork.ai', name: 'Sam', exp }, sessionSecret());
const guestPayload = { typ: 'guest', email: 'guest@partner.test', name: 'Gus', exp };
const guestCookie = await sign(guestPayload, guestSecret());
t('the two keys differ', guestSecret() !== sessionSecret(), true);
t('a guest cookie does not verify as a staff cookie', await verify(guestCookie, sessionSecret()), null);
t('a staff cookie does not verify as a guest cookie', await verify(staffCookie, guestSecret()), null);
t('readAnySession: staff', (await readAnySession(`${COOKIE}=${encodeURIComponent(staffCookie)}`)).email, 'sam@gushwork.ai');
const g = await readAnySession(`${GUEST_COOKIE}=${encodeURIComponent(guestCookie)}`);
t('readAnySession: a guest comes back marked, and never admin', [g.guest, g.admin, g.email], [true, false, 'guest@partner.test']);
t('a guest value moved into gw_session is nobody', await readAnySession(`${COOKIE}=${encodeURIComponent(guestCookie)}`), null);
t('a staff value moved into gw_guest is nobody', await readAnySession(`${GUEST_COOKIE}=${encodeURIComponent(staffCookie)}`), null);
t('a guest-key cookie without the guest claim is refused', await readAnySession(`${GUEST_COOKIE}=${encodeURIComponent(await sign({ email: 'guest@partner.test', exp }, guestSecret()))}`), null);
t('a guest cookie carrying admin:true is still not an admin', (await readAnySession(`${GUEST_COOKIE}=${encodeURIComponent(await sign({ ...guestPayload, admin: true }, guestSecret()))}`)).admin, false);

/* ── 3. the fake world ────────────────────────────────────────────────────────────────────────────────────────────────── */
let rulesJson = { access: rulesRaw() };
const kvData = new Map(), hashes = new Map(), vercelWrites = [];
let slackMembers = null, slackError = '', slackCalls = 0;
const ok = (b, s = 200) => ({ ok: s < 400, status: s, text: async () => JSON.stringify(b), json: async () => b, headers: { get: () => '' } });
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, init = {}) => {
  const u = String(url);
  if (u.startsWith('https://edge-config.test')) return ok(rulesJson);
  if (u.startsWith('https://api.vercel.com/v1/edge-config/')) { const v = JSON.parse(init.body).items[0].value; vercelWrites.push(v); rulesJson = { access: v }; return ok({ status: 'ok' }); }
  if (u.startsWith('https://slack.com/api/users.list')) { slackCalls++; return slackError ? ok({ ok: false, error: slackError }) : ok({ ok: true, members: slackMembers, response_metadata: { next_cursor: '' } }); }
  if (u === 'https://kv.test/pipeline') {
    return ok(JSON.parse(init.body).map(([op, k, ...r]) => {
      if (op === 'GET') return { result: kvData.get(k) ?? null };
      if (op === 'SET') { kvData.set(k, r[0]); return { result: 'OK' }; }
      if (op === 'LRANGE') return { result: (kvData.get('__list:' + k) || []) };
      if (op === 'LPUSH') { const l = kvData.get('__list:' + k) || []; l.unshift(r[0]); kvData.set('__list:' + k, l); return { result: 1 }; }
      if (op === 'HSET') { (hashes.get(k) || hashes.set(k, new Map()).get(k)).set(r[0], r[1]); return { result: 1 }; }
      if (op === 'HGET') return { result: (hashes.get(k) || new Map()).get(r[0]) ?? null };
      if (op === 'HDEL') { (hashes.get(k) || new Map()).delete(r[0]); return { result: 1 }; }
      if (op === 'HLEN') return { result: (hashes.get(k) || new Map()).size };
      if (op === 'HVALS') return { result: [...(hashes.get(k) || new Map()).values()] };
      if (op === 'HMGET') return { result: r.map((f) => (hashes.get(k) || new Map()).get(f) ?? null) };
      return { result: 1 };
    }));
  }
  if (u === 'https://oauth2.googleapis.com/token') return ok({ id_token: 'x.' + Buffer.from(JSON.stringify(googleClaims)).toString('base64url') + '.y' });
  throw new Error('unexpected fetch ' + u);
};
let googleClaims = {};

const call = async (handler, { method = 'GET', query = {}, headers = {}, body, url = '/x' } = {}) => {
  const out = { status: 0, body: null, headers: {} };
  const res = {
    setHeader(k, v) { out.headers[k.toLowerCase()] = v; },
    status(s) { out.status = s; return this; },
    writeHead(s, h) { out.status = s; Object.assign(out.headers, Object.fromEntries(Object.entries(h || {}).map(([a, b]) => [a.toLowerCase(), b]))); },
    end(b) { try { out.body = JSON.parse(b); } catch { out.body = b; } },
    json(b) { out.body = b; },
  };
  await handler({ method, query, headers: { host: 'design.gushwork.ai', ...headers }, body, url }, res);
  return out;
};
const cookies = (...pairs) => ({ cookie: pairs.map(([n, v]) => `${n}=${encodeURIComponent(v)}`).join('; ') });
const asGuest = cookies([GUEST_COOKIE, guestCookie]);
const asStaff = cookies([COOKIE, staffCookie]);
const ownerCookie = await sign({ email: 'owner@gushwork.ai', name: 'Owner', exp }, sessionSecret());
const bossCookie = await sign({ email: 'boss@gushwork.ai', name: 'Boss', exp }, sessionSecret());

/* ── 4. the gate ──────────────────────────────────────────────────────────────────────────────────────────────────────── */
const gate = async (path, cookieHeader) => {
  const headers = new Headers(); if (cookieHeader) headers.set('cookie', cookieHeader.cookie);
  const r = await mw(new Request('https://design.gushwork.ai' + path, { headers }), {});
  return r ? { status: r.status, text: await r.text(), loc: r.headers.get('location') } : { status: 'next' };
};
t('the gate lets a guest through to a page that names them', (await gate('/internal/staging/social-creative', asGuest)).status, 'next');
{
  const r = await gate('/internal/email-signature', asGuest);
  t('the gate refuses a guest elsewhere, with their own screen and no way to ask', [r.status, r.text.includes('Not open to your guest account'), r.text.includes('>Request access<')], [403, true, false]);
}
t('the gate bounces nobody to sign in', (await gate('/internal/staging/social-creative')).status >= 300, true);
t('a guest cannot reach the admin area', (await gate('/admin/access-control', asGuest)).status, 403);
t('the tools\' shared files load for anyone', [(await gate('/internal/tool-shell.css')).status, (await gate('/internal/tool-chrome.js')).status], ['next', 'next']);
t('the gate lets staff through as before', (await gate('/internal/email-signature', asStaff)).status, 'next');
{
  const lapsed = cookies([GUEST_COOKIE, await sign({ typ: 'guest', email: 'lapsed@partner.test', exp }, guestSecret())]);
  t('a cookie for a guest who has since lapsed opens nothing', (await gate('/internal/staging/social-creative', lapsed)).status, 403);
  const gone = cookies([GUEST_COOKIE, await sign({ typ: 'guest', email: 'removed@partner.test', exp }, guestSecret())]);
  t('nor does one for a guest who was removed', (await gate('/internal/staging/social-creative', gone)).status, 403);
}

/* ── 5. sign-in ───────────────────────────────────────────────────────────────────────────────────────────────────────── */
const signIn = async (claims) => {
  googleClaims = claims;
  const nonce = 'n0nce';
  const state = Buffer.from(JSON.stringify({ n: nonce, next: '/internal/staging/social-creative' })).toString('base64url');
  return call(callback, { query: {}, url: `/api/auth/callback?code=c&state=${state}`, headers: { cookie: `gw_oauth_state=${nonce}` } });
};
const setNames = (r) => [].concat(r.headers['set-cookie'] || []).map((c) => c.split('=')[0]);
const cookieVal = (r, name) => decodeURIComponent((([].concat(r.headers['set-cookie'] || []).find((c) => c.startsWith(name + '=')) || '').split(';')[0] || '').slice(name.length + 1));
{
  let r = await signIn({ email: 'guest@partner.test', email_verified: true, name: 'Gus', picture: null });
  t('an invited guest is signed in as a guest, to the page they came for', [r.status, r.headers.location, setNames(r).includes(GUEST_COOKIE)], [302, '/internal/staging/social-creative', true]);
  const gc = cookieVal(r, GUEST_COOKIE);
  const sess = await verify(gc, guestSecret());
  t('their cookie is the guest kind, ends with their invitation, and is not a staff cookie', [sess.typ, sess.exp <= Math.floor(Date.parse(tomorrow + 'T23:59:59Z') / 1000), await verify(gc, sessionSecret())], ['guest', true, null]);
  t('no staff cookie is set for them', setNames(r).filter((n) => n === COOKIE).length === 1 && cookieVal(r, COOKIE) === '', true);
  r = await signIn({ email: 'lapsed@partner.test', email_verified: true });
  t('an expired guest is refused', [r.status, /neither|Not on the list/.test(String(r.body))], [403, true]);
  r = await signIn({ email: 'stranger@elsewhere.test', email_verified: true });
  t('an outside account nobody invited is refused', r.status, 403);
  r = await signIn({ email: 'guest@partner.test', email_verified: false });
  t('an unverified address is refused first', r.status, 403);
  r = await signIn({ email: 'sam@gushwork.ai', email_verified: true, hd: 'gushwork.ai', name: 'Sam' });
  t('a company account gets a staff cookie and the guest cookie is cleared', [r.status, setNames(r).includes(COOKIE), cookieVal(r, GUEST_COOKIE) === ''], [302, true, true]);
  r = await signIn({ email: 'sam@gushwork.ai', email_verified: true, hd: 'other.test' });
  t('a company-looking address on someone else\'s Workspace is still refused', r.status, 403);
  const lr = await call(login, { url: '/api/auth/login?next=/x' });
  t('sign-in no longer narrows Google\'s picker to the company domain', [lr.status, new URL(lr.headers.location).searchParams.has('hd')], [302, false]);
  const lo = await call(logout, { url: '/api/auth/logout' });
  t('sign-out clears both cookies', [setNames(lo).includes(COOKIE), setNames(lo).includes(GUEST_COOKIE)], [true, true]);
}

/* ── 6. what a guest sees from the APIs ───────────────────────────────────────────────────────────────────────────────── */
{
  const r = await call(me, { headers: asGuest.cookie ? asGuest : {} });
  t('me: a guest is signed in, a guest, not admin, no teams', [r.body.signedIn, r.body.guest, r.body.admin, r.body.owner, r.body.groups], [true, true, false, false, []]);
  const lapsedC = cookies([GUEST_COOKIE, await sign({ typ: 'guest', email: 'lapsed@partner.test', exp: Math.floor(Date.now() / 1000) + 3600 }, guestSecret())]);
  t('me: a guest whose invite has lapsed reads as signed out, not as a guest', (await call(me, { headers: lapsedC })).body.signedIn, false);
  const s = await call(me, { headers: asStaff });
  t('me: staff unchanged', [s.body.signedIn, s.body.guest, s.body.groups], [true, undefined, ['gtm']]);
  const tl = await call(tools, { headers: asGuest });
  t('tools: a guest learns which they can open, and no access labels', [tl.status, tl.body.tools['/internal/certificate-creator'].canOpen, tl.body.tools['/internal/email-signature'].canOpen, tl.body.tools['/internal/certificate-creator'].label], [200, true, false, 'Guest access']);
  const rd = await call(accessApi, { headers: asGuest });
  t('the rules API stays closed to a guest', rd.status, 401);
  const pd = await call((await import('../web/api/_publish.js')).default, { query: { op: 'me' }, headers: asGuest });
  t('the publish API stays closed to a guest', pd.status, 401);
  const bc = await call((await import('../web/api/_bruce-chat.js')).default, { method: 'POST', headers: asGuest, body: {} });
  t('and the Bruce chat', bc.status === 401 || bc.status === 403, true);
}

/* ── 7. Certificate Creator: a guest sees only their own ──────────────────────────────────────────────────────────────── */
{
  const mk = (id, savedBy, access) => JSON.stringify({ id, title: id, savedBy, updatedBy: savedBy, updatedAt: '2026-10-01T00:00:00Z', access, pages: [{}], data: {} });
  const H = hashes.get('gw:certs') || hashes.set('gw:certs', new Map()).get('gw:certs');
  H.set('a'.repeat(18), mk('a'.repeat(18), 'sam@gushwork.ai', { general: 'tool', role: 'edit', people: [] }));
  H.set('b'.repeat(18), mk('b'.repeat(18), 'guest@partner.test', { general: 'restricted', role: 'edit', people: [] }));
  H.set('c'.repeat(18), mk('c'.repeat(18), 'sam@gushwork.ai', { general: 'restricted', role: 'edit', people: [{ email: 'boss@gushwork.ai', role: 'view' }] }));
  const g1 = await call(certs, { headers: asGuest });
  t('certificates: a guest lists only what they made', [g1.status, (g1.body.items || []).map((i) => i.id)], [200, ['b'.repeat(18)]]);
  t('and sees no one else\'s names or addresses', Object.keys(g1.body.names || {}), []);
  const s1 = await call(certs, { headers: asStaff });
  t('certificates: staff see the company\'s own, and not a guest\'s restricted file', (s1.body.items || []).map((i) => i.id).sort(), ['a'.repeat(18), 'c'.repeat(18)]);
  const edit = await call(certs, { method: 'POST', headers: asGuest, body: { id: 'a'.repeat(18), title: 'mine now' } });
  t('a guest cannot edit a company certificate', edit.status, 404);
  const del = await call(certs, { method: 'DELETE', query: { id: 'a'.repeat(18) }, headers: asGuest });
  t('nor delete one', del.status >= 400, true);
  const mine = await call(certs, { method: 'POST', headers: asGuest, body: { id: 'b'.repeat(18), title: 'my certificate' } });
  t('a guest can edit their own', mine.status, 200);
  const stranger = cookies([GUEST_COOKIE, await sign({ typ: 'guest', email: 'ally@partner.test', exp }, guestSecret())]);
  const ally = await call(certs, { headers: stranger });
  t('certificates: a guest on the tool through a team still sees only their own (none)', (ally.body.items || []).length, 0);
  t('a name is not stored for a guest', [...(hashes.get('gw:cert-names') || new Map()).keys()].includes('guest@partner.test'), false);
  /* a guest's new file is private to them, cannot be shared out to staff by the body, and they may keep only a few */
  const made = await call(certs, { method: 'POST', headers: asGuest, body: { title: 'fresh', data: { name: 'x' }, access: { general: 'tool', role: 'edit', people: [{ email: 'sam@gushwork.ai', role: 'edit' }] } } });
  t('a guest\'s new certificate is restricted, whatever the body asks', [made.status, made.body.item && made.body.item.access], [200, { general: 'restricted', role: 'edit', people: [] }]);
  const staffSees = await call(certs, { headers: asStaff });
  t('and staff do not see it', (staffSees.body.items || []).some((i) => i.title === 'fresh'), false);
  let last = 200;
  for (let i = 0; i < 25 && last === 200; i++) last = (await call(certs, { method: 'POST', headers: asGuest, body: { title: 'n' + i, data: { name: 'x' } } })).status;
  t('a guest cannot fill the shared list', last, 507);
  const noTool = cookies([GUEST_COOKIE, await sign({ typ: 'guest', email: 'lapsed@partner.test', exp }, guestSecret())]);
  t('a guest who is not named on the tool is refused', (await call(certs, { headers: noTool })).status, 403);
}

/* ── 8. Drop Studio: a guest can look and nothing else ────────────────────────────────────────────────────────────────── */
{
  const look = await call(drop, { headers: asGuest, query: { op: 'state' } });
  t('drop studio: a guest may look', look.status, 200);
  for (const op of ['create', 'answer', 'decide', 'subscribe', 'unsubscribe', 'pushkey']) {
    const w = await call(drop, { method: 'POST', headers: asGuest, query: { op }, body: {} });
    t(`drop studio: a guest cannot ${op}`, w.status, 403);
  }
}

/* ── 9. saving rules ──────────────────────────────────────────────────────────────────────────────────────────────────── */
const rules2 = () => { rulesJson = { access: rulesRaw() }; A.invalidate(); };
const getRules = async (cookieHeader) => (await call(accessApi, { headers: cookieHeader })).body;
const save = async (cookieHeader, mutate) => {
  const cur = (await getRules(cookieHeader)).rules; mutate(cur);
  return call(accessApi, { method: 'POST', headers: cookieHeader, body: { rules: cur } });
};
const owner = cookies([COOKIE, ownerCookie]), boss = cookies([COOKIE, bossCookie]);
{
  rules2();
  t('capabilities say guests are on', (await getRules(owner)).capabilities, { guests: true });
  let r = await save(boss, (x) => { x.guests['new@partner.test'] = { expires: tomorrow, by: 'boss@gushwork.ai' }; });
  t('an admin cannot invite a guest', r.status, 403);
  r = await save(boss, (x) => { x.routes.find((y) => y.path === '/internal/staging/social-creative').people.push('sneaky@partner.test'); });
  t('nor slip one in by naming an outside address on a page', r.status, 403);
  rules2();
  r = await save(boss, (x) => { delete x.guests['guest@partner.test']; });
  t('nor remove one', r.status, 403);
  rules2();
  r = await save(boss, (x) => { x.routes.push({ path: '/internal/staging/other', access: 'people', groups: [], people: ['ally@partner.test'] }); });
  t('nor widen an existing guest onto a page they were not on', r.status, 403);
  rules2();
  r = await save(boss, (x) => { x.guests['guest@partner.test'].by = 'someone@gushwork.ai'; });
  t('nor rewrite who invited a guest', r.status, 403);
  rules2();
  r = await call(accessApi, { method: 'POST', headers: owner, body: { rules: (() => { const c = A.normalise(rulesJson.access); delete c.guests; return c; })() } });
  t('a page that does not send guests does not wipe them', [r.status, Object.keys((vercelWrites.at(-1) || {}).guests || {}).length > 0], [200, true]);
  rules2();
  r = await save(boss, (x) => { x.routes.push({ path: '/internal/staging/other', access: 'people', groups: [], people: ['sam@gushwork.ai'] }); });
  t('an admin can still edit ordinary rules, and the guests ride along', [r.status, Object.keys((vercelWrites.at(-1) || {}).guests || {}).sort()], [200, ['ally@partner.test', 'guest@partner.test', 'lapsed@partner.test']]);
  rules2();
  r = await save(owner, (x) => { x.routes.find((y) => y.path === '/internal/staging/social-creative').people.push('newbie@partner.test'); });
  t('an owner who names an outside address invites them, for 30 days', [r.status, !!vercelWrites.at(-1).guests['newbie@partner.test']], [200, true]);
  const days = Math.round((Date.parse(vercelWrites.at(-1).guests['newbie@partner.test'].expires) - Date.now()) / 864e5);
  t('thirty of them', days >= 29 && days <= 31, true);
  rules2();
  r = await save(owner, (x) => { x.guests['guest@partner.test'].expires = new Date(Date.now() + 40 * 864e5).toISOString().slice(0, 10); });
  t('an owner can renew', [r.status, vercelWrites.at(-1).guests['guest@partner.test'].expires > tomorrow], [200, true]);
  rules2();
  r = await save(owner, (x) => { x.admins.push('person@partner.test'); });
  t('an outside address cannot be made an admin, even by an owner', r.status, 400);
  rules2();
  r = await save(owner, (x) => { x.lanes.gtm.people.push('person@partner.test'); });
  t('nor a lane publisher', r.status, 400);
  rules2();
  r = await save(owner, (x) => { delete x.guests['guest@partner.test']; x.routes.forEach((y) => { y.people = (y.people || []).filter((e) => e !== 'guest@partner.test'); }); });
  t('an owner can remove a guest, and they are shut out at once', [r.status, A.guestActive('guest@partner.test', A.normalise(rulesJson.access))], [200, false]);
}

/* ── 10. the directory ────────────────────────────────────────────────────────────────────────────────────────────────── */
const mem = (id, email, over = {}, prof = {}) => ({ id, deleted: false, is_bot: false, profile: { email, real_name: email.split('@')[0], image_48: 'https://avatars.slack-edge.com/x.png', ...prof }, ...over });
{
  slackMembers = [
    mem('U1', 'zed@gushwork.ai', {}, { real_name: 'Zed Zane', title: 'Sales' }), mem('U2', 'amy@gushwork.ai', {}, { real_name: 'Amy Ames' }),
    mem('U3', 'gone@gushwork.ai', { deleted: true }), mem('U4', 'bot@gushwork.ai', { is_bot: true }), mem('USLACKBOT', 'slackbot@gushwork.ai'),
    mem('U5', 'ext@partner.test'), mem('U6', 'guestuser@gushwork.ai', { is_restricted: true }), mem('U7', 'noemail@x', {}, { email: '' }),
    mem('U8', 'img@gushwork.ai', {}, { image_48: 'javascript:alert(1)' }),
  ];
  const got = await fetchSlackPeople('xoxb', 'gushwork.ai');
  t('the directory keeps real, active company people, sorted by name', got.people.map((p) => p.email), ['amy@gushwork.ai', 'img@gushwork.ai', 'zed@gushwork.ai']);
  t('a photo must be an https address', got.people.find((p) => p.email === 'img@gushwork.ai').avatar, '');
  t('and a title comes through', got.people.find((p) => p.email === 'zed@gushwork.ai').title, 'Sales');
  slackError = 'missing_scope';
  t('a missing scope is reported, not hidden', (await fetchSlackPeople('xoxb', 'gushwork.ai')).error, 'missing_scope');
  slackError = '';

  rules2(); kvData.clear(); slackCalls = 0;
  let r = await call(accessApi, { headers: owner, query: { directory: '1' } });
  t('the endpoint serves the directory with its source', [r.status, r.body.people.length, r.body.source.slack], [200, 3, 'ok']);
  r = await call(accessApi, { headers: owner, query: { directory: '1' } });
  t('and the second call is cached, with no new Slack call', [r.body.cached, slackCalls], [true, 1]);
  r = await call(accessApi, { headers: asStaff, query: { directory: '1' } });
  t('only admins may read it', r.status, 403);
  r = await call(accessApi, { headers: asGuest, query: { directory: '1' } });
  t('a guest cannot', r.status, 401);

  kvData.clear(); slackError = 'missing_scope';
  kvData.set('__list:gw:visits', [JSON.stringify({ email: 'zed@gushwork.ai' }), JSON.stringify({ email: 'zed@gushwork.ai' }), JSON.stringify({ email: 'x@partner.test' }), JSON.stringify({ email: 'amy@gushwork.ai' })]);
  r = await call(accessApi, { headers: owner, query: { directory: '1' } });
  t('without the scope it falls back to people who have signed in, and says why', [r.body.source.slack, r.body.people.map((p) => p.email).sort()], ['missing_scope', ['amy@gushwork.ai', 'zed@gushwork.ai']]);
  slackError = '';
}

/* ── 11. the restricted screens ───────────────────────────────────────────────────────────────────────────────────────── */
{
  const h = restrictedPage({ email: 'guest@partner.test', path: '/internal/x', canRequest: false, guest: true });
  t('the guest screen says so and offers no request', [h.includes('Not open to your guest account'), h.includes('>Request access<')], [true, false]);
}

globalThis.fetch = realFetch;
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
