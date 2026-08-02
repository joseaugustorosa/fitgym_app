import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth, homeRoute } from '../../contexts/AuthContext'

export function LoginPage() {
  const { login, profile, loading, configured } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (!loading && profile && configured) {
    return <Navigate to={homeRoute(profile.role)} replace />
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const p = await login(email.trim(), password)
      navigate(homeRoute(p.role))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha na autenticação')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="relative mx-auto flex h-full max-w-[430px] flex-col justify-end overflow-hidden px-6 pb-10 pt-16">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            'url(https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=900&q=70)',
          backgroundSize: 'cover',
          backgroundPosition: 'center 30%',
          maskImage:
            'linear-gradient(180deg, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.25) 45%, transparent 78%)',
          WebkitMaskImage:
            'linear-gradient(180deg, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.25) 45%, transparent 78%)',
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/20 via-surface/40 to-surface" />

      <div className="relative anim-rise mb-8">
        <div className="brand-mark mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand font-display text-2xl font-extrabold tracking-tight text-white">
          FG
        </div>
        <h1 className="font-display text-4xl font-bold leading-tight tracking-tight">FitGym</h1>
        <p className="mt-3 max-w-[16rem] text-sm leading-relaxed text-neutral-300">
          Treino, dieta e comunidade. Acesse com o convite da sua academia.
        </p>
      </div>

      <div className="relative anim-rise anim-rise-delay-1 glass-panel rounded-3xl p-5">
        {!configured && (
          <p className="mb-4 rounded-xl bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
            Configure o Firebase no arquivo <code className="text-xs">.env</code> para usar o app.
          </p>
        )}

        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <label className="text-xs font-medium uppercase tracking-[0.14em] text-neutral-500">
            E-mail
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="field-sexy"
              placeholder="voce@email.com"
            />
          </label>
          <label className="text-xs font-medium uppercase tracking-[0.14em] text-neutral-500">
            Senha
            <input
              type="password"
              required
              minLength={6}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="field-sexy"
              placeholder="Mínimo 6 caracteres"
            />
          </label>

          {error && (
            <p className="rounded-xl bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting || !configured}
            className="pressable mt-1 rounded-2xl bg-brand py-3.5 font-display text-base font-bold tracking-wide text-white disabled:opacity-60"
          >
            {submitting ? 'Entrando…' : 'Entrar'}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-neutral-500">
          Recebeu um link da academia?{' '}
          <span className="text-neutral-400">Abra o link de convite para criar sua conta.</span>
        </p>
      </div>
    </div>
  )
}
