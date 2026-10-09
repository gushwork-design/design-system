/* ============================================================================
   _bruce-memory.js — what Bruce remembers about each person, and how many runs they have had today (R55 addendum,
   5 Oct 2026).

   MEMORY. Utsav: "we can maintain a memory right?" Each person has a short list of notes in the hub's store
   ("prefers the original logo colour on one-pagers"). The hub puts the notes into the text a Bruce run starts with, and
   the run adds a line or two at the end through this endpoint. The store is private; the repo is public, which is why the
   notes do not live in a GitHub issue the way Alfred's threads do.

   THE TOKEN. The cloud run holds no secret for the store. The hub mints it one: an HMAC over the Slack user id and an
   expiry, signed with the site's session secret, good for a few hours, and only for that one person's notes. Nothing in
   it can read or write anyone else's.

   THE LOG (Utsav, 5 Oct 2026: "create a log for Bruce in the Analytics too"). Every run Bruce is asked for, and every
   ask that hit the cap, is one row in `gw:bruce:log`: when, who (Slack id and display name), their role, what kind of
   turn it was, and the first line of what they asked. The owner reads it on /admin/analytics#bruce, with the same
   session check as the usage log. Slack display names are looked up once and kept in `gw:slack:names`.

   THE CONVERSATION (Utsav, 9 Oct 2026: "I want to see what he sent and received"). The log keeps one line of what was
   asked. What Bruce answered is not stored anywhere on our side, on purpose: it lives in the Slack DM, so the owner's
   Conversation view reads that thread from Slack when it is opened, with the bot token, owner only, and keeps nothing.
   A log row now also carries the DM channel and the thread's first message (`ch`, `ts`) so the thread opens directly;
   rows from before that find the thread by the person and the time.

   WHAT HE SENT (Utsav, 8 Oct 2026: "always keep it honest and make sure you tell everything you did"). Bruce's bot token
   cannot list conversations, so "whom did you message" had no answer. Now a run reports each message it sends to
   someone other than the thread it was asked in (POST { sent: [{ to, text }] } with its per-run token), and the hub
   keeps it as a `sent` row in the same log. The owner sees them on /admin/analytics#bruce, and Bruce reads them back for
   the owner (GET ?sent=1, owner token only). It is the run's own report, not an interception of Slack: a send that is
   not reported is not logged, so the prompt makes the report part of the send.

   CONVERSATIONS (Utsav, 8 Oct 2026: "i want to track all conversations of people with Bruce, to understand what people
   are using it for, how they communicate, how I can improve Bruce"). The Analytics Bruce tab is now a list of
   conversations, one per person like a DM list, latest first. Every ask is tagged with a TOPIC when it is logged
   (topicOf, plain rules, no model), so the tab can say what people use Bruce for and which asks fell in no lane. A click
   opens a drawer: the whole DM read live from Slack (readDM, owner only, nothing stored) beside the log's own turns.
   The privacy line is unchanged: what Bruce ANSWERED still lives only in Slack.

   RUN OR CHAT (Utsav, 8 Oct 2026: "say hi to Utsav shouldn't count as a run, it's just a conversation; a run is where a skill
   is triggered or too many tokens are used; replying to a text doesn't consume that much"). Every DM still starts one cloud
   session, but only some asks are WORK. weightOf says which, from the words: making or changing a design thing, an order to run
   or release something, or a long brief are runs; everything else (a pass-on, a status check, a question about him, a file or a
   template lookup, a reminder, a talk about hub work) is a chat. Runs spend the daily cap below. Chats have their own much larger guard (BRUCE_DM_CHAT_CAP, default 40), so a
   friendly teammate is never told "no" for saying thanks, and a loop still cannot run away. It is a guess from the text,
   not a measurement; measuring skills and tokens per session is the next step.

   THE CAP. Everyone may DM Bruce (Utsav: "let's open it for all people"), every run spends his account, so each person
   other than him gets BRUCE_DAILY_CAP runs a day (default 3, his call). The count is per person per day, kept here too.
   ========================================================================= */

