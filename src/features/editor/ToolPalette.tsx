import { useTranslation } from 'react-i18next'
import { usePatternStore, type Tool } from '../../store/patternStore'
import { ToolIcon } from './ToolIcon'

const TOOLS: { tool: Exclude<Tool, null>; labelKey: string }[] = [
  { tool: 'add', labelKey: 'tool.add' },
  { tool: 'select', labelKey: 'tool.select' },
  { tool: 'delete', labelKey: 'tool.delete' },
  { tool: 'move', labelKey: 'tool.move' },
]

export function ToolPalette() {
  const { t } = useTranslation()
  const { activeTool, setActiveTool, undo, redo, history } = usePatternStore()

  return (
    <div className="flex items-center gap-2 overflow-x-auto">
      {TOOLS.map(({ tool, labelKey }) => (
        <button
          key={tool}
          type="button"
          onClick={() => setActiveTool(tool)}
          aria-label={t(labelKey)}
          aria-pressed={activeTool === tool}
          title={t(labelKey)}
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${
            activeTool === tool
              ? 'border-zinc-900 bg-zinc-100'
              : 'border-zinc-300 bg-white'
          }`}
        >
          <ToolIcon tool={tool} />
        </button>
      ))}
      <div className="ml-auto flex shrink-0 gap-1">
        <button
          type="button"
          onClick={undo}
          disabled={history.past.length === 0}
          aria-label={t('editor.undo')}
          title={t('editor.undo')}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-300 text-zinc-700 disabled:opacity-30"
        >
          ↶
        </button>
        <button
          type="button"
          onClick={redo}
          disabled={history.future.length === 0}
          aria-label={t('editor.redo')}
          title={t('editor.redo')}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-300 text-zinc-700 disabled:opacity-30"
        >
          ↷
        </button>
      </div>
    </div>
  )
}
