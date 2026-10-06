// Bruce the concierge (web/api/_concierge.js) and how the Slack events handler routes to him.
// No network and no model: Slack and Upstash are pretended. Run: node scripts/concierge.test.mjs
import crypto from 'node:crypto';
import { buildCatalog, missingFiles, understand, compose, SITE, ownerMention } from '../web/api/_concierge.js';
import { FAQ, EXAMPLES } from '../web/api/_bruce-faq.js';

process.env.SLACK_SIGNING_SECRET = 'sig-secret';
process.env.SLACK_BOT_TOKEN = 'xoxb-test';
process.env.SLACK_REVIEWER_IDS = 'UOWNER, UOTHER';
process.env.GW_BRUCE_TRIGGER_URL = 'https://trigger.test/fire'; process.env.GW_BRUCE_TRIGGER_TOKEN = 't';
process.env.KV_REST_API_URL = 'https://kv.test'; process.env.KV_REST_API_TOKEN = 'k';
const { default: events } = await import('../web/api/_slack-events.js');

let pass = 0, fail = 0;
const t = (name, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  ok ? pass++ : (fail++, console.log(`✘ ${name}\n  got  ${JSON.stringify(got)}\n  want ${JSON.stringify(want)}`));
};
const ok = (name, cond, detail = '') => (cond ? pass++ : (fail++, console.log(`✘ ${name} ${detail}`)));

/* ---- the catalogue is real ---- */
const catalog = buildCatalog('.');
const missing = missingFiles('.', catalog);
ok('every file Bruce can hand over exists in the repo', missing.length === 0, '\n   ' + missing.join('\n   '));

const ask = (q) => { const u = understand(q, catalog); const r = compose(u, catalog); return { u, r, names: r.files.map((f) => f.path.split('/').pop()) }; };
let a;
a = ask('can you send the white logo as svg');       t('white logo svg', a.names, ['gushwork-logo-white.svg']);
a = ask('@Bruce logo please');                       t('plain logo: original svg + png, with a hint', [a.names, a.r.text.includes('white')], [['gushwork-logo-original.svg', 'gushwork-logo-original-2000.png'], true]);
a = ask('dark symbol png');                          t('dark symbol does not exist: says so, sends the original', [a.names, a.r.text.includes('no dark symbol')], [['gushwork-symbol-original-2000.png'], true]);
a = ask('all logos');                                ok('all logos: five treatments, capped', a.r.files.length >= 5 && a.r.files.length <= 6, JSON.stringify(a.names));
a = ask('where is the colour sheet?');               t('colour sheet: both PDFs', a.names, ['gushwork-colors.pdf', 'gushwork-colors-1page.pdf']);
a = ask('brand colors swatches for illustrator');    ok('swatches for Adobe', a.names.includes('gushwork-colors.ase'), JSON.stringify(a.names));
a = ask('fonts');                                    t('fonts: four files', a.names.length, 4);
a = ask('what is the heading typeface');             t('heading typeface: Vert Grotesk only', a.names, ['Vert_Grotesk_Display_VF.ttf']);
a = ask('tailwind theme');                           t('tailwind: one file', a.names, ['tailwind-theme.js']);
a = ask('design tokens json');                       t('tokens json', a.names, ['tokens.json']);
a = ask('case study template');                      ok('case study: the prompt in a code block', a.r.text.includes('Use the Gushwork case-study') && a.r.text.includes('```'));
a = ask('do we have a lead magnet template?');       ok('lead magnet template', a.r.text.includes('lead-magnet'));
a = ask('templates');                                ok('templates: live ones listed, slides not ready, no slide prompt', a.r.text.includes('Case study page') && a.r.text.includes('isn’t ready yet') && !a.r.text.includes('Use the Gushwork slide-deck'));
a = ask('slide deck');                               ok('slides: not ready, no prompt', a.r.text.includes('isn’t ready yet') && !a.r.text.includes('```'));
a = ask('email signature');                          ok('email signature tool', a.u.parts[0]?.type === 'tools' && a.r.text.includes('Email signature creator'));
a = ask('id card generator');                        ok('ID card tool', a.u.parts[0]?.type === 'tools' && a.r.text.includes('ID card'));
a = ask('make me a landing page for our new product'); ok('a design request is declined plainly and pointed at templates, no files', a.u.designRequest && /isn’t something I do|don’t design/.test(a.r.text) && a.r.text.includes('Ad landing page') && a.r.files.length === 0);
a = ask('generate an email signature for me');       ok('"generate an email signature" is the tool, not a refusal', !a.u.designRequest && a.u.parts[0]?.type === 'tools');
a = ask('how do I install the claude plugin');       ok('plugin question → plugin page', a.r.text.includes('claude-plugin'));
a = ask('logo and color sheet');                     ok('two things at once', a.names.some((n) => n.endsWith('.pdf')) && a.names.some((n) => n.endsWith('.svg')), JSON.stringify(a.names));
a = ask('hello');                                    ok('hello → a greeting, not the help text', a.u.greeting && !a.r.text.includes('brand files') && a.r.text.length < 120, a.r.text);
a = ask('thanks!');                                  ok('thanks → a short reply', a.u.thanks && a.r.text.length < 30, a.r.text);
a = ask('blah blah something else entirely');        ok('unknown → says it did not catch it, then the help, no files', a.r.text.includes('brand files') && a.r.files.length === 0);
a = ask('');                                         ok('empty → help', a.r.text.includes('brand files'));

