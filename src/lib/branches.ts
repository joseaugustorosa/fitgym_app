import type { GymBranch, UserProfile } from '../types'

export function branchName(
  branchId: string | null | undefined,
  branches: GymBranch[],
  fallbackUnit = '',
): string {
  if (!branchId) return fallbackUnit
  return branches.find((b) => b.id === branchId)?.name ?? fallbackUnit
}

export function studentBranchLabel(
  student: Pick<UserProfile, 'branchId' | 'unit'>,
  branches: GymBranch[],
): string | null {
  const name = branchName(student.branchId, branches, student.unit)
  return name.trim() || null
}
