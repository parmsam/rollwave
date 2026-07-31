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
