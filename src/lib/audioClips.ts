export interface AudioClip {
  id: string
  /** Spoken phrase — the single source of truth for scripts/generate-audio.ts. */
  text: string
}

const ROUND_CLIP_CAP = 12

export const AUDIO_CLIPS: AudioClip[] = [
  { id: 'get-ready', text: 'Get ready' },
  { id: 'five', text: 'Five' },
  { id: 'four', text: 'Four' },
  { id: 'three', text: 'Three' },
  { id: 'two', text: 'Two' },
  { id: 'one', text: 'One' },
  { id: 'go', text: 'Go!' },
  ...Array.from({ length: ROUND_CLIP_CAP }, (_, i) => ({
    id: `round-${i + 1}`,
    text: `Round ${i + 1}`,
  })),
  { id: 'rest', text: 'Rest' },
  { id: 'warning-30', text: '30 seconds' },
  { id: 'warning-20', text: '20 seconds' },
  { id: 'warning-15', text: '15 seconds' },
  { id: 'warning-10', text: '10 seconds' },
  { id: 'warning-5', text: '5 seconds' },
  { id: 'warning-generic', text: "Time's almost up" },
  { id: 'complete', text: 'Session complete. Great work.' },
]

export function clipUrl(id: string): string {
  return `${import.meta.env.BASE_URL}audio/${id}.mp3`
}

/** Rounds beyond the pre-baked cap just get the plain "Go!" cue instead of a number. */
export function resolveRoundClipId(roundNumber: number): string {
  return roundNumber <= ROUND_CLIP_CAP ? `round-${roundNumber}` : 'go'
}

const WARNING_THRESHOLDS = [30, 20, 15, 10, 5]

/** Falls back to a generic phrase when the user's custom warning threshold has no exact clip. */
export function resolveWarningClipId(thresholdSeconds: number): string {
  return WARNING_THRESHOLDS.includes(thresholdSeconds) ? `warning-${thresholdSeconds}` : 'warning-generic'
}

const TICK_WORDS = ['one', 'two', 'three', 'four', 'five']

function tickClipId(secondsRemaining: number, maxSeconds: number): string | null {
  return secondsRemaining >= 1 && secondsRemaining <= maxSeconds ? TICK_WORDS[secondsRemaining - 1] : null
}

/** get-ready countdown clips only exist for the last 5 seconds. */
export function resolveGetReadyTickClipId(secondsRemaining: number): string | null {
  return tickClipId(secondsRemaining, 5)
}

/**
 * Spoken 4-3-2-1 countdown near the end of a round. Deliberately stops at 4
 * (not 5) — a custom warning threshold of 5s would otherwise double up with
 * this, playing "5 seconds" and "five" back to back.
 */
export function resolveRoundEndTickClipId(secondsRemaining: number): string | null {
  return tickClipId(secondsRemaining, 4)
}
