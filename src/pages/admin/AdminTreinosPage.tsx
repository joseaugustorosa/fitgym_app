import { useEffect, useState, type FormEvent } from 'react'
import {
  deleteExercise,
  deleteWorkoutPlan,
  listExercises,
  listWorkoutPlans,
  saveExercise,
  saveWorkoutPlan,
} from '../../services/api'
import { defaultExercises } from '../../data/defaults'
import type { Exercise, WorkoutPlan } from '../../types'

const field =
  'w-full rounded-xl border border-border bg-surface-3 px-3 py-2 outline-none focus:border-brand'

const emptyExercise = (): Exercise => ({
  id: '',
  name: '',
  sets: '3×12',
  rest: '60s',
  muscle: 'Peitoral',
  equipment: '',
  description: '',
  tips: [''],
  videoUrl: '',
  posterUrl: '',
})

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export function AdminTreinosPage() {
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [plans, setPlans] = useState<WorkoutPlan[]>([])
  const [exerciseForm, setExerciseForm] = useState<Exercise>(emptyExercise())
  const [planForm, setPlanForm] = useState<WorkoutPlan>({
    id: '',
    title: 'Treino A',
    subtitle: '',
    muscleFocus: 'Peito',
    exerciseIds: [],
    durationMin: 45,
    level: 'Intermediário',
    active: true,
  })
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  async function reload() {
    const [e, p] = await Promise.all([listExercises(), listWorkoutPlans()])
    setExercises(e)
    setPlans(p)
  }

  useEffect(() => {
    reload().catch(() => undefined)
  }, [])

  async function onSaveExercise(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      const id = exerciseForm.id || slugify(exerciseForm.name)
      await saveExercise({
        ...exerciseForm,
        id,
        tips: exerciseForm.tips.filter(Boolean),
      })
      setExerciseForm(emptyExercise())
      setMessage('Exercício salvo')
      await reload()
    } finally {
      setBusy(false)
    }
  }

  async function onSavePlan(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      const id = planForm.id || slugify(planForm.title)
      await saveWorkoutPlan({ ...planForm, id })
      setMessage('Plano salvo')
      await reload()
    } finally {
      setBusy(false)
    }
  }

  async function seedDefaults() {
    setBusy(true)
    try {
      for (const ex of defaultExercises) {
        await saveExercise(ex)
      }
      await saveWorkoutPlan({
        id: 'treino-a',
        title: 'Treino A',
        subtitle: 'Peito e Tríceps',
        muscleFocus: 'Peito',
        exerciseIds: defaultExercises.map((e) => e.id),
        durationMin: 45,
        level: 'Intermediário',
        active: true,
      })
      setMessage('Catálogo padrão importado (6 exercícios + Treino A)')
      await reload()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-bold">Treinos</h2>
        <button
          type="button"
          disabled={busy}
          onClick={seedDefaults}
          className="rounded-xl bg-brand/15 px-3 py-2 text-xs font-bold text-brand disabled:opacity-50"
        >
          Importar catálogo padrão
        </button>
      </div>
      {message && (
        <p className="rounded-xl bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">{message}</p>
      )}

      <section>
        <h3 className="font-semibold text-neutral-300">Novo exercício</h3>
        <form onSubmit={onSaveExercise} className="mt-3 grid gap-2 rounded-2xl bg-surface-2 p-4">
          <input
            required
            placeholder="Nome"
            value={exerciseForm.name}
            onChange={(e) => setExerciseForm({ ...exerciseForm, name: e.target.value })}
            className={field}
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              placeholder="Séries (4×12)"
              value={exerciseForm.sets}
              onChange={(e) => setExerciseForm({ ...exerciseForm, sets: e.target.value })}
              className={field}
            />
            <input
              placeholder="Descanso"
              value={exerciseForm.rest}
              onChange={(e) => setExerciseForm({ ...exerciseForm, rest: e.target.value })}
              className={field}
            />
          </div>
          <input
            placeholder="Músculo"
            value={exerciseForm.muscle}
            onChange={(e) => setExerciseForm({ ...exerciseForm, muscle: e.target.value })}
            className={field}
          />
          <input
            placeholder="Equipamento"
            value={exerciseForm.equipment}
            onChange={(e) => setExerciseForm({ ...exerciseForm, equipment: e.target.value })}
            className={field}
          />
          <textarea
            placeholder="Descrição"
            value={exerciseForm.description}
            onChange={(e) => setExerciseForm({ ...exerciseForm, description: e.target.value })}
            className={field}
            rows={2}
          />
          <input
            placeholder="Dicas (separadas por |)"
            value={exerciseForm.tips.join(' | ')}
            onChange={(e) =>
              setExerciseForm({
                ...exerciseForm,
                tips: e.target.value.split('|').map((t) => t.trim()),
              })
            }
            className={field}
          />
          <input
            placeholder="URL do vídeo (opcional)"
            value={exerciseForm.videoUrl}
            onChange={(e) => setExerciseForm({ ...exerciseForm, videoUrl: e.target.value })}
            className={field}
          />
          <input
            placeholder="URL do poster (opcional)"
            value={exerciseForm.posterUrl}
            onChange={(e) => setExerciseForm({ ...exerciseForm, posterUrl: e.target.value })}
            className={field}
          />
          <div className="flex flex-wrap gap-2 pt-1">
            {defaultExercises.slice(0, 4).map((ex) => (
              <button
                key={ex.id}
                type="button"
                onClick={() => setExerciseForm(ex)}
                className="rounded-full bg-surface-3 px-3 py-1 text-xs text-neutral-300"
              >
                Usar: {ex.name}
              </button>
            ))}
          </div>
          <button
            type="submit"
            disabled={busy}
            className="rounded-xl bg-brand py-3 font-bold text-white disabled:opacity-60"
          >
            Salvar exercício
          </button>
        </form>

        <div className="mt-3 flex flex-col gap-2">
          {exercises.map((ex) => (
            <div
              key={ex.id}
              className="flex items-center justify-between rounded-xl bg-surface-2 px-3 py-2"
            >
              <div>
                <p className="font-medium">{ex.name}</p>
                <p className="text-xs text-neutral-400">
                  {ex.muscle} · {ex.sets}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setExerciseForm(ex)}
                  className="text-xs font-semibold text-brand"
                >
                  Editar
                </button>
                <button
                  onClick={async () => {
                    await deleteExercise(ex.id)
                    await reload()
                  }}
                  className="text-xs font-semibold text-rose-300"
                >
                  Excluir
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h3 className="font-semibold text-neutral-300">Plano de treino</h3>
        <form onSubmit={onSavePlan} className="mt-3 grid gap-2 rounded-2xl bg-surface-2 p-4">
          <input
            required
            placeholder="Título (Treino A)"
            value={planForm.title}
            onChange={(e) => setPlanForm({ ...planForm, title: e.target.value })}
            className={field}
          />
          <input
            required
            placeholder="Subtítulo (ex: Peito e Tríceps)"
            value={planForm.subtitle}
            onChange={(e) => setPlanForm({ ...planForm, subtitle: e.target.value })}
            className={field}
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              placeholder="Foco muscular"
              value={planForm.muscleFocus}
              onChange={(e) => setPlanForm({ ...planForm, muscleFocus: e.target.value })}
              className={field}
            />
            <input
              type="number"
              placeholder="Duração (min)"
              value={planForm.durationMin}
              onChange={(e) =>
                setPlanForm({ ...planForm, durationMin: Number(e.target.value) || 45 })
              }
              className={field}
            />
          </div>
          <input
            placeholder="Nível"
            value={planForm.level}
            onChange={(e) => setPlanForm({ ...planForm, level: e.target.value })}
            className={field}
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                setPlanForm({
                  ...planForm,
                  exerciseIds: exercises.map((e) => e.id),
                })
              }
              className="rounded-full bg-surface-3 px-3 py-1 text-xs text-brand"
            >
              Selecionar todos
            </button>
            <button
              type="button"
              onClick={() => setPlanForm({ ...planForm, exerciseIds: [] })}
              className="rounded-full bg-surface-3 px-3 py-1 text-xs text-neutral-400"
            >
              Limpar
            </button>
          </div>
          <fieldset className="rounded-xl border border-border p-3">
            <legend className="px-1 text-xs text-neutral-400">Exercícios do plano</legend>
            <div className="flex max-h-40 flex-col gap-1 overflow-y-auto">
              {exercises.map((ex) => {
                const checked = planForm.exerciseIds.includes(ex.id)
                return (
                  <label key={ex.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        setPlanForm({
                          ...planForm,
                          exerciseIds: checked
                            ? planForm.exerciseIds.filter((id) => id !== ex.id)
                            : [...planForm.exerciseIds, ex.id],
                        })
                      }}
                    />
                    {ex.name}
                  </label>
                )
              })}
              {exercises.length === 0 && (
                <p className="text-xs text-neutral-500">Importe o catálogo ou cadastre exercícios.</p>
              )}
            </div>
          </fieldset>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={planForm.active}
              onChange={(e) => setPlanForm({ ...planForm, active: e.target.checked })}
            />
            Plano ativo (padrão para alunos)
          </label>
          <button
            type="submit"
            disabled={busy}
            className="rounded-xl bg-brand py-3 font-bold text-white disabled:opacity-60"
          >
            Salvar plano
          </button>
        </form>

        <div className="mt-3 flex flex-col gap-2">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className="flex items-center justify-between rounded-xl bg-surface-2 px-3 py-2"
            >
              <div>
                <p className="font-medium">
                  {plan.title} — {plan.subtitle}
                </p>
                <p className="text-xs text-neutral-400">
                  {plan.exerciseIds.length} exercícios · {plan.active ? 'ativo' : 'inativo'}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPlanForm(plan)}
                  className="text-xs font-semibold text-brand"
                >
                  Editar
                </button>
                <button
                  onClick={async () => {
                    await deleteWorkoutPlan(plan.id)
                    await reload()
                  }}
                  className="text-xs font-semibold text-rose-300"
                >
                  Excluir
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
