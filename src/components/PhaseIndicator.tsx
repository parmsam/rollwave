import { upNextLabel } from '../lib/format'
import type { Phase, TimerConfig } from '../lib/types'

interface Props {
  currentRound: number
  phase: Phase
  config: TimerConfig
}

export function PhaseIndicator({ currentRound, phase, config }: Props) {
  if (phase === 'idle') return null
  const totalRounds = config.rounds
  const upNext = upNextLabel(phase, currentRound, config)
  const upNextLine = upNext && (
    <p className="text-xs font-medium tracking-wide text-slate-900/45 uppercase dark:text-white/45">{upNext}</p>
  )

  if (config.unlimited) {
    return (
      <div className="flex flex-col items-center gap-2">
        <p className="text-sm text-slate-900/60 dark:text-white/60">Round {currentRound} · unlimited</p>
        {upNextLine}
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <p className="text-sm text-slate-900/60 dark:text-white/60">
        {phase === 'finished' ? `${totalRounds} of ${totalRounds} rounds complete` : `Round ${currentRound} of ${totalRounds}`}
      </p>
      <div className="flex gap-1.5" aria-hidden="true">
        {Array.from({ length: totalRounds }, (_, i) => i + 1).map((round) => (
          <span
            key={round}
            className={`h-1.5 w-6 rounded-full transition-colors ${
              round < currentRound || phase === 'finished'
                ? 'bg-accent'
                : round === currentRound
                  ? 'bg-slate-900 dark:bg-white'
                  : 'bg-slate-900/15 dark:bg-white/15'
            }`}
          />
        ))}
      </div>
      {upNextLine}
    </div>
  )
}
