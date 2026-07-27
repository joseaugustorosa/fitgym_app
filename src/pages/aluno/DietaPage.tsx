import { useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { MealPhotoSheet } from '../../components/MealPhotoSheet'
import { FoodPickerSheet } from '../../components/FoodPickerSheet'
import { compressImageFile } from '../../lib/image'
import { todayKey } from '../../lib/dates'
import {
  analyzeMealPhotoRemote,
  deleteMealScan,
  getEatenMeals,
  getMealPlanForUser,
  getWaterLog,
  listMealScans,
  mockMealAnalysis,
  saveMealScan,
  setWaterLiters,
  toggleEatenMeal,
} from '../../services/api'
import { analyzeMealPhotoWithGeminiKey, hasGeminiBrowserKey } from '../../services/mealAi'
import { isFirebaseConfigured } from '../../lib/firebase'
import type { FoodPortion } from '../../services/foodApi'
import type { MealAnalysisResult, MealPlan, MealScan, WaterLog } from '../../types'

function scanSourceLabel(scan: MealScan) {
  const note = (scan.notes || '').toLowerCase()
  const items = scan.items.map((i) => i.toLowerCase())
  if (note.includes('open food') || items.includes('openfoodfacts')) return 'Base de comidas'
  if (note.includes('catálogo') || items.includes('catalog')) return 'Catálogo'
  if (note.includes('ia') || items.includes('ai') || scan.confidence < 0.7) return 'Estimativa IA'
  if (scan.previewUrl) return 'Foto'
  return 'Registrado'
}

export function DietaPage() {
  const { profile, isDemo } = useAuth()
  const fileRef = useRef<HTMLInputElement>(null)
  const [plan, setPlan] = useState<MealPlan | null>(null)
  const [water, setWater] = useState<WaterLog | null>(null)
  const [scans, setScans] = useState<MealScan[]>([])
  const [eaten, setEaten] = useState<string[]>([])
  const [savingWater, setSavingWater] = useState(false)
  const [toast, setToast] = useState('')

  const [sheetOpen, setSheetOpen] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<MealAnalysisResult | null>(null)
  const [scanError, setScanError] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [foodPickerOpen, setFoodPickerOpen] = useState(false)
  const [savingFood, setSavingFood] = useState(false)

  useEffect(() => {
    if (!profile) return
    getMealPlanForUser(profile).then(setPlan)
    getWaterLog(profile.uid).then(setWater)
    listMealScans(profile.uid).then(setScans).catch(() => undefined)
    getEatenMeals(profile.uid).then(setEaten).catch(() => undefined)
  }, [profile])

  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(''), 2200)
    return () => window.clearTimeout(t)
  }, [toast])

  const stats = useMemo(() => {
    if (!plan) return null
    const eatenMeals = plan.meals.filter((m) => eaten.includes(m.name))
    const planCalories = eatenMeals.reduce((sum, m) => sum + m.calories, 0)
    const scanCalories = scans.reduce((sum, s) => sum + s.calories, 0)
    const totalCalories = planCalories + scanCalories
    const goalCalories = plan.caloriesGoal
    const remaining = Math.max(goalCalories - totalCalories, 0)
    const calorieProgress = Math.min(Math.round((totalCalories / goalCalories) * 100), 100)
    const overGoal = totalCalories > goalCalories
    const mealsDone = eatenMeals.length
    const mealsTotal = plan.meals.length
    const nextMeal = plan.meals.find((m) => !eaten.includes(m.name)) ?? null

    const planCalTotal = plan.meals.reduce((s, m) => s + m.calories, 0)
    const eatenRatio = planCalTotal > 0 ? planCalories / planCalTotal : 0
    const proteinExtra = scans.reduce((s, x) => s + x.protein, 0)
    const carbsExtra = scans.reduce((s, x) => s + x.carbs, 0)
    const fatExtra = scans.reduce((s, x) => s + x.fat, 0)

    return {
      planCalories,
      scanCalories,
      totalCalories,
      goalCalories,
      remaining,
      calorieProgress,
      overGoal,
      mealsDone,
      mealsTotal,
      nextMeal,
      eatenRatio,
      proteinExtra,
      carbsExtra,
      fatExtra,
    }
  }, [plan, eaten, scans])

  if (!plan || !stats) {
    return (
      <div className="flex items-center justify-center px-4 py-20 text-neutral-400">
        Carregando alimentação…
      </div>
    )
  }

  const waterLiters = water?.liters ?? 0
  const waterGoal = water?.goalLiters ?? 3
  const waterPct = Math.min(100, Math.round((waterLiters / Math.max(waterGoal, 0.1)) * 100))

  async function toggleMeal(name: string) {
    if (!profile) return
    const next = await toggleEatenMeal(profile.uid, name)
    setEaten(next)
    const justAte = next.includes(name) && !eaten.includes(name)
    if (justAte) setToast(`${name} marcada`)
  }

  async function bumpWater(delta: number) {
    if (!profile || savingWater) return
    const next = Math.max(0, Math.min(waterGoal, Number((waterLiters + delta).toFixed(2))))
    setSavingWater(true)
    try {
      const updated = await setWaterLiters(profile.uid, next)
      setWater(updated)
    } finally {
      setSavingWater(false)
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
      if (isDemo || !isFirebaseConfigured) {
        if (hasGeminiBrowserKey()) {
          result = await analyzeMealPhotoWithGeminiKey(
            compressed.base64,
            compressed.mimeType,
          )
        } else {
          await new Promise((r) => setTimeout(r, 900))
          result = mockMealAnalysis()
        }
      } else {
        try {
          result = await analyzeMealPhotoRemote({
            imageBase64: compressed.base64,
            mimeType: compressed.mimeType,
          })
        } catch {
          if (hasGeminiBrowserKey()) {
            result = await analyzeMealPhotoWithGeminiKey(
              compressed.base64,
              compressed.mimeType,
            )
          } else {
            result = {
              ...mockMealAnalysis(),
              notes:
                'IA no servidor ainda não liberada. Ajuste os valores ou adicione VITE_GEMINI_API_KEY.',
              confidence: 0.2,
            }
          }
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
    await deleteMealScan(id, profile?.uid)
    setScans((prev) => prev.filter((s) => s.id !== id))
    setToast('Item removido')
  }

  async function addFoodPortion(portion: FoodPortion) {
    if (!profile) return
    setSavingFood(true)
    try {
      const saved = await saveMealScan({
        userId: profile.uid,
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

  const dateLabel = new Date().toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  })

  return (
    <>
      <div className="flex flex-col gap-5 px-4 pb-8">
        <header className="anim-rise flex items-end justify-between gap-3 pt-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
              {dateLabel} · {plan.name}
            </p>
            <h1 className="font-display mt-1 text-3xl font-extrabold tracking-tight">
              Alimentação
            </h1>
          </div>
          <div className="rounded-2xl bg-brand/15 px-3 py-2 text-right">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-brand">Hoje</p>
            <p className="font-display text-lg font-bold text-brand">{stats.totalCalories}</p>
            <p className="text-[10px] text-neutral-400">kcal</p>
          </div>
        </header>

        {/* Resumo do dia — primeiro o que importa */}
        <section className="anim-rise anim-rise-delay-1 glass-panel rounded-3xl p-5">
          <div className="flex items-center gap-4">
            <div className="relative flex h-28 w-28 shrink-0 items-center justify-center">
              <svg className="absolute inset-0 -rotate-90" viewBox="0 0 112 112">
                <circle cx="56" cy="56" r="46" fill="none" stroke="#262626" strokeWidth="9" />
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
                {stats.overGoal ? 'Acima da meta' : 'Ainda pode comer'}
              </p>
              <p className="font-display mt-0.5 text-2xl font-extrabold tracking-tight">
                {stats.overGoal
                  ? `+${stats.totalCalories - stats.goalCalories}`
                  : stats.remaining}
                <span className="ml-1 text-sm font-semibold text-neutral-400">kcal</span>
              </p>
              <p className="mt-2 text-xs leading-relaxed text-neutral-500">
                Meta {stats.goalCalories} · plano {stats.planCalories} · extras {stats.scanCalories}
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            {plan.macros.map((macro) => {
              const fromPlan = Math.round(macro.goal * stats.eatenRatio * 0.7)
              const extra = macro.label.toLowerCase().includes('prote')
                ? stats.proteinExtra
                : macro.label.toLowerCase().includes('carb')
                  ? stats.carbsExtra
                  : macro.label.toLowerCase().includes('gord')
                    ? stats.fatExtra
                    : 0
              const current = fromPlan + extra
              const pct = Math.min(Math.round((current / macro.goal) * 100), 100)
              const short = macro.label.toLowerCase().includes('prote')
                ? 'Prot'
                : macro.label.toLowerCase().includes('carb')
                  ? 'Carb'
                  : 'Gord'
              return (
                <div key={macro.label} className="rounded-2xl bg-surface-3/80 p-3">
                  <p className="text-[10px] uppercase tracking-wider text-neutral-500">{short}</p>
                  <p className="mt-1 text-sm font-bold">
                    {current}
                    <span className="font-normal text-neutral-500">/{macro.goal}g</span>
                  </p>
                  <div className="mt-2 h-1 overflow-hidden rounded-full bg-black/30">
                    <div
                      className={`h-full rounded-full ${macro.color}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* Ação principal: registrar */}
        <section className="anim-rise anim-rise-delay-2">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
            Registrar o que comeu
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setFoodPickerOpen(true)}
              className="pressable hero-checkin relative overflow-hidden rounded-3xl p-4 text-left"
            >
              <div className="relative z-10">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/70">
                  Mais fácil
                </p>
                <p className="mt-2 text-lg font-bold leading-tight text-white">Buscar alimento</p>
                <p className="mt-1 text-xs text-white/75">Lista ou IA</p>
              </div>
            </button>
            <button
              type="button"
              onClick={openCamera}
              className="pressable glass-panel rounded-3xl border border-white/10 p-4 text-left"
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-brand">
                Com foto
              </p>
              <p className="mt-2 text-lg font-bold leading-tight">Fotografar prato</p>
              <p className="mt-1 text-xs text-neutral-400">IA estima kcal</p>
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

        {/* Próxima refeição do plano */}
        {stats.nextMeal && (
          <button
            type="button"
            onClick={() => void toggleMeal(stats.nextMeal!.name)}
            className="pressable anim-rise anim-rise-delay-3 overflow-hidden rounded-3xl border border-brand/25 bg-gradient-to-br from-brand/20 to-transparent p-4 text-left"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-brand">
                  Próxima do plano · {stats.nextMeal.time}
                </p>
                <p className="mt-1 text-lg font-bold">{stats.nextMeal.name}</p>
                <p className="mt-1 text-xs text-neutral-400">
                  {stats.nextMeal.items.slice(0, 3).join(' · ')}
                  {stats.nextMeal.items.length > 3 ? '…' : ''}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-brand">{stats.nextMeal.calories}</p>
                <p className="text-[10px] text-neutral-500">kcal</p>
              </div>
            </div>
            <p className="mt-3 text-xs font-semibold text-brand">Toque para marcar como comida ✓</p>
          </button>
        )}

        {/* Itens registrados fora do plano */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
              Adicionados hoje
            </h3>
            {scans.length > 0 && (
              <span className="text-xs text-neutral-500">{scans.length} item(ns)</span>
            )}
          </div>
          {scans.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-center">
              <p className="text-sm text-neutral-400">Nada registrado ainda</p>
              <p className="mt-1 text-xs text-neutral-500">
                Use buscar ou foto acima, ou marque o plano abaixo
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {scans.map((scan) => (
                <div
                  key={scan.id}
                  className="glass-panel flex items-center gap-3 rounded-2xl p-3"
                >
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

        {/* Plano alimentar */}
        <section>
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
              Seu plano
            </h3>
            <span className="rounded-full bg-surface-3 px-2.5 py-1 text-[11px] font-semibold text-neutral-300">
              {stats.mealsDone}/{stats.mealsTotal} feitas
            </span>
          </div>
          <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-surface-3">
            <div
              className="h-full rounded-full bg-brand transition-[width] duration-400"
              style={{
                width: `${stats.mealsTotal ? (stats.mealsDone / stats.mealsTotal) * 100 : 0}%`,
              }}
            />
          </div>
          <div className="flex flex-col gap-2">
            {plan.meals.map((meal) => {
              const done = eaten.includes(meal.name)
              return (
                <button
                  key={meal.name}
                  type="button"
                  onClick={() => void toggleMeal(meal.name)}
                  className={`pressable flex items-start gap-3 rounded-2xl p-4 text-left transition-colors ${
                    done
                      ? 'border border-brand/30 bg-brand/10'
                      : 'glass-panel'
                  }`}
                >
                  <span
                    className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold transition-colors ${
                      done
                        ? 'border-brand bg-brand text-white'
                        : 'border-neutral-600 text-transparent'
                    }`}
                  >
                    ✓
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className={`font-semibold ${done ? 'text-brand-light' : ''}`}>
                          {meal.name}
                        </p>
                        <p className="text-xs text-neutral-500">{meal.time}</p>
                      </div>
                      <span className="shrink-0 text-sm font-bold text-brand">
                        {meal.calories} kcal
                      </span>
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-neutral-400">
                      {meal.items.join(' · ')}
                    </p>
                    <p className="mt-2 text-[11px] font-medium text-neutral-500">
                      {done ? 'Comida — toque para desmarcar' : 'Toque se já comeu esta refeição'}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>
        </section>

        {/* Água */}
        <section className="glass-panel rounded-3xl p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-semibold">Água</p>
              <p className="text-sm text-neutral-400">
                {waterLiters.toFixed(1).replace('.0', '')}L de {waterGoal}L · {waterPct}%
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
              style={{ width: `${waterPct}%` }}
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
    </>
  )
}
