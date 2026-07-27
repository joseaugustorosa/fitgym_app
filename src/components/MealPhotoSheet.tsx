import { useEffect, useState } from 'react'
import { CloseIcon } from './icons'
import type { MealAnalysisResult } from '../types'

interface MealPhotoSheetProps {
  open: boolean
  previewUrl: string | null
  analyzing: boolean
  analysis: MealAnalysisResult | null
  error: string
  onClose: () => void
  onChange: (next: MealAnalysisResult) => void
  onConfirm: () => void
  confirming: boolean
}

export function MealPhotoSheet({
  open,
  previewUrl,
  analyzing,
  analysis,
  error,
  onClose,
  onChange,
  onConfirm,
  confirming,
}: MealPhotoSheetProps) {
  const [local, setLocal] = useState<MealAnalysisResult | null>(analysis)

  useEffect(() => {
    setLocal(analysis)
  }, [analysis])

  useEffect(() => {
    if (!open) return
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  function patch(partial: Partial<MealAnalysisResult>) {
    if (!local) return
    const next = { ...local, ...partial }
    setLocal(next)
    onChange(next)
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-300 ${
        open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      }`}
      aria-hidden={!open}
    >
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Análise da refeição"
        className={`relative z-10 mx-auto flex w-full max-w-[380px] max-h-[min(88vh,720px)] flex-col overflow-hidden rounded-3xl bg-surface-2 shadow-2xl transition-all duration-300 ease-out ${
          open ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'
        }`}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 px-4 pt-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">
              Scan calórico
            </p>
            <h2 className="font-display mt-1 text-xl font-bold">Foto da refeição</h2>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-3 text-neutral-400"
            aria-label="Fechar"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="scroll-area flex-1 overflow-y-auto px-4 pb-4 pt-3">
          {previewUrl ? (
            <div className="overflow-hidden rounded-2xl bg-black aspect-[4/3]">
              <img src={previewUrl} alt="Refeição" className="h-full w-full object-cover" />
            </div>
          ) : (
            <div className="flex aspect-[4/3] items-center justify-center rounded-2xl bg-surface-3">
              <p className="text-sm text-neutral-500">Carregando foto…</p>
            </div>
          )}

          <div className="mt-4">
            {analyzing && (
              <div className="rounded-2xl border border-brand/20 bg-brand/10 px-4 py-5 text-center">
                <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-brand/30 border-t-brand" />
                <p className="font-display text-lg font-bold text-brand">Contando calorias…</p>
                <p className="mt-1 text-sm text-neutral-400">
                  A IA está identificando os alimentos do prato
                </p>
              </div>
            )}

            {error && !analyzing && (
              <p className="rounded-xl bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{error}</p>
            )}

            {local && !analyzing && (
              <div className="flex flex-col gap-3">
                <label className="text-xs font-medium uppercase tracking-[0.12em] text-neutral-500">
                  Refeição
                  <input
                    value={local.title}
                    onChange={(e) => patch({ title: e.target.value })}
                    className="field-sexy"
                  />
                </label>

                <div className="grid grid-cols-2 gap-2">
                  <label className="text-xs font-medium uppercase tracking-[0.12em] text-neutral-500">
                    kcal
                    <input
                      type="number"
                      value={local.calories}
                      onChange={(e) => patch({ calories: Number(e.target.value) || 0 })}
                      className="field-sexy"
                    />
                  </label>
                  <label className="text-xs font-medium uppercase tracking-[0.12em] text-neutral-500">
                    Proteína (g)
                    <input
                      type="number"
                      value={local.protein}
                      onChange={(e) => patch({ protein: Number(e.target.value) || 0 })}
                      className="field-sexy"
                    />
                  </label>
                  <label className="text-xs font-medium uppercase tracking-[0.12em] text-neutral-500">
                    Carbo (g)
                    <input
                      type="number"
                      value={local.carbs}
                      onChange={(e) => patch({ carbs: Number(e.target.value) || 0 })}
                      className="field-sexy"
                    />
                  </label>
                  <label className="text-xs font-medium uppercase tracking-[0.12em] text-neutral-500">
                    Gordura (g)
                    <input
                      type="number"
                      value={local.fat}
                      onChange={(e) => patch({ fat: Number(e.target.value) || 0 })}
                      className="field-sexy"
                    />
                  </label>
                </div>

                <label className="text-xs font-medium uppercase tracking-[0.12em] text-neutral-500">
                  Itens (vírgula)
                  <input
                    value={local.items.join(', ')}
                    onChange={(e) =>
                      patch({
                        items: e.target.value
                          .split(',')
                          .map((x) => x.trim())
                          .filter(Boolean),
                      })
                    }
                    className="field-sexy"
                  />
                </label>

                {local.notes && (
                  <p className="text-xs leading-relaxed text-neutral-400">{local.notes}</p>
                )}

                <p className="text-[11px] text-neutral-500">
                  Confiança da IA: {Math.round(local.confidence * 100)}% — você pode ajustar os
                  números antes de salvar.
                </p>

                <button
                  onClick={onConfirm}
                  disabled={confirming || local.calories <= 0}
                  className="pressable mt-1 rounded-2xl bg-brand py-3.5 font-display font-bold text-white disabled:opacity-50"
                >
                  {confirming ? 'Salvando…' : 'Adicionar à dieta de hoje'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
