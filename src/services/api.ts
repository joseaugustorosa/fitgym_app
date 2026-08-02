import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
  orderBy,
  limit,
  addDoc,
  deleteDoc,
  increment,
  Timestamp,
  type DocumentData,
} from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { requireDb, requireFunctions, isFirebaseConfigured } from '../lib/firebase'
import { todayKey, startOfWeek, initialFromName } from '../lib/dates'
import { normalizeRole } from '../lib/roles'
import { normalizeWorkoutPlan } from '../lib/workoutPlan'
import { mapNutritionGoals, resolveNutritionGoals } from '../lib/nutrition'
import type {
  Challenge,
  Exercise,
  GymBranch,
  GymTip,
  Invite,
  MealAnalysisResult,
  MealPlan,
  MealScan,
  NutritionGoals,
  Post,
  PostComment,
  StudentAdherence,
  UserProfile,
  UserWorkoutProgress,
  WaterLog,
  WorkoutPlan,
} from '../types'

function requireConfigured() {
  if (!isFirebaseConfigured) {
    throw new Error('Firebase não configurado. Verifique o arquivo .env')
  }
}

function toIso(value: unknown): string {
  if (!value) return new Date().toISOString()
  if (typeof value === 'string') return value
  if (value instanceof Timestamp) return value.toDate().toISOString()
  if (typeof value === 'object' && value !== null && 'toDate' in value) {
    return (value as Timestamp).toDate().toISOString()
  }
  return new Date().toISOString()
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
    nutritionGoals: mapNutritionGoals(data.nutritionGoals),
  }
}

function mapInvite(token: string, data: DocumentData): Invite {
  return {
    token,
    gymId: data.gymId,
    email: data.email,
    name: data.name,
    unit: data.unit ?? '',
    branchId: data.branchId ?? null,
    assignedWorkoutPlanId: data.assignedWorkoutPlanId ?? null,
    assignedMealPlanId: data.assignedMealPlanId ?? null,
    createdBy: data.createdBy,
    status: data.status ?? 'pending',
    expiresAt: toIso(data.expiresAt),
    createdAt: toIso(data.createdAt),
    redeemedAt: data.redeemedAt ? toIso(data.redeemedAt) : null,
    redeemedBy: data.redeemedBy ?? null,
  }
}

function callableError(err: unknown, fallback: string): Error {
  const anyErr = err as { message?: string; details?: string }
  const msg = anyErr.details || anyErr.message || fallback
  return new Error(String(msg).replace(/^FirebaseError:\s*/i, ''))
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  requireConfigured()
  const snap = await getDoc(doc(requireDb(), 'users', uid))
  if (!snap.exists()) return null
  return mapUser(snap.id, snap.data())
}

export async function updateUserProfile(
  uid: string,
  patch: Partial<
    Pick<
      UserProfile,
      | 'name'
      | 'unit'
      | 'branchId'
      | 'active'
      | 'assignedWorkoutPlanId'
      | 'assignedMealPlanId'
      | 'nutritionGoals'
    >
  >,
): Promise<void> {
  requireConfigured()
  const data: Record<string, unknown> = { ...patch }
  if (patch.name) data.avatarInitial = initialFromName(patch.name)
  await updateDoc(doc(requireDb(), 'users', uid), data)
}

export async function saveNutritionGoals(uid: string, goals: NutritionGoals): Promise<void> {
  await updateUserProfile(uid, { nutritionGoals: goals })
}

export async function listStudents(gymId: string): Promise<UserProfile[]> {
  requireConfigured()
  const q = query(
    collection(requireDb(), 'users'),
    where('gymId', '==', gymId),
    where('role', '==', 'aluno'),
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => mapUser(d.id, d.data())).sort((a, b) => a.name.localeCompare(b.name))
}

function mapBranch(id: string, data: DocumentData): GymBranch {
  return {
    id,
    gymId: data.gymId,
    name: data.name ?? '',
    address: data.address ?? '',
    active: data.active !== false,
    createdAt: toIso(data.createdAt),
  }
}

export async function listGymBranches(gymId: string): Promise<GymBranch[]> {
  requireConfigured()
  const snap = await getDocs(
    query(collection(requireDb(), 'gymBranches'), where('gymId', '==', gymId)),
  )
  return snap.docs
    .map((d) => mapBranch(d.id, d.data()))
    .sort((a, b) => a.name.localeCompare(b.name))
}

