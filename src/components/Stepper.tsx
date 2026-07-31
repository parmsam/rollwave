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
      <span className="text-sm text-slate-900/70 dark:text-white/70">{label}</span>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - step))}
          aria-label={`Decrease ${label}`}
          className="h-8 w-8 rounded-full border border-slate-900/15 text-slate-900/80 transition active:scale-95 active:border-accent/60 active:bg-accent/20 active:text-round dark:border-white/15 dark:text-white/80"
        >
          −
        </button>
        <span className="w-16 text-center font-mono tabular-nums">{format ? format(value) : value}</span>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + step))}
          aria-label={`Increase ${label}`}
          className="h-8 w-8 rounded-full border border-slate-900/15 text-slate-900/80 transition active:scale-95 active:border-accent/60 active:bg-accent/20 active:text-round dark:border-white/15 dark:text-white/80"
        >
          +
        </button>
      </div>
    </div>
  )
}
