<div class="rvp"><div class="vgroup"><div class="vhead"><code>Review grid</code><span class="vnote">A rating rail beside a two by two grid of review cards. Names the source and does not link to it.</span></div><div class="stage g-light" style="background:#f7f8f9;padding:24px;display:block"><div class="cx-x"><style>*{box-sizing:border-box}
h2,h3,p,ul,figure,blockquote{margin:0}ul{padding:0;list-style:none}
svg{display:block;flex:none}img{display:block;max-width:100%}a{color:inherit;text-decoration:none}
.cx-btn{display:inline-flex;align-items:center;justify-content:center;gap:var(--gw-space-8);height:44px;padding:var(--gw-space-16) var(--gw-space-20);border-radius:var(--gw-radius-8);font:var(--gw-text-button-16);box-shadow:var(--gw-shadow-s2);border:0;white-space:nowrap}
.cx-btn svg{width:18px;height:18px}
.cx-btn--blue{background:var(--gw-color-primary-500);color:var(--gw-color-white)}
.cx-btn--lg{height:52px;border-radius:var(--gw-radius-12);padding:var(--gw-space-16) var(--gw-space-16) var(--gw-space-16) var(--gw-space-20)}
.cx-btn--lg svg{width:16px;height:16px}
.cx-eyebrow{display:inline-flex;align-items:center;gap:var(--gw-space-4);padding:var(--gw-space-8);background:var(--gw-color-white);border:.5px solid var(--gw-color-neutral-100);border-radius:var(--gw-radius-full);font:500 14px/1 var(--gw-font-body);letter-spacing:0;color:var(--gw-color-neutral-900);box-shadow:var(--gw-shadow-s2)}
.cx-eyebrow svg{width:14px;height:14px}
.cx-eyebrow--blue{background:var(--gw-color-primary-25);border:0;box-shadow:none;color:var(--gw-color-primary-500)}

.cx-fold{display:flex;flex-direction:column;align-items:center;gap:var(--gw-space-60)}
.cx-fold > .cx-btn{flex:none}

.cx-fold .cx-btn--lg svg{width:16px;height:16px}


.cx-vs{width:100%;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:var(--gw-space-20);align-items:stretch}
.cx-card{position:relative;background:var(--gw-color-white);border-radius:var(--gw-radius-20);
  box-shadow:inset 0 0 0 2px var(--gw-color-neutral-50)}
.cx-card--gw{box-shadow:inset 0 0 0 2px var(--gw-color-neutral-100),var(--gw-shadow-s3)}
.cx-card hr{border:0;height:2px;margin:0;background:var(--gw-color-neutral-50);width:100%;flex:none}


.cx-mark{display:inline-block;font:var(--gw-text-h6-bold);letter-spacing:var(--gw-text-h6-bold-tracking);color:var(--gw-color-neutral-800);line-height:1}
.cx-mark img{height:24px;width:auto}
.cx-gwlogo{height:24px;width:auto;flex:none}


.cx-card--shot{padding:var(--gw-space-12)}
.cx-shot-head{display:flex;align-items:center;justify-content:space-between;gap:var(--gw-space-16);padding:var(--gw-space-24);min-height:79px}
.cx-shot{border-radius:var(--gw-radius-16);background:var(--gw-color-neutral-25);overflow:hidden;aspect-ratio:586/377;display:grid;place-items:center}
.cx-shot img{width:100%;height:100%;object-fit:cover}


.cx-metrics{width:84%;display:flex;flex-direction:column;gap:var(--gw-space-16)}
.cx-tiles{display:grid;grid-template-columns:1fr 1fr;gap:var(--gw-space-12) var(--gw-space-16)}
.cx-tile{background:var(--gw-color-white);border-radius:var(--gw-radius-8);padding:var(--gw-space-12) var(--gw-space-16);
  display:flex;flex-direction:column;gap:var(--gw-space-8)}
