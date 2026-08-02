import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { CloseIcon, PlayIcon } from './icons'
import { formatCountdown, parseRestSeconds, parseSets } from '../lib/workoutSession'
import type { Exercise, WorkoutSession } from '../types'

type Phase = 'work' | 'rest' | 'done'

interface WorkoutPlayerProps {
  open: boolean
  session: WorkoutSession
  exercises: Exercise[]
  completedIds: Set<string>
  saving: boolean
  onClose: () => void
  onExerciseDone: (exerciseId: string) => Promise<string[]>
  onSessionComplete?: () => void | Promise<void>
}

export function WorkoutPlayer({
  open,
  session,
  exercises,
  completedIds,
  saving,
  onClose,
  onExerciseDone,
  onSessionComplete,
}: WorkoutPlayerProps) {
  const pendingAdvance = useRef(false)
  const sessionCompleteCalled = useRef(false)
  const [localDoneIds, setLocalDoneIds] = useState<string[]>([])

  const mergedDone = useMemo(() => {
    const s = new Set(completedIds)
    for (const id of localDoneIds) s.add(id)
    return s
  }, [completedIds, localDoneIds])

  const startIndex = useMemo(() => {
    const idx = exercises.findIndex((e) => !completedIds.has(e.id))
    return idx >= 0 ? idx : 0
  }, [exercises, completedIds, open])

  const [exerciseIndex, setExerciseIndex] = useState(0)
  const [currentSet, setCurrentSet] = useState(1)
  const [phase, setPhase] = useState<Phase>('work')
  const [restLeft, setRestLeft] = useState(0)
  const [restTotal, setRestTotal] = useState(60)
  const [finishedEarly, setFinishedEarly] = useState(false)

  const exercise = exercises[exerciseIndex] ?? null
  const setsInfo = exercise ? parseSets(exercise.sets) : { count: 1, repsLabel: '' }
  const totalExercises = exercises.length
  const doneCount = exercises.filter((e) => mergedDone.has(e.id)).length

  useEffect(() => {
    if (!open) return
    setExerciseIndex(startIndex)
    setCurrentSet(1)
    setPhase('work')
    setRestLeft(0)
    setRestTotal(0)
    pendingAdvance.current = false
    setLocalDoneIds([])
    setFinishedEarly(false)
    sessionCompleteCalled.current = false
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [open, startIndex, session.id])

  useEffect(() => {
    if (phase !== 'rest' || restLeft <= 0) return
    const id = window.setInterval(() => {
      setRestLeft((t) => (t <= 1 ? 0 : t - 1))
    }, 1000)
    return () => window.clearInterval(id)
  }, [phase, restLeft > 0])

  const goToNextAfterExercise = useCallback(
    (nextIds: string[]) => {
      setLocalDoneIds(nextIds)
      const done = new Set(nextIds)
      const nextIdx = exercises.findIndex((e, i) => i > exerciseIndex && !done.has(e.id))

      if (nextIdx >= 0) {
        setExerciseIndex(nextIdx)
        setCurrentSet(1)
        setPhase('work')
      } else if (exercises.every((e) => done.has(e.id))) {
        setPhase('done')
      } else {
        const fallback = exercises.findIndex((e) => !done.has(e.id))
        if (fallback >= 0) {
          setExerciseIndex(fallback)
          setCurrentSet(1)
          setPhase('work')
        } else {
          setPhase('done')
        }
      }
    },
    [exerciseIndex, exercises],
  )

  const advanceAfterRest = useCallback(() => {
    if (pendingAdvance.current) return
    pendingAdvance.current = true

    const ex = exercises[exerciseIndex]
    if (!ex) {
      pendingAdvance.current = false
      return
    }

    const { count } = parseSets(ex.sets)
    const justFinishedExercise = currentSet >= count

    if (!justFinishedExercise) {
      setCurrentSet((s) => s + 1)
      setPhase('work')
      pendingAdvance.current = false
      return
    }

    void onExerciseDone(ex.id).then((nextIds) => {
      goToNextAfterExercise(nextIds)
      pendingAdvance.current = false
    })
  }, [currentSet, exerciseIndex, exercises, goToNextAfterExercise, onExerciseDone])

  useEffect(() => {
    if (phase !== 'rest' || restLeft > 0 || restTotal <= 0) return
    setRestTotal(0)
    advanceAfterRest()
  }, [phase, restLeft, restTotal, advanceAfterRest])

  useEffect(() => {
    if (!open || phase !== 'done' || finishedEarly) return
    if (!exercises.every((e) => mergedDone.has(e.id))) return
    if (sessionCompleteCalled.current) return
    sessionCompleteCalled.current = true
    void onSessionComplete?.()
  }, [open, phase, finishedEarly, exercises, mergedDone, onSessionComplete])

  function startRest(seconds: number) {
    setRestTotal(seconds)
    setRestLeft(seconds)
    setPhase('rest')
  }

  function completeSet() {
    if (!exercise || saving || phase !== 'work') return
    startRest(parseRestSeconds(exercise.rest))
  }

  function skipRest() {
    setRestLeft(0)
    advanceAfterRest()
  }

  function skipExercise() {
    if (!exercise || saving || pendingAdvance.current) return
    pendingAdvance.current = true
    setRestLeft(0)
    setRestTotal(0)

    if (mergedDone.has(exercise.id)) {
      goToNextAfterExercise(Array.from(mergedDone))
      pendingAdvance.current = false
      return
    }

    void onExerciseDone(exercise.id).then((nextIds) => {
      goToNextAfterExercise(nextIds)
      pendingAdvance.current = false
    })
  }

  function finishWorkout() {
    if (
      !window.confirm(
        'Finalizar o treino agora? O progresso dos exercícios já concluídos será mantido.',
      )
    ) {
      return
    }
    setRestLeft(0)
    setRestTotal(0)
    pendingAdvance.current = false
    setFinishedEarly(true)
    setPhase('done')
  }

  if (!open) return null

  const restPct = restTotal > 0 ? Math.round(((restTotal - restLeft) / restTotal) * 100) : 0

  return createPortal(
    <div
      className="workout-player fixed inset-0 z-[200] mx-auto flex max-w-[430px] flex-col"
      role="dialog"
      aria-modal="true"
      aria-label={`Treino ${session.label}`}
    >
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--color-panel-border)] px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={onClose}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-3 text-neutral-400"
          aria-label="Sair do treino"
        >
          <CloseIcon className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1 text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-brand">{session.label}</p>
          <p className="truncate text-sm font-semibold text-neutral-300">
            {session.subtitle || session.muscleFocus}
          </p>
        </div>
        <div className="w-10 text-right text-xs font-bold text-neutral-500">
          {doneCount}/{totalExercises}
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
        {phase === 'done' ? (
          <div className="flex min-h-[55vh] flex-col items-center justify-center text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-brand/20 text-4xl">
              ✓
            </div>
            <h2 className="font-display mt-6 text-2xl font-extrabold">
              {finishedEarly ? 'Treino encerrado' : `${session.label} — 100%`}
            </h2>
            <p className="mt-2 max-w-xs text-sm text-neutral-400">
              {finishedEarly
                ? `Você finalizou ${doneCount} de ${totalExercises} exercícios hoje. Bom trabalho!`
                : 'Parabéns! Todos os exercícios concluídos e check-in registrado.'}
            </p>
            <button
              type="button"
              onClick={onClose}
              className="pressable mt-8 w-full max-w-xs rounded-2xl bg-brand py-4 font-bold text-white"
            >
              Voltar ao treino
            </button>
          </div>
        ) : phase === 'rest' ? (
          <div className="flex min-h-[55vh] flex-col items-center justify-center text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">
              Descanso
            </p>
            <div className="relative mt-6 flex h-44 w-44 items-center justify-center">
              <svg className="absolute inset-0 -rotate-90" viewBox="0 0 176 176">
                <circle cx="88" cy="88" r="76" fill="none" stroke="#262626" strokeWidth="10" />
                <circle
                  cx="88"
                  cy="88"
                  r="76"
                  fill="none"
                  stroke="#ff5a00"
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={`${restPct * 4.77} 477`}
                  className="transition-[stroke-dasharray] duration-1000 linear"
                />
              </svg>
              <span className="font-display text-5xl font-extrabold tabular-nums">
                {formatCountdown(restLeft)}
              </span>
            </div>
            {exercise && (
              <p className="mt-8 text-sm text-neutral-400">
                {currentSet < setsInfo.count ? (
                  <>
                    Próxima:{' '}
                    <span className="font-semibold text-white">
                      série {currentSet + 1} · {exercise.name}
                    </span>
                  </>
                ) : (
                  <>
                    Próximo exercício em breve…
                  </>
                )}
              </p>
            )}
            <button
              type="button"
              onClick={skipRest}
              className="pressable mt-8 rounded-2xl border border-white/10 bg-surface-3 px-8 py-3 text-sm font-bold text-neutral-300"
            >
              Pular descanso →
            </button>
            <div className="mt-4 flex w-full max-w-xs gap-2">
              <button
                type="button"
                onClick={skipExercise}
                disabled={saving}
                className="pressable flex-1 rounded-xl border border-white/10 py-2.5 text-xs font-semibold text-neutral-400 disabled:opacity-50"
              >
                Pular exercício
              </button>
              <button
                type="button"
                onClick={finishWorkout}
                className="pressable flex-1 rounded-xl border border-white/10 py-2.5 text-xs font-semibold text-neutral-400"
              >
                Finalizar treino
              </button>
            </div>
          </div>
        ) : exercise ? (
          <>
            <div className="mb-4 aspect-video overflow-hidden rounded-2xl bg-black">
              {exercise.videoUrl ? (
                <video
                  key={exercise.id}
                  className="h-full w-full object-cover"
                  poster={exercise.posterUrl}
                  controls
                  playsInline
                  preload="metadata"
                >
                  <source src={exercise.videoUrl} type="video/mp4" />
                </video>
              ) : exercise.posterUrl ? (
                <img src={exercise.posterUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full min-h-[160px] items-center justify-center bg-surface-3 text-neutral-600">
                  <PlayIcon className="h-12 w-12" />
                </div>
              )}
            </div>

            <p className="text-xs font-semibold uppercase tracking-wider text-brand">{exercise.muscle}</p>
            <h2 className="font-display mt-1 text-2xl font-extrabold leading-tight">{exercise.name}</h2>
            <p className="mt-1 text-sm text-neutral-400">
              {exercise.equipment} · descanso {exercise.rest}
            </p>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-surface-2 p-4 text-center">
                <p className="text-[10px] uppercase tracking-wider text-neutral-500">Série</p>
                <p className="font-display mt-1 text-3xl font-extrabold text-brand">
                  {currentSet}
                  <span className="text-lg text-neutral-500">/{setsInfo.count}</span>
                </p>
              </div>
              <div className="rounded-2xl bg-surface-2 p-4 text-center">
                <p className="text-[10px] uppercase tracking-wider text-neutral-500">Repetições</p>
                <p className="font-display mt-1 text-3xl font-extrabold">{setsInfo.repsLabel}</p>
              </div>
            </div>

            <div className="mt-4 flex gap-1">
              {Array.from({ length: setsInfo.count }, (_, i) => (
                <div
                  key={i}
                  className={`h-1.5 flex-1 rounded-full transition-colors ${
                    i < currentSet - 1
                      ? 'bg-brand'
                      : i === currentSet - 1
                        ? 'bg-brand/50'
                        : 'bg-surface-3'
                  }`}
                />
              ))}
            </div>

            {exercise.tips[0] && (
              <p className="mt-4 rounded-xl bg-surface-2 px-3 py-2 text-sm text-neutral-400">
                💡 {exercise.tips[0]}
              </p>
            )}

            <p className="mt-6 text-center text-xs text-neutral-500">
              Exercício {exerciseIndex + 1} de {totalExercises}
            </p>
          </>
        ) : null}
      </div>

      {phase === 'work' && exercise && (
        <footer className="workout-player-footer shrink-0 border-t px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
          <button
            type="button"
            disabled={saving}
            onClick={completeSet}
            className="pressable w-full rounded-2xl bg-brand py-4 text-lg font-bold text-white disabled:opacity-60"
          >
            {saving
              ? 'Salvando…'
              : currentSet < setsInfo.count
                ? `Série ${currentSet} concluída`
                : 'Exercício concluído'}
          </button>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={skipExercise}
              className="pressable rounded-xl border border-white/10 bg-surface-3 py-3 text-sm font-semibold text-neutral-300 disabled:opacity-50"
            >
              Pular exercício
            </button>
            <button
              type="button"
              onClick={finishWorkout}
              className="pressable rounded-xl border border-rose-500/25 bg-rose-500/10 py-3 text-sm font-semibold text-rose-200"
            >
              Finalizar treino
            </button>
          </div>
          <p className="mt-2 text-center text-[11px] text-neutral-500">
            Toque ao terminar a série · descanso {exercise.rest} automático
          </p>
        </footer>
      )}
    </div>,
    document.body,
  )
}
