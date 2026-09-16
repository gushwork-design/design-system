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
import { loadRules, normalise, ownerEmails, isOwner, isAdmin,
         invalidate, allowedDomain, storeId, readStatus } from './_access.js';

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
     claim. The cookie is signed for 12 hours; a revoked admin holding one
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

  /* An owner cannot be dropped from the admin list, because owners are admins
     by definition — storing it otherwise would make the page disagree with
     what the gate actually does. */
  const merged = {
    ...next,
    admins: [...new Set([...ownerEmails(), ...next.admins])]
  };

  const id = storeId();
  const team = process.env.VERCEL_TEAM_ID;
  const url = 'https://api.vercel.com/v1/edge-config/' + id + '/items' +
              (team ? '?teamId=' + encodeURIComponent(team) : '');

  let upstream;
  try {
    upstream = await fetch(url, {
      method: 'PATCH',
      headers: {
        Authorization: 'Bearer ' + process.env.VERCEL_API_TOKEN,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        items: [{ operation: 'upsert', key: 'access', value: merged }]
      })
    });
  } catch (e) {
    return json(res, 502, { error: 'Could not reach the Edge Config API.' });
  }

  if (!upstream.ok) {
    const detail = await upstream.text().catch(() => '');
    /* The token is in the request, never in the response — surface the status
       and the API's own message, nothing from the environment. */
    return json(res, 502, {
      error: 'Edge Config refused the write (' + upstream.status + ').',
      detail: detail.slice(0, 400)
    });
  }

  /* Read-through cache in _access.js would otherwise keep serving the old
     answer for up to its TTL, including to the page that just saved. */
  invalidate();

  return json(res, 200, { ok: true, rules: merged });
}
