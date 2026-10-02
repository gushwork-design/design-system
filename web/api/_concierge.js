/* ============================================================================
   _concierge.js — Bruce, the concierge. Answers people in Slack from the design repo.

   WHAT HE DOES: hands over brand assets (logos, color sheet, swatches, fonts, tokens), uploaded
   straight into the thread; points at the right template or tool and gives the exact "Use with
   Claude" prompt the Templates page copies. He answers @Bruce in any channel he is in, and DMs.

   WHAT HE DOES NOT DO: design anything. There is no model call anywhere in here, so a question
   costs nothing and the same question always gets the same answer. Asked to make something, he
   says so and hands over the template to use with Claude. (The earlier agent that generated
   designs was too expensive.)

   WHERE HE RUNS: inside the site's existing Slack events handler (_slack-events.js), as the SAME
   Slack app that closes the ✅ review loop. No second app, no server: the request URL stays
   /api/slack-events, so the review loop is untouched.

   Plain keyword matching on purpose. Everything he can hand over is a file that must exist in the
   deploy; scripts/concierge.test.mjs fails if one is missing.
   ========================================================================= */

import { existsSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';

export const SITE = (process.env.SITE_BASE || 'https://design.gushwork.ai').replace(/\/$/, '');

/* ---------------------------------------------------------------- the catalogue */

const logoFiles = (slug) => [
  { path: `assets/logo/gushwork-${slug}.svg`, format: 'svg', note: 'vector' },
  { path: `assets/logo/png/gushwork-${slug}-2000.png`, format: 'png', note: '2000 px' },
  { path: `assets/logo/png/gushwork-${slug}-1000.png`, format: 'png', note: '1000 px' },
  { path: `assets/logo/jpg/gushwork-${slug}-2000.jpg`, format: 'jpg', note: '2000 px' },
];

const LOGOS = [
  ['logo-original', 'Original full logo', 'The blue mark with the wordmark, for white or light grounds.'],
  ['logo-white', 'White full logo', 'For blue or dark grounds.'],
  ['logo-dark', 'Dark full logo', 'Mark and wordmark in near-black.'],
  ['symbol-original', 'Original symbol', 'The mark on its own.'],
  ['symbol-white', 'White symbol', 'The mark on its own, for blue or dark grounds.'],
];

const TEMPLATES = [
  ['ad-page', 'Ad landing page', 'Form-first landing page for paid ads.', ['ad', 'ads', 'landing', 'lander', 'page', 'paid', 'form']],
  ['ad-page-signup', 'Sign-up ad page', 'Illustrated-hero landing page with a one-click sign-up, for paid ads.', ['ad', 'ads', 'signup', 'landing', 'lander', 'page', 'illustrated']],
  ['case-study', 'Case study page', 'One customer story, told as a page.', ['case', 'study', 'customer', 'story', 'page']],
  ['lead-magnet', 'Lead magnet', 'Print-ready PDF that sits behind an ad.', ['lead', 'magnet', 'pdf', 'guide', 'ebook', 'document']],
  ['one-pager', 'One-pager', 'One page on why customers trust Gushwork.', ['one-pager', 'pager', 'document', 'sheet']],
  ['slide-deck', 'Slide deck', 'The base for every Gushwork deck.', ['slide', 'slides', 'deck', 'presentation', 'pitch', 'sales']],
];

/* The site's own Templates page holds the prompts; read them from there so they never drift. */
export function readPrompts(root) {
  const file = ['internal/templates.html', 'web/internal/templates.html'].map((p) => join(root, p)).find((p) => existsSync(p));
  if (!file) return {};
  const html = readFileSync(file, 'utf8');
  const out = {};
  for (const m of html.matchAll(/data-prompt="Use the Gushwork ([a-z-]+) ([^"]*)"/g)) {
    out[m[1]] = `Use the Gushwork ${m[1]} ${m[2]}`.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'");
  }
  return out;
}

