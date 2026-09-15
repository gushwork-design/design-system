# Signing in

Two doors. The password is the stopgap that works today; Google is the real
one, and turning it on does not switch the password off — you do that
yourself, deliberately, in step 4.

---

## The password stopgap (live now)

The team password is whatever `SITE_PASSWORD` is set to on the Vercel
project. **There is no default and none may be added** — this repo is public,
so a password in the source is a password on the open internet. Set it before
the first deploy, or the gate below fails closed and nobody gets in.

Be clear-eyed about what it is:

| | |
|---|---|
| It is | a real gate — the middleware verifies a signed cookie, so the pages are not simply public |
| It is not | an identity. One shared key, so it cannot tell an admin from anyone else |
| Therefore | a password holder is treated as an **admin** and can open `/admin/*`. Locking those pages would make them unreachable while this is the only way in |
| Also | it lives only in Vercel's env, so the people who can change who gets in are exactly the people who can deploy |

**Change it without a deploy** by editing `SITE_PASSWORD` on the Vercel
project. **Disable it** by setting `SITE_PASSWORD` to an empty string — do
that once Google auth works, or the weaker door stays open beside the strong
one.

Without `SESSION_SECRET`, cookies are signed with a key derived from the
password, so changing the password signs everyone out. That is intended.

---

## Turning on Google sign-in

Creating the OAuth client and entering the secret are yours to do; neither
belongs in this repo or in a chat window.

---

## What you need, and what will not work

You need an **OAuth 2.0 Client ID, type "Web application"**. It gives you a
client ID ending in `.apps.googleusercontent.com` and a client secret.

A **service account key** — the JSON file with `"type": "service_account"`,
like `gushwork-assignments-portal-*.json` — is **not** this and cannot be used
here. A service account authenticates a machine acting as itself; it has no
way to tell you which person is at the browser. Signing users in requires the
authorization-code flow, which only a Web application client supports.

---

## 1. Create the OAuth client

Google Cloud Console → **Google Auth Platform**, in whichever project you want
to own this.

**The console moved.** This used to live under *APIs & Services → Credentials*
with a single "OAuth consent screen" page. As of 15 Sep 2026 it is its own
product with the settings split across tabs, so the old single-page walkthrough
no longer matches what you see:

| Old | Now |
|---|---|
| Consent screen — app name, logo, emails | **Branding** |
| Consent screen — user type, test users, publish | **Audience** |
| Consent screen — scopes | **Data Access** |
| Credentials — OAuth client IDs | **Clients** |

Do them in that order: Branding must be filled before Audience will let you
publish, and the client in Clients is the last step. `gushwork-assignments-portal` already exists and would
do; a separate project is also fine.

1. **Configure the OAuth consent screen** first, if the project has none.
   - User type: **Internal if it is offered, otherwise External.**

     **Internal requires the project to sit inside a Google Cloud
     organisation**, which is a different thing from having a Workspace
     account. Checked on 15 Sep 2026 signed in as `utsav.singh@gushwork.ai`:
     the project picker showed **"No organization"** and a single personal
     project, so Internal was not available and **External is what this is set
     up with**. If a super-admin later provisions a Cloud org, switching to
     Internal is a consent-screen setting, not a code change.

     **Choosing External costs less than it sounds.** The consent screen was
     never the gate — `api/auth/callback.js` requires `email_verified` *and* an
     address on `ALLOWED_DOMAIN`, read off Google's verified claim rather than
     the `hd` hint the browser sends, which a user can edit. A stranger can
     begin a sign-in and is refused at the callback. What External loses is a
     second, org-level layer, not the door itself.

     **If you pick External you must publish the app.** Left in *Testing*, only
     explicitly added test users can sign in, capped at 100, with refresh
     tokens expiring after 7 days — colleagues will simply be refused. Press
     **Publish app** to move it to *Production*. No verification review is
     required: this flow asks only for `openid`, `email` and `profile`, which
     Google classes as non-sensitive.
   - App name: `Gushwork Design`. Support email: yours.
   - No extra scopes. The default `openid`, `email` and `profile` are all the
     flow asks for.

