/* ─────────────────────────────────────────────────────────────────
   The award certificate — the artefact this tool makes.

   Measured from Figma, GW-HR-requests (zHTZS5OtI6Ed4kiASzcTOe), section
   78:51, card 66:3, 5 Oct 2026. A4 portrait at 72 dpi: 595 × 842, which
   is 1 CSS px = 1 pt, so the PDF exporter reads positions straight off
   this DOM.

   Inline styles on purpose: the tool shell must never reach into the
   artefact (gushwork-tools, "the artefact is not the chrome"), and the
   JPG / PSD exporters clone it exactly as drawn.

   Colour: the PRINT palette (Utsav, 5 Oct 2026). Figma draws the frame
   in screen blue #0070FF; the certificate is printed, so it takes
   Brandeis Blue #0072CE / Pantone 285 C, as the ID card does (decisions
   §20). All three exports write it as RGB #0072CE.
   ───────────────────────────────────────────────────────────────── */

const CERT = {
  W: 595, H: 842,
  blue: '#0072CE',            // print palette: Brandeis Blue, Pantone 285 C
  black: '#0D0D0D',           // Flat Black (--gw-color-black)
  panel: '#F7F8F9',           // --gw-color-neutral-25, measured 66:4
  grey: '#4D545C',            // --gw-color-neutral-800, measured 66:8 / 66:11
  // the grid's gradient stops, 10% darker than Figma's #E9EAEE / #F7F8F9 (Utsav, 6 Oct 2026)
  gridIn: '#D2D3D6',          // centre stop
  gridOut: '#DEDFE0',         // outer stop (was the panel colour, so the lines faded out at the edges)
  gridOpacity: 0.7,           // measured 66:5
  panelInset: 10,             // 66:4 at 10,10, 575 × 728, radius 20
  panelW: 575, panelH: 728, panelR: 20,   // as Figma; the page itself (the blue frame) is square
  pad: 40,                    // 79:140 at 40,40 inside the panel, 495 wide
  colW: 495, innerW: 460,     // 66:7 is 460 wide
  gapHead: 80,                // 66:6 → 66:7: 210 tall at 0, next at 290
  gapBody: 40,                // 66:7 item spacing
  gapSig: 10,                 // 66:9 item spacing
  logoX: 40, logoY: 778, logoH: 24,   // 66:12, centred in the 104 blue foot
  // the grid's radial gradient, as Figma exports it (userSpace, panel coords)
  gridGradient: 'translate(437.5 653) rotate(-118.727) scale(586.715 855.769)',
};

/* Static cuts of the brand fonts, so the preview, the JPG/PSD capture and
   the PDF all use the very same files (a PDF cannot embed a variable font
   at a chosen weight). Cut from fonts/*.ttf with fontTools' instancer. */
const CERT_FONT = {
  display: "'Vert Grotesk Display Static', 'Vert Grotesk Display', sans-serif",
  body: "'Inter Static', 'Inter', sans-serif",
  bodySemi: "'Inter Static SemiBold', 'Inter', sans-serif",
  sig: "'Balfontheim', cursive",
};

/* The 20 px lattice: Figma draws it as 1073 stroked 20 × 20 cells, rotated
   −90°, so the lines fall on every multiple of 20 across the panel. */
function gridPath() {
  let d = '';
  for (let x = 0; x <= 580; x += 20) d += `M${x} 0V740`;
  for (let y = 0; y <= 740; y += 20) d += `M0 ${y}H580`;
  return d;
}
const GRID_D = gridPath();

/* Templates are designs. Award is the first; a new design joins this list and the Files home's
   "Start a new certificate" row. The PRESETS below are not templates: they are starter text for
   the Award design (Utsav, 5 Oct 2026: "one design with different copy"). */
const TEMPLATES = [
  { id: 'award', label: 'Award certificate', sub: 'Blue frame · A4' },
];