export function buildCatalog(root) {
  const prompts = readPrompts(root);
  const e = [];
  for (const [slug, title, blurb] of LOGOS) e.push({ id: slug, kind: 'logo', title, blurb, files: logoFiles(slug), page: '/downloads#logo' });
  e.push({ id: 'color-sheet', kind: 'colors', title: 'Color sheet', blurb: 'Every brand color with its token and hex, as a printable sheet.', page: '/downloads#color-sheet',
    files: [{ path: 'assets/color/gushwork-colors.pdf', format: 'pdf', note: 'A4, 2 pages' }, { path: 'assets/color/gushwork-colors-1page.pdf', format: 'pdf', note: 'one page' }] });
  e.push({ id: 'swatches', kind: 'colors', title: 'Swatch library', blurb: 'The palette as a swatch file for Adobe apps or macOS.', page: '/downloads#color-sheet',
    files: [{ path: 'assets/color/gushwork-colors.ase', format: 'ase', note: 'Adobe' }, { path: 'assets/color/gushwork-colors.clr', format: 'clr', note: 'macOS' }] });
  e.push({ id: 'fonts', kind: 'font', title: 'Fonts', blurb: 'Vert Grotesk Display for headings and Inter for everything else.', page: '/downloads#fonts',
    files: [
      { path: 'fonts/Vert_Grotesk_Display_VF.ttf', format: 'ttf', note: 'Vert Grotesk Display, variable' },
      { path: 'fonts/Inter-VariableFont_opsz_wght.ttf', format: 'ttf', note: 'Inter, variable' },
      { path: 'fonts/Inter-Italic-VariableFont_opsz_wght.ttf', format: 'ttf', note: 'Inter Italic, variable' },
      { path: 'fonts/PlusJakartaSans-VariableFont_wght.ttf', format: 'ttf', note: 'Plus Jakarta Sans (only for Google Slides exports)' },
    ] });
  e.push({ id: 'tokens', kind: 'tokens', title: 'Design tokens', blurb: 'Colors, type, spacing and radii as code: CSS variables, JSON, SCSS and a Tailwind theme.', page: '/downloads#tokens',
    files: [
      { path: 'foundation/tokens.css', format: 'css', note: 'CSS custom properties' },
      { path: 'foundation/tokens.json', format: 'json', note: 'JSON' },
      { path: 'foundation/tokens.scss', format: 'scss', note: 'SCSS variables' },
      { path: 'foundation/tailwind-theme.js', format: 'js', note: 'Tailwind theme' },
    ] });
  for (const [id, title, blurb, words] of TEMPLATES) e.push({ id: `template-${id}`, kind: 'template', title, blurb, words, prompt: prompts[id], page: '/internal/templates', soon: id === 'slide-deck' });
  e.push({ id: 'tool-email-signature', kind: 'tool', title: 'Email signature creator', blurb: 'Generate on-brand email signatures.', words: ['signature', 'signatures', 'email', 'mail'], page: '/internal/email-signature/' });
  e.push({ id: 'tool-id-card', kind: 'tool', title: 'Employee ID card generator', blurb: 'Generate ID cards for any employee.', words: ['id', 'card', 'cards', 'badge', 'employee'], page: '/internal/employee-id-card/' });
  e.push({ id: 'page-downloads', kind: 'page', title: 'Downloads', blurb: 'Logos, color sheet, fonts and tokens in one place.', words: ['downloads', 'download', 'assets', 'asset', 'brand', 'kit'], page: '/downloads' });
  e.push({ id: 'page-style-guide', kind: 'page', title: 'Style guide', blurb: 'How the brand looks and sounds.', words: ['style', 'guide', 'guideline', 'guidelines', 'voice', 'tone', 'brand', 'rules'], page: '/style-guide' });
  e.push({ id: 'page-plugin', kind: 'page', title: 'Claude plugin', blurb: 'Install the Gushwork plugin so Claude builds on-brand.', words: ['plugin', 'install', 'claude', 'setup'], page: '/internal/claude-plugin' });
  e.push({ id: 'page-templates', kind: 'page', title: 'Templates', blurb: 'Starting points for pages, documents and decks, each with a Use with Claude button.', words: ['templates', 'template'], page: '/internal/templates' });
  e.push({ id: 'page-tools', kind: 'page', title: 'Tools', blurb: 'Small tools the team can use.', words: ['tools', 'tool'], page: '/internal/tools' });
  return e;
}

