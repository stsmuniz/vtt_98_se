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

#### Local Postgres (offline / no Supabase access)

When the local network can't reach Supabase (pooler or direct), a local Postgres runs via `docker-compose.yml` (`postgres:16`, `localhost:5432`, db `vtt_rpg`, user/password `postgres`/`postgres`). Start it with `docker compose up -d` (requires Docker Desktop running). If `DATABASE_URL` is set in `.env` (already there, pointing at that local container), it takes priority over the `SUPABASE_*` vars everywhere a db connection is made: `drizzle.config.ts`/`.cjs`, `server/utils/drizzle.ts`, and `scripts/list-tables.js`/`.cjs` — all branch on `process.env.DATABASE_URL` first. Apply migrations to it the normal way (`npx drizzle-kit migrate --config drizzle.config.ts`). This only affects local dev: Vercel's env vars don't set `DATABASE_URL`, so production keeps using the Supabase pooler untouched. To go back to hitting Supabase locally, comment out/remove `DATABASE_URL` from `.env`.

`drizzle-kit` loads `.env` by itself, so `unset DATABASE_URL` is not enough to point it at Supabase while `DATABASE_URL` is in `.env` — it gets re-populated and the command silently runs against the local db again. To migrate Supabase in that situation, blank the variable explicitly (dotenv never overrides an existing var): `DATABASE_URL= npx drizzle-kit migrate --config drizzle.config.ts`, then confirm in `drizzle.__drizzle_migrations` on Supabase.

**Every table in `public` must have Row Level Security enabled** (`pgTable(...).enableRLS()` in the schema). Supabase exposes the `public` schema through its REST Data API to the `anon`/`authenticated` roles, which have full privileges there by default, and the `sb_publishable_...` key is not a secret — a table without RLS is readable/writable by anyone over `https://<ref>.supabase.co/rest/v1/<table>` (this was the case for every table, including `session` and `account`, until migration `0001_enable_rls`). The app itself is unaffected because it connects as `postgres`, which has `BYPASSRLS`. No policies are defined on purpose: nothing should be reachable through the Data API.

When you change `server/db/schema.ts`, keep `server/db/schema.cjs` in sync manually — they are not generated from one another. `auth-schema.ts` at the repo root is a stray artifact from the better-auth CLI schema generator (unused by app code, but kept in sync with the `user`/`session`/`account`/`verification` tables for reference).

### Realtime room sync (Server-Sent Events + Upstash Redis)

