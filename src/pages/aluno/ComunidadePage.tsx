import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { HeartIcon, MessageIcon } from '../../components/icons'
import { useAuth } from '../../contexts/AuthContext'
import {
  addComment,
  createPost,
  deletePost,
  getJoinedChallengeIds,
  getLikedPostIds,
  joinChallenge,
  listChallenges,
  listComments,
  listPosts,
  togglePostLike,
} from '../../services/api'
import { daysLeft, formatRelativeTime } from '../../lib/dates'
import type { Challenge, Post, PostComment } from '../../types'

export function ComunidadePage() {
  const { profile } = useAuth()
  const [posts, setPosts] = useState<Post[]>([])
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set())
  const [joined, setJoined] = useState<Set<string>>(new Set())
  const [draft, setDraft] = useState('')
  const [posting, setPosting] = useState(false)
  const [error, setError] = useState('')
  const [openComments, setOpenComments] = useState<string | null>(null)
  const [comments, setComments] = useState<PostComment[]>([])
  const [commentDraft, setCommentDraft] = useState('')
  const [commenting, setCommenting] = useState(false)

  useEffect(() => {
    if (!profile?.gymId) return
    listPosts(profile.gymId).then(setPosts)
    listChallenges(profile.gymId).then(setChallenges)
    getLikedPostIds(profile.uid).then(setLikedPosts)
    getJoinedChallengeIds(profile.uid).then(setJoined)
  }, [profile])

  const members = useMemo(() => {
    const map = new Map<string, { name: string; avatar: string }>()
    if (profile) map.set(profile.uid, { name: profile.name, avatar: profile.avatarInitial })
    for (const p of posts) {
      if (!map.has(p.authorId)) map.set(p.authorId, { name: p.authorName, avatar: p.authorAvatar })
    }
    return [...map.values()].slice(0, 8)
  }, [posts, profile])

  async function toggleLike(id: string) {
    if (!profile) return
    const wasLiked = likedPosts.has(id)
    setLikedPosts((prev) => {
      const next = new Set(prev)
      if (wasLiked) next.delete(id)
      else next.add(id)
      return next
    })
    setPosts((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, likesCount: Math.max(0, p.likesCount + (wasLiked ? -1 : 1)) } : p,
      ),
    )
    try {
      await togglePostLike(profile.uid, id)
    } catch {
      setLikedPosts((prev) => {
        const next = new Set(prev)
        if (wasLiked) next.add(id)
        else next.delete(id)
        return next
      })
      setPosts((prev) =>
        prev.map((p) =>
          p.id === id ? { ...p, likesCount: Math.max(0, p.likesCount + (wasLiked ? 1 : -1)) } : p,
        ),
      )
    }
  }

  async function onCreatePost(e: FormEvent) {
    e.preventDefault()
    if (!profile || !draft.trim()) return
    setPosting(true)
    setError('')
    try {
      const post = await createPost(profile, draft.trim())
      setPosts((prev) => [post, ...prev])
      setDraft('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível publicar')
    } finally {
      setPosting(false)
    }
  }

  async function onJoin(id: string) {
    if (!profile) return
    if (joined.has(id)) {
      setError('Você já participa deste desafio')
      return
    }
    setChallenges((prev) =>
      prev.map((c) => (c.id === id ? { ...c, participants: c.participants + 1 } : c)),
    )
    setJoined((prev) => new Set(prev).add(id))
    try {
      await joinChallenge(id, profile.uid)
    } catch (err) {
      setJoined((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
      setChallenges((prev) =>
        prev.map((c) =>
          c.id === id ? { ...c, participants: Math.max(0, c.participants - 1) } : c,
        ),
      )
      setError(err instanceof Error ? err.message : 'Não foi possível participar')
    }
  }

  async function openPostComments(postId: string) {
    if (openComments === postId) {
      setOpenComments(null)
      return
    }
    setOpenComments(postId)
    setCommentDraft('')
    const list = await listComments(postId)
    setComments(list)
  }

  async function submitComment(e: FormEvent) {
    e.preventDefault()
    if (!profile || !openComments || !commentDraft.trim()) return
    setCommenting(true)
    try {
      const c = await addComment(profile, openComments, commentDraft.trim())
      setComments((prev) => [...prev, c])
      setPosts((prev) =>
        prev.map((p) =>
          p.id === openComments ? { ...p, commentsCount: p.commentsCount + 1 } : p,
        ),
      )
      setCommentDraft('')
    } finally {
      setCommenting(false)
    }
  }

  async function removeOwnPost(post: Post) {
    if (!profile || post.authorId !== profile.uid) return
    await deletePost(post.id)
    setPosts((prev) => prev.filter((p) => p.id !== post.id))
  }

  return (
    <div className="flex flex-col gap-5 px-4 pb-6">
      <header className="pt-3">
        <h1 className="text-3xl font-bold tracking-tight">Comunidade</h1>
        <p className="mt-1 text-sm text-neutral-400">Poste, curta, comente e entre em desafios</p>
      </header>

      {error && (
        <p className="rounded-xl bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{error}</p>
      )}

      <section>
        <div className="scroll-area -mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
          {members.map((m) => (
            <div key={m.name + m.avatar} className="flex shrink-0 flex-col items-center gap-1.5">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-brand to-brand-dark text-lg font-bold text-white">
                {m.avatar}
              </div>
              <span className="max-w-16 truncate text-[10px] text-neutral-400">
                {m.name.split(' ')[0]}
              </span>
            </div>
          ))}
          {members.length === 0 && (
            <p className="text-sm text-neutral-500">Publique para aparecer aqui</p>
          )}
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
          Desafios ativos
        </h3>
        <div className="scroll-area -mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
          {challenges.map((challenge) => {
            const already = joined.has(challenge.id)
            return (
              <div
                key={challenge.id}
                className="w-52 shrink-0 rounded-xl border border-border bg-surface-2 p-4"
              >
                <span className="text-2xl">{challenge.emoji}</span>
                <p className="mt-2 font-semibold">{challenge.title}</p>
                <p className="mt-1 text-xs text-neutral-400">
                  {challenge.participants} participantes · {daysLeft(challenge.endsAt)} dias
                </p>
                <button
                  onClick={() => void onJoin(challenge.id)}
                  disabled={already}
                  className={`mt-3 w-full rounded-lg py-2 text-xs font-bold ${
                    already
                      ? 'bg-emerald-500/15 text-emerald-300'
                      : 'bg-brand/10 text-brand'
                  }`}
                >
                  {already ? 'Participando' : 'Participar'}
                </button>
              </div>
            )
          })}
        </div>
      </section>

      <section>
        <form onSubmit={onCreatePost} className="mb-4 rounded-xl bg-surface-2 p-3">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Compartilhe seu treino, PR ou dica…"
            rows={2}
            className="w-full resize-none bg-transparent text-sm outline-none placeholder:text-neutral-500"
          />
          <div className="mt-2 flex justify-end">
            <button
              type="submit"
              disabled={posting || !draft.trim()}
              className="rounded-lg bg-brand px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
            >
              {posting ? 'Publicando…' : 'Publicar'}
            </button>
          </div>
        </form>

        <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
          Feed
        </h3>
        <div className="flex flex-col gap-4">
          {posts.length === 0 && (
            <p className="rounded-xl bg-surface-2 p-4 text-sm text-neutral-400">
              Ainda não há posts. Seja o primeiro a publicar!
            </p>
          )}
          {posts.map((post) => {
            const liked = likedPosts.has(post.id)
            const isMine = profile?.uid === post.authorId
            return (
              <div key={post.id} className="flex flex-col gap-4">
                <article className="overflow-hidden rounded-xl bg-surface-2">
                  <div className="flex items-center gap-3 p-4 pb-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand/20 text-sm font-bold text-brand">
                      {post.authorAvatar}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">{post.authorName}</p>
                      <p className="text-xs text-neutral-500">
                        {formatRelativeTime(post.createdAt)} atrás
                      </p>
                    </div>
                    {isMine && (
                      <button
                        onClick={() => void removeOwnPost(post)}
                        className="text-xs font-semibold text-rose-300"
                      >
                        Apagar
                      </button>
                    )}
                  </div>
                  <p className="px-4 pb-3 text-sm leading-relaxed">{post.content}</p>
                  <div className="flex items-center gap-4 border-t border-border px-4 py-3">
                    <button
                      onClick={() => void toggleLike(post.id)}
                      className={`flex items-center gap-1.5 text-sm ${
                        liked ? 'text-rose-500' : 'text-neutral-400'
                      }`}
                    >
                      <HeartIcon className="h-5 w-5" filled={liked} />
                      {post.likesCount}
                    </button>
                    <button
                      onClick={() => void openPostComments(post.id)}
                      className="flex items-center gap-1.5 text-sm text-neutral-400"
                    >
                      <MessageIcon className="h-5 w-5" />
                      {post.commentsCount}
                    </button>
                  </div>

                  {openComments === post.id && (
                    <div className="subtle-fill border-t border-border px-4 py-3">
                      <div className="mb-3 flex max-h-40 flex-col gap-2 overflow-y-auto">
                        {comments.length === 0 && (
                          <p className="text-xs text-neutral-500">Nenhum comentário ainda</p>
                        )}
                        {comments.map((c) => (
                          <div key={c.id} className="rounded-lg bg-surface-3 px-3 py-2">
                            <p className="text-xs font-semibold text-brand">{c.authorName}</p>
                            <p className="text-sm text-neutral-200">{c.content}</p>
                          </div>
                        ))}
                      </div>
                      <form onSubmit={submitComment} className="flex gap-2">
                        <input
                          value={commentDraft}
                          onChange={(e) => setCommentDraft(e.target.value)}
                          placeholder="Escreva um comentário…"
                          className="flex-1 rounded-lg border border-border bg-surface-3 px-3 py-2 text-sm outline-none focus:border-brand"
                        />
                        <button
                          type="submit"
                          disabled={commenting || !commentDraft.trim()}
                          className="rounded-lg bg-brand px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                        >
                          Enviar
                        </button>
                      </form>
                    </div>
                  )}
                </article>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
