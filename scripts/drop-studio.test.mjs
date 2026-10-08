// Tests for web/api/_drop-studio.js: the pure pieces, then the endpoint against a pretend GitHub.
// Run: node scripts/drop-studio.test.mjs
import { sign, COOKIE } from '../web/api/_session.js';
import { slug, roleOf, approvedPath, cleanBrief, issueTitle, issueBody, parseBody, deriveState } from '../web/api/_drop-studio.js';
import { cleanSubscription, message, _setSender } from '../web/api/_drop-push.js';

process.env.SESSION_SECRET = 'test-secret';
const { default: handler } = await import('../web/api/_drop-studio.js');

let pass = 0, fail = 0;
function t(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  ok ? pass++ : (fail++, console.log(`✘ ${name}\n  got  ${JSON.stringify(got)}\n  want ${JSON.stringify(want)}`));
}

/* ---- names ---- */
t('a name becomes an id', slug('  Credit Checker! '), 'credit-checker');
t('an id is cut at 40 with no trailing dash', slug('a'.repeat(39) + ' b'), 'a'.repeat(39));
t('the role drops a trailing -agent', [roleOf('seo-agent'), roleOf('quote-builder'), roleOf('paid-ad-agent')], ['seo', 'quote-builder', 'paid-ad']);
t('the approved picture of an agent', approvedPath('email-marketing-agent'), 'masters/agent-portrait-email-marketing.png');

/* ---- the brief ---- */
const ok = { name: 'Credit Checker', does: 'Checks a new customer’s credit.', bundle: 'Cash', props: [], pose: 'auto' };
t('a good brief gets an id from its name', cleanBrief(ok, new Set()).brief.agentId, 'credit-checker');
t('a name is required', cleanBrief({ ...ok, name: ' ' }, new Set()).error, 'Give the agent a name.');
t('what it does is required', cleanBrief({ ...ok, does: '' }, new Set()).error, 'Say what the agent does.');
t('one prop is not enough', cleanBrief({ ...ok, props: ['a'] }, new Set()).error, 'Give 2 to 4 props, or none and ChatGPT will choose.');
t('five props are too many', cleanBrief({ ...ok, props: ['a', 'b', 'c', 'd', 'e'] }, new Set()).error, 'Give 2 to 4 props, or none and ChatGPT will choose.');
t('two to four props are kept', cleanBrief({ ...ok, props: ['a', ' b ', ''] }, new Set()).brief.props, ['a', 'b']);
t('an unknown pose becomes standing', cleanBrief({ ...ok, pose: 'flying' }, new Set()).brief.pose, 'standing');
t('a second open request for the same agent is refused', cleanBrief(ok, new Set(['credit-checker'])).error, 'There is already a request for this agent.');
t('a revision may repeat the agent', !!cleanBrief({ ...ok, revisionOf: 'credit-checker-v1.png' }, new Set(['credit-checker'])).brief, true);
t('a revision must name a candidate file', cleanBrief({ ...ok, revisionOf: '../../etc' }, new Set()).error, 'Bad revision.');
t('an id with a slash is refused', cleanBrief({ ...ok, agentId: 'a/b' }, new Set()).error, 'That name cannot make an agent id.');
t('the title says revision', issueTitle(cleanBrief({ ...ok, revisionOf: 'credit-checker-v1.png' }, new Set()).brief), 'Image request: Credit Checker (revision of credit-checker-v1.png)');

