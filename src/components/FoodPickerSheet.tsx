import { useEffect, useState } from 'react'
import { CloseIcon } from './icons'
import {
  estimateFoodWithAI,
  foodSourceLabel,
  portionFromFood,
  searchFoods,
  type FoodItem,
  type FoodPortion,
} from '../services/foodApi'

interface FoodPickerSheetProps {
  open: boolean
  onClose: () => void
  onConfirm: (portion: FoodPortion) => void
  confirming?: boolean
}

export function FoodPickerSheet({
  open,
  onClose,
  onConfirm,
  confirming = false,
}: FoodPickerSheetProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<FoodItem[]>([])
  const [searching, setSearching] = useState(false)
  const [estimating, setEstimating] = useState(false)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<FoodItem | null>(null)
  const [grams, setGrams] = useState(100)
  const [searched, setSearched] = useState(false)

  useEffect(() => {
    if (!open) return
    document.body.style.overflow = 'hidden'
    // carrega sugestões iniciais do catálogo
    void runSearch('')
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  useEffect(() => {
    if (!open || selected) return
    const t = setTimeout(() => {
      void runSearch(query)
    }, 350)
    return () => clearTimeout(t)
  }, [query, open, selected])

  async function runSearch(q: string) {
    setSearching(true)
    setError('')
    try {
      const { results: list } = await searchFoods(q)
      setResults(list)
      setSearched(q.trim().length >= 2)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro na busca')
    } finally {
      setSearching(false)
    }
  }

  async function useAiEstimate() {
    if (!query.trim()) {
      setError('Digite o nome do que você comeu')
      return
    }
    setEstimating(true)
    setError('')
    try {
      const food = await estimateFoodWithAI(query.trim())
      setSelected(food)
      setGrams(food.defaultGrams)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'IA indisponível')
    } finally {
      setEstimating(false)
    }
  }

  function pick(food: FoodItem) {
    setSelected(food)
    setGrams(food.defaultGrams)
  }

  const portion = selected ? portionFromFood(selected, grams) : null

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/65 backdrop-blur-sm transition-opacity duration-300 ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className={`fixed inset-x-0 bottom-0 z-50 mx-auto max-w-[430px] transition-transform duration-300 ${
          open ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="max-h-[88vh] overflow-y-auto rounded-t-3xl bg-surface-2 pb-[env(safe-area-inset-bottom)]">
          <div className="flex justify-center pt-3 pb-1">
            <div className="h-1 w-10 rounded-full bg-neutral-600" />
          </div>

          <div className="flex items-start justify-between gap-3 px-4 pt-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">
                Alimentação
              </p>
              <h2 className="mt-1 text-xl font-bold">O que você comeu?</h2>
            </div>
            <button
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-3 text-neutral-400"
              aria-label="Fechar"
            >
              <CloseIcon className="h-5 w-5" />
            </button>
          </div>

          <div className="px-4 py-4">
            {!selected ? (
              <>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Ex: frango grelhado, arroz, banana…"
                  className="field-sexy mt-0"
                  autoFocus
                />
                <p className="mt-2 text-[11px] text-neutral-500">
                  Busca no catálogo FitGym e na base Open Food Facts. Se não achar, use a IA.
                </p>

                {error && (
                  <p className="mt-2 rounded-xl bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
                    {error}
                  </p>
                )}

                <div className="mt-3 flex flex-col gap-2">
                  {searching && (
                    <p className="text-sm text-neutral-400">Buscando alimentos…</p>
                  )}
                  {!searching &&
                    results.map((food) => (
                      <button
                        key={food.id}
                        type="button"
                        onClick={() => pick(food)}
                        className="pressable flex items-center gap-3 rounded-2xl bg-surface-3/80 p-3 text-left"
                      >
                        {food.imageUrl ? (
                          <img
                            src={food.imageUrl}
                            alt=""
                            className="h-12 w-12 rounded-xl object-cover"
                          />
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand/15 text-xs font-bold text-brand">
                            {food.source === 'ai' ? 'IA' : 'OK'}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold">{food.name}</p>
                          <p className="text-xs text-neutral-400">
                            {food.caloriesPer100g} kcal/100g
                            {food.brand ? ` · ${food.brand}` : ''} · {foodSourceLabel(food.source)}
                          </p>
                        </div>
                      </button>
                    ))}
                  {!searching && results.length === 0 && searched && (
                    <div className="rounded-2xl border border-brand/20 bg-brand/10 p-4">
                      <p className="text-sm text-neutral-200">
                        Não encontramos “{query}” na base de comidas.
                      </p>
                      <button
                        type="button"
                        onClick={() => void useAiEstimate()}
                        disabled={estimating}
                        className="pressable mt-3 w-full rounded-xl bg-brand py-3 text-sm font-bold text-white disabled:opacity-60"
                      >
                        {estimating ? 'Consultando IA…' : 'Estimar com IA'}
                      </button>
                    </div>
                  )}
                </div>

                {query.trim().length >= 2 && results.length > 0 && (
                  <button
                    type="button"
                    onClick={() => void useAiEstimate()}
                    disabled={estimating}
                    className="mt-3 w-full rounded-xl border border-white/10 py-3 text-sm font-semibold text-neutral-300 disabled:opacity-60"
                  >
                    {estimating ? 'Consultando IA…' : 'Não achei — estimar com IA'}
                  </button>
                )}
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="mb-3 text-xs font-semibold text-brand"
                >
                  ← Trocar alimento
                </button>
                <div className="rounded-2xl bg-surface-3 p-4">
                  <p className="font-semibold">{selected.name}</p>
                  <p className="mt-1 text-xs text-neutral-400">
                    {foodSourceLabel(selected.source)} · {selected.caloriesPer100g} kcal / 100g
                  </p>
                </div>

                <label className="mt-4 block text-xs font-medium uppercase tracking-[0.12em] text-neutral-500">
                  Quantidade (gramas)
                  <input
                    type="number"
                    min={1}
                    max={2000}
                    value={grams}
                    onChange={(e) => setGrams(Number(e.target.value) || 1)}
                    className="field-sexy"
                  />
                </label>

                <div className="mt-2 flex flex-wrap gap-2">
                  {[50, 100, 150, 200, selected.defaultGrams].filter(
                    (v, i, a) => a.indexOf(v) === i,
                  ).map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setGrams(g)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                        grams === g ? 'bg-brand text-white' : 'bg-surface-3 text-neutral-300'
                      }`}
                    >
                      {g}g
                    </button>
                  ))}
                </div>

                {portion && (
                  <div className="mt-4 grid grid-cols-4 gap-2 text-center">
                    {[
                      { label: 'kcal', value: portion.calories },
                      { label: 'P', value: `${portion.protein}g` },
                      { label: 'C', value: `${portion.carbs}g` },
                      { label: 'G', value: `${portion.fat}g` },
                    ].map((s) => (
                      <div key={s.label} className="rounded-xl bg-surface-3 p-2">
                        <p className="text-[10px] text-neutral-500">{s.label}</p>
                        <p className="font-bold text-brand">{s.value}</p>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  disabled={!portion || confirming}
                  onClick={() => portion && onConfirm(portion)}
                  className="pressable mt-4 w-full rounded-2xl bg-brand py-3.5 font-bold text-white disabled:opacity-50"
                >
                  {confirming ? 'Salvando…' : 'Adicionar à dieta'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
