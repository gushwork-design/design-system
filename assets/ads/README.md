# Ad page favicon + social card

Every `Type=Ads` page ships these. See the rule in `skills/gushwork-web/SKILL.md`.

| File | Use |
|---|---|
| `favicon.svg` | `<link rel="icon" type="image/svg+xml">` — 80×80 artwork, scales anywhere |
| `favicon-32.png` | PNG fallback for browsers that ignore SVG icons |
| `apple-touch-icon.png` | 180×180, iOS home screen |
| `og-template.html` | Render the 1200×630 card from the page's own H1 |

Source: GW Ads Library `t9rRxJODIVZ4N6CnrGdMhC`, page `↳ web/ads/og-image` —
favicon `5:46605`, card `5:36`.

## Making the card

```bash
sed 's/HEADLINE/Your page H1 here/' og-template.html > /tmp/og.html
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless --disable-gpu \
  --hide-scrollbars --window-size=1200,630 --screenshot=og.png "file:///tmp/og.html"
```

The template inlines the Vert Grotesk Display face, so it needs no network and matches
the page exactly. **Never export `5:36` from Figma directly** — its headline is
`Lorem ipsum dolor sit amet…`, and exporting it publishes that to LinkedIn.

`og:url` and `og:image` must be absolute: scrapers do not honour `<base href>`.
