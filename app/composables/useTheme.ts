import { useColorMode, useStorage } from '@vueuse/core'
import { watchEffect, onMounted } from 'vue'

export type ThemeColor = 'blue' | 'zinc' | 'red' | 'green' | 'orange'

export const useTheme = () => {
  // VueUse's useColorMode automatically handles 'light', 'dark', 'auto' 
  // and syncs with system preference and local storage.
  const colorMode = useColorMode({
    attribute: 'class',
    modes: {
      dark: 'dark',
      light: 'light'
    }
  })
  
  const themeColor = useStorage<ThemeColor>('photodump-theme-color', 'blue')
  
  // Apply theme color class to HTML
  const applyThemeColor = (color: ThemeColor) => {
    if (import.meta.server) return
    const htmlEl = document.documentElement
    
    // Remove existing theme classes
    htmlEl.classList.forEach(className => {
      if (className.startsWith('theme-')) {
        htmlEl.classList.remove(className)
      }
    })
    
    // Add new theme class
    htmlEl.classList.add(`theme-${color}`)
  }
  
  // On client side, watch and apply
  onMounted(() => {
    watchEffect(() => {
      applyThemeColor(themeColor.value)
    })
  })
  
  return {
    colorMode,
    themeColor
  }
}
