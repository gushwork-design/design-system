/* ============================================================================
   middleware.js — the actual gate.

   Runs at the edge, before any static file is served. This is what makes the
   internal pages genuinely private: without it, /internal/changelog is just a
   file on a public CDN and the locks in the sidebar are decoration.

   Two tiers:
     /internal/*  any verified @gushwork.ai account
     /library/*   the component library — same tier, its own surface
     /admin/*     only the ADMIN_EMAILS allowlist

   /library/review is admin, by being the longer prefix in _access.js. The bare
   /library is matched as well as /library/:path* — a one-segment path does not
   match the :path* form, and without it the index of the whole library is the
   one page in it that is public.

   The matcher below is deliberately narrow. Everything else — the Overview
   page, /foundation/tokens.css, the fonts, and critically
   /exports/dashboard/component-registry.json, which every dashboard the
   plugin builds fetches on load to check for drift — never reaches this
   function and stays public.
   ========================================================================= */

import { readAnySession, authModes, GATE_ENABLED }
  from './api/_session.js';
import { loadRules, decide, ruleFor } from './api/_access.js';
import { restrictedPage } from './api/_restricted-page.js';
import { recordVisit } from './api/_log-visit.js';

export const config = {
  matcher: ['/internal/:path*', '/admin/:path*', '/library', '/library/:path*', '/previews/:path*', '/agents', '/agents/:path*']
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

   /previews is inside it (added 2 Oct 2026): the drawings the review drawer shows. The rule for it in _access.js had no
   effect while the matcher left it out, so those files were public. The repo is public, so nothing secret was exposed,
   but the gate should match what the access rules say.

   Still deliberately outside the matcher and still public: the per-surface
   component-registry.json files under /exports (written without a glob here, because the
   two characters that spell one would close this comment),
   which every dashboard the plugin builds fetches on load to check for drift, /version.json,
   /foundation/tokens.css and /fonts/. Widening the matcher silently breaks drift checks
   everywhere, and nothing reports it.
   ────────────────────────────────────────────────────────────────────────── */

/* Signed in, and this page is not theirs. The dashboard system's access-denied-screen, with Request access (R66): the
   page is words, a button and a Slack DM to the owner, built in api/_restricted-page.js. An owners-only page offers no
   request, because owners come from the environment and there is nothing an approval could grant. */
function forbidden(session, url, rules) {
  const rule = ruleFor(url.pathname, rules);
  return new Response(
    restrictedPage({ email: session.email, path: url.pathname, canRequest: !session.guest && !!rule && rule.access !== 'owner', lane: rule && rule.access === 'lane' ? rule.lane : '', guest: !!session.guest }),
    { status: 403, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store, private' } }
  );
}

/* Bounced off a gated URL with no session → the OVERVIEW page with the modal
   over it, not the standalone /login screen.

   This was the other way round until 16 Sep 2026, on the reasoning that "you
   asked for a URL you cannot have, so the sign-in IS the page". That reasoning
   only holds for someone already inside the site who clicked a locked row. It
   does not hold for the case that actually happens: a link to a gated page gets
   shared, and the person opening it has never seen this site. They arrived on a
   grid with an empty middle and no way to tell what they were being asked to
   sign in TO.

   Sending them to the Overview answers that question before it is asked — the
   page behind the modal is the pitch — and closing the modal leaves them
   somewhere real instead of on a dead end. `next` rides along, and
   shell.js pops the modal on ?signin=required and hands `next` to whichever
   door they use, so they still land on the page they asked for.

   /login stays as a page: it is the designed frame (488:21730), it is what a
   bookmark or a typed URL hits, and it is the one entrance that does not need
   a shell around it. */
function toSignIn(url) {
  const to = new URL('/', url);
  to.searchParams.set('signin', 'required');
  to.searchParams.set('next', url.pathname + url.search);
  return new Response(null, { status: 302, headers: { Location: to.toString() } });
}

/* ── ad landers are public, and this has to be stated HERE ──────────────────
   An ad page exists to be pasted into Slack, sent to a client and run as paid
   media. A social card cannot render from behind the gate: the scraper has no
   cookie, gets the sign-in bounce, and the link shows a grey box.

   There is an `access: 'public'` tier in _access.js and a compiled route for
   this path, but a compiled route only fills a GENUINE hole — withFallbacks()
   treats a stored /internal rule as covering everything beneath it, so once an
   Edge Config store exists the sub-route is never added and the page stays
   gated. Saying it in the middleware is the only version that holds either way.

   Consequence worth knowing: this bypasses decide(), so /admin/access-control
   cannot re-gate these paths. Removing a page from public means removing it
   from this list. Ruled by Utsav 22 Sep 2026. */
/* The tools' shared stylesheet and chrome script (the same files for every tool). They hold no data, and a tool opened by a guest
   needs them to draw at all, while a guest's rule names the TOOL, not these. Same reasoning as the ad lander: say it here. */
const PUBLIC_PATHS = ['/internal/staging/ai-crm-lander', '/internal/tool-shell.css', '/internal/tool-chrome.js'];

function isPublic(pathname) {
  return PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'));
}

/* ── link previews from behind the gate ─────────────────────────────────────
   A link-preview bot has no cookie, so it gets the sign-in bounce and unfurls
   the home page's card for every gated link. For those bots only, answer with
   a stub that holds the page's own title and card image and nothing else.
   The pairs come from og-map.json, which scripts/_add_og.py writes at publish
   from the pages' own og tags; an unmapped path gets no stub and is gated as
   usual. What this reveals is a page's title and its card image (already
   public) to anyone who sends a bot's User-Agent. Ruled by Utsav 1 Oct 2026. */
const UNFURL_BOTS = /Slackbot|Slack-ImgProxy|LinkedInBot|Twitterbot|facebookexternalhit|Facebot|WhatsApp|Discordbot|TelegramBot|Applebot|SkypeUriPreview/i;

const esc = v => String(v).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

async function unfurlStub(request, url) {
  if (request.method !== 'GET' && request.method !== 'HEAD') return null;
  if (!UNFURL_BOTS.test(request.headers.get('user-agent') || '')) return null;
  try {
    const res = await fetch(new URL('/og-map.json', url));
    if (!res.ok) return null;
    const map = await res.json();
    const hit = map[url.pathname.replace(/\/+$/, '')];
    if (!hit) return null;
    const [title, image, desc] = hit;
    const t = esc(title), i = esc(image), d = desc ? esc(desc) : '';
    return new Response(
      '<!doctype html><html><head><meta charset="utf-8"><title>' + t + '</title>' +
      '<meta property="og:type" content="website">' +
      '<meta property="og:site_name" content="Gushwork Design">' +
      '<meta property="og:title" content="' + t + '">' +
      (d ? '<meta property="og:description" content="' + d + '"><meta name="description" content="' + d + '">' : '') +
      '<meta property="og:url" content="' + esc(url.origin + url.pathname) + '">' +
      '<meta property="og:image" content="' + i + '">' +
      '<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">' +
      '<meta name="twitter:card" content="summary_large_image">' +
      '<meta name="twitter:title" content="' + t + '"><meta name="twitter:image" content="' + i + '">' +
      '</head><body></body></html>',
      { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } }
    );
  } catch (e) {
    return null;
  }
}

/* A person opening a page, as opposed to the browser fetching a stylesheet or a prefetch. */
function isPageView(request, url) {
  if (request.method !== 'GET') return false;
  if (url.pathname.indexOf('/admin/analytics') === 0) return false;
  const last = url.pathname.split('/').pop() || '';
  if (last.indexOf('.') !== -1 && !/\.html$/.test(last)) return false;
  const h = request.headers;
  if ((h.get('purpose') || h.get('sec-purpose') || '').toLowerCase().indexOf('prefetch') !== -1) return false;
  const dest = h.get('sec-fetch-dest');
  if (dest) return dest === 'document' || dest === 'iframe';
  return (h.get('accept') || '').indexOf('text/html') !== -1;
}

export default async function middleware(request, context) {
  const url = new URL(request.url);

  /* Returning undefined continues to the next handler, which serves the file. */
  if (!GATE_ENABLED) return undefined;

  if (isPublic(url.pathname)) return undefined;

  const stub = await unfurlStub(request, url);
  if (stub) return stub;

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
  const session = await readAnySession(request.headers.get('cookie'));
  if (!session) return toSignIn(url);

  /* Evaluated against the rules AS THEY ARE NOW, not against session.admin.
     The cookie is signed for 30 days, so trusting its claim would mean a
     revoked admin kept the keys for the rest of the month and a newly granted
     one had to sign out and back in to use them — neither is what "live" in
     /admin/access-control means. The rules come from Edge Config when a store
     is attached and from the compiled defaults when it is not, so this is the
     old two-tier behaviour until someone changes something. */
  const rules = await loadRules();
  const verdict = decide(url.pathname, session, rules);
  if (verdict === 'forbid') return forbidden(session, url, rules);
  if (verdict === 'signin') return toSignIn(url);

  /* The owner's visit log (api/_log-visit.js): who opened which page. Pages only — not images,
     scripts or fetches — and never the analytics page itself. Handed to waitUntil so it cannot delay
     the response. */
  if (isPageView(request, url)) {
    const logged = recordVisit({ email: session.email || null, path: url.pathname, kind: 'view' });
    if (context && typeof context.waitUntil === 'function') context.waitUntil(logged);
    else await logged;   // no waitUntil in this runtime: a short wait beats a dropped row
  }

  /* Returning nothing continues to the next handler, which serves the file. */
  return undefined;
}
