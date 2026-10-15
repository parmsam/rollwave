import { beforeEach, describe, expect, it } from 'vitest'
import { loadActiveSession, saveActiveSession } from './activeSession'
import { createInitialState, reduceTimer } from './timerEngine'
import type { TimerConfig } from './types'

const config: TimerConfig = {
  id: 'test',
  label: 'Test',
  rounds: 3,
  roundSeconds: 10,
  restSeconds: 5,
  getReadySeconds: 3,
  warningSeconds: 3,
}

describe('activeSession persistence', () => {
  beforeEach(() => localStorage.clear())

  it('round-trips a running session', () => {
    const timer = reduceTimer(createInitialState(config), { type: 'START' }, 1_000)
    saveActiveSession({ timer, startedAt: 1_000, logged: false })
    expect(loadActiveSession()).toEqual({ timer, startedAt: 1_000, logged: false })
  })

  it('clears storage for an idle (or null) session', () => {
    const timer = reduceTimer(createInitialState(config), { type: 'START' }, 1_000)
    saveActiveSession({ timer, startedAt: 1_000, logged: false })
    saveActiveSession({ timer: createInitialState(config), startedAt: 1_000, logged: false })
    expect(loadActiveSession()).toBeNull()
    saveActiveSession({ timer, startedAt: 1_000, logged: false })
    saveActiveSession(null)
    expect(loadActiveSession()).toBeNull()
  })

  it('ignores malformed or wrong-version data', () => {
    localStorage.setItem('rollwave:activeSession', '{not json')
    expect(loadActiveSession()).toBeNull()
    localStorage.setItem('rollwave:activeSession', JSON.stringify({ v: 99, timer: { phase: 'round' } }))
    expect(loadActiveSession()).toBeNull()
  })
})
