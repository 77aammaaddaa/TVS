const svg = (content, type) => `
  <svg class="brand-doodle brand-doodle--${type}" viewBox="0 0 120 120" fill="none" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">
    ${content}
  </svg>`;

const DOODLES = {
  croissant: svg(`
    <path d="M24 75c7-28 27-43 36-43s29 15 36 43c-10 9-20 13-30 13H54c-10 0-20-4-30-13Z" fill="#E9B86C" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/>
    <path d="M35 59c10 1 16 9 17 24M53 42c7 8 10 23 7 43M70 42c-7 8-10 23-7 43M85 59c-10 1-16 9-17 24" stroke="#A96536" stroke-width="3" stroke-linecap="round"/>
    <path d="M25 75c8-5 14-6 20-3m50 3c-8-5-14-6-20-3" stroke="#FFF8E9" stroke-width="3" stroke-linecap="round"/>
  `, 'croissant'),
  ice: svg(`
    <rect x="20" y="33" width="43" height="43" rx="9" transform="rotate(-12 20 33)" fill="#D6EEF0" stroke="currentColor" stroke-width="3"/>
    <rect x="55" y="47" width="43" height="43" rx="9" transform="rotate(14 55 47)" fill="#B9DFE2" stroke="currentColor" stroke-width="3"/>
    <path d="m29 45 18-4m-8 1 4 18m25 7 17 5m-5-13-5 17" stroke="#FFF" stroke-width="3" stroke-linecap="round" opacity=".9"/>
  `, 'ice'),
  portafilter: svg(`
    <path d="M22 57h43a20 20 0 0 1-40 0h-3Z" fill="#C7D6C4" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/>
    <path d="M63 59h34c7 0 9 10 2 13l-35 13" stroke="currentColor" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M33 49h28l-5-13H38l-5 13Z" fill="#D4AF75" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/>
    <path d="M29 57h32" stroke="#6A4530" stroke-width="5" stroke-linecap="round"/>
    <path d="M48 24v-7m-12 10-5-5m29 5 5-5" stroke="#D4AF75" stroke-width="3" stroke-linecap="round"/>
  `, 'portafilter'),
  'iced-latte': svg(`
    <path d="M35 31h50l-5 64H40l-5-64Z" fill="#F7FAF5" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/>
    <path d="M38 49h44l-3 39H41l-3-39Z" fill="#C99868"/>
    <path d="M38 58h44m-42 12h40" stroke="#F7E5C8" stroke-width="3" opacity=".9"/>
    <path d="M35 31c0-8 50-8 50 0s-50 8-50 0Z" fill="#E9F3EE" stroke="currentColor" stroke-width="3"/>
    <path d="m51 42 8 8 8-9m-6-8 5-14" stroke="#B9DFE2" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M70 19 90 2" stroke="#D4AF75" stroke-width="4" stroke-linecap="round"/>
  `, 'iced-latte'),
};

export function getDoodleMarkup(type = 'iced-latte') {
  return DOODLES[type] ?? DOODLES['iced-latte'];
}

export function doodleForMenuItem(item = {}) {
  const name = `${item.name_en ?? ''} ${item.category ?? ''}`.toLowerCase();
  if (name.includes('croissant') || name.includes('cookie') || name.includes('waffle') || name.includes('bakery') || name.includes('dessert')) return 'croissant';
  if (name.includes('cold') || name.includes('mojito') || name.includes('orange')) return 'ice';
  if (name.includes('espresso') || name.includes('cortado') || name.includes('coffee')) return 'portafilter';
  return 'iced-latte';
}
