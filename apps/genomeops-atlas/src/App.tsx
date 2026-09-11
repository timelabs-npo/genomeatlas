import { useEffect, useState } from 'react'
import { AdvancedAtlas } from './advanced/AdvancedAtlas'
import { LanguageSwitch } from './components/LanguageSwitch'
import { ROUTINE_LOCALE_KEY, type RoutineLocale } from './lib/routine'
import { RoutineGuide } from './views/RoutineGuide'
import { Workbench } from './views/Workbench'
import './workbench.css'

const initialLocale = (): RoutineLocale => {
  try {
    const saved = window.localStorage.getItem(ROUTINE_LOCALE_KEY)
    if (saved === 'en' || saved === 'ru') return saved
  } catch { /* Browsing without storage still supports both languages. */ }
  return window.navigator.language.toLowerCase().startsWith('ru') ? 'ru' : 'en'
}
const modeFromHash = () => new URLSearchParams(window.location.hash.slice(1)).get('mode')

export default function App() {
  const [locale, setLocale] = useState<RoutineLocale>(initialLocale)
  const [mode, setMode] = useState(modeFromHash)

  useEffect(() => {
    const readMode = () => setMode(modeFromHash())
    window.addEventListener('hashchange', readMode)
    return () => window.removeEventListener('hashchange', readMode)
  }, [])

  useEffect(() => {
    try { window.localStorage.setItem(ROUTINE_LOCALE_KEY, locale) } catch { /* Storage is optional. */ }
    document.documentElement.lang = mode === 'guide' ? locale : 'en'
  }, [locale, mode])

  const navigate = (next: 'advanced' | 'guide' | null) => {
    window.location.hash = next ? `mode=${next}${next === 'advanced' ? '&view=evidence' : ''}` : 'section=home'
    setMode(next)
    window.scrollTo({ top: 0 })
  }

  if (mode === 'guide') {
    return <div className="wb-preserved-guide"><div className="wb-return"><button onClick={() => navigate(null)}>Back to GenomeAtlas Workbench</button></div><RoutineGuide locale={locale} onLocaleChange={setLocale} onAdvanced={() => navigate('advanced')} /></div>
  }
  if (mode === 'advanced') {
    return <div className="advanced-boundary"><div className="advanced-return-bar"><button onClick={() => navigate(null)}>Back to GenomeAtlas Workbench</button><span>GenomeOps research atlas</span><LanguageSwitch locale={locale} onChange={setLocale} label="Language" /></div><AdvancedAtlas /></div>
  }
  return <Workbench onOpenAtlas={() => navigate('advanced')} onOpenGuide={() => navigate('guide')} />
}
