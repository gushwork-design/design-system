/* ============================================================================
   shell.js — injects the topbar and sidebar into whatever page loads it.

   Written this way so the GENERATED sheets (changelog, install, review sheet,
   catalogue) can wear the chrome without their generators having to know how
   the chrome is built. A sheet adds two tags and nothing else changes:

     <link rel="stylesheet" href="/shell.css">
     <script src="/shell.js" defer></script>

   What it does, in order:
     1. moves the page's existing body children into <main class="gw-main">
     2. prepends the topbar and sidebar
     3. marks the active nav item from location.pathname
     4. asks /api/auth/me who is signed in, and re-renders the gated bits
     5. wires the theme toggle and the login modal

   The theme itself is set by a tiny blocking snippet in each page's <head>
   (see PAGE_THEME_SNIPPET at the bottom of this file) so there is no flash.
   ========================================================================= */
(function () {
  'use strict';

  /* -- icons -------------------------------------------------------------
     Phosphor, at the weights measured in Figma: nav icons Regular 16,
     MagnifyingGlass Bold, SunDim / Moon / Bell / Question Regular (1 Oct 2026: the topbar trio read
     darker in Bold, so all three are Regular), Lock / LockOpen Regular 16
     (683:5282 — the keyhole ones, not LockSimple). All 0 0 256 256.  */
  var ICON = {
    'copy':                'M216,32H88a8,8,0,0,0-8,8V80H40a8,8,0,0,0-8,8V216a8,8,0,0,0,8,8H168a8,8,0,0,0,8-8V176h40a8,8,0,0,0,8-8V40A8,8,0,0,0,216,32ZM160,208H48V96H160Zm48-48H176V88a8,8,0,0,0-8-8H96V48H208Z',
    'link':                'M240,88.23a54.43,54.43,0,0,1-16,37L189.25,160a54.27,54.27,0,0,1-38.63,16h-.05A54.63,54.63,0,0,1,96,119.84a8,8,0,0,1,16,.45A38.62,38.62,0,0,0,150.58,160h0a38.39,38.39,0,0,0,27.31-11.31l34.75-34.75a38.63,38.63,0,0,0-54.63-54.63l-11,11A8,8,0,0,1,135.7,59l11-11A54.65,54.65,0,0,1,224,48,54.86,54.86,0,0,1,240,88.23ZM109,185.66l-11,11A38.41,38.41,0,0,1,70.6,208h0a38.63,38.63,0,0,1-27.29-65.94L78,107.31A38.63,38.63,0,0,1,144,135.71a8,8,0,0,0,16,.45A54.86,54.86,0,0,0,144,96a54.65,54.65,0,0,0-77.27,0L32,130.75A54.62,54.62,0,0,0,70.56,224h0a54.28,54.28,0,0,0,38.64-16l11-11A8,8,0,0,0,109,185.66Z',
    'arrow-up-right':      'M200,64V168a8,8,0,0,1-16,0V83.31L69.66,197.66a8,8,0,0,1-11.32-11.32L172.69,72H88a8,8,0,0,1,0-16H192A8,8,0,0,1,200,64Z',
    /* The caret the "On this page" rail already draws; the toggle rotates it. A downward
       caret typed from memory came out as an "L". */
    'caret-right':         'M184.49,136.49l-80,80a12,12,0,0,1-17-17L159,128,87.51,56.49a12,12,0,1,1,17-17l80,80A12,12,0,0,1,184.49,136.49Z',
    'check-circle':        'M173.66,98.34a8,8,0,0,1,0,11.32l-56,56a8,8,0,0,1-11.32,0l-24-24a8,8,0,0,1,11.32-11.32L112,148.69l50.34-50.35A8,8,0,0,1,173.66,98.34ZM232,128A104,104,0,1,1,128,24,104.11,104.11,0,0,1,232,128Zm-16,0a88,88,0,1,0-88,88A88.1,88.1,0,0,0,216,128Z',
    'shapes':              'M71.59,61.47a8,8,0,0,0-15.18,0l-40,120A8,8,0,0,0,24,192h80a8,8,0,0,0,7.59-10.53ZM35.1,176,64,89.3,92.9,176ZM208,76a52,52,0,1,0-52,52A52.06,52.06,0,0,0,208,76Zm-88,0a36,36,0,1,1,36,36A36,36,0,0,1,120,76Zm104,68H136a8,8,0,0,0-8,8v56a8,8,0,0,0,8,8h88a8,8,0,0,0,8-8V152A8,8,0,0,0,224,144Zm-8,56H144V160h72Z',
    'swatches':            'M88,180a12,12,0,1,1-12-12A12,12,0,0,1,88,180Zm152-23.81V208a16,16,0,0,1-16,16H76a46.36,46.36,0,0,1-7.94-.68,44,44,0,0,1-35.43-50.95l25-143.13a15.94,15.94,0,0,1,18.47-13L130.84,26a16,16,0,0,1,12.92,18.52l-12.08,69L199.49,89a16,16,0,0,1,20.45,9.52L239,150.69A18.35,18.35,0,0,1,240,156.19ZM103,184.87,128,41.74,73.46,32l-25,143.1A28,28,0,0,0,70.9,207.57,27.29,27.29,0,0,0,91.46,203,27.84,27.84,0,0,0,103,184.87ZM116.78,195,224,156.11,204.92,104,128.5,131.7l-9.78,55.92A44.63,44.63,0,0,1,116.78,195ZM224,173.12,127.74,208H224Z',
    'download-simple':     'M224,144v64a8,8,0,0,1-8,8H40a8,8,0,0,1-8-8V144a8,8,0,0,1,16,0v56H208V144a8,8,0,0,1,16,0Zm-101.66,5.66a8,8,0,0,0,11.32,0l40-40a8,8,0,0,0-11.32-11.32L136,124.69V32a8,8,0,0,0-16,0v92.69L93.66,98.34a8,8,0,0,0-11.32,11.32Z',
    'sparkle':             'M197.58,129.06,146,110l-19-51.62a15.92,15.92,0,0,0-29.88,0L78,110l-51.62,19a15.92,15.92,0,0,0,0,29.88L78,178l19,51.62a15.92,15.92,0,0,0,29.88,0L146,178l51.62-19a15.92,15.92,0,0,0,0-29.88ZM137,164.22a8,8,0,0,0-4.74,4.74L112,223.85,91.78,169A8,8,0,0,0,87,164.22L32.15,144,87,123.78A8,8,0,0,0,91.78,119L112,64.15,132.22,119a8,8,0,0,0,4.74,4.74L191.85,144ZM144,40a8,8,0,0,1,8-8h16V16a8,8,0,0,1,16,0V32h16a8,8,0,0,1,0,16H184V64a8,8,0,0,1-16,0V48H152A8,8,0,0,1,144,40ZM248,88a8,8,0,0,1-8,8h-8v8a8,8,0,0,1-16,0V96h-8a8,8,0,0,1,0-16h8V72a8,8,0,0,1,16,0v8h8A8,8,0,0,1,248,88Z',
    'squares-four':        'M104,40H56A16,16,0,0,0,40,56v48a16,16,0,0,0,16,16h48a16,16,0,0,0,16-16V56A16,16,0,0,0,104,40Zm0,64H56V56h48v48Zm96-64H152a16,16,0,0,0-16,16v48a16,16,0,0,0,16,16h48a16,16,0,0,0,16-16V56A16,16,0,0,0,200,40Zm0,64H152V56h48v48Zm-96,32H56a16,16,0,0,0-16,16v48a16,16,0,0,0,16,16h48a16,16,0,0,0,16-16V152A16,16,0,0,0,104,136Zm0,64H56V152h48v48Zm96-64H152a16,16,0,0,0-16,16v48a16,16,0,0,0,16,16h48a16,16,0,0,0,16-16V152A16,16,0,0,0,200,136Zm0,64H152V152h48v48Z',
    'toolbox':             'M224,64H176V56a24,24,0,0,0-24-24H104A24,24,0,0,0,80,56v8H32A16,16,0,0,0,16,80V192a16,16,0,0,0,16,16H224a16,16,0,0,0,16-16V80A16,16,0,0,0,224,64ZM96,56a8,8,0,0,1,8-8h48a8,8,0,0,1,8,8v8H96ZM224,80v32H192v-8a8,8,0,0,0-16,0v8H80v-8a8,8,0,0,0-16,0v8H32V80Zm0,112H32V128H64v8a8,8,0,0,0,16,0v-8h96v8a8,8,0,0,0,16,0v-8h32v64Z',
    'stack-overflow-logo': 'M216,152.09V216a8,8,0,0,1-8,8H48a8,8,0,0,1-8-8V152.09a8,8,0,0,1,16,0V208H200V152.09a8,8,0,0,1,16,0Zm-128,32h80a8,8,0,1,0,0-16H88a8,8,0,1,0,0,16Zm4.88-53,77.27,20.68a7.89,7.89,0,0,0,2.08.28,8,8,0,0,0,2.07-15.71L97,115.61A8,8,0,1,0,92.88,131Zm18.45-49.93,69.28,40a8,8,0,0,0,10.93-2.93,8,8,0,0,0-2.93-10.91L119.33,67.27a8,8,0,1,0-8,13.84Zm87.33,13A8,8,0,1,0,210,82.84l-56.57-56.5a8,8,0,0,0-11.32,11.3Z',
    'checks':              'M149.61,85.71l-89.6,88a8,8,0,0,1-11.22,0L10.39,136a8,8,0,1,1,11.22-11.41L54.4,156.79l84-82.5a8,8,0,1,1,11.22,11.42Zm96.1-11.32a8,8,0,0,0-11.32-.1l-84,82.5-18.83-18.5a8,8,0,0,0-11.21,11.42l24.43,24a8,8,0,0,0,11.22,0l89.6-88A8,8,0,0,0,245.71,74.39Z',
    'squares-four':        'M104,40H56A16,16,0,0,0,40,56v48a16,16,0,0,0,16,16h48a16,16,0,0,0,16-16V56A16,16,0,0,0,104,40Zm0,64H56V56h48v48Zm96-64H152a16,16,0,0,0-16,16v48a16,16,0,0,0,16,16h48a16,16,0,0,0,16-16V56A16,16,0,0,0,200,40Zm0,64H152V56h48v48Zm-96,32H56a16,16,0,0,0-16,16v48a16,16,0,0,0,16,16h48a16,16,0,0,0,16-16V152A16,16,0,0,0,104,136Zm0,64H56V152h48v48Zm96-64H152a16,16,0,0,0-16,16v48a16,16,0,0,0,16,16h48a16,16,0,0,0,16-16V152A16,16,0,0,0,200,136Zm0,64H152V152h48v48Z',
    'magnifying-glass':    'M232.49,215.51,185,168a92.12,92.12,0,1,0-17,17l47.53,47.54a12,12,0,0,0,17-17ZM44,112a68,68,0,1,1,68,68A68.07,68.07,0,0,1,44,112Z',
    'sun':                 'M120,40V16a8,8,0,0,1,16,0V40a8,8,0,0,1-16,0Zm72,88a64,64,0,1,1-64-64A64.07,64.07,0,0,1,192,128Zm-16,0a48,48,0,1,0-48,48A48.05,48.05,0,0,0,176,128ZM58.34,69.66A8,8,0,0,0,69.66,58.34l-16-16A8,8,0,0,0,42.34,53.66Zm0,116.68-16,16a8,8,0,0,0,11.32,11.32l16-16a8,8,0,0,0-11.32-11.32ZM192,72a8,8,0,0,0,5.66-2.34l16-16a8,8,0,0,0-11.32-11.32l-16,16A8,8,0,0,0,192,72Zm5.66,114.34a8,8,0,0,0-11.32,11.32l16,16a8,8,0,0,0,11.32-11.32ZM48,128a8,8,0,0,0-8-8H16a8,8,0,0,0,0,16H40A8,8,0,0,0,48,128Zm80,80a8,8,0,0,0-8,8v24a8,8,0,0,0,16,0V216A8,8,0,0,0,128,208Zm112-88H216a8,8,0,0,0,0,16h24a8,8,0,0,0,0-16Z',
    'moon':                'M233.54,142.23a8,8,0,0,0-8-2,88.08,88.08,0,0,1-109.8-109.8,8,8,0,0,0-10-10,104.84,104.84,0,0,0-52.91,37A104,104,0,0,0,136,224a103.09,103.09,0,0,0,62.52-20.88,104.84,104.84,0,0,0,37-52.91A8,8,0,0,0,233.54,142.23ZM188.9,190.34A88,88,0,0,1,65.66,67.11a89,89,0,0,1,31.4-26A106,106,0,0,0,96,56,104.11,104.11,0,0,0,200,160a106,106,0,0,0,14.92-1.06A89,89,0,0,1,188.9,190.34Z',
    'lock':                'M208,80H176V56a48,48,0,0,0-96,0V80H48A16,16,0,0,0,32,96V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V96A16,16,0,0,0,208,80ZM96,56a32,32,0,0,1,64,0V80H96ZM208,208H48V96H208V208Zm-68-56a12,12,0,1,1-12-12A12,12,0,0,1,140,152Z',
    'sign-out':            'M120,216a8,8,0,0,1-8,8H48a8,8,0,0,1-8-8V40a8,8,0,0,1,8-8h64a8,8,0,0,1,0,16H56V208h56A8,8,0,0,1,120,216Zm109.66-93.66-40-40a8,8,0,0,0-11.32,11.32L204.69,120H112a8,8,0,0,0,0,16h92.69l-26.35,26.34a8,8,0,0,0,11.32,11.32l40-40A8,8,0,0,0,229.66,122.34Z',
    'x':                   'M208.49,191.51a12,12,0,0,1-17,17L128,145,64.49,208.49a12,12,0,0,1-17-17L111,128,47.51,64.49a12,12,0,0,1,17-17L128,111l63.51-63.52a12,12,0,0,1,17,17L145,128Z',
    'gear':                'M128,80a48,48,0,1,0,48,48A48.05,48.05,0,0,0,128,80Zm0,80a32,32,0,1,1,32-32A32,32,0,0,1,128,160Zm88-29.84q.06-2.16,0-4.32l14.92-18.64a8,8,0,0,0,1.48-7.06,107.21,107.21,0,0,0-10.88-26.25,8,8,0,0,0-6-3.93l-23.72-2.64q-1.48-1.56-3-3L186,40.54a8,8,0,0,0-3.94-6,107.71,107.71,0,0,0-26.25-10.87,8,8,0,0,0-7.06,1.49L130.16,40Q128,40,125.84,40L107.2,25.11a8,8,0,0,0-7.06-1.48A107.6,107.6,0,0,0,73.89,34.51a8,8,0,0,0-3.93,6L67.32,64.27q-1.56,1.49-3,3L40.54,70a8,8,0,0,0-6,3.94,107.71,107.71,0,0,0-10.87,26.25,8,8,0,0,0,1.49,7.06L40,125.84Q40,128,40,130.16L25.11,148.8a8,8,0,0,0-1.48,7.06,107.21,107.21,0,0,0,10.88,26.25,8,8,0,0,0,6,3.93l23.72,2.64q1.49,1.56,3,3L70,215.46a8,8,0,0,0,3.94,6,107.71,107.71,0,0,0,26.25,10.87,8,8,0,0,0,7.06-1.49L125.84,216q2.16.06,4.32,0l18.64,14.92a8,8,0,0,0,7.06,1.48,107.21,107.21,0,0,0,26.25-10.88,8,8,0,0,0,3.93-6l2.64-23.72q1.56-1.48,3-3L215.46,186a8,8,0,0,0,6-3.94,107.71,107.71,0,0,0,10.87-26.25,8,8,0,0,0-1.49-7.06Zm-16.1-6.5a73.93,73.93,0,0,1,0,8.68,8,8,0,0,0,1.74,5.48l14.19,17.73a91.57,91.57,0,0,1-6.23,15L187,173.11a8,8,0,0,0-5.1,2.64,74.11,74.11,0,0,1-6.14,6.14,8,8,0,0,0-2.64,5.1l-2.51,22.58a91.32,91.32,0,0,1-15,6.23l-17.74-14.19a8,8,0,0,0-5-1.75h-.48a73.93,73.93,0,0,1-8.68,0,8,8,0,0,0-5.48,1.74L100.45,215.8a91.57,91.57,0,0,1-15-6.23L82.89,187a8,8,0,0,0-2.64-5.1,74.11,74.11,0,0,1-6.14-6.14,8,8,0,0,0-5.1-2.64L46.43,170.6a91.32,91.32,0,0,1-6.23-15l14.19-17.74a8,8,0,0,0,1.74-5.48,73.93,73.93,0,0,1,0-8.68,8,8,0,0,0-1.74-5.48L40.2,100.45a91.57,91.57,0,0,1,6.23-15L69,82.89a8,8,0,0,0,5.1-2.64,74.11,74.11,0,0,1,6.14-6.14A8,8,0,0,0,82.89,69L85.4,46.43a91.32,91.32,0,0,1,15-6.23l17.74,14.19a8,8,0,0,0,5.48,1.74,73.93,73.93,0,0,1,8.68,0,8,8,0,0,0,5.48-1.74L155.55,40.2a91.57,91.57,0,0,1,15,6.23L173.11,69a8,8,0,0,0,2.64,5.1,74.11,74.11,0,0,1,6.14,6.14,8,8,0,0,0,5.1,2.64l22.58,2.51a91.32,91.32,0,0,1,6.23,15l-14.19,17.74A8,8,0,0,0,199.87,123.66Z',
    'arrow-right':         'M221.66,133.66l-72,72a8,8,0,0,1-11.32-11.32L196.69,136H40a8,8,0,0,1,0-16H196.69L138.34,61.66a8,8,0,0,1,11.32-11.32l72,72A8,8,0,0,1,221.66,133.66Z',
    'envelope':            'M224,48H32a8,8,0,0,0-8,8V192a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A8,8,0,0,0,224,48Zm-96,85.15L52.57,64H203.43ZM98.71,128,40,181.81V74.19Zm11.84,10.85,12,11.05a8,8,0,0,0,10.82,0l12-11.05,58,53.15H52.57ZM157.29,128,216,74.18V181.82Z',
    'slack-logo':          'M221.13,128A32,32,0,0,0,184,76.31V56a32,32,0,0,0-56-21.13A32,32,0,0,0,76.31,72H56a32,32,0,0,0-21.13,56A32,32,0,0,0,72,179.69V200a32,32,0,0,0,56,21.13A32,32,0,0,0,179.69,184H200a32,32,0,0,0,21.13-56ZM72,152a16,16,0,1,1-16-16H72Zm48,48a16,16,0,0,1-32,0V152a16,16,0,0,1,16-16h16Zm0-80H56a16,16,0,0,1,0-32h48a16,16,0,0,1,16,16Zm0-48H104a16,16,0,1,1,16-16Zm16-16a16,16,0,0,1,32,0v48a16,16,0,0,1-16,16H136Zm16,160a16,16,0,0,1-16-16V184h16a16,16,0,0,1,0,32Zm48-48H152a16,16,0,0,1-16-16V136h64a16,16,0,0,1,0,32Zm0-48H184V104a16,16,0,1,1,16,16Z',
    'hash':                'M224,88H175.4l8.47-46.57a8,8,0,0,0-15.74-2.86l-9,49.43H111.4l8.47-46.57a8,8,0,0,0-15.74-2.86L95.14,88H48a8,8,0,0,0,0,16H92.23L83.5,152H32a8,8,0,0,0,0,16H80.6l-8.47,46.57a8,8,0,0,0,6.44,9.3A7.79,7.79,0,0,0,80,224a8,8,0,0,0,7.86-6.57l9-49.43H144.6l-8.47,46.57a8,8,0,0,0,6.44,9.3A7.79,7.79,0,0,0,144,224a8,8,0,0,0,7.86-6.57l9-49.43H208a8,8,0,0,0,0-16H163.77l8.73-48H224a8,8,0,0,0,0-16Zm-76.5,64H99.77l8.73-48h47.73Z',
    'bell':                'M221.8,175.94C216.25,166.38,208,139.33,208,104a80,80,0,1,0-160,0c0,35.34-8.26,62.38-13.81,71.94A16,16,0,0,0,48,200H88.81a40,40,0,0,0,78.38,0H208a16,16,0,0,0,13.8-24.06ZM128,216a24,24,0,0,1-22.62-16h45.24A24,24,0,0,1,128,216ZM48,184c7.7-13.24,16-43.92,16-80a64,64,0,1,1,128,0c0,36.05,8.28,66.73,16,80Z',
    'question':            'M140,180a12,12,0,1,1-12-12A12,12,0,0,1,140,180ZM128,72c-22.06,0-40,16.15-40,36v4a8,8,0,0,0,16,0v-4c0-11,10.77-20,24-20s24,9,24,20-10.77,20-24,20a8,8,0,0,0-8,8v8a8,8,0,0,0,16,0v-.72c18.24-3.35,32-17.9,32-35.28C168,88.15,150.06,72,128,72Zm104,56A104,104,0,1,1,128,24,104.11,104.11,0,0,1,232,128Zm-16,0a88,88,0,1,0-88,88A88.1,88.1,0,0,0,216,128Z',
    'desktop':             'M208,40H48A24,24,0,0,0,24,64V176a24,24,0,0,0,24,24h72v16H96a8,8,0,0,0,0,16h64a8,8,0,0,0,0-16H136V200h72a24,24,0,0,0,24-24V64A24,24,0,0,0,208,40ZM48,56H208a8,8,0,0,1,8,8v80H40V64A8,8,0,0,1,48,56ZM208,184H48a8,8,0,0,1-8-8V160H216v16A8,8,0,0,1,208,184Z',
    'lock-open':           'M208,80H96V56a32,32,0,0,1,32-32c15.37,0,29.2,11,32.16,25.59a8,8,0,0,0,15.68-3.18C171.32,24.15,151.2,8,128,8A48.05,48.05,0,0,0,80,56V80H48A16,16,0,0,0,32,96V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V96A16,16,0,0,0,208,80Zm0,128H48V96H208V208ZM140,152a12,12,0,1,1-12-12A12,12,0,0,1,140,152Z',
    'chart-line-up':       'M232,208a8,8,0,0,1-8,8H32a8,8,0,0,1-8-8V48a8,8,0,0,1,16,0V156.69l50.34-50.35a8,8,0,0,1,11.32,0L128,132.69,180.69,80H160a8,8,0,0,1,0-16h40a8,8,0,0,1,8,8v40a8,8,0,0,1-16,0V91.31l-58.34,58.35a8,8,0,0,1-11.32,0L96,123.31l-56,56V200H224A8,8,0,0,1,232,208Z',
    'users':               'M117.25,157.92a60,60,0,1,0-66.5,0A95.83,95.83,0,0,0,3.53,195.63a8,8,0,1,0,13.4,8.74,80,80,0,0,1,134.14,0,8,8,0,0,0,13.4-8.74A95.83,95.83,0,0,0,117.25,157.92ZM40,108a44,44,0,1,1,44,44A44.05,44.05,0,0,1,40,108Zm210.14,98.7a8,8,0,0,1-11.07-2.33A79.83,79.83,0,0,0,172,168a8,8,0,0,1,0-16,44,44,0,1,0-16.34-84.87,8,8,0,1,1-5.94-14.85,60,60,0,0,1,55.53,105.64,95.83,95.83,0,0,1,47.22,37.71A8,8,0,0,1,250.14,206.7Z',
    'list':                'M224,128a8,8,0,0,1-8,8H40a8,8,0,0,1,0-16H216A8,8,0,0,1,224,128ZM40,72H216a8,8,0,0,0,0-16H40a8,8,0,0,0,0,16ZM216,184H40a8,8,0,0,0,0,16H216a8,8,0,0,0,0-16Z'
  };

  /* The mark, from assets/logo/gushwork-symbol-white.svg */
  var MARK = '<svg viewBox="0 0 80 80" fill="none" aria-hidden="true">' +
    '<path d="M76.6088 4.56344C77.5025 2.36058 75.8495 0 73.4723 0H9.14286C4.0934 0 0 4.0934 0 9.14286V66.7778C0 72.018 5.17081 75.6829 9.9603 73.5568C40.8494 59.8449 64.3785 34.7075 76.6088 4.56344Z" fill="currentColor"/>' +
    '<path d="M32.5161 80C31.4022 80 30.9357 78.5531 31.8259 77.8835C54.9007 60.5265 71.4338 35.8047 78.7658 8.0522C78.9403 7.39154 80 7.51618 80 8.19951V70.8571C80 75.9066 75.9066 80 70.8571 80H32.5161Z" fill="currentColor"/></svg>';

  /* Google's mark, from assets/brand/google-g.svg */
  var GOOGLE_G = '<svg viewBox="0 0 17.64 18" fill="none" aria-hidden="true">' +
    '<path d="M8.99986 7.36361V10.8491H13.8435C13.6308 11.97 12.9925 12.9191 12.0353 13.5573L14.9562 15.8237C16.658 14.2528 17.6398 11.9455 17.6398 9.20461C17.6398 8.56644 17.5826 7.95274 17.4762 7.36371L8.99986 7.36361Z" fill="#4285F4"/>' +
    '<path d="M3.95601 10.713L3.29723 11.2173L0.965378 13.0336C2.44628 15.9709 5.48151 18 8.99967 18C11.4296 18 13.4669 17.1982 14.956 15.8237L12.0351 13.5573C11.2333 14.0973 10.2105 14.4246 8.99967 14.4246C6.65968 14.4246 4.67156 12.8455 3.95969 10.7182L3.95601 10.713Z" fill="#34A853"/>' +
    '<path d="M0.965384 4.96636C0.351781 6.17722 0 7.54361 0 8.99994C0 10.4563 0.351781 11.8227 0.965384 13.0335C0.965384 13.0417 3.95998 10.7099 3.95998 10.7099C3.77998 10.1699 3.67359 9.5972 3.67359 8.99985C3.67359 8.4025 3.77998 7.82981 3.95998 7.28981L0.965384 4.96636Z" fill="#FBBC05"/>' +
    '<path d="M8.99985 3.58363C10.3253 3.58363 11.5035 4.0418 12.4444 4.92545L15.0216 2.34821C13.4589 0.891874 11.4299 0 8.99985 0C5.4817 0 2.44628 2.02091 0.965378 4.96637L3.95988 7.29001C4.67166 5.16271 6.65986 3.58363 8.99985 3.58363Z" fill="#EA4335"/></svg>';

  function icon(name) {
    return '<svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="' +
      (ICON[name] || '') + '"/></svg>';
  }

  /* -- nav model ---------------------------------------------------------
     Labels, order and icons are what the Figma sidebar actually contains
     (478:14805). `tier` decides who sees the row and whether it is locked.
       public   — everyone
       internal — any signed-in @gushwork.ai account
       admin    — only the ADMIN_EMAILS allowlist                          */
  var GROUPS = [
    {
      label: 'Getting Started',
      tier: 'public',
      items: [
        { label: 'Overview',      href: '/',                       icon: 'check-circle' },
        { label: 'Style Guide',   href: '/style-guide',            icon: 'swatches' },
        { label: 'Downloads',     href: '/downloads',              icon: 'download-simple' }
      ]
    },
    {
      label: 'For Internal Use',
      tier: 'internal',
      /* The ONLY group that draws a padlock. Ruled by Utsav 29 Sep 2026 — the
         badge is a display decision, not an access one, so it is flagged here
         rather than inferred from `tier`, which the GTM group shares. */
      lock: true,
      items: [
        { label: 'Claude Plugin', href: '/internal/claude-plugin', icon: 'sparkle' },
        { label: 'Tools',         href: '/internal/tools',         icon: 'toolbox' },
        { label: 'Templates',     href: '/internal/templates',     icon: 'squares-four' },
        { label: 'Change Log',    href: '/internal/changelog',     icon: 'stack-overflow-logo' }
      ]
    },
    /* Staging is drawn as its own group in 683:5282 because it is a GTM
       surface, not a design-system one. Same `internal` tier for the item's
       own access rule, but it draws NO padlock (no `lock` flag) — ruled 29 Sep
       2026. The GROUP itself only renders for the `gtm` group
       (managed at /admin/access-control) or an admin — everyone else does
       not see the section at all, rather than seeing a link that 403s. */
    {
      label: 'For GTM Team',
      tier: 'internal',
      group: 'gtm',
      items: [
        { label: 'Staging',       href: '/internal/staging',       icon: 'stack-overflow-logo' }
      ]
    }
  ];

  /* A nav group with no `group` field is visible to anyone its `tier` already
     allows. One with a `group` field additionally needs membership in that
     named group — or admin, since "note everything should be visible for
     admin" applies to every section, not just the Admin one below. Before
     /api/auth/me has answered, session.groups is empty and session.admin is
     false, so a gated group simply does not render yet — same pop-in-once-known
     behaviour the Admin group already has. */
  function groupVisible(g) {
    if (!g.group) return true;
    return session.admin || (session.groups || []).indexOf(g.group) !== -1;
  }

  /* Pinned to the bottom of the rail, the way the dashboard keeps admin and
     the user card there (audit line 424). Rendered only for admins. */
  var ADMIN_GROUP = {
    label: 'Admin',
    tier: 'admin',
    items: [
      { label: 'Access Control', href: '/admin/access-control', icon: 'gear' },
      /* The Component Library, the Catalogue and the Review Gate are one page with three tabs
         (/admin/design-system), the same way Analytics holds the usage log, visits and insights.
         The Review tab asks for an owner account; the other two are for admins. The design workflow is
         a fourth tab. Ruled by Utsav, 1 Oct 2026. */
      { label: 'Design System', href: '/admin/design-system', icon: 'shapes' }
    ]
  };

  /* NEW in 796:11251 — the owner tier gets its own section under Admin.
     "Review Gate" is the existing /admin/review-sheet renamed, ruled 29 Sep 2026.
     "Usage Logs" is /admin/usage-log — added now that the page exists. The drawing's
     glyph was not read; `list` is a stand-in from the icons this rail already carries. */
  var OWNER_GROUP = {
    label: 'Owner',
    tier: 'admin',
    items: [
      { label: 'Analytics',    href: '/admin/analytics',    icon: 'chart-line-up' }
    ]
  };

  /* `modes` says which doors are open. Until the Google OAuth client exists
     the site runs on a shared password, so the modal has to be able to render
     either form — or both, once Google is configured alongside it. */
  var session = { signedIn: false, admin: false, owner: false, email: null, name: null,
                  picture: null, groups: [], modes: { google: false, password: true },
                  gate: false,
                  /* True until /api/auth/me has answered (or failed). While it is true the rail's account
                     row, the groups only some people see, and the bell are drawn as ghosts, so they do not
                     pop in and shove their neighbours when the answer lands. */
                  pending: true };

  /* Mac reads ⌘K, everything else Ctrl K. navigator.platform is deprecated but is still the
     only thing that answers this everywhere; userAgentData is Chromium-only, so it is tried
     first and platform is the fallback rather than the other way round. */
  var IS_MAC = (function () {
    try {
      var p = (navigator.userAgentData && navigator.userAgentData.platform) ||
              navigator.platform || '';
      return /mac|iphone|ipad/i.test(p);
    } catch (e) { return false; }
  })();
  var SHORTCUT = IS_MAC ? '\u2318K' : 'Ctrl K';
  /* Split, because the chip's 2px gap needs two boxes to sit between — measured
     791:4941: the Command glyph at x=4 and the "K" at x=18. As one string the gap
     did nothing and the two glyphs touched. */
  var KEYCAP = IS_MAC ? '<span>\u2318</span><span>K</span>'
                      : '<span>Ctrl</span><span>K</span>';

  /* -- theme ---------------------------------------------------------------
     System, Light or Dark. With no choice made the site FOLLOWS THE MACHINE (System), and changes with it while it is
     open. This reverses the 18 Sep 2026 ruling (default Light, System dropped); asked for again by Utsav on 2 Oct 2026.

     Two keys. `gw-theme-choice` is what the person picked and is written ONLY when they pick, so "never chose" can be told
     from "chose Light": it holds light, dark or system, and absent means system. `gw-theme` holds the RESOLVED light or
     dark, kept for the pages that read it. The no-flash script inlined in every page reads the choice and asks the
     machine itself, so first paint and this agree. The older `gw-theme-pref` is no longer read: it was written for
     everyone on every load while Light was the default, so it could not say who had actually chosen. */
  var THEMES = [
    { id: 'system', label: 'System', icon: 'desktop' },
    { id: 'light',  label: 'Light',  icon: 'sun' },
    { id: 'dark',   label: 'Dark',   icon: 'moon' }
  ];
  var CHOICE_KEY = 'gw-theme-choice', RESOLVED_KEY = 'gw-theme';

  function themePref() {
    try {
      var v = localStorage.getItem(CHOICE_KEY);
      if (v === 'light' || v === 'dark' || v === 'system') return v;
    } catch (e) { /* no storage: fall through to the default */ }
    return 'system';
  }
  function machineIsDark() {
    try { return !!(window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches); } catch (e) { return false; }
  }
  function resolveTheme(pref) {
    return pref === 'dark' ? 'dark' : pref === 'light' ? 'light' : (machineIsDark() ? 'dark' : 'light');
  }
  /* remember = true only when a person picks from the menu. Applying the default must not write a choice. */
  function applyTheme(pref, remember) {
    var resolved = resolveTheme(pref);
    document.documentElement.setAttribute('data-theme', resolved);
    try {
      localStorage.setItem(RESOLVED_KEY, resolved);
      if (remember) localStorage.setItem(CHOICE_KEY, pref);
    } catch (e) { /* private window — the attribute above still took */ }
  }

  /* -- helpers ----------------------------------------------------------- */
  function el(html) {
    var t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  /* /internal/changelog, /internal/changelog/ and /internal/changelog.html
     are the same page as far as the rail is concerned. */
  function normalise(p) {
    p = (p || '/').replace(/\/index\.html$/, '/').replace(/\.html$/, '');
    if (p.length > 1) p = p.replace(/\/+$/, '');
    return p || '/';
  }
  function isCurrent(href) { return normalise(location.pathname) === normalise(href); }

  /* The logo chip is brand blue everywhere except the two owner pages (Review Gate, Analytics),
     where it goes black so the bar says you are somewhere only the owner is. Ruled by Utsav, 1 Oct 2026. */
  var OWNER_PAGE = /^\/admin\/analytics$/.test(normalise(location.pathname));

  /* -- markup ------------------------------------------------------------ */
  function topbarHTML() {
    return '' +
      '<header class="gw-topbar">' +
        '<a class="gw-brand" href="/">' +
          /* The component has a second variant, `Internal` (683:5104), whose
             chip is Neutral/black rather than Primary/500. It is drawn for the
             pages behind the gate, so the bar itself tells you which side of
             it you are on without reading the URL. */
          '<span class="gw-brand__chip' + (OWNER_PAGE ? ' gw-brand__chip--owner' : '') +
               '" style="color:var(--gw-color-white)">' + MARK + '</span>' +
          '<span class="gw-brand__name">Gushwork Design</span>' +
        '</a>' +
        '<div class="gw-topbar__right">' +
          /* The field is the affordance; the palette is where typing happens. Keeping the
             input non-interactive means one input to manage and one place results can be,
             and the field keeps its measured 400x36 without growing a list underneath. */
          '<div class="gw-search" data-search-open role="button" tabindex="0" ' +
               'aria-haspopup="dialog" title="Search  ⌘K">' +
            icon('magnifying-glass') +
            '<input type="search" placeholder="Search any keyword..." tabindex="-1" ' +
                   'aria-hidden="true">' +
            /* aria-hidden: the shortcut is a visual affordance, and the field already
               announces itself. A screen reader reading "Command K" here would be
               describing decoration. */
            '<span class="gw-search__key" aria-hidden="true">' + KEYCAP + '</span>' +
          '</div>' +
          /* Phone: the 400px field does not fit at 375, so search collapses to the icon
             the field already leads with. Same [data-search-open] hook, so it opens the
             same palette — the affordance changes shape, not behaviour. Rendered at every
             width and hidden by CSS, so a resize never leaves the bar without it. */
          '<button class="gw-searchbtn" type="button" data-search-open ' +
                  'aria-haspopup="dialog" aria-label="Search">' +
            icon('magnifying-glass') +
          '</button>' +
          themeHTML() +
          /* Phone only, per the navbar's `Collapsed` variant. Hidden by CSS
             above the Phone breakpoint rather than conditionally rendered, so
             a resize never leaves the page without its only nav affordance. */
          '<button class="gw-burger" type="button" data-nav-toggle ' +
                  'aria-expanded="false" aria-controls="gw-rail" ' +
                  'aria-label="Menu">' + icon('list') + '</button>' +
        '</div>' +
      '</header>';
  }

  /* The drawing (683:5116) is a `controls/tab` holding a single 20px glyph.
     Ruled by Utsav 16 Sep 2026: keep that single trigger, darken it on hover,
     and open a menu with all three choices rather than lining the options up
     in the bar. */
  function themeHTML() {
    var pref = themePref();
    var current = THEMES.filter(function (t) { return t.id === pref; })[0] || THEMES[0];
    /* The control frames are bare — 795:5829 is a 24x24 frame holding a 16px glyph
       and nothing else, no fill and no stroke. The button wore .gw-theme's own
       padding and rounded box, which drew a frame the design does not have. It is
       the same .gw-iconbtn the bell and the help trigger use now. */
    return '<div class="gw-theme" data-theme-menu>' +
        '<button class="gw-iconbtn" type="button" data-theme-trigger data-tip="Appearance" ' +
                'aria-haspopup="menu" aria-expanded="false" ' +
                'aria-label="Colour theme: ' + esc(current.label) + '">' +
          /* The glyph of the ACTIVE theme (sun for light, moon for dark). It was a constant
             display glyph per Figma 791:2637; changed 30 Sep 2026 at Utsav's call so the
             button answers "which theme am I in" without opening the menu. */
          icon(current.icon) +
        '</button>' +
        '<div class="gw-theme__menu" role="menu" hidden>' +
          THEMES.map(function (t) {
            return '<button class="gw-theme__opt" type="button" role="menuitemradio" ' +
                     'aria-checked="' + (t.id === pref) + '" data-theme-set="' + t.id + '">' +
                     icon(t.icon) + '<span>' + t.label + '</span>' +
                   '</button>';
          }).join('') +
        '</div>' +
      '</div>';
  }

  function itemHTML(item, tier) {
    /* No gate, no locks. Drawing a padlock on a page that opens fine is worse than drawing
       nothing: the row becomes a button that pops a sign-in modal instead of a link that
       goes where it says, so the chrome actively blocks a page the server is serving. */
    var locked = session.gate &&
                 ((tier === 'internal' && !session.signedIn) ||
                  (tier === 'admin'    && !session.admin));
    /* SUPERSEDES the 16 Sep 2026 ruling, which kept the badge after sign-in and
       swapped it for an open padlock. Ruled again by Utsav 29 Sep 2026: the lock
       is a closed door, so once you are through it there is nothing to say. It
       now shows only while signed out, and only on the group that sets `lock`.
       The open-padlock state is gone; `lock-open` stays in the icon set because
       the access-control table still uses it. */
    /* No per-row badge any more — the group label carries the one lock. `locked`
       still decides whether the row is a button that opens the modal. */
    var badge = '';
    var cur = isCurrent(item.href) ? ' aria-current="page"' : '';
    var inner = icon(item.icon) +
      '<span class="gw-navitem__text">' + esc(item.label) + '</span>' + badge;

    /* A locked row is a button, not a link — it opens the modal instead of
       walking into a redirect. */
    return locked
      ? '<button class="gw-navitem" type="button" data-locked="' + esc(item.href) + '"' + cur + '>' + inner + '</button>'
      : '<a class="gw-navitem" href="' + esc(item.href) + '"' + cur + '>' + inner + '</a>';
  }

  /* A label and two rows, drawn as ghosts: stands in for the groups that only some people get. */
  function ghostGroupHTML() {
    return '<div class="gw-navgroup gw-navgroup--ghost" aria-hidden="true">' +
        '<div class="gw-ghost gw-ghost--label"></div>' +
        '<div class="gw-ghost gw-ghost--row"></div><div class="gw-ghost gw-ghost--row"></div>' +
      '</div>';
  }

  function groupHTML(g) {
    /* The padlock is on the LABEL, not on every row — measured 791:4936, where
       "FOR INTERNAL USE" carries one 12px glyph and the three rows beneath carry
       none.

       IT SHOWS ONLY WHILE SIGNED OUT. RULED by Utsav 29 Sep 2026, and the ruling
       is the authority here, NOT the file: both Figma frames draw the lock,
       including the signed-in one (791:4936), and he confirmed that is a mistake
       in the drawing. Do not "correct" this back to match the frames — a lock is
       a closed door, so once you are through it there is nothing left to say.
       This supersedes the 16 Sep 2026 ruling, which kept the badge after sign-in
       and swapped it for an open padlock. */
    var showLock = g.lock && session.gate && !session.signedIn;
    var lock = showLock
      ? '<span class="gw-navlabel__lock" title="Sign in to open these">' + icon('lock') + '</span>'
      : '';
    return '<nav class="gw-navgroup" aria-label="' + esc(g.label) + '">' +
      '<div class="gw-navlabel">' + esc(g.label) + lock + '</div>' +
      g.items.map(function (i) { return itemHTML(i, g.tier); }).join('') +
      '</nav>';
  }

  /* ---------------------------------------------------------------------------
     THE PROFILE MARK. Measured off Figma Q9L6q38dEj3Qu1JkjiT13y 791:2938 at 1:1:
     a 40x40 tile, a 3x3 grid of 5x5 dots on a 7px pitch (5 + 2 gap), the 19x19
     grid centred in the tile. The radius is the one derived value — the corner
     arc measures ~7.4 design px, which lands on --gw-radius-8.

     COLOUR IS THE LEVEL and is never random. PATTERN IS THE PERSON, chosen from
     a fixed twelve by a hash of their email, so the same address always draws the
     same mark — on every device, in every session, with nothing stored and
     nothing fetched. Google's avatar is deliberately not used.

     The twelve are generated under a rule rather than drawn: centre cell always
     filled, four to six dots, every row and column touched, and either symmetric
     or orthogonally connected. Rotations and mirrors count as one shape. The
     first two are the admin/team and owner marks from the Figma. See
     preview/avatars.html for the full set drawn out.
     ------------------------------------------------------------------------- */
  var AVATAR_PATTERNS = [190, 341, 151, 403, 186, 149, 343, 189, 179, 307, 95, 159];

  var AVATAR_LEVELS = {
    /* Ruled 29 Sep 2026: the yellow tile is dropped. Owner and Admin both read
       black — the level is still carried by the role line under the name, and the
       mark stops implying a hierarchy of colour it was never asked to carry. */
    owner: { fill: 'var(--gw-color-black)',        label: 'Owner' },
    admin: { fill: 'var(--gw-color-black)',        label: 'Admin' },
    team:  { fill: 'var(--gw-color-primary-300)',  label: 'Gushwork team' }
  };

  function avatarLevel() {
    if (session.owner) return 'owner';
    if (session.admin) return 'admin';
    return 'team';
  }

  /* FNV-1a. Small, stable across engines, and good enough to spread a dozen
     buckets — this picks a picture, it is not protecting anything. */
  function avatarIndex(seed) {
    var h = 2166136261, str = String(seed || '').toLowerCase();
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = (h + (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24)) >>> 0;
    }
    return h % AVATAR_PATTERNS.length;
  }

  function avatarSVG(seed, level) {
    var mask = AVATAR_PATTERNS[avatarIndex(seed)];
    var fill = (AVATAR_LEVELS[level] || AVATAR_LEVELS.team).fill;
    var dots = '';
    for (var i = 0; i < 9; i++) {
      if (!(mask >> i & 1)) continue;
      var r = Math.floor(i / 3), c = i % 3;
      dots += '<rect x="' + (11 + c * 7) + '" y="' + (11 + r * 7) +
              '" width="5" height="5" rx="1.5" fill="var(--gw-color-white)"/>';
    }
    return '<svg viewBox="0 0 40 40" aria-hidden="true" focusable="false">' +
             '<rect width="40" height="40" rx="8" fill="' + fill + '"/>' + dots +
           '</svg>';
  }

  /* What the user card shows: the person's name. Google sends one, but a session can arrive with the
     address in its place (or with no name at all), and an address in the card reads as a
     misconfigured account. So when there is no real name, one is made from the address:
     utsav.singh@gushwork.ai becomes "Utsav Singh". The address stays in the tooltip. */
  function displayName() {
    var n = String(session.name || '').trim(), e = String(session.email || '').trim();
    if (n && n.indexOf('@') === -1 && n.toLowerCase() !== e.toLowerCase()) return n;
    var local = (e || n).split('@')[0];
    var words = local.split(/[._\-+]+/).filter(Boolean).map(function (w) { return w.charAt(0).toUpperCase() + w.slice(1); });
    return words.join(' ') || n || e;
  }

  function footerHTML() {
    if (session.pending) {
      return '<div class="gw-user gw-user--ghost" aria-hidden="true">' +
          '<span class="gw-ghost gw-ghost--av"></span>' +
          '<span class="gw-user__txt"><span class="gw-ghost gw-ghost--l1"></span><span class="gw-ghost gw-ghost--l2"></span></span>' +
        '</div>';
    }
    /* Nothing to sign in to while the gate is off. */
    if (!session.gate && !session.signedIn) return '';
    if (!session.signedIn) {
      return '<button class="gw-signin" type="button" data-open-modal>' +
        GOOGLE_G + '<span>Continue with Google</span></button>';
    }
    /* session.picture (Google's avatar) is deliberately ignored — see the note
       above avatarSVG. The seed is the address, not the display name, because a
       name can change and the mark should not. */
    var level = avatarLevel();
    var avatar = avatarSVG(session.email || session.name, level);
    var shown = displayName();
    return '<div class="gw-user">' +
        '<span class="gw-user__av">' + avatar + '</span>' +
        '<span class="gw-user__txt">' +
          '<span class="gw-user__name" title="' + esc(session.email || shown) + '">' +
            esc(shown) + '</span>' +
          '<span class="gw-user__role">' + AVATAR_LEVELS[level].label + '</span>' +
        '</span>' +
        '<button class="gw-user__out" type="button" data-signout aria-label="Sign out">' +
          icon('sign-out') + '</button>' +
      '</div>';
  }

  /* REDESIGNED 29 Sep 2026 — Figma 791:4691. There is no full-width topbar any
     more: the wordmark sits at the top of the rail (measured 791:4933: 198x32 at
     24,40) and the search field sits under it, inside the rail's own 280 column.
     `.gw-topbar` still exists but is PHONE ONLY now — it carries the burger,
     which the rail cannot, because on phone the rail is the thing being opened.

     THE THEME CONTROL IS NOT IN THE FIGMA. Rather than delete a working feature
     on the strength of it not being drawn, it moves onto the wordmark row here.
     Flagged to Utsav — if it is meant to go, it is one line. */
  /* REDESIGNED 29 Sep 2026 — Figma 796:12917, overview/home 791:4691.
     The rail is 240 now and holds only the wordmark; the search field and the
     control cluster moved INSIDE the white panel, into a 76-tall bar at its top
     (795:5467). The rail's own block is measured at x=16, y=40, 208 wide. */
  function railTopHTML() {
    return '<div class="gw-railtop">' +
        '<a class="gw-brand" href="/">' +
          '<span class="gw-brand__chip' + (OWNER_PAGE ? ' gw-brand__chip--owner' : '') +
               '" style="color:var(--gw-color-white)">' + MARK + '</span>' +
          '<span class="gw-brand__name">Gushwork Design</span>' +
        '</a>' +
      '</div>';
  }

  /* The panel's own bar. Measured 795:5467: 76 tall, the field 640x36 at x=40,
     the controls 24x24 on an 8 gap, right-inset 40. The bell only renders for a
     signed-in reader — there is nothing to notify an anonymous visitor about. */
  function panelBarHTML() {
    return '<div class="gw-bar">' +
        '<div class="gw-search" data-search-open role="button" tabindex="0" ' +
             'aria-haspopup="dialog" title="Search  ' + SHORTCUT + '">' +
          icon('magnifying-glass') +
          '<input type="search" placeholder="Search in design hub..." tabindex="-1" ' +
                 'aria-hidden="true">' +
          '<span class="gw-search__key" aria-hidden="true">' + KEYCAP + '</span>' +
        '</div>' +
        '<div class="gw-bar__acts">' +
          themeHTML() +
          (session.pending ? '<span class="gw-ghost gw-ghost--icon" aria-hidden="true"></span>' : (session.signedIn ? notifHTML() : '')) +
          helpHTML() +
        '</div>' +
      '</div>';
  }

  function sidebarHTML() {
    var groups = GROUPS.filter(groupVisible).map(groupHTML).join('');
    /* Admin and Owner are two sections (796:11238 / 796:11251). They used to be pinned to the
       bottom of the rail, which left a gap under the last group and gave them nowhere to go if
       the groups multiplied. They now follow the other groups inside the same scrolling list,
       so the list grows downward and scrolls; only the user card stays pinned. Owner is a strict
       subset of admin, so it only draws for an owner. */
    var tail = session.admin ? groupHTML(ADMIN_GROUP) : '';
    /* Until we know who is looking, hold the room an Admin / Owner group would take. */
    if (session.pending) tail = ghostGroupHTML();
    if (session.owner) tail += groupHTML(OWNER_GROUP);
    return '<aside class="gw-sidebar" id="gw-rail">' +
        railTopHTML() +
        '<div class="gw-navgroups">' + groups + tail + '</div>' +
        /* Phone only (hidden by CSS above it). The panel bar holds the theme, the bell and help on
           desktop, and it is not drawn on a phone, so without this they could not be reached at all. */
        '<div class="gw-navtools">' + themeHTML() + (session.signedIn ? notifHTML() : '') + helpHTML() + '</div>' +
        '<div class="gw-navend">' + footerHTML() + '</div>' +
      '</aside>';
  }

  /* ---------------------------------------------------------------------------
     THE "ON THIS PAGE" RAIL. This used to be copied into each page that wanted
     one, which is how preview/tools and staging ended up with the markup and no
     script — the collapse button did nothing at all.

     It also had to move here because the SCROLL SPY WAS BROKEN EVERYWHERE the
     moment the content panel became its own scrollport: the per-page copies
     listened on `window`, and the window no longer scrolls. It listens on the
     panel now, and measures the threshold from the panel's own top edge.
     ------------------------------------------------------------------------- */
  /* -- page actions ---------------------------------------------------------------
     "Copy page / View as Markdown / Open in Claude", beside a page's heading. A page opts
     in by putting `<div class="pa" data-page-actions></div>` next to its <h1>; nothing
     else needs to know about it.

     The Markdown is built from the page AS RENDERED, not from its source, because a
     good part of the style guide (the scales, the extended palette) is drawn by script
     and a static conversion would silently leave it out. A page can steer it with two
     attributes: data-md-heading="…" turns an element into a `##` heading, and
     data-md-skip drops one (used to keep a release's date rail out of the changelog body). */

  var MD_SKIP_TAGS = { SCRIPT: 1, STYLE: 1, SVG: 1, BUTTON: 1, INPUT: 1, SELECT: 1,
                       TEXTAREA: 1, TEMPLATE: 1, NOSCRIPT: 1, CANVAS: 1, NAV: 1 };
  var MD_BLOCK = { DIV: 1, P: 1, H1: 1, H2: 1, H3: 1, H4: 1, H5: 1, H6: 1, UL: 1, OL: 1,
                   LI: 1, TABLE: 1, SECTION: 1, ARTICLE: 1, HEADER: 1, FOOTER: 1, MAIN: 1,
                   ASIDE: 1, FIGURE: 1, FIGCAPTION: 1, DL: 1, DT: 1, DD: 1, PRE: 1,
                   DETAILS: 1, SUMMARY: 1, BLOCKQUOTE: 1, HR: 1, FORM: 1 };

  function mdAbs(u) { try { return new URL(u, location.href).href; } catch (e) { return u; } }
  function mdSquash(t) { return String(t).replace(/[ \t\r\f\v]+/g, ' ').replace(/ ?\n ?/g, '\n').trim(); }

  function mdSkip(el) {
    if (MD_SKIP_TAGS[el.tagName.toUpperCase()]) return true;
    if (el.hidden || el.getAttribute('aria-hidden') === 'true' || el.hasAttribute('data-md-skip')) return true;
    if (el.classList.contains('pa') || el.classList.contains('idx')) return true;
    return getComputedStyle(el).display === 'none';
  }

  /* data-md-links: list an element's links even though they are hidden. The downloads
     page builds a format menu into every row and keeps it closed until clicked, so the
     files a row offers are exactly what would otherwise vanish from the export. Each
     link reads as its own label ("\.svg vector") pointing at an absolute URL. */
  function mdLinks(el) {
    return [].map.call(el.querySelectorAll('a[href]'), function (a) {
      var label = [].map.call(a.childNodes, function (n) { return n.textContent.replace(/\s+/g, ' ').trim(); })
        .filter(Boolean).join(' ') || a.textContent.replace(/\s+/g, ' ').trim();
      return '[' + label + '](' + mdAbs(a.getAttribute('href')) + ')';
    }).join(' \u00b7 ');
  }

  function mdInline(node) {
    if (node.nodeType === 1 && node.hasAttribute('data-md-links')) return mdLinks(node);
    if (node.nodeType === 3) return node.nodeValue.replace(/\s+/g, ' ');
    if (node.nodeType !== 1 || mdSkip(node)) return '';
    var t = node.tagName.toLowerCase();
    if (t === 'br') return '\n';
    if (t === 'img') {
      var src = node.getAttribute('src') || '';
      if (!src || /^data:/.test(src)) return '';
      return '![' + (node.getAttribute('alt') || '') + '](' + mdAbs(src) + ')';
    }
    var s = '';
    for (var c = node.firstChild; c; c = c.nextSibling) s += mdInline(c);
    /* A bold label directly followed by its value (`<b>Neutral/50</b>#F1F2F3`) reads as
       one word once the tags are gone, so a space goes back in — unless punctuation
       follows, where `**word**.` must stay tight. */
    var nx = node.nextSibling;
    var gap = nx && /^[^\s.,;:!?)\]]/.test(nx.nodeType === 3 ? nx.nodeValue : (nx.textContent || '')) ? ' ' : '';
    if (t === 'strong' || t === 'b') { s = s.trim(); return s ? '**' + s + '**' + gap : ''; }
    if (t === 'em' || t === 'i')     { s = s.trim(); return s ? '*' + s + '*' + gap : ''; }
    if (t === 'code')                { s = s.trim(); return s ? '`' + s + '`' + gap : ''; }
    if (t === 'a') {
      var h = node.getAttribute('href');
      s = s.replace(/\s+/g, ' ').trim();
      /* Web and mail links only. A `claude://resume/…` session link works on one machine
         and means nothing in exported text, so it keeps its label and loses the URL. */
      if (!h || h.charAt(0) === '#' || !s || !/^(https?:|mailto:|\/|\.|[a-z0-9])/i.test(h) || /^[a-z][a-z0-9+.-]*:/i.test(h) && !/^(https?|mailto):/i.test(h)) return s;
      return '[' + s + '](' + mdAbs(h) + ')';
    }
    return s;
  }

  function mdInlineOf(el) {
    if (el.hasAttribute && el.hasAttribute('data-md-links')) return mdLinks(el);
    var s = '';
    for (var c = el.firstChild; c; c = c.nextSibling) s += mdInline(c);
    return mdSquash(s);
  }

  function mdList(el, depth) {
    var lines = [], n = 0, ordered = el.tagName === 'OL', pad = new Array(depth + 1).join('  ');
    for (var li = el.firstElementChild; li; li = li.nextElementSibling) {
      if (li.tagName !== 'LI' || mdSkip(li)) continue;
      n++;
      var text = '', nested = [];
      for (var c = li.firstChild; c; c = c.nextSibling) {
        if (c.nodeType === 1 && (c.tagName === 'UL' || c.tagName === 'OL')) nested.push(mdList(c, depth + 1));
        else text += mdInline(c);
      }
      lines.push(pad + (ordered ? n + '. ' : '- ') + mdSquash(text));
      nested.forEach(function (x) { if (x) lines.push(x); });
    }
    return lines.join('\n');
  }

  function mdTable(el) {
    var rows = [].map.call(el.querySelectorAll('tr'), function (tr) {
      return [].map.call(tr.children, function (c) { return mdInlineOf(c).replace(/\|/g, '\\|'); });
    }).filter(function (r) { return r.length; });
    if (!rows.length) return '';
    /* A column that is empty in every body row says nothing — the downloads table's
       Preview column is pictures, and pictures are left out of the export. */
    var keep = rows[0].map(function (_, i) { return rows.slice(1).some(function (r) { return r[i]; }); });
    if (rows.length > 1 && keep.some(Boolean)) {
      rows = rows.map(function (r) { return r.filter(function (_, i) { return keep[i]; }); });
    }
    var head = rows[0], body = rows.slice(1);
    return ['| ' + head.join(' | ') + ' |', '| ' + head.map(function () { return '---'; }).join(' | ') + ' |']
      .concat(body.map(function (r) { return '| ' + r.join(' | ') + ' |'; })).join('\n');
  }

  function mdBlocks(el, out) {
    var buf = '';
    function flush() { var t = mdSquash(buf); if (t) out.push(t); buf = ''; }
    for (var c = el.firstChild; c; c = c.nextSibling) {
      if (c.nodeType === 3) { buf += c.nodeValue.replace(/\s+/g, ' '); continue; }
      if (c.nodeType !== 1 || mdSkip(c)) continue;
      if (MD_BLOCK[c.tagName] || c.hasAttribute('data-md-heading')) { flush(); mdBlock(c, out); }
      else buf += mdInline(c);
    }
    flush();
  }

  function mdBlock(el, out) {
    var t = el.tagName.toLowerCase(), hint = el.getAttribute('data-md-heading');
    if (hint) out.push('## ' + hint);
    if (/^h[1-6]$/.test(t)) {
      var h = mdInlineOf(el);
      if (h) out.push(new Array(+t.charAt(1) + 1).join('#') + ' ' + h);
      return;
    }
    if (t === 'summary') return;                       /* "Full notes" x57 is noise */
    if (t === 'ul' || t === 'ol') { var l = mdList(el, 0); if (l) out.push(l); return; }
    if (t === 'table') { var tb = mdTable(el); if (tb) out.push(tb); return; }
    if (t === 'hr') { out.push('---'); return; }
    if (t === 'pre') { out.push('```\n' + el.textContent.replace(/\n$/, '') + '\n```'); return; }
    if (t === 'p') { var p = mdInlineOf(el); if (p) out.push(p); return; }
    if (t === 'dl') {
      var term = '';
      for (var c = el.firstElementChild; c; c = c.nextElementSibling) {
        if (mdSkip(c)) continue;
        var v = mdInlineOf(c);
        if (c.tagName === 'DT') term = v;
        else if (c.tagName === 'DD' && v) { out.push(term ? '**' + term + '** — ' + v : v); term = ''; }
      }
      return;
    }
    mdBlocks(el, out);
  }

  function pageMarkdown() {
    var hd = document.querySelector('header h1');
    var title = hd ? mdInlineOf(hd) : document.title;
    var meta = hd && hd.closest('header') ? hd.closest('header').querySelector('p') : null;
    /* Most specific first, in separate lookups: one combined selector returns whichever
       match comes FIRST IN THE DOCUMENT, and that is the shell's own <main> wrapping the
       whole page — header included, so the title came out twice. */
    var root = null, want = ['.sg__main', '.cl__main', '.dl__main', '.st__main', '.tl__main'];
    for (var i = 0; i < want.length && !root; i++) root = document.querySelector(want[i]);
    root = root || document.querySelector('.gw-scroll') || document.body;
    var out = ['# ' + title];
    if (meta && !mdSkip(meta)) { var m = mdInlineOf(meta); if (m) out.push(m); }
    mdBlocks(root, out);
    out.push('Source: ' + location.origin + location.pathname);
    return out.join('\n\n').replace(/\n{3,}/g, '\n\n') + '\n';
  }

  function copyText(text) {
    function legacy() {
      try {
        var ta = document.createElement('textarea');
        ta.value = text; ta.setAttribute('readonly', '');
        ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
        document.body.appendChild(ta); ta.select();
        var ok = document.execCommand('copy'); document.body.removeChild(ta);
        return ok;
      } catch (e) { return false; }
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).then(function () { return true; },
                                                       function () { return legacy(); });
    }
    return Promise.resolve(legacy());
  }

  /* -- the brand kit ------------------------------------------------------------
     "Copy guidelines + assets": the Style Guide and the Downloads page as ONE document,
     with the source of every logo inlined.

     Why it exists: the Downloads export alone is a list of links and none of the rules,
     and the Style Guide alone is rules and no files, so a model given either one invents
     the other — the first attempt redrew the logo. Together they say how the brand is
     used AND supply the real marks.

     The sibling page is read through a hidden same-origin frame rather than fetched,
     because both pages draw part of themselves with script (the extended palette, the
     format menus) and a fetched copy of the HTML would not contain any of it. */

  function readSiblingPage(path) {
    return new Promise(function (resolve, reject) {
      var f = document.createElement('iframe'), t0 = Date.now();
      f.setAttribute('aria-hidden', 'true'); f.tabIndex = -1;
      f.style.cssText = 'position:fixed;left:-99999px;top:0;width:1280px;height:900px;border:0;visibility:hidden';
      f.src = path;
      document.body.appendChild(f);
      (function poll() {
        var w = null;
        try { w = f.contentWindow; } catch (e) { /* not ready */ }
        if (w && w.document && w.document.readyState === 'complete' && typeof w.gwPageMarkdown === 'function') {
          /* One more beat: the page's own scripts finish drawing on load. */
          setTimeout(function () {
            try { resolve({ md: w.gwPageMarkdown(), doc: w.document }); }
            catch (e) { reject(e); }
            setTimeout(function () { if (f.parentNode) f.parentNode.removeChild(f); }, 0);
          }, 250);
        } else if (Date.now() - t0 > 10000) {
          if (f.parentNode) f.parentNode.removeChild(f);
          reject(new Error('timeout'));
        } else {
          setTimeout(poll, 100);
        }
      })();
    });
  }

  /* Every logo/symbol SVG the downloads page offers, once each. */
  function svgHrefsIn(doc) {
    var seen = {}, out = [];
    [].forEach.call(doc.querySelectorAll('a[href$=".svg"]'), function (a) {
      var h = a.getAttribute('href');
      if (h && /\/logo\//.test(h) && !seen[h]) { seen[h] = 1; out.push(h); }
    });
    return out;
  }

  /* Every downloadable file a page offers — the same set the Download all zip is built from. */
  function fileHrefsIn(doc) {
    var seen = {}, out = [];
    [].forEach.call(doc.querySelectorAll('a[download][href]:not([data-no-zip])'), function (a) {
      var h = a.getAttribute('href'); if (h && !seen[h]) { seen[h] = 1; out.push(h); }
    });
    return out;
  }

  /* Ids and inter-tag whitespace are export furniture; the path data is untouched. */
  function miniSvg(t) {
    return t.replace(/<!--[\s\S]*?-->/g, '').replace(/\sid="[^"]*"/g, '').replace(/>\s+</g, '><').trim();
  }

  function demoteHeadings(md) {
    var fence = false;
    return md.split('\n').map(function (l) {
      if (/^```/.test(l)) { fence = !fence; return l; }
      return !fence && /^#{1,5} /.test(l) ? '#' + l : l;
    }).join('\n');
  }

  /* Everything a model needs to actually SET the brand's type and colour, generated from
     foundation/tokens.css so it cannot drift from the site: the three @font-face rules with
     ABSOLUTE font URLs (the file's own are relative and would 404 anywhere else), then the
     font stacks, every text style, the colours, radii, spacing and shadows. The page text
     names the fonts; without this a model has to guess sizes, weights and how to load them,
     which is where "wrong fonts" came from. */
  function tokensCssBlock() {
    return fetch('/foundation/tokens.css').then(function (r) { return r.ok ? r.text() : ''; })
      .then(function (css) {
        if (!css) return '';
        var faces = (css.match(/@font-face\s*\{[^}]*\}/g) || []).map(function (b) {
          return b.replace(/url\((['"]?)\.\.\/fonts\//g, 'url($1' + location.origin + '/fonts/');
        });
        var root = css.match(/:root\s*\{([\s\S]*?)\n\}/);
        var body = root ? root[1].replace(/\/\*[\s\S]*?\*\//g, '') : '';
        var keep = /^--gw-(font-|text-|color-(white|black|(primary|neutral|green|red|yellow|orange)-\d+)$|radius-|space-|shadow-)/;
        var seen = {}, lines = [], m, re = /(--gw-[a-z0-9-]+)\s*:\s*([^;]+);/g;
        while ((m = re.exec(body))) {
          if (seen[m[1]] || !keep.test(m[1])) continue;
          seen[m[1]] = 1; lines.push('  ' + m[1] + ': ' + m[2].trim() + ';');
        }
        if (!faces.length || !lines.length) return '';
        /* R21: Plus Jakarta Sans is the sanctioned heading fallback, only where Vert Grotesk Display
           cannot load (Google Slides, Canva, sandboxed previews). The display stack is re-stated
           with it second, so a headline degrades to Plus Jakarta and never to an arbitrary font. */
        var jakarta = "/* Heading fallback, only where Vert Grotesk Display cannot load. */\n" +
          "@font-face {\n  font-family: 'Plus Jakarta Sans';\n" +
          "  src: url('" + location.origin + "/fonts/PlusJakartaSans-VariableFont_wght.ttf') format('truetype-variations');\n" +
          "  font-weight: 200 800;\n  font-style: normal;\n  font-display: swap;\n}\n\n" +
          ":root {\n  --gw-font-display: 'Vert Grotesk Display', 'Plus Jakarta Sans', ui-sans-serif, system-ui, sans-serif;\n}";
        return faces.join('\n\n') + '\n\n:root {\n' + lines.join('\n') + '\n}\n\n' + jakarta;
      }).catch(function () { return ''; });
  }

  /* For tools that can only run Python with no internet and none of our fonts (ChatGPT's sandbox
     is one), which is where a poster came back with a typeset wordmark. Written against the
     zip's own layout and RUN before it was put here: it produces the real logo, the bold
     Vert Grotesk Display headline and Inter body. The one line that is easy to lose is
     set_variation_by_name — the display face's weight axis defaults to 300, so a script that
     just loads the file draws Light text. */
  var PY_RECIPE = "LOGO_STEPS = (16, 20, 24, 40, 80)\n\ndef check_layout(boxes, W, H, M=80):\n    \"\"\"boxes = {name: (x0, y0, x1, y1)}. Name the logo 'logo' (full) or 'symbol'. Raises on any breach.\"\"\"\n    for n, (x0, y0, x1, y1) in boxes.items():\n        assert x0 >= M and y0 >= M and x1 <= W - M and y1 <= H - M, f'{n} is outside the {M}px margin: {boxes[n]}'\n        if n in ('logo', 'symbol'):\n            w, h, want = x1 - x0, y1 - y0, (421 / 80 if n == 'logo' else 1.0)\n            assert abs(w / h - want) / want < 0.02, f'{n} is distorted: {w}x{h} is {w / h:.2f}:1 but the file is {want:.2f}:1'\n            assert h in LOGO_STEPS, f'{n} is {h}px tall; use a size step {LOGO_STEPS}'\n    names = list(boxes)\n    for i, a in enumerate(names):\n        for b in names[i + 1:]:\n            A, B = boxes[a], boxes[b]\n            assert A[2] <= B[0] or B[2] <= A[0] or A[3] <= B[1] or B[3] <= A[1], f'{a} overlaps {b}'\n\nimport zipfile\nfrom PIL import Image, ImageDraw, ImageFont\n\nzipfile.ZipFile('gushwork-brand-assets.zip').extractall('.')\nR = 'gushwork-brand-assets/'\nW, HT, M = 1080, 1350, 80                      # canvas and outer margin (1200 x 630 card: margin 56)\n\ndef font(file, size, style):\n    f = ImageFont.truetype(R + 'fonts/' + file, size)\n    f.set_variation_by_name(style)   # REQUIRED: Vert Grotesk Display loads as Light (300) otherwise\n    return f\nhead = lambda s: font('Vert_Grotesk_Display_VF.ttf', s, 'Bold')                 # headings\nbody = lambda s, w='Regular': font('Inter-VariableFont_opsz_wght.ttf', s, w)     # Regular / Medium / SemiBold\n# Vert unavailable? Use Plus Jakarta Sans Bold for headings (same set_variation_by_name('Bold') call).\n\ndef wrap(d, text, f, max_w):\n    lines, cur = [], ''\n    for word in text.split():\n        t = (cur + ' ' + word).strip()\n        if d.textlength(t, font=f) <= max_w: cur = t\n        else: lines.append(cur); cur = word\n    return lines + [cur]\n\nimg = Image.new('RGB', (W, HT), '#F7F8F9')       # Neutral/25\nd = ImageDraw.Draw(img)\nboxes, y = {}, M\n\n# 1 logo: once, top-left, on a size step (40). Width comes from the file's own ratio, never chosen.\n# The wordmark is INSIDE this image; never type it. Use the -white- file on blue grounds.\nLOGO_H = 40\nlogo = Image.open(R + 'logo/png/gushwork-logo-original-2000.png').convert('RGBA')\nlw = round(LOGO_H * logo.width / logo.height)\nlogo = logo.resize((lw, LOGO_H), Image.LANCZOS)\nimg.paste(logo, (M, y), logo)\nboxes['logo'] = (M, y, M + lw, y + LOGO_H); y += LOGO_H + 60\n\n# 2 eyebrow, sentence case\nf = body(22, 'Medium'); d.text((M, y), 'Introducing', font=f, fill='#6A7077')\nboxes['eyebrow'] = (M, y, M + int(d.textlength('Introducing', font=f)), y + 26); y += 26 + 24\n\n# 3 headline: largest size that fits in at most 4 lines, line-height 1.2\nfor size in range(108, 55, -4):\n    f = head(size); lines = wrap(d, 'Your AI marketing teammate', f, W - 2 * M)\n    if len(lines) <= 4: break\nlead = round(size * 1.2)\nfor ln in lines: d.text((M, y), ln, font=f, fill='#0D0D0D'); y += lead\nboxes['headline'] = (M, y - lead * len(lines), M + max(int(d.textlength(l, font=f)) for l in lines), y); y += 24\n\n# 4 subhead\nf = body(36); sub = wrap(d, 'Plan, create, publish and grow, all in one place.', f, W - 2 * M)\nfor ln in sub: d.text((M, y), ln, font=f, fill='#6A7077'); y += round(36 * 1.4)\nboxes['subhead'] = (M, y - round(36 * 1.4) * len(sub), W - M, y)\n\ncheck_layout(boxes, W, HT, M)                   # see \"Before you export, check\"\nimg.save('poster.png')";

  /* Layout and hierarchy guardrails. Written after posters came back with the right logo and fonts but
     the logo sitting on the headline, the headline's lines touching, a second logo cropped off the bottom
     edge, and the logo squeezed to a fifth of its width. {ORIGIN} is filled in at copy time. check_layout
     was run against every one of those failures, plus a stretched, a tiny, an off-step and a squeezed
     symbol. The size steps (16, 20, 24, 40, 80) are foundation/shared-components.md's, not chosen here. */
  var LAYOUT_MD = "## Layout and hierarchy rules\n\nRead these before placing anything. They are what stops a poster colliding with itself: a logo on top of the headline, lines of type touching, a logo squashed or cropped. Sizes are for a 1080-wide canvas; the 1200 × 630 link card scales them down (margin 56, logo 24).\n\n**Hierarchy: one job per level, top to bottom, each visibly smaller than the one above.**\n\n1. **Logo.** Once, top-left. Never repeated, never over text or artwork, never used as decoration, never also a footer. Height 40 px (24 px on the link card); the size rules below are hard.\n2. **Eyebrow** (optional). Inter Medium, 22 px, sentence case (\"Introducing\", never \"INTRODUCING\": the voice rule, and R21 records uppercase eyebrows as an export bug).\n3. **Headline.** The single largest thing on the canvas. Vert Grotesk Display Bold, 80 to 108 px, line-height **1.2** (the display tokens; never below 1.1), at most 4 lines. Sentence case. No full stop at the end, no exclamation mark, no italics. At most one phrase in `--gw-color-primary-500`.\n4. **Subhead.** Inter Regular, 34 to 38 px, `--gw-color-neutral-600`, at most 3 lines, about a third of the headline's size.\n5. **Supporting points.** Up to four, Inter Medium, 24 to 28 px. Put the number before the adjective.\n6. **One call to action.** Exactly `Book a Demo`. Primary/500 fill with white text on a light ground; white fill with Primary/500 text on a blue ground.\n7. **Small print or date.** Inter, 20 px, `--gw-color-neutral-500`, inside the bottom margin.\n\n**The logo: hard rules.**\n\n- **Scale it uniformly, from one number.** Set the height to one of the size steps, **16, 20, 24, 40 or 80 px**: never in between, never below 16. Then derive the width from the file's own ratio. The full logo is **421 : 80** (about 5.3 wide to 1 tall) and the symbol is 1 : 1. In CSS: `height: 40px; width: auto`. In Python: `width = round(height * logo.width / logo.height)`. Never set width and height independently.\n- **Never distort it.** No stretching, squashing, narrowing, skewing or rotating to fit a slot. If it does not fit, use the next smaller step, or the symbol on its own; do not squeeze it. A logo that reads as narrow, tall or tiny has been squashed, and a 40 px logo should look like the file does.\n- **Pick the file by the background.** Original on white and light. White on Primary/500 and on dark. Dark only for monochrome work. Never recolour it, tint it with opacity, outline it, add a shadow or gradient, blur it, or set it on a busy image.\n- **Keep it in one piece.** The symbol and the wordmark are one file. Do not split them, rearrange them, add a tagline to them, or set the wordmark in type.\n- **Give it room.** Keep clear space around it of at least half its own height on every side, with nothing else inside that area. (The Style Guide asks for \"clear space\" without a number; this is the working minimum.)\n- **One only,** at the top-left, uncropped and entirely inside the margin.\n\n**Space.** Outer margin 80 px on every side; nothing, artwork included, crosses it. Between blocks use only the spacing tokens: logo to eyebrow 60, eyebrow to headline 24, headline to subhead 24, subhead to points 32, points to button 40, text to artwork at least 40. Stack the blocks from the top using their measured heights, and never place a block at a fixed y. If the stack is too tall, shrink the headline 4 px at a time; never let blocks overlap.\n\n**Colour.** Ground is Neutral/25 (`#F7F8F9`) for light, Primary/500 for blue, Black (`#0D0D0D`) for dark. Headline in `--gw-color-black` on light and white on blue or dark. Blue is the only accent. Flat fills only: no gradients, no drop shadows.\n\n**Artwork and the grid.** Give the artwork or the brand grid its own zone, a corner or the lower part of the canvas, that no text box enters. Never set the headline over the grid or over a picture. Use one grid colourway per piece.\n\n**Copy.** Sentence case everywhere; the one exception is the fixed button `Book a Demo`. No emoji, no exclamation marks. Lead with the outcome and a number (\"1.3M impressions in 12 months\"), not an adjective. Never use: synergy, best-in-class, revolutionize, next-gen, unlock, leverage, seamless, cutting-edge, game-changing, world-class, supercharge, 10x.\n\n**Fonts.** Headings are Vert Grotesk Display and body is Inter. **If Vert Grotesk Display is not available** (Google Slides, Canva, a sandboxed preview that cannot load fonts), set headings in **Plus Jakarta Sans Bold** instead. It is the sanctioned fallback for that case only, never a second display face and never used alongside Vert. Say when you used it. It is declared in the CSS block below; the file is at {ORIGIN}/fonts/PlusJakartaSans-VariableFont_wght.ttf and it is also on Google Fonts. Like Vert, it does not load bold by default: set Bold explicitly.\n\n**Before you export, check.** Measure every block (each text box, the logo, the artwork) and run `check_layout`. It fails if anything leaves the margin, two things overlap, or the logo is distorted or off a size step. Name the logo box `logo` (full logo) or `symbol` so it is checked. Also confirm: the headline is at most 4 lines with clear space between lines, and the text stack ends above the artwork zone and the bottom margin.\n\n```python\nLOGO_STEPS = (16, 20, 24, 40, 80)\n\ndef check_layout(boxes, W, H, M=80):\n    \"\"\"boxes = {name: (x0, y0, x1, y1)}. Name the logo 'logo' (full) or 'symbol'. Raises on any breach.\"\"\"\n    for n, (x0, y0, x1, y1) in boxes.items():\n        assert x0 >= M and y0 >= M and x1 <= W - M and y1 <= H - M, f'{n} is outside the {M}px margin: {boxes[n]}'\n        if n in ('logo', 'symbol'):\n            w, h, want = x1 - x0, y1 - y0, (421 / 80 if n == 'logo' else 1.0)\n            assert abs(w / h - want) / want < 0.02, f'{n} is distorted: {w}x{h} is {w / h:.2f}:1 but the file is {want:.2f}:1'\n            assert h in LOGO_STEPS, f'{n} is {h}px tall; use a size step {LOGO_STEPS}'\n    names = list(boxes)\n    for i, a in enumerate(names):\n        for b in names[i + 1:]:\n            A, B = boxes[a], boxes[b]\n            assert A[2] <= B[0] or B[2] <= A[0] or A[3] <= B[1] or B[3] <= A[1], f'{a} overlaps {b}'\n```";

  function buildBrandKit(role, otherPath) {
    var mine = pageMarkdown();
    return readSiblingPage(otherPath).then(function (other) {
      var parts = role === 'guidelines' ? [mine, other.md] : [other.md, mine];
      var hrefs = svgHrefsIn(document);
      svgHrefsIn(other.doc).forEach(function (h) { if (hrefs.indexOf(h) === -1) hrefs.push(h); });
      return tokensCssBlock().then(function (tokensCss) {
       return Promise.all(hrefs.map(function (h) {
        return fetch(h).then(function (r) { return r.ok ? r.text() : ''; }).catch(function () { return ''; })
          .then(function (t) { return { name: h.split('/').pop(), src: miniSvg(t) }; });
       })).then(function (svgs) {
        var origin = location.origin, sources = [];
        var body = parts.map(function (md) {
          var m = md.match(/\nSource: (.*)\s*$/);
          if (m) sources.push(m[1].replace(/^https?:\/\/[^/]+/, origin));
          return demoteHeadings(md.replace(/\n*Source: .*\s*$/, '\n')).trim();
        });
        var files = fileHrefsIn(document);
        fileHrefsIn(other.doc).forEach(function (h) { if (files.indexOf(h) === -1) files.push(h); });
        function links(test) {
          return files.filter(test).map(function (h) {
            return '[' + h.split('/').pop() + '](' + origin + h + ')';
          }).join(' \u00b7 ');
        }
        var where = [
          '## Where to get the real files',
          'Do this, in order:',
          '1. **If you can open URLs, or run code with internet access,** download what you need from ' +
            origin + '/downloads and use those exact files:',
          '   - Logos (SVG): ' + links(function (h) { return /\/logo\/[^/]*\.svg$/.test(h); }),
          '   - Logos (PNG, 2000 px): ' + links(function (h) { return /-2000\.png$/.test(h); }),
          '   - Fonts: ' + links(function (h) { return /\/fonts\//.test(h); }),
          '   - Tokens (CSS): ' + links(function (h) { return /tokens\.css$/.test(h); }),
          '2. **If you cannot open URLs** (many chat tools cannot), ask the user to attach ' +
            '`gushwork-brand-assets.zip` \u2014 the "Download all" button at ' + origin + '/downloads \u2014 and use ' +
            'the files inside.',
          '3. **If neither is possible,** use only the inline SVG and CSS further down, and tell the user the real ' +
            'files were not available. Do not draw an approximation of the logo or pick another font.'
        ].join('\n');
        var out = [
          '# Gushwork brand kit',
          '> Reference for on-brand Gushwork work. The Style Guide part says how the brand is used; the ' +
          'Downloads part lists the real files, and the SVG source of every logo is included verbatim under ' +
          '"Logo source". Use that source exactly as given — do not redraw, recolour, restyle or re-typeset ' +
          'a logo (the symbol is two shapes, not one, and the "gushwork" wordmark is outlined shapes inside the logo files, ' +
          'never typed text \u2014 do not set it in any font). If the brand-assets zip is attached, use its files. ' +
          'Fonts: headings are Vert Grotesk Display and everything else is Inter; ' +
          'both are declared in the "Ready-to-paste CSS" block with absolute URLs \u2014 use that block rather than ' +
          'naming fonts yourself, and if your environment cannot load external fonts (sandboxed previews often ' +
          'cannot), keep the font stack and say so \u2014 headings may fall back to Plus Jakarta Sans and nothing else. ' +
          'For a poster, banner or ' +
          'social image, do not have an image generator draw any text or logo \u2014 build it as HTML or SVG from the ' +
          'code below, so the real fonts and logo are used, and use image generation only for illustrations that ' +
          'contain no text or logo. If you cannot use SVG ' +
          '(for example when producing a raster image), say so and ask for the logo file to be attached ' +
          'instead of drawing an approximation.'
        ].concat([where, LAYOUT_MD.split('{ORIGIN}').join(origin)], body);
        if (tokensCss) {
          out.push('## Ready-to-paste CSS');
          out.push('Generated from `foundation/tokens.css`, the file the site and the plugin build with. Paste it ' +
            'at the top of your stylesheet: it loads Vert Grotesk Display (headings) and Inter (everything else) ' +
            'from absolute URLs and defines every colour, text style, radius, space and shadow. Then set text ' +
            'with the tokens \u2014 for example `font: var(--gw-text-h2)` for a heading or ' +
            '`font: var(--gw-text-body-16-reg)` for body copy \u2014 and never set a family, size or weight by hand.');
          out.push('```css\n' + tokensCss + '\n```');
        }
        out.push('## If you build the image with Python');
        out.push('Some tools can only run Python, with no internet and none of these fonts installed. Do not ' +
          'trace or approximate the logo and do not choose a font weight by eye. Ask for ' +
          '`gushwork-brand-assets.zip` to be attached (the "Download all" button on the Downloads page) and use ' +
          'its files. Two traps, both easy to fall into: (1) Vert Grotesk Display loads as **Light** until you ' +
          'set a style \u2014 always call `set_variation_by_name` (\'Bold\' for headings); (2) the wordmark ' +
          '"gushwork" is part of the logo image \u2014 paste the PNG, never type the name. The recipe stacks each block ' +
          'from its measured height and calls `check_layout` before saving; keep that call.');
        out.push('```python\n' + PY_RECIPE + '\n```');
        if (svgs.some(function (x) { return x.src; })) {
          out.push('## Logo source');
          /* Written after the mark came back from a model as a lone crescent: it had drawn
             one of the symbol's two paths. The structure is stated, not left to be inferred
             from path data — and the safest route for a web page is the file, not a retyping. */
          out.push('**Anatomy of the mark.** The symbol is a solid rounded-square tile \u2014 NOT a swoosh, stroke, ' +
            'arc or crescent. It is made of TWO filled shapes of one colour inside an 80 \u00d7 80 box: a large ' +
            'upper-left shape and a curved sliver at the lower right, separated by a thin curved gap of empty space. ' +
            'The guidelines call the mark "the exponential curve"; that is the idea behind the gap, not a description ' +
            'of what to draw, and drawing a lone curve is the most common mistake. Both shapes are required \u2014 ' +
            'draw only one and you get a crescent, which is not the logo. The full logo is 421 \u00d7 80: those two ' +
            'symbol paths followed by eight paths that spell "gushwork". In the original the symbol is #0070FF and ' +
            'the wordmark #111827.');
          out.push('**Using it.** For a web page, prefer `<img src="' + location.origin +
            '/assets/logo/gushwork-logo-original.svg" alt="Gushwork">` over retyping the code. If you ' +
            'paste the code, paste the whole `<svg>\u2026</svg>` \u2014 every `<path>`, unchanged.');
          svgs.forEach(function (x) {
            if (x.src) out.push('### ' + x.name + '\n\n```svg\n' + x.src + '\n```');
          });
        }
        out.push('Sources: ' + sources.join(' · '));
        return out.join('\n\n').replace(/\n{3,}/g, '\n\n') + '\n';
       });
      });
    });
  }

  function initPageActions() {
    /* Exposed on EVERY page, not only ones that show the control. The Style Guide's copy
       reads the Downloads page through a hidden frame and asks it for its Markdown; when
       Downloads lost its Copy button, tying this to the button would have silently
       broken the Style Guide's kit. */
    window.gwPageMarkdown = pageMarkdown;
    var host = document.querySelector('[data-page-actions]');
    if (!host || host.getAttribute('data-ready')) return;
    host.setAttribute('data-ready', '1');
    var isPublic = host.getAttribute('data-page-actions') === 'public';
    var url = location.origin + location.pathname;
    /* data-bundle-default: this page's OWN copy is the whole kit. The Style Guide sets it,
       because guidelines without the files (or with files a model cannot see) is how a
       logo got redrawn. Its "Open in Claude" also takes the copy route, since Claude
       reading the URL sees neither the script-drawn palette nor the assets. */
    var kitDefault = host.hasAttribute('data-bundle-default');
    var kitRole = host.getAttribute('data-bundle-role') || 'guidelines';
    var kitOther = host.getAttribute('data-bundle');
    function textFor(forceKit) {
      return (kitDefault || forceKit) && kitOther ? buildBrandKit(kitRole, kitOther)
                                                  : Promise.resolve(pageMarkdown());
    }
    /* Safari and Chrome only honour a clipboard write made during the click. The kit
       finishes a second or two later, after loading the other page, so the write is
       handed the PROMISE of the text rather than the text itself. */
    function copyFrom(textPromise) {
      if (navigator.clipboard && navigator.clipboard.write && window.ClipboardItem) {
        return navigator.clipboard.write([new ClipboardItem({
          'text/plain': textPromise.then(function (t) { return new Blob([t], { type: 'text/plain' }); })
        })]).then(function () { return true; }, function () { return false; });
      }
      return textPromise.then(copyText, function () { return false; });
    }

    function row(act, ico, label, desc, ext) {
      return '<button type="button" class="pa__row" role="menuitem" data-pa="' + act + '">' +
        '<span class="pa__ico">' + ico + '</span>' +
        '<span class="pa__t"><span class="pa__l">' + label + (ext ? icon('arrow-up-right') : '') + '</span>' +
        '<span class="pa__d">' + desc + '</span></span></button>';
    }
    host.innerHTML =
      '<div class="pa__split">' +
        '<button type="button" class="pa__main" data-pa="copy">' + icon('copy') + '<span data-pa-label>Copy page</span></button>' +
        '<button type="button" class="pa__tog" aria-haspopup="menu" aria-expanded="false" aria-label="More page options">' + icon('caret-right') + '</button>' +
      '</div>' +
      '<div class="pa__menu" role="menu" hidden>' +
        row('copy', icon('copy'), 'Copy page',
            kitDefault ? 'Guidelines and every asset, as Markdown for LLMs' : 'Copy page as Markdown for LLMs') +
        row('view', '<span class="pa__md">M↓</span>', 'View as Markdown', 'View this page as plain text', true) +
        row('claude', icon('sparkle'), 'Open in Claude',
            isPublic && !kitDefault ? 'Ask questions about this page'
                                    : 'Copies the page, then opens Claude to paste it', true) +
        row('link', icon('link'), 'Copy link to page', 'Copy the address of this page') +
        (kitOther && !kitDefault
          ? row('kit', icon('swatches'), 'Copy guidelines + assets',
                'Style Guide and Downloads together, with the logo SVG source')
          : '') +
      '</div>' +
      '<span class="pa__live" role="status" aria-live="polite"></span>';

    var menu = host.querySelector('.pa__menu'), tog = host.querySelector('.pa__tog');
    var label = host.querySelector('[data-pa-label]'), live = host.querySelector('.pa__live'), timer = null;

    function setOpen(o) {
      menu.hidden = !o;
      tog.setAttribute('aria-expanded', o ? 'true' : 'false');
    }
    function flash(text) {
      label.textContent = text; live.textContent = text;
      host.classList.add('is-done');
      clearTimeout(timer);
      timer = setTimeout(function () { label.textContent = 'Copy page'; host.classList.remove('is-done'); }, 2000);
    }

    function run(act) {
      if (act === 'kit') {
        label.textContent = 'Preparing\u2026';
        copyFrom(textFor(true)).then(function (ok) { flash(ok ? 'Copied kit' : 'Could not copy'); });
      } else if (act === 'copy') {
        if (kitDefault) label.textContent = 'Preparing\u2026';
        copyFrom(textFor(false)).then(function (ok) { flash(ok ? 'Copied' : 'Could not copy'); });
      } else if (act === 'link') {
        copyText(url).then(function (ok) { flash(ok ? 'Link copied' : 'Press Cmd+C'); });
      } else if (act === 'view') {
        /* A blob URL, so it needs no server and no file: the tab shows exactly what Copy
           page would put on the clipboard. It is not a shareable address. The tab is
           opened NOW, during the click, and pointed at the text once it exists — a
           window opened after an async wait is what popup blockers refuse. */
        var w = window.open('about:blank', '_blank');
        textFor(false).then(function (t) {
          var u = URL.createObjectURL(new Blob([t], { type: 'text/plain;charset=utf-8' }));
          if (w) w.location.href = u; else window.open(u, '_blank');
        });
      } else if (act === 'claude') {
        var q;
        if (isPublic && !kitDefault) {
          q = 'Read ' + url + ' and answer questions about it.';
        } else {
          /* Claude cannot fetch a gated page, and a fetched public one misses everything
             the page draws with script — so hand it the text instead. */
          q = 'I have copied a page from the Gushwork design hub. I will paste it below \u2014 read it and answer questions about it.';
          if (kitDefault) label.textContent = 'Preparing\u2026';
          copyFrom(textFor(false)).then(function (ok) { flash(ok ? 'Copied \u2014 paste into Claude' : 'Press Cmd+C'); });
        }
        window.open('https://claude.ai/new?q=' + encodeURIComponent(q), '_blank', 'noopener');
      }
    }

    host.addEventListener('click', function (ev) {
      var btn = ev.target.closest('[data-pa]');
      if (btn) { setOpen(false); run(btn.getAttribute('data-pa')); return; }
      if (ev.target.closest('.pa__tog')) setOpen(menu.hidden);
    });
    document.addEventListener('click', function (ev) { if (!host.contains(ev.target)) setOpen(false); });
    host.addEventListener('keydown', function (ev) {
      if (menu.hidden) return;
      var items = [].slice.call(menu.querySelectorAll('.pa__row')), i = items.indexOf(document.activeElement);
      if (ev.key === 'Escape') { ev.preventDefault(); setOpen(false); tog.focus(); }
      else if (ev.key === 'ArrowDown') { ev.preventDefault(); (items[i + 1] || items[0]).focus(); }
      else if (ev.key === 'ArrowUp') { ev.preventDefault(); (items[i - 1] || items[items.length - 1]).focus(); }
    });
    tog.addEventListener('keydown', function (ev) {
      if ((ev.key === 'ArrowDown' || ev.key === 'Enter' || ev.key === ' ') && menu.hidden) {
        ev.preventDefault(); setOpen(true); var f = menu.querySelector('.pa__row'); if (f) f.focus();
      }
    });
  }

  function initIndexRail() {
    var idx = document.querySelector('.idx');
    if (!idx) return;

    var col = idx.querySelector('[data-idx-collapse]');
    if (col) {
      col.addEventListener('click', function () {
        var next = idx.getAttribute('data-collapsed') !== 'true';
        idx.setAttribute('data-collapsed', next ? 'true' : 'false');
        col.setAttribute('aria-expanded', next ? 'false' : 'true');
        col.setAttribute('aria-label', next ? 'Expand the section list'
                                            : 'Collapse the section list');
      });
    }

    var links = [].slice.call(idx.querySelectorAll('.idx__list a'));
    if (!links.length) return;
    var secs = links.map(function (a) {
      try { return document.querySelector(a.getAttribute('href')); } catch (e) { return null; }
    });

    /* The scrollport is .gw-scroll, NOT .gw-main. The panel became a fixed frame
       with `overflow:hidden` and an inner .gw-scroll that does the scrolling; the
       spy was still listening on .gw-main, which never fires a scroll event. That
       is why the rail's highlight stuck on the first section on every page.
       Falls back to the document for the login screen and anything rendered
       without the shell. */
    var port = document.querySelector('.gw-scroll') || document.querySelector('.gw-main');
    var target = port || window;

    function spy() {
      var origin = port ? port.getBoundingClientRect().top : 0;
      var best = 0;
      for (var i = 0; i < secs.length; i++) {
        if (secs[i] && (secs[i].getBoundingClientRect().top - origin) <= 140) best = i;
      }
      for (var j = 0; j < links.length; j++) {
        links[j].classList.toggle('now', j === best);
      }

      /* Keep the active entry inside the rail's own scroll. Most pages list
         five sections and never scroll, so this is a no-op there — the
         changelog lists 46 and the highlight walks off the bottom without it. */
      var a = links[best], box = idx.getBoundingClientRect(), r = a.getBoundingClientRect();
      if (r.top < box.top + 24) idx.scrollTop -= (box.top + 24 - r.top);
      else if (r.bottom > box.bottom - 8) idx.scrollTop += (r.bottom - box.bottom + 8);
    }

    var queued = false;
    target.addEventListener('scroll', function () {
      if (queued) return;
      queued = true;
      requestAnimationFrame(function () { queued = false; spy(); });
    }, { passive: true });
    spy();
  }

  /* ---------------------------------------------------------------------------
     NOTIFICATIONS — new in 796:10931. A dropdown under the bell listing what has
     shipped, newest first, with a dot on the bell while anything is unread.

     THE ENTRIES ARE REAL RELEASES, not copy. web/notifications.json is generated
     from CHANGELOG.md by scripts/notifications.sh, so this panel cannot claim
     something shipped that did not. It is fetched rather than inlined so the rail
     renders instantly and a slow or missing file degrades to an empty state
     instead of holding up the shell.

     THE DOT IS RECENCY, NOT AN INBOX. It means "something here is from the last
     seven days" — ruled 29 Sep 2026. It does NOT clear when you open the panel,
     because it is not tracking whether you read anything; it is saying the system
     moved this week. That also means it needs no stored state and behaves the same
     on every device.
     ------------------------------------------------------------------------- */
  var NOTIF_WINDOW_DAYS = 7;
  var NOTIF_SEEN_KEY = 'gw-notif-seen';
  var notices = null;

  /* One sortable string per notice — "2026-09-24 20:17". Day alone is not enough:
     three releases shipped on 23 Sep, and a seen-mark of just the day would swallow
     the two later ones. */
  function notifKey(it) { return (it.date || '') + ' ' + (it.at || '00:00'); }

  function newestKey() {
    var k = '';
    for (var i = 0; i < (notices || []).length; i++) {
      var c = notifKey(notices[i]);
      if (c > k) k = c;
    }
    return k;
  }

  /* localStorage is per-browser, so "seen" does not follow you to another device.
     That is the right trade here: the alternative is a server round-trip and a
     column, for a dot. Reads and writes are wrapped because private mode throws. */
  function seenKey() {
    try { return localStorage.getItem(NOTIF_SEEN_KEY) || ''; } catch (e) { return ''; }
  }
  function markSeen(k) {
    try { if (k) localStorage.setItem(NOTIF_SEEN_KEY, k); } catch (e) { /* no-op */ }
  }

  function withinWindow(iso) {
    if (!iso) return false;
    var then = Date.parse(iso + 'T00:00:00Z');
    if (isNaN(then)) return false;
    return (Date.now() - then) <= NOTIF_WINDOW_DAYS * 86400000;
  }

  function notifHTML() {
    return '<div class="gw-pop" data-pop>' +
        '<button class="gw-iconbtn" type="button" data-pop-trigger="notif" data-tip="What\u2019s new" ' +
                'aria-haspopup="menu" aria-expanded="false" aria-label="What\u2019s new">' +
          icon('bell') +
          '<span class="gw-iconbtn__dot" data-notif-dot hidden></span>' +
        '</button>' +
        '<div class="gw-pop__menu gw-pop__menu--notif" data-pop-menu hidden>' +
          '<div class="gw-pop__t">Recents</div>' +
          '<div class="gw-notes" data-notif-list>' +
            '<p class="gw-notes__empty">Nothing yet.</p>' +
          '</div>' +
        '</div>' +
      '</div>';
  }

  /* Help. The Figma draws the trigger but not the panel, so this lists the three
     places that already answer a question — the style guide, the changelog and
     Utsav on Slack — rather than inventing a help centre that does not exist. */
  function helpHTML() {
    return '<div class="gw-pop" data-pop>' +
        '<button class="gw-iconbtn" type="button" data-pop-trigger="help" data-tip="Help" data-tip-end ' +
                'aria-haspopup="menu" aria-expanded="false" aria-label="Help">' +
          icon('question') +
        '</button>' +
        /* Two rows, per 796:11329 — a compact menu, no header and no descriptions.
           My first pass invented a three-row help centre; this is what is drawn. */
        '<div class="gw-pop__menu gw-pop__menu--mini" data-pop-menu hidden>' +
          '<a class="gw-pop__row" href="mailto:design@gushwork.ai">' + icon('envelope') +
            '<span>Send an email</span></a>' +
          '<a class="gw-pop__row" href="https://gushwork.slack.com/team/U06UAR183TR" ' +
             'target="_blank" rel="noopener">' + icon('slack-logo') +
            '<span>Message on Slack</span></a>' +
        '</div>' +
      '</div>';
  }

  function loadNotices() {
    /* The bell is drawn twice on a phone-capable page (panel bar and drawer), so paint every copy. */
    var lists = [].slice.call(document.querySelectorAll('[data-notif-list]'));
    var dots  = [].slice.call(document.querySelectorAll('[data-notif-dot]'));
    if (!lists.length) return;
    fetch('/notifications.json', { cache: 'no-cache' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        notices = (d && d.items) || [];
        if (!notices.length) return;
        var html = notices.map(function (it) {
          return '<a class="gw-note" href="' + esc(it.href || '/internal/changelog') + '">' +
                   '<span class="gw-note__d">' + esc(it.label || it.date) + '</span>' +
                   '<span class="gw-note__t">' + esc(it.title) + '</span>' +
                 '</a>';
        }).join('');
        lists.forEach(function (l) { l.innerHTML = html; });
        /* The dot means "there is something here you have not looked at yet",
           not "something shipped this week" — so it needs BOTH: inside the
           7-day window, and newer than whatever you had already seen. */
        var seen = seenKey();
        var unread = notices.some(function (it) {
          return withinWindow(it.date) && notifKey(it) > seen;
        });
        dots.forEach(function (dt) { dt.hidden = !unread; });
      })
      .catch(function () { /* an empty state is a fine answer */ });
  }

  function closePops(except) {
    var pops = document.querySelectorAll('[data-pop]');
    for (var i = 0; i < pops.length; i++) {
      if (pops[i] === except) continue;
      var m = pops[i].querySelector('[data-pop-menu]');
      var b = pops[i].querySelector('[data-pop-trigger]');
      if (m) m.hidden = true;
      if (b) b.setAttribute('aria-expanded', 'false');
    }
  }

  function togglePop(btn) {
    var pop = btn.closest('[data-pop]');
    var menu = pop && pop.querySelector('[data-pop-menu]');
    if (!menu) return;
    var opening = menu.hidden;
    closePops(pop);
    closeThemeMenus();
    menu.hidden = !opening;
    btn.setAttribute('aria-expanded', opening ? 'true' : 'false');

    /* Opening the notifications panel clears the dot, and it stays clear until
       something newer than the newest item you just saw shows up. It used to
       persist for the whole 7-day window no matter how many times you looked,
       which trained people to ignore it. */
    if (opening && btn.getAttribute('data-pop-trigger') === 'notif') {
      markSeen(newestKey());
      var dot = pop.querySelector('[data-notif-dot]');
      if (dot) dot.hidden = true;
    }
  }

  function modalHTML() {
    var m = session.modes || {};
    var body = '';

    if (m.google) {
      body += '<a class="gw-modal__btn" data-google-btn href="/api/auth/login">' +
        GOOGLE_G + '<span>Continue with Google</span>' +
        '<span class="gw-modal__btnarrow">' + icon('arrow-right') + '</span></a>';
    }
    /* 683:4911 is Google and nothing else — no divider, no password field, no
       line under the button. Utsav 16 Sep, revising the 15 Sep call to show
       both. The fallback is not deleted, only hidden while Google is actually
       available: it exists for the case where Google is NOT configured, and in
       that case it is still the only way in and still renders. */
    if (!m.google && m.password) {
      body += '<form class="gw-modal__form" data-pw-form>' +
        '<label class="gw-modal__label" for="gw-pw">Team password</label>' +
        '<input class="gw-modal__input" id="gw-pw" name="password" type="password" ' +
               'autocomplete="current-password" required ' +
               'placeholder="Enter the team password">' +
        '<p class="gw-modal__err" data-pw-err hidden role="alert"></p>' +
        '<button class="gw-modal__btn gw-modal__btn--primary" type="submit">' +
          '<span>Continue</span></button>' +
      '</form>';
    }

    /* The drawing carries nothing under the button, so the note only appears on
       the path the drawing does not cover. */
    var note = m.google
      ? ''
      : 'Google sign-in is not switched on yet, so the team password is the way in ' +
        'for now.';

    return '<div class="gw-modal" hidden role="dialog" aria-modal="true" ' +
                'aria-labelledby="gw-modal-title">' +
        '<div class="gw-login__grid" aria-hidden="true">' +
          '<span class="gw-login__cell" style="left:400px;top:80px"></span>' +
          '<span class="gw-login__cell" style="left:440px;top:120px"></span>' +
          '<span class="gw-login__cell" style="left:800px;top:240px"></span>' +
          '<span class="gw-login__cell" style="right:120px;bottom:200px"></span>' +
          '<span class="gw-login__cell" style="right:280px;bottom:80px"></span>' +
        '</div>' +
        '<div class="gw-modal__box">' +
          '<button class="gw-modal__x" type="button" data-close-modal aria-label="Close">' +
            icon('x') + '</button>' +
          '<span class="gw-modal__chip" style="color:var(--gw-color-white)">' + MARK + '</span>' +
          '<h2 class="gw-modal__title" id="gw-modal-title">You&rsquo;ll need to log in</h2>' +
          '<p class="gw-modal__dest" hidden></p>' +
          '<p class="gw-modal__sub">Log in using your Gushwork email id to get ' +
             'access.</p>' +
          body +
          (note ? '<p class="gw-modal__note">' + note + '</p>' : '') +
        '</div>' +
      '</div>';
  }

  /* Where to land after a successful password sign-in. */
  var pendingNext = '/';

  function submitPassword(form) {
    var input = form.querySelector('input[name="password"]');
    var err = form.querySelector('[data-pw-err]');
    var btn = form.querySelector('button[type="submit"]');
    err.hidden = true;
    btn.disabled = true;

    fetch('/api/auth/password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ password: input.value, next: pendingNext })
    })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (res) {
        btn.disabled = false;
        if (res.ok && res.j.ok) { location.href = res.j.next || pendingNext; return; }
        err.textContent = (res.j && res.j.error) || 'That did not work.';
        err.hidden = false;
        input.select();
      })
      .catch(function () {
        btn.disabled = false;
        err.textContent = 'Could not reach the server.';
        err.hidden = false;
      });
  }

  /* -- theme ---------------------------------------------------------------
     `system` is now a real choice, so the old "no stored value means follow the
     OS" trick is gone: the preference is always stored, and following the OS is
     one of the things it can say. The OS listener therefore fires for `system`
     specifically rather than for the absence of an answer.

     Controls are duplicated for the phone dock — CSS cannot move a node between
     parents — so every sync walks all of them rather than the one that was
     clicked. */

  function syncThemeControls(pref) {
    var opts = document.querySelectorAll('[data-theme-set]');
    for (var i = 0; i < opts.length; i++) {
      var on = opts[i].getAttribute('data-theme-set') === pref;
      opts[i].classList.toggle('is-on', on);
      opts[i].setAttribute('aria-checked', on ? 'true' : 'false');
    }
    /* The trigger shows the active theme's glyph, and its label says the same to a screen reader.
       (It used to keep one constant glyph, per Figma 791:2637; changed 30 Sep 2026.) */
    var chosen = THEMES.filter(function (t) { return t.id === pref; })[0] || THEMES[0];
    var triggers = document.querySelectorAll('[data-theme-trigger]');
    for (var j = 0; j < triggers.length; j++) {
      triggers[j].innerHTML = icon(chosen.icon);
      triggers[j].setAttribute('aria-label', 'Colour theme: ' + chosen.label);
    }
  }

  function setTheme(pref) {
    applyTheme(pref, true);
    syncThemeControls(pref);
    closeThemeMenus();
  }

  function closeThemeMenus() {
    var m = document.querySelectorAll('[data-theme-menu]');
    for (var i = 0; i < m.length; i++) {
      m[i].classList.remove('is-open');
      var menu = m[i].querySelector('.gw-theme__menu');
      var trig = m[i].querySelector('[data-theme-trigger]');
      if (menu) menu.hidden = true;
      if (trig) trig.setAttribute('aria-expanded', 'false');
    }
  }

  function toggleThemeMenu(trigger) {
    var wrap = trigger.closest('[data-theme-menu]');
    var open = wrap.classList.contains('is-open');
    closeThemeMenus();
    if (open) return;
    wrap.classList.add('is-open');
    wrap.querySelector('.gw-theme__menu').hidden = false;
    trigger.setAttribute('aria-expanded', 'true');
  }

  function initTheme() {
    var pref = themePref();
    applyTheme(pref, false);
    syncThemeControls(pref);
    /* While the choice is System the page follows the machine as it changes, for example at sunset. */
    try {
      var mq = matchMedia('(prefers-color-scheme: dark)');
      var follow = function () { if (themePref() === 'system') applyTheme('system', false); };
      if (mq.addEventListener) mq.addEventListener('change', follow); else if (mq.addListener) mq.addListener(follow);
    } catch (e) { /* an old browser: the theme is whatever it was at load */ }
  }

  /* -- modal -------------------------------------------------------------- */

  /* Figma 763:2222 names the page you were trying to reach, under the title and
     in Primary/500 — "You'll need to log in to see / AI CRM Lander". Resolve it
     from the nav first (those labels are already the human names), then fall
     back to prettifying the slug so a new staging page needs no registry edit.
     ACRONYMS is what turns "ai-crm-lander" into "AI CRM Lander" rather than
     "Ai Crm Lander". */
  var ACRONYMS = { ai:'AI', crm:'CRM', gtm:'GTM', seo:'SEO', pdf:'PDF', ui:'UI', ux:'UX',
                   api:'API', og:'OG', faq:'FAQ', cta:'CTA', b2b:'B2B', b2c:'B2C' };
  function destName(path) {
    if (!path) return '';
    var clean = String(path).split('?')[0].replace(/\/+$/, '');
    if (!clean || clean === '/') return '';
    var hit = '';
    GROUPS.forEach(function (g) {
      (g.items || []).forEach(function (it) {
        if (it.href && it.href.replace(/\/+$/, '') === clean) hit = it.label;
      });
    });
    if (hit) return hit;
    var slug = clean.split('/').pop();
    if (!slug) return '';
    return slug.split('-').map(function (w) {
      return ACRONYMS[w.toLowerCase()] || (w.charAt(0).toUpperCase() + w.slice(1));
    }).join(' ');
  }

  var lastFocus = null;
  function openModal(next, solo) {
    var m = document.querySelector('.gw-modal');
    if (!m) return;
    m.classList.toggle('gw-modal--solo', !!solo);
    pendingNext = next || location.pathname;

    /* Name the destination when we know it. The drawing hides the standing
       subtitle in that case (763:2602 is hidden="true"), so it only shows on
       the path the drawing does not cover — a locked row clicked from inside. */
    var dest = destName(next);
    var titleEl = m.querySelector('.gw-modal__title');
    var destEl = m.querySelector('.gw-modal__dest');
    var subEl = m.querySelector('.gw-modal__sub');
    if (titleEl) titleEl.textContent = dest ? 'You\u2019ll need to log in to see' : 'You\u2019ll need to log in';
    if (destEl) { destEl.textContent = dest; destEl.hidden = !dest; }
    if (subEl) subEl.hidden = !!dest;

    var btn = m.querySelector('[data-google-btn]');
    if (btn) {
      btn.setAttribute('href', '/api/auth/login?next=' + encodeURIComponent(pendingNext));
    }
    lastFocus = document.activeElement;
    m.hidden = false;
    /* Focus the password field when that is the only way in, otherwise the
       Google button. */
    var pw = m.querySelector('input[name="password"]');
    if (btn) btn.focus(); else if (pw) pw.focus();
  }
  function closeModal() {
    var m = document.querySelector('.gw-modal');
    if (!m) return;
    m.hidden = true;
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  /* -- phone drawer --------------------------------------------------------
     The navbar's Phone variants are `Collapsed` (logo + hamburger) and `Menu`
     (a full-screen overlay). The rail is that overlay here. */
  function setNav(open) {
    document.documentElement.classList.toggle('gw-nav-open', open);
    var b = document.querySelector('[data-nav-toggle]');
    if (b) {
      b.setAttribute('aria-expanded', open ? 'true' : 'false');
      b.setAttribute('aria-label', open ? 'Close menu' : 'Menu');
      b.innerHTML = icon(open ? 'x' : 'list');
    }
  }
  function toggleNav() {
    setNav(!document.documentElement.classList.contains('gw-nav-open'));
  }

  /* -- scale to fit --------------------------------------------------------
     exports/dashboard/build-rules.md: "1440 is the minimum width. Below it,
     SCALE the canvas." Reflow is a rejected attempt there, so nothing here
     rearranges — the 1440 layout is held and shrunk to fit.

     min(1, ...) because the rule says it never scales UP: on a 2560 display
     the canvas stays 1440 and the surface shows through.

     The `|| DESIGN_W` guard is from the same rule. A tab that has not been
     laid out yet reports innerWidth as 0, which makes the factor 0 and
     collapses the page to nothing — it renders blank rather than broken,
     which is easy to misread as a build failure. */
  var DESIGN_W = 1440;
  /* The Breakpoint collection's own Phone threshold — tokens.css already swaps
     the whole --gw-bp-* set at this width. Below it the page REFLOWS to the
     phone token set instead of scaling, so the factor has to go neutral or the
     reflowed layout would be shrunk on top of reflowing. */
  var PHONE_MAX = 767;
  function fit() {
    var w = window.innerWidth || DESIGN_W;
    var f = w <= PHONE_MAX ? 1 : Math.min(1, w / DESIGN_W);
    document.documentElement.style.setProperty('--gw-fit', String(f));
    document.documentElement.classList.toggle('gw-phone', w <= PHONE_MAX);
  }

  /* -- build -------------------------------------------------------------- */
  function renderSidebar() {
    var old = document.querySelector('.gw-sidebar');
    var next = el(sidebarHTML());
    if (old) old.replaceWith(next); else document.body.insertBefore(next, document.body.firstChild);
  }

  /* The bar is built before /api/auth/me answers, so the bell — which only exists
     for a signed-in reader — is missing on that first paint. Rebuild it once the
     session is known, the same way the rail and the modal already do. */
  function renderBar() {
    var old = document.querySelector('.gw-bar');
    if (!old) return;
    old.replaceWith(el(panelBarHTML()));
    initTheme();
    loadNotices();
  }

  /* The modal is built before /api/auth/me answers, so which doors it offers
     is a guess until then. Rebuild it once we know — but never while it is
     open, or the field the user is typing into disappears. */
  function renderModal() {
    var old = document.querySelector('.gw-modal');
    if (old && !old.hidden) return;
    var next = el(modalHTML());
    if (old) old.replaceWith(next); else document.body.appendChild(next);
  }

  /* -- search palette ------------------------------------------------------
     The index is fetched once, on first open, and only then: it is 36KB and most
     visits never search. Every failure path leaves the palette usable and silent —
     a search box that cannot reach its index says so rather than hanging. */
  var palIndex = null, palState = { rows: [], sel: 0, loading: false };

  function palHTML() {
    return '<div class="gw-pal" data-open="false" role="dialog" aria-modal="true" ' +
                'aria-label="Search">' +
      '<div class="gw-pal__scrim" data-pal-close></div>' +
      '<div class="gw-pal__box">' +
        '<div class="gw-pal__top">' + icon('magnifying-glass') +
          '<input type="search" placeholder="Search in design hub\u2026" ' +
                 'aria-label="Search" autocomplete="off" spellcheck="false">' +
          /* Phone only. Desktop closes with esc and the footer says so; on a phone the
             footer is hidden and the scrim narrows to a 40px strip with a full result
             list — under the 44 the system asks of a hit target, and unlabelled. */
          '<button class="gw-pal__x" type="button" data-pal-close aria-label="Close search">' +
            icon('x') +
          '</button>' +
        '</div>' +
        '<div class="gw-pal__list" role="listbox"></div>' +
        '<div class="gw-pal__foot">' +
          '<span><b>\u2191</b><b>\u2193</b> Select</span>' +
          '<span><b>\u21a9</b> Open</span>' +
          '<span><b>esc</b> Close</span>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  function palOpen(open) {
    var pal = document.querySelector('.gw-pal');
    if (!pal) return;
    pal.setAttribute('data-open', open ? 'true' : 'false');
    if (!open) return;
    var input = pal.querySelector('.gw-pal__top input');
    input.value = ''; palRender('');
    input.focus();
    if (!palIndex && !palState.loading) {
      palState.loading = true;
      fetch('/search-index.json')
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (j) { palIndex = j || []; palState.loading = false; palRender(input.value); })
        .catch(function () { palIndex = []; palState.loading = false; palRender(input.value); });
    }
  }

  /* EVERY term has to appear somewhere, or "dark mode" only matches that exact phrase and
     finds nothing — which is what it did. Terms are scored independently and summed, so a
     heading match still outranks a body match without needing the words adjacent. */
  function palScore(e, terms) {
    var t = e.t.toLowerCase(), s = (e.s || '').toLowerCase(), total = 0;
    for (var k = 0; k < terms.length; k++) {
      var q = terms[k], i = t.indexOf(q), n = 0;
      if (i === 0) n = 100;
      else if (i > 0) n = 70;
      else if (s.indexOf(q) >= 0) n = 30;
      if (!n) return 0;               /* a term nobody has disqualifies the entry */
      total += n;
    }
    return total;
  }

  function palMark(text, q) {
    var i = text.toLowerCase().indexOf(q);
    if (i < 0) return esc(text);
    return esc(text.slice(0, i)) + '<mark>' + esc(text.slice(i, i + q.length)) +
           '</mark>' + esc(text.slice(i + q.length));
  }

  /* Show the sentence the match is IN, not the first sentence of the section. A snippet
     that does not contain the query reads as a wrong result. */
  function palSnippet(e, q) {
    var s = e.s || '';
    var i = s.toLowerCase().indexOf(q);
    if (i < 0) return esc(e.p);
    var from = Math.max(0, i - 40);
    return esc(e.p) + ' \u203a \u2026' + palMark(s.slice(from, from + 110), q) + '\u2026';
  }

  function palRender(qRaw) {
    var pal = document.querySelector('.gw-pal');
    var list = pal.querySelector('.gw-pal__list');
    var q = (qRaw || '').trim().toLowerCase();

    if (!q) {
      palState.rows = [];
      /* NOTHING between the field and the footer. Re-measured 795:7451 on 29 Sep:
         the default card is 638x129 — 12 + 61 row + 8 + 36 footer + 12 — with no
         body block at all. It previously carried a 180-tall "Type to search…"
         panel; that was an earlier revision of the node and is gone.

         data-state drives both the collapse and the footer legend: Select and Open
         are inert with no rows, so they dim. */
      pal.setAttribute('data-state', palState.loading ? 'loading' : 'empty');
      pal.setAttribute('data-rows', '0');
      list.innerHTML = palState.loading
        ? '<div class="gw-pal__empty">Loading\u2026</div>' : '';
      return;
    }
    var terms = q.split(/\s+/).filter(Boolean);
    var hits = (palIndex || []).map(function (e) { return { e: e, n: palScore(e, terms) }; })
      .filter(function (x) { return x.n > 0; })
      .sort(function (a, b) { return b.n - a.n; })
      .slice(0, 12);

    palState.rows = hits.map(function (x) { return x.e; });
    palState.sel = 0;
    /* Drives the footer legend: Select and Open dim when there is nothing to act on. */
    pal.setAttribute('data-rows', String(hits.length));
    if (!hits.length) {
      pal.setAttribute('data-state', 'nomatch');
      list.innerHTML = '<div class="gw-pal__empty">No matches for \u201c' + esc(qRaw) + '\u201d</div>';
      return;
    }
    pal.setAttribute('data-state', 'results');
    list.innerHTML = hits.map(function (x, i) {
      var e = x.e, tl = e.t.toLowerCase(), sl = (e.s || '').toLowerCase();
      /* mark whichever term this row actually matched on, per field */
      var inT = terms.filter(function (w) { return tl.indexOf(w) >= 0; })[0] || terms[0];
      var inS = terms.filter(function (w) { return sl.indexOf(w) >= 0; })[0] || terms[0];
      return '<a class="gw-pal__row" role="option" aria-selected="' + (i === 0) + '" ' +
                'href="' + esc(e.u + (e.a || '')) + '">' +
        '<span class="gw-pal__hash">' + icon('hash') + '</span>' +
        '<span><span class="gw-pal__t">' + palMark(e.t, inT) + '</span>' +
        '<span class="gw-pal__crumb">' + palSnippet(e, inS) + '</span></span>' +
      '</a>';
    }).join('');
  }

  function palMove(d) {
    var pal = document.querySelector('.gw-pal');
    var rows = pal.querySelectorAll('.gw-pal__row');
    if (!rows.length) return;
    palState.sel = (palState.sel + d + rows.length) % rows.length;
    rows.forEach(function (r, i) { r.setAttribute('aria-selected', i === palState.sel); });
    rows[palState.sel].scrollIntoView({ block: 'nearest' });
  }

  function palWire() {
    document.body.appendChild(el(palHTML()));
    var pal = document.querySelector('.gw-pal');
    var input = pal.querySelector('.gw-pal__top input');

    input.addEventListener('input', function () { palRender(input.value); });
    pal.addEventListener('click', function (ev) {
      if (ev.target.closest('[data-pal-close]')) palOpen(false);
    });
    document.addEventListener('click', function (ev) {
      if (ev.target.closest('[data-search-open]')) { ev.preventDefault(); palOpen(true); }
    });
    document.addEventListener('keydown', function (ev) {
      var open = pal.getAttribute('data-open') === 'true';
      if ((ev.metaKey || ev.ctrlKey) && ev.key.toLowerCase() === 'k') {
        ev.preventDefault(); palOpen(!open); return;
      }
      if (!open) {
        /* The field is a button, so it has to answer to the keyboard like one. */
        if ((ev.key === 'Enter' || ev.key === ' ') &&
            document.activeElement && document.activeElement.closest('[data-search-open]')) {
          ev.preventDefault(); palOpen(true);
        }
        return;
      }
      if (ev.key === 'Escape') { ev.preventDefault(); palOpen(false); }
      else if (ev.key === 'ArrowDown') { ev.preventDefault(); palMove(1); }
      else if (ev.key === 'ArrowUp') { ev.preventDefault(); palMove(-1); }
      else if (ev.key === 'Enter') {
        var row = pal.querySelectorAll('.gw-pal__row')[palState.sel];
        if (row) { ev.preventDefault(); row.click(); }
      }
    });
  }

  function mount() {
    document.documentElement.classList.add('gw-shell-ready');

    /* Move whatever the page already had into <main>, so the sheets keep
       their own layout and only gain a margin. */
    var main = document.createElement('main');
    main.className = 'gw-main';
    var moved = document.createElement('div');
    moved.className = 'gw-scroll';
    while (document.body.firstChild) moved.appendChild(document.body.firstChild);
    /* The bar is part of the PANEL, not the page — measured 795:5467 as the panel's
       own first child. It stays put while .gw-scroll scrolls underneath it. */
    main.appendChild(el(panelBarHTML()));
    main.appendChild(moved);
    document.body.appendChild(main);

    /* One wrapper around the whole canvas, so the scale-to-fit ruling has
       something to zoom. The modal stays OUTSIDE it — an overlay should cover
       the real viewport, not a scaled copy of it. */
    var shell = document.createElement('div');
    shell.className = 'gw-shell';
    document.body.insertBefore(shell, main);
    shell.appendChild(el(topbarHTML()));
    shell.appendChild(el(sidebarHTML()));
    shell.appendChild(main);
    /* The theme control has a home in the design now (795:5462, first of the three
       24x24 controls), so the bottom-right dock it wore for one day is gone. */
    document.body.appendChild(el(modalHTML()));

    initTheme();
    /* After the content has been moved into .gw-main, so the rail and its
       sections are both inside the panel the spy measures against. */
    initIndexRail();
    initPageActions();
    loadNotices();
    fit();

    /* One delegated listener for everything the chrome does. */
    document.addEventListener('click', function (ev) {
      var t = ev.target.closest ? ev.target.closest(
        '[data-theme-set],[data-theme-trigger],[data-pop-trigger],[data-locked],[data-open-modal],[data-close-modal],[data-signout],' +
        '[data-nav-toggle],.gw-navitem') : null;
      if (!t) {
        /* click on the backdrop closes */
        if (ev.target.classList && ev.target.classList.contains('gw-modal')) closeModal();
        /* A menu that survives a click elsewhere on the page is a menu people
           close by clicking its trigger twice, having first tried everything
           else. Anything outside it dismisses. */
        if (!ev.target.closest('[data-theme-menu]')) closeThemeMenus();
        if (!ev.target.closest('[data-pop]')) closePops();
        return;
      }
      if (t.hasAttribute('data-nav-toggle')) { toggleNav(); return; }
      if (t.hasAttribute('data-pop-trigger')) { togglePop(t); return; }
      if (t.hasAttribute('data-theme-trigger')) { toggleThemeMenu(t); return; }
      if (t.hasAttribute('data-theme-set')) { setTheme(t.getAttribute('data-theme-set')); return; }
      if (t.hasAttribute('data-locked'))    { ev.preventDefault(); openModal(t.getAttribute('data-locked')); return; }
      if (t.hasAttribute('data-open-modal')){ ev.preventDefault(); openModal(location.pathname); return; }
      if (t.hasAttribute('data-close-modal')){ closeModal(); return; }
      if (t.classList && t.classList.contains('gw-navitem')) { setNav(false); }
      if (t.hasAttribute('data-signout')) {
        ev.preventDefault();
        location.href = '/api/auth/logout?next=' + encodeURIComponent('/');
      }
    });

    document.addEventListener('submit', function (ev) {
      if (ev.target && ev.target.hasAttribute && ev.target.hasAttribute('data-pw-form')) {
        ev.preventDefault();
        submitPassword(ev.target);
      }
    });

    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape') { closeModal(); setNav(false); closeThemeMenus(); }
    });

    /* ResizeObserver, not just the resize event. The event does not reliably
       fire for every way a viewport can change — device emulation and some
       embedded panes reconfigure the viewport without one, which left the
       factor stale at a width it had passed through rather than the one it
       landed on. The observer watches the element itself, so it cannot miss. */
    var fitTick = false;
    function scheduleFit() {
      if (fitTick) return;
      fitTick = true;
      requestAnimationFrame(function () {
        fitTick = false;
        fit();
        /* Growing past the phone breakpoint with the drawer open would leave
           the rail stuck in its overlay state on a desktop layout. */
        if (window.innerWidth > PHONE_MAX) setNav(false);
      });
    }
    if (window.ResizeObserver) {
      new ResizeObserver(scheduleFit).observe(document.documentElement);
    }
    window.addEventListener('resize', scheduleFit, { passive: true });

    /* Who is signed in? On a local static preview there is no API, so this
       fails and the page stays in its signed-out state, which is correct. */
    /* Arriving on a gated route with no session: the middleware sends you to
       the Overview with ?signin=required, and this is what pops the modal over
       it. It runs AFTER /api/auth/me has answered, and that ordering is the
       whole point — see the note where it is called.

       Deliberately not gated on `signedIn`: the only thing that puts this
       param in the URL is the middleware bouncing a request it would not
       serve, so if it is here, there is no usable session. */
    function popSignInIfAsked() {
      if (!/[?&]signin=required/.test(location.search)) return;
      var params = new URLSearchParams(location.search);
      /* A direct-link bounce gets the grid backdrop of 763:2222 ("direct-link-login")
         rather than the Overview showing through: someone who followed a shared link
         has no business reading half a page they cannot use. Closing the modal still
         reveals the Overview, which is what the 16 Sep routing call was protecting. */
      openModal(params.get('next') || '/', true);
    }

    fetch('/api/auth/me', { credentials: 'same-origin' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (s) {
        if (s) session = s;
        session.pending = false;
        /* Redraw both: the sidebar for the locks and the ADMIN group, the
           modal because only now do we know which doors are open. Also on a
           null answer: the ghosts have to give way to the signed-out state. */
        renderSidebar();
        renderBar();
        renderModal();
        popSignInIfAsked();
      })
      /* No API — stay signed out. The modal keeps its pre-flight guess, which
         on a static preview is the only honest answer. */
      .catch(function () {
        session.pending = false;
        renderSidebar();
        renderBar();
        popSignInIfAsked();
      });

    /* Popped here and not at mount, because renderModal() above REFUSES to
       rebuild a modal that is already open — it must not wipe a field someone
       is typing into. Opening synchronously at mount won that race every time:
       the modal went up built from the pre-flight guess, renderModal() then
       bailed on it, and the card sat there offering the team-password door on
       a deployment where Google is the only one that works.

       Every other way in is a human clicking something, by which point /me
       has long since answered. This is the only path that opens the modal
       before anyone has had time to act, so it is the only one that raced. */

    palWire();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();

/* PAGE_THEME_SNIPPET — put this in every page's <head>, before the
   stylesheets, so the theme is set before first paint. Defaults to light,
   not the OS preference — see scripts/_add_shell.py's THEME_SNIPPET for why:

   <script>try{var c=localStorage.getItem('gw-theme-choice'),t=c==='dark'||c==='light'?c:(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.setAttribute('data-theme',t)}catch(e){document.documentElement.setAttribute('data-theme','light')}</script>
*/
