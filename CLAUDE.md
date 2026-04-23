# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**StageMap** is a French-language artist/venue booking and tour-planning platform. It is a React 18 SPA backed by Supabase (PostgreSQL, Auth, Realtime, Edge Functions), with Anthropic Claude for AI tour planning, Stripe for payments, and Mapbox for maps.

## Commands

```bash
npm start        # Dev server on port 3000
npm run build    # Production build → /build
npm test         # Run tests (react-scripts)
```

Supabase Edge Functions (Stripe):
```bash
supabase functions deploy create-checkout-session
supabase functions deploy stripe-webhook
```

## Environment Variables

All prefixed with `REACT_APP_`. Required: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `ANTHROPIC_KEY`, `STRIPE_PUBLIC_KEY`, `STRIPE_PRICE_MONTHLY`, `STRIPE_PRICE_ANNUAL`, `STRIPE_PRICE_LOCAL`, `STRIPE_PRICE_BOOST`, `STRIPE_PRICE_PRO`. Optional: `MAPBOX_TOKEN` (fallback SVG grid map renders if absent).

## Architecture

### Entry points
- `src/App.jsx` — root router, auth subscription via `onAuthChange()`, `RequireAuth` wrapper
- `src/lib/supabase.js` — single file with 100+ exported DB helper functions; all Supabase calls go here
- `src/lib/store.js` — Zustand store with `persist` middleware (localStorage); single `useStore()` hook used everywhere
- `src/lib/ai.js` — Anthropic API wrapper called **directly from the browser** (no proxy)
- `src/lib/stripe.js` — Stripe checkout helpers

### Pages
- `src/pages/AuthPage.jsx` — login / signup / password reset (3 modes in one component)
- `src/pages/OnboardPage.jsx` — 3-step profile creation flow
- `src/pages/Dashboard.jsx` — main app (~1000 lines); all 7+ tabs rendered here as inline sub-components

### Key patterns

**Multi-profile system:** One user can have multiple profiles (artist, venue, fan). Active profile is stored in Zustand and drives all permissions, visibility, and scoping for invitations, calendar, and campaigns.

**Styling:** Pure inline CSS objects throughout — no CSS files. Design tokens are constants in a `C` object (dark theme, burnt orange `#d95f00`, cream `#fef3d0`). All layout/color changes happen via those inline styles.

**Component style:** Pages are single large files (~1000 lines). Mini UI components (`Btn`, `Inp`, `Pill`, `Spinner`, modals) are defined as functions inside the same file they're used. Do not extract them to separate files unless refactoring is explicitly requested.

**Messaging — two independent systems:**
- Formal inbox (`messages` table) — threaded, subject-based
- Real-time chat (`chats` table) — Supabase Realtime subscriptions, `room_id` pattern

**Tour invitations flow:** Organizer creates invitation → invitee signs → calendar entries created automatically on both sides → invitation status updated. Legal contract stored in DB with dual signatures.

**AI tour planner:** `buildTourPlannerSystem()` in `ai.js` injects all profiles as context. Claude returns JSON. Response has two modes: `search` (returns profile IDs) or `tour` (structured plan with stops/dates). Tour plans can bulk-launch invitations. Claude is called at model ID `claude-sonnet-4-20250514`.

**Payments:** Subscriptions (monthly/annual) and one-time ad campaigns (Local, Boost, Pro). Stripe checkout session created via Supabase Edge Function; webhook updates DB on payment success.

**Database:** 8 tables — `profiles`, `messages`, `chats`, `events`, `invitations`, `campaigns`, `calendar_entries`. Row Level Security enforced; users only see their own data. Full-text search uses Supabase `.or()` with `ilike` across name/genre/region/bio columns.

### ESLint
Extends `react-app`. `no-unused-vars` and `react-hooks/exhaustive-deps` are intentionally disabled.

## Known Constraints

- The Anthropic API key is exposed client-side (`REACT_APP_ANTHROPIC_KEY`). This is a known limitation of the current architecture — do not "fix" it by moving it server-side without explicit instruction, as it would require a new Edge Function.
- The entire app is French-only; there is no i18n layer.
- No TypeScript — JSX only.
- No automated tests exist; `npm test` runs but the test suite is effectively empty.
