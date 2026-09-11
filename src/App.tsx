import { useTranslation } from 'react-i18next'
import { StitchGrid } from './features/editor/StitchGrid'
import { StitchPalette } from './features/editor/StitchPalette'
import { usePatternStore } from './store/patternStore'
import { AppMenu } from './components/AppMenu'
import { LanguageSwitcher } from './components/LanguageSwitcher'

function App() {
  const { t } = useTranslation()
  const { pattern, setPatternName } = usePatternStore()

  const handleNameBlur = () => {
    if (pattern.name.trim() === '') setPatternName(t('editor.untitled'))
  }

  return (
    <div className="flex h-full flex-col bg-zinc-100">
      <header className="flex items-center gap-2 border-b border-zinc-200 bg-white px-3 py-2">
        <AppMenu />
        <input
          value={pattern.name}
          onChange={(e) => setPatternName(e.target.value)}
          onBlur={handleNameBlur}
          placeholder={t('editor.untitled')}
          aria-label={t('editor.untitled')}
          className="min-w-0 flex-1 rounded-md bg-transparent px-2 py-1 text-lg font-semibold text-zinc-900 focus:bg-zinc-50 focus:outline-none"
        />
        <LanguageSwitcher />
      </header>
      <main className="flex-1 overflow-hidden p-4">
        <StitchGrid />
      </main>
      <footer className="border-t border-zinc-200 bg-white">
        <StitchPalette />
      </footer>
    </div>
  )
}

export default App
