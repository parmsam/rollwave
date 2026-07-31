import { VOICE_OPTIONS } from '../lib/audioClips'

interface Props {
  voice: string
  onChange: (voice: string) => void
}

export function VoicePicker({ voice, onChange }: Props) {
  return (
    <div className="inline-flex items-center gap-0.5 rounded-full border border-slate-900/15 p-0.5 dark:border-white/15">
      {VOICE_OPTIONS.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => onChange(option.id)}
          title={option.description}
          className={`rounded-full px-2.5 py-1 text-xs transition active:scale-95 ${
            voice === option.id
              ? 'bg-accent-2 font-semibold text-ink'
              : 'text-slate-900/50 active:bg-accent-2/20 dark:text-white/50'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
