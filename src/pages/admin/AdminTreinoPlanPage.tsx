import { useEffect, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { getWorkoutPlan, saveWorkoutPlan } from '../../services/api'
import { FormField, adminField } from '../../components/FormField'
import {
  countSessionExercises,
  emptySession,
  normalizeWorkoutPlan,
} from '../../lib/workoutPlan'
import type { WorkoutPlan, WorkoutSession } from '../../types'

const field = adminField

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export function AdminTreinoPlanPage() {
  const { planId = '' } = useParams()
  const { profile } = useAuth()
  const gymId = profile?.gymId ?? ''

  const [plan, setPlan] = useState<WorkoutPlan | null>(null)
  const [planForm, setPlanForm] = useState({ name: '', description: '', level: 'Intermediário' })
  const [sessionForm, setSessionForm] = useState<WorkoutSession | null>(null)
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)

  async function reload() {
    const p = await getWorkoutPlan(planId)
    setPlan(p)
    if (p) {
      const n = normalizeWorkoutPlan(p)
      setPlanForm({
        name: n.name,
        description: n.description,
        level: n.level,
      })
    }
  }

  useEffect(() => {
    reload().finally(() => setLoading(false))
  }, [planId])

  async function persist(next: WorkoutPlan) {
    if (!gymId) return
    setBusy(true)
    setMessage('')
    try {
      await saveWorkoutPlan({ ...next, gymId })
      setPlan(normalizeWorkoutPlan(next))
      await reload()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally {
      setBusy(false)
    }
  }

  async function onSavePlanInfo(e: FormEvent) {
    e.preventDefault()
    if (!plan) return
    const normalized = normalizeWorkoutPlan(plan)
    await persist({
      ...normalized,
      name: planForm.name.trim(),
      description: planForm.description.trim(),
      level: planForm.level,
    })
    setMessage('Informações do programa salvas')
  }

  function startAddSession() {
    if (!plan) return
    setEditingSessionId(null)
    setSessionForm(emptySession(normalizeWorkoutPlan(plan).sessions.length))
  }

  function startEditSession(session: WorkoutSession) {
    setEditingSessionId(session.id)
    setSessionForm({ ...session })
  }

  function cancelSessionForm() {
    setSessionForm(null)
    setEditingSessionId(null)
  }

  async function onSaveSession(e: FormEvent) {
    e.preventDefault()
    if (!plan || !sessionForm) return
    const wasEdit = !!editingSessionId
    const id = editingSessionId || sessionForm.id || slugify(sessionForm.label) || `treino-${Date.now()}`
    const nextSession = { ...sessionForm, id }
    const base = normalizeWorkoutPlan(plan)
    let sessions: WorkoutSession[]
    if (wasEdit) {
      sessions = base.sessions.map((s) => (s.id === editingSessionId ? nextSession : s))
    } else {
      sessions = [...base.sessions, nextSession]
    }
    sessions = sessions.map((s, i) => ({ ...s, order: i }))
    await persist({ ...base, sessions })
    cancelSessionForm()
    setMessage(wasEdit ? 'Dia de treino atualizado' : 'Dia de treino adicionado')
  }

  async function onDeleteSession(session: WorkoutSession) {
    if (!plan) return
    if (!window.confirm(`Excluir ${session.label}?`)) return
    const base = normalizeWorkoutPlan(plan)
    const sessions = base.sessions
      .filter((s) => s.id !== session.id)
      .map((s, i) => ({ ...s, order: i }))
    await persist({ ...base, sessions })
    if (editingSessionId === session.id) cancelSessionForm()
    setMessage('Dia removido')
  }

  if (loading) return <p className="text-neutral-400">Carregando…</p>
  if (!plan) {
    return (
      <div>
        <p className="text-neutral-400">Programa não encontrado.</p>
        <Link to="/admin/treinos" className="mt-2 inline-block text-sm font-semibold text-brand">
          ← Voltar
        </Link>
      </div>
    )
  }

  const normalized = normalizeWorkoutPlan(plan)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link to="/admin/treinos" className="text-sm font-semibold text-brand">
          ← Programas
        </Link>
        <h2 className="mt-2 text-xl font-bold lg:text-2xl">Editar programa</h2>
        <p className="mt-1 text-sm text-neutral-400">
          {normalized.sessions.length} dia(s) de treino · {normalized.active ? 'ativo' : 'inativo'}
        </p>
      </div>

      {message && (
        <p className="rounded-xl bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">{message}</p>
      )}

      <form onSubmit={onSavePlanInfo} className="grid gap-3 rounded-2xl bg-surface-2 p-4 lg:grid-cols-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-500 lg:col-span-3">
          Informações do programa
        </h3>
        <FormField label="Nome" hint="Ex: Programa ABC, Hipertrofia 4x">
          <input
            required
            value={planForm.name}
            onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
            className={field}
          />
        </FormField>
        <FormField label="Descrição" hint="Divisão ou objetivo do plano">
          <input
            value={planForm.description}
            onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
            className={field}
          />
        </FormField>
        <FormField label="Nível">
          <select
            value={planForm.level}
            onChange={(e) => setPlanForm({ ...planForm, level: e.target.value })}
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
          {busy ? 'Salvando…' : 'Salvar informações'}
        </button>
      </form>

      {!sessionForm ? (
        <button
          type="button"
          onClick={startAddSession}
          className="w-fit rounded-xl bg-brand px-4 py-2.5 text-sm font-bold text-white"
        >
          + Adicionar dia de treino
        </button>
      ) : (
        <form onSubmit={onSaveSession} className="grid gap-3 rounded-2xl bg-surface-2 p-4 sm:grid-cols-2">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-500 sm:col-span-2">
            {editingSessionId ? 'Editar dia de treino' : 'Novo dia de treino'}
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
          <div className="flex gap-2 sm:col-span-2">
            <button
              type="submit"
              disabled={busy}
              className="flex-1 rounded-xl bg-brand py-3 font-bold text-white disabled:opacity-60"
            >
              Salvar dia
            </button>
            <button
              type="button"
              onClick={cancelSessionForm}
              className="rounded-xl bg-surface-3 px-4 py-3 text-sm font-semibold text-neutral-400"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {normalized.sessions.map((session) => (
          <div key={session.id} className="rounded-2xl bg-surface-2 p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-brand">{session.label}</p>
                <p className="text-sm text-neutral-300">{session.subtitle}</p>
                <p className="mt-2 text-xs text-neutral-500">
                  {countSessionExercises(session)} exercício(s) · {session.durationMin} min
                </p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => startEditSession(session)}
                className="rounded-lg bg-surface-3 px-3 py-2 text-xs font-semibold text-neutral-300"
              >
                Editar info
              </button>
              <Link
                to={`/admin/treinos/${planId}/sessao/${session.id}`}
                className="flex-1 rounded-lg bg-brand/15 py-2 text-center text-xs font-bold text-brand"
              >
                Editar exercícios
              </Link>
              <button
                type="button"
                disabled={busy}
                onClick={() => void onDeleteSession(session)}
                className="rounded-lg px-3 py-2 text-xs font-semibold text-rose-300"
              >
                Excluir
              </button>
            </div>
          </div>
        ))}
        {normalized.sessions.length === 0 && (
          <p className="col-span-full rounded-2xl border border-dashed border-white/10 p-6 text-sm text-neutral-400">
            Adicione os dias de treino (Treino A, B, C…). Depois clique em cada dia para montar os
            exercícios.
          </p>
        )}
      </div>

      <label className="flex w-fit items-center gap-2 text-sm text-neutral-300">
        <input
          type="checkbox"
          checked={normalized.active}
          onChange={(e) => void persist({ ...normalized, active: e.target.checked })}
        />
        Programa ativo (visível para atribuição)
      </label>
    </div>
  )
}
