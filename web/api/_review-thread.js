/* ============================================================================
   review-thread.js — one conversation per sent-back item, between Utsav and Alfred (5 Oct 2026).

   WHY. A rework that Alfred (the rework routine) could not finish only ever reached Utsav as a push notification, and
   his only answer was to send the item back again. Utsav: "if something blocked the routine to run a rework, it should
   appear in the side panel, make it as comments — my rework message and routine's message ... and i can reply there".

   WHERE IT LIVES: a GitHub issue per item, titled "Rework thread: <scope>/<key>" (his call, over a private store).
   Alfred already has GitHub, so it reads and writes the thread with no new secret, and the history outlives any one
   run. The repo is public, so the thread is too, as the rework notes already were. Who wrote a comment is read from a
   marker on its first line, because the site and the routine may post as the same GitHub account:
     <!-- gw-hub:owner -->            the site, on Utsav's behalf (a send-back note, or a reply)
     <!-- gw-hub:alfred -->           Alfred, after every run
     <!-- gw-hub:alfred blocked -->   Alfred, stopped and waiting on an answer
   Needs Issues read/write on GW_GITHUB_TOKEN. Without it every call here fails and the drawer says so.
   ========================================================================= */

const OWNER = 'gushwork-design';
const REPO = 'design-system';
export const ALFRED = 'Alfred';

export function threadTitle(scope, key) { return `Rework thread: ${scope}/${key}`; }

/* The first line of a comment says who wrote it. Pure, so it can be tested. */
export function parseComment(c) {
  const body = String((c && c.body) || '');
  const m = /^<!--\s*gw-hub:(owner|alfred)(\s+blocked)?\s*-->\s*\n?/.exec(body);
  return {
    id: c && c.id, at: (c && c.created_at) || '',
    who: m ? m[1] : 'other', blocked: !!(m && m[2]),
    by: m ? '' : String((c && c.user && c.user.login) || ''),
    body: (m ? body.slice(m[0].length) : body).trim(),
  };
}

export function ownerComment(text, refs) {
  const files = (refs || []).map((r) => `- [${r.split('/').pop()}](https://github.com/${OWNER}/${REPO}/blob/main/${r})`).join('\n');
  return `<!-- gw-hub:owner -->\n${String(text || '').trim()}${files ? `\n\nReference files:\n${files}` : ''}`;
}

async function gh(token, path, init = {}) {
  const r = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${token}`, accept: 'application/vnd.github+json', 'x-github-api-version': '2022-11-28',
      'user-agent': 'gushwork-design-hub', 'content-type': 'application/json',
    },
  });
  const text = await r.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { /* leave null */ }
  if (!r.ok) { const e = new Error(`github ${r.status}`); e.status = r.status; e.body = body; throw e; }
  return body;
}

/* The item's issue, found by exact title among this repo's issues (open or closed, newest first), or null. */
export async function findThread(token, scope, key) {
  const want = threadTitle(scope, key);
  for (let page = 1; page <= 5; page++) {
    const list = await gh(token, `/issues?state=all&per_page=100&page=${page}&sort=created&direction=desc`);
    const hit = (list || []).find((i) => !i.pull_request && i.title === want);
    if (hit) return hit.number;
    if (!list || list.length < 100) return null;
  }
  return null;
}

export async function ensureThread(token, scope, key) {
  const n = await findThread(token, scope, key);
  if (n) return n;
  const made = await gh(token, '/issues', { method: 'POST', body: JSON.stringify({
    title: threadTitle(scope, key),
    body: `The rework conversation for \`${scope}/${key}\` between Utsav and ${ALFRED}, the rework routine. It is shown and answered in the review drawer on design.gushwork.ai; each comment's first line says who wrote it.`,
  }) });
  return made.number;
}

export async function postComment(token, number, body) {
  const c = await gh(token, `/issues/${number}/comments`, { method: 'POST', body: JSON.stringify({ body }) });
  return parseComment(c);
}

export async function readThread(token, scope, key) {
  const n = await findThread(token, scope, key);
  if (!n) return { number: null, comments: [] };
  const list = await gh(token, `/issues/${n}/comments?per_page=100`);
  return { number: n, url: `https://github.com/${OWNER}/${REPO}/issues/${n}`, comments: (list || []).map(parseComment) };
}
