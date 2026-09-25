'use client'

import { useState, useEffect, ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react'
import { toastStore } from '@/lib/toast-store'

type ToastType = 'success' | 'error' | 'info'

interface Toast {
  id: string
  type: ToastType
  message: string
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => {
    const unsub = toastStore.subscribe((message, type) => {
      const id = Math.random().toString(36).slice(2)
      setToasts(t => [...t, { id, type, message }])
      setTimeout(() => {
        setToasts(t => t.filter(toast => toast.id !== id))
      }, 4000)
    })
    return unsub
  }, [])

  return (
    <>
      {children}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none" aria-live="polite">
        {toasts.map(t => (
          <ToastItem
            key={t.id}
            toast={t}
            onDismiss={(id) => setToasts(ts => ts.filter(x => x.id !== id))}
          />
        ))}
      </div>
    </>
  )
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  const icons = {
    success: <CheckCircle className="w-4 h-4 text-ark-primary flex-shrink-0" />,
    error: <AlertCircle className="w-4 h-4 text-ark-error flex-shrink-0" />,
    info: <Info className="w-4 h-4 text-ark-info flex-shrink-0" />,
  }

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-4 py-3 rounded-card shadow-card border bg-ark-surface-elevated pointer-events-auto',
        'transition-all duration-200 min-w-[280px] max-w-[400px]',
        toast.type === 'success' && 'border-ark-primary/40',
        toast.type === 'error' && 'border-red-800',
        toast.type === 'info' && 'border-blue-800',
        visible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'
      )}
    >
      {icons[toast.type]}
      <p className="text-sm text-ark-text-primary flex-1">{toast.message}</p>
      <button
        onClick={() => onDismiss(toast.id)}
        className="text-ark-text-muted hover:text-ark-text-primary transition-colors pointer-events-auto"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

// Hook — no useContext needed
export function useToast() {
  return {
    toast: toastStore.emit,
    success: toastStore.success,
    error: toastStore.error,
    info: toastStore.info,
  }
}
