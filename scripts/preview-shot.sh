#!/usr/bin/env bash
# Screenshot a preview fragment the way the review drawer draws it: in a shadow root, with tokens.css and
# web/previews/_sheet.css, at the drawer's width. For checking a drawing, not for the site.
#   bash scripts/preview-shot.sh web/previews/web/button.frag [width=560] [out=/tmp/<name>.png] [dark]
set -euo pipefail
cd "$(dirname "$0")/.."
FRAG="${1:?usage: preview-shot.sh <fragment.frag> [width] [out.png] [dark]}"
W="${2:-560}"
OUT="${3:-/tmp/$(basename "$FRAG" .frag).png}"
DARK="${4:-}"
ROOT="$(pwd)"
CH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
[ -x "$CH" ] || { echo "Chrome not found at $CH" >&2; exit 1; }
HTML="$(mktemp -d)/shot.html"
python3 - "$ROOT" "$FRAG" "$W" "$HTML" "$DARK" <<'PY'
import sys, json
root, frag, w, html, dark = sys.argv[1:6]
body = open(f"{root}/{frag}", encoding="utf-8").read()
theme = 'dark' if dark == 'dark' else 'light'
page = f"""<!doctype html><html data-theme="{theme}"><head><meta charset="utf-8">
<link rel="stylesheet" href="file://{root}/foundation/tokens.css">
<style>@font-face{{font-family:'Inter';src:url('file://{root}/fonts/Inter-VariableFont_opsz_wght.ttf');font-weight:100 900}}
@font-face{{font-family:'Vert Grotesk Display';src:url('file://{root}/fonts/Vert_Grotesk_Display_VF.ttf');font-weight:100 900}}
body{{margin:0;background:{'#0d0d0d' if theme=='dark' else '#fff'};padding:16px}}#h{{width:{w}px}}</style></head><body><div id="h"></div>
<script>
var host=document.getElementById('h'),root=host.attachShadow({{mode:'open'}});
root.innerHTML='<link rel="stylesheet" href="file://{root}/foundation/tokens.css"><link rel="stylesheet" href="file://{root}/web/previews/_sheet.css">'+{json.dumps(body)};
// The drawer's own sizing (web/admin/design-system.html, mountPreview): columns as wide as the widest thing drawn in them,
// folds measured by their own width, never scaled below 70%.
function fit() {{
  var W={w}; host.style.cssText='width:'+W+'px;transform:none';
  var need=178; root.querySelectorAll('.stage').forEach(function(st){{ var lo=1e9,hi=-1e9; for(var i=0;i<st.children.length;i++){{var r=st.children[i].getBoundingClientRect(); lo=Math.min(lo,r.left); hi=Math.max(hi,r.right);}} if(hi>lo) need=Math.max(need,Math.ceil(hi-lo)+24); }});
  host.style.setProperty('--cellmin', need+'px');
  var foldW=0; root.querySelectorAll('.foldscale').forEach(function(f){{ foldW=Math.max(foldW,Math.ceil(f.getBoundingClientRect().width)); }});
  var w=Math.max(host.scrollWidth,W,foldW?foldW+4:0,need>178?need+26:0),k=1;
  if (w>W+1) {{ k=Math.max(W/w,0.7); host.style.width=w+'px'; }}
  host.style.transform=k<1?'scale('+k+')':'none'; host.style.transformOrigin='0 0';
  document.body.style.height=Math.ceil(host.offsetHeight*k)+32+'px'; document.body.style.overflow='hidden';
}}
fit(); setTimeout(fit,300); setTimeout(fit,1200);
</script></body></html>"""
open(html, "w", encoding="utf-8").write(page)
PY
"$CH" --headless=new --disable-gpu --hide-scrollbars --allow-file-access-from-files --window-size=$((W+32)),${SHOT_H:-2200} \
  --virtual-time-budget=4000 --screenshot="$OUT" "file://$HTML" >/dev/null 2>&1
echo "$OUT"
