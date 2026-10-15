import { useEffect, useRef } from 'preact/hooks'

interface Props {
  label: string
  /** Optional second line under the label explaining what the setting does. */
  hint?: string
  value: number
  step: number
  min: number
  max: number
  onChange: (value: number) => void
  format?: (value: number) => string
}

const HOLD_DELAY_MS = 400
const REPEAT_MS = 90

/**
 * − value + control. Press-and-hold repeats (going from 5:00 to 20:00 in 30s
 * steps would otherwise be 30 separate taps), and each button disables at
 * its limit so it's obvious why nothing happens.
 */
export function Stepper({ label, hint, value, step, min, max, onChange, format }: Props) {
  // Repeats read/advance a ref rather than the `value` prop, which only
  // catches up on the next render — between repeat ticks it can be stale.
  const valueRef = useRef(value)
  valueRef.current = value
  const timersRef = useRef<{ delay?: number; repeat?: number }>({})

  function nudge(direction: 1 | -1) {
    const next = Math.min(max, Math.max(min, valueRef.current + direction * step))
    if (next === valueRef.current) return stopRepeat()
    valueRef.current = next
    onChange(next)
  }

  function startRepeat(direction: 1 | -1) {
    nudge(direction)
    timersRef.current.delay = window.setTimeout(() => {
      timersRef.current.repeat = window.setInterval(() => nudge(direction), REPEAT_MS)
    }, HOLD_DELAY_MS)
  }

  function stopRepeat() {
    window.clearTimeout(timersRef.current.delay)
    window.clearInterval(timersRef.current.repeat)
    timersRef.current = {}
  }

  useEffect(() => stopRepeat, [])

  const buttonProps = (direction: 1 | -1) => ({
    type: 'button' as const,
    disabled: direction === 1 ? value >= max : value <= min,
    'aria-label': `${direction === 1 ? 'Increase' : 'Decrease'} ${label}`,
    onPointerDown: (event: PointerEvent) => {
      if (event.button !== 0) return
      ;(event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId)
      startRepeat(direction)
    },
    onPointerUp: stopRepeat,
    onPointerCancel: stopRepeat,
    onLostPointerCapture: stopRepeat,
    // Pointer presses are handled above; this only catches keyboard
    // activation (Enter/Space), whose synthetic click has detail === 0.
    onClick: (event: MouseEvent) => {
      if (event.detail === 0) nudge(direction)
    },
    onContextMenu: (event: Event) => event.preventDefault(),
    className:
      'h-9 w-9 shrink-0 touch-none rounded-full border border-slate-900/15 text-lg leading-none text-slate-900/80 transition select-none active:scale-95 active:border-accent/60 active:bg-accent/20 active:text-round disabled:opacity-30 disabled:active:scale-100 disabled:active:bg-transparent dark:border-white/15 dark:text-white/80',
  })

  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <div className="min-w-0">
        <div className="text-sm text-slate-900/80 dark:text-white/80">{label}</div>
        {hint && <div className="text-xs text-slate-900/45 dark:text-white/45">{hint}</div>}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button {...buttonProps(-1)}>−</button>
        <span className="w-14 text-center font-mono tabular-nums" aria-live="polite">
          {format ? format(value) : value}
        </span>
        <button {...buttonProps(1)}>+</button>
      </div>
    </div>
  )
}
