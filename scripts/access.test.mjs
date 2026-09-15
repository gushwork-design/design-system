/* Tests for web/api/_access.js — the one function that decides who may open
   what. Run it:  node scripts/access.test.mjs
 
   This file exists because the decision moved from two hardcoded prefixes to
   data someone edits in a browser, and the failure modes are quiet ones: a
   prefix that matches too much, a store that returns junk and takes the gate
   with it, an owner who can be edited out of their own building, and — the one
   that was actually written and caught before it shipped — a session with no
   email bouncing forever between the gate and the login page. */

import { normalise, decide, isAdmin, isOwner, ruleFor, defaultRules }
  from '../web/api/_access.js';

let pass = 0, fail = 0;
const t = (name, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (ok) pass++;
  else { fail++; console.log('FAIL', name, '\n  got ', JSON.stringify(got),
                             '\n  want', JSON.stringify(want)); }
};

const rules = normalise({
  admins: ['Priya@Gushwork.ai'],
  groups: { GTM: ['sam@gushwork.ai'] },
  routes: [
    { path: '/admin',            access: 'admin' },
    { path: '/internal',         access: 'internal' },
    { path: '/internal/staging', access: 'people', groups: ['gtm'],
      people: ['chris@gushwork.ai'] },
    { path: '/internal/open',    access: 'public' }
  ]
});
const S = email => ({ email });

/* tiers */
t('owner is admin without being listed', isAdmin('utsav.singh@gushwork.ai', rules), true);
t('stored admin, case-insensitive', isAdmin('priya@gushwork.ai', rules), true);
t('a colleague is not an admin', isAdmin('sam@gushwork.ai', rules), false);
t('second owner', isOwner('design@gushwork.ai'), true);

/* matching */
t('longest prefix wins', ruleFor('/internal/staging/crm', rules).path, '/internal/staging');
t('prefixes respect segment boundaries', ruleFor('/internal/stagingzzz', rules).path, '/internal');

/* decisions */
t('no session on a gated page', decide('/internal', null, rules), 'signin');
t('outside the domain', decide('/internal', S('x@other.com'), rules), 'forbid');
t('colleague on an internal page', decide('/internal', S('sam@gushwork.ai'), rules), 'allow');
t('colleague outside the group', decide('/internal/staging', S('nina@gushwork.ai'), rules), 'forbid');
t('group member', decide('/internal/staging', S('sam@gushwork.ai'), rules), 'allow');
t('named person', decide('/internal/staging', S('chris@gushwork.ai'), rules), 'allow');
t('an admin opens anything', decide('/internal/staging', S('priya@gushwork.ai'), rules), 'allow');
t('colleague on an admin page', decide('/admin/access-control', S('sam@gushwork.ai'), rules), 'forbid');
t('owner on an admin page', decide('/admin/access-control', S('utsav.singh@gushwork.ai'), rules), 'allow');
t('a public child of a gated parent', decide('/internal/open', null, rules), 'allow');
t('an ungoverned path stays open', decide('/style-guide', null, rules), 'allow');

/* the shared-password door — no email, admin by design */
const PW = { email: null, admin: true, via: 'password' };
t('password session opens internal', decide('/internal', PW, rules), 'allow');
t('password session opens admin', decide('/admin/access-control', PW, rules), 'allow');
t('password session opens a group page', decide('/internal/staging', PW, rules), 'allow');
t('an emailless non-admin still signs in', decide('/internal', { email: null, admin: false }, rules), 'signin');

/* untrusted input */
t('an empty ruleset is rejected so the caller falls back', normalise({ routes: [] }), null);
t('a route with no leading slash is dropped', normalise({ routes: [{ path: 'x' }, { path: '/ok' }] }).routes.length, 1);
t('an unknown access level is not a wildcard', normalise({ routes: [{ path: '/x', access: 'wide-open' }] }).routes[0].access, 'internal');
t('non-addresses are filtered out of the admin list', normalise({ routes: [{ path: '/x' }], admins: ['nope', 'a@b.co'] }).admins, ['a@b.co']);
t('the compiled fallback is the old two tiers', defaultRules().routes.map(r => r.access), ['admin', 'internal']);

/* The unconfigured path — no Edge Config store — is what every deployment
   serves until a store is attached, and it is the one the page crashed on:
   defaultRules() omitted `groups`/`people`, so the UI's r.groups.map threw.
   Consumers treat a route as whatever normalise() produces, so these must
   agree on shape. */
for (const r of defaultRules().routes) {
  t(`default route ${r.path} carries a groups array`, Array.isArray(r.groups), true);
  t(`default route ${r.path} carries a people array`, Array.isArray(r.people), true);
}
t('defaults survive a round-trip through normalise',
  normalise(defaultRules()).routes, defaultRules().routes);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
