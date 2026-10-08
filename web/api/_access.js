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
      { path: '/internal', access: 'internal', groups: [], people: [] },
      /* The component library. Its own surface rather than a page under
         /internal, because it renders its own chrome instead of the site shell.
         Internal tier again since 3 Oct 2026: the Design System page moved into
         the internal section so that everyone internal can use the Library tab.
         The review queue under it stays admin, and wins here by being the longer prefix. */
      { path: '/library',  access: 'internal', groups: [], people: [] },
      /* The drawn previews the Library's drawer shows, one HTML file per component. Same tier as the library. */
      { path: '/previews', access: 'internal', groups: [], people: [] },
      { path: '/library/review', access: 'admin', groups: [], people: [] },
      /* Agent Store: internal only. Made private 7 Oct 2026: "make it internal for now". */
      { path: '/agents',  access: 'internal', groups: [], people: [] },
      /* The review sheet is where a component is passed into skills/, so it is the owner's, and the
         Review tab of /internal/design-system shows admins what is waiting; only the owner can act on it. */
      { path: '/admin/review-sheet', access: 'owner', groups: [], people: [] },
      /* Analytics (usage log, visits and insights on one page) lists who ran a session and who opened
         which page, which admins have no need to see. The old /admin/usage-log, /visits and /insights
         paths redirect here before middleware runs (web/vercel.json).
         The original note on the usage log, still true of the page as a whole:
         NOTE: like any compiled route, this only fills a hole — once a store holds an
         /admin rule it covers this path and this line is never added, so the page
         is admin-tier at the edge and the OWNER check that really holds is the one in
         api/_usage-log.js, which the data cannot be read without. */
      { path: '/admin/analytics', access: 'owner', groups: [], people: [] },
      { path: '/admin/system-health', access: 'owner', groups: [], people: [] },
      /* Drop Studio (staging): everyone in the organisation. It was the owner alone from 8 Oct 2026 ("start
         phase 1 with the owner gate") and opened to the org on 9 Oct 2026 ("keep permission for everyone in the
         org") so the team can react to it. Anyone in the org can browse, download, make a picture request and
         answer ChatGPT's question; accepting, changing or discarding a picture stays the owner's, checked in
         api/_drop-studio.js and not by this rule. */
      { path: '/internal/staging/drop-studio', access: 'internal', groups: [], people: [] },
      /* Ad landers are public on purpose. An ad page's whole job is to be
         pasted into Slack, sent to a client and run as paid media, and a
         social card cannot render from behind the gate: the scraper fetching
         the URL has no cookie, gets the sign-in bounce, and shows a grey box.
         Longest prefix wins, so this opens exactly this page — everything
         else under /internal stays internal. Ruled by Utsav 22 Sep 2026.
         NOTE: the page calls /api/faq, which spends API credit per question.
         That endpoint is rate-limited because of this line. */
      { path: '/internal/staging/ai-crm-lander', access: 'public', groups: [], people: [] }
    ]
  };
}

/* ── why a stored ruleset cannot silently un-gate a new page ────────────────
   A store that returns routes REPLACES the compiled ones outright. That is
   correct for the paths it knows about and dangerous for the ones it does not:
   ship a new gated prefix in code, and a store written before that prefix
   existed has no rule covering it, ruleFor() returns null, and decide()
   answers 'allow'. The matcher runs, the gate says yes, and the page is public.
   Nothing reports it — it looks exactly like a page that was meant to be open.

   So a compiled route survives unless the store actually covers it. The store
   still wins wherever it has an opinion: a stored /library rule, or any stored
   ancestor of it, takes precedence as before. This only fills genuine holes. */
export function withFallbacks(rules) {
  const covered = path => rules.routes.some(
    r => path === r.path || path.startsWith(r.path + '/')
  );
  const missing = defaultRules().routes.filter(r => !covered(r.path));
  if (!missing.length) return rules;
  return { ...rules, routes: rules.routes.concat(missing) };
}

/* ── reading the store ────────────────────────────────────────────────────
   Vercel writes the connection string when you attach the store. The product
   is now called Global Config and the variable it writes is GLOBAL_CONFIG;
   it was Edge Config writing EDGE_CONFIG, and older projects still have that.
   Both are read, new name first, so neither a fresh store nor an existing one
   needs the code changed.

   Nothing here assumes the host or the id format. The connection string is
   whatever Vercel says it is; /items is appended to its path and the token
   query is preserved, which is the read shape for the whole config in one
   request. A rename that changes the host does not reach this code. */
