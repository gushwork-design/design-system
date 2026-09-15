/* ============================================================================
   _session.js — signing and verifying the session cookie.

   Written against Web Crypto only (no node: imports) so the SAME code runs in
   the Edge runtime that middleware.js uses and in the Node runtime the
   /api/auth/* functions use. Files prefixed with _ are not routed by Vercel.

   The cookie is `<base64url(payload)>.<base64url(hmac-sha256)>`. It carries
   who you are and when it expires, so middleware can authorise a request
   without a network call to Google on every page load.

   This is a signed cookie, not an encrypted one — the payload is readable by
   anyone holding it. It contains an email, a display name and an avatar URL,
   nothing secret. It cannot be forged without SESSION_SECRET.
   ========================================================================= */

export const COOKIE = 'gw_session';
export const MAX_AGE = 60 * 60 * 12; // 12 hours, then sign in again

const enc = new TextEncoder();
const dec = new TextDecoder();

function b64urlFromBytes(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function bytesFromB64url(str) {
  const pad = str.length % 4 === 0 ? '' : '='.repeat(4 - (str.length % 4));
  const bin = atob(str.replace(/-/g, '+').replace(/_/g, '/') + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function key(secret) {
  return crypto.subtle.importKey(
    'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']
  );
}

/** Sign a payload object into a cookie value. */
export async function sign(payload, secret) {
  const body = b64urlFromBytes(enc.encode(JSON.stringify(payload)));
  const mac = await crypto.subtle.sign('HMAC', await key(secret), enc.encode(body));
  return body + '.' + b64urlFromBytes(new Uint8Array(mac));
}

/**
 * Verify a cookie value. Returns the payload, or null if the signature is
 * wrong, the value is malformed, or it has expired.
 */
export async function verify(value, secret) {
  if (!value || typeof value !== 'string') return null;
  const dot = value.lastIndexOf('.');
  if (dot < 1) return null;
  const body = value.slice(0, dot);
  const macStr = value.slice(dot + 1);

  let ok = false;
  try {
    ok = await crypto.subtle.verify(
      'HMAC', await key(secret), bytesFromB64url(macStr), enc.encode(body)
    );
  } catch { return null; }
  if (!ok) return null;

  let payload;
  try { payload = JSON.parse(dec.decode(bytesFromB64url(body))); }
  catch { return null; }

  if (!payload || typeof payload.exp !== 'number') return null;
  if (Date.now() / 1000 > payload.exp) return null;
  return payload;
}

/** Pull one cookie out of a raw Cookie header. */
export function readCookie(header, name) {
  if (!header) return null;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq < 0) continue;
    if (part.slice(0, eq).trim() === name) {
      return decodeURIComponent(part.slice(eq + 1).trim());
    }
  }
  return null;
}

export function serializeCookie(name, value, opts = {}) {
  const bits = [`${name}=${encodeURIComponent(value)}`];
  bits.push(`Path=${opts.path || '/'}`);
  if (opts.maxAge != null) bits.push(`Max-Age=${opts.maxAge}`);
  bits.push(`SameSite=${opts.sameSite || 'Lax'}`);
  if (opts.httpOnly !== false) bits.push('HttpOnly');
  if (opts.secure !== false) bits.push('Secure');
  return bits.join('; ');
}

/* -- policy ---------------------------------------------------------------
   Two tiers above public. `internal` is any verified account on the allowed
   Workspace domain; `admin` is an explicit allowlist. Both are read from the
   environment so the list can change without a deploy.                     */

export function allowedDomain() {
  return (process.env.ALLOWED_DOMAIN || 'gushwork.ai').toLowerCase();
}

/* -- the password stopgap -------------------------------------------------
   A shared password stands in for Google sign-in until the OAuth client
   exists. Understand what this is and is not:

     · It is ONE key shared by everyone who has it. It identifies nobody, so
       the internal/admin split cannot be enforced — a password holder is
       treated as an admin, because otherwise the admin pages would be
       unreachable while this is the only way in.
     · There is NO default, deliberately. The password is whatever
       SITE_PASSWORD says on the Vercel project and nothing else, because
       THIS REPO IS PUBLIC and a committed default is a credential on the
       open internet. Only someone who can set Vercel env vars can open the
       door, which is the intended answer to "who gets in".
     · Unset it and the password door does not exist. With Google auth also
       unconfigured the middleware fails closed and serves nobody, rather
       than quietly serving the gated pages to everyone.
     · It is still a real gate: the middleware verifies a signed cookie, so
       the pages are not simply public.

   Turning Google auth on does not switch this off — see authModes(). Set
   SITE_PASSWORD to an empty string to disable the password path entirely. */
