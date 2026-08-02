import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  countActiveGyms,
  countPlatformStudents,
  listGyms,
  listOverdueBilling,
} from '../../services/platformApi'

export function PlatformDashboardPage() {
  const [gyms, setGyms] = useState(0)
  const [students, setStudents] = useState(0)
  const [overdue, setOverdue] = useState(0)
  const [mrr, setMrr] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([countActiveGyms(), countPlatformStudents(), listOverdueBilling(), listGyms()])
      .then(([g, s, o, gymList]) => {
        setGyms(g)
        setStudents(s)
        setOverdue(o.length)
        setMrr(gymList.filter((x) => x.active).reduce((sum, x) => sum + x.planAmount, 0))
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p className="text-neutral-400">Carregando…</p>

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-bold">Visão empreendedora</h2>
        <p className="mt-1 text-sm text-neutral-400">Academias clientes do FitGym</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Academias ativas', value: gyms },
          { label: 'Alunos na plataforma', value: students },
          { label: 'MRR esperado (R$)', value: mrr.toLocaleString('pt-BR') },
          { label: 'Inadimplentes', value: overdue },
        ].map((card) => (
          <div key={card.label} className="rounded-2xl bg-surface-2 p-4">
            <p className="text-sm text-neutral-400">{card.label}</p>
            <p className="mt-2 text-2xl font-bold text-brand">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <Link to="/platform/academias" className="rounded-2xl bg-surface-2 p-4">
          <p className="font-semibold text-brand">Gerenciar academias</p>
          <p className="mt-1 text-sm text-neutral-400">Cadastrar clientes e staff</p>
        </Link>
        <Link to="/platform/mensalidades" className="rounded-2xl bg-surface-2 p-4">
          <p className="font-semibold text-brand">Mensalidades</p>
          <p className="mt-1 text-sm text-neutral-400">Marcar pagamentos manualmente</p>
        </Link>
      </div>
    </div>
  )
}
