/* Starts the Google sign-in flow.
   GET /api/auth/login?next=/internal/changelog  →  302 to Google */

import {
  serializeCookie, safeNext, redirectUri, missingConfig
} from '../_session.js';

const STATE_COOKIE = 'gw_oauth_state';

export default function handler(req, res) {
  const missing = missingConfig();
  if (missing.length) {
    res.status(503).setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.end(
      'Google sign-in is not configured yet.\n\n' +
      'Missing environment variables: ' + missing.join(', ') + '\n\n' +
      'Set them on the Vercel project, then redeploy. See web/README-auth.md.'
    );
  }

  const url = new URL(req.url, 'https://' + (req.headers['x-forwarded-host'] || req.headers.host));
  const next = safeNext(url.searchParams.get('next'));

  /* CSRF: a random nonce goes into both the state parameter and a
     short-lived cookie. The callback only proceeds if they match, so a
     response we did not initiate cannot complete a sign-in. */
  const nonce = crypto.randomUUID();
  const state = Buffer.from(JSON.stringify({ n: nonce, next }), 'utf8').toString('base64url');

  const authorize = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authorize.searchParams.set('client_id', process.env.GOOGLE_CLIENT_ID);
  authorize.searchParams.set('redirect_uri', redirectUri(req));
  authorize.searchParams.set('response_type', 'code');
  authorize.searchParams.set('scope', 'openid email profile');
  authorize.searchParams.set('state', state);
  authorize.searchParams.set('prompt', 'select_account');
  /* No `hd` hint any more. It used to narrow Google's picker to this Workspace domain, which also hid the accounts of guests (people
     outside the company let in to named pages). It never was a security control; the callback decides who gets a session, from
     the verified claim: a company account gets a staff session, an outside account gets a guest session only if an owner has
     invited it, and anyone else is refused. */

  res.setHeader('Set-Cookie', serializeCookie(STATE_COOKIE, nonce, { maxAge: 600 }));
  res.writeHead(302, { Location: authorize.toString() });
  res.end();
}
