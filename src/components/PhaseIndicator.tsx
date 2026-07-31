import type { Phase } from '../lib/types'

interface Props {
  currentRound: number
  totalRounds: number
  phase: Phase
}

export function PhaseIndicator({ currentRound, totalRounds, phase }: Props) {
  if (phase === 'idle') return null

  return (
    <div className="flex flex-col items-center gap-2">
      <p className="text-sm text-white/60">
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
                  ? 'bg-white'
                  : 'bg-white/15'
            }`}
          />
        ))}
      </div>
    </div>
  )
}
