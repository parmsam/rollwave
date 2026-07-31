import type { ThemePreference } from '../hooks/useTheme'

interface Props {
  preference: ThemePreference
  onChange: (preference: ThemePreference) => void
}

const OPTIONS: { id: ThemePreference; label: string }[] = [
  { id: 'system', label: 'Auto' },
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
]

export function ThemeToggle({ preference, onChange }: Props) {
  return (
    <div className="inline-flex items-center gap-0.5 rounded-full border border-slate-900/15 p-0.5 dark:border-white/15">
      {OPTIONS.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => onChange(option.id)}
          className={`rounded-full px-2.5 py-1 text-xs transition active:scale-95 ${
            preference === option.id
              ? 'bg-accent font-semibold text-ink'
              : 'text-slate-900/50 active:bg-accent/20 dark:text-white/50'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
