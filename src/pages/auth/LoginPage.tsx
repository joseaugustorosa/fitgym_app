import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

type Mode = 'login' | 'register'

export function LoginPage() {
  const { login, register, profile, loading, configured, isDemo } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState<Mode>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [unit, setUnit] = useState('Unidade Centro')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (!loading && profile && (isDemo || configured)) {
    return <Navigate to={profile.role === 'admin' ? '/admin' : '/'} replace />
  }

  function fillQuick(kind: 'admin' | 'aluno') {
    setMode('login')
    setError('')
    if (kind === 'admin') {
      setEmail('admin@fitgym.app')
      setPassword('fitgym123')
    } else {
      setEmail('aluno@fitgym.app')
      setPassword('fitgym123')
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      if (mode === 'register') {
        if (name.trim().length < 2) throw new Error('Informe seu nome')
        const p = await register({ name, email, password, unit })
        navigate(p.role === 'admin' ? '/admin' : '/')
        return
      }
      const p = await login(email.trim(), password)
      navigate(p.role === 'admin' ? '/admin' : '/')
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
          maskImage: 'linear-gradient(180deg, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.25) 45%, transparent 78%)',
          WebkitMaskImage:
            'linear-gradient(180deg, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.25) 45%, transparent 78%)',
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/20 via-surface/40 to-surface" />

      <div className="relative anim-rise mb-8">
        <div className="brand-mark mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand font-display text-2xl font-extrabold tracking-tight text-white">
          FG
        </div>
        <h1 className="font-display text-4xl font-bold leading-tight tracking-tight">
          FitGym
        </h1>
        <p className="mt-3 max-w-[16rem] text-sm leading-relaxed text-neutral-300">
          {mode === 'login'
            ? 'Treino, dieta e comunidade. Um app feito pro seu ritmo.'
            : 'Crie sua conta e comece a treinar hoje.'}
        </p>
      </div>

      <div className="relative anim-rise anim-rise-delay-1 glass-panel rounded-3xl p-5">
        <div className="mb-4 grid grid-cols-2 gap-1 rounded-2xl bg-black/30 p-1">
          <button
            type="button"
            onClick={() => {
              setMode('login')
              setError('')
            }}
            className={`rounded-xl py-2.5 text-sm font-semibold transition-colors ${
              mode === 'login' ? 'bg-brand text-white' : 'text-neutral-400'
            }`}
          >
            Entrar
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register')
              setError('')
              setEmail('')
              setPassword('')
            }}
            className={`rounded-xl py-2.5 text-sm font-semibold transition-colors ${
              mode === 'register' ? 'bg-brand text-white' : 'text-neutral-400'
            }`}
          >
            Criar conta
          </button>
        </div>

        {mode === 'login' && (
          <div className="mb-4 flex gap-2">
            <button
              type="button"
              onClick={() => fillQuick('admin')}
              className="pressable flex-1 rounded-xl border border-white/8 bg-white/3 py-2.5 text-xs font-semibold text-neutral-300"
            >
              Admin
            </button>
            <button
              type="button"
              onClick={() => fillQuick('aluno')}
              className="pressable flex-1 rounded-xl border border-white/8 bg-white/3 py-2.5 text-xs font-semibold text-neutral-300"
            >
              Aluno
            </button>
          </div>
        )}

        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          {mode === 'register' && (
            <>
              <label className="text-xs font-medium uppercase tracking-[0.14em] text-neutral-500">
                Nome
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="field-sexy"
                  placeholder="Seu nome"
                  autoComplete="name"
                />
              </label>
              <label className="text-xs font-medium uppercase tracking-[0.14em] text-neutral-500">
                Unidade
                <select value={unit} onChange={(e) => setUnit(e.target.value)} className="field-sexy">
                  <option>Unidade Centro</option>
                  <option>Unidade Norte</option>
                  <option>Unidade Sul</option>
                </select>
              </label>
            </>
          )}

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
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
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
            disabled={submitting}
            className="pressable mt-1 rounded-2xl bg-brand py-3.5 font-display text-base font-bold tracking-wide text-white disabled:opacity-60"
          >
            {submitting
              ? mode === 'login'
                ? 'Entrando…'
                : 'Criando…'
              : mode === 'login'
                ? 'Entrar'
                : 'Começar agora'}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-neutral-500">
          {mode === 'login' ? (
            <>
              Novo por aqui?{' '}
              <button type="button" className="font-semibold text-brand" onClick={() => setMode('register')}>
                Criar conta
              </button>
            </>
          ) : (
            <>
              Já treina com a gente?{' '}
              <button type="button" className="font-semibold text-brand" onClick={() => setMode('login')}>
                Entrar
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  )
}
