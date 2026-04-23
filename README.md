# The Beauty Lounge — Booking App

A full-stack booking and business management application for a beauty salon, built with Next.js 15, TypeScript, Tailwind CSS v4, shadcn/ui, and Supabase.

## Features

- **Multi-step booking wizard** — clients book services, choose a practitioner, and select a date/time slot
- **Role-based access control** — three roles: `super_admin`, `practitioner`, and `client`, with per-permission granularity
- **Appointment management** — day, week, and month calendar views
- **Services & optional extras** — manage service catalogue including optional add-ons
- **Inventory & finance** — inventory tracking, invoice generation (PDF via jsPDF), and financial transaction reports
- **Portfolio gallery** — practitioners can manage a portfolio of work images
- **SMS & email notifications** — appointment reminders via Supabase Edge Functions
- **Google Calendar integration** — sync appointments to Google Calendar
- **In-app notifications** — real-time notification centre
- **Analytics dashboard** — business analytics and reporting
- **Authentication** — email/password, Google OAuth, and phone/OTP login
- **Dark/light mode** — full theme support

## Tech Stack

| Layer         | Technology                                           |
| ------------- | ---------------------------------------------------- |
| Framework     | Next.js 15 (App Router, Turbopack)                   |
| Language      | TypeScript 5                                         |
| Styling       | Tailwind CSS v4 + shadcn/ui (Radix UI)               |
| Backend       | Supabase (PostgreSQL, Auth, Storage, Edge Functions) |
| PDF           | jsPDF                                                |
| Charts        | Recharts                                             |
| Date handling | date-fns, react-day-picker                           |
| Icons         | Lucide React                                         |
| Deployment    | Vercel                                               |

## Getting Started

### Prerequisites

- Node.js 18+
- A Supabase project

### 1. Install dependencies

```bash
npm install
```

### 2. Environment variables

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Scripts

```bash
npm run dev      # Start dev server with Turbopack
npm run build    # Production build
npm run lint     # Run ESLint
```

## Project Structure

```
staceys-booking-app/
├── src/
│   ├── app/
│   │   ├── (auth)/              # Login, signup, OAuth callback, password reset, complete-profile
│   │   ├── (admin)/             # Admin/practitioner pages
│   │   │   ├── analytics/
│   │   │   ├── appointments-management/
│   │   │   ├── back-office/
│   │   │   ├── inventory-finance/
│   │   │   ├── roles/
│   │   │   ├── services/
│   │   │   ├── sms-tracking/
│   │   │   └── users/
│   │   └── (client)/            # Client-facing pages
│   │       ├── appointments/    # Multi-step booking wizard
│   │       ├── blocked-dates/
│   │       ├── portfolio/
│   │       ├── profile/
│   │       └── schedule/
│   ├── components/              # Shared UI components + shadcn/ui primitives
│   ├── contexts/                # AuthContext, ToastContext
│   ├── constants/               # Lookup codes (enums)
│   ├── hooks/                   # Custom React hooks
│   ├── lib/                     # Service layer and Supabase clients
│   ├── steps/                   # Booking wizard step components
│   └── types/                   # TypeScript type definitions
├── supabase/
│   └── functions/               # Edge Functions (SMS, OTP, email, PDF, Google Calendar)
├── database/                    # SQL schema files
└── scripts/                     # SQL migration scripts
```

## Architecture Notes

### Route Groups

Both `(admin)` and `(client)` route groups share the root `src/app/layout.tsx` — there are no separate layout files per group.

### Authentication

`src/contexts/AuthContext.tsx` handles all auth state. On sign-in it checks whether the `users` table record is complete; if not, it redirects to `/complete-profile`. Phone/OTP auth is handled through Supabase Edge Functions (`send-otp`, `verify-otp`, `create-mobile-session`).

### Role-Based Access Control

`src/lib/rbac.ts` defines three roles — `super_admin`, `practitioner`, `client` — with helpers used throughout pages and `SidebarNav` to conditionally show/hide routes. Roles and permissions are loaded from the `users_with_roles` DB view and `role_permissions` table.

### Supabase Clients

- `src/lib/supabase/client.ts` — browser client (used in most client components)
- `src/lib/supabase/server.ts` — server-side client (API routes / server components)
- `src/lib/supabase.ts` — legacy singleton browser client (used in some older services)

### Lookup System

Enum-like values (appointment statuses, service categories, payment methods, etc.) are stored in a `lookups` DB table. Constants live in `src/constants/lookup-codes.ts`. Use `src/lib/lookup-service-cached.ts` for cached reads backed by IndexedDB.

### Booking Wizard

The multi-step booking flow is driven by `src/hooks/use-appointment-booking.ts`. Steps are rendered from `src/steps/`:

1. Service selection
2. Practitioner selection (clients) or Client selection (practitioners/admins)
3. Date & time selection
4. Confirmation

### Database Conventions

- Soft deletes via `is_active` and `is_deleted` columns — always filter with `.eq('is_active', true).eq('is_deleted', false)`
- Global settings (SMS toggles, etc.) stored in `app_settings` table (single row, `id=1`), managed via the Back Office page

## Edge Functions

| Function                             | Purpose                         |
| ------------------------------------ | ------------------------------- |
| `send-otp`                           | Send OTP for phone login        |
| `verify-otp`                         | Verify OTP code                 |
| `create-mobile-session`              | Create session after OTP        |
| `send-appointment-sms`               | Send appointment SMS reminders  |
| `process-scheduled-sms`              | Process queued SMS messages     |
| `send-email`                         | Send transactional emails       |
| `admin-update-user`                  | Admin-level user updates        |
| `mark-completed-appointments`        | Auto-complete past appointments |
| `create-google-calendar-event`       | Add event to Google Calendar    |
| `update-google-calendar-event`       | Update Google Calendar event    |
| `delete-google-calendar-event`       | Remove Google Calendar event    |
| `generate-invoice-pdf`               | Generate invoice PDF            |
| `generate-financial-transaction-pdf` | Generate financial report PDF   |
