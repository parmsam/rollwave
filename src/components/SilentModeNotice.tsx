import { useState } from 'preact/hooks'

const DISMISSED_KEY = 'rollwave:silentModeNoticeDismissed'

function isMobileDevice(): boolean {
  return /iphone|ipad|ipod|android/i.test(navigator.userAgent)
}

/**
 * There's no reliable way to detect the iOS ring/silent switch (or Android
 * media volume) from the page, and attempts to force audio through it
 * (looping a silent <audio>/<video> element) aren't dependable either — see
 * CLAUDE.md's Audio section. So instead of guessing, just tell mobile users
 * up front.
 */
export function SilentModeNotice() {
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISSED_KEY) === '1')

  if (dismissed || !isMobileDevice()) return null

  function dismiss() {
    setDismissed(true)
    localStorage.setItem(DISMISSED_KEY, '1')
  }

  return (
    <div className="flex w-full max-w-sm items-center justify-between gap-3 rounded-2xl border border-warn/30 bg-warn/10 px-4 py-2.5 text-xs text-slate-900/80 dark:text-white/80">
      <span>🔇 Turn off silent mode so round cues aren&apos;t muted.</span>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="shrink-0 text-slate-900/50 dark:text-white/50"
      >
        ✕
      </button>
    </div>
  )
}
