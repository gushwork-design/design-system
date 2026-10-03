#!/usr/bin/env python3
"""
Builds preview/gtm-command-center.html — the GTM Command Center overview screen.

Source of truth: Figma **GW Dashbords** Q9L6q38dEj3Qu1JkjiT13y, page `Claude handover`
(236:31784), frame `overview` (236:31785, 1440x4906). Components are the v2 set documented in
exports/dashboard/v2/.

Every colour and Inter type style is pulled BY NAME from foundation/tokens.css — no hex is
written in this file. A missing token raises rather than falling back, because a silent fallback
is the failure this repo exists to prevent.

Run:  python3 preview/_build_gtm_command_center.py
"""
import base64, calendar, datetime, json, re, pathlib, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
TOKENS = ROOT / "foundation" / "tokens.css"
ICONS = ROOT / "assets" / "icons"
LOGO = ROOT / "assets" / "logo" / "gushwork-symbol-white.svg"
SHEET = ROOT / "preview" / "_vert-grotesk-face.css"   # the face, lifted from the review sheet when that was removed
OUT = ROOT / "preview" / "gtm-command-center.html"

# ─────────────────────────── build stamp ───────────────────────────
# Every build records the components it used and the plugin version it used them at. Two things
# read it: scripts/check-drift.sh (the agent path) and the page itself on load (the human path).
# Without it a dashboard has no way to know it has fallen behind, and its owner never finds out.
PLUGIN_VERSION = json.loads((ROOT / ".claude-plugin" / "plugin.json").read_text())["version"]
REGISTRY_URL = "https://gushwork-design.vercel.app/exports/dashboard/component-registry.json"
CHANGELOG_URL = "https://gushwork-design.vercel.app/preview/changelog-sheet.html"
BUILD_CREATED_BY = "Utsav Singh"
BUILD_CREATED_AT = "15 Aug 2026"

# ── Compare: OFF, at Utsav's request, 1 Sep 2026 ────────────────────────────────────────────
# The feature is BUILT and working — period-over-period deltas on every stat and metric card,
# see delta_el(). It is switched off rather than deleted so it can come back in one line.
#
# ⚠ OFF means OMITTED, never hidden. R19 says a visible control must work; the inverse trap is
# a control left in the markup under `display:none`, which passes a dead-control scan while
# still shipping the affordance to anything that ignores CSS. When this is False the button,
# its context note and every delta are absent from the output entirely.
#
# Turning it back on: set True. Before shipping it, settle the `Sample data` badge — the delta
# figures are INVENTED and imply pipeline and ARR outcomes. See "Worth a decision" in the notice.
SHOW_COMPARE = False
USES_COMPONENTS = [
    "badge", "checkbox", "control", "date-range-picker", "dashboard-switcher", "divider",
    "empty-state", "icon-button", "input", "legend", "metric-card", "page-header", "pagination",
    "progress-bar", "ring", "section-header", "sidebar", "skeleton", "stat-card", "status-dot",
    "tab-group", "tab-item", "table-cell", "table-row", "tooltip", "topbar",
    # ⚠ CANNOT BE DECLARED YET. The R17 pass added the phone dock, so this build now uses
    # `icon-toggle-group` — but that component was registered in v1.40.0 and THIS REPO's
    # component-registry.json is still at 1.39.0, so the verifier rightly rejects a stamp naming
    # a component the registry has never heard of. Add it in the same commit that brings the
    # repo up to v1.42.0; until then the dock is undeclared and check-drift is blind to it.
]

# ─────────────────────────── tokens, read from tokens.css ───────────────────────────
_css = TOKENS.read_text()
# FIRST occurrence wins. tokens.css declares some names twice — see its note 11. dict() over
# every match keeps the LAST, which emitted `--gw-motion-fast: 0ms` unconditionally: every
# transition dead for every user, and the reduced-motion guard discarded. Fixed 26 Aug 2026.
_decl = {}
for _n, _v in re.findall(r'(--gw-[a-z0-9-]+)\s*:\s*([^;]+);', _css):
    _decl.setdefault(_n, _v)

def tok(name):
    """Return the custom-property NAME after asserting it exists. Never returns a literal."""
    if name not in _decl:
        sys.exit(f"token {name} is not in foundation/tokens.css — that is a gap to raise, "
                 f"not a value to invent")
    return f"var({name})"

def tokval(name):
    if name not in _decl:
        sys.exit(f"token {name} is not in foundation/tokens.css")
    return _decl[name].strip()

# colours used by this screen
NEEDED = ["--gw-color-white", "--gw-color-black",
          "--gw-color-neutral-25", "--gw-color-neutral-50", "--gw-color-neutral-100",
          "--gw-color-neutral-200", "--gw-color-neutral-300", "--gw-color-neutral-400",
          "--gw-color-neutral-500", "--gw-color-neutral-600", "--gw-color-neutral-700",
          "--gw-color-neutral-800", "--gw-color-neutral-900",
          "--gw-color-green-25", "--gw-color-green-400", "--gw-color-green-500",
          "--gw-color-yellow-400", "--gw-color-yellow-25", "--gw-color-yellow-500",
          "--gw-color-red-25", "--gw-color-red-50", "--gw-color-red-400", "--gw-color-red-500",
          "--gw-color-primary-500", "--gw-color-primary-alpha-10",
          "--gw-color-green-300", "--gw-color-red-300", "--gw-color-red-alpha-10",
          "--gw-color-neutral-250",
          "--gw-color-neutral-35", "--gw-color-neutral-850",   # measured button hover fills
          "--gw-color-green-alpha-10", "--gw-color-yellow-alpha-10",  # dark badge tints
          "--gw-color-yellow-300",
          "--gw-radius-4", "--gw-radius-8", "--gw-radius-12", "--gw-radius-16", "--gw-radius-40",
          "--gw-text-body-12-med", "--gw-text-body-12-sem", "--gw-text-body-14-med",
          "--gw-text-body-16-sem", "--gw-text-body-16-reg", "--gw-text-body-10-sem",
          "--gw-text-button-10", "--gw-text-button-12", "--gw-text-button-14",
          # R17 / v2/phone.md — the phone chrome. body-14-reg is the ruled phone section-header
          # qualifier; shadow-s3 is the dock toggle's measured effect, which binds exactly;
          # motion-fast drives the drawer slide (DECISIONS.md: never a raw duration).
          "--gw-text-body-14-reg", "--gw-shadow-s3", "--gw-motion-fast",
          # R18's /600 step, for the compare delta's small light-mode label
          "--gw-color-green-600", "--gw-color-red-600",
          # the ruled focus tokens — main corrected :focus-visible to use them (26 Aug 2026)
          "--gw-focus-ring", "--gw-focus-offset"]
missing = [n for n in NEEDED if n not in _decl]
if missing:
    sys.exit("missing tokens: " + ", ".join(missing))

# Emit token DEPENDENCIES transitively. The type tokens are `font` shorthands that reference
# var(--gw-font-body) internally; omit that and the whole shorthand is invalid at computed-value
# time, so the declaration is dropped and every size silently falls back to the browser default.
# It renders plausibly and is completely wrong — caught by measuring, not by looking.
def closure(names):
    seen, stack = [], list(names)
    while stack:
        n = stack.pop(0)
        if n in seen:
            continue
        if n not in _decl:
            sys.exit(f"token {n} is referenced but not in foundation/tokens.css")
        seen.append(n)
        stack += re.findall(r'var\((--gw-[a-z0-9-]+)\)', _decl[n])
    return seen

EMIT = closure(NEEDED)
ROOTVARS = "\n".join(f"  {n}: {_decl[n].strip()};" for n in EMIT)
# tracking companions for the Inter styles
TRACK = "\n".join(f"  {n}-tracking: {_decl[n + '-tracking'].strip()};"
                  for n in EMIT if n.startswith('--gw-text-') and n + '-tracking' in _decl)

# ─────────────────────────── fonts ───────────────────────────
# Vert Grotesk is embedded (proven block, kept in preview/_vert-grotesk-face.css) so the BRAND FACE can
# never fall back — output-targets.md is explicit about that.
#
# Inter is now embedded for the same reason. It used to point at ../fonts/ relatively, which only
# resolves under file:// opened from preview/ — served over HTTP, or sent to anyone, it 404s and
# every body string silently renders in the system face. That is not cosmetic: the system face is
# WIDER than Inter, which is what pushed the Quick Filter placeholder past its 176px box. A single
# static file cannot depend on a sibling directory. local() stays first so an installed copy wins.
_vg = re.search(r"@font-face\{font-family:'Vert Grotesk Display';[^}]*\}", SHEET.read_text())
if not _vg:
    sys.exit("could not lift the Vert Grotesk @font-face block out of preview/_vert-grotesk-face.css")

_inter_ttf = ROOT / "fonts" / "Inter-VariableFont_opsz_wght.ttf"
if not _inter_ttf.exists():
    sys.exit(f"body face missing: {_inter_ttf}")
_inter_b64 = base64.b64encode(_inter_ttf.read_bytes()).decode()
FONTS = _vg.group(0) + (
    "@font-face{font-family:'Inter';"
    "src:local('Inter'),local('Inter Variable'),"
    f"url(data:font/ttf;base64,{_inter_b64}) format('truetype-variations');"
    "font-weight:100 900;font-style:normal;font-display:swap}")

# ─────────────────────────── icons ───────────────────────────
_ic = {}
def ico(name, weight="regular", size=16, cls="ic"):
    key = (name, weight)
    if key not in _ic:
        p = ICONS / weight / f"{name}.svg"
        if not p.exists():
            sys.exit(f"icon {weight}/{name}.svg not found in assets/icons")
        raw = p.read_text()
        inner = re.sub(r'^.*?<svg[^>]*>', '', raw, flags=re.S)
        inner = re.sub(r'</svg>\s*$', '', inner, flags=re.S)
        inner = re.sub(r'<rect[^>]*fill="none"[^>]*/>', '', inner)
        _ic[key] = inner.strip()
    return (f'<span class="{cls}" style="width:{size}px;height:{size}px">'
            f'<svg viewBox="0 0 256 256" fill="currentColor" width="{size}" height="{size}">'
            f'{_ic[key]}</svg></span>')

AVATAR_ART = '''<svg class="uc-art" viewBox="0 0 38.1724 86.6301" width="25.4" height="57.8" fill="none" aria-hidden="true"><g id="Group 2085663132">
<g id="Vector">
<path d="M0.172363 31.6301C0.172363 29.4209 1.96322 27.6301 4.17236 27.6301H34.1724C36.3815 27.6301 38.1724 29.4209 38.1724 31.6301V82.6301C38.1724 84.8392 36.3815 86.6301 34.1724 86.6301H4.17236C1.96322 86.6301 0.172363 84.8392 0.172363 82.6301V31.6301Z" fill="#262A2E"/>
<path fill-rule="evenodd" clip-rule="evenodd" d="M20.0293 0.299038C20.805 -0.379348 22.0188 0.171108 22.0195 1.20138V7.50119C22.0195 7.66497 22.0002 7.82993 22.0107 7.99337C22.016 8.07441 22.0185 8.15624 22.0186 8.23849V22.2561C22.0186 24.4652 20.2277 26.2561 18.0186 26.2561H4C1.79104 26.2559 0 24.4651 0 22.2561V8.23849C1.1616e-05 8.15486 0.00321854 8.07183 0.00878906 7.98947C0.0197524 7.82738 0.00100188 7.66365 0.000976562 7.50119V1.20138C0.00172355 0.171108 1.21554 -0.379348 1.99121 0.299038L3.10059 1.27072C5.28799 3.1844 8.10438 4.23849 11.0107 4.23849C13.9169 4.23837 16.7326 3.18429 18.9199 1.27072L20.0293 0.299038ZM5.61621 17.7229C5.24193 17.6192 4.84123 17.7421 4.58887 18.0373C4.33671 18.3326 4.27779 18.7473 4.43848 19.1008C5.14326 20.6508 7.00056 22.7132 10.3955 22.7434C11.9786 22.7574 13.3375 22.4662 14.3877 21.9377C15.4307 21.4127 16.2366 20.6127 16.5312 19.5949C16.626 19.2674 16.5471 18.9138 16.3223 18.6574C16.0975 18.4014 15.7578 18.2772 15.4209 18.3283H15.4189L15.4141 18.3293C15.4089 18.3301 15.4002 18.3317 15.3896 18.3332C15.3681 18.3364 15.3352 18.3409 15.293 18.3469C15.2076 18.3591 15.0815 18.3771 14.9248 18.3977C14.6109 18.4389 14.1715 18.4922 13.6719 18.5422C12.6567 18.6438 11.4459 18.7249 10.5264 18.6692C9.59851 18.6129 8.38427 18.3821 7.36719 18.1545C6.86611 18.0424 6.42554 17.9341 6.11133 17.8537C5.95468 17.8136 5.82946 17.7808 5.74414 17.758C5.70152 17.7466 5.66817 17.7376 5.64648 17.7317C5.63608 17.7288 5.6282 17.7262 5.62305 17.7248C5.62064 17.7242 5.61719 17.7238 5.61719 17.7238L5.61621 17.7229Z" fill="#262A2E"/>
</g>
</g></svg>'''

_logo_inner = re.sub(r'</svg>\s*$', '', re.sub(r'^.*?<svg[^>]*>', '',
                     LOGO.read_text(), flags=re.S), flags=re.S).strip()
_logo_vb = re.search(r'viewBox="([^"]+)"', LOGO.read_text())
LOGO_SVG = (f'<svg viewBox="{_logo_vb.group(1) if _logo_vb else "0 0 32 32"}" '
            f'width="16" height="16" fill="currentColor">{_logo_inner}</svg>')

# ─────────────────────────── data, transcribed from the frame ───────────────────────────
NAV = [("overview", [("Overview", "squares-four", True), ("Close Cohorts", "users-three", False)]),
       ("Channels", [("Meta Ads", "meta-logo", False), ("Google Ads", "google-logo", False),
                     ("Cold Email", "paper-plane-tilt", False), ("Organic", "plant", False),
                     ("Referral", "share-network", False)]),
       ("Settings", [("Appearance", "swatches", False), ("Controls", "sliders-horizontal", False)]),
       ("Admin", [("Targets", "chart-line", False), ("Changelog", "stack-overflow-logo", False)])]

DATE_TABS = ["Today", "Yesterday", "This Month", "Last Month", "Custom"]

# measured `dropdown-options` 207x102 in 409:11644 — three options, 12px labels
DASHBOARDS = ["Meta Performance Dashboard", "Cold Email Dashboard", "Onboarding Dashboard"]

# measured `presets-list` — nine rows, "Last 30 days" carrying the selected Neutral/50 fill
DATE_PRESETS = ["Custom", "Last 7 days", "Last week (Sun - Sat)", "Last 14 days", "Last 28 days",
                "Last 30 days", "Last 90 days", "Quarter to date", "Last 12 months"]
DATE_PRESET_SEL = "Last 30 days"
# measured calendar: JUL 2026, range Jul 15 -> Jul 31. 1 Jul 2026 is a Wednesday, so the first
# row carries three empty cells — which is exactly what the frame draws.
CAL_MONTH, CAL_LEAD, CAL_DAYS = "JUL 2026", 3, 31
CAL_EPOCH = datetime.date(2026, 7, 1)     # day offsets are measured from here; 1 = Jul 1 2026
CAL_ANCHOR_MONTH = (2026, 7)              # the month the stack opens on
def _cal_span(n):
    """The n months ending at CAL_ANCHOR_MONTH, oldest first."""
    y, m = CAL_ANCHOR_MONTH
    out = []
    for _ in range(n):
        out.append((y, m))
        m -= 1
        if m == 0:
            y, m = y - 1, 12
    return list(reversed(out))
CAL_RANGE = _cal_span(12)                 # Aug 2025 -> Jul 2026
CAL_FROM, CAL_TO = 15, 31
CAL_FROM_LABEL, CAL_TO_LABEL = "Jul 15, 2026", "Jul 31, 2026"
ACTIVE_TAB = "Last Month"

# ⚠ THE `delta` FIELD IS INVENTED. The Figma frame carries no prior-period figures and there is
# no second dataset behind this screen — these are plausible period-over-period changes written
# to give the Compare state something true-to-shape to render. They imply business outcomes
# (pipeline, closes, ARR), which is exactly the class the skill says must never ship unmarked.
# See "Worth a decision" in the notice: this makes the `Sample data` badge question urgent.
STAT_CARDS = [  # label, value, sub, pct, tone, delta   (pct/tone None => no bar, no percentage)
    ("DEMOS BOOKED", "1,310", "of 1,472", "89%", "green", "+6.2%"),
    ("SHOW-UPS", "708", "of 720", "98%", "green", "+4.8%"),
    ("CLOSES", "70", "of 130", "54%", "red", "-11.4%"),
    ("DEMOS SCHEDULED", "1322", "in this period", None, None, "+2.1%"),
    ("CLOSES", "70", "of 130", None, None, "-11.4%")]

# pct is attainment against the "need" figure — 59.5/66.9 etc. The design's ring sweeps are
# approximate (Demos measures 92% against a computed 89%), so these are computed, not traced.
RUN_RATE = [("Demos", "59.5", "need 66.9 / biz day", 89, "+6.2%"),
            ("Show-ups", "32.2", "need 32.7 / biz day", 98, "+4.8%"),
            ("Closes", "3.2", "need 5.9 / biz day", 54, "-11.4%"),
            ("ARR", "$36772", "need $63257 / biz day", 58, "-9.3%")]

CHAN_COLS = ["channnel", "demos", "Show-ups", "Pending", "Closes", "ARR"]
CHAN_ROWS = [  # channel, icon, badge, demos, showups, pending, closes, arr, spent, roi
    ("Meta Ads", "meta-logo", True, ("681/706", .96), ("294/297", .99), "134", "34", "$44.4K",
     "$48.3K of $48.3", "3.67x"),
    ("Cold Email", "paper-plane-tilt", False, ("500 of 640", .78), ("322/352", .91), "65", "31",
     "$30.6K", "$135.7K of $135.7K", "6.38x"),
    ("Google Ads", "google-logo", False, ("26/-", .10), ("21/-", .08), "1", "2", "$27.6K",
     "$17.0K of $17.0K", "-"),
    ("Organic", "plant", False, ("98/80", 1.0), ("71/48", 1.0), "8", "3", "$30.6K",
     "$68 of $68", "-")]
CHAN_TOTAL = ("total", ("1310/1426", .92), ("708/697", 1.0), "208", "70", "$808.98K",
              "$198.3K of $200.9K", "3.74x")

DAILY_COLS = ["DATE", "bookings", "Show-ups", "Booking attainment", "Show-up attainment"]
DAILY_ROW = ("Jul 1", "34", "26", "32/47", "68%", "32/47", "68%")

ONB_COLS = ["DATE", "Domain", "assigned AE", "channel", "monthly", "annual ARR", "Status"]
ONB_ROWS = [
    ("Jul 1", "www.designinrhythm.com", "Carlisle Dcosta", "Meta", "$840", "$10,080", "Active", "green"),
    ("Jul 1", "energytalentsearch.com", "Abhinav Chaturvedi", "Cold Email", "$800", "$9,600", "Active", "green"),
    ("Jul 2", "truscribe.com", "Arabind Mishra", "Meta", "$1,000", "$12,000", "To be onboarded", "yellow"),
    ("Jul 3", "shaanrais.com", "Mugil Vanjinath", "Meta", "$1,200", "$14,400", "Active", "green"),
    ("Jul 3", "www.peopleleaderaccelerator.com", "Akarsh Dayal", "Cold Email", "$640", "$7,680", "Active", "green")] * 2


# ── PASS-2 row sets ────────────────────────────────────────────────────────────────────
# The frame draws 10 identical daily rows and says "Page 1 of 4", i.e. 40 rows exist. Uniform
# rows make sorting and filtering look broken, so the set is VARIED here — deterministically,
# no randomness, so the build is reproducible. This is illustrative sample data, exactly as the
# frame's repeated row was: see the notice.
def daily_rows(n=40):
    rows = []
    for i in range(n):
        day = 1 + i // 2
        bookings = 28 + (i * 7) % 21
        shows = 18 + (i * 5) % 15
        b_t = 40 + (i * 3) % 12
        s_t = 30 + (i * 4) % 14
        b_pct = round(bookings / b_t * 100)
        s_pct = round(shows / s_t * 100)
        rows.append((f"Jul {day}", bookings, shows, f"{bookings}/{b_t}", b_pct,
                     f"{shows}/{s_t}", s_pct))
    return rows

def onb_rows(n=70):
    base = ONB_ROWS[:5]
    rows = []
    for i in range(n):
        d, dom, ae, chn, mo, arr, st, tone = base[i % 5]
        day = 1 + i // 5
        m = 600 + (i * 40) % 800
        rows.append((f"Jul {day}", dom, ae, chn, f"${m:,}", f"${m*12:,}", st, tone))
    return rows

DAILY_SET = daily_rows()
ONB_SET = onb_rows()
PAGE_SIZE = 10

# ─────────────────────────── chart ───────────────────────────
# The plot geometry is TRACED from the design, not data-bound: the Figma curve is an
# illustration. The readouts, axis ticks and tooltip values are transcribed exactly.
# NOTE the design's own inconsistency, reproduced as-is: the tooltip reads Actual 1104 /
# Target 1235 while the axis tops out at 340.
# The traced curve. SHAPE is x, EASE is y as a fraction of the end value. TODAY_I is the
# index the design's own tooltip sits on (x=.78) — the one point with measured values.
SHAPE = [0, .12, .25, .38, .50, .62, .72, .78, .88, 1.0]
EASE = [0, .105, .235, .385, .535, .675, .775, .825, .915, 1.0]
TODAY_I = 7
# The two static marker dots (236:32573 / 236:32574) are NOT reproduced. Their measured
# positions are fractions of the design's own plot box, but this chart's curve is a traced
# approximation with different geometry — so the dots landed ABOVE the line instead of on it,
# marking nothing. The hover crosshair already puts a dot on the curve, where it belongs.
# Day labels for the ten points: July 1-31 spread linearly, EXCEPT index 7, pinned to the
# measured "Jul 26". The design's own marker is at 78% of a 30-day period while the page header
# reads "Day 18 of 30" (60%) — the two disagree in Figma, so no mapping can satisfy both.
HOVER_DAYS = [1, 5, 8, 12, 16, 20, 23, 26, 27, 31]


