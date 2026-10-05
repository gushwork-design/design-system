// Bruce's Slack pings for Alfred's comments (scripts/bruce-pings.mjs). No network. Run: node scripts/bruce-pings.test.mjs
process.env.GITHUB_TOKEN = 'gh'; process.env.SLACK_BOT_TOKEN = 'xoxb'; process.env.OWNER_SLACK_ID = 'UUTSAV';
const { parsePing, compose, run, itemLink } = await import('./bruce-pings.mjs');
let pass = 0, fail = 0;
const ok = (n, c, d = '') => (c ? pass++ : (fail++, console.log(`✘ ${n} ${d}`)));

const c = (id, issue, body) => ({ id, issue_url: `https://api.github.com/repos/gushwork-design/design-system/issues/${issue}`, body });
const p1 = parsePing(c(1, 7, '<!-- gw-hub:alfred -->\nFixed it in [#255](https://x). The blue is the hover state now.\n\nMore detail here.'), 'Rework thread: web/timeline');
ok('a fix reads as one sentence, links flattened', p1 && p1.line === 'Fixed it in #255.' && !p1.blocked && p1.issue === 7, JSON.stringify(p1));
const p2 = parsePing(c(2, 8, '<!-- gw-hub:alfred blocked -->\nShould the arrow sit top right or inline?'), 'Rework thread: dashboard/multi-select');
ok('a blocked comment is flagged', p2 && p2.blocked && p2.key === 'multi-select');
ok('an owner comment is not a ping', parsePing(c(3, 7, '<!-- gw-hub:owner -->\nhi'), 'Rework thread: web/timeline') === null);
ok('a comment on another issue is not a ping', parsePing(c(4, 9, '<!-- gw-hub:alfred -->\nx'), 'Some other issue') === null);

let t = compose([p1]);
ok('one fix: one line with the link', t.startsWith('Alfred finished *timeline*.') && t.includes(itemLink('web', 'timeline')) && !t.includes('\n'), t);
t = compose([p2]);
ok('one blocked: asks for him', t.startsWith('Alfred needs you on *multi-select*.') && t.includes('|Answer him>'), t);
t = compose([p1, p2]);
ok('a burst: one message, blocked first', t.split('\n')[0] === 'Alfred has 2 updates, and one needs you.' && t.split('\n')[1].includes('multi-select'), t);
const many = Array.from({ length: 11 }, (_, i) => ({ ...p1, id: i, key: 'k' + i }));
ok('a big burst is capped', compose(many).includes('…and 3 more'), compose(many));

// run(): reads comments, skips ones already marked, sends one DM, marks each
const posted = [], reacted = [];
const f = async (url, init = {}) => {
  const u = String(url), send = (b) => ({ ok: true, status: 200, json: async () => b });
  if (u.includes('/issues/comments?')) return send([c(10, 7, '<!-- gw-hub:alfred -->\nFixed it.'), c(11, 8, '<!-- gw-hub:alfred blocked -->\nWhich one?'), c(12, 7, '<!-- gw-hub:owner -->\nthanks'), c(13, 9, '<!-- gw-hub:alfred -->\nOld one.')]);
  if (u.includes('/reactions?')) return send(u.includes('/13/') ? [{ content: 'rocket' }] : []);
  if (u.endsWith('/reactions')) { reacted.push(u.split('/comments/')[1].split('/')[0]); return send({}); }
  if (u.endsWith('/issues/7')) return send({ title: 'Rework thread: web/timeline' });
  if (u.endsWith('/issues/8')) return send({ title: 'Rework thread: dashboard/multi-select' });
  if (u.includes('conversations.open')) return send({ ok: true, channel: { id: 'D1' } });
  if (u.includes('chat.postMessage')) { posted.push(JSON.parse(init.body)); return send({ ok: true }); }
  throw new Error('unexpected ' + u);
};
const r = await run({ f });
ok('two new Alfred comments, one DM', r.sent === 2 && posted.length === 1 && posted[0].channel === 'D1', JSON.stringify(r));
ok('already-sent and owner comments are skipped', !posted[0].text.includes('Old one') && !posted[0].text.includes('thanks'));
ok('each sent comment is marked', JSON.stringify(reacted.sort()) === JSON.stringify(['10', '11']), JSON.stringify(reacted));
ok('a burst carries no single-item metadata', !posted[0].metadata);

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
