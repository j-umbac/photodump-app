<template>
  <div 
    class="min-h-screen flex flex-col items-center p-6 font-sans transition-colors duration-500 w-full"
    :class="theme === 'dark' ? 'bg-black text-[#f5f5f7]' : 'bg-[#F5F5F7] text-zinc-900'"
  >
    <div v-if="isLoading" class="flex flex-col items-center justify-center min-h-screen">
      <div class="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      <p class="mt-4 text-zinc-500 font-medium">Loading dump page...</p>
    </div>

    <div v-else-if="!exists" class="w-full max-w-md mt-40 text-center space-y-6">
      <div class="w-20 h-20 mx-auto rounded-3xl bg-zinc-100 flex items-center justify-center text-zinc-400">
        <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
        </svg>
      </div>
      <h1 class="text-4xl font-extrabold tracking-tight">Dump Not Found</h1>
      <p class="text-zinc-500 font-medium leading-relaxed">The dump page you are looking for does not exist, or the link may have expired.</p>
      <div class="pt-4">
        <Button class="rounded-full px-8 font-semibold bg-[#0071E3] text-white hover:bg-[#0077ED]" @click="navigateTo('/')">
          Go to Home
        </Button>
      </div>
    </div>

    <div v-else class="w-full max-w-2xl mt-20 space-y-12 text-center">
      <div class="space-y-4">
        <h1 class="text-5xl font-extrabold tracking-tight leading-tight">
          {{ dumpTitle }}
        </h1>
        <p class="text-xl font-medium max-w-lg mx-auto leading-relaxed" :class="theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'">
          {{ dumpDescription }}
        </p>
      </div>

      <div 
        class="group relative p-12 border-2 border-dashed rounded-[32px] transition-all duration-500 mx-auto w-full"
        :class="[
          theme === 'dark' 
            ? 'border-zinc-800 bg-zinc-950/60 shadow-[0_8px_32px_rgba(0,0,0,0.4)] hover:border-zinc-700' 
            : 'border-zinc-200 bg-white shadow-[0_8px_32px_rgba(0,0,0,0.04)] hover:border-zinc-400'
        ]"
        @dragover.prevent
        @drop.prevent="handleDrop"
      >
        <div class="space-y-6">
          <div 
            class="w-20 h-20 mx-auto rounded-3xl flex items-center justify-center group-hover:scale-110 transition-transform duration-500 ease-apple-ease"
            :class="[
              theme === 'dark' ? 'bg-zinc-900' : 'bg-zinc-50',
              accentTextClass
            ]"
          >
            <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path>
            </svg>
          </div>
          <div class="space-y-2">
            <h3 class="text-2xl font-bold" :class="theme === 'dark' ? 'text-zinc-200' : 'text-zinc-800'">Ready to dump?</h3>
            <p class="font-medium" :class="theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400'">Drag and drop photos or videos here</p>
          </div>
          <div class="pt-2">
            <Button 
              variant="secondary" 
              size="lg" 
              class="rounded-full px-8 font-semibold"
              :class="theme === 'dark' ? 'bg-zinc-800 text-white hover:bg-zinc-700' : 'bg-zinc-100 text-zinc-900 hover:bg-zinc-200'"
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
          class="flex items-center justify-between p-4 rounded-2xl shadow-sm border transition-all"
          :class="theme === 'dark' ? 'bg-zinc-950 border-zinc-900 text-zinc-200' : 'bg-white border-zinc-100 text-zinc-800'"
        >
          <div class="flex items-center gap-4">
            <div class="w-10 h-10 rounded-lg bg-zinc-50 flex items-center justify-center text-zinc-400">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
              </svg>
            </div>
            <div class="text-left">
              <p class="font-bold truncate max-w-[200px]">{{ file.name }}</p>
              <p class="text-xs font-medium" :class="theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400'">{{ (file.size / 1024 / 1024).toFixed(2) }} MB</p>
            </div>
          </div>
          <button class="p-2 text-zinc-300 hover:text-rose-500 transition-colors" @click="removeFile(file)">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>
      </transition-group>

      <div class="pt-8 pb-20">
        <Button 
          v-if="files.length > 0"
          size="lg" 
          class="w-full sm:w-auto px-12 h-14 text-lg font-bold shadow-xl transition-all hover:scale-[1.02]"
          :class="[
            accentBgClass,
            theme === 'dark' ? 'shadow-black/40' : 'shadow-primary/20'
          ]"
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
import { ref, onMounted, computed } from 'vue'
import { useRoute } from '#app'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '~/lib/firebase'
import { Button } from '~/components/ui/button'
import { uploadFileToDrive } from '~/lib/gdrive'

const route = useRoute()
const dumpId = route.params.id as string

const dumpTitle = ref('')
const dumpDescription = ref('')
const theme = ref('blue')
const exists = ref(true)
const isLoading = ref(true)

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
      theme.value = data.theme || 'blue'
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

const accentBgClass = computed(() => {
  switch (theme.value) {
    case 'dark':
      return 'bg-zinc-900 text-white hover:bg-zinc-800 border border-zinc-800'
    case 'purple':
      return 'bg-purple-600 text-white hover:bg-purple-700'
    case 'rose':
      return 'bg-rose-500 text-white hover:bg-rose-600'
    case 'blue':
    default:
      return 'bg-[#0071E3] text-white hover:bg-[#0077ED]'
  }
})

const accentTextClass = computed(() => {
  switch (theme.value) {
    case 'dark':
      return 'text-zinc-300'
    case 'purple':
      return 'text-purple-600'
    case 'rose':
      return 'text-rose-500'
    case 'blue':
    default:
      return 'text-[#0071E3]'
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
    alert('Please select files to upload.')
    return
  }
  
  isUploading.value = true
  try {
    for (const file of files.value) {
      await uploadFileToDrive(file, dumpId)
    }
    alert(`${files.value.length} files successfully uploaded!`)
    files.value = []
  } catch (error) {
    console.error('Upload error:', error)
    alert('Upload failed. Please try again.')
  } finally {
    isUploading.value = false
  }
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
