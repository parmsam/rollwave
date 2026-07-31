import { useCallback, useEffect, useRef } from 'preact/hooks'
import { AUDIO_CLIPS, clipUrl } from '../lib/audioClips'

type AudioContextCtor = typeof AudioContext

/** Web Audio buffer cache + playback. Lower latency and safe overlap vs plain <audio> elements. */
export function useAudioPlayer(muted: boolean) {
  const ctxRef = useRef<AudioContext | null>(null)
  const buffersRef = useRef<Map<string, AudioBuffer>>(new Map())
  const loadingRef = useRef(false)
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null)

  const ensureContext = useCallback((): AudioContext | null => {
    if (!ctxRef.current) {
      const Ctor: AudioContextCtor | undefined =
        window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext
      if (!Ctor) return null
      ctxRef.current = new Ctor()
    }
    if (ctxRef.current.state === 'suspended') {
      void ctxRef.current.resume()
    }
    return ctxRef.current
  }, [])

  const loadAll = useCallback(async () => {
    const ctx = ensureContext()
    if (!ctx || loadingRef.current) return
    loadingRef.current = true
    await Promise.all(
      AUDIO_CLIPS.map(async (clip) => {
        if (buffersRef.current.has(clip.id)) return
        try {
          const res = await fetch(clipUrl(clip.id))
          if (!res.ok) return
          const arrayBuffer = await res.arrayBuffer()
          const audioBuffer = await ctx.decodeAudioData(arrayBuffer)
          buffersRef.current.set(clip.id, audioBuffer)
        } catch {
          // clip missing or undecodable (e.g. not yet generated) — app still works, just silent for this cue
        }
      }),
    )
  }, [ensureContext])

  /** Must be invoked from inside a user-gesture handler (the Start button) to satisfy mobile autoplay rules. */
  const unlock = useCallback(() => {
    ensureContext()
    void loadAll()
  }, [ensureContext, loadAll])

  const playClip = useCallback(
    (id: string) => {
      if (muted) return
      const ctx = ctxRef.current
      const buffer = buffersRef.current.get(id)
      if (!ctx || !buffer) return

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
      source.connect(ctx.destination)
      source.start()
      currentSourceRef.current = source
    },
    [muted],
  )

  // Short synthesized bell chime for "round just ended" — no audio asset
  // needed, and it's layered on its own gain node rather than routed through
  // currentSourceRef, so it never gets cut short by the next voice cue.
  const playBell = useCallback(() => {
    if (muted) return
    const ctx = ctxRef.current
    if (!ctx) return
    const now = ctx.currentTime
    const gain = ctx.createGain()
    gain.connect(ctx.destination)
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(0.5, now + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.9)

    for (const freq of [880, 1320, 1760]) {
      const osc = ctx.createOscillator()
      osc.type = 'sine'
      osc.frequency.value = freq
      osc.connect(gain)
      osc.start(now)
      osc.stop(now + 0.9)
    }
  }, [muted])

  useEffect(() => {
    return () => {
      void ctxRef.current?.close()
    }
  }, [])

  return { unlock, playClip, playBell }
}