/** Everything the catalogue promises that is not in the deploy. A test fails on any. */
export function missingFiles(root, catalog) {
  const out = [];
  for (const x of catalog) for (const f of x.files || []) if (!existsSync(join(root, f.path))) out.push(`${x.id}: ${f.path}`);
  for (const x of catalog) if (x.kind === 'template' && !x.prompt) out.push(`${x.id}: no "Use with Claude" prompt found in the templates page`);
  return out;
}

/* ---------------------------------------------------------------- understanding a question */

const STOP = new Set(['the', 'a', 'an', 'please', 'pls', 'can', 'could', 'would', 'you', 'send', 'give', 'me', 'i', 'need', 'want', 'get', 'for', 'of', 'to', 'and', 'or', 'our', 'some', 'hi', 'hey', 'hello', 'bruce', 'wayne', 'is', 'are', 'there', 'do', 'we', 'have', 'where', 'find', 'share', 'with', 'in', 'on', 'it', 'my', 'any', 'file', 'files', 'latest', 'new', 'official', 'thanks', 'thank']);
const FORMATS = new Set(['svg', 'png', 'jpg', 'jpeg', 'pdf', 'ase', 'clr', 'ttf', 'css', 'json', 'scss', 'js']);
const KIND_KEYS = {
  logo: ['logo', 'logos', 'symbol', 'symbols', 'wordmark', 'icon', 'mark'],
  colors: ['color', 'colors', 'palette', 'swatch', 'swatches', 'ase', 'clr', 'hex'],
  font: ['font', 'fonts', 'typeface', 'typefaces', 'typography', 'ttf', 'inter', 'vert', 'grotesk', 'jakarta'],
  tokens: ['token', 'tokens', 'tailwind', 'scss', 'css', 'variables'],
};
const TEMPLATE_KEYS = ['template', 'templates', 'lander', 'landing', 'case', 'study', 'lead', 'magnet', 'one-pager', 'deck', 'slides', 'slide', 'presentation', 'ads', 'ad', 'signup', 'pitch'];
const TOOL_KEYS = ['tool', 'tools', 'signature', 'signatures', 'email', 'id', 'badge'];
const DESIGN_VERBS = ['make', 'design', 'create', 'build', 'generate', 'draw', 'mockup', 'illustrate', 'write', 'produce', 'draft'];

export function normalise(text) {
  return String(text || '').toLowerCase()
    .replace(/<@[a-z0-9]+>/g, ' ')
    .replace(/colou?rs?\b/g, (m) => (m.endsWith('s') ? 'colors' : 'color'))
    .replace(/one[\s-]?pager/g, 'one-pager')
    .replace(/sign[\s-]?up/g, 'signup')
    .replace(/word[\s-]?mark/g, 'wordmark')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/).filter((w) => w && !STOP.has(w));
}
const has = (words, keys) => keys.some((k) => words.includes(k));

function filesFor(entry, format, logo = false) {
  const files = entry.files || [];
  if (format) {
    const f = format === 'jpeg' ? 'jpg' : format;
    const m = files.filter((x) => x.format === f);
    if (m.length) return logo && f === 'png' ? m.slice(0, 1) : m;
  }
  if (logo) return files.filter((x) => x.format === 'svg' || (x.format === 'png' && x.note.startsWith('2000')));
  return files;
}

