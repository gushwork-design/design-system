/* ============================================================================
   _health.js — System health: is everything that keeps the hub alive working?  (R49)

   For the owner only. A module behind gw.js, like its neighbours (Hobby allows 12 functions).

   THREE WAYS IN
     GET   owner session        run every live check now and return them with the routine's last snapshot
     GET   ?cron=1              the daily Vercel cron (Authorization: Bearer CRON_SECRET). Runs the same checks and
                                sends the owner a Slack DM ONLY when something is failing, and only when the set
                                of failures has changed (or a failure has gone unanswered for 3 days).
     POST  x-gushwork-token     the Monday and Thursday routine, which can run what a repo checkout can (skill drift,
                                tests, unreleased commits) and a site cannot. Stored as the snapshot, shown with its age.

   A CHECK is { id, area, name, status, detail, fix }. status is
     ok       working
     warn     working, but needs improving (a token about to expire, no room left, something behind)
     fail     not working
     unknown  could not be checked (the check itself failed, or a token is not allowed to look)
   `fix` says what to change and where. Nothing here ever returns a secret: only whether one is set.

   EVERY CHECK IS TIME-BOXED and independent: one slow or broken service must not hide the others, and a check that
   throws becomes `unknown`, never a 500.
   ========================================================================= */

import crypto from 'node:crypto';
import tls from 'node:tls';
import { COOKIE, verify, readCookie, sessionSecret, GATE_ENABLED, googleConfigured, allowedDomain } from './_session.js';
import { isOwner, loadRules, readStatus, storeId } from './_access.js';
import { LIST_KEY as VISITS_KEY, MAX_ROWS as VISITS_MAX } from './_log-visit.js';

const OWNER = 'gushwork-design';
const REPO = 'design-system';
const SNAPSHOT_KEY = 'gw:health-snapshot';
const ALERT_KEY = 'gw:health-alert';
const BOX_MS = 4500;
const DAY = 86400000;

export const AREAS = ['Storage and data', 'Hosting', 'Integrations', 'Upkeep'];

const c = (area, id, name, status, detail, fix = '') => ({ id, area, name, status, detail, fix });

/* Run one check with a time box. A throw or a timeout is `unknown`, not a failure of the whole report. */
async function box(area, id, name, fn) {
  const t0 = Date.now();
  try {
    const out = await Promise.race([
      fn(),
      new Promise((_, rej) => setTimeout(() => rej(new Error('timed out')), BOX_MS)),
    ]);
    return { ...out, ms: Date.now() - t0 };
  } catch (e) {
    return { ...c(area, id, name, 'unknown', `Could not check it (${String(e && e.message || e).slice(0, 80)}).`), ms: Date.now() - t0 };
  }
}

const has = (env, k) => !!(env[k] && String(env[k]).trim());

function kvCfg(env) {
  const url = env.KV_REST_API_URL || env.UPSTASH_REDIS_REST_URL;
  const token = env.KV_REST_API_TOKEN || env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url, token } : null;
}
async function pipe(ctx, commands) {
  const cfg = kvCfg(ctx.env);
  if (!cfg) throw new Error('no store');
  const r = await ctx.fetch(`${cfg.url}/pipeline`, {
    method: 'POST', headers: { authorization: `Bearer ${cfg.token}`, 'content-type': 'application/json' }, body: JSON.stringify(commands),
  });
  if (!r.ok) throw new Error(`store said ${r.status}`);
  return r.json();
}

async function gh(ctx, path, init = {}) {
  const token = ctx.env.GW_GITHUB_TOKEN;
  if (!token) throw Object.assign(new Error('no token'), { status: 0 });
  const r = await ctx.fetch(`https://api.github.com${path}`, {
    ...init,
    headers: { authorization: `Bearer ${token}`, accept: 'application/vnd.github+json', 'x-github-api-version': '2022-11-28', 'user-agent': 'gushwork-design-hub', ...(init.headers || {}) },
  });
  if (!r.ok) throw Object.assign(new Error(`github ${r.status}`), { status: r.status });
  return r;
}

