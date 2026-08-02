import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useGymTheme } from '../../contexts/GymThemeContext'
import { ColorModePicker } from '../../components/ColorModeToggle'
import { useColorMode } from '../../contexts/ColorModeContext'
import { gymThemes, applyGymTheme } from '../../lib/gymThemes'
import type { GymThemeId } from '../../types'

export function AdminAparenciaPage() {
  const { profile } = useAuth()
  const { themeId, setTheme, loading } = useGymTheme()
  const { mode } = useColorMode()
  const [selected, setSelected] = useState<GymThemeId>(themeId)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    setSelected(themeId)
  }, [themeId])

  if (profile?.role !== 'gym_admin') {
    return <p className="text-neutral-400">Apenas o administrador da academia pode alterar o tema.</p>
  }

  if (!profile.gymId) {
    return <p className="text-neutral-400">Perfil sem academia vinculada.</p>
  }

  async function onSelectTheme(next: GymThemeId) {
    if (busy || loading || next === themeId) return

    const previous = themeId
    setSelected(next)
    applyGymTheme(next)
    setBusy(true)
    setMessage('')

    try {
      await setTheme(next)
      setMessage('Tema aplicado — alunos verão as novas cores ao abrir o app.')
    } catch (err) {
      setSelected(previous)
      applyGymTheme(previous)
      const raw = err instanceof Error ? err.message : 'Erro ao salvar tema'
      const friendly = raw.includes('permission') || raw.includes('PERMISSION_DENIED')
        ? 'Sem permissão para salvar. Confirme que você é admin da academia e que as regras do Firestore foram publicadas.'
        : raw
      setMessage(friendly)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <section>
        <h2 className="text-xl font-bold lg:text-2xl">Aparência do app</h2>
        <p className="mt-1 text-sm text-neutral-400">
          Toque em um tema para aplicar imediatamente. Alunos e professores verão as novas cores ao
          abrir o app.
        </p>
      </section>

      <section className="rounded-2xl border border-[var(--color-panel-border)] bg-surface-2 p-4">
        <h3 className="font-semibold">Modo claro / escuro</h3>
        <p className="mt-1 text-sm text-neutral-400">
          Preferência pessoal neste dispositivo. Não altera a experiência dos alunos.
        </p>
        <ColorModePicker className="mt-4" />
      </section>

      {message && (
        <p
          className={`rounded-xl px-3 py-2 text-sm ${
            message.includes('Erro') ||
            message.includes('Sem permissão') ||
            message.includes('permissão')
              ? 'bg-rose-500/10 text-rose-300'
              : 'bg-emerald-500/10 text-emerald-300'
          }`}
        >
          {message}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {gymThemes.map((theme) => {
          const active = selected === theme.id
          const isCurrent = themeId === theme.id
          return (
            <button
              key={theme.id}
              type="button"
              disabled={loading || busy}
              onClick={() => void onSelectTheme(theme.id)}
              className={`pressable rounded-2xl border p-4 text-left transition-colors ${
                active
                  ? 'border-brand bg-brand/10 ring-2 ring-brand/40'
                  : 'border-white/8 bg-surface-2 hover:bg-surface-3/80'
              } ${busy && !active ? 'opacity-60' : ''}`}
            >
              <div className="flex gap-2">
                <span
                  className="h-10 w-10 shrink-0 rounded-xl shadow-inner"
                  style={{ background: theme.brand }}
                />
                <span
                  className="h-10 w-10 shrink-0 rounded-xl opacity-80"
                  style={{ background: theme.brandLight }}
                />
                <span
                  className="h-10 flex-1 rounded-xl opacity-50"
                  style={{
                    background: `linear-gradient(135deg, ${theme.glow1}, transparent)`,
                  }}
                />
              </div>
              <p className="mt-3 font-semibold">{theme.name}</p>
              <p className="mt-1 text-xs leading-relaxed text-neutral-400">{theme.description}</p>
              {isCurrent && (
                <p className="mt-2 text-xs font-bold text-brand">Tema ativo</p>
              )}
              {active && busy && !isCurrent && (
                <p className="mt-2 text-xs font-bold text-brand">Aplicando…</p>
              )}
            </button>
          )
        })}
      </div>

      <div className="rounded-2xl border border-white/8 bg-surface-2 p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Prévia</p>
        <div
          className="mt-3 overflow-hidden rounded-2xl p-4"
          style={{
            background: `radial-gradient(ellipse at top, ${gymThemes.find((t) => t.id === selected)?.glow1}, transparent 70%), ${mode === 'light' ? '#f4f4f5' : '#090909'}`,
          }}
        >
          <div
            className="rounded-2xl px-4 py-3 font-bold text-white"
            style={{
              background: `linear-gradient(135deg, ${gymThemes.find((t) => t.id === selected)?.heroFrom}, ${gymThemes.find((t) => t.id === selected)?.heroTo})`,
            }}
          >
            Check-in · Treino de hoje
          </div>
          <button
            type="button"
            className="mt-3 w-full rounded-xl py-2.5 text-sm font-bold text-white"
            style={{ background: gymThemes.find((t) => t.id === selected)?.brand }}
          >
            Botão principal
          </button>
        </div>
      </div>
    </div>
  )
}
