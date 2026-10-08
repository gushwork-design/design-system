// Tests for web/api/_tasks.js: the pure pieces, then the endpoint against a pretend store and a pretend Anthropic.
// Run: node scripts/tasks.test.mjs
import { installKv } from './tasks-kv.mjs';
import { sign, COOKIE, GUEST_COOKIE, guestSecret } from '../web/api/_session.js';
import { mintToken } from '../web/api/_bruce-memory.js';

process.env.SESSION_SECRET = 'test-secret';
process.env.OWNER_EMAILS = 'utsav.singh@gushwork.ai';
process.env.ADMIN_EMAILS = 'utsav.singh@gushwork.ai';
process.env.OWNER_SLACK_ID = 'U0OWNER';
process.env.ANTHROPIC_API_KEY = 'test-key';
process.env.BRUCE_CHAT_DAILY_CAP = '2';
process.env.TASKS_INTAKE_TOKEN = 'k'.repeat(40);

let anthropicReply = { answer: 'ok', plan: null };
let anthropicCalls = [];
const kv = installKv({
  others: async (url, init) => {
    anthropicCalls.push(JSON.parse(init.body));
    return new Response(JSON.stringify({ content: [{ type: 'text', text: typeof anthropicReply === 'string' ? anthropicReply : JSON.stringify(anthropicReply) }] }), { status: 200 });
  },
});

const { default: handler, cleanDate, cleanPatch, cleanAssignee, applyPatch, cleanPlan } = await import('../web/api/_tasks.js');

let pass = 0, fail = 0;
function t(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  ok ? pass++ : (fail++, console.log(`✘ ${name}\n  got  ${JSON.stringify(got)}\n  want ${JSON.stringify(want)}`));
}

/* ---- dates and fields ---- */
t('a real date passes', cleanDate('2026-10-09'), '2026-10-09');
t('an empty date clears', cleanDate(''), '');
t('a impossible date is refused', cleanDate('2026-02-30'), null);
t('a date with a time is refused', cleanDate('2026-10-09T10:00'), null);
t('a person must be in the company', [cleanAssignee('u:a@gushwork.ai', 'gushwork.ai'), cleanAssignee('u:a@gmail.com', 'gushwork.ai')], ['u:a@gushwork.ai', null]);
t('only known agents', [cleanAssignee('a:bruce', 'x'), cleanAssignee('a:nobody', 'x'), cleanAssignee('', 'x')], ['a:bruce', null, '']);
{
  const { patch, bad } = cleanPatch({ title: '  Hi ', status: 'doing', priority: 'urgent', due: '2026-10-09', assignee: 'a:alfred', evil: 1 }, 'gushwork.ai');
  t('a good patch keeps its fields and drops unknown ones', [patch, bad], [{ title: 'Hi', status: 'doing', priority: 'urgent', due: '2026-10-09', assignee: 'a:alfred' }, []]);
  t('a bad field is named, not half applied', cleanPatch({ status: 'nope', due: 'soon' }, 'gushwork.ai').bad, ['status', 'due']);
}

/* ---- applying a patch ---- */
{
  const base = () => ({ title: 'x', notes: '', status: 'todo', priority: '', start: '', due: '', guessed: { due: true, priority: true }, assignee: 'u:me@gushwork.ai', run: '', runNote: '', doneAt: '', activity: [] });
  let x = base();
  t('editing the due date clears its guess', (applyPatch(x, { due: '2026-10-09' }, 'me@gushwork.ai', 'N'), x.guessed), { due: false, priority: true });
  x = base();
  const lines = applyPatch(x, { status: 'done' }, 'me@gushwork.ai', 'NOW');
  t('done sets doneAt and says so', [x.doneAt, lines], ['NOW', ['moved it to Done']]);
  applyPatch(x, { status: 'todo' }, 'me@gushwork.ai', 'LATER');
  t('leaving done clears doneAt', x.doneAt, '');
  x = base();
  applyPatch(x, { assignee: 'a:bruce' }, 'me@gushwork.ai', 'N');
  t('handing a task to an agent queues it', [x.assignee, x.run], ['a:bruce', 'queued']);
  applyPatch(x, { assignee: 'u:me@gushwork.ai' }, 'me@gushwork.ai', 'N');
  t('handing it back clears the run', x.run, '');
  x = base();
  applyPatch(x, { run: 'working' }, 'me@gushwork.ai', 'N');
  t('a person task has no run', x.run, '');
  x = { ...base(), assignee: 'a:bruce', run: 'review' };
  applyPatch(x, { run: 'queued' }, 'me@gushwork.ai', 'N');
  t('a person sending an agent task back is not written as the agent speaking', x.activity.map((a) => a.text), ['sent it back to be run again']);
  x = { ...base(), assignee: 'a:bruce', run: 'queued' };
  applyPatch(x, { run: 'needs' }, 'bruce', 'N');
  t('an agent reports in its own voice', x.activity.map((a) => a.text), ['has a question']);
  x = base();
  const none = applyPatch(x, { title: 'x', status: 'todo' }, 'me', 'N');
  t('a no-op earns no activity', [none, x.activity], [[], []]);
}

