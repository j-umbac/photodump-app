<template>
  <div class="min-h-screen bg-[#F5F5F7] text-foreground font-sans">
    <header class="sticky top-0 z-50 border-b border-zinc-200/50 bg-white/70 backdrop-blur-xl">
      <div class="container flex items-center h-16 max-w-6xl px-6 mx-auto justify-between">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <span class="text-white font-bold text-lg">P</span>
          </div>
          <h1 class="text-xl font-semibold tracking-tight">Dashboard</h1>
        </div>
        <div class="flex items-center gap-4">
          <Button variant="secondary" size="sm" @click="handleSignOut">Sign Out</Button>
        </div>
      </div>
    </header>

    <div v-if="isLoading" class="flex flex-col items-center justify-center min-h-[calc(100vh-64px)]">
      <div class="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      <p class="mt-4 text-zinc-500 font-medium">Loading settings...</p>
    </div>

    <main v-else class="container max-w-6xl px-6 py-12 mx-auto">
      <div class="grid gap-8 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle class="text-2xl font-bold tracking-tight">Dump Page Configuration</CardTitle>
            <CardDescription class="text-muted-foreground text-base">
              Customize the appearance of your public photo dump page.
            </CardDescription>
          </CardHeader>
          <CardContent class="space-y-6 pt-4">
            <div class="space-y-2">
              <label for="title" class="text-sm font-semibold text-zinc-700">Page Title</label>
              <Input id="title" v-model="title" placeholder="e.g. Summer Vacay 2026" class="rounded-xl border-zinc-200 focus:ring-primary/20" />
            </div>
            <div class="space-y-2">
              <label for="description" class="text-sm font-semibold text-zinc-700">Description</label>
              <Textarea id="description" v-model="description" placeholder="Drop your favorite moments here..." class="rounded-xl border-zinc-200 focus:ring-primary/20 min-h-[100px]" />
            </div>
            <div class="space-y-2">
              <label class="text-sm font-semibold text-zinc-700">Theme Color</label>
              <div class="flex gap-3">
                <button 
                  class="w-8 h-8 rounded-full bg-[#0071E3]"
                  :class="{ 'ring-2 ring-offset-2 ring-[#0071E3]': theme === 'blue' }"
                  @click="theme = 'blue'"
                ></button>
                <button 
                  class="w-8 h-8 rounded-full bg-zinc-900"
                  :class="{ 'ring-2 ring-offset-2 ring-zinc-900': theme === 'dark' }"
                  @click="theme = 'dark'"
                ></button>
                <button 
                  class="w-8 h-8 rounded-full bg-purple-600"
                  :class="{ 'ring-2 ring-offset-2 ring-purple-600': theme === 'purple' }"
                  @click="theme = 'purple'"
                ></button>
                <button 
                  class="w-8 h-8 rounded-full bg-rose-500"
                  :class="{ 'ring-2 ring-offset-2 ring-rose-500': theme === 'rose' }"
                  @click="theme = 'rose'"
                ></button>
              </div>
            </div>
          </CardContent>
          <CardFooter class="pt-6">
            <Button class="w-full sm:w-auto" :disabled="isSaving" @click="handleSave">
              {{ isSaving ? 'Saving...' : 'Save Changes' }}
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle class="text-2xl font-bold tracking-tight">URL & Sharing</CardTitle>
            <CardDescription class="text-muted-foreground text-base">
              Manage your dump page URL and generate a QR code.
            </CardDescription>
          </CardHeader>
          <CardContent class="space-y-6 pt-4">
            <div class="space-y-2">
              <label for="custom-url" class="text-sm font-semibold text-zinc-700">Custom URL</label>
              <div class="flex items-center space-x-2">
                <span class="text-zinc-400 font-medium">photodump.app/</span>
                <Input id="custom-url" v-model="slug" placeholder="summer-26" class="rounded-xl border-zinc-200 focus:ring-primary/20" />
              </div>
            </div>
            <div class="pt-4">
              <h3 class="text-sm font-semibold text-zinc-700">QR Code</h3>
              <div class="flex flex-col items-center justify-center p-8 mt-2 rounded-3xl bg-zinc-50 border border-zinc-100">
                <div class="w-40 h-40 bg-white p-4 rounded-2xl shadow-sm flex items-center justify-center border border-zinc-100 overflow-hidden">
                  <img v-if="qrCodeUrl" :src="qrCodeUrl" alt="QR Code" class="w-full h-full object-contain" />
                  <div v-else class="w-full h-full bg-zinc-100 rounded-lg flex items-center justify-center">
                    <svg class="w-12 h-12 text-zinc-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"></path></svg>
                  </div>
                </div>
                <p class="mt-4 text-sm text-zinc-500">Scan to visit dump page</p>
              </div>
            </div>
          </CardContent>
          <CardFooter class="flex flex-col sm:flex-row gap-3 pt-6 w-full">
            <Button variant="secondary" class="w-full sm:w-1/2" @click="downloadQrCode">Download QR Code</Button>
            <Button variant="outline" class="w-full sm:w-1/2" @click="copyLink">Copy Link</Button>
          </CardFooter>
        </Card>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { collection, query, where, getDocs, doc, setDoc, deleteDoc, getDoc } from 'firebase/firestore'