.cx-tile small{font:var(--gw-text-body-12-reg);letter-spacing:var(--gw-text-body-12-reg-tracking);color:var(--gw-color-neutral-500);line-height:16px}
.cx-tile b{display:flex;align-items:center;gap:var(--gw-space-8);font:var(--gw-text-h6-bold);letter-spacing:var(--gw-text-h6-bold-tracking);color:var(--gw-color-neutral-700);white-space:nowrap}
.cx-tile b span{display:inline-flex;align-items:center;gap:var(--gw-space-4);font:var(--gw-text-body-12-sem);letter-spacing:var(--gw-text-body-12-sem-tracking);color:var(--gw-color-green-500)}
.cx-tile b svg{width:12px;height:12px}
.cx-notrep{display:flex;align-items:center;justify-content:center;gap:var(--gw-space-8);height:40px;
  border:1px dashed var(--gw-color-neutral-200);border-radius:var(--gw-radius-8);
  font:var(--gw-text-body-12-sem);letter-spacing:var(--gw-text-body-12-sem-tracking);color:var(--gw-color-neutral-500)}
.cx-notrep svg{width:14px;height:14px}


.cx-diag{position:relative;overflow:hidden;min-height:666px;padding:72px var(--gw-space-24) 70px;
  display:flex;flex-direction:column;align-items:center;gap:69px;
  background-image:radial-gradient(circle,var(--gw-color-neutral-100) 1.5px,transparent 1.6px);
  background-size:22px 22px;background-position:-2.5px 4.5px}
.cx-diag::before{content:"";position:absolute;top:0;bottom:0;left:50%;width:2px;margin-left:-1px;z-index:0;
  background:repeating-linear-gradient(180deg,var(--gw-color-neutral-500) 0 8px,transparent 8px 16px)}
.cx-diag--gw::before{background:var(--gw-color-primary-500)}
.cx-stop{position:relative;z-index:1;display:flex;align-items:center;justify-content:center;gap:var(--gw-space-8);max-width:100%;
  --ring:var(--gw-color-neutral-100);
  background:var(--gw-color-white);border-radius:40px;
  padding:var(--gw-space-16) var(--gw-space-24);box-shadow:inset 0 0 0 1px var(--ring),var(--gw-shadow-s2);
  font:var(--gw-text-body-18-med);letter-spacing:var(--gw-text-body-18-med-tracking);color:var(--gw-color-neutral-900);text-align:center;line-height:18px}
.cx-stop .cx-mark{font:var(--gw-text-h8-bold);letter-spacing:var(--gw-text-h8-bold-tracking);line-height:20px;margin-left:var(--gw-space-4)}
.cx-stop .cx-gwlogo{height:20px;margin-left:var(--gw-space-8)}
.cx-stop--bad{background:var(--gw-color-red-25);--ring:var(--gw-color-red-100);color:var(--gw-color-red-500);
  font:var(--gw-text-body-16-med);letter-spacing:var(--gw-text-body-16-med-tracking);line-height:24px}
.cx-stop--good{background:var(--gw-color-primary-500);--ring:var(--gw-color-primary-600);color:var(--gw-color-white);
  font:var(--gw-text-body-16-med);letter-spacing:var(--gw-text-body-16-med-tracking);line-height:24px}
.cx-stop--bad svg,.cx-stop--good svg{width:24px;height:24px}

.cx-stop--search{box-shadow:inset 0 0 0 1px var(--ring),var(--gw-shadow-s3);padding:var(--gw-space-12);gap:var(--gw-space-4);white-space:nowrap;width:353px;max-width:100%;justify-content:flex-start;
  font:var(--gw-text-body-14-med);letter-spacing:var(--gw-text-body-14-med-tracking);line-height:14px;text-align:left}
.cx-stop--search img{width:12px;height:14px;flex:none}
.cx-stop--search .cx-q{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis}
.cx-cursor{position:absolute;left:241px;top:26px;width:26px;height:26px;pointer-events:none;z-index:2}

