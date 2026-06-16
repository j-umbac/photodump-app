<template>
  <ClientOnly>
    <div class="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
      <!-- Panel -->
      <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="transform translate-y-2 opacity-0"
        enter-to-class="transform translate-y-0 opacity-100"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="transform translate-y-0 opacity-100"
        leave-to-class="transform translate-y-2 opacity-0"
      >
        <div v-if="isOpen" class="bg-card text-card-foreground border border-border rounded-xl shadow-lg p-4 w-64 flex flex-col gap-4">
          
          <div>
            <h3 class="text-sm font-semibold mb-2">Theme Mode</h3>
            <div class="flex items-center gap-2 bg-secondary p-1 rounded-lg">
              <button 
                @click="colorMode = 'light'"
                class="flex-1 flex justify-center py-1.5 rounded-md text-sm transition-colors"
                :class="colorMode === 'light' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'"
              >
                <Sun class="w-4 h-4" />
              </button>
              <button 
                @click="colorMode = 'dark'"
                class="flex-1 flex justify-center py-1.5 rounded-md text-sm transition-colors"
                :class="colorMode === 'dark' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'"
              >
                <Moon class="w-4 h-4" />
              </button>
              <button 
                @click="colorMode = 'auto'"
                class="flex-1 flex justify-center py-1.5 rounded-md text-sm transition-colors"
                :class="colorMode === 'auto' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'"
              >
                <Monitor class="w-4 h-4" />
              </button>
            </div>
          </div>

          <div>
            <h3 class="text-sm font-semibold mb-2">Theme Color</h3>
            <div class="flex items-center gap-3 flex-wrap">
              <button
                v-for="color in themeColors"
                :key="color.value"
                @click="themeColor = color.value"
                class="w-6 h-6 rounded-full ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                :class="[
                  color.bgClass,
                  themeColor === color.value ? 'ring-2 ring-ring ring-offset-2' : ''
                ]"
                :title="color.label"
              ></button>
            </div>
          </div>

        </div>
      </Transition>

      <!-- Toggle Button -->
      <button 
        @click="isOpen = !isOpen"
        class="bg-primary text-primary-foreground p-3 rounded-full shadow-lg hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        aria-label="Customize Theme"
      >
        <Settings2 class="w-5 h-5" />
      </button>
    </div>
  </ClientOnly>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Sun, Moon, Monitor, Settings2 } from '@lucide/vue'
import { useTheme, type ThemeColor } from '~/composables/useTheme'

const { colorMode, themeColor } = useTheme()
const isOpen = ref(false)

const themeColors: { value: ThemeColor, label: string, bgClass: string }[] = [
  { value: 'zinc', label: 'Zinc', bgClass: 'bg-zinc-900 dark:bg-zinc-100' },
  { value: 'red', label: 'Red', bgClass: 'bg-red-500' },
  { value: 'orange', label: 'Orange', bgClass: 'bg-orange-500' },
  { value: 'green', label: 'Green', bgClass: 'bg-green-600' },
  { value: 'blue', label: 'Blue', bgClass: 'bg-blue-600' },
]
</script>