export function activeBranches(branches: GymBranch[]): GymBranch[] {
  return branches.filter((b) => b.active)
}

export async function saveGymBranch(
  branch: Omit<GymBranch, 'createdAt'> & { createdAt?: string },
): Promise<GymBranch> {
  requireConfigured()
  const id = branch.id || doc(collection(requireDb(), 'gymBranches')).id
  const data = {
    gymId: branch.gymId,
    name: branch.name.trim(),
    address: branch.address.trim(),
    active: branch.active,
    createdAt: branch.createdAt ?? new Date().toISOString(),
  }
  await setDoc(doc(requireDb(), 'gymBranches', id), data, { merge: true })
  return mapBranch(id, data)
}

export async function deleteGymBranch(id: string): Promise<void> {
  requireConfigured()
  await updateDoc(doc(requireDb(), 'gymBranches', id), { active: false })
}

export async function assignStudentBranch(
  uid: string,
  branchId: string | null,
  branches: GymBranch[],
): Promise<void> {
  const unit = branchId ? branches.find((b) => b.id === branchId)?.name ?? '' : ''
  await updateUserProfile(uid, { branchId, unit })
}

export async function createInviteRemote(input: {
  gymId: string
  name: string
  email: string
  unit?: string
  branchId?: string | null
  assignedWorkoutPlanId?: string | null
  assignedMealPlanId?: string | null
}): Promise<{ token: string; expiresAt: string }> {
  try {
    const fn = httpsCallable<typeof input, { token: string; expiresAt: string }>(
      requireFunctions(),
      'createInvite',
    )
    const res = await fn({
      ...input,
      unit: input.unit ?? '',
      branchId: input.branchId ?? null,
    })
    return res.data
  } catch (err) {
    throw callableError(err, 'Falha ao criar convite. Faça deploy da Function createInvite.')
  }
}

export async function redeemInviteRemote(input: {
  token: string
  password: string
  name?: string
}): Promise<{ uid: string }> {
  try {
    const fn = httpsCallable<typeof input, { uid: string }>(requireFunctions(), 'redeemInvite')
    const res = await fn(input)
    return res.data
  } catch (err) {
    throw callableError(err, 'Falha ao concluir cadastro.')
  }
}

export async function getInvite(token: string): Promise<Invite | null> {
  requireConfigured()
  const snap = await getDoc(doc(requireDb(), 'invites', token))
  if (!snap.exists()) return null
  const invite = mapInvite(snap.id, snap.data())
  if (invite.status !== 'pending') return null
  if (new Date(invite.expiresAt).getTime() < Date.now()) return null
  return invite
}

export async function listInvites(gymId: string): Promise<Invite[]> {
  requireConfigured()
  const q = query(
    collection(requireDb(), 'invites'),
    where('gymId', '==', gymId),
    where('status', '==', 'pending'),
  )
  const snap = await getDocs(q)
  return snap.docs
    .map((d) => mapInvite(d.id, d.data()))
    .filter((i) => new Date(i.expiresAt).getTime() >= Date.now())
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function inviteLink(token: string): string {
  const base = typeof window !== 'undefined' ? window.location.origin : ''
  return `${base}/cadastro?token=${token}`
}

function sameDay(a: Date, b: Date): boolean {
  return a.toDateString() === b.toDateString()
}

function yesterdayOf(d: Date): Date {
  const y = new Date(d)
  y.setDate(y.getDate() - 1)
  return y
}

function nextStreak(user: UserProfile, now: Date): number {
  let streakDays = 1
  if (user.lastCheckInAt) {
    const last = new Date(user.lastCheckInAt)
    if (sameDay(last, yesterdayOf(now))) streakDays = user.streakDays + 1
    else if (sameDay(last, now)) streakDays = user.streakDays
  }
  return streakDays
}

export async function doCheckIn(user: UserProfile): Promise<UserProfile> {
  requireConfigured()
  if (!user.gymId) throw new Error('Perfil sem academia vinculada')

  const now = new Date()
  const today = todayKey(now)
  const db = requireDb()

  const existing = await getDocs(
    query(
      collection(db, 'checkIns'),
      where('userId', '==', user.uid),
      where('date', '==', today),
      limit(1),
    ),
  )
  if (!existing.empty) {
    throw new Error('Você já fez check-in hoje')
  }

  const streakDays = nextStreak(user, now)
  const createdAt = now.toISOString()

  await addDoc(collection(db, 'checkIns'), {
    userId: user.uid,
    gymId: user.gymId,
    unit: user.unit,
    date: today,
    createdAt,
  })

  await updateDoc(doc(db, 'users', user.uid), {
    lastCheckInAt: createdAt,
    streakDays,
  })

  return { ...user, lastCheckInAt: createdAt, streakDays }
}

export async function getWeekCheckIns(userId: string): Promise<boolean[]> {
  requireConfigured()
  const start = startOfWeek()
  const dates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return todayKey(d)
  })

  const snap = await getDocs(
    query(collection(requireDb(), 'checkIns'), where('userId', '==', userId)),
  )
  const set = new Set(snap.docs.map((d) => d.data().date as string))
  return dates.map((date) => set.has(date))
}