const PRESETS = [
  {
    id: 'powerhouse',
    label: 'Powerhouse',
    name: 'Sukruti',
    nameOwnLine: false,
    headline: 'brings the energy everyone borrows.',
    before: 'Strong on every metric & stronger for everyone around her. Recognized as the',
    award: 'Powerhouse of',
    after: 'for setting the standard in consistency and spirit.',
  },
  {
    id: 'highest-acv',
    label: 'Highest ACV',
    name: 'Ajith',
    nameOwnLine: false,
    headline: 'landed the whales.',
    before: 'You defined quality over quantity. Recognized for',
    award: 'Highest ACV of',
    after: 'and for setting the standard in high-value selling.',
  },
  {
    id: 'rookie',
    label: 'Rookie of the month',
    name: 'Mugil',
    nameOwnLine: false,
    headline: 'skipped the learning curve',
    before: 'You made day one look like year one. Recognized as',
    award: 'Rookie of the Month for',
    after: 'and for setting the standard in growth and execution.',
  },
  {
    id: 'outbound',
    label: 'Top outbound conversion',
    name: 'Abhinav',
    nameOwnLine: false,
    headline: 'never let a lead go quiet.',
    before: 'You turned every conversation into an opportunity. Recognized for',
    award: 'Top Outbound Conversion for',
    after: 'and for setting the standard in conversion excellence.',
  },
];

const SIGNATORY_DEFAULT = { signature: 'Nayrhit B.', signedBy: 'Nayrhit, CEO, Gushwork' };

function awardLine(d) {
  return [d.award, d.period].map((s) => (s || '').trim()).filter(Boolean).join(' ');
}

/* Smart paste (Utsav, 5 Oct 2026): a whole citation pasted in one go is split into the plain
   lead-in, the blue award, the blue period and the plain close, so nobody has to cut it up by hand.
   "You raised your game. Recognized as Breakout Performer of Q3 2026 and for setting the standard
   in growth." -> before "You raised your game. Recognized as", award "Breakout Performer of",
   period "Q3 2026", after "and for setting the standard in growth."
   The award is the run after "Recognized as/for (the)" up to the period; without that cue it is the
   run of capitalised words (and of/for/the/in) just before the period. Returns null when there is
   no period to anchor on, and the paste then lands as plain text. */
const PERIOD_RE = /\b((?:Q[1-4]|H[12]|FY\s?)\s?'?\d{2,4}|(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{4}|(?:19|20)\d{2})\b/;
function splitCitation(raw) {
  const text = String(raw || '').replace(/\s+/g, ' ').trim();
  const pm = PERIOD_RE.exec(text);
  if (!pm) return null;
  const head = text.slice(0, pm.index).trim();
  const after = text.slice(pm.index + pm[0].length).trim();
  const cue = /^(.*\bRecogni[sz]ed\s+(?:as|for|with)(?:\s+(?:the|a|an))?)\s+(.+)$/i.exec(head);
  let before, award;
  if (cue) { before = cue[1]; award = cue[2]; }
  else {
    const words = head.split(' ');
    let i = words.length;
    const join = /^(of|for|the|in|and|&)$/i;
    while (i > 0 && (/^[A-Z0-9]/.test(words[i - 1]) || join.test(words[i - 1]))) i--;
    while (i < words.length && join.test(words[i]) && !/^(of|for|in)$/i.test(words[words.length - 1] || '')) i++;
    if (i >= words.length) return null;
    before = words.slice(0, i).join(' '); award = words.slice(i).join(' ');
  }
  if (!award) return null;
  return { before, award, period: pm[0].replace(/\s+/g, ' '), after };
}

/* Click-to-edit (Utsav, 5 Oct 2026). A plain-text contentEditable run, kept in step with the
   panel's fields both ways. React never re-renders its text while it has focus (that would jump
   the caret); Enter is refused and paste is flattened to text, so the run stays one text node,
   which is what the PDF exporter reads. data-ph is a placeholder drawn only when the run is
   empty, and never in an export (the exporters set data-exporting on the sheet). */
const noTrail = (t) => String(t || '').replace(/\n+$/, '');
function EditableText({ value, onChange, editable, placeholder, ...rest }) {
  const ref = React.useRef(null);
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (el && document.activeElement !== el && el.textContent !== (value || '')) el.textContent = value || '';
  }, [value]);
  if (!editable) return <span {...rest}>{value}</span>;
  return (
    <span
      {...rest}
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      data-ph={placeholder}
      className="cert-edit"
      onInput={(e) => onChange(noTrail(e.currentTarget.textContent))}
      onKeyDown={(e) => {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        // Shift + Return breaks the line here (a newline in the text, drawn by white-space: pre-line);
        // Return alone finishes editing
        if (e.shiftKey) document.execCommand('insertText', false, '\n');
        else e.currentTarget.blur();
      }}
      onPaste={(e) => { e.preventDefault(); document.execCommand('insertText', false, e.clipboardData.getData('text/plain').replace(/[^\S\n]+/g, ' ')); }}
      onBlur={(e) => {
        // the browser keeps a trailing newline after a Shift + Return at the end; it is not a line
        const t = noTrail(e.currentTarget.textContent);
        if (e.currentTarget.textContent !== t) e.currentTarget.textContent = t;
        if (t !== (value || '')) onChange(t);
      }}
    />
  );
}

