# Stacey's Booking App

A modern booking application built with Next.js 15, TypeScript, Tailwind CSS, and Supabase.

## Features

- 🔐 **Secure Authentication** - Built-in authentication with Supabase Auth
- 📊 **Real-time Database** - PostgreSQL database with real-time subscriptions
- 🚀 **Modern Stack** - Next.js 15, TypeScript, and Tailwind CSS
- 📱 **Responsive Design** - Mobile-first responsive design
- ⚡ **Fast Development** - Hot reload and instant feedback

## Getting Started

### Prerequisites

- Node.js 18+ installed on your machine
- A Supabase account and project

### 1. Clone and Install

```bash
cd staceys-booking-app
npm install
```

### 2. Set up Supabase

1. Go to [supabase.com](https://supabase.com)
2. Create a new account or sign in
3. Create a new project
4. Go to Settings > API in your Supabase dashboard
5. Copy your project URL and anon key

### 3. Environment Variables

Create a `.env.local` file in the root directory and add your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Project Structure

```
staceys-booking-app/
├── src/
│   ├── app/
│   │   ├── layout.tsx       # Root layout with AuthProvider
│   │   ├── page.tsx         # Homepage with auth
│   │   └── globals.css      # Global styles
│   ├── contexts/
│   │   └── AuthContext.tsx  # Authentication context
│   └── lib/
│       └── supabase.ts      # Supabase client configuration
├── .env.local               # Environment variables
└── package.json
```

## Authentication

The app includes a complete authentication system:

- Sign up with email/password
- Sign in with email/password
- Sign out functionality
- Protected routes (coming soon)
- User session management

## Next Steps

1. **Database Schema**: Create tables for your booking system in Supabase
2. **Row Level Security**: Set up RLS policies for data security
3. **Booking Components**: Build booking forms and calendar views
4. **API Routes**: Create server-side API endpoints
5. **Email Templates**: Customize authentication emails

## Supabase Setup Tips

### Enable Email Auth

1. Go to Authentication > Settings in your Supabase dashboard
2. Configure your email templates
3. Set up email confirmation if needed

### Database Tables (Example)

You might want to create tables like:

```sql
-- Bookings table
create table bookings (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  title text not null,
  description text,
  start_time timestamp with time zone not null,
  end_time timestamp with time zone not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table bookings enable row level security;

-- Policy: Users can only see their own bookings
create policy "Users can view own bookings" on bookings for select using (auth.uid() = user_id);
create policy "Users can insert own bookings" on bookings for insert with check (auth.uid() = user_id);
```

## Deployment

The easiest way to deploy your Next.js app is to use [Vercel](https://vercel.com/new):

1. Push your code to GitHub
2. Import your GitHub repository on Vercel
3. Add your environment variables in Vercel dashboard
4. Deploy!

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

## Support

If you need help, feel free to:
- Check the [Next.js GitHub discussions](https://github.com/vercel/next.js/discussions)
- Visit the [Supabase Discord](https://discord.supabase.com/)
- Read the documentation links above