import crypto from 'node:crypto';
import { sessionSecret, COOKIE, verify, readCookie } from './_session.js';
import { isOwner } from './_access.js';

const MAX_NOTES = 30;
const LOG_KEY = 'gw:bruce:log';
const MAX_LOG = 3000;
const NAMES_KEY = 'gw:slack:names';
const TOKEN_HOURS = 6;
const CH = /^[CDG][A-Z0-9]{6,}$/, TS = /^\d{9,}\.\d{3,6}$/, UID = /^[UW][A-Z0-9]{6,}$/;

function store() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url, token } : null;
}

async function redis(cfg, commands, f = fetch) {
  const r = await f(`${cfg.url}/pipeline`, { method: 'POST', headers: { authorization: `Bearer ${cfg.token}`, 'content-type': 'application/json' }, body: JSON.stringify(commands) });
  if (!r.ok) throw new Error(`kv ${r.status}`);
  return r.json();
}

/* ---- the per-run token ---- */
export function mintToken(user, now = Date.now(), secret = sessionSecret()) {
  const exp = now + TOKEN_HOURS * 3600e3;
  const sig = crypto.createHmac('sha256', secret).update(`${user}.${exp}`).digest('base64url');
  return `${user}.${exp}.${sig}`;
}

export function readToken(token, now = Date.now(), secret = sessionSecret()) {
  const [user, exp, sig] = String(token || '').split('.');
  if (!user || !exp || !sig || Number(exp) < now) return null;
  const want = crypto.createHmac('sha256', secret).update(`${user}.${exp}`).digest('base64url');
  const a = Buffer.from(sig), b = Buffer.from(want);
  return a.length === b.length && crypto.timingSafeEqual(a, b) ? user : null;
}

/* ---- notes ---- */
export async function readNotes(user, f = fetch) {
  const cfg = store(); if (!cfg) return [];
  const [{ result }] = await redis(cfg, [['LRANGE', `gw:bruce:mem:${user}`, '0', String(MAX_NOTES - 1)]], f);
  return Array.isArray(result) ? result.map(String) : [];
}

export async function addNotes(user, lines, f = fetch) {
  const cfg = store(); if (!cfg) return 0;
  const clean = (lines || []).map((l) => String(l).replace(/\s+/g, ' ').trim().slice(0, 240)).filter(Boolean).slice(0, 5);
  if (!clean.length) return 0;
  const key = `gw:bruce:mem:${user}`, day = new Date().toISOString().slice(0, 10);
  await redis(cfg, [...clean.map((l) => ['LPUSH', key, `${day}: ${l}`]), ['LTRIM', key, '0', String(MAX_NOTES - 1)]], f);
  return clean.length;
}

/* ---- the daily cap ---- */
export function dailyCap() {
  const n = Number(process.env.BRUCE_DAILY_CAP);
  return Number.isFinite(n) && n >= 0 ? n : 3;
}
export function dmChatCap() {
  const n = Number(process.env.BRUCE_DM_CHAT_CAP);
  return Number.isFinite(n) && n >= 0 ? n : 40;
}

/* Counts this ask. `bucket` is 'runs' (work, the small cap) or 'chats' (conversation, the big one). Returns { allowed, used, cap, bucket }.
   With no store, nothing is counted and everyone is allowed. */
