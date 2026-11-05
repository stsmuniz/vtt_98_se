import { Redis } from '@upstash/redis'

// Cliente REST do Upstash Redis (lê UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN do
// ambiente). Usado para coordenar salas entre instâncias serverless da Vercel, que não
// compartilham memória entre si — ver server/utils/roomHub.ts.
//
// Poucas novas tentativas e curtas: o padrão do cliente (5, com espera exponencial) leva
// ~4 s por chamada quando o Redis está fora do ar, e salvar uma sala faz duas chamadas —
// o usuário ficava ~9 s esperando um salvamento que já tinha ido para o Postgres.
export const redis = Redis.fromEnv({
    retry: {
        retries: 2,
        backoff: retryCount => 100 * (retryCount + 1),
    },
})