/* ---- the voice: no exclamation marks, no emoji, in anything Bruce writes himself ---- */
for (const q of ['hey', 'thanks', 'white logo', 'logo and colour sheet', 'fonts', 'tokens', 'templates', 'slide deck', 'email signature', 'make me a poster', 'zzz', 'help']) {
  const txt = ask(q).r.text;
  ok(`voice: "${q}" has no exclamation mark and no emoji`, !/!/.test(txt) && !/\p{Extended_Pictographic}/u.test(txt), txt);
}
for (let i = 0; i < 12; i++) { const txt = compose(understand('white logo', catalog), catalog, String(i)).text; if (/!|\p{Extended_Pictographic}/u.test(txt)) ok('voice across seeds', false, txt); }
ok('the wording varies between messages', new Set(Array.from({ length: 12 }, (_, i) => compose(understand('white logo', catalog), catalog, String(i)).text.split('\n')[0])).size > 1);
ok('the same message always gets the same words', compose(understand('white logo', catalog), catalog, '55.5').text === compose(understand('white logo', catalog), catalog, '55.5').text);

/* ---- the basic answers about the site ---- */
const KNOWN_PATHS = new Set(['/', '/style-guide', '/style-guide#logo', '/downloads', '/internal/claude-plugin', '/internal/tools', '/internal/templates', '/internal/changelog', '/internal/staging']);
ok('every answer has example questions', FAQ.every((f) => (EXAMPLES[f.id] || []).length >= 2));
for (const f of FAQ) {
  for (const q of EXAMPLES[f.id] || []) {
    const u = understand(q, catalog);
    const got = u.parts[0] && u.parts[0].type === 'faq' ? u.parts[0].faq.id : u.parts[0]?.type || 'none';
    if (got !== f.id) ok(`"${q}" gets the ${f.id} answer`, false, `got ${got}`);
    else pass++;
  }
  const text = f.answer((path, label) => `<${SITE}${path}|${label}>`).join('\n');
  ok(`${f.id}: no exclamation mark or emoji`, !/!/.test(text) && !/\p{Extended_Pictographic}/u.test(text), text);
  ok(`${f.id}: not one of the old facts we removed`, !/design@gushwork\.ai/.test(text));
  const paths = [...text.matchAll(/<https?:\/\/design\.gushwork\.ai([^|>]*)\|/g)].map((m) => m[1]);
  ok(`${f.id}: every link goes to a page that exists`, paths.every((p) => KNOWN_PATHS.has(p)), JSON.stringify(paths));
}
a = ask('how do I sign up');                         ok('"how do I sign up" is about signing in, not the sign-up ad page', a.u.parts[0]?.faq?.id === 'signin');
a = ask('sign-up ad page template');                 ok('"sign-up ad page template" is still the template', a.u.parts[0]?.type === 'templates');
a = ask('how do I use claude to build a page');      ok('"how do I use it to build" is an answer, not a design request', !a.u.designRequest);
a = ask('white logo');                               ok('asking for a file is still a file', a.u.parts[0]?.type === 'assets' && a.r.files.length > 0);

