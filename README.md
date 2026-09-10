# Stitches on Fire

A mobile-first, installable PWA for building crochet stitch charts. Inspired
by the feature set of [CrochetCharts](https://github.com/StitchworksSoftware/CrochetCharts)
(GPLv3, desktop, unmaintained), reimplemented from scratch as an MIT-licensed
web app.

## Stack

- React + TypeScript + Vite
- Tailwind CSS v4
- Zustand (state)
- react-i18next (i18n)
- IndexedDB via `idb` (offline pattern storage)
- vite-plugin-pwa / Workbox (installable, offline)

## Getting started

```bash
npm install
npm run dev
```

## Scripts

- `npm run dev` – local dev server
- `npm run build` – type-check + production build
- `npm run preview` – preview the production build
- `npm test` – run unit tests (Vitest)

## License

MIT — see [LICENSE](./LICENSE).
