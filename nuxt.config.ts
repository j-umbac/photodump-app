// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxtjs/tailwindcss', '@nuxt/icon'],
  components: [
    {
      path: '~/components',
      pathPrefix: false,
      ignore: ['**/ui/**'],
    },
  ],
  css: ['~/assets/css/tailwind.css'],
  app: {
    pageTransition: { name: 'page', mode: 'out-in' },
    head: {
      script: [
        { src: 'https://accounts.google.com/gsi/client', async: true, defer: true }
      ]
    }
  },
  runtimeConfig: {
    public: {
      googleClientId: process.env.NUXT_PUBLIC_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID
    }
  },
  // Add this section:
  experimental: {
    appManifest: false
  },
  vite: {
    optimizeDeps: {
      include: [
        '@lucide/vue',
        'firebase/app',
        'firebase/auth',
        'firebase/firestore',
        'chart.js',
        'vue-chartjs',
        '@vueuse/core',
        'class-variance-authority',
        'reka-ui',
        'clsx',
        'tailwind-merge'
      ]
    }
  }
})