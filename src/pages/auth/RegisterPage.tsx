import { useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth, isFirebaseConfigured } from '../../lib/firebase'
import { getInvite, redeemInviteRemote } from '../../services/api'
import type { Invite } from '../../types'

export function RegisterPage() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const navigate = useNavigate()

  const [invite, setInvite] = useState<Invite | null>(null)
  const [loadingInvite, setLoadingInvite] = useState(true)
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!token || !isFirebaseConfigured) {
      setLoadingInvite(false)
      return
    }
    getInvite(token)
      .then((i) => {
        setInvite(i)
        if (i) setName(i.name)
      })
      .catch(() => setInvite(null))
      .finally(() => setLoadingInvite(false))
  }, [token])

  if (!token) {
    return <Navigate to="/login" replace />
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (password.length < 6) {
      setError('Senha deve ter pelo menos 6 caracteres')
      return
    }
    if (password !== confirm) {
      setError('As senhas não coincidem')
      return
    }
    setSubmitting(true)
    try {
      await redeemInviteRemote({ token, password, name: name.trim() })
      if (!auth || !invite) throw new Error('Erro ao autenticar')
      await signInWithEmailAndPassword(auth, invite.email, password)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao concluir cadastro')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto flex h-full max-w-[430px] flex-col justify-center px-6 py-10">
      <div className="glass-panel rounded-3xl p-6">
        <h1 className="font-display text-2xl font-bold">Criar conta</h1>
        <p className="mt-2 text-sm text-neutral-400">Complete seu cadastro com o convite da academia.</p>

        {loadingInvite && <p className="mt-6 text-sm text-neutral-400">Validando convite…</p>}

        {!loadingInvite && !invite && (
          <div className="mt-6">
            <p className="rounded-xl bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
              Convite inválido ou expirado. Peça um novo link à academia.
            </p>
            <Link to="/login" className="mt-4 inline-block text-sm font-semibold text-brand">
              Voltar ao login
            </Link>
          </div>
        )}

        {invite && (
          <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-3">
            <div className="rounded-xl bg-surface-3 px-3 py-2 text-sm text-neutral-300">
              <p className="text-xs text-neutral-500">E-mail</p>
              <p className="font-medium">{invite.email}</p>
            </div>

            <label className="text-xs font-medium uppercase tracking-[0.14em] text-neutral-500">
              Nome
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="field-sexy"
                placeholder="Seu nome"
              />
            </label>

            <label className="text-xs font-medium uppercase tracking-[0.14em] text-neutral-500">
              Senha
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="field-sexy"
                placeholder="Mínimo 6 caracteres"
              />
            </label>

            <label className="text-xs font-medium uppercase tracking-[0.14em] text-neutral-500">
              Confirmar senha
              <input
                type="password"
                required
                minLength={6}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="field-sexy"
              />
            </label>

            {error && (
              <p className="rounded-xl bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{error}</p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="pressable mt-1 rounded-2xl bg-brand py-3.5 font-bold text-white disabled:opacity-60"
            >
              {submitting ? 'Criando conta…' : 'Começar a treinar'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
