/* The password stopgap — a way in until the Google OAuth client exists.

   POST /api/auth/password   { password, next }
   Wrong password answers 401 with no detail. Right password sets the same
   signed session cookie the Google callback sets, so middleware.js does not
   need to know which door someone came through.

   See sitePassword() in ../_session.js for what this does and does not
   protect. Short version: one shared key, identifies nobody, so it grants
   admin as well — otherwise the admin pages would be unreachable while this
   is the only way in. */

import {
  COOKIE, MAX_AGE, sign, serializeCookie, safeNext,
  sitePassword, sessionSecret, constantTimeEqual
} from '../_session.js';
import { recordVisit } from '../_log-visit.js';

/* A crude per-instance throttle. Serverless instances come and go, so this is
   a speed bump against a casual script, not a real rate limiter. */
const attempts = new Map();
const WINDOW_MS = 60_000;
const MAX_TRIES = 10;

function tooMany(ip) {
  const now = Date.now();
  const rec = attempts.get(ip);
  if (!rec || now - rec.start > WINDOW_MS) {
    attempts.set(ip, { start: now, n: 1 });
    return false;
  }
  rec.n += 1;
  return rec.n > MAX_TRIES;
}

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  let raw = '';
  for await (const chunk of req) raw += chunk;
  if (!raw) return {};
  try { return JSON.parse(raw); }
  catch { return Object.fromEntries(new URLSearchParams(raw)); }
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, private');

  if (req.method !== 'POST') {
    res.status(405).setHeader('Allow', 'POST');
    return res.end(JSON.stringify({ ok: false, error: 'Use POST.' }));
  }

  const expected = sitePassword();
  if (!expected) {
    res.status(404).setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ ok: false, error: 'Password sign-in is disabled.' }));
  }

  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  if (tooMany(ip)) {
    res.status(429).setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ ok: false, error: 'Too many attempts. Wait a minute.' }));
  }

  const body = await readBody(req);

  if (!constantTimeEqual(body.password || '', expected)) {
    res.status(401).setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ ok: false, error: 'That password is not right.' }));
  }

  const payload = {
    email: null,
    name: 'Gushwork team',
    picture: null,
    /* Admin, deliberately — one shared key cannot tell an admin from anyone
       else, and locking the admin pages would leave them unreachable. The
       real split arrives with Google auth. */
    admin: true,
    via: 'password',
    exp: Math.floor(Date.now() / 1000) + MAX_AGE
  };

  await recordVisit({ email: null, path: '/', kind: 'signin', via: 'password' });
  res.setHeader('Set-Cookie',
    serializeCookie(COOKIE, await sign(payload, sessionSecret()), { maxAge: MAX_AGE }));
  res.status(200).setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ ok: true, next: safeNext(body.next) }));
}
