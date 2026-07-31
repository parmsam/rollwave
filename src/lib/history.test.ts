import { describe, expect, it } from 'vitest'
import { computeStats } from './history'
import type { SessionRecord } from './history'

function daysAgo(n: number, hour = 12): number {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(hour, 0, 0, 0)
  return d.getTime()
}

function makeSession(overrides: Partial<SessionRecord> = {}): SessionRecord {
  return {
    id: Math.random().toString(36),
    completedAt: Date.now(),
    presetLabel: 'Competition',
    roundsCompleted: 5,
    totalRounds: 5,
    unlimited: false,
    totalActiveMs: 20 * 60 * 1000,
    ...overrides,
  }
}

describe('computeStats', () => {
  it('returns zeros for empty history', () => {
    expect(computeStats([])).toEqual({
      totalSessions: 0,
      totalRoundsCompleted: 0,
      totalActiveMs: 0,
      currentStreak: 0,
    })
  })

  it('sums sessions, rounds, and active time', () => {
    const history = [
      makeSession({ completedAt: daysAgo(0), roundsCompleted: 5, totalActiveMs: 100 }),
      makeSession({ completedAt: daysAgo(1), roundsCompleted: 3, totalActiveMs: 50 }),
    ]
    const stats = computeStats(history)
    expect(stats.totalSessions).toBe(2)
    expect(stats.totalRoundsCompleted).toBe(8)
    expect(stats.totalActiveMs).toBe(150)
  })

  it('counts a consecutive-day streak including today', () => {
    const history = [
      makeSession({ completedAt: daysAgo(0) }),
      makeSession({ completedAt: daysAgo(1) }),
      makeSession({ completedAt: daysAgo(2) }),
    ]
    expect(computeStats(history).currentStreak).toBe(3)
  })

  it('continues the streak from yesterday if today has no session yet', () => {
    const history = [makeSession({ completedAt: daysAgo(1) }), makeSession({ completedAt: daysAgo(2) })]
    expect(computeStats(history).currentStreak).toBe(2)
  })

  it('breaks the streak on a gap day', () => {
    const history = [makeSession({ completedAt: daysAgo(0) }), makeSession({ completedAt: daysAgo(2) })]
    expect(computeStats(history).currentStreak).toBe(1)
  })

  it('is zero if the most recent session was more than a day ago', () => {
    const history = [makeSession({ completedAt: daysAgo(3) })]
    expect(computeStats(history).currentStreak).toBe(0)
  })
})
