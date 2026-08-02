import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { AssignWorkoutSheet } from '../../components/AssignWorkoutSheet'
import { getStudentAdherence, listStudents, listWorkoutPlans, updateUserProfile } from '../../services/api'
import { normalizeWorkoutPlan, planDisplayName, planSummary } from '../../lib/workoutPlan'
import type { StudentAdherence, UserProfile, WorkoutPlan } from '../../types'

export function AdminAvaliacaoPage() {
  const { profile } = useAuth()
  const gymId = profile?.gymId ?? ''
  const [rows, setRows] = useState<StudentAdherence[]>([])
  const [plans, setPlans] = useState<WorkoutPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedStudent, setSelectedStudent] = useState<UserProfile | null>(null)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')

  useEffect(() => {
    if (!gymId) {
      setLoading(false)
      return
    }
    Promise.all([
      listStudents(gymId).then((students) => getStudentAdherence(gymId, students)),
      listWorkoutPlans(gymId),
    ])
      .then(([adherence, p]) => {
        setRows(adherence)
        setPlans(p.filter((x) => x.active))
      })
      .finally(() => setLoading(false))
  }, [gymId])

  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(''), 2800)
    return () => window.clearTimeout(t)
  }, [toast])

  const planMap = useMemo(() => new Map(plans.map((p) => [p.id, p])), [plans])

  async function assignPlan(student: UserProfile, planId: string | null) {
    setSaving(true)
    try {
      await updateUserProfile(student.uid, { assignedWorkoutPlanId: planId })
      setRows((prev) =>
        prev.map((r) =>
          r.user.uid === student.uid
            ? {
                ...r,
                user: { ...r.user, assignedWorkoutPlanId: planId },
                workoutPct: planId ? r.workoutPct : 0,
              }
            : r,
        ),
      )
      const planName = planId
        ? planDisplayName(normalizeWorkoutPlan(planMap.get(planId)!))
        : null
      setToast(
        planName
          ? `Treino atribuído a ${student.name.split(' ')[0]}`
          : `Plano removido`,
      )
      setSelectedStudent(null)
    } finally {
      setSaving(false)
    }
  }

  if (!gymId) {
    return <p className="text-neutral-400">Perfil sem academia vinculada.</p>
  }

  if (loading) return <p className="text-neutral-400">Carregando avaliação…</p>

  const needsPlan = rows.filter(({ user }) => !user.assignedWorkoutPlanId)

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Avaliação de alunos</h2>
          <p className="mt-1 text-sm text-neutral-400">
            Uso de treino, dieta e presença na semana (dados reais do app).
          </p>
        </div>
        <Link
          to="/admin/treinos-alunos"
          className="rounded-xl bg-brand px-4 py-2 text-sm font-bold text-white"
        >
          Gerenciar treinos
        </Link>
      </div>

      {needsPlan.length > 0 && (
        <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-3">
          <p className="text-sm font-semibold text-amber-200">
            {needsPlan.length} aluno(s) sem plano de treino
          </p>
          <p className="mt-1 text-xs text-amber-200/70">
            Atribua um programa para eles começarem a treinar no app.
          </p>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {rows.map(({ user, checkInsWeek, workoutPct, mealsPct, waterLiters }) => {
          const plan = user.assignedWorkoutPlanId
            ? planMap.get(user.assignedWorkoutPlanId)
            : null
          const noPlan = !plan

          return (
            <div key={user.uid} className="rounded-2xl bg-surface-2 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{user.name}</p>
                  <p className="text-sm text-neutral-400">{user.email}</p>
                  {plan ? (
                    <p className="mt-1 text-xs text-brand">
                      {planDisplayName(normalizeWorkoutPlan(plan))} · {planSummary(normalizeWorkoutPlan(plan))}
                    </p>
                  ) : (
                    <p className="mt-1 text-xs font-medium text-amber-300">Sem plano de treino</p>
                  )}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <span className="rounded-full bg-brand/15 px-3 py-1 text-xs font-bold text-brand">
                    {user.streakDays}d sequência
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedStudent(user)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold ${
                      noPlan
                        ? 'bg-brand text-white'
                        : 'bg-surface-3 text-neutral-300'
                    }`}
                  >
                    {noPlan ? 'Atribuir treino' : 'Trocar treino'}
                  </button>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Metric label="Check-ins (7d)" value={String(checkInsWeek)} />
                <Metric
                  label="Treino hoje"
                  value={noPlan ? '—' : `${workoutPct}%`}
                  warn={noPlan}
                />
                <Metric label="Dieta hoje" value={`${mealsPct}%`} />
                <Metric label="Água hoje" value={`${waterLiters.toFixed(1)}L`} />
              </div>
            </div>
          )
        })}
        {rows.length === 0 && (
          <p className="text-sm text-neutral-400">Nenhum aluno cadastrado nesta academia.</p>
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

function Metric({
  label,
  value,
  warn,
}: {
  label: string
  value: string
  warn?: boolean
}) {
  return (
    <div className={`rounded-xl px-3 py-2 ${warn ? 'bg-amber-500/10' : 'bg-surface-3'}`}>
      <p className="text-[10px] uppercase tracking-wider text-neutral-500">{label}</p>
      <p className={`mt-1 text-lg font-bold ${warn ? 'text-amber-200' : 'text-white'}`}>
        {value}
      </p>
    </div>
  )
}
