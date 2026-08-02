import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { MealPhotoSheet } from '../../components/MealPhotoSheet'
import { FoodPickerSheet } from '../../components/FoodPickerSheet'
import { ManualFoodSheet } from '../../components/ManualFoodSheet'
import { compressImageFile } from '../../lib/image'
import { todayKey } from '../../lib/dates'
import { energyBalanceLabel, resolveNutritionGoals } from '../../lib/nutrition'
import {
  analyzeMealPhotoRemote,
  deleteMealScan,
  getMealPlanForUser,
  getWaterLog,
  listMealScans,
  saveMealScan,
  saveNutritionGoals,
  setWaterLiters,
} from '../../services/api'
import { analyzeMealPhotoWithGeminiKey, hasGeminiBrowserKey } from '../../services/mealAi'
import type { FoodPortion } from '../../services/foodApi'
import type { MealAnalysisResult, MealPlan, MealScan, NutritionGoals, WaterLog } from '../../types'

function scanSourceLabel(scan: MealScan) {
  const note = (scan.notes || '').toLowerCase()
  const items = scan.items.map((i) => i.toLowerCase())
  if (note.includes('manual')) return 'Manual'
  if (note.includes('open food') || items.includes('openfoodfacts')) return 'Base de comidas'
  if (note.includes('catálogo') || items.includes('catalog')) return 'Catálogo'
  if (note.includes('ia') || items.includes('ai') || scan.confidence < 0.7) return 'Estimativa IA'
  if (scan.previewUrl) return 'Foto'
  return 'Registrado'
}

