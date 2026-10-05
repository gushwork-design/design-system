// Bruce tells Utsav in Slack when Alfred has something for him (R55 addendum, 5 Oct 2026).
//
// Utsav: "whenever alfred comments or add something to waiting list, bruce informs me on slack to check with the link".
// Alfred ends every run with a comment on the item's thread (an issue "Rework thread: <scope>/<key>", first line
// <!-- gw-hub:alfred --> or <!-- gw-hub:alfred blocked -->), so his comments are the one signal for both: a fix that put
// the item back in Waiting, and a question he is stuck on. This reads the ones not yet sent, DMs one message for the lot,
// and marks each sent with a 🚀 reaction so nothing is sent twice. No model call.
//
// Run by .github/workflows/bruce-pings.yml. Needs GITHUB_TOKEN (issues: write), SLACK_BOT_TOKEN and OWNER_SLACK_ID.
//   node scripts/bruce-pings.mjs            send
//   node scripts/bruce-pings.mjs --dry-run  print what it would send

import { decisionActions, decisionMenu } from '../web/api/_slack-actions.js';

const REPO = process.env.GITHUB_REPOSITORY || 'gushwork-design/design-system';
const SITE = (process.env.SITE_BASE || 'https://design.gushwork.ai').replace(/\/$/, '');
const MARK = 'rocket';
const MAX_LINES = 8;

export function itemLink(scope, key) { return `${SITE}/internal/design-system#review/${scope}/${key}`; }

