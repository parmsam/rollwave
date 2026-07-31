import { DEFAULT_CUSTOM_CONFIG, PRESETS, findPreset } from '../lib/presets'
import type { PresetId, TimerConfig } from '../lib/types'
import { useLocalStorage } from './useLocalStorage'

const SCHEMA_VERSION = 1

interface StoredCustomConfig {
  v: number
  config: TimerConfig
}

/** Persisted preset selection, custom config, and mute setting — the only user-facing settings. */
export function useSettings() {
  const [selectedPresetId, setSelectedPresetId] = useLocalStorage<PresetId>(
    'rollwave:selectedPresetId',
    'competition',
  )
  const [storedCustom, setStoredCustom] = useLocalStorage<StoredCustomConfig>('rollwave:customConfig', {
    v: SCHEMA_VERSION,
    config: DEFAULT_CUSTOM_CONFIG,
  })
  const [muted, setMuted] = useLocalStorage('rollwave:muted', false)

  const customConfig = storedCustom.v === SCHEMA_VERSION ? storedCustom.config : DEFAULT_CUSTOM_CONFIG

  function setCustomConfig(config: TimerConfig) {
    setStoredCustom({ v: SCHEMA_VERSION, config })
  }

  const activeConfig: TimerConfig =
    selectedPresetId === 'custom' ? customConfig : (findPreset(selectedPresetId) ?? PRESETS[0])

  return {
    selectedPresetId,
    setSelectedPresetId,
    customConfig,
    setCustomConfig,
    activeConfig,
    muted,
    setMuted,
  }
}