/* ---- the issue body is what the ChatGPT task parses ---- */
const brief = cleanBrief({ ...ok, props: ['folder', 'stamp'], notes: 'No hard hat.' }, new Set()).brief;
const body = issueBody(brief);
t('who asked is kept in the issue', parseBody(issueBody({ ...brief, requestedBy: 'sam@gushwork.ai' })).requestedBy, 'sam@gushwork.ai');
t('the headings are the contract\'s, in order', body.match(/^### .+$/gm), ['### Agent id', '### Agent name', '### What it does', '### Props', '### Pose', '### Notes', '### Revision of', '### Bundle', '### Requested by']);
t('the body round-trips', parseBody(body), { agentId: 'credit-checker', name: 'Credit Checker', does: 'Checks a new customer’s credit.', props: ['folder', 'stamp'], pose: 'auto', notes: 'No hard hat.', revisionOf: '', bundle: 'Cash', requestedBy: '' });
t('no props reads none', issueBody(cleanBrief(ok, new Set()).brief).includes('### Props\n\nnone'), true);

/* ---- state, from issues and files alone ---- */
const issue = (n, id, labels, state, extra = {}) => ({ number: n, state, html_url: `https://github.com/x/${n}`, labels: labels.map((name) => ({ name })), body: issueBody({ agentId: id, name: extra.name || id, does: 'Does a thing.', props: [], pose: 'standing', notes: '', revisionOf: '', bundle: 'Cash' }) });
const files = (...paths) => paths.map((p, i) => ({ path: p, sha: 'sha' + i, type: 'blob' }));
let s = deriveState([issue(3, 'quote-builder', ['image-request'], 'open')], []);
t('an open request is requested', s.work['quote-builder'].status, 'requested');
s = deriveState([issue(3, 'quote-builder', ['needs-input'], 'open')], []);
t('an open needs-input wins', s.work['quote-builder'].status, 'needs-input');
s = deriveState([issue(3, 'quote-builder', ['image-ready'], 'closed')], files('explorations/agents/quote-builder-v1.png'));
t('a delivered, undecided picture is to review', [s.work['quote-builder'].status, s.work['quote-builder'].candidate.path], ['review', 'explorations/agents/quote-builder-v1.png']);
s = deriveState([issue(3, 'quote-builder', ['image-ready'], 'closed')], files('explorations/agents/quote-builder-v1.png', 'explorations/agents/quote-builder-v2.png', 'explorations/agents/quote-builder-v10.png'));
t('the highest version is the candidate', s.work['quote-builder'].candidate.version, 10);
s = deriveState([issue(3, 'quote-builder', ['image-ready', 'accepted'], 'closed')], files('explorations/agents/quote-builder-v1.png'));
t('an accepted picture is no longer to review', s.work['quote-builder'], undefined);
s = deriveState([issue(3, 'quote-builder', ['image-ready', 'discarded'], 'closed')], files('explorations/agents/quote-builder-v1.png'));
t('a discarded picture is no longer to review', s.work['quote-builder'], undefined);
s = deriveState([issue(4, 'quote-builder', ['image-request'], 'open'), issue(3, 'quote-builder', ['image-ready', 'revision'], 'closed')], files('explorations/agents/quote-builder-v1.png'));
t('a revision in flight is requested', s.work['quote-builder'].status, 'requested');
s = deriveState([issue(3, 'quote-builder', ['image-ready'], 'closed')], []);
t('a delivered issue with no file is nothing', s.work['quote-builder'], undefined);
s = deriveState([], files('masters/agent-portrait-seo.png', 'masters/material.png', 'explorations/agents/seo-drop-v1.png', 'specs/character.md'));
t('only role portraits are approved pictures', Object.keys(s.approved), ['seo']);
s = deriveState([{ ...issue(5, 'x', ['image-request'], 'open'), pull_request: {} }, { number: 6, state: 'open', labels: [{ name: 'bug' }], body: '' }], []);
t('pull requests and other issues are ignored', s.work, {});
s = deriveState([issue(7, 'credit-checker', ['image-request'], 'open', { name: 'Credit Checker' })], []);
t('a created agent is listed while it has work', s.created.map((a) => [a.id, a.name, a.bundle]), [['credit-checker', 'Credit Checker', 'Cash']]);
s = deriveState([issue(7, 'credit-checker', ['image-ready', 'discarded'], 'closed')], files('explorations/agents/credit-checker-v1.png'));
t('a created agent with a candidate stays visible', s.created.length, 1);
s = deriveState([issue(7, 'credit-checker', ['image-ready', 'discarded'], 'closed')], []);
t('a created agent with nothing left is dropped', s.created.length, 0);

/* ---- the endpoint, against a pretend GitHub ---- */
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 1, 2, 3, 4]);
function pretend() {
  const g = { issues: [], tree: [], calls: [], puts: [], comments: {}, labelOps: [], nextIssue: 20, fail: 0, kv: { h: {}, s: {} } };
  globalThis.fetch = async (url, init = {}) => {
    const send = (code, bodyObj) => ({ ok: code < 300, status: code, json: async () => bodyObj });
    if (String(url) === 'https://kv.test/pipeline') {
      const out = JSON.parse(init.body).map((c) => {
        const [cmd, key, ...a] = c;
        if (cmd === 'HGETALL') return { result: Object.entries(g.kv.h[key] || {}).flat() };
        if (cmd === 'HSET') { (g.kv.h[key] = g.kv.h[key] || {})[a[0]] = a[1]; return { result: 1 }; }
        if (cmd === 'HDEL') { for (const f of a) delete (g.kv.h[key] || {})[f]; return { result: 1 }; }
        if (cmd === 'SET') { if (a.includes('NX') && g.kv.s[key]) return { result: null }; g.kv.s[key] = a[0]; return { result: 'OK' }; }
        return { result: null };
      });
      return send(200, out);
    }
    const u = new URL(url), p = u.pathname.replace('/repos/o/r', ''), m = init.method || 'GET';
    g.calls.push(m + ' ' + p);
    if (g.fail) return send(g.fail, { message: 'nope' });
    if (!init.headers || !String(init.headers.authorization).startsWith('Bearer tok')) return send(401, {});
    if (p === '/issues' && m === 'GET') return send(200, g.issues);
    if (p === '/issues' && m === 'POST') {
      const b = JSON.parse(init.body); const n = g.nextIssue++;
      const made = { number: n, state: 'open', html_url: 'https://github.com/o/r/issues/' + n, title: b.title, body: b.body, labels: b.labels.map((name) => ({ name })) };
      g.issues.push(made); return send(201, made);
    }
    if (p.startsWith('/git/trees/')) return send(200, { tree: g.tree });
    if (p.startsWith('/git/blobs/')) return send(200, { content: PNG.toString('base64').replace(/(.{4})/g, '$1\n'), encoding: 'base64' });
    if (p.startsWith('/contents/') && m === 'PUT') { g.puts.push({ path: p.slice(10), ...JSON.parse(init.body) }); return send(200, { commit: { sha: 'c1' } }); }
    let mm;
    if (m === 'GET' && (mm = /^\/issues\/(\d+)$/.exec(p))) { const it = g.issues.find((i) => i.number === Number(mm[1])); return it ? send(200, it) : send(404, {}); }
    if ((mm = /^\/issues\/(\d+)\/comments$/.exec(p))) {
      if (m === 'POST') { (g.comments[mm[1]] = g.comments[mm[1]] || []).push({ body: JSON.parse(init.body).body }); return send(201, {}); }
      return send(200, g.comments[mm[1]] || []);
    }
    if ((mm = /^\/issues\/(\d+)\/labels(?:\/(.+))?$/.exec(p))) {
      const it = g.issues.find((i) => i.number === Number(mm[1]));
      if (m === 'POST') { JSON.parse(init.body).labels.forEach((name) => it.labels.push({ name })); g.labelOps.push('+' + JSON.parse(init.body).labels.join(',')); return send(200, it.labels); }
      if (m === 'DELETE') { const name = decodeURIComponent(mm[2]); it.labels = it.labels.filter((l) => l.name !== name); g.labelOps.push('-' + name); return send(200, it.labels); }
    }
    return send(404, {});
  };
  return g;
}
const owner = COOKIE + '=' + await sign({ email: 'utsav.singh@gushwork.ai', exp: Math.floor(Date.now() / 1000) + 600 }, 'test-secret');
const teammate = COOKIE + '=' + await sign({ email: 'someone@gushwork.ai', exp: Math.floor(Date.now() / 1000) + 600 }, 'test-secret');
const other = COOKIE + '=' + await sign({ email: 'someone@example.com', exp: Math.floor(Date.now() / 1000) + 600 }, 'test-secret');
async function call(method, op, { cookie = owner, body, query = {}, headers = {} } = {}) {
  const out = { status: 0, headers: {}, body: null };
  const res = {
    setHeader: (k, v) => { out.headers[k.toLowerCase()] = v; },
    status(c) { out.status = c; return this; },
    end(b) { out.body = Buffer.isBuffer(b) ? b : (b ? JSON.parse(b) : null); },
  };
  await handler({ method, query: { op, ...query }, headers: { cookie, ...headers }, body }, res);
  return out;
}

