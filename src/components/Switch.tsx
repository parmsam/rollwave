interface Props {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
}

/**
 * On/off toggle styled as a switch — a bare browser checkbox read as an
 * unstyled white box in dark mode. Still a real checkbox underneath
 * (`role="switch"`), so it's keyboard- and screen-reader-native.
 */
export function Switch({ checked, onChange, label }: Props) {
  return (
    <span className="relative inline-flex h-6 w-11 shrink-0">
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        aria-label={label}
        onChange={(event) => onChange((event.target as HTMLInputElement).checked)}
        className="peer absolute inset-0 z-10 m-0 cursor-pointer opacity-0"
      />
      <span
        aria-hidden="true"
        className="absolute inset-0 rounded-full bg-slate-900/15 transition-colors peer-checked:bg-accent peer-focus-visible:ring-2 peer-focus-visible:ring-accent/60 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-page dark:bg-white/15"
      />
      <span
        aria-hidden="true"
        className="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5"
      />
    </span>
  )
}
