# Stitches on Fire — project context

## What this is
A mobile-first PWA crochet chart assistant. Users build stitch charts (like
CrochetCharts, but in the browser, offline-capable, installable). Each
stitch is its own free-form position anchor — see "Data model" below. A
light guideline grid still exists for visual/snap reference only.

## Session memory
Sessions on claude.ai are bound to this project's own memory store — a
set of files separate from this repo, persisting across chats there.
**A session in this repo without that store (Claude Code, a fresh
checkout, any non-claude.ai environment) only ever sees this file** — so
this file is the authoritative fallback, not just a convenience copy.
Keep it truthful on its own, independent of the memory store.

For a claude.ai session that does have the memory store, read in this
order at session start, stopping once you have enough context for the
task:
1. `index.md` — entry point, one line, points at the rest.
2. `overview.md` — current state, stack, what's next.
3. `learnings-and-workflow.md` — the session workflow (PAT push process,
   never storing the token), hard-won bugs/gotchas, a dated
   implementation-progress log, and a "Known issues" list to pick up.
4. `architecture-model.md` — the full target architecture (topological
   model, anchors, groups, turning chains) when working on data-model or
   rendering-logic tasks specifically.
5. `interaction-tools.md`, `3d-relaxation.md`, `i18n-glossary.md` — later
   roadmap phases (touch/chain-arc tools, 3D preview, i18n), only when
   the task actually touches one of them.

Keep both in sync as you work, not just at the end of a session:
- After landing a change, append a dated note to
  `learnings-and-workflow.md`'s progress log (what changed, the commit,
  pushed or not) and update its "Known issues" list.
- When a design decision is made or revised, update `architecture-model.md`
  (or the relevant later-phase file) to match — it's meant to be the
  current authoritative spec, not a historical record of the discussion.
- Mirror any change to the actual data model or roadmap status into this
  file's own "Data model" and "Roadmap" sections in the same session —
  this file drifting out of sync with the memory store is exactly what
  caused a prior session to miss already-implemented work.


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
- `Stitch { id, type, color?, pos: {x,y}, anchors: (Anchor|null)[], thread, layer, side, marker?, size? }`.
  `pos` is where the glyph is drawn; it never moves except by an explicit
  geometric drag. `anchors[i]` is what attachment point `i` hooks into —
  a polymorphic `Anchor` (`crown` w/ loop both/flo/blo, `post` front/back,
  `magicRing`, `chainSpace` w/ chainIds+offset), not just a raw stitch id,
  so the target kind is explicit at the type level. `ATTACHMENT_ARITY[type]`
  says how many anchor slots a type has (all current types: 0 or 1).
  Several stitches anchoring the same target is a **fan-out** (shared
  base); a stitch with several non-null anchors is a **cluster/decrease**
  (arity 2+, none implemented yet but the model already supports it) —
  both are just entries in this array, no separate structure for either.
  `thread`, `layer`, and `side` are all required. `thread`/`layer` are
  independent axes (thread = working order + color scheme, layer = grid
  type/points — see below); `side` (right/wrong) is independent of row
  grouping and picks whether the stitch draws at full or reduced
  saturation (see `Thread` below). `marker` is a display-only badge flag
  (no row-counting semantics). `size` overrides the thread's default
  turning-chain loop size for this stitch.
- `Thread { id, name?, color, turningLoopSize? }` — a yarn strand, one
  base color. A pattern can have more than one. A stitch draws in its
  thread's `color` on the right side; the wrong side draws the same hue
  at reduced saturation, not a second stored color — the reduction
  amount is a global setting (`sideContrastAmount`/`showSideContrast` in
  the store, `SideContrastToggle.tsx` in the UI). A stitch's own `color`,
  when set, overrides the resolved color outright, on any thread.
- `Layer { id, name?, grid, shift: {x,y,angle} }` — `grid` is a
  rectangular or radial grid for guideline/snap points only, never a
  source of truth for `pos`. `shift` offsets the grid's origin from the
  canvas center (cell units for x/y, degrees for angle) — a guideline
  transform only, never applied to any stitch's `pos`.
- `Group` (chain-arc / composite-motif / repeat-with-instancing) — not
  wired into any UI yet, types exist in `pattern.ts`.
