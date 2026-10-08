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

  if (req.method === 'GET') {
    return json(res, 200, {
      rules,
      owners: ownerEmails(),
      domain: allowedDomain(),
      you: { email, owner },
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
