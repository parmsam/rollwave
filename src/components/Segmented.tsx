interface Option<T extends string> {
  id: T
  label: string
  title?: string
}

interface Props<T extends string> {
  label: string
  options: readonly Option<T>[]
  value: T
  onChange: (value: T) => void
  /** Purple for the voice picker, cyan everywhere else — matches the app's two accents. */
  tone?: 'accent' | 'accent-2'
}

/** Pill-shaped single-choice control (exposed as a radio group). */
export function Segmented<T extends string>({ label, options, value, onChange, tone = 'accent' }: Props<T>) {
  const selectedClass = tone === 'accent' ? 'bg-accent font-semibold text-ink' : 'bg-accent-2 font-semibold text-ink'
  const pressClass = tone === 'accent' ? 'active:bg-accent/20' : 'active:bg-accent-2/20'
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="inline-flex items-center gap-0.5 rounded-full border border-slate-900/15 p-0.5 dark:border-white/15"
    >
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          role="radio"
          aria-checked={value === option.id}
          onClick={() => onChange(option.id)}
          title={option.title}
          className={`rounded-full px-3 py-1.5 text-xs transition active:scale-95 ${
            value === option.id ? selectedClass : `text-slate-900/55 dark:text-white/55 ${pressClass}`
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
