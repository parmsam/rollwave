import type { Phase } from './types'

export function formatTime(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

/** Long-form duration for aggregate stats (e.g. "4h 12m"), not the mm:ss countdown. */
export function formatDurationLong(ms: number): string {
  if (ms <= 0) return '0m'
  const totalMinutes = Math.round(ms / 60_000)
  if (totalMinutes < 1) return '<1m'
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return hours === 0 ? `${minutes}m` : `${hours}h ${minutes}m`
}

/** Shared phase -> accent color mapping used by both the ring and big-digits timer displays. */
export function phaseColor(phase: Phase, isWarning: boolean): string {
  if (isWarning && (phase === 'round' || phase === 'rest')) return 'var(--color-warn)'
  if (phase === 'round') return 'var(--color-accent)'
  if (phase === 'rest') return 'var(--color-rest)'
  if (phase === 'getReady') return 'var(--color-accent-2)'
  return 'var(--color-round)'
}

export function phaseLabel(phase: Phase): string {
  switch (phase) {
    case 'idle':
      return 'Ready'
    case 'getReady':
      return 'Get Ready'
    case 'round':
      return 'Round'
    case 'rest':
      return 'Rest'
    case 'finished':
      return 'Complete'
  }
}
