#!/usr/bin/env python3
"""Give every page of the design hub the hub's Open Graph card, in the STAGED copy.

    python3 scripts/_add_og.py <stage-dir>

The hub's social card is one image (assets/og/hub.png, Figma 818:5074), including the Staging,
Tools and Templates collection pages. A few individual staging items carry the blue ad-page card
instead (see PAGE_CARDS). Rather than paste the same ten lines into every page, and have them
drift, this adds them at publish time to any staged page that does not already carry its own
og:image. That is what lets the landers, the case-study and
ad-page templates, the email signature and the ID-card tool keep the cards they have: a page with its
own og:image is left alone.

What it writes, per page: og:type, og:site_name, og:url (from the page's route, on the live domain),
og:title (the page's <title>), og:description (its meta description, when it has one), the image with
its size and alt text, and the twitter:card set. og:url is the canonical address, so a link shared from
the .vercel.app alias still names the real one.

Gated pages (/internal, /admin) are bounced to sign-in for anyone signed out, a crawler included, so
their own tags never reach it. This also writes og-map.json (route -> title, image, for /internal and
/library), which web/middleware.js uses to answer link-preview bots with a tags-only stub.
"""
import html
import json
import os
import re
import sys

BASE = "https://design.gushwork.ai"
IMAGE = BASE + "/assets/og/hub.png"
SITE = "Gushwork Design"

# Staging items with no card of their own carry the blue ad-page card instead of the hub's: the white
# logo over the item's name, rendered from assets/ads/og-template.html (the template the ad landers
# and the case-study and ad-page templates use). The collection pages (Staging, Tools, Templates)
# keep the hub card. Route -> (image, name). Add a route here and list its PNG in SOCIAL in
# publish-sheets.sh. The ID card and email signature tools point at their cards from their own
# <meta> tags, so they are not listed.
PAGE_CARDS = {
    "/internal/staging/case-study-gen-studio": ("case-study-gen-studio.png", "Case Study Gen Studio"),
    "/internal/staging/crm-studio-deck/": ("crm-studio-deck.png", "CRM Studio discovery deck"),
    "/internal/staging/homepage-neo/": ("homepage-neo.png", "Homepage Neo"),
    "/internal/staging/social-creative/": ("social-creative.png", "Social creative"),
}


def route(stage, path):
    rel = os.path.relpath(path, stage).replace(os.sep, "/")
    if rel == "index.html":
        return "/"
    if rel.endswith("/index.html"):
        return "/" + rel[: -len("/index.html")] + "/"
    return "/" + rel[: -len(".html")]


def block(url, title, desc):
    image, alt = IMAGE, "Gushwork Design Hub, on a dark grid with the Gushwork logo"
    if url in PAGE_CARDS:
        file, name = PAGE_CARDS[url]
        image, alt = f"{BASE}/assets/og/{file}", f"{name}, with the Gushwork logo on the brand blue grid"
        title = f"{name} — {SITE}"
    t, d = html.escape(title, quote=True), html.escape(desc, quote=True)
    lines = [
        '<meta property="og:type" content="website">',
        f'<meta property="og:site_name" content="{SITE}">',
        f'<meta property="og:url" content="{BASE}{url}">',
        f'<meta property="og:title" content="{t}">',
    ]
    if desc:
        lines.append(f'<meta property="og:description" content="{d}">')
    lines += [
        f'<meta property="og:image" content="{image}">',
        '<meta property="og:image:width" content="1200">',
        '<meta property="og:image:height" content="630">',
        f'<meta property="og:image:alt" content="{alt}">',
        '<meta name="twitter:card" content="summary_large_image">',
        f'<meta name="twitter:title" content="{t}">',
    ]
    if desc:
        lines.append(f'<meta name="twitter:description" content="{d}">')
    lines.append(f'<meta name="twitter:image" content="{image}">')
    return "<!-- Social card: the hub's, added at publish by scripts/_add_og.py -->\n" + "\n".join(lines) + "\n"


def remember(cards, stage, path, s):
    """Record route -> [og:title, og:image] for gated pages, read back from the page's own tags."""
    r = route(stage, path)
    if not (r.startswith("/internal") or r.startswith("/library")):
        return
    t = re.search(r'<meta property="og:title" content="([^"]*)"', s)
    i = re.search(r'<meta property="og:image" content="([^"]*)"', s)
    if t and i:
        cards[r.rstrip("/") or "/"] = [html.unescape(t.group(1)), html.unescape(i.group(1))]


def main(stage):
    done = skipped = 0
    cards = {}
    for root, _dirs, files in os.walk(stage):
        for f in files:
            if not f.endswith(".html"):
                continue
            path = os.path.join(root, f)
            try:
                s = open(path, encoding="utf-8").read()
            except (UnicodeDecodeError, OSError):
                continue
            # Several hub pages leave </head> implicit, so the tags go before </head> when there is
            # one and before <body otherwise.
            mark = "</head>" if "</head>" in s else ("<body" if "<body" in s else "")
            if not mark:
                skipped += 1          # not a full page
                continue
            if "og:image" in s:
                skipped += 1          # has its own card
                remember(cards, stage, path, s)
                continue
            m = re.search(r"<title>(.*?)</title>", s, re.S)
            title = html.unescape(m.group(1).strip()) if m else SITE
            d = re.search(r'<meta name="description" content="([^"]*)"', s)
            desc = html.unescape(d.group(1)) if d else ""
            s = s.replace(mark, block(route(stage, path), title, desc) + mark, 1)
            open(path, "w", encoding="utf-8").write(s)
            done += 1
            remember(cards, stage, path, s)
    # What the gate hands a link-preview bot (see og-map.json in middleware.js).
    with open(os.path.join(stage, "og-map.json"), "w", encoding="utf-8") as fh:
        json.dump(cards, fh, sort_keys=True, separators=(",", ":"))
    print(f"  og: {done} pages given the hub card, {skipped} left with their own")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(sys.argv[1])
