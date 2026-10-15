import { useCallback, useEffect, useRef } from 'preact/hooks'

/**
 * Keeps the screen awake during a session. Feature-detected — not all browsers support it.
 *
 * The browser silently drops the lock whenever the page is hidden (switching
 * apps, locking the phone), so `wanted` remembers the intent and the lock is
 * re-requested on every return to visibility — otherwise one glance at
 * another app mid-session would let the screen sleep for the rest of it.
 */
export function useWakeLock() {
  const sentinelRef = useRef<WakeLockSentinel | null>(null)
  const wantedRef = useRef(false)

  const request = useCallback(async () => {
    if (!('wakeLock' in navigator) || sentinelRef.current || document.hidden) return
    try {
      const sentinel = await navigator.wakeLock.request('screen')
      sentinel.addEventListener('release', () => {
        if (sentinelRef.current === sentinel) sentinelRef.current = null
      })
      sentinelRef.current = sentinel
    } catch {
      // denied (e.g. battery saver) or unsupported in this context — non-critical, retried on next visibility change
    }
  }, [])

  const acquire = useCallback(async () => {
    wantedRef.current = true
    await request()
  }, [request])

  const release = useCallback(async () => {
    wantedRef.current = false
    const sentinel = sentinelRef.current
    sentinelRef.current = null
    try {
      await sentinel?.release()
    } catch {
      // already released
    }
  }, [])

  useEffect(() => {
    function onVisibility() {
      if (!document.hidden && wantedRef.current) void request()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [request])

  return { acquire, release }
}
