# Race Planner SaaS - State of the Art
**Lead Architect**: Stefano Bonfanti
**Version**: 6.3.3 - Pro Federal Standards

## Core SaaS Features
- **Hierarchical Admin**: Global control for Stefano (Super Admin), Local control for Team Leaders.
- **Admin Password Bypass**: New manual password management for athlete onboarding (no SMTP dependency).
- **Dual License Support**: Split fields for "Tessera FITRI" and "Tessera FCI" with dedicated visual labels.
- **Professional Registry**: Automated "SURNAME Name" formatting and alphabetical sorting by surname across the app.
- **Data Integrity 2.0**: Unique email constraints and automated profile-to-auth syncing.
- **Membership & Licensing**: Dedicated flags for "Tesserato FITRI" and "Socio Associazione" with split-view management.
- **Telegram Multi-Team**: Dedicated Telegram Group IDs for each team with granular real-time notifications.
- **Dynamic PWA Branding**: Auto-generated PWA icons, manifest, and favicons based on the user's team.
- **Dynamic Routing**: Dedicated detail pages for each race (`/race/:id`) with unique URLs.
- **MyFITri Integration**: Real-time data from MyFITri API (regulations, start times, course descriptions).
- **Interactive Maps**: Leaflet-based maps for every race in the detail view.
- **Auto-Onboarding**: Secure `join_code` system linked to a database Trigger.
- **Disaster Recovery**: 3-level protection (GitHub Backups, Soft Delete, Team Export).
- **Advanced Export**: One-click Excel export for full athlete registry (licensing, membership, medical expiry).

## Technical Stack
- **Frontend**: React 19 + TypeScript + Vite + TailwindCSS.
- **Backend**: Supabase (Auth, Postgres DB, Storage).
- **Security**: Advanced RLS Policies + Database Unique Constraints.
- **Automation**: GitHub Actions for daily backups and weekly FITRI calendar sync.
- **Observability**: Real-time Telegram triggers for new athletes, race plans, and calendar changes (Multi-Team aware).


## Quick Admin Guide
- **Super Admin Dashboard**: Navigate to `/admin` to manage all teams and promote users.
- **License Management**: Enter FITRI and FCI licenses in separate fields for each athlete.
- **Telegram Setup**: Enter the "Telegram Group ID" in the Team settings to enable instant notifications for the specific team.
- **Promote to Team Admin**: Click the Shield icon in the Athletes list to grant local admin rights.
- **Sync Status**: The system automatically watches the FITRI calendar and alerts on changes.

**Progetto pronto per la distribuzione commerciale su larga scala.** 🚀🏆