delete process.env.DROP_REFERENCE_TOKEN;
let r = await call('GET', 'state');
t('no token: state says not connected', [r.status, r.body.configured, r.body.owner], [200, false, true]);
r = await call('POST', 'create', { body: ok });
t('no token: a write is refused', r.status, 503);
r = await call('GET', 'state', { cookie: '' });
t('signed out is refused', r.status, 401);

process.env.DROP_REFERENCE_TOKEN = 'tok'; process.env.DROP_REFERENCE_REPO = 'o/r';
let g = pretend();
r = await call('GET', 'state', { cookie: other });
t('a signed-in account the gate does not let in is refused', r.status, 403);
r = await call('GET', 'state', { cookie: teammate });
t('a teammate in the organisation is let in, and is not the owner', [r.status, r.body.owner], [200, false]);

g.issues = [issue(3, 'quote-builder', ['image-request'], 'open'), issue(2, 'margin-guard', ['image-ready'], 'closed'), issue(1, 'cash-desk', ['needs-input'], 'open')];
g.tree = files('masters/agent-portrait-seo.png', 'explorations/agents/margin-guard-v1.png');
g.comments['1'] = [{ body: 'Folder or magnifying glass?' }];
r = await call('GET', 'state');
t('state: statuses, approved and the question', [r.body.configured, r.body.work['quote-builder'].status, r.body.work['margin-guard'].status, r.body.work['cash-desk'].status, r.body.work['cash-desk'].question, Object.keys(r.body.approved)], [true, 'requested', 'review', 'needs-input', 'Folder or magnifying glass?', ['seo']]);

