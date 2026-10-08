<style>
.dst{font:var(--gw-text-body-14-reg);color:var(--gw-color-black);display:flex;flex-direction:column;gap:20px}
.dst .cap{font:var(--gw-text-body-12-med);color:var(--gw-color-neutral-600);margin-bottom:8px}
.dst ol{list-style:none;margin:0;padding:0;display:flex;align-items:center;gap:8px}
.dst li{display:flex;align-items:center;gap:8px;font:var(--gw-text-body-12-med);color:var(--gw-color-neutral-500);white-space:nowrap}
.dst li+li::before{content:"";width:32px;height:1px;margin-right:4px;background:var(--gw-color-neutral-200)}
.dst li.d+li::before,.dst li.n::before{background:var(--gw-color-black)}
.dst .mk{width:20px;height:20px;display:grid;place-items:center;border-radius:var(--gw-radius-full);box-shadow:inset 0 0 0 1.5px var(--gw-color-neutral-200)}
.dst .d{color:var(--gw-color-neutral-700)}
.dst .d .mk{background:var(--gw-color-black);color:#fff;box-shadow:none}
.dst .n{color:var(--gw-color-black)}
.dst .n .mk{box-shadow:inset 0 0 0 1.5px var(--gw-color-black)}
.dst svg{width:12px;height:12px}
</style>
<div class="dst">
 <div><div class="cap">Step 1: Brief</div><ol><li class="n"><span class="mk">1</span>Brief</li><li><span class="mk">2</span>ChatGPT</li><li><span class="mk">3</span>Review</li></ol></div>
 <div><div class="cap">Step 2: ChatGPT is working</div><ol><li class="d"><span class="mk"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg></span>Brief</li><li class="n"><span class="mk">2</span>ChatGPT</li><li><span class="mk">3</span>Review</li></ol></div>
 <div><div class="cap">Step 3: Review</div><ol><li class="d"><span class="mk"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg></span>Brief</li><li class="d"><span class="mk"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg></span>ChatGPT</li><li class="n"><span class="mk">3</span>Review</li></ol></div>
</div>
