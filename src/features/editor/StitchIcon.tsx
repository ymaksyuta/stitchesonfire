import type { StitchType } from '../../types/pattern'
import { resolveVariant } from './stitchGlyphs'

const SCALE = 18 // local unit ~0.5 -> 9px from center in a 24x24 viewBox

export function StitchIcon({ type, variantId }: { type: StitchType; variantId?: string }) {
  const variant = resolveVariant(type, variantId)
  const toSvgPoint = (p: { x: number; y: number }) => `${12 + p.x * SCALE},${12 + p.y * SCALE}`

  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5">
      {variant.shape.map((poly, i) => {
        const points = poly.points.map(toSvgPoint).join(' ')
        if (poly.closed) {
          return (
            <polygon
              key={i}
              points={points}
              fill={poly.filled ? 'currentColor' : 'none'}
              stroke={poly.filled ? 'none' : 'currentColor'}
              strokeWidth={2}
            />
          )
        }
        return (
          <polyline
            key={i}
            points={points}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
          />
        )
      })}
    </svg>
  )
}
