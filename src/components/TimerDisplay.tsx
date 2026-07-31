import { formatTime, phaseLabel } from '../lib/format'
import type { Phase } from '../lib/types'

interface Props {
  phase: Phase
  currentRound: number
  remainingMs: number
  progressRatio: number
  isWarning: boolean
  warningSeconds: number
}

const RADIUS = 130
const CIRCUMFERENCE = 2 * Math.PI * RADIUS
const MAX_GROWTH = 0.08

function ringColor(phase: Phase, isWarning: boolean): string {
  if (phase === 'round') return isWarning ? 'var(--color-warn)' : 'var(--color-accent)'
  if (phase === 'rest') return 'var(--color-rest)'
  if (phase === 'getReady') return 'var(--color-accent-2)'
  return 'var(--color-round)'
}

export function TimerDisplay({
  phase,
  currentRound,
  remainingMs,
  progressRatio,
  isWarning,
  warningSeconds,
}: Props) {
  const color = ringColor(phase, isWarning)
  const dashOffset = CIRCUMFERENCE * Math.min(Math.max(progressRatio, 0), 1)

  // Grows continuously as the round closes in during the warning window —
  // 0 right as the warning starts, up to MAX_GROWTH at zero remaining.
  const urgency =
    isWarning && warningSeconds > 0 ? Math.min(Math.max(1 - remainingMs / (warningSeconds * 1000), 0), 1) : 0
  const scale = 1 + urgency * MAX_GROWTH

  return (
    <div
      className={`relative aspect-square w-72 sm:w-80 md:w-96 ${isWarning ? 'animate-pulse-glow' : ''}`}
      style={{ color, transform: `scale(${scale})`, transition: 'transform 0.25s ease-out' }}
    >
      <svg viewBox="0 0 300 300" className="h-full w-full -rotate-90">
        <circle cx="150" cy="150" r={RADIUS} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="14" />
        <circle
          cx="150"
          cy="150"
          r={RADIUS}
          fill="none"
          stroke="currentColor"
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={dashOffset}
          style={{ transition: 'stroke-dashoffset 0.2s linear' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
        <span className="text-xs font-semibold tracking-[0.3em] text-white/50 uppercase">
          {phaseLabel(phase)}
          {phase === 'round' || phase === 'rest' ? ` · ${currentRound}` : ''}
        </span>
        <span className="font-mono text-6xl font-bold tabular-nums sm:text-7xl" style={{ color }}>
          {formatTime(remainingMs)}
        </span>
      </div>
    </div>
  )
}
