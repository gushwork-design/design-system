# Sales one-pager template

A single-page sales sheet for prospects, 640 × 1036 px, one page. Same frame, assets and Figma source
as `templates/one-pager/` (GW-Document, node `319:337`); the copy is rewritten to speak to the
reader ("you"), and a closing `Book a Demo` band sits above the footer.

Every number on it (1000+ businesses, $10M+ revenue influenced, 8,000+ leads a month) is carried over
from the company one-pager. Check them with the owner before sending the sheet out.

```bash
./render.sh          # -> sales-one-pager.pdf (needs Google Chrome)
```

One fixed-height sheet with `overflow:hidden`: after a copy change, check the lowest ink against the
card's bottom edge.
