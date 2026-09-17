import { jsPDF } from 'jspdf'
import type { Pattern, StitchType } from '../../types/pattern'
import { ALL_STITCH_TYPES } from '../../types/pattern'
import { placeGlyph } from '../editor/stitchGlyphs'

/**
 * jsPDF's built-in fonts (Helvetica etc.) only cover WinAnsi/Latin
 * glyphs — Cyrillic (or anything else outside that set) comes out as
 * mojibake with `doc.text()`. Route every label through the browser's
 * own canvas text rendering instead (which has no such limitation),
 * then place the result as an image. `doc.text(x, y)` positions the
 * text's baseline, so this returns enough to reproduce that placement.
 */
function textToImage(
  text: string,
  fontSizePt: number,
  color: string,
  fontWeight: 'normal' | 'bold' = 'normal',
): { dataUrl: string; widthPt: number; heightPt: number; baselinePt: number } {
  const font = `${fontWeight} ${fontSizePt}px sans-serif`
  const measure = document.createElement('canvas').getContext('2d')
  let widthPt = fontSizePt * text.length // fallback if measuring fails
  if (measure) {
    measure.font = font
    widthPt = Math.ceil(measure.measureText(text).width) + 2
  }
  const baselinePt = fontSizePt * 1.0
  const heightPt = fontSizePt * 1.3

  const dpr = 3 // oversample for a crisp look at print resolution
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, widthPt * dpr)
  canvas.height = Math.max(1, heightPt * dpr)
  const ctx = canvas.getContext('2d')
  if (!ctx) return { dataUrl: '', widthPt: 0, heightPt: 0, baselinePt: 0 }
  ctx.scale(dpr, dpr)
  ctx.font = font
  ctx.fillStyle = color
  ctx.textBaseline = 'alphabetic'
  ctx.fillText(text, 1, baselinePt)

  return { dataUrl: canvas.toDataURL('image/png'), widthPt, heightPt, baselinePt }
}

/** Place text (as an image, see textToImage) so its baseline lands at
 * PDF coordinate (x, y) — matching how doc.text(text, x, y) positions. */
function drawText(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  fontSizePt: number,
  color = '#18181b',
  fontWeight: 'normal' | 'bold' = 'normal',
) {
  const img = textToImage(text, fontSizePt, color, fontWeight)
  if (!img.dataUrl) return
  doc.addImage(img.dataUrl, 'PNG', x, y - img.baselinePt, img.widthPt, img.heightPt)
}

/** Render one stitch type's glyph (using its chosen variant for this
 * pattern) to a small standalone PNG, for the legend — reuses the exact
 * same geometry as the chart itself, so the legend can never drift from
 * what's actually drawn. */
function renderLegendIcon(type: StitchType, variantId: string | undefined, sizePt: number): string {
  const dpr = 3
  const canvas = document.createElement('canvas')
  canvas.width = sizePt * dpr
  canvas.height = sizePt * dpr
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''
  ctx.scale(dpr, dpr)

  const { shape } = placeGlyph(type, variantId, {
    posX: sizePt / 2,
    posY: sizePt / 2,
    targetAngle: null,
    nominalSize: sizePt * 0.5,
  })
  ctx.strokeStyle = '#18181b'
  ctx.fillStyle = '#18181b'
  ctx.lineWidth = Math.max(1, sizePt * 0.09)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  for (const poly of shape) {
    ctx.beginPath()
    poly.points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)))
    if (poly.closed) ctx.closePath()
    if (poly.filled) ctx.fill()
    ctx.stroke()
  }
  return canvas.toDataURL('image/png')
}

export interface ExportLabels {
  title: string
  legendTitle: string
  stitchNames: Record<StitchType, string>
  countLabel: (count: number) => string
}

/**
 * Export the current chart (a snapshot of the live canvas) plus a legend
 * of every stitch type actually used, to a downloadable PDF.
 */
export function exportPatternToPdf(
  pattern: Pattern,
  chartCanvas: HTMLCanvasElement,
  labels: ExportLabels,
) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 36

  drawText(doc, labels.title, margin, margin, 16, '#18181b', 'bold')

  const chartDataUrl = chartCanvas.toDataURL('image/png')
  const maxImgWidth = pageWidth - margin * 2
  const maxImgHeight = pageHeight * 0.55
  const scale = Math.min(
    maxImgWidth / chartCanvas.width,
    maxImgHeight / chartCanvas.height,
    1,
  )
  const imgWidth = chartCanvas.width * scale
  const imgHeight = chartCanvas.height * scale
  const imgY = margin + 20
  doc.addImage(chartDataUrl, 'PNG', margin, imgY, imgWidth, imgHeight)

  const counts = new Map<StitchType, number>()
  for (const s of pattern.stitches) counts.set(s.type, (counts.get(s.type) ?? 0) + 1)

  let y = imgY + imgHeight + 30
  if (counts.size > 0) {
    drawText(doc, labels.legendTitle, margin, y, 13, '#18181b', 'bold')
    y += 22
    const iconSize = 18
    for (const type of ALL_STITCH_TYPES) {
      const count = counts.get(type)
      if (!count) continue
      if (y > pageHeight - margin) {
        doc.addPage()
        y = margin + iconSize
      }
      const iconDataUrl = renderLegendIcon(type, pattern.glyphVariants?.[type], 64)
      if (iconDataUrl) {
        doc.addImage(iconDataUrl, 'PNG', margin, y - iconSize + 3, iconSize, iconSize)
      }
      drawText(
        doc,
        `${labels.stitchNames[type]} \u2014 ${labels.countLabel(count)}`,
        margin + iconSize + 10,
        y,
        11,
      )
      y += 24
    }
  }

  saveBlob(doc.output('blob'), `${pattern.name || 'pattern'}.pdf`)
}

/**
 * Trigger a file download directly, instead of relying on jsPDF's built-in
 * `doc.save()`. That helper defers its click via `setTimeout` and dispatches
 * it on an `<a>` never attached to the DOM — fine in most browsers, but it
 * burns through the tap's user-activation window by the time it fires. That
 * combined with being several `await`s removed from the original click
 * handler (clearing selection, dynamic-importing this module) is enough for
 * an installed Firefox PWA window to silently drop the download, even
 * though the same window works fine as a regular browser tab. Doing it
 * synchronously with an attached anchor avoids that gap.
 */
function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 40_000)
}
