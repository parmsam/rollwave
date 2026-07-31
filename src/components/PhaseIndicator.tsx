import type { Phase } from '../lib/types'

interface Props {
  currentRound: number
  totalRounds: number
  phase: Phase
  unlimited: boolean
}

export function PhaseIndicator({ currentRound, totalRounds, phase, unlimited }: Props) {
  if (phase === 'idle') return null

  if (unlimited) {
    return (
      <div className="flex flex-col items-center gap-2">
        <p className="text-sm text-slate-900/60 dark:text-white/60">Round {currentRound} · unlimited</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <p className="text-sm text-slate-900/60 dark:text-white/60">
        {phase === 'finished' ? `${totalRounds} of ${totalRounds} rounds complete` : `Round ${currentRound} of ${totalRounds}`}
      </p>
      <div className="flex gap-1.5">
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
    </div>
  )
}
