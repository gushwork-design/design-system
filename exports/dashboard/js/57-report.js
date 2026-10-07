/* ============================================================================
   Gushwork dashboard — 57 report: Generate report

   A dashboard that has a report offers one header action, "Generate report" (reports.md). It opens a dialog that asks for a time range and the
   sections to include, then fires ONE event; the page, which owns the data and the storage, makes the report and answers with a link.

     <button class="gd-btn gd-btn--outline" data-gd-modal-open="#gen-report">Generate report</button>
     <dialog class="gd-modal" id="gen-report" data-gd-gr> … </dialog>          (markup in reports.md)

   The page claims the request and answers it:

     dialog.addEventListener('gd:generate-report', (e) => {
       e.preventDefault();                                   // "I will handle this"; without it the dialog says it is not connected
       makeReport(e.detail).then((r) => GD.report.ready(dialog, { url: r.url }), (err) => GD.report.fail(dialog, { message: err.message }));
     });

   e.detail is { range, sections } : range is the select's value, sections the values of the checked [name=section] boxes.
   States, on the dialog as data-gd-state: form, working, ready, error. Regions are [data-gd-gr="form|working|ready|error"], shown one at a time.
   NEW, pending library review.
   ============================================================================ */
  const doc = document;
  const $ = (s, r) => (r || doc).querySelector(s), $$ = (s, r) => Array.from((r || doc).querySelectorAll(s));
  const emit = (el, name, detail, cancelable) => { const ev = new CustomEvent(name, { bubbles: true, cancelable: !!cancelable, detail }); el.dispatchEvent(ev); return ev; };

  function show(d, state) {
    d.setAttribute('data-gd-state', state);
    $$('[data-gd-gr]', d).forEach((r) => { r.hidden = r.getAttribute('data-gd-gr').split(' ').indexOf(state) < 0; });
    const go = $('[data-gd-gr-submit]', d); if (go) { go.disabled = state === 'working'; go.setAttribute('aria-busy', String(state === 'working')); }
    const f = $('[data-gd-gr="' + state + '"] [autofocus], [data-gd-gr~="' + state + '"] [autofocus]', d); if (f) f.focus();
  }

  function values(d) {
    const sel = $('[data-gd-select] input[type="hidden"]', d);
    return { range: sel ? sel.value : '', sections: $$('input[name="section"]:checked', d).map((i) => i.value) };
  }

  doc.addEventListener('gd:open', (e) => { const d = e.target; if (d.matches && d.matches('dialog[data-gd-gr]')) show(d, 'form'); });

  doc.addEventListener('click', (e) => {
    const d = e.target.closest && e.target.closest('dialog[data-gd-gr]'); if (!d) return;
    if (e.target.closest('[data-gd-gr-retry]')) { show(d, 'form'); return; }
    if (e.target.closest('[data-gd-gr-copy]')) {
      const url = $('[data-gd-gr-url]', d); if (!url) return;
      const done = () => { if (GD.toast) GD.toast('Link copied', { type: 'success' }); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url.value).then(done, () => { url.select(); });
      else { url.select(); try { doc.execCommand('copy'); done(); } catch (x) {} }
      return;
    }
    if (!e.target.closest('[data-gd-gr-submit]')) return;
    const v = values(d);
    if (!v.sections.length) { const help = $('[data-gd-gr-need]', d); if (help) help.hidden = false; return; }     // at least one section
    const help = $('[data-gd-gr-need]', d); if (help) help.hidden = true;
    show(d, 'working');
    const ev = emit(d, 'gd:generate-report', v, true);
    if (!ev.defaultPrevented) GD.report.fail(d, { message: 'This dashboard is not connected to a report service yet.' });     // never a button that does nothing
  });

  GD.report = {
    ready(d, o) {
      const url = $('[data-gd-gr-url]', d), open = $('[data-gd-gr-open]', d);
      if (url) url.value = (o && o.url) || ''; if (open) open.setAttribute('href', (o && o.url) || '#');
      show(d, 'ready'); emit(d, 'gd:report-ready', { url: o && o.url });
    },
    fail(d, o) {
      const m = $('[data-gd-gr-message]', d); if (m) m.textContent = (o && o.message) || 'The report could not be made.';
      show(d, 'error');
    }
  };
