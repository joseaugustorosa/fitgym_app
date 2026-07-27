import type { UserProfile } from '../types'

export const DEMO_SESSION_KEY = 'fitgym_demo_session'

export const DEMO_ACCOUNTS = [
  {
    email: 'admin@fitgym.app',
    password: 'fitgym123',
    profile: {
      uid: 'demo-admin',
      name: 'Admin FitGym',
      email: 'admin@fitgym.app',
      role: 'admin' as const,
      unit: 'Unidade Centro',
      avatarInitial: 'A',
      active: true,
      createdAt: new Date().toISOString(),
      streakDays: 12,
      lastCheckInAt: new Date(Date.now() - 86400000).toISOString(),
      assignedWorkoutPlanId: 'treino-a',
      assignedMealPlanId: 'default-meal-plan',
    } satisfies UserProfile,
  },
  {
    email: 'aluno@fitgym.app',
    password: 'fitgym123',
    profile: {
      uid: 'demo-aluno',
      name: 'José Aluno',
      email: 'aluno@fitgym.app',
      role: 'aluno' as const,
      unit: 'Unidade Centro',
      avatarInitial: 'J',
      active: true,
      createdAt: new Date().toISOString(),
      streakDays: 5,
      lastCheckInAt: new Date(Date.now() - 86400000).toISOString(),
      assignedWorkoutPlanId: 'treino-a',
      assignedMealPlanId: 'default-meal-plan',
    } satisfies UserProfile,
  },
] as const

export function findDemoAccount(email: string, password: string) {
  return DEMO_ACCOUNTS.find(
    (a) => a.email.toLowerCase() === email.toLowerCase() && a.password === password,
  )
}

export function loadDemoProfile(): UserProfile | null {
  try {
    const raw = sessionStorage.getItem(DEMO_SESSION_KEY)
    if (!raw) return null
    return JSON.parse(raw) as UserProfile
  } catch {
    return null
  }
}

export function saveDemoProfile(profile: UserProfile) {
  sessionStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(profile))
}

export function clearDemoProfile() {
  sessionStorage.removeItem(DEMO_SESSION_KEY)
}
