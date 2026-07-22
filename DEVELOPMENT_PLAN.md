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

## Phase 8 — August Schedule
- [x] Schedule vibe coding for 15 August 2026.
- [x] Schedule token economics for 16 August 2026.
- [x] Add dates to workshop cards and registration choices.
- [ ] Validate and redeploy the updated schedule.

## Phase 9 — Participant Automation
- [x] Notify the organizer in Telegram after each registration.
- [x] Send the participant a welcome email through Gmail SMTP.
- [x] Add Telegram bot activation and participant welcome flow.
- [x] Store participant Telegram chat IDs for future messages.
- [ ] Configure production secrets, webhook, and redeploy.

## Phase 10 — Workshop Facilitation Plans
- [x] Create the two-hour vibe coding plan and facilitator script.
- [x] Create the one-hour AI token economics plan and facilitator script.
- [ ] Add final examples, demos, worksheets, and supporting content.

## Phase 11 — Palette Refresh
- [x] Replace the purple accent family with deep teal and soft mint.
- [x] Validate the production build and responsive visual treatment.

## Phase 12 — Reference-led Redesign
- [x] Rebuild the visual direction around glass panels and gradient tiles.
- [x] Preserve workshop content, schedule, and registration behavior.
- [x] Validate the production build and responsive layouts.

## Phase 13 — Mascot-led Redesign
- [x] Create original robot, plant, and space-tech artwork from the references.
- [x] Rebuild the landing page with a dark, lime, violet, and paper visual system.
- [x] Preserve workshop content, August schedule, and registration behavior.
- [x] Validate the production build and desktop/mobile layouts.

## Phase 14 — Capacity and Next-run Waitlist
- [x] Enforce workshop capacities without race-condition overbooking.
- [x] Switch full workshops from registration to next-run waitlist messaging.
- [x] Store waitlisted participants with the `next_run` status.
- [ ] Apply the updated schema to Supabase and redeploy.
- [x] Validate the production build.
