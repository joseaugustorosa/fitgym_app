import type { MealScan, Post, PostComment } from '../types'

const KEY = 'fitgym_local_data_v1'

interface LocalData {
  workoutProgress: Record<string, { planId: string; completedExerciseIds: string[] }>
  mealEaten: Record<string, string[]>
  water: Record<string, number>
  checkIns: Record<string, string[]> // userId -> dates
  mealScans: MealScan[]
  posts: Post[]
  likes: Record<string, string[]>
  comments: PostComment[]
  challengeJoins: Record<string, string[]>
}

const empty = (): LocalData => ({
  workoutProgress: {},
  mealEaten: {},
  water: {},
  checkIns: {},
  mealScans: [],
  posts: [],
  likes: {},
  comments: [],
  challengeJoins: {},
})

function read(): LocalData {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return empty()
    return { ...empty(), ...JSON.parse(raw) }
  } catch {
    return empty()
  }
}

function write(data: LocalData) {
  localStorage.setItem(KEY, JSON.stringify(data))
}

export function isLocalUser(userId: string): boolean {
  return userId.startsWith('demo-')
}

export const localStore = {
  getWorkout(userId: string, date: string) {
    return read().workoutProgress[`${userId}_${date}`] ?? null
  },
  setWorkout(userId: string, date: string, planId: string, completedExerciseIds: string[]) {
    const data = read()
    data.workoutProgress[`${userId}_${date}`] = { planId, completedExerciseIds }
    write(data)
  },
  getMealEaten(userId: string, date: string) {
    return read().mealEaten[`${userId}_${date}`] ?? []
  },
  setMealEaten(userId: string, date: string, meals: string[]) {
    const data = read()
    data.mealEaten[`${userId}_${date}`] = meals
    write(data)
  },
  getWater(userId: string, date: string) {
    return read().water[`${userId}_${date}`]
  },
  setWater(userId: string, date: string, liters: number) {
    const data = read()
    data.water[`${userId}_${date}`] = liters
    write(data)
  },
  hasCheckIn(userId: string, date: string) {
    return (read().checkIns[userId] ?? []).includes(date)
  },
  listCheckInDates(userId: string) {
    return read().checkIns[userId] ?? []
  },
  addCheckIn(userId: string, date: string) {
    const data = read()
    const set = new Set(data.checkIns[userId] ?? [])
    if (set.has(date)) return false
    set.add(date)
    data.checkIns[userId] = [...set]
    write(data)
    return true
  },
  listMealScans(userId: string, date: string) {
    return read().mealScans.filter((s) => s.userId === userId && s.date === date)
  },
  saveMealScan(scan: MealScan) {
    const data = read()
    data.mealScans = [scan, ...data.mealScans.filter((s) => s.id !== scan.id)]
    write(data)
  },
  deleteMealScan(id: string) {
    const data = read()
    data.mealScans = data.mealScans.filter((s) => s.id !== id)
    write(data)
  },
  listPosts() {
    return [...read().posts].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  },
  savePost(post: Post) {
    const data = read()
    data.posts = [post, ...data.posts.filter((p) => p.id !== post.id)]
    write(data)
  },
  deletePost(id: string) {
    const data = read()
    data.posts = data.posts.filter((p) => p.id !== id)
    data.comments = data.comments.filter((c) => c.postId !== id)
    write(data)
  },
  getLikes(userId: string) {
    return new Set(read().likes[userId] ?? [])
  },
  toggleLike(userId: string, postId: string): boolean {
    const data = read()
    const set = new Set(data.likes[userId] ?? [])
    const liked = set.has(postId)
    if (liked) set.delete(postId)
    else set.add(postId)
    data.likes[userId] = [...set]
    data.posts = data.posts.map((p) =>
      p.id === postId
        ? { ...p, likesCount: Math.max(0, p.likesCount + (liked ? -1 : 1)) }
        : p,
    )
    write(data)
    return !liked
  },
  listComments(postId: string) {
    return read()
      .comments.filter((c) => c.postId === postId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  },
  addComment(comment: PostComment) {
    const data = read()
    data.comments.push(comment)
    data.posts = data.posts.map((p) =>
      p.id === comment.postId ? { ...p, commentsCount: p.commentsCount + 1 } : p,
    )
    write(data)
  },
  getJoinedChallenges(userId: string) {
    return new Set(read().challengeJoins[userId] ?? [])
  },
  joinChallenge(userId: string, challengeId: string): boolean {
    const data = read()
    const set = new Set(data.challengeJoins[userId] ?? [])
    if (set.has(challengeId)) return false
    set.add(challengeId)
    data.challengeJoins[userId] = [...set]
    write(data)
    return true
  },
}
