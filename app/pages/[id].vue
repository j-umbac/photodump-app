<template>
  <div class="min-h-screen flex flex-col items-center p-6 font-sans transition-colors duration-500 w-full bg-background text-foreground">
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

    <div v-else class="w-full max-w-2xl mt-20 space-y-12 text-center">
      <div class="space-y-4">
        <h1 class="text-5xl font-extrabold tracking-tight leading-tight">
          {{ dumpTitle }}
        </h1>
        <p class="text-xl font-medium max-w-lg mx-auto leading-relaxed text-muted-foreground">
          {{ dumpDescription }}
        </p>
      </div>

      <!-- Upload Area -->
      <div 
        class="group relative p-12 border-2 border-dashed rounded-[32px] transition-all duration-500 mx-auto w-full border-border bg-card shadow-[0_8px_32px_rgba(0,0,0,0.04)] hover:border-primary/50"
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
            <h3 class="text-2xl font-bold text-card-foreground">Ready to dump?</h3>
            <p class="font-medium text-muted-foreground">Drag and drop photos or videos here</p>
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
          <input ref="fileInput" type="file" multiple class="hidden" @change="handleFileChange">
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
            <div class="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from '#app'
import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore'
import { db } from '~/lib/firebase'
import { Button } from '~/components/ui/button'
import { uploadFileToDrive, DriveAuthError } from '~/lib/gdrive'
import { useToast } from '~/composables/useToast'
import { useTheme } from '~/composables/useTheme'

const route = useRoute()
const dumpId = route.params.id as string

const dumpTitle = ref('')
const dumpDescription = ref('')
const creatorId = ref('')
const exists = ref(true)
const isLoading = ref(true)

const toast = useToast()
const { themeColor } = useTheme() // allow global theme to be used, overriding any saved theme

const files = ref<File[]>([])
const fileInput = ref<HTMLInputElement | null>(null)
const isUploading = ref(false)

onMounted(async () => {
  try {
    const docRef = doc(db, 'dumps', dumpId)
    const docSnap = await getDoc(docRef)
    
    if (docSnap.exists()) {
      const data = docSnap.data()
      dumpTitle.value = data.title || 'Untitled Dump'
      dumpDescription.value = data.description || ''
      creatorId.value = data.creatorId || ''
      
      // If we want the dump to dictate the theme unless overridden, we could set themeColor here.
      // But the user requested a global theme customizer across all pages, 
      // so we just rely on useTheme() handling it globally.
      
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

function openFileDialog() {
  fileInput.value?.click()
}

function handleFileChange(event: Event) {
  const target = event.target as HTMLInputElement
  if (target.files) {
    const newFiles = Array.from(target.files)
    files.value = [...files.value, ...newFiles]
  }
}

function handleDrop(event: DragEvent) {
  const items = event.dataTransfer?.files
  if (items) {
    const newFiles = Array.from(items)
    files.value = [...files.value, ...newFiles]
  }
}

function removeFile(file: File) {
  files.value = files.value.filter(f => f !== file)
}

async function handleUpload() {
  if (files.value.length === 0) {
    toast.warning('No files selected', 'Please select files to upload.')
    return
  }
  
  isUploading.value = true
  
  try {
    let gdriveConnected = false
    let gdriveAccessToken = ''
    let gdriveFolderId = ''
    
    if (creatorId.value) {
      const userDocRef = doc(db, 'users', creatorId.value)
      const userDocSnap = await getDoc(userDocRef)
      if (userDocSnap.exists()) {
        const userData = userDocSnap.data()
        gdriveConnected = userData.gdriveConnected || false
        gdriveAccessToken = userData.gdriveAccessToken || ''
      }
      
      const dumpDocRef = doc(db, 'dumps', dumpId)
      const dumpSnap = await getDoc(dumpDocRef)
      if (dumpSnap.exists()) {
        gdriveFolderId = dumpSnap.data().gdriveFolderId || ''
      }
    }

    if (!gdriveConnected || !gdriveAccessToken || !gdriveFolderId) {
      toast.error('Google Drive not configured', 'Google Drive is not configured for this dump yet. Please ask the dump creator to connect Google Drive from their dashboard.')
      return
    }

    for (const file of files.value) {
      const uploadResult = await uploadFileToDrive(file, dumpId, {
        gdriveConnected,
        gdriveAccessToken,
        gdriveFolderId,
        creatorId: creatorId.value,
        dumpTitle: dumpTitle.value
      })

      const fileId = uploadResult.id || `file-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
      await setDoc(doc(db, 'dumps', dumpId, 'files', fileId), {
        name: file.name,
        size: file.size,
        url: uploadResult.url,
        synced: uploadResult.synced,
        createdAt: Date.now()
      })
    }

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
