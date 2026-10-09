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
  if (op === 'LREM') { const l = store[key] || []; const i = l.indexOf(a[1]); if (i >= 0) l.splice(i, 1); store[key] = l; return { result: i >= 0 ? 1 : 0 }; }
  if (op === 'HMGET') return { result: a.map((k) => (store[key] || {})[k] || null) };
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
// the run report (9 Oct 2026): what his session did says whether an ask was a run
ok('skill names are cleaned: real names only, cut to 60 characters, no duplicates, at most eight', JSON.stringify(M.cleanSkills(['gushwork-web', 'gushwork-web', 'gushwork-design:gushwork-brand', '<script>', '', 'x'.repeat(80), ...Array.from({ length: 12 }, (_, i) => 's' + i)])) === JSON.stringify(['gushwork-web', 'gushwork-design:gushwork-brand', 'x'.repeat(60), 's0', 's1', 's2', 's3', 's4']) && M.cleanSkills('x').length === 0);
store['gw:bruce:log'] = [];
h = await call('POST', 'U0OWNER01', { body: { run: { skills: ['gushwork-web'], tokens: 120000 } } });
ok('POST accepts a run report', h.status === 200 && h.out.run === true, JSON.stringify(h));
const logged = JSON.parse(store['gw:bruce:log'][0]);
ok('and keeps it as a report row with the skills and tokens', logged.kind === 'report' && logged.skills[0] === 'gushwork-web' && logged.tokens === 120000 && logged.user === 'U0OWNER01', JSON.stringify(logged));
h = await call('POST', 'U0OWNER01', { body: { run: 'nonsense' } });
ok('a report that is not an object is refused quietly', h.status === 200 && h.out.run === false);
const at = (min) => new Date(Date.UTC(2026, 9, 9, 10, min)).toISOString();
const R = (kind, user, min, extra = {}) => ({ at: at(min), user, name: user, role: 'teammate', kind, text: kind === 'report' ? '' : 'an ask', thread: 0, used: 0, ...extra });
let rr2 = M.attachReports([R('report', 'UA', 5, { skills: [] }), R('run', 'UA', 1), R('report', 'UB', 9, { skills: ['gushwork-web'] }), R('chat', 'UB', 2), R('chat', 'UC', 3), R('run', 'UD', 4), R('report', 'UD', 6, { tokens: 90000, skills: [] })]);
const byUser = (u) => rr2.find((r) => r.user === u);
ok('reports are not rows', rr2.length === 4 && !rr2.some((r) => r.kind === 'report'));
ok('a report with no skills makes a run into a chat', byUser('UA').kind === 'chat' && byUser('UA').reported === true);
ok('a report with a skill makes a chat into a run, and carries the skills', byUser('UB').kind === 'run' && byUser('UB').skills[0] === 'gushwork-web');
ok('heavy tokens alone make a run', byUser('UD').kind === 'run' && byUser('UD').tokens === 90000);
ok('an ask with no report is untouched, for the words to decide', byUser('UC').kind === 'chat' && !byUser('UC').reported);
rr2 = M.attachReports([R('report', 'UA', 5, { skills: [] }), R('run', 'UA', 1), R('run', 'UA', 3)]);
ok('a report answers the latest ask before it, and only one', rr2.filter((r) => r.reported).length === 1 && rr2.find((r) => r.reported).at === at(3));
rr2 = M.attachReports([R('report', 'UA', 1, { skills: ['x'] }), R('run', 'UA', 30)]);
ok('a report cannot answer an ask that came after it', rr2.length === 1 && !rr2[0].reported);
rr2 = M.attachReports([R('capped', 'UA', 1), R('report', 'UA', 5, { skills: ['x'] })]);
ok('a capped or failed ask keeps its kind', rr2[0].kind === 'capped');
// a send from the "Bruce send" workflow reports itself with an HMAC over the bot token (no per-run token is involved)
{
  const crypto = await import('node:crypto');
  process.env.SLACK_BOT_TOKEN = 'xoxb-test-key'; process.env.OWNER_SLACK_ID = 'U0OWNER01';
  const sigFor = (ts, to, text) => crypto.createHmac('sha256', 'xoxb-test-key').update(`${ts}.${to}.${text}`).digest('hex');
  const hit = async (headers, body) => { let status = 0, out = null; await M.default({ method: 'POST', query: {}, body, headers }, { status(s2) { status = s2; return this; }, json(o) { out = o; return this; }, setHeader() {}, end() {} }); return { status, out }; };
  store['gw:bruce:log'] = [];
  const nowS = Math.floor(Date.now() / 1000);
  let g = await hit({ 'x-bruce-send-ts': String(nowS), 'x-bruce-send-sig': sigFor(nowS, 'U0PRIYA01', 'the plugin update') }, { sent: [{ to: 'U0PRIYA01', text: 'the plugin update' }] });
  ok('a signed workflow send is recorded for the owner', g.status === 200 && g.out.sent === 1 && JSON.parse(store['gw:bruce:log'][0]).user === 'U0OWNER01' && JSON.parse(store['gw:bruce:log'][0]).kind === 'sent', JSON.stringify(g));
  g = await hit({ 'x-bruce-send-ts': String(nowS), 'x-bruce-send-sig': 'a'.repeat(64) }, { sent: [{ to: 'U0PRIYA01', text: 'x' }] });
  ok('a wrong signature is refused', g.status === 401);
  g = await hit({ 'x-bruce-send-ts': String(nowS), 'x-bruce-send-sig': sigFor(nowS, 'U0PRIYA01', 'one thing') }, { sent: [{ to: 'U0PRIYA01', text: 'another thing' }] });
  ok('a signature for other text is refused', g.status === 401);
  const old = nowS - 3600;
  g = await hit({ 'x-bruce-send-ts': String(old), 'x-bruce-send-sig': sigFor(old, 'U0PRIYA01', 'late') }, { sent: [{ to: 'U0PRIYA01', text: 'late' }] });
  ok('a stale signature is refused', g.status === 401);
  g = await hit({ 'x-bruce-send-ts': String(nowS), 'x-bruce-send-sig': sigFor(nowS, 'U0PRIYA01', 'a') }, { sent: [{ to: 'U0PRIYA01', text: 'a' }, { to: 'U0PRIYA01', text: 'b' }] });
  ok('only one send at a time is accepted this way', g.status === 401);
}
globalThis.fetch = realFetch;
// conversations: what an ask is about, and the whole DM (R55 addendum, 8 Oct 2026)
const T = (text, want) => ok(`topic: "${text}" is ${want}`, M.topicOf(text) === want, M.topicOf(text));
T('Send me the brand colours and fonts', 'brand'); T('send me the logo, white, svg', 'brand');
T('tell utsav i said hi', 'pass-on'); T('do you have a proof of sending him hi?', 'pass-on'); T('Please let Utsav know the deck is blocked', 'pass-on');
T('status of this?', 'status'); T('and?', 'status'); T('is it live yet', 'status');
T('One-pager for sales, audience ops leads', 'build'); T('make me a landing page', 'build');
T('which template should I use for a webinar', 'template'); T('rework agent-card', 'hub'); T('can I get access to the staging page', 'access');
T('what can you do', 'about'); T('purple elephants', 'other'); T('', 'other');
ok('topic rules are only the names the page knows', ['pass-on', 'status', 'access', 'brand', 'build', 'template', 'hub', 'about', 'other'].join() === M.TOPICS.join());
store['gw:bruce:log'] = [];
await M.logRun({ user: 'U9', name: 'Priya', kind: 'run', text: 'send me the logo' }, f);
await M.logRun({ user: 'U9', name: 'Priya', kind: 'capped', text: 'purple elephants' }, f);
await M.logRun({ user: 'U9', name: 'Priya', kind: 'sent', to: 'U0PRIYA01', toName: 'Priya', text: 'the logo files' }, f);
let tl = await M.readLog(f);
ok('an ask is stored with its topic', tl.find((x) => x.text === 'send me the logo').topic === 'brand' && tl.find((x) => x.text === 'purple elephants').topic === 'other');
ok('a sent row has no topic (it is not an ask)', tl.find((x) => x.kind === 'sent').topic === undefined);