r = await call('GET', 'image', { query: { path: 'masters/material.png' } });
t('the material master is not served', r.status, 400);
r = await call('GET', 'image', { query: { path: '../../etc/passwd' } });
t('a path outside the folders is not served', r.status, 400);
r = await call('GET', 'image', { query: { path: 'explorations/agents/nope-v1.png' } });
t('a missing picture is 404', r.status, 404);
r = await call('GET', 'image', { query: { path: 'masters/agent-portrait-seo.png' } });
t('an approved portrait streams as a png', [r.status, r.headers['content-type'], Buffer.isBuffer(r.body) && r.body.equals(PNG), r.headers['cache-control']], [200, 'image/png', true, 'private, max-age=300']);

g = pretend();
r = await call('POST', 'create', { body: { ...ok, props: ['folder', 'stamp'] } });
t('create opens an issue labelled image-request', [r.status, r.body.agentId, g.issues[0].title, g.issues[0].labels.map((l) => l.name)], [200, 'credit-checker', 'Image request: Credit Checker', ['image-request']]);
r = await call('POST', 'create', { body: ok });
t('a second open request for the same agent is a 400', [r.status, r.body.error], [400, 'There is already a request for this agent.']);
r = await call('POST', 'create', { body: { ...ok, name: '' } });
t('a bad brief is a 400 and opens nothing', [r.status, g.issues.length], [400, 1]);

g = pretend();
g.issues = [issue(1, 'cash-desk', ['needs-input'], 'open')];
r = await call('POST', 'answer', { body: { issue: 1, text: 'Folder with a stamp' } });
t('an answer comments and puts the request back in the queue', [r.status, g.comments['1'][0].body.includes('Folder with a stamp'), g.issues[0].labels.map((l) => l.name)], [200, true, ['image-request']]);
r = await call('POST', 'answer', { body: { issue: 1, text: 'again' } });
t('answering a request that is not waiting is a 404', r.status, 404);
r = await call('POST', 'answer', { body: { issue: 1, text: ' ' } });
t('an empty answer is a 400', r.status, 400);

g = pretend();
g.issues = [issue(2, 'seo-agent', ['image-ready'], 'closed', { name: 'SEO Agent' })];
g.tree = files('masters/agent-portrait-seo.png', 'explorations/agents/seo-agent-v2.png');
r = await call('POST', 'decide', { body: { agentId: 'seo-agent', action: 'accept' } });
t('accept writes the candidate over the approved portrait', [r.status, g.puts[0].path, g.puts[0].branch, g.puts[0].sha, g.puts[0].content, g.issues[0].labels.map((l) => l.name)], [200, 'masters/agent-portrait-seo.png', 'main', 'sha0', PNG.toString('base64'), ['image-ready', 'accepted']]);

g = pretend();
g.issues = [issue(2, 'quote-builder', ['image-ready'], 'closed', { name: 'Quote Builder' })];
g.tree = files('explorations/agents/quote-builder-v1.png');
r = await call('POST', 'decide', { body: { agentId: 'quote-builder', action: 'accept' } });
t('accepting a first portrait creates the file without a sha', [r.status, g.puts[0].path, g.puts[0].sha], [200, 'masters/agent-portrait-quote-builder.png', undefined]);

