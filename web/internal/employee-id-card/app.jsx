/* eslint-disable react/no-unknown-property */
/* ─────────────────────────────────────────────────────────────────
   Gushwork ID Card Creator — main app.
   Form on the left, live preview (front + back side-by-side) on the
   right, floating toolbar at the bottom for export.
   ───────────────────────────────────────────────────────────────── */

const { useState, useRef, useEffect, useCallback } = React;
const IdCardFront = window.IdCardFront;
const IdCardBack = window.IdCardBack;
const { useTweaks, TweaksPanel, TweakSection, TweakRadio, TweakColor } = window;

const DEFAULT_PHOTO = '/internal/employee-id-card/assets/default-photo.png?v=2';

const DEFAULTS = {
  name: 'Bruce Wayne',
  title: 'Head of Justice League',
  email: 'bruce@gushwork.ai',
  mobile: '+91 9876543210',
  employeeId: 'DL00',
  bloodGroup: 'O+',
  emergencyContact: '+91 9123456780',
  officeAddress:
  'Gushwork, 3rd & 4th Floor, 578, 9th A Main Rd, Defence Colony, Indiranagar, Bengaluru, Karnataka 560038',
  companyName: 'Delfin Technologies India Pvt. Ltd.'
};

/* ─────────────────────────────────────────────────────────────────
   Tweaks: three expressive controls that reshape the whole card feel.
     • Mood       — full palette recolor (frame, face, text, accent)
     • Silhouette — the corner / curve language of the card
     • Nameplate  — the display-type voice of the name
   Each maps to a bundle that the card renderer consumes as one theme.
   ───────────────────────────────────────────────────────────────── */
const MOODS = {
  midnight: {
    label: 'Cobalt',
    frame: '#0061E0', face: 'rgb(241, 242, 243)',
    faceText: 'rgb(17, 24, 39)', faceMuted: 'rgb(106, 112, 119)',
    accent: 'rgb(0, 112, 255)', onFrame: '#FFFFFF',
    onFrameMuted: 'rgba(255, 255, 255, 0.74)', divider: '#3481E6',
    backBorder: '#3481E6', swatch: ['#0061E0', '#F1F2F3', '#0070FF']
  },
  electric: {
    label: 'Electric',
    frame: '#0070FF', face: '#FFFFFF',
    faceText: '#0D0D0D', faceMuted: '#535A61',
    accent: '#0070FF', onFrame: '#FFFFFF',
    onFrameMuted: 'rgba(255, 255, 255, 0.74)', divider: 'rgba(255, 255, 255, 0.3)',
    backBorder: 'rgba(255, 255, 255, 0.42)', swatch: ['#0070FF', '#FFFFFF', '#CCE2FF']
  },
  ivory: {
    label: 'Ivory',
    frame: '#E7E1D4', face: '#FFFFFF',
    faceText: '#1B1A16', faceMuted: '#6B6555',
    accent: '#0070FF', onFrame: '#2A2620',
    onFrameMuted: 'rgba(42, 38, 32, 0.62)', divider: 'rgba(42, 38, 32, 0.14)',
    backBorder: 'rgba(42, 38, 32, 0.2)', swatch: ['#E7E1D4', '#1B1A16', '#0070FF']
  },
  forest: {
    label: 'Forest',
    frame: '#103D2E', face: '#F2F5F1',
    faceText: '#10261D', faceMuted: '#5B6E63',
    accent: '#1F8A5B', onFrame: '#FFFFFF',
    onFrameMuted: 'rgba(255, 255, 255, 0.6)', divider: 'rgba(255, 255, 255, 0.18)',
    backBorder: 'rgba(255, 255, 255, 0.22)', swatch: ['#103D2E', '#1F8A5B', '#F2F5F1']
  }
};

const SILHOUETTES = {
  swoosh: { label: 'Swoosh', outer: 8, faceRadius: '12px 12px 140px 12px', backMiddleRadius: '0 0 56px 0', backMiddleR: 56, backInnerRadius: 12, idOnFrame: true },
  soft: { label: 'Soft', outer: 18, faceRadius: '16px', backMiddleRadius: '0 0 16px 0', backMiddleR: 16, backInnerRadius: 16, idOnFrame: false },
  sharp: { label: 'Sharp', outer: 2, faceRadius: '2px', backMiddleRadius: '0px', backMiddleR: 0, backInnerRadius: 2, idOnFrame: false }
};

const NAMEPLATES = {
  grotesk: { label: 'Grotesk', family: "'Vert Grotesk Display', 'Inter', system-ui, sans-serif", weight: 700, size: 20, letterSpacing: '0.4px', lineHeight: 1.2 },
  editorial: { label: 'Editorial', family: "'Instrument Serif', Georgia, serif", weight: 400, size: 26, letterSpacing: '0px', lineHeight: 1.05 },
  technical: { label: 'Technical', family: "'Space Mono', ui-monospace, monospace", weight: 700, size: 15, letterSpacing: '-0.03em', lineHeight: 1.25 }
};

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "mood": "midnight",
  "silhouette": "swoosh",
  "nameplate": "grotesk"
} /*EDITMODE-END*/;

function buildCardTheme(t) {
  const mood = MOODS[t.mood] || MOODS.midnight;
  const sil = SILHOUETTES[t.silhouette] || SILHOUETTES.swoosh;
  const font = NAMEPLATES[t.nameplate] || NAMEPLATES.grotesk;
  return {
    frame: mood.frame, face: mood.face, faceText: mood.faceText, faceMuted: mood.faceMuted,
    accent: mood.accent, onFrame: mood.onFrame, onFrameMuted: mood.onFrameMuted,
    divider: mood.divider, backBorder: mood.backBorder,
    outer: sil.outer, faceRadius: sil.faceRadius, backMiddleRadius: sil.backMiddleRadius,
    backMiddleR: sil.backMiddleR, backInnerRadius: sil.backInnerRadius, idOnFrame: sil.idOnFrame,
    font: { family: font.family, weight: font.weight, size: font.size, letterSpacing: font.letterSpacing, lineHeight: font.lineHeight }
  };
}

/* ── small icon helpers ────────────────────────────────────────── */
function DownloadIcon({ size = 18, className = '' }) {
  return (
    <svg className={className} viewBox="0 0 16 16" width={size} height={size} fill="none">
      <path d="M8 2v8m0 0l-3-3m3 3l3-3M3 13h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>);

}
function CheckIcon({ size = 14 }) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} fill="none">
      <path d="M3 8.5l3 3 6.5-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>);

}
function ChevronDownIcon({ size = 12, className = '' }) {
  return (
    <svg className={className} viewBox="0 0 12 12" width={size} height={size} fill="none">
      <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>);

}
function PrintIcon({ size = 14 }) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} fill="none">
      <path d="M4 6V2h8v4M4 12H2.5a.5.5 0 0 1-.5-.5v-5a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 .5.5v5a.5.5 0 0 1-.5.5H12M4 9v5h8V9H4z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round" />
    </svg>);

}
function MailIcon({ size = 16 }) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} fill="none">
      <rect x="2" y="3.5" width="12" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M2.6 4.6L8 8.6l5.4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>);

}
function SparkleIcon({ size = 14 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
      <path d="M9 2.6c.16-.5.86-.5 1.02 0l1.06 3.24a2.6 2.6 0 0 0 1.66 1.66l3.24 1.06c.5.16.5.86 0 1.02l-3.24 1.06a2.6 2.6 0 0 0-1.66 1.66l-1.06 3.24c-.16.5-.86.5-1.02 0l-1.06-3.24a2.6 2.6 0 0 0-1.66-1.66L2.74 9.58c-.5-.16-.5-.86 0-1.02l3.24-1.06A2.6 2.6 0 0 0 7.64 5.84L9 2.6Z" />
      <path d="M18 13.4c.1-.32.56-.32.66 0l.46 1.4c.1.3.33.53.63.63l1.4.46c.32.1.32.56 0 .66l-1.4.46c-.3.1-.53.33-.63.63l-.46 1.4c-.1.32-.56.32-.66 0l-.46-1.4a1 1 0 0 0-.63-.63l-1.4-.46c-.32-.1-.32-.56 0-.66l1.4-.46c.3-.1.53-.33.63-.63l.46-1.4Z" />
    </svg>);

}

