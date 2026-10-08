/* ============================================================================
   _certificates.js — Certificate Creator's shared files.

   Served as /api/certificates, a module behind gw.js like its neighbours, so it costs no new
   function against the Hobby plan's 12.

   TWO LAYERS OF ACCESS.
   1. The tool. Whoever the gate lets open it, checked with the gate's own decide() on the tool's
      path, so the list and the page can never disagree. middleware.js gates /internal/* pages,
      not /api/*, so this is checked here on every request.
   2. Each certificate (Utsav, 5 Oct 2026). Its creator owns it. `access` says who else sees it:
      `general` is 'tool' (everyone who can open the tool) or 'restricted' (only the people
      listed), `role` is what 'tool' grants ('edit' or 'view'), and `people` names work emails
      with their own role. Anyone who can edit a file can change who has access, as in Google
      Docs (Utsav, 6 Oct 2026); everyone in it can see who has access; only the owner and hub admins
      delete it. A certificate
      saved before this existed has no `access` and reads as everyone-can-edit, which is what it was.
      The shared-password door has no identity, so it is treated as an admin, the same choice the
      gate itself makes for that session.

   FILES (Utsav, 5 Oct 2026). Each certificate is a file with a `title`, so sales and HR can each
   make their own and share them, Canva-style. Saving is guarded against clashes: an edit carries
   `base`, the updatedAt it started from, and if someone saved since, the save is refused with 409
   and the newer copy, unless the editor chose `force` (keep mine).

   WHAT IT STORES. One hash, `gw:certs`: id -> {id, title, data, access, savedBy, savedAt, updatedBy,
   updatedAt}. `data` is only the certificate's own text fields, whitelisted and length-capped;
   `access` is validated (domain emails only, at most MAX_PEOPLE). Nothing else a browser sends
   is kept. A second hash, `gw:cert-names`, keeps each visitor's display name from their own
   verified session (never from a request body), so the tool can show "Utsav" instead of an
   address; the list read returns the names of the people it mentions.

   HOW MUCH. Capped at MAX_ITEMS certificates; a save past the cap is refused, not trimmed, so
   nobody's saved work disappears without them deleting it.
   ========================================================================= */

import { readAnySession } from './_session.js';
import { loadRules, decide, isAdmin, allowedDomain } from './_access.js';

const KEY = 'gw:certs';
const NAMES = 'gw:cert-names';   // email -> the display name from that person's own Google sign-in
const MAX_ITEMS = 1000;
const MAX_PEOPLE = 50;
const MAX_TITLE = 120;
const MAX_PAGES = 50;
const cleanTitle = (t) => (typeof t === 'string' ? t.trim().slice(0, MAX_TITLE) : '');
/* Certificate Creator lives at /internal/certificate-creator (renamed 5 Oct 2026). The older paths
   stay listed so a rule set on them before the rename still counts. */
const TOOL_PATHS = ['/internal/certificate-creator', '/internal/award-certificate', '/internal/staging/award-certificate'];
const FIELDS = {
  template: 40, preset: 40, name: 80, headline: 200, before: 400, award: 120, after: 400,
  period: 40, signature: 60, signedBy: 120,
};
const DEFAULT_ACCESS = { general: 'tool', role: 'edit', people: [] };
const ROLES = ['view', 'edit'];

function store() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url, token } : null;
}

async function pipe(cfg, cmds) {
  const r = await fetch(`${cfg.url}/pipeline`, {
    method: 'POST',
    headers: { authorization: `Bearer ${cfg.token}`, 'content-type': 'application/json' },
    body: JSON.stringify(cmds),
  });
  if (!r.ok) throw new Error(`kv ${r.status}`);
  return r.json();
}

function json(res, status, body) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, private');
  res.status(status).end(JSON.stringify(body));
}

function clean(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const out = {};
  for (const [k, max] of Object.entries(FIELDS)) {
    const v = raw[k];
    out[k] = typeof v === 'string' ? v.slice(0, max) : '';
  }
  out.nameOwnLine = raw.nameOwnLine === true;
  return out;
}

/* A file's pages: each a certificate's fields. `data` stays the first page, so a file saved
   before pages existed reads as one page and list views have something to show. */
