import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  Timestamp,
  type DocumentData,
} from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { requireDb, requireFunctions, isFirebaseConfigured } from '../lib/firebase'
import type { BillingStatus, Gym, GymBillingMonth, UserProfile } from '../types'
import { normalizeRole } from '../lib/roles'
import { isGymThemeId } from '../lib/gymThemes'
import { mapNutritionGoals } from '../lib/nutrition'
import { initialFromName } from '../lib/dates'

function requireConfigured() {
  if (!isFirebaseConfigured) {
    throw new Error('Firebase não configurado. Verifique o arquivo .env')
  }
}

function toIso(value: unknown): string {
  if (!value) return new Date().toISOString()
  if (typeof value === 'string') return value
  if (value instanceof Timestamp) return value.toDate().toISOString()
  return new Date().toISOString()
}

function mapGym(id: string, data: DocumentData): Gym {
  return {
    id,
    name: data.name ?? '',
    contactEmail: data.contactEmail ?? '',
    planAmount: data.planAmount ?? 0,
    billingDay: data.billingDay ?? 1,
    status: data.status === 'suspended' ? 'suspended' : 'active',
    active: data.active !== false,
    themeId: isGymThemeId(String(data.themeId)) ? data.themeId : 'ember',
    createdAt: toIso(data.createdAt),
  }
}

function mapUser(id: string, data: DocumentData): UserProfile {
  return {
    uid: id,
    name: data.name ?? '',
    email: data.email ?? '',
    role: normalizeRole(data.role),
    gymId: data.gymId ?? null,
    branchId: data.branchId ?? null,
    unit: data.unit ?? '',
    avatarInitial: data.avatarInitial ?? initialFromName(data.name ?? '?'),
    active: data.active !== false,
    createdAt: toIso(data.createdAt),
    streakDays: data.streakDays ?? 0,
    lastCheckInAt: data.lastCheckInAt ? toIso(data.lastCheckInAt) : null,
    assignedWorkoutPlanId: data.assignedWorkoutPlanId ?? null,
    assignedMealPlanId: data.assignedMealPlanId ?? null,
    activeWorkoutSessionId: data.activeWorkoutSessionId ?? null,
    nutritionGoals: mapNutritionGoals(data.nutritionGoals),
  }
}

export async function listGyms(): Promise<Gym[]> {
  requireConfigured()
  const snap = await getDocs(query(collection(requireDb(), 'gyms'), orderBy('name', 'asc')))
  return snap.docs.map((d) => mapGym(d.id, d.data()))
}

export async function getGym(gymId: string): Promise<Gym | null> {
  requireConfigured()
  const snap = await getDoc(doc(requireDb(), 'gyms', gymId))
  if (!snap.exists()) return null
  return mapGym(snap.id, snap.data())
}

export async function createGym(input: {
  name: string
  contactEmail: string
  planAmount: number
  billingDay: number
}): Promise<Gym> {
  requireConfigured()
  const ref = doc(collection(requireDb(), 'gyms'))
  const data = {
    name: input.name.trim(),
    contactEmail: input.contactEmail.trim().toLowerCase(),
    planAmount: input.planAmount,
    billingDay: Math.min(28, Math.max(1, input.billingDay)),
    status: 'active',
    active: true,
    themeId: 'ember',
    createdAt: new Date().toISOString(),
  }
  await setDoc(ref, data)
  return mapGym(ref.id, data)
}

export async function updateGym(
  gymId: string,
  patch: Partial<Pick<Gym, 'name' | 'contactEmail' | 'planAmount' | 'billingDay' | 'status' | 'active'>>,
): Promise<void> {
  requireConfigured()
  await updateDoc(doc(requireDb(), 'gyms', gymId), patch)
}

export async function listGymStudents(gymId: string): Promise<UserProfile[]> {
  requireConfigured()
  const snap = await getDocs(query(collection(requireDb(), 'users'), where('gymId', '==', gymId)))
  return snap.docs.map((d) => mapUser(d.id, d.data())).sort((a, b) => a.name.localeCompare(b.name))
}

