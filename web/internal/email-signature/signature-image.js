/* ─────────────────────────────────────────────────────────────────
   signature-image.js
   Canvas-based render of the email signature into a single PNG.
   This sidesteps every email-client HTML sanitizer — the output is
   just one <img> tag with a data URI, wrapped in an <a> for the
   primary CTA. Always renders identically in Gmail / Outlook /
   Apple Mail / anywhere else.
   ───────────────────────────────────────────────────────────────── */
(function () {
  const FONT_HEAD = '"Plus Jakarta Sans", -apple-system, "Segoe UI", Roboto, sans-serif';
  const FONT_UI = '"Inter", "Helvetica Neue", Arial, sans-serif';
  const BRAND_BLUE = '#0070FF';
  const BANNER_BG = '#0D0D0D';
  const TEXT = '#000000';
  const CONTACT = '#535A61';

  function loadImg(src) {
    return new Promise((res, rej) => {
      if (!src) return res(null);
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => res(img);
      img.onerror = () => res(null);
      img.src = src;
    });
  }

  /* ── canvas helpers ──────────────────────────────────────────── */
  function roundedRectPath(ctx, x, y, w, h, r) {
    const rad = Math.min(r, h / 2, w / 2);
    ctx.beginPath();
    ctx.moveTo(x + rad, y);
    ctx.lineTo(x + w - rad, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + rad);
    ctx.lineTo(x + w, y + h - rad);
    ctx.quadraticCurveTo(x + w, y + h, x + w - rad, y + h);
    ctx.lineTo(x + rad, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - rad);
    ctx.lineTo(x, y + rad);
    ctx.quadraticCurveTo(x, y, x + rad, y);
    ctx.closePath();
  }
  function fillRoundedRect(ctx, x, y, w, h, r, color) {
    ctx.fillStyle = color;
    roundedRectPath(ctx, x, y, w, h, r);
    ctx.fill();
  }

  /* word-wrap a string into N lines at maxWidth — returns lines + total height */
  function wrapLines(ctx, text, maxWidth) {
    if (!text) return [];
    const words = String(text).split(/\s+/);
    const lines = [];
    let cur = '';
    for (const w of words) {
      const test = cur ? cur + ' ' + w : w;
      if (ctx.measureText(test).width <= maxWidth) {
        cur = test;
      } else {
        if (cur) lines.push(cur);
        cur = w;
      }
    }
    if (cur) lines.push(cur);
    return lines;
  }

  /* ── main renderer ───────────────────────────────────────────── */
  async function buildSignatureImageDataUrl(data, photoUrl, opts = {}) {
    const isMobile = opts.viewport === 'mobile';
    const scale = opts.scale || 2;

    // Layout dimensions (CSS pixels; canvas pixels = these × scale).
    const W = isMobile ? 343 : 520;
    const photoSize = isMobile ? 116 : 124;
    const gap = isMobile ? 16 : 24;
    const nameSize = isMobile ? 16 : 20;
    const titleSize = isMobile ? 12 : 16;
    const contactSize = isMobile ? 12 : 14;
    const contactLine = Math.round(contactSize * 1.6);
    const salutationSize = isMobile ? 14 : 16;
    const bannerPad = isMobile ? 16 : 24;
    const bannerHeadingSize = 18;
    const ctaPaddingX = 16;
    const ctaPaddingY = 9;
    const ctaFontSize = 12;

    // Wait for fonts to be ready so measureText is accurate.
    if (document.fonts && document.fonts.ready) {
      try { await document.fonts.ready; } catch (e) {}
    }

    // Pre-measure for height calculation.
    const tmp = document.createElement('canvas').getContext('2d');

    const salutationH = data.salutation ? salutationSize + 20 : 0;

    // Compute identity text block height (used in both layouts).
    const nameH = Math.round(nameSize * 1.2);
    const titleH = Math.round(titleSize * 1.2);
    const contactsH =
      (data.phone ? contactLine : 0) +
      (data.email ? contactLine : 0) +
      (data.website ? contactLine : 0);
    const gapNameTitle = 6;
    const gapTitleContacts = isMobile ? 12 : 20;
    const identityH = nameH + gapNameTitle + titleH + gapTitleContacts + contactsH;

    // Identity text column width (text-only: full width, no photo gutter)
    const textW = data.layout === 'text' ? W : W - photoSize - gap;
    // Identity row height: photo height for photo/logo layouts; just the
    // text-block height for text-only.
    const photoBlockH = data.layout === 'text' ? identityH : photoSize;

    // Banner height: heading wraps if needed; CTA height = ctaFontSize + 2*ctaPaddingY
    let bannerH = 0;
    let bannerHeadingLines = [];
    if (data.showBanner !== false) {
      tmp.font = `700 ${bannerHeadingSize}px ${FONT_HEAD}`;
      const ctaLabel = (data.cta1 && data.cta1.label) || 'Book a Demo';
      tmp.font = `700 ${ctaFontSize}px ${FONT_UI}`;
      const ctaWidth = Math.ceil(tmp.measureText(ctaLabel).width) + ctaPaddingX * 2;
      // heading available width = banner width - 2*padding - cta width - 16 spacing
      const headingW = W - bannerPad * 2 - ctaWidth - 16;
      tmp.font = `700 ${bannerHeadingSize}px ${FONT_HEAD}`;
      bannerHeadingLines = wrapLines(tmp, data.bannerHeading || '', headingW);
      const headingTextH = bannerHeadingLines.length * Math.round(bannerHeadingSize * 1.3);
      const ctaH = ctaFontSize + ctaPaddingY * 2 + 4;
      bannerH = bannerPad * 2 + Math.max(headingTextH, ctaH);
    }

    const identityRowH = photoBlockH;
    const totalH =
      salutationH +
      identityRowH +
      (data.showBanner !== false ? 20 + bannerH : 0);

    // Create the actual canvas
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(W * scale);
    canvas.height = Math.ceil(totalH * scale);
    const ctx = canvas.getContext('2d');
    ctx.scale(scale, scale);
    ctx.textBaseline = 'top';
    // Paint a solid white base so the signature reads the same against any
    // compose-theme background (Gmail draws a gray scrim under signature regions).
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, W, totalH);

    let y = 0;

    /* Salutation */
    if (data.salutation) {
      ctx.font = `400 ${salutationSize}px ${FONT_HEAD}`;
      ctx.fillStyle = TEXT;
      ctx.fillText(data.salutation, 0, y);
      y += salutationH;
    }

    /* Photo / logo (skipped entirely in text-only layout) */
    const photoImg = data.layout === 'text'
      ? null
      : await loadImg(
          data.layout === 'logo' ? (window.GW_ASSETS && window.GW_ASSETS.gwMark) : photoUrl
        );
    if (data.layout === 'text') {
      // no-op: text layout has no photo/logo column
    } else if (photoImg) {
      ctx.save();
      // Always apply our own rounded clip so the corners are guaranteed
      // transparent regardless of what the source image actually contains
      // (some encoders bleed near-white into the alpha boundary).
      roundedRectPath(ctx, 0, y, photoSize, photoSize, 12);
      ctx.clip();
      ctx.drawImage(photoImg, 0, y, photoSize, photoSize);
      ctx.restore();
    } else {
      // Placeholder gray rounded rect
      fillRoundedRect(ctx, 0, y, photoSize, photoSize, 12, '#CFD1D4');
    }

    /* Identity text block — vertically centered against the photo
       (in text-only layout, sits flush at the left edge). */
    const textX = data.layout === 'text' ? 0 : photoSize + gap;
    let ty = y + (photoBlockH - identityH) / 2;

    ctx.font = `700 ${nameSize}px ${FONT_HEAD}`;
    ctx.fillStyle = TEXT;
    ctx.fillText(String(data.name || ''), textX, ty);
    ty += nameH + gapNameTitle;

    ctx.font = `500 ${titleSize}px ${FONT_HEAD}`;
    ctx.fillStyle = TEXT;
    ctx.fillText(String(data.title || ''), textX, ty);
    ty += titleH + gapTitleContacts;

    ctx.font = `400 ${contactSize}px ${FONT_HEAD}`;
    ctx.fillStyle = CONTACT;
    if (data.phone) {
      ctx.fillText(String(data.phone), textX, ty);
      ty += contactLine;
    }
    if (data.email) {
      ctx.fillText(String(data.email), textX, ty);
      ty += contactLine;
    }
    if (data.website) {
      const w = String(data.website).replace(/^https?:\/\//, '');
      ctx.fillText(w, textX, ty);
      ty += contactLine;
    }

    y += photoBlockH;

    /* Banner */
    if (data.showBanner !== false) {
      y += 20;
      const bx = 0;
      const by = y;
      // Dark rounded background
      fillRoundedRect(ctx, bx, by, W, bannerH, 12, BANNER_BG);

      // Heading (left)
      ctx.font = `700 ${bannerHeadingSize}px ${FONT_HEAD}`;
      ctx.fillStyle = '#FFFFFF';
      const headingLineH = Math.round(bannerHeadingSize * 1.3);
      let hy = by + bannerPad;
      // Vertically center heading vs banner height if it's a single line
      if (bannerHeadingLines.length === 1) {
        hy = by + (bannerH - headingLineH) / 2;
      }
      for (const line of bannerHeadingLines) {
        ctx.fillText(line, bx + bannerPad, hy);
        hy += headingLineH;
      }

      // CTA (right)
      const ctaLabel = (data.cta1 && data.cta1.label) || 'Book a Demo';
      ctx.font = `700 ${ctaFontSize}px ${FONT_UI}`;
      const ctaTextWidth = Math.ceil(ctx.measureText(ctaLabel).width);
      const ctaWidth = ctaTextWidth + ctaPaddingX * 2;
      const ctaHeight = ctaFontSize + ctaPaddingY * 2 + 4;
      const ctaX = bx + W - bannerPad - ctaWidth;
      const ctaY = by + (bannerH - ctaHeight) / 2;
      fillRoundedRect(ctx, ctaX, ctaY, ctaWidth, ctaHeight, 8, BRAND_BLUE);
      ctx.fillStyle = '#FFFFFF';
      ctx.textBaseline = 'middle';
      ctx.fillText(ctaLabel, ctaX + ctaPaddingX, ctaY + ctaHeight / 2);
      ctx.textBaseline = 'top';

      y += bannerH;
    }

    return canvas.toDataURL('image/png');
  }

  /* Wrap the image in a single <a> targeting the primary CTA href */
  async function buildImageSignatureHtml(data, photoUrl, opts = {}) {
    const dataUrl = await buildSignatureImageDataUrl(data, photoUrl, opts);
    const isMobile = opts.viewport === 'mobile';
    const W = isMobile ? 343 : 520;
    const alt = [
      data.salutation,
      data.name,
      data.title,
      data.phone,
      data.email,
      data.website,
    ].filter(Boolean).join(' · ');
    const ctaHref =
      (data.showBanner !== false && data.cta1 && data.cta1.href) ||
      (data.website ? (data.website.startsWith('http') ? data.website : 'https://' + data.website) : 'https://gushwork.ai');
    // Attribute clicks on the image-wrapper link to the sender.
    const helpers = window.GW_BANNERS_HELPERS || {};
    const href = helpers.withTracking
      ? helpers.withTracking(ctaHref, data, data.bannerId || 'ai-agents-cta')
      : ctaHref;
    return (
      '<div style="background:#ffffff;padding:0;margin:0;line-height:0;font-size:0;">' +
      '<a href="' + href + '" style="display:block;text-decoration:none;background:#ffffff;line-height:0;font-size:0;">' +
      '<img src="' + dataUrl + '" alt="' + alt.replace(/"/g, '&quot;') + '" width="' + W + '" style="display:block;border:0;outline:none;max-width:100%;height:auto;background:#ffffff;margin:0;padding:0;" />' +
      '</a>' +
      '</div>'
    );
  }

  async function buildImageStandaloneHtml(data, photoUrl, opts = {}) {
    const body = await buildImageSignatureHtml(data, photoUrl, opts);
    const name = (data.name || 'Gushwork signature').replace(/[<>&"]/g, '');
    return (
      '<!doctype html><html><head><meta charset="utf-8" />' +
      '<title>' + name + ' — Gushwork email signature</title>' +
      '<style>body{margin:32px;background:#fff;color:#000;}</style>' +
      '</head><body>' + body + '</body></html>'
    );
  }

  window.buildSignatureImageDataUrl = buildSignatureImageDataUrl;
  window.buildImageSignatureHtml = buildImageSignatureHtml;
  window.buildImageStandaloneHtml = buildImageStandaloneHtml;
})();
