import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks'
import { AriaLiveRegion } from './components/AriaLiveRegion'
import { BigDigitsDisplay } from './components/BigDigitsDisplay'
import { Controls } from './components/Controls'
import { FullscreenToggle } from './components/FullscreenToggle'
import { GitHubLink } from './components/GitHubLink'
import { HistoryIcon, TimerIcon } from './components/icons'
import { InstallPrompt } from './components/InstallPrompt'
import { LiveClock } from './components/LiveClock'
import { PhaseIndicator } from './components/PhaseIndicator'
import { PresetPicker } from './components/PresetPicker'
import { SettingsPanel } from './components/SettingsPanel'
import { ShortcutsHelp } from './components/ShortcutsHelp'
import { SilentModeNotice } from './components/SilentModeNotice'
import { StatsView } from './components/StatsView'
import { TimerDisplay } from './components/TimerDisplay'
import { Toast, type ToastMessage } from './components/Toast'
import { UpdateBanner } from './components/UpdateBanner'
import { VolumeToggle } from './components/VolumeToggle'
import { canPlayThroughSilentMode } from './hooks/useAudioPlayer'
import { useAppUpdate } from './hooks/useAppUpdate'
import { useDocumentStatus } from './hooks/useDocumentStatus'
import { useFullscreen } from './hooks/useFullscreen'
import { useHistory } from './hooks/useHistory'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { useSettings } from './hooks/useSettings'
import { useTheme } from './hooks/useTheme'
import { useTimer } from './hooks/useTimer'
import { loadActiveSession, saveActiveSession } from './lib/activeSession'
import { completedRoundsForPartialReset } from './lib/timerEngine'
import { describePreset, formatSessionTotal, phaseLabel } from './lib/format'
import type { SessionRecord } from './lib/history'
import type { TimerState } from './lib/types'

