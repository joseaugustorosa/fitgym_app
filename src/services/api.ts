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
import { defaultExercises, defaultMealPlan } from '../data/defaults'
import { isLocalUser, localStore } from '../lib/localStore'
import type {
  Challenge,
  CheckIn,
  Exercise,
  MealAnalysisResult,
  MealPlan,
  MealScan,
  Post,
  PostComment,
  UserProfile,
  UserWorkoutProgress,
  WaterLog,
  WorkoutPlan,
} from '../types'

function useLocal(userId?: string) {
  return !isFirebaseConfigured || (userId ? isLocalUser(userId) : false)
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
    role: data.role === 'admin' ? 'admin' : 'aluno',
    unit: data.unit ?? 'Unidade Centro',
    avatarInitial: data.avatarInitial ?? initialFromName(data.name ?? '?'),
    active: data.active !== false,
    createdAt: toIso(data.createdAt),
    streakDays: data.streakDays ?? 0,
    lastCheckInAt: data.lastCheckInAt ? toIso(data.lastCheckInAt) : null,
    assignedWorkoutPlanId: data.assignedWorkoutPlanId ?? null,
    assignedMealPlanId: data.assignedMealPlanId ?? null,
  }
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  if (!isFirebaseConfigured) return null
  const snap = await getDoc(doc(requireDb(), 'users', uid))
  if (!snap.exists()) return null
  return mapUser(snap.id, snap.data())
}

export async function createUserProfileDoc(input: {
  uid: string
  name: string
  email: string
  unit?: string
  role?: 'aluno' | 'admin'
}): Promise<UserProfile> {
  const profile: Omit<UserProfile, 'uid'> = {
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    role: input.role ?? 'aluno',
    unit: input.unit?.trim() || 'Unidade Centro',
    avatarInitial: initialFromName(input.name),
    active: true,
    createdAt: new Date().toISOString(),
    streakDays: 0,
    lastCheckInAt: null,
    assignedWorkoutPlanId: 'treino-a',
    assignedMealPlanId: 'default-meal-plan',
  }
  await setDoc(doc(requireDb(), 'users', input.uid), profile)
  return { uid: input.uid, ...profile }
}

export async function updateUserProfile(
  uid: string,
  patch: Partial<Pick<UserProfile, 'name' | 'unit' | 'active' | 'assignedWorkoutPlanId' | 'assignedMealPlanId'>>,
): Promise<void> {
  const data: Record<string, unknown> = { ...patch }
  if (patch.name) data.avatarInitial = initialFromName(patch.name)
  await updateDoc(doc(requireDb(), 'users', uid), data)
}

export async function listStudents(): Promise<UserProfile[]> {
  const q = query(collection(requireDb(), 'users'), where('role', '==', 'aluno'))
  const snap = await getDocs(q)
  return snap.docs.map((d) => mapUser(d.id, d.data())).sort((a, b) => a.name.localeCompare(b.name))
}

export async function createStudentRemote(input: {
  name: string
  email: string
  password: string
  unit: string
}): Promise<{ uid: string }> {
  try {
    const fn = httpsCallable<typeof input, { uid: string }>(requireFunctions(), 'createStudent')
    const res = await fn(input)
    return res.data
  } catch (err) {
    const anyErr = err as { message?: string; code?: string; details?: string }
    const msg =
      anyErr.details ||
      anyErr.message ||
      'Falha ao criar aluno. Faça deploy da Function createStudent.'
    throw new Error(msg.replace(/^FirebaseError:\s*/i, ''))
  }
}

function sameDay(a: Date, b: Date): boolean {
  return a.toDateString() === b.toDateString()
}

function yesterdayOf(d: Date): Date {
  const y = new Date(d)
  y.setDate(y.getDate() - 1)
  return y
}

