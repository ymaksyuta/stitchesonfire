import { useTranslation } from 'react-i18next'
import { usePatternStore } from '../../store/patternStore'
import type { StitchType } from '../../types/pattern'

const STITCHES: { type: StitchType; labelKey: string }[] = [
  { type: 'chain', labelKey: 'stitch.chain' },
  { type: 'single', labelKey: 'stitch.single' },
  { type: 'double', labelKey: 'stitch.double' },
  { type: 'slipStitch', labelKey: 'stitch.slipStitch' },
]

export function StitchPalette() {
  const { t } = useTranslation()
  const { activeStitch, setActiveStitch } = usePatternStore()

  return (
    <div className="flex gap-2 overflow-x-auto p-2">
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
  )
}
