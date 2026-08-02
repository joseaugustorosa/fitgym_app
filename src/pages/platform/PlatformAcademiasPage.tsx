import { useEffect, useState, type FormEvent } from 'react'
import {
  createGym,
  createGymStaffRemote,
  listGymStudents,
  listGyms,
} from '../../services/platformApi'
import type { Gym, UserProfile } from '../../types'
import { FormField, adminField } from '../../components/FormField'

const field = adminField

export function PlatformAcademiasPage() {
  const [gyms, setGyms] = useState<Gym[]>([])
  const [studentsByGym, setStudentsByGym] = useState<Record<string, UserProfile[]>>({})
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  const [gymForm, setGymForm] = useState({
    name: '',
    contactEmail: '',
    planAmount: 299,
    billingDay: 5,
  })

  const [staffForm, setStaffForm] = useState({
    gymId: '',
    name: '',
    email: '',
    password: '',
    role: 'gym_admin' as 'gym_admin' | 'professor',
  })

  async function reload() {
    const list = await listGyms()
    setGyms(list)
    const map: Record<string, UserProfile[]> = {}
    for (const g of list) {
      map[g.id] = await listGymStudents(g.id)
    }
    setStudentsByGym(map)
  }

  useEffect(() => {
    reload().finally(() => setLoading(false))
  }, [])

  async function onCreateGym(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setMessage('')
    try {
      await createGym(gymForm)
      setGymForm({ name: '', contactEmail: '', planAmount: 299, billingDay: 5 })
      setMessage('Academia criada')
      await reload()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Erro ao criar academia')
    } finally {
      setBusy(false)
    }
  }

  async function onCreateStaff(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setMessage('')
    try {
      await createGymStaffRemote(staffForm)
      setStaffForm({ ...staffForm, name: '', email: '', password: '' })
      setMessage('Staff criado com sucesso')
      await reload()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Erro ao criar staff')
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <p className="text-neutral-400">Carregando academias…</p>

  return (
    <div className="flex flex-col gap-8 xl:grid xl:grid-cols-2 xl:items-start xl:gap-6">
      <section className="flex flex-col gap-8">
        <div>
          <h2 className="text-xl font-bold lg:text-2xl">Nova academia</h2>
          <form onSubmit={onCreateGym} className="mt-3 grid gap-3 rounded-2xl bg-surface-2 p-4 sm:grid-cols-2 lg:p-5">
          <FormField label="Nome da academia" hint="Nome comercial exibido no painel">
            <input
              required
              value={gymForm.name}
              onChange={(e) => setGymForm({ ...gymForm, name: e.target.value })}
              className={field}
            />
          </FormField>
          <FormField label="E-mail de contato" hint="E-mail principal do cliente">
            <input
              required
              type="email"
              value={gymForm.contactEmail}
              onChange={(e) => setGymForm({ ...gymForm, contactEmail: e.target.value })}
              className={field}
            />
          </FormField>
          <FormField label="Mensalidade (R$)" hint="Valor que a academia paga pelo app">
            <input
              required
              type="number"
              min={0}
              value={gymForm.planAmount}
              onChange={(e) => setGymForm({ ...gymForm, planAmount: Number(e.target.value) })}
              className={field}
            />
          </FormField>
          <FormField label="Dia do vencimento" hint="Dia do mês (1 a 28)">
            <input
              required
              type="number"
              min={1}
              max={28}
              value={gymForm.billingDay}
              onChange={(e) => setGymForm({ ...gymForm, billingDay: Number(e.target.value) })}
              className={field}
            />
          </FormField>
          <button
            type="submit"
            disabled={busy}
            className="sm:col-span-2 rounded-xl bg-brand py-3 font-bold text-white disabled:opacity-60"
          >
            Criar academia
          </button>
        </form>
        </div>

        <div>
        <h2 className="text-xl font-bold lg:text-2xl">Admin / professor da academia</h2>
        <form onSubmit={onCreateStaff} className="mt-3 grid gap-3 rounded-2xl bg-surface-2 p-4 sm:grid-cols-2 lg:p-5">
          <FormField label="Academia" hint="Academia onde a pessoa vai trabalhar">
            <select
              required
              value={staffForm.gymId}
              onChange={(e) => setStaffForm({ ...staffForm, gymId: e.target.value })}
              className={field}
            >
              <option value="">Selecione a academia</option>
              {gyms.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Papel" hint="Admin gerencia tudo; professor foca em alunos e treinos">
            <select
              value={staffForm.role}
              onChange={(e) =>
                setStaffForm({ ...staffForm, role: e.target.value as 'gym_admin' | 'professor' })
              }
              className={field}
            >
              <option value="gym_admin">Admin da academia</option>
              <option value="professor">Professor</option>
            </select>
          </FormField>
          <FormField label="Nome completo">
            <input
              required
              value={staffForm.name}
              onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })}
              className={field}
            />
          </FormField>
          <FormField label="E-mail de login">
            <input
              required
              type="email"
              value={staffForm.email}
              onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
              className={field}
            />
          </FormField>
          <FormField
            label="Senha inicial"
            hint="Mínimo 6 caracteres — a pessoa pode trocar depois"
            className="sm:col-span-2"
          >
            <input
              required
              minLength={6}
              type="password"
              value={staffForm.password}
              onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })}
              className={field}
            />
          </FormField>
          <button
            type="submit"
            disabled={busy}
            className="sm:col-span-2 rounded-xl bg-brand py-3 font-bold text-white disabled:opacity-60"
          >
            Criar acesso staff
          </button>
        </form>
        </div>
      </section>

      {message && (
        <p className="rounded-xl bg-brand/10 px-3 py-2 text-sm text-brand xl:col-span-2">{message}</p>
      )}

      <section className="xl:col-span-2">
        <h2 className="text-xl font-bold lg:text-2xl">Academias ({gyms.length})</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {gyms.map((g) => (
            <div key={g.id} className="rounded-2xl bg-surface-2 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{g.name}</p>
                  <p className="text-sm text-neutral-400">{g.contactEmail}</p>
                </div>
                <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-300">
                  R$ {g.planAmount}/mês
                </span>
              </div>
              <p className="mt-2 text-xs text-neutral-500">
                {(studentsByGym[g.id] ?? []).filter((u) => u.role === 'aluno').length} alunos ·{' '}
                {(studentsByGym[g.id] ?? []).filter((u) => u.role !== 'aluno').length} staff
              </p>
            </div>
          ))}
          {gyms.length === 0 && (
            <p className="text-sm text-neutral-400">Nenhuma academia cadastrada ainda.</p>
          )}
        </div>
      </section>
    </div>
  )
}
