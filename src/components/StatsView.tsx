import { formatDurationLong } from '../lib/format'
import type { HistoryStats, SessionRecord } from '../lib/history'

interface Props {
  stats: HistoryStats
  sessions: SessionRecord[]
  onClose: () => void
  onClear: () => void
}

function formatSessionDate(epochMs: number): string {
  return new Date(epochMs).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function StatsView({ stats, sessions, onClose, onClear }: Props) {
  return (
    <div className="flex w-full max-w-sm flex-1 flex-col gap-6 py-2">
      <div className="grid grid-cols-3 gap-2 text-center">
        <StatTile label="Streak" value={stats.currentStreak > 0 ? `${stats.currentStreak} 🔥` : '0'} />
        <StatTile label="Sessions" value={String(stats.totalSessions)} />
        <StatTile label="Trained" value={formatDurationLong(stats.totalActiveMs)} />
      </div>

      <div className="max-h-72 flex-1 overflow-y-auto rounded-2xl border border-slate-900/10 dark:border-white/10">
        {sessions.length === 0 ? (
          <p className="p-4 text-center text-sm text-slate-900/50 dark:text-white/50">
            No sessions logged yet — finish (or end) a round to start your history.
          </p>
        ) : (
          <ul className="divide-y divide-slate-900/10 dark:divide-white/10">
            {sessions.map((session) => (
              <li key={session.id} className="flex items-center justify-between gap-2 px-4 py-2.5 text-sm">
                <span className="truncate text-slate-900/80 dark:text-white/80">{session.presetLabel}</span>
                <span className="shrink-0 text-slate-900/50 dark:text-white/50">
                  {session.roundsCompleted}
                  {session.unlimited ? '' : `/${session.totalRounds}`} rounds
                </span>
                <span className="shrink-0 text-slate-900/40 dark:text-white/40">
                  {formatSessionDate(session.completedAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-slate-900/15 px-6 py-3 text-sm font-medium text-slate-900/80 transition active:scale-95 active:border-accent/60 active:bg-accent/20 active:text-round dark:border-white/15 dark:text-white/80"
        >
          Back
        </button>
        {sessions.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="rounded-lg px-2 py-1 text-sm text-slate-900/40 underline transition active:bg-warn/20 active:text-warn dark:text-white/40"
          >
            Clear history
          </button>
        )}
      </div>
    </div>
  )
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-900/10 px-3 py-3 dark:border-white/10">
      <div className="text-lg font-bold">{value}</div>
      <div className="text-[11px] tracking-wide text-slate-900/50 uppercase dark:text-white/50">{label}</div>
    </div>
  )
}