export function connectionString() {
  return process.env.GLOBAL_CONFIG || process.env.EDGE_CONFIG || null;
}

/* The store id is the first path segment — NOT matched against an `ecfg_`
   prefix. The prefix is Vercel's to change, and hard-coding it would turn a
   rename into a silent "no store attached". */
export function storeId() {
  const conn = connectionString();
  if (!conn) return null;
  try {
    const seg = new URL(conn).pathname.split('/').filter(Boolean);
    return seg[0] || null;
  } catch { return null; }
}

function itemsURL() {
  const conn = connectionString();
  if (!conn) return null;
  try {
    const u = new URL(conn);
    if (!u.pathname.endsWith('/items')) {
      u.pathname = u.pathname.replace(/\/$/, '') + '/items';
    }
    return u.toString();
  } catch { return null; }
}

/* What happened the last time the store was read. The page shows this, so a
   misconfiguration says which misconfiguration instead of silently looking
   like "no store attached". Never carries the URL or the token. */
let lastRead = { state: 'not-tried', detail: null };
export function readStatus() { return lastRead; }

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
  if (!url) { lastRead = { state: 'no-store', detail: null }; return defaultRules(); }

  let rules = null;
  try {
    const res = await fetch(url, { headers: { accept: 'application/json' } });
    if (!res.ok) {
      lastRead = { state: 'http-error', detail: String(res.status) };
    } else {
      const items = await res.json();
      rules = normalise(items && items.access);
      if (rules) rules = withFallbacks(rules);
      lastRead = rules
        ? { state: 'ok', detail: null }
        /* A brand-new store has no `access` key yet. That is not an error —
           it is the state between attaching the store and the first Save. */
        : { state: 'empty', detail: null };
    }
  } catch (e) {
    /* Network trouble reading the store is not a reason to change who can see
       what. Fall through to the compiled defaults. */
    lastRead = { state: 'unreachable', detail: null };
  }

  const out = rules || defaultRules();
  cache = { at: now, rules: out };
  return out;
}

/* ── writing ──────────────────────────────────────────────────────────
   The one place that writes the rules. /api/access (an admin saving the Access Control page) and the
   request-access approval in Slack both come through here, so the owners-are-admins rule and the cache
   drop cannot be done in one path and forgotten in the other. Returns { ok: true, rules } or
   { ok: false, status, error, detail? }; the caller decides how to say it. The token is in the request
   and never in what comes back. */
export async function saveRules(next) {
  const id = storeId();
  if (!id || !process.env.VERCEL_API_TOKEN) {
    return { ok: false, status: 503, error: 'No Edge Config store is attached yet, so there is nowhere to save. ' +
      'Attach a store to the project and set VERCEL_API_TOKEN.' };
  }
  /* An owner cannot be dropped from the admin list, because owners are admins by definition. */
  const merged = { ...next, admins: [...new Set([...ownerEmails(), ...next.admins])] };
  const team = process.env.VERCEL_TEAM_ID;
  const url = 'https://api.vercel.com/v1/edge-config/' + id + '/items' + (team ? '?teamId=' + encodeURIComponent(team) : '');
  let upstream;
  try {
    upstream = await fetch(url, {
      method: 'PATCH',
      headers: { Authorization: 'Bearer ' + process.env.VERCEL_API_TOKEN, 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: [{ operation: 'upsert', key: 'access', value: merged }] })
    });
  } catch (e) {
    return { ok: false, status: 502, error: 'Could not reach the Edge Config API.' };
  }
  if (!upstream.ok) {
    const detail = await upstream.text().catch(() => '');
    return { ok: false, status: 502, error: 'Edge Config refused the write (' + upstream.status + ').', detail: detail.slice(0, 400) };
  }
  /* The read-through cache would otherwise keep serving the old answer for up to its TTL. */
  invalidate();
  return { ok: true, rules: merged };
}

/* ── granting one person one page ─────────────────────────────────────
   What Approve does on a request-access message. It opens THAT page for THAT person and nothing wider:
   a rule is added for the exact path, copied from the rule the page falls under today, plus the person.
   Editing the rule the page inherits would open every page under that prefix to them (a rule on /admin
   covers every admin page), and replacing it with a bare list would drop the groups that can open the page
   now. Owners-only pages cannot be granted this way (owners come from the environment, not the rules).
   Pure: returns the next rules, { rules, already: true } when they can already open it, or null when it
   cannot be granted. */
