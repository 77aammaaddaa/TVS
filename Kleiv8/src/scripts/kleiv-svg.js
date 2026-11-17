import barestaGirl from '../../svg/baresta girl.svg?raw';
import caffeineAddict from '../../svg/caffeine addict.svg?raw';
import croissantGuy from '../../svg/croissant guy.svg?raw';
import cup from '../../svg/cup (2).svg?raw';
import girlWithCup from '../../svg/girl with cup.svg?raw';
import iceCubes from '../../svg/ice cubes (2).svg?raw';
import infinity from '../../svg/infinity.svg?raw';

const KLEIV_DOODLES = Object.freeze({
  infinity_loop: infinity,
  melting_ice: iceCubes,
  person_with_box: girlWithCup,
  croissant_lounger: croissantGuy,
  barista_craft: barestaGirl,
  balance_girl: caffeineAddict,
  caffeine_addict: caffeineAddict,
  iced_cup: cup,
});

function namespaceToken(value) {
  return value.replace(/[^A-Za-z0-9_-]/g, '-');
}

function prepareIllustration(markup, namespace, active) {
  const scopedMarkup = markup
    .replace(/^\s*<\?xml[^?]*\?>\s*/, '')
    .replace(/\bid="([^"]+)"/g, (_match, id) => `id="${namespace}-${id}"`)
    .replace(/url\(#([^)]+)\)/g, (_match, id) => `url(#${namespace}-${id})`)
    .replace(/((?:xlink:)?href=["'])#([^"']+)(["'])/g, (_match, attribute, id, quote) =>
      `${attribute}#${namespace}-${id}${quote}`
    )
    .replace(/\bclass="([^"]+)"/g, (_match, classes) =>
      `class="${classes.split(/\s+/).map((className) => `${namespace}-${className}`).join(' ')}"`
    )
    .replace(/\.([A-Za-z_][\w-]*)/g, (_match, className) => `.${namespace}-${className}`);

  return scopedMarkup
    .replace(/<svg\b([^>]*)>/, (_match, attributes) => {
      const sourceClasses = /\bclass="([^"]+)"/.exec(attributes)?.[1]?.split(/\s+/) ?? [];
      const attributesWithoutClass = attributes.replace(/\s+class="[^"]*"/, '');
      const classes = [
        ...sourceClasses,
        'kleiv-svg',
        'svg-hybrid-draw',
        ...(active ? ['is-live'] : []),
      ];
      return `<svg${attributesWithoutClass} class="${classes.join(' ')}">`;
    })
    .replace(/<path\b/g, '<path data-k-path="" pathLength="1"')
    .replace(/<g\b/g, '<g data-k-layer=""');
}

export function getKleivSvgMarkup(name, { active = false, instance = name } = {}) {
  const markup = KLEIV_DOODLES[name];
  if (!markup) {
    console.error(`Unknown KLEIV SVG illustration "${name}".`);
    return '';
  }

  const namespace = namespaceToken(`${name}-${instance ?? 'default'}`);
  return prepareIllustration(markup, namespace, active);
}
