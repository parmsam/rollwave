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
      className="rounded-full border border-white/15 p-2.5 text-lg text-white/70 transition hover:text-white active:scale-95 active:border-accent/60 active:bg-accent/20 active:text-round"
    >
      {muted ? '🔇' : '🔊'}
    </button>
  )
}