/* ---- who Bruce is, and what the hub is not ---- */
const who = FAQ.find((f) => f.id === 'bruce').answer(() => '').join(' ');
ok('Bruce says he is the design agent for Gushwork', who.includes('I’m Bruce, the design agent for Gushwork'), who);
ok('Bruce says he does not design YET, and that Utsav built him', who.includes('I don’t design things myself yet') && who.includes('Utsav built me'), who);
a = ask('who are you');                              ok('"who are you" gets that answer', a.u.parts[0]?.faq?.id === 'bruce');
const about = FAQ.find((f) => f.id === 'about').answer(() => '').join(' ');
ok('the hub answer says it is a subdomain and not the Gushwork website, which is gushwork.ai', about.includes('subdomain') && about.includes('not the Gushwork website') && about.includes('gushwork.ai'), about);
a = ask('is this the gushwork website');             ok('"is this the gushwork website" points to gushwork.ai', a.u.parts[0]?.faq?.id === 'homepage' && a.r.text.includes('https://gushwork.ai'), a.r.text);
a = ask('where is the gushwork homepage');           ok('"where is the homepage" points to gushwork.ai', a.u.parts[0]?.faq?.id === 'homepage');
a = ask('what is the design hub');                   ok('"what is the design hub" is still the hub answer', a.u.parts[0]?.faq?.id === 'about');
a = ask('make me a poster');                         ok('a design request says “yet”', /yet/.test(a.r.text), a.r.text);

/* ---- the creator answer explains the hub to someone who has never heard of it ---- */
a = ask('who made you');
ok('the creator answer: names Utsav, says what the hub is, what he approves, who to ask', a.r.text.startsWith('Utsav is my creator, and he built me.') && !/design owner/i.test(a.r.text) && a.r.text.includes('design hub (design.gushwork.ai)') && a.r.text.includes('Claude plugin') && a.r.text.includes('the person to ask'), a.r.text);
process.env.OWNER_SLACK_ID = 'U0ABC12345';
ok('with his Slack ID set, he is a real mention', ownerMention() === '<@U0ABC12345>' && compose(understand('who made you', catalog), catalog, '1.1').text.startsWith('<@U0ABC12345> is my creator, and he built me.'));
process.env.OWNER_SLACK_ID = 'not-an-id';
ok('a bad ID falls back to his name', ownerMention() === 'Utsav');
delete process.env.OWNER_SLACK_ID;

/* ---- pretend Slack and Upstash ---- */
const calls = [];
const seen = new Set();
let failMethod = '';
globalThis.fetch = async (url, init = {}) => {
  const u = String(url);
  const send = (code, body) => ({ ok: code < 300, status: code, json: async () => body, text: async () => JSON.stringify(body) });
  if (u.startsWith('https://kv.test')) {
    const out = JSON.parse(init.body).map(([op, key]) => {
      if (op === 'SET') { if (seen.has(key)) return { result: null }; seen.add(key); return { result: 'OK' }; }
      return { result: null };
    });
    return send(200, out);
  }
  if (u.startsWith('https://slack.com/api/')) {
    const method = u.split('/api/')[1];
    const body = String(init.headers['content-type']).includes('json') ? JSON.parse(init.body) : Object.fromEntries(new URLSearchParams(init.body));
    calls.push({ method, body });
    if (failMethod === method) return send(200, { ok: false, error: 'boom' });
    if (method === 'files.getUploadURLExternal') return send(200, { ok: true, upload_url: 'https://files.slack.test/up/' + body.filename, file_id: 'F-' + body.filename });
    return send(200, { ok: true });
  }
  if (u.startsWith('https://trigger.test/')) { calls.push({ method: 'FIRE', body: JSON.parse(init.body) }); return send(200, { ok: true }); }
  if (u.startsWith('https://files.slack.test/')) { calls.push({ method: 'PUT', body: { bytes: init.body.length, to: u.split('/').pop() } }); return send(200, {}); }
  throw new Error('unexpected fetch ' + u);
};

/* ---- the events handler, signed the way Slack signs ---- */
function post(payload, { retry = false, badSig = false } = {}) {
  const raw = JSON.stringify(payload);
  const ts = String(Math.floor(Date.now() / 1000));
  const sig = 'v0=' + crypto.createHmac('sha256', badSig ? 'wrong' : 'sig-secret').update(`v0:${ts}:${raw}`).digest('hex');
  const req = { method: 'POST', body: raw, headers: { 'x-slack-signature': sig, 'x-slack-request-timestamp': ts, ...(retry ? { 'x-slack-retry-num': '1' } : {}) } };
  return new Promise((resolve) => {
    const res = { status(c) { this.code = c; return this; }, json(b) { resolve({ code: this.code, body: b }); }, end() { resolve({ code: this.code }); } };
    events(req, res);
  });
}
const mention = (text, extra = {}) => ({ type: 'event_callback', event_id: 'Ev' + Math.random(), event: { type: 'app_mention', user: 'UASKER', channel: 'C1', ts: '100.1', text: `<@UBRUCE> ${text}`, ...extra } });
const dm = (text, user = 'UASKER', extra = {}) => ({ type: 'event_callback', event_id: 'Ev' + Math.random(), event: { type: 'message', channel_type: 'im', user, channel: 'D1', ts: '200.2', text, ...extra } });