const dmCalls = []; let dmMode = 'ok';
const dmF = async (url, init) => {
  const u = String(url); const body = Object.fromEntries(new URLSearchParams(init.body || ''));
  if (!u.startsWith('https://slack.com/api/')) return f(url, init);
  const method = u.split('/api/')[1].split('?')[0]; dmCalls.push(method + (body.cursor ? ':' + body.cursor : ''));
  const J = (o) => ({ ok: true, json: async () => o });
  if (method === 'users.info') return J({ ok: true, user: { profile: { display_name: 'Priya' } } });
  if (method === 'conversations.open') return dmMode === 'scope' ? J({ ok: false, error: 'missing_scope', needed: 'im:write' }) : J({ ok: true, channel: { id: 'D0ABC1234' } });
  if (method === 'conversations.history') {
    if (dmMode === 'scope-history') return J({ ok: false, error: 'missing_scope', needed: 'im:history' });
    if (!body.cursor) return J({ ok: true, has_more: true, response_metadata: { next_cursor: 'c2' }, messages: [
      { user: 'U0PRIYA01', ts: '1800000300.000100', text: 'second ask &amp; more' },
      { user: 'UBRUCE', ts: '1800000010.000100', text: 'Here is the logo, and <https://design.gushwork.ai/internal/staging/ai-team?a=1&amp;b=2|the staging page>', reply_count: 1, thread_ts: '1800000010.000100', files: [{ name: 'logo.svg', filetype: 'svg', size: 2048, permalink: 'https://gushwork.slack.com/files/U1/F1/logo.svg' }, { name: 'bad.txt', permalink: 'javascript:alert(1)' }] }] });
    return J({ ok: true, has_more: false, messages: [{ user: 'U0PRIYA01', ts: '1800000000.000100', text: 'send me the logo', reply_count: 2, thread_ts: '1800000000.000100' }, { subtype: 'channel_join', user: 'U0PRIYA01', ts: '1799999000.000100', text: '' }] });
  }
  if (method === 'conversations.replies') return J({ ok: true, messages: body.ts === '1800000000.000100'
    ? [{ user: 'U0PRIYA01', ts: '1800000000.000100', text: 'send me the logo', thread_ts: '1800000000.000100' }, { user: 'UBRUCE', ts: '1800000005.000100', thread_ts: '1800000000.000100', text: 'On it' }]
    : [{ user: 'UBRUCE', ts: '1800000010.000100', thread_ts: '1800000010.000100', text: 'Here is the logo, and <https://design.gushwork.ai/internal/staging/ai-team?a=1&amp;b=2|the staging page>' }, { user: 'U0PRIYA01', ts: '1800000011.000100', thread_ts: '1800000010.000100', text: 'thanks' }] });
  return J({ ok: false, error: 'unknown' });
};
let d = await M.readDM({ token: 'xoxb', user: 'U0PRIYA01' }, dmF);
ok('the whole DM reads, oldest first, across pages', d.ok && d.messages.length === 5 && d.messages.map((m) => m.at).every((x, i, a) => !i || a[i - 1] <= x), JSON.stringify(d.messages && d.messages.map((m) => m.text)));
ok('it paged: opened the DM, two history pages, and the threads', dmCalls[0] === 'conversations.open' && dmCalls.includes('conversations.history:c2') && dmCalls.filter((c) => c === 'conversations.replies').length === 2, JSON.stringify(dmCalls));
ok('person and Bruce are told apart, text is plain, files are named', d.messages[0].from === 'person' && d.messages[0].name === 'Priya' && d.messages.some((m) => m.from === 'bruce' && m.files[0] && m.files[0].name === 'logo.svg') && d.messages.some((m) => m.text === 'second ask & more'));
const withFiles = (await M.readDM({ token: 'xoxb', user: 'U0PRIYA01' }, dmF)).messages.find((m) => m.files.length);
ok('files are kept as data: name, type, size and the Slack permalink', withFiles && withFiles.files[0].name === 'logo.svg' && withFiles.files[0].type === 'svg' && withFiles.files[0].size === 2048 && withFiles.files[0].url === 'https://gushwork.slack.com/files/U1/F1/logo.svg', JSON.stringify(withFiles));
ok('a file with an unsafe permalink keeps its name but no link', withFiles.files[1].name === 'bad.txt' && withFiles.files[1].url === '');
const withLinks = (await M.readDM({ token: 'xoxb', user: 'U0PRIYA01' }, dmF)).messages.find((m) => m.links.length);
ok('links are kept as data, entities undone, label from the markup', withLinks && withLinks.links[0].url === 'https://design.gushwork.ai/internal/staging/ai-team?a=1&b=2' && withLinks.links[0].label === 'the staging page', JSON.stringify(withLinks && withLinks.links));
ok('linksOf takes bare links, de-duplicates and ignores other schemes', M.linksOf('<https://a.test> <https://a.test|again> <mailto:x@y.test> <#C1234567|general>').length === 1);
ok('replies know they are replies, and the empty join message is gone', d.messages.some((m) => m.reply && m.text === 'On it') && !d.messages.some((m) => !m.text && !m.files.length));
ok('it says when nothing was cut off', d.truncated === false);
dmMode = 'scope'; d = await M.readDM({ token: 'xoxb', user: 'U0PRIYA01' }, dmF);
ok('a missing permission to open the DM is named', !d.ok && d.reason === 'scope' && d.needed === 'im:write');
dmMode = 'scope-history'; d = await M.readDM({ token: 'xoxb', user: 'U0PRIYA01', ch: 'D0ABC1234' }, dmF);
ok('a missing permission to read it is named, and a known channel skips conversations.open', !d.ok && d.needed === 'im:history' && dmCalls[dmCalls.length - 1] === 'conversations.history');
ok('a bad person is refused before Slack is asked', (await M.readDM({ token: 'xoxb', user: 'x"; drop' }, dmF)).reason === 'input');
const gateDm = async (cookie) => { let status = 0; await M.default({ method: 'GET', query: { dm: '1', user: 'U0PRIYA01' }, headers: { cookie } }, { status(s) { status = s; return this; }, json() {}, setHeader() {}, end() {} }); return status; };
ok('the dm endpoint: signed out is 401, a teammate 403', await gateDm('') === 401 && await gateDm(await ck('sam@gushwork.ai')) === 403);
// run or chat (8 Oct 2026): a pass-on is a conversation, a build is work
const W = (text, want) => ok(`weight: "${text.slice(0, 40)}" is a ${want}`, M.weightOf(text) === want, M.weightOf(text));
W('tell utsav i said hi', 'chat'); W('do you have a proof of sending him hi?', 'chat'); W('status of this?', 'chat'); W('and?', 'chat');
W('what can you do', 'chat'); W('thanks', 'chat'); W('can I get access to the staging page', 'chat');
W('Send me the brand colours and fonts', 'chat'); W('send me the logo, white, svg', 'chat'); W('which template should I use for a webinar', 'chat');
W('purple elephants', 'chat');
W('One-pager for sales, audience ops leads', 'run'); W('make me a landing page', 'run'); W('rework agent-card', 'run'); W('run the checks', 'run');
W('the logo should be in original color, change the headline too', 'run'); W('can you make the logo purple and add a cat', 'run');
W('x '.repeat(150), 'run');
W('tell Utsav to change the date', 'chat');
// 9 Oct 2026: real asks from the log that were wrongly counted as runs
W('then how can you check whom did you message?', 'chat'); W('when i ask, always keep it honest and make sure you tell everything you did', 'chat');
W('Share the agent marketplace staging link', 'chat'); W('i cant see any componenets you changes in the waiting list in review on hub?', 'chat');
W('Will merge it later, remind me at 10am', 'chat'); W('Remove you reacting eyes to every message, fills up the activity inbox on slack.', 'chat');
W('Instead, send a message that you are working and give an eta, keep the language humane and dont repeat a foxed template.', 'chat');
W('<https://design.gushwork.ai/internal/staging/ai-marketplace|design.gushwork.ai/internal/staging/ai-marketplace>', 'chat');
W('can you rework the pricing page', 'run'); W('please publish it', 'run'); W('change the hero headline on the lander', 'run');
// the cap: runs and chats are counted apart, and chats have their own, bigger guard
process.env.BRUCE_DAILY_CAP = '1'; process.env.BRUCE_DM_CHAT_CAP = '3';
store = {}; const nowW = new Date('2026-10-08T10:00:00Z');
let rr = await M.takeRun('U7', { f, now: nowW, bucket: 'runs' }); ok('a first run is allowed at a run cap of 1', rr.allowed && rr.bucket === 'runs' && rr.cap === 1);
rr = await M.takeRun('U7', { f, now: nowW, bucket: 'runs' }); ok('a second run is refused', !rr.allowed && rr.cap === 1);
for (let i = 0; i < 3; i++) rr = await M.takeRun('U7', { f, now: nowW, bucket: 'chats' });
ok('three chats are fine after the run cap is spent', rr.allowed && rr.used === 3 && rr.bucket === 'chats' && rr.cap === 3);
rr = await M.takeRun('U7', { f, now: nowW, bucket: 'chats' }); ok('a fourth chat hits the chat guard, not the run cap', !rr.allowed && rr.cap === 3 && rr.bucket === 'chats');
ok('chats and runs live under different keys', Object.keys(store).some((k) => k.startsWith('gw:bruce:chats:')) && Object.keys(store).some((k) => k.startsWith('gw:bruce:runs:')));
rr = await M.takeRun('UOWN', { f, now: nowW, uncapped: true, bucket: 'chats' }); ok('the owner is never refused, for chats either', rr.allowed);
process.env.BRUCE_DAILY_CAP = '2';
// old log rows: a "run" that was only a chat reads back as a chat
store['gw:bruce:log'] = [JSON.stringify({ at: new Date().toISOString(), user: 'U1', name: 'A', role: 'teammate', kind: 'run', text: 'tell utsav i said hi', thread: 0, used: 1 }),
  JSON.stringify({ at: new Date().toISOString(), user: 'U1', name: 'A', role: 'teammate', kind: 'run', text: 'make me a one-pager for sales', thread: 0, used: 1 })];
