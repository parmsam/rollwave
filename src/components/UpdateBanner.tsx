/** Only rendered while a downloaded update is waiting — and only on the setup screen, never mid-session. */
export function UpdateBanner({ onReload }: { onReload: () => void }) {
  return (
    <div
      role="status"
      className="flex w-full max-w-sm items-center justify-between gap-3 rounded-2xl border border-accent/40 bg-accent/10 px-4 py-2.5 text-xs text-slate-900/80 dark:text-white/80"
    >
      <span>✨ A new version of ROLLWAVE is ready.</span>
      <button
        type="button"
        onClick={onReload}
        className="shrink-0 rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-ink transition active:scale-95 active:bg-accent-2"
      >
        Reload
      </button>
    </div>
  )
}