export async function takeRun(user, { uncapped = false, f = fetch, now = new Date(), bucket = 'runs' } = {}) {
  const chats = bucket === 'chats';
  const cap = chats ? dmChatCap() : dailyCap();
  const cfg = store(); if (!cfg) return { allowed: true, used: 0, cap, bucket };
  const day = now.toISOString().slice(0, 10), key = `gw:bruce:${chats ? 'chats' : 'runs'}:${day}`;
  if (uncapped) { await redis(cfg, [['HINCRBY', key, user, '1'], ['EXPIRE', key, '2592000']], f); return { allowed: true, used: 0, cap, bucket }; }
  const [{ result }] = await redis(cfg, [['HGET', key, user]], f);
  const used = Number(result) || 0;
  if (used >= cap) return { allowed: false, used, cap, bucket };
  await redis(cfg, [['HINCRBY', key, user, '1'], ['EXPIRE', key, '2592000']], f);
  return { allowed: true, used: used + 1, cap, bucket };
}

/* ---- the run log ---- */
/* A person's Slack display name, looked up once with the bot token and kept. Falls back to the id. */
export async function slackName(token, user, f = fetch) {
  const cfg = store();
  if (cfg) {
    try { const [{ result }] = await redis(cfg, [['HGET', NAMES_KEY, user]], f); if (result) return String(result); } catch { /* look it up */ }
  }
  let name = '';
  if (token) {
    try {
      const r = await f(`https://slack.com/api/users.info?user=${encodeURIComponent(user)}`, { headers: { authorization: `Bearer ${token}` } });
      const j = await r.json();
      const u = j && j.ok && j.user;
      name = u ? String((u.profile && (u.profile.display_name || u.profile.real_name)) || u.real_name || u.name || '') : '';
    } catch { /* fall back to the id */ }
  }
  if (name && cfg) { try { await redis(cfg, [['HSET', NAMES_KEY, user, name]], f); } catch { /* fine */ } }
  return name || user;
}

/* What an ask is about, from its words. First rule wins, so the order matters. Plain rules on purpose: it has to be
   free, instant and explainable, and "other" is useful on its own, it is the list of asks Bruce has no lane for. */
