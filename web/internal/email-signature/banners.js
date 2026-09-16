/* eslint-disable max-len */
/* ─────────────────────────────────────────────────────────────────
   banners.js — pluggable signature-banner registry.

   To add a new banner:
     1. Define an object with { id, label, defaults, fields, Render, toHtml }
     2. Push it to GW_BANNERS_ORDER and register on GW_BANNERS.

   Contract for each banner:
     - defaults  : shallow-merged into the app's DEFAULTS (top-level keys)
     - fields    : array of { key, label, type, placeholder?, mono? }
                   used by the form to render inputs. Dotted keys ("cta1.label")
                   are supported.
     - Render    : ({ data, viewport }) → React element. Inline styles only —
                   used in the live preview and the rich (HTML-rendered) export.
     - toHtml    : ({ data, viewport, esc, ensureHref }) → string. Email-safe
                   HTML (nested-table, no flex, no inline SVG features that
                   Gmail strips). Used for clipboard + .html download.
   ───────────────────────────────────────────────────────────────── */

(function () {
  const FONT_STACK = "'Plus Jakarta Sans',-apple-system,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif";
  const INTER = "'Inter','Helvetica Neue',Arial,sans-serif";
  const BRAND_BLUE = '#0070FF';
  const BANNER_BG = '#0D0D0D';

  /* ── shared helpers ─────────────────────────────────────────── */
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
  function ensureHref(s, fallback = '#') {
    if (!s) return fallback;
    if (/^(https?:|mailto:|tel:|#|\/)/i.test(s)) return s;
    return 'https://' + s;
  }

  /* ── click tracking ──────────────────────────────────────────
     Appends UTM params to the CTA URL so any analytics tool
     (GA4 / PostHog / Mixpanel / Segment) can attribute the click
     back to the sender. We also include `sig_email` as a dedicated
     param in case the destination wants a non-UTM read.

       utm_source   = email-signature
       utm_medium   = email
       utm_campaign = <banner id>           (e.g. ai-agents-cta)
       utm_content  = <sender email>        (e.g. bruce@gushwork.ai)
       sig_email    = <sender email>

     Only applied to http(s) URLs; mailto/tel/# links are returned
     unchanged. Existing query params are preserved; we never
     overwrite a param the user already set on the href. */
  function withTracking(href, data, bannerId) {
    if (!href || typeof href !== 'string') return href;
    if (!/^https?:/i.test(href)) return href;
    const senderEmail = (data && data.email) ? String(data.email).trim() : '';
    if (!senderEmail) return href; // nothing to attribute
    try {
      const u = new URL(href);
      const set = (k, v) => { if (!u.searchParams.has(k)) u.searchParams.set(k, v); };
      set('utm_source', 'email-signature');
      set('utm_medium', 'email');
      if (bannerId) set('utm_campaign', bannerId);
      set('utm_content', senderEmail);
      set('sig_email', senderEmail);
      return u.toString();
    } catch (_) {
      // Malformed URL — fall back to the original href.
      return href;
    }
  }

  /* Phosphor "ArrowUpRight" — used by buttons */
  function ArrowUpRight({ size = 11, color = '#fff' }) {
    return React.createElement(
      'svg',
      {
        width: size,
        height: size,
        viewBox: '0 0 256 256',
        fill: color,
        xmlns: 'http://www.w3.org/2000/svg',
        style: { display: 'inline-block', verticalAlign: 'middle' },
      },
      React.createElement('path', {
        d: 'M204 64v112a12 12 0 0 1-24 0V92.97L72.49 200.49a12 12 0 0 1-16.98-16.98L163.03 76H80a12 12 0 0 1 0-24h112a12 12 0 0 1 12 12Z',
      })
    );
  }

  /* ─────────────────────────────────────────────────────────────
     BANNER 1 — "AI Agents — Book a demo"
     ─────────────────────────────────────────────────────────────
     Matches the Figma source: pure-black rounded card with the
     headline on the left and a blue Book-a-Demo button + arrow on
     the right. No background art, no secondary CTA.
     ───────────────────────────────────────────────────────────── */
  /* Split the banner heading into a bold (white) lead and a muted tail.
     Default: "Get AI Agents to grow your business." →
       lead: "Get AI Agents"
       tail: " to grow your business."
     If the heading doesn't contain " to ", the whole string is the lead
     and the tail is empty. Users can author the split explicitly with
     a literal "|" character, e.g. "Get AI Agents | to grow…". */
  function splitHeading(text) {
    const s = String(text == null ? '' : text);
    if (!s) return { lead: '', tail: '' };
    const pipe = s.indexOf('|');
    if (pipe >= 0) {
      return {
        lead: s.slice(0, pipe).trim(),
        tail: (' ' + s.slice(pipe + 1).trim()).replace(/\s+/g, ' '),
      };
    }
    const m = s.match(/^(.*?)(\s+to\s+.*)$/i);
    if (m) return { lead: m[1].trim(), tail: m[2] };
    return { lead: s, tail: '' };
  }

  const AiAgentsBanner = {
    id: 'ai-agents-cta',
    label: 'Default',
    description:
      'The standard Gushwork sign-off — black bar with a blue Book-a-Demo button.',

    defaults: {
      bannerHeading: 'Get AI Agents to grow your business.',
      cta1: { label: 'Book a Demo', href: 'https://www.gushwork.ai/demo' },
    },

    fields: [
      {
        key: 'bannerHeading',
        label: 'Headline',
        type: 'text',
        placeholder: 'Get AI Agents to grow your business.',
      },
      {
        key: 'cta1.label',
        label: 'Button',
        type: 'text',
        placeholder: 'Book a demo',
      },
      {
        key: 'cta1.href',
        label: 'Link',
        type: 'url',
        mono: true,
        placeholder: 'https://www.gushwork.ai/demo',
      },
    ],

    Render: function AiAgentsRender({ data, viewport }) {
      const isMobile = viewport === 'mobile';
      const width = isMobile ? 343 : 520;
      const padX = isMobile ? 14 : 18;
      const padY = isMobile ? 12 : 14;
      const headingSize = isMobile ? 14 : 16;

      return React.createElement(
        'div',
        {
          style: {
            width,
            boxSizing: 'border-box',
            borderRadius: 12,
            background: BANNER_BG,
            padding: `${padY}px ${padX}px`,
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
          },
        },
        React.createElement(
          'div',
          {
            style: {
              flex: 1,
              minWidth: 0,
              fontFamily: FONT_STACK,
              fontWeight: 600,
              fontSize: headingSize,
              lineHeight: '125%',
              color: '#ffffff',
              letterSpacing: '-0.01em',
              wordBreak: 'break-word',
            },
          },
          data.bannerHeading || ''
        ),
        React.createElement(
          'a',
          {
            href: withTracking(ensureHref(data.cta1 && data.cta1.href), data, AiAgentsBanner.id),
            'data-cta': 'primary',
            style: {
              display: 'inline-flex',
              alignItems: 'center',
              padding: '8px 12px',
              borderRadius: 8,
              background: BRAND_BLUE,
              color: '#ffffff',
              fontFamily: INTER,
              fontWeight: 600,
              fontSize: 12,
              lineHeight: '14px',
              letterSpacing: '-0.002em',
              textDecoration: 'none',
              whiteSpace: 'nowrap',
              flex: '0 0 auto',
            },
          },
          (data.cta1 && data.cta1.label) || 'Book a Demo'
        )
      );
    },

    /* Email-safe HTML — uses a 2-cell table so Gmail/Outlook lay it out
       reliably. */
    toHtml: function AiAgentsToHtml({ data, viewport }) {
      const isMobile = viewport === 'mobile';
      const width = isMobile ? 343 : 520;
      const padX = isMobile ? 14 : 18;
      const padY = isMobile ? 12 : 14;
      const headingSize = isMobile ? 14 : 16;
      const ctaHref = withTracking(ensureHref(data.cta1 && data.cta1.href), data, AiAgentsBanner.id);
      const ctaLabel = esc((data.cta1 && data.cta1.label) || 'Book a Demo');

      return (
        '<table cellpadding="0" cellspacing="0" border="0" width="' +
        width +
        '" style="border-collapse:separate;background-color:' +
        BANNER_BG +
        ';border-radius:12px;width:' +
        width +
        'px;" bgcolor="' +
        BANNER_BG +
        '">' +
        '<tr>' +
        '<td valign="middle" style="padding:' +
        padY +
        'px 8px ' +
        padY +
        'px ' +
        padX +
        'px;font-family:' +
        FONT_STACK +
        ';font-weight:600;font-size:' +
        headingSize +
        'px;line-height:125%;color:#ffffff;letter-spacing:-0.01em;">' +
        esc(data.bannerHeading || '') +
        '</td>' +
        '<td valign="middle" align="right" style="padding:' +
        padY +
        'px ' +
        padX +
        'px ' +
        padY +
        'px 0;white-space:nowrap;">' +
        '<a href="' +
        esc(ctaHref) +
        '" style="display:inline-block;padding:8px 12px;border-radius:8px;background-color:' +
        BRAND_BLUE +
        ';color:#ffffff;font-family:' +
        INTER +
        ';font-weight:600;font-size:12px;line-height:14px;letter-spacing:-0.002em;text-decoration:none;white-space:nowrap;" bgcolor="' +
        BRAND_BLUE +
        '">' +
        ctaLabel +
        '</a>' +
        '</td>' +
        '</tr>' +
        '</table>'
      );
    },
  };

  /* ─────────────────────────────────────────────────────────────
     BANNER 2 — "Custom image"
     ─────────────────────────────────────────────────────────────
     Drop in any banner artwork. Renders edge-to-edge inside the
     signature so the image is the entire banner. Use a rounded
     image if you want a rounded banner — the renderer doesn't
     impose its own corners on the picture.
     ───────────────────────────────────────────────────────────── */
  const CustomImageBanner = {
    id: 'custom-image',
    label: 'Add custom banner',
    description:
      'Upload your own banner artwork — a campaign hero, event card, anything you like.',

    defaults: {
      customBannerUrl: '',
      customBannerLink: 'https://www.gushwork.ai',
      customBannerAlt: 'Banner',
    },

    fields: [
      {
        key: 'customBannerUrl',
        label: 'Image',
        type: 'image',
        // Banner renders at 520px wide → 2× for retina.
        // 4.33:1 ratio keeps the banner short enough to sit cleanly above the signature.
        recommended: '1040 × 240 px (PNG or JPG)',
        placeholder: 'Drop a PNG or JPG',
      },
      {
        key: 'customBannerLink',
        label: 'Click URL',
        type: 'url',
        mono: true,
        placeholder: 'https://gushwork.ai/...',
      },
      {
        key: 'customBannerAlt',
        label: 'Alt text',
        type: 'text',
        placeholder: 'Brief description for screen readers',
      },
    ],

    Render: function CustomImageRender({ data, viewport }) {
      const isMobile = viewport === 'mobile';
      const width = isMobile ? 343 : 520;
      const src = data.customBannerUrl;
      const link = data.customBannerLink;
      const alt = data.customBannerAlt || 'Banner';

      // Empty state — striped placeholder with a quick-add file picker.
      // Clicking anywhere on the placeholder opens the OS file dialog;
      // the chosen image is hoisted up to App state via the global
      // window.__setBannerCustomImage helper (registered by App).
      if (!src) {
        const handlePick = (e) => {
          const file = e.target && e.target.files && e.target.files[0];
          if (!file) return;
          const fr = new FileReader();
          fr.onload = () => {
            if (typeof window.__setBannerCustomImage === 'function') {
              window.__setBannerCustomImage(String(fr.result || ''));
            }
          };
          fr.readAsDataURL(file);
          // Reset so picking the same file again still triggers change.
          e.target.value = '';
        };
        return React.createElement(
          'label',
          {
            className: 'gw-banner-placeholder',
            style: {
              width,
              boxSizing: 'border-box',
              height: Math.round((width * 240) / 1040),
            },
          },
          React.createElement(
            'span',
            { className: 'gw-banner-placeholder-hint' },
            'Drop a banner image  ·  1040 × 240 px recommended'
          ),
          React.createElement(
            'span',
            { className: 'gw-banner-placeholder-pill' },
            React.createElement(
              'svg',
              { width: 12, height: 12, viewBox: '0 0 14 14', 'aria-hidden': true },
              React.createElement('path', {
                d: 'M7 2.5v9M2.5 7h9',
                stroke: '#fff',
                strokeWidth: 1.6,
                strokeLinecap: 'round',
              })
            ),
            'Add custom banner'
          ),
          React.createElement('input', {
            type: 'file',
            accept: 'image/png,image/jpeg,image/webp,image/gif',
            onChange: handlePick,
            className: 'gw-banner-placeholder-input',
          })
        );
      }

      const img = React.createElement('img', {
        src,
        alt,
        style: {
          display: 'block',
          width: '100%',
          maxWidth: width,
          height: 'auto',
          borderRadius: 12,
          border: 0,
          outline: 0,
          textDecoration: 'none',
        },
      });

      if (link) {
        return React.createElement(
          'a',
          {
            href: ensureHref(link),
            style: { display: 'inline-block', lineHeight: 0, textDecoration: 'none' },
          },
          img
        );
      }
      return img;
    },

    toHtml: function CustomImageToHtml({ data, viewport }) {
      const isMobile = viewport === 'mobile';
      const width = isMobile ? 343 : 520;
      const src = data.customBannerUrl;
      if (!src) return ''; // no image → no banner output
      const alt = esc(data.customBannerAlt || 'Banner');
      const imgTag =
        '<img src="' + esc(src) + '" alt="' + alt +
        '" width="' + width +
        '" style="display:block;width:100%;max-width:' + width +
        'px;height:auto;border:0;outline:none;text-decoration:none;border-radius:12px;" />';
      if (data.customBannerLink) {
        return (
          '<a href="' + esc(ensureHref(data.customBannerLink)) +
          '" style="display:inline-block;line-height:0;text-decoration:none;">' +
          imgTag + '</a>'
        );
      }
      return imgTag;
    },
  };

  /* ── Registry export ────────────────────────────────────────── */
  const REGISTRY = {
    [AiAgentsBanner.id]: AiAgentsBanner,
    [CustomImageBanner.id]: CustomImageBanner,
  };
  const ORDER = [AiAgentsBanner.id, CustomImageBanner.id];

  window.GW_BANNERS = REGISTRY;
  window.GW_BANNERS_ORDER = ORDER;
  window.GW_BANNER_DEFAULT_ID = AiAgentsBanner.id;
  window.GW_BANNERS_HELPERS = {
    esc,
    ensureHref,
    withTracking,
    FONT_STACK,
    INTER,
    BRAND_BLUE,
    BANNER_BG,
    ArrowUpRight,
  };

  /* getBanner(id) — falls back to default if missing */
  window.getBanner = function (id) {
    return REGISTRY[id] || REGISTRY[window.GW_BANNER_DEFAULT_ID];
  };
})();
