import { useEffect } from 'preact/hooks'

interface ShortcutHandlers {
  onToggleStartPause: () => void
  onReset: () => void
  onSkip: () => void
}

const EDITABLE_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT'])

/** Desktop ergonomics: space = start/pause, r = reset, s / arrow-right = skip. */
export function useKeyboardShortcuts({ onToggleStartPause, onReset, onSkip }: ShortcutHandlers) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target
      if (target instanceof HTMLElement && EDITABLE_TAGS.has(target.tagName)) return

      switch (event.code) {
        case 'Space':
          event.preventDefault()
          onToggleStartPause()
          break
        case 'KeyR':
          onReset()
          break
        case 'KeyS':
        case 'ArrowRight':
          onSkip()
          break
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onToggleStartPause, onReset, onSkip])
}
