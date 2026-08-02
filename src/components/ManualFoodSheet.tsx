import { useEffect, useState, type FormEvent } from 'react'
import { CloseIcon } from './icons'

export interface ManualFoodEntry {
  title: string
  calories: number
  protein: number
  carbs: number
  fat: number
}

interface ManualFoodSheetProps {
  open: boolean
  confirming?: boolean
  onClose: () => void
  onConfirm: (entry: ManualFoodEntry) => void
}

export function ManualFoodSheet({
  open,
  confirming = false,
  onClose,
  onConfirm,
}: ManualFoodSheetProps) {
  const [title, setTitle] = useState('')
  const [calories, setCalories] = useState('')
  const [protein, setProtein] = useState('')
  const [carbs, setCarbs] = useState('')
  const [fat, setFat] = useState('')

  useEffect(() => {
    if (!open) {
      setTitle('')
      setCalories('')
      setProtein('')
      setCarbs('')
      setFat('')
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    const kcal = Number(calories)
    if (!title.trim() || !Number.isFinite(kcal) || kcal <= 0) return
    onConfirm({
      title: title.trim(),
      calories: Math.round(kcal),
      protein: Math.max(0, Math.round(Number(protein) || 0)),
      carbs: Math.max(0, Math.round(Number(carbs) || 0)),
      fat: Math.max(0, Math.round(Number(fat) || 0)),
    })
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex items-end justify-center p-0 transition-opacity duration-300 sm:items-center sm:p-4 ${
        open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      }`}
      aria-hidden={!open}
    >
      <div className="absolute inset-0 sheet-overlay backdrop-blur-sm" onClick={onClose} />

      <form
        onSubmit={onSubmit}
        role="dialog"
        aria-modal="true"
        aria-label="Registrar alimento manualmente"
        className={`relative z-10 flex w-full max-w-[430px] flex-col overflow-hidden rounded-t-3xl bg-surface-2 shadow-2xl transition-all duration-300 sm:rounded-3xl ${
          open ? 'translate-y-0' : 'translate-y-8'
        }`}
      >
        <div className="flex items-start justify-between gap-3 px-4 pt-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">
              Registro livre
            </p>
            <h2 className="font-display mt-1 text-xl font-bold">Adicionar alimento</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-3 text-neutral-400"
            aria-label="Fechar"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-col gap-3 p-4">
          <label className="text-xs font-semibold text-neutral-400">
            O que você comeu?
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Marmita com frango e arroz"
              className="input-surface mt-1 w-full rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand/40"
            />
          </label>
          <label className="text-xs font-semibold text-neutral-400">
            Calorias (kcal) *
            <input
              required
              type="number"
              min={1}
              value={calories}
              onChange={(e) => setCalories(e.target.value)}
              placeholder="450"
              className="input-surface mt-1 w-full rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand/40"
            />
          </label>
          <div className="grid grid-cols-3 gap-2">
            <label className="text-xs font-semibold text-neutral-400">
              Proteína (g)
              <input
                type="number"
                min={0}
                value={protein}
                onChange={(e) => setProtein(e.target.value)}
                className="input-surface mt-1 w-full rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand/40"
              />
            </label>
            <label className="text-xs font-semibold text-neutral-400">
              Carbs (g)
              <input
                type="number"
                min={0}
                value={carbs}
                onChange={(e) => setCarbs(e.target.value)}
                className="input-surface mt-1 w-full rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand/40"
              />
            </label>
            <label className="text-xs font-semibold text-neutral-400">
              Gordura (g)
              <input
                type="number"
                min={0}
                value={fat}
                onChange={(e) => setFat(e.target.value)}
                className="input-surface mt-1 w-full rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand/40"
              />
            </label>
          </div>
          <p className="text-xs text-neutral-500">
            Macros opcionais — informe só as calorias se preferir.
          </p>
          <button
            type="submit"
            disabled={confirming}
            className="rounded-xl bg-brand py-3 font-bold text-white disabled:opacity-60"
          >
            {confirming ? 'Salvando…' : 'Adicionar ao diário'}
          </button>
        </div>
      </form>
    </div>
  )
}
