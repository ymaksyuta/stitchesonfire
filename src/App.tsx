import { useTranslation } from 'react-i18next'
import { StitchGrid } from './features/editor/StitchGrid'
import { StitchPalette } from './features/editor/StitchPalette'
import { usePatternStore } from './store/patternStore'
import { AppMenu } from './components/AppMenu'
import { InfoButton } from './components/InfoButton'
import { LanguageSwitcher } from './components/LanguageSwitcher'
import { HelpButton } from './features/help/HelpButton'
import { HelpSearchBar } from './features/help/HelpSearchBar'
import { HelpInspectMode } from './features/help/HelpInspectMode'
import { HelpElementPopup } from './features/help/HelpElementPopup'
import { HelpPanel } from './features/help/HelpPanel'
import { useHelpStore } from './features/help/helpStore'

function App() {
  const { t } = useTranslation()
  const { pattern, setPatternName } = usePatternStore()
  const inspectMode = useHelpStore((s) => s.inspectMode)

  const handleNameBlur = () => {
    if (pattern.name.trim() === '') setPatternName(t('editor.untitled'))
  }

  return (
    <div className="flex h-full flex-col bg-zinc-100">
      <header className="flex items-center gap-2 border-b border-zinc-200 bg-white px-3 py-2">
        <div data-help-id="header.menu">
          <AppMenu />
        </div>
        <InfoButton />
        {inspectMode ? (
          <HelpSearchBar />
        ) : (
          <input
            data-help-id="header.name"
            value={pattern.name}
            onChange={(e) => setPatternName(e.target.value)}
            onBlur={handleNameBlur}
            placeholder={t('editor.untitled')}
            aria-label={t('editor.untitled')}
            className="min-w-0 flex-1 rounded-md bg-transparent px-2 py-1 text-lg font-semibold text-zinc-900 focus:bg-zinc-50 focus:outline-none"
          />
        )}
        <HelpButton />
        <div data-help-id="header.language">
          <LanguageSwitcher />
        </div>
      </header>
      <main className="flex-1 overflow-hidden p-4" data-help-id="canvas.grid">
        <StitchGrid />
      </main>
      <footer className="border-t border-zinc-200 bg-white">
        <StitchPalette />
      </footer>

      <HelpInspectMode />
      <HelpElementPopup />
      <HelpPanel />
    </div>
  )
}

export default App
