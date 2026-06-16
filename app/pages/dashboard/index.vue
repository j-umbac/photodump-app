<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { collection, query, where, getDocs, doc, setDoc, getDoc } from 'firebase/firestore'
import { db, signOut } from '~/lib/firebase'
import { useAuth } from '~/composables/useAuth'
import { useToast } from '~/composables/useToast'
import { requestDriveAccess, findOrCreateFolder } from '~/lib/gdrive'
import { useTheme } from '~/composables/useTheme'

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'
import { Line } from 'vue-chartjs'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

import { Button } from '~/components/ui/button'
import { Card } from '~/components/ui/card'
import { Input } from '~/components/ui/input'

definePageMeta({
  middleware: 'auth'
})

const { user } = useAuth()
const toast = useToast()

const { colorMode, themeColor } = useTheme()
const primaryColor = ref('hsl(210, 100%, 44.5%)')

function updateChartColor() {
  if (typeof window !== 'undefined') {
    setTimeout(() => {
      const val = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim()
      if (val) {
        primaryColor.value = `hsl(${val.replace(/\s+/g, ', ')})`
      }
    }, 50)
  }
}

watch([colorMode, themeColor], () => {
  updateChartColor()
})

const dumps = ref<any[]>([])

const chartData = computed(() => {
  const days = []
  const volumes = [0, 0, 0, 0, 0, 0, 0]
  
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    days.push(d.toLocaleDateString('en-US', { weekday: 'short' }))
  }

  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()

  dumps.value.forEach(dump => {
    if (dump.files && Array.isArray(dump.files)) {
      dump.files.forEach(file => {
        if (file.createdAt && file.size) {
          let createdTime = file.createdAt
          if (typeof file.createdAt.toMillis === 'function') {
            createdTime = file.createdAt.toMillis()
          } else if (typeof file.createdAt === 'object' && file.createdAt.seconds) {
            createdTime = file.createdAt.seconds * 1000
          }
          
          const diffTime = todayStart - new Date(createdTime).setHours(0,0,0,0)
          const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24))
          
          const index = 6 - diffDays
          if (index >= 0 && index <= 6) {
            volumes[index] += file.size / (1024 * 1024)
          }
        }
      })
    }
  })

  const formattedVolumes = volumes.map(v => Number(v.toFixed(1)))

  return {
    labels: days,
    datasets: [
      {
        label: 'Traffic Volume',
        data: formattedVolumes,
        borderColor: primaryColor.value,
        backgroundColor: (context: any) => {
          const chart = context.chart
          const { ctx, chartArea } = chart
          if (!chartArea) {
            return null
          }
          const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom)
          const baseColor = primaryColor.value.replace('hsl(', '').replace(')', '')
          gradient.addColorStop(0, `hsla(${baseColor}, 0.3)`)
          gradient.addColorStop(1, `hsla(${baseColor}, 0)`)
          return gradient
        },
        fill: true,
        tension: 0.4,
        borderWidth: 3.5,
        pointRadius: 4,
        pointBackgroundColor: primaryColor.value
      }
    ]
  }
})

const chartOptions = computed(() => {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        mode: 'index',
        intersect: false,
      }
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: 'Day of Week'
        },
        grid: {
          display: false,
        }
      },
      y: {
        display: true,
        title: {
          display: true,
          text: 'Volume (MB)'
        },
        beginAtZero: true
      }
    }
  }
})

const newDumpTitle = ref('')
const newDumpSlug = ref('')
const newDumpThemeColor = ref('blue')
const newDumpThemeMode = ref('dark')
const newDumpPrivacy = ref('Public (Anonymous)')
const newDumpPassword = ref('')

const newDumpCustomTheme = ref({ primary: '#0071e3', secondary: '#f4f4f5', background: '#ffffff', text: '#000000' })
const newDumpTitleFont = ref('Inter')
const newDumpDescFont = ref('Inter')

const availableFonts = [
  'Inter', 'Playfair Display', 'Outfit', 'Lora', 'Space Grotesk', 'Caveat', 'JetBrains Mono', 'Cinzel',
  'Roboto', 'Open Sans', 'Montserrat', 'Lato', 'Poppins', 'Nunito', 'Raleway', 'Oswald', 'Merriweather', 
  'Quicksand', 'Work Sans', 'Fira Code', 'Pacifico', 'Dancing Script', 'Bebas Neue'
]



