import type { Exercise, WorkoutPlan, WorkoutSession } from '../types'

export function normalizeWorkoutPlan(raw: WorkoutPlan): WorkoutPlan {
  if (raw.sessions?.length) {
    return {
      ...raw,
      name: raw.name || raw.title || 'Plano',
      description: raw.description || raw.subtitle || '',
      sessions: [...raw.sessions].sort((a, b) => a.order - b.order),
    }
  }

  if (raw.exerciseIds?.length || raw.title) {
    return {
      ...raw,
      name: raw.name || raw.title || 'Plano',
      description: raw.description || raw.subtitle || '',
      sessions: [
        {
          id: 'treino-a',
          label: raw.title || 'Treino A',
          subtitle: raw.subtitle || '',
          muscleFocus: raw.muscleFocus || '',
          durationMin: raw.durationMin ?? 45,
          exerciseIds: raw.exerciseIds ?? [],
          order: 0,
        },
      ],
    }
  }

  return {
    ...raw,
    name: raw.name || 'Novo plano',
    description: raw.description || '',
    sessions: raw.sessions ?? [],
  }
}

export function planDisplayName(plan: WorkoutPlan): string {
  const p = normalizeWorkoutPlan(plan)
  return p.name
}

export function planSummary(plan: WorkoutPlan): string {
  const p = normalizeWorkoutPlan(plan)
  const sessions = p.sessions.length
  const exercises = countPlanExercises(p)
  return `${sessions} dia${sessions !== 1 ? 's' : ''} · ${exercises} exercício${exercises !== 1 ? 's' : ''}`
}

export function countPlanExercises(plan: WorkoutPlan): number {
  const p = normalizeWorkoutPlan(plan)
  const ids = new Set<string>()
  for (const session of p.sessions) {
    for (const id of session.exerciseIds) ids.add(id)
  }
  return ids.size
}

export function countSessionExercises(session: WorkoutSession): number {
  return session.exerciseIds.length
}

export function getSessionExercises(session: WorkoutSession, catalog: Exercise[]): Exercise[] {
  const map = new Map(catalog.map((e) => [e.id, e]))
  return session.exerciseIds.map((id) => map.get(id)).filter(Boolean) as Exercise[]
}

export function emptySession(order: number): WorkoutSession {
  const letters = 'ABCDEFGHIJ'
  const label = `Treino ${letters[order] ?? order + 1}`
  return {
    id: '',
    label,
    subtitle: '',
    muscleFocus: '',
    durationMin: 45,
    exerciseIds: [],
    order,
  }
}

export function planSessionsLine(plan: WorkoutPlan): string {
  const p = normalizeWorkoutPlan(plan)
  return p.sessions.map((s) => s.label).join(' · ')
}

export function getNextSession(plan: WorkoutPlan, currentSessionId: string): WorkoutSession {
  const sessions = normalizeWorkoutPlan(plan).sessions
  if (sessions.length === 0) {
    throw new Error('Plano sem sessões')
  }
  const idx = sessions.findIndex((s) => s.id === currentSessionId)
  if (idx < 0) return sessions[0]
  return sessions[(idx + 1) % sessions.length]
}

/** Escolhe o dia de treino ativo: concluído hoje, ponteiro salvo ou primeiro pendente. */
export function pickActiveSession(
  plan: WorkoutPlan,
  progressMap: Record<string, number>,
  activeWorkoutSessionId: string | null,
): WorkoutSession {
  const sessions = normalizeWorkoutPlan(plan).sessions
  if (sessions.length === 0) {
    throw new Error('Plano sem sessões')
  }

  const completedToday = sessions.filter(
    (s) => s.exerciseIds.length > 0 && (progressMap[s.id] ?? 0) >= 100,
  )
  if (completedToday.length > 0) {
    return completedToday.sort((a, b) => b.order - a.order)[0]
  }

  if (activeWorkoutSessionId) {
    const found = sessions.find((s) => s.id === activeWorkoutSessionId)
    if (found) return found
  }

  return sessions.find((s) => (progressMap[s.id] ?? 0) < 100) ?? sessions[0]
}

export function sessionChipSubtitle(session: WorkoutSession): string {
  const parts = [session.subtitle].filter(Boolean)
  if (session.exerciseIds.length > 0) {
    parts.push(`${session.exerciseIds.length} exercício${session.exerciseIds.length !== 1 ? 's' : ''}`)
  }
  return parts.join(' · ')
}

export function emptyPlan(gymId: string): WorkoutPlan {
  return {
    id: '',
    gymId,
    name: '',
    description: '',
    level: 'Intermediário',
    active: true,
    sessions: [],
  }
}
