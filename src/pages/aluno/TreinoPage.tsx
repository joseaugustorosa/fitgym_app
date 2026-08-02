import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { PlayIcon } from '../../components/icons'
import { ExercisePreviewSheet } from '../../components/ExercisePreviewSheet'
import { WorkoutPlayer } from '../../components/WorkoutPlayer'
import { useAuth } from '../../contexts/AuthContext'
import {
  doCheckIn,
  getWorkoutProgress,
  listExercises,
  listWorkoutPlans,
  setActiveWorkoutSession,
  toggleExerciseProgress,
} from '../../services/api'
import { parseSets } from '../../lib/workoutSession'
import { todayKey } from '../../lib/dates'
import {
  getNextSession,
  getSessionExercises,
  normalizeWorkoutPlan,
  pickActiveSession,
  sessionChipSubtitle,
} from '../../lib/workoutPlan'
import type { Exercise, WorkoutPlan, WorkoutSession } from '../../types'

export function TreinoPage() {
  const { profile, setProfile } = useAuth()
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [plan, setPlan] = useState<WorkoutPlan | null>(null)
  const [activeSession, setActiveSession] = useState<WorkoutSession | null>(null)
  const [checkedExercises, setCheckedExercises] = useState<Set<string>>(new Set())
  const [sessionProgress, setSessionProgress] = useState<Record<string, number>>({})
  const [previewExercise, setPreviewExercise] = useState<Exercise | null>(null)
  const [playerOpen, setPlayerOpen] = useState(false)
  const [checkInDone, setCheckInDone] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const completingRef = useRef<string | null>(null)

  const normalized = useMemo(
    () => (plan ? normalizeWorkoutPlan(plan) : null),
    [plan],
  )

  useEffect(() => {
    if (!profile?.gymId) return
    let cancelled = false
    setLoading(true)

    Promise.all([listExercises(profile.gymId), listWorkoutPlans(profile.gymId)])
      .then(async ([exs, pls]) => {
        if (cancelled) return
        setExercises(exs)
        const assigned = profile.assignedWorkoutPlanId
          ? pls.find((p) => p.id === profile.assignedWorkoutPlanId) ?? null
          : null
        const nextPlan = assigned ? normalizeWorkoutPlan(assigned) : null
        setPlan(nextPlan)

        if (!nextPlan) {
          setActiveSession(null)
          setSessionProgress({})
          return
        }

        const progressEntries = await Promise.all(
          nextPlan.sessions.map(async (session) => {
            const progress = await getWorkoutProgress(profile.uid, session.id)
            const done = progress?.completedExerciseIds.length ?? 0
            const total = session.exerciseIds.length
            return [session.id, total > 0 ? Math.round((done / total) * 100) : 0] as const
          }),
        )
        if (cancelled) return

        const progressMap = Object.fromEntries(progressEntries)
        setSessionProgress(progressMap)
        setActiveSession(
          pickActiveSession(nextPlan, progressMap, profile.activeWorkoutSessionId ?? null),
        )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [profile])

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
  const allDone = sessionExercises.length > 0 && doneInSession === sessionExercises.length

  async function refreshSessionProgress(sessionId: string, done: number, total: number) {
    setSessionProgress((prev) => ({
      ...prev,
      [sessionId]: total > 0 ? Math.round((done / total) * 100) : 0,
    }))
  }

  const handleWorkoutSessionComplete = useCallback(async () => {
    if (!profile || !plan || !activeSession || !normalized) return

    const key = `${todayKey()}_${activeSession.id}`
    if (completingRef.current === key) return
    completingRef.current = key

    const total = sessionExercises.length
    setCheckedExercises(new Set(sessionExercises.map((e) => e.id)))
    await refreshSessionProgress(activeSession.id, total, total)

    try {
      const updated = await doCheckIn(profile)
      const next = getNextSession(normalized, activeSession.id)
      await setActiveWorkoutSession(profile.uid, next.id)
      setProfile({ ...updated, activeWorkoutSessionId: next.id })
      setCheckInDone(true)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      if (msg.includes('já fez check-in')) {
        const next = getNextSession(normalized, activeSession.id)
        await setActiveWorkoutSession(profile.uid, next.id)
        setProfile({ ...profile, activeWorkoutSessionId: next.id })
        setCheckInDone(true)
      }
    }
  }, [profile, plan, activeSession, normalized, sessionExercises, setProfile])

  async function markExerciseDone(id: string): Promise<string[]> {
    if (!profile || !plan || !activeSession) return Array.from(checkedExercises)
    if (checkedExercises.has(id)) return Array.from(checkedExercises)
    setSaving(true)
    try {
      const next = await toggleExerciseProgress(profile, plan.id, activeSession.id, id)
      setCheckedExercises(new Set(next))
      await refreshSessionProgress(activeSession.id, next.length, sessionExercises.length)
      if (next.length === sessionExercises.length && sessionExercises.length > 0) {
        void handleWorkoutSessionComplete()
      }
      return next
    } finally {
      setSaving(false)
    }
  }

  async function toggleExercise(id: string) {
    if (!profile || !plan || !activeSession || saving || playerOpen) return
    setSaving(true)
    try {
      const next = await toggleExerciseProgress(profile, plan.id, activeSession.id, id)
      setCheckedExercises(new Set(next))
      await refreshSessionProgress(activeSession.id, next.length, sessionExercises.length)
      if (next.length === sessionExercises.length && sessionExercises.length > 0) {
        void handleWorkoutSessionComplete()
      }
    } finally {
      setSaving(false)
    }
  }

  function selectSession(session: WorkoutSession) {
    if (playerOpen) return
    setActiveSession(session)
    setCheckInDone(false)
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
      <div className="flex flex-col gap-5 px-4 pb-8">
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
            Escolha o dia
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
                  disabled={playerOpen}
                  className={`relative shrink-0 rounded-xl px-4 py-3 text-left transition-colors ${
                    selected ? 'bg-brand text-white' : 'glass-panel text-neutral-300'
                  } ${playerOpen ? 'opacity-50' : ''}`}
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
                  <p
                    className={`mt-1 text-[11px] font-semibold ${selected ? 'text-white/75' : 'text-neutral-600'}`}
                  >
                    {session.exerciseIds.length} exerc.
                    {dayPct > 0 ? ` · ${dayPct}%` : ''}
                  </p>
                </button>
              )
            })}
          </div>
        </section>

        {activeSession && (
          <>
            {allDone && (
              <div className="rounded-2xl border border-brand/30 bg-brand/10 px-4 py-3 text-center">
                <p className="text-sm font-bold text-brand-light">
                  {activeSession.label} concluído — 100%
                </p>
                {(checkInDone || profile?.lastCheckInAt) && (
                  <p className="mt-1 text-xs text-neutral-400">Check-in de hoje registrado ✓</p>
                )}
              </div>
            )}

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
                type="button"
                onClick={() => {
                  setCheckInDone(false)
                  setPlayerOpen(true)
                }}
                disabled={sessionExercises.length === 0}
                className="pressable mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-brand py-4 font-bold text-white disabled:opacity-50"
              >
                <PlayIcon className="h-5 w-5" />
                {allDone
                  ? 'Treino concluído — refazer'
                  : progress > 0
                    ? `Continuar ${activeSession.label}`
                    : `Iniciar ${activeSession.label}`}
              </button>
              <p className="mt-2 text-center text-xs text-neutral-500">
                Modo guiado · séries, descanso e próximo exercício automáticos
              </p>
            </section>

            <section>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
                Exercícios
              </h3>
              <div className="flex flex-col gap-2">
                {sessionExercises.length === 0 && (
                  <p className="rounded-xl bg-surface-2 p-4 text-sm text-neutral-400">
                    Nenhum exercício neste dia ainda.
                  </p>
                )}
                {sessionExercises.map((exercise, index) => {
                  const done = checkedExercises.has(exercise.id)
                  const { count, repsLabel } = parseSets(exercise.sets)
                  return (
                    <div
                      key={exercise.id}
                      className={`flex items-center gap-3 rounded-xl p-3 ${
                        done ? 'border border-brand/30 bg-brand/10' : 'bg-surface-2'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => void toggleExercise(exercise.id)}
                        disabled={playerOpen || saving}
                        aria-label={done ? 'Desmarcar' : 'Marcar feito'}
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold ${
                          done ? 'border-brand bg-brand text-white' : 'border-neutral-600 text-neutral-500'
                        }`}
                      >
                        {done ? '✓' : index + 1}
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewExercise(exercise)}
                        className="min-w-0 flex-1 text-left active:opacity-80"
                      >
                        <p className={`truncate font-semibold ${done ? 'text-brand-light' : ''}`}>
                          {exercise.name}
                        </p>
                        <p className="text-sm text-neutral-400">
                          {count}×{repsLabel} · descanso {exercise.rest}
                        </p>
                      </button>
                    </div>
                  )
                })}
              </div>
            </section>
          </>
        )}
      </div>

      {activeSession && (
        <WorkoutPlayer
          open={playerOpen}
          session={activeSession}
          exercises={sessionExercises}
          completedIds={checkedExercises}
          saving={saving}
          onClose={() => setPlayerOpen(false)}
          onExerciseDone={markExerciseDone}
          onSessionComplete={handleWorkoutSessionComplete}
        />
      )}

      <ExercisePreviewSheet exercise={previewExercise} onClose={() => setPreviewExercise(null)} />
    </>
  )
}
