# AGENTS.md

## Project Overview

Centipede is a Next.js App Router + TypeScript MVP for scheduling cross-posts to Telegram, X, Reddit, and LinkedIn.

The app uses Clerk for auth, Prisma/PostgreSQL for persistence, encrypted platform connection storage, and App Router route handlers under `src/app/api/*`.

Platform status:

- Telegram uses a BotFather token plus one default chat/channel target. The app validates access through Telegram Bot API checks and publishes through `sendMessage`/`sendPhoto`.
- LinkedIn, Reddit, and X use OAuth connection flows.
- Publishing adapters live in `src/backend/adapters/*`; they call platform APIs but the app is still an MVP and should not be treated as production-grade external posting.
- Media upload uses Vercel Blob through `src/lib/media.ts`.

## Setup Commands

- Install dependencies: `npm install`
- Generate Prisma client: `DATABASE_URL=${DATABASE_URL:-$STORAGE_DATABASE_URL} npx prisma generate`
- Start dev server: `npm run dev`
- Build for production: `npm run build`
- Start production server (after build): `npm run start`

Required environment is documented in `.env.example`. Important values include Clerk keys, `STORAGE_DATABASE_URL` or `DATABASE_URL`, `CONNECTION_ENCRYPTION_KEY`, `CENTIPEDE_WORKER_SECRET`, `BLOB_READ_WRITE_TOKEN`, `APP_URL`, and OAuth client credentials.

## Git Workflow

- Before starting a new feature, update local `master` from remote first, then create the feature branch from updated `master`.
  - Example: `git checkout master`, `git pull --ff-only origin master`, then `git checkout -b feature/<task-name>`.
- Create and use a dedicated branch for each task using the `feature/*` naming pattern.
- Do not implement new changes directly on `master`/`main`.
- When continuing work on an existing feature branch, first check whether remote `master` has changed. If it has, merge the relevant updated `master` changes into the current branch before continuing.

## Testing And Validation

There is no dedicated test suite or lint script yet.

For code changes, run:

1. `npm run build` (required; catches TypeScript and Next.js compile issues)
2. Smoke-check the main flows in dev:
   - Load `/`
   - Sign in through Clerk and load `/settings`
   - Connect or inspect platform status
   - Create a scheduled post
   - Run worker tick (POST `/api/worker/tick`) via UI button
   - Verify history and failure log refresh

## Repository Structure

- `src/app/page.tsx`: public landing page
- `src/app/studio/page.tsx`: authenticated studio entrypoint
- `src/app/settings/page.tsx`: authenticated platform settings entrypoint
- `src/app/settings/telegram-guide/page.tsx`: Telegram setup guide
- `src/app/api/*`: App Router API routes (`platforms`, `history`, `schedule`, `worker/tick`, `connections`, `media/upload`)
- `src/components/*`: client UI for studio, settings, and setup guides
- `src/lib/types.ts`: shared domain types used by UI/API/backend
- `src/lib/schedules.ts`: scheduling, idempotency, job processing, history, and failure logs
- `src/lib/connections.ts`: encrypted platform connection persistence and connection snapshots
- `src/lib/platform-oauth.ts`: OAuth start/callback completion for X, Reddit, and LinkedIn
- `src/lib/telegram.ts`: Telegram Bot API validation and publish failure classification
- `src/lib/media.ts`: media upload handling
- `src/lib/db.ts`: Prisma client
- `prisma/schema.prisma`: database schema
- `src/backend/adapters/*`: per-platform publish behavior
- `src/backend/publisher.ts`: adapter selection by `PlatformKey`
- `src/styles/globals.css`: global styling

## Code Style Guidelines

- Language: TypeScript with `strict: true` in `tsconfig.json`
- Follow existing style in this repo:
  - Double quotes
  - Semicolons
  - Named exports for shared modules; default export for Next.js page/API handlers where needed
- Keep shared contracts in `src/lib/types.ts`; avoid duplicating inline structural types across files.
- Keep API routes thin; move domain logic to `src/lib` or `src/backend`.
- Keep authenticated page checks in server components using Clerk `auth()` and redirect unauthenticated users to `/`.

## Domain Rules To Preserve

- `scheduleAtUtc` must be an ISO date string; validate in API layer.
- `selectedPlatforms` must be non-empty for schedule creation.
- Scheduling is allowed only for connected platforms.
- Platform-specific variant content (if provided) overrides base content during publish.
- Idempotency is derived from schedule time + selected platforms + content unless explicit `idempotencyKey` is provided.
- Worker processing updates job/post status and records failure logs with attempts.
- Connection secrets must be encrypted with `CONNECTION_ENCRYPTION_KEY`; never echo saved tokens back to the client.
- Telegram connection must remain non-posting during validation unless the user explicitly requests a visible test message flow.
- Telegram image posts use photo captions, so preserve the existing caption length validation.
- Reddit scheduling requires subreddit and title options and currently publishes self-posts only.
- LinkedIn connection is member-profile posting only and may require reconnect after token expiry or auth failure.

## Safety And Scope Notes

- This is an MVP implementation with real persistence and platform API paths, but it still needs production hardening before being described as fully reliable external posting.
- Do not log, display, or commit platform tokens, OAuth secrets, or encrypted payload plaintext.
- Avoid Prisma schema changes unless they are required for the requested feature; include migrations when schema changes are made.
- Keep changes incremental and aligned with existing project layout unless explicitly asked to refactor.
