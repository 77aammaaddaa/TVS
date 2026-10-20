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

The welcome animation lasts 1.2 seconds and can also be dismissed by tapping. Sound is opt-in and generated locally through the Web Audio API after a user gesture. Vibe mode shows a horizontal looping menu reel; Speed mode shows a searchable, category-filtered list. The mood slider highlights products tagged for chill, focus, or refresh.

## Cloudflare Pages

- Framework preset: Astro
- Build command: `npm run build`
- Build output directory: `dist`
- Node.js: 22.22 or newer
