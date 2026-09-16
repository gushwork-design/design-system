#!/usr/bin/env node
/**
 * Build a real, editable .pptx from the deck's measured geometry.
 *
 * WHY EDITABLE AND NOT A PNG PER SLIDE. The only reason to want a .pptx is
 * that someone downstream needs to change the words. A deck of flattened
 * images is a PDF wearing a .pptx extension, so every text run here is a real
 * text object and every card is a real shape.
 *
 * WHAT IT WILL NOT DO. Vert Grotesk Display cannot travel — PowerPoint and
 * Google Slides will not load a custom face — so this output renders in
 * Plus Jakarta Sans. That is correct and it is R21, not a bug. Anything
 * already flat in the source (the press strip, the pricing table, the case
 * study) stays an image, because that is what the source has.
 *
 * UNITS. The slide is 10 x 5.625in and 1920px wide, so:
 *   1px = 1/192 in  and  1px = 0.375pt
 * A 72px title is therefore 27pt, which is exactly what the source deck
 * carries — the conversion is a round trip, not an approximation.
 */

import PptxGenJS from 'pptxgenjs';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '../..');
const A = (p) => {
  const full = resolve(REPO, p);
  if (!existsSync(full)) throw new Error(`missing asset: ${p}`);
  return full;
};

const IN = (px) => px / 192;      // px -> inches
const PT = (px) => px * 0.375;    // px -> points

// Tokens, mirrored from foundation/tokens.css. pptx wants bare hex.
const C = {
  primary25: 'F2F8FF',
  primary500: '0070FF',
  white: 'FFFFFF',
  black: '0D0D0D',
  neutral200: 'CFD1D4',
  neutral400: '959BA4',
  neutral600: '6A7077',
  neutral700: '535A61',
  neutral850: '333333',
  // 60% white over primary-500 resolves EXACTLY to primary-200 (#99c6ff):
  //   r .6*255+.4*0x00 = 153  g .6*255+.4*112 = 198  b .6*255+.4*255 = 255
  // pptx has no per-run opacity, so the cover's dimmed title uses the flat
  // token rather than an eyeballed light blue. Same colour, no invention.
  primary200: '99C6FF',
};
const DISPLAY = 'Plus Jakarta Sans';   // R21 — the export fallback
const BODY = 'Inter';

const pptx = new PptxGenJS();
pptx.defineLayout({ name: 'GW', width: 10, height: 5.625 });
pptx.layout = 'GW';
pptx.author = 'Gushwork Design';
pptx.company = 'Gushwork';
pptx.title = 'Roadmap to generate 10 qualified leads monthly';

/** A slide on the blue ground. */
function slide() {
  const s = pptx.addSlide();
  // The ground is a vector in Figma and CSS in the HTML build; pptx has
  // neither, so it takes the SVG rasterised by PowerPoint on open.
  s.addImage({ path: A('assets/slides/slide-ground.svg'), x: 0, y: 0, w: 10, h: 5.625 });
  return s;
}

/** Title on the ground, plus the logo mark. Returns the card's top in px. */
function chrome(s, title, { mark = true } = {}) {
  const twoLine = title.includes('\n');
  s.addText(title, {
    x: IN(40), y: IN(38.2), w: IN(twoLine ? 1523.2 : 1723.2), h: IN(twoLine ? 205.4 : 86),
    fontFace: DISPLAY, fontSize: PT(72), bold: true, color: C.white,
    lineSpacingMultiple: 1.2, valign: 'top', margin: 0,
  });
  if (mark) {
    s.addImage({
      path: A('assets/logo/gushwork-symbol-white.svg'),
      x: IN(1815.6), y: IN(61.8), w: IN(38.7), h: IN(38.7),
    });
  }
  return twoLine ? 282.8 : 178.2;
}

/** The white content card. */
function card(s, top, { radius = 36 } = {}) {
  s.addShape(pptx.ShapeType.roundRect, {
    x: IN(20), y: IN(top), w: IN(1880), h: IN(top === 282.8 ? 777.3 : 884),
    fill: { color: C.white },
    line: { color: C.neutral200, width: 1 },
    rectRadius: IN(radius),
  });
}

