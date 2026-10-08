/* Who is signed in, and which doors are open? shell.js calls this to decide
   whether to draw the locks, the ADMIN group and the user card — and whether
   the modal offers Google, a password field, or both.

   Always 200 — "nobody" is a valid answer, not an error. */

import { readAnySession, authModes, GATE_ENABLED, isOwner }
  from '../_session.js';
import { loadRules, isAdmin, groupsFor, guestActive } from '../_access.js';

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  /* The answer differs per cookie, so it must never be cached by the CDN. */
  res.setHeader('Cache-Control', 'no-store, private');

  const modes = authModes();
  const payload = await readAnySession(req.headers.cookie);

  if (!payload) {
    return res.status(200).end(JSON.stringify({ signedIn: false, admin: false, modes,
                                                gate: GATE_ENABLED }));
  }

  /* Live, not the cookie's up-to-30-day-old claim — the same rules middleware.js
     enforces. Drawing an ADMIN group the edge would then 403 is worse than
     drawing nothing, and that is exactly what a stale claim produces the
     moment access-control is used to grant or revoke someone. */
  const rules = await loadRules();

  /* A guest is signed in, but is not a member of anything: no admin, no owner, no team (a team's name would draw that team's
     navigation, and tells a guest who works here). `guest` lets the page say so. */
  if (payload.guest) {
    if (!guestActive(payload.email, rules)) return res.status(200).end(JSON.stringify({ signedIn: false, admin: false, modes, gate: GATE_ENABLED }));
    return res.status(200).end(JSON.stringify({
      signedIn: true, guest: true, email: payload.email, name: payload.name || payload.email, picture: payload.picture || null,
      admin: false, owner: false, groups: [], via: 'guest', modes, gate: GATE_ENABLED
    }));
  }

  res.status(200).end(JSON.stringify({
    signedIn: true,
    email: payload.email || null,
    name: payload.name || payload.email,
    picture: payload.picture || null,
    /* No email means the shared-password door, which is admin by design —
       isAdmin() has no address to look up and would draw an empty rail. */
    admin: payload.email ? isAdmin(payload.email, rules) : !!payload.admin,
    /* The avatar's colour level. Owner is a strict subset of admin, so the shell
       tests owner first. The shared-password door has no address and is neither. */
    owner: payload.email ? isOwner(payload.email) : false,
    /* Named groups this address belongs to (e.g. "gtm") — shell.js uses this
       to decide which nav sections to draw, the same rules.groups an admin
       edits at /admin/access-control. */
    groups: payload.email ? groupsFor(payload.email, rules) : [],
    via: payload.via || 'google',
    modes,
    gate: GATE_ENABLED
  }));
}
