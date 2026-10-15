import { useEffect, useRef } from 'preact/hooks'
import { useRegisterSW } from 'virtual:pwa-register/preact'

const CHECK_INTERVAL_MS = 60 * 60 * 1000

/**
 * Service-worker updates, user-controlled. The browser only looks for a new
 * version on navigation, and an installed PWA left open (or reopened from
 * the app switcher) may go days without one — so we also check hourly and
 * whenever the app comes back to the foreground. A found update downloads in
 * the background and then *waits*; `updateAvailable` turns on the Reload
 * button, and `reload()` activates the new version and reloads the page.
 */
export function useAppUpdate() {
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null)
  const {
    needRefresh: [updateAvailable],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      registrationRef.current = registration ?? null
    },
  })

  useEffect(() => {
    function check() {
      // Offline checks just fail; skip them rather than log errors.
      if (navigator.onLine) void registrationRef.current?.update().catch(() => {})
    }
    function onVisibility() {
      if (document.visibilityState === 'visible') check()
    }
    const id = window.setInterval(check, CHECK_INTERVAL_MS)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  async function reload() {
    // Normal case: tell the waiting worker to take over; the library then
    // reloads the page once it has (workbox-window's `controlling` event).
    const controlled = Boolean(navigator.serviceWorker?.controller)
    await updateServiceWorker(true)
    // But on a first visit the page was never controlled by any worker
    // (this config doesn't claim clients), so that hand-off event never
    // fires and the button would do nothing. Reload directly instead — an
    // uncontrolled page loads from the network, which already has the new
    // version, and the new worker controls every load after that.
    if (!controlled) window.location.reload()
  }

  return { updateAvailable, reload: () => void reload() }
}
