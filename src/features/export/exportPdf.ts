import { jsPDF } from 'jspdf'
import type { Pattern, StitchType } from '../../types/pattern'
import { ALL_STITCH_TYPES } from '../../types/pattern'
import { placeGlyph } from '../editor/stitchGlyphs'

/** Render one stitch type's glyph (using its chosen variant for this
 * pattern) to a small standalone PNG, for the legend — reuses the exact
 * same geometry as the chart itself, so the legend can never drift from
 * what's actually drawn. */
function renderLegendIcon(type: StitchType, variantId: string | undefined, sizePt: number): string {
  const dpr = 3 // oversample for a crisp look at print resolution
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

  doc.setFontSize(16)
  doc.text(labels.title, margin, margin)

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
    doc.setFontSize(13)
    doc.text(labels.legendTitle, margin, y)
    y += 20
    doc.setFontSize(11)
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
      doc.text(`${labels.stitchNames[type]} \u2014 ${labels.countLabel(count)}`, margin + iconSize + 10, y)
      y += 24
    }
  }

  doc.save(`${pattern.name || 'pattern'}.pdf`)
}
