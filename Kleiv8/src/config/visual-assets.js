import { doodleForMenuItem } from '../scripts/doodles.js';
import { VECTOR_ASSETS } from './vector-assets.js';

export const VISUAL_ASSETS = Object.freeze({
  infinity: VECTOR_ASSETS.infinity,
  meltingIce: VECTOR_ASSETS.iceCubes,
  slowMoment: VECTOR_ASSETS.girlWithCup,
  croissantLounger: VECTOR_ASSETS.croissantGuy,
  baristaCraft: VECTOR_ASSETS.baristaGirl,
  balancePause: VECTOR_ASSETS.caffeineAddict,
  icedCupSlogan: Object.freeze({ src: '/images/kleiv/iced-cup-slogan.png', width: 640, height: 590 }),
  icedCup: VECTOR_ASSETS.cup,
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
