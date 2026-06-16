<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { collection, query, where, getDocs, doc, setDoc, deleteDoc, getDoc } from 'firebase/firestore'
import { db, signOut } from '~/lib/firebase'
import { useAuth } from '~/composables/useAuth'
import { requestDriveAccess, findOrCreateFolder } from '~/lib/gdrive'

import { Button } from '~/components/ui/button'
import { Card } from '~/components/ui/card'
import { Input } from '~/components/ui/input'
import { Textarea } from '~/components/ui/textarea'

definePageMeta({
  middleware: 'auth'
})

const { user } = useAuth()
const dumps = ref<any[]>([])
const selectedDump = ref<any | null>(null)

// Google Drive configuration state
const gdriveConfig = ref({
  gdriveConnected: false,
  gdriveApiKey: '',
  gdriveAccessToken: '',
  gdriveEmail: '',
  gdriveFolderId: '',
  gdriveFolderName: 'Photodump'
})

// Modal states
const showNewDumpModal = ref(false)
const isConnectingGoogle = ref(false)
const driveError = ref('')
const isSavingGDrive = ref(false)

// New Dump input states
const newDumpTitle = ref('')
const newDumpSlug = ref('')
const newDumpTheme = ref('blue')
const newDumpPrivacy = ref('Public (Anonymous)')
const newDumpPassword = ref('')

// Edit Dump input states
const editTitle = ref('')
const editDescription = ref('')
const editSlug = ref('')
const editTheme = ref('blue')
const editPrivacy = ref('Public (Anonymous)')
const editPassword = ref('')
const editStatus = ref('Live')

const isLoading = ref(true)
const isSaving = ref(false)

// Watch Title and update Slug automatically for New Dump
watch(newDumpTitle, (val) => {
  newDumpSlug.value = val
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
})

// Fetch all settings and dumps on mount
onMounted(async () => {
  if (!user.value) return
  
  try {
    await fetchGDriveConfig()
    await fetchDumps()
  } catch (error) {
    console.error('Error on loading dashboard:', error)
  } finally {
    isLoading.value = false
  }
})

// Fetch Google Drive configuration
async function fetchGDriveConfig() {
  if (!user.value) return
  try {
    const userDoc = await getDoc(doc(db, 'users', user.value.uid))
    if (userDoc.exists()) {
      const data = userDoc.data()
      gdriveConfig.value = {
        gdriveConnected: data.gdriveConnected || false,
        gdriveApiKey: data.gdriveApiKey || '',
        gdriveAccessToken: data.gdriveAccessToken || '',
        gdriveEmail: data.gdriveEmail || '',
        gdriveFolderId: data.gdriveFolderId || '',
        gdriveFolderName: data.gdriveFolderName || 'Photodump'
      }
    }
  } catch (e) {
    console.error('Error fetching Google Drive settings:', e)
  }
}

// Save Google Drive configuration
async function saveGDriveConfig() {
  if (!user.value) return
  isSavingGDrive.value = true
  try {
    await setDoc(doc(db, 'users', user.value.uid), {
      gdriveConnected: gdriveConfig.value.gdriveConnected,
      gdriveApiKey: gdriveConfig.value.gdriveApiKey,
      gdriveAccessToken: gdriveConfig.value.gdriveAccessToken,
      gdriveEmail: gdriveConfig.value.gdriveEmail,
      gdriveFolderId: gdriveConfig.value.gdriveFolderId,
      gdriveFolderName: gdriveConfig.value.gdriveFolderName || 'Photodump',
      email: user.value.email
    }, { merge: true })
    alert('Google Drive settings successfully updated!')
  } catch (e) {
    console.error('Error saving Google Drive settings:', e)
    alert('Failed to save settings. Please try again.')
  } finally {
    isSavingGDrive.value = false
  }
}

// Connect Google Drive via real OAuth consent screen
async function connectGoogleDrive() {
  if (!user.value) return
  isConnectingGoogle.value = true
  driveError.value = ''
  
  try {
    // 1. Open Google consent screen with Drive scope
    const { accessToken, email } = await requestDriveAccess()
    
    // 2. Create (or find) the root "Photodump" folder on Drive
    const folderName = gdriveConfig.value.gdriveFolderName || 'Photodump'
    const rootFolderId = await findOrCreateFolder(folderName, accessToken)
    
    // 3. Store real credentials
    gdriveConfig.value.gdriveConnected = true
    gdriveConfig.value.gdriveEmail = email
    gdriveConfig.value.gdriveAccessToken = accessToken
    gdriveConfig.value.gdriveFolderId = rootFolderId
    
    // 4. Persist to Firestore
    await saveGDriveConfig()
    
    // 5. Fix up any existing dumps that have stale/fake subfolder IDs
    //    (leftover from the old simulated OAuth flow)
    if (dumps.value.length > 0) {
      for (const dump of dumps.value) {
        const needsRealFolder = !dump.gdriveFolderId || 
          dump.gdriveFolderId.startsWith('simulated-') || 
          dump.gdriveFolderId.startsWith('gdrive-folder-') ||
          dump.gdriveFolderId.startsWith('gdrive-photodump-')
        
        if (needsRealFolder) {
          try {
            const realSubfolderId = await findOrCreateFolder(
              dump.title,
              accessToken,
              rootFolderId
            )
            await setDoc(doc(db, 'dumps', dump.id), { gdriveFolderId: realSubfolderId }, { merge: true })
            dump.gdriveFolderId = realSubfolderId
          } catch (err) {
            console.warn(`Failed to create Drive subfolder for dump "${dump.title}":`, err)
          }
        }
      }
      // Refresh the dump list to reflect updated folder IDs
      await fetchDumps()
    }
  } catch (error: any) {
    console.error('Google Drive connection failed:', error)
    // If user closed the popup, don't show an alert
    if (error?.code === 'auth/popup-closed-by-user') {
      driveError.value = ''
    } else {
      driveError.value = error?.message || 'Failed to connect Google Drive. Please try again.'
    }
  } finally {
    isConnectingGoogle.value = false
  }
}

