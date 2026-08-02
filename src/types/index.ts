export type TabId = 'sessao' | 'treino' | 'dieta' | 'comunidade'

export type UserRole = 'super_admin' | 'gym_admin' | 'professor' | 'aluno'

export type GymStatus = 'active' | 'suspended'

export type InviteStatus = 'pending' | 'redeemed' | 'expired'

export type BillingStatus = 'paid' | 'pending' | 'overdue'

export interface TabItem {
  id: TabId
  label: string
  icon: React.ReactNode
}

export interface Gym {
  id: string
  name: string
  contactEmail: string
  planAmount: number
  billingDay: number
  status: GymStatus
  active: boolean
  createdAt: string
}

export interface GymBranch {
  id: string
  gymId: string
  name: string
  address: string
  active: boolean
  createdAt: string
}

export interface GymBillingMonth {
  id: string
  gymId: string
  amount: number
  dueDate: string
  status: BillingStatus
  paidAt: string | null
  notes: string
}

export interface Invite {
  token: string
  gymId: string
  email: string
  name: string
  unit: string
  branchId: string | null
  assignedWorkoutPlanId: string | null
  assignedMealPlanId: string | null
  createdBy: string
  status: InviteStatus
  expiresAt: string
  createdAt: string
  redeemedAt: string | null
  redeemedBy: string | null
}

export interface NutritionGoals {
  calorieGoal: number
  calorieExpenditure: number
  proteinGoal: number
  carbsGoal: number
  fatGoal: number
  waterGoalLiters: number
}

export interface UserProfile {
  uid: string
  name: string
  email: string
  role: UserRole
  gymId: string | null
  branchId: string | null
  unit: string
  avatarInitial: string
  active: boolean
  createdAt: string
  streakDays: number
  lastCheckInAt: string | null
  assignedWorkoutPlanId: string | null
  assignedMealPlanId: string | null
  nutritionGoals: NutritionGoals | null
}

export interface Exercise {
  id: string
  gymId: string
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

export interface WorkoutSession {
  id: string
  label: string
  subtitle: string
  muscleFocus: string
  durationMin: number
  exerciseIds: string[]
  order: number
}

export interface WorkoutPlan {
  id: string
  gymId: string
  name: string
  description: string
  level: string
  active: boolean
  sessions: WorkoutSession[]
  /** @deprecated planos antigos de um único dia */
  title?: string
  subtitle?: string
  muscleFocus?: string
  exerciseIds?: string[]
  durationMin?: number
}

export interface UserWorkoutProgress {
  id: string
  userId: string
  gymId: string
  date: string
  planId: string
  sessionId: string
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
  gymId: string
  name: string
  userId: string | null
  isDefault: boolean
  caloriesGoal: number
  macros: MacroGoal[]
  meals: MealItem[]
  waterGoalLiters?: number
}

export interface WaterLog {
  id: string
  userId: string
  gymId: string
  date: string
  liters: number
  goalLiters: number
}

export interface CheckIn {
  id: string
  userId: string
  gymId: string
  unit: string
  date: string
  createdAt: string
}

export interface Post {
  id: string
  gymId: string
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
  gymId: string
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
  gymId: string
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

export interface StudentAdherence {
  user: UserProfile
  checkInsWeek: number
  workoutPct: number
  mealsPct: number
  waterLiters: number
}

export interface GymTip {
  id: string
  gymId: string
  text: string
  active: boolean
  order: number
}
