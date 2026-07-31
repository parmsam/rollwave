import { useEffect } from 'preact/hooks'
import { useLocalStorage } from './useLocalStorage'

export type ThemePreference = 'system' | 'light' | 'dark'

// Mirrors the inline script in index.html (which sets the initial
// data-theme before first paint, to avoid a flash of the wrong theme) —
// keep the two in sync if this logic ever changes.
function resolveEffectiveTheme(preference: ThemePreference): 'light' | 'dark' {
  if (preference === 'light' || preference === 'dark') return preference
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

/** Manual Light/Dark override, defaulting to (and able to fall back to) the OS preference. */
export function useTheme() {
  const [preference, setPreference] = useLocalStorage<ThemePreference>('rollwave:themePreference', 'system')

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', resolveEffectiveTheme(preference))

    if (preference !== 'system') return
    // While following the system setting, keep it live-updated if the OS
    // theme changes while the app is open (no reload required).
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    function onChange() {
      document.documentElement.setAttribute('data-theme', media.matches ? 'dark' : 'light')
    }
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [preference])

  return { preference, setPreference }
}
