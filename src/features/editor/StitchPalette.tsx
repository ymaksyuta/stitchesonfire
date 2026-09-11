import { useTranslation } from 'react-i18next'
import { usePatternStore } from '../../store/patternStore'
import type { StitchType } from '../../types/pattern'

const STITCHES: { type: StitchType; labelKey: string }[] = [
  { type: 'chain', labelKey: 'stitch.chain' },
  { type: 'single', labelKey: 'stitch.single' },
  { type: 'double', labelKey: 'stitch.double' },
  { type: 'slipStitch', labelKey: 'stitch.slipStitch' },
]

// Muted, business-appropriate accents — not a full rainbow.
const COLORS: { value: string | undefined; labelKey: string }[] = [
  { value: undefined, labelKey: 'color.default' },
  { value: '#b45309', labelKey: 'color.amber' },
  { value: '#b91c1c', labelKey: 'color.rust' },
  { value: '#166534', labelKey: 'color.sage' },
  { value: '#1d4ed8', labelKey: 'color.slateBlue' },
]

export function StitchPalette() {
  const { t } = useTranslation()
  const { activeStitch, setActiveStitch, activeColor, setActiveColor } =
    usePatternStore()

  return (
    <div className="p-2">
      <div className="flex gap-2 overflow-x-auto">
        {STITCHES.map(({ type, labelKey }) => (
          <button
            key={type}
            onClick={() => setActiveStitch(type)}
            className={`shrink-0 rounded-lg border px-3 py-2 text-sm ${
              activeStitch === type
                ? 'border-zinc-900 bg-zinc-900 text-white'
                : 'border-zinc-300 bg-white text-zinc-700'
            }`}
          >
            {t(labelKey)}
          </button>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-2 overflow-x-auto">
        {COLORS.map(({ value, labelKey }) => (
          <button
            key={value ?? 'default'}
            onClick={() => setActiveColor(value)}
            aria-label={t(labelKey)}
            aria-pressed={activeColor === value}
            className={`h-6 w-6 shrink-0 rounded-full border-2 ${
              activeColor === value ? 'border-zinc-900' : 'border-transparent'
            }`}
            style={{ backgroundColor: value ?? '#18181b' }}
          />
        ))}
      </div>
    </div>
  )
}
