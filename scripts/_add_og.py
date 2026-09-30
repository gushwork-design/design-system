#!/usr/bin/env python3
"""Give every page of the design hub the hub's Open Graph card, in the STAGED copy.

    python3 scripts/_add_og.py <stage-dir>

The hub's social card is one image (assets/og/hub.png, Figma 818:5074), except Staging, Tools and
Templates, which carry the blue ad-page card (see PAGE_CARDS). Rather than paste the same
ten lines into every page, and have them drift, this adds them at publish time to any staged page
that does not already carry its own og:image. That is what lets the landers, the case-study and
ad-page templates, the email signature and the ID-card tool keep the cards they have: a page with its
own og:image is left alone.

What it writes, per page: og:type, og:site_name, og:url (from the page's route, on the live domain),
og:title (the page's <title>), og:description (its meta description, when it has one), the image with
its size and alt text, and the twitter:card set. og:url is the canonical address, so a link shared from
the .vercel.app alias still names the real one.

Gated pages (/internal, /admin) cannot unfurl for anyone signed out, since a crawler is bounced to
sign-in; they get the tags anyway so a page that is later made public is not the one that unfurls blank.
"""
import html
import os
import re
import sys

BASE = "https://design.gushwork.ai"
IMAGE = BASE + "/assets/og/hub.png"
SITE = "Gushwork Design"

# Three pages carry the ad-page card instead of the hub's: the blue one with the white logo and the
# page's own name, rendered from assets/ads/og-template.html (the template the ad landers, the
# case-study and the ad-page templates use). Staging, Tools and Templates are where that kind of
# work is shown, so they look like it. Route -> (image, name). Add a route here and list its PNG in
# SOCIAL in publish-sheets.sh.
PAGE_CARDS = {
    "/internal/staging": ("staging.png", "Staging"),
    "/internal/tools": ("tools.png", "Tools"),
    "/internal/templates": ("templates.png", "Templates"),
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


def main(stage):
    done = skipped = 0
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
            if "og:image" in s or not mark:
                skipped += 1          # has its own card, or is not a full page
                continue
            m = re.search(r"<title>(.*?)</title>", s, re.S)
            title = html.unescape(m.group(1).strip()) if m else SITE
            d = re.search(r'<meta name="description" content="([^"]*)"', s)
            desc = html.unescape(d.group(1)) if d else ""
            s = s.replace(mark, block(route(stage, path), title, desc) + mark, 1)
            open(path, "w", encoding="utf-8").write(s)
            done += 1
    print(f"  og: {done} pages given the hub card, {skipped} left with their own")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(sys.argv[1])
