import type { Phase } from './types'

export function formatTime(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
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
