// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: false },
  modules: [
    '@nuxt/content',
    '@vercel/analytics'
  ],
  content: {
    // Usa o node:sqlite do Node (>= 22.5) em vez do addon nativo better-sqlite3: na Vercel o addon falha ao carregar
    // ("Module did not self-register") e toda consulta do @nuxt/content (blog e manual) respondia 500.
    experimental: { sqliteConnector: 'native' },
  },
  app: {
    head: {
      htmlAttrs: {
        lang: 'pt-BR'
      },
      title: 'VTT 98 SE - Virtual Tabletop Retrô para RPG de Mesa',
      link: [
        {rel: 'icon', type: 'image/x-icon', href: '/favicons/favicon-16x16.png'}
      ],
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
  // A área de trabalho (gerenciador de janelas, Konva, áudio) só existe no navegador.
  // Renderizar essas rotas só no cliente evita incompatibilidades de hidratação;
  // o site público e o login continuam com SSR.
  routeRules: {
    '/dashboard': { ssr: false },
    '/dashboard/**': { ssr: false },
    '/rooms/**': { ssr: false },
  },
  css: [
    '98.css',
    '~/assets/css/tokens.css',
    '~/assets/css/fonts.css'
  ],
  vite: {
    build: {
      cssMinify: 'esbuild'
    }
  }
})
