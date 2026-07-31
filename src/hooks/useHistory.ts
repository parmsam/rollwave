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

  const clearHistory = useCallback(() => setStored({ v: SCHEMA_VERSION, sessions: [] }), [setStored])

  const stats = useMemo(() => computeStats(sessions), [sessions])

  return { sessions, addSession, clearHistory, stats }
}
