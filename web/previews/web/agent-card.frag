<style>
.as{font:var(--gw-text-body-14-reg);color:var(--gw-color-black)}
.as .grid3{display:flex;gap:12px;flex-wrap:wrap}
.as .card{position:relative;display:flex;flex-direction:column;gap:16px;background:#fff;border:1px solid var(--gw-color-neutral-100);border-radius:var(--gw-radius-12);padding:16px;width:296px}
.as .card.prem{border-color:var(--gw-color-primary-100);box-shadow:var(--gw-shadow-s2)}
.as .top{display:flex;gap:12px;align-items:center}
.as .tile{position:relative;width:60px;height:60px;border-radius:8px;border:.5px solid var(--gw-color-neutral-100);overflow:hidden;flex:none;background:var(--gw-color-neutral-50)}
.as .tile img{position:absolute;left:50%;top:50%;width:70px;height:70px;max-width:none;transform:translate(-50%,-50%);object-fit:cover}
.as .tx{display:flex;flex-direction:column;gap:4px;min-width:0}
.as h3{font:var(--gw-text-body-16-sem);letter-spacing:var(--gw-text-body-16-sem-tracking)}
.as .one{font:var(--gw-text-body-12-med);letter-spacing:var(--gw-text-body-12-med-tracking);color:var(--gw-color-neutral-400)}
.as .one.price{color:var(--gw-color-primary-500)}
.as .desc{font:var(--gw-text-body-14-reg);letter-spacing:var(--gw-text-body-14-reg-tracking);color:var(--gw-color-neutral-600)}
.as .add{position:absolute;top:12px;right:12px;width:24px;height:24px;border-radius:var(--gw-radius-4);background:var(--gw-color-neutral-25);border:.5px solid var(--gw-color-neutral-100);display:grid;place-items:center;color:var(--gw-color-neutral-700)}
.as .add.live{background:var(--gw-color-primary-500);color:#fff}
.as .rail{width:240px;display:flex;flex-direction:column;gap:24px}
.as .rg{display:flex;flex-direction:column;gap:4px}
.as .rh{font:var(--gw-text-body-12-med);letter-spacing:var(--gw-text-body-12-med-tracking);color:var(--gw-color-neutral-600);padding:0 12px 4px}
.as .sel{height:44px;border-radius:8px;border:1px solid var(--gw-color-neutral-100);background:var(--gw-color-neutral-25);display:flex;align-items:center;justify-content:space-between;padding:0 11px 0 12px;font:var(--gw-text-body-14-med)}
.as .ri{display:flex;align-items:center;gap:8px;height:36px;padding:0 12px;border-radius:8px;border:1px solid var(--gw-color-neutral-50);font:var(--gw-text-body-14-med);color:var(--gw-color-neutral-700)}
.as .ri .n{margin-left:auto;font:var(--gw-text-body-12-med);color:var(--gw-color-neutral-500)}
.as .ri.on{background:#fff;border-color:var(--gw-color-neutral-100);color:var(--gw-color-black);box-shadow:var(--gw-shadow-s2)}
.as .sec{display:flex;align-items:center;gap:12px;margin-bottom:12px;width:100%}
.as .sec h4{font:var(--gw-text-h7)}
.as .pill{display:inline-flex;align-items:center;height:24px;padding:4px 8px;border-radius:99px;background:var(--gw-color-primary-25);border:.5px solid var(--gw-color-primary-100);font:var(--gw-text-body-12-med);color:var(--gw-color-primary-500)}
.as .bb{margin-left:auto;display:inline-flex;gap:8px;align-items:center;height:36px;padding:8px 12px;border-radius:8px;box-shadow:inset 0 0 0 1.5px var(--gw-color-neutral-100);font:var(--gw-text-button-14)}
.as .bb.done{background:var(--gw-color-primary-500);color:#fff;box-shadow:none}
</style><div class="rvp as"><div class="vgroup"><div class="vhead"><code>agent-card</code></div><div class="grid" style="--cellmin:320px"><div class="cell"><div class="stage g-light" style="align-items:flex-start;padding:24px;background:#f1f2f3"><div class="grid3"><div class="card"><div class="top"><div class="tile"><img src="/internal/staging/agent-store/assets/nuggets/laptop.png" alt=""></div><div class="tx"><h3>Front Desk</h3><span class="one">Tags every sales and PO email</span></div></div><p class="desc">Reads every email in the sales and orders inboxes, tags it as RFQ, PO, change or return, and gives it an owner in 10 minutes.</p><span class="add"><i style="display:inline-block;width:12px;height:12px;background:currentColor;-webkit-mask:url(/internal/staging/agent-store/assets/icons/plus-bold.svg) center/contain no-repeat;mask:url(/internal/staging/agent-store/assets/icons/plus-bold.svg) center/contain no-repeat"></i></span></div><div class="card"><div class="top"><div class="tile"><img src="/internal/staging/agent-store/assets/nuggets/calculator.png" alt=""></div><div class="tx"><h3>Margin Guard</h3><span class="one">Flags low-margin quotes</span></div></div><p class="desc">Checks every quote before it goes out and flags lines priced below floor or on stale cost.</p><span class="add live"><i style="display:inline-block;width:12px;height:12px;background:currentColor;-webkit-mask:url(/internal/staging/agent-store/assets/icons/check-bold.svg) center/contain no-repeat;mask:url(/internal/staging/agent-store/assets/icons/check-bold.svg) center/contain no-repeat"></i></span></div><div class="card prem"><div class="top"><div class="tile"><img src="/internal/staging/agent-store/assets/nuggets/glasses-doc.png" alt=""></div><div class="tx"><h3>SEO Agent</h3><span class="one price">From $1,000 / mo</span></div></div><p class="desc">Researches what buyers search for, writes and publishes pages on your site, and tracks rankings in Google and AI search.</p><span class="add"><i style="display:inline-block;width:12px;height:12px;background:currentColor;-webkit-mask:url(/internal/staging/agent-store/assets/icons/plus-bold.svg) center/contain no-repeat;mask:url(/internal/staging/agent-store/assets/icons/plus-bold.svg) center/contain no-repeat"></i></span></div></div></div><span class="cap">Standard, selected and premium (primary-100 border, S2 shadow, blue price). Selected is the blue check button only</span></div></div></div></div>
