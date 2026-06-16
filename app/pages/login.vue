<template>
  <div class="flex flex-col items-center justify-center min-h-screen bg-[#F5F5F7] p-6 font-sans">
    <div class="w-full max-w-[400px] space-y-12">
      <div class="flex flex-col items-center text-center space-y-4">
        <div class="w-16 h-16 rounded-2xl bg-primary shadow-lg shadow-primary/20 flex items-center justify-center mb-2">
          <span class="text-white font-bold text-3xl">P</span>
        </div>
        <h1 class="text-4xl font-bold tracking-tight text-zinc-900">
          PhotoDump
        </h1>
        <p class="text-lg text-zinc-500 max-w-[280px]">
          Create unique photo dumps and share memories effortlessly.
        </p>
      </div>

      <Card class="p-2 border-zinc-100 shadow-[0_8px_32px_rgba(0,0,0,0.06)]">
        <CardContent class="pt-6 space-y-4">
          <Button class="w-full h-12 text-base font-semibold transition-all hover:scale-[1.01]" @click="handleSignIn">
            <svg class="w-5 h-5 mr-3" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continue with Google
          </Button>
          <div class="relative flex items-center py-2">
            <div class="flex-grow border-t border-zinc-100"></div>
            <span class="flex-shrink mx-4 text-xs font-medium text-zinc-400 uppercase tracking-widest">or</span>
            <div class="flex-grow border-t border-zinc-100"></div>
          </div>
          <Button variant="secondary" class="w-full h-12 text-base font-semibold" disabled>
            Sign in with Email
          </Button>
        </CardContent>
      </Card>

      <p class="text-center text-sm text-zinc-400">
        By continuing, you agree to our <a href="#" class="text-primary hover:underline">Terms of Service</a>.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Button } from '~/components/ui/button'
import { signInWithGoogle } from '~/lib/firebase'

definePageMeta({
  middleware: 'guest'
})

async function handleSignIn() {
  try {
    await signInWithGoogle()
    await navigateTo('/dashboard')
  } catch (error) {
    console.error('Sign-in error:', error)
    alert('Sign-in failed. Please try again.')
  }
}
</script>

