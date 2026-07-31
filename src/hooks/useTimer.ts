import { useCallback, useEffect, useRef, useState } from 'preact/hooks'
import {
  resolveGetReadyTickClipId,
  resolveRoundClipId,
  resolveWarningClipId,
} from '../lib/audioClips'
import { createInitialState, isWarningWindow, progressRatio, reduceTimer, remainingMs } from '../lib/timerEngine'
import type { TimerAction, TimerConfig } from '../lib/types'
import { useAudioPlayer } from './useAudioPlayer'
import { useVibration } from './useVibration'
import { useWakeLock } from './useWakeLock'

const TICK_INTERVAL_MS = 250

export function useTimer(config: TimerConfig, muted: boolean) {
  const [state, setState] = useState(() => createInitialState(config))
  const [, setClockTick] = useState(0)

  const prevPhaseRef = useRef(state.phase)
  const prevRoundRef = useRef(state.currentRound)
  const announcedWarningRef = useRef(false)
  const announcedGetReadyTickRef = useRef<number | null>(null)

  const { unlock, playClip } = useAudioPlayer(muted)
  const wakeLock = useWakeLock()
  const vibrate = useVibration()

  const dispatch = useCallback((action: TimerAction) => {
    setState((prev) => reduceTimer(prev, action, Date.now()))
  }, [])

  // Keep config in sync with the selected preset/custom settings while idle.
  useEffect(() => {
    dispatch({ type: 'CONFIGURE', config })
  }, [config, dispatch])

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
        case 'round':
          playClip(resolveRoundClipId(state.currentRound))
          vibrate(80)
          break
        case 'rest':
          playClip('rest')
          vibrate([80, 60, 80])
          break
        case 'finished':
          playClip('complete')
          vibrate([120, 80, 120, 80, 120])
          void wakeLock.release()
          break
      }
      announcedWarningRef.current = false
      announcedGetReadyTickRef.current = null
      prevPhaseRef.current = state.phase
      prevRoundRef.current = state.currentRound
    }
  }, [state.phase, state.currentRound, playClip, vibrate, wakeLock])

  // Sub-phase cues that depend on continuously elapsing time: get-ready
  // countdown ticks and the once-per-round warning announcement.
  useEffect(() => {
    const now = Date.now()
    if (state.phase === 'getReady') {
      const secondsLeft = Math.ceil(remainingMs(state, now) / 1000)
      const clipId = resolveGetReadyTickClipId(secondsLeft)
      if (clipId && announcedGetReadyTickRef.current !== secondsLeft) {
        announcedGetReadyTickRef.current = secondsLeft
        playClip(clipId)
      }
    }
    if (state.phase === 'round' && isWarningWindow(state, now) && !announcedWarningRef.current) {
      announcedWarningRef.current = true
      playClip(resolveWarningClipId(state.config.warningSeconds))
      vibrate(60)
    }
    // clockTick isn't read, only used to re-run this effect on each tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, playClip, vibrate])

  const start = useCallback(() => {
    unlock()
    void wakeLock.acquire()
    dispatch({ type: 'START' })
  }, [dispatch, unlock, wakeLock])

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
    actions: { start, pause, resume, reset, skip, toggleStartPause },
  }
}