/* ── form controls (Framer-style, matches Signature Creator) ───── */
function PropSection({ title, children }) {
  return (
    <section className="prop-section">
      <header className="prop-section-head">
        <h3>{title}</h3>
      </header>
      <div className="prop-rows">{children}</div>
    </section>);

}

function PropRow({ label, children, align = 'center', error = false }) {
  return (
    <div className={`prop-row prop-row--${align}${error ? ' prop-row--error' : ''}`}>
      <span className="prop-label">{label}</span>
      <div className="prop-control">{children}</div>
    </div>);

}

function PropInput({ value, onChange, placeholder, type = 'text', mono = false, readOnly = false, error = false }) {
  return (
    <input
      className={`prop-input${mono ? ' mono' : ''}${error ? ' is-error' : ''}`}
      type={type}
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      spellCheck={false}
      readOnly={readOnly} />);


}

/* PrefixInput — a prop-input that renders a fixed, non-editable prefix
   chip inside the input shell. Used for the ID code field so it always
   starts with "DL". The parent stores the full string (prefix + suffix);
   we strip the prefix when displaying and prepend it on every change. */
function PrefixInput({ value, onChange, prefix, placeholder, mono = false, error = false }) {
  const stripped = (value || '').toUpperCase().startsWith(prefix.toUpperCase()) ?
  (value || '').slice(prefix.length) :
  value || '';
  return (
    <div className={`prop-input prop-input-prefix${mono ? ' mono' : ''}${error ? ' is-error' : ''}`}>
      <span className="prop-input-prefix-tag" aria-hidden="true">{prefix}</span>
      <input
        type="text"
        value={stripped}
        onChange={(e) => onChange(prefix + e.target.value.replace(/^\s+/, ''))}
        placeholder={placeholder}
        spellCheck={false} />
      
    </div>);

}

/* PhoneInput — a phone-number field with an EDITABLE country code and a
   10-digit (numbers-only) subscriber number. The parent stores the full
   "+CC XXXXXXXXXX" string; we split it into the two inputs and rejoin on
   every change. */
function PhoneInput({ value, onChange, placeholder = '1234567890', error = false }) {
  const raw = value || '';
  const sp = raw.indexOf(' ');
  let code = sp >= 0 ? raw.slice(0, sp) : raw.startsWith('+') ? raw : '+91';
  let number = sp >= 0 ? raw.slice(sp + 1) : raw.startsWith('+') ? '' : raw;
  code = '+' + code.replace(/[^\d]/g, '').slice(0, 4);
  number = number.replace(/\D/g, '').slice(0, 10);
  const commit = (c, n) => {
    const cc = c && c !== '+' ? c : '+91';
    onChange(n ? `${cc} ${n}` : `${cc} `);
  };
  return (
    <div className={`prop-input prop-input-prefix prop-input-phone${error ? ' is-error' : ''}`}>
      <input
        className="prop-phone-code"
        type="tel"
        inputMode="numeric"
        value={code}
        aria-label="Country code"
        onChange={(e) => commit('+' + e.target.value.replace(/[^\d]/g, '').slice(0, 4), number)}
        spellCheck={false} />
      <input
        className="prop-phone-number"
        type="tel"
        inputMode="numeric"
        maxLength={10}
        value={number}
        onChange={(e) => commit(code, e.target.value.replace(/\D/g, '').slice(0, 10))}
        placeholder={placeholder}
        spellCheck={false} />
      
    </div>);

}

function PropTextarea({ value, onChange, placeholder, rows = 3, readOnly = false, error = false }) {
  return (
    <textarea
      className={`prop-input prop-textarea${error ? ' is-error' : ''}`}
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      spellCheck={false}
      readOnly={readOnly} />);


}

/* LockableField — wraps an input/textarea and renders a small lock
   chip top-right. Default state is locked: the underlying control is
   readOnly and visually dimmed. Hovering the chip expands it to show
   "Unlock"; clicking it opens an inline confirm popover so the user
   has to deliberately opt in to editing this field. */
function LockableField({ locked, onUnlock, children }) {
  const [confirming, setConfirming] = useState(false);
  const popRef = useRef(null);

  useEffect(() => {
    if (!confirming) return undefined;
    const onDoc = (e) => {
      if (popRef.current && !popRef.current.contains(e.target)) setConfirming(false);
    };
    const onKey = (e) => {if (e.key === 'Escape') setConfirming(false);};
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [confirming]);

  const isTextarea = children && children.type === PropTextarea;
  const child = React.cloneElement(children, { readOnly: locked });

  return (
    <div className={`lockable-field${locked ? ' is-locked' : ''}${isTextarea ? ' is-textarea' : ''}`}>
      {child}
      {locked &&
      <button
        type="button"
        className="lock-chip"
        onClick={() => setConfirming(true)}
        aria-label="Locked — click to unlock"
        title="Click to unlock">
        
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <rect x="2.5" y="5.5" width="7" height="5" rx="1" stroke="currentColor" strokeWidth="1.2" />
            <path d="M4 5.5V4a2 2 0 1 1 4 0v1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
          <span className="lock-chip-label">Click to unlock</span>
        </button>
      }
      {confirming &&
      <div className="lock-confirm-popover" role="dialog" ref={popRef}>
          <div className="lock-confirm-text">
            Allow editing this field? Most users shouldn't need to change it.
          </div>
          <div className="lock-confirm-actions">
            <button
            type="button"
            className="lock-confirm-no"
            onClick={() => setConfirming(false)}>
            
              Cancel
            </button>
            <button
            type="button"
            className="lock-confirm-yes"
            onClick={() => {onUnlock();setConfirming(false);}}>
            
              Yes, unlock
            </button>
          </div>
        </div>
      }
    </div>);

}

function PropSlider({ value, onChange, min, max, step = 1, onActiveChange }) {
  const setActive = (active) => {if (onActiveChange) onActiveChange(active);};
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
        onFocus={() => setActive(true)}
        onBlur={() => setActive(false)}
        min={min}
        max={max} />
      
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        onPointerDown={() => setActive(true)}
        onPointerUp={() => setActive(false)}
        onPointerCancel={() => setActive(false)}
        onFocus={() => setActive(true)}
        onBlur={() => setActive(false)} />
      
    </div>);

}

/* PropYesNo — Yes/No segmented control. Used for boolean toggles like
   "Polish photo". Pass a disabled flag to lock both buttons (e.g. while
   the model is still processing). */