2. **Clients → Create client**
   - Application type: **Web application**
   - Name: `gushwork-design site`
   - Check the existing list first. A project that has been used for anything
     else may already hold a client — add a new one rather than editing one you
     do not recognise.
   - **Authorised redirect URIs** — add one per hostname that will serve the
     site. `redirectUri()` in `api/_session.js` builds the callback from the
     **host of the incoming request**, so every hostname that can serve a
     sign-in needs its own entry or Google rejects it with
     `redirect_uri_mismatch`. The callback path is always `/api/auth/callback`.

     **Both of these are live and both are required** — this list said only the
     `.vercel.app` one until 15 Sep 2026, which would have failed on the real
     domain:

     ```
     https://design.gushwork.ai/api/auth/callback
     https://gushwork-design.vercel.app/api/auth/callback
     ```

     `design.gushwork.ai` is the alias `publish-sheets.sh` deploys to and the
     one people actually open, so if you add only one, add that.

     Preview deployments get their own hostname, so a preview cannot complete
     a sign-in unless you add its URL too. Add the preview URL while you are
     reviewing, or test the gate on production.

3. Copy the **Client ID** and **Client secret**.

## 2. Generate a session secret

This signs the session cookie. Any long random string; never reuse one from
elsewhere.

```bash
openssl rand -base64 48
```

## 3. Set the variables on Vercel

Vercel → the `gushwork-design` project → **Settings → Environment Variables**.
Add these to **Production** (and to Preview if you want the gate live there):

| Name | Value |
|---|---|
| `GOOGLE_CLIENT_ID` | from step 1 |
| `GOOGLE_CLIENT_SECRET` | from step 1 |
| `SESSION_SECRET` | from step 2 |
| `ADMIN_EMAILS` | `utsav.singh@gushwork.ai,design@gushwork.ai` |
| `ALLOWED_DOMAIN` | `gushwork.ai` |
| `SITE_PASSWORD` | *(empty)* — see step 4 |

`ADMIN_EMAILS` and `ALLOWED_DOMAIN` are optional — the values above are the
defaults compiled into `api/_session.js`. Setting `ADMIN_EMAILS` explicitly
means you can change who is an admin from the Vercel dashboard without a
deploy.

**Redeploy after adding them.** Environment variables are read at request
time, but a deployment made before they existed will not pick them up.

## 4. Close the password door

Once you have signed in with Google successfully, set `SITE_PASSWORD` to an
**empty string** on the project and redeploy.

Until you do, both doors are open and the password still grants admin — which
means the `ADMIN_EMAILS` allowlist you just configured is only as strong as a
password that is sitting in this repo. The tiers are not real until the
password is gone.

The sign-in modal shows whichever doors are open, so you can confirm the
change by opening it: with the password disabled, only the Google button
remains.

---

## How the tiers work

| Route | Who gets in |
|---|---|
| `/`, `/style-guide`, `/downloads` | everyone, no sign-in |
| `/internal/*` | any verified `@gushwork.ai` account |
| `/admin/*` | only addresses in `ADMIN_EMAILS` |

`middleware.js` enforces this at the edge, before any file is served. The
locks in the sidebar are a signal, not the control — the control is the
middleware.

### One path that must stay public

`/exports/dashboard/component-registry.json` is fetched on load by every
dashboard the plugin builds, to check whether the components it was built from
have moved on. The middleware `matcher` only covers `/internal/*` and
`/admin/*`, so the registry never reaches it. **If you widen that matcher, you
will silently break drift checks in every dashboard** — the fetch fails quietly
and nobody is ever told.

---

## What the flow actually does

1. `/api/auth/login` sends you to Google with a random nonce in both the
   `state` parameter and a short-lived cookie.
2. `/api/auth/callback` requires those to match — so a response the site did
   not initiate cannot complete a sign-in — then exchanges the code for tokens
   in a direct server-to-server call.
3. It checks `email_verified` and that the address is on `ALLOWED_DOMAIN`.
   The `hd` parameter sent in step 1 is only a hint to Google's account
   picker; the decision is made on the verified claim, which a user cannot
   edit.
4. It sets `gw_session`, an HttpOnly, Secure, SameSite=Lax cookie holding a
   signed payload: email, display name, avatar URL, admin flag, expiry.
   Twelve hours, then sign in again.
5. `middleware.js` verifies that signature on every gated request. No call to
   Google per page load.

The cookie is **signed, not encrypted** — its contents are readable by whoever
holds it. It carries an email, a name and an avatar URL, nothing secret. It
cannot be forged without `SESSION_SECRET`.

## Checking it works

With the variables set and a fresh deploy:

- Signed out, `/` loads and the three internal rows show a lock.
- Clicking a locked row opens the sign-in modal.
- Hitting `https://<host>/internal/changelog` directly, signed out, redirects
  to `/?signin=required&next=/internal/changelog`.
- Signed in on a non-admin `@gushwork.ai` account, `/admin/review-sheet`
  returns a 403 page, and the ADMIN group is absent from the sidebar.
- `curl -s https://<host>/exports/dashboard/component-registry.json | head -c 40`
  still returns JSON with no cookie.
