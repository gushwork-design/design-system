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
console.log(`${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
