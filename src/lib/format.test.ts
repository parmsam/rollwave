import { describe, expect, it } from 'vitest'
import { describePreset, formatSessionTotal, sessionTotalSeconds, upNextLabel } from './format'
import { PRESETS } from './presets'
import type { TimerConfig } from './types'

const competition = PRESETS.find((p) => p.id === 'competition')!
const openMat = PRESETS.find((p) => p.id === 'openMat')!
const config: TimerConfig = { ...competition, rounds: 3, roundSeconds: 300, restSeconds: 60, getReadySeconds: 10 }

describe('session totals', () => {
  it('counts rests only between rounds, plus get-ready', () => {
    // 10 + 3*300 + 2*60
    expect(sessionTotalSeconds(config)).toBe(1030)
    expect(formatSessionTotal(config)).toBe('17 min')
  })

  it('has no total for unlimited sessions', () => {
    expect(sessionTotalSeconds(openMat)).toBeNull()
    expect(formatSessionTotal(openMat)).toBe('no end')
  })

  it('formats hours', () => {
    expect(formatSessionTotal({ ...config, rounds: 12, roundSeconds: 300 })).toBe('1 h 11 min')
  })
})

describe('describePreset', () => {
  it('summarizes rounds, length and rest', () => {
    expect(describePreset(config)).toBe('3 × 5:00 · 1:00 rest')
    expect(describePreset({ ...config, restSeconds: 0 })).toBe('3 × 5:00 · no rest')
    expect(describePreset(openMat)).toBe('∞ × 5:00 · 1:00 rest')
  })
})

describe('upNextLabel', () => {
  it('previews the next phase', () => {
    expect(upNextLabel('getReady', 1, config)).toBe('Next: Round 1 · 5:00')
    expect(upNextLabel('round', 1, config)).toBe('Next: Rest · 1:00')
    expect(upNextLabel('rest', 1, config)).toBe('Next: Round 2 · 5:00')
    expect(upNextLabel('rest', 2, config)).toBe('Next: Final round · 5:00')
    expect(upNextLabel('round', 3, config)).toBe('Final round')
    expect(upNextLabel('finished', 3, config)).toBeNull()
  })

  it('skips the rest preview when there is no rest, and never says final when unlimited', () => {
    expect(upNextLabel('round', 1, { ...config, restSeconds: 0 })).toBe('Next: Round 2')
    expect(upNextLabel('round', 40, openMat)).toBe('Next: Rest · 1:00')
    expect(upNextLabel('rest', 40, openMat)).toBe('Next: Round 41 · 5:00')
  })
})