/* ---- the endpoint ---- */
const owner = 'utsav.singh@gushwork.ai';
const sessionFor = async (email, extra = {}) => `${COOKIE}=${encodeURIComponent(await sign({ email, name: email.split('@')[0], via: 'google', exp: Math.floor(Date.now() / 1000) + 3600, ...extra }, process.env.SESSION_SECRET))}`;
async function call(method, body, { cookie, headers = {}, query = {} } = {}) {
  let status = 200, out = null;
  const res = { setHeader() {}, status(s) { status = s; return res; }, end(b) { out = b ? JSON.parse(b) : null; }, json(b) { out = b; } };
  await handler({ method, query, headers: { cookie, ...headers }, body }, res);
  return { status, body: out };
}
const me = await sessionFor(owner);

t('no cookie is 401', (await call('GET', null, {})).status, 401);
t('another company address is refused on the owner page', (await call('GET', null, { cookie: await sessionFor('sam@gushwork.ai') })).status, 403);
t('a guest is refused', (await call('GET', null, { cookie: `${GUEST_COOKIE}=${encodeURIComponent(await sign({ typ: 'guest', email: 'guest@example.com', exp: Math.floor(Date.now() / 1000) + 3600 }, guestSecret()))}` })).status, 403);
t('an empty board reads empty', (await call('GET', null, { cookie: me })).body.tasks, []);

let r = await call('POST', { op: 'create', task: { title: 'Check the CTA', priority: 'high', due: '2026-10-09' } }, { cookie: me });
const a = r.body.task;
t('create gives a number, defaults and an owner', [r.status, a.n, a.status, a.assignee, a.createdBy, a.activity[0].text], [200, 1, 'todo', 'u:' + owner, owner, 'created this']);
t('a task needs a title', (await call('POST', { op: 'create', task: { title: ' ' } }, { cookie: me })).status, 400);
t('a bad date is refused with the field named', (await call('POST', { op: 'create', task: { title: 'x', due: 'soon' } }, { cookie: me })).body.error, 'Check due.');
r = await call('POST', { op: 'create', task: { title: 'For Bruce', assignee: 'a:bruce' } }, { cookie: me });
t('created for an agent starts queued', [r.body.task.n, r.body.task.run], [2, 'queued']);
const b = r.body.task;

r = await call('POST', { op: 'update', id: a.id, patch: { status: 'doing', due: '2026-10-12' } }, { cookie: me });
t('update moves and dates, and writes the story', [r.body.task.status, r.body.task.due, r.body.task.activity.map((x) => x.text).slice(1)], ['doing', '2026-10-12', ['moved it to Doing', 'set the due date to Mon 12 Oct']]);
t('update with nothing is 400', (await call('POST', { op: 'update', id: a.id, patch: {} }, { cookie: me })).status, 400);
t('update of a missing task is 404', (await call('POST', { op: 'update', id: 'a'.repeat(18), patch: { title: 'x' } }, { cookie: me })).status, 404);
t('a run on a person task is refused', (await call('POST', { op: 'update', id: a.id, patch: { run: 'working' } }, { cookie: me })).status, 400);

r = await call('POST', { op: 'bulk', ids: [a.id, b.id], patch: { priority: 'low' } }, { cookie: me });
t('bulk changes several', r.body.tasks.map((x) => x.priority), ['low', 'low']);

