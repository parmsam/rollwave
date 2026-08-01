import { useCallback, useMemo } from 'preact/hooks'
import { DEFAULT_VOICE } from '../lib/audioClips'
import { createCustomPreset, PRESETS } from '../lib/presets'
import type { TimerConfig } from '../lib/types'
import { useLocalStorage } from './useLocalStorage'

const SCHEMA_VERSION = 1

interface StoredCustomPresets {
  v: number
  presets: TimerConfig[]
}

export type DisplayStyle = 'ring' | 'digits'

/** Persisted preset selection, user-saved custom presets, and mute setting. */
export function useSettings() {
  const [selectedPresetId, setSelectedPresetId] = useLocalStorage<string>(
    'rollwave:selectedPresetId',
    'competition',
  )
  const [storedCustom, setStoredCustom] = useLocalStorage<StoredCustomPresets>('rollwave:customPresets', {
    v: SCHEMA_VERSION,
    presets: [],
  })
  const [muted, setMuted] = useLocalStorage('rollwave:muted', false)
  const [showClock, setShowClock] = useLocalStorage('rollwave:showClock', false)
  const [voice, setVoice] = useLocalStorage('rollwave:voice', DEFAULT_VOICE)
  const [displayStyle, setDisplayStyle] = useLocalStorage<DisplayStyle>('rollwave:displayStyle', 'ring')

  const customPresets = storedCustom.v === SCHEMA_VERSION ? storedCustom.presets : []

  const allPresets = useMemo(() => [...PRESETS, ...customPresets], [customPresets])
  const activeConfig: TimerConfig = allPresets.find((preset) => preset.id === selectedPresetId) ?? PRESETS[0]

  const addCustomPreset = useCallback(() => {
    const preset = createCustomPreset(customPresets.length + 1)
    setStoredCustom((prev) => ({
      v: SCHEMA_VERSION,
      presets: [...(prev.v === SCHEMA_VERSION ? prev.presets : []), preset],
    }))
    setSelectedPresetId(preset.id)
  }, [customPresets.length, setStoredCustom, setSelectedPresetId])

  const updateCustomPreset = useCallback(
    (id: string, patch: Partial<TimerConfig>) => {
      setStoredCustom((prev) => ({
        v: SCHEMA_VERSION,
        presets: (prev.v === SCHEMA_VERSION ? prev.presets : []).map((preset) =>
          preset.id === id ? { ...preset, ...patch } : preset,
        ),
      }))
    },
    [setStoredCustom],
  )

  const deleteCustomPreset = useCallback(
    (id: string) => {
      setStoredCustom((prev) => ({
        v: SCHEMA_VERSION,
        presets: (prev.v === SCHEMA_VERSION ? prev.presets : []).filter((preset) => preset.id !== id),
      }))
      if (selectedPresetId === id) setSelectedPresetId('competition')
    },
    [selectedPresetId, setStoredCustom, setSelectedPresetId],
  )

  return {
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
    displayStyle,
    setDisplayStyle,
    addCustomPreset,
    updateCustomPreset,
    deleteCustomPreset,
  }
}
