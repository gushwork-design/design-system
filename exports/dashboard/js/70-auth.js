/* ============================================================================
   Gushwork dashboard — 70 auth (behaviour)
   Vanilla ES2020, no dependencies. Delegated listeners on document, so everything survives a page swap.
   Exposes window.GD.auth.

   HOOKS
   form             <form data-gd-auth-form novalidate>   validates on submit, sets aria-busy on the submit button, then fires the
                    cancelable event gd:auth-submit {email, password, next, form}. preventDefault() and call GD.auth.succeed / GD.auth.fail
                    when your request settles; if nobody prevents it, the form is submitted natively (action/method on the <form>).
   field            [data-gd-auth-field="email|password"] on the <input>; its .gd-field wrapper gets data-state="error" and the input
                    aria-invalid + aria-describedby. Errors clear as you type; a touched field re-checks on blur.
   form error       [data-gd-auth-error] inside the form: the server's "wrong password" line (role=alert).
   reveal           [data-gd-auth-reveal] button inside a field: toggles the sibling input between password and text, keeps aria-pressed
                    and aria-label ("Show password" / "Hide password") in sync, leaves focus and caret where they were.
   google           [data-gd-google] on the Google button/link: sets aria-busy on click (the click still navigates), ignores a second click,
                    and clears the state when the page is restored from the back/forward cache.
   return-to        [data-gd-return-to] on a link or a form: at click/submit time the current path (or ?next= on a sign-in page) is carried
                    as ?next= (links) or into the form's input[name=next]. Only same-origin paths are carried (see GD.auth.safeNext).
   session expired  GD.auth.sessionExpired({mode:'modal'|'banner', returnTo, signInHref, host})  or the event gd:session-expired on document
                    (detail = the same options). One at a time. Esc on the modal turns it into the banner; the page is never left blank.
                    Markup carrying [data-gd-session-expired] is also recognised, so a server can render it.
   API              GD.auth.safeNext(raw) -> '/path' | ''   GD.auth.succeed(form, {destination, redirect, delay})   GD.auth.fail(form, {message, field})
   Events           gd:auth-submit (cancelable), gd:auth-google, gd:auth-success {redirect}, gd:session-expired
   ============================================================================ */
