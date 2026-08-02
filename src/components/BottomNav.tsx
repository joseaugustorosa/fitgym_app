import type { TabId } from '../types/index'
import { HomeIcon, DumbbellIcon, SaladIcon, UsersIcon } from './icons'
import { ColorModeToggle } from './ColorModeToggle'
import { useColorMode } from '../contexts/ColorModeContext'

const tabs: { id: TabId; label: string; Icon: typeof HomeIcon }[] = [
  { id: 'sessao', label: 'Sessão', Icon: HomeIcon },
  { id: 'treino', label: 'Treino', Icon: DumbbellIcon },
  { id: 'dieta', label: 'Dieta', Icon: SaladIcon },
  { id: 'comunidade', label: 'Comunidade', Icon: UsersIcon },
]

interface BottomNavProps {
  active: TabId
  onChange: (tab: TabId) => void
}

export function BottomNav({ active, onChange }: BottomNavProps) {
  const activeIndex = Math.max(0, tabs.findIndex((t) => t.id === active))
  const { mode } = useColorMode()

  return (
    <nav className="bottom-nav shrink-0 pb-[env(safe-area-inset-bottom)] backdrop-blur-2xl">
      <div className="flex items-center justify-between gap-2 border-b border-[var(--color-panel-border)] px-3 py-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
          Tema · {mode === 'dark' ? 'Escuro' : 'Claro'}
        </p>
        <ColorModeToggle compact />
      </div>
      <div className="relative flex items-stretch justify-around px-2 pt-2">
        <div
          className="nav-indicator pointer-events-none absolute top-1.5 h-1 w-10 rounded-full bg-brand"
          style={{
            left: `calc(${(activeIndex + 0.5) * (100 / tabs.length)}% - 1.25rem)`,
          }}
        />
        {tabs.map(({ id, label, Icon }) => {
          const isActive = active === id
          return (
            <button
              key={id}
              onClick={() => onChange(id)}
              className={`pressable flex flex-1 flex-col items-center gap-1 py-2.5 transition-colors ${
                isActive ? 'text-brand' : 'text-neutral-500'
              }`}
            >
              <Icon className="h-6 w-6" filled={isActive} />
              <span
                className={`text-[10px] font-semibold tracking-wide ${
                  isActive ? 'text-brand' : ''
                }`}
              >
                {label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