- `Pattern.sequence: string[]` — the order the thread is actually worked
  in, independent of `anchors` (a stitch's structural connection).
  Editing structure never reorders the thread and vice versa.
- `Pattern.rows/cols` only size the *guideline grid*. The canvas itself
  is not fixed to it — it grows to the bounding box of the actual
  stitches (`contentExtent()` in `StitchGrid.tsx`, padded a couple of
  cells) so placing/dragging past the nominal grid never clips. A
  "fit to pattern" button (`ResetViewButton.tsx`, store's `fitView()`,
  registered by `StitchGrid.tsx` via `registerFitView`) zooms + scrolls
  to show it all.
- New/loaded patterns are defensively normalized (`normalizePattern` in
  `patternStore.ts`) — old saved patterns missing threads/layers/groups
  or per-stitch thread/layer/side get sane defaults backfilled.

Editing rules (`src/store/patternStore.ts`), by design, not by accident:
- Moving a stitch's `pos` (`moveStitchesBy`/`finalizeStitchPos`) never
  moves anything attached to it — an anchor's leg is drawn fresh from
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
- The Add tool's sweep always *hard*-rounds to the nearest guideline
  intersection (`roundToGrid` in the store) — unlike free-form palette
  drag-drop, which only snaps if the drop is close enough
  (`snapToGuideline`). Don't blur this distinction: the sweep exists
  specifically to fill guideline points, so it must never leave a stitch
  at a raw fractional position.
- `activeStitch` can be `null` ("no type selected") — tapping the
  already-active icon in `StitchPalette` toggles it off, same pattern as
  the tool buttons. With no type active, the Add tool's sweep recolors
  whatever existing stitch it touches but never inserts on empty ground.
- Rendering (`StitchGrid.tsx`'s `draw()`) draws the *whole chart twice* —
  once entirely in the background color (thick), once entirely in real
  colors (thin) — rather than literal spacing, so crossings read cleanly
  without any actual gap in the geometry. Within each of those two
  passes, every leg is drawn before any glyph, so a glyph always ends up
  visually on top of every leg regardless of stitch order. A glyph's own
  body (legs excluded) is authored to always fit inside a circle of
  radius `GLYPH_HALO_RADIUS_RATIO * cellSize` (a quarter of a cell) —
  that circle gets filled + thick-outlined in the background color right
  before the symbol is drawn on top, which is what actually keeps a
  glyph's interior clean; there's no more per-shape fill/casing logic.
  `nominalSize` (glyph scale) is derived from that same radius, not an
  independent constant. Double crochet's *symbol* is identical to single
  crochet's; its yarn-over is marked as a diagonal tick on the *leg*
  instead (`YARN_OVERS` in `stitchGlyphs.ts` — a future treble would just
  be 2 ticks, no new glyph shape needed).
- A stitch type can have more than one glyph **variant** (e.g. chain
  stitch: circle or a filled dot) — `GLYPH_VARIANTS` in `stitchGlyphs.ts`.
  Which variant is used is a per-pattern choice, `Pattern.glyphVariants:
  Partial<Record<StitchType, string>>`, missing entries fall back to
  each type's first/default variant. `StitchIcon.tsx` renders straight
  from this same variant data (as SVG) rather than a hand-duplicated
  icon set, so toolbar/picker previews can never drift from the canvas.

## Conventions
- New stitch types: add to `StitchType`, `ALL_STITCH_TYPES` and
  `ATTACHMENT_ARITY` in `src/types/pattern.ts`, add an entry (with one or
  more variants) + a yarn-over count to `GLYPH_VARIANTS`/`YARN_OVERS` in
  `stitchGlyphs.ts` (local unit space, magnitude ≤ 0.5 so it fits the
  halo circle; default attachment direction is straight down: `{x:0,
  y:+0.5}`), add labels (`stitch.*` and any new `glyphVariant.*`) to
  every locale file under `src/i18n/locales/*/common.json`. No
  `StitchIcon.tsx` change needed — it renders from `GLYPH_VARIANTS`
  automatically.
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
8. Export ✅ — PDF only (`src/features/export/exportPdf.ts`, jsPDF,
   lazy-loaded via dynamic `import()` on click so its ~400KB doesn't
   bloat the main bundle): a snapshot of the live chart canvas plus a
   legend (icon + localized name + count) for every stitch type actually
   used, reusing `placeGlyph` so the legend icons can't drift from the
   chart. PNG-only export not implemented — not asked for yet.
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
11. UI polish round ✅: fixed Add-tool sweep only-hard-snapping bug, grid
    brightness slider (long-press `GuideToggle`), "no type selected"
    toggle, casing-based rendering for crossings (see "Data model"
    above), double crochet's yarn-over moved to the leg, long-press
    tooltip on palette icons (`useLongPress.ts`), "..." picker for which
    stitch types show in the quick-access row (`visibleStitchTypes`,
    persisted to `localStorage` — not pattern data, so not in IndexedDB)
12. Rendering/export polish round ✅: draw order is now three strictly
    sequential stages (sequence line, then legs, then symbols), each its
    own full background-then-color double pass — was previously legs+
    symbols interleaved per-pass, sequence line was a single stroke not
    double-lined. Sequence line visibility is now toggleable
    (`SequenceToggle.tsx`, same pattern as `GuideToggle`). PDF export:
    fixed Cyrillic (and anything non-WinAnsi) coming out as mojibade —
    jsPDF's built-in fonts don't cover those glyphs, so every label is
    now rasterized via canvas 2D text rendering first and placed as an
    image (`textToImage`/`drawText` in `exportPdf.ts`), never
    `doc.text()` directly.
13. Beta + feedback loop
14. Topological/anchor-based rework ✅: `attachments` (raw string ids)
    replaced by polymorphic `anchors` (`Anchor` union: crown/post/
    magicRing/chainSpace); new `Thread`/`Layer`/`Group` entities;
    `thread`/`layer`/`side` made required on `Stitch`; `Thread` gained a
    4-color scheme (active/passive × right/wrong) driving stitch color,
    with a stitch's own `color` overriding only on the active thread;
    `marker` now renders as a bright badge. See "Data model" above.
    Sequence line recolored to plain gray with its own brightness
    control (`sequenceBrightness`/`SequenceToggle.tsx`, mirrors
    `GuideToggle.tsx`), replacing the old direction-coded blue/orange.
15. Stitch-properties UI ✅: `StitchProperties.tsx`, shown in the footer
    below the palette whenever there's a selection. Side toggle (flips
    the whole selection's `side`), marker toggle (bright-badge flag),
    thread picker, layer picker. Superseded by item 16 below (tap/
    long-press split, single thread color, layer grid+shift editing).
16. Toolbar interaction convention + thread/layer settings popups ✅:
    every toolbar control now follows one rule — tap picks/toggles,
    long-press *or right-click* opens a settings popup
    (`useLongPress.ts` gained `onContextMenu` so every existing user of
    the hook got right-click for free). Thread color simplified from the
    4-key scheme to one `Thread.color`, with the wrong side drawn same-hue/
    reduced-saturation instead (`sideContrastAmount`/`showSideContrast` +
    `SideContrastToggle.tsx`, mirrors Guide/Sequence). `StitchProperties.tsx`'s
    thread/layer buttons: tap opens a quick-select list (+ "add"),
    long-press/right-click opens a settings popup for the *current* one —
    thread: name, color, float loop-size spinner; layer: name, grid-kind
    switch (rectangular/radial), and x/y/angle shift from canvas center.
    Canvas is no longer clipped to `rows×cols` — it grows to fit the
    actual stitch bounding box (`contentExtent()`), and a "fit to
    pattern" button (`ResetViewButton.tsx`) zooms/scrolls to show it all.
    Groups and the anchor editor (loop/post-side/offset UI) are still not
    built; radial-grid rendering itself (as opposed to just storing the
    grid kind) is still not built either.

## Known issues
- "More stitch types" popup: toggling a row *on* closes the popup;
  toggling one *off* does not — should be symmetric either way.
- Dragging while a popup is open still pans/drags the whole app
  interface. A `touch-none` fix was tried on every full-screen
  click-outside overlay button but did not resolve it — needs another
  look at the actual cause.

## Icon regeneration
Source is `src-icon/icon.svg`. Regenerate PNGs with:
```
rsvg-convert -w 192 -h 192 src-icon/icon.svg -o public/icon-192.png
rsvg-convert -w 512 -h 512 src-icon/icon.svg -o public/icon-512.png
rsvg-convert -w 180 -h 180 src-icon/icon.svg -o public/apple-touch-icon.png
cp src-icon/icon.svg public/favicon.svg
```
