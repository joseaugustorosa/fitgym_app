import { useEffect } from 'react'
import type { UserProfile, WorkoutPlan } from '../types'
import { normalizeWorkoutPlan, planDisplayName, planSummary } from '../lib/workoutPlan'
import { CloseIcon } from './icons'

interface AssignWorkoutSheetProps {
  student: UserProfile | null
  plans: WorkoutPlan[]
  saving: boolean
  onClose: () => void
  onAssign: (planId: string) => void
  onClear: () => void
}

const gradients = [
  'from-orange-600 to-red-600',
  'from-emerald-600 to-teal-600',
  'from-blue-600 to-indigo-600',
  'from-violet-600 to-purple-600',
]

export function AssignWorkoutSheet({
  student,
  plans,
  saving,
  onClose,
  onAssign,
  onClear,
}: AssignWorkoutSheetProps) {
  const open = student !== null

  useEffect(() => {
    if (!open) return
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  const activePlans = plans.filter((p) => p.active)

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
          open ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
        aria-hidden={!open}
      />

      <div
        className={`fixed z-50 overflow-hidden bg-surface-2 shadow-2xl transition-all duration-300 ease-out
          inset-x-0 bottom-0 max-h-[85vh] rounded-t-3xl
          lg:inset-auto lg:left-1/2 lg:top-1/2 lg:max-h-[min(85vh,720px)] lg:w-full lg:max-w-3xl lg:-translate-x-1/2 lg:-translate-y-1/2 lg:rounded-3xl
          ${open ? 'translate-y-0 lg:scale-100 lg:opacity-100' : 'pointer-events-none translate-y-full lg:scale-95 lg:opacity-0'}
        `}
        role="dialog"
        aria-modal={open}
        aria-labelledby="assign-workout-title"
      >
        <div className="flex items-center justify-between border-b border-white/6 px-5 py-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-brand">
              Atribuir treino
            </p>
            <h2 id="assign-workout-title" className="font-display text-lg font-bold">
              {student?.name}
            </h2>
            <p className="text-xs text-neutral-400">{student?.email}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="pressable flex h-10 w-10 items-center justify-center rounded-xl bg-surface-3 text-neutral-400"
            aria-label="Fechar"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="scroll-area overflow-y-auto px-5 py-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          {activePlans.length === 0 ? (
            <p className="rounded-xl bg-surface-3 px-4 py-6 text-center text-sm text-neutral-400">
              Nenhum plano de treino cadastrado. Peça ao admin da academia para criar programas em
              Treinos.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {activePlans.map((plan, i) => {
                const p = normalizeWorkoutPlan(plan)
                const selected = student?.assignedWorkoutPlanId === plan.id
                const sessionCount = p.sessions.length
                const exerciseCount = p.sessions.reduce((n, s) => n + s.exerciseIds.length, 0)
                return (
                  <button
                    key={plan.id}
                    type="button"
                    disabled={saving}
                    onClick={() => onAssign(plan.id)}
                    className={`pressable relative overflow-hidden rounded-2xl bg-gradient-to-br ${gradients[i % gradients.length]} p-4 text-left transition-transform disabled:opacity-60 ${
                      selected ? 'ring-2 ring-white ring-offset-2 ring-offset-surface-2' : ''
                    }`}
                  >
                    {selected && (
                      <span className="absolute right-3 top-3 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                        Atual
                      </span>
                    )}
                    <p className="font-display text-lg font-bold text-white">{planDisplayName(p)}</p>
                    <p className="mt-0.5 text-sm text-white/80">{p.description || planSummary(p)}</p>
                    <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold text-white/90">
                      <span className="rounded-lg bg-black/20 px-2 py-1">
                        {sessionCount} dia{sessionCount !== 1 ? 's' : ''}
                      </span>
                      <span className="rounded-lg bg-black/20 px-2 py-1">
                        {exerciseCount} exercício{exerciseCount !== 1 ? 's' : ''}
                      </span>
                      <span className="rounded-lg bg-black/20 px-2 py-1">{p.level}</span>
                    </div>
                    <p className="mt-3 text-xs font-bold text-white/90">
                      {selected ? 'Toque para manter' : 'Toque para atribuir'}
                    </p>
                  </button>
                )
              })}
            </div>
          )}

          {student?.assignedWorkoutPlanId && (
            <button
              type="button"
              disabled={saving}
              onClick={onClear}
              className="mt-4 w-full rounded-xl border border-rose-500/30 bg-rose-500/10 py-3 text-sm font-semibold text-rose-300 disabled:opacity-60"
            >
              Remover plano atribuído
            </button>
          )}
        </div>
      </div>
    </>
  )
}
