import { useCallback, useEffect, useRef } from 'preact/hooks'
import { AUDIO_CLIPS, clipUrl, resolveRoundClipId } from '../lib/audioClips'
import { createCueBus, createMasterChain, playBell as synthBell, playStartChime as synthChime, playWarningClap as synthClap } from '../lib/cueSynth'
import type { CueBus } from '../lib/cueSynth'

type AudioContextCtor = typeof AudioContext

/**
 * Audio Session API (Safari 17+ / iOS 17+). Web Audio defaults to iOS's
 * "ambient" session category, which the ring/silent switch mutes outright;
 * a "playback" session isn't muted by it — the same category a native timer
 * app uses. Absent everywhere else, so every call is feature-detected.
 */
type AudioSession = { type: string }
function audioSession(): AudioSession | undefined {
  return (navigator as Navigator & { audioSession?: AudioSession }).audioSession
}
export const canPlayThroughSilentMode = (): boolean => typeof navigator !== 'undefined' && Boolean(audioSession())

/** Switch the page's audio session category; `false` hands control back to the browser default. */
export function setPlaybackSession(on: boolean): void {
  const session = audioSession()
  if (!session) return
  try {
    session.type = on ? 'playback' : 'auto'
  } catch {
    // value unsupported in this browser version — stays on the default category
  }
}

