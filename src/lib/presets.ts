import type { TimerConfig } from './types'

export const PRESETS: TimerConfig[] = [
  {
    id: 'competition',
    label: 'Competition',
    rounds: 5,
    roundSeconds: 300,
    restSeconds: 60,
    getReadySeconds: 10,
    warningSeconds: 10,
  },
  {
    id: 'drilling',
    label: 'Drilling',
    rounds: 6,
    roundSeconds: 180,
    restSeconds: 30,
    getReadySeconds: 10,
    warningSeconds: 10,
  },
  {
    id: 'flowRolling',
    label: 'Flow Rolling',
    rounds: 4,
    roundSeconds: 480,
    restSeconds: 30,
    getReadySeconds: 10,
    warningSeconds: 10,
  },
  {
    id: 'openMat',
    label: 'Open Mat',
    rounds: 1,
    roundSeconds: 300,
    restSeconds: 60,
    getReadySeconds: 10,
    warningSeconds: 10,
    unlimited: true,
  },
]

/** A fresh, user-nameable custom preset — saved into settings and revisited later. */
export function createCustomPreset(index: number): TimerConfig {
  return {
    id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    label: `Custom ${index}`,
    rounds: 5,
    roundSeconds: 300,
    restSeconds: 60,
    getReadySeconds: 10,
    warningSeconds: 10,
  }
}
