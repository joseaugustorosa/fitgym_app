import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ChevronRightIcon,
  DumbbellIcon,
  FlameIcon,
  SaladIcon,
} from '../../components/icons'
import { useAuth } from '../../contexts/AuthContext'
import { isGymStaff } from '../../lib/roles'
import {
  doCheckIn,
  getWaterLog,
  getWeekCheckIns,
  getWorkoutProgress,
  listChallenges,
  listGymTips,
  listMealScans,
  listWorkoutPlans,
  setWaterLiters,
} from '../../services/api'
import { formatCheckInLabel, greetingForNow, todayKey } from '../../lib/dates'
import { resolveNutritionGoals } from '../../lib/nutrition'
import { normalizeWorkoutPlan, planDisplayName, planSessionsLine } from '../../lib/workoutPlan'
import type { TabId } from '../../types'

const weekDays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

interface SessaoPageProps {
  onNavigate: (tab: TabId) => void
}

function WeekRing({ done, total }: { done: number; total: number }) {
  const pct = Math.min(1, done / Math.max(total, 1))
  const r = 42
  const c = 2 * Math.PI * r
  const offset = c * (1 - pct)
  return (
    <svg className="h-28 w-28 -rotate-90" viewBox="0 0 100 100" aria-hidden>
      <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="8" />
      <circle
        cx="50"
        cy="50"
        r={r}
        fill="none"
        stroke="white"
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={offset}
        className="home-ring-progress"
      />
    </svg>
  )
}

