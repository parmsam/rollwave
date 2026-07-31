import { useCallback, useEffect, useState } from 'preact/hooks'

export function useFullscreen() {
  const supported = typeof document !== 'undefined' && Boolean(document.documentElement.requestFullscreen)
  const [isFullscreen, setIsFullscreen] = useState(() => Boolean(document.fullscreenElement))

  useEffect(() => {
    function onChange() {
      setIsFullscreen(Boolean(document.fullscreenElement))
    }
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  const toggle = useCallback(() => {
    if (document.fullscreenElement) {
      void document.exitFullscreen()
    } else {
      document.documentElement.requestFullscreen().catch(() => {
        // unsupported/denied in this context — non-critical, ignore
      })
    }
  }, [])

  return { isFullscreen, toggle, supported }
}
