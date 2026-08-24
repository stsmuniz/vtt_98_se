// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: false },
  css: [
    '98.css'
  ],
  nitro: {
    storage: {
      uploads: {
        driver: 'fs',
        base: './public'
      }
    }
  }
})
