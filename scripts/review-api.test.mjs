// Tests for the pure parts of web/api/_review.js: validating a decision and reading the state hash.
// Run: node scripts/review-api.test.mjs
import { checkDecision, parseState, publicState } from '../web/api/_review.js';

let pass = 0, fail = 0;
function t(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  ok ? pass++ : (fail++, console.log(`✘ ${name}\n  got  ${JSON.stringify(got)}\n  want ${JSON.stringify(want)}`));
}
const at = new Date('2026-10-01T10:00:00Z'), who = 'utsav.singh@gushwork.ai';

t('a pass needs no note', checkDecision({ scope: 'foundation', key: 'color', action: 'pass', fp: 'abcdef0123456789' }, who, at),
  { ok: true, row: { at: '2026-10-01T10:00:00.000Z', scope: 'foundation', key: 'color', action: 'pass', note: '', fp: 'abcdef0123456789', pfp: '', by: who } });
t('a reject without a note is refused', checkDecision({ scope: 'web', key: 'button', action: 'reject' }, who, at).ok, false);
t('a rework without a note is refused', checkDecision({ scope: 'web', key: 'button', action: 'rework', note: '   ' }, who, at).ok, false);
t('a rework with a note is accepted', checkDecision({ scope: 'web', key: 'button', action: 'rework', note: 'labels bind raw white' }, who, at).ok, true);
t('an unknown action is refused', checkDecision({ scope: 'web', key: 'button', action: 'delete' }, who, at).ok, false);
t('a path-like key is refused', checkDecision({ scope: 'web', key: '../etc', action: 'pass' }, who, at).ok, false);
t('an upper-case scope is refused', checkDecision({ scope: 'Web', key: 'button', action: 'pass' }, who, at).ok, false);
t('a non-hex fingerprint is refused', checkDecision({ scope: 'web', key: 'button', action: 'pass', fp: '<script>' }, who, at).ok, false);
t('undo is accepted without a note', checkDecision({ scope: 'web', key: 'button', action: 'undo' }, who, at).ok, true);
t('a long note is cut to 500', checkDecision({ scope: 'web', key: 'button', action: 'reject', note: 'x'.repeat(900) }, who, at).row.note.length, 500);
t('no body is refused', checkDecision(null, who, at).ok, false);
t('the state hash is read into an object', parseState(['web/button', '{"action":"pass"}', 'foundation/color', '{"action":"rework","note":"n"}']),
  { 'web/button': { action: 'pass' }, 'foundation/color': { action: 'rework', note: 'n' } });
t('a bad row is skipped, not thrown', parseState(['a', '{oops', 'b', '{"action":"pass"}']), { b: { action: 'pass' } });
t('an empty answer is an empty state', parseState(null), {});

// The drawing's fingerprint rides along with the decision (R45 addendum, 5 Oct 2026).
t('a preview fingerprint is kept', checkDecision({ scope: 'web', key: 'button', action: 'pass', fp: 'abcdef0123456789', pfp: '0123456789abcdef' }, who, at).row.pfp, '0123456789abcdef');
t('a non-hex preview fingerprint is refused', checkDecision({ scope: 'web', key: 'button', action: 'pass', fp: 'abcdef0123456789', pfp: 'x' }, who, at).ok, false);
t('teammates see the preview fingerprint too', publicState({ 'web/button': { action: 'pass', at: 'now', fp: 'a'.repeat(16), pfp: 'b'.repeat(16), via: 'main', note: 'private' } }), { 'web/button': { action: 'pass', at: 'now', fp: 'a'.repeat(16), pfp: 'b'.repeat(16), via: 'main' } });

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
