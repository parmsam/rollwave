import { useEffect, useRef } from 'preact/hooks'
import { formatTime, phaseLabel } from '../lib/format'
import type { TimerState } from '../lib/types'

const BASE_TITLE = 'ROLLWAVE — BJJ Round Timer'
const FAVICON_SIZE = 64

/** CSS custom property backing each phase's color — the canvas can't resolve `var()` itself. */
function phaseColorVar(phase: TimerState['phase'], isWarning: boolean): string {
  if (isWarning && (phase === 'round' || phase === 'rest')) return '--color-warn'
  if (phase === 'round') return '--color-accent'
  if (phase === 'rest') return '--color-rest'
  if (phase === 'getReady') return '--color-accent-2'
  return '--color-round'
}

export function documentTitle(state: TimerState, remainingMs: number): string {
  if (state.phase === 'idle') return BASE_TITLE
  if (state.phase === 'finished') return `Complete · ROLLWAVE`
  const round =
    state.phase === 'getReady'
      ? ''
      : ` ${state.currentRound}${state.config.unlimited ? '' : `/${state.config.rounds}`}`
  return `${state.isPaused ? '⏸ ' : ''}${formatTime(remainingMs)} · ${phaseLabel(state.phase)}${round} · ROLLWAVE`
}

/**
 * Mirrors the session into the tab: a countdown in the title and a draining
 * progress ring in the favicon, both colored by phase — so the timer is
 * readable from the tab strip / task switcher while on another tab or app.
 */
export function useDocumentStatus(state: TimerState, remainingMs: number, progressRatio: number, isWarning: boolean) {
  const title = documentTitle(state, remainingMs)
  useEffect(() => {
    if (document.title !== title) document.title = title
  }, [title])

  const linkRef = useRef<{ link: HTMLLinkElement; href: string; type: string } | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const lastKeyRef = useRef('')

  const running = state.phase !== 'idle' && state.phase !== 'finished'
  // Quantized so the favicon is only re-encoded when the drawn arc visibly changes, not 4x/sec.
  const step = running ? Math.round((1 - Math.min(Math.max(progressRatio, 0), 1)) * 60) : -1
  const colorVar = phaseColorVar(state.phase, isWarning)

  useEffect(() => {
    if (!linkRef.current) {
      const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
      if (!link) return
      linkRef.current = { link, href: link.href, type: link.type }
    }
    const { link, href, type } = linkRef.current

    if (!running) {
      if (lastKeyRef.current !== 'idle') {
        link.type = type
        link.href = href
        lastKeyRef.current = 'idle'
      }
      return
    }

    const color = getComputedStyle(document.documentElement).getPropertyValue(colorVar).trim() || '#22d3ee'
    const key = `${step}:${color}:${state.isPaused}`
    if (key === lastKeyRef.current) return
    lastKeyRef.current = key

    canvasRef.current ??= Object.assign(document.createElement('canvas'), {
      width: FAVICON_SIZE,
      height: FAVICON_SIZE,
    })
    const ctx = canvasRef.current.getContext('2d')
    if (!ctx) return
    const c = FAVICON_SIZE / 2
    ctx.clearRect(0, 0, FAVICON_SIZE, FAVICON_SIZE)
    ctx.lineWidth = 10
    ctx.lineCap = 'round'
    ctx.strokeStyle = 'rgba(128,128,128,.35)'
    ctx.beginPath()
    ctx.arc(c, c, 25, 0, Math.PI * 2)
    ctx.stroke()
    // Same drain-away convention as the on-page ring: full arc at the start of a phase.
    ctx.strokeStyle = color
    ctx.beginPath()
    ctx.arc(c, c, 25, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (step / 60))
    ctx.stroke()
    ctx.fillStyle = color
    if (state.isPaused) {
      ctx.fillRect(c - 8, c - 9, 5, 18)
      ctx.fillRect(c + 3, c - 9, 5, 18)
    } else {
      ctx.beginPath()
      ctx.arc(c, c, 8, 0, Math.PI * 2)
      ctx.fill()
    }
    link.type = 'image/png'
    link.href = canvasRef.current.toDataURL('image/png')
  }, [running, step, colorVar, state.isPaused])
}