calls.length = 0;
let r = await post(mention('white logo svg'));
t('an @Bruce in a channel is answered in its thread: one message, then the file shared into the same thread',
  [r.code, calls.map((c) => c.method), calls[0].body.thread_ts, calls.at(-1).body.thread_ts, calls.at(-1).body.channel_id], [200, ['chat.postMessage', 'files.getUploadURLExternal', 'PUT', 'files.completeUploadExternal'], '100.1', '100.1', 'C1']);
ok('the real file bytes are sent', calls.find((c) => c.method === 'PUT').body.bytes > 100);

calls.length = 0;
r = await post(dm('fonts'));
t('a DM question gets the answer with no thread, and all four fonts in one share', [calls[0].body.thread_ts, calls.filter((c) => c.method === 'PUT').length, JSON.parse(calls.at(-1).body.files).length], [undefined, 4, 4]);

calls.length = 0;
r = await post(dm('do the second one please', 'UOWNER'));
const routing = function () { return calls.map((c) => c.method).filter((m) => m.indexOf('users.info') !== 0); };   /* the log's name lookup is not routing */
t('end to end: a DM that is not a file ask starts Bruce, no reaction and is logged (open to everyone since 5 Oct 2026)', [r.body.concierge, routing(), calls.some((c) => c.method.indexOf('users.info') === 0)], ['bruce', ['FIRE'], true]);

