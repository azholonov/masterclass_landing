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

## Phase 15 — Vibecoding Focus
- [x] Remove token economics from the public landing page and registration form.
- [x] Rewrite shared messaging around the mobile vibecoding workshop.
- [x] Validate the production build and responsive layout.

## Phase 16 — Product Story
- [x] Package the workshop value proposition into five clear parts.
- [x] Add the product story section to the landing page.
- [x] Validate the production build and responsive layout.

## Phase 17 — Expert Profile
- [x] Add the expert biography and core areas of experience.
- [x] Connect the expert section to the page navigation and registration flow.
- [x] Validate the production build and responsive layout.

## Phase 18 — Expert Photo
- [x] Add the supplied expert portrait to the public artwork.
- [x] Replace the placeholder monogram with the portrait.
- [x] Validate the production build.

## Phase 19 — Workshop Price
- [x] Add the 5,000 KGS price to the workshop card.
- [x] Repeat the price at the registration decision point.
- [x] Validate the production build.

## Phase 20 — Participant Preparation
- [x] Explain the post-registration preparation instructions.
- [x] Include an optional one-hour early setup session with the expert.
- [x] Validate the production build and responsive layout.

## Phase 21 — Private Participant CRM
- [x] Add salted scrypt password authentication with a signed secure session.
- [x] Add payment, instructions, contact, attendance, and follow-up fields.
- [x] Build the searchable participant dashboard and protected update API.
- [ ] Apply the CRM schema to Supabase and configure Vercel secrets.
- [ ] Redeploy and smoke-test the production CRM.

## Phase 22 — CRM Telegram Messaging
- [x] Add authenticated one-to-one Telegram messages with reusable templates.
- [x] Log pending, delivered, and failed message attempts for auditability.
- [x] Show Telegram availability and last-send state in the participant CRM.
- [ ] Apply the messaging schema and test delivery with the production bot.

## Phase 23 — Security Hardening
- [x] Add persistent throttling for public registration and CRM login.
- [x] Deduplicate active registrations and enforce strict request limits.
- [x] Claim Telegram activation tokens atomically.
- [x] Add bot verification, browser security headers, and patched dependencies.
- [x] Validate the production build and dependency audit.
- [ ] Apply the security schema, configure Turnstile, and redeploy.

## Phase 24 — Registration Form Polish
- [x] Make the optional Telegram account unmistakable in the form.
- [x] Show Cloudflare Turnstile in an on-submit verification popup.
- [x] Validate the production build.

## Phase 25 — Registration Availability Recovery
- [ ] Fix the PostgreSQL type collision in the persistent rate limiter.
- [ ] Apply the corrected function to the production Supabase project.
- [ ] Re-test registration through Turnstile and validate the production build.

## Phase 26 — Kyrgyz-language Vibecoding Session
- [x] Add the Kyrgyz-language session for 14 August 2026.
- [x] Keep capacity and registration records separate by language and date.
- [ ] Apply the workshop schema update and redeploy.
- [x] Validate the production build.

## Phase 27 — Responsive Price Visibility
- [x] Hide workshop and registration prices on mobile screens.
- [x] Keep prices visible on tablet and desktop screens.
- [x] Validate the production build.

## Phase 28 — Participant Equipment Requirements
- [x] State the laptop and paid AI subscription requirements on the landing page.
- [x] Add the laptop and ChatGPT-or-Claude subscription checklist to welcome emails.
- [x] Validate the production build.

## Phase 29 — Limited Capacity Visibility
- [x] Replace the small capacity metadata with prominent limited-seat badges.
- [x] Reinforce the 12-seat limit beside the registration form.
- [x] Validate the production build.

## Phase 30 — Mobile Vibecoding Participant Guide
- [x] Add a dedicated preparation and learning web app.
- [x] Cover Flutter setup for macOS and Windows with verification steps.
- [x] Explain mobile fundamentals, architecture, app types, and delivery.
- [x] Connect the public landing page to the participant guide.
- [x] Validate the production build and responsive layout.

## Phase 31 — Private Participant Guide Access
- [x] Protect the guide for active participants and CRM administrators.
- [x] Issue hashed personal access links through registration and CRM email.
- [x] Save each participant's checklist progress in Supabase.
- [x] Show guide access and progress controls in the participant CRM.
- [x] Validate the protected routes and production build.
- [ ] Apply the updated schema, configure the guide secret, and redeploy.

## Phase 32 — Access Page Readability
- [x] Scope guide color tokens to the standalone access page.
- [x] Increase access-card text and control contrast.
- [x] Validate the production build.

## Phase 33 — Hide Public Organizer Entry
- [x] Remove the organizer login action from the participant access page.
- [x] Remove public organizer access instructions.
- [x] Validate the production build.

## Phase 34 — Close Current Cohort and CRM Email
- [x] Close both current sessions and route every new application to the waitlist.
- [x] Add one-to-one email messaging to participant cards in the CRM.
- [x] Validate the production build.
- [ ] Apply the updated registration function to Supabase and redeploy.

## Phase 35 — Waitlist Date Cleanup
- [x] Remove closed August dates from the public landing page and waitlist form.
- [x] Validate the production build.
- [ ] Redeploy the updated landing page.