Rooms need one-way live push (server → browser) for token edits and saves. **This does not use WebSockets**: Nitro's WebSocket support (crossws) explicitly does not cover the Vercel preset — only Node.js, Bun, Deno, and Cloudflare Workers (https://nitro.build/docs/websocket) — so a `defineWebSocketHandler` route deploys but the client's `wss://` upgrade just fails on Vercel. Instead:
- `server/api/rooms/[code]/events.get.ts` opens a Server-Sent Events stream (h3's `createEventStream`) that pushes `room:update` / `snapshot:live` / `room:closed` to the browser — plain streaming HTTP, works on Vercel's Node runtime with no special config. The owner is recognized via their normal better-auth session cookie; a password-protected room's anonymous visitor instead passes a short-lived opaque `token` (query param) obtained from `/join` — the password itself is never put in a URL/query string.
- `server/api/rooms/[code]/live.post.ts` is the one thing the room owner ever sends *up* live (a token drag/resize/etc., not yet saved) — a plain POST, since the only two things the original WebSocket protocol carried client→server (`auth`, `snapshot:live`) both came from the owner and don't need a persistent connection.
- `server/utils/roomHub.ts` coordinates delivery. Vercel runs multiple serverless instances of the same function, each with its own memory, so an in-memory registry of open streams only ever sees the ones that landed on that instance — a room's owner and a visitor can easily land on different instances, and the PATCH/PUT/DELETE handlers in `server/api/v1/rooms/[id]/**` almost certainly run on yet another one. `server/utils/redis.ts` exports `redis` (`Redis.fromEnv()`, REST-based, from `@upstash/redis`), used two ways:
  - The live (unsaved) snapshot draft is stored in Redis (`room:<code>:live-snapshot`, with a TTL as a safety net) instead of an in-memory map, so a stream opening on any instance sees the current draft.
  - Cross-instance broadcast uses Redis pub/sub (`room:<code>:events`): each instance keeps its own open SSE streams in a local `Map` (a stream can't be serialized into Redis) and subscribes to a room's channel only while it has local streams for that room; publishing a message reaches every subscribed instance, which relays it to its own local streams. Local delivery (same instance) still happens directly/synchronously — the Redis round trip is only what reaches other instances.

Redis is treated as an enhancement, not a dependency of saving: live-snapshot reads/writes and publishes only log on failure, the client retries briefly (`server/utils/redis.ts`), and room saves still reach Postgres if Upstash is down. The exception is joining a password-protected room, which needs Redis to issue the access token — `join.post.ts` answers 503 with a clear message in that case.

`.env` needs `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` (same names `Redis.fromEnv()` expects), also set in the Vercel project's environment variables (Production, Preview, and Development).

## Architecture

### Nuxt layout

- `app/` — client app: `pages/`, `components/`, `layouts/`, `middleware/`, `app.vue`, `error.vue`. Standard Nuxt 4 file-based routing.
- `server/` — Nitro server: `api/v1/**` (REST endpoints), `api/auth/**` (better-auth), `middleware/` (server-side request middleware), `utils/` (auto-imported server utilities), `db/schema.ts` (Drizzle schema, single source of truth for the data model).
- `lib/` — small shared non-Nuxt-specific helpers (`auth-client.ts` for the better-auth Vue client, `rollDice.ts`).
- `composables/` — Vue composables (root folder, NOT auto-imported: import them explicitly with `~~/composables/...`). The desktop shell lives in `useWindowManager`, `useWindow`, `useDesktop`, `useDialog` (described below).
- Path aliases in use: `#server/...` resolves into `server/...` (Nitro server alias), `~~/` and `~/` resolve to the app root / `app/` respectively.

### Auto-imports

Nitro auto-imports everything exported from `server/utils/*` (e.g. `auth`, `useDrizzle`, `tables`, resource shapers) as well as h3 helpers (`defineEventHandler`, `getRouterParam`, `createError`, `readBody`, etc.) into every `server/api/**` file. Most route handlers do **not** import these explicitly — don't be surprised by "undefined" symbols in a handler; check `server/utils/` before assuming something is missing. Some files do import them redundantly for clarity/history; either style works, but prefer the auto-import (no explicit import) to match most of the codebase.

### Auth

- `better-auth` (`server/utils/auth.ts`) is configured with the Drizzle adapter (`provider: "pg"`) over the same Supabase Postgres db, using the `user`/`session`/`account`/`verification` tables in `server/db/schema.ts`. Email/password auth is enabled.
- `server/api/auth/[...all].ts` mounts the better-auth handler for all `/api/auth/*` routes.
- `server/middleware/auth.ts` is a global Nitro middleware that rejects any `/api/v1/*` request with no valid session (401). Individual `server/api/v1/**` handlers additionally re-check `session.user` themselves in most cases — this is defensive duplication, not a bug; keep doing it when adding new v1 routes since the shared middleware alone shouldn't be relied on as the only guard in a handler that also needs `session.user.id` for row ownership.
- Client-side: `lib/auth-client.ts` creates the better-auth Vue client (no explicit `baseURL`; it uses the current origin). `app/middleware/auth.ts` is a Nuxt route middleware (`definePageMeta({ middleware: 'auth' })`) that redirects to `/login?redirect=<path>` when there's no client session; the login page sends the user back to that (internal-only) path.

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

The logged-in app is a simulated **Windows 98 desktop** (UI rework in progress, done in phases).

- **Component layers** (Nuxt auto-imports with folder prefix):
  - `app/components/ui/*` → `<Ui*>`: pure, atomic Win98 primitives with no global state — `UiWindow` (the ONLY window frame), `UiMenuBar`/`UiMenu`/`UiContextMenu`/`UiPopup`, `UiToolbar`, `UiStatusBar`, `UiTabs`, `UiListView` (icons/list/details), form fields, `UiWizard`, `UiMessageBox`. Live showcase at `/dev/ui` (dev only).
  - `app/components/desktop/*` → `<Desktop*>`: the shell that knows the window manager — `DesktopWindow` (binds a WM entry to `UiWindow`: drag, resize, focus, min/max), `DesktopRouteWindow`, `DesktopTaskbar`, `DesktopStartMenu`, `DesktopIcons`, `DesktopDialogHost`, `DesktopBusyOverlay`.
  - `app/components/apps/*`: contents of windows opened from the app registry.
- **Menus are data, never hand-written markup**: `MenuDef`/`MenuItemDef` in `app/utils/menu.ts` (`&` marks the access key). Icons are referenced by logical name via `app/utils/icons.ts` (`iconUrl(name, size)`), never by file path.
- **`app/layouts/desktop.vue`** serves `/dashboard`, `/dashboard/scenes/:id` and `/rooms/:code` (all `ssr: false` via `routeRules`). Because the three routes share the layout, it stays mounted across navigation and open windows survive page changes. It owns the single global keydown listener: F1 help, Alt+I / Ctrl+Esc Start menu, Alt+W window switcher; everything else goes to the active window.
- **Window manager** (`composables/useWindowManager.ts`): serializable state in `useState('wm')` (rect, state, z-order, active window); non-serializable bits (shortcuts, before-close guards) in module Maps. Window kinds: `app` (opened via `useDesktop().openApp(id, props)` from the registry in `app/desktop/apps.ts`, rendered by `DesktopWindowLayer`), `route` (the current page wrapped in `<DesktopRouteWindow>`, id `'route'`), `inline`.
- **Per-window API** (`composables/useWindow.ts`): inside a window's content call `useWindow()`; a page that owns its route window calls `useWindow('route')`. Use `setMenus(...)`, `shortcuts({ 'ctrl+s': { run, allowInInput: true }, delete: fn })` (fires only while that window is active — never add global `window.addEventListener('keydown')` in pages) and `onBeforeClose(fn)`.
- **Resource folders** (Tokens/Cenários/Cenas/Salas) are one generic Explorer (`app/components/apps/explorer/ResourceExplorer.vue`) driven by descriptors in `app/desktop/resources.ts` (endpoint, what "Abrir" does, preview fields, form fields). Shared CRUD lives in `composables/useResourceActions.ts`; every window reads the same `useAsyncData` cache key (`resource:<kind>`), so call `refreshNuxtData(resourceCacheKey(kind))` after a mutation and every open folder/picker updates. Per-user view mode/column order/sort persist through `composables/usePreferences.ts` (`/api/v1/preferences`).
- **Pickers**: `const token = await useDesktop().pick('tokens', { ownerId: 'route', confirmLabel: 'Adicionar' })` opens a folder in pick mode and resolves with the chosen record, or `null` if the window is closed. Pass `ownerId` so the picker closes with the window that asked for it. Window ids are `app:<appId>` or `app:<appId>:<instanceKey>`.
- **Preferences & system features** (phase 6): `usePreferences()` resolves defaults + what the user changed (`lib/preferences.ts`), mirrors them to localStorage (no flash on load; guests are local-only) and PATCHes `/api/v1/preferences` debounced. The desktop layout applies wallpaper/color and the UI scale as `zoom` on `body.desktop-mode` (the Konva canvas undoes it with a counter-zoom). Sounds are synthesized with Web Audio (`lib/audio/*`, `composables/useSystemSounds.ts`) — no audio files; the AudioContext is only created after a user gesture. Start menu > Desligar runs `useDesktop().shutdown()` (HDD sound + clouds screen → sign out → `/turnoff`); logoff/shutdown first honor the route window's unsaved-changes prompt.
- **Dialogs**: `await useDialog().alert(msg)` / `confirm(msg)` / `ask({ buttons })` instead of native `alert()`/`confirm()`. Blocking "Aguarde" overlay: `useLoadingWindow().withLoading(fn, msg)`.
- **Template gotcha**: Vue templates cannot see globals such as `window`, `document` or `HTMLElement` — put that logic in a script function (a `ref` callback using `el instanceof HTMLElement` inline crashed hydration once).
- The scene editor (`app/pages/dashboard/scenes/[id].vue`) and the room (`app/pages/rooms/[code].vue`) share one `vue-konva` canvas, `app/components/editor/Stage.vue` (`<EditorStage>`): `v-model:tokens` holds the page's OWN token objects (drag/transform mutates them, which the room's deep watcher relies on to broadcast live edits), plus selection, transformer, the scene resize handle (editor) and smoothed `positions` for room visitors. Page-owned tool windows (`EditorSceneTokensWindow`, `EditorInitiativeWindow`, `EditorTokenConfigWindow`, `EditorTokenAttributesDialog`) are `<DesktopInlineWindow v-model:open>` — real WM windows owned by the route window. Both pages track unsaved changes and prompt Sim/Não/Cancelar on close/navigation/unload. In dev, vue-konva logs "Extraneous non-emits event listeners" for `v-group`: harmless — the library reads listeners straight from vnode props.
