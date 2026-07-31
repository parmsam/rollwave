import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'
import type { Phase } from '../lib/types'

interface Props {
  phase: Phase
  isPaused: boolean
  onToggleStartPause: () => void
  onReset: () => void
  onSkip: () => void
}

const primaryButtonClass =
  'rounded-full bg-accent px-10 py-4 text-lg font-semibold text-ink shadow-[0_0_30px_-5px_var(--color-accent)] transition active:scale-95 active:bg-accent-2 active:shadow-[0_0_30px_-5px_var(--color-accent-2)]'
const secondaryButtonClass =
  'rounded-full border border-white/15 px-6 py-4 text-sm font-medium text-white/80 transition hover:border-white/30 active:scale-95 active:border-accent/60 active:bg-accent/20 active:text-round'

export function Controls({ phase, isPaused, onToggleStartPause, onReset, onSkip }: Props) {
  useKeyboardShortcuts({
    onToggleStartPause: phase === 'finished' ? onReset : onToggleStartPause,
    onReset,
    onSkip,
  })

  if (phase === 'finished') {
    return (
      <button type="button" onClick={onReset} className={primaryButtonClass}>
        New Session
      </button>
    )
  }

  const isIdle = phase === 'idle'
  const primaryLabel = isIdle ? 'Start' : isPaused ? 'Resume' : 'Pause'

  return (
    <div className="flex items-center gap-3">
      <button type="button" onClick={onToggleStartPause} className={primaryButtonClass}>
        {primaryLabel}
      </button>
      {!isIdle && (
        <>
          <button type="button" onClick={onSkip} className={secondaryButtonClass}>
            Skip
          </button>
          <button type="button" onClick={onReset} className={secondaryButtonClass}>
            Reset
          </button>
        </>
      )}
    </div>
  )
}
