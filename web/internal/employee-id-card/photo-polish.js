/* eslint-disable */
/* ─────────────────────────────────────────────────────────────────
   Photo polish — client-side background removal.

   Wraps @imgly/background-removal (~25MB ONNX model, cached in
   IndexedDB after the first run). Lazy-loaded the first time the
   user flips the "Polish photo" toggle so the model download
   doesn't tax initial page load.

   Public API:
     window.PhotoPolish.process(dataUrl, onProgress) → Promise<dataUrl>
     window.PhotoPolish.warm() → kicks off lazy load (optional)
   ───────────────────────────────────────────────────────────────── */
(function () {
  let modulePromise = null;

  function loadModule() {
    if (!modulePromise) {
      // esm.sh bundles the package + its WASM/ONNX bindings into a single
      // ESM URL we can dynamically import even from a plain (non-module)
      // script context.
      modulePromise = import('https://esm.sh/@imgly/background-removal@1.5.5?bundle');
    }
    return modulePromise;
  }

  async function dataUrlToBlob(dataUrl) {
    const res = await fetch(dataUrl);
    return res.blob();
  }

  function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result);
      fr.onerror = reject;
      fr.readAsDataURL(blob);
    });
  }

  async function process(input, onProgress) {
    const mod = await loadModule();
    const removeBackground = mod.removeBackground || mod.default;
    if (!removeBackground) throw new Error('Background-removal entry point not found');
    const inputBlob = typeof input === 'string' ? await dataUrlToBlob(input) : input;
    const outBlob = await removeBackground(inputBlob, {
      progress: (key, current, total) => {
        if (typeof onProgress === 'function') {
          try { onProgress(key, current, total); } catch (e) { /* swallow */ }
        }
      },
      output: { format: 'image/png', quality: 0.92 },
    });
    const cutoutDataUrl = await blobToDataUrl(outBlob);
    // Auto-frame: keep the WHOLE subject (nothing cropped away) inside a
    // 4:5 canvas, and return a default zoom/pan that frames the head to
    // the guide. Because the full body is retained in the pixels, zooming
    // out on the card reveals the rest of the subject instead of empty
    // space. Returns { url, xform }.
    return autoFrame(cutoutDataUrl);
  }

  /* Auto-framing — given a PNG with a transparent background, fit the
     ENTIRE subject into a 4:5 portrait (no clipping) and compute the
     card transform (zoom + vertical pan) that frames the head into the
     on-card guide band. Keeping the whole subject means the user can
     zoom out to reveal more of the body rather than hitting erased
     pixels. Returns { url, xform }. */
  async function autoFrame(cutoutDataUrl) {
    const img = await loadImage(cutoutDataUrl);
    const analysis = analyzeSilhouette(img);
    const fallback = { url: cutoutDataUrl, xform: { x: 50, y: 50, zoom: 100, grayscale: false } };
    if (!analysis) return fallback; // empty cutout — return as-is
    const { bbox, rowWidths, rowCentroids, pixelW, pixelH } = analysis;
    const step = 2;

    // Detect chin row (pixels from bbox top) → head height in px.
    const chinOffset = detectChin(rowWidths);
    const headHeight = Math.max(8, chinOffset);

    // Head's horizontal center — weighted average over the head rows.
    let headCenterX = bbox.x + bbox.w / 2;
    let sumCx = 0, sumW = 0;
    const headRows = Math.max(1, Math.floor(chinOffset / step));
    for (let i = 0; i < headRows && i < rowCentroids.length; i++) {
      sumCx += rowCentroids[i] * rowWidths[i];
      sumW += rowWidths[i];
    }
    if (sumW > 0) headCenterX = sumCx / sumW;

    // 4:5 canvas sized to contain the full subject with a small margin.
    const targetW = 400;
    const targetH = 500;
    const marginV = 0.08;
    const drawableH = targetH * (1 - marginV * 2);
    let scale = drawableH / bbox.h;
    const maxW = targetW * 0.92;
    if (bbox.w * scale > maxW) scale = maxW / bbox.w; // also keep width in frame

    const topMargin = targetH * marginV;
    const dy = topMargin - bbox.y * scale;
    const dx = targetW / 2 - headCenterX * scale;

    const out = document.createElement('canvas');
    out.width = targetW;
    out.height = targetH;
    const ctx = out.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, dx, dy, pixelW * scale, pixelH * scale);
    const url = out.toDataURL('image/png');

    // Frame the head into the on-card guide band (≈17%→83% of the cell).
    // The card scales the (matched-aspect) photo about the x/y origin, so
    // we solve for the zoom + vertical origin that map the head's top &
    // bottom onto the guide. Horizontal center is already at 50%.
    const a = topMargin / targetH; // head top fraction of canvas
    const b = (topMargin + headHeight * scale) / targetH; // head bottom fraction
    const GUIDE_TOP = 0.17;
    const GUIDE_BOT = 0.83;
    let s = (GUIDE_BOT - GUIDE_TOP) / Math.max(0.0001, b - a);
    let zoom = Math.round(Math.max(50, Math.min(250, s * 100)));
    s = zoom / 100;
    const oy = (1 - s) !== 0 ? (GUIDE_TOP - s * a) / (1 - s) : 0.5;
    const y = Math.round(Math.max(0, Math.min(100, oy * 100)));

    return { url, xform: { x: 50, y, zoom, grayscale: false } };
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  /* Analyze the silhouette: read alpha pixels, find the tight bbox of
     opaque content, and return per-row width + horizontal centroid
     arrays *relative to the bbox*. Sampled every other pixel for speed. */
  function analyzeSilhouette(img) {
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const data = ctx.getImageData(0, 0, w, h).data;
    const threshold = 24;
    const step = 2;

    let minX = w, minY = h, maxX = -1, maxY = -1;
    // First pass: bbox
    for (let y = 0; y < h; y += step) {
      for (let x = 0; x < w; x += step) {
        if (data[(y * w + x) * 4 + 3] > threshold) {
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (maxX < 0) return null;

    const bboxW = maxX - minX + 1;
    const bboxH = maxY - minY + 1;
    const rows = Math.ceil(bboxH / step);
    const rowWidths = new Array(rows).fill(0);
    const rowCentroids = new Array(rows).fill(0); // image-space x

    // Second pass: width + centroid per row, bbox-relative
    for (let yi = 0; yi < rows; yi++) {
      const y = minY + yi * step;
      let count = 0;
      let sumX = 0;
      for (let x = minX; x <= maxX; x += step) {
        if (data[(y * w + x) * 4 + 3] > threshold) {
          count++;
          sumX += x;
        }
      }
      rowWidths[yi] = count * step; // approximate full-row width
      rowCentroids[yi] = count > 0 ? sumX / count : (minX + bboxW / 2);
    }

    // Smooth rowWidths a little so chin detection isn't tripped by noise
    const smoothed = new Array(rows).fill(0);
    const k = 2;
    for (let i = 0; i < rows; i++) {
      let s = 0, n = 0;
      for (let j = Math.max(0, i - k); j <= Math.min(rows - 1, i + k); j++) {
        s += rowWidths[j];
        n++;
      }
      smoothed[i] = s / n;
    }

    return {
      bbox: { x: minX, y: minY, w: bboxW, h: bboxH },
      rowWidths: smoothed,
      rowCentroids,
      pixelW: w,
      pixelH: h,
      _step: step,
    };
  }

  /* Walk top→down to find the chin/neck row.
       1. Sample the maximum head width in the top 30% of the bbox.
       2. Walk downward; the first row whose width exceeds 1.35× that
          peak is the shoulder line — the chin is just above it.
     Returns the chin offset (rows from bbox top, in row-index units,
     not pixels). Caller multiplies by step if it needs pixels. */
  function detectChin(rowWidths) {
    const rows = rowWidths.length;
    if (rows < 6) return rows;
    const headScanEnd = Math.max(3, Math.floor(rows * 0.30));
    let headMax = 0;
    for (let i = 0; i < headScanEnd; i++) {
      if (rowWidths[i] > headMax) headMax = rowWidths[i];
    }
    // Threshold a touch above head's own peak (1.35×) to catch the
    // unambiguous widening at the shoulders without false-firing on the
    // mid-head's broadest row.
    const threshold = headMax * 1.35;
    for (let y = headScanEnd; y < rows; y++) {
      if (rowWidths[y] > threshold) {
        // Convert row-index back into pixel offset.
        return y * 2; // step = 2
      }
    }
    // No clear shoulder transition (already a bust shot). Treat the
    // whole bbox as "head" — auto-frame will then resemble the
    // original cutout's bbox.
    return rows * 2;
  }

  window.PhotoPolish = {
    process,
    warm: loadModule,
  };
})();
