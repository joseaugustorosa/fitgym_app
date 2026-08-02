import { useEffect, useState } from 'react'
import {
  ensureCurrentBilling,
  listGyms,
  listGymBilling,
  setBillingStatus,
} from '../../services/platformApi'
import type { BillingStatus, Gym, GymBillingMonth } from '../../types'

export function PlatformMensalidadesPage() {
  const [gyms, setGyms] = useState<Gym[]>([])
  const [selectedGym, setSelectedGym] = useState('')
  const [billing, setBilling] = useState<GymBillingMonth[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    listGyms()
      .then((g) => {
        setGyms(g)
        if (g[0]) setSelectedGym(g[0].id)
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!selectedGym) return
    listGymBilling(selectedGym).then(setBilling)
  }, [selectedGym])

  async function ensureMonth() {
    const gym = gyms.find((g) => g.id === selectedGym)
    if (!gym || busy) return
    setBusy(true)
    try {
      await ensureCurrentBilling(gym)
      setBilling(await listGymBilling(selectedGym))
    } finally {
      setBusy(false)
    }
  }

  async function markStatus(id: string, status: BillingStatus) {
    setBusy(true)
    try {
      await setBillingStatus(id, status)
      setBilling(await listGymBilling(selectedGym))
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <p className="text-neutral-400">Carregando…</p>

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-bold">Mensalidades</h2>
        <p className="mt-1 text-sm text-neutral-400">Controle manual de pagamentos das academias</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {gyms.map((g) => (
          <button
            key={g.id}
            type="button"
            onClick={() => setSelectedGym(g.id)}
            className={`rounded-xl px-4 py-2 text-sm font-semibold ${
              selectedGym === g.id ? 'bg-brand text-white' : 'bg-surface-2 text-neutral-400'
            }`}
          >
            {g.name}
          </button>
        ))}
      </div>

      {selectedGym && (
        <button
          type="button"
          onClick={() => void ensureMonth()}
          disabled={busy}
          className="w-fit rounded-xl bg-surface-2 px-4 py-2 text-sm font-semibold text-brand"
        >
          Gerar fatura do mês atual
        </button>
      )}

      <div className="flex flex-col gap-2">
        {billing.map((b) => (
          <div key={b.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-surface-2 p-4">
            <div>
              <p className="font-semibold">R$ {b.amount.toLocaleString('pt-BR')}</p>
              <p className="text-sm text-neutral-400">
                Vencimento {new Date(b.dueDate).toLocaleDateString('pt-BR')}
              </p>
            </div>
            <div className="flex gap-2">
              <StatusBadge status={b.status} />
              {b.status !== 'paid' && (
                <button
                  type="button"
                  onClick={() => void markStatus(b.id, 'paid')}
                  className="rounded-lg bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-300"
                >
                  Marcar pago
                </button>
              )}
              {b.status === 'pending' && (
                <button
                  type="button"
                  onClick={() => void markStatus(b.id, 'overdue')}
                  className="rounded-lg bg-rose-500/15 px-3 py-1 text-xs font-bold text-rose-300"
                >
                  Atrasado
                </button>
              )}
            </div>
          </div>
        ))}
        {billing.length === 0 && selectedGym && (
          <p className="text-sm text-neutral-400">Nenhuma fatura registrada para esta academia.</p>
        )}
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: BillingStatus }) {
  const styles = {
    paid: 'bg-emerald-500/15 text-emerald-300',
    pending: 'bg-amber-500/15 text-amber-200',
    overdue: 'bg-rose-500/15 text-rose-300',
  }
  const labels = { paid: 'Pago', pending: 'Pendente', overdue: 'Atrasado' }
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-bold ${styles[status]}`}>
      {labels[status]}
    </span>
  )
}
