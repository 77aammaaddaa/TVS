import { VECTOR_ASSETS } from '../config/vector-assets.js';

const DOODLE_ASSETS = Object.freeze({
  croissant: VECTOR_ASSETS.croissantGuy,
  ice: VECTOR_ASSETS.iceCubes,
  portafilter: VECTOR_ASSETS.baristaGirl,
  'iced-latte': VECTOR_ASSETS.cup,
});

export function getDoodleMarkup(type = 'iced-latte') {
  const resolvedType = Object.hasOwn(DOODLE_ASSETS, type) ? type : 'iced-latte';
  const asset = DOODLE_ASSETS[resolvedType];
  return `<img class="brand-doodle brand-doodle--${resolvedType}" src="${asset.src}" width="${asset.width}" height="${asset.height}" alt="" aria-hidden="true" loading="lazy" decoding="async">`;
}

export function doodleForMenuItem(item = {}) {
  const name = `${item.name_en ?? ''} ${item.category ?? ''}`.toLowerCase();
  if (name.includes('croissant') || name.includes('cookie') || name.includes('waffle') || name.includes('bakery') || name.includes('dessert')) return 'croissant';
  if (name.includes('cold') || name.includes('mojito') || name.includes('orange')) return 'ice';
  if (name.includes('espresso') || name.includes('cortado') || name.includes('coffee')) return 'portafilter';
  return 'iced-latte';
}
