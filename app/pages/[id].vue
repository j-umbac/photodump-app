<template>
  <div class="min-h-screen flex flex-col items-center p-6 transition-colors duration-500 w-full bg-background text-foreground font-sans" :class="dynamicThemeClasses" :style="customThemeStyles">
    <div v-if="isLoading" class="flex flex-col items-center justify-center min-h-screen">
      <div class="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      <p class="mt-4 text-muted-foreground font-medium">Loading dump page...</p>
    </div>

    <div v-else-if="!exists" class="w-full max-w-md mt-40 text-center space-y-6">
      <div class="w-20 h-20 mx-auto rounded-3xl bg-secondary flex items-center justify-center text-muted-foreground">
        <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
        </svg>
      </div>
      <h1 class="text-4xl font-extrabold tracking-tight">Dump Not Found</h1>
      <p class="text-muted-foreground font-medium leading-relaxed">The dump page you are looking for does not exist, or the link may have expired.</p>
      <div class="pt-4">
        <Button class="rounded-full px-8 font-semibold" @click="navigateTo('/')">
          Go to Home
        </Button>
      </div>
    </div>

    <div v-else class="w-full max-w-2xl mt-8 space-y-12 text-center">
      <div class="space-y-4">
        <h1 class="text-5xl font-extrabold tracking-tight leading-tight" :style="{ fontFamily: `'${dumpData?.titleFont || dumpData?.fontFamily || 'Inter'}', sans-serif` }">
          {{ dumpTitle }}
        </h1>
        <p class="text-xl font-medium max-w-lg mx-auto leading-relaxed text-muted-foreground" :style="{ fontFamily: `'${dumpData?.descFont || dumpData?.fontFamily || 'Inter'}', sans-serif` }">
          {{ dumpDescription }}
        </p>
      </div>

      <!-- Upload Area -->
      <div 
        class="group relative p-12 border-2 border-dashed rounded-[16px] transition-all duration-500 mx-auto w-full border-border bg-card hover:border-primary/50"
        :style="{ boxShadow: '0 12px 40px hsl(var(--foreground) / 0.1)' }"
        @dragover.prevent
        @drop.prevent="handleDrop"
      >
        <div class="space-y-6">
          <div class="w-20 h-20 mx-auto rounded-3xl flex items-center justify-center group-hover:scale-110 transition-transform duration-500 ease-apple-ease bg-secondary text-primary">
            <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path>
            </svg>
          </div>
          <div class="space-y-2">
            <h3 class="text-xl font-bold text-card-foreground">Ready to dump?</h3>
            <p class="text-md font-medium text-muted-foreground">Drag and drop photos or videos here</p>
          </div>
          <div class="pt-2">
            <Button 
              variant="secondary" 
              size="lg" 
              class="rounded-full px-8 font-semibold"
              @click="openFileDialog"
            >
              Browse Files
            </Button>
          </div>
          <input ref="fileInput" type="file" multiple accept="image/*,video/*" class="hidden" @change="handleFileChange">
        </div>
      </div>

      <!-- Upload Progress -->
      <div v-if="isUploading" class="w-full space-y-3 pt-6 animate-fade-in text-left">
        <div class="flex justify-between text-sm font-semibold text-muted-foreground px-1">
          <span>Uploading {{ uploadProgress.count }} of {{ files.length }} files...</span>
          <span>{{ Math.round(uploadProgress.percent) }}%</span>
        </div>
        <div class="h-3 w-full bg-secondary rounded-full overflow-hidden shadow-inner border border-border">
          <div 
            class="h-full bg-primary transition-all duration-300 ease-out rounded-full shadow-[0_0_10px_rgba(0,0,0,0.2)]" 
            :style="{ width: `${uploadProgress.percent}%` }"
          ></div>
        </div>
      </div>

      <!-- File List Container -->
      <transition-group 
        v-if="files.length > 0" 
        name="list" 
        tag="div" 
        class="grid gap-3 pt-4"
      >
        <div 
          v-for="file in files" 
          :key="file.name" 
          class="flex items-center justify-between p-4 rounded-2xl shadow-sm border transition-all bg-card border-border text-card-foreground"
        >
          <div class="flex items-center gap-4">
            <div class="w-10 h-10 rounded-[6px] bg-secondary flex items-center justify-center text-muted-foreground overflow-hidden">
              <img v-if="file.type.startsWith('image/')" :src="getFilePreview(file)" class="w-full h-full object-cover" />
              <svg v-else class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
              </svg>
            </div>
            <div class="text-left">
              <p class="font-bold truncate max-w-[200px]">{{ file.name }}</p>
              <p class="text-xs font-medium text-muted-foreground">{{ (file.size / 1024 / 1024).toFixed(2) }} MB</p>
            </div>
          </div>
          <button class="p-2 text-muted-foreground hover:text-destructive transition-colors" @click="removeFile(file)">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>
      </transition-group>

      <div class="pt-8 pb-20">
        <Button 
          v-if="files.length > 0"
          size="lg" 
          class="w-full sm:w-auto px-12 h-14 text-lg font-bold shadow-xl transition-all hover:scale-[1.02] shadow-primary/20"
          :disabled="isUploading"
          @click="handleUpload"
        >
          {{ isUploading ? 'Uploading...' : 'Start Dump' }}
        </Button>
      </div>
    </div>
    <Footer class="mt-auto -mb-6"/>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from '#app'
