interface Props {
  volume: number
  onChange: (volume: number) => void
}

// The real audio gain multiplier (`volume`) goes up to 3.0 (300%) — verified
// safe against clipping for every synthesized cue, see useAudioPlayer.ts —
// but showing "300%" on the slider reads as broken/distorted by normal UI
// convention (past 100% usually means something's wrong). Displaying at half
// scale (max label 150, matching the pre-boost slider's old ceiling) keeps
// the number feeling familiar while the full 3x headroom is still there
// under the hood: display = volume * 50, so 150 on screen = the real 3.0x.
const DISPLAY_SCALE = 50

export function VolumeSlider({ volume, onChange }: Props) {
  const displayValue = Math.round(volume * DISPLAY_SCALE)
  return (
    <label className="flex w-full max-w-[14rem] items-center gap-2 text-xs text-slate-900/50 dark:text-white/50">
      <span aria-hidden="true">🔉</span>
      <input
        type="range"
        min={0}
        max={150}
        step={5}
        value={displayValue}
        onInput={(event) => onChange(Number((event.target as HTMLInputElement).value) / DISPLAY_SCALE)}
        aria-label="Volume"
        className="h-1.5 flex-1 accent-accent"
      />
      <span className="w-8 shrink-0 text-right tabular-nums">{displayValue}%</span>
    </label>
  )
}
