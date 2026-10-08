/* ─────────────────────────────────────────────────────────────
   Publish — put a page into your team's staging lane.
   Built on /internal/tool-shell.css (gushwork-tools, v2.0.7). The shell's
   controls only: fields, the click-open dropdown, the segmented tabs, the
   dropzone, the one floating pill. The checks run on the server
   (api/_publish.js, op=check), so what this page says is what Publish does.
   ───────────────────────────────────────────────────────────── */
const { useState, useEffect, useRef, useCallback } = React;

const API = '/api/publish';
const HDR = { 'content-type': 'application/json', 'x-gw-publish': '1' };

const slug = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40).replace(/-+$/g, '');
const kb = (n) => (n < 1024 * 100 ? `${(n / 1024).toFixed(n < 10240 ? 1 : 0)} KB` : `${(n / 1048576).toFixed(1)} MB`);
const JUNK = /(^|\/)(\.DS_Store|__MACOSX|Thumbs\.db)(\/|$)/;

/* What the shell checks for, in the order a person fixes them. The server judges; this is the legend. */
const RULES = [
  ['Page', 'An index.html. Its web address and noindex are added for you.'],
  ['Files', 'Static files only, up to 3 MB in all.'],
  ['Safety', 'No secret keys, and no calls to the hub’s /api/ or /admin/.'],
  ['Type', 'Uses the Gushwork type tokens, as every page on the hub does.'],
];

/* ── files in ─────────────────────────────────────────────────── */

/* Every file under a dropped folder, with its path inside it. */
async function walk(entry, prefix, out) {
  if (entry.isFile) {
    const file = await new Promise((res, rej) => entry.file(res, rej));
    out.push({ path: prefix + entry.name, file });
  } else if (entry.isDirectory) {
    const reader = entry.createReader();
    for (;;) {
      const batch = await new Promise((res, rej) => reader.readEntries(res, rej));
      if (!batch.length) break;
      for (const e of batch) await walk(e, prefix + entry.name + '/', out);
    }
  }
}

/* Drop the folder's own name, so ./agent-store/index.html is index.html. A lone .html file becomes index.html. */
function tidy(list) {
  let files = list.filter((f) => !JUNK.test(f.path));
  const top = new Set(files.map((f) => f.path.split('/')[0]));
  if (files.length && files.every((f) => f.path.includes('/')) && top.size === 1) {
    files = files.map((f) => ({ ...f, path: f.path.slice(f.path.indexOf('/') + 1) }));
  }
  const html = files.filter((f) => /\.html?$/i.test(f.path) && !f.path.includes('/'));
  if (!files.some((f) => f.path === 'index.html') && html.length === 1) {
    files = files.map((f) => (f === html[0] ? { ...f, path: 'index.html' } : f));
  }
  return files;
}

const readBytes = (file) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsArrayBuffer(file); });
const b64 = (buf) => { let s = ''; const a = new Uint8Array(buf); for (let i = 0; i < a.length; i += 0x8000) s += String.fromCharCode.apply(null, a.subarray(i, i + 0x8000)); return btoa(s); };

