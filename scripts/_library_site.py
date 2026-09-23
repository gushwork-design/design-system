#!/usr/bin/env python3
"""Build preview/library/ — the component library as a site, one page per thing.

    /library                          index: banner + a card per library
    /library/foundations/<group>      11 token groups
    /library/parts/<surface>          what that surface holds
    /library/parts/<surface>/<comp>   one component, with its measured spec
    /library/recipes/<recipe>         one deliverable, and the order it assembles in
    /library/review                   the queue — admin only

THREE COLUMNS, everywhere below the index: the library's own inventory down the left, one
thing in the middle, on-this-page down the right. Ruled by Utsav after the shadcn/ui
reference — a single scrolling column stops working the moment a library has 28 components.

DERIVED. Foundations come out of foundation/tokens.css, parts out of
exports/<surface>/component-registry.json and the spec docs those entries point at,
ad-page out of exports/ad-page/folds.json, review state out of the registries' `review`
blocks. Primitives live in _component_library.py, markdown in _md.py. Nothing is authored
here except layout.

ITS OWN CHROME, NOT THE SITE SHELL. /library renders a topbar and no left rail, because
the left rail is the library's inventory. It shares localStorage's theme keys with the rest
of the site so a dark choice carries across, and it is gated one tier the same way —
/library internal, /library/review admin. See web/api/_access.js.

Usage:  python3 scripts/_library_site.py     # writes preview/library/**
"""

import importlib.util
import json
import os
import shutil
import sys
from datetime import date

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUTDIR = os.environ.get("OUTDIR", os.path.join(ROOT, "preview", "library"))


def _load(name, path):
    spec = importlib.util.spec_from_file_location(name, os.path.join(ROOT, "scripts", path))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


CL = _load("_cl", "_component_library.py")
MD = _load("_md", "_md.py")
esc = CL.esc


# ---------------------------------------------------------------------------
# Page model
# ---------------------------------------------------------------------------

class Page:
    def __init__(self, path, title, lede="", crumb="", rail=None, rail_title="",
                 body="", toc=None, chips="", meta="", wide=False):
        self.path = path            # 'parts/web/button' — no extension, no leading slash
        self.title = title
        self.lede = lede
        self.crumb = crumb
        self.rail = rail or []      # (label, href, is_active, note)
        self.rail_title = rail_title
        self.body = body
        self.toc = toc or []        # (level, text, slug)
        self.chips = chips
        self.meta = meta
        self.wide = wide            # index: no rail, no toc

    @property
    def depth(self):
        return self.path.count("/") + 1


def up(depth):
    """Relative prefix back to the DEPLOY root, where this tree is mounted at /library
    and tokens.css, shell.css, fonts/ and assets/ sit beside it.

    That is not where the files are on disk: they are generated into preview/library/,
    one level deeper, and shell.css lives in web/. So these hrefs are correct for the
    deploy and wrong for a file:// open, and there is no spelling that satisfies both.
    Use `bash scripts/library-site.sh --serve`, which assembles the deploy layout and
    serves it — what you see there is what ships."""
    return "../" * depth


def href(from_page, to_path):
    return up(from_page.depth) + "library/" + to_path


