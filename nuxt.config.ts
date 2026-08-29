// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: false },
  css: [
    '98.css',
    '~/assets/css/fonts.css'
  ],
  nitro: {
    experimental: {
      websocket: true
    },
    storage: {
      uploads: {
        driver: 'fs',
        base: './public'
      }
    }
  }
})