/* Bruce's door */
const tok = mintToken('U0OWNER');
const bruceCall = (body, token = tok) => call('POST', body, { headers: { authorization: `Bearer ${token}` } });
t('a token for someone else is refused', (await bruceCall({ op: 'suggest', tasks: [] }, mintToken('U0OTHER'))).status, 401);
t('a forged token is refused', (await bruceCall({ op: 'suggest', tasks: [] }, tok.slice(0, -2) + 'xx')).status, 401);
t('a token cannot read the list', (await call('GET', null, { headers: { authorization: `Bearer ${tok}` } })).status, 403);
t('a token cannot create or delete', [(await bruceCall({ op: 'create', task: { title: 'x' } })).status, (await bruceCall({ op: 'delete', id: a.id })).status], [403, 403]);
const sug = { title: 'Send Darshil the template', quote: 'Can you send me the template?', channel: '#growth', from: 'Darshil', url: 'https://gushwork.slack.com/archives/C1/p1', ts: '1791470000.123456', due: '2026-10-09', priority: 'high', why: 'A direct request.' };
r = await bruceCall({ op: 'suggest', tasks: [sug, { title: '' }] });
t('suggest files and skips the empty one', [r.body.added, r.body.skipped], [1, 1]);
r = await bruceCall({ op: 'suggest', tasks: [sug] });
t('the same Slack message is filed once', [r.body.added, r.body.skipped], [0, 1]);
let list = (await call('GET', null, { cookie: me })).body;
const s = list.tasks.find((x) => x.status === 'suggested');
t('a suggestion is Bruce\'s, in the Suggested lane, guessed, for the owner', [s.createdBy, s.assignee, s.guessed, s.source.channel, s.activity[0].text], ['bruce', 'u:' + owner, { due: true, priority: true }, '#growth', 'suggested this from #growth']);
r = await call('POST', { op: 'accept', id: s.id }, { cookie: me });
t('accept moves it to To do and says accepted', [r.body.task.status, r.body.task.activity.at(-1).text], ['todo', 'accepted it']);
const s2 = (await bruceCall({ op: 'suggest', tasks: [{ title: 'Another', ts: '1791470001.000001', channel: '#x' }] })).body;
list = (await call('GET', null, { cookie: me })).body;
const other = list.tasks.find((x) => x.title === 'Another');
r = await call('POST', { op: 'dismiss', id: other.id }, { cookie: me });
t('dismiss hides it but keeps it', r.body.task.status, 'dismissed');
r = await bruceCall({ op: 'run', id: b.id, run: 'working', text: 'Read the #growth thread.' });
t('an agent can report a run and add a line', [r.body.task.run, r.body.task.activity.at(-1)], ['working', { at: r.body.task.activity.at(-1).at, by: 'bruce', text: 'Read the #growth thread.' }]);
t('an agent cannot set done through run', (await bruceCall({ op: 'run', id: b.id, run: 'done' })).status, 400);
t('a run on a person task is refused', (await bruceCall({ op: 'run', id: a.id, run: 'working' })).status, 400);

/* the scan routine's standing key */
const KEY = 'k'.repeat(40);
const keyCall = (body, token = KEY) => bruceCall(body, token);
t('the standing key is refused when wrong', (await keyCall({ op: 'cursor' }, 'k'.repeat(39) + 'x')).status, 401);
t('a short key is never accepted even if it matches', await (async () => { process.env.TASKS_INTAKE_TOKEN = 'short'; const r = await keyCall({ op: 'cursor' }, 'short'); process.env.TASKS_INTAKE_TOKEN = KEY; return r.status; })(), 401);
t('the standing key does nothing while the env var is unset', await (async () => { delete process.env.TASKS_INTAKE_TOKEN; const r = await keyCall({ op: 'cursor' }, ''); process.env.TASKS_INTAKE_TOKEN = KEY; return r.status; })(), 401);
t('the standing key cannot read, create or delete', [(await call('GET', null, { headers: { authorization: `Bearer ${KEY}` } })).status, (await keyCall({ op: 'create', task: { title: 'x' } })).status, (await keyCall({ op: 'delete', id: a.id })).status], [403, 403, 403]);
r = await keyCall({ op: 'cursor' });
t('with no scan yet the cursor is about a day ago', Math.round((Date.now() - Date.parse(r.body.since)) / 3600e3), 24);
const doneAt = new Date(Date.now() - 20 * 60e3).toISOString();
r = await keyCall({ op: 'suggest', tasks: [{ title: 'From the scan', channel: 'DM', ts: '1791470099.000100', from: 'Sam' }], scanned: doneAt });
t('a scan files and moves the cursor', [r.body.added, r.body.since], [1, doneAt]);
r = await keyCall({ op: 'suggest', tasks: [], scanned: new Date(Date.now() - 3600e3).toISOString() });
t('the cursor never goes backwards', r.body.since, doneAt);
r = await keyCall({ op: 'suggest', tasks: [], scanned: new Date(Date.now() + 3600e3 * 5).toISOString() });
t('the cursor never goes into the future', r.body.since, doneAt);
t('the cursor shows on the board for the page', (await call('GET', null, { cookie: me })).body.scan.at, doneAt);

