/* ============================================================================
   _restricted-page.js — the page a signed-in person sees when this page is not theirs (R66, 8 Oct 2026).

   It is the dashboard system's access-denied-screen, served by the gate (middleware.js) with a 403: the auth page and
   card, a lock badge, a title, one line, who is signed in and which page they asked for, and the actions. Request access
   is the primary one: it posts to /api/access-request, which sends the owner a Slack DM with Approve and Decline, and the
   page then waits and opens itself when the answer is yes.

   Plain HTML and one small inline script, because it is returned from the edge with no shell around it. Styles are the
   shipped ones (dashboard.css), not a copy: the stylesheet and tokens are public (never reach the gate), so a
   signed-in person always gets them.

   OWNERS-ONLY PAGES offer no request: nothing Approve could grant (owners come from the environment, not the rules).
   WITHOUT SLACK SET UP the page says so and the primary action becomes a plain "Ask the owner" link.
   ========================================================================= */

/* "/admin/access-control" -> "Access control". Words for a person, derived from the path, never typed next to a rule.
   Lives here, not in _access-request.js, because middleware runs on the edge and that module needs node:crypto. */
export function titleFor(path) {
  const last = String(path || '/').split('/').filter(Boolean).pop() || 'Overview';
  let w = last; try { w = decodeURIComponent(last); } catch { /* keep it as written */ }
  w = w.replace(/\.html?$/, '').replace(/[-_]+/g, ' ').trim();
  return w ? w.charAt(0).toUpperCase() + w.slice(1) : 'Overview';
}

const OWNER_LINK = 'https://gushwork.slack.com/team/U06UAR183TR';

const LOCK = '<path d="M128,112a28,28,0,0,0-8,54.83V184a8,8,0,0,0,16,0V166.83A28,28,0,0,0,128,112Zm0,40a12,12,0,1,1,12-12A12,12,0,0,1,128,152Zm80-72H176V56a48,48,0,0,0-96,0V80H48A16,16,0,0,0,32,96V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V96A16,16,0,0,0,208,80ZM96,56a32,32,0,0,1,64,0V80H96ZM208,208H48V96H208V208Z"/>';
const CHECK = '<path d="M173.66,98.34a8,8,0,0,1,0,11.32l-56,56a8,8,0,0,1-11.32,0l-24-24a8,8,0,0,1,11.32-11.32L112,148.69l50.34-50.35A8,8,0,0,1,173.66,98.34ZM232,128A104,104,0,1,1,128,24,104.11,104.11,0,0,1,232,128Zm-16,0a88,88,0,1,0-88,88A88.1,88.1,0,0,0,216,128Z"/>';

/* The copy for each state. One place, so the page and the script cannot disagree. Sentence case, no apology, no code. */
export const COPY = {
  idle:     { title: 'Restricted page', text: 'This page isn’t open to everyone. Ask for access and the site owner will get a message to approve it.', glyph: 'lock' },
  owner:    { title: 'Restricted page', text: 'This page is for the site owners only.', glyph: 'lock' },
  sent:     { title: 'Request sent', text: 'The site owner has been asked. You’ll get a Slack message once it’s decided, and this page opens by itself when the answer is yes.', glyph: 'check' },
  declined: { title: 'Request not approved', text: 'The site owner didn’t approve access this time. If you still need this page, ask them directly.', glyph: 'lock' },
};

/* The same words for a page private to a staging lane: the team is who answers, so the page says so. */
export function copyFor(lane) {
  if (!lane) return COPY;
  return {
    ...COPY,
    idle:     { ...COPY.idle, text: `This page is private to the ${lane} team. Ask for access and the person who published it will get a message to approve it.` },
    sent:     { ...COPY.sent, text: 'The person who published it has been asked. You’ll get a Slack message once it’s decided, and this page opens by itself when the answer is yes.' },
    declined: { ...COPY.declined, text: 'The person who published it didn’t approve access this time. If you still need this page, ask them directly.' },
  };
}

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/**
 * @param {{ email: string, path: string, canRequest: boolean }} o
 *   canRequest is false for an owners-only page. Where an earlier request stands is asked of the API once the page
 *   loads, so a reload does not offer the button again and the edge needs no store of its own.
 */
