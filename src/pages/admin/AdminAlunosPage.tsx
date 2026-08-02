import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import {
  activeBranches,
  assignStudentBranch,
  createInviteRemote,
  inviteLink,
  listGymBranches,
  listInvites,
  listMealPlans,
  listStudents,
  listWorkoutPlans,
  updateUserProfile,
} from '../../services/api'
import type { GymBranch, Invite, MealPlan, UserProfile, WorkoutPlan } from '../../types'
import { FormField, adminField } from '../../components/FormField'
import { studentBranchLabel } from '../../lib/branches'
import { planDisplayName, normalizeWorkoutPlan } from '../../lib/workoutPlan'

const field = adminField

export function AdminAlunosPage() {
  const { profile } = useAuth()
  const gymId = profile?.gymId ?? ''
  const isProfessor = profile?.role === 'professor'

  const [students, setStudents] = useState<UserProfile[]>([])
  const [branches, setBranches] = useState<GymBranch[]>([])
  const [invites, setInvites] = useState<Invite[]>([])
  const [plans, setPlans] = useState<WorkoutPlan[]>([])
  const [meals, setMeals] = useState<MealPlan[]>([])
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [copiedToken, setCopiedToken] = useState('')
  const [form, setForm] = useState({
    name: '',
    email: '',
    assignedWorkoutPlanId: '',
    assignedMealPlanId: '',
    branchId: '',
  })

  const activeBranchList = activeBranches(branches)

  async function reload() {
    if (!gymId) return
    const [s, b, i, p, m] = await Promise.all([
      listStudents(gymId),
      listGymBranches(gymId),
      listInvites(gymId),
      listWorkoutPlans(gymId),
      listMealPlans(gymId),
    ])
    setStudents(s)
    setBranches(b)
    setInvites(i)
    setPlans(p)
    setMeals(m)
  }

  useEffect(() => {
    reload()
      .catch((e) => setError(e instanceof Error ? e.message : 'Erro ao carregar'))
      .finally(() => setLoading(false))
  }, [gymId])

  async function onCreate(e: FormEvent) {
    e.preventDefault()
    if (!gymId) return
    setError('')
    setOk('')
    setSubmitting(true)
    try {
      const { token } = await createInviteRemote({
        gymId,
        name: form.name,
        email: form.email,
        branchId: form.branchId || null,
        assignedWorkoutPlanId: form.assignedWorkoutPlanId || null,
        assignedMealPlanId: form.assignedMealPlanId || null,
      })
      const link = inviteLink(token)
      setOk(`Convite criado! Link: ${link}`)
      setForm({
        name: '',
        email: '',
        assignedWorkoutPlanId: '',
        assignedMealPlanId: '',
        branchId: '',
      })
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao criar convite')
    } finally {
      setSubmitting(false)
    }
  }

  async function copyLink(token: string) {
    await navigator.clipboard.writeText(inviteLink(token))
    setCopiedToken(token)
    window.setTimeout(() => setCopiedToken(''), 2000)
  }

  async function toggleActive(student: UserProfile) {
    await updateUserProfile(student.uid, { active: !student.active })
    await reload()
  }

  async function assignWorkout(uid: string, planId: string) {
    await updateUserProfile(uid, { assignedWorkoutPlanId: planId || null })
    await reload()
  }

  async function assignBranch(uid: string, branchId: string) {
    await assignStudentBranch(uid, branchId || null, branches)
    await reload()
  }

  async function assignMeal(uid: string, mealId: string) {
    await updateUserProfile(uid, { assignedMealPlanId: mealId || null })
    await reload()
  }

  if (!gymId) {
    return <p className="text-neutral-400">Perfil sem academia vinculada.</p>
  }

  if (loading) return <p className="text-neutral-400">Carregando alunos…</p>

  return (
    <div className="flex flex-col gap-6">
      <section>
        <h2 className="text-xl font-bold">Convidar aluno</h2>
        <p className="mt-1 text-sm text-neutral-400">
          Gere um link para o aluno criar a própria senha e entrar no app.
        </p>
        <form onSubmit={onCreate} className="mt-3 grid gap-3 rounded-2xl bg-surface-2 p-4 sm:grid-cols-2">
          <FormField label="Nome do aluno" hint="Nome completo que aparece no app">
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={field}
            />
          </FormField>
          <FormField label="E-mail" hint="O aluno usará este e-mail para entrar">
            <input
              required
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className={field}
            />
          </FormField>
          {activeBranchList.length > 0 && (
            <FormField label="Filial" hint="Opcional — vincule o aluno a uma unidade">
              <select
                value={form.branchId}
                onChange={(e) => setForm({ ...form, branchId: e.target.value })}
                className={field}
              >
                <option value="">Matriz / sem filial</option>
                {activeBranchList.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </FormField>
          )}
          <FormField label="Plano de treino" hint="Opcional — já deixa o treino pronto no cadastro">
            <select
              value={form.assignedWorkoutPlanId}
              onChange={(e) => setForm({ ...form, assignedWorkoutPlanId: e.target.value })}
              className={field}
            >
              <option value="">Nenhum (atribuir depois)</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {planDisplayName(normalizeWorkoutPlan(p))}
                </option>
              ))}
            </select>
          </FormField>
          <FormField
            label="Plano alimentar"
            hint="Opcional — dieta que o aluno verá no app"
            className="sm:col-span-2"
          >
            <select
              value={form.assignedMealPlanId}
              onChange={(e) => setForm({ ...form, assignedMealPlanId: e.target.value })}
              className={field}
            >
              <option value="">Nenhum (atribuir depois)</option>
              {meals.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </FormField>
          <button
            type="submit"
            disabled={submitting}
            className="sm:col-span-2 rounded-xl bg-brand py-3 font-bold text-white disabled:opacity-60"
          >
            {submitting ? 'Gerando convite…' : 'Gerar link de convite'}
          </button>
        </form>
        {error && <p className="mt-2 text-sm text-rose-300">{error}</p>}
        {ok && (
          <p className="mt-2 break-all rounded-xl bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
            {ok}
          </p>
        )}
      </section>

      {invites.length > 0 && (
        <section>
          <h2 className="text-xl font-bold">Convites pendentes ({invites.length})</h2>
          <div className="mt-3 flex flex-col gap-2">
            {invites.map((inv) => (
              <div key={inv.token} className="flex items-center justify-between gap-3 rounded-2xl bg-surface-2 p-4">
                <div>
                  <p className="font-semibold">{inv.name}</p>
                  <p className="text-sm text-neutral-400">{inv.email}</p>
                </div>
                <button
                  type="button"
                  onClick={() => copyLink(inv.token)}
                  className="shrink-0 rounded-xl bg-brand/15 px-3 py-2 text-xs font-bold text-brand"
                >
                  {copiedToken === inv.token ? 'Copiado!' : 'Copiar link'}
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl font-bold">Alunos ({students.length})</h2>
          {isProfessor && (
            <Link to="/admin/treinos-alunos" className="text-sm font-semibold text-brand">
              Atribuir treinos →
            </Link>
          )}
        </div>
        <div className="mt-3 grid gap-2 lg:grid-cols-2">
          {students.map((student) => (
            <div key={student.uid} className="rounded-2xl bg-surface-2 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{student.name}</p>
                  <p className="text-sm text-neutral-400">{student.email}</p>
                  {studentBranchLabel(student, branches) && (
                    <p className="text-xs text-brand/80">
                      {studentBranchLabel(student, branches)}
                    </p>
                  )}
                  <p className="text-xs text-neutral-500">
                    Sequência {student.streakDays} dia{student.streakDays !== 1 ? 's' : ''}
                  </p>
                </div>
                <button
                  onClick={() => toggleActive(student)}
                  className={`rounded-full px-3 py-1 text-xs font-bold ${
                    student.active
                      ? 'bg-emerald-500/15 text-emerald-300'
                      : 'bg-rose-500/15 text-rose-300'
                  }`}
                >
                  {student.active ? 'Ativo' : 'Inativo'}
                </button>
              </div>
              {!isProfessor && (
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {activeBranchList.length > 0 && (
                  <label className="text-xs text-neutral-400 sm:col-span-2">
                    Filial
                    <select
                      value={student.branchId ?? ''}
                      onChange={(e) => assignBranch(student.uid, e.target.value)}
                      className={`mt-1 ${field} text-sm`}
                    >
                      <option value="">Matriz / sem filial</option>
                      {activeBranchList.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <label className="text-xs text-neutral-400">
                  Plano de treino
                  <select
                    value={student.assignedWorkoutPlanId ?? ''}
                    onChange={(e) => assignWorkout(student.uid, e.target.value)}
                    className={`mt-1 ${field} text-sm`}
                  >
                    <option value="">Nenhum</option>
                    {plans.map((p) => (
                      <option key={p.id} value={p.id}>
                        {planDisplayName(normalizeWorkoutPlan(p))}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs text-neutral-400">
                  Plano alimentar
                  <select
                    value={student.assignedMealPlanId ?? ''}
                    onChange={(e) => assignMeal(student.uid, e.target.value)}
                    className={`mt-1 ${field} text-sm`}
                  >
                    <option value="">Nenhum</option>
                    {meals.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              )}
              {isProfessor && (
                <p className="mt-2 text-xs text-neutral-500">
                  Treino:{' '}
                  {student.assignedWorkoutPlanId
                    ? planDisplayName(normalizeWorkoutPlan(plans.find((p) => p.id === student.assignedWorkoutPlanId)!)) 
                    : 'Sem plano'}{' '}
                  ·{' '}
                  <Link to="/admin/treinos-alunos" className="font-semibold text-brand">
                    alterar
                  </Link>
                </p>
              )}
            </div>
          ))}
          {students.length === 0 && (
            <p className="text-sm text-neutral-400">
              Nenhum aluno ainda. Gere um convite e envie o link por WhatsApp ou e-mail.
            </p>
          )}
        </div>
      </section>
    </div>
  )
}