// Re-authorize Google Drive (refresh expired token)
async function reauthorizeDrive() {
  await connectGoogleDrive()
}

// Disconnect Google Drive credentials
async function disconnectGoogleDrive() {
  if (!user.value) return
  if (!confirm('Are you sure you want to disconnect Google Drive? Uploaded files will remain on Drive but new uploads will stop working.')) return
  
  gdriveConfig.value.gdriveConnected = false
  gdriveConfig.value.gdriveAccessToken = ''
  gdriveConfig.value.gdriveApiKey = ''
  gdriveConfig.value.gdriveEmail = ''
  gdriveConfig.value.gdriveFolderId = ''
  driveError.value = ''
  
  await saveGDriveConfig()
}

// Fetch all creator's dumps from Firestore
async function fetchDumps() {
  if (!user.value) return
  try {
    const q = query(collection(db, 'dumps'), where('creatorId', '==', user.value.uid))
    const querySnapshot = await getDocs(q)
    const list: any[] = []
    
    for (const docSnap of querySnapshot.docs) {
      const data = docSnap.data()
      // Query subcollection for files to ensure accurate metrics
      const filesQuery = await getDocs(collection(db, 'dumps', docSnap.id, 'files'))
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
      
      list.push({
        id: docSnap.id,
        title: data.title || 'Untitled Dump',
        description: data.description || '',
        theme: data.theme || 'blue',
        slug: data.slug || docSnap.id,
        status: data.status || 'Live', // 'Live' or 'Paused'
        privacy: data.privacy || 'Public (Anonymous)',
        password: data.password || '',
        filesCount: filesCount,
        totalSize: totalSizeVal > 0 ? formatBytes(totalSizeVal) : (data.totalSize || '0 MB'),
        totalSizeBytes: totalSizeVal,
        gdriveFolderId: data.gdriveFolderId || '',
        files: filesList.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
      })
    }
    dumps.value = list
  } catch (error) {
    console.error('Error fetching creator dumps:', error)
  }
}

// Open modal for new Dump
function openNewDumpModal() {
  newDumpTitle.value = ''
  newDumpSlug.value = ''
  newDumpTheme.value = 'blue'
  newDumpPrivacy.value = 'Public (Anonymous)'
  newDumpPassword.value = ''
  showNewDumpModal.value = true
}

// Handle Creating a New Dump
async function handleCreateDump() {
  if (!user.value) return
  
  const currentSlug = newDumpSlug.value
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

  if (!newDumpTitle.value.trim()) {
    alert('Please enter a Title.')
    return
  }
  if (!currentSlug) {
    alert('Please enter a valid Custom Slug path.')
    return
  }

  isSaving.value = true
  try {
    const docRef = doc(db, 'dumps', currentSlug)
    const docSnap = await getDoc(docRef)
    
    if (docSnap.exists()) {
      alert('This custom URL slug is already taken. Please try another one.')
      isSaving.value = false
      return
    }

    // Create subfolder on Google Drive if connected
    let gdriveSubfolderId = ''
    if (gdriveConfig.value.gdriveConnected && gdriveConfig.value.gdriveAccessToken && gdriveConfig.value.gdriveFolderId) {
      try {
        const parentId = gdriveConfig.value.gdriveFolderId
        gdriveSubfolderId = await findOrCreateFolder(
          newDumpTitle.value,
          gdriveConfig.value.gdriveAccessToken,
          parentId
        )
      } catch (err: any) {
        console.warn('Google Drive subfolder creation failed:', err)
        if (err?.message?.includes('401') || err?.name === 'DriveAuthError') {
          alert('Your Google Drive access has expired. Please re-authorize from the Google Drive card above, then try again.')
          isSaving.value = false
          return
        }
      }
    }

    await setDoc(docRef, {
      creatorId: user.value.uid,
      title: newDumpTitle.value,
      description: 'Drop your favorite photos and videos here!',
      theme: newDumpTheme.value,
      slug: currentSlug,
      status: 'Live',
      privacy: newDumpPrivacy.value,
      password: newDumpPassword.value,
      filesCount: 0,
      totalSize: '0 MB',
      gdriveFolderId: gdriveSubfolderId
    })

    showNewDumpModal.value = false
    await fetchDumps()
    alert('New PhotoDump created successfully!')
  } catch (error) {
    console.error('Error creating dump:', error)
    alert('Failed to create new dump. Please try again.')
  } finally {
    isSaving.value = false
  }
}

