import { useEffect, useMemo, useRef, useState } from 'react'
import { PlayIcon } from '../../components/icons'
import { ExercisePreviewSheet } from '../../components/ExercisePreviewSheet'
import { useAuth } from '../../contexts/AuthContext'
import {
  getWorkoutProgress,
  listExercises,
  listWorkoutPlans,
  toggleExerciseProgress,
} from '../../services/api'
import type { Exercise, WorkoutPlan } from '../../types'

const muscleGroups = ['Todos', 'Peito', 'Costas', 'Pernas', 'Ombros', 'Braços', 'Abdômen']

function matchesGroup(exercise: Exercise, group: string) {
  if (group === 'Todos') return true
  const m = exercise.muscle.toLowerCase()
  if (group === 'Braços') return m.includes('tríceps') || m.includes('triceps') || m.includes('bíceps') || m.includes('biceps')
  if (group === 'Peito') return m.includes('peit') || m.includes('peito')
  return m.includes(group.toLowerCase())
}

export function TreinoPage() {
  const { profile } = useAuth()
  const listRef = useRef<HTMLDivElement>(null)
  const [activeGroup, setActiveGroup] = useState('Todos')
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [plans, setPlans] = useState<WorkoutPlan[]>([])
  const [plan, setPlan] = useState<WorkoutPlan | null>(null)
  const [checkedExercises, setCheckedExercises] = useState<Set<string>>(new Set())
  const [previewExercise, setPreviewExercise] = useState<Exercise | null>(null)
  const [saving, setSaving] = useState(false)
  const [sessionActive, setSessionActive] = useState(false)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile) return
    setLoading(true)
    Promise.all([listExercises(), listWorkoutPlans()])
      .then(([exs, pls]) => {
        setExercises(exs)
        setPlans(pls)
        const assigned =
          pls.find((p) => p.id === profile.assignedWorkoutPlanId) ??
          pls.find((p) => p.active) ??
          pls[0] ??
          null
        setPlan(assigned)
      })
      .finally(() => setLoading(false))
  }, [profile])

  useEffect(() => {
    if (!profile || !plan) return
    getWorkoutProgress(profile.uid).then((progress) => {
      setCheckedExercises(new Set(progress?.completedExerciseIds ?? []))
    })
  }, [profile, plan])

  const planExercises = useMemo(() => {
    if (!plan) return exercises
    const map = new Map(exercises.map((e) => [e.id, e]))
    const ordered = plan.exerciseIds.map((id) => map.get(id)).filter(Boolean) as Exercise[]
    return ordered.length > 0 ? ordered : exercises
  }, [plan, exercises])

  const visibleExercises = useMemo(
    () => planExercises.filter((e) => matchesGroup(e, activeGroup)),
    [planExercises, activeGroup],
  )

  const doneInPlan = planExercises.filter((e) => checkedExercises.has(e.id)).length
  const progress =
    planExercises.length === 0 ? 0 : Math.round((doneInPlan / planExercises.length) * 100)

  const nextExercise = planExercises.find((e) => !checkedExercises.has(e.id)) ?? null

  async function toggleExercise(id: string) {
    if (!profile || !plan || saving) return
    setSaving(true)
    setMessage('')
    try {
      const next = await toggleExerciseProgress(profile.uid, plan.id, id)
      setCheckedExercises(new Set(next))
      const done = planExercises.filter((e) => next.includes(e.id)).length
      if (done === planExercises.length && planExercises.length > 0) {
        setMessage('Treino concluído! Bom trabalho.')
        setSessionActive(false)
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Não foi possível salvar o progresso')
    } finally {
      setSaving(false)
    }
  }

  function startSession() {
    setSessionActive(true)
    setMessage(nextExercise ? `Comece por: ${nextExercise.name}` : 'Todos os exercícios já foram feitos')
    setActiveGroup('Todos')
    listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    if (nextExercise) setPreviewExercise(nextExercise)
  }

  async function selectPlan(program: WorkoutPlan) {
    setPlan(program)
    setSessionActive(false)
    setMessage(`Programa: ${program.subtitle || program.title}`)
    if (profile) {
      const progress = await getWorkoutProgress(profile.uid)
      setCheckedExercises(new Set(progress?.completedExerciseIds ?? []))
    }
  }

  if (loading) {
    return <p className="px-4 py-20 text-center text-neutral-400">Carregando treino…</p>
  }

  return (
    <>
      <div className="flex flex-col gap-5 px-4 pb-6">
        <header className="pt-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">
            {plan?.title ?? 'Treino'}
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">
            {plan?.subtitle ?? 'Seu treino de hoje'}
          </h1>
          <p className="mt-1 text-sm text-neutral-400">
            {plan
              ? `${plan.durationMin} min · ${planExercises.length} exercícios · ${plan.level}`
              : 'Nenhum plano disponível'}
          </p>
        </header>

        <section className="glass-panel rounded-3xl p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-medium">Progresso do treino</span>
            <span className="text-sm font-bold text-brand">
              {doneInPlan}/{planExercises.length} · {progress}%
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-surface-3">
            <div
              className="h-full rounded-full bg-brand transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <button
            onClick={startSession}
            disabled={!plan || planExercises.length === 0}
            className="pressable mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-brand py-3.5 font-bold text-white disabled:opacity-50"
          >
            <PlayIcon className="h-5 w-5" />
            {sessionActive
              ? nextExercise
                ? 'Continuar treino'
                : 'Treino completo'
              : progress > 0
                ? 'Retomar treino'
                : 'Iniciar treino'}
          </button>
          {message && <p className="mt-2 text-center text-xs text-brand">{message}</p>}
          {sessionActive && nextExercise && (
            <p className="mt-2 text-center text-xs text-neutral-400">
              Próximo: <span className="font-semibold text-white">{nextExercise.name}</span>
            </p>
          )}
        </section>

        <section>
          <div className="scroll-area -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
            {muscleGroups.map((group) => (
              <button
                key={group}
                onClick={() => setActiveGroup(group)}
                className={`shrink-0 rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                  activeGroup === group ? 'bg-brand text-white' : 'glass-panel text-neutral-400'
                }`}
              >
                {group}
              </button>
            ))}
          </div>
        </section>

        <section ref={listRef}>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
            Exercícios {activeGroup !== 'Todos' ? `· ${activeGroup}` : ''}
          </h3>
          <div className="flex flex-col gap-2">
            {visibleExercises.length === 0 && (
              <p className="rounded-xl bg-surface-2 p-4 text-sm text-neutral-400">
                Nenhum exercício neste grupo para o plano atual.
              </p>
            )}
            {visibleExercises.map((exercise) => {
              const done = checkedExercises.has(exercise.id)
              const index = planExercises.findIndex((e) => e.id === exercise.id)
              const isNext = sessionActive && nextExercise?.id === exercise.id
              return (
                <div
                  key={exercise.id}
                  className={`flex items-center gap-3 rounded-xl p-3 transition-colors ${
                    done
                      ? 'border border-brand/30 bg-brand/10'
                      : isNext
                        ? 'border border-brand bg-surface-2'
                        : 'bg-surface-2'
                  }`}
                >
                  <button
                    onClick={() => toggleExercise(exercise.id)}
                    aria-label={done ? 'Desmarcar exercício' : 'Marcar exercício como feito'}
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold transition-colors ${
                      done
                        ? 'border-brand bg-brand text-white'
                        : 'border-neutral-600 text-neutral-500'
                    }`}
                  >
                    {done ? '✓' : index + 1}
                  </button>

                  <button
                    onClick={() => setPreviewExercise(exercise)}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left active:opacity-80"
                  >
                    <div className="min-w-0 flex-1">
                      <p className={`truncate font-semibold ${done ? 'text-brand-light' : ''}`}>
                        {exercise.name}
                      </p>
                      <p className="text-sm text-neutral-400">
                        {exercise.sets} · Descanso {exercise.rest}
                      </p>
                    </div>

                    <div className="relative h-14 w-20 shrink-0 overflow-hidden rounded-lg bg-surface-3">
                      <img src={exercise.posterUrl} alt="" className="h-full w-full object-cover" />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand/90 text-white">
                          <PlayIcon className="ml-0.5 h-4 w-4" />
                        </div>
                      </div>
                    </div>
                  </button>
                </div>
              )
            })}
          </div>
        </section>

        <section>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
            Meus programas
          </h3>
          <div className="scroll-area -mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
            {plans.map((program, i) => {
              const colors = [
                'from-orange-600 to-red-600',
                'from-emerald-600 to-teal-600',
                'from-blue-600 to-indigo-600',
              ]
              return (
                <button
                  key={program.id}
                  onClick={() => void selectPlan(program)}
                  className={`w-40 shrink-0 rounded-xl bg-gradient-to-br ${colors[i % colors.length]} p-4 text-left ${
                    plan?.id === program.id ? 'ring-2 ring-white/80' : ''
                  }`}
                >
                  <p className="font-bold text-white">{program.subtitle || program.title}</p>
                  <p className="mt-1 text-xs text-white/70">{program.level}</p>
                </button>
              )
            })}
          </div>
        </section>
      </div>

      <ExercisePreviewSheet
        exercise={previewExercise}
        onClose={() => setPreviewExercise(null)}
      />
    </>
  )
}
