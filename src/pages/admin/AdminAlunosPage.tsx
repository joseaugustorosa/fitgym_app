import { useEffect, useState, type FormEvent } from 'react'
import {
  createStudentRemote,
  listMealPlans,
  listStudents,
  listWorkoutPlans,
  updateUserProfile,
} from '../../services/api'
import type { MealPlan, UserProfile, WorkoutPlan } from '../../types'

function randomPassword() {
  return `fg${Math.random().toString(36).slice(2, 8)}`
}

const field =
  'w-full rounded-xl border border-border bg-surface-3 px-3 py-2.5 outline-none focus:border-brand'

export function AdminAlunosPage() {
  const [students, setStudents] = useState<UserProfile[]>([])
  const [plans, setPlans] = useState<WorkoutPlan[]>([])
  const [meals, setMeals] = useState<MealPlan[]>([])
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: randomPassword(),
    unit: 'Unidade Centro',
  })

  async function reload() {
    const [s, p, m] = await Promise.all([listStudents(), listWorkoutPlans(), listMealPlans()])
    setStudents(s)
    setPlans(p)
    setMeals(m)
  }

  useEffect(() => {
    reload()
      .catch((e) => setError(e instanceof Error ? e.message : 'Erro ao carregar'))
      .finally(() => setLoading(false))
  }, [])

  function fillDemo() {
    const n = students.length + 1
    setForm({
      name: `Aluno ${n}`,
      email: `aluno${n}@fitgym.app`,
      password: randomPassword(),
      unit: 'Unidade Centro',
    })
    setError('')
    setOk('')
  }

  async function onCreate(e: FormEvent) {
    e.preventDefault()
    setError('')
    setOk('')
    setSubmitting(true)
    try {
      await createStudentRemote(form)
      setOk(`Aluno criado! Login: ${form.email} / senha: ${form.password}`)
      setForm({
        name: '',
        email: '',
        password: randomPassword(),
        unit: 'Unidade Centro',
      })
      await reload()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Falha ao criar aluno (verifique a Function createStudent)',
      )
    } finally {
      setSubmitting(false)
    }
  }

  async function toggleActive(student: UserProfile) {
    await updateUserProfile(student.uid, { active: !student.active })
    await reload()
  }

  async function assignWorkout(uid: string, planId: string) {
    await updateUserProfile(uid, { assignedWorkoutPlanId: planId || null })
    await reload()
  }

  async function assignMeal(uid: string, mealId: string) {
    await updateUserProfile(uid, { assignedMealPlanId: mealId || null })
    await reload()
  }

  if (loading) return <p className="text-neutral-400">Carregando alunos…</p>

  return (
    <div className="flex flex-col gap-6">
      <section>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-bold">Novo aluno</h2>
          <button
            type="button"
            onClick={fillDemo}
            className="rounded-lg bg-surface-3 px-3 py-1.5 text-xs font-semibold text-brand"
          >
            Preencher rápido
          </button>
        </div>
        <form onSubmit={onCreate} className="mt-3 grid gap-3 rounded-2xl bg-surface-2 p-4 sm:grid-cols-2">
          <input
            required
            placeholder="Nome"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className={field}
          />
          <input
            required
            type="email"
            placeholder="E-mail"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className={field}
          />
          <div className="flex gap-2">
            <input
              required
              minLength={6}
              type="text"
              placeholder="Senha temporária"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className={field}
            />
            <button
              type="button"
              onClick={() => setForm({ ...form, password: randomPassword() })}
              className="shrink-0 rounded-xl bg-surface-3 px-3 text-xs font-semibold text-neutral-300"
            >
              Gerar
            </button>
          </div>
          <select
            value={form.unit}
            onChange={(e) => setForm({ ...form, unit: e.target.value })}
            className={field}
          >
            <option>Unidade Centro</option>
            <option>Unidade Norte</option>
            <option>Unidade Sul</option>
          </select>
          <button
            type="submit"
            disabled={submitting}
            className="sm:col-span-2 rounded-xl bg-brand py-3 font-bold text-white disabled:opacity-60"
          >
            {submitting ? 'Cadastrando…' : 'Cadastrar aluno'}
          </button>
        </form>
        {error && <p className="mt-2 text-sm text-rose-300">{error}</p>}
        {ok && <p className="mt-2 rounded-xl bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">{ok}</p>}
      </section>

      <section>
        <h2 className="text-xl font-bold">Alunos ({students.length})</h2>
        <div className="mt-3 flex flex-col gap-2">
          {students.map((student) => (
            <div key={student.uid} className="rounded-2xl bg-surface-2 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{student.name}</p>
                  <p className="text-sm text-neutral-400">{student.email}</p>
                  <p className="text-xs text-neutral-500">{student.unit}</p>
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
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <label className="text-xs text-neutral-400">
                  Plano de treino
                  <select
                    value={student.assignedWorkoutPlanId ?? ''}
                    onChange={(e) => assignWorkout(student.uid, e.target.value)}
                    className={`mt-1 ${field} text-sm`}
                  >
                    <option value="">Padrão / ativo</option>
                    {plans.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title} — {p.subtitle}
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
                    <option value="">Template padrão</option>
                    {meals.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
          ))}
          {students.length === 0 && (
            <p className="text-sm text-neutral-400">
              Nenhum aluno ainda. Use “Preencher rápido” ou peça para o aluno se cadastrar no app.
            </p>
          )}
        </div>
      </section>
    </div>
  )
}
