<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { collection, doc, getDoc, setDoc, deleteDoc, getDocs } from 'firebase/firestore'
import { db } from '~/lib/firebase'
import { useAuth } from '~/composables/useAuth'
import { useToast } from '~/composables/useToast'
import { useRoute, useRouter } from '#app'

import { Button } from '~/components/ui/button'
import { Card } from '~/components/ui/card'
import { Input } from '~/components/ui/input'
import { Textarea } from '~/components/ui/textarea'

definePageMeta({
  middleware: 'auth'
})

const route = useRoute()
const router = useRouter()
const { user } = useAuth()
const toast = useToast()

const selectedDump = ref<any | null>(null)
const isLoading = ref(true)
const isSaving = ref(false)

const gdriveConfig = ref({
  gdriveConnected: false,
  gdriveFolderName: 'Photodump'
})

const editTitle = ref('')
const editDescription = ref('')
const editSlug = ref('')
const editPrivacy = ref('Public (Anonymous)')
const editStatus = ref('Live')
const editPassword = ref('')
const editThemeColor = ref('blue')
const editThemeMode = ref('dark')
const editCustomTheme = ref({ primary: '#0071e3', secondary: '#f4f4f5', background: '#ffffff', text: '#000000' })
const editTitleFont = ref('Inter')
const editDescFont = ref('Inter')

const availableFonts = [
  'Inter', 'Playfair Display', 'Outfit', 'Lora', 'Space Grotesk', 'Caveat', 'JetBrains Mono', 'Cinzel',
  'Roboto', 'Open Sans', 'Montserrat', 'Lato', 'Poppins', 'Nunito', 'Raleway', 'Oswald', 'Merriweather', 
  'Quicksand', 'Work Sans', 'Fira Code', 'Pacifico', 'Dancing Script', 'Bebas Neue', 'Great Vibes'
]

const presetThemes = [
  { name: 'Light Default', primary: '#0071e3', secondary: '#f4f4f5', background: '#ffffff', text: '#000000' },
  { name: 'Dark Default', primary: '#0a84ff', secondary: '#27272a', background: '#09090b', text: '#fafafa' },
  { name: 'Midnight Violet', primary: '#9333ea', secondary: '#1e1b4b', background: '#020617', text: '#e9d5ff' },
  { name: 'Forest Green', primary: '#16a34a', secondary: '#dcfce7', background: '#f0fdf4', text: '#14532d' },
  { name: 'Sunset Orange', primary: '#ea580c', secondary: '#ffedd5', background: '#fff7ed', text: '#7c2d12' },
  { name: 'Rose Gold', primary: '#e11d48', secondary: '#ffe4e6', background: '#fff1f2', text: '#881337' }
]

function applyPreset(preset: any) {
  editCustomTheme.value = { ...preset }
}

function hexToHSL(H: string) {
  let r = 0, g = 0, b = 0;
  if (H.length == 4) {
    r = parseInt("0x" + H[1] + H[1], 16);
    g = parseInt("0x" + H[2] + H[2], 16);
    b = parseInt("0x" + H[3] + H[3], 16);
  } else if (H.length == 7) {
    r = parseInt("0x" + H[1] + H[2], 16);
    g = parseInt("0x" + H[3] + H[4], 16);
    b = parseInt("0x" + H[5] + H[6], 16);
  }
  r /= 255; g /= 255; b /= 255;
  let cmin = Math.min(r,g,b), cmax = Math.max(r,g,b), delta = cmax - cmin, h = 0, s = 0, l = 0;

  if (delta == 0) h = 0;
  else if (cmax == r) h = ((g - b) / delta) % 6;
  else if (cmax == g) h = (b - r) / delta + 2;
  else h = (r - g) / delta + 4;

  h = Math.round(h * 60);
  if (h < 0) h += 360;

  l = (cmax + cmin) / 2;
  s = delta == 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
  s = +(s * 100).toFixed(1);
  l = +(l * 100).toFixed(1);

  return `${h} ${s}% ${l}%`;
}

