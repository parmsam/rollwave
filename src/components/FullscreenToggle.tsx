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
      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-900/15 text-lg text-slate-900/70 transition hover:text-slate-900 active:scale-95 active:border-accent/60 active:bg-accent/20 active:text-round dark:border-white/15 dark:text-white/70 dark:hover:text-white"
    >
      ⛶
    </button>
  )
}
