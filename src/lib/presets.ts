import type { TimerConfig } from './types'

export const PRESETS: TimerConfig[] = [
  {
    id: 'competition',
    label: 'Competition',
    rounds: 5,
    roundSeconds: 300,
    restSeconds: 60,
    getReadySeconds: 3,
    warningSeconds: 10,
  },
  {
    id: 'drilling',
    label: 'Drilling',
    rounds: 6,
    roundSeconds: 180,
    restSeconds: 30,
    getReadySeconds: 3,
    warningSeconds: 10,
  },
  {
    id: 'flowRolling',
    label: 'Flow Rolling',
    rounds: 4,
    roundSeconds: 480,
    restSeconds: 30,
    getReadySeconds: 3,
    warningSeconds: 10,
  },
]

export const DEFAULT_CUSTOM_CONFIG: TimerConfig = {
  id: 'custom',
  label: 'Custom',
  rounds: 5,
  roundSeconds: 300,
  restSeconds: 60,
  getReadySeconds: 3,
  warningSeconds: 10,
}

export function findPreset(id: string): TimerConfig | undefined {
  return PRESETS.find((preset) => preset.id === id)
}
