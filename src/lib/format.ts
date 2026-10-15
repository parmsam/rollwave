import type { Phase, TimerConfig } from './types'

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

/**
 * Total wall-clock length of a session: get-ready + every round + the rests
 * *between* rounds (none after the last one — see `nextPhaseAfter`). Null
 * for unlimited sessions, which have no end.
 */
export function sessionTotalSeconds(config: TimerConfig): number | null {
  if (config.unlimited) return null
  return config.getReadySeconds + config.rounds * config.roundSeconds + (config.rounds - 1) * config.restSeconds
}

/** "5 × 5:00 · 1:00 rest" — the one-line shape of a preset, shared by preset cards and the Start bar. */
export function describePreset(config: TimerConfig): string {
  const rounds = config.unlimited ? '∞' : String(config.rounds)
  const rest = config.restSeconds > 0 ? ` · ${formatTime(config.restSeconds * 1000)} rest` : ' · no rest'
  return `${rounds} × ${formatTime(config.roundSeconds * 1000)}${rest}`
}

/** "29 min" / "1 h 5 min" for a session total; "no end" for unlimited. */
export function formatSessionTotal(config: TimerConfig): string {
  const total = sessionTotalSeconds(config)
  if (total === null) return 'no end'
  const minutes = Math.round(total / 60)
  if (minutes < 60) return `${Math.max(minutes, 1)} min`
  return `${Math.floor(minutes / 60)} h ${minutes % 60} min`
}

/** What comes after the current phase — shown under the running timer so nobody has to count rounds. */
export function upNextLabel(phase: Phase, currentRound: number, config: TimerConfig): string | null {
  const isLastRound = !config.unlimited && currentRound >= config.rounds
  switch (phase) {
    case 'getReady':
      return `Next: Round 1 · ${formatTime(config.roundSeconds * 1000)}`
    case 'round':
      if (isLastRound) return 'Final round'
      return config.restSeconds > 0
        ? `Next: Rest · ${formatTime(config.restSeconds * 1000)}`
        : `Next: Round ${currentRound + 1}`
    case 'rest':
      return !config.unlimited && currentRound + 1 >= config.rounds
        ? `Next: Final round · ${formatTime(config.roundSeconds * 1000)}`
        : `Next: Round ${currentRound + 1} · ${formatTime(config.roundSeconds * 1000)}`
    default:
      return null
  }
}
