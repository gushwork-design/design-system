/* Clears the session cookie and sends you back to a page on this site. */

import { COOKIE, serializeCookie, cookieDomain, safeNext } from '../_session.js';

export default function handler(req, res) {
  const url = new URL(req.url, 'https://' + (req.headers['x-forwarded-host'] || req.headers.host));
  /* Clear the host-only cookie and, when one is configured, the shared-domain one too. */
  const clears = [serializeCookie(COOKIE, '', { maxAge: 0 })];
  if (cookieDomain()) clears.push(serializeCookie(COOKIE, '', { maxAge: 0, domain: cookieDomain() }));
  res.setHeader('Set-Cookie', clears);
  res.writeHead(302, { Location: safeNext(url.searchParams.get('next')) });
  res.end();
}