import { db, signOut } from '~/lib/firebase'
import { useAuth } from '~/composables/useAuth'

import { Button } from '~/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '~/components/ui/card'
import { Input } from '~/components/ui/input'
import { Textarea } from '~/components/ui/textarea'

definePageMeta({
  middleware: 'auth'
})

const { user } = useAuth()
const title = ref('')
const description = ref('')
const theme = ref('blue')
const slug = ref('')
const originalSlug = ref('')
const isSaving = ref(false)
const isLoading = ref(true)

// Fetch or create the user's config
onMounted(async () => {
  if (!user.value) return
  
  try {
    const q = query(collection(db, 'dumps'), where('creatorId', '==', user.value.uid))
    const querySnapshot = await getDocs(q)
    
    if (!querySnapshot.empty) {
      const docSnap = querySnapshot.docs[0]
      const data = docSnap.data()
      title.value = data.title || ''
      description.value = data.description || ''
      theme.value = data.theme || 'blue'
      slug.value = docSnap.id
      originalSlug.value = docSnap.id
    } else {
      // Create a default initial slug based on user uid or displayName
      const defaultSlug = (user.value.displayName || 'user')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-') + '-' + Math.random().toString(36).substring(2, 5)
      
      title.value = `${user.value.displayName || 'My'} Dump 🎉`
      description.value = 'Drop your favorite photos and videos here!'
      theme.value = 'blue'
      slug.value = defaultSlug
      originalSlug.value = ''
    }
  } catch (error) {
    console.error('Error fetching configuration:', error)
  } finally {
    isLoading.value = false
  }
})

async function handleSave() {
  if (!user.value) return
  
  // Format slug to make it URL-safe
  const currentSlug = slug.value
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

  if (!currentSlug) {
    alert('Please enter a valid custom URL slug (letters, numbers, dashes, and underscores only).')
    return
  }
  
  isSaving.value = true
  try {
    // If slug changed, check if new slug is already taken
    if (originalSlug.value && originalSlug.value !== currentSlug) {
      const docRef = doc(db, 'dumps', currentSlug)
      const docSnap = await getDoc(docRef)
      if (docSnap.exists() && docSnap.data().creatorId !== user.value.uid) {
        alert('This custom URL is already in use by another dump.')
        isSaving.value = false
        return
      }
      
      // Delete old document
      await deleteDoc(doc(db, 'dumps', originalSlug.value))
    }
    
    // Save new/updated document
    await setDoc(doc(db, 'dumps', currentSlug), {
      creatorId: user.value.uid,
      title: title.value,
      description: description.value,
      theme: theme.value,
      slug: currentSlug
    })
    
    slug.value = currentSlug
    originalSlug.value = currentSlug
    alert('Changes saved successfully!')
  } catch (error) {
    console.error('Error saving configuration:', error)
    alert('Failed to save changes. Please try again.')
  } finally {
    isSaving.value = false
  }
}

const publicUrl = computed(() => {
  if (!slug.value) return ''
  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'
  return `${origin}/${slug.value}`
})

const qrCodeUrl = computed(() => {
  if (!slug.value) return ''
  return `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(publicUrl.value)}`
})

function copyLink() {
  if (!publicUrl.value) return
  navigator.clipboard.writeText(publicUrl.value)
  alert('Link copied to clipboard!')
}

function downloadQrCode() {
  if (!qrCodeUrl.value) return
  window.open(qrCodeUrl.value, '_blank')
}

async function handleSignOut() {
  try {
    await signOut()
    await navigateTo('/login')
  } catch (error) {
    console.error('Sign-out error:', error)
    alert('Sign-out failed. Please try again.')
  }
}
</script>
