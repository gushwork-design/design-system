import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { check, run, sign } from './bruce-send.mjs';

process.env.SLACK_BOT_TOKEN = 'xoxb-test';
const calls = [], hub = [];
let hubAnswer = { sent: 1 };
const f = async (url, init) => {
  if (url.includes('/api/bruce-memory')) { hub.push({ url, headers: init.headers, body: JSON.parse(init.body) }); return { ok: !!hubAnswer, status: hubAnswer ? 200 : 502, json: async () => hubAnswer || {} }; }
  const method = url.split('/api/')[1];
  calls.push({ method, body: JSON.parse(init.body) });
  const out = method === 'conversations.open' ? { ok: true, channel: { id: 'D1' } } : { ok: true, ts: '1.2' };
  return { ok: true, status: 200, json: async () => out };
};

assert.deepEqual(check({ to: ' U06KMA1BQV8 ', text: ' hi ' }), { to: 'U06KMA1BQV8', text: 'hi' });
for (const to of ['swapnil', '#general', 'C06KMA1BQV8', '', undefined]) assert.throws(() => check({ to, text: 'hi' }), /TO must be/, `rejects ${to}`);
assert.throws(() => check({ to: 'U06KMA1BQV8', text: '  ' }), /empty/);
assert.throws(() => check({ to: 'U06KMA1BQV8', text: 'x'.repeat(3001) }), /3000/);

let r = await run({ to: 'U06KMA1BQV8', text: 'hi', dry: true, f });
assert.equal(r.sent, false); assert.equal(calls.length, 0, 'dry run posts nothing');

r = await run({ to: 'U06KMA1BQV8', text: 'hi', f });
assert.equal(r.sent, true);
assert.deepEqual(calls.map((c) => c.method), ['conversations.open', 'chat.postMessage']);
assert.equal(calls[0].body.users, 'U06KMA1BQV8');
assert.equal(calls[1].body.channel, 'D1');
assert.equal(calls[1].body.unfurl_links, false);

// the hub's record: a send reports itself, signed, and a failed report is said out loud but does not undo the send
assert.equal(r.logged, true, 'the send was recorded');
assert.equal(hub.length, 1);
assert.equal(hub[0].body.sent[0].to, 'U06KMA1BQV8'); assert.equal(hub[0].body.sent[0].text, 'hi');
const ts = hub[0].headers['x-bruce-send-ts'];
assert.equal(hub[0].headers['x-bruce-send-sig'], crypto.createHmac('sha256', 'xoxb-test').update(`${ts}.U06KMA1BQV8.hi`).digest('hex'), 'signed over time, recipient and text');
assert.equal(sign('xoxb-test', ts, 'U06KMA1BQV8', 'hi'), hub[0].headers['x-bruce-send-sig']);
assert.ok(!JSON.stringify(hub[0]).includes('xoxb-test'), 'the token itself never travels');
hubAnswer = null; calls.length = 0;
r = await run({ to: 'U06KMA1BQV8', text: 'hi again', f });
assert.equal(r.sent, true); assert.equal(r.logged, false, 'a failed report is flagged, the send stands');
hubAnswer = { sent: 1 }; calls.length = 0; hub.length = 0;
r = await run({ to: 'U06KMA1BQV8', text: 'old message', logOnly: true, f });
assert.equal(r.sent, false); assert.equal(r.logged, true); assert.equal(calls.length, 0, 'log-only sends nothing to Slack'); assert.equal(hub.length, 1);
console.log('bruce-send: ok');
