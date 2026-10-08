/* ============================================================================
   access.js — read and write the access rules behind /admin/access-control.

   GET  → the current rules, the owner list, and what the caller may change.
   POST → replace the rules, after validating them and checking the caller is
          allowed to make that particular change.

   THE WRITE TOKEN NEVER REACHES THE BROWSER. VERCEL_API_TOKEN can rewrite the
   store that decides who is an admin, so the page never holds it: it POSTs a
   proposed ruleset here, and this function — which has already verified the
   session cookie — is the only thing that talks to the Vercel API.
   ========================================================================= */

import { COOKIE, verify, readCookie, sessionSecret } from './_session.js';
import { loadRules, normalise, ownerEmails, isOwner, isAdmin, saveRules, laneMembers,
         allowedDomain, storeId, readStatus } from './_access.js';

function json(res, status, body) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, private');
  res.status(status).end(JSON.stringify(body));
}

/* ── the company directory, for suggestions ─────────────────────────────────────────────────────────────────────────────
   The hub signs people in with Google but keeps only the email, name and photo on the cookie, so it has no list of the
   people who work here. Slack does: Bruce's workspace has everyone, and with the users:read.email scope users.list returns
   each person's address, name and photo. Read here (admins only, like the rest of this endpoint), cached for an hour so
   typing in the picker never spends a Slack call, and filtered to real, active people on the company domain.

   WITHOUT THE SCOPE (or the token) it says so and falls back to the people who have signed in to the hub, so the picker
   still suggests someone, just not everyone. The page shows which source it is using. */
const DIR_KEY = 'gw:directory';
const DIR_TTL = 3600;

function kvCfg() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url, token } : null;
}
async function kvPipe(cfg, cmds) {
  const r = await fetch(`${cfg.url}/pipeline`, { method: 'POST', headers: { authorization: `Bearer ${cfg.token}`, 'content-type': 'application/json' }, body: JSON.stringify(cmds) });
  if (!r.ok) throw new Error(`kv ${r.status}`);
  return (await r.json()).map((x) => x.result);
}

/* The Slack people list, or { error } saying why not. Pure of caching. */
export async function fetchSlackPeople(token, domain) {
  const out = [];
  let cursor = '';
  for (let page = 0; page < 10; page++) {                       // 10 pages of 200 is 2000 people, far past this company
    const q = new URLSearchParams({ limit: '200', ...(cursor ? { cursor } : {}) });
    const r = await fetch(`https://slack.com/api/users.list?${q}`, { headers: { authorization: `Bearer ${token}` } });
    const j = await r.json().catch(() => ({}));
    if (!j.ok) return { error: j.error || `http ${r.status}` };
    for (const u of j.members || []) {
      if (u.deleted || u.is_bot || u.id === 'USLACKBOT' || u.is_restricted || u.is_ultra_restricted) continue;
      const p = u.profile || {};
      const email = String(p.email || '').toLowerCase();
      if (!email.endsWith('@' + domain)) continue;
      out.push({ email, name: String(p.real_name || p.display_name || u.real_name || u.name || email).slice(0, 80), avatar: String(p.image_48 || '').startsWith('https://') ? p.image_48 : '', title: String(p.title || '').slice(0, 80) });
    }
    cursor = j.response_metadata && j.response_metadata.next_cursor;
    if (!cursor) break;
  }
  out.sort((a, b) => a.name.localeCompare(b.name));
  return { people: out };
}