/* ---- Bruce for Utsav: his DMs start the routine; nobody else's do ---- */
{
  const { handleMessage, forBruce } = await import('../web/api/_concierge.js');
  const fired = [];
  const fire = async (ev) => { fired.push(ev.text); return { fired: true }; };
  const ev = (text, user = 'UUTSAV', extra = {}) => ({ type: 'message', channel_type: 'im', user, channel: 'D9', ts: '300.3', text, ...extra });
  const deps = { token: 'xoxb-test', root: '.', owners: new Set(['UUTSAV']), bruceUsers: new Set(['UUTSAV']), fire };
  calls.length = 0;
  let o = await handleMessage(ev('why did the publish fail last night?'), deps);
  t('Utsav asking a real question: no reaction, the routine starts, no canned reply', [o.did, calls.map((c) => c.method), fired.length], ['bruce', [], 1]);
  calls.length = 0;
  o = await handleMessage(ev('send me the white logo svg'), deps);
  t('Utsav asking for a file still gets it instantly from the concierge', [o.did, fired.length], ['answered', 1]);
  calls.length = 0;
  o = await handleMessage(ev('make me a banner for the launch'), deps);
  t('a design request from Utsav goes to the routine', [o.did, fired.length], ['bruce', 2]);
  calls.length = 0;
  o = await handleMessage(ev('why did the publish fail?', 'USOMEONE'), deps);
  t('a teammate asking the same thing never starts a run', [o.did === 'bruce', fired.length], [false, 2]);
  calls.length = 0;
  o = await handleMessage(ev('check the routines', 'UUTSAV'), { ...deps, fire: async () => ({ fired: false, why: 'not set' }) });
  t('no trigger configured: Bruce says so in the thread', [o.did, calls.at(-1).method, calls.at(-1).body.thread_ts], ['bruce-failed', 'chat.postMessage', '300.3']);
  ok('greetings stay with the concierge', forBruce(understand('hi', catalog)) === false);
  // The agent pane (6 Oct 2026): a session is a thread in the DM; a status line replaces the reaction, and the run is told.
  {
    const { contextOf } = await import('../web/api/_concierge.js');
    fired.length = 0; calls.length = 0;
    const pane = ev('build me a banner', 'UUTSAV', { thread_ts: '700.7', ts: '700.7', app_context: { entities: [{ type: 'slack#/types/channel_id', value: 'C07C4DELAGZ' }] } });
    const paneDeps = { ...deps, agent: true, findPing: async () => null };   /* a threaded message is first checked against Alfred's pings; not one here */
    o = await handleMessage(pane, { ...paneDeps, fire: async (e, _a, _b, extra) => { fired.push(extra); return { fired: true }; } });
    t('a pane message sets the status to processing and tells the run it is an agent session', [o.did, calls.map((c) => c.method), calls[0].body.status, calls[0].body.thread_ts, fired[0].agent], ['bruce', ['agents.sessions.setStatus'], 'processing', '700.7', true]);
    ok('the channel the person was looking at rides along', contextOf(pane) === 'channel_id C07C4DELAGZ');
    calls.length = 0;
    o = await handleMessage(ev('build me a banner', 'UUTSAV', { ts: '701.1' }), { ...deps, agent: true, fire: async () => ({ fired: true }) });
    t('a plain top-level DM is not a pane session: no status call', [o.did, calls.length], ['bruce', 0]);
    calls.length = 0;
    o = await handleMessage(pane, { ...paneDeps, fire: async () => ({ fired: false, why: 'not set' }) });
    t('a failed start clears the status again', calls.map((c) => c.method + ':' + (c.body.status || '')), ['agents.sessions.setStatus:processing', 'chat.postMessage:', 'agents.sessions.setStatus:active']);
  }
  // Open to everyone, with a daily cap for everyone but the owner, and memory handed to the run.
  const logged = [];
  const runs = {}; const mem = { logRun: async (r) => { logged.push(r); return true; }, slackName: async (t, u) => 'Name of ' + u,
    takeRun: async (u, { uncapped }) => { runs[u] = (runs[u] || 0) + 1; return uncapped ? { allowed: true, used: 0, cap: 3 } : { allowed: runs[u] <= 2, used: runs[u], cap: 2 }; },
    readNotes: async (u) => (u === 'UUTSAV' ? ['2026-10-05: prefers the original logo colour'] : []), mintToken: (u) => `tok-${u}` };
  const open = { ...deps, bruceUsers: new Set(), ownerId: 'UUTSAV', memory: mem, fire: async (ev, e, f, extra) => { fired.push({ u: ev.user, ...extra }); return { fired: true }; } };
  fired.length = 0; calls.length = 0;
  o = await handleMessage(ev('can you check the publish?', 'UTEAM'), open);
  t('with no list set, a teammate gets Bruce', [o.did, fired[0].owner, fired[0].memoryToken], ['bruce', false, 'tok-UTEAM']);
  await handleMessage(ev('and again?', 'UTEAM'), open);
  calls.length = 0;
  o = await handleMessage(ev('third one', 'UTEAM'), open);
  t('past the cap the concierge answers and says why', [o.did, calls.map((c) => c.method), calls[0].body.text.startsWith('You’ve used today’s 2 Bruce runs')], ['capped', ['chat.postMessage'], true]);
  fired.length = 0;
  for (let i = 0; i < 4; i++) await handleMessage(ev('check ' + i, 'UUTSAV'), open);
  t('the owner is never capped, and his notes ride along', [fired.length, fired[0].owner, fired[0].notes], [4, true, ['2026-10-05: prefers the original logo colour']]);
  t('every turn is logged: runs, the capped ask, with names and roles', [logged.length, logged[0].kind, logged[0].name, logged[0].role, logged[2].kind, logged[3].role, logged[3].kind],
    [7, 'run', 'Name of UTEAM', 'teammate', 'capped', 'owner', 'run']);
  // A reply under an Alfred ping goes to Alfred; any other thread reply goes to Bruce.
  const sent = [];
  const pingDeps = { ...deps, findPing: async (tok, ch, ts) => (ts === '400.4' ? { issue: 7, scope: 'web', key: 'timeline' } : null), toAlfred: async (p, text) => { sent.push([p.issue, text]); return { ok: true, fired: true }; } };
  calls.length = 0;
  o = await handleMessage(ev('make the blue darker', 'UUTSAV', { thread_ts: '400.4', ts: '401.1' }), pingDeps);
  t('a reply under an Alfred ping goes to his thread, ticked, said in words', [o.did, sent, calls.map((c) => c.method), calls.at(-1).body.thread_ts], ['to-alfred', [[7, 'make the blue darker']], ['reactions.add', 'chat.postMessage'], '400.4']);
  calls.length = 0;
  o = await handleMessage(ev('and the other one?', 'UUTSAV', { thread_ts: '500.5', ts: '501.1' }), pingDeps);
  t('a reply in any other thread is for Bruce', [o.did, sent.length], ['bruce', 1]);
  calls.length = 0;
  o = await handleMessage(ev('the logo should be in original color', 'UUTSAV', { thread_ts: '500.5', ts: '502.1' }), pingDeps);
  t('a follow-up in a Bruce thread that names a logo still goes to Bruce, not the file concierge', [o.did, calls.map((c) => c.method)], ['bruce', []]);
  calls.length = 0;
  o = await handleMessage(ev('do it', 'UUTSAV', { thread_ts: '400.4', ts: '402.1' }), { ...pingDeps, toAlfred: async () => ({ ok: false, why: 'the site has no GitHub token' }) });
  t('if it cannot reach Alfred it says so', [o.did, calls.at(-1).body.text.includes('no GitHub token')], ['to-alfred-failed', true]);
}

