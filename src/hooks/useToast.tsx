import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'
import { Toast } from '../components/Toast'

/** One transient message. The host renders it; `onAction` runs then dismisses (e.g. Undo). */
export interface ToastOptions {
  message: ReactNode
  /** Optional action label (e.g. "Undo"). */
  action?: ReactNode
  onAction?: () => void
  /** Auto-dismiss delay in ms; defaults to the Toast component's own default. */
  duration?: number
}

type ActiveToast = ToastOptions & { seq: number }

const ToastContext = createContext<((opts: ToastOptions) => void) | null>(null)

/**
 * App-level toast host: one pill at a time, mounted above every page so a confirmation
 * survives navigation and successive toasts replace (never stack) — the `seq` key remounts
 * the Toast so its dismiss timer restarts. Wrap the app once, then call `useToast()`.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ActiveToast | null>(null)
  const seq = useRef(0)

  const show = useCallback((opts: ToastOptions) => {
    seq.current += 1
    setToast({ ...opts, seq: seq.current })
  }, [])

  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast && (
        <Toast
          key={toast.seq}
          action={toast.action}
          onAction={() => {
            toast.onAction?.()
            setToast(null)
          }}
          onClose={() => setToast(null)}
          duration={toast.duration}
        >
          {toast.message}
        </Toast>
      )}
    </ToastContext.Provider>
  )
}

/** Returns `show(opts)` to raise a toast. Throws if used outside a ToastProvider. */
export function useToast(): (opts: ToastOptions) => void {
  const show = useContext(ToastContext)
  if (!show) throw new Error('useToast must be used within a ToastProvider')
  return show
}
