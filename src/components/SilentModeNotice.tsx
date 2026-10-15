import { useState } from 'preact/hooks'

const DISMISSED_KEY = 'rollwave:silentModeNoticeDismissed'

function isMobileDevice(): boolean {
  return /iphone|ipad|ipod|android/i.test(navigator.userAgent)
}

/**
 * There's no way to detect the iOS ring/silent switch (or Android media
 * volume) from the page. On iOS/Safari 17+ the Audio Session API sidesteps
 * the switch (see `setPlaybackSession` in useAudioPlayer.ts); everywhere
 * else, just tell mobile users up front.
 */
export function SilentModeNotice({ handledBySession }: { handledBySession: boolean }) {
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISSED_KEY) === '1')

  // Where the Audio Session API lets cues play through the switch (and the
  // user hasn't turned that off), the warning would just be wrong.
  if (dismissed || handledBySession || !isMobileDevice()) return null

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
