import {  createAuthClient } from "better-auth/vue";

// Sem baseURL fixo: o client resolve automaticamente pela origem da página
// (window.location.origin) no navegador, e por BETTER_AUTH_URL no servidor (SSR).
// Assim funciona em dev (http://localhost:3000) e em produção (Vercel) sem precisar
// trocar esse valor manualmente a cada ambiente/deploy.
export const authClient = createAuthClient();