.cx-cursor img{position:absolute;left:50%;top:50%;width:39.1px;height:39.1px;max-width:none;margin:-19.55px 0 0 -19.55px;transform:rotate(-26.51deg)}
.cx-tip{position:absolute;left:259px;top:47px;z-index:2;pointer-events:none;white-space:nowrap;
  background:var(--gw-color-black);border-radius:var(--gw-radius-10);padding:var(--gw-space-4) var(--gw-space-8);
  font:var(--gw-text-body-10-med);letter-spacing:var(--gw-text-body-10-med-tracking);line-height:13px;color:var(--gw-color-neutral-alpha-80-white);
  filter:drop-shadow(0 14px 14px rgba(88,92,95,.1))}


.cx-card--reviews{padding:var(--gw-space-8) var(--gw-space-8) var(--gw-space-40);display:flex;flex-direction:column;gap:var(--gw-space-32)}
.cx-prof{display:flex;align-items:center;gap:var(--gw-space-16);padding:var(--gw-space-16);
  background:var(--gw-color-neutral-25);border:1px solid var(--gw-color-neutral-50);border-radius:var(--gw-radius-12)}
.cx-card:not(.cx-card--gw) .cx-prof{box-shadow:var(--gw-shadow-s2)}
.cx-prof-tile{flex:none;width:72px;height:72px;border-radius:var(--gw-radius-8);display:grid;place-items:center;background:var(--gw-color-neutral-100)}
.cx-prof-tile .cx-mark{font:var(--gw-text-h8-bold);letter-spacing:var(--gw-text-h8-bold-tracking)}
.cx-prof-tile--gw{background:var(--gw-color-primary-500)}
.cx-prof-tile--gw img{width:32px;height:32px}
.cx-prof-txt{display:flex;flex-direction:column;gap:var(--gw-space-8);min-width:0}
.cx-prof-txt h3{font:var(--gw-text-h7-bold);letter-spacing:var(--gw-text-h7-bold-tracking);color:var(--gw-color-black)}
.cx-score{display:flex;align-items:center;gap:var(--gw-space-12);font:var(--gw-text-body-18-sem);letter-spacing:var(--gw-text-body-18-sem-tracking);color:var(--gw-color-neutral-800)}
.cx-rvs{display:flex;flex-direction:column;gap:var(--gw-space-20)}
.cx-rv{display:flex;flex-direction:column;gap:var(--gw-space-16);padding:0 var(--gw-space-20)}
.cx-rv{position:relative}

.cx-rv + .cx-rv{padding-top:var(--gw-space-20)}
.cx-rv + .cx-rv::before{content:"";position:absolute;left:0;right:0;top:-2px;height:2px;background:var(--gw-color-neutral-50)}
.cx-rv-top{display:flex;align-items:center;gap:var(--gw-space-12);font:var(--gw-text-button-16);color:var(--gw-color-neutral-500)}
.cx-rv q{quotes:none;font:var(--gw-text-body-18-med);letter-spacing:var(--gw-text-body-18-med-tracking);color:var(--gw-color-neutral-800)}
.cx-rv small{font:var(--gw-text-body-14-reg);letter-spacing:var(--gw-text-body-14-reg-tracking);color:var(--gw-color-neutral-500)}


