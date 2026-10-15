import { useEffect } from 'preact/hooks'

export interface ToastMessage {
  /** Changes with every new toast, so its auto-dismiss timer restarts even if the text repeats. */
  id: number
  message: string
  action?: { label: string; run: () => void }
}

const DURATION_MS = 7000

/**
 * A short-lived status line with an optional action — used for Undo after
 * anything that throws away data (ending a session early, deleting history),
 * so those stay one tap instead of hiding behind a confirm dialog.
 */
export function Toast({ toast, onDismiss }: { toast: ToastMessage | null; onDismiss: () => void }) {
  useEffect(() => {
    if (!toast) return
    const id = window.setTimeout(onDismiss, DURATION_MS)
    return () => window.clearTimeout(id)
  }, [toast, onDismiss])

  if (!toast) return null

  return (
    <div
      role="status"
      className="fixed inset-x-4 bottom-4 z-20 mx-auto flex max-w-sm items-center justify-between gap-3 rounded-2xl border border-slate-900/10 bg-panel/95 px-4 py-3 text-sm text-slate-900/80 shadow-lg backdrop-blur-sm dark:border-white/10 dark:text-white/80"
    >
      <span>{toast.message}</span>
      <div className="flex shrink-0 items-center gap-2">
        {toast.action && (
          <button
            type="button"
            onClick={() => {
              toast.action?.run()
              onDismiss()
            }}
            className="rounded-full px-3 py-1.5 font-semibold text-round transition active:scale-95 active:bg-accent/20"
          >
            {toast.action.label}
          </button>
        )}
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="rounded-full px-1.5 text-slate-900/50 active:bg-accent/20 dark:text-white/50"
        >
          ✕
        </button>
      </div>
    </div>
  )
}
