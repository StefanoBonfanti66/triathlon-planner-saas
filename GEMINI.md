# Race Planner SaaS - State of the Art
**Lead Architect**: Stefano Bonfanti
**Version**: 4.0 - Production Ready

## Core SaaS Features
- **Hierarchical Admin**: Global control for Stefano, Local control for Team Leaders.
- **Dynamic Branding**: Dual-color support (`primary` & `secondary`) with auto-generated CSS gradients.
- **Auto-Onboarding**: Secure `join_code` system linked to a database Trigger (`handle_new_user`).
- **High Performance**: Optimistic UI updates for zero-lag interactions and real-time search filtering.
- **Integrated Storage**: Direct file upload for team logos via Supabase Storage.

## Technical Stack
- **Frontend**: React 19 + TypeScript + Vite.
- **Backend**: Supabase (Auth, DB, Storage).
- **Security**: Advanced RLS (Row Level Security) for team data isolation.
- **Deployment**: Vercel (Auto-build on git push).

## Quick Admin Guide
- **Promote to Team Admin**: Set `is_team_admin = true` in `profiles` table.
- **Add New Team**: Use the Command Center (`/admin`) to set colors, logo, and `join_code`.
- **Delete Policy**: Admin can safely delete athletes (and their plans) or empty teams directly from UI.

**Progetto pronto per la divulgazione commerciale.** 🚀
