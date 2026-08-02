import type { UserRole } from '../types'

export function normalizeRole(raw: string | undefined): UserRole {
  if (raw === 'super_admin') return 'super_admin'
  if (raw === 'gym_admin' || raw === 'admin') return 'gym_admin'
  if (raw === 'professor') return 'professor'
  return 'aluno'
}

export function isGymStaff(role: UserRole): boolean {
  return role === 'gym_admin' || role === 'professor'
}

export function canModerateCommunity(role: UserRole): boolean {
  return role === 'gym_admin'
}

export function canManageStudents(role: UserRole): boolean {
  return role === 'gym_admin' || role === 'professor'
}

export function homeRoute(role: UserRole): string {
  if (role === 'super_admin') return '/platform'
  if (isGymStaff(role)) return '/admin'
  return '/'
}

export const GYM_STAFF_ROLES: UserRole[] = ['gym_admin', 'professor']
