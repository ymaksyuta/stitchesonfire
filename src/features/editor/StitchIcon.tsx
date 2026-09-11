import type { StitchType } from '../../types/pattern'

export function StitchIcon({ type }: { type: StitchType }) {
  const common = {
    viewBox: '0 0 24 24',
    className: 'h-5 w-5',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
  }

  switch (type) {
    case 'chain':
      return (
        <svg {...common}>
          <ellipse cx="12" cy="12" rx="5.5" ry="8.5" />
        </svg>
      )
    case 'single':
      return (
        <svg {...common}>
          <line x1="12" y1="3" x2="12" y2="21" />
          <line x1="7" y1="12" x2="17" y2="12" />
        </svg>
      )
    case 'double':
      return (
        <svg {...common}>
          <line x1="12" y1="3" x2="12" y2="21" />
          <line x1="8" y1="15" x2="16" y2="9" />
        </svg>
      )
    case 'slipStitch':
      return (
        <svg {...common} fill="currentColor" stroke="none">
          <circle cx="12" cy="12" r="3.5" />
        </svg>
      )
  }
}
