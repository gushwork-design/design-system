/* eslint-disable max-len */
/* ─────────────────────────────────────────────────────────────────
   buildEmailSafeHtml(data, photoUrl, opts)
   Produces a plain HTML string for the clipboard / download — a
   nested-<table> signature that survives every major email client.
   No React, no inline SVG that gets stripped, no flex/gap.

   The banner section is delegated to window.getBanner(data.bannerId)
   .toHtml() — so adding a new banner only requires editing banners.js.
   ───────────────────────────────────────────────────────────────── */

(function () {
  const H = window.GW_BANNERS_HELPERS || {};
  const FONT_STACK =
    H.FONT_STACK ||
    "'Plus Jakarta Sans',-apple-system,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif";
  const esc =
    H.esc ||
    function (s) {
      return String(s == null ? '' : s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    };
  const ensureHref =
    H.ensureHref ||
    function (s, fallback) {
      if (!s) return fallback || '#';
      if (/^(https?:|mailto:|tel:|#|\/)/i.test(s)) return s;
      return 'https://' + s;
    };

  function buildEmailSafeHtml(data, photoUrl, opts) {
    opts = opts || {};
    const isMobile = opts.viewport === 'mobile';
    const A = window.GW_ASSETS || {};

    const photoSize = isMobile ? 56 : 64;
    const photoRadius = isMobile ? 6 : 6;
    const gap = isMobile ? 14 : 16;
    // Sizes kept ≤13px on desktop so Gmail's signature editor reports
    // the text as "Normal" rather than "Large". Hierarchy is carried by
    // weight (bold name) + spacing, not size.
    const nameSize = isMobile ? 14 : 14;
    const titleSize = isMobile ? 11 : 13;
    const contactSize = isMobile ? 11 : 13;
    const salutationSize = isMobile ? 13 : 13;
    const titleGap = isMobile ? 6 : 8;
    const contactsTopGap = isMobile ? 16 : 20;
    const bannerTopGap = isMobile ? 16 : 20;

    /* photo / logo image source */
    let imgSrc = '';
    if (data.layout === 'logo') {
      imgSrc = A.gwMark || '';
    } else if (photoUrl) {
      imgSrc = photoUrl;
    }

    /* contact lines */
    const contacts = [];
    if (data.phone) {
      contacts.push({
        text: data.phone,
        href: 'tel:' + data.phone.replace(/[^+\d]/g, ''),
      });
    }
    if (data.email) {
      contacts.push({ text: data.email, href: 'mailto:' + data.email });
    }
    if (data.website) {
      const w = data.website;
      contacts.push({
        text: w.replace(/^https?:\/\//, ''),
        href: /^https?:\/\//i.test(w) ? w : 'https://' + w,
      });
    }

    const contactHtml = contacts
      .map(function (c) {
        return (
          '<div style="font-family:' +
          FONT_STACK +
          ';font-size:' +
          contactSize +
          'px;line-height:160%;color:#535A61;">' +
          '<a href="' +
          esc(c.href) +
          '" style="color:#535A61;text-decoration:none;">' +
          esc(c.text) +
          '</a>' +
          '</div>'
        );
      })
      .join('');

    /* Contacts as their OWN block, below the identity row.
       Wrapped in a table so the spacing stays predictable across clients. */
    const contactsBlockHtml = contacts.length
      ? '<table cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="border-collapse:collapse;background-color:#ffffff;margin-top:' +
        contactsTopGap +
        'px;">' +
        '<tr><td bgcolor="#ffffff" style="padding:0;background-color:#ffffff;">' +
        contactHtml +
        '</td></tr></table>'
      : '';

    const altText = data.layout === 'logo' ? 'Gushwork' : (data.name || '');
    /* Cell background colour. Logo layout keeps the Gushwork-blue square
       so the mark still reads if Gmail strips the image. Photo layout
       sits on white so no gray frame peeks around the rounded photo. */
    const placeholderBg = data.layout === 'logo' ? '#0070FF' : '#ffffff';

    /* For the Logo layout: plain <img> with the blue Gushwork mark. No
       wrapping table, no background, no fallback chrome. Matches the
       earliest working pasted output. */
    let photoCellHtml;
    if (data.layout === 'logo') {
      const markSrc = A.gwMark || '';
      photoCellHtml =
        '<img src="' +
        esc(markSrc) +
        '" alt="Gushwork" width="' +
        photoSize +
        '" height="' +
        photoSize +
        '" style="display:block;border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic;width:' +
        photoSize +
        'px;height:' +
        photoSize +
        'px;" />';
    } else {
      // Photo layout — transparent cell so Gmail's compose background
      // (or whatever the email body is sitting on) shows through. No
      // bgcolor, no background-color anywhere on the photo wrapper.
      photoCellHtml = imgSrc
        ? '<table cellpadding="0" cellspacing="0" border="0" width="' +
          photoSize +
          '" height="' +
          photoSize +
          '" style="border-collapse:collapse;width:' +
          photoSize +
          'px;height:' +
          photoSize +
          'px;border-radius:' +
          photoRadius +
          'px;overflow:hidden;">' +
          '<tr><td width="' +
          photoSize +
          '" height="' +
          photoSize +
          '" valign="middle" align="center" style="padding:0;width:' +
          photoSize +
          'px;height:' +
          photoSize +
          'px;border-radius:' +
          photoRadius +
          'px;">' +
          '<img src="' +
          esc(imgSrc) +
          '" alt="' +
          esc(altText) +
          '" width="' +
          photoSize +
          '" height="' +
          photoSize +
          '" style="display:block;border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic;border-radius:' +
          photoRadius +
          'px;width:' +
          photoSize +
          'px;height:' +
          photoSize +
          'px;object-fit:cover;" />' +
          '</td></tr></table>'
        : '<table cellpadding="0" cellspacing="0" border="0" width="' +
          photoSize +
          '" height="' +
          photoSize +
          '" style="border-collapse:collapse;width:' +
          photoSize +
          'px;height:' +
          photoSize +
          'px;border-radius:' +
          photoRadius +
          'px;">' +
          '<tr><td width="' +
          photoSize +
          '" height="' +
          photoSize +
          '" style="padding:0;width:' +
          photoSize +
          'px;height:' +
          photoSize +
          'px;border-radius:' +
          photoRadius +
          'px;font-size:1px;line-height:1px;">&nbsp;</td></tr></table>';
    }

    /* banner — delegated to the registry. Each banner builds its own
       email-safe markup; this file knows only that it's some HTML
       string to drop into the outer cell. */
    let bannerHtml = '';
    if (data.showBanner !== false && typeof window.getBanner === 'function') {
      const banner = window.getBanner(data.bannerId);
      if (banner && typeof banner.toHtml === 'function') {
        bannerHtml = banner.toHtml({
          data,
          viewport: opts.viewport || 'desktop',
          esc,
          ensureHref,
        });
      }
    }

    const salutationHtml = data.salutation
      ? '<div style="margin:0 0 20px 0;font-family:' +
        FONT_STACK +
        ';font-size:' +
        salutationSize +
        'px;line-height:100%;color:#000000;">' +
        esc(data.salutation) +
        '</div>'
      : '';

    const identityTable =
      '<table cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="border-collapse:collapse;background-color:#ffffff;">' +
      '<tr>' +
      (data.layout === 'text'
        ? ''
        : '<td width="' +
          photoSize +
          '" valign="middle" bgcolor="#ffffff" style="padding:0;width:' +
          photoSize +
          'px;background-color:#ffffff;">' +
          photoCellHtml +
          '</td>' +
          '<td width="' +
          gap +
          '" bgcolor="#ffffff" style="padding:0;width:' +
          gap +
          'px;font-size:1px;line-height:1px;background-color:#ffffff;">&nbsp;</td>') +
      '<td valign="middle" bgcolor="#ffffff" style="padding:0;vertical-align:middle;background-color:#ffffff;">' +
      '<div style="font-family:' +
      FONT_STACK +
      ';font-weight:700;font-size:' +
      nameSize +
      'px;line-height:120%;color:#000000;letter-spacing:-0.01em;">' +
      esc(data.name) +
      '</div>' +
      '<div style="font-family:' +
      FONT_STACK +
      ';font-weight:500;font-size:' +
      titleSize +
      'px;line-height:120%;color:#000000;padding-top:' +
      titleGap +
      'px;">' +
      esc(data.title) +
      '</div>' +
      '</td>' +
      '</tr>' +
      '</table>';

    /* EVERYTHING wrapped in ONE outer table-cell. Gmail's paste
       handler treats a single <td> as one indivisible block.
       Explicit white background everywhere so Gmail's compose tint
       (a subtle gray) can't bleed through transparent wrappers. */
    return (
      '<table cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="border-collapse:collapse;background-color:#ffffff;">' +
      '<tr><td bgcolor="#ffffff" style="padding:0;background-color:#ffffff;font-family:' +
      FONT_STACK +
      ';color:#000000;">' +
      salutationHtml +
      identityTable +
      contactsBlockHtml +
      (bannerHtml
        ? '<div style="height:' +
          bannerTopGap +
          'px;line-height:1px;font-size:1px;mso-line-height-rule:exactly;background-color:#ffffff;">&nbsp;</div>' +
          bannerHtml
        : '') +
      '</td></tr>' +
      '</table>'
    );
  }

  function buildStandaloneHtml(data, photoUrl, opts) {
    const body = buildEmailSafeHtml(data, photoUrl, opts);
    const name = (data.name || 'Gushwork signature').replace(/[<>&"]/g, '');
    return (
      '<!doctype html><html><head><meta charset="utf-8" />' +
      '<title>' +
      name +
      ' — Gushwork email signature</title>' +
      '<link rel="preconnect" href="https://fonts.googleapis.com">' +
      '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>' +
      '<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">' +
      '<style>body{margin:32px;background:#fff;color:#000;}</style>' +
      '</head><body>' +
      body +
      '</body></html>'
    );
  }

  function wrapStandaloneHtml(bodyHtml, displayName) {
    const name = (displayName || 'Gushwork signature').replace(/[<>&"]/g, '');
    return (
      '<!doctype html><html><head><meta charset="utf-8" />' +
      '<title>' +
      name +
      ' — Gushwork email signature</title>' +
      '<link rel="preconnect" href="https://fonts.googleapis.com">' +
      '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>' +
      '<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">' +
      '<style>body{margin:32px;background:#fff;color:#000;}</style>' +
      '</head><body>' +
      bodyHtml +
      '</body></html>'
    );
  }

  window.buildEmailSafeHtml = buildEmailSafeHtml;
  window.buildStandaloneHtml = buildStandaloneHtml;
  window.wrapStandaloneHtml = wrapStandaloneHtml;
})();
