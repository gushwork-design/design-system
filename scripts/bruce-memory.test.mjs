// Bruce's per-person memory token and notes (web/api/_bruce-memory.js). Run: node scripts/bruce-memory.test.mjs
process.env.SESSION_SECRET = 'test-secret'; process.env.KV_REST_API_URL = 'https://kv.test'; process.env.KV_REST_API_TOKEN = 'k';
const M = await import('../web/api/_bruce-memory.js');
let pass = 0, fail = 0; const ok = (n, c, d = '') => (c ? pass++ : (fail++, console.log(`✘ ${n} ${d}`)));
const t0 = 1_800_000_000_000;
const tok = M.mintToken('U1', t0, 'sec');
ok('a token reads back to its user', M.readToken(tok, t0 + 1000, 'sec') === 'U1');
ok('an expired token is refused', M.readToken(tok, t0 + 7 * 3600e3, 'sec') === null);
ok('a token for one user cannot be bent to another', M.readToken(tok.replace('U1.', 'U2.'), t0, 'sec') === null);
ok('a token signed elsewhere is refused', M.readToken(M.mintToken('U1', t0, 'other'), t0, 'sec') === null);
let store = {}; const cmds = [];
const f = async (url, init) => { const c = JSON.parse(init.body); cmds.push(...c); return { ok: true, json: async () => c.map(([op, key, ...a]) => {
  if (op === 'HGET') return { result: (store[key] || {})[a[0]] || null };
  if (op === 'HINCRBY') { store[key] = store[key] || {}; store[key][a[0]] = (store[key][a[0]] || 0) + 1; return { result: store[key][a[0]] }; }
  if (op === 'LPUSH') { store[key] = [a[0], ...(store[key] || [])]; return { result: store[key].length }; }
  if (op === 'LRANGE') return { result: store[key] || [] };
  if (op === 'HSET') { store[key] = store[key] || {}; store[key][a[0]] = a[1]; return { result: 1 }; }
  if (op === 'LTRIM') { store[key] = (store[key] || []).slice(+a[0], +a[1] + 1); return { result: 'OK' }; }
  return { result: 'OK' }; }) }; };
process.env.BRUCE_DAILY_CAP = '2';
const now = new Date('2026-10-05T10:00:00Z');
let r = await M.takeRun('U1', { f, now }); ok('first run allowed', r.allowed && r.used === 1);
r = await M.takeRun('U1', { f, now }); ok('second run allowed', r.allowed && r.used === 2);
r = await M.takeRun('U1', { f, now }); ok('third run refused at a cap of 2', !r.allowed && r.cap === 2);
r = await M.takeRun('U1', { f, now: new Date('2026-10-06T10:00:00Z') }); ok('a new day starts fresh', r.allowed);
r = await M.takeRun('UOWNER', { f, now, uncapped: true }); ok('uncapped still counts, never refuses', r.allowed && store['gw:bruce:runs:2026-10-05'].UOWNER === 1);
await M.addNotes('U1', ['  likes   the dark   theme ', '', 'x'.repeat(400)], f);
const notes = await M.readNotes('U1', f);
ok('notes are dated, squashed and capped in length', notes.length === 2 && /^\d{4}-\d{2}-\d{2}: likes the dark theme$/.test(notes[1]) && notes[0].length <= 252, JSON.stringify(notes));
// the run log and the name cache
const f2 = async (url, init) => {
  const u = String(url);
  if (u.startsWith('https://slack.com/api/users.info')) return { ok: true, json: async () => ({ ok: true, user: { profile: { display_name: 'Priya' } } }) };
  return f(url, init);
};
ok('a name is looked up once and then kept', await M.slackName('xoxb', 'U9', f2) === 'Priya' && store['gw:slack:names'].U9 === 'Priya' && await M.slackName('', 'U9', f2) === 'Priya');
ok('no token and no cache falls back to the id', await M.slackName('', 'U8', f) === 'U8');
await M.logRun({ user: 'U9', name: 'Priya', role: 'teammate', kind: 'run', thread: true, text: '  make me   a one-pager\nfor sales ' }, f);
await M.logRun({ user: 'U9', name: 'Priya', role: 'teammate', kind: 'capped', text: 'again', used: 3 }, f);
const log = await M.readLog(f);
ok('runs are logged newest first, text squashed, thread flagged', log.length === 2 && log[0].kind === 'capped' && log[0].used === 3 && log[1].text === 'make me a one-pager for sales' && log[1].thread === 1 && /^\d{4}-/.test(log[1].at), JSON.stringify(log));

