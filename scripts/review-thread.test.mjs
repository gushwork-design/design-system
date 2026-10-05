// Tests for the pure parts of the rework thread (web/api/_review-thread.js) and Alfred's start text (web/api/_review.js).
// Run: node scripts/review-thread.test.mjs
import { parseComment, ownerComment, threadTitle } from '../web/api/_review-thread.js';
import { reworkText } from '../web/api/_review.js';

let pass = 0, fail = 0;
function t(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  ok ? pass++ : (fail++, console.log(`✘ ${name}\n  got  ${JSON.stringify(got)}\n  want ${JSON.stringify(want)}`));
}
const c = (body, login = 'utsav-gushwork') => ({ id: 1, created_at: '2026-10-05T14:00:00Z', body, user: { login } });

t('the title names the item', threadTitle('dashboard', 'sidebar-collapsed'), 'Rework thread: dashboard/sidebar-collapsed');
t('an owner comment reads as owner, marker stripped', parseComment(c('<!-- gw-hub:owner -->\nmake it white')).who + '|' + parseComment(c('<!-- gw-hub:owner -->\nmake it white')).body, 'owner|make it white');
t('an Alfred comment reads as alfred', parseComment(c('<!-- gw-hub:alfred -->\nFixed in #263')).who, 'alfred');
t('a blocked Alfred comment is flagged', parseComment(c('<!-- gw-hub:alfred blocked -->\nWhich grey?')).blocked, true);
t('a plain comment is someone else, with their login', [parseComment(c('hello', 'someone')).who, parseComment(c('hello', 'someone')).by], ['other', 'someone']);
t('the note carries its files as links', ownerComment('see shot', ['web/previews/web/refs/cta/x-1-shot.png']),
  '<!-- gw-hub:owner -->\nsee shot\n\nReference files:\n- [x-1-shot.png](https://github.com/gushwork-design/design-system/blob/main/web/previews/web/refs/cta/x-1-shot.png)');
t('a send-back start names the thread', reworkText({ scope: 'web', key: 'cta', note: 'n', fp: 'abc', thread: 12 }).includes('GitHub issue #12'), true);
t('a send-back with no thread says nothing about one', reworkText({ scope: 'web', key: 'cta', note: 'n', fp: 'abc' }).includes('Thread:'), false);
t('a reply starts in REPLY mode with the answer', reworkText({ scope: 'web', key: 'cta', reply: 'use neutral-900', thread: 12 }).startsWith('REPLY on web/cta. Utsav answered in the thread: use neutral-900'), true);

t('a send-back note is tagged rework', parseComment(c('<!-- gw-hub:owner rework -->\nmake it white')).kind, 'rework');
t('a reply carries no tag', parseComment(c('<!-- gw-hub:owner -->\nok')).kind, '');
t('the send-back marker is written', ownerComment('n', [], 'rework').startsWith('<!-- gw-hub:owner rework -->'), true);

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
