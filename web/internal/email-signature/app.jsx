/* eslint-disable react/no-unknown-property */
/* ─────────────────────────────────────────────────────────────────
   Gushwork Email Signature Creator — main app.
   Form on the left, live preview on the right.
   ───────────────────────────────────────────────────────────────── */

const { useState, useRef, useEffect, useMemo, useCallback } = React;
const Signature = window.Signature;

/* Static identity defaults. Banner defaults are merged in from the banner
   registry at runtime so a new banner only has to ship its own `defaults`
   block in banners.js. */
const BASE_DEFAULTS = {
  salutation: 'Kind regards,',
  name: 'Bruce Wayne',
  title: 'Head of Justice League',
  phone: '+1 234 567 8900',
  email: 'bruce@gushwork.ai',
  website: 'gushwork.ai',
  layout: 'photo', // 'photo' | 'logo' | 'text'
  showBanner: true,
  showBadge: true, // brand badge overlay on the photo
};

function buildDefaults() {
  const bannerId =
    window.GW_BANNER_DEFAULT_ID ||
    (window.GW_BANNERS_ORDER && window.GW_BANNERS_ORDER[0]);
  const banner = bannerId && window.GW_BANNERS && window.GW_BANNERS[bannerId];
  return {
    ...BASE_DEFAULTS,
    bannerId: bannerId || null,
    ...((banner && banner.defaults) || {}),
  };
}
const DEFAULTS = buildDefaults();

/* Read/write a dotted key path like "cta1.href" on a plain object. */
function getByPath(obj, path) {
  return path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);
}
function setByPath(obj, path, value) {
  const keys = path.split('.');
  const next = { ...obj };
  let cur = next;
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i];
    cur[k] = { ...(cur[k] || {}) };
    cur = cur[k];
  }
  cur[keys[keys.length - 1]] = value;
  return next;
}