function pickLogos(catalog, words) {
  const symbols = has(words, ['symbol', 'symbols', 'icon', 'mark']);
  const pool = catalog.filter((x) => x.kind === 'logo');
  const hints = [];
  if (has(words, ['all', 'every', 'everything', 'treatments'])) return { chosen: pool, hints };
  const treatment = ['white', 'dark', 'original'].find((w) => words.includes(w)) || (words.includes('black') ? 'dark' : words.includes('blue') ? 'original' : '');
  const family = pool.filter((x) => (symbols ? x.id.startsWith('symbol-') : x.id.startsWith('logo-')));
  let chosen = treatment ? family.filter((x) => x.id.endsWith(treatment)) : family.filter((x) => x.id.endsWith('original'));
  if (treatment && !chosen.length) hints.push(`There is no ${treatment} ${symbols ? 'symbol' : 'logo'}; here is the original.`);
  if (!chosen.length) chosen = family.filter((x) => x.id.endsWith('original'));
  if (!treatment) hints.push(`Also ask for *white* or *dark*${symbols ? '' : ', or just the *symbol*'}, e.g. “white logo png”.`);
  return { chosen, hints };
}

export function understand(text, catalog) {
  const words = normalise(text);
  const format = words.find((w) => FORMATS.has(w));
  const parts = [];
  const anyKey = [...Object.values(KIND_KEYS).flat(), ...TEMPLATE_KEYS, ...TOOL_KEYS];
  const raw = String(text || '').toLowerCase().replace(/<@[a-z0-9]+>/g, ' ').trim();
  const greetingOnly = !words.length && /^(hi|hey|hello|yo|sup|hiya|good (morning|afternoon|evening))\b/.test(raw);
  const thanksOnly = /\b(thanks|thank you|thx|cheers|appreciate)\b/.test(raw);
  const help = !words.length || (has(words, ['help', 'menu', 'options', 'what', 'commands']) && !has(words, anyKey));

  if (has(words, KIND_KEYS.logo)) {
    const { chosen, hints } = pickLogos(catalog, words);
    parts.push({ type: 'assets', picks: chosen.map((x) => ({ entry: x, files: filesFor(x, format, true) })), hints });
  }
  if (has(words, KIND_KEYS.colors)) {
    const swatch = has(words, ['swatch', 'swatches', 'ase', 'clr', 'adobe', 'illustrator', 'photoshop', 'indesign', 'mac', 'macos']);
    const x = catalog.find((c) => c.id === (swatch ? 'swatches' : 'color-sheet'));
    if (x) {
      const files = filesFor(x, format);
      const one = has(words, ['1', 'one', 'page', '1page', 'single']) ? files.filter((f) => f.note === 'one page') : files;
      parts.push({ type: 'assets', picks: [{ entry: x, files: one.length ? one : files }], hints: swatch ? [] : ['Need it as a swatch file for Adobe or macOS? Ask for “swatches”.'] });
    }
  }
  if (has(words, KIND_KEYS.font)) {
    const x = catalog.find((c) => c.id === 'fonts');
    let files = x.files;
    if (has(words, ['vert', 'grotesk', 'heading', 'headings', 'display'])) files = files.filter((f) => f.path.includes('Vert'));
    else if (has(words, ['inter'])) files = files.filter((f) => f.path.includes('Inter'));
    else if (has(words, ['jakarta'])) files = files.filter((f) => f.path.includes('Jakarta'));
    parts.push({ type: 'assets', picks: [{ entry: x, files }], hints: files.length === x.files.length ? ['Vert Grotesk Display is for headings and Inter is for everything else. Plus Jakarta Sans is only for Google Slides exports.'] : [] });
  }
  if (has(words, KIND_KEYS.tokens)) {
    const x = catalog.find((c) => c.id === 'tokens');
    let files = x.files;
    if (has(words, ['tailwind'])) files = files.filter((f) => f.path.includes('tailwind'));
    else if (format) files = filesFor(x, format);
    parts.push({ type: 'assets', picks: [{ entry: x, files }], hints: [] });
  }

  const templateWords = ['template', 'templates', 'ad', 'ads', 'case', 'lead', 'deck', 'slides', 'slide', 'one-pager', 'landing', 'lander', 'signup'];
  const toolHit = has(words, TOOL_KEYS) && (has(words, ['tool', 'tools', 'signature', 'signatures', 'badge']) || (has(words, ['email']) && !has(words, ['template', 'templates'])) || (has(words, ['id']) && has(words, ['card', 'cards'])));
  if (toolHit) {
    const tools = catalog.filter((x) => x.kind === 'tool');
    const hit = tools.filter((x) => words.some((w) => x.words.includes(w)));
    parts.push({ type: 'tools', entries: hit.length ? hit : tools });
  }
  if (has(words, TEMPLATE_KEYS) && !(toolHit && !has(words, templateWords))) {
    const templates = catalog.filter((x) => x.kind === 'template');
    const generic = has(words, ['template', 'templates']) && !words.some((w) => templates.some((t) => t.words.includes(w) && !['page', 'document', 'sheet'].includes(w)));
    const scored = templates.map((x) => ({ x, s: words.filter((w) => x.words.includes(w) && w !== 'page').length })).filter((r) => r.s > 0).sort((a, b) => b.s - a.s);
    const best = scored[0] ? scored[0].s : 0;
    const entries = generic || !scored.length ? templates : scored.filter((r) => r.s === best).map((r) => r.x);
    parts.push({ type: 'templates', entries, all: entries.length === templates.length });
  }
  if (!parts.length) {
    const pages = catalog.filter((x) => x.kind === 'page').map((x) => ({ x, s: words.filter((w) => x.words.includes(w)).length })).filter((r) => r.s > 0).sort((a, b) => b.s - a.s);
    if (pages.length) parts.push({ type: 'pages', entries: pages.filter((r) => r.s === pages[0].s).map((r) => r.x) });
  }
  const designRequest = has(words, DESIGN_VERBS) && !parts.some((p) => p.type === 'tools' || p.type === 'assets');
  return { parts, designRequest, help, greeting: greetingOnly, thanks: thanksOnly };
}