export function restrictedPage({ email, path, canRequest, lane }) {
  const st = canRequest ? 'idle' : 'owner';
  const COPYL = copyFor(lane);
  const c = COPYL[st];
  const title = titleFor(path);
  const asking = st === 'idle';
  const primary = asking
    ? '<button type="button" class="gd-btn gd-btn--primary" data-req>Request access</button>'
    : (st === 'declined' ? `<a class="gd-btn gd-btn--primary" href="${OWNER_LINK}">Ask the owner</a>` : '');
  return '<!doctype html><html lang="en"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex">' +
    '<title>Restricted page</title>' +
    /* the same theme choice the rest of the hub keeps, applied before first paint */
    '<script>try{var c=localStorage.getItem("gw-theme-choice"),t=c==="dark"||c==="light"?c:(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");document.documentElement.setAttribute("data-theme",t)}catch(e){document.documentElement.setAttribute("data-theme","light")}</script>' +
    '<link rel="stylesheet" href="/foundation/tokens.css"><link rel="stylesheet" href="/exports/dashboard/dashboard.css">' +
    '</head><body style="margin:0"><div class="gd"><div class="gd-auth"><div class="gd-auth__grid" aria-hidden="true"></div>' +
    `<div class="gd-auth__card gd-auth__card--denied" role="alert" id="card"><div class="gd-empty gd-empty--no-access${st === 'sent' ? ' gd-empty--sent' : ''}" id="empty">` +
    `<div class="gd-empty__badge"><svg viewBox="0 0 256 256" width="20" height="20" fill="currentColor" aria-hidden="true" id="glyph">${c.glyph === 'check' ? CHECK : LOCK}</svg></div>` +
    `<div class="gd-empty__copy"><h1 class="gd-empty__title" id="title">${esc(c.title)}</h1><p class="gd-empty__text" id="text">${esc(c.text)}</p></div></div>` +
    `<div class="gd-auth__facts"><span class="gd-auth__who">Signed in as ${esc(email)}</span><span class="gd-auth__who">Page: ${esc(title)}</span></div>` +
    `<div class="gd-auth__foot" id="foot">${primary}<button type="button" class="gd-btn gd-btn--outline" data-signout>Sign out</button></div>` +
    '<p class="gd-auth__note" id="note" hidden></p>' +
    '<a class="gd-btn gd-btn--link gd-btn--sm" href="/">Back to Gushwork Design</a>' +
    '</div></div></div>' + script(path, st, COPYL) + '</body></html>';
}

/* JSON that is safe inside an inline <script>: a path or a string containing </script> must not end the script. */
const js = (x) => JSON.stringify(x).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');

/* The page's behaviour. Request access posts, then polls for the answer; a yes reloads into the page itself. */
function script(path, st, copy) {
  return '<script>(function(){' +
    'var P=' + js(path) + ',C=' + js(copy) + ',OWN=' + js(OWNER_LINK) + ',S=' + js(st) + ';' +
    'var $=function(i){return document.getElementById(i)};' +
    'var btn=document.querySelector("[data-req]");' +
    'function show(k){var c=C[k];$("title").textContent=c.title;$("text").textContent=c.text;' +
      '$("empty").classList.toggle("gd-empty--sent",k==="sent");' +
      '$("glyph").innerHTML=c.glyph==="check"?' + js(CHECK) + ':' + js(LOCK) + ';}' +
    'function note(t,bad){var n=$("note");n.textContent=t||"";n.hidden=!t;n.classList.toggle("gd-auth__note--error",!!bad);}' +
    'function fallback(){note("Requests aren’t working right now.",true);if(btn){var a=document.createElement("a");a.className="gd-btn gd-btn--primary";a.href=OWN;a.textContent="Ask the owner";btn.replaceWith(a);btn=null;}}' +
    'function declined(){show("declined");if(btn){btn.remove();btn=null}var f=$("foot"),a=document.createElement("a");a.className="gd-btn gd-btn--primary";a.href=OWN;a.textContent="Ask the owner";f.insertBefore(a,f.firstChild);note("")}' +
    'function api(m,b){return fetch("/api/access-request"+(m==="GET"?"?path="+encodeURIComponent(P):""),{method:m,credentials:"same-origin",headers:{"Content-Type":"application/json"},body:m==="POST"?JSON.stringify({path:P}):undefined}).then(function(r){return r.json().then(function(j){return{ok:r.ok,s:r.status,j:j}})})}' +
    'var polls=0,timer=0;' +
    'function wait(){if(timer)return;timer=setInterval(function(){if(document.hidden||++polls>200){return}api("GET").then(function(r){var s=r.j&&r.j.state;' +
      'if(s==="allowed"||s==="approved"){clearInterval(timer);location.reload();}' +
      'else if(s==="declined"){clearInterval(timer);timer=0;declined();}' +
    '}).catch(function(){})},6000);}' +
    'if(btn){btn.addEventListener("click",function(){btn.setAttribute("aria-busy","true");btn.setAttribute("aria-disabled","true");note("");' +
      'api("POST").then(function(r){btn.removeAttribute("aria-busy");' +
        'if(r.ok&&r.j.state==="allowed"){location.reload();return}' +
        'if(r.ok&&(r.j.state==="pending"||r.j.state==="declined")){if(r.j.state==="declined"){declined()}else{show("sent");btn.remove();btn=null;wait()}return}' +
        'if(r.s===429){btn.removeAttribute("aria-disabled");note(r.j.error,true);return}' +
        'if(r.s===401){location.href="/?signin=required&next="+encodeURIComponent(P);return}' +
        'fallback()}).catch(function(){btn.removeAttribute("aria-busy");btn.removeAttribute("aria-disabled");fallback()})});}' +
    /* where an earlier request stands, so a reload does not offer the button again */
    "if(S==='idle'){api('GET').then(function(r){var j=r.j||{},s=j.state;" +
      "if(s==='allowed'){location.reload();return}" +
      "if(s==='pending'){show('sent');if(btn){btn.remove();btn=null}wait();return}" +
      "if(s==='declined'){declined();return}" +
      "if(j.canRequest===false)fallback()}).catch(function(){})}" +
    'document.querySelector("[data-signout]").addEventListener("click",function(){location.href="/api/auth/logout?next=/"});' +
  '})()</script>';
}
