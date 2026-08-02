import { useCallback, useEffect, useRef } from 'preact/hooks'
import { AUDIO_CLIPS, clipUrl } from '../lib/audioClips'

type AudioContextCtor = typeof AudioContext

/** Web Audio buffer cache + playback. Lower latency and safe overlap vs plain <audio> elements. */
export function useAudioPlayer(voice: string, muted: boolean, volume: number) {
  const ctxRef = useRef<AudioContext | null>(null)
  // Every cue (voice clips + all three synthesized sounds) routes through
  // this single node instead of ctx.destination directly, so one master
  // volume setting scales everything uniformly rather than needing a
  // separate multiplier threaded through each synth function.
  const masterGainRef = useRef<GainNode | null>(null)
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
      const gain = ctxRef.current.createGain()
      gain.gain.value = volume
      // Volume can be pushed well past 100% to give quiet devices/phone
      // speakers real headroom, but the warning clap's peak (0.9, see
      // playWarningClap below) is already close to unity and the bell's
      // stacked partials can sum close to it too — without a limiter,
      // boosting gain would hard-clip those into an audible crackle.
      // A DynamicsCompressor prevents that, but its *default* curve
      // (threshold -24dB) is tuned for mixing full songs, not short cues —
      // the voice clips here average around -22dB, so the default engages
      // on nearly all of them, quietly shaving down perceived loudness even
      // at 100%. Worse, that meant cranking the slider higher just fed more
      // signal into the same squashing zone, so the slider's effect
      // diminished the harder it was pushed. Pushing the threshold up near
      // the ceiling with a steep ratio + fast attack makes it act as a true
      // peak limiter instead — silent on ordinary levels, only engaging
      // within a couple dB of clipping.
      const compressor = ctxRef.current.createDynamicsCompressor()
      compressor.threshold.value = -2
      compressor.knee.value = 0
      compressor.ratio.value = 20
      compressor.attack.value = 0.002
      compressor.release.value = 0.1
      gain.connect(compressor)
      compressor.connect(ctxRef.current.destination)
      masterGainRef.current = gain
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

  // Synthesized temple-bell / singing-bowl chime for "round just ended" — no
  // audio asset needed, and each partial has its own gain node rather than
  // being routed through currentSourceRef, so it never gets cut short by the
  // next voice cue. Deep fundamental + inharmonic overtones (not clean
  // octaves — that's what gives a real bell its shimmering quality) with a
  // slow decay, rather than the bright short chime this replaced.
  const playBell = useCallback(() => {
    if (muted) return
    const ctx = ctxRef.current
    if (!ctx) return
    const now = ctx.currentTime
    const fundamental = 220

    const partials = [
      { ratio: 1, gain: 0.5, decay: 3.2 },
      { ratio: 2.4, gain: 0.28, decay: 2.4 },
      { ratio: 3.8, gain: 0.16, decay: 1.6 },
      { ratio: 5.4, gain: 0.08, decay: 1.0 },
    ]
    for (const { ratio, gain: peak, decay } of partials) {
      const osc = ctx.createOscillator()
      osc.type = 'sine'
      osc.frequency.value = fundamental * ratio
      const gain = ctx.createGain()
      gain.gain.setValueAtTime(0.0001, now)
      gain.gain.exponentialRampToValueAtTime(peak, now + 0.015)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + decay)
      osc.connect(gain)
      gain.connect(masterGainRef.current ?? ctx.destination)
      osc.start(now)
      osc.stop(now + decay + 0.1)
    }
  }, [muted])

  // Short, bright single-note ding for "round about to start" — deliberately
  // the opposite character of the deep, slow round-end bell (high pitch,
  // quick decay) so the two are unmistakable by ear alone.
  const playStartChime = useCallback(() => {
    if (muted) return
    const ctx = ctxRef.current
    if (!ctx) return
    const now = ctx.currentTime
    const gain = ctx.createGain()
    gain.connect(masterGainRef.current ?? ctx.destination)
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(0.4, now + 0.008)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35)

    for (const freq of [1046.5, 1568]) {
      const osc = ctx.createOscillator()
      osc.type = 'sine'
      osc.frequency.value = freq
      osc.connect(gain)
      osc.start(now)
      osc.stop(now + 0.4)
    }
  }, [muted])

  // Two quick percussive noise bursts — a synthesized "clapper" for the
  // warning threshold, modeled on the double wooden-clapper signal used to
  // mark 10 seconds left in combat sports. Noise-based (band-passed white
  // noise), not oscillator tones like the bell/chime, so all three cues
  // (start/warning/end) are distinct in *timbre*, not just pitch.
  const playWarningClap = useCallback(() => {
    if (muted) return
    const ctx = ctxRef.current
    if (!ctx) return

    const playClap = (startTime: number) => {
      const duration = 0.08
      const bufferSize = Math.floor(ctx.sampleRate * duration)
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
      const data = buffer.getChannelData(0)
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1
      }
      const noise = ctx.createBufferSource()
      noise.buffer = buffer

      const bandpass = ctx.createBiquadFilter()
      bandpass.type = 'bandpass'
      bandpass.frequency.value = 1800
      bandpass.Q.value = 0.9

      const gain = ctx.createGain()
      gain.gain.setValueAtTime(0.0001, startTime)
      gain.gain.exponentialRampToValueAtTime(0.9, startTime + 0.004)
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration)

      noise.connect(bandpass)
      bandpass.connect(gain)
      gain.connect(masterGainRef.current ?? ctx.destination)
      noise.start(startTime)
      noise.stop(startTime + duration + 0.02)
    }

    const now = ctx.currentTime
    playClap(now)
    playClap(now + 0.14)
  }, [muted])

  useEffect(() => {
    return () => {
      void ctxRef.current?.close()
    }
  }, [])

  return { unlock, playClip, playBell, playStartChime, playWarningClap }
}
