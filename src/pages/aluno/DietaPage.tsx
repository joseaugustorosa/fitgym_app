import { useEffect, useRef, useState } from 'react'
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

export function DietaPage() {
  const { profile, isDemo } = useAuth()
  const fileRef = useRef<HTMLInputElement>(null)
  const [plan, setPlan] = useState<MealPlan | null>(null)
  const [water, setWater] = useState<WaterLog | null>(null)
  const [scans, setScans] = useState<MealScan[]>([])
  const [eaten, setEaten] = useState<string[]>([])
  const [savingWater, setSavingWater] = useState(false)

  const [sheetOpen, setSheetOpen] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<MealAnalysisResult | null>(null)
  const [scanError, setScanError] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [foodPickerOpen, setFoodPickerOpen] = useState(false)
  const [savingFood, setSavingFood] = useState(false)

  async function reloadScans(uid: string) {
    const list = await listMealScans(uid)
    setScans(list)
  }

  useEffect(() => {
    if (!profile) return
    getMealPlanForUser(profile).then(setPlan)
    getWaterLog(profile.uid).then(setWater)
    reloadScans(profile.uid).catch(() => undefined)
    getEatenMeals(profile.uid).then(setEaten).catch(() => undefined)
  }, [profile])

  if (!plan) {
    return (
      <div className="flex items-center justify-center px-4 py-20 text-neutral-400">
        Carregando dieta…
      </div>
    )
  }

  const eatenMeals = plan.meals.filter((m) => eaten.includes(m.name))
  const planCalories = eatenMeals.reduce((sum, m) => sum + m.calories, 0)
  const scanCalories = scans.reduce((sum, s) => sum + s.calories, 0)
  const totalCalories = planCalories + scanCalories
  const goalCalories = plan.caloriesGoal
  const calorieProgress = Math.min(Math.round((totalCalories / goalCalories) * 100), 100)
  const glasses = Math.round(((water?.liters ?? 0) / (water?.goalLiters ?? 3)) * 6)

  const proteinExtra = scans.reduce((s, x) => s + x.protein, 0)
  const carbsExtra = scans.reduce((s, x) => s + x.carbs, 0)
  const fatExtra = scans.reduce((s, x) => s + x.fat, 0)
  // distribuição aproximada das refeições marcadas (proporcional às kcal)
  const eatenRatio =
    plan.meals.reduce((s, m) => s + m.calories, 0) > 0
      ? planCalories / plan.meals.reduce((s, m) => s + m.calories, 0)
      : 0

  async function toggleMeal(name: string) {
    if (!profile) return
    const next = await toggleEatenMeal(profile.uid, name)
    setEaten(next)
  }

  async function bumpWater(delta: number) {
    if (!profile || !water || savingWater) return
    const next = Math.max(0, Math.min(water.goalLiters, Number((water.liters + delta).toFixed(1))))
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
                'IA no servidor ainda não liberada (ative Vertex AI no Google Cloud). Ajuste os valores ou adicione VITE_GEMINI_API_KEY no .env.',
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
    } catch (err) {
      setScanError(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally {
      setConfirming(false)
    }
  }

  async function removeScan(id: string) {
    await deleteMealScan(id, profile?.uid)
    setScans((prev) => prev.filter((s) => s.id !== id))
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
    } finally {
      setSavingFood(false)
    }
  }

  return (
    <>
      <div className="flex flex-col gap-5 px-4 pb-6">
        <header className="flex items-end justify-between gap-3 pt-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
              {plan.name}
            </p>
            <h1 className="font-display mt-1 text-3xl font-extrabold tracking-tight">
              Dieta de hoje
            </h1>
          </div>
        </header>

        <button
          onClick={() => setFoodPickerOpen(true)}
          className="pressable hero-checkin relative overflow-hidden rounded-3xl p-5 text-left"
        >
          <div className="relative z-10">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/75">
              Registrar comida
            </p>
            <h2 className="mt-2 text-2xl font-bold text-white">O que você comeu?</h2>
            <p className="mt-1 text-sm text-white/80">
              Busque na base de alimentos ou estime com IA
            </p>
            <span className="mt-4 inline-flex rounded-2xl bg-white px-4 py-2.5 text-sm font-bold text-brand-dark">
              Escolher alimento
            </span>
          </div>
        </button>

        <button
          onClick={openCamera}
          className="pressable glass-panel rounded-3xl p-4 text-left"
        >
          <p className="font-semibold text-brand">Ou fotografar o prato</p>
          <p className="mt-1 text-sm text-neutral-400">
            A IA analisa a foto e estima as calorias
          </p>
        </button>

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

        <section className="glass-panel rounded-3xl p-5">
          <div className="flex items-center gap-5">
            <div className="relative flex h-24 w-24 shrink-0 items-center justify-center">
              <svg className="absolute inset-0 -rotate-90" viewBox="0 0 96 96">
                <circle cx="48" cy="48" r="40" fill="none" stroke="#262626" strokeWidth="8" />
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  fill="none"
                  stroke="#ff6b00"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${calorieProgress * 2.51} 251`}
                />
              </svg>
              <div className="text-center">
                <p className="font-display text-xl font-bold">{totalCalories}</p>
                <p className="text-[10px] text-neutral-400">kcal</p>
              </div>
            </div>
            <div className="flex-1">
              <p className="text-sm text-neutral-400">Meta diária</p>
              <p className="font-display text-2xl font-bold">
                {Math.max(goalCalories - totalCalories, 0)}
                <span className="text-sm font-normal text-neutral-400"> kcal restantes</span>
              </p>
              <p className="mt-1 text-xs text-neutral-500">
                Comidas {planCalories} + fotos {scanCalories} · {calorieProgress}%
              </p>
            </div>
          </div>
        </section>

        <section>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
            Macronutrientes
          </h3>
          <div className="flex flex-col gap-3">
            {plan.macros.map((macro) => {
              const fromPlan = Math.round(macro.goal * eatenRatio * 0.7)
              const extra =
                macro.label.toLowerCase().includes('prote')
                  ? proteinExtra
                  : macro.label.toLowerCase().includes('carb')
                    ? carbsExtra
                    : macro.label.toLowerCase().includes('gord')
                      ? fatExtra
                      : 0
              const current = fromPlan + extra
              const pct = Math.min(Math.round((current / macro.goal) * 100), 100)
              return (
                <div key={macro.label} className="glass-panel rounded-2xl p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-medium">{macro.label}</span>
                    <span className="text-sm text-neutral-400">
                      {current}/{macro.goal}
                      {macro.unit}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
                    <div
                      className={`h-full rounded-full ${macro.color} transition-all`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {scans.length > 0 && (
          <section>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
              Registradas por foto
            </h3>
            <div className="flex flex-col gap-3">
              {scans.map((scan) => (
                <div key={scan.id} className="glass-panel overflow-hidden rounded-2xl">
                  <div className="flex gap-3 p-3">
                    {scan.previewUrl ? (
                      <img
                        src={scan.previewUrl}
                        alt=""
                        className="h-16 w-16 shrink-0 rounded-xl object-cover"
                      />
                    ) : (
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-brand/15 font-display text-xs font-bold text-brand">
                        SCAN
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold">{scan.title}</p>
                          <p className="text-xs text-neutral-500">
                            P {scan.protein}g · C {scan.carbs}g · G {scan.fat}g
                          </p>
                        </div>
                        <span className="text-sm font-bold text-brand">{scan.calories} kcal</span>
                      </div>
                      {scan.items.length > 0 && (
                        <p className="mt-1 truncate text-xs text-neutral-400">
                          {scan.items.join(' · ')}
                        </p>
                      )}
                      <button
                        onClick={() => removeScan(scan.id)}
                        className="mt-2 text-xs font-semibold text-rose-300"
                      >
                        Remover
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
              Plano alimentar
            </h3>
            <p className="text-xs text-neutral-500">Toque para marcar como comida</p>
          </div>
          <div className="flex flex-col gap-3">
            {plan.meals.map((meal) => {
              const done = eaten.includes(meal.name)
              return (
                <button
                  key={meal.name}
                  type="button"
                  onClick={() => void toggleMeal(meal.name)}
                  className={`glass-panel rounded-2xl p-4 text-left transition-colors ${
                    done ? 'border border-brand/30 bg-brand/10' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold ${
                        done
                          ? 'border-brand bg-brand text-white'
                          : 'border-neutral-600 text-neutral-500'
                      }`}
                    >
                      {done ? '✓' : ''}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className={`font-semibold ${done ? 'text-brand-light' : ''}`}>
                            {meal.name}
                          </p>
                          <p className="text-xs text-neutral-500">{meal.time}</p>
                        </div>
                        <span className="text-sm font-bold text-brand">{meal.calories} kcal</span>
                      </div>
                      <ul className="mt-2 flex flex-wrap gap-1.5">
                        {meal.items.map((item) => (
                          <li
                            key={item}
                            className="rounded-lg bg-surface-3 px-2.5 py-0.5 text-xs text-neutral-300"
                          >
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </section>

        <section className="glass-panel rounded-3xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold">Hidratação</p>
              <p className="text-sm text-neutral-400">
                {(water?.liters ?? 0).toFixed(1)}L de {water?.goalLiters ?? 3}L
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => bumpWater(-0.5)}
                className="pressable h-8 w-8 rounded-xl bg-surface-3 text-lg font-bold"
              >
                −
              </button>
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div
                    key={i}
                    className={`h-8 w-3 rounded-full ${i <= glasses ? 'bg-blue-500' : 'bg-surface-3'}`}
                  />
                ))}
              </div>
              <button
                onClick={() => bumpWater(0.5)}
                className="pressable h-8 w-8 rounded-xl bg-surface-3 text-lg font-bold"
              >
                +
              </button>
            </div>
          </div>
        </section>
      </div>

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