/* Whether the sign-in gate runs at all. It lives here rather than in middleware.js because two
   things need the same answer: the middleware, which enforces it, and /api/auth/me, which tells
   shell.js whether to draw locks. Two switches would eventually disagree, and the visible symptom
   would be a padlock on a page that opens fine.

   ON since 15 Sep 2026. It was off from 1 Sep, correctly: every page behind it was already
   readable in this public repo, so the gate was asking for a password to see files anyone could
   download from GitHub, and it was breaking the plugin install page for new teammates.

   What changed is that the internal pages stopped being a mirror of the repo. /internal/ now
   serves two working tools — the employee ID card generator and the email signature creator —
   which are applications rather than published files, and the ID card tool shipped with its own
   client-side password removed on the explicit understanding that this would replace it.

   Turning this on requires GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and SESSION_SECRET to exist on
   the Vercel project. Without them the middleware fails closed and serves 503 to everyone,
   including you — that is deliberate, but it means this flag and those variables have to move
   together. Check with `vercel env ls production` before flipping it back on after any change. */
export const GATE_ENABLED = true;

export function sitePassword() {
  return process.env.SITE_PASSWORD || '';
}

export function googleConfigured() {
  return !!(process.env.GOOGLE_CLIENT_ID &&
            process.env.GOOGLE_CLIENT_SECRET &&
            process.env.SESSION_SECRET);
}

/**
 * The key the session cookie is signed with. SESSION_SECRET when it is set;
 * otherwise one derived from the password, so the password path can issue a
 * verifiable cookie before anything is configured. Changing the password
 * invalidates every session signed under the old one, which is the correct
 * behaviour.
 */
export function sessionSecret() {
  return process.env.SESSION_SECRET || ('gw-password-mode:' + sitePassword());
}

/** Which ways in are available right now — the modal renders from this. */
export function authModes() {
  return { google: googleConfigured(), password: !!sitePassword() };
}

/**
 * Compare without leaking the answer through timing. A plain === on secrets
 * returns early at the first differing byte, which is measurable.
 */
export function constantTimeEqual(a, b) {
  const A = new TextEncoder().encode(String(a));
  const B = new TextEncoder().encode(String(b));
  if (A.length !== B.length) return false;
  let diff = 0;
  for (let i = 0; i < A.length; i++) diff |= A[i] ^ B[i];
  return diff === 0;
}

/** Defaults are the two Utsav named; ADMIN_EMAILS overrides them entirely. */
export function adminEmails() {
  const raw = process.env.ADMIN_EMAILS || 'utsav.singh@gushwork.ai,design@gushwork.ai';
  return raw.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
}

export function isAdmin(email) {
  return !!email && adminEmails().includes(String(email).toLowerCase());
}

export function isInternal(email) {
  return !!email && String(email).toLowerCase().endsWith('@' + allowedDomain());
}

/**
 * Only ever redirect to a path on this site. Without this check, a crafted
 * ?next=https://evil.example would turn the login route into an open
 * redirect that borrows our domain's credibility.
 */
export function safeNext(next) {
  if (typeof next !== 'string' || !next) return '/';
  if (!next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return '/';
  return next;
}

/** The callback URL for whichever deployment is serving this request. */
export function redirectUri(req) {
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const proto = req.headers['x-forwarded-proto'] || 'https';
  return `${proto}://${host}/api/auth/callback`;
}

/** Env vars the flow cannot run without. */
export function missingConfig() {
  const missing = [];
  if (!process.env.GOOGLE_CLIENT_ID) missing.push('GOOGLE_CLIENT_ID');
  if (!process.env.GOOGLE_CLIENT_SECRET) missing.push('GOOGLE_CLIENT_SECRET');
  if (!process.env.SESSION_SECRET) missing.push('SESSION_SECRET');
  return missing;
}
