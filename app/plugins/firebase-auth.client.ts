import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '~/lib/firebase'
import { useAuth } from '~/composables/useAuth'

export default defineNuxtPlugin((nuxtApp) => {
  const { user, loading } = useAuth()

  onAuthStateChanged(auth, (fbUser) => {
    user.value = fbUser
    loading.value = false
  })
})
