# Stitches on Fire — project context

## What this is
A mobile-first PWA crochet chart assistant. Users build stitch charts (like
CrochetCharts, but in the browser, offline-capable, installable) as a
**free-form node graph**, not a rectangular grid — see "Data model" below.
A light guideline grid still exists for visual/snap reference only.

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

## Data model (`src/types/pattern.ts`)
Rewritten from a rectangular `{row, col}` grid to a free-form graph:
- `StitchNode { id, x, y }` — a connection point, in fractional grid units
  (not confined to grid intersections). May be referenced by more than one
  stitch: a node shared by several stitches' `baseNodeId` is a **fan-out**
  (many legs from one base); shared `tipNodeId` is a **cluster/convergence**.
- `Stitch { id, type, color?, baseNodeId, tipNodeId }` — no stored angle or
  length; both are derived from the two referenced nodes' positions.
- `Pattern.rows/cols` now only size the guideline grid + canvas extent, not
  a hard cell grid.

Editing rules (`src/store/patternStore.ts`), by design, not by accident:
- Moving a single node (`moveNode`/`finalizeNodeDrag`) deforms every stitch
  that references it, but does **not** move those stitches' other endpoint
  — deformation never cascades past one hop.
- Moving a whole stitch/selection (`moveNodesBy`) rigidly translates every
  node the selection references (dedup'd), which is the same primitive —
  group drag is not a separate mechanism.
- `finalizeNodeDrag` snaps to the nearest existing node first (merging into
  it — this is how fans/clusters actually get created day-to-day: drop two
  stitches separately, then drag one endpoint onto the other), and only
  falls back to the guideline grid if nothing is close enough.
- Glyph rendering (`stitchGlyphs.ts`) is intentionally decoupled from node
  positions: each glyph is authored once in local unit space (base at
  (0,0), tip at (0,-1)) and only ever receives a length + angle to place
  itself. Stretch only ever happens along the glyph's own local axis,
  scale factors are always positive (never mirrors), and stroke width is
  set as a constant after placement — never scaled by the transform — so
  repeated node edits can't accumulate visual distortion.

## Conventions
- New stitch types: add to `StitchType` in `src/types/pattern.ts`, add a
  glyph to the `GLYPHS` map in `stitchGlyphs.ts` (local unit space, base at
  origin, tip at (0,-1)), add labels to every locale file under
  `src/i18n/locales/*/common.json`.
- Grid editor renders on `<canvas>` for touch performance — don't switch to
  SVG without benchmarking on a real mobile device first.
- Keep `npm run build` (tsc -b && vite build) passing before committing.

## Roadmap (see repo README/issues for current status)
1. Scaffold ✅
2. Core editor MVP (grid, stitch placement, touch) ✅
3. Pattern persistence (save/load/list/delete via IndexedDB) ✅
   `AppMenu` in `src/components/` (dropdown from the header menu button;
   pattern name itself is edited inline in the header)
4. PWA shell (manifest icons, offline test) ✅ icons generated from
   `src-icon/icon.svg` (kept in repo so they can be regenerated/redesigned;
   not part of the build output)
5. i18n pass — en, ru seeded via `LanguageSwitcher`; still needs more
   languages + RTL check
6. Pinch-zoom + two-finger pan ✅
7. Free-form node-graph editor (fan-out/cluster stitches, drag-to-place
   from palette, merge-by-drag, rigid group move without cascading
   deformation) ✅ — see "Data model" above
8. Export (PNG/PDF) — not started
9. Polish still open: undo/redo, accessibility pass, more stitch symbols,
   additive multi-select on touch (currently shift/ctrl/meta-click only,
   works on desktop; touch needs its own affordance — long-press-to-add?),
   toolbar to switch single-finger gesture mode (chart pan/select vs stitch
   type/color) — deferred by user, not started
10. Beta + feedback loop

## Icon regeneration
Source is `src-icon/icon.svg`. Regenerate PNGs with:
```
rsvg-convert -w 192 -h 192 src-icon/icon.svg -o public/icon-192.png
rsvg-convert -w 512 -h 512 src-icon/icon.svg -o public/icon-512.png
rsvg-convert -w 180 -h 180 src-icon/icon.svg -o public/apple-touch-icon.png
cp src-icon/icon.svg public/favicon.svg
```
