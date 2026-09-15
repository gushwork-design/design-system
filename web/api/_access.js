/* ============================================================================
   _access.js — who can see what, and where that answer comes from.

   Until 15 Sep 2026 the answer was compiled in: middleware.js matched two
   fixed prefixes, /internal/* for any @gushwork.ai and /admin/* for the
   ADMIN_EMAILS env var. Changing either meant an env edit and a redeploy, so
   "give the GTM team staging and nobody else" had no way to be expressed at
   all. This file is the runtime version of that decision.

   Web Crypto and fetch only, no node: imports and no dependencies — the SAME
   code runs in the Edge runtime middleware.js uses and in the Node runtime
   the /api/* functions use, and package.json stays dependency-free on
   purpose. That is why Edge Config is read over plain HTTPS from the
   EDGE_CONFIG connection string rather than through @vercel/edge-config.

   THE OWNER TIER IS NOT STORED HERE, AND THAT IS THE POINT
   --------------------------------------------------------
   Owners come from the environment and cannot be edited through the page.
   Admins are editable; owners are not. Without that split, the first admin
   to open /admin/access-control could promote anyone, demote the owner and
   lock the building from the inside — a self-serve page that can rewrite who
   is allowed to use it is not a gate, it is a door with the key taped to it.
   ========================================================================= */

/* Owners: always admin, never removable through the UI. Ruled by Utsav
   15 Sep 2026 — "I will be only owner with design@gushwork.ai too". */
export function ownerEmails() {
  const raw = process.env.OWNER_EMAILS || 'utsav.singh@gushwork.ai,design@gushwork.ai';
  return raw.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
}

export function allowedDomain() {
  return (process.env.ALLOWED_DOMAIN || 'gushwork.ai').toLowerCase();
}

/* The compiled fallback IS the old behaviour, exactly. If the Edge Config
   store is missing, unreachable or malformed, the gate keeps working the way
   it worked before this file existed — it does not fail open, and it does not
   fail closed and lock out the owner. A store outage must be invisible. */
export function defaultRules() {
  const admins = (process.env.ADMIN_EMAILS || ownerEmails().join(','))
    .split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  return {
    version: 1,
    admins,
    groups: {},
    /* Longest prefix wins, so order here is presentation, not precedence.
       `groups` and `people` are spelled out rather than left undefined: every
       consumer treats a route as the shape normalise() produces, and a route
       from here reaches exactly the same code. Omitting them crashed the
       access-control page on the one path that matters most — the unconfigured
       one, which is what every project sees before a store is attached. */
    routes: [
      { path: '/admin',    access: 'admin',    groups: [], people: [] },
      { path: '/internal', access: 'internal', groups: [], people: [] }
    ]
  };
}

/* ── reading the store ────────────────────────────────────────────────────
   EDGE_CONFIG is the connection string Vercel writes when you attach a store
   to the project: https://edge-config.vercel.com/<id>?token=<read-token>.
   Appending /items to the path and keeping the token query gives the whole
   config in one request. */
function itemsURL() {
  const conn = process.env.EDGE_CONFIG;
  if (!conn) return null;
  try {
    const u = new URL(conn);
    if (!u.pathname.endsWith('/items')) {
      u.pathname = u.pathname.replace(/\/$/, '') + '/items';
    }
    return u.toString();
  } catch { return null; }
}

/* One fetch per request would be correct and slow: middleware runs on every
   gated page load. Edge Config is already edge-cached, so this is a small
   second layer — long enough to collapse a burst of requests, short enough
   that revoking someone's access takes effect while you are still looking at
   the screen. A grant that takes a minute to land is a support ticket; a
   revoke that takes a minute is a security incident, so this stays low. */
let cache = { at: 0, rules: null };
const TTL_MS = 10_000;

export async function loadRules() {
  const now = Date.now();
  if (cache.rules && now - cache.at < TTL_MS) return cache.rules;

  const url = itemsURL();
  if (!url) return defaultRules();

  let rules = null;
  try {
    const res = await fetch(url, { headers: { accept: 'application/json' } });
    if (res.ok) {
      const items = await res.json();
      rules = normalise(items && items.access);
    }
  } catch {
    /* Network trouble reading the store is not a reason to change who can see
       what. Fall through to the compiled defaults. */
  }

  const out = rules || defaultRules();
  cache = { at: now, rules: out };
  return out;
}

