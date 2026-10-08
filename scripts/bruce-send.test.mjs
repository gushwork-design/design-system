import assert from 'node:assert/strict';
import { check, run } from './bruce-send.mjs';

process.env.SLACK_BOT_TOKEN = 'xoxb-test';
const calls = [];
const f = async (url, init) => {
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
console.log('bruce-send: ok');
