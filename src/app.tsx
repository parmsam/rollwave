import { useMemo } from 'preact/hooks'
import { AriaLiveRegion } from './components/AriaLiveRegion'
import { Controls } from './components/Controls'
import { InstallPrompt } from './components/InstallPrompt'
import { PhaseIndicator } from './components/PhaseIndicator'
import { PresetPicker } from './components/PresetPicker'
import { TimerDisplay } from './components/TimerDisplay'
import { VolumeToggle } from './components/VolumeToggle'
import { useSettings } from './hooks/useSettings'
import { useTimer } from './hooks/useTimer'
import { phaseLabel } from './lib/format'

export function App() {
  const {
    selectedPresetId,
    setSelectedPresetId,
    customConfig,
    setCustomConfig,
    activeConfig,
    muted,
    setMuted,
  } = useSettings()
  const { state, remainingMs, progressRatio, isWarning, actions } = useTimer(activeConfig, muted)

  const announcement = useMemo(() => {
    if (state.phase === 'idle') return ''
    if (state.phase === 'finished') return 'Session complete. Great work.'
    return `${phaseLabel(state.phase)}, round ${state.currentRound} of ${state.config.rounds}`
  }, [state.phase, state.currentRound, state.config.rounds])

  const isSetup = state.phase === 'idle'

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col items-center px-6 py-10">
      <AriaLiveRegion message={announcement} />

      <header className="mb-8 flex w-full items-center justify-between">
        <div className="flex items-center gap-2">
          <img src={`${import.meta.env.BASE_URL}icons/icon-192.png`} alt="" className="h-8 w-8" />
          <span className="text-lg font-bold tracking-widest">ROLLWAVE</span>
        </div>
        <VolumeToggle muted={muted} onToggle={() => setMuted((prev) => !prev)} />
      </header>

      {isSetup ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-8">
          <PresetPicker
            selectedPresetId={selectedPresetId}
            customConfig={customConfig}
            onSelectPreset={setSelectedPresetId}
            onChangeCustom={setCustomConfig}
          />
          <Controls
            phase={state.phase}
            isPaused={state.isPaused}
            onToggleStartPause={actions.toggleStartPause}
            onReset={actions.reset}
            onSkip={actions.skip}
          />
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
          <PhaseIndicator currentRound={state.currentRound} totalRounds={state.config.rounds} phase={state.phase} />
          <Controls
            phase={state.phase}
            isPaused={state.isPaused}
            onToggleStartPause={actions.toggleStartPause}
            onReset={actions.reset}
            onSkip={actions.skip}
          />
        </div>
      )}

      <InstallPrompt />
    </div>
  )
}
