export type TabId = 'sessao' | 'treino' | 'dieta' | 'comunidade'

export type UserRole = 'aluno' | 'admin'

export interface TabItem {
  id: TabId
  label: string
  icon: React.ReactNode
}

export interface UserProfile {
  uid: string
  name: string
  email: string
  role: UserRole
  unit: string
  avatarInitial: string
  active: boolean
  createdAt: string
  streakDays: number
  lastCheckInAt: string | null
  assignedWorkoutPlanId: string | null
  assignedMealPlanId: string | null
}

export interface Exercise {
  id: string
  name: string
  sets: string
  rest: string
  muscle: string
  equipment: string
  description: string
  tips: string[]
  videoUrl: string
  posterUrl: string
}

export interface WorkoutPlan {
  id: string
  title: string
  subtitle: string
  muscleFocus: string
  exerciseIds: string[]
  durationMin: number
  level: string
  active: boolean
}

export interface UserWorkoutProgress {
  id: string
  userId: string
  date: string
  planId: string
  completedExerciseIds: string[]
}

export interface MealItem {
  time: string
  name: string
  calories: number
  items: string[]
  emoji: string
}

export interface MacroGoal {
  label: string
  current: number
  goal: number
  color: string
  unit: string
}

export interface MealPlan {
  id: string
  name: string
  userId: string | null
  isDefault: boolean
  caloriesGoal: number
  macros: MacroGoal[]
  meals: MealItem[]
}

export interface WaterLog {
  id: string
  userId: string
  date: string
  liters: number
  goalLiters: number
}

export interface CheckIn {
  id: string
  userId: string
  unit: string
  createdAt: string
}

export interface Post {
  id: string
  authorId: string
  authorName: string
  authorAvatar: string
  content: string
  imageUrl: string | null
  likesCount: number
  commentsCount: number
  createdAt: string
}

export interface Challenge {
  id: string
  title: string
  emoji: string
  participants: number
  endsAt: string
}

export interface PostComment {
  id: string
  postId: string
  authorId: string
  authorName: string
  authorAvatar: string
  content: string
  createdAt: string
}

export interface MealScan {
  id: string
  userId: string
  date: string
  title: string
  calories: number
  protein: number
  carbs: number
  fat: number
  items: string[]
  confidence: number
  notes: string
  previewUrl: string | null
  createdAt: string
}

export interface MealAnalysisResult {
  title: string
  calories: number
  protein: number
  carbs: number
  fat: number
  items: string[]
  confidence: number
  notes: string
}
