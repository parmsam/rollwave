import { useEffect, useRef } from 'preact/hooks'

interface ShortcutHandlers {
  onToggleStartPause: () => void
  onReset: () => void
  onSkip: () => void
  onMute: () => void
  onFullscreen: () => void
  onHistory: () => void
  onHelp: () => void
  onEscape: () => void
}

const EDITABLE_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT'])

/** Desktop ergonomics. The list shown to users lives in `lib/shortcuts.ts` — keep both in sync. */
export function useKeyboardShortcuts(handlers: ShortcutHandlers) {
  // Read through a ref so the listener is bound once rather than re-bound on
  // every render (handlers are fresh closures each render in app.tsx).
  const handlersRef = useRef(handlers)
  handlersRef.current = handlers

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target
      if (target instanceof HTMLElement && (EDITABLE_TAGS.has(target.tagName) || target.isContentEditable)) return
      // Leave browser/OS shortcuts alone — without this, Cmd/Ctrl+R (reload)
      // would also end the session via the R shortcut on its way out.
      if (event.metaKey || event.ctrlKey || event.altKey) return

      const h = handlersRef.current
      if (event.key === '?') {
        h.onHelp()
        return
      }
      switch (event.code) {
        case 'Space':
          // A focused button would otherwise also "click" on Space, double-toggling.
          event.preventDefault()
          h.onToggleStartPause()
          break
        case 'KeyR':
          h.onReset()
          break
        case 'KeyS':
        case 'ArrowRight':
          h.onSkip()
          break
        case 'KeyM':
          h.onMute()
          break
        case 'KeyF':
          h.onFullscreen()
          break
        case 'KeyH':
          h.onHistory()
          break
        case 'Escape':
          h.onEscape()
          break
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}