/* The name always runs into the headline on its first line (Utsav, 5 Oct 2026); nameOwnLine is
   kept in saved files but no longer read. */

/* The citation as ONE editing surface (Utsav, 5 Oct 2026: "three clicks should select the entire
   text"). Four runs live inside it, each a data-field span in its own colour: before, award, period,
   after. A triple click selects the whole citation; typing inside a run edits that run; anything
   that replaces runs (typing or pasting over a selection that crosses them) is read back as one
   text and split again by splitCitation, or kept as the lead-in when there is no period to anchor
   on. React does not render its children: the DOM is written from the fields while it is not
   focused, so the caret never jumps. */
const CITE_RUNS = [
  { key: 'before', text: 'body',     ph: 'Text before the award' },
  { key: 'award',  text: 'bodySemi', ph: 'Award' },
  { key: 'period', text: 'bodySemi', ph: 'Period' },
  { key: 'after',  text: 'body',     ph: 'text after the award' },
];
function citeHTML(d) {
  const esc = (v) => String(v || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return CITE_RUNS.map((r) => {
    const semi = r.text === 'bodySemi';
    const style = semi ? `font-family:${CERT_FONT.bodySemi.replace(/"/g, "'")};font-weight:600;color:${CERT.blue}` : `color:${CERT.grey}`;
    return `<span class="cert-edit" data-field="${r.key}" data-text="${r.text}" data-ph="${r.ph}" style="${style}">${esc(d[r.key])}</span>`;
  }).join(' ');
}
function readCitation(el) {
  const spans = {};
  el.querySelectorAll('[data-field]').forEach((sp) => { spans[sp.getAttribute('data-field')] = sp.textContent; });
  const intact = CITE_RUNS.every((r) => r.key in spans) && el.querySelectorAll('[data-field]').length === 4;
  // text typed outside the runs, or runs merged away: read the whole thing and split it again
  const stray = [...el.childNodes].some((n) => n.nodeType === 3 && n.nodeValue.trim());
  // spaces at a run's edges are dropped: the runs are joined by one space, so an edge space doubled it
  if (intact && !stray) return Object.fromEntries(CITE_RUNS.map((r) => [r.key, trimSpaces(noTrail(spans[r.key]))]));
  const all = noTrail(el.textContent).replace(/[^\S\n]+/g, ' ').trim();
  return splitCitation(all) || { before: all, award: '', period: '', after: '' };
}
function CitationEditor({ data, onEdit, style }) {
  const ref = React.useRef(null);
  const sig = CITE_RUNS.map((r) => data[r.key] || '').join('\u0001');
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (el && document.activeElement !== el) el.innerHTML = citeHTML(data);
  }, [sig]);
  const commit = () => onEdit('citation', readCitation(ref.current));
  return (
    <p
      ref={ref}
      data-layer="Citation"
      className="cert-cite"
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      style={style}
      onInput={commit}
      onKeyDown={(e) => {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        if (e.shiftKey) document.execCommand('insertText', false, '\n');
        else e.currentTarget.blur();
      }}
      onPaste={(e) => {
        e.preventDefault();
        const text = e.clipboardData.getData('text/plain');
        const parts = splitCitation(text);
        const sel = window.getSelection();
        const whole = sel && sel.rangeCount && ref.current && sel.toString().replace(/\s+/g, ' ').trim() === ref.current.textContent.replace(/\s+/g, ' ').trim();
        const empty = !ref.current.textContent.trim();
        if (parts && (whole || empty || text.length > 40)) {
          // a whole citation: fill all four runs, then leave editing so the runs redraw
          onEdit('citation', parts);
          ref.current.innerHTML = citeHTML({ ...data, ...parts });
          ref.current.blur();
          return;
        }
        document.execCommand('insertText', false, text.replace(/[^\S\n]+/g, ' '));
      }}
      onBlur={() => { commit(); if (ref.current) ref.current.innerHTML = citeHTML({ ...data, ...readCitation(ref.current) }); }}
    />
  );
}

