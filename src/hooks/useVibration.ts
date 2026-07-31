import { useCallback } from 'preact/hooks'

/** No-op on browsers without the Vibration API (notably iOS Safari) — never throws. */
export function useVibration() {
  return useCallback((pattern: number | number[]) => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(pattern)
    }
  }, [])
}
