import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { getWorkoutPlan, listExercises, saveWorkoutPlan } from '../../services/api'
import { FormField, adminField } from '../../components/FormField'
import { getSessionExercises, normalizeWorkoutPlan } from '../../lib/workoutPlan'
import type { Exercise, WorkoutPlan, WorkoutSession } from '../../types'

const field = adminField

export function AdminTreinoSessionPage() {
  const { planId = '', sessionId = '' } = useParams()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const gymId = profile?.gymId ?? ''

  const [plan, setPlan] = useState<WorkoutPlan | null>(null)
  const [catalog, setCatalog] = useState<Exercise[]>([])
  const [search, setSearch] = useState('')
  const [muscleFilter, setMuscleFilter] = useState('Todos')
  const [sessionForm, setSessionForm] = useState<WorkoutSession | null>(null)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)

  const normalized = plan ? normalizeWorkoutPlan(plan) : null
  const session = normalized?.sessions.find((s) => s.id === sessionId) ?? null

  async function reload() {
    const [p, ex] = await Promise.all([getWorkoutPlan(planId), listExercises(gymId)])
    setPlan(p)
    setCatalog(ex.sort((a, b) => a.name.localeCompare(b.name)))
  }

  useEffect(() => {
    if (gymId) reload().finally(() => setLoading(false))
  }, [gymId, planId])

  useEffect(() => {
    if (session) setSessionForm({ ...session })
  }, [session?.id, session?.label, session?.subtitle, session?.muscleFocus, session?.durationMin])

  const sessionExercises = useMemo(
    () => (session ? getSessionExercises(session, catalog) : []),
    [session, catalog],
  )

  const muscles = useMemo(() => {
    const set = new Set(catalog.map((e) => e.muscle.split('/')[0].trim()))
    return ['Todos', ...Array.from(set).sort()]
  }, [catalog])

  const available = useMemo(() => {
    const inSession = new Set(session?.exerciseIds ?? [])
    return catalog.filter((ex) => {
      if (inSession.has(ex.id)) return false
      if (muscleFilter !== 'Todos' && !ex.muscle.toLowerCase().includes(muscleFilter.toLowerCase())) {
        return false
      }
      if (search.trim()) {
        const q = search.toLowerCase()
        return ex.name.toLowerCase().includes(q) || ex.muscle.toLowerCase().includes(q)
      }
      return true
    })
  }, [catalog, session, search, muscleFilter])

  async function saveSessionExerciseIds(ids: string[]) {
    if (!normalized || !session) return
    setBusy(true)
    setMessage('')
    try {
      const sessions = normalized.sessions.map((s) =>
        s.id === sessionId ? { ...s, exerciseIds: ids } : s,
      )
      await saveWorkoutPlan({ ...normalized, gymId, sessions })
      await reload()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally {
      setBusy(false)
    }
  }

  async function onSaveSessionInfo(e: FormEvent) {
    e.preventDefault()
    if (!normalized || !sessionForm) return
    setBusy(true)
    setMessage('')
    try {
      const sessions = normalized.sessions.map((s) =>
        s.id === sessionId ? { ...sessionForm, id: sessionId } : s,
      )
      await saveWorkoutPlan({ ...normalized, gymId, sessions })
      setMessage('Informações do dia salvas')
      await reload()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally {
      setBusy(false)
    }
  }

  function addExercise(id: string) {
    if (!session) return
    void saveSessionExerciseIds([...session.exerciseIds, id])
  }

  function removeExercise(id: string) {
    if (!session) return
    void saveSessionExerciseIds(session.exerciseIds.filter((x) => x !== id))
  }

  function moveExercise(id: string, dir: -1 | 1) {
    if (!session) return
    const ids = [...session.exerciseIds]
    const idx = ids.indexOf(id)
    if (idx < 0) return
    const next = idx + dir
    if (next < 0 || next >= ids.length) return
    ;[ids[idx], ids[next]] = [ids[next], ids[idx]]
    void saveSessionExerciseIds(ids)
  }

  if (loading) return <p className="text-neutral-400">Carregando…</p>
  if (!normalized || !session) {
    return (
      <div>
        <p className="text-neutral-400">Dia de treino não encontrado.</p>
        <Link to={`/admin/treinos/${planId}`} className="mt-2 inline-block text-sm text-brand">
          ← Voltar ao programa
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link to={`/admin/treinos/${planId}`} className="text-sm font-semibold text-brand">
          ← {normalized.name}
        </Link>
        <h2 className="mt-2 text-xl font-bold lg:text-2xl">Editar {session.label}</h2>
        <p className="mt-1 text-sm text-neutral-400">
          {sessionExercises.length} exercício(s) neste dia
        </p>
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

      {sessionForm && (
        <form onSubmit={onSaveSessionInfo} className="grid gap-3 rounded-2xl bg-surface-2 p-4 sm:grid-cols-2">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-500 sm:col-span-2">
            Informações do dia
          </h3>
          <FormField label="Nome do dia" hint="Ex: Treino A, Treino B">
            <input
              required
              value={sessionForm.label}
              onChange={(e) => setSessionForm({ ...sessionForm, label: e.target.value })}
              className={field}
            />
          </FormField>
          <FormField label="Foco" hint="Ex: Peito e Tríceps">
            <input
              required
              value={sessionForm.subtitle}
              onChange={(e) => setSessionForm({ ...sessionForm, subtitle: e.target.value })}
              className={field}
            />
          </FormField>
          <FormField label="Grupo muscular principal">
            <input
              value={sessionForm.muscleFocus}
              onChange={(e) => setSessionForm({ ...sessionForm, muscleFocus: e.target.value })}
              className={field}
            />
          </FormField>
          <FormField label="Duração (min)">
            <input
              type="number"
              value={sessionForm.durationMin}
              onChange={(e) =>
                setSessionForm({ ...sessionForm, durationMin: Number(e.target.value) || 45 })
              }
              className={field}
            />
          </FormField>
          <button
            type="submit"
            disabled={busy}
            className="rounded-xl bg-brand py-3 font-bold text-white disabled:opacity-60 sm:col-span-2"
          >
            {busy ? 'Salvando…' : 'Salvar informações do dia'}
          </button>
        </form>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        <section>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-500">
            Exercícios do dia
          </h3>
          <div className="flex flex-col gap-2">
            {sessionExercises.map((ex, idx) => (
              <div
                key={ex.id}
                className="flex items-center gap-2 rounded-xl bg-surface-2 px-3 py-2.5"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand/15 text-xs font-bold text-brand">
                  {idx + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{ex.name}</p>
                  <p className="text-xs text-neutral-500">
                    {ex.muscle} · {ex.sets}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    disabled={busy || idx === 0}
                    onClick={() => moveExercise(ex.id, -1)}
                    className="rounded-lg bg-surface-3 px-2 py-1 text-xs disabled:opacity-40"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    disabled={busy || idx === sessionExercises.length - 1}
                    onClick={() => moveExercise(ex.id, 1)}
                    className="rounded-lg bg-surface-3 px-2 py-1 text-xs disabled:opacity-40"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => removeExercise(ex.id)}
                    className="rounded-lg px-2 py-1 text-xs font-semibold text-rose-300"
                  >
                    Remover
                  </button>
                </div>
              </div>
            ))}
            {sessionExercises.length === 0 && (
              <p className="rounded-xl border border-dashed border-white/10 p-4 text-sm text-neutral-400">
                Nenhum exercício ainda. Adicione da lista ao lado →
              </p>
            )}
          </div>
        </section>

        <section>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-500">
            Catálogo da academia
          </h3>
          <div className="mb-3 flex flex-col gap-2 sm:flex-row">
            <FormField label="Buscar" className="flex-1">
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Nome ou músculo…"
                className={field}
              />
            </FormField>
            <FormField label="Grupo">
              <select
                value={muscleFilter}
                onChange={(e) => setMuscleFilter(e.target.value)}
                className={field}
              >
                {muscles.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            </FormField>
          </div>
          <div className="scroll-area max-h-[420px] overflow-y-auto rounded-2xl bg-surface-2 p-2">
            {available.length === 0 && (
              <p className="p-3 text-sm text-neutral-400">
                {catalog.length === 0 ? (
                  <>
                    Catálogo vazio.{' '}
                    <Link to="/admin/treinos/catalogo" className="font-semibold text-brand">
                      Importe exercícios
                    </Link>
                  </>
                ) : (
                  'Todos os exercícios filtrados já estão neste dia.'
                )}
              </p>
            )}
            {available.map((ex) => (
              <button
                key={ex.id}
                type="button"
                disabled={busy}
                onClick={() => addExercise(ex.id)}
                className="flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-surface-3 disabled:opacity-50"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{ex.name}</p>
                  <p className="text-xs text-neutral-500">
                    {ex.muscle} · {ex.sets}
                  </p>
                </div>
                <span className="shrink-0 rounded-lg bg-brand/15 px-2 py-1 text-xs font-bold text-brand">
                  + Add
                </span>
              </button>
            ))}
          </div>
          <Link
            to="/admin/treinos/catalogo"
            className="mt-3 inline-block text-sm font-semibold text-brand"
          >
            Gerenciar catálogo completo →
          </Link>
        </section>
      </div>

      <button
        type="button"
        onClick={() => navigate(`/admin/treinos/${planId}`)}
        className="w-fit rounded-xl bg-surface-2 px-4 py-2.5 text-sm font-semibold text-neutral-300"
      >
        Concluir e voltar aos dias
      </button>
    </div>
  )
}