function getAccessibleColor(bgHex: string, defaultTextHex: string) {
  const getLum = (H: string) => {
    let r = 0, g = 0, b = 0;
    if (H.length == 4) {
      r = parseInt("0x" + H[1] + H[1], 16);
      g = parseInt("0x" + H[2] + H[2], 16);
      b = parseInt("0x" + H[3] + H[3], 16);
    } else if (H.length == 7) {
      r = parseInt("0x" + H[1] + H[2], 16);
      g = parseInt("0x" + H[3] + H[4], 16);
      b = parseInt("0x" + H[5] + H[6], 16);
    }
    const a = [r, g, b].map(function (v) {
        v /= 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow( (v + 0.055) / 1.055, 2.4 );
    });
    return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
  }
  
  const bgLum = getLum(bgHex);
  const textLum = getLum(defaultTextHex);
  const contrast = (Math.max(bgLum, textLum) + 0.05) / (Math.min(bgLum, textLum) + 0.05);
  
  if (contrast < 4.0) {
    return bgLum > 0.5 ? '#000000' : '#ffffff';
  }
  return defaultTextHex;
}

const previewThemeStyles = computed(() => {
  const theme = editCustomTheme.value
  return {
    '--primary': hexToHSL(theme.primary),
    '--primary-foreground': hexToHSL(getAccessibleColor(theme.primary, theme.text)),
    '--secondary': hexToHSL(theme.secondary),
    '--secondary-foreground': hexToHSL(getAccessibleColor(theme.secondary, theme.text)),
    '--background': hexToHSL(theme.background),
    '--foreground': hexToHSL(theme.text),
    '--card': hexToHSL(theme.background),
    '--card-foreground': hexToHSL(theme.text),
    '--muted': hexToHSL(theme.secondary),
    '--muted-foreground': hexToHSL(theme.text),
    '--border': hexToHSL(theme.secondary)
  }
})

useHead({
  link: computed(() => {
    const fonts = new Set([editTitleFont.value, editDescFont.value])
    const links: any[] = []
    fonts.forEach(font => {
      if (font && font !== 'Inter' && font !== 'system-ui') {
        links.push({
          rel: 'stylesheet',
          href: `https://fonts.googleapis.com/css2?family=${font.replace(/ /g, '+')}:wght@400;500;600;700;800&display=swap`
        })
      }
    })
    return links
  })
})

function formatBytes(bytes: number, decimals = 1) {
  if (bytes === 0) return '0 MB'
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  if (i < 2) return '0.1 MB' // Clamp to minimum of MB for design consistency if small
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}

onMounted(async () => {
  if (!user.value) {
    // If not authenticated, let middleware handle redirect
    return
  }
  await fetchGDriveConfig()
  await fetchDump()
})

async function fetchGDriveConfig() {
  if (!user.value) return
  try {
    const userDoc = await getDoc(doc(db, 'users', user.value.uid))
    if (userDoc.exists()) {
      const data = userDoc.data()
      gdriveConfig.value = {
        gdriveConnected: data.gdriveConnected || false,
        gdriveFolderName: data.gdriveFolderName || 'Photodump'
      }
    }
  } catch (e) {
    console.error('Error fetching Google Drive settings:', e)
  }
}

