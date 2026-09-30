#!/usr/bin/env python3
"""Live previews of the four page templates, for the Preview links on /internal/templates.

    python3 scripts/template-previews.py <outdir>

Writes <outdir>/<slug>/index.html for ad-page, case-study, slide-deck and lead-magnet — the
templates' own HTML, not a screenshot of it. Two things are done to each copy, and nothing else:

  1. Paths. The templates reference ../../fonts and ../../../../assets from where they live in
     the repo; on the site those are /fonts and /assets.
  2. {{TOKENS}}. Ad-page and case-study are token pages, so they are filled with neutral sample
     copy — a generic company, and no invented named person (R24). The ad page's two testimonials
     are the cleared real ones its avatars belong to. The deck and the lead
     magnet ship as filled reference builds and are left as they are.

Run by publish-sheets.sh into the staged copy, so the previews are never edited by hand and
never drift from the template they show.
"""
import pathlib, re, shutil, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
AD_DIR = ROOT / 'skills/gushwork-web/templates/ad-page'

AD = {
 'PAGE_TITLE': 'Ad page template | Gushwork', 'META_DESCRIPTION': 'Sample campaign copy.',
 'OG_TITLE': 'Ad page template', 'OG_IMAGE_URL': '', 'PAGE_URL': '',
 'HERO_EYEBROW': 'For growth teams', 'HERO_H1': 'Your campaign headline goes here',
 'HERO_SUB': 'One line of supporting copy that carries the offer and the number that backs it.',
 'FORM_HEADING': 'See your lead potential', 'FORM_CTA': 'Check my lead potential',
 'PROOF_1': 'Live in 14 days', 'PROOF_2': 'No new headcount', 'PROOF_3': 'Cancel any time',
 # The two testimonials are the cleared ones the template's avatars belong to (Utsav, 24 Sep 2026;
 # DECISIONS.md, R24 clause 4): never move a photograph onto a quote its subject did not give.
 'QUOTE': '&ldquo;Gushwork has <em>saved me time, money and a whole lot of headaches.&rdquo;</em>',
 'QUOTE_NAME': 'Stephanie Snyder', 'QUOTE_ROLE': 'Manager at Source Equipment',
 'CTA_HEADING': 'Closing call to action', 'CTA_SUB': 'One supporting line.', 'CTA_NOTE': 'Sample note.',
 'CTA_QUOTE': '&ldquo;The first deal more than paid for the annual investment. Now the revenue generated is probably 20 to 30 times what I&rsquo;ve invested.&rdquo;',
 'CTA_QUOTE_NAME': 'Ryan Cimo', 'CTA_QUOTE_ROLE': 'Owner, Fraxtional',
 'EXPERT_VIDEO': '',
}
CS = {
 'CLIENT_NAME': 'Sample Co', 'CLIENT_SLUG': 'sample-co', 'INDUSTRY': 'B2B SaaS', 'COUNTRY': 'United States',
 'HERO_TITLE': 'How a sample company grew organic pipeline 6x in twelve months',
 'META_DESCRIPTION': 'Sample case study copy.',
 'STAT_1_VALUE': '6.2x', 'STAT_1_LABEL': 'organic pipeline', 'STAT_2_VALUE': '1.3M', 'STAT_2_LABEL': 'search impressions',
 'STAT_3_VALUE': '12', 'STAT_3_LABEL': 'months to rank',
 'H2_WHO_THEY_ARE': 'Who they are', 'H2_WHY_IT_MATTERS': 'Why it matters', 'H2_HOW_BUYERS_SEARCH': 'How buyers search',
 'QUOTE': 'Sample quote from the customer story.', 'QUOTE_NAME': 'Sample client', 'QUOTE_TITLE': 'Head of growth',
 'QUOTE_PHOTO': '', 'CHART_1_Y2': '40', 'CHART_1_Y3': '70', 'CHART_1_Y4': '100',
 'CHART_2_Y2': '35', 'CHART_2_Y3': '65', 'CHART_2_Y4': '95',
}

PROSE = ('Sample copy for this section. It shows the length and rhythm a real paragraph runs to, '
         'so the column reads as it will once the story is written.')

def fill(text, table):
    # Prose tokens carry their own brief after a dash — {{WHO_THEY_ARE — what the client sells…}} —
    # so the match takes everything up to the closing braces, not just the name.
    return re.sub(r'\{\{([A-Z_0-9]+)\b[^{}]*\}\}', lambda m: table.get(m.group(1), PROSE), text)

def sitepaths(text, up):
    # `up` is the number of ../ the template uses to reach the repo root.
    return re.sub(r'(?:\.\./){%d}(?=(?:fonts|assets|foundation)/)' % up, '/', text)

def noindex(text):
    # A preview is a reference, not a page to be found.
    return text.replace('<head>', '<head>\n<meta name="robots" content="noindex">', 1)

def write(out, slug, text):
    d = out / slug
    d.mkdir(parents=True, exist_ok=True)
    (d / 'index.html').write_text(noindex(text), encoding='utf-8')
    print(f'  templates/{slug}/index.html')

def main(out):
    out = pathlib.Path(out)

    t = (AD_DIR / 'ad-page.html').read_text(encoding='utf-8')
    t = sitepaths(t, 4)
    # Favicons sit beside the page, and the route is served without its trailing slash, so a
    # relative href would resolve one level up.
    for f in ('favicon.svg', 'favicon-32.png', 'apple-touch-icon.png'):
        t = t.replace('href="%s"' % f, 'href="/internal/templates/ad-page/%s"' % f)
    # The template's media fold plays the AI CRM render; that file lives with the staged lander.
    t = t.replace('src="ai-crm-flow.mp4?r=2026-09-18"', 'src="/internal/staging/ai-crm-lander/ai-crm-flow.mp4"')
    t = t.replace('poster="ai-crm-flow-poster.jpg?r=2026-09-18"', 'poster="/internal/staging/ai-crm-lander/ai-crm-flow-poster.jpg"')
    write(out, 'ad-page', fill(t, AD))
    for f in ('favicon.svg', 'favicon-32.png', 'apple-touch-icon.png'):
        shutil.copy(AD_DIR / f, out / 'ad-page' / f)

    t = (ROOT / 'skills/gushwork-web/templates/case-study/case-study.html').read_text(encoding='utf-8')
    write(out, 'case-study', fill(sitepaths(t, 4), CS))

    write(out, 'slide-deck', sitepaths((ROOT / 'templates/slide-deck/deck.html').read_text(encoding='utf-8'), 2))
    t = sitepaths((ROOT / 'templates/lead-magnet/lead-magnet.html').read_text(encoding='utf-8'), 2)
    # The pages are Letter-sized and butt together for print. On screen, centre them and
    # give each a gap so it reads as a document, not one long slab. Screen only — the
    # template itself is untouched.
    viewer = ('<style>@media screen{body{padding:32px 0}.page{margin:0 auto 32px;'
              'box-shadow:var(--gw-shadow-s3)}}</style>\n')
    write(out, 'lead-magnet', t.replace('</head>', viewer + '</head>', 1))

if __name__ == '__main__':
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(sys.argv[1])
