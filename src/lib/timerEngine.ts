import type { Phase, TimerAction, TimerConfig, TimerState } from './types'

/**
 * Pure, framework-agnostic round-timer state machine.
 *
 * `now` is always injected rather than read internally so the engine stays
 * trivially unit-testable (including simulating multi-minute gaps, e.g. a
 * backgrounded mobile tab) and so natural phase expiry and an explicit
 * `SKIP` go through the exact same transition path — they can't diverge.
 *
 * Timing is deadline-based (`phaseEndsAtEpochMs = <transition time> + duration`)
 * rather than a decrementing counter, so it can never drift and can always
 * be recomputed correctly from a fresh `Date.now()` no matter how long the
 * caller went without polling.
 */

export function createInitialState(config: TimerConfig): TimerState {
  return {
    phase: 'idle',
    isPaused: false,
    currentRound: 0,
    phaseEndsAtEpochMs: null,
    phaseRemainingMsAtPause: null,
    config,
  }
}

export function phaseDurationMs(phase: Phase, config: TimerConfig): number {
  switch (phase) {
    case 'getReady':
      return config.getReadySeconds * 1000
    case 'round':
      return config.roundSeconds * 1000
    case 'rest':
      return config.restSeconds * 1000
    case 'idle':
    case 'finished':
      return 0
  }
}

function nextPhaseAfter(
  phase: Phase,
  currentRound: number,
  config: TimerConfig,
): { phase: Phase; currentRound: number } {
  switch (phase) {
    case 'idle':
      return config.getReadySeconds > 0
        ? { phase: 'getReady', currentRound: 1 }
        : { phase: 'round', currentRound: 1 }
    case 'getReady':
      return { phase: 'round', currentRound: currentRound || 1 }
    case 'round':
      return currentRound < config.rounds
        ? { phase: 'rest', currentRound }
        : { phase: 'finished', currentRound }
    case 'rest':
      return { phase: 'round', currentRound: currentRound + 1 }
    case 'finished':
      return { phase: 'finished', currentRound }
  }
}

/** Transitions to the next phase, anchoring the new deadline at `transitionAtMs`. */
function advance(state: TimerState, transitionAtMs: number): TimerState {
  const { phase, currentRound } = nextPhaseAfter(state.phase, state.currentRound, state.config)
  const duration = phaseDurationMs(phase, state.config)
  return {
    ...state,
    phase,
    currentRound,
    isPaused: false,
    phaseEndsAtEpochMs: phase === 'finished' ? null : transitionAtMs + duration,
    phaseRemainingMsAtPause: null,
  }
}

/**
 * Repeatedly advances through any phase deadlines already in the past,
 * chaining each new deadline off the *previous* deadline (not `now`) so
 * elapsed wall-clock time stays exact even after several skipped phases —
 * e.g. a tab backgrounded through an entire round + rest.
 */
function catchUp(state: TimerState, now: number): TimerState {
  let next = state
  while (next.phase !== 'finished' && next.phaseEndsAtEpochMs !== null && next.phaseEndsAtEpochMs <= now) {
    next = advance(next, next.phaseEndsAtEpochMs)
  }
  return next
}

export function reduceTimer(state: TimerState, action: TimerAction, now: number): TimerState {
  switch (action.type) {
    case 'CONFIGURE':
      return state.phase === 'idle' ? { ...state, config: action.config } : state

    case 'START':
      return state.phase === 'idle' ? catchUp(advance(state, now), now) : state

    case 'PAUSE': {
      if (state.phase === 'idle' || state.phase === 'finished' || state.isPaused) return state
      const remaining = Math.max((state.phaseEndsAtEpochMs ?? now) - now, 0)
      return { ...state, isPaused: true, phaseEndsAtEpochMs: null, phaseRemainingMsAtPause: remaining }
    }

    case 'RESUME':
      return state.isPaused
        ? {
            ...state,
            isPaused: false,
            phaseEndsAtEpochMs: now + (state.phaseRemainingMsAtPause ?? 0),
            phaseRemainingMsAtPause: null,
          }
        : state

    case 'SKIP':
      return state.phase === 'idle' || state.phase === 'finished' ? state : catchUp(advance(state, now), now)

    case 'RESET':
      return createInitialState(state.config)

    case 'TICK':
      return state.isPaused || state.phase === 'idle' || state.phase === 'finished'
        ? state
        : catchUp(state, now)
  }
}

export function remainingMs(state: TimerState, now: number): number {
  if (state.phase === 'idle' || state.phase === 'finished') return 0
  if (state.isPaused) return state.phaseRemainingMsAtPause ?? 0
  return Math.max((state.phaseEndsAtEpochMs ?? now) - now, 0)
}

export function progressRatio(state: TimerState, now: number): number {
  const total = phaseDurationMs(state.phase, state.config)
  if (total <= 0) return 1
  return 1 - remainingMs(state, now) / total
}

export function isWarningWindow(state: TimerState, now: number): boolean {
  if (state.phase !== 'round') return false
  return remainingMs(state, now) <= state.config.warningSeconds * 1000
}
