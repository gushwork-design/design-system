/* ─────────────────────────────────────────────────────────────────
   Award certificate generator — the panel, the preview, the bar.
   Built on /internal/tool-shell.css (gushwork-tools, v2.0.0). The
   shell's controls only: fields, the click-open dropdown, the X-Small
   switch, the one floating pill.
   ───────────────────────────────────────────────────────────────── */
const { useState, useEffect, useRef, useLayoutEffect, useCallback } = React;

const DEFAULT_PERIOD = 'Q2 2026';

function fromPreset(p, prev) {
  return {
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
const DATA_KEYS = ['preset', 'name', 'nameOwnLine', 'headline', 'before', 'award', 'after', 'period', 'signature', 'signedBy'];
function pick(d) { const o = {}; DATA_KEYS.forEach((k) => { o[k] = d[k]; }); return o; }
function same(a, b) { return DATA_KEYS.every((k) => (a[k] || '') === (b[k] || '')); }
function encodeData(d) {
  const bytes = new TextEncoder().encode(JSON.stringify(pick(d)));
  let bin = ''; bytes.forEach((b) => { bin += String.fromCharCode(b); });
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function decodeData(str) {
  try {
    const bin = atob(str.replace(/-/g, '+').replace(/_/g, '/'));
    const raw = JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0))));
    const out = {};
    DATA_KEYS.forEach((k) => { out[k] = k === 'nameOwnLine' ? raw[k] === true : String(raw[k] || ''); });
    return out;
  } catch { return null; }
}
function readHash() {
  const h = new URLSearchParams(location.hash.slice(1));
  return { saved: h.get('saved') || '', c: h.get('c') || '' };
}
function when(iso) {
  try { return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); } catch { return ''; }
}
function whenTime(iso) {
  try { return new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch { return ''; }
}
function who(email) { return String(email || '').split('@')[0] || 'someone'; }

async function api(method, body, query = '') {
  const r = await fetch('/api/certificates' + query, {
    method, credentials: 'same-origin',
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  let j = null; try { j = await r.json(); } catch { /* not JSON: the endpoint is not there */ }
  if (!r.ok || !j) throw new Error((j && j.error) || 'The saved list is not available here.');
  return j;
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

function PropInput({ value, onChange, placeholder }) {
  return (
    <input className="prop-input" type="text" value={value || ''} placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)} spellCheck={false} />
  );
}

function PropTextarea({ value, onChange, placeholder, rows = 3 }) {
  return (
    <textarea className="prop-input prop-textarea" value={value || ''} placeholder={placeholder} rows={rows}
      onChange={(e) => onChange(e.target.value)} />
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
        <span className="prop-dropdown-value">{selected ? selected.label : 'Custom'}</span>
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
function CheckIcon() {
  return (
    <svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
      <path d="M229.66,77.66l-128,128a8,8,0,0,1-11.32,0l-56-56a8,8,0,0,1,11.32-11.32L96,188.69,218.34,66.34a8,8,0,0,1,11.32,11.32Z" />
    </svg>
  );
}

/* ── overlays: the library's modal and confirm dialog, on the tool shell's tokens ── */
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
    <dialog ref={ref} className={`t-modal t-modal--${size}`} role={alert ? 'alertdialog' : 'dialog'} aria-labelledby="t-modal-title"
      onCancel={(e) => { e.preventDefault(); onClose(); }}
      onMouseDown={(e) => { if (e.target === ref.current) onClose(); }}>
      {open && (
        <>
          <div className="t-modal__head">
            <div>
              <h2 className="t-modal__title" id="t-modal-title">{title}</h2>
              {desc && <p className="t-modal__desc">{desc}</p>}
            </div>
            <button type="button" className="t-modal__close" onClick={onClose} aria-label="Close"><CloseIcon /></button>
          </div>
          <div className="t-modal__body">{children}</div>
          <div className="t-modal__foot">{foot}</div>
        </>
      )}
    </dialog>
  );
}

function RoleSwitch({ value, onChange, labels = { view: 'Can view', edit: 'Can edit' } }) {
  return (
    <div className="prop-segmented role-switch" role="tablist">
      {['view', 'edit'].map((r) => (
        <button key={r} type="button" role="tab" aria-selected={value === r} className={value === r ? 'active' : ''} onClick={() => onChange(r)}>{labels[r]}</button>
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
    <Modal open onClose={onClose} title={item.data.name ? `Share ${item.data.name}'s certificate` : 'Share this certificate'}
      desc="Choose who can see and edit this certificate. The tool's own access still applies on top."
      initialFocus=".acc-add input"
      foot={<>
        <button type="button" className="r-btn" onClick={onClose}>Cancel</button>
        <button type="button" className="r-btn r-btn--primary" onClick={submit} disabled={busy}>{busy ? 'Saving…' : 'Save access'}</button>
      </>}>
      <div className="acc-block">
        <span className="acc-label">Add people</span>
        <div className="acc-add">
          <input className="prop-input" type="email" value={email} placeholder="name@gushwork.ai"
            onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }} />
          <RoleSwitch value={role} onChange={setRole} labels={{ view: 'View', edit: 'Edit' }} />
          <button type="button" className="r-btn" onClick={add}>Add</button>
        </div>
        {error && <p className="prop-tip saved-error">{error}</p>}
      </div>

      <div className="acc-block">
        <span className="acc-label">People with access</span>
        <ul className="acc-people">
          <li>
            <span className="acc-avatar" aria-hidden>{who(item.savedBy).slice(0, 1).toUpperCase()}</span>
            <span className="acc-who"><span className="saved-name">{who(item.savedBy)}</span><span className="saved-meta">{item.savedBy}</span></span>
            <span className="acc-owner">Owner</span>
          </li>
          {access.people.map((p) => (
            <li key={p.email}>
              <span className="acc-avatar" aria-hidden>{who(p.email).slice(0, 1).toUpperCase()}</span>
              <span className="acc-who"><span className="saved-name">{who(p.email)}</span><span className="saved-meta">{p.email}</span></span>
              <RoleSwitch value={p.role} onChange={(r) => setPerson(p.email, r)} labels={{ view: 'View', edit: 'Edit' }} />
              <button type="button" className="saved-del acc-remove" onClick={() => drop(p.email)} aria-label={`Remove ${p.email}`} title="Remove"><CloseIcon /></button>
            </li>
          ))}
        </ul>
      </div>

      <div className="acc-block">
        <span className="acc-label">General access</span>
        <div className="prop-segmented acc-general" role="tablist">
          <button type="button" role="tab" aria-selected={access.general === 'tool'} className={access.general === 'tool' ? 'active' : ''}
            onClick={() => setAccess((a) => ({ ...a, general: 'tool' }))}>Everyone with the tool</button>
          <button type="button" role="tab" aria-selected={access.general === 'restricted'} className={access.general === 'restricted' ? 'active' : ''}
            onClick={() => setAccess((a) => ({ ...a, general: 'restricted' }))}>Only people added</button>
        </div>
        {access.general === 'tool' ? (
          <div className="acc-row">
            <span className="prop-tip">Everyone who can open this tool</span>
            <RoleSwitch value={access.role} onChange={(r) => setAccess((a) => ({ ...a, role: r }))} />
          </div>
        ) : (
          <p className="prop-tip">Only you, the people above and hub admins can see it. It disappears from everyone else's list.</p>
        )}
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
        <button type="button" className="r-btn t-cancel" onClick={onCancel}>Cancel</button>
        <button type="button" className="r-btn r-btn--danger" disabled={busy} onClick={async () => { setBusy(true); await onConfirm(); }}>
          {busy ? 'Deleting…' : 'Delete certificate'}
        </button>
      </>}>
      <ul className="t-confirm__lost">
        <li>{item.data.name || 'Untitled'} · {awardLine(item.data) || 'No award'}</li>
        <li className="saved-meta">Saved by {who(item.savedBy)}, {when(item.savedAt)}</li>
      </ul>
    </Modal>
  );
}

/* ── app ──────────────────────────────────────────────────────── */
function App() {
  const [data, setData] = useState(() => fromPreset(PRESETS[0]));
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
  useEffect(() => { document.documentElement.setAttribute('data-tool-panel', panelOpen ? 'open' : 'closed'); }, [panelOpen]);

  // the shared saved list, then whatever the link points at
  const loadList = useCallback(async () => {
    try {
      const j = await api('GET');
      setSaved({ state: 'ready', items: j.items || [], error: '' });
      return j.items || [];
    } catch (e) {
      setSaved({ state: 'error', items: [], error: e.message });
      return [];
    }
  }, []);
  useEffect(() => {
    const h = readHash();
    if (h.c) { const d = decodeData(h.c); if (d) setData((prev) => ({ ...prev, ...d })); }
    loadList().then((items) => {
      if (!h.saved) return;
      const it = items.find((x) => x.id === h.saved);
      if (it) { setData((prev) => ({ ...prev, ...it.data })); setCurrent(it); }
      else setLinkError('That certificate was deleted, or it is not shared with you. Ask its owner for access.');
    });
  }, [loadList]);

  // fit the A4 sheet into the space right of the panel, above the bar
  useLayoutEffect(() => {
    const el = stageRef.current;
    if (!el) return undefined;
    const fit = () => {
      const cs = getComputedStyle(el);
      const w = el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      const h = window.innerHeight - 56 - 112;
      setScale(Math.max(0.3, Math.min(w / CERT.W, h / CERT.H, 1.2)));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    window.addEventListener('resize', fit);
    return () => { ro.disconnect(); window.removeEventListener('resize', fit); };
  }, []);

  // text that runs past the panel's bottom padding is flagged, not clipped silently
  useLayoutEffect(() => {
    const cert = certRef.current;
    if (!cert) return;
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

  const set = (key) => (v) => setData((d) => ({ ...d, [key]: v, preset: key === 'period' || key === 'signature' || key === 'signedBy' ? d.preset : 'custom' }));
  const pickPreset = (id) => {
    const p = PRESETS.find((x) => x.id === id);
    if (p) setData((d) => fromPreset(p, d));
  };

  const filename = ['gushwork-certificate', slug(data.name), slug(data.period)].filter(Boolean).join('-');
  const title = [data.name, awardLine(data)].filter(Boolean).join(', ');

  const run = useCallback(async (kind) => {
    setMenuOpen(false);
    if (!certRef.current || job.state === 'working') return;
    setJob({ kind, state: 'working' });
    try {
      const opts = { filename, title, logoSvg };
      if (kind === 'pdf') await CertExport.exportPdf(certRef.current, opts);
      if (kind === 'jpg') await CertExport.exportJpg(certRef.current, opts);
      if (kind === 'psd') await CertExport.exportPsd(certRef.current, opts);
      setJob({ kind, state: 'ok' });
    } catch (e) {
      console.error(e);
      setJob({ kind, state: 'err' });
    }
    setTimeout(() => setJob((j) => (j.kind === kind ? { kind: null, state: 'idle' } : j)), 2400);
  }, [filename, title, logoSvg, job.state]);

  const dirty = !current || !same(current.data, data);

  const save = async () => {
    if (saveState === 'working') return;
    setSaveState('working'); setSaveError('');
    try {
      const j = await api('POST', { id: current ? current.id : undefined, data: pick(data) });
      setCurrent(j.item);
      history.replaceState(null, '', '#saved=' + j.item.id);
      setSaved((st) => ({ state: 'ready', error: '', items: [j.item, ...st.items.filter((x) => x.id !== j.item.id)] }));
      setSaveState('ok');
    } catch (e) {
      setSaveError(e.message); setSaveState('err');
    }
    setTimeout(() => setSaveState((v) => (v === 'working' ? v : 'idle')), 2400);
  };

  const share = async () => {
    const hash = current && !dirty ? 'saved=' + current.id : 'c=' + encodeData(data);
    const url = location.origin + location.pathname + '#' + hash;
    try { await navigator.clipboard.writeText(url); setShareState('ok'); } catch { setShareState('err'); }
    setTimeout(() => setShareState('idle'), 2400);
  };

  const openItem = (it) => {
    setData((prev) => ({ ...prev, ...it.data }));
    setCurrent(it);
    setLinkError('');
    history.replaceState(null, '', '#saved=' + it.id);
  };
  const startNew = () => {
    setCurrent(null);
    setData((d) => fromPreset(PRESETS[0], d));
    history.replaceState(null, '', location.pathname);
  };
  // delete happens only from the confirm's own Delete button
  const remove = async (it) => {
    try {
      await api('DELETE', null, '?id=' + it.id);
      setSaved((st) => ({ ...st, items: st.items.filter((x) => x.id !== it.id) }));
      if (current && current.id === it.id) { setCurrent(null); history.replaceState(null, '', location.pathname); }
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
    ...(data.preset === 'custom' ? [{ value: 'custom', label: 'Custom' }] : []),
  ];

  return (
    <div className="app" data-panel={panelOpen ? 'open' : 'closed'}>
      <button type="button" className="panel-reopen" onClick={() => setPanelOpen(true)} aria-label="Open editor panel" title="Open editor panel">
        <SidebarIcon />
      </button>

      <div className="left-col" aria-hidden={!panelOpen}>
        <header className="brand-card">
          <a className="brand-link" href="/internal/tools" title="Back to Tools" aria-label="Back to Tools">
            <svg className="brand-icon" width="32" height="32" viewBox="0 0 160 160" fill="none" aria-hidden>
              <rect width="160" height="160" rx="20" fill="#0D0D0D" />
              <path d="M116.609 44.5634C117.503 42.3606 115.85 40 113.472 40H49.1429C44.0934 40 40 44.0934 40 49.1429V106.778C40 112.018 45.1708 115.683 49.9603 113.557C80.8494 99.8449 104.378 74.7075 116.609 44.5634Z" fill="white" />
              <path d="M72.5161 120C71.4022 120 70.9357 118.553 71.8259 117.884C94.9007 100.527 111.434 75.8047 118.766 48.0522C118.94 47.3915 120 47.5162 120 48.1995V110.857C120 115.907 115.907 120 110.857 120H72.5161Z" fill="white" />
            </svg>
          </a>
          <h1>Award certificate</h1>
          <button type="button" className="panel-collapse" onClick={() => setPanelOpen(false)} aria-label="Collapse editor panel" title="Collapse editor panel">
            <SidebarIcon />
          </button>
        </header>

        <aside className="form-card">
          <div className="form">
            <PropSection title="Award">
              <PropRow label="Template">
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

            <PropSection title="Citation">
              <PropRow label="Before" align="start">
                <PropTextarea value={data.before} onChange={set('before')} rows={3} placeholder="Text before the award" />
              </PropRow>
              <PropRow label="Award">
                <PropInput value={data.award} onChange={set('award')} placeholder="Highest ACV of" />
              </PropRow>
              <PropRow label="After" align="start">
                <PropTextarea value={data.after} onChange={set('after')} rows={2} placeholder="Text after the award" />
              </PropRow>
              <p className="prop-tip">The award and the period print together in blue: <strong>{awardLine(data) || 'nothing yet'}</strong></p>
            </PropSection>

            <PropSection title="Signed by">
              <PropRow label="Signature">
                <PropInput value={data.signature} onChange={set('signature')} placeholder="Nayrhit B." />
              </PropRow>
              <PropRow label="Name line">
                <PropInput value={data.signedBy} onChange={set('signedBy')} placeholder="Nayrhit, CEO, Gushwork" />
              </PropRow>
            </PropSection>
          </div>
        </aside>
      </div>

      <div className="right-col" ref={savedRef} aria-hidden={!panelOpen}>
        <header className="right-head">
          <h2>Save and share</h2>
          {current && <button type="button" className="saved-new" onClick={startNew}>New certificate</button>}
        </header>

        <section className="prop-section">
          <header className="prop-section-head"><h3>This certificate</h3></header>
          <div className="this-card">
            <span className="saved-name">{data.name || 'Untitled'}</span>
            <span className="saved-meta">{awardLine(data) || 'No award'}</span>
            <dl className="this-meta">
              {current ? (
                <>
                  <div><dt>Created</dt><dd>{who(current.savedBy)}, {when(current.savedAt)}</dd></div>
                  <div><dt>Last edited</dt><dd>{who(current.updatedBy)}, {whenTime(current.updatedAt)}</dd></div>
                  <div><dt>Status</dt><dd>{!canEdit ? 'View only' : dirty ? 'Unsaved changes' : 'Saved'}</dd></div>
                  <div><dt>Access</dt><dd title={accessLine(current.access)}>{accessLine(current.access)}</dd></div>
                </>
              ) : (
                <div><dt>Status</dt><dd>Not saved yet</dd></div>
              )}
            </dl>
          </div>
          <div className="right-actions">
            <button type="button" className="r-btn r-btn--primary" onClick={save}
              disabled={saveState === 'working' || (current && !dirty) || saved.state === 'error' || !canEdit}
              title={!canEdit ? 'You can view this certificate. Ask its owner for edit access.' : undefined}>
              {saveState === 'ok' && !dirty ? <CheckIcon /> : <SaveIcon />}
              {saveState === 'working' ? 'Saving…' : saveState === 'ok' && !dirty ? 'Saved' : saveState === 'err' ? 'Failed. Try again' : !canEdit ? 'View only' : current ? (dirty ? 'Save changes' : 'Saved') : 'Save'}
            </button>
            <button type="button" className={`r-btn${shareState === 'err' ? ' is-error' : ''}`} onClick={share}>
              {shareState === 'ok' ? <CheckIcon /> : <LinkIcon />}
              {shareState === 'ok' ? 'Link copied' : shareState === 'err' ? 'Could not copy' : 'Copy link'}
            </button>
          </div>
          {saveState === 'err' && <p className="prop-tip saved-error">{saveError}</p>}
          <p className="prop-tip">{current && !dirty
            ? (current.access && current.access.general === 'restricted'
              ? 'The link opens this certificate only for the people who have access to it.'
              : 'The link opens this saved certificate for anyone with access to the tool.')
            : 'Unsaved, the link carries the details in it. Save first to share the copy everyone edits.'}</p>
          {canManage && (
            <div className="right-actions">
              <button type="button" className="r-btn" onClick={() => setAccessItem(current)}><UsersIcon /> Manage access</button>
              <button type="button" className="r-btn r-btn--danger-quiet" onClick={() => setConfirmItem(current)}><TrashIcon /> Delete</button>
            </div>
          )}
          {current && !canManage && <p className="prop-tip">Owned by {who(current.savedBy)}. Only they can change who has access or delete it.</p>}
          {linkError && <p className="prop-tip saved-error">{linkError}</p>}
        </section>

        <section className="prop-section saved-section">
          <header className="prop-section-head saved-head">
            <h3>Saved{saved.state === 'ready' && saved.items.length ? ` · ${saved.items.length}` : ''}</h3>
          </header>
          {saved.state === 'loading' && <p className="prop-tip">Loading the saved list…</p>}
          {saved.state === 'error' && <p className="prop-tip saved-error">{saved.error}</p>}
          {saved.state === 'ready' && saved.items.length === 0 && (
            <p className="prop-tip">Nothing saved yet. Save a certificate and everyone with access to this tool sees it here.</p>
          )}
          {saved.state === 'ready' && saved.items.length > 5 && (
            <input className="prop-input" type="search" value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Search by name, award or person" />
          )}
          {saved.state === 'ready' && shown.length > 0 && (
            <ul className="saved-list">
              {shown.map((it) => (
                <li key={it.id} className={`saved-row${current && current.id === it.id ? ' is-on' : ''}`}>
                  <button type="button" className="saved-open" onClick={() => openItem(it)}>
                    <span className="saved-name">{it.data.name || 'Untitled'}{it.access && it.access.general === 'restricted' && <span className="saved-tag">Restricted</span>}{it.can && !it.can.edit && <span className="saved-tag">View only</span>}</span>
                    <span className="saved-meta">{awardLine(it.data) || 'No award'}</span>
                    <span className="saved-meta">Saved by {who(it.savedBy)}, {when(it.savedAt)}</span>
                    {(it.updatedAt !== it.savedAt) && <span className="saved-meta">Edited by {who(it.updatedBy)}, {when(it.updatedAt)}</span>}
                  </button>
                  {(!it.can || it.can.manage) && (
                    <button type="button" className="saved-del" onClick={() => setConfirmItem(it)} aria-label={`Delete ${it.data.name || 'certificate'}`} title="Delete">
                      <TrashIcon />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
          {saved.state === 'ready' && saved.error && <p className="prop-tip saved-error">{saved.error}</p>}
        </section>
      </div>

      {accessItem && <AccessModal item={accessItem} onClose={() => setAccessItem(null)} onSaved={accessSaved} />}
      {confirmItem && <ConfirmDelete item={confirmItem} onCancel={() => setConfirmItem(null)} onConfirm={() => remove(confirmItem)} />}

      <main className="preview-col" ref={stageRef}>
        <div className="cert-stage">
          <div className="cert-scale-wrap" style={{ width: CERT.W * scale, height: CERT.H * scale }}>
            <div className="cert-scale" style={{ transform: `scale(${scale})` }}>
              <Certificate data={data} logoSvg={logoSvg} certRef={certRef} />
            </div>
          </div>
          <p className={`cert-caption${overflow ? ' is-warn' : ''}`}>
            {overflow ? 'The text runs past the panel. Shorten the headline or the citation.' : 'A4 · 210 × 297 mm'}
          </p>
        </div>
      </main>

      <div className="floating-toolbar">
        <div className="tb-pill">
          <div className="split-button" ref={menuRef}>
            <button type="button" className={moreState === 'err' ? 'btn-error' : ''}
              onClick={() => setMenuOpen((v) => !v)} aria-haspopup="menu" aria-expanded={menuOpen}
              disabled={job.state === 'working'}>
              {moreState === 'ok' ? <CheckIcon /> : <DownloadIcon />}
              {moreState === 'idle' ? 'Download' : label(job.kind, 'Download')}
              <CaretIcon />
            </button>
            {menuOpen && (
              <div className="split-menu" role="menu">
                <button type="button" className="split-menu-item" role="menuitem" onClick={() => run('jpg')}>
                  <span className="item-main">JPG, 300 dpi</span>
                  <span className="item-hint">2480 × 3508, for print kiosks and sharing</span>
                </button>
                <button type="button" className="split-menu-item" role="menuitem" onClick={() => run('psd')}>
                  <span className="item-main">PSD, layered</span>
                  <span className="item-hint">One image layer per part, 300 dpi</span>
                </button>
              </div>
            )}
          </div>
          <div className="copy-btn-wrap">
          <button type="button"
            className={`btn-primary${stateOf('pdf') === 'ok' ? ' copied' : ''}${stateOf('pdf') === 'err' ? ' btn-error' : ''}`}
            onClick={() => run('pdf')} disabled={job.state === 'working'}>
            {stateOf('pdf') === 'ok' ? <CheckIcon /> : <DownloadIcon />}
            {label('pdf', 'Download PDF')}
          </button>
          </div>
        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
