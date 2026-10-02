/* ============================================================================
   review-github.js — a Pass, Rework or Reject becomes a commit on one pull request.

   WHY. The registry that records a review lives in git (exports/<surface>/component-registry.json), and the skills,
   the push warnings and the drift checks read it there. A button on the site cannot edit a file in a repo, so until
   now it queued the decision for the next Claude session to write. With a GitHub token on the site the button can
   write it itself: every decision is a commit on ONE branch, `review/decisions`, behind ONE open pull request.
   Nothing reaches main until a person approves and merges that pull request, which is the rule for every change.

   THE FINGERPRINT is the one the page was showing (it comes in with the decision), not one recomputed here. If the
   source has moved since, the stored fingerprint no longer matches and the pass reads "expired" at once. That is the
   same guard `review-pass.sh --expect` gives the session path.

   THE FILE IS WRITTEN THE WAY review-pass.sh WRITES IT: JSON, 2 spaces, raw unicode, a final newline. JS and Python
   produce identical bytes for it (tested against every registry in the repo), so a decision made here and one made by
   the script look the same in a diff.

   The token is GW_GITHUB_TOKEN: a fine-grained token for this one repository with Contents and Pull requests set to
   Read and write. Without it nothing here runs and the button falls back to the queue.
   ========================================================================= */

const OWNER = 'gushwork-design';
const REPO = 'design-system';
const BASE = 'main';
const BRANCH = 'review/decisions';
const STATE = { pass: 'passed', reject: 'rejected', rework: 'rework' };

export function registryTarget(scope) {
  return scope === 'foundation'
    ? { path: 'exports/shared/component-registry.json', block: 'foundations' }
    : { path: `exports/${scope}/component-registry.json`, block: 'review' };
}

/* The same edit review-pass.sh's record() makes. Pure: takes a parsed registry, returns it changed. */
export function applyDecision(doc, row, who, today) {
  const { block } = registryTarget(row.scope);
  if (!STATE[row.action]) throw new Error('not a decision');
  if (!row.fp) throw new Error('no fingerprint');
  if (row.scope !== 'foundation' && !(doc.components && doc.components[row.key])) throw new Error(`'${row.key}' is not a ${row.scope} component`);
  const blk = (doc[block] = doc[block] || {});
  const rec = (blk[row.key] = blk[row.key] || {});
  rec.reviewed = STATE[row.action];
  rec.reviewedBy = who;
  rec.reviewedOn = today;
  rec.fingerprint = row.fp;
  if (row.note) rec.note = row.note;
  else if (rec.note !== undefined && row.action === 'pass') delete rec.note;
  return doc;
}

/* Undo: put the item back exactly as main has it (its record, or none). */
export function revertDecision(doc, scope, key, mainDoc) {
  const { block } = registryTarget(scope);
  const before = mainDoc && mainDoc[block] && mainDoc[block][key];
  if (before) { doc[block] = doc[block] || {}; doc[block][key] = before; }
  else if (doc[block]) {
    delete doc[block][key];
    if (!Object.keys(doc[block]).length && !(mainDoc && mainDoc[block])) delete doc[block];
  }
  return doc;
}

export function serialize(doc) { return JSON.stringify(doc, null, 2) + '\n'; }

