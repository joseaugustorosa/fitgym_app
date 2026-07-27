export function todayKey(date = new Date()): string {
  return date.toISOString().slice(0, 10)
}

export function startOfWeek(date = new Date()): Date {
  const d = new Date(date)
  const day = d.getDay()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - day)
  return d
}

export function greetingForNow(date = new Date()): string {
  const h = date.getHours()
  if (h < 12) return 'Bom dia,'
  if (h < 18) return 'Boa tarde,'
  return 'Boa noite,'
}

export function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'agora'
  if (mins < 60) return `${mins}min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  return `${days}d`
}

export function formatCheckInLabel(iso: string | null): string {
  if (!iso) return 'Nenhum check-in ainda'
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)
  const time = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  if (d.toDateString() === today.toDateString()) return `hoje às ${time}`
  if (d.toDateString() === yesterday.toDateString()) return `ontem às ${time}`
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function daysLeft(endsAt: string): number {
  const ms = new Date(endsAt).getTime() - Date.now()
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)))
}

export function initialFromName(name: string): string {
  return (name.trim()[0] || '?').toUpperCase()
}
