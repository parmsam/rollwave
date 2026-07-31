import { useCallback, useEffect, useState } from 'preact/hooks'

/** Generic persisted-state hook: JSON-serialized, tolerant of storage errors, cross-tab synced. */
export function useLocalStorage<T>(key: string, defaultValue: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key)
      return raw ? (JSON.parse(raw) as T) : defaultValue
    } catch {
      return defaultValue
    }
  })

  const set = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const resolved = typeof next === 'function' ? (next as (prev: T) => T)(prev) : next
        try {
          localStorage.setItem(key, JSON.stringify(resolved))
        } catch {
          // storage unavailable (private browsing / quota) — keep in-memory state only
        }
        return resolved
      })
    },
    [key],
  )

  useEffect(() => {
    function onStorage(event: StorageEvent) {
      if (event.key !== key) return
      try {
        setValue(event.newValue ? (JSON.parse(event.newValue) as T) : defaultValue)
      } catch {
        // malformed value written by another tab — ignore
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [key, defaultValue])

  return [value, set] as const
}
