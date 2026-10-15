import type { TimerState } from './types'

/**
 * The in-progress session, persisted so a reload (or iOS evicting a
 * backgrounded PWA) doesn't throw away a session mid-round. Only the
 * deadline-based `TimerState` is needed to resume exactly — `RESTORE` in
 * `timerEngine.ts` catches it up to the wall clock — plus the bookkeeping
 * `app.tsx` needs to log the session to history exactly once.
 */
export interface ActiveSession {
  timer: TimerState
  startedAt: number
  logged: boolean
}

const KEY = 'rollwave:activeSession'
const SCHEMA_VERSION = 1

interface Stored extends ActiveSession {
  v: number
}

export function loadActiveSession(): ActiveSession | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const stored = JSON.parse(raw) as Stored
    if (stored.v !== SCHEMA_VERSION || !stored.timer || stored.timer.phase === 'idle') return null
    return { timer: stored.timer, startedAt: stored.startedAt, logged: stored.logged }
  } catch {
    return null
  }
}

export function saveActiveSession(session: ActiveSession | null): void {
  try {
    if (!session || session.timer.phase === 'idle') localStorage.removeItem(KEY)
    else localStorage.setItem(KEY, JSON.stringify({ v: SCHEMA_VERSION, ...session } satisfies Stored))
  } catch {
    // storage unavailable — the session just won't survive a reload
  }
}