async function directory() {
  const domain = allowedDomain();
  const cfg = kvCfg();
  try {
    if (cfg) { const [hit] = await kvPipe(cfg, [['GET', DIR_KEY]]); if (hit) { const d = JSON.parse(hit); return { ...d, cached: true }; } }
  } catch { /* fall through to a live read */ }
  const token = process.env.SLACK_BOT_TOKEN;
  let source = { slack: 'off' }, people = [];
  if (token) {
    const got = await fetchSlackPeople(token, domain);
    if (got.error) source = { slack: got.error === 'missing_scope' ? 'missing_scope' : 'error', detail: got.error };
    else { people = got.people; source = { slack: 'ok' }; }
  }
  /* Whoever has signed in to the hub, as a floor: names unknown, but the address is real. */
  if (!people.length && cfg) {
    try {
      const [rows] = await kvPipe(cfg, [['LRANGE', 'gw:visits', '0', '1999']]);
      const seen = new Map();
      for (const r of rows || []) { try { const e = String(JSON.parse(r).email || '').toLowerCase(); if (e.includes('@') && e.endsWith('@' + domain)) seen.set(e, { email: e, name: '', avatar: '' }); } catch { /* skip */ } }
      people = [...seen.values()];
      source.visits = people.length;
    } catch { /* no floor */ }
  }
  const out = { people, source, at: Date.now() };
  if (cfg && source.slack === 'ok') { try { await kvPipe(cfg, [['SET', DIR_KEY, JSON.stringify(out), 'EX', String(DIR_TTL)]]); } catch { /* uncached is fine */ } }
  return out;
}

/* Editing rules is an admin act; editing WHO IS AN ADMIN is an owner act.
   Compared as sets, because reordering a list is not a change. */
function sameEmails(a, b) {
  const norm = v => [...new Set((v || []).map(s => String(s).toLowerCase()))].sort();
  const x = norm(a), y = norm(b);
  return x.length === y.length && x.every((v, i) => v === y[i]);
}

