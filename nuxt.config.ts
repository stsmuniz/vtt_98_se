// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: false },
  modules: [
      '@nuxt/content'
  ],
  app: {
    head: {
      htmlAttrs: {
        lang: 'pt-BR'
      },
      title: 'VTT 98 SE - Virtual Tabletop Retrô para RPG de Mesa',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'Mesa virtual gratuita e leve para RPG de mesa com visual nostálgico de Windows 98, suporte a tokens, mapas e sincronização em tempo real.' },
        { property: 'og:site_name', content: 'VTT 98 SE' },
        { property: 'og:type', content: 'website' },
        { property: 'og:image', content: '/assets/screenshots/vtt_98_screenshot_7.png' },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:image', content: '/assets/screenshots/vtt_98_screenshot_7.png' }
      ]
    }
  },
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