/* ---------------------------------------------------------------- writing the answer */

/* Bruce talks the way the rest of Gushwork writes (foundation/voice.md): plainspoken, short, first person, sentence case,
   no exclamation marks, no emoji. There is no model here, so the human feel comes from short lines, a few ways of saying
   the same thing, and answering what was asked before offering more. The pick is seeded by the message, so the same message
   always gets the same words, and two people asking in a row don't get a copy-paste. */
const seedOf = (x) => [...String(x || '0')].reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 7);
const pick = (options, seed) => options[seed % options.length];

export const HELP = [
  'I can send you the brand files and point you to the right template or tool. Things people ask me for:',
  '• logos, like “white logo svg” or “dark symbol png”',
  '• the color sheet, or swatches for Adobe or macOS',
  '• fonts, and the design tokens (CSS, JSON, SCSS, Tailwind)',
  '• templates: ad page, case study, lead magnet, one-pager',
  '• tools: the email signature creator and the ID card generator',
  'I don’t design things myself. If you need something made, I’ll hand you the template and the prompt to run with Claude.',
].join('\n');

const link = (path, label) => `<${SITE}${path}|${label}>`;
const MAX_FILES = 6;
const JOIN = (xs) => (xs.length <= 1 ? xs[0] || '' : xs.slice(0, -1).join(', ') + ' and ' + xs[xs.length - 1]);
const lower = (t) => t.charAt(0).toLowerCase() + t.slice(1);

export function greeting(seed) {
  return pick(['Hey. What do you need? Logos, the color sheet, fonts, a template — say the word.', 'Hi. Tell me what you’re after and I’ll find it: logos, colours, fonts, templates, tools.', 'Hey there. What can I find for you?'], seed);
}
export function thanks(seed) {
  return pick(['Anytime.', 'Glad it helped.', 'Sure thing.'], seed);
}