function PropYesNo({ value, onChange, disabled = false, yesLabel = 'On', noLabel = 'Off' }) {
  return (
    <div className="prop-segmented" role="tablist">
      <button
        type="button"
        className={value ? 'active' : ''}
        onClick={() => !disabled && onChange(true)}
        disabled={disabled} style={{ textAlign: "left" }}>
        
        {yesLabel}
      </button>
      <button
        type="button"
        className={!value ? 'active' : ''}
        onClick={() => !disabled && onChange(false)}
        disabled={disabled} style={{ textAlign: "left" }}>
        
        {noLabel}
      </button>
    </div>);

}

/* ── photo dropzone ─────────────────────────────────────────────── */
function processPhotoFile(file, onPhoto) {
  if (!file) return;
  const fr = new FileReader();
  fr.onload = () => {
    const img = new Image();
    img.onload = () => {
      const MAX = 800;
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

function PhotoDropzone({ photoUrl, photoName, onPhoto, onClear, error = false }) {
  const inputRef = useRef(null);
  return (
    <div className={`dropzone${error ? ' is-error' : ''}`}>
      {photoUrl ?
      <div className="thumb" style={{ backgroundImage: `url(${photoUrl})` }} aria-label="Current photo" /> :

      <div className="thumb empty" aria-hidden>+</div>
      }
      <div className="copy">
        <div className="name">
          {photoName || (photoUrl ? 'Custom photo' : 'Upload a photo')}
        </div>
        <div className="hint">
          {photoUrl ? 'Click to replace' : 'PNG or JPG, 400×500+ ideal'}
        </div>
      </div>
      {photoUrl &&
      <button
        type="button"
        className="clear"
        onClick={(e) => {
          e.stopPropagation();
          onClear();
          if (inputRef.current) inputRef.current.value = '';
        }}>
        
          Clear
        </button>
      }
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={(e) => {
          const f = e.target.files && e.target.files[0];
          if (f) processPhotoFile(f, onPhoto);
        }} />
      
    </div>);

}

/* ── Card framed in the preview, with a caption ────────────────── */
function CardFrame({ caption, children }) {
  return (
    <div className="card-frame">
      <div className="card-scale-wrap">
        <div className="card-scale" style={{ width: "204px", height: "356px" }}>{children}</div>
      </div>
      <div className="card-caption">{caption}</div>
    </div>);

}

/* ── Export helpers ─────────────────────────────────────────────── */
/* Capture a card node as a high-DPI PNG via html-to-image. The
   card's native size is 204×324; we render at 4× to land roughly at
   print resolution (~300dpi for an ID-card-sized print). */
async function captureCardPng(node, pixelRatio = 4) {
  if (!node || !window.htmlToImage) throw new Error('html-to-image not loaded');
  return window.htmlToImage.toPng(node, {
    pixelRatio,
    cacheBust: true,
    backgroundColor: null,
    filter: (n) => !(n && n.getAttribute && n.getAttribute('data-export-hide') === 'true')
  });
}

/* EmailJS — fill these in from your EmailJS dashboard to enable true
   one-click sending (attachments delivered automatically). Until all
   three are set, "Send via email" falls back to opening a prefilled
   draft + downloading the files to attach manually.
     Account → API keys → Public Key
     Email Services → your service → Service ID
     Email Templates → your template → Template ID
   The template must define the params used below and 3 dynamic
   attachments (see EMAILJS_SETUP.md). */
const EMAILJS_CONFIG = {
  publicKey: 'YOUR_PUBLIC_KEY',
  serviceId: 'YOUR_SERVICE_ID',
  templateId: 'YOUR_TEMPLATE_ID'
};
function emailjsConfigured() {
  const c = EMAILJS_CONFIG;
  return !!(c.publicKey && c.serviceId && c.templateId) &&
  !c.publicKey.startsWith('YOUR_') && !c.serviceId.startsWith('YOUR_') && !c.templateId.startsWith('YOUR_') &&
  !!window.emailjs;
}
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result).split(',')[1] || '');
    fr.onerror = reject;
    fr.readAsDataURL(blob);
  });
}

function downloadDataUrl(dataUrl, filename) {
  // Large 4× PNGs make for very long data: URLs, which several browsers
  // refuse to download from an anchor. Convert to a Blob URL — far more
  // reliable — and fall back to the raw data URL only if conversion fails.
  let href = dataUrl;
  let revoke = null;
  if (typeof dataUrl === 'string' && dataUrl.slice(0, 5) === 'data:') {
    try {
      const mime = (dataUrl.match(/^data:([^;,]+)/) || [])[1] || 'application/octet-stream';
      const blob = dataUrlToFile(dataUrl, filename, mime);
      href = URL.createObjectURL(blob);
      revoke = href;
    } catch (e) {

      /* fall back to the data URL */}
  }
  const a = document.createElement('a');
  a.href = href;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  if (revoke) setTimeout(() => URL.revokeObjectURL(revoke), 4000);
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/* ── Minimal store-only ZIP writer (no dependency) ──────────────────
   Bundling the two card PNGs into a single archive makes their exact
   filenames part of the ZIP's central directory — they can no longer
   be stripped by a sandboxed download context, which is what was
   renaming the loose PNGs to a generic title. */
function crc32(bytes) {
  if (!crc32.table) {
    const t = [];
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ c >>> 1 : c >>> 1;
      t[n] = c >>> 0;
    }
    crc32.table = t;
  }
  const t = crc32.table;
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) crc = t[(crc ^ bytes[i]) & 0xff] ^ crc >>> 8;
  return (crc ^ 0xffffffff) >>> 0;
}

