# Kleiv 8 Digital Menu

A static, bilingual-first coffee menu for Kleiv 8 in Suez. Built with Astro and Tailwind CSS; client interactions use native ES modules and browser APIs only.

## Run locally

```sh
npm install
npm run dev
```

Use Node.js 22.22 or newer. Create the static production site with `npm run build`; preview it with `npm run preview`. The generated site is in `dist/` and can be deployed to Cloudflare Pages with build command `npm run build` and output directory `dist`.

## Menu data and optional synchronization

The site ships with sample EGP menu entries in `public/data/default-menu.json`. These are demonstration values and should be replaced with the shop's approved products and prices before launch.

The browser renders the fallback menu in the generated HTML, then initializes a localStorage-backed store and performs stale-while-revalidate when configured. To enable Google Apps Script sync, set `PUBLIC_MENU_ENDPOINT` to the deployed web-app URL at build time. The endpoint may return an array or `{ "success": true, "data": [...] }`. `Hidden` products are excluded and invalid rows are ignored. No endpoint is contacted when the setting is empty.

## Counter ordering

The cart is stored locally on the customer's device. Checkout opens a prefilled WhatsApp message addressed to `+20 102 332 8432`, including item names, quantities, notes, and a total in EGP. Customers order through WhatsApp and pay at the cashier; this site does not process payments.

## Audio and modes

The welcome animation draws the infinity mark for 1.2 seconds and can be dismissed by tapping or choosing **Enter menu**. The site has no music or audio recordings. Optional, locally synthesized ASMR effects and a very soft rain-like ambience start muted; the first-visit prompt lets customers enable them or keep browsing silently. The **ASMR Ambient** header control can change that choice later, and the preference is saved on the device. The rain loop and effects are generated with the browser's Web Audio API only after a user gesture; they are sound-design approximations, not recordings of real rain or café sounds.

## Interactive brand stories

Five illustrated characters open short, English-language stories with menu recommendations. Recommendations and EGP totals follow the current menu, and available products can be added directly to the cart; unavailable items cannot be ordered from a story.

Hot-coffee items marked `latte_art` open an interactive top-down cup modal with an animated infinity pour and touch/mouse ripples. Vibe mode shows a horizontal looping menu reel; Speed mode shows a searchable, category-filtered list. The mood slider highlights products tagged for chill, focus, or refresh.

## Cloudflare Pages

- Framework preset: Astro
- Build command: `npm run build`
- Build output directory: `dist`
- Node.js: 22.22 or newer
