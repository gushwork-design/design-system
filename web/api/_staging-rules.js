/* ============================================================================
   _staging-rules.js — what a page published into a staging lane must satisfy.

   Pure: no network, no environment, no node: imports beyond Buffer. _publish.js calls it before anything
   touches GitHub, and scripts/staging-rules.test.mjs runs it against fixtures, including a differential test
   against scripts/check-fonts.sh so the font rule here cannot drift from the one the deploy enforces.

   WHY THESE RULES. A lane publisher is trusted with a folder, not with the site. Each rule is a way a
   published page could hurt something else:
     - the folder is the lane and the page, nothing outside it (paths are checked, never trusted)
     - only static file types, so nothing runs on the server and nothing is a script the shell would execute
     - no vercel.json, middleware, package or dot files: those change how the whole deploy behaves
     - no reference to /api/ or /admin/: a page here runs on design.gushwork.ai with the viewer's session, so
       a page calling those would act as whoever opens it. This is a string scan, not a sandbox.
     - no key-shaped strings: the repo is public
     - the font rule the deploy runs (scripts/check-fonts.sh --target hosted), because publish-sheets.sh
       refuses the WHOLE deploy when one page breaks it. One bad lane page must not turn every deploy red.
     - base href and noindex, because cleanUrls drops the trailing slash and staging is never indexed
   ========================================================================= */

export const STAGING_ROOT = 'web/internal/staging';
export const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
export const RESERVED = new Set(['new', 'api', 'admin', 'assets', 'internal', 'template', 'templates', 'index', 'publish', 'connect']);
export const LIMITS = { file: 3 * 1024 * 1024, total: 3 * 1024 * 1024, files: 60, path: 120, title: 60, blurb: 220, owner: 40 };

const OK_EXT = new Set(['.html', '.css', '.js', '.mjs', '.json', '.svg', '.png', '.jpg', '.jpeg', '.webp', '.gif',
  '.avif', '.ico', '.mp4', '.webm', '.woff', '.woff2', '.ttf', '.txt']);
