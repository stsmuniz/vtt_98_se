# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

A virtual tabletop (VTT) app for tabletop RPGs, built with Nuxt 4. The UI is deliberately styled as a retro Windows 98 desktop (via `98.css`) — draggable/resizable "windows" for dialogs, a title bar, a window menu bar, etc. Most UI strings, comments, and error messages in the codebase are written in Brazilian Portuguese; match that convention when editing existing files.

## Commands

```bash
npm run dev        # start dev server at http://localhost:3000
npm run build      # production build
npm run generate   # static generation
npm run preview    # preview a production build locally
```

There is no lint or test setup configured in this repo — do not assume `npm run lint`/`npm test` exist.

### Database (Drizzle + Supabase Postgres)

The schema lives at `server/db/schema.ts` (pg-core). There are two Drizzle configs:
- `drizzle.config.ts` (TS, points at `server/db/schema.ts`) — used for normal `drizzle-kit` TS workflows.
- `drizzle.config.cjs` (CJS, points at `server/db/schema.cjs`) — used by the `.cjs` tooling/scripts.

Both configs — and the runtime connection in `server/utils/drizzle.ts` — connect through Supabase's connection pooler (Supavisor), not the direct connection: the direct host (`db.<ref>.supabase.co`) only resolves via IPv6, and Vercel Functions have no IPv6 egress, so a direct connection works locally (if your network has IPv6) but always fails in production with `ENOTFOUND`. The pooler host is regional and not derivable from `SUPABASE_URL` — it's stored explicitly in `SUPABASE_POOLER_HOST` (e.g. `aws-0-us-west-2.pooler.supabase.com`, found in the Supabase dashboard's "Connect" modal). The pooler user is `postgres.<project-ref>` (ref parsed from `SUPABASE_URL`'s hostname), not plain `postgres`. Runtime queries (`server/utils/drizzle.ts`) use transaction mode (port 6543); `drizzle-kit` migrations and `scripts/list-tables.*` use session mode (port 5432), since transaction-mode pooling doesn't support the session semantics migrations need. `SUPABASE_PASSWORD` is passed as a discrete field (not part of a connection string) to avoid URL-encoding pitfalls from special characters in the password. `SUPABASE_DIRECT_CONNECTION_STRING` in `.env` is kept for reference but not used by app code.

Common drizzle-kit commands (run against whichever config matches the file you changed):
```bash
npx drizzle-kit generate --config drizzle.config.ts   # generate a migration from schema.ts changes
npx drizzle-kit migrate --config drizzle.config.ts    # apply pending migrations to the Supabase db
```
`.env` needs `SUPABASE_URL`, `SUPABASE_PASSWORD`, `SUPABASE_POOLER_HOST` (and `SUPABASE_KEY`, `SUPABASE_DIRECT_CONNECTION_STRING` for reference/other tooling). The same three vars must also be set in the Vercel project's environment variables (Production, Preview, and Development) for the deployed app and `vercel dev` to work. `scripts/list-tables.cjs` / `.js` are quick one-off scripts to dump table names from `information_schema.tables` (run with `node --env-file=.env scripts/list-tables.js`).

When you change `server/db/schema.ts`, keep `server/db/schema.cjs` in sync manually — they are not generated from one another. `auth-schema.ts` at the repo root is a stray artifact from the better-auth CLI schema generator (unused by app code, but kept in sync with the `user`/`session`/`account`/`verification` tables for reference).

### Realtime room sync (Server-Sent Events + Upstash Redis)

