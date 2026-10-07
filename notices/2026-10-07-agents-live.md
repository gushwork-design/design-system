# /agents is live (public, counted)

7 Oct 2026, Utsav: "make it live at /agents", then "track the visits".

- **Page:** `web/agents/` (own assets). `/internal/staging/ai-marketplace` stays as the working copy. The page keeps `noindex, nofollow`: it is on the design host, so search engines are told to skip it until someone decides otherwise.
- **Public:** `/agents` is outside the gate (the matcher lists only the bare path, so its images and scripts are never gated either). Share card is in the page head (`/agents/assets/og-fuzzy.jpg`, 1200x630).
- **Counted:** `middleware.js` writes one row per page view to the visit log as `(public visitor)` through `recordPublicView` in `api/_log-visit.js`. No IP, user agent or referrer. Link-preview bots and crawlers are skipped. No 30-minute dedupe, because nobody is identified, so the number is page views, not people. Same 5000-row list, so the older rows roll off as before. The Visits tab shows them as "Public visitors".
- **Not done:** no unique-visitor count and no source breakdown. Both would need a cookie or a referrer, which the log deliberately does not store.