/** Web Audio buffer cache + playback. Lower latency and safe overlap vs plain <audio> elements. */
export function useAudioPlayer(voice: string, muted: boolean, volume: number) {
  const ctxRef = useRef<AudioContext | null>(null)
  // Every cue (voice clips + all three synthesized sounds) routes through
  // this single node instead of ctx.destination directly, so one master
  // volume setting scales everything uniformly rather than needing a
  // separate multiplier threaded through each synth function.
  const masterGainRef = useRef<GainNode | null>(null)
  // Synthesized cues (bell/chime/clapper) — shares the master chain, plus its own room reverb.
  const cueBusRef = useRef<CueBus | null>(null)
  // Keyed by `${voice}:${id}` so switching voices can't reuse a stale
  // buffer from a different voice, and previously-loaded voices stay
  // cached if the user switches back.
  const buffersRef = useRef<Map<string, AudioBuffer>>(new Map())
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null)

  const ensureContext = useCallback((): AudioContext | null => {
    if (!ctxRef.current) {
      const Ctor: AudioContextCtor | undefined =
        window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext
      if (!Ctor) return null
      ctxRef.current = new Ctor()
      // Gain + peak limiter: see createMasterChain in lib/cueSynth.ts for
      // why the limiter exists and how its settings were verified.
      const { input } = createMasterChain(ctxRef.current, volume)
      cueBusRef.current = createCueBus(ctxRef.current, input)
      masterGainRef.current = input
    }
    if (ctxRef.current.state === 'suspended') {
      void ctxRef.current.resume()
    }
    return ctxRef.current
  }, [volume])

  // Keep the live master gain in sync with the setting — ensureContext's
  // gain.value = volume assignment above only covers the moment the
  // AudioContext is first created, so this effect is what makes dragging
  // the slider audible during an already-running session.
  useEffect(() => {
    if (masterGainRef.current) {
      masterGainRef.current.gain.value = volume
    }
  }, [volume])

  const loadAll = useCallback(async () => {
    const ctx = ensureContext()
    if (!ctx) return
    await Promise.all(
      AUDIO_CLIPS.map(async (clip) => {
        const key = `${voice}:${clip.id}`
        if (buffersRef.current.has(key)) return
        try {
          const res = await fetch(clipUrl(clip.id, voice))
          if (!res.ok) return
          const arrayBuffer = await res.arrayBuffer()
          const audioBuffer = await ctx.decodeAudioData(arrayBuffer)
          buffersRef.current.set(key, audioBuffer)
        } catch {
          // clip missing or undecodable (e.g. not yet generated) — app still works, just silent for this cue
        }
      }),
    )
  }, [ensureContext, voice])

  /** Must be invoked from inside a user-gesture handler (the Start button) to satisfy mobile autoplay rules. */
  const unlock = useCallback(() => {
    ensureContext()
    void loadAll()
  }, [ensureContext, loadAll])

  const playBuffer = useCallback((ctx: AudioContext, buffer: AudioBuffer) => {
    // Cues are sequential announcements, never a layered soundscape — cut
    // off whatever's still playing so back-to-back clips (e.g. the
    // get-ready countdown's "one" bleeding into the round-start "Go")
    // never overlap.
    try {
      currentSourceRef.current?.stop()
    } catch {
      // already stopped/ended — ignore
    }
    const source = ctx.createBufferSource()
    source.buffer = buffer
    source.connect(masterGainRef.current ?? ctx.destination)
    source.start()
    currentSourceRef.current = source
  }, [])

  const playClip = useCallback(
    (id: string) => {
      if (muted) return
      const ctx = ctxRef.current
      if (!ctx) return

      const key = `${voice}:${id}`
      const buffer = buffersRef.current.get(key)
      if (buffer) {
        playBuffer(ctx, buffer)
        return
      }

      // Not loaded yet — e.g. `loadAll`'s bulk fetch of ~27 small clips is
      // still in flight on a slower connection when this cue's moment
      // arrives (browsers cap concurrent per-host connections, so a later
      // clip can still be mid-fetch), or the voice just changed. Fetch this
      // one on demand and play it the instant it's ready rather than
      // silently dropping the cue.
      void (async () => {
        try {
          const res = await fetch(clipUrl(id, voice))
          if (!res.ok) return
          const arrayBuffer = await res.arrayBuffer()
          const audioBuffer = await ctx.decodeAudioData(arrayBuffer)
          buffersRef.current.set(key, audioBuffer)
          playBuffer(ctx, audioBuffer)
        } catch {
          // still unavailable (e.g. clip not generated) — app stays usable, just silent for this cue
        }
      })()
    },
    [muted, voice, playBuffer],
  )

  // The synthesized cues themselves live in lib/cueSynth.ts (shared with
  // offline renders used to measure/audition them). Each schedules its own
  // nodes rather than going through currentSourceRef, so the bell and
  // clapper layer under the voice cue instead of being cut off by it.
  const playBell = useCallback(() => {
    if (!muted && ctxRef.current && cueBusRef.current) synthBell(cueBusRef.current)
  }, [muted])

  // `force` is for explicit "let me hear it" previews in settings, which
  // play even when muted — silence there would read as broken.
  const playStartChime = useCallback(
    (force = false) => {
      if ((!muted || force) && ctxRef.current && cueBusRef.current) synthChime(cueBusRef.current)
    },
    [muted],
  )

  const playWarningClap = useCallback(() => {
    if (!muted && ctxRef.current && cueBusRef.current) synthClap(cueBusRef.current)
  }, [muted])

  // iOS Safari "interrupts" the AudioContext (phone call, Siri, switching
  // apps) and leaves it suspended afterwards; any later tap or key press is a
  // valid gesture to bring it back, so the next cue isn't silently lost.
  useEffect(() => {
    function onGesture() {
      const ctx = ctxRef.current
      if (ctx && ctx.state !== 'running') void ctx.resume()
    }
    for (const type of ['pointerdown', 'keydown']) {
      document.addEventListener(type, onGesture, { capture: true, passive: true })
    }
    return () => {
      for (const type of ['pointerdown', 'keydown']) {
        document.removeEventListener(type, onGesture, { capture: true })
      }
    }
  }, [])

  useEffect(() => {
    return () => {
      void ctxRef.current?.close()
    }
  }, [])

  /**
   * Plays a sample ("Round 1") in any voice — not just the current one, since
   * this fires in the same click that changes the voice setting, before the
   * hook re-renders with the new `voice`. Must be called from a user gesture.
   */
  const previewVoice = useCallback(
    async (previewVoiceId: string) => {
      const ctx = ensureContext()
      if (!ctx) return
      const id = resolveRoundClipId(1)
      const key = `${previewVoiceId}:${id}`
      let buffer = buffersRef.current.get(key)
      if (!buffer) {
        try {
          const res = await fetch(clipUrl(id, previewVoiceId))
          if (!res.ok) return
          buffer = await ctx.decodeAudioData(await res.arrayBuffer())
          buffersRef.current.set(key, buffer)
        } catch {
          return
        }
      }
      playBuffer(ctx, buffer)
    },
    [ensureContext, playBuffer],
  )

  /** A short test sound at the current volume, for the volume slider. Must be called from a user gesture. */
  const previewVolume = useCallback(() => {
    if (ensureContext()) playStartChime(true)
  }, [ensureContext, playStartChime])

  return { unlock, playClip, playBell, playStartChime, playWarningClap, previewVoice, previewVolume }
}