const oldRows = (await M.readLog(f));
ok('readLog returns old rows untouched (the mapping happens in the endpoint)', oldRows.length === 2 && oldRows.every((x) => x.kind === 'run'));
// suggestions for Bruce (9 Oct 2026): a note about one person's chat, owner only, never a message
const sg = async (method, cookie, extra = {}) => { let status = 0, out = null; await M.default({ method, query: extra.query || { suggest: '1' }, body: extra.body, headers: { cookie } }, { status(s) { status = s; return this; }, json(o) { out = o; return this; }, setHeader() {}, end() {} }); return { status, out }; };
const ownerCk = await ck('utsav.singh@gushwork.ai');
store = {}; cmds.length = 0; let slackCalls = 0;
globalThis.fetch = async (url, init) => { if (String(url).includes('slack.com')) { slackCalls++; return { ok: true, json: async () => ({ ok: true }) }; } return f(url, init); };
let g2 = await sg('POST', '', { body: { user: 'U0PRIYA01', name: 'Priya', text: 'ask who the audience is' } });
ok('suggest: signed out is 401', g2.status === 401);
g2 = await sg('POST', await ck('sam@gushwork.ai'), { body: { user: 'U0PRIYA01', name: 'Priya', text: 'x' } });
ok('suggest: a teammate is 403 and nothing is stored', g2.status === 403 && !store['gw:bruce:suggest']);
g2 = await sg('POST', ownerCk, { body: { user: 'U0PRIYA01', name: 'Priya', text: '   ' } });
ok('suggest: an empty suggestion is 400', g2.status === 400);
g2 = await sg('POST', ownerCk, { body: { user: 'not an id', name: 'Priya', text: 'hello' } });
ok('suggest: a bad person id is 400', g2.status === 400);
g2 = await sg('POST', ownerCk, { body: { user: 'U0PRIYA01', name: 'Priya', text: '  ask who the\n audience is  ' } });
ok('suggest: the owner saves one', g2.status === 200 && g2.out.suggestion.text === 'ask who the audience is' && store['gw:bruce:suggest'].length === 1, JSON.stringify(g2));
ok('suggest: it becomes a note Bruce reads for that person', (await M.readNotes('U0PRIYA01', f)).some((n) => /Suggestion from Utsav.*ask who the audience is/.test(n)));
ok('suggest: it is not a message (no Slack call)', slackCalls === 0);
await sg('POST', ownerCk, { body: { user: 'U0ISHA0001', name: 'Isha', text: 'keep it short' } });
g2 = await sg('GET', ownerCk, { query: { suggest: '1', user: 'U0PRIYA01' } });
ok('suggest: the owner reads back only that person\'s', g2.status === 200 && g2.out.suggestions.length === 1 && g2.out.suggestions[0].name === 'Priya', JSON.stringify(g2));
g2 = await sg('GET', await ck('sam@gushwork.ai'), { query: { suggest: '1', user: 'U0PRIYA01' } });
ok('suggest: a teammate cannot read them', g2.status === 403 && !g2.out.suggestions);
globalThis.fetch = realFetch;
// a suggestion can point at one message; and profile pictures (9 Oct 2026)
store = {}; cmds.length = 0;
globalThis.fetch = f;
g2 = await sg('POST', ownerCk, { body: { user: 'U0PRIYA01', name: 'Priya', text: 'lead with the file', about: { text: '  Here is   the logo,\n and more ', from: 'bruce', name: 'Bruce', at: 1760000000000 } } });
ok('suggest: a message can be attached', g2.status === 200 && g2.out.suggestion.about.text === 'Here is the logo, and more' && g2.out.suggestion.about.from === 'bruce', JSON.stringify(g2));
ok('suggest: the note names the message', (await M.readNotes('U0PRIYA01', f)).some((n) => /on your message "Here is the logo, and more": lead with the file/.test(n)));
g2 = await sg('GET', ownerCk, { query: { suggest: '1', user: 'U0PRIYA01' } });
ok('suggest: the attached message reads back', g2.out.suggestions[0].about && g2.out.suggestions[0].about.text.startsWith('Here is'));
store = {}; let infoCalls = 0;
const picF = async (url, init) => { if (String(url).includes('users.info')) { infoCalls++; const id = new URL(url).searchParams.get('user'); return { ok: true, json: async () => ({ ok: true, user: { profile: { image_72: id === 'U0NOPIC001' ? 'http://evil.example/x.png' : 'https://avatars.slack-edge.com/' + id + '.png' } } }) }; } return f(url, init); };
let pics = await M.slackPics('xoxb', ['U0PRIYA01', 'U0ISHA0001', 'U0NOPIC001', 'nope'], { f: picF });
ok('pics: looked up, https Slack hosts only, bad ids skipped', pics.U0PRIYA01 === 'https://avatars.slack-edge.com/U0PRIYA01.png' && pics.U0ISHA0001 && !pics.U0NOPIC001 && !pics.nope && infoCalls === 3, JSON.stringify(pics));
infoCalls = 0; pics = await M.slackPics('xoxb', ['U0PRIYA01', 'U0ISHA0001'], { f: picF });
ok('pics: kept after the first look', infoCalls === 0 && Object.keys(pics).length === 2);
infoCalls = 0; store = {}; pics = await M.slackPics('xoxb', ['U0AAAAAAA1', 'U0AAAAAAA2', 'U0AAAAAAA3'], { f: picF, max: 2 });
ok('pics: at most max lookups per call', infoCalls === 2 && Object.keys(pics).length === 2);
ok('pics: no token, no cache, nothing', Object.keys(await M.slackPics('', ['U0ZZZZZZZ1'], { f: picF })).length === 0);
globalThis.fetch = realFetch;
// deleting a suggestion removes it from the list and from Bruce's notes
store = {}; globalThis.fetch = f;
g2 = await sg('POST', ownerCk, { body: { user: 'U0PRIYA01', name: 'Priya', text: 'ask who it is for' } });
await sg('POST', ownerCk, { body: { user: 'U0PRIYA01', name: 'Priya', text: 'keep it short', about: { text: 'a long reply', from: 'bruce' } } });
const sgAt = g2.out.suggestion.id;
g2 = await sg('POST', await ck('sam@gushwork.ai'), { body: { user: 'U0PRIYA01', remove: sgAt } });
ok('delete: a teammate is 403', g2.status === 403);
g2 = await sg('POST', ownerCk, { body: { user: 'U0ISHA0001', remove: sgAt } });
ok('delete: the wrong person is 404 and nothing goes', g2.status === 404 && store['gw:bruce:suggest'].length === 2);
g2 = await sg('POST', ownerCk, { body: { user: 'U0PRIYA01', remove: sgAt } });
const left = await sg('GET', ownerCk, { query: { suggest: '1', user: 'U0PRIYA01' } });
const notesLeft = await M.readNotes('U0PRIYA01', f);
ok('delete: one is gone from the list, the other stays', g2.status === 200 && left.out.suggestions.length === 1 && left.out.suggestions[0].text === 'keep it short', JSON.stringify(left.out));
ok('delete: and from Bruce\'s notes', notesLeft.length === 1 && !notesLeft.some((n) => /ask who it is for/.test(n)) && /keep it short/.test(notesLeft[0]), JSON.stringify(notesLeft));
globalThis.fetch = realFetch;
console.log(`${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
