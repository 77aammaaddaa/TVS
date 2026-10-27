import { VISUAL_ASSETS } from './visual-assets.js';

export const STORY_DOODLES = Object.freeze([
  Object.freeze({
    id: 'croissant',
    label: 'The Lounger',
    illustration: VISUAL_ASSETS.croissantLounger,
    badge: 'Slow living',
    title: 'Sink into comfort.',
    copy: 'Some moments are meant to be unhurried. Let the city noise fade and make room for a small coffee break.',
    recommendationIds: Object.freeze(['k8-bakery-01', 'k8-espresso-02']),
  }),
  Object.freeze({
    id: 'ice',
    label: 'The Chill',
    illustration: VISUAL_ASSETS.meltingIce,
    badge: 'A cooler pause',
    title: 'Let the afternoon soften.',
    copy: 'When Suez afternoons feel intense, a cold coffee with a bright citrus finish makes a welcome reset.',
    recommendationIds: Object.freeze(['k8-cold-01']),
  }),
  Object.freeze({
    id: 'barista',
    label: 'The Craft',
    illustration: VISUAL_ASSETS.baristaCraft,
    badge: 'A little focus',
    title: 'Find your sweet spot.',
    copy: 'A focused pause, pulled into a balanced little cup: double espresso softened with silky steamed milk.',
    recommendationIds: Object.freeze(['k8-espresso-01']),
  }),
  Object.freeze({
    id: 'balance',
    label: 'The Balance',
    illustration: VISUAL_ASSETS.balancePause,
    badge: 'Reset your mood',
    title: 'A lighter kind of pause.',
    copy: 'Japanese matcha, cold milk, and a moment to reset. Just a lighter kind of focus, at your own pace.',
    recommendationIds: Object.freeze(['k8-matcha-01']),
  }),
  Object.freeze({
    id: 'infinity',
    label: 'The Loop',
    illustration: VISUAL_ASSETS.infinity,
    badge: 'The KLEIV loop',
    title: 'Good moments keep going.',
    copy: 'A good coffee break can stay with you long after the last sip. Keep your own loop going with something bright and sparkling.',
    recommendationIds: Object.freeze(['k8-cold-02']),
  }),
]);