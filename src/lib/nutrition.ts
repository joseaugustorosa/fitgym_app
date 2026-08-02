import type { MealPlan, NutritionGoals, UserProfile } from '../types'

export function defaultNutritionGoals(): NutritionGoals {
  return {
    calorieGoal: 2000,
    calorieExpenditure: 2200,
    proteinGoal: 140,
    carbsGoal: 200,
    fatGoal: 65,
    waterGoalLiters: 3,
  }
}

export function mapNutritionGoals(data: unknown): NutritionGoals | null {
  if (!data || typeof data !== 'object') return null
  const g = data as Record<string, unknown>
  const calorieGoal = Number(g.calorieGoal)
  const calorieExpenditure = Number(g.calorieExpenditure)
  if (!Number.isFinite(calorieGoal) || calorieGoal <= 0) return null
  return {
    calorieGoal,
    calorieExpenditure: Number.isFinite(calorieExpenditure) && calorieExpenditure > 0
      ? calorieExpenditure
      : calorieGoal + 200,
    proteinGoal: Number(g.proteinGoal) || 140,
    carbsGoal: Number(g.carbsGoal) || 200,
    fatGoal: Number(g.fatGoal) || 65,
    waterGoalLiters: Number(g.waterGoalLiters) || 3,
  }
}

/** Metas do aluno — perfil tem prioridade; plano da academia só preenche lacunas. */
export function resolveNutritionGoals(
  profile: UserProfile,
  plan?: MealPlan | null,
): NutritionGoals {
  const fromProfile = profile.nutritionGoals
  const base = fromProfile ?? defaultNutritionGoals()

  if (fromProfile || !plan) return base

  const protein = plan.macros.find((m) => m.label.toLowerCase().includes('prote'))?.goal
  const carbs = plan.macros.find((m) => m.label.toLowerCase().includes('carb'))?.goal
  const fat = plan.macros.find((m) => m.label.toLowerCase().includes('gord'))?.goal

  return {
    calorieGoal: plan.caloriesGoal || base.calorieGoal,
    calorieExpenditure: plan.caloriesGoal
      ? Math.round(plan.caloriesGoal * 1.1)
      : base.calorieExpenditure,
    proteinGoal: protein ?? base.proteinGoal,
    carbsGoal: carbs ?? base.carbsGoal,
    fatGoal: fat ?? base.fatGoal,
    waterGoalLiters: plan.waterGoalLiters ?? base.waterGoalLiters,
  }
}

export function energyBalanceLabel(intake: number, expenditure: number): string {
  const diff = intake - expenditure
  if (Math.abs(diff) < 50) return 'Equilibrado'
  if (diff > 0) return `Superávit +${diff} kcal`
  return `Déficit ${diff} kcal`
}
