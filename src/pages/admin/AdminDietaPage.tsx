import { useEffect, useState, type FormEvent } from 'react'
import { listMealPlans, saveMealPlan } from '../../services/api'
import { defaultMealPlan } from '../../data/defaults'
import type { MealItem, MealPlan } from '../../types'

const field =
  'w-full rounded-xl border border-border bg-surface-3 px-3 py-2 outline-none focus:border-brand'

const emptyMeal = (): MealItem => ({
  time: '12:00',
  name: '',
  calories: 400,
  items: [''],
  emoji: '🍽️',
})

export function AdminDietaPage() {
  const [plans, setPlans] = useState<MealPlan[]>([])
  const [form, setForm] = useState<MealPlan>({
    id: 'default-meal-plan',
    userId: null,
    isDefault: true,
    ...defaultMealPlan,
  })
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  async function reload() {
    const list = await listMealPlans()
    setPlans(list)
    const def = list.find((p) => p.isDefault) ?? list[0]
    if (def) setForm(def)
  }

  useEffect(() => {
    reload().catch(() => undefined)
  }, [])

  async function onSave(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      const cleaned: MealPlan = {
        ...form,
        meals: form.meals.map((m) => ({
          ...m,
          items: m.items.map((i) => i.trim()).filter(Boolean),
        })),
      }
      await saveMealPlan(cleaned)
      setMessage('Plano alimentar salvo')
      await reload()
    } finally {
      setBusy(false)
    }
  }

  function updateMeal(idx: number, patch: Partial<MealItem>) {
    const meals = [...form.meals]
    meals[idx] = { ...meals[idx], ...patch }
    setForm({ ...form, meals })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-bold">Dieta</h2>
        <button
          type="button"
          onClick={() =>
            setForm({
              id: 'default-meal-plan',
              userId: null,
              isDefault: true,
              ...defaultMealPlan,
            })
          }
          className="rounded-xl bg-brand/15 px-3 py-2 text-xs font-bold text-brand"
        >
          Carregar template padrão
        </button>
      </div>
      {message && (
        <p className="rounded-xl bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">{message}</p>
      )}

      <form onSubmit={onSave} className="flex flex-col gap-3 rounded-2xl bg-surface-2 p-4">
        <input
          required
          placeholder="Nome do plano"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className={field}
        />
        <input
          type="number"
          required
          placeholder="Meta de kcal"
          value={form.caloriesGoal}
          onChange={(e) => setForm({ ...form, caloriesGoal: Number(e.target.value) || 0 })}
          className={field}
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.isDefault}
            onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
          />
          Usar como template padrão para novos alunos
        </label>

        <p className="text-sm font-semibold text-neutral-400">Macros</p>
        {form.macros.map((macro, idx) => (
          <div key={macro.label} className="grid grid-cols-3 gap-2">
            <input
              value={macro.label}
              onChange={(e) => {
                const macros = [...form.macros]
                macros[idx] = { ...macro, label: e.target.value }
                setForm({ ...form, macros })
              }}
              className={field}
            />
            <input
              type="number"
              value={macro.current}
              onChange={(e) => {
                const macros = [...form.macros]
                macros[idx] = { ...macro, current: Number(e.target.value) || 0 }
                setForm({ ...form, macros })
              }}
              className={field}
              placeholder="Atual"
            />
            <input
              type="number"
              value={macro.goal}
              onChange={(e) => {
                const macros = [...form.macros]
                macros[idx] = { ...macro, goal: Number(e.target.value) || 0 }
                setForm({ ...form, macros })
              }}
              className={field}
              placeholder="Meta"
            />
          </div>
        ))}

        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-neutral-400">Refeições</p>
          <button
            type="button"
            onClick={() => setForm({ ...form, meals: [...form.meals, emptyMeal()] })}
            className="text-xs font-bold text-brand"
          >
            + Refeição
          </button>
        </div>

        {form.meals.map((meal, idx) => (
          <div key={idx} className="rounded-xl border border-border bg-surface-3/50 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs text-neutral-500">Refeição {idx + 1}</span>
              <button
                type="button"
                onClick={() =>
                  setForm({ ...form, meals: form.meals.filter((_, i) => i !== idx) })
                }
                className="text-xs text-rose-300"
              >
                Remover
              </button>
            </div>
            <div className="grid grid-cols-4 gap-2">
              <input
                value={meal.emoji}
                onChange={(e) => updateMeal(idx, { emoji: e.target.value })}
                className={field}
                placeholder="Emoji"
              />
              <input
                value={meal.time}
                onChange={(e) => updateMeal(idx, { time: e.target.value })}
                className={field}
                placeholder="Horário"
              />
              <input
                value={meal.name}
                onChange={(e) => updateMeal(idx, { name: e.target.value })}
                className={`col-span-2 ${field}`}
                placeholder="Nome"
                required
              />
            </div>
            <input
              type="number"
              value={meal.calories}
              onChange={(e) => updateMeal(idx, { calories: Number(e.target.value) || 0 })}
              className={`mt-2 ${field}`}
              placeholder="kcal"
            />
            <input
              value={meal.items.join(', ')}
              onChange={(e) =>
                updateMeal(idx, {
                  items: e.target.value.split(',').map((x) => x.trim()),
                })
              }
              className={`mt-2 ${field}`}
              placeholder="Itens separados por vírgula"
            />
          </div>
        ))}

        <button
          type="submit"
          disabled={busy}
          className="rounded-xl bg-brand py-3 font-bold text-white disabled:opacity-60"
        >
          Salvar plano
        </button>
      </form>

      <div className="flex flex-col gap-2">
        {plans.map((p) => (
          <button
            key={p.id}
            onClick={() => setForm(p)}
            className="rounded-xl bg-surface-2 px-3 py-2 text-left text-sm"
          >
            {p.name} {p.isDefault ? '· padrão' : ''} · {p.caloriesGoal} kcal
          </button>
        ))}
      </div>
    </div>
  )
}