function cleanPages(raw) {
  if (!Array.isArray(raw) || !raw.length) return null;
  const pages = raw.slice(0, MAX_PAGES).map(clean).filter(Boolean);
  return pages.length ? pages : null;
}

/* Returns a valid access object, or a string saying what is wrong. */
function cleanAccess(raw, owner) {
  if (!raw || typeof raw !== 'object') return 'Bad access.';
  const general = raw.general === 'restricted' ? 'restricted' : 'tool';
  const role = ROLES.includes(raw.role) ? raw.role : 'edit';
  const list = Array.isArray(raw.people) ? raw.people : [];
  if (list.length > MAX_PEOPLE) return `At most ${MAX_PEOPLE} people.`;
  const domain = '@' + allowedDomain();
  const seen = new Set();
  const people = [];
  for (const p of list) {
    const email = String((p && p.email) || '').trim().toLowerCase();
    if (!email || email === owner || seen.has(email)) continue;
    if (!/^[^\s@]+@[^\s@]+$/.test(email) || !email.endsWith(domain)) return `${email} is not a ${domain} address.`;
    seen.add(email);
    people.push({ email, role: ROLES.includes(p.role) ? p.role : 'view' });
  }
  return { general, role, people };
}

function newId() {
  const b = new Uint8Array(9);
  crypto.getRandomValues(b);
  return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
}

/* What this person may do with this certificate. */
function perms(item, me) {
  /* A GUEST (an outside person let in to this tool) sees and changes only what they made themselves. They are never on a share
     list (those take company addresses only), and the 'everyone who can open the tool' default is about the company's people, so
     it does not reach them: the company's certificates are not theirs to see. */
  if (me.guest) {
    const own = item.savedBy === me.email;
    return { view: own, edit: own, share: false, manage: own };
  }
  const access = item.access || DEFAULT_ACCESS;
  const manage = me.admin || item.savedBy === me.email;
  const person = (access.people || []).find((p) => p.email === me.email);
  const edit = manage || (person && person.role === 'edit') || (access.general === 'tool' && access.role === 'edit');
  const view = edit || !!person || access.general === 'tool';
  // share: change who has access (every editor); manage: delete (the owner and hub admins)
  return { view, edit, share: edit, manage };
}

function present(item, me) {
  return { ...item, access: item.access || DEFAULT_ACCESS, can: perms(item, me) };
}

