import { useEffect, useState } from 'preact/hooks'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}
interface NavigatorStandalone extends Navigator {
  standalone?: boolean
}

const DISMISSED_KEY = 'rollwave:installDismissed'

function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as NavigatorStandalone).standalone === true
  )
}

export function InstallPrompt() {
  const [deferredEvent, setDeferredEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISSED_KEY) === '1')
  const [showIosHint, setShowIosHint] = useState(false)

  useEffect(() => {
    if (isStandalone()) return
    if (isIos()) {
      setShowIosHint(true)
      return
    }
    function onBeforeInstallPrompt(event: Event) {
      event.preventDefault()
      setDeferredEvent(event as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
  }, [])

  if (dismissed || isStandalone() || (!deferredEvent && !showIosHint)) return null

  function dismiss() {
    setDismissed(true)
    localStorage.setItem(DISMISSED_KEY, '1')
  }

  async function install() {
    if (!deferredEvent) return
    await deferredEvent.prompt()
    await deferredEvent.userChoice
    setDeferredEvent(null)
  }

  return (
    // Inline on the setup screen (not a floating banner) so it can never
    // cover the pinned Start bar, and never shows during a session.
    <div className="flex w-full max-w-sm items-center justify-between gap-3 rounded-2xl border border-accent/30 bg-accent/10 px-4 py-2.5 text-xs text-slate-900/80 dark:text-white/80">
      <span>
        {showIosHint
          ? 'Install ROLLWAVE: tap Share, then "Add to Home Screen".'
          : 'Install ROLLWAVE for quick, offline access on the mat.'}
      </span>
      <div className="flex shrink-0 gap-2">
        {deferredEvent && (
          <button
            type="button"
            onClick={install}
            className="rounded-full bg-accent px-3 py-1.5 font-semibold text-ink"
          >
            Install
          </button>
        )}
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className="text-slate-900/50 dark:text-white/50"
        >
          ✕
        </button>
      </div>
    </div>
  )
}
