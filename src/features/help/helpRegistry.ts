/**
 * Single source of truth for in-app help content — mirrors the pattern
 * used for stitch glyphs (`GLYPH_VARIANTS`): no help text lives inside
 * components, only `data-help-id` markers that point back here.
 *
 * Adding or changing an interactive element? See CLAUDE.md's "Interface
 * help" section for the checklist — `helpRegistry.test.ts` enforces it.
 */

export interface HelpElementEntry {
  /** Matches a `data-help-id` attribute somewhere in the app. */
  id: string
  /** i18n key for a short, plain-language description (see locale files). */
  i18nKey: string
}

export interface HelpHowtoStep {
  /** i18n key for the step's instruction text. */
  textKey: string
  /** Optional element this step is about — lets the help panel highlight it. */
  elementId?: string
}

export interface HelpHowtoEntry {
  id: string
  titleKey: string
  steps: HelpHowtoStep[]
}

export const HELP_ELEMENTS: HelpElementEntry[] = [
  { id: 'header.menu', i18nKey: 'help.element.menu' },
  { id: 'header.name', i18nKey: 'help.element.name' },
  { id: 'header.language', i18nKey: 'help.element.language' },
  { id: 'menu.save', i18nKey: 'help.element.menuSave' },
  { id: 'menu.newPattern', i18nKey: 'help.element.menuNew' },
  { id: 'menu.export', i18nKey: 'help.element.menuExport' },
  { id: 'menu.myPatterns', i18nKey: 'help.element.menuPatterns' },
  { id: 'tools.add', i18nKey: 'help.element.toolAdd' },
  { id: 'tools.select', i18nKey: 'help.element.toolSelect' },
  { id: 'tools.delete', i18nKey: 'help.element.toolDelete' },
  { id: 'tools.move', i18nKey: 'help.element.toolMove' },
  { id: 'tools.undo', i18nKey: 'help.element.undo' },
  { id: 'tools.redo', i18nKey: 'help.element.redo' },
  { id: 'palette.stitchButton', i18nKey: 'help.element.stitchButton' },
  { id: 'palette.moreStitchTypes', i18nKey: 'help.element.moreStitches' },
  { id: 'palette.colorPicker', i18nKey: 'help.element.colorPicker' },
  { id: 'palette.guideToggle', i18nKey: 'help.element.guideToggle' },
  { id: 'palette.sequenceToggle', i18nKey: 'help.element.sequenceToggle' },
  { id: 'palette.sideContrastToggle', i18nKey: 'help.element.sideContrastToggle' },
  { id: 'palette.zoom', i18nKey: 'help.element.zoom' },
  { id: 'palette.resetView', i18nKey: 'help.element.resetView' },
  { id: 'properties.side', i18nKey: 'help.element.side' },
  { id: 'properties.marker', i18nKey: 'help.element.marker' },
  { id: 'properties.thread', i18nKey: 'help.element.thread' },
  { id: 'properties.layer', i18nKey: 'help.element.layer' },
  { id: 'canvas.grid', i18nKey: 'help.element.canvas' },
]

export const HELP_HOWTOS: HelpHowtoEntry[] = [
  {
    id: 'addStitches',
    titleKey: 'help.howto.addStitches.title',
    steps: [
      { textKey: 'help.howto.addStitches.step1', elementId: 'palette.stitchButton' },
      { textKey: 'help.howto.addStitches.step2', elementId: 'tools.add' },
      { textKey: 'help.howto.addStitches.step3', elementId: 'canvas.grid' },
    ],
  },
  {
    id: 'changeLanguage',
    titleKey: 'help.howto.changeLanguage.title',
    steps: [
      { textKey: 'help.howto.changeLanguage.step1', elementId: 'header.language' },
      { textKey: 'help.howto.changeLanguage.step2' },
    ],
  },
  {
    id: 'savePattern',
    titleKey: 'help.howto.savePattern.title',
    steps: [
      { textKey: 'help.howto.savePattern.step1', elementId: 'header.menu' },
      { textKey: 'help.howto.savePattern.step2', elementId: 'menu.save' },
      { textKey: 'help.howto.savePattern.step3', elementId: 'menu.myPatterns' },
    ],
  },
  {
    id: 'exportPdf',
    titleKey: 'help.howto.exportPdf.title',
    steps: [
      { textKey: 'help.howto.exportPdf.step1', elementId: 'header.menu' },
      { textKey: 'help.howto.exportPdf.step2', elementId: 'menu.export' },
    ],
  },
  {
    id: 'undoMistake',
    titleKey: 'help.howto.undoMistake.title',
    steps: [
      { textKey: 'help.howto.undoMistake.step1', elementId: 'tools.undo' },
      { textKey: 'help.howto.undoMistake.step2', elementId: 'tools.redo' },
    ],
  },
  {
    id: 'markSides',
    titleKey: 'help.howto.markSides.title',
    steps: [
      { textKey: 'help.howto.markSides.step1', elementId: 'tools.select' },
      { textKey: 'help.howto.markSides.step2', elementId: 'properties.side' },
      { textKey: 'help.howto.markSides.step3', elementId: 'palette.sideContrastToggle' },
    ],
  },
]
