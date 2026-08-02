export const gymThemeIds = [
  'ember',
  'ocean',
  'forest',
  'violet',
  'crimson',
  'sunset',
  'mint',
  'rose',
  'indigo',
  'lime',
  'slate',
  'coral',
  'midnight',
  'copper',
  'magenta',
  'cyan',
  'wine',
] as const

export type GymThemeId = (typeof gymThemeIds)[number]

export interface GymThemePreset {
  id: GymThemeId
  name: string
  description: string
  group: string
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

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '')
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  }
}

function rgba(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function theme(
  id: GymThemeId,
  name: string,
  description: string,
  group: string,
  brand: string,
  brandLight: string,
  brandDark: string,
  heroFrom: string,
  heroMid: string,
  heroTo: string,
  progressMid: string,
): GymThemePreset {
  return {
    id,
    name,
    description,
    group,
    brand,
    brandLight,
    brandDark,
    glow1: rgba(brand, 0.2),
    glow2: rgba(brandLight, 0.12),
    glow3: rgba(brand, 0.08),
    heroFrom,
    heroMid,
    heroTo,
    shellRing: rgba(brand, 0.06),
    progressMid,
  }
}

export const gymThemeGroups = [
  { id: 'energia', label: 'Energia & impacto' },
  { id: 'frio', label: 'Frio & foco' },
  { id: 'natureza', label: 'Natureza & vitalidade' },
  { id: 'premium', label: 'Premium & exclusivo' },
] as const

export const gymThemes: GymThemePreset[] = [
  theme(
    'ember',
    'Brasa',
    'Laranja energético — identidade FitGym clássica',
    'energia',
    '#ff5a00',
    '#ff7a33',
    '#d94800',
    '#ff6a12',
    '#ff4d00',
    '#c73a00',
    '#ff9a4d',
  ),
  theme(
    'crimson',
    'Rubro',
    'Vermelho intenso — força e determinação',
    'energia',
    '#dc2626',
    '#f87171',
    '#b91c1c',
    '#ef4444',
    '#dc2626',
    '#991b1b',
    '#fca5a5',
  ),
  theme(
    'sunset',
    'Pôr do sol',
    'Âmbar dourado — calor e motivação',
    'energia',
    '#f59e0b',
    '#fbbf24',
    '#d97706',
    '#fbbf24',
    '#f59e0b',
    '#b45309',
    '#fcd34d',
  ),
  theme(
    'coral',
    'Coral',
    'Salmão vibrante — acolhedor e dinâmico',
    'energia',
    '#f97316',
    '#fb923c',
    '#ea580c',
    '#fb923c',
    '#f97316',
    '#c2410c',
    '#fdba74',
  ),
  theme(
    'copper',
    'Cobre',
    'Bronze metálico — robustez e tradição',
    'energia',
    '#c27803',
    '#eab308',
    '#92400e',
    '#d97706',
    '#b45309',
    '#78350f',
    '#facc15',
  ),
  theme(
    'ocean',
    'Oceano',
    'Azul claro — frescor e concentração',
    'frio',
    '#0ea5e9',
    '#38bdf8',
    '#0284c7',
    '#38bdf8',
    '#0ea5e9',
    '#0369a1',
    '#7dd3fc',
  ),
  theme(
    'cyan',
    'Ciano',
    'Turquesa elétrico — moderno e ágil',
    'frio',
    '#06b6d4',
    '#22d3ee',
    '#0891b2',
    '#22d3ee',
    '#06b6d4',
    '#0e7490',
    '#67e8f9',
  ),
  theme(
    'midnight',
    'Meia-noite',
    'Azul profundo — seriedade e performance',
    'frio',
    '#2563eb',
    '#60a5fa',
    '#1d4ed8',
    '#3b82f6',
    '#2563eb',
    '#1e3a8a',
    '#93c5fd',
  ),
  theme(
    'indigo',
    'Índigo',
    'Azul-violeta — confiança e equilíbrio',
    'frio',
    '#4f46e5',
    '#818cf8',
    '#4338ca',
    '#6366f1',
    '#4f46e5',
    '#3730a3',
    '#a5b4fc',
  ),
  theme(
    'slate',
    'Grafite',
    'Cinza-azulado — minimalista e corporativo',
    'frio',
    '#64748b',
    '#94a3b8',
    '#475569',
    '#94a3b8',
    '#64748b',
    '#334155',
    '#cbd5e1',
  ),
  theme(
    'forest',
    'Floresta',
    'Verde natural — saúde e equilíbrio',
    'natureza',
    '#16a34a',
    '#4ade80',
    '#15803d',
    '#22c55e',
    '#16a34a',
    '#166534',
    '#86efac',
  ),
  theme(
    'lime',
    'Limão',
    'Verde-limão — explosão de energia',
    'natureza',
    '#65a30d',
    '#a3e635',
    '#4d7c0f',
    '#84cc16',
    '#65a30d',
    '#3f6212',
    '#bef264',
  ),
  theme(
    'mint',
    'Menta',
    'Verde-água suave — leveza e bem-estar',
    'natureza',
    '#14b8a6',
    '#2dd4bf',
    '#0f766e',
    '#2dd4bf',
    '#14b8a6',
    '#115e59',
    '#5eead4',
  ),
  theme(
    'violet',
    'Violeta',
    'Roxo moderno — premium e diferenciado',
    'premium',
    '#7c3aed',
    '#a78bfa',
    '#6d28d9',
    '#8b5cf6',
    '#7c3aed',
    '#5b21b6',
    '#c4b5fd',
  ),
  theme(
    'magenta',
    'Magenta',
    'Fúcsia ousado — destaque e personalidade',
    'premium',
    '#c026d3',
    '#e879f9',
    '#a21caf',
    '#d946ef',
    '#c026d3',
    '#86198f',
    '#f0abfc',
  ),
  theme(
    'rose',
    'Rosa',
    'Rosa elegante — estilo e comunidade',
    'premium',
    '#e11d48',
    '#fb7185',
    '#be123c',
    '#f43f5e',
    '#e11d48',
    '#9f1239',
    '#fda4af',
  ),
  theme(
    'wine',
    'Vinho',
    'Bordô sofisticado — exclusividade e foco',
    'premium',
    '#9f1239',
    '#fb7185',
    '#881337',
    '#be123c',
    '#9f1239',
    '#4c0519',
    '#fecdd3',
  ),
]

const themeMap = new Map(gymThemes.map((t) => [t.id, t]))

export function getGymTheme(id: GymThemeId | string | undefined | null): GymThemePreset {
  return themeMap.get(id as GymThemeId) ?? themeMap.get('ember')!
}

export function isGymThemeId(id: string): id is GymThemeId {
  return themeMap.has(id as GymThemeId)
}

export function themesByGroup(groupId: string): GymThemePreset[] {
  return gymThemes.filter((t) => t.group === groupId)
}

export function applyGymTheme(id: GymThemeId | string | undefined | null): void {
  const preset = getGymTheme(id)
  const root = document.documentElement
  root.style.setProperty('--color-brand', preset.brand)
  root.style.setProperty('--color-brand-light', preset.brandLight)
  root.style.setProperty('--color-brand-dark', preset.brandDark)
  root.style.setProperty('--theme-glow-1', preset.glow1)
  root.style.setProperty('--theme-glow-2', preset.glow2)
  root.style.setProperty('--theme-glow-3', preset.glow3)
  root.style.setProperty('--theme-hero-from', preset.heroFrom)
  root.style.setProperty('--theme-hero-mid', preset.heroMid)
  root.style.setProperty('--theme-hero-to', preset.heroTo)
  root.style.setProperty('--theme-shell-ring', preset.shellRing)
  root.style.setProperty('--theme-progress-mid', preset.progressMid)
  root.dataset.gymTheme = preset.id
}
