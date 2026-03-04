# Race Planner SaaS - State of the Art
**Lead Architect**: Stefano Bonfanti
**Version**: 4.5 - Enterprise Ready

## Core SaaS Features
- **Hierarchical Admin**: Global control for Stefano, Local control for Team Leaders.
- **Dynamic Branding**: Dual-color support with auto-generated CSS gradients and logo upload.
- **Auto-Onboarding**: Secure `join_code` system linked to a database Trigger.
- **Data Stability**: Stable MyFITri ID mapping system to prevent plan corruption during updates.
- **Disaster Recovery**: 3-level protection (GitHub Backups, Soft Delete, Team Export).
- **Accessibility**: WCAG 2 AA compliant contrast and optimized touch targets.

## Technical Stack
- **Frontend**: React 19 + TypeScript + Vite + Vercel Speed Insights.
- **Backend**: Supabase (Auth, DB, Storage).
- **Automation**: MyFITri API Scraper with stable ID generation.

## Quick Admin Guide
- **Promote to Team Admin**: Set `is_team_admin = true` in `profiles`.
- **Add New Team**: Use the `/admin` dashboard to set colors, logo, and `join_code`.
- **Performance**: Optimistic UI ensures zero-lag for critical actions (add/delete).

**Progetto pronto per la distribuzione commerciale.** 🚀🏆
