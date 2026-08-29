import { Redis } from '@upstash/redis'

// Cliente REST do Upstash Redis (lê UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN do
// ambiente). Usado para coordenar salas entre instâncias serverless da Vercel, que não
// compartilham memória entre si — ver server/utils/roomHub.ts.
export const redis = Redis.fromEnv()
