/* eslint-disable react/no-unknown-property */
/* ─────────────────────────────────────────────────────────────────
   <Signature/> — renders the email signature DOM.
   Used in the live preview. The clipboard / download path uses
   buildEmailSafeHtml() in build-clipboard.js — both pipelines look
   up the banner via window.getBanner(data.bannerId) so a new banner
   only has to register itself in banners.js.

   Every style is inline so this DOM can stand alone when copied.
   ───────────────────────────────────────────────────────────────── */

(function () {
  const A = window.GW_ASSETS;

  /* Plus Jakarta Sans is requested via <link> in index.html. */
  const FONT_STACK = '"Plus Jakarta Sans", -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

  /* ── Gushwork logo mark — plain <img> with the blue SVG. No wrapper,
     no background. This matches the earliest working pasted output. ── */
  function LogoMark({ size = 160 }) {
    return (
      <img
        src={A.gwMark}
        alt="Gushwork"
        width={size}
        height={size}
        style={{
          display: 'block',
          width: size,
          height: size,
          flex: '0 0 auto',
        }}
      />
    );
  }

  /* ── User photo block: positions the photo with pixel coordinates derived
     from its natural dimensions + the x/y/zoom transform, so the preview
     mirrors what the canvas bake produces. Falls back to a plain
     object-fit:cover render while dims load. ── */
  function PhotoBlock({ src, xform, dims: dimsProp, alt, size = 160, radius = 12, showBadge = true, theme = 'light' }) {
    const { x = 50, y = 50, zoom = 100, grayscale = false } = xform || {};
    /* If `dims` aren't passed in, load the image and read its natural
       width/height so the zoom + x/y math has real numbers to work with.
       Without this the preview silently falls through to the plain
       `object-fit:cover` branch and zoom/horizontal/vertical do nothing. */
    const [loadedDims, setLoadedDims] = React.useState(null);
    React.useEffect(() => {
      if (dimsProp || !src) {
        setLoadedDims(null);
        return;
      }
      let cancelled = false;
      const img = new Image();
      img.onload = () => {
        if (!cancelled) {
          setLoadedDims({ width: img.naturalWidth, height: img.naturalHeight });
        }
      };
      img.onerror = () => {
        if (!cancelled) setLoadedDims(null);
      };
      img.src = src;
      return () => {
        cancelled = true;
      };
    }, [src, dimsProp]);
    const dims = dimsProp || loadedDims;
    /* Badge: sits flush in the BOTTOM-LEFT corner of the photo. Only the
       top-right corner of the badge is rounded; the badge's bottom-left
       inherits the photo's outer rounded corner via the parent's
       overflow:hidden clip. White in light mode, dark in dark mode.
       Badge = 13/64 of the photo size; mark/inner-radius scale off the
       original 10.8:6.6:2 SVG ratios. Mark is centered. */
    const badgeSize = Math.max(16, Math.round(size * 13 / 64));
    const badgeInnerRadius = Math.max(2, Math.round(badgeSize * 2 / 10.8));
    const markSize = Math.max(10, Math.round(badgeSize * 6.6 / 10.8));
    const markInset = (badgeSize - markSize) / 2;
    const isDark = theme === 'dark';
    /* Badge background matches the email body so it reads as a "cut-out"
       in the photo. Light mode → white (email body). Dark mode → #1a1d20
       (mirrors the preview-content dark background). */
    const badgeBg = isDark ? '#1a1d20' : '#FFFFFF';

    let imgStyle;
    if (src && dims && dims.width > 0 && dims.height > 0) {
      const cover = Math.max(size / dims.width, size / dims.height);
      const finalScale = cover * (zoom / 100);
      const drawW = dims.width * finalScale;
      const drawH = dims.height * finalScale;
      const drawX = -(drawW - size) * (x / 100);
      const drawY = -(drawH - size) * (y / 100);
      imgStyle = {
        position: 'absolute',
        left: drawX,
        top: drawY,
        width: drawW,
        height: drawH,
        display: 'block',
        filter: grayscale ? 'grayscale(1)' : 'none',
      };
    } else if (src) {
      imgStyle = {
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        display: 'block',
        filter: grayscale ? 'grayscale(1)' : 'none',
      };
    }

    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: radius,
          overflow: 'hidden',
          background: '#CFD1D4',
          position: 'relative',
          flex: '0 0 auto',
        }}
      >
        {src ? (
          <img src={src} alt={alt || ''} style={imgStyle} />
        ) : (
          <svg viewBox="0 0 64 64" width={size} height={size} style={{ display: 'block' }}>
            <rect width="64" height="64" fill="#CFD1D4" />
            <circle cx="32" cy="25" r="11" fill="#A4A8AD" />
            <path d="M8 60c0-13 11-22 24-22s24 9 24 22" fill="#A4A8AD" />
          </svg>
        )}
        {/* Badge background — flush in the bottom-left corner of the photo.
            Only the top-right corner of the badge is rounded; the badge's
            bottom-left corner is clipped to the photo's rounded outer edge
            via the parent's overflow:hidden. */}
        {showBadge && (
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: 0,
            bottom: 0,
            width: badgeSize,
            height: badgeSize,
            borderTopRightRadius: badgeInnerRadius,
            background: badgeBg,
            zIndex: 2,
          }}
        />
        )}
        {/* Blue Gushwork mark, centered inside the badge. */}
        {showBadge && (
        <img
          src={A.gwMark}
          alt=""
          width={markSize}
          height={markSize}
          style={{
            position: 'absolute',
            left: markInset,
            bottom: markInset,
            width: markSize,
            height: markSize,
            display: 'block',
            zIndex: 3,
          }}
        />
        )}
      </div>
    );
  }

  /* ── Main Signature: salutation + identity row + banner ── */
  function Signature({ data, theme, viewport, photoUrl, photoXform, embedId, showBadge = true }) {
    const isDark = theme === 'dark';
    const isMobile = viewport === 'mobile';
    const headColor = isDark ? '#FFFFFF' : '#000000';
    const subColor = isDark ? 'rgba(255,255,255,0.85)' : '#000000';
    const contactColor = isDark ? 'rgba(255,255,255,0.55)' : '#535A61';

    /* viewport-driven sizing.
       Font sizes capped at 13px on desktop so Gmail's signature
       editor reports the text as "Normal" instead of "Large".

       Layout (matches the updated Figma source):
         · photo+name/title sit in one row (no contacts in that column)
         · contacts live in their own stack below the identity row
         · banner sits below the contacts */
    const dims = isMobile
      ? {
          width: 343,
          photo: 64,
          photoRadius: 6,
          gap: 14,
          nameSize: 14,
          titleSize: 11,
          contactSize: 11,
          contactLineGap: 4,
          titleGap: 6,
          rowMarginBottom: 16,
          contactsMarginBottom: 16,
          salutationSize: 13,
          salutationMargin: 20,
        }
      : {
          width: 520,
          photo: 64,
          photoRadius: 6,
          gap: 16,
          nameSize: 14,
          titleSize: 13,
          contactSize: 13,
          contactLineGap: 4,
          titleGap: 8,
          rowMarginBottom: 20,
          contactsMarginBottom: 20,
          salutationSize: 13,
          salutationMargin: 20,
        };

    /* contacts (phone is optional) */
    const contacts = [
      data.phone && { text: data.phone, href: `tel:${data.phone.replace(/[^+\d]/g, '')}` },
      data.email && { text: data.email, href: `mailto:${data.email}` },
      data.website && {
        text: data.website.replace(/^https?:\/\//, ''),
        href: data.website.startsWith('http') ? data.website : `https://${data.website}`,
      },
    ].filter(Boolean);

    /* banner — looked up from the registry so new banners plug in
       without touching this file */
    const banner = window.getBanner && window.getBanner(data.bannerId);

    return (
      <div
        id={embedId}
        style={{
          fontFamily: FONT_STACK,
          color: headColor,
          width: dims.width,
        }}
      >
        {/* salutation */}
        {data.salutation && (
          <div
            style={{
              fontFamily: FONT_STACK,
              fontSize: dims.salutationSize,
              lineHeight: '100%',
              color: headColor,
              marginBottom: dims.salutationMargin,
            }}
          >
            {data.salutation}
          </div>
        )}

        {/* identity row */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: dims.gap,
            width: dims.width,
            marginBottom: dims.rowMarginBottom,
          }}
        >
          {data.layout === 'text' ? null : data.layout === 'logo' ? (
            <LogoMark size={dims.photo} />
          ) : (
            <PhotoBlock
              src={photoUrl}
              xform={photoXform}
              alt={data.name}
              size={dims.photo}
              radius={dims.photoRadius}
              showBadge={showBadge}
              theme={theme}
            />
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: dims.titleGap, minWidth: 0 }}>
            <div
              style={{
                fontFamily: FONT_STACK,
                fontWeight: 700,
                fontSize: dims.nameSize,
                lineHeight: '120%',
                color: headColor,
                letterSpacing: '-0.01em',
              }}
            >
              {data.name}
            </div>
            <div
              style={{
                fontFamily: FONT_STACK,
                fontWeight: 500,
                fontSize: dims.titleSize,
                lineHeight: '120%',
                color: subColor,
              }}
            >
              {data.title}
            </div>
          </div>
        </div>

        {/* contacts — own stack, sits below the identity row */}
        {contacts.length > 0 && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: dims.contactLineGap,
              marginBottom: dims.contactsMarginBottom,
            }}
          >
            {contacts.map((c, i) => (
              <div key={i} style={{ lineHeight: '100%', padding: '2px 0' }}>
                <a
                  href={c.href}
                  style={{
                    fontFamily: FONT_STACK,
                    fontSize: dims.contactSize,
                    lineHeight: '100%',
                    color: contactColor,
                    textDecoration: 'none',
                  }}
                >
                  {c.text}
                </a>
              </div>
            ))}
          </div>
        )}

        {/* banner — registry-driven */}
        {data.showBanner !== false && banner && banner.Render && (
          <banner.Render data={data} viewport={viewport} />
        )}
      </div>
    );
  }

  /* ── Table-based signature: email-client safe rendering ────────────
     Gmail/Outlook strip modern CSS. This variant uses nested <table>
     elements with width/height attributes. The banner row defers to the
     registry's `toHtml()` so banner markup is one source of truth — but
     because React can't easily inject pre-built HTML strings inline,
     this preview path uses the same Render() as the rich variant and
     leaves the email-safe table version to build-clipboard.js. */
  function SignatureTable(props) {
    return <Signature {...props} />;
  }

  function SignatureRoot(props) {
    return <Signature {...props} />;
  }

  /* expose */
  window.Signature = SignatureRoot;
  window.SignatureRich = Signature;
  window.SignatureTable = SignatureTable;
})();