export const TOPICS = ['pass-on', 'status', 'access', 'brand', 'build', 'template', 'hub', 'about', 'other'];
const TOPIC_RULES = [
  ['pass-on', /\b(tell|ask|let|inform|message|ping|dm|notify|remind)\b.{0,30}\butsav\b|\bpass(ed)?\s+(it\s+|that\s+)?on\b|\b(say|said|says)\s+hi\b|\bproof\b.{0,24}\b(send|sent|sending)\b/i],
  ['status', /\b(status|progress|any update|an update|done yet|is it (live|done|ready|merged|published)|live yet|ready yet|published|merged|deployed)\b|^\W*(and|so|well|any|done|status)\W*$/i],
  ['access', /\b(access|permission|permissions|can'?t open|cannot open|sign ?in|log ?in|invite|let me in)\b/i],
  ['brand', /\b(logos?|colou?rs?|palette|fonts?|typefaces?|tokens?|brand|svg|png|jpe?g|favicon|assets?|download)\b/i],
  ['build', /\b(build|make|create|design|draft|mock ?up)\b|\b(one-?pagers?|landing|lander|pages?|deck|slides?|banner|poster|flyer|email|newsletter)\b/i],
  ['template', /\b(templates?|tools?|library|components?|prompt|which|where do i|how do i|how to)\b/i],
  ['hub', /\b(rework|checks?|drift|tests?|release|merge|delete|remove|rename|staging|hub|review|approve|approval)\b/i],
  ['about', /\b(who are you|what (can|do|are) you|how do you|help|hello|hi|hey|thanks?|thank you)\b/i],
];
/* Is this ask work (a run) or a conversation (a chat)? See RUN OR CHAT above.
   Utsav's rule, again (9 Oct 2026, after "what he worked on" listed chats as runs): a run is where a SKILL is triggered or a lot of
   tokens are used. Talking about a page, asking where something is, telling him how to behave, or reminding him of something is a
   chat, whatever words it contains. Nothing here can measure a skill or tokens yet (his cloud sessions report neither), so this
   stands in for them: an ask is work only when it asks for a design thing to be MADE or CHANGED, or for a heavy job to be run, or
   is a long brief. Everything else is a chat. Measuring is still the real fix. */
const CHAT_TOPICS = ['pass-on', 'status', 'about', 'access'];
const ARTIFACT_RE = /\b(one-?pagers?|landing|lander|pages?|decks?|slides?|banners?|posters?|flyers?|emails?|newsletters?|templates?|dashboards?|components?|logos?|svgs?|mock-?ups?|cards?|sections?|folds?|hero|forms?|footers?|navbar|case stud(y|ies)|reports?)\b/i;
const MAKE_RE = /\b(build|make|create|design|draft|mock ?up|generate|produce|write)\b/i;
const EDIT_RE = /\b(change|update|fix|add|remove|swap|replace|rename|redo|rewrite|shorten|lengthen|bigger|smaller|darker|lighter)\b/i;
const HEAVY_RE = /^\W*(?:(?:please|pls|can you|could you|would you|will you)\s+)?(run|rework|rebuild|redo|release|publish|deploy)\b/i;   /* an order for a heavy job, not a mention */
const BRIEF_RE = /^\W*(?:an?\s+)?(one-?pagers?|landing pages?|decks?|banners?|posters?|flyers?|newsletters?|case stud(?:y|ies))\b/i;   /* "One-pager for sales, ops leads" */
export function weightOf(text) {
  const t = String(text || '').trim();
  if (t.length > 280) return 'run';                 /* a brief: a lot of tokens */
  if (CHAT_TOPICS.includes(topicOf(t))) return 'chat';
  if (HEAVY_RE.test(t) || BRIEF_RE.test(t)) return 'run';
  return ARTIFACT_RE.test(t) && (MAKE_RE.test(t) || EDIT_RE.test(t)) ? 'run' : 'chat';   /* make or change a design thing: a skill runs */
}

export function topicOf(text) {
  const t = String(text || '').trim();
  for (const [name, re] of TOPIC_RULES) if (re.test(t)) return name;
  return 'other';
}

/* One row per turn Bruce was asked for. `kind`: run (a Bruce run started), capped (refused at the daily cap),
   chat (a conversation, not work), to-alfred (a reply passed to Alfred's thread), failed (the trigger did not fire), sent (a message Bruce reported sending
   to `to`; `user` is who the run was for). Never throws. */
export async function logRun(row, f = fetch) {
  const cfg = store(); if (!cfg) return false;
  const r = { at: new Date().toISOString(), user: String(row.user || ''), name: String(row.name || row.user || ''), role: row.role === 'owner' ? 'owner' : 'teammate',
    kind: String(row.kind || 'run'), thread: row.thread ? 1 : 0, text: String(row.text || '').replace(/\s+/g, ' ').trim().slice(0, 200), used: Number(row.used) || 0 };
  if (r.kind !== 'sent' && r.kind !== 'report') r.topic = TOPICS.includes(row.topic) ? row.topic : topicOf(r.text);
  if (r.kind === 'report') { r.skills = cleanSkills(row.skills); if (Number(row.tokens) > 0) r.tokens = Math.round(Number(row.tokens)); }
  if (UID.test(String(row.to || '')) || CH.test(String(row.to || ''))) { r.to = String(row.to); r.toName = String(row.toName || row.to).replace(/\s+/g, ' ').trim().slice(0, 80); }
  if (CH.test(String(row.ch || ''))) r.ch = String(row.ch);
  if (TS.test(String(row.ts || ''))) r.ts = String(row.ts);
  try { await redis(cfg, [['LPUSH', LOG_KEY, JSON.stringify(r)], ['LTRIM', LOG_KEY, '0', String(MAX_LOG - 1)]], f); return true; } catch { return false; }
}

/* A run's report of what it sent: up to 5 { to, text } per call, `to` a Slack user or channel id. `user` is who the run was
   for (the token's user). One `sent` row each; bad ids are skipped. Returns how many were kept. Never throws. */
export async function logSent(user, items, { f = fetch, token = process.env.SLACK_BOT_TOKEN || '' } = {}) {
  try {
    const role = user && user === String(process.env.OWNER_SLACK_ID || '') ? 'owner' : 'teammate';
    const name = await slackName(token, user, f);
    let kept = 0;
    for (const it of (Array.isArray(items) ? items : []).slice(0, 5)) {
      const to = String((it && it.to) || '');
      if (!UID.test(to) && !CH.test(to)) continue;
      const toName = UID.test(to) ? await slackName(token, to, f) : to;
      if (await logRun({ user, name, role, kind: 'sent', to, toName, text: it.text }, f)) kept++;
    }
    return kept;
  } catch { return 0; }
}

/* ---- the run report: what his session actually did (Utsav, 9 Oct 2026: a run is where a skill was used or many tokens were spent) ----
   At the end of a session Bruce POSTs { run: { skills: ["gushwork-web", ...], tokens: 123000 } } with the same per-run token he uses for
   `sent`. `skills` is what he invoked through the Skill tool, which he can see; `tokens` is optional, since a session cannot read its own
   count. The report is its own log row (kind `report`); attachReports folds it into the ask it answers when the log is read, and then
   the report, not the words of the ask, says whether it was a run. An ask with no report keeps the word-based guess (weightOf). */
export const HEAVY_TOKENS = 80000;
export function cleanSkills(list) {
  const out = [];
  for (const x of Array.isArray(list) ? list : []) {
    const n = String(x || '').trim().slice(0, 60);
    if (/^[\w:.\-\/ ]{1,60}$/.test(n) && !out.includes(n)) out.push(n);
    if (out.length >= 8) break;
  }
  return out;
}
export async function logReport(user, run, { f = fetch } = {}) {
  try {
    if (!user || !run || typeof run !== 'object') return false;
    const role = user === String(process.env.OWNER_SLACK_ID || '') ? 'owner' : 'teammate';
    return await logRun({ user, name: user, role, kind: 'report', skills: run.skills, tokens: run.tokens }, f);
  } catch { return false; }
}
/* Fold each report into the latest ask of the same person that came before it (within the run token's six hours) and not already
   reported. Returns the rows without the report rows. Mutates the ask rows: skills, tokens, reported, and kind (a run only if a
   skill ran or the tokens were heavy; otherwise a chat). Capped, failed and to-alfred asks keep their kind. */
export function attachReports(rows) {
  const asc = rows.filter((r) => r.kind === 'report').sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  const asks = rows.filter((r) => r.kind === 'run' || r.kind === 'chat').sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  const claimed = new Set();
  for (const rep of asc) {
    const t = Date.parse(rep.at); let hit = null;
    for (const a of asks) { const at = Date.parse(a.at); if (a.user === rep.user && at <= t && t - at <= TOKEN_HOURS * 3600e3 && !claimed.has(a)) hit = a; }
    if (!hit) continue;
    claimed.add(hit);
    hit.skills = rep.skills || []; if (rep.tokens) hit.tokens = rep.tokens; hit.reported = true;
    hit.kind = (hit.skills.length || (rep.tokens || 0) >= HEAVY_TOKENS) ? 'run' : 'chat';
  }
  return rows.filter((r) => r.kind !== 'report');
}

export async function readLog(f = fetch) {
  const cfg = store(); if (!cfg) return null;
  const [{ result }] = await redis(cfg, [['LRANGE', LOG_KEY, '0', String(MAX_LOG - 1)]], f);
  const rows = [];
  for (const raw of result || []) { try { const o = JSON.parse(raw); if (o && o.at) rows.push(o); } catch { /* skip */ } }
  return rows;
}

/* ---- the conversation: what a person and Bruce said to each other, read from the Slack DM ---- */
/* Slack's message text as plain words: <@U1> and <url|label> become something readable, the three escapes are undone. */
export function plain(t) {
  return String(t || '')
    .replace(/<@([UW][A-Z0-9]+)(?:\|([^>]*))?>/g, (m, id, n) => '@' + (n || 'someone'))
    .replace(/<#[CG][A-Z0-9]+\|([^>]*)>/g, '#$1')
    .replace(/<(https?:[^>|]+)\|([^>]*)>/g, '$2 ($1)')
    .replace(/<(https?:[^>]+)>/g, '$1')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
    .trim().slice(0, 4000);
}

async function slackForm(token, method, params, f) {
  const r = await f(`https://slack.com/api/${method}`, { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(params).toString() });
  return r.json().catch(() => ({ ok: false, error: 'bad_response' }));
}
const failure = (j, what) => (j.error === 'missing_scope'
  ? { ok: false, reason: 'scope', needed: String(j.needed || ''), detail: `Slack says the app is missing a permission (${j.needed || 'unknown'}) to ${what}.` }
  : (['channel_not_found', 'thread_not_found', 'users_not_found', 'cannot_dm_bot'].includes(j.error)
      ? { ok: false, reason: 'notfound', detail: 'That conversation is not there any more.' }
      : { ok: false, reason: 'slack', detail: `Slack said ${j.error || 'something unexpected'} when asked to ${what}.` }));

/**
 * One thread of Bruce's DM with one person: { ok: true, channel, ts, person, messages: [{ from, name, text, at, files }] }
 * or { ok: false, reason: 'scope' | 'notfound' | 'slack' | 'input', detail }. Needs only user; ch and ts open the thread
 * directly, and without them the thread is found from the person and the time (`at`, in ms).
 */
export async function readConversation({ token, user, ch, ts, at }, f = fetch) {
  if (!token) return { ok: false, reason: 'slack', detail: 'The Slack app is not connected to the site.' };
  if (!UID.test(String(user || ''))) return { ok: false, reason: 'input', detail: 'No person.' };
  let channel = CH.test(String(ch || '')) ? String(ch) : '';
  if (!channel) {
    const o = await slackForm(token, 'conversations.open', { users: user }, f);
    if (!o.ok) return failure(o, 'open the DM');
    channel = o.channel && o.channel.id;
  }
  let root = TS.test(String(ts || '')) ? String(ts) : '';
  if (!root) {
    const when = Number(at) / 1000;
    if (!when) return { ok: false, reason: 'input', detail: 'No time to look around.' };
    const h = await slackForm(token, 'conversations.history', { channel, oldest: String(when - 300), latest: String(when + 300), inclusive: 'true', limit: '30' }, f);
    if (!h.ok) return failure(h, 'read the DM');
    const mine = (h.messages || []).filter((m) => m.user === user).sort((a, b) => Math.abs(Number(a.ts) - when) - Math.abs(Number(b.ts) - when));
    if (!mine.length) return { ok: false, reason: 'notfound', detail: 'No message from them around that time.' };
    root = mine[0].thread_ts || mine[0].ts;
  }
  const r = await slackForm(token, 'conversations.replies', { channel, ts: root, limit: '100' }, f);
  if (!r.ok) return failure(r, 'read the thread');
  const person = await slackName(token, user, f);
  const messages = (r.messages || []).map((m) => ({
    from: m.user === user ? 'person' : 'bruce',
    name: m.user === user ? person : 'Bruce',
    text: plain(m.text),
    at: Math.round(Number(m.ts) * 1000),
    files: (m.files || []).map((x) => String(x.name || x.title || 'file')).slice(0, 6),
  })).filter((m) => m.text || m.files.length);
  return { ok: true, channel, ts: root, person, messages };
}

/* Links and files, kept as data (Utsav, 8 Oct 2026: "keep links and files shared there too"). Links come from Slack's own
   <url|label> markup before plain() flattens it; files carry the Slack permalink, which opens for anyone in the workspace. */
const LINK_RE = /<(https?:\/\/[^>|\s]+)(?:\|([^>]*))?>/g;
export function linksOf(raw) {
  const out = [], seen = new Set();
  String(raw || '').replace(LINK_RE, (m, url, label) => {
    const u = url.replace(/&amp;/g, '&');
    if (!seen.has(u) && out.length < 10) { seen.add(u); out.push({ url: u, label: label ? plain(label) : '' }); }
    return m;
  });
  return out;
}
export function fileOf(x) {
  return { name: String(x.name || x.title || 'file').slice(0, 120), type: String(x.filetype || x.pretty_type || '').slice(0, 20),
    url: /^https:\/\//.test(String(x.permalink || '')) ? String(x.permalink) : '', size: Number(x.size) || 0 };
}

/**
 * The whole DM with one person, newest messages last: { ok: true, channel, person, messages: [{ from, name, text, at, thread,
 * reply, links: [{ url, label }], files: [{ name, type, url, size }] }], truncated } or { ok: false, reason, detail }. Read live from Slack with the bot token for the owner's drawer
 * and kept nowhere. History is paged (3 pages of 200 at most) and the newest 25 threads are opened for their replies, which keeps
 * a long conversation inside Slack's rate limits. `truncated` says the older end was cut off.
 */
export async function readDM({ token, user, ch }, f = fetch) {
  if (!token) return { ok: false, reason: 'slack', detail: 'The Slack app is not connected to the site.' };
  if (!UID.test(String(user || ''))) return { ok: false, reason: 'input', detail: 'No person.' };
  let channel = CH.test(String(ch || '')) ? String(ch) : '';
  if (!channel) {
    const o = await slackForm(token, 'conversations.open', { users: user }, f);
    if (!o.ok) return failure(o, 'open the DM');
    channel = o.channel && o.channel.id;
  }
  const top = []; let cursor = '', pages = 0;
  do {
    const h = await slackForm(token, 'conversations.history', { channel, limit: '200', ...(cursor ? { cursor } : {}) }, f);
    if (!h.ok) return failure(h, 'read the DM');
    top.push(...(h.messages || []));
    cursor = (h.has_more && h.response_metadata && h.response_metadata.next_cursor) || '';
    pages++;
  } while (cursor && pages < 3);
  const all = new Map(); top.forEach((m) => all.set(m.ts, m));
  const parents = top.filter((m) => Number(m.reply_count) > 0 && (!m.thread_ts || m.thread_ts === m.ts)).slice(0, 25);
  for (const p of parents) {
    const r = await slackForm(token, 'conversations.replies', { channel, ts: p.ts, limit: '100' }, f);
    if (r.ok) (r.messages || []).forEach((m) => { if (!all.has(m.ts)) all.set(m.ts, m); });   /* the parent is in both; keep the history copy */
  }
  const person = await slackName(token, user, f);
  const messages = [...all.values()].sort((a, b) => Number(a.ts) - Number(b.ts)).map((m) => ({
    from: m.user === user ? 'person' : 'bruce',
    name: m.user === user ? person : 'Bruce',
    text: plain(m.text),
    at: Math.round(Number(m.ts) * 1000),
    thread: m.thread_ts && m.thread_ts !== m.ts ? m.thread_ts : (Number(m.reply_count) > 0 ? m.ts : ''),
    reply: !!(m.thread_ts && m.thread_ts !== m.ts),
    links: linksOf(m.text),
    files: (m.files || []).slice(0, 6).map(fileOf),
  })).filter((m) => m.text || m.files.length);
  return { ok: true, channel, person, messages: messages.slice(-400), truncated: !!cursor || messages.length > 400 };
}

/* ---- the endpoint: GET reads the caller's notes, POST { notes: [...] } adds to them. Bearer = the per-run token. ---- */
export default async function handler(req, res) {
  // ?log=1: the owner's view of every Bruce turn, for /admin/analytics#bruce. Session cookie, owner only, like the usage log.
  if (req.method === 'GET' && req.query && req.query.log) {
    const session = await verify(readCookie(req.headers.cookie, COOKIE), sessionSecret());
    if (!session || !session.email) return res.status(401).json({ error: 'Not signed in.' });
    if (!isOwner(session.email)) return res.status(403).json({ error: 'Owners only.' });
    try {
      const rows = await readLog();
      if (rows === null) return res.status(200).json({ configured: false, rows: [] });
      const shown = attachReports(rows);
      for (const r of shown) {
        if (r.kind !== 'sent' && !r.topic) r.topic = topicOf(r.text);                   /* rows logged before topics existed */
        if (!r.reported && r.kind === 'run' && weightOf(r.text) === 'chat') r.kind = 'chat';   /* no report from his session: the words stand in */
      }
      return res.status(200).json({ configured: true, rows: shown, owner: String(process.env.OWNER_SLACK_ID || ''), cap: dailyCap() });
    } catch { return res.status(502).json({ error: 'Could not read the log.' }); }
  }
  // ?conversation=1&user=U…[&ch=D…&ts=…][&at=ms]: the owner reads one thread of a DM, live from Slack. Owner only; nothing is kept.
  if (req.method === 'GET' && req.query && req.query.conversation) {
    const session = await verify(readCookie(req.headers.cookie, COOKIE), sessionSecret());
    if (!session || !session.email) return res.status(401).json({ error: 'Not signed in.' });
    if (!isOwner(session.email)) return res.status(403).json({ error: 'Owners only.' });
    res.setHeader('Cache-Control', 'no-store, private');
    try {
      const q = req.query;
      return res.status(200).json(await readConversation({ token: process.env.SLACK_BOT_TOKEN, user: String(q.user || ''), ch: String(q.ch || ''), ts: String(q.ts || ''), at: Number(q.at) || 0 }));
    } catch { return res.status(502).json({ ok: false, reason: 'slack', detail: 'Could not reach Slack.' }); }
  }
  // ?dm=1&user=U…[&ch=D…]: the owner reads one person's whole DM, live from Slack, for the Analytics drawer. Nothing is kept.
  if (req.method === 'GET' && req.query && req.query.dm) {
    const session = await verify(readCookie(req.headers.cookie, COOKIE), sessionSecret());
    if (!session || !session.email) return res.status(401).json({ error: 'Not signed in.' });
    if (!isOwner(session.email)) return res.status(403).json({ error: 'Owners only.' });
    res.setHeader('Cache-Control', 'no-store, private');
    try {
      const q = req.query;
      return res.status(200).json(await readDM({ token: process.env.SLACK_BOT_TOKEN, user: String(q.user || ''), ch: String(q.ch || '') }));
    } catch { return res.status(502).json({ ok: false, reason: 'slack', detail: 'Could not reach Slack.' }); }
  }
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const user = readToken(token);
  if (!user) return res.status(401).json({ error: 'bad or expired token' });
  try {
    if (req.method === 'GET' && req.query && req.query.sent) {
      if (!user || user !== String(process.env.OWNER_SLACK_ID || '')) return res.status(403).json({ error: 'Owner token only.' });
      const rows = (await readLog()) || [];
      return res.status(200).json({ user, sent: rows.filter((r) => r.kind === 'sent').slice(0, 100) });
    }
    if (req.method === 'GET') return res.status(200).json({ user, notes: await readNotes(user) });
    if (req.method === 'POST') {
      let body = req.body; if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
      const n = await addNotes(user, Array.isArray(body && body.notes) ? body.notes : []);
      const sent = await logSent(user, body && body.sent);
      const run = body && body.run ? await logReport(user, body.run) : undefined;
      return res.status(200).json({ ok: true, added: n, sent, ...(run === undefined ? {} : { run }) });
    }
    return res.status(405).json({ error: 'GET or POST' });
  } catch (e) { return res.status(502).json({ error: String(e.message || e).slice(0, 120) }); }
}
