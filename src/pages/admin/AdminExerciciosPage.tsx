import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { deleteExercise, listExercises, saveExercise } from '../../services/api'
import { defaultExercises } from '../../data/defaults'
import { FormField, adminField } from '../../components/FormField'
import type { Exercise } from '../../types'

const field = adminField

const emptyExercise = (gymId: string): Exercise => ({
  id: '',
  gymId,
  name: '',
  sets: '3×12',
  rest: '60s',
  muscle: 'Peitoral',
  equipment: '',
  description: '',
  tips: [''],
  videoUrl: '',
  posterUrl: '',
})

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export function AdminExerciciosPage() {
  const { profile } = useAuth()
  const gymId = profile?.gymId ?? ''
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [search, setSearch] = useState('')
  const [form, setForm] = useState<Exercise>(emptyExercise(gymId))
  const [showForm, setShowForm] = useState(false)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)

  async function reload() {
    if (!gymId) return
    const list = await listExercises(gymId)
    setExercises(list.sort((a, b) => a.name.localeCompare(b.name)))
  }

  useEffect(() => {
    if (gymId) {
      setForm(emptyExercise(gymId))
      reload().finally(() => setLoading(false))
    }
  }, [gymId])

  const filtered = useMemo(() => {
    if (!search.trim()) return exercises
    const q = search.toLowerCase()
    return exercises.filter(
      (e) => e.name.toLowerCase().includes(q) || e.muscle.toLowerCase().includes(q),
    )
  }, [exercises, search])

  async function onSave(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setMessage('')
    try {
      const id = form.id || slugify(form.name)
      await saveExercise({ ...form, id, gymId, tips: form.tips.filter(Boolean) })
      setForm(emptyExercise(gymId))
      setShowForm(false)
      setMessage('Exercício salvo')
      await reload()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally {
      setBusy(false)
    }
  }

  async function importPresets() {
    if (!window.confirm(`Importar ${defaultExercises.length} exercícios preset? (não apaga os existentes)`)) {
      return
    }
    setBusy(true)
    try {
      for (const ex of defaultExercises) {
        await saveExercise({ ...ex, gymId })
      }
      setMessage(`${defaultExercises.length} exercícios importados`)
      await reload()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Erro ao importar')
    } finally {
      setBusy(false)
    }
  }

  async function onDelete(id: string, name: string) {
    if (!window.confirm(`Excluir "${name}" do catálogo?`)) return
    setBusy(true)
    try {
      await deleteExercise(id)
      setMessage('Exercício excluído')
      await reload()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Erro ao excluir')
    } finally {
      setBusy(false)
    }
  }

  if (!gymId) return <p className="text-neutral-400">Perfil sem academia vinculada.</p>
  if (loading) return <p className="text-neutral-400">Carregando catálogo…</p>

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link to="/admin/treinos" className="text-sm font-semibold text-brand">
            ← Programas
          </Link>
          <h2 className="mt-2 text-xl font-bold lg:text-2xl">Catálogo de exercícios</h2>
          <p className="mt-1 text-sm text-neutral-400">
            Biblioteca da academia — use nos dias de treino de cada programa.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => importPresets()}
            disabled={busy}
            className="rounded-xl bg-brand/15 px-4 py-2 text-sm font-bold text-brand disabled:opacity-50"
          >
            Importar {defaultExercises.length} presets
          </button>
          <button
            type="button"
            onClick={() => {
              setForm(emptyExercise(gymId))
              setShowForm(true)
            }}
            className="rounded-xl bg-brand px-4 py-2 text-sm font-bold text-white"
          >
            + Novo exercício
          </button>
        </div>
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

      {showForm && (
        <form onSubmit={onSave} className="grid gap-3 rounded-2xl bg-surface-2 p-4 sm:grid-cols-2">
          <FormField label="Nome">
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={field}
            />
          </FormField>
          <FormField label="Grupo muscular">
            <input
              value={form.muscle}
              onChange={(e) => setForm({ ...form, muscle: e.target.value })}
              className={field}
            />
          </FormField>
          <FormField label="Séries">
            <input
              value={form.sets}
              onChange={(e) => setForm({ ...form, sets: e.target.value })}
              className={field}
            />
          </FormField>
          <FormField label="Descanso">
            <input
              value={form.rest}
              onChange={(e) => setForm({ ...form, rest: e.target.value })}
              className={field}
            />
          </FormField>
          <FormField label="Equipamento" className="sm:col-span-2">
            <input
              value={form.equipment}
              onChange={(e) => setForm({ ...form, equipment: e.target.value })}
              className={field}
            />
          </FormField>
          <div className="flex gap-2 sm:col-span-2">
            <button
              type="submit"
              disabled={busy}
              className="flex-1 rounded-xl bg-brand py-3 font-bold text-white disabled:opacity-60"
            >
              Salvar
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-xl bg-surface-3 px-4 py-3 text-sm font-semibold text-neutral-400"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      <FormField label="Buscar no catálogo">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={field}
        />
      </FormField>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((ex) => (
          <div key={ex.id} className="flex items-center justify-between gap-2 rounded-xl bg-surface-2 px-3 py-2.5">
            <div className="min-w-0">
              <p className="truncate font-medium">{ex.name}</p>
              <p className="text-xs text-neutral-500">
                {ex.muscle} · {ex.sets}
              </p>
            </div>
            <div className="flex shrink-0 gap-1">
              <button
                type="button"
                onClick={() => {
                  setForm(ex)
                  setShowForm(true)
                }}
                className="text-xs font-semibold text-brand"
              >
                Editar
              </button>
              <button
                type="button"
                onClick={() => void onDelete(ex.id, ex.name)}
                className="text-xs font-semibold text-rose-300"
              >
                Excluir
              </button>
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-neutral-500">{filtered.length} exercício(s)</p>
    </div>
  )
}
