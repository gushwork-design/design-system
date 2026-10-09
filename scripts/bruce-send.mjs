// Bruce sends a DM to a teammate, on Utsav's word (8 Oct 2026). The one route for outward Slack messages: they go out as
// Bruce, never from Utsav's own account. Run by .github/workflows/bruce-send.yml, which only someone with write access
// to the repo can start, and only after Utsav has approved the exact text and recipient in chat.
//
//   TO=U06KMA1BQV8 TEXT='...' node scripts/bruce-send.mjs            send
//   TO=U06KMA1BQV8 TEXT='...' node scripts/bruce-send.mjs --dry-run  check it and print it
import crypto from 'node:crypto';
import { slack } from './bruce-pings.mjs';

const HUB = process.env.GW_HUB || 'https://design.gushwork.ai';

/* Validate the recipient and text. Pure, so it can be tested. */
export function check({ to, text }) {
  const id = String(to || '').trim();
  if (!/^U[A-Z0-9]{8,}$/.test(id)) throw new Error('TO must be a Slack user id like U06KMA1BQV8 (not a name, not a channel)');
  const body = String(text || '').trim();
  if (!body) throw new Error('TEXT is empty');
  if (body.length > 3000) throw new Error('TEXT is over 3000 characters');
  return { to: id, text: body };
}

/* The hub keeps the record of what Bruce sent (his "Messages he sent" list), so a send from here is reported to it as well, signed
   with the bot token both sides hold (an HMAC over the time, recipient and text: the token itself never travels). A failed report
   does not undo the send; it is said out loud. `logOnly` records a message that was already sent, without sending it again. */
export function sign(token, ts, to, text) { return crypto.createHmac('sha256', token).update(`${ts}.${to}.${String(text).slice(0, 200)}`).digest('hex'); }
export async function report(m, { f = fetch, now = Date.now() } = {}) {
  const ts = String(Math.floor(now / 1000)), body = { sent: [{ to: m.to, text: String(m.text).slice(0, 200) }] };
  try {
    const r = await f(`${HUB}/api/bruce-memory`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-bruce-send-ts': ts, 'x-bruce-send-sig': sign(process.env.SLACK_BOT_TOKEN || '', ts, m.to, body.sent[0].text) }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    return !!(r.ok && j && j.sent >= 1);
  } catch { return false; }
}

export async function run({ to, text, dry = false, logOnly = false, f = fetch } = {}) {
  const m = check({ to, text });
  if (dry) return { ...m, sent: false };
  if (logOnly) return { ...m, sent: false, logged: await report(m, { f }) };
  const dm = await slack('conversations.open', { users: m.to }, f);
  const posted = await slack('chat.postMessage', { channel: dm.channel.id, text: m.text, unfurl_links: false, unfurl_media: false }, f);
  return { ...m, sent: true, ts: posted.ts, logged: await report(m, { f }) };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run({ to: process.env.TO, text: process.env.TEXT, dry: process.argv.includes('--dry-run'), logOnly: process.env.LOG_ONLY === 'true' })
    .then((r) => { console.log(`${r.sent ? 'sent' : r.logged !== undefined ? 'recorded (not sent again)' : 'would send'} to ${r.to}:\n${r.text}`); if (r.logged === false) console.log('WARNING: the hub did not record this send, so it will not show in Messages he sent.'); })
    .catch((e) => { console.error(String(e.message || e)); process.exit(1); });
}
