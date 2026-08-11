import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import { IconCheck, IconClose } from '../components/Icons.jsx'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const idRef = useRef(0)

  const dismiss = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), [])

  const push = useCallback(
    (message, tone = 'success') => {
      const id = ++idRef.current
      setToasts((t) => [...t, { id, message, tone }])
      setTimeout(() => dismiss(id), 4000)
    },
    [dismiss]
  )

  const value = useMemo(
    () => ({
      toast: push,
      success: (m) => push(m, 'success'),
      error: (m) => push(m, 'error'),
      info: (m) => push(m, 'info'),
    }),
    [push]
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-stack" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.tone}`}>
            {t.tone === 'success' && <IconCheck size={16} />}
            <span>{t.message}</span>
            <button className="toast-close" onClick={() => dismiss(t.id)} aria-label="Dismiss">
              <IconClose size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx
}
