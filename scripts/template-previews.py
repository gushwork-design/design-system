#!/usr/bin/env python3
"""Live previews of the page templates, for the Preview links on /internal/templates.

    python3 scripts/template-previews.py <outdir>

Writes <outdir>/<slug>/index.html for ad-page, ad-page-signup, ad-page-comparison, support-ops-app, growth-report, case-study, slide-deck, lead-magnet and one-pager — the
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

# ---- ad-page-signup: neutral sample copy for every token, so the preview reads as a page and shows where each string goes.
# Deliberately generic: no product claims, no named customers. The closing quote is the cleared Ryan Cimo one the
# template's avatar belongs to (R24 clause 4), as in the ad-page preview above.
def _signup_sample():
    slot = ('<div style="display:grid;place-items:center;width:100%%;height:100%%;min-height:200px;text-align:center;'
            'color:var(--gw-color-neutral-600);font:var(--gw-text-body-18-med)">%s</div>')
    d = {
     'PAGE_TITLE': 'Sign-up ad page template', 'META_DESCRIPTION': 'Sample campaign copy.',
     'OG_TITLE': 'Sign-up ad page template', 'OG_IMAGE_URL': '', 'PAGE_URL': '',
     'NAV_CTA_LABEL': 'Sign up', 'CTA_LABEL': 'Sign up with Google', 'CTA_HREF': '#', 'CTA_HINT': 'try for free',
     'HERO_EYEBROW': 'A short claim about the offer', 'HERO_H1': 'Your campaign headline goes here',
     'HERO_SUB': 'One or two lines of supporting copy that carry the offer and the number that backs it.',
     'HERO_TICK_1': 'A reassurance about setup', 'HERO_TICK_2': 'A reassurance about control',
     'HERO_ILLUSTRATION_LABEL': 'Illustration of the product',
     'HERO_ILLUSTRATION': slot % 'Hero illustration<br>1080 &times; 480',
     'HERO_ILLUSTRATION_CAPTION': 'Illustrative example',
     'PAIN_EYEBROW': 'The problem', 'PAIN_H': 'The headline that names the problem your audience already feels.',
     'FEATURES_EYEBROW': 'How it works', 'FEATURES_H': 'The offer in one line', 'FEATURES_SUB': 'A sentence that says what the visitor does not have to do.',
     'MID_CTA_H': 'A second, shorter call to action', 'MID_CTA_P': 'One supporting line.',
     'PHONE_NOTIF_TITLE': 'The notification headline', 'PHONE_NOTIF_SUB': 'The action it asks for', 'PHONE_PILL': 'A short pill',
     'TRUST_EYEBROW': 'Your data, your rules', 'TRUST_H': 'The headline for the reassurance fold',
     'CMP_EYEBROW': 'Compare', 'CMP_H': 'The comparison headline', 'CMP_COL_A': 'Alternative A', 'CMP_COL_B': 'Alternative B',
     'FAQ_EYEBROW': 'FAQs', 'FAQ_H': 'Questions before<br>you sign up', 'FAQ_SUB': 'One line that sets expectations, <br>and a second one.',
     'FOOTER_CTA_H': 'The closing call <br>to action', 'FOOTER_CTA_P': 'One supporting line that repeats the offer <br>and what happens next.',
     'FOOTER_CTA_NOTE': 'A reassurance &middot; Another one',
     'CTA_QUOTE': '&ldquo;The first deal more than paid for the annual investment. Now the revenue generated is probably 20 to 30 times what I&rsquo;ve invested.&rdquo;',
     'CTA_QUOTE_NAME': 'Ryan Cimo', 'CTA_QUOTE_ROLE': 'Owner, Fraxtional',
    }
    for n in (1, 2, 3):
        d['PAIN_%d_T' % n] = 'Problem %d' % n
        d['PAIN_%d_P' % n] = 'One or two sentences that make the problem concrete.'
        d['ROW_%d_EYEBROW' % n] = 'Step %d' % n
        d['ROW_%d_H' % n] = 'What the product does at this step'
        d['ROW_%d_P' % n] = 'Two lines on how it works and why it matters, in the visitor\'s terms.'
        d['ROW_%d_TICK_1' % n] = 'A proof point'; d['ROW_%d_TICK_2' % n] = 'Another proof point'
        d['FEATURE_%d_VISUAL' % n] = slot % ('Feature %d visual<br>580 &times; 480' % n)
    for n in (1, 2, 3, 4):
        d['TRUST_%d_T' % n] = 'Reassurance %d' % n
        d['TRUST_%d_P' % n] = 'One sentence that answers the worry.'
        d['CMP_%d_LABEL' % n] = 'Row %d' % n; d['CMP_%d_GW' % n] = 'Your answer'
        d['CMP_%d_A' % n] = 'Their answer'; d['CMP_%d_B' % n] = 'Their answer'
    for n in range(1, 8):
        d['FAQ_%d_Q' % n] = 'A question the visitor asks?'
        d['FAQ_%d_A' % n] = 'A short, plain answer.'
    return d

SIGNUP = _signup_sample()
SU_DIR = ROOT / 'skills/gushwork-web/templates/ad-page-signup'

# ---- ad-page-comparison: neutral sample copy for every token. No competitor is named, no reviewer is named (R24), and the
# numbers are placeholders, so the preview shows where each string goes without reading as a claim about anyone.
def _comparison_sample():
    d = {
     'PAGE_TITLE': 'Comparison ad page template', 'META_DESCRIPTION': 'Sample campaign copy.',
     'OG_TITLE': 'Comparison ad page template', 'OG_IMAGE_URL': '', 'PAGE_URL': '', 'COMPETITOR': 'Competitor',
     'HERO_EYEBROW': 'Gushwork vs Competitor', 'HERO_H1_A': 'What the competitor gets you,', 'HERO_H1_B': 'what Gushwork gets you',
     'HERO_SUB': 'One or two lines that set the competitor against Gushwork on the thing the buyer cares about.',
     'PROOF_1': 'A proof point', 'PROOF_2': 'A second proof point', 'PROOF_3': 'A third proof point',
     'FORM_HEADING': 'Book a demo', 'FORM_CTA': 'Pick a time', 'EXPERT_VIDEO': '',
     'D_EYEBROW': 'Page depth', 'D_H': 'The headline for the first comparison', 'D_SUB': 'One or two lines that say what the two pictures show.',
     'D_COMP_PILL': 'What they do', 'D_GW_PILL': 'What we do', 'BAR_TEXT': 'A line that leads to the call to action',
     'C_EYEBROW': 'Coverage', 'C_H': 'The headline for the coverage diagram', 'C_SUB': 'One or two lines on how a buyer finds each of you.',
     'C_QUERY': 'what the buyer searches for', 'C_TIP': 'Your buyer searches',
     'C_L1': 'A first stop by', 'C_L2': 'A second stop by', 'C_L3': 'A third stop', 'C_L4': 'A dead end',
     'C_R1': 'A first stop by', 'C_R2': 'A second stop', 'C_R3': 'A conversion', 'C_R4': 'A result',
     'O_EYEBROW': 'Outcome', 'O_H': 'The headline for the outcome fold', 'O_COMP_PILL': 'Competitor dashboard | What it shows',
     'O_GW_PILL': 'Gushwork dashboard | What it shows', 'O_NOT_REPORTED': 'The number they do not report',
     'O_T1_TREND': '0%', 'R_EYEBROW': 'Reviews', 'R_H': 'The headline for the reviews fold',
     'R_COMP_RATING': '3.5', 'R_GW_RATING': '4.8',
     'T_EYEBROW': 'Head to head', 'T_H': 'The headline for the table',
     'P_EYEBROW': 'Pricing', 'P_H': 'The headline for the pricing fold', 'P_SUB': 'One line that sets expectations.',
     'P_COMP_HEAD': 'Not published', 'P_COMP_1': 'A competitor detail', 'P_COMP_2': 'Another competitor detail',
     'P_GW_PILL': 'A short pill', 'P_GW_LABEL': 'Starts at', 'P_GW_PRICE': '$0', 'P_GW_UNIT': 'per month',
     'P_GW_1': 'What is included', 'P_GW_2': 'What else is included', 'P_GW_3': 'And one more',
     'F_EYEBROW': 'Fit check', 'F_H': 'The headline for the fit check', 'F_SUB': 'One line that sets expectations.',
     'F_COMP_TITLE': 'may suit you if you', 'F_GW_TITLE_A': 'Choose', 'F_GW_TITLE_B': 'if you',
     'FAQ_H': 'What people ask when they&rsquo;re comparing',
     'CTA_HEADING': 'The closing call to action', 'CTA_SUB': 'One supporting line that says what happens next.', 'CTA_NOTE': 'A note under the button',
     'CTA_CARD_TITLE': 'Why teams pick Gushwork',
    }
    for n in range(1, 7):
        d['O_T%d_LABEL' % n] = 'Metric %d' % n; d['O_T%d_VALUE' % n] = '0'
    for n in range(1, 5):
        d['F_GW_%d' % n] = 'A reason to choose Gushwork'
        d['FAQ_Q%d' % n] = 'A question buyers ask?'; d['FAQ_A%d' % n] = 'A short, plain answer.'
        for side, stars in (('COMP', '2'), ('GW', '5')):
            d['R_%s_%d_TOPIC' % (side, n)] = 'Topic'; d['R_%s_%d_STARS' % (side, n)] = stars
            d['R_%s_%d_QUOTE' % (side, n)] = '&ldquo;A short customer review, quoted from the public page.&rdquo;'
            d['R_%s_%d_META' % (side, n)] = 'A reviewer &middot; US &middot; Jan 1, 2026'
    for n in range(1, 4):
        d['F_COMP_%d' % n] = 'A reason to choose the competitor'
    for n in range(1, 10):
        d['T_%d_LABEL' % n] = 'Row %d' % n; d['T_%d_COMP' % n] = 'Their answer'; d['T_%d_GW' % n] = 'Our answer'
    for n in range(1, 6):
        d['CTA_ROW_%d_LABEL' % n] = 'Label'; d['CTA_ROW_%d_VALUE' % n] = 'Value'
    return d

COMPARISON = _comparison_sample()
CP_DIR = ROOT / 'skills/gushwork-web/templates/ad-page-comparison'

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

    t = sitepaths((SU_DIR / 'ad-page-signup.html').read_text(encoding='utf-8'), 4)
    for f in ('favicon.svg', 'favicon-32.png', 'apple-touch-icon.png'):
        t = t.replace('href="%s"' % f, 'href="/internal/templates/ad-page-signup/%s"' % f)
    write(out, 'ad-page-signup', fill(t, SIGNUP))
    for f in ('favicon.svg', 'favicon-32.png', 'apple-touch-icon.png'):
        shutil.copy(SU_DIR / f, out / 'ad-page-signup' / f)

    t = sitepaths((CP_DIR / 'ad-page-comparison.html').read_text(encoding='utf-8'), 4)
    for f in ('favicon.svg', 'favicon-32.png', 'apple-touch-icon.png'):
        t = t.replace('href="%s"' % f, 'href="/internal/templates/ad-page-comparison/%s"' % f)
    # The three pictures sit beside the page, and the route is served without its trailing slash.
    t = t.replace('src="img/', 'src="/internal/templates/ad-page-comparison/img/')
    write(out, 'ad-page-comparison', fill(t, COMPARISON))
    for f in ('favicon.svg', 'favicon-32.png', 'apple-touch-icon.png'):
        shutil.copy(CP_DIR / f, out / 'ad-page-comparison' / f)
    shutil.copytree(CP_DIR / 'img', out / 'ad-page-comparison' / 'img', dirs_exist_ok=True)

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
    # Support operations app: a multi-page dashboard. build-dashboard-css.sh writes its served copy (links absolute, the stamp's
    # registry URL blanked) to web/previews/dashboard/pages/support-ops-app/; the route serves the same files, so it shows exactly
    # what the review drawer shows. The site uses clean URLs with no trailing slash, so a folder's index.html is served at the bare
    # folder URL and its relative scripts would resolve one folder up: the route's index.html therefore only forwards to overview.
    src = ROOT / 'web/previews/dashboard/pages/support-ops-app'
    dst = out / 'support-ops-app'
    dst.mkdir(parents=True, exist_ok=True)
    for f in sorted(src.iterdir()):
        text = f.read_text(encoding='utf-8')
        (dst / f.name).write_text(noindex(text) if f.suffix == '.html' else text, encoding='utf-8')
    (dst / 'index.html').write_text(('<!doctype html><meta charset="utf-8"><meta name="robots" content="noindex"><title>Support operations app</title>'
        '<meta http-equiv="refresh" content="0; url=/internal/templates/support-ops-app/overview">'
        '<a href="/internal/templates/support-ops-app/overview">Open the support operations app</a>'), encoding='utf-8')
    print('  templates/support-ops-app/ (' + str(len(list(dst.iterdir()))) + ' files)')
    # Growth report: one page, so no folder of scripts. build-dashboard-css.sh writes its served copy (links absolute, the stamp's registry
    # URL blanked) to web/previews/dashboard/pages/growth-report.html; the route serves that same file.
    write(out, 'growth-report', (ROOT / 'web/previews/dashboard/pages/growth-report.html').read_text(encoding='utf-8'))
    # One-pager: screen-first single page. Its own assets/ sit beside it, so the route needs a base.
    t = sitepaths((ROOT / 'templates/one-pager/one-pager.html').read_text(encoding='utf-8'), 2)
    t = t.replace('<meta charset="utf-8">', '<meta charset="utf-8">\n<base href="/internal/templates/one-pager/">', 1)
    write(out, 'one-pager', t)
    shutil.copytree(ROOT / 'templates/one-pager/assets', out / 'one-pager' / 'assets', dirs_exist_ok=True)

if __name__ == '__main__':
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(sys.argv[1])