async function gh(token, path, init = {}) {
  const r = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${token}`, accept: 'application/vnd.github+json', 'x-github-api-version': '2022-11-28',
      'user-agent': 'gushwork-design-hub', 'content-type': 'application/json', ...(init.headers || {}),
    },
  });
  const text = await r.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { /* leave null */ }
  if (!r.ok) {
    const e = new Error(`github ${r.status}`);
    e.status = r.status; e.body = body;
    e.needs = (r.headers && r.headers.get && r.headers.get('x-accepted-github-permissions')) || '';   // what GitHub says this call needs, e.g. contents=write
    e.step = `${(init.method || 'GET').toUpperCase()} ${path.split('?')[0].replace(/^\/repos\/[^/]+\/[^/]+/, '')}`;
    throw e;
  }
  return body;
}
async function ghMaybe(token, path) {
  try { return await gh(token, path); } catch (e) { if (e.status === 404) return null; throw e; }
}
const repo = (p) => `/repos/${OWNER}/${REPO}${p}`;
const b64 = (s) => Buffer.from(s, 'utf8').toString('base64');
const unb64 = (s) => Buffer.from(s, 'base64').toString('utf8');

/* Make sure the branch exists and is the one the open pull request is on. A branch whose pull request has been merged or
   closed starts again from main, so a new batch of decisions never rides on an old one. */
async function ensureBranch(token) {
  const base = await gh(token, repo(`/git/ref/heads/${BASE}`));
  const baseSha = base.object.sha;
  const have = await ghMaybe(token, repo(`/git/ref/heads/${BRANCH}`));
  const open = await gh(token, repo(`/pulls?head=${OWNER}:${encodeURIComponent(BRANCH)}&state=open`));
  let pr = open && open[0] ? open[0] : null;
  if (!have) await gh(token, repo('/git/refs'), { method: 'POST', body: JSON.stringify({ ref: `refs/heads/${BRANCH}`, sha: baseSha }) });
  else if (!pr) await gh(token, repo(`/git/refs/heads/${BRANCH}`), { method: 'PATCH', body: JSON.stringify({ sha: baseSha, force: true }) });
  return pr;
}

async function readFile(token, path, ref) {
  const f = await gh(token, repo(`/contents/${path}?ref=${encodeURIComponent(ref)}`));
  return { sha: f.sha, doc: JSON.parse(unb64(f.content)) };
}

/* Write one decision (or undo one). Retries once if the branch moved under it. Returns { pr: { number, url } }. */
export async function recordViaGithub(token, row, who, today, undo = false) {
  let pr = await ensureBranch(token);
  const { path } = registryTarget(row.scope);
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const cur = await readFile(token, path, BRANCH);
      let message;
      if (undo) {
        const main = await readFile(token, path, BASE);
        revertDecision(cur.doc, row.scope, row.key, main.doc);
        message = `Review: undo ${row.scope}/${row.key}`;
      } else {
        applyDecision(cur.doc, row, who, today);
        message = `Review: ${row.action} ${row.scope}/${row.key}${row.note ? ' — ' + row.note.slice(0, 80) : ''} (${who})`;
      }
      await gh(token, repo(`/contents/${path}`), {
        method: 'PUT', body: JSON.stringify({ message, content: b64(serialize(cur.doc)), sha: cur.sha, branch: BRANCH }),
      });
      break;
    } catch (e) {
      if (attempt === 0 && (e.status === 409 || e.status === 422)) continue;
      throw e;
    }
  }
  if (!pr) {
    pr = await gh(token, repo('/pulls'), {
      method: 'POST',
      body: JSON.stringify({
        title: 'Review decisions', head: BRANCH, base: BASE, maintainer_can_modify: true,
        body: 'Pass, Rework and Reject decisions made in the Design System page. Each commit is one decision, written the way\n' +
              '`scripts/review-pass.sh` writes it. Merging records them; then regenerate the library if needed and publish.\n\n' +
              'The pass is tied to the fingerprint the reviewer was looking at. If an item changed since, it shows as expired.',
      }),
    });
  }
  return { pr: { number: pr.number, url: pr.html_url } };
}

/* What to show the owner when GitHub refuses: the status, GitHub's own reason, and which call it was, so a 403 can be told
   apart (an unapproved token, a missing permission, a protected branch) without anyone reading logs. Never includes the token. */
export function explain(e) {
  if (!e) return 'GitHub could not be reached';
  if (!e.status) return 'GitHub could not be reached';
  const why = e.body && e.body.message ? String(e.body.message).replace(/\s+/g, ' ').slice(0, 140) : '';
  return `GitHub said ${e.status}${why ? ': ' + why : ''}${e.step ? ' (' + e.step + ')' : ''}`;
}

/* A plain-language check of the connection, for the owner to run when Approve says GitHub refused. It tries, in order: to see the
   repository, to read main, and to make (then remove) a throwaway branch, which is the exact thing a decision needs first.
   Returns steps and one verdict sentence; never includes the token. */
export async function checkGithub(token) {
  const steps = [];
  const out = (verdict) => ({ ok: steps.every((x) => x.ok), steps, verdict });
  if (!token) return out('No token is set. Add GW_GITHUB_TOKEN to the project\'s environment variables and redeploy.');
  const run = async (name, fn) => {
    try { const v = await fn(); steps.push({ name, ok: true }); return { v }; }
    catch (e) { steps.push({ name, ok: false, status: e.status || 0, needs: e.needs || '', why: e.body && e.body.message ? String(e.body.message).slice(0, 120) : '' }); return { e }; }
  };
  const seen = await run('See the repository', () => gh(token, repo('')));
  if (seen.e) {
    const st = seen.e.status;
    return out(st === 404 || st === 403
      ? `The token cannot see ${OWNER}/${REPO}. It was most likely created under your personal account instead of the ${OWNER} organisation, is limited to other repositories, or the organisation has not approved it yet.`
      : st === 401 ? 'GitHub does not accept the token. It may have expired or been revoked; make a new one.' : 'GitHub could not be reached.');
  }
  const main = await run('Read main', () => gh(token, repo(`/git/ref/heads/${BASE}`)));
  if (main.e) return out('The token can see the repository but not read its contents. Set Contents to "Read and write" on the token.');
  const name = `review/check-${Date.now().toString(36)}`;
  const made = await run('Create a branch', () => gh(token, repo('/git/refs'), { method: 'POST', body: JSON.stringify({ ref: `refs/heads/${name}`, sha: main.v.object.sha }) }));
  if (made.e) {
    const needs = made.e.needs ? ` GitHub says this needs ${made.e.needs}.` : '';
    return out(made.e.status === 403
      ? `The token can read the repository but not change it.${needs} Edit the token: Repository permissions, Contents set to "Read and write" (and Pull requests set to "Read and write"). If the organisation approves tokens, an owner has to approve the change.`
      : `Creating a branch failed (${made.e.status}).`);
  }
  await run('Remove it again', () => gh(token, repo(`/git/refs/heads/${name}`), { method: 'DELETE' }));
  const prs = await run('Read pull requests', () => gh(token, repo('/pulls?state=open&per_page=1')));
  if (prs.e) return out('The token can change the repository but not use pull requests. Set Pull requests to "Read and write" on the token.');
  return out('Connected. Approve will open or update a pull request for the decisions.');
}