export function grantPage(rules, pathname, email) {
  const path = String(pathname || '').replace(/\/+$/, '') || '/';
  const who = String(email || '').trim().toLowerCase();
  if (!rules || !path.startsWith('/') || !who.includes('@')) return null;
  const rule = ruleFor(path, rules);
  if (!rule || rule.access === 'owner' || rule.access === 'public') return null;
  const exact = rules.routes.find(r => r.path === path);
  const base = exact || rule;
  /* `admin` and `internal` carry no list of their own: the page becomes a people rule, and admins still pass
     because the admin check comes before the rule in decide(). */
  const keep = base.access === 'people';
  const next = {
    path,
    access: 'people',
    groups: keep ? [...base.groups] : [],
    people: keep ? [...base.people] : []
  };
  if (next.people.includes(who)) return { rules, already: true };
  next.people.push(who);
  const routes = exact ? rules.routes.map(r => (r.path === path ? next : r)) : [...rules.routes, next];
  return { rules: { ...rules, routes }, already: false };
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
      /* `owner` sits ABOVE `admin`. Anything not on this list falls to `internal`,
         which is why the level had to be added here before the page could offer it:
         a stored `owner` rule would otherwise be silently loosened to any verified
         @gushwork.ai account on the very next read. */
      const access = ['public', 'internal', 'admin', 'owner', 'people'].includes(r.access)
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

/* Which named groups (from `rules.groups`) this email is a member of. Used to
   decide nav visibility client-side — the sidebar hides a group-gated section
   from someone who is signed in but not in the group, rather than drawing a
   link that only 403s once clicked. Admins are not added here: they see every
   nav section already, by checking `session.admin` at the call site, not by
   being enrolled in every group. */
export function groupsFor(email, rules) {
  if (!email) return [];
  const e = String(email).toLowerCase();
  const out = [];
  for (const [name, members] of Object.entries(rules.groups || {})) {
    if ((members || []).includes(e)) out.push(name);
  }
  return out;
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

  /* Owners-only is checked BEFORE the admin shortcut below, because that shortcut
     is exactly what it exists to override: an admin can open anything except a
     page that is set to owners. Owners are listed by the environment, not the
     store, so an edited or emptied store cannot lock them out of their own tier.

     One known gap, inherited rather than introduced: the shared-password door
     above signs a session with no email and returns `allow` for every rule, and
     an owners-only page is no exception. Closing it means closing that door. */
  if (rule.access === 'owner') return isOwner(email) ? 'allow' : 'forbid';

  /* An admin can open anything else. Stated once, here, rather than repeated as a
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


/* ── describing ───────────────────────────────────────────────────────────────
   The words a page shows for a rule ("For everyone", "Only for HR"), so a badge is derived
   from the rule and not typed next to it. The Tools page used to say "For everyone" on every
   tool whatever its rule said, which is how a tool limited to HR went on advertising itself
   to the whole company.

   `internal` reads "For everyone" because the pages that show it are already inside the
   company hub; only `public` needs the word Public. */
function groupLabel(name) {
  const g = String(name || '').trim();
  if (!g) return '';
  /* hr, gtm -> HR, GTM (initialisms); design -> Design */
  return g.length <= 4 ? g.toUpperCase() : g.charAt(0).toUpperCase() + g.slice(1);
}

export function describeAccess(rule) {
  if (!rule) return { level: 'internal', label: 'For everyone', restricted: false };
  const level = rule.access;
  switch (level) {
    case 'public':   return { level, label: 'Public', restricted: false };
    case 'internal': return { level, label: 'For everyone', restricted: false };
    case 'admin':    return { level, label: 'Admins only', restricted: true };
    case 'owner':    return { level, label: 'Owners only', restricted: true };
    case 'people': {
      const groups = (rule.groups || []).map(groupLabel).filter(Boolean);
      const n = (rule.people || []).length;
      if (groups.length) {
        return { level, restricted: true,
                 label: 'Only for ' + groups.join(', ') + (n ? ' + ' + n + (n === 1 ? ' person' : ' people') : '') };
      }
      /* Named people and no group. "Restricted", whatever the count: "One person" told everyone at the
         company who the tool's single user was, and "Specific people" said nothing a lock does not. */
      return { level, restricted: true, label: 'Restricted' };
    }
    default:         return { level: 'internal', label: 'For everyone', restricted: false };
  }
}
