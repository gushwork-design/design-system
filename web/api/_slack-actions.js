/* ============================================================================
   _slack-actions.js — Approve, Rework and Reject from Bruce's Slack pings (R55 addendum, 5 Oct 2026).

   A ping about an item Alfred finished carries three buttons. Approve records the pass at once. Rework and Reject open
   a small Slack form for the note, because the page requires one, then record it. Either way it is the SAME decision the
   Design System page records (recordDecision in _review.js): committed to main, and a Rework starts Alfred again.

   WHO MAY PRESS THEM. Only a Slack user in BRUCE_USER_IDS (falling back to OWNER_SLACK_ID), and the decision is recorded
   as OWNER_EMAIL (falling back to the first of the site's owners). Slack signs every interactive request; the events
   handler checks that signature before anything here runs.

   WHAT IS REVIEWED. The item as it is on the live site at the moment of the press: its fingerprints are read from the
   deployed library data, the same numbers the drawer would send.
   ========================================================================= */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { answerRequest } from './_access-request.js';

const SITE = (process.env.SITE_BASE || 'https://design.gushwork.ai').replace(/\/$/, '');
const VERB = { pass: 'Approved', rework: 'Sent back', reject: 'Rejected' };

export function itemLink(scope, key) { return `${SITE}/internal/design-system#review/${scope}/${key}`; }

/* The buttons under a one-item ping. Pure. */
export function decisionActions(scope, key) {
  const v = (a) => JSON.stringify({ a, s: scope, k: key });
  return {
    type: 'actions', block_id: `act:${scope}/${key}`,
    elements: [
      { type: 'button', action_id: 'gw_pass', text: { type: 'plain_text', text: 'Approve' }, style: 'primary', value: v('pass') },
      { type: 'button', action_id: 'gw_rework', text: { type: 'plain_text', text: 'Rework' }, value: v('rework') },
      { type: 'button', action_id: 'gw_reject', text: { type: 'plain_text', text: 'Reject' }, style: 'danger', value: v('reject') },
      { type: 'button', action_id: 'gw_open', text: { type: 'plain_text', text: 'Open' }, url: itemLink(scope, key) },
    ],
  };
}

/* The menu beside each item in a batched ping. Pure. */
export function decisionMenu(scope, key) {
  const o = (text, a) => ({ text: { type: 'plain_text', text }, value: JSON.stringify({ a, s: scope, k: key }) });
  return { type: 'overflow', action_id: 'gw_menu', options: [o('Approve', 'pass'), o('Rework…', 'rework'), o('Reject…', 'reject')] };
}

/* The note form for a Rework or Reject. Pure. */
export function noteModal(action, scope, key, where) {
  return {
    type: 'modal', callback_id: 'gw_note',
    private_metadata: JSON.stringify({ a: action, s: scope, k: key, ...where }),
    title: { type: 'plain_text', text: action === 'rework' ? 'Send it back' : 'Reject it' },
    submit: { type: 'plain_text', text: action === 'rework' ? 'Send back' : 'Reject' },
    close: { type: 'plain_text', text: 'Cancel' },
    blocks: [
      { type: 'section', text: { type: 'mrkdwn', text: `*${key}* · ${scope}` } },
      { type: 'input', block_id: 'note', label: { type: 'plain_text', text: action === 'rework' ? 'What needs fixing? Alfred reads this as his brief.' : 'Why is it rejected?' },
        element: { type: 'plain_text_input', action_id: 'v', multiline: true, max_length: 500 } },
    ],
  };
}

/* The message after a decision: the item's buttons or menu give way to a line saying what was done. Pure. */
export function markDone(blocks, scope, key, action) {
  const id = `${scope}/${key}`, done = `${VERB[action] || 'Done'} from Slack.`;
  return (blocks || []).flatMap((b) => {
    if (b.block_id === `act:${id}`) return [{ type: 'context', block_id: `done:${id}`, elements: [{ type: 'mrkdwn', text: done }] }];
    if (b.block_id === `item:${id}` && b.accessory) { const { accessory, ...rest } = b; return [{ ...rest, text: { ...rest.text, text: `${rest.text.text}  _${done}_` } }]; }
    return [b];
  });
}

