# Race Planner SaaS - State of the Art
**Lead Architect**: Stefano Bonfanti
**Version**: 6.2.0 - SaaS Enterprise Ready

## Core SaaS Features
- **Hierarchical Admin**: Global control for Stefano (Super Admin), Local control for Team Leaders.
- **Telegram Multi-Team**: Dedicated Telegram Group IDs for each team with granular real-time notifications.
- **Dynamic PWA Branding**: Auto-generated PWA icons, manifest, and favicons based on the user's team.
- **Dynamic Routing**: Dedicated detail pages for each race (`/race/:id`) with unique URLs.
- **MyFITri Integration**: Real-time data from MyFITri API (regulations, start times, course descriptions).
- **Interactive Maps**: Leaflet-based maps for every race in the detail view.
- **Auto-Onboarding**: Secure `join_code` system linked to a database Trigger.
- **Data Stability**: Stable MyFITri ID mapping system to prevent plan corruption during updates.
- **Social Stats Hub**: Automatic ranking and PNG Social Card generator for Instagram (Athlete of the Month).
- **Disaster Recovery**: 3-level protection (GitHub Backups, Soft Delete, Team Export).

## Technical Stack
- **Frontend**: React 19 + TypeScript + Vite + TailwindCSS.
- **Backend**: Supabase (Auth, Postgres DB, Storage).
- **Automation**: GitHub Actions for daily backups and weekly FITRI calendar sync.
- **Observability**: Real-time Telegram triggers for new athletes, race plans, and calendar changes (Multi-Team aware).

## Quick Admin Guide
- **Super Admin Dashboard**: Navigate to `/admin` to manage all teams and promote users.
- **Telegram Setup**: Enter the "Telegram Group ID" in the Team settings to enable instant notifications for the specific team.
- **Promote to Team Admin**: Click the Shield icon in the Athletes list to grant local admin rights.
- **Sync Status**: The system automatically watches the FITRI calendar and alerts on changes.

**Progetto pronto per la distribuzione commerciale su larga scala.** 🚀🏆
