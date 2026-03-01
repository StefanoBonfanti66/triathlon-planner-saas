# MTT Season Planner - Project Context & Rules

## 🚀 Overview
Project for managing the 2026 FITRI race calendar with multi-user support via Supabase.
**Author**: Stefano Bonfanti

## 🛠 Tech Stack
- **Frontend**: React 19 + TypeScript + Vite + React Router 7
- **Backend/Auth**: Supabase
- **Data Engine**: Python (Playwright for scraping) + `upload_data.py` for DB sync.
- **Styling**: Tailwind CSS v3 (installed locally).

## 🗄 Supabase Schema (PostgreSQL)

### Table: `public.user_plans`
- `id`: uuid (PK)
- `user_id`: uuid (FK auth.users)
- `race_id`: text (From races_full.json)
- `priority`: text (A, B, C)
- `cost`: numeric
- `note`: text
- **Security**: RLS enabled. Users can only CRUD their own rows. Everyone can see participants names.

### Table: `public.profiles`
- `id`: uuid (PK, FK auth.users)
- `full_name`: text
- **Security**: RLS enabled. Users can only Read/Update their own profile. Admin (`bonfantistefano4@gmail.com`) can read all.

### Table: `public.races`
- `id`: text (PK)
- `date`: text
- `title`: text
- `location`: text
- `region`: text
- `type`: text
- `distance`: text
- **Security**: RLS enabled. Read-only for authenticated users.

## ⚙️ SQL Functions (RPC)

### `get_team_calendar()`
Returns a grouped JSON of races by month, including participants names and race dates. Used in the Team page.

## ⚡ Performance & UX Rules
- **INP Fix**: `participantsMap` is memoized to avoid O(N²) calculations in race lists.
- **CLS Fix**: Dynamic blocks (Analysis, Next Objective) have constant `min-h` to prevent layout shifts. Map animations are disabled for stability.
- **Search**: Optimized with `useDeferredValue` for instant input response.

## 🛡 Security & Maintenance
- **GitHub Secrets**: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `VERCEL_DEPLOY_HOOK`.
- **Branch Protection**: `main` branch is protected. Admin bypass allowed for Stefano Bonfanti.
- **Automation**: GitHub Action runs every Monday at 00:00 to sync races.

## 🔮 Future Roadmap (V4.0) - Race Details
- **API Integration**: Switch from HTML scraping to direct MyFITri API (`cms.myfitri.it/api/eventi`).
- **Enhanced Data**: Extract and store event regulations, start times, and course details.
- **Dynamic Routing**: Implement `/race/:id` pages for deep-dive into single events.
- **Social Interaction**: Allow comments or carpooling coordination in race detail pages.

## 🤖 AI Instructions
- When modifying the database, always provide the SQL script for the user to run in Supabase SQL Editor.
- Ensure `VITE_` prefix is used for environment variables.
- Maintain Stefano Bonfanti's credits in file headers.
