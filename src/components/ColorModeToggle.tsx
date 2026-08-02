import { MoonIcon, SunIcon } from './icons'
import { useColorMode } from '../contexts/ColorModeContext'
import type { ColorModePreference } from '../lib/colorMode'

interface ColorModeToggleProps {
  compact?: boolean
}

export function ColorModeToggle({ compact = false }: ColorModeToggleProps) {
  const { mode, toggleMode } = useColorMode()
  const isDark = mode === 'dark'

  return (
    <button
      type="button"
      onClick={toggleMode}
      className={`pressable flex items-center justify-center rounded-xl border border-[var(--color-panel-border)] bg-surface-3 text-neutral-400 transition-colors hover:text-neutral-200 ${
        compact ? 'h-9 w-9' : 'h-11 w-11'
      }`}
      aria-label={isDark ? 'Ativar tema claro' : 'Ativar tema escuro'}
      title={isDark ? 'Tema claro' : 'Tema escuro'}
    >
      {isDark ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
    </button>
  )
}

interface ColorModePickerProps {
  className?: string
}

const options: { id: ColorModePreference; label: string }[] = [
  { id: 'light', label: 'Claro' },
  { id: 'dark', label: 'Escuro' },
  { id: 'system', label: 'Sistema' },
]

export function ColorModePicker({ className = '' }: ColorModePickerProps) {
  const { preference, setPreference } = useColorMode()

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {options.map((opt) => {
        const active = preference === opt.id
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => setPreference(opt.id)}
            className={`pressable rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
              active
                ? 'bg-brand text-white'
                : 'border border-[var(--color-panel-border)] bg-surface-2 text-neutral-400 hover:bg-surface-3'
            }`}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