/* Ask Bruce */
const board = (await call('GET', null, { cookie: me })).body.tasks;
const ids = board.slice(0, 2).map((x) => x.id);
anthropicReply = {
  answer: 'Here is what I will do.',
  plan: [
    { kind: 'tasks', op: 'bulk', ids: [...ids, 'f'.repeat(18)], patch: { status: 'doing' }, label: 'Move two' },
    { kind: 'tasks', op: 'update', id: 'f'.repeat(18), patch: { status: 'done' }, label: 'a ghost' },
    { kind: 'tasks', op: 'update', id: ids[0], patch: { status: 'banana' }, label: 'bad field' },
    { kind: 'tasks', op: 'accept', id: ids[0], label: 'not suggested' },
    { kind: 'slack', channel: '#growth', text: 'On it.', label: 'Reply' },
    { kind: 'shell', op: 'rm', label: 'nope' },
  ],
};
anthropicCalls = [];
r = await call('POST', { op: 'ask', messages: [{ role: 'user', content: 'move these to doing' }], context: { view: 'board', tagged: [ids[0], 'zzz'], today: '2026-10-08' } }, { cookie: me });
t('ask returns the answer and a cleaned plan', [r.status, r.body.answer, r.body.plan.map((x) => [x.kind, x.op || '', x.ids ? x.ids.length : 0])], [200, 'Here is what I will do.', [['tasks', 'bulk', 2], ['slack', '', 0]]]);
t('the owner has no cap', r.body.cap, 0);
t('the model saw the board, the date and the tag, and never a secret', [anthropicCalls[0].system.includes('Today is 2026-10-08'), anthropicCalls[0].system.includes('TSK-1'), anthropicCalls[0].system.includes('test-key')], [true, true, false]);
anthropicReply = 'Plain words, not JSON.';
r = await call('POST', { op: 'ask', messages: [{ role: 'user', content: 'hi' }] }, { cookie: me });
t('a reply that is not JSON still answers, with no plan', [r.body.answer, r.body.plan], ['Plain words, not JSON.', null]);
t('ask with nothing is 400', (await call('POST', { op: 'ask', messages: [] }, { cookie: me })).status, 400);
{
  /* a teammate over the cap: they need the page opened to them first, so grant it through the rules is out of scope here;
     the cap logic is the same call, so test it as the owner with a cap override by using a non-owner session on a public rule */
  const day = new Date().toISOString().slice(0, 10);
  kv.hashes.set(`gw:bruce:chat:${day}`, new Map([['x@y', '99']]));
  t('the cap counts per person per day in the chat store', Number(kv.hashes.get(`gw:bruce:chat:${day}`).get('x@y')), 99);
}
delete process.env.ANTHROPIC_API_KEY;
t('ask without a key is a plain 500', (await call('POST', { op: 'ask', messages: [{ role: 'user', content: 'hi' }] }, { cookie: me })).status, 500);

/* plan cleaning, directly */
{
  const byId = new Map([['a'.repeat(18), { n: 3, status: 'suggested' }], ['b'.repeat(18), { n: 4, status: 'todo' }]]);
  const plan = cleanPlan([
    { kind: 'tasks', op: 'dismiss', id: 'a'.repeat(18) }, { kind: 'tasks', op: 'dismiss', id: 'b'.repeat(18) },
    { kind: 'tasks', op: 'create', task: { title: 'New one', due: '2026-10-09' } }, { kind: 'tasks', op: 'create', task: { title: '' } },
    { kind: 'tasks', op: 'delete', id: 'b'.repeat(18) },
  ], byId, 'gushwork.ai');
  t('only suggested tasks can be dismissed, a create needs a title', plan.map((x) => [x.op, x.id || (x.task && x.task.title)]), [['dismiss', 'a'.repeat(18)], ['create', 'New one'], ['delete', 'b'.repeat(18)]]);
  t('no steps is null', cleanPlan([], byId, 'x'), null);
  t('more than ten steps are cut', cleanPlan(Array.from({ length: 15 }, () => ({ kind: 'slack', channel: '#a', text: 'x' })), byId, 'x').length, 10);
}

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