g = pretend();
g.issues = [issue(2, 'quote-builder', ['image-ready'], 'closed', { name: 'Quote Builder' })];
g.tree = files('explorations/agents/quote-builder-v1.png');
r = await call('POST', 'decide', { body: { agentId: 'quote-builder', action: 'changes', note: 'Make the calculator bigger.' } });
const rev = g.issues[1];
t('changes opens a revision request with the note', [r.status, rev.title, parseBody(rev.body).revisionOf, parseBody(rev.body).notes, rev.labels.map((l) => l.name), g.issues[0].labels.map((l) => l.name)], [200, 'Image request: Quote Builder (revision of quote-builder-v1.png)', 'quote-builder-v1.png', 'Make the calculator bigger.', ['image-request'], ['image-ready', 'revision']]);

g = pretend();
g.issues = [issue(2, 'quote-builder', ['image-ready'], 'closed')];
g.tree = files('explorations/agents/quote-builder-v1.png');
r = await call('POST', 'decide', { body: { agentId: 'quote-builder', action: 'discard', note: 'Wrong props.' } });
t('discard comments and labels', [r.status, g.comments['2'][0].body.includes('Wrong props.'), g.issues[0].labels.map((l) => l.name)], [200, true, ['image-ready', 'discarded']]);
r = await call('POST', 'decide', { body: { agentId: 'quote-builder', action: 'discard' } });
t('deciding twice is a 409', r.status, 409);
r = await call('POST', 'decide', { body: { agentId: 'nobody', action: 'accept' } });
t('an agent with nothing waiting is a 409', r.status, 409);
r = await call('POST', 'decide', { body: { agentId: 'Quote Builder', action: 'accept' } });
t('a bad id is a 400', r.status, 400);

g = pretend();
r = await call('POST', 'create', { cookie: teammate, body: { ...ok, name: 'Rate Checker' } });
t('a teammate cannot create an agent or ask for a picture', [r.status, g.issues.length], [403, 0]);
r = await call('POST', 'create', { body: { ...ok, name: 'Rate Checker' } });
t('the owner can', [r.status, r.body.agentId], [200, 'rate-checker']);
g.issues[0].labels = [{ name: 'needs-input' }];
r = await call('POST', 'answer', { cookie: teammate, body: { issue: g.issues[0].number, text: 'A clipboard' } });
t('a teammate cannot answer ChatGPT', [r.status, g.comments[String(g.issues[0].number)]], [403, undefined]);
g.issues[0].labels = [{ name: 'image-request' }];
g.issues[0].labels = [{ name: 'image-ready' }]; g.issues[0].state = 'closed'; g.tree = files('explorations/agents/rate-checker-v1.png');
r = await call('POST', 'decide', { cookie: teammate, body: { agentId: 'rate-checker', action: 'accept' } });
t('a teammate cannot accept, change or discard a picture', [r.status, g.puts.length], [403, 0]);

/* ---- push notifications ---- */
const goodSub = { endpoint: 'https://push.example/abc123', keys: { p256dh: 'BPk', auth: 'au' } };
t('a good subscription is kept', cleanSubscription({ ...goodSub, extra: 'x' }), goodSub);
t('an http endpoint is refused', cleanSubscription({ ...goodSub, endpoint: 'http://push.example/abc' }), null);
t('a subscription without keys is refused', cleanSubscription({ endpoint: goodSub.endpoint }), null);
t('the message says nothing about GitHub', [message('ready', 'Sales Guy', 'sales-guy').title, message('ready', 'Sales Guy', 'sales-guy').body, message('needs-input', 'Sales Guy', 'sales-guy').title], ['Your picture is ready', 'Sales Guy is ready to review.', 'ChatGPT has a question']);
t('the message opens the agent', message('ready', 'A', 'a-b').url, '/internal/staging/drop-studio/?agent=a-b');

process.env.KV_REST_API_URL = 'https://kv.test'; process.env.KV_REST_API_TOKEN = 'kvtok';
delete process.env.VAPID_PUBLIC_KEY; delete process.env.VAPID_PRIVATE_KEY; process.env.DROP_WEBHOOK_KEY = 'hookkey';
g = pretend();
r = await call('GET', 'pushkey');
t('no keys: the page is told there is no push key', r.body.key, '');
r = await call('POST', 'subscribe', { cookie: teammate, body: { subscription: goodSub } });
t('no keys: subscribing says it is not switched on', r.status, 503);

