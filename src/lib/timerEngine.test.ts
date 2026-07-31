import { describe, expect, it } from 'vitest'
import { createInitialState, isWarningWindow, reduceTimer, remainingMs } from './timerEngine'
import type { TimerConfig } from './types'

const baseConfig: TimerConfig = {
  id: 'custom',
  label: 'Test',
  rounds: 3,
  roundSeconds: 10,
  restSeconds: 5,
  getReadySeconds: 3,
  warningSeconds: 3,
}

const T0 = 1_700_000_000_000

function withConfig(overrides: Partial<TimerConfig>): TimerConfig {
  return { ...baseConfig, ...overrides }
}

describe('reduceTimer', () => {
  it('starts into getReady when getReadySeconds > 0', () => {
    const state = createInitialState(baseConfig)
    const started = reduceTimer(state, { type: 'START' }, T0)
    expect(started.phase).toBe('getReady')
    expect(started.currentRound).toBe(1)
    expect(remainingMs(started, T0)).toBe(3000)
  })

  it('starts straight into round 1 when getReadySeconds is 0', () => {
    const config = withConfig({ getReadySeconds: 0 })
    const started = reduceTimer(createInitialState(config), { type: 'START' }, T0)
    expect(started.phase).toBe('round')
    expect(started.currentRound).toBe(1)
    expect(remainingMs(started, T0)).toBe(10_000)
  })

  it('walks getReady -> round -> rest -> round -> ... -> finished', () => {
    let state = createInitialState(baseConfig)
    state = reduceTimer(state, { type: 'START' }, T0)
    expect(state.phase).toBe('getReady')

    // getReady expires (3s)
    state = reduceTimer(state, { type: 'TICK' }, T0 + 3_000)
    expect(state.phase).toBe('round')
    expect(state.currentRound).toBe(1)

    // round 1 expires (10s)
    state = reduceTimer(state, { type: 'TICK' }, T0 + 3_000 + 10_000)
    expect(state.phase).toBe('rest')
    expect(state.currentRound).toBe(1)

    // rest expires (5s)
    state = reduceTimer(state, { type: 'TICK' }, T0 + 3_000 + 10_000 + 5_000)
    expect(state.phase).toBe('round')
    expect(state.currentRound).toBe(2)
  })

  it('skips the final rest and finishes after the last round', () => {
    const config = withConfig({ rounds: 1, getReadySeconds: 0 })
    let state = reduceTimer(createInitialState(config), { type: 'START' }, T0)
    expect(state.phase).toBe('round')

    state = reduceTimer(state, { type: 'TICK' }, T0 + 10_000)
    expect(state.phase).toBe('finished')
    expect(remainingMs(state, T0 + 10_000)).toBe(0)
  })

  it('SKIP and natural expiry reach the identical resulting state', () => {
    const config = withConfig({ getReadySeconds: 0 })
    const start = reduceTimer(createInitialState(config), { type: 'START' }, T0)

    const viaExpiry = reduceTimer(start, { type: 'TICK' }, T0 + 10_000)
    const viaSkip = reduceTimer(start, { type: 'SKIP' }, T0 + 10_000)

    expect(viaSkip).toEqual(viaExpiry)
  })

  it('SKIP works before natural expiry too, and matches the deadline-chained state', () => {
    const config = withConfig({ getReadySeconds: 0 })
    const start = reduceTimer(createInitialState(config), { type: 'START' }, T0)

    // Skip early, mid-round.
    const skipped = reduceTimer(start, { type: 'SKIP' }, T0 + 4_000)
    expect(skipped.phase).toBe('rest')
    // New deadline anchors off the skip time, not off the original round duration.
    expect(skipped.phaseEndsAtEpochMs).toBe(T0 + 4_000 + 5_000)
  })

  it('pause freezes remaining time and resume recomputes a fresh deadline', () => {
    const config = withConfig({ getReadySeconds: 0 })
    let state = reduceTimer(createInitialState(config), { type: 'START' }, T0)

    state = reduceTimer(state, { type: 'PAUSE' }, T0 + 4_000)
    expect(state.isPaused).toBe(true)
    expect(remainingMs(state, T0 + 999_999)).toBe(6_000) // frozen regardless of elapsed wall time

    state = reduceTimer(state, { type: 'RESUME' }, T0 + 50_000)
    expect(state.isPaused).toBe(false)
    expect(remainingMs(state, T0 + 50_000)).toBe(6_000)
    expect(remainingMs(state, T0 + 53_000)).toBe(3_000)
  })

  it('fast-forwards through multiple missed phases after a long background gap', () => {
    const config = withConfig({ getReadySeconds: 0, rounds: 3, roundSeconds: 10, restSeconds: 5 })
    const start = reduceTimer(createInitialState(config), { type: 'START' }, T0)

    // Simulate the tab being backgrounded/suspended for several minutes —
    // far past round1(10s)+rest(5s)+round2(10s), landing inside rest #2.
    const farFuture = T0 + 10_000 + 5_000 + 10_000 + 2_000
    const caughtUp = reduceTimer(start, { type: 'TICK' }, farFuture)

    expect(caughtUp.phase).toBe('rest')
    expect(caughtUp.currentRound).toBe(2)
    expect(remainingMs(caughtUp, farFuture)).toBe(3_000)
  })

  it('fast-forwards all the way to finished if the gap covers the whole session', () => {
    const config = withConfig({ getReadySeconds: 0, rounds: 2, roundSeconds: 10, restSeconds: 5 })
    const start = reduceTimer(createInitialState(config), { type: 'START' }, T0)

    const wayLater = T0 + 1_000_000
    const caughtUp = reduceTimer(start, { type: 'TICK' }, wayLater)

    expect(caughtUp.phase).toBe('finished')
    expect(remainingMs(caughtUp, wayLater)).toBe(0)
  })

  it('RESET returns to idle but preserves the configured settings', () => {
    const config = withConfig({ rounds: 5 })
    let state = reduceTimer(createInitialState(config), { type: 'START' }, T0)
    state = reduceTimer(state, { type: 'TICK' }, T0 + 999_999)
    state = reduceTimer(state, { type: 'RESET' }, T0 + 999_999)

    expect(state.phase).toBe('idle')
    expect(state.currentRound).toBe(0)
    expect(state.config.rounds).toBe(5)
  })

  it('reports the warning window only during the final N seconds of a round', () => {
    const config = withConfig({ getReadySeconds: 0, roundSeconds: 10, warningSeconds: 3 })
    const state = reduceTimer(createInitialState(config), { type: 'START' }, T0)

    expect(isWarningWindow(state, T0 + 1_000)).toBe(false) // 9s left
    expect(isWarningWindow(state, T0 + 7_000)).toBe(true) // 3s left
    expect(isWarningWindow(state, T0 + 9_999)).toBe(true) // ~1ms left
  })

  it('is not in a warning window during rest or getReady', () => {
    const state = reduceTimer(createInitialState(baseConfig), { type: 'START' }, T0)
    expect(state.phase).toBe('getReady')
    expect(isWarningWindow(state, T0 + 2_900)).toBe(false)
  })
})