export async function countCheckInsToday(gymId: string): Promise<number> {
  requireConfigured()
  const snap = await getDocs(
    query(
      collection(requireDb(), 'checkIns'),
      where('gymId', '==', gymId),
      where('date', '==', todayKey()),
    ),
  )
  return snap.size
}

export async function listExercises(gymId: string): Promise<Exercise[]> {
  requireConfigured()
  const snap = await getDocs(
    query(collection(requireDb(), 'exercises'), where('gymId', '==', gymId)),
  )
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Exercise, 'id'>) }))
}

export async function saveExercise(exercise: Exercise): Promise<void> {
  requireConfigured()
  const { id, ...data } = exercise
  await setDoc(doc(requireDb(), 'exercises', id), data, { merge: true })
}

export async function deleteExercise(id: string): Promise<void> {
  requireConfigured()
  await deleteDoc(doc(requireDb(), 'exercises', id))
}

export async function listWorkoutPlans(gymId: string): Promise<WorkoutPlan[]> {
  requireConfigured()
  const snap = await getDocs(
    query(collection(requireDb(), 'workoutPlans'), where('gymId', '==', gymId)),
  )
  return snap.docs
    .map((d) => normalizeWorkoutPlan({ id: d.id, ...(d.data() as Omit<WorkoutPlan, 'id'>) }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

export async function getWorkoutPlan(planId: string): Promise<WorkoutPlan | null> {
  requireConfigured()
  const snap = await getDoc(doc(requireDb(), 'workoutPlans', planId))
  if (!snap.exists()) return null
  return normalizeWorkoutPlan({ id: snap.id, ...(snap.data() as Omit<WorkoutPlan, 'id'>) })
}

export async function saveWorkoutPlan(plan: WorkoutPlan): Promise<void> {
  requireConfigured()
  const normalized = normalizeWorkoutPlan(plan)
  const { id, ...data } = normalized
  await setDoc(doc(requireDb(), 'workoutPlans', id), data, { merge: true })
}

export async function deleteWorkoutPlan(id: string): Promise<void> {
  requireConfigured()
  await deleteDoc(doc(requireDb(), 'workoutPlans', id))
}

export async function getWorkoutProgress(
  userId: string,
  sessionId: string,
  date = todayKey(),
): Promise<UserWorkoutProgress | null> {
  requireConfigured()
  const id = `${userId}_${date}_${sessionId}`
  const snap = await getDoc(doc(requireDb(), 'userWorkoutProgress', id))
  if (!snap.exists()) return null
  const data = snap.data()
  return {
    id: snap.id,
    userId: data.userId as string,
    gymId: data.gymId as string,
    date: data.date as string,
    planId: data.planId as string,
    sessionId: (data.sessionId as string) || sessionId,
    completedExerciseIds: (data.completedExerciseIds as string[]) ?? [],
  }
}

export async function toggleExerciseProgress(
  user: UserProfile,
  planId: string,
  sessionId: string,
  exerciseId: string,
  date = todayKey(),
): Promise<string[]> {
  requireConfigured()
  if (!user.gymId) throw new Error('Perfil sem academia vinculada')

  const db = requireDb()
  const id = `${user.uid}_${date}_${sessionId}`
  const ref = doc(db, 'userWorkoutProgress', id)
  const snap = await getDoc(ref)
  const current: string[] = snap.exists()
    ? ((snap.data().completedExerciseIds as string[]) ?? [])
    : []
  const next = current.includes(exerciseId)
    ? current.filter((x) => x !== exerciseId)
    : [...current, exerciseId]

  await setDoc(
    ref,
    {
      userId: user.uid,
      gymId: user.gymId,
      date,
      planId,
      sessionId,
      completedExerciseIds: next,
    },
    { merge: true },
  )
  return next
}

export async function getEatenMeals(userId: string, date = todayKey()): Promise<string[]> {
  requireConfigured()
  const id = `${userId}_${date}`
  const snap = await getDoc(doc(requireDb(), 'mealCompletions', id))
  if (!snap.exists()) return []
  return (snap.data().eatenMealNames as string[]) ?? []
}

export async function toggleEatenMeal(
  user: UserProfile,
  mealName: string,
  date = todayKey(),
): Promise<string[]> {
  requireConfigured()
  const current = await getEatenMeals(user.uid, date)
  const next = current.includes(mealName)
    ? current.filter((n) => n !== mealName)
    : [...current, mealName]

  await setDoc(
    doc(requireDb(), 'mealCompletions', `${user.uid}_${date}`),
    { userId: user.uid, gymId: user.gymId, date, eatenMealNames: next },
    { merge: true },
  )
  return next
}

export async function getMealPlanForUser(user: UserProfile): Promise<MealPlan | null> {
  requireConfigured()
  if (user.assignedMealPlanId) {
    const snap = await getDoc(doc(requireDb(), 'mealPlans', user.assignedMealPlanId))
    if (snap.exists()) return { id: snap.id, ...(snap.data() as Omit<MealPlan, 'id'>) }
  }
  if (!user.gymId) return null
  const q = query(
    collection(requireDb(), 'mealPlans'),
    where('gymId', '==', user.gymId),
    where('isDefault', '==', true),
    limit(1),
  )
  const snap = await getDocs(q)
  if (!snap.empty) {
    const d = snap.docs[0]
    return { id: d.id, ...(d.data() as Omit<MealPlan, 'id'>) }
  }
  return null
}

export async function listMealPlans(gymId: string): Promise<MealPlan[]> {
  requireConfigured()
  const snap = await getDocs(
    query(collection(requireDb(), 'mealPlans'), where('gymId', '==', gymId)),
  )
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<MealPlan, 'id'>) }))
}

