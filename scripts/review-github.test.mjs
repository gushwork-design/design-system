// Tests for web/api/_review-github.js: the registry edit (pure) and the pull-request flow against a pretend GitHub.
// Run: node scripts/review-github.test.mjs
import fs from 'node:fs';
import { applyDecision, revertDecision, registryTarget, serialize, recordViaGithub, checkGithub } from '../web/api/_review-github.js';

let pass = 0, fail = 0;
function t(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  ok ? pass++ : (fail++, console.log(`✘ ${name}\n  got  ${JSON.stringify(got)}\n  want ${JSON.stringify(want)}`));
}
const throws = (fn) => { try { fn(); return false; } catch { return true; } };
const row = (o) => ({ scope: 'web', key: 'button', action: 'pass', note: '', fp: 'abcdef0123456789', ...o });

/* ---- the edit ---- */
t('where a component is recorded', registryTarget('web'), { path: 'exports/web/component-registry.json', block: 'review' });
t('where a foundation is recorded', registryTarget('foundation'), { path: 'exports/shared/component-registry.json', block: 'foundations' });
const reg = () => ({ $comment: 'x', components: { button: { version: '1.1.0' } } });
t('a pass writes the five fields, in the order review-pass.sh writes them',
  applyDecision(reg(), row({}), 'utsav', '2026-10-01').review.button,
  { reviewed: 'passed', reviewedBy: 'utsav', reviewedOn: '2026-10-01', fingerprint: 'abcdef0123456789' });
t('a rework keeps its note', applyDecision(reg(), row({ action: 'rework', note: 'fix labels' }), 'u', '2026-10-01').review.button.note, 'fix labels');
t('a pass clears an old note', applyDecision({ components: { button: {} }, review: { button: { reviewed: 'rework', note: 'old' } } }, row({}), 'u', '2026-10-01').review.button.note, undefined);
t('a foundation goes in the foundations block', Object.keys(applyDecision({ components: {} }, row({ scope: 'foundation', key: 'color' }), 'u', 'd')), ['components', 'foundations']);
t('an unknown component is refused', throws(() => applyDecision(reg(), row({ key: 'nope' }), 'u', 'd')), true);
t('a decision with no fingerprint is refused', throws(() => applyDecision(reg(), row({ fp: '' }), 'u', 'd')), true);
t('undo restores what main had', revertDecision({ components: {}, review: { button: { reviewed: 'passed' } } }, 'web', 'button', { review: { button: { reviewed: 'rework' } } }).review.button.reviewed, 'rework');
t('undo removes it when main had none', revertDecision({ components: {}, review: { button: { reviewed: 'passed' } } }, 'web', 'button', { components: {} }), { components: {} });
t('undo leaves another item alone', Object.keys(revertDecision({ review: { a: { r: 1 }, b: { r: 2 } } }, 'web', 'a', { review: { b: { r: 2 } } }).review), ['b']);

/* ---- a real registry still round-trips byte for byte, so a diff shows only the decision ---- */
const real = JSON.parse(fs.readFileSync('exports/ad-page/component-registry.json', 'utf8'));
t('an untouched registry serialises to the same bytes', serialize(real), fs.readFileSync('exports/ad-page/component-registry.json', 'utf8'));

/* ---- the pull-request flow, against a pretend GitHub ---- */
function pretend(files) {
  const g = { refs: { main: 'sha-main' }, trees: { main: structuredCloneFiles(files) }, prs: [], calls: [], nextPr: 40, conflicts: 0 };
  function structuredCloneFiles(f) { return JSON.parse(JSON.stringify(f)); }
  globalThis.fetch = async (url, init = {}) => {
    const u = new URL(url), p = decodeURIComponent(u.pathname.replace('/repos/gushwork-design/design-system', '')), m = (init.method || 'GET').toUpperCase();
    g.calls.push(`${m} ${p}`);
    const send = (code, body) => ({ ok: code < 300, status: code, text: async () => (body === undefined ? '' : JSON.stringify(body)) });
    let mm;
    if ((mm = p.match(/^\/git\/ref\/heads\/(.+)$/)) && m === 'GET') return g.refs[mm[1]] ? send(200, { object: { sha: g.refs[mm[1]] } }) : send(404, {});
    if (p === '/git/refs' && m === 'POST') { const b = JSON.parse(init.body); const n = b.ref.replace('refs/heads/', ''); g.refs[n] = b.sha; g.trees[n] = structuredCloneFiles(g.trees.main); return send(201, {}); }
    if ((mm = p.match(/^\/git\/refs\/heads\/(.+)$/)) && m === 'PATCH') { const n = mm[1]; g.refs[n] = JSON.parse(init.body).sha; g.trees[n] = structuredCloneFiles(g.trees.main); return send(200, {}); }
    if (p === '/pulls' && m === 'GET') return send(200, g.prs.filter((x) => x.state === 'open'));
    if (p === '/pulls' && m === 'POST') { const pr = { number: g.nextPr++, html_url: `https://github.com/x/pull/${g.nextPr - 1}`, state: 'open' }; g.prs.push(pr); return send(201, pr); }
    if ((mm = p.match(/^\/contents\/(.+)$/))) {
      const ref = u.searchParams.get('ref');
      if (m === 'GET') { const f = g.trees[ref][mm[1]]; return send(200, { sha: 'blob-' + JSON.stringify(f).length, content: Buffer.from(JSON.stringify(f, null, 2) + '\n').toString('base64') }); }
      if (m === 'PUT') {
        if (g.conflicts-- > 0) return send(409, {});
        const b = JSON.parse(init.body); g.trees[b.branch][mm[1]] = JSON.parse(Buffer.from(b.content, 'base64').toString('utf8')); g.commits = (g.commits || 0) + 1; return send(200, {});
      }
    }
    return send(500, { unhandled: `${m} ${p}` });
  };
  return g;
}
const FILE = 'exports/web/component-registry.json';
const baseFiles = () => ({ [FILE]: { components: { button: { version: '1.1.0' }, hero: {} }, review: { hero: { reviewed: 'rework', note: 'n' } } } });