def area_chart(y_ticks, end_actual, end_target, today=0.78, w=1054, h=248):
    ymax = y_ticks[0]
    sx = lambda f: f * w
    sy = lambda v: h - (v / ymax) * h
    pts = [(sx(f), sy(end_actual * e)) for f, e in zip(SHAPE, EASE)]
    d = f"M{pts[0][0]:.1f},{pts[0][1]:.1f}"
    for i in range(1, len(pts)):
        x0, y0 = pts[i - 1]; x1, y1 = pts[i]
        cx = (x0 + x1) / 2
        d += f" C{cx:.1f},{y0:.1f} {cx:.1f},{y1:.1f} {x1:.1f},{y1:.1f}"
    area = d + f" L{w},{h} L0,{h} Z"
    grid = "".join(f'<line x1="0" y1="{sy(v):.1f}" x2="{w}" y2="{sy(v):.1f}" '
                   f'class="ch-grid"/>' for v in y_ticks)
    vgrid = "".join(f'<line x1="{sx(f):.1f}" y1="0" x2="{sx(f):.1f}" y2="{h}" class="ch-grid"/>'
                    for f in (.25, .5, .75, 1.0))
    uid = f"g{int(end_actual)}{int(ymax)}"
    return f'''<svg class="ch-svg" viewBox="0 0 {w} {h}" preserveAspectRatio="none" aria-hidden="true">
<defs><linearGradient id="{uid}" x1="0" y1="0" x2="0" y2="1">
<stop offset="0" stop-color="{tokval('--gw-color-primary-500')}" stop-opacity=".22"/>
<stop offset="1" stop-color="{tokval('--gw-color-primary-500')}" stop-opacity="0"/>
</linearGradient></defs>
{grid}{vgrid}
<path d="{area}" fill="url(#{uid})"/>
<polyline points="0,{h} {w},{sy(end_target):.1f}" class="ch-target"/>
<path d="{d}" class="ch-actual"/>
</svg>'''

def gauge(pct, tone):
    r, c = 16, 2 * 3.14159 * 16
    return f'''<span class="gauge"><svg viewBox="0 0 40 40" width="40" height="40">
<circle cx="20" cy="20" r="{r}" class="gauge-track"/>
<circle cx="20" cy="20" r="{r}" class="gauge-fill gauge-{tone}"
 stroke-dasharray="{c*pct/100:.1f} {c:.1f}" transform="rotate(-90 20 20)"/>
</svg><b>{pct}%</b></span>'''

def chart_card(title, readout, pct, tone, y_ticks, end_actual, end_target, tip, slot, hidden=False):
    ylab = "".join(f'<span>{v}</span>' for v in y_ticks)
    xlab = "".join(f'<span>Week {i}</span>' for i in (1, 2, 3, 4))
    a_cls = ' class="tip-red"' if tip[3] == 'red' else (' class="tip-green"' if tip[3] == 'green' else '')
    cls = "panel is-hidden" if hidden else "panel"
    # One measured tooltip, ten hoverable points: scale the pair at TODAY_I out along the traced
    # curve so that hovering the today marker reproduces the design exactly and the rest follow
    # the same shape. Derived, like the curve itself — not new data.
    ka = float(tip[1]) / EASE[TODAY_I]
    kt = float(tip[2]) / SHAPE[TODAY_I]
    pts = ",".join(
        f'{SHAPE[i] * 100:.4g}|Jul {HOVER_DAYS[i]}|{round(ka * EASE[i])}|{round(kt * SHAPE[i])}'
        f'|{EASE[i] * 100:.4g}'
        for i in range(len(SHAPE)))
    return f'''<div class="{cls}" data-chart-panel="{slot}">
<div class="panel-head"><h3 class="ch-title">{title}</h3>
<div class="ch-readout"><span>{readout}</span>{gauge(pct, tone)}</div></div>
<div class="ch-body"><div class="ch-yaxis">{ylab}</div>
<div class="ch-plot" tabindex="0" role="img" data-pts="{pts}" data-start="{TODAY_I}"
 aria-label="{title}. {readout}. Hover or use arrow keys to read a point.">
{area_chart(y_ticks, end_actual, end_target)}
<i class="ch-cursor" aria-hidden="true"><i class="ch-cursor-dot"></i></i>
<div class="ch-tip"><span class="tip-date">{tip[0]}</span>
<span class="tip-row"><i>Actual</i><b{a_cls}>{tip[1]}</b></span>
<span class="tip-row"><i>Target</i><b>{tip[2]}</b></span></div></div></div>
<div class="ch-xaxis">{xlab}</div></div>'''

def sort_label(col):
    """The column lists are transcribed from Figma verbatim, and the frame's own casing is all
    over the place — `DATE`, `Domain`, `assigned AE`, `channel`, `monthly`, `annual ARR`, `Status`.
    That is invisible in the table because the header row is uppercased in CSS, but it leaks
    straight into the Sort by menu, which is not. Title-case each word, keeping short all-caps
    words (ARR, AE) as the acronyms they are."""
    ACRONYMS = {"arr", "ae", "roi", "kpi", "gtm"}   # `roi` is lower-case in the frame
    out = []
    for w in col.split():
        out.append(w.upper() if w.lower() in ACRONYMS else w[:1].upper() + w[1:].lower())
    return " ".join(out)


def dashboard_switcher():
    """measured `dropdown-options` 207x102 — AL:V g:4 p:4, r8, white, 1px Neutral/50, drop shadow.
    Rows 197x28, AL:H g:8 p:8, r4; the hovered row carries a Neutral/50 fill; labels 12px."""
    rows = "".join(f'<span class="dash-switch-item" role="option" tabindex="-1" '
                   f'data-dash="{d}">{d}</span>' for d in DASHBOARDS)
    return f'<span class="dash-switch" role="listbox" aria-label="Switch dashboard">{rows}</span>'


def date_picker():
    """measured `date-range-dropdown` 560x420 in 409:11644 — r12, white, 1px Neutral/50, shadow.
    Left pane 228 of presets (rows 212x36 r4, selected Neutral/50), right pane 332 with a 300-wide
    inputs row (136x36 fields, Neutral/25 fill, Neutral/200 stroke), weekday strip, rule, and a
    5x7 day grid of 36x28 cells at 12px. In-range cells take Neutral/50; the two endpoints are
    black pills. Footer 560x60, MAX-aligned, top rule."""
    presets = "".join(
        f'<span class="dp-preset{" is-sel" if p == DATE_PRESET_SEL else ""}" role="option" '
        f'tabindex="-1" data-preset="{p}">{p}</span>' for p in DATE_PRESETS)
    week = "".join(f'<span class="dp-wd">{d}</span>' for d in ("S", "M", "T", "W", "T", "F", "S"))

    # Twelve months, Aug 2025 -> Jul 2026, so `Last 12 months` and `Last 90 days` land a real
    # start pill instead of clamping at Jul 1. `calendars-stack` is AL:VERTICAL g:20 with a 4x69
    # scrollbar thumb in the measured frame, so a stack that scrolls is what the design asks for.
    months = []
    for y, m in CAL_RANGE:
        first_wd, ndays = calendar.monthrange(y, m)
        lead = (first_wd + 1) % 7                       # calendar has Monday=0; the grid is Sun-first
        cells = ['<span class="dp-day is-empty" aria-hidden="true"></span>'] * lead
        for d in range(1, ndays + 1):
            # one identity for every day in the stack: days from Jul 1 2026, 1 = Jul 1
            off = (datetime.date(y, m, d) - CAL_EPOCH).days + 1
            cls = "dp-day"
            if off == CAL_FROM:
                cls += " is-edge is-start has-end"
            elif off == CAL_TO:
                cls += " is-edge is-end"
            elif CAL_FROM < off < CAL_TO:
                cls += " is-range"
            # the number is wrapped so it can stack above the band and the pill
            cells.append(f'<button class="{cls}" data-off="{off}"><i>{d}</i></button>')
        while len(cells) % 7:
            cells.append('<span class="dp-day is-empty" aria-hidden="true"></span>')
        rows = "".join('<span class="dp-row">' + "".join(cells[i:i + 7]) + '</span>'
                       for i in range(0, len(cells), 7))
        title = f"{calendar.month_abbr[m].upper()} {y}"
        months.append(f'<span class="dp-month" data-month="{y}-{m:02d}">'
                      f'<span class="dp-month-title">{title}</span>'
                      f'<span class="dp-grid">{rows}</span></span>')

    return f'''<span class="dp" role="dialog" aria-label="Choose a date range">
<span class="dp-split">
<span class="dp-presets" role="listbox" aria-label="Presets">{presets}</span>
<span class="dp-cal">
<span class="dp-inputs">
<input class="dp-field" data-dp-from value="{CAL_FROM_LABEL}" aria-label="Range start"
 autocomplete="off" spellcheck="false">
<i class="dp-to">to</i>
<input class="dp-field" data-dp-to value="{CAL_TO_LABEL}" aria-label="Range end"
 autocomplete="off" spellcheck="false"></span>
<span class="dp-week">{week}</span><i class="dp-rule"></i>
<span class="dp-stack" data-dp-stack>{"".join(months)}</span>
</span></span>
<span class="dp-foot"><button class="btn btn-ghost dp-cancel">Cancel</button>
<button class="btn btn-primary dp-apply">Apply</button></span></span>'''


def chan_table():
    """ONE table. The two toolbar checkboxes toggle COLUMN GROUPS — the Figma frame stacks two
    cards because a design file has to draw both states side by side. `Spend & ROI` starts off,
    matching the first card; turning it on reveals the trailing divider + Spent/roi columns and
    the metric columns reflow (Figma: 160/160/137.3 -> 85.6 each), which flex does for free."""
    def sortable(c, i):
        return (f'<span class="tc" role="columnheader" tabindex="0" data-sort-key="{i}" '
                f'aria-sort="none" data-tip="Sort by {sort_label(c)}">{c} '
                f'<span class="sort-ic">{ico("arrows-down-up","bold",12)}</span></span>')
    head = ('<div class="trow trow-head">'
            f'<span class="tc tc-chan">{CHAN_COLS[0]}</span><i class="tdiv"></i>'
            '<span class="tcells" data-col-group="demos">'
            + "".join(sortable(c, i) for i, c in enumerate(CHAN_COLS[1:]))
            + '</span>'
            '<i class="tdiv is-hidden" data-col-group="spend"></i>'
            '<span class="tcells tcells-trail is-hidden" data-col-group="spend">'
            + "".join(sortable(c, 5 + i) for i, c in enumerate(("Spent", "roi")))
            + '</span></div>')

    # data-label carries the column name onto every cell. On phone the header row is hidden and
    # each cell renders its own label, so a 6-column table reads as a stack instead of scrolling
    # sideways. Costs one attribute; the desktop table ignores it entirely.
    def metric(v, lbl):
        return (f'<span class="tc tc-metric" data-label="{lbl}" data-sort="{v[1]}"><b>' + v[0] + '</b>'
                + bar(f"{v[1]*100:.0f}%", "green", "sm") + '</span>')

    def group_demos(demos, shows, pend, clos, arr):
        c = CHAN_COLS
        return ('<span class="tcells" data-col-group="demos">'
                + metric(demos, c[1]) + metric(shows, c[2])
                + f'<span class="tc" data-label="{c[3]}" data-sort="{pend}">{pend}</span>'
                f'<span class="tc" data-label="{c[4]}" data-sort="{clos}">{clos}</span>'
                f'<span class="tc" data-label="{c[5]}" data-sort="{arr}">{arr}</span></span>')

    def group_spend(spent, roi):
        return ('<i class="tdiv is-hidden" data-col-group="spend"></i>'
                '<span class="tcells tcells-trail is-hidden" data-col-group="spend">'
                f'<span class="tc" data-label="Spent" data-sort="{spent}">{spent}</span>'
                f'<span class="tc" data-label="roi" data-sort="{roi}">{roi}</span></span>')

    rows = []
    for ch, icn, badge, demos, shows, pend, clos, arr, spent, roi in CHAN_ROWS:
        bdg = f'<span class="chan-badge">{ico("crown-simple","regular",12)}</span>' if badge else ''
        rows.append('<div class="trow" data-row>'
                    f'<span class="tc tc-chan" data-sort="{ch}">{ico(icn,"regular",12)}{ch}{bdg}</span>'
                    '<i class="tdiv"></i>'
                    + group_demos(demos, shows, pend, clos, arr)
                    + group_spend(spent, roi) + '</div>')
    ch, demos, shows, pend, clos, arr, spent, roi = CHAN_TOTAL
    rows.append('<div class="trow trow-total">'
                f'<span class="tc tc-chan">{ch}</span><i class="tdiv"></i>'
                + group_demos(demos, shows, pend, clos, arr)
                + group_spend(spent, roi) + '</div>')

    toolbar = ('<div class="panel-toolbar"><div class="pt-left">'
               '<label class="chk-wrap" data-toggles="demos">'
               f'<span class="chk is-on">{ico("check","bold",16)}</span>'
               '<span class="chk-label">Demos &amp; Show-ups</span></label>'
               '<label class="chk-wrap" data-toggles="spend">'
               f'<span class="chk">{ico("check","bold",16)}</span>'
               '<span class="chk-label">Spend &amp; ROI</span></label></div>'
               # measured `Frame 2147260164` 205x32 — "Showing for" at 14/Neutral/600 plus a
               # 116x32 r8 select, white fill, Neutral/400 stroke, Bold-12 caret. There is no
               # column-chooser button in the frame; that was mine.
               '<div class="pt-right"><span class="muted-14">Showing for</span>'
               + select_menu("Last Month", [(v, None) for v in DATE_TABS], 'data-chan-range')
               + '</div></div>')
    return ('<div class="card card-lg">' + toolbar
            + '<div class="grid-wrap">' + head + "".join(rows) + '</div></div>')


def chart_controls():
    """The `Show both` toggle is what makes the frame look like two Actual-vs-Target sections:
    off shows the tab-selected chart, on shows both. One section, two states."""
    return ('<div class="panel-controls"><div class="pc-left">'
            '<div class="tab-group" data-chart-tabs>'
            '<span class="tab-item is-active" data-chart="demos">Cumulative Demos</span>'
            '<span class="tab-item" data-chart="showups">Cumulative Show-ups</span></div>'
            '<label class="toggle-wrap" data-toggles-both>'
            '<span class="toggle" role="switch" aria-checked="false"></span>'
            '<span class="toggle-label">Show both</span></label></div>'
            '<div class="pc-right"><span class="muted-14">Showing for</span>'
            + select_menu("Last Month", [(v, None) for v in DATE_TABS], 'data-range')
            + '</div></div>')


# ─────────────────────────── component partials ───────────────────────────
def section_header(title, qualifier, legend=False):
    leg = ('<div class="legend">'
           + "".join(f'<span class="leg-item"><i class="dot dot-{t}"></i>{l}</span>'
                     for t, l in (("green", "On track"), ("yellow", "Pending"), ("red", "Behind")))
           + '</div>') if legend else ''
    return (f'<div class="section-header"><div class="sh-title"><h2>{title}</h2>'
            f'<span>{qualifier}</span></div>{leg}</div>')

def ring(pct, track, fill, size=20, sw=2):
    """20x20 donut. The band width comes from arcData.innerRadius, NOT from strokeWeight: both
    ellipses are 20x20 with innerRadius 0.8, so the annulus runs r=8..10 — 2px wide. The 5px
    INSIDE stroke sits on a shape only 2px thick, so it cannot widen it. Building r=7.5/sw=5
    drew a band 2.5x too heavy, which is what "wider in claude" was pointing at.
    Sweep starts at the top (Figma arc 1.5pi) and runs clockwise."""
    r = (size - sw) / 2
    c = 2 * 3.14159265 * r
    half = size / 2
    return (f'<span class="ring" style="width:{size}px;height:{size}px" aria-hidden="true">'
            f'<svg viewBox="0 0 {size} {size}" width="{size}" height="{size}">'
            f'<circle cx="{half}" cy="{half}" r="{r}" fill="none" stroke="{track}" stroke-width="{sw}"/>'
            f'<circle cx="{half}" cy="{half}" r="{r}" fill="none" stroke="{fill}" stroke-width="{sw}"'
            f' stroke-dasharray="{c * pct / 100:.2f} {c:.2f}"'
            f' transform="rotate(-90 {half} {half})"/></svg></span>')


def bar(pct, tone, size="md"):
    return (f'<span class="progress progress-{size}">'
            f'<i class="progress-fill fill-{tone}" style="width:{pct}"></i></span>')

def compare_control():
    """The Compare control, or nothing at all. Gated by SHOW_COMPARE — see the flag for why
    OFF must mean OMITTED rather than hidden."""
    if not SHOW_COMPARE:
        return ''
    return ('<span class="cmp-note">vs prior month</span>'
            '<button class="btn btn-outlined btn-compare" data-compare aria-pressed="false">'
            f"{ico('selection-foreground','regular',16)}Compare</button>")

def delta_el(d):
    """⚠ CREATED ELEMENT — pending library review.

    There is NO compare affordance anywhere in the Gushwork system: no `Compare` variant, no
    delta pattern in `section-elements.md` or the v2 set, and no ruling. The button was drawn in
    the frame and wired to nothing, which is the dead-control trap; ruled 1 Sep 2026 that a
    drawn affordance must work, so the behaviour is built here and declared.

    Composed from EXISTING values only — `body-12-med`, the `--tone-*-fg` aliases already
    carrying attainment colour (theme-aware in both modes), `spacing/4`, and the measured
    trend glyphs at 12. No new colour, radius, spacing or type value is introduced.
    """
    if not d or not SHOW_COMPARE:
        return ''
    up = d.startswith('+')
    return (f'<span class="delta {"is-up" if up else "is-down"}" data-delta>'
            f'{ico("trend-up" if up else "trend-down", "bold", 12)}<b>{d}</b></span>')

def stat_card(label, value, sub, pct, tone, delta=None):
    right = f'<span class="sc-pct">{pct}</span>' if pct else ''
    prog = bar(pct, tone) if pct else ''
    return f'''<div class="card card-md stat-card">
<div class="sc-body"><div class="sc-label">{label}</div>
<div class="sc-value-block"><div class="sc-value-row">
<div class="sc-value"><b>{value}</b><span class="sc-sub">{sub}{delta_el(delta)}</span></div>{right}</div>{prog}</div></div></div>'''

def metric_card(label, value, sub, pct, delta=None):
    # measured: the sub-line is a row — text + a 20px ring, gap spacing/4, cross-centred.
    # Ring track here is neutral/100, NOT the /200 used by the page-header ring.
    return (f'<div class="card card-md metric-card"><div class="mc-body">'
            f'<div class="mc-label">{label}</div>'
            f'<div class="mc-value"><b>{value}</b>'
            f'<span class="mc-sub">{sub}{delta_el(delta)}'
            f'{ring(pct, "var(--b-card)", "var(--d-good)")}</span>'
            f'</div></div></div>')


def sort_head(cols):
    """Header cells are the sort control. `data-sort-key` is the column index; aria-sort carries
    state for assistive tech. The ArrowsDownUp glyph is swapped for Arrow Up/Down when active."""
    out = []
    for i, c in enumerate(cols):
        out.append(f'<span class="tc" role="columnheader" tabindex="0" data-sort-key="{i}" '
                   f'aria-sort="none" data-tip="Sort by {sort_label(c)}">{c} '
                   f'<span class="sort-ic">{ico("arrows-down-up","bold",12)}</span></span>')
    return "".join(out)


def select_menu(label, options, attrs="", width=None, sel_cls=""):
    """Trigger + menu. Measured spec (controls.md): the open menu is WIDER than its trigger and
    right-aligned; border neutral/50; options button-12; option hover neutral/50; and there is
    NO selected checkmark — an earlier ruling invented one, so none is drawn here."""
    w = f'style="width:{width}px" ' if width else ""
    items = "".join(
        f'<button class="menu-item" role="option" data-value="{v}"'
        f'{" data-sort-key=\"%s\"" % k if k is not None else ""}>{v}</button>'
        for v, k in options)
    return (f'<span class="select-wrap" {attrs}>'
            f'<button class="select {sel_cls}" {w}aria-haspopup="listbox" aria-expanded="false">'
            f'<span class="select-label">{label}</span>{ico("caret-down","bold",12)}</button>'
            f'<span class="menu" role="listbox">{items}</span></span>')