// the Conversation view: a thread of the DM read from Slack, owner only, nothing kept (R67)
await M.logRun({ user: 'U0PRIYA01', name: 'Priya', kind: 'run', text: 'hi', ch: 'D0ABC1234', ts: '1800000000.000100' }, f);
await M.logRun({ user: 'U0PRIYA01', name: 'Priya', kind: 'run', text: 'bad ids', ch: 'nope', ts: 'also nope' }, f);
const rows = await M.readLog(f);
ok('a log row keeps the DM channel and thread when they are real', rows[1].ch === 'D0ABC1234' && rows[1].ts === '1800000000.000100');
ok('and drops them when they are not', rows[0].ch === undefined && rows[0].ts === undefined);
ok('plain() makes Slack text readable', M.plain('see <https://x.test|the page> &amp; <@U1|sam> in <#C1234567|general> <https://y.test>') === 'see the page (https://x.test) & @sam in #general https://y.test');
const calls = []; let mode = 'ok';
const slackF = async (url, init) => {
  const u = String(url); const body = Object.fromEntries(new URLSearchParams(init.body || ''));
  if (!u.startsWith('https://slack.com/api/')) return f(url, init);
  const method = u.split('/api/')[1].split('?')[0]; calls.push(method);
  const J = (o) => ({ ok: true, json: async () => o });
  if (method === 'users.info') return J({ ok: true, user: { profile: { display_name: 'Priya' } } });
  if (method === 'conversations.open') return mode === 'scope' ? J({ ok: false, error: 'missing_scope', needed: 'im:write' }) : J({ ok: true, channel: { id: 'D0ABC1234' } });
  if (method === 'conversations.history') return J({ ok: true, messages: mode === 'quiet' ? [{ user: 'UOTHER', ts: '1800000000.000100', text: 'x' }]
    : [{ user: 'U0PRIYA01', ts: '1800000300.000100', text: 'later' }, { user: 'U0PRIYA01', ts: '1800000001.000100', text: 'near' }] });
  if (method === 'conversations.replies') return J({ ok: true, messages: [
    { user: 'U0PRIYA01', ts: body.ts, text: 'make me a one-pager &amp; send <@U1|sam>' },
    { bot_id: 'B1', ts: '1800000020.000200', text: 'Here it is: <https://x.test|one-pager>', files: [{ name: 'one-pager.pdf' }] },
    { subtype: 'channel_join', user: 'U0PRIYA01', ts: '1800000030.000300', text: '' }] });
  return J({ ok: false, error: 'unknown' });
};
let c = await M.readConversation({ token: 'xoxb', user: 'U0PRIYA01', ch: 'D0ABC1234', ts: '1800000000.000100' }, slackF);
ok('with the channel and thread it reads only the thread', c.ok && !calls.includes('conversations.open') && !calls.includes('conversations.history') && calls.includes('conversations.replies'), JSON.stringify(calls));
ok('the person and Bruce are told apart and named', c.messages[0].from === 'person' && c.messages[0].name === 'Priya' && c.messages[1].from === 'bruce' && c.messages[1].name === 'Bruce');
ok('text is readable and files are named', c.messages[0].text === 'make me a one-pager & send @sam' && c.messages[1].text === 'Here it is: one-pager (https://x.test)' && c.messages[1].files[0] === 'one-pager.pdf');
ok('an empty system message is left out', c.messages.length === 2);
calls.length = 0;
c = await M.readConversation({ token: 'xoxb', user: 'U0PRIYA01', at: 1800000002000 }, slackF);
ok('without them it opens the DM and finds the thread nearest the time', c.ok && c.ts === '1800000001.000100' && calls[0] === 'conversations.open' && calls[1] === 'conversations.history', JSON.stringify([c.ts, calls]));
mode = 'scope';
c = await M.readConversation({ token: 'xoxb', user: 'U0PRIYA01', at: 1800000002000 }, slackF);
ok('a missing Slack permission is named, not hidden', !c.ok && c.reason === 'scope' && c.needed === 'im:write');
mode = 'quiet';
c = await M.readConversation({ token: 'xoxb', user: 'U0PRIYA01', at: 1800000002000 }, slackF);
ok('nothing near that time is not found', !c.ok && c.reason === 'notfound');
ok('a bad person is refused before Slack is asked', (await M.readConversation({ token: 'xoxb', user: 'x"; drop', at: 1 }, slackF)).reason === 'input');
ok('no token says the app is not connected', (await M.readConversation({ token: '', user: 'U0PRIYA01', at: 1 }, slackF)).reason === 'slack');
// the endpoint gate
const gate = async (cookie) => { let status = 0; await M.default({ method: 'GET', query: { conversation: '1', user: 'U0PRIYA01' }, headers: { cookie } }, { status(s) { status = s; return this; }, json() {}, setHeader() {}, end() {} }); return status; };
ok('signed out is 401', await gate('') === 401);
const { sign, COOKIE } = await import('../web/api/_session.js');
const ck = async (email) => `${COOKIE}=${encodeURIComponent(await sign({ email, exp: Math.floor(Date.now() / 1000) + 600 }, 'test-secret'))}`;
ok('a teammate is 403', await gate(await ck('sam@gushwork.ai')) === 403);
// what Bruce reports sending (R55 addendum, 8 Oct 2026)
store['gw:bruce:log'] = [];
process.env.OWNER_SLACK_ID = 'U0OWNER01'; process.env.SLACK_BOT_TOKEN = 'xoxb';
ok('a report looks at the first five items and keeps the real recipients', await M.logSent('U0OWNER01', [
  { to: 'U0PRIYA01', text: 'the staging link\nfor the AI team' }, { to: 'nope', text: 'bad id' }, { to: 'D0ABC1234', text: 'a DM id' },
  { to: 'U0PRIYA01', text: '3' }, { to: 'U0PRIYA01', text: '4' }, { to: 'U0PRIYA01', text: '5' }, { to: 'U0PRIYA01', text: '6 is past five' }], { f: slackF }) === 4);
