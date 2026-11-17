/**
 * ============================================================================
 * KLEIV BRAND VECTOR ASSET SYSTEM
 * File: src/scripts/kleiv-svgs.js
 * 
 * High-Fidelity Vector Line Art & Dynamic SVG Architecture
 * - Standardized ViewBoxes for responsive canvas scaling
 * - Dynamic currentColor stroke/fill for Tailwind theme adaptability (#FCFCFC / #2C795D)
 * - Semantic layer grouping for GSAP / CSS micro-interactions & path morphs
 * - Hand-crafted cubic Bezier paths (C/S) faithfully traced from brand illustrations
 * ============================================================================
 */

export const KLEIV_SVGS = {
  // --------------------------------------------------------------------------
  // 1. INFINITY LOOP ('Enjoy Coffee Enjoy Vibes' Gestural Identity)
  // Multi-layered gestural ink ribbons, crossing loops, and sketch variations
  // --------------------------------------------------------------------------
  infinity_loop: `<svg viewBox="0 0 500 320" fill="none" xmlns="http://www.w3.org/2000/svg" class="kleiv-svg kleiv-infinity-loop" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
  <g class="infinity-shadow-ribbons" opacity="0.35" stroke-width="2">
    <path d="M125 78 C70 82 32 118 36 166 C40 216 85 244 142 240 C198 236 242 192 278 156 C314 120 362 80 412 84 C464 88 478 132 468 172 C458 214 414 246 364 242 C308 238 266 198 230 162 C196 128 152 74 125 78 Z"/>
    <path d="M148 92 C98 96 52 130 58 176 C64 220 106 236 150 230 C204 222 246 174 282 140 C322 102 366 90 404 94 C448 98 464 136 454 170 C442 208 402 234 354 232 C300 230 258 184 224 150 C194 120 174 90 148 92 Z"/>
  </g>
  <g class="infinity-main-strands" stroke-width="3.5">
    <!-- Primary Outer Figure-8 Flow -->
    <path d="M152 74 C96 76 42 108 40 160 C38 214 84 246 142 244 C198 242 238 202 274 166 C310 130 354 88 408 88 C462 88 482 126 476 168 C470 212 432 246 376 248 C320 250 278 208 242 172 C206 136 182 72 152 74 Z"/>
    <!-- Overlapping Gestural Flow Lines -->
    <path d="M136 82 C82 88 50 124 52 168 C54 212 94 238 144 236 C194 234 232 196 266 162 C302 126 348 96 398 96 C448 96 468 130 462 166 C454 206 420 238 368 238 C318 238 278 200 244 164 C208 126 172 78 136 82 Z"/>
    <path d="M166 94 C120 100 68 128 66 166 C64 204 98 226 140 226 C186 226 224 192 258 158 C294 122 340 104 388 104 C436 104 456 132 450 162 C444 196 414 226 366 226 C318 226 280 192 248 158 C216 124 194 90 166 94 Z"/>
    <path d="M182 108 C144 114 86 136 84 168 C82 196 108 218 144 218 C182 218 218 188 250 156 C284 122 330 112 376 112 C422 112 444 136 438 160 C432 188 406 216 364 216 C320 216 286 186 256 154 C224 120 206 104 182 108 Z"/>
    <!-- Left Loop Inner Ribbons & Hatching -->
    <path d="M120 114 C90 126 78 148 80 168 C82 188 98 204 124 204 C154 204 186 182 216 154 C184 126 150 108 120 114 Z"/>
    <path d="M102 134 C88 146 86 160 88 172 C90 186 104 196 122 194 C146 190 174 172 202 148 C166 130 130 126 102 134 Z"/>
    <!-- Right Loop Inner Ribbons & Hatching -->
    <path d="M380 114 C410 126 422 148 420 168 C418 188 402 204 376 204 C346 204 314 182 284 154 C316 126 350 108 380 114 Z"/>
    <path d="M398 134 C412 146 414 160 412 172 C410 186 396 196 378 194 C354 190 326 172 298 148 C334 130 370 126 398 134 Z"/>
  </g>
  <g class="infinity-sketch-accents" stroke-width="2.2" stroke-linecap="round">
    <!-- Center Crossing Hatch & Splinter Marks -->
    <path d="M232 176 L268 144"/>
    <path d="M224 164 L258 132"/>
    <path d="M242 188 L276 156"/>
    <path d="M214 152 C236 134 264 114 290 104"/>
    <path d="M210 168 C238 188 266 210 292 220"/>
    <!-- Stray Organic Brush Wisps -->
    <path d="M52 142 C48 158 50 178 56 192"/>
    <path d="M448 142 C452 158 450 178 444 192"/>
    <path d="M140 76 C164 74 194 88 218 108"/>
    <path d="M360 248 C334 250 306 236 282 216"/>
    <path d="M142 246 C166 244 192 230 216 212"/>
    <path d="M358 74 C332 76 304 92 282 110"/>
  </g>
</svg>`,

  // --------------------------------------------------------------------------
  // 2. MELTING ICE (3 Chilled Faceted Cubes on Liquid Spill)
  // Clean faceted 3D cubes, internal condensation droplets & fluid melt pool
  // --------------------------------------------------------------------------
  melting_ice: `<svg viewBox="0 0 500 500" fill="none" xmlns="http://www.w3.org/2000/svg" class="kleiv-svg kleiv-melting-ice" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
  <!-- Puddle & Spilled Liquid Ring -->
  <g class="melt-puddle" stroke-width="4.5">
    <path d="M72 418 C52 422 36 438 48 452 C60 466 102 468 144 460 C186 452 212 438 254 444 C296 450 334 466 384 464 C434 462 468 442 464 424 C460 406 422 396 386 400 C350 404 330 382 292 380 C254 378 234 398 202 398 C170 398 154 384 126 388 C98 392 84 416 72 418 Z"/>
    <path d="M120 440 C160 448 200 428 240 430" stroke-width="2.5" opacity="0.6"/>
    <path d="M320 446 C350 452 390 444 420 432" stroke-width="2.5" opacity="0.6"/>
    <!-- Stray Melt Droplets -->
    <path d="M68 378 C74 372 84 376 82 384 C80 392 70 392 66 386 C64 382 66 380 68 378 Z" stroke-width="2.5"/>
    <path d="M434 372 C440 368 448 372 446 378 C444 384 436 386 432 382 C430 378 432 374 434 372 Z" stroke-width="2.5"/>
  </g>

  <!-- Ice Cube 1: Top Center Cube (Tilted at 25°) -->
  <g class="cube-top" stroke-width="4.5">
    <!-- Top Face -->
    <path d="M228 106 L284 84 L334 116 L278 140 Z"/>
    <!-- Front Left Face -->
    <path d="M228 106 L278 140 L268 224 L212 184 Z"/>
    <!-- Front Right Face -->
    <path d="M278 140 L334 116 L324 198 L268 224 Z"/>
    <!-- Inner Condensation Beads & Droplets -->
    <path d="M246 142 C246 136 254 136 254 142 C254 150 246 158 246 166 C246 172 250 174 252 174" stroke-width="3"/>
    <path d="M294 156 C298 152 304 156 304 162 C304 174 296 182 298 194" stroke-width="3"/>
    <path d="M256 114 L296 98" stroke-width="2.5" opacity="0.7"/>
  </g>

  <!-- Ice Cube 2: Lower Left Cube -->
  <g class="cube-left" stroke-width="4.5">
    <!-- Top Face -->
    <path d="M148 214 L204 194 L252 216 L194 238 Z"/>
    <!-- Front Left Face -->
    <path d="M148 214 L194 238 L176 342 L128 312 Z"/>
    <!-- Front Right Face -->
    <path d="M194 238 L252 216 L238 318 L176 342 Z"/>
    <!-- Inner Tear Droplet & Dripping Details -->
    <path d="M168 262 C168 254 178 254 178 264 C178 276 170 286 170 298 C170 306 176 310 178 310" stroke-width="3.5"/>
    <path d="M214 248 C218 242 226 246 226 252 C226 266 218 276 218 290" stroke-width="3"/>
    <path d="M162 228 L196 214" stroke-width="2.5" opacity="0.7"/>
    <path d="M146 322 L164 334" stroke-width="3"/>
  </g>

  <!-- Ice Cube 3: Lower Right Cube -->
  <g class="cube-right" stroke-width="4.5">
    <!-- Top Face -->
    <path d="M308 206 L366 182 L414 212 L354 238 Z"/>
    <!-- Front Left Face -->
    <path d="M308 206 L354 238 L344 336 L296 298 Z"/>
    <!-- Front Right Face -->
    <path d="M354 238 L414 212 L402 308 L344 336 Z"/>
    <!-- Droplets & Highlights -->
    <path d="M332 254 C332 248 340 248 340 256 C340 268 332 278 334 292" stroke-width="3"/>
    <path d="M380 246 C384 240 392 244 392 250 C392 264 384 274 384 286" stroke-width="3.5"/>
    <path d="M328 218 L368 200" stroke-width="2.5" opacity="0.7"/>
    <path d="M362 316 C374 322 388 318 396 312" stroke-width="3"/>
  </g>
</svg>`,

  // --------------------------------------------------------------------------
  // 3. PERSON WITH BOX (Barista Tilting Back Carafe / Cold-Brew Box)
  // Dynamic 45-degree angle, dispenser box, flowing coffee stream & apron
  // --------------------------------------------------------------------------
  person_with_box: `<svg viewBox="0 0 500 500" fill="none" xmlns="http://www.w3.org/2000/svg" class="kleiv-svg kleiv-person-box" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
  <!-- Whimsical Spilled Liquid S-Trail on Floor -->
  <path class="floor-stream" d="M38 464 C64 456 82 472 108 472 C134 472 150 454 182 458 C214 462 238 480 274 476" stroke-width="4.5"/>

  <!-- Barista Head & Facial Contour (Tilted Back) -->
  <g class="barista-head" stroke-width="4.2">
    <!-- Puffy Tousled Hair -->
    <path d="M92 232 C74 236 58 224 52 208 C46 190 56 172 70 166 C68 152 74 138 88 132 C104 126 120 134 128 144 C138 136 154 136 166 144 C176 152 180 166 176 178 C188 186 192 202 186 216 C180 230 166 238 150 236 C144 248 130 256 114 254 C102 252 96 242 92 232 Z" fill="currentColor"/>
    <!-- Profile: Forehead, Nose, Lips & Open Jaw -->
    <path d="M142 182 C154 186 166 182 174 172 C180 166 186 168 190 176 L202 172 C208 170 214 176 210 184 L196 196 C190 202 188 210 196 214 C204 218 212 216 218 210 C222 218 220 228 210 234 L192 244 C182 250 176 260 176 272 L180 292"/>
    <!-- Closed Blissful Eye & Eyebrow -->
    <path d="M152 188 C158 184 166 186 170 192" stroke-width="3.5"/>
    <path d="M158 178 C166 176 174 178 178 182" stroke-width="3.2"/>
    <!-- Ear Contour -->
    <path d="M128 216 C124 212 126 202 134 200 C140 198 144 204 142 212 C140 220 134 224 128 216 Z"/>
  </g>

  <!-- Flowing Direct Coffee Pour Stream -->
  <g class="coffee-stream" stroke-width="4.5">
    <path d="M188 134 C192 144 196 160 198 172" stroke-width="5"/>
    <path d="M198 172 L196 196" stroke-width="4"/>
  </g>

  <!-- Coffee Dispenser Box (Cardboard/Keg Carrier) -->
  <g class="coffee-box" stroke-width="4.5">
    <!-- Main Box Body Form -->
    <path d="M174 68 L262 108 L222 186 L134 146 Z"/>
    <!-- Top Carry Handle -->
    <path d="M192 56 L158 40 C148 36 138 42 134 52 L128 66 L144 74 L148 64 C150 58 156 56 162 58 L188 70 Z"/>
    <!-- Front Face Slats / Corrugated Lines -->
    <path d="M172 88 L244 120" stroke-width="3"/>
    <path d="M162 104 L234 136" stroke-width="3"/>
    <path d="M152 120 L224 152" stroke-width="3"/>
    <path d="M142 136 L214 168" stroke-width="3"/>
    <!-- Dispenser Tap / Corner Spout -->
    <path d="M136 148 L124 154 L128 162 L140 156 Z"/>
  </g>

  <!-- Arms & Hands Gripping the Dispenser -->
  <g class="barista-arms" stroke-width="4.2">
    <!-- Top Hand & Articulated Fingers -->
    <path d="M228 92 C236 84 248 80 258 86 C264 90 262 100 254 104 L244 108"/>
    <path d="M246 88 L272 100 C278 104 276 112 268 116 L254 120"/>
    <path d="M248 106 L274 118 C280 122 278 130 270 134 L256 136"/>
    <path d="M246 124 L266 134 C272 138 270 146 262 148 L248 148"/>
    <!-- Wrist & Forearm (Upper) -->
    <path d="M256 108 L314 148 C324 156 328 168 326 180 L318 206"/>
    <!-- Rolled Up Sleeve Cuff -->
    <path d="M304 196 L332 216" stroke-width="4.5"/>
    <path d="M298 204 L326 224" stroke-width="4.5"/>
    <!-- Lower Hand Supporting Base -->
    <path d="M202 184 L228 196 C236 200 244 196 246 188 L250 178"/>
    <!-- Lower Arm & Sleeve -->
    <path d="M246 196 L292 236 C300 244 302 254 298 264 L288 282"/>
  </g>

  <!-- Torso & Barista Apron Silhouette -->
  <g class="barista-body" stroke-width="4.5">
    <!-- Neck Strap & Collar -->
    <path d="M208 244 L236 268"/>
    <path d="M192 270 L216 290"/>
    <!-- Apron Bib & Body -->
    <path d="M216 280 L354 394 C370 408 368 434 350 448 C332 462 306 460 290 446 L178 336 L216 280 Z"/>
    <!-- Back Tie & Apron Strings -->
    <path d="M298 382 C318 392 334 384 344 374" stroke-width="3.5"/>
  </g>
</svg>`,

  // --------------------------------------------------------------------------
  // 4. CROISSANT LOUNGER (Streetwear Guy Chilling in Pastry Beanbag)
  // Segmented flaky croissant folds, chill dude in hoodie/sneakers, rolling pin
  // --------------------------------------------------------------------------
  croissant_lounger: `<svg viewBox="0 0 500 500" fill="none" xmlns="http://www.w3.org/2000/svg" class="kleiv-svg kleiv-croissant-lounger" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
  <!-- Floating Rolling Pin (Upper Left at -30°) -->
  <g class="rolling-pin" stroke-width="4">
    <!-- Left Handle -->
    <path d="M42 204 C34 200 32 190 38 184 C44 178 54 180 58 188 L74 196"/>
    <!-- Main Roller Body -->
    <path d="M72 192 L146 148 C152 144 160 148 164 156 L180 182 C184 190 180 198 172 202 L98 246 C90 250 82 246 78 238 L62 212 C58 204 62 196 72 192 Z"/>
    <!-- Roller Ring Ribs / Grooves -->
    <path d="M86 184 L102 210" stroke-width="3"/>
    <path d="M98 176 L114 202" stroke-width="3"/>
    <path d="M110 168 L126 194" stroke-width="3"/>
    <path d="M122 160 L138 186" stroke-width="3"/>
    <path d="M134 152 L150 178" stroke-width="3"/>
    <path d="M146 146 L162 172" stroke-width="3"/>
    <!-- Right Handle -->
    <path d="M174 168 L188 160 C196 156 206 158 208 166 C210 174 204 182 196 186 L182 194"/>
  </g>

  <!-- Puffy Segmented Croissant Lounger (7 Overlapping Crescent Bulges) -->
  <g class="croissant-body" stroke-width="4.5">
    <!-- Segment 1: Left Tail Tip -->
    <path d="M118 328 C92 342 90 376 112 394 C134 412 168 406 182 384"/>
    <!-- Segment 2: Left Mid Swell -->
    <path d="M138 304 C112 322 114 364 142 388 C170 412 212 408 232 376"/>
    <!-- Segment 3: Outer Backrest Arch (Top Left) -->
    <path d="M182 254 C148 266 146 320 178 356 C210 392 262 396 288 354"/>
    <!-- Segment 4: High Crest Segment -->
    <path d="M228 224 C204 236 198 288 234 336 C270 384 326 386 352 334"/>
    <!-- Segment 5: Center-Right Bulge -->
    <path d="M282 222 C266 238 260 292 296 342 C332 392 386 384 408 328"/>
    <!-- Segment 6: Right Outer Swell -->
    <path d="M344 262 C338 284 336 332 372 368 C408 404 444 382 448 334"/>
    <!-- Segment 7: Right Under-Tail -->
    <path d="M388 336 C398 360 416 380 440 378 C464 376 468 354 456 332"/>
    <!-- Pastry Lamination Flake Creases -->
    <path d="M148 348 C162 364 182 372 204 370" stroke-width="3" opacity="0.75"/>
    <path d="M198 316 C216 338 238 350 264 348" stroke-width="3" opacity="0.75"/>
    <path d="M254 300 C274 324 298 338 326 332" stroke-width="3" opacity="0.75"/>
    <path d="M312 308 C332 332 354 342 380 336" stroke-width="3" opacity="0.75"/>
  </g>

  <!-- Lounger Guy: Reclining Relaxed Posture -->
  <g class="lounger-guy" stroke-width="4.2">
    <!-- Tousled Curly Hair & Head -->
    <path d="M258 84 C248 82 240 88 238 96 C232 94 224 98 222 106 C220 114 224 122 232 124 C230 134 238 142 248 142 C258 142 266 136 268 128 C276 128 282 120 280 112 C282 102 274 94 266 94 C266 88 262 84 258 84 Z" fill="currentColor"/>
    <!-- Face Contour, Chin & Confident Smile -->
    <path d="M252 118 C256 126 262 130 270 128 C276 126 280 120 278 112"/>
    <path d="M264 122 C268 124 272 122 274 120" stroke-width="3"/>
    <!-- Trendy Sunglasses -->
    <path d="M256 108 L266 106 L276 110" stroke-width="4.5"/>
    <rect x="254" y="106" width="10" height="7" rx="2" fill="currentColor"/>
    <rect x="268" y="107" width="10" height="7" rx="2" fill="currentColor"/>

    <!-- Left Arm Resting Behind Head -->
    <path d="M280 134 C296 132 316 142 328 158 C338 172 334 188 322 198 L296 214"/>
    <path d="M282 112 C294 114 306 124 308 138" stroke-width="3.5"/>

    <!-- Oversized Hoodie & Torso -->
    <path d="M244 146 C228 152 216 164 212 180 L204 204 C198 224 210 244 230 250 L288 266"/>
    <!-- Hood Cowl & Drawstrings -->
    <path d="M236 142 C248 156 272 156 284 144" stroke-width="4.5"/>
    <path d="M252 154 L250 186" stroke-width="3.2"/>
    <path d="M264 154 L266 182" stroke-width="3.2"/>

    <!-- Right Arm Lounging Across Pastry -->
    <path d="M214 186 C194 192 182 206 180 226 C178 244 190 262 208 268 L244 278"/>
    <!-- Relaxed Hand -->
    <path d="M244 278 C250 284 258 286 264 282 C270 278 270 270 264 266 Z"/>

    <!-- Loose Casual Pants (Folded Leg & Extended Leg) -->
    <!-- Extended Right Leg -->
    <path d="M288 264 L362 212 C376 202 396 206 406 220 L442 274 C448 284 444 298 434 306 L414 322"/>
    <path d="M348 268 L390 326" stroke-width="4.2"/>
    <!-- Bent Left Leg (Crossing Forward) -->
    <path d="M268 282 L298 344 C304 358 318 368 334 366 L376 362"/>
    <path d="M252 284 L276 364 L318 382" stroke-width="4.2"/>
  </g>

  <!-- Detailed Streetwear Sneakers -->
  <g class="sneakers" stroke-width="3.8">
    <!-- Raised Foot Sneaker (Right) -->
    <g class="sneaker-raised">
      <path d="M434 272 L454 260 C464 254 476 258 482 268 L490 282 C494 290 492 300 484 306 L446 332 C438 338 426 334 422 324 L416 310"/>
      <!-- Thick Sole & Tread -->
      <path d="M448 330 L486 304" stroke-width="5"/>
      <path d="M452 338 L492 310" stroke-width="3"/>
      <!-- Laces & Tongue -->
      <path d="M446 278 L458 294"/>
      <path d="M454 272 L466 288"/>
      <path d="M462 266 L474 282"/>
    </g>
    <!-- Lower Resting Sneaker (Left) -->
    <g class="sneaker-resting">
      <path d="M364 364 L378 354 C386 348 398 352 402 360 L416 388 C418 394 416 402 410 406 L374 424 C366 428 356 424 352 416 L346 394"/>
      <!-- Sole & Lines -->
      <path d="M374 424 L414 404" stroke-width="5"/>
      <path d="M370 432 L418 410" stroke-width="3"/>
      <path d="M372 374 L388 386"/>
      <path d="M378 366 L394 378"/>
    </g>
  </g>

  <!-- Floating Iced Drink at Bottom Left -->
  <g class="drink-float" stroke-width="3.5">
    <path d="M128 442 L136 480 C138 486 144 490 150 490 L176 490 C182 490 188 486 190 480 L198 442 Z"/>
    <path d="M122 442 L204 442" stroke-width="4.5"/>
    <path d="M158 442 L148 414" stroke-width="4"/>
  </g>
</svg>`,

  // --------------------------------------------------------------------------
  // 5. BARISTA CRAFT (Full Specialty Coffee Bar & Equipment)
  // Espresso machine, barista with beanie pouring latte art, grinder, steam plume
  // --------------------------------------------------------------------------
  barista_craft: `<svg viewBox="0 0 650 420" fill="none" xmlns="http://www.w3.org/2000/svg" class="kleiv-svg kleiv-barista-craft" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
  <!-- Bar Counter Base & Horizon Grounding Line -->
  <line x1="20" y1="388" x2="630" y2="388" stroke-width="5"/>
  <line x1="45" y1="400" x2="160" y2="400" stroke-width="3" opacity="0.6"/>
  <line x1="480" y1="400" x2="610" y2="400" stroke-width="3" opacity="0.6"/>

  <!-- Commercial Multi-Group Espresso Machine (Left) -->
  <g class="espresso-machine" stroke-width="4.2">
    <!-- Machine Base Stand Legs -->
    <path d="M60 356 L60 388"/>
    <path d="M72 356 L72 388"/>
    <path d="M244 356 L244 388"/>
    <path d="M256 356 L256 388"/>
    <!-- Machine Main Body Box -->
    <path d="M48 238 C48 230 54 224 62 224 L258 224 C266 224 272 230 272 238 L278 316 C278 324 272 330 264 330 L56 330 C48 330 42 324 42 316 Z"/>
    <!-- Lower Drip Tray Assembly -->
    <path d="M44 330 L44 356 L276 356 L276 330 Z"/>
    <line x1="56" y1="344" x2="264" y2="344" stroke-width="3"/>
    <!-- Dual Group Heads & Portafilters -->
    <path d="M102 330 L102 316 L124 316 L124 330"/>
    <path d="M124 322 L152 326" stroke-width="4.5"/>
    <path d="M192 330 L192 316 L214 316 L214 330"/>
    <path d="M214 322 L242 326" stroke-width="4.5"/>
    <!-- Pressure Gauges & Valve Dials -->
    <circle cx="82" cy="276" r="10" stroke-width="3.5"/>
    <path d="M82 276 L86 272" stroke-width="2.5"/>
    <circle cx="238" cy="276" r="10" stroke-width="3.5"/>
    <path d="M238 276 L242 272" stroke-width="2.5"/>
    <!-- Top Cup Warming Rail & Stacked Paper Cups -->
    <path d="M54 224 L54 212 L266 212 L266 224"/>
    <!-- Stack of Takeaway Cups (Left) -->
    <path d="M88 212 L92 164 L118 164 L122 212 Z" stroke-width="3.5"/>
    <path d="M90 178 L120 178" stroke-width="2.5"/>
    <path d="M91 194 L119 194" stroke-width="2.5"/>
    <circle cx="105" cy="186" r="4" fill="currentColor"/>
    <!-- Stack of Takeaway Cups (Right) -->
    <path d="M128 212 L132 168 L154 168 L158 212 Z" stroke-width="3.5"/>
    <path d="M130 182 L156 182" stroke-width="2.5"/>
    <path d="M131 196 L155 196" stroke-width="2.5"/>
    <circle cx="143" cy="189" r="4" fill="currentColor"/>
    <!-- Heavy Tamper on Stand -->
    <path d="M66 212 L66 196 C66 188 74 188 74 196 L74 212 Z"/>
    <circle cx="70" cy="184" r="7" stroke-width="3.2"/>
    <!-- Steam Wand Swivel -->
    <path d="M268 280 C276 284 284 294 280 308 L274 324" stroke-width="4"/>
  </g>

  <!-- Spectacular Ascending Steam Plume -->
  <g class="steam-plume" stroke-width="4.2">
    <path d="M386 270 C374 246 352 234 340 206 C326 172 342 142 364 126 C390 108 412 120 422 96 C432 74 416 48 388 40 C356 32 334 52 328 72 C320 96 334 116 318 142 C304 164 278 182 258 198 C242 210 236 220 240 230" stroke-linecap="round"/>
  </g>

  <!-- The Barista: Focused Artisan Pouring Microfoam -->
  <g class="barista" stroke-width="4.2">
    <!-- Knit Beanie / Watch Cap -->
    <path d="M372 136 C370 114 382 98 404 96 C426 94 440 108 442 132 Z"/>
    <path d="M366 136 L446 132" stroke-width="4.8"/>
    <!-- Flowing Wavy Hair Locks -->
    <path d="M370 138 C364 152 358 170 366 188 C372 200 378 214 374 228"/>
    <path d="M442 136 C448 150 456 168 450 186 C444 202 448 218 456 226"/>
    <!-- Focused Facial Profile (Looking Down) -->
    <path d="M386 142 C390 152 396 158 402 162 L402 170 C398 174 394 176 390 176"/>
    <path d="M394 154 L400 156" stroke-width="3"/>

    <!-- Upper Body, Apron & Rolled Sleeves -->
    <path d="M364 212 C342 224 326 244 316 266 C308 284 314 300 326 308 L348 316"/>
    <path d="M448 212 C468 226 484 246 492 270 C498 288 490 304 476 312 L454 316"/>
    <!-- Apron Bib & Straps -->
    <path d="M382 216 L432 212"/>
    <path d="M374 228 L370 388"/>
    <path d="M442 226 L448 388"/>
    <!-- Apron Chest Pocket -->
    <rect x="394" y="244" width="26" height="28" rx="2" stroke-width="3"/>
    <line x1="402" y1="244" x2="402" y2="256" stroke-width="3"/>

    <!-- Left Hand Holding Ceramic Cup -->
    <path d="M394 286 C384 286 376 294 378 304 C380 312 390 316 400 314 L416 308 C424 306 426 298 422 292 Z"/>
    <!-- Ceramic Cappuccino Cup -->
    <path d="M380 292 C380 312 402 316 414 310 C422 306 422 296 418 290 Z"/>
    <path d="M418 294 C426 294 430 300 426 306" stroke-width="3"/>

    <!-- Right Arm & Hand Pouring Latte Art Pitcher -->
    <path d="M326 308 L348 296 C354 292 362 294 366 300 L370 304"/>
    <!-- Stainless Steel Milk Pitcher -->
    <path d="M346 270 L372 254 C378 250 386 254 388 262 L394 282 C396 290 390 298 382 300 L358 304 C350 306 342 300 340 292 Z"/>
    <path d="M344 274 C336 276 332 284 336 292 C338 296 344 298 348 296" stroke-width="3.5"/>
    <!-- Microfoam Pour Stream into Cup -->
    <path d="M390 274 C394 280 396 288 398 296" stroke-width="3.8"/>
  </g>

  <!-- Foreground Artisan Counter Accessories -->
  <g class="counter-items" stroke-width="4">
    <!-- Takeaway Kraft Bag with Round Kleiv Sticker -->
    <path d="M288 334 L298 388 L344 388 L352 334 Z"/>
    <path d="M298 334 L318 316 L342 334"/>
    <circle cx="320" cy="358" r="7" fill="currentColor"/>
    <!-- Milk / Oat Beverage Carton -->
    <path d="M352 328 L352 388 L380 388 L380 328 L366 314 Z" stroke-width="3.8"/>
    <!-- Glass Tumbler with Paper Straws -->
    <path d="M390 344 L392 388 L416 388 L418 344 Z" stroke-width="3.5"/>
    <line x1="396" y1="344" x2="394" y2="322" stroke-width="3"/>
    <line x1="404" y1="344" x2="406" y2="318" stroke-width="3"/>
    <line x1="412" y1="344" x2="416" y2="324" stroke-width="3"/>
    <!-- Potted Cafe Succulent / Plant -->
    <path d="M462 358 L466 388 L498 388 L502 358 Z" stroke-width="3.8"/>
    <!-- Plant Leaves -->
    <path d="M464 354 C454 346 452 334 462 328 C472 322 480 334 474 346" stroke-width="3"/>
    <path d="M482 352 C486 340 496 332 506 336 C514 342 510 354 498 356" stroke-width="3"/>
    <path d="M474 342 C476 330 484 322 492 324 C498 328 496 338 488 344" stroke-width="3"/>
  </g>

  <!-- Specialty Coffee Grinder (Right) -->
  <g class="coffee-grinder" stroke-width="4.2">
    <!-- Transparent Bean Hopper -->
    <path d="M518 178 L534 266 C536 274 544 280 552 280 L576 280 C584 280 592 274 594 266 L610 178 Z"/>
    <!-- Hopper Top Lid -->
    <ellipse cx="564" cy="176" rx="46" ry="10"/>
    <line x1="538" y1="210" x2="590" y2="210" stroke-width="2.8" opacity="0.6"/>
    <!-- Stepped Collar & Grind Adjustment Dial -->
    <rect x="542" y="280" width="44" height="22" rx="3"/>
    <line x1="550" y1="290" x2="578" y2="290" stroke-width="3"/>
    <!-- Motor Housing & Spout -->
    <path d="M532 302 L532 348 C532 354 538 360 546 360 L582 360 C590 360 596 354 596 348 L596 302 Z"/>
    <!-- Discharge Chute & Portafilter Fork -->
    <path d="M544 324 L536 332 L536 346 L546 342"/>
    <!-- Heavy Weighted Counter Base with Power Switch -->
    <path d="M526 360 L526 388 L602 388 L602 360 Z"/>
    <rect x="584" y="368" width="8" height="10" rx="1" stroke-width="2.5"/>
  </g>
</svg>`,

  // --------------------------------------------------------------------------
  // 6. BALANCE GIRL (Organic Messy Hair, Balanced Cup, Serene Expression)
  // Expressive textured hair, delicate hand grip, iced cup perched on head
  // --------------------------------------------------------------------------
  balance_girl: `<svg viewBox="0 0 500 500" fill="none" xmlns="http://www.w3.org/2000/svg" class="kleiv-svg kleiv-balance-girl" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
  <!-- Balanced Iced Coffee Cup on Head -->
  <g class="balanced-cup" stroke-width="4.5">
    <!-- Cup Body Resting on Crown -->
    <path d="M236 60 L240 128 C240 132 246 136 252 136 L278 136 C284 136 290 132 290 128 L294 60 Z"/>
    <!-- Snap Rim & Flat Lid -->
    <path d="M228 60 L302 60" stroke-width="5.5"/>
    <path d="M234 52 L296 52" stroke-width="4"/>
    <!-- Angled Drinking Straw -->
    <path d="M256 52 L244 18" stroke-width="4.8"/>
    <!-- Beverage Liquid Line & Ice Facet -->
    <path d="M240 84 C256 86 274 82 290 86" stroke-width="3.5"/>
    <path d="M252 98 L266 92 L274 104 L260 110 Z" stroke-width="3"/>
  </g>

  <!-- Left Arm Reaching Up & Delicately Balancing the Cup -->
  <g class="arm-hand" stroke-width="4.2">
    <!-- Fingers Wrapping Around Upper Cup Rim -->
    <path d="M222 70 C222 62 232 58 240 64 C248 70 248 80 238 84"/>
    <path d="M228 84 C236 84 242 88 240 96 C238 104 228 106 222 98"/>
    <path d="M226 98 C232 98 238 104 236 112 C234 118 226 120 220 114"/>
    <path d="M222 116 C228 116 232 122 230 128 C228 134 220 136 216 130"/>
    <!-- Wrist & Forearm (Angled Upward) -->
    <path d="M222 74 L196 150 C192 162 184 172 174 178 L98 224"/>
    <!-- Lower Forearm & Elbow Joint -->
    <path d="M214 134 L180 186 C172 198 160 206 146 210 L78 232"/>
    <!-- Sleeve Cuff at Shoulder/Bicep -->
    <path d="M68 230 C58 250 54 280 52 312" stroke-width="4.5"/>
    <path d="M96 226 L88 288" stroke-width="4.5"/>
    <path d="M52 312 C64 316 78 304 88 288" stroke-width="4.5"/>
  </g>

  <!-- Voluminous Organic Messy Hair Silhouette -->
  <g class="hair" stroke-width="4">
    <!-- Outer Hair Silhouette Waves -->
    <path d="M236 136 C220 138 206 148 198 162 C186 182 188 206 178 228 C168 250 152 268 152 294 C152 322 174 344 196 358 C202 362 210 360 216 354 C222 344 220 332 214 322 C206 308 206 290 216 278 C222 268 234 262 242 254" fill="currentColor"/>
    <!-- Right Cascading Hair Silhouette -->
    <path d="M288 136 C314 140 336 154 348 176 C362 202 358 234 366 262 C374 290 392 314 388 344 C386 364 372 382 352 388 C342 390 332 382 334 372 C336 358 348 346 348 332 C348 314 336 298 332 282 C328 266 332 250 326 236" fill="currentColor"/>
    <!-- Inner Textured Hair Strands & Bangs Framing Forehead -->
    <path d="M232 168 C242 162 254 168 260 178 C266 186 274 186 280 180 C288 172 298 174 304 184" stroke-width="3.5"/>
    <path d="M228 190 C238 184 250 192 252 204" stroke-width="3"/>
    <path d="M298 188 C306 196 312 210 310 224" stroke-width="3"/>
    <path d="M214 228 C218 244 224 258 236 268" stroke-width="3"/>
  </g>

  <!-- Serene Facial Features & Profile -->
  <g class="face-features" stroke-width="3.8">
    <!-- Profile Contour: Jaw, Cheek & Neck -->
    <path d="M246 214 C244 236 250 256 266 268 C280 280 300 278 312 264 C322 252 324 236 322 218"/>
    <!-- Elegant Closed Eye & Curved Lash -->
    <path d="M290 218 C296 224 306 224 312 218" stroke-width="3.5"/>
    <path d="M288 208 C298 204 310 206 316 212" stroke-width="3"/>
    <!-- Nose Contour -->
    <path d="M282 210 L278 228 L286 230" stroke-width="3.2"/>
    <!-- Calm Relaxed Lips -->
    <path d="M286 252 C294 256 304 254 308 248" stroke-width="3.2"/>
    <!-- Slender Neck Contour -->
    <path d="M260 274 L258 318"/>
    <path d="M306 272 L314 318"/>
  </g>

  <!-- Scoop-Neck T-Shirt & Torso -->
  <g class="clothing" stroke-width="4.5">
    <!-- Scoop Neckline Collar -->
    <path d="M256 318 C272 344 300 344 316 318" stroke-width="4.8"/>
    <!-- Left Shoulder & Body Contour -->
    <path d="M96 226 C124 232 168 252 212 284 L256 318"/>
    <path d="M212 284 L188 472"/>
    <!-- Right Shoulder & Drop Sleeve -->
    <path d="M316 318 C342 322 384 336 414 358 L428 382"/>
    <path d="M428 382 L422 472"/>
    <!-- Right Sleeve Cuff -->
    <path d="M414 358 L448 424 C450 430 446 438 438 440 L408 444"/>
    <path d="M362 472 L364 424" stroke-width="3.5"/>
  </g>
</svg>`,

  // --------------------------------------------------------------------------
  // 7. ICED CUP WITH SLOGAN ('Enjoy Coffee Enjoy Vibes')
  // Precise typography curved along upper trajectory + high-fidelity cold cup
  // --------------------------------------------------------------------------
  iced_cup_with_slogan: `<svg viewBox="0 0 500 550" fill="none" xmlns="http://www.w3.org/2000/svg" class="kleiv-svg kleiv-cup-slogan" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
  <defs>
    <!-- Elliptical Path for Upper Curved Slogan Trajectory -->
    <path id="kleiv-slogan-curve" d="M 52 232 C 78 104 200 48 250 48 C 300 48 422 104 448 232" fill="none"/>
  </defs>

  <!-- Upper Slogan Text -->
  <text class="kleiv-slogan-text" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif" font-weight="800" font-size="34" letter-spacing="3.5" fill="currentColor" stroke="none">
    <textPath href="#kleiv-slogan-curve" startOffset="50%" text-anchor="middle">
      Enjoy Coffee Enjoy Vibes
    </textPath>
  </text>

  <!-- Complete Standalone Cold Cup Assembly -->
  <g class="cold-cup-assembly" transform="translate(0, 30)">
    <!-- Flat/Dome Flanged Lid -->
    <g class="cup-lid" stroke-width="4.2">
      <!-- Top Center Recess Slot -->
      <ellipse cx="250" cy="172" rx="76" ry="16" stroke-width="3.5"/>
      <ellipse cx="250" cy="172" rx="42" ry="8" stroke-width="2.5"/>
      <!-- Stepped Outer Rim Layers -->
      <path d="M164 176 C164 162 202 154 250 154 C298 154 336 162 336 176" stroke-width="4"/>
      <path d="M152 186 C152 170 196 162 250 162 C304 162 348 170 348 186" stroke-width="4.5"/>
      <!-- Flanged Snap Lip & Vertical Notched Ridge Ribs -->
      <path d="M144 196 C144 182 192 174 250 174 C308 174 356 182 356 196 L352 206 C352 218 306 226 250 226 C194 226 148 218 148 206 Z" stroke-width="4.5"/>
      <!-- Vertical Pleat Indentations around Rim -->
      <path d="M168 196 L168 206" stroke-width="2.5"/>
      <path d="M184 198 L184 208" stroke-width="2.5"/>
      <path d="M200 200 L200 210" stroke-width="2.5"/>
      <path d="M216 202 L216 212" stroke-width="2.5"/>
      <path d="M232 203 L232 213" stroke-width="2.5"/>
      <path d="M248 204 L248 214" stroke-width="2.5"/>
      <path d="M264 203 L264 213" stroke-width="2.5"/>
      <path d="M280 202 L280 212" stroke-width="2.5"/>
      <path d="M296 200 L296 210" stroke-width="2.5"/>
      <path d="M312 198 L312 208" stroke-width="2.5"/>
      <path d="M328 196 L328 206" stroke-width="2.5"/>
    </g>

    <!-- Clear Cup Tapered Body & Double Ring Base -->
    <g class="cup-body" stroke-width="4.5">
      <!-- Left & Right Tapered Walls -->
      <path d="M158 210 L188 472 C190 484 204 492 220 492 L280 492 C296 492 310 484 312 472 L342 210"/>
      <!-- Base Ring Contour -->
      <path d="M188 472 C194 484 220 490 250 490 C280 490 306 484 312 472" stroke-width="4"/>
      <path d="M194 484 L306 484" stroke-width="2.8"/>
    </g>

    <!-- Liquid Meniscus Line & Crema Waves -->
    <path class="liquid-line" d="M162 224 C178 238 200 220 220 234 C240 248 260 228 280 236 C300 244 322 226 338 230" stroke-width="3.8"/>

    <!-- Floating 3D Isometric Ice Cubes -->
    <g class="ice-cubes" stroke-width="3.2">
      <!-- Cube Top Left -->
      <path d="M188 252 L212 240 L230 254 L206 266 Z"/>
      <path d="M188 252 L206 266 L202 292 L184 278 Z"/>
      <path d="M206 266 L230 254 L226 280 L202 292 Z"/>
      <!-- Cube Center Top -->
      <path d="M236 244 L258 236 L274 248 L252 256 Z"/>
      <path d="M236 244 L252 256 L248 274 L232 262 Z"/>
      <!-- Cube Center Right -->
      <path d="M282 252 L312 242 L328 260 L298 270 Z"/>
      <path d="M282 252 L298 270 L294 298 L278 280 Z"/>
      <path d="M298 270 L328 260 L324 288 L294 298 Z"/>
      <!-- Cube Mid-Depth (Tumbling Center) -->
      <path d="M224 304 L248 296 L262 312 L238 320 Z"/>
      <path d="M224 304 L238 320 L234 340 L220 324 Z"/>
      <!-- Cube Lower Right -->
      <path d="M246 384 L276 372 L294 390 L264 402 Z"/>
      <path d="M246 384 L264 402 L258 430 L240 412 Z"/>
      <path d="M264 402 L294 390 L288 418 L258 430 Z"/>
    </g>

    <!-- Exterior Condensation Beads & Trickling Drips -->
    <g class="condensation-drips" stroke-width="2.4">
      <path d="M174 280 C174 274 180 274 180 280 C180 290 174 298 174 308"/>
      <path d="M182 344 C182 338 188 338 188 344 C188 356 182 366 182 380"/>
      <path d="M324 290 C324 284 330 284 330 290 C330 302 324 314 324 328"/>
      <path d="M316 362 C316 356 322 356 322 362 C322 374 316 384 316 398"/>
      <!-- Tiny Circular Surface Droplets -->
      <circle cx="186" cy="320" r="2.5" fill="currentColor"/>
      <circle cx="196" cy="368" r="2" fill="currentColor"/>
      <circle cx="212" cy="420" r="2.5" fill="currentColor"/>
      <circle cx="282" cy="340" r="2" fill="currentColor"/>
      <circle cx="304" cy="348" r="2.5" fill="currentColor"/>
      <circle cx="320" cy="428" r="2" fill="currentColor"/>
      <circle cx="228" cy="454" r="2" fill="currentColor"/>
    </g>
  </g>
</svg>`,

  // --------------------------------------------------------------------------
  // 8. ICED CUP SOLO (Standalone Iced Coffee Cold Cup)
  // Transparent ribbed cold cup, detailed ice refraction, condensation perspiration
  // --------------------------------------------------------------------------
  iced_cup_solo: `<svg viewBox="0 0 500 500" fill="none" xmlns="http://www.w3.org/2000/svg" class="kleiv-svg kleiv-cup-solo" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
  <!-- Cold Cup Lid & Double Flange -->
  <g class="cup-lid" stroke-width="4.5">
    <!-- Top Center Recess Slot -->
    <ellipse cx="250" cy="88" rx="88" ry="18" stroke-width="3.8"/>
    <ellipse cx="250" cy="88" rx="48" ry="9" stroke-width="2.8"/>
    <!-- Dome Stepped Levels -->
    <path d="M148 94 C148 78 194 68 250 68 C306 68 352 78 352 94" stroke-width="4.2"/>
    <path d="M136 106 C136 88 186 78 250 78 C314 78 364 88 364 106" stroke-width="4.8"/>
    <!-- Locking Lip Band with Notched Flutes -->
    <path d="M128 118 C128 102 182 92 250 92 C318 92 372 102 372 118 L368 130 C368 144 316 154 250 154 C184 154 132 144 132 130 Z" stroke-width="5"/>
    <!-- Vertical Pleat Indentations -->
    <path d="M152 118 L152 130" stroke-width="2.8"/>
    <path d="M172 120 L172 132" stroke-width="2.8"/>
    <path d="M192 122 L192 134" stroke-width="2.8"/>
    <path d="M212 124 L212 136" stroke-width="2.8"/>
    <path d="M232 125 L232 137" stroke-width="2.8"/>
    <path d="M250 126 L250 138" stroke-width="2.8"/>
    <path d="M268 125 L268 137" stroke-width="2.8"/>
    <path d="M288 124 L288 136" stroke-width="2.8"/>
    <path d="M308 122 L308 134" stroke-width="2.8"/>
    <path d="M328 120 L328 132" stroke-width="2.8"/>
    <path d="M348 118 L348 130" stroke-width="2.8"/>
  </g>

  <!-- Cup Wall Taper & Heavy Base -->
  <g class="cup-body" stroke-width="5">
    <path d="M144 134 L178 440 C180 454 196 464 214 464 L286 464 C304 464 320 454 322 440 L356 134"/>
    <!-- Bottom Double Rim Base -->
    <path d="M178 440 C186 454 216 462 250 462 C284 462 314 454 322 440" stroke-width="4.2"/>
    <path d="M184 454 L316 454" stroke-width="3"/>
  </g>

  <!-- Wavy Coffee/Liquid Crema Meniscus -->
  <path class="liquid-line" d="M148 152 C168 168 192 148 216 164 C240 180 264 158 288 168 C312 178 334 156 352 162" stroke-width="4.2"/>

  <!-- Detailed Tumbling Ice Cubes with Droplets -->
  <g class="ice-cubes" stroke-width="3.5">
    <!-- Top-Left Floating Cube -->
    <path d="M178 186 L208 170 L230 188 L200 204 Z"/>
    <path d="M178 186 L200 204 L196 236 L174 218 Z"/>
    <path d="M200 204 L230 188 L226 220 L196 236 Z"/>
    <!-- Center-Top Cube -->
    <path d="M234 176 L262 166 L282 180 L254 190 Z"/>
    <path d="M234 176 L254 190 L248 212 L228 198 Z"/>
    <!-- Top-Right Cube -->
    <path d="M288 184 L324 172 L344 194 L308 206 Z"/>
    <path d="M288 184 L308 206 L302 240 L282 218 Z"/>
    <path d="M308 206 L344 194 L338 228 L302 240 Z"/>
    <!-- Center Submerged Cube -->
    <path d="M218 248 L248 238 L264 256 L234 266 Z"/>
    <path d="M218 248 L234 266 L230 290 L214 272 Z"/>
    <!-- Lower Right Deep Cube -->
    <path d="M246 344 L282 328 L304 350 L268 366 Z"/>
    <path d="M246 344 L268 366 L262 400 L240 378 Z"/>
    <path d="M268 366 L304 350 L298 384 L262 400 Z"/>
  </g>

  <!-- Perspiration Condensation Droplets Running Down Plastic -->
  <g class="condensation-drips" stroke-width="2.6">
    <path d="M162 218 C162 210 170 210 170 218 C170 232 162 244 162 258"/>
    <path d="M172 296 C172 288 180 288 180 296 C180 312 172 326 172 342"/>
    <path d="M338 232 C338 224 346 224 346 232 C346 248 338 262 338 278"/>
    <path d="M328 316 C328 308 336 308 336 316 C336 332 328 346 328 362"/>
    <!-- Tiny Spherical Surface Droplets -->
    <circle cx="176" cy="272" r="3" fill="currentColor"/>
    <circle cx="188" cy="326" r="2.5" fill="currentColor"/>
    <circle cx="206" cy="386" r="3" fill="currentColor"/>
    <circle cx="292" cy="292" r="2.5" fill="currentColor"/>
    <circle cx="316" cy="304" r="3" fill="currentColor"/>
    <circle cx="332" cy="396" r="2.5" fill="currentColor"/>
    <circle cx="224" cy="424" r="2.5" fill="currentColor"/>
  </g>
</svg>`,

  // --------------------------------------------------------------------------
  // 9. ORGANIC WAVY PATTERN (Fluid Marble / Latte Art Swirl Texture)
  // Continuous undulating liquid ribbons and amoeboid fluid geometry
  // --------------------------------------------------------------------------
  organic_wavy_pattern: `<svg viewBox="0 0 500 500" fill="none" xmlns="http://www.w3.org/2000/svg" class="kleiv-svg kleiv-wavy-pattern">
  <!-- Amoeboid Floating Drop (Top Left) -->
  <path d="M46 12 C58 12 68 24 68 40 C68 56 56 66 44 66 C32 66 22 54 22 38 C22 22 34 12 46 12 Z" fill="currentColor"/>

  <!-- Fluid Ribbon Layer 1: Left Wall Undulation -->
  <path d="M0 0 C40 20 80 60 70 120 C60 180 0 200 0 260 C0 320 80 340 70 420 C64 468 36 490 0 500 L0 0 Z" fill="currentColor"/>

  <!-- Fluid Ribbon Layer 2: Main Sweeping Wave -->
  <path d="M120 0 C180 40 240 100 210 180 C180 260 80 280 80 350 C80 420 180 440 210 500 L160 500 C130 450 40 420 40 340 C40 260 140 230 170 160 C200 90 140 40 80 0 L120 0 Z" fill="currentColor"/>

  <!-- Fluid Ribbon Layer 3: Central Latte Swirl Stream -->
  <path d="M260 0 C320 60 380 120 340 200 C300 280 180 300 180 380 C180 450 260 470 280 500 L230 500 C210 460 130 430 130 360 C130 280 250 250 290 180 C330 110 270 50 210 0 L260 0 Z" fill="currentColor"/>

  <!-- Fluid Ribbon Layer 4: Upper Right Crest to Base -->
  <path d="M380 0 C440 60 500 120 470 200 C440 280 320 300 320 380 C320 450 400 470 430 500 L370 500 C340 460 270 430 270 360 C270 280 390 250 420 180 C450 110 400 50 330 0 L380 0 Z" fill="currentColor"/>

  <!-- Fluid Ribbon Layer 5: Top Right Corner Swells -->
  <path d="M460 0 C490 40 500 80 500 120 L500 0 Z" fill="currentColor"/>
  <path d="M500 180 C470 220 440 260 440 320 C440 380 490 420 500 440 L500 180 Z" fill="currentColor"/>
</svg>`
};