export default async function handler(req, res) {
  const session = await verify(readCookie(req.headers.cookie, COOKIE), sessionSecret());
  if (!session || !session.email) {
    return json(res, 401, { error: 'Not signed in.' });
  }

  const rules = await loadRules();
  const email = String(session.email).toLowerCase();

  /* Deliberately evaluated against the LIVE rules, not the cookie's `admin`
     claim. The cookie is signed for 30 days; a revoked admin holding one
     must not still be able to write here. */
  if (!isAdmin(email, rules)) {
    return json(res, 403, { error: 'Admins only.' });
  }

  const owner = isOwner(email);
  const configured = !!storeId() && !!process.env.VERCEL_API_TOKEN;

  if (req.method === 'GET' && req.query && req.query.directory) {
    try { return json(res, 200, await directory()); }
    catch { return json(res, 200, { people: [], source: { slack: 'error' } }); }
  }

  if (req.method === 'GET') {
    return json(res, 200, {
      rules,
      owners: ownerEmails(),
      domain: allowedDomain(),
      you: { email, owner },
      /* What this server can do, so the page offers only that: guests (outside people, by invitation) need the guest cookie and rules this build has. */
      capabilities: { guests: true },
      /* The page renders its controls from this, so an unconfigured store
         shows the real rules read-only rather than offering a Save that
         cannot work. */
      writable: configured,
      /* Why the page is in whatever state it is in. `store` says whether a
         connection string exists, `read` is what the last read of it actually
         did, and `token` says whether writes are possible. Between them the
         banner can name the missing piece instead of saying "no store". */
      diagnostics: {
        store: !!storeId(),
        token: !!process.env.VERCEL_API_TOKEN,
        read: readStatus()
      }
    });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return json(res, 405, { error: 'Use GET or POST.' });
  }

  if (!configured) {
    return json(res, 503, {
      error: 'No Edge Config store is attached yet, so there is nowhere to save. ' +
             'Attach a store to the project and set VERCEL_API_TOKEN.'
    });
  }

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = null; } }
  const next = normalise(body && body.rules);
  if (!next) {
    return json(res, 400, { error: 'Those rules did not validate. Nothing was saved.' });
  }

  if (!owner && !sameEmails(next.admins, rules.admins)) {
    return json(res, 403, {
      error: 'Only an owner can change who is an admin. Your other changes were not saved.'
    });
  }

  /* Which pages are owners-only is an owner's call. Otherwise an admin could open
     an owners-only page to everyone by changing one dropdown — the tier would
     restrict nothing it was meant to. Compared as path sets, so adding, removing
     or re-levelling a rule at that tier all count, while editing an ordinary rule
     does not. */
  const ownerPaths = r => (r.routes || []).filter(x => x.access === 'owner')
    .map(x => x.path).sort().join('\n');
  if (!owner && ownerPaths(next) !== ownerPaths(rules)) {
    return json(res, 403, {
      error: 'Only an owner can change which pages are owners-only. ' +
             'Your other changes were not saved.'
    });
  }

  /* Who may publish into a staging lane is an owner's call, for the same reason the admin list is: it decides
     who can put code on the site. Compared as a whole, so adding, removing or editing a lane all count. */
  /* ── outside people ────────────────────────────────────────────────────────────────────────────────────────────────────
     Owners, admins and lane publishers are company accounts, full stop. Any OTHER outside address named on a page, a tool or in a
     team has to be a guest, and guests are an owner's to invite, renew or remove (they let a person from outside into the site).
     An owner who names someone outside on a rule gets them added as a guest for 30 days; an admin who does is refused. */
  const dom = '@' + allowedDomain();
  const outside = e => !String(e).toLowerCase().endsWith(dom);
  /* A new outside admin is refused. One already in the store (a hand edit; isAdmin ignores it anyway) is quietly dropped on this save,
     so it cannot block every other change an admin makes. */
  if ((next.admins || []).some(e => outside(e) && !(rules.admins || []).includes(e))) return json(res, 400, { error: 'Admins must be ' + dom + ' accounts. Nothing was saved.' });
  next.admins = (next.admins || []).filter(e => !outside(e));
  for (const [ln, l] of Object.entries(next.lanes || {})) {
    if ((l.people || []).some(outside)) return json(res, 400, { error: 'Only ' + dom + ' accounts can publish to a lane (' + ln + '). Nothing was saved.' });
  }
  const guestKey = r => JSON.stringify(Object.keys(r.guests || {}).sort().map(k => [k, r.guests[k].expires]));
  if (!owner && guestKey(next) !== guestKey(rules)) {
    return json(res, 403, { error: 'Only an owner can invite, renew or remove guests. Your other changes were not saved.' });
  }
  const named = new Set();
  for (const r of next.routes) (r.people || []).forEach(e => named.add(e));
  for (const members of Object.values(next.groups || {})) (members || []).forEach(e => named.add(e));
  /* Only an address named for the first time in THIS save counts. One already on a rule without being a guest (a hand edit, a guest
     removed some other way) is inert, since the gate forbids an outside address that is not an active guest, and must not block
     every unrelated change; nor is it invited behind anyone's back. */
  const before = new Set();
  for (const r of rules.routes || []) (r.people || []).forEach(e => before.add(e));
  for (const members of Object.values(rules.groups || {})) (members || []).forEach(e => before.add(e));
  const strays = [...named].filter(e => outside(e) && !(next.guests || {})[e] && !before.has(e));
  if (strays.length) {
    if (!owner) return json(res, 403, { error: 'Only an owner can invite guests (' + strays.slice(0, 3).join(', ') + '). Your other changes were not saved.' });
    next.guests = next.guests || {};
    const end = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10);
    for (const e of strays) next.guests[e] = { expires: end, by: email };
  }

  /* Compared by what each lane really lets in: its people, its groups AND who is in those groups. Comparing only the group names
     let an admin add themselves to a group already on a lane and so gain the right to publish there. */
  const laneKey = r => JSON.stringify(Object.keys(r.lanes || {}).sort().map(k => [k,
    [...(r.lanes[k].groups || [])].sort(), [...(r.lanes[k].people || [])].sort(), laneMembers(r, k).sort()]));
  if (!owner && laneKey(next) !== laneKey(rules)) {
    return json(res, 403, {
      error: 'Only an owner can change who publishes to a staging lane. Your other changes were not saved.'
    });
  }

  /* Who published a private page is not on the page's row in Access Control, so a save from the page could not carry it; keep what the
     stored rule already says. */
  for (const r of next.routes) {
    if (r.access === 'lane' && !r.creator) {
      const was = (rules.routes || []).find(x => x.path === r.path && x.creator);
      if (was) r.creator = was.creator;
    }
  }

  const saved = await saveRules(next);
  if (!saved.ok) {
    return json(res, saved.status, saved.detail ? { error: saved.error, detail: saved.detail } : { error: saved.error });
  }

  return json(res, 200, { ok: true, rules: saved.rules });
}
