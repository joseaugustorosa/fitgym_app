import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FlameIcon, ChevronRightIcon } from '../../components/icons'
import { useAuth } from '../../contexts/AuthContext'
import { doCheckIn, getWeekCheckIns, listChallenges } from '../../services/api'
import { formatCheckInLabel, greetingForNow } from '../../lib/dates'
import type { TabId } from '../../types'

const weekDays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

interface SessaoPageProps {
  onNavigate: (tab: TabId) => void
}

export function SessaoPage({ onNavigate }: SessaoPageProps) {
  const { profile, setProfile, logout } = useAuth()
  const [weekProgress, setWeekProgress] = useState<boolean[]>(Array(7).fill(false))
  const [checkingIn, setCheckingIn] = useState(false)
  const [message, setMessage] = useState('')
  const [challengeSubtitle, setChallengeSubtitle] = useState('Desafios da comunidade')

  useEffect(() => {
    if (!profile) return
    getWeekCheckIns(profile.uid).then(setWeekProgress).catch(() => undefined)
    listChallenges()
      .then((list) => {
        if (list[0]) setChallengeSubtitle(`${list[0].participants} pessoas participando`)
      })
      .catch(() => undefined)
  }, [profile])

  if (!profile) return null

  const todayIndex = new Date().getDay()
  const checkInsThisWeek = weekProgress.filter(Boolean).length

  async function handleCheckIn() {
    setMessage('')
    setCheckingIn(true)
    try {
      const updated = await doCheckIn(profile!)
      setProfile(updated)
      const week = await getWeekCheckIns(profile!.uid)
      setWeekProgress(week)
      setMessage('Check-in registrado!')
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Erro no check-in')
    } finally {
      setCheckingIn(false)
    }
  }

  return (
    <div className="flex flex-col gap-5 px-4 pb-6">
      <header className="anim-rise flex items-center justify-between pt-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
            {greetingForNow().replace(',', '')}
          </p>
          <h1 className="font-display mt-1 text-3xl font-extrabold tracking-tight">
            {profile.name.split(' ')[0]}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {profile.role === 'admin' && (
            <Link
              to="/admin"
              className="rounded-xl border border-brand/30 bg-brand/10 px-3 py-1.5 text-xs font-semibold text-brand"
            >
              Admin
            </Link>
          )}
          <button
            onClick={() => logout()}
            className="pressable flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-brand to-brand-dark font-display text-lg font-bold text-white"
            title="Sair"
          >
            {profile.avatarInitial}
          </button>
        </div>
      </header>

      <section className="hero-checkin anim-rise anim-rise-delay-1 rounded-3xl p-5">
        <div className="relative z-10">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/75">
            {profile.unit}
          </p>
          <h2 className="font-display mt-2 text-2xl font-extrabold leading-tight text-white">
            Pronto para
            <br />
            treinar?
          </h2>
          <p className="mt-2 text-sm text-white/75">
            Último check-in: {formatCheckInLabel(profile.lastCheckInAt)}
          </p>
          <button
            onClick={handleCheckIn}
            disabled={checkingIn}
            className="pressable mt-5 w-full rounded-2xl bg-white py-3.5 text-sm font-bold text-brand-dark disabled:opacity-70"
          >
            {checkingIn ? 'Registrando…' : 'Fazer check-in'}
          </button>
          {message && <p className="mt-2 text-center text-xs text-white/90">{message}</p>}
        </div>
      </section>

      <section className="anim-rise anim-rise-delay-2 glass-panel rounded-3xl p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FlameIcon className="h-5 w-5 text-brand" />
            <span className="font-semibold">Sequência</span>
          </div>
          <span className="font-display text-2xl font-extrabold text-brand">
            {profile.streakDays}
            <span className="ml-1 text-sm font-semibold text-neutral-400">dias</span>
          </span>
        </div>
        <div className="mt-4 flex justify-between gap-1">
          {weekDays.map((day, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-xl text-xs font-semibold ${
                  weekProgress[i]
                    ? 'bg-brand text-white'
                    : i === todayIndex
                      ? 'border border-brand/60 bg-brand/10 text-brand'
                      : 'bg-surface-3 text-neutral-500'
                }`}
              >
                {weekProgress[i] ? '✓' : day}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="anim-rise anim-rise-delay-3">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
          Resumo da semana
        </h3>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Check-ins', value: String(checkInsThisWeek), unit: '/7' },
            { label: 'Sequência', value: String(profile.streakDays), unit: 'd' },
            { label: 'Unidade', value: profile.unit.split(' ').slice(-1)[0], unit: '' },
          ].map((stat) => (
            <div key={stat.label} className="glass-panel rounded-2xl p-3 text-center">
              <p className="text-[10px] uppercase tracking-wider text-neutral-500">{stat.label}</p>
              <p className="font-display mt-1 text-xl font-bold">
                {stat.value}
                <span className="text-xs font-normal text-neutral-500">{stat.unit}</span>
              </p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
          Acesso rápido
        </h3>
        <div className="flex flex-col gap-2">
          {[
            { title: 'Treino de hoje', subtitle: 'Abrir treino ativo', mark: 'TR', tab: 'treino' as TabId },
            { title: 'Plano alimentar', subtitle: 'Ver dieta do dia', mark: 'DT', tab: 'dieta' as TabId },
            {
              title: 'Desafio da semana',
              subtitle: challengeSubtitle,
              mark: 'DS',
              tab: 'comunidade' as TabId,
            },
          ].map((item) => (
            <button
              key={item.title}
              onClick={() => onNavigate(item.tab)}
              className="pressable glass-panel flex items-center gap-3 rounded-2xl p-4 text-left"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand/15 font-display text-xs font-bold text-brand">
                {item.mark}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{item.title}</p>
                <p className="truncate text-sm text-neutral-400">{item.subtitle}</p>
              </div>
              <ChevronRightIcon className="h-5 w-5 shrink-0 text-neutral-500" />
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}