const daysUntil = (iso, now) => Math.floor((new Date(iso).getTime() - now) / DAY);
const ago = (ms) => (ms < 3600000 ? `${Math.max(1, Math.round(ms / 60000))} min` : ms < DAY ? `${Math.round(ms / 3600000)} h` : `${Math.round(ms / DAY)} d`);

/* ---------------------------------------------------------------- the checks */

function checks(ctx) {
  const { env, now } = ctx;
  const S = 'Storage and data', H = 'Hosting', I = 'Integrations', U = 'Upkeep';
  const list = [];
  const add = (area, id, name, fn) => { const p = box(area, id, name, fn); list.push(p); return p; };

  // ---- storage and data
  add(S, 'kv', 'Upstash store', async () => {
    if (!kvCfg(env)) return c(S, 'kv', 'Upstash store', 'fail', 'Not connected. Decisions, logs and the review queue cannot be saved.', 'Attach the Upstash store to the Vercel project (KV_REST_API_URL and KV_REST_API_TOKEN).');
    const t0 = Date.now();
    const key = 'gw:health-probe', val = String(now);
    const out = await pipe(ctx, [['SET', key, val, 'EX', '60'], ['GET', key], ['DEL', key]]);
    if (out[1] && out[1].result !== val) return c(S, 'kv', 'Upstash store', 'fail', 'It accepted a write but returned something else on read.', 'Check the Upstash database in its console.');
    const ms = Date.now() - t0;
    return c(S, 'kv', 'Upstash store', ms > 1500 ? 'warn' : 'ok', `Wrote, read and removed a probe in ${ms} ms.`, ms > 1500 ? 'Slow for a store this small. Check the Upstash region and status page.' : '');
  });
  add(S, 'kv-logs', 'Logs and the review queue', async () => {
    if (!kvCfg(env)) return c(S, 'kv-logs', 'Logs and the review queue', 'unknown', 'The store is not connected.');
    const out = await pipe(ctx, [['LLEN', VISITS_KEY], ['LLEN', 'gw:usage'], ['LLEN', 'gw:review-decisions']]);
    const [visits, usage, queued] = out.map((x) => Number(x && x.result) || 0);
    const near = visits >= VISITS_MAX * 0.9 || usage >= VISITS_MAX * 0.9;
    const detail = `${visits} visit rows, ${usage} usage rows, ${queued} review decision${queued === 1 ? '' : 's'} queued.`;
    if (queued > 0) return c(S, 'kv-logs', 'Logs and the review queue', 'warn', detail, 'Queued decisions were not recorded on main (GitHub refused them). Run check-approvals in a session, or fix the GitHub token.');
    if (near) return c(S, 'kv-logs', 'Logs and the review queue', 'warn', detail, 'A log is within 10% of its cap and trims its oldest rows. Export it if you need the history.');
    return c(S, 'kv-logs', 'Logs and the review queue', 'ok', detail);
  });
  add(S, 'edge', 'Access rules (Edge Config)', async () => {
    const e = await ctx.edge();
    if (!e.store) return c(S, 'edge', 'Access rules (Edge Config)', 'fail', 'No Edge Config store is attached, so the compiled default access rules apply.', 'Attach an Edge Config store (EDGE_CONFIG) to the Vercel project.');
    const st = e.state || {};
    const canWrite = has(env, 'VERCEL_API_TOKEN');
    if (st.state === 'unreachable' || st.state === 'http-error') return c(S, 'edge', 'Access rules (Edge Config)', 'fail', `The store could not be read (${st.state}${st.detail ? ' ' + st.detail : ''}). The default rules apply meanwhile.`, 'Check the Edge Config store and its connection string.');
    if (!canWrite) return c(S, 'edge', 'Access rules (Edge Config)', 'warn', 'Readable, but VERCEL_API_TOKEN is not set, so Access Control cannot save changes.', 'Add VERCEL_API_TOKEN (and VERCEL_TEAM_ID) to the Vercel project.');
    if (st.state === 'empty') return c(S, 'edge', 'Access rules (Edge Config)', 'warn', 'Readable, but no rules have been saved yet, so the compiled defaults apply.', 'Open Access Control and save once, so the rules live in the store.');
    return c(S, 'edge', 'Access rules (Edge Config)', 'ok', 'Readable, and the token to change it is set.');
  });
  add(S, 'blob', 'Blob storage', async () => has(env, 'BLOB_READ_WRITE_TOKEN')
    ? c(S, 'blob', 'Blob storage', 'ok', 'The token is set.')
    : c(S, 'blob', 'Blob storage', 'warn', 'No token, so output logging to Blob is off.', 'Attach a Blob store to the Vercel project if you want it.'));

  // ---- hosting
  add(H, 'site', 'The live site', async () => {
    const base = env.SITE_BASE || 'https://design.gushwork.ai';
    const r = await ctx.fetch(`${base}/version.json?h=${now}`, { headers: { 'cache-control': 'no-cache' } });
    if (!r.ok) return c(H, 'site', 'The live site', 'fail', `${base}/version.json answered ${r.status}.`, 'Open the latest deployment in Vercel and read its logs.');
    const v = await r.json().catch(() => ({}));
    return c(H, 'site', 'The live site', 'ok', `Answering, plugin v${v.version || '?'}.`);
  });
  const deployP = add(H, 'deploy', 'Latest production deployment', async () => {
    if (!has(env, 'VERCEL_API_TOKEN')) return c(H, 'deploy', 'Latest production deployment', 'unknown', 'VERCEL_API_TOKEN is not set, so deployments cannot be read.', 'Add VERCEL_API_TOKEN to the Vercel project.');
    const team = env.VERCEL_TEAM_ID ? `&teamId=${encodeURIComponent(env.VERCEL_TEAM_ID)}` : '';
    const auth = { authorization: `Bearer ${env.VERCEL_API_TOKEN}` };
    let project = env.VERCEL_PROJECT_ID || '';
    if (!project && env.VERCEL_DEPLOYMENT_ID) {
      const d = await ctx.fetch(`https://api.vercel.com/v13/deployments/${env.VERCEL_DEPLOYMENT_ID}?x=1${team}`, { headers: auth });
      if (d.ok) project = (await d.json()).projectId || '';
    }
    if (!project) return c(H, 'deploy', 'Latest production deployment', 'unknown', 'Could not tell which Vercel project this is.');
    const r = await ctx.fetch(`https://api.vercel.com/v6/deployments?projectId=${project}&target=production&limit=3${team}`, { headers: auth });
    if (r.status === 403 || r.status === 401) return c(H, 'deploy', 'Latest production deployment', 'unknown', 'The Vercel token is not allowed to read deployments.', 'Give the token read access to deployments, or ignore this row.');
    if (!r.ok) throw new Error(`vercel ${r.status}`);
    const dep = ((await r.json()).deployments || [])[0];
    if (!dep) return c(H, 'deploy', 'Latest production deployment', 'unknown', 'No production deployment was returned.');
    const age = ago(now - dep.created);
    ctx.lastDeploy = dep.created;
    if (dep.state === 'ERROR' || dep.readyState === 'ERROR') return c(H, 'deploy', 'Latest production deployment', 'fail', `The latest deployment (${age} ago) failed.`, 'Open it in Vercel and read the build log.');
    return c(H, 'deploy', 'Latest production deployment', 'ok', `Ready, published ${age} ago.`);
  });
  add(H, 'behind', 'Live site against main', async () => {
    if (!has(env, 'GW_GITHUB_TOKEN')) return c(H, 'behind', 'Live site against main', 'unknown', 'No GitHub token, so main cannot be read.');
    await deployP;   // the deploy check records when the live site was published
    if (!ctx.lastDeploy) return c(H, 'behind', 'Live site against main', 'unknown', 'The latest deployment time is not known.');
    const since = new Date(ctx.lastDeploy).toISOString();
    const r = await gh(ctx, `/repos/${OWNER}/${REPO}/commits?sha=main&since=${encodeURIComponent(since)}&per_page=50`);
    const commits = (await r.json()).filter((x) => !/^Review: /.test((x.commit && x.commit.message) || ''));
    if (!commits.length) return c(H, 'behind', 'Live site against main', 'ok', 'Everything on main is published (review decisions apply live).');
    return c(H, 'behind', 'Live site against main', 'warn', `${commits.length} change${commits.length === 1 ? '' : 's'} on main ${commits.length === 1 ? 'is' : 'are'} newer than the live site.`, 'Say "publish" in a session to deploy main.');
  });
  add(H, 'functions', 'Function count', async () => {
    if (!has(env, 'GW_GITHUB_TOKEN')) return c(H, 'functions', 'Function count', 'unknown', 'No GitHub token, so the code cannot be read.');
    const top = await (await gh(ctx, `/repos/${OWNER}/${REPO}/contents/web/api?ref=main`)).json();
    const auth = await (await gh(ctx, `/repos/${OWNER}/${REPO}/contents/web/api/auth?ref=main`)).json();
    const isFn = (x) => x.type === 'file' && /\.js$/.test(x.name) && !x.name.startsWith('_');
    const n = top.filter(isFn).length + auth.filter(isFn).length;
    const detail = `${n} of 12 serverless functions used on the Hobby plan.`;
    if (n > 12) return c(H, 'functions', 'Function count', 'fail', detail, 'Deploys are refused above 12. Move an endpoint behind gw.js as a _-prefixed module.');
    if (n >= 11) return c(H, 'functions', 'Function count', 'warn', detail, 'One more route and deploys are refused. Add new endpoints behind gw.js.');
    return c(H, 'functions', 'Function count', 'ok', detail);
  });
  add(H, 'tls', 'Certificate', async () => {
    const host = (env.SITE_BASE || 'https://design.gushwork.ai').replace(/^https?:\/\//, '').split('/')[0];
    const end = await ctx.certEnd(host);
    const d = daysUntil(end, now);
    if (d < 7) return c(H, 'tls', 'Certificate', 'fail', `The certificate for ${host} expires in ${d} days.`, 'Check the domain in Vercel. Certificates renew on their own unless DNS broke.');
    if (d < 21) return c(H, 'tls', 'Certificate', 'warn', `The certificate for ${host} expires in ${d} days.`, 'It should renew itself. If it has not by a week out, check the domain in Vercel.');
    return c(H, 'tls', 'Certificate', 'ok', `Valid for ${d} more days.`);
  });
  add(H, 'domain', 'Domain registration', async () => {
    const r = await ctx.fetch('https://rdap.org/domain/gushwork.ai', { headers: { accept: 'application/rdap+json' } });
    if (!r.ok) throw new Error(`rdap ${r.status}`);
    const ev = ((await r.json()).events || []).find((e) => e.eventAction === 'expiration');
    if (!ev) return c(H, 'domain', 'Domain registration', 'unknown', 'The registry did not give an expiry date.');
    const d = daysUntil(ev.eventDate, now);
    if (d < 14) return c(H, 'domain', 'Domain registration', 'fail', `gushwork.ai expires in ${d} days.`, 'Renew it at the registrar now.');
    if (d < 60) return c(H, 'domain', 'Domain registration', 'warn', `gushwork.ai expires in ${d} days.`, 'Renew it at the registrar, or turn on auto-renew.');
    return c(H, 'domain', 'Domain registration', 'ok', `gushwork.ai is registered for ${d} more days.`);
  });

  // ---- integrations
  add(I, 'signin', 'Sign-in', async () => {
    if (!GATE_ENABLED) return c(I, 'signin', 'Sign-in', 'fail', 'The sign-in gate is switched off, so internal and admin pages are open.', 'Set GATE_ENABLED back to true in web/api/_session.js.');
    if (!googleConfigured()) return c(I, 'signin', 'Sign-in', 'warn', 'Google sign-in is not configured; only the shared password works.', 'Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.');
    if (!has(env, 'SESSION_SECRET')) return c(I, 'signin', 'Sign-in', 'warn', 'SESSION_SECRET is not set, so sessions are signed with a key derived from the password.', 'Set SESSION_SECRET to a long random value.');
    const r = await ctx.fetch('https://accounts.google.com/.well-known/openid-configuration');
    if (!r.ok) return c(I, 'signin', 'Sign-in', 'warn', `Google's sign-in service answered ${r.status}.`);
    return c(I, 'signin', 'Sign-in', 'ok', `Gate on, Google configured for ${allowedDomain() || 'the team domain'}.`);
  });
  add(I, 'github', 'GitHub token', async () => {
    if (!has(env, 'GW_GITHUB_TOKEN')) return c(I, 'github', 'GitHub token', 'fail', 'GW_GITHUB_TOKEN is not set, so review decisions cannot reach the repo.', 'Add a fine-grained token for gushwork-design/design-system (Contents and Pull requests: read and write).');
    let r;
    try { r = await gh(ctx, `/repos/${OWNER}/${REPO}`); }
    catch (e) { return c(I, 'github', 'GitHub token', 'fail', e.status === 401 ? 'GitHub does not accept the token. It may have expired or been revoked.' : `GitHub answered ${e.status || 'nothing'} for the repository.`, 'Make a new token and set GW_GITHUB_TOKEN.'); }
    const exp = r.headers && r.headers.get && r.headers.get('github-authentication-token-expiration');
    if (exp) {
      const d = daysUntil(exp.replace(' UTC', 'Z').replace(' ', 'T'), now);
      if (Number.isFinite(d) && d < 14) return c(I, 'github', 'GitHub token', d < 3 ? 'fail' : 'warn', `The token expires in ${d} days.`, 'Make a new token and replace GW_GITHUB_TOKEN before it lapses.');
      if (Number.isFinite(d)) return c(I, 'github', 'GitHub token', 'ok', `Works, expires in ${d} days.`);
    }
    return c(I, 'github', 'GitHub token', 'ok', 'Works, and has no expiry date.');
  });
  add(I, 'bypass', 'Decisions straight to main', async () => {
    if (!has(env, 'GW_GITHUB_TOKEN')) return c(I, 'bypass', 'Decisions straight to main', 'unknown', 'No GitHub token.');
    let sets;
    try { sets = await (await gh(ctx, `/repos/${OWNER}/${REPO}/rulesets`)).json(); }
    catch (e) { return c(I, 'bypass', 'Decisions straight to main', 'unknown', 'The token is not allowed to read the repository rules.'); }
    const rule = (sets || []).find((x) => /main/i.test(x.name || ''));
    if (!rule) return c(I, 'bypass', 'Decisions straight to main', 'ok', 'No ruleset on main, so decisions commit directly.');
    const detail = await (await gh(ctx, `/repos/${OWNER}/${REPO}/rulesets/${rule.id}`)).json();
    return (detail.bypass_actors || []).length
      ? c(I, 'bypass', 'Decisions straight to main', 'ok', 'The main ruleset lets the bot commit directly.')
      : c(I, 'bypass', 'Decisions straight to main', 'warn', 'The main ruleset has no bypass, so each decision opens a pull request instead.', 'Add the Repository admin role to the ruleset bypass list (mode: always).');
  });
  add(I, 'slack', 'Slack app', async () => {
    if (!has(env, 'SLACK_BOT_TOKEN')) return c(I, 'slack', 'Slack app', 'warn', 'SLACK_BOT_TOKEN is not set, so notices and failure alerts cannot be sent.', 'Add the bot token to the Vercel project.');
    const r = await ctx.fetch('https://slack.com/api/auth.test', { method: 'POST', headers: { authorization: `Bearer ${env.SLACK_BOT_TOKEN}` } });
    const j = await r.json().catch(() => ({}));
    if (!j.ok) return c(I, 'slack', 'Slack app', 'fail', `Slack refused the bot token (${j.error || r.status}).`, 'Reinstall the Slack app and set a fresh SLACK_BOT_TOKEN.');
    const missing = ['SLACK_SIGNING_SECRET', 'OWNER_SLACK_ID'].filter((k) => !has(env, k));
    return missing.length
      ? c(I, 'slack', 'Slack app', 'warn', `The bot token works, but ${missing.join(' and ')} ${missing.length === 1 ? 'is' : 'are'} not set.`, 'Without OWNER_SLACK_ID the daily failure alert has nobody to DM.')
      : c(I, 'slack', 'Slack app', 'ok', `Connected as ${j.user || 'the bot'}.`);
  });
  add(I, 'anthropic', 'Anthropic key (concierge)', async () => {
    if (!has(env, 'ANTHROPIC_API_KEY')) return c(I, 'anthropic', 'Anthropic key (concierge)', 'warn', 'ANTHROPIC_API_KEY is not set, so the concierge chat is off.', 'Add the key to the Vercel project if you want the concierge.');
    const r = await ctx.fetch('https://api.anthropic.com/v1/models?limit=1', { headers: { 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' } });
    if (r.status === 401 || r.status === 403) return c(I, 'anthropic', 'Anthropic key (concierge)', 'fail', 'Anthropic refused the key.', 'Make a new key and set ANTHROPIC_API_KEY.');
    return r.ok ? c(I, 'anthropic', 'Anthropic key (concierge)', 'ok', 'The key is accepted.') : c(I, 'anthropic', 'Anthropic key (concierge)', 'warn', `Anthropic answered ${r.status}.`);
  });
  add(I, 'trigger', 'Rework routine trigger', async () => (has(env, 'GW_REWORK_TRIGGER_URL') && has(env, 'GW_REWORK_TRIGGER_TOKEN'))
    ? c(I, 'trigger', 'Rework routine trigger', 'ok', 'Set. A rework starts the routine at once.')
    : c(I, 'trigger', 'Rework routine trigger', 'warn', 'Not set, so a rework waits for the nightly run.', 'Set GW_REWORK_TRIGGER_URL and GW_REWORK_TRIGGER_TOKEN from the routine\'s API trigger.'));

  // ---- upkeep
  add(U, 'prs', 'Open pull requests', async () => {
    if (!has(env, 'GW_GITHUB_TOKEN')) return c(U, 'prs', 'Open pull requests', 'unknown', 'No GitHub token.');
    const prs = await (await gh(ctx, `/repos/${OWNER}/${REPO}/pulls?state=open&per_page=50`)).json();
    const old = prs.filter((p) => now - new Date(p.created_at).getTime() > 3 * DAY).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    if (!old.length) return c(U, 'prs', 'Open pull requests', 'ok', `${prs.length} open, none older than 3 days.`);
    const list = old.slice(0, 4).map((p) => `#${p.number} (${ago(now - new Date(p.created_at).getTime())})`).join(', ');
    return c(U, 'prs', 'Open pull requests', 'warn', `${old.length} of ${prs.length} open for more than 3 days: ${list}${old.length > 4 ? ' and more' : ''}.`, 'Merge, close or update them.');
  });
  add(U, 'env', 'Configuration', async () => {
    const need = ['KV_REST_API_URL', 'KV_REST_API_TOKEN', 'SESSION_SECRET', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GW_GITHUB_TOKEN', 'SLACK_BOT_TOKEN', 'SLACK_SIGNING_SECRET', 'OWNER_SLACK_ID', 'GUSHWORK_NOTICE_TOKEN', 'VERCEL_API_TOKEN', 'CRON_SECRET'];
    const missing = need.filter((k) => !has(env, k) && !(k.startsWith('KV_') && kvCfg(env)));
    return missing.length
      ? c(U, 'env', 'Configuration', 'warn', `Not set: ${missing.join(', ')}.`, 'Add them in the Vercel project settings. Only names are shown here, never values.')
      : c(U, 'env', 'Configuration', 'ok', `All ${need.length} expected variables are set.`);
  });
  add(U, 'cron', 'Daily failure alert', async () => has(env, 'CRON_SECRET')
    ? c(U, 'cron', 'Daily failure alert', 'ok', 'Runs daily and DMs you only when something fails.')
    : c(U, 'cron', 'Daily failure alert', 'warn', 'CRON_SECRET is not set, so the daily check is refused and nobody is alerted.', 'Set CRON_SECRET in the Vercel project (any long random string).'));

  return list;
}

/* The routine's snapshot rows become checks too, marked with where they came from and how old they are. */
export function fromSnapshot(snap, now) {
  if (!snap || !Array.isArray(snap.checks)) {
    return [c('Upkeep', 'routine', 'Repo checks (Monday and Thursday routine)', 'unknown', 'The routine has not reported yet.', 'Create the routine and give it GUSHWORK_NOTICE_TOKEN so it can report.')];
  }
  const age = now - new Date(snap.at).getTime();
  const out = snap.checks.map((x) => ({ ...c('Upkeep', `routine-${x.id}`, x.name, ['ok', 'warn', 'fail'].includes(x.status) ? x.status : 'unknown', String(x.detail || '').slice(0, 300), String(x.fix || '').slice(0, 200)), source: 'routine' }));
  out.unshift({ ...c('Upkeep', 'routine', 'Repo checks (Monday and Thursday routine)', age > 5 * DAY ? 'warn' : 'ok', `Last reported ${ago(age)} ago.`, age > 5 * DAY ? 'The routine has missed a run. Check it in claude.ai.' : ''), source: 'routine' });
  return out;
}

export async function runChecks(ctx) {
  const results = await Promise.all(checks(ctx));
  const order = { fail: 0, warn: 1, unknown: 2, ok: 3 };
  const counts = { ok: 0, warn: 0, fail: 0, unknown: 0 };
  for (const r of results) counts[r.status]++;
  return { at: new Date(ctx.now).toISOString(), checks: results, counts, order };
}

/* ------------------------------------------------------------- the alert DM */

export function failing(checks) { return checks.filter((x) => x.status === 'fail'); }

export function alertText(fails, base) {
  const lines = fails.map((x) => `• *${x.name}*: ${x.detail}`).join('\n');
  return `System health: ${fails.length} thing${fails.length === 1 ? ' is' : 's are'} failing.\n${lines}\n<${base}/admin/system-health|Open System health>`;
}

/* Decide whether to DM. Pure: takes the previous alert record, returns whether to send and what to keep. It sends when the set of
   failures is new or changed, repeats after 3 days if the same ones are still failing, and forgets the record once all is well. */
export function alertDecision(fails, prev, now) {
  if (!fails.length) return { send: false, store: null, clear: !!prev };
  const sig = fails.map((x) => x.id).sort().join(',');
  if (prev && prev.sig === sig && now - prev.at < 3 * DAY) return { send: false, store: prev, clear: false };
  return { send: true, store: { sig, at: now }, clear: false };
}

async function sendDm(ctx, text) {
  const { env } = ctx;
  if (!has(env, 'SLACK_BOT_TOKEN') || !has(env, 'OWNER_SLACK_ID')) return { sent: false, why: 'Slack is not configured' };
  const r = await ctx.fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST', headers: { authorization: `Bearer ${env.SLACK_BOT_TOKEN}`, 'content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ channel: env.OWNER_SLACK_ID, text, unfurl_links: false }),
  });
  const j = await r.json().catch(() => ({}));
  return j.ok ? { sent: true } : { sent: false, why: j.error || `status ${r.status}` };
}

/* ------------------------------------------------------------------ handler */

function json(res, status, body) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, private');
  res.status(status).end(JSON.stringify(body));
}
const eq = (a, b) => { const A = Buffer.from(String(a || '')), B = Buffer.from(String(b || '')); return A.length > 0 && A.length === B.length && crypto.timingSafeEqual(A, B); };