import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore'
import { db } from '~/lib/firebase'
import { Button } from '~/components/ui/button'
import { uploadFileToDrive, DriveAuthError } from '~/lib/gdrive'
import { useToast } from '~/composables/useToast'

definePageMeta({
  layout: 'dump'
})

const route = useRoute()
const dumpId = route.params.id as string

const dumpTitle = ref('')
const dumpDescription = ref('')
const creatorId = ref('')
const exists = ref(true)
const isLoading = ref(true)
const dumpData = ref<any>(null)

const toast = useToast()

const dynamicThemeClasses = computed(() => {
  const classes = []
  if (dumpData.value && !dumpData.value.customTheme) {
    if (dumpData.value.themeColor) {
      classes.push(`theme-${dumpData.value.themeColor}`)
    } else if (dumpData.value.theme) {
      if (['zinc', 'red', 'orange', 'green', 'blue'].includes(dumpData.value.theme)) {
        classes.push(`theme-${dumpData.value.theme}`)
      } else {
        classes.push('theme-blue')
      }
    } else {
      classes.push('theme-blue')
    }
  }
  
  if (dumpData.value) {
    if (dumpData.value.themeMode === 'light') {
      // light mode
    } else if (dumpData.value.themeMode === 'auto') {
      if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        classes.push('dark')
      }
    } else if (dumpData.value.themeMode === 'dark') {
      classes.push('dark')
    }
  } else {
    classes.push('theme-blue', 'dark')
  }
  return classes.join(' ')
})

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

const customThemeStyles = computed(() => {
  if (!dumpData.value?.customTheme) return {}
  const theme = dumpData.value.customTheme
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
    '--border': hexToHSL(theme.secondary),
  }
})