function templateBlock(entries, all, seed) {
  const live = entries.filter((x) => !x.soon), soon = entries.filter((x) => x.soon);
  const lines = [];
  if (!all && live.length === 1) {
    const x = live[0];
    lines.push(`${pick(['That’s the', 'This is the', 'Here’s the'], seed)} *${x.title}* template. ${x.blurb}`);
    if (x.prompt) {
      lines.push('Open Claude Code with the Gushwork plugin, paste this, and add your brief:');
      lines.push('```' + x.prompt + '```');
    }
    lines.push(`More on the ${link('/internal/templates', 'Templates page')}. If you haven’t set up the plugin yet, ${link('/internal/claude-plugin', 'start here')}.`);
  } else if (live.length) {
    lines.push(`We have ${live.length} templates:`);
    for (const x of live) lines.push(`• *${x.title}*: ${x.blurb}`);
    lines.push(`Tell me which one and I’ll send you the prompt for Claude. They’re all on the ${link('/internal/templates', 'Templates page')} too.`);
  }
  for (const x of soon) lines.push(`${x.title} isn’t ready yet. The slides library is being rebuilt, so there’s nothing to send for now.`);
  return lines.join('\n');
}

function assetLead(picks, seed) {
  const names = picks.map((p) => lower(p.entry.title));
  const what = names.length === 1 ? `the ${names[0]}` : names.length <= 3 ? JOIN(names.map((n) => `the ${n}`)) : `the ${names.length} ${picks[0].entry.kind === 'logo' ? 'logo versions' : 'files'}`;
  return pick([`Here’s ${what}.`, `Sending ${what} over now.`, `Here you go, ${what}.`], seed);
}

export function compose(u, catalog, seedText = '') {
  const seed = seedOf(seedText);
  if (u.greeting) return { text: greeting(seed), files: [] };
  if (u.thanks && !u.parts.length) return { text: thanks(seed), files: [] };
  if (!u.parts.length && !u.designRequest) {
    return { text: u.help ? HELP : pick(['I’m not sure what you’re after. Here’s what I can help with:\n', 'I didn’t catch that one. Here’s what I can do:\n', 'Not sure I follow. Here’s what I’m good for:\n'], seed) + HELP, files: [] };
  }
  const texts = [];
  let files = [];
  let linked = false;
  const pagesDone = new Set();
  if (u.designRequest) texts.push(pick(['I don’t design things myself, and I’d rather not guess at the brand. What I can do is give you the right starting point to run with Claude.', 'Making designs isn’t something I do. I can hand you the template and the prompt, and Claude can take it from there.'], seed));
  const parts = u.designRequest && !u.parts.some((p) => p.type === 'templates')
    ? [...u.parts, { type: 'templates', entries: catalog.filter((x) => x.kind === 'template'), all: true }] : u.parts;
  for (const p of parts) {
    if (p.type === 'assets') {
      const lines = [assetLead(p.picks, seed)];
      if (p.picks[0] && p.picks[0].entry.kind === 'tokens') lines.push('Same tokens the site runs on.');
      lines.push(...p.hints.map((h) => h));
      if (p.picks[0] && p.picks[0].entry.page && !pagesDone.has('downloads')) { pagesDone.add('downloads'); lines.push(`Everything else is on the ${link(p.picks[0].entry.page, 'Downloads page')}.`); linked = true; }
      for (const { entry, files: fs } of p.picks) for (const f of fs) files.push({ path: f.path, title: `${entry.title} (${f.format}, ${f.note})` });
      texts.push(lines.join('\n'));
    } else if (p.type === 'templates') { texts.push(templateBlock(p.entries, p.all, seed)); linked = true; }
    else {
      texts.push(p.entries.map((x) => `${pick(['Here’s the', 'That’s the', 'You want the'], seed)} *${x.title}*. ${x.blurb} ${link(x.page || '/', 'Open it')}.`).join('\n'));
      linked = true;
    }
  }
  if (files.length > MAX_FILES) {
    texts.push(`That’s the first ${MAX_FILES}. The rest are on the ${link('/downloads', 'Downloads page')}.`);
    files = files.slice(0, MAX_FILES);
  }
  if (linked) texts.push('_Links open with your Gushwork Google sign-in._');
  return { text: texts.join('\n\n'), files };
}

