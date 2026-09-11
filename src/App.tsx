import { useTranslation } from 'react-i18next'
import { StitchGrid } from './features/editor/StitchGrid'
import { StitchPalette } from './features/editor/StitchPalette'
import { PatternManager } from './features/editor/PatternManager'
import { PatternSizeControl } from './features/editor/PatternSizeControl'
import { LanguageSwitcher } from './components/LanguageSwitcher'

function App() {
  const { t } = useTranslation()

  return (
    <div className="flex h-full flex-col bg-zinc-100">
      <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-3">
        <h1 className="text-lg font-semibold text-zinc-900">
          {t('app.title')}
        </h1>
        <LanguageSwitcher />
      </header>
      <main className="flex-1 overflow-auto p-4">
        <StitchGrid />
      </main>
      <footer className="border-t border-zinc-200 bg-white">
        <div className="flex items-center justify-between border-b border-zinc-100 px-3 py-1.5">
          <PatternSizeControl />
        </div>
        <StitchPalette />
        <PatternManager />
      </footer>
    </div>
  )
}

export default App