export async function listAllStudents(): Promise<UserProfile[]> {
  requireConfigured()
  const snap = await getDocs(query(collection(requireDb(), 'users'), where('role', '==', 'aluno')))
  return snap.docs.map((d) => mapUser(d.id, d.data())).sort((a, b) => a.name.localeCompare(b.name))
}

export async function createGymStaffRemote(input: {
  gymId: string
  name: string
  email: string
  role: 'gym_admin' | 'professor'
  password: string
}): Promise<{ uid: string }> {
  try {
    const fn = httpsCallable<typeof input, { uid: string }>(
      requireFunctions(),
      'createGymAdminInvite',
    )
    const res = await fn(input)
    return res.data
  } catch (err) {
    const anyErr = err as { message?: string; details?: string }
    throw new Error(
      String(anyErr.details || anyErr.message || 'Falha ao criar staff').replace(
        /^FirebaseError:\s*/i,
        '',
      ),
    )
  }
}

function monthKey(date = new Date()): string {
  return date.toISOString().slice(0, 7)
}

export async function listGymBilling(gymId: string): Promise<GymBillingMonth[]> {
  requireConfigured()
  const snap = await getDocs(
    query(
      collection(requireDb(), 'gymBilling'),
      where('gymId', '==', gymId),
      orderBy('dueDate', 'desc'),
    ),
  )
  return snap.docs.map((d) => {
    const data = d.data()
    return {
      id: d.id,
      gymId: data.gymId,
      amount: data.amount,
      dueDate: toIso(data.dueDate),
      status: data.status as BillingStatus,
      paidAt: data.paidAt ? toIso(data.paidAt) : null,
      notes: data.notes ?? '',
    }
  })
}

export async function ensureCurrentBilling(gym: Gym): Promise<GymBillingMonth> {
  requireConfigured()
  const key = monthKey()
  const id = `${gym.id}_${key}`
  const ref = doc(requireDb(), 'gymBilling', id)
  const snap = await getDoc(ref)
  if (snap.exists()) {
    const data = snap.data()
    return {
      id,
      gymId: gym.id,
      amount: data.amount,
      dueDate: toIso(data.dueDate),
      status: data.status as BillingStatus,
      paidAt: data.paidAt ? toIso(data.paidAt) : null,
      notes: data.notes ?? '',
    }
  }

  const now = new Date()
  const due = new Date(now.getFullYear(), now.getMonth(), gym.billingDay)
  const record = {
    gymId: gym.id,
    amount: gym.planAmount,
    dueDate: due.toISOString(),
    status: 'pending' as BillingStatus,
    paidAt: null,
    notes: '',
  }
  await setDoc(ref, record)
  return { id, ...record }
}

export async function setBillingStatus(
  billingId: string,
  status: BillingStatus,
  notes?: string,
): Promise<void> {
  requireConfigured()
  const patch: Record<string, unknown> = { status }
  if (notes !== undefined) patch.notes = notes
  if (status === 'paid') patch.paidAt = new Date().toISOString()
  await updateDoc(doc(requireDb(), 'gymBilling', billingId), patch)
}

export async function countActiveGyms(): Promise<number> {
  requireConfigured()
  const snap = await getDocs(
    query(collection(requireDb(), 'gyms'), where('active', '==', true)),
  )
  return snap.size
}

export async function countPlatformStudents(): Promise<number> {
  requireConfigured()
  const snap = await getDocs(query(collection(requireDb(), 'users'), where('role', '==', 'aluno')))
  return snap.size
}

export async function listOverdueBilling(): Promise<GymBillingMonth[]> {
  requireConfigured()
  const snap = await getDocs(
    query(collection(requireDb(), 'gymBilling'), where('status', '==', 'overdue')),
  )
  return snap.docs.map((d) => {
    const data = d.data()
    return {
      id: d.id,
      gymId: data.gymId,
      amount: data.amount,
      dueDate: toIso(data.dueDate),
      status: data.status as BillingStatus,
      paidAt: data.paidAt ? toIso(data.paidAt) : null,
      notes: data.notes ?? '',
    }
  })
}