async function fetchDump() {
  const slug = route.params.id as string
  try {
    const docSnap = await getDoc(doc(db, 'dumps', slug))
    if (!docSnap.exists() || docSnap.data().creatorId !== user.value?.uid) {
      toast.error('Not Found', 'Dump not found or you do not have permission.')
      router.push('/dashboard')
      return
    }

    const data = docSnap.data()
    const filesQuery = await getDocs(collection(db, 'dumps', slug, 'files'))
    const filesCount = filesQuery.size
    let totalSizeVal = 0
    
    const filesList = filesQuery.docs.map(f => {
      const fileData = f.data()
      totalSizeVal += fileData.size || 0
      return {
        id: f.id,
        ...fileData
      }
    })

    const dump = {
      id: docSnap.id,
      title: data.title || 'Untitled Dump',
      description: data.description || '',
      themeColor: data.themeColor || 'blue',
      themeMode: data.themeMode || 'dark',
      customTheme: data.customTheme || { primary: '#0071e3', secondary: '#f4f4f5', background: '#ffffff', text: '#000000' },
      titleFont: data.titleFont || data.fontFamily || 'Inter',
      descFont: data.descFont || data.fontFamily || 'Inter',
      slug: data.slug || docSnap.id,
      status: data.status || 'Live',
      privacy: data.privacy || 'Public (Anonymous)',
      password: data.password || '',
      filesCount: filesCount,
      totalSize: totalSizeVal > 0 ? formatBytes(totalSizeVal) : (data.totalSize || '0 MB'),
      totalSizeBytes: totalSizeVal,
      gdriveFolderId: data.gdriveFolderId || '',
      files: filesList.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
    }

    selectedDump.value = dump
    editTitle.value = dump.title
    editDescription.value = dump.description
    editSlug.value = dump.slug
    editPrivacy.value = dump.privacy
    editStatus.value = dump.status
    editPassword.value = dump.password
    editThemeColor.value = dump.themeColor
    editThemeMode.value = dump.themeMode
    editCustomTheme.value = dump.customTheme
    editTitleFont.value = dump.titleFont
    editDescFont.value = dump.descFont

  } catch (error) {
    console.error('Error fetching dump:', error)
  } finally {
    isLoading.value = false
  }
}

async function handleSaveDumpConfig() {
  if (!user.value || !selectedDump.value) return
  
  const currentSlug = editSlug.value
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

  if (!editTitle.value.trim()) {
    toast.warning('Missing Title', 'Dump Title cannot be empty.')
    return
  }
  if (!currentSlug) {
    toast.warning('Missing Slug', 'Please enter a valid Custom Slug path.')
    return
  }

  isSaving.value = true
  try {
    const oldSlug = selectedDump.value.id
    
    // Check if slug changed
    if (oldSlug !== currentSlug) {
      const docRef = doc(db, 'dumps', currentSlug)
      const docSnap = await getDoc(docRef)
      if (docSnap.exists()) {
        toast.error('Slug Taken', 'This custom URL is already in use by another dump.')
        isSaving.value = false
        return
      }

      // Move files in Firestore subcollection
      const filesQuery = await getDocs(collection(db, 'dumps', oldSlug, 'files'))
      for (const fileDoc of filesQuery.docs) {
        await setDoc(doc(db, 'dumps', currentSlug, 'files', fileDoc.id), fileDoc.data())
        await deleteDoc(doc(db, 'dumps', oldSlug, 'files', fileDoc.id))
      }
      
      // Delete old parent document
      await deleteDoc(doc(db, 'dumps', oldSlug))
    }

    // Update document
    const payload = {
      title: editTitle.value,
      description: editDescription.value,
      slug: currentSlug,
      privacy: editPrivacy.value,
      status: editStatus.value,
      password: editPassword.value,
      themeColor: editThemeColor.value,
      themeMode: editThemeMode.value,
      customTheme: editCustomTheme.value,
      titleFont: editTitleFont.value,
      descFont: editDescFont.value,
      updatedAt: Date.now()
    }
    
    const dumpData = {
      creatorId: user.value.uid,
      ...payload,
      filesCount: selectedDump.value.filesCount,
      totalSize: selectedDump.value.totalSize,
      gdriveFolderId: selectedDump.value.gdriveFolderId
    }
    
    await setDoc(doc(db, 'dumps', currentSlug), dumpData)
    
    toast.success('Success', 'Dump configuration updated successfully!')
    if (oldSlug !== currentSlug) {
      router.push(`/dashboard/${currentSlug}`)
    } else {
      await fetchDump()
    }
  } catch (error) {
    console.error('Error saving configuration:', error)
    toast.error('Error', 'Failed to save configuration. Please try again.')
  } finally {
    isSaving.value = false
  }
}