export function SessaoPage({ onNavigate }: SessaoPageProps) {
  const { profile, setProfile, logout } = useAuth()
  const [weekProgress, setWeekProgress] = useState<boolean[]>(Array(7).fill(false))
  const [checkingIn, setCheckingIn] = useState(false)
  const [celebrating, setCelebrating] = useState(false)
  const [message, setMessage] = useState('')
  const [challengeTitle, setChallengeTitle] = useState('Desafio da semana')
  const [challengeSubtitle, setChallengeSubtitle] = useState('Comunidade FitGym')
  const [waterLiters, setWater] = useState(0)
  const [waterGoal, setWaterGoal] = useState(3)
  const [savingWater, setSavingWater] = useState(false)
  const [workoutPct, setWorkoutPct] = useState(0)
  const [workoutLabel, setWorkoutLabel] = useState('Treino de hoje')
  const [workoutSubtitle, setWorkoutSubtitle] = useState('')
  const [caloriesToday, setCaloriesToday] = useState(0)
  const [calorieGoal, setCalorieGoal] = useState(2000)
  const [tips, setTips] = useState<string[]>([])
  const [tipIndex, setTipIndex] = useState(0)
  const [pulseDay, setPulseDay] = useState<number | null>(null)

  useEffect(() => {
    if (!profile) return
    let cancelled = false

    async function load() {
      if (!profile!.gymId) return
      const [week, water, plans, scans, gymTips] = await Promise.all([
        getWeekCheckIns(profile!.uid),
        getWaterLog(profile!),
        listWorkoutPlans(profile!.gymId),
        listMealScans(profile!.uid),
        listGymTips(profile!.gymId),
      ])
      if (cancelled) return

      setWeekProgress(week)
      setWater(water.liters)
      setWaterGoal(water.goalLiters)
      const goals = resolveNutritionGoals(profile!)
      setCalorieGoal(goals.calorieGoal)
      setCaloriesToday(scans.reduce((sum, s) => sum + s.calories, 0))
      setTips(gymTips.map((t) => t.text))

      const plan = profile!.assignedWorkoutPlanId
        ? plans.find((p) => p.id === profile!.assignedWorkoutPlanId) ?? null
        : null
      if (plan) {
        const normalized = normalizeWorkoutPlan(plan)
        setWorkoutLabel(planDisplayName(normalized))
        const dayCount = normalized.sessions.length
        const dayNames = planSessionsLine(normalized)
        const totalExercises = normalized.sessions.reduce((n, s) => n + s.exerciseIds.length, 0)
        setWorkoutSubtitle(
          dayCount > 0
            ? `${dayCount} dia${dayCount !== 1 ? 's' : ''}: ${dayNames} · ${totalExercises} exercícios`
            : 'Sem dias configurados',
        )
        let done = 0
        let total = 0
        for (const session of normalized.sessions) {
          const progress = await getWorkoutProgress(profile!.uid, session.id)
          done += progress?.completedExerciseIds.length ?? 0
          total += session.exerciseIds.length
        }
        if (cancelled) return
        setWorkoutPct(total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0)
      } else {
        setWorkoutLabel('Treino')
        setWorkoutSubtitle('')
        setWorkoutPct(0)
      }

      try {
        const list = await listChallenges(profile!.gymId)
        if (list[0] && !cancelled) {
          setChallengeTitle(list[0].title)
          setChallengeSubtitle(`${list[0].participants} pessoas · toque para entrar`)
        }
      } catch {
        /* ignore */
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [profile])

  const todayIndex = new Date().getDay()
  const checkInsThisWeek = weekProgress.filter(Boolean).length
  const checkedInToday = useMemo(() => {
    if (!profile?.lastCheckInAt) return weekProgress[todayIndex]
    return (
      weekProgress[todayIndex] ||
      new Date(profile.lastCheckInAt).toDateString() === new Date().toDateString()
    )
  }, [profile, weekProgress, todayIndex])

  if (!profile) return null

  async function handleCheckIn() {
    if (checkedInToday || checkingIn) return
    setMessage('')
    setCheckingIn(true)
    try {
      const updated = await doCheckIn(profile!)
      setProfile(updated)
      const week = await getWeekCheckIns(profile!.uid)
      setWeekProgress(week)
      setPulseDay(todayIndex)
      setCelebrating(true)
      setMessage('Check-in feito! Bom treino.')
      window.setTimeout(() => setCelebrating(false), 2200)
      window.setTimeout(() => setPulseDay(null), 900)
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Erro no check-in')
    } finally {
      setCheckingIn(false)
    }
  }

  async function bumpWater(delta: number) {
    if (!profile || savingWater) return
    const next = Math.max(0, Math.round((waterLiters + delta) * 100) / 100)
    setSavingWater(true)
    try {
      const log = await setWaterLiters(profile, next, todayKey(), waterGoal)
      setWater(log.liters)
      setWaterGoal(log.goalLiters)
    } finally {
      setSavingWater(false)
    }
  }

  const waterPct = Math.min(100, Math.round((waterLiters / Math.max(waterGoal, 0.1)) * 100))
  const mealsPct =
    calorieGoal === 0 ? 0 : Math.min(100, Math.round((caloriesToday / calorieGoal) * 100))

  return (
    <div className="flex flex-col gap-5 px-4 pb-6">
      <header className="anim-rise flex items-center justify-between pt-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
            {greetingForNow().replace(',', '')} · {todayKey().slice(5).replace('-', '/')}
          </p>
          <h1 className="font-display mt-1 text-3xl font-extrabold tracking-tight">
            {profile.name.split(' ')[0]}
          </h1>
          {profile.unit?.trim() && (
            <p className="mt-0.5 text-sm text-neutral-400">{profile.unit.trim()}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isGymStaff(profile.role) && (
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

      <section
        className={`hero-checkin anim-rise anim-rise-delay-1 relative overflow-hidden rounded-3xl p-5 ${
          celebrating ? 'home-celebrate' : ''
        }`}
      >
        {celebrating && (
          <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden" aria-hidden>
            {Array.from({ length: 14 }).map((_, i) => (
              <span key={i} className={`home-burst home-burst-${(i % 7) + 1}`} />
            ))}
          </div>
        )}
        <div className="relative z-10 flex items-center gap-4">
          <div className="relative shrink-0">
            <WeekRing done={checkInsThisWeek} total={7} />
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
              <span className="font-display text-2xl font-extrabold leading-none">
                {checkInsThisWeek}
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-white/70">
                / 7 dias
              </span>
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/75">
              Check-in da semana
            </p>
            <h2 className="font-display mt-1 text-xl font-extrabold leading-tight text-white">
              {checkedInToday ? 'Você já chegou!' : 'Pronto para treinar?'}
            </h2>
            <p className="mt-1 text-sm text-white/75">
              {checkedInToday
                ? `Check-in ${formatCheckInLabel(profile.lastCheckInAt)}`
                : `Último: ${formatCheckInLabel(profile.lastCheckInAt)}`}
            </p>
            <button
              onClick={() => void handleCheckIn()}
              disabled={checkingIn || checkedInToday}
              className={`pressable mt-3 w-full rounded-2xl py-3 text-sm font-bold disabled:opacity-90 ${
                checkedInToday
                  ? 'bg-white/20 text-white'
                  : 'bg-white text-brand-dark home-cta-pulse'
              }`}
            >
              {checkingIn
                ? 'Registrando…'
                : checkedInToday
                  ? '✓ Check-in feito'
                  : 'Fazer check-in agora'}
            </button>
          </div>
        </div>
        {message && (
          <p className="relative z-10 mt-3 text-center text-xs font-medium text-white/95">
            {message}
          </p>
        )}
      </section>

      <section className="anim-rise anim-rise-delay-2 glass-panel rounded-3xl p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FlameIcon
              className={`h-5 w-5 text-brand ${checkedInToday || celebrating ? 'home-flame' : ''}`}
            />
            <span className="font-semibold">Sequência</span>
          </div>
          <span className="font-display text-2xl font-extrabold text-brand">
            {profile.streakDays}
            <span className="ml-1 text-sm font-semibold text-neutral-400">dias</span>
          </span>
        </div>
        <div className="mt-4 flex justify-between gap-1">
          {weekDays.map((day, i) => {
            const done = weekProgress[i]
            const isToday = i === todayIndex
            return (
              <button
                key={i}
                type="button"
                disabled={!isToday || done || checkingIn}
                onClick={() => void handleCheckIn()}
                className={`flex h-10 w-10 flex-col items-center justify-center rounded-xl text-xs font-semibold transition-transform duration-200 ${
                  done
                    ? 'bg-brand text-white'
                    : isToday
                      ? 'border border-brand/60 bg-brand/10 text-brand'
                      : 'bg-surface-3 text-neutral-500'
                } ${pulseDay === i ? 'home-day-pop' : ''} ${
                  isToday && !done ? 'pressable' : ''
                }`}
                aria-label={
                  isToday
                    ? done
                      ? 'Check-in de hoje feito'
                      : 'Fazer check-in de hoje'
                    : `Dia ${day}`
                }
              >
                {done ? '✓' : day}
              </button>
            )
          })}
        </div>
        <p className="mt-3 text-center text-[11px] text-neutral-500">
          Toque no dia de hoje para registrar presença
        </p>
      </section>

      <section className="anim-rise anim-rise-delay-3">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
          Seu dia
        </h3>
        <div className="grid grid-cols-1 gap-3">
          <div className="glass-panel rounded-2xl p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-neutral-500">Água</p>
                <p className="font-display mt-0.5 text-xl font-bold">
                  {waterLiters.toFixed(1).replace('.0', '')}
                  <span className="text-sm font-normal text-neutral-500">
                    {' '}
                    / {waterGoal}L
                  </span>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={savingWater || waterLiters <= 0}
                  onClick={() => void bumpWater(-0.25)}
                  className="pressable flex h-10 w-10 items-center justify-center rounded-xl bg-surface-3 text-lg font-bold text-neutral-300 disabled:opacity-40"
                  aria-label="Remover 250ml"
                >
                  −
                </button>
                <button
                  type="button"
                  disabled={savingWater}
                  onClick={() => void bumpWater(0.25)}
                  className="pressable flex h-10 min-w-[4.5rem] items-center justify-center rounded-xl bg-brand px-3 text-sm font-bold text-white disabled:opacity-60"
                >
                  +250ml
                </button>
              </div>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-3">
              <div
                className="h-full rounded-full progress-live transition-[width] duration-400"
                style={{ width: `${waterPct}%` }}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('treino')}
            className="pressable glass-panel rounded-2xl p-4 text-left"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand/15 text-brand">
                <DumbbellIcon className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{workoutLabel}</p>
                {workoutSubtitle ? (
                  <p className="truncate text-xs text-neutral-500">{workoutSubtitle}</p>
                ) : null}
                <p className="text-sm text-neutral-400">
                  {workoutPct === 0
                    ? 'Ainda não começou — toque para treinar'
                    : workoutPct >= 100
                      ? 'Programa concluído hoje'
                      : `${workoutPct}% do programa · continuar`}
                </p>
              </div>
              <ChevronRightIcon className="h-5 w-5 shrink-0 text-neutral-500" />
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-3">
              <div
                className="h-full rounded-full bg-brand transition-[width] duration-500"
                style={{ width: `${workoutPct}%` }}
              />
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('dieta')}
            className="pressable glass-panel flex items-center gap-3 rounded-2xl p-4 text-left"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand/15 text-brand">
              <SaladIcon className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">Alimentação</p>
              <p className="text-sm text-neutral-400">
                {caloriesToday === 0
                  ? 'Registrar o que você comeu'
                  : `${caloriesToday}/${calorieGoal} kcal · ${mealsPct}% da meta`}
              </p>
            </div>
            <div className="relative h-10 w-10 shrink-0">
              <svg className="-rotate-90" viewBox="0 0 36 36">
                <circle
                  cx="18"
                  cy="18"
                  r="14"
                  fill="none"
                  stroke="rgba(255,255,255,0.08)"
                  strokeWidth="3"
                />
                <circle
                  cx="18"
                  cy="18"
                  r="14"
                  fill="none"
                  stroke="var(--color-brand)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={`${mealsPct * 0.88} 88`}
                />
              </svg>
            </div>
          </button>
        </div>
      </section>

      {tips.length > 0 && (
      <button
        type="button"
        onClick={() => setTipIndex((i) => (i + 1) % tips.length)}
        className="pressable anim-rise surface-card rounded-2xl p-4 text-left"
      >
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-brand">
          Dica rápida · toque para outra
        </p>
        <p className="mt-2 text-sm leading-relaxed text-neutral-200">{tips[tipIndex]}</p>
      </button>
      )}

      <section>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
          Comunidade
        </h3>
        <button
          type="button"
          onClick={() => onNavigate('comunidade')}
          className="pressable glass-panel flex w-full items-center gap-3 rounded-2xl p-4 text-left"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand/15 font-display text-xs font-bold text-brand">
            DS
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{challengeTitle}</p>
            <p className="truncate text-sm text-neutral-400">{challengeSubtitle}</p>
          </div>
          <ChevronRightIcon className="h-5 w-5 shrink-0 text-neutral-500" />
        </button>
      </section>
    </div>
  )
}