/* ── tiny inputs ──────────────────────────────────────────────── */
function Field({ label, children }) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
    </div>
  );
}
function TextInput({ value, onChange, placeholder, type = 'text' }) {
  return (
    <input
      type={type}
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      spellCheck={false}
    />
  );
}
function FloatField({ label, value, onChange, placeholder, type = 'text', error }) {
  const hasValue = !!(value && String(value).length);
  return (
    <div className={`float-field${hasValue ? ' filled' : ''}${error ? ' error' : ''}`}>
      <input
        type={type}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || ' '}
        spellCheck={false}
        aria-invalid={error ? 'true' : undefined}
      />
      <label>{label}</label>
      {error && (
        <div className="error-text">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.4" />
            <path d="M8 4.5v4M8 11h.01" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
          {error}
        </div>
      )}
    </div>
  );
}
function Segmented({ value, onChange, options }) {
  return (
    <div className="segmented" role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          className={value === o.value ? 'active' : ''}
          onClick={() => onChange(o.value)}
          type="button"
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
function Slider({ label, value, onChange, min, max, step = 1, suffix = '' }) {
  return (
    <Field label={label}>
      <div className="slider-row">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
        />
        <span className="value">
          {value}
          {suffix}
        </span>
      </div>
    </Field>
  );
}

/* ─── Framer-style property panel components ─────────────────── */
function PropSection({ title, children }) {
  return (
    <section className="prop-section">
      <header className="prop-section-head">
        <h3>{title}</h3>
      </header>
      <div className="prop-rows">{children}</div>
    </section>
  );
}

function PropRow({ label, children, align = 'center' }) {
  return (
    <div className={`prop-row prop-row--${align}`}>
      <span className="prop-label">{label}</span>
      <div className="prop-control">{children}</div>
    </div>
  );
}

function PropInput({ value, onChange, placeholder, type = 'text', mono = false }) {
  return (
    <input
      className={`prop-input${mono ? ' mono' : ''}`}
      type={type}
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      spellCheck={false}
    />
  );
}

function PropSegmented({ value, onChange, options }) {
  return (
    <div className="prop-segmented" role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          className={value === o.value ? 'active' : ''}
          onClick={() => onChange(o.value)}
          type="button"
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function PropYesNo({ value, onChange }) {
  return (
    <PropSegmented
      value={value ? 'yes' : 'no'}
      onChange={(v) => onChange(v === 'yes')}
      options={[
        { value: 'yes', label: 'Yes' },
        { value: 'no', label: 'No' },
      ]}
    />
  );
}

/* ── PropDropdown ─────────────────────────────────────────────────
   Hover-to-open dropdown that matches the Gushwork picker design.
   Closed: pill-shaped chip with the active label + soft chevron.
   Open: a panel below with each option as a row; active row has a
   subtle gray background + a small circle-check icon at the right.
   Other options use muted text. Opens on hover (mouse enter) and on
   click; closes on mouse-leave (short delay), outside click, or Esc. */
function PropDropdown({ value, onChange, options }) {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef(null);
  const rootRef = useRef(null);

  const cancelClose = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };
  const scheduleClose = () => {
    cancelClose();
    closeTimer.current = setTimeout(() => setOpen(false), 120);
  };

  useEffect(() => {
    if (!open) return undefined;
    const onDocPointer = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDocPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const selected = options.find((o) => o.value === value);
  const label = selected ? selected.label : '';

  return (
    <div
      ref={rootRef}
      className={`prop-dropdown${open ? ' open' : ''}`}
      onMouseEnter={() => { cancelClose(); setOpen(true); }}
      onMouseLeave={scheduleClose}
    >
      <button
        type="button"
        className="prop-dropdown-trigger"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="prop-dropdown-value">{label}</span>
        <svg className="prop-dropdown-caret" width="12" height="12" viewBox="0 0 12 12" aria-hidden>
          <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div className="prop-dropdown-menu" role="listbox">
          {options.map((o) => {
            const isActive = o.value === value;
            return (
              <button
                key={o.value}
                type="button"
                role="option"
                aria-selected={isActive}
                className={`prop-dropdown-item${isActive ? ' active' : ''}`}
                onClick={() => { onChange(o.value); setOpen(false); }}
              >
                <span className="prop-dropdown-item-label">
                  {o.icon && (
                    <span className="prop-dropdown-item-icon" aria-hidden>{o.icon}</span>
                  )}
                  <span>{o.label}</span>
                </span>
                {isActive && (
                  <svg className="prop-dropdown-item-check" width="16" height="16" viewBox="0 0 16 16" aria-hidden>
                    <circle cx="8" cy="8" r="7" fill="currentColor" />
                    <path d="M5 8.2L7 10.2L11 6.2" stroke="#fff" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PropSlider({ value, onChange, min, max, step = 1, suffix = '' }) {
  return (
    <div className="prop-slider">
      <input
        className="prop-input num"
        type="number"
        value={value}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (!Number.isNaN(n)) onChange(Math.max(min, Math.min(max, n)));
        }}
        min={min}
        max={max}
      />
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}
function Toggle({ on, onChange }) {
  return (
    <button
      type="button"
      className={`toggle${on ? ' on' : ''}`}
      onClick={() => onChange(!on)}
      aria-pressed={on}
    />
  );
}

/* ── Photo picker (file → resized data URL) ────────────────────── */
// Gmail caps signature size at ~10KB, so user uploads are downsized to a
// small JPEG before being embedded. 128px square @ q=0.78 → ~5KB.

/* Shared file-handler: takes a File, resizes it to a sensible max size while
   preserving aspect ratio, and calls onPhoto(dataUrl, name) with the result.
   The badge is NOT baked here any more — it's stamped in at Copy/Download
   time via bakePhotoForEmail() below, so the x/y/zoom sliders can pan and
   zoom the photo before the final crop is committed. */
function processPhotoFile(file, onPhoto) {
  if (!file) return;
  const fr = new FileReader();
  fr.onload = () => {
    const img = new Image();
    img.onload = () => {
      const MAX = 800; // longest side cap — kept reasonable for in-memory state
      const scale = Math.min(1, MAX / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      const ctx = c.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, w, h);
      const dataUrl = c.toDataURL('image/png');
      onPhoto(dataUrl, file.name);
    };
    img.onerror = () => onPhoto(fr.result, file.name);
    img.src = fr.result;
  };
  fr.readAsDataURL(file);
}

/* Estimate the decoded byte size of a base64 data URL. */
function estDataUrlBytes(dataUrl) {
  const i = dataUrl.indexOf(',');
  const b64 = i >= 0 ? dataUrl.slice(i + 1) : dataUrl;
  return Math.floor((b64.length * 3) / 4);
}

/* Encode a canvas as JPEG with a size-budget ladder. Gmail caps the
   signature HTML at ~10KB total, so the photo (the heaviest payload)
   needs to land well under that. We try progressively lower quality
   tiers until we hit the target byte budget; if even the lowest
   tier overshoots we downscale the canvas and retry. Returns a data
   URL string. */
function canvasToBudgetedJpeg(canvas, targetBytes) {
  const QS = [0.86, 0.78, 0.7, 0.6, 0.5, 0.42];
  for (const q of QS) {
    const url = canvas.toDataURL('image/jpeg', q);
    if (estDataUrlBytes(url) <= targetBytes) return url;
  }
  // Last resort: downscale the canvas by 0.75× and retry once.
  const small = document.createElement('canvas');
  small.width = Math.round(canvas.width * 0.75);
  small.height = Math.round(canvas.height * 0.75);
  const sctx = small.getContext('2d');
  sctx.imageSmoothingEnabled = true;
  sctx.imageSmoothingQuality = 'high';
  sctx.drawImage(canvas, 0, 0, small.width, small.height);
  for (const q of QS) {
    const url = small.toDataURL('image/jpeg', q);
    if (estDataUrlBytes(url) <= targetBytes) return url;
  }
  // Give up at the lowest quality on the smaller canvas.
  return small.toDataURL('image/jpeg', 0.42);
}

/* Bake the stored photo into the final PNG/JPEG that goes into the email.
   Mirrors PhotoBlock's CSS in signature.jsx: objectFit:cover, then zoom and
   objectPosition pan via x/y. Then overlays the brand badge on top.

   Output is JPEG (no alpha) compressed to fit a ~6KB byte budget so the
   surrounding signature HTML stays comfortably under Gmail's ~10KB cap.
   The photo cell in the surrounding markup is explicit white, so the
   rounded-corner pixels read as transparent against the email body. */
async function bakePhotoForEmail(photoUrl, xform, opts) {
  // Bake at 2× the display size (display is 64px → 128 baseline). Output is
  // PNG with transparent corners + transparent badge area so the photo blends
  // into any email body color (light or dark mode).
  const SZ = 192;
  const { x = 50, y = 40, zoom = 100, grayscale = false } = xform || {};
  const { showBadge = true } = opts || {};
  const img = await new Promise((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = photoUrl;
  });
  const cover = Math.max(SZ / img.width, SZ / img.height);
  const finalScale = cover * (zoom / 100);
  const drawW = img.width * finalScale;
  const drawH = img.height * finalScale;
  const drawX = -(drawW - SZ) * (x / 100);
  const drawY = -(drawH - SZ) * (y / 100);

  const c = document.createElement('canvas');
  c.width = SZ;
  c.height = SZ;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Clip to the photo's outer rounded rect — the pixels outside the path
  // stay transparent so the email body color shows through in any theme.
  const PHOTO_OUTER_RAD = Math.round(SZ * 6 / 64); // mirrors the live preview's 6px radius
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(PHOTO_OUTER_RAD, 0);
  ctx.lineTo(SZ - PHOTO_OUTER_RAD, 0);
  ctx.quadraticCurveTo(SZ, 0, SZ, PHOTO_OUTER_RAD);
  ctx.lineTo(SZ, SZ - PHOTO_OUTER_RAD);
  ctx.quadraticCurveTo(SZ, SZ, SZ - PHOTO_OUTER_RAD, SZ);
  ctx.lineTo(PHOTO_OUTER_RAD, SZ);
  ctx.quadraticCurveTo(0, SZ, 0, SZ - PHOTO_OUTER_RAD);
  ctx.lineTo(0, PHOTO_OUTER_RAD);
  ctx.quadraticCurveTo(0, 0, PHOTO_OUTER_RAD, 0);
  ctx.closePath();
  ctx.clip();

  if (grayscale) ctx.filter = 'grayscale(1)';
  ctx.drawImage(img, drawX, drawY, drawW, drawH);
  ctx.filter = 'none';
  ctx.restore();

  if (!showBadge) {
    return c.toDataURL('image/png');
  }

  // Badge = 13/64 of the photo size; mark + inner radius scale off the
  // original 10.8:6.6:2 SVG ratios. Mark is centered inside the badge.
  const BADGE = Math.round(SZ * 13 / 64);
  const BADGE_INNER_RAD = Math.round(BADGE * 2 / 10.8);
  const MARK = Math.round(BADGE * 6.6 / 10.8);
  const MARK_INSET = (BADGE - MARK) / 2;
  const BADGE_X = 0;
  const BADGE_Y = SZ - BADGE;

  // Carve a transparent "cut-out" for the badge area so the email body
  // shows through (white on light, dark on dark) — matching the live
  // preview's theme-aware badge background. Only the inner top-right
  // corner is rounded; the badge's outer corners fall outside the
  // photo's rounded clip and are naturally clipped to that shape.
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  ctx.moveTo(BADGE_X, BADGE_Y);
  ctx.lineTo(BADGE_X + BADGE - BADGE_INNER_RAD, BADGE_Y);
  ctx.quadraticCurveTo(BADGE_X + BADGE, BADGE_Y, BADGE_X + BADGE, BADGE_Y + BADGE_INNER_RAD);
  ctx.lineTo(BADGE_X + BADGE, BADGE_Y + BADGE);
  ctx.lineTo(BADGE_X, BADGE_Y + BADGE);
  ctx.closePath();
  ctx.fillStyle = '#000';
  ctx.fill();
  ctx.restore();

  // Draw the blue Gushwork mark on top of the now-transparent badge area.
  const markSrc = window.GW_ASSETS?.gwMark;
  if (markSrc) {
    await new Promise((resolve) => {
      const mark = new Image();
      mark.onload = () => {
        ctx.drawImage(
          mark,
          BADGE_X + MARK_INSET,
          SZ - MARK - MARK_INSET,
          MARK,
          MARK
        );
        resolve();
      };
      mark.onerror = resolve;
      mark.src = markSrc;
    });
  }

  return c.toDataURL('image/png');
}

function PhotoDropzone({ photoUrl, photoName, onPhoto, onClear }) {
  const inputRef = useRef(null);
  const handleFile = (file) => processPhotoFile(file, onPhoto);
  return (
    <div className="dropzone">
      {photoUrl ? (
        <div
          className="thumb"
          style={{ backgroundImage: `url(${photoUrl})` }}
          aria-label="Current photo"
        />
      ) : (
        <div className="thumb empty" aria-hidden>
          +
        </div>
      )}
      <div className="copy">
        <div className="name">
          {photoName || (photoUrl ? 'Custom photo' : 'Upload a photo')}
        </div>
        <div className="hint">
          {photoUrl ? 'Click to replace' : 'PNG or JPG, 320×320+ ideal'}
        </div>
      </div>
      {photoUrl && (
        <button
          type="button"
          className="clear"
          onClick={(e) => {
            e.stopPropagation();
            onClear();
            if (inputRef.current) inputRef.current.value = '';
          }}
        >
          Clear
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </div>
  );
}

/* ── Banner image picker — used by the "Custom image" banner type ──
   A compact dropzone variant: shows a thumbnail of the uploaded image,
   the file name, and the recommended dimensions hint. Returns a data
   URL so the image is embedded inline in the copied/exported HTML. */
function BannerImagePicker({ value, onChange, recommended, placeholder }) {
  const inputRef = useRef(null);
  const [name, setName] = useState('');

  const handleFile = (file) => {
    if (!file) return;
    const fr = new FileReader();
    fr.onload = () => {
      onChange(String(fr.result || ''));
      setName(file.name || '');
    };
    fr.readAsDataURL(file);
  };

  return (
    <div className="dropzone banner-dropzone">
      {value ? (
        <div
          className="thumb"
          style={{
            backgroundImage: `url(${value})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
          aria-label="Banner image"
        />
      ) : (
        <div className="thumb empty" aria-hidden="true">+</div>
      )}
      <div className="copy">
        <div className="name">
          {value ? (name || 'Custom banner') : (placeholder || 'Upload a banner')}
        </div>
        <div className="hint">
          {value
            ? 'Click to replace'
            : (recommended ? `Recommended: ${recommended}` : 'PNG or JPG')}
        </div>
      </div>
      {value && (
        <button
          type="button"
          className="clear"
          onClick={(e) => {
            e.stopPropagation();
            onChange('');
            setName('');
            if (inputRef.current) inputRef.current.value = '';
          }}
          aria-label="Remove banner image"
        >
          Clear
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </div>
  );
}

/* ── Tiny icon for buttons ─────────────────────────────────── */
function CheckIcon({ size = 14 }) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} fill="none">
      <path
        d="M3 8.5l3 3 6.5-7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function CopyIcon({ size = 14 }) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} fill="none">
      <rect x="4" y="4" width="9" height="9" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10 4V3a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h1" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
function DownloadIcon({ size = 14 }) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} fill="none">
      <path d="M8 2v8m0 0l-3-3m3 3l3-3M3 13h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function SunIcon({ size = 16 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none">
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4"
        stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
function MoonIcon({ size = 16 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none">
      <path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79Z"
        stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}
function DesktopIcon({ size = 14 }) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} fill="none">
      <rect x="1.5" y="2.5" width="13" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M6 14h4M8 11.5V14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
function MobileIcon({ size = 14 }) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} fill="none">
      <rect x="4.5" y="1.5" width="7" height="13" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="8" cy="12.5" r="0.6" fill="currentColor" />
    </svg>
  );
}

/* ── Main App ──────────────────────────────────────────────── */
function App() {
  const [data, setData] = useState(DEFAULTS);
  const [photoUrl, setPhotoUrl] = useState(() => window.GW_ASSETS?.defaultPhoto || null);
  const [photoName, setPhotoName] = useState(() => (window.GW_ASSETS?.defaultPhoto ? 'Default photo' : ''));
  const [photoXform, setPhotoXform] = useState({ x: 50, y: 40, zoom: 100, grayscale: false });
  const [theme, setTheme] = useState('light'); // preview background
  const [viewport, setViewport] = useState('desktop'); // desktop | mobile
  const [copyState, setCopyState] = useState('idle'); // 'idle' | 'ok' | 'err'
  const [downloadState, setDownloadState] = useState('idle'); // 'idle' | 'err'

  // Sync the page background with the preview theme so dark mode fills the canvas, not just the email card.
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    return () => { delete document.documentElement.dataset.theme; };
  }, [theme]);
  const sigWrapRef = useRef(null);

  // Expose a global helper so the custom-banner Render can hoist a
  // picked file all the way back into App state without prop drilling
  // through the signature renderer + banner registry.
  useEffect(() => {
    window.__setBannerCustomImage = (url) => {
      setData((d) => setByPath(d, 'customBannerUrl', url));
    };
    return () => { delete window.__setBannerCustomImage; };
  }, []);

  const update = useCallback((patch) => setData((d) => ({ ...d, ...patch })), []);
  const updatePath = useCallback(
    (path, value) => setData((d) => setByPath(d, path, value)),
    []
  );
  /* When the user picks a different banner, merge that banner's defaults
     into data — but only for keys the user hasn't overridden already (so
     existing customizations on shared keys like `bannerHeading` survive). */
  const setBannerId = useCallback((id) => {
    setData((d) => {
      const banner = window.GW_BANNERS && window.GW_BANNERS[id];
      const merged = { ...d, bannerId: id };
      if (banner && banner.defaults) {
        Object.entries(banner.defaults).forEach(([k, v]) => {
          if (merged[k] == null) merged[k] = v;
        });
      }
      return merged;
    });
  }, []);

  const doOpenInTab = useCallback(async () => {
    if (
      data.layout === 'photo' &&
      (!photoUrl || photoUrl === window.GW_ASSETS?.defaultPhoto)
    ) {
      setDownloadState('err');
      setTimeout(() => setDownloadState('idle'), 2400);
      return;
    }
    const finalPhotoUrl =
      data.layout === 'photo' && photoUrl
        ? await bakePhotoForEmail(photoUrl, photoXform)
        : photoUrl;
    const html = window.buildStandaloneHtml(data, finalPhotoUrl, { viewport });
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener,noreferrer');
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }, [data, photoUrl, photoXform, viewport]);

  const errIcon = (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 4.5v4M8 11h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );

  const doCopy = useCallback(async () => {
    if (
      data.layout === 'photo' &&
      (!photoUrl || photoUrl === window.GW_ASSETS?.defaultPhoto)
    ) {
      setCopyState('err');
      setTimeout(() => setCopyState('idle'), 2400);
      return;
    }
    // Bake the current x/y/zoom into the final 256x256 PNG (with badge).
    // For Logo layout there's no photo to bake — pass through the data as-is.
    const finalPhotoUrl =
      data.layout === 'photo' && photoUrl
        ? await bakePhotoForEmail(photoUrl, photoXform)
        : photoUrl;
    // Use the flat-layout string builder — Gmail-safe (div banner, no nested tables).
    const html = window.buildEmailSafeHtml(data, finalPhotoUrl, { viewport });
    try {
      if (window.ClipboardItem) {
        const item = new window.ClipboardItem({
          'text/html': new Blob([html], { type: 'text/html' }),
        });
        await navigator.clipboard.write([item]);
      } else {
        await navigator.clipboard.writeText(html);
      }
      setCopyState('ok');
      setTimeout(() => setCopyState('idle'), 6000);
    } catch (err) {
      console.error('Clipboard write failed', err);
      const tmp = document.createElement('div');
      tmp.contentEditable = 'true';
      tmp.style.position = 'absolute';
      tmp.style.left = '-99999px';
      tmp.innerHTML = html;
      document.body.appendChild(tmp);
      const range = document.createRange();
      range.selectNodeContents(tmp);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      try {
        document.execCommand('copy');
        setCopyState('ok');
        setTimeout(() => setCopyState('idle'), 6000);
      } catch (e) {
        alert('Could not copy. Use Download instead.');
      }
      sel.removeAllRanges();
      tmp.remove();
    }
  }, [data, photoUrl, photoXform, viewport]);

  const doDownload = useCallback(async () => {
    if (
      data.layout === 'photo' &&
      (!photoUrl || photoUrl === window.GW_ASSETS?.defaultPhoto)
    ) {
      setDownloadState('err');
      setTimeout(() => setDownloadState('idle'), 2400);
      return;
    }
    const finalPhotoUrl =
      data.layout === 'photo' && photoUrl
        ? await bakePhotoForEmail(photoUrl, photoXform)
        : photoUrl;
    const html = window.buildStandaloneHtml(data, finalPhotoUrl, { viewport });
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const slug = (data.name || 'signature').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    a.download = `${slug}-gushwork-signature.html`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, [data, photoUrl, photoXform, viewport]);

  const photoControlsDisabled = data.layout !== 'photo';

  return (
    <div className="app">
      {/* ── LEFT: brand card + form card ── */}
      <div className="left-col">
        <header className="brand-card">
          <svg className="brand-icon" width="32" height="32" viewBox="0 0 160 160" fill="none" aria-hidden>
            <rect width="160" height="160" rx="20" fill="#0D0D0D" />
            <path d="M116.609 44.5634C117.503 42.3606 115.85 40 113.472 40H49.1429C44.0934 40 40 44.0934 40 49.1429V106.778C40 112.018 45.1708 115.683 49.9603 113.557C80.8494 99.8449 104.378 74.7075 116.609 44.5634Z" fill="white" />
            <path d="M72.5161 120C71.4022 120 70.9357 118.553 71.8259 117.884C94.9007 100.527 111.434 75.8047 118.766 48.0522C118.94 47.3915 120 47.5162 120 48.1995V110.857C120 115.907 115.907 120 110.857 120H72.5161Z" fill="white" />
          </svg>
          <h1>Email Signature Creator</h1>
        </header>

        <aside className="form-card">
          <p className="form-card-subtitle">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="form-card-subtitle-icon"
            >
              <path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z" />
            </svg>
            <span>Editor Panel</span>
          </p>

          <div className="form">
            {/* Layout */}
            <PropSection title="Layout">
                <PropRow label="Style">
                  <PropDropdown
                    value={data.layout}
                    onChange={(v) => update({ layout: v })}
                    options={[
                      { value: 'photo', label: 'Photo' },
                      { value: 'logo', label: 'Logo' },
                      { value: 'text', label: 'Text' },
                    ]}
                  />
                </PropRow>
            </PropSection>

            {/* Identity */}
            <PropSection title="Identity">
              <PropRow label="Name">
                <PropInput value={data.name} onChange={(v) => update({ name: v })} placeholder="Bruce Wayne" />
              </PropRow>
              <PropRow label="Title">
                <PropInput value={data.title} onChange={(v) => update({ title: v })} placeholder="Head of Justice League" />
              </PropRow>
              <PropRow label="Phone">
                <PropInput value={data.phone} onChange={(v) => update({ phone: v })} placeholder="+1 234 567 8900" />
              </PropRow>
              <PropRow label="Email">
                <PropInput value={data.email} onChange={(v) => update({ email: v })} placeholder="bruce@gushwork.ai" type="email" />
              </PropRow>
              <PropRow label="Sign-off">
                <PropInput value={data.salutation} onChange={(v) => update({ salutation: v })} placeholder="Kind regards," />
              </PropRow>
            </PropSection>

            {/* Photo — gently collapses when the Logo layout is active */}
            <div className={`prop-collapse${data.layout === 'photo' ? '' : ' closed'}`}>
              <PropSection title="Photo">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <PropRow label="Image" align="start">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', minWidth: 0 }}>
                    <PhotoDropzone
                      photoUrl={photoUrl}
                      photoName={photoName}
                      onPhoto={(url, name) => {
                        setPhotoUrl(url);
                        setPhotoName(name);
                      }}
                      onClear={() => {
                        setPhotoUrl(null);
                        setPhotoName('');
                        setPhotoXform({ x: 50, y: 40, zoom: 100, grayscale: false });
                      }}
                    />
                  </div>
                </PropRow>
                <PropRow label="Grayscale">
                  <PropYesNo
                    value={photoXform.grayscale}
                    onChange={(v) => setPhotoXform((p) => ({ ...p, grayscale: v }))}
                  />
                </PropRow>
                <PropRow label="Zoom">
                  <PropSlider
                    value={photoXform.zoom}
                    onChange={(v) => setPhotoXform((p) => ({ ...p, zoom: v }))}
                    min={100}
                    max={250}
                    suffix="%"
                  />
                </PropRow>
                <PropRow label="Horizontal">
                  <PropSlider
                    value={photoXform.x}
                    onChange={(v) => setPhotoXform((p) => ({ ...p, x: v }))}
                    min={0}
                    max={100}
                  />
                </PropRow>
                <PropRow label="Vertical">
                  <PropSlider
                    value={photoXform.y}
                    onChange={(v) => setPhotoXform((p) => ({ ...p, y: v }))}
                    min={0}
                    max={100}
                  />
                </PropRow>
              </div>
            </PropSection>
            </div>

            {/* Banner — fields are driven by the active banner's registry entry
                so adding a new banner type only requires editing banners.js. */}
            <PropSection title="Banner">
              <PropRow label="Visible">
                <PropYesNo value={data.showBanner} onChange={(v) => update({ showBanner: v })} />
              </PropRow>
              {data.showBanner && (() => {
                const order = window.GW_BANNERS_ORDER || [];
                const registry = window.GW_BANNERS || {};
                const activeId =
                  data.bannerId && registry[data.bannerId]
                    ? data.bannerId
                    : order[0];
                const active = registry[activeId];
                if (!active) return null;
                return (
                  <>
                    {order.length > 1 && (
                      <PropRow label="Design">
                        <PropDropdown
                          value={activeId}
                          onChange={(v) => setBannerId(v)}
                          options={order.map((id) => ({
                            value: id,
                            label: (registry[id] && registry[id].label) || id,
                            icon:
                              id === 'custom-image' ? (
                                <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
                                  <path d="M7 2.5v9M2.5 7h9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                </svg>
                              ) : null,
                          }))}
                        />
                      </PropRow>
                    )}
                    {(active.fields || []).map((f) => (
                      <PropRow key={f.key} label={f.label} align={f.type === 'image' ? 'start' : 'center'}>
                        {f.type === 'image' ? (
                          <BannerImagePicker
                            value={getByPath(data, f.key) || ''}
                            onChange={(v) => updatePath(f.key, v)}
                            recommended={f.recommended}
                            placeholder={f.placeholder}
                          />
                        ) : (
                          <PropInput
                            value={getByPath(data, f.key) || ''}
                            onChange={(v) => updatePath(f.key, v)}
                            placeholder={f.placeholder}
                            type={f.type || 'text'}
                            mono={!!f.mono}
                          />
                        )}
                      </PropRow>
                    ))}
                  </>
                );
              })()}
            </PropSection>

            <PropSection
              title={
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true" style={{ color: '#9ca3af', flex: '0 0 auto' }}>
                    <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.4" />
                    <path d="M8 7.25v3.75M8 5.25v.01" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  </svg>
                  How to add to Gmail?
                </span>
              }
            >
              <ol className="prop-tip prop-tip-list" data-comment-anchor="install-steps">
                <li>Click <strong>Copy HTML</strong> below.</li>
                <li>In Gmail, open <strong>Settings → Signature</strong> and paste.</li>
                <li>Save changes.</li>
              </ol>
            </PropSection>
          </div>
        </aside>
      </div>

      {/* ── RIGHT: preview surface ── */}
      <main className="preview-col">
        <div className="preview-content" data-theme={theme} data-viewport={viewport}>
          <div className="email-body">
            Hey there,
            <br />
            <br />
            Introducing the Gushwork email signature creator. Use the
            editor panel on the side to fill in your details and tweak the
            styling, then use the controls below the preview to copy the HTML
            or download it.{' '}
            <span className="gmail-help" tabIndex={0}>
              Don't know how to add it to Gmail?
              <span className="gmail-help-tip" role="tooltip">
                <ol className="gmail-help-tip-steps">
                  <li>Click <strong>Copy HTML</strong> below the preview.</li>
                  <li>In Gmail, open <strong>Settings → Signature</strong> and paste.</li>
                  <li>Save changes.</li>
                </ol>
              </span>
            </span>
            <br />
            <br />
            You can also drop in a custom banner image, but please use that
            sparingly — when in doubt, loop in the design team first so we
            keep everyone's signatures looking consistent.
            <br />
            <br />
            For any queries or suggestions, ping{' '}
            <a
              href="https://gushwork.slack.com/team/U06UAR183TR"
              target="_blank"
              rel="noopener noreferrer"
              className="text-link"
            >
              Utsav
            </a>
            .
          </div>
          {/* Wrap the signature with a hover overlay over the photo area —
              clicking it opens the file picker so users don't need to scroll
              back to the form panel to swap the photo. */}
          <div className="sig-delimiter" aria-hidden="true">--</div>
          <div
            ref={sigWrapRef}
            className={`sig-wrap${data.layout === 'photo' ? ' has-photo' : ''}`}
            data-viewport={viewport}
            data-has-salutation={data.salutation ? 'true' : 'false'}
          >
            <div data-sig-root>
              <Signature
                data={data}
                theme={theme}
                viewport={viewport}
                mode="table"
                photoUrl={photoUrl}
                photoXform={photoXform}
                showBadge={true}
              />
            </div>
            {data.layout === 'photo' && (
              <label
                className="sig-photo-overlay"
                title="Click to change photo"
                onClick={(e) => e.stopPropagation()}
              >
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    processPhotoFile(f, (url, name) => {
                      setPhotoUrl(url);
                      setPhotoName(name);
                    });
                    e.target.value = '';
                  }}
                />
                <span className="sig-photo-overlay-inner" aria-label="Change photo" title="Change photo">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
                  </svg>
                </span>
              </label>
            )}
          </div>
        </div>
      </main>

      {/* ── floating bottom toolbar ── */}
      <div className="floating-toolbar">
        <div className="tb-pill" role="tablist" aria-label="Preview background">
          <button
            className={`icon-only ${theme === 'light' ? 'active' : ''}`}
            onClick={() => setTheme('light')}
            type="button"
            title="Light background"
            aria-label="Light"
          >
            <SunIcon />
          </button>
          <span className="moon-tooltip">
            <button
              className={`icon-only ${theme === 'dark' ? 'active' : ''}`}
              onClick={() => setTheme('dark')}
              type="button"
              aria-label="Dark"
            >
              <MoonIcon />
            </button>
            <span className="moon-tooltip-tip" role="tooltip">
              In dark mode — signature may render differently on some devices.
            </span>
          </span>
        </div>

        <div className="tb-pill" role="tablist" aria-label="Viewport">
          <button
            className={viewport === 'desktop' ? 'active' : ''}
            onClick={() => setViewport('desktop')}
            type="button"
          >
            <DesktopIcon /> Desktop
          </button>
          <button
            className={viewport === 'mobile' ? 'active' : ''}
            onClick={() => setViewport('mobile')}
            type="button"
          >
            <MobileIcon /> Mobile
          </button>
        </div>

        <div className="tb-pill">
          <button
            type="button"
            onClick={doDownload}
            className={downloadState === 'err' ? 'btn-error' : ''}
          >
            {downloadState === 'err' ? (
              <>
                {errIcon}
                Upload your photo first
              </>
            ) : (
              <>
                <DownloadIcon /> Download HTML
              </>
            )}
          </button>
          <span className={`copy-btn-wrap${copyState === 'ok' ? ' show-tooltip' : ''}`}>
            <button
              type="button"
              onClick={doCopy}
              className={`btn-primary${copyState === 'ok' ? ' copied' : ''}${copyState === 'err' ? ' btn-error' : ''}`}
            >
              {copyState === 'ok' ? (
                <>
                  <CheckIcon /> Copied
                </>
              ) : copyState === 'err' ? (
                <>
                  {errIcon} Upload your photo first
                </>
              ) : (
                <>
                  <CopyIcon /> Copy HTML
                </>
              )}
            </button>
            <span className="copy-tooltip" role="status" aria-live="polite">
              <CheckIcon />
              <span className="copy-tooltip-text">
                Your signature is copied, open{' '}
                <a
                  href="https://mail.google.com/mail/u/0/#settings/general"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Gmail settings
                </a>
                {' '}and paste it in.
              </span>
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