export async function doCheckIn(user: UserProfile): Promise<UserProfile> {
  const db = requireDb()
  const now = new Date()
  const today = todayKey(now)

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

  let streakDays = 1
  if (user.lastCheckInAt) {
    const last = new Date(user.lastCheckInAt)
    if (sameDay(last, yesterdayOf(now))) streakDays = user.streakDays + 1
    else if (sameDay(last, now)) streakDays = user.streakDays
  }

  const createdAt = now.toISOString()
  await addDoc(collection(db, 'checkIns'), {
    userId: user.uid,
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
  if (!isFirebaseConfigured) return [false, false, false, false, false, false, false]
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

export async function countCheckInsToday(): Promise<number> {
  const snap = await getDocs(
    query(collection(requireDb(), 'checkIns'), where('date', '==', todayKey())),
  )
  return snap.size
}

export async function listExercises(): Promise<Exercise[]> {
  if (!isFirebaseConfigured) return defaultExercises
  try {
    const snap = await getDocs(collection(requireDb(), 'exercises'))
    if (snap.empty) return defaultExercises
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Exercise, 'id'>) }))
  } catch {
    return defaultExercises
  }
}

export async function saveExercise(exercise: Exercise): Promise<void> {
  const { id, ...data } = exercise
  await setDoc(doc(requireDb(), 'exercises', id), data, { merge: true })
}

export async function deleteExercise(id: string): Promise<void> {
  await deleteDoc(doc(requireDb(), 'exercises', id))
}

export async function listWorkoutPlans(): Promise<WorkoutPlan[]> {
  if (!isFirebaseConfigured) {
    return [
      {
        id: 'treino-a',
        title: 'Treino A',
        subtitle: 'Peito e Tríceps',
        muscleFocus: 'Peito',
        exerciseIds: defaultExercises.map((e) => e.id),
        durationMin: 45,
        level: 'Intermediário',
        active: true,
      },
    ]
  }
  try {
    const snap = await getDocs(collection(requireDb(), 'workoutPlans'))
    if (snap.empty) {
      return [
        {
          id: 'treino-a',
          title: 'Treino A',
          subtitle: 'Peito e Tríceps',
          muscleFocus: 'Peito',
          exerciseIds: defaultExercises.map((e) => e.id),
          durationMin: 45,
          level: 'Intermediário',
          active: true,
        },
      ]
    }
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<WorkoutPlan, 'id'>) }))
  } catch {
    return []
  }
}

export async function saveWorkoutPlan(plan: WorkoutPlan): Promise<void> {
  const { id, ...data } = plan
  await setDoc(doc(requireDb(), 'workoutPlans', id), data, { merge: true })
}

export async function deleteWorkoutPlan(id: string): Promise<void> {
  await deleteDoc(doc(requireDb(), 'workoutPlans', id))
}

export async function getWorkoutProgress(
  userId: string,
  date = todayKey(),
): Promise<UserWorkoutProgress | null> {
  if (useLocal(userId)) {
    const local = localStore.getWorkout(userId, date)
    if (!local) return null
    return { id: `${userId}_${date}`, userId, date, ...local }
  }
  const id = `${userId}_${date}`
  const snap = await getDoc(doc(requireDb(), 'userWorkoutProgress', id))
  if (!snap.exists()) return null
  return { id: snap.id, ...(snap.data() as Omit<UserWorkoutProgress, 'id'>) }
}

export async function toggleExerciseProgress(
  userId: string,
  planId: string,
  exerciseId: string,
  date = todayKey(),
): Promise<string[]> {
  if (useLocal(userId)) {
    const current = localStore.getWorkout(userId, date)?.completedExerciseIds ?? []
    const next = current.includes(exerciseId)
      ? current.filter((x) => x !== exerciseId)
      : [...current, exerciseId]
    localStore.setWorkout(userId, date, planId, next)
    return next
  }
  const db = requireDb()
  const id = `${userId}_${date}`
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
    { userId, date, planId, completedExerciseIds: next },
    { merge: true },
  )
  return next
}

