/* Finishes the Google sign-in flow.
   Google redirects here with ?code&state. We exchange the code for tokens,
   check who it is, and set the session cookie. */

import {
  COOKIE, GUEST_COOKIE, guestSecret, MAX_AGE, sign, readCookie, serializeCookie, cookieDomain,
  safeNext, redirectUri, missingConfig, isInternal, isAdmin, allowedDomain
} from '../_session.js';
import { loadRules, guestActive } from '../_access.js';
import { recordVisit } from '../_log-visit.js';

const STATE_COOKIE = 'gw_oauth_state';

function deny(res, title, detail) {
  res.status(403).setHeader('Content-Type', 'text/html; charset=utf-8');
  res.end(
    '<!doctype html><meta charset="utf-8">' +
    '<title>' + title + '</title>' +
    '<link rel="stylesheet" href="/foundation/tokens.css">' +
    '<body style="margin:0;min-height:100vh;display:grid;place-items:center;' +
    'background:var(--gw-color-neutral-25);font:var(--gw-text-body-14-reg);' +
    'font-family:Inter,system-ui,sans-serif;color:var(--gw-color-neutral-900)">' +
    '<div style="max-width:420px;padding:32px;background:#fff;border-radius:16px;' +
    'border:1px solid var(--gw-color-neutral-100);text-align:center">' +
    '<h1 style="margin:0 0 8px;font-size:22px">' + title + '</h1>' +
    '<p style="margin:0 0 24px;color:var(--gw-color-neutral-600)">' + detail + '</p>' +
    '<a href="/" style="color:var(--gw-color-primary-500)">Back to Gushwork Design</a>' +
    '</div></body>'
  );
}

export default async function handler(req, res) {
  const missing = missingConfig();
  if (missing.length) {
    res.status(503).setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.end('Google sign-in is not configured. Missing: ' + missing.join(', '));
  }

  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const url = new URL(req.url, 'https://' + host);
  const code = url.searchParams.get('code');
  const stateRaw = url.searchParams.get('state');

  if (url.searchParams.get('error')) {
    return deny(res, 'Sign-in cancelled', 'Google returned: ' +
      String(url.searchParams.get('error')).replace(/[<>&]/g, ''));
  }
  if (!code || !stateRaw) return deny(res, 'Sign-in failed', 'The response from Google was incomplete.');

  /* CSRF check — the nonce in state must match the cookie we set at /login. */
  let state;
  try { state = JSON.parse(Buffer.from(stateRaw, 'base64url').toString('utf8')); }
  catch { return deny(res, 'Sign-in failed', 'The response could not be read.'); }

  const expected = readCookie(req.headers.cookie, STATE_COOKIE);
  if (!expected || !state || state.n !== expected) {
    return deny(res, 'Sign-in failed',
      'This sign-in did not start on this site, or it took too long. Please try again.');
  }

  /* Exchange the code. This is a direct server-to-server call to Google over
     TLS, so the id_token it returns is trustworthy without a separate JWKS
     signature check — nothing else could have produced this response. */
  let tokens;
  try {
    const r = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri(req),
        grant_type: 'authorization_code'
      })
    });
    tokens = await r.json();
    if (!r.ok || !tokens.id_token) {
      return deny(res, 'Sign-in failed', 'Google would not issue a token for this sign-in.');
    }
  } catch {
    return deny(res, 'Sign-in failed', 'Could not reach Google to complete sign-in.');
  }

  let claims;
  try {
    claims = JSON.parse(Buffer.from(tokens.id_token.split('.')[1], 'base64url').toString('utf8'));
  } catch {
    return deny(res, 'Sign-in failed', 'The identity token could not be read.');
  }

  const email = String(claims.email || '').toLowerCase();

  /* Google must have verified the address. Then it is one of two kinds of person: a company account, or a GUEST (an outside address
     an owner has invited, not expired), checked against the rules as they are now. Anyone else is refused. */
  if (!claims.email_verified) {
    return deny(res, 'Account not verified', 'Google has not verified this email address.');
  }
  const company = isInternal(email) && !(claims.hd && String(claims.hd).toLowerCase() !== allowedDomain());
  if (!company) {
    let guest = false, rules = null;
    try { rules = await loadRules(); guest = !isInternal(email) && guestActive(email, rules); } catch { guest = false; }
    if (!guest) {
      return deny(res, 'Not on the list',
        'This part of the design system is for @' + allowedDomain() + ' accounts and invited guests. ' +
        email.replace(/[<>&]/g, '') + ' is neither. Sign in with your Gushwork account, or ask whoever shared the page to invite you.');
    }
    const end = Date.parse(rules.guests[email].expires + 'T23:59:59Z') / 1000;
    const gp = { typ: 'guest', email, name: claims.name || email, picture: claims.picture || null,
                 exp: Math.min(Math.floor(Date.now() / 1000) + MAX_AGE, Math.floor(end)) };
    await recordVisit({ email, path: '/', kind: 'signin', via: 'guest' });
    res.setHeader('Set-Cookie', [
      serializeCookie(GUEST_COOKIE, await sign(gp, guestSecret()), { maxAge: Math.max(60, gp.exp - Math.floor(Date.now() / 1000)) }),
      serializeCookie(COOKIE, '', { maxAge: 0, domain: cookieDomain() || undefined }),
      serializeCookie(STATE_COOKIE, '', { maxAge: 0 })
    ]);
    res.writeHead(302, { Location: safeNext(state.next) });
    return res.end();
  }

  const payload = {
    email,
    name: claims.name || email,
    picture: claims.picture || null,
    admin: isAdmin(email),
    exp: Math.floor(Date.now() / 1000) + MAX_AGE
  };

  await recordVisit({ email, path: '/', kind: 'signin', via: 'google' });
  res.setHeader('Set-Cookie', [
    serializeCookie(COOKIE, await sign(payload, process.env.SESSION_SECRET), { maxAge: MAX_AGE, domain: cookieDomain() }),
    serializeCookie(GUEST_COOKIE, '', { maxAge: 0 }),            // a company account is not also a guest
    serializeCookie(STATE_COOKIE, '', { maxAge: 0 })
  ]);
  res.writeHead(302, { Location: safeNext(state.next) });
  res.end();
}