async function handleDeleteDump() {
  if (!selectedDump.value) return
  if (!confirm('Are you sure you want to delete this dump? This will permanently delete all associated metadata and files. This action is irreversible.')) return
  
  isSaving.value = true
  try {
    const filesQuery = await getDocs(collection(db, 'dumps', selectedDump.value.id, 'files'))
    for (const fileDoc of filesQuery.docs) {
      await deleteDoc(doc(db, 'dumps', selectedDump.value.id, 'files', fileDoc.id))
    }

    await deleteDoc(doc(db, 'dumps', selectedDump.value.id))
    
    toast.success('Deleted', 'Dump deleted successfully.')
    router.push('/dashboard')
  } catch (error) {
    console.error('Error deleting dump:', error)
    toast.error('Error', 'Failed to delete dump. Please try again.')
  } finally {
    isSaving.value = false
  }
}

async function deleteFile(fileId: string, filePath?: string) {
  if (!selectedDump.value) return
  if (!confirm('Are you sure you want to delete this file?')) return
  
  try {
    await deleteDoc(doc(db, 'dumps', selectedDump.value.id, 'files', fileId))
    
    const fileItem = selectedDump.value.files.find((f: any) => f.id === fileId)
    const fileSize = fileItem?.size || 0
    
    const newFilesCount = Math.max(0, (selectedDump.value.filesCount || 1) - 1)
    const currentBytes = selectedDump.value.totalSizeBytes || 0
    const newBytes = Math.max(0, currentBytes - fileSize)
    
    await setDoc(doc(db, 'dumps', selectedDump.value.id), {
      filesCount: newFilesCount,
      totalSize: formatBytes(newBytes)
    }, { merge: true })
    
    toast.success('Deleted', 'File deleted successfully!')
    await fetchDump()
  } catch (error) {
    console.error('Error deleting file:', error)
    toast.error('Error', 'Failed to delete file.')
  }
}

const publicUrl = computed(() => {
  if (!selectedDump.value) return ''
  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'
  return `${origin}/${selectedDump.value.slug}`
})

const qrCodeUrl = computed(() => {
  if (!selectedDump.value) return ''
  return `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(publicUrl.value)}`
})

function copyLink() {
  if (!publicUrl.value) return
  navigator.clipboard.writeText(publicUrl.value)
  toast.success('Copied', 'Link copied to clipboard!')
}

function downloadQrCode() {
  if (!qrCodeUrl.value) return
  window.open(qrCodeUrl.value, '_blank')
}
</script>