def pagination(total, page_size=PAGE_SIZE):
    pages = max(1, -(-total // page_size))
    sizes = [(str(s), None) for s in (5, 10, 25, 50, 100)]   # your call: 5 added
    return (f'<div class="pagination" data-total="{total}">'
            f'<div class="pg-left"><span class="muted-14">Items per page</span>'
            + select_menu(str(page_size), sizes, 'data-pagesize', sel_cls="select-sm")
            + f'</div><div class="pg-right">'
            f'<span class="muted-14 pg-status">Page 1 of {pages}</span>'
            f'<button class="icon-btn" data-page="prev" aria-label="Previous page" disabled>'
            f'{ico("arrow-left","regular",12)}</button>'
            f'<button class="icon-btn" data-page="next" aria-label="Next page">'
            f'{ico("arrow-right","regular",12)}</button></div></div>')


def daily_table():
    cols = DAILY_COLS
    head = f'<div class="trow trow-head trow-daily">{sort_head(cols)}</div>'
    rows = []
    for d, bk, su, ba, bap, sa, sap in DAILY_SET:
        day = int(d.split()[1])
        rows.append(f'<div class="trow trow-daily" data-row>'
                    f'<span class="tc tc-strong" data-label="{cols[0]}" data-sort="{day}">{d}</span>'
                    f'<span class="tc" data-label="{cols[1]}" data-sort="{bk}">{bk}</span>'
                    f'<span class="tc" data-label="{cols[2]}" data-sort="{su}">{su}</span>'
                    f'<span class="tc tc-pair" data-label="{cols[3]}" data-sort="{bap}">{ba}'
                    f'<span class="badge badge-sm badge-{"red" if bap < 90 else "green"}">{bap}%</span></span>'
                    f'<span class="tc tc-pair" data-label="{cols[4]}" data-sort="{sap}">{sa}'
                    f'<span class="badge badge-sm badge-{"red" if sap < 90 else "green"}">{sap}%</span></span>'
                    f'</div>')
    sorts = [("Date", 0), ("Bookings", 1), ("Show-ups", 2),
             ("Booking attainment", 3), ("Show-up attainment", 4)]
    toolbar = ('<div class="panel-toolbar panel-toolbar-titled">'
               '<div class="pt-title"><h3>Demo bookings &amp; show-ups</h3>'
               # measured literal. Figma reads 1,308 here while the stat card above says
               # 1,310 of 1,472 and the channel total says 1310/1426 — three counts in one screen.
               f'<span>1,308 bookings last month</span></div>'
               '<div class="pt-right"><span class="muted-14">Sort by</span>'
               + select_menu("Date", sorts, 'data-sort-select') + '</div></div>')
    return (f'<div class="card card-lg" data-table>{toolbar}'
            f'<div class="grid-wrap">{head}{"".join(rows)}</div>'
            f'{pagination(len(DAILY_SET))}</div>')


def onb_table():
    cols = ONB_COLS
    head = f'<div class="trow trow-head trow-onb">{sort_head(cols)}</div>'
    rows = []
    for d, dom, ae, chn, mo, arr, st, tone in ONB_SET:
        day = int(d.split()[1])
        money = int(mo.replace("$", "").replace(",", ""))
        rows.append(f'<div class="trow trow-onb" data-row '
                    f'data-text="{dom.lower()} {ae.lower()} {chn.lower()}">'
                    f'<span class="tc tc-strong" data-label="{cols[0]}" data-sort="{day}">{d}</span>'
                    f'<span class="tc" data-label="{cols[1]}" data-sort="{dom}">{dom}</span>'
                    f'<span class="tc" data-label="{cols[2]}" data-sort="{ae}">{ae}</span>'
                    f'<span class="tc" data-label="{cols[3]}" data-sort="{chn}">{chn}</span>'
                    f'<span class="tc" data-label="{cols[4]}" data-sort="{money}">{mo}</span>'
                    f'<span class="tc tc-ink" data-label="{cols[5]}" data-sort="{money*12}">{arr}</span>'
                    f'<span class="tc" data-label="{cols[6]}" data-sort="{st}">'
                    f'<span class="badge badge-sm badge-{tone}">{st}</span></span></div>')
    sorts = [(sort_label(c), i) for i, c in enumerate(cols)]
    toolbar = ('<div class="panel-toolbar panel-toolbar-titled">'
               '<div class="pt-title"><h3>Onboardings</h3>'
               f'<span>{len(ONB_SET)} onboardings last month</span></div>'
               '<div class="pt-right"><span class="muted-14">Quick Filter</span>'
               '<span class="select select-filter filter-field">'
               '<input type="search" placeholder="Search domain, AE, channel" '
               'aria-label="Filter onboardings" data-filter></span>'
               '<span class="muted-14">Sort by</span>'
               + select_menu("Date", sorts, 'data-sort-select') + '</div></div>')
    return (f'<div class="card card-lg" data-table>{toolbar}'
            f'<div class="grid-wrap">{head}{"".join(rows)}</div>'
            f'{pagination(len(ONB_SET))}</div>')


# ─────────────────────────── drift notice ───────────────────────────
# The human half of the update path. The CLI check reaches an agent; this reaches the GTM manager
# who just opened the file. It fetches the published registry, compares it against this build's
# stamp, and says something only when one of the components THIS dashboard uses has moved on.
#
# It must never break the dashboard: no network, stale cache, private host, blocked CSP, malformed
# JSON — every one of those paths ends in silence. A dashboard that cannot phone home is still a
# working dashboard.
BUILD_STAMP = json.dumps({
    "pluginVersion": PLUGIN_VERSION,
    "createdBy": BUILD_CREATED_BY,
    "createdAt": BUILD_CREATED_AT,
    "registry": REGISTRY_URL,
    "changelog": CHANGELOG_URL,
    "components": USES_COMPONENTS,
}, separators=(",", ":"))

# RAW string: this block is JavaScript, and Python must not interpret its escapes. Without the
# r-prefix a JS "\\n" inside a string literal became a real newline and broke the script at
# parse time — the whole notice silently never ran.
DRIFT_JS = r"""
(function () {
  var STAMP = %s;
  var KEY = 'gw-drift-dismissed';
  function ver(v) { return (v || '0.0.0').split('.').map(Number); }
  function newer(a, b) {           /* a > b ? */
    var x = ver(a), y = ver(b);
    for (var i = 0; i < 3; i++) { if ((x[i]|0) !== (y[i]|0)) return (x[i]|0) > (y[i]|0); }
    return false;
  }
  function show(must, may) {
    var el = document.querySelector('.drift');
    if (!el) return;
    var all = must.concat(may);
    var seen = '';
    try { seen = localStorage.getItem(KEY) || ''; } catch (e) {}
    var sig = all.map(function (c) { return c.name + '@' + c.version; }).sort().join(',');
    if (seen === sig) return;                       /* already dismissed THIS set */
    el.querySelector('[data-drift-dot]').classList.toggle('is-must', must.length > 0);
    el.querySelector('[data-drift-title]').textContent = must.length
      ? 'The design has moved on \u2014 ' + must.length + ' of these '
        + (must.length > 1 ? 'render' : 'renders') + ' differently now'
      : all.length + ' component' + (all.length > 1 ? 's have' : ' has')
        + ' been updated since this was built';
    var listEl = el.querySelector('[data-drift-list]');
    listEl.textContent = '';
    /* the registry carries a one-line note per component — say WHAT changed, not just which */
    all.slice(0, 3).forEach(function (c) {
      var row = document.createElement('span');
      row.className = 'drift-item';
      var nm = document.createElement('b');
      nm.textContent = c.name + (c.breaking ? ' \u26a0' : '');
      row.appendChild(nm);
      if (c.note) {
        var n = c.note.length > 96 ? c.note.slice(0, 95).replace(/[ ,.;]+$/, '') + '\u2026' : c.note;
        row.appendChild(document.createTextNode(' \u2014 ' + n));
      } else if (c.added) {
        row.appendChild(document.createTextNode(' \u2014 new component'));
      }
      listEl.appendChild(row);
    });
    if (all.length > 3) {
      var more = document.createElement('span');
      more.className = 'drift-item';
      more.textContent = '+ ' + (all.length - 3) + ' more';
      listEl.appendChild(more);
    }
    /* The only real way to update a built dashboard is to re-open it with Claude and the
       skill. So the action is not a link — it is the exact instruction to paste, naming the
       drifted components and what changed, so nobody has to reconstruct it. */
    function updatePrompt() {
      var to = (all[0] && all[0].registryVersion) || 'the current version';
      var lines = [
        'Update this dashboard to the Gushwork design system v' + to + '.',
        'It was built on v' + STAMP.pluginVersion + ' and these components have changed since:',
        ''
      ];
      all.forEach(function (c) {
        lines.push('- ' + c.name + (c.breaking ? ' (BREAKING)' : '')
          + ' \u2192 v' + c.version + (c.doc ? '  [' + c.doc + ']' : '')
          + (c.note ? '\n    ' + c.note : (c.added ? '\n    new component' : '')));
      });
      lines.push('');
      lines.push('Read exports/dashboard/component-registry.json and the doc each entry points at,');
      lines.push('apply the changes to this file, then re-run the build verifier.');
      return lines.join('\n');
    }
    var act = el.querySelector('[data-drift-update]');
    act.addEventListener('click', function () {
      var text = updatePrompt(), done = function () {
        act.textContent = 'Copied \u2014 paste into Claude';
        setTimeout(function () { act.textContent = 'How to update'; }, 4000);
      };
      try {
        if (navigator.clipboard && window.isSecureContext) {
          navigator.clipboard.writeText(text).then(done, function () { fallback(text, done); });
        } else { fallback(text, done); }
      } catch (e) { fallback(text, done); }
    });
    function fallback(text, done) {
      /* insecure context or a blocked clipboard — put it on screen so it is still copyable */
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;left:-9999px';
      document.body.appendChild(ta);
      ta.select();
      var okd = false;
      try { okd = document.execCommand('copy'); } catch (e) {}
      ta.remove();
      if (okd) return done();
      /* Never a window.prompt here — it is modal and blocks the whole page. Reveal the text in
         place instead, pre-selected, so it is still one keystroke to copy. */
      var box = el.querySelector('[data-drift-fallback]');
      box.value = text;
      box.style.display = 'block';
      box.focus();
      box.select();
      act.textContent = 'Copy the text below';
    }

    var foot = document.createElement('span');
    foot.className = 'drift-foot';
    foot.textContent = 'built ' + STAMP.createdAt + ' on v' + STAMP.pluginVersion + ' \u00b7 ';
    var a = document.createElement('a');
    a.href = STAMP.changelog || '#';
    a.target = '_blank'; a.rel = 'noopener';
    a.textContent = 'full changelog \u2192';
    foot.appendChild(a);
    listEl.appendChild(foot);
    el.querySelector('[data-drift-dismiss]').addEventListener('click', function () {
      el.classList.remove('is-on');
    });
    /* Recorded at SHOW time, not on dismiss: this is a notice, not a nag. It appears once per
       change-set — reloading will not bring it back, and closing the tab does not mean it was
       missed and owes a repeat. A LATER change produces a different signature and earns one
       fresh showing. */
    try { localStorage.setItem(KEY, sig); } catch (e) {}
    el.classList.add('is-on');
  }
  function check(reg) {
    var comps = (reg && reg.components) || {};
    var must = [], may = [];
    STAMP.components.forEach(function (name) {
      var c = comps[name];
      if (!c || !newer(c.version, STAMP.pluginVersion)) return;
      (c.breaking ? must : may).push({
        name: name, version: c.version, note: c.note, doc: c.doc,
        added: c.added, breaking: !!c.breaking, registryVersion: reg.registryVersion
      });
    });
    if (must.length || may.length) show(must, may);
  }
  /* deferred so it can never delay first paint, and wrapped so it can never throw into the page */
  function run() {
    try {
      fetch(STAMP.registry, { cache: 'no-cache', mode: 'cors' })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (j) { if (j) check(j); })
        .catch(function () {});          /* offline, private, blocked — stay silent */
    } catch (e) {}
  }
  if (document.readyState === 'complete') setTimeout(run, 1200);
  else window.addEventListener('load', function () { setTimeout(run, 1200); });
})();
""" % BUILD_STAMP


# ─────────────────────────── shell ───────────────────────────
# measured 236:31801 — the nav column is SPACE_BETWEEN over TWO blocks: `Frame 2147260124`
# (collapse row + Overview/Channels) at the top and a separate `list-group` (Settings + Admin)
# pinned to the bottom. The 154 itemSpacing is vestigial; SPACE_BETWEEN overrides it.
NAV_END_GROUPS = ("settings", "admin")   # NAV labels are mixed case; compare casefolded
nav_top, nav_end = "", ""
for group, items in NAV:
    block = '<div class="nav-group"><span class="nav-label">' + group + '</span>'
    for label, icn, sel in items:
        block += (f'<a class="nav-item{" is-selected" if sel else ""}" href="#" '
                  f'data-nav="{label}"{" data-home" if sel else ""}>'
                  f'{ico(icn,"regular",16)}<span>{label}</span></a>')
    block += '</div>'
    if group.lower() in NAV_END_GROUPS:
        nav_end += block
    else:
        nav_top += block
nav_html = nav_top + nav_end

tabs_html = "".join(f'<span class="tab-item{" is-active" if t == ACTIVE_TAB else ""}">{t}</span>'
                    for t in DATE_TABS)

hero = f'''<div class="card card-lg hero">
<div class="hero-body">
<div class="hero-top">
<div class="hero-head"><h2 class="hero-value">$809K ARR Added</h2>
<span class="badge badge-md badge-red">Behind</span></div>
<div class="hero-meta"><span>of $1392K</span><span>58%</span></div>
{bar('58%','red')}</div>
<div class="inset" data-inset>
<div class="inset-head"><span>What went wrong?</span>
<button class="icon-btn icon-btn-ghost" data-inset-toggle aria-expanded="true"
 aria-label="Collapse">{ico('caret-up','bold',12)}</button></div>
<div class="inset-rows">
<span class="inset-row" data-tip="Google Ads booked 26 demos against a plan of 16 for the period.">{ico('info','bold',12)}Google Ads demos at 26 vs expected 16.</span>
<span class="inset-row" data-tip="Repeated in the source frame; kept verbatim.">{ico('info','bold',12)}Google Ads demos at 26 vs expected 16, Google Ads demos.</span>
</div></div></div></div>'''

TIP1 = ("Jul 26", "1104", "1235", "ink")
TIP2 = ("Jul 26", "1104", "1235", "red")
TIP3 = ("Jul 26", "571", "556", "green")

body = f'''<div class="page">
<div class="page-header">
<h1 class="page-title">Overview</h1>
<div class="ph-row">
<div class="ph-left"><div class="tab-wrap"><div class="tab-group" data-date-tabs>{tabs_html}</div>
{date_picker()}</div>
<span class="ph-period" data-tip="Day 18 of 30 — 60% of the period elapsed.">Day 18 of 30
 {ring(60, 'var(--d-track)', 'var(--d-series)')}</span></div>
{compare_control()}
</div></div>

<section class="section">{section_header('Overall Performance','for last month',True)}
{hero}
<div class="stat-row">{"".join(stat_card(*c) for c in STAT_CARDS)}</div></section>

<section class="section">{section_header('Run Rate','per biz day')}
<div class="metric-row">{"".join(metric_card(*m) for m in RUN_RATE)}</div></section>

<section class="section">{section_header('Channel Breakdown','per biz day')}
{chan_table()}</section>

<section class="section">{section_header('Actual vs Target','per biz day')}
<div class="card card-lg">{chart_controls()}
<div class="chart-row">
{chart_card('Cumulative Demos vs Target','260 of 340',76,'red',[340,272,204,136,68,0],260,340,TIP2,'demos')}
{chart_card('Cumulative Show-ups vs Target','708 of 720',98,'green',[800,600,400,200,0],708,720,TIP3,'showups',hidden=True)}
</div></div></section>

<section class="section">{section_header('Daily Breakdown','per biz day')}
{daily_table()}{onb_table()}</section>
</div>'''

CSS = f"""
{FONTS}
:root{{
{ROOTVARS}
{TRACK}
  /* Display ramp — NO TOKEN EXISTS. See DECISIONS.md R15: the five Dashboard/display-* styles
     match no --gw-text-* property (h3 is Bold where the page title is Semibold; h7 is
     line-height 1.4 where the card title is 1.0). Literal specs, flagged, never substituted. */
  --dash-display-44-sem:600 44px/1.2 'Vert Grotesk Display';
  --dash-display-36-med:500 36px/1.2 'Vert Grotesk Display';
  --dash-display-28-med:500 28px/1.2 'Vert Grotesk Display';
  --dash-display-22-med:500 22px/1 'Vert Grotesk Display';
  --dash-display-20-sem:600 20px/1 'Vert Grotesk Display';
  /* FIX-8: the loading heading is 32/120% Vert Grotesk REGULAR — a sixth weight, and the only
     place Regular is used. Still no token; same gap as the rest of the ramp (R15). */
  --dash-display-32-reg:400 32px/1.2 'Vert Grotesk Display';
  /* Vertical rhythm — measured values are the CEILING, floors are judgement (build-rules.md) */
  --v-sect-gap:clamp(40px,6vh,80px);
  --v-slot-top:clamp(24px,5vh,60px);
  /* ── Semantic surface aliases. Light values below; the [data-theme=dark] block swaps
     them. Every dark value is MEASURED off frame 236:33407 — see exports/dashboard/v2/. ── */
  --s-canvas:{tok('--gw-color-neutral-25')};
  --s-chrome:{tok('--gw-color-neutral-50')};
  --s-card:{tok('--gw-color-white')};
  --s-inset:{tok('--gw-color-neutral-25')};
  --s-row-head:{tok('--gw-color-neutral-25')};
  --s-row:transparent;
  --s-row-hover:{tok('--gw-color-neutral-25')};
  --s-nav-sel:{tok('--gw-color-neutral-100')};
  --s-nav-hover:{tok('--gw-color-neutral-25')};   /* FIX-8: measured ruling — hover is /25, not /100 */
  --t-toggle-on:{tok('--gw-color-white')};        /* measured: active glyph */
  --t-toggle-off:{tok('--gw-color-neutral-900')}; /* measured: inactive glyph */
  --t-btn:{tok('--gw-color-neutral-900')};        /* Sync Now label + icon */
  --s-compare:{tok('--gw-color-white')};          /* Compare carries a fill; Sync Now does not */
  --b-compare:{tok('--gw-color-neutral-400')};
  --t-compare:{tok('--gw-color-neutral-900')};
  --s-btn-hover:{tok('--gw-color-neutral-35')};        /* measured Outline hover */
  --s-btn-primary-hover:{tok('--gw-color-neutral-850')};  /* measured Primary hover */
  --t-btn-ghost:{tok('--gw-color-black')};        /* measured: the picker's Cancel label */
  /* measured `tooltip` 282:727 — the bubble is Neutral/900 in light, NOT --s-invert's black */
  --s-tip:{tok('--gw-color-neutral-900')};
  --t-tip:{tok('--gw-color-white')};
  /* A hover fill has to differ from the surface it lands ON, not just from the text. These three
     collided exactly with their own surface in one theme and rendered as no hover at all. */
  --s-menu-hover:{tok('--gw-color-neutral-50')};
  --s-toggle-on:{tok('--gw-color-neutral-900')};     /* measured light On = #262a2e */
  --s-inset-hover:{tok('--gw-color-neutral-50')};
  --s-compare-hover:{tok('--gw-color-neutral-35')};
  --s-btn-ghost-hover:{tok('--gw-color-neutral-50')};   /* measured Ghost hover */
  --s-invert:{tok('--gw-color-black')};
  --t-on-invert:{tok('--gw-color-white')};
  --s-menu:{tok('--gw-color-white')};
  --s-skel:{tok('--gw-color-neutral-100')};
  --b-chrome:{tok('--gw-color-neutral-100')};
  --b-card:{tok('--gw-color-neutral-100')};
  --b-inset:{tok('--gw-color-neutral-100')};
  --b-strong:{tok('--gw-color-neutral-200')};
  --b-input:{tok('--gw-color-neutral-400')};
  --b-divider:{tok('--gw-color-neutral-25')};
  --b-menu:{tok('--gw-color-neutral-50')};
  --t-display:{tok('--gw-color-black')};
  --t-body:{tok('--gw-color-neutral-900')};
  --t-label:{tok('--gw-color-neutral-700')};
  --t-muted:{tok('--gw-color-neutral-500')};
  --t-icon:{tok('--gw-color-neutral-600')};
  --t-faint:{tok('--gw-color-neutral-400')};
  --t-disabled:{tok('--gw-color-neutral-250')};
  --d-track:{tok('--gw-color-neutral-200')};
  --d-good:{tok('--gw-color-green-400')};
  --d-bad:{tok('--gw-color-red-400')};
  --d-warn:{tok('--gw-color-yellow-400')};
  --d-series:{tok('--gw-color-primary-500')};
  --tone-good-bg:{tok('--gw-color-green-25')};   --tone-good-fg:{tok('--gw-color-green-500')};
  --tone-bad-bg:{tok('--gw-color-red-25')};      --tone-bad-fg:{tok('--gw-color-red-500')};
  /* R19's compare delta is body-12-med, so R18 applies: the /500 step FAILS 4.5:1 at this
     size — measured 3.3:1 for green-500 on the card. The delta takes /600 in light and
     /300 in dark, the pattern R18 ruled for badge labels. Deliberately NOT --tone-*-fg:
     that alias is /500 and repointing it would move the attainment percentages too.
     ⚠ FINDING: --tone-good-fg fails the same test wherever it carries body-12-med. */
  --tone-delta-up:{tok('--gw-color-green-600')};
  --tone-delta-down:{tok('--gw-color-red-600')};
  --tone-bad-bg-md:{tok('--gw-color-red-50')};
  --tone-warn-bg:{tok('--gw-color-yellow-25')};  --tone-warn-fg:{tok('--gw-color-yellow-500')};
}}
[data-theme="dark"]{{
  --s-canvas:{tok('--gw-color-black')};
  --s-chrome:{tok('--gw-color-neutral-900')};
  --s-card:{tok('--gw-color-neutral-900')};
  --s-inset:{tok('--gw-color-black')};
  --s-row-head:{tok('--gw-color-black')};
  --s-row:{tok('--gw-color-black')};
  --s-row-hover:{tok('--gw-color-neutral-900')};
  --s-nav-sel:{tok('--gw-color-neutral-600')};   /* your call: dark selected is /600 */
  --s-nav-hover:{tok('--gw-color-neutral-700')};  /* and dark hover is /700 */
  /* measured in `dark-mode` 236:33407: the ACTIVE glyph is Neutral/black (not the /900 that
     --t-on-invert carries) and the INACTIVE glyph is Neutral/50 (not white). */
  --t-toggle-on:{tok('--gw-color-black')};
  --t-toggle-off:{tok('--gw-color-neutral-50')};
  /* measured in `dark-mode` 236:33407 — the two topbar buttons genuinely differ in dark, which
     is the `Compare vs Sync Now` gap logged in section 9. Both are now measured, not ruled. */
  --t-btn:{tok('--gw-color-neutral-50')};         /* NOT white — Sync Now is /50 in dark */
  --s-compare:{tok('--gw-color-neutral-800')};
  --b-compare:{tok('--gw-color-neutral-600')};
  --t-compare:{tok('--gw-color-white')};
  --s-btn-hover:{tok('--gw-color-neutral-800')};        /* RULED — dark hover unmeasured */
  /* The primary button is Neutral/black in BOTH themes — the fill is an absolute, not a theme
     alias — so its hover has to stay dark. Ruling neutral/100 here put WHITE text on a near-white
     hover: 1.23:1, invisible. It takes the same measured neutral/850 step as light. */
  --s-btn-primary-hover:{tok('--gw-color-neutral-850')};
  --t-btn-ghost:{tok('--gw-color-neutral-50')};   /* RULED — the picker has no dark frame */
  --s-tip:{tok('--gw-color-white')};              /* measured Theme=dark: the bubble inverts */
  --t-tip:{tok('--gw-color-neutral-900')};
  --s-menu-hover:{tok('--gw-color-neutral-800')};    /* menu surface is /900 — /900 hover was invisible */
  /* The card behind this toggle is /900 in dark, so a /900 track disappeared and only the knob
     showed. Your "black only" call, read literally: Neutral/black reads against the /900 card. */
  --s-toggle-on:{tok('--gw-color-black')};
  --s-inset-hover:{tok('--gw-color-neutral-900')};   /* the inset field is black in dark */
  --s-compare-hover:{tok('--gw-color-neutral-700')}; /* Compare is filled /800 in dark */
  --s-btn-ghost-hover:{tok('--gw-color-neutral-800')};  /* RULED — matches --s-btn-hover */
  --s-invert:{tok('--gw-color-white')};
  --t-on-invert:{tok('--gw-color-neutral-900')};
  --s-menu:{tok('--gw-color-neutral-900')};
  --s-skel:{tok('--gw-color-neutral-800')};
  --b-chrome:{tok('--gw-color-neutral-700')};
  --b-card:{tok('--gw-color-neutral-800')};
  --b-inset:{tok('--gw-color-neutral-900')};
  --b-strong:{tok('--gw-color-neutral-700')};
  --b-input:{tok('--gw-color-neutral-600')};
  --b-divider:{tok('--gw-color-neutral-800')};
  --b-menu:{tok('--gw-color-neutral-800')};
  --t-display:{tok('--gw-color-white')};
  --t-body:{tok('--gw-color-white')};
  --t-label:{tok('--gw-color-neutral-400')};
  --t-muted:{tok('--gw-color-neutral-500')};
  --t-icon:{tok('--gw-color-neutral-300')};
  --t-faint:{tok('--gw-color-neutral-400')};
  --t-disabled:{tok('--gw-color-neutral-700')};
  --d-track:{tok('--gw-color-neutral-600')};
  --d-good:{tok('--gw-color-green-300')};
  --d-bad:{tok('--gw-color-red-300')};
  /* Dark label tints are the Alpha/10 steps, not the light /25 and /50 solids — measured on
     `Behind` in dark-mode 236:33407 (Colors/Red/Alpha/10 fill, Colors/Red/300 label) and applied
     across the three tones. Green and Yellow had NO dark override at all, so they were still
     painting their light tints (/25) on a dark surface. Foregrounds step to /300 to sit on them. */
  --tone-bad-bg:{tok('--gw-color-red-alpha-10')};
  --tone-bad-bg-md:{tok('--gw-color-red-alpha-10')};
  --tone-bad-fg:{tok('--gw-color-red-300')};
  --tone-good-bg:{tok('--gw-color-green-alpha-10')};
  --tone-good-fg:{tok('--gw-color-green-300')};
  --tone-delta-up:{tok('--gw-color-green-300')};
  --tone-delta-down:{tok('--gw-color-red-300')};
  --tone-warn-bg:{tok('--gw-color-yellow-alpha-10')};
  --tone-warn-fg:{tok('--gw-color-yellow-300')};
}}
/* AFTER :root, not before. A media query adds no specificity, so the guard must come later in
   source order or the base 120ms wins and reduced-motion is silently ignored. */
@media (prefers-reduced-motion:reduce){{:root{{--gw-motion-fast:0ms}}}}
*,*::before,*::after{{box-sizing:border-box}}
html,body{{margin:0;overflow:hidden;height:100%}}          /* exactly one region scrolls */
body{{background:var(--s-canvas);font-family:'Inter',ui-sans-serif,system-ui,sans-serif;
 -webkit-font-smoothing:antialiased}}
h1,h2,h3{{margin:0;font-weight:inherit}}
.ic{{display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto}}
.ic svg{{display:block}}

/* ── shell: 1440 canvas, scaled to fit. RULED, build-rules.md — never reflow below 1440 ── */
.shell{{zoom:var(--fit,1);width:calc(100vw / var(--fit,1));height:calc(100vh / var(--fit,1));
 display:flex;flex-direction:column;min-width:1440px}}
.shell-body{{flex:1;display:flex;min-height:0}}

/* ── topbar 1440x60 ── */
.topbar{{flex:none;height:60px;padding:0 40px;display:flex;align-items:center;
 justify-content:space-between;background:var(--s-chrome);
 box-shadow:inset 0 -1px 0 var(--b-chrome)}}
.tb-title{{display:flex;align-items:center;gap:8px}}
.tb-logo{{width:32px;height:32px;border-radius:{tok('--gw-radius-8')};
 background:{tok('--gw-color-black')};color:var(--t-on-invert);display:flex;
 align-items:center;justify-content:center;flex:0 0 auto}}
.tb-name{{font:var(--dash-display-20-sem);color:var(--t-display);white-space:nowrap}}
.tb-actions{{display:flex;align-items:center;gap:8px}}
.theme-toggle{{width:66px;height:36px;padding:4px;border-radius:{tok('--gw-radius-12')};
 border:1px solid var(--b-strong);display:inline-flex;align-items:center;
 justify-content:center;gap:2px}}
/* measured `controls/tab` 66x36 r12 stroke Neutral/200: the ACTIVE cell is r8 + Neutral/black
   with a white Bold-12 glyph; the INACTIVE cell is r4 with a Neutral/900 glyph — not the muted
   --t-icon this used, which is what "fix color here" was about. */
/* DIRECT children only. `.theme-toggle span` also matched the nested `.ic` span that ico()
   emits, and a rule applied straight to that element beats colour inherited from its parent cell —
   so the ACTIVE glyph was painting --t-toggle-off: a dark sun on the black pill in light, and a
   near-white moon on the white pill in dark. Invisible in both themes. */
.theme-toggle>span{{width:28px;height:28px;border-radius:{tok('--gw-radius-4')};display:inline-flex;
 align-items:center;justify-content:center;color:var(--t-icon);cursor:pointer}}
.theme-toggle>span{{color:var(--t-toggle-off)}}
.theme-toggle>.is-on{{border-radius:{tok('--gw-radius-8')};
 background:var(--s-invert);color:var(--t-toggle-on)}}

/* ── sidebar 240x… — rail is overflow:hidden, only the nav list scrolls ── */
.sidebar{{flex:none;width:240px;background:var(--s-chrome);
 box-shadow:inset -1px 0 0 var(--b-chrome);display:flex;flex-direction:column;
 justify-content:space-between;overflow:hidden}}
/* measured: SPACE_BETWEEN, so Settings/Admin sit against the footer however tall the window.
   Only the TOP block scrolls — that keeps the scroller count at two (slot + top nav). */
.sb-nav{{flex:1 1 auto;min-height:0;display:flex;flex-direction:column;
 justify-content:space-between}}
.sb-nav-top{{min-height:0;display:flex;flex-direction:column}}
.nav-groups-end{{flex:none}}
 /* measured 236:31801 > Frame 2147260123 — 240x28, AL:H p:4, holding a 20x20 r4 button with a
    Bold 12 caret. The generic .icon-btn is 28x28, so this one is sized explicitly. */
.sb-collapse{{flex:none;height:28px;padding:4px;display:flex;justify-content:flex-end}}
.sb-collapse .icon-btn{{width:20px;height:20px;padding:4px;border:0;
 border-radius:{tok('--gw-radius-4')}}}
.nav-groups{{padding:20px;display:flex;flex-direction:column;gap:24px}}
.sb-nav-top .nav-groups{{overflow-y:auto;min-height:0;
 scrollbar-width:none}}                                   /* hidden scrollbar — NOT measured */
.sb-nav-top .nav-groups::-webkit-scrollbar{{width:0;height:0}}
.nav-group{{display:flex;flex-direction:column}}
.nav-label{{padding:4px 8px;font:{tok('--gw-text-body-10-sem')};text-transform:uppercase;
 color:var(--t-faint)}}
.nav-item{{height:32px;padding:8px;border-radius:{tok('--gw-radius-8')};display:flex;
 align-items:center;gap:8px;text-decoration:none;color:var(--t-body);
 font:{tok('--gw-text-button-14')}}}
/* measured 236:31801 — all 11 nav icon vectors are bound to `Colors/Neutral/900`, the SAME
   variable as their label, group labels being the only Neutral/400 in the column. So the icon
   inherits the row's colour rather than taking the muted --t-icon (neutral/600) used by button
   and table-header glyphs. Dark follows the label to white for the same reason. */
.nav-item .ic{{color:inherit}}
.nav-item.is-selected{{background:var(--s-nav-sel)}}
.nav-item:hover:not(.is-selected){{background:var(--s-nav-hover)}}
/* measured 236:31830 — strokeTopWeight 1.5, Colors/Neutral/100, INSIDE. An inset shadow so it
   cannot eat the 85.5 height the way a real border would. */
.sb-footer{{flex:none;padding:20px 20px 32px;box-shadow:inset 0 1.5px 0 var(--b-chrome)}}
.user-card{{height:32px;display:flex;align-items:center;justify-content:space-between;gap:8px}}
.uc-identity{{display:flex;align-items:center;gap:8px;min-width:0}}
/* measured: white fill, 0.33px neutral/100 border -> 1px per R5, character artwork clipped */
.uc-avatar{{width:32px;height:32px;border-radius:80px;background:{tok('--gw-color-white')};
 border:1px solid var(--b-card);flex:0 0 auto;overflow:hidden;position:relative}}
/* the exported artwork is a two-path silhouette filled #262a2e — that is neutral/900 exactly,
   so it binds. Disc and figure are both absolute Neutral refs, not surface aliases, so they do
   not flip with the theme (R16) — an avatar reads the same on either background. */
.uc-avatar .uc-art{{position:absolute;left:3.3px;top:3px;
 color:{tok('--gw-color-neutral-900')}}}
.uc-art path{{fill:currentColor}}
.uc-meta{{display:flex;flex-direction:column;gap:4px;min-width:0}}
.uc-name{{font:{tok('--gw-text-button-12')};color:var(--t-display)}}
.uc-role{{font:{tok('--gw-text-button-10')};color:var(--t-faint)}}

/* ── the one scroller ── */
.slot{{flex:1;min-width:0;overflow-y:auto;overflow-x:hidden;scrollbar-width:none}}
.slot::-webkit-scrollbar{{width:0;height:0}}
/* FILL the slot, do not pin to 1200. The measured 1200 is what the slot happens to be at 1440
   with the 240 sidebar open — it is a result, not a constraint. Pinned, collapsing the rail to 64
   left 176px of dead space on the right instead of giving it to the content. The 40px side
   padding is the measured margin and holds either way. */
.page{{width:100%;padding:var(--v-slot-top) 40px 80px;display:flex;flex-direction:column}}
.page>*{{flex:0 0 auto}}                                   /* mandatory — build-rules.md */
.section{{display:flex;flex-direction:column;gap:12px;margin-top:var(--v-sect-gap)}}
.section>*{{flex:0 0 auto}}

/* ── page header 1120x113 ── */
.page-header{{display:flex;flex-direction:column;gap:24px}}
.page-title{{font:var(--dash-display-44-sem);color:var(--t-display)}}
.ph-row{{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:nowrap}}
.ph-left{{display:flex;align-items:center;gap:16px}}
.ph-period{{display:inline-flex;align-items:center;gap:8px;
 font:{tok('--gw-text-button-10')};color:var(--t-label)}}
.ph-period .ic{{color:var(--t-faint)}}

/* ── controls ── */
.tab-group{{height:36px;padding:4px;border-radius:{tok('--gw-radius-12')};
 background:var(--s-chrome);border:1px solid var(--b-card);
 display:inline-flex;align-items:center;gap:4px}}
.tab-item{{height:28px;padding:8px 12px;border-radius:{tok('--gw-radius-8')};
 display:inline-flex;align-items:center;font:{tok('--gw-text-button-12')};
 color:var(--t-body);white-space:nowrap;cursor:pointer}}
.tab-item.is-active{{background:var(--s-invert);color:var(--t-on-invert)}}
.btn{{height:36px;padding:8px 12px;border-radius:{tok('--gw-radius-12')};display:inline-flex;
 align-items:center;justify-content:center;gap:4px;background:none;cursor:pointer;
 font:{tok('--gw-text-button-14')};color:var(--t-btn);border:0}}
/* the outline is an inset shadow, not a border: a Figma button HUGS its label + padding, so a
   border-box border made every one of these 2px wider than measured (Sync Now 114 vs 112). */
.btn-outlined{{box-shadow:inset 0 0 0 1px var(--b-strong)}}
/* measured `list-item` 63x36 in the picker footer — r12, Neutral/black fill AND stroke, white
   14px label. There was a .btn-primary HOVER rule but no base rule, so Apply rendered as a plain
   transparent .btn: dark text, no fill. The label must stay white through hover. */
.btn-primary{{background:{tok('--gw-color-black')};color:{tok('--gw-color-white')};
 box-shadow:inset 0 0 0 1px {tok('--gw-color-black')}}}
.btn-primary .ic{{color:{tok('--gw-color-white')}}}
.btn-ghost{{box-shadow:none}}
/* measured: the picker's Cancel label is Neutral/black, not the --t-body Neutral/900 that .btn
   defaults to. Hard-coding that made it black-on-dark once the theme flipped, so it is an alias. */
.dp-cancel{{color:var(--t-btn-ghost)}}
/* measured on BOTH buttons in BOTH frames: the glyph is bound to the same variable as its
   label — Neutral/900 light, Neutral/50 on Sync Now in dark, white on Compare in dark. It was on
   the muted --t-icon, which is the caret's colour, not a button label's. */
.btn .ic{{color:inherit}}
/* measured in exports/dashboard/button.md: Primary hover neutral/850, Outline neutral/35,
   Ghost neutral/50. Dark hover is NOT measured anywhere — --s-btn-hover carries a ruling for it,
   one step off the dark chrome, flagged in the audit. */
.btn:hover:not(.btn-primary){{background:var(--s-btn-hover)}}
.btn-ghost:hover{{background:var(--s-btn-ghost-hover)}}   /* measured light, ruled dark */
.btn-primary:hover{{background:var(--s-btn-primary-hover);
 box-shadow:inset 0 0 0 1px var(--s-btn-primary-hover);color:{tok('--gw-color-white')}}}
.icon-btn:hover:not([disabled]){{background:var(--s-btn-hover)}}
.select:hover{{background:var(--s-btn-hover)}}
.filter-field:hover{{background:var(--s-inset-hover)}}
/* measured 97x36: Compare has a FILL and a stronger stroke; Sync Now has neither.
   light  white fill / Neutral/400 stroke / Neutral/900 label
   dark   Neutral/800 fill / Neutral/600 stroke / white label */
.btn-compare{{font:{tok('--gw-text-button-12')};background:var(--s-compare);
 color:var(--t-compare);box-shadow:inset 0 0 0 1px var(--b-compare)}}
.btn-compare:hover{{background:var(--s-compare-hover);color:var(--t-compare)}}
.select{{height:32px;padding:8px 12px;border-radius:{tok('--gw-radius-8')};
 background:var(--s-card);border:1px solid var(--b-input);
 display:inline-flex;align-items:center;justify-content:space-between;gap:4px;cursor:pointer;
 font:{tok('--gw-text-button-14')};color:var(--t-body);white-space:nowrap}}
.select-sm{{height:28px;padding:8px 8px 8px 12px;font:{tok('--gw-text-button-12')}}}
.select-filter{{background:var(--s-inset);
 border-color:var(--b-strong);color:var(--t-faint);width:200px}}
.icon-btn{{width:28px;height:28px;padding:8px;border-radius:{tok('--gw-radius-8')};
 border:1px solid var(--b-strong);background:none;display:inline-flex;
 align-items:center;justify-content:center;cursor:pointer;color:var(--t-icon)}}
.icon-btn-ghost{{width:24px;height:24px;padding:4px;border-radius:{tok('--gw-radius-4')};
 border-color:transparent}}
.toggle-wrap{{display:inline-flex;align-items:center;gap:8px;cursor:pointer}}
.toggle{{width:38px;height:20px;border-radius:{tok('--gw-radius-40')};
 background:var(--d-track);position:relative;flex:0 0 auto}}
.toggle::after{{content:"";position:absolute;top:2.5px;left:2.5px;width:15px;height:15px;
 border-radius:50%;background:{tok('--gw-color-white')};transition:left .12s}}
/* measured On = Neutral/900 (#262a2e), Off = Neutral/200. It must stay dark in both themes —
   but NOT the same dark: /900 collides with the /900 card in dark mode and the track vanishes,
   leaving a floating knob. Light keeps the measured /900; dark drops to Neutral/black. */
.toggle.is-on{{background:var(--s-toggle-on)}}
.toggle.is-on::after{{left:20.5px}}
.toggle-label{{font:{tok('--gw-text-button-14')};color:var(--t-body)}}
.muted-14{{font:{tok('--gw-text-button-14')};color:var(--t-icon)}}
.chk-wrap{{display:inline-flex;align-items:center;gap:8px;cursor:pointer}}
.chk{{width:24px;height:24px;padding:4px;border-radius:{tok('--gw-radius-8')};
 border:1px solid var(--b-strong);display:inline-flex;align-items:center;
 justify-content:center;color:transparent;flex:0 0 auto}}
.chk.is-on{{background:var(--s-invert);color:var(--t-on-invert)}}
.chk-label{{font:{tok('--gw-text-body-14-med')};letter-spacing:var(--gw-text-body-14-med-tracking);
 color:var(--t-body)}}

/* ── section header + legend ── */
.section-header{{padding:0 8px;display:flex;align-items:center;justify-content:space-between;gap:8px}}
.sh-title{{display:flex;align-items:center;gap:8px}}
.sh-title h2{{font:{tok('--gw-text-body-16-sem')};
 letter-spacing:var(--gw-text-body-16-sem-tracking);color:var(--t-display)}}
.sh-title span{{font:{tok('--gw-text-body-16-reg')};
 letter-spacing:var(--gw-text-body-16-reg-tracking);color:var(--t-muted)}}
.legend{{display:flex;align-items:center;gap:32px}}
.leg-item{{display:inline-flex;align-items:center;gap:4px;font:{tok('--gw-text-body-12-med')};
 letter-spacing:var(--gw-text-body-12-med-tracking);color:var(--t-label)}}
.dot{{width:8px;height:8px;border-radius:20px;flex:0 0 auto}}
.ring{{display:inline-flex;flex:0 0 auto;line-height:0}}
.ring svg{{display:block}}
.dot-green{{background:var(--gw-color-green-400)}}
.dot-yellow{{background:{tok('--gw-color-yellow-400')}}}
.dot-red{{background:{tok('--gw-color-red-400')}}}

/* ── cards ── */
.card{{background:var(--s-card);border:1px solid var(--b-card)}}
.card-lg{{border-radius:{tok('--gw-radius-16')};padding:12px;display:flex;flex-direction:column;gap:12px}}
.card-md{{border-radius:{tok('--gw-radius-12')};padding:12px}}

/* hero */
.hero-body{{padding:20px;display:flex;flex-direction:column;gap:20px}}
.hero-top{{display:flex;flex-direction:column;gap:16px}}
.hero-head{{display:flex;align-items:center;gap:16px}}
.hero-value{{font:var(--dash-display-36-med);color:var(--t-display)}}
.hero-meta{{display:flex;align-items:center;justify-content:space-between;
 font:{tok('--gw-text-body-12-med')};letter-spacing:var(--gw-text-body-12-med-tracking);
 color:var(--t-muted)}}
.inset{{border-radius:{tok('--gw-radius-8')};background:var(--s-inset);
 border:1px solid var(--b-inset);padding:8px;display:flex;flex-direction:column;gap:16px}}
.inset-head{{display:flex;align-items:center;justify-content:space-between;
 font:{tok('--gw-text-body-12-med')};letter-spacing:var(--gw-text-body-12-med-tracking);
 color:var(--t-icon)}}
.inset-rows{{display:flex;align-items:center;gap:32px}}
.inset-row{{display:inline-flex;align-items:center;gap:4px;font:{tok('--gw-text-body-14-med')};
 letter-spacing:var(--gw-text-body-14-med-tracking);color:var(--tone-bad-fg)}}

/* stat + metric cards */
.stat-row{{display:flex;gap:8px}}
.stat-card{{flex:1 1 0;min-width:0}}
.sc-body{{padding:4px;display:flex;flex-direction:column;gap:16px}}
.sc-label{{font:{tok('--gw-text-body-12-med')};letter-spacing:var(--gw-text-body-12-med-tracking);
 color:var(--t-label);text-transform:uppercase;white-space:nowrap;
 overflow:hidden;text-overflow:ellipsis}}
.sc-value-block{{display:flex;flex-direction:column;gap:8px}}
.sc-value-row{{display:flex;align-items:flex-end;justify-content:space-between;gap:8px}}
.sc-value{{display:flex;flex-direction:column;gap:4px;min-width:0}}
/* `>` NOT a descendant selector: this rule leaked onto the compare delta's <b> and
   painted a 12px Inter figure as 28px Vert Grotesk. Same class of bug as the theme
   toggle's glyph — scope component internals to direct children. */
.sc-value>b{{font:var(--dash-display-28-med);color:var(--t-display);font-weight:500}}
.sc-value>span,.sc-pct{{font:{tok('--gw-text-body-12-med')};
 letter-spacing:var(--gw-text-body-12-med-tracking);color:var(--t-muted)}}
.metric-row{{display:flex;gap:8px}}
.metric-card{{flex:1 1 0;min-width:0;padding:16px;min-height:124px}}
.mc-body{{display:flex;flex-direction:column;gap:16px}}
.mc-label{{font:{tok('--gw-text-body-12-med')};letter-spacing:var(--gw-text-body-12-med-tracking);
 color:var(--t-label)}}
.mc-value{{display:flex;flex-direction:column;gap:4px}}
.mc-value>b{{font:var(--dash-display-28-med);color:var(--t-display);font-weight:500}}
.mc-value span{{font:{tok('--gw-text-body-12-med')};
 letter-spacing:var(--gw-text-body-12-med-tracking);color:var(--t-muted)}}
.mc-sub{{display:flex;align-items:center;gap:4px}}

/* ── Compare — CREATED ELEMENT, pending library review. See delta_el() for why. ──
   Hidden until the Compare control is pressed; `.is-comparing` is set on the shell so one
   class reveals every delta at once and the default state stays byte-identical to the
   measured composition. */
.sc-sub{{display:inline-flex;align-items:center;gap:8px;min-width:0}}
.delta{{display:none;align-items:center;gap:4px;font:{tok('--gw-text-body-12-med')};
 letter-spacing:var(--gw-text-body-12-med-tracking);white-space:nowrap}}
.is-comparing .delta{{display:inline-flex}}
.delta.is-up{{color:var(--tone-delta-up)}}
.delta.is-down{{color:var(--tone-delta-down)}}
/* the icon must INHERIT the delta's tone. `.sc-value span` also matches the wrapper that ico()
   emits, and a rule applied directly to that element beats colour inherited from its parent —
   the documented trap that painted the theme-toggle glyph invisible. Scoped explicitly. */
.delta .ic{{color:inherit}}
/* the compare control's own pressed state — measured Outline hover fill, reused because v2
   defines no pressed state for `control Kind=button`. Flagged as a gap, not invented colour. */
.btn-compare[aria-pressed="true"]{{background:var(--s-btn-hover)}}
.cmp-note{{display:none;font:{tok('--gw-text-button-12')};color:var(--t-muted);
 white-space:nowrap}}
.is-comparing .cmp-note{{display:inline-flex;align-items:center}}

/* progress + badge */
.progress{{display:block;width:100%;border-radius:{tok('--gw-radius-40')};
 background:var(--d-track);overflow:hidden}}
.progress-md{{height:4px}} .progress-sm{{height:2px}}
.progress-fill{{display:block;height:100%;border-radius:{tok('--gw-radius-40')}}}
.fill-green{{background:var(--d-good)}}
.fill-red{{background:var(--d-bad)}}
.badge{{display:inline-flex;align-items:center;gap:4px;white-space:nowrap}}
.badge-sm{{padding:4px 8px;border-radius:{tok('--gw-radius-4')};
 font:{tok('--gw-text-button-12')}}}
.badge-md{{padding:4px 12px;border-radius:{tok('--gw-radius-8')};
 font:{tok('--gw-text-body-12-sem')};letter-spacing:var(--gw-text-body-12-sem-tracking)}}
.badge-red{{background:var(--tone-bad-bg);color:var(--tone-bad-fg)}}
.badge-md.badge-red{{background:var(--tone-bad-bg-md)}}
.badge-green{{background:var(--tone-good-bg);color:var(--tone-good-fg)}}
.badge-yellow{{background:var(--tone-warn-bg);color:var(--tone-warn-fg)}}

/* ── panels + tables ── */
.panel-toolbar{{padding:12px;display:flex;align-items:center;justify-content:space-between;gap:16px}}
.panel-toolbar-titled{{align-items:center}}
.pt-left{{display:flex;align-items:center;gap:32px}}
.pt-right{{display:flex;align-items:center;gap:8px}}
/* measured `Frame 2147260224` 439x22 — AL:HORIZONTAL gap 12, so the count sits beside the
   title, not under it. Title 22, count 12 at Neutral/500. */
.pt-title{{display:flex;flex-direction:row;align-items:baseline;gap:12px}}
.pt-title h3{{font:var(--dash-display-22-med);color:var(--t-display)}}
.pt-title span{{font:{tok('--gw-text-body-12-med')};
 letter-spacing:var(--gw-text-body-12-med-tracking);color:var(--t-muted)}}
.grid-wrap{{border-radius:{tok('--gw-radius-8')};border:1px solid var(--b-card);
 overflow:hidden}}
.trow{{padding:0 24px;min-height:56px;display:flex;align-items:center;gap:32px;
 background:var(--s-row);border-bottom:1px solid var(--b-divider)}}
.trow:hover:not(.trow-head):not(.trow-total){{background:var(--s-row-hover)}}
.trow-head{{min-height:44px;background:var(--s-row-head);
 border-bottom:1px solid var(--b-card);text-transform:uppercase}}
.trow-head .tc{{font:{tok('--gw-text-body-12-med')};
 letter-spacing:var(--gw-text-body-12-med-tracking);color:var(--t-label);
 gap:4px;align-items:center}}
.trow-head .ic{{color:var(--t-icon)}}
.trow-total{{border-bottom:0;border-top:1px solid var(--b-card)}}
.trow-total .tc-chan{{text-transform:uppercase}}   /* per-node textCase, not the whole row */
.trow:last-child{{border-bottom:0}}
.tc{{display:flex;min-width:0;font:{tok('--gw-text-body-12-med')};
 letter-spacing:var(--gw-text-body-12-med-tracking);color:var(--t-icon);
 align-items:center;gap:4px}}
.tc-chan{{width:110px;flex:0 0 110px;color:var(--t-display)}}
.tc-strong{{color:var(--t-display)}}
.tc-ink{{color:var(--t-body)}}
.tc-pair{{gap:8px}}
.tdiv{{width:1px;align-self:stretch;background:var(--b-divider);flex:0 0 auto}}
.trow-head .tdiv{{background:var(--b-card)}}
.tcells{{flex:1 1 auto;min-width:0;display:flex;gap:32px;align-items:center}}
.tcells>.tc{{flex:1 1 0}}
.tcells-trail{{flex:0 0 260px}}
.tcells-trail .tc{{white-space:nowrap}}
.tcells-trail .tc:first-child{{flex:1.6 1 0}}
.tc-metric{{flex-direction:column;align-items:flex-start;gap:4px}}
.tc-metric b{{font:{tok('--gw-text-body-14-med')};
 letter-spacing:var(--gw-text-body-14-med-tracking);color:var(--t-icon);
 font-weight:500}}
/* measured: FRAME 20x20, AL:H gap 2 padding 4, r4, primary/alpha-10. It HUGS — 12px glyph
   plus 4px each side is the 20. Written as the padding, not as a magic 20. */
.chan-badge{{border-radius:{tok('--gw-radius-4')};padding:4px;gap:2px;
 background:{tok('--gw-color-primary-alpha-10')};display:inline-flex;align-items:center;
 justify-content:center;color:{tok('--gw-color-primary-500')};flex:0 0 auto}}
/* CORRECTED for table-row v1.40.0 (BREAKING) — build-rules.md. "Leave the first column
   unsized" holds ONLY in a SHARED grid. Every .trow here is its OWN grid container, so an
   `auto` first track resolves against THAT row's content and each row lands on a different
   column boundary. Measured on the v1.39.0 build: 21.5px between the header row and its own
   data rows (`DATE` renders 46.5, the dates 25–27.9), and 2.9px row to row. A `1fr` track is
   `minmax(auto,1fr)` — its auto MINIMUM is content-derived too, which is the long-string case
   the rule calls out — so every non-first track carries an explicit px floor.
   CHOSEN, not measured (tier 3): the 56px first track and the per-column floors. The binding
   constraint is the widest first-column content, the 46.5px uppercase `DATE` header; 56 clears
   it on an 8-multiple. Floors are set below the rendered widths so they bind only under
   compression. Verified by asserting 0px drift between rows, not by looking. */
.trow-daily{{display:grid;grid-template-columns:56px repeat(4,minmax(96px,1fr));gap:32px}}
.trow-onb{{display:grid;grid-template-columns:56px minmax(120px,2fr) minmax(96px,1.4fr) minmax(72px,1fr) minmax(64px,.8fr) minmax(72px,1fr) minmax(88px,1.2fr);gap:32px}}
.pagination{{padding:12px;display:flex;align-items:center;justify-content:space-between;gap:16px}}
.pg-left,.pg-right{{display:flex;align-items:center;gap:8px}}

/* ── charts — NEW elements, no library equivalent. Declared, pending review. ── */
.is-hidden{{display:none !important}}
.chart-row{{display:flex;gap:8px}}
.chart-row>*{{flex:1 1 0;min-width:0}}
.panel{{border-radius:{tok('--gw-radius-8')};border:1px solid var(--b-card);
 padding:25px;display:flex;flex-direction:column;gap:32px}}
.panel-controls{{padding:12px;display:flex;align-items:center;justify-content:space-between;gap:16px}}
.pc-left{{display:flex;align-items:center;gap:16px}}
.pc-right{{display:flex;align-items:center;gap:8px}}
.panel-head{{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}}
.ch-title{{font:var(--dash-display-22-med);color:var(--t-display)}}
.ch-readout{{display:flex;align-items:center;gap:12px;flex:0 0 auto}}
.ch-readout>span{{font:{tok('--gw-text-button-12')};color:var(--t-label);
 white-space:nowrap}}
.gauge{{position:relative;width:40px;height:40px;display:inline-flex;align-items:center;
 justify-content:center;flex:0 0 auto}}
.gauge svg{{position:absolute;inset:0}}
.gauge b{{font:{tok('--gw-text-button-10')};color:var(--t-muted);
 position:relative}}
.gauge-track{{fill:none;stroke:var(--b-card);stroke-width:3}}
.gauge-fill{{fill:none;stroke-width:3;stroke-linecap:round}}
.gauge-red{{stroke:{tok('--gw-color-red-500')}}}
.gauge-green{{stroke:{tok('--gw-color-green-500')}}}
.ch-body{{display:flex;gap:12px;align-items:stretch;min-height:0}}
.ch-yaxis{{flex:0 0 auto;display:flex;flex-direction:column;justify-content:space-between;
 align-items:flex-end;font:{tok('--gw-text-button-12')};color:var(--t-label);
 border-right:1px solid var(--t-body);padding-right:8px}}
.ch-plot{{flex:1 1 auto;min-width:0;position:relative;height:248px}}
.ch-svg{{display:block;width:100%;height:100%}}
/* preserveAspectRatio=none scales the viewBox non-uniformly, which was also scaling the
   stroke widths — the 2px target line rendered under 1px. non-scaling-stroke pins them. */
.ch-grid{{stroke:var(--b-card);stroke-width:1;stroke-dasharray:4 4;
 vector-effect:non-scaling-stroke}}  /* measured dash 4/4 */
.ch-actual{{fill:none;stroke:{tok('--gw-color-primary-500')};stroke-width:2;
 vector-effect:non-scaling-stroke}}
.ch-target{{fill:none;stroke:var(--d-track);stroke-width:2;stroke-dasharray:12 4;vector-effect:non-scaling-stroke;  /* measured */
 vector-effect:non-scaling-stroke}}
/* measured 236:32502 — the plot has TWELVE line nodes and every one is a dashed Neutral/100
   gridline (0.75, dash 4/4) plus the dashed Neutral/200 target vector (2, dash 12/4). There is
   NO solid vertical rule; the "today marker" was mine and is gone. The two 5x5 marker ellipses
   are not reproduced either — see the note by the curve constants. */
/* FIX-4: measured as a hover readout, not a permanent label — Figma draws tooltips in their
   shown state because a static frame has no other way to show them. */
.ch-plot{{cursor:crosshair}}
.ch-cursor{{position:absolute;top:0;bottom:0;width:1px;background:var(--d-series);opacity:0;
 transition:opacity .12s ease;pointer-events:none}}
.ch-cursor-dot{{position:absolute;left:-3.5px;width:8px;height:8px;border-radius:20px;
 margin-top:-4px;background:var(--d-series);
 box-shadow:0 0 0 2px var(--s-card)}}
.ch-plot:hover .ch-cursor,.ch-plot:focus-visible .ch-cursor{{opacity:1}}
.ch-tip{{opacity:0;visibility:hidden;transition:opacity .12s ease}}
.ch-tip.is-on{{opacity:1;visibility:visible}}
.ch-tip{{position:absolute;top:18%;transform:translateX(6px);background:var(--s-menu);
 border:1px solid var(--b-card);border-radius:{tok('--gw-radius-8')};
 padding:8px 12px;display:flex;flex-direction:column;gap:6px;box-shadow:0 2px 4px #1b1c1d0a;
 pointer-events:none}}
.tip-date{{font:{tok('--gw-text-button-10')};color:var(--t-muted)}}
.tip-row{{display:flex;align-items:center;justify-content:space-between;gap:24px;
 font:{tok('--gw-text-button-10')};color:var(--t-display)}}
.tip-row i{{font-style:normal;color:var(--t-display)}}
.tip-red{{color:var(--tone-bad-fg)}}
.tip-green{{color:var(--tone-good-fg)}}
.ch-xaxis{{display:flex;justify-content:space-around;padding-left:40px;
 font:{tok('--gw-text-button-12')};color:var(--t-label)}}
/* ══ INTERACTIVE PASS ══ everything below is behaviour the frames imply but do not draw.
   Values reuse measured tokens; anything with no measured source is marked. */
.shell,.topbar,.sidebar,.card,.trow,.select,.icon-btn,.tab-item,.nav-item,.menu,.tip{{
 transition:background-color .12s,border-color .12s,color .12s}}
/* sortable header */
.trow-head .tc[data-sort-key]{{cursor:pointer;user-select:none}}
.trow-head .tc[data-sort-key]:hover{{color:var(--t-body)}}
.trow-head .tc[aria-sort]:not([aria-sort="none"]){{color:var(--t-body)}}
.sort-ic{{opacity:.55}}
.tc[aria-sort]:not([aria-sort="none"]) .sort-ic{{opacity:1;color:var(--t-body)}}
/* dropdown menu — measured spec, controls.md: menu is WIDER than its trigger, right-aligned,
   neutral/50 border, options button-12, option hover neutral/50, NO selected checkmark */
.select-wrap{{position:relative;display:inline-flex}}
.menu{{position:absolute;top:calc(100% + 4px);right:0;min-width:160px;z-index:40;
 background:var(--s-menu);border:1px solid var(--b-menu);border-radius:{tok('--gw-radius-8')};
 padding:4px;display:none;flex-direction:column;gap:4px;box-shadow:0 2px 4px #1b1c1d0a}}
.menu.is-open{{display:flex}}
.menu-item{{padding:8px 12px;border-radius:{tok('--gw-radius-4')};font:{tok('--gw-text-button-12')};
 color:var(--t-body);cursor:pointer;white-space:nowrap;background:none;border:0;text-align:left}}
.menu-item:hover,.menu-item.is-focus{{background:var(--s-menu-hover)}}
.select[aria-expanded="true"]{{border-color:var(--t-body)}}
/* live filter field */
 /* measured 236:33091 — FRAME 200x32, AL:H p:8/12, r8, 1px CENTER stroke, ONE child: a TEXT
    at Button/button-14-med, layoutSizingH FILL (so 176 wide), textTruncation ENDING, maxLines 1.
    No icon and no caret — those were mine, and they are what cut the text short.
    The stroke is CENTER-aligned in Figma, so it does not eat content width. A CSS border would
    (200 - 24 - 2 = 174), so it is an inset shadow instead — same trick as the chrome borders.
    NOTE: the placeholder's natural width is 186px in a 176px box, so Figma ELLIPSISES it too
    (verified by cloning the node and letting it hug). Reproduced, not silently widened. */
/* Figma draws this 200 wide and lets textTruncation:ENDING clip the placeholder at 176 —
   its natural width is 186. Your call overrides that: 212 gives the string its full 186 plus the
   measured 12/12 padding. The ellipsis stays as a backstop for longer typed values. */
.filter-field{{width:212px;border:0;box-shadow:inset 0 0 0 1px var(--b-strong)}}
.filter-field input{{all:unset;flex:1;min-width:0;font:{tok('--gw-text-button-14')};
 color:var(--t-body);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}}
.filter-field input::placeholder{{color:var(--t-faint);
 overflow:hidden;text-overflow:ellipsis}}
/* pagination disabled — measured Outline-disabled treatment from button.md: label drops to
   neutral/250. No disabled arrow is drawn in the frame; this is the nearest measured value. */
.icon-btn[disabled]{{cursor:default;color:var(--t-disabled);border-color:var(--b-divider)}}
/* collapsed sidebar — the measured 64px state */
.sidebar.is-collapsed{{width:64px}}
.sidebar.is-collapsed .nav-label,.sidebar.is-collapsed .nav-item span:not(.ic),
.sidebar.is-collapsed .uc-meta{{display:none}}
.sidebar.is-collapsed .nav-groups{{padding:8px;align-items:center}}
.sidebar.is-collapsed .nav-item{{width:32px;justify-content:center;padding:8px}}
.sidebar.is-collapsed .sb-footer{{padding:20px 8px 32px;display:flex;justify-content:center}}
.sidebar.is-collapsed .sb-collapse{{justify-content:center}}
/* collapsed the card turns into a column: avatar on top, sign-out under it. The 32px height
   is the expanded row's; stacked it has to hug. */
.sidebar.is-collapsed .user-card{{height:auto;flex-direction:column;
 justify-content:center;align-items:center;gap:8px}}
/* tooltip */
.tip{{position:fixed;z-index:60;max-width:260px;padding:8px 12px;
 border-radius:{tok('--gw-radius-8')};background:var(--s-tip);color:var(--t-tip);
 font:{tok('--gw-text-body-12-med')};letter-spacing:var(--gw-text-body-12-med-tracking);
 pointer-events:none;opacity:0;transition:opacity .1s}}
.tip.is-on{{opacity:1}}
[data-tip]{{cursor:help}}
/* a collapsed nav item is still a link — keep the pointer, not the help cursor */
.nav-item[data-tip],[data-uc-identity][data-tip],[data-signout][data-tip],
.btn[data-tip]{{cursor:pointer}}
.btn[data-tip][disabled]{{cursor:default}}
/* collapsible inset */
.inset.is-closed .inset-rows{{display:none}}
.inset-head button{{transition:transform .12s}}
.inset.is-closed .inset-head button{{transform:rotate(180deg)}}
/* ══ dashboard switcher — measured `dropdown-options` 207x102 (409:11644) ══ */
.tb-title{{position:relative}}
.dash-switch{{position:absolute;top:calc(100% + 4px);left:40px;z-index:40;
 width:207px;padding:4px;display:none;flex-direction:column;gap:4px;
 border-radius:{tok('--gw-radius-8')};background:var(--s-menu);
 /* a real border here, NOT an inset shadow: this frame HUGS in Figma, and an INSIDE stroke
    on a hugging frame consumes content — 207 wide with p:4 gives 197-wide rows, not 199, and
    the frame reports 102 tall for 100 of content. border-box reproduces both. The picker below
    is FIXED size, where the same stroke does not consume, so it uses an inset shadow. */
 border:1px solid var(--b-menu);box-shadow:0 4px 12px #1b1c1d1f}}
.dash-switch.is-open{{display:flex}}
.dash-switch-item{{height:28px;padding:8px;display:flex;align-items:center;gap:8px;
 border-radius:{tok('--gw-radius-4')};cursor:pointer;
 font:{tok('--gw-text-body-12-med')};letter-spacing:var(--gw-text-body-12-med-tracking);
 color:var(--t-body);white-space:nowrap}}
.dash-switch-item:hover{{background:var(--s-btn-hover)}}

/* ══ date-range picker — measured `date-range-dropdown` 560x420 (409:11644) ══ */
.tab-wrap{{position:relative}}
/* the measured 560 (228 + 332 panes) is a DESKTOP width and this panel is absolutely
   positioned, so `100%` would resolve against the trigger, not the viewport. Capped against
   the viewport less the phone padding: exact at every width with room for it, contained at
   375, where it was hanging 201px off-screen. */
.dp{{position:absolute;top:calc(100% + 8px);left:0;z-index:40;width:560px;
 max-width:calc(100vw - 32px);display:none;
 flex-direction:column;border-radius:{tok('--gw-radius-12')};background:var(--s-menu);
 box-shadow:inset 0 0 0 1px var(--b-menu),0 8px 24px #1b1c1d24;overflow:hidden}}
.dp.is-open{{display:flex}}
/* measured `main-content-split` 560x360, AL:H m:MIN c:MIN — the left pane is 360 but the right
   is only 320, sitting at the top with 40 of slack below. Stretching it made the month stack 227
   tall instead of the measured 188. */
.dp-split{{display:flex;align-items:flex-start;height:360px}}
/* no overflow: nine 36px rows + eight 2px gaps + 12/8 padding = exactly the measured 360.
   Figma does draw a 4x69 scrollbar thumb, but in the CALENDAR pane — `calendars-stack` is a
   vertical stack, so their picker scrolls months. This build renders the one measured month
   (JUL 2026), so there is nothing to scroll and no third scroller. */
.dp-presets{{width:228px;flex:none;padding:12px 8px 8px;display:flex;flex-direction:column;gap:2px;
 box-shadow:inset -1px 0 0 var(--b-menu)}}
.dp-preset{{height:36px;padding:8px 16px;display:flex;align-items:center;
 border-radius:{tok('--gw-radius-4')};cursor:pointer;
 font:{tok('--gw-text-button-14')};color:var(--t-body);white-space:nowrap}}
.dp-preset:hover{{background:var(--s-btn-hover)}}
.dp-preset.is-sel{{background:var(--s-chrome)}}   /* measured Neutral/50 */
.dp-cal{{width:332px;height:320px;flex:none;min-height:0;padding:16px;
 display:flex;flex-direction:column;gap:16px}}
.dp-inputs{{display:flex;align-items:center;gap:8px}}
/* measured 136x36 r8, Neutral/25 fill, Neutral/200 stroke, 14px. It is an <input> so the range
   can be typed as well as clicked — border:0 + inset shadow keeps the box on measure. */
.dp-field{{width:136px;height:36px;padding:8px 12px;border:0;
 border-radius:{tok('--gw-radius-8')};background:var(--s-inset);
 box-shadow:inset 0 0 0 1px var(--b-strong);
 font:{tok('--gw-text-button-14')};color:var(--t-body)}}
.dp-field:focus{{outline:none;box-shadow:inset 0 0 0 1px {tok('--gw-color-neutral-400')}}}
.dp-field[aria-invalid="true"]{{box-shadow:inset 0 0 0 1px {tok('--gw-color-red-400')};
 color:{tok('--gw-color-red-500')}}}
.dp-to{{font:{tok('--gw-text-body-12-med')};letter-spacing:var(--gw-text-body-12-med-tracking);
 color:var(--t-faint);font-style:normal}}
/* Seven contiguous columns, not 36px cells with space-between. Figma MERGES consecutive
   in-range cells into one wrapper — row 4 of the measured frame is a single 300-wide fill — which
   is only possible if the band covers the inter-cell space too. space-between left 8px of white
   between every cell and broke the band up. The 36 is Figma's cell box; the band is the column. */
.dp-week{{display:grid;grid-template-columns:repeat(7,1fr);padding:0 2px}}
.dp-wd{{height:16px;display:flex;align-items:center;justify-content:center;
 font:{tok('--gw-text-body-12-med')};letter-spacing:var(--gw-text-body-12-med-tracking);
 color:var(--t-faint)}}
.dp-rule{{display:block;height:1.5px;background:var(--b-menu)}}
/* measured `calendars-stack` 300x188, AL:VERTICAL g:20, inside a 332x320 pane — one month
   fills the viewport and the rest scroll. The frame draws the thumb explicitly:
   `Frame 2147260244` 4x69, r20, #bbbec4, which is Colors/Neutral/300 exactly. */
.dp-stack{{flex:1;min-height:0;display:flex;flex-direction:column;gap:20px;
 overflow-y:auto;overscroll-behavior:contain;
 scrollbar-width:thin;scrollbar-color:{tok('--gw-color-neutral-300')} transparent}}
.dp-stack::-webkit-scrollbar{{width:4px}}
.dp-stack::-webkit-scrollbar-track{{background:none}}
.dp-stack::-webkit-scrollbar-thumb{{background:{tok('--gw-color-neutral-300')};
 border-radius:{tok('--gw-radius-40')}}}
.dp-month{{flex:none;display:flex;flex-direction:column;gap:12px}}
.dp-month-title{{font:{tok('--gw-text-body-12-med')};
 letter-spacing:var(--gw-text-body-12-med-tracking);color:var(--t-muted)}}
.dp-grid{{display:flex;flex-direction:column}}
.dp-row{{height:32px;padding:2px 0;display:grid;grid-template-columns:repeat(7,1fr)}}
.dp-day{{position:relative;height:28px;display:flex;align-items:center;justify-content:center;
 border:0;background:none;cursor:pointer;
 font:{tok('--gw-text-body-12-med')};letter-spacing:var(--gw-text-body-12-med-tracking);
 color:var(--t-body)}}
.dp-day i{{position:relative;z-index:2;font-style:normal}}
.dp-day.is-empty{{cursor:default}}
.dp-day.is-range,.dp-day.is-preview{{background:var(--s-chrome)}}   /* measured Neutral/50 band */
/* half-column bands so the run stays unbroken through the two endpoints */
.dp-day.is-start.has-end::before,.dp-day.is-end::before{{content:"";position:absolute;
 top:0;bottom:0;width:50%;background:var(--s-chrome);z-index:0}}
.dp-day.is-start.has-end::before{{right:0}}
.dp-day.is-end::before{{left:0}}
/* the endpoints are merged into the range wrapper in Figma, so the pill's size is read off the
   rendered frame rather than an isolated node: a 28px black circle with white text. */
.dp-day.is-edge::after{{content:"";position:absolute;top:0;left:50%;width:28px;height:28px;
 transform:translateX(-50%);border-radius:{tok('--gw-radius-40')};
 background:var(--s-invert);z-index:1}}
.dp-day.is-edge{{color:var(--t-on-invert)}}
.dp-day[data-off]:not(.is-edge):hover::after{{content:"";position:absolute;top:0;left:50%;
 width:28px;height:28px;transform:translateX(-50%);
 border-radius:{tok('--gw-radius-40')};background:var(--s-btn-hover);z-index:1}}
.dp-foot{{height:60px;padding:12px 20px;display:flex;align-items:center;justify-content:flex-end;
 gap:8px;box-shadow:inset 0 1px 0 var(--b-menu)}}   /* measured MAX alignment */

/* ══ drift notice ══ Shown to whoever OPENS this dashboard when the components it was built
   from have since changed. Not a design element — it is chrome about the design, so it sits
   above everything and uses the invert surface rather than a card. */
.drift{{position:fixed;left:50%;bottom:24px;transform:translateX(-50%) translateY(8px);z-index:80;
 max-width:640px;display:none;align-items:flex-start;gap:12px;
 padding:12px 16px;border-radius:{tok('--gw-radius-12')};
 background:var(--s-tip);color:var(--t-tip);box-shadow:0 8px 24px #1b1c1d33;
 opacity:0;transition:opacity .18s ease,transform .18s ease}}
.drift.is-on{{display:flex;opacity:1;transform:translateX(-50%) translateY(0)}}
.drift-body{{display:flex;flex-direction:column;gap:4px;min-width:0}}
.drift-title{{font:{tok('--gw-text-body-12-sem')};
 letter-spacing:var(--gw-text-body-12-sem-tracking)}}
.drift-list{{font:{tok('--gw-text-body-12-med')};
 letter-spacing:var(--gw-text-body-12-med-tracking);opacity:.82}}
.drift-dot{{width:8px;height:8px;border-radius:20px;flex:0 0 auto;margin-top:5px;
 background:{tok('--gw-color-yellow-400')}}}
.drift-dot.is-must{{background:{tok('--gw-color-red-400')}}}
.drift-item{{display:block}}
.drift-item b{{font-weight:600}}
.drift-foot{{display:block;margin-top:2px;opacity:.7}}
.drift-foot a{{color:inherit}}
.drift-fallback{{display:none;width:100%;margin-top:8px;padding:8px;resize:vertical;
 border:0;border-radius:{tok('--gw-radius-8')};background:#ffffff14;color:inherit;
 font:{tok('--gw-text-body-12-med')};white-space:pre}}
.drift-actions{{display:flex;flex-direction:column;gap:6px;flex:0 0 auto;align-items:stretch}}
.drift button{{all:unset;cursor:pointer;text-align:center;padding:6px 10px;
 border-radius:{tok('--gw-radius-8')};font:{tok('--gw-text-button-12')};white-space:nowrap}}
.drift .drift-primary{{background:var(--t-tip);color:var(--s-tip)}}
.drift .drift-primary:hover{{opacity:.88}}
.drift [data-drift-dismiss]{{opacity:.7}}
.drift [data-drift-dismiss]:hover{{opacity:1;background:#ffffff1f}}

/* loading screen — measured from frame `lodaing` (236:35282). The chrome stays; only the
   content column is replaced, centred on both axes. Bar is 400x12 r40 with a BLACK fill,
   which is unlike every data bar in the system (2/4px, semantic colour). */
/* ⚠ A STATE IS STILL THE PAGE. `.page` carries the measured 40px side padding, and these
   states REPLACE it — so they must carry it too, or the content runs to the bezel. The
   measured widths below (442 / 400 / 480) are DESKTOP values that flow mode never revisited:
   at 375 the box was 67px wider than the viewport and the title, bar and `40%` were all
   clipped. `max-width:100%` keeps the measured value exact wherever there is room for it —
   which is every width the exactness rule still applies to — and lets it shrink below 1280,
   where R17 says the page flows. Padding is stepped in the regime queries, same as `.page`. */
.loading-page{{display:none;height:100%;align-items:center;justify-content:center;
 padding-inline:40px}}
.loading-page.is-on{{display:flex}}
.load-box{{width:442px;max-width:100%;display:flex;flex-direction:column;align-items:center;
 gap:24px}}
.load-title{{font:var(--dash-display-32-reg);color:var(--t-display);text-align:center}}
.load-row{{display:flex;align-items:center;gap:12px;width:100%;justify-content:center}}
.load-track{{width:400px;height:12px;border-radius:{tok('--gw-radius-40')};
 background:var(--d-track);overflow:hidden;flex:0 1 400px;min-width:0;max-width:100%}}
/* display:block is load-bearing — .load-track is only blockified because .load-row is a flex
   container; its own child is not, so an inline span would ignore width/height entirely. */
.load-fill{{display:block;height:100%;border-radius:{tok('--gw-radius-40')};
 background:var(--s-invert);width:58%;transition:width .3s linear}}
.load-pct{{font:{tok('--gw-text-body-14-med')};
 letter-spacing:var(--gw-text-body-14-med-tracking);color:var(--t-display);min-width:34px}}

/* empty state for nav destinations with no page built — build-rules.md requires this */
.empty-page{{display:none;padding:80px 40px;justify-content:center}}
.empty-page.is-on{{display:flex}}
.page.is-off{{display:none}}
.es{{width:480px;max-width:100%;padding:40px;display:flex;flex-direction:column;
 align-items:center;gap:16px;text-align:center}}
.es-circle{{width:40px;height:40px;border-radius:999px;background:var(--s-chrome);display:flex;
 align-items:center;justify-content:center;color:var(--t-faint)}}
.es h2{{font:{tok('--gw-text-body-16-sem')};letter-spacing:var(--gw-text-body-16-sem-tracking);
 color:var(--t-display)}}
.es p{{margin:0;font:{tok('--gw-text-body-12-med')};
 letter-spacing:var(--gw-text-body-12-med-tracking);color:var(--t-muted)}}
/* Syncing: the ArrowsClockwise glyph turns while the fetch runs. */
.btn.is-syncing{{cursor:default}}
.btn.is-syncing .ic{{animation:spin 1s linear infinite}}
@keyframes spin{{to{{transform:rotate(360deg)}}}}
@media (prefers-reduced-motion:reduce){{*{{transition:none !important}}
 .btn.is-syncing .ic{{animation:none}}}}

/* The RULED token, not a hand-picked colour. This emitted `2px solid primary-500` — right
   geometry, wrong colour, and it bypassed the token entirely, so the reference was teaching the
   deviation. Corrected 26 Aug 2026. */
:focus-visible{{outline:{tok('--gw-focus-ring')};outline-offset:{tok('--gw-focus-offset')}}}

/* Phone-only chrome. Rendered at every width so the JS binds once and never rebinds, but
   revealed only inside the <600 query. Trigger is the measured `controls/tab` 36x36, radius/8,
   1px neutral/200, inner p-4 radius/4, List 16. */
.tb-drawer{{display:none;width:36px;height:36px;padding:4px;
 border-radius:{tok('--gw-radius-8')};border:1px solid var(--b-strong);background:none;
 color:var(--t-body);align-items:center;justify-content:center;cursor:pointer}}
.dock{{display:none}}
.drawer-catch{{display:none}}

/* ═══════════════════════════════════════════════════════════════════════════════════════════
   R17 — RESPONSIVE REGIMES.  DECISIONS.md R17, ruled 26 Aug 2026; phone chrome MEASURED in
   exports/dashboard/v2/phone.md the same day (frames 515:2176 / 515:2307, both 375x720).
   This file was built 15 Aug at v1.39.0, when "1440 is the minimum width, below it SCALE,
   never reflow" was still binding — so it scaled the whole canvas all the way down and painted
   12px table text at 3.13px on a 375 viewport. R17 narrows that rule rather than withdrawing
   it: SCALE to 1280, FLOW below.  Above 1280 nothing here changes the measured composition.
   ═══════════════════════════════════════════════════════════════════════════════════════════ */

/* ── >=2200 — specified in build-rules.md and never built until now. ── */
@media (min-width:2200px){{.page{{padding-inline:clamp(40px,4vw,96px)}}}}
/* build-rules.md also specifies an analytics-grid column change at >=1800 (3->6 at KPI cards=1).
   NOT APPLIED, deliberately: that rule is scoped to `card-layout`, and this screen does not use
   it — its supporting rows are a custom stat-row / metric-row composition that already fills.
   Applying a card-layout rule to a composition it was never measured against would be inventing
   behaviour. Reported as a gap instead. */

/* ── FLOW, 600–1280.  R17: composition is no longer guaranteed below 1280; that is the price
      the ruling knowingly pays so the dashboard works at all on a small screen. ── */
@media (max-width:1279.98px){{
 /* mandatory — R17: drop the 1440 floor "or the page scrolls sideways forever". zoom returns
    to 1 here; layout() in the JS stops scaling at the same 1280 hinge. */
 .shell{{zoom:1;width:100vw;height:100vh;min-width:0}}
 /* The rail is pinned to the measured 64 collapsed state. layout() adds .is-collapsed rather
    than this block restating its values — one measured treatment, not two that can drift. */
 .sb-collapse{{display:none}}          /* it cannot be expanded in this regime — dead control */
 /* Cards change COUNT, never size — build-rules.md. auto-fit derives the count from the
    MEASURED floor: stat-card 217.6 -> 218, metric-card 274. */
 .stat-row,.metric-row{{display:grid;gap:8px}}
 .stat-row{{grid-template-columns:repeat(auto-fit,minmax(218px,1fr))}}
 .metric-row{{grid-template-columns:repeat(auto-fit,minmax(274px,1fr))}}
 .page-title{{font:var(--dash-display-36-med)}}   /* ramp steps DOWN one documented step 44->36 */
 /* the states step WITH the page — they replace it, so they inherit its margins, not zero */
 .page,.loading-page{{padding-inline:24px}}
 .empty-page{{padding:80px 24px}}
}}

/* ── PHONE, <600.  Chrome MEASURED (v2/phone.md); content reflow RULED (R17). ── */
@media (max-width:599.98px){{
 /* topbar — measured 375x60, px-16, and a 1.5px neutral/100 bottom border. 1.5 is the phone
    chrome weight throughout both frames; it is drawn 1:1 at 375, so NOT a scaling artefact. */
 .topbar{{padding:0 16px;box-shadow:inset 0 -1.5px 0 var(--b-chrome)}}
 /* the logo tile is the desktop 32x32 at 62.5% (20/32 = 5/8 = 10/16). Reproduce the DRAWN
    20x20 around a 10px glyph. radius/4 is the nearest real token to the scaled 5 — never a raw
    5px, and never radius/8, which is visibly rounder at this size. */
 .tb-logo{{width:20px;height:20px;border-radius:{tok('--gw-radius-4')}}}
 .tb-logo svg{{width:10px;height:10px}}
 /* a SIXTH display size: Vert Grotesk Semibold 16 matches none of the five documented steps
    (44/36/28/22/20). R15 — literal spec, and it HAS NO TOKEN. */
 .tb-name{{font:600 16px/1 'Vert Grotesk Display'}}
 [data-dash-toggle]{{width:20px;height:20px;padding:4px;
  border-radius:{tok('--gw-radius-4')}}}                       /* measured 20x20 p-4 r4 tile */
 [data-dash-toggle] svg{{width:12px;height:12px}}
 /* measured: the drawer trigger sits ALONE at the far right (x 323 of 375). Sync Now and the
    theme toggle are NOT in the phone topbar — they move to the dock. */
 .tb-actions{{display:none}}
 .tb-drawer{{display:inline-flex}}
 /* sidebar as a DRAWER — measured 515:2343, 240x660 at x135 y60. 135+240 = 375, so it is
    anchored RIGHT, and it starts BELOW the 60px topbar. Left border 1.5px, the mirror of the
    desktop rail's right border at the phone weight. */
 .sidebar{{position:fixed;top:60px;right:0;bottom:0;width:240px;z-index:40;
  transform:translateX(100%);transition:transform {tok('--gw-motion-fast')};
  box-shadow:inset 1.5px 0 0 var(--b-chrome)}}
 .sidebar.is-open{{transform:translateX(0)}}
 /* .is-collapsed is removed by layout() below 600 — the drawer is the full 240, not the rail. */
 .nav-groups{{padding:12px;gap:24px}}                 /* measured 12 on phone; desktop is 20 */
 /* measured: the phone drawer pins Settings/Admin at the bottom and carries NO user-card.
    ⚠ v2/phone.md records that which of the two a phone build should carry is NOT SETTLED —
    this follows the frame. The consequence is that sign-out has no phone affordance. */
 .sb-footer{{display:none}}
 /* ⚠ NO SCRIM. 515:2307 draws none and there is no scrim token in the system. The outside-tap
    target is transparent — never add a dim the design does not have. */
 .drawer-catch{{position:fixed;inset:60px 240px 0 0;z-index:39;display:none;background:none}}
 .sidebar.is-open ~ .drawer-catch{{display:block}}
 /* dock — measured 515:2183, left 20 bottom 20, flex, gap 8, cross-centred. THIS is where the
    theme toggle lives on phone. */
 .dock{{position:fixed;left:20px;bottom:20px;z-index:41;display:flex;align-items:center;gap:8px}}
 /* refresh: list-item 36x36, white, 1px neutral/200, r12, drop-shadow 0 16px 16px #585c5f1a.
    Its label is present but hidden — icon-only. */
 /* ⚠ the measured white is the LIGHT frame's value, and v2/phone.md has no dark phone frame —
    dark dock chrome is DERIVED, not measured. It binds to --s-menu, the alias every other
    floating surface here uses, because an absolute fill does not invert: literal white put a
    light icon on a white tile in dark and made the control invisible. */
 .dock-refresh{{width:36px;height:36px;padding:8px 12px;border-radius:{tok('--gw-radius-12')};
  background:var(--s-menu);border:1px solid var(--b-strong);color:var(--t-body);
  display:inline-flex;align-items:center;justify-content:center;
  filter:drop-shadow(0 16px 16px rgba(88,92,95,0.1))}}
 /* ⚠ the PHONE toggle carries a fill, a border and a shadow; the desktop topbar toggle has
    none of the three. Same component, different treatment by surface — measured, not carried
    across. Shadows/S3 binds exactly. */
 .dock .theme-toggle{{background:var(--s-menu);border:1px solid var(--b-strong);
  box-shadow:{tok('--gw-shadow-s3')}}}
 /* content reflow — RULED, R17, not measured: the frames contain no page content. */
 .page,.loading-page{{padding-inline:16px}}
 /* the dock is position:fixed at bottom 20 and is 36 tall, so the last rows of any scrolled
    section pass UNDERNEATH it. Reserve its height plus both margins as end padding, or the
    final row of every table is permanently covered. */
 .page{{padding-bottom:96px}}
 .empty-page{{padding:80px 16px}}
 .load-title{{font:var(--dash-display-22-med)}}   /* 32 has no room at 375; next step down */
 .page-title{{font:var(--dash-display-28-med)}}   /* second documented step down: 36 -> 28 */
 .stat-row,.metric-row{{grid-template-columns:1fr}}
 /* ⚠ RULED, v2/phone.md: on phone the `section-header` qualifier stacks UNDER the title at
    body-14-reg, gap 4, rather than sitting inline beside it at 16 — the measured inline
    treatment does not fit 375 under a 28px page title. Phone only; inline holds from 600 up. */
 .sh-title{{flex-direction:column;align-items:flex-start;gap:4px}}
 .sh-title span{{font:{tok('--gw-text-body-14-reg')}}}
 /* Every row below is measured as a SINGLE LINE at 1440 and overflows 375. The slot is
    overflow-x:hidden, so an overflowing row is CLIPPED — it hides content rather than showing
    it, which is worse than the overflow. R17 makes content reflow below 600 a build decision;
    these are that decision, and each is CHOSEN, not measured. */
 .ph-row,.section-header{{flex-direction:column;align-items:flex-start;gap:12px}}
 .ph-left{{flex-wrap:wrap;gap:8px}}
 /* the 5 measured tabs total 411px and the pill is a measured 36h — wrapping would break the
    component, so the group scrolls inside its own wrapper and the page still does not. */
 .tab-wrap{{overflow-x:auto;scrollbar-width:none;max-width:100%}}
 .tab-wrap::-webkit-scrollbar{{width:0;height:0}}
 .tab-group{{width:max-content}}
 .legend,.inset-rows{{flex-wrap:wrap;gap:12px}}
 .pt-title{{flex-direction:column;align-items:flex-start;gap:4px}}
 /* the tab strip takes a full row of its own, then scrolls within it; without min-width:0 a
    flex item refuses to shrink below its content and drags .ph-left back over the edge. */
 .ph-left{{width:100%}}
 .tab-wrap{{flex:1 1 100%;min-width:0}}
 /* the card-header action cluster and the pagination bar are both measured single lines that
    do not fit 375. Wrapping keeps every control reachable; the measured components inside are
    untouched — only the row that carries them changes. */
 .pt-head,.pagination{{flex-wrap:wrap;gap:12px}}
 .pt-right,.pc-left,.pc-right,.pg-left,.pg-right{{flex-wrap:wrap;min-width:0}}
 .pt-right .input,.pt-right input{{min-width:0}}
 /* ══ PHONE USABILITY PASS — audited at 375, 1 Sep 2026 ══
    The earlier regime work made the page FIT; it did not make it usable. Auditing at 375 found
    four horizontal scrollers, twelve touch targets under 44px, 10px type, and words breaking
    mid-string. Sideways scroll inside a vertical page is the worst of these: it hides data
    behind a gesture nobody discovers. Everything below removes a scroll axis or a reach
    problem. CHOSEN, not measured — v2/phone.md specifies chrome only, so phone CONTENT is a
    build decision (R17 says so explicitly). */

 /* 1. TABLES STACK. 5, 5 and 7 columns cannot fit 315px of content width — they were 640, 640
    and 808 wide, scrolling sideways and breaking domains mid-word. Each row becomes a labelled
    block: every column visible, no second scroll axis, no truncation. */
 .grid-wrap{{overflow-x:visible}}
 .grid-wrap>*{{min-width:0}}                 /* undoes the 640px floor the scroll fix needed */
 .trow-head{{display:none}}                  /* the labels move onto the cells */
 .trow{{padding:12px 16px}}
 .trow-daily,.trow-onb{{grid-template-columns:1fr;gap:6px;min-height:0}}
 /* break-word, NOT anywhere: `anywhere` breaks mid-token whenever the box is tight, and on a
    squeezed flex item it rendered "681/706" one CHARACTER per line. break-word only breaks a
    word that genuinely cannot fit, which after stacking none of them do. */
 .trow .tc,.tcells>.tc{{display:flex;align-items:baseline;gap:12px;min-width:0;
  white-space:normal;overflow-wrap:break-word}}
 /* margin-right:auto on the label, NOT space-between: with three children (label, value,
    badge) space-between would spread all three and float the badge away from its number. */
 .trow .tc[data-label]::before,.tcells>.tc[data-label]::before{{content:attr(data-label);
  margin-right:auto;flex:0 0 auto;text-transform:uppercase;color:var(--t-label);
  font:{tok('--gw-text-body-12-med')};letter-spacing:var(--gw-text-body-12-med-tracking)}}
 /* the channel table is a different shape — name, divider, then grouped cells */
 /* :not(.trow-head) is load-bearing — a `.trow:has(...)` selector out-specifies the plain
    .trow-head display-none rule, and was putting the hidden header row back on screen.
    (Braces are deliberately absent from this comment: the CSS block is an f-string, so a
    literal brace here is read as an expression and the build dies with a NameError.) */
 .trow:has(.tc-chan):not(.trow-head){{display:flex;flex-direction:column;align-items:stretch;
  gap:6px}}
 .tc-chan{{width:auto;flex:none;font:{tok('--gw-text-body-14-med')}}}
 .tdiv{{display:none}}
 /* align-items must be reset to stretch: the desktop rule centres children for a horizontal
    row, and once this becomes a column that centring shrink-wraps every label/value pair to
    its content and floats it mid-row instead of spanning the width. */
 .tcells,.tcells-trail{{flex:none;width:100%;flex-direction:column;gap:6px;
  align-items:stretch}}
 /* the metric cell carries a value AND a progress bar. Side by side in a stacked row the
    value gets crushed; the bar takes its own full-width line instead. */
 .tc-metric{{flex-direction:row;align-items:center;flex-wrap:wrap;gap:8px}}
 .tc-metric b{{flex:0 0 auto;white-space:nowrap}}
 .tc-metric .progress{{flex:1 1 100%}}
 .trow-total{{flex-wrap:wrap}}

 /* 2. TOGGLES WRAP instead of scrolling. Five measured tabs total 411px; wrapping to two rows
    keeps every option visible at once, which a scroller does not. */
 .tab-wrap{{overflow-x:visible;flex:1 1 100%}}
 /* height:auto is REQUIRED, not cosmetic: the measured 36 is a fixed height, so the wrapped
    second row overflowed the box and painted on top of the period pill below it. The measured
    value survives as the floor. */
 .tab-group{{width:auto;flex-wrap:wrap;height:auto;min-height:36px}}
 .dp-presets{{flex-wrap:wrap;overflow-x:visible}}

 /* 3. TOUCH TARGETS. 44px is the platform floor; the measured desktop rows are 32 and the
    drawer trigger 36. ⚠ DELIBERATE DEVIATION from v2/phone.md — a target you cannot reliably
    hit is not a faithful reproduction of anything. Visual size is preserved where it matters;
    the extra area is padding. */
 .nav-item{{height:44px}}                       /* desktop list-item is 32 */
 [data-dash-toggle]{{width:44px;height:44px;padding:12px}}   /* 20px glyph, 44px hit area */
 .icon-btn{{min-width:44px;min-height:44px}}
 .sb-collapse .icon-btn{{min-width:0;min-height:0}}          /* hidden here anyway */
 .select{{height:44px}} .select-sm{{height:40px}}
 .tab-item{{height:40px}}                       /* desktop tab-item is 28 */
 /* ⚠ NOT raised: `.tb-drawer` (36) and the dock's refresh and toggle (36) are measured on the
    PHONE frames in v2/phone.md — the designer chose those sizes for touch, so they are not a
    desktop value leaking in. They sit under the 44px platform floor, which is a FINDING for
    the design system to rule on, not something to silently override here. */

 /* 4. TYPE FLOOR. 10px is unreadable at arm's length; the ramp's next step up is 12. */
 .ph-period,.tip-date,.tip-red,.tip-green{{font:{tok('--gw-text-body-12-med')};
  letter-spacing:var(--gw-text-body-12-med-tracking)}}

 /* 5. the two column-group checkboxes were sharing a 185px nowrap row, so "Demos & Show-ups"
    broke across lines inside a 47px box. */
 .pt-left{{flex-wrap:wrap;gap:12px}}
 .chk-wrap{{flex:none}}
 .chk-label{{white-space:nowrap}}

 /* the date-range panel is a measured 228 + 332 row and neither pane shrinks (both flex:none),
    so capping the panel alone left its children hanging off-screen. On phone the two panes
    STACK, and the presets become a horizontal chip row — that keeps every preset reachable
    (dropping them would be a control lost, not a control reflowed) and costs one row of height
    instead of 360. overflow-x, deliberately: a fourth overflow-y would break the measured
    three-scroller invariant that build-rules.md and this file's own assertion protect. */
 .dp-split{{flex-direction:column;height:auto}}
 .dp-presets{{width:100%;flex-direction:row;overflow-x:auto;scrollbar-width:none;
  padding:8px;gap:4px;box-shadow:inset 0 -1px 0 var(--b-menu)}}
 .dp-presets::-webkit-scrollbar{{width:0;height:0}}
 .dp-preset{{flex:none;white-space:nowrap}}
 .dp-cal{{width:100%}}
 /* the two 136px fields plus the `to` label overrun 343 — they share the row instead */
 .dp-field{{width:auto;flex:1 1 0;min-width:0}}

}}
"""


# ── PASS-3 controller ──────────────────────────────────────────────────────────────────
# Icon markup is precomputed here so the JS never hand-builds SVG.
import json as _json
SORT_ICONS = {
    "none": ico("arrows-down-up", "bold", 12),
    "asc": ico("arrow-up", "bold", 12),
    "desc": ico("arrow-down", "bold", 12),
}
CHEVRONS = {
    "expanded": ico("caret-double-left", "bold", 12),
    "collapsed": ico("caret-double-right", "bold", 12),
}
JS = r"""
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var SORT_ICONS = __SORT__, CHEVRONS = __CHEV__;

  /* R17 (DECISIONS.md, 26 Aug 2026) — the 1440 canvas scales only down to the 1280 hinge;
     below it the page FLOWS at zoom 1. Above 1280 this is the original ruled behaviour,
     unchanged. Guard the zero viewport: a tab that has not been laid out reports 0, which
     would collapse the shell to nothing. */
  var DESIGN_W = 1440, FLOW_W = 1280, PHONE_W = 600;
  var userCollapsed = false;      /* the user's OWN rail choice — only meaningful at >=1280 */

  function closeDrawer() {
    var el = $('.sidebar'), t = $('[data-drawer-toggle]');
    if (el) el.classList.remove('is-open');
    if (t) { t.setAttribute('aria-expanded', 'false'); t.setAttribute('aria-label', 'Open menu'); }
  }
  function openDrawer() {
    var el = $('.sidebar'), t = $('[data-drawer-toggle]');
    if (el) el.classList.add('is-open');
    if (t) { t.setAttribute('aria-expanded', 'true'); t.setAttribute('aria-label', 'Close menu'); }
  }

  function layout() {
    var w = window.innerWidth || DESIGN_W;
    document.documentElement.style.setProperty('--fit',
      w >= FLOW_W ? Math.min(1, w / DESIGN_W) : 1);
    var el = $('.sidebar');
    if (el) {
      /* 600-1280 pins the rail to the MEASURED 64 collapsed state by reusing .is-collapsed,
         so there is one measured treatment rather than two that can drift apart. Below 600
         the rail is not a rail at all — it is the full 240 drawer — so the class comes off. */
      if (w >= FLOW_W)       el.classList.toggle('is-collapsed', userCollapsed);
      else if (w >= PHONE_W) el.classList.add('is-collapsed');
      else                   el.classList.remove('is-collapsed');
    }
    if (w >= PHONE_W) closeDrawer();   /* leaving phone must not strand an open drawer */
  }
  layout();
  window.addEventListener('resize', layout);

  var drawerBtn = $('[data-drawer-toggle]');
  if (drawerBtn) drawerBtn.addEventListener('click', function () {
    var el = $('.sidebar');
    if (el && el.classList.contains('is-open')) closeDrawer(); else openDrawer();
  });
  var drawerCatch = $('[data-drawer-close]');
  if (drawerCatch) drawerCatch.addEventListener('click', closeDrawer);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' || e.key === 'Esc') closeDrawer();
  });
  /* choosing a destination closes the drawer — otherwise the page renders behind it */
  $$('.sidebar .nav-item').forEach(function (n) { n.addEventListener('click', closeDrawer); });

  /* the dock refresh DELEGATES to the wired Sync Now control instead of carrying a second
     copy of its handler. Resolved at click time, so binding order does not matter. */
  /* Compare — RULED 1 Sep 2026: a drawn affordance must work or not ship. This button was
     drawn in the frame and bound to nothing. One class on the shell reveals every delta, so the
     DEFAULT state remains exactly the measured composition and compare is a state on top of it. */
  var cmpBtn = $('[data-compare]');
  if (cmpBtn) cmpBtn.addEventListener('click', function () {
    var on = $('.shell').classList.toggle('is-comparing');
    cmpBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
  });

  var dockSync = $('[data-dock-sync]');
  if (dockSync) dockSync.addEventListener('click', function () {
    var b = $('[data-sync]');
    if (b) b.click();
  });

  /* theme — a measured token swap, not a filter. Persisted so a reload keeps it. */
  function setTheme(mode) {
    document.documentElement.setAttribute('data-theme', mode);
    $$('[data-theme-set]').forEach(function (b) {
      var on = b.getAttribute('data-theme-set') === mode;
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    try { localStorage.setItem('gw-theme', mode); } catch (e) {}
  }
  var stored = null;
  try { stored = localStorage.getItem('gw-theme'); } catch (e) {}
  setTheme(stored === 'dark' ? 'dark' : 'light');
  $$('[data-theme-set]').forEach(function (b) {
    function go() { setTheme(b.getAttribute('data-theme-set')); }
    b.addEventListener('click', go);
    b.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); }
    });
  });

  /* sidebar collapse — the measured 64px state */
  var collapseBtn = $('[data-collapse]');
  /* Collapsed, the rail shows icons only, so the label has to come back as a tooltip. Expanded,
     the label is right there — a tooltip would just repeat it, so the attribute is removed. */
  function railTips(collapsed) {
    var targets = $$('.nav-item').map(function (n) {
      return [n, n.getAttribute('data-nav')];
    });
    /* the avatar loses its name when the rail collapses, so the name becomes the tooltip */
    var ident = $('[data-uc-identity]');
    if (ident) targets.push([ident, $('.uc-name').textContent.trim()]);
    /* and the sign-out button is icon-only either way — it has never had a visible label */
    var out = $('[data-signout]');
    if (out) targets.push([out, out.getAttribute('aria-label')]);
    targets.forEach(function (pair) {
      var el = pair[0];
      if (collapsed) {
        el.setAttribute('data-tip', pair[1]);
        el.setAttribute('data-tip-place', 'right');
      } else {
        el.removeAttribute('data-tip');
        el.removeAttribute('data-tip-place');
      }
    });
  }
  if (collapseBtn) collapseBtn.addEventListener('click', function () {
    var sb = $('.sidebar');
    var collapsed = sb.classList.toggle('is-collapsed');
    userCollapsed = collapsed;   /* remembered across a flow-mode round trip */
    collapseBtn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
    collapseBtn.setAttribute('aria-label', collapsed ? 'Expand sidebar' : 'Collapse sidebar');
    collapseBtn.innerHTML = collapsed ? CHEVRONS.collapsed : CHEVRONS.expanded;
    railTips(collapsed);
    hideTip();
  });

  /* generic tab groups */
  $$('.tab-group').forEach(function (g) {
    g.addEventListener('click', function (e) {
      var tb = e.target.closest('.tab-item');
      if (!tb || !g.contains(tb)) return;
      $$('.tab-item', g).forEach(function (i) { i.classList.remove('is-active'); });
      tb.classList.add('is-active');
    });
  });

  /* Channel Breakdown column groups — ONE table, two states */
  /* The two column groups are a pair, and at least one must stay on — with both off the table
     collapses to a single channel column and shows no data at all. Unchecking the last one checks
     the other instead of leaving nothing. */
  function applyColGroup(l, on) {
    var group = l.getAttribute('data-toggles');
    $('.chk', l).classList.toggle('is-on', on);
    l.setAttribute('aria-checked', on ? 'true' : 'false');
    $$('[data-col-group="' + group + '"]', l.closest('.card')).forEach(function (el) {
      el.classList.toggle('is-hidden', !on);
    });
  }
  $$('.chk-wrap[data-toggles]').forEach(function (l) {
    l.setAttribute('role', 'checkbox');
    l.setAttribute('aria-checked', $('.chk', l).classList.contains('is-on') ? 'true' : 'false');
    l.addEventListener('click', function () {
      var card = l.closest('.card');
      var peers = $$('.chk-wrap[data-toggles]', card);
      var on = !$('.chk', l).classList.contains('is-on');
      if (!on) {
        var others = peers.filter(function (o) {
          return o !== l && $('.chk', o).classList.contains('is-on');
        });
        /* last one being unchecked — hand the check to its pair rather than leaving none */
        if (!others.length) {
          peers.forEach(function (o) { if (o !== l) applyColGroup(o, true); });
        }
      }
      applyColGroup(l, on);
    });
  });

  /* Actual vs Target — ONE section, two states */
  $$('[data-toggles-both]').forEach(function (l) {
    var card = l.closest('.card');
    function render(want) {
      var both = $('.toggle', l).classList.contains('is-on');
      if (!want) {
        var a = $('[data-chart-tabs] .tab-item.is-active', card);
        want = a ? a.getAttribute('data-chart') : 'demos';
      }
      $$('[data-chart-panel]', card).forEach(function (p) {
        p.classList.toggle('is-hidden', !both && p.getAttribute('data-chart-panel') !== want);
      });
      $('.toggle', l).setAttribute('aria-checked', both ? 'true' : 'false');
    }
    l.addEventListener('click', function () { $('.toggle', l).classList.toggle('is-on'); render(); });
    var tabs = $('[data-chart-tabs]', card);
    if (tabs) tabs.addEventListener('click', function (e) {
      var tb = e.target.closest('.tab-item');
      if (tb) render(tb.getAttribute('data-chart'));
    });
  });

  /* dropdown menus — measured spec: menu wider than its trigger, right-aligned, and NO
     selected checkmark (an earlier ruling invented one). Escape closes, arrows move. */
  function closeAll(except) {
    $$('.menu.is-open').forEach(function (m) {
      if (m === except) return;
      m.classList.remove('is-open');
      var trig = m.parentNode.querySelector('.select');
      if (trig) trig.setAttribute('aria-expanded', 'false');
    });
  }
  document.addEventListener('click', function (e) {
    if (!e.target.closest('.select-wrap')) closeAll();
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeAll(); });

  $$('.select-wrap').forEach(function (wrap) {
    var trig = $('.select', wrap), menu = $('.menu', wrap);
    if (!trig || !menu) return;
    trig.addEventListener('click', function (e) {
      e.stopPropagation();
      var open = menu.classList.contains('is-open');
      closeAll();
      if (!open) { menu.classList.add('is-open'); trig.setAttribute('aria-expanded', 'true'); }
    });
    menu.addEventListener('click', function (e) {
      var it = e.target.closest('.menu-item');
      if (!it) return;
      $('.select-label', trig).textContent = it.getAttribute('data-value');
      closeAll();
      wrap.dispatchEvent(new CustomEvent('gw:select', {
        bubbles: true,
        detail: { value: it.getAttribute('data-value'), sortKey: it.getAttribute('data-sort-key') }
      }));
    });
    trig.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        menu.classList.add('is-open'); trig.setAttribute('aria-expanded', 'true');
        var f = $('.menu-item', menu); if (f) f.focus();
      }
    });
    menu.addEventListener('keydown', function (e) {
      var items = $$('.menu-item', menu), i = items.indexOf(document.activeElement);
      if (e.key === 'ArrowDown') { e.preventDefault(); (items[i + 1] || items[0]).focus(); }
      if (e.key === 'ArrowUp') { e.preventDefault(); (items[i - 1] || items[items.length - 1]).focus(); }
      if (e.key === 'Escape') { closeAll(); trig.focus(); }
    });
  });

  /* table controller: filter -> sort -> page, in one object per card. Wiring the three
     independently is what makes them fight (a sort that forgets the filter, a page that
     forgets the sort). */
  function num(v) {
    if (v == null) return null;
    var s = String(v).replace(/[$,\s]/g, '');
    var m = s.match(/^-?\d*\.?\d+/);
    return m ? parseFloat(m[0]) : null;
  }
  function keyOf(row, idx) {
    var c = $$('[data-sort]', row)[idx];
    if (!c) return '';
    var raw = c.getAttribute('data-sort');
    var n = num(raw);
    return n === null ? String(raw).toLowerCase() : n;
  }

  $$('.grid-wrap').forEach(function (grid) {
    var card = grid.closest('.card');
    var pg = card ? $('.pagination', card) : null;
    var head = $('.trow-head', grid);
    var rows = $$('[data-row]', grid);
    var totalRow = $('.trow-total', grid);            /* pinned to the bottom, never sorted */
    var st = { key: null, dir: 0, q: '', page: 1, size: pg ? 10 : rows.length };

    function render() {
      var live = rows.filter(function (r) {
        if (!st.q) return true;
        var hay = (r.getAttribute('data-text') || r.textContent).toLowerCase();
        return hay.indexOf(st.q) > -1;
      });
      if (st.key !== null && st.dir !== 0) {
        live = live.slice().sort(function (a, b) {
          var x = keyOf(a, st.key), y = keyOf(b, st.key);
          if (x < y) return -st.dir;
          if (x > y) return st.dir;
          return 0;
        });
      }
      var pages = Math.max(1, Math.ceil(live.length / st.size));
      if (st.page > pages) st.page = pages;
      var from = (st.page - 1) * st.size;

      rows.forEach(function (r) { r.classList.add('is-hidden'); });
      live.slice(from, from + st.size).forEach(function (r) {
        r.classList.remove('is-hidden');
        grid.appendChild(r);
      });
      if (totalRow) grid.appendChild(totalRow);

      if (pg) {
        $('.pg-status', pg).textContent = 'Page ' + st.page + ' of ' + pages;
        $('[data-page="prev"]', pg).disabled = st.page <= 1;
        $('[data-page="next"]', pg).disabled = st.page >= pages;
      }
      if (head) $$('[data-sort-key]', head).forEach(function (h) {
        var active = String(st.key) === h.getAttribute('data-sort-key') && st.dir !== 0;
        var mode = !active ? 'none' : (st.dir === 1 ? 'asc' : 'desc');
        h.setAttribute('aria-sort', mode === 'none' ? 'none'
          : (mode === 'asc' ? 'ascending' : 'descending'));
        var ic = $('.sort-ic', h);
        if (ic) ic.innerHTML = SORT_ICONS[mode];
      });
    }

    function sortBy(k) {
      k = parseInt(k, 10);
      if (st.key === k) st.dir = st.dir === 1 ? -1 : (st.dir === -1 ? 0 : 1);
      else { st.key = k; st.dir = 1; }
      if (st.dir === 0) st.key = null;
      st.page = 1;
      render();
    }

    if (head) {
      head.addEventListener('click', function (e) {
        var h = e.target.closest('[data-sort-key]');
        if (h) sortBy(h.getAttribute('data-sort-key'));
      });
      head.addEventListener('keydown', function (e) {
        var h = e.target.closest('[data-sort-key]');
        if (h && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault(); sortBy(h.getAttribute('data-sort-key'));
        }
      });
    }
    if (pg) pg.addEventListener('click', function (e) {
      var b = e.target.closest('[data-page]');
      if (!b || b.disabled) return;
      st.page += (b.getAttribute('data-page') === 'next' ? 1 : -1);
      render();
    });
    if (card) {
      card.addEventListener('gw:select', function (e) {
        var w = e.target.closest('.select-wrap');
        if (!w) return;
        if (w.hasAttribute('data-pagesize')) {
          st.size = parseInt(e.detail.value, 10); st.page = 1; render();
        }
        if (w.hasAttribute('data-sort-select') && e.detail.sortKey !== null) {
          st.key = parseInt(e.detail.sortKey, 10); st.dir = 1; st.page = 1; render();
        }
      });
      var filt = $('[data-filter]', card);
      if (filt) filt.addEventListener('input', function () {
        st.q = filt.value.trim().toLowerCase(); st.page = 1; render();
      });
    }
    render();
  });

  /* tooltips */
  var tip = document.createElement('div');
  tip.className = 'tip';
  document.body.appendChild(tip);
  function showTip(el) {
    tip.textContent = el.getAttribute('data-tip');
    tip.classList.add('is-on');
    var r = el.getBoundingClientRect(), tw = tip.offsetWidth, th = tip.offsetHeight;
    var left, top;
    if (el.getAttribute('data-tip-place') === 'right') {
      /* the collapsed rail: sit beside the icon, vertically centred on it */
      left = r.right + 8;
      top = r.top + r.height / 2 - th / 2;
      if (left + tw > window.innerWidth - 8) left = r.left - tw - 8;   // flip if it would clip
    } else {
      left = Math.min(Math.max(8, r.left + r.width / 2 - tw / 2), window.innerWidth - tw - 8);
      top = r.top - th - 8;
      if (top < 8) top = r.bottom + 8;
    }
    tip.style.left = Math.max(8, left) + 'px';
    tip.style.top = Math.max(8, top) + 'px';
  }
  function hideTip() { tip.classList.remove('is-on'); }
  document.addEventListener('mouseover', function (e) {
    var el = e.target.closest('[data-tip]'); if (el) showTip(el);
  });
  document.addEventListener('mouseout', function (e) {
    if (e.target.closest('[data-tip]')) hideTip();
  });
  document.addEventListener('focusin', function (e) {
    var el = e.target.closest('[data-tip]'); if (el) showTip(el); else hideTip();
  });
  window.addEventListener('scroll', hideTip, true);

  /* collapsible inset */
  $$('[data-inset-toggle]').forEach(function (b) {
    b.addEventListener('click', function () {
      var open = !b.closest('[data-inset]').classList.toggle('is-closed');
      b.setAttribute('aria-expanded', open ? 'true' : 'false');
      b.setAttribute('aria-label', open ? 'Collapse' : 'Expand');
    });
  });

  /* dashboard switcher — measured in 409:11644. Picking one shows that destination's empty
     state, the same way the nav does, and retitles the topbar. */
  var dashBtn = $('[data-dash-toggle]'), dashMenu = $('.dash-switch');
  function closeDash() {
    if (!dashMenu) return;
    dashMenu.classList.remove('is-open');
    dashBtn.setAttribute('aria-expanded', 'false');
  }
  if (dashBtn && dashMenu) {
    dashBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      var open = dashMenu.classList.toggle('is-open');
      dashBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    dashMenu.addEventListener('click', function (e) {
      var item = e.target.closest('[data-dash]');
      if (!item) return;
      var name = item.getAttribute('data-dash');
      $('[data-tb-name]').textContent = name;
      var t = $('[data-empty-title]');
      if (t) t.textContent = name + ' is not built yet';
      $('.page').classList.add('is-off');
      $('.empty-page').classList.add('is-on');
      $$('.nav-item').forEach(function (n) { n.classList.remove('is-selected'); });
      closeDash();
    });
  }

  /* date-range picker — the Custom tab opens it; Apply writes the range back to the tab. */
  var dp = $('.dp'), customTab = null;
  $$('[data-date-tabs] .tab-item').forEach(function (tb) {
    if (tb.textContent.trim() === 'Custom') customTab = tb;
  });
  function closeDp() { if (dp) dp.classList.remove('is-open'); }
  if (dp && customTab) {
    customTab.addEventListener('click', function (e) {
      e.stopPropagation();
      var open = dp.classList.toggle('is-open');
      /* open on the month the range starts in — the stack holds twelve */
      if (open) scrollToOff(selFrom === null ? 1 : selFrom);
    });
    dp.addEventListener('click', function (e) { e.stopPropagation(); });
    $$('.dp-preset').forEach(function (p) {
      p.addEventListener('click', function () {
        $$('.dp-preset').forEach(function (o) { o.classList.remove('is-sel'); });
        p.classList.add('is-sel');
        var fn = PRESETS[p.getAttribute('data-preset')];
        if (fn) { var r = fn(); setRange(r[0], r[1]); }
      });
    });
    var dpHover = null;   /* hover preview of the end of the range */
    $$('.dp-day[data-off]').forEach(function (d) {
      d.addEventListener('mouseenter', function () {
        if (selFrom === null || selTo !== null) return;
        var n = +d.getAttribute('data-off');
        $$('.dp-day[data-off]').forEach(function (o) {
          var m = +o.getAttribute('data-off');
          o.classList.toggle('is-preview', m > selFrom && m < n);
        });
        var startCell = $('.dp-day.is-start');
        if (startCell && n > selFrom) startCell.classList.add('has-end');
        dpHover = n;
      });
    });
    $('.dp-grid').addEventListener('mouseleave', function () {
      $$('.dp-day.is-preview').forEach(function (o) { o.classList.remove('is-preview'); });
      dpHover = null;
    });
    /* Real dates, so a preset can move both the grid and the two fields. Day numbers are
       offsets from Jul 1 2026 (1 = Jul 1), which lets a range start before the rendered month:
       the cells clamp, the fields still read the true date. */
    var MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    var MONTH_START = new Date(2026, 6, 1);
    /* the anchor is the measured range END — Jul 31 2026 — so "last N days" counts back from it */
    var ANCHOR = new Date(2026, 6, 31);
    var DAY_MS = 86400000;
    function offOf(dt) { return Math.round((dt - MONTH_START) / DAY_MS) + 1; }
    function dateOf(off) { return new Date(2026, 6, off); }
    function addDays(dt, n) { var d = new Date(dt.getTime()); d.setDate(d.getDate() + n); return d; }
    function fmtDate(dt) {
      return MONTHS[dt.getMonth()] + ' ' + dt.getDate() + ', ' + dt.getFullYear();
    }
    function fmtDay(n) { return fmtDate(dateOf(n)); }
    /* Accepts what the field itself prints — `Jul 15, 2026` — plus the three shapes people
       actually type. Returns null when it cannot be read, so the caller can flag the field. */
    function parseDate(s) {
      s = (s || '').trim();
      if (!s) return null;
      var m = s.match(/^([A-Za-z]{3,})\s+(\d{1,2}),?\s+(\d{4})$/);           // Jul 15, 2026
      if (m) {
        var mi = MONTHS.findIndex(function (x) {
          return x.toLowerCase() === m[1].slice(0, 3).toLowerCase(); });
        return mi < 0 ? null : new Date(+m[3], mi, +m[2]);
      }
      m = s.match(/^(\d{1,2})\s+([A-Za-z]{3,})\s+(\d{4})$/);                 // 15 Jul 2026
      if (m) {
        var mj = MONTHS.findIndex(function (x) {
          return x.toLowerCase() === m[2].slice(0, 3).toLowerCase(); });
        return mj < 0 ? null : new Date(+m[3], mj, +m[1]);
      }
      m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);                          // 2026-07-15
      if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
      m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);                       // 7/15/2026
      if (m) return new Date(+m[3], +m[1] - 1, +m[2]);
      return null;
    }
    /* the stack renders twelve months and no more, so anything outside it cannot be shown */
    var SPAN_MIN = offOf(new Date(2025, 7, 1)), SPAN_MAX = offOf(new Date(2026, 6, 31));
    function inSpan(off) { return off >= SPAN_MIN && off <= SPAN_MAX; }

    var dpFrom = $('[data-dp-from]'), dpTo = $('[data-dp-to]');
    var selFrom = null, selTo = null;
    $$('.dp-day[data-off]').forEach(function (d) {
      if (d.classList.contains('is-start')) selFrom = +d.getAttribute('data-off');
      if (d.classList.contains('is-end')) selTo = +d.getAttribute('data-off');
    });

    function paintCal() {
      $$('.dp-day[data-off]').forEach(function (d) {
        var n = +d.getAttribute('data-off');
        d.classList.remove('is-edge', 'is-start', 'is-end', 'is-range', 'has-end', 'is-preview');
        if (selFrom === null) return;
        if (n === selFrom) {
          d.classList.add('is-edge', 'is-start');
          if (selTo !== null) d.classList.add('has-end');
        } else if (selTo !== null && n === selTo) {
          d.classList.add('is-edge', 'is-end');
        } else if (selTo !== null && n > selFrom && n < selTo) {
          d.classList.add('is-range');
        }
      });
      dpFrom.value = selFrom === null ? '' : fmtDay(selFrom);
      dpTo.value = selTo === null ? '' : fmtDay(selTo);
    }

    /* Presets compute a real range and push it into the grid and the fields.
       NOTE the frame's own conflict: it draws `Last 30 days` selected while showing Jul 15-31,
       which is 17 days. The initial state reproduces the frame; clicking a preset computes. */
    var PRESETS = {
      'Last 7 days':  function () { return [addDays(ANCHOR, -6), ANCHOR]; },
      'Last 14 days': function () { return [addDays(ANCHOR, -13), ANCHOR]; },
      'Last 28 days': function () { return [addDays(ANCHOR, -27), ANCHOR]; },
      'Last 30 days': function () { return [addDays(ANCHOR, -29), ANCHOR]; },
      'Last 90 days': function () { return [addDays(ANCHOR, -89), ANCHOR]; },
      'Last week (Sun - Sat)': function () {
        var sun = addDays(ANCHOR, -ANCHOR.getDay());
        return [addDays(sun, -7), addDays(sun, -1)];
      },
      'Quarter to date': function () {
        var q = Math.floor(ANCHOR.getMonth() / 3) * 3;
        return [new Date(ANCHOR.getFullYear(), q, 1), ANCHOR];
      },
      'Last 12 months': function () {
        return [addDays(new Date(2025, ANCHOR.getMonth(), ANCHOR.getDate()), 1), ANCHOR];
      }
    };
    var dpStack = $('[data-dp-stack]');
    function scrollToOff(off) {
      if (!dpStack) return;
      var cell = dpStack.querySelector('.dp-day[data-off="' + off + '"]');
      var month = cell && cell.closest('.dp-month');
      if (!month) return;
      dpStack.scrollTop = month.offsetTop - dpStack.firstElementChild.offsetTop;
    }
    function setRange(a, b) {
      selFrom = offOf(a); selTo = offOf(b);
      paintCal();
      /* every month back to Aug 2025 is rendered, so both ends get a real pill */
      dpFrom.value = fmtDate(a);
      dpTo.value = fmtDate(b);
      scrollToOff(selFrom);
    }
    $$('.dp-day[data-off]').forEach(function (d) {
      d.addEventListener('click', function () {
        var n = +d.getAttribute('data-off');
        if (selFrom === null || selTo !== null || n < selFrom) { selFrom = n; selTo = null; }
        else if (n === selFrom) { selTo = null; }
        else { selTo = n; }
        paintCal();
        /* touching the grid means the range is bespoke */
        $$('.dp-preset').forEach(function (o) { o.classList.remove('is-sel'); });
        var custom = $('[data-preset="Custom"]');
        if (custom) custom.classList.add('is-sel');
      });
    });

    /* typing a date moves the calendar; an unreadable or out-of-span value flags the field
       and leaves the selection alone rather than guessing. */
    function commitField(which) {
      var el = which === 'from' ? dpFrom : dpTo;
      var d = parseDate(el.value);
      var off = d && offOf(d);
      if (!d || !inSpan(off)) { el.setAttribute('aria-invalid', 'true'); return; }
      el.removeAttribute('aria-invalid');
      dpFrom.removeAttribute('aria-invalid');
      dpTo.removeAttribute('aria-invalid');
      if (which === 'from') selFrom = off; else selTo = off;
      if (selFrom !== null && selTo !== null && selFrom > selTo) {
        var swap = selFrom; selFrom = selTo; selTo = swap;
      }
      paintCal();
      /* the grid owns the canonical spelling — rewrite whatever was typed */
      if (selFrom !== null) dpFrom.value = fmtDay(selFrom);
      if (selTo !== null) dpTo.value = fmtDay(selTo);
      $$('.dp-preset').forEach(function (o) { o.classList.remove('is-sel'); });
      var cst = $('[data-preset="Custom"]');
      if (cst) cst.classList.add('is-sel');
      scrollToOff(which === 'from' ? selFrom : selTo);
    }
    [['from', dpFrom], ['to', dpTo]].forEach(function (pair) {
      pair[1].addEventListener('change', function () { commitField(pair[0]); });
      pair[1].addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); commitField(pair[0]); }
      });
    });

    var dpCancel = $('.dp-cancel'), dpApply = $('.dp-apply');
    if (dpCancel) dpCancel.addEventListener('click', closeDp);
    if (dpApply) dpApply.addEventListener('click', function () {
      var sel = $('.dp-preset.is-sel');
      if (sel && sel.getAttribute('data-preset') !== 'Custom') {
        customTab.textContent = sel.getAttribute('data-preset');
      } else if (selFrom !== null && selTo !== null) {
        customTab.textContent = dpFrom.value + ' \u2013 ' + dpTo.value;
      } else if (selFrom !== null) {
        customTab.textContent = dpFrom.value;
      }
      closeDp();
    });
  }
  document.addEventListener('click', function () { closeDash(); closeDp(); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { closeDash(); closeDp(); }
  });

  /* charts: the tooltip follows the cursor, snapping to the ten traced points. */
  $$('.ch-plot').forEach(function (plot) {
    var pts = plot.getAttribute('data-pts').split(',').map(function (s) {
      var p = s.split('|');
      return { x: +p[0], date: p[1], actual: p[2], target: p[3], y: +p[4] };
    });
    var tip = plot.querySelector('.ch-tip'),
        cur = plot.querySelector('.ch-cursor'),
        dot = plot.querySelector('.ch-cursor-dot'),
        dEl = tip.querySelector('.tip-date'),
        vEl = tip.querySelectorAll('.tip-row b'),
        i = +plot.getAttribute('data-start');

    function show(n) {
      i = n < 0 ? 0 : (n > pts.length - 1 ? pts.length - 1 : n);
      var p = pts[i];
      dEl.textContent = p.date;
      vEl[0].textContent = p.actual;
      vEl[1].textContent = p.target;
      cur.style.left = p.x + '%';
      dot.style.top = (100 - p.y) + '%';
      /* flip the tip inward on the last third so it never leaves the card */
      tip.style.left = p.x + '%';
      tip.style.transform = p.x > 66 ? 'translateX(calc(-100% - 6px))' : 'translateX(6px)';
      tip.classList.add('is-on');
    }
    function nearest(clientX) {
      var b = plot.getBoundingClientRect(), f = ((clientX - b.left) / b.width) * 100, best = 0;
      for (var k = 1; k < pts.length; k++)
        if (Math.abs(pts[k].x - f) < Math.abs(pts[best].x - f)) best = k;
      return best;
    }
    plot.addEventListener('mousemove', function (e) { show(nearest(e.clientX)); });
    plot.addEventListener('mouseleave', function () { tip.classList.remove('is-on'); });
    plot.addEventListener('focus', function () { show(i); });
    plot.addEventListener('blur', function () { tip.classList.remove('is-on'); });
    plot.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { show(i + 1); e.preventDefault(); }
      else if (e.key === 'ArrowLeft') { show(i - 1); e.preventDefault(); }
      else if (e.key === 'Escape') tip.classList.remove('is-on');
    });
  });

  /* loading screen — Sync Now runs it, since that button is the fetch. */
  var loadPage = $('.loading-page'), loadFill = $('.load-fill'), loadPct = $('.load-pct');
  /* Last-synced tooltip. This is REAL state, not invented data: it starts at page load and
     resets when a sync actually completes, so it never claims a sync that did not happen.
     Refreshed in the capture phase so the text is current before the tooltip is shown. */
  var lastSync = Date.now();
  function syncedAgo() {
    var mins = Math.floor((Date.now() - lastSync) / 60000);
    if (mins < 1) return 'just now';
    if (mins === 1) return '1 min ago';
    if (mins < 60) return mins + ' min ago';
    var hrs = Math.floor(mins / 60);
    return hrs === 1 ? '1 hr ago' : hrs + ' hr ago';
  }
  function refreshSyncTip(btn) {
    var d = new Date(lastSync);
    var hh = String(d.getHours()).padStart(2, '0'),
        mm = String(d.getMinutes()).padStart(2, '0');
    btn.setAttribute('data-tip', 'Last synced ' + syncedAgo() + ' \u00b7 ' + hh + ':' + mm);
  }
  document.addEventListener('mouseover', function (e) {
    var b = e.target.closest && e.target.closest('[data-sync]');
    if (b) refreshSyncTip(b);
  }, true);

  var syncBtn = $('[data-sync]');
  if (syncBtn) refreshSyncTip(syncBtn);
  if (syncBtn && loadPage) syncBtn.addEventListener('click', function () {
    if (syncBtn.hasAttribute('disabled')) return;
    /* your comment: the button needs a processing state while this runs */
    var syncLabel = syncBtn.querySelector('[data-sync-label]');
    var syncWas = syncLabel ? syncLabel.textContent : null;
    syncBtn.setAttribute('disabled', '');
    syncBtn.classList.add('is-syncing');
    if (syncLabel) syncLabel.textContent = 'Syncing';
    var pageEl = $('.page'), emptyEl = $('.empty-page');
    /* remember where we were, so syncing from an unbuilt destination returns there */
    var wasEmpty = emptyEl && emptyEl.classList.contains('is-on');
    pageEl.classList.add('is-off');
    if (emptyEl) emptyEl.classList.remove('is-on');
    loadPage.classList.add('is-on');
    var pct = 8;
    loadFill.style.width = pct + '%';
    loadPct.textContent = pct + '%';
    var t = setInterval(function () {
      pct += 6 + Math.round(Math.random() * 10);
      if (pct >= 100) {
        pct = 100;
        clearInterval(t);
        setTimeout(function () {
          loadPage.classList.remove('is-on');
          if (wasEmpty) emptyEl.classList.add('is-on');
          else pageEl.classList.remove('is-off');
          lastSync = Date.now();          /* only a COMPLETED sync resets it */
          refreshSyncTip(syncBtn);
          syncBtn.removeAttribute('disabled');
          syncBtn.classList.remove('is-syncing');
          if (syncLabel) syncLabel.textContent = syncWas;
        }, 260);
      }
      loadFill.style.width = pct + '%';
      loadPct.textContent = pct + '%';
    }, 220);
  });

  /* nav: only Overview has a page. Anything else gets the empty state rather than leaving
     the previous page's content behind — build-rules.md. Shown/hidden rather than swapped,
     which also sidesteps the rebinding trap. */
  var page = $('.page'), empty = $('.empty-page'), title = $('[data-empty-title]');
  function goto(el) {
    $$('.nav-item').forEach(function (n) { n.classList.remove('is-selected'); });
    el.classList.add('is-selected');
    var home = el.hasAttribute('data-home');
    page.classList.toggle('is-off', !home);
    empty.classList.toggle('is-on', !home);
    if (!home && title) title.textContent = el.getAttribute('data-nav') + ' is not built yet';
    $('.slot').scrollTop = 0;
  }
  $$('.nav-item').forEach(function (n) {
    n.addEventListener('click', function (e) { e.preventDefault(); goto(n); });
  });
  var back = $('[data-empty-back]');
  if (back) back.addEventListener('click', function () {
    var home = $('.nav-item[data-home]');
    if (home) goto(home);
  });
})();
""".replace("__SORT__", _json.dumps(SORT_ICONS)).replace("__CHEV__", _json.dumps(CHEVRONS))


HTML = f"""<!doctype html>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>GTM Command Center — Overview</title>
<style>{CSS}</style>
<div class="shell">
  <header class="topbar">
    <div class="tb-title">
      <span class="tb-logo">{LOGO_SVG}</span>
      <span class="tb-name" data-tb-name>GTM Command Center</span>
      <button class="icon-btn icon-btn-ghost" data-dash-toggle aria-haspopup="listbox"
       aria-expanded="false" aria-label="Switch dashboard">{ico('caret-down','bold',16)}</button>
      {dashboard_switcher()}
    </div>
    <div class="tb-actions">
      <button class="btn btn-outlined" data-sync aria-live="polite">{ico('arrows-clockwise','regular',16)}<span data-sync-label>Sync Now</span></button>
      <!-- Theme switcher is rendered as designed. Light/dark switching is OUT OF SCOPE for this
           build (scope: the light overview frame). Dark values are measured and documented in
           exports/dashboard/v2/ if it is wired up later. -->
      <div class="theme-toggle" role="group" aria-label="Colour theme">
        <span data-theme-set="light" class="is-on" role="button" tabindex="0"
         aria-label="Light">{ico('sun-dim','bold',12)}</span>
        <span data-theme-set="dark" role="button" tabindex="0"
         aria-label="Dark">{ico('moon','bold',12)}</span></div>
    </div>
    <!-- phone only (v2/phone.md): the trigger sits ALONE at the far right, x 323 of 375. -->
    <button class="tb-drawer" data-drawer-toggle aria-expanded="false" aria-controls="sb"
     aria-label="Open menu">{ico('list','regular',16)}</button>
  </header>
  <div class="shell-body">
    <aside class="sidebar" id="sb">
      <div class="sb-nav">
        <div class="sb-nav-top">
        <div class="sb-collapse">
          <button class="icon-btn icon-btn-ghost" data-collapse aria-expanded="true"
           aria-label="Collapse sidebar">{ico('caret-double-left','bold',12)}</button>
        </div>
        <nav class="nav-groups">{nav_top}</nav>
        </div>
        <nav class="nav-groups nav-groups-end">{nav_end}</nav>
      </div>
      <div class="sb-footer">
        <div class="user-card">
          <span class="uc-identity" data-uc-identity><span class="uc-avatar">{AVATAR_ART}</span>
            <span class="uc-meta"><span class="uc-name">Bruce Wayne</span>
              <span class="uc-role">Admin</span></span></span>
          <button class="icon-btn icon-btn-ghost" data-signout
           aria-label="Sign out">{ico('sign-out','bold',16)}</button>
        </div>
      </div>
    </aside>
    <!-- ⚠ NO SCRIM — 515:2307 draws none, and the system has no scrim token. Transparent
         outside-tap target only. Must follow .sidebar: the CSS reveals it with `~`. -->
    <div class="drawer-catch" data-drawer-close></div>
    <main class="slot">{body}
      <!-- build-rules.md: every nav destination needs a real page; an unbuilt one gets the
           empty state rather than leaving the previous page's content behind. Shown/hidden
           rather than swapped, which also avoids the rebinding trap. -->
      <!-- Sync Now triggers this: the frame shows a loading state and "fetching data" is
           exactly what that button does. Not shown on first paint, so previewing isn't blocked. -->
      <div class="loading-page"><div class="load-box">
        <span class="load-title">Loading &amp; fetching data&hellip;</span>
        <span class="load-row"><span class="load-track"><span class="load-fill"></span></span>
          <span class="load-pct">58%</span></span>
      </div></div>
      <div class="empty-page"><div class="es">
        <span class="es-circle">{ico('squares-four','regular',16)}</span>
        <h2 data-empty-title>Not built yet</h2>
        <p>This destination has no page in the build. The Overview screen is the one surface
           measured from Figma so far.</p>
        <button class="btn btn-outlined" data-empty-back>Back to Overview</button>
      </div></div></main>
  </div>
  <!-- dock — measured 515:2183, left 20 bottom 20, flex gap 8. Phone only: THIS is where the
       theme toggle lives, not the topbar. The refresh delegates to the wired Sync Now button
       rather than duplicating its handler — an affordance with no function is a dead control,
       and v2/phone.md says to omit refresh entirely when there is nothing to sync. -->
  <div class="dock">
    <button class="dock-refresh" data-dock-sync aria-label="Sync now">{ico('arrows-clockwise','regular',16)}</button>
    <div class="theme-toggle" role="group" aria-label="Colour theme">
      <span data-theme-set="light" class="is-on" role="button" tabindex="0"
       aria-label="Light">{ico('sun-dim','bold',12)}</span>
      <span data-theme-set="dark" role="button" tabindex="0"
       aria-label="Dark">{ico('moon','bold',12)}</span></div>
  </div>
</div>
<div class="drift" role="status" aria-live="polite">
  <i class="drift-dot" data-drift-dot></i>
  <span class="drift-body">
    <span class="drift-title" data-drift-title></span>
    <span class="drift-list" data-drift-list></span>
  </span>
  <textarea class="drift-fallback" data-drift-fallback readonly rows="5"
   aria-label="Update instructions"></textarea>
  <span class="drift-actions">
    <button class="drift-primary" data-drift-update>How to update</button>
    <button data-drift-dismiss aria-label="Dismiss">Dismiss</button>
  </span>
</div>
<script>
/* gushwork-build:{BUILD_STAMP} */
{DRIFT_JS}
</script>
<script>{JS}</script>
"""

OUT.write_text(HTML)
print(f"{OUT.relative_to(ROOT)} — {len(HTML)/1024:.0f}K")
print(f"  tokens requested: {len(NEEDED)} · emitted with dependencies: {len(EMIT)}")
print(f"  pulled in transitively: {', '.join(n for n in EMIT if n not in NEEDED) or 'none'}")
print(f"  icons inlined: {len(_ic)}")
