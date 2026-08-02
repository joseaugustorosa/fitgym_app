/** Parse "4×10", "3x12", "3×45s" */
export function parseSets(setsStr: string): { count: number; repsLabel: string } {
  const normalized = setsStr.trim()
  const match = normalized.match(/^(\d+)\s*[x×]\s*(.+)$/i)
  if (match) {
    return { count: Math.max(1, parseInt(match[1], 10)), repsLabel: match[2].trim() }
  }
  const onlyNum = normalized.match(/^(\d+)$/)
  if (onlyNum) return { count: Math.max(1, parseInt(onlyNum[1], 10)), repsLabel: 'reps' }
  return { count: 3, repsLabel: normalized || 'reps' }
}

/** Parse "90s", "60s", "2min" → seconds */
export function parseRestSeconds(restStr: string): number {
  const s = restStr.trim().toLowerCase()
  const minMatch = s.match(/(\d+)\s*min/)
  if (minMatch) return parseInt(minMatch[1], 10) * 60
  const secMatch = s.match(/(\d+)/)
  return secMatch ? Math.max(5, parseInt(secMatch[1], 10)) : 60
}

export function formatCountdown(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return m > 0 ? `${m}:${s.toString().padStart(2, '0')}` : `${s}s`
}
