import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import {
  deleteWorkoutPlan,
  listExercises,
  listWorkoutPlans,
  saveExercise,
  saveWorkoutPlan,
} from '../../services/api'
import { defaultExercises, defaultWorkoutProgram } from '../../data/defaults'
import { FormField, adminField } from '../../components/FormField'
import { emptyPlan, normalizeWorkoutPlan, planSummary } from '../../lib/workoutPlan'
import type { WorkoutPlan } from '../../types'

const field = adminField

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export function AdminTreinosPage() {
  const { profile } = useAuth()
  const gymId = profile?.gymId ?? ''
  const [plans, setPlans] = useState<WorkoutPlan[]>([])
  const [exerciseCount, setExerciseCount] = useState(0)
  const [form, setForm] = useState({ name: '', description: '', level: 'Intermediário' })
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)

  async function reload() {
    if (!gymId) return
    const [p, ex] = await Promise.all([listWorkoutPlans(gymId), listExercises(gymId)])
    setPlans(p)
    setExerciseCount(ex.length)
  }

  useEffect(() => {
    reload().finally(() => setLoading(false))
  }, [gymId])

  async function onCreatePlan(e: FormEvent) {
    e.preventDefault()
    if (!gymId) return
    setBusy(true)
    setMessage('')
    try {
      const plan = emptyPlan(gymId)
      plan.id = slugify(form.name) || `plano-${Date.now()}`
      plan.name = form.name.trim()
      plan.description = form.description.trim()
      plan.level = form.level
      await saveWorkoutPlan(plan)
      setForm({ name: '', description: '', level: 'Intermediário' })
      setMessage('Plano criado — abra para adicionar os dias de treino')
      await reload()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Erro ao criar plano')
    } finally {
      setBusy(false)
    }
  }

  async function importPresets() {
    if (!gymId) return
    if (!window.confirm(`Importar catálogo completo (${defaultExercises.length} exercícios) + Programa ABC com 4 dias de treino?`)) {
      return
    }
    setBusy(true)
    setMessage('')
    try {
      for (const ex of defaultExercises) {
        await saveExercise({ ...ex, gymId })
      }
      await saveWorkoutPlan({ ...defaultWorkoutProgram, gymId })
      setMessage(`Preset importado: ${defaultExercises.length} exercícios + Programa ABC (Treino A–D)`)
      await reload()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Erro ao importar preset')
    } finally {
      setBusy(false)
    }
  }

  async function onDeletePlan(plan: WorkoutPlan) {
    const p = normalizeWorkoutPlan(plan)
    if (!window.confirm(`Excluir o plano "${p.name}"? Os alunos perderão a referência se estiver atribuído.`)) {
      return
    }
    setBusy(true)
    setMessage('')
    try {
      await deleteWorkoutPlan(plan.id)
      setMessage('Plano excluído')
      await reload()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Erro ao excluir plano')
    } finally {
      setBusy(false)
    }
  }

  if (!gymId) {
    return <p className="text-neutral-400">Perfil sem academia vinculada.</p>
  }

  if (loading) return <p className="text-neutral-400">Carregando programas…</p>

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold lg:text-2xl">Programas de treino</h2>
          <p className="mt-1 text-sm text-neutral-400">
            Crie planos, organize dias (Treino A, B, C…) e atribua o conjunto ao aluno.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/admin/treinos/catalogo"
            className="rounded-xl border border-white/10 bg-surface-2 px-4 py-2 text-sm font-semibold text-neutral-300"
          >
            Catálogo ({exerciseCount})
          </Link>
          <button
            type="button"
            disabled={busy}
            onClick={() => void importPresets()}
            className="rounded-xl bg-brand/15 px-4 py-2 text-sm font-bold text-brand disabled:opacity-50"
          >
            Importar preset completo
          </button>
        </div>
      </div>

      {message && (
        <p
          className={`rounded-xl px-3 py-2 text-sm ${
            message.includes('Erro') ? 'bg-rose-500/10 text-rose-300' : 'bg-emerald-500/10 text-emerald-300'
          }`}
        >
          {message}
        </p>
      )}

      <form onSubmit={onCreatePlan} className="grid gap-3 rounded-2xl bg-surface-2 p-4 lg:grid-cols-3 lg:p-5">
        <FormField label="Nome do programa" hint="Ex: Programa ABC, Hipertrofia 4x">
          <input
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className={field}
          />
        </FormField>
        <FormField label="Descrição" hint="Opcional — divisão ou objetivo">
          <input
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className={field}
          />
        </FormField>
        <FormField label="Nível">
          <select
            value={form.level}
            onChange={(e) => setForm({ ...form, level: e.target.value })}
            className={field}
          >
            <option>Iniciante</option>
            <option>Intermediário</option>
            <option>Avançado</option>
          </select>
        </FormField>
        <button
          type="submit"
          disabled={busy}
          className="rounded-xl bg-brand py-3 font-bold text-white disabled:opacity-60 lg:col-span-3"
        >
          Criar programa
        </button>
      </form>

      <section>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-500">
          Seus programas ({plans.length})
        </h3>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {plans.map((plan) => {
            const p = normalizeWorkoutPlan(plan)
            return (
              <div
                key={plan.id}
                className="flex flex-col rounded-2xl bg-surface-2 p-4 transition-colors hover:bg-surface-3/80"
              >
                <Link to={`/admin/treinos/${plan.id}`} className="flex-1">
                  <p className="font-semibold text-brand">{p.name}</p>
                  {p.description && (
                    <p className="mt-1 line-clamp-2 text-sm text-neutral-400">{p.description}</p>
                  )}
                  <p className="mt-2 text-xs text-neutral-500">
                    {planSummary(p)} · {p.level} · {p.active ? 'ativo' : 'inativo'}
                  </p>
                </Link>
                <div className="mt-3 flex gap-2 border-t border-white/6 pt-3">
                  <Link
                    to={`/admin/treinos/${plan.id}`}
                    className="flex-1 rounded-lg bg-brand/15 py-2 text-center text-xs font-bold text-brand"
                  >
                    Editar programa
                  </Link>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void onDeletePlan(plan)}
                    className="rounded-lg px-3 py-2 text-xs font-semibold text-rose-300 disabled:opacity-50"
                  >
                    Excluir
                  </button>
                </div>
              </div>
            )
          })}
          {plans.length === 0 && (
            <p className="col-span-full rounded-2xl bg-surface-2 p-6 text-sm text-neutral-400">
              Nenhum programa ainda. Importe o preset completo ou crie um acima.
            </p>
          )}
        </div>
      </section>
    </div>
  )
}
