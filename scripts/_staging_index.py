#!/usr/bin/env python3
"""Adds the "Team pages" section to the STAGED copy of the Staging index.

    python3 scripts/_staging_index.py <stage-dir>

Every page published into a team's lane lives at web/internal/staging/<lane>/<page>/ and carries a
staging.json (title, blurb, owner), which the Publish tool writes. Nobody edits
web/internal/staging.html to list it: this reads the manifests at deploy time and fills the two
markers in the staged copy, so the committed file stays as authored. Pages with no manifest (the
legacy ones) are listed by hand in the file itself and are left alone.

With no lane pages it removes the markers and adds nothing. With lane pages and no marker it
fails, because a page that is live but missing from the index is the failure this exists to stop.
"""
import glob, html, json, os, sys

stage = sys.argv[1]
page = os.path.join(stage, "internal/staging.html")
ARROW = ('<svg viewBox="0 0 256 256" aria-hidden="true"><path d="M221.66,133.66l-72,72a8,8,0,0,1-11.32-11.32'
         'L196.69,136H40a8,8,0,0,1,0-16H196.69L138.34,61.66a8,8,0,0,1,11.32-11.32l72,72A8,8,0,0,1,221.66,133.66Z"/></svg>')
PLACEHOLDER = ('<span class="st-pv" style="display:grid;place-items:center"><svg viewBox="0 0 256 256" '
               'fill="var(--gw-color-neutral-400)" aria-hidden="true" style="width:24px;height:24px"><path d="M216,40H40A16,16,'
               '0,0,0,24,56V200a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A16,16,0,0,0,216,40Zm0,16V88H40V56ZM40,200V104H216v96Z"/></svg></span>')
SEC, TOC = "<!-- team-pages:section -->", "<!-- team-pages:toc -->"

rows = []
for mf in sorted(glob.glob(os.path.join(stage, "internal/staging/*/*/staging.json"))):
    slug = os.path.basename(os.path.dirname(mf))
    lane = os.path.basename(os.path.dirname(os.path.dirname(mf)))
    path = f"{lane}/{slug}"
    try:
        m = json.load(open(mf))
        for k in ("title", "blurb", "owner"):
            assert isinstance(m.get(k), str) and m[k].strip()
    except (ValueError, AssertionError):
        print(f"  staging index: skipped {path}, its staging.json is not valid")
        continue
    e = lambda k: html.escape(str(m[k]))
    thumb = os.path.exists(os.path.join(os.path.dirname(mf), "thumb.png"))
    prev = (f'<img class="st-pv" src="/internal/staging/{path}/thumb.png" alt="{e("title")}" loading="lazy">'
            if thumb else PLACEHOLDER)
    rows.append(f'''            <tr>
              <td class="c-prev">{prev}</td>
              <td class="c-name">{e("title")}<br><span style="color:var(--gw-color-neutral-500);font-weight:400">{html.escape(lane)}</span></td>
              <td class="u">{e("blurb")} <span style="color:var(--gw-color-neutral-500)">By {e("owner")}.</span></td>
              <td class="c-act"><a class="st-open" href="/internal/staging/{path}">Open {ARROW}</a></td>
            </tr>''')

h = open(page).read()
if not rows:
    open(page, "w").write(h.replace(SEC, "").replace(TOC, ""))
    sys.exit(0)
if SEC not in h or TOC not in h:
    sys.exit(f"{page} has no team-pages markers, so {len(rows)} lane page(s) would be live but unlisted")
section = f'''<section class="st-sec" id="team-pages">
        <h2>Team pages</h2>
        <p class="st-note">Published by each team into its own lane, with no review from the owner. Each lists itself here.</p>
          <table class="st-table">
            <thead>
              <tr>
                <th class="c-prev" scope="col">Preview</th>
                <th class="c-name" scope="col">Project</th>
                <th scope="col">What it is</th>
                <th class="c-act" scope="col"><span class="gw-sr">Open</span></th>
              </tr>
            </thead>
            <tbody>
{chr(10).join(rows)}
            </tbody>
          </table>
      </section>'''
open(page, "w").write(h.replace(SEC, section).replace(TOC, '<a href="#team-pages">Team pages</a>'))
print(f"  staging index: {len(rows)} team page(s)")
