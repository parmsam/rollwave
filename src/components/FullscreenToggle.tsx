interface Props {
  isFullscreen: boolean
  onToggle: () => void
}

export function FullscreenToggle({ isFullscreen, onToggle }: Props) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
      className="rounded-full border border-white/15 p-2.5 text-lg text-white/70 transition hover:text-white active:scale-95"
    >
      ⛶
    </button>
  )
}
