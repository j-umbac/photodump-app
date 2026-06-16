import { authInitialized } from '~/lib/firebase'
import { useAuth } from '~/composables/useAuth'

export default defineNuxtRouteMiddleware(async (to, from) => {
  if (import.meta.server) return

  await authInitialized()
  const { user } = useAuth()

  if (!user.value) {
    return navigateTo('/login')
  }
})
