/* ─────────────────────────────────────────────────────────────────
   Print exports for the award certificate: PDF (A4, vector), JPG
   (300 dpi) and PSD (one raster layer per part, 300 dpi).

   PDF   pdf-lib + fontkit. Everything is drawn as vectors: the frame, the
         panel, the 20 px grid, the logo paths and the text, as glyph outlines
         shaped by fontkit (kerning and the signature's joined forms), over an
         invisible text layer in the embedded fonts so it stays searchable. Word positions are
         read off the live preview, so the PDF breaks lines exactly where
         the preview does. The blue is #0072CE in RGB, the same as the JPG
         and PSD: as CMYK 100 45 0 19 it previewed a dull navy on screen.
   JPG   html-to-image at 300/72, resampled to exactly 2480 × 3508, with
         300 dpi written into the JFIF header so print dialogs size it A4.
   PSD   ag-psd. Each data-layer of the certificate is captured on its own
         (the rest hidden) and cropped to its bounds; the composite is the
         same image as the JPG.
   ───────────────────────────────────────────────────────────────── */
(function () {
  const BASE = '/internal/award-certificate/assets/fonts/';
  const FONT_FILES = {
    display: BASE + 'VertGroteskDisplay-Bold.ttf',
    body: BASE + 'Inter-Regular.ttf',
    bodySemi: BASE + 'Inter-SemiBold.ttf',
    sig: '/fonts/Balfontheim-Signature.ttf',
  };
  /* Where the baseline sits inside a text rect: ascent / (ascent + descent),
     in the metrics the browser lays out with (typo metrics where the font
     sets USE_TYPO_METRICS, hhea otherwise). Read with fontTools, 5 Oct 2026. */
  const ASCENT_RATIO = {
    display: 920 / (920 + 170),       // Vert: typo 920 / −170
    body: 1984 / (1984 + 494),        // Inter: typo 1984 / −494
    bodySemi: 1984 / (1984 + 494),
    sig: 1458 / (1458 + 603),         // Balfontheim: hhea 1458 / −603
  };
  const DPI = 300;
  const A4_PX = { w: 2480, h: 3508 };          // 210 × 297 mm at 300 dpi
  const A4_PT = { w: 595.28, h: 841.89 };
  const LAYERS = ['Background', 'Panel', 'Grid', 'Headline', 'Citation', 'Signature', 'Signed by', 'Logo'];

  const fontBytesCache = {};
  function fontBytes(key) {
    if (!fontBytesCache[key]) {
      fontBytesCache[key] = fetch(FONT_FILES[key]).then((r) => {
        if (!r.ok) throw new Error('Font failed to load: ' + FONT_FILES[key]);
        return r.arrayBuffer();
      });
    }
    return fontBytesCache[key];
  }

  function save(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  function parseRgb(css) {
    const m = String(css).match(/rgba?\(([^)]+)\)/);
    if (!m) return [0, 0, 0];
    return m[1].split(',').slice(0, 3).map((v) => parseFloat(v));
  }
  function hexRgb(hex) {
    const h = hex.replace('#', '');
    return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  }

  /* The scale the preview applies to the certificate (it is drawn at 595 wide). */
  function scaleOf(el) {
    return el.getBoundingClientRect().width / window.CERT.W || 1;
  }

  /* ── PDF ──────────────────────────────────────────────────────── */
  async function exportPdf(certEl, opts) {
    const { PDFDocument, rgb } = window.PDFLib;
    const C = window.CERT;
    const W = C.W, H = C.H;
    await document.fonts.ready;

    const doc = await PDFDocument.create();
    doc.registerFontkit(window.fontkit);
    const fonts = {};
    const shapers = {};
    for (const key of Object.keys(FONT_FILES)) {
      shapers[key] = window.fontkit.create(new Uint8Array(await fontBytes(key)));
      // full embed: pdf-lib's subsetter drops glyphs from these cuts (seen 5 Oct 2026)
      fonts[key] = await doc.embedFont(await fontBytes(key), { subset: false });
    }
    const page = doc.addPage([W, H]);
    const blueRgb = hexRgb(C.blue);
    const BLUE = rgb(blueRgb[0] / 255, blueRgb[1] / 255, blueRgb[2] / 255);   // #0072CE; cmyk(1, .45, 0, .19) previews navy
    const colourOf = (arr) =>
      arr[0] === blueRgb[0] && arr[1] === blueRgb[1] && arr[2] === blueRgb[2]
        ? BLUE
        : rgb(arr[0] / 255, arr[1] / 255, arr[2] / 255);

    // frame
    page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: BLUE });

    // panel (rounded)
    const px = C.panelInset, py = C.panelInset, pw = C.panelW, ph = C.panelH, r = C.panelR;
    const rr = `M${r} 0H${pw - r}A${r} ${r} 0 0 1 ${pw} ${r}V${ph - r}A${r} ${r} 0 0 1 ${pw - r} ${ph}H${r}A${r} ${r} 0 0 1 0 ${ph - r}V${r}A${r} ${r} 0 0 1 ${r} 0Z`;
    const panelRgb = hexRgb(C.panel);
    page.drawSvgPath(rr, { x: px, y: H - py, color: rgb(panelRgb[0] / 255, panelRgb[1] / 255, panelRgb[2] / 255) });

    // grid: each 20 px segment takes the gradient's colour at its midpoint,
    // flattened at 70% over the panel (PDF has no gradient stroke in pdf-lib)
    const gIn = hexRgb(C.gridIn), gOut = hexRgb(C.gridOut);
    const th = (-118.727 * Math.PI) / 180, gx = 437.5, gy = 653, sx = 586.715, sy = 855.769;
    const gradT = (x, y) => {
      const dx = x - gx, dy = y - gy;
      const u = (dx * Math.cos(-th) - dy * Math.sin(-th)) / sx;
      const v = (dx * Math.sin(-th) + dy * Math.cos(-th)) / sy;
      return Math.min(1, Math.hypot(u, v));
    };
    const segColour = (x, y) => {
      const t = gradT(x, y);
      const c = gIn.map((v, i) => v + (gOut[i] - v) * t);
      const f = c.map((v, i) => panelRgb[i] * (1 - C.gridOpacity) + v * C.gridOpacity);
      return rgb(f[0] / 255, f[1] / 255, f[2] / 255);
    };
    // clip to the panel's rounded rect, as Figma clips 66:5 to 66:4
    const { pushGraphicsState, popGraphicsState, moveTo, lineTo, appendBezierCurve, closePath, clip, endPath } = window.PDFLib;
    const K = 0.5523 * r;                      // quarter-circle bezier handle
    const X = (v) => px + v, Y = (v) => H - (py + v);
    page.pushOperators(
      pushGraphicsState(),
      moveTo(X(r), Y(0)), lineTo(X(pw - r), Y(0)),
      appendBezierCurve(X(pw - r + K), Y(0), X(pw), Y(r - K), X(pw), Y(r)),
      lineTo(X(pw), Y(ph - r)),
      appendBezierCurve(X(pw), Y(ph - r + K), X(pw - r + K), Y(ph), X(pw - r), Y(ph)),
      lineTo(X(r), Y(ph)),
      appendBezierCurve(X(r - K), Y(ph), X(0), Y(ph - r + K), X(0), Y(ph - r)),
      lineTo(X(0), Y(r)),
      appendBezierCurve(X(0), Y(r - K), X(r - K), Y(0), X(r), Y(0)),
      closePath(), clip(), endPath(),
    );
    for (let x = 0; x <= 580; x += 20) {
      if (x > pw) continue;
      for (let y = 0; y < ph; y += 20) {
        page.drawLine({ start: { x: X(x), y: Y(y) }, end: { x: X(x), y: Y(Math.min(ph, y + 20)) }, thickness: 1, color: segColour(x, y + 10) });
      }
    }
    for (let y = 0; y <= ph; y += 20) {
      for (let x = 0; x < pw; x += 20) {
        page.drawLine({ start: { x: X(x), y: Y(y) }, end: { x: X(Math.min(pw, x + 20)), y: Y(y) }, thickness: 1, color: segColour(x + 10, y) });
      }
    }
    page.pushOperators(popGraphicsState());

    // text, word by word, at the positions the browser laid it out
    const k = scaleOf(certEl);
    const origin = certEl.getBoundingClientRect();
    certEl.querySelectorAll('[data-text]').forEach((span) => {
      const key = span.getAttribute('data-text');
      const font = fonts[key];
      const cs = getComputedStyle(span);
      const size = parseFloat(cs.fontSize);
      const colour = colourOf(parseRgb(cs.color));
      const tracking = parseFloat(cs.letterSpacing) || 0;
      const walker = document.createTreeWalker(span, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = walker.nextNode())) {
        const text = node.nodeValue;
        const re = /\S+/g;
        let m;
        while ((m = re.exec(text))) {
          const range = document.createRange();
          range.setStart(node, m.index);
          range.setEnd(node, m.index + m[0].length);
          const rects = Array.from(range.getClientRects()).filter((rc) => rc.width > 0);
          if (!rects.length) continue;
          const rc = rects[0];
          const x = (rc.left - origin.left) / k;
          const top = (rc.top - origin.top) / k;
          const baseline = top + (rc.height / k) * ASCENT_RATIO[key];
          // the ink: glyph outlines from the font's own layout (kerning, the script's
          // contextual forms), which pdf-lib's text drawing leaves out
          const fk = shapers[key];
          const u = size / fk.unitsPerEm;
          const run = fk.layout(m[0]);
          let pen = x;
          run.glyphs.forEach((g, gi) => {
            const pos = run.positions[gi];
            const d = g.path.scale(u, -u).toSVG();
            if (d) page.drawSvgPath(d, { x: pen + pos.xOffset * u, y: H - baseline + pos.yOffset * u, color: colour, borderWidth: 0 });
            pen += pos.xAdvance * u + tracking;
          });
          // and the words, invisible, so the PDF can still be searched and copied
          page.drawText(m[0], { x, y: H - baseline, size, font, opacity: 0 });
        }
      }
    });

    // logo: the real file's paths, white, 24 px tall
    if (opts.logoSvg) {
      const svg = new DOMParser().parseFromString(opts.logoSvg, 'image/svg+xml');
      const s = C.logoH / 80;
      svg.querySelectorAll('path').forEach((p) => {
        page.drawSvgPath(p.getAttribute('d'), { x: C.logoX, y: H - C.logoY, scale: s, color: rgb(1, 1, 1) });
      });
    }

    // exact A4
    page.setSize(A4_PT.w, A4_PT.h);
    page.scaleContent(A4_PT.w / W, A4_PT.h / H);

    doc.setTitle(opts.title || 'Gushwork award certificate');
    doc.setAuthor('Gushwork');
    doc.setCreator('Gushwork design hub · award certificate');
    doc.setProducer('pdf-lib');
    const bytes = await doc.save();
    save(new Blob([bytes], { type: 'application/pdf' }), opts.filename + '.pdf');
  }

  /* ── Raster capture ───────────────────────────────────────────── */
  let fontCssPromise = null;
  function fontCss(certEl) {
    if (!fontCssPromise) fontCssPromise = window.htmlToImage.getFontEmbedCSS(certEl);
    return fontCssPromise;
  }

  async function capture(certEl) {
    await document.fonts.ready;
    const fontEmbedCSS = await fontCss(certEl);
    const raw = await window.htmlToImage.toCanvas(certEl, {
      pixelRatio: DPI / 72,
      width: window.CERT.W,
      height: window.CERT.H,
      fontEmbedCSS,
      cacheBust: false,
    });
    const out = document.createElement('canvas');
    out.width = A4_PX.w;
    out.height = A4_PX.h;
    const ctx = out.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(raw, 0, 0, A4_PX.w, A4_PX.h);
    return out;
  }

  /* Canvas JPEGs say 72 or 96 dpi; write 300 into the JFIF APP0 so a print
     dialog sizes the file as A4. Adds an APP0 if the encoder left one out. */
  function withDpi(buf, dpi) {
    const b = new Uint8Array(buf);
    const isJfif = b[2] === 0xff && b[3] === 0xe0 && b[6] === 0x4a && b[7] === 0x46 && b[8] === 0x49 && b[9] === 0x46;
    if (isJfif) {
      b[13] = 1;
      b[14] = dpi >> 8; b[15] = dpi & 255;
      b[16] = dpi >> 8; b[17] = dpi & 255;
      return b;
    }
    const app0 = new Uint8Array([0xff, 0xe0, 0, 16, 0x4a, 0x46, 0x49, 0x46, 0, 1, 1, 1, dpi >> 8, dpi & 255, dpi >> 8, dpi & 255, 0, 0]);
    const out = new Uint8Array(b.length + app0.length);
    out.set(b.subarray(0, 2), 0);
    out.set(app0, 2);
    out.set(b.subarray(2), 2 + app0.length);
    return out;
  }

  async function exportJpg(certEl, opts) {
    const canvas = await capture(certEl);
    const blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', 0.95));
    const bytes = withDpi(await blob.arrayBuffer(), DPI);
    save(new Blob([bytes], { type: 'image/jpeg' }), opts.filename + '.jpg');
  }

  /* ── PSD ──────────────────────────────────────────────────────── */
  async function exportPsd(certEl, opts) {
    const composite = await capture(certEl);
    const ratio = A4_PX.w / window.CERT.W;
    const k = scaleOf(certEl);
    const origin = certEl.getBoundingClientRect();
    const children = [];
    try {
      for (const name of LAYERS) {
        const el = certEl.querySelector(`[data-layer="${name}"]`);
        if (!el) continue;
        certEl.setAttribute('data-solo', '');
        certEl.querySelectorAll('[data-layer]').forEach((n) => n.toggleAttribute('data-on', n === el));
        const full = await capture(certEl);
        // crop to the layer's box, with room for ascenders and the script's swashes
        const b = el.getBoundingClientRect();
        const padPx = 16;
        let x0 = Math.floor(((b.left - origin.left) / k - padPx) * ratio);
        let y0 = Math.floor(((b.top - origin.top) / k - padPx) * ratio);
        let x1 = Math.ceil(((b.right - origin.left) / k + padPx) * ratio);
        let y1 = Math.ceil(((b.bottom - origin.top) / k + padPx) * ratio);
        x0 = Math.max(0, x0); y0 = Math.max(0, y0);
        x1 = Math.min(A4_PX.w, x1); y1 = Math.min(A4_PX.h, y1);
        const c = document.createElement('canvas');
        c.width = Math.max(1, x1 - x0);
        c.height = Math.max(1, y1 - y0);
        c.getContext('2d').drawImage(full, x0, y0, c.width, c.height, 0, 0, c.width, c.height);
        children.push({ name, left: x0, top: y0, canvas: c });
      }
    } finally {
      certEl.removeAttribute('data-solo');
      certEl.querySelectorAll('[data-on]').forEach((n) => n.removeAttribute('data-on'));
    }
    const psd = {
      width: A4_PX.w,
      height: A4_PX.h,
      canvas: composite,
      children,
      imageResources: {
        resolutionInfo: {
          horizontalResolution: DPI, horizontalResolutionUnit: 'PPI', widthUnit: 'Inches',
          verticalResolution: DPI, verticalResolutionUnit: 'PPI', heightUnit: 'Inches',
        },
      },
    };
    const buf = window.agPsd.writePsd(psd, { generateThumbnail: false });
    save(new Blob([buf], { type: 'image/vnd.adobe.photoshop' }), opts.filename + '.psd');
  }

  window.CertExport = { exportPdf, exportJpg, exportPsd, LAYERS };
})();
