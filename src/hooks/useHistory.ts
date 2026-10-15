import { useCallback, useMemo } from 'preact/hooks'
import { computeStats } from '../lib/history'
import type { SessionRecord } from '../lib/history'
import { useLocalStorage } from './useLocalStorage'

const SCHEMA_VERSION = 1
const MAX_RECORDS = 200

interface StoredHistory {
  v: number
  sessions: SessionRecord[]
}

export function useHistory() {
  const [stored, setStored] = useLocalStorage<StoredHistory>('rollwave:history', {
    v: SCHEMA_VERSION,
    sessions: [],
  })
  const sessions = stored.v === SCHEMA_VERSION ? stored.sessions : []

  const addSession = useCallback(
    (session: SessionRecord) => {
      setStored((prev) => {
        const base = prev.v === SCHEMA_VERSION ? prev.sessions : []
        return { v: SCHEMA_VERSION, sessions: [session, ...base].slice(0, MAX_RECORDS) }
      })
    },
    [setStored],
  )

  const removeSession = useCallback(
    (id: string) => {
      setStored((prev) => ({
        v: SCHEMA_VERSION,
        sessions: (prev.v === SCHEMA_VERSION ? prev.sessions : []).filter((session) => session.id !== id),
      }))
    },
    [setStored],
  )

  const clearHistory = useCallback(() => setStored({ v: SCHEMA_VERSION, sessions: [] }), [setStored])

  /** Puts back a snapshot taken before a delete/clear (Undo). */
  const replaceHistory = useCallback(
    (snapshot: SessionRecord[]) => setStored({ v: SCHEMA_VERSION, sessions: snapshot }),
    [setStored],
  )

  const stats = useMemo(() => computeStats(sessions), [sessions])

  return { sessions, addSession, removeSession, clearHistory, replaceHistory, stats }
}
