import { useEffect, useState } from 'preact/hooks'

// No space before am/pm — a few px narrower than toLocaleTimeString's
// default, which matters on the smallest phone widths in the header row.
function formatCompactTime(date: Date): string {
  const hours24 = date.getHours()
  const hours = hours24 % 12 || 12
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const meridiem = hours24 < 12 ? 'am' : 'pm'
  return `${hours}:${minutes}${meridiem}`
}

/** Live wall-clock readout, independent of the timer engine's own rAF loop. */
export function LiveClock() {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <span className="shrink-0 font-mono text-xs whitespace-nowrap text-slate-900/40 tabular-nums sm:text-sm dark:text-white/40">
      {formatCompactTime(now)}
    </span>
  )
}
