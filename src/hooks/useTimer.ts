import { useCallback, useEffect, useRef, useState } from 'preact/hooks'
import {
  resolveGetReadyTickClipId,
  resolveRoundClipId,
  resolveRoundEndTickClipId,
  resolveWarningClipId,
} from '../lib/audioClips'
import { createInitialState, isWarningWindow, progressRatio, reduceTimer, remainingMs } from '../lib/timerEngine'
import type { TimerAction, TimerConfig, TimerState } from '../lib/types'
import { setPlaybackSession, useAudioPlayer } from './useAudioPlayer'
import { useVibration } from './useVibration'
import { useWakeLock } from './useWakeLock'

const TICK_INTERVAL_MS = 250
const ROUND_START_VOICE_DELAY_MS = 200
// Long enough for the round-end bell's ~3.2s decay to ring out before the
// audio session is handed back to the default (silent-switch-muted) category.
const BELL_TAIL_MS = 4000

interface AudioOptions {
  voice: string
  muted: boolean
  volume: number
  /** Hold an iOS "playback" audio session while a session runs, so the silent switch doesn't mute cues. */
  playThroughSilent: boolean
}

const isRunningPhase = (phase: TimerState['phase']) => phase !== 'idle' && phase !== 'finished'

/**
 * `initialState` is a session saved before a reload; it's caught up to the
 * wall clock (possibly through several phases) rather than restarted.
 */