/** The texture-filled media well. Cutout is optional and never cropped. */
function well(s, top, cutout) {
  s.addImage({
    path: A('assets/slides/well-texture.png'),
    x: IN(40), y: IN(top + 14.5), w: IN(779), h: IN(852.3),
  });
  if (cutout) {
    // 76% height, bottom-anchored — same reasoning as the HTML build: at full
    // height the cutout collides with the lead paragraph.
    const h = 852.3 * 0.76;
    const w = h * (1358 / 1760);   // phone-serp.png native aspect
    s.addImage({
      path: A(cutout),
      x: IN(40 + (779 - w) / 2), y: IN(top + 14.5 + 852.3 - h), w: IN(w), h: IN(h),
    });
  }
}

/** Lead paragraph, with one phrase lifted to blue. */
function lead(s, top, runs) {
  s.addText(
    runs.map((r) => ({
      text: r.t,
      options: { bold: !!r.b, color: r.b ? C.primary500 : C.neutral850 },
    })),
    {
      x: IN(69), y: IN(top + 48), w: IN(694.6), h: IN(160),
      fontFace: BODY, fontSize: PT(26), lineSpacingMultiple: 1.4,
      valign: 'top', margin: 0,
    },
  );
}

/* ========================================================================
   1. Cover. Rebuilt rather than imaged, so the claim stays editable.
   The 60%-white / solid-white emphasis becomes two colours, because pptx
   has no per-run opacity.
   ==================================================================== */
{
  const s = slide();
  s.addShape(pptx.ShapeType.roundRect, {
    x: IN(40), y: IN(40), w: IN(1840), h: IN(912),
    fill: { color: C.primary500 },
    line: { color: C.white, width: 3, transparency: 80 },
    rectRadius: IN(32),
  });
  s.addImage({
    path: A('assets/slides/cover-site-ghost-example.png'),   // SWAP PER DECK
    x: IN(60), y: IN(60), w: IN(1800), h: IN(872), transparency: 88,
  });
  s.addShape(pptx.ShapeType.roundRect, {
    x: IN(88), y: IN(300), w: IN(700), h: IN(64),
    fill: { color: 'F7F8F9' }, line: { color: 'F1F2F3', width: 1 },
    rectRadius: IN(32),
  });
  s.addText('Designed for manufacturers and distributors', {
    x: IN(112), y: IN(300), w: IN(660), h: IN(64),
    fontFace: BODY, fontSize: PT(20), color: C.black, valign: 'middle', margin: 0,
  });
  s.addText(
    [
      { text: 'Roadmap to ', options: { color: C.primary200 } },
      { text: 'generate 10 qualified leads monthly', options: { color: C.white } },
      { text: ' for machine tool builders', options: { color: C.primary200 } },
    ],
    {
      x: IN(88), y: IN(400), w: IN(1140), h: IN(400),
      fontFace: DISPLAY, fontSize: PT(90), bold: true,
      lineSpacingMultiple: 1.2, valign: 'top', margin: 0,
    },
  );
  s.addImage({ path: A('assets/logo/gushwork-logo-white.svg'), x: IN(96), y: IN(880), w: IN(180), h: IN(37) });
  s.addText('www.gushwork.ai', {
    x: IN(1500), y: IN(880), w: IN(340), h: IN(40),
    fontFace: BODY, fontSize: PT(22), color: C.primary200, align: 'right', margin: 0,
  });
}

/* ---- 2. Split card ---------------------------------------------------- */
{
  const s = slide();
  const top = chrome(s, "You'll be in good hands");
  card(s, top);
  well(s, top);
  lead(s, top, [
    { t: 'Most small and medium business websites stay invisible to Google and AI. ' },
    { t: 'We make them discoverable.', b: true },
  ]);
  s.addImage({
    path: A('assets/slides/press-cards.png'),
    x: IN(819), y: IN(752.8), w: IN(1057), h: IN(182),
  });
}

