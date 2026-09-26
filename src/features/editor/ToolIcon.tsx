import type { Tool } from '../../store/patternStore'

export function ToolIcon({ tool }: { tool: Exclude<Tool, null> }) {
  switch (tool) {
    case 'add':
      return (
        <svg viewBox="0 0 24 24" className="h-5 w-5">
          <line x1="12" y1="5" x2="12" y2="19" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" />
          <line x1="5" y1="12" x2="19" y2="12" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" />
        </svg>
      )
    case 'select':
      return (
        <svg viewBox="0 0 24 24" className="h-5 w-5">
          <path
            d="M6 3 L6 20 L10.5 16 L13.5 21.5 L16 20 L13 14.5 L18.5 14 Z"
            fill="white"
            stroke="#166534"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
      )
    case 'delete':
      return (
        <svg viewBox="0 0 24 24" className="h-5 w-5">
          <line x1="5" y1="5" x2="19" y2="19" stroke="#dc2626" strokeWidth="3" strokeLinecap="round" />
          <line x1="19" y1="5" x2="5" y2="19" stroke="#dc2626" strokeWidth="3" strokeLinecap="round" />
        </svg>
      )
    case 'move':
      return (
        <svg viewBox="0 0 24 24" className="h-5 w-5">
          <line x1="4" y1="12" x2="20" y2="12" stroke="#6d28d9" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M8 8 L4 12 L8 16" fill="none" stroke="#6d28d9" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M16 8 L20 12 L16 16" fill="none" stroke="#6d28d9" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
  }
}
