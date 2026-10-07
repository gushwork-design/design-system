/* 90 — counting KPI numbers (R65). Hooks: none. A stat card's or a metric strip's value counts up once to
   its figure instead of appearing, so a page reads as arriving. Everything else about motion is CSS
   (css/95-motion.css); this is the one thing CSS cannot do.

   Rules:
   1. Once. A figure that is redrawn unchanged (a filter that leaves it alone, a re-render) shows at
      once. A figure that CHANGES counts from the old one to the new one, so a date-range switch reads
      as the number moving, not as a flash.
   2. Only plain figures move: 1,204   $4,310   3.1%   12k. A prefix and a suffix of up to three
      characters are kept, and so is the number of decimals. Anything else ("3 min ago", "12:04", "—")
      is left exactly as it was written.
   3. Never leave a number half-counted. A hidden tab runs no animation frames, so a timer writes the
      final figure after the count would have ended.
   4. Nothing runs for someone who asked for reduced motion, or when printing. It must never throw into the page.
   5. A count that has ended stays ended. The frame loop stops when the timer writes the final figure, and its
      clock starts at its own first frame, not at performance.now(): a headless render with a virtual clock
      (scripts that print a report to PDF) gives frames a different time base, and a loop that kept running past
      the final write once left a report's KPIs at 11 times their value (found 8 Oct 2026, fixed the same day). */
  try {
    if (!window.matchMedia || matchMedia('(prefers-reduced-motion: reduce)').matches || matchMedia('print').matches) return;
    const SEL = '.gd-stat-card__value, .gd-metric-strip__value';
    const FIG = /^([^\d\-.,\s]{0,3})(-?\d{1,3}(?:,\d{3})+|-?\d+)(\.\d+)?([^\d.,\s]{0,3})$/;
    const seen = new Map();                                   // card label -> the figure last shown
    const DUR = 600;

    function parse(txt) {
      const m = FIG.exec(txt.trim()); if (!m) return null;
      const n = parseFloat((m[2] + (m[3] || '')).replace(/,/g, ''));
      return isNaN(n) || Math.abs(n) > 1e9 ? null : { pre: m[1], n: n, dec: m[3] ? m[3].length - 1 : 0, comma: m[2].indexOf(',') !== -1, suf: m[4] };
    }
    function show(p, v) {
      let s = Math.abs(v).toFixed(p.dec);
      if (p.comma) { const parts = s.split('.'); parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ','); s = parts.join('.'); }
      return p.pre + (v < 0 ? '-' : '') + s + p.suf;
    }
    function keyOf(el) {
      const box = el.closest('.gd-stat-card, .gd-metric-strip__item');
      const lab = box && box.querySelector('.gd-stat-card__name, .gd-stat-card__label, .gd-metric-strip__label');
      const host = el.closest('[id]');
      return (host ? host.id : '') + '|' + (lab ? lab.textContent.trim() : '');
    }
    function run(el) {
      // A write that is not ours while a count is running means the page drew a newer figure: stop the old count
      // (its final write would otherwise put the stale figure back) and start a new one from where this one aimed.
      if (el.__gdBusy) { if (el.textContent === el.__gdLast) return; el.__gdCancel(); }
      const txt = el.textContent, p = parse(txt); if (!p) return;
      const k = keyOf(el), prev = seen.has(k) ? seen.get(k) : 0;
      seen.set(k, p.n);
      if (prev === p.n) return;
      const put = function (t) { el.__gdLast = t; el.textContent = t; };
      let live = true, t0 = null, timer = 0;
      const stop = function () { clearTimeout(timer); live = false; el.__gdBusy = false; };
      const done = function () { stop(); put(txt); };        // the final figure, whether or not frames ever come
      el.__gdBusy = true; el.__gdCancel = stop;
      timer = setTimeout(done, DUR + 250);
      put(show(p, prev));                                     // no flash of the final figure before the first frame
      requestAnimationFrame(function frame(t) {
        if (!live) return;
        if (t0 === null) t0 = t;
        const f = Math.min(1, Math.max(0, (t - t0) / DUR)), e = 1 - Math.pow(1 - f, 3);
        put(show(p, prev + (p.n - prev) * e));
        if (f < 1) requestAnimationFrame(frame); else done();
      });
    }
    new MutationObserver(function (ms) {
      ms.forEach(function (m) {
        const t = m.target.nodeType === 1 ? m.target : m.target.parentElement;
        const el = t && t.closest && t.closest(SEL); if (el) run(el);
        [].forEach.call(m.addedNodes, function (n) { if (n.nodeType === 1) { if (n.matches && n.matches(SEL)) run(n); else if (n.querySelectorAll) n.querySelectorAll(SEL).forEach(run); } });
      });
    }).observe(document, { childList: true, subtree: true, characterData: true });
    const all = function () { document.querySelectorAll(SEL).forEach(run); };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', all); else all();
  } catch (e) { /* motion is a nicety; never the reason a dashboard breaks */ }
