// Bruce the concierge (web/api/_concierge.js) and how the Slack events handler routes to him.
// No network and no model: Slack and Upstash are pretended. Run: node scripts/concierge.test.mjs
import crypto from 'node:crypto';
import { buildCatalog, missingFiles, understand, compose } from '../web/api/_concierge.js';

process.env.SLACK_SIGNING_SECRET = 'sig-secret';
process.env.SLACK_BOT_TOKEN = 'xoxb-test';
process.env.SLACK_REVIEWER_IDS = 'UOWNER, UOTHER';
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
t('a reviewer\'s DM that is not a question is ticked AND answered in words, so the tick is never a mystery', [r.body.concierge, calls.map((c) => c.method), calls[1].body.text.includes('9pm')], ['ticked', ['reactions.add', 'chat.postMessage'], true]);

calls.length = 0;
r = await post(dm('hi', 'UOWNER'));
t('a reviewer saying hi gets a greeting, not a tick', [r.body.concierge, calls.map((c) => c.method)], ['answered', ['chat.postMessage']]);
calls.length = 0;
r = await post(dm('thanks', 'UOWNER'));
t('a reviewer saying thanks gets a reply, not a tick', [r.body.concierge, calls.map((c) => c.method)], ['answered', ['chat.postMessage']]);

calls.length = 0;
r = await post(dm('do the second one please', 'UASKER'));
t('the same words from anyone else get the help text', [r.body.concierge, calls[0].method, calls[0].body.text.includes('brand files')], ['answered', 'chat.postMessage', true]);

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
r = await post({ type: 'event_callback', event_id: 'Ev9', event: { type: 'reaction_added', reaction: 'white_check_mark', user: 'UOWNER', item: { ts: '1.1' } } });
t('the ✅ review loop still takes its own path', [r.code, calls.length], [200, 0]);

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
