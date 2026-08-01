import { formatTime, phaseColor, phaseLabel } from '../lib/format'
import type { Phase } from '../lib/types'

interface Props {
  phase: Phase
  currentRound: number
  remainingMs: number
  isWarning: boolean
}

/** Alternative to the ring: no artwork, just the biggest legible clock a phone/tablet screen can hold — for reading the count from across the mat. */
export function BigDigitsDisplay({ phase, currentRound, remainingMs, isWarning }: Props) {
  const color = phaseColor(phase, isWarning)

  return (
    <div className={`flex w-full flex-col items-center gap-2 ${isWarning ? 'animate-pulse-glow' : ''}`} style={{ color }}>
      <span className="text-sm font-semibold tracking-[0.3em] text-slate-900/50 uppercase lg:text-base dark:text-white/50">
        {phaseLabel(phase)}
        {phase === 'round' || phase === 'rest' ? ` · ${currentRound}` : ''}
      </span>
      <span
        className="font-mono text-[26vmin] leading-none font-bold tabular-nums sm:text-[24vmin] lg:text-[20vmin]"
        style={{ color }}
      >
        {formatTime(remainingMs)}
      </span>
    </div>
  )
}
