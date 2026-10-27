import { doodleForMenuItem } from '../scripts/doodles.js';

export const VISUAL_ASSETS = Object.freeze({
  infinity: Object.freeze({ src: '/images/kleiv/infinity-mark.png', width: 655, height: 320 }),
  meltingIce: Object.freeze({ src: '/images/kleiv/melting-ice.png', width: 440, height: 290 }),
  slowMoment: Object.freeze({ src: '/images/kleiv/slow-moment.png', width: 475, height: 575 }),
  croissantLounger: Object.freeze({ src: '/images/kleiv/croissant-lounger.png', width: 735, height: 455 }),
  baristaCraft: Object.freeze({ src: '/images/kleiv/barista-craft.png', width: 735, height: 460 }),
  balancePause: Object.freeze({ src: '/images/kleiv/balance-pause.png', width: 480, height: 778 }),
  icedCupSlogan: Object.freeze({ src: '/images/kleiv/iced-cup-slogan.png', width: 640, height: 590 }),
  icedCup: Object.freeze({ src: '/images/kleiv/iced-cup.png', width: 355, height: 435 }),
  wavyPattern: Object.freeze({ src: '/images/kleiv/wavy-pattern.png', width: 768, height: 1575 }),
});

const MENU_ILLUSTRATIONS = Object.freeze({
  croissant: VISUAL_ASSETS.croissantLounger,
  ice: VISUAL_ASSETS.meltingIce,
  portafilter: VISUAL_ASSETS.baristaCraft,
  'iced-latte': VISUAL_ASSETS.icedCup,
});

export function illustrationForMenuItem(item = {}) {
  return MENU_ILLUSTRATIONS[doodleForMenuItem(item)] ?? VISUAL_ASSETS.icedCup;
}
