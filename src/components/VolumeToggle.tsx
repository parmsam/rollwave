interface Props {
  muted: boolean
  onToggle: () => void
}

export function VolumeToggle({ muted, onToggle }: Props) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={muted ? 'Unmute sound' : 'Mute sound'}
      className="rounded-full border border-slate-900/15 p-2.5 text-lg text-slate-900/70 transition hover:text-slate-900 active:scale-95 active:border-accent/60 active:bg-accent/20 active:text-round dark:border-white/15 dark:text-white/70 dark:hover:text-white"
    >
      {muted ? '🔇' : '🔊'}
    </button>
  )
}
