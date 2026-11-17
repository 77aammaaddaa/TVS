/**
 * KLEIV Doodles - Ultra-lightweight Vector System
 * ViewBox standardized | stroke="currentColor" | animatable classes
 * Target <4KB per asset, embed-ready for Astro/Tailwind
 */
export const KLEIV_DOODLES = {
  infinity_loop: `
<svg viewBox="0 0 120 70" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
  <path class="infinity-loop" d="M10 35 C10 14 38 10 60 35 S110 60 110 35 C110 12 82 8 60 35 C38 62 10 58 10 35Z" stroke-width="3.2"/>
  <path class="infinity-loop-sketch" d="M18 36 C28 22 48 20 58 35 M62 35 C72 50 92 54 102 38" stroke-width="1.2" opacity="0.5"/>
  <path class="infinity-loop-inner" d="M22 38 C30 28 46 26 56 36 C66 48 88 50 98 38" stroke-width="1" opacity="0.35" stroke-dasharray="2 3"/>
</svg>`.trim(),

  melting_ice: `
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5">
  <g class="ice-cube ice-cube-1">
    <path class="ice-face-front" d="M14 45 L36 43 L41 60 L18 64Z"/>
    <path class="ice-face-top" d="M14 45 L20 32 L40 28 L36 43"/>
    <path class="ice-face-side" d="M36 43 L40 28 L46 31 L41 60"/>
    <path class="ice-shine droplet" d="M24 49 C22 53 24 58 26 54 C28 51 27 46 24 49Z" fill="currentColor" stroke="none" opacity="0.9"/>
  </g>
  <g class="ice-cube ice-cube-2">
    <path class="ice-face-front" d="M38 30 L58 18 L66 32 L48 48Z"/>
    <path class="ice-face-top" d="M38 30 L43 16 L62 12 L58 18"/>
    <path class="ice-face-side" d="M58 18 L62 12 L70 18 L66 32"/>
    <path class="ice-shine droplet" d="M52 34 C50 37 52 41 54 38 C56 35 54 30 52 34Z" fill="currentColor" stroke="none" opacity="0.9"/>
  </g>
  <g class="ice-cube ice-cube-3">
    <path class="ice-face-front" d="M58 52 L78 48 L84 62 L64 68Z"/>
    <path class="ice-face-top" d="M58 52 L62 38 L80 36 L78 48"/>
    <path class="ice-face-side" d="M78 48 L80 36 L88 40 L84 62"/>
    <path class="ice-shine droplet" d="M70 55 C68 58 70 62 72 59 C74 56 72 52 70 55Z" fill="currentColor" stroke="none" opacity="0.9"/>
  </g>
  <path class="melt-puddle puddle-1" d="M8 72 C2 76 12 82 26 76 C34 80 54 76 52 68 C48 64 30 66 22 66 C15 66 10 68 8 72Z" stroke-width="2.2"/>
  <path class="melt-puddle puddle-2" d="M56 68 C58 62 72 62 84 66 C92 68 94 76 86 78 C78 81 66 78 60 74 C56 72 54 71 56 68Z" stroke-width="2.2"/>
  <path class="droplet droplet-small" d="M54 72 C52 74 54 77 57 76 C59 75 58 71 54 72Z" fill="currentColor" stroke="none"/>
  <path class="droplet droplet-trail" d="M28 74 C32 73 36 74 32 76 C28 77 22 76 28 74Z" fill="currentColor" stroke="none" opacity="0.7"/>
</svg>`.trim(),

  person_with_box: `
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
  <path class="apron-strap" d="M42 48 L52 38 L62 46 L54 54" stroke-width="2.5"/>
  <path class="apron-body" d="M42 50 L62 46 L88 72 L78 96 C70 103 58 102 50 92 L40 64Z" fill="currentColor" stroke="none" opacity="1"/>
  <g class="person-head">
    <path class="hair-bun" d="M18 28 C10 24 8 38 14 44 C18 50 28 54 34 46" fill="currentColor" stroke="none"/>
    <path class="face-outline" d="M22 38 C22 28 32 22 42 28 C48 32 48 44 40 50 C32 54 24 48 22 38Z" stroke-width="2.5"/>
    <path class="eye" d="M38 38 C39 36 41 36 42 38" stroke-width="1.8"/>
  </g>
  <path class="arm-left" d="M42 55 L32 62 L38 74" stroke-width="2.5"/>
  <path class="arm-right" d="M62 46 L78 28 L90 16 L94 18 L80 36" stroke-width="2.5"/>
  <path class="hand" d="M78 28 L66 22 C66 26 70 32 78 34 M70 24 L78 28" stroke-width="2.2" fill="none"/>
  <g class="box coffee-box">
    <path class="box-top" d="M28 12 L58 6 L72 22 L42 28Z" stroke-width="2.5"/>
    <path class="box-front" d="M28 12 L28 28 L42 32 L42 28" stroke-width="2.5"/>
    <path class="box-handle" d="M32 8 L36 2 C42 -1 52 2 54 6" stroke-width="2.5"/>
    <path class="box-lines" d="M44 14 L62 12 M44 18 L62 16 M44 22 L60 20" stroke-width="1" opacity="0.6"/>
  </g>
  <path class="ground-line" d="M4 94 C12 88 28 90 38 94" stroke-width="2" opacity="0.8"/>
</svg>`.trim(),

  croissant_lounger: `
<svg viewBox="0 0 120 90" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
  <g class="croissant-base">
    <path class="croissant-outline" d="M16 56 C10 46 24 36 36 40 C44 30 64 28 74 38 C86 32 104 38 106 52 C104 66 86 80 72 76 C58 84 40 82 32 70 C22 72 12 66 16 56Z" stroke-width="2.6"/>
    <path class="croissant-segment s1" d="M36 40 C38 52 36 64 32 70" stroke-width="2.2"/>
    <path class="croissant-segment s2" d="M52 34 C54 46 52 62 48 74" stroke-width="2.2"/>
    <path class="croissant-segment s3" d="M74 38 C76 50 72 64 66 74" stroke-width="2.2"/>
    <path class="croissant-segment s4" d="M92 42 C94 52 90 64 82 72" stroke-width="2.2"/>
  </g>
  <g class="rolling-pin">
    <path class="pin-body" d="M10 32 C8 28 12 24 16 26 L44 20 C48 18 52 22 50 26 L22 34 C18 36 12 36 10 32Z" stroke-width="2.2"/>
    <path class="pin-rings" d="M18 26 L18 33 M22 25 L22 32 M26 24 L26 31 M30 23 L30 30 M34 22 L34 29 M38 21 L38 28 M42 20 L42 27" stroke-width="1" opacity="0.7"/>
    <circle class="pin-handle-left" cx="8" cy="30" r="3.5" fill="currentColor" stroke="none"/>
    <circle class="pin-handle-right" cx="48" cy="22" r="3.5" fill="currentColor" stroke="none"/>
  </g>
  <g class="person-lounger">
    <path class="head" d="M64 8 C62 4 68 1 74 2 C78 3 80 8 76 11 C74 12 68 12 64 8Z" fill="currentColor" stroke="none"/>
    <path class="face" d="M68 10 L68 16 M72 10 C73 11 73 12 72 13" stroke-width="1.5"/>
    <path class="hoodie" d="M58 16 C54 18 48 24 48 30 C48 36 54 38 58 34 M58 16 L66 14 L76 16 L84 14 C90 16 94 20 92 26" stroke-width="2.2"/>
    <path class="arm-on-croissant" d="M54 28 C52 32 56 38 62 36" stroke-width="2.2"/>
    <path class="pants" d="M62 36 L74 36 L88 26 C92 22 98 24 96 30 L82 46 L72 62 C68 66 60 64 60 56 L64 44" fill="currentColor" stroke="currentColor" stroke-width="1.5"/>
    <g class="sneaker sneaker-1">
      <path d="M80 44 L96 30 L104 34 L100 40 L86 50 C82 52 78 50 80 44Z" fill="currentColor" stroke="none"/>
      <path d="M92 34 L95 37 M94 32 L97 35" stroke="#FCFCFC" stroke-width="0.8" opacity="0.9"/>
    </g>
    <g class="sneaker sneaker-2">
      <path d="M60 56 L68 68 L76 70 L80 66 L74 60 C70 56 60 52 60 56Z" fill="currentColor" stroke="none"/>
    </g>
  </g>
  <g class="iced-cup-mini">
    <path d="M32 80 L34 88 L48 88 L50 80Z" stroke-width="1.8"/>
    <path d="M30 80 L52 80 L50 78 L32 78Z" stroke-width="1.6"/>
    <path d="M38 78 L40 70" stroke-width="1.6"/>
  </g>
</svg>`.trim(),

  barista_craft: `
<svg viewBox="0 0 120 80" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
  <path class="ground-line" d="M2 70 L118 70" stroke-width="2.5"/>
  <path class="ground-line-2" d="M6 74 L92 74" stroke-width="1.5" opacity="0.6"/>
  <g class="espresso-machine">
    <path class="machine-body" d="M10 36 L52 36 L52 58 L10 58Z" stroke-width="2.4"/>
    <path class="machine-tray" d="M14 58 L48 58 L48 64 L14 64Z" stroke-width="2"/>
    <path class="machine-top" d="M12 36 L12 34 L50 34 L50 36" stroke-width="2"/>
    <path class="cup-stack cup-stack-1" d="M18 20 L22 20 L23 32 L17 32Z" stroke-width="1.6"/>
    <path class="cup-stack cup-stack-2" d="M26 20 L30 20 L31 32 L25 32Z" stroke-width="1.6"/>
    <circle class="stack-logo" cx="20" cy="26" r="1.5" fill="currentColor" stroke="none"/>
    <circle class="stack-logo" cx="28" cy="26" r="1.5" fill="currentColor" stroke="none"/>
    <path class="tamper" d="M14 26 C14 24 16 23 18 24 C20 25 20 27 18 28 L14 28Z M16 28 L16 32" stroke-width="1.6"/>
  </g>
  <g class="steam-vapors">
    <path class="steam-1" d="M40 34 C36 28 28 26 32 20 C36 14 46 14 48 8 C50 2 58 0 66 2 C72 4 74 8 70 12 C66 16 58 14 54 18 C50 22 58 24 54 28 C52 31 46 30 40 34Z" stroke-width="1.8"/>
    <path class="steam-2" d="M64 28 C68 24 66 20 70 18" stroke-width="1.4" opacity="0.7"/>
  </g>
  <g class="barista">
    <path class="beanie" d="M66 16 C66 12 70 10 74 12 C78 14 78 18 76 20" stroke-width="1.8" fill="currentColor" stroke="none" opacity="1"/>
    <path class="beanie-outline" d="M66 16 C66 12 70 10 74 12 C78 14 78 18 76 20" stroke-width="1.6" fill="none"/>
    <path class="hair" d="M66 20 C64 24 64 30 68 32 M76 20 C80 24 82 30 80 34" stroke-width="1.5"/>
    <path class="face-barista" d="M68 20 C68 26 72 28 76 26 C78 22 78 18 76 16" stroke-width="1.6"/>
    <path class="apron-barista" d="M64 32 L80 32 L82 64 L62 64Z" stroke-width="1.8"/>
    <path class="arm-left" d="M64 34 C60 36 56 42 60 46 C64 50 70 48 72 44" stroke-width="1.8"/>
    <path class="arm-right" d="M80 34 C84 38 88 46 86 50 C84 54 78 54 76 50" stroke-width="1.8"/>
    <path class="portafilter" d="M70 38 L66 42 L74 44 L78 40Z" stroke-width="1.6" fill="currentColor" stroke="none" opacity="1"/>
    <path class="cup-in-hand" d="M70 46 L74 46 L75 50 L69 50Z" stroke-width="1.4"/>
  </g>
  <g class="grinder">
    <path class="grinder-hopper" d="M96 24 L112 24 L108 42 L100 42Z" stroke-width="2"/>
    <path class="grinder-body" d="M98 42 L110 42 L110 48 L98 48Z" stroke-width="1.8"/>
    <path class="grinder-box" d="M96 48 L112 48 L112 60 L96 60Z" stroke-width="1.8"/>
    <path class="grinder-base" d="M94 60 L114 60 L114 66 L94 66Z" stroke-width="1.6"/>
    <rect class="grinder-display" x="102" y="52" width="4" height="2" rx="0.5" fill="currentColor" stroke="none"/>
  </g>
  <g class="props">
    <path class="shopping-bag" d="M54 50 L62 50 L64 64 L52 64Z" stroke-width="1.5"/>
    <circle class="bag-logo" cx="58" cy="57" r="2" fill="currentColor" stroke="none"/>
    <path class="bag-handle" d="M56 50 C56 46 60 46 60 50" stroke-width="1.2"/>
    <path class="canister" d="M66 50 L72 50 L72 64 L66 64Z" stroke-width="1.4"/>
    <path class="brushes" d="M66 52 L64 44 M68 52 L68 44 M70 52 L72 44" stroke-width="1"/>
    <path class="plant-pot" d="M84 58 L92 58 L92 64 L84 64Z" stroke-width="1.4"/>
    <path class="plant" d="M86 58 C86 54 88 54 88 58 C88 52 90 52 92 58 M84 56 C86 54 88 56 88 58" stroke-width="1.2"/>
  </g>
</svg>`.trim(),

  balance_girl: `
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
  <g class="iced-cup-on-head">
    <path class="cup-lid" d="M44 10 L60 10 L60 12 L44 12Z" stroke-width="2"/>
    <path class="cup-rim" d="M42 12 L62 12" stroke-width="2"/>
    <path class="cup-body" d="M43 12 L45 30 L59 30 L61 12" stroke-width="2"/>
    <path class="straw" d="M52 10 L56 2" stroke-width="2.2"/>
    <path class="ice-in-cup" d="M48 18 L52 20 M54 22 L58 24" stroke-width="1" opacity="0.7"/>
  </g>
  <g class="arm-raised">
    <path class="arm-line" d="M30 84 L40 48 L44 38 L48 30" stroke-width="2.5"/>
    <path class="hand-grip" d="M44 18 L42 22 C44 26 50 26 52 22 L50 18 M46 20 L54 20 M47 22 L53 22" stroke-width="1.8"/>
  </g>
  <g class="girl-head">
    <path class="hair-mass" d="M36 36 C28 40 24 52 32 60 C38 68 52 70 60 64 C68 58 72 46 68 36 C64 30 52 26 44 28 C40 29 38 32 36 36Z" fill="currentColor" stroke="currentColor" stroke-width="1.2"/>
    <path class="hair-bangs" d="M42 36 L46 46 L50 36 L52 46 L58 38" fill="none" stroke="#2C2C2C" stroke-width="0.8" opacity="0.3"/>
    <path class="face-balance" d="M44 46 C44 54 48 60 56 60 C62 60 66 54 66 46" stroke-width="2.2" fill="none"/>
    <path class="eye-closed" d="M48 48 C49 47 51 47 52 48" stroke-width="1.5"/>
    <path class="mouth" d="M54 56 C56 57 58 56 58 54" stroke-width="1.3"/>
  </g>
  <g class="body-shirt">
    <path class="neck" d="M50 60 C50 64 52 68 58 68 C64 68 66 64 66 60" stroke-width="2.2"/>
    <path class="shirt-body" d="M30 50 L18 62 L26 74 L24 94 L78 94 L78 78 L92 70 L80 52 C76 50 68 48 62 50 L56 60 L50 60 L40 52Z" stroke-width="2.2"/>
    <path class="sleeve-left" d="M18 62 L24 66" stroke-width="1.8"/>
    <path class="sleeve-right" d="M78 78 L92 76" stroke-width="1.8"/>
  </g>
  <path class="arm-lower" d="M80 80 L84 94 M92 78 L90 94" stroke-width="2" opacity="0.9"/>
</svg>`.trim(),

  iced_cup_slogan: `
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
  <defs>
    <path id="sloganArc" d="M8 42 Q50 2 92 42"/>
  </defs>
  <text class="slogan-text" font-family="ui-rounded, sans-serif" font-weight="800" font-size="8.5" letter-spacing="0.3" fill="currentColor" stroke="none">
    <textPath href="#sloganArc" startOffset="50%" text-anchor="middle">Enjoy Coffee Enjoy Vibes</textPath>
  </text>
  <g class="iced-cup-main" stroke-width="1.2">
    <ellipse class="lid-top" cx="50" cy="44" rx="20" ry="4" stroke-width="1.4"/>
    <path class="lid-detail" d="M34 44 C34 42 38 40 50 40 C62 40 66 42 66 44" stroke-width="0.8"/>
    <path class="lid-rim" d="M30 44 L30 48 C30 49 34 51 50 51 C66 51 70 49 70 48 L70 44" stroke-width="1.2"/>
    <path class="cup-body-slogan" d="M32 51 L38 88 C38 89 44 91 50 91 C56 91 62 89 62 88 L68 51" stroke-width="1.3"/>
    <path class="cup-base" d="M38 88 L38 92 C38 93 44 95 50 95 C56 95 62 93 62 92 L62 88" stroke-width="1.2"/>
    <g class="ice-cubes-cup" stroke-width="0.9">
      <path class="ice-1" d="M36 56 L38 60 L36 64 L34 60Z"/>
      <path class="ice-2" d="M46 58 L52 57 L54 62 L48 63Z"/>
      <path class="ice-3" d="M60 56 L66 55 L68 60 L62 62Z"/>
      <path class="ice-4" d="M52 64 L58 63 L60 68 L54 70Z"/>
      <path class="ice-5" d="M44 70 L48 68 L46 72Z"/>
      <path class="ice-6" d="M62 70 L66 72 L65 76 L62 74Z"/>
    </g>
    <g class="condensation-drops" stroke-width="0.6" opacity="0.7">
      <path d="M40 68 L39 71 M64 64 L65 68 M58 78 L58 82 M34 74 L34 76 M66 66 L66 68"/>
    </g>
  </g>
</svg>`.trim(),

  iced_cup_solo: `
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
  <g class="iced-cup-solo-main">
    <ellipse class="lid-top-solo" cx="50" cy="22" rx="22" ry="5" stroke-width="1.5"/>
    <ellipse class="lid-inner" cx="50" cy="22" rx="14" ry="2.2" stroke-width="0.8" opacity="0.8"/>
    <path class="lid-rim-solo" d="M28 22 L28 27 C28 28 34 30 50 30 C66 30 72 28 72 27 L72 22" stroke-width="1.3"/>
    <path class="lid-teeth" d="M30 24 L30 27 M34 24 L34 27 M38 24 L38 27 M42 24 L42 27 M46 24 L46 27 M50 24 L50 27 M54 24 L54 27 M58 24 L58 27 M62 24 L62 27 M66 24 L66 27 M70 24 L70 27" stroke-width="0.7" opacity="0.7"/>
    <path class="cup-liquid-line" d="M30 31 C30 32 36 35 50 35 C64 35 70 32 70 31" stroke-width="0.8" opacity="0.6"/>
    <path class="cup-body-solo" d="M30 32 L38 86 C38 87 43 89 50 89 C57 89 62 87 62 86 L70 32" stroke-width="1.3"/>
    <path class="cup-footer" d="M38 86 L38 91 C38 92 44 94 50 94 C56 94 62 92 62 91 L62 86" stroke-width="1.2"/>
    <path class="cup-base-line" d="M40 91 L40 94 C40 95 45 96 50 96 C55 96 60 95 60 94 L60 91" stroke-width="1"/>
    <g class="ice-cubes-solo" stroke-width="1">
      <path class="ice-solo-1" d="M34 38 L38 40 L36 48 L32 44Z"/>
      <path class="ice-solo-2" d="M44 42 L52 40 L54 46 L48 48Z"/>
      <path class="ice-solo-3" d="M60 38 L66 36 L69 44 L62 46Z"/>
      <path class="ice-solo-4" d="M50 50 L56 48 L58 56 L52 58Z"/>
      <path class="ice-solo-5" d="M68 50 L70 54 L68 58 L66 54Z"/>
      <path class="ice-solo-6" d="M40 52 L46 51 L46 57 L40 56Z"/>
      <path class="ice-solo-7" d="M38 62 L42 60 L40 66Z"/>
      <path class="ice-solo-8" d="M46 70 L52 70 L54 76 L48 77Z"/>
      <path class="ice-solo-9" d="M60 64 L64 62 L64 66Z"/>
    </g>
    <g class="drops-solo" opacity="0.7" stroke-width="0.7">
      <path class="droplet" d="M42 55 L41 58 M54 38 L55 40 M68 62 L69 66 M60 78 L60 82 M36 78 L37 80"/>
    </g>
  </g>
</svg>`.trim(),

  wavy_pattern: `
<svg viewBox="0 0 100 160" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="none">
  <rect width="100" height="160" fill="currentColor" opacity="0.04"/>
  <g class="wavy-group">
    <path class="wave wave-1" d="M-5 8 C10 0 22 4 28 12 C34 20 28 32 32 42 C36 52 50 62 66 62 C82 62 96 56 104 48" fill="none" stroke="currentColor" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>
    <path class="wave wave-2" d="M-5 36 C18 40 32 48 30 66 C28 84 18 94 28 110 C38 126 22 136 10 152" fill="none" stroke="currentColor" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>
    <path class="wave wave-3" d="M84 0 C78 14 78 30 90 38 C102 46 108 44 108 60 L108 64 C92 68 72 70 58 60 C44 50 40 30 34 12" fill="none" stroke="currentColor" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>
    <path class="wave wave-4" d="M40 0 C54 6 58 18 54 30 C50 42 40 50 44 64 C48 78 62 88 58 102 C54 116 42 124 34 138 C28 150 24 160 24 160" fill="none" stroke="currentColor" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>
    <path class="wave wave-5" d="M84 62 C70 68 54 64 52 78 C50 92 62 98 60 112 C58 126 42 134 32 148 L32 160" fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round" opacity="0.9"/>
    <path class="wave wave-6" d="M-5 78 C14 82 24 90 20 102 C16 114 2 120 10 138 L10 160" fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round" opacity="0.9"/>
    <path class="wave wave-7 blob" d="M-5 46 C8 48 16 62 16 74 C16 86 8 96 0 102Z" fill="currentColor" stroke="none"/>
    <path class="wave wave-8 blob" d="M92 68 C104 70 110 78 108 92 C106 106 96 112 84 116 C72 120 68 110 76 102 C84 94 92 88 92 68Z" fill="currentColor" stroke="none"/>
  </g>
  <circle class="wave-dot dot-1" cx="12" cy="6" r="4" fill="currentColor"/>
  <circle class="wave-dot dot-2" cx="96" cy="142" r="2" fill="currentColor" opacity="0.6"/>
</svg>`.trim()
};

export default KLEIV_DOODLES;
