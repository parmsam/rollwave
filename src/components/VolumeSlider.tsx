interface Props {
  volume: number
  onChange: (volume: number) => void
}

export function VolumeSlider({ volume, onChange }: Props) {
  return (
    <label className="flex w-full max-w-[14rem] items-center gap-2 text-xs text-slate-900/50 dark:text-white/50">
      <span aria-hidden="true">🔉</span>
      <input
        type="range"
        min={0}
        max={100}
        step={5}
        value={Math.round(volume * 100)}
        onChange={(event) => onChange(Number((event.target as HTMLInputElement).value) / 100)}
        aria-label="Volume"
        className="h-1.5 flex-1 accent-accent"
      />
      <span className="w-8 shrink-0 text-right tabular-nums">{Math.round(volume * 100)}%</span>
    </label>
  )
}
