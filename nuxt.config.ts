// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: false },
  modules: [
      '@nuxt/content'
  ],
  css: [
    '98.css',
    '~/assets/css/fonts.css'
  ],
  vite: {
    build: {
      cssMinify: 'esbuild'
    }
  }
})