function dataUrlToBytes(dataUrl) {
  const bin = atob(dataUrl.split(',')[1]);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

function buildZipBlob(files) {
  const enc = new TextEncoder();
  const u16 = (n) => [n & 0xff, n >>> 8 & 0xff];
  const u32 = (n) => [n & 0xff, n >>> 8 & 0xff, n >>> 16 & 0xff, n >>> 24 & 0xff];
  const chunks = [];
  const central = [];
  let offset = 0;
  files.forEach((f) => {
    const nameBytes = enc.encode(f.name);
    const crc = crc32(f.bytes);
    const size = f.bytes.length;
    const local = [].concat(
      u32(0x04034b50), u16(20), u16(0), u16(0), u16(0), u16(0),
      u32(crc), u32(size), u32(size), u16(nameBytes.length), u16(0));
    chunks.push(new Uint8Array(local), nameBytes, f.bytes);
    const cd = [].concat(
      u32(0x02014b50), u16(20), u16(20), u16(0), u16(0), u16(0), u16(0),
      u32(crc), u32(size), u32(size), u16(nameBytes.length), u16(0), u16(0),
      u16(0), u16(0), u32(0), u32(offset));
    central.push({ header: new Uint8Array(cd), name: nameBytes });
    offset += local.length + nameBytes.length + size;
  });
  const cdStart = offset;
  let cdSize = 0;
  central.forEach((c) => {
    chunks.push(c.header, c.name);
    cdSize += c.header.length + c.name.length;
  });
  const end = [].concat(
    u32(0x06054b50), u16(0), u16(0), u16(files.length), u16(files.length),
    u32(cdSize), u32(cdStart), u16(0));
  chunks.push(new Uint8Array(end));
  return new Blob(chunks, { type: 'application/zip' });
}

/* Trigger a download of `blob` as `filename` inside an already-open
   top-level window `win` (opened synchronously on the user gesture so
   it isn't popup-blocked). Falls back to an in-frame download. */
function finishBlobDownload(win, blob, filename, note) {
  const url = URL.createObjectURL(blob);
  if (win && !win.closed) {
    const html = `<!doctype html>
<html><head><meta charset="utf-8" /><title>${filename}</title>
<style>
  html,body{margin:0;height:100%;font-family:'Inter',system-ui,sans-serif;background:#f3f4f6;color:#374151;}
  .wrap{min-height:100%;display:flex;flex-direction:column;gap:16px;align-items:center;justify-content:center;text-align:center;padding:32px;}
  a.dl{font-size:13px;font-weight:600;text-decoration:none;color:#fff;background:#0070ff;padding:11px 18px;border-radius:10px;}
  a.dl:hover{background:#0061e0;}
  .hint{font-size:13px;color:#6b7280;max-width:360px;line-height:1.5;}
</style></head>
<body><div class="wrap">
  <div class="hint">${note || 'Your download should start automatically. If it does not start, use the button below.'}</div>
  <a class="dl" id="dl" href="${url}" download="${filename}">Download ${filename}</a>
</div>
<script>
  window.addEventListener('load', function(){ setTimeout(function(){ document.getElementById('dl').click(); }, 200); });
<\/script>
</body></html>`;
    win.document.open();
    win.document.write(html);
    win.document.close();
  } else {
    downloadBlob(blob, filename);
  }
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

/* Convert a data-URL (from html-to-image) into a File so it can be
   handed to the Web Share API or downloaded as a real attachment. */
function dataUrlToFile(dataUrl, filename, type) {
  const arr = dataUrl.split(',');
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8 = new Uint8Array(n);
  while (n--) u8[n] = bstr.charCodeAt(n);
  return new File([u8], filename, { type });
}

/* Build a real PDF Blob (via jsPDF) with the selected card sides laid
   out at standard CR80 print size. Returns null if jsPDF is missing. */
function buildPdfBlob(frontPng, backPng) {
  const jsPDFCtor = window.jspdf && window.jspdf.jsPDF;
  if (!jsPDFCtor) return null;
  const doc = new jsPDFCtor({ unit: 'mm', format: 'a4' });
  const cw = 54;
  const ch = 85.6;
  const gap = 16;
  const y = 30;
  const imgs = [];
  if (frontPng) imgs.push({ png: frontPng, label: 'Front' });
  if (backPng) imgs.push({ png: backPng, label: 'Back' });
  const totalW = imgs.length * cw + Math.max(0, imgs.length - 1) * gap;
  let x = (210 - totalW) / 2;
  imgs.forEach(({ png, label }) => {
    doc.addImage(png, 'PNG', x, y, cw, ch);
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text(label, x + cw / 2, y + ch + 6, { align: 'center' });
    x += cw + gap;
  });
  doc.setFontSize(8);
  doc.setTextColor(160);
  doc.text(
    'Standard ID card size — 54 × 85.6 mm (CR80). Print at 100% scale.',
    105,
    y + ch + 18,
    { align: 'center' }
  );
  return doc.output('blob');
}

/* ── Form completeness validation ───────────────────────────────── */
/* A card may only be downloaded / emailed once the user has replaced
   the sample placeholder data with their own details. A field counts
   as "not updated" if it's empty or still equal to the sample default.
   Office address + entity (locked, correct-by-default) and blood group
   ("O+" is a valid value to leave as-is) are intentionally excluded. */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REQUIRED_TEXT_FIELDS = ['name', 'title', 'employeeId', 'mobile', 'emergencyContact'];
function computeInvalidFields(data, photoUrl) {
  const inv = {};
  REQUIRED_TEXT_FIELDS.forEach((k) => {
    const v = (data[k] || '').trim();
    if (!v || v === String(DEFAULTS[k] || '').trim()) inv[k] = true;
  });
  const email = (data.email || '').trim();
  if (!email || email === DEFAULTS.email || !EMAIL_RE.test(email)) inv.email = true;
  // Phone fields need a complete 10-digit number (the editable country
  // code aside). An empty or short number is invalid.
  ['mobile', 'emergencyContact'].forEach((k) => {
    const v = (data[k] || '').trim();
    const sp = v.indexOf(' ');
    const number = (sp >= 0 ? v.slice(sp + 1) : '').replace(/\D/g, '');
    if (number.length !== 10) inv[k] = true;
  });
  if (!photoUrl || photoUrl === DEFAULT_PHOTO) inv.photo = true;
  return inv;
}

/* Open the captured PNG(s) in a new top-level window and trigger their
   download there. The embedded preview sandbox blocks anchor-downloads
   inside the app frame, but a freshly window.open()'d document is a
   normal top-level context where downloads work (same trick the PDF
   path relies on). The page also shows the images with manual
   "Download" buttons as a fallback. Returns false if the popup was
   blocked so the caller can fall back to an in-frame download. */
function openImagesForDownload(items) {
  const win = window.open('', '_blank');
  if (!win) return false;
  const blocks = items.map((it, i) => `
      <figure class="card-block">
        <img src="${it.dataUrl}" alt="${it.label}" />
        <a class="dl" id="dl${i}" href="${it.dataUrl}" download="${it.filename}">Download ${it.label} PNG</a>
      </figure>`).join('\n');
  const payload = JSON.stringify(items.map((it) => ({ dataUrl: it.dataUrl, filename: it.filename })));
  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Gushwork ID card — PNG</title>
    <style>
      * { box-sizing: border-box; }
      html, body { margin: 0; background: #f3f4f6; font-family: 'Inter', system-ui, sans-serif; color: #111827; }
      .page { min-height: 100vh; display: flex; flex-direction: column; align-items: center; gap: 28px; padding: 48px 24px; }
      .hint { font-size: 13px; color: #6b7280; text-align: center; max-width: 420px; line-height: 1.5; }
      .row { display: flex; gap: 40px; flex-wrap: wrap; justify-content: center; }
      .card-block { display: flex; flex-direction: column; align-items: center; gap: 14px; }
      .card-block img { width: 240px; height: auto; border-radius: 10px; box-shadow: 0 10px 30px -10px rgba(15,17,22,0.3); display: block; }
      a.dl {
        font-size: 13px; font-weight: 600; text-decoration: none;
        color: #fff; background: #0070ff; padding: 10px 16px; border-radius: 10px;
      }
      a.dl:hover { background: #0061e0; }
    </style>
  </head>
  <body>
    <div class="page">
      <div class="hint">Your ID card download should start automatically. If it doesn't, use the buttons below.</div>
      <div class="row">
        ${blocks}
      </div>
    </div>
    <script>
      var ITEMS = ${payload};
      // Download via a Blob URL (not the raw data: URL) so the browser
      // honors the exact "download" filename — data: URLs are frequently
      // ignored and fall back to the document title.
      function dataUrlToBlob(u) {
        var parts = u.split(',');
        var mime = (parts[0].match(/:([^;,]+)/) || [])[1] || 'image/png';
        var bin = atob(parts[1]);
        var n = bin.length;
        var arr = new Uint8Array(n);
        while (n--) arr[n] = bin.charCodeAt(n);
        return new Blob([arr], { type: mime });
      }
      function saveItem(it) {
        try {
          var url = URL.createObjectURL(dataUrlToBlob(it.dataUrl));
          var a = document.createElement('a');
          a.href = url; a.download = it.filename;
          document.body.appendChild(a); a.click(); a.remove();
          setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
        } catch (e) {
          var f = document.querySelector('a.dl');
          if (f) f.click();
        }
      }
      // Keep the visible fallback buttons working with the right filename too.
      window.addEventListener('load', function () {
        document.querySelectorAll('a.dl').forEach(function (a, i) {
          a.addEventListener('click', function (ev) {
            if (a.dataset.blob) return; // already a blob URL
            ev.preventDefault();
            var it = ITEMS[i]; if (!it) return;
            var url = URL.createObjectURL(dataUrlToBlob(it.dataUrl));
            a.href = url; a.dataset.blob = '1'; a.click();
          });
        });
        ITEMS.forEach(function (it, i) { setTimeout(function () { saveItem(it); }, 200 + i * 600); });
      });
    </script>
  </body>
</html>`;
  win.document.open();
  win.document.write(html);
  win.document.close();
  return true;
}

/* Open the captured PDF in a new top-level window and trigger its
   download there with an exact filename. Same sandbox-safe trick as
   openImagesForDownload — the embedded preview blocks in-frame anchor
   downloads, but a freshly window.open()'d document is a normal
   top-level context. Returns false if the popup was blocked. */
function openPdfForDownload(pdfDataUrl, filename) {
  const win = window.open('', '_blank');
  if (!win) return false;
  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${filename}</title>
    <style>
      * { box-sizing: border-box; }
      html, body { margin: 0; height: 100%; background: #525659; font-family: 'Inter', system-ui, sans-serif; color: #fff; }
      .bar { position: fixed; top: 0; left: 0; right: 0; display: flex; align-items: center; justify-content: center; gap: 14px; padding: 12px; background: rgba(13,13,13,0.6); backdrop-filter: blur(4px); z-index: 2; }
      .bar .hint { font-size: 13px; color: #d1d5db; }
      a.dl { font-size: 13px; font-weight: 600; text-decoration: none; color: #fff; background: #0070ff; padding: 9px 16px; border-radius: 10px; }
      a.dl:hover { background: #0061e0; }
      iframe { position: absolute; inset: 52px 0 0 0; width: 100%; height: calc(100% - 52px); border: 0; background: #525659; }
    </style>
  </head>
  <body>
    <div class="bar">
      <span class="hint">Your PDF download should start automatically.</span>
      <a class="dl" id="dl" href="${pdfDataUrl}" download="${filename}">Download PDF</a>
    </div>
    <iframe src="${pdfDataUrl}"></iframe>
    <script>
      var FILENAME = ${JSON.stringify(filename)};
      function dataUrlToBlob(u) {
        var parts = u.split(',');
        var mime = (parts[0].match(/:([^;,]+)/) || [])[1] || 'application/pdf';
        var bin = atob(parts[1]);
        var n = bin.length;
        var arr = new Uint8Array(n);
        while (n--) arr[n] = bin.charCodeAt(n);
        return new Blob([arr], { type: mime });
      }
      window.addEventListener('load', function () {
        var a = document.getElementById('dl');
        try {
          // Blob URL so the browser honors the exact filename (data: URLs
          // are often ignored in favor of the document title).
          var url = URL.createObjectURL(dataUrlToBlob(a.getAttribute('href')));
          a.href = url; a.download = FILENAME;
        } catch (e) { /* keep the data: URL fallback */ }
        setTimeout(function () { a.click(); }, 300);
      });
    </script>
  </body>
</html>`;
  win.document.open();
  win.document.write(html);
  win.document.close();
  return true;
}

/* Render both cards on a print-friendly page and trigger the
   browser's Save-as-PDF dialog. The hidden iframe technique keeps
   the main app DOM intact. */
function openPrintForPdf(frontPng, backPng, docTitle) {
  const blocks = [
  frontPng && `<div class="card-block"><div class="card"><img src="${frontPng}" alt="Front" /></div><div class="label">Front</div></div>`,
  backPng && `<div class="card-block"><div class="card"><img src="${backPng}" alt="Back" /></div><div class="label">Back</div></div>`].
  filter(Boolean).join('\n');
  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${docTitle || 'Gushwork ID Card'}</title>
    <style>
      @page { size: A4; margin: 12mm; }
      * { box-sizing: border-box; }
      html, body { margin: 0; padding: 0; background: #fff; font-family: 'Inter', system-ui, sans-serif; }
      .page {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 18mm;
        padding-top: 14mm;
      }
      .row { display: flex; gap: 16mm; align-items: flex-start; }
      .card-block { display: flex; flex-direction: column; align-items: center; gap: 6mm; }
      /* Standard ID card print size: 54mm × 85.6mm portrait. */
      .card { width: 54mm; height: 85.6mm; }
      .card img { width: 100%; height: 100%; display: block; border-radius: 2.1mm; }
      .label {
        font-size: 9pt;
        font-weight: 500;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: #6b7280;
      }
      .footnote {
        margin-top: 8mm;
        font-size: 8pt;
        color: #9ca3af;
      }
    </style>
  </head>
  <body>
    <div class="page">
      <div class="row">
        ${blocks}
      </div>
      <div class="footnote">Standard ID card size — 54 × 85.6 mm (CR80). Print at 100% scale.</div>
    </div>
    <script>
      window.addEventListener('load', () => {
        // small delay so the images decode before the print dialog opens
        setTimeout(() => { window.focus(); window.print(); }, 250);
      });
    </script>
  </body>
</html>`;
  const w = window.open('', '_blank');
  if (!w) return;
  w.document.open();
  w.document.write(html);
  w.document.close();
}

/* ── Main App ───────────────────────────────────────────────────── */
function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const cardTheme = buildCardTheme(t);
  const [data, setData] = useState(DEFAULTS);
  const [photoUrl, setPhotoUrl] = useState(DEFAULT_PHOTO);
  const [photoName, setPhotoName] = useState('Default photo');
  const [photoXform, setPhotoXform] = useState({ x: 50, y: 30, zoom: 100, grayscale: false });
  // Photo polish (background removal) — derived display URL is
  // `polishOn && polishedUrl ? polishedUrl : photoUrl`. We keep the
  // original photoUrl untouched so the user can toggle back instantly.
  const [polishOn, setPolishOn] = useState(false);
  const [polishedUrl, setPolishedUrl] = useState(null);
  const [polishState, setPolishState] = useState('idle'); // 'idle' | 'loading' | 'error'
  const [polishProgress, setPolishProgress] = useState(0);
  // Briefly show a "Background removed" confirmation, then auto-hide it.
  const [polishJustDone, setPolishJustDone] = useState(false);
  // Locked back-card fields — Office address and Entity are sensitive
  // company data, so we keep them readOnly behind an explicit unlock
  // confirmation. Defaults are correct for almost every Gushwork
  // employee; only HR/admins should be changing these.
  const [locked, setLocked] = useState({ officeAddress: true, companyName: true });
  const [exportState, setExportState] = useState('idle'); // 'idle' | 'working' | 'ok' | 'sent' | 'err' | 'invalid'
  const [actionKind, setActionKind] = useState(null); // 'download' | 'email' — which button is showing feedback
  const [menuOpen, setMenuOpen] = useState(false);
  // Email send popover (recipient + optional CC) state.
  const [emailMenuOpen, setEmailMenuOpen] = useState(false);
  const [ccEmail, setCcEmail] = useState('');
  // Reveal field-level + button error states once the user has tried to
  // export with incomplete details. Stays on until everything is valid.
  const [showErrors, setShowErrors] = useState(false);
  // Show composition guides over the photo while the user is actively
  // adjusting it. Driven by slider focus / pointer state — guides
  // disappear the instant the user releases the slider or tabs away.
  const [showPhotoGuides, setShowPhotoGuides] = useState(false);
  const menuRef = useRef(null);
  const emailMenuRef = useRef(null);

  const frontRef = useRef(null);
  const backRef = useRef(null);

  const update = useCallback((patch) => setData((d) => ({ ...d, ...patch })), []);

  /* Run the bg-removal pipeline on the current photoUrl and stash the
     polished version in state. Safe to call repeatedly — it bails if
     no photo is loaded. */
  const runPolish = useCallback(async (sourceUrl) => {
    if (!sourceUrl || !window.PhotoPolish) return;
    setPolishState('loading');
    setPolishProgress(0);
    try {
      const out = await window.PhotoPolish.process(sourceUrl, (_key, current, total) => {
        if (total > 0) setPolishProgress(Math.round(current / total * 100));
      });
      // process() now returns { url, xform }: the full-subject cutout plus
      // a default transform that frames the head. Keeping the whole body
      // in the image means zooming out reveals the rest, not erased pixels.
      const polished = out && out.url ? out : { url: out, xform: { x: 50, y: 50, zoom: 100, grayscale: false } };
      setPolishedUrl(polished.url);
      setPhotoXform(polished.xform);
      setPolishState('idle');
      setPolishProgress(100);
      // Flash the "Background removed" confirmation, then fade it out.
      setPolishJustDone(true);
      setTimeout(() => setPolishJustDone(false), 2200);
    } catch (e) {
      console.error('Polish failed', e);
      setPolishState('error');
      setPolishProgress(0);
    }
  }, []);

  /* Toggle handler — switching ON kicks off processing if we don't
     already have a polished version cached for the current source.
     Switching OFF simply flips the flag; the polished version stays
     in memory so re-enabling is instant. */
  const handlePolishToggle = useCallback(
    (on) => {
      setPolishOn(on);
      if (on && !polishedUrl && photoUrl) {
        runPolish(photoUrl);
      }
    },
    [polishedUrl, photoUrl, runPolish]
  );

  /* When a new photo is uploaded, drop the cached polished version and
     turn Polish off — the user explicitly chose a new source image and
     should re-opt-in to background removal each time. */
  const handleNewPhoto = useCallback(
    (url, name) => {
      setPhotoUrl(url);
      setPhotoName(name);
      setPolishedUrl(null);
      setPolishState('idle');
      setPolishProgress(0);
      setPolishOn(false);
    },
    []
  );

  // The photo actually rendered on the card — polished if the user
  // has the toggle on and processing has completed.
  const displayPhotoUrl = polishOn && polishedUrl ? polishedUrl : photoUrl;

  // Which fields are still untouched sample data (or invalid). Recomputed
  // every render so error highlights clear the instant a field is fixed.
  const invalidFields = computeInvalidFields(data, photoUrl);
  const isComplete = Object.keys(invalidFields).length === 0;
  const errFor = (k) => showErrors && !!invalidFields[k];

  // Gate every export action: if details are incomplete, flash the
  // button error state, reveal field highlights, and block the action.
  const guardComplete = useCallback(() => {
    if (Object.keys(computeInvalidFields(data, photoUrl)).length === 0) return true;
    setShowErrors(true);
    setMenuOpen(false);
    setExportState('invalid');
    setTimeout(() => setExportState((s) => s === 'invalid' ? 'idle' : s), 2600);
    return false;
  }, [data, photoUrl]);

  // Derive the back-card field list from individual data fields so the
  // renderer stays generic.
  const backFields = [];
  if (data.bloodGroup) backFields.push({ label: 'Blood Group', value: data.bloodGroup });
  if (data.emergencyContact) backFields.push({ label: 'Emergency Contact', value: data.emergencyContact });
  const cardData = { ...data, backFields };

  // close the export menu on outside-click / escape
  useEffect(() => {
    if (!menuOpen) return undefined;
    const onDoc = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    const onKey = (e) => {if (e.key === 'Escape') setMenuOpen(false);};
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  // close the email popover on outside-click / escape
  useEffect(() => {
    if (!emailMenuOpen) return undefined;
    const onDoc = (e) => {
      if (emailMenuRef.current && !emailMenuRef.current.contains(e.target)) setEmailMenuOpen(false);
    };
    const onKey = (e) => {if (e.key === 'Escape') setEmailMenuOpen(false);};
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [emailMenuOpen]);

  const filenameSlug = useCallback(() => {
    const nameSlug = (data.name || 'id').
    toLowerCase().
    replace(/[^a-z0-9]+/g, '-').
    replace(/^-+|-+$/g, '') || 'id';
    return `gw-${nameSlug}`;
  }, [data.name]);

  // Download both card sides bundled into a single ZIP. Bundling keeps
  // the exact per-file names ("…-id-front.png" / "…-id-back.png") intact
  // even when a sandboxed download context would strip a loose file's
  // name. A single download triggers in-frame — no new window needed.
  const doDownloadPng = useCallback(async () => {
    setActionKind('download');
    if (!guardComplete()) return;
    setExportState('working');
    try {
      const slug = filenameSlug();
      const files = [];
      if (frontRef.current) {
        const front = await captureCardPng(frontRef.current);
        files.push({ name: `${slug}-id-front.png`, bytes: dataUrlToBytes(front) });
      }
      if (backRef.current) {
        const back = await captureCardPng(backRef.current);
        files.push({ name: `${slug}-id-back.png`, bytes: dataUrlToBytes(back) });
      }
      const zipBlob = buildZipBlob(files);
      downloadBlob(zipBlob, `${slug}-id.zip`);
      setExportState('ok');
    } catch (e) {
      console.error(e);
      setExportState('err');
    }
    setTimeout(() => setExportState('idle'), 2200);
    setMenuOpen(false);
  }, [filenameSlug, guardComplete]);

  // Open a print sheet (Save as PDF) with both card sides.
  const doDownloadPdf = useCallback(async () => {
    setActionKind('download');
    if (!guardComplete()) return;
    setExportState('working');
    try {
      const front = frontRef.current ? await captureCardPng(frontRef.current) : null;
      const back = backRef.current ? await captureCardPng(backRef.current) : null;
      // Build a real PDF and download it with a deterministic filename so
      // the saved file is always "gw-first-last-id.pdf". A single blob
      // download triggers in-frame — no new window. Fall back to the
      // (correctly-titled) print sheet only if jsPDF is unavailable.
      const pdfBlob = buildPdfBlob(front, back);
      const filename = `${filenameSlug()}-id.pdf`;
      if (pdfBlob) {
        downloadBlob(pdfBlob, filename);
      } else {
        openPrintForPdf(front, back, `${filenameSlug()}-id`);
      }
      setExportState('ok');
    } catch (e) {
      console.error(e);
      setExportState('err');
    }
    setTimeout(() => setExportState('idle'), 2200);
    setMenuOpen(false);
  }, [guardComplete, filenameSlug]);

  // Share the selected sides via email — attaches PNG(s) + a PDF and
  // pre-writes the message. Uses the native share sheet when files can
  // be shared (so the card files come through as attachments); otherwise
  // downloads the attachments and opens a prefilled email to the address
  // entered in the editor panel.
  const doSendEmail = useCallback(async () => {
    setActionKind('email');
    if (!guardComplete()) return;
    setExportState('working');
    setMenuOpen(false);
    setEmailMenuOpen(false);
    const cc = (ccEmail || '').trim();
    try {
      const slug = filenameSlug();
      // Smaller pixel ratio for email so attachments stay well within
      // EmailJS size limits (the print-quality 4× is used for downloads).
      const usingEmailjs = emailjsConfigured();
      const ratio = usingEmailjs ? 3 : 4;
      const frontPng = frontRef.current ? await captureCardPng(frontRef.current, ratio) : null;
      const backPng = backRef.current ? await captureCardPng(backRef.current, ratio) : null;
      const pdfBlob = buildPdfBlob(frontPng, backPng);

      const firstName = (data.name || '').trim().split(/\s+/)[0] || 'there';
      const subject = `Your Gushwork ID card — ${data.name}`;
      const body =
      `Hi ${firstName},

Your Gushwork employee ID card is attached in both PNG and PDF formats.

  •  Name: ${data.name}
  •  Title: ${data.title}
  •  ID code: ${data.employeeId}

For printing, use the PDF and print at 100% scale (standard CR80, 54 × 85.6 mm).

— Gushwork ID Card Creator`;

      // ── True one-click send via EmailJS (when configured) ──────────
      if (usingEmailjs) {
        const params = {
          to_email: data.email,
          to_name: data.name,
          title: data.title,
          id_code: data.employeeId,
          subject,
          message: body,
          cc_email: cc,
          // Dynamic-attachment content params (base64, no data: prefix).
          front_b64: frontPng ? frontPng.split(',')[1] : '',
          back_b64: backPng ? backPng.split(',')[1] : '',
          pdf_b64: pdfBlob ? await blobToBase64(pdfBlob) : '',
          front_name: `${slug}-id-front.png`,
          back_name: `${slug}-id-back.png`,
          pdf_name: `${slug}-id.pdf`
        };
        window.emailjs.init({ publicKey: EMAILJS_CONFIG.publicKey });
        await window.emailjs.send(EMAILJS_CONFIG.serviceId, EMAILJS_CONFIG.templateId, params);
        setExportState('sent');
        setTimeout(() => setExportState((s) => s === 'sent' || s === 'err' ? 'idle' : s), 2600);
        return;
      }

      // ── Fallback: native share (mobile) or prefilled draft + downloads ──
      const files = [];
      if (frontPng) files.push(dataUrlToFile(frontPng, `${slug}-id-front.png`, 'image/png'));
      if (backPng) files.push(dataUrlToFile(backPng, `${slug}-id-back.png`, 'image/png'));
      if (pdfBlob) files.push(new File([pdfBlob], `${slug}-id.pdf`, { type: 'application/pdf' }));

      const fallbackMail = () => {
        // Open a prefilled draft via an anchor click — more reliable than
        // assigning location.href (which sandboxed/embedded frames block).
        const mailto =
        `mailto:${encodeURIComponent(data.email)}` +
        `?subject=${encodeURIComponent(subject)}` + (
        cc ? `&cc=${encodeURIComponent(cc)}` : '') +
        `&body=${encodeURIComponent(body + '\n\n(Your ID card files were just downloaded — attach the PNG and PDF to this email before sending.)')}`;
        const a = document.createElement('a');
        a.href = mailto;
        a.target = '_self';
        document.body.appendChild(a);
        a.click();
        a.remove();
        // Download the attachments so the user can add them to the draft.
        files.forEach((f, i) => setTimeout(() => downloadBlob(f, f.name), 150 + i * 200));
      };

      if (navigator.canShare && files.length && navigator.canShare({ files })) {
        try {
          await navigator.share({ files, title: subject, text: body });
          setExportState('sent');
        } catch (shareErr) {
          if (shareErr && shareErr.name === 'AbortError') {
            setExportState('idle');
            return;
          }
          // Share blocked (e.g. sandboxed iframe) — fall back to mail.
          fallbackMail();
          setExportState('sent');
        }
      } else {
        fallbackMail();
        setExportState('sent');
      }
    } catch (e) {
      if (e && e.name === 'AbortError') {
        setExportState('idle');
      } else {
        console.error(e);
        setExportState('err');
      }
    }
    setTimeout(() => setExportState((s) => s === 'sent' || s === 'err' ? 'idle' : s), 2600);
  }, [guardComplete, filenameSlug, data, ccEmail]);

  // Per-button feedback: only the button whose action is running shows
  // working / done / error state; the other stays on its default label.
  const dlState = actionKind === 'download' ? exportState : 'idle';
  const emailState = actionKind === 'email' ? exportState : 'idle';

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
          <h1>Employee ID Card Generator</h1>
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
              className="form-card-subtitle-icon">
              
              <path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z" />
            </svg>
            <span>Editor Panel</span>
          </p>

          <div className="form">
            {/* Identity — front card top half */}
            <PropSection title="Identity">
              <PropRow label="Name" error={errFor('name')}>
                <PropInput value={data.name} onChange={(v) => update({ name: v })} placeholder="Bruce Wayne" error={errFor('name')} />
              </PropRow>
              <PropRow label="Title" error={errFor('title')}>
                <PropInput value={data.title} onChange={(v) => update({ title: v })} placeholder="Head of Justice League" error={errFor('title')} />
              </PropRow>
              <PropRow label="Email" error={errFor('email')}>
                <PropInput value={data.email} onChange={(v) => update({ email: v })} placeholder="bruce@gushwork.ai" type="email" error={errFor('email')} />
              </PropRow>
              <PropRow label="Mobile" error={errFor('mobile')}>
                <PhoneInput value={data.mobile} onChange={(v) => update({ mobile: v })} placeholder="1234567890" error={errFor('mobile')} />
              </PropRow>
              <PropRow label="ID code" error={errFor('employeeId')}>
                <PrefixInput
                  value={data.employeeId}
                  onChange={(v) => update({ employeeId: v })}
                  prefix="DL"
                  placeholder="89"
                  error={errFor('employeeId')}
                  mono />
                
              </PropRow>
            </PropSection>

            {/* Photo — with zoom / pan / grayscale + AI polish */}
            <PropSection title="Photo">
              <PropRow label="Image" align="start" error={errFor('photo')}>
                <PhotoDropzone
                  photoUrl={photoUrl}
                  photoName={photoName}
                  error={errFor('photo')}
                  onPhoto={(url, name) => handleNewPhoto(url, name)}
                  onClear={() => {
                    setPhotoUrl(null);
                    setPhotoName('');
                    setPhotoXform({ x: 50, y: 40, zoom: 100, grayscale: false });
                    setPolishedUrl(null);
                    setPolishState('idle');
                  }} />
                
              </PropRow>
              <PropRow label={<span className="polish-label"><span>Polish</span><SparkleIcon size={14} /></span>}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, width: '100%' }}>
                  <div className="polish-tip-wrap">
                    <PropYesNo
                      value={polishOn}
                      onChange={handlePolishToggle}
                      disabled={polishState === 'loading' || !photoUrl || photoUrl === DEFAULT_PHOTO}
                      yesLabel="On"
                      noLabel="Off" />
                    <div className="polish-tooltip" role="tooltip">
                      {!photoUrl || photoUrl === DEFAULT_PHOTO ?
                      'Upload your own photo to use Polish — it removes the background and fits the face to the guide.' :
                      'Removes the background and fits the face to the guide. You can fine-tune below.'}
                    </div>
                  </div>
                  
                  {polishState === 'loading' &&
                  <div className="polish-status">
                      <span className="polish-spinner" aria-hidden="true" />
                      <span>
                        {polishProgress > 0 && polishProgress < 100 ?
                      `Processing photo… ${polishProgress}%` :
                      'Loading model… (one-time, ~25MB)'}
                      </span>
                    </div>
                  }
                  {polishState === 'error' &&
                  <div className="polish-status polish-status--error">
                      Polish failed. Try again or switch back to Off.
                    </div>
                  }
                  {polishState === 'idle' && polishOn && polishedUrl && polishJustDone &&
                  <div className="polish-status polish-status--ok">
                      Background removed.
                    </div>
                  }
                </div>
              </PropRow>
              <PropRow label="Zoom">
                <PropSlider
                  value={photoXform.zoom}
                  onChange={(v) => setPhotoXform((p) => ({ ...p, zoom: v }))}
                  onActiveChange={setShowPhotoGuides}
                  min={50}
                  max={250} />
                
              </PropRow>
              <PropRow label="Horizontal">
                <PropSlider
                  value={photoXform.x}
                  onChange={(v) => setPhotoXform((p) => ({ ...p, x: v }))}
                  onActiveChange={setShowPhotoGuides}
                  min={0}
                  max={100} />
                
              </PropRow>
              <PropRow label="Vertical">
                <PropSlider
                  value={photoXform.y}
                  onChange={(v) => setPhotoXform((p) => ({ ...p, y: v }))}
                  onActiveChange={setShowPhotoGuides}
                  min={0}
                  max={100} />
                
              </PropRow>
            </PropSection>

            {/* Back card — emergency info + address */}
            <PropSection title="Back details">
              <PropRow label="Blood group" error={errFor('bloodGroup')}>
                <PropInput value={data.bloodGroup} onChange={(v) => update({ bloodGroup: v })} placeholder="O+" error={errFor('bloodGroup')} />
              </PropRow>
              <PropRow label="Emergency" error={errFor('emergencyContact')}>
                <PhoneInput value={data.emergencyContact} onChange={(v) => update({ emergencyContact: v })} placeholder="1234567890" error={errFor('emergencyContact')} />
              </PropRow>
              <PropRow label="Office" align="start">
                <LockableField
                  locked={locked.officeAddress}
                  onUnlock={() => setLocked((p) => ({ ...p, officeAddress: false }))}>
                  
                  <PropTextarea
                    value={data.officeAddress}
                    onChange={(v) => update({ officeAddress: v })}
                    placeholder="Gushwork, 3rd & 4th Floor, …"
                    rows={4} />
                  
                </LockableField>
              </PropRow>
              <PropRow label="Entity" align="start">
                <LockableField
                  locked={locked.companyName}
                  onUnlock={() => setLocked((p) => ({ ...p, companyName: false }))}>
                  
                  <PropTextarea
                    value={data.companyName}
                    onChange={(v) => update({ companyName: v })}
                    placeholder="Delfin Technologies India Pvt. Ltd."
                    rows={2} />
                  
                </LockableField>
              </PropRow>
            </PropSection>

            {/* Help — contact-for-help row pinned to the bottom of the
                                       editor. Slack DM goes to Utsav for any queries or bug
                                       reports about this tool. */}
            <section className="prop-section help-section" style={{ padding: "20px 16px", gap: "6px" }}>
              <header className="prop-section-head">
                <h3>Hey, need help?</h3>
              </header>
              <div className="help-row">
                <div className="help-copy">
                  For any queries or bug reports, contact{' '}
                  <a
                    className="help-link"
                    href="https://gushwork.slack.com/team/U07PXKWQA1Q"
                    target="_blank"
                    rel="noopener noreferrer">
                    
                    Utsav
                  </a>
                  .
                </div>
              </div>
            </section>
          </div>
        </aside>
      </div>

      {/* ── RIGHT: preview surface ── */}
      <main className="preview-col" style={{ alignItems: "center", padding: "56px 32px 140px" }}>
        <div className="cards-stage">
          <div className="cards-row">
            <CardFrame caption="Front">
              <div ref={frontRef}>
                <IdCardFront
                  data={cardData}
                  photoUrl={displayPhotoUrl}
                  photoXform={photoXform}
                  showGuides={showPhotoGuides}
                  theme={cardTheme}
                  onPickPhoto={(file) => processPhotoFile(file, (url, name) => handleNewPhoto(url, name))} />
                
              </div>
            </CardFrame>
            <CardFrame caption="Back">
              <div ref={backRef}>
                <IdCardBack data={cardData} theme={cardTheme} />
              </div>
            </CardFrame>
          </div>
        </div>
      </main>

      {/* ── floating bottom toolbar ── */}
      <div className="floating-toolbar">
        <div className="tb-pill toolbar-pill" style={{ gap: "40px", padding: "6px 6px 6px 20px" }}>
          <span className="dl-prompt">Looking good? Get your card when you’re ready.</span>
          {/* Send-via-email temporarily removed — handlers retained for re-enable. */}
          <div
            className="download-pill"
            ref={menuRef}
            onMouseEnter={() => setMenuOpen(true)}
            onMouseLeave={() => setMenuOpen(false)}>
            <button
              type="button"
              className={`btn-primary${dlState === 'ok' ? ' copied' : ''}${dlState === 'err' || dlState === 'invalid' ? ' btn-error' : ''}`}
              onClick={() => setMenuOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              disabled={dlState === 'working'}>
              
              {dlState === 'ok' ?
              <><CheckIcon /> Downloaded</> :
              dlState === 'invalid' ?
              <>Details not updated</> :
              dlState === 'working' ?
              <><DownloadIcon size={15} /> Working…</> :

              <><DownloadIcon size={16} /> Download <ChevronDownIcon className="dd-arrow" /></>
              }
            </button>
            {menuOpen &&
            <div className="split-menu download-menu" role="menu">
                <button
                type="button"
                className="split-menu-item"
                role="menuitem"
                onClick={doDownloadPng}>
                  <div className="item-main"><DownloadIcon /> Download as PNG</div>
                  <div className="item-hint">Front &amp; back, zipped</div>
                </button>
                <button
                type="button"
                className="split-menu-item"
                role="menuitem"
                onClick={doDownloadPdf}>
                  <div className="item-main"><PrintIcon /> Download as PDF</div>
                  <div className="item-hint">Front &amp; back on one sheet</div>
                </button>
              </div>
            }
          </div>
        </div>
      </div>

      {/* ── Tweaks panel — three expressive controls that reshape the card ── */}
      <TweaksPanel title="Tweaks">
        <TweakSection label="Mood" />
        <TweakColor
          label="Palette"
          value={(MOODS[t.mood] || MOODS.midnight).swatch}
          options={Object.keys(MOODS).map((k) => MOODS[k].swatch)}
          onChange={(sw) => {
            const key = Object.keys(MOODS).find((k) => MOODS[k].swatch.join() === sw.join());
            if (key) setTweak('mood', key);
          }} />

        <TweakSection label="Silhouette" />
        <TweakRadio
          label="Shape"
          value={(SILHOUETTES[t.silhouette] || SILHOUETTES.swoosh).label}
          options={Object.keys(SILHOUETTES).map((k) => SILHOUETTES[k].label)}
          onChange={(lbl) => {
            const key = Object.keys(SILHOUETTES).find((k) => SILHOUETTES[k].label === lbl);
            if (key) setTweak('silhouette', key);
          }} />

        <TweakSection label="Nameplate" />
        <TweakRadio
          label="Type"
          value={(NAMEPLATES[t.nameplate] || NAMEPLATES.grotesk).label}
          options={Object.keys(NAMEPLATES).map((k) => NAMEPLATES[k].label)}
          onChange={(lbl) => {
            const key = Object.keys(NAMEPLATES).find((k) => NAMEPLATES[k].label === lbl);
            if (key) setTweak('nameplate', key);
          }} />
      </TweaksPanel>
    </div>);

}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);