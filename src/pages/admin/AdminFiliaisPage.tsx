import { useEffect, useState, type FormEvent } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { deleteGymBranch, listGymBranches, saveGymBranch } from '../../services/api'
import { FormField, adminField } from '../../components/FormField'
import type { GymBranch } from '../../types'

const field = adminField

const emptyForm = (gymId: string): Omit<GymBranch, 'createdAt'> => ({
  id: '',
  gymId,
  name: '',
  address: '',
  active: true,
})

export function AdminFiliaisPage() {
  const { profile } = useAuth()
  const gymId = profile?.gymId ?? ''
  const [branches, setBranches] = useState<GymBranch[]>([])
  const [form, setForm] = useState(emptyForm(gymId))
  const [editingId, setEditingId] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)

  async function reload() {
    if (!gymId) return
    const list = await listGymBranches(gymId)
    setBranches(list)
  }

  useEffect(() => {
    if (gymId) setForm(emptyForm(gymId))
    reload()
      .catch((e) => setError(e instanceof Error ? e.message : 'Erro ao carregar filiais'))
      .finally(() => setLoading(false))
  }, [gymId])

  function startEdit(branch: GymBranch) {
    setEditingId(branch.id)
    setForm({
      id: branch.id,
      gymId: branch.gymId,
      name: branch.name,
      address: branch.address,
      active: branch.active,
    })
    setMessage('')
    setError('')
  }

  function cancelEdit() {
    setEditingId(null)
    setForm(emptyForm(gymId))
  }

  async function onSave(e: FormEvent) {
    e.preventDefault()
    if (!gymId || !form.name.trim()) return
    setBusy(true)
    setMessage('')
    setError('')
    try {
      await saveGymBranch({ ...form, gymId, name: form.name.trim(), address: form.address.trim() })
      setMessage(editingId ? 'Filial atualizada' : 'Filial criada')
      setEditingId(null)
      setForm(emptyForm(gymId))
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao salvar filial')
    } finally {
      setBusy(false)
    }
  }

  async function onDeactivate(branch: GymBranch) {
    if (!window.confirm(`Desativar a filial "${branch.name}"? Alunos já vinculados mantêm o histórico.`)) {
      return
    }
    setBusy(true)
    setError('')
    try {
      await deleteGymBranch(branch.id)
      if (editingId === branch.id) cancelEdit()
      setMessage(`Filial "${branch.name}" desativada`)
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao desativar filial')
    } finally {
      setBusy(false)
    }
  }

  async function onReactivate(branch: GymBranch) {
    setBusy(true)
    setError('')
    try {
      await saveGymBranch({ ...branch, active: true })
      setMessage(`Filial "${branch.name}" reativada`)
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao reativar filial')
    } finally {
      setBusy(false)
    }
  }

  if (!gymId) {
    return <p className="text-neutral-400">Perfil sem academia vinculada.</p>
  }

  if (loading) return <p className="text-neutral-400">Carregando filiais…</p>

  const activeCount = branches.filter((b) => b.active).length

  return (
    <div className="flex flex-col gap-6">
      <section>
        <h2 className="text-xl font-bold">Filiais</h2>
        <p className="mt-1 text-sm text-neutral-400">
          Opcional — cadastre unidades só se sua academia tiver mais de um endereço. Ao convidar
          alunos, você poderá vinculá-los a uma filial.
        </p>
      </section>

      {message && (
        <p className="rounded-xl bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">{message}</p>
      )}
      {error && <p className="rounded-xl bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{error}</p>}

      <form onSubmit={onSave} className="grid gap-3 rounded-2xl bg-surface-2 p-4 sm:grid-cols-2">
        <h3 className="sm:col-span-2 font-semibold">
          {editingId ? 'Editar filial' : 'Nova filial'}
        </h3>
        <FormField label="Nome" hint="Ex: Unidade Centro, Matriz, Filial Norte">
          <input
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className={field}
          />
        </FormField>
        <FormField label="Endereço" hint="Opcional — referência para a equipe">
          <input
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            className={field}
            placeholder="Rua, bairro, cidade"
          />
        </FormField>
        <div className="flex flex-wrap gap-2 sm:col-span-2">
          <button
            type="submit"
            disabled={busy}
            className="rounded-xl bg-brand px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
          >
            {busy ? 'Salvando…' : editingId ? 'Salvar alterações' : 'Adicionar filial'}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={cancelEdit}
              className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-neutral-300"
            >
              Cancelar
            </button>
          )}
        </div>
      </form>

      <section>
        <h3 className="font-semibold">
          Cadastradas ({activeCount} ativa{activeCount !== 1 ? 's' : ''})
        </h3>
        <div className="mt-3 flex flex-col gap-2">
          {branches.map((branch) => (
            <div
              key={branch.id}
              className={`flex flex-wrap items-start justify-between gap-3 rounded-2xl p-4 ${
                branch.active ? 'bg-surface-2' : 'bg-surface-2/50 opacity-70'
              }`}
            >
              <div>
                <p className="font-semibold">
                  {branch.name}
                  {!branch.active && (
                    <span className="ml-2 rounded-full bg-neutral-500/20 px-2 py-0.5 text-xs text-neutral-400">
                      Inativa
                    </span>
                  )}
                </p>
                {branch.address && (
                  <p className="mt-0.5 text-sm text-neutral-400">{branch.address}</p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {branch.active ? (
                  <>
                    <button
                      type="button"
                      onClick={() => startEdit(branch)}
                      className="rounded-xl bg-brand/15 px-3 py-2 text-xs font-bold text-brand"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeactivate(branch)}
                      disabled={busy}
                      className="rounded-xl bg-rose-500/10 px-3 py-2 text-xs font-bold text-rose-300"
                    >
                      Desativar
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => onReactivate(branch)}
                    disabled={busy}
                    className="rounded-xl bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-300"
                  >
                    Reativar
                  </button>
                )}
              </div>
            </div>
          ))}
          {branches.length === 0 && (
            <p className="text-sm text-neutral-400">
              Nenhuma filial cadastrada. Sua academia funciona como unidade única — isso é normal
              para a maioria dos casos.
            </p>
          )}
        </div>
      </section>
    </div>
  )
}