calls.length = 0;
r = await post(dm('hi', 'UOWNER'));
t('a reviewer saying hi gets a greeting, not a tick', [r.body.concierge, calls.map((c) => c.method)], ['answered', ['chat.postMessage']]);
calls.length = 0;
r = await post(dm('thanks', 'UOWNER'));
t('a reviewer saying thanks gets a reply, not a tick', [r.body.concierge, calls.map((c) => c.method)], ['answered', ['chat.postMessage']]);

calls.length = 0;
r = await post(dm('do the second one please', 'UASKER'));
t('the same words from a teammate also start Bruce, as a teammate', [r.body.concierge, routing().at(-1), calls.find((c) => c.method === 'FIRE').body.text.includes('role: teammate')], ['bruce', 'FIRE', true]);
calls.length = 0;
r = await post(dm('what can you do', 'UASKER'));
t('"what can you do" stays with the concierge, so a help question never spends a run', [r.body.concierge, routing()[0], (calls.find((c) => c.method === 'chat.postMessage') || { body: {} }).body.text.includes('brand files')], ['answered', 'chat.postMessage', true]);

calls.length = 0;
r = await post(dm('logo', 'UOWNER'));
t('a reviewer asking for a logo still gets one', [r.body.concierge, calls.some((c) => c.method === 'files.completeUploadExternal')], ['answered', true]);

calls.length = 0;
r = await post(dm('logo', 'UASKER', { bot_id: 'B1' }));
t('a bot message is ignored (no loops)', [r.body.concierge, calls.length], ['ignored', 0]);
r = await post(dm('logo', 'UASKER', { subtype: 'message_changed' }));
t('an edited-message event is ignored', [r.body.concierge, calls.length], ['ignored', 0]);

calls.length = 0;
r = await post(mention('logo'), { retry: true });
t('a Slack retry is acknowledged and dropped', [r.code, r.body.ignored, calls.length], [200, 'retry', 0]);

calls.length = 0;
const same = mention('logo');
await post(same); const first = calls.length; await post(same);
t('the same event id is answered once', [first > 0, calls.length === first], [true, true]);

r = await post(mention('logo'), { badSig: true });
t('a bad signature is refused', r.code, 401);

calls.length = 0;
failMethod = 'chat.postMessage';
r = await post(mention('logo'));
t('a Slack error is answered 200 with the error, so Slack does not retry', [r.code, r.body.concierge], [200, 'error']);
failMethod = '';

calls.length = 0;
calls.length = 0;
r = await post({ type: 'event_callback', event_id: 'EvH1', event: { type: 'app_home_opened', user: 'UASKER', channel: 'D77', tab: 'messages' } });
t('opening the agent pane sets the suggested prompts', [r.code, r.body.prompts, calls[0].method, calls[0].body.channel_id, calls[0].body.prompts.length], [200, 'set', 'assistant.threads.setSuggestedPrompts', 'D77', 4]);
calls.length = 0;
r = await post({ type: 'event_callback', event_id: 'EvH2', event: { type: 'app_home_opened', user: 'UASKER', channel: 'D77', tab: 'home' } });
t('the Home tab is not the pane', [r.body.ignored, calls.length], ['not the agent pane', 0]);
r = await post({ type: 'event_callback', event_id: 'EvS1', event: { type: 'agent_session_stopped', channel: 'D77' } });
t('a stop press is acknowledged and dropped', [r.code, r.body.ignored], [200, 'agent_session_stopped']);
r = await post({ type: 'event_callback', event_id: 'Ev9', event: { type: 'reaction_added', reaction: 'white_check_mark', user: 'UOWNER', item: { ts: '1.1' } } });
t('the ✅ review loop still takes its own path', [r.code, calls.length], [200, 0]);

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