export function DietaPage() {
  const { profile, refreshProfile } = useAuth()
  const fileRef = useRef<HTMLInputElement>(null)
  const [plan, setPlan] = useState<MealPlan | null>(null)
  const [goals, setGoals] = useState<NutritionGoals | null>(null)
  const [goalsForm, setGoalsForm] = useState<NutritionGoals | null>(null)
  const [showGoals, setShowGoals] = useState(false)
  const [water, setWater] = useState<WaterLog | null>(null)
  const [scans, setScans] = useState<MealScan[]>([])
  const [savingWater, setSavingWater] = useState(false)
  const [savingGoals, setSavingGoals] = useState(false)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState('')

  const [sheetOpen, setSheetOpen] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<MealAnalysisResult | null>(null)
  const [scanError, setScanError] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [foodPickerOpen, setFoodPickerOpen] = useState(false)
  const [manualOpen, setManualOpen] = useState(false)
  const [savingFood, setSavingFood] = useState(false)

  useEffect(() => {
    if (!profile) return
    setLoading(true)
    Promise.all([
      getMealPlanForUser(profile).then(setPlan),
      listMealScans(profile.uid).then(setScans),
      getWaterLog(profile).then(setWater),
    ])
      .catch(() => undefined)
      .finally(() => setLoading(false))
  }, [profile])

  useEffect(() => {
    if (!profile) return
    const resolved = resolveNutritionGoals(profile, plan)
    setGoals(resolved)
    setGoalsForm(resolved)
  }, [profile, plan])

  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(''), 2200)
    return () => window.clearTimeout(t)
  }, [toast])

  const stats = useMemo(() => {
    if (!goals) return null
    const intake = scans.reduce((sum, s) => sum + s.calories, 0)
    const protein = scans.reduce((sum, s) => sum + s.protein, 0)
    const carbs = scans.reduce((sum, s) => sum + s.carbs, 0)
    const fat = scans.reduce((sum, s) => sum + s.fat, 0)
    const expenditure = goals.calorieExpenditure
    const calorieGoal = goals.calorieGoal
    const remaining = Math.max(calorieGoal - intake, 0)
    const calorieProgress = Math.min(Math.round((intake / calorieGoal) * 100), 100)
    const overGoal = intake > calorieGoal
    const energyBalance = intake - expenditure

    return {
      intake,
      protein,
      carbs,
      fat,
      expenditure,
      calorieGoal,
      remaining,
      calorieProgress,
      overGoal,
      energyBalance,
      balanceLabel: energyBalanceLabel(intake, expenditure),
    }
  }, [goals, scans])

  if (!profile || loading || !stats || !goals) {
    return (
      <div className="flex items-center justify-center px-4 py-20 text-neutral-400">
        Carregando alimentação…
      </div>
    )
  }

  const waterLiters = water?.liters ?? 0
  const waterGoal = water?.goalLiters ?? goals.waterGoalLiters

  async function bumpWater(delta: number) {
    if (!profile || savingWater) return
    const next = Math.max(0, Math.min(waterGoal, Number((waterLiters + delta).toFixed(2))))
    setSavingWater(true)
    try {
      const updated = await setWaterLiters(profile, next, todayKey(), waterGoal)
      setWater(updated)
    } finally {
      setSavingWater(false)
    }
  }

  async function onSaveGoals(e: FormEvent) {
    e.preventDefault()
    if (!profile || !goalsForm) return
    setSavingGoals(true)
    try {
      await saveNutritionGoals(profile.uid, goalsForm)
      await refreshProfile()
      setGoals(goalsForm)
      setShowGoals(false)
      setToast('Metas atualizadas')
      const updatedWater = await getWaterLog({ ...profile, nutritionGoals: goalsForm })
      setWater(updatedWater)
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Erro ao salvar metas')
    } finally {
      setSavingGoals(false)
    }
  }

  function openCamera() {
    fileRef.current?.click()
  }

  async function onPickPhoto(file: File | undefined) {
    if (!file || !profile) return
    setScanError('')
    setAnalysis(null)
    setSheetOpen(true)
    setAnalyzing(true)

    try {
      const compressed = await compressImageFile(file)
      setPreviewUrl(compressed.previewUrl)

      let result: MealAnalysisResult
      try {
        result = await analyzeMealPhotoRemote({
          imageBase64: compressed.base64,
          mimeType: compressed.mimeType,
        })
      } catch {
        if (hasGeminiBrowserKey()) {
          result = await analyzeMealPhotoWithGeminiKey(compressed.base64, compressed.mimeType)
        } else {
          throw new Error('Análise indisponível. Configure a Cloud Function ou VITE_GEMINI_API_KEY.')
        }
      }
      setAnalysis(result)
    } catch (err) {
      setScanError(err instanceof Error ? err.message : 'Erro ao processar foto')
    } finally {
      setAnalyzing(false)
    }
  }

  async function confirmScan() {
    if (!profile || !analysis) return
    setConfirming(true)
    try {
      const saved = await saveMealScan({
        userId: profile.uid,
        gymId: profile.gymId ?? '',
        date: todayKey(),
        title: analysis.title,
        calories: analysis.calories,
        protein: analysis.protein,
        carbs: analysis.carbs,
        fat: analysis.fat,
        items: analysis.items,
        confidence: analysis.confidence,
        notes: analysis.notes,
        previewUrl: null,
      })
      setScans((prev) => [{ ...saved, previewUrl }, ...prev])
      setSheetOpen(false)
      setPreviewUrl(null)
      setAnalysis(null)
      setToast(`+${analysis.calories} kcal adicionadas`)
    } catch (err) {
      setScanError(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally {
      setConfirming(false)
    }
  }

  async function removeScan(id: string) {
    await deleteMealScan(id)
    setScans((prev) => prev.filter((s) => s.id !== id))
    setToast('Item removido')
  }

  async function addFoodPortion(portion: FoodPortion) {
    if (!profile) return
    setSavingFood(true)
    try {
      const saved = await saveMealScan({
        userId: profile.uid,
        gymId: profile.gymId ?? '',
        date: todayKey(),
        title: `${portion.food.name} (${portion.grams}g)`,
        calories: portion.calories,
        protein: portion.protein,
        carbs: portion.carbs,
        fat: portion.fat,
        items: [portion.food.name, `${portion.grams}g`, portion.food.source],
        confidence: portion.food.source === 'ai' ? 0.6 : 0.95,
        notes:
          portion.food.source === 'openfoodfacts'
            ? 'Dados Open Food Facts'
            : portion.food.source === 'catalog'
              ? 'Catálogo FitGym'
              : 'Estimativa por IA',
        previewUrl: portion.food.imageUrl ?? null,
      })
      setScans((prev) => [saved, ...prev])
      setFoodPickerOpen(false)
      setToast(`+${portion.calories} kcal · ${portion.food.name}`)
    } finally {
      setSavingFood(false)
    }
  }

  async function addManualFood(entry: {
    title: string
    calories: number
    protein: number
    carbs: number
    fat: number
  }) {
    if (!profile) return
    setSavingFood(true)
    try {
      const saved = await saveMealScan({
        userId: profile.uid,
        gymId: profile.gymId ?? '',
        date: todayKey(),
        title: entry.title,
        calories: entry.calories,
        protein: entry.protein,
        carbs: entry.carbs,
        fat: entry.fat,
        items: [entry.title],
        confidence: 1,
        notes: 'Registro manual',
        previewUrl: null,
      })
      setScans((prev) => [saved, ...prev])
      setManualOpen(false)
      setToast(`+${entry.calories} kcal · ${entry.title}`)
    } finally {
      setSavingFood(false)
    }
  }

  const dateLabel = new Date().toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  })

  const macroCards = [
    { label: 'Prot', current: stats.protein, goal: goals.proteinGoal, color: 'bg-blue-500' },
    { label: 'Carb', current: stats.carbs, goal: goals.carbsGoal, color: 'bg-amber-500' },
    { label: 'Gord', current: stats.fat, goal: goals.fatGoal, color: 'bg-rose-500' },
  ]

  return (
    <>
      <div className="flex flex-col gap-5 px-4 pb-8">
        <header className="anim-rise flex items-end justify-between gap-3 pt-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
              {dateLabel} · Diário livre
            </p>
            <h1 className="font-display mt-1 text-3xl font-extrabold tracking-tight">
              Alimentação
            </h1>
            <p className="mt-1 text-sm text-neutral-400">
              Registre o que comeu e compare com seu gasto calórico
            </p>
          </div>
          <div className="rounded-2xl bg-brand/15 px-3 py-2 text-right">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-brand">Hoje</p>
            <p className="font-display text-lg font-bold text-brand">{stats.intake}</p>
            <p className="text-[10px] text-neutral-400">kcal</p>
          </div>
        </header>

        <section className="anim-rise anim-rise-delay-1 glass-panel rounded-3xl p-5">
          <div className="flex items-center gap-4">
            <div className="relative flex h-28 w-28 shrink-0 items-center justify-center">
              <svg className="absolute inset-0 -rotate-90" viewBox="0 0 112 112">
                <circle cx="56" cy="56" r="46" fill="none" className="chart-track" strokeWidth="9" />
                <circle
                  cx="56"
                  cy="56"
                  r="46"
                  fill="none"
                  stroke={stats.overGoal ? '#fb7185' : '#ff5a00'}
                  strokeWidth="9"
                  strokeLinecap="round"
                  strokeDasharray={`${stats.calorieProgress * 2.89} 289`}
                  className="transition-[stroke-dasharray] duration-500"
                />
              </svg>
              <div className="text-center">
                <p className="font-display text-2xl font-bold leading-none">{stats.calorieProgress}%</p>
                <p className="mt-1 text-[10px] text-neutral-400">da meta</p>
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-neutral-400">
                {stats.overGoal ? 'Acima da meta de consumo' : 'Ainda pode comer'}
              </p>
              <p className="font-display mt-0.5 text-2xl font-extrabold tracking-tight">
                {stats.overGoal ? `+${stats.intake - stats.calorieGoal}` : stats.remaining}
                <span className="ml-1 text-sm font-semibold text-neutral-400">kcal</span>
              </p>
              <p className="mt-2 text-xs leading-relaxed text-neutral-500">
                Meta {stats.calorieGoal} kcal · consumido {stats.intake} kcal
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl bg-surface-3/60 p-3">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-neutral-500">Gasto estimado</p>
              <p className="mt-1 text-lg font-bold">{stats.expenditure} kcal</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wider text-neutral-500">Saldo do dia</p>
              <p
                className={`mt-1 text-lg font-bold ${
                  stats.energyBalance > 50
                    ? 'text-amber-300'
                    : stats.energyBalance < -50
                      ? 'text-emerald-300'
                      : 'text-neutral-200'
                }`}
              >
                {stats.balanceLabel}
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            {macroCards.map((macro) => {
              const pct = Math.min(Math.round((macro.current / macro.goal) * 100), 100)
              return (
                <div key={macro.label} className="rounded-2xl bg-surface-3/80 p-3">
                  <p className="text-[10px] uppercase tracking-wider text-neutral-500">{macro.label}</p>
                  <p className="mt-1 text-sm font-bold">
                    {macro.current}
                    <span className="font-normal text-neutral-500">/{macro.goal}g</span>
                  </p>
                  <div className="mt-2 h-1 overflow-hidden rounded-full progress-track">
                    <div className={`h-full rounded-full ${macro.color}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        <section className="anim-rise anim-rise-delay-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
              Registrar o que comeu
            </h2>
            <button
              type="button"
              onClick={() => setShowGoals((v) => !v)}
              className="text-xs font-semibold text-brand"
            >
              {showGoals ? 'Fechar metas' : 'Ajustar metas'}
            </button>
          </div>

          {showGoals && goalsForm && (
            <form
              onSubmit={onSaveGoals}
              className="mb-3 grid gap-3 rounded-2xl border border-brand/20 bg-brand/5 p-4 sm:grid-cols-2"
            >
              <p className="text-sm font-semibold text-neutral-200 sm:col-span-2">
                Suas metas pessoais
              </p>
              <label className="text-xs text-neutral-400">
                Meta de consumo (kcal/dia)
                <input
                  type="number"
                  min={800}
                  required
                  value={goalsForm.calorieGoal}
                  onChange={(e) =>
                    setGoalsForm({ ...goalsForm, calorieGoal: Number(e.target.value) || 2000 })
                  }
                  className="mt-1 w-full rounded-xl bg-surface-3 px-3 py-2 text-sm"
                />
              </label>
              <label className="text-xs text-neutral-400">
                Gasto calórico estimado (kcal/dia)
                <input
                  type="number"
                  min={800}
                  required
                  value={goalsForm.calorieExpenditure}
                  onChange={(e) =>
                    setGoalsForm({
                      ...goalsForm,
                      calorieExpenditure: Number(e.target.value) || 2200,
                    })
                  }
                  className="mt-1 w-full rounded-xl bg-surface-3 px-3 py-2 text-sm"
                />
              </label>
              <label className="text-xs text-neutral-400">
                Proteína (g)
                <input
                  type="number"
                  min={0}
                  value={goalsForm.proteinGoal}
                  onChange={(e) =>
                    setGoalsForm({ ...goalsForm, proteinGoal: Number(e.target.value) || 0 })
                  }
                  className="mt-1 w-full rounded-xl bg-surface-3 px-3 py-2 text-sm"
                />
              </label>
              <label className="text-xs text-neutral-400">
                Carboidratos (g)
                <input
                  type="number"
                  min={0}
                  value={goalsForm.carbsGoal}
                  onChange={(e) =>
                    setGoalsForm({ ...goalsForm, carbsGoal: Number(e.target.value) || 0 })
                  }
                  className="mt-1 w-full rounded-xl bg-surface-3 px-3 py-2 text-sm"
                />
              </label>
              <label className="text-xs text-neutral-400">
                Gorduras (g)
                <input
                  type="number"
                  min={0}
                  value={goalsForm.fatGoal}
                  onChange={(e) =>
                    setGoalsForm({ ...goalsForm, fatGoal: Number(e.target.value) || 0 })
                  }
                  className="mt-1 w-full rounded-xl bg-surface-3 px-3 py-2 text-sm"
                />
              </label>
              <label className="text-xs text-neutral-400">
                Água (litros/dia)
                <input
                  type="number"
                  min={1}
                  step={0.5}
                  value={goalsForm.waterGoalLiters}
                  onChange={(e) =>
                    setGoalsForm({
                      ...goalsForm,
                      waterGoalLiters: Number(e.target.value) || 3,
                    })
                  }
                  className="mt-1 w-full rounded-xl bg-surface-3 px-3 py-2 text-sm"
                />
              </label>
              <button
                type="submit"
                disabled={savingGoals}
                className="rounded-xl bg-brand py-2.5 text-sm font-bold text-white disabled:opacity-60 sm:col-span-2"
              >
                {savingGoals ? 'Salvando…' : 'Salvar metas'}
              </button>
            </form>
          )}

          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setFoodPickerOpen(true)}
              className="pressable hero-checkin relative overflow-hidden rounded-2xl p-3 text-left"
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/70">Buscar</p>
              <p className="mt-1 text-sm font-bold leading-tight text-white">Alimento</p>
            </button>
            <button
              type="button"
              onClick={() => setManualOpen(true)}
              className="pressable glass-panel rounded-2xl border border-[var(--color-panel-border)] p-3 text-left"
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-brand">Manual</p>
              <p className="mt-1 text-sm font-bold leading-tight">Digitar kcal</p>
            </button>
            <button
              type="button"
              onClick={openCamera}
              className="pressable glass-panel rounded-2xl border border-[var(--color-panel-border)] p-3 text-left"
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-brand">Foto</p>
              <p className="mt-1 text-sm font-bold leading-tight">IA estima</p>
            </button>
          </div>
        </section>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            e.target.value = ''
            void onPickPhoto(file)
          }}
        />

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
              Diário de hoje
            </h3>
            {scans.length > 0 && (
              <span className="text-xs text-neutral-500">{scans.length} item(ns)</span>
            )}
          </div>
          {scans.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--color-border)] px-4 py-6 text-center">
              <p className="text-sm text-neutral-400">Nada registrado ainda</p>
              <p className="mt-1 text-xs text-neutral-500">
                Busque um alimento, digite as calorias ou use uma foto
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {scans.map((scan) => (
                <div key={scan.id} className="glass-panel flex items-center gap-3 rounded-2xl p-3">
                  {scan.previewUrl ? (
                    <img
                      src={scan.previewUrl}
                      alt=""
                      className="h-12 w-12 shrink-0 rounded-xl object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand/15 text-[10px] font-bold text-brand">
                      {scanSourceLabel(scan).slice(0, 3).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{scan.title}</p>
                    <p className="text-xs text-neutral-500">
                      {scanSourceLabel(scan)} · P {scan.protein}g · C {scan.carbs}g · G {scan.fat}g
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-sm font-bold text-brand">{scan.calories}</span>
                    <button
                      type="button"
                      onClick={() => void removeScan(scan.id)}
                      className="text-[11px] font-semibold text-rose-300/90"
                    >
                      Remover
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {plan && (
          <section className="rounded-2xl border border-[var(--color-panel-border)] bg-surface-2/50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Sugestão da academia
            </p>
            <p className="mt-1 font-semibold text-neutral-300">{plan.name}</p>
            <p className="mt-1 text-sm text-neutral-500">
              Referência opcional — seu diário acima é o que conta para o dia.
            </p>
          </section>
        )}

        <section className="glass-panel rounded-3xl p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-semibold">Água</p>
              <p className="text-sm text-neutral-400">
                {waterLiters.toFixed(1).replace('.0', '')}L de {waterGoal}L
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={savingWater || waterLiters <= 0}
                onClick={() => void bumpWater(-0.25)}
                className="pressable flex h-10 w-10 items-center justify-center rounded-xl bg-surface-3 text-lg font-bold disabled:opacity-40"
                aria-label="Remover 250ml"
              >
                −
              </button>
              <button
                type="button"
                disabled={savingWater}
                onClick={() => void bumpWater(0.25)}
                className="pressable rounded-xl bg-brand px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
              >
                +250ml
              </button>
            </div>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-3">
            <div
              className="h-full rounded-full bg-sky-500 transition-[width] duration-300"
              style={{
                width: `${Math.min(100, Math.round((waterLiters / Math.max(waterGoal, 0.1)) * 100))}%`,
              }}
            />
          </div>
        </section>
      </div>

      {toast && (
        <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] mx-auto max-w-[430px] px-4">
          <div className="diet-toast rounded-2xl bg-white px-4 py-3 text-center text-sm font-semibold text-brand-dark shadow-lg">
            {toast}
          </div>
        </div>
      )}

      <MealPhotoSheet
        open={sheetOpen}
        previewUrl={previewUrl}
        analyzing={analyzing}
        analysis={analysis}
        error={scanError}
        confirming={confirming}
        onClose={() => {
          if (analyzing) return
          setSheetOpen(false)
          setPreviewUrl(null)
          setAnalysis(null)
          setScanError('')
        }}
        onChange={setAnalysis}
        onConfirm={() => void confirmScan()}
      />

      <FoodPickerSheet
        open={foodPickerOpen}
        confirming={savingFood}
        onClose={() => setFoodPickerOpen(false)}
        onConfirm={(portion) => void addFoodPortion(portion)}
      />

      <ManualFoodSheet
        open={manualOpen}
        confirming={savingFood}
        onClose={() => setManualOpen(false)}
        onConfirm={(entry) => void addManualFood(entry)}
      />
    </>
  )
}