let g = pretend(baseFiles());
let out = await recordViaGithub('tok', row({}), 'utsav', '2026-10-01');
t('the first decision opens a pull request', out, { pr: { number: 40, url: 'https://github.com/x/pull/40' } });
t('and commits it to the review branch, not to main', [g.trees['review/decisions'][FILE].review.button.reviewed, g.trees.main[FILE].review.button], ['passed', undefined]);
out = await recordViaGithub('tok', row({ key: 'hero', action: 'reject', note: 'duplicate' }), 'utsav', '2026-10-01');
t('a second decision joins the same pull request', [out.pr.number, g.prs.length, g.commits], [40, 1, 2]);
t('both decisions are on the branch', Object.keys(g.trees['review/decisions'][FILE].review).sort(), ['button', 'hero']);
await recordViaGithub('tok', row({}), 'utsav', '2026-10-01', true);
t('undo takes the pass out of the pull request', g.trees['review/decisions'][FILE].review.button, undefined);
t('and leaves the other decision', g.trees['review/decisions'][FILE].review.hero.reviewed, 'rejected');

g.prs[0].state = 'closed';   // merged: the next decision starts a fresh batch from main
g.trees.main = JSON.parse(JSON.stringify(g.trees['review/decisions']));
out = await recordViaGithub('tok', row({}), 'utsav', '2026-10-02');
t('after a merge, a new pull request is opened', [out.pr.number, g.prs.length], [41, 2]);
t('and the branch was reset to main first', g.calls.some((c) => c.startsWith('PATCH /git/refs/heads/review/decisions')), true);

g = pretend(baseFiles()); g.conflicts = 1;
out = await recordViaGithub('tok', row({}), 'utsav', '2026-10-01');
t('a conflicting write is retried once', [out.pr.number, g.commits], [40, 1]);
g = pretend(baseFiles()); g.conflicts = 2;
t('twice is an error, not a silent loss', await recordViaGithub('tok', row({}), 'u', 'd').then(() => false, () => true), true);
t('an unknown component never reaches GitHub for writing', await recordViaGithub('tok', row({ key: 'nope' }), 'u', 'd').then(() => false, () => true), true);

/* ---- the connection check: each way the token can be wrong reads as its own sentence ---- */
function answers(map) {
  globalThis.fetch = async (url, init = {}) => {
    const p = new URL(url).pathname.replace('/repos/gushwork-design/design-system', '') || '/', m = init.method || 'GET';
    const hit = map[`${m} ${p}`] || map[`${m} *`];
    const [status, body, hdr] = hit || [200, {}];
    return { ok: status < 400, status, headers: { get: (k) => (hdr && hdr[k.toLowerCase()]) || null }, text: async () => JSON.stringify(body) };
  };
}
const MAIN = { 'GET /git/ref/heads/main': [200, { object: { sha: 's1' } }] };
t('no token', (await checkGithub('')).verdict.startsWith('No token'), true);
answers({ 'GET /': [404, { message: 'Not Found' }] });
t('a token that cannot see the repository says so', (await checkGithub('t')).verdict.includes('cannot see'), true);
answers({ 'GET /': [401, { message: 'Bad credentials' }] });
t('a rejected token says so', (await checkGithub('t')).verdict.includes('does not accept'), true);
answers({ ...MAIN, 'POST /git/refs': [403, { message: 'Resource not accessible by personal access token' }, { 'x-accepted-github-permissions': 'contents=write' }] });
let c = await checkGithub('t');
t('read-only is the reported 403 case, and names the permission GitHub asked for', [c.ok, c.verdict.includes('read the repository but not change it'), c.verdict.includes('contents=write')], [false, true, true]);
answers({ ...MAIN, 'POST /git/refs': [201, {}], 'DELETE *': [204, {}], 'GET /pulls': [200, []] });
c = await checkGithub('t');
t('a working token is connected, and the probe branch is removed', [c.ok, c.verdict.startsWith('Connected')], [true, true]);
t('the check never contains the token', JSON.stringify(c).includes('"t"'), false);

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