export async function saveMealPlan(plan: MealPlan): Promise<void> {
  requireConfigured()
  const { id, ...data } = plan
  await setDoc(doc(requireDb(), 'mealPlans', id), data, { merge: true })
}

export async function deleteMealPlan(id: string): Promise<void> {
  requireConfigured()
  await deleteDoc(doc(requireDb(), 'mealPlans', id))
}

export async function getWaterLog(user: UserProfile, date = todayKey()): Promise<WaterLog> {
  requireConfigured()
  const id = `${user.uid}_${date}`
  const goalLiters = resolveNutritionGoals(user).waterGoalLiters
  const snap = await getDoc(doc(requireDb(), 'waterLogs', id))
  if (snap.exists()) {
    const data = snap.data() as Omit<WaterLog, 'id'>
    return { id: snap.id, ...data, goalLiters: data.goalLiters || goalLiters }
  }
  return { id, userId: user.uid, gymId: user.gymId ?? '', date, liters: 0, goalLiters }
}

export async function setWaterLiters(
  user: UserProfile,
  liters: number,
  date = todayKey(),
  goalLiters = 3,
): Promise<WaterLog> {
  requireConfigured()
  const id = `${user.uid}_${date}`
  const log: Omit<WaterLog, 'id'> = {
    userId: user.uid,
    gymId: user.gymId ?? '',
    date,
    liters,
    goalLiters,
  }
  await setDoc(doc(requireDb(), 'waterLogs', id), log, { merge: true })
  return { id, ...log }
}

export async function listPosts(gymId: string, max = 30): Promise<Post[]> {
  requireConfigured()
  const q = query(
    collection(requireDb(), 'posts'),
    where('gymId', '==', gymId),
    orderBy('createdAt', 'desc'),
    limit(max),
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => {
    const data = d.data()
    return {
      id: d.id,
      gymId: data.gymId,
      authorId: data.authorId,
      authorName: data.authorName,
      authorAvatar: data.authorAvatar,
      content: data.content,
      imageUrl: data.imageUrl ?? null,
      likesCount: data.likesCount ?? 0,
      commentsCount: data.commentsCount ?? 0,
      createdAt: toIso(data.createdAt),
    }
  })
}

