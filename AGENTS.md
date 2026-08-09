# Masterclass Landing

## Summary
- Russian-language landing page for workshop registration.
- Current phase: Phase 38 — receipt email clarified; deployment pending.
- Workshop: mobile vibe coding.

## Key Paths
- `app/page.tsx` — landing page and registration UI.
- `app/guide/` — participant setup guide and mobile development handbook.
- `lib/guide-auth.ts` — signed participant guide sessions.
- `app/api/register/route.ts` — server-side registration endpoint.
- `app/globals.css` — visual system and responsive styles.
- `public/art/` — generated robot and botanical artwork.
- `lib/supabase.ts` — Supabase server client.
- `supabase/schema.sql` — database schema and RLS policy.
- `app/api/payment-receipts/` — secure one-time receipt upload endpoint.
- `DEVELOPMENT_PLAN.md` — numbered delivery phases.

## Tech Stack
- Next.js App Router + TypeScript.
- Tailwind CSS.
- Supabase PostgreSQL for registrations.
- Vercel for hosting.

## Working Rules
- Follow `DEVELOPMENT_PLAN.md` in phase order.
- Mark checklist items complete after each implemented phase.
- Check for secrets before any git operation.
- Keep this file at 80 lines or fewer.