process.env.VAPID_PUBLIC_KEY = 'PUBKEY'; process.env.VAPID_PRIVATE_KEY = 'PRIVKEY';
r = await call('GET', 'pushkey');
t('with keys: the public key is handed out', r.body.key, 'PUBKEY');
r = await call('GET', 'state');
t('state says push is available', r.body.push, true);
r = await call('POST', 'subscribe', { cookie: '', body: { subscription: goodSub } });
t('signed out cannot subscribe', r.status, 401);
r = await call('POST', 'subscribe', { cookie: teammate, body: { subscription: { endpoint: 'nope' } } });
t('a bad subscription is a 400', r.status, 400);
r = await call('POST', 'subscribe', { cookie: teammate, body: { subscription: goodSub } });
t('a teammate subscribes', [r.status, Object.keys(g.kv.h['drop:push:someone@gushwork.ai'] || {})], [200, [goodSub.endpoint]]);
await call('POST', 'subscribe', { cookie: teammate, body: { subscription: goodSub } });
t('subscribing twice keeps one device', Object.keys(g.kv.h['drop:push:someone@gushwork.ai']).length, 1);
for (let i = 0; i < 6; i++) await call('POST', 'subscribe', { cookie: teammate, body: { subscription: { ...goodSub, endpoint: 'https://push.example/dev' + i } } });
t('at most 5 devices per person', Object.keys(g.kv.h['drop:push:someone@gushwork.ai']).length, 5);
r = await call('POST', 'unsubscribe', { cookie: teammate, body: { endpoint: 'https://push.example/dev5' } });
t('a device can be removed', [r.status, Object.keys(g.kv.h['drop:push:someone@gushwork.ai']).includes('https://push.example/dev5')], [200, false]);

const sent = [];
_setSender(async (sub, payload) => { if (sub.endpoint.endsWith('dev3')) { const e = new Error('gone'); e.statusCode = 410; throw e; } sent.push([sub.endpoint, payload.title]); });
const reqBody = (extra = {}) => issueBody({ agentId: 'sales-guy', name: 'Sales Guy', does: 'x', props: [], pose: 'standing', notes: '', revisionOf: '', bundle: '', requestedBy: 'someone@gushwork.ai', ...extra });
const ghIssue = (n, labels, state, extra = {}) => ({ number: n, state, html_url: 'u', comments: 1, labels: labels.map((name) => ({ name })), body: reqBody(extra) });
const hookCall = (n, action, { key = 'hookkey', event = 'issues' } = {}) => call('POST', 'hook', { cookie: '', query: { key }, headers: { 'x-github-event': event }, body: { action, issue: { number: n } } });

r = await hookCall(7, 'closed', { key: 'wrong' });
t('the hook refuses a wrong key', r.status, 401);
r = await hookCall(7, 'closed', { event: 'ping' });
t('the hook answers a ping', [r.status, r.body.pong], [200, true]);
g.issues = [ghIssue(7, ['image-ready'], 'closed')];
globalThis.__issue = (n) => g.issues.find((i) => i.number === n);
r = await hookCall(7, 'closed');
t('a finished picture notifies the requester\'s devices (a gone one is dropped)', [r.status, r.body.kind, r.body.sent, sent.map((x) => x[1]).every((x) => x === 'Your picture is ready'), Object.keys(g.kv.h['drop:push:someone@gushwork.ai']).includes('https://push.example/dev3')], [200, 'ready', 3, true, false]);
r = await hookCall(7, 'closed');
t('the same event twice sends once', [r.body.duplicate, sent.length], [true, 3]);
g.issues = [ghIssue(8, ['needs-input'], 'open')];
r = await hookCall(8, 'labeled');
t('a question notifies as a question', [r.body.kind, sent[sent.length - 1][1]], ['needs-input', 'ChatGPT has a question']);
g.issues = [ghIssue(9, ['image-request'], 'open')];
r = await hookCall(9, 'labeled');
t('a plain new request tells nobody', [r.body.ignored, r.body.sent], ['nothing to tell', undefined]);
g.issues = [ghIssue(10, ['image-ready'], 'closed', { requestedBy: '' })];
r = await hookCall(10, 'closed');
t('an issue with no requester tells nobody', r.body.ignored, 'no requester');
g.issues = [ghIssue(11, ['image-ready', 'accepted'], 'closed')];
r = await hookCall(11, 'closed');
t('an accepted picture is not announced again', r.body.ignored, 'nothing to tell');
r = await hookCall(7, 'edited');
t('other issue actions are ignored', r.body.ignored, true);

g = pretend(); g.fail = 403;
r = await call('GET', 'state');
t('a refused token says so, with no detail from GitHub', [r.status, r.body.error], [502, 'GitHub refused the token. Check its permissions on drop-reference.']);

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
