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
  },
  vite: {
    // O CSS do 98.css usa "@media (not(hover))" (sem espaço), que é sintaxe
    // inválida e o lightningcss (minificador padrão) rejeita no build de produção.
    // O esbuild é mais tolerante e minifica sem erro.
    build: {
      cssMinify: 'esbuild'
    }
  }
})