// Select a dump to configure
function selectDump(dump: any) {
  selectedDump.value = dump
  
  // Bind settings values
  editTitle.value = dump.title
  editDescription.value = dump.description
  editSlug.value = dump.slug
  editTheme.value = dump.theme
  editPrivacy.value = dump.privacy
  editPassword.value = dump.password
  editStatus.value = dump.status
}

// Save configuration updates for active dump
async function handleSaveDumpConfig() {
  if (!user.value || !selectedDump.value) return
  
  const currentSlug = editSlug.value
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

  if (!editTitle.value.trim()) {
    alert('Dump Title cannot be empty.')
    return
  }
  if (!currentSlug) {
    alert('Please enter a valid Custom Slug path.')
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
        alert('This custom URL is already in use by another dump.')
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
    const dumpData = {
      creatorId: user.value.uid,
      title: editTitle.value,
      description: editDescription.value,
      theme: editTheme.value,
      slug: currentSlug,
      status: editStatus.value,
      privacy: editPrivacy.value,
      password: editPassword.value,
      filesCount: selectedDump.value.filesCount,
      totalSize: selectedDump.value.totalSize,
      gdriveFolderId: selectedDump.value.gdriveFolderId
    }
    
    await setDoc(doc(db, 'dumps', currentSlug), dumpData)
    
    alert('Dump configuration updated successfully!')
    await fetchDumps()
    selectedDump.value = dumps.value.find(d => d.id === currentSlug) || null
  } catch (error) {
    console.error('Error saving configuration:', error)
    alert('Failed to save configuration. Please try again.')
  } finally {
    isSaving.value = false
  }
}

// Delete Dump
async function handleDeleteDump() {
  if (!selectedDump.value) return
  if (!confirm('Are you sure you want to delete this dump? This will permanently delete all associated metadata and files. This action is irreversible.')) return
  
  isSaving.value = true
  try {
    // Delete files in subcollection
    const filesQuery = await getDocs(collection(db, 'dumps', selectedDump.value.id, 'files'))
    for (const fileDoc of filesQuery.docs) {
      await deleteDoc(doc(db, 'dumps', selectedDump.value.id, 'files', fileDoc.id))
    }

    // Delete primary dump document
    await deleteDoc(doc(db, 'dumps', selectedDump.value.id))
    
    alert('Dump deleted successfully.')
    selectedDump.value = null
    await fetchDumps()
  } catch (error) {
    console.error('Error deleting dump:', error)
    alert('Failed to delete dump. Please try again.')
  } finally {
    isSaving.value = false
  }
}

// Delete Single File in Subcollection
async function deleteFile(fileId: string, filePath?: string) {
  if (!selectedDump.value) return
  if (!confirm('Are you sure you want to delete this file?')) return
  
  try {
    // 1. Delete from Firestore subcollection
    await deleteDoc(doc(db, 'dumps', selectedDump.value.id, 'files', fileId))
    
    // 3. Update dump counts
    const fileItem = selectedDump.value.files.find((f: any) => f.id === fileId)
    const fileSize = fileItem?.size || 0
    
    const newFilesCount = Math.max(0, (selectedDump.value.filesCount || 1) - 1)
    const currentBytes = selectedDump.value.totalSizeBytes || 0
    const newBytes = Math.max(0, currentBytes - fileSize)
    
    await setDoc(doc(db, 'dumps', selectedDump.value.id), {
      filesCount: newFilesCount,
      totalSize: formatBytes(newBytes)
    }, { merge: true })
    
    alert('File deleted successfully!')
    await fetchDumps()
    
    // Update active view
    selectedDump.value = dumps.value.find(d => d.id === selectedDump.value?.id) || null
  } catch (error) {
    console.error('Error deleting file:', error)
    alert('Failed to delete file.')
  }
}

// URL & Sharing Computed Properties
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
  alert('Link copied to clipboard!')
}

function downloadQrCode() {
  if (!qrCodeUrl.value) return
  window.open(qrCodeUrl.value, '_blank')
}

// Calculate total storage size across all dumps
const totalStorageSize = computed(() => {
  const sumBytes = dumps.value.reduce((acc, d) => acc + (d.totalSizeBytes || 0), 0)
  return formatBytes(sumBytes)
})

// Format Bytes to human readable string
function formatBytes(bytes: number, decimals = 1) {
  if (bytes === 0) return '0 MB'
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  if (i < 2) return '0.1 MB' // Clamp to minimum of MB for design consistency if small
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}

// Sign Out handler
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