/* data-layer names one PSD layer each; data-text marks a run the PDF
   exporter draws as live text (font key → certificate-export.js). */
/* trims spaces, never a line break someone put there on purpose */
function trimSpaces(v) { return String(v || '').replace(/^[ \t]+|[ \t]+$/g, ''); }

function Certificate({ data, logoSvg, certRef, onEdit, signLocked = false }) {
  const editable = !!onEdit;
  const ed = (key) => (v) => onEdit && onEdit(key, v);
  const name = trimSpaces(data.name);
  const headline = trimSpaces(data.headline);
  const award = awardLine(data);
  const before = trimSpaces(data.before);
  const after = trimSpaces(data.after);

  return (
    <div
      ref={certRef}
      className="cert"
      style={{
        position: 'relative', width: CERT.W, height: CERT.H, overflow: 'hidden',
        background: CERT.blue, boxSizing: 'border-box',
        // the sheet sets its own text rules, so a thumbnail inside a <button> (centred text) or any
        // other host draws it exactly as the editor does
        textAlign: 'left', whiteSpace: 'normal', fontStyle: 'normal', textTransform: 'none',
      }}
    >
      <div data-layer="Background" style={{ position: 'absolute', inset: 0, background: CERT.blue }} />

      <div
        data-layer="Panel"
        style={{
          position: 'absolute', left: CERT.panelInset, top: CERT.panelInset,
          width: CERT.panelW, height: CERT.panelH, borderRadius: CERT.panelR,
          background: CERT.panel,
        }}
      />

      <svg
        data-layer="Grid"
        width={CERT.panelW} height={CERT.panelH}
        viewBox={`0 0 ${CERT.panelW} ${CERT.panelH}`}
        style={{ position: 'absolute', left: CERT.panelInset, top: CERT.panelInset, display: 'block' }}
        aria-hidden="true"
      >
        <defs>
          <radialGradient id="cert-grid-g" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform={CERT.gridGradient}>
            <stop stopColor={CERT.gridIn} />
            <stop offset="1" stopColor={CERT.gridOut} />
          </radialGradient>
          <clipPath id="cert-grid-clip">
            <rect width={CERT.panelW} height={CERT.panelH} rx={CERT.panelR} />
          </clipPath>
        </defs>
        <g clipPath="url(#cert-grid-clip)" opacity={CERT.gridOpacity}>
          <path d={GRID_D} stroke="url(#cert-grid-g)" strokeWidth="1" fill="none" />
        </g>
      </svg>

      <div
        className="cert-col"
        style={{
          position: 'absolute',
          left: CERT.panelInset + CERT.pad, top: CERT.panelInset + CERT.pad,
          width: CERT.colW, display: 'flex', flexDirection: 'column', gap: CERT.gapHead,
        }}
      >
        <h2
          data-layer="Headline"
          style={{
            margin: 0, fontFamily: CERT_FONT.display, fontWeight: 700, fontSize: 58,
            lineHeight: 1.2, letterSpacing: 0, color: CERT.black, overflowWrap: 'break-word',
            whiteSpace: 'pre-line',   // a Shift + Return in the text is a line break on the sheet
          }}
        >
          {editable ? (
            <>
              <EditableText editable value={data.name} onChange={ed('name')} placeholder="Name" data-text="display" style={{ color: CERT.blue }} />
              {' '}
              <EditableText editable value={data.headline} onChange={ed('headline')} placeholder="the headline" data-text="display" style={{ color: CERT.black }} />
            </>
          ) : (
            <>
              {name && <span data-text="display" style={{ color: CERT.blue }}>{name}</span>}
              {name && headline && ' '}
              {headline && <span data-text="display" style={{ color: CERT.black }}>{headline}</span>}
            </>
          )}
        </h2>

        <div style={{ width: CERT.innerW, display: 'flex', flexDirection: 'column', gap: CERT.gapBody }}>
          {editable ? (
            <CitationEditor data={data} onEdit={onEdit} style={{
              margin: 0, fontFamily: CERT_FONT.body, fontWeight: 400, fontSize: 14,
              lineHeight: 1.72, letterSpacing: 0, color: CERT.grey, whiteSpace: 'pre-line',
            }} />
          ) : (
          <p
            data-layer="Citation"
            style={{
              margin: 0, fontFamily: CERT_FONT.body, fontWeight: 400, fontSize: 14,
              lineHeight: 1.72, letterSpacing: 0, color: CERT.grey, whiteSpace: 'pre-line',
            }}
          >
            {(
              <>
                {before && <span data-text="body" style={{ color: CERT.grey }}>{before}</span>}
                {before && award && ' '}
                {award && <span data-text="bodySemi" style={{ fontFamily: CERT_FONT.bodySemi, fontWeight: 600, color: CERT.blue }}>{award}</span>}
                {(before || award) && after && ' '}
                {after && <span data-text="body" style={{ color: CERT.grey }}>{after}</span>}
              </>
            )}
          </p>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: CERT.gapSig, alignItems: 'flex-start' }}>
            <div
              data-layer="Signature"
              style={{
                marginLeft: -2, fontFamily: CERT_FONT.sig, fontWeight: 400, fontSize: 40,
                lineHeight: 1, letterSpacing: '-0.002em', color: CERT.black, whiteSpace: 'nowrap',
                minHeight: 40,
              }}
            >
              <EditableText editable={editable && !signLocked} value={data.signature} onChange={ed('signature')} placeholder="Signature" data-text="sig" />
            </div>
            <div
              data-layer="Signed by"
              style={{
                fontFamily: CERT_FONT.body, fontWeight: 400, fontSize: 12, lineHeight: 1.2,
                letterSpacing: 0, color: CERT.grey, whiteSpace: 'nowrap', minHeight: 14,
              }}
            >
              <EditableText editable={editable && !signLocked} value={data.signedBy} onChange={ed('signedBy')} placeholder="Name, role, Gushwork" data-text="body" />
            </div>
          </div>
        </div>
      </div>

      <div
        data-layer="Logo"
        style={{
          position: 'absolute', left: CERT.logoX, top: CERT.logoY,
          height: CERT.logoH, width: (CERT.logoH * 421) / 80, lineHeight: 0,
        }}
        dangerouslySetInnerHTML={{ __html: logoSvg || '' }}
      />
    </div>
  );
}

Object.assign(window, { splitCitation, TEMPLATES, EditableText, CERT, CERT_FONT, PRESETS, SIGNATORY_DEFAULT, Certificate, awardLine, GRID_D });