CSS = """
*{box-sizing:border-box}
body{margin:0;background:var(--s-page-bg);font-family:var(--gw-font-body);
     color:var(--s-body);-webkit-font-smoothing:antialiased}
a{color:inherit}
h1,h2,h3,h4,h5,h6{color:var(--s-heading)}

/* ---- topbar ------------------------------------------------------------- */
.lb-top{position:sticky;top:0;z-index:20;height:60px;display:flex;align-items:center;
        gap:var(--gw-space-16);padding:0 var(--gw-space-24);
        background:var(--s-chrome-bg);border-bottom:1px solid var(--s-chrome-border)}
.lb-brand{display:flex;align-items:center;gap:var(--gw-space-12);text-decoration:none;
          flex:none}
.lb-brand__chip{width:32px;height:32px;border-radius:var(--gw-radius-8);
                background:var(--gw-color-black);color:var(--gw-color-white);
                display:grid;place-items:center;flex:none}
.lb-brand__chip svg{width:16px;height:16px;display:block}
.lb-brand__n{font:var(--gw-text-h7);color:var(--s-heading)}
.lb-crumb{font:var(--gw-text-body-14-reg);color:var(--gw-color-neutral-400);
          white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.lb-crumb a{color:var(--gw-color-primary-600);text-decoration:none}
.lb-top__r{display:flex;align-items:center;gap:var(--gw-space-12);margin-left:auto}
.lb-find{width:300px;height:36px;background:var(--s-field-bg);
         border:1px solid var(--s-field-border);border-radius:var(--gw-radius-10);
         padding:0 var(--gw-space-12);font:var(--gw-text-body-14-reg);color:var(--s-heading)}
.lb-find::placeholder{color:var(--s-placeholder)}
.lb-find:focus{outline:var(--gw-focus-ring);outline-offset:var(--gw-focus-offset)}
.lb-tbtn{width:36px;height:36px;display:grid;place-items:center;background:transparent;
         border:1px solid var(--s-field-border);border-radius:var(--gw-radius-10);
         color:var(--s-body);cursor:pointer;flex:none}
.lb-tbtn svg{width:18px;height:18px;display:block}
.lb-tbtn:focus-visible{outline:var(--gw-focus-ring);outline-offset:var(--gw-focus-offset)}
@media (max-width:820px){.lb-find{display:none}}

/* ---- three columns ------------------------------------------------------- */
.lb-3{display:grid;grid-template-columns:240px minmax(0,1fr) 212px;align-items:start;
      max-width:1600px;margin:0 auto}
.lb-rail{position:sticky;top:60px;max-height:calc(100vh - 60px);overflow-y:auto;
         border-right:1px solid var(--s-chrome-border);padding:var(--gw-space-24) 0}
.lb-rail__t{font:var(--gw-text-body-12-med);text-transform:uppercase;letter-spacing:.06em;
            color:var(--gw-color-neutral-400);padding:0 var(--gw-space-20) var(--gw-space-8)}
.lb-rail a{display:flex;justify-content:space-between;gap:var(--gw-space-8);
           font:var(--gw-text-body-14-reg);color:var(--s-body);text-decoration:none;
           padding:6px var(--gw-space-20)}
.lb-rail a:hover{background:var(--s-nav-hover);color:var(--s-heading)}
.lb-rail a.on{background:var(--s-nav-sel);color:var(--s-heading);
              font:var(--gw-text-body-14-sem)}
.lb-rail a span{color:var(--gw-color-neutral-400);font:var(--gw-text-body-12-reg);flex:none}
.lb-rail a.on span{color:var(--s-heading)}
.lb-rail__sep{margin:var(--gw-space-12) var(--gw-space-20) var(--gw-space-8);
              border-top:1px solid var(--s-chrome-border)}

.lb-mid{grid-column:2;padding:var(--gw-space-32) var(--gw-space-40) var(--gw-space-80);
        min-width:0;display:flex;flex-direction:column;gap:var(--gw-space-24)}
.lb-toc{grid-column:3;position:sticky;top:60px;max-height:calc(100vh - 60px);overflow-y:auto;
        padding:var(--gw-space-32) var(--gw-space-20);display:flex;flex-direction:column;
        gap:5px}
.lb-toc b{font:var(--gw-text-body-12-med);text-transform:uppercase;letter-spacing:.06em;
          color:var(--gw-color-neutral-400);margin-bottom:3px}
.lb-toc a{font:var(--gw-text-body-14-reg);color:var(--gw-color-neutral-600);
          text-decoration:none;line-height:1.35}
.lb-toc a:hover{color:var(--gw-color-primary-600)}
.lb-toc a.l3{padding-left:var(--gw-space-12)}
@media (max-width:1180px){.lb-3{grid-template-columns:220px minmax(0,1fr)}
                          .lb-toc{display:none}}
@media (max-width:820px){.lb-3{grid-template-columns:1fr}
                         .lb-rail{position:static;max-height:none;border-right:0;
                                  border-bottom:1px solid var(--s-chrome-border)}
                         .lb-mid{padding:var(--gw-space-24) var(--gw-space-20)}}

/* ---- page head ----------------------------------------------------------- */
.lb-h{display:flex;flex-direction:column;gap:var(--gw-space-8)}
.lb-h h1{font:var(--gw-text-h4);margin:0}
.lb-h .lede{font:var(--gw-text-body-16-reg);color:var(--s-body);margin:0;max-width:74ch}
.lb-row{display:flex;flex-wrap:wrap;gap:var(--gw-space-8);align-items:center}
.lb-meta{font-family:ui-monospace,"SF Mono",Menlo,monospace;font-size:11.5px;
         color:var(--gw-color-neutral-400)}

.chip{display:inline-flex;align-items:center;gap:5px;font:var(--gw-text-body-12-med);
      border-radius:var(--gw-radius-full);padding:3px var(--gw-space-8);white-space:nowrap}
.chip--measured{background:var(--gw-color-green-50);color:var(--gw-color-green-700)}
.chip--transcribed{background:var(--gw-color-yellow-50);color:var(--gw-color-yellow-700)}
.chip--ruled{background:var(--gw-color-primary-50);color:var(--gw-color-primary-700)}
.chip--structure{background:var(--gw-color-yellow-50);color:var(--gw-color-yellow-700)}
.chip--built-here{background:var(--gw-color-orange-50);color:var(--gw-color-orange-700)}
.chip--passed{background:var(--gw-color-green-500);color:var(--gw-color-white)}
.chip--pending{background:var(--gw-color-neutral-100);color:var(--gw-color-neutral-700)}
.chip--rejected{background:var(--gw-color-red-500);color:var(--gw-color-white)}
.chip--gap{background:var(--gw-color-red-50);color:var(--gw-color-red-700)}
.chip--web{background:var(--gw-color-primary-50);color:var(--gw-color-primary-700)}
:root[data-theme="dark"] .chip--measured{background:var(--gw-color-green-900);color:var(--gw-color-green-200)}
:root[data-theme="dark"] .chip--transcribed,
:root[data-theme="dark"] .chip--structure{background:var(--gw-color-yellow-900);color:var(--gw-color-yellow-100)}
:root[data-theme="dark"] .chip--ruled,
:root[data-theme="dark"] .chip--web{background:var(--gw-color-primary-900);color:var(--gw-color-primary-200)}
:root[data-theme="dark"] .chip--pending{background:var(--gw-color-neutral-800);color:var(--gw-color-neutral-300)}
:root[data-theme="dark"] .chip--built-here{background:var(--gw-color-orange-900);color:var(--gw-color-orange-100)}
:root[data-theme="dark"] .chip--gap{background:var(--gw-color-red-900);color:var(--gw-color-red-200)}

/* ---- markdown ------------------------------------------------------------ */
.md{display:flex;flex-direction:column;gap:var(--gw-space-12)}
.md h2{font:var(--gw-text-h6);margin:var(--gw-space-20) 0 0;scroll-margin-top:80px}
.md h3{font:var(--gw-text-h7);margin:var(--gw-space-16) 0 0;scroll-margin-top:80px}
.md h4,.md h5,.md h6{font:var(--gw-text-body-16-sem);margin:var(--gw-space-12) 0 0}
.md p{font:var(--gw-text-body-14-reg);letter-spacing:var(--gw-text-body-14-reg-tracking);
      color:var(--s-body);margin:0;max-width:80ch}
.md ul,.md ol{margin:0;padding-left:var(--gw-space-20);display:flex;
              flex-direction:column;gap:5px}
.md li{font:var(--gw-text-body-14-reg);color:var(--s-body);max-width:78ch}
.md code{font-family:ui-monospace,"SF Mono",Menlo,monospace;font-size:12px;
         background:var(--s-code-bg);border:1px solid var(--s-code-border);
         color:var(--s-code-fg);border-radius:var(--gw-radius-4);padding:1px 5px}
.md a{color:var(--gw-color-primary-600)}
.md-pre{background:var(--s-card-bg);border:1px solid var(--s-card-border);
        border-radius:var(--gw-radius-8);padding:var(--gw-space-16);overflow-x:auto;margin:0}
.md-pre code{background:none;border:0;padding:0;color:var(--s-body);font-size:12px}
.md-q{margin:0;border-left:3px solid var(--gw-color-neutral-300);
      padding:var(--gw-space-8) var(--gw-space-16);font:var(--gw-text-body-14-reg);
      color:var(--s-body)}
.md-hr{border:0;border-top:1px solid var(--s-card-border);margin:var(--gw-space-12) 0}
.md-tblwrap{overflow-x:auto}
.md-tbl{width:100%;border-collapse:collapse;background:var(--s-card-bg);
        border:1px solid var(--s-card-border);border-radius:var(--gw-radius-8);
        overflow:hidden;font:var(--gw-text-body-14-reg)}
.md-tbl th{text-align:left;font:var(--gw-text-body-12-med);text-transform:uppercase;
           letter-spacing:.06em;color:var(--gw-color-neutral-400);
           padding:var(--gw-space-8) var(--gw-space-12);
           border-bottom:1px solid var(--s-card-border);white-space:nowrap}
.md-tbl td{padding:var(--gw-space-8) var(--gw-space-12);color:var(--s-body);
           border-bottom:1px solid var(--s-card-border);vertical-align:top}
.md-tbl tr:last-child td{border-bottom:none}
.md-tbl code{white-space:nowrap}

.note{font:var(--gw-text-body-14-reg);color:var(--s-body);
      background:var(--gw-color-neutral-25);border:1px solid var(--s-card-border);
      border-left:3px solid var(--gw-color-neutral-300);border-radius:var(--gw-radius-8);
      padding:var(--gw-space-12) var(--gw-space-16);white-space:pre-wrap;max-width:88ch}
:root[data-theme="dark"] .note{background:var(--gw-color-neutral-900)}
.note--find{border-left-color:var(--gw-color-yellow-400);white-space:normal}
.empty{border:1px dashed var(--s-field-border);border-radius:var(--gw-radius-10);
       padding:var(--gw-space-24);text-align:center;font:var(--gw-text-body-14-reg);
       color:var(--gw-color-neutral-400)}
.sec{display:flex;flex-direction:column;gap:var(--gw-space-12)}
.sec h2{font:var(--gw-text-h6);margin:0;scroll-margin-top:80px}
"""


