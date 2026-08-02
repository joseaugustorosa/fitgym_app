import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  applyColorMode,
  readColorModePreference,
  resolveColorMode,
  saveColorModePreference,
  type ColorModePreference,
  type ResolvedColorMode,
} from '../lib/colorMode'

interface ColorModeContextValue {
  preference: ColorModePreference
  mode: ResolvedColorMode
  setPreference: (next: ColorModePreference) => void
  toggleMode: () => void
}

const ColorModeContext = createContext<ColorModeContextValue | null>(null)

export function ColorModeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ColorModePreference>(() => readColorModePreference())
  const [mode, setMode] = useState<ResolvedColorMode>(() => resolveColorMode(readColorModePreference()))

  const syncMode = useCallback((nextPreference: ColorModePreference) => {
    const resolved = resolveColorMode(nextPreference)
    setMode(resolved)
    applyColorMode(resolved)
  }, [])

  const setPreference = useCallback(
    (next: ColorModePreference) => {
      setPreferenceState(next)
      saveColorModePreference(next)
      syncMode(next)
    },
    [syncMode],
  )

  const toggleMode = useCallback(() => {
    setPreference(mode === 'dark' ? 'light' : 'dark')
  }, [mode, setPreference])

  useEffect(() => {
    syncMode(preference)
  }, [preference, syncMode])

  useEffect(() => {
    if (preference !== 'system') return
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => syncMode('system')
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [preference, syncMode])

  const value = useMemo(
    () => ({ preference, mode, setPreference, toggleMode }),
    [preference, mode, setPreference, toggleMode],
  )

  return <ColorModeContext.Provider value={value}>{children}</ColorModeContext.Provider>
}

export function useColorMode() {
  const ctx = useContext(ColorModeContext)
  if (!ctx) throw new Error('useColorMode deve ser usado dentro de ColorModeProvider')
  return ctx
}
