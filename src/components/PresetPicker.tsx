import { formatTime } from '../lib/format'
import { PRESETS } from '../lib/presets'
import type { TimerConfig } from '../lib/types'
import { Stepper } from './Stepper'

interface Props {
  selectedPresetId: string
  customPresets: TimerConfig[]
  onSelectPreset: (id: string) => void
  onAddCustom: () => void
  onUpdateCustom: (id: string, patch: Partial<TimerConfig>) => void
  onDeleteCustom: (id: string) => void
}

export function PresetPicker({
  selectedPresetId,
  customPresets,
  onSelectPreset,
  onAddCustom,
  onUpdateCustom,
  onDeleteCustom,
}: Props) {
  const selectedCustom = customPresets.find((preset) => preset.id === selectedPresetId) ?? null

  return (
    <div className="w-full max-w-sm space-y-4">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {PRESETS.map((preset) => (
          <PresetCard
            key={preset.id}
            preset={preset}
            selected={selectedPresetId === preset.id}
            onSelect={() => onSelectPreset(preset.id)}
          />
        ))}
        {customPresets.map((preset) => (
          <PresetCard
            key={preset.id}
            preset={preset}
            selected={selectedPresetId === preset.id}
            onSelect={() => onSelectPreset(preset.id)}
          />
        ))}
        <button
          type="button"
          onClick={onAddCustom}
          className="rounded-2xl border border-dashed border-slate-900/20 px-4 py-3 text-left text-slate-900/60 transition hover:border-slate-900/40 hover:text-slate-900/80 active:scale-[0.98] active:border-accent/60 active:bg-accent/10 active:text-round sm:col-span-2 dark:border-white/20 dark:text-white/60 dark:hover:border-white/40 dark:hover:text-white/80"
        >
          + New custom mode
        </button>
      </div>

      {selectedCustom && (
        <div className="space-y-3 rounded-2xl border border-accent-2/40 bg-accent-2/5 p-4">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={selectedCustom.label}
              onInput={(event) =>
                onUpdateCustom(selectedCustom.id, { label: (event.target as HTMLInputElement).value })
              }
              maxLength={24}
              aria-label="Preset name"
              className="flex-1 rounded-lg border border-slate-900/10 bg-slate-900/5 px-3 py-1.5 text-sm font-semibold text-round outline-none focus:border-accent-2 dark:border-white/10 dark:bg-black/20"
            />
            <button
              type="button"
              onClick={() => onDeleteCustom(selectedCustom.id)}
              aria-label="Delete this custom mode"
              className="rounded-full border border-slate-900/10 px-3 py-1.5 text-xs text-slate-900/50 transition hover:border-warn/50 hover:text-warn active:scale-95 active:border-warn/60 active:bg-warn/20 active:text-warn dark:border-white/10 dark:text-white/50"
            >
              Delete
            </button>
          </div>

          <label className="flex items-center justify-between py-1 text-sm text-slate-900/70 dark:text-white/70">
            <span>Unlimited rounds</span>
            <input
              type="checkbox"
              checked={Boolean(selectedCustom.unlimited)}
              onChange={(event) =>
                onUpdateCustom(selectedCustom.id, { unlimited: (event.target as HTMLInputElement).checked })
              }
              className="h-5 w-5 accent-accent-2"
            />
          </label>

          <div className="divide-y divide-slate-900/10 dark:divide-white/10">
            {!selectedCustom.unlimited && (
              <Stepper
                label="Rounds"
                value={selectedCustom.rounds}
                step={1}
                min={1}
                max={20}
                onChange={(rounds) => onUpdateCustom(selectedCustom.id, { rounds })}
              />
            )}
            <Stepper
              label="Round length"
              value={selectedCustom.roundSeconds}
              step={30}
              min={30}
              max={1800}
              format={(v) => formatTime(v * 1000)}
              onChange={(roundSeconds) => onUpdateCustom(selectedCustom.id, { roundSeconds })}
            />
            <Stepper
              label="Rest length"
              value={selectedCustom.restSeconds}
              step={10}
              min={0}
              max={300}
              format={(v) => formatTime(v * 1000)}
              onChange={(restSeconds) => onUpdateCustom(selectedCustom.id, { restSeconds })}
            />
            <Stepper
              label="Get ready"
              value={selectedCustom.getReadySeconds}
              step={1}
              min={0}
              max={5}
              format={(v) => `${v}s`}
              onChange={(getReadySeconds) => onUpdateCustom(selectedCustom.id, { getReadySeconds })}
            />
            <Stepper
              label="Warning at"
              value={selectedCustom.warningSeconds}
              step={5}
              min={0}
              max={60}
              format={(v) => `${v}s left`}
              onChange={(warningSeconds) => onUpdateCustom(selectedCustom.id, { warningSeconds })}
            />
          </div>
        </div>
      )}
    </div>
  )
}

interface PresetCardProps {
  preset: TimerConfig
  selected: boolean
  onSelect: () => void
}

function PresetCard({ preset, selected, onSelect }: PresetCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`rounded-2xl border px-4 py-3 text-left transition active:scale-[0.98] active:border-accent/60 active:bg-accent/20 active:text-round ${
        selected
          ? 'border-accent bg-accent/10 text-round'
          : 'border-slate-900/10 text-slate-900/70 hover:border-slate-900/25 dark:border-white/10 dark:text-white/70 dark:hover:border-white/25'
      }`}
    >
      <div className="font-semibold">{preset.label}</div>
      <div className="text-xs text-slate-900/50 dark:text-white/50">
        {preset.unlimited
          ? `Unlimited × ${formatTime(preset.roundSeconds * 1000)} / ${formatTime(preset.restSeconds * 1000)} rest`
          : `${preset.rounds} × ${formatTime(preset.roundSeconds * 1000)} / ${formatTime(preset.restSeconds * 1000)} rest`}
      </div>
    </button>
  )
}
