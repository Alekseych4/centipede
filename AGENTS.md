# AGENTS.md

## Project Overview

Centipede is a Next.js (pages router) + TypeScript MVP for scheduling cross-posts to Telegram, X, Reddit, and LinkedIn.

The app currently uses an in-memory mock backend (`src/lib/mockStore.ts`) and simulated platform adapters (`src/backend/adapters/*`), not real API integrations.

## Setup Commands

- Install dependencies: `npm install`
- Start dev server: `npm run dev`
- Build for production: `npm run build`
- Start production server (after build): `npm run start`

## Git Workflow

- Create and use a dedicated branch for each task using the `feature/*` naming pattern.
- Do not implement new changes directly on `master`/`main`.

## Testing And Validation

There is no dedicated test suite or lint script yet.

For code changes, run:

1. `npm run build` (required; catches TypeScript and Next.js compile issues)
2. Smoke-check the main flows in dev:
   - Load `/`
   - Create a scheduled post
   - Run worker tick (POST `/api/worker/tick`) via UI button
   - Verify history and failure log refresh

## Repository Structure

- `src/pages/index.tsx`: main UI for composing, scheduling, and running worker tick
- `src/pages/api/*`: API routes (`platforms`, `history`, `schedule`, `worker/tick`)
- `src/lib/types.ts`: shared domain types used by UI/API/backend
- `src/lib/mockStore.ts`: in-memory data store, scheduling, idempotency, job processing
- `src/backend/adapters/*`: per-platform publish behavior (mocked constraints)
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

## Domain Rules To Preserve

- `scheduleAtUtc` must be an ISO date string; validate in API layer.
- `selectedPlatforms` must be non-empty for schedule creation.
- Platform-specific variant content (if provided) overrides base content during publish.
- Idempotency is derived from schedule time + selected platforms + content unless explicit `idempotencyKey` is provided.
- Worker processing updates job/post status and records failure logs with attempts.

## Safety And Scope Notes

- This is an MVP mock implementation. Do not imply real external posting unless real adapters/auth are added.
- Store is process-memory only: restarting the app clears posts/jobs/logs.
- Keep changes incremental and aligned with existing project layout unless explicitly asked to refactor.