(function () {
  'use strict';
  window.GD = window.GD || {};
  const doc = document;
  const $ = (s, r) => (r || doc).querySelector(s);
  const emit = (el, name, detail, cancelable) => el.dispatchEvent(new CustomEvent(name, { bubbles: true, cancelable: !!cancelable, detail }));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  let uid = 0;

  /* --- return-to ------------------------------------------------------------- */
  /* Only a same-origin absolute path survives: '/reports?x=1#y'. '//evil.com', '/\evil.com', 'https://…', 'javascript:' all return ''. The server
     must still validate on its side; this only refuses to forward something obviously off-site. */
  function safeNext(raw) {
    if (typeof raw !== 'string' || !raw) return '';
    let s = raw.trim();
    if (s[0] !== '/' || s[1] === '/' || s[1] === '\\' || /[\u0000-\u001f]/.test(s)) return '';
    try { const u = new URL(s, location.origin); if (u.origin !== location.origin) return ''; } catch (e) { return ''; }
    return s;
  }
  function currentNext() {
    const q = safeNext(new URLSearchParams(location.search).get('next') || '');
    if (q) return q;                                   // already on a sign-in page: keep what the bounce carried
    return safeNext(location.pathname + location.search + location.hash);
  }
  function withNext(href, next) {
    if (!next) return href;
    try { const u = new URL(href, location.origin); u.searchParams.set('next', next); return u.origin === location.origin ? u.pathname + u.search + u.hash : u.href; }
    catch (e) { return href; }
  }

  /* --- validation -------------------------------------------------------------- */
  const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const RULES = {
    email: (v) => (!v.trim() ? 'Enter your work email' : !EMAIL.test(v.trim()) ? 'That email address does not look right' : ''),
    password: (v) => (!v ? 'Enter your password' : '')
  };
  const wrapOf = (input) => input.closest('.gd-field');
  function errEl(input) {
    const w = wrapOf(input); if (!w) return null;
    let e = w.querySelector('.gd-field__error');
    if (!e) {
      e = doc.createElement('p'); e.className = 'gd-field__error'; e.hidden = true;
      e.id = 'gd-auth-err-' + (++uid); w.appendChild(e);
    } else if (!e.id) e.id = 'gd-auth-err-' + (++uid);
    return e;
  }
  const ERR_ICON = '<svg viewBox="0 0 256 256" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm-8-80V80a8,8,0,0,1,16,0v56a8,8,0,0,1-16,0Zm20,36a12,12,0,1,1-12-12A12,12,0,0,1,140,172Z"/></svg>';
  function setError(input, msg) {
    const w = wrapOf(input), e = errEl(input); if (!w || !e) return;
    if (msg) {
      w.setAttribute('data-state', 'error'); input.setAttribute('aria-invalid', 'true');
      e.innerHTML = ERR_ICON + '<span>' + esc(msg) + '</span>'; e.hidden = false;
      const ids = (input.getAttribute('aria-describedby') || '').split(' ').filter(Boolean);
      if (ids.indexOf(e.id) < 0) input.setAttribute('aria-describedby', ids.concat(e.id).join(' '));
    } else {
      w.removeAttribute('data-state'); input.removeAttribute('aria-invalid'); e.hidden = true; e.textContent = '';
      const ids = (input.getAttribute('aria-describedby') || '').split(' ').filter((x) => x && x !== e.id);
      if (ids.length) input.setAttribute('aria-describedby', ids.join(' ')); else input.removeAttribute('aria-describedby');
    }
  }
  function check(input) {
    const rule = RULES[input.getAttribute('data-gd-auth-field')];
    const msg = rule ? rule(input.value) : '';
    setError(input, msg); return !msg;
  }
  const formError = (form, msg) => {
    const e = $('[data-gd-auth-error]', form); if (!e) return;
    if (msg) { e.innerHTML = ERR_ICON + '<span>' + esc(msg) + '</span>'; e.hidden = false; } else { e.hidden = true; e.textContent = ''; }
  };
  const submitBtn = (form) => $('[type="submit"]', form);
  function setBusy(form, on) {
    const b = submitBtn(form); if (b) { if (on) b.setAttribute('aria-busy', 'true'); else b.removeAttribute('aria-busy'); }
    form.querySelectorAll('[data-gd-auth-field]').forEach((i) => { i.readOnly = on; });   // readonly, not disabled: the values still submit and focus is not lost
    form.toggleAttribute('data-busy', on);
  }

  doc.addEventListener('input', (ev) => {
    const i = ev.target.closest && ev.target.closest('[data-gd-auth-field]'); if (!i) return;
    i.setAttribute('data-gd-touched', '');
    if (wrapOf(i) && wrapOf(i).getAttribute('data-state') === 'error') check(i);
    const f = i.closest('[data-gd-auth-form]'); if (f) formError(f, '');
  });
  doc.addEventListener('focusout', (ev) => {
    const i = ev.target.closest && ev.target.closest('[data-gd-auth-field]');
    if (i && i.hasAttribute('data-gd-touched')) check(i);
  });

  doc.addEventListener('submit', (ev) => {
    const form = ev.target.closest && ev.target.closest('[data-gd-auth-form]'); if (!form) return;
    if (form.hasAttribute('data-busy')) { ev.preventDefault(); return; }
    const inputs = Array.from(form.querySelectorAll('[data-gd-auth-field]'));
    const bad = inputs.filter((i) => !check(i));
    formError(form, '');
    if (bad.length) { ev.preventDefault(); bad[0].focus(); return; }
    const next = $('input[name="next"]', form);
    if (next && form.hasAttribute('data-gd-return-to')) next.value = currentNext();
    const val = (n) => { const i = form.querySelector('[data-gd-auth-field="' + n + '"]'); return i ? i.value : undefined; };
    setBusy(form, true);
    const go = emit(form, 'gd:auth-submit', { form, email: val('email') && val('email').trim(), password: val('password'), next: next ? next.value : currentNext() }, true);
    if (!go) ev.preventDefault();               // the consumer owns the request and will call succeed() / fail()
    /* otherwise the native submit proceeds and the page navigates away; aria-busy stays until it does */
  });

  /* --- the consumer's answer ---------------------------------------------------- */
  function succeed(form, o) {
    o = o || {}; setBusy(form, false);
    const card = form.closest('.gd-auth__card'); if (!card) return;
    card.setAttribute('data-state', 'success');
    const d = $('[data-gd-auth-destination]', card); if (d && o.destination) d.textContent = o.destination;
    const redirect = safeNext(o.redirect || '') || '';
    emit(card, 'gd:auth-success', { redirect });
    if (redirect) setTimeout(() => { location.assign(redirect); }, o.delay == null ? 600 : o.delay);
  }
  function fail(form, o) {
    o = o || {}; setBusy(form, false);
    const field = o.field && form.querySelector('[data-gd-auth-field="' + o.field + '"]');
    if (field) { setError(field, o.message || 'Check this and try again'); field.focus(); }
    else { formError(form, o.message || 'We could not sign you in. Try again.'); const f = form.querySelector('[data-gd-auth-field]'); if (f) f.focus(); }
  }

  /* --- show / hide password ------------------------------------------------------ */
  doc.addEventListener('click', (ev) => {
    const t = ev.target.closest && ev.target.closest('[data-gd-auth-reveal]'); if (!t) return;
    const input = t.closest('.gd-input') && $('input', t.closest('.gd-input')); if (!input) return;
    const show = input.type === 'password';
    const a = input.selectionStart, b = input.selectionEnd;
    input.type = show ? 'text' : 'password';
    t.setAttribute('aria-pressed', String(show));
    t.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
    try { input.setSelectionRange(a, b); } catch (e) { /* not supported on this type */ }
    input.focus();
  });

  /* --- google ------------------------------------------------------------------- */
  doc.addEventListener('click', (ev) => {
    const g = ev.target.closest && ev.target.closest('[data-gd-google]'); if (!g) return;
    if (g.getAttribute('aria-busy') === 'true' || g.getAttribute('aria-disabled') === 'true') { ev.preventDefault(); return; }
    if (g.hasAttribute('data-gd-return-to') && g.tagName === 'A') g.setAttribute('href', withNext(g.getAttribute('href') || '/api/auth/login', currentNext()));
    g.setAttribute('aria-busy', 'true');
    emit(g, 'gd:auth-google', { href: g.getAttribute('href') });
  });
  window.addEventListener('pageshow', (ev) => { if (ev.persisted) doc.querySelectorAll('[data-gd-google][aria-busy]').forEach((g) => g.removeAttribute('aria-busy')); });

  /* --- return-to on plain links --------------------------------------------------- */
  doc.addEventListener('click', (ev) => {
    const a = ev.target.closest && ev.target.closest('a[data-gd-return-to]:not([data-gd-google])'); if (!a) return;
    a.setAttribute('href', withNext(a.getAttribute('href') || '/login', currentNext()));
  });

  /* --- session expired ----------------------------------------------------------- */
  const WARN = '<svg viewBox="0 0 256 256" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm-8-80V80a8,8,0,0,1,16,0v56a8,8,0,0,1-16,0Zm20,36a12,12,0,1,1-12-12A12,12,0,0,1,140,172Z"/></svg>';
  function dismissExisting() { doc.querySelectorAll('[data-gd-session-expired]').forEach((n) => { if (n.tagName === 'DIALOG' && n.open) n.close(); n.remove(); }); }
  function sessionExpired(o) {
    o = o || {};
    const next = safeNext(o.returnTo || '') || currentNext();
    const href = withNext(o.signInHref || '/login', next);
    const host = o.host || $('[data-gd-session-host]') || doc.body;
    const mode = o.mode === 'banner' ? 'banner' : 'modal';
    if ($('[data-gd-session-expired][data-mode="' + mode + '"]')) return;
    dismissExisting();
    if (mode === 'banner') {
      const b = doc.createElement('div');
      b.className = 'gd-banner gd-banner--warning gd-banner--session'; b.setAttribute('role', 'alert');
      b.setAttribute('data-gd-session-expired', ''); b.setAttribute('data-mode', 'banner');
      b.innerHTML = '<span class="gd-banner__icon">' + WARN + '</span><div class="gd-banner__body"><span class="gd-banner__title">Your session has expired</span>' +
        '<span>Sign in again to keep working. You will come back to this page.</span></div>' +
        '<div class="gd-banner__actions"><a class="gd-btn gd-btn--primary gd-btn--sm" href="' + esc(href) + '">Sign in</a></div>';
      host.insertBefore(b, host.firstChild); return b;
    }
    const d = doc.createElement('dialog');
    d.className = 'gd-modal gd-modal--sm gd-modal--session'; d.setAttribute('data-gd-session-expired', ''); d.setAttribute('data-mode', 'modal');
    d.setAttribute('data-gd-static', ''); d.setAttribute('aria-labelledby', 'gd-session-t'); d.setAttribute('aria-describedby', 'gd-session-d');
    d.innerHTML = '<div class="gd-modal__head"><h2 class="gd-modal__title" id="gd-session-t">Your session has expired</h2></div>' +
      '<div class="gd-modal__body" id="gd-session-d"><p style="margin:0">Sign in again to keep working. You will come back to:</p><code class="gd-auth__path">' + esc(next || '/') + '</code></div>' +
      '<div class="gd-modal__foot"><a class="gd-btn gd-btn--primary" href="' + esc(href) + '" autofocus>Sign in</a></div>';
    host.appendChild(d);
    d.addEventListener('close', () => { if (d.isConnected && !d.hasAttribute('data-signing-in')) { d.remove(); sessionExpired({ mode: 'banner', returnTo: next, signInHref: o.signInHref, host: o.host }); } });
    d.addEventListener('click', (e) => { if (e.target.closest('a')) d.setAttribute('data-signing-in', ''); });
    if (typeof d.showModal === 'function') d.showModal(); else d.setAttribute('open', '');
    return d;
  }
  doc.addEventListener('gd:session-expired', (ev) => sessionExpired(ev.detail));

  window.GD.auth = { safeNext, succeed, fail, sessionExpired };
})();