Rooms need one-way live push (server → browser) for token edits and saves. **This does not use WebSockets**: Nitro's WebSocket support (crossws) explicitly does not cover the Vercel preset — only Node.js, Bun, Deno, and Cloudflare Workers (https://nitro.build/docs/websocket) — so a `defineWebSocketHandler` route deploys but the client's `wss://` upgrade just fails on Vercel. Instead:
- `server/api/rooms/[code]/events.get.ts` opens a Server-Sent Events stream (h3's `createEventStream`) that pushes `room:update` / `snapshot:live` / `room:closed` to the browser — plain streaming HTTP, works on Vercel's Node runtime with no special config. The owner is recognized via their normal better-auth session cookie; a password-protected room's anonymous visitor instead passes a short-lived opaque `token` (query param) obtained from `/join` — the password itself is never put in a URL/query string.
- `server/api/rooms/[code]/live.post.ts` is the one thing the room owner ever sends *up* live (a token drag/resize/etc., not yet saved) — a plain POST, since the only two things the original WebSocket protocol carried client→server (`auth`, `snapshot:live`) both came from the owner and don't need a persistent connection.
- `server/utils/roomHub.ts` coordinates delivery. Vercel runs multiple serverless instances of the same function, each with its own memory, so an in-memory registry of open streams only ever sees the ones that landed on that instance — a room's owner and a visitor can easily land on different instances, and the PATCH/PUT/DELETE handlers in `server/api/v1/rooms/[id]/**` almost certainly run on yet another one. `server/utils/redis.ts` exports `redis` (`Redis.fromEnv()`, REST-based, from `@upstash/redis`), used two ways:
  - The live (unsaved) snapshot draft is stored in Redis (`room:<code>:live-snapshot`, with a TTL as a safety net) instead of an in-memory map, so a stream opening on any instance sees the current draft.
  - Cross-instance broadcast uses Redis pub/sub (`room:<code>:events`): each instance keeps its own open SSE streams in a local `Map` (a stream can't be serialized into Redis) and subscribes to a room's channel only while it has local streams for that room; publishing a message reaches every subscribed instance, which relays it to its own local streams. Local delivery (same instance) still happens directly/synchronously — the Redis round trip is only what reaches other instances.

`.env` needs `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` (same names `Redis.fromEnv()` expects), also set in the Vercel project's environment variables (Production, Preview, and Development).

## Architecture

### Nuxt layout

- `app/` — client app: `pages/`, `components/`, `layouts/`, `middleware/`, `app.vue`, `error.vue`. Standard Nuxt 4 file-based routing.
- `server/` — Nitro server: `api/v1/**` (REST endpoints), `api/auth/**` (better-auth), `middleware/` (server-side request middleware), `utils/` (auto-imported server utilities), `db/schema.ts` (Drizzle schema, single source of truth for the data model).
- `lib/` — small shared non-Nuxt-specific helpers (`auth-client.ts` for the better-auth Vue client, `rollDice.ts`).
- `composables/` — Vue composables (currently `useMenuActions`, the provide/inject bridge described below).
- Path aliases in use: `#server/...` resolves into `server/...` (Nitro server alias), `~~/` and `~/` resolve to the app root / `app/` respectively.

### Auto-imports

Nitro auto-imports everything exported from `server/utils/*` (e.g. `auth`, `useDrizzle`, `tables`, resource shapers) as well as h3 helpers (`defineEventHandler`, `getRouterParam`, `createError`, `readBody`, etc.) into every `server/api/**` file. Most route handlers do **not** import these explicitly — don't be surprised by "undefined" symbols in a handler; check `server/utils/` before assuming something is missing. Some files do import them redundantly for clarity/history; either style works, but prefer the auto-import (no explicit import) to match most of the codebase.

### Auth

- `better-auth` (`server/utils/auth.ts`) is configured with the Drizzle adapter (`provider: "pg"`) over the same Supabase Postgres db, using the `user`/`session`/`account`/`verification` tables in `server/db/schema.ts`. Email/password auth is enabled.
- `server/api/auth/[...all].ts` mounts the better-auth handler for all `/api/auth/*` routes.
- `server/middleware/auth.ts` is a global Nitro middleware that rejects any `/api/v1/*` request with no valid session (401). Individual `server/api/v1/**` handlers additionally re-check `session.user` themselves in most cases — this is defensive duplication, not a bug; keep doing it when adding new v1 routes since the shared middleware alone shouldn't be relied on as the only guard in a handler that also needs `session.user.id` for row ownership.
- Client-side: `lib/auth-client.ts` creates the better-auth Vue client (hardcoded `baseURL: "http://localhost:3000"`). `app/middleware/auth.ts` is a Nuxt route middleware (`definePageMeta({ middleware: 'auth' })`) that redirects to `/login` when there's no client session.

### Data model (`server/db/schema.ts`)

Core entities and ownership:
- `user` / `session` / `account` / `verification` — better-auth tables.
- `tokensTable` — reusable token templates (name, image, size, tags, attributes), owned by `userId`.
- `scenariosTable` — a reusable background/map (image, size, tags), owned by `userId`.
- `scenesTable` — a specific arrangement of tokens on top of a `scenariosTable` (`scenarioId` FK), owned by `userId`. Stores `tokens` (a JSON array of `SceneToken`, i.e. per-scene token instances copied from a token template) and `startingPosition` as JSON columns.
- `roomsTable` / `roomPlayersTable` — live play sessions: a room snapshots a scene (`snapshot: RoomSceneSnapshot` JSON, copied from a source scene) plus live `initiative` order, and has players with a `RoomPlayerRole` (`owner`/`gm`/`player`/`spectator`). Rooms are CRUD'd via `server/api/v1/rooms/**` and played from the public, no-account page `app/pages/rooms/[code].vue`, which joins via `server/api/rooms/[code]/join.post.ts` (password check, if any) and then opens a Server-Sent Events stream at `server/api/rooms/[code]/events.get.ts` for live sync — see the Redis section below for why this isn't a WebSocket and how it scales across serverless instances.

Ownership is enforced per-row via `userId`/`userId` columns, not via a separate ACL — most read/update/delete queries filter `where(and(eq(table.id, id), eq(table.userId, session.user.id)))`. Follow this pattern for new routes rather than checking ownership after the fact.

Several JSON-typed columns exist for denormalized nested data (`tokens`, `attributes`, `tags`, `snapshot`, `initiative`, `startingPosition`) — these are plain typed JS objects/arrays serialized by Drizzle's `{ mode: "json" }`, not separate related tables. When editing scene/room tokens, you're mutating a JSON blob in one row, not a child table.

### API conventions (`server/api/v1/**`)

Resources (`scenes`, `scenarios`, `tokens`) follow the same REST shape: `index.get.ts` (list), `index.post.ts` (create), `[id]/index.get.ts` or `[id].get.ts` (read one), `.put.ts` (replace), `.patch.ts` (partial update), `.delete.ts` (delete). Note the `scenes` routes nest the id segment as a folder (`scenes/[id]/index.get.ts`) while `scenarios` uses a flat filename (`scenarios/[id].get.ts`) — check the existing sibling files in a resource's folder before adding a new verb so the new route matches that resource's existing convention.

Create endpoints (`scenarios`, `tokens`, and `scenes` when duplicating) accept **either** `multipart/form-data` (new upload — image file required) or `application/json` (duplicate-from-existing — reuses an existing image URL, name gets a `" (Cópia)"` suffix) — branch on the `content-type` header, matching the existing handlers.

Uploaded files go through `server/utils/imageStorage.ts`'s `storeImage()`: it resizes the image with `sharp` if either dimension exceeds 500px (preserving aspect ratio via `fit: 'inside'`), then uploads to Vercel Blob (`@vercel/blob`, reads `BLOB_READ_WRITE_TOKEN` automatically) under a resource-specific prefix (`scenarios/<file>`, `tokens/<file>`). The `image` column stores the full public Blob URL, and `width`/`height` are overwritten with the post-resize dimensions so they stay consistent with the stored file. (Older rows created before this migration still point at relative `/scenarios/<file>` paths served from `public/` — both forms coexist fine since `image` is just rendered via `<img :src>`.)

`server/utils/resources.ts` holds response-shaping helpers (e.g. `sceneResource`) that flatten a Drizzle relational query result (`{ scenes: {...}, scenarios: {...} }`) into the API's response shape — add new shapers here rather than reshaping ad hoc in route handlers.

### Client app structure

- `app/layouts/dashboard.vue` renders the Windows-98-style desktop chrome (title bar, menu bar, status bar) and implements a **provide/inject action bus**: it `provide()`s `menuActions` (an object of `register`/`unregister`/reactive `actions`), and menu items call `onAction(name)` which looks up and invokes a handler by name. Pages/components register their own handlers via the `useMenuActions()` composable (`composables/useMenuActions.ts`) for actions like `salvar` (save) or `novo-token` (new token) scoped to whatever page is currently mounted, and must `unregister` them `onUnmounted`. When adding a new page-level menu action, follow this register/unregister pattern rather than adding page-specific logic into the layout.
- The scene editor (`app/pages/dashboard/scenes/[id].vue`) renders the canvas with `vue-konva` (`Stage`/`Layer`/`Image`/`Transformer`, etc.) for placing, dragging, and transforming tokens over a scenario background image.
- Windowed dialogs (`EditTokenWindow.vue`, `InsertSceneWindow.vue`, `AlertWindow.vue`, `FixedWIndow.vue`, etc.) are the modal/floating-window building blocks styled with `98.css`; reuse these rather than introducing a different dialog pattern.