let sent = (await M.readLog(f)).filter((x) => x.kind === 'sent');
ok('each is a sent row for the person the run was for, to whoever got it', sent.length === 4 && sent.every((x) => x.user === 'U0OWNER01' && x.role === 'owner' && /^[UD]/.test(x.to)), JSON.stringify(sent[0]));
const link = sent.find((x) => x.text.startsWith('the staging link'));
ok('the recipient is named, the text squashed, and no thread is attached', link.toName === 'Priya' && link.text === 'the staging link for the AI team' && link.ch === undefined && link.ts === undefined, JSON.stringify(link));
ok('nothing is sent for a report that is not a list', await M.logSent('U0OWNER01', 'x', { f: slackF }) === 0);
// the endpoint: POST reports, GET ?sent=1 reads back, owner token only
const call = async (method, tokenUser, extra) => { let status = 0, out = null; await M.default({ method, query: extra.query || {}, body: extra.body, headers: { authorization: `Bearer ${M.mintToken(tokenUser)}` } },
  { status(s) { status = s; return this; }, json(o) { out = o; return this; }, setHeader() {}, end() {} }); return { status, out }; };
const realFetch = globalThis.fetch; globalThis.fetch = slackF;
store['gw:bruce:log'] = [];
let h = await call('POST', 'U0OWNER01', { body: { notes: [], sent: [{ to: 'U0PRIYA01', text: 'the logo files' }] } });
ok('POST reports sends alongside notes', h.status === 200 && h.out.sent === 1 && h.out.added === 0, JSON.stringify(h));
h = await call('GET', 'U0OWNER01', { query: { sent: '1' } });
ok('the owner reads them back', h.status === 200 && h.out.sent.length === 1 && h.out.sent[0].text === 'the logo files' && h.out.sent[0].toName === 'Priya', JSON.stringify(h));
h = await call('GET', 'U0PRIYA01', { query: { sent: '1' } });
ok('a teammate token cannot read what Bruce sent', h.status === 403 && !h.out.sent, JSON.stringify(h));
h = await call('GET', 'U0PRIYA01', { query: {} });
ok('and plain GET still returns only their notes', h.status === 200 && Array.isArray(h.out.notes) && !h.out.sent);
globalThis.fetch = realFetch;
console.log(`${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
