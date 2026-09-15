/* ============================================================================
   middleware.js — the actual gate.

   Runs at the edge, before any static file is served. This is what makes the
   internal pages genuinely private: without it, /internal/changelog is just a
   file on a public CDN and the locks in the sidebar are decoration.

   Two tiers:
     /internal/*  any verified @gushwork.ai account
     /admin/*     only the ADMIN_EMAILS allowlist

   The matcher below is deliberately narrow. Everything else — the Overview
   page, /foundation/tokens.css, the fonts, and critically
   /exports/dashboard/component-registry.json, which every dashboard the
   plugin builds fetches on load to check for drift — never reaches this
   function and stays public.
   ========================================================================= */

import { COOKIE, verify, readCookie, sessionSecret, authModes, GATE_ENABLED }
  from './api/_session.js';
import { loadRules, decide } from './api/_access.js';

export const config = {
  matcher: ['/internal/:path*', '/admin/:path*']
};

/* ── THE GATE IS ON, 15 Sep 2026 ─────────────────────────────────────────────
   The switch itself is GATE_ENABLED in api/_session.js, not here — one answer, read by both
   this file and /api/auth/me, so a padlock in the sidebar can never disagree with what the
   edge actually does.

   It was off from 1 Sep, and that was the right call at the time: every page behind it was
   already committed to this PUBLIC repo, so the gate was asking for a password to see files
   anyone could download from GitHub, and it was answering 503 on the install page a new
   teammate opens first.

   That reasoning expired when /internal/ stopped being a mirror of the repo. It now serves two
   working applications — the employee ID card generator and the email signature creator — and
   the ID card tool shipped with its own client-side password REMOVED on the understanding that
   Google auth would replace it. The old note here said to turn this back on BEFORE adding a
   genuinely private page. That page arrived, so it is on.

   Still deliberately outside the matcher and still public: the per-surface
   component-registry.json files under /exports (written without a glob here, because the
   two characters that spell one would close this comment),
   which every dashboard the plugin builds fetches on load to check for drift, /version.json,
   /foundation/tokens.css and /fonts/. Widening the matcher silently breaks drift checks
   everywhere, and nothing reports it.
   ────────────────────────────────────────────────────────────────────────── */

function forbidden(email) {
  return new Response(
    '<!doctype html><meta charset="utf-8"><title>Not your tier</title>' +
    '<link rel="stylesheet" href="/foundation/tokens.css">' +
    '<body style="margin:0;min-height:100vh;display:grid;place-items:center;' +
    'background:var(--gw-color-neutral-25);font-family:Inter,system-ui,sans-serif;' +
    'color:var(--gw-color-neutral-900)">' +
    '<div style="max-width:420px;padding:32px;background:#fff;border-radius:16px;' +
    'border:1px solid var(--gw-color-neutral-100);text-align:center">' +
    '<h1 style="margin:0 0 8px;font-size:22px">Admins only</h1>' +
    '<p style="margin:0 0 24px;font-size:14px;color:var(--gw-color-neutral-600)">' +
    'This page is limited to the design system admins. ' +
    'You are signed in as ' + String(email || '').replace(/[<>&"]/g, '') + '.</p>' +
    '<a href="/" style="font-size:14px;color:var(--gw-color-primary-500)">' +
    'Back to Gushwork Design</a></div></body>',
    { status: 403, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  );
}

/* Bounced off a gated URL with no session → the dedicated login page
   (488:21730), not the index with ?signin=required. There is no page underneath
   to overlay here: you asked for a URL you cannot have, so the sign-in IS the
   page. The modal stays exactly as it was and is still what a locked sidebar
   row opens, and /?signin=required still pops it for anyone holding that link —
   this only changes where the middleware sends you. */
function toSignIn(url) {
  const to = new URL('/login', url);
  to.searchParams.set('next', url.pathname + url.search);
  return new Response(null, { status: 302, headers: { Location: to.toString() } });
}

export default async function middleware(request) {
  /* Returning undefined continues to the next handler, which serves the file. */
  if (!GATE_ENABLED) return undefined;

  const url = new URL(request.url);
  const modes = authModes();

  /* Fail closed if there is no way in at all — an unconfigured gate must not
     quietly serve the private pages to everyone. In practice the password
     path has a default, so this only fires if SITE_PASSWORD is explicitly
     blanked before Google auth is configured. */
  if (!modes.google && !modes.password) {
    return new Response(
      '<!doctype html><meta charset="utf-8"><title>Sign-in not configured</title>' +
      '<body style="margin:0;min-height:100vh;display:grid;place-items:center;' +
      'font-family:Inter,system-ui,sans-serif;background:#f7f8f9;color:#262a2e">' +
      '<div style="max-width:460px;padding:32px;background:#fff;border-radius:16px;' +
      'border:1px solid #e7e8e9;text-align:center">' +
      '<h1 style="margin:0 0 8px;font-size:22px">Sign-in is not configured yet</h1>' +
      '<p style="margin:0 0 24px;font-size:14px;color:#6a7077">These pages stay closed ' +
      'until either SITE_PASSWORD or the three Google variables are set on the Vercel ' +
      'project.</p>' +
      '<a href="/" style="font-size:14px;color:#0070ff">Back to Gushwork Design</a>' +
      '</div></body>',
      { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }

  /* One cookie, either door — the password route signs the same payload the
     Google callback does, so nothing here needs to know which was used. */
  const session = await verify(
    readCookie(request.headers.get('cookie'), COOKIE), sessionSecret()
  );
  if (!session) return toSignIn(url);

  /* Evaluated against the rules AS THEY ARE NOW, not against session.admin.
     The cookie is signed for 12 hours, so trusting its claim would mean a
     revoked admin kept the keys for the rest of the day and a newly granted
     one had to sign out and back in to use them — neither is what "live" in
     /admin/access-control means. The rules come from Edge Config when a store
     is attached and from the compiled defaults when it is not, so this is the
     old two-tier behaviour until someone changes something. */
  const rules = await loadRules();
  const verdict = decide(url.pathname, session, rules);
  if (verdict === 'forbid') return forbidden(session.email);
  if (verdict === 'signin') return toSignIn(url);

  /* Returning nothing continues to the next handler, which serves the file. */
  return undefined;
}