/* ---- 3. Feature list -------------------------------------------------- */
{
  const s = slide();
  const top = chrome(s, 'Our approach: intent-led AI SEO');
  card(s, top);
  well(s, top, 'assets/slides/phone-serp.png');
  lead(s, top, [
    { t: 'We turn your website into a lead magnet with an automated AI SEO engine, so you ' },
    { t: 'show up where buyers search', b: true },
    { t: ' and convert visitors into revenue.' },
  ]);
  const rows = [
    ['Find the demand', 'Identify 1,000+ real search queries your buyers are asking.'],
    ['Outsmart the competition', 'Scrape top results, then publish stronger, data-backed pages.'],
    ['Publish at scale', 'Launch 100+ targeted pages yearly.'],
    ['AI feed', 'An AI-optimised feed that boosts Google rankings and AI mentions.'],
  ];
  // Fixed 40px gap, not the source's four irregular pitches — see layouts.md.
  let y = top + 74.2;
  for (const [h, b] of rows) {
    s.addShape(pptx.ShapeType.roundRect, {
      x: IN(893.4), y: IN(y), w: IN(86), h: IN(86),
      fill: { type: 'none' }, line: { color: C.neutral200, width: 1 },
      rectRadius: IN(16),
    });
    s.addText(h, {
      x: IN(1003), y: IN(y), w: IN(735.1), h: IN(40),
      fontFace: DISPLAY, fontSize: PT(32), bold: true, color: C.black, valign: 'top', margin: 0,
    });
    s.addText(b, {
      x: IN(1003), y: IN(y + 44), w: IN(735.1), h: IN(40),
      fontFace: BODY, fontSize: PT(22), color: C.neutral600, valign: 'top', margin: 0,
    });
    y += 126;
  }
}

/* ---- 4. Step row ------------------------------------------------------ */
{
  const s = slide();
  const top = chrome(s, 'Low touch from your end,\nhighly managed from ours');
  card(s, top);
  const steps = [
    ['Beginning', 'Onboarding call', 'With your customer growth strategist, senior growth strategist and account executive.'],
    ['Ongoing updates', 'Strategic progress updates', 'Delivered to you.'],
    ['Monthly', 'Monthly catch up', 'With your customer growth strategist.'],
    ['Quarterly', 'Quarterly business review', 'With our head of client success and your customer growth strategist.'],
  ];
  steps.forEach(([eyebrow, head, foot], i) => {
    const x = 51.3 + i * 461.1;
    s.addShape(pptx.ShapeType.roundRect, {
      x: IN(x), y: IN(top + 28.1), w: IN(441.7), h: IN(463.8),
      fill: { color: C.primary25 }, line: { type: 'none' }, rectRadius: IN(40),
    });
    s.addText(eyebrow.toUpperCase(), {
      x: IN(x + 27.3), y: IN(top + 60), w: IN(387), h: IN(34),
      fontFace: BODY, fontSize: PT(22), bold: true, color: C.primary500, valign: 'top', margin: 0,
    });
    s.addText(head, {
      x: IN(x + 27.3), y: IN(top + 112), w: IN(387), h: IN(120),
      fontFace: DISPLAY, fontSize: PT(32), bold: true, color: C.black, valign: 'top', margin: 0,
    });
    s.addText(foot, {
      x: IN(x + 27.3), y: IN(top + 340), w: IN(387), h: IN(110),
      fontFace: BODY, fontSize: PT(22), color: C.neutral700, valign: 'top', margin: 0,
    });
  });
}

/* ---- 5. Full-bleed card ----------------------------------------------- */
{
  const s = slide();
  const top = chrome(s, 'John Maye Company: a case study');
  card(s, 176, { radius: 32 });
  s.addImage({
    path: A('assets/slides/case-study-john-maye.png'),
    x: IN(40), y: IN(197.8), w: IN(1816.8), h: IN(862.2),
  });
}

/* ---- 6. Pricing ------------------------------------------------------- */
{
  const s = slide();
  const top = chrome(s, 'Simple pricing that ramps with ROI');
  card(s, top);
  s.addText('Choose your speed to qualified leads', {
    x: IN(134.2), y: IN(294.8), w: IN(801), h: IN(60),
    fontFace: DISPLAY, fontSize: PT(44), bold: true, color: C.black, valign: 'top', margin: 0,
  });
  s.addText(
    [
      { text: 'Save $2,400 a year', options: { bold: true, color: C.primary500 } },
      { text: ' with an annual subscription or upfront payment.', options: { color: C.neutral600 } },
    ],
    {
      x: IN(134.2), y: IN(366), w: IN(1045.4), h: IN(40),
      fontFace: BODY, fontSize: PT(26), valign: 'top', margin: 0,
    },
  );
  s.addImage({
    path: A('assets/slides/pricing-table.png'),
    x: IN(42.2), y: IN(418), w: IN(1800.8), h: IN(567.4),
  });
  s.addText('650+ businesses worldwide trust us to generate high-intent leads', {
    x: IN(407), y: IN(937.8), w: IN(979.4), h: IN(60),
    fontFace: DISPLAY, fontSize: PT(26), bold: true, color: C.black,
    align: 'center', valign: 'top', margin: 0,
  });
}

