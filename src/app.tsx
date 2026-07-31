import { useEffect, useMemo, useRef, useState } from 'preact/hooks'
import { AriaLiveRegion } from './components/AriaLiveRegion'
import { Controls } from './components/Controls'
import { FullscreenToggle } from './components/FullscreenToggle'
import { GitHubLink } from './components/GitHubLink'
import { InstallPrompt } from './components/InstallPrompt'
import { LiveClock } from './components/LiveClock'
import { PhaseIndicator } from './components/PhaseIndicator'
import { PresetPicker } from './components/PresetPicker'
import { StatsView } from './components/StatsView'
import { ThemeToggle } from './components/ThemeToggle'
import { TimerDisplay } from './components/TimerDisplay'
import { VoicePicker } from './components/VoicePicker'
import { VolumeToggle } from './components/VolumeToggle'
import { useFullscreen } from './hooks/useFullscreen'
import { useHistory } from './hooks/useHistory'
import { useSettings } from './hooks/useSettings'
import { useTheme } from './hooks/useTheme'
import { useTimer } from './hooks/useTimer'
import { completedRoundsForPartialReset } from './lib/timerEngine'
import { phaseLabel } from './lib/format'
import type { SessionRecord } from './lib/history'

interface ActiveSession {
  startedAt: number
  logged: boolean
}

export function App() {
  const {
    selectedPresetId,
    setSelectedPresetId,
    customPresets,
    activeConfig,
    muted,
    setMuted,
    showClock,
    setShowClock,
    voice,
    setVoice,
    addCustomPreset,
    updateCustomPreset,
    deleteCustomPreset,
  } = useSettings()
  const { state, remainingMs, progressRatio, isWarning, actions } = useTimer(activeConfig, voice, muted)
  const { sessions, addSession, clearHistory, stats } = useHistory()
  const fullscreen = useFullscreen()
  const theme = useTheme()

  const [view, setView] = useState<'setup' | 'history'>('setup')
  const sessionRef = useRef<ActiveSession | null>(null)

  // Track when an active session started, for totalActiveMs in the history log.
  useEffect(() => {
    if (state.phase === 'idle') {
      sessionRef.current = null
    } else if (!sessionRef.current) {
      sessionRef.current = { startedAt: Date.now(), logged: false }
    }
  }, [state.phase])

  // Log a completed session the moment a session naturally finishes.
  useEffect(() => {
    if (state.phase === 'finished' && sessionRef.current && !sessionRef.current.logged) {
      sessionRef.current.logged = true
      addSession({
        id: crypto.randomUUID(),
        completedAt: Date.now(),
        presetLabel: state.config.label,
        roundsCompleted: state.config.rounds,
        totalRounds: state.config.rounds,
        unlimited: Boolean(state.config.unlimited),
        totalActiveMs: Date.now() - sessionRef.current.startedAt,
      })
    }
  }, [state.phase, state.config, addSession])

  function handleReset() {
    const active = sessionRef.current
    if (active && !active.logged && state.phase !== 'idle') {
      const roundsCompleted = completedRoundsForPartialReset(state.phase, state.currentRound)
      if (roundsCompleted > 0) {
        const record: SessionRecord = {
          id: crypto.randomUUID(),
          completedAt: Date.now(),
          presetLabel: state.config.label,
          roundsCompleted,
          totalRounds: state.config.rounds,
          unlimited: Boolean(state.config.unlimited),
          totalActiveMs: Date.now() - active.startedAt,
        }
        addSession(record)
      }
    }
    sessionRef.current = null
    actions.reset()
  }

  const announcement = useMemo(() => {
    if (state.phase === 'idle') return ''
    if (state.phase === 'finished') return 'Session complete. Great work.'
    return `${phaseLabel(state.phase)}, round ${state.currentRound}${
      state.config.unlimited ? '' : ` of ${state.config.rounds}`
    }`
  }, [state.phase, state.currentRound, state.config.rounds, state.config.unlimited])

  const isSetup = state.phase === 'idle'

  return (
    <div
      className={`mx-auto flex min-h-screen flex-col items-center px-6 py-10 ${isSetup ? 'max-w-lg' : 'max-w-4xl'}`}
    >
      <AriaLiveRegion message={announcement} />

      <header className="mb-8 flex w-full items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setView('setup')}
          aria-label="Go to setup"
          className="-mx-2 -my-1 flex min-w-0 items-center gap-2 rounded-xl px-2 py-1 transition active:scale-95 active:bg-accent/20 active:text-round"
        >
          <img src={`${import.meta.env.BASE_URL}icons/icon-192.png`} alt="" className="h-8 w-8 shrink-0" />
          <span className="truncate text-lg font-bold tracking-widest">ROLLWAVE</span>
          {stats.currentStreak > 0 && (
            <span
              className="ml-1 shrink-0 text-sm text-slate-900/50 dark:text-white/50"
              title={`${stats.currentStreak}-day streak`}
            >
              {stats.currentStreak}🔥
            </span>
          )}
        </button>
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          {showClock && <LiveClock />}
          {isSetup && (
            <button
              type="button"
              onClick={() => setView((v) => (v === 'history' ? 'setup' : 'history'))}
              aria-label={view === 'history' ? 'Back to timer setup' : 'View training history'}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-900/15 text-lg text-slate-900/70 transition hover:text-slate-900 active:scale-95 active:border-accent/60 active:bg-accent/20 active:text-round dark:border-white/15 dark:text-white/70 dark:hover:text-white"
            >
              {view === 'history' ? '⏱️' : '📊'}
            </button>
          )}
          {fullscreen.supported && <FullscreenToggle isFullscreen={fullscreen.isFullscreen} onToggle={fullscreen.toggle} />}
          <GitHubLink />
          <VolumeToggle muted={muted} onToggle={() => setMuted((prev) => !prev)} />
        </div>
      </header>

      {isSetup && view === 'history' ? (
        <StatsView stats={stats} sessions={sessions} onClose={() => setView('setup')} onClear={clearHistory} />
      ) : isSetup ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-8">
          <PresetPicker
            selectedPresetId={selectedPresetId}
            customPresets={customPresets}
            onSelectPreset={setSelectedPresetId}
            onAddCustom={addCustomPreset}
            onUpdateCustom={updateCustomPreset}
            onDeleteCustom={deleteCustomPreset}
          />
          <Controls
            phase={state.phase}
            isPaused={state.isPaused}
            onToggleStartPause={actions.toggleStartPause}
            onReset={handleReset}
            onSkip={actions.skip}
          />
          <div className="flex flex-col items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-slate-900/40 dark:text-white/40">
              <input
                type="checkbox"
                checked={showClock}
                onChange={(event) => setShowClock((event.target as HTMLInputElement).checked)}
                className="h-3.5 w-3.5 accent-accent"
              />
              Show live clock
            </label>
            <ThemeToggle preference={theme.preference} onChange={theme.setPreference} />
            <VoicePicker voice={voice} onChange={setVoice} />
          </div>
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-10">
          <TimerDisplay
            phase={state.phase}
            currentRound={state.currentRound}
            remainingMs={remainingMs}
            progressRatio={progressRatio}
            isWarning={isWarning}
          />
          <PhaseIndicator
            currentRound={state.currentRound}
            totalRounds={state.config.rounds}
            phase={state.phase}
            unlimited={Boolean(state.config.unlimited)}
          />
          <Controls
            phase={state.phase}
            isPaused={state.isPaused}
            onToggleStartPause={actions.toggleStartPause}
            onReset={handleReset}
            onSkip={actions.skip}
          />
        </div>
      )}

      <InstallPrompt />
    </div>
  )
}