<template>
  <div class="min-h-screen bg-black text-[#f5f5f7] font-sans selection:bg-[#0071e3]/30 selection:text-white">
    <!-- Header -->
    <header class="sticky top-0 z-50 border-b border-zinc-900 bg-black/85 backdrop-blur-2xl transition-all duration-300">
      <div class="container max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <div class="flex items-center gap-2 cursor-pointer" @click="selectedDump = null">
          <div class="w-8 h-8 rounded-lg bg-[#0071e3] flex items-center justify-center shadow-lg shadow-[#0071e3]/20">
            <span class="text-white font-extrabold text-lg tracking-tighter">P</span>
          </div>
          <span class="text-xl font-bold tracking-tight text-white">PhotoDump<span class="text-[#0071e3]">.</span></span>
        </div>
        <div class="flex items-center gap-4">
          <span class="text-xs font-mono text-zinc-500 hidden sm:inline">{{ user?.email }}</span>
          <Button variant="outline" size="sm" class="border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-900" @click="handleSignOut">Sign Out</Button>
        </div>
      </div>
    </header>

    <!-- Loading State -->
    <div v-if="isLoading" class="flex flex-col items-center justify-center min-h-[calc(100vh-64px)]">
      <div class="w-8 h-8 border-4 border-[#0071e3] border-t-transparent rounded-full animate-spin"></div>
      <p class="mt-4 text-zinc-500 font-mono text-sm">Synchronizing your dashboard...</p>
    </div>

    <!-- Main Content -->
    <main v-else class="container max-w-6xl px-6 py-12 mx-auto space-y-12">
      <!-- Title Header -->
      <div class="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-zinc-900 pb-8">
        <div class="space-y-2">
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-zinc-900 bg-zinc-950/50 text-[10px] font-mono text-[#0071e3] uppercase tracking-wider">
            ● Creator Portal
          </div>
          <h1 class="text-4xl md:text-5xl font-extrabold tracking-tight text-white">
            {{ selectedDump ? `Configuring Dump` : 'Creator Dashboard' }}
          </h1>
          <p class="text-sm text-zinc-400">
            {{ selectedDump ? `Manage page settings, custom URLs, and files for ${selectedDump.title}` : 'Manage your public media collections and storage integrations.' }}
          </p>
        </div>
        <div class="flex gap-3">
          <Button v-if="selectedDump" variant="outline" class="border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-900" @click="selectedDump = null">
            ← Back to Overview
          </Button>
          <Button class="bg-[#0071e3] text-white hover:bg-[#0077ed]" @click="openNewDumpModal">
            + New Dump
          </Button>
        </div>
      </div>

      <!-- OVERVIEW MODE -->
      <div v-if="!selectedDump" class="space-y-12 animate-fade-in">
        <!-- Stats Row -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-6">
          <div class="bg-zinc-950 border border-zinc-900 p-6 rounded-2xl shadow-xl flex flex-col justify-between h-32">
            <span class="text-xs font-mono uppercase text-zinc-500 tracking-wider">Active Dumps</span>
            <div class="text-4xl font-extrabold text-white font-mono leading-none">{{ dumps.filter(d => d.status === 'Live').length }}</div>
          </div>
          <div class="bg-zinc-950 border border-zinc-900 p-6 rounded-2xl shadow-xl flex flex-col justify-between h-32">
            <span class="text-xs font-mono uppercase text-zinc-500 tracking-wider">Total Media</span>
            <div class="text-4xl font-extrabold text-white font-mono leading-none">{{ dumps.reduce((acc, d) => acc + d.filesCount, 0) }}</div>
          </div>
          <div class="bg-zinc-950 border border-zinc-900 p-6 rounded-2xl shadow-xl flex flex-col justify-between h-32">
            <span class="text-xs font-mono uppercase text-zinc-500 tracking-wider">Storage Sync</span>
            <div class="text-2xl font-extrabold text-white font-mono leading-none truncate">{{ totalStorageSize }}</div>
          </div>
          <div class="bg-zinc-950 border border-zinc-900 p-6 rounded-2xl shadow-xl flex flex-col justify-between h-32">
            <span class="text-xs font-mono uppercase text-zinc-500 tracking-wider">Google Drive</span>
            <div class="flex items-center gap-2 mt-2">
              <span class="w-2.5 h-2.5 rounded-full" :class="gdriveConfig.gdriveConnected ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-700'"></span>
              <span class="text-sm font-semibold">{{ gdriveConfig.gdriveConnected ? 'Synced' : 'Not Setup' }}</span>
            </div>
          </div>
        </div>

        <!-- Google Drive Storage Sync Card -->
        <div class="bg-zinc-950 border border-zinc-900 p-8 rounded-3xl shadow-xl space-y-6 relative overflow-hidden">
          <div class="absolute top-0 right-0 w-[300px] h-[300px] bg-[#0071e3]/5 blur-[80px] rounded-full pointer-events-none"></div>
          
          <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-6 border-b border-zinc-900">
            <div class="space-y-1.5">
              <h3 class="text-xl font-bold text-white flex items-center gap-2.5">
                <svg class="w-6 h-6 text-[#0071e3]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM19 18H6c-2.21 0-4-1.79-4-4 0-2.05 1.53-3.76 3.56-3.97l1.07-.11.5-.95C8.08 7.14 9.94 6 12 6c2.62 0 4.88 1.86 5.39 4.43l.3 1.5 1.53.11c1.56.1 2.78 1.41 2.78 2.96 0 1.65-1.35 3-3 3z" />
                </svg>
                Google Drive Storage Sync
              </h3>
              <p class="text-sm text-zinc-400">
                Instantly route original-quality media dumps into sorted subfolders inside your personal Google Drive.
              </p>
            </div>
            <div class="flex items-center gap-3 w-full md:w-auto">
              <Button 
                v-if="!gdriveConfig.gdriveConnected"
                class="bg-[#0071e3] text-white hover:bg-[#0077ed] w-full md:w-auto font-semibold px-6"
                :disabled="isConnectingGoogle"
                @click="connectGoogleDrive"
              >
                {{ isConnectingGoogle ? 'Authorizing...' : 'Connect Google Drive Account' }}
              </Button>
              <div v-else class="flex items-center gap-3 w-full md:w-auto">
                <div class="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-full text-emerald-400 text-xs font-semibold">
                  <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Drive Connected: {{ gdriveConfig.gdriveEmail }}
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  class="border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-900 text-xs"
                  :disabled="isConnectingGoogle"
                  @click="reauthorizeDrive"
                >
                  {{ isConnectingGoogle ? 'Refreshing...' : 'Re-authorize' }}
                </Button>
              </div>
            </div>
          </div>

          <!-- Google Drive Configuration Form -->
          <div class="grid md:grid-cols-2 gap-6 pt-2">
            <div class="space-y-4">
              <div class="space-y-2">
                <label class="text-xs font-mono uppercase text-zinc-500 font-bold tracking-wider">Root Sync Folder Name</label>
                <Input 
                  v-model="gdriveConfig.gdriveFolderName" 
                  placeholder="e.g. Photodump" 
                  class="bg-zinc-900 border-zinc-800 text-white rounded-xl focus:border-[#0071e3] h-11"
                  :disabled="gdriveConfig.gdriveConnected" 
                />
                <p class="text-[11px] text-zinc-500">
                  All uploads will go inside this folder. E.g., <code class="text-zinc-400 font-mono">/{{ gdriveConfig.gdriveFolderName || 'Photodump' }}/[Dump-Name]/file.jpg</code>.
                </p>
              </div>

              <div class="space-y-2">
                <label class="text-xs font-mono uppercase text-zinc-500 font-bold tracking-wider">Google Drive Access Token (Optional)</label>
                <Input 
                  v-model="gdriveConfig.gdriveAccessToken" 
                  type="password" 
                  placeholder="Paste OAuth access token for manual override" 
                  class="bg-zinc-900 border-zinc-800 text-white rounded-xl focus:border-[#0071e3] h-11"
                />
              </div>
            </div>

            <div class="space-y-4">
              <div class="space-y-2">
                <label class="text-xs font-mono uppercase text-zinc-500 font-bold tracking-wider">Developer API Key (Optional)</label>
                <Input 
                  v-model="gdriveConfig.gdriveApiKey" 
                  type="password" 
                  placeholder="AIzaSy..." 
                  class="bg-zinc-900 border-zinc-800 text-white rounded-xl focus:border-[#0071e3] h-11"
                />
                <p class="text-[11px] text-zinc-500">
                  Input your developer API key for direct Google Drive API access.
                </p>
              </div>

              <div class="pt-6 flex justify-end">
                <div class="flex gap-3 w-full md:w-auto">
                  <Button 
                    v-if="gdriveConfig.gdriveConnected"
                    variant="destructive"
                    class="bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border-none w-full md:w-auto"
                    @click="disconnectGoogleDrive"
                  >
                    Disconnect
                  </Button>
                  <Button 
                    class="bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-white w-full md:w-auto"
                    :disabled="isSavingGDrive"
                    @click="saveGDriveConfig"
                  >
                    {{ isSavingGDrive ? 'Saving...' : 'Save Settings' }}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <!-- Drive Error Banner -->
          <div v-if="driveError" class="bg-rose-500/10 border border-rose-500/20 rounded-2xl px-6 py-4 flex items-center gap-3">
            <svg class="w-5 h-5 text-rose-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
            </svg>
            <p class="text-sm text-rose-300">{{ driveError }}</p>
          </div>
        </div>

        <!-- Line Chart Traffic Mockup -->
        <div class="bg-zinc-950 border border-zinc-900 p-8 rounded-3xl shadow-xl space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-bold text-white">Creator Traffic & Storage Flow</h3>
            <span class="text-xs font-mono text-zinc-500">Rolling 7-day volume</span>
          </div>
          <div class="h-44 w-full relative pt-4">
            <svg class="w-full h-full overflow-visible" viewBox="0 0 1000 150">
              <defs>
                <linearGradient id="chart-gradient-dash" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#0071e3" stop-opacity="0.3" />
                  <stop offset="100%" stop-color="#0071e3" stop-opacity="0" />
                </linearGradient>
              </defs>
              <path fill="url(#chart-gradient-dash)" d="M0,130 L166,110 L332,120 L498,60 L664,80 L830,30 L1000,45 L1000,150 L0,150 Z" />
              <path fill="none" stroke="#0071e3" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" d="M0,130 L166,110 L332,120 L498,60 L664,80 L830,30 L1000,45" />
            </svg>
          </div>
        </div>

        <!-- Active Dumps Table -->
        <div class="bg-zinc-950 border border-zinc-900 rounded-3xl shadow-xl overflow-hidden">
          <div class="px-8 py-6 border-b border-zinc-900 flex justify-between items-center">
            <h3 class="text-lg font-bold text-white">Active Media Dumps</h3>
            <span class="text-xs font-mono text-zinc-500">{{ dumps.length }} total dumps</span>
          </div>

          <div v-if="dumps.length === 0" class="p-12 text-center space-y-4">
            <div class="w-16 h-16 bg-zinc-900 rounded-2xl flex items-center justify-center mx-auto text-zinc-600">
              <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <div class="space-y-1">
              <h4 class="text-base font-semibold text-zinc-300">No dumps generated yet</h4>
              <p class="text-sm text-zinc-500 max-w-sm mx-auto">Create a public URL and share it with your community to start gathering photos.</p>
            </div>
            <Button class="bg-[#0071e3] text-white hover:bg-[#0077ed]" @click="openNewDumpModal">Create First Dump</Button>
          </div>

          <div v-else class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="border-b border-zinc-900 text-xs font-mono uppercase text-zinc-500 tracking-wider">
                  <th class="px-8 py-4">Dump Title</th>
                  <th class="px-6 py-4">Custom Path</th>
                  <th class="px-6 py-4">Media Files</th>
                  <th class="px-6 py-4">Total Storage</th>
                  <th class="px-6 py-4">Status</th>
                  <th class="px-8 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="dump in dumps" :key="dump.id" class="border-b border-zinc-900 hover:bg-zinc-900/20 transition-colors">
                  <td class="px-8 py-5 font-bold text-white">{{ dump.title }}</td>
                  <td class="px-6 py-5">
                    <a :href="`/${dump.slug}`" target="_blank" class="text-[#0071e3] hover:underline font-mono text-sm">
                      /{{ dump.slug }}
                    </a>
                  </td>
                  <td class="px-6 py-5 font-mono text-zinc-300">{{ dump.filesCount }} files</td>
                  <td class="px-6 py-5 font-mono text-zinc-400">{{ dump.totalSize }}</td>
                  <td class="px-6 py-5">
                    <span 
                      class="px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold uppercase tracking-wider"
                      :class="dump.status === 'Live' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'"
                    >
                      {{ dump.status || 'Live' }}
                    </span>
                  </td>
                  <td class="px-8 py-5 text-right">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      class="border-zinc-800 hover:bg-zinc-900 text-zinc-300 hover:text-white"
                      @click="selectDump(dump)"
                    >
                      Configure Settings
                    </Button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- DETAILED CONFIGURATION MODE -->
      <div v-else class="space-y-12 animate-fade-in">
        <!-- Configuration Card Row -->
        <div class="grid md:grid-cols-2 gap-8">
          <!-- Dump Settings Configuration -->
          <Card class="bg-zinc-950 border-zinc-900 p-8 rounded-3xl shadow-xl flex flex-col justify-between">
            <div class="space-y-6">
              <div>
                <h3 class="text-xl font-bold text-white">Configuration Details</h3>
                <p class="text-xs text-zinc-500 mt-1">Adjust title, colors, and accessibility defaults.</p>
              </div>

              <div class="space-y-4">
                <div class="space-y-2">
                  <label class="text-xs font-mono uppercase text-zinc-500 font-bold tracking-wider">Dump Page Title</label>
                  <Input v-model="editTitle" placeholder="e.g. Wedding Highlights" class="bg-zinc-900 border-zinc-800 text-white rounded-xl focus:border-[#0071e3] h-11" />
                </div>

                <div class="space-y-2">
                  <label class="text-xs font-mono uppercase text-zinc-500 font-bold tracking-wider">Description / Caption</label>
                  <Textarea v-model="editDescription" placeholder="Drop your favorite moments here..." class="bg-zinc-900 border-zinc-800 text-white rounded-xl focus:border-[#0071e3] min-h-[90px]" />
                </div>

                <div class="space-y-2">
                  <label class="text-xs font-mono uppercase text-zinc-500 font-bold tracking-wider">Custom Slug Route</label>
                  <div class="flex items-center gap-2 bg-zinc-900 px-3 py-1 border border-zinc-800 rounded-xl focus-within:border-[#0071e3] transition-colors">
                    <span class="text-zinc-500 font-mono text-sm select-none">/</span>
                    <input v-model="editSlug" class="bg-transparent border-none outline-none text-white font-mono text-sm py-2 flex-1" />
                  </div>
                </div>

                <div class="grid grid-cols-2 gap-4">
                  <div class="space-y-2">
                    <label class="text-xs font-mono uppercase text-zinc-500 font-bold tracking-wider">Access Privacy</label>
                    <select v-model="editPrivacy" class="w-full bg-zinc-900 border border-zinc-800 text-white text-sm rounded-xl px-3 py-2.5 outline-none focus:border-[#0071e3] h-11">
                      <option>Public (Anonymous)</option>
                      <option>Password Protected</option>
                      <option>Private (Approval only)</option>
                    </select>
                  </div>

                  <div class="space-y-2">
                    <label class="text-xs font-mono uppercase text-zinc-500 font-bold tracking-wider">Dump Status</label>
                    <select v-model="editStatus" class="w-full bg-zinc-900 border border-zinc-800 text-white text-sm rounded-xl px-3 py-2.5 outline-none focus:border-[#0071e3] h-11">
                      <option>Live</option>
                      <option>Paused</option>
                    </select>
                  </div>
                </div>

                <div v-if="editPrivacy === 'Password Protected'" class="space-y-2">
                  <label class="text-xs font-mono uppercase text-zinc-500 font-bold tracking-wider">Access Password</label>
                  <Input v-model="editPassword" type="password" placeholder="Enter access password" class="bg-zinc-900 border-zinc-800 text-white rounded-xl focus:border-[#0071e3] h-11" />
                </div>

                <div class="space-y-2">
                  <label class="text-xs font-mono uppercase text-zinc-500 font-bold tracking-wider">Theme Profile</label>
                  <div class="flex gap-3">
                    <button 
                      v-for="color in ['blue', 'dark', 'purple', 'rose']" 
                      :key="color"
                      class="w-8 h-8 rounded-full transition-transform hover:scale-110"
                      :class="[
                        color === 'blue' ? 'bg-[#0071E3]' : '',
                        color === 'dark' ? 'bg-zinc-900 border border-zinc-800' : '',
                        color === 'purple' ? 'bg-purple-600' : '',
                        color === 'rose' ? 'bg-rose-500' : '',
                        editTheme === color ? 'ring-2 ring-offset-2 ring-offset-black ring-[#0071E3]' : ''
                      ]"
                      @click="editTheme = color"
                    ></button>
                  </div>
                </div>
              </div>
            </div>

            <div class="pt-8 flex justify-between items-center">
              <Button variant="destructive" class="bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border-none" @click="handleDeleteDump">
                Delete Dump
              </Button>
              <Button class="bg-[#0071e3] text-white hover:bg-[#0077ed] px-8" :disabled="isSaving" @click="handleSaveDumpConfig">
                {{ isSaving ? 'Saving Changes...' : 'Save Configuration' }}
              </Button>
            </div>
          </Card>

          <!-- Sync destination & QR Sharing -->
          <div class="space-y-8">
            <Card class="bg-zinc-950 border-zinc-900 p-8 rounded-3xl shadow-xl space-y-6">
              <div>
                <h3 class="text-xl font-bold text-white">Google Drive Destination</h3>
                <p class="text-xs text-zinc-500 mt-1">Files uploaded by users will route directly to this path.</p>
              </div>

              <div class="space-y-4">
                <div class="row-between card bg-zinc-900/40 p-4 border border-zinc-900 rounded-2xl flex items-center justify-between">
                  <div class="flex items-center gap-3">
                    <svg class="w-6 h-6 text-[#0071e3]" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z" />
                    </svg>
                    <span class="text-sm font-semibold text-white">Google Drive Sync Status</span>
                  </div>
                  <span 
                    class="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold uppercase tracking-wider"
                    :class="gdriveConfig.gdriveConnected ? 'bg-emerald-500/10 text-emerald-400' : 'bg-zinc-800 text-zinc-500'"
                  >
                    {{ gdriveConfig.gdriveConnected ? 'Active' : 'Unconfigured' }}
                  </span>
                </div>

                <div class="space-y-2">
                  <label class="text-xs font-mono uppercase text-zinc-500 font-bold tracking-wider">Active Folder Path</label>
                  <div class="bg-zinc-900 border border-zinc-800 px-4 py-3 rounded-xl font-mono text-sm text-zinc-300 select-all truncate">
                    /{{ gdriveConfig.gdriveFolderName || 'Photodump' }}/{{ editTitle || 'Untitled Dump' }}
                  </div>
                  <p class="text-[11px] text-zinc-500 leading-relaxed">
                    Once synced, each file lands in the folder path above. Subfolders are generated dynamically.
                  </p>
                </div>
              </div>
            </Card>

            <Card class="bg-zinc-950 border-zinc-900 p-8 rounded-3xl shadow-xl space-y-6">
              <div>
                <h3 class="text-xl font-bold text-white">QR Code & Link Share</h3>
                <p class="text-xs text-zinc-500 mt-1">Distribute to attendees or clients to collect files.</p>
              </div>

              <div class="flex flex-col items-center justify-center p-6 rounded-2xl bg-zinc-900/40 border border-zinc-900">
                <div class="w-36 h-36 bg-white p-3 rounded-xl shadow-inner flex items-center justify-center border border-zinc-200 overflow-hidden">
                  <img v-if="qrCodeUrl" :src="qrCodeUrl" alt="QR Code" class="w-full h-full object-contain" />
                  <div v-else class="w-full h-full bg-zinc-100 rounded-lg flex items-center justify-center">
                    <svg class="w-10 h-10 text-zinc-300 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"></path></svg>
                  </div>
                </div>
                <p class="mt-4 text-[11px] font-mono text-zinc-400 select-all truncate max-w-full px-2 text-center">{{ publicUrl }}</p>
              </div>

              <div class="grid grid-cols-2 gap-4">
                <Button variant="outline" class="border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-900" @click="downloadQrCode">Open QR Page</Button>
                <Button variant="outline" class="border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-900" @click="copyLink">Copy Page Link</Button>
              </div>
            </Card>
          </div>
        </div>

        <!-- Files Uploaded Section -->
        <div class="bg-zinc-950 border border-zinc-900 rounded-3xl shadow-xl overflow-hidden">
          <div class="px-8 py-6 border-b border-zinc-900 flex justify-between items-center">
            <h3 class="text-lg font-bold text-white">Uploaded Files</h3>
            <span class="text-xs font-mono text-zinc-500">{{ selectedDump.files?.length || 0 }} files total</span>
          </div>

          <div v-if="!selectedDump.files || selectedDump.files.length === 0" class="p-16 text-center space-y-4">
            <div class="w-16 h-16 bg-zinc-900 rounded-2xl flex items-center justify-center mx-auto text-zinc-600">
              <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div class="space-y-1">
              <h4 class="text-base font-semibold text-zinc-300">No media uploaded yet</h4>
              <p class="text-sm text-zinc-500 max-w-sm mx-auto">Once contributors start uploading files to this dump page, they will show up here.</p>
            </div>
          </div>

          <div v-else class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="border-b border-zinc-900 text-xs font-mono uppercase text-zinc-500 tracking-wider">
                  <th class="px-8 py-4">File Name</th>
                  <th class="px-6 py-4">File Size</th>
                  <th class="px-6 py-4">Date Uploaded</th>
                  <th class="px-6 py-4">Storage Sync</th>
                  <th class="px-8 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="file in selectedDump.files" :key="file.id" class="border-b border-zinc-900 hover:bg-zinc-900/20 transition-colors">
                  <td class="px-8 py-4 font-bold text-white max-w-xs truncate">{{ file.name }}</td>
                  <td class="px-6 py-4 font-mono text-zinc-400 text-sm">{{ formatBytes(file.size) }}</td>
                  <td class="px-6 py-4 font-mono text-zinc-500 text-xs">{{ file.createdAt ? new Date(file.createdAt).toLocaleDateString() : 'N/A' }}</td>
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
                        class="h-8 gap-1 rounded-full px-3 inline-flex items-center justify-center border border-zinc-800 text-xs text-zinc-300 hover:text-white hover:bg-zinc-900 transition-colors"
                      >
                        Download
                      </a>
                      <Button 
                        variant="destructive" 
                        size="xs"
                        class="bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 px-3 border-none"
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

    <!-- NEW DUMP DIALOG MODAL -->
    <div v-if="showNewDumpModal" class="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-md animate-fade-in">
      <div class="bg-zinc-950 border border-zinc-900 w-full max-w-lg rounded-3xl shadow-2xl p-8 space-y-6 relative">
        <button class="absolute top-4 right-4 text-zinc-500 hover:text-white" @click="showNewDumpModal = false">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>

        <div class="space-y-1">
          <h3 class="text-2xl font-bold text-white">Create New PhotoDump</h3>
          <p class="text-xs text-zinc-400">Initialize a new public upload link for your creators.</p>
        </div>

        <div class="space-y-4">
          <div class="space-y-2">
            <label class="text-xs font-mono uppercase text-zinc-500 font-bold tracking-wider">Dump Title</label>
            <Input v-model="newDumpTitle" placeholder="e.g. Summer Vacation 2026" class="bg-zinc-900 border-zinc-800 text-white rounded-xl focus:border-[#0071e3] h-11" />
          </div>

          <div class="space-y-2">
            <label class="text-xs font-mono uppercase text-zinc-500 font-bold tracking-wider">Custom Slug Route</label>
            <div class="flex items-center gap-2 bg-zinc-900 px-3 py-1 border border-zinc-800 rounded-xl focus-within:border-[#0071e3] transition-colors">
              <span class="text-zinc-500 font-mono text-sm select-none">/</span>
              <input v-model="newDumpSlug" placeholder="summer-vacay" class="bg-transparent border-none outline-none text-white font-mono text-sm py-2 flex-1" />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-2">
              <label class="text-xs font-mono uppercase text-zinc-500 font-bold tracking-wider">Access Privacy</label>
              <select v-model="newDumpPrivacy" class="w-full bg-zinc-900 border border-zinc-800 text-white text-sm rounded-xl px-3 py-2.5 outline-none focus:border-[#0071e3] h-11">
                <option>Public (Anonymous)</option>
                <option>Password Protected</option>
                <option>Private (Approval only)</option>
              </select>
            </div>
            
            <div class="space-y-2">
              <label class="text-xs font-mono uppercase text-zinc-500 font-bold tracking-wider">Theme Color</label>
              <select v-model="newDumpTheme" class="w-full bg-zinc-900 border border-zinc-800 text-white text-sm rounded-xl px-3 py-2.5 outline-none focus:border-[#0071e3] h-11">
                <option value="blue">Blue</option>
                <option value="dark">Dark</option>
                <option value="purple">Purple</option>
                <option value="rose">Rose</option>
              </select>
            </div>
          </div>

          <div v-if="newDumpPrivacy === 'Password Protected'" class="space-y-2">
            <label class="text-xs font-mono uppercase text-zinc-500 font-bold tracking-wider">Set Access Password</label>
            <Input v-model="newDumpPassword" type="password" placeholder="Enter access password" class="bg-zinc-900 border-zinc-800 text-white rounded-xl focus:border-[#0071e3] h-11" />
          </div>
        </div>

        <div class="flex gap-3 pt-4 justify-end">
          <Button variant="outline" class="border-zinc-800 text-zinc-400 hover:text-white" @click="showNewDumpModal = false">
            Cancel
          </Button>
          <Button class="bg-[#0071e3] text-white hover:bg-[#0077ed]" :disabled="isSaving" @click="handleCreateDump">
            {{ isSaving ? 'Creating...' : 'Create Dump' }}
          </Button>
        </div>
      </div>
    </div>

    <!-- Mock OAuth modal removed — Google's real consent screen is used instead -->
  </div>
</template>



<style scoped>
/* Spring Animations */
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
