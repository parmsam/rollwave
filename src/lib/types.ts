export type Phase = 'idle' | 'getReady' | 'round' | 'rest' | 'finished'

/** Built-in presets use fixed ids; saved custom presets get a generated string id. */
export type PresetId = string

export interface TimerConfig {
  id: PresetId
  label: string
  rounds: number
  roundSeconds: number
  restSeconds: number
  getReadySeconds: number
  warningSeconds: number
  /** When true, rounds repeat indefinitely (until Reset) and `rounds` is ignored. */
  unlimited?: boolean
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