useHead({
  link: computed(() => {
    const fonts = new Set([newDumpTitleFont.value, newDumpDescFont.value])
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

const isLoading = ref(true)
const isSaving = ref(false)

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
  updateChartColor()
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
    toast.success('Settings Saved', 'Google Drive settings successfully updated!')
  } catch (e) {
    console.error('Error saving Google Drive settings:', e)
    toast.error('Settings Failed', 'Failed to save settings. Please try again.')
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
      toast.error('Connection Failed', driveError.value)
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
        themeColor: data.themeColor || 'blue',
        themeMode: data.themeMode || 'dark',
        customTheme: data.customTheme || { primary: '#0071e3', secondary: '#f4f4f5', background: '#ffffff', text: '#000000' },
        titleFont: data.titleFont || data.fontFamily || 'Inter',
        descFont: data.descFont || data.fontFamily || 'Inter',
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
  newDumpThemeColor.value = 'blue'
  newDumpThemeMode.value = 'dark'
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
    toast.warning('Missing Title', 'Please enter a Title.')
    return
  }
  if (!currentSlug) {
    toast.warning('Missing Slug', 'Please enter a valid Custom Slug path.')
    return
  }

  isSaving.value = true
  try {
    const docRef = doc(db, 'dumps', currentSlug)
    const docSnap = await getDoc(docRef)
    
    if (docSnap.exists()) {
      toast.error('Slug Taken', 'This custom URL slug is already taken. Please try another one.')
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
          toast.error('Drive Expired', 'Your Google Drive access has expired. Please re-authorize from the Google Drive card above, then try again.')
          isSaving.value = false
          return
        }
      }
    }

    await setDoc(docRef, {
      creatorId: user.value.uid,
      title: newDumpTitle.value,
      description: 'Drop your favorite photos and videos here!',
      themeColor: newDumpThemeColor.value,
      themeMode: newDumpThemeMode.value,
      customTheme: newDumpCustomTheme.value,
      titleFont: newDumpTitleFont.value,
      descFont: newDumpDescFont.value,
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
    toast.success('Success', 'New PhotoDump created successfully!')
  } catch (error) {
    console.error('Error creating dump:', error)
    toast.error('Error', 'Failed to create new dump. Please try again.')
  } finally {
    isSaving.value = false
  }
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
    toast.error('Error', 'Sign-out failed. Please try again.')
  }
}
</script>

<template>
  <div class="min-h-screen bg-background text-foreground font-sans selection:bg-primary/30 selection:text-primary-foreground">
    <!-- Header -->
    <header class="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur-2xl transition-all duration-300">
      <div class="container max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <div class="flex items-center gap-2 cursor-pointer">
          <div class="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
            <span class="text-foreground font-extrabold text-lg tracking-tighter">P</span>
          </div>
          <span class="text-xl font-bold tracking-tight text-foreground">PhotoDump<span class="text-primary">.</span></span>
        </div>
        <div class="flex items-center gap-4">
          <span class="text-xs font-mono text-muted-foreground hidden sm:inline">{{ user?.email }}</span>
          <Button variant="outline" size="sm" class="border-border text-muted-foreground hover:text-foreground hover:bg-secondary" @click="handleSignOut">Sign Out</Button>
        </div>
      </div>
    </header>

    <!-- Loading State -->
    <div v-if="isLoading" class="flex flex-col items-center justify-center min-h-[calc(100vh-64px)]">
      <div class="w-8 h-8 border-4 border-[#0071e3] border-t-transparent rounded-full animate-spin"></div>
      <p class="mt-4 text-muted-foreground font-mono text-sm">Synchronizing your dashboard...</p>
    </div>

    <!-- Main Content -->
    <main v-else class="container max-w-6xl px-6 py-12 mx-auto space-y-12">
      <!-- Title Header -->
      <div class="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border pb-8">
        <div class="space-y-2">
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-card/50 text-[10px] font-mono text-primary uppercase tracking-wider">
            ● Creator Portal
          </div>
          <h1 class="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">
            Creator Dashboard
          </h1>
          <p class="text-sm text-muted-foreground">
            Manage your public media collections and storage integrations.
          </p>
        </div>
        <div class="flex gap-3">
          <Button class="bg-primary text-primary-foreground hover:bg-primary/90" @click="openNewDumpModal">
            + New Dump
          </Button>
        </div>
      </div>

      <!-- OVERVIEW MODE -->
      <div class="space-y-12 animate-fade-in">
        <!-- Stats Row -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-6">
          <div class="bg-card border border-border p-6 rounded-2xl shadow-xl flex flex-col justify-between h-32">
            <span class="text-xs font-mono uppercase text-muted-foreground tracking-wider">Active Dumps</span>
            <div class="text-4xl font-extrabold text-foreground font-mono leading-none">{{ dumps.filter(d => d.status === 'Live').length }}</div>
          </div>
          <div class="bg-card border border-border p-6 rounded-2xl shadow-xl flex flex-col justify-between h-32">
            <span class="text-xs font-mono uppercase text-muted-foreground tracking-wider">Total Media</span>
            <div class="text-4xl font-extrabold text-foreground font-mono leading-none">{{ dumps.reduce((acc, d) => acc + d.filesCount, 0) }}</div>
          </div>
          <div class="bg-card border border-border p-6 rounded-2xl shadow-xl flex flex-col justify-between h-32">
            <span class="text-xs font-mono uppercase text-muted-foreground tracking-wider">Storage Sync</span>
            <div class="text-2xl font-extrabold text-foreground font-mono leading-none truncate">{{ totalStorageSize }}</div>
          </div>
          <div class="bg-card border border-border p-6 rounded-2xl shadow-xl flex flex-col justify-between h-32">
            <span class="text-xs font-mono uppercase text-muted-foreground tracking-wider">Google Drive</span>
            <div class="flex items-center gap-2 mt-2">
              <span class="w-2.5 h-2.5 rounded-full" :class="gdriveConfig.gdriveConnected ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-700'"></span>
              <span class="text-sm font-semibold">{{ gdriveConfig.gdriveConnected ? 'Synced' : 'Not Setup' }}</span>
            </div>
          </div>
        </div>

        <!-- Google Drive Storage Sync Card -->
        <div class="bg-card border border-border p-8 rounded-3xl shadow-xl space-y-6 relative overflow-hidden">
          <div class="absolute top-0 right-0 w-[300px] h-[300px] bg-primary/5 blur-[80px] rounded-full pointer-events-none"></div>
          
          <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-6 border-b border-border">
            <div class="space-y-1.5">
              <h3 class="text-xl font-bold text-foreground flex items-center gap-2.5">
                <svg class="w-6 h-6 text-primary" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM19 18H6c-2.21 0-4-1.79-4-4 0-2.05 1.53-3.76 3.56-3.97l1.07-.11.5-.95C8.08 7.14 9.94 6 12 6c2.62 0 4.88 1.86 5.39 4.43l.3 1.5 1.53.11c1.56.1 2.78 1.41 2.78 2.96 0 1.65-1.35 3-3 3z" />
                </svg>
                Google Drive Storage Sync
              </h3>
              <p class="text-sm text-muted-foreground">
                Instantly route original-quality media dumps into sorted subfolders inside your personal Google Drive.
              </p>
            </div>
            <div class="flex items-center gap-3 w-full md:w-auto">
              <Button 
                v-if="!gdriveConfig.gdriveConnected"
                class="bg-primary text-primary-foreground hover:bg-primary/90 w-full md:w-auto font-semibold px-6"
                :disabled="isConnectingGoogle"
                @click="connectGoogleDrive"
              >
                {{ isConnectingGoogle ? 'Authorizing...' : 'Connect Google Drive Account' }}
              </Button>
              <div v-else class="flex flex-col items-end gap-3 w-full md:w-auto">
                <div class="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-full text-emerald-400 text-xs font-semibold">
                  <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Drive Connected: {{ gdriveConfig.gdriveEmail }}
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  class="border-border text-muted-foreground hover:text-foreground hover:bg-secondary text-xs"
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
                <label class="text-xs font-mono uppercase text-muted-foreground font-bold tracking-wider">Root Sync Folder Name</label>
                <Input 
                  v-model="gdriveConfig.gdriveFolderName" 
                  placeholder="e.g. Photodump" 
                  class="bg-secondary border-border text-foreground rounded-xl focus:border-primary h-11"
                  :disabled="gdriveConfig.gdriveConnected" 
                />
                <p class="text-[11px] text-muted-foreground">
                  All uploads will go inside this folder. E.g., <code class="text-muted-foreground font-mono">/{{ gdriveConfig.gdriveFolderName || 'Photodump' }}/[Dump-Name]/file.jpg</code>.
                </p>
              </div>

              <div class="space-y-2">
                <label class="text-xs font-mono uppercase text-muted-foreground font-bold tracking-wider">Google Drive Access Token (Optional)</label>
                <Input 
                  v-model="gdriveConfig.gdriveAccessToken" 
                  type="password" 
                  placeholder="Paste OAuth access token for manual override" 
                  class="bg-secondary border-border text-foreground rounded-xl focus:border-primary h-11"
                />
              </div>
            </div>

            <div class="space-y-4">
              <div class="space-y-2">
                <label class="text-xs font-mono uppercase text-muted-foreground font-bold tracking-wider">Developer API Key (Optional)</label>
                <Input 
                  v-model="gdriveConfig.gdriveApiKey" 
                  type="password" 
                  placeholder="AIzaSy..." 
                  class="bg-secondary border-border text-foreground rounded-xl focus:border-primary h-11"
                />
                <p class="text-[11px] text-muted-foreground">
                  Input your developer API key for direct Google Drive API access.
                </p>
              </div>

              <div class="pt-6 flex justify-end">
                <div class="flex gap-3 w-full md:w-auto">
                  <Button 
                    v-if="gdriveConfig.gdriveConnected"
                    variant="destructive"
                    class="bg-destructive/10 hover:bg-destructive/20 text-destructive border-none w-full md:w-auto"
                    @click="disconnectGoogleDrive"
                  >
                    Disconnect
                  </Button>
                  <Button 
                    class="bg-secondary border border-border hover:bg-secondary/80 text-foreground w-full md:w-auto"
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
          <div v-if="driveError" class="bg-destructive/10 border border-destructive/20 rounded-2xl px-6 py-4 flex items-center gap-3">
            <svg class="w-5 h-5 text-destructive flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
            </svg>
            <p class="text-sm text-rose-300">{{ driveError }}</p>
          </div>
        </div>

        <!-- Line Chart Traffic -->
        <div class="bg-card border border-border p-8 rounded-3xl shadow-xl space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-bold text-foreground">Creator Traffic & Storage Flow</h3>
            <span class="text-xs font-mono text-muted-foreground">Rolling 7-day volume</span>
          </div>
          <div class="h-64 w-full relative pt-4">
            <Line :data="chartData" :options="chartOptions" />
          </div>
        </div>

        <!-- Active Dumps Table -->
        <div class="bg-card border border-border rounded-3xl shadow-xl overflow-hidden">
          <div class="px-8 py-6 border-b border-border flex justify-between items-center">
            <h3 class="text-lg font-bold text-foreground">Active Media Dumps</h3>
            <span class="text-xs font-mono text-muted-foreground">{{ dumps.length }} total dumps</span>
          </div>

          <div v-if="dumps.length === 0" class="p-12 text-center space-y-4">
            <div class="w-16 h-16 bg-secondary rounded-2xl flex items-center justify-center mx-auto text-muted-foreground/80">
              <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <div class="space-y-1">
              <h4 class="text-base font-semibold text-foreground/80">No dumps generated yet</h4>
              <p class="text-sm text-muted-foreground max-w-sm mx-auto">Create a public URL and share it with your community to start gathering photos.</p>
            </div>
            <Button class="bg-primary text-primary-foreground hover:bg-primary/90" @click="openNewDumpModal">Create First Dump</Button>
          </div>

          <div v-else class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="border-b border-border text-xs font-mono uppercase text-muted-foreground tracking-wider">
                  <th class="px-8 py-4">Dump Title</th>
                  <th class="px-6 py-4">Custom Path</th>
                  <th class="px-6 py-4">Media Files</th>
                  <th class="px-6 py-4">Total Storage</th>
                  <th class="px-6 py-4">Status</th>
                  <th class="px-8 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="dump in dumps" :key="dump.id" class="border-b border-border hover:hover:bg-secondary/20 transition-colors">
                  <td class="px-8 py-5 font-bold text-foreground">{{ dump.title }}</td>
                  <td class="px-6 py-5">
                    <a :href="`/${dump.slug}`" target="_blank" class="text-primary hover:underline font-mono text-sm">
                      /{{ dump.slug }}
                    </a>
                  </td>
                  <td class="px-6 py-5 font-mono text-foreground/80">{{ dump.filesCount }} files</td>
                  <td class="px-6 py-5 font-mono text-muted-foreground">{{ dump.totalSize }}</td>
                  <td class="px-6 py-5">
                    <span 
                      class="px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold uppercase tracking-wider"
                      :class="dump.status === 'Live' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'"
                    >
                      {{ dump.status || 'Live' }}
                    </span>
                  </td>
                  <td class="px-8 py-5 text-right">
                    <NuxtLink :to="`/dashboard/${dump.id}`">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        class="border-border hover:bg-secondary text-foreground/80 hover:text-foreground"
                      >
                        Configure Settings
                      </Button>
                    </NuxtLink>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>

    <!-- NEW DUMP DIALOG MODAL -->
    <div v-if="showNewDumpModal" class="fixed inset-0 z-50 flex items-center justify-center p-6 bg-background/80 backdrop-blur-md animate-fade-in">
      <div class="bg-card border border-border w-full max-w-lg rounded-3xl shadow-2xl p-8 space-y-6 relative">
        <button class="absolute top-4 right-4 text-muted-foreground hover:text-foreground" @click="showNewDumpModal = false">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>

        <div class="space-y-1">
          <h3 class="text-2xl font-bold text-foreground">Create New PhotoDump</h3>
          <p class="text-xs text-muted-foreground">Initialize a new public upload link for your creators.</p>
        </div>

        <div class="space-y-4">
          <div class="space-y-2">
            <label class="text-xs font-mono uppercase text-muted-foreground font-bold tracking-wider">Dump Title</label>
            <Input v-model="newDumpTitle" placeholder="e.g. Summer Vacation 2026" class="bg-secondary border-border text-foreground rounded-xl focus:border-primary h-11" />
          </div>

          <div class="space-y-2">
            <label class="text-xs font-mono uppercase text-muted-foreground font-bold tracking-wider">Custom Slug Route</label>
            <div class="flex items-center gap-2 bg-secondary px-3 py-1 border border-border rounded-xl focus-within:border-primary transition-colors">
              <span class="text-muted-foreground font-mono text-sm select-none">/</span>
              <input v-model="newDumpSlug" placeholder="summer-vacay" class="bg-transparent border-none outline-none text-foreground font-mono text-sm py-2 flex-1" />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-2">
              <label class="text-xs font-mono uppercase text-muted-foreground font-bold tracking-wider">Access Privacy</label>
              <select v-model="newDumpPrivacy" class="w-full bg-secondary border border-border text-foreground text-sm rounded-xl px-3 py-2.5 outline-none focus:border-primary h-11">
                <option>Public (Anonymous)</option>
                <option>Password Protected</option>
                <option>Private (Approval only)</option>
              </select>
            </div>
            
            <div class="space-y-4">
              <div class="grid grid-cols-2 gap-2">
                <div class="space-y-2">
                  <label class="text-[10px] font-mono uppercase text-muted-foreground font-bold tracking-wider">Title Font</label>
                  <select v-model="newDumpTitleFont" class="w-full bg-secondary border border-border text-foreground text-sm rounded-xl px-2 py-2 outline-none focus:border-primary h-10">
                    <option v-for="font in availableFonts" :key="font" :value="font">{{ font }}</option>
                  </select>
                </div>
                <div class="space-y-2">
                  <label class="text-[10px] font-mono uppercase text-muted-foreground font-bold tracking-wider">Desc Font</label>
                  <select v-model="newDumpDescFont" class="w-full bg-secondary border border-border text-foreground text-sm rounded-xl px-2 py-2 outline-none focus:border-primary h-10">
                    <option v-for="font in availableFonts" :key="font" :value="font">{{ font }}</option>
                  </select>
                </div>
              </div>
              <div class="space-y-2">
                <label class="text-xs font-mono uppercase text-muted-foreground font-bold tracking-wider">Theme Colors</label>
                <div class="grid grid-cols-4 gap-2">
                  <div class="space-y-1">
                    <label class="text-[10px] uppercase text-muted-foreground block text-center">Primary</label>
                    <input type="color" v-model="newDumpCustomTheme.primary" class="w-full h-8 rounded cursor-pointer border-0 p-0" />
                  </div>
                  <div class="space-y-1">
                    <label class="text-[10px] uppercase text-muted-foreground block text-center">Second</label>
                    <input type="color" v-model="newDumpCustomTheme.secondary" class="w-full h-8 rounded cursor-pointer border-0 p-0" />
                  </div>
                  <div class="space-y-1">
                    <label class="text-[10px] uppercase text-muted-foreground block text-center">Bg</label>
                    <input type="color" v-model="newDumpCustomTheme.background" class="w-full h-8 rounded cursor-pointer border-0 p-0" />
                  </div>
                  <div class="space-y-1">
                    <label class="text-[10px] uppercase text-muted-foreground block text-center">Text</label>
                    <input type="color" v-model="newDumpCustomTheme.text" class="w-full h-8 rounded cursor-pointer border-0 p-0" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div v-if="newDumpPrivacy === 'Password Protected'" class="space-y-2">
            <label class="text-xs font-mono uppercase text-muted-foreground font-bold tracking-wider">Set Access Password</label>
            <Input v-model="newDumpPassword" type="password" placeholder="Enter access password" class="bg-secondary border-border text-foreground rounded-xl focus:border-primary h-11" />
          </div>
        </div>

        <div class="flex gap-3 pt-4 justify-end">
          <Button variant="outline" class="border-border text-muted-foreground hover:text-foreground" @click="showNewDumpModal = false">
            Cancel
          </Button>
          <Button class="bg-primary text-primary-foreground hover:bg-primary/90" :disabled="isSaving" @click="handleCreateDump">
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
