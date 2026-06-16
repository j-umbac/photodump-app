<template>
  <div class="min-h-screen bg-background text-foreground font-sans selection:bg-primary/30 selection:text-foreground">
    <!-- Top Nav -->
    <header class="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/85 backdrop-blur-2xl transition-all duration-300">
      <div class="container max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <div class="flex items-center gap-2 cursor-pointer" @click="navigateTo('/')">
          <div class="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
            <span class="text-primary-foreground font-extrabold text-lg tracking-tighter">P</span>
          </div>
          <span class="text-xl font-bold tracking-tight text-foreground">PhotoDump<span class="text-primary">.</span></span>
        </div>
        
        <nav class="hidden md:flex items-center gap-8 text-sm font-medium">
          <a href="#features" class="text-muted-foreground hover:text-foreground transition-colors duration-200">Features</a>
          <a href="#stats" class="text-muted-foreground hover:text-foreground transition-colors duration-200">Live Demo</a>
          <NuxtLink to="/dashboard" class="text-muted-foreground hover:text-foreground transition-colors duration-200">Dashboard</NuxtLink>
        </nav>

        <div class="flex items-center gap-4">
          <NuxtLink to="/login" class="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors duration-200 px-3 py-1.5 rounded-full hover:bg-secondary">
            Creator Sign In
          </NuxtLink>
          <Button variant="default" size="sm" class="bg-primary text-primary-foreground hover:opacity-90 shadow-md shadow-primary/10" @click="focusCreateInput">
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
        <div class="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/10 blur-[120px] rounded-full pointer-events-none"></div>

        <div class="container max-w-4xl mx-auto px-6 text-center relative z-10 space-y-8">
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-secondary/50 backdrop-blur-md text-xs font-mono text-primary tracking-wide animate-fade-in">
            <span class="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
            Cinematic Media Collection
          </div>
          
          <h1 class="text-5xl md:text-7xl font-extrabold tracking-tight text-foreground leading-[1.08] max-w-3xl mx-auto">
            Anonymous Dumps.<br />Professional Quality.
          </h1>
          
          <p class="text-lg md:text-xl text-muted-foreground font-normal max-w-2xl mx-auto leading-relaxed">
            The cleanest way to collect high-res media from your community, guests, or team. Straight to your storage, no compression, no account required.
          </p>

          <!-- Interactive Create Dump Box -->
          <div class="w-full max-w-md mx-auto pt-6">
            <div class="bg-card/80 border border-border p-2 rounded-2xl flex items-center gap-2 shadow-[0_8px_32px_rgba(0,0,0,0.1)] focus-within:border-primary/50 transition-all duration-300">
              <span class="text-muted-foreground font-mono text-sm pl-3 select-none">photodump.app/</span>
              <input 
                ref="dumpNameInput"
                v-model="newDumpName"
                type="text" 
                placeholder="summer-trip-2026" 
                class="bg-transparent border-none outline-none text-foreground font-medium text-sm flex-1 min-w-0 py-2"
                @keyup.enter="handleCreateDump"
              />
              <Button 
                variant="default" 
                size="default" 
                class="bg-primary text-primary-foreground hover:opacity-90 rounded-xl shrink-0 gap-1.5"
                @click="handleCreateDump"
              >
                Go
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
              </Button>
            </div>
            <p v-if="error" class="text-xs text-destructive font-medium text-left mt-2 pl-4">
              {{ error }}
            </p>
            <p class="text-xs text-muted-foreground font-mono mt-3">
              Type a custom link and press Go to initialize a public upload page instantly.
            </p>
          </div>

          <div class="flex items-center justify-center gap-4 pt-4">
            <a href="#stats" class="text-xs font-semibold text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors group">
              View live analytics demo 
              <svg class="w-3 h-3 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg>
            </a>
          </div>
        </div>
      </section>

      <!-- Features Section -->
      <section id="features" class="border-t border-border py-24 bg-muted/20">
        <div class="container max-w-6xl mx-auto px-6">
          <div class="grid md:grid-cols-3 gap-8">
            <!-- Feature 1 -->
            <div class="flex flex-col gap-4 p-8 rounded-3xl border border-border bg-card/40 hover:border-border/80 transition-all duration-300">
              <div class="text-primary font-mono font-bold text-sm tracking-widest">01</div>
              <h3 class="text-lg font-bold text-foreground">Scan & Dump</h3>
              <p class="text-sm text-muted-foreground leading-relaxed">
                Users scan a QR code or hit a custom link. No app download, no sign-up. Just select files and upload directly.
              </p>
            </div>
            <!-- Feature 2 -->
            <div class="flex flex-col gap-4 p-8 rounded-3xl border border-border bg-card/40 hover:border-border/80 transition-all duration-300">
              <div class="text-primary font-mono font-bold text-sm tracking-widest">02</div>
              <h3 class="text-lg font-bold text-foreground">Full Fidelity</h3>
              <p class="text-sm text-muted-foreground leading-relaxed">
                Supports RAW, HEIC, 4K ProRes, and video files. We don't compress your memories. You receive the exact original bytes.
              </p>
            </div>
            <!-- Feature 3 -->
            <div class="flex flex-col gap-4 p-8 rounded-3xl border border-border bg-card/40 hover:border-border/80 transition-all duration-300">
              <div class="text-primary font-mono font-bold text-sm tracking-widest">03</div>
              <h3 class="text-lg font-bold text-foreground">Creator Pro</h3>
              <p class="text-sm text-muted-foreground leading-relaxed">
                Manage dozens of dumps from one clean dashboard. Set storage destinations, track size limit quotas, and revoke links instantly.
              </p>
            </div>
          </div>
        </div>
      </section>

      <!-- Stats / Demo Dashboard Section -->
      <section id="stats" class="border-t border-border py-24 relative overflow-hidden">
        <div class="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-primary/5 blur-[120px] rounded-full pointer-events-none"></div>

        <div class="container max-w-6xl mx-auto px-6">
          <div class="grid lg:grid-cols-2 gap-12 items-center">
            <!-- Left Side Copy -->
            <div class="space-y-6">
              <p class="text-xs font-mono uppercase text-primary tracking-widest font-semibold">Analytics & Control</p>
              <h2 class="text-3xl md:text-4xl font-bold text-foreground tracking-tight leading-tight">
                Designed for professional media collection.
              </h2>
              <p class="text-base text-muted-foreground leading-relaxed">
                Our dashboard gives you clear, real-time metrics on storage volume, bandwidth reach, and uploaded files. Easily configure custom destinations, enforce password protection, and generate QR code packages.
              </p>
              
              <div class="pt-4 flex flex-col gap-3">
                <div class="flex items-center gap-3">
                  <div class="w-5 h-5 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg>
                  </div>
                  <span class="text-sm font-medium text-foreground/80">Google Drive API Integration</span>
                </div>
                <div class="flex items-center gap-3">
                  <div class="w-5 h-5 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg>
                  </div>
                  <span class="text-sm font-medium text-foreground/80">Password-Protected Access Keys</span>
                </div>
                <div class="flex items-center gap-3">
                  <div class="w-5 h-5 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg>
                  </div>
                  <span class="text-sm font-medium text-foreground/80">Vector QR Code Downloads</span>
                </div>
              </div>

              <div class="pt-6">
                <Button variant="secondary" size="lg" class="rounded-full" @click="navigateTo('/dashboard')">
                  Explore Demo Dashboard
                </Button>
              </div>
            </div>

            <!-- Right Side Dashboard Mockup -->
            <div class="bg-card border border-border rounded-3xl p-6 shadow-2xl relative">
              <div class="absolute -top-3 -right-3 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 font-mono text-[10px] rounded-full uppercase tracking-wider font-semibold">
                ● Live Demo
              </div>
              
              <!-- Stat Cards Grid -->
              <div class="grid grid-cols-2 gap-4 mb-6">
                <div class="bg-secondary/50 border border-border/80 p-4 rounded-2xl">
                  <div class="text-2xl font-bold text-foreground font-mono">156.4<span class="text-xs text-muted-foreground pl-0.5">GB</span></div>
                  <div class="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold mt-1">Storage Used</div>
                </div>
                <div class="bg-secondary/50 border border-border/80 p-4 rounded-2xl">
                  <div class="text-2xl font-bold text-foreground font-mono">2,419</div>
                  <div class="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold mt-1">Total Media</div>
                </div>
              </div>

              <!-- Storage Breakdown Progress Bar -->
              <div class="bg-secondary/30 border border-border p-5 rounded-2xl space-y-4">
                <div class="flex items-center justify-between text-xs">
                  <span class="font-medium text-muted-foreground">Video (ProRes)</span>
                  <span class="font-mono text-muted-foreground font-bold">124.2 GB</span>
                </div>
                <div class="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                  <div class="h-full bg-primary rounded-full" style="width: 80%"></div>
                </div>
                
                <div class="flex items-center justify-between text-xs pt-1">
                  <span class="font-medium text-muted-foreground">Photos (RAW)</span>
                  <span class="font-mono text-muted-foreground font-bold">28.4 GB</span>
                </div>
                <div class="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                  <div class="h-full bg-muted-foreground/50 rounded-full" style="width: 18%"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>

    <!-- Footer -->
    <footer class="border-t border-border py-12 text-muted-foreground text-xs">
      <div class="container max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
        <span>© 2026 PhotoDump Pro. All rights reserved.</span>
        <div class="flex items-center gap-6">
          <a class="hover:text-foreground transition-colors">Terms</a>
          <a class="hover:text-foreground transition-colors">Privacy</a>
          <a class="hover:text-foreground transition-colors">Support</a>
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
