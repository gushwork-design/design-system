/* 80 — build notice. Hooks: [data-gd-drift] (optional host; one is created if absent).
   Reads the build stamp, a comment of the form  gushwork-build:{"pluginVersion":…,"components":[…],…}
   anywhere in the document (the SAME comment scripts/check-drift.sh reads), fetches the published
   registry, and says something only when a component THIS build uses has moved on.

   Rules, unchanged from the old notice:
   1. It must never break the dashboard. Offline, private host, blocked CORS, malformed JSON: every
      failure path ends in silence.
   2. It fires once per change-set (recorded when SHOWN, not when dismissed). A later change is a
      different signature and earns one fresh showing.
   3. Never window.prompt as a clipboard fallback: it is modal. The text is revealed in place.
   4. The registry URL points at the public deploy, not raw.githubusercontent.com. */
(function () {
  GD.drift = GD.drift || {};
  var KEY = 'gw-drift-dismissed';

  function findStamp() {
    try {
      var w = document.createTreeWalker(document, NodeFilter.SHOW_COMMENT), n;
      while ((n = w.nextNode())) {
        var m = /gushwork-build:(\{[\s\S]*\})/.exec(n.nodeValue);
        if (m) return JSON.parse(m[1]);
      }
    } catch (e) {}
    return null;
  }
  function ver(v) { return String(v || '0.0.0').split('.').map(Number); }
  function newer(a, b) {
    var x = ver(a), y = ver(b);
    for (var i = 0; i < 3; i++) if ((x[i] | 0) !== (y[i] | 0)) return (x[i] | 0) > (y[i] | 0);
    return false;
  }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

  function build(stamp, must, may, gone) {
    var all = must.concat(may);
    var sig = all.map(function (c) { return c.name + '@' + c.version; }).concat(gone.map(function (g) { return g + '@gone'; })).sort().join(',');
    try { if ((localStorage.getItem(KEY) || '') === sig) return; } catch (e) {}

    var host = document.querySelector('[data-gd-drift]');
    if (!host) { host = el('aside', 'gd-drift'); host.setAttribute('role', 'status'); host.setAttribute('data-gd-drift', ''); (document.querySelector('.gd') || document.body).appendChild(host); }
    host.textContent = '';
    var breaking = must.length > 0 || gone.length > 0;
    var head = el('div', 'gd-drift__head');
    head.appendChild(el('span', 'gd-badge ' + (breaking ? 'gd-badge--bad' : 'gd-badge--warn'), breaking ? 'Out of date' : 'Update available'));
    head.appendChild(el('p', 'gd-drift__title', breaking
      ? 'The design has moved on. ' + (must.length + gone.length) + ' component' + ((must.length + gone.length) > 1 ? 's' : '') + ' here render differently now'
      : all.length + ' component' + (all.length > 1 ? 's have' : ' has') + ' been updated since this was built'));
    var close = el('button', 'gd-iconbtn'); close.type = 'button'; close.setAttribute('aria-label', 'Dismiss');
    close.innerHTML = '<svg width="16" height="16" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z"/></svg>';
    close.addEventListener('click', function () { host.classList.remove('is-on'); });
    head.appendChild(close);
    host.appendChild(head);

    var list = el('div', 'gd-drift__list');
    all.slice(0, 3).forEach(function (c) {
      var row = el('span', 'gd-drift__item'); row.appendChild(el('b', null, c.name + (c.breaking ? ' (breaking)' : '')));
      if (c.note) row.appendChild(document.createTextNode(' — ' + (c.note.length > 96 ? c.note.slice(0, 95).replace(/[ ,.;]+$/, '') + '…' : c.note)));
      else if (c.added) row.appendChild(document.createTextNode(' — new component'));
      list.appendChild(row);
    });
    gone.slice(0, 3).forEach(function (g) { var row = el('span', 'gd-drift__item'); row.appendChild(el('b', null, g)); row.appendChild(document.createTextNode(' — removed from the system')); list.appendChild(row); });
    if (all.length + gone.length > 3) list.appendChild(el('span', 'gd-drift__item', '+ ' + (all.length + gone.length - 3) + ' more'));
    host.appendChild(list);

    function promptText() {
      var to = (all[0] && all[0].registryVersion) || 'the current version';
      var lines = ['Update this dashboard to the Gushwork design system v' + to + '.', 'It was built on v' + stamp.pluginVersion + ' and these components have changed since:', ''];
      all.forEach(function (c) { lines.push('- ' + c.name + (c.breaking ? ' (BREAKING)' : '') + ' → v' + c.version + (c.doc ? '  [exports/dashboard/' + c.doc + ']' : '') + (c.note ? '\n    ' + c.note : (c.added ? '\n    new component' : ''))); });
      gone.forEach(function (g) { lines.push('- ' + g + ' → no longer exists; replace it with its successor in exports/dashboard/README.md'); });
      lines.push('', 'Read exports/dashboard/component-registry.json and the doc each entry points at, apply the changes to this file, then re-check it with scripts/check-drift.sh.');
      return lines.join('\n');
    }
    var acts = el('div', 'gd-drift__acts');
    var act = el('button', 'gd-btn gd-btn--outline gd-btn--sm', 'How to update'); act.type = 'button';
    var box = el('textarea', 'gd-drift__fallback'); box.readOnly = true;
    function done() { act.textContent = 'Copied, paste in Claude'; setTimeout(function () { act.textContent = 'How to update'; }, 4000); }
    function fallback(text) {
      var ta = el('textarea'); ta.value = text; ta.readOnly = true; ta.style.cssText = 'position:fixed;left:-9999px'; document.body.appendChild(ta); ta.select();
      var ok = false; try { ok = document.execCommand('copy'); } catch (e) {} ta.remove();
      if (ok) return done();
      box.value = text; box.style.display = 'block'; box.focus(); box.select(); act.textContent = 'Copy the text below';
    }
    act.addEventListener('click', function () {
      var t = promptText();
      try { if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(t).then(done, function () { fallback(t); }); else fallback(t); } catch (e) { fallback(t); }
    });
    acts.appendChild(act); host.appendChild(acts); host.appendChild(box);

    var foot = el('span', 'gd-drift__foot', 'built ' + (stamp.createdAt || '') + ' on v' + stamp.pluginVersion + ' · ');
    if (stamp.changelog) { var a = el('a', null, 'full changelog →'); a.href = stamp.changelog; a.target = '_blank'; a.rel = 'noopener'; foot.appendChild(a); }
    host.appendChild(foot);
    try { localStorage.setItem(KEY, sig); } catch (e) {}     /* recorded at SHOW time: a notice, not a nag */
    host.classList.add('is-on');
  }

  function check(stamp, reg) {
    var comps = (reg && reg.components) || {}, must = [], may = [], gone = [];
    (stamp.components || []).forEach(function (name) {
      var c = comps[name];
      if (!c) { gone.push(name); return; }
      if (!newer(c.version, stamp.pluginVersion)) return;
      (c.breaking ? must : may).push({ name: name, version: c.version, note: c.note, doc: c.doc, added: c.added, breaking: !!c.breaking, registryVersion: reg.registryVersion });
    });
    if (must.length || may.length || gone.length) build(stamp, must, may, gone);
  }

  GD.drift.run = function () {
    try {
      var stamp = findStamp();
      if (!stamp || !stamp.registry) return;
      fetch(stamp.registry, { cache: 'no-cache', mode: 'cors' })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (j) { if (j) check(stamp, j); })
        .catch(function () {});             /* offline, private, blocked: stay silent */
    } catch (e) {}
  };
  GD.drift._check = check;                 /* exposed for the verifier */
  /* deferred so it can never delay first paint, wrapped so it can never throw into the page */
  if (document.readyState === 'complete') setTimeout(GD.drift.run, 1200);
  else window.addEventListener('load', function () { setTimeout(GD.drift.run, 1200); });
})();
