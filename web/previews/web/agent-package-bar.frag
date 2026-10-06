<style>
.as{font:var(--gw-text-body-14-reg);color:var(--gw-color-black)}
.as .badge{display:inline-flex;align-items:center;height:22px;padding:2px 8px;border-radius:var(--gw-radius-full);font:var(--gw-text-body-12-med);background:var(--gw-color-neutral-50);color:var(--gw-color-neutral-700)}
.as .badge.k{background:var(--gw-color-black);color:var(--gw-color-white)}
.as .card{display:flex;flex-direction:column;gap:8px;background:#fff;border:1px solid var(--gw-color-neutral-100);border-radius:var(--gw-radius-16);padding:16px;box-shadow:var(--gw-shadow-s2);width:300px}
.as .card.sel{border-color:var(--gw-color-primary-500);box-shadow:0 0 0 1px var(--gw-color-primary-500)}
.as .ctop{display:flex;justify-content:space-between;align-items:center}
.as .add{width:28px;height:28px;border-radius:50%;border:1px solid var(--gw-color-neutral-200);display:grid;place-items:center;background:#fff;color:var(--gw-color-neutral-700)}
.as .sel .add{background:var(--gw-color-primary-500);border-color:var(--gw-color-primary-500);color:#fff}
.as .well{display:grid;place-items:center;padding:8px 0}
.as .well img{width:104px;height:104px;object-fit:cover;border-radius:var(--gw-radius-16)}
.as h3{font:var(--gw-text-body-16-sem)}
.as .desc{color:var(--gw-color-neutral-700);min-height:60px}
.as .ritem{display:flex;align-items:center;gap:8px;height:36px;padding:0 12px;border-radius:var(--gw-radius-8);font:var(--gw-text-body-14-med);color:var(--gw-color-neutral-700);width:232px}
.as .ritem.on{background:#fff;color:var(--gw-color-black);box-shadow:inset 0 0 0 1px var(--gw-color-neutral-100),var(--gw-shadow-s2)}
.as .ritem .n{margin-left:auto;font:var(--gw-text-body-12-med);color:var(--gw-color-neutral-500)}
.as .rh{font:var(--gw-text-body-12-med);color:var(--gw-color-neutral-600);padding:0 12px 4px;width:232px}
.as .bar{display:flex;align-items:center;gap:16px;background:var(--gw-color-black);color:#fff;border-radius:var(--gw-radius-16);padding:12px 12px 12px 16px;box-shadow:var(--gw-shadow-s4);width:560px}
.as .stack{display:flex}.as .stack img{width:32px;height:32px;border-radius:50%;border:2px solid var(--gw-color-black);margin-left:-10px;object-fit:cover}.as .stack img:first-child{margin-left:0}
.as .tx b{display:block;font:var(--gw-text-body-14-sem)}.as .tx span{font:var(--gw-text-body-12-med);color:var(--gw-color-neutral-300)}
.as .btnw{margin-left:auto;display:inline-flex;gap:8px;align-items:center;height:36px;padding:8px 12px;border-radius:var(--gw-radius-8);background:#fff;color:var(--gw-color-black);font:var(--gw-text-button-14)}
.as .btnk{display:flex;justify-content:center;gap:8px;align-items:center;height:44px;border-radius:var(--gw-radius-8);background:var(--gw-color-black);color:#fff;font:var(--gw-text-button-16);width:100%}
.as .panel{width:380px;background:var(--gw-color-neutral-25);border:1px solid var(--gw-color-neutral-100);border-radius:var(--gw-radius-16);overflow:hidden;box-shadow:var(--gw-shadow-s4)}
.as .panel .pb{padding:20px;display:flex;flex-direction:column;gap:16px}
.as .id{display:flex;gap:16px;align-items:center}.as .id img{width:80px;height:80px;border-radius:var(--gw-radius-16);object-fit:cover}
.as .id h2{font:var(--gw-text-h6-bold)}
.as .steps{display:grid;grid-template-columns:76px 1fr;gap:8px 12px;font:var(--gw-text-body-14-reg)}.as .steps b{font:var(--gw-text-body-12-med);color:var(--gw-color-neutral-600);padding-top:2px}
.as .rep{background:var(--gw-color-primary-25);border:1px solid var(--gw-color-primary-100);border-radius:var(--gw-radius-12);padding:12px;display:flex;flex-direction:column;gap:8px}
.as .rep small{display:block;font:var(--gw-text-body-12-med);color:var(--gw-color-primary-700)}
.as .pf{padding:16px 20px;border-top:1px solid var(--gw-color-neutral-100);background:#fff}
.as .sheet{width:720px;background:var(--gw-color-neutral-25);border:1px solid var(--gw-color-neutral-100);border-radius:var(--gw-radius-20);padding:20px;display:flex;flex-direction:column;gap:12px;box-shadow:var(--gw-shadow-s4)}
.as .stats{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.as .stat{background:#fff;border:1px solid var(--gw-color-neutral-100);border-radius:var(--gw-radius-12);padding:12px}.as .stat small{font:var(--gw-text-body-12-med);color:var(--gw-color-neutral-600)}.as .stat b{display:block;font:var(--gw-text-h6-bold)}
.as .nudge{background:var(--gw-color-primary-25);border:1px solid var(--gw-color-primary-100);border-radius:var(--gw-radius-12);padding:12px;font:var(--gw-text-body-14-med);color:var(--gw-color-primary-800);display:flex;gap:8px;align-items:center}
.as .trow{display:flex;justify-content:space-between;padding:12px;border:1px solid var(--gw-color-neutral-100);border-radius:var(--gw-radius-8);background:#fff;font:var(--gw-text-body-14-sem)}.as .trow.best{border-color:var(--gw-color-primary-500);background:var(--gw-color-primary-25)}
.as .two{display:grid;grid-template-columns:1fr 1fr;gap:12px}.as .pane{background:#fff;border:1px solid var(--gw-color-neutral-100);border-radius:var(--gw-radius-12);padding:12px;display:flex;flex-direction:column;gap:8px}
</style><div class="rvp as"><div class="vgroup"><div class="vhead"><code>agent-package-bar</code></div><div class="grid" style="--cellmin:320px"><div class="cell"><div class="stage g-light" style="align-items:flex-start;padding:24px"><div class="bar"><div class="stack"><img src="/internal/staging/agent-store/assets/nuggets/cap-ads.png"><img src="/internal/staging/agent-store/assets/nuggets/headphones.png"><img src="/internal/staging/agent-store/assets/nuggets/calculator.png"></div><div class="tx"><b>3 agents in your package</b><span>Starter · $600 / mo</span></div><span class="btnw">Build package <i style="display:inline-block;width:16px;height:16px;background:currentColor;-webkit-mask:url(/internal/staging/agent-store/assets/icons/arrow-right-bold.svg) center/contain no-repeat;mask:url(/internal/staging/agent-store/assets/icons/arrow-right-bold.svg) center/contain no-repeat"></i></span></div></div><span class="cap">Appears once an agent is added. Mascot stack, count, recommended tier and monthly price, then Build package</span></div></div></div></div>
