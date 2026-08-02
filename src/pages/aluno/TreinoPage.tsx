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
import {
  getSessionExercises,
  normalizeWorkoutPlan,
  sessionChipSubtitle,
} from '../../lib/workoutPlan'
import type { Exercise, WorkoutPlan, WorkoutSession } from '../../types'

export function TreinoPage() {
  const { profile } = useAuth()
  const listRef = useRef<HTMLDivElement>(null)
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [plan, setPlan] = useState<WorkoutPlan | null>(null)
  const [activeSession, setActiveSession] = useState<WorkoutSession | null>(null)
  const [checkedExercises, setCheckedExercises] = useState<Set<string>>(new Set())
  const [sessionProgress, setSessionProgress] = useState<Record<string, number>>({})
  const [previewExercise, setPreviewExercise] = useState<Exercise | null>(null)
  const [saving, setSaving] = useState(false)
  const [sessionActive, setSessionActive] = useState(false)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)

  const normalized = useMemo(
    () => (plan ? normalizeWorkoutPlan(plan) : null),
    [plan],
  )

  useEffect(() => {
    if (!profile?.gymId) return
    setLoading(true)
    Promise.all([listExercises(profile.gymId), listWorkoutPlans(profile.gymId)])
      .then(([exs, pls]) => {
        setExercises(exs)
        const assigned = profile.assignedWorkoutPlanId
          ? pls.find((p) => p.id === profile.assignedWorkoutPlanId) ?? null
          : null
        const nextPlan = assigned ? normalizeWorkoutPlan(assigned) : null
        setPlan(nextPlan)
        setActiveSession(nextPlan?.sessions[0] ?? null)
      })
      .finally(() => setLoading(false))
  }, [profile])

  useEffect(() => {
    if (!profile || !normalized) return
    Promise.all(
      normalized.sessions.map(async (session) => {
        const progress = await getWorkoutProgress(profile.uid, session.id)
        const done = progress?.completedExerciseIds.length ?? 0
        const total = session.exerciseIds.length
        return [session.id, total > 0 ? Math.round((done / total) * 100) : 0] as const
      }),
    ).then((entries) => setSessionProgress(Object.fromEntries(entries)))
  }, [profile, normalized])

  useEffect(() => {
    if (!profile || !activeSession) return
    getWorkoutProgress(profile.uid, activeSession.id).then((progress) => {
      setCheckedExercises(new Set(progress?.completedExerciseIds ?? []))
    })
  }, [profile, activeSession])

  const sessionExercises = useMemo(() => {
    if (!activeSession) return []
    return getSessionExercises(activeSession, exercises)
  }, [activeSession, exercises])

  const doneInSession = sessionExercises.filter((e) => checkedExercises.has(e.id)).length
  const progress =
    sessionExercises.length === 0 ? 0 : Math.round((doneInSession / sessionExercises.length) * 100)

  const nextExercise = sessionExercises.find((e) => !checkedExercises.has(e.id)) ?? null

  async function refreshSessionProgress(sessionId: string, done: number, total: number) {
    setSessionProgress((prev) => ({
      ...prev,
      [sessionId]: total > 0 ? Math.round((done / total) * 100) : 0,
    }))
  }

  async function toggleExercise(id: string) {
    if (!profile || !plan || !activeSession || saving) return
    setSaving(true)
    setMessage('')
    try {
      const next = await toggleExerciseProgress(profile, plan.id, activeSession.id, id)
      setCheckedExercises(new Set(next))
      await refreshSessionProgress(activeSession.id, next.length, sessionExercises.length)
      if (next.length === sessionExercises.length && sessionExercises.length > 0) {
        setMessage(`${activeSession.label} concluído! Bom trabalho.`)
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
    listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    if (nextExercise) setPreviewExercise(nextExercise)
  }

  function selectSession(session: WorkoutSession) {
    setActiveSession(session)
    setSessionActive(false)
    setMessage('')
  }

  if (loading) {
    return <p className="px-4 py-20 text-center text-neutral-400">Carregando treino…</p>
  }

  if (!normalized || normalized.sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 px-4 py-20 text-center">
        <p className="text-lg font-semibold text-neutral-300">Nenhum plano atribuído</p>
        <p className="max-w-xs text-sm text-neutral-500">
          Peça ao professor ou admin da academia para configurar seu treino.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="flex flex-col gap-5 px-4 pb-6">
        <header className="pt-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">
            {normalized.name}
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">
            {activeSession?.label ?? 'Seu treino'}
          </h1>
          <p className="mt-1 text-sm text-neutral-400">
            {activeSession
              ? sessionChipSubtitle(activeSession)
              : `${normalized.sessions.length} dia(s) no seu programa`}
          </p>
        </header>

        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
            {normalized.sessions.length === 1
              ? 'Seu dia de treino'
              : `${normalized.sessions.length} dias de treino`}
          </h3>
          <div className="scroll-area -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
            {normalized.sessions.map((session) => {
              const selected = activeSession?.id === session.id
              const dayPct = sessionProgress[session.id] ?? 0
              const complete = dayPct >= 100 && session.exerciseIds.length > 0
              return (
                <button
                  key={session.id}
                  type="button"
                  onClick={() => selectSession(session)}
                  className={`relative shrink-0 rounded-xl px-4 py-3 text-left transition-colors ${
                    selected ? 'bg-brand text-white' : 'glass-panel text-neutral-300'
                  }`}
                >
                  {complete && (
                    <span
                      className={`absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                        selected ? 'bg-white text-brand' : 'bg-brand text-white'
                      }`}
                    >
                      ✓
                    </span>
                  )}
                  <p className="pr-6 text-sm font-bold">{session.label}</p>
                  <p className={`mt-0.5 text-xs ${selected ? 'text-white/85' : 'text-neutral-500'}`}>
                    {session.subtitle || session.muscleFocus}
                  </p>
                  <p className={`mt-1 text-[11px] font-semibold ${selected ? 'text-white/75' : 'text-neutral-600'}`}>
                    {session.exerciseIds.length} exercício{session.exerciseIds.length !== 1 ? 's' : ''}
                    {dayPct > 0 ? ` · ${dayPct}%` : ''}
                  </p>
                </button>
              )
            })}
          </div>
        </section>

        {activeSession && (
          <>
            <section className="glass-panel rounded-3xl p-4">
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="text-sm font-medium">{activeSession.label}</span>
                <span className="text-sm font-bold text-brand">
                  {doneInSession}/{sessionExercises.length} · {progress}%
                </span>
              </div>
              <p className="mb-3 text-xs text-neutral-500">{activeSession.subtitle}</p>
              <div className="h-2 overflow-hidden rounded-full bg-surface-3">
                <div
                  className="h-full rounded-full bg-brand transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <button
                onClick={startSession}
                disabled={sessionExercises.length === 0}
                className="pressable mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-brand py-3.5 font-bold text-white disabled:opacity-50"
              >
                <PlayIcon className="h-5 w-5" />
                {sessionActive
                  ? nextExercise
                    ? `Continuar ${activeSession.label}`
                    : `${activeSession.label} completo`
                  : progress > 0
                    ? `Retomar ${activeSession.label}`
                    : `Iniciar ${activeSession.label}`}
              </button>
              {message && <p className="mt-2 text-center text-xs text-brand">{message}</p>}
              {sessionActive && nextExercise && (
                <p className="mt-2 text-center text-xs text-neutral-400">
                  Próximo: <span className="font-semibold text-white">{nextExercise.name}</span>
                </p>
              )}
            </section>

            <section ref={listRef}>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
                Exercícios · {activeSession.label}
              </h3>
              <div className="flex flex-col gap-2">
                {sessionExercises.length === 0 && (
                  <p className="rounded-xl bg-surface-2 p-4 text-sm text-neutral-400">
                    Nenhum exercício neste dia ainda. Peça ao professor para montar {activeSession.label}.
                  </p>
                )}
                {sessionExercises.map((exercise, index) => {
                  const done = checkedExercises.has(exercise.id)
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
                          {exercise.posterUrl ? (
                            <img src={exercise.posterUrl} alt="" className="h-full w-full object-cover" />
                          ) : null}
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
          </>
        )}
      </div>

      <ExercisePreviewSheet exercise={previewExercise} onClose={() => setPreviewExercise(null)} />
    </>
  )
}