.cx-tp{--r:5;--c:#00b975;--sz:20px;display:inline-flex;gap:2px;flex:none}
.cx-tp[data-r^="1"]{--c:#e01c47}
.cx-tp[data-r^="2"]{--c:#ff8622}
.cx-tp[data-r^="3"]{--c:#ffce00}
.cx-tp[data-r^="4"]{--c:#91d868}
.cx-tp[data-r="5"],.cx-tp[data-r^="4.5"],.cx-tp[data-r^="4.6"],.cx-tp[data-r^="4.7"],.cx-tp[data-r^="4.8"],.cx-tp[data-r^="4.9"]{--c:#00b975}
.cx-tp--lg{--sz:24px}
.cx-tp i{width:var(--sz);height:var(--sz);--f:clamp(0%,calc((var(--r) - var(--n)) * 100%),100%);
  background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M12 16.175 15.65 15.25 17.175 19.95ZM20.4 10.1H13.975L12 4.05 10.025 10.1H3.6L8.8 13.85 6.825 19.9 12.025 16.15 15.225 13.85 20.4 10.1Z' fill='%23fff'/%3E%3C/svg%3E") center/100% no-repeat,
    linear-gradient(90deg,var(--c) var(--f),var(--gw-color-neutral-200) var(--f))}
.cx-tp i:nth-child(1){--n:0}.cx-tp i:nth-child(2){--n:1}.cx-tp i:nth-child(3){--n:2}.cx-tp i:nth-child(4){--n:3}.cx-tp i:nth-child(5){--n:4}


.cx-cmp3{position:relative;width:100%;border-radius:var(--gw-space-24);overflow:hidden;background:var(--gw-color-white)}

.cx-cmp3::after{content:"";position:absolute;inset:0;border:1px solid var(--gw-color-neutral-200);border-radius:inherit;pointer-events:none}
.cx-cmp3-row{display:grid;grid-template-columns:repeat(3,minmax(0,1fr))}
.cx-cmp3-row{position:relative}
.cx-cmp3-row > *{display:flex;align-items:center;gap:var(--gw-space-8);min-height:64px;padding:var(--gw-space-20);
  box-shadow:inset 0 0 0 .75px var(--gw-color-neutral-100);background:var(--gw-color-white)}
.cx-cmp3-head::after{content:"";position:absolute;left:0;right:0;bottom:0;height:1.5px;background:var(--gw-color-neutral-200)}
.cx-cmp3-row.cx-cmp3-head > *{justify-content:center;background:var(--gw-color-white)}
.cx-cmp3-head img{height:20px;width:auto}
.cx-cmp3-head .cx-mark{font:var(--gw-text-h7-bold);letter-spacing:var(--gw-text-h7-bold-tracking);line-height:20px}
.cx-cmp3-row > th{justify-content:flex-start;text-align:left;background:var(--gw-color-neutral-25);
  font:var(--gw-text-body-16-med);letter-spacing:var(--gw-text-body-16-med-tracking);color:var(--gw-color-neutral-900)}
.cx-cmp3-row > td{font:var(--gw-text-body-14-med);letter-spacing:var(--gw-text-body-14-med-tracking);color:var(--gw-color-neutral-900)}
.cx-cmp3-row > td.cx-gw{background:var(--gw-color-primary-25);color:var(--gw-color-primary-500)}
.cx-cmp3-row > td svg{width:20px;height:20px}
.cx-cmp3 table{border-collapse:collapse;width:100%;display:block}
.cx-cmp3 thead,.cx-cmp3 tbody{display:block}
.cx-cmp3-m{display:none}


.cx-card--pad{padding:var(--gw-space-40);display:flex;flex-direction:column;gap:var(--gw-space-24);overflow:hidden}
.cx-card-top{display:flex;align-items:center;justify-content:space-between;gap:var(--gw-space-16);min-height:31px}
.cx-card-top .cx-mark{font:var(--gw-text-h6-bold);letter-spacing:var(--gw-text-h6-bold-tracking)}
.cx-big-no{display:flex;align-items:center;gap:var(--gw-space-12);min-height:74px;
  font:var(--gw-text-h5);letter-spacing:var(--gw-text-h5-tracking);color:var(--gw-color-neutral-600)}
.cx-big-no svg{width:36px;height:36px}
.cx-price-l{font:var(--gw-text-body-16-med);letter-spacing:var(--gw-text-body-16-med-tracking);color:var(--gw-color-neutral-500)}
.cx-price{font:var(--gw-text-h4);letter-spacing:var(--gw-text-h4-tracking);color:var(--gw-color-black);margin-top:var(--gw-space-4)}
.cx-price span{font-weight:400}
.cx-ticks{display:flex;flex-direction:column;gap:var(--gw-space-12)}
.cx-ticks--roomy{gap:var(--gw-space-24)}
.cx-ticks--soft{gap:var(--gw-space-16)}
.cx-ticks li{display:flex;align-items:center;gap:var(--gw-space-8);font:var(--gw-text-body-18-med);letter-spacing:var(--gw-text-body-18-med-tracking);color:var(--gw-color-neutral-900)}
.cx-ticks li svg{width:24px;height:24px;flex:none}
.cx-ticks--soft li{color:var(--gw-color-neutral-500)}
.cx-ticks .cx-ok svg{color:var(--gw-color-primary-500)}
.cx-ticks .cx-no svg{color:var(--gw-color-red-500)}
.cx-ticks .cx-na svg{color:var(--gw-color-neutral-500)}
.cx-card-title{font:var(--gw-text-h6);letter-spacing:var(--gw-text-h6-tracking);color:var(--gw-color-black)}
.cx-card-title b{font-weight:inherit}
.cx-card-title .cx-bad{color:var(--gw-color-red-500)}
.cx-card-title .cx-good{color:var(--gw-color-primary-500)}


.cx-bar{width:100%;margin-top:calc(var(--gw-space-32) - var(--gw-space-60));display:flex;align-items:center;justify-content:space-between;gap:var(--gw-space-24);
  background:var(--gw-color-black);border-radius:var(--gw-radius-20);padding:var(--gw-space-40)}
.cx-bar p{font:var(--gw-text-h5-bold);letter-spacing:var(--gw-text-h5-bold-tracking);color:var(--gw-color-white)}
.cx-bar .cx-btn{height:56px;padding:var(--gw-space-16) var(--gw-space-16) var(--gw-space-16) var(--gw-space-20);border-radius:var(--gw-radius-12);box-shadow:none}
.cx-bar .cx-btn svg{width:16px;height:16px}


.cx-cta-img{overflow:hidden}
.cx-ccard{position:absolute;left:50%;top:72px;transform:translateX(-50%);width:453px;
  background:var(--gw-color-white);border-radius:15px;padding:44px;
  box-shadow:0 0 0 11px var(--gw-color-neutral-100),var(--gw-shadow-s2);
  display:flex;flex-direction:column;gap:18px}
.cx-ccard h3{font:var(--gw-text-h8-bold);font-size:20px;line-height:1.4;letter-spacing:0;color:var(--gw-color-black)}
.cx-ccard hr{border:0;height:1px;background:var(--gw-color-neutral-100);margin:0}
.cx-ccard li{display:flex;align-items:center;justify-content:space-between;gap:var(--gw-space-12);padding:13px 0;
  border-bottom:1px solid var(--gw-color-neutral-100);font:var(--gw-text-body-12-reg);font-size:13px;line-height:18px;letter-spacing:-.002em;color:var(--gw-color-neutral-600)}
.cx-ccard li:last-child{border-bottom:0}
.cx-ccard li b{font-weight:600;color:var(--gw-color-primary-700);text-align:right}
.cx-cta-actions small{font:var(--gw-text-body-12-reg);letter-spacing:var(--gw-text-body-12-reg-tracking);color:var(--gw-color-neutral-alpha-80-white)}


.cx-hero h1 em{font-style:normal;background-image:linear-gradient(var(--h3-grad-angle,127.59deg),#0070ff 11.58%,#94c3ff 152.27%);
  -webkit-background-clip:text;background-clip:text;color:transparent}


.cx-faq-head .cx-h3{font:var(--gw-text-h4);letter-spacing:var(--gw-text-h4-tracking)}
.cx-dist{margin-left:auto;display:flex;flex-direction:column;gap:var(--gw-space-4);width:280px;flex:none}
.cx-dist div{display:grid;grid-template-columns:28px minmax(0,1fr) 36px;align-items:center;gap:var(--gw-space-8);
  font:var(--gw-text-body-12-med);letter-spacing:var(--gw-text-body-12-med-tracking);color:var(--gw-color-neutral-600)}
.cx-dist i{display:block;height:var(--gw-space-8);border-radius:var(--gw-radius-full);background:var(--gw-color-neutral-100);position:relative;overflow:hidden}
.cx-dist i::after{content:"";position:absolute;inset:0;width:var(--v);background:var(--c);border-radius:inherit;transform-origin:left}
.cx-dist b{text-align:right;font-weight:600}


.cx-rv-layout{width:100%;display:grid;grid-template-columns:minmax(0,300px) minmax(0,1fr);gap:var(--gw-space-20);align-items:start}
.cx-rv-rail{padding:var(--gw-space-24);display:flex;flex-direction:column;gap:var(--gw-space-16);}
.cx-rv-rail-head{display:flex;align-items:center;gap:var(--gw-space-12)}
.cx-rv-rail-head h3{font:var(--gw-text-h8-bold);letter-spacing:var(--gw-text-h8-bold-tracking);color:var(--gw-color-black)}
.cx-rv-rail-head .cx-prof-tile{width:48px;height:48px}
.cx-rv-rail-head .cx-prof-tile--gw img{width:24px;height:24px}
.cx-rv-score{display:flex;align-items:baseline;gap:var(--gw-space-8)}
.cx-rv-score b{font:var(--gw-text-h3);letter-spacing:var(--gw-text-h3-tracking);color:var(--gw-color-black)}
.cx-rv-score small{font:var(--gw-text-body-14-reg);letter-spacing:var(--gw-text-body-14-reg-tracking);color:var(--gw-color-neutral-500)}
.cx-rv-rail .cx-dist{margin-left:0;width:100%}
.cx-rv-cards{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:var(--gw-space-20)}
.cx-rv-card{padding:var(--gw-space-24);display:flex;flex-direction:column;justify-content:space-between;gap:var(--gw-space-16)}
.cx-rv-card q{quotes:none;font:var(--gw-text-body-18-med);letter-spacing:var(--gw-text-body-18-med-tracking);color:var(--gw-color-neutral-800)}
.cx-rv-card small{font:var(--gw-text-body-14-reg);letter-spacing:var(--gw-text-body-14-reg-tracking);color:var(--gw-color-neutral-500)}


</style><div class="cx-rv-layout" style="grid-template-columns:minmax(0,240px) minmax(0,1fr)"><aside class="cx-card cx-card--gw cx-rv-rail"><div class="cx-rv-rail-head"><span class="cx-prof-tile cx-prof-tile--gw"></span><h3>Company on Source</h3></div><div class="cx-rv-score"><b>0.0</b><small>0 reviews</small></div><span class="cx-tp cx-tp--lg" data-r="4.5" style="--r:4.5"><i></i><i></i><i></i><i></i><i></i></span><div class="cx-dist" role="img" aria-label="Rating breakdown: 5 stars 84%, 4 stars 10%, 3 stars 0%, 2 stars 0%, 1 star 6%"><div><span>5&#9733;</span><i style="--v:84%;--c:var(--gw-color-green-500)"></i><b>84%</b></div><div><span>4&#9733;</span><i style="--v:10%;--c:var(--gw-color-green-400)"></i><b>10%</b></div><div><span>3&#9733;</span><i style="--v:0%;--c:var(--gw-color-yellow-500)"></i><b>0%</b></div><div><span>2&#9733;</span><i style="--v:0%;--c:var(--gw-color-orange-500)"></i><b>0%</b></div><div><span>1&#9733;</span><i style="--v:6%;--c:var(--gw-color-red-500)"></i><b>6%</b></div></div></aside><div class="cx-rv-cards"><article class="cx-card cx-rv-card"><div class="cx-rv-top"><span class="cx-tp" data-r="5" style="--r:5"><i></i><i></i><i></i><i></i><i></i></span><span>for Topic</span></div><q>Quote one.</q><small>Name · Country · Date</small></article><article class="cx-card cx-rv-card"><div class="cx-rv-top"><span class="cx-tp" data-r="5" style="--r:5"><i></i><i></i><i></i><i></i><i></i></span><span>for Topic</span></div><q>Quote two.</q><small>Name · Country · Date</small></article></div></div></div></div></div></div></div></div>