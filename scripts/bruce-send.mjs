// Bruce sends a DM to a teammate, on Utsav's word (8 Oct 2026). The one route for outward Slack messages: they go out as
// Bruce, never from Utsav's own account. Run by .github/workflows/bruce-send.yml, which only someone with write access
// to the repo can start, and only after Utsav has approved the exact text and recipient in chat.
//
//   TO=U06KMA1BQV8 TEXT='...' node scripts/bruce-send.mjs            send
//   TO=U06KMA1BQV8 TEXT='...' node scripts/bruce-send.mjs --dry-run  check it and print it
import { slack } from './bruce-pings.mjs';

/* Validate the recipient and text. Pure, so it can be tested. */
export function check({ to, text }) {
  const id = String(to || '').trim();
  if (!/^U[A-Z0-9]{8,}$/.test(id)) throw new Error('TO must be a Slack user id like U06KMA1BQV8 (not a name, not a channel)');
  const body = String(text || '').trim();
  if (!body) throw new Error('TEXT is empty');
  if (body.length > 3000) throw new Error('TEXT is over 3000 characters');
  return { to: id, text: body };
}

export async function run({ to, text, dry = false, f = fetch } = {}) {
  const m = check({ to, text });
  if (dry) return { ...m, sent: false };
  const dm = await slack('conversations.open', { users: m.to }, f);
  const posted = await slack('chat.postMessage', { channel: dm.channel.id, text: m.text, unfurl_links: false, unfurl_media: false }, f);
  return { ...m, sent: true, ts: posted.ts };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run({ to: process.env.TO, text: process.env.TEXT, dry: process.argv.includes('--dry-run') })
    .then((r) => console.log(`${r.sent ? 'sent' : 'would send'} to ${r.to}:\n${r.text}`))
    .catch((e) => { console.error(String(e.message || e)); process.exit(1); });
}