useHead({
  link: computed(() => {
    const fonts = new Set([dumpData.value?.titleFont, dumpData.value?.descFont, dumpData.value?.fontFamily])
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

let mediaQueryList: MediaQueryList | null = null
function handleSystemThemeChange(e: MediaQueryListEvent) {
  if (dumpData.value?.themeMode === 'auto') {
    dumpData.value = { ...dumpData.value }
  }
}

const files = ref<File[]>([])
const fileInput = ref<HTMLInputElement | null>(null)
const isUploading = ref(false)
const uploadProgress = ref({ count: 0, percent: 0 })

const previewUrls = new Map<File, string>()

function getFilePreview(file: File) {
  if (!previewUrls.has(file)) {
    previewUrls.set(file, URL.createObjectURL(file))
  }
  return previewUrls.get(file)
}

onMounted(async () => {
  if (typeof window !== 'undefined') {
    mediaQueryList = window.matchMedia('(prefers-color-scheme: dark)')
    mediaQueryList.addEventListener('change', handleSystemThemeChange)
  }

  try {
    const docRef = doc(db, 'dumps', dumpId)
    const docSnap = await getDoc(docRef)
    
    if (docSnap.exists()) {
      const data = docSnap.data()
      dumpData.value = data
      dumpTitle.value = data.title || 'Untitled Dump'
      dumpDescription.value = data.description || ''
      creatorId.value = data.creatorId || ''
      
      exists.value = true
    } else {
      exists.value = false
    }
  } catch (error) {
    console.error('Error fetching dump page:', error)
    exists.value = false
  } finally {
    isLoading.value = false
  }
})

onUnmounted(() => {
  if (mediaQueryList) {
    mediaQueryList.removeEventListener('change', handleSystemThemeChange)
  }
  previewUrls.forEach(url => URL.revokeObjectURL(url))
  previewUrls.clear()
})

function openFileDialog() {
  fileInput.value?.click()
}

function validateFiles(newFiles: File[]) {
  const validFiles = newFiles.filter(f => f.type.startsWith('image/') || f.type.startsWith('video/'))
  if (validFiles.length < newFiles.length) {
    toast.warning('Invalid Files', 'Only photos and videos are allowed.')
  }
  return validFiles
}

function handleFileChange(event: Event) {
  const target = event.target as HTMLInputElement
  if (target.files) {
    const newFiles = Array.from(target.files)
    files.value = [...files.value, ...validateFiles(newFiles)]
  }
}

function handleDrop(event: DragEvent) {
  const items = event.dataTransfer?.files
  if (items) {
    const newFiles = Array.from(items)
    files.value = [...files.value, ...validateFiles(newFiles)]
  }
}

function removeFile(file: File) {
  files.value = files.value.filter(f => f !== file)
  if (previewUrls.has(file)) {
    URL.revokeObjectURL(previewUrls.get(file)!)
    previewUrls.delete(file)
  }
}

async function handleUpload() {
  if (files.value.length === 0) {
    toast.warning('No files selected', 'Please select files to upload.')
    return
  }
  
  isUploading.value = true
  
  try {
    // 1. Get a fresh upload token from the server (securely exchanges refresh token)
    const tokenResponse = await fetch('/api/drive/upload-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dumpId })
    })

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json().catch(() => ({}))
      const message = errorData.statusMessage || 'Failed to get upload credentials'
      
      if (tokenResponse.status === 401) {
        toast.error('Token Expired', 'The Google Drive access has expired. Please ask the dump creator to re-authorize from their dashboard.')
      } else if (tokenResponse.status === 400) {
        toast.error('Drive Not Configured', message)
      } else {
        toast.error('Upload Failed', message)
      }
      return
    }

    const { accessToken, gdriveFolderId } = await tokenResponse.json()

    // 2. Upload files one-by-one directly to Google Drive
    const { uploadFileToGoogleDrive } = await import('~/lib/gdrive')
    
    uploadProgress.value = { count: 0, percent: 0 }

    for (let i = 0; i < files.value.length; i++) {
      const file = files.value[i]
      const result = await uploadFileToGoogleDrive(file, gdriveFolderId, accessToken)
      
      const fileId = result.id || `file-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
      await setDoc(doc(db, 'dumps', dumpId, 'files', fileId), {
        name: file.name,
        size: file.size,
        url: result.webViewLink,
        synced: true,
        createdAt: Date.now()
      })
      
      uploadProgress.value.count = i + 1
      uploadProgress.value.percent = ((i + 1) / files.value.length) * 100
    }

    // 3. Recalculate metrics on parent dump document
    const filesQuery = await getDocs(collection(db, 'dumps', dumpId, 'files'))
    const filesCount = filesQuery.size
    let totalSizeVal = 0
    filesQuery.forEach(f => {
      totalSizeVal += f.data().size || 0
    })

    const dumpDocRef = doc(db, 'dumps', dumpId)
    await setDoc(dumpDocRef, {
      filesCount,
      totalSize: formatBytes(totalSizeVal),
      totalSizeBytes: totalSizeVal
    }, { merge: true })

    toast.success('Upload Complete', `${files.value.length} files successfully uploaded to Google Drive!`)
    files.value.forEach(file => {
      if (previewUrls.has(file)) {
        URL.revokeObjectURL(previewUrls.get(file)!)
        previewUrls.delete(file)
      }
    })
    files.value = []
  } catch (error: any) {
    console.error('Upload error:', error)
    if (error instanceof DriveAuthError || error?.message?.includes('401')) {
      toast.error('Upload Failed', 'The Google Drive access token has expired. Please ask the dump creator to re-authorize from their dashboard.')
    } else if (error?.message?.includes('not configured')) {
      toast.error('Upload Failed', error.message)
    } else {
      toast.error('Upload Failed', 'Please try again or contact the dump creator.')
    }
  } finally {
    isUploading.value = false
  }
}

function formatBytes(bytes: number, decimals = 1) {
  if (bytes === 0) return '0 MB'
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  if (i < 2) return '0.1 MB'
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}
</script>

<style scoped>
.list-enter-active,
.list-leave-active {
  transition: all 0.4s cubic-bezier(0.32, 0.72, 0, 1);
}
.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateY(20px);
}
</style>