const TEXT_EXT = new Set(['.html', '.css', '.js', '.mjs', '.json', '.svg', '.txt']);
const BAD_NAME = /^(vercel\.json|middleware\.(js|mjs|ts)|package(-lock)?\.json)$/i;
const SECRET = /sk-ant-[A-Za-z0-9_-]{10,}|sk-[A-Za-z0-9]{32,}|ghp_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}|xox[abprs]-[A-Za-z0-9-]{10,}|AKIA[0-9A-Z]{16}|AIza[0-9A-Za-z_-]{35}|-----BEGIN [A-Z ]*PRIVATE KEY-----/;
const HUB_CALL = /(["'`(=\s])\/(api|admin)(\/|["'`)\s?])/;

const extOf = (p) => { const m = /\.[^./]+$/.exec(p); return m ? m[0].toLowerCase() : ''; };
const base = (p) => p.slice(p.lastIndexOf('/') + 1);
const dirOf = (p) => (p.includes('/') ? p.slice(0, p.lastIndexOf('/')) : '');

export const isSlug = (s) => typeof s === 'string' && s.length <= 40 && SLUG.test(s) && !RESERVED.has(s);

/* A path from the browser, or null. Relative, forward slashes, no dot segments, plain characters. */
export function cleanPath(p) {
  if (typeof p !== 'string' || !p || p.length > LIMITS.path) return null;
  if (p.startsWith('/') || p.includes('\\') || p.includes('\0')) return null;
  const parts = p.split('/');
  if (parts.some((s) => !s || s === '.' || s === '..' || s.startsWith('.'))) return null;      // no dot folders either (.git, .well-known)
  if (!/^[A-Za-z0-9._\-\/ ]+$/.test(p)) return null;
  return p;
}

/* ── the font rule: a port of scripts/check-fonts.sh --target hosted ───────────────────────────────────────────── */

function look(text) {
  const low = text.toLowerCase();
  return {
    names: low.includes('vert grotesk'),
    loads: (/@font-face/.test(low) && low.includes('vert')) || low.includes('next/font/local') || /src\s*:\s*url\([^)]*vert/.test(low),
    tokenref: /var\(--gw-(font|text)/.test(low),
    tokencss: low.includes('tokens.css'),
    tokendef: /--gw-font[a-z-]*\s*:/.test(low),
  };
}

function hostedVerdict(f, fragment) {
  if (f.tokenref) {
    if (fragment) return null;
    if (!(f.tokencss || f.tokendef)) return 'uses the --gw-font tokens but neither links tokens.css nor defines them, so the page renders unstyled';
    return null;
  }
  if (!f.names) return 'does not name the display face at all. Link /foundation/tokens.css and use its font tokens';
  if (!f.loads) {
    if (fragment) return null;
    return 'names the display face but nothing it links ever loads it, so it renders in the fallback';
  }
  return null;
}

/* files: [{ path, text }] for the html and css only; allPaths: every file in the page, so a font file that is there is
   found. Returns [{ path, why }]. */
export function fontProblems(files, allPaths = files.map((f) => f.path)) {
  const byPath = new Map(files.map((f) => [f.path, f.text]));
  const have = new Set(allPaths);
  const out = [];
  for (const f of files) {
    const low = f.text.toLowerCase();
    if (!['font-family', 'var(--gw-font', '@font-face', 'next/font'].some((k) => low.includes(k))) continue;
    const isDoc = /\.html?$/i.test(f.path);
    let text = f.text;
    if (isDoc) {
      const extra = [];
      for (const m of f.text.matchAll(/<link[^>]+href=["']([^"':]+\.css)(?:\?[^"']*)?["']/gi)) {
        if (m[1].startsWith('//')) continue;
        const rel = (dirOf(f.path) ? dirOf(f.path) + '/' : '') + m[1].replace(/^\/+/, '');
        if (byPath.has(rel)) extra.push(byPath.get(rel));
      }
      text = f.text + '\n' + extra.join('\n');
    }
    const gone = [];
    for (const m of text.matchAll(/@font-face\s*{[^}]*?url\(['"]?([^'")]+)/gis)) {
      const u = m[1];
      if (/^(\/|https?:|data:)/.test(u)) continue;
      const rel = (dirOf(f.path) ? dirOf(f.path) + '/' : '') + u;
      if (!have.has(rel)) gone.push(u);
    }
    if (gone.length) { out.push({ path: f.path, why: `declares @font-face for a file that is not there: ${gone.join(', ')}` }); continue; }
    const why = hostedVerdict(look(text), !isDoc);
    if (why) out.push({ path: f.path, why });
  }
  return out;
}

/* ── the whole submission ──────────────────────────────────────────────────────────────────────────────────────── */

/* sub: { lane, page, title, blurb, owner, files: [{ path, bytes: Buffer }] }
   Returns { problems: [string], files: [{ path, bytes }] (cleaned, staging.json dropped), manifest }.
   problems is empty when the submission may be published. */
export function checkSubmission(sub) {
  const problems = [];
  const P = (m) => problems.push(m);
  const { lane, page } = sub || {};
  if (!isSlug(lane)) P('The lane name is not valid.');
  if (!isSlug(page)) P('The page name must be lowercase words joined by hyphens, up to 40 characters, and not a reserved word.');

  const str = (v, max) => (typeof v === 'string' ? v.replace(/[\u0000-\u001f]/g, ' ').trim() : '');
  const manifest = { title: str(sub && sub.title), blurb: str(sub && sub.blurb), owner: str(sub && sub.owner) };
  /* Who can open the page. Asked for, never assumed: a page nobody chose a setting for would be public to the
     organisation by accident, or hidden from it by accident. 'lane' is the lane's team only; 'org' is everyone at the
     company, which is what every page under /internal is by default. */
  if (sub && (sub.visibility === 'lane' || sub.visibility === 'org')) manifest.visibility = sub.visibility;
  else P('Say who can open it: visibility must be "lane" (only your team) or "org" (everyone at Gushwork).');
  for (const [k, max] of [['title', LIMITS.title], ['blurb', LIMITS.blurb], ['owner', LIMITS.owner]]) {
    if (!manifest[k] || manifest[k].length > max) P(`The ${k} is needed (1 to ${max} characters).`);
  }

  const files = [];
  const seen = new Set();
  let total = 0;
  const input = Array.isArray(sub && sub.files) ? sub.files : [];
  if (!input.length) P('No files were sent.');
  if (input.length > LIMITS.files) P(`Too many files: ${input.length}. The limit is ${LIMITS.files}.`);
  for (const f of input.slice(0, LIMITS.files + 1)) {
    const path = cleanPath(f && f.path);
    if (!path) { P(`"${String(f && f.path).slice(0, 60)}" is not an allowed file path.`); continue; }
    if (path === 'staging.json') continue;                     // written by the server, never trusted from the browser
    if (seen.has(path.toLowerCase())) { P(`${path} appears twice.`); continue; }
    seen.add(path.toLowerCase());
    const bytes = f.bytes;
    if (!Buffer.isBuffer(bytes)) { P(`${path} could not be read.`); continue; }
    const name = base(path), ext = extOf(path);
    if (name.startsWith('.') || BAD_NAME.test(name)) P(`${path} is not allowed here (dotfiles, vercel.json, middleware and package files belong to the owner).`);
    else if (!OK_EXT.has(ext)) P(`${path}: ${ext || 'a file with no extension'} is not an allowed type.`);
    if (bytes.length > LIMITS.file) P(`${path} is ${(bytes.length / 1048576).toFixed(1)} MB. The limit is ${LIMITS.file / 1048576} MB per file.`);
    total += bytes.length;
    files.push({ path, bytes });
  }
  if (total > LIMITS.total) P(`The page is ${(total / 1048576).toFixed(1)} MB in all. The limit is ${LIMITS.total / 1048576} MB.`);

  /* A file and a folder cannot share a name (a.txt and a.txt/b.png): git refuses the tree, and a refused tree used to be a 502
     after the rules were already written. */
  const names = new Set(files.map((f) => f.path.toLowerCase()));
  for (const f of files) {
    const bits = f.path.toLowerCase().split('/');
    for (let i = 1; i < bits.length; i++) if (names.has(bits.slice(0, i).join('/'))) P(`${f.path} sits inside ${bits.slice(0, i).join('/')}, which is also a file.`);
  }

  const index = files.find((f) => f.path === 'index.html');
  if (!index) P('index.html is missing.');
  else {
    const h = index.bytes.toString('utf8');
    if (!h.includes(`<base href="/internal/staging/${lane}/${page}/">`)) {
      P(`index.html needs <base href="/internal/staging/${lane}/${page}/"> or its relative files will not load.`);
    }
    if (!/<meta[^>]+name=["']robots["'][^>]+noindex/i.test(h)) P('index.html needs <meta name="robots" content="noindex, nofollow">.');
  }

  const texts = [];
  for (const f of files) {
    if (!TEXT_EXT.has(extOf(f.path))) continue;
    const t = f.bytes.toString('utf8');
    texts.push({ path: f.path, text: t });
    if (SECRET.test(t)) P(`${f.path} contains something shaped like a secret key. Remove it and rotate the key.`);
    if (extOf(f.path) !== '.json' && HUB_CALL.test(t)) P(`${f.path} refers to /api/ or /admin/. A page here may not call the hub's own endpoints.`);
  }
  for (const x of fontProblems(texts.filter((t) => /\.(html?|css)$/i.test(t.path)), files.map((f) => f.path))) P(`${x.path} fails the font check the deploy runs: ${x.why}.`);

  return { problems, files, manifest };
}
