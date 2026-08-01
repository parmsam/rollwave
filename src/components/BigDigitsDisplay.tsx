import { LiveClock } from './LiveClock'
import { formatTime, phaseColor, phaseLabel } from '../lib/format'
import type { Phase } from '../lib/types'

interface Props {
  phase: Phase
  currentRound: number
  remainingMs: number
  isWarning: boolean
  showClock: boolean
}

/** Alternative to the ring: no artwork, just the biggest legible clock a phone/tablet screen can hold — for reading the count from across the mat. */
export function BigDigitsDisplay({ phase, currentRound, remainingMs, isWarning, showClock }: Props) {
  const color = phaseColor(phase, isWarning)
  const timeText = formatTime(remainingMs)
  // Two-digit minutes (e.g. "12:00", up to "30:00" for the longest configurable
  // round) need a smaller vmin percentage than the far more common single-digit
  // case ("5:00") to avoid overflowing the width of a narrow phone in portrait —
  // vmin is capped by whichever viewport axis is smaller, which in portrait is
  // width, so a fixed size tuned for the longer string would leave the common
  // case looking needlessly small.
  const sizeClass =
    timeText.length > 4
      ? 'text-[30vmin] sm:text-[27vmin] lg:text-[20vmin]'
      : 'text-[36vmin] sm:text-[32vmin] lg:text-[24vmin]'

  return (
    <div
      className={`-mx-6 flex w-[calc(100%+3rem)] flex-1 flex-col items-center justify-center gap-2 px-2 ${isWarning ? 'animate-pulse-glow' : ''}`}
      style={{ color }}
    >
      {showClock && <LiveClock size="lg" />}
      <span className="text-sm font-semibold tracking-[0.3em] text-slate-900/50 uppercase lg:text-base dark:text-white/50">
        {phaseLabel(phase)}
        {phase === 'round' || phase === 'rest' ? ` · ${currentRound}` : ''}
      </span>
      <span className={`font-mono leading-none font-bold tabular-nums ${sizeClass}`} style={{ color }}>
        {timeText}
      </span>
    </div>
  )
}