// ----------------------------------------------------------------------------
// Named Exports for Granular Import / Tree-Shaking
// ----------------------------------------------------------------------------
export const infinityLoopSvg = KLEIV_SVGS.infinity_loop;
export const meltingIceSvg = KLEIV_SVGS.melting_ice;
export const personWithBoxSvg = KLEIV_SVGS.person_with_box;
export const croissantLoungerSvg = KLEIV_SVGS.croissant_lounger;
export const baristaCraftSvg = KLEIV_SVGS.barista_craft;
export const balanceGirlSvg = KLEIV_SVGS.balance_girl;
export const icedCupWithSloganSvg = KLEIV_SVGS.iced_cup_with_slogan;
export const icedCupSoloSvg = KLEIV_SVGS.iced_cup_solo;
export const organicWavyPatternSvg = KLEIV_SVGS.organic_wavy_pattern;

/**
 * Utility helper to retrieve a brand SVG with custom class, dimension, or ARIA attributes.
 * @param {keyof typeof KLEIV_SVGS} name - Registered asset key
 * @param {Object} [options]
 * @param {string} [options.className] - Additional Tailwind or CSS classes to append
 * @param {string|number} [options.width] - Optional width override
 * @param {string|number} [options.height] - Optional height override
 * @param {string} [options.role='img'] - ARIA role
 * @param {string} [options.ariaLabel] - Accessible label
 * @returns {string} Fully formatted SVG markup string
 */
export function getKleivSvg(name, { className = '', width, height, role = 'img', ariaLabel } = {}) {
  const svg = KLEIV_SVGS[name];
  if (!svg) {
    console.warn(`[KLEIV] Asset "${name}" not found in brand registry.`);
    return '';
  }

  let customized = svg;

  if (className) {
    customized = customized.replace('class="', `class="${className} `);
  }

  if (width) {
    customized = customized.replace('<svg ', `<svg width="${width}" `);
  }

  if (height) {
    customized = customized.replace('<svg ', `<svg height="${height}" `);
  }

  if (ariaLabel) {
    customized = customized.replace('<svg ', `<svg role="${role}" aria-label="${ariaLabel}" `);
  } else {
    customized = customized.replace('<svg ', `<svg role="${role}" aria-hidden="true" `);
  }

  return customized;
}

export default KLEIV_SVGS;