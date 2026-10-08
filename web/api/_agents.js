/* ============================================================================
   _agents.js — what the hub's agents are up to, for the Agents page (8 Oct 2026).

   Utsav: "to see in detail what they are upto, who is using how much tokens and usage, their health, their tasks".
   Bruce's turns are in the hub's log and the checks come from /api/health, so the page reads those itself. Alfred's work
   lives in GitHub: one "Rework thread: <scope>/<key>" issue per item, and every Alfred run ends with a comment tagged
   <!-- gw-hub:alfred --> (or "blocked"). So his runs, what he has finished and what he is stuck on are read from there.

   GET /api/agents   owner only, no-store. { configured, at, days, alfred: { runs, lastRunAt, byDay, counts, threads } }.
   One function: a module behind gw.js, like the others.
   ========================================================================= */

import { COOKIE, verify, readCookie, sessionSecret, isOwner } from './_session.js';
import { gh, parseComment } from './_review-thread.js';

const PREFIX = 'Rework thread: ';
const DAY = 86400000;
const MAX_THREADS = 30;

const day = (ms) => new Date(ms).toISOString().slice(0, 10);

/* What state is a thread in, from its last comment. Pure, so it can be tested.
   alfred, not blocked   -> ready: he finished and it is waiting for a look
   alfred, blocked       -> stuck: he stopped and needs an answer
   owner (or nothing)    -> queued: sent back or replied to, and he has not answered yet */
export function stateOf(last) {
  if (!last || last.who !== 'alfred') return 'queued';
  return last.blocked ? 'stuck' : 'ready';
}

export async function alfredActivity({ token, now = Date.now(), days = 30, ghFn = gh } = {}) {
  const since = new Date(now - days * DAY).toISOString();
  const issues = [];
  for (let page = 1; page <= 3; page++) {
    const list = await ghFn(token, `/issues?state=all&since=${encodeURIComponent(since)}&per_page=100&page=${page}&sort=updated&direction=desc`);
    issues.push(...(list || []));
    if (!list || list.length < 100) break;
  }
  const threads = issues.filter((i) => !i.pull_request && String(i.title || '').startsWith(PREFIX)).slice(0, MAX_THREADS);
  const byDay = {}; let runs = 0, lastRunAt = '';
  const out = [];
  for (const t of threads) {
    const raw = await ghFn(token, `/issues/${t.number}/comments?per_page=100`);
    const comments = (raw || []).map(parseComment);
    const mine = comments.filter((c) => c.who === 'alfred');
    const recent = mine.filter((c) => c.at && Date.parse(c.at) >= now - days * DAY);
    recent.forEach((c) => { byDay[day(Date.parse(c.at))] = (byDay[day(Date.parse(c.at))] || 0) + 1; });
    runs += recent.length;
    mine.forEach((c) => { if (c.at > lastRunAt) lastRunAt = c.at; });
    const last = comments[comments.length - 1] || null;
    const ref = String(t.title).slice(PREFIX.length);
    const [scope, ...rest] = ref.split('/');
    out.push({
      scope, key: rest.join('/'), number: t.number, url: t.html_url || '', state: stateOf(last),
      lastAt: (last && last.at) || t.updated_at || '', lastBy: last ? last.who : '',
      note: last ? last.body.replace(/\s+/g, ' ').slice(0, 160) : '', runs: recent.length,
    });
  }
  out.sort((a, b) => (a.lastAt < b.lastAt ? 1 : -1));
  const counts = { ready: 0, stuck: 0, queued: 0 }; out.forEach((t) => { counts[t.state]++; });
  return { runs, lastRunAt, byDay, counts, threads: out };
}

const json = (res, status, body) => { res.setHeader('Cache-Control', 'no-store, private'); return res.status(status).json(body); };

export default async function handler(req, res) {
  if (req.method !== 'GET') return json(res, 405, { error: 'GET only.' });
  const session = await verify(readCookie(req.headers.cookie, COOKIE), sessionSecret());
  if (!session || !session.email) return json(res, 401, { error: 'Not signed in.' });
  if (!isOwner(session.email)) return json(res, 403, { error: 'Owners only.' });
  const token = process.env.GW_GITHUB_TOKEN || '';
  if (!token) return json(res, 200, { configured: false, at: new Date().toISOString() });
  const days = Math.min(60, Math.max(1, Number(req.query && req.query.days) || 30));
  try {
    return json(res, 200, { configured: true, at: new Date().toISOString(), days, alfred: await alfredActivity({ token, days }) });
  } catch { return json(res, 502, { error: 'Could not read the threads from GitHub.' }); }
}
