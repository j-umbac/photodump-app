<template>
  <div class="min-h-screen bg-black text-[#f5f5f7] font-sans selection:bg-[#0071e3]/30 selection:text-white">
    <!-- Top Nav -->
    <header class="fixed top-0 left-0 right-0 z-50 border-b border-[#262629] bg-black/85 backdrop-blur-2xl transition-all duration-300">
      <div class="container max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <div class="flex items-center gap-2 cursor-pointer" @click="navigateTo('/')">
          <div class="w-8 h-8 rounded-lg bg-[#0071e3] flex items-center justify-center shadow-lg shadow-[#0071e3]/20">
            <span class="text-white font-extrabold text-lg tracking-tighter">P</span>
          </div>
          <span class="text-xl font-bold tracking-tight text-white">PhotoDump<span class="text-[#0071e3]">.</span></span>
        </div>
        
        <nav class="hidden md:flex items-center gap-8 text-sm font-medium">
          <a href="#features" class="text-[#86868b] hover:text-white transition-colors duration-200">Features</a>
          <a href="#stats" class="text-[#86868b] hover:text-white transition-colors duration-200">Live Demo</a>
          <NuxtLink to="/dashboard" class="text-[#86868b] hover:text-white transition-colors duration-200">Dashboard</NuxtLink>
        </nav>

        <div class="flex items-center gap-4">
          <NuxtLink to="/login" class="text-xs font-semibold text-[#86868b] hover:text-white transition-colors duration-200 px-3 py-1.5 rounded-full hover:bg-zinc-900">
            Creator Sign In
          </NuxtLink>
          <Button variant="default" size="sm" class="bg-[#0071e3] text-white hover:bg-[#0077ed] shadow-md shadow-[#0071e3]/10" @click="focusCreateInput">
            Start a Dump
          </Button>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="pt-16">
      <!-- Hero Section -->
      <section class="relative overflow-hidden py-24 md:py-36 flex items-center justify-center">
        <!-- Radial Ambient Glow -->
        <div class="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#0071e3]/10 blur-[120px] rounded-full pointer-events-none"></div>

        <div class="container max-w-4xl mx-auto px-6 text-center relative z-10 space-y-8">
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-zinc-800 bg-zinc-900/50 backdrop-blur-md text-xs font-mono text-[#0071e3] tracking-wide animate-fade-in">
            <span class="w-1.5 h-1.5 rounded-full bg-[#0071e3] animate-pulse"></span>
            Cinematic Media Collection
          </div>
          
          <h1 class="text-5xl md:text-7xl font-extrabold tracking-tight text-white leading-[1.08] max-w-3xl mx-auto bg-clip-text text-transparent bg-gradient-to-b from-white via-zinc-100 to-zinc-400">
            Anonymous Dumps.<br />Professional Quality.
          </h1>
          
          <p class="text-lg md:text-xl text-[#86868b] font-normal max-w-2xl mx-auto leading-relaxed">
            The cleanest way to collect high-res media from your community, guests, or team. Straight to your storage, no compression, no account required.
          </p>

          <!-- Interactive Create Dump Box -->
          <div class="w-full max-w-md mx-auto pt-6">
            <div class="bg-zinc-950/80 border border-zinc-800 p-2 rounded-2xl flex items-center gap-2 shadow-[0_8px_32px_rgba(0,0,0,0.5)] focus-within:border-[#0071e3]/50 transition-all duration-300">
              <span class="text-zinc-600 font-mono text-sm pl-3 select-none">photodump.app/</span>
              <input 
                ref="dumpNameInput"
                v-model="newDumpName"
                type="text" 
                placeholder="summer-trip-2026" 
                class="bg-transparent border-none outline-none text-white font-medium text-sm flex-1 min-w-0 py-2"
                @keyup.enter="handleCreateDump"
              />
              <Button 
                variant="default" 
                size="default" 
                class="bg-[#0071e3] text-white hover:bg-[#0077ed] rounded-xl shrink-0 gap-1.5"
                @click="handleCreateDump"
              >
                Go
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
              </Button>
            </div>
            <p v-if="error" class="text-xs text-rose-500 font-medium text-left mt-2 pl-4">
              {{ error }}
            </p>
            <p class="text-xs text-zinc-500 font-mono mt-3">
              Type a custom link and press Go to initialize a public upload page instantly.
            </p>
          </div>

          <div class="flex items-center justify-center gap-4 pt-4">
            <a href="#stats" class="text-xs font-semibold text-zinc-400 hover:text-white flex items-center gap-1 transition-colors group">
              View live analytics demo 
              <svg class="w-3 h-3 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg>
            </a>
          </div>
        </div>
      </section>

      <!-- Features Section -->
      <section id="features" class="border-t border-[#262629] py-24 bg-zinc-950/20">
        <div class="container max-w-6xl mx-auto px-6">
          <div class="grid md:grid-cols-3 gap-8">
            <!-- Feature 1 -->
            <div class="flex flex-col gap-4 p-8 rounded-3xl border border-zinc-900 bg-zinc-950/40 hover:border-zinc-800 transition-all duration-300">
              <div class="text-[#0071e3] font-mono font-bold text-sm tracking-widest">01</div>
              <h3 class="text-lg font-bold text-white">Scan & Dump</h3>
              <p class="text-sm text-[#86868b] leading-relaxed">
                Users scan a QR code or hit a custom link. No app download, no sign-up. Just select files and upload directly.
              </p>
            </div>
            <!-- Feature 2 -->
            <div class="flex flex-col gap-4 p-8 rounded-3xl border border-zinc-900 bg-zinc-950/40 hover:border-zinc-800 transition-all duration-300">
              <div class="text-[#0071e3] font-mono font-bold text-sm tracking-widest">02</div>
              <h3 class="text-lg font-bold text-white">Full Fidelity</h3>
              <p class="text-sm text-[#86868b] leading-relaxed">
                Supports RAW, HEIC, 4K ProRes, and video files. We don't compress your memories. You receive the exact original bytes.
              </p>
            </div>
            <!-- Feature 3 -->
            <div class="flex flex-col gap-4 p-8 rounded-3xl border border-zinc-900 bg-zinc-950/40 hover:border-zinc-800 transition-all duration-300">
              <div class="text-[#0071e3] font-mono font-bold text-sm tracking-widest">03</div>
              <h3 class="text-lg font-bold text-white">Creator Pro</h3>
              <p class="text-sm text-[#86868b] leading-relaxed">
                Manage dozens of dumps from one clean dashboard. Set storage destinations, track size limit quotas, and revoke links instantly.
              </p>
            </div>
          </div>
        </div>
      </section>

      <!-- Stats / Demo Dashboard Section -->
      <section id="stats" class="border-t border-[#262629] py-24 relative overflow-hidden">
        <div class="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-[#0071e3]/5 blur-[120px] rounded-full pointer-events-none"></div>

        <div class="container max-w-6xl mx-auto px-6">
          <div class="grid lg:grid-cols-2 gap-12 items-center">
            <!-- Left Side Copy -->
            <div class="space-y-6">
              <p class="text-xs font-mono uppercase text-[#0071e3] tracking-widest font-semibold">Analytics & Control</p>
              <h2 class="text-3xl md:text-4xl font-bold text-white tracking-tight leading-tight">
                Designed for professional media collection.
              </h2>
              <p class="text-base text-[#86868b] leading-relaxed">
                Our dashboard gives you clear, real-time metrics on storage volume, bandwidth reach, and uploaded files. Easily configure custom destinations, enforce password protection, and generate QR code packages.
              </p>
              
              <div class="pt-4 flex flex-col gap-3">
                <div class="flex items-center gap-3">
                  <div class="w-5 h-5 rounded-full bg-[#0071e3]/10 border border-[#0071e3]/20 flex items-center justify-center text-[#0071e3]">
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg>
                  </div>
                  <span class="text-sm font-medium text-zinc-300">Google Drive API Integration</span>
                </div>
                <div class="flex items-center gap-3">
                  <div class="w-5 h-5 rounded-full bg-[#0071e3]/10 border border-[#0071e3]/20 flex items-center justify-center text-[#0071e3]">
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg>
                  </div>
                  <span class="text-sm font-medium text-zinc-300">Password-Protected Access Keys</span>
                </div>
                <div class="flex items-center gap-3">
                  <div class="w-5 h-5 rounded-full bg-[#0071e3]/10 border border-[#0071e3]/20 flex items-center justify-center text-[#0071e3]">
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg>
                  </div>
                  <span class="text-sm font-medium text-zinc-300">Vector QR Code Downloads</span>
                </div>
              </div>

              <div class="pt-6">
                <Button variant="secondary" size="lg" class="bg-zinc-900 border border-zinc-800 text-white hover:bg-zinc-800 rounded-full" @click="navigateTo('/dashboard')">
                  Explore Demo Dashboard
                </Button>
              </div>
            </div>

            <!-- Right Side Dashboard Mockup -->
            <div class="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 shadow-2xl relative">
              <div class="absolute -top-3 -right-3 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-[10px] rounded-full uppercase tracking-wider font-semibold">
                ● Live Demo
              </div>
              
              <!-- Stat Cards Grid -->
              <div class="grid grid-cols-2 gap-4 mb-6">
                <div class="bg-zinc-900/50 border border-zinc-800/80 p-4 rounded-2xl">
                  <div class="text-2xl font-bold text-white font-mono">156.4<span class="text-xs text-zinc-500 pl-0.5">GB</span></div>
                  <div class="text-[11px] text-[#86868b] uppercase tracking-wider font-semibold mt-1">Storage Used</div>
                </div>
                <div class="bg-zinc-900/50 border border-zinc-800/80 p-4 rounded-2xl">
                  <div class="text-2xl font-bold text-white font-mono">2,419</div>
                  <div class="text-[11px] text-[#86868b] uppercase tracking-wider font-semibold mt-1">Total Media</div>
                </div>
              </div>

              <!-- Storage Breakdown Progress Bar -->
              <div class="bg-zinc-900/30 border border-zinc-900 p-5 rounded-2xl space-y-4">
                <div class="flex items-center justify-between text-xs">
                  <span class="font-medium text-zinc-400">Video (ProRes)</span>
                  <span class="font-mono text-zinc-400 font-bold">124.2 GB</span>
                </div>
                <div class="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div class="h-full bg-[#0071e3] rounded-full" style="width: 80%"></div>
                </div>
                
                <div class="flex items-center justify-between text-xs pt-1">
                  <span class="font-medium text-zinc-400">Photos (RAW)</span>
                  <span class="font-mono text-zinc-400 font-bold">28.4 GB</span>
                </div>
                <div class="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div class="h-full bg-zinc-600 rounded-full" style="width: 18%"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>

    <!-- Footer -->
    <footer class="border-t border-[#262629] py-12 text-[#86868b] text-xs">
      <div class="container max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
        <span>© 2026 PhotoDump Pro. All rights reserved.</span>
        <div class="flex items-center gap-6">
          <a class="hover:text-white transition-colors">Terms</a>
          <a class="hover:text-white transition-colors">Privacy</a>
          <a class="hover:text-white transition-colors">Support</a>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, useHead } from '#app'
import { Button } from '~/components/ui/button'

useHead({
  title: 'PhotoDump Pro - Anonymous Dumps, Professional Quality',
  meta: [
    { name: 'description', content: 'The cleanest way to collect high-res media from your community, guests, or team straight to your Google Drive storage with no compression.' }
  ]
})

const router = useRouter()
const dumpNameInput = ref<HTMLInputElement | null>(null)
const newDumpName = ref('')
const error = ref('')

function focusCreateInput() {
  dumpNameInput.value?.focus()
  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  })
}

function handleCreateDump() {
  const name = newDumpName.value.trim()
  if (!name) {
    error.value = 'Please enter a name for the dump.'
    return
  }
  
  // Format to URL-safe string
  const urlSafeName = name
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

  if (!urlSafeName) {
    error.value = 'Please use letters, numbers, hyphens, or underscores.'
    return
  }

  error.value = ''
  // Navigate directly to public upload page
  router.push(`/${urlSafeName}`)
}

function navigateTo(path: string) {
  router.push(path)
}
</script>

<style scoped>
/* Spring Fade In Animation */
.animate-fade-in {
  animation: fadeIn 0.8s cubic-bezier(0.32, 0.72, 0, 1) forwards;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
