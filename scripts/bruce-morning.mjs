// Bruce's morning note to Utsav (R55 addendum, 5 Oct 2026): two to four lines, only what needs him.
//
// What is waiting on him on the Design System page (redone first, because those are Alfred's finished fixes), what Alfred
// is stuck on, and whether the site failed to publish. Silent when there is nothing. No model call: it reads
// preview/library/data.json (built fresh by the workflow), Alfred's threads and the publish runs.
//
// Run by .github/workflows/bruce-morning.yml at 9am IST.
//   node scripts/bruce-morning.mjs            send
//   node scripts/bruce-morning.mjs --dry-run  print it
import { readFileSync } from 'node:fs';
import { gh, slack, itemLink } from './bruce-pings.mjs';

const REPO = process.env.GITHUB_REPOSITORY || 'gushwork-design/design-system';
const SITE = (process.env.SITE_BASE || 'https://design.gushwork.ai').replace(/\/$/, '');
const WAITING = new Set(['pending', 'expired', 'redone']);

/* The note itself. Pure, so it can be tested. */
export function greeting(now = new Date()) {
  // GitHub's scheduler can run late; the greeting follows the real IST hour so a 3.35pm note never says "Morning".
  const h = Number(new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hour12: false, timeZone: 'Asia/Kolkata' }).format(now)) % 24;
  return h < 12 ? 'Morning.' : h < 17 ? 'Afternoon.' : 'Evening.';
}

export function compose({ items = [], blocked = [], publish = null, now = new Date() }) {
  const waiting = items.filter((i) => WAITING.has(i.state));
  const redone = waiting.filter((i) => i.state === 'redone');
  const lines = [];
  if (waiting.length) {
    const what = redone.length ? `, ${redone.length === waiting.length ? 'all' : redone.length} of them fixed by Alfred` : '';
    lines.push(`${waiting.length} ${waiting.length === 1 ? 'item is' : 'items are'} waiting on you${what}. <${SITE}/internal/design-system#review|Open Waiting>`);
  }
  if (blocked.length === 1) lines.push(`Alfred is stuck on *${blocked[0].key}* and needs an answer. <${itemLink(blocked[0].scope, blocked[0].key)}|Answer him>`);
  else if (blocked.length > 1) lines.push(`Alfred is stuck on ${blocked.length} items: ${blocked.slice(0, 4).map((b) => `<${itemLink(b.scope, b.key)}|${b.key}>`).join(', ')}${blocked.length > 4 ? ', and more' : ''}.`);
  if (publish && publish.conclusion === 'failure') lines.push(`The last publish failed, so the site is behind main. <${publish.html_url}|See the run>`);
  if (!lines.length) return '';
  return [greeting(now), ...lines].join('\n');
}

async function blockedThreads(f) {
  const issues = await gh(`repos/${REPO}/issues?state=open&per_page=100`, {}, f);
  const out = [];
  for (const i of issues || []) {
    const m = /^Rework thread: ([a-z0-9-]+)\/([a-z0-9-]+)$/.exec(i.title || '');
    if (!m || i.pull_request || !i.comments) continue;
    const last = await gh(`repos/${REPO}/issues/${i.number}/comments?per_page=1&page=${i.comments}`, {}, f);
    if (last && last[0] && /^<!--\s*gw-hub:alfred\s+blocked\s*-->/.test(last[0].body || '')) out.push({ scope: m[1], key: m[2] });
  }
  return out;
}

export async function run({ dry = false, f = fetch, dataPath = 'preview/library/data.json' } = {}) {
  const items = JSON.parse(readFileSync(dataPath, 'utf8')).items || [];
  const blocked = await blockedThreads(f);
  const runs = await gh(`repos/${REPO}/actions/workflows/publish-site.yml/runs?branch=main&per_page=1`, {}, f);
  const publish = runs && runs.workflow_runs && runs.workflow_runs[0] && runs.workflow_runs[0].status === 'completed' ? runs.workflow_runs[0] : null;
  const text = compose({ items, blocked, publish });
  if (!text || dry) return { text, sent: false };
  const dm = await slack('conversations.open', { users: process.env.OWNER_SLACK_ID }, f);
  await slack('chat.postMessage', { channel: dm.channel.id, text, unfurl_links: false, unfurl_media: false }, f);
  return { text, sent: true };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const dry = process.argv.includes('--dry-run');
  run({ dry }).then((r) => console.log(r.text ? `${r.sent ? 'sent' : 'would send'}:\n${r.text}` : 'nothing needs Utsav this morning'))
    .catch((e) => { console.error(String(e.message || e)); process.exit(1); });
}
