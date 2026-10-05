# Sign-in and session screens

The screens around the front door of a dashboard or web app: the full-page sign-in, its Google button, the same card as a dialog, the page shown to someone who is signed in but not allowed, and the notice shown when a session lapses mid-work. Source is the hub's `/login` page and sign-in modal (`web/shell.css` 805-960 and 1262-1500, `web/login.html`), where the hub and the old Figma export disagree the hub wins. Code is `css/70-auth.css` and `js/70-auth.js`. Fields and buttons are not redefined here: the form uses `.gd-field` / `.gd-input` (30-inputs), `.gd-btn` (20-actions), the dialog shell `.gd-modal` and banner `.gd-banner` (60-feedback), and the badge of `.gd-empty`.

**Fixed scale.** The full-page screens ignore `--gd-control-h` and `data-density`: controls are 48, the card is 480, type is the hub's. They never scale; under 560px they reflow (card padding 32/20, title steps to 26).

**Aliases added** (declared under `.gd`, `light-dark()`): `--gd-auth-bg` (page ground, neutral-25 light / black dark), `--gd-auth-grid` (the lattice lines, with the hub's 30%-in-dark baked into the colour), `--gd-auth-field` (an inset well: `--gd-field-bg` is neutral-900 in dark, the same as the card, so the field vanished).

**Which old text rulings still apply.** The old split screen had `welcomeTitle`, `welcomeDescription` and `creatorInfo`. The hub card has no welcome panel, so R13 (two-line subtext, 56px reserved) is retired with the panel. R12 survives in two places: the card subtitle says what this dashboard is and how to use it, not a status update, and a dashboard-specific sign-in may carry one fixed attribution line, `Created and owned by {first name} on {D MMM YYYY} at {h:mm am/pm}.` (`.gd-auth__attrib`), never a tagline. R3 (Google button 48 / r12 / no arrow) applies unchanged.

## Login screen

**Purpose.** The page a signed-out visitor lands on, including the bounce from a protected route. Use it as a whole page. For a sign-in over a page the user is already on, use the Sign in modal.

**Anatomy.**

```html
<div class="gd-auth">
  <div class="gd-auth__grid" aria-hidden="true"></div>
  <div class="gd-auth__card">                                  <!-- data-state="success" swaps the doors for the status line -->
    <div class="gd-auth__head">
      <span class="gd-auth__chip"><svg viewBox="0 0 80 80" width="30" height="30">…</svg></span>
      <div class="gd-auth__copy"><h1 class="gd-auth__title">You’ll need to log in</h1><p class="gd-auth__sub">…</p></div>
    </div>
    <div class="gd-auth__done" role="status">…</div>           <!-- hidden until success -->
    <div class="gd-auth__doors">
      <a class="gd-google" href="/api/auth/login" data-gd-google data-gd-return-to>…</a>
      <div class="gd-auth__or" role="separator"><span>or</span></div>
      <form class="gd-auth__form" data-gd-auth-form data-gd-return-to novalidate> .gd-field ×2, error line, .gd-btn--primary </form>
    </div>
  </div>
</div>
```

The mark is the real one: the paths of `assets/logo/gushwork-symbol-white.svg`, filled `currentColor`, on a 60px primary tile (radius 15, 30px mark, 2px inner ring), as the hub draws it. Never redraw it. Card: 480 wide, `max-width: 100%`, padding 40/32, radius 24, `--gw-shadow-s4`, gap 40. The page is `100dvh`, centred; the lattice is two 1px gradients on a 40px grid with five filled cells, `--gd-auth-grid` / `--gd-auth-cell`. In dark the card is `--gd-raised-bg` on black.

**Variants** (by markup, no JS): Google only (the button alone, optional `.gd-auth__note` when no door is configured); Google + email (Google, the "or" rule, then email and password); Password only (one "Team password" field and Continue, the hub's stopgap door).

**States.** Field error (`.gd-field[data-state="error"]`: red edge, message below, `aria-invalid`); form error line (`[data-gd-auth-error]`, `role="alert"`, for "email and password do not match"); submitting (`aria-busy="true"` on the submit button, spinner in place of the label glyph, fields go readonly); success (`.gd-auth__card[data-state="success"]`: "You're signed in", "Taking you to {destination}", spinner). Text fields have no hover, and show a 1px edge on focus (R2, R41); buttons show the keyboard ring.

**Copy.** Title "You’ll need to log in" (sentence case, no full stop). Subtitle: one line saying what this is or why sign-in is needed. Errors say what to do next, in one line.

**Tokens.** `--gd-auth-*`, `--gd-raised-bg`, `--gd-border-strong`, `--gd-text`, `--gd-text-body`, `--gw-text-h5`, `--gw-text-h6`, `--gw-text-body-16-med`, `--gw-radius-24`, `--gw-shadow-s4`.

**Accessibility.** One `h1`. Labels are real `<label for>`. Errors are linked with `aria-describedby`, focus moves to the first invalid field on submit. The Google control is a link (it navigates). The success line is a `role="status"`.

**Behaviour.** `70-auth.js`: validation on submit (email required and shaped, password required), live clearing while typing, re-check on blur once touched; `gd:auth-submit` (cancelable) lets the app own the request and call `GD.auth.succeed(form,{destination,redirect})` or `GD.auth.fail(form,{message,field})`; uncancelled, the form posts natively. A second submit while busy is ignored. Show/hide password is a real toggle (below). `data-gd-return-to` carries the gated path as `next` and refuses anything that is not a same-origin path (`//host`, `https:`, `javascript:` are dropped; the server must still validate).

**Show and hide password** (also in the Sign in modal). A `button.gd-iconbtn.gd-iconbtn--sm.gd-auth__reveal[data-gd-auth-reveal]` sits at the end of the password `.gd-input`. It switches the input between `password` and `text`, sets `aria-pressed` and `aria-label` ("Show password" / "Hide password"), swaps the eye glyph by `aria-pressed`, and leaves focus and the caret in the input. Never ship the glyph without the behaviour (R19).

**Provenance.** extracted: web/shell.css:1262-1500, web/login.html. Password-only door is the hub's, labelled a stopgap in README-auth.md.

## Google button

**Purpose.** The single-sign-on entry. Use it wherever Google OAuth starts a session. Do not use it for any other provider, and never as a themed button.

**Anatomy.** `<a class="gd-google" href="/api/auth/login" data-gd-google>` with the four-colour G (`assets/brand/google-g.svg`, 18px, its own fills, never recoloured) and the label. 48 tall, full width, radius 12, padding 0/16/0/20, gap 8, `--gw-text-button-14`, no trailing arrow (R3).

**Deliberately unthemed (R3).** White fill, black label and a neutral-200 edge in both themes, built from `--gw-color-white`, `--gw-color-black`, `--gw-color-neutral-200`, because Google's mark and button keep their own presentation. Do not move it onto `--gd-*` aliases.

**States.** Rest `--gw-shadow-s3`. Hover (`.is-hover`): `--gw-shadow-s4` and the fill steps to neutral-50. The hub's hover is the shadow alone, which is invisible on a black page, and R3 states no dark rule, so the fill step is this set's decision: it keeps contrast against the label and separates from the card in both themes, unthemed. Focus-visible: the system ring. Busy (`aria-busy="true"`): the G becomes a spinner, clicks ignored. Disabled (`aria-disabled="true"`): 60% opacity, no shadow.

**Accessibility.** A link whose text names the provider ("Continue with Google"; "Sign up with Google" where it creates an account). The G is `aria-hidden`.

**Behaviour.** `[data-gd-google]`: sets `aria-busy` on click, blocks a double click, clears it on a back/forward cache restore, emits `gd:auth-google`. With `data-gd-return-to`, `?next=` is added at click time.

**Provenance.** extracted: web/shell.css:1374-1400 and 883-905; size per DECISIONS R3.

## Sign in modal

**Purpose.** Sign-in as a dialog, for a locked row clicked inside the app or an expired session that needs a full re-login. When the user arrived by a direct link with nothing behind it, use the full-page Login screen (the hub's `--solo` form, which is the same card on the lattice).

**Anatomy.** A `<dialog class="gd-modal gd-auth-modal">` (Feedback author's shell, z-index 90, scrim 80) holding `.gd-auth__card.gd-auth__card--bare` with the same head, doors and form as the Login screen, plus an optional destination line (`.gd-auth__dest`, link blue) under the title naming where the user is going, and `.gd-fb-close.gd-auth__x` with `data-gd-close`. Width 480, padding 40/32, radius 24. Open it with `[data-gd-modal-open="#id"]`.

**States and behaviour.** As Login screen (same hooks). Esc and the close button dismiss; focus returns to the opener (60-feedback). On success, `GD.auth.succeed` shows the status line inside the dialog.

**Tokens.** As Login screen, plus `--gd-raised-bg`.

**Provenance.** extracted: web/shell.css:805-960 (`.gw-modal`). The hub draws this in a top-level fixed overlay at z-index 100; here it is a native dialog on the shared layering.

## Access denied screen

**Purpose.** The visitor is signed in but this page is not for them. Use it instead of a blank page or a redirect loop. Do not use it for a signed-out visitor (that is Login screen) or for a record they cannot see inside an otherwise allowed page (that is the in-page no-access empty state, `.gd-empty--no-access`).

**Anatomy.** The auth page and card with `.gd-auth__card--denied` holding a `.gd-empty.gd-empty--no-access`: a 48px badge that is a **rounded square** (radius 12, never a circle) with the lock glyph, an `h1` title (20 semibold, "Admin access required"), one line of text, a `.gd-auth__who` chip "Signed in as {email}", and the actions: primary link "Ask the owner" (a link to the owner's Slack profile or mail) and an outline "Sign out" button. The badge fill is `--gd-auth-field` with a 1px edge, because the empty state's usual fill equals the card in dark.

**Copy.** Name the requirement and the remedy: "Review is for admins. Ask the owner if you need access." Say which account is signed in so a wrong-account visitor can switch. No apology, no error code.

**States.** Static. Buttons follow the shared states.

**Accessibility.** The card is `role="alert"` so it is announced on load; focus starts on the primary action.

**Behaviour.** `Sign out` is `data-gd-signout`; the app wires it (the set owns no auth endpoint).

**Provenance.** NEW: not in the hub as a page — reference Mobbin Linear / Notion / Vercel "no access" pages. Content mirrors the hub's admin-required empty state (web/internal/design-system.html:909). Pending library review.

## Session expired

**Purpose.** Tell the user their session lapsed and bring them back to the same place after signing in. Banner when the page is still readable and nothing failed yet; modal when an action just failed with a 401 and the user must act. Do not use it for a failed login (that is the form error line).

**Anatomy.** Banner: `.gd-banner.gd-banner--warning.gd-banner--session` (`role="alert"`) with title "Your session has expired", one line, and a small primary "Sign in" link. Modal: `dialog.gd-modal.gd-modal--sm.gd-modal--session[data-gd-static]` with the title, one line, a `code.gd-auth__path` chip showing where they will return to, and a primary "Sign in" link, autofocused.

**Return path.** The Sign in link is `/login?next=<current path, query and hash>`. Only a same-origin path is carried; an off-site `returnTo` falls back to the current page.

**Behaviour.** `GD.auth.sessionExpired({mode, returnTo, signInHref, host})` or dispatch `gd:session-expired` on `document` from the fetch wrapper that sees the 401. One notice at a time. The modal ignores a scrim click; Esc closes it and it becomes the banner, so the page is never left with no sign of the problem. Unsaved work is the app's to protect: this component carries only the path.

**Tokens.** `--gd-fb-warning-*`, `--gd-sunken-bg`, `--gd-text`, `--gw-radius-12`. z-index per the shared layering (dialog 90).

**Provenance.** NEW: not in the hub — reference Mobbin Linear / Intercom / Google Docs "session expired". Pending library review.
