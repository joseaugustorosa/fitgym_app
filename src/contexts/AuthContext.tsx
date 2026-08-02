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
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth'
import { auth, isFirebaseConfigured } from '../lib/firebase'
import { getUserProfile } from '../services/api'
import { homeRoute } from '../lib/roles'
import type { UserProfile } from '../types'

interface AuthContextValue {
  user: User | null
  profile: UserProfile | null
  loading: boolean
  configured: boolean
  login: (email: string, password: string) => Promise<UserProfile>
  logout: () => Promise<void>
  refreshProfile: () => Promise<void>
  setProfile: (profile: UserProfile | null) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

function friendlyAuthError(err: unknown): string {
  const code = (err as { code?: string })?.code ?? ''
  if (code.includes('invalid-email')) return 'E-mail inválido.'
  if (code.includes('invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found')) {
    return 'E-mail ou senha incorretos.'
  }
  if (code.includes('too-many-requests')) return 'Muitas tentativas. Aguarde um pouco e tente de novo.'
  if (err instanceof Error) return err.message
  return 'Não foi possível autenticar.'
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = useCallback(async (uid: string) => {
    const p = await getUserProfile(uid)
    setProfile(p)
  }, [])

  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      setLoading(false)
      return
    }

    const unsub = onAuthStateChanged(auth, async (next) => {
      setUser(next)
      if (next) {
        try {
          await loadProfile(next.uid)
        } catch {
          setProfile(null)
        }
      } else {
        setProfile(null)
      }
      setLoading(false)
    })
    return unsub
  }, [loadProfile])

  const login = useCallback(async (email: string, password: string) => {
    if (!auth || !isFirebaseConfigured) {
      throw new Error('Firebase não configurado. Verifique o arquivo .env')
    }

    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password)
      const p = await getUserProfile(cred.user.uid)
      if (!p) {
        await signOut(auth)
        throw new Error('Perfil não encontrado. Entre em contato com a academia.')
      }
      if (!p.active) {
        await signOut(auth)
        throw new Error('Conta desativada. Fale com a academia.')
      }
      setProfile(p)
      return p
    } catch (err) {
      throw new Error(friendlyAuthError(err))
    }
  }, [])

  const logout = useCallback(async () => {
    if (auth) await signOut(auth)
    setUser(null)
    setProfile(null)
  }, [])

  const refreshProfile = useCallback(async () => {
    if (user) await loadProfile(user.uid)
  }, [loadProfile, user])

  const value = useMemo(
    () => ({
      user,
      profile,
      loading,
      configured: isFirebaseConfigured,
      login,
      logout,
      refreshProfile,
      setProfile,
    }),
    [user, profile, loading, login, logout, refreshProfile],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider')
  return ctx
}

export { homeRoute }
