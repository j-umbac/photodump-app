import { ref } from 'vue'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface Toast {
  id: string
  title: string
  description?: string
  type: ToastType
  duration?: number
}

const toasts = ref<Toast[]>([])

export const useToast = () => {
  const addToast = (toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9)
    const newToast = { ...toast, id }
    toasts.value.push(newToast)

    if (toast.duration !== 0) {
      setTimeout(() => {
        removeToast(id)
      }, toast.duration || 5000)
    }
  }

  const removeToast = (id: string) => {
    toasts.value = toasts.value.filter(t => t.id !== id)
  }

  const success = (title: string, description?: string) => {
    addToast({ title, description, type: 'success' })
  }

  const error = (title: string, description?: string) => {
    addToast({ title, description, type: 'error' })
  }

  const info = (title: string, description?: string) => {
    addToast({ title, description, type: 'info' })
  }

  const warning = (title: string, description?: string) => {
    addToast({ title, description, type: 'warning' })
  }

  return {
    toasts,
    addToast,
    removeToast,
    success,
    error,
    info,
    warning
  }
}