INDEX_CSS = """
.lb-wrap{max-width:1240px;margin:0 auto;padding:var(--gw-space-40) var(--gw-space-24)
         var(--gw-space-80);display:flex;flex-direction:column;gap:var(--gw-space-40)}
.lb-ban{position:relative;overflow:hidden;border-radius:var(--gw-radius-16);
        background:var(--gw-color-primary-500);color:var(--gw-color-white);
        padding:var(--gw-space-56) var(--gw-space-48)}
/* The lattice is rebuilt from the documented slide-ground tokens — pitch, line weight and
   opacity — rather than a pattern invented here. It is a SLIDES token used on a non-slides
   surface; declared in the notice rather than done quietly. */
.lb-ban::before{content:"";position:absolute;inset:0;opacity:var(--gw-slide-grid-opacity);
  background-image:linear-gradient(var(--gw-color-neutral-alpha-30-white) var(--gw-slide-grid-line),transparent 0),
                   linear-gradient(90deg,var(--gw-color-neutral-alpha-30-white) var(--gw-slide-grid-line),transparent 0);
  background-size:var(--gw-slide-grid-pitch) var(--gw-slide-grid-pitch)}
.lb-ban__c,.lb-ban__s{position:relative}
.lb-ban h1{font:var(--gw-text-h2);margin:0 0 var(--gw-space-8);color:var(--gw-color-white)}
.lb-ban p{font:var(--gw-text-body-18-reg);margin:0;
          color:var(--gw-color-neutral-alpha-80-white)}
.lb-ban__s{display:flex;flex-wrap:wrap;gap:var(--gw-space-32);margin-top:var(--gw-space-32)}
.lb-ban__s b{display:block;font:var(--gw-text-h6);color:var(--gw-color-white);
             font-feature-settings:"tnum" 1}
.lb-ban__s span{font:var(--gw-text-body-12-med);text-transform:uppercase;
                letter-spacing:.06em;color:var(--gw-color-neutral-alpha-80-white)}
.lb-tier{display:flex;flex-direction:column;gap:var(--gw-space-16)}
.lb-tier__h{display:flex;align-items:baseline;gap:var(--gw-space-12);flex-wrap:wrap}
.lb-tier__h h2{font:var(--gw-text-h7);margin:0}
.lb-tier__h span{font:var(--gw-text-body-14-reg);color:var(--s-body)}
.lb-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(268px,1fr));
         gap:var(--gw-space-16)}
.lb-card{display:flex;flex-direction:column;gap:var(--gw-space-8);text-decoration:none;
         background:var(--s-card-bg);border:1px solid var(--s-card-border);
         border-radius:var(--gw-radius-12);padding:var(--gw-space-24);min-height:172px;
         transition:border-color 140ms ease}
.lb-card:hover{border-color:var(--gw-color-primary-500)}
.lb-card:focus-visible{outline:var(--gw-focus-ring);outline-offset:var(--gw-focus-offset)}
.lb-card__ic{color:var(--gw-color-primary-500);margin-bottom:auto}
.lb-card__ic svg{width:22px;height:22px;display:block}
.lb-card__t{font:var(--gw-text-h7);color:var(--s-heading)}
.lb-card__m{display:flex;flex-wrap:wrap;gap:5px}
.pill{font:var(--gw-text-body-12-med);color:var(--gw-color-neutral-700);
      background:var(--gw-color-neutral-50);border-radius:var(--gw-radius-4);padding:2px 7px}
:root[data-theme="dark"] .pill{background:var(--gw-color-neutral-800);
                               color:var(--gw-color-neutral-300)}
.lb-card--big{min-height:196px;grid-column:span 2}
.lb-card--big .lb-card__t{font:var(--gw-text-h5)}
@media (max-width:640px){.lb-card--big{grid-column:span 1}}
.lb-card--empty{border-style:dashed;background:transparent}
.lb-card--empty .lb-card__ic{color:var(--gw-color-neutral-300)}
.lb-card--empty .lb-card__t{color:var(--gw-color-neutral-600)}
"""

JS = """
(function(){
  /* Theme: the same two localStorage keys the main site uses, so a choice made there
     carries here and back. 'system' can still arrive from an older stored value and
     resolves to light, matching shell.js. */
  var PREF='gw-theme-pref', RES='gw-theme';
  function pref(){try{var v=localStorage.getItem(PREF);
    if(v==='light'||v==='dark')return v;
    if(v==='system')return 'light';
    var o=localStorage.getItem(RES);
    return (o==='dark'||o==='light')?o:'light';}catch(e){return 'light'}}
  function apply(p){var r=p==='dark'?'dark':'light';
    document.documentElement.setAttribute('data-theme',r);
    try{localStorage.setItem(PREF,p);localStorage.setItem(RES,r)}catch(e){}
    var b=document.getElementById('lb-theme');
    if(b)b.setAttribute('aria-label',r==='dark'?'Switch to light':'Switch to dark');}
  var btn=document.getElementById('lb-theme');
  if(btn)btn.addEventListener('click',function(){
    apply(document.documentElement.getAttribute('data-theme')==='dark'?'light':'dark')});
  apply(pref());

  /* Rail filter. Narrows the inventory in place — it does not navigate, because the
     rail is a list of siblings and losing your place to search them is worse than
     scrolling. */
  var f=document.getElementById('lb-find');
  if(f){
    var rows=[].slice.call(document.querySelectorAll('.lb-rail a'));
    f.addEventListener('input',function(){
      var t=f.value.trim().toLowerCase();
      rows.forEach(function(a){
        a.hidden=!!t&&a.getAttribute('data-q').indexOf(t)===-1});
    });
  }

  /* Mark the on-this-page entry for whatever heading is currently at the top. */
  var toc=[].slice.call(document.querySelectorAll('.lb-toc a'));
  if(toc.length){
    var heads=toc.map(function(a){return document.getElementById(a.hash.slice(1))})
                 .filter(Boolean);
    var tick=function(){
      var best=0;
      heads.forEach(function(h,i){if(h.getBoundingClientRect().top<=90)best=i});
      toc.forEach(function(a,i){a.style.color=i===best?'var(--gw-color-primary-600)':''});
    };
    document.addEventListener('scroll',tick,{passive:true});tick();
  }
})();
"""


def ic(name):
    path = CL.ICONS.get(name, "") if hasattr(CL, "ICONS") else ""
    return (f'<svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">'
            f'<path d="{path}"/></svg>')


# Glyph paths, read out of web/shell.js so the library uses the same Figma-verified set
# the site nav does rather than a second copy that can drift from it.
def load_icons():
    import re
    s = open(os.path.join(ROOT, "web", "shell.js"), encoding="utf-8").read()
    blk = s[s.index("var ICON = {"):]
    blk = blk[:blk.index("\n  };")]
    return dict(re.findall(r"'([a-z-]+)':\s*'([^']+)'", blk))


ICONS = load_icons()
CL.ICONS = ICONS

MARK = ('<svg viewBox="0 0 80 80" fill="none" aria-hidden="true">'
        '<path d="M76.6088 4.56344C77.5025 2.36058 75.8495 0 73.4723 0H9.14286C4.0934 0 0 '
        '4.0934 0 9.14286V66.7778C0 72.018 5.17081 75.6829 9.9603 73.5568C40.8494 59.8449 '
        '64.3785 34.7075 76.6088 4.56344Z" fill="currentColor"/>'
        '<path d="M32.5161 80C31.4022 80 30.9357 78.5531 31.8259 77.8835C54.9007 60.5265 '
        '71.4338 35.8047 78.7658 8.0522C78.9403 7.39154 80 7.51618 80 8.19951V70.8571C80 '
        '75.9066 75.9066 80 70.8571 80H32.5161Z" fill="currentColor"/></svg>')


def chrome(page, extra_css=""):
    d = page.depth
    tokens = up(d) + "foundation/tokens.css"
    # shell.css is loaded for its --s-* surface layer only; its chrome rules are gated.
    shell = up(d) + "shell.css"
    home = up(d) + "library/index.html"
    crumb = f'<span class="lb-crumb">{page.crumb}</span>' if page.crumb else ""
    find = ('<input class="lb-find" id="lb-find" type="search" '
            'placeholder="Filter this library">' if page.rail else "")
    rail = ""
    if page.rail:
        rows = []
        for label, link, on, note in page.rail:
            if label is None:
                rows.append('<div class="lb-rail__sep"></div>')
                continue
            q = f"{label} {note}".lower()
            n = f"<span>{esc(note)}</span>" if note else ""
            rows.append(f'<a href="{esc(link)}" data-q="{esc(q)}"'
                        f'{" class=\"on\"" if on else ""}>{esc(label)}{n}</a>')
        rail = (f'<nav class="lb-rail"><div class="lb-rail__t">'
                f'{esc(page.rail_title)}</div>{"".join(rows)}</nav>')
    toc = ""
    if page.toc:
        links = "".join(
            f'<a href="#{esc(s)}" class="l{lv}">{esc(t)}</a>' for lv, t, s in page.toc)
        toc = f'<div class="lb-toc"><b>On this page</b>{links}</div>'

    head = ""
    if page.title:
        head = (f'<div class="lb-h"><h1>{esc(page.title)}</h1>'
                f'{f"<p class=\"lede\">{esc(page.lede)}</p>" if page.lede else ""}'
                f'{f"<div class=\"lb-row\">{page.chips}</div>" if page.chips else ""}'
                f'{f"<div class=\"lb-meta\">{page.meta}</div>" if page.meta else ""}</div>')

    if page.wide:
        body = f'<div class="lb-wrap">{page.body}</div>'
    else:
        body = (f'<div class="lb-3">{rail}<main class="lb-mid">{head}{page.body}</main>'
                f"{toc}</div>")

    return f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{esc(page.title or "Component Library")} — Gushwork</title>
