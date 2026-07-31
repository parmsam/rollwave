import { formatTime } from '../lib/format'
import { PRESETS } from '../lib/presets'
import type { PresetId, TimerConfig } from '../lib/types'
import { Stepper } from './Stepper'

interface Props {
  selectedPresetId: PresetId
  customConfig: TimerConfig
  onSelectPreset: (id: PresetId) => void
  onChangeCustom: (config: TimerConfig) => void
}

export function PresetPicker({ selectedPresetId, customConfig, onSelectPreset, onChangeCustom }: Props) {
  return (
    <div className="w-full max-w-sm space-y-4">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => onSelectPreset(preset.id)}
            className={`rounded-2xl border px-4 py-3 text-left transition ${
              selectedPresetId === preset.id
                ? 'border-accent bg-accent/10 text-round'
                : 'border-white/10 text-white/70 hover:border-white/25'
            }`}
          >
            <div className="font-semibold">{preset.label}</div>
            <div className="text-xs text-white/50">
              {preset.rounds} × {formatTime(preset.roundSeconds * 1000)} / {formatTime(preset.restSeconds * 1000)} rest
            </div>
          </button>
        ))}
        <button
          type="button"
          onClick={() => onSelectPreset('custom')}
          className={`rounded-2xl border px-4 py-3 text-left transition sm:col-span-2 ${
            selectedPresetId === 'custom'
              ? 'border-accent-2 bg-accent-2/10 text-round'
              : 'border-white/10 text-white/70 hover:border-white/25'
          }`}
        >
          <div className="font-semibold">Custom</div>
          <div className="text-xs text-white/50">Set your own rounds, timing, and warning cue</div>
        </button>
      </div>

      {selectedPresetId === 'custom' && (
        <div className="divide-y divide-white/10 rounded-2xl border border-white/10 px-4">
          <Stepper
            label="Rounds"
            value={customConfig.rounds}
            step={1}
            min={1}
            max={20}
            onChange={(rounds) => onChangeCustom({ ...customConfig, rounds })}
          />
          <Stepper
            label="Round length"
            value={customConfig.roundSeconds}
            step={30}
            min={30}
            max={1800}
            format={(v) => formatTime(v * 1000)}
            onChange={(roundSeconds) => onChangeCustom({ ...customConfig, roundSeconds })}
          />
          <Stepper
            label="Rest length"
            value={customConfig.restSeconds}
            step={10}
            min={0}
            max={300}
            format={(v) => formatTime(v * 1000)}
            onChange={(restSeconds) => onChangeCustom({ ...customConfig, restSeconds })}
          />
          <Stepper
            label="Get ready"
            value={customConfig.getReadySeconds}
            step={1}
            min={0}
            max={5}
            format={(v) => `${v}s`}
            onChange={(getReadySeconds) => onChangeCustom({ ...customConfig, getReadySeconds })}
          />
          <Stepper
            label="Warning at"
            value={customConfig.warningSeconds}
            step={5}
            min={0}
            max={60}
            format={(v) => `${v}s left`}
            onChange={(warningSeconds) => onChangeCustom({ ...customConfig, warningSeconds })}
          />
        </div>
      )}
    </div>
  )
}
