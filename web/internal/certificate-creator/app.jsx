/* ─────────────────────────────────────────────────────────────────
   Certificate Creator — the panel, the preview, the bar.
   Built on /internal/tool-shell.css (gushwork-tools, v2.0.0). The
   shell's controls only: fields, the click-open dropdown, the X-Small
   switch, the one floating pill.
   ───────────────────────────────────────────────────────────────── */
const { useState, useEffect, useRef, useLayoutEffect, useCallback } = React;

const DEFAULT_PERIOD = 'Q2 2026';

function fromPreset(p, prev) {
  return {
    template: (prev && prev.template) || 'award',
    preset: p.id,
    name: p.name,
    nameOwnLine: p.nameOwnLine,
    headline: p.headline,
    before: p.before,
    award: p.award,
    after: p.after,
    period: prev ? prev.period : DEFAULT_PERIOD,
    signature: prev ? prev.signature : SIGNATORY_DEFAULT.signature,
    signedBy: prev ? prev.signedBy : SIGNATORY_DEFAULT.signedBy,
  };
}

function slug(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

/* Share links carry the certificate's fields in the #fragment, which the browser never sends to a
   server; a saved certificate's link carries only its id, so it always opens the latest save. */
const DATA_KEYS = ['template', 'preset', 'name', 'nameOwnLine', 'headline', 'before', 'award', 'after', 'period', 'signature', 'signedBy'];
function pick(d) { const o = {}; DATA_KEYS.forEach((k) => { o[k] = d[k]; }); return o; }
function same(a, b) { return DATA_KEYS.every((k) => (a[k] || '') === (b[k] || '')); }
function pagesOf(it) {
  const list = it && Array.isArray(it.pages) && it.pages.length ? it.pages : [(it && it.data) || {}];
  return list.map((p) => ({ ...fromPreset(PRESETS[0]), ...p }));
}
function pagesSame(a, b) { return a.length === b.length && a.every((p, i) => same(p, b[i])); }
function encodeData(pages) {
  const bytes = new TextEncoder().encode(JSON.stringify({ pages: pages.map(pick) }));
  let bin = ''; bytes.forEach((b) => { bin += String.fromCharCode(b); });
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function decodeData(str) {
  try {
    const bin = atob(str.replace(/-/g, '+').replace(/_/g, '/'));
    const raw = JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0))));
    const one = (r) => { const out = {}; DATA_KEYS.forEach((k) => { out[k] = k === 'nameOwnLine' ? r[k] === true : String(r[k] || ''); }); return out; };
    return (Array.isArray(raw.pages) ? raw.pages : [raw]).slice(0, 50).map(one);
  } catch { return null; }
}
/* Routes live in the #fragment: none = the Files home; #file=<id> (or the older #saved=<id>) a
   saved file; #new (or #new=<template>) a new one from a template; #c=<data> an unsaved certificate carried in the link. */
function readHash() {
  const raw = location.hash.slice(1);
  const h = new URLSearchParams(raw);
  return { saved: h.get('file') || h.get('saved') || '', c: h.get('c') || '', isNew: raw === 'new' || raw.startsWith('new='), template: h.get('new') || '' };
}
function routeOf() {
  const h = readHash();
  return h.saved || h.c || h.isNew ? 'editor' : 'home';
}
function defaultTitle(d) {
  return [d.name, awardLine(d)].filter((x) => x && x.trim()).join(' · ') || 'Untitled certificate';
}
function ago(iso) {
  const t = new Date(iso).getTime(); if (!t) return '';
  const m = Math.round((Date.now() - t) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60); if (h < 24) return `${h} hour${h === 1 ? '' : 's'} ago`;
  const d = Math.round(h / 24); if (d < 7) return `${d} day${d === 1 ? '' : 's'} ago`;
  return when(iso);
}
/* who has it: the owner, then the people added (Canva's People column) */
function Avatars({ it, max = 3 }) {
  const people = [it.savedBy, ...((it.access && it.access.people) || []).map((p) => p.email)];
  const shown = people.slice(0, max);
  return (
    <span className="avatars" title={people.map((e) => firstName(e)).join(', ')}>
      {shown.map((e) => <span key={e} className="acc-avatar acc-avatar--sm">{firstName(e).slice(0, 1)}</span>)}
      {people.length > max && <span className="acc-avatar acc-avatar--sm">+{people.length - max}</span>}
    </span>
  );
}
function titleOf(it) { return (it && it.title) || defaultTitle((it && it.data) || {}); }
/* one line: award · who, when (edited when it was, else saved) */
function rowMeta(it) {
  const edited = it.updatedAt !== it.savedAt;
  const by = `${who(edited ? it.updatedBy : it.savedBy)}, ${when(edited ? it.updatedAt : it.savedAt)}`;
  return it.title ? `${awardLine(it.data) || 'No award'} · ${by}` : by;   // a default title already names the award
}
function when(iso) {
  try { return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); } catch { return ''; }
}
function whenTime(iso) {
  try { return new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch { return ''; }
}
/* People by first name: from their Google sign-in when the tool has seen them (NAMES, filled from
   /api/certificates), otherwise from the address ("priya.r@…" reads "Priya"). */
const NAMES = {};
function firstName(email) {
  const e = String(email || '').toLowerCase();
  if (!e.includes('@')) return e || 'Someone';
  const full = NAMES[e];
  const word = full ? full.trim().split(/\s+/)[0] : e.split('@')[0].split(/[._+-]/)[0];
  return word ? word.charAt(0).toUpperCase() + word.slice(1) : 'Someone';
}
function fullName(email) { return NAMES[String(email || '').toLowerCase()] || ''; }
function who(email) { return firstName(email); }

async function api(method, body, query = '') {
  const r = await fetch('/api/certificates' + query, {
    method, credentials: 'same-origin',
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  let j = null; try { j = await r.json(); } catch { /* not JSON: the endpoint is not there */ }
  if (!r.ok || !j) {
    const err = new Error((j && j.error) || 'The saved list is not available here.');
    err.status = r.status; err.body = j;
    throw err;
  }
  return j;
}

/* A section locked until the person asks to edit it, after the ID card generator's locked fields
   (Utsav, 5 Oct 2026: "lock this section and only open when user wants to"). The lock chip opens a
   short confirm; Yes unlocks the section for this file. */
function LockedSection({ title, locked, onUnlock, prompt, children }) {
  const [asking, setAsking] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!asking) return undefined;
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setAsking(false); };
    const onKey = (e) => { if (e.key === 'Escape') setAsking(false); };
    document.addEventListener('mousedown', onDoc); document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey); };
  }, [asking]);
  return (
    <section className={`prop-section lockable-field${locked ? ' is-locked' : ''}`} ref={ref}>
      <header className="prop-section-head lock-head">
        <h3>{title}</h3>
        {locked && (
          <button type="button" className="lock-chip lock-chip--section" onClick={() => setAsking((v) => !v)} aria-expanded={asking} aria-label="Locked. Click to unlock">
            <LockIcon /><span className="lock-chip-label">Click to unlock</span>
          </button>
        )}
      </header>
      {asking && (
        <div className="lock-confirm" role="dialog" aria-label="Unlock">
          <p>{prompt}</p>
          <div className="lock-confirm__acts">
            <button type="button" className="r-btn" onClick={() => setAsking(false)}>Cancel</button>
            <button type="button" className="r-btn r-btn--primary" onClick={() => { setAsking(false); onUnlock(); }}>Yes, unlock</button>
          </div>
        </div>
      )}
      <div className="prop-rows">{children}</div>
    </section>
  );
}

