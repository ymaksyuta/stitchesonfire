# Stitches on Fire — project context

## What this is
A mobile-first PWA crochet chart assistant. Users build stitch charts (like
CrochetCharts, but in the browser, offline-capable, installable). Each
stitch is its own free-form position anchor — see "Data model" below. A
light guideline grid still exists for visual/snap reference only.

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
A stitch is its own position anchor — there is no separate node entity:
- `Stitch { id, type, color?, pos: {x,y}, attachments: (string|null)[] }`.
  `pos` is where the glyph is drawn; it never moves except by an explicit
  geometric drag. `attachments[i]` is the id of the stitch attachment
  point `i` hooks into (or null). `ATTACHMENT_ARITY[type]` says how many
  attachment points a type has (all current types: 0 or 1). Several
  stitches pointing at the same target id is a **fan-out** (shared base);
  a stitch with several non-null attachments is a **cluster/decrease**
  (arity 2+, none implemented yet but the model already supports it) —
  both are just entries in this array, no separate structure for either.
- `Pattern.sequence: string[]` — the order the thread is actually worked
  in, independent of `attachments` (a stitch's structural connection).
  Editing structure never reorders the thread and vice versa.
- `Pattern.rows/cols` only size the guideline grid + canvas extent, not a
  hard cell grid.

Editing rules (`src/store/patternStore.ts`), by design, not by accident:
- Moving a stitch's `pos` (`moveStitchesBy`/`finalizeStitchPos`) never
  moves anything attached to it — an attachment's leg is drawn fresh from
  the current `pos` on every render, so deformation is automatic and
  never cascades: nothing has to explicitly "not move" the other end.
- A brand-new stitch is inserted into `sequence` right after the current
  one (last of `selectedStitchIds`), or at the start if there is none,
  and becomes the new sole current — see `insertStitch` inside the store.
- Glyphs never stretch, only tilt (`stitchGlyphs.ts`): each is authored
  once in local unit space centered on its own `pos`, at a fixed nominal
  size, and rotated to face the *average direction* of its attachment
  targets (`averageAttachmentAngle` — averages direction vectors, not raw
  angles, so it doesn't break down near +/-180°). The connecting "leg" to
  each attachment target is a separate plain straight line, drawn outside
  the glyph — so legs can be any length without the symbol distorting.
- **Tools change what a drag *sweeps over* means, not gestures.** With no
  tool active, drag/attachment-handle gestures work as usual (geometric
  move, reattach). With a tool active (`add`/`select`/`delete`/`move` —
  `activeTool` in the store), every newly-touched grid point or stitch
  during that one drag applies the tool's effect immediately (fill many
  points/retype, multi-select, bulk-delete, or — for `move` — just
  records the last-touched stitch, then `commitMoveSweep` on release
  splices the current selection into `sequence` right after it). A tap is
  just a one-point sweep, no separate code path.
- **Undo/redo** (`history.past`/`history.future`) snapshots the whole
  `Pattern` once per gesture, at `beginGesture()` (called once per
  pointer-down in `StitchGrid.tsx`) — not per `pointermove` — so a drag
  or a multi-point sweep undoes as a single step. Selection is
  intentionally excluded from history; it's ephemeral UI state, not
  pattern content.

## Conventions
- New stitch types: add to `StitchType` and `ATTACHMENT_ARITY` in
  `src/types/pattern.ts`, add a glyph + attachment points to the `GLYPHS`
  map in `stitchGlyphs.ts` (local unit space, default attachment
  direction is straight down: `{x:0, y:+0.5}`), add a `StitchIcon.tsx`
  case, add labels to every locale file under `src/i18n/locales/*/common.json`.
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
   from palette) ✅ — superseded by #9's stitch-is-its-own-anchor model
8. Export (PNG/PDF) — not started
9. Stitch-is-its-own-anchor rewrite ✅ — see "Data model" above:
   `attachments` array replaces shared graph nodes, `sequence` tracks
   thread working order (rendered as a direction-colored line), glyphs
   are fixed-size and only tilt (no more axis-stretch), 4-tool sweep
   palette (`ToolPalette.tsx`: add/select/delete/move-in-sequence) where
   a drag applies the tool to every point it crosses, undo/redo
   (snapshot once per gesture, not per pointermove)
10. Polish still open: accessibility pass, more stitch symbols (esp. an
    actual decrease/cluster type now that arity 2+ is modeled), additive
    multi-select on touch (currently shift/ctrl/meta-click only, desktop
    only — the Select *tool*'s sweep covers most of this need now, but
    touch still has no additive tap), quick-insert-with-attach gesture
    (tap-with-a-small-drag onto an existing stitch while using the Add
    tool) discussed but not implemented — sweep dedupes by grid point,
    which doesn't cleanly compose with "first point empty, second point
    existing" as a single insert+attach action yet
11. Beta + feedback loop

## Icon regeneration
Source is `src-icon/icon.svg`. Regenerate PNGs with:
```
rsvg-convert -w 192 -h 192 src-icon/icon.svg -o public/icon-192.png
rsvg-convert -w 512 -h 512 src-icon/icon.svg -o public/icon-512.png
rsvg-convert -w 180 -h 180 src-icon/icon.svg -o public/apple-touch-icon.png
cp src-icon/icon.svg public/favicon.svg
```
