export interface SessionRecord {
  id: string
  completedAt: number
  presetLabel: string
  roundsCompleted: number
  totalRounds: number
  unlimited: boolean
  totalActiveMs: number
}

export interface HistoryStats {
  totalSessions: number
  totalRoundsCompleted: number
  totalActiveMs: number
  currentStreak: number
}

function toLocalDateKey(epochMs: number): string {
  const d = new Date(epochMs)
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

function computeStreak(history: SessionRecord[]): number {
  if (history.length === 0) return 0
  const days = new Set(history.map((session) => toLocalDateKey(session.completedAt)))

  let streak = 0
  const cursor = new Date()
  // A session isn't logged for today yet doesn't break the streak — it just
  // means "today" hasn't happened, so start counting from yesterday instead.
  if (!days.has(toLocalDateKey(cursor.getTime()))) {
    cursor.setDate(cursor.getDate() - 1)
  }
  while (days.has(toLocalDateKey(cursor.getTime()))) {
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

export function computeStats(history: SessionRecord[]): HistoryStats {
  return {
    totalSessions: history.length,
    totalRoundsCompleted: history.reduce((sum, session) => sum + session.roundsCompleted, 0),
    totalActiveMs: history.reduce((sum, session) => sum + session.totalActiveMs, 0),
    currentStreak: computeStreak(history),
  }
}
