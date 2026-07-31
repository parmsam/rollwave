interface Props {
  label: string
  value: number
  step: number
  min: number
  max: number
  onChange: (value: number) => void
  format?: (value: number) => string
}

export function Stepper({ label, value, step, min, max, onChange, format }: Props) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <span className="text-sm text-white/70">{label}</span>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - step))}
          aria-label={`Decrease ${label}`}
          className="h-8 w-8 rounded-full border border-white/15 text-white/80 transition active:scale-95"
        >
          −
        </button>
        <span className="w-16 text-center font-mono tabular-nums">{format ? format(value) : value}</span>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + step))}
          aria-label={`Increase ${label}`}
          className="h-8 w-8 rounded-full border border-white/15 text-white/80 transition active:scale-95"
        >
          +
        </button>
      </div>
    </div>
  )
}