<template>
  <div class="min-h-screen bg-background text-foreground font-sans selection:bg-primary/30 selection:text-primary-foreground">
    <!-- Header -->
    <header class="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur-2xl transition-all duration-300">
      <div class="container max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <NuxtLink to="/dashboard" class="flex items-center gap-2 cursor-pointer">
          <div class="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
            <span class="text-foreground font-extrabold text-lg tracking-tighter">P</span>
          </div>
          <span class="text-xl font-bold tracking-tight text-foreground">PhotoDump<span class="text-primary">.</span></span>
        </NuxtLink>
        <div class="flex items-center gap-4">
          <span class="text-xs font-mono text-muted-foreground hidden sm:inline">{{ user?.email }}</span>
        </div>
      </div>
    </header>

    <!-- Loading State -->
    <div v-if="isLoading" class="flex flex-col items-center justify-center min-h-[calc(100vh-64px)]">
      <div class="w-8 h-8 border-4 border-[#0071e3] border-t-transparent rounded-full animate-spin"></div>
      <p class="mt-4 text-muted-foreground font-mono text-sm">Loading configuration...</p>
    </div>

    <!-- Main Content -->
    <main v-else-if="selectedDump" class="container max-w-6xl px-6 py-12 mx-auto space-y-12">
      <!-- Title Header -->
      <div class="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border pb-8">
        <div class="space-y-2">
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-card/50 text-[10px] font-mono text-primary uppercase tracking-wider">
            ● Creator Portal
          </div>
          <h1 class="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">
            Configuring Dump
          </h1>
          <p class="text-sm text-muted-foreground">
            Manage page settings, custom URLs, and files for {{ selectedDump.title }}
          </p>
        </div>
        <div class="flex gap-3">
          <NuxtLink to="/dashboard">
            <Button variant="outline" class="border-border text-muted-foreground hover:text-foreground hover:bg-secondary">
              <Icon name="material-symbols:line-start-arrow"/> Back to Overview
            </Button>
          </NuxtLink>
        </div>
      </div>

      <!-- DETAILED CONFIGURATION MODE -->
      <div class="space-y-12 animate-fade-in">
        <!-- Configuration Card Row -->
        <div class="grid lg:grid-cols-[1fr_400px] gap-8 items-start">
          <div class="space-y-8">
            <!-- Dump Settings Configuration -->
            <Card class="bg-card border-border p-8 rounded-3xl shadow-xl flex flex-col justify-between">
              <div class="space-y-6">
                <div>
                  <h3 class="text-xl font-bold text-foreground">Configuration Details</h3>
                  <p class="text-xs text-muted-foreground mt-1">Adjust title, colors, and accessibility defaults.</p>
                </div>

                <div class="space-y-4">
                  <div class="space-y-2">
                    <label class="text-xs font-mono uppercase text-muted-foreground font-bold tracking-wider">Dump Page Title</label>
                    <Input v-model="editTitle" placeholder="e.g. Wedding Highlights" class="bg-secondary border-border text-foreground rounded-xl focus:border-primary h-11" />
                  </div>

                  <div class="space-y-2">
                    <label class="text-xs font-mono uppercase text-muted-foreground font-bold tracking-wider">Description / Caption</label>
                    <Textarea v-model="editDescription" placeholder="Drop your favorite moments here..." class="bg-secondary border-border text-foreground rounded-xl focus:border-primary min-h-[90px]" />
                  </div>

                  <div class="space-y-2">
                    <label class="text-xs font-mono uppercase text-muted-foreground font-bold tracking-wider">Custom Slug Route</label>
                    <div class="flex items-center gap-2 bg-secondary px-3 py-1 border border-border rounded-xl focus-within:border-primary transition-colors">
                      <span class="text-muted-foreground font-mono text-sm select-none">/</span>
                      <input v-model="editSlug" class="bg-transparent border-none outline-none text-foreground font-mono text-sm py-2 flex-1" />
                    </div>
                  </div>

                  <div class="grid grid-cols-2 gap-4">
                    <div class="space-y-2">
                      <label class="text-xs font-mono uppercase text-muted-foreground font-bold tracking-wider">Access Privacy</label>
                      <select v-model="editPrivacy" class="w-full bg-secondary border border-border text-foreground text-sm rounded-xl px-3 py-2.5 outline-none focus:border-primary h-11">
                        <option>Public (Anonymous)</option>
                        <option>Password Protected</option>
                        <option>Private (Approval only)</option>
                      </select>
                    </div>

                    <div class="space-y-2">
                      <label class="text-xs font-mono uppercase text-muted-foreground font-bold tracking-wider">Dump Status</label>
                      <select v-model="editStatus" class="w-full bg-secondary border border-border text-foreground text-sm rounded-xl px-3 py-2.5 outline-none focus:border-primary h-11">
                        <option>Live</option>
                        <option>Paused</option>
                      </select>
                    </div>
                  </div>

                  <div v-if="editPrivacy === 'Password Protected'" class="space-y-2">
                    <label class="text-xs font-mono uppercase text-muted-foreground font-bold tracking-wider">Access Password</label>
                    <Input v-model="editPassword" type="password" placeholder="Enter access password" class="bg-secondary border-border text-foreground rounded-xl focus:border-primary h-11" />
                  </div>

                  <div class="space-y-6">
                    <!-- Font Family Selector -->
                    <div class="grid grid-cols-2 gap-4">
                      <div class="space-y-2">
                        <label class="text-xs font-mono uppercase text-muted-foreground font-bold tracking-wider">Title Font</label>
                        <select v-model="editTitleFont" class="w-full bg-secondary border border-border text-foreground text-sm rounded-xl px-3 py-2.5 outline-none focus:border-primary h-11">
                          <option v-for="font in availableFonts.sort()" :key="font" :value="font">{{ font }}</option>
                        </select>
                      </div>
                      <div class="space-y-2">
                        <label class="text-xs font-mono uppercase text-muted-foreground font-bold tracking-wider">Desc Font</label>
                        <select v-model="editDescFont" class="w-full bg-secondary border border-border text-foreground text-sm rounded-xl px-3 py-2.5 outline-none focus:border-primary h-11">
                          <option v-for="font in availableFonts.sort()" :key="font" :value="font">{{ font }}</option>
                        </select>
                      </div>
                    </div>

                    <!-- Theme Selector -->
                    <div class="space-y-4 border-t border-border pt-4">
                      <label class="text-xs font-mono uppercase text-muted-foreground font-bold tracking-wider block">Dump Page Theme</label>
                      
                      <div class="space-y-3">
                        <p class="text-[11px] text-muted-foreground font-semibold">Preset Themes</p>
                        <div class="grid grid-cols-2 gap-2">
                          <Button 
                            v-for="preset in presetThemes" 
                            :key="preset.name"
                            size="sm"
                            variant="outline"
                            class="justify-start gap-2 h-auto py-2 px-3 border-border hover:bg-secondary"
                            @click="applyPreset(preset)"
                          >
                            <div class="flex flex-col gap-1 w-full">
                              <span class="text-xs font-bold text-left truncate text-foreground">{{ preset.name }}</span>
                              <div class="flex w-full h-2 rounded-full overflow-hidden border border-border/50">
                                <div class="flex-1" :style="{ backgroundColor: preset.primary }"></div>
                                <div class="flex-1" :style="{ backgroundColor: preset.secondary }"></div>
                                <div class="flex-1" :style="{ backgroundColor: preset.background }"></div>
                                <div class="flex-1" :style="{ backgroundColor: preset.text }"></div>
                              </div>
                            </div>
                          </Button>
                        </div>
                      </div>

                      <div class="space-y-3 pt-2">
                        <p class="text-[11px] text-muted-foreground font-semibold">Custom Colors</p>
                        <div class="grid grid-cols-4 gap-2">
                          <div class="space-y-1">
                            <label class="text-[10px] uppercase text-muted-foreground block text-center">Primary</label>
                            <input type="color" v-model="editCustomTheme.primary" class="w-full h-8 rounded cursor-pointer border-0 p-0" />
                          </div>
                          <div class="space-y-1">
                            <label class="text-[10px] uppercase text-muted-foreground block text-center">Second</label>
                            <input type="color" v-model="editCustomTheme.secondary" class="w-full h-8 rounded cursor-pointer border-0 p-0" />
                          </div>
                          <div class="space-y-1">
                            <label class="text-[10px] uppercase text-muted-foreground block text-center">Bg</label>
                            <input type="color" v-model="editCustomTheme.background" class="w-full h-8 rounded cursor-pointer border-0 p-0" />
                          </div>
                          <div class="space-y-1">
                            <label class="text-[10px] uppercase text-muted-foreground block text-center">Text</label>
                            <input type="color" v-model="editCustomTheme.text" class="w-full h-8 rounded cursor-pointer border-0 p-0" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div class="pt-8 flex justify-between items-center">
                <Button variant="destructive" class="bg-destructive/10 hover:bg-destructive/20 text-destructive border-none" @click="handleDeleteDump">
                  Delete Dump
                </Button>
                <Button class="bg-primary text-primary-foreground hover:bg-primary/90 px-8" :disabled="isSaving" @click="handleSaveDumpConfig">
                  {{ isSaving ? 'Saving Changes...' : 'Save Configuration' }}
                </Button>
              </div>
            </Card>

            <Card class="bg-card border-border p-8 rounded-3xl shadow-xl space-y-6">
              <div>
                <h3 class="text-xl font-bold text-foreground">Google Drive Destination</h3>
                <p class="text-xs text-muted-foreground mt-1">Files uploaded by users will route directly to this path.</p>
              </div>

              <div class="space-y-4">
                <div class="row-between card bg-secondary/40 p-4 border border-border rounded-2xl flex items-center justify-between">
                  <div class="flex items-center gap-3">
                    <svg class="w-6 h-6 text-primary" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z" />
                    </svg>
                    <span class="text-sm font-semibold text-foreground">Google Drive Sync Status</span>
                  </div>
                  <span 
                    class="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold uppercase tracking-wider"
                    :class="gdriveConfig.gdriveConnected ? 'bg-emerald-500/10 text-emerald-400' : 'bg-secondary/80 text-muted-foreground'"
                  >
                    {{ gdriveConfig.gdriveConnected ? 'Active' : 'Unconfigured' }}
                  </span>
                </div>

                <div class="space-y-2">
                  <label class="text-xs font-mono uppercase text-muted-foreground font-bold tracking-wider">Active Folder Path</label>
                  <div class="bg-secondary border border-border px-4 py-3 rounded-xl font-mono text-sm text-foreground/80 select-all truncate">
                    /{{ gdriveConfig.gdriveFolderName || 'Photodump' }}/{{ editTitle || 'Untitled Dump' }}
                  </div>
                  <p class="text-[11px] text-muted-foreground leading-relaxed">
                    Once synced, each file lands in the folder path above. Subfolders are generated dynamically.
                  </p>
                </div>
              </div>
            </Card>
          </div>
          
          <!-- Preview & QR Share Column -->
          <div class="space-y-8 sticky top-24">
            <Card class="bg-card border-border p-0 rounded-3xl shadow-xl overflow-hidden flex flex-col gap-0">
              <div class="p-6 border-b border-border bg-secondary/50">
                <h3 class="text-sm font-bold text-foreground">Live Preview</h3>
                <p class="text-[11px] text-muted-foreground">See how your dump page will look.</p>
              </div>
              <div class="w-full h-[400px] overflow-hidden bg-zinc-900 relative">
                <!-- Scaled Preview Wrapper -->
                <div 
                  class="absolute top-0 left-0 w-[800px] h-[800px] origin-top-left flex flex-col items-center p-8 transition-colors duration-500 font-sans"
                  :style="[previewThemeStyles, { transform: 'scale(0.5)', width: '200%', height: '200%', backgroundColor: 'hsl(var(--background))', color: 'hsl(var(--foreground))' }]"
                >
                  <div class="w-full max-w-2xl mt-12 space-y-8 text-center pointer-events-none">
                    <div class="space-y-4">
                      <h1 class="text-5xl font-extrabold tracking-tight leading-tight" :style="{ fontFamily: `'${editTitleFont}', sans-serif` }">{{ editTitle || 'Untitled Dump' }}</h1>
                      <p class="text-xl font-medium max-w-lg mx-auto leading-relaxed" :style="{ color: 'hsl(var(--muted-foreground))', fontFamily: `'${editDescFont}', sans-serif` }">
                        {{ editDescription || 'Your description will appear here' }}
                      </p>
                    </div>

                    <div class="p-12 border-2 border-dashed rounded-[16px] mx-auto w-full transition-all duration-500" style="border-color: hsl(var(--border)); background-color: hsl(var(--card)); box-shadow: 0 12px 40px hsl(var(--foreground)/0.15)">
                      <div class="space-y-6">
                        <div class="w-20 h-20 mx-auto rounded-3xl flex items-center justify-center" style="background-color: hsl(var(--muted)); color: hsl(var(--primary))">
                          <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
                        </div>
                        <div class="space-y-2">
                          <h3 class="text-2xl font-bold" style="color: hsl(var(--card-foreground))">Ready to dump?</h3>
                          <p class="font-medium" style="color: hsl(var(--muted-foreground))">Drag and drop photos or videos here</p>
                        </div>
                        <div class="pt-2">
                          <div class="inline-flex items-center justify-center rounded-full px-8 h-12 font-semibold" style="background-color: hsl(var(--muted)); color: hsl(var(--secondary-foreground))">Browse Files</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            <Card class="bg-card border-border p-8 rounded-3xl shadow-xl space-y-6">
              <div>
                <h3 class="text-xl font-bold text-foreground">QR Code & Link Share</h3>
                <p class="text-xs text-muted-foreground mt-1">Distribute to attendees or clients to collect files.</p>
              </div>

              <div class="flex flex-col items-center justify-center p-6 rounded-2xl bg-secondary/40 border border-border">
                <div class="w-36 h-36 bg-white p-3 rounded-xl shadow-inner flex items-center justify-center border border-zinc-200 overflow-hidden">
                  <img v-if="qrCodeUrl" :src="qrCodeUrl" alt="QR Code" class="w-full h-full object-contain" />
                  <div v-else class="w-full h-full bg-zinc-100 rounded-lg flex items-center justify-center">
                    <svg class="w-10 h-10 text-foreground/80 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"></path></svg>
                  </div>
                </div>
                <p class="mt-4 text-[11px] font-mono text-muted-foreground select-all truncate max-w-full px-2 text-center">{{ publicUrl }}</p>
              </div>

              <div class="grid grid-cols-2 gap-4">
                <Button variant="outline" class="border-border text-foreground/80 hover:text-foreground hover:bg-secondary" @click="downloadQrCode">Open QR Page</Button>
                <Button variant="outline" class="border-border text-foreground/80 hover:text-foreground hover:bg-secondary" @click="copyLink">Copy Page Link</Button>
              </div>
            </Card>
          </div>
        </div>

        <!-- Files Uploaded Section -->
        <div class="bg-card border border-border rounded-3xl shadow-xl overflow-hidden">
          <div class="px-8 py-6 border-b border-border flex justify-between items-center">
            <h3 class="text-lg font-bold text-foreground">Uploaded Files</h3>
            <span class="text-xs font-mono text-muted-foreground">{{ selectedDump.files?.length || 0 }} files total</span>
          </div>

          <div v-if="!selectedDump.files || selectedDump.files.length === 0" class="p-16 text-center space-y-4">
            <div class="w-16 h-16 bg-secondary rounded-2xl flex items-center justify-center mx-auto text-muted-foreground/80">
              <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div class="space-y-1">
              <h4 class="text-base font-semibold text-foreground/80">No media uploaded yet</h4>
              <p class="text-sm text-muted-foreground max-w-sm mx-auto">Once contributors start uploading files to this dump page, they will show up here.</p>
            </div>
          </div>

          <div v-else class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="border-b border-border text-xs font-mono uppercase text-muted-foreground tracking-wider">
                  <th class="px-8 py-4">File Name</th>
                  <th class="px-6 py-4">File Size</th>
                  <th class="px-6 py-4">Date Uploaded</th>
                  <th class="px-6 py-4">Storage Sync</th>
                  <th class="px-8 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="file in selectedDump.files" :key="file.id" class="border-b border-border hover:hover:bg-secondary/20 transition-colors">
                  <td class="px-8 py-4 font-bold text-foreground max-w-xs truncate">{{ file.name }}</td>
                  <td class="px-6 py-4 font-mono text-muted-foreground text-sm">{{ formatBytes(file.size) }}</td>
                  <td class="px-6 py-4 font-mono text-muted-foreground text-xs">{{ file.createdAt ? new Date(file.createdAt).toLocaleDateString() : 'N/A' }}</td>
                  <td class="px-6 py-4">
                    <span 
                      class="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold uppercase tracking-wider"
                      :class="file.synced ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'"
                    >
                      {{ file.synced ? 'Synced' : 'Pending' }}
                    </span>
                  </td>
                  <td class="px-8 py-4 text-right">
                    <div class="flex items-center justify-end gap-2">
                      <a 
                        v-if="file.url"
                        :href="file.url" 
                        target="_blank" 
                        download
                        class="h-8 gap-1 rounded-full px-3 inline-flex items-center justify-center border border-border text-xs text-foreground/80 hover:text-foreground hover:bg-secondary transition-colors"
                      >
                        Download
                      </a>
                      <Button 
                        variant="destructive" 
                        size="xs"
                        class="bg-destructive/10 hover:bg-destructive/20 text-destructive px-3 border-none"
                        @click="deleteFile(file.id, file.storagePath)"
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.animate-fade-in {
  animation: fadeIn 0.7s cubic-bezier(0.32, 0.72, 0, 1) forwards;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
