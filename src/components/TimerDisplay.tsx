import { formatTime, phaseColor, phaseLabel } from '../lib/format'
import type { Phase } from '../lib/types'

interface Props {
  phase: Phase
  currentRound: number
  remainingMs: number
  progressRatio: number
  isWarning: boolean
}

const RADIUS = 130
const CIRCUMFERENCE = 2 * Math.PI * RADIUS
const TRACK_STROKE = 6
const ARC_STROKE = 20

export function TimerDisplay({ phase, currentRound, remainingMs, progressRatio, isWarning }: Props) {
  const color = phaseColor(phase, isWarning)
  const clampedProgress = Math.min(Math.max(progressRatio, 0), 1)
  // Starts as a full, bold arc and drains away as time elapses (0 = full
  // ring visible, CIRCUMFERENCE = fully drained) — same convention as the
  // iOS Clock app's countdown ring, showing time being lost, not gained.
  const dashOffset = CIRCUMFERENCE * clampedProgress

  return (
    <div
      className={`relative aspect-square w-[min(78vmin,22rem)] sm:w-[min(72vmin,26rem)] lg:w-[min(60vmin,32rem)] ${isWarning ? 'animate-pulse-glow' : ''}`}
      style={{ color }}
    >
      <svg viewBox="0 0 300 300" className="h-full w-full -rotate-90">
        {/* Preact doesn't camelCase->kebab-case these SVG presentation
            attributes the way React does — using strokeWidth etc. here
            silently no-ops, so these must be the raw kebab-case names. */}
        <circle cx="150" cy="150" r={RADIUS} fill="none" stroke="var(--color-track)" stroke-width={TRACK_STROKE} />
        <circle
          cx="150"
          cy="150"
          r={RADIUS}
          fill="none"
          stroke="currentColor"
          stroke-width={ARC_STROKE}
          stroke-linecap="round"
          stroke-dasharray={CIRCUMFERENCE}
          stroke-dashoffset={dashOffset}
          style={{ transition: 'stroke-dashoffset 0.2s linear' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
        <span className="text-xs font-semibold tracking-[0.3em] text-slate-900/50 uppercase lg:text-sm dark:text-white/50">
          {phaseLabel(phase)}
          {phase === 'round' || phase === 'rest' ? ` · ${currentRound}` : ''}
        </span>
        <span className="font-mono text-6xl font-bold tabular-nums sm:text-7xl lg:text-8xl" style={{ color }}>
          {formatTime(remainingMs)}
        </span>
      </div>
    </div>
  )
}