export async function getEatenMeals(userId: string, date = todayKey()): Promise<string[]> {
  if (useLocal(userId)) return localStore.getMealEaten(userId, date)
  try {
    const id = `${userId}_${date}`
    const snap = await getDoc(doc(requireDb(), 'mealCompletions', id))
    if (!snap.exists()) return []
    return (snap.data().eatenMealNames as string[]) ?? []
  } catch {
    return []
  }
}

export async function toggleEatenMeal(
  userId: string,
  mealName: string,
  date = todayKey(),
): Promise<string[]> {
  const current = await getEatenMeals(userId, date)
  const next = current.includes(mealName)
    ? current.filter((n) => n !== mealName)
    : [...current, mealName]
  if (useLocal(userId)) {
    localStore.setMealEaten(userId, date, next)
    return next
  }
  await setDoc(
    doc(requireDb(), 'mealCompletions', `${userId}_${date}`),
    { userId, date, eatenMealNames: next },
    { merge: true },
  )
  return next
}

export async function getMealPlanForUser(user: UserProfile): Promise<MealPlan> {
  if (!isFirebaseConfigured) {
    return {
      id: 'default',
      userId: null,
      isDefault: true,
      ...defaultMealPlan,
    }
  }
  try {
    if (user.assignedMealPlanId) {
      const snap = await getDoc(doc(requireDb(), 'mealPlans', user.assignedMealPlanId))
      if (snap.exists()) return { id: snap.id, ...(snap.data() as Omit<MealPlan, 'id'>) }
    }
    const q = query(collection(requireDb(), 'mealPlans'), where('isDefault', '==', true), limit(1))
    const snap = await getDocs(q)
    if (!snap.empty) {
      const d = snap.docs[0]
      return { id: d.id, ...(d.data() as Omit<MealPlan, 'id'>) }
    }
  } catch {
    /* fallback */
  }
  return { id: 'default', userId: null, isDefault: true, ...defaultMealPlan }
}

export async function listMealPlans(): Promise<MealPlan[]> {
  const snap = await getDocs(collection(requireDb(), 'mealPlans'))
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<MealPlan, 'id'>) }))
}

export async function saveMealPlan(plan: MealPlan): Promise<void> {
  const { id, ...data } = plan
  await setDoc(doc(requireDb(), 'mealPlans', id), data, { merge: true })
}

export async function getWaterLog(userId: string, date = todayKey()): Promise<WaterLog> {
  const id = `${userId}_${date}`
  if (useLocal(userId)) {
    const liters = localStore.getWater(userId, date)
    return { id, userId, date, liters: liters ?? 0, goalLiters: 3 }
  }
  try {
    const snap = await getDoc(doc(requireDb(), 'waterLogs', id))
    if (snap.exists()) return { id: snap.id, ...(snap.data() as Omit<WaterLog, 'id'>) }
  } catch {
    /* fallback */
  }
  return { id, userId, date, liters: 0, goalLiters: 3 }
}

export async function setWaterLiters(
  userId: string,
  liters: number,
  date = todayKey(),
): Promise<WaterLog> {
  const id = `${userId}_${date}`
  const log: Omit<WaterLog, 'id'> = { userId, date, liters, goalLiters: 3 }
  if (useLocal(userId)) {
    localStore.setWater(userId, date, liters)
    return { id, ...log }
  }
  await setDoc(doc(requireDb(), 'waterLogs', id), log, { merge: true })
  return { id, ...log }
}

