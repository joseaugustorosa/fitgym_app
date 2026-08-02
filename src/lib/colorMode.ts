export type ColorModePreference = 'light' | 'dark' | 'system'
export type ResolvedColorMode = 'light' | 'dark'

const STORAGE_KEY = 'fitgym-color-mode'

export function readColorModePreference(): ColorModePreference {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === 'light' || raw === 'dark' || raw === 'system') return raw
  } catch {
    /* ignore */
  }
  return 'dark'
}

export function saveColorModePreference(preference: ColorModePreference): void {
  try {
    localStorage.setItem(STORAGE_KEY, preference)
  } catch {
    /* ignore */
  }
}

export function resolveColorMode(preference: ColorModePreference): ResolvedColorMode {
  if (preference === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return preference
}

export function applyColorMode(mode: ResolvedColorMode): void {
  document.documentElement.dataset.colorMode = mode
  document.documentElement.style.colorScheme = mode
}

export function initColorMode(): ColorModePreference {
  const preference = readColorModePreference()
  applyColorMode(resolveColorMode(preference))
  return preference
}
