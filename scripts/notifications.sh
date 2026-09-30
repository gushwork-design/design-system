#!/usr/bin/env bash
# web/notifications.json — what the bell in the panel bar shows.
#
#   bash scripts/notifications.sh
#
# TWO SOURCES, merged newest-first:
#
#   1. CHANGELOG.md — every release, which is itself generated from git history,
#      so the panel cannot claim something shipped that did not.
#   2. web/notices.json — OPTIONAL and HAND-WRITTEN. This is where a notice, a win
#      or an update that is not a release goes. Same shape, and the `date` is
#      ISO (YYYY-MM-DD):
#
#        { "items": [ { "date": "2026-09-29", "title": "..." } ] }
#
# The blue dot on the bell means "something here is from the last seven days" —
# see the note above the dot in web/shell.js.
set -euo pipefail
cd "$(dirname "$0")/.."
python3 - <<'PY'
import json, pathlib, re, datetime
root = pathlib.Path('.')
MONTHS = {m: i for i, m in enumerate(
    ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'], 1)}

items = []
for line in (root / 'CHANGELOG.md').read_text().splitlines():
    m = re.match(r'^\|\s*\*\*(v[\d.]+)\*\*\s*\|\s*(\d{1,2})\s+(\w{3})\s+(\d{4})(?:\s+(\d{2}):(\d{2}))?[^|]*\|\s*([^|]+?)\s*\|', line)
    if not m:
        continue
    version, day, mon, year, hh, mm, title = m.groups()
    if mon not in MONTHS:
        continue
    items.append({'date': '%s-%02d-%02d' % (year, MONTHS[mon], int(day)),
                  'at': '%s:%s' % (hh or '00', mm or '00'),
                  'title': title.strip(), 'version': version, 'href': '/internal/changelog'})

extra = root / 'web' / 'notices.json'
if extra.exists():
    for it in json.loads(extra.read_text()).get('items', []):
        if it.get('date') and it.get('title'):
            items.append({'date': it['date'], 'at': it.get('at', '23:59'), 'title': it['title'],
                          'version': it.get('version', ''), 'href': it.get('href', '/internal/changelog')})

# Sorted on date AND time, newest first. The changelog carries HH:MM, so two
# releases on the same day order correctly rather than falling back on file order.
# A hand-written notice with no time defaults to 23:59, which puts it above the
# day's releases — a notice you pushed today is the newer thing.
items.sort(key=lambda i: (i['date'], i['at']), reverse=True)
items = items[:8]
for it in items:
    d = datetime.date.fromisoformat(it['date'])
    it['label'] = '%d %s %d' % (d.day, d.strftime('%b'), d.year)

out = root / 'web' / 'notifications.json'
out.write_text(json.dumps({'items': items}, indent=2) + '\n')
print('  web/notifications.json — %d items, newest %s' % (len(items), items[0]['date'] if items else '-'))
PY
