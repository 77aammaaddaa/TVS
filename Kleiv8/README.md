# KLEIV 8 Digital Menu

A bilingual digital menu for KLEIV in Suez, built with Astro and Tailwind CSS. The site uses static output for Cloudflare Pages; browser interactions are plain JavaScript ES modules.

## Features

- Arabic and English interface with RTL/LTR layout, localized menu content, and EGP prices.
- A bundled catalogue of 82 menu items for instant loading and offline fallback.
- Vibe reel, quick menu list, category and mood filters, and product details. Cart and ordering controls are implemented but hidden by default.
- Optional browser-generated ASMR ambience and sound effects. Audio starts muted; there are no songs or audio recordings.
- Optional WhatsApp checkout to `+201023328432`. When enabled, the message includes item quantities, selected add-ons, notes, an optional table number, any configured discount, and the EGP total. Customers pay at the cashier; the site does not process payments.
- CMS-driven cafe status, announcements, blog posts, category data, coupons, and order counts when those fields are configured in Google Sheets.

## Illustration assets

Brand, menu, splash, story, and latte-art illustrations are sourced from the project `svg/` folder. Shared image references use `src/config/vector-assets.js`; animated artwork embeds SVGs from the same folder.

## Run locally

Use Node.js 22.22 or newer:

```sh
npm install
npm run dev
```

Run the Astro diagnostics and production build with:

```sh
npm run check
npm run build
npm run preview
```

The static output is written to `dist/`.

## Storefront controls

`src/config/site.js` contains `enableCart`, which is currently `false` for a menu-only storefront. Set it to `true` to restore the cart, item add buttons, customization controls, and WhatsApp checkout.
The directions button opens a Google Maps route search for the documented address; replace its URL with the cafe's exact pinned place link when available.

The site also ships `robots.txt`, `sitemap.xml`, a web manifest, Open Graph metadata, and `CafeOrCoffeeShop` structured data. A direct Google review URL is not configured.

## Menu data and synchronization

`public/data/default-menu.json` contains the current 82-item catalogue and is rendered as the initial menu. `src/scripts/menu-store.js` reads cached CMS data from local storage immediately, then revalidates in the background against the Google Apps Script URL in `src/config/site.js`. Network errors and empty menu responses do not replace the usable local menu.

The CMS endpoint can return either an item array or a payload with `success: true` and a `data` array. The optional payload fields include `settings`, `categories`, `news_ticker`, `blog`, and `addons_catalog`. Add-ons appear for a product only when its `allowed_addons`/`allowed_addons_list` explicitly names them; sales rankings are based on recorded order counts or an explicit best-seller flag.

The repository includes the Apps Script source at `Kleiv8/Kleiv/code.gs`. Changes to that file do not update a deployed Apps Script web app: deploy a new version before relying on its updated response or order handling. Keep the `order_logging_enabled` setting off unless you intentionally want public menu submissions recorded in `sales_log`. Such submissions represent requests sent to WhatsApp, not confirmed purchases or payments.

## Ordering and sound

Orders are sent to the cafe cashier through WhatsApp and are priced in Egyptian pounds (EGP). The Web Audio API is used only after a customer enables sound; the default is silent. Generated rain-like ambience and category sounds are approximations, not recordings of real cafe activity.

## Cloudflare Pages

- Framework preset: Astro
- Build command: `npm run build`
- Output directory: `dist`
- Node.js: 22.22 or newer
