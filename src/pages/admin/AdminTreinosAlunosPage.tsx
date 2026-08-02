import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { AssignWorkoutSheet } from '../../components/AssignWorkoutSheet'
import { FormField, adminField } from '../../components/FormField'
import { listStudents, listWorkoutPlans, updateUserProfile } from '../../services/api'
import { normalizeWorkoutPlan, planDisplayName, planSummary } from '../../lib/workoutPlan'
import type { UserProfile, WorkoutPlan } from '../../types'

type Filter = 'all' | 'none' | 'assigned'

export function AdminTreinosAlunosPage() {
  const { profile } = useAuth()
  const gymId = profile?.gymId ?? ''

  const [students, setStudents] = useState<UserProfile[]>([])
  const [plans, setPlans] = useState<WorkoutPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>('all')
  const [search, setSearch] = useState('')
  const [selectedStudent, setSelectedStudent] = useState<UserProfile | null>(null)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')
  const [bulkPlanId, setBulkPlanId] = useState('')
  const [bulkSaving, setBulkSaving] = useState(false)

  async function reload() {
    if (!gymId) return
    const [s, p] = await Promise.all([listStudents(gymId), listWorkoutPlans(gymId)])
    setStudents(s)
    setPlans(p.filter((x) => x.active))
  }

  useEffect(() => {
    reload().finally(() => setLoading(false))
  }, [gymId])

  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(''), 2800)
    return () => window.clearTimeout(t)
  }, [toast])

  const planMap = useMemo(() => new Map(plans.map((p) => [p.id, p])), [plans])

  const withoutPlan = students.filter((s) => !s.assignedWorkoutPlanId)
  const withPlan = students.filter((s) => s.assignedWorkoutPlanId)

  const filtered = useMemo(() => {
    let list = students
    if (filter === 'none') list = withoutPlan
    if (filter === 'assigned') list = withPlan
    const q = search.trim().toLowerCase()
    if (!q) return list
    return list.filter(
      (s) => s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q),
    )
  }, [students, filter, search, withoutPlan, withPlan])

  async function assignPlan(student: UserProfile, planId: string | null) {
    setSaving(true)
    try {
      await updateUserProfile(student.uid, { assignedWorkoutPlanId: planId })
      setStudents((prev) =>
        prev.map((s) => (s.uid === student.uid ? { ...s, assignedWorkoutPlanId: planId } : s)),
      )
      const planName = planId ? planMap.get(planId)?.title : null
      setToast(
        planName
          ? `Treino "${planName}" atribuído a ${student.name.split(' ')[0]}`
          : `Plano removido de ${student.name.split(' ')[0]}`,
      )
      setSelectedStudent(null)
    } finally {
      setSaving(false)
    }
  }

  async function bulkAssign() {
    if (!bulkPlanId || withoutPlan.length === 0 || bulkSaving) return
    setBulkSaving(true)
    try {
      await Promise.all(
        withoutPlan.map((s) =>
          updateUserProfile(s.uid, { assignedWorkoutPlanId: bulkPlanId }),
        ),
      )
      const planName = planMap.get(bulkPlanId)?.title ?? 'Treino'
      setStudents((prev) =>
        prev.map((s) =>
          !s.assignedWorkoutPlanId ? { ...s, assignedWorkoutPlanId: bulkPlanId } : s,
        ),
      )
      setToast(`${planName} atribuído a ${withoutPlan.length} aluno(s)`)
      setBulkPlanId('')
    } finally {
      setBulkSaving(false)
    }
  }

  if (!gymId) {
    return <p className="text-neutral-400">Perfil sem academia vinculada.</p>
  }

  if (loading) {
    return <p className="text-neutral-400">Carregando alunos e planos…</p>
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-bold">Treinos dos alunos</h2>
        <p className="mt-1 text-sm text-neutral-400">
          Escolha o programa de cada aluno. Toque em um nome para ver os planos disponíveis.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Total', value: students.length },
          { label: 'Sem plano', value: withoutPlan.length, highlight: withoutPlan.length > 0 },
          { label: 'Com plano', value: withPlan.length },
        ].map((stat) => (
          <div
            key={stat.label}
            className={`rounded-2xl p-3 ${stat.highlight ? 'bg-amber-500/10 ring-1 ring-amber-500/20' : 'bg-surface-2'}`}
          >
            <p className="text-[10px] uppercase tracking-wider text-neutral-500">{stat.label}</p>
            <p className={`mt-1 text-2xl font-bold ${stat.highlight ? 'text-amber-200' : 'text-brand'}`}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {withoutPlan.length > 0 && plans.length > 0 && (
        <section className="rounded-2xl border border-brand/20 bg-brand/5 p-4">
          <p className="text-sm font-semibold text-brand">Atribuição em lote</p>
          <p className="mt-1 text-xs text-neutral-400">
            Aplica o mesmo plano a todos os {withoutPlan.length} aluno(s) sem treino.
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
            <FormField label="Plano de treino" hint="Será aplicado a todos sem plano" className="flex-1">
              <select
                value={bulkPlanId}
                onChange={(e) => setBulkPlanId(e.target.value)}
                className={adminField}
              >
                <option value="">Selecione o plano</option>
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {planDisplayName(p)} · {planSummary(p)}
                  </option>
                ))}
              </select>
            </FormField>
            <button
              type="button"
              disabled={!bulkPlanId || bulkSaving}
              onClick={() => void bulkAssign()}
              className="shrink-0 rounded-xl bg-brand px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
            >
              {bulkSaving ? 'Atribuindo…' : 'Aplicar a todos'}
            </button>
          </div>
        </section>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <FormField label="Buscar aluno" hint="Nome ou e-mail" className="flex-1">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={adminField}
          />
        </FormField>
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-neutral-300">Filtrar por status</span>
          <div className="flex gap-1 rounded-xl bg-surface-2 p-1">
          {(
            [
              ['all', 'Todos'],
              ['none', 'Sem plano'],
              ['assigned', 'Com plano'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setFilter(id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                filter === id ? 'bg-brand text-white' : 'text-neutral-400'
              }`}
            >
              {label}
            </button>
          ))}
          </div>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((student) => {
          const plan = student.assignedWorkoutPlanId
            ? planMap.get(student.assignedWorkoutPlanId)
            : null
          return (
            <button
              key={student.uid}
              type="button"
              onClick={() => setSelectedStudent(student)}
              className="pressable flex items-center gap-3 rounded-2xl bg-surface-2 p-4 text-left transition-colors active:bg-surface-3"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand to-brand-dark font-display text-lg font-bold text-white">
                {student.avatarInitial}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{student.name}</p>
                <p className="truncate text-sm text-neutral-400">{student.email}</p>
                {plan ? (
                  <p className="mt-1 text-xs font-medium text-brand">
                    {planDisplayName(normalizeWorkoutPlan(plan))} · {planSummary(normalizeWorkoutPlan(plan))}
                  </p>
                ) : (
                  <p className="mt-1 text-xs font-medium text-amber-300/90">Sem plano atribuído</p>
                )}
              </div>
              <span className="shrink-0 rounded-xl bg-brand/15 px-3 py-2 text-xs font-bold text-brand">
                {plan ? 'Trocar' : 'Atribuir'}
              </span>
            </button>
          )
        })}

        {filtered.length === 0 && (
          <p className="py-8 text-center text-sm text-neutral-400">
            {search ? 'Nenhum aluno encontrado.' : 'Nenhum aluno nesta lista.'}
          </p>
        )}
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-2xl bg-brand px-5 py-3 text-sm font-semibold text-white shadow-lg">
          {toast}
        </div>
      )}

      <AssignWorkoutSheet
        student={selectedStudent}
        plans={plans}
        saving={saving}
        onClose={() => setSelectedStudent(null)}
        onAssign={(planId) => selectedStudent && void assignPlan(selectedStudent, planId)}
        onClear={() => selectedStudent && void assignPlan(selectedStudent, null)}
      />
    </div>
  )
}
