<style>
.sd{width:100%;max-width:960px;margin:0 auto;container-type:inline-size;font-family:var(--gw-font-slide-display);-webkit-font-smoothing:antialiased}
:where(.sd) *{box-sizing:border-box;margin:0;padding:0}
/* 1920x1080 slide, every length is px/1920*100cqw so the frame scales whole */
.sd-slide{position:relative;width:100%;aspect-ratio:16/9;overflow:hidden;border-radius:1cqw;background:#0070ff;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:1.25cqw}
.sd-lattice{position:absolute;inset:0;opacity:.3;background-image:linear-gradient(to right,#0070ff 0,#0070ff 1px,transparent 1px),linear-gradient(to bottom,#0070ff 0,#0070ff 1px,transparent 1px);background-size:2.0833cqw 2.0833cqw;background-color:#fff;-webkit-mask-image:radial-gradient(ellipse 101.6% 174% at 48% 50%,transparent 0,#000 100%);mask-image:radial-gradient(ellipse 101.6% 174% at 48% 50%,transparent 0,#000 100%)}
.sd-eyebrow{position:relative;font:600 1.1458cqw/1.4 var(--gw-font-slide-display);letter-spacing:.04em;text-transform:uppercase;color:#ffffff99}
.sd-title{position:relative;font:700 3.75cqw/1.2 var(--gw-font-slide-display);color:#fff;max-width:70%}
.sd-cap{margin-top:10px;font:400 12px/1.4 var(--gw-font-body);color:var(--gw-color-neutral-600);text-align:center}
</style>
<div class="sd">
  <div class="sd-slide" role="img" aria-label="Section divider slide: eyebrow and centred white heading on the blue grid ground">
    <div class="sd-lattice"></div>
    <div class="sd-eyebrow">Act 02</div>
    <div class="sd-title">How the work gets done</div>
  </div>
  <p class="sd-cap">Section divider · ground only, no card · eyebrow, then heading at slide-title (72px of 1920), white, centred</p>
</div>
