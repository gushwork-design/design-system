<style>
:host{
  --cs-content-w: 1280px;   
  --cs-article-w: 720px;    
  --cs-side-w: 280px;       
  --cs-gutter: 80px;        
  --cs-nav-h: 60px;
  --cs-rule: #e1e3e8;       
  --cs-radius-80: 80px;     
  --cs-radius-120: 120px;   
  --cs-grid-line: #ebecee;  
  --cs-figure-pad-x: 52px;  
  --cs-sticky-top: 80px;    
  --cs-texture-cell: 40px;  
}
*,*::before,*::after{box-sizing:border-box}
.cs-root{
  margin:0;background:var(--gw-color-white);color:var(--gw-color-neutral-800);
  font:var(--gw-text-body-16-reg);letter-spacing:var(--gw-text-body-16-reg-tracking);
  -webkit-font-smoothing:antialiased;
}
.cs-root img{display:block;max-width:100%}
[hidden]{display:none!important}
.cs-root a{color:inherit;text-decoration:none}
.cs-root h1,.cs-root h2,.cs-root h3,.cs-root h4,.cs-root p,.cs-root figure,.cs-root figcaption,.cs-root blockquote{margin:0}
.cs-root button{font:inherit;color:inherit;background:none;border:0;padding:0;cursor:pointer}
.cs-shell{width:100%;position:relative;overflow-x:clip}
.cs-inner{width:100%;max-width:var(--cs-content-w);margin:0 auto;padding:0 var(--gw-space-20)}
.cs-nav{
  position:fixed;inset:0 0 auto;z-index:100;height:var(--cs-nav-h);
  display:flex;align-items:center;justify-content:space-between;
  padding:0 max(100px, calc((100% - 1240px) / 2));
  background:var(--gw-color-neutral-25);
  border-bottom:1px solid var(--gw-color-neutral-100);
  box-sizing:border-box;
}
.cs-nav-progress{
  position:absolute;left:0;bottom:-1px;height:4px;width:0%;
  background:var(--gw-color-primary-500);
  transition:width .1s linear;
}
.cs-logo{display:flex;align-items:center;gap:4.8px;height:24px}
.cs-logo img{height:24px;width:auto}
.cs-nav-right{display:flex;align-items:center;gap:var(--gw-space-32)}
.cs-nav-links{display:none;align-items:center;gap:var(--gw-space-12)}
.cs-nav-link{
  display:inline-flex;align-items:center;gap:var(--gw-space-4);
  height:32px;padding:var(--gw-space-8) var(--gw-space-12);
  border-radius:var(--gw-radius-8);
  font:var(--gw-text-body-14-med);letter-spacing:var(--gw-text-body-14-med-tracking);
  color:var(--gw-color-black);
}
.cs-nav-link:hover{background:var(--gw-color-neutral-50)}
.cs-nav-link svg{width:10px;height:10px;flex:none;fill:currentColor}
.cs-nav-cta{
  display:inline-flex;align-items:center;justify-content:center;gap:var(--gw-space-8);
  height:36px;padding:var(--gw-space-8) var(--gw-space-12);
  background:var(--gw-color-primary-500);color:var(--gw-color-white);
  border-radius:var(--gw-radius-8);
  font:var(--gw-text-button-14);box-shadow:var(--gw-shadow-s2);
}
.cs-nav-cta svg{width:16px;height:16px;flex:none;fill:currentColor}
.cs-nav-cta:hover{background:var(--gw-color-primary-600)}
.cs-nav-burger{display:none;width:28px;height:28px;place-items:center;color:var(--gw-color-black)}
.cs-nav-burger svg{width:20px;height:20px;fill:currentColor}
.cs-hero{
  position:relative;
  background:var(--gw-color-neutral-50);
  border-radius:0 0 var(--gw-radius-20) var(--gw-radius-20);
  padding:150px 0 60px;
  overflow:clip;
  min-height:820px;
  display:flex;flex-direction:column;
}
.cs-hero-bg{position:absolute;inset:0;pointer-events:none;overflow:clip}
.cs-hero-grid{
  position:absolute;inset:0;
  background-image:
    linear-gradient(to right, var(--cs-grid-line) 1px, transparent 1px),
    linear-gradient(to bottom, var(--cs-grid-line) 1px, transparent 1px);
  background-size: var(--cs-texture-cell) var(--cs-texture-cell);
}
.cs-hero-swoosh{
  position:absolute;right:-540px;top:101px;width:2432px;height:956px;
  border:112px solid var(--gw-color-neutral-300);
  border-radius:50%;filter:blur(140px);opacity:.55;
}
.cs-hero-fade{
  position:absolute;inset:auto 0 0;height:282px;
  background:linear-gradient(to bottom,#f1f2f300,var(--gw-color-neutral-50));
}
.cs-hero-body{position:relative;flex:1 1 auto;display:flex;flex-direction:column;justify-content:space-between;gap:var(--gw-space-80)}
.cs-hero-top{display:flex;align-items:center;gap:64px}
.cs-hero-text{flex:1 1 auto;min-width:0;display:flex;flex-direction:column;gap:var(--gw-space-24)}
.cs-eyebrow{
  display:inline-flex;align-items:center;gap:var(--gw-space-4);
  align-self:flex-start;
  padding:var(--gw-space-4) var(--gw-space-8);
  background:var(--gw-color-white);
  border:0.5px solid var(--gw-color-neutral-100);
  border-radius:var(--gw-radius-full);
}
.cs-eyebrow svg{width:14px;height:14px;flex:none;fill:var(--gw-color-neutral-900)}
.cs-eyebrow span{
  font:500 12px/1 var(--gw-font-body);letter-spacing:0;
  color:var(--gw-color-neutral-900);
}
.cs-hero-heads{display:flex;flex-direction:column;gap:var(--gw-space-16)}
.cs-hero-title{
  font:var(--gw-text-h3);letter-spacing:var(--gw-text-h3-tracking);
  color:var(--gw-color-black);
}
.cs-hero-meta{display:flex;align-items:center;gap:var(--gw-space-12)}
.cs-hero-meta span{
  font:var(--gw-text-body-18-med);letter-spacing:var(--gw-text-body-18-med-tracking);
  color:var(--gw-color-neutral-800);
}
.cs-hero-meta i{width:4px;height:4px;border-radius:var(--gw-radius-full);background:var(--gw-color-neutral-500);flex:none}
.cs-hero-media{flex:none;width:580px;height:400px}
.cs-slot{
  position:relative;width:100%;height:100%;overflow:hidden;
  background:var(--gw-color-neutral-300);
  border:1px solid var(--gw-color-neutral-alpha-20-white);
  border-radius:var(--gw-radius-12);
  border-bottom-right-radius:var(--cs-radius-80);
  display:grid;place-items:center;
}
.cs-hero-logo{
  position:absolute;left:15px;top:15px;z-index:1;
  width:180px;height:80px;
  background:var(--gw-color-white);
  border-radius:var(--gw-radius-8);
  padding:var(--gw-space-12);
  display:grid;place-items:center;
}
.cs-hero-logo img{max-width:100%;max-height:100%;object-fit:contain}
.cs-hero-logo-label{
  font:var(--gw-text-body-12-reg);letter-spacing:var(--gw-text-body-12-reg-tracking);
  color:var(--gw-color-neutral-700);text-transform:uppercase;text-align:center;
}
.cs-hero-logo:has(.cs-hero-logo-label:not([hidden])){background:var(--gw-color-neutral-100)}
.cs-figure.cs-figure--generated{
  display:flex;align-items:stretch;gap:var(--gw-space-16);
  padding:var(--gw-space-60) var(--cs-figure-pad-x);
  background:var(--gw-color-primary-25);
}
.cs-growth-card{
  flex:1 1 0;min-width:0;display:flex;flex-direction:column;
  background:var(--gw-color-white);
  border:1px solid var(--gw-color-neutral-100);
  border-radius:var(--gw-radius-8);
  box-shadow:var(--gw-shadow-s2);
}
.cs-growth-card-header{
  padding:var(--gw-space-8) var(--gw-space-12);
  border-bottom:1px solid var(--gw-color-neutral-100);
}
.cs-growth-card-label{
  font:var(--gw-text-body-12-med);letter-spacing:var(--gw-text-body-12-med-tracking);
  color:var(--gw-color-black);
}
.cs-growth-card-body{
  flex:1 1 0;min-height:0;display:flex;flex-direction:column;gap:var(--gw-space-12);
  padding:var(--gw-space-16);
}
.cs-growth-card-value{
  font:700 20px/1.4 var(--gw-font-display);
  color:var(--gw-color-black);
}
.cs-growth-card-caption{
  font:var(--gw-text-body-12-reg);letter-spacing:var(--gw-text-body-12-reg-tracking);
  color:var(--gw-color-neutral-500);
}
.cs-growth-card-chart{display:flex;flex:1 1 0;min-height:0;gap:var(--gw-space-12)}
.cs-growth-card-yaxis{
  flex:none;display:flex;flex-direction:column;justify-content:space-between;
  padding-bottom:16px; 
  font:var(--gw-text-body-10-reg);letter-spacing:var(--gw-text-body-10-reg-tracking);
  color:var(--gw-color-neutral-500);
}
.cs-growth-card-plot{flex:1 1 0;min-width:0;display:flex;flex-direction:column;gap:var(--gw-space-12)}
.cs-growth-card-plot svg{width:100%;height:auto;display:block;flex:1 1 0;min-height:0}
.cs-growth-card-xaxis{
  display:flex;justify-content:space-between;
  font:var(--gw-text-body-10-reg);letter-spacing:var(--gw-text-body-10-reg-tracking);
  color:var(--gw-color-neutral-500);
}
.cs-slot img{width:100%;height:100%;object-fit:cover}
.cs-slot-label{
  font:var(--gw-text-body-12-reg);letter-spacing:var(--gw-text-body-12-reg-tracking);
  color:var(--gw-color-neutral-700);text-transform:uppercase;text-align:center;
}
.cs-stats{
  display:flex;gap:224px;
  padding-top:var(--gw-space-32);
  border-top:1px solid var(--cs-rule); 
}
.cs-stat{width:220px;display:flex;flex-direction:column;gap:10px}
.cs-stat b{
  font:var(--gw-text-h5);letter-spacing:var(--gw-text-h5-tracking);
  color:var(--gw-color-neutral-900);
}
.cs-stat span{
  font:var(--gw-text-body-16-med);letter-spacing:var(--gw-text-body-16-med-tracking);
  color:var(--gw-color-neutral-600);
}
.cs-article{background:var(--gw-color-white)}
.cs-article-inner{
  width:100%;max-width:1040px;margin:0 auto;
  display:flex;align-items:flex-start;gap:var(--gw-space-40);
  padding:var(--gw-space-120) var(--gw-space-20) var(--gw-space-160);
}
.cs-prose{
  flex:none;width:var(--cs-article-w);
  display:flex;flex-direction:column;gap:var(--gw-space-60);
}
.cs-block{display:flex;flex-direction:column;gap:var(--gw-space-16)}
.cs-block h2{
  font:var(--gw-text-h4);letter-spacing:var(--gw-text-h4-tracking);
  color:var(--gw-color-black);
}
.cs-copy{display:flex;flex-direction:column;gap:var(--gw-space-32)}
.cs-copy p,.cs-block > p{
  font:var(--gw-text-body-18-reg);letter-spacing:var(--gw-text-body-18-reg-tracking);
  color:var(--gw-color-neutral-800);
}
.cs-figure{width:100%;border-radius:var(--gw-radius-16);overflow:hidden;background:var(--gw-color-neutral-300);aspect-ratio:720 / 374;display:grid;place-items:center}
.cs-figure img{width:100%;height:100%;object-fit:cover}
.cs-tldr{
  display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:10px;
  background:var(--gw-color-neutral-50);
  border-radius:var(--gw-radius-16);
}
.cs-tldr-card{
  background:var(--gw-color-white);border-radius:var(--gw-radius-12);
  padding:var(--gw-space-24);
  display:flex;flex-direction:column;gap:10px;
}
.cs-tldr-card h3{
  font:var(--gw-text-body-14-sem);letter-spacing:var(--gw-text-body-14-sem-tracking);
  color:var(--gw-color-neutral-850);
}
.cs-tldr-card p{
  font:var(--gw-text-body-18-reg);letter-spacing:var(--gw-text-body-18-reg-tracking);
  color:var(--gw-color-neutral-800);
}
.cs-tldr-card--wide{
  grid-column:1 / -1;padding:45px var(--gw-space-24);
  border-bottom-right-radius:var(--cs-radius-120); 
}
.cs-quote{
  background:var(--gw-color-black);color:var(--gw-color-white);
  padding:var(--gw-space-24);
  display:flex;flex-direction:column;gap:var(--gw-space-24);
  border-radius:var(--gw-radius-20) var(--gw-radius-20) var(--gw-radius-8) var(--gw-radius-20);
}
.cs-quote-mark{width:31px;height:24px;fill:var(--gw-color-primary-500)}
.cs-quote-mark.is-hidden{display:none}
.cs-quote p{
  font:var(--gw-text-body-18-med);letter-spacing:var(--gw-text-body-18-med-tracking);
  color:var(--gw-color-white);
}
.cs-byline{display:flex;align-items:center;gap:var(--gw-space-12)}
.cs-byline-photo{
  flex:none;width:72px;height:52px;overflow:hidden;
  background:var(--gw-color-neutral-alpha-20-white);
  border-radius:var(--gw-radius-full);
  display:grid;place-items:center;
}
.cs-byline-photo img{width:100%;height:100%;object-fit:cover;filter:grayscale(1)}
.cs-byline-photo .cs-slot-label{color:var(--gw-color-neutral-alpha-60-white)}
.cs-byline-text{display:flex;flex-direction:column;gap:6px}
.cs-byline-text b{
  font:var(--gw-text-body-16-med);letter-spacing:var(--gw-text-body-16-med-tracking);
  color:var(--gw-color-white);
}
.cs-byline-text span{
  font:var(--gw-text-body-12-med);letter-spacing:var(--gw-text-body-12-med-tracking);
  color:var(--gw-color-neutral-400);text-transform:uppercase;
}
.cs-aside{
  flex:none;width:var(--cs-side-w);
  position:sticky;top:var(--cs-sticky-top);
}
.cs-card{
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  gap:var(--gw-space-32);
  background:var(--gw-color-neutral-25);
  border:1px solid var(--gw-color-neutral-100);
  border-radius:var(--gw-radius-20);
  padding:var(--gw-space-24);
  box-shadow:var(--gw-shadow-s3);
}
.cs-card-content{display:flex;flex-direction:column;gap:10px;width:100%}
.cs-card-people{width:70px;height:40px}
.cs-card-people img{width:100%;height:100%;object-fit:contain}
.cs-card h3{
  font:var(--gw-text-h7-bold);letter-spacing:var(--gw-text-h7-bold-tracking);
  color:var(--gw-color-black);
}
.cs-btn{
  display:flex;align-items:center;justify-content:center;gap:var(--gw-space-8);
  width:100%;height:44px;padding:var(--gw-space-12) var(--gw-space-16);
  background:var(--gw-color-primary-500);color:var(--gw-color-white);
  border-radius:var(--gw-radius-10);
  font:var(--gw-text-body-14-med);letter-spacing:var(--gw-text-body-14-med-tracking);
}
.cs-btn:hover{background:var(--gw-color-primary-600)}
.cs-footer{
  background:var(--gw-color-black);color:var(--gw-color-white);
  border-radius:var(--gw-radius-20) var(--gw-radius-20) 0 0;
  margin-top:calc(-1 * var(--gw-radius-20));
  padding:var(--gw-space-80) 0 0;
  overflow:clip;
}
.cs-footer-inner{max-width:var(--gw-content-width);margin:0 auto;padding:0 var(--gw-space-20)}
.cs-footer-main{display:grid;grid-template-columns:1fr 1fr;gap:var(--gw-space-16) var(--gw-space-100)}
.cs-footer-cols{display:grid;grid-template-columns:repeat(3,1fr);gap:var(--gw-space-60);max-width:600px}
.cs-footer-col h4{
  font:var(--gw-text-body-12-sem);letter-spacing:var(--gw-text-body-12-sem-tracking);
  color:var(--gw-color-neutral-200);
}
.cs-footer-list{display:flex;flex-direction:column;gap:var(--gw-space-12);margin-top:var(--gw-space-20)}
.cs-footer-list a{
  font:var(--gw-text-body-14-med);letter-spacing:var(--gw-text-body-14-med-tracking);
  color:var(--gw-color-neutral-400);
}
.cs-footer-list a:hover{color:var(--gw-color-white)}
.cs-footer-comp{display:flex;flex-direction:column;gap:22px}
.cs-footer-addr-row{display:flex;flex-wrap:wrap;gap:48px var(--gw-space-100)}
.cs-footer-addr-col{display:flex;flex-direction:column;gap:var(--gw-space-16)}
.cs-footer-contact{display:flex;flex-direction:column;gap:var(--gw-space-8)}
.cs-footer-social{display:flex;justify-content:flex-end;gap:var(--gw-space-16);margin-top:var(--gw-space-40)}
.cs-footer-social a{
  width:28px;height:28px;display:grid;place-items:center;
  border-radius:var(--gw-radius-8);color:var(--gw-color-neutral-500);
}
.cs-footer-social svg{width:14px;height:14px;fill:currentColor}
.cs-footer-social a:hover{color:var(--gw-color-white)}
.cs-footer-addr-col p,.cs-footer-addr-col a{
  max-width:184px;
  font:400 12px/1.4 var(--gw-font-body);letter-spacing:var(--gw-text-body-12-reg-tracking);
  color:var(--gw-color-neutral-alpha-60-white);
}
.cs-footer-addr-col a:hover{color:var(--gw-color-white)}
.cs-footer-legal{
  display:flex;align-items:center;justify-content:space-between;gap:var(--gw-space-24);
  margin-top:var(--gw-space-16);padding:6px 0 var(--gw-space-12);flex-wrap:wrap;
  font:var(--gw-text-body-12-reg);letter-spacing:var(--gw-text-body-12-reg-tracking);
  color:var(--gw-color-neutral-400); 
  border-top:1px solid var(--gw-color-neutral-alpha-10-white);
}
.cs-footer-legal div{display:flex;gap:var(--gw-space-24)}
.cs-footer-legal a{color:var(--gw-color-neutral-400)}
.cs-footer-legal a:hover{color:var(--gw-color-white)}
.cs-footer-legal > span{font:var(--gw-text-body-12-med);letter-spacing:var(--gw-text-body-12-med-tracking)}
.cs-footer-band{margin-top:112px}
.cs-footer-band img{width:100%;height:auto;display:block}
.cs-nav{position:absolute!important}.cs-footer{border:0;margin-top:0}
.cs-hero{padding-top:150px}
.cs-ph .cs-nav{height:auto;padding:var(--gw-space-16)}
.cs-ph .cs-nav-links,.cs-ph .cs-nav-right .cs-nav-cta{display:none}
.cs-ph .cs-nav-burger{display:grid}
.cs-ph .cs-hero{padding:var(--gw-space-120) 0 var(--gw-space-60);min-height:0}
.cs-ph .cs-inner{padding:0 var(--gw-space-16)}
.cs-ph .cs-hero-body{gap:var(--gw-space-40)}
.cs-ph .cs-hero-top{flex-direction:column;align-items:stretch;gap:var(--gw-space-40)}
.cs-ph .cs-hero-title{font:var(--gw-text-h6);letter-spacing:var(--gw-text-h6-tracking)}
.cs-ph .cs-hero-meta span{font:var(--gw-text-body-16-med)}
.cs-ph .cs-hero-media{width:100%;height:237px}
.cs-ph .cs-figure.cs-figure--generated{aspect-ratio:auto;flex-direction:column;padding:var(--gw-space-16)}
.cs-ph .cs-figure.cs-figure--generated .cs-growth-card{flex:0 0 auto;height:280px}
.cs-ph .cs-hero-swoosh{right:-1200px}
.cs-ph .cs-stats{flex-direction:column;gap:var(--gw-space-24)}
.cs-ph .cs-stat{width:100%}
.cs-ph .cs-stat b{font:var(--gw-text-h7-bold);letter-spacing:var(--gw-text-h7-bold-tracking)}
.cs-ph .cs-article-inner{flex-direction:column;padding:var(--gw-space-60) var(--gw-space-16) var(--gw-space-40);gap:var(--gw-space-40)}
.cs-ph .cs-prose{width:100%;gap:var(--gw-space-40)}
.cs-ph .cs-block h2{font:var(--gw-text-h6-bold);letter-spacing:var(--gw-text-h6-bold-tracking)}
.cs-ph .cs-copy p,.cs-ph .cs-block > p,.cs-ph .cs-tldr-card p{font:var(--gw-text-body-16-reg);letter-spacing:var(--gw-text-body-16-reg-tracking)}
.cs-ph .cs-tldr{grid-template-columns:1fr}
.cs-ph .cs-tldr-card--wide{padding:var(--gw-space-24)}
.cs-ph .cs-quote{padding:var(--gw-space-20)}
.cs-ph .cs-aside{position:static;width:100%}
.cs-ph .cs-footer{padding:var(--gw-space-60) 0 0}
.cs-ph .cs-footer-inner{padding:0 var(--gw-space-16)}
.cs-ph .cs-footer-main{grid-template-columns:1fr;gap:var(--gw-space-40)}
.cs-ph .cs-footer-cols{grid-template-columns:1fr;gap:var(--gw-space-32);max-width:none}
.cs-ph .cs-footer-addr-row{gap:var(--gw-space-24)}
.cs-ph .cs-footer-legal{flex-direction:column;align-items:flex-start;margin-top:var(--gw-space-40)}
.cs-ph .cs-footer-band{display:none}
.cs-ph .cs-nav{position:absolute!important}
</style><div class="rvp"><div class="vgroup"><div class="vhead"><code>Breakpoint=Desktop</code><span class="vnote">navbar, hero with outcome numbers, prose column with rail CTA, footer. Grey panels are slots, never client photography.</span></div><div class="foldwrap"><div class="foldscale" style="width:1440px;zoom:0.6944"><div class="cs-root cs-shell" style="width:1440px">

<div class="cs-shell">

  
  <div class="cs-nav">
    <a class="cs-logo">
      <svg height="24" width="126.3" style="display:block;flex:none" viewBox="0 0 421 80" fill="none" xmlns="http://www.w3.org/2000/svg"><g><g><g><g><g><g><path d="M76.6088 4.56344C77.5025 2.36058 75.8495 0 73.4723 0H9.14286C4.0934 0 0 4.0934 0 9.14286V66.7778C0 72.018 5.17081 75.6829 9.9603 73.5568C40.8494 59.8449 64.3785 34.7075 76.6088 4.56344Z" fill="#0070FF"/><path d="M32.5161 80C31.4022 80 30.9357 78.5531 31.8259 77.8835C54.9007 60.5265 71.4338 35.8047 78.7658 8.0522C78.9403 7.39154 80 7.51618 80 8.19951V70.8571C80 75.9066 75.9066 80 70.8571 80H32.5161Z" fill="#0070FF"/></g></g><g><path d="M393.954 45.0034L389.254 39.8255L410.204 17.2021H419.445L393.954 45.0034ZM386.625 57.0321V5.99988H394.193V57.0321H386.625ZM411.877 57.0321L397.22 35.2052L402.159 29.9476L420.958 57.0321H411.877Z" fill="#111827"/><path d="M366.463 35.6042C366.463 31.3026 367.286 27.7976 368.933 25.0891C370.579 22.3807 372.703 20.3626 375.305 19.035C377.908 17.7073 380.643 17.0435 383.51 17.0435V24.2129C381.121 24.2129 378.837 24.5846 376.66 25.3281C374.535 26.0185 372.783 27.1868 371.402 28.8331C370.074 30.4263 369.41 32.6037 369.41 35.3653L366.463 35.6042ZM361.843 57.0328V17.2028H369.41V57.0328H361.843Z" fill="#111827"/><path d="M336.622 57.9884C332.639 57.9884 329.134 57.1122 326.107 55.3597C323.08 53.554 320.69 51.0846 318.938 47.9513C317.238 44.818 316.389 41.2067 316.389 37.1175C316.389 33.0283 317.238 29.417 318.938 26.2837C320.637 23.1505 323 20.7075 326.028 18.955C329.055 17.1494 332.533 16.2466 336.463 16.2466C340.393 16.2466 343.871 17.1494 346.898 18.955C349.926 20.7075 352.289 23.1505 353.988 26.2837C355.688 29.417 356.537 33.0283 356.537 37.1175C356.537 41.2067 355.688 44.818 353.988 47.9513C352.289 51.0846 349.926 53.554 346.898 55.3597C343.925 57.1122 340.499 57.9884 336.622 57.9884ZM336.622 51.058C339.012 51.058 341.136 50.4738 342.995 49.3055C344.854 48.084 346.288 46.4377 347.297 44.3666C348.359 42.2954 348.89 39.8791 348.89 37.1175C348.89 34.356 348.359 31.9396 347.297 29.8684C346.288 27.7973 344.827 26.1775 342.915 25.0092C341.004 23.7877 338.853 23.177 336.463 23.177C334.02 23.177 331.869 23.7877 330.011 25.0092C328.152 26.1775 326.691 27.7973 325.629 29.8684C324.567 31.9396 324.036 34.356 324.036 37.1175C324.036 39.8791 324.567 42.2954 325.629 44.3666C326.691 46.4377 328.178 48.084 330.09 49.3055C332.002 50.4738 334.179 51.058 336.622 51.058Z" fill="#111827"/><path d="M295.547 57.0322L309.009 17.2021H316.577L303.035 57.0322H295.547ZM268.701 57.0322L281.925 17.2021H288.776L275.711 57.0322H268.701ZM268.144 57.0322L254.602 17.2021H262.249L275.393 57.0322H268.144ZM295.547 57.0322L282.483 17.2021H289.413L302.557 57.0322H295.547Z" fill="#111827"/><path d="M218.174 57.0326V6.00235H225.662V57.0326H218.174ZM245.736 57.0326V36.6396H253.224V57.0326H245.736ZM245.736 36.6396C245.736 33.0284 245.311 30.2934 244.462 28.4346C243.612 26.5228 242.444 25.1951 240.957 24.4516C239.523 23.7081 237.876 23.3098 236.018 23.2567C232.725 23.2567 230.176 24.3985 228.37 26.6821C226.565 28.9657 225.662 32.1786 225.662 36.321H222.475C222.475 32.1255 223.086 28.5408 224.308 25.5669C225.582 22.5398 227.361 20.2296 229.645 18.6364C231.982 17.0432 234.743 16.2466 237.93 16.2466C241.063 16.2466 243.771 16.8839 246.055 18.1585C248.338 19.433 250.118 21.4246 251.392 24.133C252.667 26.7883 253.277 30.2934 253.224 34.6481V36.6396H245.736Z" fill="#111827"/><path d="M198.232 57.9884C195.417 57.9884 192.895 57.5636 190.664 56.7139C188.487 55.8642 186.628 54.7224 185.088 53.2885C183.601 51.8546 182.486 50.2349 181.742 48.4292L188.274 45.5615C189.124 47.2078 190.399 48.562 192.098 49.6241C193.797 50.6863 195.683 51.2173 197.754 51.2173C200.037 51.2173 201.923 50.7925 203.41 49.9428C204.897 49.0931 205.64 47.8982 205.64 46.3581C205.64 44.8711 205.083 43.7027 203.967 42.853C202.852 42.0033 201.232 41.3129 199.108 40.7819L195.364 39.826C191.647 38.8169 188.752 37.3034 186.681 35.2853C184.663 33.2673 183.654 30.9837 183.654 28.4346C183.654 24.5578 184.902 21.5573 187.398 19.433C189.894 17.3087 193.585 16.2466 198.471 16.2466C200.861 16.2466 203.038 16.5918 205.003 17.2822C207.021 17.9725 208.72 18.955 210.101 20.2296C211.535 21.5041 212.544 23.0177 213.128 24.7702L206.755 27.638C206.118 26.0448 205.029 24.8764 203.489 24.1329C201.949 23.3363 200.144 22.938 198.072 22.938C195.948 22.938 194.275 23.416 193.054 24.3719C191.832 25.2747 191.222 26.5493 191.222 28.1956C191.222 29.0984 191.726 29.9747 192.735 30.8244C193.797 31.621 195.337 32.2848 197.356 32.8159L201.657 33.8515C204.259 34.4887 206.41 35.4712 208.11 36.7989C209.809 38.0734 211.084 39.5339 211.933 41.1802C212.783 42.7734 213.208 44.4462 213.208 46.1988C213.208 48.5886 212.544 50.6863 211.216 52.4919C209.942 54.2444 208.163 55.5986 205.879 56.5546C203.649 57.5105 201.1 57.9884 198.232 57.9884Z" fill="#111827"/><path d="M169.393 57.0322L168.915 49.7034V17.2021H176.403V57.0322H169.393ZM141.353 37.5951V17.2021H148.92V37.5951H141.353ZM148.92 37.5951C148.92 41.1533 149.319 43.8883 150.115 45.8001C150.965 47.7119 152.133 49.0396 153.62 49.7831C155.107 50.5266 156.78 50.9249 158.639 50.978C161.878 50.978 164.401 49.8362 166.206 47.5526C168.012 45.269 168.915 42.0561 168.915 37.9138H172.181C172.181 42.1092 171.544 45.7204 170.269 48.7475C169.048 51.7215 167.295 54.0051 165.012 55.5983C162.728 57.1915 159.94 57.9881 156.647 57.9881C153.567 57.9881 150.859 57.3508 148.522 56.0762C146.238 54.8017 144.459 52.8102 143.185 50.1017C141.963 47.3933 141.353 43.8883 141.353 39.5866V37.5951H148.92Z" fill="#111827"/><path d="M114.72 74.0001C112.065 74.0001 109.648 73.7346 107.471 73.2035C105.294 72.7255 103.461 72.1679 101.975 71.5306C100.488 70.8934 99.3723 70.3358 98.6288 69.8578L101.497 63.724C102.187 64.1488 103.169 64.6268 104.444 65.1578C105.719 65.742 107.206 66.22 108.905 66.5917C110.604 67.0166 112.49 67.229 114.561 67.229C117.004 67.229 119.181 66.7245 121.093 65.7155C123.005 64.7595 124.492 63.246 125.554 61.1748C126.669 59.1037 127.227 56.4483 127.227 53.2088V17.2025H134.794V53.0495C134.794 57.6167 133.918 61.4404 132.166 64.5206C130.466 67.6539 128.103 70.0171 125.076 71.6103C122.102 73.2035 118.65 74.0001 114.72 74.0001ZM114.003 56.4749C110.392 56.4749 107.232 55.6517 104.524 54.0054C101.868 52.306 99.7706 49.9693 98.2305 46.9954C96.7435 43.9683 96 40.4898 96 36.5599C96 32.4707 96.7435 28.9125 98.2305 25.8854C99.7706 22.8584 101.868 20.4951 104.524 18.7957C107.232 17.0963 110.392 16.2466 114.003 16.2466C117.296 16.2466 120.164 17.0963 122.606 18.7957C125.102 20.4951 127.014 22.8849 128.342 25.9651C129.723 28.9922 130.413 32.5503 130.413 36.6396C130.413 40.5694 129.723 44.0479 128.342 47.075C127.014 50.049 125.102 52.3591 122.606 54.0054C120.164 55.6517 117.296 56.4749 114.003 56.4749ZM115.915 50.1021C118.145 50.1021 120.084 49.5179 121.73 48.3496C123.376 47.1281 124.678 45.5084 125.634 43.4903C126.589 41.4192 127.067 39.0559 127.067 36.4006C127.067 33.7452 126.589 31.4085 125.634 29.3905C124.678 27.3724 123.35 25.8058 121.651 24.6905C120.004 23.5222 118.066 22.938 115.835 22.938C113.499 22.938 111.427 23.5222 109.622 24.6905C107.869 25.8058 106.489 27.3724 105.48 29.3905C104.471 31.4085 103.966 33.7452 103.966 36.4006C103.966 39.0559 104.471 41.4192 105.48 43.4903C106.542 45.5084 107.949 47.1281 109.702 48.3496C111.507 49.5179 113.578 50.1021 115.915 50.1021Z" fill="#111827"/></g></g></g></g></g></svg>
    </a>
    <div class="cs-nav-right">
      
      <div class="cs-nav-links">
        <a class="cs-nav-link">Who It&rsquo;s For</a>
        <a class="cs-nav-link">Platform
          <svg viewBox="0 0 256 256" aria-hidden="true"><path d="M213.66 101.66l-80 80a8 8 0 0 1-11.32 0l-80-80a8 8 0 0 1 11.32-11.32L128 164.69l74.34-74.35a8 8 0 0 1 11.32 11.32Z"/></svg>
        </a>
        <a class="cs-nav-link">Solutions
          <svg viewBox="0 0 256 256" aria-hidden="true"><path d="M213.66 101.66l-80 80a8 8 0 0 1-11.32 0l-80-80a8 8 0 0 1 11.32-11.32L128 164.69l74.34-74.35a8 8 0 0 1 11.32 11.32Z"/></svg>
        </a>
        <a class="cs-nav-link">Customers</a>
        <a class="cs-nav-link">Pricing</a>
      </div>
      <a class="cs-nav-cta">Book a Demo <svg aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor"><path d="M204,64V168a12,12,0,0,1-24,0V93L72.49,200.49a12,12,0,0,1-17-17L163,76H88a12,12,0,0,1,0-24H192A12,12,0,0,1,204,64Z"/></svg></a>
      <div class="cs-nav-burger">
        <svg viewBox="0 0 256 256" aria-hidden="true"><path d="M228 128a12 12 0 0 1-12 12H40a12 12 0 0 1 0-24h176a12 12 0 0 1 12 12ZM40 76h176a12 12 0 0 0 0-24H40a12 12 0 0 0 0 24Zm176 104H40a12 12 0 0 0 0 24h176a12 12 0 0 0 0-24Z"/></svg>
      </div>
    </div>
    
    <div class="cs-nav-progress"></div>
  </div>

  
  <div class="cs-hero">
    <div class="cs-hero-bg" aria-hidden="true">
      <div class="cs-hero-grid"></div>
      <div class="cs-hero-swoosh"></div>
      <div class="cs-hero-fade"></div>
    </div>

    <div class="cs-hero-body cs-inner">
      <div class="cs-hero-top">
        <div class="cs-hero-text">

          
          
          <div class="cs-eyebrow">
            <svg viewBox="0 0 256 256" aria-hidden="true"><path d="M225.86,102.82c-3.77-3.94-7.67-8-9.14-11.57-1.36-3.27-1.44-8.69-1.52-13.94-.15-9.76-.31-20.82-8-28.51s-18.75-7.85-28.51-8c-5.25-.08-10.67-.16-13.94-1.52-3.56-1.47-7.63-5.37-11.57-9.14C146.28,23.51,138.44,16,128,16s-18.27,7.51-25.18,14.14c-3.94,3.77-8,7.67-11.57,9.14C88,40.64,82.56,40.72,77.31,40.8c-9.76.15-20.82.31-28.51,8S41,67.55,40.8,77.31c-.08,5.25-.16,10.67-1.52,13.94-1.47,3.56-5.37,7.63-9.14,11.57C23.51,109.72,16,117.56,16,128s7.51,18.27,14.14,25.18c3.77,3.94,7.67,8,9.14,11.57,1.36,3.27,1.44,8.69,1.52,13.94.15,9.76.31,20.82,8,28.51s18.75,7.85,28.51,8c5.25.08,10.67.16,13.94,1.52,3.56,1.47,7.63,5.37,11.57,9.14C109.72,232.49,117.56,240,128,240s18.27-7.51,25.18-14.14c3.94-3.77,8-7.67,11.57-9.14,3.27-1.36,8.69-1.44,13.94-1.52,9.76-.15,20.82-.31,28.51-8s7.85-18.75,8-28.51c.08-5.25.16-10.67,1.52-13.94,1.47-3.56,5.37-7.63,9.14-11.57C232.49,146.28,240,138.44,240,128S232.49,109.73,225.86,102.82Zm-11.55,39.29c-4.79,5-9.75,10.17-12.38,16.52-2.52,6.1-2.63,13.07-2.73,19.82-.1,7-.21,14.33-3.32,17.43s-10.39,3.22-17.43,3.32c-6.75.1-13.72.21-19.82,2.73-6.35,2.63-11.52,7.59-16.52,12.38S132,224,128,224s-9.15-4.92-14.11-9.69-10.17-9.75-16.52-12.38c-6.1-2.52-13.07-2.63-19.82-2.73-7-.1-14.33-.21-17.43-3.32s-3.22-10.39-3.32-17.43c-.1-6.75-.21-13.72-2.73-19.82-2.63-6.35-7.59-11.52-12.38-16.52S32,132,32,128s4.92-9.15,9.69-14.11,9.75-10.17,12.38-16.52c2.52-6.1,2.63-13.07,2.73-19.82.1-7,.21-14.33,3.32-17.43S70.51,56.9,77.55,56.8c6.75-.1,13.72-.21,19.82-2.73,6.35-2.63,11.52-7.59,16.52-12.38S124,32,128,32s9.15,4.92,14.11,9.69,10.17,9.75,16.52,12.38c6.1,2.52,13.07,2.63,19.82,2.73,7,.1,14.33.21,17.43,3.32s3.22,10.39,3.32,17.43c.1,6.75.21,13.72,2.73,19.82,2.63,6.35,7.59,11.52,12.38,16.52S224,124,224,128,219.08,137.15,214.31,142.11ZM173.66,98.34a8,8,0,0,1,0,11.32l-56,56a8,8,0,0,1-11.32,0l-24-24a8,8,0,0,1,11.32-11.32L112,148.69l50.34-50.35A8,8,0,0,1,173.66,98.34Z"/></svg>
            <span>Case Study</span>
          </div>

          <div class="cs-hero-heads">
            
            <h1 class="cs-hero-title">Hero title that leads with the outcome and the number</h1>
            <div class="cs-hero-meta">
              <span>Industry</span>
              <i aria-hidden="true"></i>
              <span>Country</span>
            </div>
          </div>
        </div>

        
        <div class="cs-hero-media">
          <div class="cs-slot">
            
            <div class="cs-slot-label">Hero image — 580 × 400</div>
            
            <div class="cs-hero-logo">
              
              <span class="cs-hero-logo-label">Client logo</span>
            </div>
          </div>
        </div>
      </div>

      
      <div class="cs-stats">
        <div class="cs-stat"><b>00%</b><span>Outcome label</span></div>
        <div class="cs-stat"><b>00%</b><span>Outcome label</span></div>
        <div class="cs-stat"><b>00%</b><span>Outcome label</span></div>
      </div>
    </div>
  </div>

  
  <div class="cs-article">
    <div class="cs-article-inner">
      <div class="cs-prose">

        
        <div class="cs-block">
          <h2>Heading for who they are</h2>
          <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>
        </div>

        
        <div class="cs-tldr">
          <div class="cs-tldr-card">
            <h3>Problem</h3>
            <p>One sentence of placeholder copy for this summary card.</p>
          </div>
          <div class="cs-tldr-card">
            <h3>Challenge</h3>
            <p>One sentence of placeholder copy for this summary card.</p>
          </div>
          <div class="cs-tldr-card cs-tldr-card--wide">
            <h3>Solution</h3>
            <p>One sentence of placeholder copy for this summary card.</p>
          </div>
        </div>

        
        <div class="cs-block">
          <h2>Heading for how buyers search</h2>
          <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>
        </div>

        <div class="cs-block">
          <h2>What the first 90 days showed</h2>
          <div class="cs-copy">
            <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>
            
            <figure class="cs-figure cs-figure--generated">
              <div class="cs-growth-card">
                <div class="cs-growth-card-header">
                  <span class="cs-growth-card-label">Total Visitors (90 days)</span>
                </div>
                <div class="cs-growth-card-body">
                  <div>
                    <span class="cs-growth-card-value">00%</span><br>
                    <span class="cs-growth-card-caption">Outcome label</span>
                  </div>
                  <div class="cs-growth-card-chart">
                    <div class="cs-growth-card-yaxis" aria-hidden="true">
                      <span>00</span><span>00</span><span>00</span><span>0</span>
                    </div>
                    <div class="cs-growth-card-plot">
                      <svg viewBox="0 0 240 90" preserveAspectRatio="none" aria-hidden="true">
                        <defs>
                          <linearGradient x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stop-color="#16a34a" stop-opacity="0.3"/>
                            <stop offset="100%" stop-color="#16a34a" stop-opacity="0"/>
                          </linearGradient>
                        </defs>
                        <line x1="0" y1="4" x2="240" y2="4" stroke="#e7e8e9"/>
                        <line x1="0" y1="32" x2="240" y2="32" stroke="#e7e8e9"/>
                        <line x1="0" y1="60" x2="240" y2="60" stroke="#e7e8e9"/>
                        <line x1="0" y1="88" x2="240" y2="88" stroke="#e7e8e9"/>
                        <path d="M0,80 C40,79 80,72 120,58 C160,44 190,24 240,4 L240,90 L0,90 Z" fill="url(#cs-chart-grad-1)"/>
                        <path d="M0,80 C40,79 80,72 120,58 C160,44 190,24 240,4" fill="none" stroke="#16a34a" stroke-width="2"/>
                      </svg>
                      <div class="cs-growth-card-xaxis" aria-hidden="true">
                        <span>Month 1</span><span>Month 2</span><span>Month 3</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div class="cs-growth-card">
                <div class="cs-growth-card-header">
                  <span class="cs-growth-card-label">Total Leads (90 days)</span>
                </div>
                <div class="cs-growth-card-body">
                  <div>
                    <span class="cs-growth-card-value">00%</span><br>
                    <span class="cs-growth-card-caption">Outcome label</span>
                  </div>
                  <div class="cs-growth-card-chart">
                    <div class="cs-growth-card-yaxis" aria-hidden="true">
                      <span>00</span><span>00</span><span>00</span><span>0</span>
                    </div>
                    <div class="cs-growth-card-plot">
                      <svg viewBox="0 0 240 90" preserveAspectRatio="none" aria-hidden="true">
                        <defs>
                          <linearGradient x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stop-color="#0070ff" stop-opacity="0.3"/>
                            <stop offset="100%" stop-color="#0070ff" stop-opacity="0"/>
                          </linearGradient>
                        </defs>
                        <line x1="0" y1="4" x2="240" y2="4" stroke="#e7e8e9"/>
                        <line x1="0" y1="32" x2="240" y2="32" stroke="#e7e8e9"/>
                        <line x1="0" y1="60" x2="240" y2="60" stroke="#e7e8e9"/>
                        <line x1="0" y1="88" x2="240" y2="88" stroke="#e7e8e9"/>
                        <path d="M0,84 C50,84 90,82 130,70 C170,58 200,32 240,6 L240,90 L0,90 Z" fill="url(#cs-chart-grad-2)"/>
                        <path d="M0,84 C50,84 90,82 130,70 C170,58 200,32 240,6" fill="none" stroke="#0070ff" stroke-width="2"/>
                      </svg>
                      <div class="cs-growth-card-xaxis" aria-hidden="true">
                        <span>Month 1</span><span>Month 2</span><span>Month 3</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </figure>
            <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>
          </div>
        </div>

        
        <figure class="cs-quote">
          
          <svg class="cs-quote-mark is-hidden" viewBox="0 0 31 24" aria-hidden="true"><path d="M0 24V13.7C0 6.13 4.6 1.05 12.4 0l1.4 4.2c-4.3 1-6.7 3.5-7 7.4H14V24H0Zm17 0V13.7C17 6.13 21.6 1.05 29.4 0L31 4.2c-4.4 1-6.8 3.5-7.1 7.4H31V24H17Z"/></svg>
          <p>&ldquo;A short quote from the client about the result they got, in their own words.&rdquo;</p>
          <figcaption class="cs-byline">
            
            <span class="cs-byline-photo">
              
            </span>
            <span class="cs-byline-text">
              <b>Client name</b>
              <span>Role, Company</span>
            </span>
          </figcaption>
        </figure>

        <div class="cs-block">
          <h2>Heading for why it matters</h2>
          <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>
        </div>

        <div class="cs-block">
          <h2>Ready to build your growth story</h2>
          <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>
        </div>
      </div>

      
      <div class="cs-aside">
        <div class="cs-card">
          <div class="cs-card-content">
            <div class="cs-card-people" aria-hidden="true">
              <span style="position:relative;display:block;width:70px;height:40px"><span style="position:absolute;left:0;top:0;width:40px;height:40px;border-radius:50%;background:#cfd1d4;border:2px solid #fff;box-sizing:border-box"></span><span style="position:absolute;left:30px;top:0;width:40px;height:40px;border-radius:50%;background:#bbbec4;border:2px solid #fff;box-sizing:border-box"></span></span>
            </div>
            <h3>Discover AI agents that help businesses get more qualified leads.</h3>
          </div>
          <a class="cs-btn">Book a Demo</a>
        </div>
      </div>
    </div>
  </div>

  
  <div class="cs-footer">
    <div class="cs-footer-inner">
      <div class="cs-footer-main">
        
        <div class="cs-footer-cols">
          <div class="cs-footer-col">
            <h4>Platform</h4>
            <div class="cs-footer-list">
              <a>Brand Memory</a>
              <a>Page Creation Engine</a>
              <a>AI-First CMS</a>
              <a>Leads Dashboard</a>
              <a>Analytics</a>
            </div>
          </div>
          <div class="cs-footer-col">
            <h4>Solutions</h4>
            <div class="cs-footer-list">
              <a>AI Search Agent</a>
              <a>Lead Conversion</a>
              <a>Paid Boost</a>
            </div>
          </div>
          <div class="cs-footer-col">
            <h4>Company</h4>
            <div class="cs-footer-list">
              <a>Pricing</a>
              <a>Careers</a>
              <a>Customers</a>
              <a>Alternatives</a>
              <a>Affiliate</a>
            </div>
          </div>
        </div>

        <div class="cs-footer-comp">
          <div class="cs-footer-addr-row">
            <div class="cs-footer-addr-col">
              <p>Gushwork, Regents Inc, 16192 Coastal Hwy, Lewes, DE 19958, United States</p>
              
              <div class="cs-footer-contact">
                <a>+1 (888) 451 5522</a>
                <a>growth@gushwork.ai</a>
              </div>
            </div>
            <div class="cs-footer-addr-col">
              <p>Gushwork, 578, 9th A Main Rd, Indiranagar, Bengaluru, Karnataka 560038, India</p>
            </div>
          </div>
        </div>
      </div>

      
      <div class="cs-footer-social">
        <a>
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M14.8156 0H1.18125C0.528125 0 0 0.515625 0 1.15313V14.8438C0 15.4813 0.528125 16 1.18125 16H14.8156C15.4688 16 16 15.4813 16 14.8469V1.15313C16 0.515625 15.4688 0 14.8156 0ZM4.74687 13.6344H2.37188V5.99687H4.74687V13.6344ZM3.55938 4.95625C2.79688 4.95625 2.18125 4.34062 2.18125 3.58125C2.18125 2.82188 2.79688 2.20625 3.55938 2.20625C4.31875 2.20625 4.93437 2.82188 4.93437 3.58125C4.93437 4.3375 4.31875 4.95625 3.55938 4.95625ZM13.6344 13.6344H11.2625V9.92188C11.2625 9.0375 11.2469 7.89687 10.0281 7.89687C8.79375 7.89687 8.60625 8.8625 8.60625 9.85938V13.6344H6.2375V5.99687H8.5125V7.04063H8.54375C8.85937 6.44063 9.63438 5.80625 10.7875 5.80625C13.1906 5.80625 13.6344 7.3875 13.6344 9.44375V13.6344V13.6344Z"/></svg>
        </a>
        <a>
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M12.2175 1.26929H14.4665L9.5531 6.88495L15.3333 14.5266H10.8075L7.26265 9.89198L3.20659 14.5266H0.956247L6.21158 8.52002L0.666626 1.26929H5.30737L8.51156 5.50551L12.2175 1.26929ZM11.4282 13.1805H12.6744L4.63022 2.54471H3.29293L11.4282 13.1805Z"/></svg>
        </a>
        <a>
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.44062C10.1375 1.44062 10.3906 1.45 11.2313 1.4875C12.0125 1.52187 12.4344 1.65313 12.7156 1.7625C13.0875 1.90625 13.3563 2.08125 13.6344 2.35938C13.9156 2.64063 14.0875 2.90625 14.2313 3.27813C14.3406 3.55938 14.4719 3.98437 14.5063 4.7625C14.5438 5.60625 14.5531 5.85938 14.5531 7.99375C14.5531 10.1313 14.5438 10.3844 14.5063 11.225C14.4719 12.0063 14.3406 12.4281 14.2313 12.7094C14.0875 13.0813 13.9125 13.35 13.6344 13.6281C13.3531 13.9094 13.0875 14.0813 12.7156 14.225C12.4344 14.3344 12.0094 14.4656 11.2313 14.5C10.3875 14.5375 10.1344 14.5469 8 14.5469C5.8625 14.5469 5.60938 14.5375 4.76875 14.5C3.9875 14.4656 3.56563 14.3344 3.28438 14.225C2.9125 14.0813 2.64375 13.9063 2.36563 13.6281C2.08438 13.3469 1.9125 13.0813 1.76875 12.7094C1.65938 12.4281 1.52813 12.0031 1.49375 11.225C1.45625 10.3813 1.44688 10.1281 1.44688 7.99375C1.44688 5.85625 1.45625 5.60312 1.49375 4.7625C1.52813 3.98125 1.65938 3.55938 1.76875 3.27813C1.9125 2.90625 2.0875 2.6375 2.36563 2.35938C2.64688 2.07813 2.9125 1.90625 3.28438 1.7625C3.56563 1.65313 3.99063 1.52187 4.76875 1.4875C5.60938 1.45 5.8625 1.44062 8 1.44062ZM8 0C5.82813 0 5.55625 0.009375 4.70313 0.046875C3.85313 0.084375 3.26875 0.221875 2.7625 0.41875C2.23438 0.625 1.7875 0.896875 1.34375 1.34375C0.896875 1.7875 0.625 2.23438 0.41875 2.75938C0.221875 3.26875 0.084375 3.85 0.046875 4.7C0.009375 5.55625 0 5.82813 0 8C0 10.1719 0.009375 10.4438 0.046875 11.2969C0.084375 12.1469 0.221875 12.7313 0.41875 13.2375C0.625 13.7656 0.896875 14.2125 1.34375 14.6563C1.7875 15.1 2.23438 15.375 2.75938 15.5781C3.26875 15.775 3.85 15.9125 4.7 15.95C5.55313 15.9875 5.825 15.9969 7.99688 15.9969C10.1688 15.9969 10.4406 15.9875 11.2938 15.95C12.1438 15.9125 12.7281 15.775 13.2344 15.5781C13.7594 15.375 14.2063 15.1 14.65 14.6563C15.0938 14.2125 15.3688 13.7656 15.5719 13.2406C15.7688 12.7313 15.9063 12.15 15.9438 11.3C15.9813 10.4469 15.9906 10.175 15.9906 8.00313C15.9906 5.83125 15.9813 5.55938 15.9438 4.70625C15.9063 3.85625 15.7688 3.27188 15.5719 2.76563C15.375 2.23438 15.1031 1.7875 14.6563 1.34375C14.2125 0.9 13.7656 0.625 13.2406 0.421875C12.7313 0.225 12.15 0.0875 11.3 0.05C10.4438 0.009375 10.1719 0 8 0Z"/><path d="M8 3.89062C5.73125 3.89062 3.89062 5.73125 3.89062 8C3.89062 10.2688 5.73125 12.1094 8 12.1094C10.2688 12.1094 12.1094 10.2688 12.1094 8C12.1094 5.73125 10.2688 3.89062 8 3.89062ZM8 10.6656C6.52813 10.6656 5.33437 9.47188 5.33437 8C5.33437 6.52813 6.52813 5.33437 8 5.33437C9.47188 5.33437 10.6656 6.52813 10.6656 8C10.6656 9.47188 9.47188 10.6656 8 10.6656Z"/><path d="M13.2312 3.72805C13.2312 4.2593 12.8 4.68743 12.2719 4.68743C11.7406 4.68743 11.3125 4.25618 11.3125 3.72805C11.3125 3.1968 11.7438 2.76868 12.2719 2.76868C12.8 2.76868 13.2312 3.19993 13.2312 3.72805Z"/></svg>
        </a>
      </div>

      
      <div class="cs-footer-legal">
        <span>&copy; 2026 Gushwork | All Rights Reserved</span>
        <div>
          
          <a>Privacy Policy</a>
          <a>Terms &amp; Conditions</a>
        </div>
      </div>
    </div>

    
    
  </div>
</div>

</div></div></div></div><div class="vgroup"><div class="vhead"><code>Breakpoint=Phone</code><span class="vnote">375 wide, one file with the desktop page</span></div><div class="grid"><div class="cell"><div class="stage g-white" style="padding:0;align-items:flex-start"><div class="cs-root cs-ph" style="width:375px;flex:none"><div class="cs-shell" style="width:375px">

<div class="cs-shell">

  
  <div class="cs-nav">
    <a class="cs-logo">
      <svg height="24" width="126.3" style="display:block;flex:none" viewBox="0 0 421 80" fill="none" xmlns="http://www.w3.org/2000/svg"><g><g><g><g><g><g><path d="M76.6088 4.56344C77.5025 2.36058 75.8495 0 73.4723 0H9.14286C4.0934 0 0 4.0934 0 9.14286V66.7778C0 72.018 5.17081 75.6829 9.9603 73.5568C40.8494 59.8449 64.3785 34.7075 76.6088 4.56344Z" fill="#0070FF"/><path d="M32.5161 80C31.4022 80 30.9357 78.5531 31.8259 77.8835C54.9007 60.5265 71.4338 35.8047 78.7658 8.0522C78.9403 7.39154 80 7.51618 80 8.19951V70.8571C80 75.9066 75.9066 80 70.8571 80H32.5161Z" fill="#0070FF"/></g></g><g><path d="M393.954 45.0034L389.254 39.8255L410.204 17.2021H419.445L393.954 45.0034ZM386.625 57.0321V5.99988H394.193V57.0321H386.625ZM411.877 57.0321L397.22 35.2052L402.159 29.9476L420.958 57.0321H411.877Z" fill="#111827"/><path d="M366.463 35.6042C366.463 31.3026 367.286 27.7976 368.933 25.0891C370.579 22.3807 372.703 20.3626 375.305 19.035C377.908 17.7073 380.643 17.0435 383.51 17.0435V24.2129C381.121 24.2129 378.837 24.5846 376.66 25.3281C374.535 26.0185 372.783 27.1868 371.402 28.8331C370.074 30.4263 369.41 32.6037 369.41 35.3653L366.463 35.6042ZM361.843 57.0328V17.2028H369.41V57.0328H361.843Z" fill="#111827"/><path d="M336.622 57.9884C332.639 57.9884 329.134 57.1122 326.107 55.3597C323.08 53.554 320.69 51.0846 318.938 47.9513C317.238 44.818 316.389 41.2067 316.389 37.1175C316.389 33.0283 317.238 29.417 318.938 26.2837C320.637 23.1505 323 20.7075 326.028 18.955C329.055 17.1494 332.533 16.2466 336.463 16.2466C340.393 16.2466 343.871 17.1494 346.898 18.955C349.926 20.7075 352.289 23.1505 353.988 26.2837C355.688 29.417 356.537 33.0283 356.537 37.1175C356.537 41.2067 355.688 44.818 353.988 47.9513C352.289 51.0846 349.926 53.554 346.898 55.3597C343.925 57.1122 340.499 57.9884 336.622 57.9884ZM336.622 51.058C339.012 51.058 341.136 50.4738 342.995 49.3055C344.854 48.084 346.288 46.4377 347.297 44.3666C348.359 42.2954 348.89 39.8791 348.89 37.1175C348.89 34.356 348.359 31.9396 347.297 29.8684C346.288 27.7973 344.827 26.1775 342.915 25.0092C341.004 23.7877 338.853 23.177 336.463 23.177C334.02 23.177 331.869 23.7877 330.011 25.0092C328.152 26.1775 326.691 27.7973 325.629 29.8684C324.567 31.9396 324.036 34.356 324.036 37.1175C324.036 39.8791 324.567 42.2954 325.629 44.3666C326.691 46.4377 328.178 48.084 330.09 49.3055C332.002 50.4738 334.179 51.058 336.622 51.058Z" fill="#111827"/><path d="M295.547 57.0322L309.009 17.2021H316.577L303.035 57.0322H295.547ZM268.701 57.0322L281.925 17.2021H288.776L275.711 57.0322H268.701ZM268.144 57.0322L254.602 17.2021H262.249L275.393 57.0322H268.144ZM295.547 57.0322L282.483 17.2021H289.413L302.557 57.0322H295.547Z" fill="#111827"/><path d="M218.174 57.0326V6.00235H225.662V57.0326H218.174ZM245.736 57.0326V36.6396H253.224V57.0326H245.736ZM245.736 36.6396C245.736 33.0284 245.311 30.2934 244.462 28.4346C243.612 26.5228 242.444 25.1951 240.957 24.4516C239.523 23.7081 237.876 23.3098 236.018 23.2567C232.725 23.2567 230.176 24.3985 228.37 26.6821C226.565 28.9657 225.662 32.1786 225.662 36.321H222.475C222.475 32.1255 223.086 28.5408 224.308 25.5669C225.582 22.5398 227.361 20.2296 229.645 18.6364C231.982 17.0432 234.743 16.2466 237.93 16.2466C241.063 16.2466 243.771 16.8839 246.055 18.1585C248.338 19.433 250.118 21.4246 251.392 24.133C252.667 26.7883 253.277 30.2934 253.224 34.6481V36.6396H245.736Z" fill="#111827"/><path d="M198.232 57.9884C195.417 57.9884 192.895 57.5636 190.664 56.7139C188.487 55.8642 186.628 54.7224 185.088 53.2885C183.601 51.8546 182.486 50.2349 181.742 48.4292L188.274 45.5615C189.124 47.2078 190.399 48.562 192.098 49.6241C193.797 50.6863 195.683 51.2173 197.754 51.2173C200.037 51.2173 201.923 50.7925 203.41 49.9428C204.897 49.0931 205.64 47.8982 205.64 46.3581C205.64 44.8711 205.083 43.7027 203.967 42.853C202.852 42.0033 201.232 41.3129 199.108 40.7819L195.364 39.826C191.647 38.8169 188.752 37.3034 186.681 35.2853C184.663 33.2673 183.654 30.9837 183.654 28.4346C183.654 24.5578 184.902 21.5573 187.398 19.433C189.894 17.3087 193.585 16.2466 198.471 16.2466C200.861 16.2466 203.038 16.5918 205.003 17.2822C207.021 17.9725 208.72 18.955 210.101 20.2296C211.535 21.5041 212.544 23.0177 213.128 24.7702L206.755 27.638C206.118 26.0448 205.029 24.8764 203.489 24.1329C201.949 23.3363 200.144 22.938 198.072 22.938C195.948 22.938 194.275 23.416 193.054 24.3719C191.832 25.2747 191.222 26.5493 191.222 28.1956C191.222 29.0984 191.726 29.9747 192.735 30.8244C193.797 31.621 195.337 32.2848 197.356 32.8159L201.657 33.8515C204.259 34.4887 206.41 35.4712 208.11 36.7989C209.809 38.0734 211.084 39.5339 211.933 41.1802C212.783 42.7734 213.208 44.4462 213.208 46.1988C213.208 48.5886 212.544 50.6863 211.216 52.4919C209.942 54.2444 208.163 55.5986 205.879 56.5546C203.649 57.5105 201.1 57.9884 198.232 57.9884Z" fill="#111827"/><path d="M169.393 57.0322L168.915 49.7034V17.2021H176.403V57.0322H169.393ZM141.353 37.5951V17.2021H148.92V37.5951H141.353ZM148.92 37.5951C148.92 41.1533 149.319 43.8883 150.115 45.8001C150.965 47.7119 152.133 49.0396 153.62 49.7831C155.107 50.5266 156.78 50.9249 158.639 50.978C161.878 50.978 164.401 49.8362 166.206 47.5526C168.012 45.269 168.915 42.0561 168.915 37.9138H172.181C172.181 42.1092 171.544 45.7204 170.269 48.7475C169.048 51.7215 167.295 54.0051 165.012 55.5983C162.728 57.1915 159.94 57.9881 156.647 57.9881C153.567 57.9881 150.859 57.3508 148.522 56.0762C146.238 54.8017 144.459 52.8102 143.185 50.1017C141.963 47.3933 141.353 43.8883 141.353 39.5866V37.5951H148.92Z" fill="#111827"/><path d="M114.72 74.0001C112.065 74.0001 109.648 73.7346 107.471 73.2035C105.294 72.7255 103.461 72.1679 101.975 71.5306C100.488 70.8934 99.3723 70.3358 98.6288 69.8578L101.497 63.724C102.187 64.1488 103.169 64.6268 104.444 65.1578C105.719 65.742 107.206 66.22 108.905 66.5917C110.604 67.0166 112.49 67.229 114.561 67.229C117.004 67.229 119.181 66.7245 121.093 65.7155C123.005 64.7595 124.492 63.246 125.554 61.1748C126.669 59.1037 127.227 56.4483 127.227 53.2088V17.2025H134.794V53.0495C134.794 57.6167 133.918 61.4404 132.166 64.5206C130.466 67.6539 128.103 70.0171 125.076 71.6103C122.102 73.2035 118.65 74.0001 114.72 74.0001ZM114.003 56.4749C110.392 56.4749 107.232 55.6517 104.524 54.0054C101.868 52.306 99.7706 49.9693 98.2305 46.9954C96.7435 43.9683 96 40.4898 96 36.5599C96 32.4707 96.7435 28.9125 98.2305 25.8854C99.7706 22.8584 101.868 20.4951 104.524 18.7957C107.232 17.0963 110.392 16.2466 114.003 16.2466C117.296 16.2466 120.164 17.0963 122.606 18.7957C125.102 20.4951 127.014 22.8849 128.342 25.9651C129.723 28.9922 130.413 32.5503 130.413 36.6396C130.413 40.5694 129.723 44.0479 128.342 47.075C127.014 50.049 125.102 52.3591 122.606 54.0054C120.164 55.6517 117.296 56.4749 114.003 56.4749ZM115.915 50.1021C118.145 50.1021 120.084 49.5179 121.73 48.3496C123.376 47.1281 124.678 45.5084 125.634 43.4903C126.589 41.4192 127.067 39.0559 127.067 36.4006C127.067 33.7452 126.589 31.4085 125.634 29.3905C124.678 27.3724 123.35 25.8058 121.651 24.6905C120.004 23.5222 118.066 22.938 115.835 22.938C113.499 22.938 111.427 23.5222 109.622 24.6905C107.869 25.8058 106.489 27.3724 105.48 29.3905C104.471 31.4085 103.966 33.7452 103.966 36.4006C103.966 39.0559 104.471 41.4192 105.48 43.4903C106.542 45.5084 107.949 47.1281 109.702 48.3496C111.507 49.5179 113.578 50.1021 115.915 50.1021Z" fill="#111827"/></g></g></g></g></g></svg>
    </a>
    <div class="cs-nav-right">
      
      <div class="cs-nav-links">
        <a class="cs-nav-link">Who It&rsquo;s For</a>
        <a class="cs-nav-link">Platform
          <svg viewBox="0 0 256 256" aria-hidden="true"><path d="M213.66 101.66l-80 80a8 8 0 0 1-11.32 0l-80-80a8 8 0 0 1 11.32-11.32L128 164.69l74.34-74.35a8 8 0 0 1 11.32 11.32Z"/></svg>
        </a>
        <a class="cs-nav-link">Solutions
          <svg viewBox="0 0 256 256" aria-hidden="true"><path d="M213.66 101.66l-80 80a8 8 0 0 1-11.32 0l-80-80a8 8 0 0 1 11.32-11.32L128 164.69l74.34-74.35a8 8 0 0 1 11.32 11.32Z"/></svg>
        </a>
        <a class="cs-nav-link">Customers</a>
        <a class="cs-nav-link">Pricing</a>
      </div>
      <a class="cs-nav-cta">Book a Demo <svg aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor"><path d="M204,64V168a12,12,0,0,1-24,0V93L72.49,200.49a12,12,0,0,1-17-17L163,76H88a12,12,0,0,1,0-24H192A12,12,0,0,1,204,64Z"/></svg></a>
      <div class="cs-nav-burger">
        <svg viewBox="0 0 256 256" aria-hidden="true"><path d="M228 128a12 12 0 0 1-12 12H40a12 12 0 0 1 0-24h176a12 12 0 0 1 12 12ZM40 76h176a12 12 0 0 0 0-24H40a12 12 0 0 0 0 24Zm176 104H40a12 12 0 0 0 0 24h176a12 12 0 0 0 0-24Z"/></svg>
      </div>
    </div>
    
    <div class="cs-nav-progress"></div>
  </div>

  
  <div class="cs-hero">
    <div class="cs-hero-bg" aria-hidden="true">
      <div class="cs-hero-grid"></div>
      <div class="cs-hero-swoosh"></div>
      <div class="cs-hero-fade"></div>
    </div>

    <div class="cs-hero-body cs-inner">
      <div class="cs-hero-top">
        <div class="cs-hero-text">

          
          
          <div class="cs-eyebrow">
            <svg viewBox="0 0 256 256" aria-hidden="true"><path d="M225.86,102.82c-3.77-3.94-7.67-8-9.14-11.57-1.36-3.27-1.44-8.69-1.52-13.94-.15-9.76-.31-20.82-8-28.51s-18.75-7.85-28.51-8c-5.25-.08-10.67-.16-13.94-1.52-3.56-1.47-7.63-5.37-11.57-9.14C146.28,23.51,138.44,16,128,16s-18.27,7.51-25.18,14.14c-3.94,3.77-8,7.67-11.57,9.14C88,40.64,82.56,40.72,77.31,40.8c-9.76.15-20.82.31-28.51,8S41,67.55,40.8,77.31c-.08,5.25-.16,10.67-1.52,13.94-1.47,3.56-5.37,7.63-9.14,11.57C23.51,109.72,16,117.56,16,128s7.51,18.27,14.14,25.18c3.77,3.94,7.67,8,9.14,11.57,1.36,3.27,1.44,8.69,1.52,13.94.15,9.76.31,20.82,8,28.51s18.75,7.85,28.51,8c5.25.08,10.67.16,13.94,1.52,3.56,1.47,7.63,5.37,11.57,9.14C109.72,232.49,117.56,240,128,240s18.27-7.51,25.18-14.14c3.94-3.77,8-7.67,11.57-9.14,3.27-1.36,8.69-1.44,13.94-1.52,9.76-.15,20.82-.31,28.51-8s7.85-18.75,8-28.51c.08-5.25.16-10.67,1.52-13.94,1.47-3.56,5.37-7.63,9.14-11.57C232.49,146.28,240,138.44,240,128S232.49,109.73,225.86,102.82Zm-11.55,39.29c-4.79,5-9.75,10.17-12.38,16.52-2.52,6.1-2.63,13.07-2.73,19.82-.1,7-.21,14.33-3.32,17.43s-10.39,3.22-17.43,3.32c-6.75.1-13.72.21-19.82,2.73-6.35,2.63-11.52,7.59-16.52,12.38S132,224,128,224s-9.15-4.92-14.11-9.69-10.17-9.75-16.52-12.38c-6.1-2.52-13.07-2.63-19.82-2.73-7-.1-14.33-.21-17.43-3.32s-3.22-10.39-3.32-17.43c-.1-6.75-.21-13.72-2.73-19.82-2.63-6.35-7.59-11.52-12.38-16.52S32,132,32,128s4.92-9.15,9.69-14.11,9.75-10.17,12.38-16.52c2.52-6.1,2.63-13.07,2.73-19.82.1-7,.21-14.33,3.32-17.43S70.51,56.9,77.55,56.8c6.75-.1,13.72-.21,19.82-2.73,6.35-2.63,11.52-7.59,16.52-12.38S124,32,128,32s9.15,4.92,14.11,9.69,10.17,9.75,16.52,12.38c6.1,2.52,13.07,2.63,19.82,2.73,7,.1,14.33.21,17.43,3.32s3.22,10.39,3.32,17.43c.1,6.75.21,13.72,2.73,19.82,2.63,6.35,7.59,11.52,12.38,16.52S224,124,224,128,219.08,137.15,214.31,142.11ZM173.66,98.34a8,8,0,0,1,0,11.32l-56,56a8,8,0,0,1-11.32,0l-24-24a8,8,0,0,1,11.32-11.32L112,148.69l50.34-50.35A8,8,0,0,1,173.66,98.34Z"/></svg>
            <span>Case Study</span>
          </div>

          <div class="cs-hero-heads">
            
            <h1 class="cs-hero-title">Hero title that leads with the outcome and the number</h1>
            <div class="cs-hero-meta">
              <span>Industry</span>
              <i aria-hidden="true"></i>
              <span>Country</span>
            </div>
          </div>
        </div>

        
        <div class="cs-hero-media">
          <div class="cs-slot">
            
            <div class="cs-slot-label">Hero image — 580 × 400</div>
            
            <div class="cs-hero-logo">
              
              <span class="cs-hero-logo-label">Client logo</span>
            </div>
          </div>
        </div>
      </div>

      
      <div class="cs-stats">
        <div class="cs-stat"><b>00%</b><span>Outcome label</span></div>
        <div class="cs-stat"><b>00%</b><span>Outcome label</span></div>
        <div class="cs-stat"><b>00%</b><span>Outcome label</span></div>
      </div>
    </div>
  </div>

  
  <div class="cs-article">
    <div class="cs-article-inner">
      <div class="cs-prose">

        
        <div class="cs-block">
          <h2>Heading for who they are</h2>
          <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>
        </div>

        
        <div class="cs-tldr">
          <div class="cs-tldr-card">
            <h3>Problem</h3>
            <p>One sentence of placeholder copy for this summary card.</p>
          </div>
          <div class="cs-tldr-card">
            <h3>Challenge</h3>
            <p>One sentence of placeholder copy for this summary card.</p>
          </div>
          <div class="cs-tldr-card cs-tldr-card--wide">
            <h3>Solution</h3>
            <p>One sentence of placeholder copy for this summary card.</p>
          </div>
        </div>

        
        <div class="cs-block">
          <h2>Heading for how buyers search</h2>
          <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>
        </div>

        <div class="cs-block">
          <h2>What the first 90 days showed</h2>
          <div class="cs-copy">
            <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>
            
            <figure class="cs-figure cs-figure--generated">
              <div class="cs-growth-card">
                <div class="cs-growth-card-header">
                  <span class="cs-growth-card-label">Total Visitors (90 days)</span>
                </div>
                <div class="cs-growth-card-body">
                  <div>
                    <span class="cs-growth-card-value">00%</span><br>
                    <span class="cs-growth-card-caption">Outcome label</span>
                  </div>
                  <div class="cs-growth-card-chart">
                    <div class="cs-growth-card-yaxis" aria-hidden="true">
                      <span>00</span><span>00</span><span>00</span><span>0</span>
                    </div>
                    <div class="cs-growth-card-plot">
                      <svg viewBox="0 0 240 90" preserveAspectRatio="none" aria-hidden="true">
                        <defs>
                          <linearGradient x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stop-color="#16a34a" stop-opacity="0.3"/>
                            <stop offset="100%" stop-color="#16a34a" stop-opacity="0"/>
                          </linearGradient>
                        </defs>
                        <line x1="0" y1="4" x2="240" y2="4" stroke="#e7e8e9"/>
                        <line x1="0" y1="32" x2="240" y2="32" stroke="#e7e8e9"/>
                        <line x1="0" y1="60" x2="240" y2="60" stroke="#e7e8e9"/>
                        <line x1="0" y1="88" x2="240" y2="88" stroke="#e7e8e9"/>
                        <path d="M0,80 C40,79 80,72 120,58 C160,44 190,24 240,4 L240,90 L0,90 Z" fill="url(#cs-chart-grad-p1)"/>
                        <path d="M0,80 C40,79 80,72 120,58 C160,44 190,24 240,4" fill="none" stroke="#16a34a" stroke-width="2"/>
                      </svg>
                      <div class="cs-growth-card-xaxis" aria-hidden="true">
                        <span>Month 1</span><span>Month 2</span><span>Month 3</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div class="cs-growth-card">
                <div class="cs-growth-card-header">
                  <span class="cs-growth-card-label">Total Leads (90 days)</span>
                </div>
                <div class="cs-growth-card-body">
                  <div>
                    <span class="cs-growth-card-value">00%</span><br>
                    <span class="cs-growth-card-caption">Outcome label</span>
                  </div>
                  <div class="cs-growth-card-chart">
                    <div class="cs-growth-card-yaxis" aria-hidden="true">
                      <span>00</span><span>00</span><span>00</span><span>0</span>
                    </div>
                    <div class="cs-growth-card-plot">
                      <svg viewBox="0 0 240 90" preserveAspectRatio="none" aria-hidden="true">
                        <defs>
                          <linearGradient x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stop-color="#0070ff" stop-opacity="0.3"/>
                            <stop offset="100%" stop-color="#0070ff" stop-opacity="0"/>
                          </linearGradient>
                        </defs>
                        <line x1="0" y1="4" x2="240" y2="4" stroke="#e7e8e9"/>
                        <line x1="0" y1="32" x2="240" y2="32" stroke="#e7e8e9"/>
                        <line x1="0" y1="60" x2="240" y2="60" stroke="#e7e8e9"/>
                        <line x1="0" y1="88" x2="240" y2="88" stroke="#e7e8e9"/>
                        <path d="M0,84 C50,84 90,82 130,70 C170,58 200,32 240,6 L240,90 L0,90 Z" fill="url(#cs-chart-grad-p2)"/>
                        <path d="M0,84 C50,84 90,82 130,70 C170,58 200,32 240,6" fill="none" stroke="#0070ff" stroke-width="2"/>
                      </svg>
                      <div class="cs-growth-card-xaxis" aria-hidden="true">
                        <span>Month 1</span><span>Month 2</span><span>Month 3</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </figure>
            <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>
          </div>
        </div>

        
        <figure class="cs-quote">
          
          <svg class="cs-quote-mark is-hidden" viewBox="0 0 31 24" aria-hidden="true"><path d="M0 24V13.7C0 6.13 4.6 1.05 12.4 0l1.4 4.2c-4.3 1-6.7 3.5-7 7.4H14V24H0Zm17 0V13.7C17 6.13 21.6 1.05 29.4 0L31 4.2c-4.4 1-6.8 3.5-7.1 7.4H31V24H17Z"/></svg>
          <p>&ldquo;A short quote from the client about the result they got, in their own words.&rdquo;</p>
          <figcaption class="cs-byline">
            
            <span class="cs-byline-photo">
              
            </span>
            <span class="cs-byline-text">
              <b>Client name</b>
              <span>Role, Company</span>
            </span>
          </figcaption>
        </figure>

        <div class="cs-block">
          <h2>Heading for why it matters</h2>
          <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>
        </div>

        <div class="cs-block">
          <h2>Ready to build your growth story</h2>
          <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>
        </div>
      </div>

      
      <div class="cs-aside">
        <div class="cs-card">
          <div class="cs-card-content">
            <div class="cs-card-people" aria-hidden="true">
              <span style="position:relative;display:block;width:70px;height:40px"><span style="position:absolute;left:0;top:0;width:40px;height:40px;border-radius:50%;background:#cfd1d4;border:2px solid #fff;box-sizing:border-box"></span><span style="position:absolute;left:30px;top:0;width:40px;height:40px;border-radius:50%;background:#bbbec4;border:2px solid #fff;box-sizing:border-box"></span></span>
            </div>
            <h3>Discover AI agents that help businesses get more qualified leads.</h3>
          </div>
          <a class="cs-btn">Book a Demo</a>
        </div>
      </div>
    </div>
  </div>

  
  <div class="cs-footer">
    <div class="cs-footer-inner">
      <div class="cs-footer-main">
        
        <div class="cs-footer-cols">
          <div class="cs-footer-col">
            <h4>Platform</h4>
            <div class="cs-footer-list">
              <a>Brand Memory</a>
              <a>Page Creation Engine</a>
              <a>AI-First CMS</a>
              <a>Leads Dashboard</a>
              <a>Analytics</a>
            </div>
          </div>
          <div class="cs-footer-col">
            <h4>Solutions</h4>
            <div class="cs-footer-list">
              <a>AI Search Agent</a>
              <a>Lead Conversion</a>
              <a>Paid Boost</a>
            </div>
          </div>
          <div class="cs-footer-col">
            <h4>Company</h4>
            <div class="cs-footer-list">
              <a>Pricing</a>
              <a>Careers</a>
              <a>Customers</a>
              <a>Alternatives</a>
              <a>Affiliate</a>
            </div>
          </div>
        </div>

        <div class="cs-footer-comp">
          <div class="cs-footer-addr-row">
            <div class="cs-footer-addr-col">
              <p>Gushwork, Regents Inc, 16192 Coastal Hwy, Lewes, DE 19958, United States</p>
              
              <div class="cs-footer-contact">
                <a>+1 (888) 451 5522</a>
                <a>growth@gushwork.ai</a>
              </div>
            </div>
            <div class="cs-footer-addr-col">
              <p>Gushwork, 578, 9th A Main Rd, Indiranagar, Bengaluru, Karnataka 560038, India</p>
            </div>
          </div>
        </div>
      </div>

      
      <div class="cs-footer-social">
        <a>
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M14.8156 0H1.18125C0.528125 0 0 0.515625 0 1.15313V14.8438C0 15.4813 0.528125 16 1.18125 16H14.8156C15.4688 16 16 15.4813 16 14.8469V1.15313C16 0.515625 15.4688 0 14.8156 0ZM4.74687 13.6344H2.37188V5.99687H4.74687V13.6344ZM3.55938 4.95625C2.79688 4.95625 2.18125 4.34062 2.18125 3.58125C2.18125 2.82188 2.79688 2.20625 3.55938 2.20625C4.31875 2.20625 4.93437 2.82188 4.93437 3.58125C4.93437 4.3375 4.31875 4.95625 3.55938 4.95625ZM13.6344 13.6344H11.2625V9.92188C11.2625 9.0375 11.2469 7.89687 10.0281 7.89687C8.79375 7.89687 8.60625 8.8625 8.60625 9.85938V13.6344H6.2375V5.99687H8.5125V7.04063H8.54375C8.85937 6.44063 9.63438 5.80625 10.7875 5.80625C13.1906 5.80625 13.6344 7.3875 13.6344 9.44375V13.6344V13.6344Z"/></svg>
        </a>
        <a>
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M12.2175 1.26929H14.4665L9.5531 6.88495L15.3333 14.5266H10.8075L7.26265 9.89198L3.20659 14.5266H0.956247L6.21158 8.52002L0.666626 1.26929H5.30737L8.51156 5.50551L12.2175 1.26929ZM11.4282 13.1805H12.6744L4.63022 2.54471H3.29293L11.4282 13.1805Z"/></svg>
        </a>
        <a>
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.44062C10.1375 1.44062 10.3906 1.45 11.2313 1.4875C12.0125 1.52187 12.4344 1.65313 12.7156 1.7625C13.0875 1.90625 13.3563 2.08125 13.6344 2.35938C13.9156 2.64063 14.0875 2.90625 14.2313 3.27813C14.3406 3.55938 14.4719 3.98437 14.5063 4.7625C14.5438 5.60625 14.5531 5.85938 14.5531 7.99375C14.5531 10.1313 14.5438 10.3844 14.5063 11.225C14.4719 12.0063 14.3406 12.4281 14.2313 12.7094C14.0875 13.0813 13.9125 13.35 13.6344 13.6281C13.3531 13.9094 13.0875 14.0813 12.7156 14.225C12.4344 14.3344 12.0094 14.4656 11.2313 14.5C10.3875 14.5375 10.1344 14.5469 8 14.5469C5.8625 14.5469 5.60938 14.5375 4.76875 14.5C3.9875 14.4656 3.56563 14.3344 3.28438 14.225C2.9125 14.0813 2.64375 13.9063 2.36563 13.6281C2.08438 13.3469 1.9125 13.0813 1.76875 12.7094C1.65938 12.4281 1.52813 12.0031 1.49375 11.225C1.45625 10.3813 1.44688 10.1281 1.44688 7.99375C1.44688 5.85625 1.45625 5.60312 1.49375 4.7625C1.52813 3.98125 1.65938 3.55938 1.76875 3.27813C1.9125 2.90625 2.0875 2.6375 2.36563 2.35938C2.64688 2.07813 2.9125 1.90625 3.28438 1.7625C3.56563 1.65313 3.99063 1.52187 4.76875 1.4875C5.60938 1.45 5.8625 1.44062 8 1.44062ZM8 0C5.82813 0 5.55625 0.009375 4.70313 0.046875C3.85313 0.084375 3.26875 0.221875 2.7625 0.41875C2.23438 0.625 1.7875 0.896875 1.34375 1.34375C0.896875 1.7875 0.625 2.23438 0.41875 2.75938C0.221875 3.26875 0.084375 3.85 0.046875 4.7C0.009375 5.55625 0 5.82813 0 8C0 10.1719 0.009375 10.4438 0.046875 11.2969C0.084375 12.1469 0.221875 12.7313 0.41875 13.2375C0.625 13.7656 0.896875 14.2125 1.34375 14.6563C1.7875 15.1 2.23438 15.375 2.75938 15.5781C3.26875 15.775 3.85 15.9125 4.7 15.95C5.55313 15.9875 5.825 15.9969 7.99688 15.9969C10.1688 15.9969 10.4406 15.9875 11.2938 15.95C12.1438 15.9125 12.7281 15.775 13.2344 15.5781C13.7594 15.375 14.2063 15.1 14.65 14.6563C15.0938 14.2125 15.3688 13.7656 15.5719 13.2406C15.7688 12.7313 15.9063 12.15 15.9438 11.3C15.9813 10.4469 15.9906 10.175 15.9906 8.00313C15.9906 5.83125 15.9813 5.55938 15.9438 4.70625C15.9063 3.85625 15.7688 3.27188 15.5719 2.76563C15.375 2.23438 15.1031 1.7875 14.6563 1.34375C14.2125 0.9 13.7656 0.625 13.2406 0.421875C12.7313 0.225 12.15 0.0875 11.3 0.05C10.4438 0.009375 10.1719 0 8 0Z"/><path d="M8 3.89062C5.73125 3.89062 3.89062 5.73125 3.89062 8C3.89062 10.2688 5.73125 12.1094 8 12.1094C10.2688 12.1094 12.1094 10.2688 12.1094 8C12.1094 5.73125 10.2688 3.89062 8 3.89062ZM8 10.6656C6.52813 10.6656 5.33437 9.47188 5.33437 8C5.33437 6.52813 6.52813 5.33437 8 5.33437C9.47188 5.33437 10.6656 6.52813 10.6656 8C10.6656 9.47188 9.47188 10.6656 8 10.6656Z"/><path d="M13.2312 3.72805C13.2312 4.2593 12.8 4.68743 12.2719 4.68743C11.7406 4.68743 11.3125 4.25618 11.3125 3.72805C11.3125 3.1968 11.7438 2.76868 12.2719 2.76868C12.8 2.76868 13.2312 3.19993 13.2312 3.72805Z"/></svg>
        </a>
      </div>

      
      <div class="cs-footer-legal">
        <span>&copy; 2026 Gushwork | All Rights Reserved</span>
        <div>
          
          <a>Privacy Policy</a>
          <a>Terms &amp; Conditions</a>
        </div>
      </div>
    </div>

    
    
  </div>
</div>

</div></div></div><span class="cap">375 wide</span></div></div></div></div>