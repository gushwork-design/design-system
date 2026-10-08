// A local server for building the task board without Vercel, a login or a real store.
//
//   node scripts/tasks-dev-server.mjs            # port 4173 (or PORT), seeded sample tasks, signed in as the owner
//   node scripts/tasks-dev-server.mjs --empty    # no tasks, to see the first-run state
//   PORT=5000 node scripts/tasks-dev-server.mjs
//
// It serves web/ with the hub's cleanUrls, /foundation, /exports, /fonts and /assets from the repo, and /api/tasks from the
// REAL web/api/_tasks.js against an in-memory store (scripts/tasks-kv.mjs). The browser is signed in as the owner by a cookie
// signed here. Ask Bruce is answered by a stub (no key, no network): a message with "move", "plan" or "doing" gets a plan, any
// other gets a plain answer, so the plan card can be built and tested. Everything is forgotten when it stops. Not for production.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { installKv } from './tasks-kv.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
process.env.SESSION_SECRET = 'dev-secret';
process.env.OWNER_EMAILS = 'utsav.singh@gushwork.ai';
process.env.ADMIN_EMAILS = 'utsav.singh@gushwork.ai';
process.env.OWNER_SLACK_ID = 'U0DEVOWNER';
process.env.ANTHROPIC_API_KEY = 'dev-stub';

/* the stub Anthropic: reads the last user message and the board in the system prompt */
async function anthropic(url, init) {
  if (!String(url).startsWith('https://api.anthropic.com/')) throw new Error('dev server: no network for ' + url);
  const body = JSON.parse(init.body);
  const last = body.messages[body.messages.length - 1].content.toLowerCase();
  const ids = [...body.system.matchAll(/^([a-f0-9]{18}) TSK-(\d+) \| todo /gm)].map((m) => m[1]).slice(0, 2);
  const nums = [...body.system.matchAll(/^([a-f0-9]{18}) TSK-(\d+) \| todo /gm)].map((m) => m[2]).slice(0, 2);
  let out;
  if (/move|plan|doing/.test(last) && ids.length) {
    out = {
      answer: 'Here is what I will do. Nothing runs until you approve.',
      plan: [
        { kind: 'tasks', op: 'bulk', ids, patch: { status: 'doing' }, label: `Move ${nums.map((n) => 'TSK-' + n).join(' and ')} to Doing` },
        { kind: 'slack', channel: '#growth', text: 'Utsav is on both of these this week.', label: 'Reply in #growth as Bruce' },
      ],
    };
  } else out = { answer: 'Four tasks are due this week. The riskiest is the one with the nearest due date and no start.', plan: null };
  return new Response(JSON.stringify({ content: [{ type: 'text', text: JSON.stringify(out) }] }), { status: 200, headers: { 'content-type': 'application/json' } });
}
const kv = installKv({ others: anthropic });

const { sign, COOKIE } = await import('../web/api/_session.js');
const { default: tasks } = await import('../web/api/_tasks.js');