/* What one Alfred comment says, in a line. Pure. */
export function parsePing(comment, issueTitle) {
  const m = /^Rework thread: ([a-z0-9-]+)\/([a-z0-9-]+)$/.exec(String(issueTitle || '').trim());
  const head = /^<!--\s*gw-hub:alfred(\s+blocked)?\s*-->\s*\n?/.exec(String(comment.body || ''));
  if (!m || !head) return null;
  const text = String(comment.body).slice(head[0].length)
    .replace(/<!--[\s\S]*?-->/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/^\s*(#+|>)\s*/gm, '').replace(/[*_`]/g, '').trim();
  let first = (text.split(/\n\s*\n|\n/)[0] || '').trim();
  const dot = first.search(/[.?!](\s|$)/);
  if (dot > 0 && dot < 200) first = first.slice(0, dot + 1);
  if (first.length > 200) first = first.slice(0, 197).trimEnd() + '…';
  return { id: comment.id, scope: m[1], key: m[2], blocked: !!head[1], line: first, issue: Number(String(comment.issue_url || '').split('/').pop()) || null };
}

/* One Slack message for any number of pings. Short on purpose: one line each, a link, nothing else. Pure. */
export function compose(pings) {
  const label = (p) => `*${p.key}*`;
  const open = (p) => `<${itemLink(p.scope, p.key)}|${p.blocked ? 'Answer him' : 'Open it'}>`;
  if (pings.length === 1) {
    const p = pings[0];
    return p.blocked
      ? `Alfred needs you on ${label(p)}. ${p.line} ${open(p)}`
      : `Alfred finished ${label(p)}. ${p.line} ${open(p)}`;
  }
  const blocked = pings.filter((p) => p.blocked).length;
  const lead = blocked
    ? `Alfred has ${pings.length} updates, and ${blocked === 1 ? 'one needs' : `${blocked} need`} you.`
    : `Alfred has ${pings.length} updates for you.`;
  const lines = [...pings].sort((a, b) => Number(b.blocked) - Number(a.blocked)).slice(0, MAX_LINES)
    .map((p) => `• ${label(p)}${p.blocked ? ' needs you' : ''}: ${p.line} ${open(p)}`);
  if (pings.length > MAX_LINES) lines.push(`…and ${pings.length - MAX_LINES} more in <${SITE}/internal/design-system#review|Waiting>.`);
  return [lead, ...lines].join('\n');
}

/* The same message as Slack blocks: Approve / Rework / Reject under a single finished item, a menu beside each finished
   item in a batch, and only the link for one Alfred is stuck on (that wants an answer, not a decision). Pure. */
export function blocksFor(pings) {
  const sec = (text, id, accessory) => ({ type: 'section', ...(id ? { block_id: id } : {}), text: { type: 'mrkdwn', text }, ...(accessory ? { accessory } : {}) });
  if (pings.length === 1) {
    const p = pings[0];
    return p.blocked ? [sec(compose(pings))] : [sec(compose(pings)), decisionActions(p.scope, p.key)];
  }
  const [lead, ...lines] = compose(pings).split('\n');
  const shown = [...pings].sort((a, b) => Number(b.blocked) - Number(a.blocked)).slice(0, MAX_LINES);
  return [sec(lead), ...shown.map((p, i) => sec(lines[i], `item:${p.scope}/${p.key}`, p.blocked ? null : decisionMenu(p.scope, p.key))),
    ...lines.slice(shown.length).map((l) => sec(l))];
}

export async function gh(path, init = {}, f = fetch) {
  const r = await f(`https://api.github.com/${path}`, { ...init, headers: { authorization: `Bearer ${process.env.GITHUB_TOKEN}`, accept: 'application/vnd.github+json', 'x-github-api-version': '2022-11-28', ...(init.headers || {}) } });
  if (!r.ok) throw new Error(`github ${path}: ${r.status}`);
  return r.status === 204 ? null : r.json();
}

export async function slack(method, body, f = fetch) {
  const r = await f(`https://slack.com/api/${method}`, { method: 'POST', headers: { authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`, 'content-type': 'application/json; charset=utf-8' }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!j.ok) throw new Error(`slack ${method}: ${j.error || r.status}`);
  return j;
}

export async function run({ dry = false, f = fetch, hours = 24 } = {}) {
  const since = new Date(Date.now() - hours * 3600e3).toISOString();
  const comments = await gh(`repos/${REPO}/issues/comments?since=${encodeURIComponent(since)}&per_page=100&sort=created&direction=asc`, {}, f);
  const titles = new Map();
  const pings = [];
  for (const c of comments || []) {
    if (!/^<!--\s*gw-hub:alfred/.test(String(c.body || ''))) continue;
    const reacted = await gh(`repos/${REPO}/issues/comments/${c.id}/reactions?content=${MARK}&per_page=100`, {}, f);
    if ((reacted || []).length) continue;                       // already sent
    if (!titles.has(c.issue_url)) titles.set(c.issue_url, (await gh(c.issue_url.replace('https://api.github.com/', ''), {}, f)).title);
    const p = parsePing(c, titles.get(c.issue_url));
    if (p) pings.push(p);
  }
  // Two comments on one item in a burst: the latest says where it stands.
  const latest = [...new Map(pings.map((p) => [`${p.scope}/${p.key}`, p])).values()];
  if (!latest.length) return { sent: 0, text: '' };
  const text = compose(latest);
  if (dry) return { sent: 0, text, would: latest.length };
  const dm = await slack('conversations.open', { users: process.env.OWNER_SLACK_ID }, f);
  const one = latest.length === 1 ? latest[0] : null;
  await slack('chat.postMessage', {
    channel: dm.channel.id, text, blocks: blocksFor(latest), unfurl_links: false, unfurl_media: false,
    // A reply in this thread goes back to Alfred's thread when it is about one item (_concierge.js reads this).
    ...(one && one.issue ? { metadata: { event_type: 'gw_alfred_ping', event_payload: { issue: one.issue, scope: one.scope, key: one.key } } } : {}),
  }, f);
  for (const p of pings) {                                       // every comment read, not only the latest per item
    try { await gh(`repos/${REPO}/issues/comments/${p.id}/reactions`, { method: 'POST', body: JSON.stringify({ content: MARK }) }, f); } catch { /* sent twice is better than not sent */ }
  }
  return { sent: latest.length, text };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const dry = process.argv.includes('--dry-run');
  run({ dry }).then((r) => { console.log(r.text ? `${dry ? 'would send' : 'sent'} ${r.would || r.sent}:\n${r.text}` : 'nothing new from Alfred'); })
    .catch((e) => { console.error(String(e.message || e)); process.exit(1); });
}
