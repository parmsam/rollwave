import { useCallback, useRef } from 'preact/hooks'

/** Keeps the screen awake during a session. Feature-detected — not all browsers support it. */
export function useWakeLock() {
  const sentinelRef = useRef<WakeLockSentinel | null>(null)

  const acquire = useCallback(async () => {
    if (!('wakeLock' in navigator)) return
    try {
      sentinelRef.current = await navigator.wakeLock.request('screen')
    } catch {
      // denied or unsupported in this context — non-critical, ignore
    }
  }, [])

  const release = useCallback(async () => {
    try {
      await sentinelRef.current?.release()
    } catch {
      // already released
    }
    sentinelRef.current = null
  }, [])

  return { acquire, release }
}
