<script setup lang="ts">
import { useToast } from '~/composables/useToast'
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from '@lucide/vue'

const { toasts, removeToast } = useToast()

const getIcon = (type: string) => {
  switch (type) {
    case 'success':
      return CheckCircle
    case 'error':
      return AlertCircle
    case 'warning':
      return AlertTriangle
    case 'info':
    default:
      return Info
  }
}

const getToastClass = (type: string) => {
  switch (type) {
    case 'success':
      return 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-400'
    case 'error':
      return 'bg-red-50 border-red-200 text-red-800 dark:bg-red-500/10 dark:border-red-500/20 dark:text-red-400'
    case 'warning':
      return 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-500/10 dark:border-amber-500/20 dark:text-amber-400'
    case 'info':
    default:
      return 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-500/10 dark:border-blue-500/20 dark:text-blue-400'
  }
}

const getIconClass = (type: string) => {
  switch (type) {
    case 'success':
      return 'text-emerald-500 dark:text-emerald-400'
    case 'error':
      return 'text-red-500 dark:text-red-400'
    case 'warning':
      return 'text-amber-500 dark:text-amber-400'
    case 'info':
    default:
      return 'text-blue-500 dark:text-blue-400'
  }
}
</script>

<template>
  <div class="fixed bottom-0 right-0 z-50 p-4 md:p-6 w-full md:w-auto md:max-w-md flex flex-col gap-3 pointer-events-none">
    <TransitionGroup 
      name="toast" 
      tag="div"
      class="flex flex-col gap-3"
    >
      <div 
        v-for="toast in toasts" 
        :key="toast.id"
        class="pointer-events-auto flex w-full items-start gap-3 rounded-lg border p-4 shadow-lg backdrop-blur-sm transition-all"
        :class="getToastClass(toast.type)"
      >
        <component :is="getIcon(toast.type)" class="h-5 w-5 shrink-0 mt-0.5" :class="getIconClass(toast.type)" />
        <div class="flex-1 space-y-1">
          <p class="text-sm font-semibold leading-none tracking-tight">{{ toast.title }}</p>
          <p v-if="toast.description" class="text-sm opacity-90">{{ toast.description }}</p>
        </div>
        <button 
          @click="removeToast(toast.id)"
          class="shrink-0 rounded-md p-1 opacity-50 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-black/20"
          aria-label="Close"
        >
          <X class="h-4 w-4" />
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.toast-enter-from {
  opacity: 0;
  transform: translateY(1rem) scale(0.95);
}

.toast-leave-to {
  opacity: 0;
  transform: translateY(-1rem) scale(0.95);
}
</style>
