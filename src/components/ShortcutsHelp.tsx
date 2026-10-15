import { SHORTCUTS } from '../lib/shortcuts'

export function ShortcutsHelp({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcuts-title"
        className="w-full max-w-xs rounded-2xl border border-slate-900/10 bg-panel p-5 shadow-xl dark:border-white/10"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id="shortcuts-title" className="text-sm font-semibold tracking-[0.2em] uppercase">
            Shortcuts
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close shortcuts"
            autoFocus
            className="rounded-full px-1.5 text-slate-900/50 active:bg-accent/20 dark:text-white/50"
          >
            ✕
          </button>
        </div>
        <dl className="flex flex-col gap-2 text-sm">
          {SHORTCUTS.map(({ keys, label }) => (
            <div key={label} className="flex items-center justify-between gap-4">
              <dt className="text-slate-900/70 dark:text-white/70">{label}</dt>
              <dd className="flex shrink-0 gap-1">
                {keys.map((key) => (
                  <kbd
                    key={key}
                    className="min-w-7 rounded-md border border-slate-900/15 px-1.5 py-0.5 text-center font-mono text-xs dark:border-white/15"
                  >
                    {key}
                  </kbd>
                ))}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  )
}