export default async function handler(req, res) {
  const session = await readAnySession(req.headers.cookie);       // a guest is accepted here, and only here, and only if decide() below allows the tool
  if (!session) return json(res, 401, { error: 'Not signed in.' });
  const rules = await loadRules();
  if (!TOOL_PATHS.some((p) => decide(p, session, rules) === 'allow')) {
    return json(res, 403, { error: 'This list is limited to the people who can open the tool.' });
  }
  const cfg = store();
  if (!cfg) return json(res, 503, { error: 'The store is not connected.' });
  const email = session.email ? String(session.email).toLowerCase() : '';
  const me = {
    email: email || '(shared password)',
    admin: !session.guest && (!email || session.via === 'password' || isAdmin(email, rules)),
    guest: !!session.guest,
  };

  // remember this visitor's own name, from the signed session only
  const myName = email && session.name && session.name !== email ? String(session.name).slice(0, 80) : '';
  if (myName && !me.guest) { try { await pipe(cfg, [['HSET', NAMES, email, myName]]); } catch { /* a missing name falls back to the address */ } }

  const load = async (id) => {
    const r = await pipe(cfg, [['HGET', KEY, id]]);
    return r[0] && r[0].result ? JSON.parse(r[0].result) : null;
  };

  try {
    if (req.method === 'GET') {
      const r = await pipe(cfg, [['HVALS', KEY]]);
      const items = ((r[0] && r[0].result) || [])
        .map((s) => { try { return JSON.parse(s); } catch { return null; } })
        .filter(Boolean)
        .map((it) => present(it, me))
        .filter((it) => it.can.view)
        .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
      const emails = new Set([me.email]);
      for (const it of me.guest ? [] : items) {
        emails.add(it.savedBy); emails.add(it.updatedBy);
        (it.access.people || []).forEach((p) => emails.add(p.email));
      }
      const list = [...emails].filter((e) => e && e.includes('@'));
      let names = {};
      if (list.length) {
        const n = await pipe(cfg, [['HMGET', NAMES, ...list]]);
        const vals = (n[0] && n[0].result) || [];
        list.forEach((e, i) => { if (vals[i]) names[e] = vals[i]; });
      }
      return json(res, 200, { items, me: me.email, names });
    }

    if (req.method === 'POST') {
      let body = req.body;
      if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = null; } }
      if (!body || typeof body !== 'object') return json(res, 400, { error: 'Nothing to save.' });
      const now = new Date().toISOString();
      const asked = typeof body.id === 'string' && /^[a-f0-9]{18}$/.test(body.id) ? body.id : '';

      if (asked) {
        const prev = await load(asked);
        if (!prev) return json(res, 404, { error: 'That certificate was deleted.' });
        const can = perms(prev, me);
        if (!can.view) return json(res, 404, { error: 'That certificate was deleted.' });
        const item = { ...prev };
        const editing = body.data !== undefined || body.pages !== undefined || body.title !== undefined;
        if (editing && !can.edit) return json(res, 403, { error: 'You can view this certificate but not edit it.' });
        // clash guard: someone saved after this editor opened the file
        if (editing && !body.force && typeof body.base === 'string' && body.base !== prev.updatedAt) {
          return json(res, 409, { error: 'Someone saved a newer version.', item: present(prev, me) });
        }
        if (body.title !== undefined) {
          item.title = cleanTitle(body.title);
          item.updatedBy = me.email;
          item.updatedAt = now;
        }
        if (body.pages !== undefined) {
          const pages = cleanPages(body.pages);
          if (!pages) return json(res, 400, { error: 'A file needs at least one page.' });
          item.pages = pages;
          item.data = pages[0];
          item.updatedBy = me.email;
          item.updatedAt = now;
        } else if (body.data !== undefined) {
          const data = clean(body.data);
          if (!data) return json(res, 400, { error: 'Nothing to save.' });
          item.data = data;
          item.pages = [data];
          item.updatedBy = me.email;
          item.updatedAt = now;
        }
        if (body.access !== undefined) {
          if (!can.share) return json(res, 403, { error: 'You can view this certificate but not change who has access.' });
          const access = cleanAccess(body.access, prev.savedBy);
          if (typeof access === 'string') return json(res, 400, { error: access });
          item.access = access;
        }
        await pipe(cfg, [['HSET', KEY, item.id, JSON.stringify(item)]]);
        return json(res, 200, { item: present(item, me) });
      }

      const pages = cleanPages(body.pages) || (body.data ? [clean(body.data)].filter(Boolean) : null);
      if (!pages || !pages.length) return json(res, 400, { error: 'Nothing to save.' });
      const data = pages[0];
      const r = await pipe(cfg, [['HLEN', KEY]]);
      if ((r[0] && r[0].result) >= MAX_ITEMS) return json(res, 507, { error: 'The list is full. Delete some old certificates first.' });
      const access = body.access ? cleanAccess(body.access, me.email) : DEFAULT_ACCESS;
      if (typeof access === 'string') return json(res, 400, { error: access });
      const item = { id: newId(), title: cleanTitle(body.title), data, pages, access, savedBy: me.email, savedAt: now, updatedBy: me.email, updatedAt: now };
      await pipe(cfg, [['HSET', KEY, item.id, JSON.stringify(item)]]);
      return json(res, 200, { item: present(item, me) });
    }

    if (req.method === 'DELETE') {
      const id = String((req.query && req.query.id) || '');
      if (!/^[a-f0-9]{18}$/.test(id)) return json(res, 400, { error: 'Bad id.' });
      const prev = await load(id);
      if (prev && !perms(prev, me).manage) return json(res, 403, { error: 'Only the owner can delete this certificate.' });
      await pipe(cfg, [['HDEL', KEY, id]]);
      return json(res, 200, { ok: true, id });
    }

    res.setHeader('Allow', 'GET, POST, DELETE');
    return json(res, 405, { error: 'Method not allowed.' });
  } catch {
    return json(res, 502, { error: 'The store did not answer. Try again.' });
  }
}