export function useTimer(config: TimerConfig, audio: AudioOptions, initialState?: TimerState | null) {
  const { voice, muted, volume, playThroughSilent } = audio
  const [state, setState] = useState(() =>
    initialState ? reduceTimer(initialState, { type: 'RESTORE', state: initialState }, Date.now()) : createInitialState(config),
  )
  const [clockTick, setClockTick] = useState(0)
  // A restored session's AudioContext doesn't exist yet, and browsers only
  // allow creating/resuming one inside a user gesture — so cues stay silent
  // until the next tap or key press anywhere on the page.
  const [needsAudioUnlock, setNeedsAudioUnlock] = useState(() => isRunningPhase(state.phase))

  const prevPhaseRef = useRef(state.phase)
  const prevRoundRef = useRef(state.currentRound)
  const announcedWarningRef = useRef(false)
  const announcedTickRef = useRef<number | null>(null)

  const { unlock, playClip, playBell, playStartChime, playWarningClap, previewVoice, previewVolume } = useAudioPlayer(
    voice,
    muted,
    volume,
  )
  const wakeLock = useWakeLock()
  const vibrate = useVibration()
  const pendingRoundVoiceRef = useRef<number | null>(null)

  useEffect(() => {
    if (!needsAudioUnlock) return
    function onGesture() {
      unlock()
      setNeedsAudioUnlock(false)
    }
    for (const type of ['pointerdown', 'keydown']) {
      document.addEventListener(type, onGesture, { capture: true, once: true })
    }
    return () => {
      for (const type of ['pointerdown', 'keydown']) {
        document.removeEventListener(type, onGesture, { capture: true })
      }
    }
  }, [needsAudioUnlock, unlock])

  // A session restored mid-round needs its screen kept awake too (no
  // gesture needed for that, unlike audio).
  useEffect(() => {
    if (isRunningPhase(state.phase)) void wakeLock.acquire()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Hold an iOS "playback" audio session for the whole session (not per cue —
  // cues are seconds apart, and a category switch racing the first sound of
  // each cue could still let it be muted), then hand it back once the
  // session ends so it stops claiming the device's audio. Declared before the
  // cue effects below so the category is switched before their first sound.
  useEffect(() => {
    if (playThroughSilent && isRunningPhase(state.phase)) {
      setPlaybackSession(true)
      return
    }
    if (playThroughSilent && state.phase === 'finished') {
      const id = window.setTimeout(() => setPlaybackSession(false), BELL_TAIL_MS)
      return () => window.clearTimeout(id)
    }
    setPlaybackSession(false)
  }, [state.phase, playThroughSilent])

  const dispatch = useCallback((action: TimerAction) => {
    setState((prev) => reduceTimer(prev, action, Date.now()))
  }, [])

  // Keep config in sync with the selected preset/custom settings while idle.
  // Also re-runs on returning to idle: a restored session carries its own
  // saved config, which shouldn't outlive the session it belonged to.
  const isIdle = state.phase === 'idle'
  useEffect(() => {
    dispatch({ type: 'CONFIGURE', config })
  }, [config, dispatch, isIdle])

  // Drift-free rAF loop: dispatches TICK (cheap no-op unless a deadline has
  // passed) and forces a render ~4x/sec so the on-screen countdown moves.
  useEffect(() => {
    let raf: number
    let last = 0
    function loop(ts: number) {
      if (ts - last >= TICK_INTERVAL_MS) {
        last = ts
        dispatch({ type: 'TICK' })
        setClockTick((n) => n + 1)
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [dispatch])

  // Force an immediate catch-up the moment the tab is foregrounded again —
  // mobile browsers throttle/suspend timers while backgrounded, so without
  // this the display would otherwise wait for the next rAF tick to notice.
  useEffect(() => {
    function onVisibility() {
      if (document.visibilityState === 'visible') {
        dispatch({ type: 'TICK' })
        setClockTick((n) => n + 1)
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [dispatch])

  // Phase/round transition cues (audio + haptic).
  useEffect(() => {
    const changed = prevPhaseRef.current !== state.phase || prevRoundRef.current !== state.currentRound
    if (changed) {
      switch (state.phase) {
        case 'getReady':
          playClip('get-ready')
          break
        case 'round': {
          // A short bright chime first, then the round announcement a beat
          // later — mirrors the round-end bell-then-voice pattern instead of
          // playing both at the exact same instant.
          playStartChime()
          const roundNumber = state.currentRound
          pendingRoundVoiceRef.current = window.setTimeout(() => {
            playClip(resolveRoundClipId(roundNumber))
          }, ROUND_START_VOICE_DELAY_MS)
          vibrate(80)
          break
        }
        case 'rest':
          // `rest` is only ever entered right after a round ends.
          playBell()
          playClip('rest')
          vibrate([80, 60, 80])
          break
        case 'finished':
          // Likewise, `finished` is only reached right after the last round ends.
          playBell()
          playClip('complete')
          vibrate([120, 80, 120, 80, 120])
          void wakeLock.release()
          break
      }
      announcedWarningRef.current = false
      announcedTickRef.current = null
      prevPhaseRef.current = state.phase
      prevRoundRef.current = state.currentRound
    }
    // Cancel a still-pending round-start voice cue if the phase moves on
    // again before it fires (e.g. rapid Skip presses) — otherwise a stale
    // "Round 2" could play late, on top of whatever's happening in round 3.
    return () => {
      if (pendingRoundVoiceRef.current !== null) {
        window.clearTimeout(pendingRoundVoiceRef.current)
        pendingRoundVoiceRef.current = null
      }
    }
  }, [state.phase, state.currentRound, playClip, playBell, playStartChime, vibrate, wakeLock])

  // Sub-phase cues that depend on continuously elapsing time: get-ready
  // countdown ticks, the round-end 4-3-2-1 countdown, and the once-per-round
  // warning announcement.
  useEffect(() => {
    const now = Date.now()
    if (state.phase === 'getReady') {
      const secondsLeft = Math.ceil(remainingMs(state, now) / 1000)
      // Skip the tick that exactly matches the phase's starting duration —
      // that instant belongs to the "Get ready" announcement itself (fired
      // by the transition effect above, in the same render pass); without
      // this guard the tick immediately stops "Get ready" a few ms in.
      const clipId =
        secondsLeft < state.config.getReadySeconds ? resolveGetReadyTickClipId(secondsLeft) : null
      if (clipId && announcedTickRef.current !== secondsLeft) {
        announcedTickRef.current = secondsLeft
        playClip(clipId)
      }
    }
    if (state.phase === 'round') {
      const secondsLeft = Math.ceil(remainingMs(state, now) / 1000)
      const tickClipId = resolveRoundEndTickClipId(secondsLeft)
      if (tickClipId && announcedTickRef.current !== secondsLeft) {
        announcedTickRef.current = secondsLeft
        playClip(tickClipId)
      }
    }
    // Same shared "this interval is ending" cue for both round and rest —
    // most interval timers don't distinguish the two, so neither do we.
    if (state.phase === 'round' || state.phase === 'rest') {
      if (isWarningWindow(state, now) && !announcedWarningRef.current) {
        announcedWarningRef.current = true
        playWarningClap()
        playClip(resolveWarningClipId(state.config.warningSeconds))
        vibrate(60)
      }
    }
    // clockTick isn't read inside the effect body — it's only here to force
    // a re-run every ~250ms. Without it, this effect only fires when `state`
    // changes *reference*, which (per reduceTimer's TICK case) only happens
    // at an actual phase/round transition — so mid-phase, none of these
    // ticks/warnings would ever fire at all.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, playClip, playWarningClap, vibrate, clockTick])

  const start = useCallback(() => {
    if (playThroughSilent) setPlaybackSession(true)
    unlock()
    void wakeLock.acquire()
    dispatch({ type: 'START' })
  }, [dispatch, unlock, wakeLock, playThroughSilent])

  /** Reinstate a saved state (Undo after Reset) — must be called from a user gesture, like `start`. */
  const restore = useCallback(
    (saved: TimerState) => {
      if (playThroughSilent) setPlaybackSession(true)
      unlock()
      setNeedsAudioUnlock(false)
      void wakeLock.acquire()
      dispatch({ type: 'RESTORE', state: saved })
    },
    [dispatch, unlock, wakeLock, playThroughSilent],
  )

  const pause = useCallback(() => dispatch({ type: 'PAUSE' }), [dispatch])
  const resume = useCallback(() => dispatch({ type: 'RESUME' }), [dispatch])
  const skip = useCallback(() => dispatch({ type: 'SKIP' }), [dispatch])
  const reset = useCallback(() => {
    void wakeLock.release()
    dispatch({ type: 'RESET' })
  }, [dispatch, wakeLock])

  const toggleStartPause = useCallback(() => {
    if (state.phase === 'idle' || state.phase === 'finished') start()
    else if (state.isPaused) resume()
    else pause()
  }, [state.phase, state.isPaused, start, resume, pause])

  const now = Date.now()

  return {
    state,
    remainingMs: remainingMs(state, now),
    progressRatio: progressRatio(state, now),
    isWarning: isWarningWindow(state, now),
    needsAudioUnlock: needsAudioUnlock && !muted,
    preview: { voice: previewVoice, volume: previewVolume },
    actions: { start, pause, resume, reset, skip, toggleStartPause, restore },
  }
}
