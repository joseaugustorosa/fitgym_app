import { useEffect, useState, type FormEvent } from 'react'
import {
  deleteChallenge,
  deletePost,
  listChallenges,
  listPosts,
  saveChallenge,
} from '../../services/api'
import { daysLeft, formatRelativeTime } from '../../lib/dates'
import type { Challenge, Post } from '../../types'

const field =
  'w-full rounded-xl border border-border bg-surface-3 px-3 py-2 outline-none focus:border-brand'

const templates = [
  { title: '30 dias de treino', emoji: '🔥', days: 30, participants: 0 },
  { title: 'Desafio 10k passos', emoji: '👟', days: 14, participants: 0 },
  { title: 'Semana sem falta', emoji: '🏆', days: 7, participants: 0 },
]

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
}

export function AdminComunidadePage() {
  const [posts, setPosts] = useState<Post[]>([])
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [form, setForm] = useState({
    id: '',
    title: '',
    emoji: '🔥',
    participants: 0,
    days: 30,
  })
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  async function reload() {
    const [p, c] = await Promise.all([listPosts(50), listChallenges()])
    setPosts(p)
    setChallenges(c)
  }

  useEffect(() => {
    reload().catch(() => undefined)
  }, [])

  async function onSaveChallenge(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      const id = form.id || slugify(form.title)
      await saveChallenge({
        id,
        title: form.title,
        emoji: form.emoji,
        participants: form.participants,
        endsAt: new Date(Date.now() + form.days * 86400000).toISOString(),
      })
      setForm({ id: '', title: '', emoji: '🔥', participants: 0, days: 30 })
      setMessage('Desafio salvo')
      await reload()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-8">
      {message && (
        <p className="rounded-xl bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">{message}</p>
      )}

      <section>
        <h2 className="text-xl font-bold">Desafios</h2>
        <div className="mt-2 flex flex-wrap gap-2">
          {templates.map((t) => (
            <button
              key={t.title}
              type="button"
              onClick={() => setForm({ ...form, ...t, id: '' })}
              className="rounded-full bg-surface-2 px-3 py-1.5 text-xs font-medium text-neutral-300"
            >
              {t.emoji} {t.title}
            </button>
          ))}
        </div>
        <form onSubmit={onSaveChallenge} className="mt-3 grid gap-2 rounded-2xl bg-surface-2 p-4">
          <input
            required
            placeholder="Título"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className={field}
          />
          <div className="grid grid-cols-3 gap-2">
            <input
              placeholder="Emoji"
              value={form.emoji}
              onChange={(e) => setForm({ ...form, emoji: e.target.value })}
              className={field}
            />
            <input
              type="number"
              placeholder="Participantes"
              value={form.participants}
              onChange={(e) => setForm({ ...form, participants: Number(e.target.value) || 0 })}
              className={field}
            />
            <input
              type="number"
              placeholder="Dias"
              value={form.days}
              onChange={(e) => setForm({ ...form, days: Number(e.target.value) || 30 })}
              className={field}
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="rounded-xl bg-brand py-3 font-bold text-white disabled:opacity-60"
          >
            Salvar desafio
          </button>
        </form>

        <div className="mt-3 flex flex-col gap-2">
          {challenges.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between rounded-xl bg-surface-2 px-3 py-2"
            >
              <div>
                <p className="font-medium">
                  {c.emoji} {c.title}
                </p>
                <p className="text-xs text-neutral-400">
                  {c.participants} participantes · {daysLeft(c.endsAt)} dias
                </p>
              </div>
              <button
                onClick={async () => {
                  await deleteChallenge(c.id)
                  await reload()
                }}
                className="text-xs font-semibold text-rose-300"
              >
                Excluir
              </button>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-bold">Posts</h2>
        <div className="mt-3 flex flex-col gap-2">
          {posts.map((post) => (
            <div key={post.id} className="rounded-xl bg-surface-2 p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">{post.authorName}</p>
                  <p className="text-xs text-neutral-500">{formatRelativeTime(post.createdAt)}</p>
                  <p className="mt-2 text-sm text-neutral-300">{post.content}</p>
                </div>
                <button
                  onClick={async () => {
                    await deletePost(post.id)
                    await reload()
                  }}
                  className="text-xs font-semibold text-rose-300"
                >
                  Remover
                </button>
              </div>
            </div>
          ))}
          {posts.length === 0 && (
            <p className="text-sm text-neutral-400">Nenhum post no feed.</p>
          )}
        </div>
      </section>
    </div>
  )
}