/* ---------------------------------------------------------------- talking to Slack */

async function slack(token, method, body, form = false) {
  const r = await fetch(`https://slack.com/api/${method}`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': form ? 'application/x-www-form-urlencoded' : 'application/json; charset=utf-8' },
    body: form ? new URLSearchParams(body).toString() : JSON.stringify(body),
  });
  const j = await r.json().catch(() => ({}));
  if (!j.ok) throw new Error(`slack ${method}: ${j.error || r.status}`);
  return j;
}

/* Slack's current upload flow: ask for a URL, send the bytes, then share the file(s) into the thread in one call. */
async function uploadFiles(token, root, channel, threadTs, files) {
  const done = [];
  for (const f of files) {
    let bytes;
    try { bytes = readFileSync(join(root, f.path)); } catch { continue; }
    const name = basename(f.path);
    const got = await slack(token, 'files.getUploadURLExternal', { filename: name, length: String(bytes.length) }, true);
    const up = await fetch(got.upload_url, { method: 'POST', body: bytes });
    if (!up.ok) throw new Error(`upload ${name}: ${up.status}`);
    done.push({ id: got.file_id, title: f.title });
  }
  if (done.length) {
    await slack(token, 'files.completeUploadExternal', { files: JSON.stringify(done), channel_id: channel, ...(threadTs ? { thread_ts: threadTs } : {}) }, true);
  }
  return done.length;
}

/**
 * One Slack message event in, answer out. `deps`: { token, root, owners: Set of Slack IDs }.
 * Returns what it did, for the log and the tests. Never throws on a bad question; a Slack error is returned, not raised,
 * so the caller can still answer 200 and Slack does not retry.
 */
export async function handleMessage(event, deps) {
  const { token, root, owners = new Set() } = deps;
  const isDm = event.type === 'message';
  if (!event.user || event.bot_id || (event.subtype && event.subtype !== 'file_share')) return { did: 'ignored' };
  const catalog = buildCatalog(root);
  const u = understand(event.text || '', catalog);
  // A greeting, thanks or a plain "what can you do" is conversation, not a reply to the report.
  const asked = u.parts.length > 0 || u.designRequest || u.greeting || u.thanks || u.help;
  const threadTs = isDm ? event.thread_ts : event.thread_ts || event.ts;
  try {
    // A reviewer's DM that is none of those is most likely a reply to the nightly report ("do 2", "skip the focus ring"). The 9pm run
    // reads it. Bruce says so in words, and ticks it, so nobody has to guess what the tick means.
    if (isDm && owners.has(event.user) && !asked) {
      let ticked = true;
      try { await slack(token, 'reactions.add', { channel: event.channel, timestamp: event.ts, name: 'white_check_mark' }); } catch { ticked = false; }
      await slack(token, 'chat.postMessage', { channel: event.channel, ...(threadTs ? { thread_ts: threadTs } : {}), text: 'Got it. I’ll leave that for tonight’s 9pm run, which reads your replies to the report. If you were asking me for a file, say what you need.' });
      return { did: ticked ? 'ticked' : 'noted' };
    }
    const reply = compose(u, catalog, event.ts);
    await slack(token, 'chat.postMessage', { channel: event.channel, ...(threadTs ? { thread_ts: threadTs } : {}), text: reply.text, unfurl_links: false });
    const sent = reply.files.length ? await uploadFiles(token, root, event.channel, threadTs, reply.files) : 0;
    if (sent < reply.files.length) {
      await slack(token, 'chat.postMessage', { channel: event.channel, ...(threadTs ? { thread_ts: threadTs } : {}), text: `I couldn’t attach ${reply.files.length - sent === 1 ? 'one of the files' : `${reply.files.length - sent} of the files`}. You’ll find ${reply.files.length - sent === 1 ? 'it' : 'them'} on the <${SITE}/downloads|Downloads page>.` });
    }
    return { did: 'answered', files: sent };
  } catch (e) {
    return { did: 'error', error: String(e.message || e).slice(0, 200) };
  }
}
