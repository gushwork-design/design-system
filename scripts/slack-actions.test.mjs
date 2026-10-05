// Bruce's Slack buttons (web/api/_slack-actions.js), the pings that carry them (scripts/bruce-pings.mjs) and the morning
// note (scripts/bruce-morning.mjs). No network. Run: node scripts/slack-actions.test.mjs
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
const A = await import('../web/api/_slack-actions.js');
const P = await import('./bruce-pings.mjs');
const M = await import('./bruce-morning.mjs');
let pass = 0, fail = 0;
const ok = (n, c, d = '') => (c ? pass++ : (fail++, console.log(`✘ ${n} ${d}`)));

/* ---- the ping's blocks ---- */
const fixed = { id: 1, scope: 'web', key: 'timeline', blocked: false, line: 'Made the hover blue in #255.', issue: 7 };
const stuck = { id: 2, scope: 'dashboard', key: 'multi-select', blocked: true, line: 'Top right or inline?', issue: 8 };
let b = P.blocksFor([fixed]);
ok('one finished item: its line, then Approve / Rework / Reject / Open', b.length === 2 && b[1].block_id === 'act:web/timeline' && b[1].elements.map((e) => e.action_id).join() === 'gw_pass,gw_rework,gw_reject,gw_open', JSON.stringify(b));
b = P.blocksFor([stuck]);
ok('one stuck item: no decision buttons, just the link', b.length === 1 && b[0].text.text.includes('Answer him'));
b = P.blocksFor([fixed, stuck]);
ok('a batch: lead, then one row per item; menus only on finished ones', b.length === 3 && b[1].block_id === 'item:dashboard/multi-select' && !b[1].accessory && b[2].accessory.action_id === 'gw_menu', JSON.stringify(b));

/* ---- after a decision ---- */
const after = A.markDone(P.blocksFor([fixed]), 'web', 'timeline', 'pass');
ok('a pressed button gives way to a line saying what was done', after[1].type === 'context' && after[1].elements[0].text === 'Approved from Slack.');
const afterMenu = A.markDone(P.blocksFor([fixed, stuck]), 'web', 'timeline', 'rework');
ok('in a batch only that row changes', !afterMenu[2].accessory && afterMenu[2].text.text.includes('Sent back from Slack') && afterMenu[1].block_id === 'item:dashboard/multi-select');

/* ---- live fingerprints ---- */
const root = mkdtempSync(join(tmpdir(), 'gw-'));
mkdirSync(join(root, 'library'));
writeFileSync(join(root, 'library/data.json'), JSON.stringify({ items: [{ scope: 'web', key: 'timeline', fp: 'abcdef0123456789', pfp: '0123456789abcdef', state: 'redone' }] }));
ok('fingerprints are read from the deployed library', JSON.stringify(A.liveFingerprints('web', 'timeline', root)) === JSON.stringify({ fp: 'abcdef0123456789', pfp: '0123456789abcdef' }));
ok('an unknown item has none', A.liveFingerprints('web', 'nope', root) === null);

/* ---- handleAction ---- */
const calls = [];
globalThis.fetch = async (url, init = {}) => {
  const method = String(url).split('/api/')[1];
  const body = String(init.headers['content-type']).includes('json') ? JSON.parse(init.body) : Object.fromEntries(new URLSearchParams(init.body));
  calls.push({ method, body });
  if (method === 'conversations.history') return { ok: true, json: async () => ({ ok: true, messages: [{ blocks: P.blocksFor([fixed]) }] }) };
  return { ok: true, json: async () => ({ ok: true }) };
};
const recorded = [];
const deps = { token: 'xoxb', allowed: new Set(['UUTSAV']), email: 'utsav.singh@gushwork.ai', root, record: async (body, who) => { recorded.push([body, who]); return [200, { ok: true }]; } };
const press = (action_id, a, user = 'UUTSAV') => ({ type: 'block_actions', user: { id: user }, trigger_id: 'T1', channel: { id: 'D1' }, message: { ts: '9.9', blocks: P.blocksFor([fixed]) },
  actions: [{ action_id, value: JSON.stringify({ a, s: 'web', k: 'timeline' }) }] });

await A.handleAction(press('gw_pass', 'pass'), deps);
ok('Approve records a pass with the live fingerprints, as Utsav', recorded.length === 1 && recorded[0][0].action === 'pass' && recorded[0][0].fp === 'abcdef0123456789' && recorded[0][1] === 'utsav.singh@gushwork.ai', JSON.stringify(recorded));
ok('…and the message updates in place', calls.at(-1).method === 'chat.update' && calls.at(-1).body.ts === '9.9');

calls.length = 0;
await A.handleAction(press('gw_rework', 'rework'), deps);
ok('Rework opens the note form, records nothing yet', calls[0].method === 'views.open' && calls[0].body.view.callback_id === 'gw_note' && recorded.length === 1);
const meta = calls[0].body.view.private_metadata;

calls.length = 0;
let r = await A.handleAction({ type: 'view_submission', user: { id: 'UUTSAV' }, view: { callback_id: 'gw_note', private_metadata: meta, state: { values: { note: { v: { value: '' } } } } } }, deps);
ok('an empty note is refused in the form', r && r.response_action === 'errors' && recorded.length === 1);
r = await A.handleAction({ type: 'view_submission', user: { id: 'UUTSAV' }, view: { callback_id: 'gw_note', private_metadata: meta, state: { values: { note: { v: { value: 'darker blue' } } } } } }, deps);
ok('a note submits the rework, and the ping updates', r === undefined && recorded.at(-1)[0].action === 'rework' && recorded.at(-1)[0].note === 'darker blue' && calls.some((c) => c.method === 'chat.update'), JSON.stringify(recorded.at(-1)));

calls.length = 0;
await A.handleAction(press('gw_pass', 'pass', 'USOMEONE'), deps);
ok('anyone else pressing does nothing', recorded.length === 2 && calls.length === 0);

calls.length = 0;
await A.handleAction(press('gw_pass', 'pass'), { ...deps, record: async () => [502, { error: 'GitHub said no.' }] });
ok('a failed save says so in the thread', calls.at(-1).method === 'chat.postMessage' && calls.at(-1).body.text.includes('GitHub said no.'));

/* ---- the morning note ---- */
const it = (state) => ({ scope: 'web', key: 'x', state });
ok('nothing waiting, nothing stuck, publish fine: silent', M.compose({ items: [it('passed')], blocked: [], publish: { conclusion: 'success' } }) === '');
let t = M.compose({ items: [it('redone'), it('pending'), it('passed')], blocked: [{ scope: 'dashboard', key: 'modal' }], publish: { conclusion: 'failure', html_url: 'https://gh/run' } });
ok('waiting, stuck and a failed publish, one line each', t.split('\n').length === 4 && t.includes('2 items are waiting on you, 1 of them fixed by Alfred') && t.includes('stuck on *modal*') && t.includes('last publish failed'), t);

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
