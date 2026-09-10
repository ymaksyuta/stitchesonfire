# Stitches on Fire — project context

## What this is
A mobile-first PWA crochet chart assistant. Users build stitch charts on a
grid (like CrochetCharts, but in the browser, offline-capable, installable).

## Non-negotiables
- **License: MIT.** Do not copy code from CrochetCharts (GPLv3) — UX/feature
  reference only, never source.
- **Mobile-first.** Design and test touch interactions before desktop.
- **Multilingual.** All user-facing strings go through i18next
  (`src/i18n/locales/<lang>/common.json`), never hardcoded.
- **Offline-first.** Pattern data lives in IndexedDB (`src/db/patterns.ts`),
  not just server state.

## Stack
- React 19 + TypeScript + Vite
- Tailwind CSS v4 (`@tailwindcss/vite`, imported via `@import "tailwindcss"`
  in `src/index.css` — no `tailwind.config.js` needed for v4 defaults)
- Zustand for editor/app state (`src/store/`)
- react-i18next + i18next-browser-languagedetector
- idb (IndexedDB wrapper) for persistence
- vite-plugin-pwa (Workbox) for service worker / installability
- Vitest + Testing Library for unit tests
- Deployed to Vercel (matches sibling project `earsonfire`)

## Structure
```
src/
  components/       shared UI components
  features/editor/  the stitch grid canvas + palette
  store/            zustand stores
  i18n/             i18next config + locale JSON files
  db/               IndexedDB access (patterns)
  types/            shared TypeScript types
```

## Conventions
- New stitch types: add to `StitchType` in `src/types/pattern.ts`, add a
  glyph in `StitchGrid.tsx`'s `STITCH_GLYPH` map, add labels to every locale
  file under `src/i18n/locales/*/common.json`.
- Grid editor renders on `<canvas>` for touch performance — don't switch to
  SVG without benchmarking on a real mobile device first.
- Keep `npm run build` (tsc -b && vite build) passing before committing.

## Roadmap (see repo README/issues for current status)
1. Scaffold ✅
2. Core editor MVP (grid, stitch placement, touch) ✅ baseline, needs zoom/pan
3. Pattern persistence (save/load/list/delete via IndexedDB) — in progress
4. PWA shell (manifest icons, offline test) — needs real icon assets
5. i18n pass — en + uk seeded, needs more languages + RTL check
6. Export (PNG/PDF)
7. Polish (undo/redo, accessibility, more stitch symbols)
8. Beta + feedback loop
