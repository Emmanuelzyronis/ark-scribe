// Global toast store — no React context needed
// Pages emit toast events; the ToastProvider renders them

type ToastType = 'success' | 'error' | 'info'

interface ToastListener {
  (message: string, type: ToastType): void
}

let listeners: ToastListener[] = []

export const toastStore = {
  emit: (message: string, type: ToastType = 'info') => {
    listeners.forEach(fn => fn(message, type))
  },
  success: (message: string) => toastStore.emit(message, 'success'),
  error: (message: string) => toastStore.emit(message, 'error'),
  info: (message: string) => toastStore.emit(message, 'info'),
  subscribe: (fn: ToastListener) => {
    listeners.push(fn)
    return () => { listeners = listeners.filter(l => l !== fn) }
  },
}