/* index.html gets its base address and noindex if it has none, because a designer should not need to know them. */
function fixIndex(text, lane, page) {
  const base = `<base href="/internal/staging/${lane}/${page}/">`;
  let t = text;
  if (/<base\s[^>]*href=/i.test(t)) t = t.replace(/<base\s[^>]*>/i, base);
  else if (/<head[^>]*>/i.test(t)) t = t.replace(/<head[^>]*>/i, (m) => `${m}\n${base}`);
  else t = `${base}\n${t}`;
  if (!/<meta[^>]+name=["']robots["'][^>]+noindex/i.test(t)) t = t.replace(/<head[^>]*>/i, (m) => `${m}\n<meta name="robots" content="noindex, nofollow">`);
  return t;
}

async function encode(files, lane, page) {
  const out = [];
  for (const f of files) {
    let buf = await readBytes(f.file);
    if (f.path === 'index.html') buf = new TextEncoder().encode(fixIndex(new TextDecoder().decode(buf), lane, page));
    out.push({ path: f.path, b64: b64(buf) });
  }
  return out;
}

/* ── the preview: the page, from the files in this tab, never from the network ───────────────── */

const isLocal = (u) => u && !/^([a-z][a-z0-9+.-]*:|\/\/|\/|#)/i.test(u);
function join(dir, rel) {
  const parts = (dir ? dir.split('/') : []).concat(rel.split(/[?#]/)[0].split('/')), out = [];
  for (const p of parts) { if (p === '..') out.pop(); else if (p && p !== '.') out.push(p); }
  return out.join('/');
}

/* The preview is a sandboxed frame, which has no origin, so it cannot load a blob: address this tab made. Everything the
   page needs is therefore written into it: stylesheets and scripts inline, images and fonts as data: addresses. */
const dataUrl = (file) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file); });

async function buildPreview(files) {
  const byPath = new Map(files.map((f) => [f.path, f.file]));
  const cache = new Map();
  const asData = async (path) => {
    if (!cache.has(path)) cache.set(path, dataUrl(byPath.get(path)));
    return cache.get(path);
  };
  const fixCss = async (path, text) => {
    const dir = path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : '';
    const found = [...text.matchAll(/url\(\s*(['"]?)([^'")]+)\1\s*\)/g)];
    let out = text;
    for (const m of found) {
      if (!isLocal(m[2])) continue;
      const rel = join(dir, m[2]);
      if (byPath.has(rel)) out = out.split(m[0]).join(`url(${m[1]}${await asData(rel)}${m[1]})`);
    }
    return out;
  };
  const index = byPath.get('index.html');
  if (!index) return { html: '', revoke() {} };
  const doc = new DOMParser().parseFromString(await index.text(), 'text/html');
  doc.querySelectorAll('base').forEach((b) => b.remove());
  for (const el of [...doc.querySelectorAll('link[href],script[src],[src],[poster]')]) {
    const tag = el.tagName;
    if (tag === 'LINK') {
      const href = el.getAttribute('href') || '';
      if (/^\/(?!\/)[^?#]*\.css(\?|#|$)/i.test(href)) {
        // a hub stylesheet such as /foundation/tokens.css: read it here and write it in, with its urls made absolute
        try {
          const css = await (await fetch(href.split(/[?#]/)[0], { credentials: 'same-origin' })).text();
          const st = doc.createElement('style');
          st.textContent = css.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/g, (m, q, u) => (/^(data:|https?:|\/)/.test(u) ? m : `url(${q}${new URL(u, location.origin + href.split(/[?#]/)[0]).pathname}${q})`));
          el.replaceWith(st);
        } catch { /* leave the link, the page still shows */ }
        continue;
      }
      const path = isLocal(href) ? join('', href) : '';
      if (path && byPath.has(path) && /\.css$/i.test(path)) {
        const st = doc.createElement('style');
        st.textContent = await fixCss(path, await byPath.get(path).text());
        el.replaceWith(st);
      }
      continue;
    }
    if (tag === 'SCRIPT') {
      const path = isLocal(el.getAttribute('src')) ? join('', el.getAttribute('src')) : '';
      if (path && byPath.has(path)) {
        const sc = doc.createElement('script');
        if (el.getAttribute('type')) sc.setAttribute('type', el.getAttribute('type'));
        sc.textContent = (await byPath.get(path).text()).replace(/<\/script/gi, '<\\/script');
        el.replaceWith(sc);
      }
      continue;
    }
    for (const attr of ['src', 'poster']) {
      const v = el.getAttribute(attr);
      if (isLocal(v) && byPath.has(join('', v))) el.setAttribute(attr, await asData(join('', v)));
    }
  }
  for (const s of doc.querySelectorAll('style')) s.textContent = await fixCss('index.html', s.textContent);
  for (const el of doc.querySelectorAll('[style]')) el.setAttribute('style', await fixCss('index.html', el.getAttribute('style')));
  return { html: '<!doctype html>' + doc.documentElement.outerHTML, revoke() {} };
}

/* ── controls (the shell's own, as the other tools) ───────────── */
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
function PropInput({ value, onChange, placeholder, maxLength }) {
  return <input className="prop-input" type="text" value={value || ''} placeholder={placeholder} maxLength={maxLength} onChange={(e) => onChange(e.target.value)} spellCheck={false} />;
}
function PropTextarea({ value, onChange, placeholder, rows = 3, maxLength }) {
  return <textarea className="prop-input prop-textarea" value={value || ''} placeholder={placeholder} rows={rows} maxLength={maxLength} onChange={(e) => onChange(e.target.value)} />;
}
/* Opens on click, never on hover; a plain check on the selected row. */
function PropDropdown({ value, options, onChange, placeholder }) {
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
      <button type="button" className="prop-dropdown-trigger" onClick={() => setOpen((v) => !v)} aria-haspopup="listbox" aria-expanded={open}>
        <span className="prop-dropdown-value">{selected ? selected.label : placeholder}</span>
        <svg className="prop-dropdown-caret" width="12" height="12" viewBox="0 0 12 12" aria-hidden>
          <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div className="prop-dropdown-menu" role="listbox">
          {options.map((o) => {
            const on = o.value === value;
            return (
              <button key={o.value} type="button" role="option" aria-selected={on} className={`prop-dropdown-item${on ? ' active' : ''}`}
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
const Icon = ({ d }) => <svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d={d} /></svg>;
const SidebarIcon = () => <Icon d="M216,40H40A16,16,0,0,0,24,56V200a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A16,16,0,0,0,216,40ZM40,56H80V200H40ZM216,200H96V56H216V200Z" />;
const CheckIcon = () => <Icon d="M229.66,77.66l-128,128a8,8,0,0,1-11.32,0l-56-56a8,8,0,0,1,11.32-11.32L96,188.69,218.34,66.34a8,8,0,0,1,11.32,11.32Z" />;
const XIcon = () => <Icon d="M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z" />;
const CopyIcon = () => <Icon d="M216,32H88a8,8,0,0,0-8,8V80H40a8,8,0,0,0-8,8V216a8,8,0,0,0,8,8H168a8,8,0,0,0,8-8V176h40a8,8,0,0,0,8-8V40A8,8,0,0,0,216,32ZM160,208H48V96H160Zm48-48H176V88a8,8,0,0,0-8-8H96V48H208Z" />;
const TrashIcon = () => <Icon d="M216,48H176V40a24,24,0,0,0-24-24H104A24,24,0,0,0,80,40v8H40a8,8,0,0,0,0,16h8V208a16,16,0,0,0,16,16H192a16,16,0,0,0,16-16V64h8a8,8,0,0,0,0-16ZM96,40a8,8,0,0,1,8-8h48a8,8,0,0,1,8,8v8H96Zm96,168H64V64H192ZM112,104v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Zm48,0v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Z" />;
const UploadIcon = () => <Icon d="M240,136v64a16,16,0,0,1-16,16H32a16,16,0,0,1-16-16V136a16,16,0,0,1,16-16H80a8,8,0,0,1,0,16H32v64H224V136H176a8,8,0,0,1,0-16h48A16,16,0,0,1,240,136ZM85.66,77.66,120,43.31V128a8,8,0,0,0,16,0V43.31l34.34,34.35a8,8,0,0,0,11.32-11.32l-48-48a8,8,0,0,0-11.32,0l-48,48A8,8,0,0,0,85.66,77.66Z" />;
const OpenIcon = () => <Icon d="M200,64V168a8,8,0,0,1-16,0V83.31L69.66,197.66a8,8,0,0,1-11.32-11.32L172.69,72H88a8,8,0,0,1,0-16H192A8,8,0,0,1,200,64Z" />;

async function api(op, body) {
  const r = await fetch(`${API}?op=${op}`, { method: 'POST', headers: HDR, credentials: 'same-origin', body: JSON.stringify(body || {}) });
  let j = {};
  try { j = await r.json(); } catch { /* an empty body */ }
  return { ok: r.ok, status: r.status, ...j };
}

/* ── the tool ─────────────────────────────────────────────────── */
function App() {
  const [boot, setBoot] = useState({ state: 'loading' });
  const [panelOpen, setPanelOpen] = useState(true);
  const [tab, setTab] = useState('upload');
  const [lane, setLane] = useState('');
  const [page, setPage] = useState('');
  const [pageTouched, setPageTouched] = useState(false);
  const [title, setTitle] = useState('');
  const [blurb, setBlurb] = useState('');
  const [owner, setOwner] = useState('');
  const [files, setFiles] = useState([]);
  const [drag, setDrag] = useState(false);
  const [check, setCheck] = useState({ state: 'idle', problems: [] });
  const [pub, setPub] = useState({ state: 'idle' });
  const [preview, setPreview] = useState('');
  const [tokens, setTokens] = useState([]);
  const [label, setLabel] = useState('');
  const [fresh, setFresh] = useState(null);
  const [tokErr, setTokErr] = useState('');
  const [copied, setCopied] = useState('');
  const dirRef = useRef(null), filesRef = useRef(null);

  useEffect(() => {
    fetch(`${API}?op=state`, { credentials: 'same-origin' }).then((r) => r.json().then((j) => ({ ok: r.ok, j })))
      .then(({ ok, j }) => {
        if (!ok) throw new Error(j.error || 'Could not load.');
        setBoot({ state: 'ready', ...j });
        setTokens(j.tokens || []);
        if (j.lanes && j.lanes.length === 1) setLane(j.lanes[0]);
        if (j.name) setOwner(j.name.split(' ')[0]);
      })
      .catch((e) => setBoot({ state: 'error', error: e.message }));
  }, []);

  /* files in: a folder, files, or a dropped folder */
  const take = useCallback((list) => {
    const tidied = tidy(list);
    setFiles(tidied);
    setPub({ state: 'idle' });
    const man = tidied.find((f) => f.path === 'staging.json');
    if (man) man.file.text().then((t) => {
      try { const m = JSON.parse(t); setTitle((v) => v || m.title || ''); setBlurb((v) => v || m.blurb || ''); setOwner((v) => v || m.owner || ''); } catch { /* not valid, ignore */ }
    });
  }, []);
  const onPick = (e) => {
    const list = [...e.target.files].map((f) => ({ path: f.webkitRelativePath || f.name, file: f }));
    e.target.value = '';
    if (list.length) take(list);
  };
  const onDrop = async (e) => {
    e.preventDefault(); setDrag(false);
    const items = [...(e.dataTransfer.items || [])].map((i) => i.webkitGetAsEntry && i.webkitGetAsEntry()).filter(Boolean);
    if (!items.length) return;
    const out = [];
    for (const it of items) await walk(it, '', out);
    if (out.length) take(out);
  };

  /* the page's name follows the title until it is edited by hand */
  useEffect(() => { if (!pageTouched) setPage(slug(title)); }, [title, pageTouched]);

  /* the preview, from the files in this tab */
  useEffect(() => {
    let dead = false, rev = null;
    if (!files.some((f) => f.path === 'index.html')) { setPreview(''); return undefined; }
    buildPreview(files).then((p) => { if (dead) p.revoke(); else { rev = p.revoke; setPreview(p.html); } }).catch(() => setPreview(''));
    return () => { dead = true; if (rev) rev(); };
  }, [files]);

  /* the server's checks, once the page can be named */
  const ready = !!lane && !!page && files.length > 0;
  useEffect(() => {
    if (!ready) { setCheck({ state: 'idle', problems: [] }); return undefined; }
    let dead = false;
    setCheck((c) => ({ ...c, state: 'working' }));
    const t = setTimeout(async () => {
      try {
        const out = await api('check', { lane, page, title, blurb, owner, files: await encode(files, lane, page) });
        if (dead) return;
        if (out.status === 401 || out.status === 403) setCheck({ state: 'err', problems: [], error: out.error });
        else setCheck({ state: out.ok ? 'ok' : 'bad', problems: out.problems || [], error: out.error });
      } catch { if (!dead) setCheck({ state: 'err', problems: [], error: 'Could not reach the checks. Try again.' }); }
    }, 700);
    return () => { dead = true; clearTimeout(t); };
  }, [ready, lane, page, title, blurb, owner, files]);

  const publish = async () => {
    setPub({ state: 'working' });
    try {
      const out = await api('publish', { lane, page, title, blurb, owner, files: await encode(files, lane, page) });
      if (out.ok) setPub({ state: out.mode === 'pr' ? 'queued' : 'ok', path: out.path, url: out.url, note: out.note });
      else { setPub({ state: 'err', error: out.error || 'Not published.' }); if (out.problems) setCheck({ state: 'bad', problems: out.problems }); }
    } catch { setPub({ state: 'err', error: 'Could not reach the hub. Nothing was published.' }); }
  };

  const mint = async () => {
    setTokErr('');
    const out = await api('token-mint', { label: label.trim() || 'Claude' });
    if (!out.ok) { setTokErr(out.error || 'Could not make a token.'); return; }
    setFresh(out.token); setLabel('');
    setTokens((t) => [{ id: out.id, label: out.label, at: out.at }, ...t]);
  };
  const revoke = async (id) => {
    const out = await api('token-revoke', { id });
    if (out.ok) { setTokens((t) => t.filter((x) => x.id !== id)); setFresh(null); }
  };
  const copy = (key, text) => { try { navigator.clipboard.writeText(text); setCopied(key); setTimeout(() => setCopied(''), 1600); } catch { /* the page still shows it */ } };

  const lanes = boot.lanes || [];
  const total = files.reduce((n, f) => n + f.file.size, 0);
  const where = lane && page ? `/internal/staging/${lane}/${page}` : '/internal/staging/<lane>/<page>';
  const canPublish = boot.state === 'ready' && boot.configured && check.state === 'ok' && pub.state !== 'working' && pub.state !== 'ok' && pub.state !== 'queued' && !!title.trim() && !!blurb.trim() && !!owner.trim();

  const status = pub.state === 'working' ? 'Publishing…'
    : pub.state === 'ok' ? 'Committed. Live in a minute or two.'
    : pub.state === 'queued' ? 'Queued for the owner.'
    : pub.state === 'err' ? pub.error
    : !files.length ? 'Add your page’s files to begin.'
    : !lane ? 'Choose a lane.'
    : check.state === 'working' ? 'Checking…'
    : check.state === 'bad' ? `${check.problems.length} thing${check.problems.length === 1 ? '' : 's'} to fix before you publish.`
    : check.state === 'err' ? check.error
    : check.state === 'ok' ? (!title.trim() || !blurb.trim() ? 'Add a title and a line about it.' : `Ready to publish to ${lane}.`)
    : '';

  const logo = (cls) => (
    <svg className={cls} width="32" height="32" viewBox="0 0 160 160" fill="none" aria-hidden>
      <rect className="brand-icon__bg" width="160" height="160" rx="20" fill="#0070FF" />
      <path d="M116.609 44.5634C117.503 42.3606 115.85 40 113.472 40H49.1429C44.0934 40 40 44.0934 40 49.1429V106.778C40 112.018 45.1708 115.683 49.9603 113.557C80.8494 99.8449 104.378 74.7075 116.609 44.5634Z" fill="white" />
      <path d="M72.5161 120C71.4022 120 70.9357 118.553 71.8259 117.884C94.9007 100.527 111.434 75.8047 118.766 48.0522C118.94 47.3915 120 47.5162 120 48.1995V110.857C120 115.907 115.907 120 110.857 120H72.5161Z" fill="white" />
    </svg>
  );

  const claude = (
    <>
      <PropSection title="Your token">
        <p className="prop-tip">Your own Claude can publish for you. Make a token, give it to Claude, and it posts the page with the script below. The token is yours, lasts {boot.tokenDays || 90} days, and stops working the moment you are taken off the lane.</p>
        <div className="pub-mint">
          <input className="prop-input" type="text" value={label} placeholder="Name it, e.g. My laptop" maxLength={40} onChange={(e) => setLabel(e.target.value)} spellCheck={false} />
          <button type="button" className="saved-new" onClick={mint}>New token</button>
        </div>
        {tokErr && <p className="prop-tip saved-error">{tokErr}</p>}
        {fresh && (
          <div className="pub-fresh" role="status">
            <p className="prop-tip"><strong>Copy it now.</strong> It is shown once and cannot be read again.</p>
            <div className="pub-code"><code>{fresh}</code>
              <button type="button" className="saved-del is-on" onClick={() => copy('token', fresh)} aria-label="Copy the token" title="Copy">{copied === 'token' ? <CheckIcon /> : <CopyIcon />}</button></div>
          </div>
        )}
        {tokens.length > 0 && (
          <ul className="saved-list">
            {tokens.map((t) => (
              <li key={t.id} className="saved-row">
                <div className="saved-open" style={{ cursor: 'default' }}>
                  <span className="saved-name">{t.label}</span>
                  <span className="saved-meta">Made {new Date(t.at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</span>
                </div>
                <button type="button" className="saved-del is-on" onClick={() => revoke(t.id)} aria-label={`Revoke ${t.label}`} title="Revoke"><TrashIcon /></button>
              </li>
            ))}
          </ul>
        )}
      </PropSection>
      <PropSection title="Run it">
        <p className="prop-tip">In the design plugin&rsquo;s folder, with the token set:</p>
        <div className="pub-code pub-code--block">
          <pre>{`export GW_PUBLISH_TOKEN=gwp_…
bash scripts/new-staging-page.sh ${lane || '<lane>'} my-page "Title" "One line" "${owner || 'Your name'}"
bash scripts/publish-staging.sh ${lane || '<lane>'} my-page ./my-page`}</pre>
          <button type="button" className="saved-del is-on" onClick={() => copy('cmd', `export GW_PUBLISH_TOKEN=gwp_…\nbash scripts/new-staging-page.sh ${lane || '<lane>'} my-page "Title" "One line" "${owner || 'Your name'}"\nbash scripts/publish-staging.sh ${lane || '<lane>'} my-page ./my-page`)} aria-label="Copy the commands" title="Copy">{copied === 'cmd' ? <CheckIcon /> : <CopyIcon />}</button>
        </div>
        <p className="prop-tip">Or tell Claude: &ldquo;Publish this page to the {lane || '<lane>'} lane with my Gushwork token.&rdquo; Up to 3 MB.</p>
      </PropSection>
    </>
  );

  const upload = (
    <>
      <PropSection title="Where">
        <PropRow label="Lane">
          <PropDropdown value={lane} options={lanes.map((l) => ({ value: l, label: l }))} onChange={setLane} placeholder="Choose a lane" />
        </PropRow>
        <PropRow label="Page">
          <PropInput value={page} onChange={(v) => { setPageTouched(true); setPage(slug(v)); }} placeholder="agent-store" maxLength={40} />
        </PropRow>
        <p className="prop-tip">Goes to <strong>{where}</strong>. Publishing again to the same name replaces its files.</p>
      </PropSection>
      <PropSection title="About">
        <PropRow label="Title"><PropInput value={title} onChange={setTitle} placeholder="Agent store" maxLength={60} /></PropRow>
        <PropRow label="One line" align="start"><PropTextarea value={blurb} onChange={setBlurb} rows={2} placeholder="What it is, for the Staging page." maxLength={220} /></PropRow>
        <PropRow label="By"><PropInput value={owner} onChange={setOwner} placeholder="Your name" maxLength={40} /></PropRow>
      </PropSection>
      <PropSection title="Files">
        <div className={`dropzone pub-drop${drag ? ' is-over' : ''}`} onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={onDrop}>
          <UploadIcon />
          <div className="copy">
            <div className="name">{files.length ? `${files.length} file${files.length === 1 ? '' : 's'}, ${kb(total)}` : 'Drop a folder or files'}</div>
            <div className="hint">{files.length ? 'Drop again to replace them.' : 'A folder with index.html, or one HTML file. Up to 3 MB.'}</div>
          </div>
          {files.length > 0 && <button type="button" className="clear" onClick={() => { setFiles([]); setPub({ state: 'idle' }); }}>Clear</button>}
        </div>
        <div className="pub-pick">
          <button type="button" className="saved-new" onClick={() => dirRef.current && dirRef.current.click()}>Choose folder</button>
          <button type="button" className="saved-new" onClick={() => filesRef.current && filesRef.current.click()}>Choose files</button>
          <input ref={dirRef} type="file" webkitdirectory="" directory="" multiple hidden onChange={onPick} />
          <input ref={filesRef} type="file" multiple hidden onChange={onPick} />
        </div>
        {files.length > 0 && (
          <ul className="pub-files">
            {files.slice(0, 40).map((f) => <li key={f.path}><span>{f.path}</span><em>{kb(f.file.size)}</em></li>)}
            {files.length > 40 && <li><span>and {files.length - 40} more</span></li>}
          </ul>
        )}
      </PropSection>
    </>
  );

  if (boot.state === 'loading') return null;

  return (
    <div className="app" data-panel={panelOpen ? 'open' : 'closed'}>
      <div className="panel-mini" aria-hidden={panelOpen}>
        <a className="brand-link" href="/internal/tools" title="Back to Tools" aria-label="Back to Tools" tabIndex={panelOpen ? -1 : 0}>{logo('brand-icon')}</a>
        <span className="panel-mini__name">Publish</span>
        <button type="button" className="panel-reopen" onClick={() => setPanelOpen(true)} aria-label="Open the panel" title="Open the panel" tabIndex={panelOpen ? -1 : 0}><SidebarIcon /></button>
      </div>

      <div className="left-col" aria-hidden={!panelOpen}>
        <header className="brand-card">
          <a className="brand-link" href="/internal/tools" title="Back to Tools" aria-label="Back to Tools">{logo('brand-icon')}</a>
          <h1>Publish</h1>
          <button type="button" className="panel-collapse" onClick={() => setPanelOpen(false)} aria-label="Collapse the panel" title="Collapse the panel"><SidebarIcon /></button>
        </header>
        <aside className="form-card">
          <div className="form">
            {boot.state === 'error' && <section className="prop-section"><p className="prop-tip saved-error">{boot.error}</p></section>}
            {boot.state === 'ready' && lanes.length === 0 && (
              <section className="prop-section"><p className="prop-tip">You are not on a staging lane yet. Ask the owner to add you under Access Control, Staging lanes.</p></section>
            )}
            {boot.state === 'ready' && lanes.length > 0 && (
              <>
                <section className="prop-section pub-tabs-wrap">
                  <div className="prop-segmented" role="tablist" aria-label="How to publish">
                    {[['upload', 'Upload'], ['claude', 'From Claude']].map(([k, l]) => (
                      <button key={k} type="button" role="tab" aria-selected={tab === k} className={tab === k ? 'active' : ''} onClick={() => setTab(k)}>{l}</button>
                    ))}
                  </div>
                </section>
                {tab === 'upload' ? upload : claude}
              </>
            )}
          </div>
        </aside>
      </div>

      <main className="preview-col">
        <div className="pub-stage">
          {boot.state === 'ready' && !boot.configured && (
            <p className="pub-banner" role="status">Publishing is not connected to GitHub yet, so the checks work but Publish does not. The owner can finish this.</p>
          )}
          <div className="pub-frame">
            <div className="pub-bar" aria-hidden><span /><span /><span /><em>design.gushwork.ai{where}</em></div>
            {preview
              ? <iframe className="pub-iframe" title="Preview of the page" sandbox="allow-scripts" srcDoc={preview} />
              : <div className="pub-empty"><p>Your page shows here before it goes live.</p><small>Drop a folder or an HTML file on the panel.</small></div>}
          </div>
          <section className="pub-checks" aria-live="polite">
            <header><h3>Checks</h3><span className={`pub-state pub-state--${check.state}`}>{check.state === 'ok' ? 'All clear' : check.state === 'bad' ? 'Fix these' : check.state === 'working' ? 'Checking…' : check.state === 'err' ? 'Not checked' : 'Waiting for files'}</span></header>
            {check.state === 'bad' && <ul className="pub-problems">{check.problems.map((p, i) => <li key={i}><XIcon /><span>{p}</span></li>)}</ul>}
            <ul className="pub-rules">
              {RULES.map(([n, t]) => (
                <li key={n} className={check.state === 'ok' ? 'is-ok' : ''}><span className="pub-tick">{check.state === 'ok' ? <CheckIcon /> : null}</span><b>{n}</b><span>{t}</span></li>
              ))}
            </ul>
          </section>
        </div>
      </main>

      {tab === 'upload' && lanes.length > 0 && (
        <div className="floating-toolbar">
          <div className="tb-pill toolbar-pill">
            <span className={`dl-prompt${pub.state === 'err' ? ' is-err' : ''}`}>{status}</span>
            {(pub.state === 'ok' || pub.state === 'queued') && pub.path && pub.state === 'ok' && (
              <a className="pub-open" href={pub.path} target="_blank" rel="noopener">Open page <OpenIcon /></a>
            )}
            {pub.state === 'queued' && pub.url && <a className="pub-open" href={pub.url} target="_blank" rel="noopener">Open request <OpenIcon /></a>}
            <button type="button" className={`btn-primary${pub.state === 'err' ? ' btn-error' : ''}`} onClick={publish} disabled={!canPublish}>
              {pub.state === 'working' ? 'Publishing…' : pub.state === 'ok' || pub.state === 'queued' ? <><CheckIcon /> Done</> : 'Publish'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
