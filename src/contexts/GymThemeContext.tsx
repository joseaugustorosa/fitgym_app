import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { applyGymTheme, type GymThemeId } from '../lib/gymThemes'
import { getGym, updateGymTheme } from '../services/api'
import { useAuth } from './AuthContext'

interface GymThemeContextValue {
  themeId: GymThemeId
  gymName: string | null
  loading: boolean
  setTheme: (themeId: GymThemeId) => Promise<void>
  refreshTheme: () => Promise<void>
}

const GymThemeContext = createContext<GymThemeContextValue | null>(null)

export function GymThemeProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth()
  const [themeId, setThemeId] = useState<GymThemeId>('ember')
  const [gymName, setGymName] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const loadTheme = useCallback(async (gymId: string | null | undefined) => {
    if (!gymId) {
      setThemeId('ember')
      setGymName(null)
      applyGymTheme('ember')
      return
    }
    setLoading(true)
    try {
      const gym = await getGym(gymId)
      const id = gym?.themeId ?? 'ember'
      setThemeId(id)
      setGymName(gym?.name ?? null)
      applyGymTheme(id)
    } catch {
      applyGymTheme('ember')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadTheme(profile?.gymId)
  }, [profile?.gymId, loadTheme])

  const setTheme = useCallback(
    async (next: GymThemeId) => {
      if (!profile?.gymId) {
        throw new Error('Perfil sem academia vinculada')
      }
      try {
        await updateGymTheme(profile.gymId, next)
      } catch (err) {
        const code = (err as { code?: string })?.code ?? ''
        if (code.includes('permission-denied')) {
          throw new Error('PERMISSION_DENIED')
        }
        throw err
      }
      setThemeId(next)
      applyGymTheme(next)
    },
    [profile?.gymId],
  )

  const value = useMemo(
    () => ({
      themeId,
      gymName,
      loading,
      setTheme,
      refreshTheme: () => loadTheme(profile?.gymId),
    }),
    [themeId, gymName, loading, setTheme, loadTheme, profile?.gymId],
  )

  return <GymThemeContext.Provider value={value}>{children}</GymThemeContext.Provider>
}

export function useGymTheme() {
  const ctx = useContext(GymThemeContext)
  if (!ctx) throw new Error('useGymTheme deve ser usado dentro de GymThemeProvider')
  return ctx
}