interface SessionBookkeeping {
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
    volume,
    setVolume,
    showClock,
    setShowClock,
    voice,
    setVoice,
    displayStyle,
    setDisplayStyle,
    playThroughSilent,
    setPlayThroughSilent,
    addCustomPreset,
    updateCustomPreset,
    deleteCustomPreset,
  } = useSettings()
  // Read once: a session that was running when the page was last closed/reloaded.
  const [restored] = useState(loadActiveSession)
  const { state, remainingMs, progressRatio, isWarning, needsAudioUnlock, preview, actions } = useTimer(
    activeConfig,
    { voice, muted, volume, playThroughSilent },
    restored?.timer,
  )
  const { sessions, addSession, removeSession, clearHistory, replaceHistory, stats } = useHistory()
  const fullscreen = useFullscreen()
  const theme = useTheme()
  useDocumentStatus(state, remainingMs, progressRatio, isWarning)
  const appUpdate = useAppUpdate()

  const [view, setView] = useState<'setup' | 'history'>('setup')
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [toast, setToast] = useState<ToastMessage | null>(null)
  const dismissToast = useCallback(() => setToast(null), [])
  const showToast = useCallback((message: string, action?: ToastMessage['action']) => {
    setToast({ id: Date.now(), message, action })
  }, [])
  const sessionRef = useRef<SessionBookkeeping | null>(
    restored ? { startedAt: restored.startedAt, logged: restored.logged } : null,
  )

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

  // Persist the running session so a reload resumes it instead of losing it.
  // `state` only changes reference at real transitions (start, pause, phase
  // change...), not on every tick, so this writes rarely. Declared after the
  // logging effect above so a just-logged session is saved as `logged`.
  useEffect(() => {
    const active = sessionRef.current
    saveActiveSession(active ? { timer: state, startedAt: active.startedAt, logged: active.logged } : null)
  }, [state])

  function handleReset() {
    const active = sessionRef.current
    const endingEarly = active !== null && state.phase !== 'idle' && state.phase !== 'finished'
    const snapshot: { timer: TimerState; session: SessionBookkeeping } | null =
      endingEarly && active ? { timer: state, session: { ...active } } : null
    let loggedRecordId: string | null = null
    let roundsLogged = 0

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
        loggedRecordId = record.id
        roundsLogged = roundsCompleted
      }
    }
    sessionRef.current = null
    actions.reset()

    // Reset sits right next to Pause, so a mis-tap mid-round shouldn't cost
    // the whole session — offer an Undo that picks up where the clock is now.
    if (snapshot) {
      showToast(
        roundsLogged > 0 ? `Session ended · ${roundsLogged} round${roundsLogged === 1 ? '' : 's'} logged` : 'Session ended',
        {
          label: 'Undo',
          run: () => {
            if (loggedRecordId) removeSession(loggedRecordId)
            sessionRef.current = snapshot.session
            actions.restore(snapshot.timer)
          },
        },
      )
    }
  }

  function handleClearHistory() {
    const snapshot = sessions
    clearHistory()
    showToast('History cleared', { label: 'Undo', run: () => replaceHistory(snapshot) })
  }

  function handleDeleteSession(id: string) {
    const snapshot = sessions
    removeSession(id)
    showToast('Session deleted', { label: 'Undo', run: () => replaceHistory(snapshot) })
  }

  const isSetup = state.phase === 'idle'

  useKeyboardShortcuts({
    onToggleStartPause: state.phase === 'finished' ? handleReset : actions.toggleStartPause,
    onReset: () => {
      if (state.phase !== 'idle') handleReset()
    },
    onSkip: actions.skip,
    onMute: () => setMuted((prev) => !prev),
    onFullscreen: () => {
      if (fullscreen.supported) fullscreen.toggle()
    },
    onHistory: () => {
      if (isSetup) setView((v) => (v === 'history' ? 'setup' : 'history'))
    },
    onHelp: () => setShowShortcuts((v) => !v),
    onEscape: () => {
      if (showShortcuts) setShowShortcuts(false)
      else if (view === 'history') setView('setup')
    },
  })

  const announcement = useMemo(() => {
    if (state.phase === 'idle') return ''
    if (state.phase === 'finished') return 'Session complete. Great work.'
    return `${phaseLabel(state.phase)}, round ${state.currentRound}${
      state.config.unlimited ? '' : ` of ${state.config.rounds}`
    }`
  }, [state.phase, state.currentRound, state.config.rounds, state.config.unlimited])

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
          {showClock && !(!isSetup && displayStyle === 'digits') && <LiveClock />}
          {isSetup && (
            <button
              type="button"
              onClick={() => setView((v) => (v === 'history' ? 'setup' : 'history'))}
              aria-label={view === 'history' ? 'Back to timer setup' : 'View training history'}
              title={view === 'history' ? 'Back to timer' : 'Training history'}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-900/15 text-lg text-slate-900/70 transition hover:text-slate-900 active:scale-95 active:border-accent/60 active:bg-accent/20 active:text-round dark:border-white/15 dark:text-white/70 dark:hover:text-white"
            >
              {view === 'history' ? <TimerIcon /> : <HistoryIcon />}
            </button>
          )}
          {fullscreen.supported && <FullscreenToggle isFullscreen={fullscreen.isFullscreen} onToggle={fullscreen.toggle} />}
          {/* Running view stays distraction-free: nothing there that navigates away. */}
          {isSetup && <GitHubLink />}
          <VolumeToggle muted={muted} onToggle={() => setMuted((prev) => !prev)} />
        </div>
      </header>

      {isSetup && view === 'history' ? (
        <StatsView
          stats={stats}
          sessions={sessions}
          onClose={() => setView('setup')}
          onClear={handleClearHistory}
          onDelete={handleDeleteSession}
        />
      ) : isSetup ? (
        <div className="flex w-full flex-1 flex-col items-center gap-8">
          {appUpdate.updateAvailable && <UpdateBanner onReload={appUpdate.reload} />}
          <SilentModeNotice handledBySession={playThroughSilent && canPlayThroughSilentMode()} />
          <InstallPrompt />
          <PresetPicker
            selectedPresetId={selectedPresetId}
            customPresets={customPresets}
            onSelectPreset={setSelectedPresetId}
            onAddCustom={addCustomPreset}
            onUpdateCustom={updateCustomPreset}
            onDeleteCustom={deleteCustomPreset}
          />
          <SettingsPanel
            displayStyle={displayStyle}
            onDisplayStyle={setDisplayStyle}
            voice={voice}
            onVoice={setVoice}
            onPreviewVoice={preview.voice}
            volume={volume}
            onVolume={setVolume}
            onPreviewVolume={preview.volume}
            theme={theme.preference}
            onTheme={theme.setPreference}
            showClock={showClock}
            onShowClock={setShowClock}
            playThroughSilent={canPlayThroughSilentMode() ? playThroughSilent : null}
            onPlayThroughSilent={setPlayThroughSilent}
            onShowShortcuts={() => setShowShortcuts(true)}
          />
          {/* Start stays pinned to the bottom of the screen, with a summary of
              what's about to run — editing a custom mode used to push it off
              the bottom of a phone screen. */}
          <div className="sticky bottom-0 z-10 -mx-6 -mb-10 mt-auto flex w-[calc(100%+3rem)] flex-col items-center gap-2 bg-linear-to-t from-page from-75% to-transparent px-6 pt-12 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            <p className="max-w-full truncate text-xs text-slate-900/55 dark:text-white/55">
              <span className="font-semibold text-slate-900/80 dark:text-white/80">{activeConfig.label}</span>
              {' · '}
              {describePreset(activeConfig)}
              {' · '}
              {formatSessionTotal(activeConfig)}
            </p>
            <Controls
              phase={state.phase}
              isPaused={state.isPaused}
              onToggleStartPause={actions.toggleStartPause}
              onReset={handleReset}
              onSkip={actions.skip}
            />
          </div>
        </div>
      ) : (
        <div className="flex w-full flex-1 flex-col items-center justify-center gap-10">
          {/* The whole readout is one big pause/resume target — far easier to
              hit mid-roll (or with gloves/sweaty hands) than the button. */}
          <button
            type="button"
            onClick={state.phase === 'finished' ? undefined : actions.toggleStartPause}
            disabled={state.phase === 'finished'}
            aria-label={state.isPaused ? 'Resume timer' : 'Pause timer'}
            className={`flex flex-col items-center justify-center rounded-3xl select-none [-webkit-tap-highlight-color:transparent] ${
              // Big digits bleed past the container's px-6 to use the full viewport width.
              displayStyle === 'digits' ? '-mx-6 w-[calc(100%+3rem)] flex-1' : 'w-full'
            }`}
          >
            {displayStyle === 'digits' ? (
              <BigDigitsDisplay
                phase={state.phase}
                currentRound={state.currentRound}
                remainingMs={remainingMs}
                isWarning={isWarning}
                isPaused={state.isPaused}
                showClock={showClock}
              />
            ) : (
              <TimerDisplay
                phase={state.phase}
                currentRound={state.currentRound}
                remainingMs={remainingMs}
                progressRatio={progressRatio}
                isWarning={isWarning}
                isPaused={state.isPaused}
              />
            )}
          </button>
          {needsAudioUnlock && (
            <button
              type="button"
              className="rounded-full border border-warn/40 bg-warn/10 px-4 py-2 text-sm text-slate-900/80 transition active:scale-95 active:bg-warn/20 dark:text-white/80"
            >
              🔈 Session restored — tap to turn sound back on
            </button>
          )}
          <PhaseIndicator currentRound={state.currentRound} phase={state.phase} config={state.config} />
          <Controls
            phase={state.phase}
            isPaused={state.isPaused}
            onToggleStartPause={actions.toggleStartPause}
            onReset={handleReset}
            onSkip={actions.skip}
          />
        </div>
      )}

      <Toast toast={toast} onDismiss={dismissToast} raised={isSetup && view === 'setup'} />
      {showShortcuts && <ShortcutsHelp onClose={() => setShowShortcuts(false)} />}
    </div>
  )
}