<meta name="robots" content="noindex">
<script>try{{var t=localStorage.getItem('gw-theme');if(t!=='dark')t='light';
document.documentElement.setAttribute('data-theme',t)}}catch(e){{
document.documentElement.setAttribute('data-theme','light')}}</script>
<link rel="icon" type="image/svg+xml" href="{CL.favicon()}">
<link rel="stylesheet" href="{esc(tokens)}">
<link rel="stylesheet" href="{esc(shell)}">
<style>{CL.CSS}{CSS}{extra_css}</style>
</head>
<body>
<header class="lb-top">
  <a class="lb-brand" href="{esc(home)}">
    <span class="lb-brand__chip">{MARK}</span>
    <span class="lb-brand__n">Component Library</span></a>
  {crumb}
  <div class="lb-top__r">{find}
    <button class="lb-tbtn" id="lb-theme" type="button" aria-label="Switch theme">
      {ic('sun-dim')}</button></div>
</header>
{body}
<script>{JS}</script>
</body></html>
"""


# ---------------------------------------------------------------------------
# Library definitions
# ---------------------------------------------------------------------------

PARTS = [
    ("web", "Web", "squares-four",
     "Public marketing surfaces. Brand pages and ad landers both draw on this set."),
    ("ad-page", "Ad page", "sparkle",
     "The folds that kept getting used across ad landers over the last four to five "
     "months, drawn up in GW-Ads-Library. Harvested from what shipped, not proposed."),
    ("dashboard", "Dashboard", "desktop",
     "Logged-in product screens. A separate Button and Avatar set from web, by design."),
    ("slides", "Slides", "stack-overflow-logo", "Sales and discovery decks, 1920×1080."),
    ("lead-magnet", "Lead magnet", "download-simple",
     "The downloadable PDF behind an ad lander."),
    ("shared", "Shared", "check-circle",
     "Held once and merged into every surface, so a change is reported once."),
    ("ads", "Ad creatives", "toolbox",
     "Paid social and display units. Nothing measured yet."),
]

RECIPES = [
    ("ad-landing-page", "Ad landing page", "ad-page", "page-build Type=Ads",
     "Paid-ad destination. Navbar drops to logo + blue CTA, footer to a copyright line, "
     "primary button goes Blue."),
    ("brand-page", "Brand page", "web", "page-build Type=Brand",
     "Main-website page. Full nav and footer, primary button Black."),
    ("case-study", "Case study", "web", "measured page template",
     "One customer story. A measured template — copy it and fill it in."),
    ("dashboard-screen", "Dashboard screen", "dashboard", "—",
     "A logged-in product surface — KPI rows, tables, side nav, filters."),
    ("lead-magnet-doc", "Lead magnet", "lead-magnet", "print output",
     "The gated PDF itself — cover, interior, closer."),
    ("sales-deck", "Sales deck", "slides", "1920×1080", "A deck an AE drives on a call."),
    ("ad-creative", "Ad creative", "ads", "—",
     "Paid social and display units. Blocked on the ad surface being measured."),
]


# ---------------------------------------------------------------------------
# Token bindings — the appearance half of the ad-page measurement
# ---------------------------------------------------------------------------

def to_token(path):
    """Figma variable path -> --gw-* custom property. None when nothing maps.

    Rules rather than a lookup table: the ramps are regular and a table would need a
    line per step. The irregular cases are spelled out, and they are the ones
    tokens.css already flags — `500-main`, the bare white/black, the alpha steps."""
    import re as _re
    p = path.strip()
    for pat, fmt in (
        (r"Colors/Neutral/Alpha/(\d+)-(white|black)", "--gw-color-neutral-alpha-{0}-{1}"),
        (r"Colors/Neutral/(white|black)",             "--gw-color-{0}"),
        (r"Colors/(Primary|Secondary)/500-main",      "--gw-color-{0_lower}-500"),
        (r"Colors/(Primary|Neutral|Red|Yellow|Orange|Green)/(\d+)",
                                                      "--gw-color-{0_lower}-{1}"),
        (r"Spacing/(\d+)",                            "--gw-space-{0}"),
        (r"Radius/(\d+)",                             "--gw-radius-{0}"),
        (r"Shadows/S(\d+)",                           "--gw-shadow-s{0}"),
        (r"Headings?/(h\d(?:-bold)?)",                "--gw-text-{0}"),
        (r"Body/(body-\d+-(?:reg|med|sem))",          "--gw-text-{0}"),
        (r"Body/(link-\d+)",                          "--gw-text-{0}"),
        (r"Button/button-(\d+)-med",                  "--gw-text-button-{0}"),
    ):
        m = _re.fullmatch(pat, p)
        if m:
            g = m.groups()
            out = fmt
            for i, val in enumerate(g):
                out = out.replace("{%d_lower}" % i, val.lower()).replace("{%d}" % i, val)
            return out
    return None


def figma_font_to_css(v):
    """Figma's Font(...) blob -> the `font` shorthand tokens.css writes, so the two are
    comparable. Line-height keeps the unit Figma reports: tokens.css preserves that
    split deliberately, and normalising here would manufacture a mismatch on every
    style at 16px and below."""
    import re as _re
    m = _re.search(r'family: "([^"]+)", style: ([^,]+), size: ([\d.]+), weight: (\d+), '
                   r'lineHeight: ([\d.]+)', v)
    if not m:
        return None
    fam, _sty, size, w, lh = m.groups()
    lhf = float(lh)
    lh_s = f"{lhf:g}" if lhf < 5 else f"{int(lhf)}px"
    short = "display" if "Vert" in fam else "body"
    return f"{w} {int(float(size))}px/{lh_s} var(--gw-font-{short})"


def token_values():
    """tokens.css, FIRST occurrence of each name — note 11. A media-query override
    otherwise wins and every comparison below is made against the phone value."""
    import re as _re
    css = open(os.path.join(ROOT, "foundation", "tokens.css"), encoding="utf-8").read()
    out = {}
    for m in _re.finditer(r"^\s*(--gw-[a-z0-9-]+)\s*:\s*(.+?);", css, _re.M):
        out.setdefault(m.group(1), m.group(2).strip())
    return out


def load_built_here():
    p = os.path.join(ROOT, "exports", "ad-page", "built-here.json")
    return json.load(open(p, encoding="utf-8")) if os.path.isfile(p) else None


def built_here_component(c, bh):
    """A fold with no Figma behind it. The page it shipped in IS the spec, so the
    measurement is computed styles off the rendered page — and a finding here is a
    value the page uses that the system has no token for, which is a ruling waiting
    to be made, not a defect to fix quietly."""
    rows = "".join(
        f'<tr><td>{esc(f["kind"])}</td><td><code>{esc(f["value"])}</code></td>'
        f'<td class="num">{f["uses"]}</td><td>{esc(f["why"])}</td></tr>'
        for f in c["findings"])
    total = c["onToken"] + sum(f["uses"] for f in c["findings"])
    body = (
        f'<div class="note">No Figma component backs this fold. It exists only as built '
        f'HTML in the shipped lander, so that page is its source of truth — which makes it '
        f'<b>built-here</b>, the case the 15 Sep ruling is about: created here, and it has '
        f'to be measured and passed before it can enter <code>skills/</code>.</div>'
        f'<section class="sec" id="measured"><h2>Measured</h2>'
        f'<p style="font:var(--gw-text-body-14-reg);color:var(--s-body);margin:0">'
        f'Computed styles harvested off the rendered page, with the section located by the '
        f'page\'s own comment rather than a class name. '
        f'<b>{c["onToken"]} of {total}</b> resolved values map to a token. Height '
        f'{c["height"]}px at desktop.</p>'
        f'<div class="md-tblwrap"><table class="md-tbl"><tbody>'
        f'<tr><td>Built as</td><td><code>{esc(c["builtAs"])}</code></td></tr>'
        f'<tr><td>Step</td><td>{c["step"]} of the Ad landing page recipe</td></tr>'
        f'<tr><td>Source</td><td><code>{esc(bh["source"])}</code></td></tr>'
        f'<tr><td>Method</td><td>{esc(bh["method"])}</td></tr>'
        f'</tbody></table></div></section>')
    if c["findings"]:
        body += (
            f'<section class="sec" id="findings"><h2>Off-system values — '
            f'{len(c["findings"])}</h2>'
            f'<div class="note note--find">Each row is a value this fold uses that the '
            f'system has no token for. Either the token should exist or the page should '
            f'change; both are rulings, and neither is made here.</div>'
            f'<div class="md-tblwrap"><table class="md-tbl"><thead><tr><th>Kind</th>'
            f"<th>Value</th><th>Uses</th><th>Why it is off-system</th></tr></thead>"
            f"<tbody>{rows}</tbody></table></div></section>")
    toc = [(2, "Measured", "measured")]
    if c["findings"]:
        toc.append((2, "Off-system values", "findings"))
    return body, toc


def load_ad_vars():
    p = os.path.join(ROOT, "exports", "ad-page", "variables.json")
    return json.load(open(p, encoding="utf-8")) if os.path.isfile(p) else None


def render_bindings(binds, tok):
    """What this fold is attached to, and whether the system still agrees.

    Re-checked on every build rather than recorded once, so a token that moves in
    tokens.css and not in Figma surfaces here without anyone remembering to look."""
    import re as _re
    rows, n_ok, n_bad, n_un = [], 0, 0, 0
    for path in sorted(binds):
        val = binds[path]
        t = to_token(path)
        if not t:
            n_un += 1
            rows.append(f'<tr><td><code>{esc(path)}</code></td><td><code>—</code></td>'
                        f'<td>{esc(val)}</td>'
                        f'<td>{chip("gap", "no token")}</td></tr>')
            continue
        want = tok.get(t)
        shown = figma_font_to_css(val) if val.startswith("Font(") else val
        if want is None:
            n_bad += 1
            verdict = chip("gap", "not in tokens.css")
        elif val.startswith("Effect(") or _re.fullmatch(r"\d+", val) or shown is None:
            n_ok += 1
            verdict = chip("measured", "bound")
        elif shown.lower().replace(" ", "") == \
                want.lower().split("/*")[0].replace(" ", ""):
            n_ok += 1
            verdict = chip("measured", "agrees")
        else:
            n_bad += 1
            verdict = chip("gap", "drifted")
        rows.append(f'<tr><td><code>{esc(path)}</code></td>'
                    f'<td><code>{esc(t)}</code></td>'
                    f'<td>{esc(shown or val)}</td><td>{verdict}</td></tr>')
    summary = (f'{n_ok} agree'
               + (f' · {n_bad} drifted' if n_bad else "")
               + (f' · {n_un} with no token' if n_un else ""))
    return (f'<p style="font:var(--gw-text-body-14-reg);color:var(--s-body);margin:0">'
            f'{len(binds)} bindings — {summary}. Checked against '
            f'<code>foundation/tokens.css</code> at build time.</p>'
            f'<div class="md-tblwrap"><table class="md-tbl"><thead><tr>'
            f"<th>Figma variable</th><th>Token</th><th>Value</th><th></th>"
            f"</tr></thead><tbody>" + "".join(rows) + "</tbody></table></div>")


def load_ad_folds():
    p = os.path.join(ROOT, "exports", "ad-page", "folds.json")
    return json.load(open(p, encoding="utf-8")) if os.path.isfile(p) else None


PROV_RULE = dict(CL.PROV_RULE)
PROV_RULE["built-here"] = ("Created here, not measured from Figma. The shipped page is "
                           "its source of truth. Has to be measured and passed before it "
                           "can enter skills/.")
PROV_RULE["structure"] = ("Node ids, the breakpoint split and every width and height are "
                          "node-traceable. No fill, radius or type style has been read "
                          "off these nodes yet.")


def chip(cls, label, title=""):
    t = f' title="{esc(title)}"' if title else ""
    return f'<span class="chip chip--{cls}"{t}>{esc(label)}</span>'


def review_chip(rev):
    st = rev["state"]
    label = {"passed": "passed", "rejected": "rejected"}.get(st, "not reviewed")
    who = f'{rev["on"]} {rev["by"]}'.strip()
    return chip(st, label, who or "Has not been through a review pass")


def state_chips(prov, rev):
    return chip(prov, prov, PROV_RULE.get(prov, "")) + review_chip(rev)


# ---------------------------------------------------------------------------
# Builders
# ---------------------------------------------------------------------------

def build_foundations(groups, faces, reg, counts):
    """One page per token group, rail = the eleven groups."""
    lookup, phone = {}, {}
    for g in groups:
        for s in g.subs:
            for t in s.tokens:
                (lookup if t.context is None else phone).setdefault(t.name, t.value)
    tracking = {n: v for n, v in lookup.items() if n.endswith("-tracking")}
    fblock = (reg.get("shared") or {}).get("foundations") or {}

    keyed = []
    for g in groups:
        key = CL.foundation_key(g.title)
        if not key:
            continue
        keyed.append((key, g))

    pages, queue = [], []
    rail = [(CL.display_title(g).split(" — ")[0], f"{key}.html", False,
             str(sum(len(s.tokens) for s in g.subs) or ""))
            for key, g in keyed]

    for idx, (key, g) in enumerate(keyed):
        n = sum(len(s.tokens) for s in g.subs)
        unit = "tokens"
        counts["tokens"] += n
        if g.title.startswith("FONT FACES"):
            n, unit = len(CL.parse_faces(faces)), "faces"
        prov = CL.provenance(g, g.subs[0] if g.subs else CL.Sub("", ""))
        rev = CL.review_of(fblock, key)
        counts["rev_" + rev["state"]] = counts.get("rev_" + rev["state"], 0) + 1
        if rev["state"] != "passed":
            queue.append(("foundation", key, CL.display_title(g),
                          f"foundations/{key}", n, unit))

        if g.title.startswith("FONT FACES"):
            body = CL.render_faces(CL.parse_faces(faces), g.note)
            toc = []
        else:
            blocks, toc = [], []
            for s in g.subs:
                html = CL.render_sub(s, g, lookup, phone, tracking)
                if not html:
                    continue
                slug = CL.slug(s.title) if s.title else "all"
                toc.append((2, s.title or "All", slug))
                blocks.append(f'<section class="sec" id="{slug}">{html}</section>')
            body = "".join(blocks)

        note = f'<div class="note">{esc(g.note)}</div>' if g.note else ""
        my_rail = [(lbl, l, l == f"{key}.html", nt) for lbl, l, _, nt in rail]
        pages.append(Page(
            path=f"foundations/{key}",
            title=CL.display_title(g),
            lede=f"{n} {unit} · shared by every surface",
            crumb='<a href="../index.html">Library</a> / Foundations',
            rail=my_rail, rail_title=f"Foundations · {len(keyed)}",
            chips=state_chips(prov, rev),
            meta=f"review: bash scripts/review-pass.sh foundation {esc(key)}",
            body=note + body, toc=toc))
    return pages, queue, len(keyed)


def gaps_page(groups):
    for g in groups:
        if g.title.startswith("KNOWN GAPS"):
            return CL.parse_gaps(g.note)
    return []


def build_parts(reg, counts, ad, adv, tok):
    """One page per surface, plus one per component in it."""
    pages, queue = [], []
    ad_by = {c["key"]: c for c in (ad["components"] if ad else [])}
    bh = load_built_here()
    bh_by = {c["key"]: c for c in (bh["components"] if bh else [])}

    for skey, stitle, glyph, what in PARTS:
        block = reg.get(skey) or {}
        comps = block.get("components") or {}
        rblock = block.get("review") or {}
        names = sorted(comps)

        rail = [("Overview", "index.html", False, str(len(names)) if names else "")]
        rail.append((None, "", False, ""))
        rail += [(n, f"{n}.html", False, "") for n in names]

        # --- surface overview -------------------------------------------------
        rows = []
        for n in names:
            e = comps[n]
            rev = CL.review_of(rblock, n)
            counts["components"] += 1
            if rev["state"] == "passed":
                counts["comp_passed"] += 1
            else:
                queue.append((skey, n, n, f"parts/{skey}/{n}", "", ""))
            brk = ('<span class="chip chip--gap">breaking</span>'
                   if e.get("breaking") else "")
            rows.append(
                f'<tr><td><a href="{esc(n)}.html" style="color:var(--gw-color-primary-600);'
                f'text-decoration:none;font-family:ui-monospace,Menlo,monospace;'
                f'font-size:12px">{esc(n)}</a></td>'
                f'<td>{esc(e.get("version","—"))}</td>'
                f'<td>{esc(e.get("changed","—"))} {brk}</td>'
                f'<td><code>{esc(e.get("doc","—"))}</code></td>'
                f'<td>{review_chip(rev)}</td></tr>')
        if rows:
            table = ('<div class="md-tblwrap"><table class="md-tbl"><thead><tr>'
                     "<th>Component</th><th>Version</th><th>Spec last moved</th>"
                     "<th>Doc</th><th>Review</th></tr></thead><tbody>"
                     + "".join(rows) + "</tbody></table></div>")
        else:
            table = ('<div class="empty">Nothing measured yet. This shelf is here rather '
                     "than absent so the gap is visible — an absent surface reads as one "
                     "we do not build for.</div>")
        pages.append(Page(
            path=f"parts/{skey}/index",
            title=stitle, lede=what,
            crumb='<a href="../../index.html">Library</a> / Parts',
            rail=[(l, h, h == "index.html", n) for l, h, _, n in rail],
            rail_title=f"{stitle} · {len(names)}",
            chips=f'<span class="pill">{len(names)} components</span>',
            body=f'<section class="sec" id="inventory"><h2>What this library holds</h2>'
                 f"{table}</section>",
            toc=[(2, "What this library holds", "inventory")]))

        # --- one page per component ------------------------------------------
        for n in names:
            e = comps[n]
            rev = CL.review_of(rblock, n)
            my_rail = [(l, h, h == f"{n}.html", nt) for l, h, _, nt in rail]
            toc, body = [], ""

            if skey == "ad-page" and n in bh_by:
                body, toc = built_here_component(bh_by[n], bh)
                prov = "built-here"
            elif skey == "ad-page" and n in ad_by:
                c = ad_by[n]
                binds = (adv or {}).get("bindings", {}).get(n)
                body, toc = ad_component(c, ad, binds, tok)
                # A fold whose bindings are measured is no longer structure-only.
                prov = "measured" if binds else "structure"
            else:
                doc = e.get("doc", "")
                p = os.path.join(ROOT, "foundation" if skey == "shared" else
                                 os.path.join("exports", skey), doc)
                if doc and os.path.isfile(p):
                    src = open(p, encoding="utf-8").read()
                    body = f'<div class="md">{MD.render(src)}</div>'
                    toc = [(lv + 1 if lv < 3 else 3, t, s)
                           for lv, t, s in MD.headings(src) if lv >= 2][:24]
                    body = _anchor(body, toc)
                else:
                    body = ('<div class="empty">No spec doc for this component yet. '
                            "The registry knows it exists; nothing has been written "
                            "down.</div>")
                prov = "measured"

            pages.append(Page(
                path=f"parts/{skey}/{n}",
                title=n,
                lede=f"{stitle} · {e.get('doc','')}".strip(" ·"),
                crumb=f'<a href="../../index.html">Library</a> / '
                      f'<a href="index.html">{esc(stitle)}</a>',
                rail=my_rail, rail_title=f"{stitle} · {len(names)}",
                chips=state_chips(prov, rev) +
                      f'<span class="pill">v{esc(e.get("version","?"))}</span>' +
                      (f'<span class="pill">{esc(e.get("node",""))}</span>'
                       if e.get("node") else ""),
                meta=f"review: bash scripts/review-pass.sh {esc(skey)} {esc(n)}",
                body=body, toc=toc))
    return pages, queue


def _anchor(html, toc):
    """Give the headings the ids the on-this-page column points at."""
    import re
    slugs = [s for _, _, s in toc]
    i = [0]

    def sub(m):
        if i[0] < len(slugs):
            s = slugs[i[0]]; i[0] += 1
            return f'<{m.group(1)} id="{s}"'
        return m.group(0)
    return re.sub(r"<(h[23])(?![^>]*id=)", sub, html)


def ad_component(c, ad, binds=None, tok=None):
    """An ad-page fold: both breakpoints as Figma rendered them, then the numbers."""
    def shot(bp, label):
        if not bp:
            return ""
        if not bp.get("img"):
            return (f'<div class="empty">{label} — not pulled<br>'
                    f'<span class="lb-meta">{esc(bp["node"])} · '
                    f'{bp["w"]}×{bp["h"]}</span></div>')
        return (f'<figure style="margin:0;background:var(--s-card-bg);border:1px solid '
                f'var(--s-card-border);border-radius:var(--gw-radius-12);'
                f'padding:var(--gw-space-16)">'
                f'<img src="../../../assets/ad-page/{esc(bp["img"])}" alt="" '
                f'loading="lazy" style="display:block;width:100%;height:auto;'
                f'border-radius:var(--gw-radius-8)">'
                f'<figcaption class="lb-meta" style="display:flex;'
                f'justify-content:space-between;margin-top:8px">'
                f'<span>{esc(label)} · {esc(bp["node"])}</span>'
                f'<span>{bp["w"]}×{bp["h"]}</span></figcaption></figure>')

    d, p = c.get("desktop"), c.get("phone")
    note = f'<div class="note">{esc(c["note"])}</div>' if c.get("note") else ""
    reflow = ""
    if d and p:
        reflow = (f'<p style="font:var(--gw-text-body-14-reg);color:var(--s-body);'
                  f'margin:0">Phone is {p["h"] - d["h"]:+}px on desktop '
                  f'({d["h"]} → {p["h"]}).</p>')
    used = [s for s in ad["order"] if s.get("key") == c["key"]]
    where = ""
    if used:
        s = used[0]
        where = (f'<section class="sec" id="used"><h2>Where it is used</h2>'
                 f'<p style="font:var(--gw-text-body-14-reg);color:var(--s-body);margin:0">'
                 f'Step {s["step"]} of the <a href="../../recipes/ad-landing-page.html" '
                 f'style="color:var(--gw-color-primary-600)">Ad landing page</a> recipe, '
                 f'built there as <code>{esc(s["as"])}</code>.</p></section>')
    else:
        where = ('<section class="sec" id="used"><h2>Where it is used</h2>'
                 '<p style="font:var(--gw-text-body-14-reg);color:var(--s-body);margin:0">'
                 'Drawn and available, but the shipped lander does not use it.</p></section>')

    body = (f'{note}'
            f'<section class="sec" id="preview"><h2>Preview</h2>{reflow}'
            f'<div style="display:grid;grid-template-columns:minmax(0,1fr) 260px;'
            f'gap:var(--gw-space-16);align-items:start">'
            f'{shot(d, "Desktop")}{shot(p, "Phone")}</div></section>'
            f'{where}'
            f'<section class="sec" id="spec"><h2>Measured</h2>'
            f'<div class="note">Node ids, the breakpoint split and every width and height '
            f'are node-traceable. Token bindings are measured too — see below. The fold is '
            f'still shown as its Figma render rather than rebuilt, because what is measured '
            f'is WHICH tokens it attaches to, not the layout that arranges them.</div>'
            f'<div class="md-tblwrap"><table class="md-tbl"><thead><tr><th>Breakpoint</th>'
            f"<th>Node</th><th>Width</th><th>Height</th></tr></thead><tbody>"
            + "".join(
                f'<tr><td>{lbl}</td><td><code>{esc(bp["node"])}</code></td>'
                f'<td>{bp["w"]}</td><td>{bp["h"]}</td></tr>'
                for lbl, bp in (("Desktop", d), ("Phone", p)) if bp)
            + "</tbody></table></div></section>")
    toc = [(2, "Preview", "preview"), (2, "Where it is used", "used"),
           (2, "Measured", "spec")]
    if binds:
        body += (f'<section class="sec" id="bindings"><h2>Token bindings</h2>'
                 f'{render_bindings(binds, tok)}</section>')
        toc.append((2, "Token bindings", "bindings"))
    return body, toc


def build_recipes(reg, ad):
    """One page per deliverable. A recipe names parts and pins a decision; it owns nothing."""
    pages = []
    rail = [(t, f"{k}.html", False, "") for k, t, *_ in RECIPES]
    for key, title, surface, pins, what in RECIPES:
        block = reg.get(surface) or {}
        n = len(block.get("components") or {})
        my_rail = [(l, h, h == f"{key}.html", nt) for l, h, _, nt in rail]
        toc = []

        if key == "ad-landing-page" and ad:
            body, toc = ad_recipe(ad, reg)
        else:
            body = (f'<div class="note">The composition — which folds, in what order, '
                    f'with which defaults — is derived from the skill in a later pass. '
                    f'Writing the order by hand here would make this the fifth place it '
                    f'is written down.</div>'
                    f'<section class="sec" id="parts"><h2>Draws on</h2>'
                    f'<p style="font:var(--gw-text-body-14-reg);color:var(--s-body);'
                    f'margin:0">'
                    + (f'<a href="../parts/{esc(surface)}/index.html" '
                       f'style="color:var(--gw-color-primary-600)">{esc(surface)}</a>'
                       f' — {n} components, one shared set. This recipe names them; it '
                       f'does not own a copy.' if n else
                       f'<b>{esc(surface)}</b>, which has nothing measured yet.')
                    + "</p></section>")
            toc = [(2, "Draws on", "parts")]

        pin = (f'<span class="pill">pins {esc(pins)}</span>' if pins and pins != "—"
               else "")
        pages.append(Page(
            path=f"recipes/{key}", title=title, lede=what,
            crumb='<a href="../index.html">Library</a> / Recipes',
            rail=my_rail, rail_title=f"Recipes · {len(RECIPES)}",
            chips=pin + (chip("pending", "not derived") if key != "ad-landing-page"
                         else chip("structure", "structure measured")),
            body=body, toc=toc))
    return pages


BIND_OK = BIND_TOTAL = 0


def tally_bindings(adv, tok):
    """Counted, not stated — a hand-written figure here would be the one number on the
    page that cannot be re-derived."""
    global BIND_OK, BIND_TOTAL
    ok = total = 0
    for binds in (adv or {}).get("bindings", {}).values():
        for path, val in binds.items():
            total += 1
            t = to_token(path)
            if not t or t not in tok:
                continue
            shown = figma_font_to_css(val) if val.startswith("Font(") else val
            import re as _re
            if val.startswith("Effect(") or _re.fullmatch(r"\d+", val) or shown is None:
                ok += 1
            elif shown.lower().replace(" ", "") == \
                    tok[t].lower().split("/*")[0].replace(" ", ""):
                ok += 1
    BIND_OK, BIND_TOTAL = ok, total


def ad_recipe(ad, reg):
    by = {c["key"]: c for c in ad["components"]}
    ref, src = ad["reference"], ad["source"]
    rows = []
    for s in ad["order"]:
        k = s.get("key")
        c = by.get(k) if k else None
        if c:
            name, sub = c["name"], s["as"]
            link = f'../parts/ad-page/{k}.html'
            chip = '<span class="chip chip--measured">ad-page</span>'
        else:
            name = s.get("built") or s["as"]
            sub = ("web navbar under Type=Ads — expected, not a gap"
                   if s["as"] == "navbar" else
                   "no component here — drawn in the main web set")
            link = "#findings"
            chip = '<span class="chip chip--web">web library</span>'
        rows.append(
            f'<a href="{esc(link)}" style="display:grid;'
            f'grid-template-columns:32px minmax(0,1fr) auto;gap:var(--gw-space-16);'
            f'align-items:center;background:var(--s-card-bg);border:1px solid '
            f'var(--s-card-border);border-radius:var(--gw-radius-8);'
            f'padding:var(--gw-space-12) var(--gw-space-16);text-decoration:none">'
            f'<span style="font:var(--gw-text-body-14-sem);'
            f'color:var(--gw-color-neutral-400);font-feature-settings:\'tnum\' 1">'
            f'{s["step"]:02d}</span>'
            f'<span style="display:flex;flex-direction:column;gap:2px;min-width:0">'
            f'<b style="font:var(--gw-text-body-14-sem);color:var(--s-heading)">'
            f'{esc(name)}</b>'
            f'<span class="lb-meta">{esc(sub)}</span></span>{chip}</a>')

    borrowed = [s for s in ad["order"]
                if s["library"] != "ad-page" and s["as"] != "navbar"]
    unused = [c for c in ad["components"]
              if c["key"] not in {s.get("key") for s in ad["order"]}
              and c["kind"] == "fold"]
    finds = []
    if borrowed:
        names = ", ".join(f'<code>{esc(s["as"])}</code>' for s in borrowed)
        finds.append(f"<li><b>{len(borrowed)} folds the shipped page uses are not in this "
                     f"library.</b> {names} come from the main web set. Expected under the "
                     f"ruling that a recipe may reach across — recorded so it is a choice, "
                     f"not a surprise.</li>")
    if unused:
        finds.append("<li><b>" + str(len(unused)) + " fold here is unused by the shipped "
                     "page.</b> " + ", ".join(f'<b>{esc(c["name"])}</b>' for c in unused)
                     + ". Drawn and available; the lander chose the other hero.</li>")
    finds.append("<li><b>Two ads Figma files exist.</b> The design system records the ads "
                 "file as <code>O6g05YAT980r85VaDQha4h</code>; this library is measured "
                 f"from <code>{esc(src['fileKey'])}</code> ({esc(src['fileName'])}). Which "
                 "is authoritative has not been ruled.</li>")
    finds.append(
        f"<li><b>Appearance is measured, and the set is almost entirely on-system.</b> "
        f"{BIND_OK} of {BIND_TOTAL} variable bindings across the nine components map to a "
        f"<code>--gw-*</code> token and agree with <code>foundation/tokens.css</code>; none "
        f"disagree. The exception is the bare legacy <code>White</code> variable, bound on "
        f"both heroes and the CTA footer — <code>tokens.css</code> gap 9 says to prefer "
        f"<code>Colors/Neutral/white</code>. Re-checked on every build, so a token that "
        f"moves on one side and not the other shows up here on its own.</li>")

    body = (f'<div class="note">{esc(ref["navbar"])} · footer is {esc(ref["footer"])}. '
            f'Both follow from the pin rather than being set per component.</div>'
            f'<section class="sec" id="order"><h2>The page, in order</h2>'
            f'<p style="font:var(--gw-text-body-14-reg);color:var(--s-body);margin:0">'
            f'Read off the shipped lander\'s own section comments, not decided here. '
            f'Each row says which library the fold comes from.</p>'
            f'<div style="display:flex;flex-direction:column;gap:2px">'
            f'{"".join(rows)}</div></section>'
            f'<section class="sec" id="source"><h2>Source</h2>'
            f'<div class="md"><table class="md-tbl"><tbody>'
            f'<tr><td>Figma</td><td><code>{esc(src["fileName"])}</code> · '
            f'<code>{esc(src["fileKey"])}</code></td></tr>'
            f'<tr><td>Section</td><td><code>{esc(src["sectionName"])}</code> · '
            f'<code>{esc(src["section"])}</code></td></tr>'
            f'<tr><td>Reference page</td><td><code>{esc(ref["page"])}</code></td></tr>'
            f'<tr><td>Measured</td><td>{esc(src["measured"])} · '
            f'{esc(src["method"])}</td></tr>'
            f'</tbody></table></div></section>'
            f'<section class="sec" id="findings"><h2>Findings</h2>'
            f'<div class="note note--find"><ul style="margin:0;padding-left:20px;'
            f'display:flex;flex-direction:column;gap:8px">{"".join(finds)}</ul></div>'
            f"</section>")
    return body, [(2, "The page, in order", "order"), (2, "Source", "source"),
                  (2, "Findings", "findings")]


def build_index(reg, counts, groups_n, ad, gaps):
    def card(href_, glyph, title, pills, big=False, empty=False):
        cls = "lb-card" + (" lb-card--big" if big else "") + \
              (" lb-card--empty" if empty else "")
        p = "".join(f'<span class="pill">{esc(x)}</span>' for x in pills)
        return (f'<a class="{cls}" href="{esc(href_)}">'
                f'<span class="lb-card__ic">{ic(glyph)}</span>'
                f'<span class="lb-card__t">{esc(title)}</span>'
                f'<span class="lb-card__m">{p}</span></a>')

    f_card = card("foundations/color.html", "swatches", "Foundations",
                  ["Building blocks", f"{counts['tokens']} tokens",
                   f"{counts.get('rev_passed', 0)}/{groups_n} passed"], big=True)
    p_cards = []
    for skey, stitle, glyph, _ in PARTS:
        n = len((reg.get(skey) or {}).get("components") or {})
        p_cards.append(card(f"parts/{skey}/index.html", glyph, stitle,
                            [f"{n} components"] if n else ["nothing measured"],
                            empty=not n))
    r_cards = [card(f"recipes/{k}.html", "list", t,
                    [f"{s} parts", pins if pins != "—" else "no pin"])
               for k, t, s, pins, _ in RECIPES]

    stats = [("tokens", counts["tokens"]),
             ("components", counts["components"]),
             ("libraries", len(PARTS) + 1),
             ("recipes", len(RECIPES)),
             ("passed", f"{counts.get('rev_passed', 0) + counts['comp_passed']}"
                        f"/{groups_n + counts['components']}"),
             ("open gaps", len(gaps))]
    stat_html = "".join(f"<div><b>{v}</b><span>{esc(k)}</span></div>" for k, v in stats)

    body = (f'<div class="lb-ban"><div class="lb-ban__c"><h1>Component library</h1>'
            f'<p>Last updated {date.today().strftime("%-d %b %Y")} · generated from '
            f'tokens.css, the registries and the measured Figma</p></div>'
            f'<div class="lb-ban__s">{stat_html}</div></div>'
            f'<div class="lb-tier"><div class="lb-tier__h"><h2>Foundations</h2>'
            f'<span>Shared by everything below</span></div>'
            f'<div class="lb-grid">{f_card}</div></div>'
            f'<div class="lb-tier"><div class="lb-tier__h"><h2>Parts</h2>'
            f'<span>Components, by the surface they render on</span></div>'
            f'<div class="lb-grid">{"".join(p_cards)}</div></div>'
            f'<div class="lb-tier"><div class="lb-tier__h"><h2>Recipes</h2>'
            f'<span>Assemblies, by what you are making</span></div>'
            f'<div class="lb-grid">{"".join(r_cards)}</div></div>')
    return Page(path="index", title="", body=body, wide=True)


def build_review(queue, reg, gaps):
    rows = []
    for scope, key, label, path, n, unit in queue:
        cnt = f"{n} {unit}" if n else ""
        rows.append(
            f'<tr><td><a href="{esc(path)}.html" '
            f'style="color:var(--gw-color-primary-600);text-decoration:none">'
            f'<b>{esc(label)}</b></a>'
            f'{f"<br><span class=\"lb-meta\">{esc(cnt)}</span>" if cnt else ""}</td>'
            f'<td>{esc(scope)}</td>'
            f'<td><code>bash scripts/review-pass.sh {esc(scope)} {esc(key)}</code></td>'
            f'</tr>')
    tbl = ('<div class="md-tblwrap"><table class="md-tbl"><thead><tr><th>Item</th>'
           "<th>Library</th><th>Pass it with</th></tr></thead><tbody>"
           + "".join(rows) + "</tbody></table></div>") if rows else \
          '<div class="empty">Nothing is waiting on you.</div>'
    body = (f'<div class="note note--find">Passing something is what lets it into '
            f'<code>skills/</code>. Run the command beside a row, then regenerate. A '
            f're-measurement resets the row to pending on its own — that expiry is '
            f'already built and tested.</div>'
            f'<section class="sec" id="waiting"><h2>Waiting — {len(queue)}</h2>'
            f'{tbl}</section>'
            f'<section class="sec" id="gaps"><h2>Known gaps in the source — '
            f'{len(gaps)}</h2>{CL.render_gaps(gaps)}</section>')
    return Page(path="review", title="Review sheet",
                lede="Only what is waiting on you. Admin only.",
                crumb='<a href="index.html">Library</a> / Review',
                body=body,
                toc=[(2, "Waiting", "waiting"), (2, "Known gaps", "gaps")])


def main():
    groups, faces, _ = CL.parse_tokens_css(
        os.path.join(ROOT, "foundation", "tokens.css"))
    reg = CL.load_registries()
    ad = load_ad_folds()
    counts = {"tokens": 0, "components": 0, "comp_passed": 0}
    gaps = gaps_page(groups)

    f_pages, f_queue, groups_n = build_foundations(groups, faces, reg, counts)
    adv = load_ad_vars()
    tok = token_values()
    tally_bindings(adv, tok)
    p_pages, p_queue = build_parts(reg, counts, ad, adv, tok)
    r_pages = build_recipes(reg, ad)
    queue = f_queue + p_queue
    pages = ([build_index(reg, counts, groups_n, ad, gaps)]
             + f_pages + p_pages + r_pages
             + [build_review(queue, reg, gaps)])

    # A clean rebuild: a renamed component must not leave its old page behind, served
    # and wrong, with nothing reporting it.
    if os.path.isdir(OUTDIR):
        shutil.rmtree(OUTDIR)
    written = 0
    for pg in pages:
        extra = INDEX_CSS if pg.wide else ""
        out = os.path.join(OUTDIR, pg.path + ".html")
        os.makedirs(os.path.dirname(out), exist_ok=True)
        with open(out, "w", encoding="utf-8") as fh:
            fh.write(chrome(pg, extra))
        written += 1

    sys.stderr.write(
        f"  preview/library/ — {written} pages · {groups_n} foundation groups · "
        f"{counts['components']} components across {len(PARTS)} surfaces · "
        f"{len(RECIPES)} recipes · {len(queue)} waiting on review\n")


if __name__ == "__main__":
    main()