export async function createPost(
  user: UserProfile,
  content: string,
  imageUrl: string | null = null,
): Promise<Post> {
  requireConfigured()
  if (!user.gymId) throw new Error('Perfil sem academia vinculada')

  const createdAt = new Date().toISOString()
  const ref = await addDoc(collection(requireDb(), 'posts'), {
    gymId: user.gymId,
    authorId: user.uid,
    authorName: user.name,
    authorAvatar: user.avatarInitial,
    content,
    imageUrl,
    likesCount: 0,
    commentsCount: 0,
    createdAt,
  })
  return {
    id: ref.id,
    gymId: user.gymId,
    authorId: user.uid,
    authorName: user.name,
    authorAvatar: user.avatarInitial,
    content,
    imageUrl,
    likesCount: 0,
    commentsCount: 0,
    createdAt,
  }
}

export async function deletePost(id: string): Promise<void> {
  requireConfigured()
  await deleteDoc(doc(requireDb(), 'posts', id))
}

export async function getLikedPostIds(userId: string): Promise<Set<string>> {
  requireConfigured()
  const snap = await getDocs(
    query(collection(requireDb(), 'postLikes'), where('userId', '==', userId)),
  )
  return new Set(snap.docs.map((d) => d.data().postId as string))
}

export async function togglePostLike(userId: string, postId: string): Promise<boolean> {
  requireConfigured()
  const db = requireDb()
  const likeId = `${postId}_${userId}`
  const likeRef = doc(db, 'postLikes', likeId)
  const snap = await getDoc(likeRef)
  const postRef = doc(db, 'posts', postId)
  if (snap.exists()) {
    await deleteDoc(likeRef)
    await updateDoc(postRef, { likesCount: increment(-1) })
    return false
  }
  await setDoc(likeRef, { postId, userId, createdAt: new Date().toISOString() })
  await updateDoc(postRef, { likesCount: increment(1) })
  return true
}

export async function listComments(postId: string): Promise<PostComment[]> {
  requireConfigured()
  const q = query(
    collection(requireDb(), 'postComments'),
    where('postId', '==', postId),
    orderBy('createdAt', 'asc'),
    limit(50),
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => {
    const data = d.data()
    return {
      id: d.id,
      postId: data.postId,
      authorId: data.authorId,
      authorName: data.authorName,
      authorAvatar: data.authorAvatar,
      content: data.content,
      createdAt: toIso(data.createdAt),
    }
  })
}

export async function addComment(
  user: UserProfile,
  postId: string,
  content: string,
): Promise<PostComment> {
  requireConfigured()
  const comment = {
    postId,
    authorId: user.uid,
    authorName: user.name,
    authorAvatar: user.avatarInitial,
    content: content.trim(),
    createdAt: new Date().toISOString(),
  }
  const ref = await addDoc(collection(requireDb(), 'postComments'), comment)
  await updateDoc(doc(requireDb(), 'posts', postId), { commentsCount: increment(1) })
  return { id: ref.id, ...comment }
}

export async function getJoinedChallengeIds(userId: string): Promise<Set<string>> {
  requireConfigured()
  const snap = await getDocs(
    query(collection(requireDb(), 'challengeJoins'), where('userId', '==', userId)),
  )
  return new Set(snap.docs.map((d) => d.data().challengeId as string))
}

export async function listChallenges(gymId: string): Promise<Challenge[]> {
  requireConfigured()
  const snap = await getDocs(
    query(collection(requireDb(), 'challenges'), where('gymId', '==', gymId)),
  )
  return snap.docs.map((d) => {
    const data = d.data()
    return {
      id: d.id,
      gymId: data.gymId,
      title: data.title,
      emoji: data.emoji,
      participants: data.participants ?? 0,
      endsAt: toIso(data.endsAt),
    }
  })
}

export async function saveChallenge(challenge: Challenge): Promise<void> {
  requireConfigured()
  const { id, ...data } = challenge
  await setDoc(doc(requireDb(), 'challenges', id), data, { merge: true })
}

export async function deleteChallenge(id: string): Promise<void> {
  requireConfigured()
  await deleteDoc(doc(requireDb(), 'challenges', id))
}

