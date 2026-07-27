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
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth'
import { auth, isFirebaseConfigured } from '../lib/firebase'
import { createUserProfileDoc, getUserProfile } from '../services/api'
import {
  clearDemoProfile,
  findDemoAccount,
  loadDemoProfile,
  saveDemoProfile,
} from '../lib/demo'
import type { UserProfile } from '../types'

interface RegisterInput {
  name: string
  email: string
  password: string
  unit?: string
}

interface AuthContextValue {
  user: User | null
  profile: UserProfile | null
  loading: boolean
  configured: boolean
  isDemo: boolean
  login: (email: string, password: string) => Promise<UserProfile>
  register: (input: RegisterInput) => Promise<UserProfile>
  logout: () => Promise<void>
  refreshProfile: () => Promise<void>
  setProfile: (profile: UserProfile | null) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

function friendlyAuthError(err: unknown): string {
  const code = (err as { code?: string })?.code ?? ''
  if (code.includes('email-already-in-use')) return 'Este e-mail já está cadastrado. Tente entrar.'
  if (code.includes('invalid-email')) return 'E-mail inválido.'
  if (code.includes('weak-password')) return 'Senha fraca. Use pelo menos 6 caracteres.'
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
  const [isDemo, setIsDemo] = useState(false)
  const [loading, setLoading] = useState(true)

  const loadProfile = useCallback(async (uid: string) => {
    const p = await getUserProfile(uid)
    setProfile(p)
  }, [])

  useEffect(() => {
    const demo = loadDemoProfile()
    if (demo) {
      setProfile(demo)
      setIsDemo(true)
      setLoading(false)
      return
    }

    if (!isFirebaseConfigured || !auth) {
      setLoading(false)
      return
    }

    const unsub = onAuthStateChanged(auth, async (next) => {
      setUser(next)
      setIsDemo(false)
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
    const demo = findDemoAccount(email.trim(), password)
    if (demo) {
      saveDemoProfile(demo.profile)
      setIsDemo(true)
      setUser(null)
      setProfile(demo.profile)
      return demo.profile
    }

    if (!auth || !isFirebaseConfigured) {
      throw new Error('Use admin@fitgym.app / fitgym123 ou configure o Firebase')
    }

    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password)
      let p = await getUserProfile(cred.user.uid)
      if (!p) {
        p = await createUserProfileDoc({
          uid: cred.user.uid,
          name: cred.user.displayName || email.split('@')[0],
          email: cred.user.email || email,
        })
      }
      if (!p.active) {
        await signOut(auth)
        throw new Error('Conta desativada. Fale com a academia.')
      }
      clearDemoProfile()
      setIsDemo(false)
      setProfile(p)
      return p
    } catch (err) {
      throw new Error(friendlyAuthError(err))
    }
  }, [])

  const register = useCallback(async (input: RegisterInput) => {
    if (!auth || !isFirebaseConfigured) {
      throw new Error('Firebase não configurado. Não é possível criar conta agora.')
    }
    try {
      const cred = await createUserWithEmailAndPassword(
        auth,
        input.email.trim(),
        input.password,
      )
      await updateProfile(cred.user, { displayName: input.name.trim() })
      const p = await createUserProfileDoc({
        uid: cred.user.uid,
        name: input.name,
        email: input.email,
        unit: input.unit,
      })
      clearDemoProfile()
      setIsDemo(false)
      setUser(cred.user)
      setProfile(p)
      return p
    } catch (err) {
      throw new Error(friendlyAuthError(err))
    }
  }, [])

  const logout = useCallback(async () => {
    clearDemoProfile()
    setIsDemo(false)
    if (auth) await signOut(auth)
    setUser(null)
    setProfile(null)
  }, [])

  const refreshProfile = useCallback(async () => {
    if (isDemo) {
      const demo = loadDemoProfile()
      if (demo) setProfile(demo)
      return
    }
    if (user) await loadProfile(user.uid)
  }, [isDemo, loadProfile, user])

  const value = useMemo(
    () => ({
      user,
      profile,
      loading,
      configured: isFirebaseConfigured,
      isDemo,
      login,
      register,
      logout,
      refreshProfile,
      setProfile: (next: UserProfile | null) => {
        setProfile(next)
        if (isDemo && next) saveDemoProfile(next)
      },
    }),
    [user, profile, loading, isDemo, login, register, logout, refreshProfile],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider')
  return ctx
}
