# Development Plan

## Phase 1 — MVP Landing Page
- [x] Bootstrap Next.js, TypeScript, and Tailwind.
- [x] Build responsive landing page from the visual reference.
- [x] Add the two workshop cards and schedule content.
- [x] Add accessible registration flow.

## Phase 2 — Supabase
- [x] Add server-side Supabase integration.
- [x] Add database schema and row-level security.
- [x] Add environment variable template and setup notes.

## Phase 3 — Delivery
- [x] Add Vercel configuration and deployment notes.
- [x] Run production build and quality checks.
- [x] Verify desktop and mobile layouts.

## Phase 4 — Runtime Fixes
- [x] Keep non-function state out of the `use server` action module.
- [x] Re-run the production build.
- [x] Clear stale Webpack cache and verify client rendering without errors.

## Phase 5 — Registration Transport
- [x] Replace the Webpack-sensitive Server Action with a Route Handler.
- [x] Keep Supabase credentials server-only.
- [x] Add actionable handling for a missing Supabase table.
- [ ] Apply the schema to the remote Supabase project.
- [x] Validate production build and client rendering.

## Phase 6 — Vercel Deployment
- [x] Link the local project to Vercel.
- [x] Configure production Supabase environment variables.
- [x] Deploy and verify the production URL.

## Phase 7 — Content Cleanup
- [x] Remove the participant-count social proof from the hero.
- [x] Validate and redeploy the landing page.