/** Drop the cache so a write is visible on the very next read. */
export function invalidate() { cache = { at: 0, rules: null }; }

/* Anything read from the store is untrusted input — it is written by an API
   route, but a hand-edited store or a half-applied write must not be able to
   turn a route into `undefined` and take the gate with it. */
export function normalise(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const emails = v => (Array.isArray(v) ? v : [])
    .map(s => String(s || '').trim().toLowerCase())
    .filter(s => s && s.includes('@'));

  const groups = {};
  if (raw.groups && typeof raw.groups === 'object') {
    for (const [name, members] of Object.entries(raw.groups)) {
      const key = String(name).trim().toLowerCase();
      if (key) groups[key] = emails(members);
    }
  }

  const routes = (Array.isArray(raw.routes) ? raw.routes : [])
    .map(r => {
      const path = String((r && r.path) || '').trim();
      if (!path.startsWith('/')) return null;
      const access = ['public', 'internal', 'admin', 'people'].includes(r.access)
        ? r.access : 'internal';
      return {
        path: path.replace(/\/+$/, '') || '/',
        access,
        groups: (Array.isArray(r.groups) ? r.groups : [])
          .map(s => String(s).trim().toLowerCase()).filter(Boolean),
        people: emails(r.people)
      };
    })
    .filter(Boolean);

  if (!routes.length) return null;
  return { version: 1, admins: emails(raw.admins), groups, routes };
}

/* ── deciding ─────────────────────────────────────────────────────────────── */

export function isOwner(email) {
  return !!email && ownerEmails().includes(String(email).toLowerCase());
}

/* Owners are admins whether or not the stored list says so, which is what
   makes the store un-lockable: emptying `admins` cannot shut the owner out. */
export function isAdmin(email, rules) {
  if (!email) return false;
  const e = String(email).toLowerCase();
  return isOwner(e) || (rules.admins || []).includes(e);
}

export function isInternal(email) {
  return !!email && String(email).toLowerCase().endsWith('@' + allowedDomain());
}

/** The most specific rule covering a path — longest matching prefix. */
export function ruleFor(pathname, rules) {
  const p = String(pathname || '/').replace(/\/+$/, '') || '/';
  let best = null;
  for (const r of rules.routes) {
    if (p === r.path || p.startsWith(r.path + '/')) {
      if (!best || r.path.length > best.path.length) best = r;
    }
  }
  return best;
}

/**
 * 'allow'   — serve it
 * 'signin'  — no session, or a session that could qualify after signing in
 * 'forbid'  — signed in, definitively not allowed
 *
 * The difference matters: bouncing a signed-in marketer to the login page to
 * sign in again as themselves is a loop, not a gate.
 */
export function decide(pathname, session, rules) {
  const rule = ruleFor(pathname, rules);
  if (!rule || rule.access === 'public') return 'allow';
  if (!session) return 'signin';

  /* The shared-password door signs `email: null, admin: true` on purpose —
     one key cannot tell an admin from anyone else, and locking the admin
     pages would make them unreachable while that door is the only one open.
     Every rule below is keyed on an address, so there is nothing to evaluate
     for this session: it keeps the all-access it has always had.

     Without this it falls to `signin`, which redirects to /login, where the
     same password produces the same session — an infinite bounce that locks
     every password holder out of every gated page. */
  if (session.via === 'password' || (!session.email && session.admin)) return 'allow';

  if (!session.email) return 'signin';

  const email = String(session.email).toLowerCase();

  /* An admin can open anything. Stated once, here, rather than repeated as a
     special case inside each branch below. */
  if (isAdmin(email, rules)) return 'allow';

  switch (rule.access) {
    case 'admin':
      return 'forbid';
    case 'internal':
      return isInternal(email) ? 'allow' : 'forbid';
    case 'people': {
      if (rule.people.includes(email)) return 'allow';
      for (const g of rule.groups) {
        if ((rules.groups[g] || []).includes(email)) return 'allow';
      }
      return 'forbid';
    }
    default:
      return 'forbid';
  }
}
