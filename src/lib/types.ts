export type Phase = 'idle' | 'getReady' | 'round' | 'rest' | 'finished'

export type PresetId = 'competition' | 'drilling' | 'flowRolling' | 'custom'

export interface TimerConfig {
  id: PresetId
  label: string
  rounds: number
  roundSeconds: number
  restSeconds: number
  getReadySeconds: number
  warningSeconds: number
}

export interface TimerState {
  phase: Phase
  isPaused: boolean
  /** 1-indexed; 0 while idle. */
  currentRound: number
  /** Absolute deadline for the current phase. Null while idle/finished/paused. */
  phaseEndsAtEpochMs: number | null
  /** Frozen remaining time, set only while paused. */
  phaseRemainingMsAtPause: number | null
  config: TimerConfig
}

export type TimerAction =
  | { type: 'CONFIGURE'; config: TimerConfig }
  | { type: 'START' }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'SKIP' }
  | { type: 'RESET' }
  | { type: 'TICK' }
