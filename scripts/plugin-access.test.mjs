/* Tests for the plugin access gate's hub side (web/api/_plugin-access.js): the pure pieces. No network, no store.
   Run: node scripts/plugin-access.test.mjs */
process.env.GW_PLUGIN_GATE_SINCE = '2026-10-10T00:00:00.000Z';
const M = await import('../web/api/_plugin-access.js');
let pass = 0, fail = 0;
const t = (name, got, want) => { const ok = JSON.stringify(got) === JSON.stringify(want); if (ok) pass++; else { fail++; console.log('FAIL', name, '\n  got ', JSON.stringify(got), '\n  want', JSON.stringify(want)); } };

t('normEmail lowercases and trims', M.normEmail('  Sam@Gmail.com '), 'sam@gmail.com');
t('normEmail refuses junk', M.normEmail('not an email'), null);
t('onDomain', [M.onDomain('a@gushwork.ai', 'gushwork.ai'), M.onDomain('a@gmail.com', 'gushwork.ai')], [true, false]);

const since = Date.parse('2026-10-10T00:00:00.000Z');
const now = Date.parse('2026-10-12T12:00:00.000Z');
const rows = [
  { at: '2026-10-11T09:00:00Z', email: 'new@gmail.com', version: '2.1.2', event: 'session-start' },
  { at: '2026-10-11T09:01:00Z', email: 'new@gmail.com', version: '2.1.2', event: 'skill', skill: 'gushwork-web' },
  { at: '2026-10-01T09:00:00Z', email: 'old@gmail.com', version: '1.58.0', event: 'session-start' },
  { at: '2026-10-11T09:00:00Z', email: 'old@gmail.com', version: '2.1.1', event: 'session-start' },
  { at: '2026-10-11T09:00:00Z', email: 'team@gushwork.ai', version: '2.1.2', event: 'session-start' },
  { at: '2026-10-11T09:00:00Z', email: 'asked@gmail.com', version: '2.1.2', event: 'session-start' },
  { at: '2026-05-01T09:00:00Z', email: 'stale@gmail.com', version: '1.20.0', event: 'session-start' },
  { at: '2026-10-11T09:00:00Z', email: '', version: '2.1.2', event: 'session-start' },
  'not json',
];
const seen = M.seenNotAsked([{ email: 'asked@gmail.com', state: 'pending' }], rows, 'gushwork.ai', since, now);
t('outside addresses with no record, newest last-seen first', seen.map((u) => u.email), ['new@gmail.com', 'old@gmail.com']);
t('a company address is not listed', seen.some((u) => u.email === 'team@gushwork.ai'), false);
t('an address with a record is not listed twice', seen.some((u) => u.email === 'asked@gmail.com'), false);
t('one not seen for 90 days drops off', seen.some((u) => u.email === 'stale@gmail.com'), false);
t('sessions count only session starts; version is the latest seen', [seen[0].sessions, seen[0].version, seen[0].state], [1, '2.1.2', 'seen']);
t('used before the gate → will be let in when it asks', [seen[1].before, seen[1].sessions, seen[1].version], [true, 2, '2.1.1']);
t('new after the gate → will be asked', seen[0].before, false);
t('accepts strings as the store returns them', M.seenNotAsked([], [JSON.stringify(rows[0])], 'gushwork.ai', since, now).length, 1);

const blocks = M.pluginRequestBlocks({ id: 'a'.repeat(16), email: 'x@gmail.com', version: '2.1.2', note: 'hi', at: now, sessions: 3 });
t('the DM carries Allow, Deny and the Access Control link', blocks[2].elements.map((e) => e.action_id), ['gw_plugin_approve', 'gw_plugin_deny', 'gw_open']);
t('the DM quotes the note', blocks[0].text.text.includes('> hi'), true);
const done = M.pluginAnsweredBlocks(blocks, 'a'.repeat(16), 'Denied.');
t('after an answer the buttons give way to one line', [done[2].type, done[2].elements[0].text], ['context', 'Denied.']);

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