/* The item's fingerprints as the live site has them, so the decision is on what is actually shown. */
export function liveFingerprints(scope, key, root = process.cwd()) {
  for (const p of ['library/data.json', 'preview/library/data.json']) {
    const f = join(root, p);
    if (!existsSync(f)) continue;
    try {
      const it = (JSON.parse(readFileSync(f, 'utf8')).items || []).find((i) => i.scope === scope && i.key === key);
      if (it) return { fp: it.fp || '', pfp: it.pfp || '' };
    } catch { /* fall through */ }
  }
  return null;
}

async function slack(token, method, body, form = false) {
  const r = await fetch(`https://slack.com/api/${method}`, { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': form ? 'application/x-www-form-urlencoded' : 'application/json; charset=utf-8' }, body: form ? new URLSearchParams(body).toString() : JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!j.ok) throw new Error(`slack ${method}: ${j.error || r.status}`);
  return j;
}

/**
 * One Slack interactive payload in. Returns what to answer Slack with: undefined for an empty 200, or an object for
 * a modal's response. deps: { token, allowed: Set of Slack IDs, email, record(body, email) -> [status, out], root }.
 */
export async function handleAction(payload, deps) {
  const { token, allowed, email, record, root } = deps;
  const user = payload.user && payload.user.id;
  if (!allowed.has(user) || !email) {
    if (payload.type === 'view_submission') return { response_action: 'errors', errors: { note: 'Only Utsav can decide from Slack.' } };
    return undefined;
  }
  const decide = async (action, scope, key, note) => {
    const fps = liveFingerprints(scope, key, root);
    if (!fps) return { ok: false, error: 'I can’t find that item on the live site any more.' };
    const [status, out] = await record({ scope, key, action, note, fp: fps.fp, pfp: fps.pfp }, email);
    return status === 200 ? { ok: true, out } : { ok: false, error: out.error || 'It did not save.' };
  };
  const finish = async (channel, ts, blocks, scope, key, action, res) => {
    if (res.ok) await slack(token, 'chat.update', { channel, ts, blocks: markDone(blocks, scope, key, action), text: `${VERB[action]} ${key}.` });
    else await slack(token, 'chat.postMessage', { channel, thread_ts: ts, text: `That didn’t go through: ${res.error} You can do it from the <${itemLink(scope, key)}|drawer>.` });
  };

  if (payload.type === 'block_actions') {
    const act = (payload.actions || [])[0] || {};
    if (act.action_id === 'gw_open') return undefined;
    /* Request access (R66): Approve or Decline on a DM from the restricted page. The sender is already known to be the
       owner (the allowlist above); the request itself is looked up by its id, never read from the button. */
    if (act.action_id === 'gw_access_approve' || act.action_id === 'gw_access_decline') {
      await answerRequest(payload, act.action_id === 'gw_access_approve', token);
      return undefined;
    }
    let v = {};
    try { v = JSON.parse(act.action_id === 'gw_menu' ? act.selected_option.value : act.value); } catch { return undefined; }
    if (!/^[a-z0-9-]{1,32}$/.test(v.s || '') || !/^[a-z0-9-]{1,80}$/.test(v.k || '') || !VERB[v.a]) return undefined;
    const channel = payload.channel && payload.channel.id, ts = payload.message && payload.message.ts;
    if (v.a === 'pass') {
      const res = await decide('pass', v.s, v.k, '');
      await finish(channel, ts, payload.message.blocks, v.s, v.k, 'pass', res);
      return undefined;
    }
    await slack(token, 'views.open', { trigger_id: payload.trigger_id, view: noteModal(v.a, v.s, v.k, { c: channel, t: ts }) });
    return undefined;
  }

  if (payload.type === 'view_submission' && payload.view && payload.view.callback_id === 'gw_note') {
    let m = {};
    try { m = JSON.parse(payload.view.private_metadata || '{}'); } catch { /* checked below */ }
    const note = String((((payload.view.state || {}).values || {}).note || {}).v?.value || '').trim();
    if (!note) return { response_action: 'errors', errors: { note: 'A note is needed.' } };
    if (!VERB[m.a] || !m.s || !m.k) return undefined;
    const res = await decide(m.a, m.s, m.k, note);
    if (!res.ok) return { response_action: 'errors', errors: { note: res.error } };
    if (m.c && m.t) {
      try {
        const h = await slack(token, 'conversations.history', { channel: m.c, latest: m.t, inclusive: 'true', limit: '1' }, true);
        await finish(m.c, m.t, (h.messages && h.messages[0] && h.messages[0].blocks) || [], m.s, m.k, m.a, res);
      } catch { /* the decision is saved; the message just keeps its buttons */ }
    }
    return undefined;
  }
  return undefined;
}