/* ── controls ─────────────────────────────────────────────────── */
function PropSection({ title, children }) {
  return (
    <section className="prop-section">
      <header className="prop-section-head"><h3>{title}</h3></header>
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

function PropInput({ value, onChange, placeholder, readOnly = false }) {
  return (
    <input className="prop-input" type="text" value={value || ''} placeholder={placeholder} readOnly={readOnly}
      onChange={(e) => onChange(e.target.value)} spellCheck={false} />
  );
}

function PropTextarea({ value, onChange, placeholder, rows = 3, onPaste }) {
  return (
    <textarea className="prop-input prop-textarea" value={value || ''} placeholder={placeholder} rows={rows}
      onChange={(e) => onChange(e.target.value)} onPaste={onPaste} />
  );
}

/* Opens on click, never on hover; a plain check on the selected row. */
function PropDropdown({ value, options, onChange }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => { if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey); };
  }, [open]);
  const selected = options.find((o) => o.value === value);
  return (
    <div ref={rootRef} className={`prop-dropdown${open ? ' open' : ''}`}>
      <button type="button" className="prop-dropdown-trigger" onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox" aria-expanded={open}>
        <span className="prop-dropdown-value">{selected ? selected.label : 'Your own text'}</span>
        <svg className="prop-dropdown-caret" width="12" height="12" viewBox="0 0 12 12" aria-hidden>
          <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div className="prop-dropdown-menu" role="listbox">
          {options.map((o) => {
            const on = o.value === value;
            return (
              <button key={o.value} type="button" role="option" aria-selected={on}
                className={`prop-dropdown-item${on ? ' active' : ''}`}
                onClick={() => { onChange(o.value); setOpen(false); }}>
                <span className="prop-dropdown-item-label"><span>{o.label}</span></span>
                {on && (
                  <svg className="prop-dropdown-item-check" width="16" height="16" viewBox="0 0 16 16" aria-hidden>
                    <path d="M3.5 8.5L6.5 11.5L12.5 4.5" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
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

/* ── icons (Phosphor, as the other tools) ─────────────────────── */
function SidebarIcon() {
  return (
    <svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
      <path d="M216,40H40A16,16,0,0,0,24,56V200a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A16,16,0,0,0,216,40ZM40,56H80V200H40ZM216,200H96V56H216V200Z" />
    </svg>
  );
}
function DownloadIcon() {
  return (
    <svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
      <path d="M224,144v64a8,8,0,0,1-8,8H40a8,8,0,0,1-8-8V144a8,8,0,0,1,16,0v56H208V144a8,8,0,0,1,16,0Zm-101.66,5.66a8,8,0,0,0,11.32,0l40-40a8,8,0,0,0-11.32-11.32L136,124.69V32a8,8,0,0,0-16,0v92.69L93.66,98.34a8,8,0,0,0-11.32,11.32Z" />
    </svg>
  );
}
function CaretIcon() {
  return (
    <svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
      <path d="M213.66,165.66a8,8,0,0,1-11.32,0L128,91.31,53.66,165.66a8,8,0,0,1-11.32-11.32l80-80a8,8,0,0,1,11.32,0l80,80A8,8,0,0,1,213.66,165.66Z" />
    </svg>
  );
}
function LinkIcon() {
  return (
    <svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
      <path d="M137.54,186.36a8,8,0,0,1,0,11.31l-9.94,10A56,56,0,0,1,48.38,128.4L72.5,104.28A56,56,0,0,1,149.31,102a8,8,0,1,1-10.64,12,40,40,0,0,0-54.85,1.63L59.7,139.72a40,40,0,0,0,56.58,56.58l9.94-9.94A8,8,0,0,1,137.54,186.36Zm70.08-138a56.08,56.08,0,0,0-79.22,0l-9.94,9.95a8,8,0,0,0,11.32,11.31l9.94-9.94a40,40,0,0,1,56.58,56.58L172.18,140.4A40,40,0,0,1,117.33,142,8,8,0,1,0,106.69,154a56,56,0,0,0,76.81-2.26l24.12-24.12A56.08,56.08,0,0,0,207.62,48.38Z" />
    </svg>
  );
}
function SaveIcon() {
  return (
    <svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
      <path d="M219.31,72,184,36.69A15.86,15.86,0,0,0,172.69,32H48A16,16,0,0,0,32,48V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V83.31A15.86,15.86,0,0,0,219.31,72ZM168,208H88V152h80Zm40,0H184V152a16,16,0,0,0-16-16H88a16,16,0,0,0-16,16v56H48V48H172.69L208,83.31ZM160,72a8,8,0,0,1-8,8H96a8,8,0,0,1,0-16h56A8,8,0,0,1,160,72Z" />
    </svg>
  );
}
function TrashIcon() {
  return (
    <svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
      <path d="M216,48H176V40a24,24,0,0,0-24-24H104A24,24,0,0,0,80,40v8H40a8,8,0,0,0,0,16h8V208a16,16,0,0,0,16,16H192a16,16,0,0,0,16-16V64h8a8,8,0,0,0,0-16ZM96,40a8,8,0,0,1,8-8h48a8,8,0,0,1,8,8v8H96Zm96,168H64V64H192ZM112,104v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Zm48,0v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Z" />
    </svg>
  );
}
function CloseIcon() {
  return (
    <svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
      <path d="M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z" />
    </svg>
  );
}
function UsersIcon() {
  return (
    <svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
      <path d="M117.25,157.92a60,60,0,1,0-66.5,0A95.83,95.83,0,0,0,3.53,195.63a8,8,0,1,0,13.4,8.74,80,80,0,0,1,134.14,0,8,8,0,0,0,13.4-8.74A95.83,95.83,0,0,0,117.25,157.92ZM40,108a44,44,0,1,1,44,44A44.05,44.05,0,0,1,40,108Zm210.14,98.7a8,8,0,0,1-11.07-2.33A79.83,79.83,0,0,0,172,168a8,8,0,0,1,0-16,44,44,0,1,0-16.34-84.87,8,8,0,1,1-5.94-14.85,60,60,0,0,1,55.53,105.64,95.83,95.83,0,0,1,47.22,37.71A8,8,0,0,1,250.14,206.7Z" />
    </svg>
  );
}
function PlusIcon() {
  return (
    <svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
      <path d="M224,128a8,8,0,0,1-8,8H136v80a8,8,0,0,1-16,0V136H40a8,8,0,0,1,0-16h80V40a8,8,0,0,1,16,0v80h80A8,8,0,0,1,224,128Z" />
    </svg>
  );
}
function ArrowLeftIcon() {
  return (
    <svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
      <path d="M224,128a8,8,0,0,1-8,8H59.31l58.35,58.34a8,8,0,0,1-11.32,11.32l-72-72a8,8,0,0,1,0-11.32l72-72a8,8,0,0,1,11.32,11.32L59.31,120H216A8,8,0,0,1,224,128Z" />
    </svg>
  );
}
function GridIcon() {
  return (<svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M104,40H56A16,16,0,0,0,40,56v48a16,16,0,0,0,16,16h48a16,16,0,0,0,16-16V56A16,16,0,0,0,104,40Zm0,64H56V56h48v48Zm96-64H152a16,16,0,0,0-16,16v48a16,16,0,0,0,16,16h48a16,16,0,0,0,16-16V56A16,16,0,0,0,200,40Zm0,64H152V56h48v48Zm-96,32H56a16,16,0,0,0-16,16v48a16,16,0,0,0,16,16h48a16,16,0,0,0,16-16V152A16,16,0,0,0,104,136Zm0,64H56V152h48v48Zm96-64H152a16,16,0,0,0-16,16v48a16,16,0,0,0,16,16h48a16,16,0,0,0,16-16V152A16,16,0,0,0,200,136Zm0,64H152V152h48v48Z" /></svg>);
}
function ListIcon() {
  return (<svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M224,128a8,8,0,0,1-8,8H40a8,8,0,0,1,0-16H216A8,8,0,0,1,224,128ZM40,72H216a8,8,0,0,0,0-16H40a8,8,0,0,0,0,16ZM216,184H40a8,8,0,0,0,0,16H216a8,8,0,0,0,0-16Z" /></svg>);
}
function DotsIcon() {   /* the bold weight: the regular dots read too faint at 16 */
  return (<svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><circle cx="56" cy="128" r="20" /><circle cx="128" cy="128" r="20" /><circle cx="200" cy="128" r="20" /></svg>);
}
function CopyIcon() {
  return (<svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M216,32H88a8,8,0,0,0-8,8V80H40a8,8,0,0,0-8,8V216a8,8,0,0,0,8,8H168a8,8,0,0,0,8-8V176h40a8,8,0,0,0,8-8V40A8,8,0,0,0,216,32ZM160,208H48V96H160Zm48-48H176V88a8,8,0,0,0-8-8H96V48H208Z" /></svg>);
}
function SearchIcon({ className }) {
  return (<svg className={className} viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M229.66,218.34l-50.07-50.06a88.11,88.11,0,1,0-11.31,11.31l50.06,50.07a8,8,0,0,0,11.32-11.32ZM40,112a72,72,0,1,1,72,72A72.08,72.08,0,0,1,40,112Z" /></svg>);
}
function DotsVIcon() {
  return (<svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><circle cx="128" cy="56" r="20" /><circle cx="128" cy="128" r="20" /><circle cx="128" cy="200" r="20" /></svg>);
}
function OpenIcon() {
  return (<svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M224,104a8,8,0,0,1-16,0V59.32l-66.33,66.34a8,8,0,0,1-11.32-11.32L196.68,48H152a8,8,0,0,1,0-16h64a8,8,0,0,1,8,8Zm-40,24a8,8,0,0,0-8,8v72H48V80h72a8,8,0,0,0,0-16H48A16,16,0,0,0,32,80V208a16,16,0,0,0,16,16H176a16,16,0,0,0,16-16V136A8,8,0,0,0,184,128Z" /></svg>);
}
function LockIcon() {
  return (<svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M208,80H176V56a48,48,0,0,0-96,0V80H48A16,16,0,0,0,32,96V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V96A16,16,0,0,0,208,80ZM96,56a32,32,0,0,1,64,0V80H96ZM208,208H48V96H208V208Z" /></svg>);
}
function CompassIcon() {
  return (<svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216ZM172.42,72.84l-64,32a8.05,8.05,0,0,0-3.58,3.58l-32,64A8,8,0,0,0,80,184a8.1,8.1,0,0,0,3.58-.84l64-32a8.05,8.05,0,0,0,3.58-3.58l32-64a8,8,0,0,0-10.74-10.74ZM138,138,97.89,158.11,118,118l40.15-20.07Z" /></svg>);
}
function CheckIcon() {
  return (
    <svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
      <path d="M229.66,77.66l-128,128a8,8,0,0,1-11.32,0l-56-56a8,8,0,0,1,11.32-11.32L96,188.69,218.34,66.34a8,8,0,0,1,11.32,11.32Z" />
    </svg>
  );
}

/* ── Dashboard library pieces (exports/dashboard), for what the tools family does not have:
   the search field, select, icon button + menu, empty state, data table, modal and confirm.
   Their own gd- classes and look, inside a .gd scope (display: contents, so it adds no box);
   open and close are React's, not dashboard.js's, so the two never fight over the DOM. ── */
function useOutside(open, setOpen, ref) {
  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDoc); document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey); };
  }, [open]);
}
/* The library's menu placement: position fixed under the trigger, clamped to the viewport, flipped
   up when the space below is short, so no scroller or card clips it. */
function useFixedMenu(open, triggerRef, menuRef, align = 'end') {
  const [style, setStyle] = useState(null);
  useLayoutEffect(() => {
    if (!open) { setStyle(null); return undefined; }
    // Measured once, at its natural size, before it is shown: the menu used to be placed from a
    // width taken before its min-width applied, then placed again, which read as a flicker.
    const place = () => {
      const t = triggerRef.current, m = menuRef.current;
      if (!t || !m) return;
      const r = t.getBoundingClientRect();
      const mw = Math.max(m.scrollWidth, m.offsetWidth, r.width);
      const natural = m.scrollHeight;
      const below = window.innerHeight - r.bottom - 12, above = r.top - 12;
      const up = natural > below && above > below;
      const room = up ? above : below;
      const h = Math.min(natural, room);
      const top = up ? r.top - 4 - h : r.bottom + 4;
      let left = align === 'end' ? r.right - mw : r.left;
      left = Math.max(8, Math.min(left, window.innerWidth - mw - 8));
      setStyle({ position: 'fixed', top, left, right: 'auto', bottom: 'auto', width: mw, maxHeight: room, zIndex: 200 });
    };
    place();
    window.addEventListener('resize', place);
    return () => { window.removeEventListener('resize', place); };
  }, [open]);
  // before the first measure: laid out (so it can be measured) but not seen
  return style || { position: 'fixed', visibility: 'hidden', top: 0, left: 0, maxHeight: 'none' };
}
function Gd({ children }) { return <div className="gd gd-scope">{children}</div>; }
function GdSearch({ value, onChange, placeholder, className = '' }) {
  return (
    <label className={`gd-input gd-input--search ${className}`}>
      <SearchIcon className="gd-input__icon" />
      <input className="gd-input__el" type="search" value={value} placeholder={placeholder} aria-label={placeholder} onChange={(e) => onChange(e.target.value)} />
      {value && <button type="button" className="gd-iconbtn gd-iconbtn--sm gd-input__clear" aria-label="Clear search" onClick={() => onChange('')}><CloseIcon /></button>}
    </label>
  );
}
function GdSelect({ value, options, onChange, label }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useOutside(open, setOpen, ref);
  const cur = options.find((o) => o.value === value) || options[0];
  const tRef = useRef(null), mRef = useRef(null);
  const mStyle = useFixedMenu(open, tRef, mRef, 'end');
  return (
    <div className="gd-select gd-select--auto gd-pop" ref={ref}>
      <button ref={tRef} type="button" className="gd-input gd-input--auto" aria-haspopup="listbox" aria-expanded={open} aria-label={label} onClick={() => setOpen((v) => !v)}>
        <span className="gd-select__value">{cur.label}</span>
        <svg className="gd-input__caret" viewBox="0 0 12 12" aria-hidden><path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
      {open && (
        <div ref={mRef} style={mStyle} className="gd-menu" role="listbox">
          {options.map((o) => (
            <button key={o.value} type="button" className="gd-menu__item" role="option" aria-selected={o.value === value} onClick={() => { onChange(o.value); setOpen(false); }}>
              <span className="gd-menu__text">{o.label}</span>
              <svg className="gd-menu__check" viewBox="0 0 16 16" aria-hidden><path d="M3.5 8.5L6.5 11.5L12.5 4.5" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
/* items: [{label, icon, onClick, danger}] or 'sep' */
function GdMenuButton({ label, icon, items, outline = false, sm = false }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useOutside(open, setOpen, ref);
  const tRef = useRef(null), mRef = useRef(null);
  const mStyle = useFixedMenu(open, tRef, mRef, 'end');
  return (
    <div className="gd-pop" ref={ref} onClick={(e) => e.stopPropagation()}>
      <button ref={tRef} type="button" className={`gd-iconbtn${outline ? ' gd-iconbtn--outline' : ''}${sm ? ' gd-iconbtn--sm' : ''}`} aria-haspopup="menu" aria-expanded={open} aria-label={label} onClick={() => setOpen((v) => !v)}>{icon}</button>
      {open && (
        <div ref={mRef} style={mStyle} className="gd-menu" role="menu">
          {items.filter(Boolean).map((it, i) => it === 'sep'
            ? <div key={i} className="gd-menu__sep" />
            : it.section
              ? <div key={i} className="gd-menu__label">{it.section}</div>
              : (
                <button key={i} type="button" role={it.checked === undefined ? 'menuitem' : 'menuitemradio'}
                  aria-checked={it.checked === undefined ? undefined : !!it.checked}
                  className={`gd-menu__item${it.danger ? ' gd-menu__item--danger' : ''}`} onClick={() => { setOpen(false); it.onClick(); }}>
                  {it.icon}<span className="gd-menu__text">{it.label}</span>
                  {it.checked !== undefined && <svg className="gd-menu__check" viewBox="0 0 16 16" aria-hidden><path d="M3.5 8.5L6.5 11.5L12.5 4.5" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                </button>
              ))}
        </div>
      )}
    </div>
  );
}
function GdEmpty({ kind = 'first-use', icon, title, text, children }) {
  return (
    <div className={`gd-empty gd-empty--${kind}`} aria-live="polite">
      <span className="gd-empty__badge" aria-hidden>{icon}</span>
      <div className="gd-empty__copy"><h3 className="gd-empty__title">{title}</h3><p className="gd-empty__text">{text}</p></div>
      {children && <div className="gd-empty__actions">{children}</div>}
    </div>
  );
}

/* Appearance and Help, the hub's own (tool-chrome.js keeps the keys and applies the theme). In the
   editor they live in the file menu instead of the canvas corner (Utsav, 5 Oct 2026). */
const themeChoice = () => { try { const v = localStorage.getItem('gw-theme-choice'); return v === 'light' || v === 'dark' ? v : 'system'; } catch { return 'system'; } };
const setThemeChoice = (v) => { if (window.gwSetTheme) window.gwSetTheme(v); };
function SunIcon() { return (<svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M120,40V16a8,8,0,0,1,16,0V40a8,8,0,0,1-16,0Zm72,88a64,64,0,1,1-64-64A64.07,64.07,0,0,1,192,128Zm-16,0a48,48,0,1,0-48,48A48.05,48.05,0,0,0,176,128ZM58.34,69.66A8,8,0,0,0,69.66,58.34l-16-16A8,8,0,0,0,42.34,53.66Zm0,116.68-16,16a8,8,0,0,0,11.32,11.32l16-16a8,8,0,0,0-11.32-11.32ZM192,72a8,8,0,0,0,5.66-2.34l16-16a8,8,0,0,0-11.32-11.32l-16,16A8,8,0,0,0,192,72Zm5.66,114.34a8,8,0,0,0-11.32,11.32l16,16a8,8,0,0,0,11.32-11.32ZM48,128a8,8,0,0,0-8-8H16a8,8,0,0,0,0,16H40A8,8,0,0,0,48,128Zm80,80a8,8,0,0,0-8,8v24a8,8,0,0,0,16,0V216A8,8,0,0,0,128,208Zm112-88H216a8,8,0,0,0,0,16h24a8,8,0,0,0,0-16Z" /></svg>); }
function MoonIcon() { return (<svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M233.54,142.23a8,8,0,0,0-8-2,88.08,88.08,0,0,1-109.8-109.8,8,8,0,0,0-10-10,104.84,104.84,0,0,0-52.91,37A104,104,0,0,0,136,224a103.09,103.09,0,0,0,62.52-20.88,104.84,104.84,0,0,0,37-52.91A8,8,0,0,0,233.54,142.23ZM188.9,190.34A88,88,0,0,1,65.66,67.11a89,89,0,0,1,31.4-26A106,106,0,0,0,96,56,104.11,104.11,0,0,0,200,160a106,106,0,0,0,14.92-1.06A89,89,0,0,1,188.9,190.34Z" /></svg>); }
function DesktopIcon() { return (<svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M208,40H48A24,24,0,0,0,24,64V176a24,24,0,0,0,24,24h72v16H96a8,8,0,0,0,0,16h64a8,8,0,0,0,0-16H136V200h72a24,24,0,0,0,24-24V64A24,24,0,0,0,208,40ZM48,56H208a8,8,0,0,1,8,8v80H40V64A8,8,0,0,1,48,56ZM208,184H48a8,8,0,0,1-8-8V160H216v16A8,8,0,0,1,208,184Z" /></svg>); }
function MailIcon() { return (<svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M224,48H32a8,8,0,0,0-8,8V192a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A8,8,0,0,0,224,48Zm-96,85.15L52.57,64H203.43ZM98.71,128,40,181.81V74.19Zm11.84,10.85,12,11.05a8,8,0,0,0,10.82,0l12-11.05,58,53.15H52.57ZM157.29,128,216,74.18V181.82Z" /></svg>); }
function ChatIcon() { return (<svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M216,48H40A16,16,0,0,0,24,64V224a15.85,15.85,0,0,0,9.24,14.5A16.13,16.13,0,0,0,40,240a15.89,15.89,0,0,0,10.25-3.78l.09-.07L83,208H216a16,16,0,0,0,16-16V64A16,16,0,0,0,216,48Zm0,144H80a8,8,0,0,0-5.23,1.95L40,224V64H216Z" /></svg>); }

/* ── First-run tour: the dashboard library's coachmark (gd-coach), after Navattic and Flodesk on
   Mobbin. A few steps point at real controls; shown once per person and place (gd-tour:<id>, as the
   library stores it), Skip or Esc ends it, and "Take the tour" replays it. ── */
const TOURS = {
  'cert-home': [
    { sel: '.tpl-row .tpl', title: 'Start here', text: 'Create new starts a certificate from the Award template. More templates will sit beside it.' },
    { sel: '.home-search', title: 'Find any certificate', text: 'Search by name, award or the person who made it.' },
    { sel: '.home-recent .home-right', title: 'Yours and shared', text: 'Filter to what you own or what others shared with you. Each card\'s ⋮ menu opens, copies, shares or deletes it.' },
  ],
  'cert-editor': [
    { sel: '.cert-scale .cert [data-layer="Headline"]', title: 'Edit on the certificate', text: 'Click any text and type. Shift + Return starts a new line.' },
    { sel: '.cert-scale .cert-cite', title: 'Paste a whole body copy', text: 'Paste it here and the award and the period turn blue on their own. Triple click selects all of it.' },
    { sel: '.left-col .form-card', title: 'Or use the fields', text: 'Template, starter text, name and body copy. They stay in step with the certificate.' },
    { sel: '.page-strip', title: 'One file, many certificates', text: 'Add a page for each person, duplicate one, or drag to reorder.' },
    { sel: '.right-col .right-actions', title: 'Save and share', text: 'Save keeps the file for your team; Copy link sends it. The ⋯ menu holds Manage access (for everyone in the file), Delete, Appearance and Help.' },
    { sel: '.right-col .dl-section', title: 'Download for print', text: 'An A4 PDF for printing, a JPG or a layered PSD, for every page or the ones you pick.' },
    { sel: '.brand-card .brand-link', title: 'Jump between tools', text: 'Right click the logo for the Design Hub and the other tools.' },
  ],
};
const tourSeen = (id) => { try { return !!localStorage.getItem('gd-tour:' + id); } catch { return true; } };
const tourDone = (id) => { try { localStorage.setItem('gd-tour:' + id, new Date().toISOString()); } catch { /* shows again next time, nothing worse */ } };

function Tour({ id, onEnd }) {
  const steps = (TOURS[id] || []).filter((st) => document.querySelector(st.sel));
  const [i, setI] = useState(0);
  const [pos, setPos] = useState(null);
  const card = useRef(null);
  const step = steps[i];
  const end = (completed) => { tourDone(id); document.querySelectorAll('[data-tour-on]').forEach((n) => n.removeAttribute('data-tour-on')); onEnd(completed); };
  useLayoutEffect(() => {
    if (!step) return undefined;
    const target = document.querySelector(step.sel);
    document.querySelectorAll('[data-tour-on]').forEach((n) => n.removeAttribute('data-tour-on'));
    if (target) target.setAttribute('data-tour-on', '');
    const place = () => {
      const t = target && target.getBoundingClientRect(); const c = card.current;
      if (!t || !c) return;
      const cw = c.offsetWidth, ch = c.offsetHeight, gap = 14, vw = innerWidth, vh = innerHeight;
      // the side with room, in the library's order: below, right, left, above
      const fits = { bottom: vh - t.bottom > ch + gap, right: vw - t.right > cw + gap, left: t.left > cw + gap, top: t.top > ch + gap };
      const side = ['bottom', 'right', 'left', 'top'].find((k) => fits[k]) || 'bottom';
      let x, y;
      if (side === 'bottom' || side === 'top') { x = t.left + t.width / 2 - cw / 2; y = side === 'bottom' ? t.bottom + gap : t.top - ch - gap; }
      else { y = t.top + t.height / 2 - ch / 2; x = side === 'right' ? t.right + gap : t.left - cw - gap; }
      const cx = Math.max(12, Math.min(x, vw - cw - 12)), cy = Math.max(12, Math.min(y, vh - ch - 12));
      setPos({ left: cx, top: cy, side,
        ax: Math.max(16, Math.min(cw - 16, t.left + t.width / 2 - cx)), ay: Math.max(16, Math.min(ch - 16, t.top + t.height / 2 - cy)) });
    };
    place();
    const nxt = card.current && card.current.querySelector('[data-next]'); if (nxt) nxt.focus();
    addEventListener('resize', place); addEventListener('scroll', place, true);
    const onKey = (e) => { if (e.key === 'Escape') end(false); };
    addEventListener('keydown', onKey);
    return () => { removeEventListener('resize', place); removeEventListener('scroll', place, true); removeEventListener('keydown', onKey); };
  }, [i, step && step.sel]);
  if (!step) return null;
  const last = i === steps.length - 1;
  return (
    <Gd>
      <div ref={card} className="gd-coach" role="dialog" aria-labelledby="tour-t" aria-describedby="tour-d"
        data-placement={pos ? pos.side : 'bottom'}
        style={pos ? { left: pos.left, top: pos.top, zIndex: 250, '--gd-arrow-x': pos.ax + 'px', '--gd-arrow-y': pos.ay + 'px' } : { left: -9999, top: 0 }}>
        <div className="gd-coach__body">
          <h3 className="gd-coach__title" id="tour-t">{step.title}</h3>
          <p className="gd-coach__text" id="tour-d">{step.text}</p>
        </div>
        <div className="gd-coach__foot">
          <span className="gd-coach__count" aria-live="polite">{i + 1} of {steps.length}</span>
          {!last && <button type="button" className="gd-btn gd-btn--ghost" onClick={() => end(false)}>Skip</button>}
          <button type="button" data-next className="gd-btn gd-btn--primary" onClick={() => (last ? end(true) : setI(i + 1))}>{last ? 'Done' : 'Next'}</button>
        </div>
      </div>
    </Gd>
  );
}

/* ── overlays: the dashboard library's modal and confirm dialog ── */
function Modal({ open, onClose, title, desc, size = 'md', alert = false, initialFocus, children, foot }) {
  const ref = useRef(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      const f = initialFocus && d.querySelector(initialFocus);
      if (f) f.focus();
    }
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <div className="gd gd-scope">
    <dialog ref={ref} className={`gd-modal t-modal${size === 'sm' ? ' gd-modal--sm' : ''}${alert ? ' gd-confirm' : ''}`} role={alert ? 'alertdialog' : 'dialog'} aria-labelledby="t-modal-title"
      onCancel={(e) => { e.preventDefault(); onClose(); }}
      onMouseDown={(e) => { if (e.target === ref.current) onClose(); }}>
      {open && (
        <>
          <div className="gd-modal__head">
            <div>
              <h2 className="gd-modal__title" id="t-modal-title">{title}</h2>
              {desc && <p className="gd-modal__desc">{desc}</p>}
            </div>
            <button type="button" className="gd-iconbtn gd-iconbtn--sm" onClick={onClose} aria-label="Close"><CloseIcon /></button>
          </div>
          {children && <div className="gd-modal__body">{children}</div>}
          <div className="gd-modal__foot">{foot}</div>
        </>
      )}
    </dialog>
    </div>
  );
}

function RoleSwitch({ value, onChange, labels = { view: 'Can view', edit: 'Can edit' } }) {
  return (
    <div className="gd-seg role-switch" role="radiogroup">
      {['view', 'edit'].map((r) => (
        <button key={r} type="button" role="radio" aria-checked={value === r} tabIndex={value === r ? 0 : -1} className="gd-seg__item" onClick={() => onChange(r)}>{labels[r]}</button>
      ))}
    </div>
  );
}

function accessLine(a) {
  const access = a || { general: 'tool', role: 'edit', people: [] };
  const n = (access.people || []).length;
  const extra = n ? ` · ${n} ${n === 1 ? 'person' : 'people'} added` : '';
  return access.general === 'restricted'
    ? `Only people added${n ? ` (${n})` : ''}`
    : `Everyone with the tool can ${access.role === 'view' ? 'view' : 'edit'}${extra}`;
}

function AccessModal({ item, onClose, onSaved }) {
  // editors change access; everyone else in the file sees it, read-only
  const canShare = !item.can || item.can.share || item.can.manage;
  const [access, setAccess] = useState(() => JSON.parse(JSON.stringify(item.access || { general: 'tool', role: 'edit', people: [] })));
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('edit');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const add = () => {
    const e = email.trim().toLowerCase();
    if (!e) return;
    if (!/^[^\s@]+@gushwork\.ai$/.test(e)) { setError('Add a work address ending in @gushwork.ai.'); return; }
    if (e === item.savedBy) { setError('That is the owner, who always has access.'); return; }
    setError('');
    setAccess((a) => ({ ...a, people: [...a.people.filter((p) => p.email !== e), { email: e, role }] }));
    setEmail('');
  };
  const setPerson = (e, r) => setAccess((a) => ({ ...a, people: a.people.map((p) => (p.email === e ? { ...p, role: r } : p)) }));
  const drop = (e) => setAccess((a) => ({ ...a, people: a.people.filter((p) => p.email !== e) }));
  const submit = async () => {
    setBusy(true); setError('');
    try {
      const j = await api('POST', { id: item.id, access });
      onSaved(j.item);
    } catch (e) { setError(e.message); setBusy(false); }
  };
  return (
    <Modal open onClose={onClose} title={canShare ? (item.data.name ? `Share ${item.data.name}'s certificate` : 'Share this certificate') : 'Who has access'}
      desc={canShare ? "Choose who can see and edit this certificate. The tool's own access still applies on top." : 'You can view this certificate. Ask someone who can edit it to change who has access.'}
      initialFocus={canShare ? '.acc-add input' : '.gd-btn'}
      foot={canShare ? <>
        <button type="button" className="gd-btn" onClick={onClose}>Cancel</button>
        <button type="button" className="gd-btn gd-btn--primary" onClick={submit} disabled={busy}>{busy ? 'Saving…' : 'Save access'}</button>
      </> : <button type="button" className="gd-btn" onClick={onClose}>Close</button>}>
      {canShare && <div className="acc-block">
        <span className="acc-label">Add people</span>
        <div className="acc-add">
          <label className="gd-input"><input className="gd-input__el" type="email" value={email} placeholder="name@gushwork.ai" aria-label="Work email"
            onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }} /></label>
          <RoleSwitch value={role} onChange={setRole} labels={{ view: 'View', edit: 'Edit' }} />
          <button type="button" className="gd-btn" onClick={add}>Add</button>
        </div>
        {error && <p className="prop-tip saved-error">{error}</p>}
      </div>}

      <div className="acc-block">
        <span className="acc-label">People with access</span>
        <ul className="acc-people">
          <li>
            <span className="acc-avatar" aria-hidden>{who(item.savedBy).slice(0, 1).toUpperCase()}</span>
            <span className="acc-who"><span className="saved-name">{who(item.savedBy)}</span><span className="saved-meta">{fullName(item.savedBy) ? `${fullName(item.savedBy)} · ${item.savedBy}` : item.savedBy}</span></span>
            <span className="acc-owner">Owner</span>
          </li>
          {access.people.map((p) => (
            <li key={p.email}>
              <span className="acc-avatar" aria-hidden>{who(p.email).slice(0, 1).toUpperCase()}</span>
              <span className="acc-who"><span className="saved-name">{who(p.email)}</span><span className="saved-meta">{fullName(p.email) ? `${fullName(p.email)} · ${p.email}` : p.email}</span></span>
              {canShare ? (
                <>
                  <RoleSwitch value={p.role} onChange={(r) => setPerson(p.email, r)} labels={{ view: 'View', edit: 'Edit' }} />
                  <button type="button" className="gd-iconbtn gd-iconbtn--sm" onClick={() => drop(p.email)} aria-label={`Remove ${p.email}`}><CloseIcon /></button>
                </>
              ) : <span className="acc-owner">{p.role === 'edit' ? 'Can edit' : 'Can view'}</span>}
            </li>
          ))}
        </ul>
      </div>

      <div className="acc-block">
        <span className="acc-label">General access</span>
        {!canShare ? (
          <p className="prop-tip">{accessLine(access)}</p>
        ) : (<>
        <div className="gd-seg acc-general" role="radiogroup">
          <button type="button" role="radio" aria-checked={access.general === 'tool'} className="gd-seg__item"
            onClick={() => setAccess((a) => ({ ...a, general: 'tool' }))}>Everyone with the tool</button>
          <button type="button" role="radio" aria-checked={access.general === 'restricted'} className="gd-seg__item"
            onClick={() => setAccess((a) => ({ ...a, general: 'restricted' }))}>Only people added</button>
        </div>
        {access.general === 'tool' ? (
          <div className="acc-row">
            <span className="prop-tip">Everyone who can open this tool</span>
            <RoleSwitch value={access.role} onChange={(r) => setAccess((a) => ({ ...a, role: r }))} />
          </div>
        ) : (
          <p className="prop-tip">Only the owner, the people above and hub admins can see it. It disappears from everyone else's list.</p>
        )}
              </>)}
      </div>
    </Modal>
  );
}

function ConfirmDelete({ item, onCancel, onConfirm }) {
  const [busy, setBusy] = useState(false);
  return (
    <Modal open alert size="sm" onClose={onCancel} title={item.data.name ? `Delete ${item.data.name}'s certificate?` : 'Delete this certificate?'}
      desc="It is removed for everyone who can see it, and the links to it stop working. This cannot be undone."
      initialFocus=".t-cancel"
      foot={<>
        <button type="button" className="gd-btn t-cancel" onClick={onCancel}>Cancel</button>
        <button type="button" className="gd-btn gd-btn--danger" disabled={busy} onClick={async () => { setBusy(true); await onConfirm(); }}>
          {busy ? 'Deleting…' : 'Delete certificate'}
        </button>
      </>}>
      <ul className="gd-confirm__lost">
        <li>{titleOf(item)}</li>
        <li className="saved-meta">Saved by {who(item.savedBy)}, {when(item.savedAt)}</li>
      </ul>
    </Modal>
  );
}

/* ── Files home, after Google Docs' home (Utsav, 5 Oct 2026): search on top, a band to start a new
   certificate (Create new, or a template), then recent certificates with owner filter, sort and
   grid / list. Templates are the presets today; more template families can join the band. ── */
function CardMenu({ it, onOpen, onShare, onCopy, onDelete }) {
  const manage = it.can && it.can.manage;
  return (
    <GdMenuButton label={`More for ${titleOf(it)}`} icon={<DotsVIcon />} sm items={[
      { label: 'Open', icon: <OpenIcon />, onClick: () => onOpen(it) },
      { label: 'Make a copy', icon: <CopyIcon />, onClick: () => onCopy(it) },
      { label: it.can && (it.can.share || it.can.manage) ? 'Manage access' : 'Who has access', icon: <UsersIcon />, onClick: () => onShare(it) },
      manage && 'sep',
      manage && { label: 'Delete', icon: <TrashIcon />, danger: true, onClick: () => onDelete(it) },
    ]} />
  );
}

function FilesHome({ saved, me, logoSvg, onOpen, onNew, onShare, onDelete, onCopy, onTour }) {
  const [owner, setOwner] = useState('anyone');
  const [q, setQ] = useState('');
  const [limit, setLimit] = useState(30);
  const [sort, setSort] = useState('newest');
  const [layout, setLayout] = useState(() => { try { return localStorage.getItem('gw-cert-layout') || 'grid'; } catch { return 'grid'; } });
  const pickLayout = (l) => { setLayout(l); try { localStorage.setItem('gw-cert-layout', l); } catch { /* a convenience only */ } };
  const SORTS = {
    newest: (a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)),
    oldest: (a, b) => String(a.updatedAt).localeCompare(String(b.updatedAt)),
    az: (a, b) => titleOf(a).localeCompare(titleOf(b)),
  };
  const items = saved.items.filter((it) => {
    if (owner === 'me' && it.savedBy !== me) return false;
    if (owner === 'others' && it.savedBy === me) return false;
    const t = q.trim().toLowerCase();
    return !t || [titleOf(it), ...(it.pages || [it.data]).map((p) => `${p.name} ${awardLine(p)}`), who(it.savedBy), who(it.updatedBy), it.savedBy].join(' ').toLowerCase().includes(t);
  }).sort(SORTS[sort]);
  const shared = (it) => (it.access && ((it.access.people || []).length || it.access.general === 'tool')) && it.savedBy !== me;
  const sub = (it) => `${(it.pages || []).length > 1 ? `${it.pages.length} pages · ` : ''}${ago(it.updatedAt)}`;

  return (
    <div className="gd home">
      <header className="home-top">
        <a className="brand-link" href="/internal/tools" title="Back to Tools" aria-label="Back to Tools">
          <svg className="brand-icon" width="32" height="32" viewBox="0 0 160 160" fill="none" aria-hidden>
            <rect className="brand-icon__bg" width="160" height="160" rx="20" fill="#0070FF" />
            <path d="M116.609 44.5634C117.503 42.3606 115.85 40 113.472 40H49.1429C44.0934 40 40 44.0934 40 49.1429V106.778C40 112.018 45.1708 115.683 49.9603 113.557C80.8494 99.8449 104.378 74.7075 116.609 44.5634Z" fill="white" />
            <path d="M72.5161 120C71.4022 120 70.9357 118.553 71.8259 117.884C94.9007 100.527 111.434 75.8047 118.766 48.0522C118.94 47.3915 120 47.5162 120 48.1995V110.857C120 115.907 115.907 120 110.857 120H72.5161Z" fill="white" />
          </svg>
        </a>
        <h1>Certificate Creator</h1>
        <GdSearch className="home-search" value={q} onChange={setQ} placeholder="Search certificates, people, awards" />
      </header>

      <section className="home-band" aria-labelledby="start-h">
        <div className="home-wrap">
          <div className="home-band__head">
            <h2 id="start-h" className="home-h">Start a new certificate</h2>
            <button type="button" className="gd-btn gd-btn--ghost gd-btn--sm" onClick={onTour}>Take the tour</button>
          </div>
          <div className="tpl-row">
            <button type="button" className="tpl" onClick={() => onNew(TEMPLATES[0].id)}>
              <span className="tpl-thumb tpl-thumb--new"><span className="tpl-plus"><PlusIcon /></span></span>
              <span className="tpl-name">Create new</span>
              <span className="tpl-sub">{TEMPLATES[0].label}</span>
            </button>
            {TEMPLATES.map((t) => (
              <button key={t.id} type="button" className="tpl" onClick={() => onNew(t.id)}>
                <span className="tpl-thumb"><span className="tpl-sheet"><Certificate data={{ ...fromPreset(PRESETS[0]), template: t.id }} logoSvg={logoSvg} /></span></span>
                <span className="tpl-name">{t.label}</span>
                <span className="tpl-sub">{t.sub}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="home-wrap home-recent" aria-labelledby="recent-h">
        <div className="home-recent__bar">
          <h2 id="recent-h" className="home-h">Recent certificates</h2>
          <div className="home-right">
            <GdSelect label="Owner" value={owner} onChange={setOwner} options={[
              { value: 'anyone', label: 'Owned by anyone' }, { value: 'me', label: 'Owned by me' }, { value: 'others', label: 'Not owned by me' },
            ]} />
            <GdSelect label="Sort" value={sort} onChange={setSort} options={[
              { value: 'newest', label: 'Last edited' }, { value: 'oldest', label: 'Oldest first' }, { value: 'az', label: 'Name, A to Z' },
            ]} />
            <div className="gd-seg" role="radiogroup" aria-label="Layout">
              <button type="button" role="radio" aria-checked={layout === 'grid'} className="gd-seg__item gd-seg__item--icon" aria-label="Grid" tabIndex={layout === 'grid' ? 0 : -1} onClick={() => pickLayout('grid')}><GridIcon /></button>
              <button type="button" role="radio" aria-checked={layout === 'list'} className="gd-seg__item gd-seg__item--icon" aria-label="List" tabIndex={layout === 'list' ? 0 : -1} onClick={() => pickLayout('list')}><ListIcon /></button>
            </div>
          </div>
        </div>

        {saved.state === 'loading' && <p className="prop-tip home-note">Loading certificates…</p>}
        {saved.state === 'error' && <p className="prop-tip saved-error home-note">{saved.error}</p>}
        {saved.state === 'ready' && items.length === 0 && (saved.items.length
          ? <GdEmpty kind="no-results" icon={<SearchIcon />} title="Nothing matches" text="Try another search or owner.">
              <button type="button" className="gd-btn" onClick={() => { setQ(''); setOwner('anyone'); }}>Clear filters</button>
            </GdEmpty>
          : <GdEmpty icon={<PlusIcon />} title="No certificates yet" text="Create new or choose a template above to get started.">
              <button type="button" className="gd-btn gd-btn--primary" onClick={() => onNew(TEMPLATES[0].id)}><PlusIcon /> Create new</button>
            </GdEmpty>
        )}

        {layout === 'list' && items.length > 0 && (
          <div className="gd-tview">
            <div className="gd-table-wrap">
              <div className="gd-table" role="table" aria-label="Recent certificates" style={{ '--gd-cols': 'minmax(240px,2fr) minmax(120px,1fr) minmax(160px,1fr) 48px' }}>
                <div className="gd-table__row gd-table__row--head" role="row">
                  <div className="gd-table__th" role="columnheader">Name</div>
                  <div className="gd-table__th" role="columnheader">Owner</div>
                  <div className="gd-table__th" role="columnheader">Last edited</div>
                  <div className="gd-table__th" role="columnheader"><span className="gd-sr">Actions</span></div>
                </div>
                <div className="gd-table__body" role="rowgroup">
                  {items.slice(0, limit).map((it) => (
                    <div key={it.id} className="gd-table__row file-row" role="row" onClick={() => onOpen(it)}>
                      <div className="gd-table__cell" role="cell">
                        <span className="file-row-name">
                          <span className="file-mini" aria-hidden><span className="file-mini__sheet"><Certificate data={it.data} logoSvg={logoSvg} /></span></span>
                          <span className="acc-who"><span className="gd-table__cell--strong file-title">{titleOf(it)}</span><span className="gd-table__cell--muted">{(it.pages || []).length > 1 ? `${it.pages.length} pages · ` : ''}{awardLine(it.data) || 'No award'}</span></span>
                        </span>
                      </div>
                      <div className="gd-table__cell gd-table__cell--muted" role="cell">{it.savedBy === me ? 'me' : who(it.savedBy)}{it.access && it.access.general === 'restricted' && <span className="gd-tag gd-tag--neutral file-tag"><span className="gd-tag__label">Restricted</span></span>}</div>
                      <div className="gd-table__cell gd-table__cell--muted" role="cell">{ago(it.updatedAt)} · {who(it.updatedBy)}</div>
                      <div className="gd-table__cell gd-table__cell--actions" role="cell"><CardMenu it={it} onOpen={onOpen} onShare={onShare} onCopy={onCopy} onDelete={onDelete} /></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {layout === 'grid' && (
          <ul className="file-grid">
            {items.slice(0, limit).map((it) => (
              <li key={it.id} className="file-card" onClick={() => onOpen(it)}>
                <button type="button" className="file-open" onClick={(e) => { e.stopPropagation(); onOpen(it); }} aria-label={`Open ${titleOf(it)}`}>
                  <span className="file-thumb" aria-hidden><span className="file-thumb__sheet"><Certificate data={it.data} logoSvg={logoSvg} /></span></span>
                </button>
                <span className="file-info">
                  <span className="saved-name file-title">{titleOf(it)}</span>
                  <span className="file-meta-row">
                    <span className="file-meta">
                      {shared(it) && <UsersIcon />}
                      {it.access && it.access.general === 'restricted' && <LockIcon />}
                      <span className="saved-meta">{sub(it)}</span>
                    </span>
                    <CardMenu it={it} onOpen={onOpen} onShare={onShare} onCopy={onCopy} onDelete={onDelete} />
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
        {items.length > limit && (
          <div className="home-more"><button type="button" className="gd-btn" onClick={() => setLimit((n) => n + 30)}>Show more</button></div>
        )}
      </section>
    </div>
  );
}

/* ── app ──────────────────────────────────────────────────────── */
function App() {
  // a file is a set of pages, each a certificate; the editor works on one at a time
  const [pages, setPages] = useState(() => [fromPreset(PRESETS[0])]);
  const [active, setActive] = useState(0);
  const activeRef = useRef(0);
  activeRef.current = Math.min(active, pages.length - 1);
  const data = pages[activeRef.current];
  const setData = (upd) => setPages((ps) => ps.map((p, i) => (i === activeRef.current ? (typeof upd === 'function' ? upd(p) : upd) : p)));
  const [dl, setDl] = useState({ type: 'pdf', which: 'all', picked: [], dpi: 300 });
  const [dropPage, setDropPage] = useState(null);   // a page waiting on its delete confirm
  const dragFrom = useRef(null);
  const exportRefs = useRef([]);

  const [panelOpen, setPanelOpen] = useState(true);
  const [logoSvg, setLogoSvg] = useState('');
  const [scale, setScale] = useState(0.8);
  const [overflow, setOverflow] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [job, setJob] = useState({ kind: null, state: 'idle' });   // state: idle | working | ok | err
  const [saved, setSaved] = useState({ state: 'loading', items: [], error: '' });   // loading | ready | error
  const [current, setCurrent] = useState(null);       // the saved item being edited, or null for a new one
  const [saveState, setSaveState] = useState('idle'); // idle | working | ok | err
  const [saveError, setSaveError] = useState('');
  const [shareState, setShareState] = useState('idle');
  const [confirmItem, setConfirmItem] = useState(null);   // the certificate the delete dialog asks about
  const [accessItem, setAccessItem] = useState(null);     // the certificate the share dialog edits
  const [linkError, setLinkError] = useState('');
  const [filter, setFilter] = useState('');
  const [view, setView] = useState(routeOf);          // 'home' (the Files page) | 'editor'
  const [me, setMe] = useState('');
  const [fileTitle, setFileTitle] = useState('');     // empty = the default title from the name and award
  const [touched, setTouched] = useState(false);      // a new, unsaved file has been edited
  const [clash, setClash] = useState(null);           // the newer copy someone else saved
  const [leaveTo, setLeaveTo] = useState(null);       // a pending navigation away from unsaved edits
  const [, setThemeTick] = useState(0);              // re-render the file menu's Appearance checks
  const [tour, setTour] = useState(null);
  const [sigOpen, setSigOpen] = useState(false);     // Signed by stays locked until asked, per file             // the tour running: cert-home or cert-editor
  const itemsRef = useRef([]);
  const certRef = useRef(null);
  const stageRef = useRef(null);
  const savedRef = useRef(null);
  const menuRef = useRef(null);

  // the real logo file, inlined so the PDF can draw its paths
  useEffect(() => {
    fetch('/assets/logo/gushwork-logo-white.svg')
      .then((r) => r.text())
      .then((t) => setLogoSvg(t.replace('<svg ', '<svg width="100%" height="100%" ')))
      .catch(() => setLogoSvg(''));
  }, []);

  // the hub's Appearance and Help sit left of the right panel while it is open
  useEffect(() => { document.documentElement.setAttribute('data-tool-panel', view === 'home' ? 'home' : panelOpen ? 'open' : 'closed'); }, [panelOpen, view]);

  // the shared saved list, then whatever the link points at
  const loadList = useCallback(async () => {
    try {
      const j = await api('GET');
      Object.assign(NAMES, j.names || {});
      setMe(j.me || '');
      itemsRef.current = j.items || [];
      setSaved({ state: 'ready', items: j.items || [], error: '' });
      return j.items || [];
    } catch (e) {
      setSaved({ state: 'error', items: [], error: e.message });
      return [];
    }
  }, []);
  // the profile mark is drawn by tool-chrome.js into any [data-t-profile] slot
  useEffect(() => { if (window.gwProfile) window.gwProfile.draw(); }, [view, panelOpen]);

  // the first visit to each place runs its tour once, after the page has drawn
  useEffect(() => {
    if (saved.state !== 'ready' || tour) return undefined;
    const id = view === 'home' ? 'cert-home' : 'cert-editor';
    if (tourSeen(id)) return undefined;
    const t = setTimeout(() => setTour(id), 700);
    return () => clearTimeout(t);
  }, [view, saved.state]);

  // the Files list, then whatever the link points at; the fragment is the route
  const applyRoute = useCallback((items) => {
    const h = readHash();
    setView(routeOf());
    setClash(null); setLinkError(''); setTouched(false); setSigOpen(false);
    if (h.saved) {
      const it = items.find((x) => x.id === h.saved);
      if (it) { setPages(pagesOf(it)); setActive(0); setCurrent(it); setFileTitle(it.title || ''); }
      else { setCurrent(null); setLinkError('That certificate was deleted, or it is not shared with you. Ask its owner for access.'); }
    } else if (h.c) {
      const d = decodeData(h.c);
      setCurrent(null); setFileTitle('');
      if (d && d.length) { setPages(d.map((x) => ({ ...fromPreset(PRESETS[0]), ...x }))); setActive(0); }
    } else if (h.isNew) {
      // #new=<template>: that design with its first starter text
      const tpl = TEMPLATES.find((x) => x.id === h.template) || TEMPLATES[0];
      const first = { ...fromPreset(PRESETS[0]), template: tpl.id };
      setCurrent(null); setFileTitle(''); setPages([first]); setActive(0);
    } else {
      setCurrent(null);
    }
  }, []);
  useEffect(() => {
    loadList().then(applyRoute);
    const onHash = () => {
      // coming back to the Files page refreshes it, so other people's saves show up
      if (routeOf() === 'home') loadList().then(applyRoute); else applyRoute(itemsRef.current);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, [loadList, applyRoute]);

  // fit the A4 sheet into the space right of the panel, above the bar
  useLayoutEffect(() => {
    const el = stageRef.current;
    if (!el) return undefined;
    const fit = () => {
      const cs = getComputedStyle(el);
      const w = el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      const h = window.innerHeight - 48 - 168;   // the page strip sits under the sheet
      setScale(Math.max(0.3, Math.min(w / CERT.W, h / CERT.H, 1.2)));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    window.addEventListener('resize', fit);
    return () => { ro.disconnect(); window.removeEventListener('resize', fit); };
  }, [view]);

  // text that runs past the panel's bottom padding is flagged, not clipped silently
  useLayoutEffect(() => {
    const cert = certRef.current;
    if (!cert || view !== 'editor') return;
    const col = cert.querySelector('.cert-col');
    if (!col) return;
    const limit = CERT.panelInset + CERT.panelH - CERT.pad;
    const bottom = col.offsetTop + col.offsetHeight;
    setOverflow(bottom > limit);
  });

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onDoc = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setMenuOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey); };
  }, [menuOpen]);

  const set = (key) => (v) => { setTouched(true); setData((d) => ({ ...d, [key]: v, preset: ['period', 'signature', 'signedBy', 'template'].includes(key) ? d.preset : 'custom' })); };
  const onEdit = (key, v) => {
    if (key === 'citation') { setTouched(true); setData((d) => ({ ...d, ...v, preset: 'custom' })); return; }
    set(key)(v);
  };
  // the panel's citation fields take a whole pasted citation too
  const pasteCitation = (e) => {
    const parts = splitCitation(e.clipboardData.getData('text/plain'));
    if (!parts) return;
    e.preventDefault();
    onEdit('citation', parts);
  };
  const pickPreset = (id) => {
    const p = PRESETS.find((x) => x.id === id);
    if (p) { setTouched(true); setData((d) => fromPreset(p, d)); }
  };

  // named after the file when it has a name, else the one recipient, else the set
  const filename = fileTitle.trim()
    ? ['gushwork', slug(fileTitle)].join('-')
    : pages.length > 1
      ? ['gushwork-certificates', slug(pages[0].period)].filter(Boolean).join('-')
      : ['gushwork-certificate', slug(data.name), slug(data.period)].filter(Boolean).join('-');
  const title = [data.name, awardLine(data)].filter(Boolean).join(', ');

  // downloads read the off-screen sheets (one per page, never editable, never scaled)
  const chosen = () => {
    if (dl.which === 'this') return [activeRef.current];
    if (dl.which === 'pick') return dl.picked.filter((i) => i < pages.length).sort((a, b) => a - b);
    return pages.map((_, i) => i);
  };
  const run = async () => {
    const kind = dl.type;
    if (job.state === 'working') return;
    const idx = chosen();
    if (!idx.length) { setJob({ kind, state: 'err' }); setTimeout(() => setJob({ kind: null, state: 'idle' }), 2400); return; }
    setJob({ kind, state: 'working' });
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    try {
      await new Promise((r) => requestAnimationFrame(() => r()));
      const els = idx.map((i) => exportRefs.current[i]).filter(Boolean);
      const opts = { filename, title: fileTitle || title, logoSvg, dpi: dl.dpi, numbers: idx.map((i) => i + 1) };
      if (kind === 'pdf') await CertExport.exportPdf(els, opts);
      if (kind === 'jpg') await CertExport.exportJpg(els, opts);
      if (kind === 'psd') await CertExport.exportPsd(els, opts);
      setJob({ kind, state: 'ok' });
    } catch (e) {
      console.error(e);
      setJob({ kind, state: 'err' });
    }
    setTimeout(() => setJob((j) => (j.kind === kind ? { kind: null, state: 'idle' } : j)), 2400);
  };

  // arrows step through the pages (Utsav, 5 Oct 2026: "to see all pages quickly"), whenever the
  // keys are not busy typing: a field, a select or the certificate's own text keeps its arrows
  useEffect(() => {
    if (view !== 'editor') return undefined;
    const onKey = (e) => {
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      const el = document.activeElement;
      if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return;
      if (document.querySelector('dialog[open], .gd-menu, .gd-coach')) return;
      const n = pages.length, cur = activeRef.current;
      let next = null;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = Math.min(n - 1, cur + 1);
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = Math.max(0, cur - 1);
      else if (e.key === 'Home') next = 0;
      else if (e.key === 'End') next = n - 1;
      if (next === null) return;
      e.preventDefault();
      if (next === cur) return;
      setActive(next);
      requestAnimationFrame(() => {
        const tile = document.querySelectorAll('.page-tile__open')[next];
        if (tile) { tile.focus({ preventScroll: true }); tile.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' }); }
      });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [view, pages.length]);

  // pages: add (from the default template, keeping the period and signatory), duplicate, delete, reorder
  const addPage = () => { setTouched(true); const at = activeRef.current + 1; setPages((ps) => [...ps.slice(0, at), fromPreset(PRESETS[0], ps[activeRef.current]), ...ps.slice(at)]); setActive(at); };
  const duplicatePage = (i) => { setTouched(true); setPages((ps) => [...ps.slice(0, i + 1), { ...ps[i] }, ...ps.slice(i + 1)]); setActive(i + 1); };
  const deletePage = (i) => {
    setTouched(true);
    setPages((ps) => (ps.length > 1 ? ps.filter((_, j) => j !== i) : ps));
    setActive((a) => Math.max(0, a > i ? a - 1 : Math.min(a, pages.length - 2)));
    setDropPage(null);
  };
  const movePage = (from, to) => {
    if (from === to || from == null) return;
    setTouched(true);
    setPages((ps) => { const next = ps.slice(); const [m] = next.splice(from, 1); next.splice(to, 0, m); return next; });
    setActive(to);
  };
  const duplicateFile = () => {
    setCurrent(null); setTouched(true);
    setFileTitle(`Copy of ${titleOf({ title: fileTitle, data: pages[0] })}`);
    history.replaceState(null, '', '#new');
  };

  const dirty = !current || !pagesSame(pagesOf(current), pages) || (fileTitle || '') !== (current.title || '');
  const unsaved = current ? dirty : touched;

  const save = async (force) => {
    if (saveState === 'working') return;
    setSaveState('working'); setSaveError('');
    try {
      const j = await api('POST', { id: current ? current.id : undefined, pages: pages.map(pick), title: fileTitle, base: current ? current.updatedAt : undefined, force: !!force });
      setCurrent(j.item); setClash(null); setTouched(false);
      itemsRef.current = [j.item, ...itemsRef.current.filter((x) => x.id !== j.item.id)];
      history.replaceState(null, '', '#file=' + j.item.id);
      setSaved((st) => ({ state: 'ready', error: '', items: [j.item, ...st.items.filter((x) => x.id !== j.item.id)] }));
      setSaveState('ok');
    } catch (e) {
      if (e.status === 409 && e.body && e.body.item) { setClash(e.body.item); setSaveState('idle'); return; }
      setSaveError(e.message); setSaveState('err');
    }
    setTimeout(() => setSaveState((v) => (v === 'working' ? v : 'idle')), 2400);
  };

  const share = async () => {
    const hash = current && !dirty ? 'file=' + current.id : 'c=' + encodeData(pages);
    const url = location.origin + location.pathname + '#' + hash;
    try { await navigator.clipboard.writeText(url); setShareState('ok'); } catch { setShareState('err'); }
    setTimeout(() => setShareState('idle'), 2400);
  };

  // navigation goes through the fragment, so Back works; unsaved edits ask first
  const navigate = (hash) => { if (hash) location.hash = hash; else { history.pushState(null, '', location.pathname); window.dispatchEvent(new HashChangeEvent('hashchange')); } };
  const go = (hash) => {
    const doIt = () => navigate(hash);
    if (view === 'editor' && unsaved && canEdit) setLeaveTo(() => doIt); else doIt();
  };
  const openItem = (it) => go('file=' + it.id);
  const startNew = (template) => go(typeof template === 'string' ? 'new=' + template : 'new');
  const copyFile = async (it) => {
    try {
      await api('POST', { title: `Copy of ${titleOf(it)}`, pages: pagesOf(it).map(pick) });
      await loadList();
    } catch (e) { setSaved((st) => ({ ...st, error: e.message })); }
  };
  const toFiles = () => go('');
  const loadTheirs = () => {
    if (!clash) return;
    setPages(pagesOf(clash)); setActive(0); setCurrent(clash); setFileTitle(clash.title || ''); setClash(null);
    setSaved((st) => ({ ...st, items: st.items.map((x) => (x.id === clash.id ? clash : x)) }));
  };
  // delete happens only from the confirm's own Delete button
  const remove = async (it) => {
    try {
      await api('DELETE', null, '?id=' + it.id);
      setSaved((st) => ({ ...st, items: st.items.filter((x) => x.id !== it.id) }));
      itemsRef.current = itemsRef.current.filter((x) => x.id !== it.id);
      if (view === 'editor' && current && current.id === it.id) { setCurrent(null); setConfirmItem(null); navigate(''); return; }
    } catch (e) {
      setSaved((st) => ({ ...st, error: e.message }));
    }
    setConfirmItem(null);
  };
  const accessSaved = (item) => {
    setSaved((st) => ({ ...st, items: st.items.map((x) => (x.id === item.id ? item : x)) }));
    if (current && current.id === item.id) setCurrent(item);
    setAccessItem(null);
  };
  const canEdit = !current || !current.can || current.can.edit;
  const canManage = !!(current && (!current.can || current.can.manage));
  const canShareFile = !!(current && (!current.can || current.can.share || current.can.manage));
  const q = filter.trim().toLowerCase();
  const shown = saved.items.filter((it) => !q || [it.data.name, awardLine(it.data), it.savedBy, it.updatedBy].join(' ').toLowerCase().includes(q));

  const stateOf = (kind) => (job.kind === kind ? job.state : 'idle');
  const label = (kind, idle) => {
    const s = stateOf(kind);
    if (s === 'working') return 'Preparing…';
    if (s === 'ok') return 'Downloaded';
    if (s === 'err') return 'Failed. Try again';
    return idle;
  };
  const moreState = job.kind === 'jpg' || job.kind === 'psd' ? job.state : 'idle';

  const presetOptions = [
    ...PRESETS.map((p) => ({ value: p.id, label: p.label })),
    ...(data.preset === 'custom' ? [{ value: 'custom', label: 'Your own text' }] : []),
  ];

  const dialogs = (
    <>
      {accessItem && <AccessModal item={accessItem} onClose={() => setAccessItem(null)} onSaved={accessSaved} />}
      {confirmItem && <ConfirmDelete item={confirmItem} onCancel={() => setConfirmItem(null)} onConfirm={() => remove(confirmItem)} />}
      {tour && <Tour key={tour} id={tour} onEnd={() => setTour(null)} />}
      {leaveTo && (
        <Modal open size="sm" onClose={() => setLeaveTo(null)} title="Leave without saving?"
          desc="Your changes to this certificate are not saved. Leave and they are lost."
          initialFocus=".t-cancel"
          foot={<>
            <button type="button" className="gd-btn t-cancel" onClick={() => setLeaveTo(null)}>Keep editing</button>
            <button type="button" className="gd-btn gd-btn--danger" onClick={() => { const f = leaveTo; setLeaveTo(null); f(); }}>Leave without saving</button>
          </>} />
      )}
    </>
  );

  if (view === 'home') {
    return (
      <div className="app app--home">
        <FilesHome saved={saved} me={me} logoSvg={logoSvg} onOpen={openItem} onNew={startNew} onCopy={copyFile} onTour={() => setTour('cert-home')}
          onShare={(it) => setAccessItem(it)} onDelete={(it) => setConfirmItem(it)} />
        {dialogs}
      </div>
    );
  }

  return (
    <div className="app" data-panel={panelOpen ? 'open' : 'closed'}>
      {/* collapsed: the panel folds to its own header (tool-panel, 5 Oct 2026) */}
      <div className="panel-mini" aria-hidden={panelOpen}>
        <a className="brand-link" href="/internal/tools" title="Back to Tools" aria-label="Back to Tools" tabIndex={panelOpen ? -1 : 0}>
          <svg className="brand-icon" width="32" height="32" viewBox="0 0 160 160" fill="none" aria-hidden>
            <rect className="brand-icon__bg" width="160" height="160" rx="20" fill="#0070FF" />
            <path d="M116.609 44.5634C117.503 42.3606 115.85 40 113.472 40H49.1429C44.0934 40 40 44.0934 40 49.1429V106.778C40 112.018 45.1708 115.683 49.9603 113.557C80.8494 99.8449 104.378 74.7075 116.609 44.5634Z" fill="white" />
            <path d="M72.5161 120C71.4022 120 70.9357 118.553 71.8259 117.884C94.9007 100.527 111.434 75.8047 118.766 48.0522C118.94 47.3915 120 47.5162 120 48.1995V110.857C120 115.907 115.907 120 110.857 120H72.5161Z" fill="white" />
          </svg>
        </a>
        <span className="panel-mini__name">Certificate Creator</span>
        <button type="button" className="panel-reopen" onClick={() => setPanelOpen(true)} aria-label="Open editor panel" title="Open editor panel" tabIndex={panelOpen ? -1 : 0}>
          <SidebarIcon />
        </button>
      </div>

      <div className="left-col" aria-hidden={!panelOpen}>
        <header className="brand-card">
          <a className="brand-link" href="/internal/tools" title="Back to Tools" aria-label="Back to Tools">
            <svg className="brand-icon" width="32" height="32" viewBox="0 0 160 160" fill="none" aria-hidden>
              <rect className="brand-icon__bg" width="160" height="160" rx="20" fill="#0070FF" />
              <path d="M116.609 44.5634C117.503 42.3606 115.85 40 113.472 40H49.1429C44.0934 40 40 44.0934 40 49.1429V106.778C40 112.018 45.1708 115.683 49.9603 113.557C80.8494 99.8449 104.378 74.7075 116.609 44.5634Z" fill="white" />
              <path d="M72.5161 120C71.4022 120 70.9357 118.553 71.8259 117.884C94.9007 100.527 111.434 75.8047 118.766 48.0522C118.94 47.3915 120 47.5162 120 48.1995V110.857C120 115.907 115.907 120 110.857 120H72.5161Z" fill="white" />
            </svg>
          </a>
          <h1>Certificate Creator</h1>
          <button type="button" className="panel-collapse" onClick={() => setPanelOpen(false)} aria-label="Collapse editor panel" title="Collapse editor panel">
            <SidebarIcon />
          </button>
        </header>

        <aside className="form-card">
          <div className="form">
            <PropSection title="Award">
              <PropRow label="Template">
                <PropDropdown value={data.template || 'award'} options={TEMPLATES.map((t) => ({ value: t.id, label: t.label }))} onChange={set('template')} />
              </PropRow>
              <PropRow label="Starter text">
                <PropDropdown value={data.preset} options={presetOptions} onChange={pickPreset} />
              </PropRow>
              <PropRow label="Period">
                <PropInput value={data.period} onChange={set('period')} placeholder="Q2 2026" />
              </PropRow>
            </PropSection>

            <PropSection title="Recipient">
              <PropRow label="Name">
                <PropInput value={data.name} onChange={set('name')} placeholder="First name" />
              </PropRow>
              <PropRow label="Headline" align="start">
                <PropTextarea value={data.headline} onChange={set('headline')} rows={2} placeholder="landed the whales." />
              </PropRow>
            </PropSection>

            <PropSection title="Body copy">
              <PropRow label="Before" align="start">
                <PropTextarea value={data.before} onChange={set('before')} rows={3} placeholder="Text before the award, or paste the whole citation" onPaste={pasteCitation} />
              </PropRow>
              <PropRow label="Award">
                <PropInput value={data.award} onChange={set('award')} placeholder="Highest ACV of" />
              </PropRow>
              <PropRow label="After" align="start">
                <PropTextarea value={data.after} onChange={set('after')} rows={2} placeholder="Text after the award" onPaste={pasteCitation} />
              </PropRow>
            </PropSection>

            <LockedSection title="Signed by" locked={!sigOpen} onUnlock={() => setSigOpen(true)}
              prompt="Edit the signatory? Most certificates are signed by the CEO, so this rarely changes.">
              <PropRow label="Signature">
                <PropInput value={data.signature} onChange={set('signature')} placeholder="Nayrhit B." readOnly={!sigOpen} />
              </PropRow>
              <PropRow label="Name line">
                <PropInput value={data.signedBy} onChange={set('signedBy')} placeholder="Nayrhit, CEO, Gushwork" readOnly={!sigOpen} />
              </PropRow>
            </LockedSection>
          </div>
        </aside>
      </div>

      <div className="right-col" ref={savedRef} aria-hidden={!panelOpen}>
        <header className="right-head">
          <button type="button" className="saved-new right-back" onClick={toFiles}><ArrowLeftIcon /> All files</button>
          <span className="right-head__end">
          {/* the person signed in: the hub's profile mark and menu, from tool-chrome.js */}
          <button type="button" className="t-iconbtn t-iconbtn--prof" data-t-profile hidden aria-haspopup="menu" aria-expanded="false" />
          <Gd>
            <GdMenuButton label="File actions" icon={<DotsIcon />} outline sm items={[
              { label: 'New certificate', icon: <PlusIcon />, onClick: () => startNew() },
              { label: 'Make a copy', icon: <CopyIcon />, onClick: duplicateFile },
              current && { label: canShareFile ? 'Manage access' : 'Who has access', icon: <UsersIcon />, onClick: () => setAccessItem(current) },
              { label: 'Take the tour', icon: <CompassIcon />, onClick: () => setTour('cert-editor') },
              'sep',
              { section: 'Appearance' },
              { label: 'System', icon: <DesktopIcon />, checked: themeChoice() === 'system', onClick: () => { setThemeChoice('system'); setThemeTick((n) => n + 1); } },
              { label: 'Light', icon: <SunIcon />, checked: themeChoice() === 'light', onClick: () => { setThemeChoice('light'); setThemeTick((n) => n + 1); } },
              { label: 'Dark', icon: <MoonIcon />, checked: themeChoice() === 'dark', onClick: () => { setThemeChoice('dark'); setThemeTick((n) => n + 1); } },
              'sep',
              { section: 'Help' },
              { label: 'Send an email', icon: <MailIcon />, onClick: () => { location.href = 'mailto:design@gushwork.ai'; } },
              { label: 'Message on Slack', icon: <ChatIcon />, onClick: () => window.open('https://gushwork.slack.com/team/U06UAR183TR', '_blank', 'noopener') },
              canManage && 'sep',
              canManage && { label: 'Delete file', icon: <TrashIcon />, danger: true, onClick: () => setConfirmItem(current) },
            ]} />
          </Gd>
          </span>
        </header>

        <section className="prop-section">
          <label className="file-name">
            <span className="acc-label">File name</span>
            <input className="prop-input" type="text" value={fileTitle} placeholder={defaultTitle(pages[0])} maxLength={120}
              readOnly={!canEdit} onChange={(e) => { setTouched(true); setFileTitle(e.target.value); }} />
          </label>
          <p className="file-status">
            {!current ? 'Not saved yet'
              : !canEdit ? `View only · owned by ${who(current.savedBy)}`
              : `${dirty ? 'Unsaved changes' : 'Saved'} · edited by ${who(current.updatedBy)}, ${whenTime(current.updatedAt)} · ${current.access && current.access.general === 'restricted' ? 'Restricted' : 'Everyone can ' + ((current.access && current.access.role) || 'edit')}`}
          </p>
          {clash && (
            <div className="clash" role="alert">
              <p><strong>{who(clash.updatedBy)} saved a newer version</strong> at {whenTime(clash.updatedAt)}, after you opened this file.</p>
              <div className="del-confirm__acts">
                <button type="button" className="r-btn" onClick={loadTheirs}>Load theirs</button>
                <button type="button" className="r-btn r-btn--danger" onClick={() => save(true)}>Keep mine</button>
              </div>
            </div>
          )}
          <div className="right-actions">
            <button type="button" className="r-btn" onClick={() => save()}
              disabled={saveState === 'working' || (current && !dirty) || saved.state === 'error' || !canEdit}>
              {saveState === 'ok' && !dirty ? <CheckIcon /> : <SaveIcon />}
              {saveState === 'working' ? 'Saving…' : saveState === 'ok' && !dirty ? 'Saved' : saveState === 'err' ? 'Failed. Try again' : !canEdit ? 'View only' : current ? (dirty ? 'Save changes' : 'Saved') : 'Save'}
            </button>
            <button type="button" className={`r-btn${shareState === 'err' ? ' is-error' : ''}`} onClick={share}>
              {shareState === 'ok' ? <CheckIcon /> : <LinkIcon />}
              {shareState === 'ok' ? 'Link copied' : shareState === 'err' ? 'Could not copy' : 'Copy link'}
            </button>
          </div>
          {saveState === 'err' && <p className="prop-tip saved-error">{saveError}</p>}
          {linkError && <p className="prop-tip saved-error">{linkError}</p>}
        </section>

        <section className="prop-section dl-section">
          <header className="prop-section-head"><h3>Download</h3></header>
          <div className="dl-field">
            <span className="acc-label">File type</span>
            <PropDropdown value={dl.type} onChange={(v) => setDl((d) => ({ ...d, type: v }))} options={[
              { value: 'pdf', label: 'PDF, A4 vector (print)' },
              { value: 'jpg', label: 'JPG image' },
              { value: 'psd', label: 'PSD, layered' },
            ]} />
          </div>
          {dl.type === 'jpg' && (
            <div className="dl-field">
              <span className="acc-label">Quality</span>
              <div className="prop-segmented acc-general" role="tablist">
                <button type="button" role="tab" aria-selected={dl.dpi === 300} className={dl.dpi === 300 ? 'active' : ''} onClick={() => setDl((d) => ({ ...d, dpi: 300 }))}>Print, 300 dpi</button>
                <button type="button" role="tab" aria-selected={dl.dpi === 150} className={dl.dpi === 150 ? 'active' : ''} onClick={() => setDl((d) => ({ ...d, dpi: 150 }))}>Screen, 150 dpi</button>
              </div>
            </div>
          )}
          <div className="dl-field">
            <span className="acc-label">Pages</span>
            <div className="prop-segmented dl-which" role="tablist">
              {[['all', `All (${pages.length})`], ['this', `This page (${activeRef.current + 1})`], ['pick', 'Choose']].map(([k, l]) => (
                <button key={k} type="button" role="tab" aria-selected={dl.which === k} className={dl.which === k ? 'active' : ''}
                  onClick={() => setDl((d) => ({ ...d, which: k, picked: k === 'pick' && !d.picked.length ? pages.map((_, i) => i) : d.picked }))}>{l}</button>
              ))}
            </div>
            {dl.which === 'pick' && (
              <div className="dl-pick">
                {pages.map((p, i) => {
                  const on = dl.picked.includes(i);
                  return (
                    <button key={i} type="button" className={`dl-chip${on ? ' is-on' : ''}`} aria-pressed={on}
                      onClick={() => setDl((d) => ({ ...d, picked: on ? d.picked.filter((x) => x !== i) : [...d.picked, i] }))}>
                      {i + 1}<span className="dl-chip__name">{p.name || 'Untitled'}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <p className="prop-tip">{dl.type === 'pdf' ? 'One A4 file with every chosen page, sharp at any size.'
            : dl.type === 'jpg' ? `${dl.dpi === 300 ? '2480 × 3508' : '1240 × 1754'} per page. More than one page arrives as a zip.`
            : 'One layered 300 dpi file per page. More than one page arrives as a zip.'}</p>
          <button type="button" className={`r-btn r-btn--primary dl-go${job.state === 'err' ? ' is-error' : ''}`} onClick={run} disabled={job.state === 'working'}>
            {job.state === 'ok' ? <CheckIcon /> : <DownloadIcon />}
            {job.state === 'working' ? 'Preparing…' : job.state === 'ok' ? 'Downloaded' : job.state === 'err' ? (chosen().length ? 'Failed. Try again' : 'Choose a page') : 'Download'}
          </button>
        </section>
      </div>

      {dialogs}
      {dropPage != null && (
        <Modal open size="sm" onClose={() => setDropPage(null)} title={`Delete page ${dropPage + 1}?`}
          desc={`${pages[dropPage] && pages[dropPage].name ? pages[dropPage].name + "'s certificate" : 'This page'} is removed from the file when you save.`}
          initialFocus=".t-cancel"
          foot={<>
            <button type="button" className="gd-btn t-cancel" onClick={() => setDropPage(null)}>Cancel</button>
            <button type="button" className="gd-btn gd-btn--danger" onClick={() => deletePage(dropPage)}>Delete page</button>
          </>} />
      )}

      <main className="preview-col" ref={stageRef}>
        <div className="cert-stage">
          <div className="cert-scale-wrap" style={{ width: CERT.W * scale, height: CERT.H * scale }}>
            <div className="cert-scale" style={{ transform: `scale(${scale})` }}>
              <Certificate key={activeRef.current} data={data} logoSvg={logoSvg} certRef={certRef} onEdit={canEdit ? onEdit : undefined} signLocked={!sigOpen} />
            </div>
          </div>
          {overflow && <p className="cert-caption is-warn">The text runs past the panel. Shorten the headline or the citation.</p>}
        </div>
      </main>

      {/* the page strip, after Canva's: numbered pages, drag to reorder, + to add */}
      <nav className="page-strip" aria-label="Pages">
        {pages.map((p, i) => (
          <div key={i} className={`page-tile${i === activeRef.current ? ' is-on' : ''}`}
            draggable={canEdit} onDragStart={() => { dragFrom.current = i; }} onDragOver={(e) => e.preventDefault()}
            onDrop={() => { movePage(dragFrom.current, i); dragFrom.current = null; }}>
            <button type="button" className="page-tile__open" onClick={() => setActive(i)} aria-label={`Page ${i + 1}${p.name ? ', ' + p.name : ''}`} aria-current={i === activeRef.current}>
              <span className="page-tile__sheet" aria-hidden><Certificate data={p} logoSvg={logoSvg} /></span>
            </button>
            <span className="page-tile__no">{i + 1}</span>
            {canEdit && i === activeRef.current && (
              <span className="page-tile__acts">
                <button type="button" className="saved-del" onClick={() => duplicatePage(i)} aria-label={`Duplicate page ${i + 1}`} title="Duplicate"><CopyIcon /></button>
                {pages.length > 1 && <button type="button" className="saved-del" onClick={() => setDropPage(i)} aria-label={`Delete page ${i + 1}`} title="Delete page"><TrashIcon /></button>}
              </span>
            )}
          </div>
        ))}
        {canEdit && pages.length < 50 && (
          <button type="button" className="page-add" onClick={addPage} aria-label="Add a page" title="Add a page"><PlusIcon /></button>
        )}
        <span className="page-count" title="Use the arrow keys to move between pages">{activeRef.current + 1} / {pages.length} · A4</span>
      </nav>

      {/* off-screen, full-size copies of every page: what the downloads read */}
      <div className="export-stage" aria-hidden>
        {pages.map((p, i) => <Certificate key={i} data={p} logoSvg={logoSvg} certRef={(el) => { exportRefs.current[i] = el; }} />)}
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
