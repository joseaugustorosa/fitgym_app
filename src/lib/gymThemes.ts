export type GymThemeId = 'ember' | 'ocean' | 'forest' | 'violet' | 'crimson'

export interface GymThemePreset {
  id: GymThemeId
  name: string
  description: string
  brand: string
  brandLight: string
  brandDark: string
  glow1: string
  glow2: string
  glow3: string
  heroFrom: string
  heroMid: string
  heroTo: string
  shellRing: string
  progressMid: string
}

export const gymThemes: GymThemePreset[] = [
  {
    id: 'ember',
    name: 'Brasa',
    description: 'Laranja energético — identidade FitGym clássica',
    brand: '#ff5a00',
    brandLight: '#ff7a33',
    brandDark: '#d94800',
    glow1: 'rgba(255, 90, 0, 0.18)',
    glow2: 'rgba(255, 140, 60, 0.1)',
    glow3: 'rgba(255, 90, 0, 0.08)',
    heroFrom: '#ff6a12',
    heroMid: '#ff4d00',
    heroTo: '#c73a00',
    shellRing: 'rgba(255, 90, 0, 0.04)',
    progressMid: '#ff9a4d',
  },
  {
    id: 'ocean',
    name: 'Oceano',
    description: 'Azul claro — sensação de frescor e foco',
    brand: '#0ea5e9',
    brandLight: '#38bdf8',
    brandDark: '#0284c7',
    glow1: 'rgba(14, 165, 233, 0.2)',
    glow2: 'rgba(56, 189, 248, 0.12)',
    glow3: 'rgba(14, 165, 233, 0.08)',
    heroFrom: '#38bdf8',
    heroMid: '#0ea5e9',
    heroTo: '#0369a1',
    shellRing: 'rgba(14, 165, 233, 0.08)',
    progressMid: '#7dd3fc',
  },
  {
    id: 'forest',
    name: 'Floresta',
    description: 'Verde natural — equilíbrio e vitalidade',
    brand: '#16a34a',
    brandLight: '#4ade80',
    brandDark: '#15803d',
    glow1: 'rgba(22, 163, 74, 0.18)',
    glow2: 'rgba(74, 222, 128, 0.1)',
    glow3: 'rgba(22, 163, 74, 0.08)',
    heroFrom: '#22c55e',
    heroMid: '#16a34a',
    heroTo: '#166534',
    shellRing: 'rgba(22, 163, 74, 0.08)',
    progressMid: '#86efac',
  },
  {
    id: 'violet',
    name: 'Violeta',
    description: 'Roxo moderno — premium e diferenciado',
    brand: '#7c3aed',
    brandLight: '#a78bfa',
    brandDark: '#6d28d9',
    glow1: 'rgba(124, 58, 237, 0.2)',
    glow2: 'rgba(167, 139, 250, 0.12)',
    glow3: 'rgba(124, 58, 237, 0.08)',
    heroFrom: '#8b5cf6',
    heroMid: '#7c3aed',
    heroTo: '#5b21b6',
    shellRing: 'rgba(124, 58, 237, 0.08)',
    progressMid: '#c4b5fd',
  },
  {
    id: 'crimson',
    name: 'Rubro',
    description: 'Vermelho intenso — energia e impacto',
    brand: '#dc2626',
    brandLight: '#f87171',
    brandDark: '#b91c1c',
    glow1: 'rgba(220, 38, 38, 0.18)',
    glow2: 'rgba(248, 113, 113, 0.1)',
    glow3: 'rgba(220, 38, 38, 0.08)',
    heroFrom: '#ef4444',
    heroMid: '#dc2626',
    heroTo: '#991b1b',
    shellRing: 'rgba(220, 38, 38, 0.08)',
    progressMid: '#fca5a5',
  },
]

const themeMap = new Map(gymThemes.map((t) => [t.id, t]))

export function getGymTheme(id: GymThemeId | string | undefined | null): GymThemePreset {
  return themeMap.get(id as GymThemeId) ?? themeMap.get('ember')!
}

export function isGymThemeId(id: string): id is GymThemeId {
  return themeMap.has(id as GymThemeId)
}

export function applyGymTheme(id: GymThemeId | string | undefined | null): void {
  const theme = getGymTheme(id)
  const root = document.documentElement
  root.style.setProperty('--color-brand', theme.brand)
  root.style.setProperty('--color-brand-light', theme.brandLight)
  root.style.setProperty('--color-brand-dark', theme.brandDark)
  root.style.setProperty('--theme-glow-1', theme.glow1)
  root.style.setProperty('--theme-glow-2', theme.glow2)
  root.style.setProperty('--theme-glow-3', theme.glow3)
  root.style.setProperty('--theme-hero-from', theme.heroFrom)
  root.style.setProperty('--theme-hero-mid', theme.heroMid)
  root.style.setProperty('--theme-hero-to', theme.heroTo)
  root.style.setProperty('--theme-shell-ring', theme.shellRing)
  root.style.setProperty('--theme-progress-mid', theme.progressMid)
  root.dataset.gymTheme = theme.id
}