function certEnd(host) {
  return new Promise((resolve, reject) => {
    const s = tls.connect({ host, port: 443, servername: host, timeout: 4000 }, () => { const cert = s.getPeerCertificate(); s.end(); cert && cert.valid_to ? resolve(new Date(cert.valid_to).toISOString()) : reject(new Error('no certificate')); });
    s.on('error', reject); s.on('timeout', () => { s.destroy(); reject(new Error('timed out')); });
  });
}

export function makeCtx(env = process.env, f = fetch, now = Date.now()) {
  const edge = async () => { await loadRules(); return { store: !!storeId(), state: readStatus() }; };
  return { env, fetch: f, now, certEnd, edge, lastDeploy: 0 };
}

async function readSnapshot(ctx) {
  try { const out = await pipe(ctx, [['GET', SNAPSHOT_KEY]]); return out[0] && out[0].result ? JSON.parse(out[0].result) : null; } catch { return null; }
}

export default async function handler(req, res, ctxIn) {
  const ctx = ctxIn || makeCtx();
  const env = ctx.env;

  if (req.method === 'POST') {
    if (!eq(req.headers['x-gushwork-token'], env.GUSHWORK_NOTICE_TOKEN)) return json(res, 401, { error: 'Not allowed.' });
    let body = req.body; if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = null; } }
    if (!body || !Array.isArray(body.checks) || body.checks.length > 60) return json(res, 400, { error: 'Send { checks: [{ id, name, status, detail, fix }] }.' });
    const clean = body.checks.map((x) => ({ id: String(x.id || '').replace(/[^a-z0-9-]/gi, '').slice(0, 40), name: String(x.name || '').slice(0, 80), status: x.status, detail: String(x.detail || '').slice(0, 300), fix: String(x.fix || '').slice(0, 200) })).filter((x) => x.id && x.name);
    try { await pipe(ctx, [['SET', SNAPSHOT_KEY, JSON.stringify({ at: new Date(ctx.now).toISOString(), checks: clean })]]); } catch { return json(res, 502, { error: 'Could not store it.' }); }
    return json(res, 200, { ok: true, stored: clean.length });
  }
  if (req.method !== 'GET') return json(res, 405, { error: 'GET or POST only' });

  const cron = String((req.query && req.query.cron) || '') === '1';
  if (cron) {
    if (!eq(String(req.headers.authorization || '').replace(/^Bearer /, ''), env.CRON_SECRET)) return json(res, 401, { error: 'Not allowed.' });
    const run = await runChecks(ctx);
    const fails = failing(run.checks);
    let prev = null;
    try { const o = await pipe(ctx, [['GET', ALERT_KEY]]); prev = o[0] && o[0].result ? JSON.parse(o[0].result) : null; } catch { /* no record */ }
    const d = alertDecision(fails, prev, ctx.now);
    let dm = { sent: false };
    if (d.send) {
      dm = await sendDm(ctx, alertText(fails, env.SITE_BASE || 'https://design.gushwork.ai'));
      if (dm.sent) { try { await pipe(ctx, [['SET', ALERT_KEY, JSON.stringify(d.store)]]); } catch { /* next run will repeat it */ } }
    } else if (d.clear) { try { await pipe(ctx, [['DEL', ALERT_KEY]]); } catch { /* ignore */ } }
    return json(res, 200, { ok: true, failing: fails.map((x) => x.id), dm });
  }

  const session = await verify(readCookie(req.headers.cookie, COOKIE), sessionSecret());
  if (!session || !session.email) return json(res, 401, { error: 'Not signed in.' });
  if (!isOwner(session.email)) return json(res, 403, { error: 'Owners only.' });

  const [run, snap] = await Promise.all([runChecks(ctx), readSnapshot(ctx)]);
  const extra = fromSnapshot(snap, ctx.now);
  const all = [...run.checks, ...extra];
  const counts = { ok: 0, warn: 0, fail: 0, unknown: 0 };
  for (const x of all) counts[x.status]++;
  return json(res, 200, { at: run.at, areas: AREAS, checks: all, counts, snapshotAt: snap ? snap.at : null });
}