export async function joinChallenge(id: string, userId: string): Promise<void> {
  requireConfigured()
  const joinId = `${id}_${userId}`
  const ref = doc(requireDb(), 'challengeJoins', joinId)
  const existing = await getDoc(ref)
  if (existing.exists()) throw new Error('Você já participa deste desafio')
  await setDoc(ref, { challengeId: id, userId, createdAt: new Date().toISOString() })
  await updateDoc(doc(requireDb(), 'challenges', id), { participants: increment(1) })
}

export async function listGymTips(gymId: string): Promise<GymTip[]> {
  requireConfigured()
  const snap = await getDocs(
    query(collection(requireDb(), 'gymTips'), where('gymId', '==', gymId), where('active', '==', true)),
  )
  return snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as Omit<GymTip, 'id'>) }))
    .sort((a, b) => a.order - b.order)
}

export async function analyzeMealPhotoRemote(input: {
  imageBase64: string
  mimeType: string
}): Promise<MealAnalysisResult> {
  try {
    const fn = httpsCallable<typeof input, MealAnalysisResult>(
      requireFunctions(),
      'analyzeMealPhoto',
    )
    const res = await fn(input)
    return res.data
  } catch (err) {
    throw callableError(err, 'Não foi possível analisar a foto. Tente de novo.')
  }
}

export async function listMealScans(userId: string, date = todayKey()): Promise<MealScan[]> {
  requireConfigured()
  const q = query(
    collection(requireDb(), 'mealScans'),
    where('userId', '==', userId),
    where('date', '==', date),
  )
  const snap = await getDocs(q)
  return snap.docs
    .map((d) => {
      const data = d.data()
      return {
        id: d.id,
        userId: data.userId,
        gymId: data.gymId,
        date: data.date,
        title: data.title,
        calories: data.calories ?? 0,
        protein: data.protein ?? 0,
        carbs: data.carbs ?? 0,
        fat: data.fat ?? 0,
        items: data.items ?? [],
        confidence: data.confidence ?? 0,
        notes: data.notes ?? '',
        previewUrl: data.previewUrl ?? null,
        createdAt: toIso(data.createdAt),
      } satisfies MealScan
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export async function saveMealScan(
  scan: Omit<MealScan, 'id' | 'createdAt'> & { id?: string },
): Promise<MealScan> {
  requireConfigured()
  const createdAt = new Date().toISOString()
  const id = scan.id || `${scan.userId}_${Date.now()}`
  const payload = { ...scan, createdAt }
  await setDoc(doc(requireDb(), 'mealScans', id), payload, { merge: true })
  return { id, ...payload }
}

export async function deleteMealScan(id: string): Promise<void> {
  requireConfigured()
  await deleteDoc(doc(requireDb(), 'mealScans', id))
}

export async function getStudentAdherence(
  gymId: string,
  students: UserProfile[],
): Promise<StudentAdherence[]> {
  requireConfigured()
  const today = todayKey()
  const weekStart = todayKey(startOfWeek())

  const checkSnap = await getDocs(
    query(
      collection(requireDb(), 'checkIns'),
      where('gymId', '==', gymId),
      where('date', '>=', weekStart),
    ),
  )
  const checkInsByUser = new Map<string, number>()
  for (const docSnap of checkSnap.docs) {
    const userId = docSnap.data().userId as string
    checkInsByUser.set(userId, (checkInsByUser.get(userId) ?? 0) + 1)
  }

  const results: StudentAdherence[] = []
  for (const user of students) {
    const eaten = await getEatenMeals(user.uid, today)
    const mealPlan = await getMealPlanForUser(user)
    const water = await getWaterLog(user, today)

    let workoutPct = 0
    if (user.assignedWorkoutPlanId) {
      const plan = await getWorkoutPlan(user.assignedWorkoutPlanId)
      if (plan) {
        let completed = 0
        let total = 0
        for (const session of plan.sessions) {
          const progress = await getWorkoutProgress(user.uid, session.id, today)
          completed += progress?.completedExerciseIds.length ?? 0
          total += session.exerciseIds.length
        }
        workoutPct = total > 0 ? Math.round((completed / total) * 100) : 0
      }
    }

    const mealTotal = mealPlan?.meals.length ?? 0
    const mealsPct = mealTotal > 0 ? Math.round((eaten.length / mealTotal) * 100) : 0

    results.push({
      user,
      checkInsWeek: checkInsByUser.get(user.uid) ?? 0,
      workoutPct,
      mealsPct,
      waterLiters: water.liters,
    })
  }
  return results
}
