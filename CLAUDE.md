# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run dev          # Start dev server with Turbopack at http://localhost:3000

# Build
npm run build        # Production build with Turbopack

# Lint
npm run lint         # Run ESLint
```

## Environment Variables

Create `.env.local` with:
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

## Architecture Overview

This is a Next.js 15 (App Router) beauty salon booking app called "The Beauty Lounge". The UI uses shadcn/ui components (via Radix UI primitives) with Tailwind CSS v4. The backend is entirely Supabase (PostgreSQL + Auth + Storage + Edge Functions).

### Route Groups

- `src/app/(auth)/` — Login, signup, callback, password reset, complete-profile
- `src/app/(admin)/` — Admin/practitioner pages: appointments-management, inventory-finance, services, users, roles, email-tracking, back-office
- `src/app/(client)/` — Client-facing pages: appointments (booking wizard), profile, portfolio, schedule, blocked-dates

Both `(admin)` and `(client)` route groups share the same `src/app/layout.tsx` root layout — there are no separate layout files per group.

### Authentication & Authorization

- **`src/contexts/AuthContext.tsx`** — Central auth state. Wraps the app, exposes `useAuth()`. Handles email/password auth, Google OAuth, phone/OTP auth (via Supabase Edge Functions: `send-otp`, `verify-otp`, `create-mobile-session`). On sign-in, checks if the `users` table record exists and has `first_name`, `last_name`, `phone` populated; redirects to `/complete-profile` if not.

- **`src/lib/rbac.ts`** — Role-based access control. Three main roles: `super_admin`, `practitioner`, `client`. Helper functions (`isSuperAdmin`, `isPractitioner`, `isClient`, `canViewAllAppointments`, etc.) are used throughout pages and `SidebarNav` to conditionally show/hide routes. Role and permissions are loaded into `AuthContext.userRoleData` from the `users_with_roles` DB view and `role_permissions` table.

### Supabase Client Usage

Two Supabase clients exist — use the right one for context:
- **`src/lib/supabase/client.ts`** — `createClient()` using `@supabase/ssr`'s `createBrowserClient`. Used in most client components.
- **`src/lib/supabase.ts`** — Singleton `supabase` export (also a browser client with manual cookie handling). Used in some older services and `rbac.ts`.
- **`src/lib/supabase/server.ts`** — Server-side client for API routes/server components.

### Key Service Layer (`src/lib/`)

| File | Purpose |
|---|---|
| `rbac.ts` | Role checks and permission-filtered appointment queries |
| `appointment-calendar-service.ts` | Calendar/scheduling logic |
| `appointment-completion-service.ts` | Marks appointments complete, triggers notifications |
| `appointment-sms-service.ts` | SMS notifications via Supabase Edge Functions |
| `booking-progress-service.ts` | Persists multi-step booking wizard progress |
| `invoice-service.ts` | Invoice generation and PDF export (jsPDF) |
| `inventory-service.ts` | Inventory CRUD |
| `schedule-service.ts` | Practitioner working schedule management |
| `notification-service.ts` | In-app notifications |
| `lookup-service.ts` / `lookup-service-cached.ts` | Fetches lookup/enum data from `lookups` table; cached version uses IndexedDB |
| `indexeddb-service.ts` | IndexedDB caching abstraction |
| `email-tracking.ts` | Tracks password reset emails in `email_tracking` table |

### Lookup System

Enum-like values (appointment statuses, service categories, payment methods, etc.) are stored in a `lookups` DB table, not hardcoded. Constants in `src/constants/lookup-codes.ts` define the type codes (e.g. `APPOINTMENT_STATUS`, `SERVICE_CATEGORIES`). Use `lookup-service-cached.ts` for cached reads.

### Multi-Step Booking Wizard (`src/app/(client)/appointments/`)

The booking flow is driven by `src/hooks/use-appointment-booking.ts` which returns all state and handlers. The page renders one of five step components from `src/steps/`:
1. `service-selection-step` → `practitioner-selection-step` (for clients) or `client-selection-step` (for practitioners/admins) → `date-time-step` → `confirmation-step`

Practitioners booking on behalf of clients have a slightly different flow that includes the `client` step and supports "external clients" (not in the system).

### Appointments Management (`src/app/(admin)/appointments-management/`)

Follows a local feature-folder pattern:
- `hooks/` — `use-appointments.ts`, `use-scroll-animations.ts`
- `views/` — `day-view.tsx`, `week-view.tsx`, `month-view.tsx`
- `components/` — modals, view controls, appointment cards
- `utils/` — formatting helpers
- `types/` — local prop types

### Inventory & Finance (`src/app/(admin)/inventory-finance/`)

Same feature-folder pattern with `hooks/`, `views/`, `modals/`, `utils/`.

### Global Layout

`src/app/layout.tsx` wraps everything in `ThemeProvider → AuthProvider → ToastProvider → AppLayout`. `AppLayout` (`src/components/AppLayout.tsx`) conditionally renders the `SidebarNav` (hidden on `/login` and `/signup` pages and when unauthenticated).

### Types

`src/types/` contains many granular `.d.ts` / `.ts` files per domain concept. The barrel export is `src/types/index.ts`.

### Database Conventions

- Soft deletes: `is_active` and `is_deleted` columns — always filter with `.eq('is_active', true).eq('is_deleted', false)` in queries.
- The `users_with_roles` DB view joins `users` + `roles` for convenient role lookups.
- `app_settings` table (single row, id=1) holds global SMS/notification settings managed via Back Office page.