/* ---- 7-11. Ground-only layouts. All AUTHORED — see layouts.md. -------- */
function centred(lines) {
  const s = slide();
  let y = 420;
  for (const l of lines) {
    s.addText(l.text, {
      x: IN(200), y: IN(y), w: IN(1520), h: IN(l.h),
      fontFace: l.face || DISPLAY, fontSize: PT(l.size), bold: l.bold !== false,
      color: l.color || C.white, align: 'center', valign: 'top', margin: 0,
      lineSpacingMultiple: 1.2,
    });
    y += l.h + 24;
  }
  return s;
}

centred([
  { text: 'PART TWO', size: 22, face: BODY, color: C.primary200, h: 34 },
  { text: 'What the first 90 days look like', size: 72, h: 100 },
]);

centred([
  { text: '1.3M', size: 90, h: 130 },
  { text: 'search impressions in 12 months, from a site that ranked for nothing',
    size: 26, face: BODY, bold: false, color: C.primary200, h: 50 },
]);

{
  const s = slide();
  const top = chrome(s, "Don't just take our word for it");
  card(s, top);
  well(s, top);
  s.addText(
    'We went from invisible to page one in four months, and the leads that come through now already know what we do.',
    {
      x: IN(879), y: IN(240), w: IN(940), h: IN(300),
      fontFace: DISPLAY, fontSize: PT(44), bold: true, color: C.black, valign: 'top', margin: 0,
      lineSpacingMultiple: 1.2,
    },
  );
  s.addText('Replace with a real customer, company and number.', {
    x: IN(879), y: IN(600), w: IN(940), h: IN(40),
    fontFace: BODY, fontSize: PT(22), color: C.neutral700, valign: 'top', margin: 0,
  });
}

{
  const s = slide();
  const top = chrome(s, 'Before and after');
  card(s, top);
  [
    ['BEFORE', 'Ranked for nothing', 'No organic pipeline. Every lead bought.', 'F7F8F9', C.neutral600],
    ['AFTER', '100+ pages ranking', 'Qualified inbound, arriving without spend.', C.primary25, C.primary500],
  ].forEach(([eyebrow, head, foot, fill, accent], i) => {
    const x = 51.3 + i * 922.5;
    s.addShape(pptx.ShapeType.roundRect, {
      x: IN(x), y: IN(top + 28.1), w: IN(902.5), h: IN(827.8),
      fill: { color: fill }, line: { type: 'none' }, rectRadius: IN(40),
    });
    s.addText(eyebrow, {
      x: IN(x + 27.3), y: IN(top + 60), w: IN(848), h: IN(34),
      fontFace: BODY, fontSize: PT(22), bold: true, color: accent, valign: 'top', margin: 0,
    });
    s.addText(head, {
      x: IN(x + 27.3), y: IN(top + 112), w: IN(848), h: IN(80),
      fontFace: DISPLAY, fontSize: PT(32), bold: true, color: C.black, valign: 'top', margin: 0,
    });
    s.addText(foot, {
      x: IN(x + 27.3), y: IN(top + 700), w: IN(848), h: IN(60),
      fontFace: BODY, fontSize: PT(22), color: C.neutral700, valign: 'top', margin: 0,
    });
  });
}

centred([{ text: 'Thank you', size: 72, h: 110 }]);

const out = resolve(HERE, 'out/deck.pptx');
await pptx.writeFile({ fileName: out });
console.log(`Wrote ${out}`);
console.log('');
console.log('This renders in Plus Jakarta Sans, not Vert Grotesk Display.');
console.log('That is R21 in DECISIONS.md — the fallback doing its job, not a bug.');
console.log('');
console.log('To land it in Google Slides, upload it through the Drive connector');
console.log('with conversion left on; Slides converts .pptx to a native deck.');