export async function listPosts(max = 30): Promise<Post[]> {
  if (!isFirebaseConfigured) {
    return localStore.listPosts().slice(0, max)
  }
  try {
    const q = query(collection(requireDb(), 'posts'), orderBy('createdAt', 'desc'), limit(max))
    const snap = await getDocs(q)
    const remote = snap.docs.map((d) => {
      const data = d.data()
      return {
        id: d.id,
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
    if (remote.length > 0) return remote
    return localStore.listPosts().slice(0, max)
  } catch {
    return localStore.listPosts().slice(0, max)
  }
}

export async function createPost(
  user: UserProfile,
  content: string,
  imageUrl: string | null = null,
): Promise<Post> {
  const createdAt = new Date().toISOString()
  const post: Post = {
    id: `local_${Date.now()}`,
    authorId: user.uid,
    authorName: user.name,
    authorAvatar: user.avatarInitial,
    content,
    imageUrl,
    likesCount: 0,
    commentsCount: 0,
    createdAt,
  }
  if (useLocal(user.uid)) {
    localStore.savePost(post)
    return post
  }
  try {
    const ref = await addDoc(collection(requireDb(), 'posts'), {
      authorId: user.uid,
      authorName: user.name,
      authorAvatar: user.avatarInitial,
      content,
      imageUrl,
      likesCount: 0,
      commentsCount: 0,
      createdAt,
    })
    return { ...post, id: ref.id }
  } catch {
    localStore.savePost(post)
    return post
  }
}

export async function deletePost(id: string): Promise<void> {
  localStore.deletePost(id)
  if (!isFirebaseConfigured) return
  try {
    await deleteDoc(doc(requireDb(), 'posts', id))
  } catch {
    /* ignore */
  }
}

export async function getLikedPostIds(userId: string): Promise<Set<string>> {
  if (useLocal(userId)) return localStore.getLikes(userId)
  try {
    const snap = await getDocs(
      query(collection(requireDb(), 'postLikes'), where('userId', '==', userId)),
    )
    return new Set(snap.docs.map((d) => d.data().postId as string))
  } catch {
    return localStore.getLikes(userId)
  }
}

export async function togglePostLike(userId: string, postId: string): Promise<boolean> {
  if (useLocal(userId) || postId.startsWith('local_')) {
    return localStore.toggleLike(userId, postId)
  }
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
  if (postId.startsWith('local_') || !isFirebaseConfigured) {
    return localStore.listComments(postId)
  }
  try {
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
  } catch {
    return localStore.listComments(postId)
  }
}

export async function addComment(
  user: UserProfile,
  postId: string,
  content: string,
): Promise<PostComment> {
  const comment: PostComment = {
    id: `c_${Date.now()}`,
    postId,
    authorId: user.uid,
    authorName: user.name,
    authorAvatar: user.avatarInitial,
    content: content.trim(),
    createdAt: new Date().toISOString(),
  }
  if (useLocal(user.uid) || postId.startsWith('local_')) {
    localStore.addComment(comment)
    return comment
  }
  try {
    const ref = await addDoc(collection(requireDb(), 'postComments'), comment)
    await updateDoc(doc(requireDb(), 'posts', postId), { commentsCount: increment(1) })
    return { ...comment, id: ref.id }
  } catch {
    localStore.addComment(comment)
    return comment
  }
}

export async function getJoinedChallengeIds(userId: string): Promise<Set<string>> {
  if (useLocal(userId)) return localStore.getJoinedChallenges(userId)
  try {
    const snap = await getDocs(
      query(collection(requireDb(), 'challengeJoins'), where('userId', '==', userId)),
    )
    return new Set(snap.docs.map((d) => d.data().challengeId as string))
  } catch {
    return localStore.getJoinedChallenges(userId)
  }
}

export async function listChallenges(): Promise<Challenge[]> {
  if (!isFirebaseConfigured) {
    return [
      {
        id: '30-dias',
        title: '30 dias de treino',
        emoji: '🔥',
        participants: 128,
        endsAt: new Date(Date.now() + 18 * 86400000).toISOString(),
      },
      {
        id: '10k-passos',
        title: 'Desafio 10k passos',
        emoji: '👟',
        participants: 89,
        endsAt: new Date(Date.now() + 7 * 86400000).toISOString(),
      },
    ]
  }
  try {
    const snap = await getDocs(collection(requireDb(), 'challenges'))
    if (snap.empty) {
      return [
        {
          id: '30-dias',
          title: '30 dias de treino',
          emoji: '🔥',
          participants: 128,
          endsAt: new Date(Date.now() + 18 * 86400000).toISOString(),
        },
      ]
    }
    return snap.docs.map((d) => {
      const data = d.data()
      return {
        id: d.id,
        title: data.title,
        emoji: data.emoji,
        participants: data.participants ?? 0,
        endsAt: toIso(data.endsAt),
      }
    })
  } catch {
    return []
  }
}

export async function saveChallenge(challenge: Challenge): Promise<void> {
  const { id, ...data } = challenge
  await setDoc(doc(requireDb(), 'challenges', id), data, { merge: true })
}

export async function deleteChallenge(id: string): Promise<void> {
  await deleteDoc(doc(requireDb(), 'challenges', id))
}

export async function joinChallenge(id: string, userId?: string): Promise<void> {
  if (userId && useLocal(userId)) {
    const joined = localStore.joinChallenge(userId, id)
    if (!joined) throw new Error('Você já participa deste desafio')
    return
  }
  if (userId && isFirebaseConfigured) {
    const joinId = `${id}_${userId}`
    const ref = doc(requireDb(), 'challengeJoins', joinId)
    const existing = await getDoc(ref)
    if (existing.exists()) throw new Error('Você já participa deste desafio')
    await setDoc(ref, { challengeId: id, userId, createdAt: new Date().toISOString() })
  }
  await updateDoc(doc(requireDb(), 'challenges', id), { participants: increment(1) })
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
    const anyErr = err as { message?: string; details?: string }
    const msg =
      anyErr.details ||
      anyErr.message ||
      'Não foi possível analisar a foto. Tente de novo.'
    throw new Error(String(msg).replace(/^FirebaseError:\s*/i, ''))
  }
}

/** Fallback local (demo / sem Function) — estimativa editável. */
export function mockMealAnalysis(): MealAnalysisResult {
  return {
    title: 'Refeição fotografada',
    calories: 520,
    protein: 32,
    carbs: 48,
    fat: 18,
    items: ['Prato principal', 'Acompanhamento', 'Molho'],
    confidence: 0.45,
    notes: 'Estimativa aproximada. Ajuste os valores se necessário.',
  }
}

export async function listMealScans(userId: string, date = todayKey()): Promise<MealScan[]> {
  if (useLocal(userId)) {
    return localStore.listMealScans(userId, date).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }
  if (!isFirebaseConfigured) return []
  try {
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
  } catch {
    return localStore.listMealScans(userId, date)
  }
}

export async function saveMealScan(
  scan: Omit<MealScan, 'id' | 'createdAt'> & { id?: string },
): Promise<MealScan> {
  const createdAt = new Date().toISOString()
  const id = scan.id || `${scan.userId}_${Date.now()}`
  const payload = {
    userId: scan.userId,
    date: scan.date,
    title: scan.title,
    calories: scan.calories,
    protein: scan.protein,
    carbs: scan.carbs,
    fat: scan.fat,
    items: scan.items,
    confidence: scan.confidence,
    notes: scan.notes,
    previewUrl: scan.previewUrl,
    createdAt,
  }
  const full = { id, ...payload }
  if (useLocal(scan.userId)) {
    localStore.saveMealScan(full)
    return full
  }
  if (!isFirebaseConfigured) {
    localStore.saveMealScan(full)
    return full
  }
  await setDoc(doc(requireDb(), 'mealScans', id), payload, { merge: true })
  return full
}

export async function deleteMealScan(id: string, userId?: string): Promise<void> {
  localStore.deleteMealScan(id)
  if (userId && useLocal(userId)) return
  if (!isFirebaseConfigured) return
  try {
    await deleteDoc(doc(requireDb(), 'mealScans', id))
  } catch {
    /* ignore */
  }
}

export type { CheckIn }
