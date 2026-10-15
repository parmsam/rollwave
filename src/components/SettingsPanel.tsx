import type { ComponentChildren } from 'preact'
import type { DisplayStyle } from '../hooks/useSettings'
import type { ThemePreference } from '../hooks/useTheme'
import { VOICE_OPTIONS } from '../lib/audioClips'
import { Segmented } from './Segmented'
import { Switch } from './Switch'

// The real audio gain multiplier (`volume`) goes up to 3.0 (300%) — verified
// safe against clipping for every synthesized cue, see useAudioPlayer.ts —
// but showing "300%" on the slider reads as broken/distorted by normal UI
// convention. Displaying at half scale (display = volume * 50, so 150 on
// screen = the real 3.0x) keeps the number familiar with full headroom.
const VOLUME_DISPLAY_SCALE = 50

const DISPLAY_OPTIONS = [
  { id: 'ring', label: 'Ring' },
  { id: 'digits', label: 'Big digits' },
] as const satisfies readonly { id: DisplayStyle; label: string }[]

const THEME_OPTIONS = [
  { id: 'system', label: 'Auto' },
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
] as const satisfies readonly { id: ThemePreference; label: string }[]

interface Props {
  displayStyle: DisplayStyle
  onDisplayStyle: (style: DisplayStyle) => void
  voice: string
  onVoice: (voice: string) => void
  onPreviewVoice: (voice: string) => void
  volume: number
  onVolume: (volume: number) => void
  onPreviewVolume: () => void
  theme: ThemePreference
  onTheme: (theme: ThemePreference) => void
  showClock: boolean
  onShowClock: (show: boolean) => void
  /** Null where the Audio Session API is missing — the row is hidden there. */
  playThroughSilent: boolean | null
  onPlayThroughSilent: (on: boolean) => void
  onShowShortcuts: () => void
}

function Row({ label, hint, children }: { label: string; hint?: string; children: ComponentChildren }) {
  return (
    <div className="flex items-center justify-between gap-3 py-3">
      <div className="min-w-0">
        <div className="text-sm text-slate-900/80 dark:text-white/80">{label}</div>
        {hint && <div className="text-xs text-slate-900/45 dark:text-white/45">{hint}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

/**
 * Every pre-session preference in one labeled card. These used to be a
 * stack of unlabeled pills under Start ("Onyx / Nova / Fable" gave no hint
 * that it was a voice), so each row now says what it controls.
 */
export function SettingsPanel(props: Props) {
  const voiceHint = VOICE_OPTIONS.find((option) => option.id === props.voice)?.description
  const displayVolume = Math.round(props.volume * VOLUME_DISPLAY_SCALE)

  return (
    <section aria-labelledby="settings-title" className="w-full max-w-sm">
      <h2
        id="settings-title"
        className="mb-2 px-1 text-xs font-semibold tracking-[0.2em] text-slate-900/50 uppercase dark:text-white/50"
      >
        Settings
      </h2>
      <div className="divide-y divide-slate-900/10 rounded-2xl border border-slate-900/10 px-4 dark:divide-white/10 dark:border-white/10">
        <Row label="Timer display" hint={props.displayStyle === 'ring' ? 'Progress ring' : 'Readable across the mat'}>
          <Segmented
            label="Timer display"
            options={DISPLAY_OPTIONS}
            value={props.displayStyle}
            onChange={props.onDisplayStyle}
          />
        </Row>
        <Row label="Voice" hint={voiceHint ? `${voiceHint} · tap to hear it` : 'Tap to hear it'}>
          <Segmented
            label="Announcer voice"
            tone="accent-2"
            options={VOICE_OPTIONS.map((option) => ({ id: option.id, label: option.label, title: option.description }))}
            value={props.voice}
            onChange={(voice) => {
              props.onVoice(voice)
              void props.onPreviewVoice(voice)
            }}
          />
        </Row>
        <div className="py-3">
          <label htmlFor="volume" className="flex items-center justify-between text-sm text-slate-900/80 dark:text-white/80">
            Volume
            <span className="text-xs text-slate-900/50 tabular-nums dark:text-white/50">{displayVolume}%</span>
          </label>
          <input
            id="volume"
            type="range"
            min={0}
            max={150}
            step={5}
            value={displayVolume}
            onInput={(event) => props.onVolume(Number((event.target as HTMLInputElement).value) / VOLUME_DISPLAY_SCALE)}
            // `change` fires on release, not while dragging — one test chime, not dozens.
            onChange={props.onPreviewVolume}
            className="mt-2 h-1.5 w-full accent-accent"
          />
        </div>
        <Row label="Theme">
          <Segmented label="Theme" options={THEME_OPTIONS} value={props.theme} onChange={props.onTheme} />
        </Row>
        <Row label="Show current time" hint="Clock in the header">
          <Switch label="Show current time" checked={props.showClock} onChange={props.onShowClock} />
        </Row>
        {props.playThroughSilent !== null && (
          <Row label="Ignore silent switch" hint="Cues still play on silent; may pause other audio during a session">
            <Switch
              label="Play cues through silent mode"
              checked={props.playThroughSilent}
              onChange={props.onPlayThroughSilent}
            />
          </Row>
        )}
      </div>
      <div className="mt-3 flex items-center justify-between gap-3 px-1 text-xs text-slate-900/45 dark:text-white/45">
        <button
          type="button"
          onClick={props.onShowShortcuts}
          className="hidden rounded-lg py-1 underline transition active:bg-accent/20 active:text-round pointer-fine:inline-block"
        >
          Keyboard shortcuts (?)
        </button>
        <span className="ml-auto tabular-nums" title={__APP_COMMIT__ ? `Build ${__APP_COMMIT__}` : undefined}>
          ROLLWAVE v{__APP_VERSION__}
          {__APP_COMMIT__ && <span className="text-slate-900/30 dark:text-white/30"> · {__APP_COMMIT__}</span>}
        </span>
      </div>
    </section>
  )
}