/* ---- seed: the wireframe's sample board, dates relative to today ---- */
const iso = (d) => d.toISOString().slice(0, 10);
const plus = (n) => { const d = new Date(); d.setUTCDate(d.getUTCDate() + n); return iso(d); };
const ME = 'u:utsav.singh@gushwork.ai';
let seq = 0;
function seed(t) {
  const now = new Date().toISOString();
  const n = ++seq;
  const id = Array.from({ length: 9 }, () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0')).join('');
  const task = {
    id, n, title: '', notes: '', status: 'todo', priority: '', start: '', due: '', guessed: { due: false, priority: false },
    assignee: ME, run: '', runNote: '', source: null, why: '', createdBy: 'utsav.singh@gushwork.ai', createdAt: now, updatedAt: now, doneAt: '',
    activity: [{ at: now, by: 'utsav.singh@gushwork.ai', text: 'created this' }], ...t,
  };
  if (task.source && task.createdBy === 'bruce') task.activity = [{ at: now, by: 'bruce', text: `suggested this from ${task.source.channel}` }];
  kv.hashes.set('gw:tasks', kv.hashes.get('gw:tasks') || new Map());
  kv.hashes.get('gw:tasks').set(id, JSON.stringify(task));
  kv.strings.set('gw:tasks:seq', String(n));
}
const slack = (channel, from, quote) => ({ kind: 'slack', channel, from, url: 'https://gushwork.slack.com/archives/C0DEV/p1', quote, ts: '' });
if (!process.argv.includes('--empty')) {
  seed({ title: 'Reply to the gtm-ops thread about the v2.0.0 post', status: 'todo', priority: 'urgent', due: plus(-2), source: slack('#gtm-ops', 'Utsav', 'Can you reply to this thread today?'), createdBy: 'bruce' });
  seed({ title: 'Review the conversations tab PR', status: 'todo', priority: 'high', start: plus(-1), due: plus(0), source: slack('#design-hub', 'Darshil', 'PR is up, can you review?'), createdBy: 'bruce' });
  seed({ title: 'Draft the affiliate page FAQ', status: 'doing', priority: 'med', start: plus(0), due: plus(1), assignee: 'a:bruce', run: 'working', runNote: '', source: slack('#growth', 'Aarav', 'We need an FAQ for the affiliate page.'), createdBy: 'bruce' });
  seed({ title: 'Pick the hero for the new ad lander', status: 'todo', priority: 'med', start: plus(1), due: plus(4) });
  seed({ title: 'Wireframes for the task board', status: 'doing', priority: 'high', start: plus(-3), due: plus(0) });
  seed({ title: 'Rework the ID card tool spacing', status: 'doing', priority: 'med', start: plus(0), due: plus(1), assignee: 'a:alfred', run: 'review' });
  seed({ title: 'Book the brand shoot with the studio', status: 'todo', priority: 'low', start: plus(4), due: plus(8), assignee: '', source: slack('DM', 'Priya', 'Can you book the studio for next week?'), createdBy: 'bruce' });
  seed({ title: 'Rename the Figma pages for the ads file', status: 'todo', source: slack('#design', 'Meera', 'The ads file pages are a mess.'), createdBy: 'bruce' });
  seed({ title: 'Publish the Bruce page to staging', status: 'done', doneAt: new Date().toISOString() });
  seed({ title: 'Fix the staging lane access check', status: 'done', doneAt: new Date().toISOString() });
  seed({ title: 'Send the revised case study template to Darshil', status: 'suggested', priority: 'high', guessed: { due: false, priority: true }, why: 'A direct request to you, asking for it today.', source: slack('DM', 'Darshil', 'Can you send me the new template today?'), createdBy: 'bruce', assignee: ME });
  seed({ title: 'Check the CTA copy on the AEO lander', status: 'suggested', priority: 'high', due: plus(1), guessed: { due: true, priority: true }, why: 'A direct request to you, with a deadline (Friday).', source: slack('#growth', 'Aarav', 'Utsav, can you check the CTA copy on the AEO lander before it goes out? We want to ship by Friday.'), createdBy: 'bruce', assignee: ME });
  seed({ title: 'Update the ID card tool with the new address', status: 'suggested', priority: 'low', guessed: { due: false, priority: true }, why: 'A request to you, with no deadline.', source: slack('#people-ops', 'Meera', 'ID cards still show the old office.'), createdBy: 'bruce', assignee: ME });
}

/* ---- static files ---- */
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.ttf': 'font/ttf', '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.md': 'text/plain; charset=utf-8' };
function resolveFile(p) {
  const bases = p.startsWith('/foundation/') || p.startsWith('/exports/') || p.startsWith('/fonts/') ? [root]
    : p.startsWith('/assets/') ? [path.join(root, 'web'), root] : [path.join(root, 'web')];
  for (const b of bases) {
    const f = path.join(b, p);
    if (!f.startsWith(b)) continue;
    for (const c of [f, f + '.html', path.join(f, 'index.html')]) {
      try { if (fs.statSync(c).isFile()) return c; } catch { /* next */ }
    }
  }
  return null;
}

const cookie = await sign({ email: 'utsav.singh@gushwork.ai', name: 'Utsav Singh', via: 'google', exp: Math.floor(Date.now() / 1000) + 86400 * 30 }, process.env.SESSION_SECRET);

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/api/tasks') {
    const chunks = []; for await (const c of req) chunks.push(c);
    const raw = Buffer.concat(chunks).toString();
    const r = {
      method: req.method, headers: { ...req.headers, cookie: req.headers.cookie || `${COOKIE}=${encodeURIComponent(cookie)}` },
      query: Object.fromEntries(url.searchParams), body: raw ? (() => { try { return JSON.parse(raw); } catch { return null; } })() : null,
    };
    const headers = {}; let code = 200;
    const adapter = { setHeader: (k, v) => { headers[k] = v; }, status: (s) => { code = s; return adapter; }, end: (b) => { res.writeHead(code, headers); res.end(b); }, json: (b) => { headers['content-type'] = 'application/json'; adapter.end(JSON.stringify(b)); } };
    try { await tasks(r, adapter); } catch (e) { console.error(e); res.writeHead(500); res.end('dev server error'); }
    return;
  }
  const f = resolveFile(decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname));
  if (!f) { res.writeHead(404, { 'content-type': 'text/plain' }); return res.end('not found: ' + url.pathname); }
  res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream', 'cache-control': 'no-store', 'set-cookie': `${COOKIE}=${encodeURIComponent(cookie)}; Path=/; HttpOnly; SameSite=Lax` });
  fs.createReadStream(f).pipe(res);
});
server.listen(Number(process.env.PORT) || 4173, '127.0.0.1', () => {
  const { port } = server.address();
  console.log(`tasks dev server: http://127.0.0.1:${port}/internal/staging/tasks  (${process.argv.includes('--empty') ? 'empty' : 'seeded'}; signed in as the owner; Ask Bruce is a stub)`);
});
